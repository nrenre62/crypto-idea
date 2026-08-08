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

// The coin field carrying each timeframe's % change (used by the P-1 attribution).
const R_KEY = { '24h': 'c24', '7d': 'c7d', '30d': 'c30d' };

// P-3/P-4 — the 7-day portfolio value series Vₜ = Σ(amountᵢ × sparkᵢ,ₜ), tail-aligned
// to the shortest spark (K = min length). Pure helper that FAILS CLOSED (returns null)
// so the weekly metrics can never leak NaN/∞: null when any holding lacks a usable
// spark (null / not an array / <2 points), when K < 3, or when any Vₜ ≤ 0 (a zero
// crossing would make the naive Vₜ/Vₜ₋₁ return blow up to ∞).
function weeklyValues(holdings) {
  if (!holdings.length) return null;
  for (const h of holdings) {
    if (!Array.isArray(h.spark) || h.spark.length < 2) return null;
  }
  const K = Math.min(...holdings.map((h) => h.spark.length));
  if (K < 3) return null;
  const V = [];
  for (let t = 0; t < K; t++) {
    let v = 0;
    for (const h of holdings) {
      const tail = h.spark.slice(h.spark.length - K);
      const px = tail[t];
      if (!Number.isFinite(px)) return null;
      v += (h.amount || 0) * px;
    }
    if (!(v > 0)) return null;
    V.push(v);
  }
  return V;
}

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
      contrib: [], topContributor: null, topContributorShare: null, neff: null,
      weekly: false, drawdown7d: null, vol7d: null,
    };
  }
  const total = fin(portfolio.total);
  const invested = fin(holdings.reduce((s, h) => s + (h.amount || 0) * (h.avgCost || 0), 0));
  const hasCost = invested > 0;
  const pnl = fin(total - invested);
  const pnlPct = hasCost ? fin((pnl / invested) * 100) : 0;
  const top2Pct = fin(holdings.slice(0, 2).reduce((s, h) => s + (h.alloc || 0), 0));
  const count = holdings.length;
  const tfPerf = fin(portfolio.perf[tf]);

  // ── P-1: return attribution on PAST-VALUE weights ─────────────────────────
  // pᵢ = valueᵢ/(1+rᵢ/100) is each coin's value at the START of the window; then = Σ pᵢ
  // mirrors computePortfolio.perf, so contribᵢ = pᵢ·rᵢ / then carries the SAME percent
  // units as perf[tf] and Σ contribᵢ === perf[tf] exactly. Fails closed (contrib null →
  // P-1 line omitted) if any pᵢ is non-finite (rᵢ = −100 → /0) or then ≤ 0.
  const rKey = R_KEY[tf];
  const ps = holdings.map((h) => {
    const r = fin(h[rKey]);
    const denom = 1 + r / 100;
    return { id: h.id, name: h.name, r, p: denom !== 0 ? (h.value || 0) / denom : NaN };
  });
  const then = ps.reduce((s, x) => s + x.p, 0);
  let contrib = null, topContributor = null, topContributorShare = null;
  if (ps.every((x) => Number.isFinite(x.p)) && Number.isFinite(then) && then > 0) {
    contrib = ps
      .map((x) => ({ id: x.id, name: x.name, contrib: (x.p * x.r) / then }))
      .sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib));
    const top = contrib[0];
    topContributor = top ? top.name : null;
    // Share of the net move that the top coin drove; null when the net move is ~0
    // (an offsetting book divides by ≈0) or on a single holding.
    if (top && count >= 2 && Math.abs(tfPerf) >= 0.05) {
      topContributorShare = Math.round((top.contrib / tfPerf) * 100);
    }
  }

  // ── P-2: effective number of positions, Neff = 1/Σwᵢ² ─────────────────────
  // wᵢ = allocᵢ/100. Bounded to [1, count]; null with fewer than two holdings or no
  // allocation data (total ≤ 0) — an "effective count" is meaningless there.
  let neff = null;
  if (count >= 2 && total > 0) {
    const sumSq = holdings.reduce((s, h) => { const w = (h.alloc || 0) / 100; return s + w * w; }, 0);
    if (sumSq > 0) neff = Math.max(1, Math.min(count, 1 / sumSq));
  }

  // ── P-3/P-4: 7-day drawdown + sample volatility from the value series ──────
  const V = weeklyValues(holdings);
  const weekly = V != null;
  let drawdown7d = null, vol7d = null;
  if (weekly) {
    const maxV = Math.max(...V);
    drawdown7d = maxV > 0 ? (V[V.length - 1] - maxV) / maxV : null;   // ≤ 0, exactly 0 at a high
    const rets = [];
    for (let i = 1; i < V.length; i++) rets.push(V[i] / V[i - 1] - 1);
    if (rets.length >= 2) {
      const mean = rets.reduce((s, x) => s + x, 0) / rets.length;
      const variance = rets.reduce((s, x) => s + (x - mean) ** 2, 0) / (rets.length - 1);
      vol7d = Math.sqrt(variance);   // sample stddev (÷ n−1); NEVER annualized
    }
  }

  return {
    empty: false,
    total,
    tf,
    tfWord: TFWORD[tf],
    tfPerf,
    invested,
    pnl,
    pnlPct,
    hasCost,
    count,
    topNames: holdings.map((h) => h.name),   // value-desc from computePortfolio
    top2Pct,
    riskLevel,
    diversify: top2Pct > 60,
    contrib,
    topContributor,
    topContributorShare,
    neff,
    weekly,
    drawdown7d,
    vol7d,
  };
}

