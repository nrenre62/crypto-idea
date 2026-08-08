/**
 * CRYP-95 — multi-signal deterministic Pulse + Daily Brief (RESEARCH-NO-AI PR 4b).
 *
 * The pure layer of the new deterministic Pulse. The builder will add
 *   src/features/research/utils/pulse.js
 * exporting three pure functions consumed by usePulse + OverviewView:
 *   • pulseFacts(portfolio, tf) → a flat facts record
 *   • pulseLines(facts)         → string[]  (R-A, R-B, R-C, R-E, R-F, each conditional)
 *   • briefFacts(portfolio)     → { empty, chg24, pct24, nearZero, gainer|null, decliner|null }
 *
 * These do not exist yet, so the honest red for this brand-new module is
 * "cannot resolve pulse.js" / "pulseFacts is not a function". Every OTHER import
 * here (the real portfolio math + formatters) resolves today, and the fixtures are
 * built by running the SAME code usePortfolio runs (computePortfolio + deriveRisk +
 * portfolioContext) so they can't drift from what the app actually produces.
 *
 * Contract notes the builder must honour (encoded by the assertions below):
 *   R-B (unrealized P&L)  — references the word "cost" (cost basis); says "down"
 *                           for a loss / "up" for a gain; ABSENT when invested === 0.
 *   R-C (concentration)   — uses the phrase "top two" AND names the two largest HELD
 *                           coins + a rounded N%; only when count ≥ 2.
 *   R-F (>60% nudge)      — uses "concentrat…"; only when top2Pct > 60; no advice verbs.
 *   S1–S4                 — no held-coin name followed by an action verb; no "buy the
 *                           dip"; no aggregate score/grade/health label.
 */
import { describe, it, expect } from "vitest";
import { computePortfolio, deriveRisk, portfolioContext } from "../../src/features/research/utils/portfolio.js";
import { fmtPct, money } from "../../src/features/research/utils/format.js";
import { pulseFacts, pulseLines, briefFacts } from "../../src/features/research/utils/pulse.js";

// Mirror usePortfolio exactly so the fixture is the real computed object shape.
const makePortfolio = (holdings, prices) => {
  const p = computePortfolio(holdings, prices);
  const risk = deriveRisk(p.holdings);
  const context = portfolioContext(p, fmtPct, money);
  return { ...p, risk, context };
};

// ── fixtures ───────────────────────────────────────────────────────────────
const LOSING = makePortfolio(
  [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 60000 },
   { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 3000 }],
  { bitcoin: { price: 45000, c24: -2, c7d: -5, c30d: -10, marketCap: 8e11, rank: 1 },
    ethereum: { price: 2500, c24: -3, c7d: -6, c30d: -12, marketCap: 3e11, rank: 2 } }
); // total 70000, invested 90000 → pnl −20000 (−22.2%)

const ZERO_COST = makePortfolio(
  [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 0 },
   { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 0 }],
  { bitcoin: { price: 45000, c24: 2, c7d: 5, c30d: 10, marketCap: 8e11, rank: 1 },
    ethereum: { price: 2500, c24: 1, c7d: 3, c30d: 8, marketCap: 3e11, rank: 2 } }
); // invested 0 → hasCost false

const NORMAL = makePortfolio(
  [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 30000 },
   { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 2000 }],
  { bitcoin: { price: 50000, c24: 1.5, c7d: 4, c30d: 8, marketCap: 1e12, rank: 1 },
    ethereum: { price: 3000, c24: -0.8, c7d: 2, c30d: 6, marketCap: 3e11, rank: 2 } }
); // total 80000, perf 7d ≈ +3.2%

const DIVERSIFIED = makePortfolio(
  [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 20000 },
   { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 2000 },
   { id: "solana", sym: "SOL", name: "Solana", amount: 220, avgCost: 80 },
   { id: "cardano", sym: "ADA", name: "Cardano", amount: 40000, avgCost: 0.4 }],
  { bitcoin: { price: 30000, c24: 1, c7d: 1, c30d: 1, marketCap: 5e11, rank: 1 },
    ethereum: { price: 2800, c24: 1, c7d: 1, c30d: 1, marketCap: 3e11, rank: 2 },
    solana: { price: 100, c24: 1, c7d: 1, c30d: 1, marketCap: 5e10, rank: 5 },
    cardano: { price: 0.5, c24: 1, c7d: 1, c30d: 1, marketCap: 1.7e10, rank: 9 } }
); // top2Pct 58 (≤60 → R-F absent), count 4

const CONCENTRATED = makePortfolio(
  [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 50000 },
   { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 2000 }],
  { bitcoin: { price: 70000, c24: 1, c7d: 1, c30d: 1, marketCap: 1e12, rank: 1 },
    ethereum: { price: 3000, c24: 1, c7d: 1, c30d: 1, marketCap: 3e11, rank: 2 } }
); // top2Pct 100 (>60 → R-F fires)

const SINGLE = makePortfolio(
  [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 40000 }],
  { bitcoin: { price: 50000, c24: 3.1, c7d: 5, c30d: 8, marketCap: 8e11, rank: 1 } }
); // one holding, top2Pct 100

