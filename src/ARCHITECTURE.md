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
    `timeBetween`), `coins.js` (reference data `TOP_COINS`/`PRICE_HISTORY` + the DCA
    price model `getHistoricalPrice`), and `theme.js` (visual tokens `c`, `inp_s`,
    `lbl_s`, `sb`).
  - `hooks/` — `useCoinSearch(sq)`, `useLivePrices(portfolio)`, `useAuthSession(...)` (auth
    watch + profile save; owns `user`/`dataLoaded`), and `app-context.js` (`AppContext` + `useApp()`).
  - `utils/storage.js` — `db` key/value wrapper over `window.storage` (JSON, error-swallowing).
  - `components/` — standalone page UIs (`education-page.jsx`, `pro-success.jsx`,
    `admin-dashboard.jsx`); shared primitives `ui.jsx` (`Ic`, `CI`, `hdr`) + `StatusDot.jsx`;
    and extracted screens `Loading.jsx`, `ForgotPass.jsx`, `Contact.jsx`, `Search.jsx`, `AddEntry.jsx`, `CoinInfo.jsx`, `Detail.jsx`, `Portfolio.jsx`+`PortfolioBar.jsx`, `Account.jsx`, `Login.jsx` (**all screens now extracted**). `src/` root now holds only the
    Vite entries (`main.jsx`, `admin-main.jsx`) and the main app shell `CryptoIdea.jsx`.
  - **Context for screens:** `CryptoIdea.jsx` wraps its render in `<AppContext.Provider value={ctx}>`;
    extracted screens read shared state/handlers via `useApp()` instead of 25+ props each. The
    `ctx` object grows as each screen migrates.
  - **Test net:** `tests/unit/` (Vitest, `npm run test:unit`) — both hooks + a `CryptoIdea`
    smoke test that renders the logged-out (login) and logged-in (portfolio) screens and the
    login→reset navigation, with `api/` mocked. Guards the remaining screen extractions.

## Screen-migration pattern (for each remaining screen)
Add the screen's deps to `ctx` in `CryptoIdea.jsx` → move its JSX to `components/<Screen>.jsx`
reading them via `useApp()` → render `<Screen/>` (NOT `Screen()` — a component using a hook
must be a real element, not a conditional function call) → add/extend a navigation test →
`npm run test:unit`.

- **All screens are now extracted.** `CryptoIdea.jsx` (down from ~1.56k lines) now holds only
  the auth/data-load + profile-save effects, portfolio CRUD + upgrade handlers, the `ctx`
  object, and the router shell — no inline screen JSX. **Next: §1b — pull that logic into
  hooks (`useAuthSession`/`usePortfolios`/`useUpgrade`).
  See [`../NEXT-STEPS.md`](../NEXT-STEPS.md) for the full checklist.**
- Multi-page Vite entries (`main.jsx`, `admin-main.jsx`) stay at the `src/` root.

## Known layer violations (audit)
The layered rules aren't fully satisfied yet — these are the gaps the migration is closing:
1. **Components doing fetch/logic:** `CryptoIdea.jsx` (calls `httpsCallable` for PayPal/GDPR;
   holds most state/logic) and `admin-dashboard.jsx` (calls Cloud Functions directly).
2. **State/logic not in hooks:** PARTIALLY CLOSED — the auth session (`user`/`dataLoaded` + auth
   effects) now lives in `useAuthSession`. Still in `CryptoIdea.jsx`: portfolio CRUD + the upgrade
   flow (next: `usePortfolios`, `useUpgrade`).
3. **`api/` not fetch-only:** `firebase-database.js`/`firebase-auth.js` also run counter/limit
   logic (`writeBatch`+`increment`) — really a data/model layer, not thin fetchers.
4. **Backend has no controller/service/model split:** `functions/index.js` colocates HTTP
   routing + external API calls + Firestore access in one file (a defensible serverless choice;
   split only if MVC separation is wanted — see NEXT-STEPS §2).
