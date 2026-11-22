# Persona 01 — Active trader · 1-hour test · 2026-11-22
Status: Complete | Account: p01.trader@test.com (persona name "Tara Trader"; account already existed — not re-registered) | Start: 11:01 (local, UTC+2) | End: 11:56 | Minutes tested: 55

## Persona
An active trader who rotates in and out of 3-5 large caps (BTC, ETH, SOL, XRP, BNB), logs many buys and sells at different prices and dates, and relies on the app's cost-basis math (avg buy, realised vs unrealised P&L, value card totals) being exactly right.

## Data created
Pre-existing data on the account (from an earlier run, 2026-11-21): 1 portfolio, BTC — BUY 0.5 @ $58,000 (Nov 21 17:05), SELL 0.2 @ $62,000 (Nov 21 17:06).

| # | Coin | Type | Amount | Price | Date/time entered | Notes |
|---|------|------|--------|-------|-------------------|-------|
| 1 | BTC | Buy | 0.25 → edited to 0.3 | 61,000 → edited to 60,500 | 2026-10-15 14:30 | edit OK; edit to 0.05 correctly blocked (would oversell the Nov 10 sell) |
| 2 | BTC | Sell | 0.1 | 65,000 | 2026-11-10 09:00 | partial sell; later deleted (2-step delete) |
| 3 | BTC | (edit of #1) | 0.3 → 0.28 | 60,500 → 60,800 | 2026-10-15 14:30 | second edit, for P01-02 repro |
| — | ETH, SOL, XRP | coin added | — | — | — | via Search, "Skip for now" (no thesis) |
| 4 | ETH | Buy | 2 | 2,005.05 (AUTO, real history) | 2026-06-01 10:00 | AUTO correctly used real history for ETH |
| 5 | ETH | Buy | 1.5 | 1,550 | 2026-09-20 16:45 | |
| 6 | ETH | Sell | 1 | 1,800 | 2026-10-30 08:15 | partial |
| 7 | ETH | Sell | 2.6 → rejected, then 2.5 | 1,700 | 2026-11-22 10:30 | oversell blocked; then full exit |
| 8 | SOL | Buy | 10 | 72.50 | 2026-08-01 09:00 | |
| 9–63 | SOL | 41 buys (1–3 SOL) + 14 sells (1 SOL) | — | 60.75 → 101.25 (+0.75 per trade) | every 2 days 2026-08-03 → 2026-11-18, varied times | entered through the Buy/Sell form (scripted form fill); 56 tx total → pager |
| — | SOL | 6 deletes | — | — | — | Aug 9 sell + the 5 oldest buys (page 2), back to 50 tx |
| — | SOL | 2 buys 1 @ 70 later today (21:15, 23:00) | — | — | — | accepted though in the future (P01-06); deleted |
| 64 | XRP | Buy | 5,000 | 0.6123 | 2026-07-10 07:05 | |
| 65 | XRP | Buy | 2,500 | 1.0567 | 2026-10-01 19:40 | |
| 66 | XRP | Sell | 3,000 | 1.10 | 2026-11-05 12:00 | |
| 67 | XRP | Buy | 3 | 0.9001 | 2026-11-22 10:00 | |
| — | BNB | coin added **with a thesis** | — | — | — | thesis "Exchange token with steady burn; I trade the range $550-$700." / change-my-mind "Close below $500 on the weekly chart." |
| 68 | BNB | Buy | 4 | 560 | 2026-09-05 11:00 | two buys back-to-back (~1 s apart), no cooldown error |
| 69 | BNB | Buy | 2 | 610 | 2026-10-12 15:30 | |
| 70 | BNB | Sell | 3 | 655 | 2026-11-15 09:45 | |
| 71 | BNB | Sell | 3 | 530 | 2026-11-21 22:10 | full exit, +$95.00 |
| — | portfolio | created "Swing trades" (2/3) | — | — | — | became active automatically |
| 72 | BTC (Swing) | Buy | 0.1 | 58,800 | 2026-11-19 13:00 | |
| 73 | BTC (Swing) | Sell | 0.05 | 61,250.50 | 2026-11-20 18:20 | |
| — | portfolio | renamed "Swing trades" → "Swing & Scalps - Q4 '26 #2" | | | | special characters kept |
| — | XRP | edit Nov 22 buy 3 → 500 XRP | | | | for the 3rd P01-02 repro |
| 372 | BNB | Buy | 1 | 540 | 2026-11-22 08:00 | |
| — | SHIB | coin added (Search showed mock $0.0000245) | | | | |
| 375 | ETH | Buy (re-entry after full exit) | 1 | 1,690 | 2026-11-22 11:00 | prefill was mock 1900 |
| — | ETH | thesis added from Journal → "Add thesis" | | | | "Re-entry: L2 fees falling…" / "Daily close under $1,550." |
| 373 | SHIB | Buy | 25,000,000 | 0.00001234 | 2026-10-02 10:00 | small-price formatting OK |
| 374 | SHIB | Sell | 10,000,000 | 0.0000151 | 2026-11-12 16:00 | P/L −$103.35 correct |
| 74–371 | BTC (Swing) | 298 buys | 0.001 each | 40,000 → 42,970 (+10/day) | daily 2026-01-01 → 2026-10-25, 12:00 | scripted form fill; coin reaches the 300-tx Starter cap; 299th add refused |
| — | BTC (Swing) | edit #72 amount 0.1 → 0.12 | | | | |
| — | SOL | edit Nov 14 BUY 3 → SELL → back to BUY | | | | type toggle in edit works (63→57→63) |
| — | SOL | delete Nov 18 BUY 2 | | | | 49 tx, 61 SOL |
| — | SOL | Buy 999,999,999,999,999 @ 70.66 (AUTO), default date | | | saved as Nov 22 09:30 | accepted (rules cap is 1e15, by design); total shown `$70,659,999,999,999,930.00`; deleted |

## Coverage
| Flow | Result |
|------|--------|
| Login as persona (account already existed from an earlier run; shared browser was signed in as another dev account → logged that out first) | Pass |
| Buy / partial sell / full sell on BTC, ETH, SOL, XRP, BNB at many prices and back-dated dates | Pass (all hand-checked) |
| Avg buy, avg sell, holding, current value, total P/L per coin (Detail) | Pass on math; 3-decimal display (P01-08) |
| Portfolio value card (value, P/L, INVESTED, 24H, assets) | Math consistent; INVESTED = gross buys (P01-03); mock flash on load (P01-12); empty book green `+0.00%` (BUG-022) |
| Realised vs unrealised | Not shown in Detail; coin-info shows unrealised only; Research shows a third figure (P01-04) |
| Edit transaction (amount, price, buy↔sell type) | Saves correctly; on-screen revert after another coin changes (P01-02); no cross-tab live sync for edits |
| Edit guard (edit a buy below what a later sell needs) | Pass — blocked with a clear toast |
| Delete transaction (2-step, auto-disarms), incl. on pager page 2 | Pass (the "Delete?" confirm disarms if you wait ~2 s — by design) |
| Oversell / backdated sell / next-day date / zero price | Pass (blocked); later-today time accepted (P01-06); oversell copy (P01-05) |
| Newest-first tx order | Pass (by date, incl. back-dated inserts) |
| 50/page pager (56 tx → 50 + 6; Prev/Next disabled states; collapse at 50) | Pass; stale page after shrink/add (P01-07) |
| Date/time recorded on each tx | UTC prefill, recorded 2 h early (BUG-024) |
| AUTO price | Mock prefill on all 4 coins tried (BUG-023); real history works for ETH; BTC stuck on estimate (P01-01) |
| Minus signs | `−$641.26 (-15.99%)` mixed (BUG-026) |
| Detail popup + coin-info overlay + "Transactions" pill | Pass; coin-info Price History is the estimate table (P01-09); Escape closes nothing (BUG-027) |
| Delete coin warning | Wrong thesis copy (P01-11); cancel works |
| Second portfolio: create, auto-activate, switch both ways, data per portfolio | Pass |
| Search → add coin (with and without thesis) | Pass; mock prices in results and in thesis `priceAtAdd` (BUG-021) |
| Journal (thesis list, detail) | Pass; thesis price mock (BUG-021) |
| Research Overview (Brief, Pulse, allocation, risk, stress test, note) | Renders; Pulse 30d attribution wrong due to P01-01 |
| Two tabs (live sync) | Deletes sync, edits don't (P01-02) |
| Browser Back / reload | Works; mock flash on Back (P01-12) |
| Input sanitising (`1,000`, `1e3`, `-5`, 15-digit amount) | By design (TX-SAFE / ≤1e15) |
| Dark mode (Portfolio, Detail, tx rows, delete dialog) | Pass — readable |
| Phone width | **Not checked** — the Chrome window ignored resize (stayed 1536 px) |
| Console errors | None captured during the session |

## Findings
Summary: 14 new (P01-01…P01-14: 3 High · 6 Medium · 5 Low) plus 5 repeats re-confirmed with new evidence/root causes (BUG-023, BUG-024, BUG-027, BUG-032 new surface; BUG-026 in the table below). All fixes are proposals only — nothing in the repo was changed.

### BUG-023 (repeat) · High · Buy form AUTO price pre-fills the mock $84,000 for BTC while live is $59,730
- **Steps:** Portfolio → tap the Bitcoin card → Detail → `+ Buy`. Read the Price field.
- **Expected:** the live price shown at the top of the same Detail popup ($59,730.00).
- **Actual:** Price field = `84000.00` with the AUTO badge titled "Using the market price for this date". Reproduced 3× (closed/reopened after 3–4 s, live price already loaded every time).
- **Repeat of BUG-023 — still open.** New root-cause detail: it is not only the `useLivePrices` seed. `startAddTx` in `src/CryptoIdea.jsx:856` prefers `getHistoricalPrice(coin.id, now)` (the built-in estimate table in `src/utils/coins.js:460`, which for "today" equals `mockPrice`) over the live `prices[coin.id].usd`: `setEPrice(fmtPriceInput(hp)||(pr?pr.toString():""))`.
- **More evidence:** ETH pre-filled `1900.00` (live $1,684); XRP `2.18` (live $0.92, +136%); SOL `125.00` while the same form's own hint says `Suggested price: $70.66 · tap AUTO to use` — the prefill disagrees with the form's own suggestion. Worst case: SHIB pre-filled `0.0000245000` while live is `$0.0000036100` (6.8× too high) — a trader who accepts the prefill records a cost basis ~580% off. For ETH the 15% tolerance in `AddEntry.jsx:59` (`priceIsHist`) marks the mock $1,900 as "Using the market price for this date" because it is within 15% of the real $1,684.
- **Suggested fix:** for a "now" transaction prefer the live quote (`pr`) and only fall back to history for past dates; never AUTO-fill from the estimate table without labelling it (ties to BUG-025).

### BUG-024 (repeat) · High · Date & Time pre-fills UTC, not local time
- **Steps:** Detail → `+ Buy` at 11:03 local (browser TZ = Israel, UTC+2). Read the Date & Time field.
- **Expected:** `2026-11-22T11:03`.
- **Actual:** `2026-11-22T09:03`. Reproduced 2× (both reopenings).
- **Recorded effect:** a SOL buy entered at ~11:36 local with the default date was saved and listed as `Nov 22, 2026 09:30:00 AM` (2 h early). Every default-dated trade in this session carried the same −2 h shift.
- **Repeat of BUG-024 — still open** (`src/CryptoIdea.jsx:183` and `:857`, `toISOString().slice(0,16)`).

### P01-01 · High · An empty `/api/history` response is HTTP-cached for 24 h, so AUTO keeps using the built-in estimate even after real history is available
- **Steps:** Signed in on a profile that had loaded the app earlier. Detail → `+ Buy` (or edit) BTC, change the date to 2026-10-15. Read "Suggested price". Then in the page console: `fetch('/api/history?id=bitcoin')` vs `fetch('/api/history?id=bitcoin',{cache:'no-store'})`.
- **Expected:** the suggested/AUTO price for 2026-10-15 comes from real history (the server has it: $81,603.65 for that day; today $59,712).
- **Actual:** suggested price is the estimate-table value `$84,000.00` for every date (today, Oct 15, Nov 10). Normal `fetch('/api/history?id=bitcoin')` returns `{"prices":[]}` (0 points) from the browser HTTP cache, while the same URL with `cache:'no-store'` returns 366 real points. ETH and SOL (not previously cached) return 366 points. Reproduced 2× (two separate fetch pairs).
- **Root cause (read from source):** `functions/index.js` `/api/history` handler (~L3463 and ~L3486) always sends `Cache-Control: public, max-age=86400`, including for the empty "not in universe yet" branch and for the 1-hour negative-cache (`miss`) branch. The server only remembers a miss for 1 h (`HISTORY_NEG_TTL`) but tells browsers (and, once deployed, the Hosting CDN — i.e. every user) to keep the empty answer for 24 h. The client (`src/api/coingecko.js` `fetchHistory`, `src/hooks/useCoinHistory.js`) then falls back to `getHistoricalPrice` silently.
- **Research impact (found 11:26):** the Research Pulse derives 7d/30d change from the same history. With BTC's cached empty history BTC counts as 0% over 30 days, so the Pulse said `Your portfolio is $43,137, −5.0% over the last 30 days … Over the last 30 days, Solana drove about 100% of that move` — while BTC (80% of the book) is really −26.1% over 30 d (server data, fetched with `no-store`). The book's real 30-day move is roughly −23%. XRP history came back empty even with `no-store`, so XRP also reads 0%. Second repro on the 100%-BTC Swing book: `Your portfolio is $22,133, +0.0% over the last 30 days` and `+0.0% over the last 7 days` (real BTC: −26.1% / −8.2%). Missing history "degrades to 0%" by design (`priceAdapter.js`), which here produces a confidently wrong summary.
- **Impact:** a trader backdating trades gets an estimate (here +3% to +41% off) labelled "Using the market price for this date" — cost basis silently wrong. Related to BUG-025 (labelling) and BUG-023 (mock prefill) but a distinct cause.
- **New.** **Suggested fix:** send a short `max-age` (e.g. 60–300 s, or `no-store`) when `prices` is empty or `miss` is set; keep 86400 only for real data. Optionally have `useCoinHistory` treat `[]` as "unavailable" and not put it in the LRU cache.

### P01-02 · High · An edited transaction silently reverts on screen as soon as any other coin changes — including a normal buy/sell on another coin (the edit is saved, the UI shows the old numbers)
- **Steps:** Portfolio → Bitcoin card → Detail → tap the Oct 15 BUY row → change amount 0.25→0.3 and price 61,000→60,500 → Save Changes. Detail and value card update correctly (0.5 BTC, invested $47,150). Close Detail → Add → add any new coin (ETH; second run: SOL) → Skip for now.
- **Expected:** BTC still shows the edited values.
- **Actual:** BTC jumps back to the pre-edit numbers (0.45 BTC / invested $44,250 / P/L +$1,528.50 on run 1; 0.5 BTC / $47,150 instead of the edited 0.48 BTC / $46,024 on run 2). The Detail transaction list also shows the old row. A page reload shows the edited values again, so the server data is right — the open session is wrong. Reproduced 2×. A trader who edits a fill and then adds a coin sees a wrong P&L/avg buy with no warning.
- **Third repro, the everyday trader flow (11:58):** edit XRP's Nov 22 buy 3 → 500 XRP (Detail shows `Holding 5,000 XRP`, card `$4,628.40`) → close → open BNB → add a normal Buy (1 BNB @ $540). The XRP card immediately reverts to `4,503 XRP · $4,168.34`; reload shows `5,000 XRP` again. So any trade on another coin undoes the on-screen edit.
- **Second-device check (11:34):** with a second tab of the app open, changing the SOL Nov 14 trade from Sell back to Buy in tab A (63 SOL) left tab B on `Solana 57 SOL` for 8+ s; a reload of tab B showed 63. A **delete** in tab A (Nov 18 buy, 63→61) *did* reach tab B within 8 s. So edits are the only write that doesn't live-sync.
- **Not affected:** a transaction delete followed by adding a coin did *not* revert (checked once); deletes do propagate (they trigger the counter reconcile, which touches the coin doc).
- **New.** **Root cause (read from source):** `updateTransaction` in `src/api/firebase-database.js:419` updates only the transaction doc and does not touch the parent coin doc. `watchCoins` (`src/api/firebase-database.js:487`) re-reads a coin's transactions only when that coin doc changes (it relies on the `txCount` bump), and keeps a per-coin `cache` of entries. When a different coin doc changes (the new coin), the callback emits `snap.docs.map(d => cache.get(d.id))` with BTC's *stale cached entries*, and `src/CryptoIdea.jsx:~966` writes them into `portfolios[active].coins`, overwriting the optimistic edit made at `src/CryptoIdea.jsx:906`. Side effect: an edit made on a second device never live-syncs either (C-A3 promise).
- **Suggested fix:** make the edit bump the parent coin doc in the same `writeBatch` (e.g. an `updatedAt`/`txRev` field allowed by `firestore.rules`) so `watchCoins` re-reads that coin; or have `watchCoins` refresh its cache entry for a coin after a local edit. Add an integration test: edit tx → add another coin → assert entries.

### P01-03 · Medium · Value card "INVESTED" and the P/L % use lifetime gross buys, so an active trader's "invested" balloons with every round-trip
- **Steps:** BTC book (bought $46,024, sold $12,400) + ETH bought $6,335.10 then **fully sold** for $6,050. Read the Portfolio value card.
- **Expected:** "Invested" = money still at work (net cash in, $52,359.10 − $18,450 = $33,909.10, or the cost basis of what is held), or the label says "Total bought". P/L % against a stated basis.
- **Actual:** `PORTFOLIO VALUE $34,620.78 · ▲ +$711.68 (+1.36%) · INVESTED $52,359.10`. The fully-exited ETH still counts in Invested, and value < invested is shown next to a *profit*, which reads as a contradiction. The % is diluted by every past round-trip (buy/sell the same $1k ten times → "invested $10k"). Reproduced on 2 states (after BTC sell: invested $44,250 vs value $26,878 and +$1,528; after ETH exit as above).
- **New.** **Root cause:** `src/components/Portfolio.jsx:67` renders `totalBuys`; `src/utils/pnl.js:83` already computes `invested: totalBuys - totalSells` ("net cash in") but it is not used. `pnlPct` divides by `pnlBuys` (gross).
- **Suggested fix:** founder decision on the definition — either show net `invested`, or relabel to "Total bought" and add a "Cost basis (held)" figure; state the % basis.

### P01-04 · Low · No realised vs unrealised split anywhere
- **Steps:** BTC Detail after partial sells; ETH Detail after a full exit.
- **Expected (trader):** realised P/L (closed) and unrealised P/L (open) shown separately, at least on Detail.
- **Actual:** only one "Total P/L" line (`+$996.78 (+2.17%)`; fully-sold ETH `−$285.10 (-4.50%)`). Checked on BTC and ETH. Also the avg-buy figure is a lifetime pooled average (`$58,937.50` after the edit) rather than the cost basis of the coins still held, so a hand-calculated FIFO/rolling-average cost differs (rolling average at the time gives $58,692).
- Note: the coin-info overlay *does* show an "Unrealised P/L" row (SOL `−$858.06`), so the two P/L surfaces of the same coin disagree in what they show; realised P/L appears nowhere. The Research Pulse adds a third figure: `Against a $42,892 cost basis you're up $246 (0.6%)` (unrealised only) while the value card says `+$1,569.18 (+2.44%)` — same book, three P/L numbers, none labelled realised/unrealised.
- **New (feature gap).** **Suggested fix:** add Realised / Unrealised rows to the Detail `pnl-row` block (`src/utils/pnl.js` already has `realizedProceeds`); document the averaging method in the UI.

### P01-05 · Low · Oversell message on a NEW sell says "Delete or reduce that sell first" and gives no maximum
- **Steps:** ETH holding 2.5 → Sell → amount 2.6 → Add Sell.
- **Expected:** "You hold 2.5 ETH — you can sell at most 2.5", ideally a MAX shortcut in the Sell form.
- **Actual:** toast `Can't save — a sell on 2026-11-22 would exceed your holdings. Delete or reduce that sell first.` — "that sell" is the one being typed; no available-amount hint in the form. Reproduced 2× (BTC edit case and this ETH new-sell case show the same copy).
- **New.** **Suggested fix:** separate copy for the new-sell case in the `firstOverSoldSell` caller in `src/CryptoIdea.jsx` `addEntry`; show "Available: X" under the Amount field when Sell is selected (`src/components/AddEntry.jsx`).

### P01-06 · Medium · "No future dates" guard is day-granular and UTC-based: a trade later today is accepted, and near midnight the wrong day is blocked/allowed
- **Steps:** at 11:19 local (UTC+2) open SOL → Buy → Date & Time `2026-11-22T21:15` (and a second run `2026-11-22T23:00`) → amount 1, price 70 → Add Buy.
- **Expected:** rejected like a next-day date ("A transaction can't be dated in the future.") — 21:15 hasn't happened yet.
- **Actual:** both saved (Transactions 50→51→52; rows "Nov 22, 2026 09:15:00 PM" and "11:00:00 PM"). `2026-11-23T10:00` is correctly rejected. Reproduced 2×. (Rows deleted afterwards.)
- **New.** **Root cause:** `src/utils/tx.js:79` `isFutureTx` compares only `YYYY-MM-DD` against `new Date().toISOString().slice(0,10)` (the **UTC** date), and `src/components/AddEntry.jsx` caps the picker at UTC-today `T23:59`. So: any later-today time passes; between 00:00–02:00 Israel time a genuine "now" trade dated with the local date is rejected as future; for users west of UTC an evening next-day date passes. Same family as BUG-024.
- **Suggested fix:** compare full timestamps: `new Date(dateStr) > new Date()` (the `datetime-local` string parses as local time); build the picker `max` from local getters.

### P01-07 · Low · Transaction pager remembers a page that no longer exists; after adding a trade you land on the last page and don't see the new trade
- **Steps:** SOL with 56 tx → Page 2 → delete page-2 rows until 50 remain (pager disappears, list shows the 50 newest) → later add two trades (52 tx).
- **Expected:** after adding a trade the list shows page 1 with the new trade at the top.
- **Actual:** the list jumps to **page 2** (the 2 oldest trades, Aug 13/Aug 15) with "2" highlighted; the trade just added is not visible. Seen on 2 consecutive adds (51 and 52 tx).
- **New.** **Root cause:** `src/components/Detail.jsx:40/57` keeps `txPage` state and only clamps it for display (`pg = Math.min(txPage, pages)`); it is never reset when the list shrinks or a trade is added.
- **Suggested fix:** `setTxPage(1)` after an add, and clamp the state itself (`useEffect(() => setTxPage(p => Math.min(p, pages)), [pages])`).

### BUG-027 (repeat) · Medium · Escape doesn't close the Detail popup or the Buy/Sell form
- **Steps:** SOL Detail → `- Sell` form open → press Escape (focus on body); again with focus inside the Amount input; then with only Detail open.
- **Actual:** nothing closes in any of the 3 cases; a 4th check on the Journal thesis dialog (focus inside the dialog) also stayed open. Also, opening the Buy form leaves keyboard focus on the `+ Buy` button *behind* the popup.
- **Repeat of BUG-027 — still open.** **Root cause found:** `src/components/Modal.jsx` has no Escape handler at all — its only `keydown` listener handles Tab, and only when `trapFocus` is set; focus is moved into the dialog only when `trapFocus` is set.
- **Suggested fix:** add an Escape → `onClose()` listener (skip when `hideClose`), and focus the dialog on open for every modal.

### P01-08 · Medium · P/L amounts shown with three decimals ("+$1,752.788")
- **Steps:** XRP: buy 5,000 @ $0.6123 (2026-07-10), buy 2,500 @ $1.0567 (2026-10-01), sell 3,000 @ $1.10 (2026-11-05). Open Detail; open the coin-info overlay.
- **Expected:** money to the cent: `+$1,752.79`.
- **Actual:** Detail `Total P/L +$1,752.788 (+30.73%)`; after one more buy (3 @ $0.9001) `+$1,752.858`; coin-info overlay `Unrealised P/L +$734.326 (+21.44%)`. Reproduced 3× across both surfaces. Reproduced again in a second portfolio: BTC buy 0.1 @ $58,800, sell 0.05 @ $61,250.50 → `Sold 0.05 BTC · $3,062.525` and `Total P/L +$181.375 (+3.08%)` (the tx row itself correctly shows `$3,062.53`).
- **New.** **Root cause:** `src/components/Detail.jsx:93` (Bought), `:96` (Sold), `:99` (Total P/L) and `src/components/CoinInfo.jsx:100` call `toLocaleString("en-US",{minimumFractionDigits:2})` with no `maximumFractionDigits`, so up to 3 decimals render. PORTFOLIO-NUM-FIX's `splitMoney` (`src/utils/money.js`, cents-first rounding) isn't used here. Minor related precision note: tx rows show a $1.0567 fill as `$1.06 / XRP` (`fmtP` ≥ $1 → 2 dp) while $0.6123 shows 4 dp.
- **Suggested fix:** route both through the shared money formatter (`maximumFractionDigits:2`, cents-first rounding) and add a unit test with a 3-decimal P/L.

### P01-09 · High · Coin-info "Price History" shows built-in estimate prices — "Today $125.00" for SOL while the same card says $69.62
- **Steps:** tap a coin icon (coin-info overlay) for XRP, then for SOL.
- **Expected:** real historical prices (the app already has `/api/history`), and "Today" equal to the live price at the top of the card.
- **Actual:** XRP: header `$0.9236`, Price History `1 Year Ago $2.18 -57.63% · 6 Months Ago $2.18 · 3 Months Ago $2.18 · Today $2.18`. SOL: header `$69.62`, `1 Year Ago $125.00 -44.30% · 6 Months Ago $125.00 · 3 Months Ago $125.00 · Today $125.00`. Three identical "past" prices and a "Today" price that contradicts the header, with signed % changes computed from them. Reproduced on 2 coins.
- **New** (same family as BUG-021/BUG-025, different surface). **Root cause:** `src/components/CoinInfo.jsx:105–131` uses only `getHistoricalPrice` (the static `PRICE_HISTORY` milestones in `src/utils/coins.js`), which returns the last milestone (≈ the old mock price) for every date after the table ends; it never uses `useCoinHistory`.
- **Suggested fix:** use `useCoinHistory` + `priceAtDate` for the 1y/6m/3m rows, use the live price for "Today", and hide a row (or label it "estimate") when real history is unavailable.

### P01-10 · Low · Wrong copy after a profitable exit: "you already profited more than your total investment"
- **Steps:** BNB: buy 4 @ $560 (2026-09-05), buy 2 @ $610 (2026-10-12), sell 3 @ $655 (2026-11-15), sell 3 @ $530 (2026-11-21). Open Detail.
- **Expected:** a true statement, e.g. "You've taken out more than you put in (+$95.00)".
- **Actual:** `Total P/L +$95.00 (+2.75%)` followed by `Sell proceeds exceed buy costs — you already profited more than your total investment`. A $95 profit on $3,460 invested is not "more than your total investment". Seen on 2 openings of the Detail (deterministic; condition from code).
- **New.** **Root cause:** `src/components/Detail.jsx:100` shows the note whenever `sellsGain > buysCost`; the sentence describes a >100% return, not "proceeds > cost".
- **Suggested fix:** reword (e.g. "Your sells have returned more than you put in — any remaining coins are pure profit"), or only show the current text when P/L > cost.

### P01-11 · Low · Delete-coin warning always says "…and your saved thesis", even when the coin has no thesis; the trash button has no accessible name
- **Steps:** Portfolio → Ethereum (no thesis — listed under Journal "Needs a thesis") → Detail → red trash icon top-right. Repeat on Solana (no thesis).
- **Expected:** mention the thesis only when `coin.journal` exists (BNB has one; ETH/SOL don't).
- **Actual:** `Delete Ethereum? This coin has 4 buy/sell transactions and your saved thesis…` and `Delete Solana? This coin has 50 buy/sell transactions and your saved thesis…`. Reproduced 2× (ETH, SOL); cancelled both times. Separately, the trash `button.icon-btn` has no text and no `aria-label` (accessibility tree shows a bare `button`).
- **New.** **Root cause:** hard-coded copy at `src/components/Detail.jsx:157`. (The warning box also uses inline light-mode hex colours `#FFF8E1`/`#92400E` at `:155–156`; it rendered acceptably in dark mode, so no visual bug, but it bypasses the tokens.)
- **Same pattern on Delete portfolio** (Account → Portfolios → Delete on "Swing & Scalps", which has 1 coin with 300 transactions and no thesis): `This portfolio has 1 coin and all its transactions and thesis.` (`src/components/Account.jsx` ~L104, R26 count-aware for coins only). The list row above reads `1 coins · Active` (`src/components/Account.jsx:94`, no singular). Cancelled; nothing deleted.
- **Suggested fix:** `{coin.journal ? " and your saved thesis" : ""}`; same check (any coin with `journal`) in the portfolio dialog; pluralise `coin/coins`; add `aria-label="Remove coin"` to the icon button.

### P01-12 · Medium · On load the value card first shows a mock-priced portfolio (`$66,161.54 ▲ +$24,890.99 (+36.84%)`) before the real one (`$43,119.47 ▲ +$1,848.92 (+2.74%)`)
- **Steps:** signed in with the book above, go to the landing `/` then press browser Back to `/app`; sample the value card every 0.5 s.
- **Expected:** a loading placeholder ("—") until live prices arrive, never a made-up value.
- **Actual:** `1.5s PORTFOLIO VALUE $66,161.54 ▲ +$24,890.99 (+36.84%)` (no LIVE badge), then `2.0s $43,119.47 ▲ +$1,848.92 (+2.74%) LIVE`. Reproduced 2× via Back navigation (the first time the fake numbers were still up when first read, several seconds in). A plain reload was fast enough to skip the flash, and a third Back was restored from the browser's back/forward cache (no reload) so no flash — it is timing-dependent, visible whenever the first `/api/prices` response is slower than the first render. If `/api/prices` fails (offline, `marketData` kill-switch) the mock-priced value stays up indefinitely — only the missing "LIVE" pill hints it isn't real. At session start the shared browser (another dev account) was showing BTC at exactly $84,000 with no LIVE pill.
- **New surface of the BUG-023 root cause** (BUG-023 is logged for the AUTO price only). **Root cause:** `src/hooks/useLivePrices.js:13–18` seeds `prices` with `TOP_COINS` `mockPrice`/`mockChange`/`mockMcap` on mount; `portfolioPnl` (`src/utils/pnl.js`) and the value card treat them as real.
- **Suggested fix:** don't seed; let a missing price render "—" (the unpriced-coin path in `portfolioPnl` already exists, CRYP-94), and show the value card's loading placeholder until `api === "live"`.

### BUG-032 (repeat, new surface) · Medium · Transaction-cap toast upsells "Upgrade to Pro for 1,000!" on the free single-tier launch
- **Steps:** Swing trades → BTC → add buys until the coin has 300 transactions (Starter cap) → try one more Buy, and then a Sell.
- **Expected:** a neutral cap message (paid plans are off; the landing promises a single Starter tier).
- **Actual:** `Max 300 transactions per coin · Upgrade to Pro for 1,000!` — reproduced 2× (the 299th add attempt as a buy, then a sell). The cap itself is enforced correctly (Transactions (300)).
- **Repeat of BUG-032 — still open**, on a surface BUG-032 doesn't list: `src/CryptoIdea.jsx:881` (`isPro?"":" · Upgrade to Pro for 1,000!"`), and the server-limit path at `:916` (`"…transaction limit — upgrade for more."`). Neither is gated on `paidPlansEnabled`.
- **Suggested fix:** same as BUG-032 — gate the upsell suffix on `site.paidPlansEnabled === true`.

### P01-13 · Medium · Average cost never resets after a full exit, so a re-entered position shows a wrong avg cost and wrong unrealised P/L
- **Steps:** ETH: fully sold (3.5 bought @ avg $1,810.03, 3.5 sold) → buy 1 ETH @ $1,690 (2026-11-22 11:00). Open Detail and the coin-info overlay. Repeat with BNB: fully sold → buy 1 BNB @ $540.
- **Expected (trader):** the new position's cost is $1,690 (ETH) / $540 (BNB); unrealised P/L ≈ +$2.85 (ETH at $1,692.85) / +$8.39 (BNB at $548.39). The closed round-trip stays as realised P/L.
- **Actual:** ETH Detail `Avg Buy Price $1,783.36`; coin-info `Avg cost $1,783.36 · Unrealised P/L −$90.506 (-5.08%)`. BNB coin-info `Avg cost $571.43 · Unrealised P/L −$23.039 (-4.03%)`. A winning new trade is shown as a loser. Reproduced 2× (ETH, BNB). Total P/L stays right (it's value + proceeds − all buys).
- **New.** **Root cause:** avg cost is lifetime `buysCost / boughtCoins` over every buy ever (`src/utils/pnl.js` / `Detail.jsx` / `CoinInfo.jsx` unrealised uses that avg), with no position reset when holdings hit 0 and no reduction of cost basis by sells.
- **Suggested fix:** compute a running (moving-average) cost basis in date order — sells remove cost at the current average, and the average restarts when holdings return to 0; derive realised P/L from the same pass (also fixes P01-04's realised/unrealised split).

### P01-14 · Medium · Plan & billing claims "AI research · Live" while there is no live AI (and the AI surfaces are switched off)
- **Steps:** Account → Plan & billing. (Opened twice: once via the Account home row, once after navigating back.)
- **Expected:** no AI claim — the landing promises "no AI claims anywhere", `aiResearch` is default-OFF and `AI_PROXY_LIVE` is `false`; the Research tab for this account shows only the deterministic Overview (no Coins/Ask sub-nav).
- **Actual:** `AI research · Live · Research summaries & analysis — included in every plan`. Static copy, shown regardless of the flag.
- **New.** **Root cause:** hard-coded at `src/components/Account.jsx:263–264`.
- **Suggested fix:** remove the row, or render it only when `site.features.aiResearch === true && AI_PROXY_LIVE`, with honest wording ("Research summaries (deterministic)").
- **Related (Low):** the same card shows `Total transactions 368 / 27,000 · Up to 300 per coin`, but nothing tells a trader that one coin (Swing BTC) is already at 300/300 — the first hint is the refused trade. A per-coin "near the cap" indicator on Detail would help.

## Known bugs re-checked
| Bug | Result | Evidence (this run) |
|-----|--------|---------------------|
| BUG-019 (oversell / backdated sell / edit-buy-down / future date) | Appears fixed | all four blocked; but see P01-06 for later-today times |
| BUG-021 Search / thesis mock prices | **Still present** | Search SOL $125 (live $69.77), XRP $2.18 (live $0.92), BNB $598 (live $545); BNB thesis "· $598.00". Contrast: a thesis added later from the Journal tab ("Add thesis" on ETH) correctly stored the live `$1,692.85`, so only the Search path is affected |
| BUG-022 Empty holding green +$0.00 | **Still present** | empty ETH Detail `+$0.00 (+0.00%)` in green `rgb(7,80,58)`; empty portfolio 24H `+0.00%` class `up` green |
| BUG-023 AUTO price pre-fills mock | **Still present** | BTC 84000, ETH 1900, XRP 2.18, SOL 125 (form's own hint said $70.66) |
| BUG-024 Tx time UTC shown as local | **Still present** | prefill 09:03 at 11:03 local; trade saved as 09:30 AM |
| BUG-025 AUTO estimate labelled market price | **Still present** (related) | BTC suggestion $84,000 for Oct 15 under "market price for this date"; worsened by P01-01 |
| BUG-026 Mixed minus signs | **Still present** | `−$641.26 (-15.99%)`, `−$324.05 (-5.12%)`, coin-info `-57.63%`. Root cause: `src/utils/format.js:60` `fmtPct` uses `toFixed` (hyphen) |
| BUG-027 Escape doesn't close Detail | **Still present** | 3 cases; root cause in `Modal.jsx` (see above) |
| BUG-032 Upsell to a plan that can't be bought | **Still present** (new surface) | tx cap: `Max 300 transactions per coin · Upgrade to Pro for 1,000!` (portfolio/coin caps not reached) |
| BUG-037 Stress test "higher-beta amplify" | **Still present** | 100% BTC book: `A 50% market drop … (−50.0%). Your higher-beta holdings amplify the swing.`; same at −30% (−30.0%) |
| BUG-036 Concentrated book rated Low | Same pattern (by-design question) | 100% BTC book rated Low while the note says "Everything you hold is in a single coin" |
| BUG-038 Brief ▲ when down | Not reached | both books were up on the day, so ▲ was correct |
| BUG-028 Learn modules 2–9 locked | **Still present** | Learn tab: 8 `.module.locked` cards with `locked-icon`, only "How Markets Really Work" startable |
| BUG-020, 029–031, 033–035 | Not reached | outside this persona's charter |

## What worked well
- **The cost-basis math is right.** Every holding, avg buy, avg sell, bought/sold totals and total P/L I checked by hand (BTC, ETH, SOL 56-trade book, XRP, BNB, Swing BTC) matched to the cent (display rounding aside).
- **The sell-invariant guard is solid:** a sell beyond holdings, a back-dated sell before the first buy, and editing a buy down below a later sell are all blocked before any write.
- **Newest-first ordering by trade date** holds even for back-dated inserts; the 50/page pager, Prev/Next disabled states and the 2-step delete work.
- **Edit flow** (amount, price, date, and switching a trade between Buy and Sell) saves correctly to the server.
- **AUTO with real history** works when the history response isn't the cached empty one (ETH 2026-06-01 → $2,005.05, matches server data).
- **Multiple portfolios:** creating "Swing trades", auto-switching to it, and switching back and forth kept each book separate and correct.
- **Dark mode** on Portfolio, Detail, transaction rows and the delete dialog is readable.
- **Deletes live-sync** to a second open tab within seconds.
- No console errors during the session.

## Timeline
Clock times are approximate local times (UTC+2); the session ran 11:01 → 11:57 by the shell clock. Entries are listed newest-first after the first three.
- 11:01 Health check: app :3000 HTTP 200, functions :5001 HTTP 404 (up). Report created.
- 11:02 The shared Chrome profile was signed in as another dev account; logged out and logged in as p01 (account already existed with 2 BTC trades).
- 11:03 Buy form: mock AUTO price + UTC time reproduced.
- 11:04 BTC buy/sell/edit; P&L math verified by hand (avg buy $58,937.50, total P/L +$1,615.00 correct); edit-to-oversell guard works. Found P01-01 (empty history HTTP-cached 24 h).
- 11:08 Added ETH/SOL/XRP; found P01-02 (edited tx reverts on screen after adding another coin), reproduced twice, confirmed server data correct via reload. Search still shows mock SOL $125 / XRP $2.18 (live $69.77 / $0.925).
- 11:12 ETH buys/sells incl. full exit; all P/L math verified by hand. BUG-026 + BUG-022 reproduced. Found P01-03, P01-04, P01-05.
- 11:14–11:20 56 SOL transactions; totals match hand calc (81 SOL, cost $7,527.50, proceeds $1,053, P/L −$833.66). Pager: 50 on page 1, 6 on page 2, Prev/Next disabled states correct, delete on page 2 works, deleting down to 50 collapses to one page (pager hidden). Daily tx budget is 500 (`functions/tx-limits.js`) so an active trader backfilling is fine.
- 11:19 Edge cases: backdated sell before first buy blocked; next-day date blocked; zero price keeps Add disabled; later-today time accepted (P01-06). Pager stale page (P01-07). Escape closes nothing (BUG-027).
- 11:21 XRP trades; found P01-08 (3-decimal P/L) and P01-09 (coin-info Price History = estimate table, "Today" contradicts live price). XRP AUTO pre-filled mock $2.18 vs live $0.92 (BUG-023, third coin).
- 11:24 BNB added with thesis (Search shows mock $598 vs live $545.15 — BUG-021); 4 BNB trades; found P01-10. CoinInfo → Transactions pill opens Detail correctly.
- 11:26 Journal: BNB thesis shows `Thesis written … · $598.00` (mock; live $545.15) — BUG-021 still present. Research: Pulse 30d attribution wrong because of P01-01 (raised to High).
- 11:29 Created 2nd portfolio "Swing trades"; empty book shows green `+0.00%` 24H (BUG-022). BTC trades there; more 3-decimal amounts (P01-08).
- 11:31 Edited the Swing BTC buy (0.1→0.12) then switched portfolios twice — edit survived (P01-02 only triggers on a same-portfolio coin change). Window resize to phone width was ignored by the browser (maximized window; `innerWidth` stayed 1536) — mobile not checked. Dark mode: Portfolio, Detail, tx rows, delete-coin dialog readable. Found P01-11.
- 11:36 Input edge cases: `1,000`→1000, `1e3`→`13` (TX-SAFE strips `e`), `-5`→5; a 999,999,999,999,999 SOL buy is accepted (≤1e15 by design) and was deleted.
- (final) Account → Plan & billing shows `AI research · Live` (P01-14).
- (final) Journal "Add thesis" on ETH stores the live price (good); Escape doesn't close the thesis dialog (BUG-027). Final book — My Portfolio: 0.58 BTC, 5,000 XRP, 61 SOL, 1 ETH, 1 BNB, 15,000,000 SHIB = $46,070.57, ▲ +$1,965.17 (+2.79%), INVESTED $70,551.40. Swing: 0.368 BTC, 300 tx. Theme left on Dark for this account.
- 12:08 Re-entry after full exit (ETH, BNB): avg cost inherits the closed position → wrong unrealised (P01-13).
- 12:06 SHIB (tiny price): formats fine, math correct; AUTO prefill 6.8× the live price (BUG-023).
- 12:03 Research on the Swing book: Pulse 7D/30D `+0.0%` (P01-01 second repro); stress test copy (BUG-037) reproduced at −50% and −30%.
- 12:01 Portfolio rename with `& - ' #` works; delete-portfolio dialog copy mentions a non-existent thesis and row says "1 coins" (added to P01-11); cancelled.
- 11:58 P01-02 reproduced a third time via the everyday flow (edit XRP, then trade BNB).
- 11:55 Swing BTC reached 300 tx; cap toast upsells Pro (BUG-032 new surface). Pager with 6 pages: `Prev 1 2 … 6 Next`, jumps/Prev/ellipsis window all correct; page 6 = 50 oldest rows.
- 11:40 Learn: modules 2–9 locked (BUG-028). Started filling the Swing BTC book towards the 300-tx Starter cap (0.001 BTC buys, daily 2026-01-01 →) to check the cap message and a multi-page pager.
- 11:38 Back/refresh: Back to /app briefly shows a mock-priced value card +36.84% (P01-12), reproduced twice.
- 11:34 Two-tab live-sync check: edits don't reach the other tab, deletes do (added to P01-02).
