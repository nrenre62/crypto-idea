import { describe, it, expect } from "vitest";
import { trashDaysLeft, partitionUsers } from "../../src/utils/trash.js";

const DAY = 24 * 60 * 60 * 1000;

describe("trashDaysLeft", () => {
  it("returns null when there is no deletedAt (account not trashed)", () => {
    expect(trashDaysLeft(null)).toBe(null);
    expect(trashDaysLeft(undefined)).toBe(null);
    expect(trashDaysLeft(0)).toBe(null);
  });

  it("returns the full window right after deletion", () => {
    const now = 1_000_000_000_000;
    expect(trashDaysLeft(now, now, 30)).toBe(30);
  });

  it("counts down as time passes", () => {
    const now = 1_000_000_000_000;
    expect(trashDaysLeft(now - 10 * DAY, now, 30)).toBe(20);
    expect(trashDaysLeft(now - 29.5 * DAY, now, 30)).toBe(1); // rounds up partial days
  });

  it("never goes below 0 once the window has passed", () => {
    const now = 1_000_000_000_000;
    expect(trashDaysLeft(now - 40 * DAY, now, 30)).toBe(0);
  });
});

describe("partitionUsers", () => {
  const list = [
    { uid: "a", deleted: false },
    { uid: "b", deleted: true },
    { uid: "c" },                 // no flag => active
  ];

  it("splits a user list into active (Users tab) and trashed (Trash tab)", () => {
    const { active, trashed } = partitionUsers(list);
    expect(active.map(u => u.uid)).toEqual(["a", "c"]);
    expect(trashed.map(u => u.uid)).toEqual(["b"]);
  });

  it("a self-restored account (deleted:false) leaves Trash and rejoins the active list", () => {
    // Models the requirement: after the user restores themselves, the admin's Trash is
    // empty and the account is back in the normal Users list — no admin action needed.
    const afterRestore = list.map(u => u.uid === "b" ? { ...u, deleted: false, deletedAt: null } : u);
    const { active, trashed } = partitionUsers(afterRestore);
    expect(trashed).toHaveLength(0);
    expect(active.map(u => u.uid)).toContain("b");
  });

  it("handles empty / missing input", () => {
    expect(partitionUsers(undefined)).toEqual({ active: [], trashed: [] });
    expect(partitionUsers([])).toEqual({ active: [], trashed: [] });
  });
});
