import { describe, it, expect } from "vitest";
import {
  planTier, planIdFor, paypalBaseFor, activationPatch, salePatch, cancellationPatch,
  cancelRequestPatch, subscriptionSweepPatch, extendForSuspension, computeRevenue, webhookEventKey,
  billingStatusOf,
  // Plan B PR-C2 (future-start pre-authorization) → generalized by PR-C3b-server: the marker
  // builder is RENAMED to the tier-carrying `scheduleNextMarkerPatch` (one marker, scheduledNext
  // {tier,…}) so ONE engine backs both scheduleProDowngrade (tier "pro") and the new
  // resubscribePremium (tier "premium"). `scheduledActivationDecision` reads scheduledNext too.
  scheduleNextMarkerPatch, scheduledActivationDecision,
  // Plan B PR-C2 SECURITY FIX (eager-cancel Premium on Pro downgrade) — `keepPlanPatch` is the
  // NEW pure "Keep my plan" decision the fix introduces.
  keepPlanPatch,
  // Plan B PR-C3a (marker-first reconciliation) — the cancelPending breadcrumb reader. The
  // clear-helper was retired: the breadcrumb is now dropped with a targeted Firestore
  // FieldValue.delete() at the drain sites (clobber-safe), not a whole-map rewrite helper.
  pendingCancelSubId,
} from "../../functions/billing.js";

// BL-1b/BL-1f (D6 + ERRORS.md B8): the PayPal webhook / cancellation / revenue
// decisions are pure and dependency-injected — unit-tested here without emulators.
const IDS = { proPlanId: "P-PRO", premiumPlanId: "P-PREM" };
// Plan B / H6: the four plan ids (pro/premium × monthly/yearly).
const IDS4 = { proMonthly: "P-PRO-M", proYearly: "P-PRO-Y", premiumMonthly: "P-PREM-M", premiumYearly: "P-PREM-Y" };

describe("billing.planTier (B8: plan_id → tier mapping)", () => {
  it("maps each configured plan id to its tier", () => {
    expect(planTier("P-PRO", IDS)).toBe("pro");
    expect(planTier("P-PREM", IDS)).toBe("premium");
  });
  it("returns null for unknown/missing ids (caller must NOT change tier)", () => {
    expect(planTier("P-OTHER", IDS)).toBeNull();
    expect(planTier(undefined, IDS)).toBeNull();
    expect(planTier("P-PRO", { proPlanId: "", premiumPlanId: "" })).toBeNull();
  });
});

describe("billing.planIdFor (H6: pick the plan id by tier × billing cycle)", () => {
  it("selects the right plan id for each of the four tier×cycle combinations", () => {
    expect(planIdFor("pro", "monthly", IDS4)).toBe("P-PRO-M");
    expect(planIdFor("pro", "yearly", IDS4)).toBe("P-PRO-Y");
    expect(planIdFor("premium", "monthly", IDS4)).toBe("P-PREM-M");
    expect(planIdFor("premium", "yearly", IDS4)).toBe("P-PREM-Y");
  });
  it("the H6 fix: a yearly buyer is NEVER handed the monthly plan id (the mischarge bug)", () => {
    expect(planIdFor("pro", "yearly", IDS4)).not.toBe(IDS4.proMonthly);
    expect(planIdFor("premium", "yearly", IDS4)).not.toBe(IDS4.premiumMonthly);
  });
  it("returns null for an unknown tier or cycle — the caller must NOT charge", () => {
    expect(planIdFor("vip", "monthly", IDS4)).toBeNull();
    expect(planIdFor("pro", "weekly", IDS4)).toBeNull();
    expect(planIdFor(undefined, undefined, IDS4)).toBeNull();
  });
  it("returns null when the matched id is missing/unconfigured (fail safe, no bad checkout)", () => {
    expect(planIdFor("pro", "yearly", { proMonthly: "P-PRO-M" })).toBeNull();
    expect(planIdFor("premium", "monthly", {})).toBeNull();
    expect(planIdFor("pro", "monthly", null)).toBeNull();
  });
});

describe("billing.planTier (H6: reverse-map ALL FOUR plan ids back to a tier)", () => {
  it("maps a yearly OR monthly plan id back to its tier (webhook activation)", () => {
    expect(planTier("P-PRO-M", IDS4)).toBe("pro");
    expect(planTier("P-PRO-Y", IDS4)).toBe("pro");
    expect(planTier("P-PREM-M", IDS4)).toBe("premium");
    expect(planTier("P-PREM-Y", IDS4)).toBe("premium");
  });
  it("still supports the legacy 2-id shape (proPlanId/premiumPlanId)", () => {
    expect(planTier("P-PRO", IDS)).toBe("pro");
    expect(planTier("P-PREM", IDS)).toBe("premium");
  });
  it("an unknown id → null (the webhook leaves tier untouched)", () => {
    expect(planTier("P-NOPE", IDS4)).toBeNull();
  });
});

