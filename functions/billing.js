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

function toMs(v) {
  return typeof v === "number" ? v : (v ? Date.parse(v) : NaN);
}

function planTier(planId, { proPlanId, premiumPlanId }) {
  if (planId && premiumPlanId && planId === premiumPlanId) return "premium";
  if (planId && proPlanId && planId === proPlanId) return "pro";
  return null;
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
    if (sub.downgradeTo === "pro") {
      return tier === "free" ? null : { tier: "free" };          // keep the marker
    }
    return tier === "free" ? { subscription: null } : { tier: "free", subscription: null };
  }
  return null;
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

module.exports = {
  planTier, activationPatch, salePatch, cancellationPatch,
  cancelRequestPatch, subscriptionSweepPatch, extendForSuspension, computeRevenue, webhookEventKey,
};
