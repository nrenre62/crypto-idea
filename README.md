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
│   ├── components/               ← UI: every user screen (Login/Portfolio/Account/Detail/…) + shared ui.jsx/StatusDot
│   └── utils/                    ← pure helpers (format, coins+DCA model, theme tokens, storage)
├── functions/index.js           ← Cloud Functions (CoinGecko proxy, PayPal, admin/GDPR callables)
├── firestore.rules              ← security rules
├── tests/                       ← rules + data-layer (node:test) and unit/ (Vitest)
├── ARCHITECTURE.md (src/)       ← the layer rules + migration status
└── NEXT-STEPS.md                ← what's left to do (refactor, known bug, go-live)
```

> **Frontend architecture is layered** (`api` / `hooks` / `components` / `utils`). The
> historically-monolithic `CryptoIdea.jsx` (~1,560 lines) has been peeled into per-screen
> components + hooks; it now holds only the auth/data effects, mutation handlers, shared context,
> and the router shell. The rules, current state, and remaining layer violations live in
> [`src/ARCHITECTURE.md`](src/ARCHITECTURE.md); the to-do list lives in [`NEXT-STEPS.md`](NEXT-STEPS.md).

## Tests

```bash
npm run test:unit         # Vitest: component/hook tests in jsdom (api/ mocked) — fast, no emulator
npm run test:rules        # Firestore security-rules tests (runs against the emulator)
npm run test:integration  # data-layer tests: real auth+db code vs the emulator
```

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
2. Select "Start in production mode"
3. Pick a region close to your users (e.g., us-central1)
4. Once created, go to Rules tab
5. Copy contents of `firestore.rules` and paste there
6. Click "Publish"

### Step 4: Get Your Config

1. Project Settings (gear icon) → General
2. Scroll to "Your apps" → Click web icon (</>) 
3. Register app name: "crypto-idea-web"
4. Copy the firebaseConfig object
5. Paste into `firebase.config.js` replacing the placeholder values

### Step 5: Install Dependencies

```bash
npm install firebase
```

### Step 6: Connect to Your App

Replace the simulated storage calls in the React app with the Firebase functions:

```javascript
// Instead of: window.storage.get("ci-user")
// Use:
import { onAuthChange } from "./api/firebase-auth.js";
import { getPortfolios, getCoins } from "./api/firebase-database.js";

// Listen for auth state on app load
onAuthChange(async (firebaseUser) => {
  if (firebaseUser) {
    const portfolios = await getPortfolios(firebaseUser.uid);
    // Set your React state with this data
  }
});
```

## Database Schema

```
users/{uid}
│   email: string
│   name: string
│   tier: "free" | "pro"
│   joined: timestamp
│   lastLogin: timestamp
│   settings: { currency: string, theme: string }
│
└── portfolios/{portfolioId}
    │   name: string
    │   created: timestamp
    │   order: number
    │
    └── coins/{coinId}
        │   symbol: string
        │   name: string
        │   thumb: string
        │   addedAt: timestamp
        │
        └── transactions/{txId}
                type: "buy" | "sell"
                amount: number
                priceAtBuy: number
                date: string (ISO)
                createdAt: timestamp
