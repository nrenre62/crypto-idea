// components/OverviewView.jsx — pure UI composition. No fetch, no math.
import Pulse from './Pulse';
import AllocationBar from './AllocationBar';
import RiskMeter from './RiskMeter';
import StressTest from './StressTest';
import { abbreviate, fmtPct } from '../utils/format';
import { briefFacts } from '../utils/pulse';
import { pickNote } from '../utils/notes';

// A percentage label that reads "≈0%" when it rounds to 0.0% (an honest "flat", not a
// misleading "+0.0%") and keeps the signed glyph otherwise.
const pctLabel = (x) => (Math.round(Math.abs(x) * 10) / 10 === 0 ? '≈0%' : fmtPct(x));

// CRYP-95: the Daily Brief renders from briefFacts — a sign-matched 24h move (B-1)
// plus, on a mixed book, BOTH the biggest gainer (B-2) and the biggest decliner (B-3),
// each shown only when it exists. The old single "top mover" + "… volatility" line is
// gone (a coin's move isn't "volatility", and an all-down book had no honest "gainer").
function Brief({ portfolio, empty }) {
  if (empty) {
    return (
      <div className="card brief">
        <div className="brief-top"><div className="brief-greet">Welcome</div></div>
        <div className="brief-row"><span className="brief-ic ic-up">＋</span><span>Add your first coin to start seeing your portfolio summary.</span></div>
      </div>
    );
  }
  const bf = briefFacts(portfolio);
  const up = bf.pct24 >= 0;
  return (
    <div className="card brief">
      <div className="brief-top"><div className="brief-greet">Good day</div></div>
      <div className="brief-sub">Here's what moved while you were away.</div>
      <div className="brief-row"><span className="brief-ic ic-up">▲</span><span>Portfolio is <b>{up ? 'up' : 'down'} {abbreviate(Math.abs(bf.chg24))} ({bf.nearZero ? '≈0%' : fmtPct(bf.pct24)})</b> over the last 24 hours.</span></div>
      {bf.gainer && <div className="brief-row"><span className="brief-ic ic-move">◆</span><span>Today's biggest gainer: <b>{bf.gainer.name} {pctLabel(bf.gainer.c24)}</b>.</span></div>}
      {bf.decliner && <div className="brief-row"><span className="brief-ic ic-watch">▾</span><span>Biggest decliner: <b>{bf.decliner.name} {pctLabel(bf.decliner.c24)}</b>.</span></div>}
    </div>
  );
}

// R13-3: the source chips + "Updated just now" freshness line were removed (founder:
// clutter). `status`/`asOf` (and the freshness helpers) went with them — kept out of the
// signature so no dead code remains. Freshness is an internal cost lever, not user-facing.
export default function OverviewView({ portfolio, empty, pulse, tf, onTf, onShare }) {
  // CRYP-99: the note shown is chosen by the pure pickNote rule engine (empty book,
  // NaN-safe top-two %, and the no-name/no-link compliance all live there).
  const note = pickNote(portfolio);
  return (
    <div className="view active">
      <Brief portfolio={portfolio} empty={empty} />
      <Pulse
        perf={empty ? 0 : portfolio.perf[tf]} tf={tf} onTf={onTf}
        text={pulse.text} loading={pulse.loading}
        onShare={onShare} empty={empty}
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
        {/* CRYP-99: a rotating "notes" area — ONE general guide note picked from the
            portfolio's allocation + risk (pickNote). No link: the old "/edge" pointer
            moved to the landing footer as a Resource. The ▦ grid glyph fills the icon
            slot (R7-5: an empty .dic was a blank box in both themes). */}
        <div className="dic" aria-hidden="true">▦</div>
        <div>
          <h3>A note on your portfolio</h3>
          <p>{note.text}</p>
        </div>
      </div>
    </div>
  );
}
