import { useApp } from "../hooks/app-context.js";
import { fmtP, fmtPct } from "../utils/format.js";
import { splitMoney } from "../utils/money.js";
import { portfolio24hPct } from "../utils/pnl.js";
import { CoinIcon } from "./CoinIcon.jsx";
import { PortfolioBar } from "./PortfolioBar.jsx";
import { LivePill, usePricesPaused } from "./HeaderTags.jsx";
import { Logo } from "./ui.jsx";

// Main logged-in screen: the value summary card, portfolio switcher, and the asset
// CARD GRID (3-up @1040 / 2-up @720 / 1-up phone). A whole card taps through to
// CoinInfo; Edit/Delete live on the Detail screen (reached from there). Totals, tier
// flags, the active portfolio and live prices come from context; data/handlers unchanged.
export function Portfolio() {
  const {
    api, tv, totalBuys, tpnl, tpp, txLoaded, portfolio, maxCoinsPerPort, usagePct,
    prices, isPro, isPremium, setScreen, startUpgrade, setSel,
    lockedCoins, openLockInfo,
  } = useApp();
  // Part B: when the active portfolio's transactions haven't loaded yet (just switched to a
  // lazy-loaded portfolio), show a placeholder for the tx-dependent figures instead of a
  // misleading $0 P&L. Only an explicit false — undefined reads as loaded (no regression).
  const txPending = txLoaded === false;
  const plan = isPremium ? "PREMIUM" : isPro ? "PRO" : "STARTER";
  const pricesPaused = usePricesPaused();
  const m = splitMoney(tv);
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
            <Logo /> <span className="beta">BETA</span>
            <LivePill api={api} paused={pricesPaused} />
            <span className="badge badge-plan" onClick={() => setScreen("account")} style={{ cursor: "pointer" }}>{plan}</span>
          </div>
        </div>
      </div>

      <PortfolioBar />

      <div className="value-card">
        <div className="vc-main">
          <div className="vc-eyebrow">Portfolio value</div>
          {txPending
            ? <div className="port-total muted" style={{ opacity: 0.5 }}>Loading…</div>
            : <div className="port-total">${m.dollars.toLocaleString()}<span className="cents">.{m.cents}</span></div>}
          {/* A6: an empty book (nothing invested) has no gain to show — a neutral "—",
              not a fake "+$0.00" that reads like a real break-even result. Keyed off
              totalBuys===0, so a REAL break-even (money in, P/L exactly 0) still shows +$0.00.
              Part B: while the switched-to portfolio's tx load, "—" (never a wrong/zero P&L). */}
          {txPending || totalBuys === 0
            ? <div className="vc-gain muted">—</div>
            : <div className={"vc-gain" + (tpnl >= 0 ? "" : " dn")}>
                {tpnl >= 0 ? "▲" : "▼"} {tpnl >= 0 ? "+" : "−"}${Math.abs(tpnl).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({fmtPct(tpp)})
              </div>}
        </div>
        <div className="vc-stats">
          <div className="vc-stat">
            <div className="vc-slabel">Invested</div>
            <div className="vc-sval">{txPending ? "—" : "$" + totalBuys.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="vc-stat">
            <div className="vc-slabel">24h</div>
            <div className={"vc-sval " + (txPending ? "" : (p24 >= 0 ? "up" : "dn"))}>{txPending ? "—" : fmtPct(p24)}</div>
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
            const m = splitMoney(v);
            // DI-4: an over-limit coin is KEPT but locked — dimmed, tagged, and tapping it
            // opens the explainer (upgrade / remove others) instead of the detail screen.
            const locked = lockedCoins && lockedCoins.has(coin.id);
            return (
              <div key={coin.id} className={"asset-card" + (locked ? " over-limit" : "")} style={locked ? { opacity: 0.55, position: "relative" } : undefined}
                   onClick={() => { if (locked) { openLockInfo(coin); return; } setSel(coin); setScreen("detail"); }}>
                {locked && <div className="over-limit-tag" style={{ position: "absolute", top: 8, right: 8, fontSize: 10, fontWeight: 700, color: "#92400E", background: "#FFF8E1", border: "1px solid #FFE082", borderRadius: 6, padding: "2px 6px" }}>Over plan limit</div>}
                <div className="ac-top">
                  {/* R25: the shared CoinIcon (accent ring + press) opens the Coin-info overlay */}
                  <CoinIcon coin={coin} />
                  <div className="ac-id">
                    <div className="ac-name">{coin.name}</div>
                    <div className="ac-amt">{h > 0 ? h.toLocaleString("en-US", { maximumFractionDigits: 6 }) : "0"} {coin.symbol}</div>
                  </div>
                </div>
                {v > 0
                  ? <div className="ac-val">${m.dollars.toLocaleString()}<span className="cents">.{m.cents}</span></div>
                  : <div className="ac-val muted">$0.00</div>}
                <div className="ac-bot">
                  <span className="ac-price">{fmtP(pr)}</span>
                  {/* A3: no live 24h change (missing price) = UNKNOWN, not down — a neutral
                      muted "—", never the red "dn" pill. */}
                  {ch == null
                    ? <span className="chg-pill muted">—</span>
                    : <span className={"chg-pill " + (ch >= 0 ? "up" : "dn")}>{fmtPct(ch)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="disclaimer disclaimer-lg">Prices via CoinGecko · Not financial advice</div>
    </div>
  );
}
