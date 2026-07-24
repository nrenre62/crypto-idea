import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * ADMIN-SEC — gate coverage.
 *
 * The admin surface used to be 14 byte-identical copies of the same 3-line check.
 * That is exactly the shape that leaves ONE endpoint open after a refactor, and the
 * open one is invisible: the UI still looks correctly walled. This test reads the
 * source and asserts every admin callable routes through a gate helper, so adding a
 * new admin callable without a gate fails the suite instead of shipping.
 *
 * It is deliberately a source-text assertion, not a behavioural one — behaviour is
 * covered by tests/unit/guards.test.js (the pure matrix) and the integration probes.
 */
const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(here, "../../functions/index.js"), "utf8");

// The access matrix, as committed in docs/decisions/ADMIN-PANEL-AUDIT.md § Admin roles.
const MATRIX = {
  // shared read surface — any admin, incl. a legacy role-less one
  getStats: "assertAdmin",
  lookupUser: "assertAdmin",
  listUsers: "assertAdmin",
  listAudit: "assertAdmin",
  listWebhookEvents: "assertAdmin",   // ADMIN-1
  listDailyStats: "assertAdmin",      // ADMIN-4 — same gate as getStats, which already
                                      // returns revenue to any admin
  // owner only (no step-up: it writes an aggregate snapshot, not config)
  captureStatsSnapshot: "assertOwner",
  // account management — owner OR manager
  setUserTier: "assertManager",
  setPremiumLimits: "assertManager",
  suspendUser: "assertManager",
  restoreUser: "assertManager",
  adminTrashUser: "assertManager",
  adminSignOutUser: "assertManager",
  // owner only
  deleteUser: "assertOwner",
  // owner only + step-up re-auth
  getAdminConfig: "assertFreshOwner",
  saveConfig: "assertFreshOwner",
  setManagerRole: "assertFreshOwner",
};

const bodyOf = (fn) => {
  const start = SRC.indexOf(`exports.${fn} = functions.https.onCall(`);
  if (start < 0) return null;
  const end = SRC.indexOf("\n});", start);
  return SRC.slice(start, end < 0 ? SRC.length : end);
};

// Callables that legitimately carry NO admin gate: they act on the caller's own uid
// (no IDOR surface), or are emulator-only, or are the tombstone that always throws.
// Anything not here and not in MATRIX is an unreviewed endpoint and fails the suite.
const UNGATED_BY_DESIGN = new Set([
  // self-service / billing — operate on context.auth.uid only
  "createSubscription", "cancelSubscription", "deleteMyAccount", "restoreMyAccount",
  "signOutEverywhere", "exportMyData", "reconcileMyCounters", "resolveRecheckout",
  "reactivateSubscription",
  "devSetMyTier",    // emulator-gated dev helper (R17)
  "setAdminClaim",   // removed — the body throws permission-denied unconditionally
]);

const ALL_CALLABLES = [...SRC.matchAll(/exports\.(\w+) = functions\.https\.onCall\(/g)].map((m) => m[1]);
const GATE_CALL = /assert(?:Admin|Manager|Owner|FreshOwner)\(context\)/;

describe("ADMIN-SEC gate coverage (functions/index.js)", () => {
  /* The comment above promises that "adding a new admin callable without a gate fails
     the suite instead of shipping" — but a hand-written MATRIX only ever checks what
     someone remembered to add to it. ADMIN-1's listWebhookEvents was gated correctly
     and still never appeared here for three months. This closes the loop: EVERY
     callable must be classified, so a new one fails until it is deliberately placed
     in MATRIX (gated) or in UNGATED_BY_DESIGN (justified). */
  it("every callable is classified — a new endpoint cannot slip in unreviewed", () => {
    const unclassified = ALL_CALLABLES.filter((fn) => !(fn in MATRIX) && !UNGATED_BY_DESIGN.has(fn));
    expect(unclassified, `Un-triaged callable(s): ${unclassified.join(", ")} — add to MATRIX with its gate, or to UNGATED_BY_DESIGN with a reason.`).toEqual([]);
  });

  it("nothing in UNGATED_BY_DESIGN has quietly grown an admin gate (or vice versa)", () => {
    // Catches the matrix drifting out of step with the code in EITHER direction.
    const gated = ALL_CALLABLES.filter((fn) => GATE_CALL.test(bodyOf(fn) || ""));
    expect([...gated].sort()).toEqual(Object.keys(MATRIX).sort());
  });

  it.each(Object.entries(MATRIX))("%s is gated by %s", (fn, gate) => {
    const body = bodyOf(fn);
    expect(body, `exports.${fn} not found — did it get renamed?`).toBeTruthy();
    expect(body).toContain(`${gate}(context)`);
  });

  it("no admin callable still uses the old inline isAdminToken preamble", () => {
    expect(SRC).not.toContain("!isAdminToken(context.auth.token)");
  });

  it("the removed setAdminClaim fails closed rather than 404ing a stale client", () => {
    const body = bodyOf("setAdminClaim");
    expect(body).toBeTruthy();
    expect(body).toContain("permission-denied");
    // It must not still be able to write claims.
    expect(body).not.toContain("setCustomUserClaims");
  });

  it("only setManagerRole and the bootstrap script can write admin claims", () => {
    // Any OTHER callable writing custom claims would be a way around owner protection.
    const writers = [...SRC.matchAll(/exports\.(\w+) = functions\.https\.onCall\(/g)]
      .map((m) => m[1])
      .filter((fn) => (bodyOf(fn) || "").includes("setCustomUserClaims"));
    expect(writers).toEqual(["setManagerRole"]);
  });

  it("every callable that can lock an owner out checks the target's role", () => {
    // suspend/sign-out disable or evict an owner without deleting them — the lockout
    // route that a count-based floor does not see.
    for (const fn of ["setUserTier", "setPremiumLimits", "suspendUser", "adminSignOutUser", "adminTrashUser", "deleteUser"]) {
      expect(bodyOf(fn), `${fn} must call assertTargetAllowed`).toContain("assertTargetAllowed(uid, callerRole");
    }
  });

  it("the two erasure paths treat owners as protected, not merely manager-blocked", () => {
    for (const fn of ["adminTrashUser", "deleteUser"]) {
      expect(bodyOf(fn)).toContain('assertTargetAllowed(uid, callerRole, "protected")');
    }
  });
});
