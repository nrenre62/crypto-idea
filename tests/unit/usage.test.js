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

  it("PLAN-LIMITS-MAX Part B: counts tx via the persisted txCount when entries aren't loaded", () => {
    // A lazy-loaded (non-active) portfolio carries coins with txCount but entries:[] — the tx
    // total must read txCount, not the empty entries array, or a multi-portfolio user's usage
    // would silently under-count. The active portfolio still has real entries.
    const lims = { maxCoinsPerPort: 100, maxPortfolios: 3, maxTxPerCoin: 300 };
    const all = [
      { coins: [{ entries: [1, 2, 3] }] },                    // active: 3 real entries
      { coins: [{ txCount: 40, entries: [] }, { txCount: 7, entries: [] }] }, // lazy: 47 via txCount
    ];
    const r = usagePercents(1, all, lims);
    // total tx = 3 + 40 + 7 = 50; maxTotalTx = 3*100*300 = 90,000 -> ~0.06% -> 0
    expect(r.txPct).toBe(0);
    // Prove the count itself: raise the cap so the percentage is measurable.
    const r2 = usagePercents(1, all, { maxCoinsPerPort: 1, maxPortfolios: 1, maxTxPerCoin: 50 });
    expect(r2.txPct).toBe(100); // 50 / (1*1*50) = 100%
  });
});
