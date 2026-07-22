# Crypto Idea

Crypto portfolio tracker + DCA calculator PWA. **Vite + React 18 + Firebase.** Full-stack:
a static marketing landing, a React user app, a separate admin app, and Cloud Functions.

## Project structure

```
crypto-idea/
├── index.html / app.html / admin.html / privacy.html / terms.html   ← multi-page Vite entries
├── src/                          ← frontend (layered — see src/ARCHITECTURE.md)
│   ├── CryptoIdea.jsx            ← user-app shell: effects + handlers + ctx + router (all screens extracted)
│   ├── main.jsx / admin-main.jsx ← React entries
│   ├── api/                      ← data fetching (firebase auth/db/config, coingecko, config, account)
│   ├── hooks/                    ← state + logic (useAuthSession, usePortfolios, useCoinSearch, useLivePrices, app-context)
│   ├── components/               ← UI: every user screen (Login/Portfolio/Account/Detail/Journal/Learn/…) + shared ui.jsx/StatusDot
│   ├── features/research/        ← Research tab feature module (Overview/Coins/Ask; own components/hooks/utils/styles)
│   ├── styles/app.css            ← app design system (editorial/paper, scoped under .ci-app)
│   └── utils/                    ← pure helpers (format, coins+DCA model, theme tokens, storage)
├── functions/index.js           ← Cloud Functions (CoinGecko proxy, PayPal, admin/GDPR callables)
├── firestore.rules              ← security rules
├── tests/                       ← rules + data-layer (node:test) and unit/ (Vitest)
├── ARCHITECTURE.md (src/)       ← the layer rules + migration status
└── docs/product/NEXT-STEPS.md  ← what's left to do (refactor, known bug, go-live)
```

> **Frontend architecture is layered** (`api` / `hooks` / `components` / `utils`). The
> historically-monolithic `CryptoIdea.jsx` (~1,560 lines) has been peeled into per-screen
> components + hooks; it now holds only the auth/data effects, mutation handlers, shared context,
> and the router shell. The rules, current state, and remaining layer violations live in
> [`src/ARCHITECTURE.md`](src/ARCHITECTURE.md); the to-do list lives in [`NEXT-STEPS.md`](docs/product/NEXT-STEPS.md).

## Tests

```bash
npm run test:unit         # Vitest: component/hook tests in jsdom (api/ mocked) — fast, no emulator
npm run test:rules        # Firestore security-rules tests (runs against the emulator)
npm run test:rules:solo   # same tests on an isolated firestore emulator (:8099, firebase.solo.json)
npm run test:integration  # data-layer + live-callable tests: real auth+db+functions code vs the emulator
npm run test:integration:solo  # same tests on the isolated emulator (auth :9098, firestore :8099, functions :5002)
```

Bugs are tracked in Jira (project **CRYP**) and fixed failing-test-first — see
[`JIRA-WORKFLOW.md`](docs/testing/JIRA-WORKFLOW.md) for the loop, the `it("CRYP-42: …")` traceability
marker, and the `/jira-bug` · `/jira-fix` · `/jira-test-sync` · `/jira-bug-hunt` commands.

## Setup Guide (15 minutes)

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" → Name it "crypto-idea"
3. Disable Google Analytics (not needed)
4. Wait for project creation

### Step 2: Enable Authentication

1. In Firebase Console → Build → Authentication
2. Click "Get started"
3. Enable "Email/Password" provider
4. (Optional) Enable Google sign-in for social login

### Step 3: Enable Firestore Database

1. Build → Firestore Database → "Create database"
2. Select "Start in production mode" (never "test mode" — that is allow-all rules for 30 days)
3. Location: **`nam5` (US multi-region)** — decided 2026-07-22 and **permanent**; it matches the
   default `us-central1` functions region. See [GO-LIVE-AUDIT.md](docs/product/GO-LIVE-AUDIT.md)
   §5 Phase 1 before creating a real project — the ordering there is load-bearing.
4. Once created, go to Rules tab
5. Copy contents of `firestore.rules` and paste there
6. Click "Publish"

### Step 4: Get Your Config

1. Project Settings (gear icon) → General
2. Scroll to "Your apps" → Click web icon (</>) 
3. Register app name: "crypto-idea-web"
4. Copy the firebaseConfig object
5. Copy `.env.example` to `.env` and fill in each `VITE_FIREBASE_*` value from the `firebaseConfig` object (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID). These are read at build time by `src/api/firebase.config.js` — you don't paste the config into a source file. (The Firebase web config is public by design; it ships in the client bundle and is not a secret.)

### Step 5: Install Dependencies

```bash
npm install firebase
```

### Step 6: Run the App

The app is already fully wired to Firebase through the `src/api/` data layer (`firebase-auth.js` for auth state, `firebase-database.js` for portfolios/coins) — there are no simulated `window.storage` calls left to replace. Start the whole stack (emulators + Vite dev server) with:

```bash
npm run start:all
```

Then open http://localhost:3000 — see **Running locally** below for details.

## Database Schema

