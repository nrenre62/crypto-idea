# API & Key Security

Part of **[SECURITY.md](SECURITY.md)** — return to the security map.

The single source of truth for **what the API is, how it's wired, and how the keys stay safe.**
The machine-readable contract is [`openapi.json`](../../openapi.json) (OpenAPI 3.0.3, 36 operations).

---

## 0. Interview decisions

Locked in a founder interview before this work:

| Area | Decision |
|---|---|
| **Spec source** | Codebase only (no Postman/Insomnia collection) — the code is the source of truth. |
| **Spec scope** | ALL four surfaces: public REST, user+billing callables, admin callables, PayPal webhook. |
| **Servers** | Emulator base + a `YOUR_PROJECT` production placeholder (fill at go-live). |
| **Gap-hunt method** | Deep local multi-agent adversarial review (nothing leaves the machine; no new accounts). A static OpenAPI contract audit backs it up (see the contract-posture note below). |
| **Key-security focus** | All four: admin config-secrets flow · client-bundle exposure · abuse/denial-of-wallet · key lifecycle & incident plan. |
| **Fix policy** | Report → adversarially verify → fix confirmed gaps this session (tests + commits). |
| **GitHub** | Install `gh`, browser login, push the repo **as-is** to a **PRIVATE** repo after a full-history secret scan. Product code stays closed. |
| **Open-source skills** | Reviewed & picked later as its own increment (see NEXT-STEPS §OSS) — this session stays focused on spec + security + private push. |
| **API skill** | Both: deepen `firebase-saas-starter` with the Firebase specifics AND create a standalone stack-agnostic `api-security` skill (open-source candidate). |

---

## 1. The API surface (what exists)

Everything is a Firebase Cloud Function in [`functions/index.js`](../../functions/index.js) (v1, Node 22, CommonJS). There are **three shapes**:

### A. Public REST — the `api` HTTP function (`onRequest`)
No auth. Reached at `/api/<action>` (Hosting rewrites `/api/**` → the `api` function). All heavy upstream work is cached and shared, so cost is flat regardless of user count.

| Method | Path | Purpose | Auth |
|---|---|---|---|
| GET | `/api/prices?ids=` | Price + market data for held/searched coins | none |
| GET | `/api/search?q=` | Search the cached coin universe | none |
| GET | `/api/coinlist` | Full coin list for the landing DCA calculator | none |
| GET | `/api/trending` | Trending coins (Search empty-state) | none |
| GET | `/api/config` | **Public, non-secret** app config (flags, plan prices, analytics/legal IDs) | none |
| GET | `/api/history?id=` | Daily price history for one coin | none |
| POST | `/api/subscribe` | Landing email capture → emailed to the site owner over SMTP | none (honeypot + tight per-IP budget) |

### B. Callable functions (`onCall`) — user + billing
The Firebase SDK sends `{data}` + the caller's ID token; the function verifies the token server-side and acts on `context.auth.uid` — **never a uid from the body** (no IDOR by design).

