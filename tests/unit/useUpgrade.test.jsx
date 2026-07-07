import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useUpgrade, TIER_LIMITS, dueDowngrade, limitsForTier, lockedPortfolioIds, lockedCoinIds } from "../../src/hooks/useUpgrade.js";

// Pure subscription-expiry decision (extracted from CryptoIdea.checkSubscriptionStatus).
describe("dueDowngrade", () => {
  const now = new Date("2026-06-16T00:00:00Z");
  it("returns null when there is no subscription", () => {
    expect(dueDowngrade(null, now)).toBe(null);
    expect(dueDowngrade(undefined, now)).toBe(null);
  });
  it("keeps the plan during the payment-failed grace period (<7 days)", () => {
    expect(dueDowngrade({ paymentFailed: true, paymentFailedDate: "2026-06-12T00:00:00Z" }, now)).toBe(null);
  });
  it("forces free after the 7-day payment-failed grace period", () => {
    expect(dueDowngrade({ paymentFailed: true, paymentFailedDate: "2026-06-01T00:00:00Z" }, now)).toBe("free");
  });
  it("downgrades a cancelled subscription once its end date passes", () => {
    expect(dueDowngrade({ cancelled: true, endDate: "2026-06-10T00:00:00Z", downgradeTo: "pro" }, now)).toBe("pro");
    expect(dueDowngrade({ cancelled: true, endDate: "2026-06-10T00:00:00Z" }, now)).toBe("free"); // default
  });
  it("keeps a cancelled subscription still within its paid period", () => {
    expect(dueDowngrade({ cancelled: true, endDate: "2026-07-01T00:00:00Z" }, now)).toBe(null);
  });
});

// Build `n` buy transactions.
const mkEntries = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: "e" + i, type: "buy", amount: 1, date: "2020-01-01" }));

// A free-tier overflow: 2 portfolios (free allows 1); p1 has 12 coins (allows 10),
// and its first coin has 55 tx (allows 50). p2 holds 1 coin / 3 tx and is over whole.
const overflowPorts = () => [
  {
    id: "p1", name: "P1", coins: [
      { id: "c1", entries: mkEntries(55) },
      ...Array.from({ length: 11 }, (_, i) => ({ id: "x" + i, entries: [] })),
    ],
  },
  { id: "p2", name: "P2", coins: [{ id: "c2", entries: mkEntries(3) }] },
];

function setup(portfolios = [], plans = null) {
  const view = renderHook(() => useUpgrade({ portfolios, plans }));
  return { view };
}

// U10: the over-limit derivation uses the SAME (configured) limits the rules enforce,
// clamped to the product hard-max — not the hardcoded TIER_LIMITS defaults.
describe("limitsForTier (configured caps win, clamped to hard-max)", () => {
  it("falls back to the built-in defaults when no plans are configured", () => {
    expect(limitsForTier("free", null)).toEqual({ ports: 1, coins: 10, tx: 50 });
    expect(limitsForTier("pro", undefined)).toEqual({ ports: 3, coins: 50, tx: 2000 });
  });
  it("admin-configured plan values override the defaults", () => {
    expect(limitsForTier("free", { free: { portfolios: 2, coins: 20, transactions: 100 } }))
      .toEqual({ ports: 2, coins: 20, tx: 100 });
  });
  it("clamps a configured value to the hard-max (coins can never exceed 1,000)", () => {
    expect(limitsForTier("premium", { premium: { coins: 5000 } }))
      .toEqual({ ports: 15, coins: 1000, tx: 5000 });
  });
  it("returns null for an unknown tier", () => {
    expect(limitsForTier("bogus", null)).toBeNull();
  });
});

// DI-4: the grey-lock derivation — WHICH items are over the cap (locked, never deleted).
describe("lockedPortfolioIds / lockedCoinIds", () => {
  it("locks portfolios beyond the cap by order (oldest kept)", () => {
    const ports = [{ id: "p1", coins: [] }, { id: "p2", coins: [] }, { id: "p3", coins: [] }];
    expect([...lockedPortfolioIds(ports, 1)]).toEqual(["p2", "p3"]);   // free: keep 1
    expect([...lockedPortfolioIds(ports, 3)]).toEqual([]);             // pro: all fit
  });
  it("locks the coins over the coin cap in a portfolio (the overflow)", () => {
    const coins = Array.from({ length: 12 }, (_, i) => ({ id: "c" + i }));
    expect([...lockedCoinIds(coins, 10)]).toEqual(["c10", "c11"]);     // keep first 10, lock the rest
    expect([...lockedCoinIds(coins, 50)]).toEqual([]);                 // all fit
  });
  it("is null-safe (no cap / empty inputs → empty set)", () => {
    expect([...lockedPortfolioIds(null, undefined)]).toEqual([]);
    expect([...lockedCoinIds(undefined, undefined)]).toEqual([]);
  });
});

describe("useUpgrade", () => {
  describe("calcEndDate", () => {
    it("yearly is ~12 months out, monthly is ~1 month out, both in the future", () => {
      const { view } = setup();
      const now = Date.now();
      const yearly = new Date(view.result.current.calcEndDate("yearly")).getTime();
      const monthly = new Date(view.result.current.calcEndDate("monthly")).getTime();
      expect(monthly).toBeGreaterThan(now);
      expect(yearly).toBeGreaterThan(monthly);
      const monthDays = (monthly - now) / 86400000;
      expect(monthDays).toBeGreaterThanOrEqual(27);
      expect(monthDays).toBeLessThanOrEqual(32);
    });
  });

  describe("overLimitImpact (locked, not deleted)", () => {
    it("returns null for an unknown tier", () => {
      const { view } = setup(overflowPorts());
      expect(view.result.current.overLimitImpact("bogus")).toBeNull();
    });

    it("counts over-limit portfolios, coins, and transactions for a downgrade", () => {
      const { view } = setup(overflowPorts());
      // free: 1 port, 10 coins, 50 tx.
      //   ports: 2 - 1 = 1
      //   coins: (12 - 10 in p1) + (1 whole coin in over p2) = 3
      //   tx:    (55 - 50 in c1) + (3 in over p2's coin)      = 8
      expect(view.result.current.overLimitImpact("free")).toEqual({
        portsOver: 1, coinsOver: 3, txOver: 8,
      });
    });

    it("reports nothing over-limit when already within limits", () => {
      const { view } = setup([{ id: "p1", name: "P1", coins: [{ id: "c1", entries: mkEntries(2) }] }]);
      expect(view.result.current.overLimitImpact("free")).toEqual({
        portsOver: 0, coinsOver: 0, txOver: 0,
      });
    });

    it("locks LESS when an admin has raised the configured caps (U10 fix)", () => {
      // Admin raised free to 2 ports / 20 coins, tx left at 50. The same overflow that
      // would over-shoot 1 port + 3 coins + 8 tx against hardcoded defaults now only has
      // the 5 over-cap transactions over the limit.
      const { view } = setup(overflowPorts(), { free: { portfolios: 2, coins: 20, transactions: 50 } });
      expect(view.result.current.overLimitImpact("free")).toEqual({
        portsOver: 0, coinsOver: 0, txOver: 5,
      });
    });
  });

  it("no longer exposes the destructive trimToTier (retired by DI-4/D3)", () => {
    const { view } = setup(overflowPorts());
    expect(view.result.current.trimToTier).toBeUndefined();
  });
});
