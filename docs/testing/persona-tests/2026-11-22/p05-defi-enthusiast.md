# Persona 05 — DeFi enthusiast · 1-hour test · 2026-11-22
Status: Complete | Account: p05.defi@test.com (persona "Dev DeFi"; account already existed — not re-registered) | Start: 14:41 local (UTC+2) · End: 15:36 local | Minutes tested: 55

**Summary:** 55 findings — 13 High, 14 Medium, 28 Low. 32 carry a P05-xx id (P05-06 was withdrawn as a pass); 18 of those are genuinely new (P05-02/03/09/10/13/14/17/18/23–27/29–33), the rest repeat BUGS.md entries or earlier persona findings. For a DeFi user the worst problems are prices: tokens with no live market (MKR, stETH) are valued at a hard-coded mock price under the LIVE badge and flip a book from −10% to +19% (P05-03/P05-28), and Buy/Sell forms pre-fill mock or estimate prices up to 9.8× off (BUG-023, P05-21). Research understates drawdowns when a coin's history is missing (P05-07), stress-tests a 66% USDC book as −54% in a −50% market (P05-24), and calls any 2–3-coin book "concentrated" (P05-27). An edited transaction reverts on screen after trading another coin (P05-19). Searching "aave" lists Aave 3–5 times and leaves a ghost row in later searches (P05-10). The funnel findings themselves (dilution / volume / yield) save, edit and persist well; portfolio switching is clean. BUG-004, BUG-019 and BUG-034 appear fixed; 17 BUGS.md entries are still present.

## Persona
A DeFi power user who holds governance/protocol tokens (UNI, AAVE, LINK, MKR, LDO, CRV) and splits them into two books ("Blue-chip DeFi" and "DeFi degen"). Wants to flip between books quickly, see concentration and stress results per book, and record manual-research findings (token dilution / unlocks, real vs wash volume, real yield) next to each thesis.

## Data created
Account `p05.defi@test.com` already existed (created 2026-11-21 by an earlier run, display name "Dev DeFi", 1 portfolio "My Portfolio" with 400 UNI bought 2026-11-21 @ $6.25). Not re-registered.

| Portfolio | Coin | Transactions (date/time as entered, price) | Thesis / funnel |
|---|---|---|---|
| Blue-chip DeFi (renamed from "My Portfolio") | UNI | pre-existing BUY 400 @ $6.25 (2026-11-21); **SELL 150 @ $4.72** (2026-11-22, AUTO); BUY 10 @ $4.71 (today, P05-19 repro) | Added later from Journal: thesis + change-my-mind → 🟢 Intact |
| | AAVE | BUY 12 @ $82.05 (2026-06-01, AUTO from history); BUY 3 @ $98.88 (today) | Full thesis + all 3 findings (dilution, volume, yield; yield edited twice, dilution edited + X auto-save); status set to **Reconsidering** (🔴 Challenged), later **Need to research** (🟡 Review) |
| | LINK | BUY 150 @ $9.00 (2026-08-15, manual) → **edited to $9.10, then $9.20** (P05-19) | Funnel-only (dilution) via Journal → 🟡 Incomplete (a dilution note typed in Search was discarded by Skip) |
| | MKR | BUY 1.5 @ $1,600 (2026-03-10); **SELL 1.5 @ $1,700** (today) → 0 held | Funnel-only (yield) via Journal → 🟡 Incomplete (Search-prompt yield note discarded by Skip) |
| DeFi degen (new) | LDO | BUY 4,000 @ $0.36 (2026-09-02); SELL 4,000 @ $0.2386 (today) → **coin then deleted** (with its thesis) | Thesis + dilution + volume (deleted with coin) |
| | UNI | none (added via Search, double-click Skip test → 1 coin) | none |
| | CRV | BUY 5,000 @ $0.211365 (2026-07-20, AUTO from history); BUY 1,000 @ $0.1847 (today, double-click test → 1 tx) | 1,990-char thesis + change-my-mind + yield finding; priceAtAdd saved as mock $0.5800 |
| AAVE solo (new; temporarily renamed "Blue-chip DeFi" for P05-23, restored) | AAVE | BUY 10 @ $120 (2026-10-01); SELL 2 @ $99 (today, entered from a 2nd tab) | none |
| | LINK | BUY 90 @ $8.78 (today) | none |
| | USDC | BUY 3,000 @ $1.00 (today) | none |

Other state changes: theme set to Dark, then Light at the end; account soft-deleted and restored once (data intact); Learn module 1 lesson 1 completed (one wrong attempt first; now 50 XP, 1-day streak). Portfolio cap 3/3 reached. No real credentials, payments or external sites used.

## Coverage
| Area | What was done | Result |
|---|---|---|
| Login / session | Logged out a leftover P04 session; login; logout/login ×2; reload ×6; soft-delete → restore; verify-email banner dismiss (P05-32) | Pass (active book resets to the first portfolio after logout — by design, `ci-active-port` is cleared on logout); BUG-034 appears fixed; BUG-035 present |
| Search + Before-you-add prompt | DeFi searches: aave, chainlink, MKR, lido, curve, uniswap, usdc; full thesis + funnel; funnel-only + Skip; 2,000-char cap | Fail: mock prices/ranks (BUG-021), duplicate Aave rows (P05-10), Skip discards findings (P05-02), MKR/stETH mock-only (P05-03) |
| Buy / Sell / Edit / Delete | 15 buys/sells incl. comma-decimal input (P04-39), back-dated, oversell, full exits, edit price, 2-step tx delete, delete coin with thesis, double-click submit | AUTO pre-fill wrong on 6 coins (BUG-023, P05-04/16/21/28), edit reverts on screen (P05-19), oversell copy (P01-05); double-submit correctly guarded; 2-step delete + auto-disarm work |
| Portfolios | Rename, create ×2 (header dialog + Account), switch ×20 (incl. 7 rapid programmatic switches), 3/3 cap, name edge cases | Switching clean, no stale/zero P&L seen; duplicates allowed (P05-23); upsell toast (BUG-032) |
| Research — Overview | Brief, Pulse 24H/7D/30D, Allocation, Risk, Stress (−50/−20/+50), notes on 4 different books as they changed | Notes rotate correctly (drawdown → top-two → single-coin → top-two); bugs: BUG-037, BUG-038, P05-07, P05-09, P05-24/25, P05-27 |
| Research — Coins / Ask / conviction pills | `aiResearch` is OFF in `/api/config` → Coins and Ask sub-views hidden | **Not reached** (by design while AI is off) |
| Journal | Thesis list per book, detail, Read popup, Edit (validation), funnel edits + Save findings, X auto-save, status review, Add thesis later, funnel-only entries | Persistence works; P05-12 (status not reflected), P05-13, P05-14 |
| CoinInfo | Non-held (Curve) and held (Uniswap) | Mock data (P03-03, P02-12) |
| Learn | Module list, locked DeFi modules, one quiz attempt | BUG-028, BUG-029, BUG-030 present |
| Account | Plan & billing, Portfolios, Privacy & data, theme Light/Dark | P01-14, BUG-033, P05-22, P05-29 |
| Live sync | Second own tab: SELL in tab B appears in tab A without reload | Pass |
| Landing DCA | LDO, UNI, default BTC | P03-13/P03-14 repeats |
| Mobile | 375px and 360px same-origin iframe (window is maximised; `resize_window` has no effect): Portfolio, Research, Search prompt (dark), coin Detail screen, Journal detail with the 1,990-char thesis | No horizontal page scroll except a long unbroken search query (P05-30); P05-18, P03-11 badge overlap |
| Dark mode | Research, Journal list/detail, Detail popup, Learn, restore screen | Readable except BUG-035 |
| Keyboard | Escape on CoinInfo ×2, focus on open, asset-card focusability | BUG-027 root cause; asset cards are click-only divs (as in P02-09) |
| Console | Checked after major flows | 5× React duplicate-key errors (P05-10); one `MessageNotSentError` (browser-extension noise, not the app) |

