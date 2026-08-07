// components/CoinsView.jsx — coins grid + R32 custom drag-and-drop order (THIS view only).
import { useState, useEffect, useRef } from 'react';
import CoinCard from './CoinCard';
import EmptyState from './EmptyState';
import { applyCoinOrder } from '../utils/portfolio';

export default function CoinsView({ holdings, coinOrder, onReorder, empty, onAsk }) {
  const [sorting, setSorting] = useState(false);
  // The displayed order = the saved custom order applied to the value-desc holdings.
  const ordered = applyCoinOrder(holdings, coinOrder);
  // Local id order while sorting (so a drag stays smooth); resynced from props when idle.
  const [ids, setIds] = useState(() => ordered.map((h) => h.id));
  useEffect(() => { if (!sorting) setIds(ordered.map((h) => h.id)); /* eslint-disable-next-line */ }, [holdings, coinOrder, sorting]);

  const byId = new Map(holdings.map((h) => [h.id, h]));
  const list = ids.map((id) => byId.get(id)).filter(Boolean);
  for (const h of holdings) if (!ids.includes(h.id)) list.push(h);   // a coin added later lands at the end

  const commit = (order) => { setIds(order); if (onReorder) onReorder(order); };
  const move = (from, to) => {
    if (from === to || to < 0 || to >= list.length) return;
    const order = list.map((h) => h.id);
    const [x] = order.splice(from, 1);
    order.splice(to, 0, x);
    commit(order);
  };

  // Pointer drag (mouse + touch, no deps): pointerdown on the handle tracks the row; on
  // pointermove we reorder live by comparing the pointer Y to each row's midpoint.
  const rowsRef = useRef([]);
  const drag = useRef(null);
  const onDown = (index) => (e) => { e.preventDefault(); drag.current = { index }; e.target.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => {
    if (!drag.current) return;
    const y = e.clientY;
    const rows = rowsRef.current.filter(Boolean);
    let target = drag.current.index;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) { target = i; break; }
      target = i;
    }
    if (target !== drag.current.index) { move(drag.current.index, target); drag.current.index = target; }
  };
  const onUp = () => { drag.current = null; };

  const doReset = () => { setIds(holdings.map((h) => h.id)); if (onReorder) onReorder([]); setSorting(false); };

  if (empty) return (<div className="view active"><div className="sec-label"><h2>Your coins</h2></div><EmptyState /></div>);

  return (
    <div className="view active">
      <div className="sec-label">
        <h2>Your coins</h2>
        {sorting ? (
          <span className="coins-sort-actions">
            <button type="button" className="coins-sort-btn" onClick={doReset}>Reset to auto</button>
            <button type="button" className="coins-sort-btn primary" onClick={() => setSorting(false)}>Done</button>
          </span>
        ) : (
          <button type="button" className="coins-sort-btn" onClick={() => setSorting(true)}>Sort</button>
        )}
      </div>
      {sorting ? (
        <div className="coins-sort-list" onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          {list.map((h, i) => (
            <div key={h.id} className="coins-sort-row" ref={(el) => { rowsRef.current[i] = el; }}>
              <button type="button" className="coins-drag-handle" aria-label={`Reorder ${h.name}`} style={{ touchAction: 'none' }}
                onPointerDown={onDown(i)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1); }
                  else if (e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1); }
                }}>≡</button>
              <span className="coins-sort-name">{h.name}</span>
              <span className="coins-sort-sym">{(h.sym || '').toUpperCase()}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="coins-grid">
          {list.map((h, i) => <CoinCard key={h.id} holding={h} index={i} onAsk={onAsk} />)}
        </div>
      )}
    </div>
  );
}
