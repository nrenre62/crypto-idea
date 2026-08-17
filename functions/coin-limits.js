/**
 * Coin-cap derivation (CRYP-108 · B3, PR-1) — CommonJS, pure, dependency-free.
 *
 * ONE source of truth for "how many coins may this user hold in a portfolio", shared by the
 * server-owned `addCoinGuarded` callable (functions/index.js) and — conceptually — firestore.rules
 * (client coin CREATE is now `if false`, so the callable is the sole enforcement point). Kept as a
 * pure decision (the same "pure decision, injected everywhere" contract as functions/guards.js) so
 * it is unit-testable with no emulator (tests/unit/coin-limits.test.js).
 *
 * The per-tier caps come from mergePlans()'s output (LIVE defaults: Starter/free 30 · Pro 100 ·
 * Premium 200). The #20 hard ceiling is 1,000: a configured plan value OR a per-user
 * premiumLimits.coins override above it is clamped down; a finite default below it is returned
 * unchanged. mergePlans already clamps `coins` to 1,000, but coinCapFor re-clamps defensively so a
 * raw/unmerged plans object (or a premiumLimits override, which mergePlans never sees) can never
 * lift the ceiling.
 */

// #20 hard ceiling — the absolute max coins per portfolio, no matter the config/override.
const COIN_HARD_MAX = 1000;

// addCoinGuarded add-limiter: a 2s sliding cooldown (guards.checkCooldown) + a 100/UTC-day count
// budget (guards.consumeDailyBudget). Bounds a scripted add loop without impeding a real user.
const ADD_COOLDOWN_MS = 2000;
const ADD_DAILY_LIMIT = 100;

// A finite, positive number or null. Guards against NaN/undefined/negatives creeping into Math.min.
function finiteOrNull(x) {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

/**
 * coinCapFor(tier, plans, premiumLimits) → the per-portfolio coin ceiling for this user.
 *   premium   → min(premiumLimits.coins ?? plans.premium.coins, COIN_HARD_MAX)
 *   otherwise → min(plans[tier].coins, COIN_HARD_MAX)
 * A per-user premiumLimits.coins override applies ONLY to premium; a non-premium user's
 * premiumLimits is ignored.
 */
function coinCapFor(tier, plans, premiumLimits) {
  const p = plans || {};
  const tierPlan = p[tier] || {};
  let cap;
  if (tier === "premium") {
    const override = finiteOrNull(premiumLimits && premiumLimits.coins);
    cap = override !== null ? override : finiteOrNull(tierPlan.coins);
  } else {
    cap = finiteOrNull(tierPlan.coins);
  }
  if (cap === null) cap = 0;   // unknown/missing tier → no headroom (fail closed)
  return Math.min(cap, COIN_HARD_MAX);
}

module.exports = { coinCapFor, ADD_COOLDOWN_MS, ADD_DAILY_LIMIT, COIN_HARD_MAX };
