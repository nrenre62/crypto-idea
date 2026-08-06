import { describe, it, expect } from "vitest";
// A1: money display must round to the nearest CENT and split into a whole-dollar part
// + a 2-digit cents part, so the dollars line never disappears a rounded-up dollar.
// `splitMoney` is the pure helper that centralises that (does not exist yet → red).
import { splitMoney } from "../../src/utils/money.js";

describe("splitMoney (A1: $1 rounding)", () => {
  it("A1: rounds 100.999 up to a whole $101.00 (no lost dollar)", () => {
    expect(splitMoney(100.999)).toEqual({ dollars: 101, cents: "00" });
  });

  it("A1: rounds 1.999 up to $2.00", () => {
    expect(splitMoney(1.999)).toEqual({ dollars: 2, cents: "00" });
  });

  it("A1: 0 is $0.00", () => {
    expect(splitMoney(0)).toEqual({ dollars: 0, cents: "00" });
  });

  it("A1: 1234.5 keeps its half-dollar as $1234.50", () => {
    expect(splitMoney(1234.5)).toEqual({ dollars: 1234, cents: "50" });
  });

  it("A1: a negative -1.5 splits to dollars -1 / cents 50", () => {
    expect(splitMoney(-1.5)).toEqual({ dollars: -1, cents: "50" });
  });
});
