import { describe, it, expect } from "vitest";
import { holdings, buysCost, sellsGain, realizedProceeds, coinPnl, portfolioPnl, portfolio24hPct } from "../../src/utils/pnl.js";

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

  // CRYP-94 (Group B, finding 7): an OVER-SOLD coin (holdings clamps to 0, but the raw sell
  // proceeds are counted in full) shows a phantom realized gain. realizedProceeds clamps the
  // proceeds proportionally to the real position (bought/sold), so P/L can't exceed a real basis.
  describe("realizedProceeds clamps phantom over-sold gains (finding 7)", () => {
    it("CRYP-94: a NORMAL book (sold <= bought) is unchanged — proceeds == raw sellsGain", () => {
      const e = [buy(2, 100), sell(1, 300)];
      expect(realizedProceeds(e)).toBe(300);      // 1 * 300, not clamped
      expect(realizedProceeds(e)).toBe(sellsGain(e));
    });

    it("CRYP-94: an OVER-SOLD book scales proceeds by bought/sold", () => {
      // bought 0.3, sold 6 → raw proceeds 6*200=1200, but only 0.3 units were ever held
      const e = [buy(0.3, 100), sell(6, 200)];
      expect(sellsGain(e)).toBe(1200);            // raw sell proceeds (still shown as-is)
      expect(realizedProceeds(e)).toBeCloseTo(60, 8);   // 1200 * (0.3/6)
    });

    it("CRYP-94: coinPnl uses the clamped proceeds — no phantom '+1900%'", () => {
      // the founder exploit's end state: bought 0.3 @100 (cost 30), sold 6 @200, holding 0
      const r = coinPnl([buy(0.3, 100), sell(6, 200)], 150);
      expect(r.holding).toBe(0);
      expect(r.sellsGain).toBe(1200);             // raw proceeds preserved for the "Sold" display
      // honest P/L: (value 0 + clamped 60) - cost 30 = 30 → +100%, NOT (1200-30)=+3900%
      expect(r.pnl).toBeCloseTo(30, 6);
      expect(r.pnlPct).toBeCloseTo(100, 6);
    });

    it("CRYP-94: portfolioPnl does not inflate total P/L from an over-sold coin", () => {
      const coins = [{ id: "x", entries: [buy(0.3, 100), sell(6, 200)] }];
      const r = portfolioPnl(coins, { x: { usd: 150 } });
      expect(r.pnl).toBeCloseTo(30, 6);           // clamped, not 1170
    });
  });

  // CRYP-94 (Group B, finding 8): a held coin whose price hasn't loaded (price == null) is
  // UNKNOWN, not worthless — value & total P/L are null (rendered as a muted "—"), never a
  // $0 / −100% loss. A genuine 0 price IS worthless (known). A fully-sold position needs no price.
  describe("coinPnl distinguishes an unknown price from worthless (finding 8)", () => {
    it("CRYP-94: a held coin with an unknown (null) price → value & P/L are null (not −100%)", () => {
      const r = coinPnl([buy(1, 100)], null);
      expect(r.value).toBeNull();
      expect(r.pnl).toBeNull();
      expect(r.pnlPct).toBeNull();
      expect(r.priceKnown).toBe(false);
    });
    it("CRYP-94: an undefined price is also unknown", () => {
      expect(coinPnl([buy(1, 100)], undefined).pnl).toBeNull();
    });
    it("CRYP-94: a GENUINE 0 price is worthless (known), not unknown → −100%", () => {
      const r = coinPnl([buy(1, 100)], 0);
      expect(r.priceKnown).toBe(true);
      expect(r.value).toBe(0);
      expect(r.pnl).toBe(-100);
    });
    it("CRYP-94: a fully-sold position needs no price — realised P/L stays known", () => {
      const r = coinPnl([buy(1, 100), sell(1, 150)], null);   // holding 0
      expect(r.value).toBe(0);
      expect(r.pnl).toBe(50);       // realised 150 − cost 100
    });
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

  // CRYP-94 (finding 8): an unpriced HELD coin is excluded from value & P/L (never a −100%
  // drag), but its cost still counts in Invested — a price-independent cash figure.
  it("CRYP-94: portfolioPnl excludes an unpriced held coin from P/L, keeps its cost in Invested", () => {
    const r = portfolioPnl([{ id: "x", entries: [buy(1, 100)] }], {});
    expect(r.value).toBe(0);          // unknown value contributes nothing
    expect(r.totalBuys).toBe(100);    // Invested stays complete
    expect(r.invested).toBe(100);
    expect(r.pnl).toBe(0);            // excluded from P/L → NOT −100
    expect(r.pnlPct).toBe(0);
  });

  it("CRYP-94: an unpriced holding doesn't drag a priced coin's portfolio P/L", () => {
    const coins = [
      { id: "btc", entries: [buy(1, 100)] },   // priced → +50
      { id: "obs", entries: [buy(1, 100)] },   // unpriced → excluded from P/L
    ];
    const r = portfolioPnl(coins, { btc: { usd: 150 } });
    expect(r.pnl).toBe(50);          // only btc contributes; obs doesn't drag it to −50
    expect(r.pnlPct).toBe(50);       // over btc's cost only
    expect(r.totalBuys).toBe(200);   // Invested still counts both
  });

  it("portfolio24hPct value-weights each holding's 24h change", () => {
    const coins = [
      { id: "btc", entries: [buy(1, 100)] },   // value 150
      { id: "eth", entries: [buy(1, 50)] },    // value 60
    ];
    const prices = { btc: { usd: 150, usd_24h_change: 10 }, eth: { usd: 60, usd_24h_change: -5 } };
    // weighted = 150*10 + 60*(-5) = 1200 ; totalVal = 210 ; pct = 1200/210
    expect(portfolio24hPct(coins, prices)).toBeCloseTo(5.7142857, 5);
  });

  it("portfolio24hPct treats a missing 24h change or price as 0 and is 0 for an empty book", () => {
    const coins = [
      { id: "btc", entries: [buy(1, 100)] },   // value 100, change +20
      { id: "eth", entries: [buy(1, 50)] },    // value 50, change missing -> 0
    ];
    const prices = { btc: { usd: 100, usd_24h_change: 20 }, eth: { usd: 50 } };
    // weighted = 100*20 + 50*0 = 2000 ; totalVal = 150 ; pct = 13.333...
    expect(portfolio24hPct(coins, prices)).toBeCloseTo(13.3333333, 5);
    expect(portfolio24hPct([], {})).toBe(0);
    expect(portfolio24hPct(undefined, undefined)).toBe(0);
    // zero total value (no price) -> 0, not NaN
    expect(portfolio24hPct([{ id: "z", entries: [buy(1, 100)] }], {})).toBe(0);
  });
});
