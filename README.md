# Crypto Idea — Firebase Backend

## What's Included

```
firebase-backend/
├── README.md              ← You're here
├── firebase.config.js     ← Firebase initialization (add your keys)
├── auth.js                ← Login, Register, Logout, Password Reset
├── database.js            ← Portfolios, Coins, Transactions CRUD
├── firestore.rules        ← Security rules (deploy to Firebase)
└── package.json           ← Dependencies
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
import { onAuthChange, getUserProfile } from "./firebase/auth.js";
import { getPortfolios, getCoins } from "./firebase/database.js";

// Listen for auth state on app load
onAuthChange(async (firebaseUser) => {
  if (firebaseUser) {
    const profile = await getUserProfile(firebaseUser.uid);
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

All backend functions live in `functions/index.js` (Node 20, deployed with `firebase deploy --only functions`). **Deploying functions requires the Blaze (pay-as-you-go) plan** — it has a generous always-free monthly allowance, but a card must be on file. The local emulator runs them for free.

| Function | Type | Purpose |
|----------|------|---------|
| `api` | HTTP | CoinGecko proxy — `/api/prices`, `/api/search`, `/api/history` (see below) |
| `refreshMarkets` | Scheduled (every 5 min) | Keeps the shared price/coin cache warm in production |
| `paypalWebhook` | HTTP | Verifies PayPal signatures and updates a user's tier |
| `createSubscription` / `cancelSubscription` | Callable | Start/cancel a PayPal subscription (auth-enforced) |
| `getStats` | Callable | Admin-only usage/revenue stats |
| `setAdminClaim` | Callable | Admin-only: grant/revoke the `{admin:true}` custom claim |

## CoinGecko proxy (`api`)

The app never calls CoinGecko directly. It calls the same-origin `/api/*` endpoints, which Firebase Hosting rewrites to the `api` function in production (`vite.config.js` proxies them to the emulator in dev). The API key stays **server-side only**.

**The point: upstream CoinGecko calls are SHARED across all users and do NOT scale with user count.**

| Endpoint | What it does | Caching |
|----------|--------------|---------|
| `GET /api/prices?ids=a,b,c` | Live prices for held coins | Top-N coins come from a shared `cache/markets` doc (refreshed every 5 min). Coins outside the top-N ("long tail") come from a shared `cache/longtail` doc refreshed every 20 min — so even obscure-coin prices are shared across all users and stay flat in cost. |
| `GET /api/search?q=term` | Search any of the top-N coins | Reads `cache/markets` — **zero per-search upstream calls**. Only established (top-ranked) coins appear, which naturally excludes brand-new micro-caps. |
| `GET /api/history?id=coin` | Full daily price history (for DCA) | Cached per-coin in `historyCache/{coin}` for 7 days — fetched **once per coin**, reused for every date range and every user. |

### How prices + search share one dataset
A single CoinGecko endpoint — `coins/markets` — returns the coin **list + prices + images + rank** together. One call covers 250 coins. `refreshMarkets()` stores that in the shared `cache/markets` doc, so both prices and search read from it. On the free tier this also auto-refreshes on demand if the scheduled function isn't running.

### Tunables (top of the CoinGecko section in `functions/index.js`)
- `MARKET_PAGES` — coins covered for live prices. `1` = top 250 (1 call/refresh).
- `LIST_PAGES` — coins covered for **search** (default `12` = ~3,000), refreshed daily.
- `MARKETS_TTL` — top-N price freshness (default 5 min).
- `LONGTAIL_TTL` — held coins outside the top-N: shared refresh interval (default 20 min).
- `HISTORY_TTL` — per-coin history refresh (default 7 days).

### The API key
```bash
# Production:
firebase functions:config:set coingecko.demo_key="YOUR_DEMO_KEY"
# Local emulator:
$env:COINGECKO_DEMO_KEY = "YOUR_DEMO_KEY"   # PowerShell (optional)
```
Without a key it uses CoinGecko's public endpoint: lower rate limit, and **history limited to the last 365 days** (the app falls back to built-in estimates for older dates). A free Demo key extends the range. Get one at coingecko.com/en/api.

## Upstream call budget (independent of user count)

With the defaults (top 250 coins, 5-min refresh):

| Source | Upstream CoinGecko calls | Scales with users? |
|--------|--------------------------|--------------------|
| Prices + search | ~1 call / 5 min = **~290/day** | **No** |
| DCA history | ~1 call per coin per 7 days (e.g. 250 coins → **~36/day**) | **No** |
| Out-of-top-250 coins held | small, on-demand | slightly |
| **Total** | **~325/day ≈ ~10k/month** | **flat** |

So **100 users, 1,000 users, and 10,000 users cost roughly the same** (~10k calls/month), which fits CoinGecko's free Demo plan (10,000/month). For more coins or faster refresh, raise `MARKET_PAGES`/lower `MARKETS_TTL` and move to the Lite plan (100k/month, $35).

## Storage

Tiny — all within Firebase's free tier (1 GiB Firestore):
- `cache/markets`: ~250 coins × ~120 bytes ≈ **~30 KB** (one doc).
- `historyCache/{coin}`: ~365 daily points × ~25 bytes ≈ **~9 KB/coin**; 250 coins ≈ **~2 MB** total.
- Firestore **reads** per request are minimized by CDN `Cache-Control` headers (repeat identical requests are served from Firebase's edge, never hitting the function or Firestore).

---

# Pages & routes

Multi-page app (Vite build + Firebase Hosting rewrites):

| Route | File | What |
|-------|------|------|
| `/` | `index.html` | Static marketing landing. **Section 2 is the free DCA calculator** (`#dca`). |
| `/app` | `app.html` → React | The tracker (auth, portfolios, coins, transactions, account, admin). |
| `/edge` | React | Education guide. |
| `/pro-success` | React | PayPal return / upgrade confirmation. |
| `/api/*` | `api` function | CoinGecko proxy (prices/search/history). |

The free DCA calculator lives **inline on the landing** (no login, no separate page). It searches ~3,000 coins via `/api/search`, computes returns from `/api/history`, and shows live value from `/api/prices` — all from the cached proxy, so unlimited public visitors add ~0 upstream calls.

# Admin dashboard (`src/admin-dashboard.jsx`)

Opened from the app's Account screen by an **admin** (Firebase `{admin:true}` custom claim). Tabs:
- **Overview** — user/tier counts, estimated revenue, plan limits.
- **Users** — search users, view usage vs limits, change tier, edit premium custom limits. *(currently mock data; wire to Firestore + the `getStats` function to go live.)*
- **Settings** — **API Keys** (CoinGecko, PayPal) and **Email & Integrations** (provider + key + from-address + list). *Scaffold:* to make these persist, add an admin-only `saveConfig` Cloud Function that writes to a protected Firestore `config/*` doc, and have the proxy/PayPal functions read from it instead of `functions.config()`.

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
- **1,000 or 10,000 simultaneous visitors:** the CDN serves the static page with no per-user server cost. The React tracker bundle (`/app`) is ~600 KB (gzip ~145 KB), cached after first load.

**CoinGecko upstream calls do NOT scale with users** (everything is shared-cached):

| Action | Upstream CoinGecko calls |
|--------|--------------------------|
| Prices (top 250) | ~290/day total — same for 1k or 10k users |
| Prices (long tail) | flat, by distinct coins held (20-min shared cache) |
| Search (~3,000 coins) | ~12/day total (daily list refresh) — **0 per search** |
| DCA history | ~1 per coin per 7 days |

**Searching 10–20 coins per user:** each search is debounced and reads the **cached** coin list, so it makes **0 CoinGecko calls**. 10,000 users × 15 searches = 150,000 *search requests*, but these hit Firebase (function + Firestore read, CDN-cached 5 min), **not** CoinGecko — so CoinGecko search cost stays ~0. The only Firebase cost is cheap function invocations / Firestore reads, heavily reduced by the CDN.

# Adding coins (the ~3,000 list)

Search covers the **top ~3,000 coins by market cap** (`LIST_PAGES = 12`). So users can find and add coins at rank **#800, #1,200, #2,500**, etc. — just search the name or symbol. To cover more, raise `LIST_PAGES` in `functions/index.js`. (Anything outside the list can still be priced on-demand if held.)

---

# Security

Defense in depth across the whole app:

| Layer | Protection |
|-------|-----------|
| **Auth** | Firebase Auth (no plaintext passwords). Password reset doesn't reveal whether an account exists. |
| **Admin** | A verified Firebase **custom claim** (`{admin:true}`), set server-side — not an email list. |
| **Firestore rules** | Owner-only access; users can't change their own `tier`; counter-based plan limits; `/config` is server-only (no client read/write). Verified by `npm run test:rules`. |
| **Functions** | Callable functions enforce auth and act on the caller's uid (no IDOR). The PayPal webhook verifies signatures. |
| **Secrets** | API keys live only in the Cloud Function (env / `functions.config()` / the locked `config/app` doc). The Firebase web config is public by design. |
| **Bot / abuse** | `/api` has a **per-IP rate limit** (60/min). **Firebase App Check** (reCAPTCHA v3) protects Auth/Firestore/callable Functions when `VITE_RECAPTCHA_SITE_KEY` is set + enforcement is on. The landing email form has a honeypot. |
| **HTTP headers** | `firebase.json` sets CSP, `X-Frame-Options: DENY` (clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and HSTS on every response. |
| **XSS** | The React app auto-escapes (JSX); the static landing builds DOM with `textContent`, never `innerHTML`, for API data. |
| **Dependencies** | Production `npm audit` = 0 vulnerabilities. |

## Admin settings (API keys & email) — `saveConfig`

The admin **Settings** tab saves to a **locked** Firestore doc `config/app` via the admin-only `saveConfig` Cloud Function. Clients can never read it (rules deny `/config`); the proxy and PayPal functions read it server-side (`getConfig`, cached 5 min, with `functions.config()`/env fallback). So you can rotate the CoinGecko/PayPal keys and pick an email provider from the dashboard without redeploying.

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
