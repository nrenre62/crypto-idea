# `src/` architecture (layered)

> **System-level rules: see [`docs/decisions/ARCHITECTURE.md`](../docs/decisions/ARCHITECTURE.md) (canonical).**
> That file owns the whole-system shape (ARCH-1…ARCH-17) and wins on architecture; **this file details the
> `src/` layers** (`api`/`hooks`/`components`/`utils`) + their current state.

The layered structure is **in place: all code follows it, with a few documented by-design exceptions.**
**All new code follows the layer rules; the last extractions were peeled in one verified commit at a
time.** (History: this was a "migration in progress" — §1a/§1b/§1c are now complete.)

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

## Current state (layering done, with documented exceptions)
- **Done:**
  - `api/` — Firebase data layer (`firebase.config.js`, `firebase-auth.js`,
    `firebase-database.js`) + the backend `/api/*` fetches: `coingecko.js`
    (`fetchPrices`, `searchCoins`) and `config.js` (`fetchSiteConfig`). `CryptoIdea.jsx`
    no longer calls `fetch()` directly. The callable wrappers `account.js`, `admin.js`,
    `admin-auth.js` and **`billing.js`** (Plan B PR-B — `createSubscription({plan, billing})`)
    keep `httpsCallable` out of components: `Login.jsx`'s buy button imports `api/billing.js`,
    never the SDK directly.
  - `utils/` — `format.js` (pure formatters: `fmtP`, `fmtMc`, `fmtPct`, `uid`, `fmtDT`,
    `timeBetween`), `coins.js` (reference data `TOP_COINS`/`PRICE_HISTORY` + the DCA
    price model `getHistoricalPrice`), and `theme.js` (visual tokens `c`, `inp_s`,
    `lbl_s`, `sb`).
  - `hooks/` — `useCoinSearch(sq)`, `useLivePrices(portfolio)`, `useAuthSession(...)` (auth
    watch + profile save; owns `user`/`dataLoaded`), `usePortfolios()` (owns `portfolios`/
    `activePortId` + `portfolio`/`setPortfolio`), `useUpgrade({portfolios,setPortfolios})`
    (tier-limit logic: `calcEndDate`/`getTrimImpact`/`trimToTier` + the `TIER_LIMITS` table),
    **`useProSuccess()`** (Plan B PR-B — read-only: watches the caller's own user doc via
    `api/firebase-database.js` `watchUserDoc` and resolves the `/pro-success` page's waiting /
    confirmed / timeout / signed-out state; mutates nothing), and `app-context.js`
    (`AppContext` + `useApp()`).
  - `data/` — static reference/content modules (no React, no I/O): Learn content (`learn-content.js`
    + `learn/`), `journal-funnel.js`, `mock-conviction.js`, and **`plan-benefits.js`** (Plan B PR-B —
    the single `PLAN_BENEFITS` source for the plan-picker cards, welcome screen and the standalone
    `/pro-success` page; extracted out of `Login.jsx`, which now re-exports it, so `/pro-success`
    doesn't pull Login into its chunk).
  - `utils/storage.js` — `db` key/value wrapper over `localStorage` (JSON, error-swallowing; cleared on logout).
  - `components/` — standalone page UIs (`education-page.jsx`, `pro-success.jsx` — post-PR-B it holds
    presentation only, reading `hooks/useProSuccess.js` + `data/plan-benefits.js`, no fetch/SDK,
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
  the auth/data-load + profile-save effects, the portfolio CRUD + upgrade-overlay handlers (kept
  here by design — coupled to UI/form/auth state), the `ctx` object, and the router shell — no
  inline screen JSX. **§1b hooks (`useAuthSession`/`usePortfolios`/`useUpgrade`) are extracted.
  See [`../NEXT-STEPS.md`](../docs/product/NEXT-STEPS.md) for the remaining checklist (§1c).**
- Multi-page Vite entries (`main.jsx`, `admin-main.jsx`) stay at the `src/` root.

## Known layer exceptions & remaining gap (audit)
Most of the layered rules are satisfied; the items below are documented by-design exceptions plus one
genuine remaining gap. (Full status + the system rules: [`docs/decisions/ARCHITECTURE.md`](../docs/decisions/ARCHITECTURE.md).)
1. **Components doing fetch/logic:** MOSTLY CLOSED — `CryptoIdea.jsx` no longer calls `httpsCallable`
   directly (GDPR export/delete now in `api/account.js`), and **`admin-dashboard.jsx` is now hook-driven**
   via `api/admin.js` + `hooks/useAdminDashboard.js` — it imports no `firebase/*`/`httpsCallable` (fixed in
   `df83e51`). What remains: `CryptoIdea.jsx` still holds the CRUD + upgrade orchestrators (a documented
   by-design exception, coupled to UI/auth state), and **`components/education-page.jsx` still calls
   `fetch("/api/subscribe")` directly** — the one real open violation, tracked as `ARCH-DOC-FIX-2`.
2. **State/logic not in hooks:** PARTIALLY CLOSED — the auth session (`useAuthSession`),
   portfolios state container (`usePortfolios`), and tier-limit logic (`useUpgrade`) now live in
   hooks. What remains in `CryptoIdea.jsx` is coupled to UI/form/auth state by design (KISS):
   portfolio CRUD handlers and the upgrade-overlay flow orchestrators (`startUpgrade`/downgrade,
   shared with the auth/Login flow) — see the `usePortfolios`/`useUpgrade` header comments.
3. **`api/` not fetch-only:** `firebase-database.js`/`firebase-auth.js` also run counter/limit
   logic (`writeBatch`+`increment`) — really a data/model layer, not thin fetchers.
4. **Backend has no controller/service/model split:** `functions/index.js` colocates HTTP
   routing + external API calls + Firestore access in one file (a defensible serverless choice;
   split only if MVC separation is wanted — see NEXT-STEPS §2).
