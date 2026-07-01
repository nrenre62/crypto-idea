import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.config.js";

// Self-service privacy (GDPR/CCPA) Cloud Functions. Both act on the CALLER's own
// uid server-side (no IDOR) — see functions/index.js. Kept in api/ so components
// never call httpsCallable directly.

// Returns the caller's exported data (the function's payload).
export async function exportMyData() {
  const res = await httpsCallable(functions, "exportMyData")();
  return res.data;
}

// Soft-deletes the caller's account: marks it trashed and keeps the data for a
// 30-day grace period (recoverable via restoreMyAccount). Returns the grace info.
export async function deleteMyAccount() {
  const res = await httpsCallable(functions, "deleteMyAccount")();
  return res.data;
}

// Restores the caller's own soft-deleted account (within the 30-day window). Throws
// if the window has passed.
export async function restoreMyAccount() {
  const res = await httpsCallable(functions, "restoreMyAccount")();
  return res.data;
}

// Revokes the caller's refresh tokens on the server (sign out of ALL devices, S7).
export async function signOutEverywhere() {
  const res = await httpsCallable(functions, "signOutEverywhere")();
  return res.data;
}

// DEV / EMULATOR ONLY — set the CALLER's own tier so an in-app "upgrade" persists to
// the DB locally (there's no PayPal webhook in the emulator, so the demo upgrade would
// otherwise never reach Firestore and the portfolio cap would stay at free=1). The
// Cloud Function HARD-REFUSES outside the emulator, and callers gate on
// `import.meta.env.DEV`, so this can never self-upgrade in production. Not a security
// boundary on its own — the function's emulator gate is. See functions/index.js.
export async function devSetMyTier(tier) {
  const res = await httpsCallable(functions, "devSetMyTier")({ tier });
  return res.data;
}
