import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// AUTH-DUP (Part A): the in-flight re-entry lock in handleAuth. A double-submit (two
// clicks, or Enter twice, before the async auth call resolves) must call registerUser /
// loginUser EXACTLY ONCE. In the Auth emulator that second concurrent create is what
// produced the duplicate `mark@test.com` rows the founder reported. The ref lock is the
// same-tick guard (a state update wouldn't apply in time); this test invokes handleAuth
// twice synchronously via two form-submit events and asserts a single auth call.

// Mock the whole api/firebase boundary (same seam the smoke test uses) so the container
// renders with no network. registerUser/loginUser are the calls we count.
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
  passwordError: vi.fn(() => null),   // any password passes strength — we test the lock
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
  getUserProfile: vi.fn().mockResolvedValue({ success: false }),
  createPortfolio: vi.fn(), deletePortfolio: vi.fn(), addCoin: vi.fn(), removeCoin: vi.fn(),
  addTransaction: vi.fn(), updateTransaction: vi.fn(), deleteTransaction: vi.fn(),
  getLearnProgress: vi.fn().mockResolvedValue({ success: true, xp: 0, streak: 0, lastActivity: "", completedLessons: [] }),
  saveLearnProgress: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("../../src/api/coingecko.js", () => ({
  fetchPrices: vi.fn().mockResolvedValue(null),
  searchCoins: vi.fn().mockResolvedValue(null),
  fetchTrending: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../src/api/config.js", () => ({ fetchSiteConfig: vi.fn().mockResolvedValue(null) }));

import { onAuthChange, registerUser, loginUser } from "../../src/api/firebase-auth.js";
import CryptoIdea from "../../src/CryptoIdea.jsx";

describe("AUTH-DUP Part A — handleAuth in-flight lock", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it("register: two submits in the same tick call registerUser exactly ONCE", async () => {
    onAuthChange.mockImplementation((cb) => { cb(null); return () => {}; });
    // A never-resolving promise keeps the first call in flight while the second fires,
    // so the ref lock is the only thing that can stop a duplicate registerUser.
    registerUser.mockImplementation(() => new Promise(() => {}));
    render(<CryptoIdea />);
    await screen.findByText(/Know why you own every coin/i);

    fireEvent.click(screen.getByText("Register"));   // switch to register mode
    fireEvent.change(screen.getByPlaceholderText("First and last name"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByPlaceholderText("you@email.com"), { target: { value: "dup@test.com" } });
    fireEvent.change(document.querySelector(".pw-wrap .field-input"), { target: { value: "Secret123!" } });
    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]);   // Terms
    fireEvent.click(boxes[1]);   // Privacy

    const form = document.querySelector("form.auth-col");
    await act(async () => { fireEvent.submit(form); fireEvent.submit(form); });

    expect(registerUser).toHaveBeenCalledTimes(1);
  });

  it("login: two submits in the same tick call loginUser exactly ONCE", async () => {
    onAuthChange.mockImplementation((cb) => { cb(null); return () => {}; });
    loginUser.mockImplementation(() => new Promise(() => {}));
    render(<CryptoIdea />);
    await screen.findByText(/Know why you own every coin/i);

    // Login is the default mode.
    fireEvent.change(screen.getByPlaceholderText("you@email.com"), { target: { value: "dup@test.com" } });
    fireEvent.change(document.querySelector(".pw-wrap .field-input"), { target: { value: "Secret123!" } });

    const form = document.querySelector("form.auth-col");
    await act(async () => { fireEvent.submit(form); fireEvent.submit(form); });

    expect(loginUser).toHaveBeenCalledTimes(1);
  });

  it("a validation bail-out (bad email) does NOT take the lock — a real submit still fires", async () => {
    onAuthChange.mockImplementation((cb) => { cb(null); return () => {}; });
    loginUser.mockImplementation(() => new Promise(() => {}));
    render(<CryptoIdea />);
    await screen.findByText(/Know why you own every coin/i);

    const form = document.querySelector("form.auth-col");
    // First submit: invalid email → synchronous early return BEFORE the lock is taken.
    fireEvent.change(screen.getByPlaceholderText("you@email.com"), { target: { value: "not-an-email" } });
    fireEvent.change(document.querySelector(".pw-wrap .field-input"), { target: { value: "Secret123!" } });
    await act(async () => { fireEvent.submit(form); });
    expect(loginUser).toHaveBeenCalledTimes(0);

    // Fix the email and submit again — the lock must NOT be stuck from the bail-out.
    fireEvent.change(screen.getByPlaceholderText("you@email.com"), { target: { value: "ok@test.com" } });
    await act(async () => { fireEvent.submit(form); });
    expect(loginUser).toHaveBeenCalledTimes(1);
  });
});
