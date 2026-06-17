// hooks/useHoldings.js — resolve holdings + their source. Business logic, no UI.
import { useMemo } from 'react';
import { holdingsFromCoins } from '../utils/coins';

const SAMPLE = [
  { id: 'bitcoin', sym: 'BTC', name: 'Bitcoin', amount: 0.42, avgCost: 58400 },
  { id: 'ethereum', sym: 'ETH', name: 'Ethereum', amount: 5.8, avgCost: 2510 },
  { id: 'solana', sym: 'SOL', name: 'Solana', amount: 31, avgCost: 162 },
];

// In the real app, pass the active portfolio's coins in as `coins` instead of
// reading window globals. Globals are kept as a fallback for the standalone build.
export function useHoldings(coins) {
  return useMemo(() => {
    const portfolio = coins ?? (typeof window !== 'undefined' ? window.CI_PORTFOLIO : null);
    if (Array.isArray(portfolio)) {
      const h = holdingsFromCoins(portfolio);
      return { holdings: h, source: h.length ? 'portfolio' : 'empty' };
    }
    const flat = typeof window !== 'undefined' ? window.CI_HOLDINGS : null;
    if (Array.isArray(flat)) {
      const h = flat
        .map((u) => ({
          id: u.id,
          sym: (u.sym || u.id || '').toUpperCase().slice(0, 4),
          name: u.name || u.id,
          amount: Number(u.amount) || 0,
          avgCost: Number(u.avgCost) || 0,
        }))
        .filter((h) => h.amount > 0 && h.id);
      return { holdings: h, source: h.length ? 'holdings' : 'empty' };
    }
    return { holdings: SAMPLE.map((h) => ({ ...h })), source: 'sample' };
  }, [coins]);
}
