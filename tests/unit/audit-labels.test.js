import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ACTION_LABELS } from "../../src/components/admin-dashboard.jsx";

/**
 * ADMIN-3 — audit label coverage.
 *
 * The Audit tab renders `ACTION_LABELS[action] || action`, so an action the server writes
 * but the client doesn't know about degrades silently to a raw camelCase code in front of
 * the operator — and the ADMIN-3 action filter shows that code too. That is exactly the
 * kind of drift nobody notices, because the tab still "works".
 *
 * Found by the ADMIN-3 review: `grantAdmin`/`revokeAdmin` had been stale since ADMIN-SEC
 * replaced setAdminClaim with setManagerRole (which writes grantManager/revokeManager),
 * so a manager grant had been rendering as a raw code. Source-text assertion, deliberately
 * — it reads what functions/index.js actually calls.
 */
const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(here, "../../functions/index.js"), "utf8");

// Every literal action string passed to writeAudit(...). Covers both the plain
// `writeAudit(context, "x"` form and the ternary `writeAudit(context, a ? "x" : "y"` form.
function auditActionsInSource() {
  const found = new Set();
  const call = /writeAudit\(\s*context\s*,\s*([^,)]+)/g;
  let m;
  while ((m = call.exec(SRC))) {
    const arg = m[1];
    const strings = arg.match(/"([A-Za-z]+)"/g) || [];
    for (const s of strings) found.add(s.slice(1, -1));
  }
  return [...found].sort();
}

describe("audit action labels", () => {
  const actions = auditActionsInSource();

  it("finds the audited actions in the source (the scraper itself works)", () => {
    // Guard against the regex silently matching nothing and the suite passing vacuously.
    expect(actions.length).toBeGreaterThan(10);
    expect(actions).toContain("setUserTier");
    expect(actions).toContain("saveConfig");
  });

  it("has a friendly label for EVERY action the server writes", () => {
    const missing = actions.filter((a) => !ACTION_LABELS[a]);
    expect(missing, `unlabelled audit actions: ${missing.join(", ")}`).toEqual([]);
  });

  it("labels the manager grant/revoke actions the server actually writes", () => {
    // The regression that motivated this test.
    expect(ACTION_LABELS.grantManager).toBeTruthy();
    expect(ACTION_LABELS.revokeManager).toBeTruthy();
    expect(ACTION_LABELS.grantAdmin).toBeUndefined();   // stale code, removed
    expect(ACTION_LABELS.revokeAdmin).toBeUndefined();
  });

  it("has no label for an action the server never writes (no dead entries)", () => {
    const known = new Set(actions);
    const dead = Object.keys(ACTION_LABELS).filter((k) => !known.has(k));
    expect(dead, `labels with no matching writeAudit call: ${dead.join(", ")}`).toEqual([]);
  });
});
