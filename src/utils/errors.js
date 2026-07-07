/**
 * Map a failed data-layer result to an HONEST, user-facing message (DI-1 "verify-then-toast").
 *
 * The data layer (src/api/firebase-database.js) returns `{ success:false, error, code, reason? }`
 * on failure. A `permission-denied` code is NOT proof of a plan limit — it can be invalid data
 * (an over-long thesis — the founder's actual bug), a missing parent, or an auth lapse. So the
 * write functions now CLASSIFY a denial into a `reason` by re-reading the server:
 *   'limit'            → the count is genuinely at the cap (the ONLY time we show upgrade)
 *   'missing-target'   → the parent doc no longer exists (caller also kicks a self-heal)
 *   'invalid-or-denied'→ rejected for some other reason (bad/oversized data)
 *
 * The limit/upgrade message therefore fires ONLY on `reason:'limit'` — never on a blind guess
 * (ERRORS.md §A4, superseding the §A1/§A2 "permission-denied ⇒ limit" mapping).
 *
 * @param res       the failed result ({ success:false, code?, reason? })
 * @param fallback  message for a genuine connection/unknown error (no reason classified)
 * @param limitMsg  the plan-limit + upgrade message for THIS call site (only used on reason:'limit')
 */
export function apiErrorMessage(res, fallback, limitMsg) {
  const code = res && res.code;
  const reason = res && res.reason;
  if (reason === "limit")
    return limitMsg || "You've reached a plan limit — upgrade for more.";
  if (reason === "missing-target")
    return "That item no longer exists on the server — resyncing…";
  if (reason === "invalid-or-denied")
    return "That change couldn't be saved — please check the details and try again.";
  if (code === "not-found")
    return "That item was already removed (maybe on another device).";
  if (code === "unauthenticated") return "Please sign in again.";
  if (code === "permission-denied")
    // A denial at a call site that didn't classify (a no-limit op) — honest, never a
    // guessed "limit".
    return "That change isn't allowed right now.";
  // Genuine connection / unknown error.
  return fallback;
}