const EMPTY = makePortfolio([], {});

// A known coin-name universe so "held-only" can be proved: any of these names that
// appears in a produced line MUST be one the fixture actually holds.
const KNOWN_NAMES = [
  "Bitcoin", "Ethereum", "Solana", "Cardano", "Dogecoin", "Ripple",
  "Litecoin", "Polkadot", "Chainlink", "Avalanche", "Tron",
];

const heldNames = (p) => p.holdings.map((h) => h.name);
const ACTION = /^[\s.,:;!?—–()-]*(buy|sell|hold|trim|cut|add|should|time to)\b/i;

describe("Research Pulse — pulseFacts + pulseLines (pure)", () => {
  // ── RED-FIRST: the honesty checkpoint that proves the code changed, not the test.
  it("CRYP-95: pulseFacts/pulseLines report honest unrealized P&L and skip R-B on a zero-cost book", () => {
    // (a) LOSING book → pnl < 0, pnlPct < 0, and the P&L line reads as a loss ("down"),
    //     never with a "+".
    const facts = pulseFacts(LOSING, "30d");
    expect(facts.hasCost).toBe(true);
    expect(facts.invested).toBeCloseTo(90000, 6);
    expect(facts.pnl).toBeLessThan(0);
    expect(facts.pnlPct).toBeLessThan(0);

    const lines = pulseLines(facts);
    const pnlLine = lines.find((l) => /cost/i.test(l)); // R-B references cost basis
    expect(pnlLine).toBeTruthy();
    expect(pnlLine).toMatch(/down/i);
    expect(pnlLine.includes("+")).toBe(false);

    // (b) EVERY holding at avgCost 0 → invested 0 → hasCost false, R-B ABSENT, and no
    //     ∞ / Infinity / NaN leaks from a naive pnl/invested.
    const zf = pulseFacts(ZERO_COST, "30d");
    expect(zf.hasCost).toBe(false);
    expect(zf.invested).toBe(0);
    const zlines = pulseLines(zf);
    expect(zlines.find((l) => /cost/i.test(l))).toBeUndefined(); // no P&L line
    expect(zlines.join("\n")).not.toMatch(/NaN|Infinity|∞/);
  });

  it("CRYP-95: R-A always leads with the formatted total and the selected-tf change", () => {
    const facts = pulseFacts(NORMAL, "7d");
    expect(facts.empty).toBe(false);
    expect(facts.tf).toBe("7d");
    expect(facts.tfWord).toMatch(/7 days/);
    expect(facts.total).toBeCloseTo(NORMAL.total, 6);

    const lines = pulseLines(facts);
    expect(lines.length).toBeGreaterThan(0);
    const first = lines[0];
    expect(first).toContain(money(NORMAL.total));          // "$80,000"
    expect(first).toContain(fmtPct(NORMAL.perf["7d"]));    // "+3.2%"
    expect(first).toContain(facts.tfWord);                 // tf wording matches tf
  });

  it("CRYP-95: R-C names exactly the two largest HELD coins only when count ≥ 2", () => {
    // ≥2 well-diversified book (top2 ≤ 60 → R-F absent, so R-C is the only coin-naming line).
    const facts = pulseFacts(DIVERSIFIED, "30d");
    expect(facts.count).toBe(4);
    expect(facts.top2Pct).toBeCloseTo(58, 6);
    expect(facts.topNames[0]).toBe("Bitcoin");
    expect(facts.topNames[1]).toBe("Ethereum");

    const lines = pulseLines(facts);
    const rc = lines.find((l) => l.includes("Bitcoin") && l.includes("Ethereum"));
    expect(rc).toBeTruthy();
    expect(rc).toMatch(/top two/i);
    expect(rc).toContain(Math.round(facts.top2Pct) + "%"); // "58%"

    // held-only: no coin the fixture does NOT hold may appear in ANY line.
    const held = new Set(heldNames(DIVERSIFIED));
    for (const line of lines) {
      for (const name of KNOWN_NAMES) {
        if (line.includes(name)) expect(held.has(name)).toBe(true);
      }
    }
  });

  it("CRYP-95: a single-holding book has no top-two concentration line", () => {
    const facts = pulseFacts(SINGLE, "30d");
    expect(facts.count).toBe(1);
    const lines = pulseLines(facts);
    // R-C is gated on count ≥ 2 (R-F reserves the word "concentrat", not "top two").
    expect(lines.some((l) => /top two/i.test(l))).toBe(false);
  });

  it("CRYP-95: R-E names the portfolio's risk level word", () => {
    const facts = pulseFacts(NORMAL, "30d");
    expect(["Low", "Moderate", "High"]).toContain(facts.riskLevel);
    expect(facts.riskLevel).toBe(NORMAL.risk.level);
    expect(pulseLines(facts).join("\n")).toContain(facts.riskLevel);
  });

  it("CRYP-95: R-F fires only above 60% concentration and never gives advice", () => {
    // >60% → present, no buy/sell.
    const cf = pulseFacts(CONCENTRATED, "30d");
    expect(cf.diversify).toBe(true);
    expect(cf.top2Pct).toBeGreaterThan(60);
    const clines = pulseLines(cf);
    const fLine = clines.find((l) => /concentrat/i.test(l));
    expect(fLine).toBeTruthy();
    expect(fLine).not.toMatch(/\bbuy\b/i);
    expect(fLine).not.toMatch(/\bsell\b/i);
    expect(clines.join("\n").toLowerCase()).not.toContain("buy the dip");

    // ≤60% → omitted.
    const df = pulseFacts(DIVERSIFIED, "30d");
    expect(df.diversify).toBe(false);
    expect(df.top2Pct).toBeLessThanOrEqual(60);
    expect(pulseLines(df).some((l) => /concentrat/i.test(l))).toBe(false);
  });

  it("CRYP-95: an empty book renders exactly one locked line with no AI apology", () => {
    const facts = pulseFacts(EMPTY, "30d");
    expect(facts.empty).toBe(true);
    const lines = pulseLines(facts);
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toMatch(/AI/);
  });

  it("CRYP-95: pulseLines never emit NaN / Infinity / ∞ on degenerate books", () => {
    const ZERO_TOTAL = makePortfolio(
      [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 100 }],
      { bitcoin: { price: 0, c24: 0, c7d: 0, c30d: 0, marketCap: 8e11, rank: 1 } }
    );
    const NASTY = makePortfolio(
      [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 0 },
       { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 5, avgCost: 0 }],
      { bitcoin: { price: 45000, c24: -100, c7d: -100, c30d: -100, marketCap: 8e11, rank: 1 },
        ethereum: { price: 2000, c24: -100, c7d: -100, c30d: -100, marketCap: 3e11, rank: 2 } }
    );
    for (const p of [ZERO_COST, ZERO_TOTAL, NASTY]) {
      for (const tf of ["24h", "7d", "30d"]) {
        const text = pulseLines(pulseFacts(p, tf)).join("\n");
        expect(text).not.toMatch(/NaN|Infinity|∞/);
      }
    }
  });

  it("CRYP-95: S1–S4 — no advice, no per-coin action verb, no aggregate score label", () => {
    for (const p of [LOSING, DIVERSIFIED, CONCENTRATED]) {
      const names = heldNames(p);
      for (const tf of ["24h", "7d", "30d"]) {
        const lines = pulseLines(pulseFacts(p, tf));
        const joined = lines.join("\n");
        // no held-coin name immediately followed by an action verb (S1/S2).
        for (const line of lines) {
          for (const name of names) {
            let from = 0, idx;
            while ((idx = line.indexOf(name, from)) !== -1) {
              expect(line.slice(idx + name.length)).not.toMatch(ACTION);
              from = idx + name.length;
            }
          }
        }
        expect(joined.toLowerCase()).not.toContain("buy the dip");   // S3
        expect(joined).not.toMatch(/\b(score|grade|rating|health)\b/i); // S4 (no aggregate label)
      }
    }
  });
});

