# Persona 02 — Long-term investor · 1-hour test · 2026-11-22
Status: Complete | Account: p02.longterm@test.com (persona "Leo Longterm"; account already existed, not re-registered) | Start: 11:56 (local, UTC+2) | End: 12:51 | Minutes tested: 55

**Summary:** 21 findings: **3 High** (P02-07 BUG-025 root cause, P02-20 landing DCA fabricated returns, P02-21 edit-date overwrites the recorded price), **10 Medium**, **8 Low**. Of the 19 open BUGS.md items: 15 are still present (BUG-021 to 033, 036, 037), BUG-038 was not reproducible today (market up) but its code is unchanged, and 3 were not reached (BUG-020, 034, 035). 3 resolved bugs re-checked look fixed. For a long-term investor the most damaging theme is **historical prices**: AUTO, CoinInfo price history and the landing calculator all present estimates or mock prices as market data, and editing an old buy's date silently swaps in the wrong price.

## Persona
A patient, long-term holder who owns a handful of large caps bought years ago (2017-2024) and rarely trades. They want the app to record those old back-dated buys at the right historical price, keep a written thesis for every coin ("why I own it" + "what would change my mind"), periodically review whether the thesis is still intact, keep learning, and get a calm, honest portfolio overview (Pulse, risk, stress test) rather than trading signals.

## Data created
Pre-existing on the account (from an earlier run): 1 portfolio "My Portfolio"; ETH — BUY 4 @ $1,550 (2023-01-15 10:00), BUY 2 @ $3,500 (2024-03-10 10:00). Persona name on the account is "Leo Longterm". Account already existed — not re-registered. Note: the browser was still signed in as p01 (Tara Trader) from the previous persona run; I logged that session out first.

