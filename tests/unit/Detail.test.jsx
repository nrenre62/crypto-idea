import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppContext } from "../../src/hooks/app-context.js";
import { Detail } from "../../src/components/Detail.jsx";

// Detail is reached by opening a held coin, so we test it in isolation against the
// real AppContext. The P/L math runs on the provided entries.
function provide(value) {
  return render(
    <AppContext.Provider value={{
      prices: { bitcoin: { usd: 30000, usd_24h_change: 5, usd_market_cap: 6e11 } },
      setScreen: vi.fn(), setSel: vi.fn(),
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

  // R12-1: confirmDel is now Detail-LOCAL state (was app-level context) — drive it via
  // the trash button, not an injected prop. Trash is the last .icon-btn in the header.
  const arm = (c) => fireEvent.click(c.querySelector(".detail-head .icon-btn:last-child"));

  // R4-3: deleting a coin that has transactions warns first (transactions + thesis lost).
  it("trashing a coin WITH transactions shows the warning modal (no immediate delete)", () => {
    const remCoin = vi.fn();
    const { container } = provide({ sel: COIN, portfolio: [COIN], remCoin });
    expect(screen.queryByText("Remove")).toBeNull();
    expect(screen.queryByText("Delete Bitcoin?")).toBeNull();
    arm(container);
    expect(screen.getByText("Delete Bitcoin?")).toBeInTheDocument();
    expect(remCoin).not.toHaveBeenCalled();
  });

  it("the warning modal names the lost transactions + thesis and can't-undo", () => {
    const { container } = provide({ sel: COIN, portfolio: [COIN] });
    arm(container);
    expect(screen.getByText("Delete Bitcoin?")).toBeInTheDocument();
    const warn = document.querySelector(".dg-warn-text").textContent;
    expect(warn).toMatch(/2 buy\/sell transactions/i);
    expect(warn).toMatch(/thesis/i);
    expect(warn).toMatch(/can.t be undone/i);
  });

  it("'Cancel' dismisses the warning without deleting", () => {
    const remCoin = vi.fn();
    const { container } = provide({ sel: COIN, portfolio: [COIN], remCoin });
    arm(container);
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Delete Bitcoin?")).toBeNull();
    expect(remCoin).not.toHaveBeenCalled();
  });

  it("'Delete anyway' hard-deletes via remCoin", () => {
    const remCoin = vi.fn();
    const { container } = provide({ sel: COIN, portfolio: [COIN], remCoin });
    arm(container);
    fireEvent.click(screen.getByText("Delete anyway"));
    expect(remCoin).toHaveBeenCalledWith("bitcoin");
  });

  it("a coin with NO transactions uses the quick two-tap delete (Remove pill, no modal)", () => {
    const remCoin = vi.fn();
    const empty = { ...COIN, entries: [] };
    const { container } = provide({ sel: empty, portfolio: [empty], remCoin });
    arm(container); // arm → the inline Remove pill (no warning modal)
    expect(screen.queryByText("Delete anyway")).toBeNull();
    expect(document.querySelector(".dg-warn-text")).toBeNull();
    fireEvent.click(screen.getByText("Remove"));
    expect(remCoin).toHaveBeenCalledWith("bitcoin");
  });

  // R12-1: the armed flag must NOT survive leaving the screen (Detail unmount = navigation).
  it("R12-1: the armed delete state does not persist across leaving/returning", () => {
    const empty = { ...COIN, entries: [] };
    const { container, unmount } = provide({ sel: empty, portfolio: [empty] });
    arm(container);
    expect(screen.getByText("Remove")).toBeInTheDocument(); // armed
    unmount();                                              // navigate away
    const { container: c2 } = provide({ sel: empty, portfolio: [empty] }); // come back
    expect(screen.queryByText("Remove")).toBeNull();        // fresh: idle trash, not armed
    expect(c2.querySelector(".detail-head .icon-btn:last-child")).toBeTruthy();
  });

  // R12-2: the lightweight "Remove" pill (no-tx coin) auto-disarms after ~3s.
  it("R12-2: the 'Remove' pill auto-reverts to the trash after ~3s", () => {
    vi.useFakeTimers();
    try {
      const empty = { ...COIN, entries: [] };
      const { container } = provide({ sel: empty, portfolio: [empty] });
      arm(container);
      expect(screen.getByText("Remove")).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(3000); });
      expect(screen.queryByText("Remove")).toBeNull(); // reverted to the idle trash icon
    } finally {
      vi.useRealTimers();
    }
  });

  // ── R19-3: a single transaction deletes in TWO taps (arm → Delete? → confirm) ──
  it("R19-3: a transaction needs two taps to delete (arm, then confirm)", () => {
    const remEntry = vi.fn();
    provide({ sel: COIN, portfolio: [COIN], remEntry });
    const del = screen.getAllByRole("button", { name: "Delete transaction" });
    fireEvent.click(del[0]);                        // arm the top (newest) row
    expect(remEntry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Delete?"));   // confirm
    expect(remEntry).toHaveBeenCalledWith("bitcoin", "t2"); // t2 (Feb) sorts newest-on-top
  });

  it("R19-3: the armed 'Delete?' auto-disarms after ~3s", () => {
    vi.useFakeTimers();
    try {
      provide({ sel: COIN, portfolio: [COIN] });
      fireEvent.click(screen.getAllByRole("button", { name: "Delete transaction" })[0]);
      expect(screen.getByText("Delete?")).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(3100); });
      expect(screen.queryByText("Delete?")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  // ── R19-4: 50/page pagination with a windowed numbered pager ──
  it("R19-4: paginates the transaction list at 50/page", () => {
    const many = Array.from({ length: 120 }, (_, i) => ({
      id: "tx" + i, type: "buy", amount: 1, priceAtBuy: 100,
      date: "2024-01-01T00:" + String(i % 60).padStart(2, "0"), createdAt: i,
    }));
    const coin = { ...COIN, entries: many };
    const { container } = provide({ sel: coin, portfolio: [coin] });
    expect(container.querySelectorAll(".tx-list .tx-row").length).toBe(50); // page 1
    expect(screen.getByText("Transactions (120)")).toBeInTheDocument();      // header counts all
    expect(screen.getByRole("button", { name: "Page 3" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Page 4" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(container.querySelectorAll(".tx-list .tx-row").length).toBe(20);  // 120 - 100
  });

  it("R19-4: no pager for a single page (≤50 tx)", () => {
    const { container } = provide({ sel: COIN, portfolio: [COIN] });
    expect(container.querySelector(".tx-pager")).toBeNull();
  });

  // ── R19-9: on desktop the screen renders body-only (the Modal wraps it) ──
  it("R19-9: popup mode (isDesktop) drops screen-bg + the back-arrow, keeps the delete trash", () => {
    const { container } = provide({ sel: COIN, portfolio: [COIN], isDesktop: true });
    expect(container.querySelector(".detail-popup")).toBeTruthy();
    expect(container.querySelector(".screen-bg")).toBeNull();
    // header now holds only the delete trash (no back arrow) → a single .icon-btn
    expect(container.querySelectorAll(".detail-head .icon-btn").length).toBe(1);
  });

  // ── R22: tx rows — the TOTAL is the bold top number, the coin price sits below
  //         as "$price / SYMBOL", and the "Recv"/"Cost" labels are gone. ──
  it("R22: total on top (plain, both buy & sell), '$price / SYMBOL' below, no Recv/Cost", () => {
    const coin = {
      id: "bitcoin", symbol: "BTC", name: "Bitcoin",
      entries: [
        { id: "b1", type: "buy", amount: 2, priceAtBuy: 100, date: "2024-01-01T00:00" },
        { id: "s1", type: "sell", amount: 3, priceAtBuy: 84000, date: "2024-02-01T00:00" },
      ],
    };
    const { container } = provide({ sel: coin, portfolio: [coin] });
    const totals = [...container.querySelectorAll(".tx-rtotal")].map((n) => n.textContent);
    const prices = [...container.querySelectorAll(".tx-rprice")].map((n) => n.textContent);
    // (a) the bold top number is the TOTAL paid/received — amount × price, 2 dp, plain
    expect(totals).toContain("$200.00");      // 2 × $100 buy
    expect(totals).toContain("$252,000.00");  // 3 × $84,000 sell — same style, no sign
    // (b) the muted line below is the per-coin price + " / SYMBOL"
    expect(prices).toContain("$100.00 / BTC");
    expect(prices).toContain("$84,000.00 / BTC");
    // each row stacks total on top, price below
    const right = container.querySelector(".tx-right");
    expect(right.firstElementChild.className).toContain("tx-rtotal");
    // (c) the Recv/Cost labels are gone
    expect(screen.queryByText(/Recv/)).toBeNull();
    expect(screen.queryByText(/Cost \$/)).toBeNull();
    expect(container.querySelector(".tx-rcost")).toBeNull();
  });

  it("R22: a sub-$1 coin's price line keeps fmtP's adaptive precision", () => {
    const doge = {
      id: "dogecoin", symbol: "DOGE", name: "Dogecoin",
      entries: [{ id: "d1", type: "buy", amount: 1000, priceAtBuy: 0.0012, date: "2024-01-01T00:00" }],
    };
    const { container } = provide({
      sel: doge, portfolio: [doge],
      prices: { dogecoin: { usd: 0.001, usd_24h_change: 0 } },
    });
    // fmtP(0.0012) → $0.001200 (≥0.0001 → 6 dp) + " / DOGE"
    expect(container.querySelector(".tx-rprice").textContent).toBe("$0.001200 / DOGE");
    expect(container.querySelector(".tx-rtotal").textContent).toBe("$1.20"); // 1000 × 0.0012
  });
});
