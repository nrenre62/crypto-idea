import { c } from "../utils/theme.js";

// Full-screen loading state shown while auth/data resolves on startup.
// Pure presentational — no props, no state.
export function Loading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 12 }}>
      <div style={{ fontSize: 28, fontWeight: 200, letterSpacing: "-0.5px" }}>Crypto <span style={{ fontWeight: 700 }}>Idea</span></div>
      <div style={{ fontSize: 13, color: c.dim }}>Loading your data...</div>
    </div>
  );
}
