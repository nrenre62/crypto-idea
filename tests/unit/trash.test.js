import { describe, it, expect } from "vitest";
import { trashDaysLeft } from "../../src/utils/trash.js";

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
