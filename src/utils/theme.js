// Shared visual tokens for the user app (CryptoIdea). Pure data/style helpers —
// no React, no JSX — so screens can import them instead of each render recreating
// them inline. Kept as terse style objects to match the existing UI code.

// Color tokens.
export const c = { bg: "#FFFFFF", card: "#F8F9FA", ac: "#34C759", acd: "#34C75915", red: "#FF3B30", redd: "#FF3B3012", yel: "#FF9500", yeld: "#FF950012", txt: "#1A1A1A", dim: "#999", bdr: "#F0F0F0", inp: "#F5F5F7", blu: "#007AFF", blud: "#007AFF12" };

// Text input style.
export const inp_s = { width: "100%", padding: "14px 16px", background: c.inp, border: "1px solid #E8E8ED", borderRadius: 14, color: c.txt, fontSize: 15, outline: "none", boxSizing: "border-box" };

// Field label style.
export const lbl_s = { fontSize: 12, color: c.dim, display: "block", marginBottom: 5, fontWeight: 500 };

// Small pill-button style factory (background, color) -> style object.
export const sb = (bg, cl) => ({ padding: "8px 14px", borderRadius: 12, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: bg, color: cl, display: "inline-flex", alignItems: "center", gap: 4 });