`createSubscription` · `cancelSubscription` · `scheduleProDowngrade` *(Plan B PR-C2 — Premium→Pro future-start pre-auth; auth, `assertNoUnknownKeys(["billing"])`, gated by the fresh `paidPlansEnabled` master switch before the `checkout` kill-switch, premium-only + 60s cooldown; acts on `context.auth.uid`)* · `resubscribePremium` *(Plan B PR-C3b-server — seamless future-start Premium re-subscribe for a cancelled-Premium user; request `{billing?}`, returns `{approvalUrl, subscriptionId}`; same gate order as `scheduleProDowngrade` — auth, `assertNoUnknownKeys(["billing"])`, fresh `paidPlansEnabled` master before `checkout`, 60s cooldown, acts on `context.auth.uid`; precondition = a **cancelled Premium with no pending `scheduledNext`** i.e. "Keep my plan" first; shares the `scheduleFutureStart` engine)* · `reactivateSubscription` *(now **fail-closed** — PR-C2: "Keep my plan" never un-cancels to `cancelled:false`; a healthy sub is a no-op)* · `resolveRecheckout` · `addCoinGuarded` *(CRYP-108 · B3, PR-1 + PR-2 — the **server-owned coin write**: client coin `create` is now `if false` in `firestore.rules`, so this Admin-SDK callable is the SOLE coin-doc writer. Re-derives server-side the tier coin-cap + the #20 `min(config, 1000)` clamp (pure `functions/coin-limits.js` `coinCapFor`) + the `isChosen` onboard gate + the coin-metadata clamps and the journal-prose length **reject** (a >2000-char `thesis`/`changeMyMind`/`funnel.*` → `invalid-argument`, never silent truncation — matching `validJournal` + the DI-1 honest-error guarantee) that `validCoinData`/`validJournal` used to enforce; writes the coin doc + `increment(coinCount)` in ONE `runTransaction`. Gate order mirrors `researchAsk`: auth → `assertNoUnknownKeys([portfolioId, coin, journal])` + path-segment safety → **flag-gated App-Check** (`guards.appCheckOk`, `config/app.appCheckEnforce`, **default OFF** — the SOLE `appCheckOk` call site) → **2s per-uid cooldown** → **100 adds/uid/day** (over-limit → `resource-exhausted`) → cap re-derivation → transaction. Acts on `context.auth.uid` only (no IDOR); no `writeAudit` — high-frequency user action. **PR-2 (done):** `firebase-database.js addCoin` now calls this callable — it no longer writes Firestore directly, and maps the callable's `HttpsError` (via a server-set `details.reason`) back to the app's `{success, code, reason}` contract, incl. the new **`rate-limited`** reason for `resource-exhausted`. `addTransactionGuarded` is a later PR.)* · `deleteMyAccount` · `restoreMyAccount` · `signOutEverywhere` · `exportMyData` · `reconcileMyCounters` · `devSetMyTier` *(emulator-only, hard-gated)*.

### C. Callable functions (`onCall`) — admin only
Same as B **plus** a verified admin custom claim, in **two roles**: `owner` (`{admin:true, role:"owner"}`, minted only by `functions/scripts/set-admin.js --role=owner`) and `manager` (`{admin:true, role:"manager"}`, granted by an owner from the admin app's owner-only **Admin access** tab). Every function goes through one shared gate in [`functions/index.js`](../../functions/index.js) — `assertAdmin` / `assertManager` / `assertOwner` / `assertFreshOwner` (owner **plus** a password re-auth within ~600s, server-flagged by `config/app.flags.stepUpReauth`, default on) / `assertSettingsUnlocked` (ADMIN-6 — the owner-only Settings-password unlock on `getAdminConfig`/`saveConfig`) — never a copy-pasted inline check.

| Gate | Callables |
|---|---|
| `assertAdmin` (read-only) | `getStats` · `lookupUser` · `listUsers` · `listAudit` · `listWebhookEvents` (ADMIN-1: PayPal webhook ledger) · `listDailyStats` (ADMIN-4: growth series) · `getSystemStatus` (ADMIN-2: kill-switch states + cron heartbeats — no secrets; the Sentry DSN is reported as a boolean) · `getUserNote` (ADMIN-5: read a user's private note) |
| `assertManager` | `setUserTier` · `setPremiumLimits` · `suspendUser` · `restoreUser` · `adminTrashUser` · `adminSignOutUser` · `saveUserNote` (ADMIN-5: write a user's private note; content never audited) |
| `assertOwner` | `deleteUser` · `captureStatsSnapshot` (ADMIN-4 — writes an aggregate snapshot, not config, so no step-up) · **`viewUserAsAdmin`** (ADMIN-5: READ-ONLY "view as" — reads a user's private data incl. journal theses; a reason is REQUIRED + audited; **never mints a token / never acts as the user**, so no purchase/mutation/lockout surface — the highest gate because it reads the most-private content) · **`listAdmins`** (ADMIN-SEP, CRYP-103a: READ-ONLY roster of every admin — `{uid, email, role, disabled, lastSignInTime}`, keyed off the `admin` claim so a no-role admin still appears; a read, so no step-up and no audit entry) · **`setSettingsPassword`** / **`unlockSettings`** (ADMIN-6 — set/change the owner-only Settings password + unlock the Settings screen with it; the unlock factor is enforced *inside* by `assertSettingsUnlocked`, see below) · **`requestSettingsPwReset`** / **`completeSettingsPwReset`** (ADMIN-6 PR2 — emailed Settings-password reset: mail a single-use hashed token to the owner's OWN verified email, then redeem it transactionally, uid-bound + expiry-checked) |
| `assertOwner` + `assertSettingsUnlocked` (ADMIN-6) | `getAdminConfig` · `saveConfig` — the Settings screen's read+write are behind the **Settings password** (the SECOND lock). Once `config/app.settingsAuth` is set, the caller needs a live server-tracked unlock (`unlockSettings`, ~10 min, in the server-only `settingsUnlock/{uid}` doc); before any password is set it **falls back** to the pre-ADMIN-6 step-up re-auth. This *replaces* `assertFreshOwner` on these two. |
| `assertFreshOwner` | `setManagerRole` (step-up re-auth retained — a claim mutation, not a Settings-doc write) |

**ADMIN-6 — the Settings password (owner-only 2nd lock).** A dedicated password guards the Settings screen (API keys, plans, admin access), *layered on the unchanged owner claim* — so even a stolen admin login can't read or change secrets without it. The crypto is a pure, unit-tested `functions/settings-auth.js`: **scrypt** via `node:crypto` (never roll our own), a fresh random salt per password, `timingSafeEqual` verify (null/shape-safe → never throws to an allow), and single-use **hashed** reset tokens. The plaintext is never stored and **never returned** to a client; `getAdminConfig` exposes only `settingsAuth.set` (a boolean) + `updatedAt`. The unlock is **server-enforced** (`settingsUnlock/{uid}`, server-only in rules) — the client timer is UX only — and is **bound to the login session's `auth_time`**, so a stolen token from a different/older session can't ride a live unlock (this restores the session-scoping the replaced `assertFreshOwner` provided). The `hasPw` gate decision reads `config/app` **fresh** (not the 5-min `getConfig` cache), so a just-set or just-cleared password can't lag the gate. Both `unlockSettings` **and** the `setSettingsPassword` change-path share ONE per-uid/day rate-limit bucket (so guesses can't be split across endpoints to double the budget); every set/change, **successful** unlock and **failed** unlock is audited (`setSettingsPassword` / `settingsUnlock` / `settingsUnlockFailed`) — but never the password.

**ADMIN-6 PR2 — emailed reset.** If the owner forgets the Settings password, `requestSettingsPwReset` mails a reset link to the owner's **own verified email** (`context.auth.token.email` — never a body address, so a request can't redirect the reset elsewhere). The link carries a random token; only its **sha256 hash** is stored (`settingsPwReset/{hash}`, server-only), so a DB read can't replay it. `completeSettingsPwReset` redeems it in **one transaction** — checked for `used`/`expires`/`uid` (bound to the requester, so a leaked link is useless to anyone else) then atomically marked used while the new scrypt hash is installed (the idempotency analog: at-most-once even under a double-submit). Both are owner-only and share the reset rate-limit bucket. The transport is a seam (`functions/sendMail.js`): pure `smtpConfigOf` + `sendMail`, which **logs** the link in dev / when no SMTP is configured and only **lazy-requires** `nodemailer` on the real send path — so the dev path never loads it and the send secret (`email.smtpPass`) follows the same `keep()`/`smtpPassSet`/`SECRET_PATHS`-redaction rules as every other secret. Set the SMTP host/port/user/pass + from-address in admin Settings → Email. *(PR3 adds a login-page "Forgot password?" for the admin LOGIN password — owner + manager — via Firebase-native `sendPasswordResetEmail`.)* Two server-only collections back it: `settingsUnlock/{uid}` and `settingsPwReset/{hash}` (both `allow read, write: if false`). **Lockout escape hatch:** `functions/scripts/clear-settings-password.js` (service-account) deletes `settingsAuth`, reverting Settings to the login re-auth. *(PR2 adds the emailed reset over the SMTP provider; PR3 adds a login-page "Forgot password?" using Firebase-native `sendPasswordResetEmail` for both owner + manager.)*

**Owner protection is by identity:** an owner can never be deleted, trashed, demoted or self-deleted, and a **manager may not act on an owner at all** (suspend / sign-out / tier / limits / trash / delete all refuse). `MIN_ADMINS` remains only as a secondary floor. `setAdminClaim` is **removed** — the old export now always throws `permission-denied`; use `setManagerRole({email, grant})`.

**Admins are excluded from the Users surface (ADMIN-SEP PR1, CRYP-103a).** `listUsers` and `findDuplicateEmails` skip any account whose `customClaims.admin === true` (keyed off the **claim**, not `role` — a no-role admin has `role === ""` and a role filter would leak it back), so an admin never appears in the Users list, its count, the CSV export or the page-scoped bulk actions. `gatherStats`/`getStats` (via an `adminUidSet()` Auth-enumeration helper) and `countSignupsSince` exclude admins too, so the Overview **Total users** + tier counts + `signups24h` + the daily `statsDaily` snapshot exclude them as well. `totalCoins` is deliberately **not** filtered — it is a collection-group count, not a user-count surface. Admins are surfaced instead through the owner-only `listAdmins` roster read.

**No admin is a management SUBJECT (ADMIN-SEP PR2, CRYP-103b).** Two enforcement changes at the auth layer, both **server-side, not just UI**:
- **The account-management WRITE surface tightened.** `functions/guards.js` `requireManager` is **no longer an alias of `requireAdmin`** — it now demands an explicit `role` of `manager` or `owner`, so a legacy `{admin:true}` claim with **no or unknown role is refused** (reason `manager-required`, mapped to `permission-denied` in `denied()`). The shared **read** surface (`requireAdmin`) is unchanged and still admits a role-less admin, so the panel stays readable through the migration window; only mutation tightens. This eliminates the silent third "no-role admin gets full manager power" state — exactly two admin types can act.
- **An admin is never a moderation target.** `setUserTier` / `setPremiumLimits` / `suspendUser` now call `assertTargetNotAdmin(uid)`, refusing **suspend / tier / limits on ANY admin target** (owner OR manager) server-side (`failed-precondition`) — keyed off the `admin` **claim**, mirroring the already-server-refused trash/delete. This backs PR1's client-only button hide (Part A1), which previously left suspend/tier/limits permissive on a manager target.

`set-admin.js` also hard-caps owners at 2 via the pure `functions/owner-cap.js` `ownerCapDecision` (a fresh `--role=owner` mint past 2 owners is refused without `--force`). **No new callable — the export count is unchanged;** `owner-cap.js` is a script-only helper.

### Growth snapshots (ADMIN-4)
`statsDaily/{YYYY-MM-DD}` is **server-only in `firestore.rules`** — no client read, no client write, *including* an admin claim (the panel goes through `listDailyStats`). It holds aggregate counts and revenue only: **no uid, no email, nothing personal**, which is what makes it safe to retain **indefinitely** with no erasure path (contrast audit at 365 days). The deny is not about confidentiality — it is **integrity**: the series is presented as the record of what actually happened and is kept forever, so a client-writable snapshot could be used to fake growth or erase a bad month, permanently.

Same round closed a related integrity gap in the **`users` create rule**: `joined` (the signup date rendered in the admin Users list and the users CSV export) was in the closed-shape allowlist but its **value was never validated** — `validUserData` checks only `name` — and the field is immutable after create. A registering client therefore had exactly one chance to claim **any** signup date, permanently. The rule now pins `joined == request.time` when the field is present. Growth metrics still count signups from the **Auth record's `creationTime`** rather than from `joined`: one server-set, un-forgeable source beats two.

### Feature kill-switches & cron heartbeats (ADMIN-2)
`config/app → flags.features` carries three switches (`marketData`, `checkout`, `aiResearch`), published non-secret on `/api/config` so the UI can be honest, and **enforced server-side** — hiding a control is never the boundary. Two design rules carry the security weight:

- **Default-ON.** A switch is enabled unless config says *exactly* `false`. A missing key, a config doc that predates the feature, or a failed Firestore read must degrade to a working product, never to a self-inflicted outage. The same `!== false` idiom already used for `signupsEnabled`.
- **One choke point.** Every CoinGecko call routes through `cgFetch()`, so `marketData` is enforced in a single place a new call site cannot miss — a unit test fails the build if a direct `` fetch(`${CG_BASE}…`) `` reappears. Off means **zero upstream calls**: the caches keep serving, so the switch is safe enough to actually use mid-incident. `getUniverse`/`getTrending` skip their lazy refresh too, because `refreshUniverse` treats a failed first page as *partial* and would still stamp `updatedAt: now` — marking the cache fresh while having fetched nothing.

A `saveConfig` payload that omits `features` **keeps** the stored switches (`mergeFeatures`, per-key). Without that, the instant maintenance/signups toggles — which post `flags` with no `features` — would read every absent switch as ON and silently restart the spend an operator had just killed.

**Launch-free master switch (CRYP-101).** `paidPlansEnabled` is a **top-level** `config/app.flags` key (a peer of `maintenance`/`signupsEnabled`/`requireAdminMfa`, **not** a member of `flags.features`). It follows the same **default-ON `!== false`** rule and, like `requireAdminMfa`, a **per-key KEEP** on `saveConfig` (an omitted key preserves the stored value). It is published non-secret on `/api/config` — the client reads it to drive the launch-free UI, but the **control is the server refusal** in `createSubscription` (which reads `config/app` *fresh*, and is checked *before* the `checkout` kill-switch so `paidPlansEnabled=false` takes precedence). See [BILLING.md](../decisions/BILLING.md) §3.6.

`health/jobs` (the six cron heartbeats) is **server-only in `firestore.rules`**, and like `statsDaily` the reason is **integrity, not confidentiality**: the status strip exists to reveal a scheduler that silently stopped firing, so a client that could stamp a heartbeat could keep a dead cron looking alive forever — turning the one control that catches silent failure into the thing that hides it.

**Sentry** (functions-only) reports to a DSN stored in `config/app.sentry.dsn` — never in the bundle, never in git, `keep()`-guarded like every other secret. Events carry the **minimum**: `scrubEvent` strips the user, breadcrumbs, request URL, headers, cookies and body before anything leaves the process, leaving the error plus a coarse `where` tag. With no DSN configured the module is a complete no-op and never even `require()`s the SDK. ⚠️ **Delivery is unverified** — there is no Sentry account or deployed project yet; what is proven locally is the no-op path, the DSN validation, and the scrubbing. Sending error data to a third party is a data-handling decision that must be **disclosed in the privacy policy before a DSN is set** (go-live).

### Audit-entry contents (ADMIN-3)
Two fields were added to what `writeAudit` records, both with a security edge worth stating:

- **`ip` — the source IP, on EVERY audited event** (admin actions *and* the self-service/billing ones). It is derived by `net-utils.auditIp()`, which reuses the rate limiter's **right-anchored X-Forwarded-For** rule rather than the attacker-controlled left-most token. Where no origin is available the field is `""`, never a placeholder. *(The functions emulator supplies a synthetic request with headers only — no `ip`, no `socket`, no XFF — so local entries carry an empty `ip` by design. The value populates in a deployed environment.)*
  - ⚠️ **Not yet evidence-grade — one open trust-boundary question.** `RL_TRUSTED_HOPS` (default 2) says how many entries the platform appends on the right, and that count is **per ingress path**. `/api/*` arrives via Firebase Hosting → Cloud Functions, but a **callable is invoked directly on `cloudfunctions.net`** — a potentially shorter chain. If the callable chain is shorter than the configured hop count, the token selected is the caller-supplied one, i.e. **forgeable**. This cannot be settled locally (the emulator sends no XFF at all). **Go-live action: read a real `X-Forwarded-For` from a prod log for BOTH paths and set `RL_TRUSTED_HOPS` accordingly — and if the two differ, split the constant.** Until then, treat a recorded IP as **advisory corroboration, not evidence**. Note this is *not* an authorization fail-open: nothing is authorized on the IP, so the blast radius is what the log attributes, plus rate-limit bucketing.
  - **Privacy:** an IP is personal data, and audit rows outlive the account they describe. The controls on it are (a) the collection is **server-only** in `firestore.rules` — no client can read it, the callable reads via the Admin SDK; (b) the **365-day** `purgeOldAudit` retention sweep; (c) admin-only export. If erasure scope is ever re-examined, the audit log is the store that holds email + IP after a user is deleted — see the erasure note in `secure-by-design`.
  - Same round fixed `isValidIp`, which **rejected IPv4-mapped IPv6** (`::ffff:x.x.x.x` — what a dual-stack Node/Express server reports in `req.ip`). `clientIp` then fell through to `"unknown"`, collapsing every such caller into a **single shared rate-limit bucket**. `normalizeIp` now folds the mapped form to its IPv4 so one client is one bucket regardless of which form the platform reports.
- **`details` — a field-level config diff for `saveConfig`** (`functions/config-diff.js`). The config doc holds live secrets and the audit tab is readable by *every* admin, so **no secret value may reach it**: a field guarded by the `keep()` idiom (`coingecko`, `paypal.secret`, `email.smtpPass`, `ai.providerKey`, `sentry.dsn`) records only `(changed)`. The rule is mechanical — *keep()-guarded ⇒ secret* — and unit-tested against every entry in `SECRET_PATHS`, **plus a count check that a newly keep()-guarded field was actually registered** (the list is hand-maintained, so nothing else stopped it silently drifting). The string is bounded to `DETAILS_MAX` (500), which **must** equal `AuditEntry.details.maxLength` in `openapi.json`.

**Both CSV exports** (Audit, Users) are built client-side from rows the admin can already see — no new server surface — but they carry emails and source IPs out of the platform's retention and erasure controls, which the UI states next to the buttons.

### D. PayPal webhook — `paypalWebhook` (`onRequest`)
The only inbound write **not gated by a Firebase user login** — it is authenticated instead by **PayPal's webhook signature** (documented in `openapi.json` as the `PayPalWebhookSignature` scheme). Every event is cryptographically verified against PayPal's verify-webhook-signature API **before any DB write**, and processed **once** (idempotency ledger keyed by event id).

### Plus: scheduled jobs (no HTTP surface)
`refreshPrices` (5 min) · `refreshUniverseDaily` (24h) · `purgeOldAudit` (24h) · `purgeExpiredTrash` (24h) · `enforceSubscriptionPeriods` (24h).

---

## 2. How each client connects (the wiring)

```text
                         ┌───────────────────────── Firebase project ─────────────────────────┐
 Landing (index.html) ──►│  /api/*  (api fn) ──► cache/universe, cache/trending, historyCache  │
   client-side search    │      │                        ▲ shared, flat-cost                    │
                         │      └──► SMTP send to site owner (creds server-side)                │
 User app (app.html) ───►│  onCall (user)  ──► verify ID token ──► users/{uid}/…  (owner rules) │
   Firebase JS SDK       │  /api/prices,history  (same cached proxy)                            │
                         │                                                                      │
 Admin app (admin.html)─►│  onCall (admin) ──► verify claim + admin role ──► any user / config  │
   SEPARATE named app    │                                                                      │
                         │  config/app  ◄── saveConfig (Admin SDK only; rules deny all clients) │
 PayPal ────────────────►│  /paypalWebhook ──► verify signature ──► users/{uid}.tier/subscription│
                         └──────────────────────────────────────────────────────────────────────┘
```

- **Landing** never authenticates — it only reads cached public data and posts to `/api/subscribe`.
- **User app** uses the Firebase JS SDK; the SDK attaches the ID token to every callable. Reads/writes to `users/{uid}/…` are gated by [`firestore.rules`](../../firestore.rules) (owner-only, closed-shape doc, counter-based tier caps).
- **Admin app** is a **separate Firebase app instance** (`initializeApp(config, "admin")`) so its login can't collide with a user session (ERRORS §A5 fix). Authorization is the **server-side role gate in every admin function** (§1C) — a different URL is *not* the boundary, and neither is the claim alone: manager-, owner- and fresh-owner-only operations are separated server-side. The Users tab has **no** grant-admin control; roles are granted from the owner-only Admin access section inside Settings (folded in from a former top-level tab by ADMIN-D3; the `setManagerRole` gate is unchanged).
- **`firestore.rules` know the roles too:** reads of `users/**` stay open to any admin, but the blanket `allow update` / `allow delete` on `users` are **owner-only** (`isAdminOwner()`, a null-safe `request.auth.token.get("role", "") == "owner"` check). Verify with `npm run test:rules`, or `npm run test:rules:solo` for an isolated Firestore emulator on `:8099`.
- **PayPal** posts to the webhook; `custom_id`/`plan_id` are only trusted *after* signature verification.

---

## 3. How API keys are protected

**The rule:** every secret lives server-side only. The browser bundle ships **only** the public `VITE_FIREBASE_*` web config (a Firebase web key is not a secret — the rules are the security).

### Where secrets live
1. **Primary:** the locked `config/app` Firestore doc, written by `saveConfig` (Admin SDK). [`firestore.rules`](../../firestore.rules) denies **all** client read/write to `/config/**`. Holds: CoinGecko key, PayPal client/secret/webhook, SMTP password, the AI provider key (`config/app.ai.providerKey`, Wave B — flow below).
2. **Fallback / deploy-time:** `functions/.env` (git-ignored). Only source for the PayPal plan IDs, `PAYPAL_ENV` (`sandbox|live`, non-secret) + `APP_URL`.

### The set-flag / keep() idiom (never echo a secret)
- **`getAdminConfig`** returns secrets as **booleans only** — `secretSet`, `smtpPassSet`, `providerKeySet`, `coingeckoSet`. The value never leaves the server. **Non-secret** AI knobs are echoed as their real value: `ai.monthlyCapCents` (Plan B PR-E1 — the app-wide monthly $-cap, a dollar amount, not a credential) is returned as a full number, distinct from the `keep()`-guarded `providerKey`.
- **`saveConfig`** uses `keep(incoming, current)`: a **blank** field preserves the saved value, so re-saving the Settings form (which never shows secrets back) can't wipe them, and the browser never has to hold the secret to keep it. `ai.monthlyCapCents` is written from `keys.aiMonthlyCapCents` via the pure `clampMonthlyCapCents` — clamped to a non-negative integer `0..100000000` when present, KEEPS the stored value when blank/omitted, defaults `5000`; it is not `keep()`-guarded because it is not a secret (it round-trips in the clear).
- **`/api/config`** (the public endpoint) is a *separate* projection that contains **no secret** — only flags, plan prices, analytics/legal IDs. The AI budget cap is **not** on it — it is an admin-only number.

**AI provider key flow & the AI proxy foundation (Plan B PR-E1 — INERT).** The live AI research proxy's server-side plumbing now exists but nothing calls it yet (the `researchAsk` callable is **PR-E2**; the `ai-client.js` client swap is **PR-E3**). The AI provider key follows the same server-only rule as every other secret: it lives in `config/app.ai.providerKey`, is `keep()`-guarded, and is never bundled or echoed (only `providerKeySet`). The provider and its model ids are **swappable with no code change** — the generation model id, judge model id, and an optional API base URL are all pasted in admin AI settings (`ai.generationModel`, `ai.judgeModel`, `ai.baseUrl`); no model id is hardcoded in code. `functions/ai-provider.js` `callProvider` reaches the AI provider by a **raw seamed `fetch`** to `${AI_PROVIDER_BASE}` (the configured provider base URL, env-overridable for tests) with the key passed **header-only** (`x-api-key`) — **never in the URL, query string, or a log line**. ⚠️ **PR-E2 guardrails to preserve (from the security review):** unlike `cgFetch`, `callProvider` has **no central choke point**, so PR-E2 must wire it behind the `aiResearch` kill-switch **and** a `budgetExceeded` check *before* generation; and the callable must **fail CLOSED** on an unreadable budget ledger (`readMonthSpendCents` throws — never `.catch(()=>0)`, which would be free spend).

**New server-only collection — `aiBudget/{YYYY-MM}` (Plan B PR-E1).** The app-wide monthly AI spend ledger (one doc per UTC month, cents accumulated by `functions/ai-cost.js`) is **server-only in `firestore.rules`** (`allow read, write: if false`, defense-in-depth) — including any admin claim; the meter is written solely by the Admin SDK. Like `statsDaily`/`health/jobs` the reason is **integrity**: a client-writable spend meter could be zeroed to defeat the whole $-cap.

### Verified this session (scans)
- **Client bundle:** built `dist/` scanned — **zero server-secret values ship.** The only `paypalSecret`/`providerKey` strings in the admin bundle are empty React form-state initializers + boolean set-flag reads; the only Firebase config is the public web config; `access_token`/`RECAPTCHA` are Firebase SDK identifiers.
- **Git history:** full 419-commit history scanned — **no real secret material ever committed.** Only the two `.env.example` **templates** (placeholders) were ever added; no `serviceAccount.json` / `*-key.json` / `*.pem`.

### Enforcement (not just documented)
- `.gitignore` ignores `.env`, `*serviceAccount*.json`, `*-key.json`, `*.pem`.
- A tracked git `pre-commit` hook (`.githooks/`) blocks secret-looking filenames + private-key content.
- The build's `dist/`-name guard fails the build on a forbidden string.

---

## 4. Security review — findings & fixes

> **Method:** a local multi-agent adversarial gap-hunt across 8 dimensions (access-control/IDOR, input/injection/SSRF, secrets/key-flow, denial-of-wallet, PayPal webhook, client exposure, key lifecycle, data-integrity/DoS) — 44 agents, ~3.5M tokens. Every raw finding was independently verified by **two skeptics** (one hunting a mitigating control, one reproducing the exploit chain). **11 survived; 7 were refuted and dropped.** The 11 deduped to **8 distinct issues, all fixed this session.**

### Fixed

| # | Sev | Issue | Fix |
|---|---|---|---|
| 1 | **HIGH** | **Tier-limit bypass by counter-forge.** Caps are enforced via client-maintained counters, and the owner-update rule allowed a standalone `-1`. A raw SDK write could drive `portfolioCount`/`coinCount`/`txCount` down without deleting anything, then create past the cap — unbounded (defeating the paywall AND the coins denial-of-wallet ceiling). | `firestore.rules`: new `counterNoForge` forbids **any** client counter decrease (only same/+1). Client deletes no longer decrement (`firebase-database.js`); the too-high count is **fail-safe** (only makes the cap stricter) and reconciled by the trusted `reconcileMyCounters` (Admin SDK), fired after a delete. Rules test proves the decrement is denied. |
| 2 | **HIGH** | **Rate-limiter spoof (reported 3×).** `rateLimited` keyed on the **left-most** `X-Forwarded-For` token, which Google appends *after* — so it's attacker-controlled. Rotating the header minted a fresh bucket per request, defeating every `/api` limit. | New pure `functions/net-utils.js` `clientIp()` reads a **right-anchored** trusted hop, validates it's a real IP, falls back to `req.ip` (unit-tested). Overflow wipe now prunes only expired buckets, not all. `RL_TRUSTED_HOPS` env-tunable. |
| 3 | **HIGH** | **`/api/history` denial-of-wallet.** An unvalidated `id` hit CoinGecko's heavy `market_chart`; a 404 never cached, so a loop of novel ids forced 1–2 uncached upstream calls each. | Gate on **shared-universe membership** before any fetch (a real request is always for a coin already in the universe), plus a 1-hour **negative cache** for real-but-failing ids. |
| 4 | MED | **`/api/prices` fan-out.** Novel/garbage ids defeated the coalescer and never cached → 1:1 upstream calls. | Only **known universe coins** reach the on-demand `/simple/price` fetch; unknown ids are ignored (no response entry, no upstream call). |
| 5 | MED | **`/api/prices` fold-back growth.** On-demand fold-back could write net-new off-list entries → the shared 1 MiB `cache/universe` doc grows unbounded, and past the cap the 5-min refresh silently breaks for everyone. | Fold-back only ever refreshes coins **already** in the universe — never creates an off-list entry. |
| 6 | MED | **Read-amplifying callables.** `exportMyData` / `reconcileMyCounters` re-read the whole tree with no budget. | `exportMyData` → 10s cooldown; `reconcileMyCounters` → generous per-UTC-day budget (wiring the built-but-unused `consumeDailyBudget`). |
| 7 | MED | **Webhook idempotency ordering.** The idempotency marker was committed **before** the side effect, so a transient failure permanently suppressed a paid-tier change (marker never purged). | On a processing failure the just-written `webhookEvents/{id}` marker is **rolled back**, so PayPal's retry genuinely reprocesses (patches are idempotent set-merges). |
| 8 | LOW | **Secrets hygiene gaps** (split-voted; cheap + directly on-target before a push). `.gitignore` missed `.env.*` variants; the pre-commit content scan matched only PEM/service-account shapes, not the app's real key formats. | `.gitignore` → `.env*` (+`!.env.example`) + `*.p12`/`*.p8`/`credentials*.json`/`.npmrc`. Pre-commit scan adds `sk-ant-`/`CG-`/PayPal-token prefixes (public `AIza…` deliberately not matched). CI push-protection is the durable control (see §6). |

### Refuted (verified NOT exploitable — no change)
- **SSRF via non-dotted IP encodings** — Node's WHATWG `URL` normalises the host before `safeProviderOrigin`'s IPv4 check, so `0x`/octal/integer encodings don't slip through; also admin-gated + blind.
- **`getAdminConfig` echoes the PayPal webhook ID** — true, but admin-only and not independently exploitable (webhook forgery is still blocked by signature verification). Left as-is.
- **`getConfig` 5-min cache stale-secret window** — bounded, per-instance, self-heals; not a client-reachable exposure.
- **`/api/subscribe` SMTP abuse** — can't occur: the handler 503s unless SMTP (a `fromEmail` destination) is configured (not yet).
- **`tierBeforeFailure` resurrection** — the recovery path runs only inside a **signature-verified** `PAYMENT.SALE.COMPLETED`; no forgeable escalation.
- **No key-rotation runbook** — accurate but not a vulnerability; **addressed anyway** in §6 (the interview asked for a key-lifecycle plan).
- **Full-collection scans in scheduled sweeps** — fine at current scale; a documented go-live scaling item, not a live gap.

### Also verified clean
Callable access control (all 35 exports — the ADMIN-6 `setSettingsPassword` + `unlockSettings` + the PR2 `requestSettingsPwReset` + `completeSettingsPwReset` are the newest: auth-before-side-effect, the shared role gates `assertAdmin`/`assertManager`/`assertOwner`/`assertFreshOwner`/`assertSettingsUnlocked`, `context.auth.uid` not body uid, owner-identity protection with `MIN_ADMINS` as a secondary floor), the PayPal signature/idempotency core, the client bundle (no secret ships), CSP/headers (frame-ancestors none, no `unsafe-inline` scripts), and input validation on the `/api` surface (length caps, `encodeURIComponent`, regex-sanitised doc paths).

### OpenAPI contract posture

The OpenAPI contract is hardened with honest, server-grounded constraints, validated against a static contract audit: `additionalProperties:false` on every closed-shape schema and request wrapper, real `maxItems`/`maxLength`/`minimum`/`maximum` matched to the actual code caps, and `pattern` only where every real value provably matches (free text → a control-char-exclusion form; structured strings → real email/url/token/id/date patterns). Transport is HTTPS-only (no cleartext server entry), and the PayPal webhook's signature is documented as a `PayPalWebhookSignature` `apiKey` scheme (§D).

**Accepted by design (won't-fix):** the public `security:[]` `/api/*` endpoints (unauthenticated on purpose), the webhook's honest `apiKey`-in-header scheme, and the raw passthrough objects left OPEN (`PricesResponse` map, `ExportMyData` `profile`/`portfolios`, the `UserSnapshot` raw Firestore-doc snapshot, `PayPalEvent`/`.resource`, `CallableError.error.details`). Two format traps are worth remembering: a bare `^\S*$` pattern is flagged "too loose" (use the control-char-exclusion form instead), and OAS-3.1 nullable syntax in a 3.0 doc is a structural error — the 3.0 form is `"type":"integer","nullable":true`, not `"type":["integer","null"]`.

**Live authz probes against the running emulator** verify the runtime surface directly (the static scan engine is a poor fit for this callable API): a **non-admin token is denied on every admin callable** (each `403`); **unauthenticated calls are denied everywhere** (`401`, or `403` on the admin combined-check ops); a **self-service callable with a foreign `uid` in the body returns the *caller's* own data** (acts on `context.auth.uid`, body id ignored — no IDOR); and required-field validation plus the callable envelope are enforced (`400`). No vulnerabilities. Every callable also rejects unknown **top-level `data` keys** (§5). A full automated conformance scan is best run later against a deployed HTTPS URL.

---

## 5. Go-live items (known, deferred — not gaps)

These are **intended** deferrals to the go-live/Blaze phase, documented so they're not mistaken for oversights:

- **App Check enforcement** — **console-only, no code.** `guards.appCheckOk` exists and is unit-tested but has **zero call sites, deliberately**: for v1 callables Firebase enforces App Check platform-side *before* the handler runs, so wiring the helper duplicates a platform control and adds a second way to lock everyone out. Set `VITE_RECAPTCHA_SITE_KEY` → build → deploy → watch "unverified" fall to ~0 → *then* enable enforcement (GO-LIVE-AUDIT H1; re-confirmed by the founder during ADMIN-0). Reversing that order locks out 100% of users.
- **Live PayPal** — signature verification + idempotency are built; the live client/secret/webhook + a real e2e run happen at go-live.
- **CoinGecko paid key** — the proxy works on the free tier (degrades gracefully); a Demo/paid key is needed for the full 5-min refresh at scale.
- **Admin 2FA** — needs Identity Platform MFA (Blaze) for **enrolment**. The **enforcement gate is built** (ADMIN-0): `guards.requireMfa` reads `firebase.sign_in_second_factor` off the verified token and runs inside the shared `assertRole`, so it covers **every** admin callable rather than being repeated per-endpoint. Flag `config/app.flags.requireAdminMfa`, **default OFF** — the opposite default from `stepUpReauth`, because until Identity Platform is on *nobody* can satisfy it and an on-by-default gate would wall the panel off the moment it deployed. Verified live: with the flag on, an owner who signed in with a password only is refused `mfa-required` on every admin callable.
- **Auth `beforeCreate` blocking function** — **built** and enforced (`exports.beforeCreateUser`), but **deploying it requires Identity Platform**, the same prerequisite as MFA. Enable Identity Platform before the first functions deploy or the deploy fails.
- **Distributed rate limiting** — the current per-IP limiter is in-memory per instance (see §4 for the confirmed implications and the chosen mitigation).
- **Strict request-body input validation — ✅ BUILT.** Every callable rejects unknown **top-level `data` keys** via `assertNoUnknownKeys(data, [...])` (the pure, unit-tested `guards.unknownKeys`), run right after the auth/role gate — so `openapi.json`'s `additionalProperties:false` request contract is enforced, not just documented. It throws `invalid-argument` with a generic message that never echoes the offending key name. Allow-lists match each handler's real `data.*` reads, cross-checked against every client send (`src/api/*`, `useAdminDashboard.js`); no-arg callables reject any key. **Out of scope by design:** the PayPal webhook (`onRequest`, arbitrary signature-verified payload) and **nested** config shapes (left to `saveConfig`'s merge + `keep()` sanitiser). Covered by unit tests + a callable integration test (the emulator tier needs JDK 21 to run locally).

---

## 6. Key rotation & incident runbook

The interview flagged "key lifecycle & incident plan" as in-scope. The review found no leak (the bundle and full git history are clean — §3), so this is the standing procedure, not incident response to an actual exposure.

### The secrets, where they live, how to rotate

| Secret | Lives in | Rotate by |
|---|---|---|
| **CoinGecko** Demo/paid key | `config/app.coingecko` (Admin → Settings) or `COINGECKO_DEMO_KEY` env | Issue a new key in the CoinGecko dashboard, paste it into Admin → Settings (the old one stops being used on the next `getConfig` refresh, ≤5 min), then revoke the old key. |
| **PayPal** client id / secret / webhook id | `config/app.paypal` (Admin → Settings) or env | Rotate the secret in the PayPal Developer dashboard, update Admin → Settings, then invalidate the old credential. Re-verify a test webhook. |
| **SMTP** password | `config/app.email.smtpPass` | Reset it at the SMTP host, update Admin → Settings, revoke the old. |
| **AI provider** key (Wave B) | `config/app.ai.providerKey` | Reissue in the AI provider's console, update Admin → Settings, revoke the old. |
| **Firebase service account** (Admin SDK / `set-admin.js`) | a local key file, **never committed** (`.gitignore`) | Create a new key in GCP IAM, replace the local file, then **delete** the old key in IAM. |

Because every runtime secret is read from `config/app` (or env) and never from the bundle, **rotating is a paste-and-revoke — no redeploy** for the config-doc secrets.

### If a key is suspected leaked
1. **Revoke first, ask questions later** — invalidate the key at the provider immediately (a rotated-but-not-revoked key is still live).
2. **Replace** it in Admin → Settings (or env + redeploy for env-only values: PayPal plan IDs, `APP_URL`).
3. **Scope the blast radius** — CoinGecko/email keys are cost/abuse risks; the PayPal secret and the Firebase **service account** are money/god-mode — treat those as SEV-1 (also rotate the service account and audit `audit/**` for unexpected admin actions).
4. **Scan history** if a commit is suspected: the repo shipped with `.gitignore` + a pre-commit content scan (§3), and the durable backstop is **GitHub secret-scanning / push protection** — enable it on the private repo (Settings → Code security) so a future leak is caught server-side where client hooks don't run.

### Scoping (least privilege)
- Use the CoinGecko **Demo** tier key (read-only market data) — never a higher-scoped one.
- Use **separate keys per environment** where the provider supports it.
- The Firebase service account used by `set-admin.js` should be the **least-privileged** SA that can set custom claims — not the default all-powerful one (an ISO-4 go-live item).
- `set-admin.js` is the **only** way to mint an **owner** (`--role=owner|manager`, `--revoke`, `--show`, `--force`), so the key file is effectively the root of the admin trust chain. **Managers** need no key file — an owner grants them in-app via `setManagerRole`.

---

See also → [docs/INDEX.md](../INDEX.md)
