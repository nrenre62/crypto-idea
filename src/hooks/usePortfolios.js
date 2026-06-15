import { useState } from "react";

// The portfolio a brand-new/empty session starts with (also the logout reset shape).
export const DEFAULT_PORTFOLIOS = [{ id: "default", name: "My Portfolio", coins: [] }];

// Owns the user's portfolio collection and which one is active.
//   portfolio    — the active portfolio's coin list (derived)
//   setPortfolio — updates just the active portfolio's coins
// CRUD handlers (add/remove coin, transactions, create/delete portfolio) live in
// the app component: they're coupled to auth (uid), tier limits, and UI/form state,
// so keeping them there avoids threading ~15 dependencies through this hook (KISS).
export function usePortfolios() {
  const [portfolios, setPortfolios] = useState(DEFAULT_PORTFOLIOS);
  const [activePortId, setActivePortId] = useState("default");
  const portfolio = portfolios.find(p => p.id === activePortId)?.coins || [];
  const setPortfolio = (fn) =>
    setPortfolios(prev => prev.map(p => p.id === activePortId
      ? { ...p, coins: typeof fn === "function" ? fn(p.coins) : fn }
      : p));
  return { portfolios, setPortfolios, activePortId, setActivePortId, portfolio, setPortfolio };
}
