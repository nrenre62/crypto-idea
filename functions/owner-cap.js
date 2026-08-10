"use strict";

// ADMIN-SEP (CRYP-103b · Part C-2): owners are the un-deletable root of trust — keep
// exactly TWO. An owner claim is minted ONLY by scripts/set-admin.js (the panel can never
// create one), so that script is the single place a 3rd owner could appear. This pure
// decision is where the cap lives so it is unit-testable without the Auth emulator (which
// the CI-authoring sandbox cannot boot). Same injected-decision discipline as guards.js /
// billing.js / duplicates.js: the script does the Auth I/O (count owners), this decides.
//
// Only a FRESH owner mint is capped. Re-setting someone who is already an owner (idempotent),
// granting a manager, or revoking are never blocked; --force is the deliberate escape hatch
// for a real owner-set change (e.g. rotating one of the two owners). The cap is defence in
// depth, not a live-escalation fix — owners are SA-key/script-only either way.
const OWNER_CAP = 2;

function ownerCapDecision({ role, currentRole, ownerCount, force } = {}) {
  if (role !== "owner") return { allowed: true };          // manager grant / revoke
  if (force) return { allowed: true };                     // deliberate owner-set change
  if (currentRole === "owner") return { allowed: true };   // idempotent re-set of an owner
  const count = Number(ownerCount) || 0;
  if (count >= OWNER_CAP) return { allowed: false, ownerCount: count, cap: OWNER_CAP };
  return { allowed: true };
}

module.exports = { OWNER_CAP, ownerCapDecision };
