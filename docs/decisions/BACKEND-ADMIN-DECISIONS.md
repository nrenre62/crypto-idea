# Backend & Admin Model

How CryptoIdea's Cloud Functions backend, the admin app, and the `config/app` settings doc fit together — the request lifecycle, the admin claim boundary, and the launch/kill-switch controls.

Part of [Product Decisions](PRODUCT-DECISIONS.md) — the canonical product/pricing record this backend serves.

For the security boundary and rules invariants see [Security](../security/SECURITY.md); for the full billing flow, webhook events, and secrets see [Billing](./BILLING.md). Other canonical records are listed in the [docs index](../INDEX.md).

## Request lifecycle: app/landing to the market-data cache

Every HTTP call from both the React app and the static landing hits one Cloud Function, `exports.api` (an `onRequest` handler in `functions/index.js`). Firebase Hosting rewrites `/api/**` to it (same-origin), and it dispatches on the last path segment: `/api/prices`, `/api/search`, `/api/coinlist`, `/api/history`, `/api/config`, `/api/subscribe` (unknown paths return 404). All routes are public and unauthenticated; abuse control is a per-IP in-memory sliding window (60/min reads, 5/min subscribe) plus a honeypot field on subscribe.

Cost stays flat regardless of user count via a single shared Firestore doc, `cache/universe` (~3,000 coins), that backs the whole app and the landing DCA calculator:

- `/api/prices` serves from the cache, refetching only stale (older than five minutes) or long-tail coins from CoinGecko.
- `/api/search` is a pure in-memory scan over the cache — no upstream call.
- Per-coin history lives in `historyCache/{id}` with a 30-day TTL.

CDN cache headers (coinlist 24h, history 24h, config 60s, prices 120s) make thousands of visitors cost roughly zero function calls — but only on deployed Hosting. Locally the function runs on every request, so the flat-cost effect is not observable in dev.

Frontend callers live under `src/api/`: `src/api/coingecko.js` returns `null` on error (never throws), feeding `useLivePrices` (60s poll), `useCoinSearch` (300ms debounce), and `useCoinHistory`. The Research tab derives 7d/30d change and its sparkline from history client-side and never calls CoinGecko from the browser. The landing `#dca` calculator loads `/api/coinlist` once plus `/api/history` per coin, with a 12s timeout and an offline fallback.

Background freshness runs on three pub/sub schedulers: `refreshPrices` (5 min, the hot ~1,250 coins), `refreshUniverseDaily` (24h, full refresh plus prune of delisted coins), and `purgeExpiredTrash` (24h). Cloud Scheduler does not fire in the emulator, so locally the universe can drift and trash never erases.

## Auth and the data layer

Components never touch the Firebase SDK directly — access is behind `src/api/`. `firebase.config.js` uses the real `VITE_FIREBASE_*` web config only when not in dev and an API key is present; otherwise it falls back to a throwaway demo config on the emulators (Auth 9099, Firestore 8080, Functions 5001). `registerUser()` performs a deliberate two-step write (the user doc first, then a batch that creates the default portfolio and an `increment` counter) because the counter rule needs the parent doc to already exist. Sensitive operations re-authenticate first. App Check is initialized client-side when the reCAPTCHA site key is set; callable App Check enforcement is configured platform-side.

Self-service GDPR callables live in `src/api/account.js`, each acting only on `context.auth.uid` (no IDOR): `deleteMyAccount` (a 30-day soft delete — the Auth account stays enabled so the user can sign back in to restore), `restoreMyAccount`, `signOutEverywhere`, and `exportMyData`.

## Admin app and the claim boundary

`/admin` is a separate Vite app (`admin.html` to `admin-main.jsx`) whose code never ships in the user bundle. The URL is not the security boundary — the `{admin:true}` custom claim is. `admin-main.jsx` force-refreshes the ID token and only proceeds when `claims.admin === true`.

The claim carries a role: **owner** (`{admin:true, role:"owner"}`, mintable only out-of-band by `functions/scripts/set-admin.js`) or **manager** (`{admin:true, role:"manager"}`, granted by an owner from the panel). `admin:true` alone is the entry ticket; the role decides what each callable will do. Exactly two admin types exist — a legacy claim with no or unknown role keeps only the shared read surface and is refused every write.

The dashboard is presentation-only; all logic lives in `useAdminDashboard.js` calling thin wrappers in `src/api/admin.js`. The panel has **five tabs**:

- **Overview** — `getStats`, plus the growth, billing/webhook, and system-status cards.
- **Users** — `listUsers`/`lookupUser`/`setUserTier`/`setPremiumLimits`/`suspendUser`/`restoreUser`/`adminTrashUser`/`adminSignOutUser`/`deleteUser`. This tab has no grant-admin control.
- **Trash** — `restoreUser` and permanent purge of expired trash.
- **Settings** — the `config/app` editor (`getAdminConfig`/`saveConfig`), and the owner-only **Admin access** drill-in that reads the admin roster via `listAdmins` and grants/revokes a manager via `setManagerRole`.
- **Audit** — `listAudit`.

