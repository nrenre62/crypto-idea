/**
 * Data-layer integration tests.
 * Runs the REAL firebase-auth.js + firebase-database.js code against the
 * Auth + Firestore emulators, so it verifies the app's writes satisfy the rules
 * (registration, counter maintenance, and tier-limit enforcement) end to end.
 *
 * Run with:  npm run test:integration
 */
import test from "node:test";
import assert from "node:assert";
import { auth, db } from "../src/firebase.config.js";
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { registerUser } from "../src/firebase-auth.js";
import {
  getPortfolios, createPortfolio, getCoins,
  addCoin, addTransaction, deleteTransaction,
} from "../src/firebase-database.js";

// Point the SDK at the local emulators (DEV auto-connect only happens under Vite).
connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
connectFirestoreEmulator(db, "127.0.0.1", 8080);

const email = `tester_${Date.now()}@example.com`;
const pass = "Aa1!aaaa";
let uid;

test("register creates the user + default portfolio (counters seeded)", async () => {
  const res = await registerUser(email, pass, "Tester");
  assert.ok(res.success, "register should succeed: " + JSON.stringify(res));
  uid = res.user.uid;

  const ports = await getPortfolios(uid);
  assert.ok(ports.success);
  assert.equal(ports.portfolios.length, 1, "should have exactly the default portfolio");
  assert.equal(ports.portfolios[0].id, "default");
});

test("free tier: a 2nd portfolio is rejected by the rules", async () => {
  const res = await createPortfolio(uid, "Second", 1);
  assert.equal(res.success, false, "free tier must not allow a 2nd portfolio");
});

test("free tier: coins allowed up to 10, then rejected", async () => {
  for (let i = 0; i < 10; i++) {
    const r = await addCoin(uid, "default", { id: "coin" + i, symbol: "C" + i, name: "Coin " + i });
    assert.ok(r.success, `coin ${i} should add: ${JSON.stringify(r)}`);
  }
  const r11 = await addCoin(uid, "default", { id: "coin10", symbol: "C10", name: "Coin 10" });
  assert.equal(r11.success, false, "the 11th coin should be rejected on free tier");
});

test("transactions: add then delete, and they round-trip via getCoins", async () => {
  const add = await addTransaction(uid, "default", "coin0", {
    type: "buy", amount: 1, priceAtBuy: 100, date: "2024-01-01T00:00",
  });
  assert.ok(add.success, "add transaction should succeed: " + JSON.stringify(add));

  const coins = await getCoins(uid, "default");
  const coin0 = coins.coins.find((c) => c.id === "coin0");
  assert.equal(coin0.entries.length, 1, "coin0 should have 1 transaction");

  const del = await deleteTransaction(uid, "default", "coin0", add.id);
  assert.ok(del.success, "delete transaction should succeed");
});
