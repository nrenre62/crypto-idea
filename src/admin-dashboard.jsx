import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.config.js";

const TIERS = {
  free:    { label:"Free",    color:"#FF9500", limits:{ portfolios:1, coins:10, transactions:50 }, storage:"5 MB", price:"$0" },
  pro:     { label:"Pro",     color:"#34C759", limits:{ portfolios:10, coins:200, transactions:2000 }, storage:"500 MB", price:"$9.99/mo" },
  premium: { label:"Premium", color:"#AF52DE", limits:{ portfolios:50, coins:500, transactions:5000 }, storage:"15 GB", price:"$49.99/mo" },
};

const MOCK_USERS = [
  { id:"u1",name:"Alex Morgan",email:"alex@gmail.com",tier:"pro",joined:"2025-12-01",ports:3,coins:45,txs:120 },
  { id:"u2",name:"Sarah Chen",email:"sarah@outlook.com",tier:"premium",joined:"2025-11-15",ports:12,coins:187,txs:2940,premiumLimits:{portfolios:30,coins:400,transactions:8000} },
  { id:"u3",name:"James Wilson",email:"james@yahoo.com",tier:"free",joined:"2026-01-10",ports:1,coins:8,txs:42 },
  { id:"u4",name:"Maria Lopez",email:"maria@gmail.com",tier:"free",joined:"2026-02-03",ports:1,coins:10,txs:28 },
  { id:"u5",name:"David Kim",email:"david@proton.me",tier:"pro",joined:"2025-10-20",ports:8,coins:100,txs:520 },
  { id:"u6",name:"Emma Brown",email:"emma@icloud.com",tier:"free",joined:"2026-03-01",ports:1,coins:5,txs:10 },
  { id:"u7",name:"Lucas Silva",email:"lucas@gmail.com",tier:"free",joined:"2026-03-15",ports:1,coins:9,txs:65 },
  { id:"u8",name:"Olivia Park",email:"olivia@me.com",tier:"premium",joined:"2025-09-05",ports:22,coins:340,txs:4100,premiumLimits:{portfolios:50,coins:500,transactions:5000} },
  { id:"u9",name:"Noah Taylor",email:"noah@gmail.com",tier:"free",joined:"2026-04-01",ports:1,coins:2,txs:3 },
  { id:"u10",name:"Ava Johnson",email:"ava@outlook.com",tier:"pro",joined:"2025-08-12",ports:6,coins:72,txs:280 },
];

// Estimate storage in MB: (coins × (142 + transactions × 109)) bytes
const estStorage = (u) => {
  const txPerCoin = u.coins > 0 ? u.txs / u.coins : 0;
  const bytes = u.coins * (142 + txPerCoin * 109);
  return bytes / (1024 * 1024);
};

