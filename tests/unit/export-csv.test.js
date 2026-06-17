import { describe, it, expect } from "vitest";
import { buildPortfolioCsv } from "../../src/utils/export-csv.js";

const sample = {
  exportedAt: "2026-06-17T00:00:00.000Z",
  account: { uid: "u1", email: "a@b.com" },
  portfolios: [
    {
      id: "p1", name: "My, Portfolio",
      coins: [
        {
          id: "bitcoin", symbol: "btc", name: "Bitcoin",
          transactions: [
            { type: "buy", amount: 0.5, priceAtBuy: 40000, date: "2024-01-01" },
            { type: "sell", amount: 0.2, priceAtBuy: 50000, date: "2024-06-01" },
          ],
        },
      ],
    },
  ],
};

describe("buildPortfolioCsv", () => {
  it("has a holdings section with net amount held (buys minus sells) and tx count", () => {
    const csv = buildPortfolioCsv(sample);
    expect(csv).toContain("HOLDINGS");
    expect(csv).toContain("Amount held");
    // net = 0.5 - 0.2 = 0.3, two transactions, symbol upper-cased
    const line = csv.split(/\r?\n/).find((l) => l.includes("Bitcoin") && l.includes("BTC"));
    expect(line).toContain("0.3");
    expect(line).toContain("2");
  });

  it("has a transactions section with a value column (amount * price)", () => {
    const csv = buildPortfolioCsv(sample);
    expect(csv).toContain("TRANSACTIONS");
    const buy = csv.split(/\r?\n/).find((l) => l.includes("buy"));
    expect(buy).toContain("20000"); // 0.5 * 40000
    const sell = csv.split(/\r?\n/).find((l) => l.includes("sell"));
    expect(sell).toContain("10000"); // 0.2 * 50000
  });

  it("escapes fields containing commas (the portfolio name)", () => {
    const csv = buildPortfolioCsv(sample);
    expect(csv).toContain('"My, Portfolio"');
  });

  it("does not crash on empty / missing data", () => {
    expect(() => buildPortfolioCsv({})).not.toThrow();
    expect(() => buildPortfolioCsv(undefined)).not.toThrow();
    const csv = buildPortfolioCsv({ portfolios: [] });
    expect(csv).toContain("HOLDINGS");
    expect(csv).toContain("TRANSACTIONS");
  });
});
