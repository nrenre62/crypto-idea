import { c } from "../utils/theme.js";
import { Logo } from "./ui.jsx";

// Full-screen loading state shown while auth/data resolves on startup.
// Pure presentational — no props, no state. LOGO-2: unified onto the shared
// <Logo> brand mark (green "C" tile + one-word "CryptoIdea") + the ellipsis
// subtext, replacing the old thin two-word wordmark. Wrapped in .ci-app so the
// app.css .ci-logo* styles apply.
export function Loading() {
  return (
    <div className="ci-app" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 12 }}>
      <Logo size="lg" />
      <div style={{ fontSize: 13, color: c.dim }}>Loading…</div>
    </div>
  );
}
