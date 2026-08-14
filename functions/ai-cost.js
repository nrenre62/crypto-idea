"use strict";
// functions/ai-cost.js
// Plan B PR-E1 — pure token-cost pricing + the app-wide monthly $-budget ledger for
// the Wave-B AI research proxy. Pure + dependency-injected (the caller passes a
// Firestore `db`), the SAME injected-counter contract as guards.consumeDailyBudget —
// so it is exhaustively unit-testable against a fake db with no emulator. PR-E1 ships
// INERT: no callable meters against these yet (that is PR-E2).
//
// Model economics are FOUNDER-LOCKED: generation = Sonnet 5 ($3 / $15 per Mtok in/out),
// judge = Haiku 4.5 ($1 / $5). ONE app-wide cap lives at config/app.ai.monthlyCapCents
// (default 5000 = $50), metered on a server-only aiBudget/{YYYY-MM} doc (rules deny all
// client access — a client-writable meter could be zeroed to defeat the whole cap).

// USD per million tokens (input / output), founder-locked.
const SONNET5_RATES = { inputPerMtok: 3, outputPerMtok: 15 };
const HAIKU45_RATES = { inputPerMtok: 1, outputPerMtok: 5 };

// Anthropic usage → whole cents, rounded UP (charge conservatively — never undercount
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

module.exports = {
  SONNET5_RATES,
  HAIKU45_RATES,
  costCents,
  monthKey,
  readMonthSpendCents,
  chargeMonthCents,
  budgetExceeded,
};
