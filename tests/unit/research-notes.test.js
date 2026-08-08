// CRYP-99 (RESEARCH-NOTES): the Research Overview "notes" area rule engine.
// pickNote(portfolio) returns exactly ONE general guide note, chosen from the
// portfolio's allocation + risk as the highest-relevance matching rule. Notes
// carry no link, name no coin the user doesn't hold, and give no advice.
import { describe, it, expect } from 'vitest';
import { pickNote, noteFacts, RULES, DEFAULT_NOTE, EMPTY_NOTE } from '../../src/features/research/utils/notes.js';

// Build a holding; defaults give it a written thesis and a neutral 1:1 cost basis.
const H = (over = {}) => ({ name: 'Coin', amount: 1, avgCost: 1, value: 1, alloc: 0, journal: { thesis: 'why I hold it' }, ...over });
// Build a portfolio in the shape OverviewView receives (holdings value-desc).
const P = ({ holdings = [], total, perf, risk } = {}) => ({
  holdings,
  total: total != null ? total : holdings.reduce((s, h) => s + (h.value || 0), 0),
  perf: perf || { '24h': 0, '7d': 0, '30d': 0 },
  risk: risk || { level: 'Moderate', megaAlloc: 0 },
});
// N evenly-weighted coins (alloc = 100/N each) with a chosen risk + cost basis.
const evenBook = (n, { level = 'Moderate', mega = 50, invested = 100, total = 100, thesisAll = true } = {}) => {
  const holdings = Array.from({ length: n }, (_, i) => H({
    name: `C${i}`,
    amount: 1,
    avgCost: invested / n,
    value: total / n,
    alloc: 100 / n,
    ...(thesisAll ? {} : (i === 0 ? { journal: {} } : {})),
  }));
  return P({ holdings, total, risk: { level, megaAlloc: mega } });
};

describe('CRYP-99 notes rule engine — one note, most relevant wins', () => {
  it('empty book → the empty-state note', () => {
    const r = pickNote(P({ holdings: [] }));
    expect(r.key).toBe('empty');
    expect(r.text).toBe(EMPTY_NOTE);
  });

  it('one coin → one-coin note (beats every other rule, even a big loss)', () => {
    const r = pickNote(P({ holdings: [H({ alloc: 100, amount: 1, avgCost: 100, value: 40 })], total: 40, risk: { level: 'High', megaAlloc: 0 } }));
    expect(r.key).toBe('one-coin'); // relevance 100 dominates drawdown/high-risk
  });

  it('down ≥15% → drawdown note, and it OUTRANKS concentration', () => {
    // 2 coins (top2 = 100 ≥ 60 → concentration would match) but down 30% → drawdown wins.
    const holdings = [H({ alloc: 60, amount: 1, avgCost: 100, value: 70 }), H({ alloc: 40, amount: 1, avgCost: 0, value: 0 })];
    const r = pickNote(P({ holdings, total: 70, risk: { level: 'Moderate', megaAlloc: 50 } }));
    expect(r.key).toBe('drawdown'); // 92 > concentration 88
  });

  it('top-2 ≥ 60% (flat book) → concentration note naming the real %', () => {
    const holdings = [H({ alloc: 40, avgCost: 1, value: 1 }), H({ alloc: 35, avgCost: 1, value: 1 }), H({ alloc: 25, avgCost: 1, value: 1 })];
    const r = pickNote(P({ holdings, total: 3, risk: { level: 'Moderate', megaAlloc: 50 } }));
    expect(r.key).toBe('concentration');
    expect(r.text).toMatch(/about 75%/); // 40 + 35
    expect(r.text).not.toMatch(/NaN/);
  });

  it('risk level High → high-risk note', () => {
    const r = pickNote(evenBook(5, { level: 'High', mega: 10 }));
    expect(r.key).toBe('high-risk');
  });

  it('2–4 coins (founder example) → under-diversified note naming the count', () => {
    const r = pickNote(evenBook(4, { level: 'Moderate', mega: 50 }));
    expect(r.key).toBe('under-diversified');
    expect(r.text).toMatch(/just 4 coins/);
  });

  it('up ≥30% → winner note (outranks balanced)', () => {
    const r = pickNote(evenBook(5, { level: 'Moderate', mega: 50, invested: 100, total: 140 }));
    expect(r.key).toBe('winner');
  });

  it('≥5 coins with <20% in large caps → thin-anchor note', () => {
    const r = pickNote(evenBook(5, { level: 'Moderate', mega: 10 }));
    expect(r.key).toBe('thin-anchor');
  });

  it('≥5 coins with ≥90% in large caps (Low risk) → all-large-cap note; 89% does NOT trigger it', () => {
    expect(pickNote(evenBook(5, { level: 'Low', mega: 90 })).key).toBe('all-large-cap');
    expect(pickNote(evenBook(5, { level: 'Low', mega: 89 })).key).not.toBe('all-large-cap');
  });

  it('a held coin without a thesis → no-thesis note', () => {
    const r = pickNote(evenBook(5, { level: 'Moderate', mega: 50, thesisAll: false }));
    expect(r.key).toBe('no-thesis');
  });

  it('≥5 coins, top-2 <40%, all healthy → balanced note', () => {
    const r = pickNote(evenBook(6, { level: 'Low', mega: 50 })); // 6 even coins → top2 = 33% (<40)
    expect(r.key).toBe('balanced');
  });

  it('nothing notable → default note (never blank)', () => {
    // 5 coins, top2 = 50 (>40, <60), moderate risk, small loss, all thesis → no rule fires.
    const holdings = [
      H({ alloc: 30, avgCost: 1, value: 1 }), H({ alloc: 20, avgCost: 1, value: 1 }),
      H({ alloc: 20, avgCost: 1, value: 1 }), H({ alloc: 15, avgCost: 1, value: 1 }), H({ alloc: 15, avgCost: 1, value: 1 }),
    ];
    // invested = 5 (5×1×1); total = 5 → pnl 0 (no drawdown/winner). top2 = 50 (no concentration/balanced).
    const r = pickNote(P({ holdings, total: 5, risk: { level: 'Moderate', megaAlloc: 50 } }));
    expect(r.key).toBe('default');
    expect(r.text).toBe(DEFAULT_NOTE.text);
  });
});

describe('CRYP-99 notes — compliance (no names, no links, always a string)', () => {
  const facts = noteFacts(P({ holdings: [H({ alloc: 60, value: 1 }), H({ alloc: 40, value: 1 })], total: 2 }));
  const allTexts = [...RULES.map((r) => r.text(facts)), DEFAULT_NOTE.text, EMPTY_NOTE];

  it('no rule text names a real investor (dist no-names guard)', () => {
    for (const t of allTexts) expect(t).not.toMatch(/buffett|munger|marks|graham/i);
  });
  it('no rule text embeds a link', () => {
    for (const t of allTexts) expect(t).not.toMatch(/https?:\/\/|href|\/edge/i);
  });
  it('every rule yields a non-empty string', () => {
    for (const t of allTexts) { expect(typeof t).toBe('string'); expect(t.trim().length).toBeGreaterThan(0); }
  });
});
