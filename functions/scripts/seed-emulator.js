// Dev-only: seed the EMULATOR with an admin account + a few test users so the
// admin dashboard shows real combined usage. NEVER run against production.
// Run (with the emulators up):  node functions/scripts/seed-emulator.js
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";

const admin = require("firebase-admin");
admin.initializeApp({ projectId: "demo-crypto-idea" });
const auth = admin.auth();
const db = admin.firestore();

async function makeUser(email, password, tier, portfolioCount, isAdmin) {
  let u;
  try { u = await auth.getUserByEmail(email); }
  catch { u = await auth.createUser({ email, password, displayName: email.split("@")[0] }); }
  if (isAdmin) await auth.setCustomUserClaims(u.uid, { admin: true });
  await db.collection("users").doc(u.uid).set({
    email,
    name: email.split("@")[0],
    tier,
    joined: admin.firestore.FieldValue.serverTimestamp(),
    portfolioCount,
  }, { merge: true });
}

(async () => {
  await makeUser("admin@test.com", "test1234", "free", 1, true);   // the admin
  await makeUser("free@test.com",  "test1234", "free", 1, false);
  await makeUser("pro@test.com",   "test1234", "pro",  4, false);
  console.log("Seeded the emulator:");
  console.log("  ADMIN  -> admin@test.com / test1234   (can open the admin panel)");
  console.log("  user   -> free@test.com  / test1234");
  console.log("  user   -> pro@test.com   / test1234");
  console.log("Expected combined stats: 3 users (2 free, 1 pro), 6 portfolios.");
  process.exit(0);
})();
