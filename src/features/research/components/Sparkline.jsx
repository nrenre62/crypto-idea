// components/Sparkline.jsx — pure UI.
import { sparkPath } from '../utils/sparkline';

export default function Sparkline({ prices, up, width = 46, height = 18 }) {
  const d = sparkPath(prices, width, height);
  if (!d) return <span className="cc-spark" style={{ width }} />;
  return (
    <svg className="cc-spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
      <path d={d} stroke={up ? 'var(--accent)' : 'var(--warn)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
