# Persona 07 — Altcoin hunter · 1-hour test · 2026-11-22
Status: Complete | Account: p07.altcoin@test.com | Start: 16:33 local | End: 17:29 local | Minutes tested: 56

## Persona
Altcoin hunter: lives in Search and Trending, scrolls for small caps, adds a lot of coins fast, and wants quick, accurate facts (price, rank, volume, supply) before buying. Hits the 30-coin cap and expects an honest message when it happens.

## Data created
| What | Detail |
|---|---|
| Account | Already existed (Alex Altcoin, **Premium**, 1 portfolio "My Portfolio" with Hyperliquid + WASTED from the 2026-11-21 run). It was not registered again. |
| Coins added (Search/Trending) | 99 coins added today (2 → 101 of 200). Bonk and Pearl were saved **with a thesis**, the rest via "Skip for now". Most came from typed searches of coins ranked #100–#400 (A7A5, LayerZero, Aero, AUSD, Akash, AINFT, Plasma, Meteora, MX, CASH, Kinesis Silver …), plus Trending: Official Trump, Bitcoin, Pieverse, Derive, Pudgy Penguins. |
| Theses | Bonk: "Solana meme with real community and burns…" / "Volume falls below 10M/day for a month." (saved priceAtAdd = mock $0.0000285). Pearl: "Small-cap with growing on-chain usage; trending today." / "Usage flat for 2 months or a big unlock." (priceAtAdd = 0, not shown). |
| Transactions | BUY 50,000,000 BONK @ $0.0000020996 (AUTO suggested price), Nov 22 2026 "14:49" (form time, really 16:49 local) = $104.98. BUY 100 ZRO @ $1.20 dated **2015-06-01 10:00** (deliberate pre-launch date, see P07-09) = $120.00. BUY 1 ZRO + BUY 2 ZRO @ $1.19 ("15:05" = 17:05 local). SELL 10,000,000 BONK @ $0.0000020996 (AUTO) = $21.00 ("15:09"). Holdings at the end: 103 ZRO, 40,000,000 BONK. |
| Failed attempts (nothing written) | Pearl thesis lost ×2 (P07-05). apyUSD / Jito / Bedrock ×2 / Pump.fun (new portfolio) / Popcat (with thesis + finding) refused by the daily cap (P07-06). |
| Portfolios | "My Portfolio" (92 coins at the end, after deleting Pearl, Aero, AUSD, Geodnet, Cap, Backpack, Dash, Bitcoin SV, First Digital USD), plus a new one created as "Moonshots 🚀" and renamed to `<b>Gems</b> 💎🚀 x100 altseason` (0 coins). |
| Theses (later) | Aero (added via Journal, then deleted with the coin, P07-10). LayerZero: Hebrew + emoji + `<img onerror>` text, saved as 🟡 Incomplete (one answer, by design R24), and rendered escaped. |
| Settings | Appearance switched to **Dark** mid-run and set back to **Light** at the end. The verify-email banner was dismissed once (it returns on reload). |