describe("billing.paypalBaseFor (G7: sandbox ↔ live PayPal base URL)", () => {
  it("returns the SANDBOX host only for an explicit 'sandbox' env (case/space tolerant)", () => {
    expect(paypalBaseFor("sandbox")).toBe("https://api-m.sandbox.paypal.com");
    expect(paypalBaseFor("SANDBOX")).toBe("https://api-m.sandbox.paypal.com");
    expect(paypalBaseFor(" sandbox ")).toBe("https://api-m.sandbox.paypal.com");
  });
  it("defaults to LIVE for anything else (unset, 'live', junk) — sandbox must be opt-in", () => {
    expect(paypalBaseFor("live")).toBe("https://api-m.paypal.com");
    expect(paypalBaseFor(undefined)).toBe("https://api-m.paypal.com");
    expect(paypalBaseFor("")).toBe("https://api-m.paypal.com");
    expect(paypalBaseFor("prod")).toBe("https://api-m.paypal.com");
  });
});

describe("billing.activationPatch (ACTIVATED webhook)", () => {
  it("a PREMIUM purchase lands as premium — the B8 fix (was hardcoded 'pro')", () => {
    const { patch, unknownPlan } = activationPatch({ id: "sub1", plan_id: "P-PREM", custom_id: "u1" }, IDS, 1000);
    expect(patch.tier).toBe("premium");
    expect(patch.paypalSubscriptionId).toBe("sub1");
    expect(patch.upgradedAt).toBe(1000);
    expect(unknownPlan).toBe(false);
  });
  it("a pro purchase lands as pro", () => {
    expect(activationPatch({ id: "s", plan_id: "P-PRO" }, IDS, 1).patch.tier).toBe("pro");
  });
  it("an unknown plan_id leaves tier UNTOUCHED and flags it", () => {
    const { patch, unknownPlan } = activationPatch({ id: "s", plan_id: "P-???" }, IDS, 1);
    expect(unknownPlan).toBe(true);
    expect("tier" in patch).toBe(false);
  });
});

describe("billing.salePatch (PAYMENT.SALE.COMPLETED)", () => {
  it("stamps lastPayment without touching a healthy paid tier", () => {
    const p = salePatch({ tier: "premium" }, 2000);
    expect(p.lastPayment).toBe(2000);
    expect("tier" in p).toBe(false); // no blind tier:"pro" write (B8)
  });
  it("restores the recorded last paid tier when a payment lands on an auto-downgraded account", () => {
    expect(salePatch({ tier: "free", tierBeforeFailure: "premium" }, 1).tier).toBe("premium");
    expect(salePatch({ tier: "free", tierBeforeFailure: "pro" }, 1).tier).toBe("pro");
  });
  it("never invents a tier for a genuinely free account", () => {
    expect("tier" in salePatch({ tier: "free" }, 1)).toBe(false);
    expect("tier" in salePatch({}, 1)).toBe(false);
  });
});

describe("billing.cancellationPatch (CANCELLED / SUSPENDED — access until period end)", () => {
  it("CANCELLED marks the subscription, records tierBeforeFailure, and does NOT drop tier", () => {
    const p = cancellationPatch({ tier: "premium", subscription: { endDate: "2026-08-01" } },
      { billing_info: { next_billing_time: "2026-08-03T00:00:00Z" } }, "cancelled", 5000);
    expect("tier" in p).toBe(false);                       // the B8 fix: no immediate free
    expect(p.tierBeforeFailure).toBe("premium");
    expect(p.subscription.cancelled).toBe(true);
    expect(p.subscription.downgradeTo).toBe("free");       // default target
    expect(p.subscription.endDate).toBe("2026-08-03T00:00:00Z"); // PayPal's period end wins
    expect(p.subscription.cancelledAt).toBe(5000);
  });
  it("preserves an existing R29 'pro' downgrade choice", () => {
    const p = cancellationPatch({ tier: "premium", subscription: { downgradeTo: "pro", endDate: "2026-08-01" } }, {}, "cancelled", 1);
    expect(p.subscription.downgradeTo).toBe("pro");
    expect(p.subscription.endDate).toBe("2026-08-01");     // falls back to the known endDate
  });
  it("SUSPENDED marks a payment failure (grace handled by the sweep), tier untouched", () => {
    const p = cancellationPatch({ tier: "pro" }, {}, "suspended", 7000);
    expect("tier" in p).toBe(false);
    expect(p.subscription.paymentFailed).toBe(true);
    expect(p.subscription.paymentFailedDate).toBe(7000);
    expect(p.tierBeforeFailure).toBe("pro");
  });
});

describe("billing.cancelRequestPatch (the cancelSubscription callable)", () => {
  it("premium may target pro; the tier field is never touched here", () => {
    const p = cancelRequestPatch({ tier: "premium", subscription: { endDate: "2026-08-01" } }, "pro", 100);
    expect(p.subscription.downgradeTo).toBe("pro");
    expect(p.subscription.cancelled).toBe(true);
    expect(p.subscription.endDate).toBe("2026-08-01");
    expect("tier" in p).toBe(false);
  });
  it("a non-premium 'pro' request and any junk target coerce to free", () => {
    expect(cancelRequestPatch({ tier: "pro" }, "pro", 1).subscription.downgradeTo).toBe("free");
    expect(cancelRequestPatch({ tier: "premium" }, "banana", 1).subscription.downgradeTo).toBe("free");
  });
});

