# Persona 06 — Conservative holder · 1-hour test · 2026-11-22
Status: Complete | Account: p06.conservative@test.com | Start 15:37 / end 16:33 (local, UTC+2) | Minutes tested: 55

## Persona
"Connie Conservative": a cautious, wealthy holder who keeps most of the book in dollar stablecoins (USDT, USDC) and blue chips (BTC, ETH), with $50k–$1M+ per position. She wants exact big numbers she can trust to the cent, an honest risk read that understands "cash" is not "concentration risk", a clear view of what she has actually lost or gained, and limits that are stated up front. She doesn't trade often, but when she corrects a record it has to stay corrected.

## Data created
The account already existed (no registration needed) with one earlier transaction (BUY 20,000 USDT @ $1.00, Nov 21 17:21). A previous persona's session was still signed in in this browser, so I logged that out first.

| Portfolio | Coin | Transactions (as recorded) | Notes |
|---|---|---|---|
| My Portfolio | Tether (USDT) | BUY 20,000 @ $1.00, edited to $0.9990 (Nov 21) · BUY 980,000 @ $1.00 (AUTO mock), edited to $0.9988 (Nov 22, shown 13:38 for 15:38 local) | Thesis added from Journal, marked Reconsidering, then deleted |
| My Portfolio | Ethereum (ETH) | BUY 300 @ $1,707.01 · BUY 29.35 @ $1,701.55 · SELL 100 @ $1,704.44 (all Nov 22) | Thesis via Search prompt (recorded "$1,900.00") |
| My Portfolio | Bitcoin (BTC) | BUY 8 @ $71,149.28 (2026-03-15) · BUY 0.825 @ $60,606 · SELL 8.825 @ $60,606 | Sold to zero, realised −$84,346.24 |
| My Portfolio | USDC | BUY 500,000 @ $1.00 (2026-06-01) · SELL 500,000 @ $1.00 | Thesis saved; coin deleted (warning shown) |
| Treasury, renamed "Long-term conservative stablecoin treasury reserve" (50-char cap) | USDC | BUY 250,000 @ $0.9995 · SELL 100,000 @ $0.9995 · BUY 999,999,999,999,999 @ $1.00 (deleted again) | Delete-portfolio confirm opened, then cancelled |
| Cold storage (deleted) | Tether, then 30 coins | BUY 1,000,000,000 USDT @ $0.9989 (coin deleted); later 30 coins with no tx, to hit the cap | Portfolio deleted at the end |
| Duplicate "My Portfolio" (removed) | — | — | Created to test duplicate names, removed with the Remove pill |

End state: My Portfolio $1,390,094.35 (USDT 1,000,000 · ETH 229.35 · BTC 0), INVESTED $2,180,041.68; Treasury $149,916.75 (150,000 USDC). Display name unchanged ("Connie Conservative"). Appearance set back to Light.

