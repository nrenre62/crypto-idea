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
}));
vi.mock("../../src/utils/storage.js", () => ({
  db: { get: vi.fn().mockResolvedValue(null), set: vi.fn(), del: vi.fn() },
}));

import { useAuthSession } from "../../src/hooks/useAuthSession.js";

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
