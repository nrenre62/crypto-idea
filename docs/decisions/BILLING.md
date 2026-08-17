# CryptoIdea — Billing & Subscriptions

Part of [Product decisions](PRODUCT-DECISIONS.md) — the canonical record of how paid subscriptions work, processed through PayPal Subscriptions.

Paid plans currently ship **OFF**. The live app runs on the free Starter plan only, gated by the admin master switch `paidPlansEnabled`. The Pro/Premium subscription code below exists but is not enabled: everyone is on Starter, the plan chooser is suppressed, and `createSubscription` refuses server-side. The PayPal flow has not been exercised end-to-end against live PayPal — treat this as the design record of a dormant feature, not a live payment path.

Prices and tier economics live in [PRICING.md](PRICING.md); this doc is the source of truth for the *mechanism* — the lifecycle, the webhook, security, secrets, and go-live steps.

## 1. At a glance

| | Starter | Pro | Premium |
|---|---|---|---|
| Monthly | $0 | $9.99 | $49.99 |
| Annual (2 months free) | $0 | $99.99 | $499.99 |
| PayPal plans (monthly / yearly) | — | `PAYPAL_PRO_MONTHLY_PLAN_ID` / `PAYPAL_PRO_YEARLY_PLAN_ID` | `PAYPAL_PREMIUM_MONTHLY_PLAN_ID` / `PAYPAL_PREMIUM_YEARLY_PLAN_ID` |

- Only Pro and Premium are paid. Starter is free-forever, no card, no PayPal object.
- Access continues to the end of the paid period on cancel/downgrade — never an instant cut-off.
- No refunds — cancelling stops the *next* charge; the current period runs out. This line appears on every billing surface.
- Numbers here mirror [PRICING.md](PRICING.md) and the code defaults (`functions/index.js` `DEFAULT_PLANS`); they are admin-editable via `config/app.plans` and enforced by `firestore.rules`.

## 2. The moving parts

| Piece | File | Role |
|---|---|---|
| `createSubscription` (callable) | `functions/index.js` | Opens a PayPal checkout for the caller; returns the approval URL. Refuses server-side while `paidPlansEnabled` is off. |
| `cancelSubscription` (callable) | `functions/index.js` | Cancels the caller's own sub at PayPal and writes a period-end downgrade marker. Throws `failed-precondition` ("No active subscription.") when the caller has no `paypalSubscriptionId`. |
| `scheduleProDowngrade` (callable) | `functions/index.js` | Premium→Pro: a thin `tier:"pro"` caller of the shared `scheduleFutureStart` engine. Creates a real future-start PayPal Pro sub and eagerly cancels the Premium sub. |
| `resubscribePremium` (callable) | `functions/index.js` | Seamless re-subscribe: a cancelled-Premium user schedules a real future-start Premium sub so Premium continues. Shares `scheduleFutureStart` (`tier:"premium"`); precondition = a cancelled Premium with no pending `scheduledNext` (requires a prior "Keep my plan"). |
| `scheduleFutureStart` (internal) | `functions/index.js` | The shared engine both scheduled callables use: creates the real future-start PayPal sub, writes the marker first, then does the checked eager cancel of the outgoing live sub. In the emulator it skips PayPal, synthesizes a simulated subscription id, and resolves the start from the persisted period end (or one billing period from now). |
| `reactivateSubscription` (callable) | `functions/index.js` | "Keep my plan" — fail-closed: never un-cancels a dead sub; re-affirms the cancellation, cancels any scheduled future-start sub, and the client routes the user to re-subscribe. |
| `resolveRecheckout` (callable) | `functions/index.js` | Clears the caller's own `subscription` marker (sets it to `null`) when a lapsed Premium→Pro user chooses "Continue with Starter" instead of re-checking-out. |
| `paypalWebhook` (HTTP) | `functions/index.js` | The only unauthenticated inbound write; signature-verified and idempotent. |
| `enforceSubscriptionPeriods` (scheduled) | `functions/index.js` | Daily sweep that flips tiers once a period actually ends and reconcile-drains any pending eager cancel. |
| `getStats` (admin callable) | `functions/index.js` | Net-revenue reporting (gross − PayPal fees, per billing cycle). |
| Pure billing decisions | `functions/billing.js` | All branch logic (plan→tier, patches, sweep, revenue) — no Firebase, fully unit-tested. |
| Guards | `functions/guards.js` | Per-uid cooldown on `createSubscription` / `scheduleProDowngrade` / `resubscribePremium` (anti double-charge / duplicate schedule). |
| Billing api wrapper | `src/api/billing.js` | Client `createSubscription`, `cancelSubscription`, `scheduleProDowngrade`, and `resubscribePremium` wrappers — components never call `httpsCallable` directly. |
| Upgrade/downgrade UI | `src/components/Login.jsx`, `src/components/Account.jsx`, `src/hooks/useUpgrade.js`, `src/CryptoIdea.jsx` | Plan picker, downgrade chooser, period-end re-checkout. |
| Success page | `src/components/pro-success.jsx` + `src/hooks/useProSuccess.js` | The `/pro-success` PayPal-return page. Read-only: watches the caller's own user doc and claims success only once the webhook has written a paid tier. |

