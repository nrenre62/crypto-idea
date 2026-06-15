import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppContext } from "../../src/hooks/app-context.js";
import { Portfolio } from "../../src/components/Portfolio.jsx";
import { PortfolioBar } from "../../src/components/PortfolioBar.jsx";

// Both are reached only when logged in; we test them in isolation against the real
// AppContext. The smoke test additionally renders <Portfolio/> through the live app.
const base = {
  api: "live", tv: 0, totalBuys: 0, tpnl: 0, tpp: 0, portfolio: [], maxCoinsPerPort: 10,
  usagePct: 0, prices: {}, isPro: false, isPremium: false, setScreen: vi.fn(),
  startUpgrade: vi.fn(), setSel: vi.fn(), setInfoCoin: vi.fn(), remCoin: vi.fn(),
  resetSwipe: vi.fn(), onTouchS: vi.fn(), onTouchM: vi.fn(), onTouchE: vi.fn(),
  touchStart: null, swipeId: null, swipeX: 0,
  portfolios: [{ id: "default", name: "My Portfolio" }], setActivePortId: vi.fn(),
  activePortId: "default", maxPortfolios: 1,
};
const provide = (Comp, value) =>
  render(<AppContext.Provider value={{ ...base, ...value }}><Comp /></AppContext.Provider>);

describe("Portfolio screen (extracted, via AppContext)", () => {
  it("shows the empty state when there are no coins", () => {
    provide(Portfolio, { portfolio: [] });
    expect(screen.getByText("No coins yet")).toBeInTheDocument();
    expect(screen.getByText(/My Assets/)).toBeInTheDocument();
  });

  it("renders a held coin with its value in the asset list", () => {
    const coin = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", thumb: "",
      entries: [{ id: "t1", type: "buy", amount: 2, priceAtBuy: 100, date: "2024-01-01" }] };
    provide(Portfolio, { portfolio: [coin], prices: { bitcoin: { usd: 50, usd_24h_change: 1 } }, tv: 100 });
    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    // 2 BTC * $50 = $100.00
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("shows the free-tier upgrade nudge at 100% usage", () => {
    provide(Portfolio, { usagePct: 100, isPro: false });
    expect(screen.getByText(/reached your account limit/i)).toBeInTheDocument();
  });
});

describe("PortfolioBar (extracted, via AppContext)", () => {
  it("is hidden for a single-portfolio free user", () => {
    const { container } = provide(PortfolioBar, { portfolios: [{ id: "default", name: "My Portfolio" }], isPro: false });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a switcher button per portfolio when there is more than one", () => {
    provide(PortfolioBar, {
      portfolios: [{ id: "p1", name: "Main" }, { id: "p2", name: "Alt" }],
      activePortId: "p1", maxPortfolios: 10,
    });
    expect(screen.getByText("Main")).toBeInTheDocument();
    expect(screen.getByText("Alt")).toBeInTheDocument();
  });

  it("switches the active portfolio on click", () => {
    const setActivePortId = vi.fn();
    provide(PortfolioBar, {
      portfolios: [{ id: "p1", name: "Main" }, { id: "p2", name: "Alt" }],
      activePortId: "p1", maxPortfolios: 10, setActivePortId,
    });
    fireEvent.click(screen.getByText("Alt"));
    expect(setActivePortId).toHaveBeenCalledWith("p2");
  });
});
