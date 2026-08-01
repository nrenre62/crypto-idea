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

// DI-3: recompute the caller's own aggregate counters from real docs (self-heal a
// drifted portfolioCount/coinCount/txCount that would otherwise fire a false "limit").
// Acts only on the caller's uid. Returns { success, fixed }.
export async function reconcileMyCounters() {
  const res = await httpsCallable(functions, "reconcileMyCounters")();
  return res.data;
}

// DI-4/G23: clear the server-side pending-downgrade `subscription` marker after the user
// resolves a lapsed Premium→Pro re-checkout ("Continue with Starter" / approved Pro), so
// the prompt doesn't recur on every load. Owner-immutable field — this is the server path.
export async function resolveRecheckout() {
  const res = await httpsCallable(functions, "resolveRecheckout")();
  return res.data;
}

// DI-4/R29: "Keep my plan" — un-cancel a pending downgrade on the server (the owner can't
// write `subscription`). At go-live also reactivates the PayPal subscription.
export async function reactivateSubscription() {
  const res = await httpsCallable(functions, "reactivateSubscription")();
  return res.data;
}

// ONBOARD-GATE: record the caller's FREE plan choice server-side. Sets the server-only
// planChosen flag (clients can never write it — the flag GATES all app data in
// firestore.rules) and creates the default portfolio. Idempotent; acts on the caller's uid.
// Paid choices go through createSubscription/PayPal instead. Returns { success, planChosen }.
export async function chooseFreePlan() {
  const res = await httpsCallable(functions, "chooseFreePlan")({});
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