## Coverage
| Flow | Result | Notes |
|---|---|---|
| Login / logout (persona account) | Pass, with P07-01 | The account already existed (Premium). No registration needed. |
| Search: name, symbol, partial, prefix (1 char = local only) | Pass, with P07-02 | Substring search works. Exact tickers can be crowded out. The 25-row cap is silent. |
| Search: typos, cashtags, unicode, emoji, regex/HTML chars, `%`, 300-char input, whitespace-only | Safe (no crash, no injection) | P07-07, P07-08, P07-12. `币安` finds 币安人生. Decomposed accents (`é`) don't match. |
| Search under the `/api` rate limit (429) | **Fail** | P07-03: "No results" for real coins, or the previous query's rows. |
| Search prices / ranks / 24h vs live | **Fail** | BUG-021 still open (mock price, rank, 24h). P07-11: dead hard-coded coins offered. |
| Trending grid (desktop 3-up, phone 1-up), Added state per portfolio | Pass | "Added" is correct per active portfolio (new portfolio shows every coin addable). |
| Buy-Journal prompt: Save with thesis + findings, Skip, triple-click Skip | Pass, with P07-05 | No duplicate on a triple Skip. The draft is lost on throttle, daily cap or plan cap. |
| Rapid adds (2s cooldown) | Pass | Honest "too fast" toast, no duplicate rows. |
| Bulk adds toward the cap (9 → 101 coins, Premium 200 cap) | **Fail (copy)** | P07-06: the daily 100-add cap is shown as "too fast". The **30-coin Starter cap could not be reached**: this account is Premium (cap 200). By code, the Starter message is "Starter: 30 coins — upgrade to Pro for 100", and with `paidPlansEnabled` OFF that is an upsell to a plan you can't buy (BUG-032). |
| Duplicate add | Pass | The UI disables "Added". A server-side duplicate (two sessions) couldn't be attempted after the daily cap. |
| CoinInfo overlay: rank, market cap, 24h volume, circulating | Pass for non-top/held coins (10 coins matched `/api/prices` exactly) | **Fail** for not-held `TOP_COINS` (Bonk, Solana, Pepe → mock, P03-03). Micro-cap formatting P03-06. |
| Popups and keyboard | **Fail** | P07-04 / BUG-027. Coin icons are keyboard-focusable and open CoinInfo with Enter. P07-13 (identical "+ Add" names). |
| Buy / Sell on altcoins, AUTO price | **Fail** | BUG-023/024/026 still present. P07-09 (pre-launch dates accepted). Oversell blocked. |
| Delete coin (two-tap), bulk delete ×6, counters after reload | Pass, with P07-10 | Counters, Account usage and the header stay consistent after reload. |
| Second portfolio create / rename (emoji, HTML) | Pass | HTML is rendered escaped. |
| Two-session live sync (desktop tab + 375px iframe, same account) | Pass | Deletes on either side showed up on the other within ~3s. |
| Research Overview with a 92-coin, 2-held book | Pass, with known P03-08/P03-10 | |
| Journal (theses, Hebrew/RTL + emoji + HTML, partial save) | Pass | The partial thesis shows 🟡 Incomplete (R24, by design). |
| Learn | **Fail** | BUG-028 still present (modules 2–9 locked on Premium). |
| Account → Plan & billing, Portfolios | Pass, with P03-28 | |
| Landing DCA coin search | Pass (better ranking than the app) | P04-07 keyboard picker and P03-13 estimate still present. |
| **Dark mode** | Checked | Search, Trending, CoinInfo, Detail, Research and the mobile sheet are readable. Design note: on a dark *Added* Trending card the rank line is ~2.3:1 contrast (card at opacity .5), a DESIGN.md item. |
| **Mobile 375px** (same-origin iframe; the window resize tool was unavailable) | Checked | Trending, typed results (long names ellipsised), Buy-Journal full-screen sheet and CoinInfo sheet fit (scrollWidth 357). P07-07 overflow reproduced. P03-11 header overlap with PREMIUM. |
| Refresh / Back | Checked | Reload keeps the session and active portfolio. Back leaves the app (known). |
| Console | Clean | The only errors were the expected `[write-failed] resource-exhausted` logs from the throttle tests. |
| Not tested | — | CSV/JSON export (needs a file download). Contract-address search only partly (one Solana mint observed, then the browser tool blocked the long hex/base58 strings). Offline mode. /admin (rules). The Starter 30-coin cap (the account is Premium). |

## Findings

**Summary:** 14 P07 findings plus 2 High-severity repeats. **New to the project:** P07-01, P07-02, P07-03, P07-05, P07-06, P07-08, P07-12, P07-13 and P07-14, and P07-11 extends P05-03. **Same as an earlier persona:** P07-07 (= P05-30), P07-09 (= P02-14), P07-10 (= P02-08/P04-36), and P07-04, which is BUG-027 with the root cause already in P05/P06-10. For an altcoin hunter the worst problems are all about trust in Search. Prices, ranks and 24h % for the 80 built-in coins are invented (BUG-021), and so is CoinInfo for those coins (P03-03). An exact ticker can be impossible to find (P07-02). A failed or throttled search claims "No results" or shows the previous query's coins (P07-03). Bulk-adding runs into a daily cap that the app mislabels as "too fast" (P07-06), and the typed thesis is thrown away whenever an add is refused (P07-05).

