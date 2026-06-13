import { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.config.js";

const TIERS = {
  free:    { label:"Free",    color:"#FF9500", limits:{ portfolios:1, coins:10, transactions:50 }, storage:"5 MB", price:"$0" },
  pro:     { label:"Pro",     color:"#34C759", limits:{ portfolios:10, coins:200, transactions:2000 }, storage:"500 MB", price:"$9.99/mo" },
  premium: { label:"Premium", color:"#AF52DE", limits:{ portfolios:50, coins:500, transactions:5000 }, storage:"15 GB", price:"$49.99/mo" },
};

// All admin data is REAL and combined (no fake/personal data on the Overview).
const EMPTY_STATS = { totalUsers: 0, freeUsers: 0, proUsers: 0, premiumUsers: 0, totalPortfolios: 0, totalCoins: 0, estimatedRevenue: 0 };

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);   // real combined usage from getStats (admin-only)
  const [statsErr, setStatsErr] = useState("");
  const [tab, setTab] = useState("overview");

  // Settings forms (saved via the admin-only saveConfig Cloud Function).
  const [keys, setKeys] = useState({ coingecko: "", paypalClientId: "", paypalSecret: "", paypalWebhookId: "" });
  const [mail, setMail] = useState({ provider: "none", apiKey: "", apiUrl: "", fromEmail: "", listId: "" });
  const [savedMsg, setSavedMsg] = useState("");
  // Which secrets are already saved (so the form shows "saved" without exposing them).
  const [setFlags, setSetFlags] = useState({ coingecko: false, paypalSecret: false, apiKey: false });
  const [cfgAt, setCfgAt] = useState(null);
  // Public app controls (maintenance mode, signups on/off).
  const [controls, setControls] = useState({ maintenance: false, signupsEnabled: true });
  // Analytics + legal IDs (public, non-secret).
  const [analytics, setAnalytics] = useState({ ga4: "", plausible: "" });
  const [legal, setLegal] = useState({ termlyUuid: "", termlyPrivacyId: "", termlyTermsId: "", cookieBanner: false });

  // Pre-fill the Settings form from the saved config (secrets are never returned —
  // only whether they're set), so you can SEE what's configured and persisted.
  const loadConfig = async () => {
    try {
      const r = await httpsCallable(functions, "getAdminConfig")();
      const d = r.data || {};
      setKeys({ coingecko: "", paypalClientId: d.paypal?.clientId || "", paypalSecret: "", paypalWebhookId: d.paypal?.webhookId || "" });
      setMail({ provider: d.email?.provider || "none", apiKey: "", apiUrl: d.email?.apiUrl || "", fromEmail: d.email?.fromEmail || "", listId: d.email?.listId || "" });
      setSetFlags({ coingecko: !!d.coingeckoSet, paypalSecret: !!(d.paypal && d.paypal.secretSet), apiKey: !!(d.email && d.email.apiKeySet) });
      setControls({ maintenance: !!(d.flags && d.flags.maintenance), signupsEnabled: !(d.flags && d.flags.signupsEnabled === false) });
      setAnalytics({ ga4: d.analytics?.ga4 || "", plausible: d.analytics?.plausible || "" });
      setLegal({ termlyUuid: d.legal?.termlyUuid || "", termlyPrivacyId: d.legal?.termlyPrivacyId || "", termlyTermsId: d.legal?.termlyTermsId || "", cookieBanner: !!(d.legal && d.legal.cookieBanner) });
      setCfgAt(d.updatedAt || null);
    } catch (e) { /* function not deployed yet (dev): leave the form empty */ }
  };
  const saveConfig = async () => {
    setSavedMsg("Saving…");
    try {
      await httpsCallable(functions, "saveConfig")({ keys, email: mail, flags: controls, analytics, legal });
      await loadConfig();             // re-read so the saved state is visible immediately
      setSavedMsg("Saved ✓");
    } catch (e) {
      setSavedMsg("Save failed: " + (e && e.message ? e.message : "error") + " (needs the deployed saveConfig function)");
    }
    setTimeout(() => setSavedMsg(""), 4000);
  };
  // Toggles save instantly (pass the next value so we don't save stale state).
  const saveControls = async (next) => {
    setControls(next);
    setSavedMsg("Saving…");
    try { await httpsCallable(functions, "saveConfig")({ keys, email: mail, flags: next }); setSavedMsg("Saved ✓"); }
    catch (e) { setSavedMsg("Save failed: " + ((e && e.message) || "error")); await loadConfig(); }
    setTimeout(() => setSavedMsg(""), 3000);
  };

  // Users tab — on-demand lookup of ONE user for support / moderation.
  const [lookupEmail, setLookupEmail] = useState("");
  const [found, setFound] = useState(null);
  const [lookupMsg, setLookupMsg] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  // Users tab — full list, searched + paginated client-side; rows open the detail panel.
  const [userList, setUserList] = useState(null);
  const [listMsg, setListMsg] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const callFn = (name, data) => httpsCallable(functions, name)(data);

  // Load combined usage + the saved config once on mount.
  useEffect(() => {
    callFn("getStats")
      .then(r => setStats(r.data))
      .catch(e => setStatsErr((e && e.message) || "Could not load stats"));
    loadConfig();
  }, []);
  const s = stats || EMPTY_STATS;

  const loadUserList = async () => {
    setListLoading(true); setListMsg("");
    try { const r = await callFn("listUsers", {}); setUserList((r.data && r.data.users) || []); }
    catch (e) { setListMsg((e && e.message) || "Could not load users"); setUserList([]); }
    setListLoading(false);
  };
  // Load the user list the first time the Users tab is opened.
  useEffect(() => { if (tab === "users" && userList === null && !listLoading) loadUserList(); }, [tab]);

  const lookup = async () => {
    if (!lookupEmail.trim()) return;
    setBusy(true); setLookupMsg(""); setActionMsg(""); setConfirmDelete(false); setFound(null);
    try { const r = await callFn("lookupUser", { email: lookupEmail.trim() }); setFound(r.data); }
    catch (e) { setLookupMsg((e && e.message) || "Lookup failed"); }
    setBusy(false);
  };
  // Open a row from the list → full detail (incl. coin count) via lookupUser.
  const openUser = async (email) => {
    setBusy(true); setActionMsg(""); setConfirmDelete(false); setFound(null); setLookupMsg("");
    try { const r = await callFn("lookupUser", { email }); setFound(r.data); }
    catch (e) { setLookupMsg((e && e.message) || "Lookup failed"); }
    setBusy(false);
  };
  const changeTier = async (tier) => {
    setBusy(true); setActionMsg("");
    try { await callFn("setUserTier", { uid: found.uid, tier }); setFound({ ...found, tier });
      setUserList(l => l && l.map(x => x.uid === found.uid ? { ...x, tier } : x)); setActionMsg("Tier updated ✓"); }
    catch (e) { setActionMsg((e && e.message) || "Failed"); }
    setBusy(false);
  };
  const toggleSuspend = async () => {
    setBusy(true); setActionMsg("");
    try { const d = !found.disabled; await callFn("suspendUser", { uid: found.uid, disabled: d }); setFound({ ...found, disabled: d });
      setUserList(l => l && l.map(x => x.uid === found.uid ? { ...x, disabled: d } : x)); setActionMsg(d ? "Suspended ✓" : "Un-suspended ✓"); }
    catch (e) { setActionMsg((e && e.message) || "Failed"); }
    setBusy(false);
  };
  const doDelete = async () => {
    setBusy(true); setActionMsg("");
    try { await callFn("deleteUser", { uid: found.uid });
      setUserList(l => l && l.filter(x => x.uid !== found.uid)); setActionMsg("Account deleted ✓"); setFound(null); setConfirmDelete(false); setLookupEmail(""); }
    catch (e) { setActionMsg((e && e.message) || "Failed"); }
    setBusy(false);
  };

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

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:14, background:c.w, borderRadius:12, padding:4, border:`1px solid ${c.bd}` }}>
        {["overview","users","settings"].map(tb => (
          <button key={tb} onClick={() => { setTab(tb); }}
            style={{ flex:1, padding:10, borderRadius:10, border:"none", fontSize:13, fontWeight:600, cursor:"pointer", background:tab===tb?c.tx:"transparent", color:tab===tb?"#fff":c.dm }}>
            {tb.charAt(0).toUpperCase()+tb.slice(1)}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW (real, combined, no personal data) ═══ */}
      {tab === "overview" && (<>
        {/* Stats */}
        <div style={{ display:"flex", gap:6, marginBottom:10 }}>
          {[[s.totalUsers,"Total",c.tx],[s.freeUsers,"Free",c.or],[s.proUsers,"Pro",c.gr],[s.premiumUsers,"Premium",c.pr]].map(([val,label,color]) => (
            <div key={label} style={{ background:c.w, borderRadius:14, padding:"14px 10px", border:`1px solid ${c.bd}`, textAlign:"center", flex:1 }}>
              <div style={{ fontSize:24, fontWeight:700, letterSpacing:"-1px", color }}>{val}</div>
              <div style={{ fontSize:8, color:c.dm, marginTop:2, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* On desktop these three sit side-by-side; on mobile auto-fit collapses to one column. */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:10, alignItems:"start", marginBottom:10 }}>

        {/* Revenue */}
        <div style={{ background:c.w, borderRadius:14, padding:14, border:`1px solid ${c.bd}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:13, fontWeight:600 }}>Est. Monthly Revenue</span>
            <span style={{ fontSize:18, fontWeight:800, color:c.gr }}>${s.estimatedRevenue.toFixed(0)}</span>
          </div>
          <div style={{ fontSize:10, color:c.dm }}>
            {s.proUsers} Pro × $9.99 = ${(s.proUsers*9.99).toFixed(0)} · {s.premiumUsers} Premium × $49.99 = ${(s.premiumUsers*49.99).toFixed(0)}
          </div>
        </div>

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
            <span style={{ color:c.or }}>Free ({s.freeUsers})</span>
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
              return (
                <div key={tier} style={{ background:c.w, padding:"12px 10px", textAlign:"center" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:t.color, marginBottom:8 }}>{t.label.toUpperCase()}</div>
                  <div style={{ fontSize:9, color:c.dm, marginBottom:3 }}>Portfolios</div>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>{t.limits.portfolios}</div>
                  <div style={{ fontSize:9, color:c.dm, marginBottom:3 }}>Coins</div>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>{t.limits.coins}</div>
                  <div style={{ fontSize:9, color:c.dm, marginBottom:3 }}>Tx/coin</div>
                  <div style={{ fontSize:14, fontWeight:700, marginBottom:6 }}>{t.limits.transactions.toLocaleString()}</div>
                  <div style={{ fontSize:9, color:c.dm, marginBottom:3 }}>Storage</div>
                  <div style={{ fontSize:12, fontWeight:700 }}>{t.storage}</div>
                  <div style={{ fontSize:9, color:c.dm, marginTop:6, fontWeight:600 }}>{t.price}</div>
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

            {/* Moderation */}
            <div style={{ display:"flex", gap:6 }}>
              <button disabled={busy} onClick={toggleSuspend}
                style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${c.or}`, background:c.or+"10", color:c.or, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                {found.disabled ? "Un-suspend" : "Suspend"}
              </button>
              {confirmDelete ? (
                <button disabled={busy} onClick={doDelete}
                  style={{ flex:1, padding:"10px", borderRadius:10, border:"none", background:c.rd, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  Confirm delete?
                </button>
              ) : (
                <button disabled={busy} onClick={() => setConfirmDelete(true)}
                  style={{ flex:1, padding:"10px", borderRadius:10, border:`1px solid ${c.rd}`, background:c.rd+"10", color:c.rd, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                  Delete account
                </button>
              )}
            </div>
            <div style={{ fontSize:9, color:c.dm, marginTop:8 }}>Delete permanently removes the account + all their data (GDPR/CCPA erasure). Cannot be undone.</div>
            {actionMsg && <div style={{ textAlign:"center", marginTop:10, fontSize:12, color:c.gr, fontWeight:600 }}>{actionMsg}</div>}
          </div>
        )}

        {/* Full list — searched + paginated (50/page) entirely client-side over the loaded list. */}
        {listMsg && <div style={{ fontSize:12, color:c.rd, marginBottom:10 }}>{listMsg}</div>}
        {(() => {
          if (listLoading && !userList) return <div style={{ textAlign:"center", color:c.dm, fontSize:13, padding:"24px 0" }}>Loading users…</div>;
          if (!userList) return null;
          const needle = q.trim().toLowerCase();
          const filtered = needle ? userList.filter(u => (u.email||"").toLowerCase().includes(needle) || (u.name||"").toLowerCase().includes(needle)) : userList;
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

      {/* ═══ SETTINGS ═══ */}
      {tab === "settings" && (<>
        <div style={{ background:"#E7F1EC", border:"1px solid #b9d8c9", borderRadius:12, padding:"12px 14px", marginBottom:14, fontSize:12, color:"#084d39", lineHeight:1.5 }}>
          Saved securely via the admin-only <b>saveConfig</b> function to a locked Firestore <code>config/app</code> doc — clients can never read it; the price proxy + PayPal functions read it server-side. Requires the functions deployed (Blaze plan).
        </div>

        {/* App controls (public flags — take effect within ~1 min via /api/config) */}
        <div style={{ background:c.w, borderRadius:14, padding:16, border:`1px solid ${c.bd}`, marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>App Controls</div>
          <div style={{ fontSize:11, color:c.dm, marginBottom:14 }}>Live switches the app reads on load. Changes apply within about a minute.</div>
          {[
            ["maintenance", "Maintenance mode", "Show a maintenance notice and pause the app for everyone."],
            ["signupsEnabled", "Allow new signups", "When off, the Register tab is disabled (stops new account creation)."],
          ].map(([key, label, desc]) => {
            const on = key === "signupsEnabled" ? controls.signupsEnabled !== false : !!controls[key];
            return (
              <div key={key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"8px 0", borderTop:`1px solid ${c.bd}` }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{label}</div>
                  <div style={{ fontSize:11, color:c.dm, marginTop:2 }}>{desc}</div>
                </div>
                <button onClick={() => saveControls({ ...controls, [key]: !on })}
                  style={{ width:46, height:26, borderRadius:20, border:"none", cursor:"pointer", flexShrink:0, position:"relative",
                    background: on ? (key==="maintenance"?c.or:c.gr) : "#D8D8DE", transition:"background .15s" }}>
                  <span style={{ position:"absolute", top:3, left: on ? 23 : 3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left .15s" }} />
                </button>
              </div>
            );
          })}
        </div>

        {/* API Keys */}
        <div style={{ background:c.w, borderRadius:14, padding:16, border:`1px solid ${c.bd}`, marginBottom:12 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>API Keys</div>
          <div style={{ fontSize:11, color:c.dm, marginBottom:14 }}>For the price / DCA calculator (CoinGecko) and payments (PayPal). Stored server-side — never sent to users.</div>
          {[
            ["CoinGecko Demo key","coingecko","cg-demo-..."],
            ["PayPal Client ID","paypalClientId","A..."],
            ["PayPal Secret","paypalSecret","E..."],
            ["PayPal Webhook ID","paypalWebhookId","WH-..."],
          ].map(([label,key,ph]) => (
            <div key={key} style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, color:c.dm, display:"block", marginBottom:4 }}>{label}</label>
              <input type={(key.toLowerCase().includes("ecret")||key==="coingecko")?"password":"text"} value={keys[key]}
                placeholder={((key==="coingecko"&&setFlags.coingecko)||(key==="paypalSecret"&&setFlags.paypalSecret)) ? "•••••••• saved — leave blank to keep" : ph}
                onChange={e => setKeys({ ...keys, [key]: e.target.value })}
                style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${c.bd}`, fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>
          ))}
          <button onClick={saveConfig}
            style={{ marginTop:6, padding:"9px 16px", borderRadius:8, border:"none", background:c.tx, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>Save keys</button>
        </div>

        {/* Email / Integrations */}
        <div style={{ background:c.w, borderRadius:14, padding:16, border:`1px solid ${c.bd}` }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Email &amp; Integrations</div>
          <div style={{ fontSize:11, color:c.dm, marginBottom:14 }}>Connect an email service for the landing-page subscribe form and transactional emails.</div>
          <label style={{ fontSize:11, color:c.dm, display:"block", marginBottom:4 }}>Provider</label>
          <select value={mail.provider} onChange={e => setMail({ ...mail, provider:e.target.value })}
            style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${c.bd}`, fontSize:13, marginBottom:10, boxSizing:"border-box" }}>
            <option value="none">None</option>
            <option value="activecampaign">ActiveCampaign</option>
            <option value="getresponse">GetResponse</option>
            <option value="mailchimp">Mailchimp</option>
            <option value="sendgrid">SendGrid</option>
            <option value="resend">Resend</option>
            <option value="brevo">Brevo (Sendinblue)</option>
          </select>
          {[
            ["API key","apiKey","provider API key"],
            ["API URL (ActiveCampaign only)","apiUrl","https://youracct.api-us1.com"],
            ["List / Campaign ID","listId","list or campaign id"],
            ["From email","fromEmail","hello@yourdomain.com"],
          ].map(([label,key,ph]) => (
            <div key={key} style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, color:c.dm, display:"block", marginBottom:4 }}>{label}</label>
              <input type={key==="apiKey"?"password":"text"} value={mail[key]}
                placeholder={(key==="apiKey"&&setFlags.apiKey) ? "•••••••• saved — leave blank to keep" : ph}
                onChange={e => setMail({ ...mail, [key]: e.target.value })}
                style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${c.bd}`, fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>
          ))}
          <button onClick={saveConfig}
            style={{ marginTop:6, padding:"9px 16px", borderRadius:8, border:"none", background:c.tx, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>Save email settings</button>
        </div>

        {/* Analytics & Legal (public IDs injected on the landing + app) */}
        <div style={{ background:c.w, borderRadius:14, padding:16, border:`1px solid ${c.bd}`, marginTop:12 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>Analytics &amp; Legal</div>
          <div style={{ fontSize:11, color:c.dm, marginBottom:14 }}>Public IDs injected on the landing + app. Leave blank to disable. (Changes apply within ~1 min.)</div>
          {[
            ["Google Analytics 4 ID","ga4","G-XXXXXXXXXX",analytics,setAnalytics],
            ["Plausible domain","plausible","yourdomain.com",analytics,setAnalytics],
            ["Termly website UUID","termlyUuid","xxxxxxxx-xxxx-xxxx-…",legal,setLegal],
            ["Termly Privacy doc ID","termlyPrivacyId","privacy document id",legal,setLegal],
            ["Termly Terms doc ID","termlyTermsId","terms document id",legal,setLegal],
          ].map(([label,key,ph,obj,setter]) => (
            <div key={key} style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, color:c.dm, display:"block", marginBottom:4 }}>{label}</label>
              <input type="text" value={obj[key]} placeholder={ph} onChange={e => setter({ ...obj, [key]: e.target.value })}
                style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${c.bd}`, fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>
          ))}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"6px 0 10px" }}>
            <div style={{ fontSize:13, fontWeight:600 }}>Cookie consent banner <span style={{ fontSize:11, color:c.dm, fontWeight:400 }}>· needs the Termly UUID</span></div>
            <button onClick={() => setLegal({ ...legal, cookieBanner: !legal.cookieBanner })}
              style={{ width:46, height:26, borderRadius:20, border:"none", cursor:"pointer", flexShrink:0, position:"relative", background: legal.cookieBanner ? c.gr : "#D8D8DE" }}>
              <span style={{ position:"absolute", top:3, left: legal.cookieBanner ? 23 : 3, width:20, height:20, borderRadius:"50%", background:"#fff" }} />
            </button>
          </div>
          <button onClick={saveConfig}
            style={{ padding:"9px 16px", borderRadius:8, border:"none", background:c.tx, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>Save analytics &amp; legal</button>
        </div>

        {savedMsg && <div style={{ textAlign:"center", marginTop:12, fontSize:12, color:c.gr, fontWeight:600 }}>{savedMsg}</div>}
      </>)}

      <div style={{ textAlign:"center", padding:"18px 0", fontSize:10, color:c.dm }}>
        Crypto Idea Admin · v4.3.0
      </div>
    </div>
  );
}
