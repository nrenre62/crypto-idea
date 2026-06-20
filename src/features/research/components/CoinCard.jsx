// components/CoinCard.jsx — pure UI. Expansion is local view state.
import { useState } from 'react';
import Sparkline from './Sparkline';
import { visualFor, sentimentOf } from '../utils/coins';
import { money, abbreviate, priceFmt, fmtPct } from '../utils/format';

export default function CoinCard({ holding, index, onAsk }) {
  const [open, setOpen] = useState(false);
  const v = visualFor(holding, index);
  const s = sentimentOf(holding);
  const subColor = holding.c24 >= 0 ? 'var(--accent)' : 'var(--warn)';
  const pl = holding.avgCost ? (holding.price / holding.avgCost - 1) * 100 : null;

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

      {/* Conviction signals — design placeholder (Dev / Founders / Team / Community).
          Neutral/pending: the AI research engine is offline, so we show the four
          categories without faking a green/red verdict. */}
      <div className="conv-row">
        {['Dev', 'Founders', 'Team', 'Community'].map((k) => (
          <span key={k} className="csig"><span className="csd" />{k}</span>
        ))}
      </div>
      <div className="conv-note">AI conviction analysis — coming soon</div>

      <p className="cc-insight">{holding.name} is {Math.round(holding.alloc)}% of your portfolio and moved {fmtPct(holding.c24)} today.</p>

      <div className="cc-detail"><div className="cc-detail-inner">
        <div className="pos-stats">
          <div className="pos-stat"><div className="ps-l">Avg cost</div><div className="ps-v">{holding.avgCost ? priceFmt(holding.avgCost) : '—'}</div></div>
          <div className="pos-stat"><div className="ps-l">Now</div><div className="ps-v">{priceFmt(holding.price)}</div></div>
          <div className="pos-stat"><div className="ps-l">P / L</div><div className="ps-v" style={{ color: pl == null ? 'var(--ink-faint)' : pl >= 0 ? 'var(--accent)' : 'var(--warn)' }}>{pl == null ? '—' : fmtPct(pl)}</div></div>
        </div>
        <button className="cc-ask" onClick={(e) => { e.stopPropagation(); onAsk(holding.name); }}>Ask AI about {holding.name}</button>
      </div></div>
    </div>
  );
}
