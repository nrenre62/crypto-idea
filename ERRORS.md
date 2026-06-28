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

### A1 · B-PORT — "Couldn't create portfolio. Check your connection." 🟡 (high)

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
- **Severity:** high (blocks a core action + misleading message). **Status:** 🟡 fix ready, not yet applied.

### A2 · Generic error toasts hide the real cause (≈10 places) 🟡 (high)

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
- **Severity:** high (root reason A1 was confusing). **Status:** 🟡 fix ready.

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
