import { describe, it, expect } from "vitest";
import { apiErrorMessage } from "../../src/utils/errors.js";

// apiErrorMessage (ERRORS.md §A1/§A2): a failed data-layer result carries an error
// `code` (Firestore). A rule denial surfaces as `permission-denied` — a plan limit or
// a disallowed write — which the app used to mislabel as "Check your connection."
// This pure mapper turns the code into an honest, user-facing message.
describe("apiErrorMessage", () => {
  const CONN = "Couldn't create portfolio. Check your connection.";
  const LIMIT = "You've reached your plan's portfolio limit — upgrade for more.";

  it("returns the per-call limit message for a permission-denied (the B-PORT bug)", () => {
    expect(apiErrorMessage({ success: false, code: "permission-denied" }, CONN, LIMIT)).toBe(LIMIT);
  });

  it("returns a sensible default for permission-denied when no limit message is given", () => {
    const m = apiErrorMessage({ success: false, code: "permission-denied" }, CONN);
    expect(m).not.toBe(CONN);              // never the misleading connection string
    expect(m).toMatch(/not allowed|plan limit/i);
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
