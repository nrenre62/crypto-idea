import { useApp } from "../hooks/app-context.js";
import { c, inp_s } from "../utils/theme.js";

// Login/Register screen + the post-registration plan picker and the upgrade/billing
// flow (shown via showPlan — reused as a full-screen overlay from the shell too).
// All auth + upgrade state and handlers come from context.
export function Login() {
  const {
    showPlan, showWelcome, upgradeStep, setUpgradeStep, upgradeFlow, setUpgradeFlow,
    setShowPlan, setShowWelcome, upgradeBilling, setUpgradeBilling, user, setUser,
    saveProfile, calcEndDate, setScreen, authMode, setAuthMode, authErr, setAuthErr,
    authName, setAuthName, authEmail, setAuthEmail, authPass, setAuthPass, handleAuth, site,
  } = useApp();
  if(showPlan){
    const tierLabel={free:"Starter",pro:"Pro",premium:"Premium"}[showWelcome||"free"];
    const tierColor=showWelcome==="premium"?"#AF52DE":c.ac;
    const tierBg=showWelcome==="premium"?"#AF52DE15":c.acd;

    // ── Welcome screens (after payment or registration) ──
    if(upgradeStep==="welcome"){
      const benefits={
        free:["1 portfolio","10 coins","50 transactions per coin","Live prices · Full P/L tracking"],
        pro:["10 portfolios","200 coins per portfolio","2,000 transactions per coin","Live prices · Full P/L tracking"],
        premium:["50 portfolios","500 coins per portfolio","5,000 transactions per coin","Priority support · Custom limits"],
      };
      const list=benefits[showWelcome||"free"];
      return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
        <div style={{width:64,height:64,borderRadius:32,background:tierBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:24}}>✓</div>
        <div style={{fontSize:28,fontWeight:200,letterSpacing:"-0.5px",marginBottom:8,textAlign:"center"}}>Welcome to <span style={{fontWeight:700,color:tierColor}}>{tierLabel}.</span></div>
        <div style={{fontSize:14,color:c.dim,lineHeight:1.8,textAlign:"center",maxWidth:300,marginBottom:32}}>{list.map((b,i)=>(<div key={i}>{b}</div>))}</div>
        <button onClick={()=>{const wasInAccount=user&&user.tier!=="free"&&showWelcome!=="free";setShowPlan(false);setUpgradeStep("billing");setUpgradeFlow(null);setShowWelcome(null);setScreen(wasInAccount?"account":"portfolio")}} style={{padding:"14px 40px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Open {showWelcome==="free"?"My Portfolio":"My Account"}</button>
      </div>);
    }

    // ── Processing payment ──
    if(upgradeStep==="processing")return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
      <div style={{fontSize:28,fontWeight:200,letterSpacing:"-0.5px",marginBottom:12}}>Processing...</div>
      <div style={{fontSize:13,color:c.dim}}>Completing your payment with PayPal</div>
    </div>);

    // ── Billing confirmation (works for both Pro and Premium) ──
    if(upgradeStep==="billing"&&upgradeFlow){
      const isPrem=upgradeFlow==="premium";
      const monthlyP=isPrem?49.99:9.99;
      const yearlyP=isPrem?399.99:79.99;
      const yearlyM=(yearlyP/12).toFixed(2);
      const accent=isPrem?"#AF52DE":c.ac;
      const accentBg=isPrem?"#AF52DE15":c.acd;
      return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
        <div style={{fontSize:28,fontWeight:200,letterSpacing:"-0.5px",marginBottom:4,textAlign:"center"}}>Upgrade to <span style={{fontWeight:700,color:accent}}>{isPrem?"Premium":"Pro"}</span></div>
        <div style={{fontSize:14,color:c.dim,marginBottom:28}}>Select your billing cycle</div>
        <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:12}}>
          <div onClick={()=>setUpgradeBilling("monthly")} style={{padding:"18px 20px",borderRadius:14,border:upgradeBilling==="monthly"?"2px solid "+accent:"1px solid #E8E8ED",background:upgradeBilling==="monthly"?accentBg:"#fff",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:15,fontWeight:700}}>Monthly</div><div style={{fontSize:12,color:c.dim,marginTop:2}}>Billed every month</div></div>
            <div style={{fontSize:22,fontWeight:800}}>${monthlyP}<span style={{fontSize:11,fontWeight:400,color:c.dim}}>/mo</span></div>
          </div>
          <div onClick={()=>setUpgradeBilling("yearly")} style={{padding:"18px 20px",borderRadius:14,border:upgradeBilling==="yearly"?"2px solid "+accent:"1px solid #E8E8ED",background:upgradeBilling==="yearly"?accentBg:"#fff",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative"}}>
            <div style={{position:"absolute",top:-9,right:16,background:accent,color:"#fff",padding:"2px 10px",borderRadius:20,fontSize:9,fontWeight:700}}>SAVE 33%</div>
            <div><div style={{fontSize:15,fontWeight:700}}>Yearly</div><div style={{fontSize:12,color:c.dim,marginTop:2}}>${yearlyM}/mo · billed annually</div></div>
            <div style={{fontSize:22,fontWeight:800}}>${yearlyP}<span style={{fontSize:11,fontWeight:400,color:c.dim}}>/yr</span></div>
          </div>
          <button onClick={async()=>{
            setUpgradeStep("processing");
            setTimeout(async()=>{
              const newTier=upgradeFlow;
              const endDate=calcEndDate(upgradeBilling);
              const updated={...user,tier:newTier,subscription:{billing:upgradeBilling,startDate:new Date().toISOString(),endDate,cancelled:false}};
              setUser(updated);
              await saveProfile(updated);
              setShowWelcome(newTier);
              setUpgradeStep("welcome");
            },2000);
          }} style={{padding:"15px",borderRadius:14,border:"none",background:"#FFC439",color:"#111",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:4}}>
            Pay with <span style={{fontStyle:"italic",fontWeight:800}}>Pay<span style={{color:"#253B80"}}>Pal</span></span>
          </button>
          <button onClick={()=>{setUpgradeFlow(null);setUpgradeStep("pickPlan")}} style={{padding:"12px",background:"none",border:"none",fontSize:13,color:c.dim,cursor:"pointer",fontWeight:500}}>← Back to plans</button>
        </div>
      </div>);
    }

    // ── Pick plan (after registration) ──
    return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
    <div style={{fontSize:28,fontWeight:200,letterSpacing:"-0.5px",marginBottom:4}}>Welcome, <span style={{fontWeight:700}}>{user?.name}</span></div>
    <div style={{fontSize:14,color:c.dim,marginBottom:24}}>Select a plan</div>
    <div style={{width:"100%",maxWidth:340,display:"flex",flexDirection:"column",gap:12}}>
      <div onClick={async()=>{setShowWelcome("free");setUpgradeStep("welcome")}} style={{background:"#fff",borderRadius:18,padding:"20px",border:"1px solid #E8E8ED",cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:16,fontWeight:700}}>Starter</span><span style={{fontSize:20,fontWeight:800}}>$0</span></div>
        <div style={{fontSize:11,color:c.dim,lineHeight:1.6}}>1 portfolio · 10 coins · 50 transactions per coin</div>
        <div style={{marginTop:12,padding:"11px",borderRadius:12,background:"#F5F5F7",textAlign:"center",fontSize:13,fontWeight:600,color:c.txt}}>Get Started</div>
      </div>
      <div onClick={()=>{setUpgradeFlow("pro");setUpgradeStep("billing")}} style={{background:"#fff",borderRadius:18,padding:"20px",border:"2px solid "+c.ac,cursor:"pointer",position:"relative"}}>
        <div style={{position:"absolute",top:"-10px",left:"50%",transform:"translateX(-50%)",background:c.ac,color:"#fff",padding:"3px 14px",borderRadius:20,fontSize:9,fontWeight:700}}>RECOMMENDED</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:16,fontWeight:700}}>Pro</span><span style={{fontSize:13,color:c.dim}}>from $6.67/mo</span></div>
        <div style={{fontSize:11,color:c.dim,lineHeight:1.6}}>10 portfolios · 200 coins · 2,000 transactions per coin</div>
        <div style={{marginTop:12,padding:"11px",borderRadius:12,background:c.ac,textAlign:"center",fontSize:13,fontWeight:600,color:"#fff"}}>Choose Pro</div>
      </div>
      <div onClick={()=>{setUpgradeFlow("premium");setUpgradeStep("billing")}} style={{background:"#fff",borderRadius:18,padding:"20px",border:"1px solid #AF52DE",cursor:"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><span style={{fontSize:16,fontWeight:700,color:"#AF52DE"}}>Premium</span><span style={{fontSize:13,color:c.dim}}>from $33.33/mo</span></div>
        <div style={{fontSize:11,color:c.dim,lineHeight:1.6}}>50 portfolios · 500 coins · 5,000 transactions per coin</div>
        <div style={{marginTop:12,padding:"11px",borderRadius:12,background:"#AF52DE",textAlign:"center",fontSize:13,fontWeight:600,color:"#fff"}}>Choose Premium</div>
      </div>
    </div>
  </div>);}
  return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
    <div style={{fontSize:32,fontWeight:200,letterSpacing:"-1px",marginBottom:4}}>Crypto <span style={{fontWeight:700}}>Idea</span></div>
    <div style={{fontSize:13,color:c.dim,marginBottom:36}}>Track your investments. Plan your next move.</div>
    <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:0,borderRadius:14,overflow:"hidden",border:"1px solid #E8E8ED"}}>
        <button onClick={()=>{setAuthMode("login");setAuthErr("")}} style={{flex:1,padding:"11px",border:"none",fontSize:14,fontWeight:600,cursor:"pointer",background:authMode==="login"?c.txt:"#F5F5F7",color:authMode==="login"?"#fff":c.dim}}>Login</button>
        <button disabled={!site.signupsEnabled} onClick={()=>{if(!site.signupsEnabled)return;setAuthMode("register");setAuthErr("")}} title={site.signupsEnabled?"":"Signups are paused"} style={{flex:1,padding:"11px",border:"none",fontSize:14,fontWeight:600,cursor:site.signupsEnabled?"pointer":"not-allowed",background:authMode==="register"?c.txt:"#F5F5F7",color:authMode==="register"?"#fff":c.dim,opacity:site.signupsEnabled?1:0.5}}>Register</button>
      </div>
      {!site.signupsEnabled&&<div style={{fontSize:11,color:c.dim,textAlign:"center"}}>New signups are paused right now.</div>}
      {authMode==="register"&&<input type="text" value={authName} onChange={e=>setAuthName(e.target.value.replace(/[^a-zA-Z\s]/g,""))} placeholder="First and last name" autoComplete="name" style={inp_s}/>}
      <input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="name@email.com" autoComplete="email" inputMode="email" style={inp_s}/>
      <input type="password" value={authPass} onChange={e=>setAuthPass(e.target.value)} placeholder="Min 8: Aa1 + special (!@#)" autoComplete={authMode==="login"?"current-password":"new-password"} style={inp_s}/>
      {authErr&&<div style={{padding:"10px",background:"#FFF0F0",color:c.red,borderRadius:10,fontSize:12,textAlign:"center"}}>{authErr}</div>}
      <button onClick={handleAuth} style={{padding:"14px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff",marginTop:4}}>{authMode==="login"?"Login":"Create Account"}</button>
      {authMode==="login"&&<div style={{textAlign:"center",marginTop:8}}><span onClick={()=>setScreen("forgotPass")} style={{fontSize:12,color:c.ac,cursor:"pointer",fontWeight:500}}>Forgot password?</span></div>}
    </div>
  </div>);
}
