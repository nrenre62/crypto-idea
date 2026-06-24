import { useState } from "react";
import { useApp } from "../hooks/app-context.js";
import { fmtP } from "../utils/format.js";
import { FUNNEL_FIELDS, FUNNEL_BRIDGE } from "../data/journal-funnel.js";
import { CI } from "./ui.jsx";

/**
 * Journal tab — the "write before you buy" thesis log.
 *
 * Lists the active portfolio's coins that have a thesis or recorded findings
 * (coin.journal), newest first, each with a status pill. Tapping one opens the
 * detail overlay with the full thesis, the manual-research funnel findings
 * (dilution / volume / yield — #27, editable since these are checks you make over
 * time), and the "is your thesis still intact?" review decision (intact / review /
 * challenged). All data + handlers come from context; this component is
 * presentation-only. Scoped under .ci-app.
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

function excerptOf(j) {
  return j.thesis || j.changeMyMind || Object.values(j.funnel || {})[0] || "Research findings recorded";
}

// Detail overlay for one journal entry. Holds local funnel-input state seeded from
// the saved findings (mounts fresh per coin), so the user can record/update the
// manual checks; the review decision stays a separate, independent action.
function JournalDetail({ coin, onReview, onSaveFunnel, onClose }) {
  const j = coin.journal;
  const [funnel, setFunnel] = useState(() =>
    Object.fromEntries(FUNNEL_FIELDS.map(({ key }) => [key, (j.funnel && j.funnel[key]) || ""]))
  );
  const [saved, setSaved] = useState(false);
  const setF = (k, v) => { setFunnel((p) => ({ ...p, [k]: v })); setSaved(false); };
  // Only show the confirmation after the async save actually succeeds.
  const saveFindings = async () => { if (await onSaveFunnel(funnel)) setSaved(true); };

  return (
    <div className="ci-app overlay">
      <div className="overlay-head">
        <div className="back-btn" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </div>
        <div className="overlay-head-title">{coin.name}</div>
      </div>
      <div className="overlay-body">
        <div className="bj-coin-head">
          <CI thumb={coin.thumb} symbol={coin.symbol} size={40} />
          <div>
            <div className="bj-coin-name">{coin.name}</div>
            <div className="bj-coin-price">
              Thesis written {fmtDate(j.createdAt)}{j.priceAtAdd ? " · " + fmtP(j.priceAtAdd) : ""}
            </div>
          </div>
        </div>
        <div className="journal-q">
          <div className="q-label">Why you bought it</div>
          <div className="j-read">{j.thesis || "—"}</div>
        </div>
        <div className="journal-q">
          <div className="q-label">What would change your mind</div>
          <div className="j-read">{j.changeMyMind || "—"}</div>
        </div>

        <div className="journal-q" style={{ marginBottom: 10 }}>
          <div className="q-label">Manual research findings</div>
          <div className="q-sub">{FUNNEL_BRIDGE}</div>
        </div>
        {FUNNEL_FIELDS.map((field) => (
          <div className="journal-q" key={field.key}>
            <div className="q-label">{field.label}</div>
            <div className="q-sub">{field.sub}</div>
            <textarea value={funnel[field.key]} onChange={(e) => setF(field.key, e.target.value)} placeholder={field.placeholder} />
          </div>
        ))}
        <button className="btn-ghost ov-btn-gap" onClick={saveFindings}>{saved ? "Findings saved ✓" : "Save findings"}</button>

        <div className="journal-q"><div className="q-label">Is your thesis still intact?</div></div>
        <button className="btn-primary ov-btn-gap" onClick={() => onReview("intact")}>Yes, still holding</button>
        <button className="btn-ghost ov-btn-gap" onClick={() => onReview("review")}>Need to research</button>
        <button className="btn-ghost" onClick={() => onReview("challenged")}>Reconsidering</button>
      </div>
    </div>
  );
}

export function Journal() {
  const { portfolio, setScreen, reviewThesis, saveFunnel } = useApp();
  const [openCoin, setOpenCoin] = useState(null);

  const entries = portfolio
    .filter((c) => c.journal && (c.journal.thesis || c.journal.changeMyMind || c.journal.funnel))
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
                  <div className="j-excerpt">{excerptOf(c.journal)}</div>
                  <div className={"j-status " + st.cls}>{st.dot} {st.label}</div>
                </div>
              );
            })}
            <div className="disclaimer">Your journal entries are private to your account.</div>
          </>
        )}
      </div>

      {detail && detail.journal && (
        <JournalDetail
          key={detail.id}
          coin={detail}
          onReview={decide}
          onSaveFunnel={(funnel) => saveFunnel(openCoin, funnel)}
          onClose={() => setOpenCoin(null)}
        />
      )}
    </div>
  );
}
