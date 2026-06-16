# Data-Flow Traces

> Generated 2026-06-16. Exact ordered file-by-file traces for three core actions, across the
> layers: component → hook → api → backend → Firestore/rules. "Idea" = a coin in a portfolio.
> File order and function names are verified against the code; a few line numbers are approximate.

---

## 1. User adds a new idea (coin + first buy)

**Files touched, in order:**
`Search.jsx` → `useCoinSearch.js` → `coingecko.js` → `functions/index.js` (search) → `CryptoIdea.jsx` (`addCoin`) → `firebase-database.js` (`addCoin`) → `firestore.rules` → *(then the entry)* → `Detail.jsx` → `AddEntry.jsx` → `CryptoIdea.jsx` (`addEntry`) → `firebase-database.js` (`addTransaction`) → `firestore.rules`

### Sub-flow A — search & select the coin
1. `components/Search.jsx` — user types; `setSq(query)` into context.
2. `CryptoIdea.jsx` → `useCoinSearch(sq)` invoked.
3. `hooks/useCoinSearch.js` — instant local match against `TOP_COINS` (offline), then **debounce 300 ms** for live results.
4. `api/coingecko.js` → `searchCoins(q)` → `GET /api/search?q=…` (same-origin proxy).
5. `functions/index.js` (`api` handler, `search` action) — `getCoinList()` reads the Firestore `cache/coinlist` doc (or fetches CoinGecko if stale), filters ~3,000 coins, returns top 25.
6. `useCoinSearch.js` — merges live results with local list (deduped) → renders in `Search.jsx`.
7. User taps **+ Add** → `addCoin(coin)` from context.

### Write #1 — the coin
8. `CryptoIdea.jsx` `addCoin()` — guards: not already held, `portfolio.length < maxCoins`, `user.uid` exists → calls `dbAddCoin(uid, activePortId, {...})`.
9. `api/firebase-database.js` `addCoin()` — `writeBatch`: `set` coin doc at `users/{uid}/portfolios/{pid}/coins/{coinId}` (`txCount:0`) **+** `increment(coinCount)` on the parent portfolio → `commit()`.
10. `firestore.rules` — `coins` create rule authorizes: `isOwner` + `validCoinData()` + `txCount==0` + parent `coinCount` moved by exactly +1 + `coinCount <= maxCoins` (reads `config/app.plans`).
11. `CryptoIdea.jsx` — **optimistic** `setPortfolio([...p, coin])`, `setScreen("portfolio")`, clear search.

### Sub-flow B — first buy entry
12. `components/Detail.jsx` — tap **+ Buy** → presets type/price (autofilled via `getHistoricalPrice`)/date → `setScreen("addEntry")`.
13. `components/AddEntry.jsx` — amount/price/date inputs; date change re-autofills historical price; submit disabled until amount+price present → `addEntry()`.
14. `CryptoIdea.jsx` `addEntry()` — guards: `txCount < maxTxPerCoin`, sell-validation if selling, `user.uid` → `dbAddTransaction(uid, pid, coinId, txData)`.
15. `api/firebase-database.js` `addTransaction()` — `writeBatch`: `set` tx doc at `…/coins/{coinId}/transactions/{txId}` **+** `increment(txCount)` on the coin → `commit()`, returns new `id`.
16. `firestore.rules` — `transactions` create rule: `isOwner` + `validTransactionData()` (type∈buy/sell, amount>0, price≥0) + coin `txCount` +1 + `txCount <= maxTx`.
17. `CryptoIdea.jsx` — optimistic update of `portfolio`/`sel` with returned id → `setScreen("detail")`.

> Note: submission writes **directly to Firestore** (no Cloud Function). Only the *search* touches the backend. Limits are enforced twice — client guard **and** security rules.

---

## 2. User views their portfolio

**Files touched, in order:**
`main.jsx` → `CryptoIdea.jsx` → `useAuthSession.js` → `firebase-auth.js` (`onAuthChange`) → `firebase-database.js` (`getPortfolios` → `getCoins` → transactions) → `firestore.rules` → `usePortfolios.js` → `CryptoIdea.jsx` (ctx) → `Portfolio.jsx` → `PortfolioBar.jsx`

1. `src/main.jsx` — Router lazy-loads the app bundle; `<Suspense fallback={<Loading/>}>` shows the spinner.
2. `CryptoIdea.jsx` mounts — `screen="loading"`; `usePortfolios()` seeds a default in-memory portfolio; `useAuthSession()` wired with collaborators (`setScreen`/`setPortfolios`/`setActivePortId`/`checkSubscriptionStatus`/`saveProfile`) via a ref.
3. `hooks/useAuthSession.js` — mount effect subscribes via `onAuthChange()`.
4. `api/firebase-auth.js` `onAuthChange()` — wraps `onAuthStateChanged`; fires with the signed-in user.
5. `useAuthSession.js` callback — reads non-sensitive profile from local storage, assembles `baseUser`, calls `loadPortfolios(uid)`.
6. `useAuthSession.js` `loadPortfolios()` → `api/firebase-database.js` `getPortfolios(uid)` — **read** `users/{uid}/portfolios` `orderBy("order")`.
   → `firestore.rules`: portfolios `read` allowed if `isOwner`.
