// ADMIN-5: pure before/after formatting for admin USER-mutation audit entries.
// The config-save diff already lives in config-diff.js; this is the tiny sibling
// for the per-user actions (tier / limits / suspend / role / trash), so a mistaken
// change is inspectable and reversible by hand from the audit log — e.g.
// "tier: free→premium" instead of the old "tier=premium" (no way to know the prior
// value). Dependency-free + unit-tested.

// Render one value for the log. An empty/absent value reads as "(none)" so a
// grant-from-nothing ("role: (none)→manager") is unambiguous; objects (custom
// limits) render as compact JSON; everything else is stringified as-is.
function fmtVal(v) {
  if (v === null || v === undefined || v === "") return "(none)";
  if (typeof v === "object") {
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  return String(v);
}

// "field: before→after". before === after still renders (the caller decides
// whether to log a no-op); keeping it dumb keeps it predictable.
function changeDetail(field, before, after) {
  return `${field}: ${fmtVal(before)}→${fmtVal(after)}`;
}

module.exports = { fmtVal, changeDetail };
