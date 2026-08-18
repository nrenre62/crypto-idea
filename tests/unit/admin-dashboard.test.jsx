import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

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
  // ADMIN-SEP (CRYP-103): owner-only admin roster for the Admin-access drill-in. Default
  // empty so unrelated Admin-access tests (grant flow, MFA) are unaffected; the roster
  // test overrides it. A missing mock would make the wrapper undefined and crash the
  // load effect the moment Admin access opens (the ADMIN-2/ADMIN-4 mock-gap lesson).
  listAdmins: vi.fn(() => Promise.resolve([])),
  listAudit: vi.fn(() => Promise.resolve([])),
  listWebhookEvents: vi.fn(() => Promise.resolve([])),   // ADMIN-1: Overview billing card
  // AUTH-DUP (Part B): Overview duplicate-email detector. A missing mock would make the
  // wrapper undefined, loadDupEmails would throw, and the card would render its error
  // path while the suite still went green — the ADMIN-2/ADMIN-4 mock-gap trap. Default
  // to the clean pre-launch state (no duplicates).
  findDuplicateEmails: vi.fn(() => Promise.resolve({ groups: [], duplicateEmails: 0, capped: false })),
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
  // ADMIN-5: view-as + private notes. A missing mock would make the wrapper undefined
  // and crash the loadNote effect the moment a user detail opens (the ADMIN-2/ADMIN-4
  // mock-gap lesson) — so they're mocked even for tests that don't assert on them.
  viewUserAsAdmin: vi.fn(() => Promise.resolve({
    uid: "u1", email: "alice@test.com", name: "Alice", tier: "free", disabled: false, role: "",
    deleted: false, billingStatus: "none",
    portfolios: [{ id: "p1", name: "Main", coinCount: 1, coins: [
      { id: "c1", symbol: "btc", name: "Bitcoin", txCount: 1, journal: { thesis: "long-term store of value", changeMyMind: "regulatory ban", status: "intact" }, txTruncated: false, transactions: [{ type: "buy", amount: 0.5, priceAtBuy: 30000, date: "2026-01-01" }] },
    ] }],
    learn: { xp: 120, streak: 3, completedLessons: 4, lastActivity: "" },
    truncated: { portfolios: false, coins: false },
  })),
  getUserNote: vi.fn(() => Promise.resolve({ note: "", updatedAt: null, updatedByEmail: "" })),
  saveUserNote: vi.fn(() => Promise.resolve()),
  // ADMIN-6: Settings password. Mocked even for tests that don't assert on them — the
  // hook now imports both, so a missing mock would leave the wrapper undefined and crash
  // the unlock/save handlers (the ADMIN-2/ADMIN-4 mock-gap lesson).
  setSettingsPassword: vi.fn(() => Promise.resolve()),
  unlockSettings: vi.fn(() => Promise.resolve({ success: true, until: 1_700_000_600_000 })),
  // ADMIN-6 PR2: emailed Settings-password reset. The hook imports both, so a missing mock
  // would leave the wrapper undefined and crash the request/complete handlers.
  requestSettingsPwReset: vi.fn(() => Promise.resolve({ success: true })),
  completeSettingsPwReset: vi.fn(() => Promise.resolve({ success: true })),
}));

// ADMIN-SEC: the dashboard now resolves its own role from the verified custom claims.
// Default to OWNER so the existing coverage (which exercises Settings) still applies;
// individual tests override this to assert the manager/legacy walls.
vi.mock("../../src/api/admin-auth.js", () => ({
  getAdminRole: vi.fn(() => Promise.resolve("owner")),
  reauthAdmin: vi.fn(() => Promise.resolve({ success: true })),
}));

