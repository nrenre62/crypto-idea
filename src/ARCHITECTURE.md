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
- **Done:** `api/` holds the Firebase data layer — `firebase.config.js`, `firebase-auth.js`,
  `firebase-database.js` — plus the backend `/api/*` fetches: `coingecko.js` (`fetchPrices`,
  `searchCoins`) and `config.js` (`fetchSiteConfig`). `CryptoIdea.jsx` no longer calls
  `fetch()` directly.
- **Not yet split:** `CryptoIdea.jsx` (~1.5k lines) still mixes UI + business logic (state,
  portfolio/DCA math). It will be peeled apart into `components/`, `hooks/`, and `utils/`
  over subsequent commits. `admin-dashboard.jsx`, `education-page.jsx`, `pro-success.jsx`
  are UI that will move into `components/`.
- Multi-page Vite entries (`main.jsx`, `admin-main.jsx`) stay at the `src/` root.
