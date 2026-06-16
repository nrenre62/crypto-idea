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
- **FIXED (commit 70b618b):** added `safeProviderOrigin()` — requires `https:` and rejects IP
  literals (incl. `169.254.169.254`), `localhost`, and `.internal`/`.local`/`metadata` hosts.
  Subscribe now fetches the validated origin or returns `503`. Residual: DNS-rebinding to an internal
  IP via a public hostname is out of scope (would need resolve-time IP checks).

### M2. Firestore write validation is missing bounds (area 2)
`firestore.rules:170–184` — `validCoinData()` checks `symbol`/`name` are strings **but no length cap**
(a user can store a 1 MB name on their own doc); `validTransactionData()` accepts `amount`/`priceAtBuy`
with **no upper bound** (`1e308` allowed) and `date` as **any string** (no format/range). Portfolio
names *are* bounded (`≤50`, `validPortfolioData()`), so the pattern exists — just extend it.
- **FIXED (commit ad08db6):** `validCoinData` now caps `symbol≤20`, `name≤64`, `thumb≤512`;
  `validTransactionData` bounds `amount∈(0, 1e15]`, `priceAtBuy∈[0, 1e9]`, `date` non-empty ≤40.
  2 new `test:rules` cases (oversized name + absurd amount rejected) — 10/10 pass.

### M3. `saveConfig` payload not allowlisted (area 2)
`functions/index.js:534–580` — an admin (or anything bypassing the UI with an admin token) can write
arbitrary/unknown fields and arbitrary plan tiers into the locked `config/app` doc; `mergePlans()`
coerces numbers but doesn't whitelist keys or validate the 3-tier shape. Admin-gated, so limited
blast radius, but config integrity isn't enforced.
- **FIXED (commit 70b618b):** the payload was already field-allowlisted (the saved doc is built from
  explicitly-named fields; unknown keys are dropped). Added value ceilings in `mergePlans` so plan
  numbers can't be set absurdly high. (Provider-string validation skipped as low-value/anti-KISS —
  unknown providers already no-op at the `501` branch.)

### M4. CORS `*` on the public API (area 1)
`functions/index.js:718` — `Access-Control-Allow-Origin: *` is fine for the read-only proxy, but it
also lets any origin invoke `subscribe` from a victim's browser. App Check (C1) is the proper
mitigation; noted for completeness.

---

## 🟢 LOW — cleanup / nice-to-have

- **L1.** ✅ **FIXED (70b618b)** — `/api/search?q=` now capped at 100 chars (DoS guard on the scan). (area 2)
- **L2.** ✅ **FIXED (70b618b)** — `lookupUser` now validates the email (regex + length) before the Auth SDK call. (area 2)
- **L3.** ✅ **FIXED (e4bac05)** — removed unused `VITE_STRIPE_*` placeholders from `.env.example`. (area 3)
- **L4.** ✅ **FIXED (e4bac05)** — corrected the stale `README.md` import example (paths + dead `getUserProfile`).

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

## Status — all code-fixable items DONE

Every finding that can be fixed and verified in code has been fixed, tested, and committed.
What remains is **deploy-time only** (external keys + Firebase console) and **by-design**:

| # | Status | Commit |
|---|---|---|
| C1 (write rate limit) | ✅ code-side fixed | f1e3fd7 |
| C1 (App Check / reCAPTCHA) | ⏳ deploy-time (needs reCAPTCHA key + console + static-landing client integration) | — |
| M1 (SSRF guard) | ✅ fixed | 70b618b |
| M2 (Firestore field bounds) | ✅ fixed + tests | ad08db6 |
| M3 (saveConfig hardening) | ✅ fixed | 70b618b |
| M4 (CORS `*`) | ⚪ by design (public proxy; App Check is the mitigation) | — |
| L1 (search length cap) | ✅ fixed | 70b618b |
| L2 (lookupUser email validation) | ✅ fixed | 70b618b |
| L3 (dead Stripe vars) | ✅ fixed | e4bac05 |
| L4 (stale README snippet) | ✅ fixed | e4bac05 |

Regression check after all fixes: `npm run build` clean · `test:unit` 65/65 · `test:rules` 10/10.

### Remaining (deploy-time, only you can do)
- [ ] Create a reCAPTCHA v3 key → set `VITE_RECAPTCHA_SITE_KEY` → enable App Check enforcement in the Firebase console.
- [ ] Add the reCAPTCHA token to the **static landing** subscribe form + verify it server-side (the landing has no Firebase SDK).
- [ ] (Optional, if abuse is observed) a durable Firestore-backed rate limit to survive instance restarts / multi-IP bursts.
