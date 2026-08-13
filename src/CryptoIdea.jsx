/**
 * CryptoIdea - Crypto Portfolio & DCA Calculator
 * Version: 1.6.0
 * Build: 2026-04-04
 * Author: CryptoIdea Team
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
import { useState, useEffect, useCallback, useMemo, useRef } from "react";

// Firebase Authentication — passwords are handled by Firebase and never stored on the device.
import { registerUser, loginUser, logoutUser, resetPassword, verifyEmail, confirmPassword, changePassword, passwordError, updateDisplayName, changeEmail, updateUserSettings, CONSENT_VERSION } from "./api/firebase-auth.js";
import { exportMyData, deleteMyAccount as apiDeleteMyAccount, restoreMyAccount as apiRestoreMyAccount, signOutEverywhere as apiSignOutEverywhere, devSetMyTier, reconcileMyCounters as apiReconcileMyCounters, resolveRecheckout as apiResolveRecheckout, reactivateSubscription as apiReactivateSubscription, chooseFreePlan as apiChooseFreePlan } from "./api/account.js";
import { cancelSubscription as apiCancelSubscription, scheduleProDowngrade as apiScheduleProDowngrade } from "./api/billing.js";
import { buildPortfolioCsv } from "./utils/export-csv.js";
import { CSV_BOM } from "./utils/csv.js";
import {
  createPortfolio as dbCreatePortfolio,
  deletePortfolio as dbDeletePortfolio,
  updatePortfolioName as dbUpdatePortfolioName,
  updateCoinOrder as dbUpdateCoinOrder,
  addCoin as dbAddCoin,
  updateCoinJournal as dbUpdateCoinJournal,
  clearCoinJournal as dbClearCoinJournal,
  removeCoin as dbRemoveCoin,
  addTransaction as dbAddTransaction,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
  watchCoins as dbWatchCoins,
  watchUserDoc as dbWatchUserDoc,
} from "./api/firebase-database.js";
import { fetchSiteConfig } from "./api/config.js";
import AnnouncementBanner from "./components/AnnouncementBanner.jsx";
import { useCoinSearch } from "./hooks/useCoinSearch.js";
import { useTrending } from "./hooks/useTrending.js";
import { useLivePrices } from "./hooks/useLivePrices.js";
import { useAuthSession } from "./hooks/useAuthSession.js";
import { usePortfolios, DEFAULT_PORTFOLIOS } from "./hooks/usePortfolios.js";
import { useUpgrade, dueDowngrade, lockedPortfolioIds, lockedCoinIds } from "./hooks/useUpgrade.js";
import { useIsDesktop } from "./hooks/useIsDesktop.js";
import { db } from "./utils/storage.js";
import { c } from "./utils/theme.js";
import { portfolioPnl } from "./utils/pnl.js";
import { usagePercents } from "./utils/usage.js";
import { cleanFunnel } from "./utils/journal.js";
import { apiErrorMessage } from "./utils/errors.js";
import { getHistoricalPrice } from "./utils/coins.js";
import { fmtPriceInput } from "./utils/format.js";
import { appendUnique, firstOverSoldSell, isFutureTx } from "./utils/tx.js";
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
import { Login, PLAN_BENEFITS } from "./components/Login.jsx";
import { Modal } from "./components/Modal.jsx";   // Round 15: shared centered-card popup
import Research from "./features/research/Research.jsx";
import { Journal } from "./components/Journal.jsx";
import { Learn } from "./components/Learn.jsx";
// NOTE: the admin dashboard is a SEPARATE app (admin.html / admin-main.jsx) served
// at /admin — its code is intentionally NOT imported here, so the user bundle never
// contains admin functionality.

const APP_VERSION = "4.1.0";

// Admin is determined by a Firebase custom claim ({ admin: true }) set server-side
// via the Admin SDK — see functions/index.js (setAdminClaim) and functions/scripts/set-admin.js.
// There is intentionally no email allowlist here; the client only reads the verified token claim.

// CRYP-101 (LAUNCH-FREE Part B): the neutral placeholder shown in the plan modal while a
// forced new user's free choice is auto-recorded (paid plans off site-wide). Deliberately
// carries NO plan cards, so the chooser never flashes. Scoped under .ci-app like the rest
// of the user app; no new CSS class (inline layout only).
function SettingUpFree(){
  return(<div className="ci-app" style={{padding:"48px 28px",textAlign:"center",color:"var(--app-fg)"}}>
    <div style={{fontWeight:600,fontSize:16,marginBottom:6}}>Setting up your account…</div>
    <div style={{fontSize:13,opacity:.7}}>Just a moment.</div>
  </div>);
}

// ── Main App ──
export default function CryptoIdea(){
  const[screen,setScreen]=useState("loading");
  // Public config from /api/config. ADMIN-2: `features` defaults to all-ON for the same
  // reason the server does — if the config fetch fails we must degrade to a WORKING app,
  // never to one that looks deliberately switched off.
  const[site,setSite]=useState({maintenance:false,signupsEnabled:true,paidPlansEnabled:true,plans:null,announcement:null,features:{marketData:true,checkout:true,aiResearch:true}});
  const[authMode,setAuthMode]=useState("login");
  const[authEmail,setAuthEmail]=useState("");
  const[authPass,setAuthPass]=useState("");
  const[authName,setAuthName]=useState("");
  const[authErr,setAuthErr]=useState("");
  // AUTH-DUP (Part A): in-flight re-entry guard + busy state for Log in / Create Account.
  // A double-click (or Enter twice) before the async auth call resolves must not fire a
  // second registerUser/loginUser — in the Auth emulator that second concurrent create is
  // what produced the duplicate `mark@test.com` rows. The ref blocks the SAME-TICK re-entry
  // (a state update is async and wouldn't apply in time); authBusy disables the submit
  // button + the Enter-key resubmit (Login.jsx). Same pattern as TX-SAFE Part B's addingRef.
  const authBusyRef=useRef(false);
  const[authBusy,setAuthBusy]=useState(false);
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
  const[showDowngradeChooser,setShowDowngradeChooser]=useState(false);  // R29-1: Premium picks Pro or Starter
  // PR-C2: the Premium-downgrade chooser flow — pick (select a target) → warn (what you'll
  // lose). Starter ends in Confirm (schedules the server cancellation to free). Pro reinstates
  // a REAL approve step: Continue → cycle (pick a billing cycle) → "Pay with PayPal", which
  // schedules a genuine future-start Pro sub (scheduleProDowngrade) and, in prod, redirects to
  // PayPal's approval URL. (PR-C1 had collapsed the Pro branch to a plain Confirm interim.)
  const[dgStep,setDgStep]=useState("pick");   // pick | warn | cycle
  const[dgSel,setDgSel]=useState(null);       // "pro" | "free" — the selected downgrade target
  const[dgCycle,setDgCycle]=useState("monthly");  // scheduled-Pro billing cycle (chooser default; upgradeBilling defaults yearly elsewhere)
  const[dgPayErr,setDgPayErr]=useState("");   // PR-C2: the scheduled-Pro approval error surface (mirrors Login's payErr)
  const[showWelcome,setShowWelcome]=useState(null);  // null | "free" | "pro" | "premium"
  const[showPaymentFailedSim,setShowPaymentFailedSim]=useState(false);
  // DI-2: a persistent portfolio-load failure surfaces a Retry screen instead of
  // silently stranding the session on the phantom local "default" portfolio.
  const[portfoliosError,setPortfoliosError]=useState(false);
  const {portfolios,setPortfolios,activePortId,setActivePortId,portfolio,setPortfolio}=usePortfolios();
  // Subscription/tier-limit logic (end-date, downgrade impact + trim). UI flow state
  // for the upgrade overlay stays here (shared with the auth/Login flow) — see useUpgrade.
  // Pass the admin-configured plans so the downgrade trim keeps exactly what the rules
  // allow (configured caps), not the hardcoded defaults — avoids silent data loss (U10).
  const {calcEndDate,overLimitImpact}=useUpgrade({portfolios,plans:site.plans});
  const[showPortManager,setShowPortManager]=useState(false);
  const[newPortName,setNewPortName]=useState("");
  // R31-1: one place to tear down any open plan/upgrade/downgrade overlay. Called
  // when a session ends (so a dead session never shows the picker with an empty name
  // or a full-screen flip — ERRORS §A5) and on explicit logout.
  const resetPlanOverlay=()=>{setShowPlan(false);setUpgradeFlow(null);setUpgradeStep("billing");setShowWelcome(null);setDowngradeTo(null);setShowDowngradeChooser(false)};
  // Auth session: owns user/dataLoaded + the auth-watch & profile-save effects.
  // Collaborators are passed as thin wrappers so functions defined lower in this
  // component (saveProfile, checkSubscriptionStatus) are referenced lazily.
  const {user,setUser,dataLoaded,reloadPortfolios}=useAuthSession({
    setScreen,setPortfolios,setActivePortId,setPortfoliosError,
    checkSubscriptionStatus:(u)=>checkSubscriptionStatus(u),
    saveProfile:(u)=>saveProfile(u),
    onSignedOut:resetPlanOverlay,
    // DI-5 (G33): a permanent portfolio-list stream failure surfaces a toast (watchCoins
    // already had one). showErr is defined below; wrapped so it's read lazily.
    onLiveSyncError:()=>showErr("Live sync was interrupted — reload to make sure you're seeing the latest data."),
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
  // R12-1: the delete-confirm flag now lives LOCALLY in Detail.jsx (it's a per-screen
  // concern; keeping it app-level leaked the armed state across navigation).
  const[editEntry,setEditEntry]=useState(null);
  const[infoCoin,setInfoCoin]=useState(null);
  const[eTxType,setETxType]=useState("buy");
  // TX-SAFE (Part B): submit re-entry guard + busy state — a double-click (or a 2nd call
  // in the same tick, before addingTx re-renders) must not fire two writes / create two
  // duplicate transaction docs. The ref blocks the same-tick re-entry; addingTx disables
  // the button (AddEntry) while the write awaits. Same pattern as AUTH-DUP Part A.
  const addingRef=useRef(false);
  const[addingTx,setAddingTx]=useState(false);


  useEffect(()=>{
    const style=document.createElement("style");
    style.textContent=`@keyframes pulse{0%{transform:scale(1);opacity:0.4}50%{transform:scale(2.2);opacity:0}100%{transform:scale(1);opacity:0}}@keyframes fadeIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}`;
    document.head.appendChild(style);
    return()=>document.head.removeChild(style);
  },[]);

  // Public app flags (maintenance / signups / ADMIN-2 feature switches) set by an
  // admin — read once on load. Each switch is ON unless the server says exactly false,
  // matching functions/features.js so client and server can't disagree about a missing key.
  useEffect(()=>{fetchSiteConfig().then(d=>{if(d)setSite({maintenance:!!d.maintenance,signupsEnabled:d.signupsEnabled!==false,
    // CRYP-101 (LAUNCH-FREE Part B): paid plans are ON unless the server says exactly
    // false — a missing key must read as "sales enabled", mirroring the server default.
    paidPlansEnabled:d.paidPlansEnabled!==false,plans:d.plans||null,
    // ADMIN-5: the server sends `announcement` only when it's active (else null).
    announcement:d.announcement||null,
    features:{marketData:(d.features||{}).marketData!==false,checkout:(d.features||{}).checkout!==false,aiResearch:(d.features||{}).aiResearch!==false}})})},[]);

  // Auth watch + profile auto-save now live in useAuthSession (above).

  // Portfolios/coins/transactions are now persisted to Firestore per-mutation
  // (see addPortfolio/deletePortfolio/addCoin/remCoin/addEntry/remEntry), so the
  // old bulk local-storage save effect has been removed.

  // ═══ Remember which portfolio is active (local UI preference) ═══
  // DI-2 (G12): only persist while SIGNED IN. Otherwise the sign-out reset to "default"
  // would immediately re-write ci-active-port after logout() deleted it — resurrecting a
  // shared-device leak. No user → don't touch the key (logout/sign-out owns clearing it).
  useEffect(()=>{
    if(!dataLoaded||!user?.uid)return;
    db.set("ci-active-port",activePortId);
  },[activePortId,dataLoaded,user?.uid]);

  // ═══ DI-2: self-heal a dangling active-portfolio id ═══
  // Whenever the portfolios list changes (load, a remote delete via the C-A3 watcher, a
  // downgrade), if the active id is no longer in it, re-point to the first real portfolio.
  // This is the single source of truth that keeps every write targeting a LIVE doc — a
  // ghost id is what produced the false "coin limit" toast (G8/G11/G22/G32).
  useEffect(()=>{
    if(!dataLoaded||!user?.uid)return;
    if(portfolios.length&&!portfolios.some(p=>p.id===activePortId))setActivePortId(portfolios[0].id);
  },[portfolios,activePortId,dataLoaded,user?.uid]);

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

  // R21-2: 6s auto-dismiss (was 3s) so a longer validation message is readable.
  const showErr=(m)=>{setErr(m);setTimeout(()=>setErr(""),6000)};
  // DI-1: the single honest write-failure path. LOG the raw error (diagnostics used to
  // be discarded) and toast the CLASSIFIED message — the limit/upgrade line fires only
  // on a server-confirmed reason:'limit'; a 'missing-target' also kicks the DI-2
  // self-heal so the dangling active-portfolio id repairs itself.
  const failToast=(res,fallback,limitMsg)=>{
    if(res&&res.error)console.error("[write-failed]",res.code||"",res.reason||"",res.error);
    showErr(apiErrorMessage(res,fallback,limitMsg));
  };
  // DI-3: a server 'limit' denial AFTER the local pre-check passed means the counter is
  // inflated (drift) — recompute the caller's counters server-side. If drift was fixed, the
  // user can retry against the corrected count; if not, it's a genuine cap → upgrade hint.
  const reconcileCounters=async(upgradeMsg)=>{
    if(!user?.uid){showErr(upgradeMsg);return}
    try{const r=await apiReconcileMyCounters();showErr(r&&r.fixed?"We re-synced your account — please try that again.":upgradeMsg);}
    catch(_e){showErr(upgradeMsg);}
  };
  // API-SECURITY (counter-forge fix): deletes no longer decrement the tier counter client-side
  // (firestore.rules now forbids a client counter DECREASE, closing a paywall bypass). The count
  // is left fail-safe-high; bring it back to truth server-side, SILENTLY, so the next create isn't
  // briefly blocked by a stale-high count. Best-effort — a too-high count is safe and also
  // self-heals on the next limit-hit via reconcileCounters above.
  const syncCountsAfterDelete=()=>{ if(user?.uid){ apiReconcileMyCounters().catch(()=>{}); } };

  // Persist only non-sensitive profile data (tier, subscription, settings),
  // keyed by Firebase uid. Passwords are handled by Firebase Auth, never stored here.
  const saveProfile=async(u)=>{
    if(!u||!u.uid)return;
    const {uid,pass,loggedOut,...rest}=u;
    await db.set("ci-profile-"+uid,rest);
  };
  // DEV ONLY (Round 17): in local/emulator there is no PayPal webhook, so a demo
  // upgrade sets tier only in memory + localStorage — never in Firestore (users can't
  // write their own `tier`; rules block it). The portfolio-cap rule reads the DB tier,
  // so Pro/Premium can't actually add portfolios. This calls the emulator-gated
  // `devSetMyTier` so the in-app upgrade persists to the DB and the caps become real.
  // No-op in production builds (import.meta.env.DEV is false → dead-code-eliminated);
  // the callable also refuses outside the emulator. In prod, tier is set by PayPal/admin.
  const persistTierDev=async(tier)=>{
    if(!import.meta.env.DEV)return;
    try{await devSetMyTier(tier);}catch(_e){/* dev-only convenience; ignore failures */}
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
    // AUTH-DUP (Part A): ALL synchronous validation runs FIRST — every early-return here
    // happens BEFORE the re-entry lock is taken, so a validation bail-out can never leave
    // the button stuck disabled.
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
    }
    // AUTH-DUP (Part A): hard re-entry lock around the async auth call. The ref blocks a
    // same-tick second call (a state update wouldn't apply in time); authBusy disables the
    // submit button + the Enter-key resubmit. Reset in finally so a failed login/register
    // (or any error) always re-enables the button.
    if(authBusyRef.current)return;
    authBusyRef.current=true;setAuthBusy(true);
    try{
      if(authMode==="register"){
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
      }
    }finally{authBusyRef.current=false;setAuthBusy(false);}
  };

  const logout=async()=>{
    // Sign out of Firebase; onAuthChange will clear the session. No credentials are kept on the device.
    // C-R2a: clear this device's cached local data (active-portfolio id + cached profile) so the next
    // account signing in on a shared device doesn't inherit it.
    const uid=user?.uid;
    db.del("ci-active-port"); if(uid) db.del("ci-profile-"+uid);
    await logoutUser();
    resetPlanOverlay();
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
  // C-R2e: a failed settings write no longer silently keeps the optimistic value —
  // the toggle reverts and the user sees a toast (matches addCoin/addEntry honesty).
  const toggleSetting=async(key,value)=>{
    if(!user?.uid)return;
    const prev=user.settings?user.settings[key]:undefined;
    setUser(u=>u?{...u,settings:{...(u.settings||{}),[key]:value}}:u);
    try{
      const r=await updateUserSettings(user.uid,{[key]:value});
      if(r&&r.success===false)throw new Error(r.error||"save failed");
    }catch(_e){
      setUser(u=>u?{...u,settings:{...(u.settings||{}),[key]:prev}}:u);
      showErr("Couldn't save that setting — check your connection.");
    }
  };
  // ONBOARD-GATE: has this user RECORDED a plan choice? Read from the SERVER-only top-level
  // `planChosen` flag (set by chooseFreePlan / the PayPal webhook — clients can't write it) OR
  // any paid tier. A brand-new free account with no recorded choice is NOT chosen → the plan
  // gate is forced (see forcedPlan + the gate render). Mirrors isChosen in firestore.rules, so
  // client and server agree on who's gated. (Was settings.planChosen, which was client-writable
  // — gap G3; the flag now lives at the top level and is server-authoritative.)
  const planChosen=!!(user&&(user.planChosen===true||(user.tier&&user.tier!=="free")));
  // ONBOARD-GATE: the FREE path — record the choice on the SERVER (chooseFreePlan sets
  // planChosen + creates the default portfolio), then reload so the new portfolio appears and
  // the gate clears from the server truth. The paid path goes through PayPal (Login.jsx) → the
  // webhook records it. A re-entry ref stops a double-click firing two calls (idempotent anyway).
  const choosingRef=useRef(false);
  const [choosingPlan,setChoosingPlan]=useState(false);
  const chooseFree=async()=>{
    if(!user?.uid||choosingRef.current)return;
    choosingRef.current=true;setChoosingPlan(true);
    try{
      const r=await apiChooseFreePlan();
      if(r&&(r.success||r.planChosen)){
        setUser(u=>u?{...u,planChosen:true}:u);   // optimistic: gate is no longer forced
        await reloadPortfolios();                 // load the server-created default portfolio
        setShowPlan(true);                        // keep the modal open for the Welcome step
        setShowWelcome("free");setUpgradeStep("welcome");
      }else{
        showErr((r&&r.error)||"Couldn't set up your free plan — please try again.");
      }
    }catch(_e){
      showErr("Couldn't set up your free plan — please try again.");
    }finally{choosingRef.current=false;setChoosingPlan(false);}
  };
  // ONBOARD-GATE: a signed-in user who hasn't recorded a plan choice is FORCED through the
  // gate. Drives the non-dismissible modal (below) and Login's no-skip "forced" picker state.
  const forcedPlan=!!(user&&!planChosen);
  // CRYP-101 (LAUNCH-FREE Part B): when paid plans are switched off site-wide, Starter is the
  // only plan on offer — a forced first choice has nothing to pick. So instead of showing the
  // chooser we auto-record the free choice and move straight on. chooseFree's own choosingRef
  // blocks a same-tick double-invoke, and once it succeeds planChosen flips (forcedPlan→false),
  // so this effect can't re-fire; a failure leaves the deps unchanged, so it also won't loop.
  useEffect(()=>{
    if(forcedPlan&&site.paidPlansEnabled===false&&user?.uid)chooseFree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[forcedPlan,site.paidPlansEnabled,user?.uid]);
  // CRYP-101: while that auto-resolve is in flight, the plan modal renders a neutral
  // "setting up" placeholder instead of the chooser cards, so the picker never flashes.
  const autoStarter=forcedPlan&&site.paidPlansEnabled===false;
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
      const blob=new Blob([CSV_BOM+csv],{type:"text/csv;charset=utf-8"});
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
      // ISO-3 (G4): clear this device's cached name/email/tier + active-portfolio id BEFORE
      // signing out, so an erased user's data doesn't linger on a shared device.
      const _uid=user?.uid; db.del("ci-active-port"); if(_uid) db.del("ci-profile-"+_uid);
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
      // ISO-3 (G4): clear this device's local cache before the sign-out (shared-device hygiene).
      const _uid=user?.uid; db.del("ci-active-port"); if(_uid) db.del("ci-profile-"+_uid);
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
  // R28-1 (defense in depth): never open billing for the tier the user already has —
  // Account hides those buttons, but a same-tier call must be a no-op (no double charge).
  // ADMIN-2: every upgrade CTA in the app (Account's two buttons, the over-limit lock
  // popup) routes through here, so gating this ONE function covers them all — the
  // server refuses createSubscription anyway, but sending someone into a checkout
  // that is switched off just wastes their time and earns a support email.
  const startUpgrade=(toTier)=>{if(toTier===(user?.tier||"free"))return;
    // CRYP-101 (LAUNCH-FREE Part B): defense in depth — the server already refuses new
    // subscriptions when paid plans are switched off, and the CTAs are hidden, but any
    // stray caller must never open a checkout that is going to fail.
    if(site.paidPlansEnabled===false){showErr("New subscriptions are paused right now.");return}
    if(site.features.checkout===false){showErr("Checkout is temporarily unavailable — please try again shortly.");return}
    setUpgradeFlow(toTier);setUpgradeStep("billing");setShowPlan(true)};
  const startDowngrade=(toTier)=>{setDowngradeTo(toTier)};
  // PR-C1: cancel/schedule a downgrade through the REAL server callable (server acts on the
  // caller's uid and writes the subscription marker). NO optimistic setUser+saveProfile — the
  // pending state renders from watchUserDoc once the server marker lands.
  const confirmDowngrade=async()=>{
    try{ await apiCancelSubscription({downgradeTo}); setDowngradeTo(null); }
    catch(e){ showErr((e&&e.message)||"Couldn't schedule the downgrade. Please try again."); }
  };
  // R31-3: open the multi-step Premium-downgrade chooser (reset to the pick step). Also
  // reopened from the pending notice to change the choice.
  const openDowngradeChooser=()=>{setDgStep("pick");setDgSel(null);setDgCycle("monthly");setDgPayErr("");setShowDowngradeChooser(true);};
  // PR-C1: finalize a downgrade choice through the server callable (no client-forged marker,
  // no fabricated endDate). Returns true on success so the caller shows its toast only then.
  const finalizeDowngrade=async(target)=>{
    try{ await apiCancelSubscription({downgradeTo:target}); setShowDowngradeChooser(false); return true; }
    catch(e){ showErr((e&&e.message)||"Couldn't schedule the downgrade. Please try again."); return false; }
  };
  // PR-C2: the reinstated Premium→Pro approve step. Schedule a REAL future-start Pro sub via the
  // server callable (server acts on the caller's uid + writes subscription.scheduledPro). In PROD
  // the server returns a PayPal approval URL and we redirect the browser to it; in DEV/emulator
  // there is no PayPal, so the callable writes the marker and returns no url — close the chooser
  // and rely on watchUserDoc to sync scheduledPro back. NO client-forged tier/marker write.
  const scheduleProPay=async()=>{
    setDgPayErr("");
    try{
      const res=await apiScheduleProDowngrade({billing:dgCycle});
      if(import.meta.env.DEV){
        setShowDowngradeChooser(false);
        showErr("Pro scheduled — you'll keep full Premium access until your paid period ends, then Pro.");
      }else if(res&&res.approvalUrl){
        window.location.assign(res.approvalUrl);
      }else{
        throw new Error("Couldn't start the Pro approval. Please try again.");
      }
    }catch(e){
      setDgPayErr((e&&e.message)||"Couldn't schedule Pro. Please try again.");
    }
  };
  // R31-3: "Keep my plan" on a pending downgrade — fail-closed, both marker shapes.
  const keepPlan=async()=>{
    // PR-C2 SECURITY FIX (fail-closed): "Keep my plan" can NEVER resume a cancelled paid sub. By the
    // time a cancel marker exists the PayPal sub is already terminally cancelled — cancelSubscription
    // POSTs /cancel BEFORE marking, and a Premium→Pro downgrade EAGER-CANCELS Premium at schedule
    // time (subscription.scheduledPro). The old optimistic cancelled:false forge painted the plan as
    // a healthy "renews on" sub with NOTHING behind it (the [HIGH] paywall-bypass illusion — free
    // Premium forever, the sweep never drops it). So BOTH a scheduled-Pro marker AND a legacy plain
    // cancel converge on the same handling: never forge cancelled:false. Drop the defunct marker
    // optimistically (clears the misleading "access ends on … then Pro/Starter" notice) and let the
    // server keep the fail-closed cancel-to-lower-tier marker (access runs to period end, then the
    // sweep drops the tier); watchUserDoc syncs that corrected state back. To continue on the paid
    // tier the user re-subscribes (Account's "Re-subscribe to Premium" CTA → the existing Premium
    // checkout). The useAuthSession auto-save effect persists this single state change — no second
    // saveProfile here (that would double-write ci-profile-<uid>, PR-C1).
    setUser(u=>u?{...u,subscription:null}:u);
    // DI-4/G23: tell the server too (the owner can't write the marker) — the callable keeps the
    // fail-closed cancel-to-free + cancels any scheduled Pro. Best-effort.
    try{await apiReactivateSubscription();}catch(_e){}
  };
  // PR-C2: the R29-3 period-end re-checkout popup is RETIRED for the new flow — a Premium→Pro
  // downgrade schedules a REAL future-start Pro sub (subscription.scheduledPro), so the account
  // lands directly on Pro via the server sweep at period end and NEVER needs the manual
  // re-checkout. This stays only as a fallback for a LEGACY marker (cancelled + downgradeTo:pro
  // with NO scheduledPro) written before PR-C2.
  const recheckoutDue=!!(user&&(user.tier||"free")==="free"&&user.subscription&&user.subscription.cancelled&&user.subscription.downgradeTo==="pro"&&!user.subscription.scheduledPro);
  const declineProRecheckout=async()=>{
    // DI-4 (D3): no trim — over-limit data is KEPT and grey-locked, never deleted.
    const updated={...user,subscription:null};
    // PR-C1: the useAuthSession auto-save effect persists this single state change — no
    // second saveProfile here (that would double-write ci-profile-<uid>).
    setUser(updated);
    // DI-4/G23: clear the server-side marker so the re-checkout prompt doesn't recur.
    try{await apiResolveRecheckout();}catch(_e){}
  };
  const premLimits=user?.premiumLimits||{};
  // Admin-configured tier limits (from /api/config); fall back to built-in defaults.
  const _tierKey=isPremium?"premium":isPro?"pro":"free";
  const _planLim=(key,def)=>{const p=site.plans&&site.plans[_tierKey];return (p&&p[key]!=null)?p[key]:def;};
  // BL-1e: `!=null` (not `||`) so an admin-set custom limit of 0 is respected —
  // firestore.rules reads premiumLimits with .get(key, planVal), which treats 0 as
  // a real value; the display must mirror that, not silently show the default.
  // PLAN-LIMITS-MAX (#12): fallbacks MUST equal the firestore.rules / TIER_LIMITS defaults
  // (Starter 3/30/300 · Pro 6/100/1000 · Premium 15/200/2000). coins hardMax stays 1000 in rules.
  const maxPortfolios=isPremium?(premLimits.portfolios!=null?premLimits.portfolios:_planLim("portfolios",15)):_planLim("portfolios",isPro?6:3);
  const maxCoinsPerPort=isPremium?(premLimits.coins!=null?premLimits.coins:_planLim("coins",200)):_planLim("coins",isPro?100:30);
  const maxTxPerCoin=isPremium?(premLimits.transactions!=null?premLimits.transactions:_planLim("transactions",2000)):_planLim("transactions",isPro?1000:300);
  // AI research allowance (server-authoritative): the tier's monthly $-budget for live
  // AI, in cents, from /api/config plans (free 0 / pro 400 / premium 2500). Informational
  // until the B2 enforcement counter ships; each analysis costs ~1¢ (so cents≈analyses).
  const aiMonthlyCents=_planLim("aiMonthlyCents",isPremium?2500:isPro?400:0);

  // ═══ DI-4 grey-lock: over-limit items are KEPT but locked (never deleted) ═══
  // After a downgrade nothing is trimmed; items beyond the new caps render dimmed with an
  // "Over plan limit" tag and a tap-explainer. Derived from the CURRENT effective caps
  // (which already fold in premiumLimits). Deleting a locked item is always allowed.
  const lockedPortIds=useMemo(()=>lockedPortfolioIds(portfolios,maxPortfolios),[portfolios,maxPortfolios]);
  const activePortLocked=lockedPortIds.has(activePortId);
  const lockedCoins=useMemo(()=>activePortLocked?new Set(portfolio.map(x=>x.id)):lockedCoinIds(portfolio,maxCoinsPerPort),[portfolio,maxCoinsPerPort,activePortLocked]);
  const[lockInfo,setLockInfo]=useState(null);   // the coin whose lock is being explained (or null)
  const openLockInfo=(coin)=>setLockInfo(coin);


  // Returns true on success so callers (the R9-3 in-tab dialog) can close on success;
  // Account's add field ignores the return — backward-compatible.
  const addPortfolio=async()=>{
    if(blockedOffline())return false;
    if(portfolios.length>=maxPortfolios){showErr(isPro?("Max "+maxPortfolios+" portfolios"):"Starter: "+maxPortfolios+" portfolios — upgrade to Pro for 6");return false}
    if(!newPortName.trim()){showErr("Enter a portfolio name");return false}
    if(newPortName.trim().length>50){showErr("Name must be 50 characters or fewer");return false}
    if(!user?.uid){showErr("Please sign in again");return false}
    const res=await dbCreatePortfolio(user.uid,newPortName.trim(),portfolios.length,maxPortfolios);
    if(!res.success){
      if(res.reason==="limit"){reconcileCounters("You've reached your plan's portfolio limit — upgrade for more.");return false}
      failToast(res,"Couldn't create portfolio. Check your connection.","You've reached your plan's portfolio limit — upgrade for more.");return false}
    const np={id:res.id,name:newPortName.trim(),coins:[]};
    // DI-5 (G35): de-dup by id so the live metas watcher can't transiently double the pill.
    setPortfolios(prev=>prev.some(p=>p.id===res.id)?prev:[...prev,np]);setActivePortId(res.id);setNewPortName("");return true};

  const deletePortfolio=async(pid)=>{
    if(portfolios.length<=1){showErr("Need at least 1 portfolio");return}
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbDeletePortfolio(user.uid,pid);
    if(!res.success){failToast(res,"Couldn't delete portfolio. Check your connection.");return}
    setPortfolios(prev=>prev.filter(p=>p.id!==pid));
    if(activePortId===pid){setActivePortId(portfolios.find(p=>p.id!==pid)?.id||"default")}
    syncCountsAfterDelete();};

  // R19-2: rename a portfolio via the shared Modal (reachable from Account → Portfolios
  // and the switcher bar). `renameFor` holds the portfolio id being renamed; `renameName`
  // is the edited text (prefilled from the current name by startRename). Rules already
  // allow a name-only update (validPortfolioData bounds 1–50, coinCount untouched).
  const [renameFor,setRenameFor]=useState(null);
  const [renameName,setRenameName]=useState("");
  const startRename=(pid)=>{const p=portfolios.find(x=>x.id===pid);if(!p)return;setRenameName(p.name);setRenameFor(pid);};
  const closeRename=()=>{setRenameFor(null);setRenameName("");};
  const renamePortfolio=async()=>{
    const name=renameName.trim();
    if(!name){showErr("Enter a portfolio name");return}
    if(name.length>50){showErr("Name must be 50 characters or fewer");return}
    if(!renameFor){return}
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbUpdatePortfolioName(user.uid,renameFor,name);
    if(!res.success){failToast(res,"Couldn't rename portfolio. Check your connection.");return}
    setPortfolios(prev=>prev.map(p=>p.id===renameFor?{...p,name}:p));
    closeRename();};

  // R32: the active portfolio's custom coin order (Research → Coins view) + a persister.
  // Optimistic; on write failure revert the local order + honest toast (the DI-1 pattern).
  const coinOrder=portfolios.find(p=>p.id===activePortId)?.coinOrder||[];
  const updateCoinOrder=async(ids)=>{
    if(!user?.uid)return;
    const prev=portfolios.find(p=>p.id===activePortId)?.coinOrder||[];
    setPortfolios(ps=>ps.map(p=>p.id===activePortId?{...p,coinOrder:ids}:p));
    const res=await dbUpdateCoinOrder(user.uid,activePortId,ids);
    if(!res.success){setPortfolios(ps=>ps.map(p=>p.id===activePortId?{...p,coinOrder:prev}:p));failToast(res,"Couldn't save the coin order. Check your connection.");}
  };

  const addCoin=async(c,journal=null)=>{
    if(blockedOffline())return;
    if(portfolio.find(x=>x.id===c.id)){showErr("Already added");return}
    const lim=maxCoinsPerPort;
    if(portfolio.length>=lim){showErr(isPro?"Max "+maxCoinsPerPort+" coins per portfolio":"Starter: "+maxCoinsPerPort+" coins — upgrade to Pro for 100");return}
    if(!user?.uid){showErr("Please sign in again");return}
    // DI-2 write guard: never write to a ghost portfolio id (the reconcile effect keeps
    // activePortId valid, but this closes the brief window before it fires).
    if(!portfolios.some(p=>p.id===activePortId)){failToast({reason:"missing-target"});return}
    const res=await dbAddCoin(user.uid,activePortId,{id:c.id,symbol:c.symbol,name:c.name,thumb:c.thumb},journal,maxCoinsPerPort);
    if(!res.success){
      if(res.reason==="limit"){reconcileCounters("You've reached this portfolio's coin limit — upgrade for more.");return}
      failToast(res,"Couldn't add coin. Check your connection.","You've reached this portfolio's coin limit — upgrade for more.");return}
    // DI-5 (G35): de-dup the optimistic append by id so the live watcher's wholesale
    // replace can't transiently double the row (double key / double-counted total).
    setPortfolio(p=>p.some(x=>x.id===c.id)?p:[...p,{id:c.id,symbol:c.symbol,name:c.name,thumb:c.thumb,entries:[],...(journal?{journal}:{})}]);setScreen("portfolio");setSq("")};
  // Record the "is your thesis still intact?" review decision (intact|review|challenged)
  // by merging the new status into the coin's existing journal.
  const reviewThesis=async(coinId,status)=>{
    const coin=portfolio.find(x=>x.id===coinId);
    if(!coin||!coin.journal)return;
    if(!user?.uid){showErr("Please sign in again");return}
    const journal={...coin.journal,status};
    const res=await dbUpdateCoinJournal(user.uid,activePortId,coinId,journal);
    if(!res.success){failToast(res,"Couldn't save. Check your connection.");return}
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
    if(!res.success){failToast(res,"Couldn't save. Check your connection.");return false}
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
    if(!res.success){failToast(res,"Couldn't save. Check your connection.");return false}
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
    if(!res.success){failToast(res,"Couldn't save. Check your connection.");return false}
    setPortfolio(p=>p.map(x=>x.id===coinId?{...x,journal}:x));return true;};
  // Delete a thesis (§J2): clears the coin's journal so it returns to "Needs a thesis".
  // The coin/holding stays.
  const deleteThesis=async(coinId)=>{
    const coin=portfolio.find(x=>x.id===coinId);
    if(!coin)return false;
    if(!user?.uid){showErr("Please sign in again");return false}
    const res=await dbClearCoinJournal(user.uid,activePortId,coinId);
    if(!res.success){failToast(res,"Couldn't delete. Check your connection.");return false}
    setPortfolio(p=>p.map(x=>{if(x.id!==coinId)return x;const c={...x};delete c.journal;return c;}));return true;};
  const remCoin=async(id)=>{
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbRemoveCoin(user.uid,activePortId,id);
    if(!res.success){failToast(res,"Couldn't remove coin. Check your connection.");return}
    setPortfolio(p=>p.filter(c=>c.id!==id));if(sel?.id===id){setSel(null);setScreen("portfolio")}
    syncCountsAfterDelete();};
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
    if(addingRef.current)return;   // TX-SAFE: ignore a re-entrant call while a write is in flight
    if(blockedOffline())return;
    // R10-2b: only positive numbers (rules enforce amount>0 / priceAtBuy>=0). Catch it
    // here with a clear message BEFORE any write, so a negative/zero never reaches the
    // server and gets mislabelled as the "transaction limit" error (the B-PORT class).
    const _amt=parseFloat(eAmt),_prc=parseFloat(ePrice);
    if(!(_amt>0)){showErr("Amount must be a positive number.");return}
    if(!(_prc>0)){showErr("Price must be a positive number.");return}
    // DI-1: mirror the rules' upper bounds so an out-of-range value gets a clear message
    // BEFORE the write (never mislabelled as the "transaction limit"). TX-SAFE: the input
    // fields cap typing at 15 digit chars (sanitizeDecimal), which keeps a typed amount
    // under 1e15 and a price well under 1e9 — this server-side bound is the source of truth
    // and the two must stay consistent (raise them together if the cap ever changes).
    if(_amt>1e15){showErr("That amount is too large.");return}
    if(_prc>1e9){showErr("That price is too large.");return}
    // CRYP-94 (finding 12): a transaction can't be dated in the future — holdings()/P&L ignore
    // date, so a future-dated buy would inflate current holdings + value right now.
    if(isFutureTx(eDate)){showErr("A transaction can't be dated in the future.");return}
    if(sel){
      const currentTxCount=sel.entries.filter(e=>!editEntry||e.id!==editEntry.id).length;
      if(currentTxCount>=maxTxPerCoin){showErr("Max "+maxTxPerCoin+" transactions per coin"+(isPro?"":" · Upgrade to Pro for 1,000!"));return}

    }
    // CRYP-94 (findings 9+10): enforce the sell invariant on the PROJECTED timeline — the coin's
    // entries with this add appended, or with the edited entry replaced in place. One helper
    // (firstOverSoldSell, shared with remEntry) covers add-a-sell, a backdated sell, AND editing
    // a BUY down (or moving its date) below what a later sell needs — the edit path was previously
    // unguarded (the old check was gated on eTxType==="sell"), the founder's edit-buy exploit.
    if(sel){
      const cand={id:editEntry?editEntry.id:"__cand__",type:eTxType,amount:_amt,priceAtBuy:_prc,date:eDate,createdAt:editEntry?editEntry.createdAt:Date.now()};
      const projected=editEntry?sel.entries.map(e=>e.id===editEntry.id?cand:e):[...sel.entries,cand];
      const bad=firstOverSoldSell(projected);
      if(bad){showErr("Can't save — a sell on "+String(bad.date).split("T")[0]+" would exceed your holdings. Delete or reduce that sell first.");return}
    }
    if(!user?.uid){showErr("Please sign in again");return}
    // TX-SAFE: take the in-flight lock right before the write; try/finally releases it on
    // every exit (success, an early return on a failed write, or a throw).
    addingRef.current=true;setAddingTx(true);
    try{
    if(editEntry){
      const txData={type:eTxType,amount:parseFloat(eAmt),priceAtBuy:parseFloat(ePrice),date:eDate};
      const res=await dbUpdateTransaction(user.uid,activePortId,sel.id,editEntry.id,txData);
      // G3: editing a tx touches NO counter, so a limit is structurally impossible — no limitMsg.
      if(!res.success){failToast(res,"Couldn't save transaction. Check your connection.");return}
      const updated={...editEntry,...txData};
      setPortfolio(p=>p.map(c=>c.id===sel.id?{...c,entries:c.entries.map(e=>e.id===editEntry.id?updated:e)}:c));
      setSel(p=>({...p,entries:p.entries.map(e=>e.id===editEntry.id?updated:e)}));
    }else{
      const txData={type:eTxType,amount:parseFloat(eAmt),priceAtBuy:parseFloat(ePrice),date:eDate};
      const res=await dbAddTransaction(user.uid,activePortId,sel.id,txData,maxTxPerCoin);
      if(!res.success){
        if(res.reason==="limit"){reconcileCounters("You've reached this coin's transaction limit — upgrade for more.");return}
        failToast(res,"Couldn't add transaction. Check your connection.","You've reached this coin's transaction limit — upgrade for more.");return}
      const en={id:res.id,...txData,createdAt:Date.now()};
      // TX-SAFE: idempotent optimistic append — the live watcher (dbWatchCoins) has often
      // already delivered this same doc id, so guard the append (mirror addCoin's guard) or
      // it lands twice → duplicate React key → one delete removes both rows.
      setPortfolio(p=>p.map(c=>c.id===sel.id?{...c,entries:appendUnique(c.entries,en)}:c));
      setSel(p=>({...p,entries:appendUnique(p.entries,en)}));
    }
    setEAmt("");setEPrice("");setEditEntry(null);setScreen("detail");
    }finally{addingRef.current=false;setAddingTx(false);}};
  const remEntry=async(cid,eid)=>{
    const coin=portfolio.find(c=>c.id===cid);if(!coin)return;
    // CRYP-94: reuse the shared oversell invariant — deleting a buy that a later sell depends on
    // is refused (firstOverSoldSell, the same helper the add/edit guard routes through).
    const bad=firstOverSoldSell(coin.entries.filter(e=>e.id!==eid));
    if(bad){showErr("Can't delete — a sell on "+String(bad.date).split("T")[0]+" depends on it");return}
    if(!user?.uid){showErr("Please sign in again");return}
    const res=await dbDeleteTransaction(user.uid,activePortId,cid,eid);
    if(!res.success){failToast(res,"Couldn't delete transaction. Check your connection.");return}
    setPortfolio(p=>p.map(c=>c.id===cid?{...c,entries:c.entries.filter(e=>e.id!==eid)}:c));setSel(p=>p?{...p,entries:p.entries.filter(e=>e.id!==eid)}:p);
    syncCountsAfterDelete();};


  const { value:tv, totalBuys, pnl:tpnl, pnlPct:tpp } = portfolioPnl(portfolio, prices);
  // Part B: the active portfolio's transactions may still be loading (lazy-loaded on switch).
  // Only an explicit false triggers the value-card "loading" placeholder — undefined (initial
  // full-load / legacy) reads as loaded, so nothing regresses. watchCoins flips it true.
  const activeTxLoaded=portfolios.find(p=>p.id===activePortId)?.txLoaded!==false;

  // ── Usage Calculation ── (pure math in utils/usage.js)
  const { usagePct } = usagePercents(portfolio.length, portfolios, { maxCoinsPerPort, maxPortfolios, maxTxPerCoin });

  // ── Subscription Helpers ──
  // calcEndDate / getTrimImpact / trimToTier now live in useUpgrade (above).
  const fmtDate=(d)=>new Date(d).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});

  // C-A3 (C12): keep the ACTIVE portfolio's coins live — a buy/sell/journal edit
  // made on a second device appears here without a reload. Bounded to the one
  // active portfolio (no fan-out); the watcher re-reads transactions only for
  // coins whose doc changed (every tx write bumps the coin's txCount).
  // Review fix: NO "default" exclusion — registration literally creates the
  // portfolio doc id "default", so Starter accounts (the 1-portfolio tier) live
  // there; excluding it disabled live sync for exactly the free tier. A phantom
  // local default (no server portfolios at all) just watches an empty collection.
  // A permanent stream failure surfaces as a toast instead of silently freezing.
  useEffect(()=>{
    if(!user?.uid||!activePortId)return;
    const unsub=dbWatchCoins(user.uid,activePortId,(coins)=>{
      // Part B: watchCoins reads each coin's transactions, so the active portfolio's tx are
      // now loaded/live — mark txLoaded so the value card drops its "loading" placeholder.
      setPortfolios(prev=>prev.map(p=>p.id===activePortId?{...p,coins,txLoaded:true}:p));
    },()=>showErr("Live sync was interrupted — reload to make sure you're seeing the latest data."));
    return unsub;
  },[user?.uid,activePortId]);

  // ═══ DI-6 (G37): keep the server-authoritative user doc live ═══
  // A tier flip (admin/sweep), a premiumLimits/settings change, or a trash reaches this
  // OPEN session without a reload — a stale session (out-of-date caps) was the direct
  // cause of the false "limit" toast. Merges only the authoritative fields; a tier change
  // toasts, and setting deleted:true flips the app to the RestoreAccount screen (rendered
  // whenever user.deleted). Bounded to the single owner doc.
  const lastTierRef=useRef(user?.tier);
  useEffect(()=>{
    if(!user?.uid)return;
    const unsub=dbWatchUserDoc(user.uid,(server)=>{
      if(server.tier&&lastTierRef.current&&server.tier!==lastTierRef.current){
        showErr("Your plan is now "+({free:"Starter",pro:"Pro",premium:"Premium"}[server.tier]||server.tier)+".");
      }
      if(server.tier)lastTierRef.current=server.tier;
      setUser(u=>u?{...u,
        tier:server.tier||u.tier,
        subscription:"subscription" in server?server.subscription:u.subscription,
        deleted:server.deleted===true,
        deletedAt:server.deletedAt||null,
        settings:server.settings||u.settings,
        premiumLimits:server.premiumLimits||u.premiumLimits}:u);
    });
    return unsub;
  },[user?.uid]);

  // ═══ DI-6 (G39): offline detection ═══
  // A banner + a write guard so a save can't hang forever offline and offline re-taps
  // can't queue duplicate commits that replay into counter drift.
  const[offline,setOffline]=useState(typeof navigator!=="undefined"&&navigator.onLine===false);
  useEffect(()=>{
    if(typeof window==="undefined")return;
    const on=()=>setOffline(false),off=()=>setOffline(true);
    window.addEventListener("online",on);window.addEventListener("offline",off);
    return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off);};
  },[]);
  // Guard the ADD writers (the ones that queue duplicates) — returns true when blocked.
  const blockedOffline=()=>{if(offline){showErr("You're offline — changes can't be saved right now.");return true}return false};

  // Check on app load whether the subscription expired or payment failed. The
  // decision (which tier, or none) is pure logic in useUpgrade.dueDowngrade; this
  // only orchestrates the side effects (trim stored data + persist the profile).
  const checkSubscriptionStatus=async(u)=>{
    if(!u||!u.subscription)return u;
    const target=dueDowngrade(u.subscription,new Date());
    if(!target)return u;
    if(target==="pro"){
      // PR-C2: a Premium→Pro downgrade scheduled a REAL future-start Pro sub (scheduledPro). At
      // the period end the SERVER sweep activates it and flips the tier to Pro (a payment-backed
      // Pro sub); the client only READS that via watchUserDoc and must NEVER fabricate a paid tier
      // in prod. In DEV/emulator there is no sweep, so simulate the flip so the local end state
      // matches prod (mirrors how the old proApproved branch behaved, keyed off scheduledPro).
      if(u.subscription.scheduledPro){
        if(import.meta.env.DEV){
          const billing=u.subscription.scheduledPro.billing||"monthly";
          const updated={...u,tier:"pro",subscription:{billing,startDate:new Date().toISOString(),endDate:calcEndDate(billing),cancelled:false}};
          await saveProfile(updated);
          await persistTierDev("pro");
          return updated;
        }
        return u;   // PROD: the server sweep + watchUserDoc own the flip — don't forge a tier here
      }
      // Fallback for a LEGACY marker (no scheduledPro) — drop to Starter NOW and keep the
      // marker so the (retired) re-checkout popup can still resolve it. Data is KEPT (DI-4).
      if((u.tier||"free")==="free")return u;   // already flipped — still awaiting the decision
      const updated={...u,tier:"free"};
      await saveProfile(updated);
      await persistTierDev("free");
      return updated;
    }
    // DI-4 (D3): no trim on downgrade — over-limit data is KEPT and grey-locked (the
    // user unlocks it by upgrading again or removing other items). The caps just drop.
    const updated={...u,tier:target,subscription:null};
    await saveProfile(updated);
    await persistTierDev(target);   // dev: keep the DB tier in sync so caps drop too
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

  const isDesktop=useIsDesktop();
  // R25-3: coinInfo is no longer a screen — it's an infoCoin-driven overlay over the
  // current tab (open from any coin icon; closing returns to where you were).
  const openCoinInfo=(coin)=>setInfoCoin(coin);
  const at=(screen==="addEntry"||screen==="detail"||screen==="account")?"portfolio":screen;

  if(site.maintenance) return(<div style={{fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",background:"var(--app-bg)",color:"var(--app-fg)",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"40px 28px"}}>
    <div style={{fontSize:40,marginBottom:14}}>🛠️</div>
    <div style={{fontSize:24,fontWeight:700,marginBottom:8}}>We'll be right back</div>
    <div style={{fontSize:14,color:c.dim,maxWidth:320,lineHeight:1.5}}>CryptoIdea is briefly down for maintenance. Your data is safe — please check back in a little while.</div>
  </div>);

  // DI-2 (G13/G30): a persistent portfolio-load failure shows an honest Retry, never the
  // silent phantom "default" portfolio that every write would then fail against.
  // ONBOARD-GATE (defense-in-depth): the forced plan gate ALWAYS wins over the portfolio
  // load-error screen. A not-chosen user's data reads are denied BY DESIGN — that expected
  // denial must surface the plan gate (below), never the "Couldn't load / Retry" dead-end
  // (whose Retry would just re-hit the same denial). useAuthSession already skips the load for
  // a not-chosen user; this guard is the belt-and-suspenders so the gate can't be masked.
  if(portfoliosError&&!forcedPlan&&user&&screen!=="login"&&screen!=="loading") return(<div style={{fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",background:"var(--app-bg)",color:"var(--app-fg)",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"40px 28px"}}>
    <div style={{fontSize:40,marginBottom:14}}>📡</div>
    <div style={{fontSize:22,fontWeight:700,marginBottom:8}}>Couldn't load your portfolios</div>
    <div style={{fontSize:14,color:c.dim,maxWidth:320,lineHeight:1.5,marginBottom:20}}>Your data is safe on the server — this looks like a connection hiccup. Let's try again.</div>
    <button className="btn-primary" style={{maxWidth:220}} onClick={()=>{setPortfoliosError(false);reloadPortfolios();}}>Retry</button>
  </div>);

  // Shared state + handlers for extracted screens (grows as screens migrate).
  const ctx={api,setScreen,fpEmail,setFpEmail,fpErr,setFpErr,resetSent,setResetSent,handleReset,showErr,
    user,contactMsg,setContactMsg,contactSent,setContactSent,
    sq,setSq,searchResults,trending,portfolio,addCoin,reviewThesis,saveFunnel,addThesis,editThesis,deleteThesis,
    sel,setSel,eAmt,setEAmt,ePrice,setEPrice,eDate,setEDate,eTxType,setETxType,editEntry,setEditEntry,addEntry,addingTx,
    startAddTx,isDesktop,
    infoCoin,setInfoCoin,openCoinInfo,prices,
    remCoin,remEntry,
    tv,totalBuys,tpnl,tpp,txLoaded:activeTxLoaded,maxCoinsPerPort,usagePct,maxPortfolios,isPro,isPremium,startUpgrade,
    portfolios,setActivePortId,activePortId,coinOrder,updateCoinOrder,
    maxTxPerCoin,aiMonthlyCents,startDowngrade,openDowngradeChooser,keepPlan,fmtDate,deletePortfolio,startRename,newPortName,setNewPortName,addPortfolio,
    lockedCoins,lockedPortIds,openLockInfo,
    downloadMyData,downloadCsv,acctBusy,deleteMyAccount,restoreAccount,delConfirm,setDelConfirm,acctMsg,logout,
    delPass,setDelPass,delType,setDelType,cancelDelete,
    pwCur,setPwCur,pwNew,setPwNew,pwMsg,changeMyPassword,signOutEverywhere,
    profName,setProfName,profMsg,saveDisplayName,emNew,setEmNew,emPass,setEmPass,emMsg,requestEmailChange,toggleSetting,
    showPlan,showWelcome,upgradeStep,setUpgradeStep,upgradeFlow,setUpgradeFlow,setShowPlan,setShowWelcome,planChosen,chooseFree,choosingPlan,
    upgradeBilling,setUpgradeBilling,setUser,saveProfile,persistTierDev,calcEndDate,reloadPortfolios,
    authMode,setAuthMode,authErr,setAuthErr,authName,setAuthName,authEmail,setAuthEmail,authPass,setAuthPass,handleAuth,authBusy,site,
    authAgreeTerms,setAuthAgreeTerms,authAgreePrivacy,setAuthAgreePrivacy,authAgreeMarketing,setAuthAgreeMarketing};
  // Responsive shell: tab screens render inside a centered column (.app-shell) that
  // widens on desktop. Card-collection screens opt into the wider 1040px track as
  // their grids land (§R). Same markup mobile↔desktop — no @media needed.
  const WIDE_SCREENS=new Set(["portfolio","research","journal","learn","search"]); // all 5 tab screens share the 1040 track so they're the same width on desktop
  const NARROW_SCREENS=new Set(["detail","addEntry"]); // forms/detail read better narrower (coinInfo → overlay, R25-3)
  // R19-9: on desktop the drill-ins are popups OVER Portfolio → the shell keeps Portfolio's wide track behind them.
  const baseScreen=(isDesktop&&NARROW_SCREENS.has(screen))?"portfolio":screen;
  const TAB_SCREENS=new Set(["portfolio","research","journal","learn","search"]); // bottom-nav tabs get the persistent account avatar
  const acctInitial=(user?.name||user?.email||"C").trim().charAt(0).toUpperCase();
  return(<AppContext.Provider value={ctx}><div style={{fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif",background:"var(--app-bg)",color:"var(--app-fg)",minHeight:"100vh",maxWidth:1040,margin:"0 auto",paddingBottom:78,WebkitFontSmoothing:"antialiased"}}>
    {/* Floating toast: fixed so a limit/error message is always visible, even when the action
        (e.g. "Add portfolio" on the scrolled Account screen) is far below the top of the page.
        R21-1: styled by .ci-toast (app.css) at z-index 10000 — above every popup's 9500
        scrim, so validation errors float fully bright on top of any open Modal. */}
    {err&&<div role="alert" className="ci-toast">{err}</div>}
    {/* DI-6 (G39): offline banner — writes are blocked while it shows. */}
    {offline&&<div role="status" style={{position:"fixed",top:0,left:0,right:0,zIndex:10001,background:"#92400E",color:"#fff",textAlign:"center",fontSize:12,fontWeight:600,padding:"6px 12px"}}>You're offline — changes can't be saved right now.</div>}
    {/* ADMIN-5: site announcement banner — logged-in app only, dismissible per-message. */}
    {user&&screen!=="login"&&<AnnouncementBanner announcement={site.announcement} />}
    {/* ONBOARD-GATE: the plan modal is DERIVED, not triggered once. It shows whenever the
        upgrade flow was opened (showPlan) OR the user hasn't recorded a plan choice (forcedPlan)
        — so a not-yet-chosen user sees it every session/reload until they choose (fixes G2), and
        a bot never sees it but is denied data by the rules regardless. Suspension/offline states
        render their own UI above (banner/recheckout) and a suspended Auth account can't sign in,
        so `user` is null and this never shows for them — the gate ordering the spec asks for. */}
    {(showPlan||forcedPlan)&&screen!=="login"&&screen!=="loading"&&(()=>{
      // R27-3: on DESKTOP the plan/billing flow renders inside the shared <Modal>
      // (title + X; no scrim-dismiss so a mis-click doesn't abandon a mid-flow
      // upgrade; the X is suppressed during the fake-PayPal "processing" step).
      // Closing only clears the overlay state — `screen` was never changed by the
      // flow, so the X lands you exactly where you were (Account or a tab).
      // Mobile keeps the original full-screen overlay.
      if(isDesktop){
        const planTitle=(upgradeStep==="billing"&&upgradeFlow)
          ?("Upgrade to "+(upgradeFlow==="premium"?"Premium":"Pro"))
          :(upgradeStep==="welcome"||upgradeStep==="processing")?"":"Choose a plan";
        const closePlanFlow=()=>{setShowPlan(false);setUpgradeFlow(null);setUpgradeStep("billing");setShowWelcome(null)};
        // ONBOARD-GATE (fixes G1): when the choice is FORCED, the modal is truly non-dismissible
        // — no X (hideClose), no scrim/Esc close (dismissOnScrim already off; Modal has no Esc),
        // and a focus-trap so Tab can't reach the app behind it. Only the plan cards can act.
        return(<Modal size="md" title={autoStarter?"":planTitle} dismissOnScrim={false} hideClose={upgradeStep==="processing"||forcedPlan} trapFocus={forcedPlan} onClose={closePlanFlow}>{autoStarter?<SettingUpFree/>:<Login popup/>}</Modal>);
      }
      return(<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:c.bg,zIndex:9000,overflowY:"auto",display:"flex",justifyContent:"center"}}>
        <div style={{width:"100%",maxWidth:430}}>{autoStarter?<SettingUpFree/>:<Login/>}</div>
      </div>);
    })()}
    {screen==="loading"&&Loading()}
    {screen==="login"&&<Login/>}
    {screen==="forgotPass"&&<ForgotPass/>}
    {screen==="contact"&&<Contact/>}
    {/* PR-C2: the Premium-downgrade chooser flow — pick (select a target) → warn (what you'll
        lose). Starter ends in Confirm (server cancelSubscription → free). Pro reinstates a REAL
        approve step: Continue → cycle (pick a billing cycle) → "Pay with PayPal", which schedules
        a genuine future-start Pro sub (scheduleProDowngrade) and, in prod, redirects to PayPal's
        approval URL. Data is KEPT (DI-4); no welcome screen for downgrades. */}
    {showDowngradeChooser&&(()=>{
      const proP=(site.plans&&site.plans.pro&&site.plans.pro.price!=null)?site.plans.pro.price:9.99;
      const chEnd=user?.subscription?.endDate||calcEndDate(user?.subscription?.billing||"monthly");
      const closeChooser=()=>setShowDowngradeChooser(false);
      const REFUND="No refunds. Your subscription stays active until the end of the paid period.";
      // ── Step 1: pick a target (select-then-Continue) ──
      if(dgStep==="pick")return(
        <Modal size="sm" title="Downgrade to which plan?" onClose={closeChooser}>
          <div className="plan-col">
            <div className={"cycle-card"+(dgSel==="pro"?" on":"")} role="button" tabIndex={0} onClick={()=>setDgSel("pro")} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setDgSel("pro")}}>
              <div><div className="cycle-name">Pro</div><div className="cycle-sub">{PLAN_BENEFITS.pro.limits.join(" · ")}</div></div>
              <div className="cycle-price">${proP}<span className="cycle-per">/mo</span></div>
            </div>
            <div className={"cycle-card"+(dgSel==="free"?" on":"")} role="button" tabIndex={0} onClick={()=>setDgSel("free")} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")setDgSel("free")}}>
              <div><div className="cycle-name">Starter</div><div className="cycle-sub">{PLAN_BENEFITS.free.limits.join(" · ")}</div></div>
              <div className="cycle-price">Free</div>
            </div>
          </div>
          <div className="sub-sub" style={{textAlign:"center",marginTop:12}}>Your Premium access continues until {fmtDate(chEnd)} either way.</div>
          <button className="btn-primary" style={{marginTop:14,opacity:dgSel?1:0.5}} disabled={!dgSel} onClick={()=>dgSel&&setDgStep("warn")}>Continue</button>
        </Modal>);
      // ── Step 3 (PR-C2, Pro only): the reinstated approve step — pick a billing cycle, then
      //    "Pay with PayPal" schedules a REAL future-start Pro sub (scheduleProDowngrade). PROD
      //    redirects to PayPal's approval URL; DEV writes the scheduledPro marker + closes. The
      //    tier is never written client-side — the webhook + sweep own it (PR-B invariant). ──
      if(dgStep==="cycle"){
        const _pp=(site.plans&&site.plans.pro)||{};
        const monthlyP=_pp.price!=null?_pp.price:9.99;
        const yearlyP=_pp.priceYear!=null?_pp.priceYear:99.99;
        const yearlyM=(yearlyP/12).toFixed(2);
        return(
          <Modal size="sm" title="Approve your Pro payment" onClose={closeChooser}>
            <div className="sub-sub" style={{textAlign:"center",marginBottom:12}}>Select your billing cycle</div>
            <div className="plan-col">
              <div onClick={()=>setDgCycle("monthly")} className={"cycle-card"+(dgCycle==="monthly"?" on":"")}>
                <div><div className="cycle-name">Monthly</div><div className="cycle-sub">Billed every month</div></div>
                <div className="cycle-price">${monthlyP}<span className="cycle-per">/mo</span></div>
              </div>
              <div onClick={()=>setDgCycle("yearly")} className={"cycle-card"+(dgCycle==="yearly"?" on":"")}>
                <div><div className="cycle-name">Yearly</div><div className="cycle-sub">${yearlyM}/mo · billed annually</div></div>
                <div className="cycle-price">${yearlyP}<span className="cycle-per">/yr</span></div>
              </div>
              <button onClick={scheduleProPay} className="paypal-btn">
                Pay with <span style={{fontStyle:"italic",fontWeight:800}}>Pay<span style={{color:"#253B80"}}>Pal</span></span>
              </button>
              {dgPayErr&&<div className="auth-err" role="alert" style={{color:"#FF3B30",fontSize:12,textAlign:"center",marginTop:8}}>{dgPayErr}</div>}
              <div className="sub-sub" style={{fontSize:11,textAlign:"center",marginTop:8,lineHeight:1.6}}>You approve your Pro payment now; it first charges when your Premium period ends on {fmtDate(chEnd)}. {REFUND}</div>
              <button onClick={()=>setDgStep("warn")} className="back-link">← Back</button>
            </div>
          </Modal>);
      }
      // ── Step 2: "what you'll lose" warning. Starter ends in Confirm (server cancelSubscription
      //    → free). Pro continues to the reinstated approve step (cycle) — PR-C2 restores the real
      //    future-start Pro sub, replacing PR-C1's plain-Confirm interim. Toasts are date-free (the
      //    real endDate renders from the synced server marker — never a client-fabricated number). ──
      const targetLabel=dgSel==="free"?"Starter":"Pro";
      const tb=PLAN_BENEFITS[dgSel==="free"?"free":"pro"];
      return(
        <Modal size="sm" title={`Switch to ${targetLabel}?`} onClose={closeChooser}>
          <div style={{fontSize:13,color:c.dim,lineHeight:1.7,marginBottom:14}}>You're moving from Premium to {targetLabel}. Your data is <strong>kept</strong> — anything over the new limit just locks until you upgrade again.</div>
          <div className="dg-warn" style={{padding:"14px",borderRadius:12,background:"#FFF8E1",border:"1px solid #FFE082",marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:"#F59E0B",marginBottom:8}}>{targetLabel.toUpperCase()} LIMITS</div>
            <div style={{fontSize:12,color:"#92400E",lineHeight:1.7}}>{tb.limits.map((l,i)=>(<div key={i}>• {l}</div>))}</div>
          </div>
          {dgSel==="pro"&&<div style={{fontSize:12,color:c.dim,lineHeight:1.6,marginBottom:14}}>Next, approve your Pro payment. Your Pro plan starts when your Premium period ends.</div>}
          <div style={{fontSize:11,color:c.dim,textAlign:"center",lineHeight:1.6,marginBottom:14}}>Premium access continues until {fmtDate(chEnd)}. {REFUND}</div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>setDgStep("pick")} style={{flex:1,padding:"14px",borderRadius:14,border:"1px solid #E8E8ED",background:"#fff",color:c.txt,fontSize:14,fontWeight:600,cursor:"pointer"}}>Back</button>
            {dgSel==="pro"
              ? <button onClick={()=>setDgStep("cycle")} style={{flex:1,padding:"14px",borderRadius:14,border:"none",background:c.ac,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Continue</button>
              : <button onClick={async()=>{ if(await finalizeDowngrade("free")) showErr("Downgrade scheduled — you'll keep full Premium access until your paid period ends, then Starter."); }} style={{flex:1,padding:"14px",borderRadius:14,border:"none",background:c.red,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Confirm</button>}
          </div>
        </Modal>);
    })()}
    {/* R29-3: the forced-choice re-checkout after a lapsed Premium→Pro downgrade. No X —
        the two buttons ARE the decision (it re-shows on every load until decided). Hidden
        while the plan flow is open so approving doesn't stack popups. */}
    {recheckoutDue&&!showPlan&&(
      <Modal size="sm" title="Your Premium period has ended" hideClose onClose={()=>{}}>
        <div style={{fontSize:13,color:c.dim,lineHeight:1.6,marginBottom:16}}>You chose to switch to <strong>Pro</strong>. Approve the Pro monthly payment to continue on Pro — or continue on Starter (free). Your data is kept until you decide.</div>
        <button className="btn-primary" onClick={()=>startUpgrade("pro")}>Approve Pro payment</button>
        <button className="back-link" style={{marginTop:10,width:"100%"}} onClick={declineProRecheckout}>Continue with Starter</button>
      </Modal>
    )}
    {downgradeTo&&(()=>{
      const impact=overLimitImpact(downgradeTo);
      const endDate=user?.subscription?.endDate||calcEndDate(user?.subscription?.billing||"monthly");
      const targetLabel=downgradeTo==="free"?"Starter":"Pro";
      // R15-3: downgrade confirm now uses the shared centered Modal (was a bottom-sheet).
      return(
        <Modal size="sm" title={`Downgrade to ${targetLabel}?`} onClose={()=>setDowngradeTo(null)}>
          {/* R27-4: the transparent no-refund policy line (cancel-at-period-end is the
              built model — dueDowngrade only flips after endDate; no proration). */}
          <div style={{fontSize:13,color:c.dim,lineHeight:1.6,marginBottom:18}}>Your subscription is paid until the end of the period. You'll keep your current access until then. After that date, your account will be downgraded. We don't refund the unused time — you keep everything you paid for until then.</div>

          <div className="dg-ends" style={{padding:"12px 14px",borderRadius:12,background:"#FFF0F0",border:"1px solid #FFE0E0",marginBottom:18}}>
            <div style={{fontSize:11,fontWeight:700,color:c.red,marginBottom:4}}>SUBSCRIPTION ENDS</div>
            <div style={{fontSize:15,fontWeight:700,color:c.red}}>{fmtDate(endDate)}</div>
            <div style={{fontSize:11,color:c.dim,marginTop:4}}>You'll have full access until this date</div>
          </div>

          {/* DI-4 (D3/D4): nothing is deleted — over-limit items are KEPT and locked. */}
          {impact&&(impact.portsOver>0||impact.coinsOver>0||impact.txOver>0)&&(
            <div className="dg-warn" style={{padding:"14px",borderRadius:12,background:"#FFF8E1",border:"1px solid #FFE082",marginBottom:18}}>
              <div style={{fontSize:11,fontWeight:700,color:"#F59E0B",marginBottom:8}}>⚠ WHAT WILL BE LOCKED (NOT DELETED)</div>
              <div className="dg-warn-text" style={{fontSize:12,color:"#92400E",lineHeight:1.7}}>
                After {fmtDate(endDate)}, your account limit drops to {targetLabel}. Your data is <strong>kept</strong> — these items just lock until you upgrade again or remove others to get back under the limit:
                {impact.portsOver>0&&<div>• {impact.portsOver} portfolio{impact.portsOver>1?"s":""}</div>}
                {impact.coinsOver>0&&<div>• {impact.coinsOver} coin{impact.coinsOver>1?"s":""}</div>}
                {impact.txOver>0&&<div>• {impact.txOver.toLocaleString()} transaction{impact.txOver>1?"s":""}</div>}
              </div>
              <div style={{fontSize:11,color:c.dim,marginTop:8,fontStyle:"italic"}}>Nothing is erased. The most recent items lock first; your oldest data stays active.</div>
            </div>
          )}

          <div style={{fontSize:11,color:c.dim,lineHeight:1.6,marginBottom:16,textAlign:"center"}}>No refunds. Your subscription remains active until the end of the paid period.</div>

          <div style={{display:"flex",gap:10}}>
            <button className="dg-keep" onClick={()=>setDowngradeTo(null)} style={{flex:1,padding:"14px",borderRadius:14,border:"1px solid #E8E8ED",background:"#fff",color:c.txt,fontSize:14,fontWeight:600,cursor:"pointer"}}>Keep My Plan</button>
            <button onClick={confirmDowngrade} style={{flex:1,padding:"14px",borderRadius:14,border:"none",background:c.red,color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Confirm Downgrade</button>
          </div>
        </Modal>);
    })()}
    {/* DI-4: the grey-lock explainer — tapping an over-limit (locked) coin explains it's
        KEPT, not deleted, and offers Upgrade or Open-coin (to remove it). Deletes are
        always allowed so the user can get back under the cap. */}
    {lockInfo&&(
      <Modal size="sm" title="Over your plan limit" onClose={()=>setLockInfo(null)}>
        <div style={{fontSize:13,color:c.dim,lineHeight:1.7,marginBottom:16}}>
          <strong>{lockInfo.name}</strong> is beyond your {isPremium?"Premium":isPro?"Pro":"Starter"} plan's limit of {maxCoinsPerPort} coins per portfolio. Your data is safe — it's kept, just locked. Upgrade to use it again, or remove other coins to get back under the limit.
        </div>
        {!isPremium&&<button className="btn-primary" onClick={()=>{setLockInfo(null);startUpgrade(isPro?"premium":"pro")}}>Upgrade to unlock</button>}
        <button className="back-link" style={{marginTop:10,width:"100%"}} onClick={()=>{const co=lockInfo;setLockInfo(null);setSel(co);setScreen("detail")}}>Open this coin</button>
        <button className="back-link" style={{marginTop:10,width:"100%"}} onClick={()=>setLockInfo(null)}>OK</button>
      </Modal>
    )}
    {/* R19-2: shared "Rename portfolio" dialog (text form → no scrim-dismiss so a typed name isn't lost). */}
    {renameFor&&(
      <Modal size="sm" title="Rename portfolio" onClose={closeRename} dismissOnScrim={false}>
        <input className="field-input" value={renameName} autoFocus maxLength={50}
          onChange={e=>setRenameName(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter")renamePortfolio()}}
          placeholder="Portfolio name"/>
        <button className="btn-primary" style={{marginTop:14}} onClick={renamePortfolio}>Save</button>
      </Modal>
    )}
    {/* A soft-deleted (trashed) user sees only the restore screen — never the app. */}
    {user?.deleted&&screen!=="login"&&screen!=="loading"?<RestoreAccount/>:<>
    <div className={"ci-app app-shell"+(WIDE_SCREENS.has(baseScreen)?" app-shell-wide":NARROW_SCREENS.has(baseScreen)?" app-shell-narrow":"")}>
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
      <div className="avatar-dock"><button className="avatar app-avatar" onClick={()=>setScreen("account")} aria-label="Account">{acctInitial}</button></div>
    )}
    {screen==="account"&&<Account/>}
    {(screen==="portfolio"||(isDesktop&&NARROW_SCREENS.has(screen)))&&<Portfolio/>}
    {screen==="search"&&<Search/>}
    {screen==="detail"&&!isDesktop&&<Detail/>}
    {screen==="addEntry"&&!isDesktop&&<AddEntry/>}
    {/* R19-9: on desktop the drill-ins render as centered popups over the Portfolio base;
        Buy/Sell (addEntry) stacks on top of the Detail popup. Mobile keeps them full-screen. */}
    {isDesktop&&(screen==="detail"||screen==="addEntry")&&sel&&(
      <Modal size="lg" title={sel.name} onClose={()=>{setScreen("portfolio");setSel(null)}}><Detail/></Modal>
    )}
    {isDesktop&&screen==="addEntry"&&sel&&(
      <Modal size="lg" title={(editEntry?"Edit ":eTxType==="sell"?"Sell ":"Buy ")+(sel.symbol||"")} dismissOnScrim={false} onClose={()=>setScreen("detail")}><AddEntry/></Modal>
    )}
    {/* R25-3: Coin info floats over the CURRENT screen on every device (body-only in the
        shared Modal); closing returns to origin. Rendered last so it stacks above the
        Detail/Buy-Sell popups when opened from the Detail header icon. */}
    {infoCoin&&(
      <Modal size={isDesktop?"lg":"md"} title={infoCoin.name} onClose={()=>setInfoCoin(null)}><CoinInfo/></Modal>
    )}
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
