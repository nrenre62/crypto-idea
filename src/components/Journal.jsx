import { useState } from "react";
import { useApp } from "../hooks/app-context.js";
import { fmtP } from "../utils/format.js";
import { CI } from "./ui.jsx";

/**
 * Journal tab — the "write before you buy" thesis log.
 *
 * Lists the active portfolio's coins that have a thesis (coin.journal), newest
 * first, each with a status pill. Tapping one opens the detail overlay with the
 * full thesis + "is your thesis still intact?" review decision (intact / review /
 * challenged) which persists via reviewThesis. All data + handlers come from
 * context; this component is presentation-only. Scoped under .ci-app.
 */
const STATUS = {
  intact:     { cls: "j-intact",     label: "Thesis intact",     dot: "🟢" },
  review:     { cls: "j-review",     label: "Review signals",    dot: "🟡" },
  challenged: { cls: "j-challenged", label: "Thesis challenged", dot: "🔴" },
};

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function Journal() {
  const { portfolio, setScreen, reviewThesis } = useApp();
  const [openCoin, setOpenCoin] = useState(null);

  const entries = portfolio
    .filter((c) => c.journal && (c.journal.thesis || c.journal.changeMyMind))
    .sort((a, b) => new Date(b.journal.createdAt || 0) - new Date(a.journal.createdAt || 0));

  // Re-read the open coin from live state so a review decision reflects immediately.
  const detail = openCoin ? portfolio.find((c) => c.id === openCoin) : null;

  const decide = (status) => { reviewThesis(openCoin, status); setOpenCoin(null); };

  return (
    <div className="ci-app screen-bg">
      <div className="apphead">
        <div>
          <div className="title" style={{ fontSize: 24 }}>Investment Journal <span className="beta">BETA</span></div>
          <div style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 2 }}>
            Every great investor writes before they act.
          </div>
        </div>
      </div>

      <div className="pad">
        {entries.length === 0 ? (
          <>
            <div className="empty-state">
              <div className="empty-ic">📓</div>
              <div className="empty-h">Your journal is empty</div>
              <div className="empty-p">
                The next time you add a coin, you'll be asked to write your thesis. Your decisions live here.
              </div>
              <button
                className="btn-primary"
                style={{ maxWidth: 240, margin: "0 auto" }}
                onClick={() => setScreen("search")}
              >
                Add your first coin →
              </button>
            </div>
            <div className="disclaimer">Your journal entries are private to your account.</div>
          </>
        ) : (
          <>
            {entries.map((c) => {
              const st = STATUS[c.journal.status] || STATUS.intact;
              return (
                <div key={c.id} className="j-entry" onClick={() => setOpenCoin(c.id)}>
                  <div className="j-top">
                    <CI thumb={c.thumb} symbol={c.symbol} size={36} />
                    <div>
                      <div className="j-coin">{c.name}</div>
                      <div className="j-date">Added {fmtDate(c.journal.createdAt)}</div>
                    </div>
                  </div>
                  <div className="j-excerpt">{c.journal.thesis || c.journal.changeMyMind}</div>
                  <div className={"j-status " + st.cls}>{st.dot} {st.label}</div>
                </div>
              );
            })}
            <div className="disclaimer">Your journal entries are private to your account.</div>
          </>
        )}
      </div>

      {detail && detail.journal && (
        <div className="ci-app overlay">
          <div className="overlay-head">
            <div className="back-btn" onClick={() => setOpenCoin(null)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            </div>
            <div className="overlay-head-title">{detail.name}</div>
          </div>
          <div className="overlay-body">
            <div className="bj-coin-head">
              <CI thumb={detail.thumb} symbol={detail.symbol} size={40} />
              <div>
                <div className="bj-coin-name">{detail.name}</div>
                <div className="bj-coin-price">
                  Thesis written {fmtDate(detail.journal.createdAt)}{detail.journal.priceAtAdd ? " · " + fmtP(detail.journal.priceAtAdd) : ""}
                </div>
              </div>
            </div>
            <div className="journal-q">
              <div className="q-label">Why you bought it</div>
              <div className="j-read">{detail.journal.thesis || "—"}</div>
            </div>
            <div className="journal-q">
              <div className="q-label">What would change your mind</div>
              <div className="j-read">{detail.journal.changeMyMind || "—"}</div>
            </div>
            <div className="journal-q"><div className="q-label">Is your thesis still intact?</div></div>
            <button className="btn-primary ov-btn-gap" onClick={() => decide("intact")}>Yes, still holding</button>
            <button className="btn-ghost ov-btn-gap" onClick={() => decide("review")}>Need to research</button>
            <button className="btn-ghost" onClick={() => decide("challenged")}>Reconsidering</button>
          </div>
        </div>
      )}
    </div>
  );
}
