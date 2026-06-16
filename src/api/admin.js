import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.config.js";

// Admin-only Cloud Functions. Every one of these re-verifies the {admin:true}
// custom claim server-side (see functions/index.js) — a non-admin caller is
// rejected there, regardless of what the client does. Kept in api/ so the
// admin dashboard never calls httpsCallable directly. Each wrapper returns the
// payload the caller actually needs (or void for fire-and-forget actions).

// Combined, anonymised usage for the Overview (no personal data). Returns the stats object.
export async function getStats() {
  const res = await httpsCallable(functions, "getStats")();
  return res.data;
}

// Full users list (Auth+profile merge, operational data only). Returns an array.
export async function listUsers() {
  const res = await httpsCallable(functions, "listUsers")({});
  return (res.data && res.data.users) || [];
}

// Recent admin-action audit entries. Returns an array.
export async function listAudit(limit = 100) {
  const res = await httpsCallable(functions, "listAudit")({ limit });
  return (res.data && res.data.entries) || [];
}

// Look up one user by email (support/moderation). Returns the user detail object.
export async function lookupUser(email) {
  const res = await httpsCallable(functions, "lookupUser")({ email });
  return res.data;
}

// Change a user's plan tier. Throws on failure.
export async function setUserTier(uid, tier) {
  await httpsCallable(functions, "setUserTier")({ uid, tier });
}

// Suspend / un-suspend a user account. Throws on failure.
export async function suspendUser(uid, disabled) {
  await httpsCallable(functions, "suspendUser")({ uid, disabled });
}

// GDPR erasure of a user account (blocks self-target server-side). Throws on failure.
export async function deleteUser(uid) {
  await httpsCallable(functions, "deleteUser")({ uid });
}

// Saved admin config (secrets returned as set-flags only, never values). Returns the config object.
export async function getAdminConfig() {
  const res = await httpsCallable(functions, "getAdminConfig")();
  return res.data || {};
}

// Persist the locked config/app doc. `payload` = { keys, email, flags, analytics?, legal?, plans? }.
// A blank secret keeps the saved value (handled server-side). Throws on failure.
export async function saveConfig(payload) {
  await httpsCallable(functions, "saveConfig")(payload);
}
