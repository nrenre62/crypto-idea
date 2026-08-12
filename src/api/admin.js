import { httpsCallable } from "firebase/functions";
import { adminFunctions as functions } from "./firebase.admin.config.js";

// Admin-only Cloud Functions. Every one of these re-verifies the {admin:true}
// custom claim server-side (see functions/index.js) — a non-admin caller is
// rejected there, regardless of what the client does. Kept in api/ so the
// admin dashboard never calls httpsCallable directly. Each wrapper returns the
// payload the caller actually needs (or void for fire-and-forget actions).
//
// R31-1: these run on the SEPARATE admin Firebase instance (firebase.admin.config.js)
// so the admin session (and its token) is fully isolated from the user app's session.

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

// ADMIN-SEP (CRYP-103): the admin roster — every account holding the {admin:true}
// claim (owners + managers), for the owner-only Admin-access drill-in. Read-only;
// grant/revoke stays the email-lookup flow. Returns an array (the callable returns
// { admins:[{uid,email,role,disabled,lastSignInTime}], total }).
export async function listAdmins() {
  const res = await httpsCallable(functions, "listAdmins")({});
  return (res.data && res.data.admins) || [];
}

// Recent admin-action audit entries. Returns an array.
export async function listAudit(limit = 100) {
  const res = await httpsCallable(functions, "listAudit")({ limit });
  return (res.data && res.data.entries) || [];
}

// ADMIN-1: recent PayPal webhook-processing events (id, type, atMs) for the
// Overview billing/webhook-health card. Read-only. Returns an array (newest first).
export async function listWebhookEvents(limit = 50) {
  const res = await httpsCallable(functions, "listWebhookEvents")({ limit });
  return (res.data && res.data.events) || [];
}

// AUTH-DUP (Part B): read-only duplicate-email detector for the Overview. Flags any
// email shared by 2+ Auth accounts (a double-submit signup artifact, or a soft-delete +
// re-register). Read-only — the owner resolves via the existing delete/trash flow.
// Returns { groups:[{email,count,accounts}], duplicateEmails, capped }.
export async function findDuplicateEmails() {
  const res = await httpsCallable(functions, "findDuplicateEmails")({});
  return res.data || { groups: [], duplicateEmails: 0, capped: false };
}

// ADMIN-2: operational status for the Overview strip — the kill-switch states, the
// scheduled-job heartbeats, market-cache ages and whether Sentry is configured.
// Read-only, no secrets (the Sentry DSN is reported only as a boolean).
export async function getSystemStatus() {
  const res = await httpsCallable(functions, "getSystemStatus")({});
  return res.data;
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

// Set/clear a user's per-user custom limits (premium overrides, S8). `limits` is
// { portfolios?, coins?, transactions? }; an empty object clears the override. The
// server clamps each value to the product hard-max. Returns the stored limits.
export async function setPremiumLimits(uid, limits) {
  const res = await httpsCallable(functions, "setPremiumLimits")({ uid, limits });
  return res.data;
}

// Suspend / un-suspend a user account. Throws on failure.
export async function suspendUser(uid, disabled) {
  await httpsCallable(functions, "suspendUser")({ uid, disabled });
}

// GDPR erasure of a user account (blocks self-target server-side). Throws on failure.
export async function deleteUser(uid) {
  await httpsCallable(functions, "deleteUser")({ uid });
}

// Restore a soft-deleted (trashed) user account. Throws on failure.
export async function restoreUser(uid) {
  await httpsCallable(functions, "restoreUser")({ uid });
}

// ADMIN-SEC: grant/revoke the MANAGER role by email. Owners only, and the server also
// requires a recent password re-auth (see reauthAdmin in api/admin-auth.js). Owners
// themselves are never grantable or revocable here — only scripts/set-admin.js can
// mint one, which is what makes them un-removable from inside the panel.
// Replaces the old setAdminClaim, which let ANY admin promote anyone (the bypass).
export async function setManagerRole(email, grant) {
  const res = await httpsCallable(functions, "setManagerRole")({ email, grant });
  return res.data;
}

// BL-2b (D8): admin soft-delete — move a user to the 30-day trash (refuses admins).
export async function adminTrashUser(uid) {
  await httpsCallable(functions, "adminTrashUser")({ uid });
}

// BL-2c (D9): revoke a target user's refresh tokens (sign out of all devices).
export async function adminSignOutUser(uid) {
  await httpsCallable(functions, "adminSignOutUser")({ uid });
}

// ADMIN-5: read-only "view as" (support). OWNER-only + a required reason (logged).
// Returns a bounded snapshot of the user's data (portfolios/coins/theses/learn) —
// the server never mints a token or acts as the user. Returns the snapshot object.
export async function viewUserAsAdmin(uid, reason) {
  const res = await httpsCallable(functions, "viewUserAsAdmin")({ uid, reason });
  return res.data;
}

// ADMIN-5: private per-user admin note (server-only adminNotes/{uid}). Any admin
// may read; a manager/owner may write. Returns { note, updatedAt, updatedByEmail }.
export async function getUserNote(uid) {
  const res = await httpsCallable(functions, "getUserNote")({ uid });
  return res.data || { note: "", updatedAt: null, updatedByEmail: "" };
}

// ADMIN-5: save a user's private admin note (content never enters the audit log).
export async function saveUserNote(uid, note) {
  await httpsCallable(functions, "saveUserNote")({ uid, note });
}

// ADMIN-4: the daily growth series for the Overview trend card, OLDEST-FIRST.
// Aggregate-only (counts + revenue, no personal data). Returns an array.
export async function listDailyStats(limit = 90) {
  const res = await httpsCallable(functions, "listDailyStats")({ limit });
  return (res.data && res.data.series) || [];
}

// ADMIN-4 (owners only): write today's snapshot on demand — for a missed nightly
// run, and the only way to exercise this under the emulator (which never fires
// pubsub on a cron). Idempotent per UTC day. Returns the stored snapshot.
export async function captureStatsSnapshot() {
  const res = await httpsCallable(functions, "captureStatsSnapshot")({});
  return (res.data && res.data.snapshot) || null;
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

// ADMIN-6: set OR change the owner-only Settings password (the 2nd lock on this screen).
// First-time set needs a recent login re-auth (server-enforced); a change needs the
// current password or a live unlock. `current` is optional (ignored on first set).
// The plaintext never persists — it's scrypt-hashed server-side. Throws on failure.
export async function setSettingsPassword(next, current = "") {
  await httpsCallable(functions, "setSettingsPassword")({ next, current });
}

// ADMIN-6: unlock the Settings screen with the Settings password. On success the server
// records a short-lived unlock; returns { until } (ms). Throws on a wrong password
// (permission-denied) or when the daily attempt budget is exhausted (resource-exhausted).
export async function unlockSettings(password) {
  const res = await httpsCallable(functions, "unlockSettings")({ password });
  return res.data || {};
}
