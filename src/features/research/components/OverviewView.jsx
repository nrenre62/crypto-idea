// components/OverviewView.jsx — pure UI composition. No fetch, no math.
import Pulse from './Pulse';
import AllocationBar from './AllocationBar';
import RiskMeter from './RiskMeter';
import StressTest from './StressTest';
import { abbreviate, fmtPct } from '../utils/format';
import { useRelativeTime } from '../hooks/useRelativeTime';

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

export default function OverviewView({ portfolio, empty, pulse, tf, onTf, status, asOf, onShare }) {
  const rel = useRelativeTime(asOf);
  const failed = status === 'refresh-failed' || status === 'rate-limited';
  const tail = status === 'rate-limited' ? 'rate-limited, retrying soon' : 'couldn’t refresh';
  const freshness = empty
    ? 'Nothing to update yet'
    : failed
    ? (portfolio.live ? `Updated ${rel} · ${tail}` : `Sample data · ${tail}`)
    : (portfolio.live ? `Updated ${rel}` : 'Sample data');

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
            <div className="sources">
              <div className="src-chips">
                <span className="src-chip">Your holdings</span>
                <span className="src-chip">Live prices</span>
                <span className="src-chip">Market trends</span>
              </div>
              <span className="fresh" style={failed ? { color: 'var(--warn)' } : null}>
                <span className="d" style={failed ? { background: 'var(--warn)' } : null} />{freshness}
              </span>
            </div>
          </div>
        </div>
      )}

      {!empty && <StressTest holdings={portfolio.holdings} />}

      <div className="diversify">
        <div className="dic" />
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
