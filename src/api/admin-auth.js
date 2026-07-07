/**
 * Crypto Idea — Admin auth helpers (bound to the SEPARATE admin app)
 * ==================================================================
 * Mirror the three auth helpers the admin app needs, but bound to `adminAuth`
 * (the named "admin" Firebase instance) instead of the shared default app. This
 * is what keeps the admin session isolated from the user app (R31-1). The admin
 * dashboard's data access goes through `api/admin.js`, whose callables run on the
 * admin app's Functions instance and carry the admin's own token.
 */
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
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
