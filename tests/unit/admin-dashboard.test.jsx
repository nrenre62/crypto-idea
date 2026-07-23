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
    { uid: "u1", email: "alice@test.com", name: "Alice", tier: "free", disabled: false, portfolioCount: 1 },
  ])),
  listAudit: vi.fn(() => Promise.resolve([])),
  lookupUser: vi.fn(() => Promise.resolve(
    { uid: "u1", email: "alice@test.com", name: "Alice", tier: "free", disabled: false, portfolioCount: 1, coinCount: 3 },
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
import { getStats, getAdminConfig, listUsers, listAudit, deleteUser, setManagerRole, adminTrashUser, adminSignOutUser, lookupUser, saveConfig } from "../../src/api/admin.js";
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
});
