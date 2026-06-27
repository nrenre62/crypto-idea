import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppContext } from "../../src/hooks/app-context.js";
import { Account } from "../../src/components/Account.jsx";

// Account is a drill-in settings list: a home view (identity + plan-usage summary +
// nav rows + inline digest/appearance controls) and detail views reached by clicking
// a nav row. We exercise it in isolation against the real AppContext; fmtDate is
// stubbed for stable assertions. `open()` drills into a detail view.
const base = {
  setScreen: vi.fn(), isPremium: false, isPro: false,
  portfolios: [{ id: "default", name: "My Portfolio", coins: [] }],
  maxPortfolios: 1, maxCoinsPerPort: 10, maxTxPerCoin: 50, aiMonthlyCents: 0, portfolio: [],
  startUpgrade: vi.fn(), startDowngrade: vi.fn(), fmtDate: () => "Jan 1, 2027",
  setActivePortId: vi.fn(), activePortId: "default", deletePortfolio: vi.fn(),
  newPortName: "", setNewPortName: vi.fn(), addPortfolio: vi.fn(),
  downloadMyData: vi.fn(), downloadCsv: vi.fn(), acctBusy: false, deleteMyAccount: vi.fn(),
  delConfirm: false, setDelConfirm: vi.fn(), acctMsg: "", logout: vi.fn(),
  delPass: "", setDelPass: vi.fn(), delType: "", setDelType: vi.fn(), cancelDelete: vi.fn(),
  pwCur: "", setPwCur: vi.fn(), pwNew: "", setPwNew: vi.fn(), pwMsg: "",
  changeMyPassword: vi.fn(), signOutEverywhere: vi.fn(),
  profName: "Free User", setProfName: vi.fn(), profMsg: "", saveDisplayName: vi.fn(),
  emNew: "", setEmNew: vi.fn(), emPass: "", setEmPass: vi.fn(), emMsg: "", requestEmailChange: vi.fn(),
  toggleSetting: vi.fn(),
  user: { name: "Free User", email: "free@test.com", tier: "free", joined: "2026-01-01", settings: {} },
};
const provide = (value) =>
  render(<AppContext.Provider value={{ ...base, ...value }}><Account /></AppContext.Provider>);
// Drill into a detail view by clicking its home nav row (matched by accessible name).
const open = (name) => fireEvent.click(screen.getByRole("button", { name }));

