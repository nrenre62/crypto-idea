// utils/portfolio.js — portfolio math. Pure functions, fully testable.

export const FALLBACK_PRICES = {
  bitcoin: { price: 67000, c24: 3.1, c7d: 5.0, c30d: 12.4 },
  ethereum: { price: 2745, c24: 1.8, c7d: 3.2, c30d: 9.4 },
  solana: { price: 157, c24: -0.6, c7d: -1.0, c30d: -3.1 },
};

export const BETA_BY_RANK = [1.0, 1.1, 1.4, 1.6, 1.8]; // by allocation rank, big→small

// holdings: [{id, sym, name, amount, avgCost}], prices: map|null
export function computePortfolio(holdings, prices) {
  const out = holdings.map((h) => {
    const p = (prices && prices[h.id]) || FALLBACK_PRICES[h.id] || { price: 0, c24: 0, c7d: 0, c30d: 0 };
    return { ...h, price: p.price, value: h.amount * p.price, c24: p.c24, c7d: p.c7d, c30d: p.c30d, spark: p.spark };
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

// Risk level from concentration.
export function deriveRisk(holdings) {
  const top = holdings[0] ? holdings[0].alloc : 0;
  const top2 = holdings.slice(0, 2).reduce((s, h) => s + h.alloc, 0);
  const n = holdings.length;
  let level;
  if (top > 60 || n <= 1) level = 'High';
  else if (top > 40 || top2 > 80) level = 'Elevated';
  else level = 'Moderate';
  return { level, top, top2, markerLeft: Math.max(8, Math.min(95, top)) };
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
