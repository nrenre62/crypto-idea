/**
 * CRYP-111 · CryptoIdea addEntry handler — throttle toast branch (B3 PR-tx-2).
 *
 * The rewired addTransaction returns the NEW reason:'rate-limited' (the addTransactionGuarded
 * 0.5s cooldown / 500-per-day cap). The app's addEntry handler must give that a DISTINCT, honest
 * throttle toast — NOT the misleading "Check your connection" fallback and NOT the plan-limit/
 * upgrade path — and must NOT fire the counter-reconcile (that self-heal is the genuine-cap path
 * only). A real reason:'limit' must still take the upgrade/reconcile path (regression guard).
 * Mirrors add-coin-throttle-toast.test.jsx (CRYP-109) for the transaction path.
 *
 * Mounts the REAL app (Firebase/network mocked) as a signed-in free user with one held coin and
 * drives Portfolio → coin → Detail → + Buy → Add Buy, the flow that invokes addEntry.
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
  const COIN = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", thumb: "",
    entries: [{ id: "e1", type: "buy", amount: 0.5, priceAtBuy: 40000, date: "2025-01-01T00:00", createdAt: 1 }] };
  const getCoins = vi.fn().mockResolvedValue({ success: true, coins: [COIN] });
  return {
    watchPortfolios: vi.fn(() => () => {}),
    watchCoins: vi.fn(() => () => {}),
    watchUserDoc: vi.fn(() => () => {}),
    watchLearnProgress: vi.fn((uid, cb) => { cb({ success: false }); return () => {}; }),
    getPortfolios: vi.fn().mockResolvedValue({ success: true, portfolios: [{ id: "p1", name: "Main" }] }),
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
import { addTransaction } from "../../src/api/firebase-database.js";
import CryptoIdea from "../../src/CryptoIdea.jsx";

const loginAs = (email = "free@test.com", name = "Free") =>
  onAuthChange.mockImplementation((cb) => { cb({ uid: "u1", email, displayName: name }); return () => {}; });
const tab = (label) => fireEvent.click(screen.getByText(label));

// Drive Portfolio → held coin → Detail → + Buy → fill amount/price → Add Buy (invokes addEntry).
async function addBuyViaDetail() {
  tab("Portfolio");
  fireEvent.click(await screen.findByText("Bitcoin"));
  fireEvent.click(await screen.findByText("+ Buy"));
  const nums = document.querySelectorAll('input[type="number"]');
  fireEvent.change(nums[0], { target: { value: "0.1" } });    // amount
  fireEvent.change(nums[1], { target: { value: "50000" } });  // price
  fireEvent.click(screen.getByText("Add Buy"));
}

describe("addEntry handler throttle toast (CRYP-111)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    reconcileMock.mockResolvedValue({ success: false, fixed: false });
  });

  it("CRYP-111: a rate-limited transaction add shows a distinct throttle toast and never calls reconcileMyCounters", async () => {
    loginAs();
    addTransaction.mockResolvedValueOnce({ success: false, code: "resource-exhausted", reason: "rate-limited" });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    await addBuyViaDetail();
    // the throttle toast — NOT the misleading "Check your connection" fallback, NOT the upgrade line.
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/too fast|slow down|wait|moment/i);
    expect(alert.textContent).not.toMatch(/upgrade/i);
    expect(alert.textContent).not.toMatch(/check your connection/i);
    // a throttle is transient — it must NOT trigger the counter self-heal (that's the genuine-cap path).
    expect(reconcileMock).not.toHaveBeenCalled();
  });

  it("CRYP-111: a genuine reason:'limit' add still fires the upgrade/reconcile path (regression guard)", async () => {
    loginAs();
    addTransaction.mockResolvedValueOnce({ success: false, code: "permission-denied", reason: "limit" });
    render(<CryptoIdea />);
    await screen.findByText(/My Assets/i);
    await addBuyViaDetail();
    // the cap path self-heals the counters, then surfaces the upgrade hint.
    await waitFor(() => expect(reconcileMock).toHaveBeenCalled());
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/limit|upgrade/i);
  });
});
