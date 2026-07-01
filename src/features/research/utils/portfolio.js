// utils/portfolio.js — portfolio math. Pure functions, fully testable.

export const FALLBACK_PRICES = {
  // marketCap added (R14) so the offline demo seam classifies into real risk tiers
  // (btc/eth ≥ $100B → super-low; sol $1B–$100B → low), not all-unknown → high.
  bitcoin: { price: 67000, c24: 3.1, c7d: 5.0, c30d: 12.4, marketCap: 1.3e12 },
  ethereum: { price: 2745, c24: 1.8, c7d: 3.2, c30d: 9.4, marketCap: 3.3e11 },
  solana: { price: 157, c24: -0.6, c7d: -1.0, c30d: -3.1, marketCap: 7e10 },
};

export const BETA_BY_RANK = [1.0, 1.1, 1.4, 1.6, 1.8]; // by allocation rank, big→small

// holdings: [{id, sym, name, amount, avgCost}], prices: map|null
export function computePortfolio(holdings, prices) {
  const out = holdings.map((h) => {
    const p = (prices && prices[h.id]) || FALLBACK_PRICES[h.id] || { price: 0, c24: 0, c7d: 0, c30d: 0 };
    return { ...h, price: p.price, value: h.amount * p.price, c24: p.c24, c7d: p.c7d, c30d: p.c30d, spark: p.spark, marketCap: p.marketCap != null ? p.marketCap : null };
  });
  const total = out.reduce((s, h) => s + h.value, 0);
  out.forEach((h) => (h.alloc = total ? (h.value / total) * 100 : 0));
  out.sort((a, b) => b.value - a.value);
  const perf = (f) => {
    let then = 0;
    out.forEach((h) => (then += h.value / (1 + (h[f] || 0) / 100)));
    return then ? (total / then - 1) * 100 : 0;
  };
  return {
    holdings: out,
    total,
    perf: { '24h': perf('c24'), '7d': perf('c7d'), '30d': perf('c30d') },
    live: !!prices,
  };
}

// ── Portfolio risk = each coin's MARKET-CAP tier, allocation-weighted (R14) ──
// Replaces the old concentration model (concentration now lives ONLY on the Allocation
// bar). Tiers by market cap: <$100M High · $100M–$1B Medium · $1B–$100B Low · ≥$100B
// Super-low. Unknown/missing cap → High (conservative). Scores + band cuts are tunable.
export function marketCapTier(mc) {
  if (mc == null || !isFinite(mc) || mc <= 0) return 'high';
  if (mc >= 1e11) return 'superlow';   // ≥ $100B (BTC, ETH)
  if (mc >= 1e9)  return 'low';        // $1B – $100B
  if (mc >= 1e8)  return 'medium';     // $100M – $1B
  return 'high';                       // < $100M (micro-cap)
}
export const TIER_SCORE = { superlow: 0.05, low: 0.30, medium: 0.65, high: 0.95 };

export function deriveRisk(holdings) {
  const total = holdings.reduce((s, h) => s + (h.alloc || 0), 0);
  const breakdown = { superlow: 0, low: 0, medium: 0, high: 0 };
  let score;
  if (total > 0) {
    score = 0;
    for (const h of holdings) {
      const tier = marketCapTier(h.marketCap);
      breakdown[tier] += (h.alloc || 0);          // allocation % per tier (for the note)
      score += ((h.alloc || 0) / total) * TIER_SCORE[tier];   // allocation-weighted mean
    }
  } else {
    score = TIER_SCORE.high;                       // no allocation data → treat as high
    breakdown.high = 100;
  }
  // 3-band meter (Q4): the 4 tiers feed the numeric score; Super-low & Low land in green.
  const level = score < 0.34 ? 'Low' : score < 0.67 ? 'Moderate' : 'High';
  return { level, score, breakdown };
}

// Plain-language, market-cap risk note for the meter (pure → unit-tested).
export function riskNote(breakdown) {
  const large = Math.round((breakdown.superlow || 0) + (breakdown.low || 0));  // ≥ $1B
  const mid = Math.round(breakdown.medium || 0);                               // $100M–$1B
  const micro = Math.round(breakdown.high || 0);                               // < $100M
  const advice = micro >= 40
    ? 'Micro-caps (under $100M) are the highest-risk tier — sizing them down would lower this.'
    : large >= 60
    ? 'Mostly large-cap, which keeps single-coin risk lower.'
    : 'A mix of market-cap tiers.';
  return `Large-caps ($1B+) are ${large}% of your book, mid-caps ${mid}%, micro-caps ${micro}%. ${advice}`;
}

// Stress test: model a broad market move (%), scaling each holding by its beta.
export function stressScenario(holdings, movePct) {
  const items = holdings.map((h, i) => ({ v: h.value, beta: BETA_BY_RANK[Math.min(i, BETA_BY_RANK.length - 1)] }));
  const base = items.reduce((s, h) => s + h.v, 0);
  const total = items.reduce((s, h) => s + h.v * (1 + (movePct / 100) * h.beta), 0);
  const changePct = base ? (total / base - 1) * 100 : 0;
  return { base, total, changePct };
}

// Build the plain-language context string the AI prompts get prefixed with.
export function portfolioContext(p, fmtPct, money) {
  if (!p.holdings.length) return 'The user has no coins in this portfolio yet.';
  const parts = p.holdings.map((h) => `${h.name} (${h.sym}) ${money(h.value)} = ${Math.round(h.alloc)}%`);
  const top2 = p.holdings.slice(0, 2).reduce((s, h) => s + h.alloc, 0);
  return (
    `The user's live portfolio: ${parts.join('; ')}; total ${money(p.total)}. ` +
    `Performance: 24h ${fmtPct(p.perf['24h'])}, 7d ${fmtPct(p.perf['7d'])}, 30d ${fmtPct(p.perf['30d'])}. ` +
    `Top holding ${p.holdings[0].name} at ${Math.round(p.holdings[0].alloc)}%; top two ~${Math.round(top2)}%.`
  );
}
