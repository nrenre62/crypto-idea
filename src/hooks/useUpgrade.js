import { useCallback } from "react";

// Per-tier resource ceilings — the built-in plan defaults (the `_planLim` fallbacks
// in CryptoIdea.jsx). The over-limit derivation reads admin-configured plans
// (`site.plans`) first with these as the fallback (see limitsForTier).
// PLAN-LIMITS-MAX (#12): Starter 3/30/300 · Pro 6/100/1000 · Premium 15/200/2000.
// MUST equal the firestore.rules maxPortfolios/maxCoins/maxTx defaults — a lower client
// cap breaks legit UX, a higher one surfaces a false "limit" toast (the DI-1 class).
export const TIER_LIMITS = {
  free:    { ports: 3,  coins: 30,  tx: 300 },
  pro:     { ports: 6,  coins: 100, tx: 1000 },
  premium: { ports: 15, coins: 200, tx: 2000 },
};

// Hard ceilings a configured limit can never exceed — mirror firestore.rules
// configuredLimit() hardMax (portfolios 100000, coins 1000, tx 1000000), so the
// client and the server rules agree on the literal ceiling.
const HARD_MAX = { ports: 100000, coins: 1000, tx: 1000000 };

// Pure: the EFFECTIVE ceilings for a tier. Admin-configured plans (`plans[tier]`,
// shape {portfolios, coins, transactions}) win over the built-in defaults, each
// clamped to the product hard-max. Used both to compute the over-limit lock set and
// for the display caps.
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

// ═══ DI-4: keep-data downgrade — over-limit items are LOCKED, never deleted ═══
// The destructive `trimToTier` (and its server-delete twin) is RETIRED (decision D3):
// downgrading never removes a portfolio, coin, or transaction. Instead the items beyond
// the new cap render locked (dimmed + "Over plan limit"), and the user unlocks them by
// upgrading again or by deleting OTHER items to get back under. These pure helpers derive
// the locked set from the CURRENT effective caps (which already fold in premiumLimits).

// Portfolio ids beyond the portfolio cap (by array order = registration order). A Set.
export function lockedPortfolioIds(portfolios, portCap) {
  if (typeof portCap !== "number") return new Set();
  return new Set((portfolios || []).slice(portCap).map((p) => p.id));
}

// Coin ids over the coin cap WITHIN one portfolio (the overflow beyond the cap, by array
// order — oldest keep priority, matching "your existing data is safe"). A Set.
export function lockedCoinIds(coins, coinCap) {
  if (typeof coinCap !== "number") return new Set();
  return new Set((coins || []).slice(coinCap).map((c) => c.id));
}

// Pure: decide whether a subscription is due for an automatic downgrade and to
// which tier. Returns the target tier string, or null if no change is due.
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

// Subscription / tier-limit business logic for the upgrade & downgrade flows.
//   calcEndDate(billing)  -> ISO string : end of a new subscription's billing cycle
//   overLimitImpact(toTier)             : how many portfolios/coins/tx would be LOCKED
//                                         (not deleted) at a target tier — for the dialog
export function useUpgrade({ portfolios, plans = null }) {
  const calcEndDate = useCallback((billing) => {
    const d = new Date();
    if (billing === "yearly") d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d.toISOString();
  }, []);

  // Counts of items that would sit OVER a target tier's caps (and therefore lock).
  // Same arithmetic the old getTrimImpact used, but the semantics are "locked, kept",
  // never "deleted" — the downgrade dialogs are worded accordingly (D3/D4).
  const overLimitImpact = useCallback((toTier) => {
    const lim = limitsForTier(toTier, plans);
    if (!lim) return null;
    const portsOver = Math.max(0, portfolios.length - lim.ports);
    let coinsOver = 0, txOver = 0;
    // Portfolios KEPT: count coins/tx over the per-portfolio caps.
    portfolios.slice(0, lim.ports).forEach((p) => {
      coinsOver += Math.max(0, p.coins.length - lim.coins);
      p.coins.slice(0, lim.coins).forEach((coin) => {
        txOver += Math.max(0, (coin.entries?.length || 0) - lim.tx);
      });
    });
    // Portfolios beyond the cap: ALL their coins/tx are locked with them.
    portfolios.slice(lim.ports).forEach((p) => {
      p.coins.forEach((coin) => { coinsOver++; txOver += (coin.entries?.length || 0); });
    });
    return { portsOver, coinsOver, txOver };
  }, [portfolios, plans]);

  return { calcEndDate, overLimitImpact };
}
