# Data-Flow Traces

Part of [System Architecture](../decisions/ARCHITECTURE.md) — the runtime data-flow detail.

Ordered, file-by-file traces for the three core user actions, across the layers component → hook → api → backend → Firestore/rules. "Idea" = a coin held in a portfolio. Traces are verified against `src/api/firebase-database.js`, the live sync watchers, and the `/api` handlers in `functions/index.js`.

## 1. User adds a new idea (coin + first buy)

Files touched, in order:

- `components/Search.jsx` → `hooks/useCoinSearch.js` → `api/coingecko.js` → `functions/index.js` (`search`) → `CryptoIdea.jsx` (`addCoin`) → `api/firebase-database.js` (`addCoin`) → `firestore.rules`
- then the entry: `components/Detail.jsx` → `components/AddEntry.jsx` → `CryptoIdea.jsx` (`addEntry`) → `api/firebase-database.js` (`addTransaction`) → `firestore.rules`

### Sub-flow A — search and select the coin

1. `components/Search.jsx` — the user types; the query flows into context.
2. `CryptoIdea.jsx` calls `useCoinSearch(query)`.
3. `hooks/useCoinSearch.js` — instant local match against `TOP_COINS` (offline), then a 300 ms debounce before live results.
4. `api/coingecko.js` `searchCoins(q)` → `GET /api/search?q=…` (same-origin proxy; returns `null` on error, never throws).
5. `functions/index.js` (`api` handler, `search` action) — `getUniverse()` reads the Firestore `cache/universe` doc (refreshing from CoinGecko if stale), filters the ~3,000 coins by id/name/symbol, sorts by rank, and returns the top 25. Sends `Cache-Control: public, max-age=300`.
6. `hooks/useCoinSearch.js` — merges live results with the local list (deduped) → rendered in `components/Search.jsx`.
7. The user taps to add → `addCoin(coin)` from context.

### Write #1 — the coin

8. `CryptoIdea.jsx` `addCoin()` — guards (not already held, under the coin cap, `user.uid` present) → calls `api/firebase-database.js` `addCoin(uid, activePortId, coinData, journal, limit)`. An optional `journal` (thesis) is written on the coin when the user fills the Buy-Journal prompt.
9. `api/firebase-database.js` `addCoin()` — runs a `runTransaction` (DI-3 guard): if the coin doc already exists it does nothing and returns `already-exists` (never overwrites the journal, never inflates the counter); otherwise it `set`s the coin doc at `users/{uid}/portfolios/{pid}/coins/{coinId}` with `txCount:0` and `increment`s the parent portfolio's `coinCount`. Field values are defensively clamped (symbol 20 / name 64 / thumb 512) to mirror the rule bounds. On `permission-denied` it calls `classifyLimitDenied()` — a fresh server re-read that returns the REAL reason (`limit` / `missing-target` / `invalid-or-denied`), so the upgrade toast fires only at a genuine cap.
10. `firestore.rules` — the `coins` create rule authorizes: `isOwner` + `isChosen` (onboard gate) + `validCoinData()` + `txCount==0` + parent `coinCount` moved by exactly +1 + `coinCount <= maxCoins` (read from `config/app.plans`).
11. `CryptoIdea.jsx` — optimistic local update, navigates back to the portfolio, clears the search.

### Sub-flow B — first buy entry

12. `components/Detail.jsx` — tap to buy → presets type/price (auto-filled from history)/date → opens the AddEntry screen.
13. `components/AddEntry.jsx` — amount/price/date inputs; a date change re-auto-fills the historical price; Submit is disabled until amount and price are finite and positive → `addEntry()`.
14. `CryptoIdea.jsx` `addEntry()` — guards (`txCount` under the per-coin cap, sell-validation when selling, `user.uid` present, not offline) → `api/firebase-database.js` `addTransaction(uid, pid, coinId, txData, limit)`.
15. `api/firebase-database.js` `addTransaction()` — a `writeBatch`: `set`s the tx doc at `…/coins/{coinId}/transactions/{txId}` and `increment`s the coin's `txCount` → `commit()`, returns the new id. On `permission-denied` it runs `classifyLimitDenied()` on the coin's `txCount`.
16. `firestore.rules` — the `transactions` create rule: `isOwner` + `isChosen` + `validTransactionData()` (type ∈ buy/sell, amount > 0, price ≥ 0) + coin `txCount` moved by +1 + `txCount <= maxTx`.
17. `CryptoIdea.jsx` — optimistic update with the returned id → returns to the Detail screen.

