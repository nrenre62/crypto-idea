import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useUpgrade, TIER_LIMITS } from "../../src/hooks/useUpgrade.js";

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

function setup(portfolios = []) {
  const setPortfolios = vi.fn();
  const view = renderHook(() => useUpgrade({ portfolios, setPortfolios }));
  return { setPortfolios, view };
}

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
  });
});
