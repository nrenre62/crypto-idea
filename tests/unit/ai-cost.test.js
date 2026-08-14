import { describe, it, expect } from "vitest";
import {
  SONNET5_RATES, HAIKU45_RATES, costCents,
  readMonthSpendCents, chargeMonthCents, budgetExceeded,
} from "../../functions/ai-cost.js";

// Plan B PR-E1 — the pure token-cost + app-wide monthly $-budget helpers for the
// Wave-B AI proxy. Pure + dependency-injected (a FAKE Firestore, no emulator), the
// same injected-counter contract as guards.consumeDailyBudget. PR-E1 ships INERT — no
// callable wires these yet (PR-E2) — so this suite is the executable spec of the
// foundation.
//
// Model economics are FOUNDER-LOCKED: generation = Sonnet 5 ($3/$15 per Mtok in/out),
// judge = Haiku 4.5 ($1/$5). One app-wide cap lives at config/app.ai.monthlyCapCents
// (default 5000 = $50), metered on a server-only aiBudget/{YYYY-MM} doc.

// A fake Firestore that satisfies BOTH a plain db.doc(path).get() read (readMonthSpendCents)
// AND a runTransaction read-modify-set (chargeMonthCents — mirrors consumeDailyBudget, which
// does NOT use FieldValue.increment because that sentinel is undefined in the emulator).
const makeFakeDb = () => {
  const store = new Map();
  return {
    _store: store,
    doc: (path) => ({
      path,
      get: async () => ({ exists: store.has(path), data: () => store.get(path) }),
    }),
    runTransaction: async (fn) => fn({
      get: async (r) => ({ exists: store.has(r.path), data: () => store.get(r.path) }),
      set: (r, data) => { store.set(r.path, data); },
    }),
  };
};

describe("ai-cost.costCents (PR-E1: Anthropic token usage → whole cents, rounded UP)", () => {
  it("PR-E1: prices Sonnet 5 at $3/$15 per Mtok and rounds a fractional cent UP", () => {
    // (1000/1e6·$3 + 500/1e6·$15)·100 = (0.003 + 0.0075)·100 = 1.05¢ → charge conservatively → 2.
    expect(costCents({ input_tokens: 1000, output_tokens: 500 }, SONNET5_RATES)).toBe(2);
  });

  it("PR-E1: exposes the founder-locked per-Mtok rates for both models", () => {
    expect(SONNET5_RATES).toMatchObject({ inputPerMtok: 3, outputPerMtok: 15 });
    expect(HAIKU45_RATES).toMatchObject({ inputPerMtok: 1, outputPerMtok: 5 });
  });

  it("PR-E1: prices the cheaper judge model (Haiku 4.5) correctly, still rounding up", () => {
    // (1000/1e6·$1 + 500/1e6·$5)·100 = (0.001 + 0.0025)·100 = 0.35¢ → 1.
    expect(costCents({ input_tokens: 1000, output_tokens: 500 }, HAIKU45_RATES)).toBe(1);
  });

  it("PR-E1: a whole-cent cost is not needlessly bumped by the ceiling", () => {
    // Choose tokens that land on an EXACT cent: 1,000,000 in + 0 out on Sonnet = $3.00 = 300¢.
    expect(costCents({ input_tokens: 1_000_000, output_tokens: 0 }, SONNET5_RATES)).toBe(300);
  });

  it("PR-E1: zero usage costs zero (a call that produced nothing is free)", () => {
    // `=== 0` (not toBe) so a legitimate signed -0 from the round-up still counts as zero.
    expect(costCents({ input_tokens: 0, output_tokens: 0 }, SONNET5_RATES) === 0).toBe(true);
  });

  it("PR-E1: treats missing/garbage usage fields as zero — never NaN", () => {
    for (const bad of [{}, null, undefined]) {
      const c = costCents(bad, SONNET5_RATES);
      expect(Number.isNaN(c)).toBe(false);
      expect(c === 0).toBe(true);
    }
  });
});

describe("ai-cost.readMonthSpendCents (PR-E1: read the app-wide month budget)", () => {
  it("PR-E1: returns 0 when the month's budget doc does not exist yet", async () => {
    const db = makeFakeDb();
    expect(await readMonthSpendCents(db, { now: Date.UTC(2026, 7, 15) })).toBe(0);
  });

  it("PR-E1: reads the accumulated cents from aiBudget/{YYYY-MM} (UTC month key)", async () => {
    const db = makeFakeDb();
    db._store.set("aiBudget/2026-08", { cents: 4200, month: "2026-08" });
    expect(await readMonthSpendCents(db, { now: Date.UTC(2026, 7, 15) })).toBe(4200);
  });

  it("PR-E1: is keyed by the UTC calendar MONTH — a different month reads 0", async () => {
    const db = makeFakeDb();
    db._store.set("aiBudget/2026-08", { cents: 4200 });
    expect(await readMonthSpendCents(db, { now: Date.UTC(2026, 8, 1) })).toBe(0); // 2026-09
  });
});

describe("ai-cost.chargeMonthCents (PR-E1: transactional accrual into the month doc)", () => {
  it("PR-E1: accrues cents into aiBudget/{YYYY-MM}, creating the doc on first charge", async () => {
    const db = makeFakeDb();
    await chargeMonthCents(db, { cents: 105, now: Date.UTC(2026, 7, 15) });
    expect(db._store.get("aiBudget/2026-08").cents).toBe(105);
    // A second charge accumulates rather than overwriting.
    await chargeMonthCents(db, { cents: 50, now: Date.UTC(2026, 7, 20) });
    expect(db._store.get("aiBudget/2026-08").cents).toBe(155);
    expect(await readMonthSpendCents(db, { now: Date.UTC(2026, 7, 28) })).toBe(155);
  });

  it("PR-E1: writes to a fresh doc for a new UTC month (budgets reset monthly)", async () => {
    const db = makeFakeDb();
    await chargeMonthCents(db, { cents: 300, now: Date.UTC(2026, 7, 31, 23, 0) }); // 2026-08
    await chargeMonthCents(db, { cents: 40, now: Date.UTC(2026, 8, 1, 1, 0) });    // 2026-09
    expect(db._store.get("aiBudget/2026-08").cents).toBe(300);
    expect(db._store.get("aiBudget/2026-09").cents).toBe(40);
  });

  it("PR-E1: records an overage — a charge that crosses the cap STILL lands (next call refuses)", async () => {
    const db = makeFakeDb();
    db._store.set("aiBudget/2026-08", { cents: 4990 });
    await chargeMonthCents(db, { cents: 30, now: Date.UTC(2026, 7, 15) }); // 4990 → 5020, past a 5000 cap
    expect(db._store.get("aiBudget/2026-08").cents).toBe(5020);
  });
});

describe("ai-cost.budgetExceeded (PR-E1: the app-wide monthly $-cap decision)", () => {
  it("PR-E1: allows spend below the cap", () => {
    expect(budgetExceeded(4999, 5000)).toBe(false);
    expect(budgetExceeded(0, 5000)).toBe(false);
  });

  it("PR-E1: denies once spend has REACHED the cap (>= is the wall)", () => {
    expect(budgetExceeded(5000, 5000)).toBe(true);
  });

  it("PR-E1: denies an overage — a prior call that crossed the cap refuses the next", () => {
    // Mid-request overage rule: the crossing charge still records; THIS is the call it stops.
    expect(budgetExceeded(5020, 5000)).toBe(true);
  });
});
