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
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, writeBatch, increment, serverTimestamp } from "firebase/firestore";

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
// ADMIN-SEC: admin is no longer one flat claim. The blanket write/delete over user
// documents is OWNER-only; managers (and pre-ADMIN-SEC role-less admins) keep read
// access for the panel but must fail closed on writes.
const adminDb = () => testEnv.authenticatedContext("zadmin", { admin: true, role: "owner" }).firestore();
const managerDb = () => testEnv.authenticatedContext("zmanager", { admin: true, role: "manager" }).firestore();
const legacyAdminDb = () => testEnv.authenticatedContext("zlegacy", { admin: true }).firestore();

// BL-1a/BL-1b: the guard + webhook-idempotency collections are SERVER-ONLY
// (Admin SDK bypasses rules; there is no match block, so clients hit the
// platform default-deny — this test pins that no future rule opens them).
test("rateLimits and webhookEvents are unreadable and unwritable by clients", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "rateLimits", "alice__createSub__cooldown"), { lastAt: 1 });
    await setDoc(doc(db, "webhookEvents", "WH-1"), { at: 1 });
  });
  await assertFails(getDoc(doc(aliceDb(), "rateLimits", "alice__createSub__cooldown")));
  await assertFails(setDoc(doc(aliceDb(), "rateLimits", "alice__createSub__cooldown"), { lastAt: 0 }));
  await assertFails(getDoc(doc(aliceDb(), "webhookEvents", "WH-1")));
  await assertFails(setDoc(doc(aliceDb(), "webhookEvents", "WH-2"), { at: 2 }));
});

// ADMIN-4: the daily growth series is server-only. It is aggregate data with no
// personal content, but it is kept FOREVER and the panel presents it as the record
// of what actually happened — a client-writable series could be poisoned to fake
// growth (or to erase a bad month), permanently. Even an admin claim gets nothing
// here: the panel reads it through the listDailyStats callable.
test("statsDaily is unreadable and unwritable by clients — including admins", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "statsDaily", "2026-07-24"), { date: "2026-07-24", paidUsers: 3, netRevenue: 30 });
  });
  await assertFails(getDoc(doc(aliceDb(), "statsDaily", "2026-07-24")));
  await assertFails(setDoc(doc(aliceDb(), "statsDaily", "2026-07-24"), { paidUsers: 999 }));
  await assertFails(setDoc(doc(aliceDb(), "statsDaily", "2026-07-25"), { paidUsers: 999 }));
  await assertFails(deleteDoc(doc(aliceDb(), "statsDaily", "2026-07-24")));
  // The blanket admin-owner write over user docs must NOT reach this collection.
  await assertFails(getDoc(doc(adminDb(), "statsDaily", "2026-07-24")));
  await assertFails(setDoc(doc(adminDb(), "statsDaily", "2026-07-24"), { paidUsers: 999 }));
});

// ADMIN-2: the cron heartbeats are server-only, and the reason is INTEGRITY rather
// than confidentiality. The status strip's entire job is to reveal a scheduler that
// silently stopped firing; a client that could stamp a heartbeat could keep a dead
// cron looking alive forever — turning the one control that catches silent failure
// into the thing that hides it. Read via the getSystemStatus callable.
test("health/jobs is unreadable and unwritable by clients — including admins", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "health", "jobs"), { captureDailyStats: { at: 1_700_000_000_000 } });
  });
  await assertFails(getDoc(doc(aliceDb(), "health", "jobs")));
  await assertFails(setDoc(doc(aliceDb(), "health", "jobs"), { captureDailyStats: { at: 9_999_999_999_999 } }));
  await assertFails(deleteDoc(doc(aliceDb(), "health", "jobs")));
  await assertFails(getDoc(doc(adminDb(), "health", "jobs")));
  await assertFails(setDoc(doc(adminDb(), "health", "jobs"), { captureDailyStats: { at: 9_999_999_999_999 } }));
});

