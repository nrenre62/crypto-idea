import { describe, it, expect } from "vitest";
import { fmtPriceInput, sanitizeDecimal, blockDecimalKey, normalizeLeadingDot } from "../../src/utils/format.js";

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

// TX-SAFE (Part A): the Buy/Sell Amount + Price fields let unlimited e/./+ garbage
// in and had no digit cap. sanitizeDecimal is the pure backstop (onChange + paste);
// blockDecimalKey is the keydown guard that keeps a <input type=number> out of the
// badInput state; normalizeLeadingDot is the on-blur ".5" -> "0.5" tidy-up.
describe("TX-SAFE sanitizeDecimal", () => {
  it("TX-SAFE: strips scientific notation and signs (the reported garbage)", () => {
    expect(sanitizeDecimal("1e5")).toBe("15");     // e dropped, digits kept
    expect(sanitizeDecimal("1E3")).toBe("13");
    expect(sanitizeDecimal("+42")).toBe("42");
    expect(sanitizeDecimal("-42")).toBe("42");     // superset of the old R10-2 minus-strip
    expect(sanitizeDecimal("12.3.4e5+")).toBe("12.345");
  });
  it("TX-SAFE: keeps a single dot but never a second one", () => {
    expect(sanitizeDecimal("0.5")).toBe("0.5");
    expect(sanitizeDecimal("123.45")).toBe("123.45");
    expect(sanitizeDecimal("1.2.3")).toBe("1.23");   // 2nd dot dropped
    expect(sanitizeDecimal("...5")).toBe(".5");       // only the first dot survives
  });
  it("TX-SAFE: preserves legitimate small fractions", () => {
    expect(sanitizeDecimal("0.000006")).toBe("0.000006");
  });
  it("TX-SAFE: caps at 15 digit chars (the dot does not count)", () => {
    expect(sanitizeDecimal("1234567890123456")).toBe("123456789012345"); // 16 -> 15
    expect(sanitizeDecimal("1234567890.123456")).toBe("1234567890.12345"); // 16 digits -> 15, dot kept
    expect(sanitizeDecimal("123456", { maxDigits: 3 })).toBe("123");
  });
  it("TX-SAFE: drops any non-digit/non-dot (paste of a formatted number)", () => {
    expect(sanitizeDecimal("$1,234.56")).toBe("1234.56");
    expect(sanitizeDecimal("abc12.3xyz")).toBe("12.3");
    expect(sanitizeDecimal("1 234")).toBe("1234");
  });
  it("TX-SAFE: null / empty -> ''", () => {
    expect(sanitizeDecimal("")).toBe("");
    expect(sanitizeDecimal(null)).toBe("");
    expect(sanitizeDecimal(undefined)).toBe("");
  });
});

describe("TX-SAFE blockDecimalKey (keydown guard)", () => {
  it("TX-SAFE: blocks e/E/+/- always", () => {
    expect(blockDecimalKey("e", "1")).toBe(true);
    expect(blockDecimalKey("E", "1")).toBe(true);
    expect(blockDecimalKey("+", "")).toBe(true);
    expect(blockDecimalKey("-", "")).toBe(true);
  });
  it("TX-SAFE: allows the first dot, blocks a second", () => {
    expect(blockDecimalKey(".", "12")).toBe(false);
    expect(blockDecimalKey(".", "1.2")).toBe(true);
  });
  it("TX-SAFE: allows digits under the cap, blocks the 16th", () => {
    expect(blockDecimalKey("5", "1234")).toBe(false);
    expect(blockDecimalKey("5", "123456789012345")).toBe(true);   // already 15 digits
    expect(blockDecimalKey("5", "1234567890.2345")).toBe(false);  // 14 digits (dot excluded)
  });
  it("TX-SAFE: lets named/control keys through", () => {
    expect(blockDecimalKey("Backspace", "1")).toBe(false);
    expect(blockDecimalKey("ArrowLeft", "1")).toBe(false);
    expect(blockDecimalKey("Tab", "")).toBe(false);
  });
});

describe("TX-SAFE normalizeLeadingDot (on blur)", () => {
  it("TX-SAFE: '.5' -> '0.5', lone '.' -> '', others unchanged", () => {
    expect(normalizeLeadingDot(".5")).toBe("0.5");
    expect(normalizeLeadingDot(".")).toBe("");
    expect(normalizeLeadingDot("0.5")).toBe("0.5");
    expect(normalizeLeadingDot("12")).toBe("12");
    expect(normalizeLeadingDot("")).toBe("");
  });
});
