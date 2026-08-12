import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AppContext } from "../../src/hooks/app-context.js";
import { Login } from "../../src/components/Login.jsx";

// Plan B PR-B: the buy button calls the real createSubscription callable (server picks
// the plan by tier × cycle and returns a PayPal approvalUrl). Mock the api seam so the
// checkout test never hits Firebase.
const { createSubscriptionMock } = vi.hoisted(() => ({ createSubscriptionMock: vi.fn() }));
vi.mock("../../src/api/billing.js", () => ({ createSubscription: createSubscriptionMock }));

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
  // AUTH-DUP (Part A): the in-flight busy flag that disables the submit button.
  authBusy: false,
  authAgreeTerms: false, setAuthAgreeTerms: vi.fn(),
  authAgreePrivacy: false, setAuthAgreePrivacy: vi.fn(),
  authAgreeMarketing: false, setAuthAgreeMarketing: vi.fn(),
  // R31-2: default to a user who HAS chosen a plan, so the existing picker tests exercise
  // the current-aware R28 picker; the forced-first-choice flow is tested with planChosen:false.
  // ONBOARD-GATE: the free choice now goes through the server (chooseFree), not markPlanChosen.
  planChosen: true, chooseFree: vi.fn(), choosingPlan: false,
};
const provide = (value) =>
  render(<AppContext.Provider value={{ ...base, ...value }}><Login /></AppContext.Provider>);

