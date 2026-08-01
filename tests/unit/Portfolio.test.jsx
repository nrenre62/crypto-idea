import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  // R4-2/R25: split click zones — the coin IMAGE opens the Coin-info overlay (via the
  // shared CoinIcon → openCoinInfo); the card BACKGROUND opens Detail.
  it("tapping the coin image opens CoinInfo via openCoinInfo (not the whole card)", () => {
    const coin = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", thumb: "",
      entries: [{ id: "t1", type: "buy", amount: 1, priceAtBuy: 100, date: "2024-01-01" }] };
    const setScreen = vi.fn(), openCoinInfo = vi.fn(), startAddTx = vi.fn();
    const { container } = provide(Portfolio, {
      portfolio: [coin], prices: { bitcoin: { usd: 100, usd_24h_change: 1 } }, tv: 100, setScreen, openCoinInfo, startAddTx,
    });
    fireEvent.click(container.querySelector(".asset-card .coin-ic"));
    expect(openCoinInfo).toHaveBeenCalledWith(coin);
    expect(setScreen).not.toHaveBeenCalled();   // R25-3: an overlay now, not a screen jump
    expect(startAddTx).not.toHaveBeenCalled();  // image tap must not also open Add-transaction
  });

  it("tapping the card background opens the Detail screen (position + transactions)", () => {
    const coin = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", thumb: "",
      entries: [{ id: "t1", type: "buy", amount: 1, priceAtBuy: 100, date: "2024-01-01" }] };
    const setScreen = vi.fn(), setSel = vi.fn(), openCoinInfo = vi.fn();
    const { container } = provide(Portfolio, {
      portfolio: [coin], prices: { bitcoin: { usd: 100, usd_24h_change: 1 } }, tv: 100, setScreen, setSel, openCoinInfo,
    });
    fireEvent.click(container.querySelector(".asset-card"));
    expect(setSel).toHaveBeenCalledWith(coin);
    expect(setScreen).toHaveBeenCalledWith("detail");
    expect(openCoinInfo).not.toHaveBeenCalled(); // background must not open CoinInfo
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

  // LOGO (BUILD-LOOP item 4): the header now carries the shared <Logo> (green "C"
  // tile + "CryptoIdea") instead of the serif "Crypto Idea" text; the BETA + plan
  // badges stay beside it.
  it("renders the unified <Logo> in the header, badges intact, no old 'Crypto Idea' text", () => {
    const { container } = provide(Portfolio, {});
    const title = container.querySelector(".apphead .title");
    expect(title).toBeTruthy();
    expect(title.querySelector(".ci-logo")).toBeTruthy();
    expect(title.querySelector(".ci-logo-word").textContent).toBe("CryptoIdea");
    expect(title.querySelector(".beta").textContent).toBe("BETA");
    expect(title.querySelector(".badge-plan")).toBeTruthy();
    // the old two-word serif wordmark is gone (the mark reads "CryptoIdea")
    expect(title.textContent).not.toContain("Crypto Idea");
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

  // R9-3: the "+" pill opens a centered "New portfolio" dialog (not a jump to Settings).
  const addCtx = (over) => ({
    portfolios: [{ id: "p1", name: "Main" }], isPro: true, maxPortfolios: 3,
    newPortName: "", setNewPortName: vi.fn(), addPortfolio: vi.fn(), ...over,
  });

  it("the + pill opens the New portfolio dialog (R9-3)", () => {
    provide(PortfolioBar, addCtx());
    fireEvent.click(screen.getByLabelText("Add portfolio"));
    expect(screen.getByText("New portfolio")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Portfolio name")).toBeInTheDocument();
  });

  it("Save calls addPortfolio and closes the dialog on success (R9-3)", async () => {
    const addPortfolio = vi.fn().mockResolvedValue(true);
    provide(PortfolioBar, addCtx({ addPortfolio, newPortName: "Alts" }));
    fireEvent.click(screen.getByLabelText("Add portfolio"));
    fireEvent.click(screen.getByText("Save"));
    expect(addPortfolio).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText("New portfolio")).toBeNull());
  });

  it("X closes the dialog without adding (R9-3)", () => {
    const addPortfolio = vi.fn();
    provide(PortfolioBar, addCtx({ addPortfolio }));
    fireEvent.click(screen.getByLabelText("Add portfolio"));
    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByText("New portfolio")).toBeNull();
    expect(addPortfolio).not.toHaveBeenCalled();
  });

  it("the ✎ pill renames the ACTIVE portfolio via startRename (R19-2)", () => {
    const startRename = vi.fn();
    provide(PortfolioBar, addCtx({ startRename, activePortId: "p1" }));
    fireEvent.click(screen.getByLabelText("Rename active portfolio"));
    expect(startRename).toHaveBeenCalledWith("p1");
  });
});
