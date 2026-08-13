# Crypto Idea — Billing & Subscriptions (PayPal)

**Canonical record of how paid subscriptions work.** Processor: **PayPal Subscriptions**.
Prices and tier economics live in [PRICING.md](PRICING.md); this doc is the source of truth
for the *mechanism* — the lifecycle, the webhook, security, secrets, and go-live steps.

Two readers: (1) **future me** — to safely change billing without re-deriving the flow; (2)
**Claude / a teammate** — so a change doesn't silently break the period-end promise or a guard.

---

## 1. At a glance

| | Starter | Pro | Premium |
|---|---|---|---|
| Monthly | $0 | $9.99 | $49.99 |
| Annual (2 months free) | $0 | $99.99 | $499.99 |
| PayPal plans (monthly / yearly) | — | `PAYPAL_PRO_MONTHLY_PLAN_ID` / `PAYPAL_PRO_YEARLY_PLAN_ID` | `PAYPAL_PREMIUM_MONTHLY_PLAN_ID` / `PAYPAL_PREMIUM_YEARLY_PLAN_ID` |

- **Only Pro and Premium are paid.** Starter is free-forever, no card, no PayPal object.
- **Access continues to the end of the paid period** on cancel/downgrade — never an instant cut-off.
- **No refunds** — cancelling stops the *next* charge; the current period runs out. This line
  appears on every billing surface (R31-4).
- Numbers here mirror [PRICING.md](PRICING.md) and the code defaults (`functions/index.js`
  `DEFAULT_PLANS`); they are admin-editable via `config/app.plans` and enforced by `firestore.rules`.

---

## 2. The moving parts

| Piece | File | Role |
|---|---|---|
| `createSubscription` (callable) | `functions/index.js` | Opens a PayPal checkout for the caller; returns the approval URL. |
| `cancelSubscription` (callable) | `functions/index.js` | Cancels the caller's own sub at PayPal; marks period-end downgrade. |
| `scheduleProDowngrade` (callable) | `functions/index.js` | **PR-C2 (Premium→Pro):** creates a REAL future-start PayPal Pro sub (first-charges when Premium ends) + **eagerly cancels** the Premium sub at schedule time; writes the tier-carrying `subscription.scheduledNext` marker (tier stays premium). A thin `tier:"pro"` caller of the shared `scheduleFutureStart` engine (PR-C3b-server). |
| `resubscribePremium` (callable) | `functions/index.js` | **PR-C3b-server (seamless re-subscribe):** a cancelled-Premium user schedules a REAL future-start PayPal **Premium** sub (first-charges when the current period ends) so Premium continues seamlessly. Shares the `scheduleFutureStart` engine (`tier:"premium"`); precondition = a **cancelled Premium with NO pending `scheduledNext`** (requires a prior "Keep my plan"). **Server-only today** — the six client `scheduledPro` readers + the CTA are PR-C3b-client. |
| `reactivateSubscription` (callable) | `functions/index.js` | "Keep my plan" — **fail-closed** (PR-C2): never un-cancels a dead sub; re-affirms the cancellation + cancels any scheduled future-start sub; the client routes the user to re-subscribe. |
| `paypalWebhook` (HTTP) | `functions/index.js` | The only unauthenticated inbound write; signature-verified + idempotent. |
| `enforceSubscriptionPeriods` (scheduled) | `functions/index.js` | Daily sweep that flips tiers once a period actually ends. |
| `getStats` (admin callable) | `functions/index.js` | Net-revenue reporting (gross − PayPal fees, per billing cycle). |
| **Pure billing decisions** | `functions/billing.js` | All the branch logic (plan→tier, patches, sweep, revenue) — no Firebase, fully unit-tested. **PR-C2** adds `scheduleProMarkerPatch`, `scheduledActivationDecision` and `keepPlanPatch`; **PR-C3b-server** renames the builder to `scheduleNextMarkerPatch` (writes the tier-carrying `scheduledNext`; the sweep / activation / keep-plan helpers read `scheduledNext`, with a **back-compat shim** so a legacy `scheduledPro` still resolves as tier `"pro"`). |
| Guards | `functions/guards.js` | Per-uid cooldown on `createSubscription` / `scheduleProDowngrade` / `resubscribePremium` (anti double-charge / duplicate schedule). |
| Billing api wrapper | `src/api/billing.js` | Client `createSubscription({plan, billing})` (Plan B PR-B), **`cancelSubscription({downgradeTo})`** (Plan B PR-C1) **and `scheduleProDowngrade({billing})`** (Plan B PR-C2) wrappers — components never call `httpsCallable` directly. `createSubscription` returns the approval URL for the buy button to redirect to; `cancelSubscription` schedules the caller's own period-end downgrade (server writes the marker); `scheduleProDowngrade` schedules a future-start Pro sub and returns `{approvalUrl, subscriptionId}`. |
| Upgrade/downgrade UI | `src/components/Login.jsx`, `src/components/Account.jsx`, `src/hooks/useUpgrade.js`, `src/CryptoIdea.jsx` | Plan picker, R29 downgrade chooser, period-end re-checkout. **PR-B:** the PROD buy button calls `createSubscription` → redirects to the PayPal `approvalUrl` (no client tier write; DEV keeps the emulator `persistTierDev` path). **PR-C1:** the downgrade chooser's Confirm (`confirmDowngrade`/`finalizeDowngrade`) routes through `cancelSubscription` — no client-forged marker; `watchUserDoc` syncs the server marker back. **PR-C2:** the Premium→Pro branch adds the real approve step (`scheduleProPay` → `scheduleProDowngrade`; PayPal redirect in PROD, marker-write in DEV); "Keep my plan" (`keepPlan`) converged on the fail-closed route (no `cancelled:false` forge); Account shows an honest "Re-subscribe to Premium" CTA. |
| Success page | `src/components/pro-success.jsx` + `src/hooks/useProSuccess.js` | The `/pro-success` PayPal-return page (Plan B PR-B). Read-only: `useProSuccess` watches the caller's own user doc and only claims success once the webhook has written a paid tier; renders the **actual** purchased tier (waiting / confirmed / timeout / signed-out). **PR-C2** reuses it for a `scheduledPro` marker → a "Pro starts when Premium ends" scheduled state. *(Client still reads `scheduledPro`; the `scheduledNext || scheduledPro` reader shim is PR-C3b-client — see the deploy-ordering constraint in §3.3.)* |

