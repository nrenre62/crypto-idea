import { useState } from "react";
import { useApp } from "../hooks/app-context.js";
import { fmtP } from "../utils/format.js";
import { FUNNEL_FIELDS, FUNNEL_BRIDGE } from "../data/journal-funnel.js";
import { thesisError, isThesisIncomplete, THESIS_MAX } from "../utils/journal.js";
import { CI, CharCount } from "./ui.jsx";
import { CoinIcon } from "./CoinIcon.jsx";
import { HeaderTags } from "./HeaderTags.jsx";
import { Modal } from "./Modal.jsx";   // Round 15: shared centered-card popup (provides the X-close)

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
  intact:     { cls: "j-intact",     label: "Intact",     dot: "🟢" },
  review:     { cls: "j-review",     label: "Review",     dot: "🟡" },
  challenged: { cls: "j-challenged", label: "Challenged", dot: "🔴" },
};

// One honest line: the journal is private to the user, AND the thesis feeds the AI.
const JOURNAL_NOTE = "Only you can see your journal. Your thesis helps the AI give you better Research & Ask answers.";

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function excerptOf(j) {
  return j.thesis || j.changeMyMind || Object.values(j.funnel || {})[0] || "Research findings recorded";
}

// R8-3 — read-only "Breakdown" popup: the FULL thesis in white cards, comfortable to
// read however long (pre-wrap + overflow-wrap via .j-read). X-closes; no edit, no data
// change — a pure read of coin.journal. Reached from the Read button in JournalDetail.
function ThesisBreakdown({ coin, onClose }) {
  const j = coin.journal;
  const findings = FUNNEL_FIELDS
    .map(({ key, label }) => ({ label, value: ((j.funnel && j.funnel[key]) || "").trim() }))
    .filter((x) => x.value);
  return (
    <Modal title="Thesis breakdown" onClose={onClose} size="md">
        <div className="bj-coin-head">
          <CI thumb={coin.thumb} symbol={coin.symbol} size={40} />
          <div>
            <div className="bj-coin-name">{coin.name}</div>
            <div className="bj-coin-price">
              Thesis written {fmtDate(j.createdAt)}{j.priceAtAdd ? " · " + fmtP(j.priceAtAdd) : ""}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="journal-q"><div className="q-label">Why you bought it</div><div className="j-read">{j.thesis || "—"}</div></div>
        </div>
        <div className="card">
          <div className="journal-q"><div className="q-label">What would change your mind</div><div className="j-read">{j.changeMyMind || "—"}</div></div>
        </div>
        <div className="card">
          <div className="journal-q">
            <div className="q-label">Manual research findings</div>
            {findings.length ? findings.map((x, i) => (
              <div className="j-finding" key={i}>
                <div className="j-finding-label">{x.label}</div>
                <div className="j-read">{x.value}</div>
              </div>
            )) : <div className="j-read">—</div>}
          </div>
        </div>
    </Modal>
  );
}

