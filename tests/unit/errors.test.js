import { describe, it, expect } from "vitest";
import { apiErrorMessage } from "../../src/utils/errors.js";

// apiErrorMessage (DI-1 "verify-then-toast", ERRORS.md §A4): a failed data-layer result
// carries an error `code` (Firestore) AND — for the three write paths — a classified
// `reason`. The limit/upgrade message fires ONLY on reason:'limit' (a SERVER-confirmed
// cap), never on a blind permission-denied guess (that was the founder's false "coin
// limit" bug). This pure mapper turns (code, reason) into an honest message.
describe("apiErrorMessage", () => {
  const CONN = "Couldn't create portfolio. Check your connection.";
  const LIMIT = "You've reached your plan's portfolio limit — upgrade for more.";

  it("shows the per-call limit message ONLY on a server-confirmed reason:'limit'", () => {
    expect(apiErrorMessage({ success: false, code: "permission-denied", reason: "limit" }, CONN, LIMIT)).toBe(LIMIT);
  });

  it("does NOT show the limit message for a permission-denied with no confirmed limit (the founder bug)", () => {
    const m = apiErrorMessage({ success: false, code: "permission-denied", reason: "invalid-or-denied" }, CONN, LIMIT);
    expect(m).not.toBe(LIMIT);              // never blame the tier on a data-validity failure
    expect(m).not.toBe(CONN);               // never the misleading connection string either
    expect(m).toMatch(/couldn.t be saved|check the details/i);
  });

  it("tells the user an item vanished (missing-target) instead of a fake limit", () => {
    const m = apiErrorMessage({ success: false, code: "permission-denied", reason: "missing-target" }, CONN, LIMIT);
    expect(m).not.toBe(LIMIT);
    expect(m).toMatch(/no longer exists|resyncing/i);
  });

  it("maps not-found (deleted on another device) to a clear message, not a connection error", () => {
    const m = apiErrorMessage({ success: false, code: "not-found" }, CONN);
    expect(m).not.toBe(CONN);
    expect(m).toMatch(/already removed/i);
  });

  it("a bare permission-denied (no reason) is honest and never guesses 'limit'", () => {
    const m = apiErrorMessage({ success: false, code: "permission-denied" }, CONN, LIMIT);
    expect(m).not.toBe(LIMIT);
    expect(m).not.toBe(CONN);
    expect(m).toMatch(/isn.t allowed/i);
  });

  it("asks the user to sign in again on unauthenticated", () => {
    expect(apiErrorMessage({ success: false, code: "unauthenticated" }, CONN, LIMIT))
      .toMatch(/sign in again/i);
  });

  it("falls back to the connection message for a real network/unknown error", () => {
    expect(apiErrorMessage({ success: false, code: "unavailable" }, CONN, LIMIT)).toBe(CONN);
    expect(apiErrorMessage({ success: false }, CONN, LIMIT)).toBe(CONN);          // no code at all
    expect(apiErrorMessage({ success: false, error: "boom" }, CONN)).toBe(CONN);  // only a message
  });

  it("is null-safe (treats a missing result as a connection failure)", () => {
    expect(apiErrorMessage(null, CONN, LIMIT)).toBe(CONN);
    expect(apiErrorMessage(undefined, CONN)).toBe(CONN);
  });
});
