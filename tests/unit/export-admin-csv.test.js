import { describe, it, expect } from "vitest";
import { buildAuditCsv, buildUsersCsv } from "../../src/utils/export-admin-csv.js";

// ADMIN-3 (2026-07-24): the admin panel's two CSV exports. Built from the rows already
// on screen, so an export matches the filtered view rather than dumping something else.

const ENTRY = {
  id: "a1", atMs: Date.UTC(2026, 6, 24, 9, 30, 0), action: "setUserTier",
  actorEmail: "admin@test.com", targetEmail: "user@test.com", targetUid: "u1",
  details: "tier=pro", ip: "203.0.113.9",
};

describe("export-admin-csv.buildAuditCsv", () => {
  it("writes a header row plus one row per entry", () => {
    const lines = buildAuditCsv([ENTRY, { ...ENTRY, id: "a2" }]).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("When (UTC),Action,Actor,Target,Details,Source IP");
  });

  it("includes the source IP and the actor/target", () => {
    const csv = buildAuditCsv([ENTRY]);
    expect(csv).toContain("203.0.113.9");
    expect(csv).toContain("admin@test.com");
    expect(csv).toContain("user@test.com");
    expect(csv).toContain("setUserTier");
  });

  it("puts every cell under its own header — the whole row, in order", () => {
    // toContain() per value can't catch a shifted column: the actor could land under
    // Action and every individual assertion would still pass.
    const [header, data] = buildAuditCsv([ENTRY]).split("\n");
    expect(header.split(",")).toEqual(["When (UTC)", "Action", "Actor", "Target", "Details", "Source IP"]);
    expect(data).toBe("2026-07-24T09:30:00.000Z,setUserTier,admin@test.com,user@test.com,tier=pro,203.0.113.9");
  });

  it("writes the timestamp as sortable ISO-8601, not a locale string", () => {
    expect(buildAuditCsv([ENTRY])).toContain("2026-07-24T09:30:00.000Z");
  });

  it("leaves the date blank for a missing/invalid timestamp instead of 'Invalid Date'", () => {
    const rows = buildAuditCsv([{ ...ENTRY, atMs: null }, { ...ENTRY, atMs: NaN }]).split("\n");
    expect(rows[1].startsWith(",")).toBe(true);
    expect(rows[2].startsWith(",")).toBe(true);
    expect(rows.join()).not.toContain("Invalid Date");
  });

  it("falls back to the target UID when there is no target email", () => {
    expect(buildAuditCsv([{ ...ENTRY, targetEmail: "" }])).toContain("u1");
  });

  it("escapes commas, quotes and newlines so a details field can't break the columns", () => {
    const csv = buildAuditCsv([{ ...ENTRY, details: 'plans.pro.price: 9.99 → 12.99, flags: "on"' }]);
    expect(csv).toContain('"plans.pro.price: 9.99 → 12.99, flags: ""on"""');
    // Header + exactly one data row — an embedded newline must not add a line.
    expect(buildAuditCsv([{ ...ENTRY, details: "line1\nline2" }]).split("\n")).toHaveLength(3);
  });

  it("returns just the header for an empty or missing list", () => {
    expect(buildAuditCsv([]).split("\n")).toHaveLength(1);
    expect(buildAuditCsv(undefined).split("\n")).toHaveLength(1);
  });
});

const USER = {
  uid: "u1", email: "user@test.com", name: "Test User", tier: "pro",
  billingStatus: "active", role: "", isAdmin: false, disabled: false,
  portfolioCount: 3, joinedMs: Date.UTC(2026, 0, 15, 12, 0, 0),
};

describe("export-admin-csv.buildUsersCsv", () => {
  it("writes a header row plus one row per user", () => {
    const lines = buildUsersCsv([USER, { ...USER, uid: "u2" }]).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe("Email,Name,Tier,Billing status,Role,Status,Portfolios,Joined (UTC),UID");
  });

  it("carries the operational fields the Users tab shows", () => {
    const csv = buildUsersCsv([USER]);
    expect(csv).toContain("user@test.com");
    expect(csv).toContain("pro");
    expect(csv).toContain("active");
    expect(csv).toContain("2026-01-15T12:00:00.000Z");
  });

  it("puts every cell under its own header — the whole row, in order", () => {
    const [header, data] = buildUsersCsv([USER]).split("\n");
    expect(header.split(",")).toEqual(["Email", "Name", "Tier", "Billing status", "Role", "Status", "Portfolios", "Joined (UTC)", "UID"]);
    expect(data).toBe("user@test.com,Test User,pro,active,,active,3,2026-01-15T12:00:00.000Z,u1");
  });

  it("labels a suspended account and a role-less legacy admin", () => {
    expect(buildUsersCsv([{ ...USER, disabled: true }])).toContain("suspended");
    expect(buildUsersCsv([{ ...USER, isAdmin: true, role: "" }])).toContain("admin");
    expect(buildUsersCsv([{ ...USER, role: "owner" }])).toContain("owner");
  });

  it("defaults tier and billing status rather than writing blanks", () => {
    const csv = buildUsersCsv([{ uid: "u9", email: "x@test.com" }]);
    expect(csv).toContain("free");
    expect(csv).toContain("none");
  });

  it("NEVER emits holdings — the export carries only the operational columns", () => {
    // The admin API never returns holdings; this guards against someone widening the
    // row later by spreading a user object straight into the CSV.
    const csv = buildUsersCsv([{ ...USER, coins: [{ id: "bitcoin", amount: 1.5 }], entries: [{ amount: 2 }] }]);
    expect(csv).not.toContain("bitcoin");
    expect(csv).not.toContain("1.5");
  });

  it("escapes a name containing a comma", () => {
    expect(buildUsersCsv([{ ...USER, name: "Doe, Jane" }])).toContain('"Doe, Jane"');
  });

  it("returns just the header for an empty or missing list", () => {
    expect(buildUsersCsv([]).split("\n")).toHaveLength(1);
    expect(buildUsersCsv(null).split("\n")).toHaveLength(1);
  });
});
