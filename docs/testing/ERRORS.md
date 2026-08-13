# ERRORS — diagnoses & fixes

> A running catalog of bugs, warnings, and "looks broken but isn't" caveats found in Crypto Idea —
> **what the error is** and **how to fix it**. One entry per issue, newest investigations first.
> Backend/runtime issues live here; **dark-mode CSS readability issues** are tracked in
> [`DESIGN-PASS.md`](../design/DESIGN-PASS.md) "Round 3" + [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) §DP (pointer in §D below).

**Status legend:** ✅ Fixed · 🟡 Diagnosed — fix ready (not yet applied) · 🔎 Needs verification ·
ℹ️ By design (not a bug — documented so it isn't mistaken for one).

**Entry template:** Symptom · Where · Root cause · Fix · Verify · Severity · Status.

---

## A. Confirmed bugs

### A11 · Oversell & P&L integrity (Group B) — phantom realized gains, unpriced-coin −100%, unguarded edit/backdated/future sells ✅ (high)

- **Symptom:** a user's own book could show impossible numbers: (7) an **over-sold** coin (e.g. bought 0.3,
  sold 6) showed holding 0 but **P/L "+1900%"** — phantom realized gains; (8) a held coin whose live price
  hadn't loaded showed **−$100 / −100%** as if it crashed, and dragged the whole portfolio P/L negative;
  and the oversell guard was bypassable — (10) editing a **buy** down below already-sold units, (9) inserting
  a **backdated** sell between existing dates, and (12) a **future-dated** buy were all accepted.
- **Where:** `src/utils/pnl.js` (`sellsGain` unclamped while `holdings` clamps to `Math.max(0,…)`; missing
  price collapsed to `0`), `src/CryptoIdea.jsx` `addEntry` (oversell guard gated on `eTxType==="sell"`, so the
  edit path was unguarded; no future-date bound), `Detail.jsx`/`CoinInfo.jsx` (rendered `$0.00` / −100% for a
  priceless held coin).
- **Root cause:** the sell-invariant was only checked on *add-a-sell* at that sell's own date (not on edit,
  not across the timeline); the P/L math counted full raw sell proceeds even when units were never held; and
  a missing price was conflated with a genuine `0`.
- **Fix (CRYP-94, client-side only):** one pure `firstOverSoldSell(entries)` replay guard in
  [`src/utils/tx.js`](../../src/utils/tx.js) shared by add, edit, and delete (`remEntry`); `isFutureTx` +
  a date `max` block future dates; `realizedProceeds` clamps proceeds to `bought/sold` (finding 7); `coinPnl`
  returns null value/P&L for a held coin with an **unknown** price (a genuine 0 stays worthless) and
  `portfolioPnl` excludes it from value & P/L while keeping its cost in Invested, rendered as a muted "—"
  (finding 8). Firestore rules can't aggregate sibling tx docs, so this is a **data-integrity/UX guard, not a
  security boundary** (founder decision — the user's own cost-basis tracker, no money/cross-tenant exposure);
  prevent-new only, no migration of existing corrupt books.
- **Verify:** `npm run test:unit` green (982/982) incl. the end-to-end walkthrough that blocks the edit-buy
  exploit with no db write; build clean.
- **Severity:** high (wrong/misleading numbers on the core Portfolio surface; a reachable impossible state).
- **Status:** ✅ **FIXED 2026-08-08** (CRYP-94, Group B) — see [`NEXT-STEPS.md`](../product/NEXT-STEPS.md)
  §GROUP-B (folds in §TX-SAFE-C findings 9+10).

### A9 · DARK-FIX-NaN — Research diversification note reads "about NaN%" ✅ (medium)

- **Symptom:** The Research → Overview "A note on diversification" card reads *"Your top two coins make up
  about **NaN%** of your portfolio."* on every non-empty session (both light and dark — this is **not** a
  dark-mode issue).
- **Where:** `src/features/research/components/OverviewView.jsx` — the note did `Math.round(portfolio.risk.top2)`.
- **Root cause:** `deriveRisk(holdings)` (`src/features/research/utils/portfolio.js`) returns
  `{level, score, breakdown, megaAlloc}` — it has **no `top2` field**. `risk.top2` is therefore `undefined`,
  and `Math.round(undefined)` → `NaN`, rendered verbatim into the copy. Theme-independent.
- **Fix:** Compute the top-two allocation locally from `portfolio.holdings` (the same math `usePulse` /
  `portfolioContext` already use): `const top2 = (portfolio.holdings || []).slice(0,2).reduce((s,h)=>s+(h.alloc||0),0);`
  and render it behind a `Number.isFinite(top2)` guard — the finite path prints `about {Math.round(top2)}%`,
  the non-finite path drops the "about X%" clause so "NaN" can never reach the DOM.
- **Verify:** `npx vitest run tests/unit/OverviewView.test.jsx` — the CRYP-92 test asserts the note reads
  `about 65%` for holdings 40 + 25 and never matches `/NaN/`; the sibling R7-5 glyph test still passes.
- **Severity:** medium (visibly broken copy on a core tab; no data loss).
- **Status:** ✅ **FIXED 2026-08-07** (CRYP-92 / DARK-FIX-NaN).

### A1 · B-PORT — "Couldn't create portfolio. Check your connection." ✅ (high)

- **Symptom:** Adding a portfolio shows the toast *"Couldn't create portfolio. Check your connection."* —
  appears like a network/backend outage, "for every account."
- **Where:** UI handler `src/CryptoIdea.jsx:391-398` (`addPortfolio`) → data layer
  `src/api/firebase-database.js:79-95` (`createPortfolio`) → rule `firestore.rules:140-144` (portfolio create).
- **Root cause (CONFIRMED by live reproduction against the running emulator, 2026-06-28):**
  It is **not** a connection error and **not** a rules/increment bug. The write is correctly **denied**
  because the user is **already at their plan's portfolio cap**, and the app **mislabels** that
  `permission-denied` as a connection problem.
  - Live repro (replicated the exact `createPortfolio` batch, signed in as each seeded user):
    - `pro@test.com` (tier `pro`, 1→**2** portfolios already) → **SUCCEEDED** (3 ≤ pro cap 3).
    - `admin@test.com` (tier `free`, 1 portfolio) → **`permission-denied`**.
    - `free@test.com` (tier `free`, 1 portfolio) → **`permission-denied`**.
  - The rule `getAfter(userRef()).data.portfolioCount <= maxPortfolios(userId)` evaluates
    `2 <= maxPortfolios(free)=1` → **false** → denied (working as designed). `getAfter()` **does** see
    the `increment(1)` (the earlier "getAfter can't see increment" guess was **disproven** — pro succeeded
    with that exact batch). Caps: **free 1 · pro 3 · premium 15**.
  - **Why the app even *attempts* a write it knows would exceed the cap:** `addPortfolio` has a client-side
    cap check at `CryptoIdea.jsx:392` (`if(portfolios.length>=maxPortfolios) …upgrade…`). It uses the
    **client's** `maxPortfolios`, derived from `user.tier` in the *client* object (`CryptoIdea.jsx:382`).
    When the client shows a **higher tier than the DB holds**, that check passes and the write proceeds —
    then the rule (reading the **DB** tier) denies it. This mismatch happens in **local/demo** because a
    demo "upgrade" flips the client tier to pro/premium, but **users cannot write their own `tier`**
    (`firestore.rules:118-121` blocks it — by design), so the DB tier stays `free`. Result: UI says
    "PREMIUM · 1/15", lets you add, rule enforces free=1 → denied → "check your connection."