```

## Tier Limits

| Feature               | Free  | Pro        | Premium          |
|----------------------|-------|------------|------------------|
| Portfolios           | 1     | 10         | 50 (customizable)|
| Coins per portfolio  | 10    | 200        | 500 (customizable)|
| Transactions per coin| 50    | 2,000      | 5,000 (customizable)|
| DCA calculations/day | 20    | Unlimited  | Unlimited        |
| Max storage          | 5 MB  | 500 MB     | 15 GB            |
| Price: monthly       | $0    | $9.99      | $49.99           |
| Price: yearly        | $0    | $79.99     | $399.99          |

## Costs

Firebase free Spark plan covers:
- 10,000 auth operations/month
- 50,000 Firestore reads/day
- 20,000 Firestore writes/day
- 10 GB hosting storage

This handles roughly 10,000+ active users before you need to upgrade ($25/month Blaze plan, pay-as-you-go).

## Adding Stripe Payments (for Pro tier)

1. Create account at [stripe.com](https://stripe.com)
2. Install: `npm install stripe`
3. Create a subscription product in Stripe Dashboard
4. Use Stripe Checkout for payment flow
5. Set up a webhook to update user tier in Firestore when payment succeeds

Stripe takes ~3% per transaction (much less than Apple's 30%).

> Note: payments are implemented with **PayPal** (see `functions/index.js`), not Stripe.

---

# Cloud Functions

All backend functions live in `functions/index.js` (Node 22, deployed with `firebase deploy --only functions`). **Deploying functions requires the Blaze (pay-as-you-go) plan** — it has a generous always-free monthly allowance, but a card must be on file. The local emulator runs them for free.

| Function | Type | Purpose |
|----------|------|---------|
| `api` | HTTP | CoinGecko proxy — `/api/prices`, `/api/search`, `/api/history` (see below) |
| `refreshPrices` | Scheduled (every 5 min) | Keeps prices fresh in the shared `cache/universe` (all ~3,000 coins on a paid CoinGecko plan; degrades to the top coins on the free tier) |
| `refreshUniverseDaily` | Scheduled (every 24 h) | Guarantees the full ~3,000-coin list and prunes coins that dropped off |
| `paypalWebhook` | HTTP | Verifies PayPal signatures and updates a user's tier |
| `createSubscription` / `cancelSubscription` | Callable | Start/cancel a PayPal subscription (auth-enforced) |
| `getStats` | Callable | Admin-only **combined** usage/revenue stats (no personal data) |
| `setAdminClaim` | Callable | Admin-only: grant/revoke the `{admin:true}` custom claim |
| `listUsers` | Callable | Admin-only: full users list (Auth+profile merge, operational data only, capped 5000) |
| `lookupUser` | Callable | Admin-only: look up one user by email (tier/status/usage) for support |
| `getAdminConfig` | Callable | Admin-only: read saved config to pre-fill Settings (secrets returned as set-flags only) |
| `listAudit` | Callable | Admin-only: recent admin-action audit log |
| `setUserTier` / `suspendUser` / `deleteUser` | Callable | Admin-only: change tier / suspend / delete-with-erasure (blocks self-target) |
| `deleteMyAccount` / `exportMyData` | Callable | Self-service GDPR/CCPA: a user erases or exports **their own** data |
| `saveConfig` | Callable | Admin-only: write API keys to the locked `config/app` doc |

## CoinGecko proxy (`api`)

The app never calls CoinGecko directly. It calls the same-origin `/api/*` endpoints, which Firebase Hosting rewrites to the `api` function in production (`vite.config.js` proxies them to the emulator in dev). The API key stays **server-side only**.

**The point: upstream CoinGecko calls are SHARED across all users and do NOT scale with user count.**

| Endpoint | What it does | Caching |
|----------|--------------|---------|
| `GET /api/prices?ids=a,b,c` | Live prices for held coins | Reads the shared `cache/universe` doc (refreshed every 5 min). A held coin not in the universe is fetched once on demand and folded back in, so the next request — for any user — is cached. Cost stays flat regardless of user count. |
| `GET /api/search?q=term` | Search the ~3,000-coin universe | Reads `cache/universe` — **zero per-search upstream calls**. Only established (top-ranked) coins appear, which naturally excludes brand-new micro-caps. |
| `GET /api/coinlist` | Full ~3,000-coin list **+ price** (for the landing DCA calculator) | Reads `cache/universe`; served from the CDN for 24 h so thousands of visitors add ~0 function calls. Price is included so the DCA tool shows a value with no per-visitor price call. |
| `GET /api/history?id=coin` | Full daily price history (for DCA) | Cached per-coin in `historyCache/{coin}` for 7 days — fetched **once per coin**, reused for every date range and every user. |

### One shared dataset for everything
A single CoinGecko endpoint — `coins/markets` — returns the coin **list + prices + images + rank** together. One call covers 250 coins; `refreshUniverse()` fetches up to 12 pages (~3,000 coins) into one shared `cache/universe` doc, so prices, search, **and** the landing DCA calculator all read from it. On the free tier the universe also auto-refreshes on demand if the scheduled jobs aren't running, and rate-limited pages are skipped (last-good data kept).

### Tunables (top of the CoinGecko section in `functions/index.js`)
- `UNIVERSE_PAGES` — coins covered (default `12` = ~3,000; each page = 250 coins = 1 call).
- `UNIVERSE_TTL` — serve-time freshness window (default 5 min).
- `HISTORY_TTL` — per-coin history refresh (default 7 days).

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

With the defaults (all ~3,000 coins, 5-min refresh):

| Source | Upstream CoinGecko calls | Scales with users? |
|--------|--------------------------|--------------------|
| Prices + search (universe) | 12 calls / 5 min = **~3,456/day** | **No** |
| Daily full refresh / prune | ~12/day | **No** |
| DCA history | ~1 call per coin per 7 days | **No** |
| Off-list coins held | small, on-demand | slightly |
| **Total** | **~3,500/day ≈ ~105k/month** | **flat** |

So **100 users, 1,000 users, and 10,000 users cost roughly the same** (~105k calls/month) — the cost is driven by coverage + refresh rate, **not** user count. Covering all ~3,000 coins every 5 min needs a **paid CoinGecko plan** (Lite ~100k/mo, or Analyst 500k/mo ≈ $129). On the free Demo tier (10k/mo) the universe still works but only the top coins stay 5-min-fresh — rate-limited pages are skipped. To stay free, raise `UNIVERSE_TTL` (refresh less often) and/or lower `UNIVERSE_PAGES` (fewer coins hot).

## Storage

Tiny — all within Firebase's free tier (1 GiB Firestore):
- `cache/universe`: ~3,000 coins × ~110 bytes ≈ **~330 KB** (one doc, well under Firestore's 1 MB limit).
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

Under the hood it's `firebase emulators:exec --ui "npm run dev"`, so Ctrl-C stops everything together. (`npm run dev` alone runs only Vite — the app loads but `/api/*` calls fail with `ECONNREFUSED :5001`.) Other emulators (Realtime Database, Storage) are intentionally off — the app doesn't use them.

> Note: the scheduled functions (`refreshPrices`, `refreshUniverseDaily`) **register** in the emulator but don't auto-fire on their cron; trigger them from the Emulator UI if needed. In production (Blaze) Cloud Scheduler fires them for real. The on-demand cache fill means the app works regardless.

# Frontend vs backend (what ships to users)

Only the built `dist/` folder reaches the browser. **No backend code or secret ever ships.**

| Ships to the browser (`dist/`) | Backend only (never downloaded) |
|--------------------------------|---------------------------------|
| `index.html`, `app.html`, hashed `assets/*.js`, `icons/`, `manifest.json`, `service-worker.js` | `functions/` (the `api` proxy, PayPal, **all API keys**), `firestore.rules`, `firebase.json`, `vite.config.js`, `scripts/`, `tests/` |

The only config in the bundle is the **public** Firebase web config (`VITE_FIREBASE_*`) — safe by design; security is enforced by the rules, not by hiding it.

# Pages & routes

Multi-page app (Vite build + Firebase Hosting rewrites):

| Route | File | What |
|-------|------|------|
| `/` | `index.html` | Static marketing landing. **Section 2 is the free DCA calculator** (`#dca`). |
| `/app` | `app.html` → React | The tracker (auth, portfolios, coins, transactions, account). |
| `/admin` | `admin.html` → React | **Separate** admin app (own login + `{admin:true}` check). Not in the user bundle. |
| `/edge` | React | Education guide. |
| `/pro-success` | React | PayPal return / upgrade confirmation. |
| `/api/*` | `api` function | CoinGecko proxy: `prices` / `search` / `history` / `coinlist`; plus `config` = public app flags (maintenance, signups). All cached / CDN-friendly. |

The free DCA calculator lives **inline on the landing** (no login, no separate page) — it is **not** in the app. It's built so visitors add **~0 backend calls**: it fetches the full ~3,000-coin list **once** from `/api/coinlist` (CDN-cached 24h) and searches **client-side** (no per-keystroke calls), then a calculation fetches only that coin's `/api/history` (CDN-cached; price history is immutable) and uses its latest point as "today's price" — no per-calc `/api/prices` call. So thousands of visitors share a couple of cached responses; scheduled jobs refresh the data at most daily. (CDN caching applies on the deployed site, not the local dev server.)

# Admin app (`/admin` — `admin.html` / `src/admin-main.jsx` / `src/admin-dashboard.jsx`)

A **separate app** from the user-facing one, served at **`/admin`**. It has its own login that verifies the Firebase `{admin:true}` custom claim and **signs out any non-admin**. The admin code is **not** bundled into the user app, so regular users never download it. A different URL is *not* the security boundary — the claim check (enforced server-side in every admin function, re-checked in the admin app) is; the split additionally keeps admin code off users' devices. **2FA for admins is deferred to go-live** (needs Blaze + Identity Platform MFA). Tabs:
- **Overview** — **real combined usage** from the admin-only `getStats` function: total users, tier breakdown, total portfolios + coins, **avg per user**, and estimated revenue. **No personal data** — aggregate only (privacy by design).
- **Users** — **full users list** (`listUsers`), **searched + paginated 50/page** client-side. Shows email, name, tier, status (admin/suspended), and portfolio count — **operational data only, never holdings**. Click a row to manage: **change tier** (`setUserTier`), **suspend/un-suspend** (`suspendUser`), **delete** (`deleteUser`, full GDPR erasure). The list merges Auth (email/name/disabled/admin) with the Firestore profile (tier, counts), capped at 5,000.
- **Settings** — **API Keys** (CoinGecko, PayPal) and **Email & Integrations**, saved server-side via the admin-only `saveConfig` function to the locked `config/app` doc.

**Two admins, always:** admin is the `{admin:true}` claim, so keep at least two. A `MIN_ADMINS=2` guard (`countAdmins()`) blocks `deleteUser`/`setAdminClaim` demotion/`deleteMyAccount` whenever the action would leave fewer than 2 admins — admin access can't be wiped out.

**Seeding test data (emulator):** `node functions/scripts/seed-emulator.js` creates two admins (`admin@test.com` + `admin2@test.com` / `test1234`) + a couple of test users with portfolios/coins. Re-run anytime; the emulator's data is in-memory.

## User privacy & data rights (GDPR/CCPA)
Self-service, from the app's **Account → "Privacy & your data"** card (acts only on the caller's own account — no IDOR):
- **Download my data** (`exportMyData`) — JSON of their profile + portfolios/coins/transactions (right to access).
- **Delete my account** (`deleteMyAccount`) — wipes all their data + Auth account (right to erasure).
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
| Prices + search (universe, ~3,000) | ~3,456/day total (12 calls / 5 min) — same for 1k or 10k users |
| Off-list coins held | flat, by distinct coins held (folded into the universe on demand) |
| Search | reads the cached universe — **0 per search** |
| DCA history | ~1 per coin per 7 days |

**Searching 10–20 coins per user:** each search is debounced and reads the **cached** coin list, so it makes **0 CoinGecko calls**. 10,000 users × 15 searches = 150,000 *search requests*, but these hit Firebase (function + Firestore read, CDN-cached 5 min), **not** CoinGecko — so CoinGecko search cost stays ~0. The only Firebase cost is cheap function invocations / Firestore reads, heavily reduced by the CDN.

# Adding coins (the ~3,000 list)

Search covers the **top ~3,000 coins by market cap** (`UNIVERSE_PAGES = 12`). So users can find and add coins at rank **#800, #1,200, #2,500**, etc. — just search the name or symbol. To cover more, raise `UNIVERSE_PAGES` in `functions/index.js`. (Anything outside the list can still be priced on-demand if held.)

---

# Security

Defense in depth across the whole app:

| Layer | Protection |
|-------|-----------|
| **Auth** | Firebase Auth (no plaintext passwords). Password reset doesn't reveal whether an account exists. |
| **Admin** | A verified Firebase **custom claim** (`{admin:true}`), set server-side — not an email list. |
| **Firestore rules** | Owner-only access; users can't change their own `tier`; counter-based plan limits; `/config` is server-only (no client read/write). Verified by `npm run test:rules`. |
| **Functions** | Callable functions enforce auth and act on the caller's uid (no IDOR). The PayPal webhook verifies signatures. |
| **Secrets** | API keys live only in the Cloud Function (the locked `config/app` doc, or env vars / `functions/.env`). The Firebase web config is public by design. |
| **Bot / abuse** | `/api` has a **per-IP rate limit** (60/min). **Firebase App Check** (reCAPTCHA v3) protects Auth/Firestore/callable Functions when `VITE_RECAPTCHA_SITE_KEY` is set + enforcement is on. The landing email form has a honeypot. |
| **HTTP headers** | `firebase.json` sets CSP, `X-Frame-Options: DENY` (clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and HSTS on every response. |
| **XSS** | The React app auto-escapes (JSX); the static landing builds DOM with `textContent`, never `innerHTML`, for API data. |
| **Dependencies** | Production `npm audit` = 0 vulnerabilities. |

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
- **JS/CSS/images are content-hashed** (`app-AbC123.js`) and cached forever (`immutable`). A new build = new filenames, so there's never a stale-asset problem and repeat visits stay fast.
- **The service worker is network-first** for pages (never serves stale HTML online) and is **auto-stamped with a unique build id** each build (`npm run build` → `scripts/stamp-sw.js`), so it updates on every deploy.
- **Open tabs auto-refresh:** when a new version is detected, the tab reloads itself (skipping the first install); it also checks for updates when you switch back to the tab.

So after you deploy: a user who reloads or navigates is instantly on the new version, and a user with the app already open gets auto-refreshed. Just run `npm run deploy`.
