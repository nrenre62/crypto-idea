# Persona 09 — Edge-case / adversarial tester · 1-hour test · 2026-11-22
Status: Complete | Account: p09.edge@test.com | Start 18:25 / End 19:21 (local, UTC+2) | Minutes tested: 55

**Summary:** 25 new findings (1 High, 9 Medium, 15 Low) + 17 known bugs re-checked (15 still present, 2 appear fixed). No XSS, no crash, no `$NaN`; the write guards (oversell replay, caps, cooldown, coin cap under concurrency) held. The biggest risks are silent data changes: comma/exponent input re-interpreted as a different number (P09-01), date edits overwriting a recorded price (P09-13), wrong cost basis after a full exit (P09-23), and typed theses lost on Back/refresh or a refused save (P09-08, P09-22).

## Persona
An adversarial QA tester who tries to break every input: hostile HTML/script/formula strings, extreme numbers, odd keyboard/navigation behaviour. Wants proof the app never crashes, never shows $NaN, never executes injected markup, and never silently loses or corrupts data.

## Data created
The account already existed (created in an earlier session: portfolio "My Portfolio" with 100,000 SOL @ $100 and 0.00000001 SOL @ $70 dated 2026-11-21, display name "SUM bEveb Edge"). Login worked with the given password; no registration was needed. Note: the shared Chrome profile was still signed in as `p08.organizer@test.com` when this run started — I logged that session out first.

| Portfolio | Coin | Transactions / data added this run |
|---|---|---|
| My Portfolio (original) | Solana | Buy 0.001 @ $70 (triple-click test → 1 write); Sell 100,000.00100001 @ $70 (sell-all, exact); Sell 0.00000000000001 @ $70 (accepted within 1e-8 tolerance) |
| `<img src=x onerror=alert(1)>` (created, later **deleted**) | — | empty; used for XSS + duplicate-name tests |
| `=HYPERLINK("http://x","c")` → renamed `My Portfolio` → `<img src=x onerror=alert(1)>` → **`Whale =1+1 <b>bold</b> ‮RTL`** (U+202E) | Ethereum | Thesis 2000 chars starting `<img src=x onerror=alert(1)><script>alert(2)</script>`, "change my mind" `=HYPERLINK("http://evil","click")`, funnel: 1000 emoji / 2000 B / 2000 C; status set Challenged. Buys: 999,999,999,999,999 ETH @ $1,000,000,000 (today 16:31 UTC); 0.5 @ $1,700 dated today 23:30; 0.25 @ $1,700 today 23:59; 0.1 @ $1 (typed 2010 → clamped to 2015-08-07) |
| `My Portfolio` (duplicate name, created via Account → Portfolios) | Pepe (later **deleted** from tab A) | Buys 0.00000000000001 @ $0.00000001 and 0.000000001 @ $0.0000118 (mock); thesis `=cmd\|' /C calc'!A0` (Incomplete) |
| same | Bitcoin | Buy 1 @ $60,000 (2026-11-20), Sell 1 @ $62,000 (2026-11-21), Buy 1 @ $61,000 (2026-11-21 12:00), Sell 1 @ $62,000 (2026-11-22 09:00), then 49 scripted buys (0.001–0.034 BTC @ $60,000/$60,500) to exercise the 50-per-page pager; deleted 3 (Nov 21 sell, Nov 20 buy, one 0.001 buy) → 50 left |

Later in the run: 28 more coins scripted into the second "My Portfolio" to reach 30/30 (ethereum … kaspa, then Render won the concurrent-add race); Cardano added + 10 @ $0.5 then deleted; thesis added to Algorand then deleted (dirty-edit + delete test); 10 SOL @ $70.50 re-bought in the first portfolio, which was renamed to 25× 🔥 (50 UTF-16 units = maxLength). Other state: Privacy "Allow product analytics" toggled 5× (ended ON) then switched back OFF; Learn module 1 lesson 1 answered wrong then right (50 XP, 1/50), lesson 2 answered wrong; theme switched Dark → System → Light → Dark → **Light** (left on Light). At the very end the active **Whale** portfolio (ETH + hostile thesis) was deleted via Account → Portfolios → "Delete anyway" to test deleting the active portfolio (clean fallback to the 🔥 portfolio, no NaN). A third, empty portfolio with an invisible name (`​​​`, then renamed `⁠‍`) was created afterwards and left in place as P09-10 evidence — final state: 🔥×25 (SOL), My Portfolio (30 coins), invisible-name (empty, active). Also: 0.123456789 ALGO bought @ $0.0751 and 0.1 ALGO sold @ $0.0755 (P09-24).

