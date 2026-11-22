# Persona 08 — Organizer · 1-hour test · 2026-11-22
Status: Complete | Account: p08.organizer@test.com | Start: 17:29 local | End: 18:24 local | Minutes tested: 55

## Persona
Organizer: keeps holdings split into tidy, named portfolios (long-term, trading, cold storage), renames and prunes them, and regularly exports everything to a spreadsheet to reconcile. Expects counts and totals to match exactly between the app and the export, and expects edits made in one tab or device to show up in the other.

## Data created
| What | Detail |
|---|---|
| Account | Already existed (name initial "Z", **Starter**, 2 empty portfolios "My Portfolio" + "Trading" from an earlier run). Not registered again. |
| My Portfolio | Bitcoin, Ethereum, Solana (all "Skip for now", no thesis). BTC: BUY 0.05 @ $60,000 (2026-11-01 10:00), BUY 0.02 @ $58,000 (2026-11-10 12:00), SELL 0.01 @ $62,000 (2026-11-15 09:30). ETH: BUY 1.5 @ $1,800 (2026-11-05 14:00). Solana: no transactions. |
| Trading | Bitcoin (same coin as My Portfolio, no tx), XRP: BUY 1,000 @ $0.85 (2026-11-12 08:15). |
| Third portfolio | Created as a 50-char name ("Long-term Cold Storage 2026 - Organizer Master Boo", input truncated at 50), renamed to "Cold Storage" (typed with leading/trailing spaces, trimmed), deleted, re-created, then deleted + re-created ×5 more by script (P08-02). |
| Failed attempts | Empty and whitespace-only names (create + rename) refused with "Enter a portfolio name"; 51+ char names refused ("Name must be 50 characters or fewer"). 4th portfolio "Fourth" refused (BUG-032 copy). |
| Two-tab races (17:46–17:52) | "Race A"/"Race B" created at the same moment (cap held); "Race A" renamed to `=SUM(1,2) "Q", Inc; Résumé 🧾` + Cardano BUY 12,345.678901 @ $0.1234 (2026-11-18 11:11). Two delete races wiped all portfolios twice (P08-05) — the first wiped My Portfolio's BTC/ETH/SOL book. |
| Rebuilt book (17:53+) | My Portfolio: BTC BUY 0.1 @ $59,000 (2026-11-02 09:00), ETH BUY 2 @ $1,750 (2026-11-03 10:00), BTC SELL 0.04 @ $61,000 (2026-11-19 18:30), later BTC BUY 0.001 @ $60,000 (2026-11-21 09:00, double-click test). Long Term: SOL BUY 10 @ $140 (edited to 12, then deleted), ADA BUY 2,000 @ $0.45 (edited to 2,500). Polkadot + Chainlink added via the cross-tab prompt (P08-09), each given a thesis then deleted (P08-15). ETH in a second portfolio: BUY 0.1 + 0.2 @ $2,000, SELL 0.3 @ $2,100 (float test). |
| Theses | Cardano: "Long-term hold for the cold-storage book; research-driven chain." / "Developer activity collapses for two quarters." (deleted with its portfolio). Chainlink and Polkadot theses (deleted with the coins). |
| Names used | 50-char names ("Long-term Cold Storage 2026 - Organizer Master Boo", "Swing and Momentum Trades Q4 2026 - Rebalance Week", "Experimental Small Caps and New Listings Watchlist"), duplicate "My Portfolio", Hebrew + emoji "תיק ניסיוני 🧪 2026", "Double Save", "Double Save 2", "Ghost Two". |
| Coin-cap fill (18:19–18:23) | 28 coins added to "Trading" with "Skip for now" (trending list, then Dogecoin, Tron, Avalanche, Litecoin, Stellar, Uniswap, Aave, NEAR, Cosmos, Filecoin, Algorand, Tezos, Monero, Hedera …) to reach 30/30. |
| Final state (18:24) | "Cold Storage": BTC 0.061 (3 tx), ETH 0 (0 tx). "Trading": 30 coins — XRP BUY 1,000 @ $0.85 (2026-11-12 08:15), the rest with no transactions. Theme set back to Light. |

