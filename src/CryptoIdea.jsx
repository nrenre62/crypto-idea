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
import { registerUser, loginUser, logoutUser, resetPassword, verifyEmail, confirmPassword, changePassword, passwordError, updateDisplayName, changeEmail, updateUserSettings, CONSENT_VERSION } from "./api/firebase-auth.js";
import { exportMyData, deleteMyAccount as apiDeleteMyAccount, restoreMyAccount as apiRestoreMyAccount, signOutEverywhere as apiSignOutEverywhere } from "./api/account.js";
import { buildPortfolioCsv } from "./utils/export-csv.js";
import {
  createPortfolio as dbCreatePortfolio,
  deletePortfolio as dbDeletePortfolio,
  addCoin as dbAddCoin,
  updateCoinJournal as dbUpdateCoinJournal,
  clearCoinJournal as dbClearCoinJournal,
  removeCoin as dbRemoveCoin,
  addTransaction as dbAddTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
} from "./api/firebase-database.js";
import { fetchSiteConfig } from "./api/config.js";
import { useCoinSearch } from "./hooks/useCoinSearch.js";
import { useTrending } from "./hooks/useTrending.js";
import { useLivePrices } from "./hooks/useLivePrices.js";
import { useAuthSession } from "./hooks/useAuthSession.js";
import { usePortfolios, DEFAULT_PORTFOLIOS } from "./hooks/usePortfolios.js";
import { useUpgrade, dueDowngrade } from "./hooks/useUpgrade.js";
import { db } from "./utils/storage.js";
import { c } from "./utils/theme.js";
import { portfolioPnl } from "./utils/pnl.js";
import { usagePercents } from "./utils/usage.js";
import { cleanFunnel } from "./utils/journal.js";
import { apiErrorMessage } from "./utils/errors.js";
import { getHistoricalPrice } from "./utils/coins.js";
import { fmtPriceInput } from "./utils/format.js";
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
import { RestoreAccount } from "./components/RestoreAccount.jsx";
import { Login } from "./components/Login.jsx";
import Research from "./features/research/Research.jsx";
import { Journal } from "./components/Journal.jsx";
import { Learn } from "./components/Learn.jsx";
// NOTE: the admin dashboard is a SEPARATE app (admin.html / admin-main.jsx) served
// at /admin — its code is intentionally NOT imported here, so the user bundle never
// contains admin functionality.

const APP_NAME = "Crypto Idea";
const APP_VERSION = "4.1.0";

// Admin is determined by a Firebase custom claim ({ admin: true }) set server-side
// via the Admin SDK — see functions/index.js (setAdminClaim) and functions/scripts/set-admin.js.
// There is intentionally no email allowlist here; the client only reads the verified token claim.

