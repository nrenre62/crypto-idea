import { useApp } from "../hooks/app-context.js";
import { fmtP, fmtPct } from "../utils/format.js";
import { CI } from "./ui.jsx";
import { PortfolioBar } from "./PortfolioBar.jsx";

// Main logged-in screen: total value + return header, portfolio switcher, and the
// swipeable asset list. Totals, tier flags, the active portfolio, live prices, and
// swipe-gesture state/handlers all come from context. Restyled to the .ci-app
// design system; all data/handlers are unchanged.
export function Portfolio() {
  const {
    api, tv, totalBuys, tpnl, tpp, portfolio, maxCoinsPerPort, usagePct,
    prices, isPro, isPremium, setScreen, startUpgrade, setSel, setInfoCoin,
    remCoin, resetSwipe, onTouchS, onTouchM, onTouchE, touchStart, swipeId, swipeX, user,
  } = useApp();
  const plan = isPremium ? "PREMIUM" : isPro ? "PRO" : "STARTER";
  const cents = (tv % 1).toFixed(2).slice(2);
  const sorted = [...portfolio]
    .map((coin) => ({ coin, val: Math.max(0, coin.entries.reduce((s, e) => (e.type === "sell" ? s - e.amount : s + e.amount), 0)) * (prices[coin.id]?.usd || 0) }))
    .sort((a, b) => b.val - a.val)
    .map((x) => x.coin);
  const initial = (user?.name || user?.email || "C").trim().charAt(0).toUpperCase();

  return (
    <div className="ci-app screen-bg">
      <div className="apphead">
        <div>
          <div className="title">
            Crypto Idea
            {api === "live" && <span className="badge badge-live">● LIVE</span>}
            <span className="badge badge-plan" onClick={() => setScreen("account")} style={{ cursor: "pointer" }}>{plan}</span>
          </div>
        </div>
        <div className="avatar" onClick={() => setScreen("account")} style={{ cursor: "pointer" }}>{initial}</div>
      </div>

      <div className="port-total-label">Portfolio</div>
      <div className="port-total">${Math.floor(tv).toLocaleString()}<span className="cents">.{cents}</span></div>
      <div className="port-meta">
        <div>
          <div className="m-label">Invested</div>
          <div className="m-val">${totalBuys.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div>
          <div className="m-label">Return</div>
          <div className="m-val">
            <span className={"port-return" + (tpnl >= 0 ? "" : " dn")}>
              {tpnl >= 0 ? "+" : "−"}${Math.abs(tpnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({fmtPct(tpp)})
            </span>
          </div>
        </div>
      </div>
      <div className="live-pill"><span className="live-dot" />{api === "live" ? "Prices updating live" : "Showing last known prices"}</div>

      <PortfolioBar />

      <div className="assets-head">
        <h3>My Assets <span>({portfolio.length}/{maxCoinsPerPort})</span></h3>
        <button className="add-btn" onClick={() => setScreen("search")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
          Add
        </button>
      </div>

      {!isPro && usagePct >= 95 && usagePct < 100 && (
        <div className="limit-banner warn">You're close to your account limit. <a onClick={() => startUpgrade("pro")}>Upgrade to Pro</a></div>
      )}
      {!isPro && usagePct >= 100 && (
        <div className="limit-banner over">You've reached your account limit. <a onClick={() => startUpgrade("pro")}>Upgrade to Pro</a></div>
      )}
      {isPro && !isPremium && usagePct >= 95 && (
        <div className="limit-banner warn">You're at the limit of your Pro account. Need more? <a onClick={() => setScreen("contact")}>Contact us</a> for a custom Premium plan.</div>
      )}

      {portfolio.length === 0 ? (
        <div className="empty-state">
          <div className="empty-ic">📊</div>
          <div className="empty-h">No coins yet</div>
          <div className="empty-p">Tap <strong style={{ color: "var(--accent)" }}>+ Add</strong> to search and add your first crypto.</div>
        </div>
      ) : (
        sorted.map((coin) => {
          const p = prices[coin.id];
          const pr = p?.usd;
          const ch = p?.usd_24h_change;
          const h = Math.max(0, coin.entries.reduce((s, e) => (e.type === "sell" ? s - e.amount : s + e.amount), 0));
          const v = h * (pr || 0);
          return (
            <div key={coin.id} className="coin-swipe">
              {/* Edit action (right swipe) */}
              <div onClick={() => { setSel(coin); setScreen("detail"); resetSwipe(); }} style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: "#007AFF", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2, cursor: "pointer" }}>
                <span style={{ fontSize: 18 }}>✏️</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>Edit</span>
              </div>
              {/* Delete action (left swipe) */}
              <div onClick={() => { remCoin(coin.id); resetSwipe(); }} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: "var(--warn)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2, cursor: "pointer" }}>
                <span style={{ fontSize: 18 }}>🗑️</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>Delete</span>
              </div>
              {/* Sliding coin row */}
              <div
                className="coin-row"
                onTouchStart={(e) => onTouchS(coin.id, e)} onTouchMove={onTouchM} onTouchEnd={onTouchE}
                onMouseDown={(e) => onTouchS(coin.id, e)} onMouseMove={(e) => { if (touchStart) onTouchM(e); }} onMouseUp={onTouchE} onMouseLeave={onTouchE}
                style={{ transform: `translateX(${swipeId === coin.id ? swipeX : 0}px)`, transition: touchStart ? "none" : "transform 0.3s ease" }}
              >
                <div onClick={() => { if (swipeId) { resetSwipe(); return; } setInfoCoin(coin); setScreen("coinInfo"); }} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, cursor: "pointer" }}>
                  <CI thumb={coin.thumb} symbol={coin.symbol} />
                  <div className="coin-info">
                    <div className="coin-name">{coin.name}</div>
                    <div className="coin-amt">{coin.symbol} · {h > 0 ? h.toLocaleString("en-US", { maximumFractionDigits: 6 }) : "0"} held</div>
                  </div>
                </div>
                <div className="coin-vals" onClick={() => { if (swipeId) { resetSwipe(); return; } setSel(coin); setScreen("detail"); }} style={{ cursor: "pointer", padding: "4px 0 4px 12px" }}>
                  {v > 0 ? <div className="coin-val">${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div> : <div className="coin-val" style={{ color: "var(--ink-faint)" }}>$0.00</div>}
                  <div className="coin-price">{fmtP(pr)}</div>
                  <div className={"coin-chg " + (ch >= 0 ? "up" : "dn")}>{fmtPct(ch)}</div>
                </div>
              </div>
            </div>
          );
        })
      )}
      <div className="disclaimer">Prices via CoinGecko · Updated live · Not financial advice</div>
    </div>
  );
}
