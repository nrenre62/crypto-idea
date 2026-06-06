/**
 * Crypto Idea - Firebase Backend
 * ================================
 * 
 * SETUP INSTRUCTIONS:
 * 
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project called "crypto-idea"
 * 3. Enable Authentication → Email/Password
 * 4. Enable Cloud Firestore → Start in production mode
 * 5. Copy your config from Project Settings → Web App
 * 6. Replace the firebaseConfig below with your values
 * 7. Install: npm install firebase
 * 
 * COST: $0 on free Spark plan (covers ~50,000 daily users)
 * - Auth: 10,000 logins/month free
 * - Firestore: 50,000 reads, 20,000 writes/day free
 * - Hosting: 10 GB storage, 360 MB/day transfer free
 */

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// ═══════════════════════════════════════════
// REPLACE WITH YOUR FIREBASE CONFIG
// Get this from Firebase Console → Project Settings → Web App
// ═══════════════════════════════════════════
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "crypto-idea.firebaseapp.com",
  projectId: "crypto-idea",
  storageBucket: "crypto-idea.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// In local development, talk to the Firebase emulators instead of real services.
// Start them first with:  npm run emulators   (Auth on 9099, Firestore on 8080)
// This lets you run the whole app locally without a real Firebase project.
if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    console.info("[firebase] Using local emulators (Auth :9099, Firestore :8080)");
  } catch (e) {
    console.warn("[firebase] Could not connect to emulators:", e);
  }
}

export default app;
