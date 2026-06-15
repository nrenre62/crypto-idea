import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock the entire api/ + firebase boundary so the component renders without any
// network/Firebase. This is the regression anchor for the upcoming screen
// extractions: if a refactor breaks the render, this test fails.
vi.mock("firebase/functions", () => ({ httpsCallable: () => vi.fn() }));
vi.mock("../../src/api/firebase.config.js", () => ({ functions: {} }));
vi.mock("../../src/api/firebase-auth.js", () => ({
  onAuthChange: (cb) => { cb(null); return () => {}; }, // logged out -> login screen
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  resetPassword: vi.fn(),
}));
vi.mock("../../src/api/firebase-database.js", () => ({
  getPortfolios: vi.fn().mockResolvedValue({ success: true, portfolios: [] }),
  getCoins: vi.fn().mockResolvedValue({ success: true, coins: [] }),
  createPortfolio: vi.fn(),
  deletePortfolio: vi.fn(),
  addCoin: vi.fn(),
  removeCoin: vi.fn(),
  addTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));
vi.mock("../../src/api/coingecko.js", () => ({
  fetchPrices: vi.fn().mockResolvedValue(null),
  searchCoins: vi.fn().mockResolvedValue(null),
}));
vi.mock("../../src/api/config.js", () => ({ fetchSiteConfig: vi.fn().mockResolvedValue(null) }));

import CryptoIdea from "../../src/CryptoIdea.jsx";

describe("CryptoIdea (smoke)", () => {
  it("renders the login screen when logged out", async () => {
    render(<CryptoIdea />);
    expect(await screen.findByText(/Track your investments/i)).toBeInTheDocument();
  });
});
