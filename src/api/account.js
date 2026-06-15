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

// Permanently deletes the caller's account + data. Throws on failure.
export async function deleteMyAccount() {
  await httpsCallable(functions, "deleteMyAccount")();
}
