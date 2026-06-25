import { useApp } from "../hooks/app-context.js";
import { Ic } from "./ui.jsx";

// Account screen: profile, plan-usage bars, subscription status, portfolio manager,
// GDPR privacy actions, and logout. All state + handlers come from context.
// Restyled to the .ci-app design system; all data/handlers are unchanged.
export function Account() {
  const {
    setScreen, user, isPremium, isPro, portfolios, maxPortfolios, maxCoinsPerPort,
    maxTxPerCoin, portfolio, startUpgrade, startDowngrade, fmtDate, setActivePortId,
    activePortId, deletePortfolio, newPortName, setNewPortName, addPortfolio,
    downloadMyData, downloadCsv, acctBusy, deleteMyAccount, delConfirm, setDelConfirm, acctMsg, logout,
    delPass, setDelPass, delType, setDelType, cancelDelete,
    pwCur, setPwCur, pwNew, setPwNew, pwMsg, changeMyPassword, signOutEverywhere,
    profName, setProfName, profMsg, saveDisplayName, emNew, setEmNew, emPass, setEmPass, emMsg, requestEmailChange,
  } = useApp();
  return (
    <div className="ci-app screen-bg">
      <div className="detail-head">
        <button className="icon-btn" onClick={()=>setScreen("portfolio")}>{Ic.back}</button>
        <span className="dh-title">Account</span>
        <span style={{width:22}}/>
      </div>

      <div className="acct-profile">
        <div className="acct-avatar">{(user?.name||"U").charAt(0).toUpperCase()}</div>
        <div className="acct-name">{user?.name}</div>
        <div className="acct-email">{user?.email}</div>
        <div className={"tier-badge "+(isPremium?"prem":isPro?"pro":"free")}>{isPremium?"PREMIUM":isPro?"PRO":"STARTER"}</div>
      </div>

      <div className="pad">
        {/* Profile — editable display name + change email (verify-before-update) */}
        <div className="card">
          <div className="card-title">Profile</div>
          <label className="acct-label">Display name</label>
          <input type="text" value={profName||""} onChange={e=>setProfName(e.target.value.replace(/[^a-zA-Z\s]/g,""))} placeholder="Your name" autoComplete="name" className="field-input"/>
          <button onClick={saveDisplayName} disabled={acctBusy||!profName||!profName.trim()||profName.trim()===user?.name} className="acct-btn accent">Save name</button>
          {profMsg&&<div className="priv-msg">{profMsg}</div>}
          <div className="acct-divider"/>
          <label className="acct-label">Change email</label>
          <div className="acct-current">Current: {user?.email}{user?.emailVerified===false?" · unverified":""}</div>
          <input type="email" value={emNew||""} onChange={e=>setEmNew(e.target.value)} placeholder="New email address" autoComplete="email" inputMode="email" className="field-input"/>
          <input type="password" value={emPass||""} onChange={e=>setEmPass(e.target.value)} placeholder="Current password (confirm)" autoComplete="current-password" className="field-input"/>
          <button onClick={requestEmailChange} disabled={acctBusy||!emNew||!emPass} className="acct-btn">Send confirmation link</button>
          {emMsg&&<div className="priv-msg">{emMsg}</div>}
        </div>

        {(() => {
          const totalTxAllPorts = portfolios.reduce((s,p) => s + p.coins.reduce((cs,c) => cs + (c.entries?.length || 0), 0), 0);
          const maxTotalTx = maxPortfolios * maxCoinsPerPort * maxTxPerCoin;
          const portPct = Math.min(100, (portfolios.length / maxPortfolios) * 100);
          const coinPct = portfolio.length > 0 ? Math.min(100, (portfolio.length / maxCoinsPerPort) * 100) : 0;
          const txPct = Math.min(100, (totalTxAllPorts / maxTotalTx) * 100);
          const barColor = (pct) => pct >= 90 ? "var(--warn)" : pct >= 70 ? "var(--amber)" : "var(--accent)";
          const Bar = ({pct}) => (
            <div className="bar"><div className="bar-fill" style={{width:pct+"%",background:barColor(pct)}}/></div>
          );
          return (
        <div className="card">
          <div className="card-title">Your Plan Usage</div>

          <div className="usage-row">
            <div className="usage-top"><span className="usage-k">Portfolios</span><span className="usage-v">{portfolios.length} / {maxPortfolios}</span></div>
            <Bar pct={portPct}/>
          </div>

          <div className="usage-row">
            <div className="usage-top"><span className="usage-k">Coins in active portfolio</span><span className="usage-v">{portfolio.length} / {maxCoinsPerPort}</span></div>
            <Bar pct={coinPct}/>
          </div>

          <div className="usage-row">
            <div className="usage-top"><span className="usage-k">Total transactions</span><span className="usage-v">{totalTxAllPorts.toLocaleString()} / {maxTotalTx.toLocaleString()}</span></div>
            <Bar pct={txPct}/>
            <div className="usage-note">Up to {maxTxPerCoin.toLocaleString()} per coin</div>
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

          {/* Cancelled subscription — show end date */}
          {user?.subscription?.cancelled&&user?.subscription?.endDate&&(
            <div className="sub-note bad">
              Your {user.tier==="premium"?"Premium":"Pro"} access ends on<br/>{fmtDate(user.subscription.endDate)}<br/>
              <span className="sub-sub">Then your account will become {user.subscription.downgradeTo==="free"?"Starter":"Pro"}</span>
            </div>
          )}

          {!isPro&&<button onClick={()=>startUpgrade("pro")} className="acct-btn accent">Upgrade to Pro</button>}
          {isPro&&!isPremium&&<button onClick={()=>startUpgrade("premium")} className="acct-btn prem">Upgrade to Premium</button>}
          {isPro&&!isPremium&&!user?.subscription?.cancelled&&<button onClick={()=>startDowngrade("free")} className="acct-btn ghost">Cancel Pro · Switch to Starter</button>}
          {isPremium&&!user?.subscription?.cancelled&&<button onClick={()=>startDowngrade("pro")} className="acct-btn ghost">Downgrade to Pro</button>}
        </div>
          );
        })()}

        {/* Security (change password · sign out everywhere) */}
        <div className="card">
          <div className="card-title">Security</div>
          <div className="priv-text">Change your password or sign out of every device. Changing your password also signs out other devices.</div>
          <input type="password" value={pwCur||""} onChange={e=>setPwCur(e.target.value)} placeholder="Current password" autoComplete="current-password" className="field-input"/>
          <input type="password" value={pwNew||""} onChange={e=>setPwNew(e.target.value)} placeholder="New password (min 8: Aa1 + special)" autoComplete="new-password" className="field-input"/>
          <button onClick={changeMyPassword} disabled={acctBusy||!pwCur||!pwNew} className="acct-btn accent">Save new password</button>
          {pwMsg&&<div className="priv-msg">{pwMsg}</div>}
          <button onClick={signOutEverywhere} disabled={acctBusy} className="acct-btn ghost">Sign out everywhere</button>
        </div>

        {/* Portfolio Manager */}
        <div className="card">
          <div className="card-title">Portfolios ({portfolios.length}/{maxPortfolios})</div>
          {portfolios.map(p=>(
            <div key={p.id} className="port-row">
              <div className="pr-name-wrap" onClick={()=>{setActivePortId(p.id);setScreen("portfolio")}} style={{flex:1,cursor:"pointer"}}>
                <div className={"pr-name"+(p.id===activePortId?" active":"")}>{p.name}</div>
                <div className="pr-sub">{p.coins.length} coins{p.id===activePortId?" · Active":""}</div>
              </div>
              {portfolios.length>1&&<button onClick={()=>deletePortfolio(p.id)} className="icon-btn" style={{padding:4}}>{Ic.trash}</button>}
            </div>
          ))}

          <div className="port-add">
            <input type="text" value={newPortName} onChange={e=>setNewPortName(e.target.value)} placeholder="New portfolio name" className="field-input"/>
            <button onClick={addPortfolio} className="add-name">+ Add</button>
          </div>
        </div>

        {/* Admin lives in a separate app at /admin (admin.html) — intentionally not in the user app. */}

        {/* Privacy & your data (GDPR/CCPA self-service) */}
        <div className="card">
          <div className="card-title">Privacy & your data</div>
          <div className="priv-text">Download your portfolio as a spreadsheet (CSV) — your coin list, how much you hold, and every transaction. Or export everything we hold (JSON), or permanently delete your account.</div>
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
        </div>

        <button onClick={logout} className="logout-btn">Logout</button>
      </div>
    </div>
  );
}
