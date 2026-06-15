import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { usePortfolios, DEFAULT_PORTFOLIOS } from "../../src/hooks/usePortfolios.js";

describe("usePortfolios (state container)", () => {
  it("starts with the default portfolio active", () => {
    const { result } = renderHook(() => usePortfolios());
    expect(result.current.portfolios).toEqual(DEFAULT_PORTFOLIOS);
    expect(result.current.activePortId).toBe("default");
    expect(result.current.portfolio).toEqual([]);
  });

  it("derives `portfolio` as the active portfolio's coin list", () => {
    const { result } = renderHook(() => usePortfolios());
    const coins = [{ id: "bitcoin", symbol: "BTC", entries: [] }];
    act(() => {
      result.current.setPortfolios([{ id: "default", name: "My Portfolio", coins }]);
    });
    expect(result.current.portfolio).toEqual(coins);
  });

  it("setPortfolio updates only the active portfolio's coins (function form)", () => {
    const { result } = renderHook(() => usePortfolios());
    act(() => {
      result.current.setPortfolios([
        { id: "default", name: "P1", coins: [] },
        { id: "p2", name: "P2", coins: [{ id: "eth", symbol: "ETH", entries: [] }] },
      ]);
    });
    act(() => {
      result.current.setPortfolio(prev => [...prev, { id: "btc", symbol: "BTC", entries: [] }]);
    });
    // active ("default") gained BTC; the other portfolio is untouched
    expect(result.current.portfolios.find(p => p.id === "default").coins).toHaveLength(1);
    expect(result.current.portfolios.find(p => p.id === "p2").coins).toHaveLength(1);
  });

  it("switching activePortId re-points `portfolio`", () => {
    const { result } = renderHook(() => usePortfolios());
    act(() => {
      result.current.setPortfolios([
        { id: "default", name: "P1", coins: [] },
        { id: "p2", name: "P2", coins: [{ id: "eth", symbol: "ETH", entries: [] }] },
      ]);
    });
    act(() => result.current.setActivePortId("p2"));
    expect(result.current.portfolio).toHaveLength(1);
    expect(result.current.portfolio[0].id).toBe("eth");
  });
});