// One string per rule (order: R-A, R-B, P-1, R-C+P-2, [This-week | R-E], R-F). Each in
// its own conditional block; "drove"/"main driver" are descriptive attributions, not
// per-coin action verbs (S1 OK), and the 7-day volatility is NEVER annualized (S).
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

  // P-1 — return attribution: name the coin that drove the move (held-only). Drop the
  // percent when a holding offsets the move so hard the share exceeds 100% (Q1), or when
  // it isn't computable (single holding / a net move of ≈0) — "main driver" stays true.
  if (facts.topContributor) {
    if (facts.topContributorShare != null && facts.topContributorShare <= 100) {
      lines.push(`Over the ${facts.tfWord}, **${facts.topContributor}** drove about **${facts.topContributorShare}%** of that move.`);
    } else {
      lines.push(`Over the ${facts.tfWord}, **${facts.topContributor}** was the main driver of that move.`);
    }
  }

  // R-C — concentration composition, naming the two largest HELD coins (only when ≥2),
  // with the P-2 effective-N clause merged in (Neff to one decimal) rather than stacked.
  if (facts.count >= 2) {
    let rc = `Your top two — **${facts.topNames[0]} and ${facts.topNames[1]}** — make up **${Math.round(facts.top2Pct)}%** of the book`;
    if (facts.neff != null) {
      rc += `; by size, your **${facts.count}** coins act like about **${facts.neff.toFixed(1)}** equal-weight positions`;
    }
    lines.push(rc + '.');
  }

  // This-week (P-3/P-4) — when a clean 7-day value series exists, a typical daily swing
  // + how far below the 7-day high; this SUPERSEDES the R-E risk sentence. Otherwise R-E
  // stays as the fallback risk pointer (Q2), one factual sentence naming the risk level.
  if (facts.weekly) {
    const v = (Math.round(facts.vol7d * 1000) / 10).toFixed(1);
    if (facts.drawdown7d === 0) {
      lines.push(`This week your value had a **typical daily swing of about ±${v}%**, and is at a 7-day high.`);
    } else {
      const d = Math.round(Math.abs(facts.drawdown7d) * 100);
      lines.push(`This week your value had a **typical daily swing of about ±${v}%**, and now sits **${d}%** below its 7-day high.`);
    }
  } else {
    lines.push(`Overall this book reads as **${facts.riskLevel}** risk.`);
  }

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
