import { describe, it, expect } from "vitest";
import { trimUniverse, estimateSize } from "../../functions/universe-utils.js";

// C-R2b (C14): an oversized universe TRIMS its lowest-rank tail instead of
// throwing at Firestore's 1 MiB doc cap (a throw would break both front-ends).
const mkCoin = (rank) => ({ s: "SYM", n: "Coin " + rank, img: "x".repeat(60), rank, p: 1.23, ch: 0.5, mc: 1e9, v: 1e7, cs: 1e6, at: 1 });

describe("trimUniverse (C-R2b)", () => {
  it("leaves an under-limit universe untouched", () => {
    const coins = { bitcoin: mkCoin(1), ethereum: mkCoin(2) };
    const r = trimUniverse(coins, 100_000);
    expect(r.trimmed).toBe(0);
    expect(r.coins).toBe(coins);   // same reference — zero-cost pass-through
  });

  it("drops the WORST-ranked coins first until under the limit — never throws", () => {
    const coins = {};
    for (let i = 1; i <= 300; i++) coins["coin" + i] = mkCoin(i);
    const full = estimateSize(coins);
    const limit = Math.floor(full * 0.7);            // force ~30% off
    const r = trimUniverse(coins, limit);
    expect(r.trimmed).toBeGreaterThan(0);
    expect(r.size).toBeLessThanOrEqual(limit);
    expect(r.coins.coin1).toBeDefined();             // the top coins survive
    expect(r.coins.coin2).toBeDefined();
    expect(r.coins["coin300"]).toBeUndefined();      // the tail goes first
    expect(estimateSize(r.coins)).toBeLessThanOrEqual(limit);
  });

  it("treats rank:null as worst (trimmed before any ranked coin)", () => {
    const coins = { top: mkCoin(1), mid: mkCoin(100), ghost: mkCoin(null) };
    const limit = estimateSize(coins) - 10;          // just over → drop exactly one
    const r = trimUniverse(coins, limit);
    expect(r.coins.ghost).toBeUndefined();
    expect(r.coins.top).toBeDefined();
    expect(r.coins.mid).toBeDefined();
  });
});