// Detail overlay for one journal entry. Holds local funnel-input state seeded from
// the saved findings (mounts fresh per coin), so the user can record/update the
// manual checks; the review decision stays a separate, independent action.
function JournalDetail({ coin, onReview, onSaveFunnel, onSaveThesis, onDelete, onClose }) {
  const j = coin.journal;
  const [funnel, setFunnel] = useState(() =>
    Object.fromEntries(FUNNEL_FIELDS.map(({ key }) => [key, (j.funnel && j.funnel[key]) || ""]))
  );
  const [saved, setSaved] = useState(false);
  const setF = (k, v) => { setFunnel((p) => ({ ...p, [k]: v })); setSaved(false); };
  // Only show the confirmation after the async save actually succeeds.
  const saveFindings = async () => { if (await onSaveFunnel(funnel)) setSaved(true); };

  // §J1 — edit the two thesis questions inline (preserves status/date/price).
  const [editing, setEditing] = useState(false);
  const [thesis, setThesis] = useState(j.thesis || "");
  const [changeMind, setChangeMind] = useState(j.changeMyMind || "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const saveThesis = async () => {
    const msg = thesisError(thesis, changeMind);   // §J3: both questions required
    if (msg) { setErr(msg); return; }
    setErr(""); setBusy(true);
    const ok = await onSaveThesis({ thesis, changeMyMind: changeMind, funnel });
    setBusy(false);
    if (ok) setEditing(false);
  };
  const cancelEdit = () => { setThesis(j.thesis || ""); setChangeMind(j.changeMyMind || ""); setErr(""); setEditing(false); };

  // §J2 — delete the thesis (two-step confirm). The coin/holding stays.
  const [confirmDel, setConfirmDel] = useState(false);
  const del = async () => { if (await onDelete()) onClose(); };

  // R8-3 — open the read-only Breakdown popup.
  const [reading, setReading] = useState(false);

  // R24-3: the X is a safety net — pending work persists before closing. A changed
  // in-progress thesis edit goes through editThesis (both-required there → a partial
  // is a safe no-op that can't blank a good thesis); changed findings go through
  // saveFunnel. Untouched state writes nothing. Fire-and-close (optimistic handlers
  // toast on failure; the toast floats above popups since R21).
  const funnelChanged = FUNNEL_FIELDS.some(
    ({ key }) => (funnel[key] || "") !== ((j.funnel && j.funnel[key]) || "")
  );
  const closeDetail = () => {
    if (editing && (thesis !== (j.thesis || "") || changeMind !== (j.changeMyMind || ""))) {
      onSaveThesis({ thesis, changeMyMind: changeMind, funnel });
    }
    if (funnelChanged) onSaveFunnel(funnel);
    onClose();
  };

  if (reading) return <ThesisBreakdown coin={coin} onClose={() => setReading(false)} />;

  return (
    // R15-2: shared centered-card Modal (editable text inside → no scrim-tap-close).
    // R24-3: the X routes through closeDetail so in-progress work is never lost.
    <Modal title={coin.name} onClose={closeDetail} size="md" dismissOnScrim={false}>
        <div className="bj-coin-head">
          <CI thumb={coin.thumb} symbol={coin.symbol} size={40} />
          <div>
            <div className="bj-coin-name">{coin.name}</div>
            <div className="bj-coin-price">
              Thesis written {fmtDate(j.createdAt)}{j.priceAtAdd ? " · " + fmtP(j.priceAtAdd) : ""}
            </div>
          </div>
          {/* R24-2: the derived Incomplete nudge, also visible in the detail header */}
          {isThesisIncomplete(j) && <span className="j-status j-review">🟡 Incomplete</span>}
        </div>

        {editing ? (
          <>
            <div className="journal-q">
              <div className="q-label">Why you bought it</div>
              <textarea value={thesis} maxLength={THESIS_MAX} onChange={(e) => setThesis(e.target.value)} placeholder="e.g. active GitHub, founder talks publicly, real revenue, upcoming catalyst..." />
              <CharCount value={thesis} />
            </div>
            <div className="journal-q">
              <div className="q-label">What would change your mind</div>
              <textarea value={changeMind} maxLength={THESIS_MAX} onChange={(e) => setChangeMind(e.target.value)} placeholder="e.g. GitHub goes quiet, founder departs, unlock event overwhelms demand..." />
              <CharCount value={changeMind} />
            </div>
            {err && <div className="j-err" role="alert">{err}</div>}
            <button className="btn-primary ov-btn-gap" disabled={busy} onClick={saveThesis}>{busy ? "Saving…" : "Save changes"}</button>
            <button className="btn-ghost" onClick={cancelEdit}>Cancel</button>
          </>
        ) : (
          // R8-2: read view in a white card (matches the portfolio cards), with an
          // always-on Read pill (→ Breakdown) next to the accent Edit pill.
          <div className="card">
            <div className="journal-q">
              <div className="j-q-head">
                <div className="q-label">Why you bought it</div>
                <div className="j-q-actions">
                  <button className="j-read-btn" onClick={() => setReading(true)}>Read</button>
                  <button className="j-edit-btn" onClick={() => setEditing(true)}>Edit</button>
                </div>
              </div>
              <div className="j-read">{j.thesis || "—"}</div>
            </div>
            <div className="journal-q">
              <div className="q-label">What would change your mind</div>
              <div className="j-read">{j.changeMyMind || "—"}</div>
            </div>
          </div>
        )}

        <div className="journal-q" style={{ marginBottom: 10 }}>
          <div className="q-label">Manual research findings</div>
          <div className="q-sub">{FUNNEL_BRIDGE}</div>
        </div>
        {FUNNEL_FIELDS.map((field) => (
          <div className="journal-q" key={field.key}>
            <div className="q-label">{field.label}</div>
            <div className="q-sub">{field.sub}</div>
            <textarea value={funnel[field.key]} maxLength={THESIS_MAX} onChange={(e) => setF(field.key, e.target.value)} placeholder={field.placeholder} />
            <CharCount value={funnel[field.key] || ""} />
          </div>
        ))}
        <button className="btn-ghost ov-btn-gap" onClick={saveFindings}>{saved ? "Findings saved ✓" : "Save findings"}</button>

        <div className="journal-q"><div className="q-label">Is your thesis still intact?</div></div>
        <button className="btn-primary ov-btn-gap" onClick={() => onReview("intact")}>Yes, still holding</button>
        <button className="btn-ghost ov-btn-gap" onClick={() => onReview("review")}>Need to research</button>
        <button className="btn-ghost ov-btn-gap" onClick={() => onReview("challenged")}>Reconsidering</button>

        <div className="j-delete-wrap">
          {confirmDel ? (
            <>
              <div className="j-del-confirm">Delete this thesis? Your coin stays in the portfolio — only the thesis is removed.</div>
              <button className="priv-btn danger-solid" onClick={del}>Yes, delete thesis</button>
              <button className="btn-ghost" onClick={() => setConfirmDel(false)}>Keep it</button>
            </>
          ) : (
            <button className="j-delete-btn" onClick={() => setConfirmDel(true)}>Delete thesis</button>
          )}
        </div>
    </Modal>
  );
}

