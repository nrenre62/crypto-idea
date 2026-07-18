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

describe("ADMIN-SEC gate coverage (functions/index.js)", () => {
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
