import { useApp } from "../hooks/app-context.js";
import { fmtP, fmtPct, fmtMc } from "../utils/format.js";
import { TOP_COINS, PRICE_HISTORY, getHistoricalPrice } from "../utils/coins.js";
import { Ic, CI } from "./ui.jsx";

// Read-only coin overview (price, market data, your position, price-history
// milestones). The viewed coin (infoCoin), live prices, and the active portfolio
// come from context. Restyled to the .ci-app design system; all data/handlers
// are unchanged.
export function CoinInfo() {
  const { infoCoin, setInfoCoin, prices, portfolio, setSel, setScreen } = useApp();
  if(!infoCoin)return null;
  const coin=infoCoin;
  const cd=TOP_COINS.find(x=>x.id===coin.id);
  const p=prices[coin.id];
  const pr=p?.usd||cd?.mockPrice||0;
  const ch=p?.usd_24h_change||cd?.mockChange||0;
  const mc=p?.usd_market_cap||cd?.mockMcap||0;
  const portCoin=portfolio.find(x=>x.id===coin.id);
  const holdings=portCoin?Math.max(0,portCoin.entries.reduce((s,e)=>e.type==="sell"?s-e.amount:s+e.amount,0)):0;
  const holdValue=holdings*pr;
  const rank=cd?.rank||"—";
  const launchDate=cd?.launch||"Unknown";

  return(
    <div className="ci-app screen-bg">
      <div className="detail-head">
        <button className="icon-btn" onClick={()=>{setScreen("portfolio");setInfoCoin(null)}}>{Ic.back}</button>
        <span className="dh-title">{coin.name}</span>
        <button className="pill-ghost" onClick={()=>{setSel(portCoin||coin);setScreen("detail");setInfoCoin(null)}}>Transactions</button>
      </div>

      {/* Price header */}
      <div className="price-hero">
        <div className="ph-icon"><CI thumb={coin.thumb} symbol={coin.symbol} size={48}/></div>
        <div className="ph-sub">{coin.symbol} · Rank #{rank}</div>
        <div className="ph-price">{fmtP(pr)}</div>
        <div><span className={"chg-pill"+(ch>=0?"":" dn")}>{fmtPct(ch)} (24h)</span></div>
      </div>

      <div className="pad">
        {/* Market Data */}
        <div className="card">
          <div className="card-title">Market Data</div>
          {[
            ["Market Cap",fmtMc(mc)],
            ["Rank","#"+rank],
            ["First tracked",launchDate],
          ].map(([k,v])=>(
            <div key={k} className="kv-row">
              <span className="kv-k">{k}</span>
              <span className="kv-v">{v}</span>
            </div>
          ))}
        </div>

        {/* Your Position */}
        {portCoin&&<div className="card">
          <div className="card-title">Your Position</div>
          {[
            ["Holdings",holdings.toLocaleString("en-US",{maximumFractionDigits:8})+" "+coin.symbol],
            ["Value","$"+holdValue.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})],
            ["Transactions",portCoin.entries.length.toString()],
          ].map(([k,v])=>(
            <div key={k} className="kv-row">
              <span className="kv-k">{k}</span>
              <span className="kv-v">{v}</span>
            </div>
          ))}
          <button className="btn-primary" style={{marginTop:14}} onClick={()=>{setSel(portCoin);setScreen("detail");setInfoCoin(null)}}>View Transactions</button>
        </div>}

        {/* Price at key dates */}
        {cd&&PRICE_HISTORY[coin.id]&&<div className="card">
          <div className="card-title">Price History</div>
          {(()=>{
            const hist=PRICE_HISTORY[coin.id];
            if(!hist||hist.length===0)return null;
            const now=new Date();
            const periods=[
              {label:"Launch",date:new Date(cd.launch)},
              {label:"1 Year Ago",date:new Date(now.getFullYear()-1,now.getMonth(),now.getDate())},
              {label:"6 Months Ago",date:new Date(now.getFullYear(),now.getMonth()-6,now.getDate())},
              {label:"3 Months Ago",date:new Date(now.getFullYear(),now.getMonth()-3,now.getDate())},
              {label:"Today",date:now},
            ];
            return periods.filter(p=>p.date>=new Date(cd.launch)).map(p=>{
              const price=getHistoricalPrice(coin.id,p.date);
              if(!price)return null;
              const changeFromNow=pr>0?((pr-price)/price)*100:0;
              return(
                <div key={p.label} className="kv-row">
                  <span className="kv-k">{p.label}</span>
                  <span className="kv-vr">
                    <span className="kv-v">{fmtP(price)}</span>
                    {p.label!=="Today"&&<span className={"kv-chg "+(changeFromNow>=0?"up":"dn")}>{fmtPct(changeFromNow)}</span>}
                  </span>
                </div>
              );
            });
          })()}
        </div>}
      </div>
    </div>
  );
}
