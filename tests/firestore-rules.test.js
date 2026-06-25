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
// Follow whatever port the emulator actually bound. `firebase emulators:exec` sets
// FIRESTORE_EMULATOR_HOST for the child process, so this adapts when the default 8080
// is busy (e.g. a full `start:all` is already running) and the suite is pointed at an
// isolated emulator on another port. Falls back to the standard 8080.
const [EMU_HOST, EMU_PORT] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080").split(":");
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: EMU_HOST,
      port: Number(EMU_PORT),
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
const carolDb = () => testEnv.authenticatedContext("carol").firestore();
const adminDb = () => testEnv.authenticatedContext("zadmin", { admin: true }).firestore();

test("a user can read their own profile, a stranger cannot", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 0 });
  });
  await assertSucceeds(getDoc(doc(aliceDb(), "users", "alice")));
  await assertFails(getDoc(doc(bobDb(), "users", "alice")));
});

test("creating your profile requires free tier + zero portfolioCount + a valid name", async () => {
  await assertSucceeds(
    setDoc(doc(aliceDb(), "users", "alice"), { name: "Alice", tier: "free", portfolioCount: 0 })
  );
  // Wrong uid
  await assertFails(
    setDoc(doc(aliceDb(), "users", "someone-else"), { name: "Alice", tier: "free", portfolioCount: 0 })
  );
  // Trying to start as pro
  await assertFails(
    setDoc(doc(bobDb(), "users", "bob"), { name: "Bob", tier: "pro", portfolioCount: 0 })
  );
  // Missing name -> rejected by validUserData (no nameless accounts)
  await assertFails(
    setDoc(doc(carolDb(), "users", "carol"), { tier: "free", portfolioCount: 0 })
  );
  // Too-short name (< 2 chars) -> rejected
  await assertFails(
    setDoc(doc(carolDb(), "users", "carol"), { name: "A", tier: "free", portfolioCount: 0 })
  );
});

test("a user cannot promote their own tier, but an admin can", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 0 });
  });
  await assertFails(updateDoc(doc(aliceDb(), "users", "alice"), { tier: "pro" }));
  await assertSucceeds(updateDoc(doc(adminDb(), "users", "alice"), { tier: "pro" }));
});

test("a user cannot set the soft-delete fields (server-only); an admin can", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 0 });
  });
  // Soft-delete + restore happen via Admin-SDK callables only — the owner must not
  // be able to trash or un-trash their own doc directly.
  await assertFails(updateDoc(doc(aliceDb(), "users", "alice"), { deleted: true, deletedAt: 1 }));
  await assertSucceeds(updateDoc(doc(adminDb(), "users", "alice"), { deleted: true, deletedAt: 1 }));
});

test("user profile shape on create: validUserData / validConsent / validSettings (U1)", async () => {
  const goodConsent = {
    termsVersion: "2026-06-24", termsAcceptedAt: "2026-06-24T10:00:00.000Z",
    privacyVersion: "2026-06-24", privacyAcceptedAt: "2026-06-24T10:00:00.000Z",
  };
  const goodSettings = {
    theme: "dark", currency: "usd", emailDigest: false,
    emailMarketing: true, consentAnalytics: false, updatedAt: "2026-06-24T10:00:00.000Z",
  };
  // A full, valid signup doc (name + consent record + settings map) is accepted.
  await assertSucceeds(
    setDoc(doc(aliceDb(), "users", "alice"),
      { name: "Ada Lovelace", email: "ada@example.com", tier: "free", portfolioCount: 0, consent: goodConsent, settings: goodSettings })
  );
  // Oversized name (> 50) -> rejected by validUserData
  await assertFails(
    setDoc(doc(bobDb(), "users", "bob"), { name: "x".repeat(51), tier: "free", portfolioCount: 0 })
  );
  // Unknown key inside settings -> rejected (hasOnly closes the shape)
  await assertFails(
    setDoc(doc(bobDb(), "users", "bob"), { name: "Bob", tier: "free", portfolioCount: 0, settings: { ...goodSettings, hacker: true } })
  );
  // Bad theme enum -> rejected
  await assertFails(
    setDoc(doc(bobDb(), "users", "bob"), { name: "Bob", tier: "free", portfolioCount: 0, settings: { ...goodSettings, theme: "neon" } })
  );
  // Non-bool notification toggle -> rejected
  await assertFails(
    setDoc(doc(bobDb(), "users", "bob"), { name: "Bob", tier: "free", portfolioCount: 0, settings: { ...goodSettings, emailDigest: "yes" } })
  );
  // Unknown key inside consent -> rejected (hasOnly)
  await assertFails(
    setDoc(doc(bobDb(), "users", "bob"), { name: "Bob", tier: "free", portfolioCount: 0, consent: { ...goodConsent, extra: "x" } })
  );
});