describe("billing.subscriptionSweepPatch (the daily server-side period-end flip)", () => {
  const DAY = 24 * 3600 * 1000;
  it("does nothing before the end date or without a subscription", () => {
    expect(subscriptionSweepPatch({ tier: "premium", subscription: { cancelled: true, endDate: "2099-01-01" } }, Date.parse("2026-07-03"))).toBeNull();
    expect(subscriptionSweepPatch({ tier: "pro" }, 1)).toBeNull();
  });
  it("a lapsed Starter-target flips to free and clears the marker", () => {
    const p = subscriptionSweepPatch({ tier: "pro", subscription: { cancelled: true, downgradeTo: "free", endDate: "2026-06-01" } }, Date.parse("2026-07-03"));
    expect(p).toEqual({ tier: "free", subscription: null });
  });
  it("a lapsed PRO-target flips to free but KEEPS the marker (the R29 re-checkout decides)", () => {
    const p = subscriptionSweepPatch({ tier: "premium", subscription: { cancelled: true, downgradeTo: "pro", endDate: "2026-06-01" } }, Date.parse("2026-07-03"));
    expect(p).toEqual({ tier: "free" });
  });
  it("is idempotent — an already-flipped pro-target account is left alone", () => {
    expect(subscriptionSweepPatch({ tier: "free", subscription: { cancelled: true, downgradeTo: "pro", endDate: "2026-06-01" } }, Date.parse("2026-07-03"))).toBeNull();
  });
  it("payment failure drops to free only after the 7-day grace", () => {
    const failedAt = Date.parse("2026-07-01T00:00:00Z");
    const sub = { paymentFailed: true, paymentFailedDate: failedAt };
    expect(subscriptionSweepPatch({ tier: "pro", subscription: sub }, failedAt + 6 * DAY)).toBeNull();
    expect(subscriptionSweepPatch({ tier: "pro", subscription: sub }, failedAt + 8 * DAY)).toEqual({ tier: "free", subscription: null });
  });
  it("R31-6: a SUSPENDED account's clock is frozen — the sweep never flips it", () => {
    // Even a long-past endDate is not flipped while suspendedAt is set.
    expect(subscriptionSweepPatch(
      { tier: "premium", suspendedAt: Date.parse("2026-06-15"), subscription: { cancelled: true, downgradeTo: "free", endDate: "2026-06-01" } },
      Date.parse("2026-07-03"))).toBeNull();
  });
});

describe("billing.extendForSuspension (R31-6: freeze the paid clock)", () => {
  const DAY = 24 * 3600 * 1000;
  it("extends endDate by the suspension duration", () => {
    const sub = { cancelled: true, endDate: "2026-07-31T00:00:00.000Z" };
    const suspendedAt = Date.parse("2026-07-01T00:00:00Z");
    const now = suspendedAt + 10 * DAY;               // suspended for 10 days
    const out = extendForSuspension(sub, suspendedAt, now);
    expect(Date.parse(out.endDate)).toBe(Date.parse(sub.endDate) + 10 * DAY);
    expect(out.cancelled).toBe(true);                 // other fields preserved
  });
  it("is a no-op with no sub, no endDate, or a zero-length window", () => {
    expect(extendForSuspension(null, 1, 2)).toBeNull();
    const noEnd = { cancelled: true };
    expect(extendForSuspension(noEnd, 1, 2)).toBe(noEnd);
    const sub = { endDate: "2026-07-31T00:00:00.000Z" };
    expect(extendForSuspension(sub, 100, 100)).toBe(sub);   // now == suspendedAt → unchanged
  });
});

describe("billing.computeRevenue (D6: real billing cycles)", () => {
  const PLANS = { pro: { price: 10, priceYear: 96 }, premium: { price: 50, priceYear: 480 } };
  it("prices an annual payer at priceYear/12 with amortized fees (not the monthly price)", () => {
    const r = computeRevenue([{ tier: "pro", cycle: "yearly" }], PLANS, 0.029, 0.30);
    expect(r.grossRevenue).toBeCloseTo(8);                        // 96/12 — not 10
    expect(r.paymentFees).toBeCloseTo((96 * 0.029 + 0.30) / 12);  // one yearly charge /12
  });
  it("monthly payers keep the current per-charge math; mixed lists add up", () => {
    const r = computeRevenue([{ tier: "pro", cycle: "monthly" }, { tier: "premium", cycle: "yearly" }], PLANS, 0.029, 0.30);
    expect(r.grossRevenue).toBeCloseTo(10 + 40);
    expect(r.netRevenue).toBeCloseTo(r.grossRevenue - r.paymentFees);
  });
  it("unknown cycles/plans degrade safely (monthly / skipped)", () => {
    expect(computeRevenue([{ tier: "pro", cycle: "?" }], PLANS, 0, 0).grossRevenue).toBe(10);
    expect(computeRevenue([{ tier: "vip" }], PLANS, 0, 0).grossRevenue).toBe(0);
  });
});

