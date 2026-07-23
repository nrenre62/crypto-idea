import { useState, useEffect } from "react";
import { useAdminDashboard } from "../hooks/useAdminDashboard.js";
import { trashDaysLeft, partitionUsers } from "../utils/trash.js";

// Per-user custom-limits editor (Premium overrides, S8). Transient form state lives
// here (presentation only); the actual write goes through the hook's changePremiumLimits
// → setPremiumLimits callable. Blank field = tier default; the server clamps each value.
function PremiumLimitsEditor({ found, busy, onSave, c }) {
  const [pl, setPl] = useState({ portfolios: "", coins: "", transactions: "" });
  useEffect(() => {
    const x = found.premiumLimits || {};
    setPl({ portfolios: x.portfolios ?? "", coins: x.coins ?? "", transactions: x.transactions ?? "" });
  }, [found.uid]);
  const save = () => {
    const out = {};
    for (const k of ["portfolios", "coins", "transactions"]) {
      if (pl[k] !== "" && pl[k] != null) { const n = Number(pl[k]); if (isFinite(n) && n >= 0) out[k] = n; }
    }
    onSave(out);
  };
  const field = (k, label, max) => (
    <label style={{ flex:1, fontSize:10, color:c.dm }}>{label}
      <input type="number" min="0" max={max} value={pl[k]} disabled={busy} placeholder="default"
        onChange={e => setPl(p => ({ ...p, [k]: e.target.value }))}
        style={{ width:"100%", marginTop:3, padding:"7px 8px", borderRadius:8, border:`1px solid ${c.bd}`, fontSize:12, boxSizing:"border-box" }} />
    </label>
  );
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:10, fontWeight:700, color:c.dm, letterSpacing:1, marginBottom:8 }}>CUSTOM LIMITS (PREMIUM)</div>
      <div style={{ display:"flex", gap:6, marginBottom:8 }}>
        {field("portfolios", "Portfolios")}
        {field("coins", "Coins (≤1000)", "1000")}
        {field("transactions", "Transactions")}
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <button disabled={busy} onClick={save}
          style={{ flex:1, padding:"9px", borderRadius:8, border:"none", background:c.gr, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>Save custom limits</button>
        <button disabled={busy} onClick={() => onSave({})}
          style={{ flex:1, padding:"9px", borderRadius:8, border:`1px solid ${c.bd}`, background:c.w, color:c.dm, fontSize:12, fontWeight:600, cursor:"pointer" }}>Clear</button>
      </div>
      <div style={{ fontSize:10, color:c.dm, marginTop:6 }}>Blank = tier default. Server clamps to the product ceiling (coins ≤ 1,000).</div>
    </div>
  );
}

const TIERS = {
  free:    { label:"Starter", color:"#FF9500", limits:{ portfolios:1, coins:10, transactions:50 }, storage:"5 MB", price:"$0" },
  pro:     { label:"Pro",     color:"#34C759", limits:{ portfolios:3, coins:50, transactions:2000 }, storage:"500 MB", price:"$9.99/mo" },
  premium: { label:"Premium", color:"#AF52DE", limits:{ portfolios:15, coins:1000, transactions:5000 }, storage:"15 GB", price:"$49.99/mo" },
};

// Friendly labels for audit-log action codes.
const ACTION_LABELS = { setUserTier: "Changed tier", setPremiumLimits: "Set custom limits", suspendUser: "Suspended user", unsuspendUser: "Un-suspended user", deleteUser: "Deleted account", restoreUser: "Restored account", grantAdmin: "Granted admin", revokeAdmin: "Revoked admin", saveConfig: "Saved settings",
  // BL-2 admin actions + BL-1d self-service/billing events (all audited server-side)
  adminTrashUser: "Moved to trash", adminSignOutUser: "Signed user out everywhere",
  selfDeleteAccount: "User deleted own account", selfRestoreAccount: "User restored own account",
  signOutEverywhere: "User signed out everywhere", exportMyData: "User exported data",
  createSubscription: "Started subscription checkout", cancelSubscription: "Cancelled subscription" };

/* ═══ ADMIN-D + ADMIN-D3 — Settings paper drill-in ═══
   The admin Settings tab is rebuilt in the app's .ci-app paper design as an
   iOS-style drill-in list (home → detail cards), matching the user Account screen.
   These primitives mirror Account.jsx's NavRow / CtrlRow / Switch and the inline
   SVGs come 1:1 from docs/mockups/admin-settings/index.html. Design-only: every
   handler (saveConfig / saveControls / setManager …) is the hook's, unchanged. The
   owner-only Admin access grant flow is folded in as one more detail view (ADMIN-D3),
   so it is no longer a separate top-level tab. */
const SVG = (props) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props} />;
const SI = {
  back:        <SVG strokeWidth="2"><path d="M15 18l-6-6 6-6" /></SVG>,
  chev:        <SVG strokeWidth="2"><path d="M9 18l6-6-6-6" /></SVG>,
  maintenance: <SVG strokeWidth="1.8"><path d="M14.7 6.3a3.8 3.8 0 0 1-5 5L5 16v3h3l4.7-4.7a3.8 3.8 0 0 0 5-5l-2.3 2.3-2-2 2.3-2.3z" /></SVG>,
  signups:     <SVG strokeWidth="1.8"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" /><path d="M18.5 8v6M15.5 11h6" /></SVG>,
  keys:        <SVG strokeWidth="1.8"><circle cx="8" cy="15" r="3.4" /><path d="M10.4 12.6 20 3M17 6l2.2 2M14.6 8.4l2 2" /></SVG>,
  email:       <SVG strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2.4" /><path d="m3.5 7.5 8.5 6 8.5-6" /></SVG>,
  plans:       <SVG strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2.4" /><path d="M3 10h18" /></SVG>,
  ai:          <SVG strokeWidth="1.8"><path d="M12 3.5l1.7 4.4 4.4 1.7-4.4 1.7L12 15.7l-1.7-4.4L5.9 9.6l4.4-1.7z" /><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></SVG>,
  analytics:   <SVG strokeWidth="1.8"><path d="M4 19h16" /><path d="M6 19v-6M11 19V6M16 19v-9" /></SVG>,
  access:      <SVG strokeWidth="1.8"><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></SVG>,
};
// A tappable category row (drills into a detail view).
function NavRow({ icon, label, value, muted, onClick }) {
  return (
    <button type="button" className="settings-row pressable" onClick={onClick}>
      <span className="sr-icon">{icon}</span>
      <span className="sr-label">{label}</span>
      {value != null && <span className={"sr-value" + (muted ? " muted" : "")}>{value}</span>}
      <span className="sr-chev">{SI.chev}</span>
    </button>
  );
}
// A control row: label + an inline control (a pill switch).
function CtrlRow({ icon, label, children }) {
  return (
    <div className="settings-row">
      <span className="sr-icon">{icon}</span>
      <span className="sr-label">{label}</span>
      <span className="sr-ctrl">{children}</span>
    </div>
  );
}
// Pill switch (mirrors Account's home Switch). `warn` tints the ON state amber.
function Switch({ checked, warn, onChange }) {
  return (
    <label className={"switch" + (warn ? " warn" : "")}>
      <input type="checkbox" role="switch" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span className="slider" />
    </label>
  );
}
// Detail-view header: back chevron + centered title (matches Account's detail-head).
function DHead({ title, onBack }) {
  return (
    <div className="detail-head">
      <button className="icon-btn" aria-label="Back" onClick={onBack}>{SI.back}</button>
      <span className="dh-title">{title}</span>
      <span style={{ width: 34 }} />
    </div>
  );
}