```
users/{uid}                       ← owner-only (admins can read/manage). Owner CANNOT write tier / billing / soft-delete fields.
│   email:          string
│   name:           string (2–50)
│   tier:           "free" | "pro" | "premium"   // internal "free" = the "Starter" UI label; only an admin can change it
│   joined:         timestamp
│   lastLogin:      timestamp
│   portfolioCount: number         // maintained counter — gates the portfolio tier limit
│   settings: {                    // closed, typed map (validSettings) — every key optional
│       theme?: "light" | "dark" | "system",   currency?: string (≤8),
│       emailDigest?: bool,   emailMarketing?: bool,   consentAnalytics?: bool,
│       planChosen?: bool,         // R31-2: user made an explicit plan choice
│       updatedAt?: string (≤40)
│   }
│   consent?: {                    // signup Terms/Privacy acceptance record (validConsent)
│       termsVersion: string (≤20),    termsAcceptedAt: string (≤40),
│       privacyVersion: string (≤20),  privacyAcceptedAt: string (≤40)
│   }
│   ── server-managed, Admin-SDK only (owner writes denied by the rules) ──
│   subscription,  billingCycle,  paypalSubscriptionId,  tierBeforeFailure   // PayPal lifecycle
│   premiumLimits?: { portfolios?, coins?, transactions? }                   // admin per-user override
│   deleted?: bool,   deletedAt?                                             // 30-day soft-delete trash
│
├── learn/progress                 ← one doc — Learn gamification (validLearnProgress)
│       xp: number (0–10,000,000),   streak: number (0–100,000),
│       lastActivity: string (≤40),   completedLessons: string[] (≤500),   updatedAt: string (≤40)
│
└── portfolios/{portfolioId}       ← validPortfolioData
    │   name:       string (1–50)
    │   created:    timestamp
    │   order:      number
    │   coinCount:  number          // maintained counter — gates the coin tier limit
    │   coinOrder?: string[] (≤1000)   // R32 custom Research→Coins order (display-only)
    │
    └── coins/{coinId}             ← validCoinData
        │   symbol:   string (1–20)
        │   name:     string (1–64)
        │   thumb?:   string (≤512)
        │   addedAt:  timestamp
        │   txCount:  number        // maintained counter — gates the transaction tier limit
        │   journal?: {             // "write before you buy" thesis (validJournal)
        │       thesis: string (≤2000),   changeMyMind: string (≤2000),
        │       status: "intact" | "review" | "challenged",
        │       priceAtAdd: number (≥0),   createdAt: string (≤40),
        │       funnel?: { dilution?: string (≤2000), volume?: string (≤2000), yield?: string (≤2000) }   // manual-research findings (#27)
        │   }
        │
        └── transactions/{txId}    ← validTransactionData
                type:       "buy" | "sell"
                amount:     number (>0)
                priceAtBuy: number (≥0)
                date:       string (ISO datetime, 1–40)
                createdAt:  timestamp
```

> Field types + constraints above are validated field-by-field in [`firestore.rules`](firestore.rules) — `validSettings` / `validConsent` / `validJournal` / `validFunnel` / `validLearnProgress`. The `portfolioCount` / `coinCount` / `txCount` counters are maintained atomically (`writeBatch` + `increment`) and enforce the tier limits; `tier`, the billing fields, `premiumLimits`, and `deleted`/`deletedAt` are **server-only** — the rules block owners from writing them.

## Tier Limits

| Feature                | Starter           | Pro              | Premium             |
|------------------------|-------------------|------------------|---------------------|
| Portfolios             | 1                 | 3                | 15                  |
| Coins per portfolio    | 10                | 50               | 1,000 (hard clamp)  |
| Transactions per coin  | 50                | 2,000            | 5,000               |
| Live AI                | offline summaries | ~13 analyses/day | ~80 analyses/day    |
| Price: monthly         | $0                | $9.99            | $49.99              |
| Price: yearly          | $0                | $99.99           | $499.99             |

