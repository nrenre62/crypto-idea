import { describe, it, expect } from "vitest";
import {
  validateOutput, selectValidated, MAX_REGENS,
} from "../../functions/validate-output.js";

// A9 (0d-pure) — the fail-closed AI-output validator (#13/#14/#15/#16). The most
// security-load-bearing test set in the build: it must BLOCK names/targets/advice/
// allocation/score and fail closed, without nuking ordinary descriptive prose.
const ok = (t, o) => validateOutput(t, o).ok;
const types = (t, o) => validateOutput(t, o).violations.map((v) => v.type);

describe("validateOutput — fail closed on empty/garbage", () => {
  it("rejects empty, whitespace, and non-strings", () => {
    for (const bad of ["", "   ", "\n", null, undefined, 42, {}]) {
      const r = validateOutput(bad);
      expect(r.ok).toBe(false);
      expect(r.violations[0].type).toBe("empty");
    }
  });
});

describe("price targets (#13)", () => {
  it("blocks $ amounts, 'N dollars/USD', and target phrasing", () => {
    for (const t of [
      "It could reach $5 soon.", "Worth about $1,234.56.", "around $0.05", "maybe $50k",
      "a fair value of 5 dollars", "roughly 1,000 USD", "the price target is near",
      "this should hit $2", "could rise to $10",
    ]) {
      expect(ok(t), t).toBe(false);
      expect(types(t)).toContain("price");
    }
  });
  it("allows qualitative prose with no dollar figures", () => {
    for (const t of [
      "The team ships consistently and the community is active.",
      "Trading volume rose 20% while supply stayed flat.",
      "Development has been steady over the past year.",
    ]) {
      expect(ok(t), t).toBe(true);
    }
  });
});

describe("buy / sell / hold advice (#13/#14)", () => {
  it("blocks recommendations and rating labels", () => {
    for (const t of [
      "You should buy this now.", "We recommend selling into strength.",
      "It might be time to sell.", "Rating: Buy", "Strong Buy signal",
      "Buy now before it runs.", "This is a strong buy.", "I'd hold here.",
      "Take profits soon.", "Consider buying the dip.",
    ]) {
      expect(ok(t), t).toBe(false);
      expect(types(t)).toContain("advice");
    }
  });
  it("blocks a standalone Buy/Sell/Hold label line", () => {
    expect(ok("Summary\nHold.\nMore text")).toBe(false);
  });
  it("allows descriptive use of buy/sell/hold words", () => {
    for (const t of [
      "Buyers have been accumulating for weeks.",
      "Long-term holders control most of the supply.",
      "Selling pressure increased after the unlock.",
      "The community holds a wide range of views.",
    ]) {
      expect(ok(t), t).toBe(true);
    }
  });
});

describe("%-allocation (#13)", () => {
  it("blocks allocation-directed percentages", () => {
    for (const t of [
      "Allocate 20% to this.", "Put 5% of your portfolio here.",
      "A 10% position makes sense.", "size it at 15%",
    ]) {
      expect(ok(t), t).toBe(false);
      expect(types(t)).toContain("allocation");
    }
  });
  it("allows ordinary percentages (price/supply/holders)", () => {
    for (const t of [
      "The token is up 20% this week.", "80% of the supply is circulating.",
      "Around 30% of holders are new.", "Volume fell 12% on the day.",
    ]) {
      expect(ok(t), t).toBe(true);
    }
  });
});

describe("aggregate score (#13)", () => {
  it("blocks any single blended score/rating", () => {
    for (const t of [
      "Overall score: strong", "We give it a 7/10.", "8 out of 10 here.",
      "Conviction rating overall is solid", "score of 8", "rating: 7",
    ]) {
      expect(ok(t), t).toBe(false);
      expect(types(t)).toContain("score");
    }
  });
  it("does not flag dates or non-score fractions", () => {
    for (const t of [
      "Scheduled for 12/10/2026.", "Roughly 2/3 of the supply is locked.",
      "1 of 3 founders is public.",
    ]) {
      expect(ok(t), t).toBe(true);
    }
  });
});

describe("naming wall (#14)", () => {
  it("blocks project names / tickers the model was not given (BTC/ETH/SOL excepted)", () => {
    const opts = { allowedNames: ["aptos", "apt"] };
    for (const t of [
      "Unlike Cardano, this one ships.", "Compared with $XRP it's tiny.",
      "DOGE did the same thing.", "Reminds me of Polkadot.", "similar to Chainlink",
    ]) {
      expect(ok(t, opts), t).toBe(false);
      expect(types(t, opts)).toContain("name");
    }
  });
  it("allows the coin under discussion + the universal majors", () => {
    const opts = { allowedNames: ["aptos", "apt"] };
    for (const t of [
      "Aptos has steady commits.", "APT activity is healthy.",
      "Like BTC and ETH, it has a public repo.", "Bitcoin set the template; SOL is faster.",
    ]) {
      expect(ok(t, opts), t).toBe(true);
    }
  });
  it("does not flag English words that happen to be ticker symbols", () => {
    // 'link', 'near', 'op', 'ton', 'sand' as lowercase prose are NOT tickers; only
    // ALL-CAPS / $cashtags are. Common acronyms (API/DAO/NFT) are not in the list.
    for (const t of [
      "Click the link in the docs.", "We are near the all-time high.",
      "Tons of activity on-chain.", "The API and the DAO governance look healthy.",
    ]) {
      expect(ok(t), t).toBe(true);
    }
  });
});

