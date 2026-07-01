import { useState, useEffect } from "react";
import { useApp } from "../hooks/app-context.js";
import { fmtP, fmtPct, fmtMc, fmtDT } from "../utils/format.js";
import { coinPnl } from "../utils/pnl.js";
import { c } from "../utils/theme.js";
import { Ic, CI } from "./ui.jsx";
import { Modal } from "./Modal.jsx";
import { sortTx, pageWindow } from "../utils/tx.js";
// (Round 15: shared centered-card popup)

// Coin detail: live price, holdings + P/L summary, and the transaction list (each
// row opens the edit form). Selected coin, prices, and the coin/tx handlers come
// from context. Restyled to the .ci-app design system; all data/handlers are unchanged.
export function Detail() {
  const {
    sel, portfolio, prices, setScreen, setSel,
    remCoin, remEntry, setEditEntry, setETxType, setEPrice, setEAmt, setEDate,
    startAddTx, isDesktop,
  } = useApp();
  // R12-1: the delete "armed" flag is LOCAL to this screen (was app-level context, which
  // leaked across navigation — arming delete then adding a tx re-fired the warning modal
  // on return). Local state clears on unmount, so the prompt only shows when you press
  // delete on THIS visit. R12-2: auto-disarm the lightweight "Remove" pill (a no-transaction
  // coin) after ~3s of inaction → back to the idle trash icon. The transaction-warning modal
  // (entries>0) is a deliberate blocking dialog and does NOT auto-dismiss.
  const [confirmDel, setConfirmDel] = useState(false);
  const selCoin = sel ? (portfolio.find(x=>x.id===sel.id)||sel) : null;
  const armedNoTx = confirmDel && !!selCoin && selCoin.entries.length===0;
  useEffect(() => {
    if(!armedNoTx) return;
    const t = setTimeout(()=>setConfirmDel(false), 3000);
    return ()=>clearTimeout(t);
  }, [armedNoTx]);
  // R19-3/R19-4: transaction list — a row-local two-tap delete (arm → "Delete?" → confirm,
  // auto-disarms ~3s) + 50-per-page pagination. Both states are LOCAL (R12 lesson) and reset
  // when a different coin opens (guards the R19-9 desktop stack where Detail stays mounted).
  const [confirmTxId, setConfirmTxId] = useState(null);
  const [txPage, setTxPage] = useState(1);
  useEffect(() => {
    if(!confirmTxId) return;
    const t = setTimeout(()=>setConfirmTxId(null), 3000);
    return ()=>clearTimeout(t);
  }, [confirmTxId]);
  useEffect(() => { setTxPage(1); setConfirmTxId(null); }, [sel?.id]);
  if(!sel)return null;
  const coin=selCoin;
  const p=prices[coin.id];const pr=p?.usd;const ch=p?.usd_24h_change;const mc=p?.usd_market_cap;
  const { holding:h, value:v, buysCost, sellsGain, pnl:totalPnl, pnlPct:totalPnlPct } = coinPnl(coin.entries, pr);
  // R19-5 newest-first order (date desc, createdAt tie-break) + R19-4 slice to the page.
  const sorted = sortTx(coin.entries);
  const PAGE_SIZE = 50;
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pg = Math.min(txPage, pages);
  const rows = sorted.slice((pg - 1) * PAGE_SIZE, pg * PAGE_SIZE);
  return(
    <div className={isDesktop ? "detail-popup" : "ci-app screen-bg"}>
      {/* R19-9: on desktop this screen is a popup — the Modal supplies the title + X, so hide
          the back-arrow + title here; the delete trash/Remove stays on the right. */}
      <div className="detail-head">
        {!isDesktop && <button className="icon-btn" onClick={()=>{setScreen("portfolio");setSel(null);setConfirmDel(false)}}>{Ic.back}</button>}
        {!isDesktop && <span className="dh-title">{coin.name}</span>}
        {isDesktop && <span style={{flex:1}} />}
        {/* R4-3: a coin WITH transactions opens a warning modal (below); a coin with
            none keeps the quick two-tap trash → "Remove" pill. */}
        {(!confirmDel||coin.entries.length>0)
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
          <button className="tx-btn buy" onClick={()=>startAddTx(coin,"buy")}>+ Buy</button>
          <button className="tx-btn sell" onClick={()=>startAddTx(coin,"sell")}>- Sell</button>
        </div>
      </div>
      {coin.entries.length===0
        ?(<div className="tx-empty">No transactions yet.</div>)
        :(<>
        <div className="tx-list">{rows.map(e=>{const isSell=e.type==="sell";const armed=confirmTxId===e.id;return(
          <div key={e.id} className="tx-row" onClick={()=>{setEditEntry(e);setEAmt(e.amount.toString());setEPrice(e.priceAtBuy.toString());setEDate(e.date);setETxType(e.type||"buy");setScreen("addEntry")}}>
            <div className="tx-left">
              <div className="tx-line">
                <span className={"tx-badge "+(isSell?"sell":"buy")}>{isSell?"SELL":"BUY"}</span>
                <span className="tx-amt">{e.amount.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol}</span>
              </div>
              <div className="tx-meta">{Ic.clock} {fmtDT(e.date)}</div>
            </div>
            <div className="tx-right">
              <div className="tx-rprice">{fmtP(e.priceAtBuy)}</div>
              <div className="tx-rcost">{isSell?"Recv":"Cost"} ${(e.amount*e.priceAtBuy).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
            </div>
            {/* R19-3: 2-step delete — tap the trash to arm, tap "Delete?" to confirm (auto-disarms ~3s). */}
            {armed
              ?<button className="tx-del-confirm" onClick={(ev)=>{ev.stopPropagation();remEntry(coin.id,e.id);setConfirmTxId(null)}}>Delete?</button>
              :<button className="tx-del" aria-label="Delete transaction" onClick={(ev)=>{ev.stopPropagation();setConfirmTxId(e.id)}}>{Ic.trash}</button>}
          </div>
        )})}</div>
        {/* R19-4: windowed numbered pager (50/page), only when there's more than one page. */}
        {pages>1&&(
          <div className="tx-pager">
            <button className="tx-pg-nav" disabled={pg<=1} onClick={()=>setTxPage(Math.max(1,pg-1))}>Prev</button>
            {pageWindow(pg,pages).map((n,i)=>n==="…"
              ?<span key={"e"+i} className="tx-pg-ellipsis">…</span>
              :<button key={n} className={"tx-pg"+(n===pg?" active":"")} aria-label={"Page "+n} onClick={()=>setTxPage(n)}>{n}</button>)}
            <button className="tx-pg-nav" disabled={pg>=pages} onClick={()=>setTxPage(Math.min(pages,pg+1))}>Next</button>
          </div>
        )}
        </>)}

      {/* R15-3: the destructive delete-with-transactions warning now uses the shared
          centered Modal (was a bottom-sheet). It's a confirm dialog → scrim tap closes it. */}
      {confirmDel&&coin.entries.length>0&&(
        <Modal size="sm" title={`Delete ${coin.name}?`} onClose={()=>setConfirmDel(false)}>
          <div className="dg-warn" style={{padding:"14px",borderRadius:12,background:"#FFF8E1",border:"1px solid #FFE082"}}>
            <div className="dg-warn-text" style={{fontSize:13,color:"#92400E",lineHeight:1.7}}>
              This coin has {coin.entries.length} buy/sell transaction{coin.entries.length>1?"s":""} and your saved thesis. If you delete it from your portfolio you'll lose that data — this can't be undone.
            </div>
          </div>
          <div style={{display:"flex",gap:10,marginTop:20}}>
            <button className="dg-keep" onClick={()=>setConfirmDel(false)} style={{flex:1,padding:"14px",borderRadius:14,border:"1px solid #E8E8ED",background:"#fff",color:c.txt,fontSize:14,fontWeight:600,cursor:"pointer"}}>Cancel</button>
            <button onClick={()=>{remCoin(coin.id);setConfirmDel(false)}} style={{flex:1,padding:"14px",borderRadius:14,border:"none",background:c.red,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Delete anyway</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
