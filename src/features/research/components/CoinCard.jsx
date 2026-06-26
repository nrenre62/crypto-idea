// components/CoinCard.jsx — pure UI. Expansion is local view state.
import { useState } from 'react';
import Sparkline from './Sparkline';
import { visualFor, sentimentOf } from '../utils/coins';
import { money, abbreviate, priceFmt, fmtPct } from '../utils/format';
import { STATES } from '../utils/conviction';
import { mockConviction } from '../data/mock-conviction';

// Today as YYYY-MM-DD, for catalyst auto-expiry (#11).
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function CoinCard({ holding, index, onAsk }) {
  const [open, setOpen] = useState(false);
  const v = visualFor(holding, index);
  const s = sentimentOf(holding);
  const subColor = holding.c24 >= 0 ? 'var(--accent)' : 'var(--warn)';
  const pl = holding.avgCost ? (holding.price / holding.avgCost - 1) * 100 : null;
  // Conviction signals (#8/#9/#11). MOCK evidence today (live AI is Wave B); swap
  // mockConviction -> the live per-coin cache when the proxy ships — reducer + UI stay.
  const conv = mockConviction(holding, todayISO());

  return (
    <div
      className={'coin-card' + (open ? ' open' : '')}
      role="button" tabIndex={0} aria-expanded={open}
      aria-label={`${holding.name}, ${money(holding.value)}, ${Math.round(holding.alloc)} percent of portfolio`}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o); } }}
    >
      <div className="cc-top">
        <div className="coin" style={{ background: v.color }}>{v.glyph}</div>
        <div className="cc-id">
          <div className="cc-name">{holding.name}</div>
          <div className="cc-meta">{+holding.amount.toFixed(6)} {holding.sym}</div>
        </div>
        <Sparkline prices={holding.spark} up={(holding.c7d || 0) >= 0} />
        <div className="cc-right">
          <div className="cc-val">{abbreviate(holding.value)}</div>
          <div className="cc-share" style={{ color: subColor }}>{fmtPct(holding.c24)} · {Math.round(holding.alloc)}%</div>
        </div>
        <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
      </div>

      <span className={'sentiment ' + s.cls}><span className="d" />Sentiment: {s.label}</span>

      {/* Conviction signals (Dev / Founders / Team / Community) — graded by the rubric
          reducer from cross-checked sources (#8/#9). ⬛ shows a reason chip, never a
          silent blank. Mock evidence today; live AI is Wave B. */}
      <div className="conv-row">
        {conv.axes.map((a) => (
          <span key={a.key} className={'csig csig-' + STATES[a.state].cls} title={a.reason || STATES[a.state].label}>
            <span className="csd" />{a.label}
            {a.reason ? <span className="csig-reason"> · {a.reason}</span> : null}
          </span>
        ))}
      </div>
      {conv.catalysts.length > 0 && (
        <div className="conv-cats">
          {conv.catalysts.map((c, i) => (<span key={i} className="conv-cat">📅 {c.label} · {c.date}</span>))}
        </div>
      )}
      <div className="conv-note">{(conv.asOf ? `Conviction signals as of ${conv.asOf} · ` : '') + 'These cover funnel steps 1–2; you apply 3–5.'}</div>

      <p className="cc-insight">{holding.name} is {Math.round(holding.alloc)}% of your portfolio and moved {fmtPct(holding.c24)} today.</p>

      <div className="cc-detail"><div className="cc-detail-inner">
        <div className="pos-stats">
          <div className="pos-stat"><div className="ps-l">Avg cost</div><div className="ps-v">{holding.avgCost ? priceFmt(holding.avgCost) : '—'}</div></div>
          <div className="pos-stat"><div className="ps-l">Now</div><div className="ps-v">{priceFmt(holding.price)}</div></div>
          <div className="pos-stat"><div className="ps-l">P / L</div><div className="ps-v" style={{ color: pl == null ? 'var(--ink-faint)' : pl >= 0 ? 'var(--accent)' : 'var(--warn)' }}>{pl == null ? '—' : fmtPct(pl)}</div></div>
          <div className="pos-stat"><div className="ps-l">30d</div><div className="ps-v" style={{ color: (holding.c30d || 0) >= 0 ? 'var(--accent)' : 'var(--warn)' }}>{fmtPct(holding.c30d || 0)}</div></div>
        </div>
        <button className="cc-ask" onClick={(e) => { e.stopPropagation(); onAsk(holding.name); }}>Ask AI about {holding.name}</button>
      </div></div>
    </div>
  );
}