describe("Account screen (drill-in, via AppContext)", () => {
  // ── HOME ──
  it("home shows identity, a plan-usage summary, and the settings nav list", () => {
    provide({});
    expect(screen.getByText("Free User")).toBeInTheDocument();
    expect(screen.getByText("Plan usage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Profile/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plan & billing/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Privacy & data/ })).toBeInTheDocument();
  });

  it("calls logout from the Logout button (home)", () => {
    const logout = vi.fn();
    provide({ logout });
    fireEvent.click(screen.getByText("Logout"));
    expect(logout).toHaveBeenCalled();
  });

  it("toggles the email digest from the home pill switch (U8)", () => {
    const toggleSetting = vi.fn();
    provide({ toggleSetting });
    fireEvent.click(screen.getByRole("switch")); // the digest is the only switch on home
    expect(toggleSetting).toHaveBeenCalledWith("emailDigest", true);
  });

  it("renders the inline Appearance theme selector and persists the choice (U8)", () => {
    const toggleSetting = vi.fn();
    provide({ toggleSetting, user: { ...base.user, settings: { theme: "light" } } });
    expect(screen.getByText("Light")).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByText("Dark"));
    expect(toggleSetting).toHaveBeenCalledWith("theme", "dark");
  });

  // ── PLAN & BILLING detail ──
  it("Plan & billing: usage + Upgrade-to-Pro CTA for a free user", () => {
    provide({});
    open(/Plan & billing/);
    expect(screen.getByText("Your Plan Usage")).toBeInTheDocument();
    expect(screen.getByText("Upgrade to Pro")).toBeInTheDocument();
  });

  it("Plan & billing: AI allowance shows Offline for a free user (U9)", () => {
    provide({ aiMonthlyCents: 0 });
    open(/Plan & billing/);
    expect(screen.getByText("AI research / month")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("Plan & billing: server-authoritative AI budget for a paid tier (U9)", () => {
    provide({ isPro: true, aiMonthlyCents: 400, user: { ...base.user, tier: "pro" } });
    open(/Plan & billing/);
    expect(screen.getByText("≈ 400 analyses")).toBeInTheDocument();
    expect(screen.getByText(/\$4\/mo live-AI budget/)).toBeInTheDocument();
  });

  it("Plan & billing: renewal date for an active Pro subscription", () => {
    const fmtDate = vi.fn(() => "Jan 1, 2027");
    provide({ isPro: true, fmtDate, user: { ...base.user, tier: "pro", subscription: { endDate: "2027-01-01" } } });
    open(/Plan & billing/);
    expect(screen.getByText(/subscription renews on/i)).toBeInTheDocument();
    expect(fmtDate).toHaveBeenCalledWith("2027-01-01");
  });

  it("Plan & billing: no Update-payment-method link for a free user (U12/S9)", () => {
    provide({});
    open(/Plan & billing/);
    expect(screen.queryByText(/Update payment method/i)).not.toBeInTheDocument();
  });

  it("Plan & billing: links Update-payment to PayPal for a paid user (U12/S9)", () => {
    provide({ isPro: true, user: { ...base.user, tier: "pro" } });
    open(/Plan & billing/);
    const link = screen.getByText(/Update payment method/i);
    expect(link).toHaveAttribute("href", "https://www.paypal.com/myaccount/autopay/");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("Plan & billing: cancellation notice for a cancelled subscription", () => {
    provide({ isPro: true, user: { ...base.user, tier: "pro", subscription: { cancelled: true, endDate: "2027-01-01", downgradeTo: "free" } } });
    open(/Plan & billing/);
    expect(screen.getByText(/access ends on/i)).toBeInTheDocument();
  });

  // ── PROFILE detail ──
  it("Profile: editable name + change-email (U7)", () => {
    provide({});
    open(/Profile/);
    expect(screen.getByText("Display name")).toBeInTheDocument();
    expect(screen.getByText("Save name")).toBeDisabled(); // disabled while name is unchanged
    expect(screen.getByPlaceholderText("New email address")).toBeInTheDocument();
    expect(screen.getByText(/^Current:/)).toBeInTheDocument();
  });

  it("Profile: enables Save name when edited and wires the handler (U7)", () => {
    const saveDisplayName = vi.fn();
    provide({ profName: "New Name", saveDisplayName });
    open(/Profile/);
    const btn = screen.getByText("Save name");
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(saveDisplayName).toHaveBeenCalled();
  });

  // ── SECURITY detail ──
  it("Security: change-password fields + sign-out-everywhere (U6/S7)", () => {
    provide({});
    open(/Security/);
    expect(screen.getByPlaceholderText("Current password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/New password/i)).toBeInTheDocument();
    expect(screen.getByText("Save new password")).toBeDisabled();
    expect(screen.getByText("Sign out everywhere")).toBeInTheDocument();
  });

  it("Security: enables Save with both fields + wires sign-out-everywhere", () => {
    const signOutEverywhere = vi.fn();
    provide({ pwCur: "old", pwNew: "Newpass1!", signOutEverywhere });
    open(/Security/);
    expect(screen.getByText("Save new password")).not.toBeDisabled();
    fireEvent.click(screen.getByText("Sign out everywhere"));
    expect(signOutEverywhere).toHaveBeenCalled();
  });

  // ── PRIVACY & DATA detail ──
  it("Privacy & data: analytics + relocated marketing toggle wired to toggleSetting (U8)", () => {
    const toggleSetting = vi.fn();
    provide({ toggleSetting, user: { ...base.user, settings: { consentAnalytics: false, emailMarketing: true } } });
    open(/Privacy & data/);
    expect(screen.getByText("Allow product analytics")).toBeInTheDocument();
    expect(screen.getByText("Product updates & offers")).toBeInTheDocument();
    const switches = screen.getAllByRole("switch"); // [analytics, marketing] in this view
    fireEvent.click(switches[0]);
    expect(toggleSetting).toHaveBeenCalledWith("consentAnalytics", true);
  });

  it("Privacy & data: reveals the permanent-delete confirm after the first click", () => {
    const setDelConfirm = vi.fn();
    provide({ setDelConfirm });
    open(/Privacy & data/);
    fireEvent.click(screen.getByText("Delete my account"));
    expect(setDelConfirm).toHaveBeenCalledWith(true);
  });

  it("Privacy & data: requires password + type-DELETE before delete enables (U5/S6)", () => {
    provide({ delConfirm: true });
    open(/Privacy & data/);
    expect(screen.getByPlaceholderText("Your password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type DELETE to confirm")).toBeInTheDocument();
    expect(screen.getByText(/Yes, delete my account/i)).toBeDisabled();
  });

  it("Privacy & data: enables destructive delete once DELETE + password present", () => {
    provide({ delConfirm: true, delType: "DELETE", delPass: "secret" });
    open(/Privacy & data/);
    expect(screen.getByText(/Yes, delete my account/i)).not.toBeDisabled();
  });

  it("Privacy & data: Cancel backs out of the delete flow", () => {
    const cancelDelete = vi.fn();
    provide({ delConfirm: true, cancelDelete });
    open(/Privacy & data/);
    fireEvent.click(screen.getByText("Cancel"));
    expect(cancelDelete).toHaveBeenCalled();
  });
});
