import { describe, it, expect } from "vitest";
import { _cacheGet, _cachePut, HISTORY_CACHE_MAX } from "../../src/hooks/useCoinHistory.js";

// C-A2: the module-level history cache is LRU-capped (~50 coins) — it grew
// unbounded for the whole session before (each entry ≈ a year of daily prices).
describe("useCoinHistory LRU cache (C-A2)", () => {
  it("evicts the least-recently-used coin once past the cap", () => {
    for (let i = 0; i < HISTORY_CACHE_MAX; i++) _cachePut("coin" + i, [[i, i]]);
    expect(_cacheGet("coin0")).toEqual([[0, 0]]);        // still cached (at cap)
    _cachePut("overflow", [[99, 99]]);                   // one past the cap…
    // coin0 was just READ (recency refreshed), so the eviction victim is coin1.
    expect(_cacheGet("coin1")).toBeNull();
    expect(_cacheGet("coin0")).toEqual([[0, 0]]);
    expect(_cacheGet("overflow")).toEqual([[99, 99]]);
  });

  it("re-putting an existing id refreshes it without evicting anything", () => {
    _cachePut("coin2", [[2, 2]]);                        // refresh an existing entry
    expect(_cacheGet("coin3")).not.toBeNull();           // nothing else evicted
    expect(_cacheGet("coin2")).toEqual([[2, 2]]);
  });
});
