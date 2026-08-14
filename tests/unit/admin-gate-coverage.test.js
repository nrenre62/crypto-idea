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
  findDuplicateEmails: "assertAdmin",  // AUTH-DUP — read-only duplicate-email detector
  listAdmins: "assertOwner",          // ADMIN-SEP (CRYP-103) — owner-only admin roster
                                      // read (no step-up: a read, not a claim mutation)
  listAudit: "assertAdmin",
  listWebhookEvents: "assertAdmin",   // ADMIN-1
  listDailyStats: "assertAdmin",      // ADMIN-4 — same gate as getStats, which already
                                      // returns revenue to any admin
  getSystemStatus: "assertAdmin",     // ADMIN-2 — kill-switch states (already public on
                                      // /api/config) + cron heartbeats + cache ages. No
                                      // secrets: the Sentry DSN is a boolean. A manager
                                      // on support duty needs "is anything on fire".
  // owner only (no step-up: it writes an aggregate snapshot, not config)
  captureStatsSnapshot: "assertOwner",
  // ADMIN-5: read-only "view as" reads another person's PRIVATE data (incl. journal
  // theses), so it sits at the OWNER gate — the highest, above the account-management
  // manager surface.
  viewUserAsAdmin: "assertOwner",
  // ADMIN-5: private admin notes — any admin may read, a manager/owner may write.
  getUserNote: "assertAdmin",
  saveUserNote: "assertManager",
  // account management — owner OR manager
  setUserTier: "assertManager",
  setPremiumLimits: "assertManager",
  suspendUser: "assertManager",
  restoreUser: "assertManager",
  adminTrashUser: "assertManager",
  adminSignOutUser: "assertManager",
  // owner only
  deleteUser: "assertOwner",
  // ADMIN-6: Settings config now sits behind assertOwner + the settings-password unlock
  // (assertSettingsUnlocked, which itself falls back to step-up re-auth when no settings
  // password is set yet). The GATE_CALL regex keys off assertOwner(context), so these read
  // as owner-gated; the second unlock factor is verified by the integration probes.
  getAdminConfig: "assertOwner",
  saveConfig: "assertOwner",
  // ADMIN-6: set/change the Settings password, and unlock the Settings screen with it.
  // Owner-only (managers have no Settings screen); the unlock factor is enforced inside.
  setSettingsPassword: "assertOwner",
  unlockSettings: "assertOwner",
  // ADMIN-6 PR2: emailed Settings-password reset — request a link (owner's own email) and
  // complete it with a single-use token. Owner-only; the owner must be signed in (the token
  // is bound to their uid), so a leaked link alone can't reset the password.
  requestSettingsPwReset: "assertOwner",
  completeSettingsPwReset: "assertOwner",
  // owner only + step-up re-auth
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
  "scheduleProDowngrade",  // Plan B PR-C2 — schedule a future-start Pro sub; acts on the caller's own uid
  "resubscribePremium",    // Plan B PR-C3b-server — seamless future-start Premium re-subscribe; acts on the caller's own uid

  "chooseFreePlan",  // ONBOARD-GATE — free plan choice; per-uid rate-limited, acts on caller's uid (App Check platform-side)

  "researchAsk",     // Plan B PR-E2 — Wave-B AI research proxy; signed-in user asks about their OWN book,
                     // acts on context.auth.uid only (no IDOR), per-uid daily budget + app-wide $-cap gated

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

  it("ADMIN-6: the Settings config callables carry the second-lock unlock gate", () => {
    // getAdminConfig/saveConfig read as assertOwner in the MATRIX (that's what GATE_CALL keys
    // off), but the ACTUAL second factor is assertSettingsUnlocked. Without this, a future edit
    // could delete that line and both this suite AND admin-0-guards would stay green while the
    // Settings screen lost its 2nd lock (SEC-review #4). Pin its presence explicitly.
    for (const fn of ["getAdminConfig", "saveConfig"]) {
      expect(bodyOf(fn), `${fn} must call assertSettingsUnlocked`).toContain("assertSettingsUnlocked(context)");
    }
  });
});
