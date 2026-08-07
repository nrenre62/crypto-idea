/**
 * Cloud Function callable integration tests.
 *
 * These invoke a REAL deployed-shape callable over HTTP against the functions emulator,
 * so the callable BODY actually executes. Every other suite stops short of that: the pure
 * helpers (billing.js/guards.js) are unit-tested, the gates are source-tested in
 * admin-gate-coverage.test.js, and the client-side tests mock `httpsCallable`. That gap is
 * how `suspendUser`'s un-suspend branch shipped broken — it referenced
 * `admin.firestore.FieldValue`, which is undefined inside the emulator, so the branch threw
 * a TypeError -> INTERNAL *after* `admin.auth().updateUser()` had already re-enabled the
 * account. The user could sign in again, but `suspendedAt` was never cleared and the R31-6
 * paid-time extension never ran, so a suspended paying customer silently lost the frozen
 * days. See ERRORS.md C6 and tests/unit/functions-runtime-safety.test.js (the source guard).
 *
 * Run with:  npm run test:integration   (needs the auth + firestore + functions emulators)
 */
import test from "node:test";
import assert from "node:assert";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

// firebase-admin lives in functions/node_modules, not the app's — resolve it from there.
const requireFromFunctions = createRequire(new URL("../functions/", import.meta.url));
const admin = requireFromFunctions("firebase-admin");
// Modular subpath accessors (firebase-admin v13+ removed the namespaced admin.auth()/
// admin.firestore() forms). Resolve them from functions/node_modules too.
const { getAuth } = requireFromFunctions("firebase-admin/auth");
const { getFirestore } = requireFromFunctions("firebase-admin/firestore");

const PROJECT = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || "demo-crypto-idea";
// `firebase emulators:exec` exports the auth/firestore hosts, but not the functions port.
// Ask the emulator hub (whose address IS exported) so this follows whichever config started
// the run — firebase.json on :5001 or firebase.solo.json on :5002 — instead of hard-coding.
async function resolveFunctionsPort() {
  const hub = process.env.FIREBASE_EMULATOR_HUB;
  if (hub) {
    try {
      const info = await fetch(`http://${hub}/emulators`).then((r) => r.json());
      if (info.functions && info.functions.port) return info.functions.port;
    } catch { /* fall through to the config file */ }
  }
  return JSON.parse(readFileSync(new URL("../firebase.json", import.meta.url), "utf8"))
    .emulators.functions.port;
}
const FN_PORT = await resolveFunctionsPort();
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_HOST;
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";

admin.initializeApp({ projectId: PROJECT });
const auth = getAuth();
const db = getFirestore();