test("user profile update: owner edits name/settings within shape, never premiumLimits (U1)", async () => {
  const goodSettings = {
    theme: "light", currency: "usd", emailDigest: false,
    emailMarketing: false, consentAnalytics: false, updatedAt: "2026-06-24T10:00:00.000Z",
  };
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"),
      { name: "Ada", tier: "free", portfolioCount: 0, settings: goodSettings });
  });
  const db = aliceDb();
  // Auto-saving a valid settings change (e.g. toggling dark mode) is allowed.
  await assertSucceeds(updateDoc(doc(db, "users", "alice"),
    { settings: { ...goodSettings, theme: "dark", updatedAt: "2026-06-25T00:00:00.000Z" } }));
  // Editing the display name within bounds is allowed.
  await assertSucceeds(updateDoc(doc(db, "users", "alice"), { name: "Ada L." }));
  // Oversized name on update -> rejected.
  await assertFails(updateDoc(doc(db, "users", "alice"), { name: "x".repeat(51) }));
  // Settings with an unknown key on update -> rejected.
  await assertFails(updateDoc(doc(db, "users", "alice"), { settings: { ...goodSettings, hacker: true } }));
  // Owner CANNOT write the admin-only premiumLimits override (S8, server-authoritative).
  await assertFails(updateDoc(doc(db, "users", "alice"), { premiumLimits: { coins: 99999 } }));
  // An admin CAN set premiumLimits.
  await assertSucceeds(updateDoc(doc(adminDb(), "users", "alice"), { premiumLimits: { coins: 800 } }));
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

test("configured limits override the defaults (admin raises free to 2 portfolios)", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "config", "app"), { plans: { free: { portfolios: 2 } } });
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 1 });
  });
  const db = aliceDb();
  // 2nd portfolio: count 1 -> 2, within the CONFIGURED free limit of 2 -> allowed
  const b1 = writeBatch(db);
  b1.set(doc(db, "users", "alice", "portfolios", "p2"), { name: "Two", coinCount: 0 });
  b1.update(doc(db, "users", "alice"), { portfolioCount: increment(1) });
  await assertSucceeds(b1.commit());
  // 3rd portfolio: count 2 -> 3, exceeds the configured limit of 2 -> rejected
  const b2 = writeBatch(db);
  b2.set(doc(db, "users", "alice", "portfolios", "p3"), { name: "Three", coinCount: 0 });
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
  await assertSucceeds(b.commit()); // count 1 -> 2, within pro limit of 3
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

test("coin create enforces symbol/name length bounds", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 1 });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1"), { name: "P", coinCount: 0 });
  });
  const db = aliceDb();
  // Valid coin: coinCount 0 -> 1
  const ok = writeBatch(db);
  ok.set(doc(db, "users", "alice", "portfolios", "p1", "coins", "btc"), { symbol: "BTC", name: "Bitcoin", txCount: 0 });
  ok.update(doc(db, "users", "alice", "portfolios", "p1"), { coinCount: increment(1) });
  await assertSucceeds(ok.commit());
  // Oversized name (>64 chars) -> rejected by validCoinData, even though the counter math is valid
  const bad = writeBatch(db);
  bad.set(doc(db, "users", "alice", "portfolios", "p1", "coins", "eth"), { symbol: "ETH", name: "E".repeat(100), txCount: 0 });
  bad.update(doc(db, "users", "alice", "portfolios", "p1"), { coinCount: increment(1) });
  await assertFails(bad.commit());
});

