import { useState } from "react";
import { useApp } from "../hooks/app-context.js";
import { Ic } from "./ui.jsx";

// Login/Register screen + the post-registration plan picker and the upgrade/billing
// flow (shown via showPlan — reused as a full-screen overlay from the shell too).
// All auth + upgrade state and handlers come from context.
// Restyled to the .ci-app design system; all data/handlers are unchanged. (The auth-
// error color is kept inline as #FF3B30 — Login.test asserts that exact value.)
export function Login() {
  const {
    showPlan, showWelcome, upgradeStep, setUpgradeStep, upgradeFlow, setUpgradeFlow,
    setShowPlan, setShowWelcome, upgradeBilling, setUpgradeBilling, user, setUser,
    saveProfile, persistTierDev, calcEndDate, setScreen, authMode, setAuthMode, authErr, setAuthErr,
    authName, setAuthName, authEmail, setAuthEmail, authPass, setAuthPass, handleAuth, site,
    authAgreeTerms, setAuthAgreeTerms, authAgreePrivacy, setAuthAgreePrivacy,
    authAgreeMarketing, setAuthAgreeMarketing,
  } = useApp();
  const [showPass,setShowPass]=useState(false);
  if(showPlan){
    const tierLabel={free:"Starter",pro:"Pro",premium:"Premium"}[showWelcome||"free"];

    // ── Welcome screens (after payment or registration) ──
    if(upgradeStep==="welcome"){
      const benefits={
        free:["1 portfolio","10 coins","50 transactions per coin","Live prices · Full P/L tracking"],
        pro:["3 portfolios","50 coins per portfolio","2,000 transactions per coin","Live prices · Full P/L tracking"],
        premium:["15 portfolios","1,000 coins per portfolio","5,000 transactions per coin","Priority support · Custom limits"],
      };
      const list=benefits[showWelcome||"free"];
      const isPrem=showWelcome==="premium";
      return(<div className="ci-app screen-bg auth-wrap">
        <div className={"welcome-check"+(isPrem?" prem":"")}>✓</div>
        <div className="welcome-h">Welcome to <span style={{fontWeight:700,color:isPrem?"#7d4bbf":"var(--accent)"}}>{tierLabel}.</span></div>
        <div className="welcome-list">{list.map((b,i)=>(<div key={i}>{b}</div>))}</div>
        <button onClick={()=>{const wasInAccount=user&&user.tier!=="free"&&showWelcome!=="free";setShowPlan(false);setUpgradeStep("billing");setUpgradeFlow(null);setShowWelcome(null);setScreen(wasInAccount?"account":"portfolio")}} className="btn-primary" style={{maxWidth:320}}>Open {showWelcome==="free"?"My Portfolio":"My Account"}</button>
      </div>);
    }

    // ── Processing payment ──
    if(upgradeStep==="processing")return(<div className="ci-app screen-bg auth-wrap">
      <div className="proc-h">Processing...</div>
      <div className="proc-sub">Completing your payment with PayPal</div>
    </div>);

    // ── Billing confirmation (works for both Pro and Premium) ──
    if(upgradeStep==="billing"&&upgradeFlow){
      const isPrem=upgradeFlow==="premium";
      const _pl=(site&&site.plans&&site.plans[upgradeFlow])||{};
      const monthlyP=_pl.price!=null?_pl.price:(isPrem?49.99:9.99);
      const yearlyP=_pl.priceYear!=null?_pl.priceYear:(isPrem?499.99:99.99);
      const yearlyM=(yearlyP/12).toFixed(2);
      const savePct=monthlyP>0?Math.round((1-yearlyP/(monthlyP*12))*100):0;
      const accentClr=isPrem?"#7d4bbf":"var(--accent)";
      return(<div className="ci-app screen-bg auth-wrap">
        <div className="auth-h">Upgrade to <span style={{color:accentClr}}>{isPrem?"Premium":"Pro"}</span></div>
        <div className="auth-sub">Select your billing cycle</div>
        <div className="plan-col">
          <div onClick={()=>setUpgradeBilling("monthly")} className={"cycle-card"+(upgradeBilling==="monthly"?" on":"")+(isPrem?" prem":"")}>
            <div><div className="cycle-name">Monthly</div><div className="cycle-sub">Billed every month</div></div>
            <div className="cycle-price">${monthlyP}<span className="cycle-per">/mo</span></div>
          </div>
          <div onClick={()=>setUpgradeBilling("yearly")} className={"cycle-card"+(upgradeBilling==="yearly"?" on":"")+(isPrem?" prem":"")}>
            <div className="cycle-save" style={{background:accentClr}}>{savePct>0?`SAVE ${savePct}%`:"BEST VALUE"}</div>
            <div><div className="cycle-name">Yearly</div><div className="cycle-sub">${yearlyM}/mo · billed annually</div></div>
            <div className="cycle-price">${yearlyP}<span className="cycle-per">/yr</span></div>
          </div>
          <button onClick={async()=>{
            setUpgradeStep("processing");
            setTimeout(async()=>{
              const newTier=upgradeFlow;
              const endDate=calcEndDate(upgradeBilling);
              const updated={...user,tier:newTier,subscription:{billing:upgradeBilling,startDate:new Date().toISOString(),endDate,cancelled:false}};
              setUser(updated);
              await saveProfile(updated);
              // DEV (Round 17): persist the tier to the DB so the portfolio cap becomes
              // real locally (no PayPal webhook in the emulator). No-op in prod builds.
              await persistTierDev(newTier);
              setShowWelcome(newTier);
              setUpgradeStep("welcome");
            },2000);
          }} className="paypal-btn">
            Pay with <span style={{fontStyle:"italic",fontWeight:800}}>Pay<span style={{color:"#253B80"}}>Pal</span></span>
          </button>
          <button onClick={()=>{setUpgradeFlow(null);setUpgradeStep("pickPlan")}} className="back-link">← Back to plans</button>
        </div>
      </div>);
    }

    // ── Pick plan (after registration) ──
    return(<div className="ci-app screen-bg auth-wrap">
      <div className="auth-h">Welcome, <span>{user?.name}</span></div>
      <div className="auth-sub">Select a plan</div>
      <div className="plan-col">
        <div onClick={async()=>{setShowWelcome("free");setUpgradeStep("welcome")}} className="plan-card">
          <div className="plan-top"><span className="plan-name">Starter</span><span className="plan-price">$0</span></div>
          <div className="plan-feats">1 portfolio · 10 coins · 50 transactions per coin</div>
          <div className="plan-cta neutral">Get Started</div>
        </div>
        <div onClick={()=>{setUpgradeFlow("pro");setUpgradeStep("billing")}} className="plan-card rec">
          <div className="plan-badge">RECOMMENDED</div>
          <div className="plan-top"><span className="plan-name">Pro</span><span className="plan-price-sm">from ${((site?.plans?.pro?.priceYear ?? 99.99)/12).toFixed(2)}/mo</span></div>
          <div className="plan-feats">3 portfolios · 50 coins · 2,000 transactions per coin</div>
          <div className="plan-cta accent">Choose Pro</div>
        </div>
        <div onClick={()=>{setUpgradeFlow("premium");setUpgradeStep("billing")}} className="plan-card prem">
          <div className="plan-top"><span className="plan-name prem">Premium</span><span className="plan-price-sm">from ${((site?.plans?.premium?.priceYear ?? 499.99)/12).toFixed(2)}/mo</span></div>
          <div className="plan-feats">15 portfolios · 1,000 coins · 5,000 transactions per coin</div>
          <div className="plan-cta prem">Choose Premium</div>
        </div>
      </div>
      <div className="auth-link" style={{marginTop:14}}><span onClick={()=>{setShowPlan(false);setUpgradeStep("billing");setScreen("portfolio")}}>Skip for now · explore Starter →</span></div>
    </div>);
  }
  return(<div className="ci-app screen-bg auth-wrap">
    <div className="auth-logo">Crypto <span>Idea</span></div>
    <div className="auth-tagline">Know why you own every coin.</div>
    <form className="auth-col" onSubmit={e=>{e.preventDefault();handleAuth();}}>
      <div className="auth-toggle">
        <button type="button" onClick={()=>{setAuthMode("login");setAuthErr("")}} className={authMode==="login"?"on":""}>Log in</button>
        <button type="button" disabled={!site.signupsEnabled} onClick={()=>{if(!site.signupsEnabled)return;setAuthMode("register");setAuthErr("")}} title={site.signupsEnabled?"":"Signups are paused"} className={authMode==="register"?"on":""}>Register</button>
      </div>
      {!site.signupsEnabled&&<div className="auth-note">New signups are paused right now.</div>}
      {authMode==="register"&&<input type="text" value={authName} onChange={e=>setAuthName(e.target.value.replace(/[^a-zA-Z\s]/g,""))} placeholder="First and last name" autoComplete="name" className="field-input"/>}
      <input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" inputMode="email" className="field-input"/>
      <div className="pw-wrap">
        <input type={showPass?"text":"password"} value={authPass} onChange={e=>setAuthPass(e.target.value)} placeholder="Min 8: Aa1 + special (!@#)" autoComplete={authMode==="login"?"current-password":"new-password"} className="field-input"/>
        <button type="button" className="pw-eye" onClick={()=>setShowPass(s=>!s)} aria-label={showPass?"Hide password":"Show password"}>{showPass?Ic.eyeOff:Ic.eye}</button>
      </div>
      {authMode==="register"&&(
        <div className="auth-consent">
          <label className="consent-row">
            <input type="checkbox" checked={!!authAgreeTerms} onChange={e=>setAuthAgreeTerms(e.target.checked)}/>
            <span>I agree to the <a href="/terms.html" target="_blank" rel="noopener noreferrer">Terms of Service</a></span>
          </label>
          <label className="consent-row">
            <input type="checkbox" checked={!!authAgreePrivacy} onChange={e=>setAuthAgreePrivacy(e.target.checked)}/>
            <span>I have read the <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a></span>
          </label>
          <label className="consent-row">
            <input type="checkbox" checked={!!authAgreeMarketing} onChange={e=>setAuthAgreeMarketing(e.target.checked)}/>
            <span>Email me product updates &amp; offers <span className="consent-opt">(optional)</span></span>
          </label>
        </div>
      )}
      {authErr&&<div className="auth-err" style={{color:"#FF3B30"}}>{authErr}</div>}
      <button type="submit" className="btn-primary">{authMode==="login"?"Log in":"Create Account"}</button>
      {authMode==="login"&&<div className="auth-link"><span onClick={()=>setScreen("forgotPass")}>Forgot password?</span></div>}
    </form>
  </div>);
}
