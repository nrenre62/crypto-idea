# Admin session 06 — Manager (accounts-only admin) · 75-min test · 2026-11-24
Status: Complete | Admin account: manager@test.com | Start: 14:30 local (epoch 1795523440) | End: 15:41 local | Minutes tested: 71

## Scope
Manager (`role:"manager"`) acting on user accounts and the LIVE effect on logged-in user-app sessions: tier downgrade over caps, Premium limits lowered/raised, tier change with Buy/Sell open, suspend mid-edit, live vs refresh, notes, bulk actions, audit-entry correctness. Emulator only (localhost:3000).

## Accounts and state touched
| Account | Original state | Change made | Restored? |
|---|---|---|---|
| pro@test.com | Pro · 2 portfolios (P1 6 coins, P2 4 coins) · not suspended · no admin note · user doc had no `planChosen` | Added portfolios "QA S06 P3"/"QA S06 P4" (+BTC/ZEC/SOL coins, BTC buys/sell); tier Pro→Starter→Pro→Starter→Pro(bulk); suspended ×2 / un-suspended ×2; note set + cleared. Side effect: auto `chooseFreePlan` set `planChosen:true` (S06-03) | Y — tier Pro, not suspended, note empty (an empty `adminNotes` doc now exists), P3/P4 deleted. **Tester incident (14:54):** while cleaning up, a too-broad DOM selector in my cleanup script hit "Delete portfolio" on **Portfolio 1** (seed data: 6 coins, 0 transactions, no theses — matches the Nov-21 `emulator-data` snapshot). I recreated it with the exact seed shape (`p1`, order 0, coinCount 6, bitcoin/ethereum/solana/cardano/polkadot/chainlink with `txCount 0`, empty thumb) through the emulator's owner REST endpoint and set `portfolioCount 2`; the app shows Portfolio 1 (6/100) + Portfolio 2 (4) again. Only differences from before: new `created`/`addedAt` timestamps. `planChosen` stays true (S06-03 side effect) |
| p07.altcoin@test.com | Premium · 1 portfolio / 2 coins (HYPE, WASTED; 0 tx) · `premiumLimits` none | Custom limits 1/1 → Clear ×2; tx limit 1 → Clear; 2 HYPE buys added then deleted; → Starter → Premium with Detail open (15:20); → Pro → Premium → Starter → Premium with the Downgrade picker open (S06-13, picker closed without Continue) | Y (`premiumLimits {}`, coinCount 2, txCount 0 verified) |
| free@test.com | Starter · 1 portfolio / 3 coins · `planChosen` unset | Tier → Pro → Starter (S06-03 repro). Side effect: `planChosen:true` (set by the app's auto `chooseFreePlan`; same as any normal login) | Y tier; `planChosen` left true (harmless, can't be unset without a Firestore edit) |
| qa-adm-06@test.com (own throwaway, registered 14:49, QaAdmin#2026) | new Starter account | Premium/Pro/Starter cycles, custom limits, suspend ×4 / trash ×4 / restore ×4 (2 by the user, S06-08), 3 portfolios (one deleted at the end → 2), 31 scripted coins + 1 Bitcoin + 3 txs, a thesis, notes | Left as throwaway: Starter, not suspended, not deleted, `premiumLimits {}`, empty `adminNotes` doc, test data kept. Not permanently deleted (a manager can't; owner may purge) |
| p08.organizer@test.com | Starter · 2 portfolios (My Portfolio, Trading; 0 coins) · `planChosen:true` · no `premiumLimits` field | → Premium + custom Portfolios 1 → Clear → Starter, all with p08 logged in (live each step) | Y (tier free, 2 portfolios; leaves an empty `premiumLimits {}` map — harmless) |
| p04.dca@test.com | Starter · 1 portfolio / 0 coins · `planChosen:true` | → Premium (live + after reload) → Starter (live) with p04 logged in | Y (tier free verified) |
| p05.defi@test.com | Starter · 1 portfolio / 1 coin · active · admin note empty | Suspend → login refused → Un-suspend → login OK; note set (not visible in p05's open app) → cleared | Y (active, Auth enabled, note empty) |
| p02.longterm / p03.speculator | Starter (`planChosen:true`) | Bulk → Pro → bulk → Starter | Y (verified with each user's own token) |

## Coverage
| Admin function (as manager) | Result | User-app effect verified | Live / reload |
|---|---|---|---|
| Change tier Pro→Starter with user over the Starter caps | **Fail S06-01, S06-02, S06-03** (data kept ✓, + add-portfolio hidden ✓) | Y | Live (toast + caps) and same after reload |
| Change tier Starter→Pro with Buy form open | Pass — form values kept, lock tags removed, "+" returns, buy saved | Y | Live |
| Suspend / Un-suspend mid-edit (Sell form open) ×2 | **Fail S06-04** (Repeat S01-06); login refusal message OK | Y | No live effect; reload → silent logout |
| Custom Premium limits below usage (1/1) and Clear ×2 | Enforced live ("2/1", "Over plan limit", add refused "Max 1 coins per portfolio"); **S06-05** form not cleared (Repeat S01-02) | Y | Live, and after reload |
| Private admin note set/clear | Pass — saved, audited without content, user token gets 403 on `adminNotes/{uid}` | Y (no leak) | n/a |
| Custom tx limit lowered to 1 while Buy form open (p07, 1 tx) | Pass — submit refused "Max 1 transactions per coin", form kept; after Clear the same submit succeeds (live) | Y | Live |
| Sign out all devices (keyboard-only: Tab ×9 + Enter) | Open session unaffected until reload (Repeat S01-06); reload → silent logout. Focus lands on BODY after opening a user row with Enter | Y | Reload only |
| Downgrade while user's "New portfolio" dialog is open (pro, 4 portfolios) | Pass — Save refused client-side "Starter: 3 portfolios — upgrade to Pro for 6" (upsell = Repeat BUG-032); no portfolio created | Y | Live |
| Plan & billing screen open during tier change | Live update (4/3 → 4/6, caps); comped Pro shows "Cancel Pro / Update payment method" (Repeat S01-13), "AI research · Live" (Repeat BUG-058) | Y | Live |
| Move to trash (typed DELETE) with user mid-thesis, then admin Restore | Live: user sees "You deleted this account" (Repeat S01-07) and the unsaved thesis draft is lost; admin Restore returns the open tab to the app live. Trash tab copy says "Accounts users have deleted" for an admin-trashed account | Y | Live |
| Bulk Suspend / Un-suspend (1 user, qa-adm-06 logged in) | Pass ("Suspended 1 ✓" / "Un-suspended 1 ✓", one audit entry each); open session unaffected (S01-06). Select-page-then-search still keeps 15 selected with 1 visible (Repeat S01-19, not executed) | Y | Live: none |
| Admin note: 5,026-char + HTML payload | Server truncates to 4,000 (`NOTE_MAX`) and says "Note saved ✓"; textarea `maxLength=4000` prevents this in normal typing; HTML stored and shown as plain text (no element injected) | n/a | — |
| Users search (name/email/case/whitespace/uid/HTML) | Name+email pass; uid → 0 (S06-10); HTML text inert | n/a | — |
| Admin user detail at 375 px | No overflow; tier/limit/note buttons are 34 px tall (below a 44 px touch target), "Suspend" / "Sign out all devices" wrap to two lines (59 px) | — | — |
| Custom limits via keyboard | Enter in a limit field does nothing (fields aren't in a `<form>`; must Tab to "Save custom limits"); blanking Portfolios kept `portfolios:2` server-side (Repeat S01-02) | — | — |
| Repeat on another persona (p08: Starter→Premium→custom Portfolios 1→Clear→Starter) | Pass, all live; locked 2nd portfolio "Trading" has no lock marker (S06-01); qa-adm-06 Account → Portfolios (3/2) also shows no lock and still offers "+ Add" (refused "Max 2 portfolios") | Y | Live |
| Downgrade while the Search "Before you add…" thesis prompt is open (qa-adm-06 at 31 coins) | Server correctly refuses the 32nd coin, but the typed thesis is discarded (Repeat BUG-062) | Y | Live |
| Repeat on a third persona (p04: Starter→Premium→Starter, then Pro→Starter keyboard-only) | Pass — live toast + caps + "+" portfolio control appear/disappear; same state after reload. Keyboard: Enter on a tier button works, but focus then drops to `<body>` (the pressed button becomes disabled), so the keyboard user loses their place (S01-16 family) | Y | Live and reload |
| Suspend/un-suspend at login (p05, fourth persona) | Pass — "This account has been suspended. Contact support if you think this is a mistake." on login; after Un-suspend the same form logs in to the portfolio | Y | n/a (no open session) |
| Bulk set tier on a suspended user (qa-adm-06) | Allowed ("Set 1 user to pro ✓", row shows PRO + SUSP); the suspended user's still-open tab even receives the live "PRO" upgrade (S06-04 family). Un-suspended + Starter afterwards | Y | Live |
| Bulk set tier (3 users → Pro, 2 → Starter) | Pass functionally ("Set 3 users to pro ✓" internal id = Repeat S01-10) | Y (pro live; p02/p03 via own token) | Live |
| Audit: one entry per mutation, right actor + diff | Pass: `listAudit` shows exactly **100** manager entries for this session (52 `setUserTier`, 17 `setPremiumLimits` incl. 2 API probes, 8 `saveUserNote`, 7 `suspendUser`, 7 `unsuspendUser`, 5 `adminTrashUser`, 3 `restoreUser`, 1 `adminSignOutUser`) — one per action I took, correct actor and before→after; `ip` is empty on all (emulator, documented); **extra false user entry from S06-03**; targets shown as raw uid (Repeat S01-04) | — | — |

## Findings

### S06-01 · Medium · After a downgrade, an over-limit ("locked") portfolio still accepts new coins and buys — client AND server
**Steps:** (1) pro@test.com (Pro, 2 portfolios) adds portfolios "QA S06 P3" + "QA S06 P4" → 4 portfolios. (2) Manager → Users → pro → Change tier → STARTER (cap 3 portfolios). (3) In the still-open user tab switch to "QA S06 P4" (the 4th = locked by `lockedPortfolioIds`) → Add → Bitcoin → Skip for now. (4) Open the card → "Open this coin" → + Buy 0.01 → Add Buy.
**Expected:** The 4th portfolio is read-only after the downgrade (DI-4 grey-lock: "kept but locked"); adding a coin/tx to it is refused, or at least the Add button is hidden/disabled.
**Actual:** The coin is created (`addCoinGuarded` succeeds) and instantly renders with an "Over plan limit" tag; the buy is accepted too (`addTransactionGuarded` succeeds), and the value card shows $602 / P&L. The locked portfolio's pill has no lock indication; "+ Add" is fully enabled. Reproduced 3×: (a) BTC coin + buy in pro's 4th portfolio after Pro→Starter (14:33), (b) ZEC added to the same portfolio after a second Pro→Starter (14:43; persisted after reload), (c) **custom-limit path:** qa-adm-06 (Premium, 3 portfolios) → manager sets custom Portfolios = 2 → ZEC added to the 3rd portfolio "QA6 C" succeeds and renders "Over plan limit" (14:56). The same locked coin also accepts a new Journal thesis ("Save thesis" → 🟢 Intact; the Journal tab shows no lock marker).
**Effect on user accounts:** The "locked" state is cosmetic — a downgraded user keeps a fully working 4th (Nth) portfolio, so the Starter 3-portfolio cap is not enforced for data written after a downgrade; meanwhile the UI tells them the data is locked.
**Repeat of:** New.
**Suggested fix:** `functions/index.js` `addCoinGuarded` (≈L1915) and `addTransactionGuarded` — inside the transaction, re-derive the portfolio cap (`portfolios` limit over `mergePlans` + `premiumLimits`) and refuse (`failed-precondition`, reason `locked`) when the target portfolio's index (by `order`/creation) is ≥ cap. Client: `src/CryptoIdea.jsx` already computes `lockedPortIds` (L702) but no component consumes it — pass it to `Portfolio.jsx` to dim the pill and hide "+ Add"/"+ Buy" when `activePortLocked`.

### S06-02 · Low · Lock explainer gives the wrong reason and the wrong remedy for coins in an over-limit portfolio
**Steps:** As S06-01 step 3, tap the locked Bitcoin card in "QA S06 P4" (1 coin).
**Expected:** "This portfolio is beyond your Starter plan's limit of 3 portfolios — delete a portfolio to unlock it."
**Actual:** "Bitcoin is beyond your Starter plan's limit of 30 coins per portfolio … Upgrade to use it again, or remove other coins to get back under the limit." The portfolio holds 1/30 coins (header says "My Assets (1/30)"). Removing coins can never unlock it, and "Upgrade to unlock" points to a plan that cannot be bought while `paidPlansEnabled=false` (see BUG-032). Reproduced twice.
**Effect:** Dishonest/misleading message to a downgraded user. (The real remedy does work: on qa-adm-06 at Portfolios 3/2, deleting one other portfolio unlocked "QA6 C" live — tags 1 → 0 — so the copy just needs to say so.)
**Repeat of:** New (upgrade CTA part relates to BUG-032).
**2nd reproduction (custom limits):** qa-adm-06 (Premium, custom Portfolios = 2), coin in the 3rd portfolio: "Zcash is beyond your Premium plan's limit of 200 coins per portfolio … Upgrade to use it again" — 1/200 coins, and the user is already on the top tier.
**3rd variant (stale dialog, 15:26):** qa-adm-06 at 31/30 on Starter opens the lock dialog for "QA S06 Coin 9"; manager upgrades to PRO while it is open → the page shows 31/100 with no lock tags, but the still-open dialog now reads "QA S06 Coin 9 is beyond your Pro plan's limit of 100 coins per portfolio … Upgrade to use it again" (the copy re-renders from the new caps but the dialog isn't dismissed). Same stale-dialog pattern as S06-13.
**Suggested fix:** the lock-info modal (`src/CryptoIdea.jsx` L1299–1305, copy hard-codes "… plan's limit of {maxCoinsPerPort} coins per portfolio") should branch on `activePortLocked` and use portfolio copy + "delete a portfolio"; hide "Upgrade to unlock" when `paidPlansEnabled` is false.

### S06-03 · Medium · Admin downgrade of a paid user to Starter re-triggers the onboarding gate: data is walled, the app silently calls `chooseFreePlan` for the user, and the audit log records "User chose the free plan" — an action the user never took
**Steps:** (1) pro@test.com (tier pro, created on the paid/seed path so `planChosen` was never set) is logged into /app. (2) Manager → pro → Change tier → STARTER.
**Expected:** The user stays in the app with a plain "Your plan is now Starter" notice; one audit entry (`setUserTier`, manager, `tier: pro→free`).
**Actual:** Within the same second the open user tab (a) shows a full "✓ Welcome to Starter. 3 portfolios · 30 coins…" onboarding modal (celebratory copy for a forced downgrade, and "3 portfolios" while the user holds 4), and (b) the client auto-invokes `chooseFreePlan`, which writes a SECOND audit entry `User chose the free plan — by pro@test.com · tier=free` at 14:32:44, identical timestamp to the manager's `Changed tier pro→free`. Root cause: `setUserTier` (`functions/index.js` ≈L1325) writes only `{tier}`; `isChosen(uid)` in `firestore.rules` = `planChosen==true || tier!="free"`, so a paid user without `planChosen` becomes un-chosen the moment they are made free. **Second UI reproduction (14:47–14:48):** free@test.com (Starter, no `planChosen`) → manager sets PRO while logged out → free@ logs in (badge PRO) → manager sets STARTER live → the same "Welcome to Starter" modal appears in the open tab and the audit gets `User chose the free plan — by free@test.com · tier=free` at 14:48:02, same second as `Changed tier pro→free` by manager. **Control:** repeating the downgrade on pro@ after its `planChosen` had become true showed only the toast — no modal, no extra audit entry — which confirms the root cause. Also via REST: free@test.com in the post-downgrade state (tier free, no `planChosen`); an ID-token read of its own `users/{uid}/portfolios` returns `403 PERMISSION_DENIED` while 1 portfolio exists (owner view).
**Effect on user accounts:** Every Firestore read is denied until the auto-`chooseFreePlan` round-trip lands (and `chooseFreePlan` spends a daily-budget slot; if it fails or is rate-limited the user is locked out of all their data). With `paidPlansEnabled=true` the user would instead get the forced, non-dismissible plan picker after an admin downgrade. The audit trail falsely attributes a plan choice to the user.
**Repeat of:** New.
**Suggested fix:** in `setUserTier` (and the sweep/webhook downgrade paths) write `planChosen: true` whenever the target's tier changes (the user has, by definition, had a plan recorded). Optionally have the client suppress the "Welcome to …" modal when the tier change arrived via the live user-doc watcher (`src/CryptoIdea.jsx` ≈L466 `forcedPlan` / L978 watcher).

### S06-04 · Medium · "Suspend" does not reach an open user session — the suspended user keeps reading AND writing (coins, buys/sells, deletes) until they reload
**Steps:** (1) pro@test.com logged into /app with the Sell form open (0.005 BTC @ 61000). (2) Manager → pro → Suspend → "Suspended ✓" (Auth `disabled:true`, refresh tokens revoked, `suspendedAt` stamped). (3) In the user tab, without reload, click Add Sell; then delete that sell; then (2nd run, after un-suspend → re-login → Suspend again) add Solana to "QA S06 P3".
**Expected:** Per the code comment in `suspendUser` ("revoke tokens (a live session dies NOW — G40)") the open session is cut off within seconds: writes refused, the app shows a "This account has been suspended" screen.
**Actual:** Nothing changes in the open tab. The Sell is recorded (Transactions 2→3), the delete of that Sell succeeds, and on the 2nd run `addCoinGuarded` adds SOL to P3 (owner REST view confirms `QA S06 P3 coinCount=1` while the user doc carries `suspendedAt`). Only a page reload signs the user out — and then silently, to a blank login form; the "This account has been suspended" text appears only after they try to log in again. Reproduced 2/2.
**Effect on user accounts:** A suspension (e.g. for abuse) is not effective for up to the ~1 h ID-token lifetime on any already-open tab/device; the suspended user can keep writing data. The app never tells a live session it was suspended.
**Repeat of:** S01-06 (session-01 report; also re-measured in S05; not yet in BUGS.md). Re-confirmed under the manager role, during an open Sell form.
**Suggested fix:** (a) server: the guarded write callables (`addCoinGuarded`, `addTransactionGuarded`, `chooseFreePlan`, …) should call `admin.auth().verifyIdToken(token, true)` / check `context.auth.token.auth_time` vs `tokensValidAfterTime`, or check `users/{uid}.suspendedAt`; rules can deny writes when `suspendedAt` is set by extending the `isChosen` helper in `firestore.rules` (L159), which every owner branch already calls (see S06-11). (b) client: the DI-6 user-doc watcher in `src/CryptoIdea.jsx` (≈L978) already receives `suspendedAt` live — on seeing it, sign out and show the suspended notice (same text Login uses).

### S06-05 · Low · (Repeat of S01-02) "Clear" custom limits saves blank limits but leaves the old numbers in the form — a later "Save custom limits" silently re-applies them
**Steps:** Manager → p07.altcoin (Premium, 1 portfolio / 2 coins) → Custom limits: Portfolios 1, Coins 1 → Save ("Custom limits updated ✓"; user tab live-updates to "My Assets (2/1)", 2nd coin "Over plan limit", + portfolio hidden). Click **Clear**.
**Expected:** Fields reset to blank ("default") to match the server.
**Actual:** Toast "Custom limits updated ✓", server `premiumLimits = {}` (owner REST view) and the user tab live-returns to "(2/200)" — but the inputs still read Portfolios **1**, Coins **1**. Clicking "Save custom limits" afterwards (a natural "confirm" click) re-applies 1/1 and the user is capped again. Reproduced 2/2.
**Effect on user accounts:** Easy accidental re-cap of a Premium user below current usage (compounds S05-03/S05-06).
**Repeat of:** S01-02 (its "after Clear the inputs keep showing the old numbers" clause). New detail: a subsequent Save re-applies the stale values to the live user.
**Suggested fix:** `PremiumLimitsEditor` in `src/components/admin-dashboard.jsx` (L310–315) seeds its inputs only in a `useEffect` keyed on `[found.uid]`, so neither Clear nor a save re-seeds them; key it on `found.premiumLimits` too and have the hook write the `setPremiumLimits` response (`{premiumLimits}`) back into `found`.

### S06-06 · Low · After a tier change the user-detail Billing card is not refreshed — a STARTER user reads "ACTIVE · Manual upgrade", a PRO user reads "No active subscription (free tier)"
**Steps:** Manager → Users → pro@test.com (Pro; Billing "ACTIVE · Manual upgrade") → STARTER. Then (same open detail) → PRO.
**Expected:** The Billing card re-derives with the tier (Starter → "NO SUBSCRIPTION", comped Pro → "ACTIVE · Manual upgrade").
**Actual:** After STARTER the badge says STARTER but Billing still says "ACTIVE · Source Manual upgrade"; after Back + reopen it says "NO SUBSCRIPTION · No active subscription (free tier)"; then PRO → badge PRO, Billing still "No active subscription (free tier)". The PORTFOLIOS/COINS counters in the same card also don't move while the user adds data (showed 2/10 while the user had 4 portfolios) until the list is Refreshed. Reproduced 2/2 (14:32 and 14:50). **3rd, worse case (15:28):** qa-adm-06 (Starter) carried a hidden `premiumLimits {coins:3}` (stored via the callable; the UI hides the section for non-Premium). Manager → PREMIUM on the open detail: the newly shown "Custom limits (Premium)" inputs all read blank/"default", while the user's open tab went live to "My Assets (31/3)" with **28 coins locked**. Only Back + reopen showed Coins = 3.
**Effect:** Admin-only display, but it hides an active restriction: a manager who just upgraded a user sees "default" limits while the user is capped far below the plan (compounds S05-03).
**Repeat of:** Observed in S01 (coverage row "Stale admin view", no id) — logged here with an id.
**Suggested fix:** after `setUserTier` resolves, re-run the per-user lookup (`lookupUser`) so `found` (billing, counters, `premiumLimits`) is fresh, in `src/hooks/useAdminDashboard.js`; the 3rd case is the same stale `found` feeding `PremiumLimitsEditor` (see S06-05).

### S06-07 · Low · Overview ("Live Data") tier counts and revenue never refresh after an admin mutation — only a full page reload updates them
**Steps:** Overview shows 13 Starter / 1 Pro / 1 Premium. Users → qa-adm-06 → PREMIUM ("Tier updated ✓") → Overview → click the "Refresh" next to the stats strip. Then (2nd run, after a page reload showed the correct 12/1/2) → qa-adm-06 → PRO → Overview → Refresh.
**Expected:** The tier cards, Tier Breakdown and Est. Monthly Revenue reflect the change (the header pill says "Live Data").
**Actual:** Both runs keep the pre-change numbers (13/1/1, then 12/1/2 although the truth is 12/2/1). The only "Refresh" on the stats card calls `loadStatus` (cron heartbeats), not `getStats`; `useAdminDashboard.js` (≈L427) calls `getStats()` once in a mount-only `useEffect`. A full reload fixes it. Reproduced 3/3 (3rd: at 15:20 the Overview still showed 12/1/2 and "2 Premium × $49.99" revenue, 27 coins, ~25 min after load; truth after reload 13/1/1).
**Effect:** Admin-only: a manager who just changed tiers sees stale counts/revenue labelled "Live Data".
**Repeat of:** New.
**Suggested fix:** expose a `loadStats()` from `src/hooks/useAdminDashboard.js` and call it from the Overview Refresh (and/or after any successful `setUserTier`/bulk action), or label the strip's button "Refresh jobs".

### S06-08 · Medium · A user who is BOTH suspended and moved to the Trash by a manager can undo the trash from their still-open tab ("Restore my account" works while the Auth account is disabled)
**Steps:** qa-adm-06 logged into /app (375 px frame). Manager → qa-adm-06 → **Suspend** ("Suspended ✓", Auth `disabled:true`) → **Delete account** → type DELETE → **Move to trash** ("Moved to trash ✓"). In the open user tab the "Your account is scheduled for deletion — You deleted this account" screen appears live; click **Restore my account**.
**Expected:** A suspended account cannot run self-service callables, and an admin-initiated trash can't be reversed by the user (at minimum not while suspended).
**Actual:** The account is restored instantly and the user is back in the app; server state afterwards: `deleted:false, deletedAt:null`, `suspendedAt` still set, Auth `disabled:true` (owner REST + Auth emulator lookup). Audit shows a "User restored own account" entry. Reproduced 2/2 (self-restores at 15:02:30 and 15:02:58).
**Effect on user accounts:** The two strongest manager moderation tools stacked together still don't hold against an already-open session: the user reverses the trash, and nothing tells the manager (the account just reappears in Users).
**Repeat of:** Combination of S01-06 (open session survives suspension) and S01-07 (admin trash is user-restorable); new detail: `restoreMyAccount` (`functions/index.js` ≈L1689) checks only `deleted`/`deletedAt`, not the Auth `disabled` flag or `suspendedAt`, nor who trashed the account.
**Suggested fix:** in `restoreMyAccount` refuse when `(await auth.getUser(uid)).disabled` or `suspendedAt` is set, and record `trashedBy:"admin"` in `adminTrashUser` so self-restore can be refused for admin trashes; plus the S01-06 token-revocation check.

### S06-09 · Low · After a downgrade the coins that get "locked" are the alphabetically-last coin IDs, not the newest ones — a user's oldest holding can be the one locked
**Steps:** qa-adm-06 (throwaway, Premium) gets 31 coins in "QA6 B", added in order `qa-s06-coin-1` … `qa-s06-coin-31` via `addCoinGuarded` (all succeed). (1) Manager → STARTER (cap 30). (2) Manager → PREMIUM with custom Coins = 29.
**Expected:** Per `useUpgrade.js` ("the overflow beyond the cap, by array order — oldest keep priority") the newest coin(s) lock: coin-31, then coin-30 + coin-31.
**Actual:** (1) "My Assets (31/30)", locked = **QA S06 Coin 9**; (2) "(31/29)", locked = **QA S06 Coin 8, QA S06 Coin 9**. The coins are read without `orderBy` (`src/api/firebase-database.js` coin queries ≈L145/L204/L237/L490), so "array order" is Firestore doc-id (alphabetical) order. With real ids, a user who bought `zcash` first and `bitcoin` last would see zcash locked. Reproduced 2/2. Server side, `addTransactionGuarded` also accepted a buy on coin-31 and coin-1 while the user was at 31/30 (no lock concept server-side, see S06-01).
**Effect on user accounts:** The locked set is arbitrary from the user's point of view; which holding they lose access to depends on its id spelling.
**Repeat of:** New.
**Suggested fix:** sort by `addedAt` (ascending) before `lockedCoinIds(...)` in `src/CryptoIdea.jsx` ≈L704 (or have the coin queries `orderBy("addedAt")`), and apply the same order in any future server-side lock check.

### S06-10 · Low · Users search can't find an account by uid, but most audit entries name their target only by uid — a manager can't get from an audit row to the account
**Steps:** Audit tab: "Changed tier · by manager@test.com → 9j3rWiEEVugIanS9QA4cxBzQElvC · tier: pro→free". Copy the uid → Users tab → search box. Also tried `1V4Hk68D3x` (p07's uid prefix).
**Expected:** The uid finds the account (or the audit row links to it / shows the email).
**Actual:** "0 users" + empty message both times (name and email search work, case-insensitive and whitespace-tolerant). Only trash entries carry an email target. Reproduced 2/2.
**Effect:** Admin-only: following up an audit entry (e.g. the false "User chose the free plan" rows, S06-03) needs out-of-band uid→email lookup.
**Repeat of:** New (inverse of S01-04, which is about Audit search not matching emails).
**Suggested fix:** include `uid` in the Users-tab client-side search predicate (`src/components/admin-dashboard.jsx` L1007, which matches only `email`/`name`), and/or resolve `targetUid`→email in `listAudit` (fixes S01-04 too).

### S06-11 · Low · An account in the Trash (`deleted:true`) can still write its data through the API — callables and direct Firestore writes both succeed
**Steps:** Manager moves qa-adm-06 to the Trash ("Moved to trash ✓"; owner REST shows `deleted:true`). With a fresh ID token for qa-adm-06 (the Auth account is not disabled by trashing, by design): (1) `addTransactionGuarded` buy on `qa-s06-coin-2`; (2) `addCoinGuarded` Bitcoin into "My Portfolio"; (3) direct Firestore PATCH renaming that portfolio.
**Expected:** While an account is in the Trash only `restoreMyAccount` (and sign-out/export) work; data writes are refused — the app itself only shows the RestoreAccount screen.
**Actual:** (1) `{"success":true,"txCount":1}`, (2) `{"success":true,"coinCount":1}`, (3) HTTP 200. Reproduced 2/2 (tx + coin; plus the rules-level rename).
**Effect on user accounts:** Data of an account scheduled for erasure keeps changing; an admin-trashed (moderated) user can keep using the backend without restoring. Low because the shipped UI doesn't offer these writes on the trash screen.
**Repeat of:** New (related to S01-07 / S06-08).
**Suggested fix:** in `addCoinGuarded`/`addTransactionGuarded` (`functions/index.js`) refuse when the caller's user doc has `deleted === true` (they already read it for `isChosen`); in `firestore.rules` the single choke point is the `isChosen(userId)` helper (L159), which every owner branch of `portfolios`/`coins`/`transactions`/`learn` already calls (L304–L365): have it (or a sibling `isActive(userId)`) also require `data.get('deleted', false) != true` (and, for S06-04, `!('suspendedAt' in data)`), and mirror the same check in the callables' `isChosen` re-derivation.

### S06-12 · Low (nit) · Clicking the already-active "Users" tab while a user's detail is open does nothing — the only way back to the list is the small ‹ Back box (browser Back leaves the admin)
**Steps:** Users → open any user (pro@, then p07) → click the "Users" tab in the green tab bar.
**Expected:** Returns to the list (common tab-bar convention), or the drill-in pushes a history entry so browser/Android Back closes it.
**Actual:** Nothing happens (the detail stays). The drill-in adds no history entry, so browser Back exits the admin app; a reload lands on Overview. Seen 2/2 (14:45 pro@, 14:46 p07).
**Effect:** Admin-only navigation friction, mostly on phones.
**Repeat of:** New (S01-16 covers focus/ARIA on the same tab bar, not this).
**Suggested fix:** in `src/components/admin-dashboard.jsx` the tab-bar `onClick` (L474: `setTab(tb)` only) should also call the existing `closeUser()` (L433: `setFound(null)` + reset confirms) when `tb === "users"`.

### S06-13 · Low · The user's open "Downgrade to which plan?" picker doesn't follow a live admin tier change — a Starter user is offered "downgrade" to Pro $9.99/mo and told "Your Premium access continues…"
**Steps:** p07 (Premium, comped) → Account → Plan & billing → Downgrade (picker open: Pro / Starter, "Your Premium access continues until December 24, 2026 either way."). Manager sets p07 to PRO; later (picker still open) to STARTER.
**Expected:** The picker closes or re-derives from the new tier (no "downgrade" to the current or a higher tier, no Premium end-date line).
**Actual:** The page behind updates live ("Your plan is now Pro/Starter", caps 1/6 → 1/3), but the picker keeps offering "Pro · $9.99/mo" and "Starter" and the Premium end-date line, for a user who is now Pro, then Starter. Not continued (billing path; paid plans are off). Reproduced 2/2. The December 24 date is itself made up for a comped account (S01-13).
**Effect on user accounts:** A user could pick "downgrade" to the tier they already have (or a paid tier above their new one) from a stale dialog.
**Repeat of:** New (S01-13 covers the made-up date).
**Suggested fix:** in the DI-6 user-doc watcher (`src/CryptoIdea.jsx` ≈L978), call `setShowDowngradeChooser(false)` (and reset `dgStep`) when `server.tier` changes; the picker (`showDowngradeChooser`, L1173–1180) renders fixed Pro/Starter options and `chEnd` from the stale subscription and doesn't look at `user.tier`; server-side, `scheduleProDowngrade`/`cancelSubscription` should refuse when the caller is not on a higher tier than the target.

## Data-leak and backend checks
| Check | Result |
|---|---|
| User token reads `adminNotes/{own uid}` | 403 PERMISSION_DENIED — note never reaches the user (note content stored + shown to admins as plain text, HTML inert) |
| User doc fields visible to the user after admin actions | `email, joined, lastLogin, name, planChosen, portfolioCount, tier` (+`suspendedAt`/`premiumLimits`/`deleted` while set) — no admin identity, note or audit data |
| Normal user (pro@) calls `listUsers` / `getUserNote` / `setUserTier` on self | all `PERMISSION_DENIED "Admins only."` |
| Manager `listUsers` payload | 15 users, keys `billingStatus, deleted, deletedAt, disabled, email, isAdmin, joinedMs, name, portfolioCount, role, tier, uid` — no holdings; no admin accounts listed |
| Manager `lookupUser` payload | operational + billing fields only (`coinCount`, `premiumLimits`, `billingStatus` …), no holdings/theses; comped Pro reported `billingStatus:"active"` (S01-13/S01-08) |
| Suspended open session (S06-04) | Firestore writes + `addCoinGuarded` + `addTransactionGuarded` + `reconcileMyCounters` all succeed until reload |
| Suspended + trashed open session (S06-08) | `restoreMyAccount` succeeds while Auth `disabled:true` |
| Trashed account, fresh token (S06-11) | `addTransactionGuarded`, `addCoinGuarded`, direct portfolio rename all succeed |
| Locked (over-cap) portfolio / coin after downgrade (S06-01/S06-09) | server accepts new coins, txs and theses; only the client tags them |
| Coin cap at the server after downgrade | 32nd coin at 31/30 refused `failed-precondition` "30-coin limit" ✓; tx cap via custom limit refused "Max 1 transactions per coin" ✓ |
| Audit trail | every manager mutation logged exactly once with the right actor and diff (31 + later p08/qa-adm-06 entries checked); spurious user-attributed `chooseFreePlan` entries on admin downgrade (S06-03); each user delete adds a by-design "User repaired their counters · fixed=1" entry |
| `setPremiumLimits` on a non-Premium (Starter) account, manager token via the callable (the UI hides the section) | Accepted: `{coins:3}` stored on qa-adm-06 (Starter); after an upgrade to Premium the user was live-capped at 31/3 (28 coins locked) while the admin detail showed "default" (S06-06 3rd case; feeds S05-03). Cleared again |
| `exportMyData` (user's own JSON export) after a manager note was saved on qa-adm-06 | Export keys `exportedAt, account, profile, portfolios`; profile carries `premiumLimits`, `planChosen`, `deleted`… but **not** the admin note, its author, audit entries, IPs or `suspendedAt` (no admin data leak). Observation for the privacy owner: the private admin note is personal data about the user that a self-service access export does not include — intended ("Not shown to the user") but worth a line in LEGAL.md |
| Manager boundary re-check (callables with the manager token) | `setUserTier` / `suspendUser` / `setPremiumLimits` on owner admin@ → "Owner accounts can only be managed by another owner."; `deleteUser`, `viewUserAsAdmin`, `getAdminConfig` → "Owners only." — all PERMISSION_DENIED, no state change |
| Live propagation latency (emulator) | Tier change → user tab badge/caps within ~0.1–1 s; Account/Plan & billing, Portfolio caps, lock tags and the RestoreAccount screen all follow live |
| Global switches | Untouched (`maintenance:false, signupsEnabled:true, paidPlansEnabled:false, marketData on, checkout off, aiResearch off` at start and end); a manager has no Settings access |
| Network from the user app during all live changes | only Firestore Listen channel + Sentry envelope (`*.ingest.de.sentry.io`, by design: text-masked replay); no admin endpoint calls; no console errors in either tab |

## Known bugs re-checked
- **S01-06** (suspended / signed-out open session keeps writing) — still present, as manager, incl. during an open Sell form and via bulk Suspend → S06-04.
- **S01-07** (admin trash user-restorable, "You deleted this account") — still present; worse when combined with suspension → S06-08.
- **S01-02** (custom limits: blank field kept / Clear leaves old numbers) — still present → S06-05; blanking Portfolios kept `portfolios:2` (15:0x).
- **S01-19** (Select page then search keeps hidden rows selected) — still present (15 selected / 1 visible); not executed.
- **S05-02** (Trash shows "Delete now" / "Empty trash" to a manager) — still present (qa-adm-06 trashed + restored at ~15:25; buttons not clicked). Owner-only "View as" and "Capture now" are correctly absent for the manager.
- **S01-13 / S01-08** (comped users shown billing/"active") — still present (Plan & billing "Cancel Pro · Update payment method", `billingStatus:"active"`).
- **S01-10** ("Set 3 users to pro ✓" internal tier id) — still present.
- **S01-04** (audit targets as raw uid) — still present: Audit search "pro@test.com" finds pro's own 5 entries but none of the ~9 manager tier changes on pro (found only by uid); S06-10 is the inverse.
- **S01-16** (focus to `<body>` after opening a row; Escape doesn't cancel DELETE confirm) — still present.
- **S05-03 / S05-06** (custom limits survive downgrade, accept values below usage) — still present (qa-adm-06's `portfolios:2` re-applied on re-upgrade; "My Assets (2/1)").
- **BUG-095** (stale "Your plan is now X" toast after account switch in the same tab) — still present, seen 5× (p07, pro@ ×3, qa-adm-06).
- **BUG-032** (upsell to a plan that can't be bought) — "Starter: 3 portfolios — upgrade to Pro for 6", lock dialog "Upgrade to unlock".
- **BUG-058** ("AI research · Live" on Plan & billing) — still present.
- **BUG-020** ("Live sync was interrupted" toast during signup) — seen on qa-adm-06 registration.
- **BUG-087** (header badges under the avatar at 360 px) — "PREMIUM" runs under the avatar, "● LIVE" wraps.
- **BUG-023** (AUTO buy price pre-fill) — the price field pre-filled 84,000 (suggested $61,227) and a click-then-type appended to it (`84000.0050000`), producing an $84,000.01 buy on pro@ (deleted with the test portfolio).
- **BUG-062** (Search prompt loses a written thesis when the add fails) — still present and reachable through an admin action: qa-adm-06 (Pro, 31 coins in "QA6 B") opens "Before you add Solana…" and types a thesis + change-mind; manager downgrades to Starter; Save → toast "Starter: 30 coins — upgrade to Pro for 100" (BUG-032 upsell), Solana correctly not added (404), but the prompt closes and the typed thesis is gone. Reproduced 2/2 (15:30, 15:31).
- **BUG-074** (mouse-only `<div onClick>` cards) — still present and it hides the lock explainer: the "Over plan limit" card (and its tag) is a non-focusable `div` (`tabIndex -1`, no role), so a keyboard / screen-reader user can't open "Over your plan limit" or tell the coin is locked.
- **BUG-051** (three-decimal dollars) — "Total P/L −$29.925".
- **BUG-005** (admin tab signs out user sessions) — stays fixed: admin and user sessions coexisted in one browser all session.
- **BUG-039** (un-suspend INTERNAL) — stays fixed (6 un-suspends, all ✓).
- **S05-13** (admin sign-in form keeps email + password after Log out) — **not reproduced** this time: after Log out at 15:28 both fields were empty (the page had been reloaded several times since the original sign-in). Enter in the admin password field submits sign-in. The user tab stayed signed in across the admin logout/login (BUG-005 holds).

## What worked well
- Tier changes, custom limits and trash/restore reach every open user tab **live** (two concurrent p08 sessions both updated), with caps, "+ add" controls and lock tags recomputed without reload; reload shows the same state.
- Downgrade is non-destructive: no portfolio, coin or transaction was ever removed.
- Server-side caps hold for the cap itself (32nd coin, tx limit, portfolio limit via rules) and the user gets an honest refusal while their typed form is kept.
- Every manager mutation produced exactly one audit entry with correct actor and before→after diff; notes are audited without content.
- Admin-only data (notes, other users) is unreachable from a user token; manager payloads carry no holdings.
- Bulk actions report counts, in-flight tier buttons ignore extra rapid clicks, and the admin panel at 375 px has no horizontal overflow on any tab.

## Timeline
- 14:30 Health check OK (`/api/config` JSON starts `{"maintenance"`, `/admin` 200). Report created.
- 14:32 Recorded originals (Firestore owner view + admin list). pro@ added 2 portfolios (4 total), manager downgraded pro→Starter live → S06-01/02/03.
- 14:35 Upgrade back to Pro with Buy form open: live toast, form kept, lock removed live (PASS).
- 14:37–14:40 Suspend mid-edit ×2 → S06-04.
- 14:44 Bulk tier (3→Pro, 2→Starter) + audit reconciliation (17 manager entries, all correct).
- 14:46–14:48 Sign out all devices via keyboard; p07 tx-limit-while-Buy-open (pass); p07 restored.
- 14:47–14:53 S06-03 2nd UI repro on free@; qa-adm-06 registered (BUG-020 toast on signup), trashed mid-thesis + restored; new-portfolio-dialog race; Plan & billing live; S06-06.
- 14:49–14:55 Mobile 375 px (iframe) admin list + detail: no horizontal overflow; header label truncates to "CryptoIdea · …". Reload on a drill-in returns to Overview; the drill-in adds no history entry. Cleanup of pro@ (tester incident, restored — see Accounts table).
- 14:57–15:00 Audit reconciliation (31 entries), Overview stats staleness → S06-07; qa-adm-06 Premium custom-portfolio-limit path for S06-01; locked-coin thesis save.
- 15:00–15:03 Research tab live tier change (no crash); filters; suspended+trashed self-restore → S06-08.
- 15:04–15:08 Scripted 31 coins on qa-adm-06 (callable, 2.2 s spacing); downgrade to Starter / Premium coins=29 → S06-09; 32nd coin refused "30-coin limit" (PASS).
- 15:08–15:11 Plan & billing with custom limits ("custom 3/2 · 31/29"), keyboard Enter on limits, Users search → S06-10.
- 15:11–15:13 Repeat flow on p08 (live), Account → Portfolios over-limit view.
- 15:14–15:17 Two live sessions of p08 (both update live); admin at 375 px: Audit/Users+bulk bar/Trash/Overview no overflow; Escape doesn't close the DELETE confirm (known); trashed-account writes → S06-11.
- 15:17–15:21 qa-adm-06 restore/suspend list marker (SUSP shown ✓), rapid PRO/PREMIUM/STARTER clicks (in-flight clicks ignored, server consistent ✓), p07 Premium→Starter→Premium with Detail open (live ✓), final state verification of all touched accounts, S06-07 3rd repro.
- 15:21–15:25 Audit search by email (S01-04 recheck), keyboard bulk bar (Space/Shift+Tab reachable), 375 px detail target sizes, setPremiumLimits on a Starter via API, S05-02 recheck, Downgrade picker during live tier changes → S06-13.
- 15:25–15:26 Lock dialog open during an upgrade (S06-02 3rd variant); qa-adm-06 back to Starter.
- 15:26–15:27 exportMyData leak check with a note present (no leak); note cleared.
- 15:27–15:28 Remedy check (deleting another portfolio unlocks the locked one live); hidden custom limit + upgrade → S06-06 3rd case; qa-adm-06 cleared + Starter.
- 15:28–15:30 Admin Log out / sign-in with Enter (S05-13 not reproduced; user tab unaffected); audit reconciliation for 15:12–15:28 (38 manager entries + qa-adm-06's own export/repair entries).
- 15:29–15:31 Downgrade with the Search thesis prompt open → Repeat BUG-062 (draft lost; 32nd coin correctly refused).
- 15:31–15:33 Lock-card keyboard reachability (Repeat BUG-074), propagation latency, manager boundary refusals, final state verification of all touched accounts + switches.
- 15:32–15:33 Console check (no errors in any tab); bulk tier on a suspended user; qa-adm-06 un-suspended + Starter.
- 15:33–15:34 Third persona p04 (Premium/Starter live + reload; keyboard-only tier change, focus lost to body); p04 restored to Starter.
- 15:34–15:35 p05 suspend → login refused → un-suspend → login OK.
- 15:35–15:36 p05 admin note set/clear with p05 logged in (not visible user-side).
- 15:36 Final audit reconciliation (16 manager entries 15:30–15:36, one per action).
- 15:37 User-side check of restored pro@: PRO badge, Portfolio 1 (6/100) + Portfolio 2 (4/100), Journal shows the 6 seed coins without theses (as before); active portfolio set back to Portfolio 1.
- 15:38 `listAudit` tally for the session: 113 entries (100 manager + 13 user-attributed: 7 counter repairs, 3 `chooseFreePlan` (2 caused by S06-03, 1 qa-adm-06 signup), 2 self-restores (S06-08), 1 export). Tabs closed except the admin tab.
- 15:41 Wrap-up: all touched accounts verified at their original tier/limits/state (see Accounts table), global switches unchanged, browser tabs closed. Status: Complete.
