import { describe, it, expect } from "vitest";
import { apiErrorMessage, isSignupBlockedError, SIGNUPS_PAUSED_MSG } from "../../src/utils/errors.js";

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

  // CRYP-109 (B3 PR-2): the addCoinGuarded 2s cooldown / 100-per-day cap maps to a NEW
  // reason:'rate-limited'. It must read as a THROTTLE ("too fast — wait a moment"), NOT the
  // generic connection fallback and NOT the limit/upgrade line (a throttle is transient, not
  // a plan cap — surfacing "upgrade" would be a lie).
  it("CRYP-109: shows a throttle message on reason:'rate-limited', not the connection or the limit line", () => {
    const m = apiErrorMessage({ success: false, code: "resource-exhausted", reason: "rate-limited" }, CONN, LIMIT);
    expect(m).not.toBe(CONN);
    expect(m).not.toBe(LIMIT);
    expect(m).toMatch(/too fast|slow down|wait|moment/i);
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

/* ADMIN-0 — the beforeCreate refusal has no dedicated auth/* code, so without this it
   falls through firebase-auth's code map to "Something went wrong. Try again." and a
   user retries a thing that is deliberately switched off. Same bug class as R31-6
   (suspended accounts) and B-PORT (plan limits): a KNOWN state rendered as a mystery. */
describe("isSignupBlockedError (ADMIN-0)", () => {
  /* BOTH real shapes, captured from a live emulator on 2026-07-24 — they DIFFER, and
     that difference is the bug this test exists to prevent from coming back. The JS
     SDK (what the app actually catches) strips the BLOCKING_FUNCTION_ERROR_RESPONSE
     prefix that the REST layer sends, so a detector written from the server's response
     alone never fires in the browser. */
  const REST_SHAPE = new Error(
    'BLOCKING_FUNCTION_ERROR_RESPONSE : ((HTTP request to http://127.0.0.1:5001/demo-crypto-idea/us-central1/beforeCreateUser returned HTTP error 403: {"error":{"message":"New signups are currently paused. Please check back soon.","status":"PERMISSION_DENIED"}}))'
  );
  const SDK_SHAPE = new Error(
    'Firebase: ((HTTP request to http://127.0.0.1:5001/demo-crypto-idea/us-central1/beforeCreateUser returned HTTP error 403: {"error":{"message":"New signups are currently paused. Please check back soon.","status":"PERMISSION_DENIED"}})) (auth/internal-error).'
  );

  it("recognises the REST shape", () => {
    expect(isSignupBlockedError(REST_SHAPE)).toBe(true);
  });

  it("recognises the SDK shape — the one the app actually catches", () => {
    // Regression anchor: the first version of this matched only the REST prefix and
    // was silently dead in the browser.
    expect(isSignupBlockedError(SDK_SHAPE)).toBe(true);
    expect(SDK_SHAPE.message).not.toContain("BLOCKING_FUNCTION_ERROR_RESPONSE");
  });

  it("does NOT fire on a Firestore rules denial — the false positive that got shipped and caught", () => {
    /* `PERMISSION_DENIED` was briefly used as a marker. EVERY Firestore rules rejection
       message starts with it, so a denied profile/portfolio write mid-signup was
       reported as "signups are paused" — confidently wrong about an unrelated failure,
       and it would have sent the founder hunting a kill-switch that was never off.
       Exact string measured from the emulator 2026-07-24. */
    const RULES_DENIAL = new Error("PERMISSION_DENIED: \nfalse for 'create' @ L80, false for 'update' @ L80");
    expect(isSignupBlockedError(RULES_DENIAL)).toBe(false);
  });

  it("does NOT swallow ordinary signup failures", () => {
    // If this ever returned true for these, a duplicate email or a weak password would
    // read as "signups are paused" — a different lie, not a fix.
    for (const msg of [
      "Firebase: Error (auth/email-already-in-use).",
      "Firebase: Error (auth/weak-password).",
      "Firebase: Error (auth/network-request-failed).",
      "Firebase: Error (auth/internal-error).",   // internal-error WITHOUT the blocking marker
    ]) {
      expect(isSignupBlockedError(new Error(msg)), msg).toBe(false);
    }
  });

  it("is null-safe and never throws on a malformed error", () => {
    for (const bad of [null, undefined, {}, { message: null }, "a string", 42]) {
      expect(isSignupBlockedError(bad), String(bad)).toBe(false);
    }
  });

  it("shows our own copy, matching the server's message verbatim", () => {
    // Kept in step with functions/signup-gate.js BLOCKED_MESSAGE so the same sentence
    // reaches the user whichever end refused first (the client pre-check or the server).
    expect(SIGNUPS_PAUSED_MSG).toBe("New signups are currently paused. Please check back soon.");
  });
});
