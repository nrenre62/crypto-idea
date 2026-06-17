import { useApp } from "../hooks/app-context.js";
import { c, inp_s } from "../utils/theme.js";
import { Ic } from "./ui.jsx";

// Account screen: profile, plan-usage bars, subscription status, portfolio manager,
// GDPR privacy actions, and logout. All state + handlers come from context.
export function Account() {
  const {
    setScreen, user, isPremium, isPro, portfolios, maxPortfolios, maxCoinsPerPort,
    maxTxPerCoin, portfolio, startUpgrade, startDowngrade, fmtDate, setActivePortId,
    activePortId, deletePortfolio, newPortName, setNewPortName, addPortfolio,
    downloadMyData, downloadCsv, acctBusy, deleteMyAccount, delConfirm, setDelConfirm, acctMsg, logout,
  } = useApp();
  return (<div>
    <div style={{padding:"14px 18px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <button onClick={()=>setScreen("portfolio")} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button>
      <span style={{fontSize:17,fontWeight:600}}>Account</span>
      <div style={{width:24}}/>
    </div>

    <div style={{padding:"20px 18px",textAlign:"center"}}>
      <div style={{width:60,height:60,borderRadius:30,background:c.card,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:600,color:c.dim,margin:"0 auto 10px"}}>{(user?.name||"U").charAt(0).toUpperCase()}</div>
      <div style={{fontSize:18,fontWeight:600}}>{user?.name}</div>
      <div style={{fontSize:13,color:c.dim}}>{user?.email}</div>
      <div style={{display:"inline-flex",padding:"4px 14px",borderRadius:20,background:isPremium?"#AF52DE15":isPro?c.acd:c.yeld,marginTop:8}}>
        <span style={{fontSize:12,fontWeight:700,color:isPremium?"#AF52DE":isPro?c.ac:c.yel}}>{isPremium?"PREMIUM":isPro?"PRO":"STARTER"}</span>
      </div>
    </div>

    {(() => {
      const totalTxAllPorts = portfolios.reduce((s,p) => s + p.coins.reduce((cs,c) => cs + (c.entries?.length || 0), 0), 0);
      const maxTotalTx = maxPortfolios * maxCoinsPerPort * maxTxPerCoin;
      const portPct = Math.min(100, (portfolios.length / maxPortfolios) * 100);
      const coinPct = portfolio.length > 0 ? Math.min(100, (portfolio.length / maxCoinsPerPort) * 100) : 0;
      const txPct = Math.min(100, (totalTxAllPorts / maxTotalTx) * 100);
      const barColor = (pct) => pct >= 90 ? c.red : pct >= 70 ? c.yel : c.ac;
      const Bar = ({pct}) => (
        <div style={{height:5,background:"#F0F0F0",borderRadius:3,overflow:"hidden",marginTop:5}}>
          <div style={{width:pct+"%",height:"100%",background:barColor(pct),borderRadius:3,transition:"width 0.3s"}}/>
        </div>
      );
      return (
    <div style={{margin:"0 18px",padding:"16px",background:c.card,borderRadius:16}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:14}}>Your Plan Usage</div>

      <div style={{padding:"10px 0",borderBottom:"1px solid #F0F0F0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,color:c.dim}}>Portfolios</span>
          <span style={{fontSize:13,fontWeight:600}}>{portfolios.length} / {maxPortfolios}</span>
        </div>
        <Bar pct={portPct}/>
      </div>

      <div style={{padding:"10px 0",borderBottom:"1px solid #F0F0F0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,color:c.dim}}>Coins in active portfolio</span>
          <span style={{fontSize:13,fontWeight:600}}>{portfolio.length} / {maxCoinsPerPort}</span>
        </div>
        <Bar pct={coinPct}/>
      </div>

      <div style={{padding:"10px 0",borderBottom:"1px solid #F0F0F0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:13,color:c.dim}}>Total transactions</span>
          <span style={{fontSize:13,fontWeight:600}}>{totalTxAllPorts.toLocaleString()} / {maxTotalTx.toLocaleString()}</span>
        </div>
        <Bar pct={txPct}/>
        <div style={{fontSize:10,color:c.dim,marginTop:4}}>Up to {maxTxPerCoin.toLocaleString()} per coin</div>
      </div>

      <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0"}}>
        <span style={{fontSize:13,color:c.dim}}>Joined</span>
        <span style={{fontSize:13,fontWeight:600}}>{user?.joined}</span>
      </div>

      {/* Active subscription — show renewal date */}
      {isPro&&user?.subscription?.endDate&&!user?.subscription?.cancelled&&!user?.subscription?.paymentFailed&&(
        <div style={{marginTop:10,padding:"10px 12px",borderRadius:10,background:c.acd,fontSize:11,color:c.ac,textAlign:"center",fontWeight:600,lineHeight:1.5}}>
          Your {user.tier==="premium"?"Premium":"Pro"} subscription renews on<br/>{fmtDate(user.subscription.endDate)}
        </div>
      )}

      {/* Payment failed — 7-day grace period */}
      {user?.subscription?.paymentFailed&&user?.subscription?.paymentFailedDate&&(()=>{
        const failed=new Date(user.subscription.paymentFailedDate);
        const daysLeft=Math.max(0,7-Math.floor((new Date()-failed)/(1000*60*60*24)));
        return(
          <div style={{marginTop:10,padding:"12px 14px",borderRadius:10,background:"#FFF0F0",border:"1px solid #FFD0D0",textAlign:"center"}}>
            <div style={{fontSize:11,fontWeight:700,color:c.red,marginBottom:4}}>⚠ PAYMENT FAILED</div>
            <div style={{fontSize:12,color:c.red,fontWeight:600,lineHeight:1.5,marginBottom:8}}>
              Your account will downgrade to Starter in <strong>{daysLeft} day{daysLeft!==1?"s":""}</strong>
            </div>
            <div style={{fontSize:11,color:c.dim,lineHeight:1.5}}>
              Update your payment method to keep your {user.tier==="premium"?"Premium":"Pro"} access
            </div>
          </div>
        );
      })()}

      {/* Cancelled subscription — show end date */}
      {user?.subscription?.cancelled&&user?.subscription?.endDate&&(
        <div style={{marginTop:10,padding:"10px 12px",borderRadius:10,background:"#FFF0F0",fontSize:11,color:c.red,textAlign:"center",fontWeight:600,lineHeight:1.5}}>
          Your {user.tier==="premium"?"Premium":"Pro"} access ends on<br/>{fmtDate(user.subscription.endDate)}<br/>
          <span style={{fontWeight:400,color:c.dim}}>Then your account will become {user.subscription.downgradeTo==="free"?"Starter":"Pro"}</span>
        </div>
      )}

      {!isPro&&<button onClick={()=>startUpgrade("pro")} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:c.ac,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:10}}>Upgrade to Pro</button>}
      {isPro&&!isPremium&&<button onClick={()=>startUpgrade("premium")} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:"#AF52DE",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:10}}>Upgrade to Premium</button>}
      {isPro&&!isPremium&&!user?.subscription?.cancelled&&<button onClick={()=>startDowngrade("free")} style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid #E8E8ED",background:"#fff",color:c.dim,fontSize:13,fontWeight:600,cursor:"pointer",marginTop:8}}>Cancel Pro · Switch to Starter</button>}
      {isPremium&&!user?.subscription?.cancelled&&<button onClick={()=>startDowngrade("pro")} style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid #E8E8ED",background:"#fff",color:c.dim,fontSize:13,fontWeight:600,cursor:"pointer",marginTop:8}}>Downgrade to Pro</button>}
    </div>
      );
    })()}

    {/* Portfolio Manager */}
    <div style={{margin:"12px 18px",padding:"16px",background:c.card,borderRadius:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:13,fontWeight:600}}>Portfolios ({portfolios.length}/{maxPortfolios})</span>
      </div>
      {portfolios.map(p=>(
        <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #F0F0F0"}}>
          <div onClick={()=>{setActivePortId(p.id);setScreen("portfolio")}} style={{cursor:"pointer",flex:1}}>
            <div style={{fontSize:14,fontWeight:p.id===activePortId?700:500,color:p.id===activePortId?c.ac:c.txt}}>{p.name}</div>
            <div style={{fontSize:11,color:c.dim}}>{p.coins.length} coins{p.id===activePortId?" · Active":""}</div>
          </div>
          {portfolios.length>1&&<button onClick={()=>deletePortfolio(p.id)} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>{Ic.trash}</button>}
        </div>
      ))}

      <div style={{display:"flex",gap:8,marginTop:12}}>
        <input type="text" value={newPortName} onChange={e=>setNewPortName(e.target.value)} placeholder="New portfolio name" style={{...inp_s,flex:1}}/>
        <button onClick={addPortfolio} style={{padding:"10px 16px",borderRadius:12,border:"none",background:c.txt,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>+ Add</button>
      </div>
    </div>

    {/* Admin lives in a separate app at /admin (admin.html) — intentionally not in the user app. */}

    {/* Privacy & your data (GDPR/CCPA self-service) */}
    <div style={{margin:"12px 18px",padding:"16px",background:c.card,borderRadius:16,border:"1px solid #E8E8ED"}}>
      <div style={{fontSize:13,fontWeight:700,marginBottom:4}}>Privacy & your data</div>
      <div style={{fontSize:11,color:c.dim,marginBottom:12,lineHeight:1.5}}>Download your portfolio as a spreadsheet (CSV) — your coin list, how much you hold, and every transaction. Or export everything we hold (JSON), or permanently delete your account.</div>
      <button onClick={downloadCsv} disabled={acctBusy} style={{width:"100%",padding:"11px",borderRadius:12,border:"none",background:c.txt,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:8}}>{acctBusy?"…":"Download CSV (spreadsheet)"}</button>
      <button onClick={downloadMyData} disabled={acctBusy} style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid #E8E8ED",background:"#fff",color:c.txt,fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:8}}>{acctBusy?"…":"Download all my data (JSON)"}</button>
      {delConfirm?(
        <button onClick={deleteMyAccount} disabled={acctBusy} style={{width:"100%",padding:"11px",borderRadius:12,border:"none",background:c.red,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Yes, permanently delete my account</button>
      ):(
        <button onClick={()=>setDelConfirm(true)} disabled={acctBusy} style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid "+c.red,background:c.redd,color:c.red,fontSize:13,fontWeight:600,cursor:"pointer"}}>Delete my account</button>
      )}
      {acctMsg&&<div style={{textAlign:"center",marginTop:10,fontSize:12,color:c.dim,fontWeight:600}}>{acctMsg}</div>}
      <div style={{fontSize:11,marginTop:12,textAlign:"center"}}>
        <a href="/privacy.html" style={{color:c.ac,textDecoration:"none"}}>Privacy Policy</a> · <a href="/terms.html" style={{color:c.ac,textDecoration:"none"}}>Terms</a>
      </div>
    </div>

    <div style={{padding:"20px 18px"}}>
      <button onClick={logout} style={{width:"100%",padding:"13px",borderRadius:12,border:"1px solid "+c.red,background:c.redd,color:c.red,fontSize:14,fontWeight:600,cursor:"pointer"}}>Logout</button>
    </div>
  </div>);
}
