// R28-2: ONE source of truth for what each tier promises — consumed by the plan-picker
// cards (Login.jsx), the welcome screen, AND the /pro-success confirmation page, so they
// cannot drift. Extracted to its own tiny module (Plan B PR-B) so the standalone
// /pro-success route can read it without pulling all of Login.jsx into its chunk.
//
// Honest framing: same product, more room — every tier gets all features (live prices,
// P/L, Journal, Research, Learn); tiers differ by capacity, and Premium adds the real
// priority-email-support promise (the untrue "Custom limits" was dropped).
export const PLAN_BENEFITS = {
  free: {
    limits: ["3 portfolios", "30 coins per portfolio", "300 transactions per coin"],
    feature: "All features included — live prices, P/L, Journal, Research, Learn",
  },
  pro: {
    limits: ["6 portfolios", "100 coins per portfolio", "1,000 transactions per coin"],
    feature: "All features included — live prices, P/L, Journal, Research, Learn",
  },
  premium: {
    limits: ["15 portfolios", "200 coins per portfolio", "2,000 transactions per coin"],
    feature: "All features included + priority email support",
  },
};
