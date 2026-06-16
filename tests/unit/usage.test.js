import { describe, it, expect } from "vitest";
import { usagePercents } from "../../src/utils/usage.js";

describe("utils/usage", () => {
  const limits = { maxCoinsPerPort: 10, maxPortfolios: 1, maxTxPerCoin: 50 };

  it("computes coin% from the active portfolio and tx% across all portfolios", () => {
    // all portfolios hold 4 transactions total
    const all = [{ coins: [{ entries: [1, 2, 3] }, { entries: [1] }] }];
    const r = usagePercents(5, all, limits); // active portfolio has 5 coins
    expect(r.coinPct).toBe(50);  // 5 / 10
    expect(r.txPct).toBe(1);     // 4 / (1*10*50)=500 -> 0.8% -> 1
    expect(r.usagePct).toBe(50); // max(50, 1)
  });

  it("returns zeros when limits are zero (no divide-by-zero)", () => {
    expect(usagePercents(5, [], { maxCoinsPerPort: 0, maxPortfolios: 0, maxTxPerCoin: 0 }))
      .toEqual({ coinPct: 0, txPct: 0, usagePct: 0 });
  });

  it("usagePct is the larger of the two percentages", () => {
    // 1 coin (cap 100 -> 1%), 50 tx (cap 1*100*50=5000 -> 1%)
    const all = [{ coins: [{ entries: Array.from({ length: 50 }, () => 1) }] }];
    const r = usagePercents(1, all, { maxCoinsPerPort: 100, maxPortfolios: 1, maxTxPerCoin: 50 });
    expect(r.usagePct).toBe(Math.max(r.coinPct, r.txPct));
  });
});
