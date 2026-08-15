# CryptoIdea — DCA Calculator

The dollar-cost-averaging (DCA) calculator is the free interactive tool embedded in the marketing landing page. A visitor picks any coin, an amount, a cadence and a date range, and sees what regularly buying that amount would be worth today — invested vs. value, profit/loss, return, coins accumulated, and average buy price.

It is the only DCA calculator in the product. It doubles as SEO / lead-gen: it is genuinely useful, requires no signup, and by design costs roughly zero backend calls per visitor. The method is captured as a reusable pattern in the `crypto-calculator` skill.

The markup lives in [`index.html`](../../index.html) (section `#dca`); the logic is an external script, [`public/landing.js`](../../public/landing.js) (the `DCA Calculator` IIFE), loaded via `<script src="/landing.js">`. Keeping the script external satisfies the strict content-security policy, which forbids inline scripts. The backend endpoints are `/api/coinlist` and `/api/history` in [`functions/index.js`](../../functions/index.js).

## Design goal: flat cost regardless of traffic

A naive calculator calls a price API on every keystroke and every calculation — cost scales with visitors and gets rate-limited fast. This one is built so thousands of visitors add roughly zero function invocations, via three moves:

1. Load the coin list once, search client-side. On first focus the page fetches the full coin universe from `/api/coinlist` (names, symbols, icons, rank, last price and 24h change) and filters it locally as the user types — no per-keystroke backend call. The endpoint is CDN-cached for 24 hours, so the list is served from the edge, not the function.
2. Fetch history once per coin, reuse it for everything. A calculation fetches only `/api/history?id=<coin>` — the full daily price series. The same series serves every date range and every visitor, and it is cached both server-side (Firestore, 30 days) and on the CDN (24 hours).
3. Never call CoinGecko from the browser. All upstream calls go through the cached proxy, so upstream cost is a function of distinct coins viewed, not of visitors.

The heavy lifting (large-universe search, multi-range backtests) happens in the browser on data already cached at the edge.

## The user flow

```text
focus coin input ──► loadCoins() ──► GET /api/coinlist (once, CDN 24h) ──► client-side filter
        │
   pick a coin (sets `sel`) ─┐
   type an amount  ──────────┤──► calc() auto-runs (no "Calculate" button)
   change cadence/dates ─────┘
        │
   calc() ──► getHist(coin) ──► GET /api/history (once per coin) ──► DCA math ──► render results
```

- No submit button. `calc()` runs automatically on coin selection, on cadence change, on date change, and (debounced ~350 ms) on amount input, plus once on load. Inputs are validated first (coin chosen, amount > 0, start before end) with inline messages in `#dcaMsg`.
- Per-coin memo. `hCache[id]` keeps a fetched series in memory so re-running with different dates or amounts does not refetch.

## The DCA math (`calc()`)

Given a `hist` array of `[timestampMs, priceUSD]` points (sorted ascending):

1. Generate buy dates — `genDates(start, end, freq)` steps from `start` to `end`: `daily` +1 day, `weekly` +7 days, `biweekly` +14 days, `monthly` +1 month. The start is clamped to the first date history actually covers.
2. For each buy date, find the nearest price — minimum `|hist[j][0] − date|` (nearest-neighbour match, so a buy date that falls between two daily points uses the closest one).
3. Accumulate — for each valid price: `coins += amount / price`, `invested += amount`, `buys++`.
4. Final metrics at the latest price `nowP = hist[last][1]`:
   - `value  = coins × nowP`
   - `profit = value − invested`
   - `roi    = invested > 0 ? profit / invested × 100 : 0` (percent)
   - `avg    = coins > 0 ? invested / coins : 0` (average cost per coin)

Money formatting (`money()`) scales precision to magnitude: `≥ $1,000` renders with no decimals, `≥ $1` with 2 decimals, and `< $1` with 4 decimals (8 for sub-$0.0001 micro-caps). `null` or `NaN` renders as `$0`.

The nearest-price match is an inner loop over the whole history per buy date — O(dates × points). For the real data sizes (a few thousand points each) it runs instantly client-side, so it is left plain. Because the series is already sorted, a two-pointer or binary search would make it O(n) if a much larger series ever mattered.

## Resilience: offline estimate + timeout

`fetch()` has no default timeout. If `/api/history` hangs (connection open, no response, no error), the promise never settles and the calculator would be stuck mid-calculation with no feedback. `getHist()` guards against this:

```js
function getHist(id){
  if(hCache[id]) return Promise.resolve(hCache[id]);
  var ctrl = new AbortController(), to = setTimeout(function(){ ctrl.abort(); }, 12000);
  return fetch('/api/history?id=' + encodeURIComponent(id), { signal: ctrl.signal })
    .then(r => r.ok ? r.json() : { prices: [] })
    .then(d => { var p = (d && d.prices && d.prices.length) ? d.prices : fbHist(id); hCache[id] = p; return p; })
    .catch(() => { histDegraded = true; return fbHist(id); })   // timeout/network → offline estimate
    .then(function(p){ clearTimeout(to); return p; });
}
```

