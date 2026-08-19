// CRYP-101 — LAUNCH-FREE Part B: the paidPlansEnabled top-level switch.
//
// A TOP-LEVEL config/app flag (a peer of maintenance / signupsEnabled /
// requireAdminMfa — NOT a flags.features switch) that pauses NEW paid
// subscriptions and drives the launch-free UI. This is the single pure predicate
// both ends read: the server (the createSubscription gate, /api/config) and the
// client bundle.
//
// Pure module: no Firestore, no network — so the rule below is unit-testable with
// no emulator (tests/unit/flags.test.js).
//
// Paid plans are OFF unless config says EXACTLY true (CRYP-113). Default-OFF is
// deliberate and load-bearing, and the fail-OPEN rationale is deliberately REVERSED
// here: there are ZERO paid users pre-launch and the app is launching free, so a
// config/app that is missing (fresh project), unreadable (a transient Firestore
// error), or simply predates this flag must all resolve to "no payments", never
// "silently open the revenue funnel". Existing post-launch subscribers are untouched
// — their manage/cancel is tier-gated, not flag-gated. Paid mode may only ever engage
// because a human deliberately set the flag to true; a garbage/truthy value is not a
// deliberate flip, so only an exact boolean true counts.
function paidPlansOn(cfg) {
  return !!(cfg && cfg.flags && cfg.flags.paidPlansEnabled === true);
}

module.exports = { paidPlansOn };