### Guard-first callables

Every callable re-verifies the claim server-side through one of the gates in `functions/guards.js`, which are pure functions that read the already-decoded `context.auth.token` and return a decision object the caller maps to an `HttpsError`:

- `assertAdmin` (any admin, read-only): `getStats`, `lookupUser`, `listUsers`, `listAudit`, `listWebhookEvents`, `listDailyStats`, `getSystemStatus`, `findDuplicateEmails`.
- `assertManager` (manager or owner, day-to-day writes): `setUserTier`, `setPremiumLimits`, `suspendUser`, `restoreUser`, `adminTrashUser`, `adminSignOutUser`, `saveUserNote`.
- `assertOwner` (owner only): `deleteUser`, `viewUserAsAdmin`, `listAdmins`, `captureStatsSnapshot`.
- `assertFreshOwner` (owner plus a password re-auth within ~600s, toggled by the server flag `config/app.flags.stepUpReauth`): `setManagerRole`.

The admin gate helpers are `async` because `requireMfa` (behind `config/app.flags.requireAdminMfa`, default off) reads the token — every call site must `await`, and a unit test fails the build on any un-awaited gate.

Because `requireManager` demands an explicit `manager` or `owner` role, a role-less legacy admin can read the panel but cannot mutate anything. `roleOf` collapses anything that is not exactly `"owner"` or `"manager"` to `""`, so the model fails closed.

### Owner protection and admin exclusion

Owner protection is by identity: an owner can never be deleted, trashed, demoted, or self-deleted, and a manager may not act on an owner at all (suspend, sign-out, tier, limits, trash, and delete all refuse). `MIN_ADMINS=2` remains a secondary floor. Server-side, `assertTargetNotAdmin` refuses suspend/tier/limits on any admin target (owner or manager), mirroring the already-refused trash/delete — enforced in code, not only hidden in the UI. `set-admin.js` hard-caps owners at two via the pure `functions/owner-cap.js` (overridable with `--force`).

Admins are excluded from the Users section: `listUsers` and `findDuplicateEmails` skip any account whose claim has `admin === true` (keyed off the claim, not the role, so a no-role admin cannot leak back), and `gatherStats`/`getStats` and `countSignupsSince` exclude admins too, so Overview totals, tier counts, `signups24h`, and the daily `statsDaily` snapshot all exclude them. `totalCoins` stays unfiltered (a collection-group count, not a user-count surface). Admins surface only in the owner-only Admin-access roster.

`firestore.rules` mirrors the write boundary with `isAdminOwner()`: the blanket `users` update/delete allowances are owner-only, while reads stay open to any admin. Suspend/delete block self-target, and `writeAudit()` logs admin actions to a server-only `audit` collection.

## Settings, `config/app`, and its consumers

The locked `config/app` doc is written only by `saveConfig` (owner-gated, behind step-up re-auth or the dedicated Settings-password unlock). Rules deny all client read/write to `/config`. Reads split three ways:

- Admin pre-fill via `getAdminConfig` — secrets are returned as boolean set-flags only; raw secrets never leave the server.
- Server consumers via `getConfig()` — a 5-minute cache, invalidated on save.
- The public `/api/config` endpoint — non-secret values only, CDN-cached ~60s.

The `keep()` idiom preserves a stored secret when its Settings field is re-saved blank, so a secret is never wiped by an ordinary save.

| Field | Set where | Read by | Secret |
|---|---|---|---|
| `coingecko` key | Settings | CoinGecko request headers | yes |
| `paypal.clientId/secret/webhookId` | Settings | PayPal token + webhook verify | yes |
| `paypal` plan IDs + `APP_URL` | `functions/.env` only | `createSubscription` | env |
| `email.apiKey/provider/apiUrl/listId` | Settings | `/api/subscribe` (the email provider) | apiKey |
| `email.smtpPass` | Settings | transactional mail via an SMTP server | yes |
| `plans.{tier}.{price,priceYear,portfolios,coins,transactions}` | Settings | `firestore.rules` `get()`, `getStats`, `/api/config` | no |
| `plans.{tier}.aiMonthlyCents` | Settings | `/api/config` to the Account display | no |
| `ai.anthropicKey` | Settings | the AI-research proxy | yes |
| `ai.monthlyCapCents` | Settings | the app-wide monthly AI-spend cap | no |
| `flags.maintenance` | Settings toggle | `/api/config` maintenance screen | no |
| `flags.signupsEnabled` | Settings toggle | `/api/config` (hides Register) + `beforeCreateUser` | no |
| `flags.paidPlansEnabled` | Plans & Pricing toggle | `/api/config` + fresh read in `createSubscription` | no |
| `flags.features.*` | Settings toggles | server enforcement + `/api/config` | no |
| `analytics.{ga4,plausible}` | Settings | `/api/config` to `site-meta.js` | no |
| `legal.{termlyUuid,privacyId,termsId,cookieBanner}` | Settings | `/api/config` to site-meta + privacy/terms pages | no |