- A 12-second `AbortController` timeout aborts a hang so it can be caught.
- On timeout, network error, or an empty response, the code falls back to the built-in estimate `fbHist(id)`. The calculation still completes; the user is told via `#dcaMsg`: "Live price data was slow to load — showing an offline estimate."
- The fallback is not cached (only real responses populate `hCache`), so a later attempt can reach a recovered API.
- The estimate (`FB_PRICES` → `fbHist`) is approximate month-end USD prices for the five majors (BTC, ETH, SOL, ADA, XRP), mapped to `[Date.UTC(2021, i, 1), price]` points. Coins outside that set return an empty series, so the calculation shows the friendly "No historical data available in offline demo mode" note. The same `FB_COINS`/`FB_META` also back the search box when `/api/coinlist` itself fails, so the tool is never fully dead.

History values degrade to an estimate, never to `NaN` — a missing or odd point never breaks the math.

## Backend endpoints (the cached proxy)

Both endpoints live in [`functions/index.js`](../../functions/index.js) and serve from a shared cache so cost is flat. CDN caching is a deployed-Hosting behaviour — the local dev server invokes the function every time, so the "roughly zero calls per visitor" effect is only observable after deploy.

| Endpoint | Serves | Server cache | Response `Cache-Control` |
|---|---|---|---|
| `GET /api/coinlist` | full coin list + last price and 24h change (for client-side search) | shared `cache/universe` doc | `public, max-age=86400, s-maxage=86400` (24 h) |
| `GET /api/history?id=<coin>` | full daily price series for one coin | per-coin `historyCache/{coin}`, `HISTORY_TTL` = 30 days | `public, max-age=86400` (24 h) |

- The universe cache (`cache/universe`, one shared document) is refreshed by scheduled functions — `refreshPrices` every 5 minutes (hot top coins) and `refreshUniverseDaily` every 24 hours (the full list, pruning delisted coins). The DCA list just reads it, then skips price-only off-list entries with no metadata and sorts by rank.
- History is fetched from CoinGecko once per coin per 30 days and reused for all ranges and all users. Without an API key it covers the last 365 days; with a key it requests the full range (`days=max`), falling back to 365 days if the wider request fails.
- `/api/history` is gated for cost safety: it only fetches history for a coin that is actually in the shared universe. An unrecognised id returns an empty series (and is CDN-cached), so a loop of novel ids cannot fan out into repeated upstream calls. A real-but-failed lookup is negative-cached briefly (`HISTORY_NEG_TTL`) so a temporarily-unavailable coin retries sooner without hammering upstream on every request.

## Reused inside the app

The app's research and buy flow reuses the same cached `/api/history` (no second data source):

- [`src/hooks/useCoinHistory.js`](../../src/hooks/useCoinHistory.js) + [`src/api/coingecko.js`](../../src/api/coingecko.js) `fetchHistory(id)` — auto-fills a buy-date price from real history (falling back to a built-in estimate when null), backed by an LRU-capped module-level cache (`HISTORY_CACHE_MAX` = 50 coins) so re-selecting a coin does not refetch.
- [`src/features/research/utils/priceAdapter.js`](../../src/features/research/utils/priceAdapter.js) — pure `deriveFromHistory()` (7d/30d change and sparkline) and `buildResearchPrices()`, which degrade to `0%`, never `NaN`. Covered by [`tests/unit/research-adapters.test.js`](../../tests/unit/research-adapters.test.js).

## Testing & verification

- The landing calculator lives in an external script that is not an importable module, so it has no unit test; it is exercised end-to-end in the browser. The reusable history and price adapters it shares with the app are unit-tested (`research-adapters.test.js`).
- The timeout and fallback path is verified in-browser by stubbing `/api/history` three ways — real data (unchanged), an immediate failure, and a true 12-second hang — confirming the calculation completes with the offline estimate plus note in every case instead of hanging.
- Verifying logged-out landing behaviour needs no auth; verify layout and behaviour with computed-style or DOM probes.

## Scope

The calculator is intentionally minimal so it stays simple and focused. It deliberately does not model exchange fees or slippage, selling / take-profit / DCA-out, benchmark comparisons (against another coin, an index, or cash), multi-coin or portfolio DCA, extra cadences (quarterly, custom-day, payday), or non-USD fiats, and it has no sharing hooks. Each of these was considered and left out to keep the tool focused.

## Maintenance notes

- Refresh the offline estimate (`FB_PRICES` in `public/landing.js`) periodically — it is a hand-kept monthly series for five coins, used only when the live API is unavailable. Stale values only make the fallback path (not the live path) less accurate.
- Tune the timeout via the single `12000` in `getHist()` if the upstream history cold-fetch is legitimately slower. It is a one-off per coin, so keep it generous enough not to false-trip on a cold CDN, tight enough to bound a real hang.
- Adding cadences or coins needs no backend change — the list and history are generic.
- Keep all upstream calls behind `/api/*`; never call CoinGecko from the browser (this preserves the flat-cost model and keeps any key server-side).

## See also

- [`../INDEX.md`](../INDEX.md) — documentation index.
- [`../decisions/ARCHITECTURE.md`](../decisions/ARCHITECTURE.md) — system architecture and layering.
- [`../../README.md`](../../README.md) — endpoints and deploy.
- The `crypto-calculator` skill — the reusable method.
