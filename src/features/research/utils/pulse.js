// utils/pulse.js — the deterministic multi-signal Portfolio Pulse + Daily Brief.
// Pure functions: no state, no DOM, no fetching. This IS the honest product until
// the Wave-B AI proxy ships (usePulse falls to this on every non-live render).
//
// Structured as flat facts + one conditional block per rule so PR 4c can insert the
// P-metrics (return attribution / effective-N / drawdown / volatility) surgically,
// without disturbing R-A…R-F. Held-only naming (names come only from `holdings`),
// no advice/prediction/target (S1–S4), and never NaN/Infinity/∞ on a degenerate book.
import { fmtPct, money } from './format';

// Timeframe wording — the single source (usePulse imports it for the AI prompt too).
export const TFWORD = { '24h': 'last 24 hours', '7d': 'last 7 days', '30d': 'last 30 days' };

const EMPTY_LINE = 'Once you add coins, your portfolio summary appears here.';
const fin = (n) => (Number.isFinite(n) ? n : 0);

// Flat facts record. `invested`/`hasCost`/`pnl` are cost-basis truths computed here
// (computePortfolio carries no cost); everything else is read off the portfolio.
export function pulseFacts(portfolio, tf) {
  const holdings = portfolio.holdings || [];
  const riskLevel = (portfolio.risk && portfolio.risk.level) || '';
  if (!holdings.length) {
    return {
      empty: true, total: 0, tf, tfWord: TFWORD[tf], tfPerf: 0, invested: 0,
      pnl: 0, pnlPct: 0, hasCost: false, count: 0, topNames: [], top2Pct: 0,
      riskLevel, diversify: false,
    };
  }
  const total = fin(portfolio.total);
  const invested = fin(holdings.reduce((s, h) => s + (h.amount || 0) * (h.avgCost || 0), 0));
  const hasCost = invested > 0;
  const pnl = fin(total - invested);
  const pnlPct = hasCost ? fin((pnl / invested) * 100) : 0;
  const top2Pct = fin(holdings.slice(0, 2).reduce((s, h) => s + (h.alloc || 0), 0));
  return {
    empty: false,
    total,
    tf,
    tfWord: TFWORD[tf],
    tfPerf: fin(portfolio.perf[tf]),
    invested,
    pnl,
    pnlPct,
    hasCost,
    count: holdings.length,
    topNames: holdings.map((h) => h.name),   // value-desc from computePortfolio
    top2Pct,
    riskLevel,
    diversify: top2Pct > 60,
  };
}

// One string per rule, each in its own conditional block (order: A, B, C, E, F).
export function pulseLines(facts) {
  if (facts.empty) return [EMPTY_LINE];
  const lines = [];

  // R-A — value + selected-timeframe change (always). fmtPct already carries the sign
  // glyph, so no sign word is added (avoids a "down −3.1%" double glyph).
  lines.push(`Your portfolio is **${money(facts.total)}**, **${fmtPct(facts.tfPerf)}** over the ${facts.tfWord}.`);

  // R-B — unrealized P&L vs cost basis (only when there IS a cost basis). A sign WORD +
  // magnitude keeps it honest: it never prints "+" on a gain, and hasCost guards the
  // pnl/invested division so a zero-cost book never leaks ∞.
  if (facts.hasCost) {
    const dir = facts.pnl >= 0 ? 'up' : 'down';
    const dollars = money(Math.abs(facts.pnl));
    const pct = Math.abs(facts.pnlPct).toFixed(1) + '%';
    lines.push(`Against a **${money(facts.invested)}** cost basis you're **${dir} ${dollars}** (${pct}).`);
  }

  // R-C — concentration composition, naming the two largest HELD coins (only when ≥2).
  if (facts.count >= 2) {
    lines.push(`Your top two — **${facts.topNames[0]} and ${facts.topNames[1]}** — make up **${Math.round(facts.top2Pct)}%** of the book.`);
  }

  // R-E — one separate factual sentence naming the book's risk level (S3: not fused).
  lines.push(`Overall this book reads as **${facts.riskLevel}** risk.`);

  // R-F — neutral concentration nudge (only above 60%); never names a coin or a verb.
  if (facts.diversify) {
    lines.push("That's a concentrated book — spreading across more assets is one way to lower single-coin risk.");
  }

  return lines;
}

// Daily Brief facts: the 24h $ + % (sign-matched, ∞-guarded) plus the single biggest
// gainer/decliner among HELD coins (each null when nothing moved that direction, so a
// one-holding book yields at most one and an all-down book has no gainer).
export function briefFacts(portfolio) {
  const holdings = portfolio.holdings || [];
  if (!holdings.length) return { empty: true, chg24: 0, pct24: 0, nearZero: false, gainer: null, decliner: null };
  const total = fin(portfolio.total);
  const pct24 = fin(portfolio.perf['24h']);
  const denom = 1 + pct24 / 100;
  const chg24 = denom === 0 ? 0 : fin(total - total / denom);   // guard pct24 === −100
  const nearZero = Math.round(Math.abs(pct24) * 10) / 10 === 0 && Math.round(Math.abs(chg24)) !== 0;
  let gainer = null, decliner = null;
  for (const h of holdings) {
    const c = h.c24 || 0;
    if (c > 0 && (!gainer || c > (gainer.c24 || 0))) gainer = h;
    if (c < 0 && (!decliner || c < (decliner.c24 || 0))) decliner = h;
  }
  return { empty: false, chg24, pct24, nearZero, gainer, decliner };
}
