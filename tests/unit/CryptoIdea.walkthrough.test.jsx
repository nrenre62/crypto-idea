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
vi.mock("../../src/api/firebase-database.js", () => ({
  getPortfolios: vi.fn().mockResolvedValue({ success: true, portfolios: [] }),
  getCoins: vi.fn().mockResolvedValue({ success: true, coins: [] }),
  getUserProfile: vi.fn().mockResolvedValue({ success: false }),
  createPortfolio: vi.fn(), deletePortfolio: vi.fn(),
  addCoin: vi.fn().mockResolvedValue({ success: true }),
  removeCoin: vi.fn().mockResolvedValue({ success: true }),
  addTransaction: vi.fn(), updateTransaction: vi.fn(), deleteTransaction: vi.fn(),
  getLearnProgress: vi.fn().mockResolvedValue({ success: true, xp: 0, streak: 0, lastActivity: "", completedLessons: [] }),
  saveLearnProgress: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("../../src/api/coingecko.js", () => ({
  fetchPrices: vi.fn().mockResolvedValue(null),
  searchCoins: vi.fn().mockResolvedValue(null),
  fetchHistory: vi.fn().mockResolvedValue(null),
  fetchTrending: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../src/api/config.js", () => ({ fetchSiteConfig: vi.fn().mockResolvedValue(null) }));

import { onAuthChange } from "../../src/api/firebase-auth.js";
import { getPortfolios, getCoins, getUserProfile } from "../../src/api/firebase-database.js";
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

  it("R29-1: premium — Downgrade opens the Pro/Starter chooser; picking Starter reaches the confirm", async () => {
    loginPremium(premiumSub());
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    fireEvent.click(screen.getByText("PREMIUM"));
    await screen.findByText("Plan usage");
    fireEvent.click(screen.getByRole("button", { name: /Plan & billing/ }));
    fireEvent.click(screen.getByText("Downgrade"));
    // The chooser: both targets fed by PLAN_BENEFITS + the either-way access note.
    expect(await screen.findByText("Downgrade to which plan?")).toBeInTheDocument();
    expect(screen.getByText(PLAN_BENEFITS.pro.limits.join(" · "))).toBeInTheDocument();
    expect(screen.getByText(PLAN_BENEFITS.free.limits.join(" · "))).toBeInTheDocument();
    expect(screen.getByText(/either way/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Starter"));
    // → the EXISTING confirm popup, now targeting Starter
    expect(await screen.findByText(/Downgrade to Starter\?/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Confirm Downgrade"));
    // → pink pending notice shows the chosen target
    expect(await screen.findByText(/access ends on/i)).toBeInTheDocument();
    expect(screen.getByText(/become Starter/)).toBeInTheDocument();
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

  it("R29-3: a lapsed Premium→Pro shows the re-checkout popup, lands on Starter, and DEFERS the trim", async () => {
    loginPremium(premiumSub({ endDate: "2026-06-01", cancelled: true, downgradeTo: "pro" }));
    getPortfolios.mockResolvedValue({ success: true,
      portfolios: [{ id: "p1", name: "Main" }, { id: "p2", name: "Alt" }] });
    render(<CryptoIdea />);
    // The forced-choice popup (no X — the only ways out are the two buttons)
    expect(await screen.findByText(/Your Premium period has ended/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Close")).toBeNull();
    // Tier already flipped to Starter…
    expect(await screen.findByText("STARTER")).toBeInTheDocument();
    // …but the data is NOT trimmed yet (2 portfolios still present; Starter cap is 1)
    expect(screen.getByText("Alt")).toBeInTheDocument();
    // Decline → subscription cleared + trimmed to Starter limits
    fireEvent.click(screen.getByText("Continue with Starter"));
    await waitFor(() => expect(screen.queryByText(/Your Premium period has ended/i)).toBeNull());
    // Trimmed to the Starter cap (1 portfolio) — the switcher hides for a free
    // single-portfolio user, so BOTH pills are gone; the app itself is intact.
    await waitFor(() => expect(screen.queryByText("Alt")).toBeNull());
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
    // Trigger a validation error: "+ Add" as a free user already at the 1-portfolio
    // cap (the classic plan-limit toast; a sync showErr path — no network involved).
    vi.useFakeTimers();
    try {
      fireEvent.click(screen.getByText("+ Add"));
      const toast = screen.getByRole("alert");
      expect(toast.textContent).toMatch(/Starter: 1 portfolio/);
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