Not tested: Share Pulse (it downloads a PNG — code reading shows it prints the total portfolio value and a "cryptoidea.com" footer; not verified), CSV/JSON export (downloads), admin surfaces (out of scope).

## Findings

### BUG-023 (repeat, still open) · High · Buy form AUTO price pre-fills the mock price for DeFi tokens
- **Steps:** Search → add Chainlink → Portfolio → Chainlink card → + Buy. (Also reproduced on Aave.)
- **Expected:** AUTO price = live price shown on the same Detail card ($8.76 LINK / $98.14 AAVE).
- **Actual:** Price field pre-filled `18.20` for LINK (2.08× live) and `105.00` for AAVE. Submitting without looking would record a cost basis 108% too high for LINK.
- **Repeat of BUG-023** (still open). Fix as proposed there (`src/hooks/useLivePrices.js` must not seed with `TOP_COINS.mockPrice`).

### BUG-021 (repeat, still open) · High · Search result shows a mock price for Chainlink
- **Steps:** Search tab → type `chainlink`.
- **Expected:** live ~$8.76.
- **Actual:** `Chainlink LINK · #13 $18.20 +1.50%`; after adding, the Portfolio card shows $8.76 +2.83%. Two prices and two 24h changes for the same coin within seconds.
- **Also saved into the thesis:** the Curve DAO thesis written from Search shows "Thesis written Nov 22, 2026 · **$0.5800**" (mock) — live was $0.1852, so "price when I wrote the thesis" is 3.1× too high forever. (A thesis added later from the Journal tab saved the live price: Chainlink "· $8.79".) Searches for `lido` (LDO $2.15 vs live $0.2378), `curve` ($0.58 vs $0.1852), `MKR` ($2,850, no live data), `uniswap` ($12.40 vs $4.71) and `aave` ($105 vs $98.78) all show the mock price.
- **Repeat of BUG-021** (still open).

### P05-01 (repeat of P01-01 / P02-01 / P03-07) · High · Back-dated AUTO price for Chainlink stays on the mock price because an empty `/api/history?id=chainlink` is browser-cached for 24h
- **Steps:** Chainlink → + Buy → set Date & Time to 2026-08-15 09:30.
- **Expected:** AUTO updates to the historical price (~$8.96 per `/api/history?id=chainlink&days=365`).
- **Actual:** AUTO stays `18.20`. Same flow on Aave correctly switched to `82.05` (matches history for 2026-06-01). Resource timing shows the app's `/api/history?id=chainlink` (no `days` param) came from the browser cache with a 13-byte body `{"prices":[]}`; a `no-store` refetch still returns `{"prices":[]}` with `cache-control: public, max-age=86400`, while `&days=365` returns 366 points. So the default (no-`days`) history path answers empty for some coins and that empty answer is cached for a day.
- **Repeat of persona findings P01-01/P02-01/P03-07** (not yet in BUGS.md). Suggested fix: in `functions/index.js` `/api/history`, never send a long `max-age` for an empty series (use `no-store` or a short TTL), and fall back to the 365-day window when the `max` window is unavailable; client `useCoinHistory` should treat an empty series as "no data", not as an answer.

### BUG-024 (repeat, still open) · High · Date & Time pre-fills UTC
- **Actual:** At 14:43 local (UTC+2) the Buy form showed `2026-11-22T12:43`. Repeat of BUG-024.

### BUG-026 (repeat, still open) · Low · Mixed minus signs
- **Actual:** Chainlink Detail `Total P/L −$36.00 (-2.67%)`. Repeat of BUG-026.

### P05-02 · Low · "Skip for now" silently discards manual-research findings typed into the Before-you-add prompt
- **Steps:** Search → Chainlink → + Add → fill only "Dilution & token unlocks" → Save (validation correctly asks for the two thesis questions) → click "Skip for now".
- **Expected:** Either keep the funnel finding (it is optional and independent of the thesis) or warn "your research notes will be discarded".
- **Actual:** Coin is added; the dilution note is gone without a warning (Journal shows LINK under "Needs a thesis" with no findings). Reproduced twice (LINK, then MKR — see Data). Related to P02-02 (X discards a typed thesis).
- **Suggested fix:** `src/components/Search.jsx` Buy-Journal prompt — if any field is non-empty, confirm before skipping, or persist a funnel-only journal via `addCoin`'s 2nd arg.

