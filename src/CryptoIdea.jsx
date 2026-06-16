/**
 * Crypto Idea - Crypto Portfolio & DCA Calculator
 * Version: 1.6.0
 * Build: 2026-04-04
 * Author: Crypto Idea Team
 * License: Proprietary
 * 
 * Changelog:
 *   v1.5.0 (2026-04-05) - Auto-fill historical price when selecting buy date
 *   v1.4.0 (2026-04-04) - Portfolio shows holdings value as big number, fixed delete button
 *   v1.3.0 (2026-04-04) - Live/Offline status indicator with glowing dot
 *   v1.2.0 (2026-04-04) - Full historical price data for 40+ coins, monthly timestamps
 *   v1.1.0 (2026-04-04) - Independent DCA calculator, real historical prices
 *   v1.0.2 (2026-04-04) - Embedded top 80 coins with icons and history
 *   v1.0.1 (2026-04-04) - Fixed search for sandbox, datetime with seconds
 *   v1.0.0 (2026-04-04) - Initial release: portfolio, search, DCA, price tracking
 */
import { useState, useEffect, useCallback, useMemo } from "react";

// Firebase Authentication — passwords are handled by Firebase and never stored on the device.
import { registerUser, loginUser, logoutUser } from "./api/firebase-auth.js";
import { exportMyData, deleteMyAccount as apiDeleteMyAccount } from "./api/account.js";
import {
  createPortfolio as dbCreatePortfolio,
  deletePortfolio as dbDeletePortfolio,
  addCoin as dbAddCoin,
  removeCoin as dbRemoveCoin,
  addTransaction as dbAddTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
} from "./api/firebase-database.js";
import { fetchSiteConfig } from "./api/config.js";
import { useCoinSearch } from "./hooks/useCoinSearch.js";
import { useLivePrices } from "./hooks/useLivePrices.js";
import { useAuthSession } from "./hooks/useAuthSession.js";
import { usePortfolios, DEFAULT_PORTFOLIOS } from "./hooks/usePortfolios.js";
import { useUpgrade } from "./hooks/useUpgrade.js";
import { db } from "./utils/storage.js";
import { c } from "./utils/theme.js";
import { Ic } from "./components/ui.jsx";
import { Loading } from "./components/Loading.jsx";
import { AppContext } from "./hooks/app-context.js";
import { ForgotPass } from "./components/ForgotPass.jsx";
import { Contact } from "./components/Contact.jsx";
import { Search } from "./components/Search.jsx";
import { AddEntry } from "./components/AddEntry.jsx";
import { CoinInfo } from "./components/CoinInfo.jsx";
import { Detail } from "./components/Detail.jsx";
import { Portfolio } from "./components/Portfolio.jsx";
import { Account } from "./components/Account.jsx";
import { Login } from "./components/Login.jsx";
// NOTE: the admin dashboard is a SEPARATE app (admin.html / admin-main.jsx) served
// at /admin — its code is intentionally NOT imported here, so the user bundle never
// contains admin functionality.

const APP_NAME = "Crypto Idea";
const APP_VERSION = "4.1.0";

// Admin is determined by a Firebase custom claim ({ admin: true }) set server-side
// via the Admin SDK — see functions/index.js (setAdminClaim) and functions/scripts/set-admin.js.
// There is intentionally no email allowlist here; the client only reads the verified token claim.
const FREE_COIN_LIMIT = 10;
const MAX_COINS = 200;

