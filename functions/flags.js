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
// A switch is ON unless config says EXACTLY false. Default-ON is deliberate and
// load-bearing: config/app can be missing (fresh project), unreadable (a transient
// Firestore error), or simply predate this flag — and in every one of those cases
// the right answer is "paid plans available", never "silently kill the revenue
// funnel". Launch-free mode may only ever engage because a human deliberately
// flipped it. Same !== false idiom signupsEnabled and the feature kill-switches
// use, for the same reason — a garbage/truthy value is not a deliberate flip.
function paidPlansOn(cfg) {
  return !(cfg && cfg.flags && cfg.flags.paidPlansEnabled === false);
}

module.exports = { paidPlansOn };
