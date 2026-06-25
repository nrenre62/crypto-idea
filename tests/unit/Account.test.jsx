import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppContext } from "../../src/hooks/app-context.js";
import { Account } from "../../src/components/Account.jsx";

// Account renders many data-driven branches (subscription states) that are awkward
// to reach via live navigation, so we exercise them in isolation against the real
// AppContext. fmtDate is stubbed to a fixed string for stable assertions.
const base = {
  setScreen: vi.fn(), isPremium: false, isPro: false,
  portfolios: [{ id: "default", name: "My Portfolio", coins: [] }],
  maxPortfolios: 1, maxCoinsPerPort: 10, maxTxPerCoin: 50, portfolio: [],
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

describe("Account screen (extracted, via AppContext)", () => {
  it("renders profile, plan usage, and an Upgrade-to-Pro CTA for a free user", () => {
    provide({});
    expect(screen.getByText("Your Plan Usage")).toBeInTheDocument();
    expect(screen.getByText("Free User")).toBeInTheDocument();
    expect(screen.getByText("Upgrade to Pro")).toBeInTheDocument();
  });

  it("shows the renewal date for an active Pro subscription", () => {
    const fmtDate = vi.fn(() => "Jan 1, 2027");
    provide({
      isPro: true, fmtDate,
      user: { ...base.user, tier: "pro", subscription: { endDate: "2027-01-01" } },
    });
    expect(screen.getByText(/subscription renews on/i)).toBeInTheDocument();
    // the renewal date is formatted via fmtDate(endDate)
    expect(fmtDate).toHaveBeenCalledWith("2027-01-01");
  });

  it("shows the cancellation notice for a cancelled subscription", () => {
    provide({
      isPro: true,
      user: { ...base.user, tier: "pro", subscription: { cancelled: true, endDate: "2027-01-01", downgradeTo: "free" } },
    });
    expect(screen.getByText(/access ends on/i)).toBeInTheDocument();
  });

  it("reveals the permanent-delete confirm button after the first click", () => {
    const setDelConfirm = vi.fn();
    provide({ setDelConfirm });
    fireEvent.click(screen.getByText("Delete my account"));
    expect(setDelConfirm).toHaveBeenCalledWith(true);
  });

  it("requires password + type-DELETE before delete is enabled (U5/S6)", () => {
    provide({ delConfirm: true });
    expect(screen.getByPlaceholderText("Your password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type DELETE to confirm")).toBeInTheDocument();
    // The destructive button stays disabled until BOTH a password and "DELETE" are present.
    expect(screen.getByText(/Yes, delete my account/i)).toBeDisabled();
  });

  it("enables the destructive delete once DELETE is typed and a password is present", () => {
    provide({ delConfirm: true, delType: "DELETE", delPass: "secret" });
    expect(screen.getByText(/Yes, delete my account/i)).not.toBeDisabled();
  });

  it("Cancel backs out of the delete flow without deleting", () => {
    const cancelDelete = vi.fn();
    provide({ delConfirm: true, cancelDelete });
    fireEvent.click(screen.getByText("Cancel"));
    expect(cancelDelete).toHaveBeenCalled();
  });

  it("renders the Profile card: editable name + change-email (U7)", () => {
    provide({});
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Display name")).toBeInTheDocument();
    // Save name is disabled while the name is unchanged from the current profile name.
    expect(screen.getByText("Save name")).toBeDisabled();
    expect(screen.getByPlaceholderText("New email address")).toBeInTheDocument();
    expect(screen.getByText(/^Current:/)).toBeInTheDocument();
  });

  it("enables Save name when the name is edited and wires the handler (U7)", () => {
    const saveDisplayName = vi.fn();
    provide({ profName: "New Name", saveDisplayName });
    const btn = screen.getByText("Save name");
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(saveDisplayName).toHaveBeenCalled();
  });

  it("renders the Security card: change-password fields + sign-out-everywhere (U6/S7)", () => {
    provide({});
    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Current password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/New password/i)).toBeInTheDocument();
    // Save is gated until both password fields are filled.
    expect(screen.getByText("Save new password")).toBeDisabled();
    expect(screen.getByText("Sign out everywhere")).toBeInTheDocument();
  });

  it("enables Save once both password fields are present, and wires sign-out-everywhere", () => {
    const signOutEverywhere = vi.fn();
    provide({ pwCur: "old", pwNew: "Newpass1!", signOutEverywhere });
    expect(screen.getByText("Save new password")).not.toBeDisabled();
    fireEvent.click(screen.getByText("Sign out everywhere"));
    expect(signOutEverywhere).toHaveBeenCalled();
  });

  it("renders auto-save Notifications + analytics-consent toggles wired to toggleSetting (U8)", () => {
    const toggleSetting = vi.fn();
    provide({ toggleSetting, user: { ...base.user, settings: { emailDigest: false, emailMarketing: true, consentAnalytics: false } } });
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Weekly portfolio digest")).toBeInTheDocument();
    expect(screen.getByText("Allow product analytics")).toBeInTheDocument();
    const switches = screen.getAllByRole("switch");
    // Order: [digest, marketing, analytics]. Toggling the digest auto-saves it on.
    fireEvent.click(switches[0]);
    expect(toggleSetting).toHaveBeenCalledWith("emailDigest", true);
  });

  it("calls logout from the Logout button", () => {
    const logout = vi.fn();
    provide({ logout });
    fireEvent.click(screen.getByText("Logout"));
    expect(logout).toHaveBeenCalled();
  });
});
