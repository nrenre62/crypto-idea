import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the entire api/ + firebase boundary so the component renders without any
// network/Firebase. This is the regression anchor for the screen extractions:
// if a refactor breaks a screen render, these tests fail.
vi.mock("firebase/functions", () => ({ httpsCallable: () => vi.fn() }));
vi.mock("../../src/api/firebase.config.js", () => ({ functions: {} }));
vi.mock("../../src/api/firebase-auth.js", () => ({
  onAuthChange: vi.fn(),
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  resetPassword: vi.fn(),
}));
vi.mock("../../src/api/firebase-database.js", () => ({
  getPortfolios: vi.fn().mockResolvedValue({ success: true, portfolios: [] }),
  getCoins: vi.fn().mockResolvedValue({ success: true, coins: [] }),
  getUserProfile: vi.fn().mockResolvedValue({ success: false }),
  createPortfolio: vi.fn(),
  deletePortfolio: vi.fn(),
  addCoin: vi.fn(),
  removeCoin: vi.fn(),
  addTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  getLearnProgress: vi.fn().mockResolvedValue({ success: true, xp: 0, streak: 0, lastActivity: "", completedLessons: [] }),
  saveLearnProgress: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("../../src/api/coingecko.js", () => ({
  fetchPrices: vi.fn().mockResolvedValue(null),
  searchCoins: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../src/api/config.js", () => ({ fetchSiteConfig: vi.fn().mockResolvedValue(null) }));

import { onAuthChange } from "../../src/api/firebase-auth.js";
import CryptoIdea from "../../src/CryptoIdea.jsx";

describe("CryptoIdea (smoke)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the login screen when logged out", async () => {
    onAuthChange.mockImplementation((cb) => { cb(null); return () => {}; });
    render(<CryptoIdea />);
    expect(await screen.findByText(/Know why you own every coin/i)).toBeInTheDocument();
  });

  it("navigates from login to the password-reset screen (ForgotPass via context)", async () => {
    onAuthChange.mockImplementation((cb) => { cb(null); return () => {}; });
    render(<CryptoIdea />);
    fireEvent.click(await screen.findByText(/Forgot password/i));
    // Exact match -> the heading only (not the "...reset your password." sentence).
    expect(await screen.findByText("Reset your password")).toBeInTheDocument();
  });

  it("renders the portfolio screen when logged in (exercises hdr/Ic/StatusDot)", async () => {
    // A user with no subscription -> checkSubscriptionStatus returns immediately,
    // so no callable runs. Empty portfolios -> the default empty portfolio screen.
    onAuthChange.mockImplementation((cb) => {
      cb({ uid: "u1", email: "pro@test.com", displayName: "Pro" });
      return () => {};
    });
    render(<CryptoIdea />);
    expect(await screen.findByText(/My Assets/i)).toBeInTheDocument();
  });

  it("navigates from portfolio to the Add-Coin search screen (Search via context)", async () => {
    onAuthChange.mockImplementation((cb) => {
      cb({ uid: "u1", email: "pro@test.com", displayName: "Pro" });
      return () => {};
    });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    // Bottom-nav "Search" tab -> screen "search" -> <Search/> renders its empty state.
    fireEvent.click(screen.getByText("Search"));
    expect(await screen.findByText("Add Coin")).toBeInTheDocument();
    expect(screen.getByText("Search any coin")).toBeInTheDocument();
  });

  it("navigates from portfolio to the Account screen via the tier badge (Account via context)", async () => {
    onAuthChange.mockImplementation((cb) => {
      cb({ uid: "u1", email: "free@test.com", displayName: "Free" });
      return () => {};
    });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    // Header tier badge (free user -> "STARTER") -> screen "account" -> <Account/>.
    fireEvent.click(screen.getByText("STARTER"));
    expect(await screen.findByText("Your Plan Usage")).toBeInTheDocument();
    expect(screen.getByText("Privacy & your data")).toBeInTheDocument();
  });
});
