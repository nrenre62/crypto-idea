/**
 * CRYP-109 · CryptoIdea add-coin handler — throttle toast branch (B3 PR-2).
 *
 * The rewired addCoin returns the NEW reason:'rate-limited' (the addCoinGuarded 2s cooldown /
 * 100-per-day cap). The app's add handler must give that a DISTINCT, honest throttle toast —
 * NOT the misleading "Check your connection" fallback and NOT the plan-limit/upgrade path — and
 * must NOT fire the counter-reconcile (that self-heal is the genuine-cap path only). A real
 * reason:'limit' must still take the upgrade/reconcile path (regression guard).
 *
 * Mounts the REAL app (Firebase/network mocked) as a signed-in free user and drives the real
 * Search → Buy-Journal → Save flow that invokes the handler (mirrors the walkthrough add flow).
 *
 * RED today: the handler has no 'rate-limited' branch, so a rate-limited add falls through to
 * failToast(...,"Couldn't add coin. Check your connection.") — the throttle-message assertion
 * fails for the right reason. GREEN once the handler adds the throttle branch (+ errors.js).
 */
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
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
    getCoinsMeta: vi.fn((...a) => getCoins(...a)),
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
vi.mock("../../src/api/billing.js", () => ({
  createSubscription: vi.fn(), cancelSubscription: vi.fn(), scheduleProDowngrade: vi.fn(),
}));

// account.js keeps its real functions EXCEPT reconcileMyCounters, which becomes a spy so we can
// assert the limit/upgrade path fires (limit) but the throttle path does NOT (rate-limited).
const { reconcileMock } = vi.hoisted(() => ({ reconcileMock: vi.fn() }));
vi.mock("../../src/api/account.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, reconcileMyCounters: reconcileMock };
});

import { onAuthChange } from "../../src/api/firebase-auth.js";
import { addCoin } from "../../src/api/firebase-database.js";
import CryptoIdea from "../../src/CryptoIdea.jsx";

const loginAs = (email = "free@test.com", name = "Free") =>
  onAuthChange.mockImplementation((cb) => { cb({ uid: "u1", email, displayName: name }); return () => {}; });
const tab = (label) => fireEvent.click(screen.getByText(label));

// Drive the real Search → Buy-Journal → Save flow that triggers the addCoin handler
// (mirrors CryptoIdea.walkthrough.test's add flow) so the handler's reason branch is exercised.
async function addBitcoinViaSearch() {
  tab("Search");
  await screen.findByText("Trending");
  fireEvent.change(screen.getByPlaceholderText(/Search any coin/i), { target: { value: "bitcoin" } });
  const result = await screen.findByText("Bitcoin");
  const row = result.closest(".trend-item");
  fireEvent.click(within(row).getByText("+ Add"));
  await screen.findByText(/Before you add Bitcoin/i);
  const areas = document.querySelectorAll(".journal-q textarea");
  fireEvent.change(areas[0], { target: { value: "Hard cap, real adoption." } });
  fireEvent.change(areas[1], { target: { value: "Adoption stalls or supply cap changes." } });
  fireEvent.click(screen.getByText(/Save to Journal/i));
}

describe("add-coin handler throttle toast (CRYP-109)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    reconcileMock.mockResolvedValue({ success: false, fixed: false });
  });

  it("CRYP-109: a rate-limited add shows a distinct throttle toast and never calls reconcileMyCounters", async () => {
    loginAs();
    addCoin.mockResolvedValueOnce({ success: false, code: "resource-exhausted", reason: "rate-limited" });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    await addBitcoinViaSearch();
    // the throttle toast — NOT the misleading "Check your connection" fallback, NOT the upgrade line.
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/too fast|slow down|wait|moment/i);
    expect(alert.textContent).not.toMatch(/upgrade/i);
    expect(alert.textContent).not.toMatch(/check your connection/i);
    // a throttle is transient — it must NOT trigger the counter self-heal (that's the genuine-cap path).
    expect(reconcileMock).not.toHaveBeenCalled();
  });

  it("CRYP-109: a genuine reason:'limit' add still fires the upgrade/reconcile path (regression guard)", async () => {
    loginAs();
    addCoin.mockResolvedValueOnce({ success: false, code: "permission-denied", reason: "limit" });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    await addBitcoinViaSearch();
    // the cap path self-heals the counters, then surfaces the upgrade hint.
    await waitFor(() => expect(reconcileMock).toHaveBeenCalled());
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/limit|upgrade/i);
  });
});
