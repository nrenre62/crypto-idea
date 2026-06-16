import { useCallback } from "react";

// Per-tier resource ceilings used by the downgrade/trim logic. These mirror the
// built-in plan defaults (the `_planLim` fallbacks in CryptoIdea.jsx). Live limit
// enforcement reads admin-configured plans (`site.plans`) with these as the fallback;
// the downgrade trim intentionally uses the fixed defaults.
export const TIER_LIMITS = {
  free:    { ports: 1,  coins: 10,  tx: 50 },
  pro:     { ports: 10, coins: 200, tx: 2000 },
  premium: { ports: 50, coins: 500, tx: 5000 },
};

// The shape a fully-trimmed (now-empty) account falls back to.
const FALLBACK_PORTFOLIO = { id: "default", name: "My Portfolio", coins: [] };

// Pure: trim a portfolios array down to a tier's limits, keeping the most-recent
// transactions. Falls back to a single empty portfolio if nothing survives.
function trimPortfolios(portfolios, lim) {
  const trimmed = portfolios.slice(0, lim.ports).map(p => ({
    ...p,
    coins: p.coins.slice(0, lim.coins).map(coin => ({
      ...coin,
      entries: (coin.entries || []).slice(-lim.tx),
    })),
  }));
  return trimmed.length > 0 ? trimmed : [{ ...FALLBACK_PORTFOLIO }];
}

// Subscription / tier-limit business logic for the upgrade & downgrade flows,
// pulled out of CryptoIdea.jsx (audit rule 1) and bound to the portfolios state so
// the trim uses the functional-update form — safe inside the async subscription
// check that can run while other state is in flight.
//
// The thin UI orchestrators (startUpgrade / startDowngrade / confirmDowngrade) stay
// in CryptoIdea.jsx by design: they drive overlay state shared with the auth/Login
// flow (showPlan, upgradeStep, upgradeFlow…), so hook-ifying them would only relocate
// ~7 setters without reducing coupling (anti-KISS) — same call as usePortfolios' CRUD.
//
//   calcEndDate(billing)  -> ISO string : end of a new subscription's billing cycle
//   getTrimImpact(toTier)               : how much data a downgrade would delete
//   trimToTier(toTier)                  : apply the downgrade by trimming stored data
export function useUpgrade({ portfolios, setPortfolios }) {
  const calcEndDate = useCallback((billing) => {
    const d = new Date();
    if (billing === "yearly") d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  }, []);

  const getTrimImpact = useCallback((toTier) => {
    const lim = TIER_LIMITS[toTier];
    if (!lim) return null;
    const portsToDelete = Math.max(0, portfolios.length - lim.ports);
    let coinsToDelete = 0, txToDelete = 0;
    // Portfolios kept: count coins/tx over the per-portfolio caps.
    portfolios.slice(0, lim.ports).forEach(p => {
      coinsToDelete += Math.max(0, p.coins.length - lim.coins);
      p.coins.slice(0, lim.coins).forEach(coin => {
        txToDelete += Math.max(0, (coin.entries?.length || 0) - lim.tx);
      });
    });
    // Portfolios dropped entirely: all their coins/tx go.
    portfolios.slice(lim.ports).forEach(p => {
      p.coins.forEach(coin => { coinsToDelete++; txToDelete += (coin.entries?.length || 0); });
    });
    return { portsToDelete, coinsToDelete, txToDelete };
  }, [portfolios]);

  const trimToTier = useCallback((toTier) => {
    const lim = TIER_LIMITS[toTier];
    if (!lim) return;
    setPortfolios(prev => trimPortfolios(prev, lim));
  }, [setPortfolios]);

  return { calcEndDate, getTrimImpact, trimToTier };
}
