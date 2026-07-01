import { describe, it, expect } from "vitest";
import {
  coinRisk, deriveRisk, riskNote, computePortfolio, FALLBACK_PRICES,
} from "../../src/features/research/utils/portfolio.js";
import { buildResearchPrices } from "../../src/features/research/utils/priceAdapter.js";

// Round 23: risk from each coin's REAL CoinGecko rank — graduated (log-scale), with a
// log-market-cap fallback when rank is missing, and a $100B+ mega-cap safety floor.
// (Supersedes the R14 discrete market-cap tiers.)

describe("coinRisk (R23) — graduated, rank-first", () => {
  it("is monotone in rank: a bigger rank number means higher risk", () => {
    const risks = [1, 10, 50, 200, 500, 1500].map((rank) => coinRisk({ rank }));
    for (let i = 1; i < risks.length; i++) expect(risks[i]).toBeGreaterThan(risks[i - 1]);
  });
  it("rank 1 ≈ mega-low; no rank & no cap → 0.95 (highest)", () => {
    expect(coinRisk({ rank: 1 })).toBeCloseTo(0.02, 2);
    expect(coinRisk({})).toBe(0.95);
    expect(coinRisk({ rank: null, marketCap: null })).toBe(0.95);
  });
  it("matches the tuned anchors: rank ~50 ≈ 0.35, ~200 ≈ 0.6, ~500 ≈ 0.78", () => {
    expect(coinRisk({ rank: 50 })).toBeGreaterThan(0.3);
    expect(coinRisk({ rank: 50 })).toBeLessThan(0.45);
    expect(coinRisk({ rank: 200 })).toBeGreaterThan(0.55);
    expect(coinRisk({ rank: 200 })).toBeLessThan(0.65);
    expect(coinRisk({ rank: 500 })).toBeGreaterThan(0.73);
    expect(coinRisk({ rank: 500 })).toBeLessThan(0.83);
  });
  it("rank ≥ ~1500 (or absurd) caps at 0.95", () => {
    expect(coinRisk({ rank: 1500 })).toBe(0.95);
    expect(coinRisk({ rank: 9000 })).toBe(0.95);
  });
  it("rank beats market cap when both are present", () => {
    // a rank-500 coin with a (stale/wrong) $1.3T cap still reads risky
    expect(coinRisk({ rank: 500, marketCap: 1.3e12 })).toBeGreaterThan(0.7);
  });
  it("falls back to a graduated log-market-cap curve when rank is missing", () => {
    const r400m = coinRisk({ marketCap: 4e8 });
    const r900m = coinRisk({ marketCap: 9e8 });
    expect(r400m).toBeGreaterThan(r900m);         // graduated — no tier cliff
    expect(coinRisk({ marketCap: 1.3e12 })).toBeCloseTo(0.02, 2); // mega cap → lowest
    expect(coinRisk({ marketCap: 5e7 })).toBeGreaterThan(0.8);    // micro-cap → high
  });
});

describe("deriveRisk (R23) — allocation-weighted + mega-cap safety floor", () => {
  it("100% BTC (rank 1, $1.3T) → Low", () => {
    const r = deriveRisk([{ alloc: 100, rank: 1, marketCap: 1.3e12 }]);
    expect(r.level).toBe("Low");
    expect(r.megaAlloc).toBe(100);
  });
  it("40% BTC + 60% no-rank micro → capped at Moderate (mega floor), megaAlloc reported", () => {
    const r = deriveRisk([
      { alloc: 40, rank: 1, marketCap: 1.3e12 },
      { alloc: 60, rank: null, marketCap: null },
    ]);
    expect(r.level).toBe("Moderate");   // can never read High with a ≥40% mega anchor
    expect(r.megaAlloc).toBe(40);
    expect(r.score).toBeLessThan(0.67);
  });
  it("30% BTC + 70% no-rank micro → NOT capped (stays High)", () => {
    const r = deriveRisk([
      { alloc: 30, rank: 1, marketCap: 1.3e12 },
      { alloc: 70, rank: null, marketCap: null },
    ]);
    expect(r.level).toBe("High");
    expect(r.megaAlloc).toBe(30);
  });
  it("graduated: a rank-600/$400M coin scores the book riskier than a rank-400/$900M one", () => {
    const riskier = deriveRisk([{ alloc: 100, rank: 600, marketCap: 4e8 }]);
    const safer = deriveRisk([{ alloc: 100, rank: 400, marketCap: 9e8 }]);
    expect(riskier.score).toBeGreaterThan(safer.score);
  });
  it("no allocation data → High", () => {
    expect(deriveRisk([{ alloc: 0, rank: null, marketCap: null }]).level).toBe("High");
  });
  it("mega by rank alone (rank ≤ 10) counts toward the floor", () => {
    const r = deriveRisk([{ alloc: 50, rank: 5, marketCap: null }, { alloc: 50, rank: null, marketCap: null }]);
    expect(r.megaAlloc).toBe(50);
  });
});

describe("riskNote (R23) — rank wording + the mega anchor", () => {
  it("names the $100B+ anchor when megaAlloc ≥ 40%", () => {
    const note = riskNote({ top: 40, mid: 0, small: 60 }, 40, "Moderate");
    expect(note).toMatch(/\$100B\+ anchor \(40%\)/);
    expect(note).toMatch(/holding the risk at Moderate/);
  });
  it("otherwise gives the size-mix sentence in rank language", () => {
    const note = riskNote({ top: 20, mid: 10, small: 70 }, 20, "High");
    expect(note).toMatch(/Top-50 coins are 20%/);
    expect(note).toMatch(/small\/unranked 70%/);
    expect(note).toMatch(/highest-risk/);
    expect(note).not.toMatch(/anchor/);
  });
  it("praises a mostly-top-ranked book (no anchor line under 40%)", () => {
    const note = riskNote({ top: 80, mid: 20, small: 0 }, 30, "Low");
    expect(note).toMatch(/keeps single-coin risk lower/);
  });
});

describe("rank threading (R23)", () => {
  it("buildResearchPrices carries usd_market_cap_rank → rank (null if unknown)", () => {
    const out = buildResearchPrices(
      ["x", "y"],
      { x: { usd: 10, usd_market_cap: 5e9, usd_market_cap_rank: 42 }, y: { usd: 2 } },
      {}
    );
    expect(out.x.rank).toBe(42);
    expect(out.y.rank).toBeNull();
  });
  it("computePortfolio carries rank onto holdings (from prices, then FALLBACK)", () => {
    const live = computePortfolio([{ id: "x", amount: 2 }], { x: { price: 10, marketCap: 5e9, rank: 42 } });
    expect(live.holdings[0].rank).toBe(42);
    const fb = computePortfolio([{ id: "bitcoin", amount: 1 }], null);
    expect(fb.holdings[0].rank).toBe(FALLBACK_PRICES.bitcoin.rank);
    expect(FALLBACK_PRICES.bitcoin.rank).toBe(1); // the demo seam classifies BTC as safest
  });
  it("computePortfolio still carries marketCap (R14 behavior kept)", () => {
    const live = computePortfolio([{ id: "x", amount: 2 }], { x: { price: 10, marketCap: 5e9 } });
    expect(live.holdings[0].marketCap).toBe(5e9);
    expect(live.holdings[0].rank).toBeNull();
  });
});
