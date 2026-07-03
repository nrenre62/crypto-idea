// data/mock-conviction.js — ILLUSTRATIVE conviction evidence for the Coins cards
// while the live AI engine is offline (Wave B). Deterministic per coin so the demo
// is stable, and shaped to exercise all four rubric states (#9), the >= 2-source
// accuracy gate (#8), and catalyst auto-expiry (#11). This is NOT real analysis — it
// is fed through computeConviction exactly like the live evidence will be, so when
// the proxy ships, only this source is swapped (the reducer + UI are unchanged).

import { computeConviction } from "../utils/conviction.js";

// Stable, tiny hash of a string -> non-negative int (no Math.random, so the demo
// is reproducible).
function hash(s) {
  let h = 0;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Canonical evidence shapes. The "sources" are illustrative names — the point is the
// cross-check pattern (how many sources, agreeing or conflicting) that the reducer grades.
const PROFILES = [
  // 0 — strong: every axis corroborated healthy, one upcoming catalyst.
  {
    axes: {
      dev: [{ source: "github", verdict: "healthy" }, { source: "commits", verdict: "healthy" }],
      founders: [{ source: "media", verdict: "healthy" }, { source: "blog", verdict: "healthy" }],
      team: [{ source: "docs", verdict: "healthy" }, { source: "media", verdict: "healthy" }],
      community: [{ source: "media", verdict: "healthy" }, { source: "forum", verdict: "healthy" }],
    },
    catalysts: [{ label: "Protocol upgrade", date: "2026-09-01" }],
  },
  // 1 — mixed bag: a conflict (🟡), a thin axis (⬛), a corroborated problem (🔴),
  //     and a stale unlock that should auto-expire.
  {
    axes: {
      dev: [{ source: "github", verdict: "healthy" }, { source: "commits", verdict: "healthy" }],
      founders: [{ source: "media", verdict: "healthy" }, { source: "blog", verdict: "problem" }],
      team: [{ source: "docs", verdict: "healthy" }],
      community: [{ source: "media", verdict: "problem" }, { source: "forum", verdict: "problem" }],
    },
    catalysts: [{ label: "Token unlock", date: "2025-12-01" }],
  },
  // 2 — thin coverage: a long-tail coin where most axes are insufficient-data.
  {
    axes: {
      dev: [{ source: "github", verdict: "healthy" }, { source: "commits", verdict: "mixed" }],
      founders: [],
      team: [{ source: "docs", verdict: "problem" }],
      community: [],
    },
    catalysts: [],
  },
  // 3 — fading: dev corroborated abandoned (🔴), the rest mixed/healthy.
  {
    axes: {
      dev: [{ source: "github", verdict: "problem" }, { source: "commits", verdict: "problem" }],
      founders: [{ source: "media", verdict: "mixed" }, { source: "blog", verdict: "healthy" }],
      team: [{ source: "docs", verdict: "healthy" }, { source: "media", verdict: "healthy" }],
      community: [{ source: "forum", verdict: "mixed" }, { source: "media", verdict: "mixed" }],
    },
    catalysts: [{ label: "Mainnet milestone", date: "2026-10-15" }],
  },
];

// The fetch date stamped on the mock evidence (#11 "as of DATE"). C-A1: derived
// (yesterday) instead of a fixed literal, so the demo seam never shows a stale,
// misleading date pre-live. The real per-coin cache replaces this at Wave B (B5).
const MOCK_AS_OF = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);

// Majors read as strong regardless of hash — a sensible demo default.
const STRONG = new Set(["bitcoin", "ethereum", "solana"]);

export function mockEvidence(holding) {
  const id = holding ? holding.id || holding.sym : "";
  const profile = STRONG.has(id) ? PROFILES[0] : PROFILES[hash(id) % PROFILES.length];
  return { asOf: MOCK_AS_OF, ...profile };
}

// The displayable conviction object for a holding (mock evidence -> rubric reducer).
export function mockConviction(holding, today) {
  return computeConviction(mockEvidence(holding), today);
}
