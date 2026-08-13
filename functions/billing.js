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
//  - PR-C2 / C3b-server (future-start pre-auth): a tier-carrying `scheduledNext` marker
//    (a legacy `scheduledPro` is shimmed to tier "pro") reaching endDate is the MONEY FLIP.
//    Approved → a clean payment-backed flip to scheduledNext.tier (pro OR a seamless premium
//    re-subscribe; the live sub id becomes the scheduled sub, the marker is cleared). NOT
//    approved by period end → fail-closed to FREE (never grant a paid tier without a
//    PayPal-confirmed payment).
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
    // PR-C2/C3b-server: a real future-start sub was scheduled. This wins over the legacy
    // downgradeTo:"pro" keep-marker branch below. The marker is now the tier-carrying
    // `scheduledNext`; a legacy `scheduledPro` (no scheduledNext) is shimmed to tier "pro"
    // so an in-flight legacy marker still resolves (zero prod markers, but never strand one).
    const sched = sub.scheduledNext || (sub.scheduledPro ? { ...sub.scheduledPro, tier: "pro" } : null);
    if (sched && sched.subId) {
      if (sched.approved) {
        return { tier: sched.tier, paypalSubscriptionId: sched.subId, billingCycle: sched.billing || "monthly", subscription: null };
      }
      return { tier: "free", subscription: null };               // fail-closed: no approval → no paid tier
    }
    if (sub.downgradeTo === "pro") {
      return tier === "free" ? null : { tier: "free" };          // keep the marker (legacy R29)
    }
    return tier === "free" ? { subscription: null } : { tier: "free", subscription: null };
  }
  return null;
}

// PR-C2 / C3b-server (future-start pre-authorization) — schedule the future-start sub. Returns
// the marker patch that records a REAL future-start PayPal subscription as PENDING (approved:false
// — only the scheduled sub's ACTIVATED webhook flips it true). This is a SCHEDULE, not a switch:
// `tier` and the live `paypalSubscriptionId` are left UNTOUCHED (stay premium) so no early tier
// drop can happen — the daily sweep performs the flip at endDate. The marker is TIER-CARRYING
// (`scheduledNext.tier`), so ONE engine backs both scheduleProDowngrade (tier "pro") and
// resubscribePremium (tier "premium"); endDate == the scheduled sub's start_time (the current
// period end). Preserves prior subscription fields (...prev).
//
// `downgradeTo` is fail-closed: the sweep reads `scheduledNext` FIRST (it's authoritative), so
// this legacy field only matters as a fallback if the schedule is ever stripped. A Pro downgrade
// keeps "pro" (scheduleProDowngrade's unchanged contract + the legacy R29 keep-marker branch),
// and a re-subscribe (or any non-pro target) falls closed to "free" — never grant a paid tier
// without an approved schedule.
function scheduleNextMarkerPatch(userData, scheduled, nowMs) {
  const d = userData || {};
  const sub = d.subscription || {};
  const s = scheduled || {};
  return {
    subscription: {
      ...sub,
      cancelled: true,
      cancelledAt: nowMs,
      downgradeTo: s.tier === "pro" ? "pro" : "free",
      endDate: s.startDate,
      scheduledNext: { tier: s.tier, subId: s.subId, billing: s.billing, startDate: s.startDate, approved: false },
      // PR-C3a recovery breadcrumb: the live sub id still needing cancellation. Written into the
      // marker BEFORE the irreversible cancel so a crash between the two never strands a premium
      // account with no billing marker (Finding #3). The reconcile-drain in the daily sweep
      // finishes any un-cleared cancel. null in DEV, and null for a re-subscribe (the Premium sub
      // was already terminally cancelled by an earlier "Keep my plan").
      cancelPending: s.cancelSubId || null,
    },
  };
}

// PR-C3a recovery breadcrumb (read): the Premium sub id that a marker-first schedule wrote
// BEFORE the irreversible Premium cancel and has not yet drained. null-safe → the daily sweep
// only drains a cancel when this returns a truthy id. The breadcrumb is CLEARED with a targeted
// Firestore sentinel delete (`update({"subscription.cancelPending": FieldValue.delete()})`) at the
// two PROD drain sites in index.js — a whole-map rewrite helper was retired as clobber-unsafe.
function pendingCancelSubId(userData) {
  return (userData && userData.subscription && userData.subscription.cancelPending) || null;
}

