import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppContext } from "../../src/hooks/app-context.js";
import { Detail } from "../../src/components/Detail.jsx";

// Detail is reached by opening a held coin, so we test it in isolation against the
// real AppContext. The P/L math runs on the provided entries.
function provide(value) {
  return render(
    <AppContext.Provider value={{
      prices: { bitcoin: { usd: 30000, usd_24h_change: 5, usd_market_cap: 6e11 } },
      setScreen: vi.fn(), setSel: vi.fn(), confirmDel: false, setConfirmDel: vi.fn(),
      remCoin: vi.fn(), remEntry: vi.fn(), setEditEntry: vi.fn(), setETxType: vi.fn(),
      setEPrice: vi.fn(), setEAmt: vi.fn(), setEDate: vi.fn(),
      ...value,
    }}>
      <Detail />
    </AppContext.Provider>
  );
}

const COIN = {
  id: "bitcoin", symbol: "BTC", name: "Bitcoin",
  entries: [
    { id: "t1", type: "buy", amount: 1, priceAtBuy: 20000, date: "2024-01-01T00:00" },
    { id: "t2", type: "buy", amount: 1, priceAtBuy: 10000, date: "2024-02-01T00:00" },
  ],
};

describe("Detail screen (extracted, via AppContext)", () => {
  it("renders nothing when no coin is selected", () => {
    const { container } = provide({ sel: null, portfolio: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders holdings, P/L summary, and the transaction list for a held coin", () => {
    provide({ sel: COIN, portfolio: [COIN] });
    expect(screen.getByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByText("Holding")).toBeInTheDocument();
    expect(screen.getByText("Total P/L")).toBeInTheDocument();
    // 2 BTC held, value 2 * $30,000 = $60,000
    expect(screen.getByText("$60,000.00")).toBeInTheDocument();
    // header counts the two transactions
    expect(screen.getByText("Transactions (2)")).toBeInTheDocument();
  });

  it("shows the empty state when the coin has no transactions", () => {
    provide({ sel: { ...COIN, entries: [] }, portfolio: [{ ...COIN, entries: [] }] });
    expect(screen.getByText("No transactions yet.")).toBeInTheDocument();
  });
});
