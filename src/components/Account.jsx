import { useState, useEffect } from "react";
import { useApp } from "../hooks/app-context.js";
import { Ic } from "./ui.jsx";
import { Modal } from "./Modal.jsx";
import { c } from "../utils/theme.js";

// Usage-bar color by fill level (green < 70% < amber < 90% < red).
const barColor = (pct) => pct >= 90 ? "var(--warn)" : pct >= 70 ? "var(--amber)" : "var(--accent)";
const Bar = ({ pct }) => <div className="bar"><div className="bar-fill" style={{ width: pct + "%", background: barColor(pct) }} /></div>;

// Auto-saving preference toggle (a labelled native switch). Used inside detail cards.
function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <label className="toggle-row">
      <span className="toggle-label">{label}{hint && <span className="toggle-hint">{hint}</span>}</span>
      <input type="checkbox" role="switch" checked={!!checked} onChange={e => onChange(e.target.checked)} />
    </label>
  );
}

// Pill switch for the home settings list (Email digest).
function Switch({ checked, onChange }) {
  return (
    <label className="switch">
      <input type="checkbox" role="switch" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span className="slider" />
    </label>
  );
}

// Home settings rows: a chevron nav row (drills into a detail view) or a control row.
function NavRow({ icon, label, value, onClick }) {
  return (
    <button type="button" className="settings-row pressable" onClick={onClick}>
      <span className="sr-icon">{icon}</span>
      <span className="sr-label">{label}</span>
      {value != null && <span className="sr-value">{value}</span>}
      <span className="sr-chev">{Ic.chevR}</span>
    </button>
  );
}
function CtrlRow({ icon, label, children }) {
  return (
    <div className="settings-row">
      <span className="sr-icon">{icon}</span>
      <span className="sr-label">{label}</span>
      <span className="sr-ctrl">{children}</span>
    </div>
  );
}

const SECTION_TITLES = { profile: "Profile", billing: "Plan & billing", portfolios: "Portfolios", security: "Security", privacy: "Privacy & data" };

// USER-SET-UI: the user-scoped settings-panel shell. A framed card whose divided header
// carries a bordered ‹ back BOX + the title once, then a padded body — mirroring the
// admin DScreen (admin-dashboard.jsx) but built from the app's OWN tokens/classes, so no
// admin-only (.adm-*) CSS leaks into the user bundle. ONE responsive design: bounded +
// centred on desktop, full-width on phones, purely via the .set-scr max-width + the app's
// margin-auto reflow (no @media, no desktop/mobile branch). Design-only — onBack is the
// caller's existing handler.
function SettingsScreen({ title, onBack, children }) {
  return (
    <div className="set-scr">
      <div className="set-scr-head">
        <button className="icon-btn" aria-label="Back" onClick={onBack}>{Ic.back}</button>
        <span className="dh-title">{title}</span>
        <span className="set-scr-spacer" />
      </div>
      <div className="set-scr-body">{children}</div>
    </div>
  );
}

