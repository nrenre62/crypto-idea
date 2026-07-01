import { describe, it, expect } from "vitest";
import { buildPortfolioCsv } from "../../src/utils/export-csv.js";

const lines = (csv) => csv.split(/\r?\n/);

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
            // intentionally out of date order to prove the export sorts newest-first (R19-5)
            { type: "sell", amount: 0.2, priceAtBuy: 50000, date: "2024-06-01" },
            { type: "buy", amount: 0.5, priceAtBuy: 40000, date: "2024-01-01" },
          ],
        },
        {
          id: "ethereum", symbol: "eth", name: "Ethereum",
          transactions: [{ type: "buy", amount: 2, priceAtBuy: 1000, date: "2024-02-01" }],
        },
      ],
    },
  ],
};

describe("buildPortfolioCsv", () => {
  it("holdings row shows amount held, avg buy price, total invested and total sold", () => {
    const csv = buildPortfolioCsv(sample);
    expect(csv).toContain("HOLDINGS");
    const header = lines(csv).find((l) => l.startsWith("Portfolio,Coin,Symbol"));
    expect(header).toContain("Amount held");
    expect(header).toContain("Avg buy price (USD)");
    expect(header).toContain("Total invested (USD)");
    expect(header).toContain("Total sold (USD)");

    const btc = lines(csv).find((l) => l.includes("Bitcoin") && l.includes("BTC"));
    // held 0.3, avg 40000, invested 20000, sold 10000, 2 transactions
    expect(btc).toContain("0.3");
    expect(btc).toContain("40000");
    expect(btc).toContain("20000");
    expect(btc).toContain("10000");
  });

  it("includes a grand TOTAL row summing invested and sold across coins", () => {
    const csv = buildPortfolioCsv(sample);
    const total = lines(csv).find((l) => l.startsWith("TOTAL"));
    expect(total).toBeTruthy();
    // invested = 20000 (btc) + 2000 (eth) = 22000 ; sold = 10000
    expect(total).toContain("22000");
    expect(total).toContain("10000");
  });

  it("transactions are listed newest-first (R19-5 — matches the app view)", () => {
    const csv = buildPortfolioCsv(sample);
    const ls = lines(csv);
    const buyIdx = ls.findIndex((l) => l.includes("2024-01-01"));
    const sellIdx = ls.findIndex((l) => l.includes("2024-06-01"));
    expect(sellIdx).toBeGreaterThan(-1);
    expect(buyIdx).toBeGreaterThan(sellIdx); // newer date (2024-06) comes first
  });

  it("transactions row has a value column (amount * price)", () => {
    const csv = buildPortfolioCsv(sample);
    expect(csv).toContain("TRANSACTIONS");
    const buy = lines(csv).find((l) => l.includes("buy") && l.includes("2024-01-01"));
    expect(buy).toContain("20000"); // 0.5 * 40000
  });

  it("escapes fields containing commas (the portfolio name)", () => {
    expect(buildPortfolioCsv(sample)).toContain('"My, Portfolio"');
  });

  it("does not crash on empty / missing data and still has both sections", () => {
    expect(() => buildPortfolioCsv(undefined)).not.toThrow();
    const csv = buildPortfolioCsv({ portfolios: [] });
    expect(csv).toContain("HOLDINGS");
    expect(csv).toContain("TRANSACTIONS");
  });
});
