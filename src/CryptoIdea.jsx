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
import { registerUser, loginUser, logoutUser, resetPassword, onAuthChange } from "./api/firebase-auth.js";
import { httpsCallable } from "firebase/functions";
import { functions } from "./api/firebase.config.js";
import {
  getPortfolios, getCoins,
  createPortfolio as dbCreatePortfolio,
  deletePortfolio as dbDeletePortfolio,
  addCoin as dbAddCoin,
  removeCoin as dbRemoveCoin,
  addTransaction as dbAddTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
} from "./api/firebase-database.js";
import { fetchSiteConfig } from "./api/config.js";
import { fmtP, fmtMc, fmtPct, uid, fmtDT, timeBetween } from "./utils/format.js";
import { TOP_COINS, PRICE_HISTORY, getHistoricalPrice } from "./utils/coins.js";
import { useCoinSearch } from "./hooks/useCoinSearch.js";
import { useLivePrices } from "./hooks/useLivePrices.js";
import { c, inp_s, lbl_s, sb } from "./utils/theme.js";
import { Ic, CI, hdr } from "./components/ui.jsx";
// NOTE: the admin dashboard is a SEPARATE app (admin.html / admin-main.jsx) served
// at /admin — its code is intentionally NOT imported here, so the user bundle never
// contains admin functionality.

