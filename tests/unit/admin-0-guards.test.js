import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * ADMIN-0 — structural guards that behaviour tests cannot express.
 *
 * Three invariants live here, each of which fails SILENTLY in production and looks
 * completely fine in review:
 *   1. every admin gate is awaited (a missing await = an open endpoint that still
 *      renders as walled),
 *   2. the audit log has exactly one writer, and
 *   3. the beforeCreate blocking function cannot take signups down by accident.
 *
 * Source-text assertions on purpose — the behaviour of the pure parts is covered by
 * guards.test.js and signup-gate.test.js. Same pattern as ADMIN-2's cgFetch guard.
 */
const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(here, "../../functions/index.js"), "utf8");
// Line comments are stripped before scanning: this file's own prose quotes the very
// patterns it forbids, and a doc comment must not read as a violation (ADMIN-2 hit
// exactly this and it cost a false positive).
const CODE = SRC.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

describe("ADMIN-0 · the admin gates are ASYNC — every call site must await", () => {
  /* assertAdmin/Manager/Owner became async so the MFA flag (a Firestore read) could be
     enforced in ONE place instead of 18. The cost is a new, invisible failure mode:
     `assertOwner(context)` without `await` returns a truthy Promise and never throws,
     so the callable runs unauthenticated while the code still LOOKS gated. Nothing
     else catches that — not the type system, not a review, and not the gate-coverage
     test, whose regex matches the awaited and un-awaited forms alike. */
  // Includes the async TARGET guards (assertTargetAllowed / assertTargetNotAdmin, CRYP-103b):
  // a missing await on those silently skips owner-protection / the admin-target refusal — the
  // same invisible failure mode as the role gates. `Target\w+` also pins any future assertTarget*.
  // ADMIN-6: assertSettingsUnlocked is the Settings-password second lock — a dropped await
  // there would silently open getAdminConfig/saveConfig, so it is pinned here too (SEC-review #4).
  const CALL = /\bassert(?:Admin|Manager|Owner|FreshOwner|SettingsUnlocked|Target\w+)\s*\(/;

  const callSites = CODE.split("\n")
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => CALL.test(line))
    // The declarations themselves, and assertRole's internal delegation, are not call sites.
    .filter(({ line }) => !/^\s*async function assert/.test(line));

  it("finds the call sites at all (a guard that matches nothing guards nothing)", () => {
    expect(callSites.length).toBeGreaterThanOrEqual(15);
  });

  it("every assert* call site is awaited (role gates AND the target guards)", () => {
    const missing = callSites
      .filter(({ line }) => !/await\s+assert(?:Admin|Manager|Owner|FreshOwner|SettingsUnlocked|Target\w+)\s*\(/.test(line))
      .map(({ line, n }) => `functions/index.js:${n}: ${line.trim()}`);
    expect(missing, `Un-awaited admin gate(s) — the callable would run UNGATED:\n${missing.join("\n")}`).toEqual([]);
  });

  it("the MFA check hangs off the shared assertRole, not off individual callables", () => {
    // If assertMfa ever gets called from a callable body instead, we are back to a
    // check sprinkled across N sites — and site N+1 is the one that forgets it.
    const roleBody = CODE.slice(CODE.indexOf("async function assertRole("), CODE.indexOf("async function assertAdmin("));
    expect(roleBody).toContain("await assertMfa(context)");
    expect((CODE.match(/await assertMfa\(/g) || []).length).toBe(1);
  });

  it("all three gates route through assertRole, so none can be missed", () => {
    for (const gate of ["Admin", "Manager", "Owner"]) {
      expect(CODE).toMatch(new RegExp(`async function assert${gate}\\(context\\) \\{ return assertRole\\(context,`));
    }
  });
});

describe("ADMIN-0 · the audit log has exactly one writer", () => {
  /* firestore.rules already denies every client read AND write on /audit — which is
     STRONGER than the "append-only rules" the plan asked for. But rules cannot make
     it append-only against the only writer that matters: the Admin SDK bypasses rules
     entirely. So the real control is that the collection is touched in exactly three
     places, and this test is what keeps it that way. */
  const sites = [...CODE.matchAll(/db\.collection\("audit"\)([\s\S]{0,60})/g)].map((m) => m[1]);

  it("is reached in exactly three places — one add, one read, one retention sweep", () => {
    expect(sites.length, `expected 3 audit call sites, found ${sites.length}`).toBe(3);
    expect(sites.filter((s) => s.trimStart().startsWith(".add(")).length, "exactly one writer").toBe(1);
    expect(sites.filter((s) => s.trimStart().startsWith(".orderBy(")).length, "exactly one reader").toBe(1);
    expect(sites.filter((s) => s.includes('.where("at", "<"')).length, "exactly one retention sweep").toBe(1);
  });

  it("the single writer is inside writeAudit()", () => {
    const body = CODE.slice(CODE.indexOf("async function writeAudit("), CODE.indexOf("\n}", CODE.indexOf("async function writeAudit(")));
    expect(body).toContain('db.collection("audit").add(');
  });

  it("no audit entry is ever updated or individually deleted", () => {
    // An append-only log that supports .update()/.doc().delete() is just a log.
    // The retention sweep deletes via a batch over a WHERE query, not by doc id.
    expect(CODE).not.toMatch(/collection\("audit"\)\.doc\(/);
    expect(CODE).not.toMatch(/collection\("audit"\)[\s\S]{0,80}\.update\(/);
    expect(CODE).not.toMatch(/collection\("audit"\)[\s\S]{0,80}\.set\(/);
  });
});

describe("ADMIN-0 · beforeCreate cannot take signups down by accident", () => {
  const start = CODE.indexOf("exports.beforeCreateUser =");
  const body = CODE.slice(start, CODE.indexOf("\n});", start));

  it("exists and is a beforeCreate blocking function", () => {
    expect(start, "exports.beforeCreateUser not found").toBeGreaterThan(-1);
    expect(body).toContain("functions.auth.user().beforeCreate(");
  });

  it("wraps the config read in try/catch and passes null on failure", () => {
    // A blocking function that throws for ANY reason blocks the signup, so an
    // unhandled read error here is a total registration outage.
    expect(body).toContain("try {");
    expect(body).toContain("catch");
    expect(body).toMatch(/let cfg = null/);
  });

  it("reads config FRESH rather than through the 5-minute getConfig() cache", () => {
    // ADMIN-2's lesson: an enforcement point must not lag the switch that drives it.
    expect(body).toContain('db.doc("config/app")');
    expect(body).not.toContain("getConfig()");
  });

  it("delegates the verdict to the pure module and throws only on a deliberate pause", () => {
    expect(body).toContain("signupGate.signupDecision(cfg)");
    // Exactly one throw, and it is the blocked case.
    expect((body.match(/throw /g) || []).length).toBe(1);
    expect(body).toContain("signupGate.BLOCKED_MESSAGE");
  });

  it("TRIPWIRE: a SECOND blocking reason must revisit the client-side message", () => {
    /* src/utils/errors.js maps ANY blocking-function refusal to one sentence — "New
       signups are currently paused" — because there is exactly one reason to refuse.
       Add a second (a disposable-domain blocklist, an invite-code check, …) and that
       mapping starts telling users the wrong thing with total confidence. Firebase
       gives the client no code to distinguish them, so this has to be caught here.
       If this fails: either extract the server's message in errors.js, or map the new
       reason explicitly — then update this count. */
    expect((body.match(/functions\.auth\.HttpsError\(/g) || []).length,
      "beforeCreate has more than one refusal path — see src/utils/errors.js SIGNUPS_PAUSED_MSG").toBe(1);
  });
});
