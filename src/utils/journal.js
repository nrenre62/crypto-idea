import { FUNNEL_FIELDS } from "../data/journal-funnel.js";

// DI-1: the shared client cap for every free-text journal field (thesis / changeMyMind /
// each funnel finding). Mirrors the firestore.rules bound (size() <= 2000) so an
// over-long field is prevented at the input, never rejected server-side and then
// mislabelled as a "coin limit" (the founder's bug). One source of truth for the maxLength.
export const THESIS_MAX = 2000;

// Build a clean `funnel` object from raw text inputs for the manual-research
// findings (#27). Trims each field, caps it at THESIS_MAX (defense — mirrors the rule),
// drops the empties, and returns null when nothing was filled — so we never persist an
// empty `{}` map and a coin with no findings simply has no `funnel` key (which keeps the
// firestore.rules validator backward-compatible: funnel is optional). Unknown keys ignored.
export function cleanFunnel(input) {
  if (!input) return null;
  const out = {};
  for (const { key } of FUNNEL_FIELDS) {
    const v = (input[key] || "").trim().slice(0, THESIS_MAX);
    if (v) out[key] = v;
  }
  return Object.keys(out).length ? out : null;
}

// Validate the two required thesis questions (§J3). Returns a user-friendly error
// message, or "" when the thesis is OK to save. The minimum to save is BOTH
// "Why you bought it" (thesis) AND "What would change your mind" (changeMind); the
// manual-research funnel is optional. Used by every place a thesis is saved so the
// rule + wording stay consistent (Search Buy-Journal, Journal add, Journal edit).
export function thesisError(thesis, changeMind) {
  const t = (thesis || "").trim();
  const m = (changeMind || "").trim();
  if (!t && !m) return "You haven’t written your thesis yet. Fill in “Why you bought it” and “What would change your mind” to save.";
  if (!t) return "You still need “Why you bought it.” Both questions are required to save.";
  if (!m) return "You still need “What would change your mind.” Both questions are required to save.";
  return "";
}

// R24-2: derived "Incomplete" flag — a saved thesis missing either required answer
// (partial saves are allowed since R24; the auto-save-on-close never discards work).
// Derived at render time, never stored — it auto-clears once both are filled and the
// user's review decision (journal.status) stays un-conflated.
export function isThesisIncomplete(j) {
  return !((j?.thesis || "").trim()) || !((j?.changeMyMind || "").trim());
}
