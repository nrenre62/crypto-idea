import { useApp } from "../hooks/app-context.js";
import { c, sb } from "../utils/theme.js";
import { fmtP, fmtPct } from "../utils/format.js";
import { Ic, CI } from "./ui.jsx";
import { StatusDot } from "./StatusDot.jsx";
import { PortfolioBar } from "./PortfolioBar.jsx";

// Main logged-in screen: total value + return header, portfolio switcher, and the
// swipeable asset list. Totals, tier flags, the active portfolio, live prices, and
// swipe-gesture state/handlers all come from context.
export function Portfolio() {
  const {
    api, tv, totalBuys, tpnl, tpp, portfolio, maxCoinsPerPort, usagePct,
    prices, isPro, isPremium, setScreen, startUpgrade, setSel, setInfoCoin,
    remCoin, resetSwipe, onTouchS, onTouchM, onTouchE, touchStart, swipeId, swipeX,
  } = useApp();
  return (<>
    <div style={{padding:"14px 18px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:9}}>
        <span style={{fontSize:22,fontWeight:300,color:c.txt,letterSpacing:"-0.5px"}}>Crypto <span style={{fontWeight:700}}>Idea</span></span>
      </div>
      <div style={{display:"flex",gap:6}}>
        <StatusDot/>
        <span onClick={()=>setScreen("account")} style={{fontSize:9,padding:"3px 7px",borderRadius:20,fontWeight:700,cursor:"pointer",background:isPremium?"#AF52DE15":isPro?c.acd:c.yeld,color:isPremium?"#AF52DE":isPro?c.ac:c.yel}}>{isPremium?"PREMIUM":isPro?"PRO":"STARTER"}</span>
      </div>
    </div>
    <div style={{margin:"10px 16px",borderRadius:18,padding:"20px 18px"}}>
      <div style={{fontSize:11,color:c.dim,fontWeight:500}}>Portfolio</div>
      <div style={{fontSize:38,fontWeight:200,letterSpacing:"-2px",marginTop:2}}>${Math.floor(tv).toLocaleString()}<span style={{fontSize:22,color:"#CCC"}}>.{(tv%1).toFixed(2).slice(2)}</span></div>
      <div style={{display:"flex",gap:20,marginTop:12}}>
        <div><div style={{fontSize:10,color:c.dim}}>Invested</div><div style={{fontSize:14,fontWeight:600,marginTop:1}}>${totalBuys.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div>
        <div><div style={{fontSize:10,color:c.dim}}>Return</div><div style={{display:"inline-flex",padding:"4px 12px",borderRadius:20,background:tpnl>=0?c.acd:c.redd,marginTop:4}}><span style={{fontSize:13,fontWeight:600,color:tpnl>=0?c.ac:c.red}}>{tpnl>=0?"+":""}${Math.abs(tpnl).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} ({fmtPct(tpp)})</span></div></div>
      </div>
      <div style={{marginTop:10,display:"flex",alignItems:"center",gap:6}}>
        <StatusDot small/>
        <span style={{fontSize:10,color:c.dim}}>{api==="live"?"Prices updating live":"Showing last known prices · Connect to internet for updates"}</span>
      </div>
    </div>
    <PortfolioBar/>
    <div style={{padding:"10px 18px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:14,fontWeight:600}}>My Assets <span style={{color:c.dim,fontWeight:400}}>({portfolio.length}/{maxCoinsPerPort})</span></span>
      <button onClick={()=>setScreen("search")} style={sb(c.ac,c.bg)}>{Ic.plus} Add</button>
    </div>
    {!isPro&&usagePct>=95&&usagePct<100&&<div style={{margin:"0 18px 8px",padding:"10px 14px",borderRadius:10,background:"#FFF8E1",fontSize:12,color:"#F59E0B",fontWeight:500,textAlign:"center"}}>You're close to your account limit. <span onClick={()=>startUpgrade("pro")} style={{fontWeight:700,textDecoration:"underline",cursor:"pointer"}}>Upgrade to Pro</span></div>}
    {!isPro&&usagePct>=100&&<div style={{margin:"0 18px 8px",padding:"10px 14px",borderRadius:10,background:"#FFF0F0",fontSize:12,color:c.red,fontWeight:500,textAlign:"center"}}>You've reached your account limit. <span onClick={()=>startUpgrade("pro")} style={{fontWeight:700,textDecoration:"underline",cursor:"pointer"}}>Upgrade to Pro</span></div>}
    {isPro&&!isPremium&&usagePct>=95&&<div style={{margin:"0 18px 8px",padding:"10px 14px",borderRadius:10,background:"#FFF8E1",fontSize:12,color:"#F59E0B",fontWeight:500,textAlign:"center",lineHeight:1.5}}>You're at the limit of your Pro account. Need more? <span onClick={()=>setScreen("contact")} style={{fontWeight:700,textDecoration:"underline",cursor:"pointer"}}>Contact us</span> for a custom Premium plan.</div>}
    {portfolio.length===0?(<div style={{textAlign:"center",padding:"44px 36px",color:c.dim}}><div style={{fontSize:40,marginBottom:12}}>📊</div><div style={{fontSize:15,fontWeight:600,color:c.txt,marginBottom:5}}>No coins yet</div><div style={{fontSize:13,lineHeight:1.5}}>Tap <strong style={{color:c.ac}}>+ Add</strong> to search and add your first crypto</div></div>):[...portfolio].map(coin=>({coin,val:Math.max(0,coin.entries.reduce((s,e)=>e.type==="sell"?s-e.amount:s+e.amount,0))*(prices[coin.id]?.usd||0)})).sort((a,b)=>b.val-a.val).map(({coin})=>{const p=prices[coin.id];const pr=p?.usd;const ch=p?.usd_24h_change;const h=Math.max(0,coin.entries.reduce((s,e)=>e.type==="sell"?s-e.amount:s+e.amount,0));const v=h*(pr||0);return(<div key={coin.id} style={{position:"relative",overflow:"hidden",borderBottom:"1px solid #F0F0F0"}}>
{/* Edit action (right swipe) */}
<div onClick={()=>{setSel(coin);setScreen("detail");resetSwipe()}} style={{position:"absolute",left:0,top:0,bottom:0,width:80,background:"#007AFF",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:2,cursor:"pointer"}}>
<span style={{fontSize:18}}>✏️</span>
<span style={{fontSize:9,fontWeight:700,color:"#fff"}}>Edit</span>
</div>
{/* Delete action (left swipe) */}
<div onClick={()=>{remCoin(coin.id);resetSwipe()}} style={{position:"absolute",right:0,top:0,bottom:0,width:80,background:c.red,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:2,cursor:"pointer"}}>
<span style={{fontSize:18}}>🗑️</span>
<span style={{fontSize:9,fontWeight:700,color:"#fff"}}>Delete</span>
</div>
{/* Sliding coin row */}
<div onTouchStart={(e)=>onTouchS(coin.id,e)} onTouchMove={onTouchM} onTouchEnd={onTouchE} onMouseDown={(e)=>onTouchS(coin.id,e)} onMouseMove={(e)=>{if(touchStart)onTouchM(e)}} onMouseUp={onTouchE} onMouseLeave={onTouchE}
style={{display:"flex",alignItems:"center",padding:"11px 18px",gap:11,background:c.bg,position:"relative",zIndex:2,
transform:`translateX(${swipeId===coin.id?swipeX:0}px)`,transition:touchStart?"none":"transform 0.3s ease"}}>
<div onClick={()=>{if(swipeId){resetSwipe();return}setInfoCoin(coin);setScreen("coinInfo")}} style={{display:"flex",alignItems:"center",gap:11,flex:1,minWidth:0,cursor:"pointer"}}>
<CI thumb={coin.thumb} symbol={coin.symbol}/>
<div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{coin.name}</div><div style={{fontSize:11,color:c.dim,marginTop:1}}>{coin.symbol} · {h>0?h.toLocaleString("en-US",{maximumFractionDigits:6}):"0"} held</div></div>
</div>
<div onClick={()=>{if(swipeId){resetSwipe();return}setSel(coin);setScreen("detail")}} style={{textAlign:"right",cursor:"pointer",padding:"4px 0 4px 12px"}}>
{v>0?<div style={{fontSize:15,fontWeight:700}}>${v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>:<div style={{fontSize:14,fontWeight:600,color:c.dim}}>$0.00</div>}
<div style={{fontSize:11,color:c.dim,marginTop:1}}>{fmtP(pr)}</div>
<div style={{fontSize:10,fontWeight:500,color:ch>=0?c.ac:c.red}}>{fmtPct(ch)}</div>
</div></div></div>)})}
  </>);
}