- **Fix (two parts):**
  1. **Surface the real cause (primary).** Return the code from the data layer and branch the message:
     - `src/api/firebase-database.js` `createPortfolio` catch → `return { success:false, error:error.message, code:error.code }`.
     - `src/CryptoIdea.jsx:396` → if `res.code === 'permission-denied'` show *"You've reached your plan's
       portfolio limit — upgrade for more."*; only show *"Check your connection."* for a real network error
       (no code / `unavailable`). (Same pattern fixes the other generic toasts — see **A2**.)
  2. **Keep client tier in sync with the enforced (DB) tier.** In local/demo there is no PayPal webhook, so
     a demo upgrade is never persisted server-side (rules correctly forbid client `tier` writes). For
     testing, set the tier via the **Admin panel** (`setUserTier`) or the seed so the DB tier matches the
     UI. At go-live the PayPal webhook / admin sets `tier` server-side, so the DB matches and the cap is
     real. *(Optional UX: don't optimistically display an upgraded tier the server hasn't confirmed.)*
  - *(Optional)* When at the cap, the Account → Portfolios "Add" button + the switcher "+" pill should
    reflect the enforced limit (or read "limit reached — upgrade") so the user isn't invited to a denied action.
- **Verify:** A `free`-tier user at 1 portfolio adding a 2nd → sees a **plan-limit** message (not "connection").
  A `pro` user under cap → succeeds (confirmed in repro). After part 2, a DB-`premium` user gets 15.
- **Severity:** high (blocks a core action + misleading message).
- **Status:** ✅ **FIXED 2026-06-29** (part 1 — the message). New pure mapper
  [`src/utils/errors.js`](../../src/utils/errors.js) `apiErrorMessage(res, fallback, limitMsg)`:
  `permission-denied` → the limit/upgrade message, `unauthenticated` → "Please sign in again.",
  else the connection fallback. Every `createPortfolio`/data-layer catch now returns `code: error.code`
  ([`firebase-database.js`](../../src/api/firebase-database.js)); `addPortfolio` ([`CryptoIdea.jsx:397`](../../src/CryptoIdea.jsx))
  shows *"You've reached your plan's portfolio limit — upgrade for more."* Verified end-to-end on the live
  emulator: `free@test.com` at cap → `createPortfolio` returns `code:"permission-denied"` → mapped to the
  plan-limit message (unit: `tests/unit/errors.test.js`; 277 unit green; build clean). **Part 2** (keep the
  client tier in sync with the DB tier) stays an **operational** note — in local/demo set the tier via the
  Admin panel / seed; at go-live the PayPal webhook persists `tier` server-side. No code change for part 2.
  **Update 2026-07-01:** the founder re-hit part 2 on an upgraded account (Pro/Premium can't add a 2nd portfolio
  with only 1 present — the demo upgrade writes `tier` to **localStorage** via `saveProfile`, never to Firestore, so
  the rule still enforces `free`=1). Part 2 now has a **dev-only tier-persist path — ✅ BUILT 2026-07-01 (Round 17)**: a
  `devSetMyTier` callable writes the caller's OWN Firestore `tier` via the Admin SDK, **hard-gated to the emulator**
  (`FUNCTIONS_EMULATOR==="true"`, else `permission-denied`) and only called from dev builds (`import.meta.env.DEV`,
  wired into the in-app upgrade completion + expiry-downgrade). In-app upgrade now works end-to-end locally; **prod
  stays PayPal / admin and `tier` is never client-writable** (rules unchanged). Verified e2e on the emulator (`free@`
  → `pro` → a 2nd portfolio allowed). Full spec [`DESIGN-PASS.md`](../design/DESIGN-PASS.md) "Round 17" +
  [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) §DP.

### A2 · Generic error toasts hide the real cause (≈10 places) ✅ (high)

- **Symptom:** Many failures show "… Check your connection." regardless of the *actual* error
  (permission-denied = limit/upgrade, unauthenticated, schema-invalid, offline). A1 is the visible example.
- **Where:** `src/CryptoIdea.jsx` `showErr(...)` after `!res.success` in the portfolio/coin/tx CRUD handlers
  (~lines 396, 404, 414, 424, 436, 451, 456, 484, 491, 504). The data layer (`src/api/firebase-database.js`)
  returns only `error.message`, never `error.code`.
- **Root cause:** Firestore rule denials surface as `code:'permission-denied'` with a generic message; the
  app discards `error.code` and shows a hardcoded "connection" string, so a limit/auth/validation failure is
  indistinguishable from a real outage.
- **Fix:** (1) Return `code: error.code` from every data-layer catch. (2) Map codes to honest messages
  centrally — `permission-denied` → "You've hit a plan limit or this isn't allowed."; `unauthenticated` →
  "Please sign in again."; otherwise "Check your connection." (3) In dev, `console.error` the real
  `code`+`message` for triage.
- **Verify:** Add coins past the free cap (10) → the toast says *limit*, not *connection*. Disconnect the
  emulator → it says *connection*.
- **Severity:** high (root reason A1 was confusing).
- **Status:** ✅ **FIXED 2026-06-29** (with A1). All ~10 CRUD handlers in
  [`CryptoIdea.jsx`](../../src/CryptoIdea.jsx) now route their failure toast through `apiErrorMessage(res, …)`:
  the create/add paths (portfolio / coin / transaction) carry an upgrade-hook limit message; the rest fall
  back to a generic *"That action isn't allowed — you may have reached a plan limit."* on `permission-denied`,
  *"Please sign in again."* on `unauthenticated`, else the connection string. Every data-layer catch returns
  `code: error.code`. (Centralised in one pure, unit-tested helper rather than a per-handler `switch`.)

### A3 · Delete-coin confirm state leaks across navigation (sticky "armed" delete) 🟡 (medium)

- **Symptom:** Add a coin that has **no** transactions → open its Detail → tap the trash (delete) → the
  "Remove" confirm arms → **without** confirming or cancelling, tap **+ Buy** and add a transaction → back on
  the coin's Detail the **"Delete {coin}? This coin has 1 buy/sell transaction…"** warning modal pops up on its
  own. The user only expects a delete prompt when they *actively* press delete.
