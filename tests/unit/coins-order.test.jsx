import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { applyCoinOrder } from "../../src/features/research/utils/portfolio.js";

// CoinCard/EmptyState pull in the wider feature; stub them so the sort-mode test is isolated.
vi.mock("../../src/features/research/components/CoinCard", () => ({
  default: ({ holding }) => <div data-testid="coin-card">{holding.name}</div>,
}));
vi.mock("../../src/features/research/components/EmptyState", () => ({ default: () => <div>empty</div> }));
import CoinsView from "../../src/features/research/components/CoinsView.jsx";

// R32-2: the pure order model — listed ids first, everything else value-desc; stale ids
// skipped; a coin added later lands at the end; empty/absent order = the value-desc default.
describe("applyCoinOrder", () => {
  const H = [{ id: "btc" }, { id: "eth" }, { id: "sol" }];   // value-desc (as computePortfolio returns)
  it("returns the holdings unchanged when the order is empty/absent", () => {
    expect(applyCoinOrder(H, [])).toBe(H);
    expect(applyCoinOrder(H, undefined)).toBe(H);
    expect(applyCoinOrder(H, null)).toBe(H);
  });
  it("puts listed ids first (in order), the rest value-desc after", () => {
    expect(applyCoinOrder(H, ["sol", "btc"]).map((h) => h.id)).toEqual(["sol", "btc", "eth"]);
  });
  it("skips ids no longer held, and puts a newly-added coin (not in the order) at the end", () => {
    // order references a sold coin ("doge") and omits a new coin ("eth")
    expect(applyCoinOrder(H, ["doge", "sol"]).map((h) => h.id)).toEqual(["sol", "btc", "eth"]);
  });
  it("de-dups repeated ids in the order", () => {
    expect(applyCoinOrder(H, ["btc", "btc", "eth"]).map((h) => h.id)).toEqual(["btc", "eth", "sol"]);
  });
});

// R32-1: the Coins view Sort mode — a real button toggling drag handles + Done/Reset, with
// the saved order applied.
describe("CoinsView sort mode", () => {
  const holdings = [{ id: "btc", name: "Bitcoin", sym: "btc" }, { id: "eth", name: "Ethereum", sym: "eth" }];
  it("Sort toggles a drag list; the saved order is applied; Done/Reset show", () => {
    const onReorder = vi.fn();
    render(<CoinsView holdings={holdings} coinOrder={["eth", "btc"]} onReorder={onReorder} empty={false} onAsk={vi.fn()} />);
    // Not sorting yet: the card grid renders, with a Sort button.
    expect(screen.getByRole("button", { name: "Sort" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sort" }));
    // Sort mode: Done + Reset appear, plus a drag handle per coin, ordered by coinOrder.
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset to auto" })).toBeInTheDocument();
    const handles = screen.getAllByRole("button", { name: /Reorder/ });
    expect(handles).toHaveLength(2);
    // The saved order ["eth","btc"] is reflected: Ethereum row before Bitcoin row.
    const names = screen.getAllByText(/Bitcoin|Ethereum/).map((n) => n.textContent);
    expect(names).toEqual(["Ethereum", "Bitcoin"]);
    // ArrowDown on the first handle moves Ethereum below Bitcoin → persists the new order.
    fireEvent.keyDown(handles[0], { key: "ArrowDown" });
    expect(onReorder).toHaveBeenCalledWith(["btc", "eth"]);
  });
  it("Reset to auto clears the custom order (onReorder with [])", () => {
    const onReorder = vi.fn();
    render(<CoinsView holdings={holdings} coinOrder={["eth", "btc"]} onReorder={onReorder} empty={false} onAsk={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Sort" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset to auto" }));
    expect(onReorder).toHaveBeenCalledWith([]);
  });
});
