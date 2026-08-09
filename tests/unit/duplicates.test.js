import { describe, it, expect } from "vitest";
import { groupDuplicateEmails, excludeAdmins } from "../../functions/duplicates.js";

// AUTH-DUP (Part B): the pure grouping helper behind the admin duplicate-email
// detector. This is the bit the plan pins — given a list of Auth accounts, group by
// LOWERCASED email and keep only the emails shared by 2+ accounts. Read-only reporting.
describe("AUTH-DUP groupDuplicateEmails", () => {
  it("returns a group for an email shared by two accounts", () => {
    const out = groupDuplicateEmails([
      { uid: "a", email: "mark@test.com" },
      { uid: "b", email: "mark@test.com" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].email).toBe("mark@test.com");
    expect(out[0].count).toBe(2);
    expect(out[0].accounts.map((x) => x.uid).sort()).toEqual(["a", "b"]);
  });

  it("groups case-insensitively (Mark@Test.com === mark@test.com)", () => {
    const out = groupDuplicateEmails([
      { uid: "a", email: "Mark@Test.com" },
      { uid: "b", email: "mark@test.com" },
      { uid: "c", email: "MARK@TEST.COM" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].email).toBe("mark@test.com");   // normalized to lowercase
    expect(out[0].count).toBe(3);
  });

  it("trims surrounding whitespace before grouping", () => {
    const out = groupDuplicateEmails([
      { uid: "a", email: " dup@test.com " },
      { uid: "b", email: "dup@test.com" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].email).toBe("dup@test.com");
    expect(out[0].count).toBe(2);
  });

  it("excludes emails that belong to a single account", () => {
    const out = groupDuplicateEmails([
      { uid: "a", email: "solo@test.com" },
      { uid: "b", email: "other@test.com" },
      { uid: "c", email: "dup@test.com" },
      { uid: "d", email: "dup@test.com" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].email).toBe("dup@test.com");
  });

  it("ignores accounts with a missing, blank or non-string email", () => {
    const out = groupDuplicateEmails([
      { uid: "a", email: "" },
      { uid: "b" },
      { uid: "c", email: null },
      { uid: "d", email: "   " },
      { uid: "e", email: 12345 },
      { uid: "f", email: "keep@test.com" },
      { uid: "g", email: "keep@test.com" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].email).toBe("keep@test.com");
    expect(out[0].count).toBe(2);
  });

  it("returns [] for empty, null or undefined input", () => {
    expect(groupDuplicateEmails([])).toEqual([]);
    expect(groupDuplicateEmails(null)).toEqual([]);
    expect(groupDuplicateEmails(undefined)).toEqual([]);
  });

  it("sorts most-duplicated first, then alphabetically by email", () => {
    const out = groupDuplicateEmails([
      { uid: "1", email: "bbb@test.com" }, { uid: "2", email: "bbb@test.com" },
      { uid: "3", email: "aaa@test.com" }, { uid: "4", email: "aaa@test.com" },
      { uid: "5", email: "ccc@test.com" }, { uid: "6", email: "ccc@test.com" }, { uid: "7", email: "ccc@test.com" },
    ]);
    expect(out.map((g) => g.email)).toEqual(["ccc@test.com", "aaa@test.com", "bbb@test.com"]);
    expect(out[0].count).toBe(3);
  });

  it("carries each account's minimal fields through unchanged", () => {
    const out = groupDuplicateEmails([
      { uid: "a", email: "dup@test.com", tier: "premium", disabled: false, creationTime: "T1" },
      { uid: "b", email: "dup@test.com", tier: "free", disabled: true, creationTime: "T2" },
    ]);
    const byUid = Object.fromEntries(out[0].accounts.map((x) => [x.uid, x]));
    expect(byUid.a.tier).toBe("premium");
    expect(byUid.b.disabled).toBe(true);
    expect(byUid.b.creationTime).toBe("T2");
  });
});

// ADMIN-SEP (CRYP-103): the admin-exclusion the duplicate-email detector applies before
// grouping. Keyed off the CLAIM (customClaims.admin === true), NOT role — a legacy no-role
// admin (role "") must still be excluded. This is the deterministic home for the assertion
// the integration tier can't make: the Auth emulator categorically refuses duplicate-email
// accounts (auth/invalid-user-import), so the detector's precondition is un-constructable there.
describe("ADMIN-SEP excludeAdmins", () => {
  it("CRYP-103: excludeAdmins drops accounts with the admin claim (keyed off the claim, not role)", () => {
    const manager = { uid: "mgr", email: "mgr@x.com", customClaims: { admin: true, role: "manager" } };
    const owner = { uid: "own", email: "own@x.com", customClaims: { admin: true, role: "owner" } };
    const noRoleAdmin = { uid: "leg", email: "leg@x.com", customClaims: { admin: true, role: "" } };
    const plainNoClaims = { uid: "usr", email: "usr@x.com" };
    const plainNullClaims = { uid: "usn", email: "usn@x.com", customClaims: null };
    const plainEmptyClaims = { uid: "use", email: "use@x.com", customClaims: {} };

    const out = excludeAdmins([manager, owner, noRoleAdmin, plainNoClaims, plainNullClaims, plainEmptyClaims]);
    const uids = out.map((u) => u.uid).sort();

    // All three admins removed — including the no-role edge (role "" is still admin by claim).
    expect(uids).not.toContain("mgr");
    expect(uids).not.toContain("own");
    expect(uids).not.toContain("leg");
    // Both plain users kept — including the null-claims and empty-claims edges.
    expect(uids).toEqual(["use", "usn", "usr"]);
  });

  it("CRYP-103: an admin-only duplicate email is NOT reported, a genuine plain-user duplicate still is", () => {
    // The composition that replaces the impossible integration test: two admin accounts share
    // dupadmin@x.com, and two plain accounts share dupplain@x.com. findDuplicateEmails runs
    // groupDuplicateEmails(excludeAdmins(list)), so mirror that here.
    const list = [
      { uid: "adA", email: "dupadmin@x.com", customClaims: { admin: true, role: "manager" } },
      { uid: "adB", email: "dupadmin@x.com", customClaims: { admin: true, role: "owner" } },
      { uid: "plA", email: "dupplain@x.com" },
      { uid: "plB", email: "dupplain@x.com" },
    ];

    const emails = groupDuplicateEmails(excludeAdmins(list)).map((g) => g.email);

    // Positive control: a real plain-user duplicate must still surface.
    expect(emails).toContain("dupplain@x.com");
    // THE assertion: the admin-only duplicate is filtered out before grouping.
    expect(emails).not.toContain("dupadmin@x.com");
  });
});
