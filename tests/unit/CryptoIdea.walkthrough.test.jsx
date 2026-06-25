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
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("firebase/functions", () => ({ httpsCallable: () => vi.fn() }));
vi.mock("../../src/api/firebase.config.js", () => ({ functions: {} }));
vi.mock("../../src/api/firebase-auth.js", () => ({
  onAuthChange: vi.fn(),
  registerUser: vi.fn(), loginUser: vi.fn(), logoutUser: vi.fn(), resetPassword: vi.fn(),
  verifyEmail: vi.fn(), confirmPassword: vi.fn(),
  changePassword: vi.fn().mockResolvedValue({ success: true }),
  passwordError: vi.fn(() => null), CONSENT_VERSION: "test",
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
}));
vi.mock("../../src/api/config.js", () => ({ fetchSiteConfig: vi.fn().mockResolvedValue(null) }));

import { onAuthChange } from "../../src/api/firebase-auth.js";
import { getPortfolios, getCoins } from "../../src/api/firebase-database.js";
import CryptoIdea from "../../src/CryptoIdea.jsx";

const loginAs = (email = "free@test.com", name = "Free") =>
  onAuthChange.mockImplementation((cb) => { cb({ uid: "u1", email, displayName: name }); return () => {}; });

// The bottom nav: click a tab by its visible label.
const tab = (label) => fireEvent.click(screen.getByText(label));

describe("User walkthrough — all functions", () => {
  beforeEach(() => vi.clearAllMocks());

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
    expect(await screen.findByText("Investment Journal")).toBeInTheDocument();
    expect(screen.getByText("Your journal is empty")).toBeInTheDocument();
    expect(screen.getByText("Add your first coin →")).toBeInTheDocument();
  });

  it("5. Learn tab: modules render, lesson overlay opens, quiz reveals answer", async () => {
    loginAs();
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    tab("Learn");
    expect(await screen.findByText("Your Investing Edge")).toBeInTheDocument();
    expect(screen.getByText("Reading the Fundamentals")).toBeInTheDocument();
    // Open the lesson overlay via Today's lesson
    fireEvent.click(screen.getByText("Start lesson"));
    expect(await screen.findByText("The key insight")).toBeInTheDocument();
    // Answer the quiz — clicking the correct option reveals it (class "correct")
    const correct = screen.getByText("More people are buying it right now");
    fireEvent.click(correct);
    expect(correct.closest(".quiz-opt").className).toContain("correct");
  });

  it("6. Search tab: search a coin, Buy-Journal overlay appears, add it, lands on Portfolio", async () => {
    loginAs();
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    tab("Search");
    expect(await screen.findByText("Add Coin")).toBeInTheDocument();
    // Type a top-coin query -> local result appears
    fireEvent.change(screen.getByPlaceholderText(/Search coins/i), { target: { value: "bitcoin" } });
    const result = await screen.findByText("Bitcoin");
    // Click the "+ Add" pill in that result row
    const row = result.closest(".trend-item");
    fireEvent.click(within(row).getByText("+ Add"));
    // Buy-Journal overlay appears ("write before you buy")
    expect(await screen.findByText(/Before you add Bitcoin/i)).toBeInTheDocument();
    expect(screen.getByText("Why are you buying this?")).toBeInTheDocument();
    // Fill the thesis (design-only) and save
    const areas = document.querySelectorAll(".journal-q textarea");
    fireEvent.change(areas[0], { target: { value: "Hard cap, real adoption." } });
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
    expect(await screen.findByText("Your Plan Usage")).toBeInTheDocument();
    expect(screen.getByText("Privacy & your data")).toBeInTheDocument();
  });
});
