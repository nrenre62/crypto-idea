/**
 * CryptoIdea — Admin auth helpers (bound to the SEPARATE admin app)
 * ==================================================================
 * Mirror the three auth helpers the admin app needs, but bound to `adminAuth`
 * (the named "admin" Firebase instance) instead of the shared default app. This
 * is what keeps the admin session isolated from the user app (R31-1). The admin
 * dashboard's data access goes through `api/admin.js`, whose callables run on the
 * admin app's Functions instance and carry the admin's own token.
 */
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail } from "firebase/auth";
import { adminAuth } from "./firebase.admin.config.js";

// The admin's live Auth object (email shown in the header, current-user checks).
export { adminAuth };

// Sign in on the admin instance ONLY. Returns { success, user } / { success, error }.
export async function adminLogin(email, password) {
  try {
    const result = await signInWithEmailAndPassword(adminAuth, email, password);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: adminErrorMessage(error.code) };
  }
}

// Sign out of the admin instance ONLY — never touches the user app's session.
export async function adminLogout() {
  try {
    await signOut(adminAuth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Watch the admin instance's auth state (subscribe once on startup).
export function onAdminAuthChange(callback) {
  return onAuthStateChanged(adminAuth, (user) => callback(user));
}

// ADMIN-SEC: read the caller's own role from the verified custom claims.
// `force` re-fetches so a just-changed role is picked up without a re-login.
// This is for RENDERING only — every sensitive callable re-checks the role
// server-side, so tampering with what this returns buys nothing.
export async function getAdminRole({ force = false } = {}) {
  const user = adminAuth.currentUser;
  if (!user) return "";
  try {
    const tr = await user.getIdTokenResult(force);
    const claims = tr && tr.claims;
    if (!claims || claims.admin !== true) return "";
    return claims.role === "owner" || claims.role === "manager" ? claims.role : "";
  } catch (e) { return ""; }
}

/**
 * ADMIN-SEC step-up re-auth: confirm the owner's password, then mint a NEW ID token.
 *
 * The forced refresh is the whole point. `reauthenticateWithCredential` updates the
 * session's auth_time, but the SDK will happily keep sending the previously cached
 * token — and the server gates on the auth_time INSIDE the token it receives. Without
 * getIdToken(true) the owner would type the right password and still be refused, with
 * no way to ever satisfy the gate.
 */
export async function reauthAdmin(password) {
  const user = adminAuth.currentUser;
  if (!user || !user.email) return { success: false, error: "Not signed in" };
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    await user.getIdToken(true);   // MUST be forced — see above
    return { success: true };
  } catch (error) {
    return { success: false, error: adminErrorMessage(error.code) };
  }
}

/**
 * ADMIN-6 PR3 — reset the admin LOGIN password (NOT the Settings password).
 *
 * Works for BOTH owner and manager — it's Firebase-native, so it actually mails a reset
 * link to ANY registered account with that address. That is fine: resetting a login
 * password never grants admin (the `{admin:true}` claim is separate and unaffected).
 *
 * NO ENUMERATION: we must never let the /admin page reveal which addresses are admins.
 * Firebase's own email-enumeration protection already makes sendPasswordResetEmail
 * silent for an unknown address; we additionally swallow an explicit `user-not-found`
 * and report the SAME generic success, so the caller can only ever show "if that email
 * has an account, a link is on its way." Runs on the isolated `adminAuth` instance, and
 * `continueUrl` lands the user back on /admin after they reset.
 */
export async function adminResetPassword(email) {
  const clean = (email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { success: false, error: "Enter a valid email address" };
  const origin = (typeof window !== "undefined" && window.location) ? window.location.origin : "";
  const actionCodeSettings = origin ? { url: origin + "/admin" } : undefined;
  try {
    await sendPasswordResetEmail(adminAuth, clean, actionCodeSettings);
    return { success: true };
  } catch (error) {
    // Report a not-found the SAME as success — never leak which emails exist/are admins.
    if (error && error.code === "auth/user-not-found") return { success: true };
    return { success: false, error: adminErrorMessage(error && error.code) };
  }
}

function adminErrorMessage(code) {
  const messages = {
    "auth/invalid-email": "Invalid email address",
    "auth/user-not-found": "No account with this email",
    "auth/wrong-password": "Incorrect password",
    "auth/invalid-credential": "Incorrect password",
    "auth/too-many-requests": "Too many attempts. Try again later",
    "auth/network-request-failed": "Network error. Check your connection",
    "auth/user-disabled": "This account has been suspended.",
  };
  return messages[code] || "Could not sign in";
}
