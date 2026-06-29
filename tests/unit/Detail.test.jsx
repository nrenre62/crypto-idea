import { render, screen, fireEvent } from "@testing-library/react";
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
      startAddTx: vi.fn(),
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

  // R4-2: Buy/Sell route through the shared startAddTx helper.
  it("the Buy and Sell buttons open Add-transaction via startAddTx", () => {
    const startAddTx = vi.fn();
    provide({ sel: COIN, portfolio: [COIN], startAddTx });
    fireEvent.click(screen.getByText("+ Buy"));
    expect(startAddTx).toHaveBeenCalledWith(COIN, "buy");
    fireEvent.click(screen.getByText("- Sell"));
    expect(startAddTx).toHaveBeenCalledWith(COIN, "sell");
  });

  // R4-3: deleting a coin that has transactions warns first (transactions + thesis lost).
  it("trashing a coin WITH transactions requests a confirm (no immediate delete)", () => {
    const setConfirmDel = vi.fn(), remCoin = vi.fn();
    const { container } = provide({ sel: COIN, portfolio: [COIN], confirmDel: false, setConfirmDel, remCoin });
    // header shows the trash icon (not a quick Remove pill) for a coin with entries
    expect(screen.queryByText("Remove")).toBeNull();
    fireEvent.click(container.querySelector(".detail-head .icon-btn:last-child"));
    expect(setConfirmDel).toHaveBeenCalledWith(true);
    expect(remCoin).not.toHaveBeenCalled();
  });

  it("the warning modal names the lost transactions + thesis and can't-undo", () => {
    provide({ sel: COIN, portfolio: [COIN], confirmDel: true });
    expect(screen.getByText("Delete Bitcoin?")).toBeInTheDocument();
    const warn = document.querySelector(".dg-warn-text").textContent;
    expect(warn).toMatch(/2 buy\/sell transactions/i);
    expect(warn).toMatch(/thesis/i);
    expect(warn).toMatch(/can.t be undone/i);
  });

  it("'Cancel' dismisses the warning without deleting", () => {
    const setConfirmDel = vi.fn(), remCoin = vi.fn();
    provide({ sel: COIN, portfolio: [COIN], confirmDel: true, setConfirmDel, remCoin });
    fireEvent.click(screen.getByText("Cancel"));
    expect(setConfirmDel).toHaveBeenCalledWith(false);
    expect(remCoin).not.toHaveBeenCalled();
  });

  it("'Delete anyway' hard-deletes via remCoin", () => {
    const remCoin = vi.fn();
    provide({ sel: COIN, portfolio: [COIN], confirmDel: true, remCoin });
    fireEvent.click(screen.getByText("Delete anyway"));
    expect(remCoin).toHaveBeenCalledWith("bitcoin");
  });

  it("a coin with NO transactions keeps the quick two-tap delete (no modal)", () => {
    const remCoin = vi.fn();
    const empty = { ...COIN, entries: [] };
    provide({ sel: empty, portfolio: [empty], confirmDel: true, remCoin });
    // no warning modal for a transaction-less coin
    expect(screen.queryByText("Delete anyway")).toBeNull();
    expect(document.querySelector(".dg-warn-text")).toBeNull();
    // the quick inline "Remove" pill deletes directly
    fireEvent.click(screen.getByText("Remove"));
    expect(remCoin).toHaveBeenCalledWith("bitcoin");
  });
});
