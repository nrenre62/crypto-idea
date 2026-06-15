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
- **Not yet split:** `CryptoIdea.jsx` (~1.1k lines, down from ~1.5k) still mixes UI +
  business logic (state, portfolio math, screen rendering). It will be peeled into
  `hooks/` (stateful logic) and `components/` (presentational screens) over subsequent
  commits. `admin-dashboard.jsx`, `education-page.jsx`, `pro-success.jsx` are UI that
  will move into `components/`.
- Multi-page Vite entries (`main.jsx`, `admin-main.jsx`) stay at the `src/` root.
