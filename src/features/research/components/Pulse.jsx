// components/Pulse.jsx — pure UI. All data + AI state arrive as props.
import { fmtPct } from '../utils/format';
import CountUp from './CountUp';

const TF = ['24h', '7d', '30d'];
const LABEL = { '24h': '24H', '7d': '7D', '30d': '30D' };

// Render **bold** + newlines without dangerouslySetInnerHTML.
function Rich({ text }) {
  return text.split('\n').map((line, li) => (
    <span key={li}>
      {li > 0 && <br />}
      {line.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>))}
    </span>
  ));
}

export default function Pulse({ perf, tf, onTf, text, offline, loading, onRegenerate, onShare, empty }) {
  return (
    <div className="pulse">
      <div className="pulse-inner">
        <div className="pulse-head">
          <div className="left"><span className="pulse-label ai-gradient-text">Portfolio Pulse</span></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="regen" onClick={onShare} disabled={empty} aria-label="Share your Pulse">Share</button>
            <button className="regen" onClick={onRegenerate} disabled={empty}>Regenerate</button>
          </div>
        </div>

        <div className="tf">
          <div className="tf-head">
            {empty ? 'Portfolio empty' : (<>{LABEL[tf]} <span className={'pct' + (perf < 0 ? ' neg' : '')}><CountUp value={perf} format={fmtPct} /></span></>)}
          </div>
          <div className="tf-pills">
            {TF.map((t) => (
              <button key={t} className={t === tf ? 'active' : ''} disabled={empty} onClick={() => onTf(t)}>{LABEL[t]}</button>
            ))}
          </div>
        </div>

        <p className="pulse-text">
          {loading ? (<><span className="p-sk w90" /><span className="p-sk w70" /><span className="p-sk w50" /></>) : <Rich text={text} />}
        </p>
        {offline && (
          <div className="ai-note"><span className="dot" />AI is offline right now — showing a basic summary from your numbers.</div>
        )}
      </div>
    </div>
  );
}
