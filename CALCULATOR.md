# Crypto Idea — DCA Calculator

The **dollar-cost-averaging (DCA) calculator** is the free interactive tool embedded in the
marketing landing page (`index.html`, section `#dca`). It lets a visitor pick any coin, an amount,
a cadence and a date range, and see what regularly buying that amount would be worth today —
invested vs. value, profit/loss, ROI, coins accumulated, and average buy price.

> It is the **only** DCA calculator in the product (an older in-app version was removed). It doubles
> as SEO / lead-gen: it's genuinely useful, requires no signup, and — by design — costs ~0 backend
> calls per visitor. Method captured as a reusable pattern in the **`crypto-calculator`** skill.

Code: [`index.html`](index.html) — markup `#dca` (~L499–546), logic in the closing `<script>`
(~L872–1026). Backend: [`functions/index.js`](functions/index.js) `/api/coinlist` + `/api/history`.

---

## Design goal: flat cost regardless of traffic

A naive calculator calls a price API on every keystroke and every calculation — cost scales with
visitors and gets rate-limited fast. This one is built so **thousands of visitors add ~0 function
invocations**, via three moves:

1. **Load the coin list ONCE, search client-side.** On first focus the page fetches the full
   ~3,000-coin universe from `/api/coinlist` (names/symbols/icons/rank **+ last price**) and filters
   it locally as the user types — no per-keystroke backend call. The endpoint is **CDN-cached for
   24 h**, so the list is served from the edge, not the function.
