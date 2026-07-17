<!--
  API-SECURITY.md — canonical record of the API surface, how every client connects
  to it, how API keys/secrets are protected, and the security-review findings + fixes.
  Companion machine-readable contract: openapi.json (repo root).
  Created 2026-07-08 from a founder interview (see "Interview decisions" below).
-->

# API & Key Security

The single source of truth for **what the API is, how it's wired, and how the keys stay safe.**
The machine-readable contract is [`openapi.json`](openapi.json) (OpenAPI 3.0.3, 32 operations).

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

Everything is a Firebase Cloud Function in [`functions/index.js`](functions/index.js) (v1, Node 22, CommonJS). There are **three shapes**:

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
Same as B **plus** a verified `{admin:true}` custom claim check at the top of every function.

`getStats` · `listUsers` · `lookupUser` · `setUserTier` · `setPremiumLimits` · `suspendUser` · `deleteUser` · `restoreUser` · `adminTrashUser` · `adminSignOutUser` · `setAdminClaim` · `listAudit` · `getAdminConfig` · `saveConfig`.

### D. PayPal webhook — `paypalWebhook` (`onRequest`)
The only **unauthenticated inbound write**. Every event is cryptographically verified against PayPal's verify-webhook-signature API **before any DB write**, and processed **once** (idempotency ledger keyed by event id).

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
 Admin app (admin.html)─►│  onCall (admin) ──► verify {admin:true} claim ──► any user / config  │
   SEPARATE named app    │                                                                      │
                         │  config/app  ◄── saveConfig (Admin SDK only; rules deny all clients) │
 PayPal ────────────────►│  /paypalWebhook ──► verify signature ──► users/{uid}.tier/subscription│
                         └──────────────────────────────────────────────────────────────────────┘
```

- **Landing** never authenticates — it only reads cached public data and posts to `/api/subscribe`.
- **User app** uses the Firebase JS SDK; the SDK attaches the ID token to every callable. Reads/writes to `users/{uid}/…` are gated by [`firestore.rules`](firestore.rules) (owner-only, closed-shape doc, counter-based tier caps).
- **Admin app** is a **separate Firebase app instance** (`initializeApp(config, "admin")`) so its login can't collide with a user session (ERRORS §A5 fix). Authorization is the **server-side claim check in every admin function** — a different URL is *not* the boundary.
- **PayPal** posts to the webhook; `custom_id`/`plan_id` are only trusted *after* signature verification.

---

## 3. How API keys are protected

**The rule:** every secret lives server-side only. The browser bundle ships **only** the public `VITE_FIREBASE_*` web config (a Firebase web key is not a secret — the rules are the security).

### Where secrets live
1. **Primary:** the locked `config/app` Firestore doc, written by `saveConfig` (Admin SDK). [`firestore.rules`](firestore.rules) denies **all** client read/write to `/config/**`. Holds: CoinGecko key, PayPal client/secret/webhook, email-provider key, Anthropic key (reserved for Wave B).
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
Callable access control (all 30 exports: auth-before-side-effect, admin claim checks, `context.auth.uid` not body uid, `MIN_ADMINS`), the PayPal signature/idempotency core, the client bundle (no secret ships), CSP/headers (frame-ancestors none, no `unsafe-inline` scripts), and input validation on the `/api` surface (length caps, `encodeURIComponent`, regex-sanitised doc paths).

---

## 5. Go-live items (known, deferred — not gaps)

These are **intended** deferrals to the go-live/Blaze phase, documented so they're not mistaken for oversights:

- **App Check enforcement** — the gate exists (`guards.appCheckOk`, enforced by a config flag); flip it on + set `VITE_RECAPTCHA_SITE_KEY` at go-live.
- **Live PayPal** — signature verification + idempotency are built; the live client/secret/webhook + a real e2e run happen at go-live.
- **CoinGecko paid key** — the proxy works on the free tier (degrades gracefully); a Demo/paid key is needed for the full 5-min refresh at scale.
- **Admin 2FA** — needs Identity Platform MFA (Blaze).
- **Distributed rate limiting** — the current per-IP limiter is in-memory per instance (see §4 for the confirmed implications and the chosen mitigation).

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
