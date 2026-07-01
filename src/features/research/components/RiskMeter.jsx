// components/RiskMeter.jsx — pure UI. A STATIC, segmented read-out (no draggable
// handle) so users read risk as a calculated result, not an adjustable control.
// RT-22: segments run a traffic-light spectrum (green→amber→orange→red) so the
// colour itself shows low vs high; filled solid, the rest ghosted to hint the scale.
import { riskSpectrum, levelColor, levelTint } from '../utils/riskColor';
import { riskNote } from '../utils/portfolio';

const SEGMENTS = 20;

export default function RiskMeter({ risk, holdings }) {
  // R14: fill + note come from the allocation-weighted market-cap risk (was concentration).
  const fill = Math.max(1, Math.min(SEGMENTS, Math.round(risk.score * SEGMENTS)));
  const note = holdings[0] ? riskNote(risk.breakdown) : '';

  return (
    <div className="risk">
      <div className="risk-top">
        <h4>Portfolio risk</h4>
        <span className="risk-val" style={{ color: levelColor(risk.level), background: levelTint(risk.level) }}>{risk.level}</span>
      </div>
      <div className="risk-meter" role="img" aria-label={`Portfolio risk level: ${risk.level}`}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className={'rseg' + (i < fill ? ' on' : '')} style={{ background: riskSpectrum(i / (SEGMENTS - 1)) }} />
        ))}
      </div>
      <div className="risk-scale"><span>Low</span><span>Moderate</span><span>High</span></div>
      <div className="risk-note">{note}</div>
      <div className="risk-foot">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        Calculated from your holdings — it updates automatically and isn&rsquo;t adjustable.
      </div>
    </div>
  );
}
