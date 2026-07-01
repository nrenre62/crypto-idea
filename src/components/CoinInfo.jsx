import { useApp } from "../hooks/app-context.js";
import { fmtP, fmtPct, fmtMc } from "../utils/format.js";
import { TOP_COINS, PRICE_HISTORY, getHistoricalPrice } from "../utils/coins.js";
import { coinPnl } from "../utils/pnl.js";
import { Ic, CI } from "./ui.jsx";

// Read-only coin overview: price + 24h, MARKET DATA, YOUR POSITION, and price-history
// milestones. The viewed coin (infoCoin), live prices, and the active portfolio come
// from context. 24h volume + circulating supply come from the /api/prices feed when
// available and fall back to "—" (never NaN). Restyled to the .ci-app design system.
export function CoinInfo() {
  const { infoCoin, setInfoCoin, prices, portfolio, setSel, setScreen, isDesktop } = useApp();
  if(!infoCoin)return null;
  const coin=infoCoin;
  const cd=TOP_COINS.find(x=>x.id===coin.id);
  const p=prices[coin.id];
  const pr=p?.usd||cd?.mockPrice||0;
  const ch=p?.usd_24h_change||cd?.mockChange||0;
  const mc=p?.usd_market_cap||cd?.mockMcap||0;
  const vol=p?.usd_24h_vol||0;            // 24h trading volume — "—" until the proxy supplies it
  const circ=p?.circulating||0;           // circulating supply — "—" until the proxy supplies it
  const rank=cd?.rank;
  const portCoin=portfolio.find(x=>x.id===coin.id);

  return(
    <div className={isDesktop ? "detail-popup" : "ci-app screen-bg"}>
      {/* R19-9: desktop = popup (Modal supplies title + X); keep the Transactions action. */}
      <div className="detail-head">
        {!isDesktop && <button className="icon-btn" onClick={()=>{setScreen("portfolio");setInfoCoin(null)}}>{Ic.back}</button>}
        {!isDesktop && <span className="dh-title">{coin.name}</span>}
        {isDesktop && <span style={{flex:1}} />}
        <button className="pill-ghost" onClick={()=>{setSel(portCoin||coin);setScreen("detail");setInfoCoin(null)}}>Transactions</button>
      </div>

      {/* Price header */}
      <div className="price-hero">
        <div className="ph-icon"><CI thumb={coin.thumb} symbol={coin.symbol} size={48}/></div>
        <div className="ph-sub">{coin.symbol}{rank?" · Rank #"+rank:""}</div>
        <div className="ph-price">{fmtP(pr)}</div>
        <div><span className={"chg-pill"+(ch>=0?"":" dn")}>{fmtPct(ch)} today</span></div>
      </div>

      <div className="pad">
        {/* Market Data */}
        <div className="card">
          <div className="card-title">Market Data</div>
          {[
            ["Rank",rank?"#"+rank:"—"],
            ["Market cap",fmtMc(mc)],
            ["24h volume",fmtMc(vol)],
            ["Circulating",circ?circ.toLocaleString("en-US",{maximumFractionDigits:0})+" "+coin.symbol:"—"],
          ].map(([k,v])=>(
            <div key={k} className="kv-row">
              <span className="kv-k">{k}</span>
              <span className="kv-v">{v}</span>
            </div>
          ))}
        </div>

        {/* Your Position — only when the active portfolio holds this coin */}
        {portCoin&&(()=>{
          const { holding, buysCost } = coinPnl(portCoin.entries, pr);
          const boughtCoins=portCoin.entries.filter(e=>e.type!=="sell").reduce((s,e)=>s+e.amount,0);
          const avgBuy=boughtCoins>0?buysCost/boughtCoins:0;
          const costBasisHeld=avgBuy*holding;            // cost of the units still held
          const unreal=holding*pr-costBasisHeld;         // value of held units − their cost basis (excludes realised sells)
          const unrealPct=costBasisHeld>0?(unreal/costBasisHeld)*100:0;
          return(
            <div className="card">
              <div className="card-title">Your Position</div>
              <div className="kv-row"><span className="kv-k">Held</span><span className="kv-v">{holding.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol}</span></div>
              <div className="kv-row"><span className="kv-k">Avg cost</span><span className="kv-v">{fmtP(avgBuy)}</span></div>
              <div className={"pnl-row"+(unreal>=0?"":" dn")}><span className="pnl-label">Unrealised P/L</span><span className="pnl-val">{unreal>=0?"+":""}${Math.abs(unreal).toLocaleString("en-US",{minimumFractionDigits:2})} ({fmtPct(unrealPct)})</span></div>
            </div>
          );
        })()}

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
