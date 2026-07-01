// utils/portfolio.js — portfolio math. Pure functions, fully testable.

export const FALLBACK_PRICES = {
  // marketCap added (R14) + rank added (R23) so the offline demo seam classifies into
  // real risk (btc rank 1 → safest), not all-unknown → high.
  bitcoin: { price: 67000, c24: 3.1, c7d: 5.0, c30d: 12.4, marketCap: 1.3e12, rank: 1 },
  ethereum: { price: 2745, c24: 1.8, c7d: 3.2, c30d: 9.4, marketCap: 3.3e11, rank: 2 },
  solana: { price: 157, c24: -0.6, c7d: -1.0, c30d: -3.1, marketCap: 7e10, rank: 5 },
};

export const BETA_BY_RANK = [1.0, 1.1, 1.4, 1.6, 1.8]; // by allocation rank, big→small

// holdings: [{id, sym, name, amount, avgCost}], prices: map|null
export function computePortfolio(holdings, prices) {
  const out = holdings.map((h) => {
    const p = (prices && prices[h.id]) || FALLBACK_PRICES[h.id] || { price: 0, c24: 0, c7d: 0, c30d: 0 };
    return { ...h, price: p.price, value: h.amount * p.price, c24: p.c24, c7d: p.c7d, c30d: p.c30d, spark: p.spark, marketCap: p.marketCap != null ? p.marketCap : null, rank: p.rank != null ? p.rank : null };
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

// ── Portfolio risk from each coin's REAL CoinGecKO rank (R23; supersedes the R14
// discrete market-cap tiers). Per-coin risk is a smooth log-scale curve on rank
// (rank 1 → ~0.02 … rank ≥1500 / unranked → 0.95), with a log-market-cap fallback
// when rank is missing. The book is the allocation-weighted mean, and a $100B+
// mega-cap anchor ≥40% of the book guarantees the meter can't read "High".
// All constants are the tuning knobs — documented inline.
const R_MIN = 2, R_MAX = 1500;   // rank curve endpoints (log10 scale)
const GAMMA = 1.4;               // curve shape: rank ~50 ≈ .35, ~200 ≈ .6, ~500 ≈ .78
const RISK_MIN = 0.02, RISK_MAX = 0.95;
const MEGA_CAP = 1e11, MEGA_RANK = 10;   // "mega" = ≥$100B cap or top-10 rank
const MEGA_FLOOR_ALLOC = 40;             // anchor % that caps the meter at Moderate
const LOW_CUT = 0.34, HIGH_CUT = 0.67;   // 3-band cuts (unchanged from R14)
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Per-coin risk: rank first (the founder's "real risk"), cap as fallback, worst-case 0.95.
export function coinRisk(h) {
  const rank = h && h.rank;
  if (rank != null && isFinite(rank) && rank >= 1) {
    const t = clamp01((Math.log10(rank) - Math.log10(R_MIN)) / (Math.log10(R_MAX) - Math.log10(R_MIN)));
    return Math.min(RISK_MAX, Math.max(RISK_MIN, Math.pow(t, GAMMA)));
  }
  const mc = h && h.marketCap;
  if (mc != null && isFinite(mc) && mc > 0) {
    const t = clamp01((12 - Math.log10(mc)) / 5);   // $1T → 0 … $10M → 1, log scale
    return Math.min(RISK_MAX, Math.max(RISK_MIN, t));
  }
  return RISK_MAX;   // no rank, no cap → highest risk (decision 1)
}

const isMega = (h) =>
  (h.marketCap != null && h.marketCap >= MEGA_CAP) || (h.rank != null && h.rank <= MEGA_RANK);
// Note buckets by rank: top-50 / mid (51–500) / small-or-unranked.
const rankBucket = (h) =>
  h.rank != null && h.rank <= 50 ? 'top' : h.rank != null && h.rank <= 500 ? 'mid' : 'small';

export function deriveRisk(holdings) {
  const total = holdings.reduce((s, h) => s + (h.alloc || 0), 0);
  const breakdown = { top: 0, mid: 0, small: 0 };
  let score, megaAlloc = 0;
  if (total > 0) {
    score = 0;
    for (const h of holdings) {
      const alloc = h.alloc || 0;
      breakdown[rankBucket(h)] += alloc;            // allocation % per bucket (for the note)
      if (isMega(h)) megaAlloc += alloc;
      score += (alloc / total) * coinRisk(h);       // allocation-weighted mean
    }
  } else {
    score = RISK_MAX;                               // no allocation data → treat as high
    breakdown.small = 100;
  }
  // Mega-cap safety floor (decision 2): a ≥40% $100B+ anchor guarantees the meter
  // can't read High. Mega coins already carry the lowest coinRisk, so this is an
  // explicit ceiling on top of the weighted mean, not double-counting.
  if (megaAlloc >= MEGA_FLOOR_ALLOC && score >= HIGH_CUT) score = HIGH_CUT - 0.02;
  const level = score < LOW_CUT ? 'Low' : score < HIGH_CUT ? 'Moderate' : 'High';
  return { level, score, breakdown, megaAlloc };
}

// Plain-language, rank-based risk note for the meter (pure → unit-tested).
// Names the $100B+ anchor when the mega floor is active (megaAlloc ≥ 40%).
export function riskNote(breakdown, megaAlloc = 0, level = '') {
  const top = Math.round(breakdown.top || 0);
  const mid = Math.round(breakdown.mid || 0);
  const small = Math.round(breakdown.small || 0);
  const mix = `Top-50 coins are ${top}% of your book, mid-ranked ${mid}%, small/unranked ${small}%.`;
  if (megaAlloc >= MEGA_FLOOR_ALLOC) {
    return `${mix} Your $100B+ anchor (${Math.round(megaAlloc)}%) is holding the risk at ${level}.`;
  }
  const advice = small >= 40
    ? 'Small or unranked coins are the highest-risk tier — sizing them down would lower this.'
    : top >= 60
    ? 'Mostly top-ranked coins, which keeps single-coin risk lower.'
    : 'A mix of ranks and sizes.';
  return `${mix} ${advice}`;
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
