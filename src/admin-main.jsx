/**
 * CryptoIdea — Admin app (separate entry)
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
// ADMIN-D: the Settings tab is reskinned to the app's .ci-app paper design system.
// app.css is scoped under .ci-app (inert elsewhere); admin-settings.css adds the few
// Settings-only classes the user app doesn't need (kept out of the user bundle).
import "./styles/app.css";
import "./styles/admin-settings.css";
// R31-1: the admin app authenticates on its OWN named Firebase instance (adminAuth),
// isolated from the user app's session — signing in/out here can never end a user's
// session in another tab (fixes ERRORS §A5). See api/firebase.admin.config.js.
import { onAdminAuthChange, adminLogin, adminLogout, adminAuth } from "./api/admin-auth.js";
import AdminDashboard from "./components/admin-dashboard.jsx";

// ADMIN-UI-1 (2026-07-25): the sign-in / denied / loading screens are now on the
// .ci-app paper design (green logo tile), replacing the off-brand purple (#6C5CE7)
// inline styles. The classes live in src/styles/admin-settings.css (.adm-auth-*),
// imported above and out of the user bundle.

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

  if (phase === "loading") return <div className="ci-app adm-auth-wrap"><div className="adm-auth-loading">Loading…</div></div>;

  if (phase === "ok") {
    // ADMIN-UI-1: the whole persistent chrome (bar → H1 → tabs) lives inside
    // AdminDashboard as ONE .ci-app paper layout — no more colliding outer <header>.
    // We just hand it the signed-in email + the sign-out handler.
    return <AdminDashboard email={adminAuth.currentUser?.email} onSignOut={signOut} />;
  }

  // Shared sign-in lockup: the green logo tile + the CryptoIdea · Admin brand.
  const logo = (
    <div className="adm-auth-logo">
      <span className="adm-logo lg" aria-hidden="true">C</span>
      <div className="adm-auth-brand">Crypto<b>Idea</b><span className="adm-auth-sub">Admin</span></div>
    </div>
  );

  // R31-1: a non-admin who signs in stays signed in on THIS isolated instance and
  // sees a denied card with a manual sign-out — no auto-kill (which is safe now that
  // the admin session can't reach the user app's session).
  if (phase === "denied") {
    return (
      <div className="ci-app adm-auth-wrap">
        <div className="adm-auth-card">
          {logo}
          <div className="adm-auth-denied">
            This account isn't an admin. If you have an admin account, sign out and sign back in with it.
          </div>
          <button onClick={signOut} className="adm-auth-btn">Sign out</button>
        </div>
      </div>
    );
  }

  // login
  return (
    <div className="ci-app adm-auth-wrap">
      <form onSubmit={submit} className="adm-auth-card">
        {logo}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@email.com" autoComplete="email" inputMode="email" className="field-input" />
        <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" autoComplete="current-password" className="field-input" />
        {err && <div className="adm-auth-err">{err}</div>}
        <button type="submit" disabled={busy} className="adm-auth-btn">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><AdminApp /></React.StrictMode>
);
