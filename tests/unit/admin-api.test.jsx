import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("firebase/functions", () => ({ httpsCallable: vi.fn() }));
vi.mock("../../src/api/firebase.config.js", () => ({ functions: { _tag: "fns" } }));

import { httpsCallable } from "firebase/functions";
import {
  getStats, listUsers, listAudit, lookupUser,
  setUserTier, setPremiumLimits, suspendUser, deleteUser, getAdminConfig, saveConfig,
  setAdminClaim, adminTrashUser, adminSignOutUser,
} from "../../src/api/admin.js";

// Each wrapper should target its named callable on the shared functions instance
// and unwrap the payload the dashboard expects.
describe("api/admin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getStats returns the stats payload", async () => {
    const call = vi.fn().mockResolvedValue({ data: { totalUsers: 7 } });
    httpsCallable.mockReturnValue(call);
    expect(await getStats()).toEqual({ totalUsers: 7 });
    expect(httpsCallable).toHaveBeenCalledWith({ _tag: "fns" }, "getStats");
  });

  it("listUsers unwraps data.users to an array (and defaults to [])", async () => {
    httpsCallable.mockReturnValue(vi.fn().mockResolvedValue({ data: { users: [{ uid: "a" }] } }));
    expect(await listUsers()).toEqual([{ uid: "a" }]);
    httpsCallable.mockReturnValue(vi.fn().mockResolvedValue({ data: {} }));
    expect(await listUsers()).toEqual([]);
  });

  it("listAudit passes the limit and unwraps entries (default limit 100)", async () => {
    const call = vi.fn().mockResolvedValue({ data: { entries: [1, 2] } });
    httpsCallable.mockReturnValue(call);
    expect(await listAudit()).toEqual([1, 2]);
    expect(call).toHaveBeenCalledWith({ limit: 100 });
    await listAudit(25);
    expect(call).toHaveBeenLastCalledWith({ limit: 25 });
  });

  it("lookupUser sends the email and returns the user detail", async () => {
    const call = vi.fn().mockResolvedValue({ data: { uid: "u1", tier: "pro" } });
    httpsCallable.mockReturnValue(call);
    expect(await lookupUser("a@b.com")).toEqual({ uid: "u1", tier: "pro" });
    expect(call).toHaveBeenCalledWith({ email: "a@b.com" });
  });

  it("setUserTier / suspendUser / deleteUser send the right args", async () => {
    const call = vi.fn().mockResolvedValue({});
    httpsCallable.mockReturnValue(call);
    await setUserTier("u1", "premium");
    expect(call).toHaveBeenCalledWith({ uid: "u1", tier: "premium" });
    await suspendUser("u1", true);
    expect(call).toHaveBeenCalledWith({ uid: "u1", disabled: true });
    await deleteUser("u1");
    expect(call).toHaveBeenCalledWith({ uid: "u1" });
  });

  it("BL-2: setAdminClaim / adminTrashUser / adminSignOutUser target their callables with the right args", async () => {
    const call = vi.fn().mockResolvedValue({ data: { success: true } });
    httpsCallable.mockReturnValue(call);
    await setAdminClaim("a@b.com", true);
    expect(httpsCallable).toHaveBeenCalledWith({ _tag: "fns" }, "setAdminClaim");
    expect(call).toHaveBeenCalledWith({ email: "a@b.com", admin: true });
    await adminTrashUser("u1");
    expect(httpsCallable).toHaveBeenCalledWith({ _tag: "fns" }, "adminTrashUser");
    expect(call).toHaveBeenCalledWith({ uid: "u1" });
    await adminSignOutUser("u1");
    expect(httpsCallable).toHaveBeenCalledWith({ _tag: "fns" }, "adminSignOutUser");
    expect(call).toHaveBeenCalledWith({ uid: "u1" });
  });

  it("setPremiumLimits forwards uid+limits and returns the stored payload (U11/S8)", async () => {
    const call = vi.fn().mockResolvedValue({ data: { success: true, uid: "u1", premiumLimits: { coins: 800 } } });
    httpsCallable.mockReturnValue(call);
    const out = await setPremiumLimits("u1", { coins: 800 });
    expect(httpsCallable).toHaveBeenCalledWith({ _tag: "fns" }, "setPremiumLimits");
    expect(call).toHaveBeenCalledWith({ uid: "u1", limits: { coins: 800 } });
    expect(out).toEqual({ success: true, uid: "u1", premiumLimits: { coins: 800 } });
  });

  it("getAdminConfig returns the config object (defaults to {})", async () => {
    httpsCallable.mockReturnValue(vi.fn().mockResolvedValue({ data: { coingeckoSet: true } }));
    expect(await getAdminConfig()).toEqual({ coingeckoSet: true });
    httpsCallable.mockReturnValue(vi.fn().mockResolvedValue({}));
    expect(await getAdminConfig()).toEqual({});
  });

  it("saveConfig forwards the payload to the saveConfig callable", async () => {
    const call = vi.fn().mockResolvedValue({});
    httpsCallable.mockReturnValue(call);
    const payload = { keys: {}, email: {}, flags: { maintenance: false } };
    await saveConfig(payload);
    expect(httpsCallable).toHaveBeenCalledWith({ _tag: "fns" }, "saveConfig");
    expect(call).toHaveBeenCalledWith(payload);
  });
});