describe("Research Daily Brief — briefFacts (pure)", () => {
  const MIXED = makePortfolio(
    [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 30000 },
     { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 2000 }],
    { bitcoin: { price: 50000, c24: 2, c7d: 4, c30d: 8, marketCap: 1e12, rank: 1 },
      ethereum: { price: 3000, c24: -3, c7d: 2, c30d: 6, marketCap: 3e11, rank: 2 } }
  ); // btc up, eth down

  it("CRYP-95: B-1 reports a 24h change whose $ and % share one sign", () => {
    const bf = briefFacts(MIXED);
    expect(bf.empty).toBe(false);
    expect(Number.isFinite(bf.chg24)).toBe(true);
    expect(Number.isFinite(bf.pct24)).toBe(true);
    expect(Math.abs(bf.pct24)).toBeGreaterThan(0);
    expect(Math.sign(bf.chg24)).toBe(Math.sign(bf.pct24)); // matching sign
  });

  it("CRYP-95: B-1 near-zero — a rounded-to-0.0% move with a non-zero $ change flags nearZero", () => {
    const NZ = makePortfolio(
      [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 40000 }],
      { bitcoin: { price: 50000, c24: 0.04, c7d: 1, c30d: 1, marketCap: 8e11, rank: 1 } }
    );
    const bf = briefFacts(NZ);
    expect(bf.nearZero).toBe(true);
    expect(Math.round(Math.abs(bf.pct24) * 10) / 10).toBe(0); // rounds to 0.0%
    expect(Math.round(Math.abs(bf.chg24))).not.toBe(0);       // but the $ move is real
  });

  it("CRYP-95: B-2/B-3 omit the missing mover — all-down has no gainer, all-up no decliner", () => {
    const allDown = makePortfolio(
      [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 30000 },
       { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 2000 }],
      { bitcoin: { price: 50000, c24: -2, c7d: 1, c30d: 1, marketCap: 1e12, rank: 1 },
        ethereum: { price: 3000, c24: -3, c7d: 1, c30d: 1, marketCap: 3e11, rank: 2 } }
    );
    const allUp = makePortfolio(
      [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 30000 },
       { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 2000 }],
      { bitcoin: { price: 50000, c24: 2, c7d: 1, c30d: 1, marketCap: 1e12, rank: 1 },
        ethereum: { price: 3000, c24: 3, c7d: 1, c30d: 1, marketCap: 3e11, rank: 2 } }
    );
    expect(briefFacts(allDown).gainer).toBeNull();
    expect(briefFacts(allDown).decliner).toBeTruthy();
    expect(briefFacts(allUp).decliner).toBeNull();
    expect(briefFacts(allUp).gainer).toBeTruthy();
  });

  it("CRYP-95: on a mixed book the gainer and decliner are different coins", () => {
    const bf = briefFacts(MIXED);
    expect(bf.gainer).toBeTruthy();
    expect(bf.decliner).toBeTruthy();
    expect(bf.gainer.name).toBe("Bitcoin");
    expect(bf.decliner.name).toBe("Ethereum");
    expect(bf.gainer.name).not.toBe(bf.decliner.name);
  });

  it("CRYP-95: a single holding yields at most one mover, never both", () => {
    const up = makePortfolio(
      [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 40000 }],
      { bitcoin: { price: 50000, c24: 3, c7d: 1, c30d: 1, marketCap: 8e11, rank: 1 } }
    );
    const bf = briefFacts(up);
    expect(bf.empty).toBe(false);
    expect(Number.isFinite(bf.chg24)).toBe(true);
    expect(bf.gainer).toBeTruthy();
    expect(bf.decliner).toBeNull();
    // the one coin can never be BOTH gainer and decliner.
    expect(bf.gainer && bf.decliner && bf.gainer.name === bf.decliner.name).toBeFalsy();
  });

  it("CRYP-95: an empty book brief is flagged empty with zeroed movers", () => {
    const bf = briefFacts(EMPTY);
    expect(bf.empty).toBe(true);
    expect(bf.gainer).toBeNull();
    expect(bf.decliner).toBeNull();
  });
});

