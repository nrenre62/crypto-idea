import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  verifyEmail: vi.fn(),
  confirmPassword: vi.fn(),
  changePassword: vi.fn().mockResolvedValue({ success: true }),
  passwordError: vi.fn(() => null),
  updateDisplayName: vi.fn().mockResolvedValue({ success: true, name: "X" }),
  changeEmail: vi.fn().mockResolvedValue({ success: true }),
  updateUserSettings: vi.fn().mockResolvedValue({ success: true }),
  CONSENT_VERSION: "test",
}));
vi.mock("../../src/api/firebase-database.js", () => ({
  watchPortfolios: vi.fn(() => () => {}),
  watchCoins: vi.fn(() => () => {}),
  watchUserDoc: vi.fn(() => () => {}),
  watchLearnProgress: vi.fn((uid, cb) => { cb({ success: false }); return () => {}; }),
  getPortfolios: vi.fn().mockResolvedValue({ success: true, portfolios: [] }),
  getCoins: vi.fn().mockResolvedValue({ success: true, coins: [] }),
  // ONBOARD-GATE: a logged-in user has passed the plan gate (planChosen:true), so these
  // smoke tests exercise the app BEHIND the gate rather than the forced plan modal.
  getUserProfile: vi.fn().mockResolvedValue({ success: true, tier: "free", planChosen: true, settings: {} }),
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
  fetchTrending: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../src/api/config.js", () => ({ fetchSiteConfig: vi.fn().mockResolvedValue(null) }));

import { onAuthChange } from "../../src/api/firebase-auth.js";
import { getUserProfile } from "../../src/api/firebase-database.js";
import CryptoIdea from "../../src/CryptoIdea.jsx";

describe("CryptoIdea (smoke)", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

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

  it("ONBOARD-GATE: a not-chosen user sees the plan gate, NOT a portfolio load error", async () => {
    // The critical regression the adversarial review caught: a not-yet-chosen user's data reads
    // are denied by firestore.rules; loadPortfolios must NOT treat that expected denial as a load
    // error, or the "Couldn't load / Retry" screen masks the plan gate and onboarding is impossible.
    // useAuthSession skips the load for a not-chosen user + the gate render wins over portfoliosError.
    getUserProfile.mockResolvedValueOnce({ success: true, tier: "free", planChosen: false, settings: {} });
    onAuthChange.mockImplementation((cb) => {
      cb({ uid: "u1", email: "new@test.com", displayName: "New" });
      return () => {};
    });
    render(<CryptoIdea />);
    // The forced picker renders (every card actionable); the load-error dead-end does not.
    expect(await screen.findByText("Choose Starter")).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load your portfolios")).toBeNull();
  });

  it("navigates from portfolio to the Add-Coin search screen (Search via context)", async () => {
    onAuthChange.mockImplementation((cb) => {
      cb({ uid: "u1", email: "pro@test.com", displayName: "Pro" });
      return () => {};
    });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    // Bottom-nav "Search" tab -> screen "search" -> <Search/> renders its empty state
    // (DP-6: a TRENDING list of coins to add).
    fireEvent.click(screen.getByText("Search"));
    expect(await screen.findByText("Trending")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search any coin/i)).toBeInTheDocument();
  });

  // C-R2a: logout clears this device's cached local data (active-portfolio id + cached
  // profile) so the next account on a shared device doesn't inherit it.
  it("clears cached local data on logout (C-R2a)", async () => {
    onAuthChange.mockImplementation((cb) => {
      cb({ uid: "u1", email: "free@test.com", displayName: "Free" });
      return () => {};
    });
    localStorage.setItem("ci-profile-u1", JSON.stringify({ name: "Free" }));
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    fireEvent.click(screen.getByText("STARTER"));        // → Account home
    fireEvent.click(await screen.findByText("Logout"));  // → logout()
    await waitFor(() => {
      expect(localStorage.getItem("ci-active-port")).toBeNull();
      expect(localStorage.getItem("ci-profile-u1")).toBeNull();
    });
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
    // Account is a drill-in list: home shows the plan-usage summary + nav rows.
    expect(await screen.findByText("Plan usage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Privacy & data/ })).toBeInTheDocument();
  });

  // CRYP-102 (FLOATING-HEADER, decision #1): the shell-level account avatar button is
  // pinned INSIDE the sticky header dock, so it stays with the floating header instead
  // of scrolling away with the tab body. The refactor wraps the avatar button in a
  // `<div className="avatar-dock">` in CryptoIdea.jsx. This is the shell where the
  // avatar actually renders (it is not part of <Portfolio/>), so the dock structure is
  // only assertable here.
  it("CRYP-102: the account avatar is pinned inside the sticky .avatar-dock", async () => {
    onAuthChange.mockImplementation((cb) => {
      cb({ uid: "u1", email: "free@test.com", displayName: "Free" });
      return () => {};
    });
    const { container } = render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    const avatar = container.querySelector(".app-avatar");
    expect(avatar).toBeTruthy();                       // shell-level avatar renders on a tab screen
    expect(avatar.closest(".avatar-dock")).toBeTruthy(); // and sits inside the sticky header dock
  });
});
