import { useApp } from "../hooks/app-context.js";

// Password reset screen — presentation only. State (fp* fields, resetSent) and the
// handleReset handler come from context (handler defined in CryptoIdea.jsx).
// R9-1b: restyled onto the shared .ci-app auth design (was one-off inline styles) so it
// matches Login; the reset-email logic is unchanged. Keeps the inline #FF3B30 error
// colour for parity with Login's test-locked auth error.
export function ForgotPass() {
  const { fpEmail, setFpEmail, fpErr, resetSent, setResetSent, setScreen, handleReset } = useApp();
  if (resetSent) return (
    <div className="ci-app screen-bg auth-wrap">
      <div className="welcome-check">✓</div>
      <div className="auth-h">Check your email</div>
      <div className="auth-sub">We've sent password reset instructions to <strong>{fpEmail}</strong></div>
      <button className="btn-primary" style={{ maxWidth: 320 }} onClick={() => { setResetSent(false); setScreen("login"); }}>Back to log in</button>
    </div>
  );
  return (
    <div className="ci-app screen-bg auth-wrap">
      <div className="auth-logo">Crypto <span>Idea</span></div>
      <div className="auth-tagline">Reset your password</div>
      <form className="auth-col" onSubmit={(e) => { e.preventDefault(); handleReset(); }}>
        <div className="auth-note">Enter your email and we'll send you a link to reset your password.</div>
        <input type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" inputMode="email" className="field-input" />
        {fpErr && <div className="auth-err" style={{ color: "#FF3B30" }}>{fpErr}</div>}
        <button type="submit" className="btn-primary">Send reset link</button>
        <div className="auth-link"><span onClick={() => setScreen("login")}>Back to log in</span></div>
      </form>
    </div>
  );
}