// ── PR 4c — RESEARCH-METRICS (CRYP-97) ───────────────────────────────────────
// Four NEW pure facts on pulseFacts + a reshaped pulseLines set. These do NOT
// exist yet, so the honest red is "facts.contrib / .neff / .drawdown7d / .vol7d /
// .weekly is undefined" and "no P-1 / This-week line is emitted". Every import and
// fixture below resolves today (built by the SAME computePortfolio the app runs),
// so a failure is the missing feature, never a fixture typo.
//
// Contract encoded here:
//   P-1 attribution  — contrib[]={id,name,contrib} on PAST-VALUE weights so
//                       Σ contribᵢ === portfolio.perf[tf] EXACTLY. topContributor =
//                       held name w/ max |contrib|; topContributorShare = round(%).
//                       Q1: share>100 → P-1 line drops the % ("the main driver").
//   P-2 effective-N  — neff = 1/Σwᵢ² ∈ [1, count], null when count<2; merged into R-C.
//   P-3 drawdown7d   — (V_last−maxV)/maxV over Vₜ=Σ(amountᵢ·sparkᵢ,ₜ); ≤0, exactly 0
//                       at a 7-day high.
//   P-4 vol7d        — SAMPLE stddev (÷ n−1) of daily returns Vₜ/Vₜ₋₁−1; NEVER ×√365.
//   weekly gate      — false → This-week line omitted, R-E risk sentence stays (Q2).
describe("Research Pulse metrics — attribution / effective-N / drawdown / vol (CRYP-97)", () => {
  // Independent reference oracles (recompute the spec math off the fixture holdings).
  const sampleStd = (arr) => {
    const n = arr.length;
    const mean = arr.reduce((s, x) => s + x, 0) / n;
    const v = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);
    return Math.sqrt(v);
  };
  const vSeries = (portfolio) => {
    const K = Math.min(...portfolio.holdings.map((h) => h.spark.length));
    const V = [];
    for (let t = 0; t < K; t++) {
      let v = 0;
      for (const h of portfolio.holdings) {
        const tail = h.spark.slice(h.spark.length - K);
        v += (h.amount || 0) * tail[t];
      }
      V.push(v);
    }
    return V;
  };
  const dailyReturns = (V) => V.slice(1).map((v, i) => v / V[i] - 1);

  const p1Line = (lines) => lines.find((l) => /drove|main driver/i.test(l));
  const weekLine = (lines) => lines.find((l) => /this week/i.test(l));

  // Large, single-signed moves — the attribution identity should hold for any tf.
  const MOVERS = makePortfolio(
    [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 30000 },
     { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 2000 }],
    { bitcoin: { price: 50000, c24: 12, c7d: 25, c30d: 40, marketCap: 1e12, rank: 1 },
      ethereum: { price: 3000, c24: 8, c7d: 15, c30d: 30, marketCap: 3e11, rank: 2 } }
  ); // BTC value 50k @ +12% dominates → topContributorShare ≈ 71% (≤100, keeps the %).

  // Offsetting book: equal PAST values, opposite signs → net perf ≈ +1%, top contrib +10 →
  // topContributorShare ≈ 1000% (>100) → Q1 drops the number.
  const OFFSET = makePortfolio(
    [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 100 },
     { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 100 }],
    { bitcoin: { price: 60000, c24: 20, c7d: 20, c30d: 20, marketCap: 1e12, rank: 1 },
      ethereum: { price: 4100, c24: -18, c7d: -18, c30d: -18, marketCap: 3e11, rank: 2 } }
  ); // p_BTC = 60000/1.2 = 50000, p_ETH = 41000/0.82 = 50000 → then 100000, contribs +10 / −9.

  // Dip-then-recover 7-day value: V = [100, 80, 90] → drawdown = (90−100)/100 = −0.1.
  const DRAWDOWN = makePortfolio(
    [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 50 },
     { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 1, avgCost: 30 }],
    { bitcoin: { price: 55, c24: 1, c7d: -1, c30d: 1, marketCap: 8e11, rank: 1, spark: [60, 50, 55] },
      ethereum: { price: 35, c24: 1, c7d: -1, c30d: 1, marketCap: 3e11, rank: 2, spark: [40, 30, 35] } }
  );

  // Monotonically rising value: V = [80, 90, 100] → last IS the max → drawdown exactly 0.
  const MONOTONIC = makePortfolio(
    [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 50 },
     { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 1, avgCost: 30 }],
    { bitcoin: { price: 60, c24: 1, c7d: 1, c30d: 1, marketCap: 8e11, rank: 1, spark: [50, 55, 60] },
      ethereum: { price: 40, c24: 1, c7d: 1, c30d: 1, marketCap: 3e11, rank: 2, spark: [30, 35, 40] } }
  );

  // Known daily-return series: V = [100, 110, 99, 108.9] → returns [+0.1, −0.1, +0.1].
  const VOL = makePortfolio(
    [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 90 },
     { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 1, avgCost: 10 }],
    { bitcoin: { price: 98.9, c24: 1, c7d: 1, c30d: 1, marketCap: 8e11, rank: 1, spark: [90, 100, 89, 98.9] },
      ethereum: { price: 10, c24: 1, c7d: 1, c30d: 1, marketCap: 3e11, rank: 2, spark: [10, 10, 10, 10] } }
  );

  // Degenerate spark data — weekly must fall closed (P-3/P-4 omitted, never NaN).
  const SPARK_NULL = makePortfolio(
    [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 100 },
     { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 100 }],
    { bitcoin: { price: 50000, c24: 1, c7d: 1, c30d: 1, marketCap: 8e11, rank: 1, spark: null },
      ethereum: { price: 3000, c24: 1, c7d: 1, c30d: 1, marketCap: 3e11, rank: 2, spark: [100, 110, 120] } }
  );
  const SPARK_THIN = makePortfolio(
    [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 100 },
     { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 100 }],
    { bitcoin: { price: 50000, c24: 1, c7d: 1, c30d: 1, marketCap: 8e11, rank: 1, spark: [100] },
      ethereum: { price: 3000, c24: 1, c7d: 1, c30d: 1, marketCap: 3e11, rank: 2, spark: [10, 11, 12] } }
  );
  const SPARK_ZERO = makePortfolio(
    [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 100 },
     { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 1, avgCost: 100 }],
    { bitcoin: { price: 90, c24: 1, c7d: 1, c30d: 1, marketCap: 8e11, rank: 1, spark: [100, 0, 90] },
      ethereum: { price: 36, c24: 1, c7d: 1, c30d: 1, marketCap: 3e11, rank: 2, spark: [40, 0, 36] } }
  ); // V = [140, 0, 126] → a Vₜ ≤ 0 → weekly false, and the naive Vₜ/Vₜ₋₁ would be ∞.

  // ── RED-FIRST checkpoint: the identity that proves the metric, not the test. ──
  it("CRYP-97: return-attribution contributions sum exactly to the portfolio timeframe return", () => {
    for (const tf of ["24h", "7d", "30d"]) {
      const facts = pulseFacts(MOVERS, tf);
      expect(Array.isArray(facts.contrib)).toBe(true);          // the new fact exists
      expect(facts.contrib).toHaveLength(MOVERS.holdings.length);
      const sum = facts.contrib.reduce((s, c) => s + c.contrib, 0);
      expect(sum).toBeCloseTo(MOVERS.perf[tf], 6);              // exact attribution identity
    }
  });

  it("CRYP-97: P-1 attributes the move to a HELD coin with no action verb, and drops the % when a holding offsets (>100% share)", () => {
    // Normal case — dominant coin, share ≤ 100 → the line keeps the percent.
    const facts = pulseFacts(MOVERS, "24h");
    expect(facts.topContributor).toBe("Bitcoin");                       // held
    expect(heldNames(MOVERS)).toContain(facts.topContributor);
    expect(facts.topContributorShare).toBeGreaterThan(0);
    expect(facts.topContributorShare).toBeLessThanOrEqual(100);
    const p1 = p1Line(pulseLines(facts));
    expect(p1).toBeTruthy();
    expect(p1).toMatch(/drove/i);
    expect(p1).toContain(String(facts.topContributorShare) + "%");
    // no action verb immediately after the coin name (S1/S2), "drove"/"main driver" excepted.
    let from = 0, idx;
    while ((idx = p1.indexOf(facts.topContributor, from)) !== -1) {
      expect(p1.slice(idx + facts.topContributor.length)).not.toMatch(ACTION);
      from = idx + facts.topContributor.length;
    }

    // Q1 — offsetting holdings push share > 100 → the P-1 line drops the number.
    const of = pulseFacts(OFFSET, "24h");
    expect(of.topContributor).toBe("Bitcoin");
    expect(of.topContributorShare).toBeGreaterThan(100);
    const op1 = p1Line(pulseLines(of));
    expect(op1).toBeTruthy();
    expect(op1).toMatch(/main driver/i);
    expect(op1.includes("%")).toBe(false);
  });

  it("CRYP-97: P-2 effective-N is bounded [1, count], merges into the top-two line, and is null below 2 holdings", () => {
    const facts = pulseFacts(DIVERSIFIED, "30d");
    const w = DIVERSIFIED.holdings.map((h) => (h.alloc || 0) / 100);
    const expectedNeff = 1 / w.reduce((s, x) => s + x * x, 0);
    expect(facts.count).toBe(4);
    expect(facts.neff).toBeCloseTo(expectedNeff, 6);
    expect(facts.neff).toBeGreaterThanOrEqual(1);
    expect(facts.neff).toBeLessThanOrEqual(facts.count);

    // one merged R-C line: names both coins + "top two" + top2% AND the Neff clause.
    const rc = pulseLines(facts).find((l) => l.includes("Bitcoin") && l.includes("Ethereum"));
    expect(rc).toBeTruthy();
    expect(rc).toMatch(/top two/i);
    expect(rc).toContain(Math.round(facts.top2Pct) + "%");        // "58%"
    expect(rc).toMatch(/equal-weight/i);                          // Neff clause merged in
    expect(rc).toContain(String(facts.count));                    // "…your 4 coins…"

    // below 2 holdings → neff is null (undefined effective-N).
    expect(pulseFacts(SINGLE, "30d").neff).toBeNull();
  });

  it("CRYP-97: P-3 drawdown7d is ≤ 0 after a dip and exactly 0 at a 7-day high", () => {
    const dd = pulseFacts(DRAWDOWN, "7d");
    expect(dd.weekly).toBe(true);
    expect(dd.drawdown7d).toBeLessThan(0);
    expect(dd.drawdown7d).toBeCloseTo(-0.1, 6);
    expect(weekLine(pulseLines(dd))).toMatch(/below its 7-day high/i);

    const mono = pulseFacts(MONOTONIC, "7d");
    expect(mono.weekly).toBe(true);
    expect(mono.drawdown7d).toBe(0);
    const mLine = weekLine(pulseLines(mono));
    expect(mLine).toMatch(/at a 7-day high/i);
    expect(mLine).not.toMatch(/below/i);
  });

  it("CRYP-97: P-4 weekly volatility is a sample stddev of daily returns and is never annualized", () => {
    const expectedVol = sampleStd(dailyReturns(vSeries(VOL)));
    const vf = pulseFacts(VOL, "7d");
    expect(vf.weekly).toBe(true);
    expect(vf.vol7d).toBeCloseTo(expectedVol, 6);                       // sample σ (÷ n−1)
    expect(vf.vol7d).not.toBeCloseTo(expectedVol * Math.sqrt(365), 3);  // NOT annualized
  });

  it("CRYP-97: weekly metrics fall closed (never NaN) on thin or degenerate spark data", () => {
    for (const p of [SINGLE, SPARK_NULL, SPARK_THIN, SPARK_ZERO]) {
      for (const tf of ["24h", "7d", "30d"]) {
        const f = pulseFacts(p, tf);
        expect(f.weekly).toBe(false);
        const lines = pulseLines(f);
        expect(lines.some((l) => /this week/i.test(l))).toBe(false);   // no P-3/P-4 line
        expect(lines.join("\n")).not.toMatch(/NaN|Infinity|∞/);
      }
    }
  });

  it("CRYP-97: the This-week line supersedes the risk fallback when weekly data exists; R-E returns without it", () => {
    // spark-bearing ≥2 book → This-week present, R-E ("reads as … risk") dropped.
    const wLines = pulseLines(pulseFacts(DRAWDOWN, "7d"));
    expect(wLines.some((l) => /this week/i.test(l))).toBe(true);
    expect(wLines.some((l) => /reads as/i.test(l))).toBe(false);

    // spark-less book → R-E fallback stays, no This-week line (Q2 keeps the risk pointer).
    const nLines = pulseLines(pulseFacts(DIVERSIFIED, "7d"));
    expect(nLines.some((l) => /reads as/i.test(l))).toBe(true);
    expect(nLines.some((l) => /this week/i.test(l))).toBe(false);
  });

  it("CRYP-97: S1–S4 — the reshaped line set stays advice-free, verb-free after coin names, and label-free", () => {
    for (const p of [MOVERS, OFFSET, DRAWDOWN, MONOTONIC]) {
      const names = heldNames(p);
      const held = new Set(names);
      const hasSpark = p.holdings.every((h) => Array.isArray(h.spark) && h.spark.length >= 2);
      for (const tf of ["24h", "7d", "30d"]) {
        const lines = pulseLines(pulseFacts(p, tf));
        const joined = lines.join("\n");
        // the reshaped content is actually present (so this scan covers it).
        expect(lines.some((l) => /drove|main driver/i.test(l))).toBe(true);   // P-1
        if (hasSpark) expect(lines.some((l) => /this week/i.test(l))).toBe(true); // This-week
        // S1/S2 — no held-coin name immediately followed by an action verb.
        for (const line of lines) {
          for (const name of names) {
            let from = 0, idx;
            while ((idx = line.indexOf(name, from)) !== -1) {
              expect(line.slice(idx + name.length)).not.toMatch(ACTION);
              from = idx + name.length;
            }
          }
          // held-only naming across the reshaped set.
          for (const kn of KNOWN_NAMES) if (line.includes(kn)) expect(held.has(kn)).toBe(true);
        }
        expect(joined.toLowerCase()).not.toContain("buy the dip");            // S3
        expect(joined).not.toMatch(/\b(score|grade|rating|health)\b/i);       // S4
        expect(joined).not.toMatch(/NaN|Infinity|∞/);
      }
    }
  });

  // ── PR 4c follow-up (CRYP-97 F1/F2) — the net-direction attribution fix ──────
  // The current code picks topContributor = max-|contribution| and guards the share
  // one-sided (share ≤ 100). On a ≥3-coin book where the biggest position moves
  // OPPOSITE the net, that names the DRAG and renders a sign-inverted "-500%". These
  // fixtures pin the founder-approved option A: attribute to the top contributor IN
  // the direction of the net move (always a positive share), gate P-1 on count ≥ 2,
  // show the number only when it rounds to 1–100%, and say "at a 7-day high" when the
  // drawdown ROUNDS to 0%. Every fixture is built by the real computePortfolio, so a
  // failure is the bug/feature, never a fixture typo.

  // ≥3-coin book: BTC −50% is the biggest position (largest PAST value) and the
  // max-|contribution| coin (contrib −25), while ETH (+18) and SOL (+12) rally with
  // DISTINCT positive contributions; net perf = +5%. Buggy selector → "Bitcoin drove
  // about -500%"; option A → "Ethereum was the main driver" (its share 360% > 100).
  const DRAG_UP = makePortfolio(
    [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 40000 },
     { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 200 },
     { id: "solana", sym: "SOL", name: "Solana", amount: 320, avgCost: 40 }],
    { bitcoin: { price: 25000, c24: -50, c7d: -50, c30d: -50, marketCap: 5e11, rank: 1 },
      ethereum: { price: 4800, c24: 60, c7d: 60, c30d: 60, marketCap: 3e11, rank: 2 },
      solana: { price: 100, c24: 60, c7d: 60, c30d: 60, marketCap: 5e10, rank: 5 } }
  );

  // ≥3-coin book where the drag (BTC, contrib −16.23) is STILL the max-|contribution|
  // coin (so the buggy selector picks it → "-93%"), but the net-direction top
  // contributor ETH (+11.69) lands a share of 67% — in [1,100] → option A KEEPS the
  // number. Three positives (ETH 11.69 > SOL 11.04 = ADA 11.04) are what let the drag
  // dominate |contrib| yet leave the top positive share ≤ 100. Net perf ≈ +17.5%.
  const IN_RANGE = makePortfolio(
    [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 40000 },
     { id: "ethereum", sym: "ETH", name: "Ethereum", amount: 10, avgCost: 200 },
     { id: "solana", sym: "SOL", name: "Solana", amount: 510, avgCost: 40 },
     { id: "cardano", sym: "ADA", name: "Cardano", amount: 102000, avgCost: 0.2 }],
    { bitcoin: { price: 25000, c24: -50, c7d: -50, c30d: -50, marketCap: 5e11, rank: 1 },
      ethereum: { price: 5400, c24: 50, c7d: 50, c30d: 50, marketCap: 3e11, rank: 2 },
      solana: { price: 100, c24: 50, c7d: 50, c30d: 50, marketCap: 5e10, rank: 5 },
      cardano: { price: 0.5, c24: 50, c7d: 50, c30d: 50, marketCap: 1.7e10, rank: 9 } }
  );

  // Single holding whose 7-day value ticks a hair below its peak: V = [100, 100.4,
  // 100.399] → drawdown ≈ −9.96e-6 (NOT exactly 0, but rounds to 0%). The current
  // `drawdown7d === 0` test misses it and prints "0% below its 7-day high".
  const NEAR_HIGH = makePortfolio(
    [{ id: "bitcoin", sym: "BTC", name: "Bitcoin", amount: 1, avgCost: 50 }],
    { bitcoin: { price: 100.399, c24: 0, c7d: 0, c30d: 0, marketCap: 8e11, rank: 1, spark: [100, 100.4, 100.399] } }
  );

  it("CRYP-97: P-1 attributes to the driver in the net direction, never a sign-inverted negative share", () => {
    const facts = pulseFacts(DRAG_UP, "24h");

    // fixture sanity (passes today) — the move is clearly UP, the max-|contribution|
    // coin is the DRAG, and there is a DISTINCT largest positive contributor.
    expect(facts.tfPerf).toBeGreaterThan(0);
    expect(facts.tfPerf).toBeCloseTo(5, 6);
    const byAbs = [...facts.contrib].sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib));
    expect(byAbs[0].name).toBe("Bitcoin");                 // drag = biggest |contribution|
    expect(byAbs[0].contrib).toBeLessThan(0);
    const positives = facts.contrib.filter((c) => c.contrib > 0).sort((a, b) => b.contrib - a.contrib);
    expect(positives[0].name).toBe("Ethereum");            // distinct top positive driver
    expect(positives[0].contrib).toBeGreaterThan(positives[1].contrib);

    // the bug + the fix: the P-1 line must name the net-direction driver, never render
    // the drag's sign-inverted "-500%", and (share 360% > 100) drop the number.
    const p1 = p1Line(pulseLines(facts));
    expect(p1).toBeTruthy();
    expect(p1).not.toContain("-500");        // today's exact buggy output — the smoking gun
    expect(p1).not.toMatch(/-\s*\d/);        // no ASCII negative number anywhere
    expect(p1).not.toMatch(/−/);             // no U+2212 minus either
    expect(p1).not.toContain("Bitcoin");     // never the drag
    expect(p1).toContain("Ethereum");        // the real driver in the net direction
    expect(p1).toMatch(/main driver/i);      // 360% share > 100 → number dropped
    expect(facts.topContributor).toBe("Ethereum");
    expect(facts.topContributorShare).toBeGreaterThan(0);  // always positive under option A
  });

  it("CRYP-97: P-1 is omitted on a single-holding book", () => {
    const facts = pulseFacts(SINGLE, "30d");
    expect(facts.count).toBe(1);
    const lines = pulseLines(facts);
    // nothing to attribute on one coin — no "X drove …" / "X was the main driver".
    expect(lines.some((l) => /drove|main driver/i.test(l))).toBe(false);
    expect(p1Line(lines)).toBeUndefined();
  });

  it("CRYP-97: the This-week line says 'at a 7-day high' when the drawdown rounds to 0%", () => {
    const facts = pulseFacts(NEAR_HIGH, "7d");
    expect(facts.weekly).toBe(true);
    expect(facts.drawdown7d).toBeLessThan(0);                       // a real (tiny) dip
    expect(facts.drawdown7d).not.toBe(0);                           // NOT exactly zero
    expect(Math.round(Math.abs(facts.drawdown7d) * 100)).toBe(0);   // but rounds to 0%
    const wl = weekLine(pulseLines(facts));
    expect(wl).toBeTruthy();
    expect(wl).toMatch(/at a 7-day high/i);
    expect(wl).not.toContain("0% below");
    expect(wl).not.toMatch(/below/i);
  });

  it("CRYP-97: P-1 shows the share number only when it rounds to 1–100%", () => {
    const facts = pulseFacts(IN_RANGE, "24h");

    // fixture sanity — the drag is STILL the max-|contribution| coin, so the buggy
    // selector would pick it, yet ETH is the distinct net-direction driver.
    const byAbs = [...facts.contrib].sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib));
    expect(byAbs[0].name).toBe("Bitcoin");
    expect(byAbs[0].contrib).toBeLessThan(0);
    const positives = facts.contrib.filter((c) => c.contrib > 0).sort((a, b) => b.contrib - a.contrib);
    expect(positives[0].name).toBe("Ethereum");
    expect(positives[0].contrib).toBeGreaterThan(positives[1].contrib);

    // number-shown path: net-direction driver, share in [1,100], a REAL % in the line.
    expect(facts.topContributor).toBe("Ethereum");
    expect(facts.topContributorShare).toBeGreaterThanOrEqual(1);
    expect(facts.topContributorShare).toBeLessThanOrEqual(100);
    const p1 = p1Line(pulseLines(facts));
    expect(p1).toContain("Ethereum");
    expect(p1).not.toContain("Bitcoin");
    expect(p1).not.toMatch(/-\s*\d/);
    expect(p1).toMatch(/drove about \d+% of that move/i);
    expect(p1).toContain(String(facts.topContributorShare) + "%");

    // number-dropped path (>100% share) — reaffirmed on the existing OFFSET book.
    const op1 = p1Line(pulseLines(pulseFacts(OFFSET, "24h")));
    expect(op1).toMatch(/main driver/i);
    expect(op1.includes("%")).toBe(false);
  });
});
