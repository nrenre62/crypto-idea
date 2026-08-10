import { describe, it, expect } from "vitest";
import { ownerCapDecision, OWNER_CAP } from "../../functions/owner-cap.js";

// ADMIN-SEP (CRYP-103b · Part C-2): owners are the un-deletable root of trust — keep
// exactly TWO. An owner claim is minted ONLY by scripts/set-admin.js, so that script is
// the one place a 3rd owner could appear. The cap DECISION is a pure function here so the
// "refuses a 3rd owner" acceptance criterion is unit-testable without the Auth emulator
// (which this sandbox cannot boot). Same pure-helper discipline as guards.js / billing.js /
// duplicates.js: the script does the Auth I/O (count owners), this decides.
describe("owner-cap: ownerCapDecision (hard-cap owners at 2)", () => {
  it("exposes the cap as 2", () => {
    expect(OWNER_CAP).toBe(2);
  });

  it("CRYP-103: refuses a 3rd owner mint when two owners already exist", () => {
    const d = ownerCapDecision({ role: "owner", currentRole: "manager", ownerCount: 2, force: false });
    expect(d.allowed).toBe(false);
    expect(d).toMatchObject({ ownerCount: 2, cap: 2 });
  });

  it("CRYP-103: refuses even above the cap (a pre-existing over-cap can never grow)", () => {
    expect(ownerCapDecision({ role: "owner", currentRole: "", ownerCount: 3, force: false }).allowed).toBe(false);
  });

  it("allows an owner mint while under the cap", () => {
    expect(ownerCapDecision({ role: "owner", currentRole: "", ownerCount: 1, force: false }).allowed).toBe(true);
    expect(ownerCapDecision({ role: "owner", currentRole: "", ownerCount: 0, force: false }).allowed).toBe(true);
  });

  it("--force overrides the cap (a deliberate owner-set change)", () => {
    expect(ownerCapDecision({ role: "owner", currentRole: "", ownerCount: 2, force: true }).allowed).toBe(true);
  });

  it("re-setting an EXISTING owner is idempotent and never blocked", () => {
    expect(ownerCapDecision({ role: "owner", currentRole: "owner", ownerCount: 2, force: false }).allowed).toBe(true);
  });

  it("granting a manager or revoking is never capped", () => {
    expect(ownerCapDecision({ role: "manager", currentRole: "", ownerCount: 2, force: false }).allowed).toBe(true);
    expect(ownerCapDecision({ role: null, currentRole: "owner", ownerCount: 2, force: false }).allowed).toBe(true);
  });

  it("is null-safe on a missing ownerCount (treats it as 0 → allowed)", () => {
    expect(ownerCapDecision({ role: "owner", currentRole: "", force: false }).allowed).toBe(true);
  });
});