**Why `billing.js` is separate:** every decision (which tier a `plan_id` maps to, what a
cancellation writes, whether the sweep flips someone today, how revenue is counted) is a **pure
function** with no Firebase imports, so `tests/unit/billing.test.js` pins every branch without an
emulator and the webhook/callables/sweep can't drift from what the tests assert.

---

## 3. Subscription lifecycle

### 3.1 Upgrade (Starter/Pro → paid)
1. App calls `createSubscription({ plan: "pro"|"premium", billing: "monthly"|"yearly" })`.
2. Guards: **must be signed in**; **already-paid guard** (never opens a second checkout for a tier
   you already hold, unless it's winding down); **60-second per-uid cooldown** (kills double-click /
   scripted duplicates). `billingCycle` is persisted for revenue math.
3. Server creates a PayPal subscription (`custom_id = uid`, fixed `return_url`/`cancel_url` from the
   trusted `APP_URL` — never request headers) and returns the **approval URL**.
4. User approves at PayPal → PayPal sends **`BILLING.SUBSCRIPTION.ACTIVATED`** → the webhook maps
   `plan_id → tier` and sets `users/{uid}.tier` (+ `paypalSubscriptionId`, `upgradedAt`).

> The tier is set by the **webhook**, from PayPal's `plan_id` — never by the client, and never
> hardcoded (a Premium purchase lands as `premium`, a fix from the original hardcoded `"pro"`).

> **Client wiring is live (Plan B PR-B, 2026-08-12).** The buy button really performs step 1 above:
> in PROD it calls `createSubscription` (via `src/api/billing.js`) and redirects to the returned
> `approvalUrl` — the earlier 2-second `setTimeout` demo that wrote the tier to localStorage is gone,
> and there is **no client tier write in prod** (the buy component dropped `setUser`/`saveProfile`/
> `calcEndDate`). On return, `/pro-success` watches the caller's own user doc and confirms only once
> the webhook has set the paid tier (`watchUserDoc`), rendering the actual purchased tier. DEV keeps
> the emulator `persistTierDev` → `devSetMyTier` path (also server-authoritative). The cancel/downgrade
> handlers were the last client-forged piece; **Plan B PR-C1** (2026-08-12) moved them onto the server
> `cancelSubscription` callable too — see §3.3.

### 3.2 Recurring payments
- Each renewal fires **`PAYMENT.SALE.COMPLETED`**. A sale carries **no `plan_id`**, so it *never*
  sets a tier blindly — it stamps `lastPayment`, and the **only** tier change it can make is
  *recovery*: a payment landing on an auto-downgraded account restores `tierBeforeFailure`.