## Launch and operational controls

### Signups gate

Signups-off is enforced server-side. `exports.beforeCreateUser` (a `functions.auth.user().beforeCreate` blocking function, requiring Identity Platform) refuses account creation when signups are paused. Its verdict is pure and unit-tested in `functions/signup-gate.js`, reads `config/app` fresh rather than through the 5-minute cache, and fails open — an unreadable config allows the signup so a Firestore blip can never silently kill the funnel. The client `/api/config` read that hides the Register tab is a UX layer on top of this hard gate. The Admin SDK is not subject to the blocking function, so seeding and admin-created accounts are unaffected.

### Launch-free master switch

`flags.paidPlansEnabled` is an admin Plans & Pricing switch. When off, the whole site runs in free-launch mode: Starter-only, no plan chooser, and no new subscriptions — `createSubscription` refuses server-side, read fresh and placed before the finer `checkout` kill-switch so the master switch takes precedence. It rides the same `saveConfig` path as every other flag and is captured by the existing `saveConfig` audit diff, so it adds no new audit action. Contract and rationale live in [Billing](./BILLING.md).

### Per-feature kill-switches

`functions/features.js` declares three kill-switches under `config/app.flags.features`: `marketData` (CoinGecko prices/search/list/history), `checkout` (new subscription checkout), and `aiResearch` (hides the Research → Ask chat now and gates the AI proxy). The declared map is the single source of truth — the admin UI, `/api/config`, and the sanitizer all enumerate from it, so a switch can never be half-wired. A switch is on unless config says exactly `false`, so a missing or unreadable config degrades to a working app. Merge semantics keep a switch the payload does not mention at its stored value, so flipping maintenance during an incident cannot silently re-enable a feature that was just killed.

### Audit and heartbeats

`writeAudit()` appends every admin action and every sensitive self-service/billing event to a server-only `audit` collection (client access denied by rules; written only by the Admin SDK), retained 365 days and swept by a daily purge. Every scheduled job runs through `runJob()`, which stamps `health/jobs` and rethrows so a failed invocation is marked failed. Sentry is functions-only, behind a DSN in Settings, and scrubs uid/email/headers/URL/body from events.

## AI-research proxy (foundation built, client-inert)

The server foundation for AI research exists and is wired, but nothing calls it yet — the client `ai-client.js` seam still throws, so Pulse and Ask render their deterministic summaries and the go-live seam (`AI_PROXY_LIVE`) is `false`.

`exports.researchAsk` is a signed-in-user `onCall` that acts on `context.auth.uid` only (no IDOR). It runs a fail-closed gate order before any call to the AI provider or any spend: auth, question validation (a non-blank string ≤500 chars plus deny-by-default input keys), the `aiResearch` kill-switch on a fresh config read, an AI-provider key present, a per-uid daily budget (via `guards.js`), and the app-wide monthly $-cap. It then derives the server-authoritative safety allowlist from the caller's own coin docs (name and symbol, de-duped, capped at 40) via `functions/ai-context.js`, generates an answer with a generation model, judges it with a separate judge model, meters the real per-model token cost into the server-only `aiBudget/{YYYY-MM}` ledger, and returns `{ answer, fellBack }` — never violating text.

Safety is enforced in code, not by the prompt. `functions/ai-proxy.js` orchestrates a generate → regex prefilter (`functions/validate-output.js`, which blocks names, price targets, advice, allocation, and aggregate scores) → judge loop with an N=2 regeneration cap, and falls closed to an empty answer with `fellBack:true` rather than returning any candidate that fails. The monthly cap is `config/app.ai.monthlyCapCents` (default 5000 = $50/month, not a secret). The AI-spend ledger `aiBudget/{YYYY-MM}` is server-only in `firestore.rules`.

The go-live increment swaps the `ai-client.js` body for a call to `researchAsk` and flips `AI_PROXY_LIVE` in the same change — a live provider round-trip is only proven with a real key at go-live. The client must never call the AI provider directly.

## Keys and secrets

The only values that reach `dist/` are the public `VITE_FIREBASE_*` config and the public reCAPTCHA site key. Every real secret resolves `config/app` first, then `process.env`. The first owner is bootstrapped out-of-band via `functions/scripts/set-admin.js` (`--role=owner|manager`, plus `--revoke`/`--show`/`--force`) with a service-account JSON that must stay out of git — that script is the only way an owner claim is ever set. Keep at least two owners so there is no single point of failure.