describe("billing.webhookEventKey (D6 idempotency key)", () => {
  it("returns the event id, rejecting junk shapes", () => {
    expect(webhookEventKey({ id: "WH-1" })).toBe("WH-1");
    expect(webhookEventKey({})).toBeNull();
    expect(webhookEventKey({ id: 42 })).toBeNull();
    expect(webhookEventKey({ id: "x".repeat(201) })).toBeNull();
  });
});

describe("billing.billingStatusOf (ADMIN-1: derive status from persisted fields)", () => {
  it("a paid tier with no marker is 'active'", () => {
    expect(billingStatusOf({ tier: "pro" })).toBe("active");
    expect(billingStatusOf({ tier: "premium", subscription: {} })).toBe("active");
  });
  it("free with no subscription is 'none'", () => {
    expect(billingStatusOf({ tier: "free" })).toBe("none");
    expect(billingStatusOf({})).toBe("none");            // missing tier defaults to free
    expect(billingStatusOf(null)).toBe("none");
  });
  it("a cancelled marker is 'canceled' even while access continues (tier still paid)", () => {
    expect(billingStatusOf({ tier: "premium", subscription: { cancelled: true, endDate: "2099-01-01" } })).toBe("canceled");
  });
  it("a cancelled marker kept on a swept-to-free account (R29 re-checkout pending) still reads 'canceled'", () => {
    expect(billingStatusOf({ tier: "free", subscription: { cancelled: true, downgradeTo: "pro" } })).toBe("canceled");
  });
  it("a failed payment (or PayPal SUSPENDED) is 'past_due' — and OUTRANKS cancelled (most urgent first)", () => {
    expect(billingStatusOf({ tier: "pro", subscription: { paymentFailed: true } })).toBe("past_due");
    expect(billingStatusOf({ tier: "premium", subscription: { paymentFailed: true, cancelled: true } })).toBe("past_due");
  });
});

// ══════════════════════════════════════════════════════════════════════════════════
// Plan B PR-C2 — real future-start Pro pre-authorization (founder-approved at G2, Option C)
//
// When a Premium user downgrades to Pro, the server schedules a REAL future-start PayPal
// Pro subscription that first-charges when Premium ends, so the account lands directly on
// Pro with a real payment (replacing PR-C1's honest period-end re-checkout interim). It is
// server-authoritative and fail-closed: never early-drops Premium, never grants the next tier
// without PayPal-confirmed approval, never double-charges. PR-C3b-server generalizes the marker
// to carry a TARGET TIER — the server-written shape (RENAMED scheduledPro → scheduledNext):
//   subscription: { ...prev, cancelled:true, cancelledAt, downgradeTo:"pro",
//                   endDate:<current period end ISO == the next sub start_time>,
//                   scheduledNext:{ tier, subId, billing, startDate:<ISO == endDate>, approved } }
// During the window `tier` stays "premium" and `paypalSubscriptionId` stays the PREMIUM id;
// scheduledNext.approved is flipped true ONLY by the scheduled sub's ACTIVATED webhook.
// These pure decisions are unit-testable with no emulator, exactly like the rest of billing.js.
// ══════════════════════════════════════════════════════════════════════════════════

