import { render, screen, fireEvent, act } from "@testing-library/react";
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
  setActivePortId: vi.fn(), activePortId: "default", deletePortfolio: vi.fn(), startRename: vi.fn(),
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

  // CRYP-101 — LAUNCH-FREE Part B. With paid plans switched off site-wide
  // (site.paidPlansEnabled === false) a Starter/non-paid user has nothing to buy, so
  // the Upgrade CTA is hidden. A user already on a paid tier still gets the full
  // cancel/manage flow — turning off SALES must never trap an existing subscriber.
  it("CRYP-101: paid plans off → a Starter user sees NO Upgrade-to-Pro CTA", () => {
    provide({ site: { signupsEnabled: true, paidPlansEnabled: false } });
    open(/Plan & billing/);
    expect(screen.queryByText("Upgrade to Pro")).toBeNull();
    expect(screen.queryByText("Upgrade to Premium")).toBeNull();
  });

  it("CRYP-101: paid plans off → an existing Pro user still sees cancel + manage", () => {
    provide({
      isPro: true, site: { signupsEnabled: true, paidPlansEnabled: false },
      user: { ...base.user, tier: "pro" },
    });
    open(/Plan & billing/);
    // Managing/cancelling an existing subscription is ungated by the launch-free switch.
    expect(screen.getByText(/Cancel Pro · Switch to Starter/)).toBeInTheDocument();
    expect(screen.getByText(/Update payment method/i)).toBeInTheDocument();
  });

  // C-A4 (C6/C7, supersedes the U9 meter): users never see AI budget/usage numbers —
  // the row reads "Live" for every tier; usage + cost are admin-only.
  it("Plan & billing: AI reads Live with NO budget numbers — free tier (C-A4)", () => {
    provide({ aiMonthlyCents: 0 });
    open(/Plan & billing/);
    expect(screen.getByText("AI research")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.queryByText("Offline")).not.toBeInTheDocument();
    expect(screen.queryByText(/analyses/)).not.toBeInTheDocument();
  });

  it("Plan & billing: AI reads Live with NO budget numbers — paid tier (C-A4)", () => {
    provide({ isPro: true, aiMonthlyCents: 400, user: { ...base.user, tier: "pro" } });
    open(/Plan & billing/);
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.queryByText(/analyses/)).not.toBeInTheDocument();
    expect(screen.queryByText(/live-AI budget/)).not.toBeInTheDocument();
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

  // ── R29: Premium downgrade chooser + pending-state flexibility ──
  it("R29-1: Premium sees ONE Downgrade button that opens the chooser (no hard-wired Pro)", () => {
    const openDowngradeChooser = vi.fn();
    const startDowngrade = vi.fn();
    provide({ isPro: true, isPremium: true, openDowngradeChooser, startDowngrade,
      user: { ...base.user, tier: "premium" } });
    open(/Plan & billing/);
    expect(screen.queryByText("Downgrade to Pro")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Downgrade"));
    expect(openDowngradeChooser).toHaveBeenCalled();
    expect(startDowngrade).not.toHaveBeenCalled(); // the target is chosen in the popup, not here
  });

  it("R29-1: Pro keeps the single Cancel-to-Starter path (no chooser)", () => {
    const startDowngrade = vi.fn();
    const openDowngradeChooser = vi.fn();
    provide({ isPro: true, startDowngrade, openDowngradeChooser, user: { ...base.user, tier: "pro" } });
    open(/Plan & billing/);
    fireEvent.click(screen.getByText(/Cancel Pro · Switch to Starter/));
    expect(startDowngrade).toHaveBeenCalledWith("free");
    expect(openDowngradeChooser).not.toHaveBeenCalled();
  });

  it("R29-2: a pending Premium downgrade offers Keep-my-plan AND Change-downgrade-choice", () => {
    const keepPlan = vi.fn();
    const openDowngradeChooser = vi.fn();
    provide({ isPro: true, isPremium: true, keepPlan, openDowngradeChooser,
      user: { ...base.user, tier: "premium", subscription: { cancelled: true, endDate: "2027-01-01", downgradeTo: "pro" } } });
    open(/Plan & billing/);
    fireEvent.click(screen.getByText("Keep my plan"));
    expect(keepPlan).toHaveBeenCalled();
    fireEvent.click(screen.getByText("Change downgrade choice"));
    expect(openDowngradeChooser).toHaveBeenCalled();
  });

  it("R29-2: a pending Pro cancellation offers Keep-my-plan only (Starter is the only target)", () => {
    const keepPlan = vi.fn();
    provide({ isPro: true, keepPlan,
      user: { ...base.user, tier: "pro", subscription: { cancelled: true, endDate: "2027-01-01", downgradeTo: "free" } } });
    open(/Plan & billing/);
    expect(screen.getByText("Keep my plan")).toBeInTheDocument();
    expect(screen.queryByText("Change downgrade choice")).not.toBeInTheDocument();
  });

  // PR-C2 (future-start Pro pre-auth): the pending "Pro is scheduled/approved" confirmation must
  // read from subscription.scheduledPro (the real scheduled sub) — repointed from the now-inert
  // proApproved marker. With an APPROVED scheduledPro (and NO proApproved) the notice must confirm
  // the Pro sub is scheduled. RED today: Account.jsx only shows the "Pro payment approved ✓" line
  // when user.subscription.proApproved is set, so with scheduledPro alone no confirmation renders.
  // (Flagged wording — the client-builder matches this Pro-scheduled confirmation copy.)
  it("PR-C2: a pending Premium→Pro downgrade with an approved scheduledPro shows the Pro-scheduled confirmation", () => {
    const keepPlan = vi.fn();
    const openDowngradeChooser = vi.fn();
    provide({ isPro: true, isPremium: true, keepPlan, openDowngradeChooser,
      user: { ...base.user, tier: "premium", subscription: {
        cancelled: true, endDate: "2027-01-01", downgradeTo: "pro",
        scheduledPro: { subId: "I-PRO", billing: "monthly", startDate: "2027-01-01", approved: true },
      } } });
    open(/Plan & billing/);
    expect(screen.getByText(/access ends on/i)).toBeInTheDocument();   // the pending notice renders
    expect(screen.getByText(/Pro (payment approved|starts when|is scheduled|scheduled)/i)).toBeInTheDocument();
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

  // ── PORTFOLIOS detail: rename + delete confirm (R19-1/R19-2) ──
  const twoEmpty = { portfolios: [{ id: "a", name: "Alpha", coins: [] }, { id: "b", name: "Beta", coins: [] }], maxPortfolios: 3 };

  it("Portfolios: rename ✎ opens the shared dialog (startRename with the row id)", () => {
    const startRename = vi.fn();
    provide({ ...twoEmpty, startRename });
    open(/Portfolios/);
    fireEvent.click(screen.getAllByRole("button", { name: "Rename portfolio" })[0]);
    expect(startRename).toHaveBeenCalledWith("a");
  });

  it("Portfolios: an EMPTY portfolio deletes via two-tap trash → Remove", () => {
    const deletePortfolio = vi.fn();
    provide({ ...twoEmpty, deletePortfolio });
    open(/Portfolios/);
    fireEvent.click(screen.getAllByRole("button", { name: "Delete portfolio" })[0]); // arm
    expect(deletePortfolio).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Remove")); // confirm
    expect(deletePortfolio).toHaveBeenCalledWith("a");
  });

  it("Portfolios: a portfolio WITH coins opens a warning modal (no immediate delete)", () => {
    const deletePortfolio = vi.fn();
    provide({ portfolios: [{ id: "a", name: "Alpha", coins: [{ id: "btc" }, { id: "eth" }] }, { id: "b", name: "Beta", coins: [] }], maxPortfolios: 3, deletePortfolio });
    open(/Portfolios/);
    fireEvent.click(screen.getAllByRole("button", { name: "Delete portfolio" })[0]);
    expect(deletePortfolio).not.toHaveBeenCalled();
    expect(screen.getByText(/This portfolio has 2 coins/)).toBeInTheDocument();
    // R26: plural agreement for N coins — "their … theses"
    expect(screen.getByText(/their transactions and theses/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Delete anyway"));
    expect(deletePortfolio).toHaveBeenCalledWith("a");
  });

  // R27-4: billing shows the transparent cancel policy for paying tiers — cancel keeps
  // access until the paid period ends, no partial refunds (the built dueDowngrade model).
  it("R27-4: the billing view shows the no-partial-refunds caption for a Pro user", () => {
    provide({ isPro: true, user: { ...base.user, tier: "pro" } });
    open(/Plan & billing/);
    expect(screen.getByText(/Cancel anytime · access continues until your paid period ends · no partial refunds\./)).toBeInTheDocument();
  });

  it("R27-4: a free (Starter) user sees no cancel caption (nothing to cancel)", () => {
    provide({});
    open(/Plan & billing/);
    expect(screen.queryByText(/no partial refunds/)).toBeNull();
  });

  // R26: the warning is count-aware — 1 coin reads "its transactions and thesis"
  // (each coin has at most ONE thesis), never "their … theses".
  it("R26: a ONE-coin portfolio's warning reads 'its transactions and thesis'", () => {
    provide({ portfolios: [{ id: "a", name: "Alpha", coins: [{ id: "btc" }] }, { id: "b", name: "Beta", coins: [] }], maxPortfolios: 3 });
    open(/Portfolios/);
    fireEvent.click(screen.getAllByRole("button", { name: "Delete portfolio" })[0]);
    expect(screen.getByText(/This portfolio has 1 coin and all its transactions and thesis\./)).toBeInTheDocument();
    expect(screen.queryByText(/theses/)).toBeNull();
  });

  it("Portfolios: the empty-portfolio Remove pill auto-disarms after ~3s", () => {
    vi.useFakeTimers();
    try {
      provide({ ...twoEmpty });
      open(/Portfolios/);
      fireEvent.click(screen.getAllByRole("button", { name: "Delete portfolio" })[0]);
      expect(screen.getByText("Remove")).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(3100); });
      expect(screen.queryByText("Remove")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

// USER-SET-UI: every settings screen (the Account home AND every drill-in) is now ONE
// framed panel that mirrors the admin DScreen — a bordered card whose divided header
// carries a bordered ‹ back BOX and the title exactly once, then a body. ONE responsive
// design at every width (no desktop/mobile branch to mock: jsdom's default renders it).
describe("USER-SET-UI — framed settings panels (mirror admin DScreen, responsive)", () => {
  it("home is ONE framed .set-scr panel: divided header + Back box + body, title 'Account' once", () => {
    const { container } = provide({});
    const panel = container.querySelector(".set-scr");
    expect(panel).toBeInTheDocument();
    const head = panel.querySelector(".set-scr-head");
    expect(head).toBeInTheDocument();
    // the bordered ‹ back BOX is an icon-btn inside the header, labelled for a11y
    expect(head.querySelector("button.icon-btn")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    // title shown exactly once, in the header
    expect(screen.getAllByText("Account")).toHaveLength(1);
    expect(head.querySelector(".dh-title").textContent).toBe("Account");
    expect(panel.querySelector(".set-scr-body")).toBeInTheDocument();
  });

  it("the old floating .detail-head + plain-card home layout is fully replaced", () => {
    const { container } = provide({});
    expect(container.querySelector(".detail-head")).toBeNull();       // no floating header
    expect(container.querySelector(".card.acct-list")).toBeNull();    // list folded into a section
  });

  it.each([
    ["Profile"],
    ["Plan & billing"],
    ["Portfolios"],
    ["Security"],
    ["Privacy & data"],
  ])("drill-in %s renders a framed .set-scr panel titled once with a Back box", (title) => {
    const { container } = provide({});
    open(new RegExp(title)); // click the home nav row
    const panel = container.querySelector(".set-scr");
    expect(panel).toBeInTheDocument();
    const head = panel.querySelector(".set-scr-head");
    expect(head.querySelector("button.icon-btn")).toBeInTheDocument();
    expect(head.querySelector(".dh-title").textContent).toBe(title);
    expect(screen.getAllByText(title)).toHaveLength(1); // header only — never repeated in the body
  });

  it("the Back box returns from a drill-in to the home (title flips back to Account)", () => {
    provide({});
    open(/Profile/);
    expect(screen.getByText("Profile")).toBeInTheDocument(); // drill-in header title
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("Account")).toBeInTheDocument(); // home header title
  });

  it("Profile's two sub-blocks split by .set-scr-section dividers (replacing .acct-divider)", () => {
    const { container } = provide({});
    open(/Profile/);
    expect(container.querySelectorAll(".set-scr-section").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelector(".acct-divider")).toBeNull();
  });
});

// CRYP-102 (FLOATING-HEADER, decision #4): opening a settings drill-in resets the
// scroll to the top, so the new framed panel always starts at its header rather than
// inheriting the home view's scroll offset. Design-only; Account() gains a
// `useEffect(() => window.scrollTo(0, 0), [view])` so every home→detail transition
// jumps to the top of the panel.
describe("CRYP-102 — settings drill-in scroll-to-top", () => {
  it("CRYP-102: scrolls to the top when opening a settings drill-in", () => {
    const scrollSpy = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    try {
      provide({});
      scrollSpy.mockClear();          // ignore any mount-time scroll — assert the drill-in transition
      open(/Profile/);                // home → profile detail view (view state changes)
      expect(scrollSpy).toHaveBeenCalledWith(0, 0);
    } finally {
      scrollSpy.mockRestore();
    }
  });
});

// ── Plan B PR-C3b-client — seamless Premium re-subscribe (client half of C3b-server) ──
// C3b-server (merged) renamed the future-start marker to subscription.scheduledNext{tier}
// and added the resubscribePremium callable. This client half:
//   1. shows the "Re-subscribe to Premium" CTA ONLY in the plain-cancelled Premium state
//      (cancelled && NO scheduledNext). While a scheduledNext is pending, the user must
//      "Keep my plan" FIRST (drops the marker) before re-subscribing;
//   2. confirm-gates the CTA behind a monthly/yearly cycle picker whose confirm calls the
//      re-subscribe flow (a ctx handler) — replacing the current INERT startUpgrade("premium")
//      (startUpgrade no-ops while tier==="premium");
//   3. reads the marker tier-aware via `scheduledNext || scheduledPro` everywhere.
// Flagged wording (the client-builder matches these strings): the confirm modal shows a
// "Pay with" PayPal button; scheduledNext.tier "premium" shows a distinct
// "Premium re-subscription is scheduled" copy. Design note: the founder's test spec asserts
// the cycle picker appears in an ISOLATED Account render, so the confirm modal is rendered by
// Account (not a CryptoIdea-level modal like the downgrade chooser).
describe("Plan B PR-C3b-client — seamless Premium re-subscribe (Account)", () => {
  // A cancelled Premium subscriber; `sub` overrides the subscription marker per case.
  const cancelledPremium = (sub) => ({
    isPro: true, isPremium: true,
    user: { ...base.user, tier: "premium", subscription: { cancelled: true, endDate: "2027-01-01", ...sub } },
  });

  it("PR-C3b-client: a plain-cancelled Premium (no scheduledNext) shows the Re-subscribe-to-Premium CTA", () => {
    provide(cancelledPremium({ downgradeTo: "free" }));
    open(/Plan & billing/);
    expect(screen.getByText("Re-subscribe to Premium")).toBeInTheDocument();
  });

  it("PR-C3b-client: while a scheduledNext downgrade is pending, Re-subscribe is hidden and Keep-my-plan shows instead", () => {
    provide(cancelledPremium({ downgradeTo: "pro",
      scheduledNext: { tier: "pro", subId: "I-PRO", billing: "monthly", approved: true } }));
    open(/Plan & billing/);
    // Founder rule: a pending scheduledNext means "Keep my plan" first — no direct re-subscribe.
    expect(screen.queryByText("Re-subscribe to Premium")).toBeNull();
    expect(screen.getByText("Keep my plan")).toBeInTheDocument();
  });

  it("PR-C3b-client: clicking Re-subscribe opens a cycle-picker confirm modal whose confirm calls resubscribePremium (not the inert startUpgrade)", () => {
    const startUpgrade = vi.fn();
    const resubscribePremium = vi.fn();
    provide({ ...cancelledPremium({ downgradeTo: "free" }), startUpgrade, resubscribePremium });
    open(/Plan & billing/);
    fireEvent.click(screen.getByText("Re-subscribe to Premium"));
    // A confirm modal with a monthly/yearly cycle picker appears (mirrors the downgrade cycle modal).
    expect(screen.getByText("Monthly")).toBeInTheDocument();
    expect(screen.getByText("Yearly")).toBeInTheDocument();
    // Pick a cycle, then confirm via the PayPal button.
    fireEvent.click(screen.getByText("Yearly"));
    fireEvent.click(screen.getByRole("button", { name: /pay with/i }));
    // The re-subscribe flow runs with the chosen cycle — NOT the inert startUpgrade("premium").
    expect(resubscribePremium).toHaveBeenCalled();
    expect(JSON.stringify(resubscribePremium.mock.calls[0])).toContain("yearly");
    expect(startUpgrade).not.toHaveBeenCalled();
  });

  it("PR-C3b-client: a scheduledNext PRO downgrade shows the Pro-scheduled copy (scheduledNext reader shim)", () => {
    provide(cancelledPremium({ downgradeTo: "pro",
      scheduledNext: { tier: "pro", subId: "I-PRO", billing: "monthly", approved: true } }));
    open(/Plan & billing/);
    expect(screen.getByText(/Pro is scheduled/i)).toBeInTheDocument();
  });

  it("PR-C3b-client: a scheduledNext PREMIUM re-subscribe shows a distinct Premium-scheduled copy (tier-aware)", () => {
    provide(cancelledPremium({ downgradeTo: "free",
      scheduledNext: { tier: "premium", subId: "I-PREM", billing: "monthly", approved: true } }));
    open(/Plan & billing/);
    expect(screen.getByText(/premium re-?subscription is scheduled/i)).toBeInTheDocument();
    expect(screen.queryByText(/Pro is scheduled/i)).toBeNull(); // not the Pro copy
  });

  it("PR-C3b-client: a legacy scheduledPro marker still shows the Pro-scheduled copy (back-compat shim)", () => {
    provide(cancelledPremium({ downgradeTo: "pro",
      scheduledPro: { subId: "I-PRO", billing: "monthly", approved: true } }));
    open(/Plan & billing/);
    expect(screen.getByText(/Pro is scheduled/i)).toBeInTheDocument();
  });
});