// Presentation only — all state, data-loading and admin actions live in the hook.
export default function AdminDashboard() {
  const {
    stats, setStats, statsErr, setStatsErr, tab, setTab,
    keys, setKeys, mail, setMail, savedMsg, setSavedMsg, setFlags, setSetFlags, cfgAt, setCfgAt,
    controls, setControls, analytics, setAnalytics, legal, setLegal, plans, setPlans,
    lookupEmail, setLookupEmail, found, setFound, lookupMsg, setLookupMsg, actionMsg, setActionMsg,
    confirmDelete, setConfirmDelete, busy, setBusy,
    userList, setUserList, listMsg, setListMsg, listLoading, setListLoading, q, setQ, page, setPage, PAGE_SIZE,
    audit, setAudit, auditLoading, setAuditLoading, auditMsg, setAuditMsg,
    s,
    loadConfig, saveConfig, saveControls, loadUserList, loadAudit, lookup, openUser, changeTier, changePremiumLimits, toggleSuspend, doDelete,
    restoreFromTrash, purgeFromTrash,
    confirmTrash, setConfirmTrash, confirmEmpty, setConfirmEmpty,
    delText, setDelText, purgeUid, setPurgeUid,
    trashUser, signOutUser, emptyTrash,
    role, roleLoaded, isOwner, unlocked,
    unlockPrompt, unlockPass, setUnlockPass, unlockErr, submitUnlock, cancelUnlock,
    grantEmail, setGrantEmail, grantEmail2, setGrantEmail2, grantFound,
    grantMsg, grantWarn, setGrantWarn, grantLookup, setManager,
  } = useAdminDashboard();

  // ADMIN-D: which Settings screen is showing — "home" or a detail drill-in.
  // Local to the component (no router), exactly like Account.jsx's `view`.
  const [settingsView, setSettingsView] = useState("home");

  const c = { bg:"#F5F5F5", w:"#fff", tx:"#1A1A1A", dm:"#999", bd:"#E8E8ED", gr:"#34C759", or:"#FF9500", bl:"#007AFF", rd:"#FF3B30", pr:"#AF52DE" };

  const Bdg = ({ tier }) => {
    const t = TIERS[tier] || TIERS.free;
    return <span style={{ fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:20, background:t.color+"18", color:t.color }}>{t.label.toUpperCase()}</span>;
  };

  return (
    <div style={{ fontFamily:"'SF Pro Display',-apple-system,sans-serif", background:c.bg, minHeight:"100vh", padding:"20px clamp(16px, 4vw, 32px)", maxWidth:1040, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:200, letterSpacing:"-0.5px" }}>Crypto <span style={{ fontWeight:700 }}>Idea</span></div>
          <div style={{ fontSize:11, color:c.dm, marginTop:2 }}>Admin Dashboard</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <div style={{ width:6, height:6, borderRadius:3, background: statsErr ? c.rd : stats ? c.gr : c.or }} />
          <span style={{ fontSize:10, color:c.dm }}>{statsErr ? "Error" : stats ? "Live Data" : "Loading…"}</span>
        </div>
      </div>

      {/* Tabs — ADMIN-SEC: Settings is owner-only. Hiding it is a convenience; the
          callables refuse a manager regardless, and firestore.rules refuses a
          manager's direct writes, so this is the third layer, not the first.
          ADMIN-D3: "Admin access" is no longer a tab — it lives inside Settings. */}
      <div style={{ display:"flex", gap:4, marginBottom:14, background:c.w, borderRadius:12, padding:4, border:`1px solid ${c.bd}` }}>
        {["overview","users","trash", ...(isOwner ? ["settings"] : []), "audit"].map(tb => (
          <button key={tb} onClick={() => { setTab(tb); if (tb !== "settings") setSettingsView("home"); }}
            style={{ flex:1, padding:10, borderRadius:10, border:"none", fontSize:13, fontWeight:600, cursor:"pointer", background:tab===tb?c.tx:"transparent", color:tab===tb?"#fff":c.dm }}>
            {tb.charAt(0).toUpperCase()+tb.slice(1)}
          </button>
        ))}
      </div>

      {/* ADMIN-SEC: make the caller's own role legible — a manager who can't find
          Settings should see WHY, and a legacy role-less admin needs to know they're
          mid-migration rather than assume the panel is broken. */}
      {roleLoaded && role !== "owner" && (
        <div style={{ marginBottom:12, padding:"9px 12px", borderRadius:10, fontSize:11,
          border:`1px solid ${role === "manager" ? c.bd : c.or}`, background: role === "manager" ? c.w : c.or+"10", color: role === "manager" ? c.dm : c.or }}>
          {role === "manager"
            ? <>Signed in as a <b>manager</b> — accounts only. Settings (including admin access) and permanent deletion are owner-only.</>
            : <>⚠ This admin account has <b>no role</b> yet (created before roles existed). Account actions work, but Settings (including admin access) stays locked until an owner runs <code>set-admin.js --role=…</code> and you sign in again.</>}
        </div>
      )}

      {/* ═══ OVERVIEW (real, combined, no personal data) ═══ */}
      {/* BL-1e: a getStats failure renders as an explicit error — never as a
          plausible all-zero / $0 dashboard (the zeros are EMPTY_STATS, not data). */}
      {tab === "overview" && statsErr && !stats && (
        <div style={{ background:"#FDECEA", border:"1px solid #F5C6C0", borderRadius:14, padding:16, marginBottom:10 }}>
          <div style={{ fontSize:13, fontWeight:700, color:c.rd, marginBottom:4 }}>Couldn't load stats</div>
          <div style={{ fontSize:12, color:c.dm }}>{statsErr} — the dashboard numbers are unavailable (not zero). Reload the page to retry.</div>
        </div>
      )}
      {tab === "overview" && !(statsErr && !stats) && (<>
        {/* Stats */}
        <div style={{ display:"flex", gap:6, marginBottom:10 }}>
          {[[s.totalUsers,"Total",c.tx],[s.freeUsers,"Starter",c.or],[s.proUsers,"Pro",c.gr],[s.premiumUsers,"Premium",c.pr]].map(([val,label,color]) => (
            <div key={label} style={{ background:c.w, borderRadius:14, padding:"14px 10px", border:`1px solid ${c.bd}`, textAlign:"center", flex:1 }}>
              <div style={{ fontSize:24, fontWeight:700, letterSpacing:"-1px", color }}>{val}</div>
              <div style={{ fontSize:8, color:c.dm, marginTop:2, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* On desktop these three sit side-by-side; on mobile auto-fit collapses to one column. */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:10, alignItems:"start", marginBottom:10 }}>

        {/* Revenue — shown NET of payment-processor fees (gross − fees). Falls back
            to client-side fee math if getStats predates the net fields. */}
        {(() => {
          const gross = s.grossRevenue != null ? s.grossRevenue : s.estimatedRevenue;
          const fees  = s.paymentFees  != null ? s.paymentFees  : gross * 0.029 + (s.proUsers + s.premiumUsers) * 0.30;
          const net   = s.netRevenue   != null ? s.netRevenue   : Math.max(0, gross - fees);
          return (
        <div style={{ background:c.w, borderRadius:14, padding:14, border:`1px solid ${c.bd}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:13, fontWeight:600 }}>Est. Monthly Revenue</span>
            <span style={{ fontSize:18, fontWeight:800, color:c.gr }}>${net.toFixed(0)}</span>
          </div>
          <div style={{ fontSize:10, color:c.dm, marginBottom:3 }}>
            Net after fees · gross ${gross.toFixed(0)} − fees ${fees.toFixed(2)} (PayPal ~2.9% + $0.30/charge)
          </div>
          <div style={{ fontSize:10, color:c.dm }}>
            {s.proUsers} Pro × ${s.proPrice} = ${(s.proUsers*s.proPrice).toFixed(0)} · {s.premiumUsers} Premium × ${s.premiumPrice} = ${(s.premiumUsers*s.premiumPrice).toFixed(0)}
          </div>
        </div>
          );
        })()}

        {/* Combined usage — aggregate engagement, no personal data */}
        <div style={{ background:c.w, borderRadius:14, padding:14, border:`1px solid ${c.bd}` }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>Combined Usage <span style={{ fontWeight:400, color:c.dm }}>· no personal data</span></div>
          <div style={{ display:"flex", gap:6 }}>
            {[
              [s.totalPortfolios, "Portfolios", (s.totalUsers ? s.totalPortfolios / s.totalUsers : 0).toFixed(1)],
              [s.totalCoins, "Coins tracked", (s.totalUsers ? s.totalCoins / s.totalUsers : 0).toFixed(1)],
            ].map(([total, label, avg]) => (
              <div key={label} style={{ flex:1, background:c.bg, borderRadius:10, padding:"10px", textAlign:"center" }}>
                <div style={{ fontSize:20, fontWeight:800, color:c.bl }}>{total}</div>
                <div style={{ fontSize:9, color:c.dm, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px", marginTop:2 }}>{label}</div>
                <div style={{ fontSize:10, color:c.dm, marginTop:4 }}>avg {avg}/user</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier Breakdown */}
        <div style={{ background:c.w, borderRadius:14, padding:14, border:`1px solid ${c.bd}` }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>Tier Breakdown</div>
          <div style={{ display:"flex", height:28, borderRadius:6, overflow:"hidden" }}>
            {[[s.freeUsers,"free"],[s.proUsers,"pro"],[s.premiumUsers,"premium"]].map(([n,key]) => n > 0 && (
              <div key={key} style={{ width:`${s.totalUsers > 0 ? n/s.totalUsers*100 : 0}%`, background:TIERS[key].color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", minWidth:20 }}>{n}</div>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:9, fontWeight:600 }}>
            <span style={{ color:c.or }}>Starter ({s.freeUsers})</span>
            <span style={{ color:c.gr }}>Pro ({s.proUsers})</span>
            <span style={{ color:c.pr }}>Premium ({s.premiumUsers})</span>
          </div>
        </div>

        </div>{/* end overview grid — Plan Limits below spans full width */}

        {/* Tier Limits Reference */}
        <div style={{ background:c.w, borderRadius:14, padding:14, border:`1px solid ${c.bd}`, marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:10 }}>Plan Limits</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:1, background:c.bd, borderRadius:10, overflow:"hidden" }}>
            {["free","pro","premium"].map(tier => {
              const t = TIERS[tier];
              const p = plans[tier] || t.limits;   // live configured values
              const price = (plans[tier] && plans[tier].price != null) ? (plans[tier].price ? "$" + plans[tier].price + "/mo" : "$0") : t.price;
              return (
                <div key={tier} style={{ background:c.w, padding:"12px 10px", textAlign:"center" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:t.color, marginBottom:8 }}>{t.label.toUpperCase()}</div>
                  <div style={{ fontSize:9, color:c.dm, marginBottom:3 }}>Portfolios</div>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>{p.portfolios}</div>
                  <div style={{ fontSize:9, color:c.dm, marginBottom:3 }}>Coins</div>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>{p.coins}</div>
                  <div style={{ fontSize:9, color:c.dm, marginBottom:3 }}>Tx/coin</div>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>{(p.transactions||0).toLocaleString()}</div>
                  <div style={{ fontSize:9, color:c.dm, marginBottom:3 }}>Storage</div>
                  <div style={{ fontSize:12, fontWeight:700 }}>{t.storage}</div>
                  <div style={{ fontSize:9, color:c.dm, marginTop:6, fontWeight:600 }}>{price}</div>
                </div>
              );
            })}
          </div>
        </div>
      </>)}

      {/* ═══ USERS — on-demand lookup for support / moderation ═══ */}
      {tab === "users" && (<>
        <div style={{ fontSize:11, color:c.dm, marginBottom:10, lineHeight:1.5 }}>
          All users — search by email or name, click a row to manage. Operational data only (tier, status, usage) — never holdings.
        </div>
        <div style={{ display:"flex", gap:6, marginBottom:12 }}>
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search email or name…"
            style={{ flex:1, padding:"12px 14px", background:c.w, border:`1px solid ${c.bd}`, borderRadius:12, fontSize:14, outline:"none", boxSizing:"border-box" }} />
          <button onClick={loadUserList} disabled={listLoading}
            style={{ padding:"0 16px", borderRadius:12, border:`1px solid ${c.bd}`, background:c.w, color:c.tx, fontSize:13, fontWeight:600, cursor:"pointer", opacity:listLoading?0.6:1 }}>
            {listLoading ? "…" : "Refresh"}
          </button>
        </div>

        {lookupMsg && <div style={{ fontSize:12, color:c.rd, marginBottom:10 }}>{lookupMsg}</div>}

        {found && (
          <div style={{ background:c.w, borderRadius:16, padding:16, border:`1px solid ${c.bd}`, marginBottom:12 }}>
            <div style={{ textAlign:"right", marginBottom:2 }}><span onClick={() => { setFound(null); setConfirmDelete(false); }} style={{ fontSize:12, color:c.dm, cursor:"pointer" }}>✕ Close</span></div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700 }}>{found.name || found.email}</div>
                <div style={{ fontSize:11, color:c.dm }}>{found.email}</div>
              </div>
              <div style={{ display:"flex", gap:5, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
                <Bdg tier={found.tier} />
                {found.disabled && <span style={{ fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:20, background:c.rd+"18", color:c.rd }}>SUSPENDED</span>}
                {found.isAdmin && <span style={{ fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:20, background:c.tx+"18", color:c.tx }}>ADMIN</span>}
              </div>
            </div>

            {/* Usage (counts only — never holdings) */}
            <div style={{ display:"flex", gap:6, marginBottom:14 }}>
              {[[found.portfolioCount,"Portfolios"],[found.coinCount,"Coins"]].map(([v,l]) => (
                <div key={l} style={{ flex:1, background:c.bg, borderRadius:10, padding:"10px", textAlign:"center" }}>
                  <div style={{ fontSize:18, fontWeight:800 }}>{v}</div>
                  <div style={{ fontSize:9, color:c.dm, fontWeight:600, textTransform:"uppercase" }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Last paid tier — survives an auto-downgrade so "was Pro/Premium" isn't lost (S9) */}
            {found.tierBeforeFailure && found.tier === "free" && (
              <div style={{ fontSize:11, color:c.dm, marginBottom:10 }}>
                Last paid tier: <strong style={{ color: TIERS[found.tierBeforeFailure]?.color || c.tx }}>{TIERS[found.tierBeforeFailure]?.label || found.tierBeforeFailure}</strong> · downgraded
              </div>
            )}

            {/* Change tier (manual upgrade / refund) */}
            <div style={{ fontSize:10, fontWeight:700, color:c.dm, letterSpacing:1, marginBottom:8 }}>CHANGE TIER</div>
            <div style={{ display:"flex", gap:6, marginBottom:14 }}>
              {["free","pro","premium"].map(t => (
                <button key={t} disabled={busy || found.tier === t} onClick={() => changeTier(t)}
                  style={{ flex:1, padding:"9px", borderRadius:8,
                    border: found.tier === t ? `2px solid ${TIERS[t].color}` : `1px solid ${c.bd}`,
                    fontSize:10, fontWeight:700, cursor: found.tier === t ? "default" : "pointer",
                    background: found.tier === t ? TIERS[t].color+"15" : c.w, color:TIERS[t].color, opacity: found.tier === t ? 1 : 0.6 }}>
                  {TIERS[t].label.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Custom limits (Premium per-user overrides, S8) */}
            {found.tier === "premium" && (
              <PremiumLimitsEditor found={found} busy={busy} onSave={changePremiumLimits} c={c} />
            )}

            {/* Moderation */}
            <div style={{ display:"flex", gap:6 }}>
              <button disabled={busy} onClick={toggleSuspend}
                style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${c.or}`, background:c.or+"10", color:c.or, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                {found.disabled ? "Un-suspend" : "Suspend"}
              </button>
              <button disabled={busy} onClick={signOutUser}
                style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${c.bd}`, background:c.w, color:c.tx, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                Sign out all devices
              </button>
            </div>
            {/* R31-5: ONE delete path — Delete → type DELETE → move to the 30-day trash.
                Hard (permanent) deletion lives ONLY in the Trash tab. */}
            {confirmDelete ? (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:11, color:c.tx, marginBottom:6 }}>Type <b>DELETE</b> to move this account to the trash (recoverable for 30 days):</div>
                <input value={delText} onChange={e => setDelText(e.target.value)} placeholder="DELETE" autoFocus
                  style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:10, border:`1px solid ${c.bd}`, fontSize:13, marginBottom:6 }} />
                <div style={{ display:"flex", gap:6 }}>
                  <button disabled={busy} onClick={() => { setConfirmDelete(false); setDelText(""); }}
                    style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${c.bd}`, background:c.w, color:c.tx, fontSize:12, fontWeight:600, cursor:"pointer" }}>Cancel</button>
                  <button disabled={busy || delText !== "DELETE"} onClick={trashUser}
                    style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background: delText==="DELETE" ? c.rd : c.dm, color:"#fff", fontSize:12, fontWeight:700, cursor: delText==="DELETE"?"pointer":"not-allowed", opacity: (busy||delText!=="DELETE")?0.6:1 }}>Move to trash</button>
                </div>
              </div>
            ) : (
              <button disabled={busy} onClick={() => { setConfirmDelete(true); setDelText(""); }}
                style={{ width:"100%", marginTop:10, padding:"10px", borderRadius:10, border:`1px solid ${c.rd}`, background:c.rd+"10", color:c.rd, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                Delete account
              </button>
            )}
            <div style={{ fontSize:9, color:c.dm, marginTop:8 }}>Delete moves the account to the trash — recoverable for 30 days. Permanent erasure (GDPR/CCPA) happens only from the Trash tab. Owner accounts can never be deleted or demoted. Sign-out forces every device to re-authenticate.</div>

            {/* ADMIN-SEC: the per-user "Make admin" button lived here and is GONE.
                It was the bypass — any admin could promote throw-away accounts and then
                delete the real owners while the admin count still looked healthy. Roles
                are now granted only from the owner-only Admin access tab, and owners can
                only ever be minted by functions/scripts/set-admin.js. */}
            {found.role === "owner" && (
              <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${c.bd}`, fontSize:10, color:c.dm }}>
                🔒 This is an <b>owner</b> account — protected. It can't be suspended, trashed, deleted or demoted from the panel.
              </div>
            )}
            {actionMsg && <div style={{ textAlign:"center", marginTop:10, fontSize:12, color:c.gr, fontWeight:600 }}>{actionMsg}</div>}
          </div>
        )}

        {/* Full list — searched + paginated (50/page) entirely client-side over the loaded list. */}
        {listMsg && <div style={{ fontSize:12, color:c.rd, marginBottom:10 }}>{listMsg}</div>}
        {(() => {
          if (listLoading && !userList) return <div style={{ textAlign:"center", color:c.dm, fontSize:13, padding:"24px 0" }}>Loading users…</div>;
          if (!userList) return null;
          const needle = q.trim().toLowerCase();
          const { active } = partitionUsers(userList); // trashed accounts live in the Trash tab
          const filtered = needle ? active.filter(u => (u.email||"").toLowerCase().includes(needle) || (u.name||"").toLowerCase().includes(needle)) : active;
          const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
          const pg = Math.min(page, pages);
          const rows = filtered.slice((pg-1)*PAGE_SIZE, pg*PAGE_SIZE);
          return (<>
            <div style={{ fontSize:11, color:c.dm, margin:"2px 2px 8px" }}>{filtered.length.toLocaleString()} user{filtered.length===1?"":"s"}{needle?` matching “${q.trim()}”`:""}{userList.length>=5000?" · showing first 5,000":""}</div>
            <div style={{ background:c.w, border:`1px solid ${c.bd}`, borderRadius:14, overflow:"hidden" }}>
              {rows.length === 0 && <div style={{ padding:"20px", textAlign:"center", color:c.dm, fontSize:13 }}>No users found.</div>}
              {rows.map((u, i) => (
                <div key={u.uid} onClick={() => openUser(u.email)}
                  style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 14px", cursor:"pointer", borderTop: i ? `1px solid ${c.bd}` : "none", background: found && found.uid===u.uid ? c.bg : c.w }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.name || u.email}</div>
                    <div style={{ fontSize:11, color:c.dm, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.email}</div>
                  </div>
                  <div style={{ fontSize:11, color:c.dm, width:30, textAlign:"center" }} title="Portfolios">{u.portfolioCount}</div>
                  <Bdg tier={u.tier} />
                  {u.disabled && <span style={{ fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:20, background:c.rd+"18", color:c.rd }}>SUSP</span>}
                  {u.isAdmin && <span style={{ fontSize:8, fontWeight:700, padding:"2px 6px", borderRadius:20, background:c.tx+"18", color:c.tx }}>ADMIN</span>}
                </div>
              ))}
            </div>
            {pages > 1 && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:14, marginTop:12 }}>
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={pg<=1}
                  style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${c.bd}`, background:c.w, fontSize:13, cursor:pg<=1?"default":"pointer", opacity:pg<=1?0.4:1 }}>← Prev</button>
                <span style={{ fontSize:12, color:c.dm }}>Page {pg} of {pages}</span>
                <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={pg>=pages}
                  style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${c.bd}`, background:c.w, fontSize:13, cursor:pg>=pages?"default":"pointer", opacity:pg>=pages?0.4:1 }}>Next →</button>
              </div>
            )}
          </>);
        })()}
      </>)}

      {/* ═══ TRASH — soft-deleted accounts, recoverable for 30 days ═══ */}
      {tab === "trash" && (<>
        <div style={{ fontSize:11, color:c.dm, marginBottom:10, lineHeight:1.5 }}>
          Accounts users have deleted. They're kept for <b>30 days</b> so they can be restored, then purged automatically. Restore brings the account fully back; Delete now erases it permanently.
        </div>
        {actionMsg && <div style={{ fontSize:12, color: actionMsg.includes("✓") ? c.gr : c.rd, marginBottom:10, fontWeight:600 }}>{actionMsg}</div>}
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginBottom:10 }}>
          {/* BL-2b/N-2: bulk-purge everything in the trash now (two-tap confirm). */}
          {(() => {
            const trashedNow = userList ? partitionUsers(userList).trashed : [];
            if (trashedNow.length === 0) return null;
            // R31-5: bulk hard-delete is behind a typed DELETE.
            return confirmEmpty ? (
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <input value={delText} onChange={e => setDelText(e.target.value)} placeholder="Type DELETE" autoFocus
                  style={{ padding:"7px 10px", borderRadius:9, border:`1px solid ${c.bd}`, fontSize:12, width:110 }} />
                <button onClick={() => emptyTrash(trashedNow.map(u => u.uid))} disabled={busy || delText !== "DELETE"}
                  style={{ padding:"7px 12px", borderRadius:10, border:"none", background: delText==="DELETE"?c.rd:c.dm, color:"#fff", fontSize:13, fontWeight:700, cursor: delText==="DELETE"?"pointer":"not-allowed", opacity:(busy||delText!=="DELETE")?0.6:1 }}>
                  Delete {trashedNow.length}
                </button>
                <button onClick={() => { setConfirmEmpty(false); setDelText(""); }}
                  style={{ padding:"7px 12px", borderRadius:10, border:`1px solid ${c.bd}`, background:c.w, fontSize:13, cursor:"pointer" }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => { setConfirmEmpty(true); setDelText(""); }} disabled={busy}
                style={{ padding:"7px 14px", borderRadius:10, border:`1px solid ${c.rd}`, background:c.rd+"10", color:c.rd, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                Empty trash
              </button>
            );
          })()}
          <button onClick={loadUserList} disabled={listLoading} style={{ padding:"7px 14px", borderRadius:10, border:`1px solid ${c.bd}`, background:c.w, fontSize:13, fontWeight:600, cursor:"pointer", opacity:listLoading?0.6:1 }}>{listLoading ? "…" : "Refresh"}</button>
        </div>
        {(() => {
          if (listLoading && !userList) return <div style={{ textAlign:"center", color:c.dm, fontSize:13, padding:"24px 0" }}>Loading…</div>;
          if (!userList) return null;
          const trashed = partitionUsers(userList).trashed.sort((a,b) => (a.deletedAt||0) - (b.deletedAt||0));
          if (trashed.length === 0) return <div style={{ background:c.w, border:`1px solid ${c.bd}`, borderRadius:14, padding:"24px", textAlign:"center", color:c.dm, fontSize:13 }}>Trash is empty.</div>;
          return (
            <div style={{ background:c.w, border:`1px solid ${c.bd}`, borderRadius:14, overflow:"hidden" }}>
              {trashed.map((u, i) => {
                const left = trashDaysLeft(u.deletedAt);
                return (
                  <div key={u.uid} style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 14px", borderTop: i ? `1px solid ${c.bd}` : "none" }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.name || u.email}</div>
                      <div style={{ fontSize:11, color:c.dm }}>{u.email}</div>
                      <div style={{ fontSize:10, color: left===0 ? c.rd : c.dm, marginTop:2 }}>{left===0 ? "Expired — will be purged" : `${left} day${left===1?"":"s"} left to restore`}</div>
                    </div>
                    <button onClick={() => restoreFromTrash(u.uid)} disabled={busy}
                      style={{ padding:"7px 12px", borderRadius:9, border:"none", background:c.gr, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", opacity:busy?0.6:1, flexShrink:0 }}>Restore</button>
                    {/* R31-5: permanent single-account erasure is behind a typed DELETE. */}
                    {purgeUid === u.uid ? (
                      <div style={{ display:"flex", gap:4, alignItems:"center", flexShrink:0 }}>
                        <input value={delText} onChange={e => setDelText(e.target.value)} placeholder="DELETE" autoFocus
                          style={{ padding:"6px 8px", borderRadius:8, border:`1px solid ${c.bd}`, fontSize:11, width:70 }} />
                        <button onClick={() => purgeFromTrash(u.uid)} disabled={busy || delText !== "DELETE"}
                          style={{ padding:"7px 10px", borderRadius:9, border:"none", background: delText==="DELETE"?c.rd:c.dm, color:"#fff", fontSize:12, fontWeight:700, cursor: delText==="DELETE"?"pointer":"not-allowed", opacity:(busy||delText!=="DELETE")?0.6:1 }}>OK</button>
                        <button onClick={() => { setPurgeUid(null); setDelText(""); }}
                          style={{ padding:"7px 8px", borderRadius:9, border:`1px solid ${c.bd}`, background:c.w, fontSize:11, cursor:"pointer" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setPurgeUid(u.uid); setDelText(""); }} disabled={busy}
                        style={{ padding:"7px 12px", borderRadius:9, border:`1px solid ${c.rd}`, background:c.rd+"12", color:c.rd, fontSize:12, fontWeight:600, cursor:"pointer", opacity:busy?0.6:1, flexShrink:0 }}>Delete now</button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </>)}

      {/* ═══ SETTINGS — paper drill-in (ADMIN-D + ADMIN-D3) ═══
          Home = a Configuration summary + the two global switches inline + a row per
          category; each row drills into a detail card. The owner-only Admin access
          grant/revoke flow is folded in as the last row (ADMIN-D3) — no longer a tab.
          Design-only: every handler here is the hook's, unchanged. This reskin covers
          the Settings tab only; the rest of the panel stays as-is until ADMIN-D2. */}
      {tab === "settings" && (() => {
        const providerLabel = (p) => p === "activecampaign" ? "ActiveCampaign" : p === "getresponse" ? "GetResponse" : "None";
        const anaSummary = [analytics.ga4 && "GA4", analytics.plausible && "Plausible", legal.termlyUuid && "Termly"].filter(Boolean).join(" · ");
        const keysSet = [setFlags.coingecko, !!keys.paypalClientId, setFlags.paypalSecret, !!keys.paypalWebhookId].filter(Boolean).length;
        const back = () => setSettingsView("home");
        const titles = { apiKeys:"API keys", email:"Email & integrations", plans:"Plans & pricing", ai:"AI", analytics:"Analytics & legal", access:"Admin access" };
        return (
        <div className="ci-app">
          {settingsView !== "home" && <DHead title={titles[settingsView]} onBack={back} />}
          <div className="pad">

            {/* ── HOME ── */}
            {settingsView === "home" && (<>
              <div className="card">
                <div className="card-title" style={{ marginBottom:12 }}>Configuration</div>
                {[
                  ["Payments", !!setFlags.paypalSecret, setFlags.paypalSecret ? "PayPal connected" : "Not set"],
                  ["Market data", !!setFlags.coingecko, setFlags.coingecko ? "CoinGecko connected" : "Not set"],
                  ["Email", !!(mail.provider && mail.provider !== "none"), (mail.provider && mail.provider !== "none") ? providerLabel(mail.provider) : "Not connected"],
                  ["Analytics & legal", !!anaSummary, anaSummary || "Not set"],
                  ["AI", false, setFlags.anthropicKey ? "Key saved · starts at go-live" : "Not set"],
                ].map(([label, ok, val]) => (
                  <div key={label} className="status-row">
                    <span className={"dot " + (ok ? "ok" : "idle")} />
                    <span className="st-label">{label}</span>
                    <span className="st-val">{val}</span>
                  </div>
                ))}
              </div>

              <div className="card acct-list">
                <CtrlRow icon={SI.maintenance} label="Maintenance mode">
                  <Switch checked={!!controls.maintenance} warn onChange={() => saveControls({ ...controls, maintenance: !controls.maintenance })} />
                </CtrlRow>
                <CtrlRow icon={SI.signups} label="Allow new signups">
                  <Switch checked={controls.signupsEnabled !== false} onChange={() => saveControls({ ...controls, signupsEnabled: !(controls.signupsEnabled !== false) })} />
                </CtrlRow>
                <NavRow icon={SI.keys} label="API keys" value={keysSet ? keysSet + " set" : "Not set"} onClick={() => setSettingsView("apiKeys")} />
                <NavRow icon={SI.email} label="Email & integrations" value={providerLabel(mail.provider)} onClick={() => setSettingsView("email")} />
                <NavRow icon={SI.plans} label="Plans & pricing" value="3 tiers" onClick={() => setSettingsView("plans")} />
                <NavRow icon={SI.ai} label="AI" value={setFlags.anthropicKey ? "Key saved" : "Reserved"} muted={!setFlags.anthropicKey} onClick={() => setSettingsView("ai")} />
                <NavRow icon={SI.analytics} label="Analytics & legal" value={anaSummary || "Off"} onClick={() => setSettingsView("analytics")} />
                <NavRow icon={SI.access} label="Admin access" onClick={() => setSettingsView("access")} />
              </div>

              <div className="set-foot">Saved to the locked <code>config/app</code> document — clients can never read it; the price proxy + PayPal functions read it server-side. Toggles go live within about a minute.</div>
            </>)}

            {/* ── API KEYS ── */}
            {settingsView === "apiKeys" && (
              <div className="card">
                <div className="card-title">API keys</div>
                <div className="card-sub">For the price / DCA calculator (CoinGecko) and payments (PayPal). Stored server-side — never sent to users.</div>
                {[
                  ["CoinGecko Demo key","coingecko","cg-demo-…"],
                  ["PayPal Client ID","paypalClientId","A…"],
                  ["PayPal Secret","paypalSecret","E…"],
                  ["PayPal Webhook ID","paypalWebhookId","WH-…"],
                ].map(([label,key,ph]) => (
                  <div key={key}>
                    <label className="acct-label">{label}</label>
                    <input className="field-input" type={(key.toLowerCase().includes("ecret")||key==="coingecko")?"password":"text"} value={keys[key]}
                      placeholder={((key==="coingecko"&&setFlags.coingecko)||(key==="paypalSecret"&&setFlags.paypalSecret)) ? "•••••••• saved — leave blank to keep" : ph}
                      onChange={e => setKeys({ ...keys, [key]: e.target.value })} />
                  </div>
                ))}
                <button className="acct-btn accent" onClick={saveConfig}>Save keys</button>
              </div>
            )}

            {/* ── EMAIL & INTEGRATIONS ── */}
            {settingsView === "email" && (
              <div className="card">
                <div className="card-title">Email &amp; integrations</div>
                <div className="card-sub">Connect an email service for the landing-page subscribe form and transactional emails.</div>
                <label className="acct-label">Provider</label>
                <select className="field-input" value={mail.provider} onChange={e => setMail({ ...mail, provider:e.target.value })}>
                  <option value="none">None</option>
                  <option value="activecampaign">ActiveCampaign</option>
                  <option value="getresponse">GetResponse</option>
                </select>
                {[
                  ["API key","apiKey","provider API key"],
                  ["API URL (ActiveCampaign only)","apiUrl","https://youracct.api-us1.com"],
                  ["List / Campaign ID","listId","list or campaign id"],
                  ["From email (reserved — live with BL-5 transactional email)","fromEmail","hello@yourdomain.com"],
                ].map(([label,key,ph]) => (
                  <div key={key}>
                    <label className="acct-label">{label}</label>
                    <input className="field-input" type={key==="apiKey"?"password":"text"} value={mail[key]}
                      placeholder={(key==="apiKey"&&setFlags.apiKey) ? "•••••••• saved — leave blank to keep" : ph}
                      onChange={e => setMail({ ...mail, [key]: e.target.value })} />
                  </div>
                ))}
                <button className="acct-btn accent" onClick={saveConfig}>Save email settings</button>
              </div>
            )}

            {/* ── PLANS & PRICING ── */}
            {settingsView === "plans" && (
              <div className="card">
                <div className="card-title">Plans &amp; pricing</div>
                <div className="card-sub">Prices drive the revenue estimate + what users see; limits are enforced server-side by Firestore rules. Mo $ = monthly · Yr $ = annual (2 months free) · AI ¢/mo = live-AI cost ceiling in cents.</div>
                {["free","pro","premium"].map(t => (
                  <div key={t} className="plan-block">
                    <div className={"plan-name " + (t==="free"?"starter":t==="pro"?"pro":"prem")}>{t==="free"?"Starter":t}</div>
                    <div className="mini-grid">
                      {[["price","Mo $"],["priceYear","Yr $"],["aiMonthlyCents","AI ¢/mo"],["portfolios","Portfolios"],["coins","Coins"],["transactions","Tx/coin"]].map(([k,lbl]) => (
                        <div key={k} className="mini-field">
                          <label>{lbl}</label>
                          <input type="number" min="0" step={(k==="price"||k==="priceYear")?"0.01":"1"} value={(plans[t] && plans[t][k] != null) ? plans[t][k] : ""}
                            onChange={e => setPlans({ ...plans, [t]: { ...plans[t], [k]: e.target.value === "" ? 0 : Number(e.target.value) } })} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button className="acct-btn accent" onClick={saveConfig}>Save plans</button>
              </div>
            )}

            {/* ── AI (reserved — live AI ships at go-live) ── */}
            {settingsView === "ai" && (
              <div className="card">
                <div className="card-title">AI (reserved — live AI ships at go-live)</div>
                <div className="card-sub">The Anthropic API key powers the server-side <code>researchAsk</code> proxy (Claude only, validator-first — never called from the browser). Saving it now is safe: it stays in the locked config doc until the proxy ships.</div>
                <label className="acct-label">Anthropic API key{setFlags.anthropicKey ? " · saved ✓" : ""}</label>
                <input className="field-input" type="password" value={keys.anthropicKey}
                  placeholder={setFlags.anthropicKey ? "•••••••• (saved — type to replace)" : "sk-ant-…"}
                  onChange={e => setKeys({ ...keys, anthropicKey: e.target.value })} />
                <button className="acct-btn accent" onClick={saveConfig}>Save AI settings</button>
                <div className="mini-grid" style={{ gridTemplateColumns:"1fr 1fr", marginTop:14 }}>
                  <button disabled className="acct-btn ghost" style={{ marginTop:0, opacity:0.6 }} title="Available once the conviction engine ships (Wave B · B5)">Invalidate conviction cache</button>
                  <button disabled className="acct-btn ghost" style={{ marginTop:0, opacity:0.6 }} title="Available once the conviction engine ships (Wave B · B5)">Force-refresh a coin</button>
                </div>
              </div>
            )}

            {/* ── ANALYTICS & LEGAL ── */}
            {settingsView === "analytics" && (
              <div className="card">
                <div className="card-title">Analytics &amp; legal</div>
                <div className="card-sub">Public IDs injected on the landing + app. Leave blank to disable. Changes apply within ~1 min.</div>
                {[
                  ["Google Analytics 4 ID","ga4","G-XXXXXXXXXX",analytics,setAnalytics],
                  ["Plausible domain","plausible","yourdomain.com",analytics,setAnalytics],
                  ["Termly website UUID","termlyUuid","xxxxxxxx-xxxx-xxxx-…",legal,setLegal],
                  ["Termly Privacy doc ID","termlyPrivacyId","privacy document id",legal,setLegal],
                  ["Termly Terms doc ID","termlyTermsId","terms document id",legal,setLegal],
                ].map(([label,key,ph,obj,setter]) => (
                  <div key={key}>
                    <label className="acct-label">{label}</label>
                    <input className="field-input" type="text" value={obj[key]} placeholder={ph} onChange={e => setter({ ...obj, [key]: e.target.value })} />
                  </div>
                ))}
                <div className="ctrl-line">
                  <div>
                    <div className="cl-label">Cookie consent banner</div>
                    <div className="cl-hint">Needs the Termly UUID</div>
                  </div>
                  <Switch checked={legal.cookieBanner} onChange={() => setLegal({ ...legal, cookieBanner: !legal.cookieBanner })} />
                </div>
                <button className="acct-btn accent" onClick={saveConfig}>Save analytics &amp; legal</button>
              </div>
            )}

            {/* ── ADMIN ACCESS (ADMIN-D3, owner-only) — folded in from the old top-level
                 tab. The grant flow (search → type email twice → warning → confirm) and
                 every handler are unchanged; only the styling moved to the paper card.
                 The server still enforces owner + fresh auth_time on setManagerRole, and
                 Settings itself is owner-gated, so this stays owner-only. ── */}
            {settingsView === "access" && (<>
              <div className="card">
                <div className="card-sub" style={{ marginBottom:14 }}>
                  Grant or remove <b>manager</b> access. Managers can manage accounts (tier, suspend, sign-out, custom limits, trash) but never see Settings or permanent deletion. <b>Owners</b> can only be created by running <code>functions/scripts/set-admin.js --role=owner</code> with a service-account key — never from here, which is what makes owner accounts impossible to remove from inside the panel.
                </div>
                <label className="acct-label">Find the account</label>
                <div style={{ display:"flex", gap:8 }}>
                  <input className="field-input" value={grantEmail} onChange={e => { setGrantEmail(e.target.value); setGrantWarn(false); }}
                    onKeyDown={e => e.key === "Enter" && grantLookup()} placeholder="email@example.com" style={{ flex:1 }} />
                  <button className="acct-btn accent" style={{ width:"auto", marginTop:0, padding:"0 18px" }} disabled={busy} onClick={grantLookup}>Search</button>
                </div>
                <div className="cl-hint" style={{ marginTop:6 }}>Search by the exact email so you can confirm you have the right person before granting anything.</div>

                {grantFound && (
                  <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid var(--line-2)" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                      <div style={{ fontSize:15, fontWeight:600 }}>{grantFound.name || grantFound.email}</div>
                      {grantFound.role === "owner" && <span style={{ fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:20, color:"#3f7df0", background:"rgba(63,125,240,.15)" }}>OWNER</span>}
                      {grantFound.role === "manager" && <span style={{ fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:20, color:"#7d4bbf", background:"rgba(125,75,191,.15)" }}>MANAGER</span>}
                      {grantFound.isAdmin && !grantFound.role && <span style={{ fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:20, color:"var(--amber)", background:"color-mix(in srgb, var(--amber) 15%, transparent)" }}>NO ROLE</span>}
                    </div>
                    <div style={{ fontSize:12, color:"var(--ink-faint)", marginBottom:14 }}>{grantFound.email}</div>

                    {grantFound.role === "owner" ? (
                      <div style={{ fontSize:12, color:"var(--ink-soft)", background:"var(--paper-3)", padding:12, borderRadius:12 }}>
                        🔒 Owner accounts are protected — they can't be changed from the panel, by anyone. Use <code>set-admin.js</code>.
                      </div>
                    ) : grantFound.role === "manager" ? (
                      <button className="acct-btn" style={{ background:"var(--sr-s)", color:"var(--sr)", border:"1px solid color-mix(in srgb, var(--sr) 35%, transparent)" }} disabled={busy} onClick={() => setManager(false)}>Remove manager access</button>
                    ) : !grantWarn ? (
                      <>
                        <label className="acct-label">Re-type {grantFound.email} to confirm</label>
                        <input className="field-input" value={grantEmail2} onChange={e => setGrantEmail2(e.target.value)} placeholder={grantFound.email} />
                        <button className="acct-btn accent" disabled={busy || grantEmail2.trim().toLowerCase() !== (grantFound.email || "").toLowerCase()} onClick={() => setGrantWarn(true)}>Continue</button>
                      </>
                    ) : (
                      <div style={{ border:"1px solid var(--amber)", background:"color-mix(in srgb, var(--amber) 8%, transparent)", borderRadius:12, padding:14 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:"var(--amber)", marginBottom:6 }}>⚠ Grant manager access?</div>
                        <div style={{ fontSize:12, color:"var(--ink-soft)", lineHeight:1.55, marginBottom:12 }}>
                          <b>{grantFound.email}</b> will be able to see every account and change tiers, suspend, force sign-out, set custom limits and move accounts to the trash. They will <b>not</b> get Settings, admin access, or permanent deletion. You can remove this at any time.
                        </div>
                        <div style={{ display:"flex", gap:8 }}>
                          <button className="acct-btn ghost" style={{ flex:1, marginTop:0 }} disabled={busy} onClick={() => setGrantWarn(false)}>Cancel</button>
                          <button className="acct-btn accent" style={{ flex:1, marginTop:0 }} disabled={busy} onClick={() => setManager(true)}>Confirm — grant manager</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {grantMsg && <div className="priv-msg" style={{ color: grantMsg.includes("✓") ? "var(--sg)" : "var(--sr)" }}>{grantMsg}</div>}
              </div>

              {typeof s.activeOwners === "number" && s.activeOwners < 2 && (
                <div style={{ border:"1px solid var(--sr)", background:"var(--sr-s)", borderRadius:12, padding:12, fontSize:12, color:"var(--sr)", lineHeight:1.55 }}>
                  ⚠ Only <b>{s.activeOwners}</b> active owner account. Owners can't be created from the panel, so if this one becomes inaccessible there is no in-app way back. Promote a second owner with <code>set-admin.js --role=owner</code> now.
                </div>
              )}
            </>)}

            {savedMsg && <div className="priv-msg" style={{ textAlign:"center", color: savedMsg.includes("✓") ? "var(--sg)" : (savedMsg.includes("failed") || savedMsg.includes("Cancel")) ? "var(--sr)" : "var(--ink-soft)" }}>{savedMsg}</div>}
          </div>
        </div>
        );
      })()}

      {/* ═══ AUDIT LOG ═══ */}
      {tab === "audit" && (<>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:10 }}>
          <div style={{ fontSize:11, color:c.dm, lineHeight:1.5 }}>Recent admin actions — tier changes, suspensions, deletes, admin grants, settings saves.</div>
          <button onClick={loadAudit} disabled={auditLoading} style={{ padding:"7px 14px", borderRadius:10, border:`1px solid ${c.bd}`, background:c.w, fontSize:13, fontWeight:600, cursor:"pointer", opacity:auditLoading?0.6:1, flexShrink:0 }}>{auditLoading ? "…" : "Refresh"}</button>
        </div>
        {auditMsg && <div style={{ fontSize:12, color:c.rd, marginBottom:10 }}>{auditMsg}</div>}
        {auditLoading && !audit ? <div style={{ textAlign:"center", color:c.dm, fontSize:13, padding:"24px 0" }}>Loading…</div> :
         audit && (audit.length === 0
          ? <div style={{ background:c.w, border:`1px solid ${c.bd}`, borderRadius:14, padding:"20px", textAlign:"center", color:c.dm, fontSize:13 }}>No admin actions logged yet.</div>
          : <div style={{ background:c.w, border:`1px solid ${c.bd}`, borderRadius:14, overflow:"hidden" }}>
              {audit.map((e, i) => (
                <div key={e.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"11px 14px", borderTop: i ? `1px solid ${c.bd}` : "none" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{ACTION_LABELS[e.action] || e.action}</div>
                    <div style={{ fontSize:11, color:c.dm, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      by {e.actorEmail || "—"}{(e.targetEmail || e.targetUid) ? " → " + (e.targetEmail || e.targetUid) : ""}{e.details ? " · " + e.details : ""}
                    </div>
                  </div>
                  <div style={{ fontSize:10, color:c.dm, whiteSpace:"nowrap", flexShrink:0 }}>{e.atMs ? new Date(e.atMs).toLocaleString() : ""}</div>
                </div>
              ))}
            </div>)}
      </>)}

      {/* ADMIN-SEC step-up prompt. Raised only when the SERVER refuses a sensitive call
          with reauth-required — never on a client timer alone. That ordering is what
          makes tampering with the timer pointless and a clock drift non-fatal. */}
      {unlockPrompt && (
        <div style={{ position:"fixed", inset:0, background:"#0006", display:"flex", alignItems:"center", justifyContent:"center", padding:20, zIndex:1000 }}>
          <form onSubmit={e => { e.preventDefault(); submitUnlock(); }}
            style={{ width:"100%", maxWidth:360, background:c.w, borderRadius:16, padding:22, boxShadow:"0 10px 40px #00000026" }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Confirm your password</div>
            <div style={{ fontSize:11, color:c.dm, lineHeight:1.55, marginBottom:14 }}>
              Settings, API keys, plans and admin access need a recent password confirmation.
              This keeps them unlocked for about 10 minutes.
            </div>
            <input type="password" value={unlockPass} onChange={e => setUnlockPass(e.target.value)} autoFocus
              placeholder="Owner password" autoComplete="current-password"
              style={{ width:"100%", padding:"11px 12px", borderRadius:10, border:`1px solid ${unlockErr ? c.rd : c.bd}`, fontSize:14, boxSizing:"border-box" }} />
            {unlockErr && <div style={{ fontSize:11, color:c.rd, marginTop:6 }}>{unlockErr}</div>}
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button type="button" onClick={cancelUnlock}
                style={{ flex:1, padding:"11px", borderRadius:10, border:`1px solid ${c.bd}`, background:c.w, fontSize:13, cursor:"pointer" }}>Cancel</button>
              <button type="submit" disabled={busy || !unlockPass}
                style={{ flex:1, padding:"11px", borderRadius:10, border:"none", background:c.tx, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", opacity: unlockPass ? 1 : 0.4 }}>
                {busy ? "Checking…" : "Unlock"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ textAlign:"center", padding:"18px 0", fontSize:10, color:c.dm }}>
        Crypto Idea Admin · v4.3.0
        {roleLoaded && role && <> · signed in as <b>{role}</b>{isOwner && unlocked ? " · unlocked" : ""}</>}
      </div>
    </div>
  );
}