// ADMIN-5: private admin notes are server-only. A note is written ABOUT a user, by
// staff, and can hold sensitive support context — so no client may read or write it,
// not even the subject (Alice reading her own note) and not even an admin from the
// browser (that path must go through the getUserNote/saveUserNote callables, which
// re-check the claim). Mirrors audit/statsDaily/health.
test("adminNotes is unreadable and unwritable by clients — including admins and the subject", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "adminNotes", "alice"), { note: "VIP", updatedAt: 1_700_000_000_000 });
  });
  // the subject can't read the note about themselves, nor write one
  await assertFails(getDoc(doc(aliceDb(), "adminNotes", "alice")));
  await assertFails(setDoc(doc(aliceDb(), "adminNotes", "alice"), { note: "haxx" }));
  await assertFails(setDoc(doc(aliceDb(), "adminNotes", "bob"), { note: "haxx" }));
  await assertFails(deleteDoc(doc(aliceDb(), "adminNotes", "alice")));
  // an admin's browser token can't touch it directly either
  await assertFails(getDoc(doc(adminDb(), "adminNotes", "alice")));
  await assertFails(setDoc(doc(adminDb(), "adminNotes", "alice"), { note: "via devtools" }));
});

// ADMIN-4: `joined` is the signup date shown in the admin Users list and the users
// CSV export, and it is immutable after create — so an unvalidated create was a
// one-shot chance to claim any signup date, permanently. (This is also why growth
// metrics count signups from the Auth record's creationTime instead.)
test("a user cannot forge their own 'joined' signup date at create", async () => {
  const backdated = new Date("2020-01-01T00:00:00Z");
  await assertFails(setDoc(doc(aliceDb(), "users", "alice"),
    { name: "Alice", tier: "free", portfolioCount: 0, joined: backdated }));
  // A future date is refused too — not just a backdated one.
  await assertFails(setDoc(doc(bobDb(), "users", "bob"),
    { name: "Bob", tier: "free", portfolioCount: 0, joined: new Date(Date.now() + 86400000) }));
  // What registerUser actually sends (serverTimestamp() === request.time) succeeds.
  await assertSucceeds(setDoc(doc(carolDb(), "users", "carol"),
    { name: "Carol", tier: "free", portfolioCount: 0, joined: serverTimestamp() }));
});

// BL-1 review fix: the billing fields the SERVER now trusts are owner-immutable.
// An owner clearing `subscription.cancelled` would dodge the period-end sweep
// (paid tier forever, no payments); an owner writing a victim's paypalSubscriptionId
// + a fake tierBeforeFailure would get PAYMENT.SALE.COMPLETED to grant that tier.
test("server-trusted billing fields are owner-immutable (update AND create)", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "premium", portfolioCount: 0,
      subscription: { cancelled: true, downgradeTo: "free", endDate: "2026-08-01" } });
  });
  await assertFails(updateDoc(doc(aliceDb(), "users", "alice"), { subscription: { cancelled: false } }));
  await assertFails(updateDoc(doc(aliceDb(), "users", "alice"), { tierBeforeFailure: "premium" }));
  await assertFails(updateDoc(doc(aliceDb(), "users", "alice"), { paypalSubscriptionId: "I-VICTIM" }));
  await assertFails(updateDoc(doc(aliceDb(), "users", "alice"), { billingCycle: "yearly" }));
  // ...and can't be pre-seeded at signup either
  await assertFails(setDoc(doc(bobDb(), "users", "bob"),
    { name: "Bob", tier: "free", portfolioCount: 0, tierBeforeFailure: "premium", paypalSubscriptionId: "I-VICTIM" }));
  await assertFails(setDoc(doc(carolDb(), "users", "carol"),
    { name: "Carol", tier: "free", portfolioCount: 0, subscription: { cancelled: false } }));
  // a clean signup still works, and the admin/server path is untouched
  await assertSucceeds(setDoc(doc(bobDb(), "users", "bob"), { name: "Bob", tier: "free", portfolioCount: 0 }));
  await assertSucceeds(updateDoc(doc(adminDb(), "users", "alice"), { billingCycle: "yearly" }));
});

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

