# ERRORS — diagnoses & fixes

> A running catalog of bugs, warnings, and "looks broken but isn't" caveats found in Crypto Idea —
> **what the error is** and **how to fix it**. One entry per issue, newest investigations first.
> Backend/runtime issues live here; **dark-mode CSS readability issues** are tracked in
> [`DESIGN-PASS.md`](DESIGN-PASS.md) "Round 3" + [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP (pointer in §D below).

**Status legend:** ✅ Fixed · 🟡 Diagnosed — fix ready (not yet applied) · 🔎 Needs verification ·
ℹ️ By design (not a bug — documented so it isn't mistaken for one).

**Entry template:** Symptom · Where · Root cause · Fix · Verify · Severity · Status.

---

## A. Confirmed bugs

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
  [`src/utils/errors.js`](src/utils/errors.js) `apiErrorMessage(res, fallback, limitMsg)`:
  `permission-denied` → the limit/upgrade message, `unauthenticated` → "Please sign in again.",
  else the connection fallback. Every `createPortfolio`/data-layer catch now returns `code: error.code`
  ([`firebase-database.js`](src/api/firebase-database.js)); `addPortfolio` ([`CryptoIdea.jsx:397`](src/CryptoIdea.jsx))
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
  → `pro` → a 2nd portfolio allowed). Full spec [`DESIGN-PASS.md`](DESIGN-PASS.md) "Round 17" +
  [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

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
  [`CryptoIdea.jsx`](src/CryptoIdea.jsx) now route their failure toast through `apiErrorMessage(res, …)`:
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
  [`DESIGN-PASS.md`](DESIGN-PASS.md) "Round 12" + [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP. **PLAN ONLY** — build on
  founder "go".

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
  [`CALCULATOR.md`](CALCULATOR.md) documents a 12s `AbortController` timeout + offline estimate (N-1 in
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
  remains the go-live verification (webhooks can't fire locally).

---

## C. By design — NOT bugs (documented so they aren't "fixed" by mistake)

- **C1 · Research AI is offline (stub).** `src/features/research/api/ai-client.js` throws
  `research-ai-proxy-not-configured`; `useAsk`/`usePulse` catch it and render the data-driven fallback
  (Pulse shows an "AI is offline" note). Live Claude is **Wave B** (secure Cloud Function proxy holding the
  Anthropic key + the `validate-output.js` validator). *Nice-to-have:* a dev-only `console.warn` so a future
  misconfigured proxy doesn't fail silently. ℹ️
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

---

## D. Dark-mode readability (CSS/design — tracked in the design plan)

Dark-mode "black on black / white on white / dull" issues are **design** items, not backend errors. They're
fully specced (file:line + token + dark-only fix) in [`DESIGN-PASS.md`](DESIGN-PASS.md) **"Round 3"** and
[`NEXT-STEPS.md`](NEXT-STEPS.md) **§DP** (R3-1…R3-8: add-portfolio button, back chevrons, accent "shiny"
green, account avatar, header tags/numbers, account fields/buttons, the Upgrade/Downgrade modal, and the
Research "Ask" panel) plus the earlier **R2-8** (Research "A note on diversification" card) and **R2-9**
(Learn "THE KEY INSIGHT" box). All fixes are **dark-block-only** so light mode is untouched.

---

*Diagnoses verified against the running local emulator (`npm run start:all` + seed). Append new errors at the
top of the relevant section with the full template.*
