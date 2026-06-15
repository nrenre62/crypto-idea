import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("firebase/functions", () => ({ httpsCallable: vi.fn() }));
vi.mock("../../src/api/firebase.config.js", () => ({ functions: { _tag: "fns" } }));

import { httpsCallable } from "firebase/functions";
import { exportMyData, deleteMyAccount } from "../../src/api/account.js";

describe("api/account", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exportMyData calls the exportMyData callable and returns its payload", async () => {
    const call = vi.fn().mockResolvedValue({ data: { coins: 3 } });
    httpsCallable.mockReturnValue(call);
    const data = await exportMyData();
    expect(httpsCallable).toHaveBeenCalledWith({ _tag: "fns" }, "exportMyData");
    expect(data).toEqual({ coins: 3 });
  });

  it("deleteMyAccount invokes the deleteMyAccount callable", async () => {
    const call = vi.fn().mockResolvedValue({});
    httpsCallable.mockReturnValue(call);
    await deleteMyAccount();
    expect(httpsCallable).toHaveBeenCalledWith({ _tag: "fns" }, "deleteMyAccount");
    expect(call).toHaveBeenCalled();
  });
});