2. **Fetch history ONCE per coin, reused for everything.** A calculation fetches only
   `/api/history?id=<coin>` — the full daily price series. The same series serves **every date
   range and every visitor** (you don't need a new call to change the dates), and it's cached both
   server-side (Firestore, 30 days) and on the CDN (24 h).
3. **Never call CoinGecko from the browser.** All upstream calls go through the cached proxy, so
   upstream cost is a function of *distinct coins viewed*, not of visitors.

The result: the heavy lifting (3k-coin search, multi-range backtests) happens in the browser on
data that's already cached at the edge.

---

## The user flow

```
focus coin input ──► loadCoins() ──► GET /api/coinlist (once, CDN 24h) ──► client-side filter
        │
   pick a coin (sets `sel`) ─┐
   type an amount  ──────────┤──► calc() auto-runs (no "Calculate" button)
   change cadence/dates ─────┘
        │
   calc() ──► getHist(coin) ──► GET /api/history (once per coin) ──► DCA math ──► render results
```

- **No submit button.** `calc()` runs automatically on coin selection, on cadence/date change, and
  (debounced ~350 ms) on amount input. Inputs are validated first (coin chosen, amount > 0, start <
  end) with inline messages in `#dcaMsg`.
- **Per-coin memo.** `hCache[id]` keeps a fetched series in memory so re-running with different
  dates/amounts doesn't refetch.

---

## The DCA math (`calc()`)

Given a `hist` array of `[timestampMs, priceUSD]` points (sorted ascending):

1. **Generate buy dates** — `genDates(start, end, freq)` steps from `start` to `end`:
   `daily` +1 day · `weekly` +7 · `biweekly` +14 · `monthly` +1 month. (The start is clamped to the
   first date history actually covers.)
2. **For each buy date, find the nearest price** — minimum `|hist[j][0] − date|` (nearest-neighbour
   match, so a buy date that falls between two daily points uses the closest one).
3. **Accumulate** — for each valid price: `coins += amount / price`, `invested += amount`, `buys++`.
4. **Final metrics** at the latest price `nowP = hist[last][1]`:
   - `value  = coins × nowP`
   - `profit = value − invested`
   - `roi    = invested > 0 ? profit / invested × 100 : 0`  (percent)
   - `avg    = coins > 0 ? invested / coins : 0`  (average cost per coin)

**Money formatting** (`money()`) scales precision to magnitude: `≥ $1,000` → no decimals; `≥ $1` →
2 decimals; `< $1` → 4 decimals (8 for sub-$0.0001 micro-caps). `NaN`/null render as `$0`.

> **Known simplicity tradeoff (KISS):** the nearest-price match is an inner loop over the whole
> history per buy date — O(dates × points). For the real data sizes (a few thousand each) it runs
> instantly client-side, so it's left plain. If a much larger series ever matters, the series is
> already sorted, so a two-pointer / binary search makes it O(n).

---

## Resilience: offline estimate + timeout (N-1)

`fetch()` has **no default timeout**. If `/api/history` hangs (connection open, no response, no
error), the promise never settles and the calculator would be stuck mid-calculation with no
feedback. `getHist()` guards against this:

```js
function getHist(id){
  if(hCache[id]) return Promise.resolve(hCache[id]);
  var ctrl = new AbortController(), to = setTimeout(()=>ctrl.abort(), 12000); // 12s bound
  return fetch('/api/history?id='+encodeURIComponent(id), {signal: ctrl.signal})
    .then(r => r.ok ? r.json() : {prices:[]})
    .then(d => {var p = (d&&d.prices&&d.prices.length) ? d.prices : fbHist(id); hCache[id]=p; return p;})
    .catch(() => { histDegraded = true; return fbHist(id); })   // timeout/network → offline estimate
    .then(p => { clearTimeout(to); return p; });
}
```

- **12 s `AbortController` timeout** → a hang aborts and is caught.
- **Offline fallback** — on timeout, network error, or an empty response, fall back to the built-in
  estimate `fbHist(id)`. The calc still completes; the user is told via `#dcaMsg`:
  *"Live price data was slow to load — showing an offline estimate."*
- **The fallback is NOT cached** (only real responses populate `hCache`), so a later attempt can
  reach a recovered API.
- **The estimate** (`FB_PRICES` → `fbHist`) is approximate month-end USD prices (Jan 2021 → Jun
  2026) for the 5 majors (BTC/ETH/SOL/ADA/XRP); `fbHist` maps them to `[Date.UTC(2021,i,1), price]`
  points. Coins outside that set return `[]` → the calc shows the friendly *"No historical data
  available in offline demo mode"* note. The same `FB_COINS`/`FB_META` also back the search box when
  `/api/coinlist` itself fails, so the tool is never fully dead.

> History values are degraded **to an estimate, never to `NaN`** — a missing/odd point never breaks
> the math.

---

## Backend endpoints (the cached proxy)

Both live in [`functions/index.js`](functions/index.js); both serve from a shared cache so cost is
flat. (CDN caching is a deployed-Hosting behaviour — the **local dev server invokes the function
every time**, so the "~0 calls per visitor" effect is only observable after deploy.)

| Endpoint | Serves | Server cache | Response `Cache-Control` |
|---|---|---|---|
| `GET /api/coinlist` | full ~3,000-coin list + last price (for client-side search) | shared `cache/universe` doc | `public, max-age=86400, s-maxage=86400` (24 h) |
| `GET /api/history?id=<coin>` | full daily price series for one coin | per-coin `historyCache/{coin}`, **`HISTORY_TTL` = 30 days** | `public, max-age=86400` (24 h) |

- **Universe cache** (`cache/universe`, one ~330 KB doc) is refreshed by scheduled functions —
  `refreshPrices` every 5 min (hot top ~1,250, `HOT_PAGES=5`, always merges) and
  `refreshUniverseDaily` every 24 h (all ~3,000, prunes delisted). The DCA list just reads it.
- **History** is fetched from CoinGecko **once per coin per 30 days** and reused for all ranges/all
  users. Without an API key it covers the last 365 days; with a Demo/paid key, the full range
  (`days=max`, BTC back to 2013).

---

## Reused inside the app

The app's research/buy flow reuses the same cached `/api/history` (no second data source):

- [`src/hooks/useCoinHistory.js`](src/hooks/useCoinHistory.js) + [`src/api/coingecko.js`](src/api/coingecko.js)
  `fetchHistory(id)` — auto-fills a buy-date price from real history (falls back to a built-in
  estimate when null), with a module-level memo.
- [`src/features/research/utils/priceAdapter.js`](src/features/research/utils/priceAdapter.js) —
  pure `deriveFromHistory()` (7d/30d change + sparkline) and `buildResearchPrices()`; degrades to
  `0%`, never `NaN`. Covered by [`tests/unit/research-adapters.test.js`](tests/unit/research-adapters.test.js).

---

## Testing & verification

- The landing calculator is **inline `<script>`** (not an importable module), so it has no unit test;
  it's exercised end-to-end in the browser. The reusable history/price adapters it shares with the
  app **are** unit-tested (`research-adapters.test.js`).
- The N-1 timeout/fallback was verified in-browser by stubbing `/api/history` three ways — real data
  (unchanged), an immediate failure, and a **true 12 s hang** — confirming the calc completes with
  the offline estimate + note in every case instead of hanging.
- Verifying logged-out landing behaviour needs no auth; verify layout/behaviour with computed-style
  / DOM probes (the nested preview's screenshots are unreliable — see the project memory note).

---

## Maintenance notes

- **Refresh the offline estimate** (`FB_PRICES` in `index.html`) periodically — it's a hand-kept
  monthly series for 5 coins, used only when the live API is unavailable. Stale values just make the
  *fallback* (not the live path) less accurate.
- **Tune the timeout** via the single `12000` in `getHist()` if the upstream history cold-fetch is
  legitimately slower (it's a one-off per coin; keep it generous enough not to false-trip on a cold
  CDN, tight enough to bound a real hang).
- **Adding cadences/coins** needs no backend change — the list and history are generic.
- Keep all upstream calls behind `/api/*`; never call CoinGecko from the browser (preserves the
  flat-cost model and keeps any key server-side).

See also: [`README.md`](README.md) (endpoints/deploy), [`CLAUDE.md`](CLAUDE.md) (conventions),
[`NEXT-STEPS.md`](NEXT-STEPS.md) (§4b N-1). Reusable method: the **`crypto-calculator`** skill.
