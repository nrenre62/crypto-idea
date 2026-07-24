import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

// Mock the API layer so the dashboard mounts without touching Firebase. The
// wrappers return the payloads the component expects (see src/api/admin.js).
vi.mock("../../src/api/admin.js", () => ({
  getStats: vi.fn(() => Promise.resolve({
    totalUsers: 5, freeUsers: 3, proUsers: 1, premiumUsers: 1,
    totalPortfolios: 8, totalCoins: 20, estimatedRevenue: 60,
    proPrice: 9.99, premiumPrice: 49.99,
  })),
  getAdminConfig: vi.fn(() => Promise.resolve({})),
  listUsers: vi.fn(() => Promise.resolve([
    { uid: "u1", email: "alice@test.com", name: "Alice", tier: "free", disabled: false, portfolioCount: 1, billingStatus: "none" },
  ])),
  listAudit: vi.fn(() => Promise.resolve([])),
  listWebhookEvents: vi.fn(() => Promise.resolve([])),   // ADMIN-1: Overview billing card
  listDailyStats: vi.fn(() => Promise.resolve([])),      // ADMIN-4: Overview growth card
  captureStatsSnapshot: vi.fn(() => Promise.resolve({ date: "2026-07-24" })),
  // ADMIN-2: Overview status strip. A missing mock here would leave the wrapper
  // `undefined`, the call would throw inside loadStatus, and the strip would quietly
  // render its ERROR path while the suite still went green — exactly how ADMIN-4's
  // growth-card mock hid a broken card for a whole build.
  getSystemStatus: vi.fn(() => Promise.resolve({
    now: 1_700_000_000_000,
    features: { marketData: true, checkout: true, aiResearch: true },
    maintenance: false, signupsEnabled: true,
    jobs: [
      { name: "refreshPrices", everyMs: 300_000, at: 1_699_999_900_000, note: null, errorAt: null, error: null },
      { name: "captureDailyStats", everyMs: 86_400_000, at: 1_699_990_000_000, note: null, errorAt: null, error: null },
    ],
    caches: { universeAt: 1_699_999_900_000, trendingAt: 1_699_999_000_000 },
    sentryConfigured: false,
  })),
  lookupUser: vi.fn(() => Promise.resolve(
    { uid: "u1", email: "alice@test.com", name: "Alice", tier: "free", disabled: false, portfolioCount: 1, coinCount: 3, billingStatus: "none" },
  )),
  setUserTier: vi.fn(() => Promise.resolve()),
  suspendUser: vi.fn(() => Promise.resolve()),
  deleteUser: vi.fn(() => Promise.resolve()),
  saveConfig: vi.fn(() => Promise.resolve()),
  restoreUser: vi.fn(() => Promise.resolve()),
  setPremiumLimits: vi.fn(() => Promise.resolve({ premiumLimits: {} })),
  setManagerRole: vi.fn(() => Promise.resolve({ success: true })),
  adminTrashUser: vi.fn(() => Promise.resolve()),
  adminSignOutUser: vi.fn(() => Promise.resolve()),
}));

// ADMIN-SEC: the dashboard now resolves its own role from the verified custom claims.
// Default to OWNER so the existing coverage (which exercises Settings) still applies;
// individual tests override this to assert the manager/legacy walls.
vi.mock("../../src/api/admin-auth.js", () => ({
  getAdminRole: vi.fn(() => Promise.resolve("owner")),
  reauthAdmin: vi.fn(() => Promise.resolve({ success: true })),
}));

import AdminDashboard from "../../src/components/admin-dashboard.jsx";
import { getStats, getAdminConfig, listUsers, listAudit, listWebhookEvents, listDailyStats, captureStatsSnapshot, getSystemStatus, deleteUser, setManagerRole, adminTrashUser, adminSignOutUser, lookupUser, saveConfig } from "../../src/api/admin.js";
import { getAdminRole, reauthAdmin } from "../../src/api/admin-auth.js";

