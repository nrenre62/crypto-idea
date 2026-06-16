import { useApp } from "../hooks/app-context.js";
import { c, sb } from "../utils/theme.js";
import { fmtP, fmtPct, fmtMc, fmtDT } from "../utils/format.js";
import { getHistoricalPrice } from "../utils/coins.js";
import { coinPnl } from "../utils/pnl.js";
import { Ic, CI } from "./ui.jsx";

// Coin detail: live price, holdings + P/L summary, and the transaction list (each
// row opens the edit form). Selected coin, prices, and the coin/tx handlers come
// from context.
export function Detail() {
  const {
    sel, portfolio, prices, setScreen, setSel, confirmDel, setConfirmDel,
    remCoin, remEntry, setEditEntry, setETxType, setEPrice, setEAmt, setEDate,
  } = useApp();
  if(!sel)return null;
  const coin=portfolio.find(x=>x.id===sel.id)||sel;
  const p=prices[coin.id];const pr=p?.usd;const ch=p?.usd_24h_change;const mc=p?.usd_market_cap;
  const { holding:h, value:v, buysCost, sellsGain, pnl:totalPnl, pnlPct:totalPnlPct } = coinPnl(coin.entries, pr);
  return(<>
    <div style={{padding:"14px 18px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><button onClick={()=>{setScreen("portfolio");setSel(null);setConfirmDel(false)}} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button><span style={{fontSize:17,fontWeight:600}}>{coin.name}</span>{!confirmDel?<button onClick={()=>setConfirmDel(true)} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>{Ic.trash}</button>:<button onClick={()=>{remCoin(coin.id);setConfirmDel(false)}} style={{padding:"5px 12px",borderRadius:8,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",background:c.red,color:"#fff",animation:"fadeIn 0.15s"}}>Remove</button>}</div>
    <div style={{margin:"8px 16px",background:c.card,borderRadius:18,padding:"20px",textAlign:"center"}}>
      <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginBottom:8}}><CI thumb={coin.thumb} symbol={coin.symbol} size={40}/><span style={{fontSize:14,fontWeight:600,color:c.dim}}>{coin.symbol}</span></div>
      <div style={{fontSize:28,fontWeight:700}}>{fmtP(pr)}</div>
      <div style={{fontSize:13,fontWeight:600,color:ch>=0?c.ac:c.red,marginTop:3}}>{fmtPct(ch)} (24h)</div>
      {mc>0&&<div style={{fontSize:11,color:c.dim,marginTop:6}}>Market Cap: {fmtMc(mc)}</div>}
    </div>
    <div style={{margin:"0 18px",display:"flex",flexDirection:"column",gap:0,paddingBottom:10,borderBottom:`1px solid ${c.bdr}`}}>
      {(()=>{const boughtCoins=coin.entries.filter(e=>e.type!=="sell").reduce((s,e)=>s+e.amount,0);const soldCoins=coin.entries.filter(e=>e.type==="sell").reduce((s,e)=>s+e.amount,0);const avgBuy=boughtCoins>0?buysCost/boughtCoins:0;const avgSell=soldCoins>0?sellsGain/soldCoins:0;return(<>
      <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{color:c.dim,fontSize:12}}>Holding</span><span style={{fontWeight:700,fontSize:14}}>{h.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol}</span></div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{color:c.dim,fontSize:12}}>Current Value</span><span style={{fontWeight:700,fontSize:14}}>${v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
      <div style={{height:1,background:c.bdr,margin:"4px 0"}}/>
      <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{color:c.dim,fontSize:12}}>Bought</span><span style={{fontWeight:600,fontSize:13}}>{boughtCoins.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol} <span style={{color:c.dim,fontWeight:400}}>· ${buysCost.toLocaleString("en-US",{minimumFractionDigits:2})}</span></span></div>
      {avgBuy>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:c.dim,fontSize:11}}>Avg Buy Price</span><span style={{fontSize:12,color:c.dim}}>{fmtP(avgBuy)}</span></div>}
      {soldCoins>0&&<><div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{color:c.dim,fontSize:12}}>Sold</span><span style={{fontWeight:600,fontSize:13,color:c.red}}>{soldCoins.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol} <span style={{color:c.ac,fontWeight:400}}>· ${sellsGain.toLocaleString("en-US",{minimumFractionDigits:2})}</span></span></div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:c.dim,fontSize:11}}>Avg Sell Price</span><span style={{fontSize:12,color:c.dim}}>{fmtP(avgSell)}</span></div></>}
      <div style={{height:1,background:c.bdr,margin:"4px 0"}}/>
      <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",background:totalPnl>=0?c.acd:c.redd,borderRadius:10,paddingLeft:10,paddingRight:10,marginTop:4}}><span style={{fontSize:13,fontWeight:600}}>Total P/L</span><span style={{fontWeight:700,fontSize:14,color:totalPnl>=0?c.ac:c.red}}>{totalPnl>=0?"+":""}${Math.abs(totalPnl).toLocaleString("en-US",{minimumFractionDigits:2})} ({fmtPct(totalPnlPct)})</span></div>
      {sellsGain>buysCost&&<div style={{padding:"6px 10px",background:c.acd,borderRadius:8,fontSize:11,color:c.ac,marginTop:6}}>Sell proceeds exceed buy costs — you already profited more than your total investment</div>}
      </>)})()}
    </div>
    <div style={{padding:"12px 18px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,fontWeight:600}}>Transactions ({coin.entries.length})</span><div style={{display:"flex",gap:6}}><button onClick={()=>{setEditEntry(null);setETxType("buy");const now=new Date();const nowStr=now.toISOString().slice(0,16);const hp=getHistoricalPrice(coin.id,now);const priceStr=hp&&hp>0?(hp>=1?hp.toFixed(2):hp>=0.0001?hp.toFixed(6):hp>=0.0000001?hp.toFixed(10):hp.toFixed(12)):(pr?pr.toString():"");setEPrice(priceStr);setEAmt("");setEDate(nowStr);setScreen("addEntry")}} style={sb(c.ac,c.bg)}>+ Buy</button><button onClick={()=>{setEditEntry(null);setETxType("sell");const now=new Date();const nowStr=now.toISOString().slice(0,16);const hp=getHistoricalPrice(coin.id,now);const priceStr=hp&&hp>0?(hp>=1?hp.toFixed(2):hp>=0.0001?hp.toFixed(6):hp>=0.0000001?hp.toFixed(10):hp.toFixed(12)):(pr?pr.toString():"");setEPrice(priceStr);setEAmt("");setEDate(nowStr);setScreen("addEntry")}} style={sb(c.redd,c.red)}>- Sell</button></div></div>
    {coin.entries.length===0?(<div style={{textAlign:"center",padding:"20px",color:c.dim,fontSize:12}}>No transactions yet.</div>):[...coin.entries].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>{const isSell=e.type==="sell";return(<div key={e.id} onClick={()=>{setEditEntry(e);setEAmt(e.amount.toString());setEPrice(e.priceAtBuy.toString());setEDate(e.date);setETxType(e.type||"buy");setScreen("addEntry")}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 18px",borderBottom:"1px solid #F0F0F0",cursor:"pointer"}}><div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6,background:isSell?c.redd:c.acd,color:isSell?c.red:c.ac}}>{isSell?"SELL":"BUY"}</span><span style={{fontSize:13,fontWeight:600}}>{e.amount.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol}</span></div><div style={{fontSize:11,color:c.dim,marginTop:2,display:"flex",alignItems:"center",gap:4}}>{Ic.clock} {fmtDT(e.date)}</div><div style={{fontSize:10,color:c.dim}}>Price: {fmtP(e.priceAtBuy)} · {isSell?"Received":"Cost"}: ${(e.amount*e.priceAtBuy).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div><button onClick={(ev)=>{ev.stopPropagation();remEntry(coin.id,e.id)}} style={{background:"none",border:"none",cursor:"pointer",padding:6}}>{Ic.trash}</button></div>)})}
  </>);
}