## Coverage
| Area | What was tried | Result |
|---|---|---|
| Buy/Sell form – numbers | negative, 0, `.`, `00000`, `.5`, `5.`, `1..2`, comma decimal, `1e9`, pasted `1e-5`/`-0.5`, 15-digit cap, > caps, 1e-14 dust | Fail — P09-01, P09-05, P09-06, P09-11 |
| Buy/Sell form – dates | future (2030), later today, before launch (2010), typed year 2012 | Partial — 2030 blocked, pre-launch clamped; later-today accepted (P09-07); BUG-024 still present |
| Oversell / replay guards | oversell new sell, backdated sell, delete a buy a sell depends on, edit buy down, move buy after its sell, sell-all exact | Pass (BUG-019 holds) — copy issue P09-02 |
| Double submit | 3 synchronous clicks on Add Buy; real double-click on "Skip for now" | Pass (1 write each); synchronous double-click on Skip gave a "too fast" toast after the success (not reproducible with a real mouse — not logged) |
| XSS / injection | HTML/script in portfolio names, thesis, search box, DCA coin search; formula strings; RTL override; NUL; 5000-char search | Pass for XSS (all rendered as text, no `img[src=x]` ever in DOM); P09-10 (bidi) |
| Max-length thesis | 2000 chars + 4×2000 funnel; 1000 emoji; 2001 via script | Pass (maxlength 2000; server rejects 2001 with a generic "That change isn't allowed right now.") |
| Keyboard | Escape in Detail, Buy, New portfolio, Rename, Delete-coin confirm, Journal detail, Lesson, CoinInfo; Enter in forms; Tab walk | Fail — P09-03 (BUG-027), P09-04, P09-21 |
| Back/forward/refresh | Back inside popups, forward (bfcache), F5 with a thesis draft | Fail — P09-08 |
| Multi-tab | delete coin in tab A while tab B has its Buy form open | Partial — write refused correctly, ghost UI (P09-15) |
| Portfolios | create/rename/duplicate/limit (3/3)/delete two-tap | Partial — P09-09, BUG-032 upsell repeat |
| Journal | hostile thesis, whitespace-only, partial save, rapid status toggling + reload, delete-confirm, Read/Breakdown | Pass (whitespace not saved; last status wins and persists) |
| Research | huge book, dust book, stress slider Home/End | Partial — P09-12, BUG-036/037 repeats; no NaN anywhere |
| Account | Profile name (hostile), Security (weak/wrong password), Privacy toggles, Plan & billing | Partial — P09-19, BUG-031 repeat |
| Auth | logout/login, wrong password, unknown email | P09-20 |
| Landing DCA | negative/0/1e12 amount, reversed/future/1990 ranges, hostile coin search | Fail — P09-16, P09-17, P09-18 |
| Pager | 53 transactions → 2 pages, delete back to 50 | Pass |
| Mobile (390/375 px via same-origin frame) | Portfolio with huge values, Journal detail with 2000-char thesis | Partial — huge values overflow (P09-06); thesis wraps fine |
| Dark mode | Portfolio, Detail, Buy form, Research, Journal | Pass (no unreadable text seen) |
| Coin cap / concurrency | 28 scripted adds to 29/30, concurrent add from 2 tabs, add at 30/30 with a typed thesis | Cap holds (pass); thesis discarded on refusal (P09-22) |
| Cost basis | full exit then re-buy (SOL), multi-lot BTC | Fail — P09-23 |
| Money formatting | sub-cent trades (ALGO), ≥ $1T books, negative zero | P09-24, P09-12, P09-11, P09-18 |
| Header at 375 px | all 5 tabs, light + dark | P09-25 (avatar overlaps tag on Portfolio/Research) |
| Routes / URL tampering | `/pro-success` (paid off), `/edge`, `/app?reset=<img…>#<img…>`, unknown `/app/does/not/exist` | Pass (no crash/injection; unknown path falls back to the landing page under the Vite dev server) |
| Console | checked after major flows | Clean — the only entry is one `MessageNotSentError` exception thrown by a browser extension on navigation (not app code) |

## Findings

### P09-01 · High · Comma decimal / exponent / minus are silently stripped into a different number
- **Steps:** Portfolio → Solana card → Detail → "+ Buy" (or "- Sell"). In *Amount* type `1,5` (or paste `1,5`). Also try typing `1e9`, pasting `1e-5`, pasting `-0.5`.
- **Expected:** `1,5` is either read as 1.5 (many locales use a comma decimal — this browser runs in a Hebrew/EU locale) or rejected with a visible hint; `1e-5` rejected or understood; never silently turned into a different value.
- **Actual:** `1,5` → **15** (10× the intended amount; Total cost updates to $1,875 and Add Buy is enabled). Typed `1e9` → **19**; pasted `1e-5` → **15** (1.5 million × the intended amount); pasted `-0.5` → `0.5`. No message tells the user anything was dropped. Same on the **Price** field: Sell SOL → Price typed `70,5` → **705** (Sell value $1,410.00 for 2 SOL instead of $141; Add Sell enabled) — a 10× proceeds error that the oversell guard can't catch. Reproduced 4× (amount typed, amount pasted, exponent, price typed).
- **Status:** New (the stripping is the intentional TX-SAFE design, but the *silent* re-interpretation of a comma/exponent is not covered by any bug).
- **Suggested fix:** `src/utils/format.js` `sanitizeDecimal`: convert a lone `,` to `.` when no `.` is present (or reject the paste) and, when a paste contains `e`/`E`/`-`/`,`, refuse it with an inline hint ("Use digits and a dot, e.g. 0.00001") instead of concatenating the surviving digits. Same for `blockDecimalKey` handling `,`. Applies to `src/components/AddEntry.jsx` amount + price fields.

### P09-02 · Low · Oversell error tells the user to "delete or reduce that sell" when the offending sell is the one being typed
- **Steps:** Hold 100,000.00000001 SOL → Detail → "- Sell" → Amount 200000 → Add Sell.
- **Expected:** Inline/toast: "You only hold 100,000.00000001 SOL — you can't sell 200,000." Ideally shown before submit (the form already knows the holding).
- **Actual:** Save is correctly blocked (BUG-019 guard works), but the toast reads "Can't save — a sell on 2026-11-22 would exceed your holdings. Delete or reduce that sell first." — wording meant for the replay case (an *existing* later sell). No inline warning; "Add Sell" stays enabled. Reproduced 3× (new oversell sell; backdated 2020 sell; editing a saved BUY into a SELL — "a sell on 2026-11-21 … Delete or reduce that sell first" where that sell is the row being edited).
- **Status:** New (copy/UX; data integrity OK).
- **Suggested fix:** in `addEntry` (`src/CryptoIdea.jsx`) use a different message when the first over-sold sell is the new entry itself; optionally show the max sellable amount under the Amount field in `AddEntry.jsx`.

