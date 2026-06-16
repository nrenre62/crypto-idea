// Pure plan-usage math — what % of the tier's limits the user is consuming.
// No React, no state. Extracted from CryptoIdea.jsx (component-layer logic).
// Coins are measured against the ACTIVE portfolio; transactions across ALL
// portfolios (matching the original in-app behavior). Portfolio count is
// intentionally NOT part of the warning (1/1 on free would always read 100%).
export function usagePercents(activePortfolioCoinCount, allPortfolios, limits) {
  const { maxCoinsPerPort = 0, maxPortfolios = 0, maxTxPerCoin = 0 } = limits || {};
  const totalTxUsed = (allPortfolios || []).reduce(
    (s, p) => s + (p.coins || []).reduce((cs, c) => cs + (c.entries?.length || 0), 0), 0);
  const maxTotalTx = maxPortfolios * maxCoinsPerPort * maxTxPerCoin;
  const coinPct = maxCoinsPerPort > 0 ? Math.round(activePortfolioCoinCount / maxCoinsPerPort * 100) : 0;
  const txPct = maxTotalTx > 0 ? Math.round(totalTxUsed / maxTotalTx * 100) : 0;
  return { coinPct, txPct, usagePct: Math.max(coinPct, txPct) };
}
