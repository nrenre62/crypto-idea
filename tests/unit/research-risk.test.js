import { describe, it, expect } from "vitest";
import {
  marketCapTier, deriveRisk, riskNote, computePortfolio, FALLBACK_PRICES,
} from "../../src/features/research/utils/portfolio.js";
import { buildResearchPrices } from "../../src/features/research/utils/priceAdapter.js";

// Round 14: Portfolio risk = each coin's market-cap tier, allocation-weighted.

describe("marketCapTier (R14) — market-cap → risk tier", () => {
  it("classifies by the $100M / $1B / $100B thresholds", () => {
    expect(marketCapTier(99.9e6)).toBe("high");     // < $100M micro-cap
    expect(marketCapTier(1e8)).toBe("medium");      // $100M boundary
    expect(marketCapTier(5e8)).toBe("medium");
    expect(marketCapTier(1e9)).toBe("low");         // $1B boundary
    expect(marketCapTier(5e10)).toBe("low");
    expect(marketCapTier(1e11)).toBe("superlow");   // $100B boundary (BTC/ETH)
    expect(marketCapTier(1.3e12)).toBe("superlow");
  });
  it("treats unknown / invalid market cap as high (conservative default)", () => {
    expect(marketCapTier(null)).toBe("high");
    expect(marketCapTier(undefined)).toBe("high");
    expect(marketCapTier(NaN)).toBe("high");
    expect(marketCapTier(0)).toBe("high");
    expect(marketCapTier(-5)).toBe("high");
  });
});

describe("deriveRisk (R14) — allocation-weighted", () => {
  it("a large-cap-heavy book reads Low", () => {
    const r = deriveRisk([{ alloc: 90, marketCap: 1.3e12 }, { alloc: 10, marketCap: 5e7 }]);
    expect(r.level).toBe("Low");
    expect(r.score).toBeCloseTo(0.14, 2);
    expect(r.breakdown.superlow).toBe(90);
    expect(r.breakdown.high).toBe(10);
  });
  it("a micro-cap-heavy book reads High", () => {
    const r = deriveRisk([{ alloc: 90, marketCap: 5e7 }, { alloc: 10, marketCap: 1.3e12 }]);
    expect(r.level).toBe("High");
    expect(r.score).toBeCloseTo(0.86, 2);
  });
  it("a large/mid split reads Moderate", () => {
    const r = deriveRisk([{ alloc: 50, marketCap: 1.3e12 }, { alloc: 50, marketCap: 5e8 }]);
    expect(r.level).toBe("Moderate");
    expect(r.score).toBeCloseTo(0.35, 2);
  });
  it("no allocation data → High (unknown)", () => {
    expect(deriveRisk([{ alloc: 0, marketCap: null }]).level).toBe("High");
  });
});

describe("riskNote (R14)", () => {
  it("summarizes the tier breakdown in market-cap language", () => {
    const note = riskNote({ superlow: 90, low: 0, medium: 0, high: 10 });
    expect(note).toMatch(/Large-caps \(\$1B\+\) are 90%/);
    expect(note).toMatch(/micro-caps 10%/);
  });
  it("warns when micro-caps dominate", () => {
    expect(riskNote({ superlow: 0, low: 0, medium: 0, high: 100 })).toMatch(/highest-risk tier/);
  });
});

describe("market-cap threading (R14)", () => {
  it("buildResearchPrices carries usd_market_cap → marketCap (null if unknown)", () => {
    const out = buildResearchPrices(["x", "y"], { x: { usd: 10, usd_market_cap: 5e9 }, y: { usd: 2 } }, {});
    expect(out.x.marketCap).toBe(5e9);
    expect(out.y.marketCap).toBeNull();
  });
  it("computePortfolio carries marketCap onto holdings (from prices, then FALLBACK)", () => {
    const live = computePortfolio([{ id: "x", amount: 2 }], { x: { price: 10, marketCap: 5e9 } });
    expect(live.holdings[0].marketCap).toBe(5e9);
    const fb = computePortfolio([{ id: "bitcoin", amount: 1 }], null);
    expect(fb.holdings[0].marketCap).toBe(FALLBACK_PRICES.bitcoin.marketCap);
  });
});
