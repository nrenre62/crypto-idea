import { useState } from "react";
import { useApp } from "../hooks/app-context.js";
import { fmtP } from "../utils/format.js";
import { CI } from "./ui.jsx";

// Add-coin search screen. Live search results, the active portfolio, and the
// addCoin handler come from context. Restyled to the .ci-app design system.
//
// Adding a coin now opens the Buy-Journal prompt first ("write before you buy").
// The thesis text is DESIGN-ONLY for now (not persisted) — Save and Skip both
// proceed to the existing addCoin, so the add logic and limits are unchanged.
export function Search() {
  const { sq, setSq, searchResults, portfolio, addCoin } = useApp();
  const [journalFor, setJournalFor] = useState(null);

  const confirmAdd = () => {
    const coin = journalFor;
    setJournalFor(null);
    if (coin) addCoin(coin);
  };

  return (
    <div className="ci-app screen-bg">
      <div className="apphead">
        <div>
          <div className="title" style={{ fontSize: 24 }}>Add Coin <span className="beta">BETA</span></div>
          <div style={{ fontSize: 13, color: "var(--ink-faint)", marginTop: 2 }}>Find any coin. Research before you add.</div>
        </div>
      </div>

      <div className="search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
        <input type="text" value={sq} onChange={(e) => setSq(e.target.value)} placeholder="Search coins... (Bitcoin, ETH, SOL...)" autoFocus />
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
              {coin.mockPrice != null && <span style={{ fontSize: 12, fontWeight: 600, marginRight: 6 }}>{fmtP(coin.mockPrice)}</span>}
              <button className="add-pill" onClick={() => !ad && setJournalFor(coin)} disabled={!!ad}>{ad ? "Added" : "+ Add"}</button>
            </div>
          );
        })
      ) : sq.length >= 1 ? (
        <div style={{ textAlign: "center", padding: 36, color: "var(--ink-faint)", fontSize: 13 }}>No results for "{sq}"</div>
      ) : (
        <div className="empty-state">
          <div className="empty-ic">🔍</div>
          <div className="empty-h">Search any coin</div>
          <div className="empty-p">Type to find any coin, live.</div>
        </div>
      )}

      {journalFor && (
        <div className="ci-app overlay">
          <div className="overlay-head">
            <div className="back-btn" onClick={() => setJournalFor(null)}>
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
              <textarea placeholder="e.g. active GitHub, founder talks publicly, real revenue, upcoming catalyst..." />
            </div>
            <div className="journal-q">
              <div className="q-label">What would change your mind?</div>
              <div className="q-sub">What signal would tell you your thesis is wrong?</div>
              <textarea placeholder="e.g. GitHub goes quiet, founder departs, unlock event overwhelms demand..." />
            </div>
            <div className="bj-note">This is for your own reflection — not financial advice. CryptoIdea never tells you what to buy or sell.</div>
            <button className="btn-primary ov-btn-gap" onClick={confirmAdd}>Save to Journal &amp; add coin</button>
            <button className="btn-ghost" onClick={confirmAdd}>Skip for now</button>
          </div>
        </div>
      )}
    </div>
  );
}