test("pro tier allows 50 coins per portfolio, then rejects (new 0a-core default)", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "bob"), { tier: "pro", portfolioCount: 1 });
    // Seed the counter just below the pro ceiling (avoids creating 49 real coins).
    await setDoc(doc(db, "users", "bob", "portfolios", "p1"), { name: "P", coinCount: 49 });
  });
  const db = bobDb();
  // 49 -> 50: at the pro coins limit -> allowed
  const ok = writeBatch(db);
  ok.set(doc(db, "users", "bob", "portfolios", "p1", "coins", "c50"), { symbol: "AAA", name: "Coin A", txCount: 0 });
  ok.update(doc(db, "users", "bob", "portfolios", "p1"), { coinCount: increment(1) });
  await assertSucceeds(ok.commit());
  // 50 -> 51: exceeds the pro limit of 50 -> rejected
  const over = writeBatch(db);
  over.set(doc(db, "users", "bob", "portfolios", "p1", "coins", "c51"), { symbol: "BBB", name: "Coin B", txCount: 0 });
  over.update(doc(db, "users", "bob", "portfolios", "p1"), { coinCount: increment(1) });
  await assertFails(over.commit());
});

test("premium coins are hard-clamped at 1,000 even when config sets a higher number (#20 trap 1)", async () => {
  await seed(async (db) => {
    // A tampered / over-generous config tries to lift the ceiling above 1,000.
    await setDoc(doc(db, "config", "app"), { plans: { premium: { coins: 5000 } } });
    await setDoc(doc(db, "users", "carol"), { tier: "premium", portfolioCount: 1 });
    await setDoc(doc(db, "users", "carol", "portfolios", "p1"), { name: "P", coinCount: 999 });
  });
  const db = carolDb();
  // 999 -> 1000: at the 1,000 hard clamp -> allowed
  const ok = writeBatch(db);
  ok.set(doc(db, "users", "carol", "portfolios", "p1", "coins", "c1000"), { symbol: "AAA", name: "Coin A", txCount: 0 });
  ok.update(doc(db, "users", "carol", "portfolios", "p1"), { coinCount: increment(1) });
  await assertSucceeds(ok.commit());
  // 1000 -> 1001: config says 5,000, but the rule clamps to 1,000 -> rejected.
  // A finite *default* is not a ceiling — this proves the literal min(config, 1000).
  const over = writeBatch(db);
  over.set(doc(db, "users", "carol", "portfolios", "p1", "coins", "c1001"), { symbol: "BBB", name: "Coin B", txCount: 0 });
  over.update(doc(db, "users", "carol", "portfolios", "p1"), { coinCount: increment(1) });
  await assertFails(over.commit());
});

test("premium per-user premiumLimits override is enforced (U11/S8)", async () => {
  await seed(async (db) => {
    // Admin-set per-user override LOWERS this premium user's coin cap to 3 (tier
    // default is 1,000). The owner can't write premiumLimits (covered elsewhere).
    await setDoc(doc(db, "users", "carol"), { tier: "premium", portfolioCount: 1, premiumLimits: { coins: 3 } });
    await setDoc(doc(db, "users", "carol", "portfolios", "p1"), { name: "P", coinCount: 2 });
  });
  const db = carolDb();
  // 2 -> 3: at the per-user override -> allowed
  const ok = writeBatch(db);
  ok.set(doc(db, "users", "carol", "portfolios", "p1", "coins", "c3"), { symbol: "AAA", name: "Coin A", txCount: 0 });
  ok.update(doc(db, "users", "carol", "portfolios", "p1"), { coinCount: increment(1) });
  await assertSucceeds(ok.commit());
  // 3 -> 4: exceeds the override of 3 -> rejected (even though the tier default is 1,000)
  const over = writeBatch(db);
  over.set(doc(db, "users", "carol", "portfolios", "p1", "coins", "c4"), { symbol: "BBB", name: "Coin B", txCount: 0 });
  over.update(doc(db, "users", "carol", "portfolios", "p1"), { coinCount: increment(1) });
  await assertFails(over.commit());
});

