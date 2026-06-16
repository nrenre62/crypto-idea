# Security Audit

> Generated 2026-06-16. Audited against the `secure-by-design` framework across five areas:
> (1) unprotected routes, (2) unvalidated input, (3) env vars exposed to client, (4) SQL injection,
> (5) missing rate limiting. Severities are adjusted for *who can actually trigger* each finding.
> This was a read-only audit — no code was changed.

## Verdict
**No anonymously-exploitable critical vulnerability exists in the running code.** Access control is
solid, secrets are clean, and there is no SQL/NoSQL injection. The real work is **launch-hardening**
— bot/abuse protection and a few input-bound tightenings, most already on the go-live checklist.

---

## 🔴 CRITICAL — fix before public launch

### C1. No App Check / CAPTCHA on public, cost-incurring & write endpoints (area 5)
`functions/index.js:621–629, 717–903` — the only abuse control on `/api/*` is an **in-memory per-IP
limiter** (60/60s). It resets per function instance, doesn't share state across instances, and keys
on `x-forwarded-for[0]` (client-influenceable). The public endpoints include a **write**
(`/api/subscribe`) and **expensive** reads (`/api/prices`, `/api/search` over ~3,000 coins). Once
live with a CoinGecko key + an email provider, this is a scraping / email-spam / cost vector
reachable by anyone.

**Status — PARTIALLY FIXED (commit f1e3fd7):** the public write endpoint `/api/subscribe` now has
its own dedicated, far stricter per-IP budget (`SUBSCRIBE_LIMIT = 5`/min via a separate `_rlSub`
store), instead of sharing the loose 60/min read budget. Verified against the emulator (6th+ rapid
subscribe → `429`; reads still `200`). This blunts single-IP spam.

**Still remaining (deploy-time, cannot be done in code alone):**
- Enable Firebase **App Check** enforcement (already `VITE_RECAPTCHA_SITE_KEY`-wired in
  `firebase.config.js`) — needs a reCAPTCHA v3 key + console enforcement.
- Add a reCAPTCHA/Turnstile token check on the **static landing** subscribe form (the landing has no
  Firebase SDK, so this is a client integration that needs the site key to build/test).
- (Optional, keyless) a **durable** rate limit (Firestore-backed) to survive instance restarts and
  defeat multi-IP bursts — heavier, defer unless abuse is observed.
- **Note:** not currently exploitable for email spam — `subscribe` returns `503` until a provider+key
  are configured (`index.js:860`). It goes live the moment email is configured at launch, which is
  exactly when App Check must already be on.

---

## 🟠 MEDIUM — defense-in-depth, fix soon

### M1. SSRF via admin-configured `apiUrl` (areas 2 & 4 — the real injection-family risk)
`functions/index.js:873–888` — the ActiveCampaign base URL comes from `config/app.email.apiUrl` and
is used unvalidated: `fetch(base + "/api/3/contact/sync")`. No scheme/host allowlist. **Impact is
high** (a request to `http://169.254.169.254/…` could reach the GCP metadata server → service-account
token → project compromise), but the **precondition is an admin write** (claim-gated, `MIN_ADMINS=2`).
So it's an admin→infrastructure escalation gadget, not anonymous. Cheap to close.
- **Fix:** require `https:` + allowlist the host (e.g. `*.activecampaign.com`) before fetching.

### M2. Firestore write validation is missing bounds (area 2)
`firestore.rules:170–184` — `validCoinData()` checks `symbol`/`name` are strings **but no length cap**
(a user can store a 1 MB name on their own doc); `validTransactionData()` accepts `amount`/`priceAtBuy`
with **no upper bound** (`1e308` allowed) and `date` as **any string** (no format/range). Portfolio
names *are* bounded (`≤50`, `validPortfolioData()`), so the pattern exists — just extend it.
- **Fix:** add `.size()` caps on `symbol`/`name`, sane numeric ceilings, and a date-format/range
  check. Covered by `npm run test:rules`.

