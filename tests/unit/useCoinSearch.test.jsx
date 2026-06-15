import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/api/coingecko.js", () => ({
  fetchPrices: vi.fn(),
  searchCoins: vi.fn(),
}));
import { searchCoins } from "../../src/api/coingecko.js";
import { useCoinSearch } from "../../src/hooks/useCoinSearch.js";

describe("useCoinSearch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns built-in matches immediately (before any live result)", () => {
    searchCoins.mockResolvedValue(null);
    const { result } = renderHook(() => useCoinSearch("sol"));
    // "sol" matches Solana in the built-in TOP_COINS list.
    expect(result.current.some(c => c.id === "solana")).toBe(true);
  });

  it("merges live results after the debounce, deduped against built-in matches", async () => {
    searchCoins.mockResolvedValue([
      { id: "solana", symbol: "SOL", name: "Solana" }, // dup of built-in match
      { id: "solana-new-thing", symbol: "SNT", name: "Sol New Thing" }, // live-only
    ]);
    const { result } = renderHook(() => useCoinSearch("sol"));
    await waitFor(() => expect(result.current.find(c => c.id === "solana-new-thing")).toBeTruthy());
    // Solana appears once (built-in), not duplicated by the live result.
    expect(result.current.filter(c => c.id === "solana").length).toBe(1);
  });

  it("returns nothing for an empty query and does not hit the network", () => {
    const { result } = renderHook(() => useCoinSearch(""));
    expect(result.current).toEqual([]);
    expect(searchCoins).not.toHaveBeenCalled();
  });
});
