<!--
  API-SECURITY.md — canonical record of the API surface, how every client connects
  to it, how API keys/secrets are protected, and the security-review findings + fixes.
  Companion machine-readable contract: openapi.json (repo root).
  Created 2026-07-08 from a founder interview (see "Interview decisions" below).
-->

# API & Key Security

The single source of truth for **what the API is, how it's wired, and how the keys stay safe.**
The machine-readable contract is [`openapi.json`](../../openapi.json) (OpenAPI 3.0.3, 36 operations).

---

## 0. Interview decisions (2026-07-08)

Locked in a founder interview before this work:

| Area | Decision |
|---|---|
| **Spec source** | Codebase only (no Postman/Insomnia collection) — the code is the source of truth. |
| **Spec scope** | ALL four surfaces: public REST, user+billing callables, admin callables, PayPal webhook. |
| **Servers** | Emulator base + a `YOUR_PROJECT` production placeholder (fill at go-live). |
| **Gap-hunt method** | Deep local multi-agent adversarial review (nothing leaves the machine; no new accounts). 42Crunch can be layered on later against `openapi.json`. |
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
| POST | `/api/subscribe` | Landing email capture → email provider | none (honeypot + tight per-IP budget) |

### B. Callable functions (`onCall`) — user + billing
The Firebase SDK sends `{data}` + the caller's ID token; the function verifies the token server-side and acts on `context.auth.uid` — **never a uid from the body** (no IDOR by design).

`createSubscription` · `cancelSubscription` · `reactivateSubscription` · `resolveRecheckout` · `deleteMyAccount` · `restoreMyAccount` · `signOutEverywhere` · `exportMyData` · `reconcileMyCounters` · `devSetMyTier` *(emulator-only, hard-gated)*.