### 3.3 Cancel / downgrade (the period-end promise)
- `cancelSubscription({ downgradeTo })` cancels at PayPal and writes a **marker** (`subscription.
  cancelled`, `downgradeTo`) — **`tier` is left untouched**. Only a Premium account may target
  `"pro"`; everything else targets `"free"`.
- PayPal also sends **`BILLING.SUBSCRIPTION.CANCELLED`**, which records the true `endDate`
  (PayPal's `next_billing_time`) and `tierBeforeFailure`.
- The daily **`enforceSubscriptionPeriods`** sweep does the *actual* flip once `endDate` passes
  (pure `billing.subscriptionSweepPatch`):
  - target `"free"` → drop to Starter, clear the marker.
  - **with a `scheduledNext` marker** (PR-C2 / PR-C3b-server; a legacy `scheduledPro` is shimmed to
    tier `"pro"`) → the **money flip**: an **approved** schedule (`scheduledNext.approved === true`, the
    ACTIVATED-webhook proof of payment) flips to `{tier: scheduledNext.tier, paypalSubscriptionId:<the
    scheduled sub id>, billingCycle}` — Pro **or** a seamless Premium re-subscribe — and clears the
    marker; an **unapproved** schedule is **fail-closed to `{tier:"free"}`** — a paid tier is **never**
    granted without a PayPal-confirmed payment.
  - target `"pro"` with **no `scheduledNext`** (legacy R29 marker) → drop to Starter **but keep the
    marker**, so the app's **R29 re-checkout** popup can still take the real Pro payment (a fresh
    `ACTIVATED` webhook lands them on Pro) or continue on Starter.

