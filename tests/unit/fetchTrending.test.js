import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchTrending } from "../../src/api/coingecko.js";

// DP-6 — fetchTrending hits the cached /api/trending proxy and returns the coins
// array (or null on any failure, like the sibling fetchers). Mock global fetch.
const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; vi.restoreAllMocks(); });

describe("fetchTrending", () => {
  it("returns the coins array on a 200 and calls /api/trending", async () => {
    const coins = [{ id: "solana", symbol: "SOL", name: "Solana", thumb: "", rank: 7 }];
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ coins }) });
    const r = await fetchTrending();
    expect(r).toEqual(coins);
    expect(global.fetch).toHaveBeenCalledWith("/api/trending");
  });

  it("returns null on a non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    expect(await fetchTrending()).toBeNull();
  });

  it("returns null on a network error (never throws)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await fetchTrending()).toBeNull();
  });

  it("returns null when the payload has no coins array", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    expect(await fetchTrending()).toBeNull();
  });
});
