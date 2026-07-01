import { useState } from "react";
import { useApp } from "../hooks/app-context.js";
import { fmtP, fmtPct } from "../utils/format.js";
import { cleanFunnel, thesisError } from "../utils/journal.js";
import { FUNNEL_FIELDS, FUNNEL_BRIDGE } from "../data/journal-funnel.js";
import { TOP_COINS } from "../utils/coins.js";
import { CI } from "./ui.jsx";
import { HeaderTags } from "./HeaderTags.jsx";

// Add-coin search screen. Live search results, the active portfolio, and the
// addCoin handler come from context. Restyled to the .ci-app design system.
//
// Adding a coin opens the Buy-Journal prompt first ("write before you buy"). On
// "Save" the typed thesis is persisted with the coin (addCoin's 2nd arg → the
// coin's journal); "Skip" adds the coin with no journal. Either way the add logic
// and tier limits are unchanged.
export function Search() {
  const { sq, setSq, searchResults, trending, portfolio, addCoin } = useApp();
  // DP-6: live trending coins for the empty state; fall back to the built-in top
  // coins so the section is never blank (offline-degrade, same as price fallbacks).
  const trendCoins = (trending && trending.length) ? trending : TOP_COINS.slice(0, 8);
  const [journalFor, setJournalFor] = useState(null);
  const [thesis, setThesis] = useState("");
  const [changeMind, setChangeMind] = useState("");
  const [funnel, setFunnel] = useState({});
  const [err, setErr] = useState("");
  const setF = (k, v) => setFunnel((p) => ({ ...p, [k]: v }));

  const closeOverlay = () => { setJournalFor(null); setThesis(""); setChangeMind(""); setFunnel({}); setErr(""); };

  const confirmAdd = (save) => {
    const coin = journalFor;
    // §J3: saving a thesis requires BOTH questions; "Skip for now" adds the coin with none.
    if (save) {
      const msg = thesisError(thesis, changeMind);
      if (msg) { setErr(msg); return; }   // keep the overlay open so the user can fix or Skip
    }
    const t = thesis.trim(), m = changeMind.trim();
    const f = cleanFunnel(funnel);
    closeOverlay();
    if (!coin) return;
    const journal = save
      ? { thesis: t, changeMyMind: m, status: "intact", priceAtAdd: coin.mockPrice || 0, createdAt: new Date().toISOString(), ...(f ? { funnel: f } : {}) }
      : null;
    addCoin(coin, journal);
  };

  return (
    <div className="ci-app screen-bg">
      <div className="apphead">
        <div>
          <div className="title">Search <span className="beta">BETA</span><HeaderTags /></div>
        </div>
      </div>

      <div className="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
        <input type="text" value={sq} onChange={(e) => setSq(e.target.value)} placeholder="Search any coin..." autoFocus />
      </div>

      {searchResults.length > 0 ? (
        searchResults.map((coin) => {
          const ad = portfolio.find((x) => x.id === coin.id);
          return (
            <div key={coin.id} className="trend-item" style={{ opacity: ad ? 0.5 : 1 }}>
              <CI thumb={coin.thumb} symbol={coin.symbol} size={36} />
              <div className="trend-info">
                <div className="trend-name">{coin.name}</div>
                <div className="trend-sub">{coin.symbol}{coin.rank ? " · #" + coin.rank : ""}</div>
              </div>
              {coin.mockPrice != null && <span className="trend-price">{fmtP(coin.mockPrice)}</span>}
              {coin.mockChange != null && <span className={"chg-pill " + (coin.mockChange >= 0 ? "up" : "dn")}>{fmtPct(coin.mockChange)}</span>}
              <button className="add-pill" onClick={() => !ad && setJournalFor(coin)} disabled={!!ad}>{ad ? "Added" : "+ Add"}</button>
            </div>
          );
        })
      ) : sq.length >= 1 ? (
        <div style={{ textAlign: "center", padding: 36, color: "var(--ink-faint)", fontSize: 13 }}>No results for "{sq}"</div>
      ) : (
        // DP-6: empty box → TRENDING. Tapping Add opens the same Buy-Journal flow,
        // so the tab clearly reads as "this is where you add coins".
        // R7-2: trending coins as cards (Pulse base chrome) in a reflowing grid, so
        // the empty-state matches Portfolio/Journal cards. Typed RESULTS above stay
        // the compact .trend-item list. Row content + Add flow unchanged.
        <>
          <div className="pad"><div className="sec-label"><h2>Trending</h2></div></div>
          <div className="pad">
            <div className="grid-auto trend-grid">
              {trendCoins.map((coin) => {
                const ad = portfolio.find((x) => x.id === coin.id);
                return (
                  <div key={coin.id} className="trend-card" style={{ opacity: ad ? 0.5 : 1 }}>
                    <CI thumb={coin.thumb} symbol={coin.symbol} size={36} />
                    <div className="trend-info">
                      <div className="trend-name">{coin.name}</div>
                      <div className="trend-sub">{coin.symbol}{coin.rank ? " · #" + coin.rank : ""}</div>
                    </div>
                    <button className="add-pill" onClick={() => !ad && setJournalFor(coin)} disabled={!!ad}>{ad ? "Added" : "+ Add"}</button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {journalFor && (
        <div className="ci-app overlay">
          <div className="overlay-head">
            <div className="back-btn" onClick={closeOverlay}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            </div>
            <div className="overlay-head-title">Before you add {journalFor.name}…</div>
          </div>
          <div className="overlay-body">
            <div className="bj-callout">
              <div className="bjc-label">Great investors write before they act</div>
              <div className="bjc-text">Your thesis lives with this coin. When the market drops, you'll know exactly why you bought — and whether that reason still holds.</div>
            </div>
            <div className="bj-coin-head">
              <CI thumb={journalFor.thumb} symbol={journalFor.symbol} size={40} />
              <div>
                <div className="bj-coin-name">{journalFor.name}</div>
                <div className="bj-coin-price">{journalFor.symbol}{journalFor.mockPrice != null ? " · " + fmtP(journalFor.mockPrice) : ""}</div>
              </div>
            </div>
            <div className="journal-q">
              <div className="q-label">Why are you buying this?</div>
              <div className="q-sub">What makes you believe in this project? What's the fundamental case?</div>
              <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} placeholder="e.g. active GitHub, founder talks publicly, real revenue, upcoming catalyst..." />
            </div>
            <div className="journal-q">
              <div className="q-label">What would change your mind?</div>
              <div className="q-sub">What signal would tell you your thesis is wrong?</div>
              <textarea value={changeMind} onChange={(e) => setChangeMind(e.target.value)} placeholder="e.g. GitHub goes quiet, founder departs, unlock event overwhelms demand..." />
            </div>
            <div className="journal-q" style={{ marginBottom: 10 }}>
              <div className="q-label">Manual research findings (optional)</div>
              <div className="q-sub">{FUNNEL_BRIDGE}</div>
            </div>
            {FUNNEL_FIELDS.map((field) => (
              <div className="journal-q" key={field.key}>
                <div className="q-label">{field.label}</div>
                <div className="q-sub">{field.sub}</div>
                <textarea value={funnel[field.key] || ""} onChange={(e) => setF(field.key, e.target.value)} placeholder={field.placeholder} />
              </div>
            ))}
            <div className="bj-note">This is for your own reflection — not financial advice. CryptoIdea never tells you what to buy or sell.</div>
            {err && <div className="j-err" role="alert">{err}</div>}
            <button className="btn-primary ov-btn-gap" onClick={() => confirmAdd(true)}>Save to Journal &amp; add coin</button>
            <button className="btn-ghost" onClick={() => confirmAdd(false)}>Skip for now</button>
          </div>
        </div>
      )}
    </div>
  );
}