Limits are **server-enforced** by [`firestore.rules`](firestore.rules) (reading `config/app.plans`,
admin-editable), with the built-in defaults above as the fallback. "Unlimited" Premium coins is a
**1,000-coin hard clamp** (Decision #20) — it can only be lowered, never raised past 1,000. Live-AI
spend is bounded by a per-uid **monthly $-cost ceiling** (`aiMonthlyCents`: Pro ~$4/mo, Premium
~$25/mo), shown to users as "~N analyses/day" — see [PRICING.md](docs/decisions/PRICING.md) §4 and
[USER-BENEFITS.md](docs/product/USER-BENEFITS.md).

## Costs

Firebase free Spark plan covers:
- 10,000 auth operations/month
- 50,000 Firestore reads/day
- 20,000 Firestore writes/day
- 10 GB hosting storage

This handles roughly 10,000+ active users before you need the Blaze plan (pay-as-you-go — no fixed monthly fee; you pay only for metered usage above the free allowance).

## Payments (PayPal)

Subscriptions (Pro + Premium) are handled with **PayPal** — a signature-verified, idempotent
webhook, an already-paid guard + per-uid cooldown, and period-end downgrades (access always runs
to the end of the paid period). The code lives in `functions/index.js` (PayPal section) +
`functions/billing.js`. The full lifecycle, webhook events, secret handling, and the go-live
checklist are in **[BILLING.md](docs/decisions/BILLING.md)**. PayPal fees are 2.9% + $0.30 per charge.

---

# Cloud Functions

All backend functions live in `functions/index.js` (Node 22, deployed with `firebase deploy --only functions`). **Deploying functions requires the Blaze (pay-as-you-go) plan** — it has a generous always-free monthly allowance, but a card must be on file. The local emulator runs them for free.

| Function | Type | Purpose |
|----------|------|---------|
| `api` | HTTP | CoinGecko proxy + public config — `/api/prices`, `/api/search`, `/api/trending`, `/api/coinlist`, `/api/history` (see below), plus `/api/config` (public app flags) and `/api/subscribe` (landing email capture) |
| `refreshPrices` | Scheduled (every 5 min) | Keeps prices fresh for the **hot set** (top ~1,250, `HOT_PAGES`) in `cache/universe`; the long tail is priced on demand by `/api/prices` |
| `refreshUniverseDaily` | Scheduled (every 24 h) | Refreshes all ~3,000 (metadata + price), guarantees the full list, prunes coins that dropped off, and prunes `historyCache` docs past `HISTORY_TTL` |
| `paypalWebhook` | HTTP | Signature-verified + idempotent; updates a user's tier/subscription from PayPal events (see [BILLING.md](docs/decisions/BILLING.md)) |
| `createSubscription` / `cancelSubscription` | Callable | Start / cancel a PayPal subscription (auth-enforced; cancel keeps access to the period end) |
| `resolveRecheckout` / `reactivateSubscription` | Callable (self) | Resolve a pending Premium→Pro re-checkout / "Keep my plan" un-cancel (R29) |
| `enforceSubscriptionPeriods` | Scheduled (every 24 h) | The billing sweep — drops a cancelled sub to Starter once its period ends, and a payment-failed sub after the 7-day grace |
| `getStats` | Callable | Any admin (owner or manager): **combined** usage/revenue stats (no personal data, plus `activeOwners`) |
| `setManagerRole` | Callable | **Owner-only + step-up re-auth**: grant/revoke the `manager` role (`{admin:true, role:"manager"}`). Owners are set only by `functions/scripts/set-admin.js`; the old `setAdminClaim` export is removed and always throws `permission-denied` |
| `listUsers` / `lookupUser` | Callable | Any admin (owner or manager): full users list (Auth+profile merge, operational data only, capped 5000, each with a `role` field — `""` for plain users) / look up one user by email for support |
| `getAdminConfig` / `saveConfig` | Callable | **Owner-only + step-up re-auth**: read config to pre-fill Settings (secrets returned as set-flags) / write API keys + settings to the locked `config/app` doc |
| `listAudit` | Callable | Admin-only: recent admin-action audit log |
| `setUserTier` / `suspendUser` / `restoreUser` | Callable | Manager-or-owner: change tier / suspend / restore from trash (a manager may not act on an owner at all) |
| `deleteUser` | Callable | **Owner-only**: delete-with-erasure (blocks self-target; owners can never be deleted) |
| `setPremiumLimits` | Callable | Manager-or-owner: set a user's per-user custom limits (`premiumLimits`, clamped to the same hard ceilings) |
| `adminTrashUser` / `adminSignOutUser` | Callable | Manager-or-owner: soft-delete a user to the 30-day trash (cancels their billing; **an owner can never be trashed**) / revoke a target's refresh tokens (sign out all their devices) |
| `deleteMyAccount` / `restoreMyAccount` / `exportMyData` | Callable | Self-service GDPR/CCPA: a user soft-deletes (30-day trash), restores, or exports **their own** data |
| `signOutEverywhere` / `reconcileMyCounters` | Callable (self) | Sign out all of the caller's own devices / recompute the caller's own portfolio/coin/tx counters from actual data (daily-budgeted) |
| `purgeExpiredTrash` / `purgeOldAudit` | Scheduled (every 24 h) | Permanently erase soft-deleted accounts past the 30-day window / delete audit-log entries past retention |
| `devSetMyTier` | Callable (dev-only) | Set the caller's own tier in the **emulator only** — hard-refuses in production (`FUNCTIONS_EMULATOR` gate), so tier stays server-only live |

> The complete request/response contract for every function + `/api/*` endpoint is in [openapi.json](openapi.json) (32 operations); the full billing flow is in [BILLING.md](docs/decisions/BILLING.md).

## CoinGecko proxy (`api`)

The app never calls CoinGecko directly. It calls the same-origin `/api/*` endpoints, which Firebase Hosting rewrites to the `api` function in production (`vite.config.js` proxies them to the emulator in dev). The API key stays **server-side only**.

**The point: upstream CoinGecko calls are SHARED across all users and do NOT scale with user count.**

| Endpoint | What it does | Caching |
|----------|--------------|---------|
| `GET /api/prices?ids=a,b,c` | Live prices for held coins | Reads `cache/universe`. Hot coins (top ~1,250, refreshed every 5 min) are served from cache; a long-tail or off-list held coin whose price is stale (> `HOT_TTL`) is refetched once on demand and folded back in, so the next request — for any user — is cached. Flat cost regardless of user count. |
| `GET /api/search?q=term` | Search the ~3,000-coin universe | Reads `cache/universe` — **zero per-search upstream calls**. Only established (top-ranked) coins appear, which naturally excludes brand-new micro-caps. |
| `GET /api/trending` | Currently-trending coins (CoinGecko `/search/trending`) for the **app Search tab's empty state** | Cached in its own `cache/trending` doc (lazy 30-min refresh) + CDN. Flat cost regardless of user count; on failure the client falls back to its built-in top-coins list. |
| `GET /api/coinlist` | Full ~3,000-coin list **+ price** (for the landing DCA calculator) | Reads `cache/universe`; served from the CDN for 24 h so thousands of visitors add ~0 function calls. Price is included so the DCA tool shows a value with no per-visitor price call. |
| `GET /api/history?id=coin` | Full daily price history (DCA backtests **and** the app's buy-date price auto-fill) | Cached per-coin in `historyCache/{coin}` for 30 days — fetched **once per coin**, reused for every date range and every user. With a key, covers each coin's full range (BTC from 2013). |

### One shared dataset for everything
A single CoinGecko endpoint — `coins/markets` — returns the coin **list + prices + images + rank** together. One call covers 250 coins; `refreshUniverse()` fetches up to 12 pages (~3,000 coins) into one shared `cache/universe` doc, so prices, search, **and** the landing DCA calculator all read from it. On the free tier the universe also auto-refreshes on demand if the scheduled jobs aren't running, and rate-limited pages are skipped (last-good data kept).

### Tunables (top of the CoinGecko section in `functions/index.js`)
- `UNIVERSE_PAGES` — full universe size (default `12` = ~3,000; each page = 250 coins = 1 call; daily refresh).
- `HOT_PAGES` — hot set refreshed every 5 min (default `5` = top ~1,250). Raise to keep more coins always-fresh (costs more); lower to save calls.
- `HOT_TTL` — per-coin price freshness (default 5 min); a held coin staler than this is refetched on demand.
- `UNIVERSE_TTL` — lazy full-refresh window when no scheduler runs (default 5 min).
- `HISTORY_TTL` — per-coin history refresh (default 30 days; past data never changes).

### The API key
Set it from the **Admin dashboard → Settings** (written to the locked `config/app` doc, the primary source), or via an environment variable:
```bash
# Production: functions/.env (git-ignored; see functions/.env.example)
COINGECKO_DEMO_KEY=YOUR_DEMO_KEY
# Local emulator:
$env:COINGECKO_DEMO_KEY = "YOUR_DEMO_KEY"   # PowerShell (optional)
```
> `functions.config()` was removed in firebase-functions v7 — config now comes from the `config/app` Firestore doc (primary) or env vars (fallback).
Without a key it uses CoinGecko's public endpoint: lower rate limit, and **history limited to the last 365 days** (the app falls back to built-in estimates for older dates). A free Demo key extends the range. Get one at coingecko.com/en/api.

## Upstream call budget (independent of user count)

With the defaults (hybrid: hot top ~1,250 every 5 min + tail on demand + daily full refresh):

| Source | Upstream CoinGecko calls | Scales with users? |
|--------|--------------------------|--------------------|
| Hot prices (`HOT_PAGES`=5) | 5 calls / 5 min = **~1,440/day** | **No** |
| Daily full refresh / prune | ~12/day | **No** |
| Long-tail prices (held) | small, on-demand · flat by distinct coins | slightly |
| History (DCA + app buy price) | ~1 call per coin per 30 days | **No** |
| **Total** | **~1,500/day ≈ ~44k/month** | **flat** |

So **100 users, 1,000 users, and 10,000 users cost roughly the same** (~44k calls/month) — driven by coverage + refresh rate, **not** user count. This still needs a **paid CoinGecko plan** (Lite ~100k/mo comfortably fits). On the free Demo tier (10k/mo) it still works but only the top coins stay 5-min-fresh — rate-limited pages are skipped. To go cheaper: lower `HOT_PAGES` (fewer hot coins) or raise the refresh interval. To keep **all** ~3,000 hot every 5 min instead, raise `HOT_PAGES` to 12 (~105k/mo, Analyst plan ≈ $129).

## Storage

Tiny — all within Firebase's free tier (1 GiB Firestore):
- `cache/universe`: ~3,000 coins in one doc ≈ **~700 KB** — already ~67% of Firestore's 1 MiB hard limit at ~3,000 coins (~90% at 4,000), so a size guard (`trimUniverse` in `functions/universe-utils.js`) drops the lowest-rank tail above an ~850 KiB soft limit before a write can overflow (C14 / C-R2b).
- `historyCache/{coin}`: ~365 daily points × ~25 bytes ≈ **~9 KB/coin**; 250 coins ≈ **~2 MB** total.
- Firestore **reads** per request are minimized by CDN `Cache-Control` headers (repeat identical requests are served from Firebase's edge, never hitting the function or Firestore).

---

# Running locally (one command)

> **Prerequisite: Node.js 22** — this matches the Cloud Functions production runtime (`functions/package.json` → `engines.node: "22"`). Keeping your local Node on 22 means the emulator behaves like deploy. Check with `node -v`; get it from [nodejs.org](https://nodejs.org/dist/latest-v22.x/).

```bash
npm run start:all
```

This runs **the whole stack in one lifecycle** (start one → start all; stop one → stop all):

| Service | URL / port | Purpose |
|---------|-----------|---------|
| Vite dev server | http://localhost:3000 | the app you develop against (hot reload) |
| Hosting emulator | http://localhost:5000 | the built `dist/` served like production |
| Functions emulator | :5001 | the `/api/*` proxy + PayPal/admin callables |
| Firestore / Auth | :8080 / :9099 | database + login |
| Pub/Sub | :8085 | lets the scheduled cache-refresh functions register |
| Emulator UI | http://localhost:4000 | inspect data, trigger functions |

Under the hood it's `firebase emulators:exec --project demo-crypto-idea --ui "npm run dev"`, so Ctrl-C stops everything together. (`npm run dev` alone runs only Vite — the app loads but `/api/*` calls fail with `ECONNREFUSED :5001`.) The Realtime Database emulator is intentionally off (no `database` config, and the app doesn't use it). The Storage emulator does start (on :9199) because `firebase.json` declares a `storage` block pointing at a deny-by-default `storage.rules` (committed by ISO-5 so the tenancy boundary exists before any upload feature ships) — but the app doesn't use Storage either.

> Note: the scheduled functions (`refreshPrices`, `refreshUniverseDaily`) **register** in the emulator but don't auto-fire on their cron; trigger them from the Emulator UI if needed. In production (Blaze) Cloud Scheduler fires them for real. The on-demand cache fill means the app works regardless.

# Frontend vs backend (what ships to users)

Only the built `dist/` folder reaches the browser. **No backend code or secret ever ships.**

| Ships to the browser (`dist/`) | Backend only (never downloaded) |
|--------------------------------|---------------------------------|
| `index.html`, `app.html`, `admin.html`, `privacy.html`, `terms.html`, hashed `assets/*.js`, `icons/`, `manifest.json`, `service-worker.js`, and the `public/` scripts (`landing.js`, `sw-register.js`, `site-meta.js`, `termly-embed.js`) | `functions/` (the `api` proxy, PayPal, **all API keys**), `firestore.rules`, `firebase.json`, `vite.config.js`, `scripts/`, `tests/` |

The only config in the bundle is the **public** Firebase web config (`VITE_FIREBASE_*`) — safe by design; security is enforced by the rules, not by hiding it.

# Responsive layout (mobile + desktop)

The user app is **one responsive layout** — the same markup works on a phone and a desktop. It's
near-zero `@media` (the shell + auto-fit grids do the reflow); the only deliberate breakpoints are two
desktop-only refinements noted below. Tab screens render inside a centered `.app-shell`
(`src/styles/app.css`) whose width adapts per screen:

| Track | Max width | Screens |
|-------|-----------|---------|
| wide | 1040px | **all 5 tab screens** — Portfolio (3-up asset **card grid**), Research, Journal, Learn, Search |
| default | 720px | Account (+ other non-tab, non-form screens) |
| narrow | 560px | Detail, AddEntry — forms/detail read better tighter (CoinInfo is now an overlay) |

Homogeneous **card lists reflow into columns** via the reusable `.grid-auto` utility
(`repeat(auto-fit, minmax(280px,1fr))`): Portfolio assets, Learn modules, Journal entries, and
Research coins go **1-up on mobile → 2-up → 3-up** automatically. Forms and the coin-detail body stay
single-column (capped on the narrow track). The **two deliberate desktop-only `@media (min-width:760px)`
refinements**: the bottom nav becomes a **solid-white floating pill** (mobile keeps the flush bar), and
each **Research coin card shows its position detail by default** (mobile stays tap-to-expand).

## Design system (`.ci-app`, `src/styles/app.css`)

The whole user app now matches the **founder-approved mockup** (design revamp **BUILT 2026-06-26** —
[`DESIGN-REVAMP.md`](docs/design/DESIGN-REVAMP.md), phases D-1…D-8; visual gallery
[`docs/mockups/desktop/index.html`](docs/mockups/desktop/index.html)). Editorial cream-paper look
(Fraunces + Hanken), scoped under `.ci-app`. Reusable class sets: `.value-card` (portfolio summary +
INVESTED/24H/ASSETS), `.asset-card` grid (token circle + serif value + tinted % pill; whole-card tap →
CoinInfo, Edit/Delete on Detail — swipe retired), `.chg-pill` (one tinted green/red % pill everywhere),
the `CI` token circle (`coinColor()` brand map, dark-safe via `color-mix`), `.nt-*` (Journal "Needs a
thesis"), plus the coin-drill-in / form / auth class sets. **Dark mode** (U8 light/dark/system) is fully
token-driven — every surface flips, including the nav (`--bar-bg`) and token circles. Method captured in
the `responsive-app` skill; see [`RESPONSIVE-DESIGN.md`](docs/design/RESPONSIVE-DESIGN.md) for the responsive shell.
A subsequent **Design Pass 2** ([`DESIGN-PASS.md`](docs/design/DESIGN-PASS.md), **COMPLETE 2026-06-29**) screen-by-screen
aligned the app to founder mockups and hardened dark mode — **dark-mode fixes are dark-block-only
(`html[data-theme="dark"]`) so light mode is byte-for-byte unchanged**: accent text uses the dark-remapped
`--accent-ink`, semantic colours (`--sg/--sr/--sa/--ai-2`) brighten in dark, and the rule is *foreground →
bright, but a solid-accent background under white text stays as-is* (brightening it would lower contrast).
It shipped DP-1…DP-12, Rounds 2–4 (incl. the **Search tab redesign + cached `/api/trending` TRENDING list**,
Portfolio split click-zones, the delete-coin-with-transactions warning, LIVE+plan header tags, and the
always-on AUTO price button) and a final dark-mode sweep; the mislabeled-plan-limit backend bug (**B-PORT**)
was fixed too. **Follow-on founder rounds shipped 2026-06-30: Round 6** (dark-mode visibility), **7** (card
consistency → the Research _Portfolio Pulse_ card; supersedes Round 5), **8** (Journal thesis readability —
white-card Read/Breakdown popups, X-close), **9** (login white toggle pill + Research equal-height cards +
in-tab "new portfolio" dialog), **10** (full-window paper background + **positive-only Buy/Sell amounts**, which
also fixed a negative-input value surfacing the misleading "transaction limit" error — the B-PORT class). **Round 11** (dark-mode account/transaction text + a Learn-quiz "select → Submit → feedback" rework) shipped 2026-07-01; **Rounds 12–32 are BUILT too** (see [`DESIGN-PASS.md`](docs/design/DESIGN-PASS.md)). Diagnosed backend issues are logged in [`ERRORS.md`](docs/testing/ERRORS.md).

# Pages & routes

Multi-page app (Vite build + Firebase Hosting rewrites):

| Route | File | What |
|-------|------|------|
| `/` | `index.html` | Static marketing landing. **Section 2 is the free DCA calculator** (`#dca`) — architecture, math & roadmap in [`CALCULATOR.md`](docs/product/CALCULATOR.md). |
| `/app` | `app.html` → React | The tracker (auth, portfolios, coins, transactions, account). |
| `/admin` | `admin.html` → React | **Separate** admin app (own login + admin-claim check; owner/manager roles). Not in the user bundle. |
| `/edge` | React | Education guide. |
| `/pro-success` | React | PayPal return / upgrade confirmation. |
| `/api/*` | `api` function | CoinGecko proxy: `prices` / `search` / `trending` / `history` / `coinlist`; plus `config` = public app flags (maintenance, signups). All cached / CDN-friendly. |

### Research tab (AI insights)

One of the app's five bottom-nav tabs (**Portfolio · Research · Journal · Learn · Search**) is a self-contained feature in
`src/features/research/`. (The Journal/thesis and Learn tabs are both wired — Journal persists a thesis on the coin doc and supports **write / edit / delete** with both questions — "why you bought it" + "what would change your mind" — required to save; Learn has real XP/levels + quiz-gated progress.) Three sub-views: **Overview** (daily brief, Portfolio Pulse, allocation,
risk meter, stress test), **Coins** (per-holding cards with a 7-day sparkline + cost/now/P&L), and
**Ask** (chat about your holdings). It reads your **real** active portfolio and reuses the app's
existing `/api` proxy only — current price + 24h from live prices, and 7d/30d change + sparkline
derived from the CDN-cached `/api/history` (no direct CoinGecko calls, no key in the client). The
AI "Pulse"/"Ask" currently render **data-driven offline fallbacks**; wiring live Claude is a planned
next step (a secure Cloud Function proxy holding the Anthropic key — see `NEXT-STEPS.md` N-3).

The free DCA calculator lives **inline on the landing** (no login, no separate page) — it is **not** in the app. It's built so visitors add **~0 backend calls**: it fetches the full ~3,000-coin list **once** from `/api/coinlist` (CDN-cached 24h) and searches **client-side** (no per-keystroke calls), then a calculation fetches only that coin's `/api/history` (CDN-cached; price history is immutable) and uses its latest point as "today's price" — no per-calc `/api/prices` call. So thousands of visitors share a couple of cached responses; scheduled jobs refresh the data at most daily. (CDN caching applies on the deployed site, not the local dev server.)

# Accounts & settings

Registration (Terms/Privacy consent + email-verify nudge), and the **Account** screen: profile
edit, change-password / change-email **behind re-auth**, **sign out everywhere**, notification +
**appearance (light/dark/system)** + privacy-consent toggles (auto-save), a **Plan & Usage** card
(configured-cap bars, server-authoritative AI-allowance meter, admin per-user custom limits), and a
**type-`DELETE` + re-auth** danger zone (soft-delete, 30-day trash). All owner-writable data is a
closed, rules-validated shape. As-built file map / data model / security model / testing live in
[`USER-SETTINGS-README.md`](docs/product/USER-SETTINGS-README.md); the design specs are
[`USER-CREATION.md`](docs/product/USER-CREATION.md) + [`USER-SETTINGS.md`](docs/product/USER-SETTINGS.md) (reusable methods:
the `user-creation` + `user-settings` skills). Wave A is built; MFA / App Check are go-live.

# Admin app (`/admin` — `admin.html` / `src/admin-main.jsx` / `src/components/admin-dashboard.jsx`)

A **separate app** from the user-facing one, served at **`/admin`**. It has its own login that verifies the Firebase admin custom claims and **signs out any non-admin**. There are **two roles**: **owner** (`{admin:true, role:"owner"}`, set only by `functions/scripts/set-admin.js`) and **manager** (`{admin:true, role:"manager"}`, granted by an owner from the owner-only **Admin access** tab). Owners can never be deleted, trashed or demoted, and a manager may not act on an owner at all. The admin code is **not** bundled into the user app, so regular users never download it. A different URL is *not* the security boundary — the claim check (enforced server-side in every admin function, re-checked in the admin app) is; the split additionally keeps admin code off users' devices. **2FA for admins is deferred to go-live** (needs Blaze + Identity Platform MFA). Tabs:
- **Overview** — **real combined usage** from the admin-only `getStats` function: total users, tier breakdown, total portfolios + coins, **avg per user**, and estimated revenue. **No personal data** — aggregate only (privacy by design).
- **Users** — **full users list** (`listUsers`), **searched + paginated 50/page** client-side. Shows email, name, tier, status (admin/suspended), and portfolio count — **operational data only, never holdings**. Click a row to manage: **change tier** (`setUserTier`), **suspend/un-suspend** (`suspendUser`), **delete** (`deleteUser`, owner-only, full GDPR erasure). The list merges Auth (email/name/disabled/admin/role) with the Firestore profile (tier, counts), capped at 5,000. **There is no grant-admin control here** — roles are managed from the owner-only **Admin access** tab.
- **Trash** — soft-deleted accounts (users who deleted themselves), each with **days left** in the 30-day window and **Restore** / **Delete now** actions (`restoreUser` / `deleteUser`). Trashed accounts are excluded from Overview stats and the Users list. A daily `purgeExpiredTrash` job erases them after 30 days. Both Users and Trash have a **Refresh** button, so a user's self-restore shows up here on demand.
- **Settings** — **API Keys** (CoinGecko, PayPal) and **Email & Integrations**, saved server-side via the **owner-only** `saveConfig` function to the locked `config/app` doc. Reading and saving both require a **step-up password re-auth** (within ~600s), gated by the server flag `config/app.flags.stepUpReauth` (default ON).
- **Admin access** (owner-only) — grant/revoke the **manager** role by email (`setManagerRole`); also step-up-re-auth gated. Owners can't be demoted here.
- **Audit** — a **read-only** view of the server-only `audit` log (every admin action plus sensitive self-service/billing events), loaded via the admin-only `listAudit` function, with a **Refresh** button.

**Owners can't be wiped out:** the primary protection is **identity** — an owner can never be deleted, trashed, demoted or self-deleted, by anyone including themselves. `MIN_ADMINS=2` (`countAdmins()`, alongside `countActiveOwners()`) remains only as a secondary floor. Still keep **two owners**, promoted with `node functions/scripts/set-admin.js <email> --role=owner` (also `--role=manager`, `--revoke`, `--show`, `--force`).

**Seeding test data (emulator):** `node functions/scripts/seed-emulator.js` creates two **owners** (`admin@test.com` + `admin2@test.com` / `test1234`), a **manager** (`manager@test.com`), a role-less legacy admin (`legacy@test.com`) + a couple of test users with portfolios/coins. Re-run anytime; the emulator's data is in-memory.

## User privacy & data rights (GDPR/CCPA)
Self-service, from the app's **Account → "Privacy & your data"** card (acts only on the caller's own account — no IDOR):
- **Download CSV (spreadsheet)** (`exportMyData` → `buildPortfolioCsv`) — a holdings summary (per coin: amount held, avg buy price, invested/sold + a TOTAL) plus a chronological transactions list; opens in Excel/Sheets (cost-basis only, no live prices).
- **Download all my data (JSON)** (`exportMyData`) — full profile + portfolios/coins/transactions (right to access).
- **Delete my account** (`deleteMyAccount`) — **soft delete with a 30-day grace period** (right to erasure, with recovery): the account is moved to trash, the user is signed out, and they can **restore it within 30 days** by logging back in (`restoreMyAccount`, shown via the in-app restore screen). After 30 days `purgeExpiredTrash` erases it permanently. `deleted`/`deletedAt` are server-only (firestore.rules block the owner from setting them).
- **Privacy Policy / Terms** links → `privacy.html` / `terms.html`. These are built static pages with a clearly-marked placeholder — paste your **Termly** embed snippet into the marked block and re-deploy. Linked from the landing footer too.

## Signup hardening
- **Email verification** is sent on registration (anti-abuse + confirms a real inbox).
- **App Check** (reCAPTCHA v3) is wired in `firebase.config.js` (prod-only, via `VITE_RECAPTCHA_SITE_KEY`) — this is the standard bot/abuse protection for signup; enable enforcement in the Firebase console at deploy. (Firebase signup is client-side, so per-IP rate-limiting isn't applicable without re-architecting; App Check is the right tool.)

# Bot / abuse protection

The `api` function applies a **per-IP rate limit** (`RATE_LIMIT` = 60 requests / minute / IP; returns `429` when exceeded). Because all heavy work is cached, this mainly stops scraping/DoS bursts on the public calculator. For stronger protection later: **Firebase App Check** (reCAPTCHA) or a CDN (Cloudflare) in front.

# How the API is used in the app

The app and the public calculator **never call CoinGecko directly** — they call same-origin `/api/*`, which the `api` function serves from cache:
- **Live prices** (`/api/prices`) — the portfolio screen polls every 60s for held coins; the DCA tool fetches the current price once.
- **Search** (`/api/search`) — the Add-Coin screen and the DCA coin picker (debounced).
- **History** (`/api/history`) — the DCA calculation (full daily series, sliced client-side per date).
- The app keeps a small hardcoded `TOP_COINS` list as an instant/offline fallback.

# Performance & scale

The landing + DCA are **static files served by Firebase's CDN**, so traffic scales effortlessly:
- **Page weight:** ~30 KB HTML + fonts + a few KB of inline JS. **Loads in well under 1 second** on a normal connection; **a few hundred KB** of browser memory per visitor.
- **1,000 or 10,000 simultaneous visitors:** the CDN serves the static page with no per-user server cost.
- **The React tracker (`/app`) is code-split** for fast first loads. The initial entry chunk is ~3 KB and paints a loading shell immediately; the app code (~120 KB), the Firebase SDK (~499 KB, gzip ~115 KB), and React (~144 KB) then stream in as **separate cached chunks**. The Firebase chunk and React stay cached across deploys, so an update only re-downloads the small app chunk. The admin dashboard and the `/edge` & `/pro-success` routes are lazy-loaded — regular users never download them. (Wins come from `manualChunks` in `vite.config.js` + `React.lazy`/`Suspense` in `main.jsx` and `CryptoIdea.jsx`.)

**CoinGecko upstream calls do NOT scale with users** (everything is shared-cached):

| Action | Upstream CoinGecko calls |
|--------|--------------------------|
| Hot prices (top ~1,250) | ~1,440/day total (5 calls / 5 min) — same for 1k or 10k users |
| Long-tail coins held | flat, by distinct coins held (folded into the universe on demand) |
| Search | reads the cached universe — **0 per search** |
| History (DCA + app buy price) | ~1 per coin per 30 days |

**Searching 10–20 coins per user:** each search is debounced and reads the **cached** coin list, so it makes **0 CoinGecko calls**. 10,000 users × 15 searches = 150,000 *search requests*, but these hit Firebase (function + Firestore read, CDN-cached 5 min), **not** CoinGecko — so CoinGecko search cost stays ~0. The only Firebase cost is cheap function invocations / Firestore reads, heavily reduced by the CDN.

# Adding coins (the ~3,000 list)

Search covers the **top ~3,000 coins by market cap** (`UNIVERSE_PAGES = 12`). So users can find and add coins at rank **#800, #1,200, #2,500**, etc. — just search the name or symbol. To cover more, raise `UNIVERSE_PAGES` in `functions/index.js`. (Anything outside the list can still be priced on-demand if held.)

---

# Security

Defense in depth across the whole app:

| Layer | Protection |
|-------|-----------|
| **Auth** | Firebase Auth (no plaintext passwords). Password reset doesn't reveal whether an account exists. |
| **Admin** | Verified Firebase **custom claims**, set server-side — not an email list. Two roles: **owner** (`role:"owner"`, script-only) and **manager** (`role:"manager"`, granted by an owner). Owner-only actions (`deleteUser`, config read/write, role grants) additionally require a **step-up password re-auth**. |
| **Firestore rules** | Owner-only access; users can't change their own `tier`; counter-based plan limits; `/config` is server-only (no client read/write). The blanket `users` update/delete branches are gated by `isAdminOwner()` (**owner role only**); reads stay open to any admin. Verified by `npm run test:rules`. |
| **Functions** | Callable functions enforce auth and act on the caller's uid (no IDOR). The PayPal webhook verifies signatures. |
| **Secrets** | API keys live only in the Cloud Function (the locked `config/app` doc, or env vars / `functions/.env`). The Firebase web config is public by design. |
| **Bot / abuse** | `/api` has a **per-IP rate limit** (60/min). **Firebase App Check** (reCAPTCHA v3) protects Auth/Firestore/callable Functions when `VITE_RECAPTCHA_SITE_KEY` is set + enforcement is on. The landing email form has a honeypot. |
| **HTTP headers** | `firebase.json` sets CSP, `X-Frame-Options: DENY` (clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and HSTS on every response. |
| **XSS** | The React app auto-escapes (JSX); the static landing builds DOM with `textContent`, never `innerHTML`, for API data. |
| **Dependencies** | **Runtime `npm audit --omit=dev` = 0 vulnerabilities in BOTH trees** (root/browser and `functions/`/server), re-verified 2026-07-22. Vite is on **6.4.3** (bumped from 5.4.x, which cleared four dev-scope alerts at once — vite #5/#7/#8, esbuild #4). Remaining open alerts are all `scope=development` build tooling (`sharp`, `firebase-tools`' transitive chain) — they never reach a user. Note `npm audit` with no flag *includes* dev deps, so it will report a non-zero count; that is expected and is not a shipped risk. Details: `NEXT-STEPS.md` §5 DEPS-1/DEPS-2. |

## Admin settings (API keys & email) — `saveConfig`

The admin **Settings** tab saves to a **locked** Firestore doc `config/app` via the admin-only `saveConfig` Cloud Function. Clients can never read it (rules deny `/config`); the proxy and PayPal functions read it server-side (`getConfig`, cached 5 min, with env-var fallback). So you can rotate the CoinGecko/PayPal keys and pick an email provider from the dashboard without redeploying. The form pre-fills from `getAdminConfig` on open (non-secret values shown; secrets shown only as a "saved" placeholder), and a blank secret field on save **keeps** the stored value — so re-saving never wipes a key.

**App Controls (public flags).** The Settings tab also has instant-save toggles for **Maintenance mode** and **Allow new signups**, stored in `config/app.flags`. The app reads them from the public **`/api/config`** endpoint (non-secret only, CDN-cached ~60s) on load: maintenance shows a "we'll be right back" screen for everyone; signups-off disables the Register tab. Changes apply within ~60s. (Signups-off is a client gate; for hard enforcement add an Auth `beforeCreate` blocking function at go-live.)

**More Settings sections.** *Analytics & Legal* — GA4 / Plausible IDs + Termly UUID/doc-IDs + cookie-banner toggle; `public/site-meta.js` injects them on the landing + app and the policy pages auto-embed Termly. *Plans & Pricing* — edit each tier's price + limits; prices drive the revenue estimate and the landing/app price display, and **limits are enforced by `firestore.rules`** (which read `config/app.plans` with a fallback to the defaults — verified by `npm run test:rules`).

**Audit tab.** Every admin action (tier change, suspend, delete, admin grant, settings save) is logged to a server-only `audit` collection and shown in the dashboard **Audit** tab.

## To finish for production
- **App Check:** create a reCAPTCHA v3 key (Firebase Console → App Check), set `VITE_RECAPTCHA_SITE_KEY` in `.env`, and turn on **enforcement** for Auth/Firestore/Functions in the console.
- **Test the CSP** on the deployed site and loosen a directive only if something legitimate is blocked (open the browser console).
- **Email capture:** the landing subscribe form POSTs to `/api/subscribe`, which adds the contact to **ActiveCampaign** or **GetResponse** using the key from the admin Settings (server-side — the key never reaches the browser). To enable: open the admin **Settings** → Email, pick the provider, and paste the **API key**, the **List/Campaign ID**, and (ActiveCampaign only) the **API URL** (`https://youracct.api-us1.com`). Mailchimp/SendGrid/Resend/Brevo appear in the dropdown but aren't implemented in the function yet.

---

# Deploys & instant updates (no stale cache for users)

Every `firebase deploy` reaches **all users immediately** — no one is stuck on an old cached version:

- **HTML is never cached** (`Cache-Control: no-cache` on all pages + `/service-worker.js`), so every page load fetches the latest. The CDN is purged on each deploy automatically.
- **Only `/assets/**` is content-hashed** (`app-AbC123.js`) and cached forever (`immutable`). A new build = new filenames, so there's never a stale-asset problem and repeat visits stay fast.
  ⚠️ The root scripts (`landing.js`, `site-meta.js`, `sw-register.js`, `termly-embed.js`) are **not** hashed — they're referenced by fixed name — so they get `no-cache` alongside the HTML. Before 2026-07-20 the `immutable` glob wrongly matched them too, which would have pinned the whole marketing page in browser caches for a year with no way to push a fix (`GO-LIVE-AUDIT.md` H5).
- **The service worker is network-first** for pages (never serves stale HTML online) and is **auto-stamped with a unique build id** each build (`npm run build` → `scripts/stamp-sw.js`), so it updates on every deploy.
- **Open tabs auto-refresh:** when a new version is detected, the tab reloads itself (skipping the first install); it also checks for updates when you switch back to the tab.

So after you deploy: a user who reloads or navigates is instantly on the new version, and a user with the app already open gets auto-refreshed. Just run `npm run deploy`.

> **`npm run deploy` has two gates (added 2026-07-20).** It runs `scripts/check-env.js` first and
> **fails** if `.env` is missing or still holds `.env.example` placeholders — otherwise a production
> build silently ships the **demo** Firebase config (the app only logs a `console.warn`). It also
> deploys to an explicit **`prod` alias**, so create one with `firebase use --add`; without it the
> deploy stops with a clear error instead of following whatever `firebase use` last selected.

> ### 🚀 Going live for the first time?
> **Read [`GO-LIVE-AUDIT.md`](docs/product/GO-LIVE-AUDIT.md) before you deploy.** It is the canonical
> record of the 2026-07-20 multi-agent audit (60 verified findings): what is already solid, the
> remaining blockers, and an ordered runbook with the steps that **cannot be undone if done in the
> wrong order** — the permanent Firestore region, PITR (not enablable retroactively), the admin
> bootstrap that must precede any admin-Settings step, and the App Check ordering that otherwise
> locks out every user. `NEXT-STEPS.md` §4 is the checklist summary.
