import { render, screen, fireEvent } from "@testing-library/react";
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
    expect(screen.getByPlaceholderText("you@email.com")).toBeInTheDocument();
  });

  it("toggles password visibility with the eye button", () => {
    const { container } = provide({ authPass: "secret123" });
    const pw = container.querySelector(".pw-wrap .field-input");
    const eye = container.querySelector(".pw-eye");
    expect(pw.getAttribute("type")).toBe("password");
    fireEvent.click(eye);
    expect(pw.getAttribute("type")).toBe("text");
    fireEvent.click(eye);
    expect(pw.getAttribute("type")).toBe("password");
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

  // ── R28-1: current-plan awareness — the picker reads user.tier, locks the current
  //    tier (CURRENT badge + disabled "Your current plan"), keeps only true upgrades
  //    clickable, and shows lower tiers as non-purchasable "Included". ──
  describe("R28-1 — current-plan guard (no double-charge)", () => {
    it("free user: Starter is CURRENT + locked, Pro/Premium clickable, link reads 'Continue with Starter'", () => {
      const setUpgradeStep = vi.fn(), setShowWelcome = vi.fn();
      provide({ showPlan: true, upgradeStep: "pickPlan", user: { name: "T", tier: "free" }, setUpgradeStep, setShowWelcome });
      expect(screen.getByText("CURRENT")).toBeInTheDocument();
      expect(screen.getByText("Your current plan")).toBeInTheDocument();
      expect(screen.queryByText("Get Started")).toBeNull();
      expect(screen.getByText("Choose Pro")).toBeInTheDocument();
      expect(screen.getByText("Choose Premium")).toBeInTheDocument();
      expect(screen.getByText(/Continue with Starter/)).toBeInTheDocument();
      // clicking the LOCKED current card does nothing (no welcome re-entry)
      fireEvent.click(screen.getByText("Your current plan").closest(".plan-card"));
      expect(setUpgradeStep).not.toHaveBeenCalled();
      expect(setShowWelcome).not.toHaveBeenCalled();
    });

    it("pro user: Pro is CURRENT + locked (can't be charged twice), Premium clickable, Starter 'Included'", () => {
      const setUpgradeStep = vi.fn(), setUpgradeFlow = vi.fn();
      provide({ showPlan: true, upgradeStep: "pickPlan", user: { name: "T", tier: "pro" }, setUpgradeStep, setUpgradeFlow });
      expect(screen.getByText("CURRENT")).toBeInTheDocument();
      expect(screen.queryByText("RECOMMENDED")).toBeNull();   // CURRENT replaces it
      expect(screen.getByText("Your current plan")).toBeInTheDocument();
      expect(screen.queryByText("Choose Pro")).toBeNull();
      expect(screen.getByText("Included")).toBeInTheDocument();   // Starter, below Pro
      expect(screen.getByText("Choose Premium")).toBeInTheDocument();
      // clicking the locked Pro card must NOT enter billing (the double-charge bug)
      fireEvent.click(screen.getByText("Your current plan").closest(".plan-card"));
      expect(setUpgradeFlow).not.toHaveBeenCalled();
      expect(setUpgradeStep).not.toHaveBeenCalled();
      // Premium still upgrades
      fireEvent.click(screen.getByText("Choose Premium").closest(".plan-card"));
      expect(setUpgradeFlow).toHaveBeenCalledWith("premium");
    });

    it("premium user: Premium is CURRENT + locked; Pro AND Starter read 'Included'", () => {
      const setUpgradeFlow = vi.fn();
      provide({ showPlan: true, upgradeStep: "pickPlan", user: { name: "T", tier: "premium" }, setUpgradeFlow });
      expect(screen.getByText("Your current plan")).toBeInTheDocument();
      expect(screen.getAllByText("Included").length).toBe(2);
      expect(screen.queryByText("Choose Pro")).toBeNull();
      expect(screen.queryByText("Choose Premium")).toBeNull();
      fireEvent.click(screen.getAllByText("Included")[0].closest(".plan-card"));
      expect(setUpgradeFlow).not.toHaveBeenCalled();
    });
  });

  // ── R28-2: honest single-source copy — the cards and the welcome/success screen
  //    consume the SAME PLAN_BENEFITS, so they cannot drift. ──
  describe("R28-2 — PLAN_BENEFITS single source", () => {
    it("Premium promises 'priority email support' and NEVER the untrue 'Custom limits'", async () => {
      const { PLAN_BENEFITS } = await import("../../src/components/Login.jsx");
      expect(PLAN_BENEFITS.premium.feature).toMatch(/priority email support/);
      const all = JSON.stringify(PLAN_BENEFITS);
      expect(all).not.toMatch(/Custom limits/);
      expect(all).not.toMatch(/Priority support ·/);
    });

    it("the picker cards show each tier's limits + the honest feature line", () => {
      provide({ showPlan: true, upgradeStep: "pickPlan", user: { name: "T", tier: "free" } });
      expect(screen.getByText(/1 portfolio · 10 coins · 50 transactions per coin/)).toBeInTheDocument();
      expect(screen.getByText(/15 portfolios · 1,000 coins per portfolio · 5,000 transactions per coin/)).toBeInTheDocument();
      // all-features line on Starter/Pro; Premium adds the support promise
      expect(screen.getAllByText(/All features included — live prices, P\/L, Journal, Research, Learn/).length).toBe(2);
      expect(screen.getByText(/All features included \+ priority email support/)).toBeInTheDocument();
    });

    it("the welcome/success screen lists EXACTLY the bought tier's benefits (card-consistent)", async () => {
      const { PLAN_BENEFITS } = await import("../../src/components/Login.jsx");
      provide({ showPlan: true, upgradeStep: "welcome", showWelcome: "premium", user: { name: "T", tier: "premium" } });
      expect(screen.getByText(/Welcome to/)).toBeInTheDocument();
      for (const line of PLAN_BENEFITS.premium.limits) {
        expect(screen.getByText(line)).toBeInTheDocument();
      }
      expect(screen.getByText(PLAN_BENEFITS.premium.feature)).toBeInTheDocument();
      expect(screen.queryByText(/Custom limits/)).toBeNull();
    });
  });

  // The auth fields live in a <form> so pressing Enter (implicit submit) logs in —
  // not only clicking the button.
  it("submitting the auth form calls handleAuth (Enter-to-login)", () => {
    const handleAuth = vi.fn();
    const { container } = provide({ handleAuth, authEmail: "a@b.com", authPass: "secret123!" });
    const form = container.querySelector("form.auth-col");
    expect(form).toBeTruthy();
    fireEvent.submit(form);
    expect(handleAuth).toHaveBeenCalledTimes(1);
  });

  it("the mode-toggle buttons are type=button so they don't submit the form", () => {
    const handleAuth = vi.fn();
    const { container } = provide({ handleAuth });
    const toggles = container.querySelectorAll(".auth-toggle button");
    expect(toggles.length).toBe(2);
    toggles.forEach((b) => expect(b.getAttribute("type")).toBe("button"));
    fireEvent.click(toggles[0]);
    expect(handleAuth).not.toHaveBeenCalled();
  });
});
