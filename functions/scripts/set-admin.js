/**
 * Bootstrap the FIRST admin — sets the { admin: true } custom claim on a user.
 * =============================================================================
 * Use this once to create your first admin. After that, an existing admin can
 * grant/revoke admin to others through the setAdminClaim Cloud Function.
 *
 * SETUP (one time):
 * 1. Firebase Console → Project Settings → Service accounts → "Generate new
 *    private key". Save the JSON file somewhere OUTSIDE the repo (never commit it).
 * 2. Point Google credentials at it (PowerShell):
 *      $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\serviceAccountKey.json"
 * 3. Make sure the target user has already registered in the app (so the account
 *    exists in Firebase Auth).
 *
 * RUN:
 *   cd functions
 *   node scripts/set-admin.js you@example.com           # grant admin
 *   node scripts/set-admin.js you@example.com --revoke  # revoke admin
 *
 * The user must sign out and back in (or refresh their ID token) for the new
 * claim to take effect.
 */

const admin = require("firebase-admin");

const email = process.argv[2];
const revoke = process.argv.includes("--revoke");

if (!email) {
  console.error("Usage: node scripts/set-admin.js <email> [--revoke]");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });

(async () => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: !revoke });
    console.log(`${revoke ? "Revoked" : "Granted"} admin for ${email} (uid: ${user.uid}).`);
    console.log("The user must re-login (or refresh their token) for it to apply.");
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
  }
})();
