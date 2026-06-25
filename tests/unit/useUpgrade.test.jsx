import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useUpgrade, TIER_LIMITS, dueDowngrade, limitsForTier } from "../../src/hooks/useUpgrade.js";

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

// Build `n` buy transactions with sortable ids/dates so "keep most recent" is testable.
const mkEntries = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: "e" + i, type: "buy", amount: 1, date: "2020-01-01" }));

// A free-tier overflow: 2 portfolios (free allows 1); p1 has 12 coins (allows 10),
// and its first coin has 55 tx (allows 50). p2 holds 1 coin / 3 tx and is dropped whole.
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
  const setPortfolios = vi.fn();
  const view = renderHook(() => useUpgrade({ portfolios, setPortfolios, plans }));
  return { setPortfolios, view };
}

// U10: the downgrade trim must use the SAME (configured) limits the rules enforce,
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

  describe("getTrimImpact", () => {
    it("returns null for an unknown tier", () => {
      const { view } = setup(overflowPorts());
      expect(view.result.current.getTrimImpact("bogus")).toBeNull();
    });

    it("counts over-limit portfolios, coins, and transactions for a downgrade", () => {
      const { view } = setup(overflowPorts());
      // free: 1 port, 10 coins, 50 tx.
      //   ports: 2 - 1 = 1
      //   coins: (12 - 10 in p1) + (1 whole coin in dropped p2) = 3
      //   tx:    (55 - 50 in c1) + (3 in dropped p2's coin)     = 8
      expect(view.result.current.getTrimImpact("free")).toEqual({
        portsToDelete: 1, coinsToDelete: 3, txToDelete: 8,
      });
    });

    it("reports nothing to delete when already within limits", () => {
      const { view } = setup([{ id: "p1", name: "P1", coins: [{ id: "c1", entries: mkEntries(2) }] }]);
      expect(view.result.current.getTrimImpact("free")).toEqual({
        portsToDelete: 0, coinsToDelete: 0, txToDelete: 0,
      });
    });

    it("deletes LESS when an admin has raised the configured caps (U10 fix)", () => {
      // Admin raised free to 2 ports / 20 coins, tx left at 50. The same overflow that
      // would lose 1 port + 3 coins + 8 tx against hardcoded defaults now only sheds
      // the 5 over-cap transactions — no silent deletion of admin-permitted data.
      const { view } = setup(overflowPorts(), { free: { portfolios: 2, coins: 20, transactions: 50 } });
      expect(view.result.current.getTrimImpact("free")).toEqual({
        portsToDelete: 0, coinsToDelete: 0, txToDelete: 5,
      });
    });
  });

  describe("trimToTier", () => {
    it("does nothing for an unknown tier", () => {
      const { setPortfolios, view } = setup(overflowPorts());
      act(() => view.result.current.trimToTier("bogus"));
      expect(setPortfolios).not.toHaveBeenCalled();
    });

    it("trims via the functional updater: caps ports/coins and keeps the most recent tx", () => {
      const start = overflowPorts();
      const { setPortfolios, view } = setup(start);
      act(() => view.result.current.trimToTier("free"));
      // It passes a prev => next updater rather than a raw value.
      const updater = setPortfolios.mock.calls[0][0];
      expect(updater).toBeTypeOf("function");
      const next = updater(start);
      expect(next).toHaveLength(TIER_LIMITS.free.ports);          // 1 portfolio kept
      expect(next[0].coins).toHaveLength(TIER_LIMITS.free.coins); // 10 coins kept
      expect(next[0].coins[0].entries).toHaveLength(TIER_LIMITS.free.tx); // 50 tx kept
      // "keep most recent" — the dropped 5 are the oldest (e0..e4); e5 is now first.
      expect(next[0].coins[0].entries[0].id).toBe("e5");
    });

    it("falls back to a single default portfolio when nothing survives the trim", () => {
      const { setPortfolios, view } = setup([]);
      act(() => view.result.current.trimToTier("free"));
      const next = setPortfolios.mock.calls[0][0]([]);
      expect(next).toEqual([{ id: "default", name: "My Portfolio", coins: [] }]);
    });

    it("keeps coins up to the CONFIGURED cap, not the hardcoded default (U10 fix)", () => {
      const start = overflowPorts(); // p1 has 12 coins
      const { setPortfolios, view } = setup(start, { free: { portfolios: 1, coins: 20, transactions: 50 } });
      act(() => view.result.current.trimToTier("free"));
      const next = setPortfolios.mock.calls[0][0](start);
      expect(next).toHaveLength(1);
      expect(next[0].coins).toHaveLength(12);   // all 12 kept (cap 20), NOT trimmed to 10
      expect(next[0].coins[0].entries).toHaveLength(50); // tx still capped at 50
    });
  });
});