import AdminDashboard, { JOB_META } from "../../src/components/admin-dashboard.jsx";
import { getStats, getAdminConfig, listUsers, listAdmins, listAudit, listWebhookEvents, findDuplicateEmails, listDailyStats, captureStatsSnapshot, getSystemStatus, deleteUser, setManagerRole, adminTrashUser, adminSignOutUser, lookupUser, saveConfig, viewUserAsAdmin, getUserNote, saveUserNote, setUserTier, suspendUser, setSettingsPassword, unlockSettings, requestSettingsPwReset, completeSettingsPwReset } from "../../src/api/admin.js";
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

  // STORAGE-LIMIT (2026-08-01): the phantom per-tier "Storage" row was removed from the
  // Plan Limits card — it was display-only, enforced nowhere, and inconsistent with the
  // real portfolio/coin/tx caps (Premium's 15 GB was actually BELOW its own tx-cap max).
  // The card now shows only the enforced + priced dimensions.
  it("Plan Limits card shows no Storage row (STORAGE-LIMIT)", async () => {
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("Plan Limits")).toBeInTheDocument());
    expect(screen.queryByText("Storage")).toBeNull();
    expect(screen.queryByText("5 MB")).toBeNull();
    expect(screen.queryByText("500 MB")).toBeNull();
    expect(screen.queryByText("15 GB")).toBeNull();
  });

  // ADMIN-JOBS (2026-08-01): the Overview status strip lists each scheduled job by a
  // friendly label with a custom hover/focus tooltip, instead of the raw JS name +
  // the browser's un-styleable native `title`. The job's `name` stays the stable
  // internal heartbeat key (never renamed) — JOB_META only ADDS a display label.
  describe("ADMIN-JOBS — status strip job labels + tooltip", () => {
    // The acceptance guard: labels+descriptions are enumerated from the REAL source
    // (SCHEDULED_JOBS in functions/index.js), not a hand-kept list — so adding a 7th
    // job with no JOB_META entry fails the build. Same tripwire as ACTION_LABELS and
    // features.test.js's cron-registry check.
    it("JOB_META covers every scheduled job in functions/index.js (enumerate from source)", () => {
      const here = dirname(fileURLToPath(import.meta.url));
      const SRC = readFileSync(resolve(here, "../../functions/index.js"), "utf8");
      const block = SRC.slice(
        SRC.indexOf("const SCHEDULED_JOBS = ["),
        SRC.indexOf("];", SRC.indexOf("const SCHEDULED_JOBS = [")),
      );
      const names = [...block.matchAll(/name: "(\w+)"/g)].map((m) => m[1]);
      expect(names.length, "expected to find the SCHEDULED_JOBS registry").toBeGreaterThanOrEqual(6);
      for (const name of names) {
        expect(JOB_META[name], `no JOB_META entry for scheduled job "${name}"`).toBeTruthy();
        expect(typeof JOB_META[name].label, name).toBe("string");
        expect(JOB_META[name].label.length, name).toBeGreaterThan(0);
        expect(typeof JOB_META[name].description, name).toBe("string");
        expect(JOB_META[name].description.length, name).toBeGreaterThan(10);
      }
    });

    it("renders friendly job labels, never the raw job names", async () => {
      render(<AdminDashboard />);
      await waitFor(() => expect(screen.getByText("Prices")).toBeInTheDocument());
      expect(screen.getByText("Daily stats")).toBeInTheDocument();
      expect(screen.queryByText("refreshPrices")).toBeNull();
      expect(screen.queryByText("captureDailyStats")).toBeNull();
    });

    it("job rows carry no native title attribute (custom tooltip only, no double pop)", async () => {
      const { container } = render(<AdminDashboard />);
      await screen.findByText("Prices");
      const rows = container.querySelectorAll(".adm-job");
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach((r) => {
        expect(r.getAttribute("title")).toBeNull();
        expect(r.querySelector(".j-name").getAttribute("title")).toBeNull();
      });
    });

    it("keyboard focus reveals the description tooltip; blur hides it", async () => {
      render(<AdminDashboard />);
      const name = await screen.findByText("Prices");
      expect(screen.queryByRole("tooltip")).toBeNull();
      fireEvent.focus(name);
      const tip = await screen.findByRole("tooltip");
      expect(tip).toHaveTextContent(/Refreshes market prices/);
      fireEvent.blur(name);
      await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
    });

    it("hover reveals the tooltip only after ~2s, and cancels if the pointer leaves early", async () => {
      render(<AdminDashboard />);
      const name = await screen.findByText("Prices");
      vi.useFakeTimers();
      try {
        // Rests on the name for < 2s → nothing shows yet.
        fireEvent.mouseEnter(name);
        act(() => { vi.advanceTimersByTime(1999); });
        expect(screen.queryByRole("tooltip")).toBeNull();
        // Crossing 2s → the box appears.
        act(() => { vi.advanceTimersByTime(1); });
        expect(screen.getByRole("tooltip")).toHaveTextContent(/Refreshes market prices/);
        // Leaving hides it immediately.
        fireEvent.mouseLeave(name);
        expect(screen.queryByRole("tooltip")).toBeNull();
        // Leaving BEFORE 2s cancels the pending timer — no late pop.
        fireEvent.mouseEnter(name);
        act(() => { vi.advanceTimersByTime(1000); });
        fireEvent.mouseLeave(name);
        act(() => { vi.advanceTimersByTime(5000); });
        expect(screen.queryByRole("tooltip")).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
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

  /* ═══ ADMIN-SEP (CRYP-103) — Part B: owner-only admin roster ═══
     Today Admin access is search-by-email only — an owner can't see who the admins are.
     PR1 adds a roster (owners + managers, keyed off the claim via listAdmins) at the TOP
     of the drill-in, with the email-lookup grant flow KEPT below it. No roster exists
     today, so the roster rows are absent → red. */

  it("CRYP-103: the Admin-access drill-in lists all admins with role pills, above the kept email-grant UI", async () => {
    listAdmins.mockResolvedValue([
      { uid: "o1", email: "owner@test.com", role: "owner", disabled: false, lastSignInTime: null },
      { uid: "m1", email: "mgr@test.com", role: "manager", disabled: false, lastSignInTime: null },
    ]);
    render(<AdminDashboard />);   // default role = owner
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Admin access" }));

    // Both admins are listed by email…
    expect(await screen.findByText("owner@test.com")).toBeInTheDocument();
    expect(screen.getByText("mgr@test.com")).toBeInTheDocument();
    // …each with its role pill.
    expect(screen.getByText("OWNER")).toBeInTheDocument();
    expect(screen.getByText("MANAGER")).toBeInTheDocument();
    // The email-lookup grant flow must STILL be present below it (roster + keep lookup).
    expect(screen.getByPlaceholderText("email@example.com")).toBeInTheDocument();
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

  /* ═══ ADMIN-6 — the owner-only Settings password (2nd lock) ═══ */

  it("ADMIN-6: a server settings-locked demand raises the SETTINGS-password prompt and retries via unlockSettings", async () => {
    // Distinct from reauth-required: the server asks for the SETTINGS password, so the
    // modal must offer that factor (unlockSettings), not the login re-auth (reauthAdmin).
    saveConfig.mockRejectedValueOnce(new Error("settings-locked: enter your Settings password to continue."));
    render(<AdminDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: /API keys/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save keys" }));
    // Settings-mode copy — NOT the login "Confirm your password" prompt.
    await screen.findByText("Enter your Settings password");
    fireEvent.change(screen.getByPlaceholderText("Settings password"), { target: { value: "SettingsPw12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));
    await waitFor(() => expect(unlockSettings).toHaveBeenCalledWith("SettingsPw12345"));
    expect(reauthAdmin).not.toHaveBeenCalled();                        // wrong factor never used
    await waitFor(() => expect(saveConfig).toHaveBeenCalledTimes(2));  // retried after unlocking
  });

  it("ADMIN-6: the owner can set a Settings password (validates the confirm, then calls setSettingsPassword)", async () => {
    render(<AdminDashboard />);   // default getAdminConfig {} → no Settings password yet
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: /Settings password/ }));
    // First-time set → there is no "current password" field.
    expect(screen.queryByLabelText("Current Settings password")).toBeNull();

    // A mismatched confirm is refused client-side, before the server is touched.
    fireEvent.change(screen.getByLabelText("Settings password"), { target: { value: "SettingsPw12345" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "different99XYZ" } });
    fireEvent.click(screen.getByRole("button", { name: "Set password" }));
    expect(await screen.findByText(/don.t match/i)).toBeInTheDocument();
    expect(setSettingsPassword).not.toHaveBeenCalled();

    // Matching + strong → persisted (current is empty on a first set).
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "SettingsPw12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Set password" }));
    await waitFor(() => expect(setSettingsPassword).toHaveBeenCalledWith("SettingsPw12345", ""));
  });

  it("ADMIN-6: the Settings password screen is owner-only — a manager never reaches it", async () => {
    // It lives inside owner-only Settings; a manager sees no Settings tab at all, so the
    // 2nd lock's set/change UI is unreachable for them (server also refuses, assertOwner).
    getAdminRole.mockResolvedValueOnce("manager");
    render(<AdminDashboard />);
    await screen.findByText(/Signed in as a/);
    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Settings password/ })).toBeNull();
  });

  it("ADMIN-6 PR2: with a Settings password set, the owner can email themselves a reset link", async () => {
    // A password IS set (settingsAuth.set) → the "Email me a reset link" button shows.
    getAdminConfig.mockResolvedValueOnce({ settingsAuth: { set: true, updatedAt: 1 } });
    render(<AdminDashboard />);   // default role = owner
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    fireEvent.click(await screen.findByRole("button", { name: /Settings password/ }));
    fireEvent.click(screen.getByRole("button", { name: "Email me a reset link" }));
    await waitFor(() => expect(requestSettingsPwReset).toHaveBeenCalled());
    expect(await screen.findByText(/Check your admin email/i)).toBeInTheDocument();
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

  it("BL-2d: Settings shows the reserved AI card with the AI provider key field", async () => {
    render(<AdminDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByText("AI", { selector: ".sr-label" }));   // ADMIN-D: drill into the AI detail
    // ADMIN-UI-4: the drill-in title is now the DScreen header ("AI"); the "reserved"
    // qualifier moved into the body copy (the duplicate in-card title was dropped).
    expect(screen.getByText(/Reserved.*live AI ships at go-live/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Provider API key")).toBeInTheDocument();
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

  /* ═══ ADMIN-SEP (CRYP-103) — Part A1: user-detail backstop ═══
     Even though Part A hides admins from the Users LIST server-side, the detail panel is
     the last line of defence: if a lookup ever resolves to an admin (a stale list, a
     direct open), it must not offer moderation. An admin is not a support subject — no
     Suspend, no Delete — and it says why. The guard fires today only for role === 'owner';
     a manager admin still shows live Suspend/Delete, so this is red. */

  it("CRYP-103: the user-detail hides Suspend + Delete for an admin manager and shows the protected notice", async () => {
    // The list row is a plain account; the lookup reveals it is actually a manager admin.
    lookupUser.mockResolvedValueOnce({
      uid: "m1", email: "mgr@test.com", name: "Manager Mike", tier: "free", disabled: false,
      role: "manager", isAdmin: true, portfolioCount: 0, coinCount: 0, billingStatus: "none",
    });
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(await screen.findByText("Alice"));   // opens the (mocked) lookup → manager admin
    await screen.findByText("CHANGE TIER");              // detail panel rendered

    // An admin can't be moderated as a user.
    expect(screen.queryByRole("button", { name: "Suspend" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete account" })).toBeNull();
    // …and the panel explains why.
    expect(screen.getByText(/protected/i)).toBeInTheDocument();
  });

  it("CRYP-103: the user-detail STILL shows Suspend + Delete for a plain user (no over-hiding)", async () => {
    // The companion guard — hiding admin controls must not swallow the controls for a
    // normal account. Green today; must stay green after the fix.
    lookupUser.mockResolvedValueOnce({
      uid: "p1", email: "plain@test.com", name: "Plain Pat", tier: "free", disabled: false,
      role: "", isAdmin: false, portfolioCount: 0, coinCount: 0, billingStatus: "none",
    });
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(await screen.findByText("Alice"));
    await screen.findByText("CHANGE TIER");
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

  /* ═══ AUTH-DUP (Part B) — Overview duplicate-email detector ═══ */

  it("AUTH-DUP: the Overview shows the all-clear when there are no duplicate emails", async () => {
    // Default findDuplicateEmails mock returns { duplicateEmails: 0 }.
    render(<AdminDashboard />);
    await waitFor(() => expect(findDuplicateEmails).toHaveBeenCalled());   // loads on the Overview tab
    expect(await screen.findByText("Duplicate emails")).toBeInTheDocument();
    expect(await screen.findByText(/No duplicate emails/i)).toBeInTheDocument();
  });

  it("AUTH-DUP: the Overview headlines the count and expands to list the offending accounts", async () => {
    findDuplicateEmails.mockResolvedValueOnce({
      groups: [
        { email: "mark@test.com", count: 2, accounts: [
          { uid: "u1", email: "mark@test.com", tier: "free", disabled: false, creationTime: "2026-08-01T10:00:00Z" },
          { uid: "u2", email: "mark@test.com", tier: "pro", disabled: true, creationTime: "2026-08-01T10:00:01Z" },
        ] },
      ],
      duplicateEmails: 1,
      capped: false,
    });
    render(<AdminDashboard />);
    await waitFor(() => expect(findDuplicateEmails).toHaveBeenCalled());
    // The card headlines the count.
    expect(await screen.findByText("Duplicate emails")).toBeInTheDocument();
    expect(await screen.findByText(/1 email shared by 2\+ accounts/i)).toBeInTheDocument();
    // Expand → the offending email + both account uids appear.
    fireEvent.click(screen.getByRole("button", { name: /Show accounts/i }));
    expect(await screen.findByText("mark@test.com")).toBeInTheDocument();
    expect(await screen.findByText(/u1/)).toBeInTheDocument();
    expect(await screen.findByText(/u2/)).toBeInTheDocument();
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
    // ADMIN-JOBS: the strip now shows the friendly label ("Prices"), not the raw job name.
    expect(screen.getByText("Prices")).toBeInTheDocument();
    expect(screen.queryByText("refreshPrices")).toBeNull();
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

  /* ── CRYP-93 · the AI-research chat kill-switch MOVES to the AI settings screen ──
     App Controls is for the two incident switches (market data, checkout) that gate
     something live TODAY. The AI-research chat toggle gates a Wave-B feature, so it
     belongs in the reserved AI settings screen next to the provider key — not in the
     incident row where it reads as a live control. */
  it("CRYP-93: the AI research chat toggle lives on the AI settings screen, not App Controls", async () => {
    // CRYP-112: aiResearch now ships DEFAULT-OFF, so seed it explicitly ON here — this
    // case tests toggling the switch OFF (→ saves aiResearch:false), which requires it
    // to START on. Green under both the old default-ON and the new default-OFF behaviour.
    getAdminConfig.mockResolvedValueOnce({ flags: { maintenance: false, signupsEnabled: true, features: { marketData: true, checkout: true, aiResearch: true } } });
    render(<AdminDashboard />);
    await waitFor(() => expect(getAdminConfig).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));

    // App Controls home still renders (sanity: the two incident switches are here)…
    await screen.findByText("Live market data");
    expect(screen.getByText("New subscriptions")).toBeInTheDocument();
    // …but the AI-research toggle is NO LONGER in the App Controls list.
    expect(screen.queryByText("AI research")).toBeNull();
    expect(screen.queryByText("AI research chat")).toBeNull();

    // Drill into the AI settings screen — the toggle lives here now.
    fireEvent.click(screen.getByText("AI", { selector: ".sr-label" }));
    const row = await screen.findByText(/AI research chat/i);
    const container = row.closest(".settings-row") || row.closest(".adm-scr") || row.parentElement;
    const toggle = container.querySelector('input[role="switch"]');
    expect(toggle, "the AI research chat row should carry a switch").toBeTruthy();

    // Toggling it saves the aiResearch feature key through the same saveFeature→saveConfig path.
    fireEvent.click(toggle);
    await waitFor(() => expect(saveConfig).toHaveBeenCalled());
    const flags = saveConfig.mock.calls[saveConfig.mock.calls.length - 1][0].flags;
    expect(flags.features).toHaveProperty("aiResearch");
    expect(flags.features.aiResearch).toBe(false);
  });

  /* ── CRYP-112 · aiResearch ships DEFAULT-OFF ──
     A fresh / unconfigured deploy (the incident switches configured, but aiResearch never
     set) must render the AI-research chat switch UNCHECKED with no admin action — the panel
     reflects the real default-OFF state. RED today: the hook reads a missing aiResearch as
     ON (ff.aiResearch !== false), so the toggle starts CHECKED. */
  it("CRYP-112: the AI research chat switch is OFF by default for a config that never set aiResearch", async () => {
    getAdminConfig.mockResolvedValueOnce({ flags: { maintenance: false, signupsEnabled: true, features: { marketData: true, checkout: true } } });
    render(<AdminDashboard />);
    await waitFor(() => expect(getAdminConfig).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));

    // Drill into the AI settings screen where the toggle lives (same path as CRYP-93 above).
    fireEvent.click(screen.getByText("AI", { selector: ".sr-label" }));
    const row = await screen.findByText(/AI research chat/i);
    const container = row.closest(".settings-row") || row.closest(".adm-scr") || row.parentElement;
    const toggle = container.querySelector('input[role="switch"]');
    expect(toggle, "the AI research chat row should carry a switch").toBeTruthy();

    // Default-OFF: an aiResearch that was never configured renders the switch UNCHECKED.
    expect(toggle.checked).toBe(false);
  });

  /* ── CRYP-101 · LAUNCH-FREE Part B — the paidPlansEnabled master toggle ──
     A top-level flag (peer of maintenance/signups, NOT a flags.features switch) that
     turns off ALL new paid subscriptions site-wide. It lives on the Plans & pricing
     settings screen next to the prices it governs, and rides along on the same
     saveControls → saveConfig path so it can't be dropped by another flags save. */
  it("CRYP-101: the Plans & pricing screen has a paidPlansEnabled master toggle that flips via saveControls", async () => {
    getAdminConfig.mockResolvedValueOnce({ flags: { maintenance: false, signupsEnabled: true, paidPlansEnabled: true } });
    render(<AdminDashboard />);
    await waitFor(() => expect(getAdminConfig).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    fireEvent.click(await screen.findByRole("button", { name: /Plans & pricing/i }));

    // The master toggle reflects controls.paidPlansEnabled — ON here, so checked.
    const label = await screen.findByText(/Paid plans/i);
    const row = label.closest(".settings-row") || label.closest(".plan-block") || label.parentElement;
    const toggle = row.querySelector('input[role="switch"]');
    expect(toggle, "the Plans & pricing screen must render a paidPlansEnabled master toggle").toBeTruthy();
    expect(toggle.checked).toBe(true);

    // Flipping it saves flags.paidPlansEnabled=false through the saveControls→saveConfig path.
    fireEvent.click(toggle);
    await waitFor(() => expect(saveConfig).toHaveBeenCalled());
    expect(saveConfig.mock.calls.at(-1)[0].flags.paidPlansEnabled).toBe(false);
  });

  /* ── ADMIN-0 · admin 2FA switch ─────────────────────────────────────────────
     This is the one toggle in the panel that can lock every admin out of the panel
     — including out of itself, since it lives behind owner-only Settings. So it is
     armed, not tapped, and turning it OFF stays instant. */
  const openMfaRow = async () => {
    render(<AdminDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Admin access" }));
    const row = await screen.findByText("Require two-factor sign-in");
    return row.closest(".settings-row").querySelector('input[role="switch"]');
  };

  it("ADMIN-0: the 2FA switch reads OFF for a config that doesn't set it", async () => {
    // Absent must never render as "protected" — nothing can satisfy the gate until
    // Identity Platform MFA exists, so an optimistic ON would be a lie.
    getAdminConfig.mockResolvedValueOnce({ flags: { maintenance: false, signupsEnabled: true } });
    const toggle = await openMfaRow();
    expect(toggle.checked).toBe(false);
    expect(screen.getByText(/Identity Platform MFA/)).toBeInTheDocument();
  });

  it("ADMIN-0: turning 2FA ON is armed — nothing saves until the lockout warning is confirmed", async () => {
    const toggle = await openMfaRow();
    fireEvent.click(toggle);
    // The warning must name the ONLY recovery path, because by then the panel is gone.
    await screen.findByText(/This can lock you out/);
    expect(screen.getByText(/flags.requireAdminMfa/)).toBeInTheDocument();
    expect(saveConfig).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /I'm enrolled — require 2FA/ }));
    await waitFor(() => expect(saveConfig).toHaveBeenCalled());
    expect(saveConfig.mock.calls.at(-1)[0].flags.requireAdminMfa).toBe(true);
  });

  it("ADMIN-0: cancelling the warning leaves 2FA off and saves nothing", async () => {
    const toggle = await openMfaRow();
    fireEvent.click(toggle);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByText(/This can lock you out/)).toBeNull());
    expect(saveConfig).not.toHaveBeenCalled();
    expect(toggle.checked).toBe(false);
  });

  it("ADMIN-0: turning 2FA OFF is instant — the escape hatch must never be armed", async () => {
    // Recovery has to be one tap. Making "off" a two-step is how you stay locked out.
    getAdminConfig.mockResolvedValueOnce({ flags: { maintenance: false, signupsEnabled: true, requireAdminMfa: true } });
    const toggle = await openMfaRow();
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    await waitFor(() => expect(saveConfig).toHaveBeenCalled());
    expect(saveConfig.mock.calls.at(-1)[0].flags.requireAdminMfa).toBe(false);
    expect(screen.queryByText(/This can lock you out/)).toBeNull();
  });

  it("ADMIN-0: the 2FA flag rides along with every other flags save", async () => {
    // It lives inside `controls` for the ADMIN-2 reason — a flag kept outside that
    // object is absent from every payload, and the server would keep the old value.
    getAdminConfig.mockResolvedValueOnce({ flags: { maintenance: false, signupsEnabled: true, requireAdminMfa: true } });
    render(<AdminDashboard />);
    await waitFor(() => expect(getAdminConfig).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /Settings/i }));
    const row = await screen.findByText("Maintenance mode");
    fireEvent.click(row.closest(".settings-row").querySelector('input[role="switch"]'));
    await waitFor(() => expect(saveConfig).toHaveBeenCalled());
    const flags = saveConfig.mock.calls.at(-1)[0].flags;
    expect(flags.maintenance).toBe(true);
    expect(flags.requireAdminMfa).toBe(true);   // not silently dropped by a maintenance toggle
  });

  // ── ADMIN-5: team-scale & support ──

  it("ADMIN-5: the Users tier filter narrows the list", async () => {
    listUsers.mockResolvedValueOnce([
      { uid: "u1", email: "free@test.com", name: "Freebie", tier: "free", disabled: false, portfolioCount: 1, billingStatus: "none" },
      { uid: "u2", email: "pro@test.com", name: "ProUser", tier: "pro", disabled: false, portfolioCount: 2, billingStatus: "none" },
    ]);
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    await screen.findByText("Freebie");
    expect(screen.getByText("ProUser")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pro" }));   // Tier chip
    await waitFor(() => expect(screen.queryByText("Freebie")).toBeNull());
    expect(screen.getByText("ProUser")).toBeInTheDocument();
  });

  it("ADMIN-5: selecting a page shows the bulk bar and bulk-set-tier calls the callable per row", async () => {
    listUsers.mockResolvedValueOnce([
      { uid: "u1", email: "a@test.com", name: "Aaa", tier: "free", disabled: false, portfolioCount: 1, billingStatus: "none" },
      { uid: "u2", email: "b@test.com", name: "Bbb", tier: "free", disabled: false, portfolioCount: 1, billingStatus: "none" },
    ]);
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    await screen.findByText("Aaa");
    fireEvent.click(screen.getByLabelText("Select all users on this page"));
    const bulkBar = (await screen.findByText("2 selected")).closest(".adm-bulk-bar");
    fireEvent.click(within(bulkBar).getByRole("button", { name: "Pro" }));
    await waitFor(() => expect(setUserTier).toHaveBeenCalledTimes(2));
    expect(setUserTier).toHaveBeenCalledWith("u1", "pro");
    expect(setUserTier).toHaveBeenCalledWith("u2", "pro");
  });

  it("ADMIN-5: saving a view stores the current filters and shows a chip to re-apply it", async () => {
    localStorage.clear();   // saved views persist across renders — start clean
    listUsers.mockResolvedValueOnce([{ uid: "u1", email: "pro@test.com", name: "ProOne", tier: "pro", disabled: false, portfolioCount: 1, billingStatus: "none" }]);
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("My Pros");
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    await screen.findByText("ProOne");
    fireEvent.click(screen.getByRole("button", { name: "Pro" }));          // tier → pro
    fireEvent.click(screen.getByRole("button", { name: "+ Save view" }));
    expect(await screen.findByRole("button", { name: "My Pros" })).toBeInTheDocument();
    promptSpy.mockRestore();
    localStorage.clear();
  });

  it("ADMIN-5: an owner opens a read-only view-as — a reason is required, and the thesis is shown", async () => {
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(await screen.findByText("Alice"));
    await screen.findByText("CHANGE TIER");
    fireEvent.click(screen.getByRole("button", { name: "View as — read-only" }));
    const openBtn = screen.getByRole("button", { name: "Open read-only view" });
    expect(openBtn).toBeDisabled();   // no reason yet
    fireEvent.change(screen.getByPlaceholderText(/Reason/i), { target: { value: "missing portfolio report" } });
    fireEvent.click(screen.getByRole("button", { name: "Open read-only view" }));
    await waitFor(() => expect(viewUserAsAdmin).toHaveBeenCalledWith("u1", "missing portfolio report"));
    expect(await screen.findByText("READ-ONLY")).toBeInTheDocument();
    expect(screen.getByText(/long-term store of value/)).toBeInTheDocument();   // the mock thesis
  });

  it("ADMIN-5: a manager does NOT see the owner-only view-as control", async () => {
    getAdminRole.mockResolvedValueOnce("manager");
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(await screen.findByText("Alice"));
    await screen.findByText("CHANGE TIER");
    expect(screen.queryByRole("button", { name: "View as — read-only" })).toBeNull();
  });

  it("ADMIN-5: opening a user loads their private note; saving it calls saveUserNote", async () => {
    getUserNote.mockResolvedValueOnce({ note: "VIP customer", updatedAt: 123, updatedByEmail: "admin@test.com" });
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(await screen.findByText("Alice"));
    await screen.findByText("CHANGE TIER");
    const ta = await screen.findByPlaceholderText(/Support context/i);
    await waitFor(() => expect(ta.value).toBe("VIP customer"));
    fireEvent.change(ta, { target: { value: "VIP customer — call back" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    await waitFor(() => expect(saveUserNote).toHaveBeenCalledWith("u1", "VIP customer — call back"));
  });

  it("ADMIN-5: the announcement editor saves an active notice in the config payload", async () => {
    render(<AdminDashboard />);
    await waitFor(() => expect(getAdminConfig).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: /Settings/i }));
    fireEvent.click(await screen.findByText("Announcement banner"));
    fireEvent.change(await screen.findByPlaceholderText(/Scheduled maintenance/i), { target: { value: "Heads up: maintenance tonight" } });
    fireEvent.click(screen.getByText("Show the banner").closest(".ctrl-line").querySelector('input[role="switch"]'));
    fireEvent.click(screen.getByRole("button", { name: "Save announcement" }));
    await waitFor(() => expect(saveConfig).toHaveBeenCalled());
    const payload = saveConfig.mock.calls.at(-1)[0];
    expect(payload.announcement.text).toBe("Heads up: maintenance tonight");
    expect(payload.announcement.active).toBe(true);
  });

  /* ═══ ADMIN-UI-1/2 — unified chrome (single sticky bar + a persistent H1) ═══
     The founder reported the two brand headers overlapping. There must now be
     exactly ONE bar; the "Admin dashboard" H1 is constant across tabs and drill-ins;
     and the signed-in email + Log out live in the bar (passed from admin-main.jsx). */

  it("ADMIN-UI: renders exactly one sticky top bar with the brand, email + a persistent H1", async () => {
    render(<AdminDashboard email="admin@test.com" onSignOut={() => {}} />);
    expect(document.querySelectorAll(".adm-bar")).toHaveLength(1);            // the overlap is gone
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();          // email in the bar
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Admin dashboard" })).toBeInTheDocument();
  });

  it("ADMIN-UI: the 'Admin dashboard' H1 persists on a drill-in, alongside a back button", async () => {
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(await screen.findByText("Alice"));
    await screen.findByText("CHANGE TIER");                                  // inside the user drill-in
    expect(screen.getByRole("heading", { name: "Admin dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("ADMIN-UI: Log out calls the handler passed down from the admin shell", async () => {
    const onSignOut = vi.fn();
    render(<AdminDashboard email="admin@test.com" onSignOut={onSignOut} />);
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    expect(onSignOut).toHaveBeenCalled();
  });

  /* ═══ ADMIN-UI-3 — mockup-match refinements (2026-07-25) ═══
     A second founder pass: equal-height Overview cards + the Tier Breakdown bar
     segment and its legend label sharing ONE colour per tier (Pro used to drift —
     bar #0a6b4d vs legend --accent-ink). Both now read TIERS[key].bar. */

  it("ADMIN-UI-3: the Pro tier's bar segment and its legend label are one colour (no drift)", async () => {
    // getStats mock: free 3 / pro 1 / premium 1 → all three segments render.
    render(<AdminDashboard />);
    await screen.findByText("Tier Breakdown");
    // Segments AND legend spans both render in tier order: free, pro, premium.
    const proSeg = document.querySelectorAll(".adm-tierbar .seg")[1];
    const proLegend = within(document.querySelector(".adm-legend")).getByText(/^Pro \(/);
    // Both are driven from TIERS.pro.bar, so the fill and the label can never diverge.
    // Pro was realigned to the existing --accent-ink token (no new hex).
    expect(proSeg.style.background).toBe("var(--accent-ink)");
    expect(proLegend.style.color).toBe("var(--accent-ink)");
    expect(proSeg.style.background).toBe(proLegend.style.color);
  });

  it("ADMIN-UI-3: the three Overview cards share the equal-height row class", async () => {
    render(<AdminDashboard />);
    await screen.findByText("Tier Breakdown");
    // `.adm-ov` (admin-only) stretches the shared .grid-auto row to equal height —
    // the shared class itself stays align-items:start for the user app's grid.
    const row = document.querySelector(".grid-auto.adm-ov");
    expect(row).toBeTruthy();
    expect(row.querySelectorAll(":scope > .card")).toHaveLength(3);   // revenue · usage · tiers
  });

  /* ═══ ADMIN-UI-4 — visible bordered back box + divided header on every second-screen ═══
     The ‹ back control was already in the DOM but rendered as a bare borderless chevron
     (app.css styles .icon-btn as background:none;border:0;padding:0). Every drill-in is
     now a DScreen: one card whose divided header (.adm-scr-head) carries a bordered ‹ box
     + the title ONCE. The old bare DHead (.detail-head) is retired. */

  it("ADMIN-UI-4: a Settings drill-in is a DScreen — bordered header, back box, title once, no bare DHead", async () => {
    render(<AdminDashboard />);
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    fireEvent.click(await screen.findByText("API keys", { selector: ".sr-label" }));
    const head = document.querySelector(".adm-scr-head");
    expect(head).toBeTruthy();
    expect(within(head).getByRole("button", { name: "Back" })).toBeInTheDocument();   // the ‹ box
    expect(within(head).getByText("API keys")).toBeInTheDocument();                   // title, in the header
    expect(document.querySelectorAll(".detail-head")).toHaveLength(0);                // old bare DHead retired
  });

  it("ADMIN-UI-4: the user-detail drill-in is also a DScreen with the bordered header", async () => {
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    fireEvent.click(await screen.findByText("Alice"));
    await screen.findByText("CHANGE TIER");
    const head = document.querySelector(".adm-scr-head");
    expect(head).toBeTruthy();
    expect(within(head).getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(document.querySelectorAll(".detail-head")).toHaveLength(0);
  });

  /* ═══ ADMIN-UI-5 — match the mockup's SIZE (Overview bigger, Settings smaller) ═══
     The Overview grows to the mockup scale via a .adm-ov-screen wrapper that scopes the
     size bumps to Overview only — .adm-mini is also used in the user-detail drill-in, so
     a global bump would have enlarged that too. */

  it("ADMIN-UI-5: the Overview content is wrapped in the size-scoping .adm-ov-screen", async () => {
    render(<AdminDashboard />);
    await screen.findByText("Tier Breakdown");
    const scope = document.querySelector(".adm-ov-screen");
    expect(scope).toBeTruthy();
    // the stat tiles + the equal-height card row live inside it, so the CSS size bumps apply
    expect(scope.querySelector(".adm-stat")).toBeTruthy();
    expect(scope.querySelector(".grid-auto.adm-ov")).toBeTruthy();
  });
});
