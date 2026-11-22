# Persona 03 — Speculator · 1-hour test · 2026-11-22
Status: Complete | Account: p03.speculator@test.com | Start: 12:51 local · End: 13:46 local (UTC+2) | Minutes tested: 55

**Summary:** 30 findings (P03-01…P03-30): **4 High**, 9 Medium, 17 Low (two of the Lows are product questions). Highest impact for a meme or micro-cap user: mock prices in the Buy/Sell pre-fill and the CoinInfo overlay (P03-02/03), a scientific-notation price that becomes 10¹⁰× larger when edited and saves (P03-05), and the public landing DCA showing invented BTC returns (P03-13). 20 known bugs re-checked: 17 still present (BUG-009, 021–033, 036–038), 3 appear fixed (BUG-015, 017, 019). BUG-020/034/035/039 were not reached. The account already existed (one PEPE buy from an earlier run), so no registration was needed.

## Persona
A speculator who chases meme coins and micro caps: sub-cent prices, billions of tokens, quick in-and-out trades. Wants the app to show tiny prices and huge quantities precisely, keep P&L honest to the cent, surface trending coins, and warn when the book is all high-risk tokens.

## Data created
"My Portfolio" is the account's default portfolio. Clock times are local (UTC+2). The "Date (as stored)" column shows what the app saved, which is UTC wall time (BUG-024).

