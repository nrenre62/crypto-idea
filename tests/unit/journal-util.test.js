import { describe, it, expect } from "vitest";
import { cleanFunnel, thesisError } from "../../src/utils/journal.js";

// thesisError (§J3): both "Why you bought it" + "What would change your mind" are
// required to save a thesis; the manual-research funnel stays optional.
describe("thesisError", () => {
  it("flags an empty thesis (nothing written)", () => {
    expect(thesisError("", "")).toMatch(/haven.t written/i);
    expect(thesisError("   ", "\n")).toMatch(/haven.t written/i);
  });
  it("flags only the missing 'Why you bought it'", () => {
    const e = thesisError("", "GitHub goes quiet");
    expect(e).toMatch(/Why you bought it/i);
    expect(e).toMatch(/required/i);
  });
  it("flags only the missing 'What would change your mind'", () => {
    const e = thesisError("active GitHub", "");
    expect(e).toMatch(/What would change your mind/i);
    expect(e).toMatch(/required/i);
  });
  it("returns empty string when both are filled (funnel not required)", () => {
    expect(thesisError("active GitHub", "GitHub goes quiet")).toBe("");
    expect(thesisError("  a  ", "  b  ")).toBe("");
  });
});

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
