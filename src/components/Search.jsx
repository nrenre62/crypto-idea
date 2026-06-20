import { useApp } from "../hooks/app-context.js";
import { fmtP } from "../utils/format.js";
import { CI } from "./ui.jsx";

// Add-coin search screen. Live search results, the active portfolio, and the
// addCoin handler come from context. Restyled to the .ci-app design system;
// the search/add logic is unchanged.
export function Search() {
  const { sq, setSq, searchResults, portfolio, addCoin } = useApp();
  return (
    <div className="ci-app screen-bg">
      <div className="apphead">
        <div>
          <div className="title" style={{ fontSize: 24 }}>Add Coin</div>
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
              <button className="add-pill" onClick={() => !ad && addCoin(coin)} disabled={!!ad}>{ad ? "Added" : "+ Add"}</button>
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
    </div>
  );
}