test("premium premiumLimits override is still hard-clamped to 1,000 coins (U11/#20)", async () => {
  await seed(async (db) => {
    // A tampered/over-generous override tries to lift coins above the 1,000 ceiling.
    await setDoc(doc(db, "users", "carol"), { tier: "premium", portfolioCount: 1, premiumLimits: { coins: 5000 } });
    await setDoc(doc(db, "users", "carol", "portfolios", "p1"), { name: "P", coinCount: 999 });
  });
  const db = carolDb();
  // 999 -> 1000: at the hard clamp -> allowed
  const ok = writeBatch(db);
  ok.set(doc(db, "users", "carol", "portfolios", "p1", "coins", "c1000"), { symbol: "AAA", name: "Coin A", txCount: 0 });
  ok.update(doc(db, "users", "carol", "portfolios", "p1"), { coinCount: increment(1) });
  await assertSucceeds(ok.commit());
  // 1000 -> 1001: override says 5,000 but the rule clamps to 1,000 -> rejected
  const over = writeBatch(db);
  over.set(doc(db, "users", "carol", "portfolios", "p1", "coins", "c1001"), { symbol: "BBB", name: "Coin B", txCount: 0 });
  over.update(doc(db, "users", "carol", "portfolios", "p1"), { coinCount: increment(1) });
  await assertFails(over.commit());
});

test("coin journal: valid thesis accepted, owner can update status, bad data + strangers rejected", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 1 });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1"), { name: "P", coinCount: 0 });
  });
  const db = aliceDb();
  const goodJournal = { thesis: "active devs", changeMyMind: "devs quit", status: "intact", priceAtAdd: 50000, createdAt: "2026-01-01T00:00:00.000Z" };

  // Coin created WITH a valid journal (coinCount 0 -> 1)
  const ok = writeBatch(db);
  ok.set(doc(db, "users", "alice", "portfolios", "p1", "coins", "btc"), { symbol: "BTC", name: "Bitcoin", txCount: 0, journal: goodJournal });
  ok.update(doc(db, "users", "alice", "portfolios", "p1"), { coinCount: increment(1) });
  await assertSucceeds(ok.commit());

  // Owner can update the journal status (the "is your thesis still intact?" decision)
  await assertSucceeds(updateDoc(doc(db, "users", "alice", "portfolios", "p1", "coins", "btc"), { journal: { ...goodJournal, status: "challenged" } }));

  // Oversized thesis (>2000 chars) -> rejected by validJournal
  const bad = writeBatch(db);
  bad.set(doc(db, "users", "alice", "portfolios", "p1", "coins", "eth"), { symbol: "ETH", name: "Ethereum", txCount: 0, journal: { ...goodJournal, thesis: "x".repeat(2001) } });
  bad.update(doc(db, "users", "alice", "portfolios", "p1"), { coinCount: increment(1) });
  await assertFails(bad.commit());

  // Invalid status enum -> rejected
  const badStatus = writeBatch(db);
  badStatus.set(doc(db, "users", "alice", "portfolios", "p1", "coins", "sol"), { symbol: "SOL", name: "Solana", txCount: 0, journal: { ...goodJournal, status: "bogus" } });
  badStatus.update(doc(db, "users", "alice", "portfolios", "p1"), { coinCount: increment(1) });
  await assertFails(badStatus.commit());

  // A stranger cannot write Alice's coin journal
  await assertFails(updateDoc(doc(bobDb(), "users", "alice", "portfolios", "p1", "coins", "btc"), { journal: goodJournal }));
});

