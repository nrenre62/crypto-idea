import { useApp } from "../hooks/app-context.js";
import { useCoinHistory } from "../hooks/useCoinHistory.js";
import { fmtP, fmtPriceInput } from "../utils/format.js";
import { TOP_COINS, getHistoricalPrice, priceAtDate } from "../utils/coins.js";
import { Ic } from "./ui.jsx";

// Buy/sell transaction form (new or edit). Selected coin, the e* form fields, and
// the addEntry handler come from context. Date is clamped to the coin's launch and
// the buy-date price auto-fills from REAL history (any coin, via the cached
// /api/history) — falling back to the built-in estimate when history isn't loaded.
// Restyled to the .ci-app design system; all data/handlers are unchanged.
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
  return (
    <div className="ci-app screen-bg">
      <div className="detail-head">
        <button className="icon-btn" onClick={()=>{setScreen("detail");setEditEntry(null)}}>{Ic.back}</button>
        <span className="dh-title">{editEntry?"Edit Transaction":"New Transaction"}</span>
        <span style={{width:22}}/>
      </div>
      <div className="form-body">
        <div className="seg">
          <button onClick={()=>setETxType("buy")} className={"seg-btn"+(eTxType==="buy"?" on-buy":"")}>Buy</button>
          <button onClick={()=>setETxType("sell")} className={"seg-btn"+(eTxType==="sell"?" on-sell":"")}>Sell</button>
        </div>
        <div>
          <label className="field-label">Amount ({sel?.symbol})</label>
          <input type="number" step="any" value={eAmt} onChange={e=>setEAmt(e.target.value)} placeholder="0.00" className="field-input"/>
        </div>
        <div>
          <label className="field-label">Price per coin (USD) {histPrice?<span className="lbl-accent">· auto-filled</span>:""}</label>
          <input type="number" step="any" value={ePrice} onChange={e=>setEPrice(e.target.value)} placeholder="0.00" className="field-input"/>
          {histPrice&&!priceIsHist&&<div className="field-hint">Suggested price: {fmtP(histPrice)}</div>}
        </div>
        <div>
          <label className="field-label">Date & Time <span className="lbl-sub">· available from {launchDate}</span></label>
          <input type="datetime-local" step="1" value={eDate} min={launchDateTime} onChange={e=>onDateChange(e.target.value)} className="field-input"/>
          {isBeforeLaunch&&<div className="field-warn"><span style={{fontSize:14}}>⚠️</span>{sel?.name} launched on {launchDate}. Date adjusted to earliest available.</div>}
        </div>
        {eAmt&&ePrice&&(<div className="calc-box">{eTxType==="sell"?"Sell value":"Total cost"}: <strong>${(parseFloat(eAmt||0)*parseFloat(ePrice||0)).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>)}
        <button onClick={addEntry} disabled={!eAmt||!ePrice} className={"submit-buy"+(eTxType==="sell"?" submit-sell":"")}>{editEntry?"Save Changes":eTxType==="sell"?"Add Sell":"Add Buy"}</button>
      </div>
    </div>
  );
}
