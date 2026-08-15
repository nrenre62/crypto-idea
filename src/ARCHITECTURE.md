# `src/` architecture (layered)

Part of [System Architecture](../docs/decisions/ARCHITECTURE.md) — the `src/` layer detail.

The client is organized into four layers — `api/`, `hooks/`, `components/`, `utils/`. The system-level rules (ARCH-1…ARCH-17) live in the canonical hub above and win on architecture; this file details the `src/` layers and their current state.

The layered structure is in place: all code follows it, apart from the documented by-design exceptions and the one open violation below.

```text
src/
  api/          ← data fetching ONLY (Firebase SDK, CoinGecko /api/* fetches). No UI, no React.
  hooks/        ← business logic ONLY (state, portfolio/DCA math orchestration). React hooks, no JSX markup.
  components/   ← UI ONLY (presentational JSX). No fetching, no business rules — call hooks instead.
  utils/        ← pure helper functions (formatting, validation, math). No React, no I/O.
  data/         ← static reference/content modules (Learn content, plan benefits, mock data). No React, no I/O.
  features/     ← self-contained feature modules (the Research tab: its own components/hooks/utils/api/styles).
  styles/       ← global CSS (the app design system, admin-only styles).
```

## Rules of thumb

- A component that needs data calls a hook; the hook calls `api/` and uses `utils/`.
- Never `fetch` or import the Firebase SDK directly from a component — go through `api/`.
- `utils/` stays pure (same input → same output, no side effects) so it is trivially testable.
- The Vite entries (`main.jsx`, `admin-main.jsx`) and the main app shell (`CryptoIdea.jsx`) stay at the `src/` root.

## Layer contents

- `api/` — the data layer. Firebase config + auth + database (`firebase.config.js`, `firebase.admin.config.js`, `firebase-auth.js`, `firebase-database.js`), the backend `/api/*` fetchers (`coingecko.js`, `config.js`), and the callable wrappers that keep `httpsCallable` out of components (`account.js`, `admin.js`, `admin-auth.js`, `billing.js`). `billing.js` exposes `createSubscription({plan, billing})`, `cancelSubscription({downgradeTo})`, `scheduleProDowngrade({billing})`, and `resubscribePremium(...)`; `Login.jsx`'s buy button and `CryptoIdea.jsx`'s downgrade handlers route through it, never the SDK, so the marker stays server-authoritative.
- `hooks/` — business logic. `useCoinSearch`, `useLivePrices`, `useCoinHistory`, `useTrending`, `useAuthSession` (auth watch + profile save; owns `user`/`dataLoaded`), `usePortfolios` (owns `portfolios`/`activePortId` + `portfolio`), `useUpgrade` (tier-limit logic + the `TIER_LIMITS` table), `useLearn`, `useAdminDashboard` (the admin panel's data/actions), `useProSuccess` (read-only `/pro-success` state via `watchUserDoc`), `useIsDesktop`, and `app-context.js` (`AppContext` + `useApp()`).
- `components/` — UI. The extracted app screens (`Loading`, `ForgotPass`, `Contact`, `Search`, `AddEntry`, `CoinInfo`, `Detail`, `Portfolio` + `PortfolioBar`, `Account`, `Login`, `Journal`, `Learn`, `RestoreAccount`), standalone pages (`education-page.jsx`, `pro-success.jsx`, `admin-dashboard.jsx`), shared primitives (`ui.jsx`, `StatusDot.jsx`, `Modal.jsx`, `CoinIcon.jsx`, `HeaderTags.jsx`, `AnnouncementBanner.jsx`, `ErrorBoundary.jsx`, `SettingsPwReset.jsx`), and icon sets. All screens are extracted — `CryptoIdea.jsx` holds no inline screen JSX.
- `utils/` — pure helpers: `format.js`, `money.js`, `pnl.js`, `tx.js`, `usage.js`, `coins.js` (reference data + the DCA price model), `theme.js`, `storage.js` (the `db` key/value `localStorage` wrapper), `learn.js`, `journal.js`, `errors.js`, `csv.js`, `growth.js`, `status.js`, `trash.js`, `announcement.js`, `admin-views.js`, and the CSV exporters.
- `data/` — static content modules: `learn-content.js` + `learn/`, `journal-funnel.js`, `mock-conviction.js`, and `plan-benefits.js` (the single `PLAN_BENEFITS` source for the plan-picker cards, welcome screen, and `/pro-success`; `Login.jsx` re-exports it so `/pro-success` does not pull Login into its chunk).
- `features/` — the Research tab (`features/research/`), a self-contained module with its own `components/hooks/utils/api/styles`.

## Context for screens

`CryptoIdea.jsx` wraps its render in `<AppContext.Provider value={ctx}>`; extracted screens read shared state and handlers via `useApp()` instead of dozens of props each. What remains in `CryptoIdea.jsx` is the auth/data-load and profile-save effects, the live-sync effects (`watchCoins`, `watchUserDoc`), the portfolio CRUD and upgrade-overlay handlers (kept here by design — coupled to UI/form/auth state), the `ctx` object, and the router shell. The `useAuthSession`, `usePortfolios`, and `useUpgrade` hooks are extracted.

## Test net

`tests/unit/` (Vitest, `npm run test:unit`) covers the hooks and a `CryptoIdea` smoke test that renders the logged-out and logged-in screens plus the login→reset navigation, with `api/` mocked. Server-side pure modules under `functions/` are imported and unit-tested directly. Rules and data-layer/callable behavior are covered by `npm run test:rules` and `npm run test:integration`.

## Known layer exceptions and the open violation

Most of the layered rules are satisfied. The items below are documented by-design exceptions plus one genuine open violation. (Full status and the system rules: [`../docs/decisions/ARCHITECTURE.md`](../docs/decisions/ARCHITECTURE.md).)

1. Components doing fetch/logic: mostly closed. `CryptoIdea.jsx` no longer calls `httpsCallable` directly (GDPR export/delete live in `api/account.js`), and `admin-dashboard.jsx` is hook-driven via `api/admin.js` + `hooks/useAdminDashboard.js` — it imports no `firebase/*` or `httpsCallable`. What remains: `CryptoIdea.jsx` still holds the portfolio CRUD + upgrade orchestrators (a by-design exception, coupled to UI/auth state), and `components/education-page.jsx` still calls `fetch("/api/subscribe")` directly — the one open layer violation (the marketing email-capture form on the standalone `/edge` page).
2. State/logic not in hooks: partially closed. The auth session (`useAuthSession`), portfolios container (`usePortfolios`), and tier-limit logic (`useUpgrade`) are hooks. What stays in `CryptoIdea.jsx` is coupled to UI/form/auth state by design (KISS): the portfolio CRUD handlers and the upgrade-overlay flow orchestrators, which are shared with the auth/Login flow.
3. `api/` is not strictly fetch-only: `firebase-database.js`/`firebase-auth.js` also run counter/limit logic (`writeBatch`/`runTransaction` + `increment`, the write-failure classifier) — in practice a data/model layer, not thin fetchers.
4. The backend has no controller/service/model split: `functions/index.js` colocates HTTP routing, external API calls, and Firestore access in one file — a defensible serverless choice; split only if MVC separation is wanted.
