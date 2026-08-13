import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Plan B PR-B (G4) — the honest /pro-success confirmation hook. It watches the
 * signed-in user's own doc and only reports "confirmed" once the PayPal webhook has
 * actually written a paid tier (no false "you're upgraded" before the money lands).
 * It NEVER writes anything — read-only confirmation.
 *
 * We drive the auth + user-doc callbacks through mocked seams.
 */
const h = vi.hoisted(() => ({ authCb: null, docCb: null, docUnsub: vi.fn(), authUnsub: vi.fn() }));
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (auth, cb) => { h.authCb = cb; return h.authUnsub; },
}));
vi.mock("../../src/api/firebase.config.js", () => ({ auth: { __tag: "auth" } }));
vi.mock("../../src/api/firebase-database.js", () => ({
  watchUserDoc: (uid, cb) => { h.docCb = cb; return h.docUnsub; },
}));

import { useProSuccess } from "../../src/hooks/useProSuccess.js";

describe("useProSuccess (PR-B G4 — confirm the tier only after the webhook lands)", () => {
  beforeEach(() => { h.authCb = null; h.docCb = null; h.docUnsub.mockClear(); h.authUnsub.mockClear(); });
  afterEach(() => { vi.useRealTimers(); });

  it("stays 'waiting' until a paid tier arrives, then confirms with that tier (free → premium)", () => {
    const { result } = renderHook(() => useProSuccess({ timeoutMs: 100000 }));
    expect(result.current.status).toBe("waiting");
    act(() => { h.authCb({ uid: "u1" }); });
    act(() => { h.docCb({ tier: "free" }); });                                   // baseline, still free
    expect(result.current.status).toBe("waiting");
    act(() => { h.docCb({ tier: "premium", subscription: { cancelled: false } }); });
    expect(result.current).toMatchObject({ status: "confirmed", tier: "premium" });
  });

  it("confirms a pro → premium upgrade (baseline already a paid tier)", () => {
    const { result } = renderHook(() => useProSuccess({ timeoutMs: 100000 }));
    act(() => { h.authCb({ uid: "u2" }); });
    act(() => { h.docCb({ tier: "pro" }); });                                    // baseline pro
    expect(result.current.status).toBe("waiting");
    act(() => { h.docCb({ tier: "premium" }); });
    expect(result.current).toMatchObject({ status: "confirmed", tier: "premium" });
  });

  it("never confirms a still-free account (no false upgrade)", () => {
    const { result } = renderHook(() => useProSuccess({ timeoutMs: 100000 }));
    act(() => { h.authCb({ uid: "u3" }); });
    act(() => { h.docCb({ tier: "free" }); });
    act(() => { h.docCb({ tier: "free" }); });
    expect(result.current.status).toBe("waiting");
  });

  it("reports 'signedout' when there is no authenticated user", () => {
    const { result } = renderHook(() => useProSuccess({ timeoutMs: 100000 }));
    act(() => { h.authCb(null); });
    expect(result.current.status).toBe("signedout");
  });

  it("on timeout, still resolves to the paid tier if the webhook had already landed at mount (fast path)", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useProSuccess({ timeoutMs: 8000 }));
    act(() => { h.authCb({ uid: "u4" }); });
    act(() => { h.docCb({ tier: "premium", subscription: { cancelled: false } }); }); // already paid at first read
    // baseline == premium, no change comes → the timeout confirms the paid tier
    act(() => { vi.advanceTimersByTime(8000); });
    expect(result.current).toMatchObject({ status: "timeout", tier: "premium" });
  });

  it("unsubscribes auth + doc watchers on unmount", () => {
    const { unmount } = renderHook(() => useProSuccess({ timeoutMs: 100000 }));
    act(() => { h.authCb({ uid: "u5" }); });
    act(() => { h.docCb({ tier: "free" }); });
    unmount();
    expect(h.authUnsub).toHaveBeenCalled();
    expect(h.docUnsub).toHaveBeenCalled();
  });

  // ── Plan B PR-C3b-client — the tier-carrying scheduledNext reader shim ──
  // C3b-server renamed the future-start marker to subscription.scheduledNext{tier}. The hook
  // must read it tier-aware (`scheduledNext || scheduledPro`) so /pro-success confirms the RIGHT
  // scheduled tier: a seamless Premium re-subscribe (tier "premium") vs a Pro downgrade (tier
  // "pro"). Today the hook reads subscription.scheduledPro only and returns tier = server.tier
  // (always "premium" until the sweep) — so the scheduledNext cases stay "waiting" and the legacy
  // case reports the wrong tier.
  it("PR-C3b-client: a scheduledNext PRO downgrade confirms 'scheduled' with the scheduled tier 'pro'", () => {
    const { result } = renderHook(() => useProSuccess({ timeoutMs: 100000 }));
    act(() => { h.authCb({ uid: "s1" }); });
    act(() => { h.docCb({ tier: "premium", subscription: { cancelled: true, scheduledNext: { tier: "pro", subId: "I-PRO", approved: false } } }); });
    expect(result.current).toMatchObject({ status: "scheduled", tier: "pro" });
  });

  it("PR-C3b-client: a scheduledNext PREMIUM re-subscribe confirms 'scheduled' with the scheduled tier 'premium'", () => {
    const { result } = renderHook(() => useProSuccess({ timeoutMs: 100000 }));
    act(() => { h.authCb({ uid: "s2" }); });
    act(() => { h.docCb({ tier: "premium", subscription: { cancelled: true, scheduledNext: { tier: "premium", subId: "I-PREM", approved: false } } }); });
    expect(result.current).toMatchObject({ status: "scheduled", tier: "premium" });
  });

  it("PR-C3b-client: a legacy scheduledPro marker still confirms 'scheduled', shimmed to tier 'pro'", () => {
    const { result } = renderHook(() => useProSuccess({ timeoutMs: 100000 }));
    act(() => { h.authCb({ uid: "s3" }); });
    act(() => { h.docCb({ tier: "premium", subscription: { cancelled: true, scheduledPro: { subId: "I-PRO", billing: "monthly", approved: false } } }); });
    expect(result.current).toMatchObject({ status: "scheduled", tier: "pro" });
  });
});
