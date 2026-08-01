import { useApp } from "../hooks/app-context.js";
import { useCoinHistory } from "../hooks/useCoinHistory.js";
import { fmtP, fmtPriceInput, sanitizeDecimal, blockDecimalKey, normalizeLeadingDot } from "../utils/format.js";
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
    eTxType, setETxType, editEntry, setEditEntry, addEntry, setScreen, isDesktop, addingTx,
  } = useApp();
  // TX-SAFE (Part A): keydown guard for the number fields — preventDefault the keys that
  // would push an <input type=number> into the "badInput" state (e/E/+/-, a 2nd dot, a
  // 16th digit). Skipped while a modifier is held so Ctrl/Cmd shortcuts (copy/paste/
  // select-all) are never touched; paste + spinner are backstopped by sanitizeDecimal.
  // A number input sanitizes a trailing-dot value ("1.") to "" and flags validity.badInput,
  // hiding the dot from .value — so treat badInput as "a dot is already present" to keep a
  // second dot from slipping through.
  const onDecimalKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target;
    const raw = el.value || (el.validity && el.validity.badInput ? "." : "");
    if (blockDecimalKey(e.key, raw)) e.preventDefault();
  };
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
          {/* R10-2a + TX-SAFE: only positive decimals. sanitizeDecimal (onChange + paste)
              strips e/E/+/-/extra dots and caps at 15 digit chars; onDecimalKeyDown stops
              those keys before the field can enter the badInput state; the single "." + the
              spinners stay. Server still bounds magnitude before the write (defense in depth). */}
          <input type="number" step="any" min="0" inputMode="decimal" value={eAmt}
            onChange={e=>setEAmt(sanitizeDecimal(e.target.value))}
            onKeyDown={onDecimalKeyDown}
            onPaste={e=>{e.preventDefault();setEAmt(sanitizeDecimal((e.clipboardData||window.clipboardData).getData("text")))}}
            onBlur={()=>setEAmt(normalizeLeadingDot(eAmt))}
            placeholder="0.00" className="field-input"/>
        </div>
        <div>
          <label className="field-label">Price per coin (USD)</label>
          <div className="price-wrap">
            <input type="number" step="any" min="0" inputMode="decimal" value={ePrice}
              onChange={e=>setEPrice(sanitizeDecimal(e.target.value))}
              onKeyDown={onDecimalKeyDown}
              onPaste={e=>{e.preventDefault();setEPrice(sanitizeDecimal((e.clipboardData||window.clipboardData).getData("text")))}}
              onBlur={()=>setEPrice(normalizeLeadingDot(ePrice))}
              placeholder="0.00" className="field-input"/>
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
        {/* TX-SAFE (Part B): disabled + busy label while a write is in flight, so a
            double-click can't fire two writes (two duplicate transaction docs). */}
        <button onClick={addEntry} disabled={!eAmt||!ePrice||addingTx} className={"submit-buy"+(eTxType==="sell"?" submit-sell":"")}>{addingTx?"Saving…":editEntry?"Save Changes":eTxType==="sell"?"Add Sell":"Add Buy"}</button>
      </div>
    </div>
  );
}
