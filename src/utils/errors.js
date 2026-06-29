/**
 * Map a failed data-layer result to an honest, user-facing message.
 *
 * The data layer (src/api/firebase-database.js) returns
 * `{ success:false, error, code }` on failure, where `code` is the Firestore error
 * code. A security-rule denial surfaces as `code:"permission-denied"` — which means a
 * plan limit was hit or the write isn't allowed, NOT a network outage. The app used to
 * show "Check your connection." for every failure, masking the real cause (see
 * ERRORS.md §A1 "B-PORT" + §A2).
 *
 * @param res       the failed result ({ success:false, code? })
 * @param fallback  message for a genuine connection/unknown error
 * @param limitMsg  message for a permission-denied at this call site (e.g. a plan
 *                  limit + upgrade hook); omit for the generic "not allowed" default.
 */
export function apiErrorMessage(res, fallback, limitMsg) {
  const code = res && res.code;
  if (code === "permission-denied")
    return limitMsg || "That action isn't allowed — you may have reached a plan limit.";
  if (code === "unauthenticated") return "Please sign in again.";
  return fallback;
}
