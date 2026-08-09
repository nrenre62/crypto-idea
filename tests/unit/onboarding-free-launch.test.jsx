import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * CRYP-101 — LAUNCH-FREE Part B (onboarding).
 *
 * When paid plans are switched off site-wide (site.paidPlansEnabled === false), a
 * brand-new user who hasn't recorded a plan choice (forcedPlan) has nothing to pick —
 * Starter is the only plan on offer. So the client must NOT show the plan-chooser modal
 * at all; it auto-records the free choice (chooseFreePlan) and moves straight on.
 *
 * Mocks the full api/ + firebase boundary exactly like CryptoIdea.smoke.test.jsx, and
 * additionally stubs api/account.js so `chooseFreePlan` is a spy we can assert on and
 * api/config.js so fetchSiteConfig reports launch-free mode.
 */
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
  // ONBOARD-GATE: a NOT-chosen new account → forcedPlan is true.
  getUserProfile: vi.fn().mockResolvedValue({ success: true, tier: "free", planChosen: false, settings: {} }),
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
// Launch-free mode: paid plans switched off site-wide.
vi.mock("../../src/api/config.js", () => ({
  fetchSiteConfig: vi.fn().mockResolvedValue({
    maintenance: false, signupsEnabled: true, paidPlansEnabled: false, plans: null,
    features: { marketData: true, checkout: true, aiResearch: true }, announcement: null,
  }),
}));
// account.js: chooseFreePlan is the free-onboarding path we assert is auto-invoked.
vi.mock("../../src/api/account.js", () => ({
  exportMyData: vi.fn(),
  deleteMyAccount: vi.fn(),
  restoreMyAccount: vi.fn(),
  signOutEverywhere: vi.fn(),
  reconcileMyCounters: vi.fn(),
  resolveRecheckout: vi.fn(),
  reactivateSubscription: vi.fn(),
  chooseFreePlan: vi.fn().mockResolvedValue({ success: true, planChosen: true }),
  devSetMyTier: vi.fn().mockResolvedValue({ success: true }),
}));

import { onAuthChange } from "../../src/api/firebase-auth.js";
import { chooseFreePlan } from "../../src/api/account.js";
import CryptoIdea from "../../src/CryptoIdea.jsx";

describe("CRYP-101 — launch-free onboarding auto-Starter", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it("CRYP-101: paid plans off → a forced new user auto-records the free plan (no chooser)", async () => {
    onAuthChange.mockImplementation((cb) => {
      cb({ uid: "u1", email: "new@test.com", displayName: "New" });
      return () => {};
    });
    render(<CryptoIdea />);

    // The free-plan choice is invoked automatically — the user is never asked to pick.
    await waitFor(() => expect(chooseFreePlan).toHaveBeenCalled(), { timeout: 2000 });

    // …and the manual plan-chooser cards are never rendered.
    expect(screen.queryByText("Choose Starter")).toBeNull();
    expect(screen.queryByText("Choose Pro")).toBeNull();
    expect(screen.queryByText("Choose Premium")).toBeNull();
  });
});
