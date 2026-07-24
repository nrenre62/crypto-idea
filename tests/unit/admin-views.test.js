import { describe, it, expect } from "vitest";
import { loadViews, persistViews, addView, removeView } from "../../src/utils/admin-views.js";

// ADMIN-5 — saved Users-tab filter presets. A tiny in-memory storage stands in for
// localStorage.
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    _map: map,
  };
}

describe("admin-views", () => {
  it("round-trips views through storage", () => {
    const s = fakeStorage();
    const v = addView([], "Past due Pro", { q: "", tier: "pro", billing: "past_due" });
    persistViews(v, s);
    expect(loadViews(s)).toEqual(v);
  });

  it("returns [] for empty / corrupt storage", () => {
    expect(loadViews(fakeStorage())).toEqual([]);
    expect(loadViews(fakeStorage({ "ci-admin-user-views": "{not json" }))).toEqual([]);
    expect(loadViews(fakeStorage({ "ci-admin-user-views": '{"a":1}' }))).toEqual([]); // not an array
  });

  it("addView replaces a same-name view (case-insensitive) instead of duplicating", () => {
    let v = addView([], "Whales", { tier: "premium" });
    v = addView(v, "whales", { tier: "pro" });
    expect(v).toHaveLength(1);
    expect(v[0].filters.tier).toBe("pro");
  });

  it("ignores an empty name", () => {
    expect(addView([], "   ", { tier: "pro" })).toEqual([]);
  });

  it("removeView drops by name (case-insensitive)", () => {
    const v = addView(addView([], "A", {}), "B", {});
    expect(removeView(v, "a").map((x) => x.name)).toEqual(["B"]);
  });

  it("caps the number of stored views", () => {
    let v = [];
    for (let i = 0; i < 30; i++) v = addView(v, "view" + i, {});
    expect(v.length).toBeLessThanOrEqual(20);
  });
});
