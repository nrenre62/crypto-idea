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