// ── Main App ──
export default function CryptoIdea(){
  const[screen,setScreen]=useState("loading");
  const[site,setSite]=useState({maintenance:false,signupsEnabled:true,plans:null});  // public config from /api/config
  const[authMode,setAuthMode]=useState("login");
  const[authEmail,setAuthEmail]=useState("");
  const[authPass,setAuthPass]=useState("");
  const[authName,setAuthName]=useState("");
  const[authErr,setAuthErr]=useState("");
  const[showPlan,setShowPlan]=useState(false);
  const[proBilling,setProBilling]=useState("yearly");
  const[proStep,setProStep]=useState("pick");
  const[resetSent,setResetSent]=useState(false);
  const[contactMsg,setContactMsg]=useState("");
  const[contactSent,setContactSent]=useState(false);
  const[fpEmail,setFpEmail]=useState("");
  const[fpErr,setFpErr]=useState("");
  const[upgradeFlow,setUpgradeFlow]=useState(null);  // null | "pro" | "premium"
  const[upgradeStep,setUpgradeStep]=useState("billing");  // billing | processing | welcome
  const[upgradeBilling,setUpgradeBilling]=useState("yearly");
  const[downgradeTo,setDowngradeTo]=useState(null);  // null | "free" | "pro"
  const[showWelcome,setShowWelcome]=useState(null);  // null | "free" | "pro" | "premium"
  const[showPaymentFailedSim,setShowPaymentFailedSim]=useState(false);
  const {portfolios,setPortfolios,activePortId,setActivePortId,portfolio,setPortfolio}=usePortfolios();
  // Subscription/tier-limit logic (end-date, downgrade impact + trim). UI flow state
  // for the upgrade overlay stays here (shared with the auth/Login flow) — see useUpgrade.
  const {calcEndDate,getTrimImpact,trimToTier}=useUpgrade({portfolios,setPortfolios});
  const[showPortManager,setShowPortManager]=useState(false);
  const[newPortName,setNewPortName]=useState("");
  // Auth session: owns user/dataLoaded + the auth-watch & profile-save effects.
  // Collaborators are passed as thin wrappers so functions defined lower in this
  // component (saveProfile, checkSubscriptionStatus) are referenced lazily.
  const {user,setUser,dataLoaded}=useAuthSession({
    setScreen,setPortfolios,setActivePortId,
    checkSubscriptionStatus:(u)=>checkSubscriptionStatus(u),
    saveProfile:(u)=>saveProfile(u),
  });
  // Live prices for the held coins (seeded with mock prices, then polled).
  const {prices,api}=useLivePrices(portfolio);
  const[sq,setSq]=useState("");
  const[sel,setSel]=useState(null);
  const[err,setErr]=useState("");
  const isPro=user?.tier==="pro"||user?.tier==="premium";
  const isPremium=user?.tier==="premium";
  const[eAmt,setEAmt]=useState("");
  const[ePrice,setEPrice]=useState("");
  const[eDate,setEDate]=useState(new Date().toISOString().slice(0,16));
  const[confirmDel,setConfirmDel]=useState(false);
  const[swipeId,setSwipeId]=useState(null);
  const[swipeX,setSwipeX]=useState(0);
  const[touchStart,setTouchStart]=useState(null);
  const[editEntry,setEditEntry]=useState(null);
  const[infoCoin,setInfoCoin]=useState(null);
  const[eTxType,setETxType]=useState("buy");


  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=`@keyframes pulse{0%{transform:scale(1);opacity:0.4}50%{transform:scale(2.2);opacity:0}100%{transform:scale(1);opacity:0}}@keyframes fadeIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}`;
    document.head.appendChild(style);
    return()=>document.head.removeChild(style);
  },[]);

  // Public app flags (maintenance / signups) set by an admin — read once on load.
  useEffect(()=>{fetchSiteConfig().then(d=>{if(d)setSite({maintenance:!!d.maintenance,signupsEnabled:d.signupsEnabled!==false,plans:d.plans||null})})},[]);

  // Auth watch + profile auto-save now live in useAuthSession (above).

  // Portfolios/coins/transactions are now persisted to Firestore per-mutation
  // (see addPortfolio/deletePortfolio/addCoin/remCoin/addEntry/remEntry), so the
  // old bulk local-storage save effect has been removed.

  // ═══ Remember which portfolio is active (local UI preference) ═══
  useEffect(()=>{
    if(!dataLoaded)return;
    db.set("ci-active-port",activePortId);
  },[activePortId,dataLoaded]);

  // Coin search for the Add Coin screen (built-in matches + debounced live results).
  const searchResults=useCoinSearch(sq);

  const showErr=(m)=>{setErr(m);setTimeout(()=>setErr(""),3000)};

  // Persist only non-sensitive profile data (tier, subscription, settings),
  // keyed by Firebase uid. Passwords are handled by Firebase Auth, never stored here.
  const saveProfile=async(u)=>{
    if(!u||!u.uid)return;
    const {uid,pass,loggedOut,...rest}=u;
    await db.set("ci-profile-"+uid,rest);
  };

  const handleAuth=async()=>{
    const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameRegex=/^[a-zA-Z\s]{2,30}$/;
    if(!authEmail){setAuthErr("Enter your email");return}
    if(!emailRegex.test(authEmail)){setAuthErr("Enter a valid email (e.g. name@email.com)");return}
    if(!authPass){setAuthErr("Enter your password");return}
    if(authMode==="register"&&!site.signupsEnabled){setAuthErr("New signups are currently paused. Please check back soon.");return}
    if(authMode==="register"){
      // Password strength is enforced ONLY at registration. Login just checks the password
      // is correct (Firebase does that) — re-validating composition on login would lock out
      // any valid account whose password predates a rule change, and leaks the policy for no gain.
      if(authPass.length<8){setAuthErr("Password must be at least 8 characters");return}
      if(authPass.length>50){setAuthErr("Password is too long");return}
      if(!/[A-Z]/.test(authPass)){setAuthErr("Password needs at least 1 uppercase letter (A-Z)");return}
      if(!/[a-z]/.test(authPass)){setAuthErr("Password needs at least 1 lowercase letter (a-z)");return}
      if(!/[0-9]/.test(authPass)){setAuthErr("Password needs at least 1 number (0-9)");return}
      if(!/[!@#$%^&*()_+\-={}|;:,.<>?]/.test(authPass)){setAuthErr("Password needs at least 1 special character (!@#$%...)");return}
      if(!authName){setAuthErr("Enter your name");return}
      if(!nameRegex.test(authName.trim())){setAuthErr("Name: letters only, 2-30 characters");return}
      const em=authEmail.toLowerCase().trim();
      // Create the account in Firebase Auth (password is stored securely by Firebase, never locally)
      const res=await registerUser(em,authPass,authName.trim());
      if(!res.success){setAuthErr(res.error||"Could not create account");return}
      const newUser={uid:res.user.uid,email:em,name:authName.trim()||em.split("@")[0],tier:"free",joined:new Date().toISOString().split("T")[0]};
      setUser(newUser);
      await saveProfile(newUser);
      setAuthErr("");setShowPlan(true);setUpgradeStep("pickPlan");
    }else{
      // Login: verify credentials against Firebase Auth
      const em=authEmail.toLowerCase().trim();
      const res=await loginUser(em,authPass);
      if(!res.success){setAuthErr(res.error||"Could not log in");return}
      setAuthErr("");
      // onAuthChange (above) loads the profile + portfolios and navigates to the portfolio.
    }};

  const logout=async()=>{
    // Sign out of Firebase; onAuthChange will clear the session. No credentials are kept on the device.
    await logoutUser();
    setUser(null);setPortfolios(DEFAULT_PORTFOLIOS);setActivePortId("default");setScreen("login");setAuthEmail("");setAuthPass("");setAuthName("")};

  // ── Self-service privacy (GDPR/CCPA): export + delete your own data ──
  const [acctBusy,setAcctBusy]=useState(false);
  const [acctMsg,setAcctMsg]=useState("");
  const [delConfirm,setDelConfirm]=useState(false);
  const downloadMyData=async()=>{
    setAcctBusy(true);setAcctMsg("");
    try{
      const data=await exportMyData();
      const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="crypto-idea-my-data.json";a.click();
      URL.revokeObjectURL(url);
      setAcctMsg("Downloaded ✓");
    }catch(e){setAcctMsg((e&&e.message)||"Export failed");}
    setAcctBusy(false);
  };
  const deleteMyAccount=async()=>{
    setAcctBusy(true);setAcctMsg("");
    try{
      await apiDeleteMyAccount();
      await logoutUser();
      setUser(null);setScreen("login");
    }catch(e){setAcctMsg((e&&e.message)||"Delete failed");setAcctBusy(false);}
  };
  const startUpgrade=(toTier)=>{setUpgradeFlow(toTier);setUpgradeStep("billing");setShowPlan(true)};
  const startDowngrade=(toTier)=>{setDowngradeTo(toTier)};
  const confirmDowngrade=async()=>{
    // In production: PayPal cancels subscription, downgrade happens at endDate
    // For demo: mark as cancelled, keep current tier until endDate
    const updated={...user,subscription:{...(user.subscription||{}),cancelled:true,downgradeTo}};
    setUser(updated);
    await saveProfile(updated);
    setDowngradeTo(null);
  };
  const upgradePro=()=>startUpgrade("pro");
  const downgradeFree=()=>startDowngrade("free");
  const premLimits=user?.premiumLimits||{};
  // Admin-configured tier limits (from /api/config); fall back to built-in defaults.
  const _tierKey=isPremium?"premium":isPro?"pro":"free";
  const _planLim=(key,def)=>{const p=site.plans&&site.plans[_tierKey];return (p&&p[key]!=null)?p[key]:def;};
  const maxPortfolios=isPremium?(premLimits.portfolios||_planLim("portfolios",50)):_planLim("portfolios",isPro?10:1);
  const maxCoinsPerPort=isPremium?(premLimits.coins||_planLim("coins",500)):_planLim("coins",isPro?200:10);
  const maxTxPerCoin=isPremium?(premLimits.transactions||_planLim("transactions",5000)):_planLim("transactions",isPro?2000:50);


  const addPortfolio=async()=>{
    if(portfolios.length>=maxPortfolios){showErr(isPro?"Max 10 portfolios":"Free: 1 portfolio. Upgrade to Pro for 10!");return}
    if(!newPortName.trim()){showErr("Enter a portfolio name");return}
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbCreatePortfolio(user.uid,newPortName.trim(),portfolios.length);
    if(!res.success){showErr("Couldn't create portfolio. Check your connection.");return}
    const np={id:res.id,name:newPortName.trim(),coins:[]};
    setPortfolios(prev=>[...prev,np]);setActivePortId(res.id);setNewPortName("")};

  const deletePortfolio=async(pid)=>{
    if(portfolios.length<=1){showErr("Need at least 1 portfolio");return}
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbDeletePortfolio(user.uid,pid);
    if(!res.success){showErr("Couldn't delete portfolio. Check your connection.");return}
    setPortfolios(prev=>prev.filter(p=>p.id!==pid));
    if(activePortId===pid){setActivePortId(portfolios.find(p=>p.id!==pid)?.id||"default")}};

  const addCoin=async(c)=>{
    if(portfolio.find(x=>x.id===c.id)){showErr("Already added");return}
    const lim=maxCoinsPerPort;
    if(portfolio.length>=lim){showErr(isPro?"Max "+maxCoinsPerPort+" coins per portfolio":"Free: "+maxCoinsPerPort+" coins. Upgrade to Pro for "+200+"!");return}
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbAddCoin(user.uid,activePortId,{id:c.id,symbol:c.symbol,name:c.name,thumb:c.thumb});
    if(!res.success){showErr("Couldn't add coin. Check your connection.");return}
    setPortfolio(p=>[...p,{id:c.id,symbol:c.symbol,name:c.name,thumb:c.thumb,entries:[]}]);setScreen("portfolio");setSq("")};
  const remCoin=async(id)=>{
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbRemoveCoin(user.uid,activePortId,id);
    if(!res.success){showErr("Couldn't remove coin. Check your connection.");return}
    setPortfolio(p=>p.filter(c=>c.id!==id));if(sel?.id===id){setSel(null);setScreen("portfolio")}};
  const addEntry=async()=>{if(!eAmt||!ePrice)return;
    if(sel){
      const currentTxCount=sel.entries.filter(e=>!editEntry||e.id!==editEntry.id).length;
      if(currentTxCount>=maxTxPerCoin){showErr("Max "+maxTxPerCoin+" transactions per coin"+(isPro?"":" · Upgrade to Pro for 2,000!"));return}

    }
    if(eTxType==="sell"&&sel){
      const sellDate=new Date(eDate);
      const holdingsAtDate=sel.entries.reduce((s,e)=>{
        if(editEntry&&e.id===editEntry.id)return s;
        if(new Date(e.date)>sellDate)return s;
        return e.type==="sell"?s-e.amount:s+e.amount;
      },0);
      if(holdingsAtDate<=0){
        showErr("No "+sel.symbol+" owned at this date. Buy first before selling.");
        return;
      }
      if(parseFloat(eAmt)>holdingsAtDate){
        showErr("Only "+holdingsAtDate.toFixed(6)+" "+sel.symbol+" owned at this date");
        return;
      }
    }
    if(!user?.uid){showErr("Please sign in again");return}
    if(editEntry){
      const txData={type:eTxType,amount:parseFloat(eAmt),priceAtBuy:parseFloat(ePrice),date:eDate};
      const res=await dbUpdateTransaction(user.uid,activePortId,sel.id,editEntry.id,txData);
      if(!res.success){showErr("Couldn't save transaction. Check your connection.");return}
      const updated={...editEntry,...txData};
      setPortfolio(p=>p.map(c=>c.id===sel.id?{...c,entries:c.entries.map(e=>e.id===editEntry.id?updated:e)}:c));
      setSel(p=>({...p,entries:p.entries.map(e=>e.id===editEntry.id?updated:e)}));
    }else{
      const txData={type:eTxType,amount:parseFloat(eAmt),priceAtBuy:parseFloat(ePrice),date:eDate};
      const res=await dbAddTransaction(user.uid,activePortId,sel.id,txData);
      if(!res.success){showErr("Couldn't add transaction. Check your connection.");return}
      const en={id:res.id,...txData};
      setPortfolio(p=>p.map(c=>c.id===sel.id?{...c,entries:[...c.entries,en]}:c));
      setSel(p=>({...p,entries:[...p.entries,en]}));
    }
    setEAmt("");setEPrice("");setEditEntry(null);setScreen("detail")};
  const remEntry=async(cid,eid)=>{
    const coin=portfolio.find(c=>c.id===cid);if(!coin)return;
    const remaining=coin.entries.filter(e=>e.id!==eid).sort((a,b)=>new Date(a.date)-new Date(b.date));
    let bal=0;for(const e of remaining){bal=e.type==="sell"?bal-e.amount:bal+e.amount;
      if(bal<-0.00000001){showErr("Can\'t delete — a sell on "+e.date.split("T")[0]+" depends on it");return}}
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbDeleteTransaction(user.uid,activePortId,cid,eid);
    if(!res.success){showErr("Couldn't delete transaction. Check your connection.");return}
    setPortfolio(p=>p.map(c=>c.id===cid?{...c,entries:c.entries.filter(e=>e.id!==eid)}:c));setSel(p=>p?{...p,entries:p.entries.filter(e=>e.id!==eid)}:p)};


  const tv=portfolio.reduce((s,c)=>{const p=prices[c.id]?.usd||0;return s+c.entries.reduce((a,e)=>a+e.amount,0)*p},0);
  const tinv=portfolio.reduce((s,c)=>{const b=c.entries.filter(e=>e.type!=="sell").reduce((a,e)=>a+e.amount*e.priceAtBuy,0);const sl=c.entries.filter(e=>e.type==="sell").reduce((a,e)=>a+e.amount*e.priceAtBuy,0);return s+(b-sl)},0);
  const totalBuys=portfolio.reduce((s,c)=>s+c.entries.filter(e=>e.type!=="sell").reduce((a,e)=>a+e.amount*e.priceAtBuy,0),0);
  const totalSells=portfolio.reduce((s,c)=>s+c.entries.filter(e=>e.type==="sell").reduce((a,e)=>a+e.amount*e.priceAtBuy,0),0);
  const tpnl=(tv+totalSells)-totalBuys;const tpp=totalBuys>0?((tv+totalSells-totalBuys)/totalBuys)*100:0;

  // ── Usage Calculation ──
  const totalCoinsUsed=portfolio.length;
  const totalTxUsed=portfolios.reduce((s,p)=>s+p.coins.reduce((cs,c)=>cs+(c.entries?.length||0),0),0);
  const maxTotalTx=maxPortfolios*maxCoinsPerPort*maxTxPerCoin;
  const coinPct=maxCoinsPerPort>0?Math.round(totalCoinsUsed/maxCoinsPerPort*100):0;
  const txPct=maxTotalTx>0?Math.round(totalTxUsed/maxTotalTx*100):0;
  // Only warn based on coins or transactions — not portfolio count (1/1 on free always = 100%)
  const usagePct=Math.max(coinPct,txPct);

  // ── Subscription Helpers ──
  // calcEndDate / getTrimImpact / trimToTier now live in useUpgrade (above).
  const fmtDate=(d)=>new Date(d).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});

  // Check on app load if subscription expired or payment failed
  const checkSubscriptionStatus=async(u)=>{
    if(!u||!u.subscription)return u;
    const now=new Date();
    const sub=u.subscription;

    // Payment failed grace period (7 days)
    if(sub.paymentFailed&&sub.paymentFailedDate){
      const failedDate=new Date(sub.paymentFailedDate);
      const daysSince=Math.floor((now-failedDate)/(1000*60*60*24));
      if(daysSince>=7){
        // Force downgrade to free
        trimToTier("free");
        const updated={...u,tier:"free",subscription:null};
        await saveProfile(updated);
        return updated;
      }
    }

    // Cancelled subscription expired
    if(sub.cancelled&&sub.endDate&&new Date(sub.endDate)<=now){
      const target=sub.downgradeTo||"free";
      trimToTier(target);
      const updated={...u,tier:target,subscription:null};
      await saveProfile(updated);
      return updated;
    }

    return u;
  };

  // ── Swipe Handlers ──
  const onTouchS=(id,e)=>{const x=e.touches?e.touches[0].clientX:e.clientX;const y=e.touches?e.touches[0].clientY:e.clientY;setTouchStart({x,y,id})};
  const onTouchM=(e)=>{
    if(!touchStart)return;
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    const dx=cx-touchStart.x;
    const dy=cy-touchStart.y;
    if(Math.abs(dy)>Math.abs(dx))return;
    const clamped=Math.max(-80,Math.min(80,dx));
    setSwipeId(touchStart.id);setSwipeX(clamped);
  };
  const onTouchE=()=>{
    if(!touchStart)return;
    if(Math.abs(swipeX)<40){setSwipeId(null);setSwipeX(0)}
    else{setSwipeX(swipeX<0?-80:80)}
    setTouchStart(null);
  };
  const resetSwipe=()=>{setSwipeId(null);setSwipeX(0);setTouchStart(null)};

  // ── Portfolio ──
  // ── Portfolio Screen (+ PortfolioBar) → components/Portfolio.jsx (reads context) ──

  // ── Login Screen (+ plan picker / upgrade overlay) → components/Login.jsx (reads context) ──

  // ── Forgot Password Screen ──
  // ── Contact Screen (Premium inquiry) → components/Contact.jsx (reads context) ──

    // ── Account Screen ──
  // ── Account Screen → components/Account.jsx (reads context) ──
  // ── Add Coin / Search Screen → components/Search.jsx (reads context) ──

  // ── Coin Detail Screen → components/Detail.jsx (reads context) ──

  // ── Add/Edit Transaction Screen → components/AddEntry.jsx (reads context) ──

  // ── Coin Info ──
  // ── Coin Info Screen → components/CoinInfo.jsx (reads context) ──

  const at=(screen==="addEntry"||screen==="detail"||screen==="coinInfo"||screen==="account")?"portfolio":screen;

  if(site.maintenance) return(<div style={{fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",background:c.bg,color:c.txt,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"40px 28px"}}>
    <div style={{fontSize:40,marginBottom:14}}>🛠️</div>
    <div style={{fontSize:24,fontWeight:700,marginBottom:8}}>We'll be right back</div>
    <div style={{fontSize:14,color:c.dim,maxWidth:320,lineHeight:1.5}}>Crypto Idea is briefly down for maintenance. Your data is safe — please check back in a little while.</div>
  </div>);

  // Shared state + handlers for extracted screens (grows as screens migrate).
  const ctx={api,setScreen,fpEmail,setFpEmail,fpErr,setFpErr,resetSent,setResetSent,
    user,contactMsg,setContactMsg,contactSent,setContactSent,
    sq,setSq,searchResults,portfolio,addCoin,
    sel,setSel,eAmt,setEAmt,ePrice,setEPrice,eDate,setEDate,eTxType,setETxType,editEntry,setEditEntry,addEntry,
    infoCoin,setInfoCoin,prices,
    confirmDel,setConfirmDel,remCoin,remEntry,
    tv,totalBuys,tpnl,tpp,maxCoinsPerPort,usagePct,maxPortfolios,isPro,isPremium,startUpgrade,
    portfolios,setActivePortId,activePortId,
    resetSwipe,onTouchS,onTouchM,onTouchE,touchStart,swipeId,swipeX,
    maxTxPerCoin,startDowngrade,fmtDate,deletePortfolio,newPortName,setNewPortName,addPortfolio,
    downloadMyData,acctBusy,deleteMyAccount,delConfirm,setDelConfirm,acctMsg,logout,
    showPlan,showWelcome,upgradeStep,setUpgradeStep,upgradeFlow,setUpgradeFlow,setShowPlan,setShowWelcome,
    upgradeBilling,setUpgradeBilling,setUser,saveProfile,calcEndDate,
    authMode,setAuthMode,authErr,setAuthErr,authName,setAuthName,authEmail,setAuthEmail,authPass,setAuthPass,handleAuth,site};
  return(<AppContext.Provider value={ctx}><div style={{fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",background:c.bg,color:c.txt,minHeight:"100vh",maxWidth:430,margin:"0 auto",paddingBottom:78,WebkitFontSmoothing:"antialiased"}}>
    {err&&<div style={{margin:"8px 16px",padding:"10px 14px",background:"#FFF0F0",color:c.red,borderRadius:12,fontSize:12,fontWeight:500,border:"1px solid #FFD0D0"}}>{err}</div>}
    {showPlan&&screen!=="login"&&(()=>{
      // Reuse the Login() flow rendering for upgrade overlay
      // But Login() handles the showPlan branch — render it as a full overlay
      return(<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:c.bg,zIndex:9000,maxWidth:430,margin:"0 auto",overflowY:"auto"}}>
        <Login/>
      </div>);
    })()}
    {screen==="loading"&&Loading()}
    {screen==="login"&&<Login/>}
    {screen==="forgotPass"&&<ForgotPass/>}
    {screen==="contact"&&<Contact/>}
    {downgradeTo&&(()=>{
      const impact=getTrimImpact(downgradeTo);
      const endDate=user?.subscription?.endDate||calcEndDate(user?.subscription?.billing||"monthly");
      const targetLabel=downgradeTo==="free"?"Starter":"Pro";
      return(<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:9999}}>
        <div style={{background:"#fff",borderTopLeftRadius:24,borderTopRightRadius:24,padding:"24px 22px 32px",width:"100%",maxWidth:430}}>
          <div style={{width:36,height:4,background:"#E8E8ED",borderRadius:2,margin:"0 auto 18px"}}/>
          <div style={{fontSize:20,fontWeight:700,marginBottom:8}}>Downgrade to {targetLabel}?</div>
          <div style={{fontSize:13,color:c.dim,lineHeight:1.6,marginBottom:18}}>Your subscription is paid until the end of the period. You'll keep your current access until then. After that date, your account will be downgraded.</div>

          <div style={{padding:"12px 14px",borderRadius:12,background:"#FFF0F0",border:"1px solid #FFE0E0",marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:700,color:c.red,marginBottom:4}}>SUBSCRIPTION ENDS</div>
            <div style={{fontSize:15,fontWeight:700,color:c.red}}>{fmtDate(endDate)}</div>
            <div style={{fontSize:11,color:c.dim,marginTop:4}}>You'll have full access until this date</div>
          </div>

          {impact&&(impact.portsToDelete>0||impact.coinsToDelete>0||impact.txToDelete>0)&&(
            <div style={{padding:"14px",borderRadius:12,background:"#FFF8E1",border:"1px solid #FFE082",marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:"#F59E0B",marginBottom:8}}>⚠ DATA THAT WILL BE DELETED</div>
              <div style={{fontSize:12,color:"#92400E",lineHeight:1.7}}>
                After {fmtDate(endDate)}, your account limit will drop to {targetLabel}. The following will be removed:
                {impact.portsToDelete>0&&<div>• {impact.portsToDelete} portfolio{impact.portsToDelete>1?"s":""}</div>}
                {impact.coinsToDelete>0&&<div>• {impact.coinsToDelete} coin{impact.coinsToDelete>1?"s":""}</div>}
                {impact.txToDelete>0&&<div>• {impact.txToDelete.toLocaleString()} transaction{impact.txToDelete>1?"s":""}</div>}
              </div>
              <div style={{fontSize:11,color:c.dim,marginTop:8,fontStyle:"italic"}}>The oldest items will be removed. Your most recent data will be kept.</div>
            </div>
          )}

          <div style={{fontSize:11,color:c.dim,lineHeight:1.6,marginBottom:16,textAlign:"center"}}>No refunds. Your subscription remains active until the end of the paid period.</div>

          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setDowngradeTo(null)} style={{flex:1,padding:"14px",borderRadius:14,border:"1px solid #E8E8ED",background:"#fff",color:c.txt,fontSize:14,fontWeight:600,cursor:"pointer"}}>Keep My Plan</button>
            <button onClick={confirmDowngrade} style={{flex:1,padding:"14px",borderRadius:14,border:"none",background:c.red,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Confirm Downgrade</button>
          </div>
        </div>
      </div>);
    })()}
    {screen==="account"&&<Account/>}
    {screen==="portfolio"&&<Portfolio/>}
    {screen==="search"&&<Search/>}
    {screen==="detail"&&<Detail/>}
    {screen==="addEntry"&&<AddEntry/>}
    {screen==="coinInfo"&&<CoinInfo/>}
    {screen!=="login"&&screen!=="loading"&&screen!=="forgotPass"&&screen!=="contact"&&<div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,display:"flex",background:"rgba(255,255,255,0.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:"1px solid #E8E8ED",padding:"6px 0 22px",zIndex:100}}>
      {[{id:"portfolio",label:"Portfolio",icon:Ic.port},{id:"search",label:"Search",icon:Ic.srch}].map(tab=>(<button key={tab.id} onClick={()=>setScreen(tab.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"7px 0",cursor:"pointer",border:"none",background:"none",fontSize:10,fontWeight:600,color:at===tab.id?c.ac:c.dim}}>{tab.icon(at===tab.id)}{tab.label}</button>))}
    </div>}
  </div></AppContext.Provider>);
}
