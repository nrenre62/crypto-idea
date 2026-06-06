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