Submission writes directly to Firestore (no Cloud Function). Only the search step touches the backend. Limits are enforced twice — a client guard and the security rules. Deletes never decrement the counters client-side (a decrement is forbidden by `counterNoForge` in `firestore.rules`); the count is left fail-safe-high and reconciled by a trusted server callable.

## 2. User views their portfolio

Files touched, in order:

- `main.jsx` → `CryptoIdea.jsx` → `hooks/useAuthSession.js` → `api/firebase-auth.js` (`onAuthChange`) → `api/firebase-database.js` (`getUserProfile` → `getPortfolios` → `getCoins`/`getCoinsMeta`) → `firestore.rules` → `hooks/usePortfolios.js` → `CryptoIdea.jsx` (ctx) → `components/Portfolio.jsx` → `components/PortfolioBar.jsx`

1. `src/main.jsx` — the router lazy-loads the app bundle; `<Suspense fallback={<Loading/>}>` shows the spinner.
2. `CryptoIdea.jsx` mounts — `screen="loading"`; `usePortfolios()` seeds a default in-memory portfolio; `useAuthSession(...)` is wired with injected collaborators (`setScreen`, `setPortfolios`, `setActivePortId`, `checkSubscriptionStatus`, `saveProfile`, `onSignedOut`, `setPortfoliosError`, `onLiveSyncError`) held in a ref.
3. `hooks/useAuthSession.js` — the mount effect subscribes via `onAuthChange()`.
4. `api/firebase-auth.js` `onAuthChange()` — wraps `onAuthStateChanged`; fires with the signed-in user.
5. `useAuthSession.js` callback — reads the non-authoritative local cache (`ci-profile-{uid}`: settings + last-known tier) AND `api/firebase-database.js` `getUserProfile(uid)` for the server-authoritative fields (`tier`, `subscription`, `planChosen`, `deleted`/`deletedAt`, `settings`, `premiumLimits`); the server wins. `getUserProfile` retries a transient post-sign-in `permission-denied` and re-reads a partial (`tier`-less) doc. It assembles `baseUser`.
6. `useAuthSession.js` — the ONBOARD-GATE check: a user who has not recorded a plan choice (`planChosen !== true` AND `tier === "free"`) has no readable data (`isChosen` in `firestore.rules` denies every portfolio read), so the load and live listener are skipped and the plan gate renders. Otherwise it calls `loadPortfolios(uid)`.
7. `loadPortfolios()` → `api/firebase-database.js` `getPortfolios(uid)` — reads `users/{uid}/portfolios` `orderBy("order")` (retries a transient failure; a hard failure raises the "Couldn't load / Retry" screen via `setPortfoliosError`, never the phantom default). Rules: portfolios `read` if `isOwner`.
8. Lazy load (PLAN-LIMITS-MAX Part B): it reads the saved `ci-active-port` first, loads only the ACTIVE portfolio FULL → `getCoins(uid, pid)` (reads `…/coins`, then each coin's `…/coins/{coinId}/transactions` `orderBy("date","desc")` onto `coin.entries`, `txLoaded:true`), and loads every OTHER portfolio META-ONLY → `getCoinsMeta(uid, pid)` (coins + persisted `txCount`, zero transaction reads, `entries:[]`, `txLoaded:false`). A saved `coinOrder` is carried through. This bounds the app-open read cost to the active portfolio's transactions. Rules: coins + transactions `read` if `isOwner`.
9. `useAuthSession.js` — `setPortfolios(loaded)`; sets `activePortId` to the saved active (or the first portfolio); subscribes `watchPortfolios(uid, …)` to keep the portfolio LIST live across devices (an `onError` surfaces a toast). If the account has zero portfolio docs it self-heals by recreating the default via `createPortfolio`.
10. `CryptoIdea.jsx` — `checkSubscriptionStatus(baseUser)` applies any expiry/grace downgrade; `setUser(checked)`; `setScreen("portfolio")`; `setDataLoaded(true)`.
11. `hooks/usePortfolios.js` — derives the active `portfolio` (the coins of `portfolios.find(id === activePortId)`).
12. `CryptoIdea.jsx` — computes total value (Σ holdings × `prices[id].usd`), invested, and P&L; builds `ctx`; `useLivePrices` kicks off (see flow 3); a `watchCoins` effect keeps the ACTIVE portfolio's coins + transactions live (re-reading only changed coins), flipping `txLoaded:true` when they arrive; a `watchUserDoc` effect keeps the server-authoritative user doc (tier/subscription/settings/premiumLimits/deleted) live so an admin or sweep change reaches an open session without a reload.
13. `components/Portfolio.jsx` — reads ctx via `useApp()`; renders the value card (invested / 24h / assets), the live status, and the asset grid. A whole-card tap opens the Detail screen; the coin icon opens the CoinInfo overlay (Edit/Delete live on Detail — swipe is retired).
14. `components/PortfolioBar.jsx` — renders the switcher when there is more than one portfolio (or a paid tier); tapping a tab sets `activePortId` → re-derive and re-render. Switching to a lazily-loaded portfolio subscribes `watchCoins`, which reads its transactions and flips `txLoaded:true`; until they arrive the value card shows a "Loading…" placeholder (never a wrong or zero P&L).

State path: `screen` loading→portfolio · `user` null→object · `portfolios` default→Firestore data · `dataLoaded` false→true. Reads at open: portfolios + coins for every portfolio, but transactions for the ACTIVE portfolio only (Part B lazy-load); all gated by the same `isOwner` + `isChosen` rules.

## 3. Prices auto-refresh

Files touched, in order:

- `hooks/useLivePrices.js` → `CryptoIdea.jsx` → `api/coingecko.js` → `functions/index.js` (`prices` → `getUniverse`/`refreshUniverse` → on-demand fold) → Firestore `cache/universe` → back to `useLivePrices.js` → `CryptoIdea.jsx` (ctx) → `components/StatusDot.jsx` + `components/Portfolio.jsx`/`components/Detail.jsx`

1. `hooks/useLivePrices.js` (mount) — seeds mock prices from `TOP_COINS` so the UI is never empty; marks the source `demo`.
2. `CryptoIdea.jsx` — `const {prices, api} = useLivePrices(portfolio)`; `api` flows into ctx.
3. `useLivePrices.js` (effect, dep `[portfolio]`) — builds `ids = portfolio.map(c => c.id).join(",")`; calls the fetch immediately, then `setInterval(f, 60000)` (a 60 s poll).
4. `useLivePrices.js` → `api/coingecko.js` `fetchPrices(ids)` → `GET /api/prices?ids=…` (returns `null` on error, never throws).
5. `functions/index.js` (`api` handler, `prices` action) — caps ids at 500; `getUniverse()`.
6. `functions/index.js` `getUniverse()` — reads Firestore `cache/universe`; if older than the 5-min TTL it calls `refreshUniverse()` (else serves cache, even stale on upstream failure). CoinGecko is only ever reached through `cgFetch()`, the single choke point where the `marketData` kill-switch is enforced.
7. `functions/index.js` `refreshUniverse()` — fetches CoinGecko `/coins/markets` (up to ~3,000 coins, metadata + price). A complete refresh replaces `cache/universe` (pruning delisted coins); a partial one (429) merges so the universe never shrinks.
8. The handler builds the response from the universe cache. A coin is served from cache only if its price is fresh (`HOT_TTL` = 5 min — the hot top-~1,250 refreshed by `refreshPrices`); a stale long-tail or missing coin is pushed to `stale[]`. An id NOT in the universe is ignored (denial-of-wallet guard) — never fetched.
9. Stale/off-list coins: `stale[]` → one CoinGecko `/simple/price` fetch → merged into the response AND folded back into `cache/universe` (metadata preserved; price-only off-list entries are skipped by search/coinlist and pruned by the daily refresh). Cost is flat by distinct coins held, not by user count.
10. The handler sets `Cache-Control: public, max-age=120` (a 2-min browser/CDN cache) → `res.json(out)`. Each coin carries `{ usd, usd_24h_change, usd_market_cap, usd_24h_vol, circulating, usd_market_cap_rank }`.
11. `api/coingecko.js` `fetchPrices` — returns the parsed response object as-is (`{ id: { usd, … }, … }`) or `null`.
12. `useLivePrices.js` — on data, merges into `prices` (keeping prior entries) and flips the source `demo → live`.
13. `CryptoIdea.jsx` — re-renders; recomputes total value and P&L; updates ctx.
14. `components/StatusDot.jsx` — reads the source; green pulsing LIVE vs yellow OFFLINE.
15. `components/Portfolio.jsx` / `components/Detail.jsx` — re-render with fresh prices and 24h change.
16. Loop: every 60 s → back to step 4.

Caching makes upstream cost flat regardless of user count: one shared server-side `cache/universe` doc (5-min freshness) plus the browser/CDN cache (2 min). Scheduled pub/sub functions (`refreshPrices` every 5 min, `refreshUniverseDaily` daily) warm it in production.

## See also

- [System Architecture](../decisions/ARCHITECTURE.md) — the canonical system shape (ARCH-1…ARCH-17).
- [Security model](../security/SECURITY.md) — the rules boundary, IDOR/denial-of-wallet guards, and secret flow this trace relies on.
- [Docs index](../INDEX.md) — the documentation hub.
