import { describe, it, expect } from "vitest";
import {
  planTier, planIdFor, paypalBaseFor, activationPatch, salePatch, cancellationPatch,
  cancelRequestPatch, subscriptionSweepPatch, extendForSuspension, computeRevenue, webhookEventKey,
  billingStatusOf,
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
