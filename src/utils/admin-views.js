// ADMIN-5: saved Users-tab filter presets ("views"), stored PER-OPERATOR in the
// admin browser's localStorage — no Firestore collection, no shared state, no new
// attack surface (a view is just a saved {search, tier, billing} filter combo).
// Pure functions with an injected `storage` so they're unit-testable in jsdom.

const KEY = "ci-admin-user-views";
const MAX_VIEWS = 20;
const NAME_MAX = 40;

export function loadViews(storage) {
  try {
    const raw = storage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}

export function persistViews(views, storage) {
  try { storage.setItem(KEY, JSON.stringify(views.slice(0, MAX_VIEWS))); } catch (e) { /* quota / private mode */ }
}

// Add or REPLACE a view by name (case-insensitive) so re-saving the same name
// updates its filters instead of duplicating. Empty names are ignored.
export function addView(views, name, filters) {
  const clean = String(name || "").trim().slice(0, NAME_MAX);
  if (!clean) return views;
  const lower = clean.toLowerCase();
  const rest = views.filter((v) => String(v.name || "").toLowerCase() !== lower);
  return [...rest, { name: clean, filters: filters || {} }].slice(-MAX_VIEWS);
}

export function removeView(views, name) {
  const lower = String(name || "").toLowerCase();
  return views.filter((v) => String(v.name || "").toLowerCase() !== lower);
}