test("API-SECURITY (counter-forge): an owner cannot DECREMENT a tier counter (only keep it or +1)", async () => {
  // A standalone client decrement (no accompanying child delete) forged a lower count to slip
  // past the tier cap, then created again — unbounded. counterNoForge forbids ANY client
  // decrease; the count is brought down only by the trusted reconcileMyCounters callable.
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { name: "Alice", tier: "free", portfolioCount: 1, planChosen: true });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1"), { name: "P1", coinCount: 5 });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1", "coins", "c1"), { symbol: "BTC", name: "Bitcoin", txCount: 3 });
  });
  // Decrementing ANY of the three counters is denied — this was the paywall bypass.
  await assertFails(updateDoc(doc(aliceDb(), "users", "alice"), { portfolioCount: 0 }));
  await assertFails(updateDoc(doc(aliceDb(), "users", "alice", "portfolios", "p1"), { coinCount: 4 }));
  await assertFails(updateDoc(doc(aliceDb(), "users", "alice", "portfolios", "p1", "coins", "c1"), { txCount: 2 }));
  // Keeping a counter the same (e.g. a rename / journal edit that touches the doc) is still fine.
  await assertSucceeds(updateDoc(doc(aliceDb(), "users", "alice"), { portfolioCount: 1 }));
  await assertSucceeds(updateDoc(doc(aliceDb(), "users", "alice", "portfolios", "p1"), { name: "P1b", coinCount: 5 }));
  // An admin (Admin-SDK path in prod) can still correct a counter down.
  await assertSucceeds(updateDoc(doc(adminDb(), "users", "alice"), { portfolioCount: 0 }));
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
  // ONBOARD-GATE: planChosen is NO LONGER a settings field — it's a server-only TOP-LEVEL
  // field that GATES all app data, so a client can't write it either in settings (unknown
  // key → hasOnly rejects) OR at the top level (server-authoritative). Both are denied.
  await assertFails(updateDoc(doc(db, "users", "alice"),
    { settings: { ...goodSettings, planChosen: true, updatedAt: "2026-07-07T00:00:00.000Z" } }));
  await assertFails(updateDoc(doc(db, "users", "alice"), { planChosen: true }));
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
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 0, planChosen: true });
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
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 1, planChosen: true });
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

test("pro tier caps at 3 portfolios; premium goes beyond (Round 17 — the real maximum)", async () => {
  // Pro at the cap (3) — a 4th is rejected; a premium user at 3 CAN add a 4th. This is
  // the cap the Round 17 dev tier-persist unlocks: once the DB tier is pro/premium (set
  // via the Admin SDK, exactly like devSetMyTier), the rule grants the real maximum.
  await seed(async (db) => {
    await setDoc(doc(db, "users", "bob"), { tier: "pro", portfolioCount: 3 });
    await setDoc(doc(db, "users", "carol"), { tier: "premium", portfolioCount: 3 });
  });
  // Pro: count 3 -> 4 exceeds the pro limit of 3 -> rejected.
  const pdb = bobDb();
  const pb = writeBatch(pdb);
  pb.set(doc(pdb, "users", "bob", "portfolios", "p4"), { name: "Four", coinCount: 0 });
  pb.update(doc(pdb, "users", "bob"), { portfolioCount: increment(1) });
  await assertFails(pb.commit());
  // Premium: count 3 -> 4 is within the premium limit of 15 -> allowed.
  const cdb = carolDb();
  const cb = writeBatch(cdb);
  cb.set(doc(cdb, "users", "carol", "portfolios", "p4"), { name: "Four", coinCount: 0 });
  cb.update(doc(cdb, "users", "carol"), { portfolioCount: increment(1) });
  await assertSucceeds(cb.commit());
});

