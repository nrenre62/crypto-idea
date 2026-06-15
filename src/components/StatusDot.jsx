import { useApp } from "../hooks/app-context.js";
import { c } from "../utils/theme.js";

// Live/offline status pill. Reads `api` from context; the `live` prop can force
// the live state. Moved out of CryptoIdea.jsx verbatim (api now via context).
export function StatusDot({ live, small }) {
  const { api } = useApp();
  const size = small ? 6 : 8;
  const isLive = live || api === "live";
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: small ? 4 : 6, padding: small ? "3px 8px" : "4px 10px", borderRadius: 20, background: isLive ? c.acd : c.yeld, border: `1px solid ${isLive ? "#34C75930" : "#FF950030"}` }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <div style={{ width: size, height: size, borderRadius: "50%", background: isLive ? c.ac : c.yel }} />
        {isLive && <div style={{ position: "absolute", top: -1, left: -1, width: size + 2, height: size + 2, borderRadius: "50%", background: isLive ? c.ac : c.yel, opacity: 0.4, animation: "pulse 2s infinite" }} />}
      </div>
      <span style={{ fontSize: small ? 9 : 10, fontWeight: 600, color: isLive ? c.ac : c.yel, letterSpacing: "0.3px" }}>{isLive ? "LIVE" : "OFFLINE"}</span>
    </div>
  );
}
