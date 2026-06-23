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
import { auth, db } from "../src/api/firebase.config.js";
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { registerUser } from "../src/api/firebase-auth.js";
import {
  getPortfolios, createPortfolio, getCoins,
  addCoin, addTransaction, deleteTransaction, getUserProfile, updateCoinJournal,
  getLearnProgress, saveLearnProgress,
} from "../src/api/firebase-database.js";

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

test("getUserProfile reads the server-authoritative profile (tier) for the user", async () => {
  // F-1 guard: the client must be able to read tier from Firestore, not just local cache.
  const prof = await getUserProfile(uid);
  assert.ok(prof.success, "profile should exist after registration: " + JSON.stringify(prof));
  assert.equal(prof.tier, "free", "registered user starts on the free tier");
  assert.equal(prof.email, email);

  const missing = await getUserProfile("no-such-uid");
  assert.equal(missing.success, false, "a missing profile returns success:false");
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

test("coin journal: write a thesis and a review decision, read both back via getCoins", async () => {
  const j = { thesis: "active devs", changeMyMind: "devs quit", status: "intact", priceAtAdd: 50000, createdAt: "2026-01-01T00:00:00.000Z" };
  const upd = await updateCoinJournal(uid, "default", "coin0", j);
  assert.ok(upd.success, "journal write should succeed: " + JSON.stringify(upd));

  const coins = await getCoins(uid, "default");
  const coin0 = coins.coins.find((c) => c.id === "coin0");
  assert.equal(coin0.journal.thesis, "active devs");
  assert.equal(coin0.journal.status, "intact");

  // The "is your thesis still intact?" review decision updates the status in place.
  const upd2 = await updateCoinJournal(uid, "default", "coin0", { ...j, status: "challenged" });
  assert.ok(upd2.success);
  const coins2 = await getCoins(uid, "default");
  assert.equal(coins2.coins.find((c) => c.id === "coin0").journal.status, "challenged");
});

test("learn progress: defaults when empty, then saves + reads back via the data layer (#23)", async () => {
  // Fresh learner: no progress doc yet → zeroed default, not an error.
  const fresh = await getLearnProgress(uid);
  assert.ok(fresh.success, "empty progress should read as a zeroed default: " + JSON.stringify(fresh));
  assert.equal(fresh.xp, 0);
  assert.deepEqual(fresh.completedLessons, []);

  const saved = await saveLearnProgress(uid, {
    xp: 250, streak: 4, lastActivity: "2026-06-23", completedLessons: ["m1-l1", "m1-l2", "m2-l1"],
  });
  assert.ok(saved.success, "save should satisfy the rule: " + JSON.stringify(saved));

  const got = await getLearnProgress(uid);
  assert.ok(got.success);
  assert.equal(got.xp, 250);
  assert.equal(got.streak, 4);
  assert.deepEqual(got.completedLessons, ["m1-l1", "m1-l2", "m2-l1"]);
  assert.ok(got.updatedAt, "updatedAt should be stamped by saveLearnProgress");
});
