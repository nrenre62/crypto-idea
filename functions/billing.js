/**
 * Pure PayPal-billing decision logic (BL-1b / BL-1f · D6 + ERRORS.md B8) — CommonJS,
 * no firebase imports. index.js wires these into the webhook / callables / the daily
 * sweep; tests/unit/billing.test.js pins every branch without an emulator.
 *
 * The three B8 fixes live here:
 *  - plan_id → tier mapping (a Premium purchase must land as premium, never a
 *    hardcoded "pro");
 *  - cancellation NEVER drops the tier immediately — access continues until the
 *    period ends (the shipped promise), the daily sweep does the flip;
 *  - a lapsed Premium→Pro keeps its subscription marker so the app's R29
 *    re-checkout popup (approve the Pro payment / continue on Starter) decides
 *    the final landing — a paid tier is never granted without a payment.
 */

const GRACE_MS = 7 * 24 * 3600 * 1000;   // U12: payment-failure grace before the drop

// G7 (Plan B): the two PayPal API hosts. Sandbox must be OPT-IN — the default is
// live, so a missing/unknown PAYPAL_ENV can never accidentally point real checkout
// traffic at the sandbox (or vice-versa in the safe direction).
const PAYPAL_LIVE_BASE = "https://api-m.paypal.com";
const PAYPAL_SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

function toMs(v) {
  return typeof v === "number" ? v : (v ? Date.parse(v) : NaN);
}

// Reverse-map a PayPal plan_id → its tier. Accepts BOTH shapes: the H6 four-id set
// ({proMonthly, proYearly, premiumMonthly, premiumYearly}) AND the legacy two-id set
// ({proPlanId, premiumPlanId}), so the webhook maps a Pro-YEARLY activation to "pro"
// just as it did the single monthly id. Empty/missing ids are ignored; unknown → null
// (the caller must then leave tier untouched — never guess).
function planTier(planId, ids) {
  if (!planId || !ids) return null;
  const premium = [ids.premiumPlanId, ids.premiumMonthly, ids.premiumYearly].filter(Boolean);
  const pro = [ids.proPlanId, ids.proMonthly, ids.proYearly].filter(Boolean);
  if (premium.includes(planId)) return "premium";
  if (pro.includes(planId)) return "pro";
  return null;
}

// H6 (Plan B): pick the PayPal plan id for a tier × billing cycle. Fixes the bug where
// a yearly buyer was handed the monthly plan id (a mischarge). Strict: only pro/premium
// and monthly/yearly are valid, and a missing/unconfigured id returns null so the caller
// fails the checkout safely rather than charging the wrong (or no) plan. `ids` is the flat
// four-id set {proMonthly, proYearly, premiumMonthly, premiumYearly}.
function planIdFor(tier, cycle, ids) {
  if (!ids) return null;
  const t = tier === "pro" || tier === "premium" ? tier : null;
  const c = cycle === "monthly" || cycle === "yearly" ? cycle : null;
  if (!t || !c) return null;
  const key = t + (c === "yearly" ? "Yearly" : "Monthly");
  return ids[key] || null;
}

// G7 (Plan B): which PayPal host to talk to. Sandbox ONLY for an explicit "sandbox"
// (case/space tolerant); everything else — unset, "live", junk — defaults to LIVE, so
// the sandbox is strictly opt-in and can never be reached by a misconfigured env.
function paypalBaseFor(env) {
  return String(env || "").trim().toLowerCase() === "sandbox" ? PAYPAL_SANDBOX_BASE : PAYPAL_LIVE_BASE;
}

// BILLING.SUBSCRIPTION.ACTIVATED → user-doc patch. Unknown/missing plan_id →
// tier is left untouched (unknownPlan:true — the caller logs it); everything
// else about the subscription is still recorded.
function activationPatch(resource, ids, nowMs) {
  const tier = planTier(resource && resource.plan_id, ids);
  const patch = { paypalSubscriptionId: (resource && resource.id) || "", upgradedAt: nowMs };
  if (tier) patch.tier = tier;
  return { patch, tier, unknownPlan: !tier };
}

// PAYMENT.SALE.COMPLETED → lastPayment stamp. A sale carries no plan_id, so the
// ONLY tier change here is recovery: a payment landing on an auto-downgraded
// account restores the recorded last paid tier (tierBeforeFailure, U12/S9).
function salePatch(userData, nowMs) {
  const d = userData || {};
  const patch = { lastPayment: nowMs };
  if ((d.tier || "free") === "free" && (d.tierBeforeFailure === "pro" || d.tierBeforeFailure === "premium")) {
    patch.tier = d.tierBeforeFailure;
  }
  return patch;
}

