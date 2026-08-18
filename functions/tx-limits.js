/**
 * Transaction-cap derivation (CRYP-110 · B3, PR-tx-1) — CommonJS, pure, dependency-free.
 *
 * ONE source of truth for "how many transactions may this user hold on a single coin", shared by
 * the server-owned `addTransactionGuarded` callable (functions/index.js) and — conceptually —
 * firestore.rules (client transaction CREATE is now `if false`, so the callable is the sole
 * enforcement point). Kept as a pure decision (the same "pure decision, injected everywhere"
 * contract as functions/guards.js) so it is unit-testable with no emulator
 * (tests/unit/tx-limits.test.js). A near one-to-one MIRROR of the coin-limits.js sibling.
 *
 * The per-tier caps come from mergePlans()'s output (LIVE defaults: Starter/free 300 · Pro 1000 ·
 * Premium 2000). The hard ceiling is 1,000,000: a configured plan value OR a per-user
 * premiumLimits.transactions override above it is clamped down; a finite default below it is
 * returned unchanged. mergePlans already clamps `transactions` to 1e6, but txCapFor re-clamps
 * defensively so a raw/unmerged plans object (or a premiumLimits override, which mergePlans never
 * sees) can never lift the ceiling.
 */

// Hard ceiling — the absolute max transactions per coin, no matter the config/override.
const TX_HARD_MAX = 1000000;

// addTransactionGuarded add-limiter: a 500ms sliding cooldown (guards.checkCooldown) + a 500/UTC-day
// count budget (guards.consumeDailyBudget). Bounds a scripted add loop without impeding a real user.
const TX_COOLDOWN_MS = 500;
const TX_DAILY_LIMIT = 500;

// A finite, positive number or null. Guards against NaN/undefined/negatives creeping into Math.min.
function finiteOrNull(x) {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

/**
 * txCapFor(tier, plans, premiumLimits) → the per-coin transaction ceiling for this user.
 *   premium   → min(premiumLimits.transactions ?? plans.premium.transactions, TX_HARD_MAX)
 *   otherwise → min(plans[tier].transactions, TX_HARD_MAX)
 * A per-user premiumLimits.transactions override applies ONLY to premium; a non-premium user's
 * premiumLimits is ignored.
 */
function txCapFor(tier, plans, premiumLimits) {
  const p = plans || {};
  const tierPlan = p[tier] || {};
  let cap;
  if (tier === "premium") {
    const override = finiteOrNull(premiumLimits && premiumLimits.transactions);
    cap = override !== null ? override : finiteOrNull(tierPlan.transactions);
  } else {
    cap = finiteOrNull(tierPlan.transactions);
  }
  if (cap === null) cap = 0;   // unknown/missing tier → no headroom (fail closed)
  return Math.min(cap, TX_HARD_MAX);
}

module.exports = { txCapFor, TX_COOLDOWN_MS, TX_DAILY_LIMIT, TX_HARD_MAX };