test("owner can rename a portfolio; a >50-char name is rejected; a stranger is denied (R19-2)", async () => {
  // Rename is a name-only update (coinCount untouched), so the EXISTING portfolio update
  // rule already allows it: validPortfolioData bounds name 1–50 and counterDeltaOk passes
  // on a 0 coinCount delta. This test proves that — R19-2 needs NO rules change.
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 1, planChosen: true });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1"), { name: "One", coinCount: 0 });
  });
  const ref = doc(aliceDb(), "users", "alice", "portfolios", "p1");
  await assertSucceeds(updateDoc(ref, { name: "Renamed" }));           // owner, in-bounds
  await assertFails(updateDoc(ref, { name: "x".repeat(51) }));         // > 50 chars -> rejected
  await assertFails(updateDoc(doc(bobDb(), "users", "alice", "portfolios", "p1"), { name: "Hacked" })); // stranger
  // R32: a custom coin order is an optional, size-bounded list on the portfolio doc.
  await assertSucceeds(updateDoc(ref, { coinOrder: ["btc", "eth", "sol"] }));    // accepted
  await assertFails(updateDoc(ref, { coinOrder: Array.from({ length: 1001 }, (_, i) => "c" + i) })); // >1000 rejected
});

test("creating a portfolio WITHOUT bumping the counter is rejected", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 0, planChosen: true });
  });
  // No counter increment -> getAfter(count) != get(count)+1 -> rejected
  await assertFails(
    setDoc(doc(aliceDb(), "users", "alice", "portfolios", "p1"), { name: "Sneaky", coinCount: 0 })
  );
});

test("coin create enforces symbol/name length bounds", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 1, planChosen: true });
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
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 1, planChosen: true });
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
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 1, planChosen: true });
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
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 1, planChosen: true });
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
    await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 0, planChosen: true });
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

// ═══════════════════════════════════════════════════════════════════════════
// ISO-2 · Isolation regression suite — the living PROOF of ISOLATION.md §1.
// If any of these ever passes, per-user or admin isolation has regressed.
// ═══════════════════════════════════════════════════════════════════════════

test("ISO-2: user A cannot get / list / write / delete ANY of user B's subtree", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "bob"), { tier: "free", portfolioCount: 1 });
    await setDoc(doc(db, "users", "bob", "portfolios", "p1"), { name: "Bob P", coinCount: 1 });
    await setDoc(doc(db, "users", "bob", "portfolios", "p1", "coins", "btc"), { symbol: "BTC", name: "Bitcoin", txCount: 1 });
    await setDoc(doc(db, "users", "bob", "portfolios", "p1", "coins", "btc", "transactions", "t1"),
      { type: "buy", amount: 1, priceAtBuy: 100, date: "2026-01-01T00:00" });
    await setDoc(doc(db, "users", "bob", "learn", "progress"),
      { xp: 10, streak: 1, lastActivity: "2026-01-01", completedLessons: [], updatedAt: "2026-01-01T00:00:00.000Z" });
  });
  const a = aliceDb();
  // GET — no doc in B's subtree is readable by A (user doc, portfolio, coin, tx, learn).
  await assertFails(getDoc(doc(a, "users", "bob")));
  await assertFails(getDoc(doc(a, "users", "bob", "portfolios", "p1")));
  await assertFails(getDoc(doc(a, "users", "bob", "portfolios", "p1", "coins", "btc")));
  await assertFails(getDoc(doc(a, "users", "bob", "portfolios", "p1", "coins", "btc", "transactions", "t1")));
  await assertFails(getDoc(doc(a, "users", "bob", "learn", "progress")));
  // LIST — no account enumeration (/users) and no traversal into B's collections.
  await assertFails(getDocs(collection(a, "users")));
  await assertFails(getDocs(collection(a, "users", "bob", "portfolios")));
  await assertFails(getDocs(collection(a, "users", "bob", "portfolios", "p1", "coins")));
  // WRITE / DELETE — A cannot mutate or remove anything in B's subtree.
  await assertFails(setDoc(doc(a, "users", "bob"), { tier: "free", portfolioCount: 1 }, { merge: true }));
  await assertFails(updateDoc(doc(a, "users", "bob", "portfolios", "p1"), { name: "Hacked" }));
  await assertFails(setDoc(doc(a, "users", "bob", "portfolios", "p1", "coins", "eth"), { symbol: "ETH", name: "Ethereum", txCount: 0 }));
  await assertFails(deleteDoc(doc(a, "users", "bob", "portfolios", "p1", "coins", "btc")));
});

