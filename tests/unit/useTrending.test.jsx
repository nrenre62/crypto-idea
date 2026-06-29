import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// DP-6 — useTrending loads trending coins once (module-cached) and returns the array,
// staying empty (offline-degrade) when the fetch yields nothing. The hook has a
// module-level cache, so reset modules between tests to test the load path each time.
const fetchTrending = vi.fn();
vi.mock("../../src/api/coingecko.js", () => ({ fetchTrending: (...a) => fetchTrending(...a) }));

beforeEach(() => { vi.resetModules(); fetchTrending.mockReset(); });

describe("useTrending (DP-6)", () => {
  it("loads trending coins on mount", async () => {
    const coins = [{ id: "solana", symbol: "SOL", name: "Solana", thumb: "", rank: 7 }];
    fetchTrending.mockResolvedValue(coins);
    const { useTrending } = await import("../../src/hooks/useTrending.js");
    const { result } = renderHook(() => useTrending());
    await waitFor(() => expect(result.current).toEqual(coins));
  });

  it("returns an empty array (never throws) when the fetch yields nothing", async () => {
    fetchTrending.mockResolvedValue(null);
    const { useTrending } = await import("../../src/hooks/useTrending.js");
    const { result } = renderHook(() => useTrending());
    await new Promise((r) => setTimeout(r, 10));   // let the effect settle
    expect(result.current).toEqual([]);
  });
});