describe("billing.scheduleNextMarkerPatch (PR-C2/C3b-server: schedule the future-start sub — PENDING, tier-carrying)", () => {
  const premium = () => ({
    tier: "premium", paypalSubscriptionId: "I-PREM",
    subscription: { billing: "monthly", startDate: "2026-05-01", endDate: "2026-09-01T00:00:00.000Z", cancelled: false },
  });
  // Eager-cancel regression guard: the marker's endDate == the scheduled sub's start_time is the
  // structural handoff — the live sub is cancelled at schedule time, the next sub first-charges
  // exactly at endDate, so there is no overlap window to double-charge.
  it("C3b-server: a PRO schedule stamps a pending scheduledNext marker carrying tier:'pro' (approved:false), start == the period end", () => {
    const p = scheduleNextMarkerPatch(premium(),
      { tier: "pro", subId: "I-PRO", billing: "yearly", startDate: "2026-09-01T00:00:00.000Z" }, 5000);
    expect(p.subscription.scheduledNext).toEqual({
      tier: "pro", subId: "I-PRO", billing: "yearly", startDate: "2026-09-01T00:00:00.000Z", approved: false,
    });
    // the cancel-at-period-end marker; endDate == the scheduled sub's start_time
    expect(p.subscription.cancelled).toBe(true);
    expect(p.subscription.cancelledAt).toBe(5000);
    expect(p.subscription.downgradeTo).toBe("pro");        // scheduleProDowngrade's contract is unchanged
    expect(p.subscription.endDate).toBe("2026-09-01T00:00:00.000Z");
    // the OLD single-tier field is gone: one tier-carrying marker, no scheduledPro on a new write
    expect(p.subscription.scheduledPro).toBeUndefined();
  });
  it("C3b-server: a PREMIUM re-subscribe schedule carries tier:'premium' (approved:false) — the SAME engine, a different target", () => {
    const p = scheduleNextMarkerPatch(premium(),
      { tier: "premium", subId: "I-PREM2", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z" }, 5000);
    expect(p.subscription.scheduledNext.tier).toBe("premium");
    expect(p.subscription.scheduledNext.subId).toBe("I-PREM2");
    expect(p.subscription.scheduledNext.approved).toBe(false);
    expect(p.subscription.cancelled).toBe(true);
    expect(p.subscription.endDate).toBe("2026-09-01T00:00:00.000Z");
    expect(p.subscription.scheduledPro).toBeUndefined();
  });
  it("leaves `tier` and the LIVE `paypalSubscriptionId` untouched (a schedule, not a switch)", () => {
    const p = scheduleNextMarkerPatch(premium(),
      { tier: "pro", subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z" }, 1);
    expect("tier" in p).toBe(false);                       // tier untouched → stays premium
    expect("paypalSubscriptionId" in p).toBe(false);       // still the premium sub id until the sweep
  });
  it("preserves the prior subscription fields (spread ...prev)", () => {
    const p = scheduleNextMarkerPatch(premium(),
      { tier: "pro", subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z" }, 1);
    expect(p.subscription.billing).toBe("monthly");
    expect(p.subscription.startDate).toBe("2026-05-01");
  });
});

describe("billing.scheduledActivationDecision (PR-C2/C3b-server: the scheduled sub's ACTIVATED webhook, tier-carrying)", () => {
  const scheduled = (tier = "pro") => ({
    tier: "premium", paypalSubscriptionId: "I-PREM",
    subscription: {
      cancelled: true, cancelledAt: 100, downgradeTo: "pro", endDate: "2026-09-01T00:00:00.000Z",
      scheduledNext: { tier, subId: "I-NEXT", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z", approved: false },
    },
  });
  it("C3b-server: the scheduled sub approving → deferred (marks scheduledNext.approved, keeps the marker, no tier/live-id flip) and names NO Premium sub to cancel (eager-cancel left the webhook)", () => {
    const d = scheduledActivationDecision(scheduled("pro"), { id: "I-NEXT", plan_id: "P-PRO-M" }, 9000);
    expect(d.deferred).toBe(true);
    // the payment-approval proof: scheduledNext.approved becomes true, the marker preserved
    expect(d.patch.subscription.scheduledNext.approved).toBe(true);
    expect(d.patch.subscription.cancelled).toBe(true);
    expect(d.patch.subscription.downgradeTo).toBe("pro");
    expect(d.patch.subscription.endDate).toBe("2026-09-01T00:00:00.000Z");
    // NOT yet on the new tier: tier must not flip, and the live sub id must not become the scheduled id
    expect(d.patch.tier).not.toBe("pro");
    expect(d.patch.paypalSubscriptionId).not.toBe("I-NEXT");
    // SECURITY FIX (eager-cancel): the Premium PayPal sub is cancelled at SCHEDULE time now — a
    // LAZY cancel here was the [MED] double-charge / bill-forever window, so the webhook decision
    // must NOT carry a Premium sub id to cancel.
    expect("cancelPremiumSubId" in d).toBe(false);
  });
  it("C3b-server: a PREMIUM re-subscribe's scheduled sub approving is also deferred on scheduledNext (tier carried through)", () => {
    const d = scheduledActivationDecision(scheduled("premium"), { id: "I-NEXT", plan_id: "P-PREM-M" }, 9000);
    expect(d.deferred).toBe(true);
    expect(d.patch.subscription.scheduledNext.tier).toBe("premium");
    expect(d.patch.subscription.scheduledNext.approved).toBe(true);
    // still NOT flipped — the patch touches only the marker; the sweep does the flip at endDate
    expect("tier" in d.patch).toBe(false);
  });
  it("a normal (non-scheduled) activation → not deferred (the caller runs the usual activationPatch)", () => {
    expect(scheduledActivationDecision(scheduled(), { id: "I-SOMETHING-ELSE", plan_id: "P-PRO-M" }, 1))
      .toEqual({ deferred: false });
  });
  it("fail-closed: a doc with no scheduledNext is never deferred", () => {
    expect(scheduledActivationDecision({ tier: "premium", subscription: { cancelled: true, downgradeTo: "pro" } }, { id: "I-NEXT" }, 1).deferred).toBe(false);
    expect(scheduledActivationDecision({}, { id: "I-NEXT" }, 1).deferred).toBe(false);
    expect(scheduledActivationDecision(null, { id: "I-NEXT" }, 1).deferred).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════
// Plan B PR-C2 SECURITY FIX — eager-cancel the Premium sub on a Pro downgrade.
//
// Security review of the lazy-cancel impl found a [HIGH]: "Keep my plan" AFTER the scheduled
// Pro is approved was reactivating a terminally-cancelled Premium sub → premium access with no
// live subscription (a paywall bypass). The fix cancels the Premium sub at SCHEDULE time and
// makes "Keep my plan" fail-closed: it CANCELS the scheduled Pro and lets the account lapse to
// free at period end (route the user to re-subscribe), rather than forging the cancellation off.
// `keepPlanPatch(userData, nowMs)` is the pure decision behind the reactivateSubscription
// callable, testable here with no emulator.
// ══════════════════════════════════════════════════════════════════════════════════
describe("billing.keepPlanPatch (PR-C2 security fix / C3b-server rename: 'Keep my plan' is fail-closed, never a premium-forever un-cancel)", () => {
  const scheduled = () => ({
    tier: "premium", paypalSubscriptionId: "I-PREM",
    subscription: {
      cancelled: true, cancelledAt: 100, downgradeTo: "pro", endDate: "2026-09-01T00:00:00.000Z",
      scheduledNext: { tier: "pro", subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z", approved: true },
    },
  });
  it("C3b-server: a scheduledNext doc → cancel-to-FREE (cancel stays true, scheduledNext cleared, endDate kept), and names the scheduled sub to cancel", () => {
    const { patch, cancelProSubId } = keepPlanPatch(scheduled(), 9000);
    // THE HIGH-bug guard: keep must NOT reinstate a terminally-cancelled Premium sub. The Premium
    // PayPal sub is already gone (eager-cancel at schedule time), so cancelled STAYS true and the
    // target becomes free — never a premium-forever `cancelled:false`.
    expect(patch.subscription.cancelled).toBe(true);
    expect(patch.subscription.cancelled).not.toBe(false);
    expect(patch.subscription.downgradeTo).toBe("free");
    // the scheduled future-start sub is dropped from the marker …
    expect(patch.subscription.scheduledNext).toBeUndefined();
    // … and its id is what the caller cancels at PayPal.
    expect(cancelProSubId).toBe("I-PRO");
    // access continues to the period end — endDate preserved, tier left alone (the sweep flips it).
    expect(patch.subscription.endDate).toBe("2026-09-01T00:00:00.000Z");
    expect("tier" in patch).toBe(false);
  });
  // PR-C3a interaction: a scheduledNext marker may also carry the `cancelPending` breadcrumb (the live
  // Premium sub id not yet drained). keepPlanPatch does `const { scheduledNext, ...prev } = sub`, so it
  // strips ONLY scheduledNext and PRESERVES cancelPending into the keep-marker — which is CORRECT for the
  // fail-closed model: "keep my plan" never restores a live sub, so the daily reconcile-drain must still
  // finish the Premium cancel. Pin that the breadcrumb survives (and the scheduled sub is still named).
  it("C3a/C3b-server: keepPlanPatch preserves the cancelPending breadcrumb so the drain still cancels the live sub (fail-closed)", () => {
    const doc = {
      tier: "premium", paypalSubscriptionId: "I-PREM",
      subscription: {
        cancelled: true, cancelledAt: 100, downgradeTo: "pro", endDate: "2026-09-01T00:00:00.000Z",
        cancelPending: "I-PREM",
        scheduledNext: { tier: "pro", subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z", approved: false },
      },
    };
    const { patch, cancelProSubId } = keepPlanPatch(doc, 9000);
    expect(patch.subscription.cancelPending).toBe("I-PREM");        // survives → the drain still finishes the cancel
    expect("scheduledNext" in patch.subscription).toBe(false);      // only the schedule is stripped
    expect(cancelProSubId).toBe("I-PRO");                           // the future sub the caller cancels at PayPal
  });
  // PR-C2 SECURITY FIX (spec correction): the OLD assertion here (`cancelled:false`) encoded the
  // [HIGH] paywall bypass. EVERY pending cancellation in this app already has a terminally-cancelled
  // PayPal sub (cancelSubscription POSTs /cancel before marking; the CANCELLED webhook fires because
  // PayPal cancelled), so un-cancelling to `cancelled:false` leaves tier:"premium" with NO live sub →
  // subscriptionSweepPatch (which only drops when cancelled:true) never downgrades = free Premium
  // forever. "Keep my plan" on a legacy cancel-to-free marker must stay fail-closed: keep the
  // cancellation so the sweep still drops at endDate; the client routes the user to re-subscribe.
  // NEVER `cancelled:false`.
  it("PR-C2 (security): a LEGACY cancel-to-FREE marker (no scheduledNext) is fail-closed — never un-cancels to premium-forever", () => {
    const legacy = {
      tier: "premium", paypalSubscriptionId: "I-PREM",
      subscription: { cancelled: true, cancelledAt: 100, downgradeTo: "free", endDate: "2026-09-01T00:00:00.000Z" },
    };
    const { patch, cancelProSubId } = keepPlanPatch(legacy, 9000);
    // the money proof: NEVER a premium-forever un-cancel — cancelled stays true/omitted so the
    // daily sweep still drops the account to free at endDate.
    expect(patch.subscription.cancelled).not.toBe(false);
    expect(cancelProSubId).toBeNull();                 // no scheduled sub to cancel
  });
  // Trigger 1 from the security review — the DOUBLE "Keep my plan" click. A keep on a scheduledNext
  // doc emits a {cancelled:true, downgradeTo:"free"} legacy-shaped marker (scheduledNext dropped); a
  // SECOND click feeds that marker back through keepPlanPatch. It must NOT fall into a
  // `cancelled:false` un-cancel — fail-closed on every click, so a double-click can't reach the
  // paywall-bypass state either.
  it("PR-C2 (security): a CHAINED keep (double-click) stays fail-closed — feeding a prior keep's marker back in never yields cancelled:false", () => {
    const first = keepPlanPatch(scheduled(), 9000);
    const chainedDoc = { tier: "premium", paypalSubscriptionId: "I-PREM", subscription: first.patch.subscription };
    const second = keepPlanPatch(chainedDoc, 9500);
    expect(second.patch.subscription.cancelled).not.toBe(false);
    expect(second.cancelProSubId).toBeNull();
  });

  // [LOW] self-harm guard: "Keep my plan" must only ever act on an ALREADY-CANCELLED marker.
  // Invoked (via the raw callable) on a HEALTHY, non-cancelled sub it must be a NO-OP — never
  // mark a live sub cancelled:true (which would drop the user to free at endDate while PayPal
  // keeps charging). The UI only surfaces "Keep my plan" on a cancelled marker.
  it("PR-C2 (security): a HEALTHY (non-cancelled) sub is a no-op — keep never marks a live sub cancelled:true", () => {
    const healthy = { tier: "premium", paypalSubscriptionId: "I-PREM", subscription: { billing: "monthly", endDate: "2026-09-01T00:00:00.000Z" } };
    const { patch, cancelProSubId } = keepPlanPatch(healthy, 9000);
    expect(patch.subscription && patch.subscription.cancelled).not.toBe(true);
    expect(cancelProSubId).toBeNull();
  });
});

describe("billing.subscriptionSweepPatch (PR-C2/C3b-server: the future-start pre-auth money flip, tier-carrying)", () => {
  // Eager-cancel regression guard: an APPROVED schedule already had its live sub cancelled at
  // schedule time, so this flip to a payment-backed next tier (marker cleared) is the STRUCTURAL
  // no-double-charge proof — the two subs never overlap-bill.
  it("C3b-server: an APPROVED scheduledNext{tier:'pro'} at period end → a clean payment-backed Pro (live id = the scheduled sub, marker cleared)", () => {
    const p = subscriptionSweepPatch({
      tier: "premium", paypalSubscriptionId: "I-PREM",
      subscription: {
        cancelled: true, downgradeTo: "pro", endDate: "2026-06-01",
        scheduledNext: { tier: "pro", subId: "I-PRO", billing: "yearly", startDate: "2026-06-01", approved: true },
      },
    }, Date.parse("2026-07-03"));
    expect(p).toEqual({ tier: "pro", paypalSubscriptionId: "I-PRO", billingCycle: "yearly", subscription: null });
  });
  it("C3b-server: an APPROVED scheduledNext{tier:'premium'} at period end → a SEAMLESS stay-premium (live id = the new Premium sub, marker cleared)", () => {
    const p = subscriptionSweepPatch({
      tier: "premium", paypalSubscriptionId: "I-PREM",
      subscription: {
        cancelled: true, endDate: "2026-06-01",
        scheduledNext: { tier: "premium", subId: "I-PREM2", billing: "monthly", startDate: "2026-06-01", approved: true },
      },
    }, Date.parse("2026-07-03"));
    expect(p).toEqual({ tier: "premium", paypalSubscriptionId: "I-PREM2", billingCycle: "monthly", subscription: null });
  });
  it("defaults billingCycle to monthly when the approved schedule omits it", () => {
    const p = subscriptionSweepPatch({
      tier: "premium",
      subscription: {
        cancelled: true, downgradeTo: "pro", endDate: "2026-06-01",
        scheduledNext: { tier: "pro", subId: "I-PRO", approved: true },
      },
    }, Date.parse("2026-07-03"));
    expect(p).toEqual({ tier: "pro", paypalSubscriptionId: "I-PRO", billingCycle: "monthly", subscription: null });
  });
  // Eager-cancel regression guard (abandonment-is-safe): the live sub was ALREADY cancelled at
  // schedule time, so an abandoned (never-approved) schedule can never keep billing — it simply
  // lapses to free here, for EITHER target tier. This is the [MED] bill-forever fix's invariant.
  it("C3b-server: fail-closed — an UNAPPROVED scheduledNext at period end drops to FREE (either tier: no approval, no paid plan)", () => {
    const pro = subscriptionSweepPatch({
      tier: "premium",
      subscription: {
        cancelled: true, downgradeTo: "pro", endDate: "2026-06-01",
        scheduledNext: { tier: "pro", subId: "I-PRO", billing: "monthly", startDate: "2026-06-01", approved: false },
      },
    }, Date.parse("2026-07-03"));
    expect(pro).toEqual({ tier: "free", subscription: null });
    const prem = subscriptionSweepPatch({
      tier: "premium",
      subscription: {
        cancelled: true, endDate: "2026-06-01",
        scheduledNext: { tier: "premium", subId: "I-PREM2", billing: "monthly", startDate: "2026-06-01", approved: false },
      },
    }, Date.parse("2026-07-03"));
    expect(prem).toEqual({ tier: "free", subscription: null });
  });
  // Back-compat: a doc still carrying the OLD `scheduledPro` field (no migration — zero prod
  // markers, but the shim keeps a legacy marker RESOLVING). Approved → resolves to Pro exactly
  // as before. This must stay green through the rename.
  it("C3b-server: back-compat — a LEGACY scheduledPro marker (no scheduledNext) still resolves, approved → Pro", () => {
    const p = subscriptionSweepPatch({
      tier: "premium", paypalSubscriptionId: "I-PREM",
      subscription: {
        cancelled: true, downgradeTo: "pro", endDate: "2026-06-01",
        scheduledPro: { subId: "I-PRO", billing: "yearly", startDate: "2026-06-01", approved: true },
      },
    }, Date.parse("2026-07-03"));
    expect(p).toEqual({ tier: "pro", paypalSubscriptionId: "I-PRO", billingCycle: "yearly", subscription: null });
  });
  // Regression guard — the legacy pro-target keep-marker branch (no schedule at all) is UNCHANGED
  // from R29: flip to free but KEEP the marker for the (interim) re-checkout. This must stay green.
  it("regression: a legacy pro-target marker with NO schedule still flips to free and KEEPS the marker", () => {
    const p = subscriptionSweepPatch({ tier: "premium", subscription: { cancelled: true, downgradeTo: "pro", endDate: "2026-06-01" } }, Date.parse("2026-07-03"));
    expect(p).toEqual({ tier: "free" });
  });
});

// ══════════════════════════════════════════════════════════════════════════════════
// Plan B PR-C3a — marker-first reconciliation (a billing money-path hardening).
//
// scheduleProDowngrade currently orders its PayPal ops as: create the future-start Pro sub →
// CANCEL the Premium sub (irreversible) → write the Firestore marker. A marker-write failure
// AFTER the Premium cancel leaves tier:"premium" with a cancelled Premium sub and NO marker the
// daily sweep can act on = premium-with-no-billing (Finding #3, a [MED] fail-open).
//
// C3a fixes it by writing the marker FIRST — carrying a `cancelPending` breadcrumb (the live
// Premium sub id still needing cancellation) — THEN cancelling Premium, and draining any
// un-finished cancel in the daily sweep. The pure decision layer gains a field + one reader:
//   • scheduleNextMarkerPatch also stamps `cancelPending: scheduled.cancelSubId || null`.
//   • pendingCancelSubId(userData)  → subscription.cancelPending || null (null-safe).
// The breadcrumb CLEAR is a targeted Firestore FieldValue.delete() at the two PROD drain sites
// (clobber-safe vs a concurrent webhook write) — no pure strip helper. All pure → unit-testable.
// ══════════════════════════════════════════════════════════════════════════════════

describe("billing.scheduleNextMarkerPatch (PR-C3a/C3b-server marker-first: carry the cancelPending breadcrumb)", () => {
  const premium = () => ({
    tier: "premium", paypalSubscriptionId: "I-PREM",
    subscription: { billing: "monthly", startDate: "2026-05-01", endDate: "2026-09-01T00:00:00.000Z", cancelled: false },
  });
  it("C3a/C3b-server: stamps cancelPending = the live sub id (the breadcrumb the reconcile-drain cancels), WITHOUT regressing the scheduledNext marker fields", () => {
    const p = scheduleNextMarkerPatch(premium(),
      { tier: "pro", subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z", cancelSubId: "I-PREM" }, 5000);
    // the breadcrumb: the live sub id still needing cancellation
    expect(p.subscription.cancelPending).toBe("I-PREM");
    // regression guard: the tier-carrying marker shape is intact
    expect(p.subscription.scheduledNext).toEqual({
      tier: "pro", subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z", approved: false,
    });
    expect(p.subscription.cancelled).toBe(true);
    expect(p.subscription.downgradeTo).toBe("pro");
    expect(p.subscription.endDate).toBe("2026-09-01T00:00:00.000Z");
  });
  it("C3a/C3b-server: cancelPending is null when no live sub id is supplied (DEV branch has none to cancel)", () => {
    const p = scheduleNextMarkerPatch(premium(),
      { tier: "pro", subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z" }, 1);
    expect(p.subscription.cancelPending).toBeNull();
  });
  it("C3b-server: a PREMIUM re-subscribe also carries the cancelPending breadcrumb (null in DEV — Premium already terminally cancelled)", () => {
    const p = scheduleNextMarkerPatch(premium(),
      { tier: "premium", subId: "I-PREM2", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z" }, 1);
    expect(p.subscription.scheduledNext.tier).toBe("premium");
    expect(p.subscription.cancelPending).toBeNull();
  });
});

describe("billing.pendingCancelSubId (PR-C3a: read the un-drained cancel breadcrumb)", () => {
  it("C3a: returns the cancelPending sub id when the marker carries one", () => {
    expect(pendingCancelSubId({ subscription: { cancelPending: "I-PREM" } })).toBe("I-PREM");
  });
  it("C3a: null-safe — no breadcrumb, no subscription, or null userData all yield null", () => {
    expect(pendingCancelSubId({ subscription: {} })).toBeNull();
    expect(pendingCancelSubId({})).toBeNull();
    expect(pendingCancelSubId(null)).toBeNull();
  });
});
