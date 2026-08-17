"use strict";
// functions/ai-cost.js
// Plan B PR-E1 — pure token-cost pricing + the app-wide monthly $-budget ledger for
// the Wave-B AI research proxy. Pure + dependency-injected (the caller passes a
// Firestore `db`), the SAME injected-counter contract as guards.consumeDailyBudget —
// so it is exhaustively unit-testable against a fake db with no emulator. PR-E1 ships
// INERT: no callable meters against these yet (that is PR-E2).
//
// Model economics: the generation model and the (cheaper) judge model are priced per million
// tokens. ONE app-wide cap lives at config/app.ai.monthlyCapCents (default 5000 = $50), metered
// on a server-only aiBudget/{YYYY-MM} doc (rules deny all client access — a client-writable
// meter could be zeroed to defeat the whole cap). The model ids themselves are admin config
// (config/app.ai.generationModel / judgeModel); these default rates match those models — if you
// paste a differently-priced model, adjust the numbers here so the cost estimate stays honest.

// USD per million tokens (input / output).
const GEN_RATES = { inputPerMtok: 3, outputPerMtok: 15 };
const JUDGE_RATES = { inputPerMtok: 1, outputPerMtok: 5 };

// Provider token usage → whole cents, rounded UP (charge conservatively — never undercount
// spend against the cap). Missing/garbage usage or a non-finite result is 0, never NaN;
// a call that produced nothing is free.
function costCents(usage, rates) {
  const u = usage && typeof usage === "object" ? usage : {};
  const r = rates || {};
  const cents =
    ((Number(u.input_tokens) || 0) / 1e6 * (Number(r.inputPerMtok) || 0) +
      (Number(u.output_tokens) || 0) / 1e6 * (Number(r.outputPerMtok) || 0)) * 100;
  if (!Number.isFinite(cents) || cents <= 0) return 0;
  return Math.ceil(cents);
}

// UTC calendar-month key "YYYY-MM" from an epoch-ms timestamp. Budgets reset monthly,
// and the key IS the doc id, so aiBudget ids sort chronologically with no index.
function monthKey(now) {
  const d = new Date(typeof now === "number" ? now : Date.now());
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function budgetPath(now) {
  return `aiBudget/${monthKey(now)}`;
}

// Read the accumulated cents for the CURRENT UTC month. Absent doc → 0.
async function readMonthSpendCents(db, { now = Date.now() } = {}) {
  const snap = await db.doc(budgetPath(now)).get();
  if (!snap || !snap.exists) return 0;
  const data = snap.data() || {};
  return Number(data.cents) || 0;
}

// Transactionally accrue `cents` into aiBudget/{YYYY-MM}, creating the month doc on the
// first charge and accumulating thereafter. Mirrors guards.consumeDailyBudget: a plain
// read-modify-set (NOT FieldValue.increment, which is undefined in the emulator). A
// crossing charge STILL lands — the mid-request overage rule is that this charge records
// and the NEXT call is the one budgetExceeded refuses.
async function chargeMonthCents(db, { cents, now = Date.now() } = {}) {
  const add = Number(cents) || 0;
  const month = monthKey(now);
  const ref = db.doc(budgetPath(now));
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const current = snap && snap.exists ? (Number(snap.data().cents) || 0) : 0;
    const next = current + add;
    t.set(ref, { cents: next, month, updatedAt: Date.now() });
    return next;
  });
}

// The app-wide monthly $-cap decision. `>=` is the wall: once spend has REACHED the cap
// the next call refuses (a prior charge that crossed the cap already recorded).
function budgetExceeded(spentCents, capCents) {
  return (Number(spentCents) || 0) >= (Number(capCents) || 0);
}

// ─── PR-E2.5 (CRYP-107): atomic reserve-then-settle for the app-wide monthly $-cap ───
// The read-then-act cap check (readMonthSpendCents → budgetExceeded → generate →
// chargeMonthCents) is NOT atomic: N in-flight requests can all read spent<cap and all
// generate before any charge, overshooting by ~(concurrency × per-request cost).
// reserveMonthCents atomically holds the worst-case ESTIMATE up front; the existing
// chargeMonthCents then settles the delta (actual-reserved, possibly negative) to release
// the over-reservation. reservationMaxCents derives that worst-case estimate.

// Worst-case per-request token ceilings. EST_GEN_OUTPUT_MAX mirrors researchAsk's
// buildMessagesRequest generation maxTokens (1024); EST_JUDGE_OUTPUT_MAX mirrors its judge
// maxTokens (16). Chosen so genMax rounds to 3¢ and judgeMax to 1¢ (see reservationMaxCents).
// A future token-cap change here (or a MAX_REGENS change below) must move in lockstep with
// researchAsk/validate-output — this is the single visible edit point for the reservation size.
const EST_GEN_INPUT_MAX = 2000;    // ~context + question, worst case
const EST_GEN_OUTPUT_MAX = 1024;   // == researchAsk generation buildMessagesRequest maxTokens
const EST_JUDGE_INPUT_MAX = 2000;  // ~candidate text handed to the judge, worst case
const EST_JUDGE_OUTPUT_MAX = 16;   // == researchAsk judge buildMessagesRequest maxTokens

// The worst-case per-request cost = (maxRegens+1) attempts, each one generation + one judge
// call. maxRegens defaults to validate-output's MAX_REGENS (2 → 1 initial + 2 regens). Reuses
// the REAL costCents (same round-UP as the actual charge) so the estimate can never undercount.
// genMax = ceil(2.136¢) = 3, judgeMax = ceil(0.208¢) = 1 → default 3 × (3+1) = 12¢.
function reservationMaxCents({ maxRegens = 2 } = {}) {
  const genMax = costCents({ input_tokens: EST_GEN_INPUT_MAX, output_tokens: EST_GEN_OUTPUT_MAX }, GEN_RATES);
  const judgeMax = costCents({ input_tokens: EST_JUDGE_INPUT_MAX, output_tokens: EST_JUDGE_OUTPUT_MAX }, JUDGE_RATES);
  const attempts = (Number(maxRegens) || 0) + 1;
  return attempts * (genMax + judgeMax);
}

// Atomically reserve `estCents` against the current UTC month's budget. Mirrors chargeMonthCents'
// transaction shape AND guards.consumeDailyBudget's deny-consumes-nothing semantics: in ONE
// transaction, read current spend, and either DENY (reserving nothing) when current+estCents would
// exceed the cap, or hold the worst-case estimate by setting the ledger to current+estCents. A
// genuine transaction error THROWS (the caller maps it to a fail-closed 503) — never swallowed.
async function reserveMonthCents(db, { estCents, capCents, now = Date.now() } = {}) {
  const est = Number(estCents) || 0;
  const cap = Number(capCents) || 0;
  const month = monthKey(now);
  const ref = db.doc(budgetPath(now));
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const current = snap && snap.exists ? (Number(snap.data().cents) || 0) : 0;
    if (current + est > cap) {
      return { allowed: false, spent: current, cap };
    }
    const next = current + est;
    t.set(ref, { cents: next, month, updatedAt: Date.now() });
    return { allowed: true, reservedCents: est, spent: next };
  });
}

module.exports = {
  GEN_RATES,
  JUDGE_RATES,
  costCents,
  monthKey,
  readMonthSpendCents,
  chargeMonthCents,
  budgetExceeded,
  reservationMaxCents,
  reserveMonthCents,
};
