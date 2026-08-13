import { describe, it, expect } from "vitest";
import {
  planTier, planIdFor, paypalBaseFor, activationPatch, salePatch, cancellationPatch,
  cancelRequestPatch, subscriptionSweepPatch, extendForSuspension, computeRevenue, webhookEventKey,
  billingStatusOf,
  // Plan B PR-C2 (future-start Pro pre-authorization).
  scheduleProMarkerPatch, scheduledActivationDecision,
  // Plan B PR-C2 SECURITY FIX (eager-cancel Premium on Pro downgrade) — `keepPlanPatch` is the
  // NEW pure "Keep my plan" decision the fix introduces.
  keepPlanPatch,
  // Plan B PR-C3a (marker-first reconciliation) — the two NEW pure helpers the fix introduces.
  // They do not exist yet, so the missing named imports resolve to `undefined` and the calls
  // below throw "not a function": red for the right reason (C3a has not been written).
  pendingCancelSubId, dropCancelPending,
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
// server-authoritative and fail-closed: never early-drops Premium, never grants Pro without
// PayPal-confirmed approval, never double-charges. The server-written marker shape:
//   subscription: { ...prev, cancelled:true, cancelledAt, downgradeTo:"pro",
//                   endDate:<premium period end ISO == the Pro sub start_time>,
//                   scheduledPro:{ subId, billing, startDate:<ISO == endDate>, approved } }
// During the window `tier` stays "premium" and `paypalSubscriptionId` stays the PREMIUM id;
// scheduledPro.approved is flipped true ONLY by the scheduled sub's ACTIVATED webhook.
// These pure decisions are unit-testable with no emulator, exactly like the rest of billing.js.
// ══════════════════════════════════════════════════════════════════════════════════

describe("billing.scheduleProMarkerPatch (PR-C2: schedule the future-start Pro sub — PENDING, not yet approved)", () => {
  const premium = () => ({
    tier: "premium", paypalSubscriptionId: "I-PREM",
    subscription: { billing: "monthly", startDate: "2026-05-01", endDate: "2026-09-01T00:00:00.000Z", cancelled: false },
  });
  // Eager-cancel regression guard: the marker's endDate == the scheduled Pro's start_time is the
  // structural handoff — Premium is cancelled at schedule time, the Pro sub first-charges exactly
  // at endDate, so there is no overlap window to double-charge.
  it("stamps a pending scheduledPro marker (approved:false) with the Pro start == the premium period end", () => {
    const p = scheduleProMarkerPatch(premium(),
      { subId: "I-PRO", billing: "yearly", startDate: "2026-09-01T00:00:00.000Z" }, 5000);
    expect(p.subscription.scheduledPro).toEqual({
      subId: "I-PRO", billing: "yearly", startDate: "2026-09-01T00:00:00.000Z", approved: false,
    });
    // the cancel-at-period-end marker landing on Pro; endDate == the scheduled Pro start_time
    expect(p.subscription.cancelled).toBe(true);
    expect(p.subscription.cancelledAt).toBe(5000);
    expect(p.subscription.downgradeTo).toBe("pro");
    expect(p.subscription.endDate).toBe("2026-09-01T00:00:00.000Z");
  });
  it("leaves `tier` premium and the LIVE `paypalSubscriptionId` on the premium sub (a schedule, not a switch)", () => {
    const p = scheduleProMarkerPatch(premium(),
      { subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z" }, 1);
    expect("tier" in p).toBe(false);                       // tier untouched → stays premium
    expect("paypalSubscriptionId" in p).toBe(false);       // still the premium sub id until the sweep
  });
  it("preserves the prior subscription fields (spread ...prev)", () => {
    const p = scheduleProMarkerPatch(premium(),
      { subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z" }, 1);
    expect(p.subscription.billing).toBe("monthly");
    expect(p.subscription.startDate).toBe("2026-05-01");
  });
});

describe("billing.scheduledActivationDecision (PR-C2: the scheduled Pro sub's ACTIVATED webhook)", () => {
  const scheduled = () => ({
    tier: "premium", paypalSubscriptionId: "I-PREM",
    subscription: {
      cancelled: true, cancelledAt: 100, downgradeTo: "pro", endDate: "2026-09-01T00:00:00.000Z",
      scheduledPro: { subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z", approved: false },
    },
  });
  it("PR-C2 security fix: the scheduled Pro sub approving → deferred (marks approved, keeps the marker, no tier/live-id flip) and NO LONGER names a Premium sub to cancel — the eager-cancel left the webhook", () => {
    const d = scheduledActivationDecision(scheduled(), { id: "I-PRO", plan_id: "P-PRO-M" }, 9000);
    expect(d.deferred).toBe(true);
    // the payment-approval proof: scheduledPro.approved becomes true, the downgrade marker preserved
    expect(d.patch.subscription.scheduledPro.approved).toBe(true);
    expect(d.patch.subscription.cancelled).toBe(true);
    expect(d.patch.subscription.downgradeTo).toBe("pro");
    expect(d.patch.subscription.endDate).toBe("2026-09-01T00:00:00.000Z");
    // NOT yet a Pro account: tier must not flip to pro, and the live sub id must not become the Pro id
    expect(d.patch.tier).not.toBe("pro");
    expect(d.patch.paypalSubscriptionId).not.toBe("I-PRO");
    // SECURITY FIX (eager-cancel): the Premium PayPal sub is cancelled at SCHEDULE time now — a
    // LAZY cancel here (best-effort, unreconciled) was the [MED] double-charge / bill-forever
    // window. So the webhook decision must NOT carry a Premium sub id to cancel any more.
    // (Spec change, not a weakening: the old `cancelPremiumSubId === "I-PREM"` assertion ENCODED
    // the lazy-cancel bug that shipped.)
    expect("cancelPremiumSubId" in d).toBe(false);
  });
  it("a normal (non-scheduled) activation → not deferred (the caller runs the usual activationPatch)", () => {
    expect(scheduledActivationDecision(scheduled(), { id: "I-SOMETHING-ELSE", plan_id: "P-PRO-M" }, 1))
      .toEqual({ deferred: false });
  });
  it("fail-closed: a doc with no scheduledPro is never deferred", () => {
    expect(scheduledActivationDecision({ tier: "premium", subscription: { cancelled: true, downgradeTo: "pro" } }, { id: "I-PRO" }, 1).deferred).toBe(false);
    expect(scheduledActivationDecision({}, { id: "I-PRO" }, 1).deferred).toBe(false);
    expect(scheduledActivationDecision(null, { id: "I-PRO" }, 1).deferred).toBe(false);
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
describe("billing.keepPlanPatch (PR-C2 security fix: 'Keep my plan' is fail-closed, never a premium-forever un-cancel)", () => {
  const scheduled = () => ({
    tier: "premium", paypalSubscriptionId: "I-PREM",
    subscription: {
      cancelled: true, cancelledAt: 100, downgradeTo: "pro", endDate: "2026-09-01T00:00:00.000Z",
      scheduledPro: { subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z", approved: true },
    },
  });
  it("a scheduledPro doc → cancel-to-FREE (cancel stays true, scheduledPro cleared, endDate kept), and names the scheduled Pro sub to cancel", () => {
    const { patch, cancelProSubId } = keepPlanPatch(scheduled(), 9000);
    // THE HIGH-bug guard: keep must NOT reinstate a terminally-cancelled Premium sub. The Premium
    // PayPal sub is already gone (eager-cancel at schedule time), so cancelled STAYS true and the
    // target becomes free — never a premium-forever `cancelled:false`.
    expect(patch.subscription.cancelled).toBe(true);
    expect(patch.subscription.cancelled).not.toBe(false);
    expect(patch.subscription.downgradeTo).toBe("free");
    // the scheduled future-start Pro sub is dropped from the marker …
    expect(patch.subscription.scheduledPro).toBeUndefined();
    // … and its id is what the caller cancels at PayPal.
    expect(cancelProSubId).toBe("I-PRO");
    // access continues to the period end — endDate preserved, tier left alone (the sweep flips it).
    expect(patch.subscription.endDate).toBe("2026-09-01T00:00:00.000Z");
    expect("tier" in patch).toBe(false);
  });
  // PR-C2 SECURITY FIX (spec correction): the OLD assertion here (`cancelled:false`) encoded the
  // [HIGH] paywall bypass. EVERY pending cancellation in this app already has a terminally-cancelled
  // PayPal sub (cancelSubscription POSTs /cancel before marking; the CANCELLED webhook fires because
  // PayPal cancelled), so un-cancelling to `cancelled:false` leaves tier:"premium" with NO live sub →
  // subscriptionSweepPatch (which only drops when cancelled:true) never downgrades = free Premium
  // forever. "Keep my plan" on a legacy cancel-to-free marker must stay fail-closed: keep the
  // cancellation so the sweep still drops at endDate; the client routes the user to re-subscribe.
  // NEVER `cancelled:false`.
  it("PR-C2 (security): a LEGACY cancel-to-FREE marker (no scheduledPro) is fail-closed — never un-cancels to premium-forever", () => {
    const legacy = {
      tier: "premium", paypalSubscriptionId: "I-PREM",
      subscription: { cancelled: true, cancelledAt: 100, downgradeTo: "free", endDate: "2026-09-01T00:00:00.000Z" },
    };
    const { patch, cancelProSubId } = keepPlanPatch(legacy, 9000);
    // the money proof: NEVER a premium-forever un-cancel — cancelled stays true/omitted so the
    // daily sweep still drops the account to free at endDate.
    expect(patch.subscription.cancelled).not.toBe(false);
    expect(cancelProSubId).toBeNull();                 // no scheduled Pro sub to cancel
  });
  // Trigger 1 from the security review — the DOUBLE "Keep my plan" click. A keep on a scheduled-Pro
  // doc emits a {cancelled:true, downgradeTo:"free"} legacy-shaped marker (scheduledPro dropped); a
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

describe("billing.subscriptionSweepPatch (PR-C2: the future-start Pro pre-auth money flip)", () => {
  // Eager-cancel regression guard: an APPROVED schedule already had its Premium sub cancelled at
  // schedule time, so this flip to a payment-backed Pro (marker cleared) is the STRUCTURAL
  // no-double-charge proof — the two subs never overlap-bill.
  it("an APPROVED scheduled Pro at period end → a clean payment-backed Pro (live id = the Pro sub, marker cleared)", () => {
    const p = subscriptionSweepPatch({
      tier: "premium", paypalSubscriptionId: "I-PREM",
      subscription: {
        cancelled: true, downgradeTo: "pro", endDate: "2026-06-01",
        scheduledPro: { subId: "I-PRO", billing: "yearly", startDate: "2026-06-01", approved: true },
      },
    }, Date.parse("2026-07-03"));
    expect(p).toEqual({ tier: "pro", paypalSubscriptionId: "I-PRO", billingCycle: "yearly", subscription: null });
  });
  it("defaults billingCycle to monthly when the approved schedule omits it", () => {
    const p = subscriptionSweepPatch({
      tier: "premium",
      subscription: {
        cancelled: true, downgradeTo: "pro", endDate: "2026-06-01",
        scheduledPro: { subId: "I-PRO", approved: true },
      },
    }, Date.parse("2026-07-03"));
    expect(p).toEqual({ tier: "pro", paypalSubscriptionId: "I-PRO", billingCycle: "monthly", subscription: null });
  });
  // Eager-cancel regression guard (abandonment-is-safe): the Premium sub was ALREADY cancelled at
  // schedule time, so an abandoned (never-approved) schedule can never keep billing Premium — it
  // simply lapses to free here. This is the [MED] bill-forever fix's downstream invariant.
  it("fail-closed: an UNAPPROVED scheduled Pro at period end drops to FREE — no approval, no Pro", () => {
    const p = subscriptionSweepPatch({
      tier: "premium",
      subscription: {
        cancelled: true, downgradeTo: "pro", endDate: "2026-06-01",
        scheduledPro: { subId: "I-PRO", billing: "monthly", startDate: "2026-06-01", approved: false },
      },
    }, Date.parse("2026-07-03"));
    expect(p).toEqual({ tier: "free", subscription: null });
  });
  // Regression guard — the legacy pro-target keep-marker branch (no scheduledPro) is UNCHANGED
  // from R29: flip to free but KEEP the marker for the (interim) re-checkout. This must stay green.
  it("regression: a legacy pro-target marker with NO scheduledPro still flips to free and KEEPS the marker", () => {
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
// un-finished cancel in the daily sweep. The pure decision layer gains a field + two helpers:
//   • scheduleProMarkerPatch also stamps `cancelPending: scheduled.cancelSubId || null`.
//   • pendingCancelSubId(userData)  → subscription.cancelPending || null (null-safe).
//   • dropCancelPending(sub)        → the subscription map with `cancelPending` removed.
// All pure → unit-testable with no emulator.
// ══════════════════════════════════════════════════════════════════════════════════

describe("billing.scheduleProMarkerPatch (PR-C3a marker-first: carry the cancelPending breadcrumb)", () => {
  const premium = () => ({
    tier: "premium", paypalSubscriptionId: "I-PREM",
    subscription: { billing: "monthly", startDate: "2026-05-01", endDate: "2026-09-01T00:00:00.000Z", cancelled: false },
  });
  it("C3a: stamps cancelPending = the live Premium sub id (the breadcrumb the reconcile-drain cancels), WITHOUT regressing the PR-C2 marker fields", () => {
    const p = scheduleProMarkerPatch(premium(),
      { subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z", cancelSubId: "I-PREM" }, 5000);
    // the NEW breadcrumb: the Premium sub id still needing cancellation
    expect(p.subscription.cancelPending).toBe("I-PREM");
    // PR-C2 regression guard: the existing marker shape is unchanged
    expect(p.subscription.scheduledPro).toEqual({
      subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z", approved: false,
    });
    expect(p.subscription.cancelled).toBe(true);
    expect(p.subscription.downgradeTo).toBe("pro");
    expect(p.subscription.endDate).toBe("2026-09-01T00:00:00.000Z");
  });
  it("C3a: cancelPending is null when no Premium sub id is supplied (DEV branch has none to cancel)", () => {
    const p = scheduleProMarkerPatch(premium(),
      { subId: "I-PRO", billing: "monthly", startDate: "2026-09-01T00:00:00.000Z" }, 1);
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

describe("billing.dropCancelPending (PR-C3a: clear the breadcrumb once the cancel is drained)", () => {
  it("C3a: removes ONLY cancelPending, preserving every other subscription field", () => {
    const out = dropCancelPending({ cancelPending: "x", cancelled: true, downgradeTo: "free", endDate: "2026-01-01" });
    expect("cancelPending" in out).toBe(false);
    expect(out.cancelled).toBe(true);
    expect(out.downgradeTo).toBe("free");
    expect(out.endDate).toBe("2026-01-01");
  });
  it("C3a: idempotent — a map with no cancelPending comes back equivalent", () => {
    const sub = { cancelled: true, downgradeTo: "free", endDate: "2026-01-01" };
    expect(dropCancelPending(sub)).toEqual(sub);
  });
  it("C3a: null-safe on null input", () => {
    expect(dropCancelPending(null)).toBeNull();
  });
});
