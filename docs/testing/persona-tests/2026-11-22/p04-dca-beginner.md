# Persona 04 — DCA beginner / learner · 1-hour test · 2026-11-22
Status: Complete | Account: p04.dca@test.com | Start: 13:45 local (UTC+2) · End: 14:40 local | Minutes tested: 55

**Summary:** 39 findings (P04-01…P04-39): **1 High**, 12 Medium, 26 Low (several Lows are copy/product questions). For a DCA beginner the biggest problem is P04-09: the landing calculator and the app give opposite answers for the same monthly Bitcoin plan (+0.8% vs −27.5%), and both use invented prices labelled as market data (BUG-025/BUG-023, P03-13). The calculator itself mis-schedules monthly buys after month-end starts (P04-03), counts future dates as invested money (P04-04), drops the last buy across a DST change (P04-06) and can show one coin's numbers under another coin's name (P04-18). In the app, a comma decimal silently multiplies a buy by 10–100× (P04-39) and Detail shows money with three decimals (P04-08). In Learn, quizzes are honest and progress persists, but keyboard users can't take a quiz (BUG-029 + P04-02), wrong answers stay green (BUG-030) and new lessons open scrolled to the quiz (P04-22). Known bugs re-checked: 16 still present (BUG-021…033, 036, 037, 038), BUG-019 stays fixed, BUG-020/034/035/039 not reached. The account already existed, so no registration was needed. All 50 lessons are now complete on this account.

## Persona
A crypto beginner who wants to learn before investing and plans to dollar-cost-average a fixed monthly amount into Bitcoin. Expects the Learn tab to teach clearly (with honest quiz feedback and visible progress), the landing DCA calculator to be easy and correct, and the app to let them record monthly buys that match what the calculator predicted.

## Data created
The account already existed (display name "Dana DCA", 1 lesson done, empty "My Portfolio"), so no registration was needed. Times are local (UTC+2).

| # | Where | Item | Details | Note |
|---|---|---|---|---|
| 1 | Learn | Lessons | 49 lessons completed this session (50/50 total), 2,500 XP, Level 5, streak 2 days | Wrong answers on purpose in markets-2, markets-3, fundamentals-1, tokenomics-1 (×2 incl. mobile + dark), thesis rework |
| 2 | My Portfolio | Bitcoin + thesis | Thesis: "I want to put $100 into Bitcoin every month… DCA stops me timing the market." / change-my-mind: "If I can no longer afford $100 a month, or if a major security flaw…" | Added from Search → Trending |
| 3 | My Portfolio | 12 BTC Buys | 0.00119048 BTC each at the AUTO $84,000 (= $100.00), on the 1st of each month 10:00, Dec 1 2025 → Nov 1 2026 | AUTO is the built-in estimate (P04-09) |
| 4 | My Portfolio | Edit | Dec 1 2025 Buy price 84,000 → 90,000 ($107.14) | Avg buy became $84,500 |
| 5 | My Portfolio | BTC Sell | 0.005 BTC at $61,012 (typed live price) = $305.06, saved as "Nov 22, 2026 12:03 PM" (local 14:03) | Pre-fill was 84000 |
| 6 | My Portfolio | 2 test Buys, deleted | 0.001 BTC at $61,000 dated today 22:00 and 23:00 | Future-time test (P04-20); both removed with the two-step delete |
| 7 | Weekly ETH plan (new) | Portfolio | Created from Account → Portfolios | 2/3 |
| 8 | Weekly ETH plan | Ethereum | 52 weekly $50 Buys, Thursdays 10:00, Nov 27 2025 → Nov 19 2026, at AUTO prices (real `/api/history`, e.g. Oct 1 $2,684.71 … Nov 19 $1,775.10) | Totals: 1.16242515 ETH, $2,600.00 invested, avg $2,236.70 |
| 9 | Weekly ETH plan | ETH thesis (added later from Journal) | "Learning by doing: $50 a week into ETH for a year…" + later "If I panic-sell during a drop…"; review set to Need to research, then Reconsidering | Ends as 🔴 Challenged; priceAtAdd $1,708.92 |
| 10 | Weekly ETH plan | Solana | Added (thesis skipped) + 4 weekly $50 Buys Oct 29 → Nov 19 at AUTO ($102.32, $95.51, $83.24, $73.56) | 2.2925584 SOL |
| 10c | Weekly ETH plan | Chainlink, Sui (from Trending, each with a short test thesis) | Added, then removed with the two-tap Remove (0 transactions) — theses deleted with them (P04-36); Chainlink thesis showed no price (BUG-021 row) | Not in the final data |
| 10b | Weekly ETH plan | SOL thesis | Added from Journal → "Needs a thesis" (both questions, 🟢 Intact, priceAtAdd $69.98), then deleted ("Yes, delete thesis") | SOL back under "Needs a thesis" |
| 11 | Learning sandbox (new) | Portfolio + Aave | Aave added, 1 Buy of 1 AAVE at $98.65 | Used for BUG-038; portfolio then **deleted** (Cancel first, then "Delete anyway") |
| 12 | Account | Theme | Light → Dark (most of the session) → System → Light | Restored to Light |
| 13 | Account | Not saved | Name "Dana O'Brien-Lévy" typed (BUG-031), not saved; weak new password "abc" refused | No account settings changed besides theme |
| 14 | Landing `/#dca` | Calculator runs | BTC/ETH/DOGE/ADA/LTC/DOT/SOL/XRP/Chainlink; Daily/Weekly/2 weeks/Monthly; $50–$99,999,999,999,999,999; ranges 2023-11-22→2026-11-22, 2025-12-01→2026-11-01, month-end, DST and future end dates | Nothing stored |

