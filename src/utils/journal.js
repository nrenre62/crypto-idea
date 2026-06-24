import { FUNNEL_FIELDS } from "../data/journal-funnel.js";

// Build a clean `funnel` object from raw text inputs for the manual-research
// findings (#27). Trims each field, drops the empties, and returns null when
// nothing was filled — so we never persist an empty `{}` map and a coin with no
// findings simply has no `funnel` key (which keeps the firestore.rules validator
// backward-compatible: funnel is optional). Unknown keys are ignored.
export function cleanFunnel(input) {
  if (!input) return null;
  const out = {};
  for (const { key } of FUNNEL_FIELDS) {
    const v = (input[key] || "").trim();
    if (v) out[key] = v;
  }
  return Object.keys(out).length ? out : null;
}