describe("clean conviction-style summary passes end to end", () => {
  it("a realistic qualitative summary with no violations is valid", () => {
    const text =
      "Development looks healthy: the public repository has frequent commits from " +
      "several contributors. The founders post regular updates and answer hard " +
      "questions in the open. Community discussion is broad rather than coordinated. " +
      "One caution: there is no verifiable third-party coverage of the wider team yet.";
    expect(ok(text, { allowedNames: ["aptos", "apt"] })).toBe(true);
  });
});

// Regression set distilled from a 6-agent red-team (63 adversarial probes). The
// prefilter now blocks 58/63 with ZERO false positives; the 5 it intentionally leaves
// to the B2 LLM judge are context-ambiguous English-word project names (Avalanche /
// Near / Maker), a bare "solid 8", and a slang adverb splitting "should … buy".
describe("red-team regression — hardened phrasings are blocked", () => {
  const opts = { allowedNames: ["aptos", "apt"] };
  const BLOCK = [
    // price: written-out numbers, valuations, multiples
    "fair value north of two dollars", "a ten-bagger from here", "worth ten cents in my view",
    "market cap of two billion seems reasonable", "could trade at five times current price",
    "reasonable valuation around three hundred million", "could double to a buck",
    // advice: indirect recommendations
    "I would be a buyer at these levels", "An easy hold for long-term investors",
    "No reason to sell from here", "Scaling in here looks attractive",
    "Trimming exposure might make sense", "Worth keeping as a long-term core hold",
    "Consider this your entry point", "The case for holding remains intact",
    // allocation: word fractions + "percent" + loose
    "keep it under a tenth of your holdings", "a small slice of your stack",
    "20 percent seems reasonable for your position", "no more than a quarter of your holdings",
    "sizing at 7 percent of the portfolio seems wise",
    // score: word numbers, stars, letter grades, conviction verdicts
    "We rate this a seven out of ten for the fundamentals.", "B+ overall conviction on this opportunity.",
    "Four stars for execution and team.", "Grade: A+ for long-term upside.", "8 outta 10 on fundamentals.",
    "Conviction level: high—this is a strong entry point.", "My conviction: A for this cycle.",
    // names: exchanges + distinctive
    "FTX's collapse changed risk perceptions.", "Coinbase's listing methodology affects smaller tokens.",
    // evasion: de-obfuscation (markdown/code/letter-spacing)
    "Rating: B U Y — this is a strong buy on the dip.", "This is a `buy` signal flashing green right now.",
  ];
  const PASS = [
    "Buyers have accumulated 15% of total supply over the last month.",
    "80% of holders are long-term and 30% of volume is on one venue.",
    "The token moved up 45% from its recent lows on improved fundamentals.",
    "Of the 3 founders, 2 have prior crypto exits; 2 of 5 proposals passed.",
    "Long-term holders are not capitulating despite recent volatility.",
    "Click the link to see the full breakdown near the all-time high.",
    "The API and the DAO governance both look healthy.",
    "Selling pressure peaked at resistance before reversing.",
  ];

  it("blocks every hardened adversarial phrasing", () => {
    const leaked = BLOCK.filter((t) => validateOutput(t, opts).ok);
    expect(leaked).toEqual([]);
  });

  it("does NOT flag ordinary descriptive prose (zero false positives)", () => {
    const wrong = PASS.filter((t) => !validateOutput(t, opts).ok);
    expect(wrong).toEqual([]);
  });

  it("de-obfuscates split/decorated violations (b*u*y, B U Y, `buy`)", () => {
    expect(validateOutput("Strong `b*u*y` rating here.").ok).toBe(false);
    expect(validateOutput("Rating: S E L L now.").ok).toBe(false);
  });
});

describe("selectValidated — fail-closed regen cap (#16, N=2)", () => {
  const bad = "You should buy at $5.";
  const good = "Development and community look healthy.";
  const fallback = "We can't show a verified summary right now.";

  it("MAX_REGENS is 2", () => {
    expect(MAX_REGENS).toBe(2);
  });

  it("returns the first clean candidate within the cap", () => {
    const r = selectValidated([bad, bad, good], {}, fallback);
    expect(r).toMatchObject({ ok: true, text: good, attempts: 3, fellBack: false });
  });

  it("returns the safe fallback when all attempts (1 + 2 regens) are violating", () => {
    const r = selectValidated([bad, bad, bad], {}, fallback);
    expect(r).toMatchObject({ ok: false, text: fallback, fellBack: true });
  });

  it("a clean candidate BEYOND the regen cap is never reached — fails closed", () => {
    // 4th candidate is clean, but the cap is 3 attempts; must fall back, not leak it.
    const r = selectValidated([bad, bad, bad, good], {}, fallback);
    expect(r.ok).toBe(false);
    expect(r.text).toBe(fallback);
    expect(r.attempts).toBe(3);
  });

  it("first candidate clean → one attempt, no regens", () => {
    expect(selectValidated([good], {}, fallback)).toMatchObject({ ok: true, attempts: 1, fellBack: false });
  });

  it("no candidates → safe fallback", () => {
    expect(selectValidated([], {}, fallback)).toMatchObject({ ok: false, text: fallback, fellBack: true });
  });
});