### M3. `saveConfig` payload not allowlisted (area 2)
`functions/index.js:534–580` — an admin (or anything bypassing the UI with an admin token) can write
arbitrary/unknown fields and arbitrary plan tiers into the locked `config/app` doc; `mergePlans()`
coerces numbers but doesn't whitelist keys or validate the 3-tier shape. Admin-gated, so limited
blast radius, but config integrity isn't enforced.
- **Fix:** validate/whitelist the payload shape server-side before writing.

### M4. CORS `*` on the public API (area 1)
`functions/index.js:718` — `Access-Control-Allow-Origin: *` is fine for the read-only proxy, but it
also lets any origin invoke `subscribe` from a victim's browser. App Check (C1) is the proper
mitigation; noted for completeness.

---

## 🟢 LOW — cleanup / nice-to-have

- **L1.** `/api/search?q=` has **no length cap** (`functions/index.js:780`) → unbounded `.includes`
  over 3,000 coins per request. Cap `q` at ~100 chars. (area 2)
- **L2.** `lookupUser` passes `email` to the Auth SDK without a format pre-check
  (`functions/index.js:331`) — SDK rejects bad input, so low risk. (area 2)
- **L3.** **Unused `VITE_STRIPE_*` placeholders** in `.env.example:18–20` — dead config, remove to
  avoid confusion (the app uses PayPal, not Stripe). (area 3)
- **L4.** Stale import example in `README.md:85` references a non-existent path — doc rot only.

---

## ✅ Verified solid (the five areas — the good news)

| Area | Result |
|---|---|
| **1. Unprotected routes** | Every admin callable verifies the `{admin:true}` claim; every user callable checks `context.auth`; GDPR `deleteMyAccount`/`exportMyData` act **only on `context.auth.uid`** (no IDOR); `paypalWebhook` is **signature-verified**; public `/api` reads are intentional & cache-backed. No missing auth. |
| **2. Input validation** | Email (regex+≤200), `/api/history` id (sliced + sanitized to `[A-Za-z0-9_-]`), `prices` ids (≤500), `listAudit` limit (clamped) all validated. Gaps are the bound-tightenings in M2/M3/L1. |
| **3. Env vars exposed** | **Clean.** Only public-by-design config ships (Firebase web keys, reCAPTCHA *site* key). Real secrets (CoinGecko/PayPal/email) live in `functions.config()` + the locked `config/app` doc; `getAdminConfig` returns **set-flags, not values**; `/config` is `allow read,write: if false`; `.env` is gitignored; no secret in the bundle. |
| **4. SQL injection** | **N/A** — no SQL DB. Firestore uses parameterized doc refs (no string-built queries); NoSQL injection safe. XSS safe (landing uses `textContent` for API data; React auto-escapes; no `dangerouslySetInnerHTML`). The injection-family risk that *does* exist is SSRF (M1). |
| **5. Rate limiting** | A per-IP limiter exists but is weak (C1); caching keeps upstream **cost flat** but isn't an abuse control. App Check is the missing piece. |

---

## Recommended fix order
1. **C1 — App Check + CAPTCHA** before launch (biggest real-world risk; already planned, mostly console config).
2. **M1 — apiUrl allowlist** (cheap, closes an infra-escalation gadget).
3. **M2 — Firestore field bounds** (a few lines + a rules test).
4. **M3 / M4 / L1–L3** — batch into a hardening pass.

### Suggested follow-up tasks (not yet done)
- [x] Dedicated strict per-IP rate limit on `/api/subscribe` write (C1, code-side — commit f1e3fd7).
- [ ] Enable App Check enforcement + add reCAPTCHA token check on the landing `/api/subscribe` form (C1, deploy-time).
- [ ] Allowlist `config/app.email.apiUrl` host + require HTTPS before fetch (M1).
- [ ] Add length/range/date bounds to `validCoinData`/`validTransactionData` in `firestore.rules` + extend `test:rules` (M2).
- [ ] Whitelist the `saveConfig` payload shape server-side (M3).
- [ ] Cap `/api/search?q=` length; pre-validate `lookupUser` email; remove unused Stripe vars; fix README snippet (L1–L4).
