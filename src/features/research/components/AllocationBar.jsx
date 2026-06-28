// components/AllocationBar.jsx — pure UI. Receives already-computed holdings.
// R2-7: colour each segment + legend dot by the coin's ORIGINAL brand colour (the same
// coinColor map the token circles use) so no two coins repeat (the old PALETTE fallback
// gave SOL and BNB the same green).
import { coinColor } from '../../../components/ui.jsx';

export default function AllocationBar({ holdings }) {
  let items = holdings.map((h) => ({ name: h.sym, alloc: h.alloc, c: coinColor(h.sym) }));
  if (items.length > 5) {
    const other = items.slice(4).reduce((s, x) => s + x.alloc, 0);
    items = [...items.slice(0, 4), { name: 'Other', alloc: other, c: '#c9c6bc' }];
  }
  const concentrated = holdings[0] && holdings[0].alloc > 50;

  return (
    <div className="alloc">
      <div className="alloc-top">
        <h4>Allocation</h4>
        {concentrated && <span className="alloc-flag">High concentration</span>}
      </div>
      <div className="alloc-bar">
        {items.map((it, i) => (
          <div key={i} className="alloc-seg" style={{ width: it.alloc + '%', background: it.c }} />
        ))}
      </div>
      <div className="alloc-legend">
        {items.map((it, i) => (
          <span key={i} className="leg">
            <span className="sw" style={{ background: it.c }} />
            {it.name} <b>{Math.round(it.alloc)}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}
