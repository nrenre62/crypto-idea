import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Isolate the hook from the network by mocking the api/ layer.
vi.mock("../../src/api/coingecko.js", () => ({
  fetchPrices: vi.fn(),
  searchCoins: vi.fn(),
}));
import { fetchPrices } from "../../src/api/coingecko.js";
import { useLivePrices } from "../../src/hooks/useLivePrices.js";

describe("useLivePrices", () => {
  beforeEach(() => vi.clearAllMocks());

  it("seeds built-in mock prices on mount and stays 'demo' with an empty portfolio", () => {
    const { result } = renderHook(() => useLivePrices([]));
    // bitcoin's mockPrice in utils/coins.js is 84000.
    expect(result.current.prices.bitcoin.usd).toBe(84000);
    expect(result.current.api).toBe("demo");
    expect(fetchPrices).not.toHaveBeenCalled(); // guard: no fetch with no holdings
  });

  it("polls live prices for held coins and flips api to 'live'", async () => {
    fetchPrices.mockResolvedValue({ bitcoin: { usd: 99999, usd_24h_change: 2, usd_market_cap: 1 } });
    const { result } = renderHook(() => useLivePrices([{ id: "bitcoin" }]));
    await waitFor(() => expect(result.current.api).toBe("live"));
    expect(fetchPrices).toHaveBeenCalledWith("bitcoin");
    expect(result.current.prices.bitcoin.usd).toBe(99999); // live overrides mock
  });
});