> **Client wiring is server-authoritative (Plan B PR-C1, 2026-08-12).** The app's downgrade chooser
> (`confirmDowngrade` / `finalizeDowngrade` in `src/CryptoIdea.jsx`) now `await`s
> `cancelSubscription({downgradeTo})` (via `src/api/billing.js`) and lets `watchUserDoc` bring the
> **server-written** marker back — the old optimistic `setUser`+`saveProfile` forge of
> `{cancelled, downgradeTo}` into state + the localStorage profile cache is **gone**, and the
> confirmation toasts are **date-free** (the real `endDate` renders only once the synced server marker
> lands, never a client-fabricated number). This removed the last client-forged billing write.
>
> **Premium→Pro is a real future-start pre-authorization (PR-C2, 2026-08-13 — supersedes the PR-C1
> interim for this path).** The downgrade to Pro no longer waits for a period-end re-checkout: the new
> **`scheduleProDowngrade({billing})`** callable creates a **REAL future-start PayPal Pro subscription**
> whose `start_time` is the Premium period end (`custom_id = uid`), so it first-charges exactly when
> Premium ends and the account lands **directly** on Pro. The callable is gated like `createSubscription`
> (auth → `assertNoUnknownKeys(["billing"])` → fresh `paidPlansOn` **master** switch *before* the
> `checkout` kill-switch → premium-only → not-already-scheduled → 60s cooldown), then:
> 1. creates the future-start Pro sub (it stays `APPROVAL_PENDING` — it cannot charge — until the user
>    approves it);
> 2. **writes the marker FIRST (marker-first, PR-C3a)** — the server-only, **tier-carrying** marker
>    `subscription.scheduledNext {tier, subId, billing, startDate, approved:false}` (`tier` stays premium;
>    `cancelled:true`, `downgradeTo:"pro"`, `endDate = startDate`) carrying a **transient `cancelPending`
>    breadcrumb** = the live Premium sub id still needing cancellation, persisted **before** the
>    irreversible Premium cancel so a crash between the two is always recoverable (never
>    premium-with-no-billing). A marker-write failure here voids the just-created Pro sub and throws —
>    Premium is fully live and untouched (fully reversible);
> 3. **then eagerly CANCELS the Premium PayPal sub**, *checked* and three-way (PR-C3a): **CONFIRMED**
>    (an OK response OR an already-inactive `422` → drain the `cancelPending` breadcrumb with a targeted
>    `FieldValue.delete()`), **AMBIGUOUS** (a network throw OR a PayPal 5xx → leave the breadcrumb for
>    the daily reconcile-drain to confirm/finish), **DEFINITIVE** (a 4xx → roll the marker fully back to
>    the exact pre-schedule premium state so the user can retry, "no changes were made"). It then audits
>    and returns `{approvalUrl, subscriptionId}`. The client redirects to `approvalUrl` (PROD) or, in DEV
>    (`FUNCTIONS_EMULATOR`), skips PayPal entirely and just writes the mark.
>
> **The daily `enforceSubscriptionPeriods` sweep gained a per-user reconcile-drain (PR-C3a):** when a
> `cancelPending` breadcrumb is present it retries the Premium cancel and clears the breadcrumb **only on
> a confirmed cancel** (a 5xx never erases an unconfirmed cancel — leave it, the next sweep retries), so a
> schedule that died between the marker write and the Premium cancel always finishes. Pure helpers:
> `scheduleNextMarkerPatch` (renamed from `scheduleProMarkerPatch` in PR-C3b-server) now stamps
> `cancelPending`; `pendingCancelSubId` reads it; `keepPlanPatch` intentionally **preserves** `cancelPending`
> (fail-closed — the drain still finishes the live-sub cancel).
>
> The scheduled sub's own **`BILLING.SUBSCRIPTION.ACTIVATED`** webhook (when `resource.id === scheduledNext.subId`)
> is **deferred**: it only flips `scheduledNext.approved = true` (payment proof) — it does **not** flip the
> tier or overwrite the live sub id (the daily sweep owns that at `endDate`, see above). The old lazy
> best-effort Premium-cancel that lived in the webhook is **gone** — cancelling at schedule time is what
> closes the double-charge / bill-forever window.
>
> **"Keep my plan" is now FAIL-CLOSED** (`reactivateSubscription` → pure `keepPlanPatch`): by the time a
> cancel marker exists the PayPal sub is already terminally cancelled (cancel POSTs `/cancel` before
> marking; a scheduled Pro downgrade eager-cancels Premium), so un-cancelling to `cancelled:false` would
> leave a paid tier with **no live sub** and the sweep would never downgrade it — free Premium forever.
> Keep-my-plan therefore **never** writes `cancelled:false`: it re-affirms the cancellation (access still
> runs to `endDate`, then the sweep drops to free), **cancels any scheduled Pro sub** at PayPal, and the
> client routes the user to **re-subscribe**. It is a **no-op on a healthy (non-cancelled) sub**.
>
> **The whole PR-C2 flow is dormant while `paidPlansEnabled=false`** (it ships that way — see §3.6):
> `scheduleProDowngrade` refuses on the master switch just like `createSubscription`.
>
> **DEV split restored (PR-C2).** `scheduleProDowngrade` has a `FUNCTIONS_EMULATOR` branch that skips the
> PayPal round-trip and writes the marker directly (synthesizing a `subId` and a `+1 period` start when no
> persisted `endDate` exists), so a `devSetMyTier` account (`premium@test.com`, no real PayPal sub) can
> test the Premium→Pro downgrade locally again — the PR-C1 "No active subscription" DEV caveat
> ([ERRORS.md](../testing/ERRORS.md) §C8) is resolved for this path.
>
> **The two PR-C2 residuals were gated before paid plans (recorded in
> [NEXT-STEPS.md](../product/NEXT-STEPS.md) §Plan B and [GO-LIVE-AUDIT.md](../product/GO-LIVE-AUDIT.md)):**
> 1. **[MED] fail-open ordering — ✅ CLOSED by PR-C3a** (2026-08-13, `claude/plan-b-pr-c3a-marker-reconcile`):
>    the eager Premium-cancel used to happen *before* the Firestore marker write. It is now **marker-first**
>    (the `scheduledNext` marker + `cancelPending` breadcrumb is written before the irreversible cancel) with a
>    daily **reconcile-drain** that finishes any un-cleared cancel — see the flow above.
> 2. **Seamless re-subscribe (PR-C3b) — SERVER HALF ✅ DONE (PR-C3b-server, 2026-08-13,
>    `claude/plan-b-pr-c3b-server-resubscribe`); the CLIENT half (PR-C3b-client) is the remaining
>    pre-paid-plans gate.** The Pro machinery is now generalized to carry a target tier
>    (`scheduledNext.tier`) behind ONE shared `scheduleFutureStart` engine, and a new
>    **`resubscribePremium({billing})`** callable schedules a REAL future-start **Premium** sub for a
>    cancelled-Premium user (first-charges when the current period ends, so Premium continues seamlessly).
>    Its precondition is a **cancelled Premium with NO pending `scheduledNext`** — i.e. the user must have
>    used **"Keep my plan" first** (founder rule: a still-pending scheduled downgrade is *refused*, never
>    auto-cancelled). Same gate order as `scheduleProDowngrade` (fresh `paidPlansOn` master before
>    `checkout`) + 60s cooldown + `assertNoUnknownKeys(["billing"])`; acts on `context.auth.uid`.
>    **Still OPEN = PR-C3b-client:** the Account "Re-subscribe to Premium" CTA currently routes via
>    `startUpgrade("premium")`, which **no-ops while `tier==="premium"`** (the same-tier guard) — the client
>    must swap to `resubscribePremium` behind a confirm-gated CTA + cycle picker, and the six client
>    `scheduledPro` readers gain the `scheduledNext || scheduledPro` shim (see the deploy-ordering constraint
>    below). Both land before paid plans.
>
> **⚠️ Deploy-ordering constraint (PR-C3b-server, from the security review).** The
> `scheduledPro`→`scheduledNext` rename is **server-side**; the six CLIENT readers (`src/CryptoIdea.jsx`,
> `src/components/Account.jsx`, `src/hooks/useProSuccess.js`, `src/api/billing.js`) still read `scheduledPro`
> — that's PR-C3b-client's scope. This is **fail-safe** (no paywall bypass): the only client branch that ever
> forged the tier *up* was gated on `scheduledPro`, which the server no longer writes, and the server tier is
> authoritative (rules block client `tier`/`subscription` writes). But it is a real ordering constraint —
> **PR-C3b-client (the `scheduledNext || scheduledPro` reader shim in all six sites) must deploy before/with
> the PR-C3b-server rename reaching prod, and `paidPlansEnabled` must stay OFF until both land.** Never ship
> the server rename + enable paid plans ahead of the client shim.
>
> **Verification:** the full Premium→Pro round-trip (cancel-access timing; future-start `ACTIVATED` timing)
> verifies against the go-live PayPal **sandbox e2e** (§8.5).