### P05-03 · High · Maker (MKR) can be added and is valued forever at the hard-coded mock price $2,850 — it has no live market data at all, yet sits under the "● LIVE" badge and flips the whole book from a loss to a gain
- **Steps:** Search → type `MKR` → result "Maker MKR · #48 $2,850.00 +0.50%" → + Add → Skip → Maker card → + Buy 1.5 MKR @ $1,600 on 2026-03-10.
- **Expected:** Either the coin is not offered (the server has no data for it), or it is clearly shown as "no live price" and left out of totals / valued at "—".
- **Actual:** `/api/search?q=maker` → `{"coins":[]}` and `/api/prices?ids=maker` → `{}` (the server does not know the coin). The app still shows `$2,850.00 +0.50%`, `Market Cap: $2.60B`, values the 1.5 MKR at **$4,275.00** and books **Total P/L +$1,875.00 (+78.13%)**. The Portfolio value card jumped from `$4,363.68 ▼ −$470.92 (-9.74%)` to `$8,638.68 ▲ +$1,404.08 (+19.41%)` — the made-up quote alone turns the DeFi book from red to green, and MKR becomes the largest holding (~49%), which then drives Research allocation / risk / stress / Pulse. Reproduced on the card, the Detail, and after reload (see Timeline).
- **Same class of coin:** "Lido Staked Ether · STETH · #8 · $1,900.00 +1.70%" in Search (above ETH's live $1,702.86!) — `/api/prices?ids=staked-ether` returns nothing and `/api/search?q=steth` → `{"coins":[]}`, so stETH, a core DeFi collateral token, would be valued the same invented way (verified via the API + Search row; not added to a book).
- The landing "Usage" section promises "Portfolio tracker with **live prices & real P&L**" (and Usage limits 3 / 30 / 300 match the app).
- **New** (same root cause family as BUG-021/BUG-023, but a different and worse surface: the mock value is used as the *current* valuation of a held coin, not just a form pre-fill).
- **Suggested fix:** `src/hooks/useLivePrices.js:16` must not seed `TOP_COINS.mockPrice/mockChange/mockMcap` into the live map; a coin with no live quote should render "—" and be excluded from (or flagged in) totals. Also prune `TOP_COINS` entries (`src/utils/coins.js:54` `maker`) that the server universe no longer carries, or have Search only return server results for "Add".

### BUG-027 (repeat, still open — root cause found) · Medium · Escape never closes any popup, and the popup X is not keyboard-reachable
- **Steps:** Search → `curve` → tap the Curve DAO icon (CoinInfo overlay) → press Escape; click inside the dialog body → Escape again.
- **Expected:** Escape closes the dialog; focus moves into the dialog on open; the X is a focusable button.
- **Actual:** The overlay stays open both times. `document.activeElement` after opening is still the `SPAN.coin-ic` trigger behind the scrim.
- **Root cause (code reading):** `src/components/Modal.jsx` has **no Escape handler at all** — its only `keydown` listener handles Tab and is attached only when `trapFocus` is true (ONBOARD-GATE). The close control is `<div className="cm-close" role="button" aria-label="Close">` with no `tabIndex`/`onKeyDown`, so a keyboard user cannot reach or activate it either. Because every popup goes through the shared `<Modal>` (R15), this affects CoinInfo, Detail, Buy/Sell, Journal, Buy-Journal prompt, new-portfolio dialog.
- **Suggested fix:** in `Modal.jsx` add a document-level `keydown` Escape → `onClose()` when `!hideClose`, always move focus into the card on open (and restore it on close), and render the close control as a real `<button type="button">`.

### P03-03 (repeat) · High · CoinInfo for a non-held DeFi coin is entirely mock data
- **Steps:** Search → `curve` → tap the Curve DAO icon.
- **Actual:** `CRV · Rank #78 $0.5800 +3.40% today`, `Market cap $720.00M`, Price History "1 Year / 6 / 3 Months Ago $0.5800 +0.00%". Live (`/api/prices`): $0.1852, +6.62%, rank #124, cap $294M. Same picture for LDO ($2.15 vs live $0.2378) and MKR. Repeat of persona finding P03-03 (not yet in BUGS.md).

### P05-04 (repeat of P03-02) · High · Buy form for Curve opens with the mock price $0.58 as a *manual* value, AUTO off, while a correct "Suggested price: $0.1787" is shown underneath
- **Steps:** DeFi degen → Curve DAO (just added) → + Buy.
- **Actual:** Price field `0.580000`, AUTO pill not active, hint "Suggested price: $0.1787 · tap AUTO to use". Typing an amount and submitting records 3.1× the live price ($0.1852). Changing the date switched it to the history value `0.211365`, so the bad value only bites on a "today" buy. Reproduced on LINK (18.20 with AUTO on) and LDO (2.33 vs live 0.2378, AUTO on).
- **Repeat of P03-02 / BUG-023** (still open).

### P05-05 (repeat of P01-08 / P02-13 / P03-01) · Medium · Three-decimal dollar amounts on the Curve Detail card, and they disagree with the transaction row
- **Actual:** `Bought 5,000 CRV · $1,056.825`, `Total P/L −$130.865 (-12.38%)`; the transaction row for the same buy shows `$1,056.83`. Repeat of the persona finding (not yet in BUGS.md).

### P05-07 (repeat of P02-03 / P03-08, still open) · Medium · Pulse 7D/30D and "who drove the move" treat a coin with no loaded history as 0%, so the DeFi degen book's drawdown is understated by ~10 points and "Curve DAO drove about 100%" is false
- **Steps:** DeFi degen (4,000 LDO + 5,000 CRV, ~51/49) → Research → Pulse 30D, then 7D.
- **Expected (from `/api/history?id=…&days=365`):** LDO 30D −37.9%, CRV 30D −48.1% → book ≈ −43%; 7D LDO −15.2%, CRV −10.5% → ≈ −13%; both coins contribute.
- **Actual:** `30D −32.2%` "Curve DAO drove about 100% of that move"; `7D −4.7%` "Curve DAO drove about 100%". The numbers reconcile exactly with LDO = 0% (LDO's app history request `/api/history?id=lido-dao` — no `days` — returns `{"prices":[]}`). Same on Blue-chip DeFi: "Uniswap drove about 65%" while MKR (49% of the book) has no history at all. Reproduced on both books and after switching back and forth.
- **Repeat of P02-03/P03-08** (not yet in BUGS.md). Fourth, quantified (15:30): Blue-chip DeFi (15 AAVE / 150 LINK / 250 UNI) Pulse 7D says **−6.7%**, "Uniswap drove about 90%"; from `&days=365` history the true 7D is **−8.4%**, and −6.8% is exactly what you get with LINK frozen at 0%. Third reproduction: AAVE solo + 90 LINK (50/50) → "Over the last 30 days, Aave drove about 100% of that move" (LINK's app history is the cached empty answer from P05-01). Suggested fix: `src/features/research/utils/priceAdapter.js` / `utils/pulse.js` — mark a coin with no history as "unknown" and either exclude it from the period figure with an explicit "(N coins without history excluded)" or suppress the attribution line; plus the server fix in P05-01.

### P05-08 (repeat of P03-09) · Low · Stress test "beta" is by position-size order, not by coin
- `src/features/research/utils/portfolio.js:28,131` `BETA_BY_RANK=[1.0,1.1,1.4,1.6,1.8]` is indexed by allocation order, so on Blue-chip DeFi the made-up-price MKR (largest) gets β 1.0 and the real top-30 coin UNI gets 1.1; on DeFi degen LDO (β 1.0) vs CRV (1.1) flips if one buy changes the order. −50% on DeFi degen → −52.5%. The copy "each coin moves with the market scaled by its typical volatility" does not describe this. Repeat of P03-09.

### P05-09 · Medium · Research risk meter files Maker as "small/unranked" (49% of the book) while Search lists it as rank #48, and the risk advice tells the user to size down a coin whose value is invented
- **Steps:** Blue-chip DeFi → Research → Portfolio risk.
- **Actual:** "Top-50 coins are 51% of your book, mid-ranked 0%, small/unranked 49%. Small or unranked coins are the highest-risk tier — sizing them down would lower this." The 49% is MKR, valued at the mock $2,850 (P05-03); Search/CoinInfo show "MKR · #48". Two contradictory ranks for one coin and an allocation weight that exists only because of the mock price.
- **New** (consequence of P05-03). Fix with P05-03; additionally show which coin is "unranked" so the user can see why.

### P05-10 · Medium · Searching "aave" lists Aave 3–5 times (all at the mock $105.00), because the built-in coin table contains Aave twice — React duplicate-key errors make the list grow on each keystroke
- **Steps:** Search tab → type `aave` → 3 rows (`AAVE · #45`, `AAVE · #45`, `AAVE · #74`, all `$105.00 +2.60%`). Select the text and type `AAV` → **5 rows** (four `#45`, one `#74`).
- **Expected:** one Aave row with the live price ($98.14–98.78, rank #50 — `/api/search?q=aave` returns exactly one coin).
- **Actual:** duplicated rows; console shows 5× React `Encountered two children with the same key … aave`. Every row is a working "+ Add", and none of them show the live price/rank. Reproduced twice.
- **Worse — ghost rows leak into other searches (re-verified at ~15:27):** after searching `aave`, typing `mkr` showed `Aave AAVE · #45 $105.00 Added` **above** `Maker MKR · #48`, and typing `steth` showed the same orphan Aave row above `Lido Staked Ether`. React's duplicate-key reconciliation leaves a stale DOM node that no longer matches the query. Reproduced on two follow-up queries.
- **Root cause:** `src/utils/coins.js` has two `TOP_COINS` entries with `id: "aave"` (lines 51 and 80, ranks 45 and 74). `src/hooks/useCoinSearch.js` dedupes live results against the local list but never dedupes the local list itself, and the Search list is keyed by `coin.id`.
- **New.** Suggested fix: delete the duplicate at `coins.js:80` and add a unit test asserting `TOP_COINS` ids are unique; optionally dedupe `sr` in `useCoinSearch`.

### BUG-038 (repeat, still open) · Low · Daily Brief shows a green ▲ for a down day
- **Steps:** AAVE solo book (10 AAVE, 24h −0.51%) → Research.
- **Actual:** `▲ Portfolio is down $5 (−0.5%) over the last 24 hours.` — the icon element is `span.brief-ic.ic-up`, colour `rgb(10,107,77)` (accent green). The DeFi degen (+5.0%) and Blue-chip (+1.4%) books correctly showed ▲ for up days, so only the down case is wrong. Repeat of BUG-038 (`OverviewView.jsx:33` hard-codes `ic-up ▲`).

### BUG-037 (repeat, still open) · Low · Stress test says "higher-beta holdings amplify the swing" when nothing is amplified
- **Steps:** AAVE solo (single coin) → Research → Stress test → Home (−50%), then −20%.
- **Actual:** "A 50% market drop would move you to about $494 (−50.0%). Your higher-beta holdings amplify the swing." and "…$790 (−20.0%). Your higher-beta holdings amplify the swing." Repeat of BUG-037. Root cause (code reading): `src/features/research/components/StressTest.jsx:31` always appends the sentence; with a single coin `BETA_BY_RANK[0]=1.0` so `changePct === move`. Suggested fix: only append it when `|changePct| > |move|` by a margin.

### P05-11 (repeat of P03-10) · Low · Risk copy for a 100% single-coin book: "Mostly top-ranked coins, which keeps single-coin risk lower"
- AAVE solo → Portfolio risk: "Top-50 coins are 100% of your book … Mostly top-ranked coins, which keeps single-coin risk lower." — while the notes card right below says "Everything you hold is in a single coin". Same copy after adding LINK 50/50: "Your top two coins make up about **100%** of your portfolio" for a 2-coin book, while the Pulse in the same view says "Overall this book reads as **Low** risk" right above "That's a concentrated book". Meter = Moderate (BUG-036 said 100% UNI read Low; for AAVE at rank #50 it reads Moderate, so BUG-036 is not conclusively re-checked). Repeat of P03-10.

### P05-12 (repeat of P02-04, still open) · Medium · Journal detail highlights "Yes, still holding" even when the thesis is Challenged
- **Steps:** Blue-chip DeFi → Journal → Aave → "Reconsidering" (list pill becomes 🔴 Challenged) → reopen Aave.
- **Actual:** the three decision buttons render as `Yes, still holding` = `btn-primary` (filled black), `Need to research` / `Reconsidering` = `btn-ghost`. The current status is never reflected; a DeFi user re-reviewing a challenged thesis sees "still holding" as the selected answer. Reproduced on two reopenings, and a third time after switching it to "Need to research" (list pill 🟡 Review; detail still highlights "Yes, still holding"). Note the list uses the same 🟡 for both "Review" and "Incomplete". Repeat of P02-04 (not yet in BUGS.md). Suggested fix: `src/components/Journal.jsx` detail overlay — derive the primary style from `j.status` (`intact`/`review`/`challenged`).

### P05-13 · Low · A funnel-only journal entry shows the research finding in the list as if it were the thesis, with no label
- **Steps:** Journal → "Add thesis" on Chainlink → type only "Dilution & token unlocks" → X (R24 auto-save). Repeat with Maker → only "Real yield" → X.
- **Expected:** list card says e.g. "Research findings recorded — thesis not written yet" or prefixes the field name ("Dilution: …").
- **Actual:** cards read `Chainlink · Node rewards + foundation sales; ~2-3%/yr net dilution. 🟡 Incomplete` and `Maker · Sky savings rate funded by RWA + stability fees. 🟡 Incomplete` — indistinguishable from a real thesis; opening the entry shows "Why you bought it —". Reproduced twice.
- **Cause:** `src/components/Journal.jsx:38` falls back `j.thesis || j.changeMyMind || Object.values(j.funnel)[0]`. **New.** Suggested fix: prefix the fallback with the funnel field's label from `FUNNEL_FIELDS`, or show "No thesis yet · 1 research finding".

### P05-14 · Low · Inconsistent "close with X" behaviour between the two thesis prompts
- Journal → "Add thesis" → X **saves** partial input (thesis-only or finding-only) as 🟡 Incomplete (R24). Search → "Before you add…" → X or "Skip for now" **discards** the same partial input silently (P05-02 / P02-02). Same fields, same `FUNNEL_FIELDS`, opposite outcome. Re-checked at 15:31: DeFi degen → Search `chainlink` → + Add → typed a thesis → X → the coin is not added and re-opening the prompt shows an empty thesis (P02-02 repeat). **New** (consistency). Suggested fix: make the Search prompt follow R24 (save a partial journal with the coin) or warn before discarding.

### P05-15 (repeat of P01-03 / P02-18) · Medium · After a partial sell, Portfolio and Research disagree about the same book's gain
- **Steps:** Blue-chip DeFi → Uniswap → Sell 150 UNI @ AUTO $4.72 → compare Portfolio value card with Research Pulse.
- **Actual:** Portfolio: `$7,956.36 ▲ +$1,429.76 (+19.76%) INVESTED $7,234.60`. Research: "Against a $6,297 cost basis you're up $1,659 (26.3%)." Same book, two gains, neither says which method (gross-buys vs remaining cost basis). Repeat of P01-03/P02-18 (not yet in BUGS.md).
- **Worse after a full exit (reproduced on a second book):** DeFi degen → sell all 4,000 LDO @ $0.2386 (bought @ $0.36). Portfolio card: `$927.41 ▼ −$615.02 (-24.63%) INVESTED $2,496.83` (includes the realised LDO loss). Research Pulse: "Against a $1,057 cost basis you're **down $129 (12.2%)**" — the $485.60 realised loss on LDO simply disappears from Research, so the Pulse makes the degen book look 5× better than it is. Related: P01-04 (no realised/unrealised split).

### P05-16 (repeat of BUG-023 / P03-02 — new surface: Sell) · High · The Sell form pre-fills the mock price too
- **Steps:** Uniswap → − Sell.
- **Actual:** Price `12.40` (mock) with AUTO off and "Suggested price: $4.72 · tap AUTO to use"; live is $4.71. A sell submitted as-is books 150 UNI × $12.40 = $1,860 instead of $708 — a fake realised profit of ~$1,150. Reproduced on Uniswap twice (form re-opened). Repeat of BUG-023 (still open), worth noting the sell side in the fix's test.

### P01-05 (repeat) · Low · Oversell message on a new sell gives no maximum
- Selling 500 UNI while holding 400: "Can't save — a sell on 2026-11-22 would exceed your holdings. Delete or reduce that sell first." (no "you hold 400 UNI"; and "Delete … that sell" refers to the sell being typed). Repeat of persona finding P01-05.

### P05-17 · Low · Research never says which portfolio it is describing, and has no portfolio switcher
- **Steps:** With 3 portfolios (Blue-chip DeFi / DeFi degen / AAVE solo) open Research; switch book on the Portfolio tab; return to Research.
- **Expected:** a DeFi user comparing books should see "Blue-chip DeFi" (or a chip switcher) on the Brief/Pulse — the Research numbers change completely between books ($7,956 vs $1,877 vs $988).
- **Actual:** the Research header is "Research · BETA · LIVE · STARTER" and the Brief starts "Good day — Here's what moved while you were away."; the portfolio name appears nowhere on the tab (checked desktop light/dark and a 375px iframe). The only way to compare is Portfolio tab → chip → Research tab, every time (and the tab re-opens at the previous scroll position, P03-12). Same on Journal (P02-05). **New** (UX). Suggested fix: show the active portfolio name in the Research Brief header (and optionally reuse the `.port-pills` row).

### P05-18 · Low · At phone width the portfolio pill row hides the rename pencil off-screen with no affordance
- **Steps:** 3 portfolios → `/app` in a 375px same-origin iframe (window is maximised, `resize_window` has no effect).
- **Actual:** `.port-pills` is `overflow-x:auto` with `scrollWidth 398 > clientWidth 357`; the rename button sits at x 341–380 (cut off), the row shows no fade/arrow. Also re-observed: STARTER badge under the avatar and the 2-line "● LIVE" pill (P03-11/P04-26). **New** (minor). Suggested fix: a right-edge fade on `.port-pills`, or move the pencil before the pills.

### P05-19 (repeat of P01-02, still open) · High · An edited transaction reverts on screen as soon as another coin gets a new trade
- **Steps:** Blue-chip DeFi → Chainlink → tap the BUY row → price 9.00 → 9.10 → Save Changes (Detail shows `$1,365.00 · Avg $9.10`) → close → Aave → + Buy 3 AAVE @ 98.88 → close → reopen Chainlink.
- **Expected:** Chainlink stays at $9.10 / $1,365.00; value card INVESTED = 7,234.60 + 15.00 + 296.64 = **$7,546.24**.
- **Actual:** Chainlink Detail is back to `Bought 150 LINK · $1,350.00 · Avg Buy Price $9.00 · Total P/L −$31.50`; value card shows `INVESTED $7,531.24` and `+$1,428.46`. After a page reload it shows `INVESTED $7,546.24` / `+$1,413.46` — the edit **was saved**, only the screen reverted. **Reproduced a second time at 15:32:** LINK BUY edited $9.10 → $9.20 (Detail showed `$1,380.00`), then BUY 10 UNI @ $4.71 → Chainlink Detail back to `$1,365.00 · Avg $9.10` and INVESTED `$7,593.34` instead of `$7,608.34` — it reverts to the *previous saved* value, not to the original. After reload: `$1,380.00 · Avg $9.20`, INVESTED `$7,608.34` (saved correctly). A DeFi user correcting a fill price, then trading another coin, sees the wrong cost basis until reload. Repeat of P01-02 (not yet in BUGS.md).
- **Suggested fix (to confirm):** the C-A3 `watchCoins` path re-reads only the changed coin's transactions; the edit path likely doesn't update the cached `entries` for the edited coin (or a stale snapshot is merged back on the next coin-doc change). Check `src/api/firebase-database.js` `watchCoins` + the edit handler in `src/CryptoIdea.jsx`.

### P05-20 · Medium · The Edit form for an Aug-2026 Chainlink buy suggests the mock price "$18.20" as "the market price for this date"
- **Steps:** Chainlink → tap the 2026-08-15 BUY row (Edit LINK).
- **Actual:** "Suggested price: $18.20 · tap AUTO to use"; the real 2026-08-15 price was ~$8.96 (`/api/history?id=chainlink&days=365`). Tapping AUTO would double the recorded cost. Same root cause as P05-01 (empty, 24h-cached history) + BUG-023 (mock seed). Reproduced on two opens of the edit form. Repeat family of BUG-025 (estimate presented as market price).

### P05-21 (repeat of BUG-023, worst case seen) · High · Selling Lido DAO pre-fills $2.33 with AUTO **on** ("Using the market price for this date") while LDO trades at $0.2386 — a 9.8× price
- **Steps:** DeFi degen → Lido DAO → − Sell → type 4000.
- **Actual:** Price `2.33`, AUTO pill active, `Sell value $9,320.00`. The true value is ~$954. Submitting would book a ~$7,900 fake realised gain on a coin that lost 34%. Same 2.33 appeared on the Buy form earlier (P05-04). Reproduced on Buy and Sell. Repeat of BUG-023 (still open) — the Lido figure is the built-in estimate table (`src/utils/coins.js` history for `lido-dao`), not even the mock price ($2.15), so the fix must cover both seeds.

### BUG-028 (repeat, still open) · Low · The Learn modules that teach the three Journal funnel checks are locked
- **Steps:** Learn → click "Real Yield & Sustainability" (also "Tokenomics & Supply", "Spotting Real Demand").
- **Actual:** padlock, nothing happens (dark mode, desktop). For the DeFi persona this bites specifically: the Search/Journal prompts ask for "Dilution & token unlocks", "Real volume", "Real yield", and the three lessons that explain exactly those checks (modules 3–5) are locked behind module 1, while the landing promises all 9 modules open. Repeat of BUG-028.

### P01-14 / P02-19 (repeat) · Medium · Plan & billing says "AI research · Live — Research summaries & analysis — included in every plan" while AI is off
- Account → Plan & billing shows `AI research Live`; Research shows no Ask/Coins/AI (aiResearch default-OFF). Repeat of the persona finding (not yet in BUGS.md).

### P05-22 (repeat of P04-27) · Low · Account "Joined" shows the date of the last fresh-cache login, not the sign-up date
- **Steps:** Log in as p05 → Account → Plan & billing.
- **Expected:** Joined 2026-11-21 (the Auth record's `createdAt` in the browser's Firebase store is `2026-11-21T17:19:37Z`; the account's first UNI buy is dated Nov 21).
- **Actual:** `Joined 2026-11-22`.
- **Cause (code reading):** `src/hooks/useAuthSession.js:92` defaults `joined` to `new Date().toISOString().split("T")[0]` (today, UTC) and deliberately does **not** take `joined` from the server (comment at :95 — Firestore returns a Timestamp); only a local `ci-profile-<uid>` cache can override it, so any new device / cleared cache shows today. Seen in the UI; the local cache now holds `joined: "2026-11-22"` for this uid (checked in `localStorage`), i.e. the value was minted at today's login. **Repeat of P04-27** (found independently; not yet in BUGS.md). Related, already planned: ISOLATION.md G4 / ISO-3 — `localStorage` on this shared test browser still holds `ci-profile-<uid>` caches (email, name, tier, settings) for two other accounts that are no longer signed in. Suggested fix: use the Auth `metadata.creationTime` (ADMIN-4 already treats it as the source of truth for signups) or convert the server `joined` Timestamp to a date string before rendering.

### P05-23 · Low · Portfolios can share the same name, so the books become indistinguishable
- **Steps:** Rename "DeFi degen" to `Blue-chip DeFi` via the header pencil; then Account → Portfolios → rename "AAVE solo" to `Blue-chip DeFi`.
- **Actual:** both saves succeed silently; the header shows `Blue-chip DeFi | Blue-chip DeFi* | Blue-chip DeFi` and Account → Portfolios lists three identical names (only the coin count differs). Combined with P05-17 (Research/Journal never name the book) a user can no longer tell which book a Research view describes. Reproduced twice (two entry points). Blank/whitespace names are correctly refused ("Enter a portfolio name"); a 50-char name with `<b>…</b>` and emoji is stored and rendered literally (escaped) — good. Names restored afterwards.
- **New.** Suggested fix: reject (case-insensitive, trimmed) duplicates in the add/rename handlers (`updatePortfolioName` / `addPortfolio` callers in `src/CryptoIdea.jsx`) with "You already have a portfolio called …".
- Also: Account → Portfolios shows "**1 coins**" (no singular). Low copy nit.

### BUG-032 (repeat, still open) · Medium · Portfolio-cap toast upsells a plan that can't be bought
- Account → Portfolios (3/3) → type "LST farm" → + Add → toast `Starter: 3 portfolios — upgrade to Pro for 6`. Paid plans are off and the landing says single Starter tier. Repeat of BUG-032. (The "+ Add" control is still offered at 3/3 while the header "+" chip correctly disappears.)

### P03-13 / P03-14 (repeat) · High · Landing DCA: Lido DAO says "No historical data available in offline demo mode" while the server is up, and keeps showing Bitcoin's invented result underneath
- **Steps:** `/#dca` → coin field → `Lido` → pick "Lido DAO · LDO · #151" (weekly $100, 2023-11-22 → 2026-11-22).
- **Actual:** red "No historical data available in offline demo mode. On the live site, every coin in your library is supported." — the stack is live and `/api/history?id=lido-dao&days=365` returns 366 points; the result card below still reads "Coin Bitcoin (BTC) · $15,700 → $19,461 · Price today $103,000" (BTC live ~$60k). Reproduced twice: BTC default → LDO (Bitcoin's numbers stay), and Uniswap → LDO ("Coin Uniswap (UNI) · $5,300 → $5,938" stays under the LDO selection). Uniswap itself also silently ran 1 year instead of the chosen 3 (53 buys / $5,300 — P03-14 #3). Repeat of P03-13 + P03-14 #4 (not yet in BUGS.md). Note the landing lists LDO as **#151** (live) while the app's Search lists it as **#32** (mock) — same coin, two ranks (P03-04).

### BUG-022 (repeat, still open) · Low · Green "+$0.00 (+0.00%)" on an empty or break-even holding
- Aave Detail right after adding (0 AAVE): `Total P/L +$0.00 (+0.00%)`; LINK bought at exactly the live $8.78: `+$0.00 (+0.00%)` rendered in green (`.pnl-val`, `rgb(92,214,166)` in dark mode). Empty DeFi degen / AAVE solo books show header `24H +0.00%` in green. Repeat of BUG-022.

### P01-11 / P03-15 (repeat) · Low · Delete-coin warning claims "your saved thesis" for a coin with no thesis; the trash button has no accessible name
- AAVE solo → Chainlink (no thesis in this portfolio) → trash → "This coin has 1 buy/sell transaction **and your saved thesis**." The trash control is an unnamed `button` in the accessibility tree. Repeat of the persona findings (not yet in BUGS.md).

### P05-24 · Medium · A stablecoin position is stress-tested as if it were the riskiest-to-market coin: a book that is 66% USDC "loses 54.3%" in a 50% market drop
- **Steps:** AAVE solo (8 AAVE + 90 LINK) → Search `usdc` → add USDC → Buy 3,000 USDC @ $1.00 → Research → Stress test → Home (−50%), then −20%.
- **Expected:** USDC (a $1 stablecoin) barely moves; a −50% market should take this book down roughly −17% (only the 34% in AAVE/LINK moves).
- **Actual:** "A 50% market drop would move you to about $2,091 (**−54.3%**). Your higher-beta holdings amplify the swing." and at −20%: "$3,583 (−21.7%)". USDC is the largest position, so `BETA_BY_RANK[0] = 1.0` makes it fall 1:1 with the market (`src/features/research/utils/portfolio.js:28,131`). The Pulse also calls the book "concentrated — spreading across more assets is one way to lower single-coin risk" because USDC is 66%. For a DeFi user who parks dry powder / LP collateral in stables, this is the opposite of the truth. Reproduced at −50% and −20%, and re-checked at 15:33 at +50%: "$7,059 (+54.3%)" — the 3,000 USDC is modelled to rise 50% too.
- **New** (DeFi-specific consequence of P03-09). Suggested fix: give known stablecoins (USDT/USDC/DAI…, there is already a list in `src/utils/coins.js:464`) β≈0 in `stressScenario`, and exclude them from the concentration/top-two facts in `utils/pulse.js` / `utils/notes.js` (or say "66% in stablecoins").

### P05-25 · Low · Risk card calls USDC "Your $100B+ anchor" — USDC's market cap is $68B
- **Steps:** same book → Research → Portfolio risk.
- **Actual:** "Top-50 coins are 100% of your book … Your **$100B+ anchor (66%)** is holding the risk at Low." `/api/prices` → USDC cap $68B, rank #5. The code treats "mega" as `≥$100B cap OR top-10 rank` (`src/features/research/utils/portfolio.js:61`) but the copy (`:119`) always says "$100B+". Seen twice (before and after moving the stress slider; it is static copy). **New.** Suggested fix: say "top-10 anchor" (or "large-cap anchor"), and don't count stablecoins as a risk "anchor" at all (see P05-24).

### P05-26 · Low · USDC shows "−0.00%" (negative zero) as its 24h change
- USDC Detail/card: `$0.9994 -0.00% (24h)`; Search row `+0.00%`. A rounded-to-zero negative change keeps its minus sign (and a hyphen, BUG-026). Seen on the card and the Detail popup at ~15:12 (24h change slightly negative); at 15:34 the change had turned slightly positive and both card and CoinInfo read `+0.00%`, so the sign of a rounded zero flips with noise. CoinInfo also shows `Unrealised P/L −$1.749 (-0.06%)` (three decimals, P05-05). **New** (minor). Suggested fix: normalise `Object.is(rounded, -0)` to `0` in `fmtPct` (`src/utils/format.js`).

### P05-27 · Low · Any 2- or 3-coin book is called "concentrated", even a perfectly balanced one — and the Allocation card disagrees
- **Steps:** Blue-chip DeFi after exiting MKR → AAVE 37% / LINK 33% / UNI 30% → Research.
- **Actual:** Pulse: "by size, your 3 coins act like about **3.0** equal-weight positions. Overall this book reads as Low risk. **That's a concentrated book** — spreading across more assets…"; note: "Your top two coins make up about 70%…". The Allocation card in the same view shows **no** "High concentration" tag (it did show one at 54% MKR and on 50/50 books). With 3 coins the top two are always ≥ 66.7%, so `notes.js` rule `n >= 2 && top2 >= 60` (`src/features/research/utils/notes.js:59`, relevance 88) always beats the "few holdings" rule (`n 2–4`, relevance 72), which therefore can never be shown for 2–3 coins. Reproduced on two books (AAVE solo 50/50 → "about 100%"; Blue-chip 37/33/30 → "about 70%"). **New.** Suggested fix: scale the top-two threshold by `n` (e.g. compare to `2/n + margin`) or use effective-N, and use one shared "concentrated" predicate for the Allocation tag, the Pulse line and the note.

### P05-28 (repeat of P05-03, Sell side) · High · Selling Maker pre-fills the invented $2,850 with AUTO on ("Using the market price for this date")
- **Steps:** Blue-chip DeFi → Maker → − Sell.
- **Actual:** price `2850.00`, AUTO pill "Using the market price for this date" — there is no market data for this coin at all (`/api/prices?ids=maker` → `{}`). I typed a real fill of $1,700; submitting the default would have booked $4,275 of proceeds. Same coin, second surface after P05-03.

### P01-10 (repeat) · Low · Wrong copy after a modestly profitable exit
- Maker: bought 1.5 @ $1,600, sold 1.5 @ $1,700 → `Total P/L +$150.00 (+6.25%)` followed by "**Sell proceeds exceed buy costs — you already profited more than your total investment**" (a 6% gain, not a >100% gain). Repeat of P01-10 (not yet in BUGS.md).

### P02-12 (repeat) · Medium · CoinInfo for a held coin: live price on top, mock "Today $12.40" in Price History
- Blue-chip DeFi → Uniswap icon: header `$4.69 +4.10% today`, Market data live (rank #29, cap $2.85B, vol $293.60M), but Price History "1 Year / 6 Months / 3 Months Ago $12.40 −62.18% · **Today $12.40**". Repeat of P02-12 / P01-09 (not yet in BUGS.md).

### BUG-035 (repeat, still open) · Medium · Restore-account screen unreadable in dark mode
- Dark theme → Account → Privacy & data → Delete my account (password + DELETE) → log back in. The card is a pale/white panel on the dark page; the heading "Your account is scheduled for deletion" is near-invisible pale text on white, and the "Restore my account" button is an off-brand bright green. Restore worked and all three portfolios, coins, transactions and theses came back intact. Repeat of BUG-035.

### BUG-033 (repeat, still open) · Low · "Security & payment emails are always sent…" renders at 16px in an 11px card
- Account → Privacy & data: `div.usage-note` computed `font-size: 16px`; sibling helper texts ("Helps us improve…", "Download your portfolio…") are 11px. Repeat of BUG-033.

### P05-29 · Low · Privacy card says "permanently delete your account" for what is a 30-day restorable trash
- Account → Privacy & data intro: "…or **permanently delete** your account." The confirm step then (correctly) says "moved to trash … restore it within 30 days" and the button reads "Yes, delete my account (restorable for 30 days)". **New** (copy). Suggested fix: "…or delete your account (restorable for 30 days)".

### BUG-025 / P02-07 (repeat, still open) · Medium · Any Curve buy older than 365 days auto-fills the price from exactly one year ago
- **Steps:** DeFi degen → Curve DAO → + Buy → 100 CRV → Date 2019-05-01 (clamped, with a clear notice "Curve DAO launched on 2020-08-14. Date adjusted to earliest available.") → AUTO; then Date 2022-06-01.
- **Actual:** both dates AUTO-fill `0.370637`, which is the first point of `/api/history?id=curve-dao-token&days=365` (2025-11-23). CRV traded ~$3 in Aug 2020 and ~$1 in Jun 2022; CoinInfo's own "Launch" row says $2.75. Labelled "Using the market price for this date". Reproduced on two dates. Repeat of BUG-025 with the P02-07 root cause. (Form closed without saving.)
- Also: the date picker's `max` is `2026-11-22T23:59`, so a buy "later today" is accepted (P01-06 repeat).

### BUG-030 / BUG-029 (repeat, still open) · Low/Medium · Wrong quiz answer stays green; options are not controls
- Learn → module 1 → lesson 1 → pick "The team shipped a major product" → Submit → "Not quite — re-read The key insight above…", while the chosen `div.quiz-opt.selected` keeps the green tint (`rgba(31,157,85,0.18)`, border `rgb(10,107,77)`, dark mode). The options appear as `generic` in the accessibility tree (not buttons/radios). Repeats of BUG-030 and BUG-029.

### P05-30 · Low · A long unbroken Search query makes the whole page scroll sideways
- **Steps:** Search → paste a long string with no spaces. Desktop: 300×`a` → `documentElement.scrollWidth 2367` vs `1536`. 375px iframe: `uniswapuniswap…` (56 chars) → `scrollWidth 422` vs `357`. (A 42-char `0x…` contract address still fits at 375px.)
- **Actual:** the empty state `No results for "<query>"` (`div`, `overflow-wrap: normal`) runs off the card and the page gains a horizontal scrollbar. Reproduced twice (desktop + 375px). Other hostile queries (`<img src=x onerror=…>`, `%`, emoji, `$UNI`) render safely as literal text. **New.** Suggested fix: `overflow-wrap:anywhere` on the Search empty-state text (`src/components/Search.jsx` / `app.css`).
- Side note confirming P05-10: searching `  aave  ` (padded) returns a single, correct Aave row (`#50`, no mock price) because the local `TOP_COINS` matcher doesn't trim but the server search does.

### P02-05 (repeat) · Low · The same coin held in two books needs a second thesis; the Journal says "No thesis yet"
- AAVE solo → Journal: "NEEDS A THESIS (3) Aave · Chainlink · USDC … No thesis yet — tap “Add thesis” above to start your journal." Aave (🔴 Challenged, with three findings) and Chainlink (dilution finding) already have journals in Blue-chip DeFi. A DeFi user who splits one token across a core and a trading book has to rewrite (and keep in sync) the research per book. Repeat of P02-05 (not yet in BUGS.md); journal lives on the per-portfolio coin doc by design, so this is a product question rather than a defect.

### P05-31 · Low · "Delete thesis" says "only the thesis is removed" but also wipes the research findings
- **Steps:** Blue-chip DeFi → Journal → Maker (entry holds only a "Real yield" finding, no thesis) → Delete thesis → "Delete this thesis? Your coin stays in the portfolio — only the thesis is removed." → Yes.
- **Actual:** the whole journal (including the yield finding) is gone; Maker moves back to "Needs a thesis". Same confirm copy on Chainlink (dilution-only entry; cancelled with "Keep it"). Reproduced twice (copy). **New** (copy). Suggested fix: "…the thesis and your research findings are removed", or keep findings when only the thesis is deleted.

### P05-32 · Low · The "Verify your email" banner's ✕ only hides it until the next reload
- **Steps:** Portfolio → click ✕ (Dismiss) on "📧 Verify your email to secure your account." → switch tabs (stays hidden) → reload.
- **Actual:** the banner is back after every reload (reproduced twice). On the emulator no verification mail can be completed, but in production an unverified user who dismissed it sees it on every app open. Possibly intended (nag until verified) — flag for the founder. **New.** Suggested fix (if not intended): remember the dismiss for a period (e.g. 7 days) in `localStorage`, like the announcement banner's per-message dismiss (`src/utils/announcement.js`).

### P04-39 (repeat) · High · A comma decimal silently multiplies the amount by 10
- DeFi degen → Uniswap → + Buy → type `12,5` in Amount → the field holds `125`, "Total cost $1,550.00" (at the mock 12.40 pre-fill, BUG-023). Not submitted. A European-locale DeFi user entering 12,5 UNI would record 125. Repeat of P04-39 (not yet in BUGS.md).

### P05-33 · Low · Value card "ASSETS" counts coins you no longer hold
- **Steps:** DeFi degen after selling all 4,000 LDO: value card `ASSETS 2` with only CRV held (LDO 0). Later, after adding UNI with no buy: `ASSETS 2` (CRV + 0 UNI). Blue-chip after the MKR exit: `ASSETS 4` with 3 held coins. Reproduced on two books.
- **Expected:** "ASSETS" = coins with a non-zero position (or label it "Coins tracked"). Research's allocation correctly shows only held coins (CRV 100%), so the two tabs disagree on how many assets the book has. **New** (copy/logic). Suggested fix: count `holding > 0` in the value card (`src/components/Portfolio.jsx`), or rename the stat.

## Known bugs re-checked
| Bug | Result | Notes |
|---|---|---|
| BUG-004 false coin-limit toast (>2000-char thesis) | Appears fixed (guarded) | Textarea `maxLength=2000` + live counter; 1,990-char thesis saved |
| BUG-019 oversell / P&L integrity | Appears fixed | New sell of 500 UNI (holding 400) refused; editing the existing SELL to 500 refused; editing the earlier BUY 400 → 100 (below the later 150 sell) refused; full exits computed correctly |
| BUG-020 sync toast during setup | Not reached | Account already existed |
| BUG-021 Search mock prices / thesis saves mock | **Still present** | LINK, LDO, CRV, MKR, UNI, AAVE, stETH; CRV thesis saved $0.58 |
| BUG-022 green +$0.00 | **Still present** | Detail and empty-book header |
| BUG-023 AUTO pre-fills mock | **Still present** | Buy and Sell, 6 coins (worst: LDO 9.8×) |
| BUG-024 UTC time in Date & Time | **Still present** | 14:43 local → 12:43 |
| BUG-025 estimate labelled market price | **Still present** | CRV 2020/2022 → one-year-ago price; LINK edit suggests $18.20 |
| BUG-026 mixed minus signs | **Still present** | "−$36.00 (-2.67%)", header "24H -0.51%" |
| BUG-027 Escape doesn't close popups | **Still present** | Root cause: `Modal.jsx` has no Escape handler; X not focusable |
| BUG-028 Learn modules locked | **Still present** | Incl. the 3 modules that teach the funnel checks |
| BUG-029 quiz options not controls | **Still present** | `generic` in a11y tree |
| BUG-030 wrong answer stays green | **Still present** | Dark mode |
| BUG-031 name field strips characters | **Still present** | Typing `Dévi O'DeFi-Ño` in Account → Profile → Display name shows `Dvi ODeFio` (not saved; name left as "Dev DeFi") |
| BUG-032 upsell to unbuyable plan | **Still present** | Portfolio cap toast |
| BUG-033 oversized Privacy text | **Still present** | 16px vs 11px |
| BUG-034 deleted account credentials stay in form | **Appears fixed** | Email + password empty after delete (Log-in path) |
| BUG-035 restore screen dark mode | **Still present** | |
| BUG-036 100% single token rated Low | Inconclusive | 100% AAVE read Moderate; 100% CRV Moderate; AAVE+LINK 50/50 Low |
| BUG-037 stress "amplify" copy | **Still present** | −50% and −20% on a single-coin book |
| BUG-038 Brief always ▲ | **Still present** | "▲ Portfolio is down $5" |

## What worked well
- **Funnel findings persist end-to-end:** dilution / volume / yield typed in the Search prompt land on the coin, show in the Journal detail, can be edited with "Findings saved ✓", and are auto-saved when the overlay is closed with X (R24). Thesis validation (both questions required) and the 2,000-char cap with a live counter work.
- **Portfolio switching is solid:** 20+ switches including 7 rapid programmatic ones and "switch then immediately open Research" — the value card, coin grid and Research always showed the right book; no zero/wrong P&L flashes; the active book survives reload.
- **Notes rotate with the book:** drawdown note (DeFi degen at −25%), top-two concentration (Blue-chip), single-coin (AAVE solo, CRV-only degen), and back to top-two after adding LINK — each change of holdings produced the matching note, with no coin names and no links.
- **Integrity guards:** oversell on new sell, edited sell and edited buy are all refused (BUG-019 stays fixed); a double-click on "Add Buy" records exactly one transaction and a double-click on "Skip for now" adds the coin once (UNI to DeFi degen); blank portfolio names are refused; HTML in a name is rendered as text; back-dating before launch is clamped with a clear notice.
- **AUTO history works where data exists:** AAVE 2026-06-01 → $82.05 and CRV 2026-07-20 → $0.211365 match `/api/history`.
- **Live sync:** a sell entered in a second tab appeared in the first tab without reload.
- **Daily Brief 24h math is right:** Blue-chip "up $58 (+1.5%)" matches holdings × `/api/prices` 24h change exactly ($58, +1.5%).
- **Soft delete → restore** brought back all three books, nine coins, transactions and theses; the login form was empty afterwards (BUG-034 appears fixed).
- Dark mode is readable on Portfolio, Research, Journal, Detail and Learn; no horizontal scroll at 360/375px on Portfolio, Research, Search prompt and Detail.

## Timeline
(local time, UTC+2; start epoch 1795351278; times from `date` checks during the run)
- 14:41 Start; health check (`:3000/app` 200, `:5001` 404 = up); report created. Logged out a leftover P04 session; logged in as p05 (account already existed; not re-registered).
- 14:42–14:46 Search → AAVE (thesis + all 3 findings), LINK (funnel → Skip), MKR (Skip); back-dated buys — BUG-021/023/024 repeats, P05-01 (empty cached history), P05-03 (MKR valued at mock $2,850).
- 14:46–14:51 Renamed book "Blue-chip DeFi", created "DeFi degen": LDO + CRV (1,990-char thesis); CoinInfo mock (P03-03); Escape / `Modal.jsx` root cause (BUG-027); CRV Buy mock pre-fill (P05-04); Research on both books (P05-07/08/09).
- 14:51–14:56 "AAVE solo" (3/3) → BUG-038 ▲ on a down day, BUG-037; duplicate Aave search rows (P05-10); Journal findings edit/auto-save, status not reflected (P05-12), funnel-only preview (P05-13/14).
- 14:56–15:01 Rapid switching ×7; UNI partial sell, oversell, Sell mock pre-fill (P05-16, P05-15); 375px iframe + dark mode (P05-17/18); LINK edit reverts on screen (P05-19), edit-form $18.20 (P05-20); LDO full exit with 9.8× AUTO (P05-21).
- 15:01–15:06 Coin delete; CRV thesis saved $0.58; Learn locked modules; Plan & billing "AI Live"; "Joined" (P05-22); portfolio-name edge cases (P05-23), cap toast (BUG-032); two-tab live sync.
- 15:06–15:12 Landing DCA LDO/UNI (P03-13/14); AAVE solo + LINK; delete-coin copy, 2-step tx delete, Read popup, double-click guard; 360px Search prompt; USDC 66% → stress −54.3% (P05-24/25/26).
- 15:12–15:16 MKR exit (P05-28, P01-10); 3-coin "concentrated" (P05-27); CoinInfo held UNI (P02-12); thesis edit validation; Privacy card (BUG-033, P05-29); soft-delete + restore in dark mode (BUG-034 appears fixed, BUG-035 present).
- 15:16–15:22 CRV pre-launch / 2022 AUTO = one-year-ago price (BUG-025); logout/login ×2 (active book resets by design); Learn quiz wrong answer (BUG-029/030); switch-then-Research check (clean); hostile/long search queries (P05-30); Journal per-book (P02-05); Delete-thesis copy (P05-31).
- 15:22–15:30 BUG-031 recheck; verify-email banner (P05-32); price-poll wait; ghost Aave row in other searches (P05-10 strengthened); ASSETS count (P05-33); comma decimal (P04-39); Learn lesson 1 completed; oversell-by-edit (BUG-019 holds); double-click Skip (1 coin); Brief 24h math verified; Pulse 7D quantified (P05-07).
- 15:30–15:37 X discards Search-prompt thesis (P05-14/P02-02); 360px Journal detail; second reproduction of P05-19 (+ reload confirms save); Learn progress persists; final report checks; tab closed.
