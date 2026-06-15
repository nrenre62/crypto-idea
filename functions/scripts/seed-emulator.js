// Dev-only: seed the EMULATOR with an admin account + a few test users (with real
// portfolios & coins) so the admin dashboard shows real combined usage + averages.
// NEVER run against production.  Run (with emulators up):
//   node functions/scripts/seed-emulator.js
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";

const admin = require("firebase-admin");
admin.initializeApp({ projectId: "demo-crypto-idea" });
const auth = admin.auth();
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

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
async function makeUser(email, password, tier, portfolios, isAdmin) {
  let u;
  try { u = await auth.getUserByEmail(email); }
  catch { u = await auth.createUser({ email, password, displayName: email.split("@")[0] }); }
  if (isAdmin) await auth.setCustomUserClaims(u.uid, { admin: true });

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
  await makeUser("admin@test.com",  "test1234", "free", [2],    true);   // 1 portfolio, 2 coins
  await makeUser("admin2@test.com", "test1234", "free", [],     true);   // backup admin (no data)
  await makeUser("free@test.com",   "test1234", "free", [3],    false);  // 1 portfolio, 3 coins
  await makeUser("pro@test.com",    "test1234", "pro",  [6, 4], false);  // 2 portfolios, 10 coins
  console.log("Seeded the emulator:");
  console.log("  ADMIN  -> admin@test.com  / test1234   (can open the admin panel)");
  console.log("  ADMIN  -> admin2@test.com / test1234   (backup admin)");
  console.log("  user   -> free@test.com   / test1234");
  console.log("  user   -> pro@test.com    / test1234");
  console.log("Expected: 4 users (3 free, 1 pro) | 4 portfolios | 15 coins | avg 1.0 portfolios & 3.8 coins/user.");
  process.exit(0);
})();