## Coverage
| Flow | Result | Notes |
|---|---|---|
| Login / logout (persona account) | Pass, with P08-01 | Account already existed (Starter). Logout in one tab signs the other tab out too; login screen comes back clean (no stale fields, light theme). |
| Create portfolio (header "+" and Account → Portfolios), empty / whitespace / 50+ char names | Pass | "Enter a portfolio name" for empty/whitespace; names trimmed; input `maxlength=50` (silent cut). Duplicate names accepted (P04-37 repeat). |
| 3-portfolio cap | Pass, with BUG-032 | Header "+" hides at 3/3; Account "+ Add" still offered and refused with "Starter: 3 portfolios — upgrade to Pro for 6". Two tabs creating at the same moment: cap held. |
| Rename (header pencil + Account), trimming, emoji/quotes/`=` | Pass | Escaped correctly everywhere. |
| Delete portfolio: empty (two-tap Remove), with coins ("Delete anyway"), active one, last one | Pass, with P08-06 | Active falls back to the first portfolio; the last portfolio has no delete button (but see P08-05 across devices). |
| Portfolio order after delete + create | **Fail** | P08-02. |
| Moving between portfolios, rapid pill switching (12 clicks) | Pass | Cards, value card and count always match the active pill. Research and Account "Coins in active portfolio" follow the active portfolio. |
| Starter 30-coin cap (filled "Trading" 2 → 30 via Search, 18:19–18:23) | Pass, with BUG-032 | Cap held at 30/30 (server-side). Arbitrum, Optimism, Sui, Toncoin each refused with "Starter: 30 coins — upgrade to Pro for 100"; Search still offers "+ Add" and opens the add prompt at 30/30 before refusing. |
| Coins per portfolio, same coin in two portfolios | Pass | "Added"/"+ Add" in Search is per portfolio; deleting BTC in one portfolio leaves the other's BTC (2 tx) intact. |
| CSV export (captured in-page, no file written) | Pass on totals, with P08-03 | Holdings + transactions reconcile with the app on 3 exports (invested 7,710 / 9,233.46 / 10,525; sold 620 / 1,620 / 2,440). Formula-injection guard (`'=SUM…`), quote-doubling, emoji and accents correct. High-precision amounts kept (12345.678901). Empty portfolios missing (P08-03). Holdings sorted alphabetically by portfolio, not app order. |
| JSON export | Pass | Includes empty portfolios, `txCount` matches transactions after reconcile, thesis present. Two exports within a few seconds → "Please wait a few seconds before exporting again. [429]" (raw code shown). |
| Multi-tab live sync (same account, 2 tabs) | **Mixed** | Pass: new tx (~3 s), deleted tx (≤10 s), rename, add/delete portfolio, active portfolio deleted elsewhere (self-heals), thesis, theme. **Fail:** edited tx never syncs (P08-08); coin deleted elsewhere leaves stale Detail/Buy (P08-04); two-tab delete race → zero portfolios + ghost portfolios (P08-05); add prompt lands in another portfolio (P08-09). No "Live sync was interrupted" toast seen (BUG-020). |
| Journal / Research across portfolios | Pass, known gaps | Neither screen says which portfolio it shows (P02-05 / P05-17 family). BUG-036 still present (100% ADA = "Low" risk). |
| Phone width (375 px same-origin iframe, not a window resize) | Pass, known gaps | Pill row scrolls horizontally, pencil off-screen (P05-18). Account → Portfolios wraps a 50-char name well; delete dialog fits. |
| Dark mode | Pass | Account-wide setting, synced to the other tab immediately. Dialogs readable. Reset to Light at the end. |
| Keyboard: Escape on modals | **Fail** | BUG-027, broader than logged (see table below). |
| Browser Back / reload | Pass | Back is a full page navigation (no in-app history); reload keeps the active portfolio; logout → login resets to the first portfolio (P04-19 repeat). |

