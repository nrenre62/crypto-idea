# Backend & Admin — workflow map, gaps & go-live decisions

> **Canonical record of the 2026-06-27 backend/admin deep-dive + founder interview.**
> Built from a full codebase audit (14-agent read of `functions/index.js`, the `/api` proxy,
> the admin app, the Settings ↔ `config/app` wiring, the data layer, `firestore.rules`, and the
> secrets inventory). This doc explains **how everything connects**, lists **every gap found**, and
> records **the 18 locked decisions**. The sequenced build order lands in [`NEXT-STEPS.md`](NEXT-STEPS.md) §BL.
> Where this doc and a stale planning note disagree, **this doc wins** (like PRODUCT-DECISIONS.md does for product).

---

## 1. How it all connects (the workflow)

### 1.1 Request lifecycle: app/landing → `/api` → CoinGecko cache
Every HTTP call from **both** the React app and the static landing hits **one** Cloud Function:
`exports.api` (onRequest, `functions/index.js:870`). `firebase.json` rewrites `/api/**` → it (same-origin),
and it dispatches on the **last path segment**: `/api/prices · /api/search · /api/coinlist · /api/history ·
/api/config · /api/subscribe` (unknown → 404). All routes are **public/unauthenticated**; the only abuse
control is a **per-IP in-memory** sliding window (`rateLimited()`, `:765` — 60/min reads, 5/min subscribe)
+ a honeypot on subscribe. CORS is wildcard (`*`).

Cost stays **flat regardless of user count** via a single shared Firestore doc **`cache/universe`** (~3,000
coins) that backs the whole app *and* the landing DCA calculator. `/api/prices` serves from it (refetching
only stale >5min or long-tail coins); `/api/search` is a pure in-memory scan (no upstream call); per-coin
history lives in `historyCache/{id}` (30-day TTL). **CDN headers** (coinlist 24h, history 24h, config 60s,
prices 120s) make thousands of visitors ≈0 function calls — **but only on deployed Hosting**; locally the
function runs every request, so the flat-cost effect is invisible/unverifiable in dev.

**Frontend callers:** `src/api/coingecko.js` (returns `null` on error, never throws) → `useLivePrices`
(60s poll), `useCoinSearch` (300ms debounce), `useCoinHistory`. The Research tab derives 7d/30d + sparkline
from history **client-side** (never calls CoinGecko from the browser). Landing `#dca` loads `/api/coinlist`
once + `/api/history` per coin (12s timeout + offline fallback).

**Background freshness (3 pubsub schedulers):** `refreshPrices` (5min, top ~1,250, ≈44k CoinGecko calls/mo
→ needs a paid plan), `refreshUniverseDaily` (24h, full refresh + prune), `purgeExpiredTrash` (24h).
⚠️ Cloud Scheduler never fires in the emulator — locally the universe can drift and trash never erases.

