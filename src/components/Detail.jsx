import { useApp } from "../hooks/app-context.js";
import { fmtP, fmtPct, fmtMc, fmtDT, fmtPriceInput } from "../utils/format.js";
import { getHistoricalPrice } from "../utils/coins.js";
import { coinPnl } from "../utils/pnl.js";
import { Ic, CI } from "./ui.jsx";

// Coin detail: live price, holdings + P/L summary, and the transaction list (each
// row opens the edit form). Selected coin, prices, and the coin/tx handlers come
// from context. Restyled to the .ci-app design system; all data/handlers are unchanged.
export function Detail() {
  const {
    sel, portfolio, prices, setScreen, setSel, confirmDel, setConfirmDel,
    remCoin, remEntry, setEditEntry, setETxType, setEPrice, setEAmt, setEDate,
  } = useApp();
  if(!sel)return null;
  const coin=portfolio.find(x=>x.id===sel.id)||sel;
  const p=prices[coin.id];const pr=p?.usd;const ch=p?.usd_24h_change;const mc=p?.usd_market_cap;
  const { holding:h, value:v, buysCost, sellsGain, pnl:totalPnl, pnlPct:totalPnlPct } = coinPnl(coin.entries, pr);
  const openNewTx=(type)=>{setEditEntry(null);setETxType(type);const now=new Date();const nowStr=now.toISOString().slice(0,16);const hp=getHistoricalPrice(coin.id,now);const priceStr=fmtPriceInput(hp)||(pr?pr.toString():"");setEPrice(priceStr);setEAmt("");setEDate(nowStr);setScreen("addEntry")};
  return(
    <div className="ci-app screen-bg">
      <div className="detail-head">
        <button className="icon-btn" onClick={()=>{setScreen("portfolio");setSel(null);setConfirmDel(false)}}>{Ic.back}</button>
        <span className="dh-title">{coin.name}</span>
        {!confirmDel
          ?<button className="icon-btn" onClick={()=>setConfirmDel(true)}>{Ic.trash}</button>
          :<button className="pill-danger" style={{animation:"fadeIn 0.15s"}} onClick={()=>{remCoin(coin.id);setConfirmDel(false)}}>Remove</button>}
      </div>

      {/* Price header */}
      <div className="price-hero">
        <div className="ph-icon"><CI thumb={coin.thumb} symbol={coin.symbol} size={48}/></div>
        <div className="ph-sub">{coin.symbol}</div>
        <div className="ph-price">{fmtP(pr)}</div>
        <div><span className={"chg-pill"+(ch>=0?"":" dn")}>{fmtPct(ch)} (24h)</span></div>
        {mc>0&&<div className="ph-mc">Market Cap: {fmtMc(mc)}</div>}
      </div>

      {/* Holdings + P/L summary */}
      <div className="pad">
        <div className="card">
          {(()=>{const boughtCoins=coin.entries.filter(e=>e.type!=="sell").reduce((s,e)=>s+e.amount,0);const soldCoins=coin.entries.filter(e=>e.type==="sell").reduce((s,e)=>s+e.amount,0);const avgBuy=boughtCoins>0?buysCost/boughtCoins:0;const avgSell=soldCoins>0?sellsGain/soldCoins:0;return(<>
          <div className="kv-row"><span className="kv-k">Holding</span><span className="kv-v">{h.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol}</span></div>
          <div className="kv-row"><span className="kv-k">Current Value</span><span className="kv-v">${v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
          <div className="kv-row"><span className="kv-k">Bought</span><span className="kv-v">{boughtCoins.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol} <span className="kv-sub">· ${buysCost.toLocaleString("en-US",{minimumFractionDigits:2})}</span></span></div>
          {avgBuy>0&&<div className="kv-row kv-sm"><span className="kv-k">Avg Buy Price</span><span className="kv-v">{fmtP(avgBuy)}</span></div>}
          {soldCoins>0&&<>
          <div className="kv-row"><span className="kv-k">Sold</span><span className="kv-v kv-sell">{soldCoins.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol} <span className="kv-sub">· ${sellsGain.toLocaleString("en-US",{minimumFractionDigits:2})}</span></span></div>
          <div className="kv-row kv-sm"><span className="kv-k">Avg Sell Price</span><span className="kv-v">{fmtP(avgSell)}</span></div></>}
          <div className={"pnl-row"+(totalPnl>=0?"":" dn")}><span className="pnl-label">Total P/L</span><span className="pnl-val">{totalPnl>=0?"+":""}${Math.abs(totalPnl).toLocaleString("en-US",{minimumFractionDigits:2})} ({fmtPct(totalPnlPct)})</span></div>
          {sellsGain>buysCost&&<div className="pnl-note">Sell proceeds exceed buy costs — you already profited more than your total investment</div>}
          </>)})()}
        </div>
      </div>

      {/* Transactions */}
      <div className="tx-head">
        <span className="tx-title">Transactions ({coin.entries.length})</span>
        <div className="tx-actions">
          <button className="tx-btn buy" onClick={()=>openNewTx("buy")}>+ Buy</button>
          <button className="tx-btn sell" onClick={()=>openNewTx("sell")}>- Sell</button>
        </div>
      </div>
      {coin.entries.length===0
        ?(<div className="tx-empty">No transactions yet.</div>)
        :[...coin.entries].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>{const isSell=e.type==="sell";return(
          <div key={e.id} className="tx-row" onClick={()=>{setEditEntry(e);setEAmt(e.amount.toString());setEPrice(e.priceAtBuy.toString());setEDate(e.date);setETxType(e.type||"buy");setScreen("addEntry")}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span className={"tx-badge "+(isSell?"sell":"buy")}>{isSell?"SELL":"BUY"}</span>
                <span className="tx-amt">{e.amount.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol}</span>
              </div>
              <div className="tx-meta">{Ic.clock} {fmtDT(e.date)}</div>
              <div className="tx-price">Price: {fmtP(e.priceAtBuy)} · {isSell?"Received":"Cost"}: ${(e.amount*e.priceAtBuy).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
            </div>
            <button className="tx-del" onClick={(ev)=>{ev.stopPropagation();remEntry(coin.id,e.id)}}>{Ic.trash}</button>
          </div>
        )})}
    </div>
  );
}
