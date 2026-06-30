import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "../../src/utils/storage.js";

// C-R2a: the db wrapper must actually PERSIST to localStorage (it previously wrapped a
// non-existent window.storage and silently no-op'd). jsdom provides a real localStorage.
describe("storage.db (localStorage wrapper)", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a JSON value via set/get", async () => {
    expect(await db.set("ci-active-port", "p2")).toBe(true);
    expect(localStorage.getItem("ci-active-port")).toBe('"p2"'); // really written
    expect(await db.get("ci-active-port")).toBe("p2");
  });

  it("round-trips an object", async () => {
    await db.set("ci-profile-u1", { name: "Ada", tier: "pro" });
    expect(await db.get("ci-profile-u1")).toEqual({ name: "Ada", tier: "pro" });
  });

  it("returns null for a missing key", async () => {
    expect(await db.get("nope")).toBeNull();
  });

  it("del removes a key (get → null afterwards)", async () => {
    await db.set("ci-active-port", "p2");
    expect(await db.del("ci-active-port")).toBe(true);
    expect(localStorage.getItem("ci-active-port")).toBeNull();
    expect(await db.get("ci-active-port")).toBeNull();
  });

  it("degrades gracefully when localStorage throws (set → false, get → null)", async () => {
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(await db.set("k", "v")).toBe(false);
    setSpy.mockRestore();
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(await db.get("k")).toBeNull();
    getSpy.mockRestore();
  });

  it("returns null on corrupt JSON instead of throwing", async () => {
    localStorage.setItem("bad", "{not json");
    expect(await db.get("bad")).toBeNull();
  });

  afterEach(() => localStorage.clear());
});