### 3.4 Payment failure
- A failed charge fires **`BILLING.SUBSCRIPTION.SUSPENDED`** → marks `paymentFailed` + a **7-day
  grace** (`paymentFailedDate`). If a payment recovers within the window, `PAYMENT.SALE.COMPLETED`
  restores the tier. Otherwise the sweep drops to Starter after 7 days.

### 3.5 Admin suspension freeze (R31-6)
- An admin-suspended account's subscription **clock is frozen**: the sweep never flips a suspended
  user, and un-suspending **extends `endDate` by the frozen duration** (`billing.extendForSuspension`)
  so the user loses none of the paid time they couldn't use.

### 3.6 Launch-free mode — the `paidPlansEnabled` master switch (CRYP-101, 2026-08-08)
A single top-level flag, **`config/app.flags.paidPlansEnabled`** (default `true`; a peer of
`maintenance`/`signupsEnabled`, **not** a `flags.features` switch), pauses **all new paid
subscriptions** so the app can launch free (Starter-only) while billing is still being hardened.

- **The control is server-side, in `createSubscription`** — and, as of PR-C2, in **`scheduleProDowngrade`**
  too (a scheduled downgrade creates a *new* Pro sub, so it is paused identically). When the flag is
  exactly `false`, the callable throws `failed-precondition` ("New subscriptions are paused right now.")
  *before* the cooldown/PayPal work — so no client, even from devtools, can open a checkout. The gate reads
  `config/app` **fresh** (one extra read, `functions/flags.js` `paidPlansOn`), never the 5-min
  `getConfig()` cache: a revenue gate must not lag its own switch.
- **Precedence over `checkout`.** The `paidPlansEnabled` check sits **before** the ADMIN-2 `checkout`
  kill-switch, so `paidPlansEnabled=false` blocks new subs regardless of the finer `checkout` flag.
  The two coexist: `paidPlansEnabled` is the launch-master (admin **Plans & Pricing** card),
  `checkout` is the mid-incident finer control (App Controls). `signupsEnabled`/`maintenance` are
  orthogonal.
- **Default-ON, `!== false` idiom.** A missing key or an unreadable config reads as "paid plans
  available" — launch-free mode may only ever engage because a human flipped it, never as a silent
  side effect of a Firestore blip. `saveConfig` uses the same per-key **KEEP** merge as
  `requireAdminMfa`, so a partial `flags` save (the instant maintenance/signups toggles) can't drop
  the switch back on.
- **New registrations auto-resolve to Starter.** The ONBOARD-GATE chooser is suppressed client-side
  and onboarding runs the unchanged `chooseFreePlan` path (sets `planChosen` + `tier:'free'` +
  `ensureDefaultPortfolio`). Billing/pricing UI is hidden in the app (Login/Account) and on the
  landing (`#pricing` + nav/footer links, driven by `/api/config`) — presentation only; the server
  refusal is the boundary.
- **Existing paid users are untouched.** Tier, the running PayPal subscription, and cancel/downgrade/
  manage all stay (those gate on `tier`, not this flag). No data is touched; the switch never demotes
  anyone. Fully **reversible** — flip back to `true` and billing returns.

