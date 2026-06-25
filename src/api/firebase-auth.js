/**
 * Crypto Idea - Authentication Module
 * =====================================
 * Handles: Register, Login, Logout, Password Reset, Auth State
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  verifyBeforeUpdateEmail
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, writeBatch, increment } from "firebase/firestore";
import { auth, db } from "./firebase.config.js";

// Version stamp stored on the consent record (USER-CREATION.md C1). Bump this when the
// Terms/Privacy documents change so a re-acceptance can be required.
export const CONSENT_VERSION = "2026-06-24";

// Server-side (defense-in-depth) input checks — the client form is advisory, a crafted
// request must still pass here. Mirror the client rules (name 2–30 letters/spaces).
const NAME_RE = /^[A-Za-z\s]{2,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


// ─── Register New User ───
// Creates the Firebase Auth account + the Firestore profile (with a validated consent
// record + closed settings map) + the default portfolio. `consent` (optional) is
// { termsVersion, privacyVersion, marketing } captured at signup.
//
// NOTE on atomicity: the counter rule for the first portfolio needs the parent user
// doc to ALREADY exist (getAfter(portfolioCount) == get(portfolioCount)+1), and
// Firestore forbids two writes to the same doc in one batch — so a single all-in-one
// batch is impossible. The rules-compatible equivalent is a sequenced two-write create:
// (1) profile with portfolioCount:0, then (2) a batch that creates the default
// portfolio and increments the counter to 1. If (2) fails the user simply has no
// portfolio yet (recoverable on next load), never a corrupt half-state.
export async function registerUser(email, password, name, consent = null) {
  const cleanName = (name || "").trim();
  const cleanEmail = (email || "").toLowerCase().trim();
  if (!NAME_RE.test(cleanName)) return { success: false, error: "Name: letters only, 2-30 characters" };
  if (!EMAIL_RE.test(cleanEmail)) return { success: false, error: "Enter a valid email address" };

  try {
    const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = result.user;

    // Set display name
    await updateProfile(user, { displayName: cleanName });

    // Send a verification email (anti-abuse + confirms a real inbox).
    // Non-fatal: a transient email error must not break account creation.
    try { await sendEmailVerification(user); } catch (e) { /* ignore */ }

    const now = new Date().toISOString();
    // Marketing is a WITHDRAWABLE consent, so it lives in the settings map (where the
    // Privacy tab can flip it) and doubles as the signup opt-in (GDPR Art. 7(3)).
    const settings = {
      theme: "light",
      currency: "usd",
      emailDigest: false,
      emailMarketing: !!(consent && consent.marketing),
      consentAnalytics: false,
      updatedAt: now,
    };
    // Mandatory acceptances (Terms + Privacy) are a RECORD with version + timestamp.
    const consentRecord = consent && consent.termsVersion ? {
      termsVersion: String(consent.termsVersion).slice(0, 20),
      termsAcceptedAt: now,
      privacyVersion: String(consent.privacyVersion || consent.termsVersion).slice(0, 20),
      privacyAcceptedAt: now,
    } : null;

    // (1) Profile doc — must exist (portfolioCount:0) before the first portfolio create.
    await setDoc(doc(db, "users", user.uid), {
      email: cleanEmail,
      name: cleanName,
      tier: "free",           // free (UI label "Starter") · pro · premium — internal key is always "free"
      joined: serverTimestamp(),
      lastLogin: serverTimestamp(),
      portfolioCount: 0,
      settings,
      ...(consentRecord ? { consent: consentRecord } : {}),
    });

    // (2) Default portfolio + counter bump to 1, satisfying the counter-based tier rule.
    const batch = writeBatch(db);
    batch.set(doc(db, "users", user.uid, "portfolios", "default"), {
      name: "My Portfolio",
      created: serverTimestamp(),
      order: 0,
      coinCount: 0
    });
    batch.update(doc(db, "users", user.uid), { portfolioCount: increment(1) });
    await batch.commit();

    return { success: true, user };
  } catch (error) {
    return { success: false, error: getErrorMessage(error.code) };
  }
}


// ─── Update preferences (auto-save) ───
// Persists a PARTIAL change to the user's closed settings map. merge:true deep-merges
// into the existing map (so other prefs survive); the rules validate the full result
// via validSettings. Stamps updatedAt. Used by the Notifications/Privacy toggles.
export async function updateUserSettings(uid, partial) {
  try {
    await setDoc(
      doc(db, "users", uid),
      { settings: { ...partial, updatedAt: new Date().toISOString() } },
      { merge: true }
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error.code) };
  }
}


// ─── Resend the verification email ───
// Backs the "Verify your email — Resend" banner (USER-CREATION.md §5). Never blocks
// the app; gating of sensitive ops on email_verified lives in the rules/callables.
export async function verifyEmail() {
  try {
    if (!auth.currentUser) return { success: false, error: "Not signed in" };
    await sendEmailVerification(auth.currentUser);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error.code) };
  }
}


