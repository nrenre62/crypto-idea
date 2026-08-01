import { useState } from "react";
import { useApp } from "../hooks/app-context.js";
import { Ic, Logo } from "./ui.jsx";

// R28-2: ONE source of truth for what each tier promises — consumed by BOTH the
// plan-picker cards and the welcome/success screen, so they cannot drift. Honest
// framing: same product, more room — every tier gets all features (live prices,
// P/L, Journal, Research, Learn); tiers differ by capacity, and Premium adds the
// real priority-email-support promise (the untrue "Custom limits" was dropped).
export const PLAN_BENEFITS = {
  free: {
    limits: ["1 portfolio", "10 coins", "50 transactions per coin"],
    feature: "All features included — live prices, P/L, Journal, Research, Learn",
  },
  pro: {
    limits: ["3 portfolios", "50 coins per portfolio", "2,000 transactions per coin"],
    feature: "All features included — live prices, P/L, Journal, Research, Learn",
  },
  premium: {
    limits: ["15 portfolios", "1,000 coins per portfolio", "5,000 transactions per coin"],
    feature: "All features included + priority email support",
  },
};
// R28-1: tier order for the picker's current/upgrade/included card states.
const TIER_RANK = { free: 0, pro: 1, premium: 2 };

// Login/Register screen + the post-registration plan picker and the upgrade/billing
// flow (shown via showPlan — reused as a full-screen overlay from the shell too).
// All auth + upgrade state and handlers come from context.
// R27-3: `popup` renders the showPlan sub-steps BODY-ONLY for the desktop <Modal>
// wrapper (the Modal head carries the title + X, so the full-height auth-wrap and the
// in-content .auth-h are dropped). Mobile keeps the full-screen markup unchanged.
// Restyled to the .ci-app design system; all data/handlers are unchanged. (The auth-
// error color is kept inline as #FF3B30 — Login.test asserts that exact value.)
export function Login({ popup }) {
  const {
    showPlan, showWelcome, upgradeStep, setUpgradeStep, upgradeFlow, setUpgradeFlow,
    setShowPlan, setShowWelcome, upgradeBilling, setUpgradeBilling, user, setUser,
    saveProfile, persistTierDev, calcEndDate, setScreen, authMode, setAuthMode, authErr, setAuthErr,
    authName, setAuthName, authEmail, setAuthEmail, authPass, setAuthPass, handleAuth, site,
    authAgreeTerms, setAuthAgreeTerms, authAgreePrivacy, setAuthAgreePrivacy,
    authAgreeMarketing, setAuthAgreeMarketing, planChosen, markPlanChosen,
  } = useApp();
  const [showPass,setShowPass]=useState(false);
  // R31-1: only render the plan picker/upgrade flow for a LIVE session. If the
  // session died mid-flow (e.g. a token revoke), `showPlan` may still be true for a
  // tick before the overlay is cleared — without this guard the picker would paint
  // "Welcome, " with an empty name (ERRORS §A5). No user → fall through to the login form.
  if(showPlan&&user){
    const tierLabel={free:"Starter",pro:"Pro",premium:"Premium"}[showWelcome||"free"];
    // R27-3: popup = centered body inside the Modal; full-screen wrapper otherwise.
    const wrap=(kids)=>popup
      ?<div className="plan-pop">{kids}</div>
      :<div className="ci-app screen-bg auth-wrap">{kids}</div>;

    // ── Welcome screens (after payment or registration) ──
    if(upgradeStep==="welcome"){
      // R28-2: the success screen lists EXACTLY what the card promised (same source).
      const b=PLAN_BENEFITS[showWelcome||"free"];
      const list=[...b.limits,b.feature];
      const isPrem=showWelcome==="premium";
      return wrap(<>
        <div className={"welcome-check"+(isPrem?" prem":"")}>✓</div>
        <div className="welcome-h">Welcome to <span style={{fontWeight:700,color:isPrem?"#7d4bbf":"var(--accent)"}}>{tierLabel}.</span></div>
        <div className="welcome-list">{list.map((b,i)=>(<div key={i}>{b}</div>))}</div>
        <button onClick={()=>{const wasInAccount=user&&user.tier!=="free"&&showWelcome!=="free";setShowPlan(false);setUpgradeStep("billing");setUpgradeFlow(null);setShowWelcome(null);setScreen(wasInAccount?"account":"portfolio")}} className="btn-primary" style={{maxWidth:320}}>Open {showWelcome==="free"?"My Portfolio":"My Account"}</button>
      </>);
    }

    // ── Processing payment ──
    if(upgradeStep==="processing")return wrap(<>
      <div className="proc-h">Processing...</div>
      <div className="proc-sub">Completing your payment with PayPal</div>
    </>);

    // ── Billing confirmation (works for both Pro and Premium) ──
    if(upgradeStep==="billing"&&upgradeFlow){
      const isPrem=upgradeFlow==="premium";
      const _pl=(site&&site.plans&&site.plans[upgradeFlow])||{};
      const monthlyP=_pl.price!=null?_pl.price:(isPrem?49.99:9.99);
      const yearlyP=_pl.priceYear!=null?_pl.priceYear:(isPrem?499.99:99.99);
      const yearlyM=(yearlyP/12).toFixed(2);
      const savePct=monthlyP>0?Math.round((1-yearlyP/(monthlyP*12))*100):0;
      const accentClr=isPrem?"#7d4bbf":"var(--accent)";
      return wrap(<>
        {!popup&&<div className="auth-h">Upgrade to <span style={{color:accentClr}}>{isPrem?"Premium":"Pro"}</span></div>}
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
              // DI-4 (D3): no trim — an UPGRADE only raises caps (existing data already
              // fits and simply unlocks), and downgrades keep + grey-lock data, never delete it.
              // R31-2: a completed paid choice also counts as an explicit plan choice.
              if(markPlanChosen)markPlanChosen();
              setShowWelcome(newTier);
              setUpgradeStep("welcome");
            },2000);
          }} className="paypal-btn">
            Pay with <span style={{fontStyle:"italic",fontWeight:800}}>Pay<span style={{color:"#253B80"}}>Pal</span></span>
          </button>
          {/* R31-4: the transparent no-refund line — the buy/cycle step had none. */}
          <div className="auth-sub" style={{fontSize:11,textAlign:"center",marginTop:8}}>No refunds. Your subscription stays active until the end of the paid period.</div>
          <button onClick={()=>{setUpgradeFlow(null);setUpgradeStep("pickPlan")}} className="back-link">← Back to plans</button>
        </div>
      </>);
    }

    // ── Pick plan (after registration / upgrade) ──
    // R28-1: the picker is CURRENT-PLAN AWARE — the user's tier is locked ("Your
    // current plan" + CURRENT badge, click no-ops → fixes the re-buy double-charge
    // bug), only genuine upgrades are clickable, and lower tiers read "Included"
    // (a Premium user already has more than Starter/Pro; downgrades stay in Account).
    const currentTier=(user&&user.tier)||"free";
    // R31-2: a FORCED first choice (the user hasn't chosen a plan yet) → every card is
    // actionable ("Choose X"), NO pre-chosen CURRENT badge, and NO skip link. Once chosen
    // (or on a paid tier) the R28 current-aware picker applies (locked current tier,
    // "Included" lower tiers, a Close link — reached from Account).
    const forced=!planChosen;
    // ADMIN-2: the checkout kill-switch. The PAID cards go unavailable (reusing the
    // existing locked treatment), but Starter deliberately does NOT — otherwise a
    // forced first choice, which has no skip link, would become a dead end with every
    // card unclickable. The server refuses createSubscription regardless; this only
    // stops people walking into a checkout that is going to fail.
    const checkoutOff=!!(site&&site.features&&site.features.checkout===false);
    const cardState=(t)=>checkoutOff&&t!=="free"?"paused"
      :forced?"upgrade":t===currentTier?"current":TIER_RANK[t]>TIER_RANK[currentTier]?"upgrade":"included";
    const ctaText=(t,label)=>cardState(t)==="paused"?"Temporarily unavailable":cardState(t)==="current"?"Your current plan":cardState(t)==="included"?"Included":label;
    const cardGo=(t,go)=>cardState(t)==="upgrade"?go:undefined;   // locked cards ignore clicks
    const lockCls=(t)=>cardState(t)==="upgrade"?"":" locked";
    return wrap(<>
      {!popup&&<div className="auth-h">{forced?<>Welcome, <span>{user?.name}</span></>:"Choose a plan"}</div>}
      {/* R31-2: the "Select a plan" subtitle stays on the welcome/forced picker; the desktop
          upgrade Modal already titles itself "Choose a plan", so it's dropped there (popup). */}
      {!popup&&<div className="auth-sub">Select a plan</div>}
      <div className="plan-col">
        <div onClick={cardGo("free",()=>{if(markPlanChosen)markPlanChosen();setShowWelcome("free");setUpgradeStep("welcome")})} className={"plan-card starter"+lockCls("free")} aria-disabled={cardState("free")!=="upgrade"}>
          {cardState("free")==="current"&&<div className="plan-badge">CURRENT</div>}
          <div className="plan-top"><span className="plan-name">Starter</span><span className="plan-price">$0</span></div>
          <div className="plan-feats">{PLAN_BENEFITS.free.limits.join(" · ")}</div>
          <div className="plan-feats">{PLAN_BENEFITS.free.feature}</div>
          <div className={"plan-cta neutral"+lockCls("free")}>{ctaText("free","Choose Starter")}</div>
        </div>
        <div onClick={cardGo("pro",()=>{setUpgradeFlow("pro");setUpgradeStep("billing")})} className={"plan-card rec"+lockCls("pro")} aria-disabled={cardState("pro")!=="upgrade"}>
          {/* CURRENT replaces RECOMMENDED on the user's own card */}
          {cardState("pro")==="current"?<div className="plan-badge">CURRENT</div>:cardState("pro")==="upgrade"?<div className="plan-badge">RECOMMENDED</div>:null}
          <div className="plan-top"><span className="plan-name">Pro</span><span className="plan-price-sm">from ${((site?.plans?.pro?.priceYear ?? 99.99)/12).toFixed(2)}/mo</span></div>
          <div className="plan-feats">{PLAN_BENEFITS.pro.limits.join(" · ")}</div>
          <div className="plan-feats">{PLAN_BENEFITS.pro.feature}</div>
          <div className={"plan-cta "+(cardState("pro")==="upgrade"?"accent":"neutral locked")}>{ctaText("pro","Choose Pro")}</div>
        </div>
        <div onClick={cardGo("premium",()=>{setUpgradeFlow("premium");setUpgradeStep("billing")})} className={"plan-card prem"+lockCls("premium")} aria-disabled={cardState("premium")!=="upgrade"}>
          {cardState("premium")==="current"&&<div className="plan-badge" style={{background:"#7d4bbf"}}>CURRENT</div>}
          <div className="plan-top"><span className="plan-name prem">Premium</span><span className="plan-price-sm">from ${((site?.plans?.premium?.priceYear ?? 499.99)/12).toFixed(2)}/mo</span></div>
          <div className="plan-feats">{PLAN_BENEFITS.premium.limits.join(" · ")}</div>
          <div className="plan-feats">{PLAN_BENEFITS.premium.feature}</div>
          <div className={"plan-cta "+(cardState("premium")==="upgrade"?"prem":"neutral locked")}>{ctaText("premium","Choose Premium")}</div>
        </div>
      </div>
      {/* R31-2: the FORCED first choice has no escape — the three cards ARE the decision.
          After a plan is chosen, the picker (from Account) gets a Close / Continue link. */}
      {!forced&&<div className="auth-link" style={{marginTop:14}}><span onClick={()=>{setShowPlan(false);setUpgradeStep("billing");setScreen("portfolio")}}>{currentTier==="free"?"Continue with Starter →":"Close"}</span></div>}
    </>);
  }
  return(<div className="ci-app screen-bg auth-wrap">
    <Logo size="lg" />
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