// Add-thesis overlay for a coin added without one (Journal "Needs a thesis"). Editable
// thesis + change-my-mind + the manual-research funnel; on save it writes the full
// journal via the addThesis handler (→ updateCoinJournal). Mirrors the Buy-Journal prompt.
function AddThesis({ coin, onSave, onClose }) {
  const [thesis, setThesis] = useState("");
  const [changeMind, setChangeMind] = useState("");
  const [funnel, setFunnel] = useState({});
  const setF = (k, v) => setFunnel((p) => ({ ...p, [k]: v }));
  // R24-1: BOTH the X and "Save thesis" persist whatever's written — never discard
  // typed work. Partial content is allowed (flagged Incomplete in the list, R24-2);
  // the old both-required gate is dropped for this popup. Fire-and-close: addThesis
  // is optimistic and toasts on failure (the toast floats above popups since R21).
  const hasContent =
    thesis.trim() || changeMind.trim() || Object.values(funnel).some((v) => (v || "").trim());
  const closeWithSave = () => {
    if (hasContent) onSave({ thesis, changeMyMind: changeMind, funnel });
    onClose();
  };
  return (
    // R15-2: shared centered-card Modal (text-entry form → no scrim-tap-close).
    // R24-1: the X saves too (closeWithSave) — closing never loses what you typed.
    <Modal title="Add your thesis" onClose={closeWithSave} size="md" dismissOnScrim={false}>
        <div className="bj-callout">
          <div className="bjc-label">Write it down while the conviction is fresh</div>
          <div className="bjc-text">Your thesis lives with this coin and powers your Research &amp; Ask. When the market drops, you'll know exactly why you bought — and whether that reason still holds.</div>
        </div>
        <div className="bj-coin-head">
          <CI thumb={coin.thumb} symbol={coin.symbol} size={40} />
          <div>
            <div className="bj-coin-name">{coin.name}</div>
            <div className="bj-coin-price">{coin.symbol}</div>
          </div>
        </div>
        <div className="journal-q">
          <div className="q-label">Why are you buying this?</div>
          <div className="q-sub">What makes you believe in this project? What's the fundamental case?</div>
          <textarea value={thesis} maxLength={THESIS_MAX} onChange={(e) => setThesis(e.target.value)} placeholder="e.g. active GitHub, founder talks publicly, real revenue, upcoming catalyst..." />
          <CharCount value={thesis} />
        </div>
        <div className="journal-q">
          <div className="q-label">What would change your mind?</div>
          <div className="q-sub">What signal would tell you your thesis is wrong?</div>
          <textarea value={changeMind} maxLength={THESIS_MAX} onChange={(e) => setChangeMind(e.target.value)} placeholder="e.g. GitHub goes quiet, founder departs, unlock event overwhelms demand..." />
          <CharCount value={changeMind} />
        </div>
        <div className="journal-q" style={{ marginBottom: 10 }}>
          <div className="q-label">Manual research findings (optional)</div>
          <div className="q-sub">{FUNNEL_BRIDGE}</div>
        </div>
        {FUNNEL_FIELDS.map((field) => (
          <div className="journal-q" key={field.key}>
            <div className="q-label">{field.label}</div>
            <div className="q-sub">{field.sub}</div>
            <textarea value={funnel[field.key] || ""} maxLength={THESIS_MAX} onChange={(e) => setF(field.key, e.target.value)} placeholder={field.placeholder} />
            <CharCount value={funnel[field.key] || ""} />
          </div>
        ))}
        <button className="btn-primary ov-btn-gap" onClick={closeWithSave}>Save thesis</button>
    </Modal>
  );
}

