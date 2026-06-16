import { describe, it, expect } from "vitest";
import { fmtPriceInput } from "../../src/utils/format.js";

// fmtPriceInput was duplicated inline in AddEntry + Detail; now shared from format.js.
describe("fmtPriceInput", () => {
  it("returns '' for a non-positive or missing price", () => {
    expect(fmtPriceInput(0)).toBe("");
    expect(fmtPriceInput(-5)).toBe("");
    expect(fmtPriceInput(null)).toBe("");
    expect(fmtPriceInput(undefined)).toBe("");
  });

  it("uses more decimal places as the price shrinks", () => {
    expect(fmtPriceInput(42)).toBe("42.00");                    // >=1   -> 2dp
    expect(fmtPriceInput(0.0005)).toBe("0.000500");             // >=1e-4 -> 6dp
    expect(fmtPriceInput(0.00005)).toBe("0.0000500000");        // >=1e-7 -> 10dp
    expect(fmtPriceInput(0.00000001)).toBe("0.000000010000");   // <1e-7  -> 12dp
  });
});
