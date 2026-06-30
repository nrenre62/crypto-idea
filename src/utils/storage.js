// Persistent key/value storage over the browser's localStorage. Values are JSON-encoded;
// every method swallows errors and degrades gracefully (get → null, set/del → false) so a
// disabled or full localStorage (private mode / quota) never crashes the app. Used for
// non-sensitive local data only (cached profile by uid, active-portfolio id) — never
// secrets. Async signatures are kept so existing `await db.x(...)` call sites are unchanged.
//
// (C-R2a) Previously this wrapped a non-existent `window.storage` host API, so every call
// silently no-op'd — "remember active portfolio" + the profile cache never persisted and
// logout couldn't clear them. localStorage is the real, always-present browser store.
export const db = {
  async get(key) {
    try { const raw = localStorage.getItem(key); return raw != null ? JSON.parse(raw) : null; }
    catch { return null; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  async del(key) {
    try { localStorage.removeItem(key); return true; }
    catch { return false; }
  }
};
