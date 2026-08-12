/**
 * END-TO-END USER WALKTHROUGH
 *
 * Mounts the REAL app (Firebase/network mocked) as a logged-in user and clicks
 * through every user-facing function across all five tabs + overlays, asserting
 * each step renders without crashing and shows the expected content. This is the
 * automated stand-in for a manual "use every function and see what breaks" pass.
 *
 * Each `it` is one documented user flow.
 */
import { render, screen, fireEvent, within, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("firebase/functions", () => ({ httpsCallable: () => vi.fn() }));
vi.mock("../../src/api/firebase.config.js", () => ({ functions: {} }));
vi.mock("../../src/api/firebase-auth.js", () => ({
  onAuthChange: vi.fn(),
  registerUser: vi.fn(), loginUser: vi.fn(), logoutUser: vi.fn(), resetPassword: vi.fn(),
  verifyEmail: vi.fn(), confirmPassword: vi.fn(),
  changePassword: vi.fn().mockResolvedValue({ success: true }),
  passwordError: vi.fn(() => null), CONSENT_VERSION: "test",
  updateDisplayName: vi.fn().mockResolvedValue({ success: true, name: "X" }),
  changeEmail: vi.fn().mockResolvedValue({ success: true }),
  updateUserSettings: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("../../src/api/firebase-database.js", () => {
  const getCoins = vi.fn().mockResolvedValue({ success: true, coins: [] });
  return {
    watchPortfolios: vi.fn(() => () => {}),
    watchCoins: vi.fn(() => () => {}),
    watchUserDoc: vi.fn(() => () => {}),
    watchLearnProgress: vi.fn((uid, cb) => { cb({ success: false }); return () => {}; }),
    getPortfolios: vi.fn().mockResolvedValue({ success: true, portfolios: [] }),
    getCoins,
    // Part B (#12): non-active portfolios load via getCoinsMeta. Mirror getCoins so the
    // multi-portfolio walkthrough tests keep their per-portfolio data (each test configures
    // getCoins.mockResolvedValue and the delegation picks it up). The lazy-load read pattern
    // itself is unit-tested in useAuthSession.test.jsx.
    getCoinsMeta: vi.fn((...a) => getCoins(...a)),
    // ONBOARD-GATE: the default logged-in user has passed the plan gate (planChosen:true), so
    // the walkthrough exercises the app itself; paid-tier tests override this per-test below.
    getUserProfile: vi.fn().mockResolvedValue({ success: true, tier: "free", planChosen: true, settings: {} }),
    createPortfolio: vi.fn(), deletePortfolio: vi.fn(),
    addCoin: vi.fn().mockResolvedValue({ success: true }),
    removeCoin: vi.fn().mockResolvedValue({ success: true }),
    addTransaction: vi.fn(), updateTransaction: vi.fn(), deleteTransaction: vi.fn(),
    getLearnProgress: vi.fn().mockResolvedValue({ success: true, xp: 0, streak: 0, lastActivity: "", completedLessons: [] }),
    saveLearnProgress: vi.fn().mockResolvedValue({ success: true }),
  };
});
vi.mock("../../src/api/coingecko.js", () => ({
  fetchPrices: vi.fn().mockResolvedValue(null),
  searchCoins: vi.fn().mockResolvedValue(null),
  fetchHistory: vi.fn().mockResolvedValue(null),
  fetchTrending: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../src/api/config.js", () => ({ fetchSiteConfig: vi.fn().mockResolvedValue(null) }));

// Plan B PR-C1 — the downgrade/cancel handlers route through the REAL server callable
// (cancelSubscription) instead of forging a `subscription` marker into React state +
// localStorage. Mock the api seams so we can assert the callable is invoked with the
// right target and that no client-forged marker is written. (Same hoisted-vi.mock
// precedent as Login.test's createSubscription seam.)
// Plan B PR-C2 adds scheduleProDowngrade — a Premium→Pro downgrade schedules a REAL
// future-start Pro PayPal sub (server returns an approvalUrl the client redirects to),
// REPLACING PR-C1's cancelSubscription({downgradeTo:"pro"}) interim. Spy it so we can
// assert the client calls it (and no longer forges the cancel).
const { cancelSubscriptionMock, scheduleProDowngradeMock } = vi.hoisted(() => ({
  cancelSubscriptionMock: vi.fn(), scheduleProDowngradeMock: vi.fn(),
}));
vi.mock("../../src/api/billing.js", () => ({
  createSubscription: vi.fn(),
  cancelSubscription: cancelSubscriptionMock,
  scheduleProDowngrade: scheduleProDowngradeMock,
}));
// account.js keeps its real functions (devSetMyTier/reconcileMyCounters/chooseFreePlan are
// harmlessly no-op'd through the already-mocked httpsCallable, exactly as before) but the
// reactivate/resolve wrappers become assertable spies so PR-C1's "finish the job"
// (keepPlan/declineProRecheckout still call the server but no longer saveProfile) can be pinned.
const { reactivateMock, resolveMock } = vi.hoisted(() => ({ reactivateMock: vi.fn(), resolveMock: vi.fn() }));
vi.mock("../../src/api/account.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, reactivateSubscription: reactivateMock, resolveRecheckout: resolveMock };
});

import { onAuthChange } from "../../src/api/firebase-auth.js";
import { getPortfolios, getCoins, getUserProfile, addTransaction } from "../../src/api/firebase-database.js";
import { db } from "../../src/utils/storage.js";
import CryptoIdea from "../../src/CryptoIdea.jsx";
import { PLAN_BENEFITS } from "../../src/components/Login.jsx";

// R27-3: simulate a desktop viewport — matches ONLY the min-width query (prefers-color-
// scheme etc. stay false so the theme is untouched). Delete window.matchMedia to restore.
const mmDesktop = (q) => ({
  matches: q.includes("min-width"), media: q,
  addEventListener: () => {}, removeEventListener: () => {},
  addListener: () => {}, removeListener: () => {},
});

const loginAs = (email = "free@test.com", name = "Free") =>
  onAuthChange.mockImplementation((cb) => { cb({ uid: "u1", email, displayName: name }); return () => {}; });

// The bottom nav: click a tab by its visible label.
const tab = (label) => fireEvent.click(screen.getByText(label));

describe("User walkthrough — all functions", () => {
  // localStorage.clear(): the uid-keyed profile cache (ci-profile-u1) persists across
  // tests — a completed fake upgrade in one test would leak tier:"pro" into the next.
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it("1. Logged-out: login screen renders", async () => {
    onAuthChange.mockImplementation((cb) => { cb(null); return () => {}; });
    render(<CryptoIdea />);
    expect(await screen.findByText(/Know why you own every coin/i)).toBeInTheDocument();
  });

  it("2. Portfolio tab: header, BETA badge, empty state", async () => {
    loginAs();
    render(<CryptoIdea />);
    expect(await screen.findByText(/My Assets/i)).toBeInTheDocument();
    expect(screen.getByText("No coins yet")).toBeInTheDocument();
    // BETA badge present on the Portfolio header
    expect(screen.getAllByText("BETA").length).toBeGreaterThan(0);
  });

  it("3. Research tab: renders without crashing", async () => {
    loginAs();
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    tab("Research");
    // Research sub-nav (Overview/Coins/Ask) appears once the tab mounts.
    expect(await screen.findByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Coins")).toBeInTheDocument();
    expect(screen.getByText("Ask")).toBeInTheDocument();
  });

  it("4. Journal tab: empty state + design shell", async () => {
    loginAs();
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    tab("Journal");
    // R13-2: the "Write before you buy." sub-title was removed; assert the empty state.
    expect(await screen.findByText("Your journal is empty")).toBeInTheDocument();
    expect(screen.getByText("Add your first coin →")).toBeInTheDocument();
  });

  it("5. Learn tab: modules render, lesson overlay opens, select + Submit completes the quiz", async () => {
    loginAs();
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    tab("Learn");
    expect(await screen.findByText(/XP to Level/)).toBeInTheDocument();
    expect(screen.getByText("Reading the Fundamentals")).toBeInTheDocument();
    // Open the lesson overlay via Today's lesson
    fireEvent.click(screen.getByText("Start lesson"));
    expect(await screen.findByText("The key insight")).toBeInTheDocument();
    // R11-Q: select the correct option (neutral highlight), then Submit to complete.
    const correct = screen.getByText("More people are buying it right now");
    fireEvent.click(correct);
    expect(correct.closest(".quiz-opt").className).toContain("selected");
    fireEvent.click(screen.getByText("Submit"));
    expect(await screen.findByText(/Correct — lesson complete/)).toBeInTheDocument();
  });

  it("6. Search tab: search a coin, Buy-Journal overlay appears, add it, lands on Portfolio", async () => {
    loginAs();
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    tab("Search");
    expect(await screen.findByText("Trending")).toBeInTheDocument();   // DP-6 empty-state list
    // Type a top-coin query -> local result appears
    fireEvent.change(screen.getByPlaceholderText(/Search any coin/i), { target: { value: "bitcoin" } });
    const result = await screen.findByText("Bitcoin");
    // Click the "+ Add" pill in that result row
    const row = result.closest(".trend-item");
    fireEvent.click(within(row).getByText("+ Add"));
    // Buy-Journal overlay appears ("write before you buy")
    expect(await screen.findByText(/Before you add Bitcoin/i)).toBeInTheDocument();
    expect(screen.getByText("Why are you buying this?")).toBeInTheDocument();
    // Fill BOTH required questions (§J3) and save
    const areas = document.querySelectorAll(".journal-q textarea");
    fireEvent.change(areas[0], { target: { value: "Hard cap, real adoption." } });
    fireEvent.change(areas[1], { target: { value: "Adoption stalls or supply cap changes." } });
    fireEvent.click(screen.getByText(/Save to Journal/i));
    await new Promise((r) => setTimeout(r, 50)); // addCoin is async (awaits dbAddCoin)
    // addCoin -> back to Portfolio with Bitcoin held
    expect(await screen.findByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByText(/My Assets/i)).toBeInTheDocument();
  });

  it("7. Real holding (seeded): Portfolio value, Research conviction pills, coin detail", async () => {
    loginAs();
    // Seed one portfolio with a held coin (a real buy transaction -> amount > 0).
    getPortfolios.mockResolvedValue({ success: true, portfolios: [{ id: "p1", name: "Main" }] });
    getCoins.mockResolvedValue({
      success: true,
      coins: [{ id: "bitcoin", symbol: "BTC", name: "Bitcoin", thumb: "", entries: [{ id: "e1", type: "buy", amount: 0.5, priceAtBuy: 40000, date: "2025-01-01" }] }],
    });
    render(<CryptoIdea />);
    // Portfolio shows the seeded holding
    expect(await screen.findByText("Bitcoin")).toBeInTheDocument();
    // Research -> Coins -> the conviction rubric pills render (mock evidence, A8);
    // the #26 funnel<->signals bridge note replaced the old "coming soon" placeholder.
    tab("Research");
    fireEvent.click(await screen.findByText("Coins"));
    expect(await screen.findByText(/you apply 3–5/)).toBeInTheDocument();
    expect(screen.getByText("Dev")).toBeInTheDocument();
    expect(screen.getByText("Community")).toBeInTheDocument();
    // Back to portfolio, open the coin -> a detail/info screen renders without crashing
    tab("Portfolio");
    fireEvent.click(await screen.findByText("Bitcoin"));
    expect((await screen.findAllByText(/Bitcoin/i)).length).toBeGreaterThan(0);
  });

  it("8. Account screen: plan usage + privacy section", async () => {
    loginAs();
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    fireEvent.click(screen.getByText("STARTER")); // plan badge -> Account
    // Account is a drill-in list: home shows the plan-usage summary + nav rows.
    expect(await screen.findByText("Plan usage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Privacy & data/ })).toBeInTheDocument();
  });

  // R25 — Coin info is an OVERLAY over the current tab (not a Portfolio drill-in):
  // opening from Search keeps you on Search; the X returns to where you were.
  it("R25: a coin icon opens the Coin-info overlay over the CURRENT tab; X returns there", async () => {
    loginAs();
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    tab("Search");
    await screen.findByText("Trending");
    // click the first trending coin's icon (the shared CoinIcon)
    fireEvent.click(document.querySelectorAll(".trend-card .coin-ic")[0]);
    expect(await screen.findByText("Market Data")).toBeInTheDocument();
    // close → back on Search (no jump to Portfolio)
    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByText("Market Data")).toBeNull();
    expect(screen.getByText("Trending")).toBeInTheDocument();
    expect(screen.queryByText(/My Assets/i)).toBeNull();   // did NOT jump to Portfolio
  });

  // R25 (review follow-up) — on DESKTOP, CoinInfo opened from the Detail header icon
  // STACKS above the Detail popup (both Modals mounted; CoinInfo rendered last).
  it("R25: desktop — CoinInfo stacks above the Detail popup; closing it keeps Detail open", async () => {
    window.matchMedia = mmDesktop;
    try {
      loginAs();
      getPortfolios.mockResolvedValue({ success: true, portfolios: [{ id: "p1", name: "Main" }] });
      getCoins.mockResolvedValue({
        success: true,
        coins: [{ id: "bitcoin", symbol: "BTC", name: "Bitcoin", thumb: "", entries: [{ id: "e1", type: "buy", amount: 1, priceAtBuy: 100, date: "2025-01-01" }] }],
      });
      render(<CryptoIdea />);
      await screen.findByText(/My Assets/i);
      fireEvent.click(document.querySelector(".asset-card"));   // → Detail Modal (desktop)
      await waitFor(() => expect(document.querySelectorAll(".cm-card").length).toBe(1));
      fireEvent.click(document.querySelector(".ph-icon .coin-ic"));   // Detail header icon → CoinInfo
      await waitFor(() => expect(document.querySelectorAll(".cm-card").length).toBe(2)); // stacked
      const cards = document.querySelectorAll(".cm-card");
      expect(within(cards[1]).getByText("Market Data")).toBeInTheDocument(); // CoinInfo is the LAST (top) modal
      // closing CoinInfo keeps the Detail popup open underneath
      fireEvent.click(within(cards[1]).getByLabelText("Close"));
      await waitFor(() => expect(document.querySelectorAll(".cm-card").length).toBe(1));
      expect(screen.getByText(/Transactions \(/)).toBeInTheDocument();  // still on Detail
    } finally { delete window.matchMedia; }
  });

  // R27-3 — on DESKTOP the plan/billing flow renders inside the shared Modal (X-close,
  // no scrim-dismiss); the X abandons the flow and leaves you on the screen you were on.
  it("R27-3: desktop — upgrade flow is a centered Modal with an X; X returns to origin (Account)", async () => {
    window.matchMedia = mmDesktop;
    try {
      loginAs();
      render(<CryptoIdea />);
      await screen.findByText(/My Assets/i);
      fireEvent.click(screen.getByText("STARTER"));            // → Account (origin)
      await screen.findByText("Plan usage");
      fireEvent.click(screen.getByRole("button", { name: /Plan & billing/ }));
      fireEvent.click(screen.getByText("Upgrade to Pro"));     // startUpgrade("pro")
      // the billing-cycle step renders inside the shared Modal card
      const card = document.querySelector(".cm-card");
      expect(card).toBeTruthy();
      expect(within(card).getByText("Upgrade to Pro")).toBeInTheDocument();       // Modal title
      expect(within(card).getByText(/Select your billing cycle/)).toBeInTheDocument();
      expect(within(card).getByText("Monthly")).toBeInTheDocument();
      // X → flow abandoned, still on the Account billing view (origin), not Portfolio
      fireEvent.click(within(card).getByLabelText("Close"));
      expect(document.querySelector(".cm-card")).toBeNull();
      expect(screen.getByText(/Plan & billing/)).toBeInTheDocument();
    } finally { delete window.matchMedia; }
  });

  it("R27-3: desktop — the X is suppressed while a payment is processing", async () => {
    window.matchMedia = mmDesktop;
    try {
      loginAs();
      render(<CryptoIdea />);
      await screen.findByText(/My Assets/i);
      fireEvent.click(screen.getByText("STARTER"));
      await screen.findByText("Plan usage");
      fireEvent.click(screen.getByRole("button", { name: /Plan & billing/ }));
      fireEvent.click(screen.getByText("Upgrade to Pro"));
      fireEvent.click(screen.getByText(/Pay with/));            // → 2s fake-PayPal step
      expect(screen.getByText("Processing...")).toBeInTheDocument();
      expect(screen.queryByLabelText("Close")).toBeNull();      // no X mid-payment
      // …the flow completes into the welcome screen (X allowed again there)
      expect(await screen.findByText(/Welcome to/, {}, { timeout: 3500 })).toBeInTheDocument();
    } finally { delete window.matchMedia; }
  });

  it("R27-3: mobile — the plan flow stays the full-screen overlay (no Modal card)", async () => {
    loginAs();
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    fireEvent.click(screen.getByText("STARTER"));
    await screen.findByText("Plan usage");
    fireEvent.click(screen.getByRole("button", { name: /Plan & billing/ }));
    fireEvent.click(screen.getByText("Upgrade to Pro"));
    expect(document.querySelector(".cm-card")).toBeNull();      // no popup on mobile
    expect(document.querySelector(".auth-wrap")).toBeTruthy();  // full-screen flow kept
    expect(screen.getByText(/Select your billing cycle/)).toBeInTheDocument();
  });

  // R27-4 — the transparent no-refund line in the downgrade/cancel confirm.
  it("R27-4: the cancel/downgrade confirm states the no-refund policy", async () => {
    loginAs("pro@test.com", "Pro");
    // Once: don't leak the pro tier into later tests (clearAllMocks keeps implementations)
    getUserProfile.mockResolvedValueOnce({ success: true, tier: "pro",
      subscription: { billing: "monthly", startDate: "2026-06-01", endDate: "2026-08-01", cancelled: false } });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    fireEvent.click(screen.getByText("PRO"));
    await screen.findByText("Plan usage");
    fireEvent.click(screen.getByRole("button", { name: /Plan & billing/ }));
    fireEvent.click(screen.getByText(/Cancel Pro/));
    expect(await screen.findByText(/Downgrade to Starter\?/)).toBeInTheDocument();
    expect(screen.getByText(/We don't refund the unused time/)).toBeInTheDocument();
  });

  // ── R29 — Premium downgrade chooser, pending flexibility, and the Pro re-checkout ──
  const premiumSub = (over = {}) => ({ billing: "monthly", startDate: "2026-05-01",
    endDate: "2099-01-01", cancelled: false, ...over });
  const loginPremium = (sub) => {
    loginAs("prem@test.com", "Prem");
    getUserProfile.mockResolvedValueOnce({ success: true, tier: "premium", subscription: sub });
  };

  // Plan B PR-C1 (rewrite): the chooser's Starter path now routes through the REAL server
  // callable — Confirm calls cancelSubscription({downgradeTo:"free"}) and forges NO pending
  // marker (strict server-sync; the marker arrives from watchUserDoc). The old assertions
  // that a "access ends on … become Starter" notice appears optimistically are removed —
  // that behavior is being intentionally deleted (founder-locked at G2), not weakened.
  it("premium → Starter downgrade routes through the server cancelSubscription callable (no client forge)", async () => {
    cancelSubscriptionMock.mockReset();
    cancelSubscriptionMock.mockResolvedValue({ success: true, downgradeTo: "free", endDate: "2099-01-01T00:00:00.000Z" });
    loginPremium(premiumSub());
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    fireEvent.click(screen.getByText("PREMIUM"));
    await screen.findByText("Plan usage");
    fireEvent.click(screen.getByRole("button", { name: /Plan & billing/ }));
    fireEvent.click(screen.getByText("Downgrade"));
    // The chooser is unchanged: both targets fed by PLAN_BENEFITS + the either-way access note.
    expect(await screen.findByText("Downgrade to which plan?")).toBeInTheDocument();
    expect(screen.getByText(PLAN_BENEFITS.pro.limits.join(" · "))).toBeInTheDocument();
    expect(screen.getByText(PLAN_BENEFITS.free.limits.join(" · "))).toBeInTheDocument();
    expect(screen.getByText(/either way/i)).toBeInTheDocument();
    // select Starter → Continue → the "what you'll lose" warning → Confirm
    fireEvent.click(screen.getByText("Starter"));
    fireEvent.click(screen.getByText("Continue"));
    expect(await screen.findByText(/Switch to Starter\?/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Confirm"));
    // PR-C1: Confirm routes through the real server callable (today it forges instead → RED here).
    await waitFor(() => expect(cancelSubscriptionMock).toHaveBeenCalledWith({ downgradeTo: "free" }));
    // strict server-sync: NO optimistic pending notice, and NO forged marker in the profile cache.
    expect(screen.queryByText(/access ends on/i)).toBeNull();
    const cached = JSON.parse(localStorage.getItem("ci-profile-u1") || "{}");
    expect(cached?.subscription?.cancelled).not.toBe(true);
  });

  // Plan B PR-C2 (rewrite — REPLACES the PR-C1 interim "just schedule cancelSubscription({
  // downgradeTo:'pro'})"): a Premium→Pro downgrade now reinstates a REAL approve step — the Pro
  // flow shows a billing-cycle/approve screen whose PayPal button calls scheduleProDowngrade({
  // billing}) and redirects the browser to the returned approvalUrl (a genuine future-start Pro
  // sub), and NEVER calls cancelSubscription({downgradeTo:"pro"}). Founder-locked at G2 (Option C).
  //
  // ASSUMED PR-C2 UI (the contract the client-builder implements to — flagged for hand-off):
  //   chooser "Downgrade to which plan?" → select "Pro" → Continue → warn "Switch to Pro?" →
  //   Continue (the reinstated onward CTA the PR-C1 comment says it removed) → cycle step
  //   "Select your billing cycle" → "Pay with" PayPal button → scheduleProDowngrade → redirect.
  // PROD path (import.meta.env.DEV=false) does the redirect; DEV keeps a simulated path (PR-B).
  it("PR-C2: premium → Pro reinstates a REAL approve step — scheduleProDowngrade + PayPal redirect, no cancelSubscription forge", async () => {
    vi.stubEnv("DEV", false);
    const origLocation = window.location;
    const assignSpy = vi.fn();
    // jsdom's window.location.assign isn't spyable; swap the whole location (PR-B pattern).
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: assignSpy, href: "http://localhost/", origin: "http://localhost" },
    });
    try {
      scheduleProDowngradeMock.mockReset();
      scheduleProDowngradeMock.mockResolvedValue({ approvalUrl: "https://paypal/x", subscriptionId: "I-PRO" });
      cancelSubscriptionMock.mockReset();
      cancelSubscriptionMock.mockResolvedValue({ success: true, downgradeTo: "pro", endDate: "2099-01-01T00:00:00.000Z" });
      loginPremium(premiumSub());
      render(<CryptoIdea />);
      await screen.findByText(/My Assets/i);
      fireEvent.click(screen.getByText("PREMIUM"));
      await screen.findByText("Plan usage");
      fireEvent.click(screen.getByRole("button", { name: /Plan & billing/ }));
      fireEvent.click(screen.getByText("Downgrade"));
      await screen.findByText("Downgrade to which plan?");
      fireEvent.click(screen.getByText("Pro"));
      fireEvent.click(screen.getByText("Continue"));
      await screen.findByText(/Switch to Pro\?/);
      // PR-C2 reinstates the onward step to the payment-approval screen (RED today: the PR-C1
      // warn step terminates in a plain "Confirm" — there is no second "Continue").
      fireEvent.click(screen.getByText("Continue"));
      // …the reinstated billing-cycle/approve screen → its PayPal button schedules the REAL
      // future-start Pro sub and redirects to the returned approvalUrl.
      const pay = await screen.findByText(/Pay with/i);
      fireEvent.click(pay.closest("button"));
      // the selected cycle flows through as {billing:"monthly"|"yearly"}; assert the SHAPE,
      // not a specific default (the scheduled-Pro cycle default is a client-builder choice).
      await waitFor(() => expect(scheduleProDowngradeMock).toHaveBeenCalledWith(
        expect.objectContaining({ billing: expect.stringMatching(/^(monthly|yearly)$/) })));
      await waitFor(() => expect(assignSpy).toHaveBeenCalledWith("https://paypal/x"));
      // the PR-C1 interim is gone: the Pro downgrade must NOT forge a cancel-to-Pro anymore.
      expect(cancelSubscriptionMock).not.toHaveBeenCalledWith({ downgradeTo: "pro" });
      // and no tier is written client-side (the webhook + sweep own it, PR-B invariant).
      const cached = JSON.parse(localStorage.getItem("ci-profile-u1") || "{}");
      expect(cached?.tier).not.toBe("pro");
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: origLocation });
      vi.unstubAllEnvs();
    }
  });

  // PR-C2: once a future-start Pro sub is scheduled (subscription.scheduledPro present), the
  // account lands directly on Pro via the server sweep at period end — it NEVER needs the manual
  // "Your Premium period has ended → Approve Pro payment" re-checkout modal. So that forced modal
  // must be SUPPRESSED whenever scheduledPro exists. RED today: recheckoutDue keys off cancelled
  // + downgradeTo:"pro" + !proApproved and ignores scheduledPro, so with a lapsed pro marker the
  // modal still shows.
  it("PR-C2: a scheduled future-start Pro (scheduledPro set) suppresses the period-end re-checkout modal", async () => {
    loginPremium(premiumSub({ endDate: "2026-06-01", cancelled: true, downgradeTo: "pro",
      scheduledPro: { subId: "I-PRO", billing: "monthly", startDate: "2026-06-01", approved: true } }));
    getPortfolios.mockResolvedValue({ success: true, portfolios: [{ id: "p1", name: "Main" }] });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    // Let the async subscription check run (it flips tier / would raise the modal).
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/Your Premium period has ended/i)).toBeNull();
  });

  it("R29-2: Keep-my-plan un-cancels a pending downgrade (notice gone, Downgrade back)", async () => {
    loginPremium(premiumSub({ cancelled: true, downgradeTo: "pro" }));
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    fireEvent.click(screen.getByText("PREMIUM"));
    await screen.findByText("Plan usage");
    fireEvent.click(screen.getByRole("button", { name: /Plan & billing/ }));
    expect(screen.getByText(/access ends on/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Keep my plan"));
    await waitFor(() => expect(screen.queryByText(/access ends on/i)).toBeNull());
    expect(screen.getByText("Downgrade")).toBeInTheDocument();
  });

  // PR-C2 SECURITY FIX: "Keep my plan" on a SCHEDULED-Pro marker (subscription.scheduledPro
  // present) can NOT resume Premium — the Premium PayPal sub was terminally cancelled at schedule
  // time (eager-cancel). So the client must be fail-closed: it still calls the server
  // (reactivateSubscription cancels the scheduled Pro + keeps the cancel-to-free), and it must
  // NEVER forge an optimistic `cancelled:false` into state — that was the [HIGH] paywall bypass
  // (Premium shown as a healthy, "renews on" subscription with no live sub behind it).
  // The exact re-subscribe CTA is a client-builder hand-off (this pins the security invariant:
  // no premium-forever illusion). RED today: keepPlan unconditionally sets cancelled:false, so
  // the misleading "renews on" note appears and the cache carries subscription.cancelled=false.
  // The legacy R29-2 keep-my-plan test above (no scheduledPro → plain un-cancel) stays GREEN.
  it("PR-C2: Keep-my-plan on a scheduled-Pro marker calls the server, shows NO premium-forever 'renews on', and never forges cancelled:false", async () => {
    loginPremium(premiumSub({ endDate: "2099-01-01", cancelled: true, downgradeTo: "pro",
      scheduledPro: { subId: "I-PRO", billing: "monthly", startDate: "2099-01-01", approved: true } }));
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    fireEvent.click(screen.getByText("PREMIUM"));
    await screen.findByText("Plan usage");
    fireEvent.click(screen.getByRole("button", { name: /Plan & billing/ }));
    expect(screen.getByText(/access ends on/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Keep my plan"));
    // The server does the real fail-closed work (cancel the scheduled Pro; keep the cancel).
    await waitFor(() => expect(reactivateMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/access ends on/i)).toBeNull());
    // Honest outcome: keep on a scheduled-Pro marker must NOT falsely present Premium as a
    // healthy, continuing subscription — the "renews on" note is the premium-forever bypass.
    expect(screen.queryByText(/renews on/i)).toBeNull();
    // …and it must never forge an optimistic cancelled:false into the cached profile.
    const cached = JSON.parse(localStorage.getItem("ci-profile-u1") || "{}");
    expect(cached?.subscription?.cancelled).not.toBe(false);
  });

  it("R29-3/DI-4: a lapsed Premium→Pro lands on Starter and KEEPS the over-limit data (no trim)", async () => {
    loginPremium(premiumSub({ endDate: "2026-06-01", cancelled: true, downgradeTo: "pro" }));
    getPortfolios.mockResolvedValue({ success: true,
      portfolios: [{ id: "p1", name: "Main" }, { id: "p2", name: "Alt" }] });
    render(<CryptoIdea />);
    // The forced-choice popup (no X — the only ways out are the two buttons)
    expect(await screen.findByText(/Your Premium period has ended/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Close")).toBeNull();
    // Tier already flipped to Starter…
    expect(await screen.findByText("STARTER")).toBeInTheDocument();
    // …and the data is KEPT (2 portfolios present; Starter cap is 1)
    expect(screen.getByText("Alt")).toBeInTheDocument();
    // Decline → subscription cleared, but DI-4 (D3) never trims: over-limit data is KEPT
    // and grey-locked, never deleted.
    fireEvent.click(screen.getByText("Continue with Starter"));
    await waitFor(() => expect(screen.queryByText(/Your Premium period has ended/i)).toBeNull());
    // The over-limit "Alt" portfolio is STILL there (kept, not deleted).
    expect(screen.getByText("Alt")).toBeInTheDocument();
    expect(screen.getByText(/My Assets/i)).toBeInTheDocument();
  });

  it("R29-3: approving the re-checkout routes into the real Pro billing flow and lands on Pro", async () => {
    loginPremium(premiumSub({ endDate: "2026-06-01", cancelled: true, downgradeTo: "pro" }));
    render(<CryptoIdea />);
    expect(await screen.findByText(/Your Premium period has ended/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Approve Pro payment"));
    // → the normal Pro checkout (billing cycle step); the popup steps aside meanwhile
    expect(await screen.findByText(/Select your billing cycle/)).toBeInTheDocument();
    expect(screen.queryByText(/Your Premium period has ended/i)).toBeNull();
    fireEvent.click(screen.getByText(/Pay with/));
    expect(await screen.findByText(/Welcome to/, {}, { timeout: 3500 })).toBeInTheDocument();
    // The marker was replaced by an ACTIVE Pro subscription — the popup never returns.
    expect(screen.queryByText(/Your Premium period has ended/i)).toBeNull();
  });

  it("BL-1/U12: a payment failure past the 7-day grace lands on Starter (no re-checkout popup)", async () => {
    loginPremium({ billing: "monthly", startDate: "2026-01-01", endDate: "2099-01-01",
      cancelled: false, paymentFailed: true, paymentFailedDate: "2026-01-10" });   // long past the grace
    getPortfolios.mockResolvedValue({ success: true, portfolios: [{ id: "p1", name: "Main" }] });
    getCoins.mockResolvedValue({ success: true, coins: [] });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    // forced to free by the grace expiry — NOT the R29 re-checkout path
    expect(screen.queryByText(/Your Premium period has ended/i)).toBeNull();
    expect(await screen.findByText("STARTER")).toBeInTheDocument();
  });

  it("BL-1e: an admin-set premium custom limit of 0 is respected (not treated as unset)", async () => {
    loginAs("prem@test.com", "Prem");
    getUserProfile.mockResolvedValueOnce({ success: true, tier: "premium",
      premiumLimits: { portfolios: 0, coins: 7 } });
    getPortfolios.mockResolvedValue({ success: true, portfolios: [{ id: "p1", name: "Main" }] });
    getCoins.mockResolvedValue({ success: true, coins: [] });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    fireEvent.click(screen.getByText("PREMIUM"));
    await screen.findByText("Plan usage");
    // portfolios: the || bug showed the 15 default for a custom 0 — now "1 / 0"
    expect(screen.getByText("1 / 0")).toBeInTheDocument();
    // coins: a non-default custom cap flows through as before
    expect(screen.getByText("0 / 7")).toBeInTheDocument();
  });

  it("R29-3: a lapsed downgrade to Starter still lands directly (no popup) and trims", async () => {
    loginPremium(premiumSub({ endDate: "2026-06-01", cancelled: true, downgradeTo: "free" }));
    getPortfolios.mockResolvedValue({ success: true,
      portfolios: [{ id: "p1", name: "Main" }, { id: "p2", name: "Alt" }] });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    expect(screen.queryByText(/Your Premium period has ended/i)).toBeNull();
    expect(await screen.findByText("STARTER")).toBeInTheDocument();
  });

  // ── Plan B PR-C1: cancel/downgrade route through the server callable (no client forge) ──
  // PR-C1 removes the last client-forged billing writes. The downgrade handlers now call
  // cancelSubscription({downgradeTo}) and rely on the live server sync (watchUserDoc) to bring
  // the marker back — NO optimistic setUser + saveProfile. keepPlan/declineProRecheckout keep
  // calling the server but drop their own saveProfile. (Founder-locked at G2; client-only.)
  describe("Plan B PR-C1 — server-routed cancel/downgrade", () => {
    beforeEach(() => {
      cancelSubscriptionMock.mockReset();
      cancelSubscriptionMock.mockImplementation(async ({ downgradeTo } = {}) =>
        ({ success: true, downgradeTo, endDate: "2099-01-01T00:00:00.000Z" }));
      reactivateMock.mockReset(); reactivateMock.mockResolvedValue({ success: true });
      resolveMock.mockReset(); resolveMock.mockResolvedValue({ success: true });
    });

    // 1) Pro → Starter via the simple confirm modal: Confirm calls the callable with
    //    {downgradeTo:"free"}, closes the modal, and forges NO cancelled marker.
    it("Pro→Starter cancel routes through the server cancelSubscription callable (no client forge)", async () => {
      loginAs("pro@test.com", "Pro");
      getUserProfile.mockResolvedValueOnce({ success: true, tier: "pro",
        subscription: { billing: "monthly", startDate: "2026-06-01", endDate: "2026-08-01", cancelled: false } });
      render(<CryptoIdea />);
      await screen.findByText(/My Assets/i);
      fireEvent.click(screen.getByText("PRO"));
      await screen.findByText("Plan usage");
      fireEvent.click(screen.getByRole("button", { name: /Plan & billing/ }));
      fireEvent.click(screen.getByText(/Cancel Pro/));
      expect(await screen.findByText(/Downgrade to Starter\?/)).toBeInTheDocument();
      fireEvent.click(screen.getByText("Confirm Downgrade"));
      // routes through the real server callable (today the handler forges instead → RED here)
      await waitFor(() => expect(cancelSubscriptionMock).toHaveBeenCalledWith({ downgradeTo: "free" }));
      expect(cancelSubscriptionMock).toHaveBeenCalledTimes(1);
      // modal closes; strict server-sync means NO optimistic pending notice
      await waitFor(() => expect(screen.queryByText(/Downgrade to Starter\?/)).toBeNull());
      expect(screen.queryByText(/access ends on/i)).toBeNull();
      // and nothing forged into the localStorage profile cache
      const cached = JSON.parse(localStorage.getItem("ci-profile-u1") || "{}");
      expect(cached?.subscription?.cancelled).not.toBe(true);
    });

    // 4) A server refusal is honest: a toast surfaces, and NO cancelled marker is forged
    //    into state (the "ends on" notice does NOT falsely render). Mirrors PR-B's payErr.
    it("a server-refused cancel surfaces a toast and forges no pending marker", async () => {
      loginAs("pro@test.com", "Pro");
      getUserProfile.mockResolvedValueOnce({ success: true, tier: "pro",
        subscription: { billing: "monthly", startDate: "2026-06-01", endDate: "2026-08-01", cancelled: false } });
      cancelSubscriptionMock.mockRejectedValueOnce({ code: "functions/failed-precondition", message: "Couldn't cancel your plan — please try again." });
      render(<CryptoIdea />);
      await screen.findByText(/My Assets/i);
      fireEvent.click(screen.getByText("PRO"));
      await screen.findByText("Plan usage");
      fireEvent.click(screen.getByRole("button", { name: /Plan & billing/ }));
      fireEvent.click(screen.getByText(/Cancel Pro/));
      await screen.findByText(/Downgrade to Starter\?/);
      fireEvent.click(screen.getByText("Confirm Downgrade"));
      // the handler must call the server (today it forges instead → RED here)…
      await waitFor(() => expect(cancelSubscriptionMock).toHaveBeenCalled());
      // …and on refusal surface a toast, never a falsely-forged pending notice
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.queryByText(/access ends on/i)).toBeNull();
      const cached = JSON.parse(localStorage.getItem("ci-profile-u1") || "{}");
      expect(cached?.subscription?.cancelled).not.toBe(true);
    });

    // 5) keepPlan "finishes the job": still calls the server reactivate, still updates state
    //    (the pending notice clears), but no longer writes the profile cache itself. The
    //    useAuthSession auto-save effect writes ci-profile-<uid> exactly ONCE per user change;
    //    removing keepPlan's own saveProfile means one click → exactly one profile write
    //    (today it produces two — the effect PLUS keepPlan's forbidden extra write → RED).
    it("keepPlan reactivates via the server and no longer writes the profile cache itself", async () => {
      loginPremium(premiumSub({ cancelled: true, downgradeTo: "pro" }));
      render(<CryptoIdea />);
      await screen.findByText(/My Assets/i);
      fireEvent.click(screen.getByText("PREMIUM"));
      await screen.findByText("Plan usage");
      fireEvent.click(screen.getByRole("button", { name: /Plan & billing/ }));
      expect(screen.getByText(/access ends on/i)).toBeInTheDocument();
      const setSpy = vi.spyOn(db, "set");   // spy through to real localStorage
      setSpy.mockClear();
      fireEvent.click(screen.getByText("Keep my plan"));
      await waitFor(() => expect(reactivateMock).toHaveBeenCalled());
      await waitFor(() => expect(screen.queryByText(/access ends on/i)).toBeNull());
      const profileWrites = setSpy.mock.calls.filter((cargs) => cargs[0] === "ci-profile-u1");
      expect(profileWrites.length).toBe(1);
      setSpy.mockRestore();
    });

    // 6) declineProRecheckout "finishes the job": still calls the server resolve, still clears
    //    state, but no longer writes the profile cache itself (one profile write → the effect
    //    only; today it also saveProfiles → two writes → RED).
    it("declineProRecheckout clears via the server and no longer writes the profile cache itself", async () => {
      loginPremium(premiumSub({ endDate: "2026-06-01", cancelled: true, downgradeTo: "pro" }));
      getPortfolios.mockResolvedValue({ success: true, portfolios: [{ id: "p1", name: "Main" }] });
      render(<CryptoIdea />);
      expect(await screen.findByText(/Your Premium period has ended/i)).toBeInTheDocument();
      const setSpy = vi.spyOn(db, "set");
      setSpy.mockClear();
      fireEvent.click(screen.getByText("Continue with Starter"));
      await waitFor(() => expect(resolveMock).toHaveBeenCalled());
      await waitFor(() => expect(screen.queryByText(/Your Premium period has ended/i)).toBeNull());
      const profileWrites = setSpy.mock.calls.filter((cargs) => cargs[0] === "ci-profile-u1");
      expect(profileWrites.length).toBe(1);
      setSpy.mockRestore();
    });
  });

  // ── #1 THE MOAT — one journey proving Journal → conviction signals → Learn connect ──
  it("MOAT: a thesis written at buy-time reaches Research's signals, and Learn teaches the framework", async () => {
    loginAs();
    addTransaction.mockResolvedValueOnce({ success: true, id: "t1" });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);

    // 1) Buy WITH a thesis (the Buy-Journal gate — "write before you buy")
    tab("Search");
    fireEvent.change(await screen.findByPlaceholderText(/Search any coin/i), { target: { value: "bitcoin" } });
    const row = (await screen.findByText("Bitcoin")).closest(".trend-item");
    fireEvent.click(within(row).getByText("+ Add"));
    const areas = document.querySelectorAll(".journal-q textarea");
    fireEvent.change(areas[0], { target: { value: "Hard cap, real adoption." } });
    fireEvent.change(areas[1], { target: { value: "Adoption stalls." } });
    fireEvent.click(screen.getByText(/Save to Journal/i));
    await screen.findAllByText(/Bitcoin/);

    // 2) The thesis lives in the Journal (not lost between surfaces)
    tab("Journal");
    expect(await screen.findByText(/Hard cap, real adoption/)).toBeInTheDocument();

    // 3) Make it a real HOLDING (Research mirrors holdings, not watchlist coins):
    //    Portfolio → coin card → Detail → + Buy → AddEntry → Add Buy
    tab("Portfolio");
    fireEvent.click(await screen.findByText("Bitcoin"));
    fireEvent.click(await screen.findByText("+ Buy"));
    const nums = document.querySelectorAll('input[type="number"]');
    fireEvent.change(nums[0], { target: { value: "0.5" } });   // amount
    fireEvent.change(nums[1], { target: { value: "40000" } }); // price
    fireEvent.click(screen.getByText("Add Buy"));
    await screen.findByText("+ Buy");                          // post-save returns to Detail (origin)

    // 4) Research: the SAME held coin renders conviction signals + the #26 bridge
    //    note tying the pills back to the manual research funnel the user applies
    tab("Research");
    await screen.findByText("Overview");
    fireEvent.click(screen.getByText("Coins"));
    expect(await screen.findByText(/These cover funnel steps 1–2; you apply 3–5\./)).toBeInTheDocument();

    // 5) Learn teaches exactly that framework (the thesis module + funnel lesson)
    tab("Learn");
    expect(await screen.findByText("Building Your Thesis")).toBeInTheDocument();
  });

  // ── CRYP-94 (Group B, findings 9+10): the founder edit-buy exploit is blocked end-to-end.
  //    Editing a buy DOWN below what a later sell needs is refused before any db write, so
  //    total-sold can never exceed total-bought (the previously-unguarded edit path). ──
  it("CRYP-94: editing a buy below the already-sold amount is rejected and no db write fires", async () => {
    loginAs();
    getPortfolios.mockResolvedValue({ success: true, portfolios: [{ id: "p1", name: "Main" }] });
    getCoins.mockResolvedValue({ success: true, coins: [
      { id: "bitcoin", symbol: "BTC", name: "Bitcoin", txCount: 2, entries: [
        { id: "b1", type: "buy", amount: 2, priceAtBuy: 100, date: "2024-01-01T00:00", createdAt: 1 },
        { id: "s1", type: "sell", amount: 1, priceAtBuy: 300, date: "2024-02-01T00:00", createdAt: 2 },
      ] },
    ] });
    const { updateTransaction } = await import("../../src/api/firebase-database.js");
    const { container } = render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);

    // open the held coin's Detail, then tap its BUY transaction row to edit it
    fireEvent.click(await screen.findByText("Bitcoin"));
    const buyRow = [...container.querySelectorAll(".tx-list .tx-row")].find((r) => r.querySelector(".tx-badge.buy"));
    expect(buyRow).toBeTruthy();
    fireEvent.click(buyRow);

    // edit the buy amount down to 0.2 (below the 1 BTC already sold) and Save
    const nums = document.querySelectorAll('input[type="number"]');
    fireEvent.change(nums[0], { target: { value: "0.2" } });
    fireEvent.click(screen.getByText("Save Changes"));

    // rejected: the invariant guard fires BEFORE the write, and surfaces a clear toast
    expect(updateTransaction).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/would exceed your holdings/i);
  });

  it("C-A3 review fix: a broken live-sync stream surfaces a toast (no silent stale data)", async () => {
    loginAs();
    const { watchCoins } = await import("../../src/api/firebase-database.js");
    watchCoins.mockImplementationOnce((uid, pid, cb, onErr) => { if (onErr) onErr(new Error("stream down")); return () => {}; });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/Live sync was interrupted/);
  });

  it("C-R2e: a failed settings write reverts the toggle and shows a toast", async () => {
    loginAs();
    const { updateUserSettings } = await import("../../src/api/firebase-auth.js");
    updateUserSettings.mockResolvedValueOnce({ success: false, error: "offline" });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    fireEvent.click(screen.getByText("STARTER"));
    await screen.findByText("Plan usage");
    const sw = screen.getByRole("switch");                 // the email-digest pill (home)
    expect(sw.checked).toBe(false);
    fireEvent.click(sw);
    // optimistic flip, then the failed write reverts it + surfaces the toast
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/Couldn't save that setting/);
    await waitFor(() => expect(screen.getByRole("switch").checked).toBe(false));
  });

  // R21 — the global error toast: carries the raised .ci-toast class (z-index 10000,
  // above every popup's 9500 scrim — the stacking itself is browser-verified) and
  // stays readable for ~6s (double the old 3s) before auto-dismissing.
  it("R21: error toast is role=alert with .ci-toast and auto-dismisses after ~6s (not 3s)", async () => {
    loginAs();
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    fireEvent.click(screen.getByText("STARTER"));
    await screen.findByText("Plan usage");
    fireEvent.click(screen.getByRole("button", { name: /Portfolios/ }));
    // Trigger a validation error: "+ Add" with no name entered → "Enter a portfolio name"
    // (a sync showErr path — no network involved). PLAN-LIMITS-MAX raised the free cap to 3,
    // so a 1-portfolio user is no longer at the cap; the empty-name toast is the reliable
    // sync error here. The point of R21 is the toast MECHANIC, not which error fires.
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByText("+ Add"));
      const toast = screen.getByRole("alert");
      expect(toast.textContent).toMatch(/Enter a portfolio name/);
      expect(toast.className).toContain("ci-toast");
      // R21-2: still visible at 3s (the old dismiss point)…
      act(() => { vi.advanceTimersByTime(3000); });
      expect(screen.getByRole("alert")).toBeInTheDocument();
      // …and gone shortly after 6s.
      act(() => { vi.advanceTimersByTime(3100); });
      expect(screen.queryByRole("alert")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
