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
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
export default app;
