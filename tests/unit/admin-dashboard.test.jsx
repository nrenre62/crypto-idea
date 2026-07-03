import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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
  setAdminClaim: vi.fn(() => Promise.resolve({ success: true })),
  adminTrashUser: vi.fn(() => Promise.resolve()),
  adminSignOutUser: vi.fn(() => Promise.resolve()),
}));

import AdminDashboard from "../../src/components/admin-dashboard.jsx";
import { getStats, getAdminConfig, listUsers, listAudit, deleteUser, setAdminClaim, adminTrashUser, adminSignOutUser } from "../../src/api/admin.js";

describe("admin-dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads stats + config on mount and shows the live overview", async () => {
    render(<AdminDashboard />);
    expect(getStats).toHaveBeenCalled();
    expect(getAdminConfig).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("Live Data")).toBeInTheDocument());
    expect(screen.getByText("Est. Monthly Revenue")).toBeInTheDocument();
    expect(screen.getByText("Plan Limits")).toBeInTheDocument();
  });

  it("renders all four tabs without crashing (lazy-loads users + audit)", async () => {
    render(<AdminDashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Users" }));
    await waitFor(() => expect(listUsers).toHaveBeenCalled());
    expect(screen.getByPlaceholderText(/Search email or name/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByText(/Email & Integrations/i)).toBeInTheDocument();

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

  it("BL-2a: grant admin is type-to-confirm — disabled until the email matches, then calls setAdminClaim", async () => {
    await openAlice();
    fireEvent.click(screen.getByRole("button", { name: "Make admin" }));
    const confirmBtn = screen.getByRole("button", { name: "Confirm grant" });
    expect(confirmBtn).toBeDisabled();                       // nothing typed yet
    fireEvent.change(screen.getByPlaceholderText("alice@test.com"), { target: { value: "wrong@x.com" } });
    expect(confirmBtn).toBeDisabled();                       // wrong email
    fireEvent.change(screen.getByPlaceholderText("alice@test.com"), { target: { value: "alice@test.com" } });
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(setAdminClaim).toHaveBeenCalledWith("alice@test.com", true));
  });

  it("BL-2b: move-to-trash is two-tap (arm, then confirm)", async () => {
    await openAlice();
    fireEvent.click(screen.getByRole("button", { name: "Move to trash" }));
    expect(adminTrashUser).not.toHaveBeenCalled();           // first tap only arms
    fireEvent.click(screen.getByRole("button", { name: "Confirm move to trash?" }));
    await waitFor(() => expect(adminTrashUser).toHaveBeenCalledWith("u1"));
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
    fireEvent.click(await screen.findByRole("button", { name: /Permanently delete 2\?/ }));
    await waitFor(() => expect(deleteUser).toHaveBeenCalledTimes(2));
    expect(deleteUser).toHaveBeenCalledWith("t1");
    expect(deleteUser).toHaveBeenCalledWith("t2");
  });

  it("BL-2d: Settings shows the reserved AI card with the Anthropic key field", async () => {
    render(<AdminDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
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