test("coin journal funnel (#27): valid funnel accepted, no-funnel still valid, oversized/unknown-key/non-string rejected", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 1 });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1"), { name: "P", coinCount: 0 });
  });
  const db = aliceDb();
  const base = { thesis: "active devs", changeMyMind: "devs quit", status: "intact", priceAtAdd: 50000, createdAt: "2026-01-01T00:00:00.000Z" };
  const coin = doc(db, "users", "alice", "portfolios", "p1", "coins", "btc");

  // Backward-compat: a journal with NO funnel key still validates (coinCount 0 -> 1)
  const create = writeBatch(db);
  create.set(coin, { symbol: "BTC", name: "Bitcoin", txCount: 0, journal: base });
  create.update(doc(db, "users", "alice", "portfolios", "p1"), { coinCount: increment(1) });
  await assertSucceeds(create.commit());

  // A full funnel (all three optional findings) is accepted
  await assertSucceeds(updateDoc(coin, { journal: { ...base, funnel: { dilution: "40% unlocks", volume: "thin book", yield: "real fees" } } }));

  // A partial funnel (only one finding) is accepted
  await assertSucceeds(updateDoc(coin, { journal: { ...base, funnel: { dilution: "unlock cliff" } } }));

  // Oversized funnel field (>2000 chars) -> rejected
  await assertFails(updateDoc(coin, { journal: { ...base, funnel: { dilution: "x".repeat(2001) } } }));

  // Unknown key inside funnel -> rejected (hasOnly)
  await assertFails(updateDoc(coin, { journal: { ...base, funnel: { bogus: "nope" } } }));

  // Non-string funnel field -> rejected
  await assertFails(updateDoc(coin, { journal: { ...base, funnel: { dilution: 123 } } }));

  // Unknown TOP-LEVEL journal key -> rejected (validJournal hasOnly; no smuggling junk into the journal)
  await assertFails(updateDoc(coin, { journal: { ...base, smuggled: "junk" } }));
});

test("transaction create enforces amount/price/date bounds", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 1 });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1"), { name: "P", coinCount: 1 });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1", "coins", "btc"), { symbol: "BTC", name: "Bitcoin", txCount: 0 });
  });
  const db = aliceDb();
  // Valid transaction: txCount 0 -> 1
  const ok = writeBatch(db);
  ok.set(doc(db, "users", "alice", "portfolios", "p1", "coins", "btc", "transactions", "t1"), { type: "buy", amount: 1.5, priceAtBuy: 40000, date: "2024-01-15T10:00" });
  ok.update(doc(db, "users", "alice", "portfolios", "p1", "coins", "btc"), { txCount: increment(1) });
  await assertSucceeds(ok.commit());
  // Absurd amount (> 1e15) -> rejected by validTransactionData
  const bad = writeBatch(db);
  bad.set(doc(db, "users", "alice", "portfolios", "p1", "coins", "btc", "transactions", "t2"), { type: "buy", amount: 1e308, priceAtBuy: 1, date: "2024-01-15T10:00" });
  bad.update(doc(db, "users", "alice", "portfolios", "p1", "coins", "btc"), { txCount: increment(1) });
  await assertFails(bad.commit());
});

test("learn progress: owner reads/writes a valid doc; strangers + malformed are rejected (#23)", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 0 });
    await setDoc(doc(db, "users", "bob"), { tier: "free", portfolioCount: 0 });
  });
  const good = { xp: 120, streak: 3, lastActivity: "2026-06-23", completedLessons: ["m1-l1", "m1-l2"], updatedAt: "2026-06-23T00:00:00.000Z" };
  const ref = (db) => doc(db, "users", "alice", "learn", "progress");

  // Owner can write + read their own progress.
  await assertSucceeds(setDoc(ref(aliceDb()), good));
  await assertSucceeds(getDoc(ref(aliceDb())));

  // A stranger can neither read nor write it.
  await assertFails(getDoc(ref(bobDb())));
  await assertFails(setDoc(ref(bobDb()), good));

  // Malformed docs are rejected: out of range, wrong type, non-list, and unknown keys.
  await assertFails(setDoc(ref(aliceDb()), { ...good, xp: -1 }));
  await assertFails(setDoc(ref(aliceDb()), { ...good, xp: "lots" }));
  await assertFails(setDoc(ref(aliceDb()), { ...good, completedLessons: "nope" }));
  await assertFails(setDoc(ref(aliceDb()), { ...good, hacker: true }));
});