### C. Callable functions (`onCall`) — admin only
Same as B **plus** a verified admin custom claim, in **two roles**: `owner` (`{admin:true, role:"owner"}`, minted only by `functions/scripts/set-admin.js --role=owner`) and `manager` (`{admin:true, role:"manager"}`, granted by an owner from the admin app's owner-only **Admin access** tab). Every function goes through one shared gate in [`functions/index.js`](../../functions/index.js) — `assertAdmin` / `assertManager` / `assertOwner` / `assertFreshOwner` (owner **plus** a password re-auth within ~600s, server-flagged by `config/app.flags.stepUpReauth`, default on) — never a copy-pasted inline check.

| Gate | Callables |
|---|---|
| `assertAdmin` (read-only) | `getStats` · `lookupUser` · `listUsers` · `listAudit` · `listWebhookEvents` (ADMIN-1: PayPal webhook ledger) · `listDailyStats` (ADMIN-4: growth series) · `getSystemStatus` (ADMIN-2: kill-switch states + cron heartbeats — no secrets; the Sentry DSN is reported as a boolean) · `getUserNote` (ADMIN-5: read a user's private note) |
| `assertManager` | `setUserTier` · `setPremiumLimits` · `suspendUser` · `restoreUser` · `adminTrashUser` · `adminSignOutUser` · `saveUserNote` (ADMIN-5: write a user's private note; content never audited) |
| `assertOwner` | `deleteUser` · `captureStatsSnapshot` (ADMIN-4 — writes an aggregate snapshot, not config, so no step-up) · **`viewUserAsAdmin`** (ADMIN-5: READ-ONLY "view as" — reads a user's private data incl. journal theses; a reason is REQUIRED + audited; **never mints a token / never acts as the user**, so no purchase/mutation/lockout surface — the highest gate because it reads the most-private content) |
| `assertFreshOwner` | `getAdminConfig` · `saveConfig` · `setManagerRole` |

**Owner protection is by identity:** an owner can never be deleted, trashed, demoted or self-deleted, and a **manager may not act on an owner at all** (suspend / sign-out / tier / limits / trash / delete all refuse). `MIN_ADMINS` remains only as a secondary floor. `setAdminClaim` is **removed** — the old export now always throws `permission-denied`; use `setManagerRole({email, grant})`.

#### Growth snapshots (ADMIN-4, 2026-07-24)
`statsDaily/{YYYY-MM-DD}` is **server-only in `firestore.rules`** — no client read, no client write, *including* an admin claim (the panel goes through `listDailyStats`). It holds aggregate counts and revenue only: **no uid, no email, nothing personal**, which is what makes it safe to retain **indefinitely** with no erasure path (contrast audit at 365 days). The deny is not about confidentiality — it is **integrity**: the series is presented as the record of what actually happened and is kept forever, so a client-writable snapshot could be used to fake growth or erase a bad month, permanently.

Same round closed a related integrity gap in the **`users` create rule**: `joined` (the signup date rendered in the admin Users list and the users CSV export) was in the closed-shape allowlist but its **value was never validated** — `validUserData` checks only `name` — and the field is immutable after create. A registering client therefore had exactly one chance to claim **any** signup date, permanently. The rule now pins `joined == request.time` when the field is present. Growth metrics still count signups from the **Auth record's `creationTime`** rather than from `joined`: one server-set, un-forgeable source beats two.

#### Feature kill-switches & cron heartbeats (ADMIN-2, 2026-07-24)
`config/app → flags.features` carries three switches (`marketData`, `checkout`, `aiResearch`), published non-secret on `/api/config` so the UI can be honest, and **enforced server-side** — hiding a control is never the boundary. Two design rules carry the security weight:

- **Default-ON.** A switch is enabled unless config says *exactly* `false`. A missing key, a config doc that predates the feature, or a failed Firestore read must degrade to a working product, never to a self-inflicted outage. The same `!== false` idiom already used for `signupsEnabled`.
- **One choke point.** Every CoinGecko call routes through `cgFetch()`, so `marketData` is enforced in a single place a new call site cannot miss — a unit test fails the build if a direct `` fetch(`${CG_BASE}…`) `` reappears. Off means **zero upstream calls**: the caches keep serving, so the switch is safe enough to actually use mid-incident. `getUniverse`/`getTrending` skip their lazy refresh too, because `refreshUniverse` treats a failed first page as *partial* and would still stamp `updatedAt: now` — marking the cache fresh while having fetched nothing.

A `saveConfig` payload that omits `features` **keeps** the stored switches (`mergeFeatures`, per-key). Without that, the instant maintenance/signups toggles — which post `flags` with no `features` — would read every absent switch as ON and silently restart the spend an operator had just killed.

`health/jobs` (the six cron heartbeats) is **server-only in `firestore.rules`**, and like `statsDaily` the reason is **integrity, not confidentiality**: the status strip exists to reveal a scheduler that silently stopped firing, so a client that could stamp a heartbeat could keep a dead cron looking alive forever — turning the one control that catches silent failure into the thing that hides it.

**Sentry** (functions-only) reports to a DSN stored in `config/app.sentry.dsn` — never in the bundle, never in git, `keep()`-guarded like every other secret. Events carry the **minimum**: `scrubEvent` strips the user, breadcrumbs, request URL, headers, cookies and body before anything leaves the process, leaving the error plus a coarse `where` tag. With no DSN configured the module is a complete no-op and never even `require()`s the SDK. ⚠️ **Delivery is unverified** — there is no Sentry account or deployed project yet; what is proven locally is the no-op path, the DSN validation, and the scrubbing. Sending error data to a third party is a data-handling decision that must be **disclosed in the privacy policy before a DSN is set** (go-live).

#### Audit-entry contents (ADMIN-3, 2026-07-24)
Two fields were added to what `writeAudit` records, both with a security edge worth stating:

- **`ip` — the source IP, on EVERY audited event** (admin actions *and* the self-service/billing ones). It is derived by `net-utils.auditIp()`, which reuses the rate limiter's **right-anchored X-Forwarded-For** rule rather than the attacker-controlled left-most token. Where no origin is available the field is `""`, never a placeholder. *(Verified 2026-07-24: the functions emulator supplies a synthetic request with headers only — no `ip`, no `socket`, no XFF — so local entries carry an empty `ip` by design. The value populates in a deployed environment.)*
  - ⚠️ **Not yet evidence-grade — one open trust-boundary question.** `RL_TRUSTED_HOPS` (default 2) says how many entries the platform appends on the right, and that count is **per ingress path**. `/api/*` arrives via Firebase Hosting → Cloud Functions, but a **callable is invoked directly on `cloudfunctions.net`** — a potentially shorter chain. If the callable chain is shorter than the configured hop count, the token selected is the caller-supplied one, i.e. **forgeable**. This cannot be settled locally (the emulator sends no XFF at all). **Go-live action: read a real `X-Forwarded-For` from a prod log for BOTH paths and set `RL_TRUSTED_HOPS` accordingly — and if the two differ, split the constant.** Until then, treat a recorded IP as **advisory corroboration, not evidence**. Note this is *not* an authorization fail-open: nothing is authorized on the IP, so the blast radius is what the log attributes, plus rate-limit bucketing.
  - **Privacy:** an IP is personal data, and audit rows outlive the account they describe. The controls on it are (a) the collection is **server-only** in `firestore.rules` — no client can read it, the callable reads via the Admin SDK; (b) the **365-day** `purgeOldAudit` retention sweep; (c) admin-only export. If erasure scope is ever re-examined, the audit log is the store that holds email + IP after a user is deleted — see the erasure note in `secure-by-design`.
  - Same round fixed `isValidIp`, which **rejected IPv4-mapped IPv6** (`::ffff:x.x.x.x` — what a dual-stack Node/Express server reports in `req.ip`). `clientIp` then fell through to `"unknown"`, collapsing every such caller into a **single shared rate-limit bucket**. `normalizeIp` now folds the mapped form to its IPv4 so one client is one bucket regardless of which form the platform reports.
- **`details` — a field-level config diff for `saveConfig`** (`functions/config-diff.js`). The config doc holds live secrets and the audit tab is readable by *every* admin, so **no secret value may reach it**: a field guarded by the `keep()` idiom (`coingecko`, `paypal.secret`, `email.apiKey`, `ai.anthropicKey`, `sentry.dsn`) records only `(changed)`. The rule is mechanical — *keep()-guarded ⇒ secret* — and unit-tested against every entry in `SECRET_PATHS`, **plus a count check that a newly keep()-guarded field was actually registered** (the list is hand-maintained, so nothing else stopped it silently drifting). The string is bounded to `DETAILS_MAX` (500), which **must** equal `AuditEntry.details.maxLength` in `openapi.json`.

**Both CSV exports** (Audit, Users) are built client-side from rows the admin can already see — no new server surface — but they carry emails and source IPs out of the platform's retention and erasure controls, which the UI states next to the buttons.

### D. PayPal webhook — `paypalWebhook` (`onRequest`)
The only inbound write **not gated by a Firebase user login** — it is authenticated instead by **PayPal's webhook signature** (documented in `openapi.json` as the `PayPalWebhookSignature` scheme). Every event is cryptographically verified against PayPal's verify-webhook-signature API **before any DB write**, and processed **once** (idempotency ledger keyed by event id).

### Plus: scheduled jobs (no HTTP surface)
`refreshPrices` (5 min) · `refreshUniverseDaily` (24h) · `purgeOldAudit` (24h) · `purgeExpiredTrash` (24h) · `enforceSubscriptionPeriods` (24h).

---

## 2. How each client connects (the wiring)

```
                         ┌───────────────────────── Firebase project ─────────────────────────┐
 Landing (index.html) ──►│  /api/*  (api fn) ──► cache/universe, cache/trending, historyCache  │
   client-side search    │      │                        ▲ shared, flat-cost                    │
                         │      └──► email provider (key server-side)                           │
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
1. **Primary:** the locked `config/app` Firestore doc, written by `saveConfig` (Admin SDK). [`firestore.rules`](../../firestore.rules) denies **all** client read/write to `/config/**`. Holds: CoinGecko key, PayPal client/secret/webhook, email-provider key, Anthropic key (reserved for Wave B).
2. **Fallback / deploy-time:** `functions/.env` (git-ignored). Only source for the PayPal plan IDs + `APP_URL`.

### The set-flag / keep() idiom (never echo a secret)
- **`getAdminConfig`** returns secrets as **booleans only** — `secretSet`, `apiKeySet`, `anthropicKeySet`, `coingeckoSet`. The value never leaves the server.
- **`saveConfig`** uses `keep(incoming, current)`: a **blank** field preserves the saved value, so re-saving the Settings form (which never shows secrets back) can't wipe them, and the browser never has to hold the secret to keep it.
- **`/api/config`** (the public endpoint) is a *separate* projection that contains **no secret** — only flags, plan prices, analytics/legal IDs.

### Verified this session (scans)
- **Client bundle:** built `dist/` scanned — **zero server-secret values ship.** The only `paypalSecret`/`anthropicKey` strings in the admin bundle are empty React form-state initializers + boolean set-flag reads; the only Firebase config is the public web config; `access_token`/`RECAPTCHA` are Firebase SDK identifiers.
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
- **`/api/subscribe` email-provider abuse** — can't occur: the handler 503s unless a provider + key are configured (not yet).
- **`tierBeforeFailure` resurrection** — the recovery path runs only inside a **signature-verified** `PAYMENT.SALE.COMPLETED`; no forgeable escalation.
- **No key-rotation runbook** — accurate but not a vulnerability; **addressed anyway** in §6 (the interview asked for a key-lifecycle plan).
- **Full-collection scans in scheduled sweeps** — fine at current scale; a documented go-live scaling item, not a live gap.

### Also verified clean
Callable access control (all 30 exports: auth-before-side-effect, the shared role gates `assertAdmin`/`assertManager`/`assertOwner`/`assertFreshOwner`, `context.auth.uid` not body uid, owner-identity protection with `MIN_ADMINS` as a secondary floor), the PayPal signature/idempotency core, the client bundle (no secret ships), CSP/headers (frame-ancestors none, no `unsafe-inline` scripts), and input validation on the `/api` surface (length caps, `encodeURIComponent`, regex-sanitised doc paths).

### 42Crunch static audit (2026-07-18)
Ran the 42Crunch `42c-ast` static audit on [`openapi.json`](../../openapi.json) and hardened the contract with **server-grounded, honest** constraints (a 4-agent analysis workflow read `functions/index.js` + `firestore.rules`; a 3-agent adversarial honesty pass returned **0 issues**). **Score 9.24 → 65.06/100** (Security 24.61/30, Data 40.45/70): dropped the `http://localhost` server entry (killed the CRITICAL cleartext-bearer transport finding), documented the webhook's signature as a `PayPalWebhookSignature` `apiKey` scheme (§D), and added honest `default`/`429`/`401` responses, `maxLength`/`minimum`/`maximum`/`maxItems`, `pattern` **only** where every real value provably matches, and `additionalProperties:false` on all fixed schemas + request wrappers. **70 is not honestly reachable** — the wall is ~55 `pattern` findings on genuinely free-form / provider-controlled strings (a pattern there could reject a real value). The 7 public `security:[]` endpoints are accepted by design. Full log + the request-enforcement follow-up: `NEXT-STEPS.md` §API.

**Live authz probes against the running emulator (2026-07-18)** — the `42c-ast` scan-config engine is a poor fit for this callable API (its happy-path model would delete User1 / hit PayPal / 403 on admin ops), so the live surface was verified with direct probes covering the same questions: **BFLA — a non-admin token is denied on all 14 admin callables (0/14 breaches, every one `403`); AuthN — unauthenticated calls are denied everywhere (`401`, or `403` on the admin combined-check ops); IDOR/BOLA — a self-service callable with a foreign `uid` in the body returns the *caller's* own data (acts on `context.auth.uid`, body id ignored); required-field validation and the callable envelope are enforced (`400`).** No vulnerabilities. One informational item (already logged): the app ignores unknown fields *inside* `data` — the payload-level strict-input follow-up in §5. A full automated conformance scan is best run later against a deployed HTTPS URL.

---

## 5. Go-live items (known, deferred — not gaps)

These are **intended** deferrals to the go-live/Blaze phase, documented so they're not mistaken for oversights:

- **App Check enforcement** — **console-only, no code.** `guards.appCheckOk` exists and is unit-tested but has **zero call sites, deliberately**: for v1 callables Firebase enforces App Check platform-side *before* the handler runs, so wiring the helper duplicates a platform control and adds a second way to lock everyone out. Set `VITE_RECAPTCHA_SITE_KEY` → build → deploy → watch "unverified" fall to ~0 → *then* enable enforcement (GO-LIVE-AUDIT H1; re-confirmed by the founder 2026-07-24 during ADMIN-0). Reversing that order locks out 100% of users.
- **Live PayPal** — signature verification + idempotency are built; the live client/secret/webhook + a real e2e run happen at go-live.
- **CoinGecko paid key** — the proxy works on the free tier (degrades gracefully); a Demo/paid key is needed for the full 5-min refresh at scale.
- **Admin 2FA** — needs Identity Platform MFA (Blaze) for **enrolment**. The **enforcement gate is built** (ADMIN-0, 2026-07-24): `guards.requireMfa` reads `firebase.sign_in_second_factor` off the verified token and runs inside the shared `assertRole`, so it covers **every** admin callable rather than being repeated per-endpoint. Flag `config/app.flags.requireAdminMfa`, **default OFF** — the opposite default from `stepUpReauth`, because until Identity Platform is on *nobody* can satisfy it and an on-by-default gate would wall the panel off the moment it deployed. Verified live: with the flag on, an owner who signed in with a password only is refused `mfa-required` on every admin callable.
- **Auth `beforeCreate` blocking function** — **built** and enforced (`exports.beforeCreateUser`), but **deploying it requires Identity Platform**, the same prerequisite as MFA. Enable Identity Platform before the first functions deploy or the deploy fails.
- **Distributed rate limiting** — the current per-IP limiter is in-memory per instance (see §4 for the confirmed implications and the chosen mitigation).
- **Strict request-body input validation** — `openapi.json` now declares request bodies `additionalProperties:false`, but the callables currently **ignore** unknown fields. Harden them to reject unknown request keys (deny-by-default input) so the documented contract is actually enforced; a live `42crunch-scan` will flag the gap until then. (Added 2026-07-18 with the 42Crunch audit hardening.)

---

## 6. Key rotation & incident runbook

The interview flagged "key lifecycle & incident plan" as in-scope. The review found no leak (the bundle and full git history are clean — §3), so this is the standing procedure, not incident response to an actual exposure.

### The secrets, where they live, how to rotate

| Secret | Lives in | Rotate by |
|---|---|---|
| **CoinGecko** Demo/paid key | `config/app.coingecko` (Admin → Settings) or `COINGECKO_DEMO_KEY` env | Issue a new key in the CoinGecko dashboard, paste it into Admin → Settings (the old one stops being used on the next `getConfig` refresh, ≤5 min), then revoke the old key. |
| **PayPal** client id / secret / webhook id | `config/app.paypal` (Admin → Settings) or env | Rotate the secret in the PayPal Developer dashboard, update Admin → Settings, then invalidate the old credential. Re-verify a test webhook. |
| **Email provider** key (ActiveCampaign / GetResponse) | `config/app.email.apiKey` | Reissue in the provider, update Admin → Settings, revoke the old. |
| **Anthropic** key (Wave B) | `config/app.ai.anthropicKey` | Reissue in the Anthropic console, update Admin → Settings, revoke the old. |
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