describe("admin-dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads stats + config on mount and shows the live overview", async () => {
    render(<AdminDashboard />);
    expect(getStats).toHaveBeenCalled();
    // ADMIN-SEC: the config is owner-only, so it is fetched AFTER the role resolves —
    // not on mount. A manager would never request it and see a permission error.
    await waitFor(() => expect(getAdminConfig).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Live Data")).toBeInTheDocument());
    expect(screen.getByText("Est. Monthly Revenue")).toBeInTheDocument();
    expect(screen.getByText("Plan Limits")).toBeInTheDocument();
  });

  it("renders all four tabs without crashing (lazy-loads users + audit)", async () => {
    render(<AdminDashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    await waitFor(() => expect(listUsers).toHaveBeenCalled());
    expect(screen.getByPlaceholderText(/Search email or name/i)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    expect(screen.getByText("Configuration")).toBeInTheDocument();   // ADMIN-D: Settings home (paper drill-in)

    fireEvent.click(screen.getByRole("button", { name: "Audit" }));
    await waitFor(() => expect(listAudit).toHaveBeenCalled());
  });

  // ── BL-2: admin capabilities ──
  const openAlice = async () => {
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(await screen.findByText("Alice"));
    await screen.findByText("CHANGE TIER");
  };

  /* ═══ ADMIN-SEC — roles, owner protection, step-up re-auth ═══ */

  it("ADMIN-SEC: the Users tab no longer offers ANY grant-admin control", async () => {
    // This button was the bypass: promote two throw-away accounts, then delete the
    // real owners while the admin count still read >= 2. It must not come back.
    await openAlice();
    expect(screen.queryByRole("button", { name: "Make admin" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove admin role" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Confirm grant/ })).toBeNull();
  });

  it("ADMIN-SEC/ADMIN-D3: an owner sees Settings (with Admin access inside); a manager sees neither", async () => {
    render(<AdminDashboard />);
    expect(await screen.findByRole("button", { name: "Settings" })).toBeInTheDocument();
    // ADMIN-D3: Admin access is no longer a top-level tab — it's a Settings drill-in row.
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("button", { name: "Admin access" })).toBeInTheDocument();

    cleanup();
    getAdminRole.mockResolvedValueOnce("manager");
    render(<AdminDashboard />);
    await screen.findByText(/Signed in as a/);
    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Admin access" })).toBeNull();
  });

  it("ADMIN-SEC: a legacy role-less admin is told why, and gets no owner areas", async () => {
    cleanup();
    getAdminRole.mockResolvedValueOnce("");
    render(<AdminDashboard />);
    await screen.findByText(/no role/i);
    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Admin access" })).toBeNull();
  });

  it("ADMIN-SEC: granting a manager needs the email typed twice AND a warning confirm", async () => {
    render(<AdminDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Admin access" }));
    fireEvent.change(screen.getByPlaceholderText("email@example.com"), { target: { value: "alice@test.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText("Alice");

    // 1st gate: the re-typed email must match exactly.
    const cont = screen.getByRole("button", { name: "Continue" });
    expect(cont).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("alice@test.com"), { target: { value: "alice@wrong.com" } });
    expect(cont).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("alice@test.com"), { target: { value: "alice@test.com" } });
    expect(cont).not.toBeDisabled();

    // 2nd gate: an explicit warning, and nothing is granted until it is confirmed.
    fireEvent.click(cont);
    await screen.findByText(/Grant manager access?/);
    expect(setManagerRole).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Confirm — grant manager/ }));
    await waitFor(() => expect(setManagerRole).toHaveBeenCalledWith("alice@test.com", true));
  });

  it("ADMIN-SEC: an owner target is refused in the UI before the server is asked", async () => {
    lookupUser.mockResolvedValueOnce({ uid: "o1", email: "owner@test.com", name: "Owner", tier: "free", role: "owner", isAdmin: true, portfolioCount: 0, coinCount: 0 });
    render(<AdminDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Admin access" }));
    fireEvent.change(screen.getByPlaceholderText("email@example.com"), { target: { value: "owner@test.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByText(/Owner accounts are protected/);
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(setManagerRole).not.toHaveBeenCalled();
  });

  it("ADMIN-SEC: a server reauth-required demand raises the password prompt and retries", async () => {
    // The client timer is only UX — the prompt is driven by the SERVER refusing.
    saveConfig.mockRejectedValueOnce(new Error("reauth-required: confirm your password to continue."));
    render(<AdminDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: /API keys/ }));   // ADMIN-D: saves live in the detail views now
    fireEvent.click(screen.getByRole("button", { name: "Save keys" }));
    await screen.findByText("Confirm your password");
    fireEvent.change(screen.getByPlaceholderText("Owner password"), { target: { value: "hunter2" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    await waitFor(() => expect(reauthAdmin).toHaveBeenCalledWith("hunter2"));
    await waitFor(() => expect(saveConfig).toHaveBeenCalledTimes(2));   // retried after unlocking
  });

  it("R31-5: Delete account → type DELETE → move to trash (never a hard delete from the card)", async () => {
    await openAlice();
    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    const moveBtn = screen.getByRole("button", { name: "Move to trash" });
    expect(moveBtn).toBeDisabled();                          // gated until DELETE is typed
    expect(adminTrashUser).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText("DELETE"), { target: { value: "DELETE" } });
    expect(moveBtn).not.toBeDisabled();
    fireEvent.click(moveBtn);
    await waitFor(() => expect(adminTrashUser).toHaveBeenCalledWith("u1"));
    expect(deleteUser).not.toHaveBeenCalled();               // hard delete is Trash-tab only
  });

  it("BL-2c: sign-out-all-devices fires immediately (non-destructive)", async () => {
    await openAlice();
    fireEvent.click(screen.getByRole("button", { name: "Sign out all devices" }));
    await waitFor(() => expect(adminSignOutUser).toHaveBeenCalledWith("u1"));
  });

  it("BL-2b/N-2: Empty trash bulk-purges every trashed account after a confirm", async () => {
    listUsers.mockResolvedValueOnce([
      { uid: "u1", email: "alice@test.com", name: "Alice", tier: "free", disabled: false, portfolioCount: 1 },
      { uid: "t1", email: "gone1@test.com", name: "Gone1", tier: "free", deleted: true, deletedAt: Date.now() },
      { uid: "t2", email: "gone2@test.com", name: "Gone2", tier: "free", deleted: true, deletedAt: Date.now() },
    ]);
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Trash" }));
    await screen.findByText("Gone1");
    fireEvent.click(screen.getByRole("button", { name: "Empty trash" }));
    // R31-5: the bulk hard-delete is gated behind typing DELETE.
    const del2 = await screen.findByRole("button", { name: /Delete 2/ });
    expect(del2).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Type DELETE"), { target: { value: "DELETE" } });
    expect(del2).not.toBeDisabled();
    fireEvent.click(del2);
    await waitFor(() => expect(deleteUser).toHaveBeenCalledTimes(2));
    expect(deleteUser).toHaveBeenCalledWith("t1");
    expect(deleteUser).toHaveBeenCalledWith("t2");
  });

  it("BL-2d: Settings shows the reserved AI card with the Anthropic key field", async () => {
    render(<AdminDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByText("AI", { selector: ".sr-label" }));   // ADMIN-D: drill into the AI detail
    expect(screen.getByText(/AI \(reserved/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/sk-ant/)).toBeInTheDocument();
    // the future cache controls are visibly reserved, not clickable
    expect(screen.getByRole("button", { name: /Invalidate conviction cache/ })).toBeDisabled();
  });

  it("BL-1e: a getStats failure shows an explicit error, never a $0 dashboard", async () => {
    getStats.mockRejectedValueOnce(new Error("network down"));
    render(<AdminDashboard />);
    await screen.findByText("Couldn't load stats");
    expect(screen.getByText("Error")).toBeInTheDocument();           // header status dot label
    expect(screen.getByText(/network down/)).toBeInTheDocument();
    expect(screen.queryByText("Est. Monthly Revenue")).toBeNull();   // the zeroed cards are gone
  });

  it("opens a user's detail panel on row click with moderation actions", async () => {
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    const row = await screen.findByText("Alice");   // list row (after listUsers resolves)
    fireEvent.click(row);
    await screen.findByText("CHANGE TIER");          // detail panel (after lookupUser resolves)
    expect(screen.getByRole("button", { name: "Suspend" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete account" })).toBeInTheDocument();
  });

  // ── ADMIN-1: billing-ops visibility (read-only) ──

  it("ADMIN-1: the user detail shows the PayPal subscription status, id + end date", async () => {
    lookupUser.mockResolvedValueOnce({
      uid: "u1", email: "alice@test.com", name: "Alice", tier: "premium", disabled: false,
      portfolioCount: 1, coinCount: 3, billingStatus: "canceled",
      paypalSubscriptionId: "I-SUBTEST9", billingCycle: "yearly", subEndDate: "2099-06-01T00:00:00Z", subDowngradeTo: "",
    });
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(await screen.findByText("Alice"));
    await screen.findByText("CHANGE TIER");
    expect(screen.getByText("CANCELED")).toBeInTheDocument();        // BillPill (derived status)
    expect(screen.getByText("I-SUBTEST9")).toBeInTheDocument();      // the persisted PayPal sub id
    expect(screen.getByText("Access ends")).toBeInTheDocument();     // canceled → period-end row
  });

  it("ADMIN-1: the Users billing filter narrows the list to past-due accounts", async () => {
    listUsers.mockResolvedValueOnce([
      { uid: "a", email: "active@test.com", name: "ActiveUser", tier: "pro", portfolioCount: 1, billingStatus: "active" },
      { uid: "p", email: "pastdue@test.com", name: "PastDueUser", tier: "pro", portfolioCount: 1, billingStatus: "past_due" },
    ]);
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    await screen.findByText("ActiveUser");
    expect(screen.getByText("PastDueUser")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Past due" }));   // filter chip
    expect(screen.queryByText("ActiveUser")).toBeNull();                 // filtered out
    expect(screen.getByText("PastDueUser")).toBeInTheDocument();         // kept
  });

  it("ADMIN-1: the Overview 'Billing & webhooks' card lists recent webhook events", async () => {
    listWebhookEvents.mockResolvedValueOnce([
      { id: "WH-1", type: "BILLING.SUBSCRIPTION.ACTIVATED", atMs: Date.now() - 60000 },
    ]);
    render(<AdminDashboard />);
    await waitFor(() => expect(listWebhookEvents).toHaveBeenCalled());   // loads on the Overview tab
    expect(await screen.findByText("Billing & webhooks")).toBeInTheDocument();
    expect(await screen.findByText("Subscription activated")).toBeInTheDocument();   // the event row
    expect(screen.getByText(/1 processed/)).toBeInTheDocument();
  });

  it("ADMIN-1: the webhook card shows the reassuring empty-state before any events (default pre-launch view)", async () => {
    // The default listWebhookEvents mock returns [] — the state every admin sees pre-launch.
    render(<AdminDashboard />);
    await waitFor(() => expect(listWebhookEvents).toHaveBeenCalled());
    expect(await screen.findByText("Billing & webhooks")).toBeInTheDocument();
    expect(await screen.findByText(/empty list is expected before launch/i)).toBeInTheDocument();
  });

  /* ═══ ADMIN-3 — audit filter / pagination / export + source IP ═══ */

  // Three entries with distinct actions + actors so filtering and search are provable.
  const AUDIT_ROWS = [
    { id: "e1", atMs: Date.UTC(2026, 6, 24, 9, 0, 0), action: "setUserTier", actorEmail: "owner@test.com", targetEmail: "alice@test.com", targetUid: "u1", details: "tier=pro", ip: "203.0.113.9" },
    { id: "e2", atMs: Date.UTC(2026, 6, 24, 8, 0, 0), action: "suspendUser", actorEmail: "mgr@test.com", targetEmail: "bob@test.com", targetUid: "u2", details: "", ip: "198.51.100.4" },
    { id: "e3", atMs: Date.UTC(2026, 6, 24, 7, 0, 0), action: "saveConfig", actorEmail: "owner@test.com", targetEmail: "", targetUid: "", details: "flags.maintenance: false → true", ip: "" },
  ];
  const openAudit = async (rows = AUDIT_ROWS) => {
    listAudit.mockResolvedValueOnce(rows);
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Audit" }));
    await waitFor(() => expect(listAudit).toHaveBeenCalled());
  };
  // The action <select> lists the same friendly labels as the rows, so every row
  // assertion scopes to the row's .act element — otherwise it matches the <option> too.
  const actRow = (label) => screen.getByText(label, { selector: ".act" });
  const noActRow = (label) => screen.queryByText(label, { selector: ".act" });

  it("ADMIN-3: an audit row shows the source IP it was performed from", async () => {
    await openAudit();
    expect(await screen.findByText(/from 203\.0\.113\.9/)).toBeInTheDocument();
  });

  it("ADMIN-3: the saveConfig entry shows WHAT changed, not just 'updated app config'", async () => {
    await openAudit();
    expect(await screen.findByText(/flags\.maintenance: false → true/)).toBeInTheDocument();
    expect(screen.queryByText(/updated app config/)).toBeNull();
  });

  it("ADMIN-3: the action filter narrows the log to one action type", async () => {
    await openAudit();
    await screen.findByText("Changed tier", { selector: ".act" });
    expect(actRow("Suspended user")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filter by action"), { target: { value: "suspendUser" } });
    expect(noActRow("Changed tier")).toBeNull();            // filtered out
    expect(actRow("Suspended user")).toBeInTheDocument();   // kept
  });

  it("ADMIN-3: search matches the actor, the target and the IP", async () => {
    await openAudit();
    const box = await screen.findByPlaceholderText(/Search actor, target, details or IP/i);
    fireEvent.change(box, { target: { value: "bob@test.com" } });   // by target
    expect(actRow("Suspended user")).toBeInTheDocument();
    expect(noActRow("Changed tier")).toBeNull();
    fireEvent.change(box, { target: { value: "203.0.113.9" } });    // by IP
    expect(actRow("Changed tier")).toBeInTheDocument();
    expect(noActRow("Suspended user")).toBeNull();
  });

  it("ADMIN-3: the filter says so when nothing matches, rather than looking like an empty log", async () => {
    await openAudit();
    const box = await screen.findByPlaceholderText(/Search actor, target, details or IP/i);
    fireEvent.change(box, { target: { value: "no-such-thing" } });
    expect(screen.getByText("No entries match this filter.")).toBeInTheDocument();
    expect(screen.queryByText("No admin actions logged yet.")).toBeNull();
  });

  it("ADMIN-3: the audit log paginates at 50 per page", async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      id: "x" + i, atMs: Date.UTC(2026, 6, 24) - i * 1000, action: "setUserTier",
      actorEmail: `a${i}@test.com`, targetEmail: "", targetUid: "", details: "", ip: "",
    }));
    await openAudit(many);
    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument();
    // Assert the page really is 50 rows — "Page 1 of 2" would still render if the pager
    // computed pages correctly but sliced nothing.
    expect(document.querySelectorAll(".adm-aud")).toHaveLength(50);
    expect(screen.getByText("a0@test.com", { exact: false })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(document.querySelectorAll(".adm-aud")).toHaveLength(10);   // the remainder
    expect(screen.queryByText("a0@test.com", { exact: false })).toBeNull();
  });

  it("ADMIN-3: 'Load more' re-fetches a deeper slice only when the page came back full", async () => {
    // 100 rows == the default limit, so older entries may exist → the button shows.
    const full = Array.from({ length: 100 }, (_, i) => ({
      id: "y" + i, atMs: Date.UTC(2026, 6, 24) - i * 1000, action: "setUserTier",
      actorEmail: "a@test.com", targetEmail: "", targetUid: "", details: "", ip: "",
    }));
    await openAudit(full);
    const more = await screen.findByRole("button", { name: /Load more/ });
    fireEvent.click(more);
    await waitFor(() => expect(listAudit).toHaveBeenLastCalledWith(500));
  });

  it("ADMIN-3: no 'Load more' when the log is shorter than the fetch limit", async () => {
    await openAudit();   // 3 rows < 100
    await screen.findByText("Changed tier", { selector: ".act" });
    expect(screen.queryByRole("button", { name: /Load more/ })).toBeNull();
  });

  it("ADMIN-3: both tabs offer a CSV export, disabled when there is nothing to export", async () => {
    await openAudit();
    await screen.findByText("Changed tier", { selector: ".act" });
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();
    // Filter down to nothing → the export must not offer an empty file.
    fireEvent.change(await screen.findByPlaceholderText(/Search actor, target, details or IP/i), { target: { value: "zzz" } });
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeDisabled();

    cleanup();
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    await screen.findByText("Alice");
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();
  });

  it("ADMIN-3: the audit tab discloses that an exported copy leaves the retention controls", async () => {
    await openAudit();
    expect(await screen.findByText(/leaves the app's 365-day retention/i)).toBeInTheDocument();
  });

  it("ADMIN-3: a failed load shows the error and does NOT also claim the log is empty", async () => {
    // "Could not load…" next to "No admin actions logged yet" reads as reassurance that
    // nothing happened, which is the opposite of what a failed audit load means.
    listAudit.mockRejectedValueOnce(new Error("unavailable"));
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Audit" }));
    expect(await screen.findByText(/unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText("No admin actions logged yet.")).toBeNull();
  });

  it("ADMIN-3: at the server's 500 cap it SAYS older entries may not be shown", async () => {
    // A silent cap reads as "this is the whole log" — and the export would quietly omit
    // older activity while the UI calls it a copy of the log. Walk the REAL path: a full
    // 100-row first page → Load more → the server's 500-row clamp.
    const rows = (n, tag) => Array.from({ length: n }, (_, i) => ({
      id: tag + i, atMs: Date.UTC(2026, 6, 24) - i * 1000, action: "setUserTier",
      actorEmail: "a@test.com", targetEmail: "", targetUid: "", details: "", ip: "",
    }));
    await openAudit(rows(100, "p"));
    listAudit.mockResolvedValueOnce(rows(500, "q"));
    fireEvent.click(await screen.findByRole("button", { name: /Load more/ }));
    await waitFor(() => expect(listAudit).toHaveBeenLastCalledWith(500));

    expect(await screen.findByText(/older entries may exist in the log/i)).toBeInTheDocument();
    // Nothing deeper to ask for, so the button must not promise more.
    expect(screen.queryByRole("button", { name: /Load more/ })).toBeNull();
  });

  it("ADMIN-3: clicking Export CSV writes exactly the FILTERED rows, not the whole log", async () => {
    // The UI tells the operator the file matches what's on screen. Nothing tested the
    // wiring, so the builders could have been handed the unfiltered list and every unit
    // test would still pass. jsdom has no object-URL plumbing — stub it and read the Blob.
    const blobs = [];
    const origCreate = URL.createObjectURL, origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn((b) => { blobs.push(b); return "blob:mock"; });
    URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    try {
      await openAudit();
      await screen.findByText("Changed tier", { selector: ".act" });
      fireEvent.change(screen.getByLabelText("Filter by action"), { target: { value: "suspendUser" } });
      fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));

      expect(blobs).toHaveLength(1);
      // NB: Blob.text() decodes via TextDecoder, which strips a leading BOM — so the BOM
      // cannot be asserted from here even though the downloaded file carries it. The
      // CSV_BOM constant itself is pinned by tests/unit/csv.test.js.
      const text = await blobs[0].text();
      expect(text).toContain("When (UTC),Action,Actor,Target,Details,Source IP");
      expect(text).toContain("suspendUser");
      expect(text).toContain("198.51.100.4");
      // The two filtered-out entries must NOT be in the file.
      expect(text).not.toContain("setUserTier");
      expect(text).not.toContain("saveConfig");
      expect(text.trim().split("\n")).toHaveLength(2);               // header + 1 row
      expect(clickSpy).toHaveBeenCalled();
    } finally {
      URL.createObjectURL = origCreate; URL.revokeObjectURL = origRevoke; clickSpy.mockRestore();
    }
  });

  it("ADMIN-3: the action filter keeps its selection visible after a reload that drops it", async () => {
    await openAudit();
    fireEvent.change(await screen.findByLabelText("Filter by action"), { target: { value: "saveConfig" } });
    // Reload returns a slice with no saveConfig entry at all.
    listAudit.mockResolvedValueOnce([AUDIT_ROWS[0]]);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(listAudit).toHaveBeenCalledTimes(2));
    // The <select> must still show the active filter rather than rendering blank.
    expect(screen.getByLabelText("Filter by action")).toHaveValue("saveConfig");
    expect(screen.getByText("No entries match this filter.")).toBeInTheDocument();
  });

  /* ═══ ADMIN-4 — Overview growth card ═══
     The through-line of these tests: a short history must never be dressed up as
     a real reading. "collecting" and "0%" mean different things and must look
     different on screen. */

  // Oldest-first daily snapshots ending today, `n` days long.
  const growthSeries = (rows) => rows.map((r, i) => ({
    date: new Date(Date.now() - (rows.length - 1 - i) * 86400000).toISOString().slice(0, 10),
    ...r,
  }));

  it("ADMIN-4: renders the growth trend with 7d/30d deltas once there is history", async () => {
    const series = growthSeries(Array.from({ length: 31 }, (_, i) => ({
      netRevenue: 100 + i, paidUsers: 10 + Math.floor(i / 10), totalUsers: 50 + i, signups24h: 2,
      canceledSubs: 0, pastDueSubs: 0,
    })));
    listDailyStats.mockResolvedValueOnce(series);
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("Growth")).toBeInTheDocument());
    // Latest values.
    await waitFor(() => expect(screen.getByText("$130")).toBeInTheDocument());   // netRevenue 130
    expect(screen.getByText("MRR (net)")).toBeInTheDocument();
    // 30 days back netRevenue was 100 → +30 (+30%).
    expect(screen.getByText("30d +$30 (+30%)")).toBeInTheDocument();
    // 7 days back it was 123, so +7 is +5.7% → displayed as +6%. The percentage is
    // computed off the REAL baseline, not off the 30-day one.
    expect(screen.getByText("7d +$7 (+6%)")).toBeInTheDocument();
    // 31 consecutive snapshots → 31 days of history, no missed-run note.
    const foot = screen.getByText(/Signups yesterday/);
    expect(foot.textContent).toContain("31 days of history");
    expect(foot.textContent).not.toContain("was missed");
  });

  it("ADMIN-4: says 'collecting' — never 0% — while the history is too short", async () => {
    // Three days cannot answer a 7- or 30-day question.
    listDailyStats.mockResolvedValueOnce(growthSeries([
      { netRevenue: 10, paidUsers: 1, totalUsers: 4, signups24h: 1 },
      { netRevenue: 20, paidUsers: 2, totalUsers: 5, signups24h: 1 },
      { netRevenue: 30, paidUsers: 3, totalUsers: 6, signups24h: 1 },
    ]));
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("Growth")).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByText("30d collecting").length).toBe(3));
    // Churn must read "collecting", NOT "0.0%" — the whole point of the card.
    const churnValue = screen.getByText("Net paid churn · 30d").parentElement.querySelector(".v");
    expect(churnValue.textContent).toBe("collecting");
    expect(screen.getByText(/needs 30 days of history/)).toBeInTheDocument();
  });

  it("ADMIN-4: surfaces pending cancels that have not dropped a tier yet", async () => {
    listDailyStats.mockResolvedValueOnce(growthSeries([
      { netRevenue: 10, paidUsers: 3, totalUsers: 5, canceledSubs: 2, pastDueSubs: 1 },
      { netRevenue: 10, paidUsers: 3, totalUsers: 5, canceledSubs: 2, pastDueSubs: 1 },
    ]));
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("Growth")).toBeInTheDocument());
    // Scoped to the growth foot — a bare "3" also matches the headline stat tiles.
    const foot = await screen.findByText(/cancelled or past-due/);
    expect(foot.textContent).toContain("3 cancelled or past-due");   // 2 cancelled + 1 past due
    expect(foot.textContent).toContain("have not dropped yet");
  });

  it("ADMIN-4: an empty series reads as 'not started yet', not as an error", async () => {
    listDailyStats.mockResolvedValueOnce([]);
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("Growth")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/No snapshots recorded yet/)).toBeInTheDocument());
    expect(screen.getByText(/Nothing is backfilled/)).toBeInTheDocument();
  });

  it("ADMIN-4: a FAILED load shows the error and does not also claim there is no history", async () => {
    listDailyStats.mockRejectedValueOnce(new Error("permission-denied"));
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("permission-denied")).toBeInTheDocument());
    // The "no snapshots yet" reassurance must be suppressed — a failure is not a
    // normal empty state (same contradiction fixed for ADMIN-1 and ADMIN-3).
    expect(screen.queryByText(/No snapshots recorded yet/)).not.toBeInTheDocument();
  });

  it("ADMIN-4: 'Capture now' writes a snapshot, re-reads the series, then toasts", async () => {
    listDailyStats.mockResolvedValue([]);
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("Growth")).toBeInTheDocument());
    await waitFor(() => expect(listDailyStats).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Capture now" }));
    await waitFor(() => expect(captureStatsSnapshot).toHaveBeenCalled());
    // DI-1 verify-then-toast: the series is re-read BEFORE success is claimed.
    await waitFor(() => expect(listDailyStats).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("Snapshot captured for 2026-07-24")).toBeInTheDocument());
  });

  it("ADMIN-4: 'Capture now' is owner-only — a manager never sees it", async () => {
    getAdminRole.mockResolvedValueOnce("manager");
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("Growth")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Capture now" })).not.toBeInTheDocument();
  });

  it("ADMIN-4: a failed capture reports the error instead of a false success", async () => {
    captureStatsSnapshot.mockRejectedValueOnce(new Error("permission-denied"));
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("Growth")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Capture now" }));
    await waitFor(() => expect(screen.getByText("permission-denied")).toBeInTheDocument());
    expect(screen.queryByText(/Snapshot captured/)).not.toBeInTheDocument();
  });

  /* ═══ ADMIN-2 — operational status strip + kill-switches ═══ */

  it("ADMIN-2: the strip reports healthy jobs and all-features-on", async () => {
    render(<AdminDashboard />);
    await waitFor(() => expect(getSystemStatus).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("All scheduled jobs healthy")).toBeInTheDocument());
    expect(screen.getByText("All features on")).toBeInTheDocument();
    expect(screen.getByText("refreshPrices")).toBeInTheDocument();
    // The Sentry state is reported honestly rather than omitted when it's off.
    expect(document.querySelector(".adm-strip-foot").textContent).toContain("not configured");
  });

  it("ADMIN-2: a cron that has NEVER run reads 'never', not a healthy blank", async () => {
    // The silent-death case: a schedule that was never deployed throws no errors and
    // produces no data, so a blank here would be indistinguishable from working.
    getSystemStatus.mockResolvedValueOnce({
      now: 1_700_000_000_000,
      features: { marketData: true, checkout: true, aiResearch: true },
      maintenance: false, signupsEnabled: true,
      jobs: [{ name: "captureDailyStats", everyMs: 86_400_000, at: null, errorAt: null }],
      caches: {}, sentryConfigured: false,
    });
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("never")).toBeInTheDocument());
    expect(screen.getByText(/Scheduled jobs: never run/)).toBeInTheDocument();
    // …and a cache that was never written says so rather than showing an age.
    expect(document.querySelector(".adm-strip-foot").textContent).toContain("never written");
  });

  it("ADMIN-2: an overdue job is flagged, not quietly rendered as ok", async () => {
    getSystemStatus.mockResolvedValueOnce({
      now: 1_700_000_000_000,
      features: { marketData: true, checkout: true, aiResearch: true },
      maintenance: false, signupsEnabled: true,
      // 5-minute job, last completed an hour ago → the schedule has stopped firing.
      jobs: [{ name: "refreshPrices", everyMs: 300_000, at: 1_700_000_000_000 - 3_600_000, errorAt: null }],
      caches: {}, sentryConfigured: true,
    });
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText(/OVERDUE/)).toBeInTheDocument());
    expect(document.querySelector(".adm-job.late")).toBeTruthy();
  });

  it("ADMIN-2: switched-off features are NAMED in the strip", async () => {
    getSystemStatus.mockResolvedValueOnce({
      now: 1_700_000_000_000,
      features: { marketData: false, checkout: false, aiResearch: true },
      maintenance: false, signupsEnabled: true,
      jobs: [], caches: {}, sentryConfigured: false,
    });
    render(<AdminDashboard />);
    // Mid-incident you need to see WHICH switch is down without opening Settings.
    await waitFor(() => expect(screen.getByText("marketData, checkout OFF")).toBeInTheDocument());
  });

  it("ADMIN-2: a failed status load shows the error — never a false all-clear", async () => {
    // BL-1e error-vs-empty: "we couldn't check" must not render as "everything is fine".
    getSystemStatus.mockRejectedValueOnce(new Error("network down"));
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText(/status unknown/)).toBeInTheDocument());
    expect(screen.queryByText("All scheduled jobs healthy")).not.toBeInTheDocument();
  });

  it("ADMIN-2: flipping a kill-switch saves ALL switches, then re-reads the status", async () => {
    render(<AdminDashboard />);
    await waitFor(() => expect(getAdminConfig).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /Settings/i }));
    const row = await screen.findByText("Live market data");
    const toggle = row.closest(".settings-row").querySelector('input[role="switch"]');
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    await waitFor(() => expect(saveConfig).toHaveBeenCalled());
    // The payload must carry the WHOLE features map. Sending only the flipped switch
    // would let the server's per-key merge be the only thing standing between a
    // maintenance toggle and silently re-enabling everything else.
    const flags = saveConfig.mock.calls[saveConfig.mock.calls.length - 1][0].flags;
    expect(flags.features).toEqual({ marketData: false, checkout: true, aiResearch: true });
    // DI-1 verify-then-toast: the strip is re-read before success is announced.
    await waitFor(() => expect(getSystemStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("marketData DISABLED")).toBeInTheDocument());
  });

  it("ADMIN-2: a failed switch save reverts the toggle and reports the error", async () => {
    saveConfig.mockRejectedValueOnce(new Error("permission-denied"));
    render(<AdminDashboard />);
    await waitFor(() => expect(getAdminConfig).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /Settings/i }));
    const row = await screen.findByText("New subscriptions");
    const toggle = row.closest(".settings-row").querySelector('input[role="switch"]');
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByText(/Save failed/)).toBeInTheDocument());
    // The switch must snap back — a control that LOOKS off while checkout is still
    // live is worse than no control at all.
    await waitFor(() => expect(toggle.checked).toBe(true));
  });
});
