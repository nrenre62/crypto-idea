// ADMIN-4 · Growth metrics — the pure half of the daily stats snapshot.
//
// One document per UTC day in `statsDaily/{YYYY-MM-DD}` holds an AGGREGATE-ONLY
// point-in-time reading: counts, revenue, signups. No uid, no email, nothing
// personal — which is why the series is kept indefinitely (founder, 2026-07-24)
// and never needs an erasure path.
//
// NOTE on the collection name: the backlog wrote this as `stats/daily/{date}`,
// which is a three-segment path = a COLLECTION, not a document. `statsDaily/{date}`
// is the valid equivalent and says what it is.
//
// Kept pure + dependency-free so the maths is unit-testable without Firestore.

// Round money to whole cents. Stored history must not drift on float noise —
// a chart built from 0.30000000000000004 renders fine but exports ugly.
const cents = (v) => Math.round(num(v) * 100) / 100;

function num(v) {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

// A whole non-negative count. Anything else (null, NaN, -1, "12") normalises,
// because a snapshot is written once a day and a bad value is permanent.
const count = (v) => Math.max(0, Math.round(num(v)));

// The UTC day a capture belongs to — also the document id, so ids sort
// lexicographically in true chronological order (no orderBy field needed).
//
// Rejects a non-positive or non-finite clock OUTRIGHT rather than coercing it:
// num(NaN) is 0 and `new Date(0)` is a perfectly valid date, so coercion would
// silently file the capture under 1970-01-01 — permanent, wrong history that
// then anchors every "vs 30 days ago" delta.
function snapshotId(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// Build the stored document from a gatherStats() result plus the two figures
// that need their own pass (signups from Auth, and the capture clock).
//
// `paidUsers` is stored EXPLICITLY rather than derived at read time: it is the
// churn denominator, and if the tier set ever changes, a historical snapshot
// must keep meaning what it meant on the day it was written.
function buildSnapshot(stats, extras) {
  const s = stats || {};
  const e = extras || {};
  const atMs = e.atMs;
  const date = snapshotId(atMs);
  if (!date) return null;
  const proUsers = count(s.proUsers);
  const premiumUsers = count(s.premiumUsers);
  return {
    date,
    at: atMs,
    totalUsers: count(s.totalUsers),
    freeUsers: count(s.freeUsers),
    proUsers,
    premiumUsers,
    paidUsers: proUsers + premiumUsers,
    // Forward-looking churn signal: subscriptions already cancelled or failing,
    // which have NOT yet dropped a tier (access runs to endDate).
    canceledSubs: count(s.canceledSubs),
    pastDueSubs: count(s.pastDueSubs),
    // Accounts created in the 24h before this capture, counted from the Auth
    // record's creationTime. If a scheduled run is MISSED, that day's signups
    // are simply not counted anywhere — the window is fixed, not cumulative.
    signups24h: count(e.signups24h),
    grossRevenue: cents(s.grossRevenue),
    paymentFees: cents(s.paymentFees),
    netRevenue: cents(s.netRevenue),
    totalPortfolios: count(s.totalPortfolios),
    totalCoins: count(s.totalCoins),
  };
}

module.exports = { snapshotId, buildSnapshot };
