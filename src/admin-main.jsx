/**
 * Crypto Idea — Admin app (separate entry)
 * =========================================
 * A SEPARATE app from the user-facing one (app.html / main.jsx). The admin
 * dashboard code is not bundled into the user app, so regular users never
 * download it. Served at /admin (vite dev rewrite + firebase.json prod rewrite).
 *
 * Security note: a different URL is NOT the security boundary. The real gate is
 * the Firebase { admin: true } custom claim — verified server-side in every admin
 * Cloud Function, and re-checked here before anything renders. Anyone who signs in
 * without that claim is immediately signed back out. (At go-live, also require 2FA.)
 */
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
// R31-1: the admin app authenticates on its OWN named Firebase instance (adminAuth),
// isolated from the user app's session — signing in/out here can never end a user's
// session in another tab (fixes ERRORS §A5). See api/firebase.admin.config.js.
import { onAdminAuthChange, adminLogin, adminLogout, adminAuth } from "./api/admin-auth.js";
import AdminDashboard from "./components/admin-dashboard.jsx";

const wrap = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
const card = { width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12, background: "#fff", border: "1px solid #E8E8ED", borderRadius: 16, padding: 24, boxShadow: "0 6px 30px #0000000d" };
const input = { padding: "12px 14px", borderRadius: 10, border: "1px solid #D8D8DE", fontSize: 15 };
const btn = { padding: "12px", borderRadius: 12, border: "none", background: "#6C5CE7", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" };

function AdminApp() {
  const [phase, setPhase] = useState("loading"); // loading | login | denied | ok
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => onAdminAuthChange(async (user) => {
    if (!user) { setPhase("login"); return; }
    try {
      // Force-refresh so we read the latest custom claim, not a cached token.
      const tr = await user.getIdTokenResult(true);
      if (tr.claims && tr.claims.admin === true) { setErr(""); setPhase("ok"); }
      // R31-1: a non-admin sign-in on THIS instance shows a denied screen with a
      // manual sign-out — we no longer auto-sign-out (that only ever mattered because
      // the session was shared; it isn't anymore). Nothing here touches the user app.
      else setPhase("denied");
    } catch (e) { setPhase("denied"); }
  }), []);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    const res = await adminLogin(email.trim().toLowerCase(), pass);
    setBusy(false);
    if (!res.success) { setErr(res.error || "Could not sign in"); return; }
    // onAdminAuthChange (above) does the admin-claim check and screen transition.
  };

  const signOut = async () => { setErr(""); await adminLogout(); setPhase("login"); };

  if (phase === "loading") return <div style={{ ...wrap, color: "#999", fontSize: 14 }}>Loading…</div>;

  if (phase === "ok") {
    return (
      <div style={{ minHeight: "100vh" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 20px", borderBottom: "1px solid #E8E8ED", background: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
          <strong style={{ fontSize: 15 }}>Crypto Idea · Admin</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "#666" }}>
            <span>{adminAuth.currentUser?.email}</span>
            <button onClick={signOut} style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #E8E8ED", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Log out</button>
          </div>
        </header>
        {/* AdminDashboard centers itself (maxWidth ~1040); no extra cap here. */}
        <AdminDashboard />
      </div>
    );
  }

  const logo = (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 200, letterSpacing: "-0.5px" }}>Crypto <strong style={{ fontWeight: 700 }}>Idea</strong></div>
      <div style={{ fontSize: 11, color: "#999", marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>Admin</div>
    </div>
  );

  // R31-1: a non-admin who signs in stays signed in on THIS isolated instance and
  // sees a denied card with a manual sign-out — no auto-kill (which is safe now that
  // the admin session can't reach the user app's session).
  if (phase === "denied") {
    return (
      <div style={wrap}>
        <div style={card}>
          {logo}
          <div style={{ padding: 10, background: "#FFF7E6", border: "1px solid #FFE0A3", color: "#8A5A00", borderRadius: 10, fontSize: 12, textAlign: "center", lineHeight: 1.5 }}>
            This account isn't an admin. If you have an admin account, sign out and sign back in with it.
          </div>
          <button onClick={signOut} style={btn}>Sign out</button>
        </div>
      </div>
    );
  }

  // login
  return (
    <div style={wrap}>
      <form onSubmit={submit} style={card}>
        {logo}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com" autoComplete="email" inputMode="email" style={input} />
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" autoComplete="current-password" style={input} />
        {err && <div style={{ padding: 10, background: "#FFF0F0", color: "#C0392B", borderRadius: 10, fontSize: 12, textAlign: "center" }}>{err}</div>}
        <button type="submit" disabled={busy} style={{ ...btn, opacity: busy ? 0.6 : 1 }}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><AdminApp /></React.StrictMode>
);