export function Journal() {
  const { portfolio, setScreen, reviewThesis, saveFunnel, addThesis, editThesis, deleteThesis } = useApp();
  const [openCoin, setOpenCoin] = useState(null);
  const [addCoinId, setAddCoinId] = useState(null);

  const hasJournal = (c) => c.journal && (c.journal.thesis || c.journal.changeMyMind || c.journal.funnel);
  const entries = portfolio
    .filter(hasJournal)
    .sort((a, b) => new Date(b.journal.createdAt || 0) - new Date(a.journal.createdAt || 0));
  // Coins added without a thesis — surfaced so the user can write one any time.
  const needs = portfolio.filter((c) => !hasJournal(c));

  // Re-read the open coin from live state so a review decision reflects immediately.
  const detail = openCoin ? portfolio.find((c) => c.id === openCoin) : null;
  const addTarget = addCoinId ? portfolio.find((c) => c.id === addCoinId) : null;

  const decide = (status) => { reviewThesis(openCoin, status); setOpenCoin(null); };

  return (
    <div className="ci-app screen-bg">
      <div className="apphead">
        <div>
          <div className="title">Journal <span className="beta">BETA</span><HeaderTags /></div>
        </div>
      </div>

      <div className="pad">
        {portfolio.length === 0 ? (
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
            <div className="disclaimer">{JOURNAL_NOTE}</div>
          </>
        ) : (
          <>
            {needs.length > 0 && (
              <div className="nt-sec">
                <div className="sec-label"><h2>Needs a thesis ({needs.length})</h2></div>
                {needs.map((c) => (
                  <div key={c.id} className="nt-row">
                    {/* R25: icon opens Coin info (overlay) */}
                    <CoinIcon coin={c} size={36} />
                    <div className="nt-id">
                      <div className="nt-name">{c.name}</div>
                      <div className="nt-sym">{c.symbol}</div>
                    </div>
                    <button className="nt-btn" onClick={() => setAddCoinId(c.id)}>Add thesis</button>
                  </div>
                ))}
              </div>
            )}

            {entries.length > 0 ? (
              <>
                {needs.length > 0 && <div className="sec-label"><h2>Your theses ({entries.length})</h2></div>}
                <div className="grid-auto j-grid">
                {entries.map((c) => {
                  // R24-2: a partial thesis shows the derived yellow "Incomplete" pill
                  // (reuses the Review styling) instead of the stored status — a visible
                  // nudge to finish; it auto-clears once both answers are filled.
                  const st = isThesisIncomplete(c.journal)
                    ? { cls: "j-review", label: "Incomplete", dot: "🟡" }
                    : STATUS[c.journal.status] || STATUS.intact;
                  return (
                    <div key={c.id} className="j-entry" onClick={() => setOpenCoin(c.id)}>
                      <div className="j-top">
                        {/* R25: icon opens Coin info; stopPropagation keeps the card→detail tap */}
                        <CoinIcon coin={c} size={36} />
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
                </div>
              </>
            ) : (
              <div className="empty-p" style={{ textAlign: "center", padding: "20px 24px" }}>
                No thesis yet — tap “Add thesis” above to start your journal.
              </div>
            )}
            <div className="disclaimer">{JOURNAL_NOTE}</div>
          </>
        )}
      </div>

      {detail && detail.journal && (
        <JournalDetail
          key={detail.id}
          coin={detail}
          onReview={decide}
          onSaveFunnel={(funnel) => saveFunnel(openCoin, funnel)}
          onSaveThesis={(input) => editThesis(openCoin, input)}
          onDelete={() => deleteThesis(openCoin)}
          onClose={() => setOpenCoin(null)}
        />
      )}
      {addTarget && (
        <AddThesis
          key={addTarget.id}
          coin={addTarget}
          onSave={(input) => addThesis(addCoinId, input)}
          onClose={() => setAddCoinId(null)}
        />
      )}
    </div>
  );
}
