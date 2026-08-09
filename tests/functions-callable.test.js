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
const { getFirestore, FieldValue } = requireFromFunctions("firebase-admin/firestore");

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

// Like callAs, but tolerant of a non-JSON body. A callable that does NOT exist yet
// (listAdmins, until ADMIN-SEP ships) 404s with a plain-text body — callAs()'s
// `await r.json()` would THROW on that, masking the real red (a missing endpoint) with a
// SyntaxError. This lets the assertion land cleanly on the status code instead.
async function callAsSafe(name, token, data) {
  const r = await fetch(callableUrl(name), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data }),
  });
  let body = null;
  try { body = await r.json(); } catch { body = null; }
  return { status: r.status, body };
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

// ── CRYP-101: LAUNCH-FREE Part B — the paidPlansEnabled top-level flag ──
// A config/app.flags.paidPlansEnabled switch (default ON; OFF only on exact false)
// that pauses NEW paid subscriptions and drives the launch-free UI. It gates the
// createSubscription callable BODY (the only tier that runs it), is published on
// /api/config, and must survive a flags save that omits it (per-key KEEP). It must
// NOT touch existing paying customers or their manage/cancel path.
//
// These set config/app directly (Admin SDK); the enforcement must reflect a change
// promptly (read fresh, like the signup gate) — not lag behind a multi-minute cache.

