import { describe, it, expect } from "vitest";
import {
  txCapFor, TX_COOLDOWN_MS, TX_DAILY_LIMIT, TX_HARD_MAX,
} from "../../functions/tx-limits.js";

// CRYP-110 (B3, PR-tx-1): the pure per-coin transaction-cap derivation the
// addTransactionGuarded callable and firestore.rules must AGREE on — one source of truth,
// unit-tested with no emulator (the same "pure decision, injected everywhere" contract as
// functions/guards.js + the coin-limits.js sibling).
//
//   txCapFor(tier, plans, premiumLimits):
//     premium   -> min(premiumLimits.transactions ?? plans.premium.transactions, 1_000_000)
//     otherwise -> min(plans[tier].transactions, 1_000_000)
//
// The per-tier DEFAULT tx caps confirmed live from functions/index.js DEFAULT_PLANS
// (2026-08-18): Starter/free 300 · Pro 1000 · Premium 2000. The hard ceiling is 1,000,000
// (mergePlans already clamps `transactions` to 1e6) — a configured plan value OR a per-user
// premiumLimits override above it is clamped down; a finite default below it is returned
// unchanged.
const PLANS = {
  free:    { transactions: 300 },
  pro:     { transactions: 1000 },
  premium: { transactions: 2000 },
};

describe("tx-limits.txCapFor (CRYP-110)", () => {
  it("CRYP-110: returns the per-tier default tx cap (free 300 / pro 1000 / premium 2000)", () => {
    expect(txCapFor("free", PLANS)).toBe(300);
    expect(txCapFor("pro", PLANS)).toBe(1000);
    expect(txCapFor("premium", PLANS)).toBe(2000);
  });

  it("CRYP-110: clamps a configured cap above 1,000,000 down to the hard ceiling (TX_HARD_MAX)", () => {
    expect(txCapFor("premium", { premium: { transactions: 5_000_000 } })).toBe(1_000_000);
    expect(txCapFor("pro", { pro: { transactions: 5_000_000 } })).toBe(1_000_000);
  });

  it("CRYP-110: a premium premiumLimits.transactions override wins over the plan, but is still clamped to 1,000,000", () => {
    // A LOWER admin override is honoured over the tier default...
    expect(txCapFor("premium", PLANS, { transactions: 3 })).toBe(3);
    // ...and an over-generous override is clamped to the 1,000,000 ceiling.
    expect(txCapFor("premium", PLANS, { transactions: 5_000_000 })).toBe(1_000_000);
    // The per-user override applies ONLY to premium — a non-premium user's premiumLimits is ignored.
    expect(txCapFor("free", PLANS, { transactions: 999 })).toBe(300);
  });
});

describe("tx-limits constants (CRYP-110)", () => {
  it("CRYP-110: exposes the add-tx cooldown/daily-cap + the tx hard ceiling", () => {
    expect(TX_COOLDOWN_MS).toBe(500);
    expect(TX_DAILY_LIMIT).toBe(500);
    expect(TX_HARD_MAX).toBe(1000000);
  });
});
