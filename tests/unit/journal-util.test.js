import { describe, it, expect } from "vitest";
import { cleanFunnel } from "../../src/utils/journal.js";

// cleanFunnel turns the three raw funnel text inputs (#27) into a stored object,
// or null when there's nothing worth persisting.
describe("cleanFunnel", () => {
  it("returns null for null/undefined input", () => {
    expect(cleanFunnel(null)).toBe(null);
    expect(cleanFunnel(undefined)).toBe(null);
  });

  it("returns null when every field is empty or whitespace", () => {
    expect(cleanFunnel({ dilution: "", volume: "   ", yield: "\n" })).toBe(null);
  });

  it("keeps only the non-empty fields, trimmed", () => {
    expect(cleanFunnel({ dilution: "  big unlock  ", volume: "", yield: "real fees" })).toEqual({
      dilution: "big unlock",
      yield: "real fees",
    });
  });

  it("ignores unknown keys", () => {
    expect(cleanFunnel({ dilution: "x", bogus: "nope" })).toEqual({ dilution: "x" });
  });

  it("tolerates missing fields", () => {
    expect(cleanFunnel({ volume: "thin book" })).toEqual({ volume: "thin book" });
  });
});