// PR-C2 / C3b-server — the scheduled sub's BILLING.SUBSCRIPTION.ACTIVATED webhook. When the
// activating subscription IS the scheduled sub (resource.id === scheduledNext.subId), this is
// DEFERRED: mark scheduledNext.approved=true (the payment-approval proof) WITHOUT flipping tier
// or overwriting the live sub id — the account stays premium until the sweep flips it at endDate.
// The scheduled tier (pro OR premium) is carried through untouched. Fail-closed: a normal
// (non-scheduled) activation, or a doc with no scheduledNext, is NOT deferred and the caller runs
// the usual activationPatch. (No back-compat shim needed — prod has zero legacy markers.)
//
// PR-C2 SECURITY FIX (eager-cancel): the Premium PayPal sub is cancelled at SCHEDULE time
// now (scheduleProDowngrade, CHECKED), so this webhook decision NO LONGER carries a
// `cancelPremiumSubId` — a lazy best-effort cancel here was the double-charge / bill-forever
// window. Return only { deferred, patch }.
function scheduledActivationDecision(userData, resource, nowMs) {
  const d = userData || {};
  const sub = d.subscription || {};
  const sched = sub.scheduledNext;
  const resId = resource && resource.id;
  if (!sched || !sched.subId || resId !== sched.subId) return { deferred: false };
  return {
    deferred: true,
    patch: { subscription: { ...sub, scheduledNext: { ...sched, approved: true } } },
  };
}

// PR-C2 SECURITY FIX — "Keep my plan" (the reactivateSubscription callable), fail-closed in
// BOTH branches: it must NEVER produce `cancelled:false`. EVERY pending cancellation in this
// app already has a terminally-cancelled PayPal sub — cancelSubscription POSTs /cancel before
// marking, scheduleProDowngrade eager-cancels the Premium sub, and a CANCELLED webhook only
// fires because PayPal cancelled — so un-cancelling to `cancelled:false` would leave a paid
// tier with NO live sub, and subscriptionSweepPatch (which drops only when cancelled:true)
// would never downgrade = free Premium forever (the [HIGH] paywall-bypass bug). Two paths:
//   • scheduledNext present (a legacy scheduledPro still resolves) → cancel-to-FREE marker: keep
//     `cancelled:true` (the sweep still drops them at endDate), target "free", DROP the schedule
//     from the marker, and hand back its subId so the caller cancels the future sub at PayPal.
//     `tier` is NOT set — paid access continues to endDate; the sweep flips it. NEVER `cancelled:false`.
//   • legacy / any other cancelled marker (no scheduled sub) → re-affirm the cancellation
//     (a no-op keep of `cancelled:true`) so the daily sweep still drops at endDate; the client
//     routes the user to re-subscribe. Nothing to cancel at PayPal. NEVER `cancelled:false`.
function keepPlanPatch(userData, nowMs) {
  const d = userData || {};
  const sub = d.subscription || {};
  // Only ever act on an ALREADY-CANCELLED marker. Invoked on a healthy, non-cancelled sub
  // (the raw-callable path — the UI only shows "Keep my plan" on a cancelled marker) it is a
  // NO-OP: never mark a live sub cancelled:true, which would drop the user to free at endDate
  // while PayPal keeps charging.
  if (!sub.cancelled) return { patch: {}, cancelProSubId: null };
  // C3b-server: read the tier-carrying `scheduledNext`; a legacy `scheduledPro` still resolves.
  const sched = sub.scheduledNext || sub.scheduledPro;
  if (sched && sched.subId) {
    const cancelProSubId = sched.subId;
    // Strip BOTH the new and legacy schedule fields; `...prev` PRESERVES cancelPending (the C3a
    // breadcrumb) so the daily reconcile-drain still finishes the live-sub cancel (fail-closed).
    const { scheduledNext, scheduledPro, ...prev } = sub;
    return {
      patch: {
        subscription: {
          ...prev,
          cancelled: true,             // fail-closed: never a premium-forever un-cancel
          cancelledAt: nowMs,
          downgradeTo: "free",
          endDate: prev.endDate || null,
        },
      },
      cancelProSubId,
    };
  }
  // Legacy / any other cancelled marker (no scheduled sub) → FAIL-CLOSED. The un-cancel branch
  // is deleted: re-affirm the existing marker (cancelled STAYS true) so the sweep still drops
  // the account to free at endDate. Nothing to cancel at PayPal.
  return { patch: { subscription: { ...sub, cancelled: true } }, cancelProSubId: null };
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
  // PR-C2 (future-start pre-authorization) → C3b-server: the tier-carrying marker builder
  scheduleNextMarkerPatch, scheduledActivationDecision,
  // PR-C2 SECURITY FIX (eager-cancel Premium; fail-closed "Keep my plan")
  keepPlanPatch,
  // PR-C3a (marker-first reconciliation) — the cancelPending recovery breadcrumb (read only;
  // the clear is a targeted Firestore FieldValue.delete() at the drain sites, no pure helper).
  pendingCancelSubId,
};