### P07-01 · Low · Logging in after another account on the same device shows a red "Your plan is now Premium." toast
- **Steps:** 1) In a tab where a Starter account was signed in, Account → Logout. 2) Log in as p07.altcoin@test.com (Premium). 3) Watch the top of the Portfolio screen.
- **Expected:** No plan-change toast. This account's plan did not change.
- **Actual:** A red error-style toast "Your plan is now Premium." appeared right after login. Logging out and back in as the same account shows no toast, so the toast depends on who was signed in before.
- **Why:** `src/CryptoIdea.jsx:978` sets `lastTierRef=useRef(user?.tier)` once, when the component mounts, and never resets it when `user.uid` changes. The DI-6 watcher (`:980-985`) compares the new account's server tier with the previous account's tier. The reverse case (a Premium user logs out, a Starter user logs in) would wrongly tell the Starter user "Your plan is now Starter."
- **Reproduced:** 1× live (the first login of this run, after the previous persona's Starter session) + confirmed by reading the code; a same-account re-login (2nd attempt) and a full page reload (3rd) correctly showed nothing, which matches the root cause: only a session that inherits another account's tier in the mounted component triggers it. Rules forbid signing in as a second account, so I could not run the cross-account swap a second time.
- **New.** **Suggested fix:** in the DI-6 effect, set `lastTierRef.current=null` when `user?.uid` changes (or key the ref by uid), so the first server snapshot for a session only seeds the ref. Also use an info toast, not `showErr`, for a real plan change.

### P07-02 · Medium · Searching an exact ticker can miss that coin entirely (substring matches crowd it out of the 25-result cap)
- **Steps:** Search tab → type `IN` (or `OG`, `EL`).
- **Expected:** The coin whose symbol is exactly IN (INFINIT, #1231) is listed, ideally first.
- **Actual:** 25 rows of coins that merely *contain* "in" (Bitcoin, BNB, USDC, Chainlink, …) and no INFINIT. The same happens for `OG` (OG Fan Token #1227) and `EL` (ELYSIA #1201). A probe of the 40 lowest-ranked ≤3-letter symbols found these three unreachable by ticker. Similarly `eth` returns Tether (#3, its id "t**eth**er") ahead of Ethereum Classic.
- **Why:** `functions/index.js:3379-3393` matches on `id/name/symbol.includes(q)`, sorts purely by market-cap rank, then `slice(0,25)`. Exact symbol/name matches get no priority.
- **Also:** the cap is silent. `ai` matches 97 coins in the universe and `usd` matches 101, but only 25 rows show, with no "showing 25 of 97 — keep typing" hint, so the user can't tell the list was cut.
- **Reproduced:** 3×: API probe, UI `IN` (27 rows, no INFINIT), UI `el` (25 rows, no ELYSIA). Typing the full name `elysia` finds it, so the coin is there and only the ranking hides it.
- **New.** **Suggested fix:** sort by match quality first (exact symbol → exact name → prefix → substring), then rank, before the 25-slice. The landing DCA search already does this (`public/landing.js:125-126` puts prefix matches before substring matches). There, `og` lists OG Fan Token 2nd, while the in-app Search can't find it at all, so the two search boxes on the same site disagree.

### P07-03 · Medium · A failed/rate-limited search shows "No results for "pump"" for coins that exist
- **Steps:** Search quickly for a while (the `/api` limiter is 60 req/min per IP and is shared with prices/history), or simulate it: run 65 `/api/search` fetches, then type `pump` in Search.
- **Expected:** "Search is busy — try again in a moment" (or a retry), never a claim that the coin doesn't exist.
- **Actual:** `No results for "pump"`. Pump.fun exists (#70, it's even on the Trending list). For `sui` only the built-in mock row showed, and every other Sui-named coin silently disappeared. Network: `search?q=pump → 429`, `search?q=sui → 429`.
- **Why:** `src/api/coingecko.js` `searchCoins` returns `null` on any non-OK response, and `src/hooks/useCoinSearch.js:26` ignores null, so the UI cannot tell "no match" from "request failed". `src/components/Search.jsx` then renders the "No results" line.
- **Reproduced:** 2× (`og` during my API probing, `pump` after a deliberate burst).
- **Worse variant, wrong results:** if the previous search succeeded, a failed search keeps showing the **previous query's** results under the new query. I searched `pepe` (Pepe, Ape and Pepe), the limiter then returned 429, and I typed `kaspa`. The list showed Kaspa **plus Pepe and Ape and Pepe** with "+ Add" buttons. Typing `tron` showed TRON + Pepe + Ape and Pepe, and later `sats` → 429 burst → `ondo` showed Ondo + **SATS (Ordinals)**. Reproduced 3×. After the 60s limiter window, the next keystroke recovers (correct results), but nothing tells the user to retype. It happens because `useCoinSearch` only replaces `liveCoins` on success, so stale rows survive. Even on success they briefly flash for the 300ms debounce plus the fetch. The same fix (clear `liveCoins` when the query changes, keep an `error` state) covers both.
- **New.** **Suggested fix:** have `useCoinSearch` return an `error` state (429/5xx/offline) and render a distinct "Couldn't search right now" message in `Search.jsx`.

### P07-04 · Medium · No popup can be closed from the keyboard: Escape does nothing and the X is not focusable (root cause of BUG-027, wider than Detail)
- **Steps:** Search → click a coin icon (e.g. Pump.fun) to open the CoinInfo overlay → press Escape → press Tab.
- **Expected:** Escape closes the popup. The X close control can be reached with Tab and activated with Enter.
- **Actual:** Escape does nothing (pressed 3× across 2 openings). The X is a `<div role="button">` with `tabIndex -1`. Focus stays on `<body>` when the dialog opens, and the first Tab lands on the "CoinGecko" link inside the dialog. A keyboard-only user can't close it.
- **Why:** `src/components/Modal.jsx` has no Escape handler at all (its only keydown listener handles Tab, and only when `trapFocus` is on), and `.cm-close` (`Modal.jsx:47`) has no `tabIndex`/`onKeyDown`. Every popup uses this Modal, so the CoinInfo overlay, the Buy-Journal prompt, Detail (BUG-027) and the confirms are all affected.
- **Reproduced:** 2× (Pump.fun, Bonk overlays).
- **Focus escapes behind the popup:** with the Search "Before you add Pearl…" prompt open, focus stays on the `+ Add` button *behind* the scrim. One Tab moves to the next coin icon in the page behind, and Enter opens that coin's CoinInfo **on top of** the half-filled prompt ("Before you add Pearl… / Derive", "Before you add Venice Token… / Pieverse"). Reproduced 2×. The dialog also has no accessible name (`aria-labelledby`/`aria-label` both null). The fix is the same: move focus into the card on open, trap Tab (the `trapFocus` code already exists in `Modal.jsx`, it's just opt-in), and set `aria-labelledby` to the title.
- **Repeat of BUG-027 (still open).** The same root cause was already written up in P05 and P06-10. This run confirms it on the CoinInfo overlay and on the Detail + Sell stack. **Suggested fix:** in `Modal.jsx` add a document-level `keydown` Escape → `onClose()` when `!hideClose` (skip it for forced/`trapFocus` gates), render the X as a real `<button aria-label="Close">`, and move focus into the card on open.

### P07-05 · Medium · A thesis typed in the Buy-Journal prompt is thrown away when the add is throttled ("You're doing that too fast")
- **Steps:** Search → add any coin with "Skip for now" → within ~2s, + Add a second coin, type both thesis answers, press "Save to Journal & add coin".
- **Expected:** The coin is not added (fair, the 2s cooldown), but the prompt stays open with the text so I can press Save again a moment later.
- **Actual:** The prompt closes, the toast says "You're doing that too fast — please wait a moment and try again.", the coin is NOT added, and re-opening + Add for the same coin shows empty fields. The thesis is lost. An altcoin hunter adding coins in a burst hits this all the time.
- **Why:** `src/components/Search.jsx:34-48` `confirmAdd` calls `closeOverlay()` (which clears `thesis`/`changeMind`/`funnel`) *before* `addCoin` runs. `addCoin` (`src/CryptoIdea.jsx:764-783`) does not return a success value, so Search can't keep the draft on failure. (Same shape as P03-22, the over-length case, and P02-02, the X-close case. This is the throttle case.)
- **Reproduced:** 3×: Pearl twice (2s cooldown), and Popcat after the daily cap (P07-06). There, both thesis answers **and** a typed "Dilution" research finding were lost, and the reopened prompt had all 5 fields empty. By code, the Starter 30-coin cap path (`addCoin` → `showErr("Starter: 30 coins — …")`) loses the draft the same way, so a Starter user who writes a careful thesis for coin #31 loses it.
- **New.** **Suggested fix:** make `addCoin` return `true/false`, and in `confirmAdd` close the overlay only on success (keep the draft + show the error inline on failure).

### P07-06 · Medium · Hitting the 100-adds-per-day cap shows "You're doing that too fast — please wait a moment", but the real answer is "come back tomorrow"
- **Steps:** Add coins from Search one by one (about 3.5s apart, under the 2s cooldown) until about 100 adds today. I went from 9 to 101 coins in the Premium portfolio. Then wait 10s and try one more (Bedrock) with "Skip for now".
- **Expected:** An honest daily-cap message ("You've reached today's add-coin limit — try again tomorrow"), different from the cooldown message, and different from the plan-cap message.
- **Actual:** The toast says "You're doing that too fast — please wait a moment and try again." every time, however long you wait. The console shows the server sent the honest text: `[write-failed] resource-exhausted rate-limited You've reached today's add-coin limit — please try again tomorrow. [429]` (4×: apyUSD, Jito, Bedrock ×2, 10+ seconds apart). A user retrying "in a moment" stays stuck until UTC midnight without being told.
- **Why:** `functions/index.js` (addCoinGuarded) sends both the 2s cooldown and the daily budget with the same `reason:"rate-limited"`. `src/api/firebase-database.js:265-275` keeps only `code/reason`, and `src/utils/errors.js:28-32` maps `rate-limited` to the one "too fast" sentence. The same applies to `addTransactionGuarded`.
- **Reproduced:** 5× (see console log above). The 5th was in a brand-new, empty second portfolio ("Moonshots 🚀"): after the cap you can't add even the first coin to a new portfolio, and the toast still says "wait a moment".
- **New.** **Suggested fix:** give the daily budget its own reason (e.g. `daily-limit`) in `addCoinGuarded`/`addTransactionGuarded` and add a matching branch in `apiErrorMessage`. A side product note for the founder: with a 100/day add cap, a Premium user can't fill even one 200-coin portfolio in a day. That may be intended (anti-abuse), but the Plan screen doesn't say so.

### P07-07 · Low · A long query with no spaces makes the whole Search page scroll sideways
- **Steps:** Search → paste a 150+ character string with no spaces (e.g. `WIFWIFWIF…`).
- **Expected:** The "No results" line wraps or truncates inside the column.
- **Actual:** `No results for "WIFWIF…"` runs off the right edge, and the page gets a horizontal scrollbar (`scrollWidth 1407` vs `clientWidth 1135` at desktop width). The input has no `maxLength`, while the server silently cuts the query to 100 chars.
- **Why:** The no-results `<div>` at `src/components/Search.jsx:82` has no `overflow-wrap:anywhere`/`word-break`.
- **Reproduced:** 2× (desktop 1150px, phone width — see Coverage).
- **Same as P05-30 (still open)**, also reproduced at 375px. **Suggested fix:** add `overflow-wrap:anywhere` to that line, truncate the echoed query (e.g. 40 chars + "…"), and set `maxLength={100}` on the input to match the server cap.

### P07-08 · Low · Whitespace-only and one-character queries claim "No results" for coins that exist
- **Steps:** Search → type three spaces.
- **Expected:** Trending stays visible (the query is empty once trimmed). That's what the live-search hook does, since it trims.
- **Actual:** The Trending grid disappears and the page says `No results for "   "`.
- **Why:** `Search.jsx` tests `sq.length >= 1` (untrimmed), and `useCoinSearch`'s local filter also uses the raw `sq`.
- **Same family, one character:** a 1-char query only searches the 80 built-in `TOP_COINS` (the live search needs ≥2 chars), so `z` → `No results for "z"` (Zcash, Zebec, Zama, ZKsync exist), `0` → No results (0G, 0x Protocol), `1` → No results (1inch), while `w` lists only Wrapped Bitcoin + Worldcoin (both from the hard-coded table).
- **Reproduced:** 2× (whitespace), 3× (`z`, `0`, `1`).
- **New.** **Suggested fix:** use `sq.trim()` for the empty-state test and the local filter. For a 1-char query, show a hint ("type 2+ characters to search all coins") instead of "No results".

### P07-09 · Low · Every coin outside the built-in top list says "Date & Time · available from 2013-04-28" and accepts buys from years before it existed
- **Steps:** Portfolio → LayerZero (ZRO, launched 2024) → + Buy. Read the date label, then set the date to 2015-06-01 10:00, amount 100, and press Add Buy.
- **Expected:** The earliest date is the coin's real first-price date (`/api/history` or the universe metadata). If that's unknown, say "launch date unknown" and don't present Bitcoin's genesis as this coin's.
- **Actual:** "available from 2013-04-28" (Bitcoin's first CoinGecko day) for LayerZero and AINFT. The 2015 buy was saved without a warning ("BUY 100 ZRO · Jun 1, 2015"). For an altcoin hunter almost every coin is outside `TOP_COINS`, so the label is wrong almost everywhere.
- **Why:** `src/components/AddEntry.jsx:30-31`: `launchDate = coinData?.launch || "2013-04-28"`, and `coinData` only exists for `TOP_COINS`.
- **Reproduced:** 2× (AINFT, LayerZero), plus the 2015 save once.
- **Same as P02-14 (still open)**, reproduced on two more coins. **Suggested fix:** derive the floor from the first point of `useCoinHistory(sel.id)` when present. Otherwise hide the "available from" sub-label and skip the min-date clamp instead of defaulting to 2013.

### P07-10 · Medium · Deleting a coin that has a thesis but no transactions erases the thesis with no warning (quick two-tap "Remove")
- **Steps:** Journal → "Add thesis" on Aero (fill both answers, Save thesis) → Portfolio → Aero → trash icon → "Remove".
- **Expected:** The same "you'll lose your saved thesis — this can't be undone" warning that coins with transactions get. The thesis is the most valuable thing this persona writes.
- **Actual:** A small red "Remove" pill, with no mention of the thesis. One more tap and the coin and its thesis are gone (Journal "Your theses" went from 2 → 1). The same happened with Pearl (thesis saved from the Search Buy-Journal prompt).
- **Why:** `src/components/Detail.jsx:30-32` / `:69-71` show the full warning only when `coin.entries.length>0`, and the warning text at `:157` mentions the thesis no matter whether one exists (the P03-29 mirror image).
- **Reproduced:** 2× (Pearl, Aero).
- **Same as P02-08 / P04-36 (still open)**, reproduced 2× more. **Suggested fix:** treat `coin.journal` like transactions. Use the full confirm when `entries.length>0 || coin.journal`, and build the copy from what actually exists ("N transactions", "your saved thesis", or both).

### P07-11 · Low · Search offers hard-coded coins the server has no data for (Fantom, Maker, EOS …) with invented price and rank
- **Steps:** Search → type `fantom`, `maker`, or `eos`.
- **Expected:** Only coins the server knows, with live data. A migrated/rebranded coin either isn't offered or points to its successor (the server already returns "POL (ex-MATIC) #77" for `matic`).
- **Actual:** "Fantom FTM · #46 · $0.7800 +3.10%", "Maker MKR · #48 · $2,850.00 +0.50%", "EOS EOS · #56 · $0.8200 −0.30%", each with "+ Add". None of these is in the server universe (`/api/search` doesn't return them), and `/api/prices` returns nothing for 8 of the 80 `TOP_COINS` ids: `staked-ether, matic-network, wrapped-bitcoin, fantom, maker, eos, stacks, synthetix-network-token`. Once added, such a coin could only ever show the mock seed or "—", under a "● LIVE" badge. (I couldn't add one to confirm, because the daily add cap was already used up.)
- **Why:** `useCoinSearch` merges local `TOP_COINS` matches (`src/utils/coins.js`, hard-coded mock price/rank/24h) ahead of the server results, without checking the server has the coin.
- **Reproduced:** 2× (UI search for fantom/maker/eos; `/api/prices` probe of all 80 ids).
- **Extends P05-03** (Maker valued at mock $2,850). This adds the Search side: 8 of the 80 hard-coded ids have no server data, yet they're offered with fake rank and price. Caveat: the emulator universe is ~1,262 coins, and the upstream on-demand refetch for off-list ids may behave differently with a real CoinGecko key. **Suggested fix:** drop `TOP_COINS` from Search results (server search only, as the BUG-021 fix proposes), or at least filter local matches to ids the server returns.

### P07-12 · Low · Search ignores cashtags and typos: `$PEPE`, `#bonk`, `bitcon`, `ethreum` all return "No results"
- **Steps:** Search → type `$pepe`, `$WIF`, `#bonk`, `bitcon` or `ethreum`.
- **Expected:** An altcoin hunter copies tickers from social feeds as `$TICKER`. Stripping a leading `$`/`#` would find the coin, and a one-letter typo could still surface Bitcoin/Ethereum, or at least a "did you mean".
- **Actual:** `No results for "$pepe"` (and the same for the others), while `pepe` finds Pepe at once. A trailing space (`pepe `) works because the hook trims.
- **Why:** `functions/index.js:3380` only lower-cases and trims, then uses substring `includes`. The client local filter uses `startsWith` on the raw string.
- **Reproduced:** 2× each for `$pepe`/`$WIF`, and the typos via the API. Pasting a Solana mint address (44 chars, the BONK mint) also gave `No results`. That's 1× only, because the browser tool refused to run the hex/base58 test strings again.
- **New (enhancement-grade).** **Suggested fix:** strip leading `$`/`#` (client and server). Optionally fall back to an edit-distance ≤1 match on symbol/name when there are zero substring hits.

### P07-13 · Low · Screen readers hear 13–15 identical "+ Add" buttons, and the search box has no label
- **Steps:** Search tab (Trending, or type `cat`) → inspect the buttons' accessible names.
- **Expected:** "Add Popcat", "Add Catizen", … so a screen-reader user knows which coin each button adds. The search input has a real label ("Search coins").
- **Actual:** All 15 Trending buttons and all typed-result buttons are named just "+ Add" (no `aria-label`). The input has only a placeholder (`aria-label` null, no `<label>`).
- **Why:** `src/components/Search.jsx` `.add-pill` buttons (lines 77 and 103) and the `<input>` (line 61).
- **Reproduced:** 2× (Trending: 15 buttons, 1 unique name; `cat` results: 13 buttons, 1 unique name).
- **New.** **Suggested fix:** `aria-label={(ad ? "Already added: " : "Add ") + coin.name}` on the pill, and `aria-label="Search coins"` on the input.

### P07-14 · Low · CoinInfo "Your Position" for a watched coin (0 held) shows "Avg cost $0.0000000000" and a green "Unrealised P/L +$0.00 (+0.00%)"
- **Steps:** Add a coin with "Skip for now" (no transactions), e.g. Derive or Official Trump → open its icon (CoinInfo).
- **Expected:** For a 0-held watch-list coin, either hide "Your Position" or show "—" for avg cost and P/L.
- **Actual:** "Held 0 DRV · Avg cost $0.0000000000 · Unrealised P/L +$0.00 (+0.00%)", with the P/L in green (`rgb(92,214,166)` in dark mode). An altcoin hunter with 90 watched coins sees this on every one.
- **Why:** `src/components/CoinInfo.jsx:96` renders `fmtP(avgBuy)` with avgBuy = 0. The P/L colour is the BUG-022 family.
- **Reproduced:** 2× (Derive, Official Trump).
- **New** (the avg-cost part; the green +$0.00 is BUG-022). **Suggested fix:** render the position block only when `holding>0 || entries.length>0`, and otherwise show "—".

### Repeat of BUG-021 · High · Search rows still show mock prices, mock 24h changes AND mock ranks (still open)
- **Steps:** Search → type `b`.
- **Actual vs live (`/api/prices`, same minute):** Bitcoin $84,000 / +2.40% vs live $60,576 / +0.52%; Bitcoin Cash $485 vs $197.87 (2.45×); Bittensor $520 · **#61** vs $190.42 · **#38**; Bonk $0.0000285 · **#64** vs $0.00000206 · **#158** (13.8×). Coins outside `TOP_COINS` show no price at all. `Search.jsx:46` also saves `priceAtAdd: coin.mockPrice || 0`, so a thesis on any non-top coin records a price of **0**.
- **Reproduced:** 2× (`b`, `IN`: ICP $12.80/−0.30%, INJ $26.80/+4.20% both mock).
- **Status:** still present. Extra detail beyond BUG-021: the hard-coded **rank** and **24h %** are wrong too, and the `|| 0` fallback.

### Same as P03-03 (not in BUGS.md) · High · CoinInfo for a not-held TOP_COINS coin shows only mock data
- **Steps:** Search `bonk` → click the Bonk icon.
- **Actual:** $0.0000285000, "+6.70% today", Rank #64, Market cap $1.90B, volume "—", circulating "—". Live `/api/prices` at the same time: $0.00000206, +0.33%, rank #158, mcap $181.65M, vol $20.0M, circ 87.99T. A non-top coin (Pump.fun) shows correct live data, rank/mcap/vol/supply all matching `/api/prices`.
- **Why:** `src/hooks/useLivePrices.js:14-18` seeds `prices` with every `TOP_COINS` mock, so `CoinInfo.jsx:25` sees `prices[coin.id]` as present and skips its one-shot live fetch. It's the same root cause as BUG-023.
- **Reproduced:** 2×: Bonk, and Solana from the Trending grid: $125.00 · +3.20% · **Rank #5** · mcap $78.00B · a flat fake "Price History" (1y/6m/3m all $125.00 +0.00%), against live $70.09 · −0.29% · rank #7 · mcap $41.49B. The Trending card behind the popup says "SOL · #7", so the two disagree on the same screen. At the end of the run, Ondo from Trending also showed mock data: Rank #70 · $2.00B · volume "—", against live #53 · $1.38B · $55.89M volume. Venice Token (not in the built-in table), opened right after it, matched live exactly.
- **Suggested fix:** with the BUG-023 fix (no mock seed), or in CoinInfo fetch whenever `prices[id]` lacks `usd_market_cap_rank` (live payloads always carry it).

### Also seen (already reported by other personas, not in BUGS.md)
- **P03-04**: Trending card "PUMP · #70" vs CoinInfo "Rank #71" for Pump.fun (trending cache vs universe rank).
- **P03-06**: Baby Doge Coin (live 2.45e-10) shows "$0.0000000002" in CoinInfo, one significant digit; SATS 7.176e-9 → "$0.0000000071".
- **P03-05**: AINFT Buy form pre-fills the price as `1.89271e-7` (scientific notation in the input).
- **P03-08**: Research Pulse says "Over the last 30 days, Bonk drove about 100% of that move" and "−17.3%", while LayerZero (54% of the book) has an empty `/api/history`, so its 30-day move is silently counted as 0%.
- **P03-10**: The Risk card says "A mix of ranks and sizes" for a 2-coin book that is 100% mid-ranked.
- **P03-11**: At 375px with the **PREMIUM** badge, "● LIVE" wraps onto two lines and the PREMIUM badge runs under the account avatar (measured in a 375px frame: PREMIUM spans x 249–315 and the avatar starts at x 306, a **9px overlap**; the LIVE pill is 34px tall vs 20px for the other tags).
- **P03-13**: Landing DCA "Price today $103,000" for Bitcoin (live ≈ $60.8k), because `/api/history?id=bitcoin` is empty in this environment.
- **P03-15**: The delete-coin trash button in Detail has no accessible name (`<button class="icon-btn">` with no label).
- **P03-28**: Account → Plan & billing says "AI research · Live" while AI research is off.
- **P02-13 / P03-01**: After selling 10M BONK, Detail shows "Sold … · $20.996" and "Total P/L −$1.184 (-1.13%)", money with three decimals (and mixed minus signs, BUG-026).
- **P03-30**: A *new* oversell says "Delete or reduce that sell first."
- **P03-18 (same root)**: The query is never cleared except by a successful add, so Portfolio → "+ Add" opens Search with the old query (`ondo `) still in the box and its results showing. The same happened after the Transactions-pill round-trip (`bonk`).
- **P04-07**: Landing DCA coin picker: `baby doge` → one suggestion, but ArrowDown/Enter don't select it (the options are click-only `div`s), and the result card keeps showing Bitcoin. The landing picker also ignores `$pepe` (same cashtag gap as P07-12).
- **P02/P04 (navigation)**: Browser Back from any in-app tab leaves `/app` for the previous page (`/#dca`), because tabs push no history entries.

## Known bugs re-checked
| Bug | Result | Evidence (this run) |
|---|---|---|
| BUG-019 Oversell | Appears fixed | A sell of 60M BONK against 50M held was refused before writing. The copy is still P03-30's "Delete or reduce that sell first" for a *new* sell. |
| BUG-020 Live-sync toast during setup | Not reached | No new account was created. |
| BUG-021 Search mock prices / thesis saves them | **Still present** | BTC $84,000 vs $60,576, BCH 2.45×, BONK 13.8×, PEPE 3.5×. Mock **ranks** (#61 vs #38, #64 vs #158, #63 vs #52) and mock **24h %** too. The Bonk thesis saved $0.0000285 (live $0.00000206), and the Pearl thesis saved `priceAtAdd: 0`. |
| BUG-022 Empty holding green "+$0.00" | **Still present** | Bonk Detail before buying: "+$0.00 (+0.00%)" in green (`rgb(7,80,58)`), and in dark mode it sits in a green-tinted box. The header "24H +0.00%" is green on the empty "Moonshots 🚀" portfolio. |
| BUG-023 AUTO price pre-fills mock | **Still present** | BTC Buy pre-filled 84000.00 (live 60,803). Bonk Buy pre-filled 0.0000180835 and Bonk Sell 0.0000180838, which is the built-in estimate from `getHistoricalPrice`, 8.7× live, so a 60M BONK sell previews "$1,085.03" vs ≈$124 real. Non-top coins (LayerZero 1.2) pre-fill the correct live price. |
| BUG-024 UTC time shown as local | **Still present** | At 16:49 local the form showed `2026-11-22T14:49`, and the saved tx reads "02:49:00 PM". |
| BUG-025 AUTO estimate labelled market price | Not separately re-checked | The Bonk estimate pre-fill above is the same mechanism. |
| BUG-026 Mixed minus signs | **Still present** | "−$1.48 (-1.41%)" on Bonk Detail and "▼ −$1.48 (-0.66%)" on the portfolio header (U+2212 then hyphen). |
| BUG-027 Escape doesn't close Detail | **Still present, root cause found** | See P07-04. No popup handles Escape (CoinInfo, Detail + Sell form stack both stayed open). |
| BUG-028 Learn modules 2–9 locked | **Still present** | Premium account: Tokenomics & Supply and Spotting Real Demand show lock icons and do nothing on click. |
| BUG-029 Quiz answers not exposed as controls | **Still present** | In the module-1 lesson quiz, an accessibility-tree search finds only Previous/Submit; the 4 answer rows are not controls. |
| BUG-030 Wrong answer stays green | **Still present** | Picked "The token is now undervalued", then "The team shipped a major product" → Submit. Each time "Not quite…" showed, but the chosen wrong row stayed green-highlighted with a green dot (2×). |
| BUG-033 Oversized "Security & payment emails" text | **Still present** | Account → Privacy & data: that line is 16px, against 11–13px for the rest of the card. |
| BUG-036 100% single-token rated Low | Not reached | The book was 2 coins (ZRO + BONK), rated Moderate. |
| BUG-037 "higher-beta amplify" at exactly −50% | Not reproduced on this book | At −50% this book models −52.0%, so the "amplify" wording was true here. |
| BUG-038 Daily Brief ▲ when down | Not reached | The book was up on the day (+1.6–1.8%). |
| BUG-005 Admin tab signs out sessions | Not reached | /admin was not opened (per rules). |

## What worked well
- The Search box is **fast** (rows in ~0.5s), injection-safe (HTML, regex chars, `%`, 300-char input all harmless), and handles CJK names (`币安` → 币安人生).
- **CoinInfo for live coins is accurate.** Rank, market cap, 24h volume and circulating supply matched `/api/prices` to the cent for 10 sampled held coins and for not-held non-top coins (Pump.fun, Pearl).
- **Throttling holds.** The 2s add cooldown and the 100/day cap both stop a scripted burst cold, with no duplicate coins, no counter drift, and counters still consistent after 99 adds, 9 deletes and a reload.
- **Per-portfolio "Added" state** and the **live multi-session sync** (delete on one device → gone on the other in ~3s) work well.
- **Oversell protection (BUG-019)** still holds for a new sell.
- Theses accept Hebrew/RTL, emoji and HTML and render them safely, and a partial thesis gets an honest 🟡 Incomplete pill.
- The phone layout of Search, Trending, the Buy-Journal sheet and the CoinInfo sheet is clean (long fund names ellipsise, no overflow in normal use).

## Timeline
- 16:33 Start. Health check: app :3000 → 200, functions :5001 → 404 (up).
- 16:34 The tab was still signed in as the previous persona (Starter). Logged out, logged in as p07. Got a false "Your plan is now Premium." toast (P07-01). The account already existed (Premium, 2 coins).
- 16:36 Search probes: prefix, symbol, typos (`bitcon`, `ethreum` → nothing), unicode (`币安` finds 币安人生, `ü`/`比特币`/🚀 → none), `%`, `<script>`, 300×`a` → all safe. Found P07-02 (ticker crowded out) and BUG-021 (mock price/rank/24h).
- 16:38 Rate-limit probe: a failed search reads "No results" (P07-03).
- 16:39 CoinInfo: Pump.fun live data correct. Bonk/Solana/Pepe mock (P03-03). Escape/keyboard can't close (P07-04).
- 16:41 Rapid adds: 2s cooldown toast is honest. Thesis lost when throttled (P07-05).
- 16:43–16:48 Scripted burst of ~92 adds from Search (3.5s apart): 9 → 101 coins, then the daily cap with the misleading "too fast" toast (P07-06).
- 16:49 Buy BONK via AUTO (estimate pre-fill, BUG-023/024/026). BTC pre-fills 84000. LayerZero 2015 buy accepted (P07-09).
- 16:52 Research Overview with 2 held coins. Dark mode on. Mobile 375px via same-origin iframe: P07-07/P07-08 reproduced, header badges overlap the avatar (P03-11).
- 16:55 Delete coin with thesis → no warning (P07-10, 2×). Second portfolio "Moonshots 🚀" created. Daily cap blocks the very first coin there. Two-session live sync OK.
- 16:57 Stale results under a new query (P07-03 variant). Learn modules still locked (BUG-028). Landing DCA search ranks better than the app.
- 17:00 Fantom/Maker/EOS offered with invented data (P07-11). Plan & billing still says "AI research Live" (P03-28). Portfolio rename with HTML/emoji escapes correctly.
- 17:05 Delete ×6 + reload: counters consistent. Thesis + finding lost again on the daily cap (P07-05, 3rd repro). Cashtag / contract-address searches (P07-12).
- 17:10 Price poll confirmed (60s, 200). Hebrew/HTML thesis renders safely. Search a11y (P07-13). Focus escapes the Buy-Journal prompt and opens a second popup (P07-04).
- 17:15 0-held CoinInfo "Avg cost $0.0000000000" (P07-14). 1-char queries (P07-08). Back to Light mode.
- 17:18 Stress test at −50% (BUG-037 not reproduced). Journal status change persists after reload. Banner returns after reload (by design).
- 17:19 Learn quiz: BUG-029 and BUG-030 still present. Privacy card BUG-033 still present.
- 17:20 Final pass on CoinInfo position maths (correct). Ondo CoinInfo from Trending is mock (P03-03, 3rd coin).
- 17:25–17:28 Idle-session watch (~3 min): no sync toast, no console errors, and the price poll kept running. Closed my tab. Wrap-up.
