import { useApp } from "../hooks/app-context.js";
import { c } from "../utils/theme.js";
import { fmtP, fmtPct, fmtMc } from "../utils/format.js";
import { TOP_COINS, PRICE_HISTORY, getHistoricalPrice } from "../utils/coins.js";
import { Ic, CI } from "./ui.jsx";

// Read-only coin overview (price, market data, your position, price-history
// milestones). The viewed coin (infoCoin), live prices, and the active portfolio
// come from context.
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

  return(<>
    <div style={{padding:"14px 18px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <button onClick={()=>{setScreen("portfolio");setInfoCoin(null)}} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button>
      <span style={{fontSize:17,fontWeight:600}}>{coin.name}</span>
      <button onClick={()=>{setSel(portCoin||coin);setScreen("detail");setInfoCoin(null)}} style={{padding:"6px 12px",borderRadius:8,border:"1px solid #E8E8ED",background:"none",fontSize:11,fontWeight:600,color:c.txt,cursor:"pointer"}}>Transactions</button>
    </div>

    {/* Price Header */}
    <div style={{padding:"20px 18px 16px",textAlign:"center"}}>
      <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:10,marginBottom:12}}>
        <CI thumb={coin.thumb} symbol={coin.symbol} size={48}/>
      </div>
      <div style={{fontSize:11,color:c.dim,marginBottom:4}}>{coin.symbol} · Rank #{rank}</div>
      <div style={{fontSize:36,fontWeight:200,letterSpacing:"-1.5px"}}>{fmtP(pr)}</div>
      <div style={{display:"inline-flex",padding:"4px 14px",borderRadius:20,background:ch>=0?c.acd:c.redd,marginTop:8}}>
        <span style={{fontSize:14,fontWeight:600,color:ch>=0?c.ac:c.red}}>{fmtPct(ch)} (24h)</span>
      </div>
    </div>

    {/* Market Data */}
    <div style={{margin:"0 18px",padding:"16px",background:c.card,borderRadius:16}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Market Data</div>
      {[
        ["Market Cap",fmtMc(mc)],
        ["Rank","#"+rank],
        ["First tracked",launchDate],
      ].map(([k,v])=>(
        <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #F0F0F0"}}>
          <span style={{fontSize:13,color:c.dim}}>{k}</span>
          <span style={{fontSize:13,fontWeight:600}}>{v}</span>
        </div>
      ))}
    </div>

    {/* Your Position */}
    {portCoin&&<div style={{margin:"12px 18px",padding:"16px",background:c.card,borderRadius:16}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Your Position</div>
      {[
        ["Holdings",holdings.toLocaleString("en-US",{maximumFractionDigits:8})+" "+coin.symbol],
        ["Value","$"+holdValue.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})],
        ["Transactions",portCoin.entries.length.toString()],
      ].map(([k,v])=>(
        <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #F0F0F0"}}>
          <span style={{fontSize:13,color:c.dim}}>{k}</span>
          <span style={{fontSize:13,fontWeight:600}}>{v}</span>
        </div>
      ))}
      <button onClick={()=>{setSel(portCoin);setScreen("detail");setInfoCoin(null)}} style={{width:"100%",padding:"12px",borderRadius:12,border:"none",background:c.txt,color:c.bg,fontSize:14,fontWeight:600,cursor:"pointer",marginTop:12}}>View Transactions</button>
    </div>}

    {/* Price at key dates */}
    {cd&&PRICE_HISTORY[coin.id]&&<div style={{margin:"12px 18px",padding:"16px",background:c.card,borderRadius:16}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>Price History</div>
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
            <div key={p.label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #F0F0F0"}}>
              <span style={{fontSize:12,color:c.dim}}>{p.label}</span>
              <div style={{textAlign:"right"}}>
                <span style={{fontSize:12,fontWeight:600}}>{fmtP(price)}</span>
                {p.label!=="Today"&&<span style={{fontSize:10,marginLeft:6,color:changeFromNow>=0?c.ac:c.red}}>{fmtPct(changeFromNow)}</span>}
              </div>
            </div>
          );
        });
      })()}
    </div>}
  </>);
}
