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

  it("renders the market-data overview for a coin", () => {
    provide({ infoCoin: BTC, portfolio: [] });
    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByText("Market Data")).toBeInTheDocument();
    expect(screen.getByText("Market Cap")).toBeInTheDocument();
  });

  it("hides 'Your Position' when the coin is not held", () => {
    provide({ infoCoin: BTC, portfolio: [] });
    expect(screen.queryByText("Your Position")).not.toBeInTheDocument();
  });

  it("shows 'Your Position' with holdings when the coin is held", () => {
    const held = { id: "bitcoin", symbol: "BTC", name: "Bitcoin", entries: [
      { id: "t1", type: "buy", amount: 2, priceAtBuy: 100, date: "2024-01-01" },
    ] };
    provide({ infoCoin: BTC, portfolio: [held] });
    expect(screen.getByText("Your Position")).toBeInTheDocument();
    expect(screen.getByText("View Transactions")).toBeInTheDocument();
  });
});
