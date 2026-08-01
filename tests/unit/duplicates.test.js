import { describe, it, expect } from "vitest";
import { groupDuplicateEmails } from "../../functions/duplicates.js";

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