7. For each portfolio → `firebase-database.js` `getCoins(uid, pid)` — **read** `…/coins`; then for each coin, **read** `…/coins/{coinId}/transactions` `orderBy("date","desc")` → mapped onto `coin.entries`.
   → `firestore.rules`: coins + transactions `read` allowed if `isOwner`.
8. `useAuthSession.js` — `setPortfolios(loaded)`; restore `activePortId` from local storage (or first portfolio); `setUser(checkSubscriptionStatus(baseUser))`; `setScreen("portfolio")`; `setDataLoaded(true)`.
9. `hooks/usePortfolios.js` — derives the **active** `portfolio` (`portfolios.find(id===activePortId).coins`).
10. `CryptoIdea.jsx` — computes `tv` (total value = Σ holdings × `prices[id].usd`), `totalBuys`, `tpnl`/`tpp`; builds `ctx`; (`useLivePrices` kicks off — see flow 3).
11. `components/Portfolio.jsx` — `useApp()` reads ctx; renders header (total value / invested / P&L / live status) and the asset list (per-coin holdings, price, 24h change, swipe edit/delete).
12. `components/PortfolioBar.jsx` — renders the switcher if >1 portfolio or Pro; tapping a tab `setActivePortId(p.id)` → re-derive & re-render.

> State path: `screen` loading→portfolio · `user` null→object · `portfolios` default→Firestore data · `dataLoaded` false→true. **Three Firestore reads** (portfolios, coins, transactions), all gated by the same `isOwner` rule.

---

## 3. Prices auto-refresh

**Files touched, in order:**
`useLivePrices.js` → `CryptoIdea.jsx` → `coingecko.js` → `functions/index.js` (`prices` action → `getMarkets`/`refreshMarkets` → long-tail) → Firestore `cache/*` → back to `useLivePrices.js` → `CryptoIdea.jsx` (ctx) → `StatusDot.jsx` + `Portfolio.jsx`/`Detail.jsx`

1. `hooks/useLivePrices.js` (mount) — seeds **mock prices** from `TOP_COINS` so the UI isn't empty; `setApi("demo")`.
2. `CryptoIdea.jsx` — `const {prices, api} = useLivePrices(portfolio)`; `api` flows into ctx.
3. `useLivePrices.js` (effect, dep `[portfolio]`) — builds `ids = portfolio.map(c=>c.id).join(",")`; calls `f()` **immediately**, then `setInterval(f, 60000)` — **60 s poll**.
4. `useLivePrices.js` `f()` → `api/coingecko.js` `fetchPrices(ids)` → `GET /api/prices?ids=…` (returns `null` on error, no throw).
5. `functions/index.js` (`api` handler, `prices` action) — caps ids (≤500); `getMarkets()`.
6. `functions/index.js` `getMarkets()` — reads Firestore `cache/markets`; if older than **5-min TTL**, calls `refreshMarkets()` (else serves cache, even stale on failure).
7. `functions/index.js` `refreshMarkets()` — `fetch` CoinGecko `/coins/markets` (top-250, with key) → writes `cache/markets` with fresh `updatedAt`.
8. Handler builds response from the top-250 cache; coins not found → `missing[]`.
9. **Long-tail:** reads `cache/longtail`; per-coin **20-min TTL** — fresh ones served from cache, stale/missing → `toFetch[]` → `fetch` CoinGecko `/simple/price` → merge into response **+** update `cache/longtail`.
10. Handler sets `Cache-Control: public, max-age=120` (browser caches 2 min) → `res.json(out)`.
11. `coingecko.js` — parses response, returns `{ id: {usd, usd_24h_change, usd_market_cap}, … }`.
12. `useLivePrices.js` — `if (d) { setPrices(p => ({...p, ...d})); setApi("live") }` (merge keeps prior, **demo→live** flips here).
13. `CryptoIdea.jsx` — re-renders; recomputes `tv`/`tpnl`; updates ctx.
14. `components/StatusDot.jsx` — reads `api`; green pulsing **LIVE** vs yellow **OFFLINE**.
15. `components/Portfolio.jsx` / `Detail.jsx` — re-render with fresh prices & 24h change.
16. **Loop:** every 60 s → back to step 4.

> Caching makes upstream cost flat regardless of user count: server-side `cache/markets` (5 min) +
> `cache/longtail` (20 min, shared) + browser CDN (2 min). Scheduled pub/sub functions
> (`refreshMarkets`/`refreshCoinList`) also warm these caches in prod.
