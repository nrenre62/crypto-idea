import { describe, it, expect } from "vitest";
import { coinColor } from "../../src/components/ui.jsx";

const HEX6 = /^#[0-9a-fA-F]{6}$/;

describe("coinColor (token-circle palette)", () => {
  it("returns the brand color for known symbols, case-insensitively", () => {
    expect(coinColor("BTC")).toBe("#F7931A");
    expect(coinColor("btc")).toBe("#F7931A"); // uppercased before lookup
    expect(coinColor("eth")).toBe("#627EEA");
    expect(coinColor("link")).toBe("#2A5ADA");
  });

  it("every brand color is a valid 6-digit hex so the +'30' alpha tint is valid", () => {
    // TAO used to be '#000' (3-digit) -> '#00030' broke the tint; guard against regressions.
    ["BTC", "ETH", "SOL", "ADA", "LINK", "TAO", "BNB", "XRP", "RNDR", "STX"].forEach((s) =>
      expect(coinColor(s)).toMatch(HEX6)
    );
  });

  it("falls back to a deterministic, valid 6-digit hex for unknown coins", () => {
    expect(coinColor("ZZZ")).toBe(coinColor("ZZZ"));      // stable for the same symbol
    expect(coinColor("ZZZ")).toMatch(HEX6);               // always a valid color
    expect(coinColor("wif")).toBe(coinColor("WIF"));      // case-insensitive in the fallback too
    expect(coinColor("")).toMatch(HEX6);                  // empty symbol still yields a valid color
  });
});
