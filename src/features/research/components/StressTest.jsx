// components/StressTest.jsx — pure UI. Slider state is local view state; the
// scenario math is a pure util (no business rules live here).
import { useState } from 'react';
import { stressScenario } from '../utils/portfolio';
import { abbreviate, fmtPct } from '../utils/format';
import CountUp from './CountUp';

export default function StressTest({ holdings }) {
  const [move, setMove] = useState(0);
  const { base, total, changePct } = stressScenario(holdings, move);

  return (
    <div className="card">
      <div className="card-head"><h3>Stress test</h3></div>
      <div className="card-sub">Drag to model a market move and see how your portfolio would react.</div>
      <div className="scn-val">
        <div className="scn-total"><CountUp value={total} format={abbreviate} /></div>
        <div className={'scn-chg' + (move === 0 ? '' : changePct >= 0 ? ' up' : ' down')}>
          {move === 0 ? 'at today’s prices' : fmtPct(changePct)}
        </div>
      </div>
      <input
        className="scn-slider" type="range" min="-50" max="50" step="1" value={move}
        onChange={(e) => setMove(+e.target.value)} aria-label="Market move percent"
      />
      <div className="scn-scale"><span>−50%</span><span>Market move</span><span>+50%</span></div>
      <div className="scn-note">
        {move === 0 ? (
          <>Your portfolio today is <b>{abbreviate(base)}</b>. Move the slider to model a broad market swing.</>
        ) : (
          <>A <b>{Math.abs(move)}% market {move > 0 ? 'rise' : 'drop'}</b> would move you to about <b>{abbreviate(total)}</b> ({fmtPct(changePct)}). Your higher-beta holdings amplify the swing.</>
        )}
      </div>
      <div className="scn-assume">Illustrative model — each coin moves with the market scaled by its typical volatility.</div>
    </div>
  );
}
