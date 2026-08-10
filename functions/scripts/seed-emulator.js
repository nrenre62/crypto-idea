// Dev-only: seed the EMULATOR with an admin account + a few test users (with real
// portfolios & coins) so the admin dashboard shows real combined usage + averages.
// NEVER run against production.
//
// Preferred (persists across restarts): `npm run seed` — brings up the auth +
//   firestore emulators, runs this script, and EXPORTS the result to the
//   git-ignored ./emulator-data, which `npm run start:all` then re-imports. So you
//   seed once per machine, not once per restart. Run it with the stack stopped.
// Direct (against an already-running stack): `node functions/scripts/seed-emulator.js`
//   — seeds the live `start:all` emulators; start:all exports them on exit.
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";

const admin = require("firebase-admin");
// Modular subpath accessors — firebase-admin v13+ removed the namespaced admin.auth()/
// admin.firestore()/admin.firestore.FieldValue forms from the root export. These resolve on both v12 and v14.
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
admin.initializeApp({ projectId: "demo-crypto-idea" });
const auth = getAuth();
const db = getFirestore();
const now = FieldValue.serverTimestamp();

// Pool of real coins so seeded portfolios render like real data in the app.
// Field shape MUST match what the app writes (see api/firebase-database.js addCoin).
const COIN_POOL = [
  { id: "bitcoin",      symbol: "BTC",   name: "Bitcoin" },
  { id: "ethereum",     symbol: "ETH",   name: "Ethereum" },
  { id: "solana",       symbol: "SOL",   name: "Solana" },
  { id: "cardano",      symbol: "ADA",   name: "Cardano" },
  { id: "polkadot",     symbol: "DOT",   name: "Polkadot" },
  { id: "chainlink",    symbol: "LINK",  name: "Chainlink" },
  { id: "avalanche-2",  symbol: "AVAX",  name: "Avalanche" },
  { id: "ripple",       symbol: "XRP",   name: "XRP" },
  { id: "dogecoin",     symbol: "DOGE",  name: "Dogecoin" },
  { id: "litecoin",     symbol: "LTC",   name: "Litecoin" },
];

// portfolios: array of coin-counts, e.g. [6, 4] = two portfolios with 6 and 4 coins.
// role (ADMIN-SEC): "owner" | "manager" | null.
//   CRYP-103b dropped the "legacy" role-less admin seed — the no-role admin state is now
//   refused the manager surface at the auth choke point (guards.requireManager), so seeding
//   one only modelled a state the app no longer supports. Fail-closed behaviour is proven at
//   the unit tier (tests/unit/guards.test.js). Every seeded admin has an explicit role.
async function makeUser(email, password, tier, portfolios, role) {
  let u;
  try { u = await auth.getUserByEmail(email); }
  catch { u = await auth.createUser({ email, password, displayName: email.split("@")[0] }); }
  if (role) await auth.setCustomUserClaims(u.uid, { admin: true, role });

  const userRef = db.collection("users").doc(u.uid);
  await userRef.set({ email, name: email.split("@")[0], tier, joined: now, portfolioCount: portfolios.length }, { merge: true });

  for (let i = 0; i < portfolios.length; i++) {
    const coinCount = portfolios[i];
    const pRef = userRef.collection("portfolios").doc(`p${i + 1}`);
    // `order` + `created` MUST match the app's schema: getPortfolios() queries
    // orderBy("order"), and Firestore drops any doc missing that field.
    await pRef.set({ name: `Portfolio ${i + 1}`, order: i, created: now, coinCount });
    for (let j = 0; j < coinCount; j++) {
      const coin = COIN_POOL[j % COIN_POOL.length];
      await pRef.collection("coins").doc(coin.id).set({
        symbol: coin.symbol, name: coin.name, thumb: "", addedAt: now, txCount: 0
      });
    }
  }
}

(async () => {
  await makeUser("admin@test.com",   "test1234", "free", [2],    "owner");    // 1 portfolio, 2 coins
  await makeUser("admin2@test.com",  "test1234", "free", [],     "owner");    // backup owner (no data)
  await makeUser("manager@test.com", "test1234", "free", [],     "manager");  // ADMIN-SEC: accounts-only admin
  await makeUser("free@test.com",    "test1234", "free", [3],    null);       // 1 portfolio, 3 coins
  await makeUser("pro@test.com",     "test1234", "pro",  [6, 4], null);       // 2 portfolios, 10 coins
  console.log("Seeded the emulator:");
  console.log("  OWNER   -> admin@test.com   / test1234  (full panel incl. Settings + Admin access)");
  console.log("  OWNER   -> admin2@test.com  / test1234  (backup owner)");
  console.log("  MANAGER -> manager@test.com / test1234  (accounts only — no Settings, no grants)");
  console.log("  user    -> free@test.com    / test1234");
  console.log("  user    -> pro@test.com     / test1234");
  // Admins (3) are excluded from the app's user-count surfaces (CRYP-103a); the 2 non-admin
  // users are what the Overview/Users list shows.
  console.log("Expected: 5 accounts (2 owners, 1 manager, 2 users) | 4 portfolios | 15 coins.");
  process.exit(0);
})();
