import { describe, it, expect, vi, beforeEach } from "vitest";

// Plan B PR-C3b-client — the client api/ wrappers for the PayPal subscription callables.
// Components never call httpsCallable directly (layer rule); these thin wrappers do. We mock
// the firebase seam and assert the wrapper targets the right callable with {billing}. Mirrors
// the api/account harness (tests/unit/account-api.test.jsx).
vi.mock("firebase/functions", () => ({ httpsCallable: vi.fn() }));
vi.mock("../../src/api/firebase.config.js", () => ({ functions: { _tag: "fns" } }));

import { httpsCallable } from "firebase/functions";
// Namespace import so a not-yet-added export can't error at module-eval time — a missing
// wrapper surfaces as `undefined is not a function` at call time (the RED we want).
import * as billingApi from "../../src/api/billing.js";

describe("api/billing (PayPal subscription callables)", () => {
  beforeEach(() => vi.clearAllMocks());

  // Existing wrapper — proves the harness + module load are correct (green).
  it("scheduleProDowngrade calls the scheduleProDowngrade callable with the billing cycle", async () => {
    const call = vi.fn().mockResolvedValue({ data: { subscriptionId: "I-PRO" } });
    httpsCallable.mockReturnValue(call);
    const data = await billingApi.scheduleProDowngrade({ billing: "monthly" });
    expect(httpsCallable).toHaveBeenCalledWith({ _tag: "fns" }, "scheduleProDowngrade");
    expect(call).toHaveBeenCalledWith({ billing: "monthly" });
    expect(data).toEqual({ subscriptionId: "I-PRO" });
  });

  // PR-C3b-client — the NEW seamless Premium re-subscribe wrapper. RED: src/api/billing.js does
  // not export resubscribePremium yet (billingApi.resubscribePremium is undefined).
  it("PR-C3b-client: resubscribePremium calls the resubscribePremium callable with the billing cycle", async () => {
    const call = vi.fn().mockResolvedValue({ data: { approvalUrl: "https://paypal/x", subscriptionId: "I-PREM" } });
    httpsCallable.mockReturnValue(call);
    const data = await billingApi.resubscribePremium({ billing: "yearly" });
    expect(httpsCallable).toHaveBeenCalledWith({ _tag: "fns" }, "resubscribePremium");
    expect(call).toHaveBeenCalledWith({ billing: "yearly" });
    expect(data).toEqual({ approvalUrl: "https://paypal/x", subscriptionId: "I-PREM" });
  });
});