The admin toggle rides `saveConfig`; its audit `details` come from `config-diff.js` `diffConfig`,
which already recursively captures nested `flags.*` changes — so there is **no new audit action**.
Part A of LAUNCH-FREE (the Starter-limit bump) is a separate item (#12 PLAN-LIMITS-MAX) and changes
no tier limits here. Full plan + acceptance: [NEXT-STEPS.md](../product/NEXT-STEPS.md) §LAUNCH-FREE.

---

## 4. Security model (the part that must not regress)

- **Callables are token-authenticated.** `createSubscription` / `cancelSubscription` / `getStats`
  are `functions.https.onCall` — Firebase verifies the caller's ID token (`context.auth`) and the
  code acts on **`context.auth.uid`**, never a uid from the request body. No IDOR.
- **The webhook is public but every event is cryptographically verified** against PayPal's
  `verify-webhook-signature` API before it's trusted. **Fail-closed:** no webhook id configured →
  reject; verification not `SUCCESS` → `401`.
- **Idempotency + rollback.** PayPal redelivers events; each `event.id` is claimed once in a
  transaction (`webhookEvents/{id}`). The marker is written *before* the side effect, so if
  processing throws, the marker is **rolled back** (deleted) so PayPal's retry genuinely
  re-processes — otherwise a transient failure would suppress a paid-tier change forever
  (`webhookEvents` is never purged). All patches are idempotent set-merges, so a rare double-process
  is harmless.
- **Anti double-charge:** the already-paid guard + the 60-second per-uid cooldown.
- **Open-redirect guard:** PayPal `return_url`/`cancel_url` come from the fixed `APP_URL`, never
  from request headers a caller could spoof.
- **`firestore.rules` is the real authorization boundary:** a user **cannot write their own
  `tier`, `subscription`, `paypalSubscriptionId`, `tierBeforeFailure`, or `premiumLimits`** — those
  are server-only (Admin SDK). The client only ever *reads* its subscription state.

### HTTP vs HTTPS
**All billing traffic is HTTPS in production.** Every function is `functions.https.*`; the webhook
is `https://<region>-<project>.cloudfunctions.net/paypalWebhook`; PayPal is called at
`https://api-m.paypal.com` by default, or `https://api-m.sandbox.paypal.com` when the env var
`PAYPAL_ENV=sandbox` is set (default `live`; the base is chosen by pure `billing.paypalBaseFor(env)`).
This makes §8 step 5's sandbox→live end-to-end test **actually wireable** — flip `PAYPAL_ENV=sandbox`
to exercise a full checkout against PayPal sandbox before charging a live card. Redirects use
`https://<app>.web.app`. The **only** `http://` anywhere is the **local Firebase emulator**
(`http://localhost:5001/...` in `openapi.json`) — it serves on localhost only, is never exposed to
the network, and needs no TLS. It is not a production surface.

---

## 5. Secrets & configuration

PayPal needs seven values. **Primary source = the locked `config/app` Firestore doc** (set from the
Admin dashboard → Settings; the server reads it in `getPayPalToken` / `verifyPayPalWebhook`).
**Fallback = environment variables** (`functions/.env`, git-ignored, or the deploy env).

| Value | `config/app.paypal.*` (admin) | Env fallback | Notes |
|---|---|---|---|
| Client ID | `clientId` | `PAYPAL_CLIENT_ID` | Public-ish, but kept server-side. |
| Secret | `secret` (write-only; `keep()` idiom) | `PAYPAL_SECRET` | **Never** returned to a client (`getAdminConfig` exposes only `secretSet: true/false`). |
| Webhook ID | `webhookId` | `PAYPAL_WEBHOOK_ID` | Required — verification fails closed without it. |
| Pro plan IDs | — (env only) | `PAYPAL_PRO_MONTHLY_PLAN_ID` / `PAYPAL_PRO_YEARLY_PLAN_ID` | Plan IDs + `APP_URL` + `PAYPAL_ENV` are **env-only**, not in the config doc. Legacy `PAYPAL_PLAN_ID` still works as the Pro **monthly** fallback (back-compat). |
| Premium plan IDs | — (env only) | `PAYPAL_PREMIUM_MONTHLY_PLAN_ID` / `PAYPAL_PREMIUM_YEARLY_PLAN_ID` | Legacy `PAYPAL_PREMIUM_PLAN_ID` still works as the Premium **monthly** fallback (back-compat). |

- Four plan IDs (tier × cycle) are selected by pure `billing.planIdFor(tier, cycle, ids)`, so a
  yearly buyer is charged the yearly plan (the H6 mischarge fix — see §8). `PAYPAL_ENV=sandbox|live`
  (default `live`, sandbox strictly opt-in) picks the API base URL via `billing.paypalBaseFor(env)`.

- **The secret is never logged or echoed.** The admin "Settings" save uses the `keep()` idiom: a
  blank field keeps the stored secret rather than clearing it.
- **No secret is ever in the client bundle or git.** `.gitignore` + the pre-commit content scan
  catch PayPal-shaped tokens (`A21AA…`). See [API-SECURITY.md](../security/API-SECURITY.md) §3 / §6.

---

## 6. Revenue accounting (`getStats`)

- The admin Overview shows **net** revenue = gross − PayPal fees (**2.9% + $0.30** per charge,
  `PAYMENT_FEE_RATE` / `PAYMENT_FEE_FIXED`).
- `billing.computeRevenue` prices an **annual** payer at `priceYear/12` per month with the yearly
  charge's fee amortized (reads the persisted `billingCycle`), instead of mispricing them as a
  monthly payer.
- Break-even reference (from PRICING.md §3.4): ~30 Pro **or** ~7 Premium subscribers cover the
  ~$160/mo fixed infra.

---

## 7. Webhook events handled

| Event | Effect |
|---|---|
| `BILLING.SUBSCRIPTION.ACTIVATED` | Set tier from `plan_id`; record `paypalSubscriptionId`. Unknown plan → record sub, leave tier. **PR-C2 / PR-C3b-server:** if the activating sub is a scheduled future-start sub (`resource.id === scheduledNext.subId`), it is **deferred** — only mark `scheduledNext.approved=true` (tier stays premium; the sweep flips to `scheduledNext.tier` — Pro **or** a Premium re-subscribe — at `endDate`). |
| `PAYMENT.SALE.COMPLETED` | Stamp `lastPayment`; restore `tierBeforeFailure` on a recovered account. |
| `BILLING.SUBSCRIPTION.CANCELLED` | Mark cancelled + true `endDate`; sweep flips at period end. |
| `BILLING.SUBSCRIPTION.SUSPENDED` | Mark `paymentFailed` + 7-day grace; sweep drops after grace. |

---

## 8. Go-live checklist

1. `cd functions && npm install`, then `firebase deploy --only functions`.
2. Create the **four** PayPal **subscription plans** (Pro/Premium × monthly/yearly) in the PayPal
   dashboard; put their plan IDs in `functions/.env` (`PAYPAL_PRO_MONTHLY_PLAN_ID`,
   `PAYPAL_PRO_YEARLY_PLAN_ID`, `PAYPAL_PREMIUM_MONTHLY_PLAN_ID`, `PAYPAL_PREMIUM_YEARLY_PLAN_ID`;
   the legacy `PAYPAL_PLAN_ID` / `PAYPAL_PREMIUM_PLAN_ID` still serve as the monthly fallbacks). Set
   `PAYPAL_ENV=sandbox` while testing, `live` (or unset) for production.
   > ✅ **H6 mischarge FIXED (code side) — both halves in:** the **server** selects the plan by tier
   > **and** cycle (`billing.planIdFor(tier, cycle, ids)` over the four plan IDs + a yearly-plan-id
   > unit case, **Plan B PR-A**) and the **client** passes the chosen cycle
   > (`createSubscription({plan, billing})`, **Plan B PR-B**), so a yearly buyer is charged the yearly
   > plan. Remaining: the live PayPal **sandbox e2e** (`PAYPAL_ENV=sandbox`) before a live card. See
   > [`GO-LIVE-AUDIT.md`](../product/GO-LIVE-AUDIT.md) §3 H6.
3. Set `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` (env **or** admin Settings) and `APP_URL`.
4. PayPal Dashboard → **Webhooks → Add** the EXACT URL the deploy printed —
   `https://<REGION>-<PROJECT>.cloudfunctions.net/paypalWebhook` (v1 functions are region-prefixed;
   a region-less URL registers fine and silently receives nothing) — subscribe to:
   `BILLING.SUBSCRIPTION.ACTIVATED`, `.CANCELLED`, `.SUSPENDED`, `PAYMENT.SALE.COMPLETED`.
   Copy the **Webhook ID** into `webhookId` (admin) or `PAYPAL_WEBHOOK_ID`. **Until it is set,
   `verifyPayPalWebhook` returns false and EVERY event is rejected with 401** — and because the ID
   differs between sandbox and live, this is the single most likely go-live failure. Use PayPal's
   "Send test event" and confirm a doc lands in `webhookEvents` before trusting it.
5. **Live end-to-end test** (still pending): a real sandbox→live subscribe, renew, cancel, and a
   failed-payment path, confirming the webhook lands and the sweep flips at period end. **PR-C2 adds
   two round-trips to this e2e:** the **Premium→Pro downgrade** — confirm the eager Premium-cancel
   timing (access continues to the period end) and the **future-start Pro `ACTIVATED`** timing (fires
   at `start_time`, deferred to `scheduledNext.approved`, and the sweep flips to Pro at `endDate`).
6. **PR-C2 pre-paid-plans gates (must land before `paidPlansEnabled` is turned on** — also recorded in
   [NEXT-STEPS.md](../product/NEXT-STEPS.md) §Plan B and [GO-LIVE-AUDIT.md](../product/GO-LIVE-AUDIT.md)):
   (a) **marker-first ordering** in `scheduleProDowngrade` — ✅ **DONE (PR-C3a)**: the scheduled marker +
   `cancelPending` breadcrumb is written *before* the irreversible eager Premium-cancel, with a daily
   reconcile-drain closing the [MED] fail-open window;
   (b) **seamless re-subscribe (PR-C3b)** — server half ✅ **DONE (PR-C3b-server)**: the tier-carrying
   `scheduledNext` marker + the `resubscribePremium` callable; ⏳ **remaining = PR-C3b-client**, the
   `scheduledNext || scheduledPro` reader shim + a confirm-gated "Re-subscribe to Premium" CTA (today it
   no-ops on the same-tier guard);
   (c) **deploy ordering (PR-C3b-server → client)** — PR-C3b-client (the `scheduledNext || scheduledPro`
   client reader shim in all six sites) **must deploy before/with** the PR-C3b-server rename reaching prod,
   and `paidPlansEnabled` **must stay OFF until both land** (the server stopped writing `scheduledPro`;
   fail-safe, but never ship the server rename + enable paid plans ahead of the client shim).
7. Confirm `App Check` / abuse gates per [BACKEND-ADMIN-DECISIONS.md](BACKEND-ADMIN-DECISIONS.md)
   D4/D5 before public launch.

---

## 9. `users/{uid}` billing fields (data model)

```
tier                : "free" | "pro" | "premium"         (server-only write)
billingCycle        : "monthly" | "yearly"
paypalSubscriptionId: string
upgradedAt          : ms
lastPayment         : ms
tierBeforeFailure   : "pro" | "premium"   (for recovery / period-end)
suspendedAt         : ms   (admin suspension; freezes the sweep)
subscription: {
  cancelled, cancelledAt, endDate,        // period-end downgrade
  downgradeTo: "free" | "pro",            // R29 choice (only Premium may pick "pro")
  paymentFailed, paymentFailedDate,       // 7-day grace
  scheduledNext: {                        // PR-C2 / PR-C3b-server future-start pre-auth (tier-carrying;
    tier, subId, billing, startDate,      //   a legacy `scheduledPro` is shimmed to tier "pro")
    approved                              //   the real future-start PayPal sub (Pro OR Premium re-subscribe);
  },                                      //   approved:false until its ACTIVATED webhook proves payment
  cancelPending                           // PR-C3a marker-first breadcrumb: the live sub id still needing
}                                         //   cancellation, written BEFORE the eager cancel; drained by the
                                          //   sweep on a confirmed cancel (null for a re-subscribe)
```

All of the above are **server-authoritative** — `firestore.rules` forbids the owner from writing them.

---

## 10. Testing

- **Pure unit** (`tests/unit/billing.test.js`, no emulator) — every branch of `plan→tier`,
  activation/sale/cancellation patches, the sweep, suspension extension, and revenue math.
- **Integration** (`npm run test:integration`, own emulator) — the callables + rules against a live
  Firestore emulator.
- **Live PayPal e2e** — the one thing that can only be done against real PayPal; a go-live gate (§8.5).

---

## 11. References

- Code: [`functions/index.js`](../../functions/index.js) (PayPal section), [`functions/billing.js`](../../functions/billing.js), [`functions/guards.js`](../../functions/guards.js)
- Prices & margins: [PRICING.md](PRICING.md)
- Decisions: [BACKEND-ADMIN-DECISIONS.md](BACKEND-ADMIN-DECISIONS.md) (D5/D6), [PRODUCT-DECISIONS.md](PRODUCT-DECISIONS.md)
- Downgrade UX: [DESIGN-PASS.md](../design/DESIGN-PASS.md) Round 29 / Round 31
- API surface & secrets: [API-SECURITY.md](../security/API-SECURITY.md), [openapi.json](../../openapi.json)
- Open items: [PRICING.md](PRICING.md) §7, [NEXT-STEPS.md](../product/NEXT-STEPS.md)