test("ISO-2: no user doc can grant itself admin/isAdmin/role (closed-shape blocks it)", async () => {
  // On CREATE — an owner-created doc carrying a privilege field is rejected by hasOnly,
  // even though isOwner(uid) passes. This is the structural fix behind the secure-by-design
  // "a new field is privileged-by-default" lesson (G1).
  await assertFails(setDoc(doc(aliceDb(), "users", "alice"), { name: "Alice", tier: "free", portfolioCount: 0, admin: true }));
  await assertFails(setDoc(doc(bobDb(), "users", "bob"), { name: "Bob", tier: "free", portfolioCount: 0, isAdmin: true }));
  await assertFails(setDoc(doc(carolDb(), "users", "carol"), { name: "Carol", tier: "free", portfolioCount: 0, role: "admin" }));
  // On UPDATE — same, adding an unknown/privileged key to your own doc is rejected.
  await seed(async (db) => { await setDoc(doc(db, "users", "alice"), { tier: "free", portfolioCount: 0 }); });
  await assertFails(updateDoc(doc(aliceDb(), "users", "alice"), { admin: true }));
  await assertFails(updateDoc(doc(aliceDb(), "users", "alice"), { isAdmin: true }));
  await assertFails(updateDoc(doc(aliceDb(), "users", "alice"), { role: "admin" }));
});

test("ISO-2: clients (and an admin's browser) can't read config / audit / cache", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "config", "app"), { plans: {} });
    await setDoc(doc(db, "audit", "a1"), { action: "x" });
    await setDoc(doc(db, "cache", "universe"), { coins: [] });
  });
  const a = aliceDb();
  await assertFails(getDoc(doc(a, "config", "app")));
  await assertFails(getDoc(doc(a, "audit", "a1")));
  await assertFails(getDoc(doc(a, "cache", "universe")));              // shared PUBLIC data, but proxy-written only
  await assertFails(setDoc(doc(a, "cache", "universe"), { coins: [1] }));
  // Admin power is an Admin-SDK thing — even an admin's BROWSER token can't read these.
  await assertFails(getDoc(doc(adminDb(), "config", "app")));
  await assertFails(getDoc(doc(adminDb(), "audit", "a1")));
  await assertFails(getDoc(doc(adminDb(), "cache", "universe")));
});

test("ADMIN-0: the audit log is closed to clients for WRITES too, not just reads", async () => {
  // ISO-2 above proves nobody can READ the log. This is the other half: nobody can
  // forge, alter or erase an entry either. It matters because the log is what an
  // incident is reconstructed from — a reader-only wall would still let anyone with
  // a browser token write a plausible entry, or delete the one that incriminates them.
  //
  // Note what this does NOT prove: rules never apply to the Admin SDK, so this says
  // nothing about server code. That side is held by the single-writer choke point in
  // tests/unit/admin-0-guards.test.js. See the comment on /audit in firestore.rules.
  await seed(async (db) => { await setDoc(doc(db, "audit", "a1"), { action: "setUserTier", actorUid: "admin1" }); });
  for (const db of [aliceDb(), adminDb(), managerDb()]) {
    await assertFails(setDoc(doc(db, "audit", "forged"), { action: "nothing happened" }));
    await assertFails(updateDoc(doc(db, "audit", "a1"), { action: "sanitised" }));
    await assertFails(deleteDoc(doc(db, "audit", "a1")));
  }
});

/* ===========================================================================
 * ADMIN-SEC — the manager wall at the RULES layer
 * ===========================================================================
 * The callables refuse a manager for Settings, grants and permanent erasure. But a
 * manager's browser token still carries admin:true, so without an owner-aware rule
 * they could skip the callables entirely and write Firestore directly from devtools.
 * These tests are the proof that the wall is real and not merely UI-deep.
 */
