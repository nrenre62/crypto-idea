import { describe, it, expect } from "vitest";
import { priceAtDate } from "../../src/utils/coins.js";

// Real-history lookup used to auto-fill an accurate buy-date price for any coin.
describe("priceAtDate", () => {
  // ascending [tsMs, price] points: 2023-01-01, 2024-01-01, 2025-01-01
  const prices = [
    [Date.UTC(2023, 0, 1), 16500],
    [Date.UTC(2024, 0, 1), 42000],
    [Date.UTC(2025, 0, 1), 94000],
  ];

  it("returns the point on/before the requested date", () => {
    expect(priceAtDate(prices, new Date(Date.UTC(2024, 5, 1)))).toBe(42000); // mid-2024 -> 2024 point
    expect(priceAtDate(prices, new Date(Date.UTC(2024, 0, 1)))).toBe(42000); // exact match
  });

  it("clamps to the first point when the date predates history", () => {
    expect(priceAtDate(prices, new Date(Date.UTC(2020, 0, 1)))).toBe(16500);
  });

  it("returns the last point for a date after all history", () => {
    expect(priceAtDate(prices, new Date(Date.UTC(2030, 0, 1)))).toBe(94000);
  });

  it("accepts a date string and is null-safe for bad input", () => {
    expect(priceAtDate(prices, "2024-01-01")).toBe(42000);
    expect(priceAtDate([], new Date())).toBeNull();
    expect(priceAtDate(null, new Date())).toBeNull();
    expect(priceAtDate(prices, "not-a-date")).toBeNull();
  });
});
