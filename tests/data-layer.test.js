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
import { readFileSync } from "node:fs";
import { auth, db, functions } from "../src/api/firebase.config.js";
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { connectFunctionsEmulator } from "firebase/functions";
import { registerUser, updateUserSettings } from "../src/api/firebase-auth.js";
import { chooseFreePlan } from "../src/api/account.js";
import {
  getPortfolios, createPortfolio, getCoins, getCoinsMeta,
  addCoin, addTransaction, deleteTransaction, getUserProfile, updateCoinJournal,
  getLearnProgress, saveLearnProgress, watchPortfolios, watchCoins, updatePortfolioName, updateCoinOrder,
} from "../src/api/firebase-database.js";

// Point the SDK at the local emulators (DEV auto-connect only happens under Vite).
// Follow the ports the emulator actually bound — `firebase emulators:exec` exports
// FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST, so this adapts to an isolated
// emulator on non-default ports when the standard ones are busy (full start:all up).
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const [FS_HOST, FS_PORT] = (process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080").split(":");
connectAuthEmulator(auth, "http://" + AUTH_HOST, { disableWarnings: true });
connectFirestoreEmulator(db, FS_HOST, Number(FS_PORT));

// ONBOARD-GATE: onboarding now records the plan choice via the chooseFreePlan callable, so
// the data layer needs the FUNCTIONS emulator too. Its port isn't exported, so ask the hub
// (whose address IS exported) — this follows firebase.json (:5001) or firebase.solo.json
// (:5002) automatically, matching functions-callable.test.js.
async function resolveFunctionsPort() {
  const hub = process.env.FIREBASE_EMULATOR_HUB;
  if (hub) {
    try {
      const info = await fetch(`http://${hub}/emulators`).then((r) => r.json());
      if (info.functions && info.functions.port) return info.functions.port;
    } catch { /* fall through to the config file */ }
  }
  return JSON.parse(readFileSync(new URL("../firebase.json", import.meta.url), "utf8")).emulators.functions.port;
}
connectFunctionsEmulator(functions, "127.0.0.1", await resolveFunctionsPort());

const email = `tester_${Date.now()}@example.com`;
const pass = "Aa1!aaaa";
let uid;

test("ONBOARD-GATE: register makes a gated account; chooseFreePlan records the choice + seeds the default portfolio", async () => {
  const res = await registerUser(email, pass, "Tester", { termsVersion: "2026-06-24", privacyVersion: "2026-06-24", marketing: true });
  assert.ok(res.success, "register should succeed: " + JSON.stringify(res));
  uid = res.user.uid;

  // Registration no longer creates a portfolio — the whole data tree is gated until a plan
  // is recorded. A brand-new account can't even read its (empty) portfolios collection.
  const gated = await getPortfolios(uid);
  assert.equal(gated.success, false, "a not-yet-chosen account is denied its data by the rules");

  // Record the free choice (what the Starter card does). The server sets planChosen and
  // creates the default portfolio via the Admin SDK — the first portfolio appears now.
  const choose = await chooseFreePlan();
  assert.ok(choose && choose.success && choose.planChosen, "chooseFreePlan records the choice: " + JSON.stringify(choose));

  const ports = await getPortfolios(uid);
  assert.ok(ports.success, "portfolios are readable once the plan is chosen: " + JSON.stringify(ports));
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

test("registration writes the consent record + closed settings map (U2)", async () => {
  // The consent (Terms/Privacy) record and the validated settings map are written
  // atomically at signup and satisfy validConsent/validSettings in the rules.
  const prof = await getUserProfile(uid);
  assert.ok(prof.success);
  assert.equal(prof.consent.termsVersion, "2026-06-24", "Terms version recorded");
  assert.equal(prof.consent.privacyVersion, "2026-06-24", "Privacy version recorded");
  assert.ok(prof.consent.termsAcceptedAt, "Terms acceptance timestamp stamped");
  assert.equal(prof.settings.emailMarketing, true, "marketing opt-in persisted to settings");
  assert.equal(prof.settings.theme, "light", "default theme persisted");
  assert.equal(prof.settings.emailDigest, false, "digest defaults off");
});

test("settings auto-save: updateUserSettings merges a toggle into the validated map (U8)", async () => {
  const r = await updateUserSettings(uid, { emailDigest: true, consentAnalytics: true });
  assert.ok(r.success, "settings update must satisfy validSettings: " + JSON.stringify(r));
  const prof = await getUserProfile(uid);
  assert.equal(prof.settings.emailDigest, true, "toggled digest persisted");
  assert.equal(prof.settings.consentAnalytics, true, "analytics consent persisted");
  // merge:true preserved the unrelated fields written at registration.
  assert.equal(prof.settings.theme, "light", "merge kept theme");
  assert.equal(prof.settings.emailMarketing, true, "merge kept marketing opt-in");
  assert.ok(prof.settings.updatedAt, "updatedAt re-stamped");
});

test("free tier: portfolios allowed up to 3, then rejected (PLAN-LIMITS-MAX)", async () => {
  // free now allows 3 portfolios (raised from 1). The default portfolio already exists (count 1),
  // so a 2nd and 3rd are allowed and only the 4th is rejected by the rules. (createPortfolio's
  // 3rd arg is `order`, not a limit — limit is null here, so the rules are the only check.)
  const p2 = await createPortfolio(uid, "Second", 1);
  assert.ok(p2.success, "2nd portfolio allowed on free (limit 3): " + JSON.stringify(p2));
  const p3 = await createPortfolio(uid, "Third", 2);
  assert.ok(p3.success, "3rd portfolio allowed on free (limit 3): " + JSON.stringify(p3));
  const p4 = await createPortfolio(uid, "Fourth", 3);
  assert.equal(p4.success, false, "the 4th portfolio should be rejected on free tier");
});

test("free tier: coins allowed up to 30, then rejected", async () => {
  for (let i = 0; i < 30; i++) {
    const r = await addCoin(uid, "default", { id: "coin" + i, symbol: "C" + i, name: "Coin " + i });
    assert.ok(r.success, `coin ${i} should add: ${JSON.stringify(r)}`);
  }
  const r31 = await addCoin(uid, "default", { id: "coin30", symbol: "C30", name: "Coin 30" });
  assert.equal(r31.success, false, "the 31st coin should be rejected on free tier");
});

test("DI-1: an at-cap add is reason:'limit', a missing parent is reason:'missing-target'", async () => {
  // The account above is at the coin cap (30). With the tier limit passed in, an over-cap
  // add is classified as a REAL limit — the only case the UI shows the upgrade toast.
  const overCap = await addCoin(uid, "default", { id: "coinX", symbol: "CX", name: "Coin X" }, null, 30);
  assert.equal(overCap.success, false);
  assert.equal(overCap.reason, "limit", "an at-cap add is a real limit: " + JSON.stringify(overCap));

  // A write to a parent that no longer exists is 'missing-target', never a fake limit.
  const gone = await addCoin(uid, "no-such-portfolio", { id: "eth", symbol: "ETH", name: "Ethereum" }, null, 30);
  assert.equal(gone.success, false);
  assert.equal(gone.reason, "missing-target", "a missing parent is not a limit: " + JSON.stringify(gone));
});

test("DI-3: re-adding an existing coin is 'already-exists' — no counter inflation, no journal clobber", async () => {
  // coin0 exists (added above). A re-add used to take the rules UPDATE path: inflate
  // coinCount forever AND overwrite the journal. The runTransaction guard refuses it.
  const before = await getCoins(uid, "default");
  const journalBefore = before.coins.find((c) => c.id === "coin0").journal || null;
  const coinCountBefore = (await getPortfolios(uid)).portfolios.find((p) => p.id === "default").coinCount;

  const readd = await addCoin(uid, "default", { id: "coin0", symbol: "C0", name: "Coin 0" },
    { thesis: "CLOBBER", changeMyMind: "x", status: "intact", priceAtAdd: 1, createdAt: "2026-01-01T00:00:00.000Z" }, 30);
  assert.equal(readd.success, false);
  assert.equal(readd.reason, "already-exists", "a re-add is refused, not applied: " + JSON.stringify(readd));

  const after = await getCoins(uid, "default");
  assert.deepEqual(after.coins.find((c) => c.id === "coin0").journal || null, journalBefore, "existing journal preserved (not clobbered)");
  const coinCountAfter = (await getPortfolios(uid)).portfolios.find((p) => p.id === "default").coinCount;
  assert.equal(coinCountAfter, coinCountBefore, "coinCount not inflated by the re-add");
});

test("API-SECURITY (counter-forge): deleting a tx does NOT decrement txCount client-side; 2nd delete is 'not-found'", async () => {
  // The client can no longer decrement a tier counter (firestore.rules counterNoForge closes a
  // paywall bypass), so deletes leave the count FAIL-SAFE-high and it's reconciled server-side.
  const add = await addTransaction(uid, "default", "coin1", { type: "buy", amount: 1, priceAtBuy: 50, date: "2026-02-01T00:00" }, 300);
  assert.ok(add.success, "add tx: " + JSON.stringify(add));
  const txCountAfterAdd = (await getCoins(uid, "default")).coins.find((c) => c.id === "coin1").txCount;

  const del1 = await deleteTransaction(uid, "default", "coin1", add.id);
  assert.ok(del1.success, "first delete ok (the tx doc is removed even though the counter is untouched)");
  const del2 = await deleteTransaction(uid, "default", "coin1", add.id);
  assert.equal(del2.success, false);
  assert.equal(del2.reason, "not-found", "second delete is not-found: " + JSON.stringify(del2));

  const txCountFinal = (await getCoins(uid, "default")).coins.find((c) => c.id === "coin1").txCount;
  assert.equal(txCountFinal, txCountAfterAdd, "txCount is NOT decremented by the client delete (counterNoForge)");
});

test("PLAN-LIMITS-MAX Part B: getCoinsMeta reads coins + txCount but NOT their transactions", async () => {
  // The lazy-load path for non-active portfolios: same coins as getCoins, each carrying the
  // persisted txCount (so the count surfaces stay correct) but entries:[] — proving no
  // transaction reads happen, which is the cost lever that keeps the raised limits in-band.
  const full = await getCoins(uid, "default");
  assert.ok(full.success, "getCoins should succeed: " + JSON.stringify(full));
  const meta = await getCoinsMeta(uid, "default");
  assert.ok(meta.success, "getCoinsMeta should read the coins: " + JSON.stringify(meta));
  assert.equal(meta.coins.length, full.coins.length, "getCoinsMeta returns the same coins as getCoins");
  assert.ok(meta.coins.every((c) => Array.isArray(c.entries) && c.entries.length === 0),
    "getCoinsMeta must read NO transactions (entries:[] for every coin)");
  assert.ok(meta.coins.every((c) => typeof c.txCount === "number"),
    "getCoinsMeta must carry the persisted txCount so counts stay correct");
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

test("coin journal funnel (#27): write findings, read them back, then clear them", async () => {
  const base = { thesis: "active devs", changeMyMind: "devs quit", status: "intact", priceAtAdd: 50000, createdAt: "2026-01-01T00:00:00.000Z" };

  // Backward-compat: a journal with no funnel round-trips with no funnel key.
  await updateCoinJournal(uid, "default", "coin1", base);
  const a = await getCoins(uid, "default");
  assert.equal(a.coins.find((c) => c.id === "coin1").journal.funnel, undefined, "no-funnel journal should have no funnel key");

  // Add manual funnel findings and read them back.
  const withFunnel = { ...base, funnel: { dilution: "40% unlocks in 2027", yield: "real fees" } };
  const upd = await updateCoinJournal(uid, "default", "coin1", withFunnel);
  assert.ok(upd.success, "funnel write should succeed: " + JSON.stringify(upd));
  const b = await getCoins(uid, "default");
  const coin1b = b.coins.find((c) => c.id === "coin1");
  assert.equal(coin1b.journal.funnel.dilution, "40% unlocks in 2027");
  assert.equal(coin1b.journal.funnel.yield, "real fees");

  // Clearing findings (journal re-saved without the funnel key) removes them.
  const cleared = await updateCoinJournal(uid, "default", "coin1", base);
  assert.ok(cleared.success);
  const cl = await getCoins(uid, "default");
  assert.equal(cl.coins.find((c) => c.id === "coin1").journal.funnel, undefined);
});

test("R32: updateCoinOrder writes then clears the custom coin order on the portfolio doc", async () => {
  const write = await updateCoinOrder(uid, "default", ["coin2", "coin0", "coin1"]);
  assert.ok(write.success, "coin order write: " + JSON.stringify(write));
  let ports = await getPortfolios(uid);
  let def = ports.portfolios.find((p) => p.id === "default");
  assert.deepEqual(def.coinOrder, ["coin2", "coin0", "coin1"], "order round-trips");
  // An empty array CLEARS the field (Reset to auto).
  const clear = await updateCoinOrder(uid, "default", []);
  assert.ok(clear.success);
  ports = await getPortfolios(uid);
  def = ports.portfolios.find((p) => p.id === "default");
  assert.equal(def.coinOrder, undefined, "Reset removes the coinOrder field");
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

// ═══ C-A3 (C12): live listeners — the multi-device sync DoD ═══
// Subscribe FIRST, then write through the plain data-layer functions (standing in
// for a second device — the listener only sees the change via Firestore, never via
// local state), and assert the callback observed it.
const waitUntil = async (pred, ms = 5000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (pred()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
};

test("C-A3: watchPortfolios sees a rename made after subscribing", async () => {
  // (A free account caps at 1 portfolio, so the observed write is a RENAME of the
  // default — same listener path a second device's create/rename/delete takes.)
  const seen = [];
  const unsub = watchPortfolios(uid, (metas) => seen.push(metas));
  try {
    const renamed = await updatePortfolioName(uid, "default", "Renamed by device B");
    assert.ok(renamed.success, "rename should succeed: " + JSON.stringify(renamed));
    const ok = await waitUntil(() => seen.some((m) => m.some((p) => p.name === "Renamed by device B")));
    assert.ok(ok, "the listener should observe the rename (no reload)");
  } finally { unsub(); }
});

test("C-A3: watchCoins surfaces a transaction added after subscribing (txCount bump)", async () => {
  // Use an EXISTING coin (earlier tests may have filled the free coin cap): the
  // tx write's txCount bump on the coin doc must re-surface it WITH the new entry.
  const before = await getCoins(uid, "default");
  assert.ok(before.success && before.coins.length > 0, "need an existing coin to observe");
  const target = before.coins[0];
  const baseCount = (target.entries || []).length;
  const seen = [];
  const unsub = watchCoins(uid, "default", (coins) => seen.push(coins));
  try {
    const tx = await addTransaction(uid, "default", target.id, { type: "buy", amount: 1, priceAtBuy: 2000, date: "2026-07-01T00:00" });
    assert.ok(tx.success, "addTransaction: " + JSON.stringify(tx));
    const ok = await waitUntil(() => seen.some((cs) => cs.some((x) => x.id === target.id && (x.entries || []).length === baseCount + 1)));
    assert.ok(ok, "the txCount bump should re-surface the coin WITH the new transaction");
  } finally { unsub(); }
});

// DI-1: the founder's actual bug — a denial caused by BAD DATA (an over-2000-char thesis)
// on a portfolio BELOW the cap must NOT be mislabelled 'limit'. This registers a fresh
// account (which re-authenticates the shared SDK), so it runs LAST — nothing after it uses
// the original user.
test("DI-1: an over-2000 thesis is rejected as reason:'invalid-or-denied', not a fake limit", async () => {
  const email2 = `tester2_${Date.now()}@example.com`;
  const reg = await registerUser(email2, pass, "Tester Two", { termsVersion: "2026-06-24", privacyVersion: "2026-06-24" });
  assert.ok(reg.success, "second registration: " + JSON.stringify(reg));
  const uid2 = reg.user.uid;   // fresh account: coinCount 0, well below the free cap of 10
  // ONBOARD-GATE: pass the plan gate first (registerUser re-authed the shared SDK as uid2),
  // so the add below fails on the THESIS length — the reason under test — not on the gate.
  const choose2 = await chooseFreePlan();
  assert.ok(choose2 && choose2.success, "choose free for the 2nd account: " + JSON.stringify(choose2));
  const longThesis = { thesis: "x".repeat(2001), changeMyMind: "y", status: "intact", priceAtAdd: 1, createdAt: "2026-01-01T00:00:00.000Z" };
  const badAdd = await addCoin(uid2, "default", { id: "btc", symbol: "BTC", name: "Bitcoin" }, longThesis, 10);
  assert.equal(badAdd.success, false, "an over-2000 thesis is rejected by the rules");
  assert.equal(badAdd.reason, "invalid-or-denied", "a data-validity denial is NOT a limit: " + JSON.stringify(badAdd));
});