// ─── Password policy (one source of truth) ───
// Pure client-side check used by registration AND change-password so the rule (and
// its messages) can't drift between the two. Returns the first failing message, or
// null when the password is acceptable. The server floor is Firebase / Identity
// Platform (go-live); this is the UX layer.
export function passwordError(pw) {
  if (!pw || pw.length < 8) return "Password must be at least 8 characters";
  if (pw.length > 50) return "Password is too long";
  if (!/[A-Z]/.test(pw)) return "Password needs at least 1 uppercase letter (A-Z)";
  if (!/[a-z]/.test(pw)) return "Password needs at least 1 lowercase letter (a-z)";
  if (!/[0-9]/.test(pw)) return "Password needs at least 1 number (0-9)";
  if (!/[!@#$%^&*()_+\-={}|;:,.<>?]/.test(pw)) return "Password needs at least 1 special character (!@#$%...)";
  return null;
}


// ─── Change password (in-app, behind re-auth) ───
// confirmPassword(old) re-proves identity, then updatePassword sets the new one.
// Firebase auto-revokes other sessions on a password change (free sign-out-everywhere).
export async function changePassword(currentPassword, newPassword) {
  const pe = passwordError(newPassword);
  if (pe) return { success: false, error: pe };
  try {
    await confirmPassword(currentPassword);
    await updatePassword(auth.currentUser, newPassword);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error.code) };
  }
}


// ─── Edit display name ───
// Updates the Auth displayName AND mirrors it to the Firestore profile (the rules
// validate the name shape on update). Returns the cleaned name on success.
export async function updateDisplayName(name) {
  const clean = (name || "").trim();
  if (!NAME_RE.test(clean)) return { success: false, error: "Name: letters only, 2-30 characters" };
  try {
    const u = auth.currentUser;
    if (!u) return { success: false, error: "Not signed in" };
    await updateProfile(u, { displayName: clean });
    await setDoc(doc(db, "users", u.uid), { name: clean }, { merge: true });
    return { success: true, name: clean };
  } catch (error) {
    return { success: false, error: getErrorMessage(error.code) };
  }
}


// ─── Change email (behind re-auth, verify-before-update) ───
// Re-auth, then send a confirmation link to the NEW address. The email swaps in Auth
// only after that link is clicked — never optimistically. We do NOT use updateEmail
// (deprecated under email-enumeration protection, default-on since 2023-09-15). The
// app reads the email from Auth, so the new address shows after the user confirms.
export async function changeEmail(currentPassword, newEmail) {
  const clean = (newEmail || "").toLowerCase().trim();
  if (!EMAIL_RE.test(clean)) return { success: false, error: "Enter a valid email address" };
  try {
    await confirmPassword(currentPassword);   // throws on wrong pw / stale session
    const url = (typeof window !== "undefined" && window.location ? window.location.origin : "") + "/app";
    await verifyBeforeUpdateEmail(auth.currentUser, clean, { url });
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error.code) };
  }
}


// ─── Re-authentication (the security core) ───
// Firebase throws `auth/requires-recent-login` for sensitive ops (change email/
// password, delete account). One shared helper re-proves the password just before
// those ops; callers catch a throw and re-prompt instead of failing silently.
// Throws on wrong password or a stale session — never returns false.
export async function confirmPassword(currentPassword) {
  const u = auth.currentUser;
  if (!u || !u.email) throw new Error("Not signed in");
  const cred = EmailAuthProvider.credential(u.email, currentPassword);
  await reauthenticateWithCredential(u, cred);
}


// ─── Login ───
export async function loginUser(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);

    // Update last login
    await setDoc(doc(db, "users", result.user.uid), {
      lastLogin: serverTimestamp()
    }, { merge: true });

    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: getErrorMessage(error.code) };
  }
}


// ─── Logout ───
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// ─── Password Reset ───
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: getErrorMessage(error.code) };
  }
}


// ─── Listen to Auth State ───
// Call this once on app startup
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
}


// ─── Error Message Helper ───
function getErrorMessage(code) {
  const messages = {
    "auth/email-already-in-use": "Email already registered",
    "auth/invalid-email": "Invalid email address",
    "auth/weak-password": "Password must be at least 8 characters",
    "auth/user-not-found": "No account with this email",
    "auth/wrong-password": "Incorrect password",
    "auth/too-many-requests": "Too many attempts. Try again later",
    "auth/network-request-failed": "Network error. Check your connection",
    "auth/requires-recent-login": "Please sign in again, then retry.",
    "auth/invalid-credential": "Incorrect password",
  };
  return messages[code] || "Something went wrong. Try again.";
}
