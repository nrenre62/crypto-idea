/**
 * LOCKOUT ESCAPE HATCH — clear the ADMIN-6 Settings password.
 * ==========================================================
 * The Settings screen (API keys, plans, admin access) is guarded by a SECOND password
 * (ADMIN-6). If every owner forgets it AND the emailed reset is unavailable, this
 * service-account script deletes the stored record so Settings reverts to its bootstrap
 * control — a login re-auth (assertSettingsUnlocked falls back to requireFreshAuth when
 * config/app.settingsAuth is absent). It clears ONLY the settings-auth record; every
 * other config value (keys, plans, flags) is left untouched.
 *
 * This is the deliberate counterpart to the risk PR1 introduces: swapping the Settings
 * gate from a login step-up to the Settings-password unlock means a forgotten password
 * could otherwise wall an owner out of the very screen that recovers the app. This script
 * — like set-admin.js for the owner claim — is the out-of-band recovery path.
 *
 * SETUP (one time, same as set-admin.js):
 *   1. Firebase Console → Project Settings → Service accounts → "Generate new private
 *      key". Save the JSON OUTSIDE the repo (never commit it).
 *   2. Point Google credentials at it:
 *        export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
 *
 * RUN:
 *   cd functions
 *   node scripts/clear-settings-password.js            # show whether one is set
 *   node scripts/clear-settings-password.js --clear    # delete the Settings password
 *
 * After --clear, any owner can open Settings with a fresh login re-auth and set a new
 * Settings password from the panel. Refresh tokens are NOT touched (this is config, not
 * a claim change). Audited? No — the Admin SDK write bypasses the callables; note in your
 * runbook that a manual clear happened.
 */

const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { applicationDefault } = require("firebase-admin/app");

const args = process.argv.slice(2);
const doClear = args.includes("--clear");

admin.initializeApp({ credential: applicationDefault() });
const db = getFirestore();

(async () => {
  try {
    const ref = db.doc("config/app");
    const snap = await ref.get();
    const cfg = (snap.exists && snap.data()) || {};
    const rec = cfg.settingsAuth || null;
    const isSet = !!(rec && rec.hash);

    if (!doClear) {
      console.log(`Settings password: ${isSet ? "SET" : "not set"}` + (isSet && rec.updatedAt ? ` (last changed ${new Date(rec.updatedAt).toISOString()})` : ""));
      console.log("Re-run with --clear to delete it (reverts Settings to a login re-auth).");
      process.exit(0);
    }

    if (!isSet) {
      console.log("No Settings password is set — nothing to clear.");
      process.exit(0);
    }

    // FieldValue.delete() removes just this key; merge:true leaves the rest of config/app
    // intact. (A plain set without merge would wipe every other config value.)
    await ref.set({ settingsAuth: admin.firestore.FieldValue.delete() }, { merge: true });
    console.log("Settings password cleared. Settings now falls back to a login re-auth;");
    console.log("an owner can set a new one from the panel's Settings → Settings password.");
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
  }
})();