test("ADMIN-SEC: a manager can READ user docs (the panel needs it)", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { email: "a@x.com", tier: "free" });
  });
  await assertSucceeds(getDoc(doc(managerDb(), "users", "alice")));
  await assertSucceeds(getDoc(doc(legacyAdminDb(), "users", "alice")));
});

test("ADMIN-SEC: a manager CANNOT write a user doc directly (no callable bypass)", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { email: "a@x.com", tier: "free" });
  });
  // The exact escalations the callable layer refuses — they must also fail here.
  await assertFails(updateDoc(doc(managerDb(), "users", "alice"), { tier: "premium" }));
  await assertFails(updateDoc(doc(managerDb(), "users", "alice"), { deleted: true, deletedAt: 1 }));
  await assertFails(updateDoc(doc(managerDb(), "users", "alice"), { premiumLimits: { coins: 999 } }));
  await assertFails(updateDoc(doc(managerDb(), "users", "alice"), { subscription: { cancelled: false } }));
});

test("ADMIN-SEC: a manager CANNOT hard-delete a user doc", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { email: "a@x.com", tier: "free" });
  });
  await assertFails(deleteDoc(doc(managerDb(), "users", "alice")));
  await assertSucceeds(deleteDoc(doc(adminDb(), "users", "alice")));   // owner still can
});

test("ADMIN-SEC: a manager cannot escalate ANOTHER admin's document", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "zadmin"), { email: "owner@x.com", tier: "free" });
  });
  await assertFails(updateDoc(doc(managerDb(), "users", "zadmin"), { tier: "premium" }));
  await assertFails(deleteDoc(doc(managerDb(), "users", "zadmin")));
});

test("ADMIN-SEC: a LEGACY role-less admin fails closed on writes until backfilled", async () => {
  // The migration case: an existing {admin:true} token with no role claim. It must be
  // treated as unprivileged for the dangerous branches rather than grandfathered in.
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { email: "a@x.com", tier: "free" });
  });
  await assertFails(updateDoc(doc(legacyAdminDb(), "users", "alice"), { tier: "pro" }));
  await assertFails(deleteDoc(doc(legacyAdminDb(), "users", "alice")));
});

test("ADMIN-SEC: a near-miss role value is not an owner", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { email: "a@x.com", tier: "free" });
  });
  for (const role of ["OWNER", "Owner", "owner ", "ownerr", ""]) {
    const db = testEnv.authenticatedContext(`z-${role || "empty"}`, { admin: true, role }).firestore();
    await assertFails(deleteDoc(doc(db, "users", "alice")));
  }
});

test("ADMIN-SEC: a role claim without admin:true grants nothing", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { email: "a@x.com", tier: "free" });
  });
  const fakeOwner = testEnv.authenticatedContext("zfake", { role: "owner" }).firestore();
  await assertFails(getDoc(doc(fakeOwner, "users", "alice")));
  await assertFails(updateDoc(doc(fakeOwner, "users", "alice"), { tier: "premium" }));
  await assertFails(deleteDoc(doc(fakeOwner, "users", "alice")));
});

