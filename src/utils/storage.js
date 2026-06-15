// Persistent key/value storage wrapper over the host-provided `window.storage` API.
// Values are JSON-encoded; every method swallows errors and degrades gracefully
// (get → null, set/del → false) so storage hiccups never crash the app. Used for
// non-sensitive local data only (profile by uid, active-portfolio id) — never secrets.
export const db = {
  async get(key) {
    try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
    catch { return null; }
  },
  async set(key, value) {
    try { await window.storage.set(key, JSON.stringify(value)); return true; }
    catch { return false; }
  },
  async del(key) {
    try { await window.storage.delete(key); return true; }
    catch { return false; }
  }
};