// BILLING.SUBSCRIPTION.CANCELLED / SUSPENDED → marker patch, tier untouched.
// endDate: PayPal's next_billing_time (the true period end) wins, else whatever
// endDate we already knew. The sweep flips the tier when the date passes.
function cancellationPatch(userData, resource, kind, nowMs) {
  const d = userData || {};
  const sub = d.subscription || {};
  const endDate = (resource && resource.billing_info && resource.billing_info.next_billing_time) || sub.endDate || null;
  const patch = {};
  if (d.tier && d.tier !== "free") patch.tierBeforeFailure = d.tier;
  if (kind === "suspended") {
    patch.subscription = { ...sub, paymentFailed: true, paymentFailedDate: nowMs, endDate };
  } else {
    patch.subscription = {
      ...sub, cancelled: true, cancelledAt: nowMs, endDate,
      downgradeTo: sub.downgradeTo === "pro" ? "pro" : "free",   // preserve an R29 choice
    };
  }
  return patch;
}

// The cancelSubscription callable → marker patch (access continues to period end;
// tier is NEVER touched here — B8). Only a premium account may target "pro".
function cancelRequestPatch(userData, downgradeTo, nowMs) {
  const d = userData || {};
  const sub = d.subscription || {};
  const target = downgradeTo === "pro" && d.tier === "premium" ? "pro" : "free";
  return {
    subscription: { ...sub, cancelled: true, cancelledAt: nowMs, downgradeTo: target, endDate: sub.endDate || null },
  };
}

// The daily sweep (enforceSubscriptionPeriods): returns the patch to apply, or null.
//  - cancelled + endDate passed → tier "free". Target "free" clears the marker;
//    target "pro" KEEPS it (the client's R29 re-checkout popup owns the landing —
//    an approved Pro payment arrives as a fresh ACTIVATED webhook).
//  - PR-C2 (future-start Pro pre-auth): a `scheduledPro` marker reaching endDate is
//    the MONEY FLIP. Approved → a clean payment-backed Pro (the live sub id becomes
//    the Pro sub, the marker is cleared). NOT approved by period end → fail-closed to
//    FREE (never grant Pro without a PayPal-confirmed payment).
//  - paymentFailed + 7-day grace elapsed → tier "free", marker cleared
//    (tierBeforeFailure stays on the doc for recovery via salePatch).
function subscriptionSweepPatch(userData, nowMs) {
  const d = userData || {};
  const sub = d.subscription;
  if (!sub) return null;
  // R31-6 freeze: a SUSPENDED account's clock is stopped — the sweep never flips its
  // tier while suspended (un-suspend extends the paid period by the frozen duration).
  if (d.suspendedAt) return null;
  const tier = d.tier || "free";
  if (sub.paymentFailed && sub.paymentFailedDate != null && nowMs - toMs(sub.paymentFailedDate) >= GRACE_MS) {
    if (tier === "free") return null;
    return { tier: "free", subscription: null };
  }
  if (sub.cancelled && sub.endDate && nowMs >= toMs(sub.endDate)) {
    // PR-C2: a real future-start Pro sub was scheduled. This wins over the legacy
    // downgradeTo:"pro" keep-marker branch below.
    const sched = sub.scheduledPro;
    if (sched && sched.subId) {
      if (sched.approved) {
        return { tier: "pro", paypalSubscriptionId: sched.subId, billingCycle: sched.billing || "monthly", subscription: null };
      }
      return { tier: "free", subscription: null };               // fail-closed: no approval → no Pro
    }
    if (sub.downgradeTo === "pro") {
      return tier === "free" ? null : { tier: "free" };          // keep the marker (legacy R29)
    }
    return tier === "free" ? { subscription: null } : { tier: "free", subscription: null };
  }
  return null;
}

// PR-C2 (future-start Pro pre-authorization) — schedule the Pro downgrade. Returns the
// marker patch that records a REAL future-start PayPal Pro subscription as PENDING
// (approved:false — only the scheduled sub's ACTIVATED webhook flips it true). This is a
// SCHEDULE, not a switch: `tier` and the live `paypalSubscriptionId` are left UNTOUCHED
// (stay premium) so no early tier drop can happen — the daily sweep performs the flip at
// endDate. The cancel-at-period-end marker lands on "pro"; endDate == the Pro sub's
// start_time (the premium period end). Preserves prior subscription fields (...prev).
function scheduleProMarkerPatch(userData, scheduled, nowMs) {
  const d = userData || {};
  const sub = d.subscription || {};
  const s = scheduled || {};
  return {
    subscription: {
      ...sub,
      cancelled: true,
      cancelledAt: nowMs,
      downgradeTo: "pro",
      endDate: s.startDate,
      scheduledPro: { subId: s.subId, billing: s.billing, startDate: s.startDate, approved: false },
    },
  };
}

