import { describe, it, expect } from "vitest";
import { holdings, buysCost, sellsGain, coinPnl, portfolioPnl } from "../../src/utils/pnl.js";

const buy = (amount, priceAtBuy) => ({ type: "buy", amount, priceAtBuy });
const sell = (amount, priceAtBuy) => ({ type: "sell", amount, priceAtBuy });

describe("utils/pnl", () => {
  it("holdings nets buys minus sells and never goes negative", () => {
    expect(holdings([buy(2, 100), buy(1, 200)])).toBe(3);
    expect(holdings([buy(2, 100), sell(0.5, 300)])).toBe(1.5);
    expect(holdings([buy(1, 100), sell(5, 300)])).toBe(0); // clamped
    expect(holdings([])).toBe(0);
    expect(holdings(undefined)).toBe(0);
  });

  it("buysCost and sellsGain sum amount × price for each side", () => {
    const e = [buy(2, 100), buy(1, 50), sell(1, 300)];
    expect(buysCost(e)).toBe(250);   // 2*100 + 1*50
    expect(sellsGain(e)).toBe(300);  // 1*300
  });

  it("coinPnl computes value, pnl and pnl% for a buy-only position", () => {
    // bought 2 @ 100 (cost 200), price now 150 -> value 300, pnl +100 (+50%)
    const r = coinPnl([buy(2, 100)], 150);
    expect(r.holding).toBe(2);
    expect(r.value).toBe(300);
    expect(r.buysCost).toBe(200);
    expect(r.pnl).toBe(100);
    expect(r.pnlPct).toBe(50);
  });

  it("coinPnl counts realised sell proceeds toward pnl", () => {
    // bought 2 @ 100 (cost 200), sold 1 @ 300 (proceeds 300), 1 left @ 150 (value 150)
    // pnl = (150 + 300) - 200 = 250
    const r = coinPnl([buy(2, 100), sell(1, 300)], 150);
    expect(r.holding).toBe(1);
    expect(r.value).toBe(150);
    expect(r.sellsGain).toBe(300);
    expect(r.pnl).toBe(250);
    expect(r.pnlPct).toBeCloseTo(125, 5); // 250/200 * 100
  });

  it("coinPnl returns 0% when there is no buy cost", () => {
    const r = coinPnl([], 100);
    expect(r.pnl).toBe(0);
    expect(r.pnlPct).toBe(0);
  });

  it("portfolioPnl aggregates value/buys/pnl across coins using the price map", () => {
    const coins = [
      { id: "btc", entries: [buy(1, 100)] },
      { id: "eth", entries: [buy(2, 50), sell(1, 80)] },
    ];
    const prices = { btc: { usd: 150 }, eth: { usd: 60 } };
    const r = portfolioPnl(coins, prices);
    // btc: hold 1 @150 = 150, cost 100
    // eth: hold 1 @60 = 60, cost 100, sold 80
    expect(r.value).toBe(210);        // 150 + 60
    expect(r.totalBuys).toBe(200);    // 100 + 100
    expect(r.totalSells).toBe(80);
    expect(r.invested).toBe(120);     // 200 - 80
    expect(r.pnl).toBe(90);           // (210 + 80) - 200
  });

  it("portfolioPnl treats a missing price as 0", () => {
    const r = portfolioPnl([{ id: "x", entries: [buy(1, 100)] }], {});
    expect(r.value).toBe(0);
    expect(r.pnl).toBe(-100);
  });
});
