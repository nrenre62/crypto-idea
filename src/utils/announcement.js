// ADMIN-5: client-side dismiss state for the site announcement banner. Pure, with
// an injected `storage`, so it's unit-testable in jsdom. The dismiss is keyed to the
// MESSAGE TEXT: we store only the last-dismissed key, so changing the wording in
// admin Settings makes the banner reappear (a new notice is genuinely new), while a
// re-fetch of the same text stays dismissed.

const KEY = "ci-announcement-dismissed";

// A small, stable hash of the message so we don't store the (potentially long)
// text itself. Not security-sensitive — only used to tell "same message" apart
// from "new message".
export function dismissKey(text) {
  const s = String(text || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; }
  return String(h);
}

export function isDismissed(text, storage) {
  if (!text) return false;
  try { return storage.getItem(KEY) === dismissKey(text); } catch (e) { return false; }
}

export function dismiss(text, storage) {
  try { storage.setItem(KEY, dismissKey(text)); } catch (e) { /* quota / private mode */ }
}
