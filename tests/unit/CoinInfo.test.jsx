import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// R25-4: CoinInfo fetches a non-held coin's cached price once (flat-cost /api/prices).
const fetchPrices = vi.fn().mockResolvedValue(null);
vi.mock("../../src/api/coingecko.js", () => ({ fetchPrices: (...a) => fetchPrices(...a) }));

import { AppContext } from "../../src/hooks/app-context.js";
import { CoinInfo } from "../../src/components/CoinInfo.jsx";
import { fireEvent } from "@testing-library/react";

// CoinInfo is reached by tapping a coin icon, so we test it in isolation against the
// real AppContext. "bitcoin" exists in utils/coins.js (TOP_COINS + PRICE_HISTORY),
// so the market-data + price-history sections render from real reference data.
function provide(value) {
  return render(
    <AppContext.Provider value={{
      prices: {}, setSel: vi.fn(), setScreen: vi.fn(), setInfoCoin: vi.fn(),
      ...value,
    }}>
      <CoinInfo />
    </AppContext.Provider>
  );
}

const BTC = { id: "bitcoin", symbol: "BTC", name: "Bitcoin" };

describe("CoinInfo screen (extracted, via AppContext)", () => {
  beforeEach(() => { fetchPrices.mockClear(); fetchPrices.mockResolvedValue(null); });

  it("renders nothing when no coin is selected", () => {
    const { container } = provide({ infoCoin: null, portfolio: [] });
    expect(container).toBeEmptyDOMElement();
  });

  // ── R25-3: always body-only (the Modal supplies the title + X on every device) ──
  it("R25-3: renders body-only — no screen-bg, no back button, no in-body title bar", () => {
    const { container } = provide({ infoCoin: BTC, portfolio: [] });
    expect(container.querySelector(".detail-popup")).toBeTruthy();
    expect(container.querySelector(".screen-bg")).toBeNull();
    expect(container.querySelector(".icon-btn")).toBeNull();   // no back arrow
    expect(container.querySelector(".dh-title")).toBeNull();   // Modal carries the title
  });

  // ── R25-5: Transactions = accent pill, held coins only ──
  it("R25-5: the Transactions button shows only for a HELD coin, styled as the accent pill", () => {
    // not held → no button (a Search coin has no transactions to show)
    provide({ infoCoin: BTC, portfolio: [] });
    expect(screen.queryByText("Transactions")).toBeNull();
  });

  it("R25-5: for a held coin, Transactions is the accent pill and opens Detail", () => {
    const held = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", entries: [
      { id: "t1", type: "buy", amount: 1, priceAtBuy: 100, date: "2024-01-01" },
    ] };
    const setSel = vi.fn(), setScreen = vi.fn(), setInfoCoin = vi.fn();
    provide({ infoCoin: BTC, portfolio: [held], setSel, setScreen, setInfoCoin,
      prices: { bitcoin: { usd: 200, usd_24h_change: 0 } } });
    const btn = screen.getByText("Transactions");
    expect(btn.className).toContain("j-edit-btn");   // the thesis-Edit accent look
    fireEvent.click(btn);
    expect(setSel).toHaveBeenCalledWith(held);
    expect(setScreen).toHaveBeenCalledWith("detail");
    expect(setInfoCoin).toHaveBeenCalledWith(null);
  });

  // ── R25-4: a non-held coin (absent from prices) fetches its cached price once ──
  it("R25-4: fetches /api/prices for a coin not in the live map and renders the data", async () => {
    fetchPrices.mockResolvedValue({
      bitcoin: { usd: 61000, usd_24h_change: 2, usd_market_cap: 1.2e12, usd_24h_vol: 3.9e10,
        circulating: 20000000, usd_market_cap_rank: 1 },
    });
    provide({ infoCoin: BTC, portfolio: [], prices: {} });
    expect(fetchPrices).toHaveBeenCalledWith(["bitcoin"]);
    // real market data replaces the "—" fallbacks once the fetch lands
    expect(await screen.findByText("$39.00B")).toBeInTheDocument();            // 24h volume
    expect(screen.getByText("20,000,000 BTC")).toBeInTheDocument();            // circulating
  });

  it("R25-4: a held coin (already in prices) does NOT refetch", () => {
    provide({ infoCoin: BTC, portfolio: [],
      prices: { bitcoin: { usd: 30000, usd_24h_change: 5, usd_market_cap: 6e11 } } });
    expect(fetchPrices).not.toHaveBeenCalled();
  });

  it("R23/R25: the live usd_market_cap_rank drives the Rank rows", () => {
    provide({ infoCoin: BTC, portfolio: [],
      prices: { bitcoin: { usd: 30000, usd_24h_change: 5, usd_market_cap: 6e11, usd_market_cap_rank: 1 } } });
    expect(screen.getAllByText(/Rank #1|^#1$/).length).toBeGreaterThan(0);
  });

  it("renders the market-data section with the four mockup rows", () => {
    provide({ infoCoin: BTC, portfolio: [] });
    // R25-3: body-only — the coin NAME lives in the Modal header now; the body
    // shows the symbol (+ rank) in the price hero.
    expect(screen.getByText(/BTC/)).toBeInTheDocument();
    expect(screen.getByText("Market Data")).toBeInTheDocument();
    expect(screen.getByText("Rank")).toBeInTheDocument();
    expect(screen.getByText("Market cap")).toBeInTheDocument();
    expect(screen.getByText("24h volume")).toBeInTheDocument();
    expect(screen.getByText("Circulating")).toBeInTheDocument();
  });

  it("shows an em-dash (never NaN) for volume + circulating when the feed omits them", () => {
    // prices:{} → bitcoin falls back to TOP_COINS mock (price/mcap only, no vol/supply)
    provide({ infoCoin: BTC, portfolio: [] });
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("renders real 24h volume + circulating when the feed supplies them", () => {
    provide({ infoCoin: BTC, portfolio: [],
      prices: { bitcoin: { usd: 30000, usd_24h_change: 5, usd_market_cap: 6e11, usd_24h_vol: 2.5e10, circulating: 19000000 } } });
    expect(screen.getByText("$25.00B")).toBeInTheDocument();        // fmtMc(2.5e10) → 24h volume
    expect(screen.getByText("19,000,000 BTC")).toBeInTheDocument(); // circulating + symbol
  });

  it("hides 'Your Position' when the coin is not held", () => {
    provide({ infoCoin: BTC, portfolio: [] });
    expect(screen.queryByText("Your Position")).not.toBeInTheDocument();
  });

  it("shows 'Your Position' with Held / Avg cost / Unrealised P/L when held", () => {
    const held = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", entries: [
      { id: "t1", type: "buy", amount: 2, priceAtBuy: 100, date: "2024-01-01" },
    ] };
    provide({ infoCoin: BTC, portfolio: [held],
      prices: { bitcoin: { usd: 200, usd_24h_change: 0, usd_market_cap: 6e11 } } });
    expect(screen.getByText("Your Position")).toBeInTheDocument();
    expect(screen.getByText("Held")).toBeInTheDocument();
    expect(screen.getByText("2 BTC")).toBeInTheDocument();
    expect(screen.getByText("Avg cost")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("Unrealised P/L")).toBeInTheDocument();
    // held 2 @ avg $100 = $200 cost basis; now 2 @ $200 = $400 → +$200.00 (+100.00%)
    expect(screen.getByText("+$200.00 (+100.00%)")).toBeInTheDocument();
  });
});
