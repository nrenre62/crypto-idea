// hooks/usePortfolio.js — derive everything the UI needs from holdings + prices.
import { useMemo } from 'react';
import { computePortfolio, deriveRisk, portfolioContext } from '../utils/portfolio';
import { fmtPct, money } from '../utils/format';

export function usePortfolio(holdings, prices) {
  return useMemo(() => {
    const p = computePortfolio(holdings, prices);
    const risk = deriveRisk(p.holdings);
    const context = portfolioContext(p, fmtPct, money);
    return { ...p, risk, context };
  }, [holdings, prices]);
}
