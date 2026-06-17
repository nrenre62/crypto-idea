import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the boundary the hook depends on.
let authCb = null;
vi.mock("../../src/api/firebase-auth.js", () => ({
  onAuthChange: vi.fn((cb) => { authCb = cb; return () => {}; }),
}));
vi.mock("../../src/api/firebase-database.js", () => ({
  getPortfolios: vi.fn().mockResolvedValue({ success: true, portfolios: [{ id: "p1", name: "Main" }] }),
  getCoins: vi.fn().mockResolvedValue({ success: true, coins: [] }),
  // Default: no server profile doc -> session should fall back to the "free" default.
  getUserProfile: vi.fn().mockResolvedValue({ success: false }),
}));
vi.mock("../../src/utils/storage.js", () => ({
  db: { get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn() },
}));

import { useAuthSession } from "../../src/hooks/useAuthSession.js";
import { getUserProfile } from "../../src/api/firebase-database.js";
import { db } from "../../src/utils/storage.js";

function setup(overrides = {}) {
  const collab = {
    setScreen: vi.fn(), setPortfolios: vi.fn(), setActivePortId: vi.fn(),
    checkSubscriptionStatus: vi.fn(async (u) => u), saveProfile: vi.fn(),
    ...overrides,
  };
  const view = renderHook(() => useAuthSession(collab));
  return { collab, view };
}

describe("useAuthSession", () => {
  beforeEach(() => { authCb = null; vi.clearAllMocks(); });

  it("subscribes to auth changes on mount", () => {
    setup();
    expect(authCb).toBeTypeOf("function");
  });

  it("on login: loads portfolios, applies subscription check, navigates, exposes the user", async () => {
    const { collab, view } = setup();
    await act(async () => { await authCb({ uid: "u1", email: "a@b.com", displayName: "Ann" }); });

    expect(collab.setPortfolios).toHaveBeenCalledWith([{ id: "p1", name: "Main", coins: [] }]);
    expect(collab.setActivePortId).toHaveBeenCalledWith("p1");
    expect(collab.checkSubscriptionStatus).toHaveBeenCalled();
    expect(collab.setScreen).toHaveBeenCalledWith("portfolio");
    expect(view.result.current.user).toMatchObject({ uid: "u1", email: "a@b.com", name: "Ann", tier: "free" });
    expect(view.result.current.dataLoaded).toBe(true);
  });

  it("adopts the server tier from Firestore (the authoritative source), not the local default", async () => {
    // A Pro user (set server-side by admin/PayPal/seed) logging in on a fresh device with no
    // local cache must come up as Pro — F-1 regression guard.
    getUserProfile.mockResolvedValueOnce({ success: true, tier: "pro", subscription: null });
    const { view } = setup();
    await act(async () => { await authCb({ uid: "u1", email: "pro@b.com", displayName: "Pat" }); });
    expect(view.result.current.user).toMatchObject({ uid: "u1", tier: "pro" });
  });

  it("does not adopt non-string server fields that the UI renders (joined Timestamp)", async () => {
    // Firestore returns `joined` as a Timestamp object {seconds,nanoseconds}; the Account screen
    // renders user.joined directly, so importing the object would crash it ("Objects are not valid
    // as a React child"). The session must take only authoritative fields (tier) from the server.
    getUserProfile.mockResolvedValueOnce({ success: true, tier: "free", joined: { seconds: 1, nanoseconds: 0 } });
    const { view } = setup();
    await act(async () => { await authCb({ uid: "u1", email: "a@b.com", displayName: "Ann" }); });
    expect(typeof view.result.current.user.joined).toBe("string");
  });

  it("server tier overrides a stale local cache", async () => {
    // Local cache says pro, but the server has since downgraded the user to free -> free wins.
    db.get.mockResolvedValueOnce({ tier: "pro" });
    getUserProfile.mockResolvedValueOnce({ success: true, tier: "free", subscription: null });
    const { view } = setup();
    await act(async () => { await authCb({ uid: "u1", email: "a@b.com", displayName: "Ann" }); });
    expect(view.result.current.user.tier).toBe("free");
  });

  it("auto-saves the profile after the user is set", async () => {
    const { collab } = setup();
    await act(async () => { await authCb({ uid: "u1", email: "a@b.com", displayName: "Ann" }); });
    await waitFor(() => expect(collab.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ uid: "u1" })));
  });

  it("on logout: clears the user and returns to the login screen", async () => {
    const { collab, view } = setup();
    await act(async () => { await authCb(null); });
    expect(view.result.current.user).toBeNull();
    expect(collab.setScreen).toHaveBeenCalledWith("login");
  });
});