- **Where:** `confirmDel` is **app-level** state (`src/CryptoIdea.jsx:129`, exposed via context at `:616`),
  consumed only by `src/components/Detail.jsx` (trash arm `:28`, "Remove" pill `:29`, warning-modal guard `:88`).
  It is reset only on the **back button** (`Detail.jsx:23`) and on a delete/cancel action — **not** on the
  "+ Buy"/"- Sell" path (`startAddTx`, `CryptoIdea.jsx:497`), the tx-row edit tap (`Detail.jsx:69`), or a
  bottom-nav tab switch.
- **Root cause:** the delete "armed" flag is scoped to the whole app instead of to the Detail screen, so it
  survives navigation. Arm it (`true`) → navigate to Add-transaction (flag stays `true`) → add a buy (now
  `entries.length>0`) → return to Detail: the render guard `confirmDel && coin.entries.length>0`
  (`Detail.jsx:88`) is satisfied by the **stale** flag, so the warning modal renders unbidden. The same leak
  fires via the tx-row edit tap and any tab switch — all share the one app-level flag.
- **Fix (two parts):**
  1. **Scope the flag to Detail (primary).** Move `confirmDel`/`setConfirmDel` out of `CryptoIdea.jsx`'s
     context into a local `useState` inside `Detail.jsx`. Detail unmounts on every navigation away, so the
     armed state clears automatically — closing every leak path at once (KISS; no per-handler resets to
     maintain). Drop it from the `ctx` object + the `:129` `useState`.
  2. **Auto-disarm the lightweight "Remove" pill (UX).** When armed on a coin with **no** transactions (the
     inline "Remove" pill, `Detail.jsx:29`), start a ~**3s** timer; on expiry revert to the idle trash icon
     ("the first step of delete"). `useEffect` keyed on the armed flag, `clearTimeout` on cleanup. Scope to the
     inline pill only — the transaction-warning **modal** (a deliberate blocking dialog with an explicit Cancel)
     should NOT auto-dismiss.
- **Verify:** arm delete (no tx) → +Buy → add → back on Detail shows **no** delete prompt; arm delete (no tx) →
  wait ~3s → reverts to the trash icon; a coin **with** transactions still shows the warning modal when the
  trash is pressed, and Cancel / Delete-anyway still work. Update `tests/unit/Detail.test.jsx` (it currently
  injects `confirmDel` via the provider — drive it through the trash button instead).
- **Severity:** medium (misleading destructive-action prompt; no data loss on its own).
- **Status:** 🟡 **Diagnosed 2026-07-01 — fix ready, not applied.** Full UX spec + build order in
  [`DESIGN-PASS.md`](../design/DESIGN-PASS.md) "Round 12" + [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) §DP. **PLAN ONLY** — build on
  founder "go".

### A4 · Starter "coin limit" toast with only 2 coins — a >2000-char thesis denied server-side, mislabeled as a plan limit 🟡 (high)

- **Symptom:** On a Starter (free-tier) account holding **2 coins**, adding a new coin via the Search →
  Buy-Journal popup shows **"You've reached this portfolio's coin limit — upgrade for more."** (founder
  report + screenshot, 2026-07-07). The account is nowhere near the 10-coin cap.
- **Where:** `src/CryptoIdea.jsx:498` (`apiErrorMessage(res, …, limitMsg)`), `src/utils/errors.js:18-19`
  (every `permission-denied` → the limit message), `src/components/Search.jsx:35-48` + `src/utils/journal.js`
  (`thesisError` checks presence only; `cleanFunnel` trims but never caps; **no `maxLength`** on the thesis /
  change-my-mind / funnel textareas), `firestore.rules:272-273 / 287-289` (`validJournal`/`validFunnel` cap
  each field at **2000 chars**).
- **Root cause (two stacked bugs):** (1) the Buy-Journal inputs have no client length cap, so a >2000-char
  thesis/finding reaches Firestore and `validJournal` denies the whole `addCoin` batch as `permission-denied`;
  (2) `apiErrorMessage` maps **every** `permission-denied` at that call site to the coin-limit + upgrade
  message — a blind guess. Verified empirically: the account's counters were clean (`coinCount=2`), a
  byte-exact replica of the plain write **succeeded**, and the >2000-char journal variant reproduced the
  exact toast. The same blind mapping mislabels ≥10 other non-limit failures (missing parent portfolio doc →
  rules `get()` null-value error; name-bound violations; stale ids; auth lapse) as plan limits — and a
  27-agent adversarial audit confirmed **36 gaps + 5 critic additions** in this class (state desync, counter
  drift, screen-only downgrade trims).
- **Fix:** the **§DI plan** ([`DATA-INTEGRITY.md`](../product/DATA-INTEGRITY.md), build order
  [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) §DI): DI-1 verify-then-toast (the limit message only when the server count
  truly ≥ cap) + 2000-char caps with live counters on every thesis writer; DI-2 active-portfolio self-heal;
  DI-3 guarded counter mutations + `reconcileMyCounters`; DI-4 keep-data downgrade with grey-lock; DI-5
  watcher robustness; DI-6 session/config hardening.
- **Verify (post-build):** type a 2,500-char thesis → the input caps at 2,000 with a visible counter and the
  save succeeds; force a missing active portfolio → the app resyncs instead of toasting a limit; a REAL
  at-cap add still shows the honest limit + upgrade message.
- **Severity:** high (a false paywall message on the money path; the founder hit it with real usage).
- **Status:** ✅ **FIXED 2026-07-07 (DI-1)** — the data layer now CLASSIFIES a denial (reason:
  limit/missing-target/invalid-or-denied) and the limit/upgrade toast fires ONLY on a server-confirmed
  limit; thesis/funnel inputs are capped at 2000 (maxLength + counter) so an over-long thesis can't reach
  the server. Supersedes the A2 fix's `permission-denied` → limit-message heuristic (D1–D7 in DATA-INTEGRITY.md).

### A5 · Admin tab kills every non-admin session (empty "Welcome," · plan popup→full-screen · "can't stay logged in after un-suspend") 🟡 (high)

- **Symptom (four founder reports, 2026-07-07, all ONE bug):** (1) after registering, the plan screen
  shows **"Welcome,"** with no name; (2) a new user who idles on the plan popup sees it **turn into the
  full-screen plan page after ~1 minute**; (3) after un-suspending a user in the admin panel, logging into
  that account gets **signed out within 2–3 seconds on every attempt**; (4) **after upgrading to Pro/
  Premium the account auto-logs-out after ~1 minute** (2026-07-07 PM) — same ~1-min backgrounded-tab
  signature; the upgrade code has NO logout path (`devSetMyTier` only writes `users/{uid}.tier`; the
  fake-PayPal completion sets tier + `showWelcome`, never signs out), so it's the admin tab killing the
  session, not the upgrade. Verify with /admin closed as part of the R31-1 fix; escalate if it survives.