// R19-1/R19-2: one portfolio row. The delete confirm MIRRORS the coin (Detail): an
// EMPTY portfolio → quick two-tap trash → "Remove" pill (auto-disarms ~3s); a portfolio
// WITH coins → a blocking warning modal (Cancel / Delete anyway). Confirm state is LOCAL
// to the row so it never leaks across navigation (the R12 lesson). The ✎ opens the shared
// rename dialog. Only shows delete when there's more than one portfolio.
function PortRow({ p }) {
  const { activePortId, setActivePortId, setScreen, deletePortfolio, startRename, portfolios } = useApp();
  const [armed, setArmed] = useState(false); // empty-portfolio two-tap "Remove" pill
  const [warn, setWarn] = useState(false);   // has-coins warning modal
  const canDelete = portfolios.length > 1;
  const hasCoins = (p.coins?.length || 0) > 0;
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <div className="port-row">
      <div className="pr-name-wrap" onClick={() => { setActivePortId(p.id); setScreen("portfolio"); }} style={{ flex: 1, cursor: "pointer" }}>
        <div className={"pr-name" + (p.id === activePortId ? " active" : "")}>{p.name}</div>
        <div className="pr-sub">{p.coins.length} coins{p.id === activePortId ? " · Active" : ""}</div>
      </div>
      <button onClick={() => startRename(p.id)} className="icon-btn" style={{ padding: 4 }} aria-label="Rename portfolio">{Ic.edit}</button>
      {canDelete && (armed
        ? <button className="pill-danger" style={{ animation: "fadeIn 0.15s" }} onClick={() => deletePortfolio(p.id)}>Remove</button>
        : <button onClick={() => { if (hasCoins) setWarn(true); else setArmed(true); }} className="icon-btn" style={{ padding: 4 }} aria-label="Delete portfolio">{Ic.trash}</button>)}
      {warn && (
        <Modal size="sm" title={`Delete ${p.name}?`} onClose={() => setWarn(false)}>
          <div className="dg-warn" style={{ padding: "14px", borderRadius: 12, background: "#FFF8E1", border: "1px solid #FFE082" }}>
            <div className="dg-warn-text" style={{ fontSize: 13, color: "#92400E", lineHeight: 1.7 }}>
              {/* R26: count-aware — 1 coin: "its … thesis" / N coins: "their … theses" */}
              {(() => { const many = p.coins.length > 1; return (
                <>This portfolio has {p.coins.length} coin{many ? "s" : ""} and all {many ? "their" : "its"} transactions and {many ? "theses" : "thesis"}. Deleting it removes all of them — this can't be undone.</>
              ); })()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button className="dg-keep" onClick={() => setWarn(false)} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "1px solid #E8E8ED", background: "#fff", color: c.txt, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            <button onClick={() => { deletePortfolio(p.id); setWarn(false); }} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "none", background: c.red, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Delete anyway</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Account screen: a drill-in settings list (home) + detail views (Profile, Plan &
// billing, Portfolios, Security, Privacy & data). All state + handlers come from
// context; the redesign only relocates them behind navigation. The view sub-state is
// local — no router change. Restyled to the .ci-app design system.
export function Account() {
  const {
    setScreen, user, isPremium, isPro, portfolios, maxPortfolios, maxCoinsPerPort,
    maxTxPerCoin, aiMonthlyCents, portfolio, startUpgrade, startDowngrade, openDowngradeChooser, keepPlan, fmtDate, setActivePortId,
    activePortId, deletePortfolio, newPortName, setNewPortName, addPortfolio,
    downloadMyData, downloadCsv, acctBusy, deleteMyAccount, delConfirm, setDelConfirm, acctMsg, logout,
    delPass, setDelPass, delType, setDelType, cancelDelete,
    pwCur, setPwCur, pwNew, setPwNew, pwMsg, changeMyPassword, signOutEverywhere,
    profName, setProfName, profMsg, saveDisplayName, emNew, setEmNew, emPass, setEmPass, emMsg, requestEmailChange,
    toggleSetting, site,
  } = useApp();
  const settings = user?.settings || {};
  // CRYP-101 (LAUNCH-FREE Part B): paid plans are ON unless the server says exactly false.
  // When off, a non-paid user has nothing to buy, so the upgrade CTAs are hidden — but an
  // existing subscriber's cancel/downgrade/manage flow stays (it gates on tier, not this).
  const paidPlansOn = site?.paidPlansEnabled !== false;
  const [view, setView] = useState("home");
  // CRYP-102: opening a settings drill-in (or returning home) resets scroll to the top
  // so the framed panel always starts at its sticky header, not the prior scroll offset.
  useEffect(() => { window.scrollTo(0, 0); }, [view]);
  const portPct = Math.min(100, (portfolios.length / maxPortfolios) * 100);
  const coinPct = portfolio.length > 0 ? Math.min(100, (portfolio.length / maxCoinsPerPort) * 100) : 0;

  return (
    <div className="ci-app screen-bg">
      <div className="pad">
        <SettingsScreen
          title={view==="home" ? "Account" : SECTION_TITLES[view]}
          onBack={()=> view==="home" ? setScreen("portfolio") : setView("home")}>

          {/* ── HOME: identity + plan-usage summary + settings list ── */}
          {view==="home" && (<>
            <div className="set-scr-section">
              <div className="acct-profile">
                <div className="acct-avatar">{(user?.name||"U").charAt(0).toUpperCase()}</div>
                <div className="acct-name">{user?.name}</div>
                <div className="acct-email">{user?.email}</div>
                <div className={"tier-badge "+(isPremium?"prem":isPro?"pro":"free")}>{isPremium?"PREMIUM":isPro?"PRO":"STARTER"}</div>
              </div>
            </div>

            <div className="set-scr-section">
              <div className="card-title">Plan usage</div>
              <div className="usage-row">
                <div className="usage-top"><span className="usage-k">Portfolios</span><span className="usage-v">{portfolios.length} / {maxPortfolios}</span></div>
                <Bar pct={portPct}/>
              </div>
              <div className="usage-row" style={{borderBottom:"none"}}>
                <div className="usage-top"><span className="usage-k">Coins in active portfolio</span><span className="usage-v">{portfolio.length} / {maxCoinsPerPort}</span></div>
                <Bar pct={coinPct}/>
              </div>
            </div>

            <div className="set-scr-section">
              <div className="acct-list">
                <NavRow icon={Ic.user} label="Profile" onClick={()=>setView("profile")}/>
                <NavRow icon={Ic.card} label="Plan & billing" value={isPremium?"Premium":isPro?"Pro":"Starter"} onClick={()=>setView("billing")}/>
                <NavRow icon={Ic.folder} label="Portfolios" value={portfolios.length+"/"+maxPortfolios} onClick={()=>setView("portfolios")}/>
                <NavRow icon={Ic.shield} label="Security" onClick={()=>setView("security")}/>
                <CtrlRow icon={Ic.bell} label="Email digest"><Switch checked={settings.emailDigest} onChange={v=>toggleSetting("emailDigest",v)}/></CtrlRow>
                <div className="settings-row settings-row-stack">
                  <div className="sr-head"><span className="sr-icon">{Ic.palette}</span><span className="sr-label">Appearance</span></div>
                  <div className="theme-seg" role="radiogroup" aria-label="Theme">
                    {[["light","Light"],["dark","Dark"],["system","System"]].map(([val,label])=>(
                      <button key={val} type="button" role="radio" aria-checked={(settings.theme||"light")===val}
                        className={"theme-opt"+((settings.theme||"light")===val?" on":"")} onClick={()=>toggleSetting("theme",val)}>{label}</button>
                    ))}
                  </div>
                </div>
                <NavRow icon={Ic.lock} label="Privacy & data" onClick={()=>setView("privacy")}/>
              </div>
            </div>

            <button onClick={logout} className="logout-btn set-scr-logout">Logout</button>
          </>)}

          {/* ── PROFILE: editable display name + change email (verify-before-update) ── */}
          {view==="profile" && (<>
            <div className="set-scr-section">
              <label className="acct-label">Display name</label>
              <input type="text" value={profName||""} onChange={e=>setProfName(e.target.value.replace(/[^a-zA-Z\s]/g,""))} placeholder="Your name" autoComplete="name" className="field-input"/>
              <button onClick={saveDisplayName} disabled={acctBusy||!profName||!profName.trim()||profName.trim()===user?.name} className="acct-btn accent">Save name</button>
              {profMsg&&<div className="priv-msg">{profMsg}</div>}
            </div>
            <div className="set-scr-section">
              <label className="acct-label">Change email</label>
              <div className="acct-current">Current: {user?.email}{user?.emailVerified===false?" · unverified":""}</div>
              <input type="email" value={emNew||""} onChange={e=>setEmNew(e.target.value)} placeholder="New email address" autoComplete="email" inputMode="email" className="field-input"/>
              <input type="password" value={emPass||""} onChange={e=>setEmPass(e.target.value)} placeholder="Current password (confirm)" autoComplete="current-password" className="field-input"/>
              <button onClick={requestEmailChange} disabled={acctBusy||!emNew||!emPass} className="acct-btn">Send confirmation link</button>
              {emMsg&&<div className="priv-msg">{emMsg}</div>}
            </div>
          </>)}

          {/* ── PLAN & BILLING: usage bars + subscription status + upgrade/billing ── */}
          {view==="billing" && (() => {
            // Part B: count via the persisted txCount (lazy-loaded portfolios have entries:[]).
            const totalTxAllPorts = portfolios.reduce((s,p) => s + p.coins.reduce((cs,c) => cs + (c.txCount ?? c.entries?.length ?? 0), 0), 0);
            const maxTotalTx = maxPortfolios * maxCoinsPerPort * maxTxPerCoin;
            // Per-user custom limits (premium overrides) — flag which caps are non-default.
            const custom = (isPremium && user?.premiumLimits) || {};
            const Cust = ({k}) => custom[k] != null ? <span className="custom-tag">custom</span> : null;
            const txPct = Math.min(100, (totalTxAllPorts / maxTotalTx) * 100);
            return (<>
            <div className="card-title">Your Plan Usage</div>

            <div className="usage-row">
              <div className="usage-top"><span className="usage-k">Portfolios <Cust k="portfolios"/></span><span className="usage-v">{portfolios.length} / {maxPortfolios}</span></div>
              <Bar pct={portPct}/>
            </div>

            <div className="usage-row">
              <div className="usage-top"><span className="usage-k">Coins in active portfolio <Cust k="coins"/></span><span className="usage-v">{portfolio.length} / {maxCoinsPerPort}</span></div>
              <Bar pct={coinPct}/>
            </div>

            <div className="usage-row">
              <div className="usage-top"><span className="usage-k">Total transactions</span><span className="usage-v">{totalTxAllPorts.toLocaleString()} / {maxTotalTx.toLocaleString()}</span></div>
              <Bar pct={txPct}/>
              <div className="usage-note">Up to {maxTxPerCoin.toLocaleString()} per coin {custom.transactions!=null?"· custom":""}</div>
            </div>

            {/* C-A4 (C6/C7): no user-facing AI budget/usage numbers — everything reads
                "live"; usage + cost are admin-only (the admin dashboard's AI section). */}
            <div className="usage-row">
              <div className="usage-top"><span className="usage-k">AI research</span><span className="usage-v">Live</span></div>
              <div className="usage-note">Research summaries &amp; analysis — included in every plan</div>
            </div>

            <div className="usage-row" style={{borderBottom:"none"}}>
              <div className="usage-top"><span className="usage-k">Joined</span><span className="usage-v">{user?.joined}</span></div>
            </div>

            {/* Active subscription — show renewal date */}
            {isPro&&user?.subscription?.endDate&&!user?.subscription?.cancelled&&!user?.subscription?.paymentFailed&&(
              <div className="sub-note ok">
                Your {user.tier==="premium"?"Premium":"Pro"} subscription renews on<br/>{fmtDate(user.subscription.endDate)}
              </div>
            )}

            {/* Payment failed — 7-day grace period */}
            {user?.subscription?.paymentFailed&&user?.subscription?.paymentFailedDate&&(()=>{
              const failed=new Date(user.subscription.paymentFailedDate);
              const daysLeft=Math.max(0,7-Math.floor((new Date()-failed)/(1000*60*60*24)));
              return(
                <div className="sub-warn">
                  <div className="sw-h">⚠ PAYMENT FAILED</div>
                  <div className="sw-b">Your account will downgrade to Starter in <strong>{daysLeft} day{daysLeft!==1?"s":""}</strong></div>
                  <div className="sw-s">Update your payment method to keep your {user.tier==="premium"?"Premium":"Pro"} access</div>
                </div>
              );
            })()}

            {/* Cancelled subscription — show end date + the R29-2 pending actions:
                un-cancel any time before the end date; Premium can also change which
                plan it lands on (reopens the R29-1 chooser). */}
            {user?.subscription?.cancelled&&user?.subscription?.endDate&&(<>
              <div className="sub-note bad">
                Your {user.tier==="premium"?"Premium":"Pro"} access ends on<br/>{fmtDate(user.subscription.endDate)}<br/>
                <span className="sub-sub">Then your account will become {user.subscription.downgradeTo==="free"?"Starter":"Pro"}</span>
                {/* R31-3: a Premium→Pro downgrade approves the Pro payment up-front */}
                {user.subscription.proApproved&&<span className="sub-sub" style={{display:"block",marginTop:4}}>Pro payment approved ✓</span>}
              </div>
              <button onClick={keepPlan} className="acct-btn ghost">Keep my plan</button>
              {isPremium&&<button onClick={openDowngradeChooser} className="acct-btn ghost">Change downgrade choice</button>}
            </>)}

            {paidPlansOn&&!isPro&&<button onClick={()=>startUpgrade("pro")} className="acct-btn accent">Upgrade to Pro</button>}
            {paidPlansOn&&isPro&&!isPremium&&<button onClick={()=>startUpgrade("premium")} className="acct-btn prem">Upgrade to Premium</button>}
            {isPro&&!isPremium&&!user?.subscription?.cancelled&&<button onClick={()=>startDowngrade("free")} className="acct-btn ghost">Cancel Pro · Switch to Starter</button>}
            {/* R29-1: Premium picks its target (Pro or Starter) in the chooser popup */}
            {isPremium&&!user?.subscription?.cancelled&&<button onClick={openDowngradeChooser} className="acct-btn ghost">Downgrade</button>}
            {/* R27-4: the transparent cancel policy, shown to paying tiers */}
            {isPro&&<div className="sub-sub" style={{textAlign:"center",marginTop:6}}>Cancel anytime · access continues until your paid period ends · no partial refunds.</div>}
            {/* Self-service billing (S9): deep-link to PayPal's hosted recurring-payments page */}
            {isPro&&<a href="https://www.paypal.com/myaccount/autopay/" target="_blank" rel="noopener noreferrer" className="acct-btn ghost pay-link">Update payment method ↗</a>}
            </>);
          })()}

          {/* ── PORTFOLIOS: manage portfolios ── */}
          {view==="portfolios" && (<>
            <div className="card-title">Portfolios ({portfolios.length}/{maxPortfolios})</div>
            {portfolios.map(p=>(<PortRow key={p.id} p={p} />))}
            <div className="port-add">
              <input type="text" value={newPortName} maxLength={50} onChange={e=>setNewPortName(e.target.value)} placeholder="New portfolio name" className="field-input"/>
              <button onClick={addPortfolio} className="add-name">+ Add</button>
            </div>
          </>)}

          {/* ── SECURITY: change password · sign out everywhere ── */}
          {view==="security" && (<>
            <div className="priv-text">Change your password or sign out of every device. Changing your password also signs out other devices.</div>
            <input type="password" value={pwCur||""} onChange={e=>setPwCur(e.target.value)} placeholder="Current password" autoComplete="current-password" className="field-input"/>
            <input type="password" value={pwNew||""} onChange={e=>setPwNew(e.target.value)} placeholder="New password (min 8: Aa1 + special)" autoComplete="new-password" className="field-input"/>
            <button onClick={changeMyPassword} disabled={acctBusy||!pwCur||!pwNew} className="acct-btn accent">Save new password</button>
            {pwMsg&&<div className="priv-msg">{pwMsg}</div>}
            <button onClick={signOutEverywhere} disabled={acctBusy} className="acct-btn ghost">Sign out everywhere</button>
          </>)}

          {/* ── PRIVACY & DATA: consent + marketing + GDPR export/delete ── */}
          {view==="privacy" && (<>
            <ToggleRow label="Allow product analytics" hint="Helps us improve — withdraw anytime" checked={settings.consentAnalytics} onChange={v=>toggleSetting("consentAnalytics",v)}/>
            <ToggleRow label="Product updates & offers" checked={settings.emailMarketing} onChange={v=>toggleSetting("emailMarketing",v)}/>
            <div className="usage-note">Security &amp; payment emails are always sent — you can't opt out of those.</div>
            <div className="priv-text" style={{marginTop:12}}>Download your portfolio as a spreadsheet (CSV) — your coin list, how much you hold, and every transaction. Or export everything we hold (JSON), or permanently delete your account.</div>
            <button onClick={downloadCsv} disabled={acctBusy} className="priv-btn solid">{acctBusy?"…":"Download CSV (spreadsheet)"}</button>
            <button onClick={downloadMyData} disabled={acctBusy} className="priv-btn ghost">{acctBusy?"…":"Download all my data (JSON)"}</button>
            {delConfirm?(
              <>
                <div className="priv-confirm">You'll be signed out and your account moved to trash. You can restore it within <strong>30 days</strong> by logging back in — after that it's deleted forever. Confirm your password and type <strong>DELETE</strong> to continue.</div>
                <input type="password" value={delPass||""} onChange={e=>setDelPass(e.target.value)} placeholder="Your password" autoComplete="current-password" className="field-input"/>
                <input type="text" value={delType||""} onChange={e=>setDelType(e.target.value)} placeholder="Type DELETE to confirm" autoCapitalize="characters" autoComplete="off" className="field-input"/>
                <button onClick={deleteMyAccount} disabled={acctBusy||delType!=="DELETE"||!delPass} className="priv-btn danger-solid">{acctBusy?"…":"Yes, delete my account (restorable for 30 days)"}</button>
                <button onClick={cancelDelete} disabled={acctBusy} className="priv-btn ghost">Cancel</button>
              </>
            ):(
              <button onClick={()=>setDelConfirm(true)} disabled={acctBusy} className="priv-btn danger">Delete my account</button>
            )}
            {acctMsg&&<div className="priv-msg">{acctMsg}</div>}
            <div className="priv-links">
              <a href="/privacy.html">Privacy Policy</a> · <a href="/terms.html">Terms</a>
            </div>
          </>)}

        </SettingsScreen>
      </div>
    </div>
  );
}