### 1.2 Auth & data layer
Components never touch the Firebase SDK directly — it's all behind `src/api/`. `firebase.config.js` uses the
real `VITE_FIREBASE_*` config only when `!isDev && apiKey present`, else a throwaway demo config on the
emulators (Auth 9099 / Firestore 8080 / Functions 5001). `registerUser()` does a **deliberate two-step**
write (user doc, then a batch creating `portfolios/default` + `increment` counter) because the counter rule
needs the parent doc to pre-exist. Sensitive ops re-authenticate first. **App Check is initialized
client-side only when the reCAPTCHA key is set — and the server never verifies the token** (gap #1).

**Self-service GDPR callables** (`src/api/account.js`, each acting only on `context.auth.uid` — no IDOR):
`deleteMyAccount` (30-day *soft* delete; Auth stays enabled so the user can sign back in to restore),
`restoreMyAccount`, `signOutEverywhere`, `exportMyData`.

### 1.3 Admin app & the claim boundary
`/admin` is a **separate Vite app** (`admin.html` → `admin-main.jsx`, never in the user bundle). The URL is
**not** the boundary — the **`{admin:true}` custom claim** is: `admin-main.jsx` force-refreshes the token and
only proceeds if `claims.admin===true`. The dashboard is presentation-only; all logic is in
`useAdminDashboard.js` → 11 thin wrappers in `src/api/admin.js`. **Five tabs:** Overview (`getStats`), Users
(`listUsers`/`lookupUser`/`setUserTier`/`setPremiumLimits`/`suspendUser`/`deleteUser`), Trash
(`restoreUser`/purge), Settings (`getAdminConfig`/`saveConfig`), Audit (`listAudit`). Every callable
re-verifies the claim server-side (`isAdminToken`). Safety nets: **`MIN_ADMINS=2`** blocks dropping below 2
admins; suspend/delete block self-target; `writeAudit()` logs admin actions to a server-only `audit` collection.

### 1.4 Settings → `config/app` → its consumers
The locked **`config/app`** doc is written **only** by `saveConfig` (admin-gated). Rules deny **all** client
read/write to `/config`. Reads split 3 ways: **(a)** admin pre-fill via `getAdminConfig` (secrets returned as
boolean **set-flags only** — raw secrets never leave the server); **(b)** server consumers via `getConfig()`
(5-min cache, invalidated on save); **(c)** the **public `/api/config`** (non-secrets only, CDN 60s). The
**`keep()` idiom**: re-saving a blank secret field preserves the stored value.

| Field | Set where | Read by | Secret | Status |
|---|---|---|---|---|
| `coingecko` (key) | Settings | `cgHeaders` → CoinGecko | 🔒 | go-live key (CoinGecko Lite) |
| `paypal.clientId/secret/webhookId` | Settings | `getPayPalToken`, `verifyPayPalWebhook` | 🔒 | go-live |
| `paypal` **plan IDs** + `APP_URL` | **`functions/.env` only** | `createSubscription` | env | ⚠️ not in admin UI |
| `email.apiKey/provider/apiUrl/listId` | Settings | `/api/subscribe` | 🔒 apiKey | go-live (GetResponse) |
| `email.fromEmail` | Settings | *(none today)* | — | reserved → real once transactional email ships |
| `plans.{tier}.{price,priceYear,portfolios,coins,transactions}` | Settings | `firestore.rules get()` + `getStats` + `/api/config` | public | live |
| `plans.{tier}.aiMonthlyCents` | Settings | `/api/config` → Account display | public | shown "coming soon" until metered |
| `flags.maintenance` | Settings toggle | `/api/config` → maintenance screen | public | live (60s + reload) |
| `flags.signupsEnabled` | Settings toggle | `/api/config` → hide Register tab | public | ⚠️ client-only → server-enforce |
| `analytics.{ga4,plausible}` | Settings | `/api/config` → `site-meta.js` | public | Plausible at launch |
| `legal.{termlyUuid,privacyId,termsId,cookieBanner}` | Settings | `/api/config` → site-meta + privacy/terms.html | public | go-live IDs needed |
| AI provider key (Anthropic) | **NEW** AI Settings | `researchAsk` proxy (Wave B) | 🔒 | to build (B1) |

### 1.5 Keys & secrets — where each lives
The only values in `dist/` are the **public** `VITE_FIREBASE_*` config and the **public** reCAPTCHA site key.
Every real secret resolves **`config/app` first, then `process.env`**. The first admin is bootstrapped
out-of-band via `functions/scripts/set-admin.js` + a **service-account JSON (must stay out of git)**.
⚠️ Stale doc: NEXT-STEPS §4 / root `.env.example` still recommend `firebase functions:config:set`, **removed
in functions v7** — a silent no-op at go-live.

### 1.6 Planned AI proxy (Wave B) — currently inert
`ai-client.js` `askClaude()` **unconditionally throws**, so Pulse/Ask render offline summaries and conviction
pills are mock-fed. **No AI key, no `researchAsk` function, and `functions/validate-output.js` (the fail-closed
no-names/no-advice guard) is imported nowhere.** The validator must be wired *inside* the proxy and green
**before** the client body-swap, or raw model prose reaches users.

---

## 2. Gap inventory (27 found, prioritized)

**🔴 High** — (1) App Check never verified server-side; (2) live AI unbuilt + validator unwired;
(3) no grant/revoke-admin UI (`setAdminClaim` unreachable); (4) `lookupUser` drops `tierBeforeFailure` +
`premiumLimits` (breaks two UI elements); (5) no per-uid rate limit on callables + no createSubscription
"already paid" guard.

**🟡 Medium** — `signupsEnabled` not server-enforced · no admin 2FA · PayPal webhook no event-id de-dup ·
self-service & billing callables write no audit entry · toggle-save can commit half-typed Settings ·
`aiMonthlyCents` shown but unmetered · CSP allows `unsafe-inline` · admin hard-delete only (no soft-delete /
empty-trash) · no admin force-sign-out · webhook uses `serverTimestamp()` (undefined in emulator) ·
premium custom-limit `0` ignored client-side (diverges from rules).

**🟢 Low** — wildcard CORS on the subscribe write · `email.fromEmail` dead · revenue mis-counts annual
payers · `getStats` failure renders as a real $0 dashboard · flags propagate only on reload · free-tier
CoinGecko degrade invisible in-app · admin lists load-once · no admin email-verify tools · stale go-live
docs · verify secret files git-ignored before adding a remote.

---

## 3. Locked decisions (2026-06-27 interview)

### Launch scope
- **D1 — Live AI is in v1.** Build the secure proxy + validator + key before launch (not a fast-follow).
- **D2 — Signups off is enforced server-side.** Build an Auth `beforeCreate` blocking function (Identity Platform).
- **D3 — Admin 2FA is required for v1.** Identity Platform TOTP enrollment + challenge in the admin app.

### Abuse, cost & App Check
- **D4 — App Check is a hard go-live gate.** Provision reCAPTCHA + add server-side `context.app` checks on
  sensitive callables and the `/api` proxy. Built once, reused by the AI proxy + addCoin + billing.
- **D5 — Per-uid limiting + already-paid guard.** A Firestore-backed per-uid cooldown (the shared
  `consumeDailyBudget`/`checkCooldown` counter in `guards.js`) + an "already on a paid tier" short-circuit
  in `createSubscription`. (The live-AI ceiling is a monthly $-cap — `aiMonthlyCents` — not a daily count; see PRICING.md §4.)
- **D6 — PayPal webhook idempotency now.** Store each processed `event.id` and skip duplicates.

### Admin panel capabilities
- **D7 — In-panel grant/revoke admin**, wrapping the existing `setAdminClaim`, gated behind a confirm step +
  the new admin MFA.
- **D8 — Admin soft-delete + Empty-trash bulk action** (parity with self-service 30-day trash).
- **D9 — Dedicated admin "sign out of all devices"** (admin-target `revokeRefreshTokens`).
- **D10 — Reserve the AI Settings section now** — Anthropic key field (`keep()` idiom) + manual
  conviction-cache controls (invalidate / force-refresh a coin).

### Audit, compliance & CSP
- **D11 — Audit all sensitive events.** Add `writeAudit` to soft-delete, restore, data-export,
  sign-out-everywhere, and billing create/cancel (GDPR + forensics).
- **D12 — Drop `unsafe-inline` from CSP** before launch by moving inline landing/site-meta scripts to
  external/hashed files.

### Display honesty
- **D13 — AI allowance line labeled "coming soon"** until the per-uid meter lands (then it flips to a real
  number). Fix the bug where the "N analyses" line prints raw `aiMonthlyCents`.
- **D14 — Keep `email.fromEmail`, labeled "reserved / not yet used"** — it becomes real with transactional email.
- **D15 — Transactional email is in v1** (welcome / verification / billing receipts), in addition to landing capture.

### Go-live provisioning
- **D16 — CoinGecko Lite (~100k/mo), keep `HOT_PAGES=5`.**
- **D17 — Claude only (Opus 4.8)** for both prose (Pulse/Ask) and structured (conviction). One key, one
  provider. **This voids the old Gemini "no-train paid key" trap (#3 in NEXT-STEPS §0)** — there is no Gemini.
- **D18 — GetResponse** backs both transactional email + landing capture (needs API key + campaignId; confirm
  the plan tier supports transactional/SMTP). Legal/analytics: **Termly + cookie banner + Plausible**
  (Plausible needs no CSP change, unlike GA4).

---

## 4. Founder provisioning checklist (no code can supply these)

- [ ] **Firebase Blaze plan** + create the real project; enable Email/Password Auth + Firestore.
- [ ] **Identity Platform** enabled (gates D2 signups-enforce, D3 admin MFA, U13 password policy).
- [ ] **CoinGecko Lite** key → admin Settings (D16).
- [ ] **Anthropic API key** (Claude) → AI Settings (D1/D17).
- [ ] **GetResponse** API key + campaignId + confirm transactional capability → Settings (D15/D18).
- [ ] **Termly** account + 3 IDs (website UUID, privacy doc, terms doc) → Settings (D18).
- [ ] **Plausible** domain → Settings (D18).
- [ ] **reCAPTCHA v3** site key (`VITE_RECAPTCHA_SITE_KEY`) + enable App Check enforcement in console (D4).
- [ ] **PayPal** live clientId/secret/webhookId → Settings; plan IDs + `APP_URL` → `functions/.env` (the only env-only secrets).
- [ ] **Service-account JSON** for `set-admin.js` (bootstrap admin #1) — keep out of git.
- [ ] Register + promote a **second** admin; store both admins' creds in a password manager (`MIN_ADMINS=2`).

---

## 5. Sequenced build order

Detail + checkboxes live in [`NEXT-STEPS.md`](NEXT-STEPS.md) §BL. Summary:

1. **Security foundation (local-buildable):** shared per-uid Firestore limiter + `context.app` gate helper
   (D4/D5); PayPal webhook idempotency + `serverTimestamp`→`Date.now()` + persist billing cycle (D6, fixes
   annual revenue); `createSubscription` already-paid guard (D5); audit expansion (D11); quick admin fixes
   (`lookupUser` returns `tierBeforeFailure`/`premiumLimits`/`emailVerified`; premium-limit-`0` falsy bug;
   `getStats` distinct error state).
2. **Admin capabilities:** grant/revoke admin UI behind confirm+MFA (D7); admin soft-delete + empty-trash
   (D8); admin revoke-sessions (D9); reserve AI Settings section (D10).
3. **AI proxy (Claude-only keystone):** B1 Anthropic key in Settings → B2 `researchAsk` (validateOutput wired
   fail-closed + per-uid budget + App Check + tier gate) → B3 `addCoinGuarded` → B4 swap `ai-client.js` (flip
   the "coming soon" label → real meter) → B5 per-coin `convictionCache` + `getConviction` → B6/B8/B7 Pulse /
   PWA offline copy / tutor. (D1/D10/D13/D17)
4. **Identity Platform hardening (console + Blaze):** U14 `beforeCreate` enforcing `signupsEnabled` + IP limit
   + App Check enforcement (D2/D4); U13 server password policy; U15 admin MFA (D3) — gates the D7 grant UI.
5. **Transactional email + legal/analytics + CSP:** GetResponse transactional path (D15, makes `fromEmail`
   real) → Termly + cookie banner + Plausible (D18) → drop `unsafe-inline` (D12).
6. **Display-honesty + docs cleanup (quick, can run early):** AI "coming soon" label + raw-cents fix (D13);
   `fromEmail` "reserved" label (D14); fix stale `functions:config:set` docs; confirm `.env`/service-account
   git-ignored before any remote.

**Minor/optional hardening (not yet decided, low):** lock the `/api/subscribe` CORS to own-origin;
optional periodic `/api/config` re-poll so maintenance mode evacuates active sessions; in-app "estimated price"
signal for CoinGecko degrade (moot once Lite is bought, but keeps resilience honest).
