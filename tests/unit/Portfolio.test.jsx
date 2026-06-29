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

  it("renders a held coin as an asset card (value + amount, no 'held' word)", () => {
    const coin = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", thumb: "",
      entries: [{ id: "t1", type: "buy", amount: 2, priceAtBuy: 100, date: "2024-01-01" }] };
    const { container } = provide(Portfolio, { portfolio: [coin], prices: { bitcoin: { usd: 50, usd_24h_change: 1 } }, tv: 100 });
    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    const card = container.querySelector(".asset-card");
    expect(card).toBeTruthy();
    // 2 BTC * $50 = $100.00 (value carries faint cents in a nested span)
    expect(card.querySelector(".ac-val").textContent).toBe("$100.00");
    // amount shows the unit and drops the word "held"
    expect(card.querySelector(".ac-amt").textContent).toBe("2 BTC");
    expect(card.textContent).not.toContain("held");
  });

  // R4-2: split click zones — the coin IMAGE opens CoinInfo; the card BACKGROUND opens
  // Add-transaction (default Buy), so users can record a position in one tap.
  it("tapping the coin image opens CoinInfo (not the whole card)", () => {
    const coin = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", thumb: "",
      entries: [{ id: "t1", type: "buy", amount: 1, priceAtBuy: 100, date: "2024-01-01" }] };
    const setScreen = vi.fn(), setInfoCoin = vi.fn(), startAddTx = vi.fn();
    const { container } = provide(Portfolio, {
      portfolio: [coin], prices: { bitcoin: { usd: 100, usd_24h_change: 1 } }, tv: 100, setScreen, setInfoCoin, startAddTx,
    });
    fireEvent.click(container.querySelector(".asset-card .ac-img"));
    expect(setInfoCoin).toHaveBeenCalledWith(coin);
    expect(setScreen).toHaveBeenCalledWith("coinInfo");
    expect(startAddTx).not.toHaveBeenCalled(); // image tap must not also open Add-transaction
  });

  it("tapping the card background opens the Detail screen (position + transactions)", () => {
    const coin = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", thumb: "",
      entries: [{ id: "t1", type: "buy", amount: 1, priceAtBuy: 100, date: "2024-01-01" }] };
    const setScreen = vi.fn(), setSel = vi.fn(), setInfoCoin = vi.fn();
    const { container } = provide(Portfolio, {
      portfolio: [coin], prices: { bitcoin: { usd: 100, usd_24h_change: 1 } }, tv: 100, setScreen, setSel, setInfoCoin,
    });
    fireEvent.click(container.querySelector(".asset-card"));
    expect(setSel).toHaveBeenCalledWith(coin);
    expect(setScreen).toHaveBeenCalledWith("detail");
    expect(setInfoCoin).not.toHaveBeenCalled(); // background must not open CoinInfo
  });

  it("renders the value summary card (eyebrow + gain line + INVESTED/24H/ASSETS) and no live line", () => {
    const coin = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", thumb: "",
      entries: [{ id: "t1", type: "buy", amount: 2, priceAtBuy: 100, date: "2024-01-01" }] };
    provide(Portfolio, {
      portfolio: [coin], prices: { bitcoin: { usd: 150, usd_24h_change: 4 } },
      tv: 300, totalBuys: 200, tpnl: 100, tpp: 50,
    });
    expect(screen.getByText("Portfolio value")).toBeInTheDocument();
    expect(screen.getByText("Invested")).toBeInTheDocument();
    expect(screen.getByText("24h")).toBeInTheDocument();
    expect(screen.getByText("Assets")).toBeInTheDocument();
    // gain line carries the return + % together
    expect(screen.getByText(/\+\$100\.00 \(\+50\.00%\)/)).toBeInTheDocument();
    // the redundant "Prices updating live" line is gone (LIVE badge covers it)
    expect(screen.queryByText(/Prices updating live/)).toBeNull();
  });

  it("renders the switcher pills above the value card", () => {
    const { container } = provide(Portfolio, {
      portfolios: [{ id: "p1", name: "Portfolio 1" }, { id: "p2", name: "Portfolio 2" }],
      activePortId: "p1", maxPortfolios: 10, isPro: true,
    });
    const pills = container.querySelector(".port-pills");
    const card = container.querySelector(".value-card");
    expect(pills).toBeTruthy();
    expect(card).toBeTruthy();
    // pills come before the value card in document order
    expect(pills.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

  it("marks the active portfolio pill with the active class", () => {
    const { container } = provide(PortfolioBar, {
      portfolios: [{ id: "p1", name: "Main" }, { id: "p2", name: "Alt" }],
      activePortId: "p2", maxPortfolios: 10,
    });
    const active = container.querySelector(".port-pill.active");
    expect(active.textContent).toBe("Alt");
  });
});
