/**
 * Crypto Idea - Firebase setup
 * ================================
 * Production config is read from environment variables (see .env.example).
 * Copy .env.example to .env and fill in your values from:
 *   Firebase Console -> Project Settings -> Your apps -> Web app (SDK config)
 *
 * In local dev (`npm run dev`) the app ignores the real config and talks to the
 * local emulators instead, so you can develop without touching production.
 *
 * NOTE: the Firebase web config (apiKey etc.) is NOT a secret — it ships in the
 * client bundle by design. Security comes from the Firestore rules, not from
 * hiding these values. We keep them in .env mainly for tidiness/per-environment.
 */
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Vite injects import.meta.env from .env at build time; it's undefined under Node.
const env = (typeof import.meta !== "undefined" && import.meta.env) || {};
const isDev = env.DEV === true;

const realConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Throwaway config used by the emulators (dev + tests). Never hits production.
const demoConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-crypto-idea.firebaseapp.com",
  projectId: "demo-crypto-idea",
  storageBucket: "demo-crypto-idea.appspot.com",
  messagingSenderId: "000000000000",
  appId: "demo-app-id",
};

// Use the real project only for production builds that actually have a config.
const useReal = !isDev && !!realConfig.apiKey;
if (!useReal && !isDev) {
  console.warn("[firebase] No VITE_FIREBASE_* env vars — using demo config. Create .env for production.");
}

// The resolved config + dev flag are exported so the SEPARATE admin app
// (firebase.admin.config.js) can spin up its OWN named Firebase instance from the
// same values — a distinct Auth persistence namespace, so the admin tab can never
// see or sign out the user app's session (R31-1 / ERRORS §A5). Single source of truth.
export const firebaseConfig = useReal ? realConfig : demoConfig;
export { isDev };
export const recaptchaKey = env.VITE_RECAPTCHA_SITE_KEY;

const app = initializeApp(firebaseConfig);

// App Check (bot/abuse protection for Auth, Firestore, and callable Functions).
// Enable in production by setting VITE_RECAPTCHA_SITE_KEY (reCAPTCHA v3 site key
// from the Firebase Console → App Check), then turn on enforcement there.
if (!isDev && recaptchaKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn("[firebase] App Check init failed:", e);
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Local development -> use the emulators (start them with `npm run emulators`).
if (isDev) {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    console.info("[firebase] Using local emulators (Auth :9099, Firestore :8080, Functions :5001)");
  } catch (e) {
    console.warn("[firebase] Could not connect to emulators:", e);
  }
}

export default app;
