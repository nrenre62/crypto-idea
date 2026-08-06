import { useState, useEffect } from "react";
import { useApp } from "../hooks/app-context.js";
import { fmtP, fmtPct, fmtMc } from "../utils/format.js";
import { TOP_COINS, PRICE_HISTORY, getHistoricalPrice } from "../utils/coins.js";
import { fetchPrices } from "../api/coingecko.js";
import { coinPnl } from "../utils/pnl.js";
import { CI } from "./ui.jsx";

// Read-only coin overview: price + 24h, MARKET DATA, YOUR POSITION, and price-history
// milestones. R25-3: always rendered BODY-ONLY inside the shared <Modal> overlay (the
// Modal supplies the title + X on every device) — over whatever screen you were on.
// R25-4: a not-yet-held coin isn't polled by useLivePrices, so its cached price is
// fetched once from the flat-cost /api/prices (carries cap/vol/circulating/rank after
// R23). 24h volume + circulating fall back to "—" (never NaN).
export function CoinInfo() {
  const { infoCoin, setInfoCoin, prices, portfolio, setSel, setScreen } = useApp();
  const coin=infoCoin;
  const live=coin?prices[coin.id]:null;
  const [fetched,setFetched]=useState(null);
  useEffect(()=>{
    let on=true;
    setFetched(null);
    // one-shot fetch for a coin absent from the live map (held coins are already polled)
    if(coin&&!prices[coin.id]){
      fetchPrices([coin.id]).then(d=>{if(on&&d&&d[coin.id])setFetched(d[coin.id])});
    }
    return()=>{on=false};
  },[coin?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if(!coin)return null;
  const cd=TOP_COINS.find(x=>x.id===coin.id);
  const p=live||fetched;
  // A4: `??`-chain the live→mock fallback so a GENUINE live 0 (price/change/mcap) renders
  // as the real value instead of falling through `||` to BTC's mock reference numbers.
  const pr=p?.usd??cd?.mockPrice??0;
  const ch=p?.usd_24h_change??cd?.mockChange??0;
  const mc=p?.usd_market_cap??cd?.mockMcap??0;
  const vol=p?.usd_24h_vol||0;            // 24h trading volume — "—" until the proxy supplies it
  const circ=p?.circulating||0;           // circulating supply — "—" until the proxy supplies it
  const rank=p?.usd_market_cap_rank!=null?p.usd_market_cap_rank:cd?.rank;   // R23: live rank first
  const portCoin=portfolio.find(x=>x.id===coin.id);

  return(
    <div className="detail-popup">
      {/* R25-5: Transactions = the accent pill (thesis-Edit look), HELD coins only —
          a non-held Search coin has no transactions to show. */}
      {portCoin&&(
        <div className="detail-head">
          <span style={{flex:1}} />
          <button className="j-edit-btn" onClick={()=>{setSel(portCoin);setScreen("detail");setInfoCoin(null)}}>Transactions</button>
        </div>
      )}

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
              <div className={"pnl-row"+(unreal>=0?"":" dn")}><span className="pnl-label">Unrealised P/L</span><span className="pnl-val">{unreal>=0?"+":"−"}${Math.abs(unreal).toLocaleString("en-US",{minimumFractionDigits:2})} ({fmtPct(unrealPct)})</span></div>
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
