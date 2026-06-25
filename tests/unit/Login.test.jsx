import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppContext } from "../../src/hooks/app-context.js";
import { Login } from "../../src/components/Login.jsx";

// Login holds the auth form, the post-registration plan picker, and the upgrade/
// billing flow (showPlan). The smoke test covers the basic logged-out form; here we
// exercise the branches + lock the auth-error color fix, in isolation.
const base = {
  showPlan: false, showWelcome: null, upgradeStep: "billing", setUpgradeStep: vi.fn(),
  upgradeFlow: null, setUpgradeFlow: vi.fn(), setShowPlan: vi.fn(), setShowWelcome: vi.fn(),
  upgradeBilling: "yearly", setUpgradeBilling: vi.fn(), user: { name: "Tester", tier: "free" },
  setUser: vi.fn(), saveProfile: vi.fn(), calcEndDate: vi.fn(), setScreen: vi.fn(),
  authMode: "login", setAuthMode: vi.fn(), authErr: "", setAuthErr: vi.fn(),
  authName: "", setAuthName: vi.fn(), authEmail: "", setAuthEmail: vi.fn(),
  authPass: "", setAuthPass: vi.fn(), handleAuth: vi.fn(), site: { signupsEnabled: true },
  authAgreeTerms: false, setAuthAgreeTerms: vi.fn(),
  authAgreePrivacy: false, setAuthAgreePrivacy: vi.fn(),
  authAgreeMarketing: false, setAuthAgreeMarketing: vi.fn(),
};
const provide = (value) =>
  render(<AppContext.Provider value={{ ...base, ...value }}><Login /></AppContext.Provider>);

describe("Login screen (extracted, via AppContext)", () => {
  it("renders the login form by default", () => {
    provide({});
    expect(screen.getByText(/Know why you own every coin/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("name@email.com")).toBeInTheDocument();
  });

  it("disables registration and shows a notice when signups are paused", () => {
    provide({ site: { signupsEnabled: false } });
    expect(screen.getByText(/New signups are paused/i)).toBeInTheDocument();
    expect(screen.getByText("Register")).toBeDisabled();
  });

  it("shows required Terms/Privacy + optional marketing consent in register mode (U2/C1)", () => {
    provide({ authMode: "register" });
    expect(screen.getByText(/I agree to the/i)).toBeInTheDocument();
    expect(screen.getByText("Terms of Service")).toHaveAttribute("href", "/terms.html");
    expect(screen.getByText("Privacy Policy")).toHaveAttribute("href", "/privacy.html");
    expect(screen.getByText(/product updates/i)).toBeInTheDocument();
    // Three checkboxes (terms, privacy, marketing).
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("renders the auth error in red (regression: was c.rd, undefined)", () => {
    provide({ authErr: "Invalid credentials" });
    const err = screen.getByText("Invalid credentials");
    expect(err).toHaveStyle({ color: "#FF3B30" });
  });

  it("renders the Pro billing step with monthly/yearly options", () => {
    provide({ showPlan: true, upgradeStep: "billing", upgradeFlow: "pro" });
    expect(screen.getByText("Monthly")).toBeInTheDocument();
    expect(screen.getByText("Yearly")).toBeInTheDocument();
    expect(screen.getByText(/Back to plans/i)).toBeInTheDocument();
  });

  it("renders the post-registration plan picker", () => {
    provide({ showPlan: true, upgradeStep: "pickPlan", upgradeFlow: null });
    expect(screen.getByText("Select a plan")).toBeInTheDocument();
    expect(screen.getByText("Choose Pro")).toBeInTheDocument();
    expect(screen.getByText("Choose Premium")).toBeInTheDocument();
  });
});
