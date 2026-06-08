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
| `GET /api/prices?ids=a,b,c` | Live prices for held coins | Served from a single shared `cache/markets` Firestore doc (top-N coins, refreshed every 5 min). Coins outside the top-N use a rare on-demand call. |
| `GET /api/search?q=term` | Search any of the top-N coins | Reads `cache/markets` — **zero per-search upstream calls**. Only established (top-ranked) coins appear, which naturally excludes brand-new micro-caps. |
| `GET /api/history?id=coin` | Full daily price history (for DCA) | Cached per-coin in `historyCache/{coin}` for 7 days — fetched **once per coin**, reused for every date range and every user. |

### How prices + search share one dataset
A single CoinGecko endpoint — `coins/markets` — returns the coin **list + prices + images + rank** together. One call covers 250 coins. `refreshMarkets()` stores that in the shared `cache/markets` doc, so both prices and search read from it. On the free tier this also auto-refreshes on demand if the scheduled function isn't running.

### Tunables (top of the CoinGecko section in `functions/index.js`)
- `MARKET_PAGES` — coins covered. `1` = top 250 (1 call/refresh), `4` = top 1000 (4 calls/refresh).
- `MARKETS_TTL` — price freshness (default 5 min).
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