## Findings

### P08-01 · Low · "Your plan is now Starter." toast on a normal login after another account used the same tab
- **Steps:** In one tab, be signed in as a Premium account → Account → Logout → log in as a Starter account (here: p08.organizer, Starter for its whole life).
- **Expected:** No plan-change toast; this account's plan didn't change.
- **Actual:** A red toast "Your plan is now Starter." appears right after login.
- **Repeat?** New.
- **Reproduction:** Seen once at session start (the tab was left signed in as the previous persona, Premium). A second run would need logging in as a different-tier account, which this persona's rules forbid; the cause is confirmed in code: `src/CryptoIdea.jsx:978` `const lastTierRef=useRef(user?.tier)` is never reset on logout, so the watcher at `:982` compares the NEW user's server tier with the PREVIOUS user's tier.
- **Why it matters:** On a shared device it tells the next person the plan of whoever used it before, and it reads like a downgrade.
- **Suggested fix:** Reset `lastTierRef.current` when `user.uid` changes (e.g. set it to `null`/the new user's tier at the top of the `useEffect` keyed on `user?.uid`, before subscribing).

### P08-02 · Low · After deleting a portfolio, a new one can jump ahead of older ones (duplicate `order` values)
- **Steps:** With 3 portfolios (My Portfolio, Trading, X), delete X, create a new one "Cold Storage" → repeat delete/create a few times → reload.
- **Expected:** New portfolios always appear last (creation order), and the order never changes on its own.
- **Actual:** The JSON export showed Trading `order: 2` **and** Cold Storage `order: 2`. On one of the cycles the new "Cold Storage" listed **above** "Trading" in Account → Portfolios, and after a reload the header pills read "My Portfolio · Cold Storage · Trading". Reproduced 5× (drill-in list; header after reload; at 17:50 a freshly created "Cold Storage" again listed before the older `=SUM(…)` portfolio; at 18:08 and 18:10 "Double Save" / "Double Save 2" listed before the older "Experimental…" portfolio).
- **Repeat?** New.
- **Cause:** `src/CryptoIdea.jsx:717` creates with `order = portfolios.length`. After any delete, that number collides with an existing portfolio's order; `orderBy("order")` (`src/api/firebase-database.js:98`, `:471`) then breaks the tie by random document id.
- **Suggested fix:** Use `max(order)+1` (or the `created` timestamp as a secondary sort key) when creating a portfolio.

### P08-03 · Low · CSV export silently leaves out empty portfolios
- **Steps:** Have an empty portfolio ("Cold Storage", 0 coins) → Account → Privacy & data → Download CSV.
- **Expected:** An organizer reconciling books sees every portfolio, even if a row says it is empty.
- **Actual:** The CSV has rows only for My Portfolio and Trading; Cold Storage appears nowhere. The JSON export does include it (`coins: []`). Reproduced twice (CSV export at 17:36 and again at 17:50 after re-creating an empty "Cold Storage").
- **Repeat?** New.
- **Suggested fix:** In `src/utils/export-csv.js`, emit a HOLDINGS row like `Cold Storage,(empty),,0,,0,0,0` for a portfolio with no coins.

### P08-04 · Low · A coin deleted in another tab stays open in this tab's Detail + Buy form; every submit says "resyncing…" but nothing closes
- **Steps:** Same account in tab A and tab B, same portfolio ("Race A" with Official Trump). Tab B: open the coin's Detail → + Buy → enter 100 @ $1. Tab A: open the same coin → trash → Remove. Tab B: click **Add Buy**, wait 5 s, click it again.
- **Expected:** Tab B notices the coin is gone (its list already updates to 0/30 within ~1 s) and closes the Detail/Buy overlay with a short "This coin was removed on another device" note.
- **Actual:** The background list updates to "My Assets (0/30)", but the Detail popup and the filled Buy form for the deleted coin stay open. Each **Add Buy** shows the toast "That item no longer exists on the server — resyncing…" and nothing else happens; the form never closes. Reproduced 2× (two submits, same session). Nothing was written (good — the server refuses it).
- **Repeat?** New (the guarded write works; the stale overlay is the gap).
- **Same pattern, transaction edit (18:17):** tab B had "Edit ETH" open; tab A deleted that transaction; tab B's Detail behind already showed "Transactions (0)" but the Edit form stayed open, and Save Changes gave "That item was already removed (maybe on another device)." with the form still open.
- **Suggested fix:** In `src/CryptoIdea.jsx`, when the watched coin list no longer contains the coin behind the open Detail / AddEntry overlay (or on the `missing-target` error from `src/utils/errors.js`), close those overlays and toast once.

### P08-05 · Medium · Two devices pruning at the same time can delete EVERY portfolio; both tabs then show a different ghost portfolio and every add fails with "resyncing…" until a reload
- **Steps:** Same account open in tab A and tab B, exactly 2 portfolios (e.g. "My Portfolio" + "Swing Trades"). Tab A: Account → Portfolios → delete "My Portfolio". Tab B, at the same moment: delete "Swing Trades". (Both tabs still list 2 portfolios, so neither hides the delete button.)
- **Expected:** At least one portfolio always remains (the app's own rule: "Need at least 1 portfolio"); the second delete is refused, or the survivor is re-created and both tabs converge on it.
- **Actual:**
  - Run 1 (17:48:57, "My Portfolio" with 3 coins / 6 tx + empty "Swing Trades"): both deletes succeeded. Tab B showed **"Portfolios (0/3)"** with an empty list; the data was gone. A new empty "My Portfolio" only appeared ~15 s later, when tab A was reloaded.
  - Run 2 (17:50:24, two empty portfolios): both deleted. The JSON export confirmed `portfolios: []`, `portfolioCount: 0` on the server, **but tab A kept showing "Swing Trades · Active" and tab B kept showing "My Portfolio · Active" for 50+ seconds** — each tab shows the portfolio the *other* tab deleted. Adding a coin in tab B (twice) only toasts "That item no longer exists on the server — resyncing…"; the server stays at zero portfolios. Only a page reload recovers (a new default "My Portfolio" is created at load).
- **Repeat?** New. (Related to the DI self-heal work in `docs/product/DATA-INTEGRITY.md`.)
- **Causes (code reading):**
  1. The "at least one portfolio" rule is client-only: `src/CryptoIdea.jsx:726` `if(portfolios.length<=1){showErr("Need at least 1 portfolio")…}`; `deletePortfolio` (`src/api/firebase-database.js:135`) and the rules don't stop the last one being deleted.
  2. `src/hooks/useAuthSession.js:141` `if (!metas.length) return; // never blank the UI on a transient empty snapshot` throws away the genuine "zero portfolios" snapshot, so each tab keeps its stale list.
  3. The "resyncing…" self-heal after a `missing-target` add doesn't re-create a portfolio when none exist.
- **Suggested fix:** When the live portfolio snapshot is empty *and* comes from the server (`!snap.metadata.fromCache`), call the same `ensureDefaultPortfolio`/create-default path used at login instead of ignoring it; optionally have the delete path refuse when it would leave zero (server-side check or a transaction on `portfolioCount`).

### P08-06 · Low · Portfolio delete dialog always mentions theses, even when the portfolio has none
- **Steps:** Account → Portfolios → Delete on a portfolio whose coins have no thesis.
- **Expected:** Mention theses only if some coin in it has one (and ideally say how many transactions will go).
- **Actual:** "This portfolio has 2 coins and all their transactions and **theses**…" (Trading, no theses), "This portfolio has 1 coin and all its transactions and **thesis**…" (`=SUM(1,2)…`, no thesis), and "3 coins … and theses" for My Portfolio (no theses) at 375 px. Reproduced 3×.
- **Repeat?** New for the portfolio dialog; it's the same wording issue as P01-11 (coin dialog).
- **Suggested fix:** Build the sentence from real counts (coins, transactions, theses) in the Account portfolio-delete confirm (`src/components/Account.jsx`).

### P08-07 · Low · A Starter user with one portfolio has no way to add or rename a portfolio from the Portfolio tab
- **Steps:** Starter account with exactly one portfolio (e.g. right after the recovery in P08-05, or a new account) → Portfolio tab.
- **Expected:** The "+" (new portfolio) and the rename pencil are visible, since Starter allows 3 portfolios.
- **Actual:** No portfolio pill row at all — no name, no "+", no rename pencil. The only path is Account → Portfolios. Reproduced in both tabs.
- **Repeat?** New.
- **Cause:** `src/components/PortfolioBar.jsx:19` `if (!(portfolios.length > 1 || isPro)) return null;` — written when the free tier had 1 portfolio; Starter now has 3.
- **Suggested fix:** Show the bar when `maxPortfolios > 1` (or `portfolios.length > 1 || portfolios.length < maxPortfolios`).

### P08-08 · Medium · An EDITED transaction never reaches the other tab/device (new and deleted ones do)
- **Steps:** Same account in tab A and tab B, same portfolio ("Long Term"). Tab B: open the coin's Detail (or just look at its card). Tab A: tap the transaction row → **Edit** → change the amount → **Save Changes**.
- **Expected:** Tab B shows the new holding within a few seconds, like it does for a new buy/sell (which synced in ~3 s in this run) or a deleted transaction (synced within ~10 s).
- **Actual:** Tab B keeps the old numbers indefinitely — card, value card and open Detail. Run 1: Solana 10 → 12 SOL, tab B still "Holding 10 SOL / −$697.40" after 11 s. Run 2: Cardano 2,000 → 2,500 ADA, tab B still "Holding 2,000 ADA" after 13 s; it only showed 2,500 after switching to another portfolio and back (re-subscribing). Reproduced 2×.
- **Why it matters:** The organizer reconciles on the second device and sees wrong holdings, P/L and totals, with no hint they are stale (the "● LIVE" tag stays on).
- **Repeat?** New (BUG-020 is a different sync issue).
- **Cause (code reading):** `watchCoins` (`src/api/firebase-database.js`) re-reads a coin's transactions only when the **coin** doc changes ("every transaction write bumps the parent coin's txCount"). `updateTransaction` (`src/api/firebase-database.js:419`) updates only the transaction doc, so no coin-doc change happens and no snapshot fires.
- **Suggested fix:** Make the edit bump something on the coin doc in the same batch (e.g. a `txUpdatedAt` server timestamp, allowed by the rules), or route edits through a guarded callable as adds are.

### P08-09 · Low · A coin you were adding to one portfolio silently lands in another one if that portfolio is deleted elsewhere meanwhile
- **Steps:** Tab B: switch to "Long Term" → Search → "+ Add" on a coin, leaving the "Before you add …" prompt open. Tab A: delete "Long Term". Tab B: click **Skip for now**.
- **Expected:** The add is refused or the prompt says "Long Term was deleted on another device — add to My Portfolio instead?".
- **Actual:** No message. The coin is added to "My Portfolio" (the self-healed active portfolio): Polkadot (run 1, assets 2 → 3) and Chainlink (run 2, assets 3 → 4). The prompt never shows which portfolio it targets, so the organizer can't notice. Reproduced 2×.
- **Repeat?** New.
- **Suggested fix:** Capture the active portfolio id when the add prompt opens and pass it to `addCoin`; if it no longer exists on confirm, show a choice instead of falling through to the new active portfolio. Showing "Adding to: Long Term" in the prompt also helps.

### P08-10 · Low · With descriptive (long) portfolio names the rename pencil scrolls out of view on desktop too
- **Steps:** Three portfolios with 50-character names (the allowed maximum), e.g. "Swing and Momentum Trades Q4 2026 - Rebalance Week" → Portfolio tab at 1150 px wide.
- **Expected:** The rename pencil stays visible (names truncate with "…", or the pencil sits outside the scrolling row).
- **Actual:** The pill row is 1112 px wide in a 1040 px track; the pencil sits after the third pill, beyond the right edge, behind a horizontal scrollbar. At 360–375 px the same happens with only one long name. Reproduced at 1150 px and 360/375 px.
- **Repeat?** Extends P05-18 (reported for phone width only).
- **Suggested fix:** In `src/components/PortfolioBar.jsx` / `.port-pills` CSS, cap pill width with `text-overflow: ellipsis` (full name in `title`) and keep the "+" and pencil outside the scrolling pill list.

### P08-11 · Low · An open Rename dialog keeps the old name and silently overwrites a rename made on another device
- **Steps:** Tab B: open Rename on the active portfolio (pre-filled "Experimental Small Caps and New Listings Watchlist"). Tab A: rename the same portfolio to "Small Caps". Tab B: its pill already updates to "Small Caps", but the dialog still holds the old text → Save.
- **Expected:** The dialog notices the name changed underneath (refresh the draft, or warn "renamed on another device to Small Caps").
- **Actual:** Tab B's save wins silently and tab A's rename is lost. Run 1: "Small Caps" overwritten by "…New Listings List". Run 2: "New Listings" overwritten by the stale "…New Listings List". Reproduced 2×.
- **Repeat?** New for portfolio names; same pattern as P02-16 (thesis edits).
- **Suggested fix:** Keep the original name the dialog opened with; on Save, if the live name differs from it, ask before overwriting (`startRename` / the rename handler in `src/CryptoIdea.jsx`).

### P08-12 · Low · Double-clicking Save in "New portfolio" (at 2/3) creates the portfolio AND shows "You've reached your plan's portfolio limit — upgrade for more."
- **Steps:** Have 2 of 3 portfolios → Portfolio tab "+" → type a name → double-click **Save**.
- **Expected:** One portfolio, no error (the second click is ignored while saving).
- **Actual:** One portfolio is created ("Double Save" / "Double Save 2") and a red toast says "You've reached your plan's portfolio limit — upgrade for more." The second click reaches the server after the first made it 3/3. The wording also differs from the cap message in Account → Portfolios ("Starter: 3 portfolios — upgrade to Pro for 6"), and both upsell a plan that can't be bought (BUG-032). Each new portfolio also landed *before* an older one (P08-02). Reproduced 2×.
- **Repeat?** New (the upsell part is BUG-032).
- **Suggested fix:** Disable Save while `addPortfolio` is in flight (`src/components/PortfolioBar.jsx` `save`, and the Account "+ Add"), e.g. a `saving` flag.

### P08-13 · Low · Taking both exports back-to-back fails with "Please wait a few seconds before exporting again. [429]"
- **Steps:** Account → Privacy & data → **Download CSV**, then within a few seconds **Download all my data (JSON)**.
- **Expected:** An organizer wants both files; either both work, or the second button is briefly disabled with a countdown, in plain words.
- **Actual:** The JSON export fails with "Please wait a few seconds before exporting again. [429]" — the two buttons share one server cooldown (`functions/index.js:1733`, `exportMyData` is behind both), the buttons stay enabled, and a raw HTTP code is shown to the user. Reproduced 2× (18:00 and 18:10).
- **Repeat?** New (copy/UX; the cooldown itself is intended).
- **Suggested fix:** Build the CSV from the same fetched export instead of a second call (cache the last `exportMyData` result for ~30 s in `src/CryptoIdea.jsx`), or disable both buttons for the cooldown; drop the "[429]" suffix from the message.

### P08-14 · Low · Renaming a portfolio that was deleted on another device says "That change isn't allowed right now." and the dialog stays open
- **Steps:** Tab A: select portfolio "Ghost Two" → rename pencil (dialog open). Tab B: delete "Ghost Two". Tab A: its pills already drop "Ghost Two" and switch to another active portfolio; the rename dialog stays open → type a name → Save.
- **Expected:** The dialog closes when its portfolio disappears, or Save says "This portfolio was deleted on another device."
- **Actual:** Red toast "That change isn't allowed right now." (reads like a permissions/plan problem); the dialog stays open and Save keeps failing; nothing is renamed. Reproduced 2× ("Double Save 2", "Ghost Two"). Compare P08-04, where the same situation for a coin gives the clearer "That item no longer exists on the server — resyncing…", and a transaction edited after deletion elsewhere, which gives the best copy of the three: "That item was already removed (maybe on another device)." Three different messages for one situation.
- **Repeat?** New.
- **Cause:** `updatePortfolioName` on a missing doc is denied by the rules — the console logged `[write-failed] permission-denied … evaluation error at L322:26 for 'update' @ L322, Null value error` at 18:10:20 and 18:10:49 (the two Save attempts) — and `src/utils/errors.js` maps that to the generic message; there's no not-found pre-check as `deletePortfolio` has.
- **Suggested fix:** Close the rename dialog when its portfolio leaves the live list; add an exists-check (or map `permission-denied` on a missing target to the `missing-target` copy).

### P08-15 · Low · Deleting a coin that has a thesis but no transactions loses the thesis without any warning
- **Steps:** Journal → "Add thesis" on a coin with 0 transactions (Chainlink, Polkadot) → Save thesis → Portfolio → open the coin → trash → Remove.
- **Expected:** The same "you'll lose your saved thesis" warning dialog that a coin with transactions gets.
- **Actual:** The quick two-tap "Remove" deletes the coin and its thesis immediately; the Journal entry disappears (in both tabs). Reproduced 2× (Chainlink, Polkadot).
- **Repeat?** New. (The opposite case — the warning claiming a thesis that doesn't exist — is P01-11.)
- **Cause:** `src/components/Detail.jsx:153` shows the warning only when `coin.entries.length>0`.
- **Suggested fix:** Show the warning when `coin.entries.length>0 || coin.journal`, and build the sentence from what actually exists (fixes P01-11 at the same time).

### P08-16 · Low · Screen readers can't tell which portfolio is active
- **Steps:** Portfolio tab with 2–3 portfolios → inspect the pill buttons (or use a screen reader and Tab through them).
- **Expected:** The active pill exposes its state (`aria-pressed="true"` or `aria-current="true"`), as a toggle group.
- **Actual:** The only difference is the CSS class `port-pill active`; no ARIA state. Keyboard switching itself works (Tab + Enter, visible focus ring). Checked 2× at 18:15 (tab A with the second pill active, tab B with the first pill active).
- **Repeat?** New (same family as the `aria-pressed` gaps in P02/P04/P06 for Journal review buttons).
- **Suggested fix:** `src/components/PortfolioBar.jsx`: add `aria-pressed={p.id === activePortId}` to each pill (and `aria-label="Portfolios"` on the group).

### P08-17 · Low · At 320 px the Portfolio tab scrolls sideways (header badges + value-card stats wider than the screen), even with small amounts
- **Steps:** View `/app` at 320 px wide (tested with a same-origin 320 px iframe), Portfolio tab, small book (INVESTED $850.00).
- **Expected:** No horizontal page scroll (the responsive standard: 16–18 px gutters, no sideways scroll).
- **Actual:** `scrollWidth 313` vs `clientWidth 302`; the page scrolls 11 px sideways. Elements past the edge: the header `div.title` with "CryptoIdea BETA ● LIVE STARTER" (right edge 313, the STARTER badge is clipped under the avatar) and `div.vc-stats` (INVESTED / 24H / ASSETS, right edge 310). Journal and Account → Portfolios at 320 px don't overflow. Reproduced 2× (first load, and after returning from Journal).
- **Repeat?** Related to P04-26 (avatar overlaps STARTER at 360–375 px) and P03-16 (value card overflows at 7-figure amounts); at 320 px it overflows with 3-digit amounts.
- **Suggested fix:** Let the header badges wrap or hide BETA/LIVE below ~340 px, and let `.vc-stats` wrap (flex-wrap or a 2-row grid) in `src/styles/app.css` — no new `@media` needed if `flex-wrap` + `min-width:0` are used.

