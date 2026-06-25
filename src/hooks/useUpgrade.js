import { useCallback } from "react";

// Per-tier resource ceilings — the built-in plan defaults (the `_planLim` fallbacks
// in CryptoIdea.jsx). The downgrade trim and live enforcement BOTH read admin-
// configured plans (`site.plans`) first with these as the fallback (see limitsForTier).
export const TIER_LIMITS = {
  free:    { ports: 1,  coins: 10,   tx: 50 },
  pro:     { ports: 3,  coins: 50,   tx: 2000 },
  premium: { ports: 15, coins: 1000, tx: 5000 },
};

// Hard ceilings a configured limit can never exceed — mirror firestore.rules
// configuredLimit() hardMax (portfolios 100000, coins 1000, tx 1000000), so the
// client trim and the server rules agree on the literal ceiling.
const HARD_MAX = { ports: 100000, coins: 1000, tx: 1000000 };

// Pure: the EFFECTIVE ceilings for a tier. Admin-configured plans (`plans[tier]`,
// shape {portfolios, coins, transactions}) win over the built-in defaults, each
// clamped to the product hard-max. The downgrade trim uses these so it keeps exactly
// what the rules would allow — never silently deleting data an admin chose to permit
// by raising a cap (the U10 bug: trimming to hardcoded defaults below the live limit).
export function limitsForTier(toTier, plans) {
  const def = TIER_LIMITS[toTier];
  if (!def) return null;
  const cfg = (plans && plans[toTier]) || {};
  const pick = (key, d, hard) => Math.min(cfg[key] != null ? cfg[key] : d, hard);
  return {
    ports: pick("portfolios", def.ports, HARD_MAX.ports),
    coins: pick("coins", def.coins, HARD_MAX.coins),
    tx: pick("transactions", def.tx, HARD_MAX.tx),
  };
}

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

// Pure: decide whether a subscription is due for an automatic downgrade and to
// which tier. Returns the target tier string, or null if no change is due.
// Extracted from CryptoIdea.jsx's checkSubscriptionStatus (audit rule 1).
export function dueDowngrade(subscription, now) {
  const sub = subscription;
  if (!sub) return null;
  // Payment failed: a 7-day grace period, then force down to free.
  if (sub.paymentFailed && sub.paymentFailedDate) {
    const days = Math.floor((now - new Date(sub.paymentFailedDate)) / (1000 * 60 * 60 * 24));
    if (days >= 7) return "free";
  }
  // Cancelled subscription whose paid period has now ended.
  if (sub.cancelled && sub.endDate && new Date(sub.endDate) <= now) {
    return sub.downgradeTo || "free";
  }
  return null;
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
export function useUpgrade({ portfolios, setPortfolios, plans = null }) {
  const calcEndDate = useCallback((billing) => {
    const d = new Date();
    if (billing === "yearly") d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  }, []);

  const getTrimImpact = useCallback((toTier) => {
    const lim = limitsForTier(toTier, plans);
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
  }, [portfolios, plans]);

  const trimToTier = useCallback((toTier) => {
    const lim = limitsForTier(toTier, plans);
    if (!lim) return;
    setPortfolios(prev => trimPortfolios(prev, lim));
  }, [setPortfolios, plans]);

  return { calcEndDate, getTrimImpact, trimToTier };
}