| # | Portfolio | Coin | Type | Amount | Price (USD) | Date (as stored) | Note |
|---|---|---|---|---|---|---|---|
| 0 | My Portfolio | PEPE | Buy | 250,000,000 | 0.000003 | Nov 21, 2026 05:10 PM | **Pre-existing** on the account at login (from an earlier run) |
| 1 | My Portfolio | PEPE | Buy | 1,234,567,890,123 | 0.00000123456789 | Nov 22, 2026 10:52 (local was 12:52) | Total cost $1,524,157.88 (correct) |
| 2 | My Portfolio | PEPE | Sell | 1,000,000,007 | 0.0000034567 | Nov 22, 2026 10:53 | Proceeds $3,456.70 (correct) |
| 3 | My Portfolio | BABYDOGE (Baby Doge Coin, rank ~411, not in `TOP_COINS`) | Add coin + thesis | — | — | 12:55 | Thesis: "Pure meme momentum play…" / change-my-mind: "Volume dries up or it drops 50%…" |
| 4 | My Portfolio | BABYDOGE | Buy | 999,999,999,999,999 (15-digit max) | 2.45099e-10 (pre-filled) | Nov 22, 2026 10:56 | Total $245,099.00 (correct) |
| 5 | My Portfolio | WASTED (trending, rank ~925) | Add coin, thesis skipped | — | — | 12:58 | Shows under "Needs a thesis" |
| 6 | My Portfolio | BONK | Add coin + thesis + dilution finding | — | thesis saved with priceAtAdd **$0.0000285000** (mock) | 12:59 | Thesis "Solana meme with real community…" |
| 7 | My Portfolio | BONK | Buy | 50,000,000,000 | 0.0000020285 (AUTO, real history) | Nov 22, 2026 10:59 | Total $101,425.00 |
| 8 | **Doge Only** (new, 2/3) | — | Create portfolio | — | — | 13:01 | Via Account → Portfolios → + Add |
| 9 | Doge Only | DOGE | Add (skip thesis) + Buy | 1,000,000 | 0.0552 (AUTO) | Nov 22, 2026 11:02 | Total $55,215.00 |
| 10 | Doge Only | DOGE | Sell (oversell 1,000,000.000001 → blocked, then exact 1,000,000) | 1,000,000 | 0.055215 (AUTO) | Nov 22, 2026 11:03 | Holding 0, P/L green "+$0.00" |
| 11 | My Portfolio | BABYDOGE | **Edit** tx #4 | — | 2.45099e-10 → 2.450991 (Backspace bug, saved) → restored via AUTO to 0.000000000243 | — | Final cost $243,000.00 |
| 12 | My Portfolio | BONK | Buy (backdated) | 10,000,000,000.1234 (typed …123456, silently capped at 15 digits) | 0.0000055198 (AUTO, real history for 2026-06-01) | Jun 1, 2026 12:00 PM | Total $55,198.00 |
| 13 | My Portfolio | WASTED | Remove coin (0 tx) | — | — | 13:13 | Two-tap trash → Remove (3 s auto-disarm) |
| 14 | Doge Only → renamed | — | Rename | — | — | 13:14 | "🚀 Moonshot Lottery Tickets – degen bag (do not look) x100", capped to 50 chars |
| 15 | My Portfolio | PEPE | Buy, then deleted (two-tap delete) | 999,999,999,999,999 | 0.00000341 | Nov 22, 2026 11:12 | $3.41B, used for the overflow test (P03-16). Holding briefly 1.0e15 PEPE, which is >2× PEPE's 420.69T circulating supply, with no warning |
| 16 | My Portfolio | PEPE | Thesis added later (Journal → Add thesis) | — | priceAtAdd $0.0000034100 (live, correct) | 13:17 | "Frog meme, biggest ERC-20 meme by volume…" |
| 17 | My Portfolio | BABYDOGE | Thesis review → "Reconsidering" | — | — | 13:05 | Shows 🔴 Challenged |
| 18 | Moonshot | EVAA (rank ~632, −38% 24h) | Add (skip) + Buy | 1,000 | 3.78 (pre-filled live — correct for a non-TOP coin) | Nov 22, 2026 11:18 | $3,780; used to re-check BUG-038 |
| 19 | My Portfolio | BONK | Sell ×2 (dust), then both deleted | 0.000000001 and 0.00000000001 | 0.0000020285 (AUTO) / 0.0000180761 (mock pre-fill) | Nov 22, 2026 11:20 | Ghost "0 BONK $0.00" rows (P03-20) |
| 20 | **Long tail** (new, 3/3) | — | Create portfolio via header "+" | — | — | 13:22 | 4th attempt blocked (BUG-032 upsell toast) |
| 21 | Long tail | SIF (Super Inu Force, rank ~856, no 24h data) | Add (skip thesis) | — | — | 13:25 | Used for P03-21 |
| 22 | Long tail | FLOKI | Add (skip) + Buy + Sell all | 100,000,000 | buy 0.0000160382 (AUTO; pre-fill was mock 0.000236) / sell 0.00001637 | Nov 22, 2026 11:26 | Realised +$33.18 |
| 23 | Long tail | SIF | Buy + Sell all | 1,000 | 0.015 / 0.016 | Nov 22, 2026 11:27 | Realised +$1.00 |
| 24 | Long tail | SIF | 4 rapid Buys (~1.3 s apart, all accepted, no throttle) | 10, 11, 12, 13 | 0.0158 | Nov 22, 2026 11:30 | Holding 46 SIF |
| 25 | Long tail | — | Delete-portfolio dialog opened, then **Cancel** | — | — | 13:31 | Copy: "This portfolio has 2 coins and all their transactions and theses… can't be undone." |
| 26 | Moonshot | EVAA | Sell form opened with price 0 (Add Sell disabled — can't record a $0 rug-pull exit) then closed; nothing saved | 1,000 | 0 | — | Suggested price $6.44 vs live $3.56 (P03-26) |
| 27 | My Portfolio | BABYDOGE | Journal "Real volume" finding saved ("Volume ~$1.4M/day vs $45M cap…") | — | — | 13:37 | Persisted after reopening |
| 28 | Long tail | 26 assorted coins (first "+ Add" result for inu, cat, frog, …, game) | Add (skip thesis), scripted via the UI | — | — | 13:41–13:44 | Filled Long tail to 30/30 to hit the coin cap. 31st and 32nd add refused |

## Coverage
| Area | Flows | Result |
|---|---|---|
| Login / logout | Existing persona login (account already existed), logout → re-login ×2, data + dark theme persisted | Pass (P03-18 query leak) |
| Portfolio | Value card, cards, 3 portfolios (create, switch, rename to 50-char emoji name, limit 3/3), remove coin (two-tap, 3 s disarm) | Pass with P03-16 (phone overflow), BUG-022 |
| Buy / Sell / Edit / Delete tx | Trillion- and quadrillion-unit amounts, sub-micro prices, backdated buy with real history, oversell (add + edit + type switch), future date, dust sells, edit price, two-tap tx delete | Guards pass. P03-02, P03-05, P03-20, BUG-023/024 |
| Number formatting | Prices 2.4e-10 … 0.05, values $0.00 … $3.4B, P/L to the cent, CSV export (pure function) | P03-01, P03-06, P03-17, BUG-026 |
| Search / Trending | Trending list, search meme names, special chars, long query, held "Added" state, empty state | P03-04, BUG-021 |
| CoinInfo overlay | Non-held TOP coin (BONK/SHIB), non-TOP (Baby Doge, Bone, SIF, WASTED, EVAA), held (PEPE, BONK, SIF) | P03-03, P03-21 |
| Coins outside hot set | **Not reachable:** the emulator universe holds only 1,262 coins (max rank 1,250, `/api/coinlist`). Off-universe ids return `{}` from `/api/prices`, and Search cannot find them | Not tested (env) |
| Research | Daily Brief, Pulse 24H/7D/30D, allocation, risk meter (meme book, 100% DOGE, 100% EVAA), stress test ±50%, empty/closed portfolios | P03-08, P03-09, P03-10, P03-19, BUG-036/037/038 |
| Journal | Thesis + funnel finding on add, skip → "Needs a thesis", add-thesis-later, review "Reconsidering", detail overlay, over-length thesis | P03-22, BUG-021 |
| Learn | Locked modules, lesson 1 quiz wrong answers | BUG-028/029/030 |
| Account | Profile name, appearance Dark, privacy card, portfolio limit | BUG-031, BUG-032 |
| Landing DCA (`/#dca`) | BTC default, Baby Doge, Pepe, phone width | P03-13, P03-14 |
| Mobile | 360/390/414 px via same-origin iframe (window maximised, so `resize_window` had no effect): Portfolio, Detail, Add transaction, landing DCA | P03-11, P03-16 |
| Dark mode | Portfolio, Research, Detail, CoinInfo, Journal overlay, Add transaction | Readable. No dark-only defects found |
| Keyboard / a11y | Escape on Detail, CoinInfo, Buy form; unnamed trash button; quiz controls | BUG-027 (root cause found), P03-15, BUG-029 |
| Live price polling | Patched `fetch` and watched 65 s: one `/api/prices?ids=baby-doge-coin,bonk,pepe` poll | Pass |
| Console | Checked after major flows and after reloads | No errors or warnings |
| Not tested | Pulse "Share" (would download a PNG), CSV/JSON file download (exercised the pure exporter instead), email change, delete account | — |

## Findings

### P03-01 · Medium · Detail card shows dollar amounts with 3 decimals ("$1,524,907.875", "+$2,673,472.951")
- **Steps:** Log in → open a held coin's Detail → add a Buy whose cost is not a whole-cent value (e.g. PEPE 1,234,567,890,123 @ $0.00000123456789) → look at the "Bought … · $" sub-value and "Total P/L". Repro'd 3× (after the buy, after a sell, after reload).
- **Expected:** Money always shows 2 decimals, matching the Portfolio header ("INVESTED $1,524,907.88").
- **Actual:** Detail shows `Bought 1,234,817,890,123 PEPE · $1,524,907.875` and `Total P/L +$2,673,529.651 (+175.32%)`. The header for the same book says $1,524,907.88. The "Sold … · $" sub-value uses the same pattern (shows 3 decimals whenever proceeds have sub-cent parts).
- **Also in CoinInfo:** held PEPE overlay → "Your Position · Unrealised P/L **+$2,683,646.055** (+176.13%)" (`src/components/CoinInfo.jsx:100`, same pattern).
- **Root cause:** `src/components/Detail.jsx` lines 93, 96 and 99 call `toLocaleString("en-US",{minimumFractionDigits:2})` with no `maximumFractionDigits`. The en-US default maximum is 3, so sub-cent values leak. Line 91 (Current Value) sets both and is correct.
- **New.** (Related to the PORTFOLIO-NUM-FIX / `splitMoney` "one money formatter" intent, BUG-015, but a different spot.)
- **Suggested fix:** add `maximumFractionDigits:2` to the three calls, or better, route them through one shared money formatter in `src/utils/money.js` so cents-first rounding applies everywhere. Add a unit/render test using a cost like 1524907.875.

### P03-02 · High · Buy/Sell form pre-fills the mock price for a meme coin even when the live price is loaded (Repeat of BUG-023, still open, with a second root cause)
- **Steps:** Hold PEPE (live price shown on the card: $0.0000034000) → Detail → "+ Buy" (or "- Sell"). Repro'd 3× on PEPE (Buy, Buy again, Sell). Also repro'd on BONK, which **has** real history: the field pre-filled `0.0000180753` (8.6× live $0.0000021) while the hint underneath correctly said "Suggested price: $0.0000020285". So the pre-fill ignores both the live price and the real history.
- **Expected:** The price field pre-fills the live price, ~0.0000034.
- **Actual:** Pre-fills `0.0000118000` (the `TOP_COINS` mockPrice, 3.47× live). After you type a real price, the hint still reads "Suggested price: $0.0000118000 · tap AUTO to use". If you accept it, a Buy records a cost basis 3.5× too high, and a **Sell records a phantom realised profit**.
- **Root cause (new detail):** `src/CryptoIdea.jsx` `startAddTx` (~line 856) does `setEPrice(fmtPriceInput(hp) || (pr ? pr.toString() : ""))`. `hp = getHistoricalPrice(coin.id, now)` is the **built-in estimate** (derived from `mockPrice` in `src/utils/coins.js`), and it wins over the real live price `pr`. In this emulator `/api/history?id=pepe` returns `{"prices":[]}`, so `AddEntry.jsx`'s `priceAt` also falls back to the estimate, which drives the AUTO badge and the hint. BUGS.md attributes BUG-023 only to the `useLivePrices` mock seed. This path is independent of that and stays wrong after live prices load.
- **Suggested fix:** in `startAddTx`, prefer `prices[coin.id].usd` from a live response for a "now" date. In `AddEntry.jsx`, use the live price for today's date and show the estimate only when it is labelled as an estimate (ties in BUG-025). Never fall back to `mockPrice`.

### P03-03 · High · CoinInfo overlay for a non-held meme coin shows only mock data (price 7–14× live, wrong rank/market cap, flat fake "Price History"). It never fetches live data.
- **Steps:** Search → type `bonk` (or `shiba`) → tap the coin icon ("View Bonk info"). Do not add it. Wait 4–8 s. Repro'd 2× on BONK and 1× on SHIB, plus the same mock values in the Search result row.
- **Expected:** Per R25-4, a non-held coin's overlay fetches live data once from `/api/prices`. BONK live (from `/api/prices` in the same session): $0.00000209, rank #158, cap $183.9M, vol $21.8M, circulating 87.99T.
- **Actual:** BONK overlay: `$0.0000285000 · +6.70% today · Rank #64 · Market cap $1.90B · 24h volume — · Circulating —`, which is 13.6× the live price. SHIB overlay: `$0.0000245000 · Rank #17 · Market cap $14.40B` (live $0.00000363 / #39 / $2.14B). SHIB also gets a "Price History" block: `Launch $0.0000000010 +2449900.00%`, and `1 Year Ago`, `6 Months Ago` and `3 Months Ago` all `$0.0000245000 +0.00%`. That is a fabricated, flat history shown as fact. No `/api/prices?ids=bonk` request is made (checked with the Performance resource list). A coin outside `TOP_COINS` (Bone ShibaSwap) *does* fetch live data correctly.
- **Held coins too:** for **held PEPE**, the overlay header correctly shows live `$0.0000034100`, but the "Price History" block in the same card reads `1 Year Ago $0.0000118000 −71.10% · 6 Months Ago $0.0000118000 −71.10% · 3 Months Ago $0.0000118000 −71.10% · **Today $0.0000118000**`. The card contradicts itself: "Today" is 3.5× the price printed above it. Repro'd 2× (PEPE from Search, and SHIB).
- **Root cause:** `src/components/CoinInfo.jsx` only fetches when `!prices[coin.id]`. `src/hooks/useLivePrices.js` seeds `prices` with a mock entry for **every** `TOP_COINS` coin, so a non-held TOP coin always looks "already priced" and the one-shot fetch never fires. The mock then renders indefinitely. "Price History" is driven by the built-in `PRICE_HISTORY` / `getHistoricalPrice` estimates (`src/utils/coins.js`).
- **Repeat / related:** Same mock-seed family as **BUG-021** (Search shows mock prices, still present) and **BUG-023**. This overlay surface and its fetch-gating root cause are not in BUGS.md, so it is filed as **New**. The fake history ties to BUG-025.
- **Suggested fix:** stop seeding mock prices into `useLivePrices`, or have CoinInfo fetch whenever the entry did not come from a live response (track `src: "live"`). Hide "Price History" milestones (`CoinInfo.jsx` ~104–130, every value from `getHistoricalPrice`) unless they come from real `/api/history` data, or label them "estimate". At minimum, the "Today" row must use the live `pr`.

### P03-04 · Low · Same coin shows two different market-cap ranks on Search vs CoinInfo
- **Steps:** Search tab → TRENDING → note WASTED `#939` → tap its icon → overlay says `Rank #925`. Repro'd on EVAA (`#704` card vs `#680` overlay). Also seen with search results: Bone ShibaSwap `#1105` in the list vs `#1110` in the overlay. Via the API, 4 of 15 trending coins mismatch (wasted-4 939/925, pieverse 56/59, pons 325/328, evaa 704/680).
- **Expected:** One rank per coin at a given moment.
- **Actual:** Trending cards read the rank from `cache/trending` (30-min replace-write) and search rows from the universe/search cache. The overlay reads `usd_market_cap_rank` from `/api/prices`. These snapshots drift.
- **New.**
- **Suggested fix:** when the overlay has a live rank, use it on the card too, or have `/api/trending` and `/api/search` decorate results with the universe's current rank server-side (no extra upstream calls). Low priority, since it is cosmetic for long-tail coins.

### P03-05 · High · Editing a pre-filled micro-cap price turns $0.000000000245 into $2.45 (scientific notation + sanitiser)
- **Steps:** Add a coin that is NOT in `TOP_COINS` and has a sub-1e-7 price (Search → `baby doge` → + Add → Skip/Save) → Detail → "+ Buy". The price field pre-fills **`2.45099e-10`** (scientific notation, shown to the user as-is). Click the field and press End then Backspace (to fix the last digit), or type one more digit. Repro'd 2×.
- **Expected:** The pre-fill is a plain decimal (`0.000000000245099`). Editing it never changes the magnitude.
- **Actual:** Backspace gives `2.450991`. Typing "1" at the end gives `2.45099101`. The `e-10` is silently stripped, so the price jumps by **10 billion×**. With amount 1,000,000,000,000 the "Total cost" preview reads **$2,450,990,000,000.00**. With 1,000 it reads $2,450.99 and is enabled, so it would save. The submit guard (`prc ≤ 1e9`) does not catch it.
- **It also saves.** The **Edit** path has the same problem: tap the BABYDOGE tx row and the price field again shows `2.45099e-10`. `src/components/Detail.jsx:117` uses `setEPrice(e.priceAtBuy.toString())`. One Backspace → `2.450991` → "Total cost $2,450,990,999,999,997.50" → **Save Changes was accepted with no warning.** Detail then read `Bought … · $2,450,990,999,999,997.50 · Avg Buy Price $2.45 · Total P/L −$2,450,990,999,754,573.50 (-100.00%)`. I then restored it with AUTO.
- **Mobile/dark too:** at 360px in dark mode the full-screen "Add transaction" form shows the price as `2.45238e-10` as well.
- **Root cause:** `src/CryptoIdea.jsx` `startAddTx` falls back to `pr.toString()` when `getHistoricalPrice` (TOP_COINS-only) returns null, and JS stringifies `2.45099e-10` in exponent form. Then `sanitizeDecimal` in `src/utils/format.js`, which drops e/E/+/-, runs on the next `onChange` and removes the exponent without rescaling.
- **New.**
- **Suggested fix:** in `startAddTx` **and** the Detail edit pre-fill, always use `fmtPriceInput(...)` (already handles <1e-7 with `toFixed(12)`; consider more digits, e.g. 8 significant figures) instead of `pr.toString()`. Defensively, `sanitizeDecimal` should expand exponent notation (`Number(str).toFixed(…)`) before stripping characters. Add a unit test for an `"2.45099e-10"` input. Also consider a soft "this price is 10,000× the market price — sure?" confirm when the entered price is far from the live or history price.

### P03-06 · Medium · Prices below ~$1e-9 are shown with one significant digit (or as $0.0000000000)
- **Steps:** Hold or view Baby Doge Coin (live `usd: 2.45099e-10`). Check the CoinInfo overlay, the Portfolio card, Detail price, "Avg Buy Price" and the tx row. Repro'd on all 5 surfaces and after reload.
- **Expected:** At least 3–4 significant digits, e.g. `$0.000000000245` or `$2.45e-10`.
- **Actual:** Every surface shows `$0.0000000002`. The user's 999,999,999,999,999 BABYDOGE is worth $245,099, but the per-coin price implies $200,000, an 18% error. Any coin under $5e-11 (several exist in the ~3,000 universe) would render **$0.0000000000**, which looks like a dead coin, and its P&L would read as nonsense.
- **Root cause:** `fmtP` in `src/utils/format.js` uses `toFixed(10)` for every price below 0.0001. The input-side twin `fmtPriceInput` uses `toFixed(12)`, so AUTO fills BABYDOGE as `0.000000000243` (real history 2.43187e-10). The saved cost became $243,000.00 vs $243,187 actual, a silent 0.08% cost-basis error from truncation.
- **New.**
- **Suggested fix:** use significant-figure formatting below $0.0001, e.g. `p.toPrecision(4)` expanded to a plain decimal, or a subscript-zero notation like `$0.0₉245`. Unit-test 2.45e-10, 3.4e-6 and 4e-12.

### P03-07 · Medium · `/api/history` returns an empty series for PEPE and BTC, and the response is CDN-cacheable for 24h
- **Steps:** In the app tab: `fetch('/api/history?id=pepe')` and `?id=bitcoin` → `{"prices":[]}`, status 200, `Cache-Control: public, max-age=86400`. The same call for bonk / shiba-inu / dogecoin / floki / baby-doge-coin returns 366 points. Repro'd 2×.
- **Expected:** A held top coin has history. A transient upstream failure is not cached at the CDN for a day.
- **Actual:** Empty. The app then silently uses the built-in mock estimate for AUTO and the "Suggested price", which is what drives P03-02 on PEPE.
- **Root cause (from reading `functions/index.js` ~3453–3488):** a failed upstream fetch writes a `miss` marker with a 1h server-side TTL, but the response always sets `Cache-Control: public, max-age=86400`. A deployed CDN would keep serving the empty series for 24h. The client can't tell "no data" from "temporarily failed".
- **Related to BUG-009** ("can't tell delisted from no data", still open). The CDN-TTL mismatch is not described there, so it is listed separately.
- **Suggested fix:** when the result is a `miss`/empty, send a short `Cache-Control` (e.g. `max-age=300`) or `no-store`, and return a `status:"unavailable"` field so the client can say "price history unavailable" instead of falling back to mock.

### P03-08 · Medium · Research Pulse reports 30D/7D performance and "who drove the move" as complete when 92% of the book has no price history
- **Steps:** Book = PEPE 92% / BABYDOGE 5% / BONK 2% (PEPE `/api/history` is empty, see P03-07) → Research → Portfolio Pulse → 30D, then 7D. Repro'd 2× (each tab, after reload).
- **Expected:** When a holding's history is missing, the Pulse says so (e.g. "30-day change excludes Pepe — no price history"), or withholds the 30D/7D number.
- **Actual:** "Your portfolio is $4,557,418, −3.3% over the last 30 days … Over the last 30 days, Baby Doge Coin drove about 70% of that move." The −3.3% comes entirely from the 7% of the book with history (BABYDOGE −31.6%, BONK −33.0% over 30d, computed from `/api/history`). The 92% PEPE position is silently counted as 0%. 7D likewise reads "−0.3% … Bonk drove about 66%".
- **Root cause:** `src/features/research/utils/priceAdapter.js` degrades missing history to 0% ("never NaN", by design), and `utils/pulse.js` has no notion of coverage.
- **New.** (Honesty issue in the spirit of the CRYP-95/97 Pulse rules.)
- **Suggested fix:** carry a `hasHistory` flag per holding through `priceAdapter` → `pulseFacts`. If uncovered allocation is above a threshold (e.g. 10%), either suppress the 7D/30D figure or append a coverage clause that names the coin. Unit-test with a 90%-uncovered book.

### P03-09 · Medium · Stress test scales each coin by its *position size order*, not its volatility, so a 98% meme book behaves like the market (−50% → −50.7%)
- **Steps:** Research → Stress test → drag to −50% and to +50%. Repro'd 2× in each direction.
- **Expected:** Per the on-card claim "each coin moves with the market scaled by its typical volatility", a book that is 92% PEPE / 5% BABYDOGE / 2% BONK should swing well beyond the market.
- **Actual:** −50% → "$2.2M (−50.7%)" and +50% → "$6.9M (+50.7%)". A 100% EVAA book (rank ~632, −38% in 24h, ±23.5% daily swing per the Pulse) models at exactly **±50.0%**, both followed by "Your higher-beta holdings amplify the swing." PEPE, as the largest holding, gets beta 1.0, the same a BTC-only book would get.
- **Root cause:** `src/features/research/utils/portfolio.js` `stressScenario` assigns `BETA_BY_RANK[i]` by the holding's **index in the allocation-sorted list** (`[1.0, 1.1, 1.4, 1.6, 1.8]`), not by its market-cap rank or volatility. The amplify sentence in `StressTest.jsx:31` is unconditional (see BUG-037).
- **New** (root cause of BUG-037's symptom family, but a distinct defect: mislabelled model).
- **Suggested fix:** derive beta from `coinRisk(h)` / market-cap rank, or from realised 30-day volatility in `/api/history`, which is already fetched. Show the "amplify" sentence only when `|changePct| > |move|`, which also fixes BUG-037.

### P03-10 · Low · Risk-meter advice copy contradicts the book ("A mix of ranks and sizes" for a 100% one-bucket book; "keeps single-coin risk lower" for a 100% single-coin book)
- **Steps:** (a) Meme book (PEPE 92% / BABYDOGE 5% / BONK 2%) → Research → Portfolio Risk. (b) "Doge Only" portfolio (100% DOGE) → Research. Each repro'd 2× (before and after reload).
- **Actual:** (a) "Top-50 coins are 0% of your book, mid-ranked 100%, small/unranked 0%. **A mix of ranks and sizes.**" (b) "Top-50 coins are 100% of your book … **Mostly top-ranked coins, which keeps single-coin risk lower.**", shown directly under "ALLOCATION · High concentration · DOGE 100%".
- **Root cause:** `riskNote` in `src/features/research/utils/portfolio.js` falls through to "A mix of ranks and sizes." whenever `small < 40 && top < 60`, even when one bucket is 100%. The "single-coin risk lower" clause ignores concentration.
- **New.** (Sibling of BUG-036.)
- **Suggested fix:** add a branch for a single-bucket book ("All of your book is mid-ranked coins…"). Drop or condition "single-coin risk lower" on effective-N ≥ 3.

### P03-11 · Low · Header badges don't fit on 360–390px phones: "● LIVE" wraps, and at 360px STARTER runs under the account avatar
- **Steps:** Render `/app` (Portfolio tab) at 390px and at 360px wide. The desktop window was maximised, so this was measured in a same-origin 390px/360px iframe of `/app`. Repro'd 2× (360 and 390). Fine at ≥414px.
- **Expected:** Badges stay one line (STARTER is 20px tall).
- **Actual:** The `.badge.badge-live` span renders 34px tall: "●" sits on line 1 and "LIVE" on line 2, so the header row looks ragged next to the logo. At 360px the STARTER badge also **overlaps the account avatar** on Research (badge right edge 319px vs avatar left 291px, so it reads "STARTE(S)") and on Portfolio (313 vs 291). Journal/Learn/Search fit. Measured 2× (Research and Portfolio). Fine at 390px.
- **New.**
- **Suggested fix:** `white-space:nowrap` on `.ci-app .badge`, and let the title+badge group shrink/wrap (`min-width:0; flex-wrap:wrap`) so it never runs under the `.avatar-dock` (`src/styles/app.css`). Or hide the BETA badge under ~380px. Design-only.

### P03-12 · Low · Switching bottom-nav tabs keeps the previous screen's scroll position
- **Steps:** Account → scroll to the bottom (Appearance; `scrollY` 536) → tap Research (or Portfolio). Repro'd 2× (Account→Portfolio landed at `scrollY` 231 with the value card off-screen; Account→Research at 536).
- **Expected:** A new tab opens at the top, as the drill-ins already do with their `scrollTo(0,0)` (CRYP-102).
- **Actual:** The new tab opens mid-page. On Portfolio, the value card and portfolio switcher are hidden above the fold.
- **New.**
- **Suggested fix:** `window.scrollTo(0,0)` when the bottom-nav tab changes (in the tab-switch handler in `src/CryptoIdea.jsx`), mirroring the drill-in effect.

### P03-13 · High · Landing DCA calculator shows a fabricated offline estimate for Bitcoin as if it were real (Price today $103,000 vs live ~$60,787), with no notice
- **Steps:** Open `http://localhost:3000/#dca`. Bitcoin is the default (also re-selected it from the coin search). Weekly $100, 2023-11-22 → 2026-11-22. Repro'd 2× (default first load, and after re-selecting Bitcoin).
- **Expected:** Real history, or a visible "offline estimate" notice like the existing timeout message ("Live price data was slow to load — showing an offline estimate.").
- **Actual:** "Total invested $15,700 · Value today $19,461 · +$3,761 · +24.0% · Average buy price $83,094 · **Price today $103,000**". The `/api/prices` BTC price in the same session is $60,787, and an honest result would be a loss. `#dcaMsg` is empty, so the visitor is told nothing.
- **Root cause:** `public/landing.js` `getHist()` replaces an **empty** `/api/history` response with `fbHist(id)` (the built-in estimate) but only sets `histDegraded` on a network error or timeout, so the disclaimer never shows. `/api/history?id=bitcoin` is empty here (P03-07). In production this path fires for any coin whose history fetch failed or was negative-cached.
- **New.** (Same family as BUG-025, on the public landing page.)
- **Suggested fix:** in `getHist`, set `histDegraded = true` whenever `fbHist` is used, including the empty-response branch. Better: on the landing, refuse to show a result from an estimate ("History temporarily unavailable for Bitcoin") rather than present invented returns. Fix P03-07's caching so an empty miss isn't served for 24h.

### P03-14 · Low · Landing DCA formatting and stale-state issues for micro-caps
- **Steps:** `/#dca` → coin "Baby Doge Coin" (weekly $100, default 3-year range) → then pick "Pepe". Repro'd 2× (Baby Doge twice).
- **Actual:**
  1. "Average buy price **$0.00000000**" and "Price today **$0.00000000**" for BABYDOGE (~$2.4e-10). `money()` in `public/landing.js` uses `toFixed(8)` below $0.0001.
  2. "Profit / Loss **$-2,003**" (sign after the $, ASCII hyphen; the app uses `−$`).
  3. The 3-year range silently became 1 year ("Buys made 53", invested $5,300 instead of ~$15,700) because `calc()` clamps `start` to the first history point (`if(sm<ea)sm=ea;`) without telling the user.
  5. At 360px the "Total accumulated" row wraps into "Total accumulated13,451,790,088,672.998 BABYDOGE" with the label and value jammed together (no gap) — cosmetic.
  4. Selecting **Pepe** shows "No historical data available in offline demo mode…" but the result card **keeps showing Baby Doge's numbers** ("Coin Baby Doge Coin (BABYDOGE)", $5,300 / $3,297) under the Pepe selection.
- **New.**
- **Suggested fix:** significant-figure price formatting (same as P03-06). Use `(profit<0?'−':'+')+money(Math.abs(profit))`. Show "Data starts YYYY-MM-DD — results cover N weeks" when clamped. Hide `#dcaRes` (remove `.show`) on every error path in `calc()`.

### P03-15 · Low · Delete-coin trash button in the coin popup has no accessible name
- **Steps:** Open any coin's Detail popup (PEPE, WASTED) → inspect the top-right red trash icon with the accessibility tree / a screen reader. Repro'd on 2 coins.
- **Expected:** An accessible name like "Delete coin" (other icon buttons have one, e.g. "Rename active portfolio", "Delete transaction").
- **Actual:** `<button class="icon-btn"><svg …/></button>`, which reads as just "button". After one tap it becomes "Remove" and auto-disarms after 3 s (R12-2), so a screen-reader user hears an unnamed button that silently changes.
- **New.**
- **Suggested fix:** add `aria-label="Delete coin"` (and `title`) to the trash `icon-btn` in `src/components/Detail.jsx` (~line 70). Consider `aria-live` on the Remove pill.

### P03-16 · Medium · Portfolio value card overflows on phones once INVESTED reaches 7 figures (horizontal page scroll, "ASSETS" clipped)
- **Steps:** My Portfolio with a ~$3.4B value (added PEPE 999,999,999,999,999 @ $0.00000341; deleted afterwards) → render `/app` at 360px and 390px wide (same-origin iframe, since the window was maximised). Repro'd at 360 and 390. Clean at 414.
- **Expected:** No horizontal page scroll at phone width (responsive standard: 16–18px gutter, no x-scroll). Stats wrap or shrink.
- **Actual:** `documentElement.scrollWidth` 387 > `clientWidth` 345 at 360px and 375 at 390px, so the whole page scrolls sideways. The overflowing element is `.vc-stats` (INVESTED `$3,411,924,530.88` · 24H · ASSETS): "ASSETS" is cut to "ASS" and the "3" is pushed off-card. The big value `$3,414,578,386.01` touches the card edge. At 360px the STARTER badge also collides with the account avatar.
- **Also at millions (light mode):** with the normal book (INVESTED `$1,924,530.88`, value $4.59M) the page still overflows: 351 > 345 at 360px and 351 > 305 at 320px (where the title and STARTER badge also overflow). The "ASSETS" stat runs into the card's right edge. So it is not just a billionaire edge case; a 7-figure cost basis is enough at 360px.
- **Root cause:** `src/styles/app.css` ~423: `.ci-app .vc-stats { display:flex; }` with fixed `padding:0 18px` per stat and no `flex-wrap` / `min-width:0`. The 18px display-font `.vc-sval` can't shrink for a 16-character dollar figure.
- **New.**
- **Suggested fix:** `flex-wrap:wrap` (or a 2-row grid) on `.vc-stats` below ~420px of card width, or `clamp()` the `.vc-sval` font size. Optionally abbreviate ≥ $1B in the stat row (`$3.41B`). Design-only; verify light and dark at 360/390.

### P03-17 · Medium · CSV export loses micro-cap prices (exports "0"), writes scientific notation, and invents fractional coins on huge amounts
- **How tested:** I did not download a file. In the dev server I imported the pure exporter that backs Account → Privacy & data → "Download CSV" (`await import('/src/utils/export-csv.js')`) and fed it this session's real values. Repro'd 2× with different datasets.
- **Actual:**
  - BABYDOGE `priceAtBuy 2.43e-10` → "Avg buy price" **`0`** and tx "Price (USD)" **`0`**. A coin with price `8.9e-11` → `0` too.
  - A coin at `1.5e-7` → **`1.5e-7`** (scientific notation; spreadsheets may parse it, but it's inconsistent with every other cell).
  - PEPE `0.00000123456789` → `0.00000123` (3 significant figures).
  - Amount `999,999,999,999,999` → **`999999999999999.1`**. `123456789012345` held → `123516789012345.11`. `60000000000.1234` → `60000000000.123405`. These are phantom fractional coins created by `Math.round(n*1e8)/1e8` past float precision.
- **Root cause:** `src/utils/export-csv.js` `num(n, dp)` = `String(Math.round(n*10**dp)/10**dp)`, with dp fixed at 8 for amounts and prices.
- **New.** (`tests/unit/export-csv.test.js` exists but evidently has no micro-cap or 1e15 cases.)
- **Suggested fix:** for prices use significant-figure formatting expanded to plain decimal (e.g. `Number(p.toPrecision(10)).toLocaleString('en-US',{useGrouping:false,maximumSignificantDigits:10})` or a small `toPlainString`). For amounts, skip the multiply/round when `|n| ≥ 1e7` (just `String(n)` / `toLocaleString` without grouping). Add unit cases for 2.43e-10, 1.5e-7 and 999999999999999.

### P03-18 · Low · Search query survives Logout and shows up for the next login on the same device
- **Steps:** Search → type `shiba` → Account → Logout → log in again → Search tab. Repro'd 2× ("bonk" and then "shiba" carried across a logout).
- **Expected:** Logout clears per-session UI state, as with other session hygiene (BUG-034 class, ISO-3 sign-out hygiene).
- **Actual:** The Search box still holds the previous query and shows its results. On a shared device, the next person sees what the last one was researching.
- **Root cause:** `sq` is app-level state (`src/CryptoIdea.jsx:176`) that is only reset in `addCoin` (line 783), not on sign-out.
- **New.** Related in spirit to BUG-034 (state left behind after logout), which is still open.
- **Suggested fix:** reset `sq` (and similar per-user UI state: selected coin, screen) in the sign-out handler, or key the app subtree on `user.uid` so it remounts.

### P03-19 · Low · Research treats a portfolio of closed positions as "empty" ("Add your first coin…"), hiding realised P&L
- **Steps:** "Doge Only"/Moonshot portfolio: buy 1,000,000 DOGE, then sell all 1,000,000 → Research. Repro'd 2× (right after the sell, and after logout/login + portfolio switch).
- **Expected:** Something like "No open positions — you closed DOGE for +$0.00 realised", and the Portfolio tab still lists DOGE.
- **Actual:** "Welcome · Add your first coin to start seeing your portfolio summary." and "PORTFOLIO PULSE · Portfolio empty". The portfolio does have a coin (Portfolio tab shows "My Assets (1/30) · Dogecoin 0 DOGE" and "INVESTED $55,215.00"). For a speculator who flips in and out, Research never shows realised results.
- **New.**
- **Suggested fix:** in `src/features/research` (the empty-state branch in `OverviewView` / `usePulse`), distinguish "no coins" from "no open holdings" and add a one-line realised-P&L summary for closed coins. Copy-only at minimum.

### P03-20 · Low · Dust trades are accepted and shown as "SELL 0 BONK · $0.00" ghost rows
- **Steps:** BONK Detail → "- Sell" → amount `0.000000001` (then `0.00000000001`) → Add Sell. Repro'd 2×. I deleted both rows afterwards.
- **Expected:** Either a minimum (e.g. the trade value must round to ≥ $0.01, or the amount must be ≥ 1e-8 to match the display precision), or the row shows the real amount.
- **Actual:** Both were saved. The Detail card then shows `Sold 0 BONK · $0.00`, plus two rows `SELL | 0 BONK | … | $0.00`. One of them also carries the mock pre-fill price `$0.0000180761` (P03-02), so a stray "0" sale silently set "Avg Sell Price". Holding still reads `60,000,000,000.1234` (unchanged at display precision).
- **Root cause:** amounts render with `maximumFractionDigits: 8` (`src/components/Detail.jsx` ~93–96/120). The `addEntry` validation in `src/CryptoIdea.jsx` only requires `amt > 0`.
- **New.**
- **Suggested fix:** reject trades whose amount is below the display precision (1e-8) or whose value rounds to $0.00 ("Amount too small to record"). Alternatively, show amounts with significant figures so a dust row is at least visible as dust.

### P03-21 · Low · Missing 24h change shown as a green "+0.00%" (CoinInfo overlay and Portfolio header), while the card and Detail correctly show "—"
- **Steps:** Search `super inu` → Super Inu Force (rank ~856; `/api/prices` returns `usd_24h_change: null`, `usd_24h_vol: 0`) → tap its icon. Then add it (Long tail portfolio) and open the overlay from the Portfolio card. Repro'd 2× (non-held and held).
- **Expected:** A neutral muted "—" pill, as the Portfolio card (`chg-pill muted: —`) and Detail already show (PORTFOLIO-NUM-FIX "missing 24h datum → neutral").
- **Actual:** The CoinInfo overlay shows `chg-pill` (green) **"+0.00% today"**, which claims the coin was flat. The **Portfolio header** of the "Long tail" portfolio, whose only held coin is SIF (46 SIF, FLOKI closed), shows `24H` **`+0.00%`** in green (`vc-sval up`) right above the card's muted "—". Repro'd 2× (before and after reload).
- **Root cause:** `src/components/CoinInfo.jsx` `const ch = p?.usd_24h_change ?? cd?.mockChange ?? 0;` coalesces a missing value to 0, and the pill render has no muted branch.
- **New.**
- **Suggested fix:** keep `ch` as `null` when unknown and render the same muted "—" pill that `Detail.jsx` uses. For the header, compute the 24H figure only over holdings with a known change, and show "—" when none have one (the 24H aggregation in `src/components/Portfolio.jsx`).

### P03-22 · Low · An over-length thesis is sent to the server, refused with a generic toast, and the whole draft is lost
- **Steps:** Search `floki` → + Add → put more than 2,000 characters in "Why are you buying this?" → "Save to Journal & add coin". The textarea has `maxLength=2000`, so this needs a value set programmatically (I used JS; a paste is normally capped by the browser). Repro'd 2× (2,250 and 2,001 chars).
- **Expected:** The button is disabled, or an inline "Thesis is over 2,000 characters" message, since the counter already shows **"2,250 / 2,000"** in red. The draft is kept.
- **Actual:** The button is enabled. The server (`validJournal`) refuses. Toast: "That change couldn't be saved — please check the details and try again." The dialog closes, the coin is **not** added, and the thesis text is gone.
- **New.** Defence-in-depth only: the server boundary held. This is the §DI "verify-then-toast" class, and the old BUG-004 limit message no longer appears.
- **Suggested fix:** in `src/components/Search.jsx` (Buy-Journal prompt) disable Save when any field exceeds its max, mirroring the counter. On a failed save, keep the dialog open with the text intact.

### P03-23 · Low · "You already profited more than your total investment" appears after a +2% flip
- **Steps:** Long tail portfolio: FLOKI buy 100,000,000 @ $0.0000160382 ($1,603.82) → sell 100,000,000 @ $0.00001637 ($1,637.00). Repro: SIF buy 1,000 @ $0.015 → sell 1,000 @ $0.016. Repro'd 2×.
- **Expected:** No note, or something accurate like "Position closed — realised +$33.18".
- **Actual:** Under "Total P/L +$33.18 (+2.07%)" (and "+$1.00 (+6.67%)" for SIF) the Detail card says: **"Sell proceeds exceed buy costs — you already profited more than your total investment"**. Profiting *more than your total investment* would mean more than +100%.
- **Root cause:** `src/components/Detail.jsx` ~line 100 shows the note whenever `sellsGain > buysCost`, which is true for **any** profitable closed position. The copy describes a different condition (realised profit > cost, i.e. proceeds > 2× cost, or "house money" when proceeds exceed cost while still holding).
- **New.**
- **Suggested fix:** show it only while coins are still held (`h > 0 && sellsGain > buysCost`: "you've already taken out more than you put in — the rest is house money"), or reword it to "Your sales returned more than you paid in total".

### P03-24 · Low · Research Pulse rounds small books to whole dollars ("$1 cost basis … up $0 (5.2%)") and states "+0.0%" when it has no data
- **Steps:** "Long tail" portfolio holding only 46 SIF (value $0.73; SIF has no 24h change and empty `/api/history`) → Research. Repro'd on the 30D and 24H tabs and after reload.
- **Actual:** Daily Brief: "▲ Portfolio is **up $0 (+0.0%)** over the last 24 hours." Pulse: "Your portfolio is **$1**, +0.0% over the last 30 days. Against a **$1** cost basis you're **up $0 (5.2%)**." That is a 5.2% gain on $0 of profit. The +0.0% figures are invented (there is no 24h or history data for SIF).
- **Expected:** Cents for values under ~$100 (`$0.73`, `$0.69`, `up $0.04`), and "no price history yet" instead of +0.0%.
- **Root cause:** whole-dollar formatting in the pulse/brief copy (`src/features/research/utils/pulse.js` `pulseLines` / `briefFacts`), plus the "missing → 0" degrade noted in P03-08.
- **New.** (Same coverage root cause as P03-08. The formatting half is separate.)
- **Suggested fix:** use a money formatter that keeps cents below $100 (or below $1,000). Reuse the coverage flag from P03-08 to suppress "+0.0%" lines with no data.

### P03-25 · Low (product question) · Header P/L % divides by *lifetime* invested, so every closed round-trip dilutes it
- **Steps:** Moonshot portfolio: a DOGE round-trip ($55,215 in, $55,215 out), then EVAA bought for $3,780, now $3,630. Portfolio header. Second case: Long tail (FLOKI and SIF round-trips, 46 SIF held). Repro'd on 2 portfolios.
- **Actual:** Moonshot header "▼ −$150.00 (**−0.25%**) · INVESTED **$58,995.00**", but the only open position is down 4.0%. Long tail: "▲ +$34.18 (+2.11%) · INVESTED $1,619.55" for a $0.73 book. The more a speculator flips, the closer the header % gets to 0, whatever the open book is doing.
- **Expected:** Ask the founder. Options: % of current cost basis for open positions (Research already uses this: "Against a $3,780 cost basis…"), or label it "lifetime return on capital deployed".
- **New.** The Portfolio header and Research Pulse now use two different denominators for "how am I doing".
- **Suggested fix:** for consistency, base the header % on the open-position cost basis and show realised P&L separately, or rename the label. Decision for the founder.

### P03-26 · Medium · AUTO / "Suggested price" for *right now* is today's 00:00 UTC open (or an older cached point), not the live price, so after an intraday dump it suggests +81%
- **Steps:** Hold EVAA (live $3.56–3.63, −42% today) → Detail → "- Sell". Repro'd on EVAA, FLOKI and BONK (3 coins).
- **Expected:** For the default date (now), AUTO and the suggestion use the live price that the card and Detail header show.
- **Actual:** EVAA: "Suggested price: **$6.44** · tap AUTO to use", while `/api/prices` says $3.56. Tapping AUTO on a sell after the dump records proceeds about 81% too high. FLOKI: suggested $0.0000160382 vs live $0.00001637. BONK: $0.0000020285 vs live $0.0000021.
- **Root cause:** two things stack. (1) `priceAtDate` (`src/utils/coins.js:531`) returns the last history point at or before the date. (2) The form's default date is `now.toISOString().slice(0,16)` (UTC wall time), which `new Date(eDate)` parses as **local** time, so it lands 2 h in the past (UTC+2) and before the latest intraday point (`2026-11-22T11:17:30Z`). It therefore picks the `2026-11-22T00:00Z` daily point ($6.442). Also, `historyCache` is kept for **30 days** (`HISTORY_TTL`), so on later days "today" isn't in the series at all and AUTO returns a point up to 30 days old.
- **Same staleness in Research:** `src/features/research/utils/priceAdapter.js` `deriveFromHistory` computes 7D/30D from the **last history point**, not the live price. Moonshot (EVAA): Pulse "Your portfolio is $3,460 (live), **+170.2%** over the last 7 days" = 3.863 (history point at 11:17Z) / 1.430 (Nov 15), so the % and the $ use different prices. Because history is cached for up to 30 days, "7D"/"30D" can freeze at the cache date (from reading the code; observed here only as the 3.863 vs 3.46 mismatch).
- **Related to BUG-024** (UTC-vs-local date, still open) and BUG-025 (estimate labelled as market price). This live-vs-history gap is not in BUGS.md, so it is filed as **New**.
- **Suggested fix:** when the chosen date is within the last ~24 h, use the live `prices[id].usd` for AUTO/suggestion. Fix the default date to local time (`toLocalISOString`) per BUG-024. Treat history as authoritative only for past days.

### P03-27 · Low (product question) · No way to record a rug-pull / delisting exit at $0
- **Steps:** EVAA Detail → "- Sell" → amount 1,000, price `0` (and `0.00`). Repro'd 2×.
- **Actual:** "Add Sell" stays disabled with no explanation (the A5 rule requires price > 0). A speculator whose token went to zero can't close the position. The only workaround is a fake price like `0.000000000001`, which then hits P03-06/P03-20 display issues.
- **Expected (proposal):** Allow a $0 sell, or a "Mark as worthless / written off" action that records a 0-value exit so realised P&L shows the full loss. At minimum, a hint saying why the button is disabled.
- **New.** Product decision. The current behaviour is intentional for buys (A5), but a sell at 0 is a legitimate event.
- **Suggested fix:** in `src/components/AddEntry.jsx` / `addEntry`, allow `prc === 0` for `type === "sell"` (keep `> 0` for buys), and make sure `utils/pnl.js` handles zero proceeds.

### P03-28 · Medium · Account → Plan & billing says "AI research · **Live**" while AI is switched off and not built
- **Steps:** Account → Plan & billing. Repro'd 2× (before and after reload).
- **Expected:** No AI claim. Per the project's honesty rule ("no AI claims anywhere"), `aiResearch` is default-OFF and `AI_PROXY_LIVE` is false. Or a neutral row such as "Research summaries · Included".
- **Actual:** "AI research — **Live** — Research summaries & analysis — included in every plan", while `/api/config` returns `features.aiResearch:false` and the Research tab shows only the deterministic Overview (no Coins/Ask).
- **Root cause:** `src/components/Account.jsx:263` hard-codes `AI research` / `Live`, with no gate on `site.features.aiResearch` or `AI_PROXY_LIVE`.
- **New.**
- **Suggested fix:** gate the row on `aiChrome` (`aiEnabled && AI_PROXY_LIVE`), or rename it "Research summaries · Included" until live AI ships. Sweep the interview.md consistency-map row for AI copy.

### P03-29 · Low · The delete-coin warning claims "your saved thesis" for coins that have no thesis
- **Steps:** Long tail → FLOKI (2 tx, thesis skipped and listed under Journal "Needs a thesis") → Detail → trash. Repro: SIF (6 tx, no thesis). Repro'd 2×, cancelled both times.
- **Actual:** "Delete FLOKI? This coin has 2 buy/sell transactions **and your saved thesis**. If you delete it … you'll lose that data." Same for SIF ("6 buy/sell transactions and your saved thesis").
- **Expected:** Mention the thesis only when `coin.journal` exists, e.g. "This coin has 6 buy/sell transactions."
- **Root cause:** the R4-3 warning copy in `src/components/Detail.jsx` (the `confirmDel && entries.length>0` modal, line 157) appends the thesis clause unconditionally.
- **New.**
- **Suggested fix:** build the sentence from `entries.length` plus `!!coin.journal`.

### P03-30 · Low · The oversell toast for a *new* sell tells you to "delete or reduce that sell first"
- **Steps:** (a) Doge Only: sell 1,000,000.000001 DOGE when holding 1,000,000. (b) PEPE: sell 1,000 dated 2026-11-20, before any buy. Repro'd 2×.
- **Actual:** "Can't save — a sell on 2026-11-22 would exceed your holdings. **Delete or reduce that sell first.**" There is nothing to delete; the offending sell is the one being typed. The guard itself is correct (BUG-019 fixed).
- **Expected:** For a new or edited sell: "You only hold 1,000,000 DOGE on 2026-11-22 — reduce the amount or change the date." Keep the current wording for the edit/delete-a-buy case, where an existing later sell is the problem.
- **New.** Copy only.
- **Suggested fix:** in `src/CryptoIdea.jsx` `addEntry`, branch the `firstOverSoldSell` message on whether the offending sell is the entry being saved. Include the holdable amount.

## Known bugs re-checked
| Bug | Result | Evidence (this session) |
|---|---|---|
| BUG-021 Search shows mock prices, thesis saves them | **Still present** | Search rows: PEPE `$0.0000118000 +9.20% #63` (held, live $0.00000341 shown on its own card), BONK `$0.0000285000 #64` (live $0.0000021, #158), DOGE `$0.1650` (live $0.0555), SHIB `$0.0000245`. "Before you add Bonk" showed `$0.0000285000`, and the saved thesis reads "Thesis written Nov 22, 2026 · $0.0000285000" (13.6× live). A non-TOP coin (Baby Doge) saves no price at all. By contrast, adding the PEPE thesis **later** from Journal → "Add thesis" saved the live `$0.0000034100`, so the two entry points disagree. |
| BUG-022 Empty holding shows green "+$0.00" | **Still present** | Baby Doge at 0 holding: Detail Total P/L `+$0.00 (+0.00%)`, colour rgb(7,80,58) green. Doge Only after a flat round-trip: header `▲ +$0.00 (+0.00%)` and Detail `+$0.00 (+0.00%)` green. |
| BUG-023 AUTO buy price pre-fills the mock price | **Still present**, with an additional root cause (see P03-02) | PEPE 0.0000118, BONK 0.0000180753, DOGE 0.165000 pre-filled in Buy/Sell. |
| BUG-024 Tx time recorded in UTC, shown as local | **Still present** | Local clock 12:52 → date field pre-filled `2026-11-22T10:52`, saved and shown as "Nov 22, 2026 10:52:00 AM" (all 6 transactions). |
| BUG-025 AUTO historical price is an estimate labelled as market price | **Still present** (related) | With PEPE `/api/history` empty, AUTO/"Suggested price" is the built-in estimate `$0.0000118000`, titled "Using the market price for this date". CoinInfo "Price History" for SHIB shows flat estimate milestones (P03-03). Picking a date before PEPE's launch clamps to 2023-04-18 ("Date adjusted to earliest available") and pre-fills the estimate `0.0000015000`, which is orders of magnitude above PEPE's real launch-week price. |
| BUG-026 Mixed minus signs | **Still present** | `−$2,450,990,999,754,573.50 (-100.00%)` (Detail). CoinInfo `-7.56% today` / `-45.97% today` use a hyphen too. |
| BUG-027 Escape doesn't close coin Detail popup | **Still present**, root cause found | Escape ×2 (with and without focus inside) left Detail open. CoinInfo overlay also ignores Escape. `src/components/Modal.jsx` has **no Escape handler at all** (its only keydown listener is the Tab focus-trap, and only when `trapFocus`). The X is a `div role="button"` with no `tabIndex`, so it is not keyboard-reachable. |
| BUG-028 Learn modules 2–9 locked | **Still present** | Learn: only "How Markets Really Work" has Start; Tokenomics & Supply etc. show a lock icon, and clicking does nothing. |
| BUG-029 Quiz answers not exposed as controls | **Still present** | Lesson 1 quiz: each answer is `<div class="quiz-opt">` with no role and `tabIndex -1`. The accessibility tree lists no answer controls. |
| BUG-030 Wrong quiz answer stays highlighted green | **Still present** | Picked "The team shipped a major product" → Submit → "Not quite…", but the option keeps `quiz-opt selected` with a green rgba(31,157,85,.18) fill. Repro'd 2× (options 1 and 3). |
| BUG-031 Name field strips accents/apostrophes/hyphens | **Still present** | Account → Profile → typing "Zoë O'Neil-Ape" leaves "Zo ONeilApe"; "José D'Ape" leaves "Jos DApe". Repro'd 2×, not saved. |
| BUG-032 Upsell to a plan that can't be bought | **Still present** | At 3/3 portfolios, Account → Portfolios → + Add → toast "Starter: 3 portfolios — upgrade to Pro for 6", while `/api/config` has `paidPlansEnabled:false, checkout:false`. Repro'd 2×. (The Portfolio-header "+" correctly hides at 3/3.) **Coin variant too:** filled Long tail to 30/30, then Search → + Add opens the full "Before you add MetaDAO…" thesis prompt, and only after Save/Skip does it say "Starter: 30 coins — upgrade to Pro for 100". Repro'd 2× (two different coins). Anything typed into the prompt is wasted, and the upsell is again to an unbuyable plan. Suggest checking the cap **before** opening the prompt. |
| BUG-033 Oversized "Security & payment emails" text | **Still present** | Account → Privacy & data: `.usage-note` "Security & payment emails are always sent…" is 16px next to 11px sibling hints (light mode, measured). |
| BUG-036 100% single-token book rated Low | **Still present** (meme variant) | "Doge Only" portfolio = 100% DOGE → **Low** risk with "Mostly top-ranked coins, which keeps single-coin risk lower". The 92% PEPE meme book → Moderate. Risk is rank-only (`coinRisk` in `research/utils/portfolio.js`) with no concentration term. |
| BUG-037 Stress test "higher-beta amplify" at exactly −50% | **Still present** | Moonshot = 100% EVAA (rank ~632, −38% that day): −50% → "$1,815 (−50.0%). Your higher-beta holdings amplify the swing." and +50% → "$5,445 (+50.0%)… amplify". The sentence is hard-coded in `StressTest.jsx:31`. Root cause in P03-09: a lone holding is index 0, so it always gets beta 1.0. |
| BUG-038 Daily Brief always ▲ | **Still present** | Moonshot portfolio = 100% EVAA (−38% 24h): "▲ Portfolio is **down** $2,316 (−38.0%) over the last 24 hours." The icon is `brief-ic ic-up` in green rgb(92,214,166). Repro'd 2× (before and after reload). |
| BUG-020, BUG-034, BUG-035, BUG-039 | Not reached | Account setup and delete-account flows were out of this persona's charter; admin is off-limits. |
| BUG-009 `/api/history` can't tell delisted from no data | **Still present** (related) | PEPE and BTC return `{"prices":[]}` with `max-age=86400`. See P03-07. |
| BUG-019 Oversell guard | **Appears fixed** | Sell 1,000,000.000001 of 1,000,000 DOGE was blocked: "Can't save — a sell on 2026-11-22 would exceed your holdings." Exact full sell was accepted. |
| BUG-015 $1-low rounding | **Appears fixed** on header/cards | e.g. `$4,207,319.01`, `$1,524,907.88`. The Detail sub-values have the separate P03-01 3-decimal issue. |
| BUG-017 NaN diversification | **Appears fixed** | All Research notes numeric. |

## What worked well
- Big-number arithmetic is right everywhere I checked: 1,234,567,890,123 × 0.00000123456789 = $1,524,157.88; proceeds, invested totals, header P/L and Research cost basis reconcile to the cent across Portfolio and Research.
- The oversell guard (BUG-019) holds on add, edit (amount down, type Buy→Sell) and delete. The future-date guard works. Both give clear toasts.
- Real `/api/history` AUTO prices for coins that have history (BONK 2026-06-01 → $0.0000055198, matching the series exactly).
- Live polling every 60 s. Non-TOP coins (EVAA, Baby Doge, SIF) get correct live pre-fills and overlay data.
- Portfolio card and Detail correctly show a muted "—" for a missing 24h change. Unpriced logic is honest there.
- Portfolio limit: the header "+" hides at 3/3. The 50-char name cap and emoji names render fine.
- Dark mode is consistent and readable across all the screens I visited. No console errors in the whole session.
- Journal: thesis + funnel finding persisted; "add thesis later" records the live price; review status updates instantly.

## Timeline
- 12:51 — start; health check OK (app :3000 = 200, functions :5001 responds). Logged in as p03 (account already existed with 1 PEPE buy from an earlier run).
- 12:52–12:55 — PEPE trillion-unit buy and sell: P03-01 (3-decimal money), P03-02 (mock pre-fill). BUG-024/027 re-checked.
- 12:55–12:58 — Search/Trending/CoinInfo: P03-03 (mock overlay), P03-04 (rank drift). Baby Doge: P03-05 (e-notation → ×1e10), P03-06 (1-sig-fig price), P03-07 (empty history + 24h cache).
- 12:58–13:02 — Added WASTED/BONK/BONK buy; Research meme book: P03-08 (Pulse coverage), P03-09 (stress beta), P03-10 (risk copy); "Doge Only" portfolio re-checks BUG-036.
- 13:02–13:07 — Oversell/flat round-trip (BUG-019 fixed, BUG-022 present), mobile iframe 360/390 (P03-11), dark mode, tab scroll (P03-12), Edit path of P03-05 (saved $2.45 quadrillion cost basis, then restored).
- 13:07–13:12 — Landing DCA: P03-13 (BTC estimate shown as real), P03-14 (micro-cap formatting/stale card). Backdated BONK buy (real history OK), WASTED removed, portfolio rename.
- 13:12–13:17 — $3.4B book on phone width: P03-16; tx two-tap delete; edit-oversell + future-date guards OK; CoinInfo held-coin history contradiction; Journal add-thesis-later.
- 13:17–13:25 — CSV exporter (P03-17), logout/login persistence + search leak (P03-18), closed-portfolio Research (P03-19), EVAA book re-checks BUG-038, Learn quiz BUG-029/030, dust sells (P03-20), portfolio limit BUG-032, Long tail + SIF (P03-21), over-length thesis (P03-22).
- 13:25–13:33 — FLOKI/SIF flips (P03-23), small-book Pulse (P03-24), header % denominator (P03-25), BUG-037 exact repro on EVAA, AUTO vs live after a dump (P03-26), $0 rug exit (P03-27), Plan & billing AI claim (P03-28).
- 13:33–13:40 — 360/320px header and value-card overflow at 7 figures (P03-11/16 extended), delete-coin copy (P03-29), oversell toast copy (P03-30), Journal finding save, Learn correct answer (+50 XP), backdated-oversell and pre-launch-date guards.
- 13:40–13:46 — Final re-verification of the High findings (P03-02 PEPE pre-fill still 0.0000118; P03-13 landing BTC still "$103,000", no notice; PEPE history still empty). Filled Long tail to the 30-coin cap (BUG-032 coin variant), checked a 30-coin grid at 390px, dog/wif searches, catwifhat/Dogelon overlays. Console clean. Tab closed.