**Why `billing.js` is separate:** every decision (which tier a `plan_id` maps to, what a cancellation writes, whether the sweep flips someone today, how revenue is counted) is a pure function with no Firebase imports, so `tests/unit/billing.test.js` pins every branch without an emulator and the webhook/callables/sweep can't drift from what the tests assert.

## 3. Subscription lifecycle

### 3.1 Upgrade (Starter/Pro → paid)

1. App calls `createSubscription({ plan: "pro"|"premium", billing: "monthly"|"yearly" })`.
2. Guards: must be signed in; an already-paid guard (never opens a second checkout for a tier you already hold, unless it's winding down); a 60-second per-uid cooldown (kills double-click / scripted duplicates). `billingCycle` is persisted for revenue math.
3. Server creates a PayPal subscription (`custom_id = uid`, fixed `return_url`/`cancel_url` from the trusted `APP_URL` — never request headers) and returns the approval URL.
4. User approves at PayPal → PayPal sends `BILLING.SUBSCRIPTION.ACTIVATED` → the webhook maps `plan_id → tier` and sets `users/{uid}.tier` (plus `paypalSubscriptionId`, `upgradedAt`).

The tier is set by the webhook, from PayPal's `plan_id` — never by the client and never hardcoded (a Premium purchase lands as `premium`). In production the buy button calls `createSubscription` and redirects to the returned approval URL; there is no client tier write. On return, `/pro-success` watches the caller's own user doc and confirms only once the webhook has set the paid tier. In the emulator, upgrades go through the server-authoritative `devSetMyTier` path instead of PayPal.

### 3.2 Recurring payments

- Each renewal fires `PAYMENT.SALE.COMPLETED`. A sale carries no `plan_id`, so it never sets a tier blindly — it stamps `lastPayment`, and the only tier change it can make is *recovery*: a payment landing on an auto-downgraded account restores `tierBeforeFailure`.

### 3.3 Cancel / downgrade (the period-end promise)

- `cancelSubscription({ downgradeTo })` cancels at PayPal and writes a marker (`subscription.cancelled`, `downgradeTo`) — `tier` is left untouched. Only a Premium account may target `"pro"`; everything else targets `"free"`. It throws `failed-precondition` when the caller has no `paypalSubscriptionId`.
- PayPal also sends `BILLING.SUBSCRIPTION.CANCELLED`, which records the true `endDate` (PayPal's `next_billing_time`) and `tierBeforeFailure`.
- The daily `enforceSubscriptionPeriods` sweep does the actual flip once `endDate` passes (pure `billing.subscriptionSweepPatch`):
  - target `"free"` → drop to Starter, clear the marker.
  - with a `scheduledNext` marker (a legacy `scheduledPro` is shimmed to tier `"pro"`) → the money flip: an approved schedule (`scheduledNext.approved === true`, the ACTIVATED-webhook proof of payment) flips to `{tier: scheduledNext.tier, paypalSubscriptionId: <the scheduled sub id>, billingCycle}` — Pro or a seamless Premium re-subscribe — and clears the marker; an unapproved schedule is fail-closed to `{tier: "free"}`. A paid tier is never granted without a PayPal-confirmed payment.
  - target `"pro"` with no `scheduledNext` (the legacy keep-marker branch) → drop to Starter but keep the marker, so the app's re-checkout popup can still take the real Pro payment (a fresh `ACTIVATED` webhook lands them on Pro) or continue on Starter.

The client downgrade chooser awaits `cancelSubscription({downgradeTo})` and lets `watchUserDoc` bring the server-written marker back; the real `endDate` renders only once that synced server marker lands.

### 3.4 Premium → Pro and seamless re-subscribe (future-start pre-authorization)

Premium→Pro and Premium re-subscribe both create a real future-start PayPal subscription through the one shared `scheduleFutureStart` engine, written **marker-first**:

1. Create the future-start PayPal sub (its `start_time` is the current period end, `custom_id = uid`). It stays `APPROVAL_PENDING` — it cannot charge — until the user approves it. A create failure leaves no marker.
2. Write the server-only, tier-carrying marker `subscription.scheduledNext {tier, subId, billing, startDate, approved:false}` FIRST (`tier` stays at the current paid tier; `cancelled:true`, `downgradeTo` = "pro" for a Pro downgrade else "free", `endDate = startDate`) carrying a transient `cancelPending` breadcrumb — the live sub id still needing cancellation — persisted **before** the irreversible cancel so a crash between the two is always recoverable (never a paid tier with no billing). A marker-write failure voids the just-created future-start sub and throws; the outgoing sub is fully live and untouched.
3. Then eagerly cancel the outgoing live PayPal sub, *checked* and three-way: CONFIRMED (an OK response OR an already-inactive `422` → drain the `cancelPending` breadcrumb with a targeted `FieldValue.delete()`), AMBIGUOUS (a network throw OR a PayPal 5xx → leave the breadcrumb for the daily reconcile-drain to finish), DEFINITIVE 4xx (roll the marker fully back to the exact pre-schedule state so the user can retry). A re-subscribe has no outgoing live sub (the Premium sub was already terminally cancelled by an earlier "Keep my plan"), so this step is skipped.

The callable then audits and returns `{approvalUrl, subscriptionId}`. The client redirects to `approvalUrl`. In the emulator (`FUNCTIONS_EMULATOR`) the whole PayPal round-trip is skipped: it synthesizes a subscription id and resolves the start from the persisted period end, or one billing period from now, and writes the marker directly — so a `devSetMyTier` account with no real PayPal sub can exercise the downgrade locally.

The daily sweep carries a per-user **reconcile-drain**: when a `cancelPending` breadcrumb is present it retries the outgoing cancel and clears the breadcrumb only on a confirmed cancel (a 5xx never erases an unconfirmed cancel — the next sweep retries), so a schedule that died between the marker write and the cancel always finishes.

The scheduled sub's own `BILLING.SUBSCRIPTION.ACTIVATED` webhook (when `resource.id === scheduledNext.subId`) is deferred: it only flips `scheduledNext.approved = true` (payment proof) — it does not flip the tier or overwrite the live sub id (the daily sweep owns that at `endDate`).

"Keep my plan" (`reactivateSubscription` → pure `keepPlanPatch`) is **fail-closed**. By the time a cancel marker exists the PayPal sub is already terminally cancelled, so un-cancelling to `cancelled:false` would leave a paid tier with no live sub and the sweep would never downgrade it — free Premium forever. Keep-my-plan therefore never writes `cancelled:false`: it re-affirms the cancellation (access still runs to `endDate`, then the sweep drops to free), cancels any scheduled future-start sub at PayPal, and the client routes the user to re-subscribe. It is a no-op on a healthy (non-cancelled) sub.

Re-subscribe is offered in the plain-cancelled state only (`cancelled` with no `scheduledNext`) — the user must use "Keep my plan" first. The whole flow is dormant while `paidPlansEnabled` is off: `scheduleProDowngrade` and `resubscribePremium` refuse on the master switch just like `createSubscription`.

### 3.5 Payment failure

- A failed charge fires `BILLING.SUBSCRIPTION.SUSPENDED` → marks `paymentFailed` plus a 7-day grace (`paymentFailedDate`). If a payment recovers within the window, `PAYMENT.SALE.COMPLETED` restores the tier. Otherwise the sweep drops to Starter after 7 days.

### 3.6 Admin suspension freeze

- An admin-suspended account's subscription clock is frozen: the sweep never flips a suspended user, and un-suspending extends `endDate` by the frozen duration (`billing.extendForSuspension`) so the user loses none of the paid time they couldn't use.

### 3.7 Launch-free mode — the `paidPlansEnabled` master switch (CRYP-101)

A single top-level flag, `config/app.flags.paidPlansEnabled` (default `true`; a peer of `maintenance`/`signupsEnabled`, not a `flags.features` switch), pauses all new paid subscriptions so the app can launch free (Starter-only) while billing is still being hardened.

- The control is server-side, in `createSubscription`, `scheduleProDowngrade`, and `resubscribePremium` (a scheduled downgrade or re-subscribe creates a new PayPal sub, so it is paused identically). When the flag is exactly `false`, the callable throws `failed-precondition` ("New subscriptions are paused right now.") before the cooldown/PayPal work — so no client, even from devtools, can open a checkout. The gate reads `config/app` fresh (`functions/flags.js` `paidPlansOn`), never the 5-minute `getConfig()` cache: a revenue gate must not lag its own switch.
- Precedence over `checkout`. The `paidPlansEnabled` check sits before the `checkout` kill-switch, so `paidPlansEnabled=false` blocks new subs regardless of the finer `checkout` flag. The two coexist: `paidPlansEnabled` is the launch-master (admin Plans & Pricing card), `checkout` is the mid-incident finer control (App Controls).
- Default-ON, `!== false` idiom. A missing key or an unreadable config reads as "paid plans available" — launch-free mode may only ever engage because a human flipped it. `saveConfig` uses a per-key KEEP merge, so a partial `flags` save (the instant maintenance/signups toggles) can't drop the switch back on.
- New registrations auto-resolve to Starter. The onboarding chooser is suppressed client-side and onboarding runs the unchanged `chooseFreePlan` path (sets `planChosen` + `tier:'free'` + `ensureDefaultPortfolio`). Billing/pricing UI is hidden in the app and on the landing (driven by `/api/config`) — presentation only; the server refusal is the boundary.
- Existing paid users are untouched. Tier, the running PayPal subscription, and cancel/downgrade/manage all stay (those gate on `tier`, not this flag). Fully reversible — flip back to `true` and billing returns.

The admin toggle rides `saveConfig`; its audit `details` come from `config-diff.js` `diffConfig`, which recursively captures nested `flags.*` changes — so there is no new audit action.

## 4. Security model (the part that must not regress)

- **Callables are token-authenticated.** `createSubscription` / `cancelSubscription` / `getStats` and the scheduled-downgrade callables are `functions.https.onCall` — Firebase verifies the caller's ID token (`context.auth`) and the code acts on `context.auth.uid`, never a uid from the request body. No IDOR.
- **The webhook is public but every event is cryptographically verified** against PayPal's `verify-webhook-signature` API before it's trusted. Fail-closed: no webhook id configured → reject; verification not `SUCCESS` → `401`.
- **Idempotency + rollback.** PayPal redelivers events; each `event.id` is claimed once in a transaction (`webhookEvents/{id}`). The marker is written before the side effect, so if processing throws, the marker is rolled back (deleted) so PayPal's retry genuinely re-processes. All patches are idempotent set-merges, so a rare double-process is harmless.
- **Anti double-charge:** the already-paid guard plus the 60-second per-uid cooldown; `chooseFreePlan` additionally enforces a per-uid daily budget cap to bound a scripted loop.
- **Open-redirect guard:** PayPal `return_url`/`cancel_url` come from the fixed `APP_URL`, never from request headers a caller could spoof.
- **`firestore.rules` is the real authorization boundary:** a user cannot write their own `tier`, `subscription`, `paypalSubscriptionId`, `tierBeforeFailure`, or `premiumLimits` — those are server-only (Admin SDK). The client only ever *reads* its subscription state.

### HTTP vs HTTPS

All billing traffic is HTTPS in production. Every function is `functions.https.*`; the webhook is `https://<region>-<project>.cloudfunctions.net/paypalWebhook`; PayPal is called at `https://api-m.paypal.com` by default, or `https://api-m.sandbox.paypal.com` when the env var `PAYPAL_ENV=sandbox` is set (default `live`; the base is chosen by pure `billing.paypalBaseFor(env)`). The only `http://` anywhere is the local Firebase emulator on localhost, which is never exposed to the network and needs no TLS.

## 5. Secrets & configuration

PayPal needs seven values. Primary source = the locked `config/app` Firestore doc (set from the Admin dashboard → Settings; the server reads it in `getPayPalToken` / `verifyPayPalWebhook`). Fallback = environment variables (`functions/.env`, git-ignored, or the deploy env).

| Value | `config/app.paypal.*` (admin) | Env fallback | Notes |
|---|---|---|---|
| Client ID | `clientId` | `PAYPAL_CLIENT_ID` | Public-ish, but kept server-side. |
| Secret | `secret` (write-only; `keep()` idiom) | `PAYPAL_SECRET` | Never returned to a client (`getAdminConfig` exposes only `secretSet: true/false`). |
| Webhook ID | `webhookId` | `PAYPAL_WEBHOOK_ID` | Required — verification fails closed without it. |
| Pro plan IDs | — (env only) | `PAYPAL_PRO_MONTHLY_PLAN_ID` / `PAYPAL_PRO_YEARLY_PLAN_ID` | Plan IDs + `APP_URL` + `PAYPAL_ENV` are env-only. Legacy `PAYPAL_PLAN_ID` still works as the Pro monthly fallback. |
| Premium plan IDs | — (env only) | `PAYPAL_PREMIUM_MONTHLY_PLAN_ID` / `PAYPAL_PREMIUM_YEARLY_PLAN_ID` | Legacy `PAYPAL_PREMIUM_PLAN_ID` still works as the Premium monthly fallback. |

- Four plan IDs (tier × cycle) are selected by pure `billing.planIdFor(tier, cycle, ids)`, so a yearly buyer is charged the yearly plan. `PAYPAL_ENV=sandbox|live` (default `live`, sandbox strictly opt-in) picks the API base URL via `billing.paypalBaseFor(env)`.
- The secret is never logged or echoed. The admin Settings save uses the `keep()` idiom: a blank field keeps the stored secret rather than clearing it.
- No secret is ever in the client bundle or git. `.gitignore` plus the pre-commit content scan catch PayPal-shaped tokens. See [API-SECURITY.md](../security/API-SECURITY.md).

## 6. Revenue accounting (`getStats`)

- The admin Overview shows net revenue = gross − PayPal fees (2.9% + $0.30 per charge, `PAYMENT_FEE_RATE` / `PAYMENT_FEE_FIXED`).
- `billing.computeRevenue` prices an annual payer at `priceYear/12` per month with the yearly charge's fee amortized (reads the persisted `billingCycle`), instead of mispricing them as a monthly payer.
- Break-even reference (from [PRICING.md](PRICING.md)): ~30 Pro or ~7 Premium subscribers cover the ~$160/mo fixed infra.

## 7. Webhook events handled

| Event | Effect |
|---|---|
| `BILLING.SUBSCRIPTION.ACTIVATED` | Set tier from `plan_id`; record `paypalSubscriptionId`. Unknown plan → record sub, leave tier. If the activating sub is a scheduled future-start sub (`resource.id === scheduledNext.subId`), it is deferred — only mark `scheduledNext.approved=true` (the sweep flips to `scheduledNext.tier` at `endDate`). |
| `PAYMENT.SALE.COMPLETED` | Stamp `lastPayment`; restore `tierBeforeFailure` on a recovered account. |
| `BILLING.SUBSCRIPTION.CANCELLED` | Mark cancelled + true `endDate`; sweep flips at period end. |
| `BILLING.SUBSCRIPTION.SUSPENDED` | Mark `paymentFailed` + 7-day grace; sweep drops after grace. |

## 8. Go-live checklist

1. `cd functions && npm install`, then `firebase deploy --only functions`.
2. Create the four PayPal subscription plans (Pro/Premium × monthly/yearly) in the PayPal dashboard; put their plan IDs in `functions/.env` (`PAYPAL_PRO_MONTHLY_PLAN_ID`, `PAYPAL_PRO_YEARLY_PLAN_ID`, `PAYPAL_PREMIUM_MONTHLY_PLAN_ID`, `PAYPAL_PREMIUM_YEARLY_PLAN_ID`; the legacy `PAYPAL_PLAN_ID` / `PAYPAL_PREMIUM_PLAN_ID` serve as the monthly fallbacks). Set `PAYPAL_ENV=sandbox` while testing, `live` (or unset) for production.
3. Set `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` (env or admin Settings) and `APP_URL`.
4. PayPal Dashboard → Webhooks → Add the exact URL the deploy printed — `https://<REGION>-<PROJECT>.cloudfunctions.net/paypalWebhook` (v1 functions are region-prefixed; a region-less URL registers fine and silently receives nothing) — subscribe to `BILLING.SUBSCRIPTION.ACTIVATED`, `.CANCELLED`, `.SUSPENDED`, `PAYMENT.SALE.COMPLETED`. Copy the Webhook ID into `webhookId` (admin) or `PAYPAL_WEBHOOK_ID`. Until it is set, `verifyPayPalWebhook` returns false and every event is rejected with 401 — and because the ID differs between sandbox and live, this is the single most likely go-live failure. Use PayPal's "Send test event" and confirm a doc lands in `webhookEvents` before trusting it.
5. Live end-to-end test: a real sandbox→live subscribe, renew, cancel, and a failed-payment path, confirming the webhook lands and the sweep flips at period end. Also exercise the Premium→Pro downgrade (the eager Premium-cancel timing and the future-start Pro `ACTIVATED` timing) and the Premium re-subscribe.
6. Confirm App Check and abuse gates per [GO-LIVE-AUDIT.md](../product/GO-LIVE-AUDIT.md) before public launch. Keep `paidPlansEnabled` off until go-live.

## 9. `users/{uid}` billing fields (data model)

```text
tier                : "free" | "pro" | "premium"         (server-only write)
billingCycle        : "monthly" | "yearly"
paypalSubscriptionId: string
upgradedAt          : ms
lastPayment         : ms
tierBeforeFailure   : "pro" | "premium"   (for recovery / period-end)
suspendedAt         : ms   (admin suspension; freezes the sweep)
subscription: {
  cancelled, cancelledAt, endDate,        // period-end downgrade
  downgradeTo: "free" | "pro",            // downgrade choice (only Premium may pick "pro")
  paymentFailed, paymentFailedDate,       // 7-day grace
  scheduledNext: {                        // future-start pre-auth (tier-carrying; a legacy
    tier, subId, billing, startDate,      //   scheduledPro is shimmed to tier "pro")
    approved                              //   approved:false until its ACTIVATED webhook proves payment
  },
  cancelPending                           // marker-first breadcrumb: the live sub id still needing
}                                         //   cancellation, written BEFORE the eager cancel; drained by
                                          //   the sweep on a confirmed cancel (null for a re-subscribe)
```

All of the above are server-authoritative — `firestore.rules` forbids the owner from writing them.

## 10. Testing

- **Pure unit** (`tests/unit/billing.test.js`, no emulator) — every branch of `plan→tier`, activation/sale/cancellation patches, the sweep, suspension extension, and revenue math.
- **Integration** (`npm run test:integration`, own emulator) — the callables and rules against a live Firestore emulator.
- **Live PayPal e2e** — the one thing that can only be done against real PayPal; a go-live gate.

## 11. See also

- Code: [`functions/index.js`](../../functions/index.js) (PayPal section), [`functions/billing.js`](../../functions/billing.js), [`functions/guards.js`](../../functions/guards.js)
- Prices & margins: [PRICING.md](PRICING.md)
- Security model: [SECURITY.md](../security/SECURITY.md), [API-SECURITY.md](../security/API-SECURITY.md)
- Product decisions: [PRODUCT-DECISIONS.md](PRODUCT-DECISIONS.md)
- Go-live: [GO-LIVE-AUDIT.md](../product/GO-LIVE-AUDIT.md)
- Docs index: [INDEX.md](../INDEX.md)
