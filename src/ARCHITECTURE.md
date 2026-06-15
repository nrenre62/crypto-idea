# `src/` architecture (layered)

We are migrating to a layered structure. **All new code follows this; existing
code is peeled into these layers incrementally (one verified commit at a time).**

```
src/
  api/          ← data fetching ONLY (Firebase SDK, CoinGecko /api/* fetches). No UI, no React.
  hooks/        ← business logic ONLY (state, portfolio/DCA math orchestration). React hooks, no JSX markup.
  components/   ← UI ONLY (presentational JSX). No fetching, no business rules — call hooks instead.
  utils/        ← pure helper functions (formatting, validation, math). No React, no I/O.
```

## Rules of thumb
- A **component** that needs data calls a **hook**; the hook calls **api/** and uses **utils/**.
- Never `fetch`/import the Firebase SDK directly from a component — go through `api/`.
- `utils/` must stay pure (same input → same output, no side effects) so it's trivially testable.

## Current state (migration in progress)
- **Done:**
  - `api/` — Firebase data layer (`firebase.config.js`, `firebase-auth.js`,
    `firebase-database.js`) + the backend `/api/*` fetches: `coingecko.js`
    (`fetchPrices`, `searchCoins`) and `config.js` (`fetchSiteConfig`). `CryptoIdea.jsx`
    no longer calls `fetch()` directly.
  - `utils/` — `format.js` (pure formatters: `fmtP`, `fmtMc`, `fmtPct`, `uid`, `fmtDT`,
    `timeBetween`) and `coins.js` (reference data `TOP_COINS`/`PRICE_HISTORY` + the DCA
    price model `getHistoricalPrice`).
  - `hooks/` — `useCoinSearch(sq)` (Add Coin search: built-in matches + debounced live
    results) and `useLivePrices(portfolio)` (mock-seeded prices, then 60s polling).
  - `components/` — the standalone page UIs: `education-page.jsx`, `pro-success.jsx`,
    `admin-dashboard.jsx`. `src/` root now holds only the Vite entries (`main.jsx`,
    `admin-main.jsx`) and the main app shell `CryptoIdea.jsx`.
- **Not yet split (the hard core):** `CryptoIdea.jsx` (~1.07k lines, down from ~1.56k)
  still holds the auth/data-load + profile-save effects, portfolio CRUD, the upgrade
  flow, and every screen rendered as an inline closure. These are tightly coupled to
  shared state (`user`, `screen`, `portfolios`, `activePortId`, `dataLoaded`) used
  throughout the render, so further extraction (`useAuthSession`, `usePortfolios`, and
  splitting the screens into `components/`) is real surgery, not a mechanical move —
  do it screen-by-screen with browser verification, ideally behind a test net.
- Multi-page Vite entries (`main.jsx`, `admin-main.jsx`) stay at the `src/` root.