| # | Coin | Type | Amount | Price | Date/time entered | Notes |
|---|------|------|--------|-------|-------------------|-------|
| — | BTC | coin added via Search **with thesis + all 3 manual-research findings** | — | — | — | thesis "Fixed 21M supply, the most decentralized and battle-tested monetary network; digital gold I plan to hold for a decade." / change-my-mind "A successful protocol-level attack, or a change to the 21M supply cap." |
| 1 | BTC | Buy | 0.5 | 19,000 (typed; AUTO offered 13,733.33) | 2017-12-17 12:00 | |
| 2 | BTC | Buy | 0.3 | 5,840 (AUTO accepted, estimate) | 2020-03-13 09:00 | real close that day was roughly $5,000-5,600 |
| 3 | BTC | Buy | 0.2 | 15,800 (typed; AUTO offered 16,500) | 2022-11-21 15:00 | |
| — | BTC | thesis edited (appended a line; change-my-mind rewritten), Real-yield finding edited, status → **Review** | — | — | — | |
| — | ETH (existing thesis) | Dilution finding added, closed with X (auto-saved), status → **Challenged** | — | — | — | |
| — | LINK | coin added via Search "Skip for now" → "Needs a thesis" → Add thesis (thesis only, X) → 🟡 Incomplete → Edit, change-my-mind added | — | — | — | |
| 4 | LINK | Buy | 500 | 1.10 (typed; AUTO offered 2.50) | 2019-06-01 10:00 | |
| 5 | LINK | Buy | 50 | 45 (typed; AUTO offered 35.00) | 2021-05-10 10:00 | 2016-01-01 correctly clamped to launch 2017-09-20 first |
| 6 | BTC | Buy (edit) | 0.3 | 5,840 → **5,600** | 2020-03-13 09:00 | edit saved, totals recomputed |
| 7 | ETH | Buy | 3 | 1,050 (typed; AUTO offered 2,763.90) | 2022-06-18 18:00 | see P02-07 |
| 8 | LINK | Sell | 100 | 20 | 2024-03-10 12:00 | a sell of 100 on 2018-01-01 (before any buy) was correctly refused |
| — | Portfolio "Cold Storage – 10yr" | created | — | — | — | BTC added from Trending with a thesis full of HTML/emoji/Hebrew (rendered escaped). Thesis then deleted (confirm dialog). |
| 9 | BTC (Cold Storage) | Buy | 0.05 | 64,000 (AUTO offered 66,216.67) | 2024-04-20 08:00 | |
| — | ETH (Cold Storage) | added with a throwaway thesis, then removed with the 2-tap pill (P02-08) | — | — | — | |
| — | Portfolio "Kids' fund" | created (3/3), 4th refused (BUG-032 toast), then removed | — | — | — | |
| — | ZEC | added via Search with thesis | — | — | — | not in `TOP_COINS` |
| 10 | ZEC | Buy | 10 | 801.02 (today's price kept) → edited to 200 | 2014-01-01 → edited to 2018-06-01 | see P02-14 |
| 11 | ZEC | Sell (full exit) | 10 | 801.38 | default "now" (recorded 10:31 while local was 12:31: BUG-024) | thesis stays in Journal (🟡 Review), no "exited" marker |
| 12 | LINK | Buy | 10 | 7.00 | 2023-03-31 23:30 | late-night back-date displays correctly (no day shift); later **deleted** (2-step). Deleting the 2019 500-LINK buy was refused: "Can't delete — a sell on 2024-03-10 depends on it" |
| 13 | BTC | Buy (test) | 0.00012345 | 68,000 (AUTO offered 53,700) | 2021-11-10 14:00 | amount 0 keeps Add Buy disabled; exposed P02-13 on Detail; then deleted |
| 14 | BTC (Cold Storage) | Buy | 0.01 | 50,000 | 2024-08-05 09:00 | Enter in the price field does **not** submit (only the button does); avg $61,666.67 correct |
| — | XMR | added via Search with thesis (double-clicked Save, no duplicate) | — | — | — | priceAtAdd saved $178 (mock; live $484) |
| — | Cold Storage | renamed to a 50-char emoji name (max length 50 enforced) | — | — | — | |
| — | ZEC thesis | two-tab concurrent edits (P02-16); final text carries "[Edited on device A]" / "[A cmm v2]" markers | — | — | — | |
| — | Portfolio "Risk check" | created; PENGU (trending, #130) added without thesis, 100,000 bought @ $0.004316 (live pre-fill) to re-check BUG-036; then deleted (dialog) | — | — | — | |
| — | Cold Storage BTC | thesis re-added via Journal → Add thesis (+ dilution finding); priceAtAdd saved the live $60,801 | — | — | — | |
| — | "My Portfolio" | renamed to **"Core Holdings"** via the header pencil (Enter submits) | — | — | — | |
| — | Portfolio "Temp empty" | created and removed (P02-05 repro) | — | — | — | |
| — | Learn | modules 1 and 2 complete, module 3 3/6 | — | — | — | Level 3 "Conviction Investor", 750 XP, 15/50 lessons, 1-day streak; progress persisted across reloads |

## Coverage
| Area / flow | Result | Notes |
|---|---|---|
| Login / logout / wrong password / unknown email | Pass (with P02-15) | Form cleared on logout; data + theme persisted on re-login |
| Search → Buy-Journal prompt (thesis + 3 manual findings) | Pass with issues | BUG-021 mock prices; X discards draft (P02-02); double-click Save adds no duplicate |
| Search → "Skip for now" → Journal "Needs a thesis" → Add thesis | Pass | Partial + X → 🟡 Incomplete; completed later via Edit |
| Back-dated buys 2017-2024 with AUTO price | **Fail** | P02-01, P02-07 (BUG-025), BUG-023, BUG-024; launch-date clamp works for table coins; ZEC has no clamp (P02-14) |
| Edit transaction / delete transaction (2-step) / oversell guards | Pass | Edit recomputes totals; delete of a buy a later sell depends on is refused; sell before first buy refused |
| Partial sell + full exit | Pass | Realised/unrealised math checked by hand; labels differ between tabs (P02-18) |
| Journal: Read/Breakdown popup, Edit thesis, validation (empty / whitespace), Save findings, X auto-save | Pass | X auto-save of findings verified twice |
| Journal: review Intact / Review / Challenged | Pass with issues | Statuses persist and live-sync, but the overlay never shows the current status (P02-04) |
| Journal: delete thesis | Pass | Confirm dialog; coin stays, moves to "Needs a thesis" |
| Journal: HTML / emoji / Hebrew / accents in thesis | Pass | Rendered escaped, stored intact |
| Multi-device (two tabs) | Partial | Status live-sync OK; concurrent edits lose data (P02-16) |
| Multiple portfolios (create, rename 50-char emoji, switch, limit 3/3, delete empty + with data) | Pass with issues | BUG-032 upsell; P02-05 Journal empty copy; P02-08 delete copy; P02-10 disarm shift |
| Coin delete (with tx → dialog; thesis-only → 2-tap pill) | **Fail** | P02-08 |
| CoinInfo overlay (3 coins) + Transactions pill | Fail (data) | P02-12 mock price history, P02-13 3-decimal P/L |
| Research Overview: Brief, Pulse 24H/7D/30D, allocation, risk, stress test, notes | Pass with issues | P02-03, P02-18, BUG-036, BUG-037; notes rotate correctly (concentration / single-coin) |
| Research Coins / Ask | Not available | Hidden by `aiResearch:false` (by design); see P02-17 |
| Learn: module 1 + 2 complete, module 3 started; wrong answer; review mode; persistence | Pass with issues | Level 1 → 3, 700 XP, 14/50; BUG-028/029/030 still present |
| Account: Profile, Plan & billing, Portfolios, Security (view), Privacy & data (view) | Pass with issues | BUG-031, BUG-033, P02-19, P02-11; downloads and delete-account not exercised |
| Landing page + DCA calculator | **Fail** | P02-20 fabricated returns; P02-17 conviction claim; BUG-028 copy |
| Dark mode | Checked | Account, Journal list + overlay, Portfolio, Learn lesson, Detail/Remove pill, all readable; BUG-033 visible |
| Mobile width (390 px via same-origin iframe; `resize_window` had no effect on the maximised window) | Checked | Portfolio, Journal + full-screen overlay, Research, Search prompt; no horizontal overflow (scrollWidth 372 ≤ 387). Minor: "● LIVE" badge wraps to 2 lines on the Portfolio header |
| Refresh / browser Back | Checked | State persists on refresh; Back with a popup open leaves the page (no in-app history) |
| Console errors | Clean | Only a browser extension's own errors (Grammarly); no app errors seen |

## Findings

### P02-01 · Medium · Price history is empty for every coin, and the empty answer is cached for 24h, so every AUTO price is an estimate or the mock price
**Steps to reproduce**
1. Log in, open any held coin (BTC, ETH or LINK) → + Buy.
2. Set Date & Time to a past date, e.g. BTC 2017-12-17 12:00, BTC 2026-06-01 12:00, LINK 2019-06-01 10:00.
3. Look at the price AUTO fills in. Compare with `curl "http://localhost:3000/api/history?id=bitcoin"`.

**Expected:** AUTO uses the real daily close from `/api/history` (the cached CoinGecko history); when that history is unavailable the form says so instead of filling a confident number.

**Actual:** `/api/history?id=bitcoin|ethereum|solana` all return `{"prices":[]}` (the emulator's `historyCache/bitcoin` and `historyCache/ethereum` docs hold `miss:true`, i.e. the upstream market_chart call failed and was negative-cached). So `AddEntry.jsx` always falls back to `getHistoricalPrice()` (`src/utils/coins.js:460`):
- BTC 2017-12-17 → **$13,733.33** (BTC traded around $19,000 that day, about 28% low)
- BTC 2020-03-13 → $5,840; BTC 2022-11-21 → $16,500 (close-ish)
- LINK 2019-06-01 → **$2.50** (traded around $1.10, more than 2x high); LINK 2021-05-10 → $35 (around $45)
- **BTC 2026-06-01, 2026-02-01 and 2025-12-25 → $84,000.00 each**, which is the hard-coded `mockPrice`. Every date in the last year falls back to the same mock price, not a historical one.
The button tooltip still says "Using the market price for this date". In addition, the empty/miss response is served with `Cache-Control: public, max-age=86400` (`functions/index.js` history branch, both the "not in universe" and the miss path), while the server-side negative cache is only 1h (`HISTORY_NEG_TTL`). One transient upstream failure therefore pins "no history" in the browser/CDN for a full day after the server would have retried. The 24h browser cache also works the other way: at 12:50, `curl` against the server returned `{"prices":[]}` for bitcoin, chainlink, **ethereum** and zcash, yet this Chrome kept serving a cached 366-point ETH series (fetched earlier). So two users, or the same user in two browsers, get different AUTO prices for the same date. Reproduced for 4 coins and 8+ dates.

**Repeat / new:** New, closely related to **BUG-025** (estimate labelled as market price, still open) and **BUG-009** (history can't tell "no data" from "delisted"). The new parts: the history is currently empty for *every* coin (so even dates inside the 365-day free window are estimates), recent dates fall back to the mock price, and the miss is cached for 24h.

**Suggested fix (proposal only):** in `functions/index.js` send a short `Cache-Control` (e.g. `max-age=300` or `no-store`) when `prices` is empty or `data.miss` is set, and keep 24h only for real data. In `src/components/AddEntry.jsx` (lines 38-42, 112-114), when `histPrices` is empty/null, do not auto-fill from `getHistoricalPrice`; leave the price empty or label it "Estimate. No market data for this date", and never use `mockPrice` as a historical value. Also check why the upstream market_chart call fails locally (missing key, 429, or `days=max` without a key).

### P02-02 · Low · Closing the Search "Before you add…" prompt with X silently throws away a typed thesis
**Steps to reproduce**
1. Search → "chainlink" → + Add.
2. Type a thesis in "Why are you buying this?" (leave the second question empty).
3. Click X. Click + Add again.

**Expected:** Same behaviour as the Journal "Add your thesis" popup, where X auto-saves a partial thesis as 🟡 Incomplete (R24). At minimum, keep the draft or ask "Discard your thesis?".

**Actual:** The prompt closes, the coin is not added, and on reopening every field is empty. The typed thesis is gone with no warning. Reproduced 2 times. (Clicking the backdrop does *not* close it, so X is the only way to lose it.) For contrast, the Journal → Needs a thesis → Add thesis → X path kept the same partial text and showed 🟡 Incomplete.

**Repeat / new:** New.

**Suggested fix (proposal only):** in `src/components/Search.jsx` (Buy-Journal prompt), either keep the draft in state per coin id until the prompt is submitted or skipped, or show a "Discard thesis?" confirmation when X is pressed with non-empty fields. The founder decides whether X should add the coin with an Incomplete thesis, as in R24.

### P02-03 · Medium · The Pulse attributes 100% of the 7D/30D move to Ethereum when Bitcoin (80% of the book) has no price history
**Steps to reproduce**
1. Hold BTC (80% of value), ETH (13%) and LINK (6%) while `/api/history` returns `{"prices":[]}` for bitcoin and chainlink but 366 points for ethereum (the state during this run; check in the console with `fetch('/api/history?id=bitcoin')`).
2. Research → Overview → Portfolio Pulse → pick **30D**, then **7D**.

**Expected:** When a coin has no history, the Pulse should say the 7D/30D figure is partial or unavailable ("not enough price history for Bitcoin and Chainlink"). It should not state a portfolio-wide change or an attribution as fact.

**Actual:**
- 30D: "Your portfolio is $76,117, **−5.9%** over the last 30 days. … Over the last 30 days, **Ethereum drove about 100% of that move**."
- 7D: "−1.9% over the last 7 days … Ethereum drove about 100% of that move."
`priceAdapter.js` (line 27-28) returns `c7d: 0, c30d: 0` for a coin with empty history, so Bitcoin silently counts as "flat". Its move is missing from both the headline % and the attribution. The 24H view, which uses live prices, is fine ("Bitcoin drove about 83%"). Reproduced on 7D and 30D, again after a reload, and in the mobile-width frame. A second, cleaner case: in the Cold Storage portfolio (100% BTC, no BTC history) the Pulse reads "**30D +0.0%** … Your portfolio is $3,050, +0.0% over the last 30 days" and "**7D +0.0%**", which states a flat month and week as fact when there is no data.

Note the inconsistency inside the same Pulse: the "This week" volatility/drawdown line (`pulse.js` `weeklyValues`, line ~22-25) correctly returns `null` and is **omitted** when any holding lacks history (it never appeared this session), while the 7D/30D % and the attribution line beside it treat the same missing data as 0%.

**Repeat / new:** New. CLAUDE.md notes "Missing history degrades to 0% — never NaN" as deliberate. That keeps NaN away, but the Pulse then turns the 0 into a confident claim.

**Suggested fix (proposal only):** have `src/features/research/utils/priceAdapter.js` return `c7d/c30d: null` (not 0) when history is missing. In `src/features/research/utils/pulse.js` (`pulseFacts`/`pulseLines`), skip the attribution line and mark the % as partial when any holding weighted above a threshold (or simply any holding) has `null`. Also check `OverviewView.jsx` timeframe chips.

### P02-04 · Medium · The Journal detail never shows the thesis's current review status; "Yes, still holding" is always the highlighted choice
**Steps to reproduce**
1. Journal → open a thesis → "Is your thesis still intact?" → **Reconsidering**. The list card now shows 🔴 Challenged.
2. Open the same thesis again.

**Expected:** The detail overlay shows the current status (the same pill as the list card, ideally with the date of the last review), and the selected choice is marked (`aria-pressed`/selected style).

**Actual:** The overlay has no status pill. The three buttons look the same every time: "Yes, still holding" is always the filled primary button (`btn-primary`) and the other two are ghosts, whether the thesis is Intact, Review or Challenged. A long-term holder reviewing a Challenged thesis sees "still holding" visually recommended, with no reminder of the earlier decision. There is also no "last reviewed" date anywhere, which a yearly-review investor needs. Reproduced on ETH (Challenged) and BTC (Review), in light and dark mode.

**Repeat / new:** New.

**Suggested fix (proposal only):** `src/components/Journal.jsx` lines 206-208: render the current `STATUS[journal.status]` pill in the overlay header (the list already has it at ~361-373), give the active choice the selected style plus `aria-pressed="true"`, and make all three neutral by default. Optionally persist `reviewedAt` in `reviewThesis` → `updateCoinJournal`, which would need a `validJournal` rules change, so the founder decides.

### P02-05 · Low · Journal says "Your journal is empty" in a second portfolio, though theses exist in the first
**Steps to reproduce**
1. With 3 theses in "My Portfolio", create a second portfolio (Account → Portfolios → "Cold Storage – 10yr"). It becomes active.
2. Open the Journal tab.

**Expected:** Copy that says the journal is per portfolio, e.g. "No theses in Cold Storage – 10yr yet" with a hint that other portfolios have N theses, or a portfolio switcher on the Journal header.

**Actual:** "📓 Your journal is empty. The next time you add a coin, you'll be asked to write your thesis." The Journal header has no portfolio name and no switcher. A user with years of theses in another portfolio is told the journal is empty. (Per-active-portfolio scoping is the documented design; this finding is about the copy and context.) Reproduced twice: in "Cold Storage – 10yr" and in a second empty "Temp empty" portfolio (created and removed for the repro).

**Repeat / new:** New.

**Suggested fix (proposal only):** in `src/components/Journal.jsx` empty state, name the active portfolio ("No theses in {portfolio.name} yet") and show the same portfolio pills the Portfolio tab shows, or a one-line "Switch portfolio" link.

### P02-06 · Low · Switching bottom-nav tabs keeps the previous tab's scroll position, so the Journal opens showing blank space
**Steps to reproduce**
1. Open Account (or Learn) and scroll to the bottom.
2. Tap **Journal** in the bottom nav.

**Expected:** Each tab opens at the top.

**Actual:** `window.scrollY` stays at about 231 px (from 536 on Account / 290 on Learn). The Journal cards are scrolled out of view under the sticky header and the viewport shows an empty dark area with only the footer line. It looks as if the journal were empty until you scroll up. Reproduced 3 times (Account → Journal twice, Learn → Journal once). Same root cause on Logout: logging out from the scrolled Account screen leaves the login page at `scrollY` 174, so the logo/tagline is cut off at the top.

**Repeat / new:** New.

**Suggested fix (proposal only):** in `src/CryptoIdea.jsx` add `useEffect(() => { window.scrollTo(0, 0); }, [screen]);` (the same pattern `Account.jsx:157` already uses for its drill-ins).

### P02-07 · High · Repeat of BUG-025 (still open), root cause found: every buy older than the 365-day history window auto-fills the price from exactly one year ago
**Steps to reproduce**
1. Hold ETH (its `/api/history` returned 366 daily points starting 2025-11-22 in this browser; first point $2,763.897).
2. ETH → + Buy → set Date & Time to 2022-06-18, then 2021-11-10, then 2020-03-13, then 2023-01-15.

**Expected:** The real price for that day (around $1,000 / $4,700 / $150 / $1,550), or no auto-fill and an "estimate / no data" label when the date is outside the available history.

**Actual:** AUTO fills **$2,763.90 for all four dates**, the same figure BUG-025 recorded for 2023-01-15. A date inside the window works (2026-06-01 → $2,005.05). The "Suggested price: $2,763.90 · tap AUTO to use" hint and the "Using the market price for this date" tooltip present it as the market price. For a long-term investor, every multi-year-old buy gets a cost basis that can be 2-18x wrong. Reproduced on 4 dates, plus BUG-025's own repro.

**Root cause (from reading the code):** `src/utils/coins.js:535`, inside `priceAtDate`:
```js
if (t <= prices[0][0]) return prices[0][1];
```
A date before the first history point is clamped to the oldest point instead of returning `null`. So `AddEntry.jsx:41-42` never reaches its `getHistoricalPrice` estimate fallback. BUG-025's description ("an estimate is used") holds only when the history is completely empty (see P02-01). When the free 365-day history exists, the cause is this clamp.

**Repeat / new:** Repeat of **BUG-025** (still open). This adds the root cause and widens the scope beyond its single repro.

**Suggested fix (proposal only):** in `priceAtDate`, return `null` when `t` is earlier than `prices[0][0]` by more than ~1 day, so the caller falls through. Then label the fallback as an estimate in `AddEntry.jsx` (lines 112-114), or don't auto-fill. Add a unit test for "date before first point → null". (`AddEntry.jsx` is the only caller of `priceAtDate`; I grepped for others.)

### P02-08 · Medium · Coin-delete warning always says "and your saved thesis", while a coin whose only data is a thesis is removed with a 2-tap pill and no warning
**Steps to reproduce (A, wrong copy)**
1. Cold Storage portfolio → BTC (its thesis was deleted earlier; the Journal lists it under "Needs a thesis") with 1 transaction.
2. Detail → trash icon.

**Actual A:** "This coin has 1 buy/sell transaction **and your saved thesis**. If you delete it … you'll lose that data." There is no thesis. Reproduced 2 times.

**Steps to reproduce (B, thesis lost silently)**
1. Add ETH to Cold Storage via Search with a full thesis, no transactions.
2. Detail → trash icon → red "Remove" pill → Remove.

**Actual B:** The coin and its thesis are deleted at once: no dialog, no mention of the thesis, no undo toast. For this persona the thesis is the most valuable data on the coin. (Done once with a throwaway coin. The code path is deterministic, see below.)

**Also (C, portfolio delete):** Account → Portfolios → delete "Risk check" (1 coin PENGU, 1 tx, *no thesis*) → "This portfolio has 1 coin and all its transactions **and thesis**." The portfolio-level copy has the same hard-coded thesis mention.

**Expected:** The warning names what will actually be lost (transactions and/or thesis). A coin with a thesis but no transactions gets the same confirm dialog as one with transactions.

**Repeat / new:** New. (R4-3 introduced the warning. BUG-003 is the older confirm-state leak, a different issue.)

**Suggested fix (proposal only):** `src/components/Detail.jsx` line 157 and `src/components/Account.jsx` line 106: build the sentence from `coin.entries.length` and `!!coin.journal?.thesis`. Lines 69-71 and 153: route a coin with `journal` but no entries through the Modal confirm instead of the quick "Remove" pill. That modal also hard-codes colours (`#FFF8E1`, `#92400E`, `#E8E8ED`, `#fff`) in inline styles. They look fine in dark mode today but bypass the tokens.

### P02-09 · Medium · Keyboard / screen-reader gaps: Journal entries can't be opened without a mouse; the trash button and digest switch have no accessible name
**Steps:** (1) Journal tab: list the focusable elements inside `.j-grid`. (2) Open any coin Detail and read the accessibility tree.
**Actual (Journal, the most important one for this persona):** each thesis card is a `div.j-entry` with an `onClick`, no role and no tabindex. The only focusables in the grid are the 5 coin-icon `span[role=button]`s, which open **CoinInfo**, not the thesis. A keyboard or screen-reader user cannot open, read, edit or review any thesis. The Portfolio asset card (`div.asset-card`, the way into Detail) is also a click-only div; there, keyboard users can still reach Detail through CoinInfo → "Transactions" pill. Checked on both tabs, twice on Journal.
**Actual (trash):** `<button class="icon-btn"><svg …stroke="#FF3B30">` with no text, `aria-label` or `title`. Assistive tech announces it as just "button". Seen on BTC (My Portfolio), BTC and ETH (Cold Storage). The red is also a hard-coded hex, not a token.
**Repeat / new:** New (same family as BUG-029: controls not exposed properly).
Same family: the Account **Email digest** toggle is `<input role="switch" type="checkbox">` with no label association, so its accessible name is just "on" (seen twice on the Account home). The two Privacy switches next to it are labelled correctly. And on Learn, the "Today's lesson" card's **Start lesson** is a plain `div.tl-cta` inside `div.today-lesson` (no role/tabindex), so a keyboard user can't start today's lesson; mouse click works.
**Suggested fix (proposal only):** render each Journal entry (`src/components/Journal.jsx` list ~line 360-375) and asset card as a `<button>` (or `role="button" tabIndex={0}` with Enter/Space handling). `src/components/Detail.jsx` around line 69-70: add `aria-label={"Delete " + coin.name}` (and `title`), and use the danger colour token instead of `#FF3B30`. In `src/components/Account.jsx`, wrap the digest switch in a `<label>` or add `aria-label="Email digest"`.

### P02-10 · Low · When the two-tap "Remove" pill auto-disarms, the rename pencil slides under the cursor, so a slightly late second tap opens Rename
**Steps to reproduce**
1. Account → Portfolios → tap the trash icon on a portfolio row. A red "Remove" pill replaces the icon and pushes the pencil left.
2. Wait about 3-4 s (the pill auto-disarms), then tap where "Remove" was.

**Expected:** A late tap does nothing, or the pill stays in place (or uses a dialog) so the layout doesn't shift under the finger.

**Actual:** After the auto-disarm the row re-lays out, and the old "Remove" spot (988,327) is now the **Rename portfolio** button (`document.elementFromPoint` confirms). The late tap opened the Rename dialog. Reproduced 2 times (once by accident, once on purpose). The same 3 s pattern is used for the coin "Remove" pill and the transaction delete. Harmless today (it opens Rename, not a destructive action), but it is a layout shift on a destructive control.

**Repeat / new:** New.

**Suggested fix (proposal only):** reserve the pill's width (render the pill in the same box as the icon, absolutely positioned), or lengthen the disarm window. Code lives in `src/components/Account.jsx` (Portfolios drill-in) and `src/components/Detail.jsx` (R12-2 auto-disarm, lines 28-35).

### P02-11 · Low · "Download all my data (JSON)" says it exports "everything we hold", but the export omits Learn progress (code reading, not verified by download)
**Observation:** The Privacy & data copy says "export everything we hold (JSON)". `exportMyData` in `functions/index.js` (~line 1734-1751) returns `profile` + `portfolios → coins (incl. journal) → transactions` only. It never reads `users/{uid}/learn/progress`, where level/XP/streak/completed lessons live. I did not click the download (downloads need the user's approval), so this comes from reading the code only. Note that `/privacy.html` lists "learning progress you create" among the data held, next to portfolios and theses, so the export is incomplete against the policy's own list (a GDPR data-portability gap).
**Expected:** Either include `learn/progress` in the export, or reword the copy.
**Repeat / new:** New.
**Suggested fix (proposal only):** add `learn: (await db.doc(`users/${uid}/learn/progress`).get()).data() || null` to the `exportMyData` return value, and a case in `tests/functions-callable.test.js`.

### P02-12 · Medium · CoinInfo "Price History" shows the hard-coded mock price for "Today", "3/6 Months Ago" and "1 Year Ago", contradicting the live price at the top of the same card
**Steps to reproduce**
1. Portfolio → tap a coin's icon (CoinInfo overlay), e.g. Bitcoin, Ethereum, Chainlink.
2. Read the "Price History" block and compare with the live price in the header.

**Expected:** "Today" equals the live price shown at the top. 3/6/12-month rows come from real `/api/history` (CDN-cached) or show "—" when unknown.

**Actual:**
| Coin | Header (live) | Price History "Today" | 3 / 6 / 12 months ago |
|---|---|---|---|
| BTC | $61,008.00 | **$84,000.00** | $84,000.00 / $84,000.00 / $84,000.00 (−27.37% each) |
| ETH | $1,712.64 | **$1,900.00** | $1,900.00 ×3 (−9.86% each) |
| LINK | $8.76 | **$18.20** | $18.20 ×3 (−51.87% each) |

All of them are the `TOP_COINS.mockPrice`. Every "change since" % compares the live price against the mock, so a long-term investor reads "BTC is −27% vs a year ago" from made-up data. That happens even for ETH, where real 365-day history *is* loaded (one year ago was ~$2,763.90). Reproduced on 3 coins; LINK opened twice.

**Repeat / new:** New. Same root family as **BUG-021**/**BUG-023** (mock prices shown as real), but a different screen and code path.

**Suggested fix (proposal only):** `src/components/CoinInfo.jsx` ~lines 110-128 call only `getHistoricalPrice` (the estimate model, which returns `mockPrice` near today). Use `useCoinHistory(coin.id)` + `priceAtDate` (after the P02-07 fix) for the rows, use the live price for "Today", and show "—" when there is no real point.

### P02-13 · Medium · Money amounts can show three decimals on the coin Detail card and in CoinInfo ("+$46,301.092", "$14,348.395", "+$1,651.091")
**Steps:** Hold 450 LINK at a $5.09 average (2 buys + 1 sell, above) → open LINK CoinInfo.
**Actual:** "Unrealised P/L **+$1,651.091** (+72.07%)", reproduced on 2 openings. The same happens on the main **coin Detail** card once any amount has sub-cent precision: after a 0.00012345 BTC buy @ $68,000 (cost $8.3946), Detail showed "Bought 1.00012345 BTC · **$14,348.395**" and "Total P/L **+$46,301.092** (+322.69%)" (2 openings; the test buy was then deleted). The portfolio card for the same coin showed "1.000123 BTC" (6 dp) next to the Detail's "1.00012345 BTC" (8 dp).
**Expected:** "+$1,651.09", the same `splitMoney`/`fmt` cents-first rounding used elsewhere (PORTFOLIO-NUM-FIX).
**Repeat / new:** New. (BUG-015 fixed the cents-rounding elsewhere; this line bypasses that helper.)
**Suggested fix (proposal only):** `src/components/CoinInfo.jsx:100` and `src/components/Detail.jsx:93, 96, 99` (Bought / Sold / Total P/L) use `toLocaleString("en-US",{minimumFractionDigits:2})` with no `maximumFractionDigits`, so the default maximum is 3. (Line 92, Current Value, sets both and is fine.) Add `maximumFractionDigits:2`, or better, use the shared money formatter from `src/utils/money.js`. The same line also produces the mixed minus of BUG-026: "−$936.24 (-5.73%)".

### P02-14 · Low · For coins outside the built-in table (e.g. Zcash), back-dating keeps today's price and allows dates before the coin existed
**Steps to reproduce**
1. Search → "zcash" (shown with no price; ZEC is not in `TOP_COINS`) → add with a thesis.
2. Zcash → + Buy. The price pre-fills the live $801.02 (correct for today), and the hint reads "Date & Time · available from **2013-04-28**".
3. Change the date to 2018-06-01, then to 2014-01-01.

**Expected:** When the date changes, the price is cleared or flagged ("no historical price for this date — enter what you paid"), and dates before the coin launched (Zcash: Oct 2016) are refused, the way Chainlink's 2016 date was clamped to its 2017-09-20 launch.

**Actual:** The price stays at today's $801.02 for both dates, with no hint. The 2014-01-01 buy **was saved** ("10 ZEC · Jan 1, 2014 · $801.02"), two years before Zcash existed. The "available from 2013-04-28" floor is the generic fallback (`AddEntry.jsx:31`, `coinData?.launch || "2013-04-28"`), i.e. Bitcoin's date. Reproduced with 2 dates. I edited the transaction afterwards to 2018-06-01 @ $200.

**Repeat / new:** New.

**Suggested fix (proposal only):** in `src/components/AddEntry.jsx`, when the coin has no `TOP_COINS` entry and no real history point for the chosen date, clear the price on date change and show a "no market data for this date" hint. For the launch floor, use the first `/api/history` point or the CoinGecko `genesis_date` when available, and otherwise don't claim a specific "available from" date.

### P02-15 · Low · The user login form says whether an email has an account ("No account with this email" vs "Incorrect password")
**Steps to reproduce**
1. Log out. Log in with `nobody.p02@test.com` / any password → "**No account with this email**" (2 times).
2. Log in with `p02.longterm@test.com` / a wrong password → "**Incorrect password**" (2 times).

**Expected:** One generic message for both ("Email or password is incorrect"), as the admin "Forgot password?" flow already does on purpose (CLAUDE.md: it swallows `user-not-found` so the page can't enumerate accounts).

**Actual:** The two messages differ, so anyone can check whether an email holds an account. That matters for a finance app (targeted phishing). Caveat: on a production project with Firebase email-enumeration protection on, the backend returns `auth/invalid-credential` for both cases and the UI would show "Incorrect password" for both. The emulator shows the leaky mapping, and the mapping code is still there.

**Repeat / new:** New.

**Suggested fix (proposal only):** `src/api/firebase-auth.js:286-291`: map `auth/user-not-found`, `auth/wrong-password` and `auth/invalid-credential` to the same string. Make sure Email Enumeration Protection is ON at go-live (add it to GO-LIVE-AUDIT). The same map sits in `src/api/admin-auth.js:109-111`. Registration will still say "email already in use"; that is an accepted Firebase trade-off.

### P02-16 · Medium · Two devices editing the same thesis silently lose each other's edits, and the Edit form opens with a stale draft instead of the live-synced text
**Steps to reproduce (two tabs on the same account = two devices)**
1. Tab A and Tab B: Journal → open Zcash. In B click **Edit** and leave it open.
2. In A: Edit → append " [Edited on device A]" to the thesis → Save changes. Live sync works: A's list shows it.
3. In B (form still open with the old text): append " [Edited on device B]" to "What would change your mind" → Save changes.
4. Result: the thesis is back to the original. **A's edit is gone** and nothing told either device.
5. Round 2: in A (overlay still open) click Edit. The form shows A's *own earlier draft* (thesis "+[Edited on device A]", change-my-mind without B's text), not the live text the overlay is displaying. B then saves " [B thesis v2]"; A saves " [A cmm v2]" → final doc: thesis "…[Edited on device A]" / change-my-mind "…[A cmm v2]". **Both of B's edits are gone**, and A's earlier lost edit is resurrected.

**Expected:** Opening Edit seeds the form from the current `coin.journal` (which live sync keeps fresh). A save only writes the fields the user changed, or warns "this thesis changed on another device" when the stored version moved since the form opened.

**Actual:** Last-write-wins on *both* questions *and* the funnel findings. The draft state is seeded once at mount. Reproduced in 2 rounds.

**Repeat / new:** New. It touches the C-A3 multi-device live-sync promise in CLAUDE.md.

**Suggested fix (proposal only):** `src/components/Journal.jsx` ~lines 95-107: `useState(j.thesis)` is only the initial value and the Edit button never re-seeds it. Reset `thesis`/`changeMind` from `j` when Edit is pressed (or `useEffect` on `j.thesis`/`j.changeMyMind` while not editing). In `editThesis` → `updateCoinJournal`, send only changed keys (and don't resend `funnel` unless it changed), or compare an `updatedAt` and refuse a stale write. The founder should decide between merge and warn.

### P02-17 · Medium · The landing page promises "Conviction signals on your holdings", but the app hides them while `aiResearch` is OFF (the launch default)
**Steps to reproduce**
1. Open `http://localhost:3000/`. The feature grid says "**Conviction Signals** — A four-signal read on every coin you hold — dev, founders, team, community", and the Usage card lists "**Conviction signals on your holdings**" under "Everything, no paywall. This is the whole product."
2. Log in → Research. `/api/config` returns `features: {marketData:true, checkout:false, aiResearch:false}`.

**Expected:** Every feature the landing lists as part of "the whole product" can be reached in the app at launch, or the landing qualifies it ("coming soon").

**Actual:** With `aiResearch:false`, the Research sub-nav and the **Coins** sub-view are hidden (CRYP-93/CRYP-112, by design), and the Coins view is the only place the 🟢/🟡/🔴/⬛ conviction pills appear (only `CoinCard.jsx` references conviction; `ResearchTab.jsx:51-53, 96` forces `active='overview'` when `aiEnabled` is false). On the Research tab I found no "Coins"/"Ask" text and no conviction elements (checked on 2 loads). A long-term investor who signed up for "a four-signal read on every coin you hold" can't find it anywhere. The same Usage card says "**No upsell**", but the portfolio-limit toast still says "upgrade to Pro for 6" (BUG-032, still present). The pills are also mock-fed (CLAUDE.md: live AI evidence is Wave B).

**Repeat / new:** New. Related to BUG-028, which is the same kind of mismatch between landing copy and app behaviour.

**Suggested fix (proposal only):** either decouple the deterministic conviction pills from the `aiResearch` gate (the pills come from the pure `conviction.js` reducer, not live AI, though they are mock-fed today, which is a product question), or remove or qualify the three conviction claims in `index.html` (lines ~558, 667, 714) while `aiResearch` is off. This touches the landing ↔ app consistency map row in `docs/interview.md`, so the founder interviews first.

### P02-18 · Low · Portfolio and Research show two different "how much am I up" figures for the same book, and neither says which one it is
**Steps to reproduce**
1. Hold the book above, including one realised partial sell (LINK: 100 sold @ $20 against a $5.09 average).
2. Compare Portfolio → value card with Research → Portfolio Pulse.

**Actual (two loads):**
- Portfolio: "INVESTED $35,490.00 … ▲ **+$54,673.51 (+154.05%)**" (gross buys; total P/L including the realised $1,491 from the LINK sell)
- Research: "Against a **$34,981 cost basis** you're **up $53,183 (152.0%)**" (remaining cost basis; unrealised only)

The $1,491 gap is exactly the realised gain. After the full ZEC exit (+$6,013.80 realised) the gap grew: Portfolio "▲ **+$54,462.16 (+153.46%)**" vs Research "Against a $32,981 cost basis you're **up $46,957 (142.4%)**", a $7.5k difference with no label on either side (third observation). Both are defensible numbers. But one investor sees "+$54.7k" on one tab and "+$53.2k" on the next, with no "unrealised"/"total" label on either, and "Invested" vs "cost basis" for what reads like the same thing.

**Expected:** The same concept gets the same number, or the labels name the difference ("Unrealised: +$53,183 · Realised: +$1,491").

**Repeat / new:** New.

**Suggested fix (proposal only):** in `src/features/research/utils/pulse.js` (`pulseFacts`/`pulseLines`), label the line "unrealised" or add the realised part. Optionally show "Realised P/L" on the Portfolio value card. Copy-only change; founder's call which one is canonical.

### P02-19 · Medium · Account → Plan & billing says "AI research: **Live** — Research summaries & analysis — included in every plan", while AI is off
**Steps to reproduce:** Account → Plan & billing (opened twice, light and dark).
**Actual:** A usage row reads "AI research · **Live** · Research summaries & analysis — included in every plan". With `aiResearch:false` (`/api/config`) and `AI_PROXY_LIVE=false`, no AI exists anywhere in the app; the Research tab shows only the deterministic Overview. The row is hard-coded and ignores both flags.
**Expected:** Consistent with the "no AI claims anywhere" rule (CLAUDE.md landing section, CRYP-93 "deterministic summary IS the honest product"): hide the row, or name what exists ("Portfolio Pulse & risk summaries — included").
**Repeat / new:** New.
**Suggested fix (proposal only):** `src/components/Account.jsx:262-265`: gate the row on `site.features.aiResearch === true && AI_PROXY_LIVE`, or reword it to the deterministic features. Founder decides the copy.

### P02-20 · High · Landing DCA calculator silently shows made-up returns when `/api/history` answers with an empty list ("Price today $103,000" while BTC trades at $60,801)
**Steps to reproduce**
1. Open `http://localhost:3000/#dca` (no login). Coin Bitcoin (default), $100, Weekly, 2023-11-22 → 2026-11-22.
2. Switch to Monthly and set the start date to 2018-01-01.

**Expected:** Either real history, or a visible "estimate / data unavailable" notice. "Price today" should match the live price (`/api/coinlist` returns `bitcoin.price = 60801`).

**Actual:**
- Weekly 2023→2026: invested $15,700 → value **$19,461 (+24.0%)**, avg buy $83,094, **Price today $103,000**.
- Monthly 2018→2026: invested $7,100 → value **$16,448 (+131.7%)**, avg $44,462, **Price today $103,000**.
- No message in `#dcaMsg`. The card footer says "Data provided by CoinGecko · prices refresh about once a minute".

With the live price, the monthly case is worth about 0.1597 × $60,801 ≈ **$9,709 (+36.7%)**, so the calculator overstates by about $6,700. The weekly case is really a **loss** (avg $83k vs $60.8k) but is shown as +24%. Reproduced on 2 configurations.

**Cause (from reading the code):** `public/landing.js` `getHist()` (~line 150-157): when the response is a 200 with `prices: []` (this session's state for bitcoin, see P02-01), it quietly substitutes `fbHist(id)` but does **not** set `histDegraded`. That flag is set only on a network error or timeout, so the "showing an offline estimate" notice never appears. "Price today" is the last point of the fake series.

**Repeat / new:** New. Related to P02-01 (empty history cached 24h) and BUG-011 (landing coin-list timeout, a different path). CALCULATOR.md documents the offline estimate + 12s timeout; this is the "200 but empty" hole.

**Suggested fix (proposal only):** in `getHist`, set `histDegraded = true` when falling back for an empty response, too (or show "No market history for this coin right now"). Use the live `/api/coinlist` price (`sel.price`) for "Price today" and the value. Don't cache the fallback in `hCache`; the comment says it shouldn't be cached, but the empty-200 branch does cache it.

### P02-21 · High · Editing only the date of an old transaction silently replaces the price you recorded with the (wrong) AUTO price
**Steps to reproduce**
1. ETH → Detail → tap the "4 ETH · Jan 15, 2023 · $1,550.00 / ETH" row → Edit ETH. The form shows `4 | 1550 | 2023-01-15T10:00`.
2. Change only the date, to 2023-01-16 (e.g. fixing a one-day typo).

**Expected:** The price the user entered (1,550) stays. At most a "Suggested price … tap AUTO" hint appears, which is what the form already shows when you *type* a price.

**Actual:** The price field is overwritten with **2,763.90** (the clamped value from P02-07), and Total cost jumps from $6,200.00 to **$11,055.60**. There is no notice. "Save Changes" would store a cost basis 78% too high. Reproduced on 2 transactions: the 2024-03-10 buy ($3,500 → $2,763.90 when its date was changed, while also switching it to Sell) and the 2023-01-15 buy above. I closed both edits without saving, so the data is unchanged.

**Repeat / new:** New. It amplifies BUG-025 / P02-07: even a user who typed the correct historical price loses it the moment they touch the date.

**Suggested fix (proposal only):** `src/components/AddEntry.jsx` `onDateChange` (lines ~44-56) always calls `setEPrice(fmt)` on any date change. Only auto-fill when the price field is empty, or still equals the previous AUTO value (track a "user-edited price" flag), and never in edit mode for an existing transaction. Keep the "Suggested price · tap AUTO" hint for the rest.

## Known bugs re-checked
| Bug | Result | Evidence this run |
|---|---|---|
| BUG-020 live-sync toast during setup | Not reached | No sign-up in this run (account existed) |
| BUG-021 Search shows mock prices; thesis saves them | **Still present** | Search: BTC $84,000 (live $60,549), LINK $18.20 / #13 (live $8.73 / #16), Monero $178 / #27 / +1.20% (live $485.88 / #12 / +4.07%), Kaspa $0.1450 / #37 (live $0.0256 / #81, 5.7× too high). The mock covers the **rank and 24h % too**, not just the price; coins outside `TOP_COINS` (Zcash) show the live rank and no price. Thesis priceAtAdd saved $84,000 (BTC) and $178 (XMR). Contrast: Journal → "Add thesis" path saves the live price ($8.74 LINK, $60,801 BTC); Trending path saves none. |
| BUG-022 Empty holding green "+$0.00" | **Still present** | LINK/ETH detail "+$0.00 (+0.00%)" in `pnl-val` green `rgb(7,80,58)` (light) / green in dark. Empty Cold Storage header 24H "+0.00%" green (`vc-sval up`). The main P/L line is correctly "—". |
| BUG-023 AUTO pre-fills mock price | **Still present** | Buy form opens with BTC 84,000.00, LINK 18.20, ETH 1,900.00 while the Detail above shows live 60,549 / 8.74 / 1,712. Seen 4×. For coins outside `TOP_COINS` (ZEC, PENGU) the pre-fill is the live price. |
| BUG-024 Time recorded in UTC, shown as local | **Still present** | Default Date & Time 09:58/10:00/10:13/10:31 at local 11:58-12:31 (UTC+2). A "now" ZEC sell is listed as "10:31:00 AM". Back-dated typed times display correctly. |
| BUG-025 AUTO historical price = estimate labelled market price | **Still present, root cause found** | See P02-07 (clamp in `priceAtDate`) and P02-01 (empty history + 24h cache). |
| BUG-026 Mixed minus signs | **Still present** | "−$2,974.38 (-22.53%)" (Portfolio/ETH Detail), "−$936.24 (-5.73%)" (CoinInfo), "−$149.60 (-4.67%)" (Cold Storage). |
| BUG-027 Escape doesn't close Detail | **Still present, cause found** | Esc ignored on Detail (focus on body and after clicking inside), on the Journal overlay and on the Rename-portfolio dialog (focus in the input). `Modal.jsx` has no Escape handler at all (comment: "Modal has no Esc"), and its X is a `div role="button"` with no `tabIndex`, so it isn't keyboard-reachable either. |
| BUG-028 Learn modules 2-9 locked though "all 9 open" | **Still present** | At 0 lessons, modules 2-9 showed padlocks; each unlocks only after the previous one is finished (4-9 still locked at the end). Clicking a locked card gives no feedback. Landing still says "Nine lesson modules, open to every account" and "All 9 Learn modules, fully open". |
| BUG-029 Quiz answers not controls | **Still present** | `.quiz-opt` are plain `div`s. The only focusables in a lesson are Previous and Submit. Today's-lesson "Start lesson" is also a div (P02-09). |
| BUG-030 Wrong answer stays green | **Still present** | After a wrong Submit the chosen option keeps `quiz-opt selected` with green bg `rgb(233,242,237)` / border `rgb(10,107,77)` next to the red "Not quite" message. Reproduced on 2 lessons (module 1 lesson 1, module 3 lesson 3). |
| BUG-031 Name field strips accents etc. | **Still present** | Profile: typing "Léo O'Hodl-Smith" shows "Lo OHodlSmith" (not saved). Register form (logged out): "Zoë O'Brien-Smith" → "Zo OBrienSmith" (not submitted). |
| BUG-032 Upsell to an unbuyable plan | **Still present** | 4th portfolio → toast "Starter: 3 portfolios — upgrade to Pro for 6", while the landing says "No upsell". |
| BUG-033 Oversized Privacy text | **Still present** | "Security & payment emails are always sent…" visibly larger than the rest of the card (dark mode). |
| BUG-034 Deleted account creds stay in form | Not reached | Account deletion not exercised (destructive). Normal Logout clears the form (checked). |
| BUG-035 Restore screen dark mode | Not reached | Needs account deletion. |
| BUG-036 100% single token rated Low | **Still present (variant)** | 100% PENGU (rank #130 meme) → "Moderate … A mix of ranks and sizes", the wrong copy for one coin; the single-coin note card does say "Everything you hold is in a single coin". 100% BTC → Low ("$100B+ anchor"), which is defensible. Concentration doesn't move the meter. |
| BUG-037 Stress test "higher-beta amplify" at −50% | **Still present** | 100% BTC: "−50.0% … Your higher-beta holdings amplify the swing", same at −10% → −10.0%. |
| BUG-038 Daily Brief always ▲ | Not reproducible today / code unchanged | Market was up all session, so the arrow was correct. `OverviewView.jsx:33` still hard-codes `ic-up ▲` regardless of `up`. |
| BUG-019 Oversell / P&L integrity (resolved) | Appears fixed | A sell dated before the first buy was refused with a clear message. Totals/avg/P&L re-checked by hand after edit and partial sell. |
| BUG-015 $1-low rounding (resolved) | Appears fixed on Detail/Portfolio | But CoinInfo bypasses the helper (P02-13). |
| BUG-017 NaN% diversification (resolved) | Appears fixed | Notes read "about 86%/94%", never NaN. |

## What worked well
- The thesis flow fits a long-term holder: the "Before you add…" prompt, required second question, whitespace rejection, Read/Breakdown popup, manual-research findings, and the R24 X-auto-save on the Journal overlay all behaved as documented.
- Cost-basis maths was exact in every case I checked by hand (avg buy, realised + unrealised P/L, portfolio totals, after edit, partial sell, full exit and delete).
- Transaction integrity guards: a sell dated before the first buy, and deleting a buy that a later sell depends on, are both refused with clear, specific messages.
- Launch-date clamp for table coins (LINK 2016 → 2017-09-20, with an explanatory warning).
- Live multi-device sync of review status between two tabs, within a couple of seconds.
- Learn progression, XP, levels, streak and module unlocks persisted across reloads and logout/login.
- User text is escaped everywhere (an `<img onerror>` thesis rendered as text).
- Dark mode and the 390 px layout looked consistent; no horizontal scroll; full-screen modals on mobile.
- No duplicate coin on a double-clicked Save; portfolio name max length enforced.
- The Research notes engine picked sensible notes (concentration at 86-94%, single-coin note at 100%).

## Other observations (not filed as bugs)
- The verify-email banner reappears on every reload after being dismissed (likely intended until the email is verified).
- "1 coins" in Account → Portfolios (pluralisation).
- The Pulse **Share** image (`useSharePulse.js`) prints the absolute portfolio total ("Total $88.2K") on a shareable PNG with no option to hide it. Privacy-sensitive for some users; I did not click it (it downloads a file).
- Back-dated buys can't be tagged as "transferred in / cost basis unknown". A long-term holder with coins from 2017 has to invent a price.
- Exited positions (ZEC fully sold) keep their Journal card with no "exited" marker or outcome note. A natural spot for a "what happened to my thesis" field.
- Plan & billing "Joined 2026-11-22" while the ETH thesis from the earlier run is dated Nov 21, 2026. Possibly the `joined` value comes from a re-seed; not investigated.
- Pressing Enter in the Buy/Sell form doesn't submit it (the Rename-portfolio dialog does submit on Enter), which is inconsistent for keyboard users.
- Daily Brief on a one-coin book says "Today's biggest gainer: Bitcoin +5.0%". "Biggest" out of one reads oddly; maybe skip the line for a single holding.
- The Journal Read/Breakdown popup shows only the filled findings, and a lone "—" when none are filled. Fine, but "No manual research recorded yet" would be clearer.
- `/edge` principle 01 copy names a company ("Not because someone on **Twitter** mentioned it"). The no-company-names rule in CLAUDE.md is stated for the landing; check whether it should cover `/edge` too.
- The landing footer links "Source on GitHub" / "MIT License" to `github.com/nrenre62/crypto-idea`. CLAUDE.md "Known notes" says that remote is **PRIVATE**, while the Sentry note calls the repo public. If it is private, anonymous visitors get a 404 from the landing's open-source claim. Not verified (no external sites in this test); the docs disagree with each other.
- On Learn, review mode re-requires each quiz answer before Next, so re-reading lesson 4 means answering 1-3 again.

## Timeline
- 11:56 — start; health check OK (3000 → 200, 5001 → 404 = up). Browser was signed in as p01. Logged it out and logged in as p02 (account already existed with 2 ETH buys and an ETH thesis).
- 11:58 — Escape on Detail: no close (BUG-027). Search shows mock $84,000 (BUG-021). BTC added with full thesis + 3 findings.
- 12:00 — back-dated BTC buys 2017/2020/2022; AUTO prices are estimates; /api/history empty (P02-01). Default time 2h behind (BUG-024), AUTO 84,000 mock on open (BUG-023).
- 12:03 — Journal: Read/Breakdown, edit thesis (validation for empty and whitespace OK), Save findings, Review/Challenged statuses, X auto-save of ETH finding persists across reload.
- 12:05 — LINK via Skip → Needs a thesis → Incomplete → completed. Search-prompt X discards draft (P02-02). LINK back-dated buys, launch-date clamp OK.
- 12:07 — Research: Pulse 24H/7D/30D (P02-03), allocation, risk Low, stress test −50/−20/+30.
- 12:08 — Learn: module 1 completed (6 lessons) → Level 2, 300 XP, streak 1, module 2 unlocked. BUG-028/029/030 seen.
- 12:10 — Reload: Pulse attribution persists (P02-03). Edited the 2020 BTC buy. Created "Cold Storage – 10yr"; Journal empty-state copy (P02-05); HTML/emoji thesis rendered escaped; delete thesis.
- 12:12 — Dark mode across Account/Journal/popups; review-status not shown in overlay (P02-04); mobile-width check in a 390 px same-origin iframe (resize_window had no effect on the maximised window). Scroll kept on tab switch (P02-06).
- 12:15 — ETH AUTO = $2,763.90 for every pre-2025 date (P02-07, BUG-025 root cause). LINK partial sell; oversell-before-first-buy refused. Cold-storage coin delete dialogs (P02-08), unlabeled trash button (P02-09).
- 12:19 — Account: Privacy card (BUG-033), name field (BUG-031), 3/3 portfolios + upsell toast (BUG-032), disarm layout shift (P02-10), export scope (P02-11).
- 12:21 — CoinInfo overlays: mock "Price History" (P02-12), 3-decimal P/L (P02-13). Learn module 2 3/6, persisted after reload.
- 12:23 — Zcash (not in TOP_COINS): 2014 buy accepted at today's price (P02-14). Monero added (mock $178 vs live $484, BUG-021). Double-click Save → no duplicate.
- 12:25 — Logout/login: login-error enumeration (P02-15); data + dark theme persisted.
- 12:27 — Two tabs as two devices: live sync of status OK; concurrent thesis edits lost (P02-16).
- 12:29 — Landing vs app: conviction signals promised but hidden (P02-17), "Nine modules open" (BUG-028), "No upsell" (BUG-032).
- 12:29 — Pulse vs Portfolio P/L labels (P02-18). Back button with a popup open leaves the page (the app has no history entries for tabs/popups). Learn module-1 review.
- 12:31 — Plan & billing "AI research Live" (P02-19); 50-char emoji rename; ZEC full exit; late-night back-date OK; module 2 finished, module 3 started (Level 3).
- 12:34 — 100% PENGU risk re-check (BUG-036); portfolio delete copy (P02-08 C); tiny-amount buy → 3-decimal money on Detail (P02-13); tx-delete integrity guard.
- 12:38 — Landing DCA calculator shows fabricated returns (P02-20); keyboard reachability of Journal entries (P02-09).
- 12:43 — Edit-date overwrites the recorded price (P02-21); BUG-030 second repro; Journal Read popup variants; rename via Enter; Esc on Rename dialog (BUG-027).
- 12:48 — Dark-mode CoinInfo/Learn spot checks; logout; anonymous checks of /edge, footer links, /privacy.html, /terms.html, Register name field (BUG-031). Tabs closed.
