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
| PayPal plan | — | `PAYPAL_PLAN_ID` | `PAYPAL_PREMIUM_PLAN_ID` |

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
| `paypalWebhook` (HTTP) | `functions/index.js` | The only unauthenticated inbound write; signature-verified + idempotent. |
| `enforceSubscriptionPeriods` (scheduled) | `functions/index.js` | Daily sweep that flips tiers once a period actually ends. |
| `getStats` (admin callable) | `functions/index.js` | Net-revenue reporting (gross − PayPal fees, per billing cycle). |
| **Pure billing decisions** | `functions/billing.js` | All the branch logic (plan→tier, patches, sweep, revenue) — no Firebase, fully unit-tested. |
| Guards | `functions/guards.js` | Per-uid cooldown on `createSubscription` (anti double-charge). |
| Upgrade/downgrade UI | `src/components/Login.jsx`, `src/hooks/useUpgrade.js` | Plan picker, R29 downgrade chooser, period-end re-checkout. |

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
- The daily **`enforceSubscriptionPeriods`** sweep does the *actual* flip once `endDate` passes:
  - target `"free"` → drop to Starter, clear the marker.
  - target `"pro"` (Premium→Pro) → drop to Starter **but keep the marker**, because Pro is a *paid*
    tier that needs a payment: the app's **R29 re-checkout** popup lets the user approve the Pro
    charge (a fresh `ACTIVATED` webhook lands them on Pro) or continue on Starter. A paid tier is
    **never** granted without a payment.

### 3.4 Payment failure
- A failed charge fires **`BILLING.SUBSCRIPTION.SUSPENDED`** → marks `paymentFailed` + a **7-day
  grace** (`paymentFailedDate`). If a payment recovers within the window, `PAYMENT.SALE.COMPLETED`
  restores the tier. Otherwise the sweep drops to Starter after 7 days.

### 3.5 Admin suspension freeze (R31-6)
- An admin-suspended account's subscription **clock is frozen**: the sweep never flips a suspended
  user, and un-suspending **extends `endDate` by the frozen duration** (`billing.extendForSuspension`)
  so the user loses none of the paid time they couldn't use.

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
`https://api-m.paypal.com`; redirects use `https://<app>.web.app`. The **only** `http://` anywhere
is the **local Firebase emulator** (`http://localhost:5001/...` in `openapi.json`) — it serves on
localhost only, is never exposed to the network, and needs no TLS. It is not a production surface.

---

## 5. Secrets & configuration

PayPal needs five values. **Primary source = the locked `config/app` Firestore doc** (set from the
Admin dashboard → Settings; the server reads it in `getPayPalToken` / `verifyPayPalWebhook`).
**Fallback = environment variables** (`functions/.env`, git-ignored, or the deploy env).

| Value | `config/app.paypal.*` (admin) | Env fallback | Notes |
|---|---|---|---|
| Client ID | `clientId` | `PAYPAL_CLIENT_ID` | Public-ish, but kept server-side. |
| Secret | `secret` (write-only; `keep()` idiom) | `PAYPAL_SECRET` | **Never** returned to a client (`getAdminConfig` exposes only `secretSet: true/false`). |
| Webhook ID | `webhookId` | `PAYPAL_WEBHOOK_ID` | Required — verification fails closed without it. |
| Pro plan ID | — (env only) | `PAYPAL_PLAN_ID` | Plan IDs + `APP_URL` are **env-only**, not in the config doc. |
| Premium plan ID | — (env only) | `PAYPAL_PREMIUM_PLAN_ID` | |

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
| `BILLING.SUBSCRIPTION.ACTIVATED` | Set tier from `plan_id`; record `paypalSubscriptionId`. Unknown plan → record sub, leave tier. |
| `PAYMENT.SALE.COMPLETED` | Stamp `lastPayment`; restore `tierBeforeFailure` on a recovered account. |
| `BILLING.SUBSCRIPTION.CANCELLED` | Mark cancelled + true `endDate`; sweep flips at period end. |
| `BILLING.SUBSCRIPTION.SUSPENDED` | Mark `paymentFailed` + 7-day grace; sweep drops after grace. |

---

## 8. Go-live checklist

1. `cd functions && npm install`, then `firebase deploy --only functions`.
2. Create the PayPal **subscription plans** in the PayPal dashboard; put their plan IDs in
   `functions/.env` (`PAYPAL_PLAN_ID`, `PAYPAL_PREMIUM_PLAN_ID`).
   > ⚠️ **Known gap (audit H6, not yet fixed):** the UI sells monthly **and** yearly, but
   > `createSubscription` never consults the billing cycle — there are only two plan IDs, so an
   > annual buyer is sent to the MONTHLY plan while revenue is booked as `priceYear/12`.
   > Launching paid tiers requires **four** plans + selecting by tier *and* cycle. See
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
   failed-payment path, confirming the webhook lands and the sweep flips at period end.
6. Confirm `App Check` / abuse gates per [BACKEND-ADMIN-DECISIONS.md](BACKEND-ADMIN-DECISIONS.md)
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
  paymentFailed, paymentFailedDate        // 7-day grace
}
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
