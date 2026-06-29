import { useApp } from "../hooks/app-context.js";
import { fmtP, fmtPct } from "../utils/format.js";
import { portfolio24hPct } from "../utils/pnl.js";
import { CI } from "./ui.jsx";
import { PortfolioBar } from "./PortfolioBar.jsx";

// Main logged-in screen: the value summary card, portfolio switcher, and the asset
// CARD GRID (3-up @1040 / 2-up @720 / 1-up phone). A whole card taps through to
// CoinInfo; Edit/Delete live on the Detail screen (reached from there). Totals, tier
// flags, the active portfolio and live prices come from context; data/handlers unchanged.
export function Portfolio() {
  const {
    api, tv, totalBuys, tpnl, tpp, portfolio, maxCoinsPerPort, usagePct,
    prices, isPro, isPremium, setScreen, startUpgrade, setInfoCoin, startAddTx,
  } = useApp();
  const plan = isPremium ? "PREMIUM" : isPro ? "PRO" : "STARTER";
  const cents = (tv % 1).toFixed(2).slice(2);
  const sorted = [...portfolio]
    .map((coin) => ({ coin, val: Math.max(0, coin.entries.reduce((s, e) => (e.type === "sell" ? s - e.amount : s + e.amount), 0)) * (prices[coin.id]?.usd || 0) }))
    .sort((a, b) => b.val - a.val)
    .map((x) => x.coin);
  const p24 = portfolio24hPct(portfolio, prices);

  return (
    <div className="ci-app screen-bg">
      <div className="apphead">
        <div>
          <div className="title">
            Crypto Idea <span className="beta">BETA</span>
            {api === "live" && <span className="badge badge-live">● LIVE</span>}
            <span className="badge badge-plan" onClick={() => setScreen("account")} style={{ cursor: "pointer" }}>{plan}</span>
          </div>
        </div>
      </div>

      <PortfolioBar />

      <div className="value-card">
        <div className="vc-main">
          <div className="vc-eyebrow">Portfolio value</div>
          <div className="port-total">${Math.floor(tv).toLocaleString()}<span className="cents">.{cents}</span></div>
          <div className={"vc-gain" + (tpnl >= 0 ? "" : " dn")}>
            {tpnl >= 0 ? "▲" : "▼"} {tpnl >= 0 ? "+" : "−"}${Math.abs(tpnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({fmtPct(tpp)})
          </div>
        </div>
        <div className="vc-stats">
          <div className="vc-stat">
            <div className="vc-slabel">Invested</div>
            <div className="vc-sval">${totalBuys.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="vc-stat">
            <div className="vc-slabel">24h</div>
            <div className={"vc-sval " + (p24 >= 0 ? "up" : "dn")}>{fmtPct(p24)}</div>
          </div>
          <div className="vc-stat">
            <div className="vc-slabel">Assets</div>
            <div className="vc-sval">{portfolio.length}</div>
          </div>
        </div>
      </div>

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
        <div className="grid-auto assets-grid">
          {sorted.map((coin) => {
            const p = prices[coin.id];
            const pr = p?.usd;
            const ch = p?.usd_24h_change;
            const h = Math.max(0, coin.entries.reduce((s, e) => (e.type === "sell" ? s - e.amount : s + e.amount), 0));
            const v = h * (pr || 0);
            return (
              <div key={coin.id} className="asset-card" onClick={() => startAddTx(coin, "buy", "portfolio")}>
                <div className="ac-top">
                  <span className="ac-img" onClick={(e) => { e.stopPropagation(); setInfoCoin(coin); setScreen("coinInfo"); }} title={`View ${coin.name} info`}>
                    <CI thumb={coin.thumb} symbol={coin.symbol} />
                  </span>
                  <div className="ac-id">
                    <div className="ac-name">{coin.name}</div>
                    <div className="ac-amt">{h > 0 ? h.toLocaleString("en-US", { maximumFractionDigits: 6 }) : "0"} {coin.symbol}</div>
                  </div>
                </div>
                {v > 0
                  ? <div className="ac-val">${Math.floor(v).toLocaleString()}<span className="cents">.{(v % 1).toFixed(2).slice(2)}</span></div>
                  : <div className="ac-val muted">$0.00</div>}
                <div className="ac-bot">
                  <span className="ac-price">{fmtP(pr)}</span>
                  <span className={"chg-pill " + (ch >= 0 ? "up" : "dn")}>{fmtPct(ch)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="disclaimer">Prices via CoinGecko · Updated live · Not financial advice</div>
    </div>
  );
}