test("ADMIN-SEC (B6): a manager CANNOT write or delete a user's portfolio DATA", async () => {
  // The owner-only wall on users/{uid} originally stopped at the doc itself, so a
  // manager — walled out of deleteUser server-side — could still destroy or
  // silently forge any customer's entire portfolio straight from devtools, with
  // no callable check and no audit entry. Every level must fail closed.
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { email: "a@x.com", tier: "free", portfolioCount: 1 });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1"), { name: "P1", coinCount: 1 });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1", "coins", "c1"), { symbol: "BTC", name: "Bitcoin", txCount: 1 });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1", "coins", "c1", "transactions", "t1"), { type: "buy", amount: 1, priceAtBuy: 100 });
    await setDoc(doc(db, "users", "alice", "learn", "progress"), { xp: 10 });
  });
  const pf = ["users", "alice", "portfolios", "p1"];
  const cn = [...pf, "coins", "c1"];
  const tx = [...cn, "transactions", "t1"];
  for (const db of [managerDb(), legacyAdminDb()]) {
    await assertFails(updateDoc(doc(db, ...pf), { name: "hacked" }));
    await assertFails(deleteDoc(doc(db, ...pf)));
    await assertFails(updateDoc(doc(db, ...cn), { name: "hacked" }));
    await assertFails(deleteDoc(doc(db, ...cn)));
    await assertFails(updateDoc(doc(db, ...tx), { amount: 999 }));
    await assertFails(deleteDoc(doc(db, ...tx)));
    await assertFails(deleteDoc(doc(db, "users", "alice", "learn", "progress")));
  }
});

test("ADMIN-SEC (B6): a manager can still READ portfolio data, and an owner can still fix it", async () => {
  // The read path is deliberately untouched — the admin panel needs it — and the
  // owner branch must keep working so a counter can still be corrected.
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice", "portfolios", "p1"), { name: "P1", coinCount: 5 });
  });
  await assertSucceeds(getDoc(doc(managerDb(), "users", "alice", "portfolios", "p1")));
  await assertSucceeds(updateDoc(doc(adminDb(), "users", "alice", "portfolios", "p1"), { coinCount: 1 }));
  await assertSucceeds(deleteDoc(doc(adminDb(), "users", "alice", "portfolios", "p1")));
});

test("ADMIN-SEC: managers still cannot reach config, audit or cache", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "config", "app"), { coingecko: "secret" });
    await setDoc(doc(db, "audit", "a1"), { action: "x" });
  });
  await assertFails(getDoc(doc(managerDb(), "config", "app")));
  await assertFails(getDoc(doc(managerDb(), "audit", "a1")));
  await assertFails(setDoc(doc(managerDb(), "config", "app"), { coingecko: "mine" }));
});

/* ═══════════════════════════════════════════════════════════════════════════
 * ONBOARD-GATE · the mandatory, server-enforced plan-selection gate
 * A user — or a bot with their token — that has NOT recorded a plan choice is denied
 * their whole portfolio/coin/tx/journal/learn tree. The server-only `planChosen` flag
 * (set by chooseFreePlan / the PayPal webhook) OR a paid tier lifts it. The user DOC
 * stays reachable so onboarding, logout and rendering the gate still work.
 * ═══════════════════════════════════════════════════════════════════════════ */

test("ONBOARD-GATE: a not-chosen FREE user is denied ALL portfolio data — read AND write", async () => {
  await seed(async (db) => {
    // A free account with NO recorded choice: the state right after registration, and the
    // state of an EXISTING free account before it passes the gate (decision #3 — gate all).
    await setDoc(doc(db, "users", "alice"), { name: "Alice", tier: "free", portfolioCount: 1 });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1"), { name: "P1", coinCount: 1 });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1", "coins", "btc"), { symbol: "BTC", name: "Bitcoin", txCount: 1 });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1", "coins", "btc", "transactions", "t1"),
      { type: "buy", amount: 1, priceAtBuy: 100, date: "2026-01-01T00:00" });
    await setDoc(doc(db, "users", "alice", "learn", "progress"),
      { xp: 5, streak: 1, lastActivity: "2026-01-01", completedLessons: [], updatedAt: "2026-01-01T00:00:00.000Z" });
  });
  const db = aliceDb();
  // READ of every data path is denied for the owner until they choose (a bot with the
  // user's token hits exactly this).
  await assertFails(getDoc(doc(db, "users", "alice", "portfolios", "p1")));
  await assertFails(getDocs(collection(db, "users", "alice", "portfolios")));
  await assertFails(getDoc(doc(db, "users", "alice", "portfolios", "p1", "coins", "btc")));
  await assertFails(getDoc(doc(db, "users", "alice", "portfolios", "p1", "coins", "btc", "transactions", "t1")));
  await assertFails(getDoc(doc(db, "users", "alice", "learn", "progress")));
  // WRITE of every data path is denied too.
  await assertFails(updateDoc(doc(db, "users", "alice", "portfolios", "p1"), { name: "renamed" }));
  await assertFails(setDoc(doc(db, "users", "alice", "learn", "progress"),
    { xp: 9, streak: 1, lastActivity: "2026-01-02", completedLessons: [], updatedAt: "2026-01-02T00:00:00.000Z" }));
  const b = writeBatch(db);
  b.set(doc(db, "users", "alice", "portfolios", "p2"), { name: "New", coinCount: 0 });
  b.update(doc(db, "users", "alice"), { portfolioCount: increment(1) });
  await assertFails(b.commit());
  // ...but the user DOC itself stays reachable — onboarding/logout/delete + the gate need it.
  await assertSucceeds(getDoc(doc(db, "users", "alice")));
});

