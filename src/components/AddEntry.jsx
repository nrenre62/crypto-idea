import { useApp } from "../hooks/app-context.js";
import { useCoinHistory } from "../hooks/useCoinHistory.js";
import { fmtP, fmtPriceInput } from "../utils/format.js";
import { TOP_COINS, getHistoricalPrice, priceAtDate } from "../utils/coins.js";
import { Ic, CI } from "./ui.jsx";

// Buy/sell transaction form (new or edit). Selected coin, the e* form fields, and
// the addEntry handler come from context. Date is clamped to the coin's launch and
// the buy-date price auto-fills from REAL history (any coin, via the cached
// /api/history) — falling back to the built-in estimate when history isn't loaded.
// Restyled to the .ci-app design system; all data/handlers are unchanged.
export function AddEntry() {
  const {
    sel, eAmt, setEAmt, ePrice, setEPrice, eDate, setEDate,
    eTxType, setETxType, editEntry, setEditEntry, addEntry, setScreen, isDesktop,
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
    <div className={isDesktop ? "detail-popup" : "ci-app screen-bg"}>
      {/* R19-9: desktop = popup stacked over the coin popup (Modal supplies title + X). */}
      {!isDesktop && (
      <div className="detail-head">
        <button className="icon-btn" onClick={()=>{setScreen("detail");setEditEntry(null)}}>{Ic.back}</button>
        <span className="dh-title">{editEntry?"Edit transaction":"Add transaction"}</span>
        <span style={{width:22}}/>
      </div>
      )}
      <div className="form-body">
        {sel&&(
          <div className="tx-coin-head">
            <CI thumb={sel.thumb} symbol={sel.symbol} size={36}/>
            <div className="tx-coin-name">{sel.name} <span className="tx-coin-sym">· {sel.symbol}</span></div>
          </div>
        )}
        <div className="seg">
          <button onClick={()=>setETxType("buy")} className={"seg-btn"+(eTxType==="buy"?" on-buy":"")}>Buy</button>
          <button onClick={()=>setETxType("sell")} className={"seg-btn"+(eTxType==="sell"?" on-sell":"")}>Sell</button>
        </div>
        <div>
          <label className="field-label">Amount ({sel?.symbol})</label>
          {/* R10-2a: only positive numbers — strip any "-" on input + min/inputMode so
              a negative can't be typed/pasted/spun (server rejects amount>0; addEntry
              also validates before the write). */}
          <input type="number" step="any" min="0" inputMode="decimal" value={eAmt} onChange={e=>setEAmt(e.target.value.replace(/-/g,""))} placeholder="0.00" className="field-input"/>
        </div>
        <div>
          <label className="field-label">Price per coin (USD)</label>
          <div className="price-wrap">
            <input type="number" step="any" min="0" inputMode="decimal" value={ePrice} onChange={e=>setEPrice(e.target.value.replace(/-/g,""))} placeholder="0.00" className="field-input"/>
            {/* R4-5: AUTO is always shown when a market price exists for this coin+date,
                and is clickable to (re)apply it — so after editing the price, or switching
                coins, you can always snap back to the market price. `.on` = price matches. */}
            {histPrice&&<button type="button" className={"auto-badge"+(priceIsHist?" on":"")} onClick={()=>{const f=fmtPriceInput(histPrice);if(f)setEPrice(f)}} title={priceIsHist?"Using the market price for this date":"Tap to use the market price for this date"}>AUTO</button>}
          </div>
          {histPrice&&!priceIsHist&&<div className="field-hint">Suggested price: {fmtP(histPrice)} · tap AUTO to use</div>}
        </div>
        <div>
          <label className="field-label">Date & Time <span className="lbl-sub">· available from {launchDate}</span></label>
          <input type="datetime-local" step="1" value={eDate} min={launchDateTime} onChange={e=>onDateChange(e.target.value)} className="field-input"/>
          {isBeforeLaunch&&<div className="field-warn"><span style={{fontSize:14}}>⚠️</span>{sel?.name} launched on {launchDate}. Date adjusted to earliest available.</div>}
        </div>
        {eAmt&&ePrice&&(
          <div className="tx-total">
            <span className="tx-total-label">{eTxType==="sell"?"Sell value":"Total cost"}</span>
            <span className="tx-total-amt">${(parseFloat(eAmt||0)*parseFloat(ePrice||0)).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
          </div>
        )}
        <button onClick={addEntry} disabled={!eAmt||!ePrice} className={"submit-buy"+(eTxType==="sell"?" submit-sell":"")}>{editEntry?"Save Changes":eTxType==="sell"?"Add Sell":"Add Buy"}</button>
      </div>
    </div>
  );
}
