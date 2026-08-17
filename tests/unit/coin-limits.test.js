import { describe, it, expect } from "vitest";
import {
  coinCapFor, ADD_COOLDOWN_MS, ADD_DAILY_LIMIT, COIN_HARD_MAX,
} from "../../functions/coin-limits.js";

// CRYP-108 (B3, PR-1): the pure coin-cap derivation the addCoinGuarded callable and
// firestore.rules must AGREE on — one source of truth, unit-tested with no emulator (the
// same "pure decision, injected everywhere" contract as functions/guards.js).
//
//   coinCapFor(tier, plans, premiumLimits):
//     premium   -> min(premiumLimits.coins ?? plans.premium.coins, 1000)
//     otherwise -> min(plans[tier].coins, 1000)
//
// The per-tier DEFAULT coin caps confirmed live from functions/index.js DEFAULT_PLANS
// (2026-08-17): Starter/free 30 · Pro 100 · Premium 200. The #20 hard ceiling is 1,000 —
// a configured plan value OR a per-user premiumLimits override above it is clamped down;
// a finite default below it is returned unchanged.
const PLANS = {
  free:    { coins: 30 },
  pro:     { coins: 100 },
  premium: { coins: 200 },
};

describe("coin-limits.coinCapFor (CRYP-108)", () => {
  it("CRYP-108: returns the per-tier default coin cap (free 30 / pro 100 / premium 200)", () => {
    expect(coinCapFor("free", PLANS)).toBe(30);
    expect(coinCapFor("pro", PLANS)).toBe(100);
    expect(coinCapFor("premium", PLANS)).toBe(200);
  });

  it("CRYP-108: clamps a configured cap above 1,000 down to the #20 hard ceiling", () => {
    expect(coinCapFor("premium", { premium: { coins: 5000 } })).toBe(1000);
    expect(coinCapFor("pro", { pro: { coins: 5000 } })).toBe(1000);
  });

  it("CRYP-108: a premium premiumLimits.coins override wins over the plan, but is still clamped to 1,000", () => {
    // A LOWER admin override is honoured over the tier default...
    expect(coinCapFor("premium", PLANS, { coins: 3 })).toBe(3);
    // ...and an over-generous override is clamped to the 1,000 ceiling (#20).
    expect(coinCapFor("premium", PLANS, { coins: 5000 })).toBe(1000);
    // The per-user override applies ONLY to premium — a non-premium user's premiumLimits is ignored.
    expect(coinCapFor("free", PLANS, { coins: 999 })).toBe(30);
  });
});

describe("coin-limits constants (CRYP-108)", () => {
  it("CRYP-108: exposes the add-limiter cooldown/daily-cap + the coin hard ceiling", () => {
    expect(ADD_COOLDOWN_MS).toBe(2000);
    expect(ADD_DAILY_LIMIT).toBe(100);
    expect(COIN_HARD_MAX).toBe(1000);
  });
});
