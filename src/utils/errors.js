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
  if (reason === "already-exists")
    return "That's already in this portfolio.";
  if (reason === "missing-target")
    return "That item no longer exists on the server — resyncing…";
  if (reason === "rate-limited")
    // CRYP-109/111: the addCoinGuarded / addTransactionGuarded cooldown + per-day cap — a TRANSIENT
    // throttle, not a plan cap. Generic wording so it's honest for BOTH the coin and the transaction
    // add path. Never the misleading connection fallback and never the 'upgrade' line.
    return "You're doing that too fast — please wait a moment and try again.";
  if (reason === "invalid-or-denied")
    return "That change couldn't be saved — please check the details and try again.";
  if (reason === "not-found" || code === "not-found")
    return "That item was already removed (maybe on another device).";
  if (code === "unauthenticated") return "Please sign in again.";
  if (code === "permission-denied")
    // A denial at a call site that didn't classify (a no-limit op) — honest, never a
    // guessed "limit".
    return "That change isn't allowed right now.";
  // Genuine connection / unknown error.
  return fallback;
}

/**
 * ADMIN-0 — the server-side signups gate, translated for a human.
 *
 * When the `beforeCreate` blocking function refuses, Firebase Auth does NOT surface a
 * dedicated error code: the client gets `auth/internal-error` with the server's text
 * buried inside a `BLOCKING_FUNCTION_ERROR_RESPONSE : ((HTTP request to … returned
 * HTTP error 403: {…}))` wrapper. Left alone, the code map in firebase-auth.js falls
 * through to "Something went wrong. Try again." — telling someone to retry a thing
 * that is deliberately switched off, forever. That is the exact bug class R31-6 fixed
 * for suspended accounts and B-PORT fixed for plan limits.
 *
 * We show OUR OWN copy rather than echoing the extracted server string: there is
 * exactly one blocking rule today, and not parsing upstream text into the UI keeps
 * the surface at zero. tests/unit/admin-0-guards.test.js fails the build if a SECOND
 * blocking reason is added to functions/index.js without revisiting this.
 */
export const SIGNUPS_PAUSED_MSG = "New signups are currently paused. Please check back soon.";

/* The shape is NOT contractual, and the two layers disagree — which is why this
 * matches several markers instead of one. Measured against the emulator 2026-07-24:
 *
 *   raw REST : "BLOCKING_FUNCTION_ERROR_RESPONSE : ((HTTP request to …403: {…}))"
 *   JS SDK   : "Firebase: ((HTTP request to …/beforeCreateUser returned HTTP error
 *               403: {\"error\":{…,\"status\":\"PERMISSION_DENIED\"}})) (auth/internal-error)."
 *
 * The SDK STRIPS the BLOCKING_FUNCTION_ERROR_RESPONSE prefix, so matching only that
 * (the obvious choice from reading the server's response) silently never fires in the
 * app — which is exactly what the first version of this did, and only a real browser
 * caught it.
 *
 * The FIRST marker is our own sentence, echoed back inside the error body by both
 * layers — the most specific and the most portable, since it's a string we control.
 *
 * ⚠️ `PERMISSION_DENIED` was tried as a marker and REMOVED. Every Firestore rules
 * denial message begins with it ("PERMISSION_DENIED: \nfalse for 'create' @ L80"), so
 * ANY rules rejection during signup got reported as "signups are paused" — a confident
 * lie about a completely unrelated failure. Measured live 2026-07-24. Markers must be
 * strings only THIS failure can produce.
 *
 * ⚠️ Verified against the EMULATOR only. A deployed project may word the wrapper
 * differently, and the function-name marker relies on the URL appearing in the
 * message. Failure is safe but degraded: an unmatched error falls through to
 * "Something went wrong. Try again." — misleading, not dangerous. Confirming the real
 * production string is a go-live item (GO-LIVE-AUDIT.md Phase 7).
 */
const BLOCKED_MARKERS = [
  SIGNUPS_PAUSED_MSG,                   // our own sentence, echoed back inside the error body
  "BLOCKING_FUNCTION_ERROR_RESPONSE",   // raw Identity Toolkit REST
  "beforeCreateUser",                   // our function name, carried in the SDK's URL echo
];

export function isSignupBlockedError(error) {
  const msg = String((error && error.message) || "");
  return BLOCKED_MARKERS.some((marker) => msg.includes(marker));
}
