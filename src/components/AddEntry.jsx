import { useApp } from "../hooks/app-context.js";
import { useCoinHistory } from "../hooks/useCoinHistory.js";
import { c, inp_s, lbl_s } from "../utils/theme.js";
import { fmtP, fmtPriceInput } from "../utils/format.js";
import { TOP_COINS, getHistoricalPrice, priceAtDate } from "../utils/coins.js";
import { Ic, hdr } from "./ui.jsx";

// Buy/sell transaction form (new or edit). Selected coin, the e* form fields, and
// the addEntry handler come from context. Date is clamped to the coin's launch and
// the buy-date price auto-fills from REAL history (any coin, via the cached
// /api/history) — falling back to the built-in estimate when history isn't loaded.
export function AddEntry() {
  const {
    sel, eAmt, setEAmt, ePrice, setEPrice, eDate, setEDate,
    eTxType, setETxType, editEntry, setEditEntry, addEntry, setScreen,
  } = useApp();
  const coinData = sel ? TOP_COINS.find(x => x.id === sel.id) : null;
  const launchDate = coinData?.launch || "2013-04-28";
  const launchDateTime = launchDate + "T00:00";
  // Real daily history for the selected coin (null while loading / unavailable).
  const histPrices = useCoinHistory(sel?.id);
  // Price at a date: prefer real history, fall back to the built-in estimate.
  const priceAt = (date) => {
    if (!sel) return null;
    const real = histPrices ? priceAtDate(histPrices, date) : null;
    return (real != null && isFinite(real)) ? real : getHistoricalPrice(sel.id, date);
  };
  const onDateChange = (newDate) => {
    if(!newDate)return;
    const picked=new Date(newDate);
    const launch=new Date(launchDate);
    if(picked<launch){
      setEDate(launchDateTime);
      const hp=priceAt(launch);
      const formatted=fmtPriceInput(hp);
      if(formatted){setEPrice(formatted)}
      return;
    }
    setEDate(newDate);
    if(sel){const hp=priceAt(new Date(newDate));const fmt=fmtPriceInput(hp);if(fmt){setEPrice(fmt)}}
  };
  const histPrice = sel ? priceAt(new Date(eDate)) : null;
  const priceIsHist = histPrice && ePrice && Math.abs(parseFloat(ePrice)-histPrice)/histPrice < 0.15;
  const isBeforeLaunch = eDate && new Date(eDate) < new Date(launchDate);
  return (<>
    {hdr(<button onClick={()=>{setScreen("detail");setEditEntry(null)}} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button>,editEntry?"Edit Transaction":"New Transaction")}
    <div style={{padding:"12px 18px",display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>setETxType("buy")} style={{flex:1,padding:"11px",borderRadius:12,border:`1px solid ${eTxType==="buy"?c.ac:c.bdr}`,background:eTxType==="buy"?c.ac:c.inp,color:eTxType==="buy"?c.bg:c.dim,fontSize:14,fontWeight:700,cursor:"pointer"}}>Buy</button>
        <button onClick={()=>setETxType("sell")} style={{flex:1,padding:"11px",borderRadius:12,border:`1px solid ${eTxType==="sell"?c.red:c.bdr}`,background:eTxType==="sell"?c.red:c.inp,color:eTxType==="sell"?"#fff":c.dim,fontSize:14,fontWeight:700,cursor:"pointer"}}>Sell</button>
      </div>
      <div><label style={lbl_s}>Amount ({sel?.symbol})</label><input type="number" step="any" value={eAmt} onChange={e=>setEAmt(e.target.value)} placeholder="0.00" style={inp_s}/></div>
      <div><label style={lbl_s}>Price per coin (USD) {histPrice?<span style={{color:c.ac,fontWeight:600}}>· auto-filled</span>:""}</label><input type="number" step="any" value={ePrice} onChange={e=>setEPrice(e.target.value)} placeholder="0.00" style={inp_s}/>
        {histPrice&&!priceIsHist&&<div style={{fontSize:10,color:c.yel,marginTop:4}}>Suggested price: {fmtP(histPrice)}</div>}
      </div>
      <div><label style={lbl_s}>Date & Time <span style={{color:c.dim,fontWeight:400}}>· available from {launchDate}</span></label><input type="datetime-local" step="1" value={eDate} min={launchDateTime} onChange={e=>onDateChange(e.target.value)} style={inp_s}/>
        {isBeforeLaunch&&<div style={{fontSize:11,color:c.yel,marginTop:5,display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:14}}>⚠️</span>{sel?.name} launched on {launchDate}. Date adjusted to earliest available.</div>}
      </div>
      {eAmt&&ePrice&&(<div style={{padding:"10px 14px",background:c.acd,borderRadius:12,fontSize:13}}>{eTxType==="sell"?"Sell value":"Total cost"}: <strong>${(parseFloat(eAmt||0)*parseFloat(ePrice||0)).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>)}
      <button onClick={addEntry} disabled={!eAmt||!ePrice} style={{padding:"13px",borderRadius:12,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",width:"100%",background:eTxType==="sell"?c.red:c.ac,color:eTxType==="sell"?"#fff":c.bg,opacity:(!eAmt||!ePrice)?0.4:1}}>{editEntry?"Save Changes":eTxType==="sell"?"Add Sell":"Add Buy"}</button>
    </div>
  </>);
}