### P09-03 · Medium · Escape closes NO popup, the X is not keyboard-reachable — BUG-027 is app-wide, not Detail-only
- **Steps:** (a) Portfolio → Solana card → Detail popup → press Escape (also after clicking inside it). (b) Detail → "+ Buy" → Escape. (c) Portfolio bar "+" → "New portfolio" dialog (focus is in the name input) → Escape. Then Tab through any popup looking for the X.
- **Expected:** Escape closes the top-most popup (standard `role="dialog"` behaviour); the X close control is focusable (Tab) and activates with Enter/Space.
- **Actual:** Escape does nothing in any popup — reproduced on Detail (3×, incl. once at the end of the run), Buy, New portfolio, Rename portfolio, Delete-coin confirm, Journal entry detail, Learn lesson and Coin info. The X is a `<div role="button" aria-label="Close">` with `tabIndex = -1` (no tabindex attribute, no key handler), so a keyboard-only user cannot close any popup at all; focus is also not moved into the dialog (stays on `<body>`) except on the forced plan gate.
- **Status:** Repeat of **BUG-027** — still open, and wider than logged (root cause found: `src/components/Modal.jsx` has no Escape handler anywhere; only the opt-in `trapFocus` path handles keys, and only Tab).
- **Suggested fix:** in `src/components/Modal.jsx` add a `keydown` listener for `Escape` → `onClose()` (skip when `hideClose`, and only for the top-most modal so stacked Buy-over-Detail closes one layer); render the X as a real `<button type="button" aria-label="Close">`; move focus into the card on open and restore it on close; add `aria-labelledby` pointing at `.cm-title`. Forms with `dismissOnScrim={false}` (AddEntry, Journal) may want Escape to route through the same save/confirm path as the X (Journal's `closeWithSave`).

### P09-04 · Low · Enter doesn't submit most single-purpose forms (Account → Portfolios add, Buy/Sell form, Profile name, Change password)
- **Steps:** (a) Account → Portfolios → type in "New portfolio name" → Enter. (b) Bitcoin Detail → "+ Buy" → Amount `0.1` (valid, price pre-filled) → Enter. (c) Account → Profile → Display name → Enter. (d) Account → Security → both password fields filled → Enter.
- **Expected:** Enter submits, as it already does in the Portfolio-bar "New portfolio" and "Rename portfolio" dialogs (which are inconsistent with the rest).
- **Actual:** Nothing happens in (a)–(d) (no toast, no save; only clicking the button works). Reproduced 2× on (a), 1× each on (b)–(d). None of these are wrapped in a `<form>` (`document.querySelector('[role=dialog] form')` → null on the Buy form).
- **Status:** New.
- **Suggested fix:** wrap each field group + its primary button in `<form onSubmit={e=>{e.preventDefault(); handler()}}>` — `src/components/Account.jsx` (Portfolios add, Profile name, Security), `src/components/AddEntry.jsx` (Add Buy/Sell — the existing `disabled={!valid||addingTx}` guard also protects the Enter path).

### P09-05 · Medium · A full (15-digit) Amount/Price field can't be overwritten by selecting it and typing
- **Steps:** Buy form → Amount `999999999999999` (15 digits, the cap) → click into the field → Ctrl+A (or triple-click) → type `2`.
- **Expected:** The selection is replaced by `2` (standard text-field behaviour).
- **Actual:** The keystroke is swallowed; the value stays `999999999999999`. Same on the Price field (Ctrl+A → `5` ignored; triple-click → `1000000000` ignored). The user has to Backspace/Delete first, with no hint why typing "does nothing". Reproduced 4× across both fields.
- **Status:** New.
- **Suggested fix:** `src/utils/format.js` `blockDecimalKey` counts the digits of the *whole* current value; it should subtract the selected range. In `src/components/AddEntry.jsx` `onDecimalKeyDown`, pass `el.value` with `el.selectionStart..selectionEnd` removed (type=number inputs don't expose selection, so either switch the fields to `type="text" inputMode="decimal"` or skip the digit-cap check in keydown and rely on `sanitizeDecimal` in onChange, which already caps at 15 digits).

### P09-06 · Low · Out-of-range values show an absurd live preview and overflow the dialog before being rejected on submit
- **Steps:** Buy ETH → Amount `999999999999999`, Price `999999999999999`.
- **Expected:** Inline validation as soon as the price exceeds the cap (`> 1e9`) or the amount exceeds `1e15`, with the limit stated; preview stays inside the card.
- **Actual:** "Total cost $999,999,999,999,998,000,000,000,000,000" (float precision artefact — should end …999,001) renders wider than the popup and adds a horizontal scrollbar to the dialog; "Add Buy" stays enabled and only the submit returns a toast "That price is too large." (limit not stated). With Price `1000000000` (= the cap) the buy is **accepted**, so the book now shows Invested $999,999,999,999,999,000,000,000.00, Portfolio value "$1,718,259,999,999,998,500.60" (fake cents from float error) and P/L "(-100.00%)". Reproduced 2×. **Mobile (390 px, checked in a same-origin 390 px frame):** the accepted value makes the page itself 576 px wide (`documentElement.scrollWidth` 576 vs 372) — `.port-total`, `.vc-gain` and the Invested figure run off-screen, giving a horizontal page scroll (breaks the "no horizontal page scroll" responsive rule). Also cosmetic at 390 px: the "● LIVE" header tag wraps onto two lines.
- **Status:** New (UX/display; server/client caps themselves work).
- **Suggested fix:** move the `_amt>1e15` / `_prc>1e9` checks from `addEntry` (`src/CryptoIdea.jsx:874-875`) into the shared `valid` computation in `src/components/AddEntry.jsx` so Submit disables with an inline message naming the limit; give the total row `overflow-wrap:anywhere` / `min-width:0`; consider a lower, realistic per-transaction notional cap (e.g. ≤ $1e12) since nothing above that can be a real trade.

### P09-07 · Medium · "Future date" guard is day-granular and uses the UTC day — trades hours in the future are accepted
- **Steps:** At 18:33 local (UTC+2) open Buy ETH → set Date & Time to today 23:30 (the picker allows it; its `max` is today 23:59) → Amount 0.5, Price 1700 → Add Buy. Repeat with 23:59.
- **Expected:** A trade later than "now" is rejected with "A transaction can't be dated in the future." (as 2030-01-01 correctly is).
- **Actual:** Both saved — the transaction list shows "Nov 22, 2026 11:30:00 PM" and "11:59:00 PM", 5+ hours in the future. Reproduced 2×. By the same code, in a UTC+ zone just after local midnight (e.g. 00:30 on the 23rd = 22:30 UTC on the 22nd) the picker `max` and the guard both use the UTC date, so a trade on the user's *real* today is refused as "future"; in a UTC− zone in the evening a trade dated *tomorrow* is accepted.
- **Status:** New (related to, but distinct from, BUG-024 which is the default "now" value being UTC). The code comment on `isFutureTx` says day granularity was chosen to avoid timezone *false rejects*; this finding is the opposite case (false accepts, plus false rejects in UTC+ zones right after midnight).
- **Suggested fix:** `src/utils/tx.js` `isFutureTx` should compare the full local datetime with `Date.now()` (e.g. `new Date(dateStr) > new Date()` + a small grace), and `src/components/AddEntry.jsx` `maxDateTime` should be built from local getters (current local datetime), not `toISOString().slice(0,10)+"T23:59"`. Fix together with BUG-024.

### P09-08 · Medium · Browser/phone Back inside any popup leaves the app; a typed thesis draft is silently lost
- **Steps:** (a) Landing `/` → `/app` → ETH card → Detail → "+ Buy" → press browser Back. (b) Journal → open an entry → Back. (c) Search → Bitcoin "+ Add" → type a thesis in "Why are you buying this?" → Back → return to `/app`.
- **Expected:** Back closes the top popup (users on Android/PWA use the system Back gesture for exactly this), or at minimum the app warns before discarding typed text. The "Add your thesis" X already auto-saves a partial thesis (R24), so Back should not be the one path that drops it.
- **Actual:** (a) and (b) navigate straight out of the app to the landing page (reproduced 2×; with no prior history Back is simply unavailable). (c) the thesis draft and the pending Bitcoin add are gone — no `beforeunload` prompt, nothing saved. Same with F5: Search → Cardano "+ Add" → type "Draft before refresh" → F5 → draft and pending add gone, no prompt (2nd reproduction of the data loss). Forward sometimes restores the old popup from the bfcache, which is confusing but harmless.
- **Status:** New.
- **Suggested fix:** in `src/components/Modal.jsx` push a history entry on open (`history.pushState({modal:true},"")`) and close on `popstate` (pop it on normal close); for text-entry modals (`dismissOnScrim={false}`: AddEntry, Journal add/detail, Search Buy-Journal, New portfolio, Rename) route `popstate` through the same handler as the X (`closeWithSave` in `Journal.jsx`, `closeOverlay` in `Search.jsx`) and register a `beforeunload` guard while a draft is dirty.

### P09-09 · Low · Duplicate portfolio names are accepted (create and rename) — two identical pills can't be told apart
- **Steps:** (a) Portfolio bar ✎ "Rename portfolio" → `My Portfolio` (already used) → Enter. (b) Rename again to `<img src=x onerror=alert(1)>` (already used). (c) Account → Portfolios → "New portfolio name" `My Portfolio` → + Add.
- **Expected:** "You already have a portfolio called My Portfolio" (case/whitespace-insensitive), as delete-confirm copy ("Delete My Portfolio?") and the portfolio switcher identify portfolios by name only.
- **Actual:** All three accepted; the bar shows two identical "My Portfolio" pills (only the active highlight distinguishes them), and the delete warning reads just "Delete My Portfolio? This portfolio has 30 coins…" — with two portfolios of that name the user must trust which row they tapped. Reproduced 3×. (Cosmetic, same screen: rows read "1 coins".)
- **Status:** New.
- **Suggested fix:** reject a trimmed, case-folded duplicate in `addPortfolio` / `updatePortfolioName` (`src/CryptoIdea.jsx`) with an inline/toast message.

### P09-10 · Low · Invisible Unicode (bidi overrides, zero-width chars) is accepted in names — reversed text and blank-looking portfolios
- **Steps:** Rename a portfolio to `Whale =1+1 <b>bold</b> ‮RTL` (contains U+202E RIGHT-TO-LEFT OVERRIDE).
- **Expected:** Invisible bidi control characters (U+202A–U+202E, U+2066–U+2069) stripped (or the name rendered with `unicode-bidi:isolate`), so a name can't visually lie about its content.
- **Actual:** Saved as-is; the pill renders "…<b>bold</b> **LTR**" (the trailing text is visually reversed). HTML is correctly shown as text (no XSS). Impact is limited because names are mostly self-visible, but they also flow into the admin "view as" snapshot and the CSV export. Reproduced 3× (bar pill, Account → Portfolios row, and the "Delete Whale … ‮RTL?" confirm title). Same root cause: a **New portfolio** named `​​​` (three zero-width spaces) saves fine and shows as an empty 34 px pill, and **Rename** to `⁠‍` (word-joiner + ZWJ) is also accepted — `trim()` doesn't remove these, so the "Enter a portfolio name" guard is bypassed. Reproduced 2× (create, rename).
- **Status:** New.
- **Suggested fix:** a shared `cleanName()` (e.g. in `src/utils/`) that strips C0/C1 controls, zero-width/format characters (`\p{Cf}`) and bidi overrides, then requires at least one visible character, for portfolio names, display names and thesis titles; mirror the length/charset rule in `firestore.rules` if names are validated there.

### P09-11 · Low · Dust amounts (< 1e-8) are accepted but display as "0 PEPE", with "$0.00" P/L and a large %
- **Steps:** Add Pepe → Detail → "+ Buy" → Amount `0.00000000000001`, Price `0.00000001` → Add Buy. Then "+ Buy" Amount `0.000000001` at the pre-filled price → Add Buy.
- **Expected:** Either a minimum amount (e.g. 1e-8) is enforced with a message, or the holding/transaction shows the real quantity (e.g. "0.00000000000001 PEPE" or `1e-14`).
- **Actual:** Both saved. Holding "0 PEPE", Bought "0 PEPE · $0.00", each transaction row "0 PEPE · $0.00", while Total P/L reads "+$0.00 (+34300.00%)" after the first buy and "−$0.00 (-70.85%)" after the second (a negative zero). A user sees a position of zero coins with a five-digit % gain. Reproduced 2×. (The existing SOL coin shows the same: card "100,000 SOL" vs Detail "100,000.00000001 SOL".) Related: after selling the full SOL holding (`100000.00100001`, accepted exactly — good), a further **Sell `0.00000000000001` SOL was accepted** and listed as "SELL 0 SOL", because `firstOverSoldSell` (`src/utils/tx.js:69`) tolerates a negative balance down to −1e-8; harmless in value, but it records a sell of coins the user doesn't hold.
- **Status:** New.
- **Suggested fix:** enforce a minimum positive amount (≥ 1e-8) in `src/components/AddEntry.jsx` `valid` + `addEntry`, or make the amount formatter fall back to significant digits for tiny values; render `−$0.00`/`+$0.00` as neutral `$0.00` when the rounded value is zero (`src/utils/money.js` `splitMoney`).

### P09-12 · Low · Research figures ≥ $1 trillion render as raw "$1720800000.0B" (no separators, no larger unit)
- **Steps:** Portfolio with a huge (cap-accepted) ETH position → Research → Overview: Daily Brief and Stress test.
- **Expected:** Readable compact form ("$1.72 sextillion"/"$1.7e21") or grouped digits, consistent with the Portfolio tab ("$1,718,259,999,999,999,700.32").
- **Actual:** Daily Brief "Portfolio is up $41138602.9B (+2.4%)"; Stress test headline "$1720800000.0B", "about $860400000.0B (−50.0%)". Reproduced on both cards and after moving the slider (Home/End). Only reachable with absurd values (≥ $1T), hence Low — but it shows the compact formatter has no upper bound or grouping.
- **Status:** New.
- **Suggested fix:** `src/features/research/utils/format.js` `abbreviate` — add `T` (1e12) and fall back to `toLocaleString()` grouping (or `Intl.NumberFormat(…, {notation:"compact"})`) above it. Related latent issue in the same file: `priceFmt` uses `toFixed(4)` for any price < $1, so a PEPE price ($0.00000344) would read "$0.0000" in `CoinCard.jsx` (Coins sub-view; hidden today while `aiResearch` is off, so not reproduced in the UI).

### P09-13 · Medium · Changing the date silently overwrites a price the user already typed (also when editing a saved trade)
- **Steps:** (a) Buy ETH → type Price `1700` → then change Date & Time → the Price becomes `1684.27`. (b) Bitcoin → tap the saved BUY row (Edit BTC: 1 BTC @ 60000 on 2026-11-20) → change only the date to 2026-11-22 → the Price field becomes `84000.00` (the mock price, see BUG-023).
- **Expected:** Once the user has typed a price (or when editing a recorded fill), a date change keeps it; AUTO only refills when the price is still the untouched AUTO value or the user taps AUTO.
- **Actual:** `onDateChange` always replaces the price with the historical/AUTO estimate. Editing the date of a past trade thus quietly rewrites its cost basis on Save. Reproduced 3× (add form; edit BTC buy 60000→84000.00; edit SOL buy 70.5→70.66 when its date was changed).
- **Status:** New (amplifies BUG-023/BUG-025, which are about *what* AUTO fills; this is about AUTO overwriting user input).
- **Suggested fix:** in `src/components/AddEntry.jsx` `onDateChange` only call `setEPrice` when the current price is empty or still equals the last auto-filled value (track an `autoPriced` flag that typing clears), and never on `editEntry`.

### P09-14 · Low · "Sell proceeds exceed buy costs — you already profited more than your total investment" shown for a 3% gain
- **Steps:** Bitcoin: Buy 1 BTC @ $60,000 (2026-11-20), Sell 1 BTC @ $62,000 (2026-11-21) → open Detail.
- **Expected:** A note only when profit > investment (>100% return), or accurate copy such as "You've already taken out more than you put in."
- **Actual:** Total P/L "+$2,000.00 (+3.33%)" and directly under it "…you already profited more than your total investment". Reproduced 2× with different books: +$2,000 (+3.33%) after one round-trip, and again at +$3,000 (+2.48%) after a second buy @ $61,000 / sell @ $62,000 — the note appears as soon as proceeds exceed cost.
- **Status:** New (copy/logic mismatch).
- **Suggested fix:** `src/components/Detail.jsx:100` — the condition is `sellsGain>buysCost` (proceeds > cost = capital recovered); reword to "Your sales have returned more than you invested in this coin" or change the condition to `sellsGain - buysCost > buysCost`.

### P09-15 · Low · A coin deleted on another device/tab leaves a "ghost" Detail + Buy popup open that can never save
- **Steps:** Open `/app` in two tabs (same account, same portfolio). Tab B: Pepe → Detail → "+ Buy" → fill Amount/Price. Tab A: Pepe → Detail → trash → "Delete anyway". Tab B: click "Add Buy" (twice, 5 s apart).
- **Expected:** When the live watcher sees the coin disappear, tab B closes the Detail/Buy popups with a neutral note ("Pepe was removed on another device").
- **Actual:** Tab B's list updates to "My Assets (1/30)" but the Pepe Detail (still showing 2 transactions) and Buy popup stay open; each "Add Buy" gives "That item no longer exists on the server — resyncing…" and nothing changes — the resync never closes the stale popups. No data is corrupted (the write is correctly refused). Reproduced 2×.
- **Status:** New (data-integrity guard works; UI stale state).
- **Suggested fix:** in `src/CryptoIdea.jsx`, when `watchCoins` delivers a coin list that no longer contains `sel.id`, `setSel(null)` + `setScreen("portfolio")` (and close `infoCoin` if it points at a removed held coin); the "resyncing" path in `addEntry` can do the same.

### P09-16 · Medium · An empty `/api/history` answer is cached by the browser for 24 h → DCA calculator and AUTO prices silently fall back to the offline estimate (BTC "Price today $103,000" vs live $61,247)
- **Steps:** Landing `/#dca` (Bitcoin, $100 weekly, any range — also 2026-01-01→today and 2025-06-01→today, which are inside the 365-day window). In DevTools/JS compare `fetch('/api/history?id=bitcoin')` with `fetch('/api/history?id=bitcoin',{cache:'no-store'})`.
- **Expected:** Results use the real daily history (BTC traded ~$58k–$91k over the last year; live $61,247), or the page says it is showing an estimate.
- **Actual:** "Price today **$103,000**", "Average buy price $102,081" (2026 range), Return +0.9% / −1.3% — all from the embedded `FB_PRICES` table, with **no** "offline estimate" notice and the footer still claiming "Data provided by CoinGecko · prices refresh about once a minute". Root cause observed: the browser-cached response is `{"prices":[]}` (length 0) while a `no-store` request returns 366 points; the server answered empty once and sent it with `Cache-Control: public, max-age=86400`. Same pattern seen for pepe (0/0) and solana (cached 366 / fresh 0 — the server is intermittently returning empty right now). Reproduced on 3 date ranges and 4 coins. Intermittent by nature: at 19:17, after the cached entry was replaced, the same Bitcoin calculation showed the real "Price today $61,187". The app's AUTO buy price uses the same endpoint (`src/api/coingecko.js` `fetchHistory`) and falls back to `getHistoricalPrice` estimates — consistent with the 84,000 BTC / 2,763.90 ETH AUTO prices seen in this session (BUG-023/BUG-025).
- **Status:** New (root-cause angle on BUG-025; related to BUG-009 "can't tell delisted from no data").
- **Suggested fix:** `functions/index.js` `/api/history` (≈ lines 3463 and 3489): when the returned `prices` array is empty (universe miss, negative-cache `miss`, upstream failure) send `Cache-Control: no-store` (or `max-age=60`) instead of `public, max-age=86400`. `public/landing.js` `getHist`: treat an empty `prices` array as degraded (`histDegraded=true` → show "showing an offline estimate") and don't cache it in `hCache`. App side: label AUTO prices that come from the estimate (BUG-025 fix).

### P09-17 · Low · DCA calculator keeps showing the previous results under an "Enter an amount." error, and formats a loss as "$-100.26"
- **Steps:** Landing `/#dca` → Amount `-500` (or `0`). Separately pick a range with a loss (2025-06-01 → today).
- **Expected:** Invalid input hides/greys the result card; losses formatted like the app ("−$100.26").
- **Actual:** "Enter an amount." appears but the old card ($15,700 invested / +24.0%) stays fully visible as if it applied; a loss reads "Profit / Loss **$-100.26**" (sign after the $, ASCII hyphen). Reproduced 2× (-500, 0) and on 1 loss range. Worse case at 19:17: choosing **Pepe** (whose `/api/history` is empty) shows "No historical data available in offline demo mode. On the live site, every coin in your library is supported." while the result card underneath still shows the previous **Bitcoin (BTC)** numbers — coin field says Pepe, card says Bitcoin. The "offline demo mode / on the live site" wording is also wrong when the page *is* the live site and the API merely returned no data (see P09-16).
- **Status:** New.
- **Suggested fix:** `public/landing.js` `calc()`: `document.getElementById('dcaRes').classList.remove('show')` on every early-return validation message; `money()` should emit `'−$'+…` for negatives (U+2212) and the profit line should not prepend `+`/nothing around it.

### P09-18 · Low · DCA calculator accepts future date ranges and reports "214 buys made" with "Profit / Loss $-0.00000000"
- **Steps:** Landing `/#dca` → Start 2027-06-01, End 2028-01-01 (also 2026-12-01 → 2030-12-31).
- **Expected:** "Pick dates up to today" (date inputs `max` = today; `calc()` rejects an end date in the future).
- **Actual:** Computes as if the buys happened: "Total invested $3,100 · Buys made 31" (and "$21,400 · 214 buys" for the second range), "Value today" = invested, **"Profit / Loss $-0.00000000"**, "Return -0.0%". The negative-zero with 8 decimals comes from `money()` using `toFixed(8)` for |n| < 0.0001. Reproduced 2×. Hostile coin-search text (`<img src=x onerror=alert(1)>`) is handled safely (no element injected, empty dropdown).
- **Status:** New.
- **Suggested fix:** `public/landing.js`: set `max` on `#dcaStart/#dcaEnd` to today and clamp `end` to today in `calc()`; in `money()` round values that are zero at display precision to `$0` (no sign).

### P09-19 · Medium · Account → Plan & billing says "AI research — Live — included in every plan" while AI is switched off
- **Steps:** Account → Plan & billing (with `/api/config` → `features.aiResearch:false`, and `AI_PROXY_LIVE=false` in code).
- **Expected:** No AI claim while there is no live AI (the landing was deliberately scrubbed of AI claims; the Research tab hides Ask/Coins when `aiResearch` is off). Either hide the row or say what's really there ("Research summaries — included").
- **Actual:** "AI research · **Live** · Research summaries & analysis — included in every plan". Rendered unconditionally from `src/components/Account.jsx:262-265` (no flag check). Reproduced 3× (three visits to Plan & billing).
- **Status:** New (honesty / product-decision drift; touches the "no AI claims" decision in PRODUCT-DECISIONS.md).
- **Suggested fix:** gate the row on `aiEnabled && AI_PROXY_LIVE` (same seam as the Research tab's `aiChrome`), or relabel it "Research summaries" with no "AI"/"Live" wording.

### P09-20 · Low (security) · Login error text reveals whether an email is registered
- **Steps:** Logged out → Log in with `p09.edge@test.com` + a wrong password → "Incorrect password". Then `nobody.p09.zz@test.com` (and `nobody.p09.yy@test.com`) + any password → "No account with this email".
- **Expected:** One generic message for both ("Email or password is incorrect"), as the admin "Forgot password?" flow already does deliberately (it swallows `user-not-found` so `/admin` can't enumerate accounts).
- **Actual:** Different messages, so anyone can test whether an address has an account. Reproduced 3× (1 existing, 2 non-existing). Note: in production Firebase's *email-enumeration protection* (on by default for new projects) collapses both to `auth/invalid-credential`, which this client already maps to "Incorrect password" — so impact depends on that project setting; under the emulator it leaks.
- **Status:** New.
- **Suggested fix:** `src/api/firebase-auth.js:286-291` (and the admin copy `src/api/admin-auth.js:109-111`) — map `auth/user-not-found`, `auth/wrong-password` and `auth/invalid-credential` to the same generic string; confirm email-enumeration protection is enabled in the go-live checklist (GO-LIVE-AUDIT.md).

### P09-21 · Low (accessibility) · Portfolio asset cards and transaction rows are mouse-only `<div onClick>`s
- **Steps:** Portfolio tab → press Tab repeatedly from the top (16 stops recorded). Then open a coin's Detail and inspect a transaction row.
- **Expected:** Each asset card (→ Detail) and each transaction row (→ Edit) is a focusable control operable with Enter/Space.
- **Actual:** Focus visits Resend, Dismiss, Account, the portfolio pills, Rename, Add, the coin icon (`span.coin-ic role=button`), CoinGecko and the nav — never the card itself (`div.asset-card`, tabIndex −1, `onclick` only). A keyboard user can reach Detail only by the detour icon → Coin info → "Transactions" button; transaction rows (`div.tx-row`, tabIndex −1) can't be edited by keyboard at all. The Detail header's delete-coin trash icon is a `<button>` with **no accessible name** (no `aria-label`, empty text), and the login "Forgot password?" and Learn "Start lesson" are plain text, not controls. Reproduced 2× (Tab walk; DOM inspection of card + row). Combined with P09-03 (no Escape, X not focusable, focus not moved into dialogs) the popups are hard to use without a mouse.
- **Status:** New (BUG-029 is the same class of issue for quiz answers).
- **Suggested fix:** render the card and tx row as `<button type="button">` (or add `role="button" tabIndex={0}` + Enter/Space handler, as `CoinIcon.jsx` already does) in the Portfolio card component and `src/components/Detail.jsx`; keep the icon's `stopPropagation`.

### P09-22 · Medium · At the 30-coin cap Search still lets you write a whole thesis, then "Save" throws it away (also on a "too fast" throttle)
- **Steps:** Fill a portfolio to 30/30 coins. Search → `injective` → "+ Add" (enabled) → "Before you add Injective…" opens → type both thesis answers → "Save to Journal & add coin".
- **Expected:** "+ Add" disabled (or the prompt says "This portfolio is full — 30/30") *before* the user invests effort; if the save is refused, the typed thesis stays in the dialog.
- **Actual:** No warning in Search or in the prompt; on Save the toast "Starter: 30 coins — upgrade to Pro for 100" appears and the dialog closes, discarding the typed thesis. Reproduced 2× (two tabs). The same close-and-discard happens when the add is refused by the 2 s cooldown ("You're doing that too fast — please wait a moment and try again."), seen when two tabs submitted at once. Positive: the concurrent adds at 29/30 did **not** exceed the cap (one won, one throttled → 30/30).
- **Status:** New (data loss of user text). The "upgrade to Pro" wording is a repeat of **BUG-032** (paid plans are off).
- **Suggested fix:** in `src/components/Search.jsx` disable "+ Add" / show the cap notice when `coins.length >= maxCoinsPerPort`; in the Buy-Journal save path keep the overlay open (and the textarea values) when `addCoin` returns `{success:false}` — only close on success.

### P09-23 · Medium · After a full exit and re-buy, the cost basis uses the lifetime average — Research says "down 29.5%" on a position bought minutes ago at today's price
- **Steps:** Solana: hold 100,000 SOL bought @ $100 → sell everything @ $70 (holding 0) → Buy 10 SOL @ $70.50 (≈ live $70.50) → Research → Portfolio Pulse; also open the Solana Detail.
- **Expected:** With the position closed out, the new lot starts a fresh cost basis: "Against a **$705** cost basis you're flat (0.0%)"; Detail "Avg Buy Price" for the current holding ≈ $70.50 (lifetime P/L can still show the realised −$3M separately).
- **Actual:** Pulse: "Your portfolio is $705 … Against a **$1,000** cost basis you're **down $295 (29.5%)**." Detail: "Holding 10 SOL · Avg Buy Price **$100.00**". The old, fully-sold lot's average ($100) is applied to the new 10 SOL. Reproduced 2× (Research Pulse + Detail); the BTC book shows the same effect at a smaller scale (Pulse "$51,525 cost basis" vs ≈$51,2xx for the lots actually held).
- **Status:** New.
- **Suggested fix:** compute average cost by replaying transactions in date order and resetting `costSum`/`bought` when the running balance returns to ~0 (average-cost method), in `src/features/research/utils/coins.js` (`holdingsFromCoins`, `avgCost: costSum / bought`, ~line 68) and the Detail avg-buy calculation (`src/components/Detail.jsx` / `src/utils/pnl.js`), so "cost basis" means the basis of what is held now.

### P09-24 · Low · Detail "Bought"/"Sold" totals show 3 decimals ("$0.009") while the same trades elsewhere show "$0.01"
- **Steps:** Algorand → Buy 0.123456789123456 ALGO @ $0.0751 → Sell 0.1 ALGO @ $0.0755 → open Detail.
- **Expected:** Money rendered consistently to cents (or with the app's sub-cent rule) everywhere.
- **Actual:** Detail "Bought 0.12345679 ALGO · **$0.009**", "Sold 0.1 ALGO · **$0.008**", while the transaction rows show "$0.01" and "Current Value $0.01". Reproduced 2× (buy and sell). Also noted: the 16th significant digit typed into Amount is silently dropped by the 15-digit cap (`0.123456789123456` → `0.12345678912345`) — harmless, but unannounced like P09-01.
- **Status:** New (cosmetic; PORTFOLIO-NUM-FIX intended one money formatter).
- **Suggested fix:** `src/components/Detail.jsx` (the Bought/Sold `kv-sub` spans use `toLocaleString("en-US",{minimumFractionDigits:2})` with no `maximumFractionDigits`, so the default 3 applies) — route through `src/utils/money.js` / `fmtP` like the other money fields.

### P09-25 · Low · At 375 px the account avatar overlaps the "STARTER" tag (Portfolio, Research) and "● LIVE" wraps onto two lines
- **Steps:** Open `/app` at 375 px width (checked in a same-origin 375 px frame, dark and light) → Portfolio and Research tabs.
- **Expected:** Header tags and the floating avatar never overlap; tags stay on one line or wrap as a group.
- **Actual:** Measured: STARTER tag spans x 249–313 (Portfolio) / 255–319 (Research) while the avatar spans 303–339 → the tag's right edge sits under the avatar; "● LIVE" breaks into "●" / "LIVE". Journal/Learn/Search (shorter titles) fit. Reproduced on 2 tabs and 2 widths (375/390).
- **Status:** New (cosmetic; the CRYP-102 `.avatar-dock` is zero-height sticky, so header content doesn't reserve its width).
- **Suggested fix:** in `src/styles/app.css` give `.ci-app .apphead` (and `.research-stickyhead`) a right padding equal to the avatar width + gap, and `white-space:nowrap` on the header tags (`HeaderTags`).

## Known bugs re-checked
| Bug | Result | Evidence this run |
|---|---|---|
| BUG-019 Oversell and P&L integrity | Appears fixed | Oversell on add, backdated sell, delete-a-buy, edit-buy-down, move-buy-after-sell and buy→sell type change all refused; exact sell-all accepted (only a < 1e-8 tolerance remains — see P09-11) |
| BUG-021 Search shows mock prices / thesis saves them | Still present | ETH search $1,900.00 vs live $1,718; PEPE $0.0000118 vs $0.00000344; SHIB "$0.0000245000 +5.20% · #17" vs `/api/prices` $0.00000361 −0.49% rank 39 (6.8× and wrong direction); thesis "Thesis written · $1,900.00" |
| BUG-022 Empty holding shows green "+$0.00" | Still present | ETH with 0 tx: Total P/L green "+$0.00 (+0.00%)"; empty portfolio header 24H green "+0.00%" |
| BUG-023 AUTO buy price can pre-fill the mock price | Still present | Even long after live prices loaded: SOL Sell/Buy pre-filled 125.00 (live $70.23), ETH 1900.00, PEPE 0.0000118, BTC 84000.00 for 2026-11-20 — and "Suggested price" can be the mock too |
| BUG-024 Transaction time recorded in UTC | Still present | At 18:26 local (UTC+2) the field showed 16:26; saved rows read "04:26 PM" / "04:31 PM" |
| BUG-025 AUTO historical price is an estimate labelled as market price | Still present | ETH for 2015-08-07 auto-filled 2,763.90 under "Using the market price for this date"; likely amplified by P09-16 (cached empty history) |
| BUG-026 Mixed minus signs | Still present | "−$2,977,000.00 (-29.77%)", header 24H "-0.14%", CoinInfo "-5.91% today" |
| BUG-027 Escape doesn't close Detail | Still present — wider than logged | No popup closes on Escape (Detail, Buy/Sell, New portfolio, Rename, Delete-coin confirm, Journal detail, Lesson, CoinInfo); root cause in `Modal.jsx` → P09-03 |
| BUG-028 Learn modules 2–9 locked | Still present | Only module 1 has a "Start →" control; modules 2–9 render as non-interactive locked cards |
| BUG-029 Quiz answers not exposed as controls | Still present | `div.quiz-opt`, no role, tabIndex −1 |
| BUG-030 Wrong quiz answer stays highlighted green | Still present | After "Not quite…" the wrong option keeps `quiz-opt selected` with a green tint (dark rgba(31,157,85,.18); light rgb(233,242,237)); 2 lessons |
| BUG-031 Name field strips accents, apostrophes, hyphens | Still present | `<script>alert(1)</script> José O'Brien-Smith` → "scriptalertscript Jos OBrienSmith" (then rejected: "letters only, 2-30 characters") |
| BUG-032 Upsell to a plan that can't be bought | Still present | "Starter: 3 portfolios — upgrade to Pro for 6", "Starter: 30 coins — upgrade to Pro for 100", "You've reached your account limit. Upgrade to Pro" while `paidPlansEnabled:false` |
| BUG-033 Oversized "Security & payment emails" text | Still present | 16px vs 11px for the sibling note |
| BUG-036 100% single-token book rated Low risk | Still present | 100% ETH, 100% BTC and 100% SOL books all "Portfolio risk: Low" |
| BUG-037 Stress test "higher-beta amplify" at −50% | Still present | "A 50% market drop would move you to … (−50.0%). Your higher-beta holdings amplify the swing." (and the same at +50%) |
| BUG-038 Daily Brief always shows ▲ | Still present | SOL-only book: "▲ Portfolio is down $2 (−0.3%)" |
| BUG-017 Research "about NaN%" | Appears fixed | No NaN/Infinity/undefined on any Research view (huge, dust, 30-coin and single-coin books) |
| BUG-020, BUG-034, BUG-035 | Not reached | No sign-up / account deletion / restore in this run |

## What worked well
- **No XSS anywhere**: HTML/script/SVG payloads in portfolio names, thesis, funnel findings, search box and the landing coin search always rendered as text; no injected element ever appeared in the DOM.
- **Write guards hold under abuse**: triple synchronous clicks on Add Buy → 1 write; double "Delete anyway" → clean; concurrent coin adds at 29/30 from two tabs → cap held at 30; 49 scripted transactions in ~2 min → all accepted, pager correct; future-dated (2030/2031) adds and edits refused; pre-launch dates clamped to the launch date.
- **Oversell replay guard (BUG-019 fix)** works for add, edit, delete and type-change.
- **Server-side limits**: price > 1e9 and amount > 1e15 refused; a scripted 2001-char thesis refused by rules; deleted-coin writes refused with "resyncing…".
- **Stable numbers**: no `$NaN`, `Infinity` or crashes with 1e24-dollar books, 1e-14 dust, empty books or 30-coin books; rapid portfolio switching (20 clicks at 25–40 ms) always settled on the right book.
- **Journal**: whitespace-only theses not saved; review status last-click-wins and persists across reload; delete-thesis with a dirty edit doesn't resurrect the thesis; Learn XP can't be farmed by replaying a lesson.
- Delete-account confirm requires the password **and** an exact `DELETE`; console stayed clean apart from one exception thrown by a browser extension (`MessageNotSentError`).

## Timeline
- 18:25 Start; health check OK (app 200, functions 404 = up). Chrome was still signed in as p08 → logged out, logged in as p09 (account already existed with SOL data).
- 18:27 Buy/Sell number inputs: comma/exponent/minus stripping (P09-01), oversell copy (P09-02), Escape in Detail/Buy (BUG-027 → P09-03).
- 18:30 Portfolio names with HTML/formula, Enter behaviour (P09-04), Search XSS, 2000-char hostile thesis + emoji funnel (safe).
- 18:33 Huge values (caps, preview overflow, select-all overwrite — P09-05/06), future/pre-launch dates (P09-07), mobile 390 px frame.
- 18:36 Back/forward/refresh inside popups (P09-08), rename duplicates (P09-09), RTL override (P09-10), Profile name (BUG-031).
- 18:40 Dust amounts (P09-11), Research with absurd book (P09-12), oversell/edit/delete replay guards (pass), date-change overwrites price (P09-13), proceeds note (P09-14), Learn re-checks (BUG-028/029/030).
- 18:45 Two-tab delete race (P09-15); landing DCA: cached empty history (P09-16), stale results/minus format (P09-17), future ranges (P09-18).
- 18:50 Mobile Journal, review-status spam + reload, 53-tx pager, Plan & billing AI claim (P09-19), privacy toggles, logout/login enumeration (P09-20).
- 18:58 Keyboard Tab walk (P09-21), long/emoji/control-char search, numeric edge matrix, Learn XP replay (no farming), double "Delete anyway" (clean).
- 19:02 Coin-cap race (scripted adds to 29/30, concurrent adds from two tabs → cap held) and thesis loss at the cap (P09-22).
- 19:07 Full exit + re-buy cost basis (P09-23), BUG-033/BUG-038 re-checks, edit-to-future refused, delete-account confirm strictness, Learn BUG-030 in light mode.
- 19:13 Sub-cent formatting (P09-24), 375 px header overlap in dark/light (P09-25), SHIB mock price vs `/api/prices`, active-portfolio delete, zero-width portfolio names (P09-10), DCA stale-coin card (P09-17).
- 19:20 Wrap-up; theme left on Light; my extra tabs closed.