test("CRYP-101: createSubscription refuses when paidPlansEnabled=false (paused, nothing written)", async () => {
  const email = `paidoff_${stamp}@example.com`;
  const uid = await makeUser(email, null);
  await db.collection("users").doc(uid).set({ email, name: "PaidOff", tier: "free", portfolioCount: 1 });
  const token = await idTokenFor(email);
  // Launch-free mode ON: paid plans switched off.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: false } }, { merge: true });

  const res = await callAs("createSubscription", token, { plan: "pro" });
  assert.strictEqual(res.status, 400, `expected failed-precondition (400), got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body.error && res.body.error.status, "FAILED_PRECONDITION");
  // THE assertion: the refusal is the launch-free "paused" message, not the later
  // "Plan not configured" it hits today because no gate exists yet.
  assert.match(
    String(res.body.error && res.body.error.message),
    /paused/i,
    "createSubscription must refuse with the launch-free 'paid plans paused' message",
  );
  // No side effects: no tier change, no subscription, no billing cycle.
  const after = await userDoc(uid);
  assert.strictEqual(after.tier, "free", "tier must be untouched");
  assert.strictEqual(after.subscription, undefined, "no subscription may be created");
  assert.strictEqual(after.billingCycle, undefined, "no billing cycle may be recorded");
});

test("CRYP-101: createSubscription proceeds past the paid gate when paidPlansEnabled is absent (default ON)", async () => {
  const email = `paidon_${stamp}@example.com`;
  const uid = await makeUser(email, null);
  await db.collection("users").doc(uid).set({ email, name: "PaidOn", tier: "free", portfolioCount: 1 });
  const token = await idTokenFor(email);
  // Absent key → default ON (paid plans available).
  await db.doc("config/app").set({ flags: { paidPlansEnabled: FieldValue.delete() } }, { merge: true });

  const res = await callAs("createSubscription", token, { plan: "pro" });
  const msg = String((res.body.error && res.body.error.message) || "");
  // It must NOT be blocked by the launch-free pause…
  assert.ok(!/paused/i.test(msg), `must not be paused when the flag is absent; got ${JSON.stringify(res.body)}`);
  // …it reaches a LATER checkout stage instead (no PayPal env here → "Plan not configured").
  assert.ok(
    res.status === 200 || /plan not configured|paypal|approval|token/i.test(msg),
    `expected to reach the checkout stage past the paid gate, got ${res.status}: ${JSON.stringify(res.body)}`,
  );
});

test("CRYP-101: an existing paid user is untouched when paidPlansEnabled=false; manage/cancel stays available", async () => {
  const email = `paiduser_${stamp}@example.com`;
  const uid = await makeUser(email, null);
  // A paying Pro customer with an active (non-cancelled) subscription marker.
  await db.collection("users").doc(uid).set(
    { email, name: "Payer", tier: "pro", subscription: { cancelled: false, endDate: "2027-01-01T00:00:00.000Z" } },
    { merge: true },
  );
  const token = await idTokenFor(email);
  await db.doc("config/app").set({ flags: { paidPlansEnabled: false } }, { merge: true });

  // The flag does NOT downgrade or strip an existing subscriber.
  let after = await userDoc(uid);
  assert.strictEqual(after.tier, "pro", "an existing paid tier must be untouched by the launch-free switch");
  assert.strictEqual(after.subscription.cancelled, false, "the active subscription marker must be untouched");

  // Managing the subscription stays ungated: reactivate (Firestore-only) still succeeds.
  const react = await callAs("reactivateSubscription", token, {});
  assert.strictEqual(react.status, 200, `reactivateSubscription must stay available: ${JSON.stringify(react.body)}`);

  // Cancel is reachable too — NOT short-circuited by the launch-free pause (here it
  // stops at the missing PayPal subscription id, proving it got past the gate without
  // making a live PayPal call).
  const cancel = await callAs("cancelSubscription", token, {});
  const cmsg = String((cancel.body.error && cancel.body.error.message) || "");
  assert.ok(!/paused/i.test(cmsg), `cancel must not be blocked by the launch-free pause; got ${JSON.stringify(cancel.body)}`);

  // Tier is STILL pro after the manage/cancel attempts.
  after = await userDoc(uid);
  assert.strictEqual(after.tier, "pro", "tier stays pro after manage/cancel");
});

test("CRYP-101: /api/config publishes paidPlansEnabled (absent → true, explicit false → false)", async () => {
  const apiConfigUrl = `http://127.0.0.1:${FN_PORT}/${PROJECT}/us-central1/api/config`;

  // Absent key → default ON.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: FieldValue.delete() } }, { merge: true });
  let cfg = await fetch(apiConfigUrl).then((r) => r.json());
  assert.strictEqual(cfg.paidPlansEnabled, true, `absent flag must publish true, got ${JSON.stringify(cfg.paidPlansEnabled)}`);

  // Explicit false → OFF.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: false } }, { merge: true });
  cfg = await fetch(apiConfigUrl).then((r) => r.json());
  assert.strictEqual(cfg.paidPlansEnabled, false, `explicit false must publish false, got ${JSON.stringify(cfg.paidPlansEnabled)}`);
});

test("CRYP-101: saveConfig KEEPS a stored paidPlansEnabled=false when a flags payload omits it", async () => {
  const ownerToken = await idTokenFor(OWNER_EMAIL);
  // Launch-free stored directly.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: false } }, { merge: true });
  // An App-Controls maintenance toggle posts `flags` WITHOUT paidPlansEnabled.
  const res = await callAs("saveConfig", ownerToken, { flags: { maintenance: false, signupsEnabled: true } });
  assert.strictEqual(res.status, 200, `saveConfig failed: ${JSON.stringify(res.body)}`);
  const stored = (await db.doc("config/app").get()).data();
  assert.strictEqual(
    stored.flags.paidPlansEnabled, false,
    "an omitted paidPlansEnabled must be KEPT (per-key merge), not silently reset to default-true",
  );
});

// ── ADMIN-SEP · CRYP-103 · admin/user separation + owner-only admin roster (PR1: Parts A + B) ──
// Founder ask: an admin account (owner OR manager) must NEVER appear as a normal user.
// The exclusion + the roster are SERVER-enforced and key off the Firebase custom claim
// `customClaims.admin === true`, NOT the `role` string — a legacy no-role admin has
// role === "" (identical to a plain user), so a role-based filter would leak it back in.
// These callable-BODY tests run in CI (the functions emulator can't boot in the authoring
// sandbox). Each is confirmed red by reading functions/index.js as it stands today:
//   • listUsers (~L1446-1483) tags each Auth account isAdmin but never SKIPS admins.
//   • gatherStats (~L668-722) counts every users/{uid} doc, admin docs included.
//   • findDuplicateEmails (~L1495-1522) iterates all Auth users with no admin filter.
//   • listAdmins does not exist at all → the emulator 404s the call.

test("CRYP-103: listUsers excludes every admin account (keyed off the claim, not role)", async () => {
  const ownerToken = await idTokenFor(OWNER_EMAIL);
  const mgrEmail = `sep_mgr_${stamp}@example.com`;
  const plainEmail = `sep_plain_${stamp}@example.com`;
  // A manager admin WITH a users/{uid} profile doc (the seed shape: tier "free") — exactly
  // the account that shows today as a normal, "ADMIN"-badged row in the Users list.
  const mgrUid = await makeUser(mgrEmail, { admin: true, role: "manager" });
  await db.collection("users").doc(mgrUid).set({ email: mgrEmail, name: "Sep Mgr", tier: "free", portfolioCount: 0 });
  const plainUid = await makeUser(plainEmail, null);
  await db.collection("users").doc(plainUid).set({ email: plainEmail, name: "Sep Plain", tier: "free", portfolioCount: 0 });

  const res = await callAs("listUsers", ownerToken, {});
  assert.strictEqual(res.status, 200, `listUsers failed: ${JSON.stringify(res.body)}`);
  const users = res.body.result.users;
  assert.ok(Array.isArray(users), "listUsers must return a users array");

  // THE assertion: NO returned account carries the admin claim (owners AND managers gone).
  assert.ok(users.every((u) => !u.isAdmin), "listUsers must return NO account with the admin claim");
  const emails = new Set(users.map((u) => u.email));
  assert.ok(!emails.has(mgrEmail), "a manager admin must not appear in the Users list");
  assert.ok(!emails.has(OWNER_EMAIL), "an owner must not appear in the Users list");
  // Guard against over-filtering: a genuine plain user is still listed.
  assert.ok(emails.has(plainEmail), "a plain user must still appear in the Users list");
});

test("CRYP-103: getStats/gatherStats excludes admins from totalUsers and the tier counts", async () => {
  const ownerToken = await idTokenFor(OWNER_EMAIL);
  const readStats = async () => {
    const r = await callAs("getStats", ownerToken, {});
    assert.strictEqual(r.status, 200, `getStats failed: ${JSON.stringify(r.body)}`);
    return r.body.result;
  };

  const s0 = await readStats();

  // Add ONE manager admin with a users/{uid} doc (tier "free"). Today this bumps the counts;
  // after the fix it must not, because gatherStats keys off customClaims.admin === true.
  const admEmail = `sep_stat_admin_${stamp}@example.com`;
  const admUid = await makeUser(admEmail, { admin: true, role: "manager" });
  await db.collection("users").doc(admUid).set({ email: admEmail, tier: "free", portfolioCount: 0 });
  const s1 = await readStats();
  assert.strictEqual(s1.totalUsers, s0.totalUsers, "an admin account must NOT be counted in totalUsers");
  assert.strictEqual(s1.freeUsers, s0.freeUsers, "an admin account must NOT be counted in the free-tier total");

  // Positive control: a plain user with the SAME doc shape IS still counted (proves the
  // counter isn't simply broken / frozen after the fix).
  const plnEmail = `sep_stat_plain_${stamp}@example.com`;
  const plnUid = await makeUser(plnEmail, null);
  await db.collection("users").doc(plnUid).set({ email: plnEmail, tier: "free", portfolioCount: 0 });
  const s2 = await readStats();
  assert.strictEqual(s2.totalUsers, s1.totalUsers + 1, "a plain user must still be counted");
  assert.strictEqual(s2.freeUsers, s1.freeUsers + 1, "a plain free user must still be counted in the free total");
});

test("CRYP-103: findDuplicateEmails does not report an admin account's email as a duplicate", async () => {
  const ownerToken = await idTokenFor(OWNER_EMAIL);

  // The Auth emulator's create-time email-uniqueness check is bypassed by importUsers (a
  // migration API), so it's the deterministic way to force the duplicate-email pair this
  // detector exists to surface. Both records of a pair MUST go in ONE importUsers batch:
  // the migration API does not cross-check emails WITHIN a batch, but a second, separate
  // import collides against the first record already in the store and is dropped (returns
  // { failureCount: 1 } without throwing), leaving the second uid uncreated.
  const adminDupEmail = `sep_admindup_${stamp}@example.com`;
  const aUid = `sep_admindupA_${stamp}`, bUid = `sep_admindupB_${stamp}`;
  const adminImport = await auth.importUsers([{ uid: aUid, email: adminDupEmail }, { uid: bUid, email: adminDupEmail }]);
  assert.strictEqual(adminImport.failureCount, 0, `importUsers must create both admin duplicate-email records: ${JSON.stringify(adminImport.errors)}`);
  await auth.setCustomUserClaims(aUid, { admin: true, role: "manager" });
  await auth.setCustomUserClaims(bUid, { admin: true, role: "owner" });

  // A genuine plain-user duplicate — the POSITIVE control the detector must STILL report.
  const plainDupEmail = `sep_plaindup_${stamp}@example.com`;
  const plainImport = await auth.importUsers([{ uid: `sep_plaindupA_${stamp}`, email: plainDupEmail }, { uid: `sep_plaindupB_${stamp}`, email: plainDupEmail }]);
  assert.strictEqual(plainImport.failureCount, 0, `importUsers must create both plain duplicate-email records: ${JSON.stringify(plainImport.errors)}`);

  const res = await callAs("findDuplicateEmails", ownerToken, {});
  assert.strictEqual(res.status, 200, `findDuplicateEmails failed: ${JSON.stringify(res.body)}`);
  const emails = res.body.result.groups.map((g) => g.email);

  // Construction sanity: the plain-user duplicate really was created + detected. If this
  // fails, importUsers didn't produce a duplicate in this environment (fix the harness),
  // rather than the fix silently over-filtering.
  assert.ok(emails.includes(plainDupEmail), "a genuine plain-user duplicate must still be reported");
  // THE assertion: the admin-only duplicate is filtered out.
  assert.ok(!emails.includes(adminDupEmail), "an admin account's email must NOT be reported as a duplicate");
});

test("CRYP-103: listAdmins returns every admin for an owner; refuses a manager and a plain user", async () => {
  // listAdmins does not exist yet — an owner-only roster read, keyed off the claim, that
  // returns { uid, email, role, disabled, lastSignInTime } for every admin. Today the
  // callable is absent, so the emulator 404s and the owner-success assertion fails: red
  // for the right reason. The functions-builder adds the body + its assertOwner gate.
  const ownerToken = await idTokenFor(OWNER_EMAIL);
  const mgrEmail = `sep_roster_mgr_${stamp}@example.com`;
  const plainEmail = `sep_roster_plain_${stamp}@example.com`;
  await makeUser(mgrEmail, { admin: true, role: "manager" });
  await makeUser(plainEmail, null);
  const mgrToken = await idTokenFor(mgrEmail);
  const plainToken = await idTokenFor(plainEmail);

  const ok = await callAsSafe("listAdmins", ownerToken, {});
  assert.strictEqual(ok.status, 200, `owner listAdmins must succeed: ${JSON.stringify(ok.body)}`);
  const admins = ok.body.result.admins;
  assert.ok(Array.isArray(admins), "listAdmins must return an admins array");
  const byEmail = new Map(admins.map((a) => [a.email, a]));

  // Owner AND manager both appear, keyed off the claim (not the role string).
  assert.ok(byEmail.has(OWNER_EMAIL), "the owner must be in the roster");
  assert.strictEqual(byEmail.get(OWNER_EMAIL).role, "owner");
  assert.ok(byEmail.has(mgrEmail), "the manager must be in the roster");
  assert.strictEqual(byEmail.get(mgrEmail).role, "manager");
  // The record shape the roster renders.
  for (const k of ["uid", "email", "role", "disabled", "lastSignInTime"]) {
    assert.ok(k in byEmail.get(mgrEmail), `each roster record must carry "${k}"`);
  }
  // A plain user is never in the roster.
  assert.ok(!byEmail.has(plainEmail), "a plain user must never appear in the admin roster");

  // Owner-only READ: a manager is refused (permission-denied → 403)…
  const asMgr = await callAsSafe("listAdmins", mgrToken, {});
  assert.strictEqual(asMgr.status, 403, `a manager must be refused listAdmins, got ${asMgr.status}: ${JSON.stringify(asMgr.body)}`);
  // …and a plain user is refused too.
  const asPlain = await callAsSafe("listAdmins", plainToken, {});
  assert.strictEqual(asPlain.status, 403, `a plain user must be refused listAdmins, got ${asPlain.status}: ${JSON.stringify(asPlain.body)}`);
});