export default function AdminDashboard() {
  const [users, setUsers] = useState(MOCK_USERS);
  const [sq, setSq] = useState("");
  const [tab, setTab] = useState("overview");
  const [selUser, setSelUser] = useState(null);
  const [editLimits, setEditLimits] = useState(null);
  const [confirm, setConfirm] = useState(null);
  // Settings forms (scaffold — wire to the admin-only saveConfig Cloud Function once Firebase is live)
  const [keys, setKeys] = useState({ coingecko: "", paypalClientId: "", paypalSecret: "", paypalWebhookId: "" });
  const [mail, setMail] = useState({ provider: "none", apiKey: "", apiUrl: "", fromEmail: "", listId: "" });
  const [savedMsg, setSavedMsg] = useState("");
  const saveConfig = async () => {
    setSavedMsg("Saving…");
    try {
      await httpsCallable(functions, "saveConfig")({ keys, email: mail });
      setSavedMsg("Saved ✓");
    } catch (e) {
      setSavedMsg("Save failed: " + (e && e.message ? e.message : "error") + " (needs the deployed saveConfig function)");
    }
    setTimeout(() => setSavedMsg(""), 4000);
  };

  const free = users.filter(u => u.tier === "free");
  const pro = users.filter(u => u.tier === "pro");
  const premium = users.filter(u => u.tier === "premium");
  const rev = pro.length * 9.99 + premium.length * 49.99;

  const filtered = sq ? users.filter(u =>
    u.name.toLowerCase().includes(sq.toLowerCase()) || u.email.toLowerCase().includes(sq.toLowerCase())
  ) : users;

  const changeTier = (uid, newTier) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== uid) return u;
      const updated = { ...u, tier: newTier };
      if (newTier === "premium" && !u.premiumLimits) {
        updated.premiumLimits = { portfolios: 50, coins: 500, transactions: 5000 };
      }
      return updated;
    }));
    setConfirm(null);
    setSelUser(prev => prev ? { ...prev, tier: newTier, premiumLimits: newTier === "premium" ? (prev.premiumLimits || { portfolios: 50, coins: 500, transactions: 5000 }) : prev.premiumLimits } : null);
  };

  const saveLimits = (uid, limits) => {
    setUsers(prev => prev.map(u => u.id === uid ? { ...u, premiumLimits: limits } : u));
    setSelUser(prev => prev ? { ...prev, premiumLimits: limits } : null);
    setEditLimits(null);
  };

  const c = { bg:"#F5F5F5", w:"#fff", tx:"#1A1A1A", dm:"#999", bd:"#E8E8ED", gr:"#34C759", or:"#FF9500", bl:"#007AFF", rd:"#FF3B30", pr:"#AF52DE" };

  const Bdg = ({ tier }) => {
    const t = TIERS[tier] || TIERS.free;
    return <span style={{ fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:20, background:t.color+"18", color:t.color }}>{t.label.toUpperCase()}</span>;
  };

  const StorageBar = ({ used, max, unit }) => {
    const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
    return (
      <div style={{ marginTop: 6 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:3 }}>
          <span style={{ color:c.dm }}>Storage used</span>
          <span style={{ fontWeight:600, color: pct > 85 ? c.rd : c.tx }}>{used.toFixed(1)} {unit} / {max} {unit} ({pct.toFixed(0)}%)</span>
        </div>
        <div style={{ height:5, background:"#F0F0F0", borderRadius:3, overflow:"hidden" }}>
          <div style={{ width:`${pct}%`, height:"100%", background: pct > 85 ? c.rd : pct > 60 ? c.or : c.gr, borderRadius:3 }} />
        </div>
      </div>
    );
  };

  const LimitRow = ({ label, used, max, color }) => {
    const pct = max > 0 ? Math.round((used / max) * 100) : 0;
    return (
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${c.bd}20` }}>
        <span style={{ fontSize:11, color:c.dm }}>{label}</span>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, fontWeight:700 }}>{used.toLocaleString()} / {max.toLocaleString()}</span>
          <span style={{ fontSize:9, fontWeight:600, padding:"2px 6px", borderRadius:4, background: pct >= 90 ? c.rd+"15" : pct >= 70 ? c.or+"15" : c.gr+"15", color: pct >= 90 ? c.rd : pct >= 70 ? c.or : c.gr }}>{pct}%</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ fontFamily:"'SF Pro Display',-apple-system,sans-serif", background:c.bg, minHeight:"100vh", padding:16, maxWidth:600, margin:"0 auto" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:200, letterSpacing:"-0.5px" }}>Crypto <span style={{ fontWeight:700 }}>Idea</span></div>
          <div style={{ fontSize:11, color:c.dm, marginTop:2 }}>Admin Dashboard</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <div style={{ width:6, height:6, borderRadius:3, background:c.gr }} />
          <span style={{ fontSize:10, color:c.dm }}>Mock Data</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:4, marginBottom:14, background:c.w, borderRadius:12, padding:4, border:`1px solid ${c.bd}` }}>
        {["overview","users","settings"].map(tb => (
          <button key={tb} onClick={() => { setTab(tb); setSelUser(null); setEditLimits(null); }}
            style={{ flex:1, padding:10, borderRadius:10, border:"none", fontSize:13, fontWeight:600, cursor:"pointer", background:tab===tb?c.tx:"transparent", color:tab===tb?"#fff":c.dm }}>
            {tb.charAt(0).toUpperCase()+tb.slice(1)}
          </button>
        ))}
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999, padding:20 }}>
          <div style={{ background:c.w, borderRadius:20, padding:24, maxWidth:300, width:"100%", textAlign:"center" }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>Change tier?</div>
            <div style={{ fontSize:13, color:c.dm, marginBottom:20 }}>
              Move <strong>{confirm.name}</strong> to <strong style={{ color:TIERS[confirm.to].color }}>{TIERS[confirm.to].label}</strong>?
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setConfirm(null)} style={{ flex:1, padding:11, borderRadius:12, border:`1px solid ${c.bd}`, background:c.w, fontSize:13, fontWeight:600, cursor:"pointer", color:c.dm }}>Cancel</button>
              <button onClick={() => changeTier(confirm.uid, confirm.to)} style={{ flex:1, padding:11, borderRadius:12, border:"none", background:TIERS[confirm.to].color, fontSize:13, fontWeight:600, cursor:"pointer", color:"#fff" }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ OVERVIEW ═══ */}
      {tab === "overview" && (<>
        {/* Stats */}
        <div style={{ display:"flex", gap:6, marginBottom:10 }}>
          {[[users.length,"Total",c.tx],[free.length,"Free",c.or],[pro.length,"Pro",c.gr],[premium.length,"Premium",c.pr]].map(([val,label,color]) => (
            <div key={label} style={{ background:c.w, borderRadius:14, padding:"14px 10px", border:`1px solid ${c.bd}`, textAlign:"center", flex:1 }}>
              <div style={{ fontSize:24, fontWeight:700, letterSpacing:"-1px", color }}>{val}</div>
              <div style={{ fontSize:8, color:c.dm, marginTop:2, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Revenue */}
        <div style={{ background:c.w, borderRadius:14, padding:14, border:`1px solid ${c.bd}`, marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:13, fontWeight:600 }}>Est. Monthly Revenue</span>
            <span style={{ fontSize:18, fontWeight:800, color:c.gr }}>${rev.toFixed(0)}</span>
          </div>
          <div style={{ fontSize:10, color:c.dm }}>
            {pro.length} Pro × $9.99 = ${(pro.length*9.99).toFixed(0)} · {premium.length} Premium × $49.99 = ${(premium.length*49.99).toFixed(0)}
          </div>
        </div>

        {/* Tier Breakdown */}
        <div style={{ background:c.w, borderRadius:14, padding:14, border:`1px solid ${c.bd}`, marginBottom:10 }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>Tier Breakdown</div>
          <div style={{ display:"flex", height:28, borderRadius:6, overflow:"hidden" }}>
            {[[free,"free"],[pro,"pro"],[premium,"premium"]].map(([arr,key]) => arr.length > 0 && (
              <div key={key} style={{ width:`${arr.length/users.length*100}%`, background:TIERS[key].color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", minWidth:20 }}>{arr.length}</div>
            ))}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:9, fontWeight:600 }}>
            <span style={{ color:c.or }}>Free ({free.length})</span>
            <span style={{ color:c.gr }}>Pro ({pro.length})</span>
            <span style={{ color:c.pr }}>Premium ({premium.length})</span>
          </div>
        </div>

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

        {/* Recent */}
        <div style={{ background:c.w, borderRadius:14, padding:14, border:`1px solid ${c.bd}` }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:8 }}>Recent Signups</div>
          {[...users].sort((a,b) => b.joined.localeCompare(a.joined)).slice(0,5).map(u => (
            <div key={u.id} style={{ display:"flex", alignItems:"center", padding:"7px 0", gap:8, borderBottom:`1px solid ${c.bd}20` }}>
              <div style={{ width:26, height:26, borderRadius:13, background:c.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:600, color:c.dm }}>{u.name.charAt(0)}</div>
              <div style={{ flex:1 }}><div style={{ fontSize:12, fontWeight:600 }}>{u.name}</div><div style={{ fontSize:9, color:c.dm }}>{u.joined}</div></div>
              <Bdg tier={u.tier} />
            </div>
          ))}
        </div>
      </>)}

      {/* ═══ USERS ═══ */}
      {tab === "users" && (<>
        <input type="text" value={sq} onChange={e => setSq(e.target.value)} placeholder="Search by name or email..."
          style={{ width:"100%", padding:"12px 14px", background:c.w, border:`1px solid ${c.bd}`, borderRadius:12, fontSize:14, outline:"none", boxSizing:"border-box", marginBottom:12 }} />

        {/* Selected User Detail */}
        {selUser && (
          <div style={{ background:c.w, borderRadius:16, padding:16, border:`1px solid ${c.bd}`, marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:38, height:38, borderRadius:19, background:c.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:c.dm }}>{selUser.name.charAt(0)}</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700 }}>{selUser.name}</div>
                  <div style={{ fontSize:11, color:c.dm }}>{selUser.email}</div>
                </div>
              </div>
              <button onClick={() => { setSelUser(null); setEditLimits(null); }} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:c.dm }}>✕</button>
            </div>

            <Bdg tier={selUser.tier} />
            <span style={{ fontSize:11, color:c.dm, marginLeft:8 }}>Joined {selUser.joined}</span>

            {/* Usage vs Limits */}
            <div style={{ marginTop:14, padding:12, background:c.bg, borderRadius:12 }}>
              <div style={{ fontSize:10, fontWeight:700, color:c.dm, letterSpacing:1, marginBottom:8 }}>USAGE vs LIMITS</div>
              {(() => {
                const lim = selUser.tier === "premium" ? (selUser.premiumLimits || TIERS.premium.limits) : TIERS[selUser.tier]?.limits || TIERS.free.limits;
                const storageMB = estStorage(selUser);
                const maxStorageMB = selUser.tier === "premium" ? 15360 : selUser.tier === "pro" ? 500 : 5;
                return (<>
                  <LimitRow label="Portfolios" used={selUser.ports} max={lim.portfolios} />
                  <LimitRow label="Coins (total)" used={selUser.coins} max={lim.portfolios * lim.coins} />
                  <LimitRow label="Transactions" used={selUser.txs} max={lim.portfolios * lim.coins * lim.transactions} />
                  <StorageBar used={storageMB} max={maxStorageMB} unit="MB" />
                </>);
              })()}
            </div>

            {/* Tier Buttons */}
            <div style={{ fontSize:10, fontWeight:700, color:c.dm, letterSpacing:1, marginTop:14, marginBottom:8 }}>CHANGE TIER</div>
            <div style={{ display:"flex", gap:6 }}>
              {["free","pro","premium"].map(t => (
                <button key={t}
                  onClick={() => selUser.tier !== t && setConfirm({ uid:selUser.id, name:selUser.name, to:t })}
                  style={{
                    flex:1, padding:"9px", borderRadius:8,
                    border: selUser.tier === t ? `2px solid ${TIERS[t].color}` : `1px solid ${c.bd}`,
                    fontSize:10, fontWeight:700, cursor: selUser.tier === t ? "default" : "pointer",
                    background: selUser.tier === t ? TIERS[t].color+"15" : c.w,
                    color: TIERS[t].color,
                    opacity: selUser.tier === t ? 1 : 0.6,
                  }}>
                  {TIERS[t].label.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Premium Limits Editor */}
            {selUser.tier === "premium" && (
              <div style={{ marginTop:14, padding:14, background:c.pr+"08", borderRadius:12, border:`1px solid ${c.pr}20` }}>
                <div style={{ fontSize:10, fontWeight:700, color:c.pr, letterSpacing:1, marginBottom:10 }}>PREMIUM CUSTOM LIMITS</div>
                <div style={{ fontSize:9, color:c.dm, marginBottom:10 }}>Max storage: 15 GB · Full usage at defaults = 12.7 GB (85%)</div>

                {editLimits ? (
                  <div>
                    {[
                      ["Portfolios","portfolios",50,1,100],
                      ["Coins per portfolio","coins",500,10,1000],
                      ["Transactions per coin","transactions",5000,100,20000],
                    ].map(([label,key,def,min,max]) => (
                      <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${c.bd}20` }}>
                        <span style={{ fontSize:12, color:c.dm }}>{label}</span>
                        <input type="number" min={min} max={max} value={editLimits[key]||def}
                          onChange={e => setEditLimits({...editLimits, [key]:parseInt(e.target.value)||0})}
                          style={{ width:80, padding:"6px 8px", borderRadius:6, border:`1px solid ${c.bd}`, fontSize:12, textAlign:"right", outline:"none" }} />
                      </div>
                    ))}
                    {/* Storage estimate */}
                    {(() => {
                      const estGB = (editLimits.portfolios||50) * (editLimits.coins||500) * (142 + (editLimits.transactions||5000) * 109) / (1024**3);
                      const pct = (estGB / 15 * 100);
                      return (
                        <div style={{ marginTop:10, padding:10, background:c.w, borderRadius:8 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
                            <span style={{ color:c.dm }}>Estimated max storage</span>
                            <span style={{ fontWeight:700, color: pct > 100 ? c.rd : c.tx }}>{estGB.toFixed(1)} GB / 15 GB ({pct.toFixed(0)}%)</span>
                          </div>
                          <div style={{ height:5, background:"#F0F0F0", borderRadius:3, overflow:"hidden", marginTop:4 }}>
                            <div style={{ width:`${Math.min(100,pct)}%`, height:"100%", background: pct > 100 ? c.rd : pct > 85 ? c.or : c.gr, borderRadius:3 }} />
                          </div>
                          {pct > 100 && <div style={{ fontSize:10, color:c.rd, fontWeight:600, marginTop:4 }}>⚠ Exceeds 15 GB limit. Reduce values.</div>}
                        </div>
                      );
                    })()}
                    <div style={{ display:"flex", gap:6, marginTop:12 }}>
                      <button onClick={() => setEditLimits(null)} style={{ flex:1, padding:9, borderRadius:8, border:`1px solid ${c.bd}`, background:c.w, fontSize:11, fontWeight:600, cursor:"pointer", color:c.dm }}>Cancel</button>
                      <button onClick={() => saveLimits(selUser.id, editLimits)} style={{ flex:1, padding:9, borderRadius:8, border:"none", background:c.pr, fontSize:11, fontWeight:600, cursor:"pointer", color:"#fff" }}>Save Limits</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {[
                      ["Portfolios", selUser.premiumLimits?.portfolios || 50],
                      ["Coins per portfolio", selUser.premiumLimits?.coins || 500],
                      ["Transactions per coin", selUser.premiumLimits?.transactions || 5000],
                    ].map(([k,v]) => (
                      <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", fontSize:12, borderBottom:`1px solid ${c.bd}10` }}>
                        <span style={{ color:c.dm }}>{k}</span>
                        <span style={{ fontWeight:700 }}>{v.toLocaleString()}</span>
                      </div>
                    ))}
                    <button onClick={() => setEditLimits(selUser.premiumLimits || { portfolios:50, coins:500, transactions:5000 })}
                      style={{ marginTop:10, width:"100%", padding:9, borderRadius:8, border:`1px solid ${c.pr}`, background:c.pr+"10", fontSize:11, fontWeight:600, cursor:"pointer", color:c.pr }}>
                      Edit Limits
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* User List */}
        <div style={{ background:c.w, borderRadius:14, padding:"4px 14px", border:`1px solid ${c.bd}` }}>
          <div style={{ padding:"10px 0", fontSize:11, fontWeight:600, color:c.dm, borderBottom:`1px solid ${c.bd}` }}>
            {filtered.length} user{filtered.length !== 1 ? "s" : ""} {sq && `· "${sq}"`}
          </div>
          {filtered.map(u => (
            <div key={u.id} onClick={() => { setSelUser(u); setEditLimits(null); }}
              style={{ display:"flex", alignItems:"center", borderBottom:`1px solid ${c.bd}20`, gap:10, cursor:"pointer",
                background: selUser?.id === u.id ? c.bg : "transparent", margin: selUser?.id === u.id ? "0 -14px" : 0, padding: selUser?.id === u.id ? "10px 14px" : "10px 0" }}>
              <div style={{ width:32, height:32, borderRadius:16, background:c.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, color:c.dm, flexShrink:0 }}>{u.name.charAt(0)}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600 }}>{u.name}</div>
                <div style={{ fontSize:10, color:c.dm, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.email}</div>
              </div>
              <Bdg tier={u.tier} />
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:10, fontWeight:600 }}>{u.ports}p · {u.coins}c</div>
                <div style={{ fontSize:8, color:c.dm }}>{u.txs.toLocaleString()} tx</div>
              </div>
            </div>
          ))}
        </div>
      </>)}

      {/* ═══ SETTINGS ═══ */}
      {tab === "settings" && (<>
        <div style={{ background:"#E7F1EC", border:"1px solid #b9d8c9", borderRadius:12, padding:"12px 14px", marginBottom:14, fontSize:12, color:"#084d39", lineHeight:1.5 }}>
          Saved securely via the admin-only <b>saveConfig</b> function to a locked Firestore <code>config/app</code> doc — clients can never read it; the price proxy + PayPal functions read it server-side. Requires the functions deployed (Blaze plan).
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
              <input type={(key.toLowerCase().includes("ecret")||key==="coingecko")?"password":"text"} value={keys[key]} placeholder={ph}
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
              <input type={key==="apiKey"?"password":"text"} value={mail[key]} placeholder={ph}
                onChange={e => setMail({ ...mail, [key]: e.target.value })}
                style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:`1px solid ${c.bd}`, fontSize:13, outline:"none", boxSizing:"border-box" }} />
            </div>
          ))}
          <button onClick={saveConfig}
            style={{ marginTop:6, padding:"9px 16px", borderRadius:8, border:"none", background:c.tx, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>Save email settings</button>
        </div>

        {savedMsg && <div style={{ textAlign:"center", marginTop:12, fontSize:12, color:c.gr, fontWeight:600 }}>{savedMsg}</div>}
      </>)}

      <div style={{ textAlign:"center", padding:"18px 0", fontSize:10, color:c.dm }}>
        Crypto Idea Admin · v4.2.0
      </div>
    </div>
  );
}
