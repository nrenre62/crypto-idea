import { describe, it, expect } from "vitest";
import { holdingsFromCoins } from "../../src/features/research/utils/coins.js";
import { deriveFromHistory, buildResearchPrices } from "../../src/features/research/utils/priceAdapter.js";
import { computePortfolio } from "../../src/features/research/utils/portfolio.js";

const DAY = 86400000;
const BASE = 1_600_000_000_000;
// 31 daily points: price[i] = 100 + i  (i=0 → 100, i=23 → 123, i=30 → 130)
const history = Array.from({ length: 31 }, (_, i) => [BASE + i * DAY, 100 + i]);

describe("holdingsFromCoins — reads the app coin shape (entries / priceAtBuy / type)", () => {
  it("nets buys minus sells and weights avg cost over buys only", () => {
    const coins = [{
      id: "bitcoin", symbol: "btc", name: "Bitcoin",
      entries: [
        { type: "buy", amount: 1, priceAtBuy: 100 },
        { type: "buy", amount: 1, priceAtBuy: 300 },
        { type: "sell", amount: 0.5, priceAtBuy: 500 },
      ],
    }];
    const [h] = holdingsFromCoins(coins);
    expect(h.id).toBe("bitcoin");
    expect(h.sym).toBe("BTC");
    expect(h.name).toBe("Bitcoin");
    expect(h.amount).toBeCloseTo(1.5, 10);   // 1 + 1 − 0.5
    expect(h.avgCost).toBeCloseTo(200, 10);  // (1*100 + 1*300) / 2 bought
  });

  it("drops coins whose net amount is zero or negative", () => {
    const coins = [{
      id: "ethereum", symbol: "eth", name: "Ethereum",
      entries: [
        { type: "buy", amount: 2, priceAtBuy: 1000 },
        { type: "sell", amount: 2, priceAtBuy: 1500 },
      ],
    }];
    expect(holdingsFromCoins(coins)).toHaveLength(0);
  });

  it("preserves the coin's journal (thesis) so downstream can read it; omits it when absent", () => {
    const journal = { thesis: "real revenue + active devs", changeMyMind: "devs go quiet", status: "intact", priceAtAdd: 100, createdAt: "2026-01-01T00:00:00.000Z" };
    const [withJ] = holdingsFromCoins([{ id: "bitcoin", symbol: "btc", name: "Bitcoin", entries: [{ type: "buy", amount: 1, priceAtBuy: 100 }], journal }]);
    expect(withJ.journal).toEqual(journal);
    // No thesis → no `journal` key (matches the app's addCoin convention).
    const [noJ] = holdingsFromCoins([{ id: "ethereum", symbol: "eth", name: "Ethereum", entries: [{ type: "buy", amount: 1, priceAtBuy: 100 }] }]);
    expect("journal" in noJ).toBe(false);
  });
});

describe("deriveFromHistory — 7d/30d change + 7-day sparkline", () => {
  it("derives changes from the latest point at/before each target", () => {
    const d = deriveFromHistory(history);
    expect(d.last).toBe(130);
    expect(d.c30d).toBeCloseTo(30, 6);                 // 130 vs 100
    expect(d.c7d).toBeCloseTo((130 / 123 - 1) * 100, 6); // 130 vs 123
    expect(d.spark).toHaveLength(8);                    // i = 23..30
    expect(d.spark[d.spark.length - 1]).toBe(130);
  });

  it("never returns NaN for empty/thin history", () => {
    expect(deriveFromHistory([])).toEqual({ last: null, c7d: 0, c30d: 0, spark: null });
    expect(deriveFromHistory(null)).toEqual({ last: null, c7d: 0, c30d: 0, spark: null });
    expect(deriveFromHistory([[BASE, 50]]).spark).toBeNull(); // single point → no spark
  });
});

describe("buildResearchPrices — merges live prices with derived history", () => {
  it("uses live price + 24h, history for 7d/30d/spark", () => {
    const out = buildResearchPrices(
      ["bitcoin"],
      { bitcoin: { usd: 130, usd_24h_change: 2.5 } },
      { bitcoin: history }
    );
    expect(out.bitcoin.price).toBe(130);
    expect(out.bitcoin.c24).toBe(2.5);
    expect(out.bitcoin.c30d).toBeCloseTo(30, 6);
    expect(out.bitcoin.spark).toHaveLength(8);
  });

  it("falls back to safe zeros when neither live nor history is present", () => {
    const out = buildResearchPrices(["dogecoin"], {}, {});
    expect(out.dogecoin).toEqual({ price: 0, c24: 0, c7d: 0, c30d: 0, spark: null, marketCap: null, rank: null }); // rank added R23
  });

  it("uses the last history point as price when live is missing", () => {
    const out = buildResearchPrices(["bitcoin"], {}, { bitcoin: history });
    expect(out.bitcoin.price).toBe(130);
    expect(out.bitcoin.c24).toBe(0);
  });
});

describe("computePortfolio — carries each holding's journal through to portfolio.holdings (#17 enabler)", () => {
  it("keeps the journal alongside the computed price/value fields", () => {
    const journal = { thesis: "t", changeMyMind: "c", status: "intact", priceAtAdd: 100, createdAt: "2026-01-01T00:00:00.000Z" };
    const { holdings } = computePortfolio(
      [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 100, journal }],
      { bitcoin: { price: 200, c24: 0, c7d: 0, c30d: 0 } }
    );
    expect(holdings[0].journal).toEqual(journal); // available for the 0d allowlist + #17 context
    expect(holdings[0].value).toBe(200);          // still computes the derived fields
  });
});
