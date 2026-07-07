/**
 * Crypto Idea — Admin Firebase instance (SEPARATE named app)
 * ==========================================================
 * The admin dashboard (admin.html / admin-main.jsx) is served on the SAME ORIGIN
 * as the user app. Firebase web Auth persists the signed-in user under a storage
 * key derived from (apiKey + app name); the DEFAULT app is shared across every tab
 * on the origin. So if the admin tab used the default app, signing in/out there —
 * or its "you're not an admin, sign out" guard — would clobber the user app's own
 * session in another tab. That was the single mechanism behind ERRORS §A5 (empty
 * "Welcome,", the plan popup flipping full-screen after ~1 min, the un-suspend
 * logout loop, and the ~1-min logout after an upgrade).
 *
 * The fix (R31-1): give the admin app its OWN named Firebase instance
 * (`initializeApp(config, "admin")`) → a separate Auth persistence namespace. The
 * admin session and the user session are now fully independent; nothing the admin
 * tab does can end the user's session. Reuses the SAME resolved config as the user
 * app (one source of truth in firebase.config.js) — a different app NAME, not a
 * different project.
 */
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { firebaseConfig, isDev, recaptchaKey } from "./firebase.config.js";

// Named instance — the name is what carves out the separate Auth persistence.
const adminApp = initializeApp(firebaseConfig, "admin");

// App Check parity with the user app (prod-only, same reCAPTCHA site key).
if (!isDev && recaptchaKey) {
  try {
    initializeAppCheck(adminApp, {
      provider: new ReCaptchaV3Provider(recaptchaKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) {
    console.warn("[firebase:admin] App Check init failed:", e);
  }
}

export const adminAuth = getAuth(adminApp);
export const adminFunctions = getFunctions(adminApp);

// Local dev → the same emulators as the user app (admin reads data only through
// callables, so no Firestore instance is needed here).
if (isDev) {
  try {
    connectAuthEmulator(adminAuth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFunctionsEmulator(adminFunctions, "127.0.0.1", 5001);
    console.info("[firebase:admin] Using local emulators (Auth :9099, Functions :5001)");
  } catch (e) {
    console.warn("[firebase:admin] Could not connect to emulators:", e);
  }
}

export default adminApp;
