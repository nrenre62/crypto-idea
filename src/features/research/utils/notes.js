// utils/notes.js — the Research Overview "notes" area (CRYP-99 / RESEARCH-NOTES).
//
// Pure, no state/DOM/fetch. pickNote(portfolio) returns EXACTLY ONE general guide
// note, chosen from the portfolio's allocation + risk. Each note is a rule with a
// relevance weight; the note shown is the highest-relevance rule that currently
// matches — so as the portfolio changes a different note surfaces ("most relevant
// each time", made deterministic). One note at a time; never a link. Every line
// obeys the Pulse S1–S4 compliance rules: neutral education, no advice, no
// prediction/target, and never names a coin the user doesn't hold (these notes name
// no coin at all). Facts come only from the portfolio OverviewView already receives
// (holdings + risk from deriveRisk) — no new data, no new call.

const fin = (n) => (Number.isFinite(n) ? n : 0);
const hasThesis = (h) => !!(h.journal && h.journal.thesis && String(h.journal.thesis).trim());

// Flat facts record derived once per render. Cost-basis P&L is computed here the same
// way pulse.js does (computePortfolio carries no cost); everything else reads off the
// portfolio. holdings arrive value-desc (computePortfolio), so slice(0,2) = the top two.
export function noteFacts(portfolio) {
  const holdings = (portfolio && portfolio.holdings) || [];
  const risk = (portfolio && portfolio.risk) || {};
  const n = holdings.length;
  const invested = fin(holdings.reduce((s, h) => s + (h.amount || 0) * (h.avgCost || 0), 0));
  const hasCost = invested > 0;
  const total = fin(portfolio && portfolio.total);
  const pnlPct = hasCost ? fin(((total - invested) / invested) * 100) : 0;
  return {
    empty: n === 0,
    n,
    top2: fin(holdings.slice(0, 2).reduce((s, h) => s + (h.alloc || 0), 0)),
    mega: fin(risk.megaAlloc),
    level: risk.level || '',
    hasCost,
    pnlPct,
    noThesis: holdings.some((h) => !hasThesis(h)),
  };
}

// The rules — each { key, relevance, test(facts), text(facts) }. Copy is founder-
// approved (2026-08-08) in the no-names / no-advice voice. Backticks throughout so the
// apostrophes/quotes in the copy need no escaping. Order here is descending relevance
// for readability; pickNote uses argmax so it never depends on the array order.
export const RULES = [
  {
    key: 'one-coin',
    relevance: 100,
    test: (f) => f.n === 1,
    text: () => `Everything you hold is in a single coin, so your whole result rides on one asset. Adding a second position you understand is the simplest way to lower that.`,
  },
  {
    key: 'drawdown',
    relevance: 92,
    test: (f) => f.hasCost && f.pnlPct <= -15,
    text: () => `Your portfolio is below what you put in. Down stretches are when a plan gets tested — the useful question is usually whether the reasons you bought still hold, not just where the price is.`,
  },
  {
    key: 'concentration',
    relevance: 88,
    test: (f) => f.n >= 2 && f.top2 >= 60,
    text: (f) => `Your top two coins make up about ${Math.round(f.top2)}% of your portfolio. Spreading across more assets is one of the simplest ways to reduce single-coin risk.`,
  },
  {
    key: 'high-risk',
    relevance: 80,
    test: (f) => f.level === 'High',
    text: () => `Your mix leans toward higher-risk, smaller-cap coins. Those tend to move harder in both directions — how much you put in each one matters as much as which ones you pick.`,
  },
  {
    key: 'under-diversified',
    relevance: 72,
    test: (f) => f.n >= 2 && f.n <= 4,
    text: (f) => `You're holding just ${f.n} coins, so each one has a big say in how your portfolio does. Adding a few more you understand spreads that influence out.`,
  },
  {
    key: 'winner',
    relevance: 64,
    test: (f) => f.hasCost && f.pnlPct >= 30,
    text: () => `One position has run up and now takes a bigger share of your portfolio than you may have started with. It's worth knowing how concentrated a winner has quietly made you.`,
  },
  {
    key: 'thin-anchor',
    relevance: 56,
    test: (f) => f.n >= 5 && f.mega < 20,
    text: () => `Only a small slice sits in large, established coins. Higher-ranked assets have historically swung less than the long tail — some weight there can steady a portfolio.`,
  },
  {
    key: 'all-large-cap',
    relevance: 48,
    test: (f) => f.n >= 5 && f.mega >= 90 && f.level !== 'High',
    text: () => `You're concentrated in large-cap coins. That's lower-volatility than the long tail, but "big" and "safe" aren't the same thing — every coin still carries market risk.`,
  },
  {
    key: 'no-thesis',
    relevance: 40,
    test: (f) => f.noThesis,
    text: () => `Some of your coins don't have a written reason for holding them yet. Noting why you bought each one gives you something concrete to review later, instead of just the price.`,
  },
  {
    key: 'balanced',
    relevance: 24,
    test: (f) => f.n >= 5 && f.top2 < 40,
    text: () => `Your holdings look well spread out — no single coin dominates. Diversification is upkeep, not a one-time setting: it's worth re-checking as prices move your weights around.`,
  },
];

// Shown when a non-empty book matches no rule (rare — keeps the area from ever going blank).
export const DEFAULT_NOTE = {
  key: 'default',
  text: `Keeping your holdings varied and knowing why you own each one are two of the simplest habits for a steadier portfolio.`,
};

// Shown before scoring on an empty book.
export const EMPTY_NOTE = 'Notes about your portfolio appear once you hold a few coins.';

// The selector: highest-relevance matching rule (argmax — order-independent). Empty
// book short-circuits; no match falls to the default so the note area is never blank.
export function pickNote(portfolio) {
  const f = noteFacts(portfolio);
  if (f.empty) return { key: 'empty', text: EMPTY_NOTE };
  let best = null;
  for (const r of RULES) {
    if (r.test(f) && (!best || r.relevance > best.relevance)) best = r;
  }
  return best ? { key: best.key, text: best.text(f) } : { key: DEFAULT_NOTE.key, text: DEFAULT_NOTE.text };
}