// ═══ Persistent Storage Helpers ═══
const db = {
  async get(key) {
    try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
    catch { return null; }
  },
  async set(key, value) {
    try { await window.storage.set(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  async del(key) {
    try { await window.storage.delete(key); return true; }
    catch { return false; }
  }
};

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
  const[user,setUser]=useState(null);
  const[dataLoaded,setDataLoaded]=useState(false);
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
  const[portfolios,setPortfolios]=useState([{id:"default",name:"My Portfolio",coins:[]}]);
  const[activePortId,setActivePortId]=useState("default");
  const[showPortManager,setShowPortManager]=useState(false);
  const[newPortName,setNewPortName]=useState("");
  const portfolio=portfolios.find(p=>p.id===activePortId)?.coins||[];
  const setPortfolio=(fn)=>{setPortfolios(prev=>prev.map(p=>p.id===activePortId?{...p,coins:typeof fn==="function"?fn(p.coins):fn}:p))};
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

  // ═══ Watch Firebase auth state + load saved data on startup ═══
  useEffect(()=>{
    const loadPortfolios=async(uid)=>{
      // Load portfolios (and their coins + transactions) from Firestore so data
      // syncs across devices. The counters live on these docs and are enforced by rules.
      const res=await getPortfolios(uid);
      if(!res.success)return;
      const ports=[];
      for(const p of res.portfolios){
        const cr=await getCoins(uid,p.id);
        ports.push({id:p.id,name:p.name,coins:cr.success?cr.coins:[]});
      }
      if(ports.length>0){
        setPortfolios(ports);
        // Restore last active portfolio if it still exists, else use the first one
        const savedActive=await db.get("ci-active-port");
        setActivePortId(ports.find(p=>p.id===savedActive)?savedActive:ports[0].id);
      }
    };
    // Firebase is the source of truth for who is logged in. The password lives
    // in Firebase Auth and is never stored on the device.
    const unsub=onAuthChange(async(fbUser)=>{
      if(fbUser){
        // Non-sensitive profile (tier, subscription, settings) kept locally, keyed by uid
        const profile=await db.get("ci-profile-"+fbUser.uid)||{};
        const baseUser={
          tier:"free",
          joined:new Date().toISOString().split("T")[0],
          ...profile,
          uid:fbUser.uid,
          email:fbUser.email,
          name:fbUser.displayName||profile.name||(fbUser.email?fbUser.email.split("@")[0]:""),
        };
        await loadPortfolios(fbUser.uid);
        // Check if subscription expired or payment failed
        const checked=await checkSubscriptionStatus(baseUser);
        setUser(checked);
        setScreen("portfolio");
      }else{
        setUser(null);
        setScreen("login");
      }
      setDataLoaded(true);
    });
    return ()=>{ if(typeof unsub==="function") unsub(); };
  },[]);

  // ═══ Auto-save user profile when it changes (never stores a password) ═══
  useEffect(()=>{
    if(!dataLoaded)return;
    if(user&&user.uid){saveProfile(user)}
  },[user,dataLoaded]);

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
    setUser(null);setPortfolios([{id:"default",name:"My Portfolio",coins:[]}]);setActivePortId("default");setScreen("login");setAuthEmail("");setAuthPass("");setAuthName("")};

  // ── Self-service privacy (GDPR/CCPA): export + delete your own data ──
  const [acctBusy,setAcctBusy]=useState(false);
  const [acctMsg,setAcctMsg]=useState("");
  const [delConfirm,setDelConfirm]=useState(false);
  const downloadMyData=async()=>{
    setAcctBusy(true);setAcctMsg("");
    try{
      const r=await httpsCallable(functions,"exportMyData")();
      const blob=new Blob([JSON.stringify(r.data,null,2)],{type:"application/json"});
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
      await httpsCallable(functions,"deleteMyAccount")();
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

  // ── Live/Offline Status Indicator ──
  const StatusDot=({live,small})=>{
    const size=small?6:8;
    const isLive=live||api==="live";
    return(
      <div style={{display:"inline-flex",alignItems:"center",gap:small?4:6,padding:small?"3px 8px":"4px 10px",borderRadius:20,background:isLive?c.acd:c.yeld,border:`1px solid ${isLive?"#34C75930":"#FF950030"}`}}>
        <div style={{position:"relative",width:size,height:size}}>
          <div style={{width:size,height:size,borderRadius:"50%",background:isLive?c.ac:c.yel}}/>
          {isLive&&<div style={{position:"absolute",top:-1,left:-1,width:size+2,height:size+2,borderRadius:"50%",background:isLive?c.ac:c.yel,opacity:0.4,animation:"pulse 2s infinite"}}/>}
        </div>
        <span style={{fontSize:small?9:10,fontWeight:600,color:isLive?c.ac:c.yel,letterSpacing:"0.3px"}}>{isLive?"LIVE":"OFFLINE"}</span>
      </div>
    );
  };

  // ── Usage Calculation ──
  const totalCoinsUsed=portfolio.length;
  const totalTxUsed=portfolios.reduce((s,p)=>s+p.coins.reduce((cs,c)=>cs+(c.entries?.length||0),0),0);
  const maxTotalTx=maxPortfolios*maxCoinsPerPort*maxTxPerCoin;
  const coinPct=maxCoinsPerPort>0?Math.round(totalCoinsUsed/maxCoinsPerPort*100):0;
  const txPct=maxTotalTx>0?Math.round(totalTxUsed/maxTotalTx*100):0;
  // Only warn based on coins or transactions — not portfolio count (1/1 on free always = 100%)
  const usagePct=Math.max(coinPct,txPct);

  // ── Subscription Helpers ──
  const fmtDate=(d)=>new Date(d).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  const calcEndDate=(billing)=>{
    const d=new Date();
    if(billing==="yearly")d.setFullYear(d.getFullYear()+1);
    else d.setMonth(d.getMonth()+1);
    return d.toISOString();
  };
  const getTrimImpact=(toTier)=>{
    const limits={
      free:{ports:1,coins:10,tx:50},
      pro:{ports:10,coins:200,tx:2000},
      premium:{ports:50,coins:500,tx:5000},
    };
    const lim=limits[toTier];
    if(!lim)return null;
    const portsToDelete=Math.max(0,portfolios.length-lim.ports);
    let coinsToDelete=0,txToDelete=0;
    portfolios.slice(0,lim.ports).forEach(p=>{
      coinsToDelete+=Math.max(0,p.coins.length-lim.coins);
      p.coins.slice(0,lim.coins).forEach(coin=>{
        txToDelete+=Math.max(0,(coin.entries?.length||0)-lim.tx);
      });
    });
    portfolios.slice(lim.ports).forEach(p=>{
      p.coins.forEach(coin=>{coinsToDelete++;txToDelete+=(coin.entries?.length||0)});
    });
    return{portsToDelete,coinsToDelete,txToDelete};
  };

  // Actually trim portfolios/coins/tx to fit a tier's limits
  const trimToTier=(toTier)=>{
    const limits={
      free:{ports:1,coins:10,tx:50},
      pro:{ports:10,coins:200,tx:2000},
      premium:{ports:50,coins:500,tx:5000},
    };
    const lim=limits[toTier];
    if(!lim)return;
    setPortfolios(prev=>{
      const trimmed=prev.slice(0,lim.ports).map(p=>({
        ...p,
        coins:p.coins.slice(0,lim.coins).map(coin=>({
          ...coin,
          entries:(coin.entries||[]).slice(-lim.tx), // keep most recent
        })),
      }));
      return trimmed.length>0?trimmed:[{id:"default",name:"My Portfolio",coins:[]}];
    });
  };

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
  const Portfolio=()=>(<>
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
    {PortfolioBar()}
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

  // ── Loading Screen ──
  const Loading=()=>(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",gap:12}}>
    <div style={{fontSize:28,fontWeight:200,letterSpacing:"-0.5px"}}>Crypto <span style={{fontWeight:700}}>Idea</span></div>
    <div style={{fontSize:13,color:c.dim}}>Loading your data...</div>
  </div>);

  // ── Login Screen ──
  const Login=()=>{
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
        {authErr&&<div style={{padding:"10px",background:"#FFF0F0",color:c.rd,borderRadius:10,fontSize:12,textAlign:"center"}}>{authErr}</div>}
        <button onClick={handleAuth} style={{padding:"14px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff",marginTop:4}}>{authMode==="login"?"Login":"Create Account"}</button>
        {authMode==="login"&&<div style={{textAlign:"center",marginTop:8}}><span onClick={()=>setScreen("forgotPass")} style={{fontSize:12,color:c.ac,cursor:"pointer",fontWeight:500}}>Forgot password?</span></div>}
      </div>
    </div>)};

  // ── Forgot Password Screen ──
  const ForgotPass=()=>{
    const handleReset=async()=>{
      const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if(!fpEmail){setFpErr("Enter your email");return}
      if(!emailRegex.test(fpEmail)){setFpErr("Enter a valid email");return}
      // Firebase sends the reset email. We always show success so an attacker
      // can't use this form to discover which emails have accounts.
      const res=await resetPassword(fpEmail.toLowerCase().trim());
      if(!res.success&&res.error&&res.error.indexOf("Network")!==-1){setFpErr(res.error);return}
      setResetSent(true);setFpErr("");
    };
    if(resetSent)return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
      <div style={{width:56,height:56,borderRadius:28,background:c.acd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:20}}>✓</div>
      <div style={{fontSize:22,fontWeight:700,marginBottom:8,textAlign:"center"}}>Check your email</div>
      <div style={{fontSize:14,color:c.dim,textAlign:"center",lineHeight:1.55,maxWidth:300,marginBottom:32}}>We've sent password reset instructions to <strong>{fpEmail}</strong></div>
      <button onClick={()=>{setResetSent(false);setScreen("login")}} style={{padding:"14px 36px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Back to Login</button>
    </div>);
    return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",justifyContent:"center"}}>
      <div style={{fontSize:32,fontWeight:200,letterSpacing:"-1px",marginBottom:4}}>Crypto <span style={{fontWeight:700}}>Idea</span></div>
      <div style={{fontSize:13,color:c.dim,marginBottom:36}}>Reset your password</div>
      <div style={{width:"100%",maxWidth:320,display:"flex",flexDirection:"column",gap:14}}>
        <div style={{fontSize:14,color:c.dim,lineHeight:1.5,textAlign:"center"}}>Enter your email and we'll send you a link to reset your password.</div>
        <input type="email" value={fpEmail} onChange={e=>setFpEmail(e.target.value)} placeholder="name@email.com" autoComplete="email" inputMode="email" style={inp_s}/>
        {fpErr&&<div style={{padding:"10px",background:"#FFF0F0",color:c.rd,borderRadius:10,fontSize:12,textAlign:"center"}}>{fpErr}</div>}
        <button onClick={handleReset} style={{padding:"14px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Send Reset Link</button>
        <div style={{textAlign:"center",marginTop:4}}><span onClick={()=>setScreen("login")} style={{fontSize:12,color:c.ac,cursor:"pointer",fontWeight:500}}>Back to Login</span></div>
      </div>
    </div>)};

    // ── Contact Screen (Premium inquiry) ──
  const Contact=()=>{
    if(contactSent)return(<div style={{padding:"40px 24px",display:"flex",flexDirection:"column",alignItems:"center",minHeight:"80vh",justifyContent:"center"}}>
      <div style={{width:56,height:56,borderRadius:28,background:c.acd,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,marginBottom:20}}>✓</div>
      <div style={{fontSize:22,fontWeight:700,marginBottom:8,textAlign:"center"}}>Message sent</div>
      <div style={{fontSize:14,color:c.dim,textAlign:"center",lineHeight:1.55,maxWidth:300,marginBottom:32}}>We'll review your account needs and get back to you within 24 hours.</div>
      <button onClick={()=>{setContactSent(false);setScreen("portfolio")}} style={{padding:"14px 36px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Back to Portfolio</button>
    </div>);
    return(<div>
      {hdr(<button onClick={()=>setScreen("portfolio")} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button>,"Premium Plan",null)}
      <div style={{padding:"20px 18px"}}>
        <div style={{fontSize:15,fontWeight:600,marginBottom:8}}>Need higher limits?</div>
        <div style={{fontSize:13,color:c.dim,lineHeight:1.6,marginBottom:20}}>Tell us what you need and we'll create a custom Premium plan for your account. Higher portfolios, more coins, more transactions — tailored to you.</div>
        <div style={{fontSize:12,fontWeight:600,color:c.dim,marginBottom:6}}>Your message</div>
        <textarea value={contactMsg} onChange={e=>setContactMsg(e.target.value)} placeholder={"I need more portfolios / coins / transactions..."} style={{width:"100%",padding:"12px 14px",borderRadius:12,border:"1px solid #E8E8ED",fontSize:14,outline:"none",resize:"vertical",minHeight:100,fontFamily:"inherit",boxSizing:"border-box"}}/>
        <div style={{fontSize:11,color:c.dim,marginTop:6,marginBottom:16}}>Account: {user?.email}</div>
        <button onClick={()=>{if(contactMsg.trim())setContactSent(true)}} style={{width:"100%",padding:"14px",borderRadius:14,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",background:c.txt,color:"#fff"}}>Send Request</button>
      </div>
    </div>)};

    // ── Account Screen ──
  const Account=()=>(<div>
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
      const totalCoinsAllPorts = portfolios.reduce((s,p) => s + p.coins.length, 0);
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
      <div style={{fontSize:11,color:c.dim,marginBottom:12,lineHeight:1.5}}>Download everything we hold about you, or permanently delete your account and all your data.</div>
      <button onClick={downloadMyData} disabled={acctBusy} style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid #E8E8ED",background:"#fff",color:c.txt,fontSize:13,fontWeight:600,cursor:"pointer",marginBottom:8}}>{acctBusy?"…":"Download my data"}</button>
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

  // ── Portfolio Selector (mini bar) ──
  const PortfolioBar=()=>portfolios.length>1||isPro?(
    <div style={{padding:"6px 18px 2px",display:"flex",gap:6,overflowX:"auto"}}>
      {portfolios.map(p=>(
        <button key={p.id} onClick={()=>setActivePortId(p.id)} style={{padding:"6px 14px",borderRadius:20,border:p.id===activePortId?"1.5px solid "+c.ac:"1.5px solid #E8E8ED",background:p.id===activePortId?c.acd:"#fff",fontSize:11,fontWeight:600,color:p.id===activePortId?c.ac:c.dim,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>{p.name}</button>
      ))}
      {portfolios.length<maxPortfolios&&<button onClick={()=>setScreen("account")} style={{padding:"6px 10px",borderRadius:20,border:"1.5px dashed #E8E8ED",background:"none",fontSize:11,color:c.dim,cursor:"pointer",flexShrink:0}}>+</button>}
    </div>
  ):null;

  // ── Search ──
  const Search=()=>(<>
    {hdr(<button onClick={()=>{setScreen("portfolio");setSq("")}} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button>,"Add Coin")}
    <div style={{padding:"6px 18px 10px"}}><input type="text" value={sq} onChange={e=>setSq(e.target.value)} placeholder="Search coins... (Bitcoin, ETH, SOL...)" style={inp_s} autoFocus/></div>
    {searchResults.length>0?searchResults.map(coin=>{const ad=portfolio.find(x=>x.id===coin.id);return(<div key={coin.id} style={{display:"flex",alignItems:"center",padding:"10px 18px",gap:11,opacity:ad?0.4:1}}><CI thumb={coin.thumb} symbol={coin.symbol} size={36}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{coin.name}</div><div style={{fontSize:11,color:c.dim}}>{coin.symbol}{coin.rank?" · #"+coin.rank:""}</div></div>{coin.mockPrice!=null&&<span style={{fontSize:12,fontWeight:600,marginRight:6}}>{fmtP(coin.mockPrice)}</span>}<button onClick={()=>!ad&&addCoin(coin)} disabled={ad} style={sb(ad?c.inp:c.ac,ad?c.dim:c.bg)}>{ad?"Added":"+ Add"}</button></div>)}):sq.length>=1?(<div style={{textAlign:"center",padding:"36px",color:c.dim,fontSize:13}}>No results for "{sq}"</div>):(<div style={{textAlign:"center",padding:"44px 36px",color:c.dim}}><div style={{fontSize:38,marginBottom:10}}>🔍</div><div style={{fontSize:14,fontWeight:500,color:c.txt,marginBottom:5}}>Search any coin</div><div style={{fontSize:12,lineHeight:1.5}}>Type to find any coin, live</div></div>)}
  </>);

  // ── Detail ──
  const Detail=()=>{if(!sel)return null;const coin=portfolio.find(x=>x.id===sel.id)||sel;const p=prices[coin.id];const pr=p?.usd;const ch=p?.usd_24h_change;const mc=p?.usd_market_cap;const h=Math.max(0,coin.entries.reduce((s,e)=>e.type==="sell"?s-e.amount:s+e.amount,0));const buysCost=coin.entries.filter(e=>e.type!=="sell").reduce((s,e)=>s+e.amount*e.priceAtBuy,0);const sellsGain=coin.entries.filter(e=>e.type==="sell").reduce((s,e)=>s+e.amount*e.priceAtBuy,0);const inv=buysCost-sellsGain;const v=h*(pr||0);const pnl=v-inv;const pp=inv>0?(pnl/inv)*100:0;const totalPnl=(v+sellsGain)-buysCost;const totalPnlPct=buysCost>0?((v+sellsGain-buysCost)/buysCost)*100:0;
  return(<>
    <div style={{padding:"14px 18px 6px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><button onClick={()=>{setScreen("portfolio");setSel(null);setConfirmDel(false)}} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button><span style={{fontSize:17,fontWeight:600}}>{coin.name}</span>{!confirmDel?<button onClick={()=>setConfirmDel(true)} style={{background:"none",border:"none",cursor:"pointer",padding:4}}>{Ic.trash}</button>:<button onClick={()=>{remCoin(coin.id);setConfirmDel(false)}} style={{padding:"5px 12px",borderRadius:8,border:"none",fontSize:11,fontWeight:700,cursor:"pointer",background:c.red,color:"#fff",animation:"fadeIn 0.15s"}}>Remove</button>}</div>
    <div style={{margin:"8px 16px",background:c.card,borderRadius:18,padding:"20px",textAlign:"center"}}>
      <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:8,marginBottom:8}}><CI thumb={coin.thumb} symbol={coin.symbol} size={40}/><span style={{fontSize:14,fontWeight:600,color:c.dim}}>{coin.symbol}</span></div>
      <div style={{fontSize:28,fontWeight:700}}>{fmtP(pr)}</div>
      <div style={{fontSize:13,fontWeight:600,color:ch>=0?c.ac:c.red,marginTop:3}}>{fmtPct(ch)} (24h)</div>
      {mc>0&&<div style={{fontSize:11,color:c.dim,marginTop:6}}>Market Cap: {fmtMc(mc)}</div>}
    </div>
    <div style={{margin:"0 18px",display:"flex",flexDirection:"column",gap:0,paddingBottom:10,borderBottom:`1px solid ${c.bdr}`}}>
      {(()=>{const boughtCoins=coin.entries.filter(e=>e.type!=="sell").reduce((s,e)=>s+e.amount,0);const soldCoins=coin.entries.filter(e=>e.type==="sell").reduce((s,e)=>s+e.amount,0);const avgBuy=boughtCoins>0?buysCost/boughtCoins:0;const avgSell=soldCoins>0?sellsGain/soldCoins:0;return(<>
      <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{color:c.dim,fontSize:12}}>Holding</span><span style={{fontWeight:700,fontSize:14}}>{h.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol}</span></div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{color:c.dim,fontSize:12}}>Current Value</span><span style={{fontWeight:700,fontSize:14}}>${v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
      <div style={{height:1,background:c.bdr,margin:"4px 0"}}/>
      <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{color:c.dim,fontSize:12}}>Bought</span><span style={{fontWeight:600,fontSize:13}}>{boughtCoins.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol} <span style={{color:c.dim,fontWeight:400}}>· ${buysCost.toLocaleString("en-US",{minimumFractionDigits:2})}</span></span></div>
      {avgBuy>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:c.dim,fontSize:11}}>Avg Buy Price</span><span style={{fontSize:12,color:c.dim}}>{fmtP(avgBuy)}</span></div>}
      {soldCoins>0&&<><div style={{display:"flex",justifyContent:"space-between",padding:"7px 0"}}><span style={{color:c.dim,fontSize:12}}>Sold</span><span style={{fontWeight:600,fontSize:13,color:c.red}}>{soldCoins.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol} <span style={{color:c.ac,fontWeight:400}}>· ${sellsGain.toLocaleString("en-US",{minimumFractionDigits:2})}</span></span></div>
      <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span style={{color:c.dim,fontSize:11}}>Avg Sell Price</span><span style={{fontSize:12,color:c.dim}}>{fmtP(avgSell)}</span></div></>}
      <div style={{height:1,background:c.bdr,margin:"4px 0"}}/>
      <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",background:totalPnl>=0?c.acd:c.redd,borderRadius:10,paddingLeft:10,paddingRight:10,marginTop:4}}><span style={{fontSize:13,fontWeight:600}}>Total P/L</span><span style={{fontWeight:700,fontSize:14,color:totalPnl>=0?c.ac:c.red}}>{totalPnl>=0?"+":""}${Math.abs(totalPnl).toLocaleString("en-US",{minimumFractionDigits:2})} ({fmtPct(totalPnlPct)})</span></div>
      {sellsGain>buysCost&&<div style={{padding:"6px 10px",background:c.acd,borderRadius:8,fontSize:11,color:c.ac,marginTop:6}}>Sell proceeds exceed buy costs — you already profited more than your total investment</div>}
      </>)})()}
    </div>
    <div style={{padding:"12px 18px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:14,fontWeight:600}}>Transactions ({coin.entries.length})</span><div style={{display:"flex",gap:6}}><button onClick={()=>{setEditEntry(null);setETxType("buy");const now=new Date();const nowStr=now.toISOString().slice(0,16);const hp=getHistoricalPrice(coin.id,now);const priceStr=hp&&hp>0?(hp>=1?hp.toFixed(2):hp>=0.0001?hp.toFixed(6):hp>=0.0000001?hp.toFixed(10):hp.toFixed(12)):(pr?pr.toString():"");setEPrice(priceStr);setEAmt("");setEDate(nowStr);setScreen("addEntry")}} style={sb(c.ac,c.bg)}>+ Buy</button><button onClick={()=>{setEditEntry(null);setETxType("sell");const now=new Date();const nowStr=now.toISOString().slice(0,16);const hp=getHistoricalPrice(coin.id,now);const priceStr=hp&&hp>0?(hp>=1?hp.toFixed(2):hp>=0.0001?hp.toFixed(6):hp>=0.0000001?hp.toFixed(10):hp.toFixed(12)):(pr?pr.toString():"");setEPrice(priceStr);setEAmt("");setEDate(nowStr);setScreen("addEntry")}} style={sb(c.redd,c.red)}>- Sell</button></div></div>
    {coin.entries.length===0?(<div style={{textAlign:"center",padding:"20px",color:c.dim,fontSize:12}}>No transactions yet.</div>):[...coin.entries].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(e=>{const isSell=e.type==="sell";return(<div key={e.id} onClick={()=>{setEditEntry(e);setEAmt(e.amount.toString());setEPrice(e.priceAtBuy.toString());setEDate(e.date);setETxType(e.type||"buy");setScreen("addEntry")}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 18px",borderBottom:"1px solid #F0F0F0",cursor:"pointer"}}><div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6,background:isSell?c.redd:c.acd,color:isSell?c.red:c.ac}}>{isSell?"SELL":"BUY"}</span><span style={{fontSize:13,fontWeight:600}}>{e.amount.toLocaleString("en-US",{maximumFractionDigits:8})} {coin.symbol}</span></div><div style={{fontSize:11,color:c.dim,marginTop:2,display:"flex",alignItems:"center",gap:4}}>{Ic.clock} {fmtDT(e.date)}</div><div style={{fontSize:10,color:c.dim}}>Price: {fmtP(e.priceAtBuy)} · {isSell?"Received":"Cost"}: ${(e.amount*e.priceAtBuy).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div><button onClick={(ev)=>{ev.stopPropagation();remEntry(coin.id,e.id)}} style={{background:"none",border:"none",cursor:"pointer",padding:6}}>{Ic.trash}</button></div>)})}
  </>)};

  // ── Add Entry ──
  const AddEntry=()=>{
    const coinData=sel?TOP_COINS.find(x=>x.id===sel.id):null;
    const launchDate=coinData?.launch||"2013-04-28";
    const launchDateTime=launchDate+"T00:00";
    const fmtPriceInput=(p)=>{if(!p||p<=0)return"";if(p>=1)return p.toFixed(2);if(p>=0.0001)return p.toFixed(6);if(p>=0.0000001)return p.toFixed(10);return p.toFixed(12)};
    const onDateChange=(newDate)=>{
      if(!newDate)return;
      const picked=new Date(newDate);
      const launch=new Date(launchDate);
      if(picked<launch){
        setEDate(launchDateTime);
        const hp=getHistoricalPrice(sel.id,launch);
        const formatted=fmtPriceInput(hp);
        if(formatted){setEPrice(formatted)}
        return;
      }
      setEDate(newDate);
      if(sel){const hp=getHistoricalPrice(sel.id,new Date(newDate));const fmt=fmtPriceInput(hp);if(fmt){setEPrice(fmt)}}
    };
    const histPrice=sel?getHistoricalPrice(sel.id,new Date(eDate)):null;
    const priceIsHist=histPrice&&ePrice&&Math.abs(parseFloat(ePrice)-histPrice)/histPrice<0.15;
    const isBeforeLaunch=eDate&&new Date(eDate)<new Date(launchDate);
    return(<>
    {hdr(<button onClick={()=>{setScreen("detail");setEditEntry(null)}} style={{background:"none",border:"none",cursor:"pointer",padding:0}}>{Ic.back}</button>,editEntry?"Edit Transaction":"New Transaction")}
    <div style={{padding:"12px 18px",display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:6}}>
        <button onClick={()=>setETxType("buy")} style={{flex:1,padding:"11px",borderRadius:12,border:`1px solid ${eTxType==="buy"?c.ac:c.bdr}`,background:eTxType==="buy"?c.ac:c.inp,color:eTxType==="buy"?c.bg:c.dim,fontSize:14,fontWeight:700,cursor:"pointer"}}>Buy</button>
        <button onClick={()=>setETxType("sell")} style={{flex:1,padding:"11px",borderRadius:12,border:`1px solid ${eTxType==="sell"?c.red:c.bdr}`,background:eTxType==="sell"?c.red:c.inp,color:eTxType==="sell"?"#fff":c.dim,fontSize:14,fontWeight:700,cursor:"pointer"}}>Sell</button>
      </div>
      <div><label style={lbl_s}>Amount ({sel?.symbol})</label><input type="number" step="any" value={eAmt} onChange={e=>setEAmt(e.target.value)} placeholder="0.00" style={inp_s}/></div>
      <div><label style={lbl_s}>Price per coin (USD) {histPrice?<span style={{color:c.ac,fontWeight:600}}>· auto-filled</span>:""}</label><input type="number" step="any" value={ePrice} onChange={e=>setEPrice(e.target.value)} placeholder="0.00" style={inp_s}/>
        {histPrice&&!priceIsHist&&<div style={{fontSize:10,color:c.yel,marginTop:4}}>Suggested price: {fmtP(histPrice)}</div>}
      </div>
      <div><label style={lbl_s}>Date & Time <span style={{color:c.dim,fontWeight:400}}>· available from {launchDate}</span></label><input type="datetime-local" step="1" value={eDate} min={launchDateTime} onChange={e=>onDateChange(e.target.value)} style={inp_s}/>
        {isBeforeLaunch&&<div style={{fontSize:11,color:c.yel,marginTop:5,display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:14}}>⚠️</span>{sel?.name} launched on {launchDate}. Date adjusted to earliest available.</div>}
      </div>
      {eAmt&&ePrice&&(<div style={{padding:"10px 14px",background:c.acd,borderRadius:12,fontSize:13}}>{eTxType==="sell"?"Sell value":"Total cost"}: <strong>${(parseFloat(eAmt||0)*parseFloat(ePrice||0)).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong></div>)}
      <button onClick={addEntry} disabled={!eAmt||!ePrice} style={{padding:"13px",borderRadius:12,border:"none",fontSize:15,fontWeight:600,cursor:"pointer",width:"100%",background:eTxType==="sell"?c.red:c.ac,color:eTxType==="sell"?"#fff":c.bg,opacity:(!eAmt||!ePrice)?0.4:1}}>{editEntry?"Save Changes":eTxType==="sell"?"Add Sell":"Add Buy"}</button>
    </div>
  </>);};

  // ── Coin Info ──
  const CoinInfo=()=>{
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
          const milestones=[];
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
  };

  const at=(screen==="addEntry"||screen==="detail"||screen==="coinInfo"||screen==="account")?"portfolio":screen;

  if(site.maintenance) return(<div style={{fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",background:c.bg,color:c.txt,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"40px 28px"}}>
    <div style={{fontSize:40,marginBottom:14}}>🛠️</div>
    <div style={{fontSize:24,fontWeight:700,marginBottom:8}}>We'll be right back</div>
    <div style={{fontSize:14,color:c.dim,maxWidth:320,lineHeight:1.5}}>Crypto Idea is briefly down for maintenance. Your data is safe — please check back in a little while.</div>
  </div>);

  return(<div style={{fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",background:c.bg,color:c.txt,minHeight:"100vh",maxWidth:430,margin:"0 auto",paddingBottom:78,WebkitFontSmoothing:"antialiased"}}>
    {err&&<div style={{margin:"8px 16px",padding:"10px 14px",background:"#FFF0F0",color:c.red,borderRadius:12,fontSize:12,fontWeight:500,border:"1px solid #FFD0D0"}}>{err}</div>}
    {showPlan&&screen!=="login"&&(()=>{
      // Reuse the Login() flow rendering for upgrade overlay
      // But Login() handles the showPlan branch — render it as a full overlay
      return(<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:c.bg,zIndex:9000,maxWidth:430,margin:"0 auto",overflowY:"auto"}}>
        {Login()}
      </div>);
    })()}
    {screen==="loading"&&Loading()}
    {screen==="login"&&Login()}
    {screen==="forgotPass"&&ForgotPass()}
    {screen==="contact"&&Contact()}
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
    {screen==="account"&&Account()}
    {screen==="portfolio"&&Portfolio()}
    {screen==="search"&&Search()}
    {screen==="detail"&&Detail()}
    {screen==="addEntry"&&AddEntry()}
    {screen==="coinInfo"&&CoinInfo()}
    {screen!=="login"&&screen!=="loading"&&screen!=="forgotPass"&&screen!=="contact"&&<div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,display:"flex",background:"rgba(255,255,255,0.95)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:"1px solid #E8E8ED",padding:"6px 0 22px",zIndex:100}}>
      {[{id:"portfolio",label:"Portfolio",icon:Ic.port},{id:"search",label:"Search",icon:Ic.srch}].map(tab=>(<button key={tab.id} onClick={()=>setScreen(tab.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"7px 0",cursor:"pointer",border:"none",background:"none",fontSize:10,fontWeight:600,color:at===tab.id?c.ac:c.dim}}>{tab.icon(at===tab.id)}{tab.label}</button>))}
    </div>}
  </div>);
}