// PR-C2 — the scheduled Pro sub's BILLING.SUBSCRIPTION.ACTIVATED webhook. When the
// activating subscription IS the scheduled Pro sub (resource.id === scheduledPro.subId),
// this is DEFERRED: mark scheduledPro.approved=true (the payment-approval proof) WITHOUT
// flipping tier or overwriting the live sub id — the account stays premium until the sweep
// flips it at endDate — and name the still-running PREMIUM sub for the caller to cancel now
// that the future Pro is approved (so the two never overlap-bill). Fail-closed: a normal
// (non-scheduled) activation, or a doc with no scheduledPro, is NOT deferred and the caller
// runs the usual activationPatch.
function scheduledActivationDecision(userData, resource, nowMs) {
  const d = userData || {};
  const sub = d.subscription || {};
  const sched = sub.scheduledPro;
  const resId = resource && resource.id;
  if (!sched || !sched.subId || resId !== sched.subId) return { deferred: false };
  return {
    deferred: true,
    patch: { subscription: { ...sub, scheduledPro: { ...sched, approved: true } } },
    cancelPremiumSubId: d.paypalSubscriptionId || null,
  };
}

// R31-6: un-suspending an account extends its subscription's endDate by the suspension
// duration (now - suspendedAt), so the user loses none of the paid time they couldn't use
// while frozen. Pure; index.js persists the result. No sub / no endDate → returned as-is.
function extendForSuspension(sub, suspendedAtMs, nowMs) {
  if (!sub || !sub.endDate) return sub || null;
  const susMs = toMs(suspendedAtMs);
  if (!(nowMs > susMs)) return sub;                      // no measurable suspension window
  const frozen = nowMs - susMs;
  return { ...sub, endDate: new Date(toMs(sub.endDate) + frozen).toISOString() };
}

// Revenue with REAL billing cycles (D6): an annual payer contributes priceYear/12
// per month with its single yearly charge's fee amortized — instead of being
// mispriced as a monthly payer. Missing priceYear degrades to the monthly math.
function computeRevenue(payers, plans, feeRate, feeFixed) {
  let grossRevenue = 0, paymentFees = 0;
  for (const p of payers || []) {
    const plan = plans && plans[p.tier];
    if (!plan) continue;
    if (p.cycle === "yearly" && plan.priceYear != null) {
      grossRevenue += plan.priceYear / 12;
      paymentFees += (plan.priceYear * feeRate + feeFixed) / 12;
    } else {
      grossRevenue += plan.price;
      paymentFees += plan.price * feeRate + feeFixed;
    }
  }
  return { grossRevenue, paymentFees, netRevenue: Math.max(0, grossRevenue - paymentFees) };
}

// D6 idempotency: PayPal redelivers events — each event.id is processed once.
function webhookEventKey(event) {
  const id = event && event.id;
  return typeof id === "string" && id.length > 0 && id.length <= 200 ? id : null;
}

// ADMIN-1 (billing-ops visibility): derive the CURRENT subscription status for the
// admin panel from the already-persisted fields — no new storage. Order = most
// urgent first, so a user who both failed a payment AND is cancelled reads as the
// one that needs attention:
//   "past_due" — a payment failed / PayPal SUSPENDED (7-day grace before the drop)
//   "canceled" — the user cancelled; access continues to endDate, then the sweep drops
//   "active"   — a paid tier with no problem marker
//   "none"     — free, no subscription
// PayPal SUSPENDED folds into past_due (the webhook records it as paymentFailed —
// there is no separate persisted "paused" state).
function billingStatusOf(userData) {
  const d = userData || {};
  const sub = d.subscription || null;
  if (sub && sub.paymentFailed) return "past_due";
  if (sub && sub.cancelled) return "canceled";
  if ((d.tier || "free") !== "free") return "active";
  return "none";
}

module.exports = {
  planTier, planIdFor, paypalBaseFor, activationPatch, salePatch, cancellationPatch,
  cancelRequestPatch, subscriptionSweepPatch, extendForSuspension, computeRevenue, webhookEventKey,
  billingStatusOf,
  // PR-C2 (future-start Pro pre-authorization)
  scheduleProMarkerPatch, scheduledActivationDecision,
};
