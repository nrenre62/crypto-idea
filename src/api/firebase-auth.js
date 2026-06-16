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
  sendEmailVerification
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, writeBatch, increment } from "firebase/firestore";
import { auth, db } from "./firebase.config.js";


// ─── Register New User ───
// Creates auth account + user profile in Firestore
export async function registerUser(email, password, name) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Set display name
    await updateProfile(user, { displayName: name });

    // Send a verification email (anti-abuse + confirms a real inbox).
    // Non-fatal: a transient email error must not break account creation.
    try { await sendEmailVerification(user); } catch (e) { /* ignore */ }

    // Create user profile in Firestore (portfolioCount starts at 0)
    await setDoc(doc(db, "users", user.uid), {
      email: email,
      name: name,
      tier: "free",           // "free" or "pro"
      joined: serverTimestamp(),
      lastLogin: serverTimestamp(),
      portfolioCount: 0,
      settings: {
        currency: "usd",
        theme: "light"
      }
    });

    // Create the default portfolio in a batch that bumps portfolioCount to 1,
    // so it satisfies the counter-based tier-limit rule.
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
    "auth/weak-password": "Password must be at least 6 characters",
    "auth/user-not-found": "No account with this email",
    "auth/wrong-password": "Incorrect password",
    "auth/too-many-requests": "Too many attempts. Try again later",
    "auth/network-request-failed": "Network error. Check your connection",
  };
  return messages[code] || "Something went wrong. Try again.";
}
