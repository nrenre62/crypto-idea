/**
 * CryptoIdea — Settings-password reset page (ADMIN-6 PR2)
 * =======================================================
 * A standalone, admin-bundle-only page reached from the emailed reset link
 * (/admin?reset=<token>). Rendered by admin-main.jsx ONLY when a verified admin is
 * signed in — the token is bound server-side to the owner's uid, so the callable
 * refuses it for anyone else. Owner-only is enforced by completeSettingsPwReset;
 * this screen is just the form.
 *
 * Paper design under a .ci-app wrapper (app.css tokens); no admin .adm-* imports
 * beyond the shared auth-wrap layout classes. React auto-escaping only — no innerHTML.
 */
import React, { useState } from "react";
import { Logo } from "./ui.jsx";
import { completeSettingsPwReset } from "../api/admin.js";

// Client mirror of the server's strength floor (settings-auth.checkStrength) — the RULES
// only, never the scrypt crypto. Advisory UX; the server is authoritative. Returns the
// first failing message, or "" when acceptable.
function strengthHint(pw) {
  const s = typeof pw === "string" ? pw : "";
  if (s.length < 12) return "Settings password must be at least 12 characters.";
  if (!/[A-Z]/.test(s)) return "Add an uppercase letter (A-Z).";
  if (!/[a-z]/.test(s)) return "Add a lowercase letter (a-z).";
  if (!/[0-9]/.test(s)) return "Add a number (0-9).";
  return "";
}

export default function SettingsPwReset() {
  const token = new URLSearchParams(window.location.search).get("reset") || "";
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (next !== confirm) { setMsg("The two password fields don't match."); return; }
    const hint = strengthHint(next);
    if (hint) { setMsg(hint); return; }
    setBusy(true);
    try {
      await completeSettingsPwReset(token, next);
      setDone(true);
    } catch (err) {
      setMsg((err && err.message) || "Could not reset the Settings password.");
    }
    setBusy(false);
  };

  return (
    <div className="ci-app adm-auth-wrap">
      <div className="adm-auth-card">
        <Logo size="lg" />
        {done ? (
          <>
            <div className="card-sub" style={{ marginBottom: 4 }}>
              Your Settings password has been reset — open Settings to use it.
            </div>
            <a className="acct-btn accent" href="/admin" style={{ textDecoration: "none", textAlign: "center", display: "block" }}>
              Back to the admin panel
            </a>
          </>
        ) : !token ? (
          <>
            <div className="card-sub">This reset link is missing its token. Request a new link from Settings → Settings password.</div>
            <a className="acct-btn" href="/admin" style={{ textDecoration: "none", textAlign: "center", display: "block" }}>
              Back to the admin panel
            </a>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="card-sub">Set a new Settings password for the admin panel.</div>
            <label className="acct-label">New Settings password</label>
            <input className="field-input" type="password" autoComplete="new-password" aria-label="New Settings password"
              value={next} onChange={(e) => setNext(e.target.value)} />
            <label className="acct-label">Confirm new password</label>
            <input className="field-input" type="password" autoComplete="new-password" aria-label="Confirm new password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <div className="adm-hint" style={{ marginTop: 4 }}>
              At least 12 characters, with an uppercase letter, a lowercase letter, and a number.
            </div>
            {msg && <div className="adm-hint" style={{ marginTop: 8 }}>{msg}</div>}
            <button type="submit" className="acct-btn accent" disabled={busy} style={{ marginTop: 12 }}>
              {busy ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
