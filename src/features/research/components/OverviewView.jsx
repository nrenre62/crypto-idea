// components/OverviewView.jsx — pure UI composition. No fetch, no math.
import Pulse from './Pulse';
import AllocationBar from './AllocationBar';
import RiskMeter from './RiskMeter';
import StressTest from './StressTest';
import { abbreviate, fmtPct } from '../utils/format';

function Brief({ portfolio, empty }) {
  if (empty) {
    return (
      <div className="card brief">
        <div className="brief-top"><div className="brief-greet">Welcome</div></div>
        <div className="brief-row"><span className="brief-ic ic-up">＋</span><span>Add your first coin to start seeing AI insights.</span></div>
      </div>
    );
  }
  const p24 = portfolio.perf['24h'];
  const chg = portfolio.total - portfolio.total / (1 + p24 / 100);
  const mover = [...portfolio.holdings].sort((a, b) => b.c24 - a.c24)[0];
  const watch = [...portfolio.holdings].sort((a, b) => Math.abs(b.c24) - Math.abs(a.c24))[0];
  return (
    <div className="card brief">
      <div className="brief-top"><div className="brief-greet">Good day</div></div>
      <div className="brief-sub">Here's what moved while you were away.</div>
      <div className="brief-row"><span className="brief-ic ic-up">▲</span><span>Portfolio is <b>{p24 >= 0 ? 'up ' : 'down '}{abbreviate(Math.abs(chg))} ({fmtPct(p24)})</b> over the last 24 hours.</span></div>
      <div className="brief-row"><span className="brief-ic ic-move">◆</span><span>Today's top mover: <b>{mover.name} {fmtPct(mover.c24)}</b>.</span></div>
      <div className="brief-row"><span className="brief-ic ic-watch">!</span><span>Worth watching: <b>{watch.name} volatility</b>.</span></div>
    </div>
  );
}

// R13-3: the source chips + "Updated just now" freshness line were removed (founder:
// clutter). `status`/`asOf` (and the freshness helpers) went with them — kept out of the
// signature so no dead code remains. Freshness is an internal cost lever, not user-facing.
export default function OverviewView({ portfolio, empty, pulse, tf, onTf, onShare }) {
  return (
    <div className="view active">
      <Brief portfolio={portfolio} empty={empty} />
      <Pulse
        perf={empty ? 0 : portfolio.perf[tf]} tf={tf} onTf={onTf}
        text={pulse.text} offline={pulse.offline} loading={pulse.loading}
        onRegenerate={pulse.regenerate} onShare={onShare} empty={empty}
      />

      {!empty && (
        <div className="pulse" style={{ background: 'transparent', padding: 0, boxShadow: 'none' }}>
          <div className="pulse-inner">
            <AllocationBar holdings={portfolio.holdings} />
            <RiskMeter risk={portfolio.risk} holdings={portfolio.holdings} />
          </div>
        </div>
      )}

      {!empty && <StressTest holdings={portfolio.holdings} />}

      <div className="diversify">
        {/* R7-5: a grid/allocation glyph = diversification (the slot was empty → blank
            box in both themes). Tinted via .dic { color:var(--accent) }. */}
        <div className="dic" aria-hidden="true">▦</div>
        <div>
          <h3>A note on diversification</h3>
          <p>{empty
            ? 'Diversification tips appear once you hold a few coins.'
            : `Your top two coins make up about ${Math.round(portfolio.risk.top2)}% of your portfolio. Spreading across more assets is one of the simplest ways to reduce single-coin risk — a core idea in The Edge.`}</p>
          <a href="/edge">Read the principle →</a>
        </div>
      </div>
    </div>
  );
}