const callableUrl = (name) => `http://127.0.0.1:${FN_PORT}/${PROJECT}/us-central1/${name}`;
const signInUrl = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`;

const PASSWORD = "Aa1!aaaa";
const DAY_MS = 24 * 60 * 60 * 1000;

async function makeUser(email, claims) {
  const u = await auth.createUser({ email, password: PASSWORD });
  if (claims) await auth.setCustomUserClaims(u.uid, claims);
  return u.uid;
}

/** Sign in and return an ID token that carries the user's current custom claims. */
async function idTokenFor(email) {
  const r = await fetch(signInUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  const j = await r.json();
  assert.ok(j.idToken, `sign-in failed for ${email}: ${JSON.stringify(j)}`);
  return j.idToken;
}

async function callAs(name, token, data) {
  const r = await fetch(callableUrl(name), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data }),
  });
  return { status: r.status, body: await r.json() };
}

const userDoc = (uid) => db.collection("users").doc(uid).get().then((s) => s.data() || {});

const stamp = Date.now();
const OWNER_EMAIL = `owner_${stamp}@example.com`;

test("suspendUser: un-suspend restores access AND credits the frozen paid time (R31-6)", async () => {
  await makeUser(OWNER_EMAIL, { admin: true, role: "owner" });
  const ownerToken = await idTokenFor(OWNER_EMAIL);
  const targetUid = await makeUser(`payer_${stamp}@example.com`, null);

  // A paying customer with a known period end, so the extension is measurable.
  const BASE_END = "2026-08-01T00:00:00.000Z";
  await db.collection("users").doc(targetUid)
    .set({ tier: "pro", subscription: { cancelled: false, endDate: BASE_END } }, { merge: true });

  // ── suspend ───────────────────────────────────────────────────────────────
  const suspended = await callAs("suspendUser", ownerToken, { uid: targetUid, disabled: true });
  assert.strictEqual(suspended.status, 200, `suspend failed: ${JSON.stringify(suspended.body)}`);
  assert.strictEqual((await auth.getUser(targetUid)).disabled, true, "auth account should be disabled");
  const afterSuspend = await userDoc(targetUid);
  assert.ok(afterSuspend.suspendedAt, "suspendedAt should be stamped so the sweep skips the account");

  // Backdate the freeze so the credited window is unambiguous (10 days).
  await db.collection("users").doc(targetUid)
    .set({ suspendedAt: Date.now() - 10 * DAY_MS }, { merge: true });

  // ── un-suspend (the regression) ────────────────────────────────────────────
  const restored = await callAs("suspendUser", ownerToken, { uid: targetUid, disabled: false });
  assert.strictEqual(
    restored.status, 200,
    `un-suspend returned ${restored.status}: ${JSON.stringify(restored.body)} ` +
    "(INTERNAL here means the FieldValue sentinel regressed to admin.firestore.FieldValue)",
  );

  const after = await userDoc(targetUid);
  assert.strictEqual((await auth.getUser(targetUid)).disabled, false, "auth account should be re-enabled");
  assert.strictEqual(after.suspendedAt, undefined, "suspendedAt must be cleared, or the sweep stays frozen forever");

  // The paid clock resumes where it stopped: endDate moves forward by the frozen duration.
  const credited = Date.parse(after.subscription.endDate) - Date.parse(BASE_END);
  assert.ok(
    Math.abs(credited - 10 * DAY_MS) < 60_000,
    `endDate should be extended by ~10 days, got ${(credited / DAY_MS).toFixed(3)}d`,
  );
});

test("suspendUser: un-suspending a free user with no subscription still clears suspendedAt", async () => {
  // The bare `FieldValue.delete()` write with no subscription branch — the exact line that threw.
  const ownerToken = await idTokenFor(OWNER_EMAIL);
  const uid = await makeUser(`free_${stamp}@example.com`, null);
  await db.collection("users").doc(uid).set({ tier: "free" }, { merge: true });

  assert.strictEqual((await callAs("suspendUser", ownerToken, { uid, disabled: true })).status, 200);
  const restored = await callAs("suspendUser", ownerToken, { uid, disabled: false });
  assert.strictEqual(restored.status, 200, `un-suspend failed: ${JSON.stringify(restored.body)}`);

  const after = await userDoc(uid);
  assert.strictEqual(after.suspendedAt, undefined, "suspendedAt must be cleared");
  assert.strictEqual(after.subscription, undefined, "no subscription should be invented");
  assert.strictEqual((await auth.getUser(uid)).disabled, false);
});

// ── ADMIN-5: read-only view-as + private notes ──

test("viewUserAsAdmin: owner gets a read-only snapshot incl. the journal thesis; a reason is required", async () => {
  const ownerToken = await idTokenFor(OWNER_EMAIL);
  const managerUid = await makeUser(`mgr5_${stamp}@example.com`, { admin: true, role: "manager" });
  const managerToken = await idTokenFor(`mgr5_${stamp}@example.com`);
  const targetUid = await makeUser(`viewee_${stamp}@example.com`, null);

  // Seed a portfolio → coin (with a thesis) → transaction for the target, Admin-SDK
  // (bypasses rules, exactly like the app's server writes).
  await db.collection("users").doc(targetUid).set({ tier: "pro", name: "Vee" }, { merge: true });
  const pRef = db.collection("users").doc(targetUid).collection("portfolios").doc("p1");
  await pRef.set({ name: "Main", coinCount: 1 });
  const cRef = pRef.collection("coins").doc("bitcoin");
  await cRef.set({ symbol: "btc", name: "Bitcoin", txCount: 1, journal: { thesis: "digital gold", changeMyMind: "a better chain", status: "intact", priceAtAdd: 30000, createdAt: "2026-01-01" } });
  await cRef.collection("transactions").doc("t1").set({ type: "buy", amount: 0.5, priceAtBuy: 30000, date: "2026-01-01" });

  // Missing reason → 400 (the accountability control is the point, not a nicety).
  const noReason = await callAs("viewUserAsAdmin", ownerToken, { uid: targetUid, reason: "  " });
  assert.strictEqual(noReason.status, 400, `expected 400 for empty reason, got ${JSON.stringify(noReason.body)}`);

  // A manager is refused (owner-only gate) even WITH a reason.
  const asManager = await callAs("viewUserAsAdmin", managerToken, { uid: targetUid, reason: "support" });
  assert.strictEqual(asManager.status, 403, `manager should be refused, got ${JSON.stringify(asManager.body)}`);
  void managerUid;

  // Owner + reason → the snapshot, including the thesis.
  const ok = await callAs("viewUserAsAdmin", ownerToken, { uid: targetUid, reason: "user reported missing coin" });
  assert.strictEqual(ok.status, 200, `owner view-as failed: ${JSON.stringify(ok.body)}`);
  const snap = ok.body.result;
  assert.strictEqual(snap.tier, "pro");
  assert.strictEqual(snap.portfolios.length, 1);
  assert.strictEqual(snap.portfolios[0].coins[0].journal.thesis, "digital gold");
  assert.strictEqual(snap.portfolios[0].coins[0].transactions.length, 1);

  // The view is audited WITH the reason.
  const audits = await db.collection("audit").where("action", "==", "viewUserAsAdmin").where("targetUid", "==", targetUid).get();
  assert.ok(audits.size >= 1, "the view-as must be audited");
  assert.ok(audits.docs.some((d) => String(d.data().details || "").includes("user reported missing coin")), "the reason must be in the audit details");
});

test("saveUserNote/getUserNote: a note round-trips; its CONTENT never enters the audit log; a plain user is refused", async () => {
  const ownerToken = await idTokenFor(OWNER_EMAIL);
  const managerToken = await idTokenFor(`mgr5_${stamp}@example.com`);
  const noteTargetUid = await makeUser(`notee_${stamp}@example.com`, null);
  const plainUid = await makeUser(`plain5_${stamp}@example.com`, null);
  const plainToken = await idTokenFor(`plain5_${stamp}@example.com`);

  const SECRET_NOTE = "called about a refund — SENSITIVE-CONTEXT-XYZ";

  // A plain user cannot write a note about anyone.
  const denied = await callAs("saveUserNote", plainToken, { uid: noteTargetUid, note: "haxx" });
  assert.strictEqual(denied.status, 403, `plain user should be refused, got ${JSON.stringify(denied.body)}`);

  // A manager writes it; any admin (owner) reads it back.
  const saved = await callAs("saveUserNote", managerToken, { uid: noteTargetUid, note: SECRET_NOTE });
  assert.strictEqual(saved.status, 200, `saveUserNote failed: ${JSON.stringify(saved.body)}`);
  const read = await callAs("getUserNote", ownerToken, { uid: noteTargetUid });
  assert.strictEqual(read.status, 200);
  assert.strictEqual(read.body.result.note, SECRET_NOTE);

  // The audit records THAT a note changed, never the content.
  const audits = await db.collection("audit").where("action", "==", "saveUserNote").where("targetUid", "==", noteTargetUid).get();
  assert.ok(audits.size >= 1, "a note save must be audited");
  for (const d of audits.docs) {
    assert.ok(!String(d.data().details || "").includes("SENSITIVE-CONTEXT-XYZ"), "the note CONTENT must never reach the audit log");
  }
  void plainUid;
});

// ── API-SECURITY §5: callables reject unknown top-level `data` keys ──
// openapi.json documents every callable request as additionalProperties:false; the
// handlers used to silently IGNORE extra keys. assertNoUnknownKeys(data, [...]) now
// enforces the contract as invalid-argument. Runs AFTER the auth/role gate, so this
// exercises the guard on the callable BODY (the only tier that does).

test("callables reject unknown top-level data keys, but accept their allowed keys (deny-by-default input)", async () => {
  const ownerToken = await idTokenFor(OWNER_EMAIL);

  // A keyed callable accepts its allowed key...
  const okKeyed = await callAs("listAudit", ownerToken, { limit: 5 });
  assert.strictEqual(okKeyed.status, 200, `allowed key should pass: ${JSON.stringify(okKeyed.body)}`);

  // ...and rejects an extra top-level key as invalid-argument (400) — the ignored-key gap.
  const badKeyed = await callAs("listAudit", ownerToken, { limit: 5, isAdmin: true });
  assert.strictEqual(badKeyed.status, 400, `unknown key should be rejected: ${JSON.stringify(badKeyed.body)}`);
  assert.strictEqual(badKeyed.body.error && badKeyed.body.error.status, "INVALID_ARGUMENT");
  // The message stays generic — it must NOT echo the caller's field name back.
  assert.ok(!String(badKeyed.body.error.message || "").includes("isAdmin"), "the error must not reflect the offending key name");

  // A no-arg callable (empty allow-list) accepts an empty payload...
  const okNoArg = await callAs("getStats", ownerToken, {});
  assert.strictEqual(okNoArg.status, 200, `no-arg empty call should pass: ${JSON.stringify(okNoArg.body)}`);

  // ...and rejects ANY key.
  const badNoArg = await callAs("getStats", ownerToken, { sneaky: 1 });
  assert.strictEqual(badNoArg.status, 400, `no-arg call with a key should be rejected: ${JSON.stringify(badNoArg.body)}`);
});

// ── ONBOARD-GATE: the free plan-choice callable ──

test("chooseFreePlan: records the choice, creates the default portfolio, and is idempotent", async () => {
  const email = `onboard_${stamp}@example.com`;
  const uid = await makeUser(email, null);
  // A freshly-registered account: a profile doc, free tier, NO recorded choice, NO portfolio
  // (registration no longer creates it client-side — ONBOARD-GATE).
  await db.collection("users").doc(uid).set({ email, name: "New User", tier: "free", portfolioCount: 0 });
  const token = await idTokenFor(email);

  // Before: not chosen, no portfolios.
  assert.strictEqual((await userDoc(uid)).planChosen, undefined, "should start with no recorded choice");
  const before = await db.collection("users").doc(uid).collection("portfolios").get();
  assert.strictEqual(before.size, 0, "a new account has no portfolio until it chooses");

  // Choose free.
  const res = await callAs("chooseFreePlan", token, {});
  assert.strictEqual(res.status, 200, `chooseFreePlan failed: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body.result.planChosen, true);

  const after = await userDoc(uid);
  assert.strictEqual(after.planChosen, true, "planChosen must be set server-side");
  assert.strictEqual(after.tier, "free", "the free choice keeps the free tier");
  assert.strictEqual(after.portfolioCount, 1, "portfolioCount reflects the created default portfolio");
  const ports = await db.collection("users").doc(uid).collection("portfolios").get();
  assert.strictEqual(ports.size, 1, "exactly one default portfolio was created");
  assert.strictEqual(ports.docs[0].id, "default", "the default portfolio uses the fixed 'default' id");

  // Idempotent: a second call is a harmless no-op — no duplicate portfolio, still chosen.
  const again = await callAs("chooseFreePlan", token, {});
  assert.strictEqual(again.status, 200, `second chooseFreePlan failed: ${JSON.stringify(again.body)}`);
  const ports2 = await db.collection("users").doc(uid).collection("portfolios").get();
  assert.strictEqual(ports2.size, 1, "a repeat call must not create a second portfolio");
  assert.strictEqual((await userDoc(uid)).planChosen, true);
});

test("chooseFreePlan: rejects an unknown field and requires auth", async () => {
  const email = `onboard2_${stamp}@example.com`;
  const uid = await makeUser(email, null);
  await db.collection("users").doc(uid).set({ email, name: "N2", tier: "free", portfolioCount: 0 });
  const token = await idTokenFor(email);
  // Deny-by-default input shape (assertNoUnknownKeys([])).
  const badKey = await callAs("chooseFreePlan", token, { sneaky: 1 });
  assert.strictEqual(badKey.status, 400, `unknown key should be rejected: ${JSON.stringify(badKey.body)}`);
  // Unauthenticated → 401.
  const noAuth = await fetch(callableUrl("chooseFreePlan"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: {} }),
  });
  assert.strictEqual(noAuth.status, 401, "an unauthenticated call must be rejected");
});