## Coverage
| Area | Result |
|---|---|
| Login (existing account), logout → login ×2 | Pass. Form clears on Logout. Active portfolio resets to the first (P06-27) |
| Big-number entry and formatting ($50k → $1B → 1e15) on value card, cards, Detail | Pass on desktop. Phone overflow (P06-22). 3-decimal $ (P06-18). Silent 15-digit cut (P06-34) |
| AUTO price for BTC, ETH, USDT, USDC (buy and sell, today and back-dated) | **Fail**: mock prices (P06-01, P06-08, P06-21) |
| Value card (INVESTED, P/L %, 24H, ASSETS) | Math checked by hand: consistent. Denominator issue (P06-12). Green 0.00% (P06-14). Mixed minus (P06-24) |
| Risk meter, Allocation, Pulse, Daily Brief, Stress test | **Fail** for a stablecoin book (P06-05, P06-06, P06-07, P06-16, P06-19, P06-20) |
| Sell to zero + empty-holding P/L (BUG-022) | Partially fixed (P06-14). Closed coin stays "held" in Research (P06-19) |
| Delete coin with transactions (warning) | Pass: warning shows the tx count. Wrong "saved thesis" claim (P06-09) |
| Delete / rename / add portfolio, limits 3 / 30 / 300 | Limits shown = enforced (3 portfolios and 30 coins tested to the cap). Upsell toast (P06-13, P06-33). Duplicate names (P06-38) |
| Account: Plan & billing, Profile, Security, Privacy, Appearance | Shown limits match the landing. "AI research Live" (P06-15). Name strip (P06-25). Oversized Privacy line (BUG-033) |
| Edit transaction, then trade another coin | **Fail**: edit reverts on screen (P06-17). Date-only edit overwrites the price (P06-36) |
| Oversell / back-dated / future-dated / delete-dependency guards | Pass (BUG-019 still fixed) |
| Journal: thesis via Search and via Journal, review status, delete thesis, HTML escaping | Escaping OK. Mock thesis price (P06-11). Status highlight wrong (P06-28). Findings wiped (P06-39) |
| CoinInfo (held ETH, USDT; non-held DAI) | Mock data (P06-31, P06-35) |
| Learn (locks, quiz) | BUG-028, BUG-029, BUG-030 still present |
| Landing: Usage section vs app, DCA calculator at $50k/month | Usage limits match. DCA shows invented profits (P06-37) |
| Mobile (375 / 360 / 390 px via same-origin iframes; the maximized window couldn't be resized) | Value-card overflow, header badges overlap. Detail and Research otherwise fine |
| Dark mode (Portfolio, Detail, Research, Account, Privacy) and System/Light | Readable apart from BUG-033 |
| Keyboard: Escape on Detail, delete-confirm, Thesis breakdown, Buy form | **Fail** on all 4 (P06-04 / P06-10, root cause found) |
| Console | No app errors or warnings (only a browser-extension's own errors) |

## Findings
Each finding was reproduced at least twice unless it says otherwise. Repeats name the earlier id. Notes and re-check blocks sit between the numbered findings, in the order they were found.


> Note: the account already existed (no registration needed) and already held one transaction: BUY 20,000 USDT @ $1.00 on Nov 21, 2026 05:21 PM (from an earlier session). It was kept and built on.

### P06-01 · High · Repeat of BUG-023 (still open) + P01-01: a $569k Bitcoin buy would have been recorded at the mock $84,000, for every date
- **Steps:** Portfolio → add Bitcoin (Skip thesis) → open the Bitcoin card → + Buy. Amount 8. Change Date to 2026-03-15 10:00.
- **Expected:** AUTO price = BTC's real price that day ($71,149.28 per `/api/history?id=bitcoin`) or today's live $60,816.
- **Actual:** AUTO shows **84000.00** on open and keeps 84000.00 after the date change; "Total cost $672,000.00". After typing the real price the hint still says "Suggested price: $84,000.00 · tap AUTO to use". A conservative holder trusting AUTO would book a **$102,806 too-high cost basis** on one buy. Reproduced 3× (open form, after waiting 5 s, after date change).
- **Root cause seen:** the browser holds a cached **empty** `/api/history?id=bitcoin` (and `?id=tether`) response (`prices: []`, `cache-control: public, max-age=86400`), while the server now returns 366 points. So AUTO falls back to the `TOP_COINS` mock price (`src/hooks/useLivePrices.js` seeding, BUG-023).
- **Repeat of:** BUG-023 (still open) and P01-01 / P02-01 / P05-01 (empty history cached 24 h).
- **Suggested fix:** as BUG-023: never seed or suggest `mockPrice`; leave the price empty with "no price available — enter it" when no real quote exists. Server: send `Cache-Control: no-store` (or a short max-age) when the history array is empty (`functions/index.js` `/api/history`).

### P06-02 · Medium · Repeat of BUG-024 (still open): the Buy form's "now" is 2 hours behind
- **Steps:** At 15:38 local (UTC+2) open + Buy on Tether.
- **Actual:** Date & Time field shows 13:38; the saved row reads "Nov 22, 2026 01:38:00 PM". Seen on USDT (15:38), USDC (15:39) and BTC (15:40).
- **Repeat of:** BUG-024, still open.

### P06-03 · Low · Repeat of BUG-022 (still open): empty USDC holding shows green "+$0.00 (+0.00%)"
- **Steps:** Add USDC (with thesis), open its card before any buy.
- **Actual:** Detail "Total P/L +$0.00 (+0.00%)" in green (`.pnl-val` rgb(7,80,58) on green tint rgb(233,242,237)). Card pill "-0.00%" red for USDC (a 24h move of −0.00056%), "+0.00%" green for Tether.
- **Repeat of:** BUG-022 (still open); the "−0.00%" pill is P05-26.

### P06-04 · Medium · Repeat of BUG-027 (still open): Escape doesn't close the coin Detail popup
- **Steps:** Open the Tether card (Detail), press Escape.
- **Actual:** Popup stays open; only X closes it.

### P06-05 · High · Stress test: a book that is 60% stablecoins "loses 60.9%" in a 50% market drop and "gains 60.9%" in a 50% rise
- **Book:** USDT $998,836 (40%) · ETH $512,103 (21%) · USDC $499,702 (20%) · BTC $486,528 (19%) = $2,497,170.
- **Steps:** Research → Overview → Stress test slider to −50%, then +50%, then −20%.
- **Expected:** dollar stablecoins stay near $1 in a market move, so a 60%-stable book moves roughly 40% × the market (about −20% at −50%). It must never move *more* than the market.
- **Actual:** −50% → "$977.1K (−60.9%) … Your higher-beta holdings amplify the swing"; +50% → "$4.0M (+60.9%)" (the model has $1.5M of stablecoins gaining 50%+); −20% → "$1.9M (−24.3%)". Reproduced 3× and verified by hand: 0.40×1.0 + 0.205×1.1 + 0.20×1.4 + 0.195×1.6 = 1.2175 → ±60.9%.
- **Root cause:** `src/features/research/utils/portfolio.js:28,131` assigns beta by **position-size order** (`BETA_BY_RANK = [1.0, 1.1, 1.4, 1.6, 1.8]`): the biggest holding gets 1.0, smaller ones get more. Here USDC (a dollar) gets beta 1.4 and Bitcoin, the smallest, gets 1.6, the highest. The footnote says "scaled by its typical volatility", which the code doesn't do.
- **Repeat of:** P05-24 (66% USDC book) and P03-09 (beta by size order). Still open, and this book shows the worst case: the most conservative book gets the scariest number.
- **Suggested fix:** give each coin its own beta (stablecoins ≈ 0, from a stablecoin list or the 30-day volatility of the cached history, with a rank fallback), not its position in the list. Show "amplify" copy only when |changePct| > |move|, and "cushion" copy when it is smaller (see BUG-037).

### P06-06 · Low · Pulse calls a 60%-stablecoin, 4-coin book "concentrated" in the same paragraph that rates it Low risk
- **Steps:** Research → Overview → Portfolio Pulse (24H, 7D, 30D all show it). Also the "A note on your portfolio" card.
- **Actual:** "Your top two — Tether and Ethereum — make up 61% of the book; by size, your 4 coins act like about 3.6 equal-weight positions. Overall this book reads as Low risk. That's a concentrated book — spreading across more assets is one way to lower single-coin risk." The note card says the same ("Spreading across more assets…").
- **Why it's wrong for this user:** 3.6 effective positions out of 4 is close to perfectly even, and the largest position is dollar cash (USDT). For a stablecoin holder "single-coin risk" on Tether is a depeg risk, which more coins does not fix.
- **Root cause:** `src/features/research/utils/pulse.js:214-216` fires `facts.diversify` on top-two > 60% only, regardless of effective N or stablecoins.
- **Repeat of:** P05-27 (2- and 3-coin balanced books), extended here to a 4-coin book. Still open.
- **Suggested fix:** require low effective-N too (e.g. top-two > 60% AND effective N < 2.5), and leave stablecoins out of the concentration rule or give them their own line ("60% of the book is in stablecoins").

### P06-07 · Low · Risk card: "Your $100B+ anchor (100%)" counts USDC ($68.4B cap) as $100B+
- **Steps:** Research → Portfolio Risk card.
- **Actual:** "Top-50 coins are 100% of your book… Your $100B+ anchor (100%) is holding the risk at Low." Caps from `/api/prices`: BTC $1.22T, ETH $208.7B, USDT $174.6B, **USDC $68.4B**, so the $100B+ part is 80%.
- **Root cause:** `src/features/research/utils/portfolio.js:61,84` `isMega` = cap ≥ $100B **or rank ≤ 10**; USDC is rank 5. The copy names only the cap.
- **Repeat of:** P05-25 (still open). The "holding the risk at Low" part is P04-29 (the floor only caps High).
- **Suggested fix:** say "top-10 / $100B+ anchor", or count only cap ≥ $100B in the copy.

### P06-08 · Medium · Stablecoin buys/sells are pre-filled at the mock $1.00, so a $1M USDT buy shows a −$1,164 loss from the first second
- **Steps:** Tether card → + Buy (opened 15:38); USDC card → + Buy; USDC card → − Sell (15:44). Read the AUTO price.
- **Expected:** today's market price, which the app itself shows on the card: USDT $0.9988, USDC $0.9994; the cached USDC history for 2026-11-22 is 0.99930.
- **Actual:** AUTO shows **1.00** each time (3 of 3). `fmtPriceInput` (`src/utils/format.js:10`) would print a 0.9993 quote as "0.999300", so "1.00" is the `TOP_COINS` mock price, not a market quote (same seam as BUG-023). Result: the 1,000,000 USDT position shows "Total P/L −$1,164.00" and the value card shows a loss straight after the buy. The 500k USDC round trip shows exactly $0 because both legs were recorded at the mock $1.00 (real legs: 1.00017 on Jun 1, 0.99930 today, about −$435).
- **Also:** `fmtPriceInput` rounds any price ≥ $1 to **cents**, so a $1.0024 stablecoin quote (USDC's 365-day max in the history) becomes $1.00. At $1M that is a $2,400 cost-basis error. Stablecoins need 4 decimals.
- **Repeat of:** BUG-023 (still open), new surface: stablecoins, where the mock looks "right" and nobody would notice.
- **Suggested fix:** BUG-023's fix (no mock seed). In `fmtPriceInput`, keep 4 decimals for prices between $0.90 and $1.10 (or 4 significant decimals below $10).

### P06-09 · Low · Repeat of P01-11 / P03-29 / P04-35 (still open): delete warning says "and your saved thesis" for Bitcoin, which has no thesis
- **Steps:** Bitcoin (added with **Skip for now**, 1 tx) → Detail → trash icon.
- **Actual:** "This coin has 1 buy/sell transaction and your saved thesis…". The Journal lists Bitcoin under "Needs a thesis". The trash button still has no accessible name (empty `button.icon-btn`). USDC (2 tx + a real thesis) gets the same, correct, text. Reproduced on BTC 1× and USDC 2× (for comparison).

### P06-10 · Medium · BUG-027 root cause: `Modal` has no Escape handler, so no popup closes with Escape
- **Steps:** (a) Tether Detail → Escape. (b) USDC Detail → trash → "Delete USDC?" confirm → Escape.
- **Actual:** neither closes (2 of 2). Reading `src/components/Modal.jsx`: the only `keydown` listener is the opt-in Tab focus trap (lines 25–34). There is no Escape branch, and the X is a `div role="button"` with no `tabIndex`, so keyboard users can't reach it either.
- **Repeat of:** BUG-027 (still open), root cause now known.
- **Suggested fix:** in `Modal`, add a document-level `keydown` listener that calls `onClose` on Escape when `!hideClose`. Make the X a real `<button type="button" aria-label="Close">`. Add a unit test in the existing Modal tests.

### P06-11 · High · Repeat of BUG-021 (still open): the ETH thesis records $1,900 while the buy was at $1,707.01
- **Steps:** Search "eth" → list shows "Ethereum $1,900.00" (live `/api/prices` $1,707.01) → + Add → write thesis → Save. Journal → Ethereum.
- **Actual:** "Thesis written Nov 22, 2026 · $1,900.00". Search also listed USDC at "$1.00" against a live $0.9994.

### P06-12 · Medium · Repeat of P01-03 (still open): deleting a closed, zero-P/L coin changes the headline loss from −3.26% to −4.05%
- **Steps:** Buy 500,000 USDC @ $1.00 (Jun 1) → sell 500,000 @ $1.00 (today) → look at the value card → delete the USDC coin → look again.
- **Before delete:** "$1,997,108.00 ▼ −$84,189.24 (-3.26%) · INVESTED $2,581,297.24 · ASSETS 4" (USDC is 0 USDC, still counted, see P05-33).
- **After delete:** "$1,997,108.00 ▼ −$84,189.24 (-4.05%) · INVESTED $2,081,297.24 · ASSETS 3".
- **Why it matters:** the dollar P/L is identical, yet the % moved by 0.8 points and "Invested" by $500k because a $500k cash round trip (in and out at the same price) counts as invested. A conservative holder who parks cash in and out of stablecoins sees "Invested" grow with every round trip and the % loss shrink, and can change the headline % just by deleting history.
- **Suggested fix:** product decision, already open as P01-03 / P03-25: use net invested (buys − sell proceeds, floored at 0) or the cost basis of open positions as the denominator, and label it.

### P06-13 · Medium · Repeat of BUG-032 (still open): the 4th-portfolio toast offers a Pro upgrade that cannot be bought
- **Steps:** Account → Portfolios → add "Cold storage", "Treasury" (3/3) → type "Fourth" → + Add (twice, 7 s apart).
- **Actual:** "Starter: 3 portfolios — upgrade to Pro for 6" both times. Plan & billing has no upgrade control (paid plans off). The **+ Add** button stays enabled at 3/3, so the user only learns about the limit after trying.
- **Suggested fix:** BUG-032's fix (gate the upsell on `paidPlansEnabled`; say "Starter allows 3 portfolios"). Also disable + Add with a "3/3 used" hint.

### P06-14 · Low · Partial repeat of BUG-022: the empty-book P/L is now neutral, but the 24H cell and the empty-coin Detail are still green
- **Empty "Treasury" portfolio:** value card shows "$0.00 / —" (neutral, as intended), but **24H "+0.00%" in green** (rgb(31,157,85)).
- **Closed USDC holding (0 USDC after selling 500k):** Detail "Total P/L **+$0.00 (+0.00%)**" green on a green row (`.pnl-val` rgb(7,80,58)). Same for the never-bought USDC (P06-03). Reproduced 2× (before the first buy, after the sell-to-zero).
- **Status of BUG-022:** value-card P/L appears fixed; the 24H cell and Detail P/L are still present.
- **Suggested fix:** route the 24H cell and `Detail` Total P/L through the same "no data → muted —" path as the value-card P/L (`src/components/Portfolio.jsx`, `src/components/Detail.jsx`).

### P06-15 · Medium · Repeat of P01-14 / P02-19 (still open): Plan & billing says "AI research · Live" while AI is off
- Plan & billing: "Total transactions 4 / 27,000 · Up to 300 per coin · **AI research Live** — Research summaries & analysis — included in every plan · Joined 2026-11-22". The Research tab shows no Ask/Coins (AI off).
- The limits shown (3 portfolios, 30 coins, 300 tx/coin → 27,000) match the landing's "Usage" section and the enforced portfolio cap (P06-13).

### P06-16 · Low · Allocation card flags "High concentration" (red badge) on a book that is 50% Tether, beside a "Low" risk meter
- **Steps:** with USDT 1,000,000 · ETH 300 · BTC 8 (USDT = 50.1%), open Research → Overview (light and dark).
- **Actual:** the Allocation header shows a red-tinted **"High concentration"** pill, the Risk meter directly below says **Low**, and the Pulse adds "That's a concentrated book… lower single-coin risk" (top two = 76%, 2.7 equal-weight positions). With USDT at 40% (before USDC was deleted) the badge was absent, so it switches on at exactly > 50% of any coin, stablecoins included.
- **Root cause:** `src/features/research/components/AllocationBar.jsx:13` `holdings[0].alloc > 50`, with no stablecoin awareness.
- **Suggested fix:** same as P06-06: exclude stablecoins from concentration flags, or reword to "50% in one stablecoin". Two different concentration rules (top-1 > 50% here, top-2 > 60% in the Pulse) should share one helper.

### Mobile and dark-mode checks
- **375 px / 360 px (same-origin iframes; the maximized window can't be resized):** the 7-figure value card overflows. At 360 px "ASSETS / 3" ends at x=338 while the card's right edge is 325, and the page scrolls sideways (scrollWidth 356 > clientWidth 343). At 375 px "ASSETS" touches the card border (inner padding edge 320, text ends 338). **Repeat of P03-16 (still open).** "● LIVE" wraps onto two lines and STARTER runs under the avatar: **repeat of P03-11 / P04-26.** The Detail sheet at 375 px renders the $569,194.24 / $71,149.28 rows cleanly.
- **Dark mode:** Account, Privacy & data, Research Overview and Stress test are readable. The Privacy card's "Security & payment emails are always sent…" line is still oversized: **repeat of BUG-033 (still open).**

### P06-17 · High · Repeat of P01-02 / P05-19 (still open): a corrected cost basis on the $1M USDT position reverts on screen after any trade on another coin
- **Steps (run 1):** Tether → tap the "BUY 980,000 USDT" row → Edit → price 1 → **0.9988** → Save Changes. Detail shows "$978,824.00 · $0.9988 / USDT", P/L +$90.00; value card INVESTED $2,080,121.24, P/L −$85,894.24. Then Ethereum → + Buy 29.35 ETH @ 1,701.55 → Add Buy. Reopen Tether.
- **Actual:** the row is back to "$980,000.00 · $1.00 / USDT", P/L −$1,086.00, value card INVESTED $2,131,237.73 (= the **old** $2,081,297.24 + $49,940.49). After a page reload it shows the saved $0.9988 again (INVESTED $2,130,061.73), so the save worked and only the screen is stale.
- **Run 2:** edit "BUY 20,000 USDT" to **0.9990** (shows $19,980.00) → Bitcoin + Buy 0.825 BTC @ 60,606 → reopen Tether → the row reads "$20,000.00 · $1.00 / USDT" again. Reproduced 2 of 2.
- **Why it matters for this persona:** someone correcting a seven-figure cost basis, who then records a different trade, is shown the old numbers and may "fix" them again or trust the wrong P/L.
- **Suggested fix:** see P01-02. A coin-doc change re-reads only that coin's transactions (`watchCoins`, `src/api/firebase-database.js`), and other coins' locally edited entries appear to be rebuilt from a stale snapshot. Read the edited coin's transactions from the watcher, not from the pre-edit array, and add a unit test: edit tx on coin A → add tx on coin B → coin A keeps the edit.

### P06-18 · Medium · Repeat of P01-08 / P02-13 / P05-05 (still open): "Bought 329.35 ETH · $562,043.493" (three decimals)
- **Steps:** ETH: BUY 300 @ $1,707.01 + BUY 29.35 @ $1,701.55 → open the Ethereum Detail.
- **Actual:** "Bought 329.35 ETH · **$562,043.493**", while the rows show "$512,103.00" and "$49,940.49" (the exact sum is 562,043.4925). Seen twice (after the ETH buy, and again after reopening).

### P06-19 · Medium · After selling all Bitcoin, Research still treats Bitcoin as held (float dust), and the Daily Brief names it "Today's biggest gainer"
- **Steps:** Bitcoin: BUY 8 @ $71,149.28 (Mar 15), BUY 0.825 @ $60,606 (today), SELL 8.825 @ $60,606 (today) → Portfolio card shows "0 BTC $0.00" → Research → Overview. Reproduced 2× (before and after a reload).
- **Actual:** Daily Brief "◆ Today's biggest gainer: **Bitcoin +0.3%**"; Pulse "by size, your **3 coins** act like about 1.9 equal-weight positions"; Allocation legend "USDT 64% · ETH 36% · **BTC 0%**". The book holds two coins.
- **Root cause:** `src/features/research/utils/coins.js:42-75` `holdingsFromCoins` sums the entries in stored (newest-first) order: −8.825 + 0.825 + 8 = **8.88e-16** in floating point, which passes `.filter((h) => h.amount > 0)`. Checked in Node: the same three numbers summed oldest-first give exactly 0.
- **Expected:** a position sold to zero is not a holding. It isn't named in the Brief or counted in "N coins", and gets no 0% allocation slice.
- **Suggested fix:** compare against an epsilon relative to the bought quantity (e.g. `amount > bought * 1e-9`), or sum in a fixed-point unit. Apply the same rule wherever "held" is derived (the Portfolio ASSETS count, P05-33). Add a unit test with the 8 / 0.825 / −8.825 case.

### P06-20 · Medium · Research says "down $1,548 (0.1%)" while Portfolio says "−$85,894 (−3.94%)" for the same book after a $84k realised loss
- **Same moment, same portfolio:** Portfolio value card "▼ −$85,894.24 (-3.94%) · INVESTED $2,180,061.68"; Research Pulse "Against a $1,560,867 cost basis you're down $1,548 (0.1%)".
- **Why:** Research measures only open positions (the realised −$84,346.24 on Bitcoin disappears). Portfolio measures everything against lifetime buys. Neither label says which it is, and for a holder who just took an $84k loss, "down 0.1%" reads as reassurance.
- **Bonus:** after a reload the same Pulse says "$1,560,847 cost basis… down $1,528". The $20 change is the USDT edit from P06-17 only appearing after the reload.
- **Repeat of:** P02-18 / P05-15 / P03-19 (still open), sharper here because of the size of the realised loss.
- **Suggested fix:** label both ("open positions" vs "all-time incl. realised"), and show realised P/L somewhere in Research.

### P06-21 · High · Repeat of BUG-023 / P05-16 (still open), Sell side: selling all 8.825 BTC pre-fills $84,000 with AUTO on
- **Steps:** Bitcoin → − Sell. Price field `84000.00`, AUTO active, live $60,606. Seen on Buy 3× (15:40, 15:52 twice) and on Sell 1×. Submitting would have booked $741,300 proceeds instead of $534,848, turning an $84k loss into a $122k "profit".

### P06-05 / P06-07 / BUG-037 re-checked on a second book: "Treasury" = 250,000 USDC only ($249,876)
- Stress test −50% → "$124.9K (−50.0%). Your higher-beta holdings amplify the swing." A book that is 100% one dollar stablecoin is modelled as halving in a crypto crash, and the copy claims amplification at exactly the market move: **BUG-037 still present**, P06-05 reproduced on a second book.
- Risk card → "Your **$100B+** anchor (100%) is holding the risk at Low" for 100% USDC (cap $68.39B): P06-07 reproduced on a second book.
- Pulse header "30D **−0.0%**" (negative zero) and "Today's biggest gainer: USDC ≈0%" (a "gainer" at ≈0%). Low; same family as P03-24 / P05-26.
- The Buy form pre-filled **1.00** again (live $0.9995): P06-08 reproduced a 4th time. Typing "250,000" in Amount kept the digits (250000); the thousands comma is dropped safely.

### P06-22 · Low · Big-number stress: a $998.9M book is fine on desktop but overflows the value card on phones; amount input has no digit grouping
- **Steps:** Cold storage → add Tether (Skip) → + Buy, Amount `1000000000`, Price 0.9989 → Add Buy. (Deleted again afterwards.)
- **Desktop:** "$998,942,000.00 ▲ +$42,000.00 (+0.00%) · INVESTED $998,900,000.00" fits. Total cost preview "$998,900,000.00" is correct.
- **390 px (iframe):** "ASSETS / 1" ends at x=371 while the card ends at 356; the page scrolls sideways (scrollWidth 389 > 374). Same as P03-16, and it already happens at $2M (see Mobile checks above).
- **Input:** the Amount field shows `1000000000` with no grouping, so a missing or extra zero (a 10× error on a $1B entry) is easy to miss. The Total-cost line is the only check. Suggest showing a live formatted echo under the field ("= 1,000,000,000 USDT").
- **+0.00% for +$42,000:** the % is rounded to 2 dp, so a real gain prints as +0.00% (acceptable, noted).
- **Delete warning:** deleting this Tether (added with **Skip for now**) again said "…and your saved thesis": P06-09 reproduced a second time.

### P06-23 · Low · Repeat of BUG-028 (still open): Learn modules 2–9 locked, while the landing says "All 9 Learn modules, fully open"
- Landing `#usage`: "Up to 3 portfolios · Up to 30 coins per portfolio · Up to 300 transactions per coin · … · All 9 Learn modules, fully open" and "**No payment, no card, no upsell**".
- App Learn tab: 8 of 9 module cards carry `module locked` + a padlock. Tapping "Risk & Position Sizing" (the module this persona wants) does nothing: no popup, no toast, no hint how to unlock. Reproduced 2× (light earlier and dark mode).
- The "no upsell" promise is also contradicted by the "upgrade to Pro for 6" toast (P06-13 / BUG-032).
- The three numeric limits on the landing match Account → Plan & billing (3 / 30 / 300 → 27,000) and the enforced portfolio cap.

### P06-24 · Low · Repeat of BUG-026 (still open): mixed minus signs on the value card and Detail
- Value card "▼ −$86,406.14 (-3.96%)" (U+2212 for the amount, a hyphen for the %), header 24H "-0.04%", BTC Detail "−$84,346.24 (-13.62%)", ETH "−$1,638.00 (-0.29%)". Seen on every load this session.

### P06-25 · Low · Repeat of BUG-031 (still open): "Connie O'Neil-Smith" becomes "Connie ONeilSmith" while typing
- Account → Profile → Display name. The field strips `'` and `-` keystroke by keystroke (checked via the input's value). Not saved.

### P06-26 · Low · Delete-portfolio and Portfolios-list copy for a $250k book
- Account → Portfolios lists "Treasury **1 coins**" (repeat of P04-14). Delete → "This portfolio has 1 coin and all its transactions and **thesis**." The coin was added with Skip, so there is no thesis (same family as P06-09). The confirm doesn't show the book's value ($249,876), which is the number a holder would want to see before deleting. Suggestion: "Treasury holds 1 coin worth $249,876 (1 transaction)…". Cancelled, nothing deleted.

### P06-27 · Low · Repeat of P04-19 (still open): after logout → login the active portfolio resets to the first one
- Active portfolio before Logout: Cold storage. After logging back in: My Portfolio. Data, edits (the USDT price edit) and the dark theme all persisted. Logout cleared the login form correctly (email empty, password empty), so the BUG-034 path is not triggered by normal Logout.

### P06-28 · Medium · Repeat of P02-04 / P05-12 (still open): after "Reconsidering", the thesis list shows 🔴 Challenged, yet the detail still highlights "Yes, still holding"
- **Steps:** Journal → Tether thesis → "Reconsidering" → list shows "🔴 Challenged" → reopen Tether.
- **Actual:** "Yes, still holding" has `btn-primary` (filled), and the other two are `btn-ghost`; no `aria-pressed` anywhere. A holder reviewing a $1M position can't see which decision they recorded.

### P06-29 · Low · Journal asks for a thesis on Bitcoin, a position sold to zero
- Journal "NEEDS A THESIS (1): Bitcoin · Add thesis" after BTC was fully sold (0 BTC). A closed position doesn't need a buy thesis. Same root as P06-19 (closed or dust positions treated as held), and the Journal shows it without the float dust.
- Suggested: hide 0-holding coins from "Needs a thesis", or label them "closed".

### Note (useful for BUG-021): the two thesis paths record different prices
- Journal → "Add thesis" for Tether recorded "Thesis written Nov 22, 2026 · **$0.9989**" (the live price). Search → "Before you add Ethereum…" recorded **$1,900.00** (the mock, P06-11). So the Journal path already uses live data, and the fix for BUG-021 can reuse it.
- A thesis containing `"100% backed" <b>not bold</b> & T-bills` renders as literal text (escaped correctly).

### P06-30 · Low · Two-tap transaction delete: a tap just after the 3 s auto-disarm opens "Edit" instead
- **Steps:** Treasury → USDC → trash on "BUY 250,000 USDC" (the pill becomes "Delete?") → wait ~3 s (one screenshot) → tap where "Delete?" was.
- **Actual:** the pill had disarmed (`Detail.jsx:43`, 3000 ms) and shrunk back to the trash icon, so the tap landed on the row and opened **Edit USDC** with the 250,000 buy loaded. Nothing was changed. Seen 1× by hand. The mechanism is the same as P02-10 (the Remove pill and the rename pencil).
- **Suggested fix:** keep the armed pill the same width as the trash button, or stop propagation on the armed area for ~500 ms after disarm. 3 s is also short for a deliberate tap on a six-figure row.

### Observation (seen once, not reproduced, so not counted as a finding)
- Right after logging back in, switching to **Treasury** showed USDC at **$1.00 · +0.00% · Market Cap $34.00B** (mock values; live $0.9995 / $68.39B) and a value card "▲ +$125.00 (+0.05%)" under "● LIVE". About 8 s later it corrected to "$249,867.75 ▼ −$7.25". Two later attempts (reload → switch) went straight to live prices. Probably the same seam as P01-12 / BUG-023 (mock values used until `/api/prices` returns for a non-active portfolio's coins).

### P06-08 addendum · root cause of the stablecoin "1.00"
- `src/utils/coins.js:459-471` `getHistoricalPrice`: "Stablecoins always ~$1": for `USDT`, `USDC`, `DAI` it returns exactly **1.00** for any date. With the history cached empty (P06-01), AUTO uses this estimate and labels it "Using the market price for this date" (BUG-025 family).
- The same hard-coded stablecoin list could feed the fixes for P06-05 (stablecoin beta ≈ 0 in the stress test) and P06-06 / P06-16 (keep stablecoins out of concentration flags), so the app would know a stablecoin in one place.

### P06-31 · Medium · Repeat of P03-03 (still open): CoinInfo for a non-held stablecoin (Dai) is entirely mock data
- **Steps:** Search "dai" → tap the Dai icon.
- **Actual:** "Dai · DAI · Rank #18 · $1.00 · +0.00% today · Market cap $5.30B · 24h volume — · Circulating —". `/api/prices?ids=dai` at the same moment: rank **21**, cap **$4.36B**, 24h vol $85.2M, circulating 4.36B. The card's values are exactly `TOP_COINS` (`rank: 18, mockPrice: 1.00, mockMcap: 5.3e9`). Seen 2× (search row and CoinInfo).
- Related: Search lists USDC as "#7" (mock `rank: 7`) while `/api/prices` says rank 5 (P03-04 / P04-21 family).

### P06-32 · Low (product / privacy, from code reading) · "Share your Pulse" image prints the book's dollar total, with no way to hide it
- `src/features/research/hooks/useSharePulse.js` draws `'Total ' + abbreviate(portfolio.total)` (for this book "Total $1.6M"), the allocation legend, and the % move, then calls `navigator.share` or downloads `crypto-idea-pulse.png`. Not clicked during the test, because it downloads a file.
- For a holder of $1–2.5M, a one-tap share that publishes their net crypto worth is a privacy risk they may not notice. The legend would also include the "BTC 0%" dust slice (P06-19).
- **Suggested:** leave the $ total out by default, or add a "show amount" toggle before sharing. Percentages alone carry the message.

### Guards re-checked (worked)
- Sell 500,000 USDT dated **2026-11-20** (before any buy) → blocked: "Can't save — a sell on 2026-11-20 would exceed your holdings. Delete or reduce that sell first." The block is right, but the copy is P01-05 / P03-30 (it should say "you held 0 USDT on 2026-11-20"). The AUTO price was 1.00 again (P06-08, 5th time).
- Sell 1,000 USDT dated **tomorrow 10:00** → "A transaction can't be dated in the future." Correct.
- Delete "BUY 250,000 USDC" with a later 100,000 sell → "Can't delete — a sell on 2026-11-22 depends on it". Editing that buy down to 50,000 → "Can't save — a sell on 2026-11-22 would exceed your holdings…". **BUG-019 still fixed.**

### P06-18 / P06-21 reproduced again on a partial ETH sell (100 of 329.35 ETH @ $1,704.44)
- The ETH **Sell** form opened at `1900.00` (mock) with AUTO, live $1,704.44. That is the 2nd Sell-side repro (BTC earlier), a $19,556 overstatement on 100 ETH.
- Detail after the sell: "Total P/L **−$686.179** (-0.12%)" and "Bought 329.35 ETH · **$562,043.493**". Three-decimal dollars now appear on the P/L line as well.

### P06-33 · Medium · At the 30-coin cap, the "Before you add…" prompt still asks for a thesis, then refuses the coin and discards what was written
- **Setup:** Cold storage filled to **30/30** coins through the Search UI (a scripted loop that types each name in Search and taps + Add → Skip for now). The cap is real: My Assets showed (30/30), matching Plan & billing's "30 coins".
- **Steps:** Search "kaspa" → + Add → the prompt opens normally → type "Why" and "What would change your mind" → **Save to Journal & add coin**.
- **Actual:** the prompt closes, toast "**Starter: 30 coins — upgrade to Pro for 100**", the coin is not added and the thesis is gone (not in the Journal, not kept as a draft). Reproduced 2 of 2.
- **Expected:** at 30/30, + Add is disabled or the prompt says "This portfolio is full (30/30)" *before* the user writes. If refused, the draft is kept. The toast offers a Pro plan that can't be bought and contradicts the landing's "no upsell": **BUG-032 (coins variant, `src/CryptoIdea.jsx:768`)**.
- **Suggested fix:** check `coins.length >= limit` before opening the prompt (`src/components/Search.jsx`), and keep the draft on any refusal. Same family as P03-22 (over-length thesis lost).
- Cleanup: Cold storage (30 coins, 0 tx) deleted afterwards. Its confirm said "30 coins and all their transactions and theses" although it had neither (P06-26 family).

### P06-34 · Low · A 17-digit amount is silently cut to 15 digits and a quadrillion-USDC buy is accepted
- **Steps:** Treasury → USDC → + Buy → type `99999999999999999` (17 digits) in Amount (AUTO price 1.00 left as is) → Add Buy.
- **Actual:** the field silently became `999999999999999` (`sanitizeDecimal` 15-digit cap, `src/utils/format.js:20`), "Total cost $999,999,999,999,999.00", and the buy **was saved**: the card read "1,000,000,000,149,999 USDC · $999,445,000,149,915.68", INVESTED "$1,000,000,000,249,874.00". The P/L "−$555,000,000,008.25" comes entirely from the mock $1.00 AUTO price (P06-08). The desktop layout coped. The transaction was deleted again afterwards.
- **Why it matters:** the typed number changed without notice (two digits dropped), and nothing flags an amount ~14,600× the coin's circulating supply (68.4B USDC). One fat-fingered entry poisons every total and the Research view.
- **Suggested fix:** when the sanitiser truncates, say so ("max 15 digits"). Add a soft plausibility warning when amount > the coin's `circulating` supply from `/api/prices` (already loaded), e.g. "That is more USDC than exists. Save anyway?".

### P06-35 · Medium · Repeat of P02-12 (still open): ETH CoinInfo "Price History" is all mock $1,900 although real ETH history is in the browser cache
- **Steps:** My Portfolio → tap the Ethereum icon (CoinInfo).
- **Actual:** top "$1,701.72 · −0.17% today"; Price History "1 Year Ago **$1,900.00** −10.44% · 6 Months Ago $1,900.00 · 3 Months Ago $1,900.00 · **Today $1,900.00**". The browser's cached `/api/history?id=ethereum` holds 366 real points (e.g. 2386.48 on 2026-10-23), so the card isn't using them. Also "Unrealised P/L **−$1,101.667**" (three decimals, P06-18 family). Seen 1× here; it matches P02-12 / P01-09 exactly.

### Research doesn't say which portfolio it describes (repeat of P05-17)
- With the 50-character "Long-term conservative stablecoin treasury reserve" active, Research shows "Your portfolio is $149,917…" with no portfolio name anywhere on the tab. A holder with three books can't tell which one is summarised.

### P06-36 · High · Repeat of P02-21 (still open): changing only the date of an edited trade silently overwrites the recorded price
- **Run 1:** Tether → "BUY 20,000 USDT" (price **0.999**, entered by hand) → Edit → change Date to 2026-06-01 10:00 → the price field becomes **1.00** with no hint.
- **Run 2:** Ethereum → "BUY 29.35 ETH" (price **1,701.55**, entered by hand) → Edit → change Date to 2026-10-01 10:00 → price becomes **2,684.71**. Saving would raise this lot's cost basis by $29,005.
- Both edits were closed without saving, and the rows are unchanged ($0.9990 and $1,701.55).
- **Root cause:** `src/components/AddEntry.jsx:56`: on a date change, `if(sel){… setEPrice(fmtPriceInput(priceAt(newDate)))}` overwrites the price whenever a history price exists, even in Edit mode and even when the user typed the price.
- **Suggested fix:** in Edit mode (or whenever the price was typed by hand, i.e. AUTO off) never overwrite the price on a date change. Show the "Suggested price … tap AUTO" hint instead.

### P06-37 · High · Repeat of P02-20 / P03-13 (still open): the landing DCA calculator shows a $440k "profit" for a plan that is actually ~$500k down
- **Steps:** landing `/#dca` → Bitcoin (default), Amount **50000**, dates 2023-11-22 → 2026-11-22, **Monthly**; then **Weekly**.
- **Monthly:** "Total invested $1,850,000 · Value today $2,290,142 · Profit / Loss **+$440,142** · Return +23.8% · 22.234385 BTC · Average buy price $83,204 · **Price today $103,000**".
- **Weekly:** "Total invested $7,850,000 · Value today $9,730,587 · **+$1,880,587** · 94.471714 BTC · Price today $103,000". Reproduced 2 of 2.
- **Reality:** BTC trades at ~$60,690 (`/api/prices`), so 22.23 BTC ≈ $1.35M (about **−$500k, −27%**) and 94.47 BTC ≈ $5.73M (about −$2.1M). `/api/history?id=bitcoin` was returning `{"prices":[]}` at this time, so the page fell back to its built-in estimate without saying so. Nothing tells the visitor that these are invented numbers.
- **Suggested fix:** as P02-20: when history is empty, show "Price data unavailable right now" instead of an estimate. Never show an estimate as "Price today".

### Accessibility note (no new finding)
- Portfolio coin cards (`div.asset-card`) aren't focusable, but a keyboard path exists: the coin icon button ("View Tether info") → CoinInfo → the **Transactions** button. Email-digest switch: an `<input role=switch>` with no label; the accessibility tree announces it as "on" while unchecked (P02-09).
- Appearance: System and Light both resolve to light here (OS light), and dark ↔ light switches cleanly. The theme was set back to **Light** at the end so later personas start on the default.

### P06-38 · Low · Repeat of P04-37 / P05-23 (still open): a second "My Portfolio" is accepted, and the delete confirm can't tell the two apart
- **Steps:** Portfolio → pill-row **Add portfolio** (+) → name "My Portfolio" → Save.
- **Actual:** no warning. The pill row reads "My Portfolio · My Portfolio · Long-term…", and the new empty one becomes active with "$0.00 / ASSETS 0", which looks to this holder as if the $1.39M book vanished. In Account → Portfolios both rows say "My Portfolio" (3 coins / 0 coins). The real book's delete confirm reads "Delete My Portfolio? This portfolio has 3 coins…". With two identically named books, the coin count is the only thing that separates a harmless delete from wiping $1.39M of history.
- **Suggested fix:** reject duplicate names (case-insensitive) in `addPortfolio` / rename. Optionally show the book's value in the delete confirm (see P06-26).
- Cleanup: the empty duplicate was removed with the two-tap Remove pill. The real book was untouched.

### P06-30 reproduced a 2nd time (deliberately)
- Ethereum → trash on "SELL 100 ETH" → the "Delete?" pill appears (55 px wide, centre-left at x=755,y=484) → wait 4 s → tap (755,484) → **"Edit ETH"** opens with the 100 ETH sell loaded. Closed without saving, and the rows are unchanged. 2 of 2.

### P06-39 · Low · Repeat of P05-31 (still open): "Delete thesis" promises "only the thesis is removed" but also erases the saved research findings
- **Steps:** Journal → Tether → Real yield "No yield; issuer keeps T-bill interest…" → **Save findings** → **Delete thesis** → confirm text "Delete this thesis? Your coin stays in the portfolio — only the thesis is removed." → Yes, delete thesis → Needs a thesis → Tether → Add thesis.
- **Actual:** all five fields are empty, so the saved Real-yield finding is gone, along with the "Challenged" review status. The coin itself stays (correct).
- **Suggested fix:** either keep `journal.funnel` when only the thesis is deleted, or change the copy to "the thesis and its research findings are removed".

### Login re-check
- Logout → login with a toast observer attached: **no toasts** (BUG-020's "Live sync was interrupted" not seen; it was a signup-time bug and signup wasn't part of this run). Data intact: "$1,390,094.35 ▼ −$84,655.38 (-3.88%) · INVESTED $2,180,041.68".


### P06-40 · Low · The oversell guard lets you sell 1e-8 more than you hold ("Sold 8.82500001 BTC" against 8.825 bought)
- **Run 1:** Bitcoin (0 BTC after selling all 8.825) → − Sell 0.00000001 @ 60,691 → saved with no message. Detail: "Sold **8.82500001 BTC** · $534,847.951" against "Bought 8.825 BTC", Transactions (4).
- **Run 2:** Ethereum (229.35 held) → − Sell **229.35000001** → saved with no message. "Sold 329.35000001 ETH" against "Bought 329.35 ETH". Both test sells were deleted afterwards and the book is back to 229.35 ETH / 0 BTC.
- **Root cause:** `src/utils/tx.js:69` blocks a sell only when the running balance is `< -1e-8`. A balance of exactly −1e-8 passes, and the tolerance is absolute (the same for 1e-8 BTC ≈ $0.0006 and any coin). The intent ("tolerate float dust") is right, but the boundary lets a user record selling more than they own. Small in dollars, but it breaks the "can't oversell" promise and leaves negative-dust holdings that feed P06-19-style edge cases.
- **Suggested fix:** compare in fixed-point (e.g. round both sides to 1e-12 of the coin's units) and block any sell whose rounded amount exceeds the rounded balance. Keep the epsilon only for float noise far below the smallest unit a user can type, i.e. `< -1e-12`.

### P06-11 reproduced (Search, 16:22)
- Search "btc" → "Bitcoin · BTC · #1 · **$84,000.00 · +2.40%**" (live $60,691, +0.63%). Search "eth" → "Ethereum · **$1,900.00 · +1.80%**". The 24h change in Search is mock too, not only the price. Search "usdt" → "Tether · $1.00". 2nd repro of BUG-021 in this session.

### Repeat of P05-32 (still open): the "Verify your email" banner's ✕ only hides it until the next reload
- Dismiss → banner hidden → reload → "📧 Verify your email to secure your account." is back. Seen 1× (matches P05-32).

### Phone checks, final round (360 px iframe)
- Below 768 px the coin Detail is a full-screen page and fits: "Bought 329.35 ETH · $562,043.493", "Total P/L −$353.621 (-0.06%)". The three decimals are visible on phones too (P06-18).
- The Detail header's **‹ back** and **trash** are both `button.icon-btn` with **no accessible name** (back works when tapped). Trash is P03-15 / P01-11; the unnamed back button is the same gap.
- Plan & billing at 343 px fits: "Portfolios 2 / 3 · Coins in active portfolio 3 / 30 · Total transactions **10 / 27,000** · Up to 300 per coin". 10 matches the real count (USDT 2 + ETH 3 + BTC 3 + Treasury USDC 2).

### Live-refresh soak (16:24–16:31, Portfolio left open; observation, no finding)
- The value card and coin cards were sampled every 30 s. 16:24:56 → 16:28:56 unchanged ("$1,390,070.83 · ETH $1,705.65 · BTC $60,673.00"). The app polls `/api/prices` every 60 s (`useLivePrices.js:26`, responses `max-age=120`), and the server serves its cached hot set, so nothing moved until the server cache turned over. After that the next poll updated everything at once ("$1,389,379.66 ▼ −$85,370.07 · ETH $1,702.68 · BTC $60,601.00"), and the totals stayed consistent. No toasts or errors during the soak.
- Note: the landing says "prices refresh about once a minute". The observed on-screen cadence was about 5 min, which matches the server's hot-cache TTL. The emulator doesn't fire the 5-min cron, so this can't be judged locally; worth re-checking on a deployed stack before keeping that copy.
- The /edge guide (landing footer) still gives allocation percentages ("30% of your portfolio", "5%"), the same as P04-30, and has nothing for stablecoin holders.

## Known bugs re-checked
| Bug | Result |
|---|---|
| BUG-019 Oversell and P&L integrity | Appears fixed (delete, edit-down, back-dated and edit-up sells all blocked), except the 1e-8 boundary (P06-40) |
| BUG-020 "Live sync interrupted" toast at setup | Not reached (no signup). No toast on 2 logins |
| BUG-021 Search mock prices saved into the thesis | Still present (ETH $1,900, P06-11) |
| BUG-022 Empty holding green +$0.00 | Partly fixed: value-card P/L neutral, but 24H cell and Detail still green (P06-14) |
| BUG-023 AUTO pre-fills the mock price | Still present on BTC, ETH, USDT, USDC, buy and sell (P06-01, P06-08, P06-21) |
| BUG-024 Time recorded in UTC, shown as local | Still present (P06-02) |
| BUG-025 Estimate labelled as market price | Still present (stablecoin estimate is exactly 1.00, P06-08 addendum) |
| BUG-026 Mixed minus signs | Still present (P06-24) |
| BUG-027 Escape doesn't close popups | Still present; root cause: no Escape handler in `Modal.jsx` (P06-10) |
| BUG-028 Learn modules locked | Still present (P06-23) |
| BUG-029 Quiz answers not controls | Still present (answers, Previous and Submit missing from the accessibility tree) |
| BUG-030 Wrong quiz answer stays green | Still present (green option beside "Not quite") |
| BUG-031 Name field strips ' and - | Still present (P06-25) |
| BUG-032 Upsell to an unbuyable plan | Still present for portfolios and coins (P06-13, P06-33) |
| BUG-033 Oversized Privacy-card line | Still present (dark mode) |
| BUG-034 Deleted account's credentials kept | Not reached (normal Logout clears the form) |
| BUG-035 Restore screen in dark mode | Not reached |
| BUG-036 100% single-token book rated Low | Not reached as described. A 100% USDC book is rated Low, which is reasonable for a stablecoin |
| BUG-037 Stress "amplify" at exactly −50% | Still present (100% USDC book, −50.0%) |
| BUG-038 Brief ▲ when down | Not reached (the book was up each time the Brief was read) |

## What worked well
- Big dollar figures are formatted cleanly with grouping and cents on desktop, all the way up to $999,445,000,149,915.68. Value-card totals, invested and P/L were checked by hand after every trade and always added up.
- Holdings integrity guards are solid: no overselling, no deleting or editing a buy a later sell depends on, no future dates. Messages appear immediately.
- The delete-coin warning shows the transaction count; deleting a portfolio uses a count-aware confirm; empty portfolios use a light two-tap Remove.
- Plan limits are real and match what Account and the landing say (3 portfolios / 30 coins per portfolio / 300 tx per coin).
- Thesis text is escaped (`<b>` shown literally). The Journal "Add thesis" path records the live price.
- Dark mode is readable across Portfolio, Detail, Research and Account. The Research tab at 375 px is tidy.
- The comma in "250,000" and a leading ".5" are handled safely in amount fields. No app console errors in the whole session.

## Timeline
- 15:37 Start, health check OK (app 200, functions up). Previous persona still signed in → logged out → logged in as p06 (existing account, 1 earlier USDT buy).
- 15:38–15:43 Built the book: +980k USDT, +500k USDC (Jun 1), 8 BTC (Mar 15, AUTO mock caught), 300 ETH (Search thesis $1,900). P06-01/02/03/04/11.
- 15:43–15:46 Research: stress test −60.9% on a 60%-stable book, concentration, $100B anchor. Sold all USDC; delete warnings. P06-05…P06-10.
- 15:46–15:50 Deleted USDC; Account limits; 4th portfolio upsell; empty book; mobile iframes; dark mode. P06-12…P06-16.
- 15:50–15:55 Edit-then-trade revert ×2; 3-decimal $; BTC sold to zero; dust in Research; Research vs Portfolio P/L. P06-17…P06-21.
- 15:55–16:00 Treasury (USDC only); $1B whale in Cold storage; landing Usage; Learn locks; Profile name; portfolio delete copy; logout/login. P06-22…P06-27.
- 16:00–16:05 Journal review/status; Journal vs Search thesis price; late-tap Edit; DAI CoinInfo; Share Pulse (code); guards. P06-28…P06-32.
- 16:05–16:12 Filled Cold storage to 30/30; cap toast drops the thesis ×2; quadrillion-USDC entry; ETH CoinInfo history. P06-33…P06-35.
- 16:12–16:20 Date-only edit overwrites price ×2; landing DCA $50k/month; duplicate portfolio name; thesis delete wipes findings; quiz; edit-sell-up guard. P06-36…P06-39.
- 16:20–16:24 1e-8 oversell boundary ×2 (test sells deleted); verify-banner dismiss; Search mock prices; 360 px Detail and Plan & billing; held-USDC CoinInfo → Transactions; /edge; keyboard focus ring. P06-40.
- 16:24–16:31 Live-refresh soak on Portfolio (30 s samples): prices updated once the server cache turned over (~5 min), no toasts. Appearance left on Light; test tab closed.