## Coverage
| Area | What was tested | Result |
|---|---|---|
| Learn — quizzes | Wrong then right answers, re-pick after correct, double-click Next, Submit disabled state | Quiz gating works; BUG-029, BUG-030, P04-01, P04-22 |
| Learn — navigation | Previous / Next / Done, Review from start, X-close mid-module and resume, Today's lesson card | Pass (resume point correct, no double XP); P04-22 scroll offset |
| Learn — progress | XP bar and label, level-ups 1→5, streak chip, 1 → 50/50 lessons, "All caught up", persistence across reload and logout/login | Pass; P04-15, P04-16 |
| Learn — locks | Module unlock order | BUG-028 still present |
| Learn — a11y | Tab order in the lesson popup, Escape, keyboard-only quiz | Fail: P04-02, BUG-029 |
| Landing DCA calculator (P03-14 item 3 confirmed: ETH's default 3-year range silently became 1 year, "Buys made 53"; BTC Monthly 2019-01-01 → 2021-06-30 silently became Jan–Jun 2021, "Buys made 6") | 9 coins, all 4 frequencies, month-end dates, DST, future end date, invalid range, 0 / negative / exponent / huge amounts, keyboard coin picker, fast coin switching, 375 px | P04-03…07, P04-13, P04-18, P04-23; BTC estimate (P04-09 / P03-13) |
| Plan vs record | Same BTC monthly plan and ETH weekly plan in calculator and app | BTC: contradictory (P04-09). ETH: identical coins and avg once the end date is moved a day (P04-06) |
| Portfolio / Detail / AddEntry | Add coin with thesis and without, 12 + 52 + 4 + 1 buys, edit, sell, two-step delete, future dates, pager 50/page (52 tx), 3 portfolios, cap at 3, delete portfolio | Pass with P04-08, P04-20; BUG-022/023/024/026 still present |
| Research | Daily Brief, Pulse 24H/7D/30D, allocation, risk, stress ±50%, notes on 1-coin / 2-coin / empty / down book | P04-11, P04-29; BUG-036/037/038 still present |
| Journal | Thesis at add, thesis added later, partial thesis, edit, review decisions, delete thesis (confirm step), keyboard | P04-24, P04-25; delete thesis OK |
| Search / CoinInfo | Solana, Aave, Cardano (keyboard Tab to + Add works), held BTC overlay | BUG-021, P04-21; P03-03 confirmed for SOL and held BTC; P03-15 (unnamed delete-coin trash button in Detail) confirmed |
| Account | Profile name, Privacy card, Plan & billing, Portfolios, Security (weak password), theme, logout/login ×3 | BUG-031, BUG-032, BUG-033, P04-14, P04-19, P04-27, P04-28 |
| Mobile | 390 px Learn + lesson (dark), 360 px lesson with wrong-answer feedback (light), 375 px landing DCA + menu, 360/375 px Portfolio and Add transaction (same-origin iframe — the maximised window ignores `resize_window`) | P04-26; otherwise no horizontal scroll |
| Dark mode | Learn, lesson popup with wrong-answer feedback, Portfolio, Detail, Research, Journal | Readable; no dark-only defects |
| Navigation | Tab switching, reload, browser back/forward | P04-12; back/forward reload the app on the Portfolio tab (no in-app history) |
| Console | After major flows | Only React duplicate-key errors from P04-21; otherwise none |
| Not tested | Pulse "Share" (downloads a PNG), CSV/JSON export (downloads), email change, Sign out everywhere, account deletion, registration | — |

## Findings

### P04-01 · Low · Disabled quiz "Submit" looks identical to the enabled button
- **Steps:** Learn → open any lesson → scroll to the quiz without picking an option.
- **Expected:** Submit looks inactive (dimmed / not-allowed cursor) until an answer is picked.
- **Actual:** The button is `disabled` but renders solid black at opacity 1 with `cursor:pointer` (computed style read twice, light mode: identical before and after picking an answer — bg `rgb(21,20,15)`, opacity 1, cursor pointer; in dark mode the disabled Submit is the same bright pill as the enabled one). A beginner taps it and nothing happens, with no hint why. (The disabled "Previous" on lesson 1 *is* visibly dimmed, so only the primary button lacks the style.)
- **Status:** New.
- **Suggested fix:** add a `.ci-app .btn-primary:disabled{opacity:.45;cursor:not-allowed}` rule in `src/styles/app.css` (check the lesson-nav override, `.lesson-nav .btn-primary`).

### P04-02 · Medium · Lesson popup does not trap focus and Escape does not close it — a keyboard user tabs onto the hidden bottom nav and leaves the lesson
- **Steps:** Learn → Continue → in the lesson popup click the text, press Tab (focus lands on "Previous"), press Tab again → focus is on the **Portfolio** bottom-nav button *behind* the popup; press Enter.
- **Expected:** The `role=dialog aria-modal=true` card keeps Tab inside it, and Escape closes it.
- **Actual:** The second Tab leaves the dialog (`activeElement.closest('[role=dialog]')` = null, text "Portfolio"); Enter switches the app to the Portfolio tab and the lesson closes. Escape (focus on body, then on in-dialog content) never closes the popup. Reproduced 2× for the focus escape, 3× for Escape on lessons; Escape also did nothing on the Journal thesis overlay, the coin Detail and the "Delete Learning sandbox?" confirm dialog.
- **Status:** Related to **BUG-027** (Escape doesn't close the coin Detail popup) — same root cause, wider than reported: `src/components/Modal.jsx` has **no Escape handler at all**, and its Tab trap only runs when `trapFocus` is set (ONBOARD-GATE plan modal), so every other popup (lessons, Detail, CoinInfo, Buy/Sell) leaks focus. Still open.
- **Suggested fix:** in `Modal.jsx`, always add a keydown listener: `Escape` → `onClose()` (unless `hideClose`/forced), and run the existing focus-trap for every modal, not only `trapFocus`. Combined with BUG-029 (answers not focusable) a keyboard user currently cannot take a quiz at all.

### P04-03 · Medium · Landing DCA "Monthly" drifts after a month-end start date and skips months (fewer buys than real monthly DCA)
- **Steps:** `/#dca` → Ethereum (real `/api/history`) → Monthly, $100 → start **2026-01-31**, end **2026-02-28**. Second repro: start **2026-03-31**, end **2026-06-30**.
- **Expected:** One buy per calendar month: 2 buys (Jan 31, Feb 28) and 4 buys (Mar 31, Apr 30, May 31, Jun 30).
- **Actual:** "Buys made **1**" ($100 invested) and "Buys made **3**" ($300). Third repro on Dogecoin: 2026-01-31 → 2026-03-31 gives "Buys made **2**" (expected 3). `genDates()` in `public/landing.js` does `c.setMonth(c.getMonth()+1)` on a running date, so Jan 31 → "Feb 31" = **Mar 3**, Mar 31 → "Apr 31" = **May 1**, and every later buy stays on the shifted day. A beginner who buys on payday at month-end gets a schedule that silently skips a month and moves every later buy.
- **Status:** New.
- **Suggested fix:** in `genDates`, compute each monthly date from the original start (`new Date(Date.UTC(y, m0+k, 1))` then clamp the day to `min(startDay, daysInMonth)`) instead of mutating the running date; build dates in UTC to match the `/api/history` timestamps.

### P04-04 · Medium · Landing DCA counts buys on future dates (end date after today) as money already invested
- **Steps:** `/#dca` → Ethereum → Monthly $100 → start 2026-06-01 → end **2027-06-01**; then end **2030-01-01**.
- **Expected:** The end date is capped at today (`max` on the input) or future buys are excluded, with a note.
- **Actual:** "Total invested **$1,300** · Buys made **13**" and then "Total invested **$4,300** · Buys made **43** · Return −2.6%" — 37 of those buys are in the future, all priced at the last history point, so they dilute the real return (−18.7% for the 6 real buys → −2.6%). Profit/Loss stays exactly −$112.45 in all three runs, which shows the future buys are fake. The date inputs have no `min`/`max`. A range entirely in the future (2027-01-01 → 2027-06-01) is also accepted: "Buys made 6 · Total invested $600.00 · Return +0.0%".
- **Status:** New.
- **Suggested fix:** `public/landing.js` `calc()`: clamp `end` to `min(end, today)` (and to the last history timestamp), and set `eEl.max = sEl.max = iso(new Date())` at init. Optionally say "End date moved to today."

### P04-05 · Low · Landing DCA keeps showing the previous result under a validation error
- **Steps:** Get any result → set the end date before the start date (or type amount `0`).
- **Expected:** The old result is hidden or greyed out while the error is shown.
- **Actual:** The message "Pick a valid date range (start before end)." / "Enter an amount." appears, but the result card still shows the old numbers ("Total invested $4,300 … Return −2.6%", then "$600.00 … −18.7%"). Reproduced 3× (invalid range, zero amount, and BTC Monthly 2019-01-01 → 2020-12-31, where "No price points in that range." sat above the previous "$7,100 … +131.7%" result). A beginner can read the stale numbers as the answer to the new inputs.
- **Status:** New (extends P03-14 item 4, which saw the same for a coin with no history).
- **Suggested fix:** in `calc()`, `document.getElementById('dcaRes').classList.remove('show')` on every early return and in the `catch`.

### P04-06 · Low · Landing DCA drops the last buy when the range crosses a daylight-saving change
- **Steps:** Browser time zone Asia/Jerusalem (DST ended 2026-10-25). `/#dca` → Dogecoin → Weekly → 2026-10-01 → 2026-10-29. Control: 2026-11-01 → 2026-11-15. Also Daily 2026-06-01 → 2026-11-22.
- **Expected:** 5 weekly buys (Oct 1, 8, 15, 22, 29); 3 for the control; 175 daily buys.
- **Actual:** **4** weekly buys (control: 3, correct); **174** daily buys. `genDates()` parses the `YYYY-MM-DD` inputs as UTC midnight but steps with local `setDate()`, so after the DST change each date is 01:00 UTC and the end-date buy fails `c <= e`.
- **4th repro:** Bitcoin Daily 2023-11-22 → 2026-11-22 (1,097 calendar days inclusive) gives "Buys made 1,096" (the run takes ~1 ms, so performance is fine).
- **Persona impact (3rd repro):** planning Weekly $50 ETH 2026-10-01 → 2026-11-19 gives **7** buys / $350 / −30.2%; the same 8 buys recorded in the app (Oct 1 … Nov 19) give $400 / −26.05%. Only moving the end date to Nov 20 makes the calculator match the app.
- **Status:** New.
- **Suggested fix:** step in UTC in `public/landing.js` `genDates` (`c.setUTCDate(c.getUTCDate()+7)` / `setUTCMonth`), or compare day strings (`iso(c) <= end`).

### P04-07 · Low · Landing DCA coin picker can't be used from the keyboard, and the result card keeps the old coin
- **Steps:** `/#dca` → type `sol` in Coin → ArrowDown → Enter. Second repro: type `dogecoin` → Enter → Tab.
- **Expected:** Arrow keys move through the list and Enter picks a coin (combobox pattern), or Enter picks the top match.
- **Actual:** Nothing is selected; the input keeps the raw text "sol" / "dogecoin" while the result card still says "Coin: Ethereum (ETH)" and shows ETH numbers. The options are `div`s (`tabIndex -1`, no role) and the input has no `role="combobox"`, so the list can't be reached by Tab either.
- **Status:** New (same family as BUG-029: clickable `div`s instead of controls).
- **Suggested fix:** in `public/landing.js` `render()`, make options `role="option"` inside a `role="listbox"`, add ArrowUp/ArrowDown/Enter/Escape handling on `#dcaCoin` (`aria-activedescendant`), and default Enter to the first match.

### P04-08 · Medium · Coin Detail shows dollar amounts with three decimals ("Total P/L −$27.493", "Bought … · $1,200.004")
- **Steps:** Add Bitcoin → Buy 0.00119048 BTC at the pre-filled $84,000 (Total cost preview "$100.00") → open the Bitcoin Detail. Repeat with 12 such buys.
- **Expected:** Money to the cent: "−$27.49", "$1,200.00".
- **Actual:** After 1 buy: "Total P/L **−$27.493** (-27.49%)". After 12 buys: "Bought 0.01428576 BTC · **$1,200.004**" and "Total P/L **−$329.915**". Also on the ETH Detail ("Total P/L −$104.213", later "−$613.508") and in the **CoinInfo overlay** for held BTC ("Unrealised P/L **−$217.092** (-27.67%)"). The Portfolio header and the "Invested" tile round correctly ($1,200.00, −$329.92), so the same position shows two different numbers.
- **Root cause:** `toLocaleString("en-US",{minimumFractionDigits:2})` with no `maximumFractionDigits` (default max is 3) in `src/components/Detail.jsx:93` (Bought) and `:99` (Total P/L), and the same pattern in `src/components/CoinInfo.jsx:100` (Unrealised P/L).
- **Status:** New. (Same family as the PORTFOLIO-NUM-FIX / BUG-015 rounding work; the shared `splitMoney` in `src/utils/money.js` isn't used here.)
- **Suggested fix:** add `maximumFractionDigits:2` at those three call sites, or route them through one shared money formatter built on `splitMoney`. Add a unit test that no Detail money string has more than 2 decimals.

### P04-09 · High · For the same 12 monthly $100 Bitcoin buys, the landing calculator says +0.8% and the app says −27.5% — and both use invented prices
- **Steps:** Landing `/#dca` → Bitcoin → Monthly → $100 → 2025-12-01 → 2026-11-01. Then in the app add Bitcoin and record 12 Buys of $100 on the 1st of each month Dec 2025 → Nov 2026, accepting the AUTO price ("Using the market price for this date").
- **Expected:** A beginner who checks the calculator and then records the same plan sees the same buy prices, and both come from real history (or are clearly labelled estimates).
- **Actual:**

  | | Landing calculator | App (AUTO prices) | Live today |
  |---|---|---|---|
  | Buy prices used | built-in month-end table, frozen at **$103,000** from Jun 2026 | **$84,000 for all 12 months** (built-in table ends Apr 2025) | — |
  | Avg buy price | $102,142 | $84,000.00 | — |
  | "Price today" | **$103,000** | $60,906.00 | $60,906 (`/api/prices`) |
  | Invested / value | $1,200 / $1,210 | $1,200.00 / $870.09 | — |
  | Result | **+$10.08 (+0.8%)** | **−$329.92 (−27.49%)** | — |

  `/api/history?id=bitcoin` returns an empty `prices` array in this environment (ETH/SOL/DOGE return 366 points), so both front-ends fall back to different hard-coded tables without saying so. The app's AUTO badge says "Using the market price for this date" for a constant $84,000 on every date from Dec 2025 to Nov 2026 (also $84,000 for 2026-06-01; $46,666.67 for 2024-01-15). Reproduced twice for the AUTO price and twice for the landing numbers.
- **Status:** Repeat of **BUG-025** (estimate labelled as market price, still open) and of **BUG-023** (Buy form pre-fills mock $84,000 before a date is chosen, still open), plus the landing half reported today as P03-13. Filed here because the persona's core flow — "plan with the calculator, then record the plan" — gives two contradictory answers.
- **Suggested fix:** one historical-price source for both (`/api/history`), with the shared fallback table removed or both fallbacks labelled "estimate"; when history is missing, leave the price empty and say "No market price for this date — enter what you paid." Fix the empty-BTC-history cache (P03-07). Files: `public/landing.js` (`getHist`, `FB_PRICES`), `src/utils/coins.js` (estimate table, `mockPrice`), `src/components/AddEntry.jsx:109-114` (AUTO badge copy).

### P04-10 · Low · No "amount in USD" option for recording a DCA buy
- **Steps:** Bitcoin → + Buy. The form takes **Amount (BTC)** and **Price per coin**.
- **Expected:** A DCA investor thinks "I put in $100"; they'd want to type $100 and let the app work out the BTC.
- **Actual:** I had to compute 100 ÷ 84,000 = 0.00119048 BTC by hand for each of 12 buys; any rounding shows up as "$100.00" in the preview but "$1,200.004" in the total (see P04-08).
- **Related:** the landing result's "Track this in CryptoIdea →" link is a plain `/app` link — the plan (coin, amount, frequency, dates; e.g. 157 weekly buys) isn't carried over, so the learner re-enters every buy by hand.
- **Status:** New — product suggestion, not a defect.
- **Suggested fix:** an optional "Spend (USD)" field in `src/components/AddEntry.jsx` that fills Amount = spend ÷ price (store amount and price as today).

### P04-11 · Medium · Portfolio Pulse states "+0.0% over the last 7 days / 30 days" when it has no history (while the same book is +4.8% in 24h)
- **Steps:** Book = 100% Bitcoin (12 monthly buys). Research → Portfolio Pulse → 24H, then 7D, then 30D.
- **Expected:** With no 7/30-day history, the Pulse says it doesn't know ("— not enough price history yet") or hides those tabs.
- **Actual:** "24H **+4.8%** … Your portfolio is $870, +4.8% over the last 24 hours" but "7D **+0.0%** … +0.0% over the last 7 days" and "30D **+0.0%** … +0.0% over the last 30 days". A week can't be flat when today alone is +4.8%. The "This week" volatility/drawdown line is also missing without explanation. Reproduced 2× (7D, 30D; and again after reload).
- **Control:** the 100% ETH portfolio (real history) shows "7D −12.8%", "30D −31.9%" and the line "This week your value had a typical daily swing of about ±4.0%, and now sits 8% below its 7-day high." — so the 0.0% is the missing-history path, not a flat market.
- **Root cause:** `src/features/research/utils/priceAdapter.js:28` returns `c7d: 0, c30d: 0` when `/api/history` is empty (BTC history is empty here, see P04-09), and `utils/pulse.js` prints it as a real 0% move. CLAUDE.md documents "missing history degrades to 0% — never NaN", which avoids NaN but presents an unknown as a fact (the same honesty rule ADMIN-4 uses: "0%" and "we don't know yet" must never look alike).
- **Status:** New.
- **Suggested fix:** return `null` for `c7d`/`c30d` when history is missing, and have `pulseFacts`/`pulseLines` and the timeframe pill show "—" / "not enough history" for a null timeframe.

### P04-12 · Low · Switching bottom-nav tabs keeps the previous tab's scroll position
- **Steps:** Learn → scroll to the bottom (scrollY 329) → tap Research. Second repro: Learn scrolled (scrollY 231) → tap Portfolio.
- **Expected:** A new tab opens at its top (the Daily Brief / Portfolio value card).
- **Actual:** Research opens at scrollY 329 with the Daily Brief and Pulse headline off-screen; Portfolio opened with the value card hidden under the sticky header. A beginner thinks the Portfolio value card has disappeared.
- **3rd repro:** Research scrolled to 500 → tap Learn → Learn opens at scrollY 319 with the XP/level card hidden.
- **Also:** after Logout the login screen opens at scrollY 174 (carried from the Account screen), so the top of the logo is cut off.
- **Status:** New. (CRYP-102 added `scrollTo(0,0)` for Account drill-ins only.)
- **Suggested fix:** `window.scrollTo(0,0)` when the active bottom-nav tab changes (the tab state in `src/CryptoIdea.jsx`).

### P04-13 · Low · Landing DCA "Price today" is yesterday's history close, not today's price
- **Steps:** `/#dca` → Ethereum → any range ending today.
- **Expected:** "Price today" ≈ the live price the app shows ($1,707.01 at the time).
- **Actual:** "Price today **$1,684**" (the last `/api/history` point, 2026-11-21 00:00 UTC). So the same 0.173278 ETH is worth $291.85 on the landing and $295.79 in the app, −27.0% vs −26.05%. Seen on every ETH run (4×) and for SOL ($70.66 vs app $70.81).
- **Status:** New.
- **Suggested fix:** in `public/landing.js` `calc()`, take `nowP` from the coin-list price already loaded by `/api/coinlist` (it now carries a price), falling back to the last history point; or label it "Last close".

### P04-14 · Low · "1 coins" in Account → Portfolios
- **Steps:** Account → Portfolios with a one-coin portfolio.
- **Actual:** "My Portfolio · **1 coins**". Seen twice (before and after adding a second portfolio).
- **Status:** New (copy).
- **Suggested fix:** pluralise in the Portfolios drill-in in `src/components/Account.jsx` (`n === 1 ? "coin" : "coins"`).

### P04-15 · Low · XP card says "Max level" while the progress bar shows 10% left
- **Steps:** Complete 45 of 50 lessons (2,250 XP).
- **Expected:** One consistent story — either "Max level" with a full bar, or the bar's remaining 10% explained.
- **Actual:** "LEVEL 5 · MASTER ALLOCATOR · **2250 XP · Max level**" above a bar filled to **90%**; Level 5 is reached at 2,000 XP (lesson 40), but the bar is "xp / MAX_XP" (2,500). Also at 1,150 XP the label read "1150 / 1200 XP to Level 4" over a bar at 46%, so the bar never matches the sentence under it. Seen at 45/50 and again at 49/50 ("2450 XP · Max level", bar 98%).
- **Status:** New (UX; R19-8/R20-1 chose the cumulative bar on purpose — flagging the contradiction with the label).
- **Suggested fix:** in `src/components/Learn.jsx`, at max level show "2,250 / 2,500 XP · 5 lessons to finish the library", or make the label describe the bar ("45% of the library").

### P04-16 · Low · After finishing every lesson the app says "keep your streak going", but nothing can extend the streak
- **Steps:** Complete all 50 lessons → Learn shows "ALL CAUGHT UP … More modules are on the way — **keep your streak going**." (Seen twice: right after the last lesson and after a reload.)
- **Expected:** Either reviews count as activity, or the copy doesn't ask for something impossible.
- **Actual:** The copy is shown, but by code a Review can't count: `completeLesson()` in `src/utils/learn.js` returns early for an already-completed lesson, so `streakOn()` is never called — a learner who has finished can only watch the streak break. (Not verifiable live within one day, since a same-day completion doesn't change the streak either.)
- **Status:** New.
- **Suggested fix:** either update `lastActivity`/streak on a correct review (no XP), or change the copy in `Learn.jsx` to "You've finished the library — review any module any time."

**Related code observation (not reproduced live, needs a clock change):** the streak day is `new Date().toISOString().slice(0,10)` in `src/hooks/useLearn.js` (UTC), so for a UTC+2 learner a lesson at 00:30 local counts for the previous day — same class as BUG-024. Also the "🔥 N-day streak" chip only recalculates when a lesson completes, so it keeps showing an old streak after missed days.

### P04-17 · Low · Landing says Learn lessons are "applied immediately to the coins you actually hold"; in the app they are generic
- **Steps:** Landing `#learn` section → read the intro. Then open lessons in the app while holding BTC and ETH (e.g. "Supply is the denominator of every price", "Why GitHub commits matter more than price action").
- **Expected:** Some link from a lesson to my holdings (e.g. "your BTC: market cap …"), as the copy promises.
- **Actual:** Copy: "short lessons — applied immediately to the coins you actually hold." Every lesson body, insight and quiz is static text from `src/data/learn/*.js`; nothing references the learner's coins. Checked in 9 modules / 50 lessons.
- **Status:** New (copy honesty; the landing otherwise works hard to avoid over-claiming — "no AI claims anywhere").
- **Suggested fix:** soften the copy in `index.html` (`#learn` intro) to e.g. "short lessons you can apply to the coins you hold", or add a small "In your portfolio" line to lessons later.

### P04-18 · Medium · Landing DCA race: switching coin while the previous coin's history is loading shows the old coin's numbers under the new coin's name
- **Steps:** Fresh `/#dca`. Pick Ethereum (history now cached in the page). Pick a coin whose history isn't cached yet (Cardano / Litecoin / Polkadot — a cold `/api/history` call), then pick Ethereum again before that call returns (~30 ms here; on the live site a cold history call can take seconds).
- **Expected:** The result is Ethereum's: "2.396499 ETH · Average buy price $2,212 · Price today $1,684".
- **Actual:** Input and result both say "Ethereum (ETH)", but the numbers are the other coin's: "Total accumulated **22,871.586128 ETH** · Average buy price **$0.2317** · Price today $0.1457" (Cardano), "**95.731673 ETH** · $55.36 · $39.82" (Litecoin), "**4,577.528899 ETH** · $1.16 · $0.6598" (Polkadot). Reproduced 3×; no repro for coins whose history returned faster than the switch (Dogecoin, XRP) or was empty (Chainlink).
- **Root cause:** `calc()` in `public/landing.js` doesn't discard stale responses. The cached ETH call resolves first and renders; the slower call resolves later and overwrites the numbers, while the label uses the *current* `sel.name`.
- **Status:** New.
- **Suggested fix:** a request token: `var seq=++calcSeq;` at the top of `calc()` and `if(seq!==calcSeq)return;` inside the `.then`; also render the label from the coin the history belongs to.

### P04-19 · Low · Active portfolio is remembered across a reload but reset to the first portfolio after logout → login
- **Steps:** Select "Weekly ETH plan" → reload → it is still active. Then Account → Logout → log in again.
- **Expected:** The same portfolio as before (or always the first one) — consistently.
- **Actual:** After login "My Portfolio" is active. Reproduced 2×. `src/CryptoIdea.jsx:381` resets `activePortId` to `"default"` on sign-out, then line 244 falls back to `portfolios[0]`.
- **Status:** New — product question (resetting on sign-out may be deliberate session hygiene).
- **Suggested fix:** if the reset is intended, nothing; otherwise persist the last active portfolio id per uid (e.g. in `users/{uid}.settings`) and restore it after sign-in.

### P04-20 · Low · Future-date guard is day-level in UTC: later today is accepted, and the boundary moves with the UTC date
- **Steps:** At 14:13 local (UTC+2), Bitcoin → + Buy → Date & Time **2026-11-22 23:00** → Add Buy. Second repro: **22:00**. Control: **2026-12-01 10:00**.
- **Expected:** "A transaction can't be dated in the future." for all three (the date picker's own `max` is 23:59 today, so the form invites it).
- **Actual:** 23:00 and 22:00 were saved ("Nov 22, 2026 11:00:00 PM", 9 hours ahead; I deleted both afterwards). Dec 1 was refused with the toast. `isFutureTx()` in `src/utils/tx.js:79` compares only the `YYYY-MM-DD` part against `new Date().toISOString()` (UTC), so between 00:00 and 02:00 local a buy dated "today" (local) is also refused as future.
- **Status:** New. Related to **BUG-024** (UTC vs local) and the CRYP-94 future-date rule.
- **Suggested fix:** compare full local timestamps (`new Date(eDate) > new Date()` with a small grace window), and set the picker's `max` to "now" rather than 23:59.

### P04-21 · Medium · Searching "aave" shows 3–4 duplicate Aave rows (duplicate id in `TOP_COINS`), with mock price and two different ranks
- **Steps:** Search tab → type `aave`. Then clear and type `AAV`.
- **Expected:** One Aave row with the live price (`/api/prices?ids=aave` → $98.65, −0.86%, rank #50; `/api/search?q=aave` returns exactly one coin).
- **Actual:** First time **3** rows: "Aave · AAVE · #45 · $105.00 · +2.60%" ×2 and "Aave · AAVE · #74 · $105.00 · +2.60%". After retyping: **4** rows (#45 ×3, #74 ×1) — the ghost rows pile up. Console: React "Encountered two children with the same key … aave" ×5. Reproduced 2×.
- **Root cause:** `src/utils/coins.js` lists `aave` twice in `TOP_COINS` (line 51, rank 45, and line 80, rank 74). `useCoinSearch` (`src/hooks/useCoinSearch.js`) dedupes live results against local ones but not local against local, and `Search.jsx` keys rows by `coin.id`, so React's duplicate-key behaviour duplicates nodes. The price/change shown is the mock (BUG-021).
- **Status:** New.
- **Suggested fix:** remove the duplicate entry in `TOP_COINS` (and add a unit test that `TOP_COINS` ids are unique); dedupe `sr` by id in `useCoinSearch`.

### P04-22 · Low · "Next →" opens the next lesson scrolled to the quiz, not to its title
- **Steps:** Learn → Review a module → answer lesson 1 → Next → answer lesson 2 → Next.
- **Expected:** Each new lesson opens at the top (title and first paragraph), so the learner reads before the quiz.
- **Actual:** The popup body (`.cm-body`) keeps its scroll offset: lesson 2 opened at scrollTop 333 (title at −228 px, off-screen), lesson 3 at scrollTop 398 (title at −293 px). The learner sees the key insight and the quiz first and has to scroll up to read the lesson. Reproduced 2× (desktop, dark mode).
- **Status:** New.
- **Suggested fix:** in `LessonOverlay` (`src/components/Learn.jsx`), reset the modal body scroll in the existing `useEffect(..., [idx])` (e.g. a ref to the body, `scrollTop = 0`), or let `Modal` accept a `scrollKey` prop.

### P04-23 · Low · Landing DCA has no upper bound on the amount and happily reports buying more Bitcoin than will ever exist
- **Steps:** `/#dca` → Bitcoin, Weekly, default range → Amount `99999999999999999`; second repro `1000000000`. (Also `1e3` is accepted as $1,000.)
- **Expected:** A sensible cap (the app caps amounts) or a note that the result ignores market size.
- **Actual:** "Total invested **$15,700,000,000,000,000,000** … Total accumulated **188,943,428,819,020.03 BTC**" and "$157,000,000,000 … **1,889,434.28819 BTC**", with BTC's supply capped at 21M. No message.
- **Status:** New (cosmetic; the more important number problem on this screen is P04-09).
- **Suggested fix:** `public/landing.js` `calc()`: reject amounts above e.g. $1,000,000 per buy with "Enter an amount up to $1,000,000", mirroring the app's TX-SAFE caps; add `max` to `#dcaAmt`.

### P04-24 · Medium · Journal entries and the Learn "Today's lesson" card are click-only `div`s — a keyboard user can't open a thesis
- **Steps:** Journal (ETH thesis present) → press Tab from the top of the page. Second repro: list every focusable element on the Journal screen. Also Learn → "Today's lesson" card.
- **Expected:** Each journal entry (and the Today's lesson card) is a button/link reachable with Tab and opened with Enter.
- **Actual:** Tab order is Resend → Dismiss → Account → coin icon → bottom nav. The `div.j-entry` (and `div.today-lesson`) has `tabIndex -1`, no role, and only an `onClick`. There is no other way to open a thesis, so the "Is your thesis still intact?" review, Edit and Delete are unreachable without a mouse. (Learn has a fallback: the module's "Continue →/Review →" button.)
- **Status:** New. Same family as **BUG-029** (quiz answers as `div`s) and P04-07.
- **Suggested fix:** render the entry as a `<button>` (or add `role="button" tabIndex={0}` + Enter/Space handling) in `src/components/Journal.jsx` (`j-entry`) and on `.today-lesson` in `src/components/Learn.jsx`.

### P04-25 · Medium · On an incomplete thesis, the "Is your thesis still intact?" decision is invisible — even "Reconsidering" still shows a yellow "Incomplete"
- **Steps:** Journal → Ethereum (thesis with only "Why you bought it" filled → 🟡 Incomplete) → open → **Need to research**. Then reopen → **Reconsidering**.
- **Expected:** The list pill reflects the decision (🟡 Review / 🔴 Challenged), or at least the detail shows which decision is current.
- **Actual:** Both times the overlay closes and the list still says "🟡 Incomplete". Reopening shows no current state: "Yes, still holding" is always the primary (filled) button and the other two are always ghost buttons, whatever was chosen. Reproduced 2×. The BTC thesis (complete) did show "🟢 Intact", so it's the Incomplete override.
- **Confirmation:** after filling the second question via Edit → Save changes, the pill switched to "🔴 Challenged" — the Reconsidering decision had been saved all along, just hidden.
- **Root cause:** `src/components/Journal.jsx:359-361` — `isThesisIncomplete(c.journal)` takes precedence over `STATUS[c.journal.status]`; the review buttons (around line 205) are styled statically.
- **Status:** New.
- **Suggested fix:** show the review status pill and the Incomplete nudge side by side (or let a red "Challenged" win over "Incomplete"), and mark the current decision in the overlay (`aria-pressed` + filled style on the chosen button).

### P04-26 · Low · On 360–375 px phones the account avatar overlaps the "STARTER" tag in the Portfolio and Research headers, and "● LIVE" wraps onto two lines
- **Steps:** Portfolio tab in a same-origin iframe at 360 px and 375 px (viewport 357 / 372 px; window resizing has no effect on the maximised window), dark mode.
- **Expected:** Logo + BETA + LIVE + STARTER tags fit beside the avatar, or wrap cleanly.
- **Actual:** Measured: at 360 px the STARTER tag spans x 249–313 and the avatar button x 288–324 (**25 px overlap**); at 375 px STARTER ends at 313, avatar starts at 303 (**10 px overlap**, "STARTE" visible under the "D"). At 390 px it just fits (316 vs 318). The "● LIVE" pill is 34 px tall at all three widths (dot and word on separate lines) vs 20 px for the other tags. Reproduced at 2 widths.
- **Other tabs at 360 px:** **Research** also overlaps (STARTER ends at x 319, avatar starts at 288 — 31 px); Journal clears by 2 px; Learn is fine (270 vs 288).
- **Status:** New (design; the Portfolio header carries the wider logo lockup, Research the extra sticky sub-header).
- **Suggested fix:** in `src/styles/app.css`, give `.ci-app .apphead` right padding equal to the `.avatar-dock` width, add `white-space:nowrap` to the LIVE tag, and let the tag row wrap below the logo under ~400 px (no `@media` needed: `flex-wrap:wrap`).

### P04-27 · Low · Account "Joined" shows the date of the latest login on this device, not the sign-up date
- **Steps:** Account → Plan & billing → "Joined". Logout → login → check again.
- **Expected:** The real sign-up date.
- **Actual:** "Joined **2026-11-22**" both times, but this account already had Learn activity on 2026-11-21 (at session start the chip read "1-day streak · 1 of 50 lessons", and my first completion today made it "2-day", so `lastActivity` was the previous day). Logout clears the cached profile (`ci-profile-<uid>` disappears from localStorage, checked), and on login `src/hooks/useAuthSession.js:92` rebuilds it with `joined: new Date().toISOString().split("T")[0]` — today, in UTC — because the Firestore `joined` Timestamp is deliberately not copied (comment at lines 94–96).
- **Status:** New.
- **Suggested fix:** convert the server `joined` Timestamp to `YYYY-MM-DD` (`server.joined?.toDate?.()`) in `useAuthSession` instead of defaulting to today, or use the Auth `metadata.creationTime`.

### P04-28 · Medium · Plan & billing says "AI research · Live — Research summaries & analysis, included in every plan" while AI is off
- **Steps:** Account → Plan & billing (Starter). Seen twice (before and after reload).
- **Expected:** No AI claim while `aiResearch` is off and `AI_PROXY_LIVE` is false (Research shows the deterministic Overview only; CLAUDE.md C1, and the landing was cleaned of "AI claims anywhere").
- **Actual:** A usage row "AI research | **Live**" with "Research summaries & analysis — included in every plan". The Research tab has no Ask/AI at all in this build.
- **Root cause:** hard-coded in `src/components/Account.jsx:262-265` (C-A4 comment: "everything reads live").
- **Status:** New.
- **Suggested fix:** hide the row unless `site.features.aiResearch === true && AI_PROXY_LIVE`, or rename it "Research summaries · Included" without "AI".

### P04-29 · Low · Risk note calls Solana part of a "$100B+ anchor", and says the anchor is "holding the risk at Low" when the floor only ever caps High
- **Steps:** "Weekly ETH plan" = 92% ETH + 8% SOL (SOL live cap $41.9B, rank #7) → Research → Portfolio risk. Reproduced 2× (before/after reload). Same sentence on the 100% BTC book.
- **Expected:** "$100B+ anchor (92%)" — or wording that matches the rule ("top-10 / $100B+ coins").
- **Actual:** "Top-50 coins are 100% of your book … Your **$100B+ anchor (100%)** is holding the risk at **Low**."
- **Root cause:** `src/features/research/utils/portfolio.js` `isMega` = cap ≥ $100B **or** rank ≤ 10, but `riskNote()` labels the total "$100B+". And the mega floor only lowers a *High* score (`if (megaAlloc >= 40 && score >= HIGH_CUT)`), so at Low it isn't "holding" anything — the book is Low on its own.
- **Status:** New (copy accuracy; related to BUG-036's "concentration doesn't move the meter").
- **Suggested fix:** in `riskNote`, say "Your top-10 / $100B+ coins (100%)…" and only add "is holding the risk at …" when the floor actually changed the level (return a `floored` flag from `deriveRisk`).

### P04-30 · Low · "The Edge" guide gives specific allocation percentages, which the rest of the product deliberately never does
- **Steps:** Landing footer → The Edge (`/edge`) → principle 02. Read twice (desktop, after reload).
- **Expected:** Consistent with "This is for your own reflection — not financial advice. CryptoIdea never tells you what to buy or sell." (Search prompt) and the AI output validator, which blocks allocation advice.
- **Actual:** "Your top conviction? **Maybe 20-30% of your portfolio**. A small-cap bet? **Keep it under 5%**." A beginner reads this as a sizing rule from the app. The same page names a social network ("someone on Twitter mentioned it"), while the landing was scrubbed of company names. There is no "not financial advice" line on the page.
- **Status:** New — content/product question for the founder.
- **Suggested fix:** in `src/components/education-page.jsx:38`, describe sizing as a principle without numbers ("size each position so a 50% drop wouldn't derail you"), change line 33 to "someone online", and add the standard educational disclaimer.

### P04-31 · Low · After a partial sell, Portfolio and Research report two different "down" amounts without saying which is which
- **Steps:** My Portfolio = 12 BTC buys ($1,207.15) + one Sell of 0.005 BTC at $61,012 (avg cost $84,500, so a realised loss of ~$117). Compare the Portfolio header with Research → Pulse. Reproduced 2× (before/after reload).
- **Expected:** Clear labels, e.g. "Total P/L −$337.58 (incl. −$117 realised)" vs "Unrealised: −$220".
- **Actual:** Portfolio header: "INVESTED $1,207.15 · **▼ −$337.58 (-27.96%)**". Pulse: "Against a **$785 cost basis** you're **down $220** (28.1%)." Both are right (total vs unrealised on the remaining coins), but nothing tells a beginner why the same book is "down $338" on one tab and "down $220" on the next.
- **Status:** New (copy clarity).
- **Suggested fix:** in `src/features/research/utils/pulse.js` say "On the coins you still hold (cost $785) you're down $220" and/or add "Realised: −$117" to the header's Invested tile.

### P04-32 · Low · The calculator invites a Daily DCA plan that the app can't hold for a full year (300 transactions per coin)
- **Steps:** `/#dca` → Daily → 1-year range: "Buys made 174" for Jun→Nov alone (a full year = 365–366 buys; the 3-year default is ~1,096). Landing "Usage" and Account → Plan & billing both state "Up to 300 transactions per coin".
- **Expected:** A daily DCA learner can either record the plan or is told up front that daily buys hit the cap after ~10 months.
- **Actual:** Nothing connects the two. "Track this in CryptoIdea →" sends a daily-DCA visitor to an app that will refuse buy #301 for that coin (not exercised to the cap here; 52 ETH buys recorded, pager fine).
- **Status:** New — product question.
- **Suggested fix:** either a note under the Daily option ("Recording daily buys in the app is limited to 300 per coin"), or an aggregated "DCA plan" entry type in the app (one row per month), which also helps P04-10.

### P04-33 · Low · The Learn library never teaches dollar-cost averaging, the landing page's headline tool
- **Steps:** Complete all 9 modules / 50 lessons (done this session); search the lesson content (`src/data/learn/*.js`) for "DCA" / "dollar-cost".
- **Expected:** A DCA beginner — the visitor the free calculator attracts — finds at least one lesson on what DCA does and doesn't do (smoothing entry price, not a guarantee of profit, how it interacts with drawdowns).
- **Actual:** Zero matches; no lesson title touches regular/scheduled buying. The closest is the Research note "Down stretches are when a plan gets tested".
- **Status:** New — content suggestion for the founder.
- **Suggested fix:** add a lesson to "Risk & Position Sizing" or "The Psychology of Conviction" (no-names voice, hand-authored quiz), validated by `tests/unit/learn-content.test.js`; link it from the landing DCA result.

### P04-34 · Low · Landing DCA prints a zero profit as "+$0.00000000"
- **Steps:** `/#dca` → Ethereum → Monthly → 2027-01-01 → 2027-06-01 (any range whose result is exactly break-even; here a future range, see P04-04). Second repro: 2027-02-01 → 2027-03-01.
- **Expected:** "$0.00".
- **Actual:** "Profit / Loss **+$0.00000000**" both times.
- **Root cause:** `money()` in `public/landing.js` uses `toFixed(a<0.0001?8:4)` for any value below $1, so an exact 0 (and any sub-cent profit) gets 8 decimals; the sign is added separately (`profit>=0?'+':''`). Same function behind P03-14's "$0.00000000" micro-cap prices.
- **Status:** New.
- **Suggested fix:** format money with 2 decimals unless the value is a *price* below $1; treat `Math.abs(n) < 0.005` as `$0.00` with no sign.

### P04-35 · Low · Delete warnings claim a thesis exists when the coin has none
- **Steps:** (1) Solana (4 buys, thesis skipped) → Detail → trash → dialog. (2) Earlier: Account → Portfolios → delete "Learning sandbox" (1 coin, Aave, thesis skipped).
- **Expected:** Mention the thesis only when there is one.
- **Actual:** (1) "This coin has 4 buy/sell transactions **and your saved thesis**." (2) "This portfolio has 1 coin and all its transactions **and thesis**." Neither coin had a thesis. (Cancelled (1); (2) was then deleted on purpose.)
- **Root cause:** fixed copy in `src/components/Detail.jsx:157` and `src/components/Account.jsx:106` (R26 made it count-aware for coins, not for theses).
- **Status:** New (copy).
- **Suggested fix:** append the thesis clause only when `coin.journal?.thesis` exists (Detail) / count coins with a journal (Account).

### P04-36 · Medium · A coin with a thesis but no transactions is removed with two taps and its thesis is deleted without any warning
- **Steps:** Search → Trending → **Chainlink** → write a thesis → "Save to Journal & add coin" → Portfolio → Chainlink Detail → trash ("Remove") → tap again. Second repro: same with **Sui**.
- **Expected:** The same warning dialog coins with transactions get ("…you'll lose that data — this can't be undone"), naming the thesis — the thesis is the whole point of the product.
- **Actual:** Only the inline two-tap "Remove" arm; the coin and its thesis vanish (Journal shows only the ETH thesis afterwards). Both times. (For coins *with* transactions the warning appears but over-claims a thesis — P04-35.)
- **Root cause:** `src/components/Detail.jsx` shows the warning modal only when `coin.entries.length > 0` (R4-3); `coin.journal` isn't considered.
- **Status:** New.
- **Suggested fix:** open the warning when `coin.entries.length > 0 || coin.journal?.thesis`, with copy built from what actually exists ("…and your saved thesis" only when there is one).

### P04-37 · Low · Portfolio names can be duplicated, leaving identical pills you can't tell apart
- **Steps:** (1) Portfolio tab → pencil (Rename active portfolio) on "Weekly ETH plan" → "My Portfolio" → Save. (2) Account → Portfolios → New portfolio name "My Portfolio" → + Add.
- **Expected:** "You already have a portfolio called My Portfolio" (case-insensitive), or an automatic "My Portfolio (2)".
- **Actual:** Both accepted: two, then three portfolios named "My Portfolio" (pills "My Portfolio · My Portfolio*"; list "My Portfolio 1 coins | My Portfolio 2 coins | My Portfolio 0 coins · Active"). Afterwards I removed the empty one and renamed the ETH portfolio back.
- **Status:** New.
- **Suggested fix:** reject duplicates (trimmed, case-insensitive) in the add/rename handlers in `src/CryptoIdea.jsx` (`addPortfolio`, `updatePortfolioName` path) with a toast.

### P04-38 · Low · Browser/phone Back with a popup open leaves the app instead of closing the popup
- **Steps:** (1) Landing → `/app` → open the Bitcoin Detail → browser Back. (2) `/app` → Learn → open a lesson → Back.
- **Expected:** Back closes the popup (the habit on phones, where there is no Escape — see P04-02).
- **Actual:** (1) Back went to the landing page `/`. (2) Back went to the previous `/app` history entry, reloading the app on the Portfolio tab with the lesson gone. The app pushes no history entries for tabs or popups.
- **Status:** New (UX; relevant to the mobile Detail/AddEntry popups and lessons).
- **Suggested fix:** push a history state when a `Modal` opens and close it on `popstate` (and pop the state on normal close) in `src/components/Modal.jsx`.

### P04-39 · Medium · A comma decimal in the Buy amount is silently dropped: "0,5" ETH becomes 5 ETH, "1,25" becomes 125
- **Steps:** Weekly ETH plan → Ethereum → + Buy → Amount: type `0,5`. Second repro: `1,25`. (Not saved.)
- **Expected:** "0,5" read as 0.5, or a clear "use a dot for decimals" message.
- **Actual:** The field shows "05" with "Total cost **$9,500.00**", then "125" with "Total cost **$237,500.00**" (at the 1,900 pre-fill), and **Add Buy stays enabled** — one tap records 10× / 100× the intended position. Many European keyboards and locales write decimals with a comma. **Landing calculator too:** typing `50,5` in "Amount each time" gives the value "505" and "Total invested $79,285" (157 weekly buys) with no message.
- **Root cause:** `sanitizeDecimal()` in `src/utils/format.js:20` keeps digits and the first `.` and drops every other character, including `,`.
- **Status:** New.
- **Suggested fix:** treat a single `,` as the decimal separator when there is no `.` (`str.replace(',', '.')` before filtering), and add a unit test for "0,5" → "0.5".

## Known bugs re-checked
| Bug | Result | Evidence (this session) |
|---|---|---|
| BUG-021 Search shows mock prices / thesis saves them | **Still present** | Search `solana` → "$125.00 +3.20% · #5" vs live $70.63 / +2.82% / #7; `aave` → "$105.00 +2.60%" vs live $98.65 / −0.86% (see P04-21). Thesis written in the Search prompt for BTC and for Chainlink (both picked from Trending) shows **no price** in its header (2 repros) (`priceAtAdd: coin.mockPrice \|\| 0` → 0 for a Trending item), while the ETH thesis added later from the Journal shows the live "$1,708.92" |
| BUG-022 Empty holding shows green "+$0.00" | **Still present** | Empty ETH Detail: "Total P/L +$0.00 (+0.00%)"; empty portfolio header "24H +0.00%" in green (3 portfolios) |
| BUG-023 AUTO buy price pre-fills the mock price | **Still present** | BTC Buy pre-filled 84000.00 (live $60,906); ETH Buy 1900.00 ×8 (live $1,707); AAVE Buy 105.00 (live $98.65); SOL Buy 125.00 ×4 (live $70.81); **Sell** form also pre-fills 84000.00 and says "Suggested price: $84,000.00 · tap AUTO" at today's date (live $61,012) |
| BUG-024 Transaction time recorded in UTC | **Still present** | At 13:52 local the Date & Time field read 11:52; a "now" Sell at 14:03 local saved as "Nov 22, 2026 12:03:00 PM" |
| BUG-025 AUTO estimate labelled as market price | **Still present** | BTC AUTO = $84,000 for every date Dec 2025 → Nov 2026 with "Using the market price for this date" (see P04-09). ETH AUTO matched real history exactly (8/8 dates) |
| BUG-026 Mixed minus signs in P/L | **Still present** | "−$329.915 (-27.49%)", header "▼ −$329.09 (-27.42%)" |
| BUG-027 Escape doesn't close the coin Detail popup | **Still present — wider** | Detail, lesson and Journal popups all ignore Escape; `Modal.jsx` has no Escape handler (P04-02) |
| BUG-028 Learn modules 2–9 locked despite "all 9 open" | **Still present** | New account state: modules 2–9 padlocked; unlock only one at a time; landing Usage still says "All 9 Learn modules, fully open" |
| BUG-029 Quiz answers not exposed as controls | **Still present** | `.quiz-opt` are `div`s, `tabIndex -1`, no role; not in the accessibility tree |
| BUG-030 Wrong quiz answer stays highlighted green | **Still present** | 5 repros: desktop light ×2, mobile 390 px, mobile 360 px light, dark mode — chosen wrong option green (`rgb(233,242,237)` bg, `rgb(10,107,77)` border) beside the red "Not quite" |
| BUG-031 Name field strips accents/apostrophes/hyphens | **Still present** | Typing "Dana O'Brien-Lévy" gives "Dana OBrienLvy" (not saved) |
| BUG-032 Upsell to a plan that can't be bought | **Still present** | 4th portfolio → toast "Starter: 3 portfolios — upgrade to Pro for 6", while the landing says "No payment, no card, no upsell" |
| BUG-033 Oversized "Security & payment emails" text | **Still present** | That line is 16px; sibling hints 11px/13px |
| BUG-036 100% single-token book rated Low | Still present (BTC case) | 100% BTC: "High concentration" chip but risk "Low" and Pulse "reads as Low risk"; concentration doesn't move the meter |
| BUG-037 Stress test "higher-beta amplify" at exactly ±50% | **Still present** | 100% BTC: −50% → "$435 (−50.0%). Your higher-beta holdings amplify the swing."; same at +50% |
| BUG-038 Daily Brief always ▲ | **Still present** | 100% AAVE book (−0.86% 24h): green "▲ Portfolio is down $1 (−0.9%)" (class `brief-ic ic-up`), 2× (before/after reload). The second line correctly uses ▾ |
| BUG-019 Oversell and P&L integrity | Appears fixed | Editing the earliest SOL Buy into a Sell is refused: "Can't save — a sell on 2026-10-29 would exceed your holdings…"; future-month Buy refused |
| BUG-020, 034, 035, 039 | Not reached | No sign-up, no account deletion, no admin |


## What worked well
- **Quiz-gated lessons are honest:** a wrong answer never completes a lesson, XP is never double-counted on Review, and progress (XP, level, 50/50, streak) survived reloads and three logout/login cycles.
- **Resume points are right:** closing mid-module and coming back lands on the first unfinished lesson; Review starts at lesson 1; double-clicking Next can't skip a lesson.
- **With real history the calculator and the app agree:** 8 weekly $50 ETH buys gave the same 0.173278 ETH and $2,308 average in both, and 4 weekly $50 SOL buys the same 2.292559 SOL and $87.24 average — and every ETH/SOL AUTO price matched `/api/history` to the cent.
- **Guards behave:** switching the earliest SOL Buy to a Sell is refused ("a sell on 2026-10-29 would exceed your holdings" — BUG-019 stays fixed); future-month buys refused with a clear message; blank portfolio names refused; weak passwords refused before any network call; the 3-portfolio cap holds; the transaction pager handles 52 rows cleanly.
- **Delete flows are safe:** two-step transaction delete with auto-disarm; count-aware portfolio delete dialog with Cancel.
- **Research notes adapt to the book:** the note changed from "Everything you hold is in a single coin…" to "Your portfolio is below what you put in. Down stretches are when a plan gets tested…" — exactly the right message for a DCA beginner in a drawdown.
- **Dark mode and phone widths** were readable throughout, apart from the header overlap in P04-26.

## Timeline
- 13:45 — Start. Health check: :3000/app 200, :5001 responds (404 = up). Browser was still signed in as persona 03 → logged out, logged in as p04 (account existed: "Dana DCA", 1 lesson done, empty portfolio).
- 13:46 — Learn: module 1 lesson 2 wrong→right (BUG-030), Previous, Escape, focus leak (P04-01/02). Finished modules 1–2 (Level 2).
- 13:49 — Landing DCA: BTC default (estimate), Monthly, ETH month-end/future/invalid inputs (P04-03…05), DST and keyboard picker (P04-06/07).
- 13:52 — App: added BTC + thesis, 12 monthly $100 buys at AUTO $84,000 (P04-08/09/10). Research Pulse 7D/30D 0% (P04-11), stress test BUG-037.
- 13:56 — Reload, Journal, mobile 390 px iframe and dark mode on Learn. Modules 3–4 → Level 3.
- 13:58 — New portfolio "Weekly ETH plan", 8 weekly $50 ETH buys at real AUTO prices; matched against the landing calculator (P04-06 3rd repro, P04-13). Tab scroll (P04-12), "1 coins" (P04-14).
- 14:01 — Modules 5–9 → 50/50 lessons, Level 5, "All caught up" (P04-15/16).
- 14:03 — Account: BUG-031, BUG-033, BUG-032 (3rd portfolio "Learning sandbox", 4th refused).
- 14:04 — Edited the Dec 1 BTC buy to $90,000; partial Sell 0.005 BTC at live $61,012 (BUG-023 Sell side, BUG-024); Escape on Detail (BUG-027).
- 14:06 — Back/forward, empty-portfolio Research, landing at 375 px.
- 14:07 — Backfilled 44 more weekly ETH buys (52 tx) → pager 50/page + page 2 OK; Pulse control for P04-11.
- 14:10 — Landing coin-switch race (P04-18, 3 repros). Search/CoinInfo for SOL (BUG-021, P03-03). ETH thesis added later (Incomplete).
- 14:13 — Logout/login ×2: data, Learn progress and dark theme persist; active portfolio resets (P04-19); login screen scrolled (P04-12).
- 14:13 — Buy-form date edges: future month refused; later-today accepted (P04-20). Test rows deleted with the two-step delete.
- 14:15 — AAVE in "Learning sandbox": duplicate search rows (P04-21); BUG-038 reached and confirmed.
- 14:16 — CoinInfo Unrealised P/L 3 decimals (P04-08); double-click Next (no skip); lesson scroll offset (P04-22).
- 14:18 — Landing amount edges (P04-23). Journal keyboard (P04-24), review decision hidden by Incomplete (P04-25).
- 14:20 — 360/375 px header overlap (P04-26); mobile Add transaction screen; Plan & billing "Joined" and "AI research · Live" (P04-27/28).
- 14:23 — Deleted "Learning sandbox" (Cancel, Escape, then Delete anyway); Security weak-password validation OK.
- 14:24 — Added SOL (4 weekly buys) to the ETH plan: risk note (P04-29), stress test ±50.4%, notes rotate. Blank rename refused. Email banner dismiss lasts until reload.
- 14:26 — `/edge` guide (P04-30); landing 375 px menu OK; Pulse vs header after a sell (P04-31); theme System → Light restored; P04-01 re-verified in light mode.
- 14:29 — SOL cross-check in the calculator (match), 360 px lesson (light), Learn has no DCA lesson (P04-33), daily-DCA vs 300-tx cap (P04-32).
- 14:31 — Calculator: 2019 start clamp, fully-future range, "+$0.00000000" (P04-34). Delete-coin warning copy (P04-35). Oversell guard on edit OK.
- 14:33 — SOL thesis add + delete OK; Chainlink and Sui added from Trending with theses and removed — theses lost silently (P04-36).
- 14:35 — Duplicate portfolio names (P04-37); cleanup (empty duplicate removed, "Weekly ETH plan" name restored).
- 14:36 — Reload: Learn 50/50 persists, console clean. Back button with Detail / lesson open leaves the view (P04-38).
- 14:37 — Research note switches correctly between the 1-coin BTC book and the ETH+SOL book; P04-03 third repro on DOGE. Wrap-up.
- 14:38 — Comma-decimal amounts (P04-39, not saved); 360 px header check on Research/Journal/Learn (P04-26).
- 14:39 — Landing comma amount (P04-39), Daily 3-year run (P04-06 4th repro), console clean. 14:40 — closed my tab; report complete.