- **Where:** `src/admin-main.jsx:31-39` (the admin app's `onAuthChange` force-refreshes ANY observed user's
  token and calls `logoutUser()` for non-admins — even on a claim-check error); `src/api/firebase.config.js`
  (ONE default Firebase app + `getAuth()` shared by `app.html` AND `admin.html` — same origin, same
  IndexedDB persistence, so the sign-out propagates to every tab); `src/hooks/useAuthSession.js:99-102`
  (the signed-out branch clears `user`/`screen` but never `showPlan`); `src/components/Login.jsx:45,131`
  (`if(showPlan)` renders the picker before the login form, and `user?.name` has no null-user guard).
- **Root cause:** with the admin panel open in another tab, ANY non-admin sign-in on the same browser is
  killed by the admin tab (2–3s when the tab is active; ~1 min when Chrome has throttled the backgrounded
  tab's timers). The user app then runs `onAuthChange(null)` → `setScreen("login")` — but `showPlan` stays
  `true`, so the still-open plan flow re-renders as the FULL-SCREEN picker with `user=null`: that page IS
  the empty "Welcome," (the popup variant never shows the header, so the only Welcome header the founder
  could see was the broken post-sign-out one). Un-suspend itself works (`updateUser {disabled:false}` +
  clean 10s live session single-tab — verified). Reproduced live: registration showed "Welcome, Wf Name
  Probe" correctly at ~0.5s; a simulated admin-tab `signOut()` converted it to exactly "Welcome, " with the
  plan cards still up.
- **Fix:** DESIGN-PASS **Round 31-1** — give the admin app its own Firebase app instance/auth persistence
  (`initializeApp(config, "admin")`) and replace its auto-`logoutUser()` with a "Not an admin account"
  denied screen; user app hardening: clear the plan-flow overlay when the session dies + render the picker
  only when `showPlan && user`. (Related honest-message fix: `getErrorMessage` has no `auth/user-disabled`
  entry, so a suspended login shows "Something went wrong. Try again." — R31-6a.)
- **Verify (post-build):** with /admin open in one tab, register + log into user accounts in another —
  sessions survive; the plan popup never flips to full-screen; "Welcome, {name}" always carries the name;
  a suspended login says so honestly.
- **Severity:** high (breaks every founder test session with the admin panel open; in production the same
  applies to the founder's own browser).
- **Status:** ✅ **FIXED 2026-07-07 (R31-1)** — the admin app now runs on its OWN named Firebase instance
  (`initializeApp(config, "admin")` + `getAuth`), so its auth session is isolated and can never sign out
  the user app; non-admins get a passive denied screen (no auto-kill). Symptom-hardened in the user app
  (clear the plan overlay on session death + `showPlan && user` render guard). The "don't test logins with
  /admin open" gotcha no longer applies.

### A6 · A blocked signup read as "Something went wrong. Try again." — and the SDK rewrites the error ✅ (medium)
- **Where:** `src/api/firebase-auth.js` (`registerUser` catch) + `src/utils/errors.js`
  (`isSignupBlockedError`). Found 2026-07-24 while building ADMIN-0.
- **Symptom/cause:** when the new `beforeCreate` gate refuses a signup, Firebase Auth returns **no
  dedicated error code** — just `auth/internal-error` with the server's text buried in a wrapper. The
  code map therefore fell through to the generic *"Something went wrong. Try again."*, telling
  someone to retry a thing that is deliberately switched off, forever. Same class as **A1** (a plan
  limit read as a connection error) and the R31-6 suspended-account message: a KNOWN state rendered
  as a mystery.
- **Fix:** detect the refusal and show the same sentence the server used.
- **⚠️ The gotcha worth remembering — the two layers word it DIFFERENTLY.** The raw Identity Toolkit
  REST response leads with `BLOCKING_FUNCTION_ERROR_RESPONSE : ((HTTP request to …))`, but the
  **Firebase JS SDK strips that prefix** before the app sees it. Writing the detector from the
  server's response (the obvious move) produced a check that was **silently dead in the browser** —
  unit tests passed, the real path never fired. Only a live browser run caught it. Both shapes are now
  pinned as regression anchors in `tests/unit/errors.test.js`.
- **⚠️ Second gotcha — a too-broad marker lied confidently.** `PERMISSION_DENIED` was briefly used as
  one of the match strings. **Every Firestore rules denial message begins with it**
  (`"PERMISSION_DENIED: \nfalse for 'create' @ L80"`), so any rules rejection during signup was
  reported as *"signups are paused"* — which would have sent someone hunting a kill-switch that was
  never off. Markers must be strings only THAT failure can produce; the primary one is now our own
  message text. Proven live and locked in with a test.
- **Still open:** the markers were measured against the **emulator**. Production may word the wrapper
  differently again, in which case detection silently stops firing (degraded, not dangerous).
  Confirming the real string is GO-LIVE-AUDIT Phase 7 step 29.

### A7 · Portfolio dollar amounts render $1 low when the cents round up (`$100.999` → `$100.00`) ✅ (medium)

- **Symptom:** The Portfolio value card total and each asset card sometimes show a dollar figure **$1 too
  low** — a holding worth `$100.999` renders as **`$100.00`** instead of `$101.00`. Off by exactly one
  dollar, only on values whose fractional part rounds up to (or past) the next whole dollar.
- **Where:** `src/components/Portfolio.jsx` — the portfolio total and each asset card. Dollars were taken
  with `Math.floor(v)` while the cents were computed **independently** as `(v % 1).toFixed(2).slice(2)`.
- **Root cause:** the two halves round on their own and disagree. For `100.999`: dollars
  `Math.floor(100.999) = 100`, but cents `(0.999).toFixed(2) = "1.00"` → `.slice(2) = "00"` — the cents
  rounded UP into the next dollar while the dollars floored DOWN, so the carried dollar is silently
  dropped. Any value ≥ `x.995` hits it.
- **Fix:** round to cents **first**, then split — new pure [`src/utils/money.js`](../../src/utils/money.js)
  `splitMoney(n)`: `c = Math.round(n*100)`, `dollars = Math.trunc(c/100)`,
  `cents = String(Math.abs(c)%100).padStart(2,"0")`. Both loci render through the ONE helper (single
  source of truth), so the dollars and cents can never disagree; non-finite input is treated as `0`.
  Unit-tested (`tests/unit/money.test.js`) incl. `100.999`, `0`, `1234.995`, and negatives.
- **Verify:** a `$100.999`-class holding shows `$101.00` on the total AND every asset card; `npm run
  test:unit` green (951/951); build clean.
- **Severity:** medium (wrong money shown, but only ±$1 and only on rounding boundaries).
- **Status:** ✅ **FIXED 2026-08-06** (PORTFOLIO-NUM-FIX, commit `c9b3d05`, via the Agent Factory) — one
  of Gap Group A's six number-display fixes; see [`NEXT-STEPS.md`](../product/NEXT-STEPS.md)
  §PORTFOLIO-NUM-FIX.

### A8 · firebase-admin 14 (Dependabot #26) would crash the whole functions backend on load — the namespaced `admin.auth()`/`admin.firestore()` accessors were removed ✅ (high)

- **Symptom:** CI integration tier red on Dependabot **#26** (`bump firebase-admin 12.7.0 → 14.2.0 in /functions`):
  `TypeError: admin.auth is not a function` at `tests/functions-callable.test.js:47`, **14/18** callable tests failing
  (build+unit and rules stayed green).
- **Where:** `functions/index.js` (`admin.firestore()` at module top-level + `admin.auth()` ×20), plus
  `functions/scripts/seed-emulator.js` and `functions/scripts/set-admin.js`
  (`admin.auth()` + `admin.credential.applicationDefault()`).
- **Root cause:** firebase-admin **v13** removed the namespaced service accessors from the root export
  (`admin.auth`, `admin.firestore`, `admin.messaging`, `admin.credential.*` … all become `undefined`); #26 jumps
  straight to **v14** (skipping 13), inheriting the removal. Because `functions/index.js` calls `admin.firestore()`
  at **module top-level** (right after `admin.initializeApp()`), the module **throws on load** — so it is not just
  admin features but every callable, the public `/api` CoinGecko proxy, the PayPal webhook and all six crons: a full
  functions-backend outage. Verified empirically — under 12.7.0 `require("firebase-admin").auth`/`.firestore` are
  functions; under 14.2.0 they are `undefined`, while the modular subpaths (`firebase-admin/auth` → `getAuth`,
  `firebase-admin/firestore` → `getFirestore`, `firebase-admin/app` → `applicationDefault`) resolve on **both**
  versions.
- **Fix:** migrate every functions file to the **modular subpath API** — the same pattern already used for
  `FieldValue` (`require("firebase-admin/firestore")`, see C3). `getFirestore()`/`getAuth()` in `functions/index.js`;
  `getAuth()`/`getFirestore()`/`FieldValue` in `seed-emulator.js`; `getAuth()`/`applicationDefault()` in
  `set-admin.js`; `getAuth()`/`getFirestore()` in `tests/functions-callable.test.js`. `admin.initializeApp()` is
  kept (still on the root export in v14). Because the modular API resolves on v12 too, the migration is green on the
  current lockfile now and lets #26's bump rebase cleanly.
- **Guard:** `tests/unit/functions-runtime-safety.test.js` extended with a source scan that bans the removed
  namespaced accessors across `functions/index.js` + both scripts and asserts the modular imports (runs in
  `test:unit`, no emulator). Confirmed **red on the pre-migration source, green after**.
- **Severity:** high (merging #26 without this = the functions backend fails to load).
- **Status:** ✅ **FIXED 2026-08-07** on branch `claude/github-bot-dependency-review-qupedn` — firebase-admin
  modular migration; unblocks Dependabot #26.

### A10 · Landing billing toggle + Subscribe button are dead under the production CSP (inline `onclick=`) ✅ (medium)

- **Symptom:** On the marketing landing (`/`), clicking **Monthly/Yearly** does nothing and the **Subscribe**
  button does nothing — only pressing **Enter** in the email field subscribes.
- **Where:** `index.html` — `#btnMonthly` / `#btnYearly` / the Subscribe `<button>` used inline
  `onclick="setBilling(...)"` / `onclick="subscribe()"`. `public/landing.js` defines `setBilling`/`subscribe`
  but bound only the email-field **Enter** key via `addEventListener` (line ~40).
- **Root cause:** the production CSP (`firebase.json`) `script-src` has **no `'unsafe-inline'`** (D12), so inline
  event-handler attributes are **blocked at click time**. Confirmed under the real CSP in headless Chromium:
  clicking Yearly left the toggle unchanged and emitted two `script-src-attr` "Refused to execute inline event
  handler" violations. (This is why only the `addEventListener`-bound Enter key worked.)
- **Why it hid:** CI never serves the app under the Hosting CSP or in a real browser, and inline handlers only
  violate on **click** (not at parse), so a page-load smoke test shows nothing. Surfaced by the **vite 8 bundler
  PR (#40)** CSP smoke test — it is a *pre-existing* landing bug, independent of vite.
- **Fix:** remove the 3 inline `onclick=` attributes; bind the buttons in `landing.js` via `addEventListener`
  (the D12 externalized-script pattern) — `#btnMonthly`→`setBilling('monthly')`, `#btnYearly`→`setBilling('yearly')`,
  and a new `#subscribeBtn`→`subscribe`. Behaviour-preserving.
- **Verify:** production build + CSP smoke test (headless Chromium under the exact `firebase.json` CSP) — zero
  inline handlers in the built HTML, the Yearly toggle switches, the Subscribe button fires (`subMsg` populates),
  and **zero CSP violations** on load or click.
- **Severity:** medium (two landing CTAs silently dead in production; no data loss).
- **Status:** ✅ **FIXED 2026-08-07** on branch `claude/fix-landing-csp-onclick`.

---

## B. Robustness / hardening (recommended, not blocking)

### B1 · PayPal webhook rejections aren't audited 🟡 (medium)
- **Where:** `functions/index.js` ~243-250 (`paypalWebhook`). **Symptom/cause:** a failed signature
  verification logs a warning and returns 401, but writes **no** `audit` record and omits the event id, so
  tampering/misconfig is invisible. **Fix:** `writeAudit(..., 'webhookRejected', {...})` + log `event.id` +
  reason. **Verify:** send an invalid-signature webhook → audit tab shows the rejection. **Status:** 🟡.

### B2 · CoinGecko universe refresh degrades silently on a mid-run page failure 🟡 (medium)
- **Where:** `functions/index.js` ~799-827 (`refreshUniverse`). **Cause:** the fetch loop `break`s on any
  failed page and returns partial data with no per-page log, so long-tail coins silently vanish until the next
  cycle. **Fix:** `console.warn` the failed page + status, return `failedPage`, and log it in
  `refreshPrices`/`refreshUniverseDaily` when `!complete`. **Verify:** mock a 503 on page 3 → log names page 3.
  **Status:** 🟡.

### B3 · Landing "subscribe" returns a vague 503 when email isn't configured 🟡 (low)
- **Where:** `functions/index.js` ~1023-1025 (`/api/subscribe`). **Cause:** one generic
  "email not configured" 503 can't distinguish no-provider vs missing-key vs bad-url. **Fix:** specific codes
  (`email-provider-not-configured` / `…-missing-api-key` / `invalid-email-provider-url`) + a server log.
  **Verify:** set a provider but blank key → error mentions the key. **Status:** 🟡.

### B4 · `/api/history` 404 (delisted coin) returns an empty array, indistinguishable from "no data" 🟡 (low)
- **Where:** `functions/index.js` ~993-1000 (`/api/history`). **Cause:** a non-OK CoinGecko response falls
  back to empty/cached with no flag, so the client can't tell "not found" from "no history yet." **Fix:** on
  404 return `{ prices:[], notFound:true }`; `console.warn` non-404 statuses. **Verify:** request a fake id →
  response carries `notFound`. **Status:** 🟡.

### B5 · Admin config shows only set/unset flags 🟡 (low)
- **Where:** `functions/index.js` `getAdminConfig` + `src/hooks/useAdminDashboard.js`. **Cause:** secrets are
  correctly never returned, but neither are the *non-secret* parts (provider name, from-email, PayPal client
  id), so a wrong-but-set value can't be verified without re-entering everything. **Fix:** return non-secret
  fields alongside the `*Set` flags and show them in the form. **Verify:** save config, reload → provider /
  email / client-id visible. **Status:** 🟡.

### B6 · Landing DCA fetch timeout — confirm it's wired 🔎 (medium)
- **Where:** the landing DCA calculator fetch of `/api/coinlist` + `/api/history`.
  [`CALCULATOR.md`](../product/CALCULATOR.md) documents a 12s `AbortController` timeout + offline estimate (N-1 in
  NEXT-STEPS §4b is marked done). **Action:** verify the shipped code matches (AbortController + 12s + the
  offline fallback) — throttle to Slow-3G and confirm it errors gracefully, no infinite spinner, no NaN.
  **Status:** 🔎 verify (likely already handled).

### B7 · Cache-refresh routes can stampede CoinGecko under a cold-cache burst 🔎 (low, pre-existing)
- **Where:** `functions/index.js` `getUniverse()` (~831) feeding `/api/search` + `/api/coinlist` + `/api/prices`,
  and `getTrending()` (~862) feeding `/api/trending` (added in DP-6). **Cause:** all use the same lazy pattern —
  when the cache is stale (past TTL), the *next* request triggers a refresh; N concurrent requests in that
  window each see stale data and each fire their own CoinGecko fetch + Firestore write (a thundering herd). All
  share the general 60/min-per-IP limit (only `/api/subscribe` has a dedicated tighter one). **Assessment
  (DP-6 review, 2026-06-29):** a review flagged `/api/trending` specifically as "high — add a dedicated limit",
  but that's **overstated**: refresh is TTL-gated (30 min), not per-request, and `/api/trending` is the
  *cheapest* of the group (1 CoinGecko call vs the universe refresh's 12 pages). DP-6 introduces **no new
  risk** — it follows the established `getUniverse` pattern exactly. A bespoke limit on only the cheapest route
  would be inconsistent (the pricier universe refresh would remain the weaker link). **Fix (if/when it matters,
  codebase-wide — NOT a DP-6 blocker):** coalesce concurrent refreshes behind a single in-flight promise per
  cache doc (so a burst triggers ONE upstream call), applied to `getUniverse` + `getTrending` together; and/or
  a scheduled `refreshTrending` so cold-cache refreshes never land in the request path (mirrors `refreshPrices`).
  **Verify:** fire many concurrent cold-cache requests → exactly one upstream fetch. **Status:** 🔎 backlog
  hardening (low; accepted tradeoff today, same as the existing universe routes — see line 785-787 notes).

### B8 · PayPal go-live path: Premium purchases labeled "pro" + immediate-free cancel 🔎 (high at go-live, inert locally)
- **Where:** `functions/index.js` — `paypalWebhook` (`:256-275`) + `cancelSubscription` (`:197-215`).
  **Cause (found in the Round 29 billing map, 2026-07-03):** (a) the webhook's
  `BILLING.SUBSCRIPTION.ACTIVATED` and `PAYMENT.SALE.COMPLETED` handlers hardcode `tier: "pro"` — they never
  check *which* plan id (`PAYPAL_PLAN_ID` vs `PAYPAL_PREMIUM_PLAN_ID`) the subscription belongs to, so a real
  **Premium** purchase would set `tier:"pro"` at go-live (customer pays Premium, gets Pro); (b)
  `cancelSubscription` sets `tier:"free"` **immediately** after cancelling the PayPal sub — contradicting the
  shipped promise "access continues until your paid period ends" (R27-4 copy + the client model, which flips
  at `endDate` via `dueDowngrade`) and unable to express a chosen downgrade target (Round 29's Premium→Pro);
  (c) there is no server-side at-period-end flip at all — only the client's on-load `dueDowngrade`.
  **Why inert locally:** the emulator never receives real PayPal webhooks and the app's local flow doesn't
  call `cancelSubscription`; the client-side subscription model is the stand-in until go-live. **Fix (go-live,
  owned by NEXT-STEPS §BL-1):** map `plan_id`→tier in both webhook handlers; rework `cancelSubscription` to
  mark `{cancelled, endDate, downgradeTo}` and leave `tier` untouched until period end; add the server-side
  period-end flip (scheduled or webhook-driven), honoring Round 29's re-checkout semantics ("Keep my plan" =
  PayPal reactivation). **Verify:** sandbox-PayPal e2e at go-live — buy Premium → tier "premium"; cancel →
  tier unchanged until period end. **Status:** ✅ **CODE FIXED 2026-07-03 (commit `e497f82`, §BL-1)** —
  `functions/billing.js` (pure, 22 unit tests) + index.js wiring: (a) `plan_id`→tier on ACTIVATED and no
  blind tier on SALE.COMPLETED (recovery-only via `tierBeforeFailure`); (b) `cancelSubscription` +
  CANCELLED/SUSPENDED webhooks mark `{cancelled/paymentFailed, downgradeTo, endDate}` with **no immediate
  tier drop**; (c) new daily `enforceSubscriptionPeriods` sweep flips at period end (a "pro" target keeps
  its marker for the Round 29 re-checkout; 7-day grace on payment failure). The **sandbox-PayPal e2e**
  remains the go-live verification (webhooks can't fire locally). **Review addendum (34-agent adversarial
  pass, same day):** because the sweep now TRUSTS `users/{uid}.subscription`, that field (+`billingCycle`/
  `tierBeforeFailure`/`paypalSubscriptionId`) is **owner-immutable in firestore.rules** (update AND create;
  rules-tested) — otherwise an owner could clear their own cancellation marker and keep a paid tier without
  paying, or hijack SALE.COMPLETED recovery with a victim's sub id. Residual go-live item: the client's
  pending-downgrade decisions need `reactivateSubscription`/`resolveRecheckout` callables to clear the
  server marker (NEXT-STEPS §BL-4) — locally the localStorage model is authoritative, so nothing is stuck.

---

## C. By design — NOT bugs (documented so they aren't "fixed" by mistake)

- **C1 · Research AI is a stub, and that's honest now (not an apology).** `src/features/research/api/ai-client.js`
  throws `research-ai-proxy-not-configured`; `useAsk`/`usePulse` catch it and render the deterministic
  data-driven summary — which IS the shipped product. As of **CRYP-93 (2026-08-08)** the old "AI is offline —
  showing a basic summary" note was **removed** and replaced by a neutral **"AI off"/"AI on" status pill**; the
  live-AI ornaments (gradient label, Regenerate, "AI-generated" disclaimer) and the Ask chat are gated off
  (`AI_PROXY_LIVE` + the `aiResearch` flag) until the proxy ships. Live Claude is **Wave B** (secure Cloud
  Function proxy holding the Anthropic key + the `validate-output.js` validator). *Nice-to-have:* a dev-only
  `console.warn` so a future misconfigured proxy doesn't fail silently. ℹ️
- **C2 · Audit logging is best-effort.** `functions/index.js` `writeAudit` (~85-97) logs and swallows its own
  failures so a bad audit write never breaks an admin action (correct policy). Monitor Functions logs for
  `writeAudit` errors as a config/quota signal. ℹ️
- **C3 · Audit timestamps use `Date.now()` in the emulator.** `admin.firestore.FieldValue.serverTimestamp()`
  is undefined in the emulator, so `writeAudit` uses `Date.now()` (`functions/index.js:94`). Real Cloud
  Functions can use `serverTimestamp()`; feature-detect via `process.env.FIRESTORE_EMULATOR_HOST` if desired. ℹ️
- **C4 · Pub/Sub schedules don't auto-fire in the emulator.** `refreshPrices`/`refreshUniverseDaily`/
  `purgeExpiredTrash` register but only Cloud Scheduler fires them in prod. Trigger manually from the
  Emulator UI (`localhost:4000` → Pub/Sub). ℹ️ (already in CLAUDE.md "Known notes")
- **C5 · No-names dist guard — add an integration test.** `scripts/check-dist-names.js` fails the build if an
  investor name (Buffett/Munger/Marks/Graham) leaks to `dist/`; it's unit-tested but there's no build-level
  test that intentionally leaks a name and asserts the build fails. Add one to lock the guard. (low) ℹ️
- **C6 · Un-suspend returned INTERNAL and silently skipped the paid-time credit — FIXED 2026-07-18.**
  `suspendUser`'s un-suspend branch built its patch with `admin.firestore.FieldValue.delete()`. Inside the
  functions emulator the `admin.firestore` **namespace is proxied and its static members are `undefined`**
  (`admin.firestore()` as a *call* still works, which is why the line reads as idiomatic) — so `.delete()`
  threw a TypeError that surfaced to the admin as `INTERNAL`. Verified by probe inside the running emulator:
  `typeof admin.firestore === "function"` but `typeof admin.firestore.FieldValue === "undefined"`. Same trap
  as **C3**, which `writeAudit` had already worked around with `Date.now()`.
  **Why it was worse than a failed action:** `admin.auth().updateUser(uid, {disabled:false})` runs *before*
  the throw, so the Auth account WAS re-enabled — the user could sign in and the operation looked half-done.
  What was lost is the Firestore bookkeeping: `suspendedAt` was never cleared (so the daily
  `enforceSubscriptionPeriods` sweep stayed frozen on that account forever) and `billing.extendForSuspension`
  never ran, so a suspended paying customer silently lost the frozen days (R31-6). Suspending worked fine, so
  the failure only showed on the reverse action.
  **Fix:** `const { FieldValue } = require("firebase-admin/firestore")` — the modular subpath resolves the
  same way in the emulator and in deployed functions. (Note: in a plain Node process, and so most likely in
  deployed functions, `admin.firestore.FieldValue` *is* defined — this reproduced as an emulator-runtime
  failure. Since the app has not gone live, the emulator is the only runtime that has executed this path.)
  **Why no suite caught it:** `extendForSuspension` is pure and covered in `billing.test.js`, the gate is
  covered in `admin-gate-coverage.test.js`, and every client-side callable test mocks `httpsCallable` — so
  nothing ever executed a callable *body*. Now covered from both sides: `tests/unit/functions-runtime-safety.test.js`
  (source guard banning `admin.firestore.<Static>`, runs in `test:unit`) and `tests/functions-callable.test.js`
  (invokes the real callable over HTTP against the functions emulator, asserting `suspendedAt` is cleared and
  `endDate` is extended by the frozen window). Both were confirmed to fail against the buggy line. ✅
- **C7 · `findDuplicateEmails` duplicate-detection CANNOT be integration-tested — the Auth emulator forbids
  duplicate emails.** The Firebase Auth emulator rejects any attempt to create two accounts sharing an email —
  `createUser`/`updateUser` enforce uniqueness, and even `importUsers` (the bulk migration API) fails with
  `auth/invalid-user-import` ("Auth Emulator does not support importing duplicate email"), whether the records
  are in separate calls or a single batch. So the exact state `findDuplicateEmails` exists to surface — ≥2 Auth
  accounts with one email — is **un-constructable at the integration tier** (the positive control is impossible
  too). This is why the AUTH-DUP grouping (`functions/duplicates.js` `groupDuplicateEmails`) and the ADMIN-SEP
  admin-exclusion (`excludeAdmins`) are proven at the **unit tier** (`tests/unit/duplicates.test.js`), not via a
  live callable. The admin *gate* is covered by `tests/unit/admin-gate-coverage.test.js`, and the same
  `customClaims.admin === true` claim-skip is separately proven end-to-end by the passing `listUsers`/`getStats`
  ADMIN-SEP callable tests. Do NOT re-add an `importUsers`-based duplicate-email fixture — it will fail in CI. ℹ️ (CRYP-103)
- **C8 · Downgrade is now server-authoritative — a `devSetMyTier` account gets "No active subscription"
  on Confirm-Downgrade, by design.** Plan B **PR-C1** (2026-08-12, `9b68276`) removed the last
  **client-forged** billing write: `confirmDowngrade` / `finalizeDowngrade` in `src/CryptoIdea.jsx` now
  `await` the real `cancelSubscription({downgradeTo})` callable (via `src/api/billing.js`) instead of
  forging `{cancelled, downgradeTo}` into state + the localStorage profile cache — `watchUserDoc` brings
  the **server-written** marker back and the confirmation toasts are date-free. **DEV caveat:** the
  server `cancelSubscription` throws `failed-precondition` ("No active subscription") when the caller's
  user doc has no `paypalSubscriptionId`. A **local dev** account tier-set via `devSetMyTier`
  (`pro@`/`premium@test.com` — no real PayPal sub) therefore surfaces that error toast on
  Confirm-Downgrade, where the old local forge used to succeed. This is the intended server-authoritative
  behaviour, **not a regression** — the emulator has no PayPal subscription to cancel. **Resolution:**
  Plan B **PR-C2** (2026-08-13, branch `claude/plan-b-pr-c2-pro-preauth`, `1dee0b4`) **shipped** a
  `FUNCTIONS_EMULATOR` dev-split in `scheduleProDowngrade` that restores local **Premium→Pro** downgrade
  testing (see C9). Canonical: [`BILLING.md`](../decisions/BILLING.md) §3.3. ℹ️ (PR-C1)
- **C9 · Plan B PR-C2 future-start Pro pre-auth — four billing findings closed + two residuals gated
  before paid plans.** The Premium→Pro downgrade now creates a REAL future-start PayPal Pro subscription
  (first-charges when Premium ends) via the new `scheduleProDowngrade` callable; the security review found
  and the PR (2026-08-13, branch `claude/plan-b-pr-c2-pro-preauth`, `1dee0b4`) **closed** four issues, all
  **verified against the emulator** (`tests/functions-callable.test.js` + `tests/unit/billing.test.js`):
  - **(a) [MED] abandonment overcharge** — a scheduled Pro sub with the Premium sub still live would
    double-bill if the user never finished. **CLOSED** by the **eager schedule-time Premium-cancel**
    (`scheduleProDowngrade` cancels the Premium PayPal sub, *checked*, when it writes the marker).
  - **(b) [MED] double-charge** — **CLOSED** by the checked cancel + **void-and-throw** ordering (a Premium
    cancel failure voids the just-created Pro sub and throws, no marker) and the future `start_time` that
    defers the Pro sub's first charge; the Pro sub stays `APPROVAL_PENDING` and can't charge until approved.
  - **(c) [HIGH] "Keep my plan" paywall bypass** — the old `reactivateSubscription` forged `cancelled:false`,
    leaving a paid tier with **no live PayPal sub** that the sweep never downgrades = **free Premium forever**.
    Reachable via a double keep-my-plan **and** via a plain Premium→Starter cancel + one keep-my-plan (the
    latter **pre-existing in merged code**). **CLOSED** by making `keepPlanPatch` **fail-closed** — it never
    writes `cancelled:false`; it re-affirms the cancellation (access to `endDate`, then the sweep drops to
    free), cancels any scheduled Pro sub, and the client routes to re-subscribe.
  - **(d) [LOW] healthy-sub self-cancel** via the raw `reactivateSubscription` callable — **CLOSED** by a
    `!sub.cancelled` **no-op guard** in `keepPlanPatch`.
  - **Two residuals were gated as GO-LIVE GATES in BOTH
    [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) §Plan B and
    [`GO-LIVE-AUDIT.md`](../product/GO-LIVE-AUDIT.md), dormant while `paidPlansEnabled=false`:**
    **(1) [MED] fail-open ordering — ✅ CLOSED by Plan B PR-C3a** (2026-08-13, branch
    `claude/plan-b-pr-c3a-marker-reconcile`, `c58751e` red → `3a08d1a` impl → `f0525e0`/`9091f6f`
    hardening). The eager Premium-cancel used to happen *before* the Firestore marker write, so a rare
    marker-write failure after a successful cancel left premium-with-no-billing. C3a makes the write
    **marker-first**: `scheduleProDowngrade` persists the `scheduledPro` marker carrying a transient
    `cancelPending` breadcrumb (the live Premium sub id still needing cancellation) **before** the
    irreversible Premium cancel, so a crash between the two is always recoverable. The checked cancel then
    three-way branches — CONFIRMED (`ok`/`422` → drain the breadcrumb via a targeted
    `FieldValue.delete()`), AMBIGUOUS (network throw **or a 5xx** → leave the marker for the daily
    reconcile-drain), DEFINITIVE (a 4xx → roll the marker fully back to the pre-schedule premium state so
    the user can retry, "no changes were made"). The daily `enforceSubscriptionPeriods` sweep gained a
    per-user **reconcile-drain** that retries the Premium cancel and clears `cancelPending` **only on a
    confirmed cancel** (a 5xx never erases an unconfirmed cancel — leave it, next sweep retries). Server-only,
    no callable/rules/client change; dormant while `paidPlansEnabled=false`. **(2) seamless re-subscribe
    (PR-C3b) — SERVER HALF ✅ DONE (PR-C3b-server, 2026-08-13, branch
    `claude/plan-b-pr-c3b-server-resubscribe`, `6c25f90`); CLIENT half (PR-C3b-client) is the remaining
    pre-paid-plans gate.** The future-start machinery is generalized to carry a target tier
    (`subscription.scheduledNext.tier`, renaming `scheduleProMarkerPatch`→`scheduleNextMarkerPatch`, with a
    back-compat shim so a legacy `scheduledPro` still resolves as tier "pro") behind ONE shared
    `scheduleFutureStart` engine, and a new **`resubscribePremium({billing})`** callable schedules a REAL
    future-start Premium sub for a cancelled-Premium user (precondition = cancelled Premium with no pending
    `scheduledNext` → "Keep my plan" first). ⏳ **STILL OPEN = PR-C3b-client:** the "Re-subscribe to Premium"
    CTA still routes via `startUpgrade("premium")`, which no-ops while `tier==="premium"` (same-tier guard),
    so it is inert during the cancelled-but-not-lapsed window — the client must swap to `resubscribePremium`
    and add the `scheduledNext || scheduledPro` shim to the six client readers. **⚠️ Deploy ordering:** the
    server no longer writes `scheduledPro`, so PR-C3b-client (the reader shim) must deploy before/with the
    server rename reaching prod, and `paidPlansEnabled` must stay OFF until both land (fail-safe — no paywall
    bypass — but a real ordering constraint). Canonical: [`BILLING.md`](../decisions/BILLING.md) §3.3. ℹ️ (PR-C2 → C3a → C3b-server)

---

## D. Dark-mode readability (CSS/design — tracked in the design plan)

Dark-mode "black on black / white on white / dull" issues are **design** items, not backend errors. They're
fully specced (file:line + token + dark-only fix) in [`DESIGN-PASS.md`](../design/DESIGN-PASS.md) **"Round 3"** and
[`NEXT-STEPS.md`](../product/NEXT-STEPS.md) **§DP** (R3-1…R3-8: add-portfolio button, back chevrons, accent "shiny"
green, account avatar, header tags/numbers, account fields/buttons, the Upgrade/Downgrade modal, and the
Research "Ask" panel) plus the earlier **R2-8** (Research "A note on diversification" card) and **R2-9**
(Learn "THE KEY INSIGHT" box). All fixes are **dark-block-only** so light mode is untouched.

---

*Diagnoses verified against the running local emulator (`npm run start:all` + seed). Append new errors at the
top of the relevant section with the full template.*
