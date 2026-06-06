/**
 * Firestore security-rules tests.
 * Run with:  npm run test:rules   (starts the Firestore emulator automatically)
 *
 * Verifies: ownership isolation, the "can't change your own tier" rule,
 * admin custom-claim access, and the counter-based tier limits.
 */
import test, { before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, writeBatch, increment } from "firebase/firestore";

const PROJECT_ID = "demo-crypto-idea";
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// Seed data bypassing the rules (for arranging test state).
async function seed(fn) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await fn(ctx.firestore());
  });
}

const aliceDb = () => testEnv.authenticatedContext("alice").firestore();
const bobDb = () => testEnv.authenticatedContext("bob").firestore();
const adminDb = () => testEnv.authenticatedContext("zadmin", { admin: true }).firestore();

test("a user can read their own profile, a stranger cannot", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 0 });
  });
  await assertSucceeds(getDoc(doc(aliceDb(), "users", "alice")));
  await assertFails(getDoc(doc(bobDb(), "users", "alice")));
});

test("creating your profile requires free tier + zero portfolioCount", async () => {
  await assertSucceeds(
    setDoc(doc(aliceDb(), "users", "alice"), { tier: "free", portfolioCount: 0 })
  );
  // Wrong uid
  await assertFails(
    setDoc(doc(aliceDb(), "users", "someone-else"), { tier: "free", portfolioCount: 0 })
  );
  // Trying to start as pro
  await assertFails(
    setDoc(doc(bobDb(), "users", "bob"), { tier: "pro", portfolioCount: 0 })
  );
});

test("a user cannot promote their own tier, but an admin can", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 0 });
  });
  await assertFails(updateDoc(doc(aliceDb(), "users", "alice"), { tier: "pro" }));
  await assertSucceeds(updateDoc(doc(adminDb(), "users", "alice"), { tier: "pro" }));
});

test("an admin (custom claim) can read another user's profile", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 0 });
  });
  await assertSucceeds(getDoc(doc(adminDb(), "users", "alice")));
});

test("free tier allows exactly 1 portfolio (counter-enforced)", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 0 });
  });
  const db = aliceDb();

  // First portfolio: count 0 -> 1, within free limit of 1
  const b1 = writeBatch(db);
  b1.set(doc(db, "users", "alice", "portfolios", "p1"), { name: "One", coinCount: 0 });
  b1.update(doc(db, "users", "alice"), { portfolioCount: increment(1) });
  await assertSucceeds(b1.commit());

  // Second portfolio: count 1 -> 2, exceeds free limit -> rejected
  const b2 = writeBatch(db);
  b2.set(doc(db, "users", "alice", "portfolios", "p2"), { name: "Two", coinCount: 0 });
  b2.update(doc(db, "users", "alice"), { portfolioCount: increment(1) });
  await assertFails(b2.commit());
});

test("pro tier allows a 2nd portfolio where free would fail", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "bob"), { tier: "pro", portfolioCount: 1 });
  });
  const db = bobDb();
  const b = writeBatch(db);
  b.set(doc(db, "users", "bob", "portfolios", "p2"), { name: "Two", coinCount: 0 });
  b.update(doc(db, "users", "bob"), { portfolioCount: increment(1) });
  await assertSucceeds(b.commit()); // count 1 -> 2, within pro limit of 10
});

test("creating a portfolio WITHOUT bumping the counter is rejected", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 0 });
  });
  // No counter increment -> getAfter(count) != get(count)+1 -> rejected
  await assertFails(
    setDoc(doc(aliceDb(), "users", "alice", "portfolios", "p1"), { name: "Sneaky", coinCount: 0 })
  );
});