test("ONBOARD-GATE: recording the choice (planChosen=true) lifts the gate", async () => {
  await seed(async (db) => {
    // Same account, now WITH the server-set flag — exactly what chooseFreePlan writes.
    await setDoc(doc(db, "users", "alice"), { name: "Alice", tier: "free", portfolioCount: 1, planChosen: true });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1"), { name: "P1", coinCount: 0 });
  });
  const db = aliceDb();
  await assertSucceeds(getDoc(doc(db, "users", "alice", "portfolios", "p1")));
  await assertSucceeds(updateDoc(doc(db, "users", "alice", "portfolios", "p1"), { name: "renamed" }));
});

test("ONBOARD-GATE: a PAID user is never gated, even with no planChosen flag", async () => {
  await seed(async (db) => {
    // Existing paid users predate the flag; tier != free is enough, so they're never locked
    // out (no backfill needed — the derived isChosen covers them).
    await setDoc(doc(db, "users", "bob"), { name: "Bob", tier: "pro", portfolioCount: 1 });
    await setDoc(doc(db, "users", "bob", "portfolios", "p1"), { name: "P1", coinCount: 0 });
  });
  const db = bobDb();
  await assertSucceeds(getDoc(doc(db, "users", "bob", "portfolios", "p1")));
  await assertSucceeds(updateDoc(doc(db, "users", "bob", "portfolios", "p1"), { name: "renamed" }));
});

test("ONBOARD-GATE: an admin can still READ a not-chosen user's data (support/panel)", async () => {
  await seed(async (db) => {
    await setDoc(doc(db, "users", "alice"), { name: "Alice", tier: "free", portfolioCount: 1 });
    await setDoc(doc(db, "users", "alice", "portfolios", "p1"), { name: "P1", coinCount: 0 });
  });
  // The plan gate must not blind staff to a user who hasn't onboarded yet.
  await assertSucceeds(getDoc(doc(adminDb(), "users", "alice", "portfolios", "p1")));
  await assertSucceeds(getDoc(doc(managerDb(), "users", "alice", "portfolios", "p1")));
});

test("ONBOARD-GATE: a client can NEVER set the server-only planChosen flag (create OR update)", async () => {
  // On CREATE — the flag that gates all data must not be self-granted at signup (hasOnly +
  // the explicit blocklist). On UPDATE — an owner can't flip their own gate open either.
  await assertFails(setDoc(doc(aliceDb(), "users", "alice"),
    { name: "Alice", tier: "free", portfolioCount: 0, planChosen: true }));
  await seed(async (db) => { await setDoc(doc(db, "users", "bob"), { name: "Bob", tier: "free", portfolioCount: 0 }); });
  await assertFails(updateDoc(doc(bobDb(), "users", "bob"), { planChosen: true }));
  // A clean signup (no planChosen) still works — proves the block is only on the flag.
  await assertSucceeds(setDoc(doc(carolDb(), "users", "carol"), { name: "Carol", tier: "free", portfolioCount: 0 }));
});
