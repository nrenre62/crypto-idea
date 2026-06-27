import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppContext } from "../../src/hooks/app-context.js";
import { CoinInfo } from "../../src/components/CoinInfo.jsx";

// CoinInfo is reached by tapping a coin, so we test it in isolation against the
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
  it("renders nothing when no coin is selected", () => {
    const { container } = provide({ infoCoin: null, portfolio: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the market-data section with the four mockup rows", () => {
    provide({ infoCoin: BTC, portfolio: [] });
    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
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