// ── Main App ──
export default function CryptoIdea(){
  const[screen,setScreen]=useState("loading");
  const[site,setSite]=useState({maintenance:false,signupsEnabled:true,plans:null});  // public config from /api/config
  const[authMode,setAuthMode]=useState("login");
  const[authEmail,setAuthEmail]=useState("");
  const[authPass,setAuthPass]=useState("");
  const[authName,setAuthName]=useState("");
  const[authErr,setAuthErr]=useState("");
  // Signup consent (USER-CREATION.md C1): Terms + Privacy required, marketing opt-in.
  const[authAgreeTerms,setAuthAgreeTerms]=useState(false);
  const[authAgreePrivacy,setAuthAgreePrivacy]=useState(false);
  const[authAgreeMarketing,setAuthAgreeMarketing]=useState(false);
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
  // Pass the admin-configured plans so the downgrade trim keeps exactly what the rules
  // allow (configured caps), not the hardcoded defaults — avoids silent data loss (U10).
  const {calcEndDate,getTrimImpact,trimToTier}=useUpgrade({portfolios,setPortfolios,plans:site.plans});
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

  // ═══ Apply the chosen theme (light / dark / system) to the document root ═══
  // settings.theme is the source of truth; "system" follows the OS preference live.
  // CSS in app.css overrides the design tokens under html[data-theme="dark"].
  useEffect(()=>{
    const pref=user?.settings?.theme||"light";
    const mq=typeof window!=="undefined"&&window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;
    const apply=()=>{
      const resolved=pref==="system"?((mq&&mq.matches)?"dark":"light"):(pref==="dark"?"dark":"light");
      document.documentElement.dataset.theme=resolved;
    };
    apply();
    if(pref==="system"&&mq&&mq.addEventListener){
      mq.addEventListener("change",apply);
      return ()=>mq.removeEventListener("change",apply);
    }
  },[user?.settings?.theme]);

  // Coin search for the Add Coin screen (built-in matches + debounced live results).
  const searchResults=useCoinSearch(sq);
  // DP-6: trending coins for the Search tab's empty state (cached /api/trending).
  const trending=useTrending();

  const showErr=(m)=>{setErr(m);setTimeout(()=>setErr(""),3000)};

  // Persist only non-sensitive profile data (tier, subscription, settings),
  // keyed by Firebase uid. Passwords are handled by Firebase Auth, never stored here.
  const saveProfile=async(u)=>{
    if(!u||!u.uid)return;
    const {uid,pass,loggedOut,...rest}=u;
    await db.set("ci-profile-"+uid,rest);
  };

  // Send a password-reset email. Always reports success (anti-enumeration),
  // surfacing only a network error. Lives here (not in ForgotPass) so that
  // screen is presentation-only, consistent with Login's handleAuth.
  const handleReset=async()=>{
    const emailRegex=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!fpEmail){setFpErr("Enter your email");return}
    if(!emailRegex.test(fpEmail)){setFpErr("Enter a valid email");return}
    const res=await resetPassword(fpEmail.toLowerCase().trim());
    if(!res.success&&res.error&&res.error.indexOf("Network")!==-1){setFpErr(res.error);return}
    setResetSent(true);setFpErr("");
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
      const pErr=passwordError(authPass);   // single source of truth (shared with change-password)
      if(pErr){setAuthErr(pErr);return}
      if(!authName){setAuthErr("Enter your name");return}
      if(!nameRegex.test(authName.trim())){setAuthErr("Name: letters only, 2-30 characters");return}
      if(!authAgreeTerms||!authAgreePrivacy){setAuthErr("Please accept the Terms and Privacy Policy to continue");return}
      const em=authEmail.toLowerCase().trim();
      // Create the account in Firebase Auth (password is stored securely by Firebase, never locally).
      // Consent record (mandatory Terms/Privacy + the withdrawable marketing opt-in) is written atomically.
      const res=await registerUser(em,authPass,authName.trim(),{termsVersion:CONSENT_VERSION,privacyVersion:CONSENT_VERSION,marketing:authAgreeMarketing});
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
    // C-R2a: clear this device's cached local data (active-portfolio id + cached profile) so the next
    // account signing in on a shared device doesn't inherit it.
    const uid=user?.uid;
    db.del("ci-active-port"); if(uid) db.del("ci-profile-"+uid);
    await logoutUser();
    setUser(null);setPortfolios(DEFAULT_PORTFOLIOS);setActivePortId("default");setScreen("login");setAuthEmail("");setAuthPass("");setAuthName("");setAuthAgreeTerms(false);setAuthAgreePrivacy(false);setAuthAgreeMarketing(false);setDelConfirm(false);setDelPass("");setDelType("");setPwCur("");setPwNew("");setPwMsg("");setProfMsg("");setEmNew("");setEmPass("");setEmMsg("")};

  // ── Self-service privacy (GDPR/CCPA): export + delete your own data ──
  const [acctBusy,setAcctBusy]=useState(false);
  const [acctMsg,setAcctMsg]=useState("");
  const [delConfirm,setDelConfirm]=useState(false);
  // Account-delete friction (S6): re-auth (password) + type-DELETE before the callable.
  const [delPass,setDelPass]=useState("");
  const [delType,setDelType]=useState("");
  // Security card (S7): change password (behind re-auth) + sign out everywhere.
  const [pwCur,setPwCur]=useState("");
  const [pwNew,setPwNew]=useState("");
  const [pwMsg,setPwMsg]=useState("");
  // Profile card (U7): editable display name + change-email (verify-before-update).
  const [profName,setProfName]=useState("");
  const [profMsg,setProfMsg]=useState("");
  const [emNew,setEmNew]=useState("");
  const [emPass,setEmPass]=useState("");
  const [emMsg,setEmMsg]=useState("");
  // Keep the name field in sync with the loaded/updated profile name.
  useEffect(()=>{ if(user?.name) setProfName(user.name); },[user?.name]);
  const saveDisplayName=async()=>{
    setProfMsg("");
    const res=await updateDisplayName(profName);
    if(res.success){setUser(u=>u?{...u,name:res.name}:u);setProfMsg("Name updated ✓");}
    else setProfMsg(res.error||"Couldn't update name");
  };
  const requestEmailChange=async()=>{
    setEmMsg("");
    if(!emPass){setEmMsg("Enter your current password");return}
    if(!emNew){setEmMsg("Enter the new email");return}
    setAcctBusy(true);
    const res=await changeEmail(emPass,emNew);
    setAcctBusy(false);
    if(res.success){setEmNew("");setEmPass("");setEmMsg("Check your new inbox to confirm the change.");}
    else setEmMsg(res.error||"Couldn't change email");
  };
  // Auto-save a single preference toggle (notifications / withdrawable consents) to the
  // validated settings map. Optimistic: update the UI immediately, then persist.
  const toggleSetting=async(key,value)=>{
    if(!user?.uid)return;
    setUser(u=>u?{...u,settings:{...(u.settings||{}),[key]:value}}:u);
    await updateUserSettings(user.uid,{[key]:value});
  };
  // Email-verify nudge (USER-CREATION.md §5): dismissible banner + resend.
  const [verifyDismissed,setVerifyDismissed]=useState(false);
  const [verifyMsg,setVerifyMsg]=useState("");
  const resendVerification=async()=>{
    setVerifyMsg("Sending…");
    const res=await verifyEmail();
    setVerifyMsg(res.success?"Verification email sent ✓":(res.error||"Couldn't send — try again"));
  };
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
  const downloadCsv=async()=>{
    setAcctBusy(true);setAcctMsg("");
    try{
      const data=await exportMyData();
      const csv=buildPortfolioCsv(data);
      // Prepend a UTF-8 BOM so Excel opens the file with the right encoding.
      const blob=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="crypto-idea-portfolio.csv";a.click();
      URL.revokeObjectURL(url);
      setAcctMsg("Downloaded ✓");
    }catch(e){setAcctMsg((e&&e.message)||"Export failed");}
    setAcctBusy(false);
  };
  const deleteMyAccount=async()=>{
    // S6: irreversible action → type-the-word + fresh re-auth. The re-auth blocks an
    // open/hijacked session from deleting; the type-DELETE blocks a fat-finger.
    if(delType!=="DELETE"){setAcctMsg('Type DELETE to confirm');return}
    if(!delPass){setAcctMsg("Enter your password to confirm");return}
    setAcctBusy(true);setAcctMsg("");
    try{
      await confirmPassword(delPass);                 // throws on wrong pw / stale session
    }catch(e){
      setAcctBusy(false);
      setAcctMsg("Re-authentication failed — check your password and try again.");
      return;
    }
    try{
      const res=await apiDeleteMyAccount();           // soft delete (kept in trash ~30 days)
      const days=(res&&res.graceDays)||30;
      await logoutUser();
      setUser(null);setDelConfirm(false);setDelPass("");setDelType("");setAcctBusy(false);setScreen("login");
      // Toast persists across the screen change so the user sees the recovery window.
      showErr(`Account deleted. You can restore it within ${days} days by logging back in — after that it's gone forever.`);
    }catch(e){setAcctMsg((e&&e.message)||"Delete failed");setAcctBusy(false);}
  };
  // Back out of the delete flow, clearing the sensitive inputs.
  const cancelDelete=()=>{setDelConfirm(false);setDelPass("");setDelType("");setAcctMsg("")};
  // Change password in-app, behind re-auth (S6/S7). Firebase auto-revokes other
  // sessions on a password change, so this doubles as a sign-out-everywhere.
  const changeMyPassword=async()=>{
    setPwMsg("");
    const pe=passwordError(pwNew);
    if(pe){setPwMsg(pe);return}
    if(!pwCur){setPwMsg("Enter your current password");return}
    setAcctBusy(true);
    const res=await changePassword(pwCur,pwNew);
    setAcctBusy(false);
    if(res.success){setPwCur("");setPwNew("");setPwMsg("Password changed ✓ — other devices were signed out.");}
    else setPwMsg(res.error||"Couldn't change password");
  };
  // Sign out of ALL devices via the revoke-refresh-tokens callable (S7), then sign
  // this device out too and return to login.
  const signOutEverywhere=async()=>{
    setPwMsg("");setAcctBusy(true);
    try{
      await apiSignOutEverywhere();
      await logoutUser();
      setUser(null);setAcctBusy(false);setScreen("login");
      showErr("Signed out of all devices. Please sign in again.");
    }catch(e){setAcctBusy(false);setPwMsg((e&&e.message)||"Couldn't sign out everywhere");}
  };
  // Restore the caller's own soft-deleted account (within the 30-day window).
  const restoreAccount=async()=>{
    setAcctBusy(true);setAcctMsg("");
    try{
      await apiRestoreMyAccount();
      setUser(u=>u?{...u,deleted:false,deletedAt:null}:u);
      setAcctBusy(false);setScreen("portfolio");
    }catch(e){setAcctMsg((e&&e.message)||"Couldn't restore — the window may have passed.");setAcctBusy(false);}
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
  const maxPortfolios=isPremium?(premLimits.portfolios||_planLim("portfolios",15)):_planLim("portfolios",isPro?3:1);
  const maxCoinsPerPort=isPremium?(premLimits.coins||_planLim("coins",1000)):_planLim("coins",isPro?50:10);
  const maxTxPerCoin=isPremium?(premLimits.transactions||_planLim("transactions",5000)):_planLim("transactions",isPro?2000:50);
  // AI research allowance (server-authoritative): the tier's monthly $-budget for live
  // AI, in cents, from /api/config plans (free 0 / pro 400 / premium 2500). Informational
  // until the B2 enforcement counter ships; each analysis costs ~1¢ (so cents≈analyses).
  const aiMonthlyCents=_planLim("aiMonthlyCents",isPremium?2500:isPro?400:0);


  // Returns true on success so callers (the R9-3 in-tab dialog) can close on success;
  // Account's add field ignores the return — backward-compatible.
  const addPortfolio=async()=>{
    if(portfolios.length>=maxPortfolios){showErr(isPro?("Max "+maxPortfolios+" portfolios"):"Starter: 1 portfolio — upgrade to Pro for 3");return false}
    if(!newPortName.trim()){showErr("Enter a portfolio name");return false}
    if(!user?.uid){showErr("Please sign in again");return false}
    const res=await dbCreatePortfolio(user.uid,newPortName.trim(),portfolios.length);
    if(!res.success){showErr(apiErrorMessage(res,"Couldn't create portfolio. Check your connection.","You've reached your plan's portfolio limit — upgrade for more."));return false}
    const np={id:res.id,name:newPortName.trim(),coins:[]};
    setPortfolios(prev=>[...prev,np]);setActivePortId(res.id);setNewPortName("");return true};

  const deletePortfolio=async(pid)=>{
    if(portfolios.length<=1){showErr("Need at least 1 portfolio");return}
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbDeletePortfolio(user.uid,pid);
    if(!res.success){showErr(apiErrorMessage(res,"Couldn't delete portfolio. Check your connection."));return}
    setPortfolios(prev=>prev.filter(p=>p.id!==pid));
    if(activePortId===pid){setActivePortId(portfolios.find(p=>p.id!==pid)?.id||"default")}};

  const addCoin=async(c,journal=null)=>{
    if(portfolio.find(x=>x.id===c.id)){showErr("Already added");return}
    const lim=maxCoinsPerPort;
    if(portfolio.length>=lim){showErr(isPro?"Max "+maxCoinsPerPort+" coins per portfolio":"Starter: "+maxCoinsPerPort+" coins — upgrade to Pro for 50");return}
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbAddCoin(user.uid,activePortId,{id:c.id,symbol:c.symbol,name:c.name,thumb:c.thumb},journal);
    if(!res.success){showErr(apiErrorMessage(res,"Couldn't add coin. Check your connection.","You've reached this portfolio's coin limit — upgrade for more."));return}
    setPortfolio(p=>[...p,{id:c.id,symbol:c.symbol,name:c.name,thumb:c.thumb,entries:[],...(journal?{journal}:{})}]);setScreen("portfolio");setSq("")};
  // Record the "is your thesis still intact?" review decision (intact|review|challenged)
  // by merging the new status into the coin's existing journal.
  const reviewThesis=async(coinId,status)=>{
    const coin=portfolio.find(x=>x.id===coinId);
    if(!coin||!coin.journal)return;
    if(!user?.uid){showErr("Please sign in again");return}
    const journal={...coin.journal,status};
    const res=await dbUpdateCoinJournal(user.uid,activePortId,coinId,journal);
    if(!res.success){showErr(apiErrorMessage(res,"Couldn't save. Check your connection."));return}
    setPortfolio(p=>p.map(x=>x.id===coinId?{...x,journal}:x));};
  // Record/replace the manual-research funnel findings (#27) on a coin's journal.
  // Cleans the raw inputs; an all-empty funnel drops the key entirely.
  const saveFunnel=async(coinId,funnelInput)=>{
    const coin=portfolio.find(x=>x.id===coinId);
    if(!coin||!coin.journal)return false;
    if(!user?.uid){showErr("Please sign in again");return false}
    const f=cleanFunnel(funnelInput);
    const journal={...coin.journal};
    if(f)journal.funnel=f;else delete journal.funnel;
    const res=await dbUpdateCoinJournal(user.uid,activePortId,coinId,journal);
    if(!res.success){showErr(apiErrorMessage(res,"Couldn't save. Check your connection."));return false}
    setPortfolio(p=>p.map(x=>x.id===coinId?{...x,journal}:x));return true;};
  // Write a thesis for a coin that was added without one (Journal "Needs a thesis").
  // Builds the full journal object (same shape as the Buy-Journal prompt) and persists
  // it via updateCoinJournal — no new collection/schema. Returns false (no-op) if the
  // user typed nothing.
  const addThesis=async(coinId,input)=>{
    const coin=portfolio.find(x=>x.id===coinId);
    if(!coin)return false;
    if(!user?.uid){showErr("Please sign in again");return false}
    const t=(input?.thesis||"").trim(),m=(input?.changeMyMind||"").trim();
    const f=cleanFunnel(input?.funnel||{});
    if(!t&&!m&&!f)return false;
    const journal={thesis:t,changeMyMind:m,status:"intact",priceAtAdd:prices[coinId]?.usd||0,createdAt:new Date().toISOString(),...(f?{funnel:f}:{})};
    const res=await dbUpdateCoinJournal(user.uid,activePortId,coinId,journal);
    if(!res.success){showErr(apiErrorMessage(res,"Couldn't save. Check your connection."));return false}
    setPortfolio(p=>p.map(x=>x.id===coinId?{...x,journal}:x));return true;};
  // Edit an EXISTING thesis (§J1): update the two questions + funnel, preserving the
  // original status/createdAt/priceAtAdd. Both questions required (the form validates).
  const editThesis=async(coinId,input)=>{
    const coin=portfolio.find(x=>x.id===coinId);
    if(!coin||!coin.journal)return false;
    if(!user?.uid){showErr("Please sign in again");return false}
    const t=(input?.thesis||"").trim(),m=(input?.changeMyMind||"").trim();
    if(!t||!m)return false;
    const f=cleanFunnel(input?.funnel||coin.journal.funnel||{});
    const journal={...coin.journal,thesis:t,changeMyMind:m};
    if(f)journal.funnel=f;else delete journal.funnel;
    const res=await dbUpdateCoinJournal(user.uid,activePortId,coinId,journal);
    if(!res.success){showErr(apiErrorMessage(res,"Couldn't save. Check your connection."));return false}
    setPortfolio(p=>p.map(x=>x.id===coinId?{...x,journal}:x));return true;};
  // Delete a thesis (§J2): clears the coin's journal so it returns to "Needs a thesis".
  // The coin/holding stays.
  const deleteThesis=async(coinId)=>{
    const coin=portfolio.find(x=>x.id===coinId);
    if(!coin)return false;
    if(!user?.uid){showErr("Please sign in again");return false}
    const res=await dbClearCoinJournal(user.uid,activePortId,coinId);
    if(!res.success){showErr(apiErrorMessage(res,"Couldn't delete. Check your connection."));return false}
    setPortfolio(p=>p.map(x=>{if(x.id!==coinId)return x;const c={...x};delete c.journal;return c;}));return true;};
  const remCoin=async(id)=>{
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbRemoveCoin(user.uid,activePortId,id);
    if(!res.success){showErr(apiErrorMessage(res,"Couldn't remove coin. Check your connection."));return}
    setPortfolio(p=>p.filter(c=>c.id!==id));if(sel?.id===id){setSel(null);setScreen("portfolio")}};
  // R4-2: open the Add-transaction form for a coin from Detail's Buy/Sell buttons.
  // Mirrors the price/date prefill so a new transaction starts ready to fill. One
  // source of truth for "start a new transaction" (Detail returns here on back/save).
  const startAddTx=(coin,type="buy")=>{
    if(!coin)return;
    setSel(coin);setEditEntry(null);setETxType(type);
    const now=new Date();const hp=getHistoricalPrice(coin.id,now);const pr=prices[coin.id]?.usd;
    setEPrice(fmtPriceInput(hp)||(pr?pr.toString():""));setEAmt("");setEDate(now.toISOString().slice(0,16));
    setScreen("addEntry");
  };
  const addEntry=async()=>{if(!eAmt||!ePrice)return;
    // R10-2b: only positive numbers (rules enforce amount>0 / priceAtBuy>=0). Catch it
    // here with a clear message BEFORE any write, so a negative/zero never reaches the
    // server and gets mislabelled as the "transaction limit" error (the B-PORT class).
    const _amt=parseFloat(eAmt),_prc=parseFloat(ePrice);
    if(!(_amt>0)){showErr("Amount must be a positive number.");return}
    if(!(_prc>0)){showErr("Price must be a positive number.");return}
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
      if(!res.success){showErr(apiErrorMessage(res,"Couldn't save transaction. Check your connection.","You've reached this coin's transaction limit — upgrade for more."));return}
      const updated={...editEntry,...txData};
      setPortfolio(p=>p.map(c=>c.id===sel.id?{...c,entries:c.entries.map(e=>e.id===editEntry.id?updated:e)}:c));
      setSel(p=>({...p,entries:p.entries.map(e=>e.id===editEntry.id?updated:e)}));
    }else{
      const txData={type:eTxType,amount:parseFloat(eAmt),priceAtBuy:parseFloat(ePrice),date:eDate};
      const res=await dbAddTransaction(user.uid,activePortId,sel.id,txData);
      if(!res.success){showErr(apiErrorMessage(res,"Couldn't add transaction. Check your connection.","You've reached this coin's transaction limit — upgrade for more."));return}
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
    if(!res.success){showErr(apiErrorMessage(res,"Couldn't delete transaction. Check your connection."));return}
    setPortfolio(p=>p.map(c=>c.id===cid?{...c,entries:c.entries.filter(e=>e.id!==eid)}:c));setSel(p=>p?{...p,entries:p.entries.filter(e=>e.id!==eid)}:p)};


  const { value:tv, totalBuys, pnl:tpnl, pnlPct:tpp } = portfolioPnl(portfolio, prices);

  // ── Usage Calculation ── (pure math in utils/usage.js)
  const { usagePct } = usagePercents(portfolio.length, portfolios, { maxCoinsPerPort, maxPortfolios, maxTxPerCoin });

  // ── Subscription Helpers ──
  // calcEndDate / getTrimImpact / trimToTier now live in useUpgrade (above).
  const fmtDate=(d)=>new Date(d).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});

  // Check on app load whether the subscription expired or payment failed. The
  // decision (which tier, or none) is pure logic in useUpgrade.dueDowngrade; this
  // only orchestrates the side effects (trim stored data + persist the profile).
  const checkSubscriptionStatus=async(u)=>{
    if(!u||!u.subscription)return u;
    const target=dueDowngrade(u.subscription,new Date());
    if(!target)return u;
    trimToTier(target);
    const updated={...u,tier:target,subscription:null};
    await saveProfile(updated);
    return updated;
  };

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

  if(site.maintenance) return(<div style={{fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",background:"var(--app-bg)",color:"var(--app-fg)",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"40px 28px"}}>
    <div style={{fontSize:40,marginBottom:14}}>🛠️</div>
    <div style={{fontSize:24,fontWeight:700,marginBottom:8}}>We'll be right back</div>
    <div style={{fontSize:14,color:c.dim,maxWidth:320,lineHeight:1.5}}>Crypto Idea is briefly down for maintenance. Your data is safe — please check back in a little while.</div>
  </div>);

  // Shared state + handlers for extracted screens (grows as screens migrate).
  const ctx={api,setScreen,fpEmail,setFpEmail,fpErr,setFpErr,resetSent,setResetSent,handleReset,
    user,contactMsg,setContactMsg,contactSent,setContactSent,
    sq,setSq,searchResults,trending,portfolio,addCoin,reviewThesis,saveFunnel,addThesis,editThesis,deleteThesis,
    sel,setSel,eAmt,setEAmt,ePrice,setEPrice,eDate,setEDate,eTxType,setETxType,editEntry,setEditEntry,addEntry,
    startAddTx,
    infoCoin,setInfoCoin,prices,
    confirmDel,setConfirmDel,remCoin,remEntry,
    tv,totalBuys,tpnl,tpp,maxCoinsPerPort,usagePct,maxPortfolios,isPro,isPremium,startUpgrade,
    portfolios,setActivePortId,activePortId,
    maxTxPerCoin,aiMonthlyCents,startDowngrade,fmtDate,deletePortfolio,newPortName,setNewPortName,addPortfolio,
    downloadMyData,downloadCsv,acctBusy,deleteMyAccount,restoreAccount,delConfirm,setDelConfirm,acctMsg,logout,
    delPass,setDelPass,delType,setDelType,cancelDelete,
    pwCur,setPwCur,pwNew,setPwNew,pwMsg,changeMyPassword,signOutEverywhere,
    profName,setProfName,profMsg,saveDisplayName,emNew,setEmNew,emPass,setEmPass,emMsg,requestEmailChange,toggleSetting,
    showPlan,showWelcome,upgradeStep,setUpgradeStep,upgradeFlow,setUpgradeFlow,setShowPlan,setShowWelcome,
    upgradeBilling,setUpgradeBilling,setUser,saveProfile,calcEndDate,
    authMode,setAuthMode,authErr,setAuthErr,authName,setAuthName,authEmail,setAuthEmail,authPass,setAuthPass,handleAuth,site,
    authAgreeTerms,setAuthAgreeTerms,authAgreePrivacy,setAuthAgreePrivacy,authAgreeMarketing,setAuthAgreeMarketing};
  // Responsive shell: tab screens render inside a centered column (.app-shell) that
  // widens on desktop. Card-collection screens opt into the wider 1040px track as
  // their grids land (§R). Same markup mobile↔desktop — no @media needed.
  const WIDE_SCREENS=new Set(["portfolio","research","journal","learn","search"]); // all 5 tab screens share the 1040 track so they're the same width on desktop
  const NARROW_SCREENS=new Set(["detail","addEntry","coinInfo"]); // forms/detail read better narrower
  const TAB_SCREENS=new Set(["portfolio","research","journal","learn","search"]); // bottom-nav tabs get the persistent account avatar
  const acctInitial=(user?.name||user?.email||"C").trim().charAt(0).toUpperCase();
  return(<AppContext.Provider value={ctx}><div style={{fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",background:"var(--app-bg)",color:"var(--app-fg)",minHeight:"100vh",maxWidth:1040,margin:"0 auto",paddingBottom:78,WebkitFontSmoothing:"antialiased"}}>
    {/* Floating toast: fixed so a limit/error message is always visible, even when the action
        (e.g. "Add portfolio" on the scrolled Account screen) is far below the top of the page. */}
    {err&&<div role="alert" style={{position:"fixed",top:10,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 32px)",maxWidth:398,padding:"12px 16px",background:"#FFF0F0",color:c.red,borderRadius:12,fontSize:13,fontWeight:600,border:"1px solid #FFD0D0",boxShadow:"0 6px 24px rgba(0,0,0,0.15)",zIndex:9500,textAlign:"center"}}>{err}</div>}
    {showPlan&&screen!=="login"&&(()=>{
      // Reuse the Login() flow rendering for upgrade overlay
      // But Login() handles the showPlan branch — render it as a full overlay
      return(<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:c.bg,zIndex:9000,overflowY:"auto",display:"flex",justifyContent:"center"}}>
        <div style={{width:"100%",maxWidth:430}}><Login/></div>
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
        <div className="dg-sheet" style={{background:"#fff",borderTopLeftRadius:24,borderTopRightRadius:24,padding:"24px 22px 32px",width:"100%",maxWidth:430}}>
          <div style={{width:36,height:4,background:"#E8E8ED",borderRadius:2,margin:"0 auto 18px"}}/>
          <div style={{fontSize:20,fontWeight:700,marginBottom:8}}>Downgrade to {targetLabel}?</div>
          <div style={{fontSize:13,color:c.dim,lineHeight:1.6,marginBottom:18}}>Your subscription is paid until the end of the period. You'll keep your current access until then. After that date, your account will be downgraded.</div>

          <div className="dg-ends" style={{padding:"12px 14px",borderRadius:12,background:"#FFF0F0",border:"1px solid #FFE0E0",marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:700,color:c.red,marginBottom:4}}>SUBSCRIPTION ENDS</div>
            <div style={{fontSize:15,fontWeight:700,color:c.red}}>{fmtDate(endDate)}</div>
            <div style={{fontSize:11,color:c.dim,marginTop:4}}>You'll have full access until this date</div>
          </div>

          {impact&&(impact.portsToDelete>0||impact.coinsToDelete>0||impact.txToDelete>0)&&(
            <div className="dg-warn" style={{padding:"14px",borderRadius:12,background:"#FFF8E1",border:"1px solid #FFE082",marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:"#F59E0B",marginBottom:8}}>⚠ DATA THAT WILL BE DELETED</div>
              <div className="dg-warn-text" style={{fontSize:12,color:"#92400E",lineHeight:1.7}}>
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
            <button className="dg-keep" onClick={()=>setDowngradeTo(null)} style={{flex:1,padding:"14px",borderRadius:14,border:"1px solid #E8E8ED",background:"#fff",color:c.txt,fontSize:14,fontWeight:600,cursor:"pointer"}}>Keep My Plan</button>
            <button onClick={confirmDowngrade} style={{flex:1,padding:"14px",borderRadius:14,border:"none",background:c.red,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Confirm Downgrade</button>
          </div>
        </div>
      </div>);
    })()}
    {/* A soft-deleted (trashed) user sees only the restore screen — never the app. */}
    {user?.deleted&&screen!=="login"&&screen!=="loading"?<RestoreAccount/>:<>
    <div className={"ci-app app-shell"+(WIDE_SCREENS.has(screen)?" app-shell-wide":NARROW_SCREENS.has(screen)?" app-shell-narrow":"")}>
    {user&&user.emailVerified===false&&!verifyDismissed&&!["login","loading","forgotPass","contact"].includes(screen)&&(
      <div className="verify-banner" role="status">
        <span className="vb-text">📧 Verify your email to secure your account.{verifyMsg?" "+verifyMsg:""}</span>
        <span className="vb-actions">
          <button className="vb-resend" onClick={resendVerification}>Resend</button>
          <button className="vb-x" aria-label="Dismiss" onClick={()=>setVerifyDismissed(true)}>✕</button>
        </span>
      </div>
    )}
    <div className="screen-wrap">
    {TAB_SCREENS.has(screen)&&(
      <button className="avatar app-avatar" onClick={()=>setScreen("account")} aria-label="Account">{acctInitial}</button>
    )}
    {screen==="account"&&<Account/>}
    {screen==="portfolio"&&<Portfolio/>}
    {screen==="search"&&<Search/>}
    {screen==="detail"&&<Detail/>}
    {screen==="addEntry"&&<AddEntry/>}
    {screen==="coinInfo"&&<CoinInfo/>}
    {screen==="research"&&<Research/>}
    {screen==="journal"&&<Journal/>}
    {screen==="learn"&&<Learn/>}
    </div>
    </div>
    {screen!=="login"&&screen!=="loading"&&screen!=="forgotPass"&&screen!=="contact"&&(
      <nav className="ci-app tabbar">
        {[
          {id:"portfolio",label:"Portfolio",icon:(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>)},
          {id:"research",label:"Research",icon:(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>)},
          {id:"journal",label:"Journal",icon:(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M8 7h8M8 11h6"/></svg>)},
          {id:"learn",label:"Learn",icon:(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>)},
          {id:"search",label:"Search",icon:(<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>)},
        ].map(tab=>(<button key={tab.id} className={"tb"+(at===tab.id?" active":"")} onClick={()=>setScreen(tab.id)}>{tab.icon}{tab.label}</button>))}
      </nav>
    )}
    </>}
  </div></AppContext.Provider>);
}