describe("Login screen (extracted, via AppContext)", () => {
  it("renders the login form by default", () => {
    provide({});
    expect(screen.getByText(/Know why you own every coin/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@email.com")).toBeInTheDocument();
  });

  // LOGO (BUILD-LOOP item 4): the auth screen shows the large shared <Logo> (green
  // tile + "CryptoIdea"), replacing the old .auth-logo "Crypto Idea" text.
  it("shows the large unified <Logo>, tagline intact, and drops the old .auth-logo", () => {
    const { container } = provide({});
    const logo = container.querySelector(".ci-logo.lg");
    expect(logo).toBeTruthy();
    expect(logo.querySelector(".ci-logo-word").textContent).toBe("CryptoIdea");
    expect(container.querySelector(".auth-logo")).toBeNull();
    expect(screen.getByText(/Know why you own every coin/i)).toBeInTheDocument();
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

    it("R31-2: a NEW user (planChosen:false) is FORCED to choose — no CURRENT, no skip, 'Choose Starter'", () => {
      const chooseFree = vi.fn();
      provide({ showPlan: true, upgradeStep: "pickPlan", planChosen: false, user: { name: "T", tier: "free" }, chooseFree });
      // No pre-chosen CURRENT badge; all three cards actionable.
      expect(screen.queryByText("CURRENT")).toBeNull();
      expect(screen.getByText("Choose Starter")).toBeInTheDocument();
      expect(screen.getByText("Choose Pro")).toBeInTheDocument();
      expect(screen.getByText("Choose Premium")).toBeInTheDocument();
      // No escape from the forced choice.
      expect(screen.queryByText(/Continue with Starter/)).toBeNull();
      expect(screen.queryByText("Close")).toBeNull();
      // ONBOARD-GATE: choosing Starter goes through the SERVER (chooseFree records the choice,
      // creates the default portfolio, then shows the welcome). Login just invokes it.
      fireEvent.click(screen.getByText("Choose Starter").closest(".plan-card"));
      expect(chooseFree).toHaveBeenCalled();
    });

    it("ONBOARD-GATE: the Starter card shows 'Setting up…' while the choice is in flight", () => {
      const chooseFree = vi.fn();
      provide({ showPlan: true, upgradeStep: "pickPlan", planChosen: false, choosingPlan: true,
                user: { name: "T", tier: "free" }, chooseFree });
      // The busy label replaces the CTA, and a re-click is a no-op while in flight.
      expect(screen.getByText("Setting up…")).toBeInTheDocument();
      expect(screen.queryByText("Choose Starter")).toBeNull();
      fireEvent.click(screen.getByText("Setting up…").closest(".plan-card"));
      expect(chooseFree).not.toHaveBeenCalled();
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
      expect(screen.getByText(/3 portfolios · 30 coins per portfolio · 300 transactions per coin/)).toBeInTheDocument();
      expect(screen.getByText(/15 portfolios · 200 coins per portfolio · 2,000 transactions per coin/)).toBeInTheDocument();
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

  // ── AUTH-DUP (Part A): the submit button reflects the in-flight lock — disabled with a
  //    busy label while authBusy, so a rapid second click / Enter can't fire again. ──
  describe("AUTH-DUP Part A — in-flight submit button", () => {
    it("register: enabled 'Create Account' when idle, disabled 'Creating account…' when busy", () => {
      const { rerender } = render(
        <AppContext.Provider value={{ ...base, authMode: "register", authBusy: false }}><Login /></AppContext.Provider>
      );
      let btn = screen.getByRole("button", { name: "Create Account" });
      expect(btn).not.toBeDisabled();
      rerender(<AppContext.Provider value={{ ...base, authMode: "register", authBusy: true }}><Login /></AppContext.Provider>);
      btn = screen.getByRole("button", { name: "Creating account…" });
      expect(btn).toBeDisabled();
      expect(screen.queryByRole("button", { name: "Create Account" })).toBeNull();
    });

    it("login: disabled 'Logging in…' while busy", () => {
      const { container } = provide({ authMode: "login", authBusy: true });
      const btn = screen.getByRole("button", { name: "Logging in…" });
      expect(btn).toBeDisabled();
      // The submit button (not the mode-toggle) carries the busy label.
      expect(container.querySelector(".btn-primary").textContent).toBe("Logging in…");
    });
  });

  /* CRYP-101 — LAUNCH-FREE Part B. When paid plans are switched off site-wide
     (site.paidPlansEnabled === false), the plan picker offers ONLY the Starter
     card — the Pro/Premium cards are not rendered at all (there is nothing to
     buy). With the flag on or absent the three-card picker is unchanged. */
  describe("CRYP-101 — launch-free plan picker", () => {
    it("CRYP-101: paid plans off → the picker shows ONLY Starter (no Pro/Premium cards)", () => {
      const { container } = provide({
        showPlan: true, upgradeStep: "pickPlan", planChosen: false,
        site: { signupsEnabled: true, paidPlansEnabled: false },
        user: { name: "T", tier: "free" },
      });
      // Starter is still there — a forced first choice must never be a dead end.
      expect(container.querySelector(".plan-card.starter")).toBeTruthy();
      expect(screen.getByText("Choose Starter")).toBeInTheDocument();
      // …but the paid cards are gone entirely.
      expect(container.querySelector(".plan-card.rec")).toBeNull();   // Pro
      expect(container.querySelector(".plan-card.prem")).toBeNull();  // Premium
      expect(screen.queryByText("Choose Pro")).toBeNull();
      expect(screen.queryByText("Choose Premium")).toBeNull();
    });

    it("CRYP-101: paid plans on/absent → all three plan cards render as today", () => {
      for (const site of [{ signupsEnabled: true, paidPlansEnabled: true }, { signupsEnabled: true }]) {
        const { container, unmount } = provide({
          showPlan: true, upgradeStep: "pickPlan", planChosen: false, site,
          user: { name: "T", tier: "free" },
        });
        expect(container.querySelector(".plan-card.rec"), JSON.stringify(site)).toBeTruthy();
        expect(container.querySelector(".plan-card.prem"), JSON.stringify(site)).toBeTruthy();
        expect(screen.getByText("Choose Pro")).toBeInTheDocument();
        expect(screen.getByText("Choose Premium")).toBeInTheDocument();
        unmount();
      }
    });
  });

  /* ── Plan B PR-B: the real PayPal checkout wiring. The buy button used to be a
     fake setTimeout that wrote the tier straight to localStorage; now PROD calls
     createSubscription and redirects to PayPal (tier is set server-side by the
     webhook + live-synced by watchUserDoc), while DEV keeps the emulator path
     (devSetMyTier). The invariant under test: no client tier write in prod. ── */
  describe("Plan B PR-B — real PayPal checkout (no client-forged tier)", () => {
    const billingCtx = (extra) => ({
      showPlan: true, upgradeStep: "billing", upgradeFlow: "pro", upgradeBilling: "yearly",
      user: { uid: "u1", name: "T", tier: "free" },
      setUpgradeStep: vi.fn(), setShowWelcome: vi.fn(), setUser: vi.fn(), saveProfile: vi.fn(),
      persistTierDev: vi.fn(), reloadPortfolios: vi.fn(), calcEndDate: vi.fn(() => "2027-01-01"),
      ...extra,
    });
    let assignSpy;
    const origLocation = window.location;
    beforeEach(() => {
      createSubscriptionMock.mockReset();
      // jsdom's window.location.assign isn't spyable (non-configurable), so replace the
      // whole location with a stub carrying a mock assign for the duration of each test.
      assignSpy = vi.fn();
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { assign: assignSpy, href: "http://localhost/", origin: "http://localhost" },
      });
    });
    afterEach(() => {
      Object.defineProperty(window, "location", { configurable: true, value: origLocation });
      vi.unstubAllEnvs();
    });
    const clickPay = () => fireEvent.click(screen.getByText(/Pay with/i).closest("button"));

    it("PROD: clicking Pay calls createSubscription({plan,billing}) and redirects to approvalUrl — NO client tier write", async () => {
      vi.stubEnv("DEV", false);
      createSubscriptionMock.mockResolvedValue({ approvalUrl: "https://www.paypal.com/approve/abc", subscriptionId: "S1" });
      const ctx = billingCtx();
      provide(ctx);
      clickPay();
      await waitFor(() => expect(createSubscriptionMock).toHaveBeenCalledWith({ plan: "pro", billing: "yearly" }));
      await waitFor(() => expect(assignSpy).toHaveBeenCalledWith("https://www.paypal.com/approve/abc"));
      // the webhook + watchUserDoc own the tier — the client must never write it in prod
      expect(ctx.setUser).not.toHaveBeenCalled();
      expect(ctx.saveProfile).not.toHaveBeenCalled();
      expect(ctx.persistTierDev).not.toHaveBeenCalled();
    });

    it("PROD: a failed createSubscription shows the server message and returns to the billing step (no redirect, no tier write)", async () => {
      vi.stubEnv("DEV", false);
      createSubscriptionMock.mockRejectedValue({ code: "functions/failed-precondition", message: "New subscriptions are paused right now." });
      const ctx = billingCtx();
      provide(ctx);
      clickPay();
      await waitFor(() => expect(screen.getByText(/paused right now/i)).toBeInTheDocument());
      expect(assignSpy).not.toHaveBeenCalled();
      expect(ctx.setUser).not.toHaveBeenCalled();
      expect(ctx.saveProfile).not.toHaveBeenCalled();
      expect(ctx.setUpgradeStep).toHaveBeenLastCalledWith("billing");   // back to the cycle step to retry
    });

    it("DEV: keeps the emulator path — persistTierDev sets the tier server-side, createSubscription is NOT called, no redirect", async () => {
      vi.stubEnv("DEV", true);
      const ctx = billingCtx();
      provide(ctx);
      clickPay();
      await waitFor(() => expect(ctx.persistTierDev).toHaveBeenCalledWith("pro"));
      expect(createSubscriptionMock).not.toHaveBeenCalled();
      expect(assignSpy).not.toHaveBeenCalled();
      await waitFor(() => expect(ctx.setShowWelcome).toHaveBeenCalledWith("pro"));   // welcome for the purchased tier
    });
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

  /* ADMIN-2 — the checkout kill-switch in the plan picker. The server refuses
     createSubscription regardless; this stops someone walking into a checkout that is
     already going to fail. */
  describe("ADMIN-2: checkout switched off", () => {
    const off = { signupsEnabled: true, features: { marketData: true, checkout: false, aiResearch: true } };

    it("marks the PAID cards unavailable and ignores clicks on them", () => {
      const setUpgradeFlow = vi.fn(), setUpgradeStep = vi.fn();
      provide({ showPlan: true, upgradeStep: "pickPlan", site: off, user: { name: "T", tier: "free" }, setUpgradeFlow, setUpgradeStep });
      expect(screen.getAllByText("Temporarily unavailable").length).toBe(2);   // Pro + Premium
      expect(screen.queryByText("Choose Pro")).toBeNull();
      expect(screen.queryByText("Choose Premium")).toBeNull();
      fireEvent.click(screen.getAllByText("Temporarily unavailable")[0].closest(".plan-card"));
      expect(setUpgradeFlow).not.toHaveBeenCalled();
    });

    it("leaves STARTER selectable, so a forced first choice is never a dead end", () => {
      // R31-2's forced picker has no skip link. If checkout-off locked all three cards,
      // a brand-new user would be trapped on this screen with nothing clickable.
      const chooseFree = vi.fn();
      provide({ showPlan: true, upgradeStep: "pickPlan", planChosen: false, site: off,
                user: { name: "T", tier: "free" }, chooseFree });
      expect(screen.queryByText(/Continue with Starter/)).toBeNull();   // still forced
      fireEvent.click(screen.getByText("Choose Starter").closest(".plan-card"));
      expect(chooseFree).toHaveBeenCalled();   // ONBOARD-GATE: Starter goes through the server
    });

    it("leaves the cards alone for every not-switched-off shape", () => {
      for (const site of [{ signupsEnabled: true }, { signupsEnabled: true, features: {} }]) {
        const { unmount } = provide({ showPlan: true, upgradeStep: "pickPlan", site, user: { name: "T", tier: "free" } });
        expect(screen.getByText("Choose Pro"), JSON.stringify(site)).toBeInTheDocument();
        expect(screen.queryByText("Temporarily unavailable")).toBeNull();
        unmount();
      }
    });
  });
});
