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
import http from "node:http";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

// firebase-admin lives in functions/node_modules, not the app's — resolve it from there.
const requireFromFunctions = createRequire(new URL("../functions/", import.meta.url));
const admin = requireFromFunctions("firebase-admin");
// Modular subpath accessors (firebase-admin v13+ removed the namespaced admin.auth()/
// admin.firestore() forms). Resolve them from functions/node_modules too.
const { getAuth } = requireFromFunctions("firebase-admin/auth");
const { getFirestore, FieldValue } = requireFromFunctions("firebase-admin/firestore");
// ADMIN-6 PR2: the pure crypto core, to craft/redeem reset tokens deterministically.
const settingsAuthMod = requireFromFunctions("./settings-auth.js");
// Plan B PR-E2: the pure token-cost helper, to compute the EXACT metered cents the
// researchAsk callable must accrue (generation rate + judge rate).
const aiCost = requireFromFunctions("./ai-cost.js");

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
// CRYP-113: payments ship OFF by default — a config/app.flags.paidPlansEnabled switch
// (default OFF; ON only on exact true) that pauses NEW paid subscriptions and drives the
// launch-free UI. An absent key, a config that predates the flag, or an unreadable config
// all read OFF; only an explicit true enables paid plans. It gates the
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

test("CRYP-101: createSubscription refuses when paidPlansEnabled is ABSENT (CRYP-113 default OFF — paused, nothing written)", async () => {
  const email = `paidabsent_${stamp}@example.com`;
  const uid = await makeUser(email, null);
  await db.collection("users").doc(uid).set({ email, name: "PaidAbsent", tier: "free", portfolioCount: 1 });
  const token = await idTokenFor(email);
  // CRYP-113: a MISSING key now reads OFF (default-OFF), so a fresh / unconfigured deploy
  // is paused with no admin action — the inverse of the old default-ON behaviour.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: FieldValue.delete() } }, { merge: true });

  const res = await callAs("createSubscription", token, { plan: "pro" });
  assert.strictEqual(res.status, 400, `expected failed-precondition (400), got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body.error && res.body.error.status, "FAILED_PRECONDITION");
  assert.match(
    String(res.body.error && res.body.error.message),
    /paused/i,
    "an absent paidPlansEnabled must refuse with the launch-free 'paused' message (default OFF)",
  );
  // No side effects: no tier change, no subscription, no billing cycle.
  const after = await userDoc(uid);
  assert.strictEqual(after.tier, "free", "tier must be untouched");
  assert.strictEqual(after.subscription, undefined, "no subscription may be created");
  assert.strictEqual(after.billingCycle, undefined, "no billing cycle may be recorded");
});

test("CRYP-113: createSubscription proceeds past the paid gate ONLY when paidPlansEnabled is explicitly true", async () => {
  const email = `paidon_${stamp}@example.com`;
  const uid = await makeUser(email, null);
  await db.collection("users").doc(uid).set({ email, name: "PaidOn", tier: "free", portfolioCount: 1 });
  const token = await idTokenFor(email);
  // Only an explicit true enables paid plans now. CRYP-113 ALSO flips `checkout` to
  // default-OFF, so reaching the checkout stage past the paid gate needs BOTH gates open:
  // enable checkout explicitly too, else createSubscription refuses at the (now default-off)
  // checkout kill-switch instead of proving it cleared the paid gate.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: true, features: { checkout: true } } }, { merge: true });

  const res = await callAs("createSubscription", token, { plan: "pro" });
  const msg = String((res.body.error && res.body.error.message) || "");
  // It must NOT be blocked by the launch-free pause…
  assert.ok(!/paused/i.test(msg), `must not be paused when the flag is true; got ${JSON.stringify(res.body)}`);
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

test("CRYP-101: /api/config publishes paidPlansEnabled (absent → false, explicit false → false, explicit true → true)", async () => {
  const apiConfigUrl = `http://127.0.0.1:${FN_PORT}/${PROJECT}/us-central1/api/config`;

  // CRYP-113: absent key → default OFF (a fresh/unconfigured deploy publishes paused).
  await db.doc("config/app").set({ flags: { paidPlansEnabled: FieldValue.delete() } }, { merge: true });
  let cfg = await fetch(apiConfigUrl).then((r) => r.json());
  assert.strictEqual(cfg.paidPlansEnabled, false, `absent flag must publish false (default OFF), got ${JSON.stringify(cfg.paidPlansEnabled)}`);

  // Explicit false → OFF.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: false } }, { merge: true });
  cfg = await fetch(apiConfigUrl).then((r) => r.json());
  assert.strictEqual(cfg.paidPlansEnabled, false, `explicit false must publish false, got ${JSON.stringify(cfg.paidPlansEnabled)}`);

  // Explicit true → ON (only an explicit true enables paid plans now).
  await db.doc("config/app").set({ flags: { paidPlansEnabled: true } }, { merge: true });
  cfg = await fetch(apiConfigUrl).then((r) => r.json());
  assert.strictEqual(cfg.paidPlansEnabled, true, `explicit true must publish true, got ${JSON.stringify(cfg.paidPlansEnabled)}`);
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
    "an omitted paidPlansEnabled must be KEPT (per-key merge), not silently flipped",
  );
});

test("CRYP-113: saveConfig KEEPS a stored paidPlansEnabled=true when a flags payload omits it", async () => {
  const ownerToken = await idTokenFor(OWNER_EMAIL);
  // Paid mode explicitly enabled and stored.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: true } }, { merge: true });
  // An App-Controls maintenance toggle posts `flags` WITHOUT paidPlansEnabled.
  const res = await callAs("saveConfig", ownerToken, { flags: { maintenance: false, signupsEnabled: true } });
  assert.strictEqual(res.status, 200, `saveConfig failed: ${JSON.stringify(res.body)}`);
  const stored = (await db.doc("config/app").get()).data();
  assert.strictEqual(
    stored.flags.paidPlansEnabled, true,
    "an omitted paidPlansEnabled=true must be KEPT (per-key merge), not reset to the CRYP-113 default-off",
  );
});

// ── Plan B PR-E1 · app-wide AI monthly $-cap round-trip (config plumbing) ──
// The Wave-B AI proxy is bounded by ONE app-wide monthly $-cap at
// config/app.ai.monthlyCapCents (default 5000 = $50). Unlike the provider key it is
// NOT a secret, so getAdminConfig must surface it as a FULL NUMBER the Settings form can
// show and edit — while the key next to it stays a set-flag whose value never leaves the
// server. This runs in CI (the functions emulator can't boot in the authoring sandbox).
// RED today: getAdminConfig returns `ai: { providerKeySet, generationModel, judgeModel, ... }`, so
// cfg.ai.monthlyCapCents is undefined and the number assertion fails — red for the right
// reason. The config-builder adds the read projection; then this goes green.
test("PR-E1: getAdminConfig surfaces ai.monthlyCapCents as a full number; the provider key stays a set-flag", async () => {
  const ownerToken = await idTokenFor(OWNER_EMAIL);
  // Seed the app-wide cap AND a secret key directly (Admin SDK bypasses rules). No
  // settingsAuth is set here, so getAdminConfig takes the bootstrap step-up path that a
  // fresh owner login token satisfies.
  await db.doc("config/app").set(
    { ai: { providerKey: "PROVIDER-SECRET-E1", generationModel: "gen-x", judgeModel: "judge-x", monthlyCapCents: 6000 } },
    { merge: true },
  );
  try {
    const res = await callAs("getAdminConfig", ownerToken, {});
    assert.strictEqual(res.status, 200, `getAdminConfig failed: ${JSON.stringify(res.body)}`);
    const cfg = res.body.result;
    // The cap is operational config, not a secret — it round-trips as a full number.
    assert.strictEqual(
      cfg.ai.monthlyCapCents, 6000,
      `ai.monthlyCapCents must return as a full number, got ${JSON.stringify(cfg.ai && cfg.ai.monthlyCapCents)}`,
    );
    // The provider key is a secret — it returns ONLY as a boolean set-flag…
    assert.strictEqual(cfg.ai.providerKeySet, true, "providerKey must still report as set");
    // …and its VALUE never appears anywhere in the response (the keep() guard, intact).
    assert.ok(
      !JSON.stringify(res.body).includes("PROVIDER-SECRET-E1"),
      "the raw provider key must NEVER leave the server",
    );
  } finally {
    await db.doc("config/app").set({ ai: FieldValue.delete() }, { merge: true });
  }
});

// ── Plan B PR-C2 · scheduleProDowngrade — future-start Pro pre-authorization ──
// A Premium user's Pro downgrade schedules a REAL future-start PayPal Pro subscription
// (server returns an approvalUrl; the client redirects). scheduleProDowngrade({billing})
// is the callable BODY — the only tier that runs it. Its gate order MIRRORS
// createSubscription exactly:
//   auth → assertNoUnknownKeys(data,["billing"]) → fresh config →
//   paidPlansEnabled=false ⇒ paused → checkout off ⇒ unavailable →
//   non-premium caller ⇒ failed-precondition → already-scheduled (subscription.scheduledPro
//   present) ⇒ refused → [premium, clean] ⇒ reaches the PayPal boundary.
// These run in CI (the functions emulator can't boot in the authoring sandbox — egress
// policy). RED today: the callable does not exist yet, so the emulator 404s every call and
// the status assertions (401/400/200) fail — red for the right reason. Uses callAsSafe (a
// 404 has a plain-text body that callAs's r.json() would throw on). The functions-builder
// adds the body + wires the gates + the PayPal scheduling; then these go green.

test("PR-C2: scheduleProDowngrade rejects unauthenticated callers and unknown data keys", async () => {
  const email = `c2_gate_${stamp}@example.com`;
  const uid = await makeUser(email, null);
  await db.collection("users").doc(uid).set(
    { email, name: "C2", tier: "premium", subscription: { cancelled: false, endDate: "2027-01-01T00:00:00.000Z" } },
    { merge: true },
  );
  const token = await idTokenFor(email);
  // Everything ON so we exercise the input gates, not the switches.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: true, features: { checkout: true } } }, { merge: true });

  // Unauthenticated → 401.
  const noAuth = await fetch(callableUrl("scheduleProDowngrade"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { billing: "monthly" } }),
  });
  assert.strictEqual(noAuth.status, 401, "an unauthenticated call must be rejected");

  // Unknown top-level key → invalid-argument (400) — the allow-list is ["billing"].
  const badKey = await callAsSafe("scheduleProDowngrade", token, { billing: "monthly", sneaky: 1 });
  assert.strictEqual(badKey.status, 400, `unknown key should be rejected: ${JSON.stringify(badKey.body)}`);
  assert.strictEqual(badKey.body && badKey.body.error && badKey.body.error.status, "INVALID_ARGUMENT");
});

test("PR-C2: scheduleProDowngrade is paused when paidPlansEnabled=false (takes precedence over checkout)", async () => {
  const email = `c2_paused_${stamp}@example.com`;
  const uid = await makeUser(email, null);
  await db.collection("users").doc(uid).set(
    { email, name: "C2P", tier: "premium", subscription: { cancelled: false, endDate: "2027-01-01T00:00:00.000Z" } },
    { merge: true },
  );
  const token = await idTokenFor(email);
  // Launch-free ON — nothing new may be sold, even a scheduled downgrade.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: false } }, { merge: true });

  const res = await callAsSafe("scheduleProDowngrade", token, { billing: "monthly" });
  assert.strictEqual(res.status, 400, `expected failed-precondition (400), got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body && res.body.error && res.body.error.status, "FAILED_PRECONDITION");
  assert.match(String(res.body && res.body.error && res.body.error.message), /paused/i, "must refuse with the launch-free 'paused' message");
  // No schedule written. (C3b-server: the marker field is RENAMED scheduledPro → scheduledNext.)
  assert.strictEqual((await userDoc(uid)).subscription.scheduledNext, undefined, "no schedule may be created while paused");
});

test("PR-C2: scheduleProDowngrade is unavailable when the checkout kill-switch is off", async () => {
  const email = `c2_checkout_${stamp}@example.com`;
  const uid = await makeUser(email, null);
  await db.collection("users").doc(uid).set(
    { email, name: "C2C", tier: "premium", subscription: { cancelled: false, endDate: "2027-01-01T00:00:00.000Z" } },
    { merge: true },
  );
  const token = await idTokenFor(email);
  // Paid plans ON, but the checkout kill-switch is off.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: true, features: { checkout: false } } }, { merge: true });

  const res = await callAsSafe("scheduleProDowngrade", token, { billing: "monthly" });
  assert.strictEqual(res.status, 400, `expected failed-precondition (400), got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body && res.body.error && res.body.error.status, "FAILED_PRECONDITION");
  assert.match(String(res.body && res.body.error && res.body.error.message), /unavailable/i, "must refuse with the checkout-off 'unavailable' message");
});

test("PR-C2: scheduleProDowngrade refuses a non-premium caller, and an already-scheduled premium caller", async () => {
  // Everything ON so we reach the premium/already-scheduled gates.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: true, features: { checkout: true } } }, { merge: true });

  // A free-tier caller cannot schedule a Pro downgrade — there is no premium to downgrade FROM.
  const freeEmail = `c2_free_${stamp}@example.com`;
  const freeUid = await makeUser(freeEmail, null);
  await db.collection("users").doc(freeUid).set({ email: freeEmail, name: "C2F", tier: "free", portfolioCount: 1 }, { merge: true });
  const freeToken = await idTokenFor(freeEmail);
  const asFree = await callAsSafe("scheduleProDowngrade", freeToken, { billing: "monthly" });
  assert.strictEqual(asFree.status, 400, `a non-premium caller must be refused, got ${asFree.status}: ${JSON.stringify(asFree.body)}`);
  assert.strictEqual(asFree.body && asFree.body.error && asFree.body.error.status, "FAILED_PRECONDITION");

  // A premium caller who ALREADY has a scheduled sub is refused (no double schedule).
  // C3b-server: the pending marker is now scheduledNext{tier,…}.
  const schedEmail = `c2_sched_${stamp}@example.com`;
  const schedUid = await makeUser(schedEmail, null);
  await db.collection("users").doc(schedUid).set({
    email: schedEmail, name: "C2S", tier: "premium",
    subscription: { cancelled: true, downgradeTo: "pro", endDate: "2027-01-01T00:00:00.000Z",
      scheduledNext: { tier: "pro", subId: "I-PRO-EXISTING", billing: "monthly", startDate: "2027-01-01T00:00:00.000Z", approved: false } },
  }, { merge: true });
  const schedToken = await idTokenFor(schedEmail);
  const asScheduled = await callAsSafe("scheduleProDowngrade", schedToken, { billing: "monthly" });
  assert.strictEqual(asScheduled.status, 400, `an already-scheduled premium caller must be refused, got ${asScheduled.status}: ${JSON.stringify(asScheduled.body)}`);
  assert.strictEqual(asScheduled.body && asScheduled.body.error && asScheduled.body.error.status, "FAILED_PRECONDITION");
  // The existing schedule is untouched (no overwrite).
  assert.strictEqual((await userDoc(schedUid)).subscription.scheduledNext.subId, "I-PRO-EXISTING", "the existing schedule must be preserved");
});

test("PR-C2: an authorized premium caller reaches PAST the gates (schedule written, or the PayPal boundary — no live PayPal call)", async () => {
  const email = `c2_ok_${stamp}@example.com`;
  const uid = await makeUser(email, null);
  await db.collection("users").doc(uid).set(
    { email, name: "C2OK", tier: "premium", subscription: { cancelled: false, endDate: "2027-01-01T00:00:00.000Z" } },
    { merge: true },
  );
  const token = await idTokenFor(email);
  // Everything ON, no existing schedule → the call must pass every gate.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: true, features: { checkout: true } } }, { merge: true });

  const res = await callAsSafe("scheduleProDowngrade", token, { billing: "monthly" });
  const msg = String((res.body && res.body.error && res.body.error.message) || "");
  // Not blocked by any gate (mirrors createSubscription's default-ON reachability probe)…
  assert.ok(!/paused|unavailable/i.test(msg), `must not be gate-blocked for an eligible premium caller; got ${JSON.stringify(res.body)}`);
  // …it either wrote the pending schedule (DEV/emulator branch, synthetic subId) OR reached the
  // PayPal boundary (no PayPal env here → "plan not configured"/approval/token). Either proves
  // reachability + gating WITHOUT a live PayPal round-trip.
  assert.ok(
    res.status === 200 || /plan not configured|paypal|approval|token/i.test(msg),
    `expected to reach the PayPal boundary past the gates, got ${res.status}: ${JSON.stringify(res.body)}`,
  );
  // If it wrote the pending schedule, the marker shape is the tier-carrying one (pending, not yet
  // approved). C3b-server RENAMED scheduledPro → scheduledNext{tier,…}; scheduleProDowngrade schedules tier "pro".
  if (res.status === 200) {
    const after = await userDoc(uid);
    assert.ok(after.subscription && after.subscription.scheduledNext, "a written schedule must carry subscription.scheduledNext");
    assert.strictEqual(after.subscription.scheduledNext.tier, "pro", "scheduleProDowngrade schedules a PRO sub (tier carried on the marker)");
    assert.strictEqual(after.subscription.scheduledNext.approved, false, "a freshly scheduled Pro is PENDING (approved:false) until the webhook");
    assert.strictEqual(after.tier, "premium", "tier must stay premium during the scheduled window");
    // PR-C3a (marker-first reconciliation): the marker now carries a `cancelPending` breadcrumb —
    // the live Premium sub id still needing cancellation — written BEFORE Premium is cancelled so a
    // mid-op crash never strands a premium account with no billing marker (Finding #3). In DEV/
    // emulator there is no real Premium sub to cancel, so the breadcrumb is present but null. The
    // key must EXIST (the shape is wired through the callable), and be null.
    assert.ok("cancelPending" in after.subscription, "the marker-first schedule must carry the cancelPending breadcrumb key");
    assert.strictEqual(after.subscription.cancelPending, null, "in DEV there is no Premium sub to cancel, so cancelPending is null");
  }
});

// ── Plan B PR-C2 · SECURITY FIX — eager-cancel Premium; "Keep my plan" is fail-closed ──
// The lazy-cancel impl let reactivateSubscription reactivate a terminally-cancelled Premium sub
// on a scheduled-Pro marker → premium access with no live subscription (a [HIGH] paywall bypass).
// The fix cancels Premium at SCHEDULE time, so "Keep my plan" can NOT reinstate it: it must
// cancel the SCHEDULED Pro sub, KEEP the cancellation (target free), and let the account lapse at
// endDate (routing the user to re-subscribe). This is the callable-BODY regression test (the only
// tier that runs the body). Runs in CI — the functions emulator can't boot in the authoring
// sandbox. RED today: reactivateSubscription writes `{...rest, cancelled:false}` (drops the
// cancel + downgradeTo), so `after.subscription.cancelled` is false, not true.

test("PR-C2 (security): reactivateSubscription on a scheduled-Next marker is fail-closed — drops the schedule, KEEPS the cancel, never premium-forever", async () => {
  const email = `c2_keep_${stamp}@example.com`;
  const uid = await makeUser(email, null);
  // A premium user mid-window with an APPROVED scheduled future-start Pro sub. The Premium PayPal
  // sub was already terminally cancelled at schedule time (eager-cancel), so "Keep my plan"
  // cannot reinstate it — it must cancel the scheduled sub and let the account lapse to free.
  // C3b-server: the marker field is RENAMED scheduledPro → scheduledNext{tier,…}.
  await db.collection("users").doc(uid).set({
    email, name: "C2Keep", tier: "premium", paypalSubscriptionId: "I-PREM",
    subscription: {
      cancelled: true, cancelledAt: 100, downgradeTo: "pro", endDate: "2027-01-01T00:00:00.000Z",
      scheduledNext: { tier: "pro", subId: "I-PRO", billing: "monthly", startDate: "2027-01-01T00:00:00.000Z", approved: true },
    },
  }, { merge: true });
  const token = await idTokenFor(email);

  const res = await callAs("reactivateSubscription", token, {});
  assert.strictEqual(res.status, 200, `reactivateSubscription failed: ${JSON.stringify(res.body)}`);

  const after = await userDoc(uid);
  // The scheduled sub is dropped from the marker (its PayPal sub is being cancelled).
  assert.strictEqual(after.subscription.scheduledNext, undefined, "the scheduled sub must be dropped from the marker");
  // THE [HIGH]-bug regression: the cancel is NOT reversed to a premium-forever sub — cancelled
  // STAYS true and the target is free, so the account lapses at endDate.
  assert.strictEqual(after.subscription.cancelled, true, "keep must NOT reinstate a terminally-cancelled Premium (cancelled stays true)");
  assert.strictEqual(after.subscription.downgradeTo, "free", "keep on a scheduled-Pro marker is fail-closed to free");
  // Access continues to the period end — tier stays premium; the daily sweep drops it at endDate.
  assert.strictEqual(after.tier, "premium", "tier stays premium — access continues to endDate, the sweep drops it");
});

// The SINGLE-CLICK plain-downgrade trigger of the same [HIGH]: a plain Premium→Starter
// cancelSubscription leaves a LEGACY cancel-to-free marker (no scheduledNext). Its PayPal sub is
// ALSO already terminally cancelled (cancelSubscription POSTs /cancel before marking), so a lone
// "Keep my plan" must NOT un-cancel it back to premium-forever. RED today: keepPlanPatch's legacy
// branch writes `{...rest, cancelled:false}`, so the persisted marker flips to cancelled:false —
// the account is premium with no live sub and the sweep never drops it (paywall bypass).
test("PR-C2 (security): reactivateSubscription on a legacy cancel-to-free marker (no scheduledNext) keeps cancelled:true — never premium-forever", async () => {
  const email = `c2_legacy_${stamp}@example.com`;
  const uid = await makeUser(email, null);
  // A premium user who plainly cancelled to Starter: cancelled + downgradeTo:"free", NO scheduledNext.
  await db.collection("users").doc(uid).set({
    email, name: "C2Legacy", tier: "premium", paypalSubscriptionId: "I-PREM",
    subscription: { cancelled: true, cancelledAt: 100, downgradeTo: "free", endDate: "2027-01-01T00:00:00.000Z" },
  }, { merge: true });
  const token = await idTokenFor(email);

  const res = await callAs("reactivateSubscription", token, {});
  assert.strictEqual(res.status, 200, `reactivateSubscription failed: ${JSON.stringify(res.body)}`);

  const after = await userDoc(uid);
  // THE [HIGH]-bug regression: the cancel is NOT reversed — cancelled STAYS true, so the daily
  // sweep still drops the account to free at endDate (no live sub behind a "premium" tier).
  assert.strictEqual(after.subscription.cancelled, true, "keep must NOT un-cancel a terminally-cancelled sub (cancelled stays true)");
  // tier is left alone — access continues to endDate; the sweep flips it.
  assert.strictEqual(after.tier, "premium", "tier is untouched by reactivate (the sweep drops it at endDate)");
});

// ── Plan B PR-C3b-server · resubscribePremium — seamless future-start Premium re-subscribe ──
// A cancelled-Premium user (tier:"premium", subscription.cancelled:true, and NO pending
// scheduledNext) schedules a REAL future-start PayPal PREMIUM subscription that first-charges when
// the current period ends, so the account stays Premium seamlessly with a real payment. It shares
// ONE engine with scheduleProDowngrade (billing.scheduleNextMarkerPatch, tier-carrying) and the
// SAME gate order:
//   auth → assertNoUnknownKeys(["billing"]) → fresh config → paidPlansEnabled MASTER (before
//   checkout) → checkout kill-switch → precondition (premium & cancelled & NO scheduledNext) →
//   60s cooldown → the PayPal boundary. Acts on context.auth.uid only (no IDOR — never a body uid).
// FOUNDER precondition: re-subscribe REQUIRES "Keep my plan" first — a still-pending scheduledNext
// downgrade is REFUSED ("cancel the scheduled downgrade first"), NOT auto-cancelled.
// RED today: the callable does not exist yet, so the emulator 404s every call and the status
// assertions (401/400/200) fail — red for the right reason. Uses callAsSafe (a 404 body is plain
// text that callAs's r.json() would throw on). CI-only (the functions emulator can't boot in the
// authoring sandbox — egress policy). The functions-builder adds the body + wires the gates + the
// PayPal Premium scheduling; then these go green.

// A cancelled-Premium (eligible) account: premium tier, a cancelled marker, no pending scheduledNext.
async function seedCancelledPremium(email, name) {
  const uid = await makeUser(email, null);
  await db.collection("users").doc(uid).set(
    { email, name, tier: "premium", paypalSubscriptionId: "I-PREM",
      subscription: { cancelled: true, downgradeTo: "free", endDate: "2027-01-01T00:00:00.000Z" } },
    { merge: true },
  );
  return uid;
}

test("PR-C3b-server: resubscribePremium rejects unauthenticated callers and unknown data keys", async () => {
  const email = `c3b_gate_${stamp}@example.com`;
  const uid = await seedCancelledPremium(email, "C3b");
  const token = await idTokenFor(email);
  // Everything ON so we exercise the input gates, not the switches.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: true, features: { checkout: true } } }, { merge: true });

  // Unauthenticated → 401.
  const noAuth = await fetch(callableUrl("resubscribePremium"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { billing: "monthly" } }),
  });
  assert.strictEqual(noAuth.status, 401, "an unauthenticated call must be rejected");

  // Unknown top-level key → invalid-argument (400) — the allow-list is ["billing"].
  const badKey = await callAsSafe("resubscribePremium", token, { billing: "monthly", sneaky: 1 });
  assert.strictEqual(badKey.status, 400, `unknown key should be rejected: ${JSON.stringify(badKey.body)}`);
  assert.strictEqual(badKey.body && badKey.body.error && badKey.body.error.status, "INVALID_ARGUMENT");
  void uid;
});

test("PR-C3b-server: resubscribePremium is paused when paidPlansEnabled=false (takes precedence over checkout)", async () => {
  const email = `c3b_paused_${stamp}@example.com`;
  const uid = await seedCancelledPremium(email, "C3bP");
  const token = await idTokenFor(email);
  // Launch-free ON — nothing new may be sold, even a seamless re-subscribe.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: false } }, { merge: true });

  const res = await callAsSafe("resubscribePremium", token, { billing: "monthly" });
  assert.strictEqual(res.status, 400, `expected failed-precondition (400), got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body && res.body.error && res.body.error.status, "FAILED_PRECONDITION");
  assert.match(String(res.body && res.body.error && res.body.error.message), /paused/i, "must refuse with the launch-free 'paused' message");
  // No schedule written.
  assert.strictEqual((await userDoc(uid)).subscription.scheduledNext, undefined, "no schedule may be created while paused");
});

test("PR-C3b-server: resubscribePremium is unavailable when the checkout kill-switch is off", async () => {
  const email = `c3b_checkout_${stamp}@example.com`;
  await seedCancelledPremium(email, "C3bC");
  const token = await idTokenFor(email);
  // Paid plans ON, but the checkout kill-switch is off.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: true, features: { checkout: false } } }, { merge: true });

  const res = await callAsSafe("resubscribePremium", token, { billing: "monthly" });
  assert.strictEqual(res.status, 400, `expected failed-precondition (400), got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body && res.body.error && res.body.error.status, "FAILED_PRECONDITION");
  assert.match(String(res.body && res.body.error && res.body.error.message), /unavailable/i, "must refuse with the checkout-off 'unavailable' message");
});

test("PR-C3b-server: resubscribePremium refuses a non-premium, a non-cancelled premium, and a premium with a still-pending scheduledNext", async () => {
  // Everything ON so we reach the precondition gates.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: true, features: { checkout: true } } }, { merge: true });

  // (a) a free caller — there is no Premium to re-subscribe.
  const freeEmail = `c3b_free_${stamp}@example.com`;
  const freeUid = await makeUser(freeEmail, null);
  await db.collection("users").doc(freeUid).set({ email: freeEmail, name: "C3bF", tier: "free", portfolioCount: 1 }, { merge: true });
  const asFree = await callAsSafe("resubscribePremium", await idTokenFor(freeEmail), { billing: "monthly" });
  assert.strictEqual(asFree.status, 400, `a non-premium caller must be refused, got ${asFree.status}: ${JSON.stringify(asFree.body)}`);
  assert.strictEqual(asFree.body && asFree.body.error && asFree.body.error.status, "FAILED_PRECONDITION");

  // (b) a HEALTHY (non-cancelled) premium — there is no cancellation to reverse, so re-subscribe
  // is a no-op that must be refused (the founder precondition requires cancelled===true).
  const liveEmail = `c3b_live_${stamp}@example.com`;
  const liveUid = await makeUser(liveEmail, null);
  await db.collection("users").doc(liveUid).set(
    { email: liveEmail, name: "C3bL", tier: "premium", subscription: { cancelled: false, endDate: "2027-01-01T00:00:00.000Z" } },
    { merge: true },
  );
  const asLive = await callAsSafe("resubscribePremium", await idTokenFor(liveEmail), { billing: "monthly" });
  assert.strictEqual(asLive.status, 400, `a non-cancelled premium must be refused, got ${asLive.status}: ${JSON.stringify(asLive.body)}`);
  assert.strictEqual(asLive.body && asLive.body.error && asLive.body.error.status, "FAILED_PRECONDITION");

  // (c) THE founder precondition: a cancelled premium that STILL has a pending scheduledNext
  // downgrade must be refused — "cancel the scheduled downgrade first" (re-subscribe requires a
  // prior "Keep my plan"; it is NOT a one-click-from-scheduled handler).
  const schedEmail = `c3b_sched_${stamp}@example.com`;
  const schedUid = await makeUser(schedEmail, null);
  await db.collection("users").doc(schedUid).set({
    email: schedEmail, name: "C3bS", tier: "premium",
    subscription: { cancelled: true, downgradeTo: "pro", endDate: "2027-01-01T00:00:00.000Z",
      scheduledNext: { tier: "pro", subId: "I-PRO-PENDING", billing: "monthly", startDate: "2027-01-01T00:00:00.000Z", approved: false } },
  }, { merge: true });
  const asSched = await callAsSafe("resubscribePremium", await idTokenFor(schedEmail), { billing: "monthly" });
  assert.strictEqual(asSched.status, 400, `a premium with a pending scheduledNext must be refused, got ${asSched.status}: ${JSON.stringify(asSched.body)}`);
  assert.strictEqual(asSched.body && asSched.body.error && asSched.body.error.status, "FAILED_PRECONDITION");
  assert.match(String(asSched.body && asSched.body.error && asSched.body.error.message), /schedul|downgrade|keep/i, "must tell the user to cancel the scheduled downgrade first");
  // The existing pending schedule is untouched (no overwrite).
  assert.strictEqual((await userDoc(schedUid)).subscription.scheduledNext.subId, "I-PRO-PENDING", "the existing schedule must be preserved");
});

test("PR-C3b-server: an eligible cancelled-Premium caller reaches PAST the gates and (DEV) writes scheduledNext{tier:'premium', approved:false, cancelPending:null}", async () => {
  const email = `c3b_ok_${stamp}@example.com`;
  const uid = await seedCancelledPremium(email, "C3bOK");
  const token = await idTokenFor(email);
  // Everything ON, no pending schedule → the call must pass every gate.
  await db.doc("config/app").set({ flags: { paidPlansEnabled: true, features: { checkout: true } } }, { merge: true });

  const res = await callAsSafe("resubscribePremium", token, { billing: "monthly" });
  const msg = String((res.body && res.body.error && res.body.error.message) || "");
  // Not blocked by any gate (mirrors scheduleProDowngrade's reachability probe)…
  assert.ok(!/paused|unavailable/i.test(msg), `must not be gate-blocked for an eligible caller; got ${JSON.stringify(res.body)}`);
  // …it either wrote the pending schedule (DEV/emulator branch, synthetic subId) OR reached the
  // PayPal boundary (no PayPal env here → "plan not configured"/approval/token). Either proves
  // reachability + gating WITHOUT a live PayPal round-trip.
  assert.ok(
    res.status === 200 || /plan not configured|paypal|approval|token/i.test(msg),
    `expected to reach the PayPal boundary past the gates, got ${res.status}: ${JSON.stringify(res.body)}`,
  );
  // If it wrote the pending schedule, the marker carries the target tier PREMIUM (the resubscribe engine).
  if (res.status === 200) {
    const after = await userDoc(uid);
    assert.ok(after.subscription && after.subscription.scheduledNext, "a written schedule must carry subscription.scheduledNext");
    assert.strictEqual(after.subscription.scheduledNext.tier, "premium", "resubscribePremium schedules a PREMIUM sub (tier carried on the marker)");
    assert.strictEqual(after.subscription.scheduledNext.approved, false, "a freshly scheduled sub is PENDING (approved:false) until the webhook");
    assert.strictEqual(after.tier, "premium", "tier stays premium during the scheduled window");
    // Marker-first (C3a) breadcrumb: the key must EXIST but be null — Premium was already terminally
    // cancelled (this is a re-subscribe AFTER "Keep my plan"), so there is no live sub to cancel.
    assert.ok("cancelPending" in after.subscription, "the marker-first schedule must carry the cancelPending breadcrumb key");
    assert.strictEqual(after.subscription.cancelPending, null, "Premium already terminally cancelled → no live sub to cancel → cancelPending is null");
  }
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

// CRYP-103: the "findDuplicateEmails does not report an admin account's email as a duplicate"
// integration test was intentionally REMOVED here. The Auth emulator categorically rejects
// duplicate-email accounts (auth/invalid-user-import — "Auth Emulator does not support importing
// duplicate email"; createUser/updateUser enforce it too), so the very state this detector exists
// to surface — two accounts sharing one email — is un-constructable at the integration tier. The
// admin-exclusion is now proven deterministically in tests/unit/duplicates.test.js (excludeAdmins
// + the admin-only-vs-plain-user composition), and findDuplicateEmails' admin gate is covered by
// tests/unit/admin-gate-coverage.test.js. Relocating an assertion off a tier where its precondition
// is physically impossible, onto one where the identical behaviour is deterministic, is not a
// weakening. The other three CRYP-103 integration tests (listUsers, getStats, listAdmins) still
// prove the same claim-skip end-to-end.

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

// ── ADMIN-SEP · CRYP-103b · Part C — server-BACKS the Part A1 client backstop ──
// PR1 hid the Suspend / Delete-Trash buttons for an admin target in the UI, but the SERVER
// only refused trash/delete on an admin — suspend / tier / limits were still permissive on a
// MANAGER target (assertTargetAllowed only protects OWNER targets). These prove PR2 closes that
// gap: suspend / tier / limits on ANY admin target are refused server-side (failed-precondition
// → HTTP 400), mirroring adminTrashUser's claim check, so "an admin can't be suspended at all"
// is enforced, not merely hidden. Red today (no admin-target check on those three). Runs in CI —
// the functions emulator can't boot in the authoring sandbox (egress policy), same as PR1.

test("CRYP-103: suspend / tier / limits / sign-out are all refused on an admin (manager) target", async () => {
  const ownerToken = await idTokenFor(OWNER_EMAIL);
  const mgrEmail = `sep_target_mgr_${stamp}@example.com`;
  const mgrUid = await makeUser(mgrEmail, { admin: true, role: "manager" });

  const susp = await callAs("suspendUser", ownerToken, { uid: mgrUid, disabled: true });
  assert.strictEqual(susp.status, 400, `suspending an admin must be refused, got ${susp.status}: ${JSON.stringify(susp.body)}`);
  // The refusal must be BEFORE the side effect: the Auth account stays enabled.
  assert.strictEqual((await auth.getUser(mgrUid)).disabled, false, "an admin target's Auth account must stay enabled");

  const tier = await callAs("setUserTier", ownerToken, { uid: mgrUid, tier: "premium" });
  assert.strictEqual(tier.status, 400, `setting an admin's tier must be refused, got ${tier.status}: ${JSON.stringify(tier.body)}`);

  const lim = await callAs("setPremiumLimits", ownerToken, { uid: mgrUid, limits: { coins: 5 } });
  assert.strictEqual(lim.status, 400, `setting an admin's limits must be refused, got ${lim.status}: ${JSON.stringify(lim.body)}`);

  // Sign-out is a moderation action too — refused on an admin target (secure-by-design LOW #1).
  const signOut = await callAs("adminSignOutUser", ownerToken, { uid: mgrUid });
  assert.strictEqual(signOut.status, 400, `signing out an admin must be refused, got ${signOut.status}: ${JSON.stringify(signOut.body)}`);

  // Positive control: a plain (non-admin) user is still suspendable — no over-refusal.
  const plainUid = await makeUser(`sep_target_plain_${stamp}@example.com`, null);
  const ok = await callAs("suspendUser", ownerToken, { uid: plainUid, disabled: true });
  assert.strictEqual(ok.status, 200, `a plain user must still be suspendable: ${JSON.stringify(ok.body)}`);
});

// CRYP-103b · Part C-1: the "no-role admin" third state is eliminated at the auth choke point.
// A { admin:true } claim with NO role must be REFUSED the manager (WRITE) surface — instead of
// silently getting full manager power (the old requireManager === requireAdmin alias). The READ
// surface (getStats/listUsers/…) is deliberately unchanged so a role-less admin can still read
// through the migration window. Red today: requireManager aliases requireAdmin, so a role-less
// admin's setUserTier succeeds.
test("CRYP-103: a no-role admin is refused the manager WRITE surface but keeps READ", async () => {
  const legacyEmail = `sep_legacy_${stamp}@example.com`;
  await makeUser(legacyEmail, { admin: true });     // pre-ADMIN-SEC flat claim, NO role
  const legacyToken = await idTokenFor(legacyEmail);
  const targetUid = await makeUser(`sep_legacy_target_${stamp}@example.com`, null);
  await db.collection("users").doc(targetUid).set({ email: "t", tier: "free", portfolioCount: 0 }, { merge: true });

  // WRITE surface: refused (permission-denied → 403).
  const write = await callAs("setUserTier", legacyToken, { uid: targetUid, tier: "pro" });
  assert.strictEqual(write.status, 403, `a no-role admin must be refused a manager action, got ${write.status}: ${JSON.stringify(write.body)}`);

  // READ surface: still works (migration window) — guards against over-tightening.
  const read = await callAs("getStats", legacyToken, {});
  assert.strictEqual(read.status, 200, `a no-role admin must keep the shared READ surface: ${JSON.stringify(read.body)}`);
});

// ── ADMIN-6 · Settings password (owner-only 2nd lock) — callable BODY behavior ──
// The only tier that runs the bodies (session-bound unlock, rate-limit, fresh-config gate).
// Placed LAST and cleaned up, because they set config/app.settingsAuth — every saveConfig
// test above runs in the bootstrap (no-password) path and must stay unaffected. Confirmed
// against functions/index.js: setSettingsPassword/unlockSettings are assertOwner-gated, and
// getAdminConfig/saveConfig gate on assertOwner + assertSettingsUnlocked (session-bound).

test("ADMIN-6: setSettingsPassword + unlockSettings are owner-only (a manager is refused at the body)", async () => {
  const mgrEmail = `a6_mgr_${stamp}@example.com`;
  await makeUser(mgrEmail, { admin: true, role: "manager" });
  const mgrToken = await idTokenFor(mgrEmail);
  const s1 = await callAs("setSettingsPassword", mgrToken, { next: "SettingsPw12345" });
  assert.strictEqual(s1.status, 403, `a manager must be refused setSettingsPassword, got ${s1.status}: ${JSON.stringify(s1.body)}`);
  const s2 = await callAs("unlockSettings", mgrToken, { password: "SettingsPw12345" });
  assert.strictEqual(s2.status, 403, `a manager must be refused unlockSettings, got ${s2.status}: ${JSON.stringify(s2.body)}`);
});

test("ADMIN-6: set → same-session saveConfig works; the unlock is session-bound; wrong password refused", async () => {
  const ownerUid = (await auth.getUserByEmail(OWNER_EMAIL)).uid;
  const token = await idTokenFor(OWNER_EMAIL);
  const SPW = "SettingsPw12345";
  // Clean slate: no Settings password, no stale unlock.
  await db.doc("config/app").set({ settingsAuth: FieldValue.delete() }, { merge: true });
  await db.doc(`settingsUnlock/${ownerUid}`).delete().catch(() => {});
  try {
    // First-time set — bootstrap path (the fresh login token satisfies requireFreshAuth).
    const set = await callAs("setSettingsPassword", token, { next: SPW });
    assert.strictEqual(set.status, 200, `set failed: ${JSON.stringify(set.body)}`);
    // The set granted a SESSION-BOUND unlock, so saveConfig with the SAME token succeeds.
    const ok = await callAs("saveConfig", token, { flags: { maintenance: false, signupsEnabled: true } });
    assert.strictEqual(ok.status, 200, `saveConfig with the granted unlock should succeed: ${JSON.stringify(ok.body)}`);

    // SEC-review #1: tamper the unlock doc's authTime so it no longer matches this token's
    // session → the unlock must NOT authorize (settings-locked = failed-precondition, HTTP 400).
    // This is the regression the fix closes: a uid-scoped unlock rode by another session.
    const stored = (await db.doc(`settingsUnlock/${ownerUid}`).get()).data() || {};
    await db.doc(`settingsUnlock/${ownerUid}`).set({ ...stored, authTime: 1 }, { merge: true });
    const locked = await callAs("saveConfig", token, { flags: { maintenance: false, signupsEnabled: true } });
    assert.strictEqual(locked.status, 400, `a session-mismatched unlock must not authorize saveConfig, got ${locked.status}: ${JSON.stringify(locked.body)}`);
    assert.match(JSON.stringify(locked.body), /settings-locked/, "should report settings-locked");

    // A wrong password is refused (permission-denied → 403).
    const bad = await callAs("unlockSettings", token, { password: "WrongPassword99" });
    assert.strictEqual(bad.status, 403, `a wrong Settings password must be refused, got ${bad.status}: ${JSON.stringify(bad.body)}`);

    // The correct password re-unlocks THIS session, and saveConfig works again.
    const unlock = await callAs("unlockSettings", token, { password: SPW });
    assert.strictEqual(unlock.status, 200, `unlock with the correct password should succeed: ${JSON.stringify(unlock.body)}`);
    const ok2 = await callAs("saveConfig", token, { flags: { maintenance: false, signupsEnabled: true } });
    assert.strictEqual(ok2.status, 200, `saveConfig after a real unlock should succeed: ${JSON.stringify(ok2.body)}`);
  } finally {
    // Restore the no-password state so nothing else sees a Settings lock.
    await db.doc("config/app").set({ settingsAuth: FieldValue.delete() }, { merge: true });
    await db.doc(`settingsUnlock/${ownerUid}`).delete().catch(() => {});
  }
});

// ── ADMIN-6 PR2 · emailed Settings-password reset — callable BODY behavior ──
// requestSettingsPwReset + completeSettingsPwReset SHARE one per-uid/day budget (key
// "settingsPwReset", limit 5), so each test clears that budget doc first to stay under it.
// The raw token never leaves the server (it's emailed/logged, not returned), so the redeem
// tests CRAFT the ledger doc directly via the pure hashToken — exactly what the server stores.
const RESET_DAY = new Date(stamp).toISOString().slice(0, 10);
async function clearResetBudget(uid) {
  // request + complete use SEPARATE per-uid/day budget keys (SEC-review #2) — clear both.
  await db.doc(`rateLimits/${uid}__settingsPwReset__${RESET_DAY}`).delete().catch(() => {});
  await db.doc(`rateLimits/${uid}__settingsPwComplete__${RESET_DAY}`).delete().catch(() => {});
}

test("ADMIN-6 PR2: the reset callables are owner-only (a manager is refused at the body)", async () => {
  const mgrEmail = `a6r_mgr_${stamp}@example.com`;
  await makeUser(mgrEmail, { admin: true, role: "manager" });
  const mgrToken = await idTokenFor(mgrEmail);
  const r1 = await callAs("requestSettingsPwReset", mgrToken, {});
  assert.strictEqual(r1.status, 403, `a manager must be refused requestSettingsPwReset, got ${r1.status}: ${JSON.stringify(r1.body)}`);
  const r2 = await callAs("completeSettingsPwReset", mgrToken, { token: "x", next: "NewSettingsPw123" });
  assert.strictEqual(r2.status, 403, `a manager must be refused completeSettingsPwReset, got ${r2.status}: ${JSON.stringify(r2.body)}`);
});

test("ADMIN-6 PR2: requestSettingsPwReset needs a password to exist, then mints a hashed uid-bound ledger doc", async () => {
  const ownerUid = (await auth.getUserByEmail(OWNER_EMAIL)).uid;
  const token = await idTokenFor(OWNER_EMAIL);
  await clearResetBudget(ownerUid);
  await db.doc("config/app").set({ settingsAuth: FieldValue.delete() }, { merge: true });
  try {
    // No Settings password → failed-precondition (HTTP 400).
    const none = await callAs("requestSettingsPwReset", token, {});
    assert.strictEqual(none.status, 400, `no Settings password → failed-precondition, got ${none.status}: ${JSON.stringify(none.body)}`);
    // Set one, then a request succeeds and writes an unused, uid-bound ledger doc.
    const rec = settingsAuthMod.hashPassword("SettingsPw12345");
    await db.doc("config/app").set({ settingsAuth: { ...rec, updatedAt: Date.now(), updatedBy: ownerUid } }, { merge: true });
    const ok = await callAs("requestSettingsPwReset", token, {});
    assert.strictEqual(ok.status, 200, `request should succeed: ${JSON.stringify(ok.body)}`);
    const snap = await db.collection("settingsPwReset").where("uid", "==", ownerUid).get();
    assert.ok(snap.docs.some((d) => d.data().used === false), "an unused settingsPwReset ledger doc should exist for the owner");
  } finally {
    await db.doc("config/app").set({ settingsAuth: FieldValue.delete() }, { merge: true });
    const gone = await db.collection("settingsPwReset").where("uid", "==", ownerUid).get();
    await Promise.all(gone.docs.map((d) => d.ref.delete()));
  }
});

test("ADMIN-6 PR2: completeSettingsPwReset redeems a token once, bound to the owner, honoring expiry", async () => {
  const ownerUid = (await auth.getUserByEmail(OWNER_EMAIL)).uid;
  const token = await idTokenFor(OWNER_EMAIL);
  const NEW = "ResetSettingsPw9";
  const rawOk = `a6r_ok_${stamp}`, rawExpired = `a6r_exp_${stamp}`, rawOther = `a6r_other_${stamp}`;
  const mk = (raw, over) => db.doc(`settingsPwReset/${settingsAuthMod.hashToken(raw)}`).set({ uid: ownerUid, expires: Date.now() + 60000, used: false, createdAt: Date.now(), ...over });
  await clearResetBudget(ownerUid);
  await db.doc("config/app").set({ settingsAuth: FieldValue.delete() }, { merge: true });
  try {
    // A valid token installs the new password (settingsAuth set + verifies) and burns the token.
    await mk(rawOk);
    const done = await callAs("completeSettingsPwReset", token, { token: rawOk, next: NEW });
    assert.strictEqual(done.status, 200, `complete should succeed: ${JSON.stringify(done.body)}`);
    const cfg = (await db.doc("config/app").get()).data();
    assert.ok(cfg.settingsAuth && cfg.settingsAuth.hash, "the new Settings password hash must be installed");
    assert.ok(settingsAuthMod.verifyPassword(NEW, cfg.settingsAuth), "the installed hash must verify the new password");
    const usedDoc = (await db.doc(`settingsPwReset/${settingsAuthMod.hashToken(rawOk)}`).get()).data();
    assert.strictEqual(usedDoc.used, true, "the redeemed token must be marked used");

    // Reusing the same token → refused (single-use).
    const reuse = await callAs("completeSettingsPwReset", token, { token: rawOk, next: NEW });
    assert.strictEqual(reuse.status, 403, `a used token must be refused, got ${reuse.status}: ${JSON.stringify(reuse.body)}`);
    // An expired token → refused.
    await mk(rawExpired, { expires: Date.now() - 1000 });
    const expired = await callAs("completeSettingsPwReset", token, { token: rawExpired, next: NEW });
    assert.strictEqual(expired.status, 403, `an expired token must be refused, got ${expired.status}: ${JSON.stringify(expired.body)}`);
    // A token bound to a DIFFERENT uid → refused.
    await mk(rawOther, { uid: "someone-else" });
    const other = await callAs("completeSettingsPwReset", token, { token: rawOther, next: NEW });
    assert.strictEqual(other.status, 403, `a token bound to another uid must be refused, got ${other.status}: ${JSON.stringify(other.body)}`);
  } finally {
    await db.doc("config/app").set({ settingsAuth: FieldValue.delete() }, { merge: true });
    await db.doc(`settingsUnlock/${ownerUid}`).delete().catch(() => {});
    for (const raw of [rawOk, rawExpired, rawOther]) {
      await db.doc(`settingsPwReset/${settingsAuthMod.hashToken(raw)}`).delete().catch(() => {});
    }
  }
});

// ── Plan B PR-E2 · researchAsk — the Wave-B AI research proxy callable BODY ──
// A signed-in user asks about THEIR OWN book; the callable generates via the configured generation model, judges
// via the configured judge model (through the already-built fail-closed functions/ai-proxy.js orchestrator),
// meters the ACTUAL token cost into the app-wide aiBudget/{YYYY-MM} ledger, and returns
// { answer, fellBack } — NEVER violating text. This is the only tier that runs the body.
//
// FAIL-CLOSED GATE ORDER (each must refuse BEFORE any provider call / any spend):
//   1 auth → 2 question validation (non-blank string, ≤500) + deny-by-default keys →
//   3 aiResearch kill-switch (fresh config) → 4 provider key + models present → 5 per-uid daily
//   budget (guards.consumeDailyBudget "researchAsk") → 6 app-wide monthly $-cap
//   (readMonthSpendCents FAIL-CLOSED: throw ⇒ unavailable; budgetExceeded ⇒ resource-exhausted)
//   → 7 generate + meter + return.
// Request shape is { question } ONLY (assertNoUnknownKeys). Acts on context.auth.uid — no
// body uid, no IDOR. Response error → HTTP: unauthenticated 401, invalid-argument 400,
// failed-precondition 400, resource-exhausted 429, unavailable 503.
//
// RED today: exports.researchAsk does not exist, so the emulator 404s every call and the
// status assertions fail — red for the right reason. Uses callAsSafe (a 404 has a
// plain-text body that callAs's r.json() would throw on). CI-only (the functions emulator
// can't boot in the authoring sandbox — egress policy). The functions-builder adds the
// callable body + functions/ai-context.js; then these go green.
//
// The gate-refusal cases (1–6) need NO network and are the load-bearing pins. The happy +
// safety cases (7–8) drive the seam via a LOCAL http stub pointed at by AI_PROVIDER_BASE (see
// functions/ai-provider.js). NOTE for CI: `firebase emulators:exec "node --test …"` runs
// the functions emulator AND this test in ONE process tree that inherits the shell env, so
// exporting AI_PROVIDER_BASE (e.g. http://127.0.0.1:8791) BEFORE the run makes both the
// emulator's proxy and this in-test stub agree on the same origin — cases 7–8 then go green.
// Without that export the proxy targets the real provider endpoint (network-blocked in CI),
// so cases 7–8 stay red; the gate cases 1–6 are unaffected. withStub() binds the stub to
// whatever AI_PROVIDER_BASE names (falling back to :8791 and exporting it for the local child).

const RA_MONTH = new Date().toISOString().slice(0, 7);   // aiBudget/{YYYY-MM} doc id
const raDay = () => new Date().toISOString().slice(0, 10);
const raBudgetDoc = () => db.doc(`aiBudget/${RA_MONTH}`);
const raBudgetCents = async () => {
  const s = await raBudgetDoc().get();
  return (s.exists && Number(s.data().cents)) || 0;
};
// Set the AI-related config knobs the callable reads FRESH. Nested {merge:true} deep-merges,
// so this never clobbers flags.features.checkout / paidPlansEnabled set by earlier tests.
async function setAiConfig({ aiResearch, key, capCents, genModel, judgeModel } = {}) {
  const doc = {};
  if (aiResearch !== undefined) doc.flags = { features: { aiResearch } };
  const ai = {};
  if (key !== undefined) {
    ai.providerKey = key === null ? FieldValue.delete() : key;
    // The proxy gate requires BOTH model ids (generation + judge) alongside the key, so a
    // key-configured run can actually generate. The stub reply routes generation vs judge by
    // whether the model id contains "judge".
    ai.generationModel = genModel || "generation-model-test";
    ai.judgeModel = judgeModel || "judge-model-test";
    // Point the proxy's endpoint at the local stub via ADMIN CONFIG (the production path —
    // baseUrl is admin-set, not env). Matches the origin withStub listens on, so the emulator
    // reaches the stub regardless of whether AI_PROVIDER_BASE is exported to its process.
    ai.baseUrl = process.env.AI_PROVIDER_BASE || "http://127.0.0.1:8791";
  }
  if (capCents !== undefined) ai.monthlyCapCents = capCents;
  if (Object.keys(ai).length) doc.ai = ai;
  await db.doc("config/app").set(doc, { merge: true });
}
async function fillResearchDailyBudget(uid) {
  await db.doc(`rateLimits/${uid}__researchAsk__${raDay()}`).set({ count: 1_000_000, day: raDay(), updatedAt: Date.now() });
}
async function clearResearchDailyBudget(uid) {
  await db.doc(`rateLimits/${uid}__researchAsk__${raDay()}`).delete().catch(() => {});
}
async function seedUser(email, extra) {
  const uid = await makeUser(email, null);
  await db.collection("users").doc(uid).set({ email, name: "RA", tier: "free", portfolioCount: 1, ...(extra || {}) }, { merge: true });
  return uid;
}
// A local provider Messages-API stub. `reply(reqBody)` → { text, usage, stopReason }.
// Routes by model id: the judge model vs the generation model, so one stub serves both hops.
function startProviderStub(reply) {
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => {
      let body = {};
      try { body = JSON.parse(raw); } catch { /* ignore */ }
      const out = reply(body) || {};
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        content: out.text ? [{ type: "text", text: out.text }] : [],
        usage: out.usage || { input_tokens: 0, output_tokens: 0 },
        stop_reason: out.stopReason || "end_turn",
      }));
    });
  });
  return server;
}
async function withStub(reply, fn) {
  const server = startProviderStub(reply);
  const base = new URL(process.env.AI_PROVIDER_BASE || "http://127.0.0.1:8791");
  process.env.AI_PROVIDER_BASE = base.origin;
  await new Promise((r) => server.listen(Number(base.port), base.hostname, r));
  try { return await fn(base.origin); }
  finally { await new Promise((r) => server.close(r)); }
}

test("PR-E2: researchAsk rejects an unauthenticated caller", async () => {
  const noAuth = await fetch(callableUrl("researchAsk"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: { question: "How is my book?" } }),
  });
  assert.strictEqual(noAuth.status, 401, "an unauthenticated researchAsk must be rejected");
});

test("PR-E2: researchAsk rejects a blank/non-string/too-long question and unknown data keys", async () => {
  const email = `ra_q_${stamp}@example.com`;
  const uid = await seedUser(email);
  const token = await idTokenFor(email);
  // Everything downstream ON so the ONLY thing that can refuse is the question validation.
  await setAiConfig({ aiResearch: true, key: "PROVIDER-TEST-KEY", capCents: 1_000_000 });
  await clearResearchDailyBudget(uid);

  for (const bad of ["", "   ", 123, null, "x".repeat(501)]) {
    const r = await callAsSafe("researchAsk", token, { question: bad });
    assert.strictEqual(r.status, 400, `question=${JSON.stringify(bad)} must be invalid-argument, got ${r.status}: ${JSON.stringify(r.body)}`);
    assert.strictEqual(r.body && r.body.error && r.body.error.status, "INVALID_ARGUMENT");
  }
  // Deny-by-default input shape: the allow-list is ["question"].
  const badKey = await callAsSafe("researchAsk", token, { question: "How is my book?", sneaky: 1 });
  assert.strictEqual(badKey.status, 400, `an unknown key must be rejected: ${JSON.stringify(badKey.body)}`);
  assert.strictEqual(badKey.body && badKey.body.error && badKey.body.error.status, "INVALID_ARGUMENT");
});

test("PR-E2: researchAsk refuses when the aiResearch kill-switch is OFF (no provider call)", async () => {
  const email = `ra_off_${stamp}@example.com`;
  const uid = await seedUser(email);
  const token = await idTokenFor(email);
  // Kill-switch OFF; a key IS present, proving the switch refuses BEFORE the key/generation.
  await setAiConfig({ aiResearch: false, key: "PROVIDER-TEST-KEY", capCents: 1_000_000 });
  await clearResearchDailyBudget(uid);

  const r = await callAsSafe("researchAsk", token, { question: "How is my book?" });
  assert.strictEqual(r.status, 400, `aiResearch OFF must refuse (failed-precondition), got ${r.status}: ${JSON.stringify(r.body)}`);
  assert.strictEqual(r.body && r.body.error && r.body.error.status, "FAILED_PRECONDITION");
  // Nothing was generated → no spend accrued in this call is asserted by the gate ordering;
  // the daily budget was NOT consumed either (the switch short-circuits before gate 5).
  const dailyDoc = await db.doc(`rateLimits/${uid}__researchAsk__${raDay()}`).get();
  assert.ok(!dailyDoc.exists, "the kill-switch must refuse before the per-uid budget is touched");
});

test("PR-E2: researchAsk refuses when no provider key is configured (can't generate)", async () => {
  const email = `ra_nokey_${stamp}@example.com`;
  const uid = await seedUser(email);
  const token = await idTokenFor(email);
  // Switch ON, but the key is removed → failed-precondition at gate 4 (before budget/generation).
  await setAiConfig({ aiResearch: true, key: null, capCents: 1_000_000 });
  await clearResearchDailyBudget(uid);

  const r = await callAsSafe("researchAsk", token, { question: "How is my book?" });
  assert.strictEqual(r.status, 400, `a missing provider key must refuse (failed-precondition), got ${r.status}: ${JSON.stringify(r.body)}`);
  assert.strictEqual(r.body && r.body.error && r.body.error.status, "FAILED_PRECONDITION");
});

test("PR-E2: researchAsk refuses when the per-uid daily budget is exhausted", async () => {
  const email = `ra_daily_${stamp}@example.com`;
  const uid = await seedUser(email);
  const token = await idTokenFor(email);
  // Switch ON, key present, monthly cap high → the ONLY refusal is the exhausted daily budget.
  await setAiConfig({ aiResearch: true, key: "PROVIDER-TEST-KEY", capCents: 1_000_000 });
  await raBudgetDoc().delete().catch(() => {});
  await fillResearchDailyBudget(uid);

  const r = await callAsSafe("researchAsk", token, { question: "How is my book?" });
  assert.strictEqual(r.status, 429, `an exhausted daily budget must refuse (resource-exhausted), got ${r.status}: ${JSON.stringify(r.body)}`);
  assert.strictEqual(r.body && r.body.error && r.body.error.status, "RESOURCE_EXHAUSTED");
});

test("PR-E2: researchAsk refuses when the app-wide monthly $-cap is already reached (fail-closed)", async () => {
  const email = `ra_cap_${stamp}@example.com`;
  const uid = await seedUser(email);
  const token = await idTokenFor(email);
  // Switch ON, key present, daily budget fresh → the ONLY refusal is the exceeded monthly cap.
  await setAiConfig({ aiResearch: true, key: "PROVIDER-TEST-KEY", capCents: 100 });
  await clearResearchDailyBudget(uid);
  // Spend already at/over the cap for this month (budgetExceeded uses >= as the wall).
  await raBudgetDoc().set({ cents: 999_999, month: RA_MONTH, updatedAt: Date.now() });

  const r = await callAsSafe("researchAsk", token, { question: "How is my book?" });
  assert.strictEqual(r.status, 429, `an exceeded monthly cap must refuse (resource-exhausted), got ${r.status}: ${JSON.stringify(r.body)}`);
  assert.strictEqual(r.body && r.body.error && r.body.error.status, "RESOURCE_EXHAUSTED");
  // The refusal did not spend more: the ledger is unchanged by a capped call.
  assert.strictEqual(await raBudgetCents(), 999_999, "a capped refusal must not accrue further spend");
});

test("PR-E2: researchAsk (happy path) returns the answer and meters the ACTUAL token cost into aiBudget", async () => {
  const email = `ra_ok_${stamp}@example.com`;
  const uid = await seedUser(email, {
    // A held coin so holdingsContext builds a real allowlist/context (via ai-context.js).
  });
  // Seed a portfolio → coin so the callable has holdings to summarise.
  const pRef = db.collection("users").doc(uid).collection("portfolios").doc("default");
  await pRef.set({ name: "Main", coinCount: 1 });
  await pRef.collection("coins").doc("bitcoin").set({ symbol: "btc", name: "Bitcoin", txCount: 0, entries: [] });
  const token = await idTokenFor(email);

  await setAiConfig({ aiResearch: true, key: "PROVIDER-TEST-KEY", capCents: 1_000_000 });
  await clearResearchDailyBudget(uid);
  await raBudgetDoc().delete().catch(() => {});

  // A clean answer (no ticker/price/advice) that passes the real validate-output.js; a
  // judge reply of exactly "SAFE". Large usage so the generation-vs-judge rate split is visible.
  const CLEAN = "Your book is concentrated in a single position, which raises the impact of any move in that one holding on your overall result.";
  const GEN_USAGE = { input_tokens: 200_000, output_tokens: 100_000 };
  const JUDGE_USAGE = { input_tokens: 100_000, output_tokens: 40_000 };
  const reply = (body) => (/judge/i.test(String(body && body.model || ""))
    ? { text: "SAFE", usage: JUDGE_USAGE }
    : { text: CLEAN, usage: GEN_USAGE });

  const before = await raBudgetCents();
  const res = await withStub(reply, () => callAsSafe("researchAsk", token, { question: "How concentrated is my book?" }));
  assert.strictEqual(res.status, 200, `researchAsk happy path failed: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body.result.answer, CLEAN, "the clean answer must be returned verbatim");
  assert.strictEqual(res.body.result.fellBack, false, "a clean+judge-safe answer did not fall back");

  // The ledger grew by exactly (generation + judge, each at its own rate) — the correct rate split.
  const expected = aiCost.costCents(GEN_USAGE, aiCost.GEN_RATES) + aiCost.costCents(JUDGE_USAGE, aiCost.JUDGE_RATES);
  assert.strictEqual((await raBudgetCents()) - before, expected, "aiBudget must accrue the exact metered cost (generation + judge)");
});

test("PR-E2: researchAsk (safety) never returns violating text — falls back and STILL meters the burned tokens", async () => {
  const email = `ra_safe_${stamp}@example.com`;
  const uid = await seedUser(email);
  const pRef = db.collection("users").doc(uid).collection("portfolios").doc("default");
  await pRef.set({ name: "Main", coinCount: 1 });
  await pRef.collection("coins").doc("bitcoin").set({ symbol: "btc", name: "Bitcoin", txCount: 0, entries: [] });
  const token = await idTokenFor(email);

  await setAiConfig({ aiResearch: true, key: "PROVIDER-TEST-KEY", capCents: 1_000_000 });
  await clearResearchDailyBudget(uid);
  await raBudgetDoc().delete().catch(() => {});

  // Every generation carries a price target + advice → rejected by the REAL validator → the
  // regen cap is hit → fail closed. The violating text must NEVER reach the client.
  const DIRTY = "This position could reach $100 which is a strong buy.";
  const GEN_USAGE = { input_tokens: 200_000, output_tokens: 100_000 };
  const reply = (body) => (/judge/i.test(String(body && body.model || ""))
    ? { text: "SAFE", usage: { input_tokens: 10, output_tokens: 1 } }
    : { text: DIRTY, usage: GEN_USAGE });

  const before = await raBudgetCents();
  const res = await withStub(reply, () => callAsSafe("researchAsk", token, { question: "Should I buy more?" }));
  assert.strictEqual(res.status, 200, `researchAsk safety path failed: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body.result.fellBack, true, "a violating candidate must force a fail-closed fallback");
  assert.strictEqual(res.body.result.answer, "", "the safe fallback returns empty text, NEVER the violating candidate");
  assert.ok(!/\$100|strong buy/i.test(res.body.result.answer), "violating text must never reach the client");
  // The rejected generations still burned tokens → 1 initial + 2 regens metered at the generation rate.
  const perGen = aiCost.costCents(GEN_USAGE, aiCost.GEN_RATES);
  assert.strictEqual((await raBudgetCents()) - before, perGen * 3, "all three rejected generations must be metered");
});

// ── Plan B PR-E2.5 · CRYP-107 — atomic reserve-then-settle for the app-wide monthly $-cap ──
// The current gate 6 is a NON-ATOMIC read-then-act: readMonthSpendCents → budgetExceeded (a
// spent>=cap wall) → generate → chargeMonthCents. N requests in flight together can all read
// spent<cap and all generate before any charge, overshooting the cap. PR-E2.5 reserves the
// worst-case per-request estimate up front (reserveMonthCents, atomic) and settles the delta to
// the ACTUAL after — so a call whose remaining headroom is smaller than the estimate must refuse
// BEFORE generating, and a completed call must leave NO stranded reservation cents. Both cases
// are CI-only (the functions emulator can't boot in the authoring sandbox).

test("CRYP-107: researchAsk refuses (429) when the monthly reservation headroom is smaller than the per-request estimate", async () => {
  const email = `ra_reserve_${stamp}@example.com`;
  const uid = await seedUser(email);
  const token = await idTokenFor(email);
  const CAP = 1000;                                   // ¢ — a real cap for this month
  await setAiConfig({ aiResearch: true, key: "PROVIDER-TEST-KEY", capCents: CAP });
  await clearResearchDailyBudget(uid);
  // Spend one cent below the cap → headroom = 1¢, which is smaller than the ~12¢ worst-case
  // per-request reservation but NOT yet at the cap. On the CURRENT code gate 6 is
  // budgetExceeded(999, 1000) = (999 >= 1000) = FALSE, so the callable PASSES the gate and
  // proceeds to generate (status ≠ 429) — this test is RED there. After PR-E2.5 reserveMonthCents
  // sees headroom(1¢) < estMax(12¢) → resource-exhausted with no generation and no ledger change.
  await raBudgetDoc().set({ cents: CAP - 1, month: RA_MONTH, updatedAt: Date.now() });

  const before = await raBudgetCents();
  const r = await callAsSafe("researchAsk", token, { question: "How is my book?" });
  assert.strictEqual(r.status, 429, `insufficient reservation headroom must refuse (resource-exhausted), got ${r.status}: ${JSON.stringify(r.body)}`);
  assert.strictEqual(r.body && r.body.error && r.body.error.status, "RESOURCE_EXHAUSTED");
  // A headroom refusal reserves nothing and generates nothing — the ledger is exactly as it was.
  assert.strictEqual(await raBudgetCents(), before, "a headroom refusal must not reserve or spend");
});

test("CRYP-107: two consecutive researchAsk happy calls leave the ledger at exactly 2× the real per-call cost (no stranded reservation)", async () => {
  // GUARD (green today; enforces the invariant post-impl): reserve-then-settle must net to the
  // ACTUAL per-call cost with NO leftover reservation. Two happy calls must leave the ledger at
  // exactly 2× the real per-call cost — if the settle failed to release the over-reservation the
  // ledger would carry extra estimate cents and this would break.
  const email = `ra_settle_${stamp}@example.com`;
  const uid = await seedUser(email);
  const pRef = db.collection("users").doc(uid).collection("portfolios").doc("default");
  await pRef.set({ name: "Main", coinCount: 1 });
  await pRef.collection("coins").doc("bitcoin").set({ symbol: "btc", name: "Bitcoin", txCount: 0, entries: [] });
  const token = await idTokenFor(email);

  await setAiConfig({ aiResearch: true, key: "PROVIDER-TEST-KEY", capCents: 1_000_000 });
  await clearResearchDailyBudget(uid);
  await raBudgetDoc().delete().catch(() => {});

  const CLEAN = "Your book is concentrated in a single position, which raises the impact of any move in that one holding on your overall result.";
  const GEN_USAGE = { input_tokens: 200_000, output_tokens: 100_000 };
  const JUDGE_USAGE = { input_tokens: 100_000, output_tokens: 40_000 };
  const reply = (body) => (/judge/i.test(String(body && body.model || ""))
    ? { text: "SAFE", usage: JUDGE_USAGE }
    : { text: CLEAN, usage: GEN_USAGE });
  const perCall = aiCost.costCents(GEN_USAGE, aiCost.GEN_RATES) + aiCost.costCents(JUDGE_USAGE, aiCost.JUDGE_RATES);

  const before = await raBudgetCents();
  await withStub(reply, async () => {
    const r1 = await callAsSafe("researchAsk", token, { question: "How concentrated is my book?" });
    assert.strictEqual(r1.status, 200, `call 1 failed: ${JSON.stringify(r1.body)}`);
    const r2 = await callAsSafe("researchAsk", token, { question: "How concentrated is my book?" });
    assert.strictEqual(r2.status, 200, `call 2 failed: ${JSON.stringify(r2.body)}`);
  });
  // Net of reserve+settle across TWO calls = exactly 2× the real cost; zero reservation cents left.
  assert.strictEqual((await raBudgetCents()) - before, perCall * 2, "reserve-then-settle must net to actual — no stranded reservation cents");
});

// ── CRYP-108 · addCoinGuarded — the server-owned coin write (B3, PR-1) ──
// A new `exports.addCoinGuarded` onCall OWNS the coin write (Admin SDK) so client coin create
// can be flipped to `if false` in firestore.rules (server-only). It is the ONLY tier that runs
// the callable BODY. Gate order (each maps to an HttpsError code):
//   auth (unauthenticated) → assertNoUnknownKeys(["portfolioId","coin","journal"])
//   (invalid-argument) → App-Check gate (flag-gated, default OFF) → 2s cooldown
//   guards.checkCooldown + 100/day guards.consumeDailyBudget (resource-exhausted) →
//   isChosen / tier / cap re-derivation (failed-precondition) → transaction
//   (existence → cap → set coin + increment coinCount; a re-add is already-exists).
//   Returns { success:true, coinCount }; acts on context.auth.uid only (no body-uid IDOR).
//
// CI-ONLY: the functions emulator can't boot in the authoring sandbox (egress policy), so these
// are RED-by-404 today (the callable does not exist yet — the emulator 404s every call, so none
// of the 200/400/401/409/429 status assertions land) and are verified on CI once the
// functions-builder adds the body. Uses callAsSafe (a 404 body is plain text that callAs's
// r.json() would throw on). The `coin` payload mirrors the app's coin doc: it is keyed by
// `coin.id`, carrying `symbol`/`name` (see src/api/firebase-database.js addCoin).

// A chosen user + one portfolio seeded at a given coinCount (Admin SDK, bypasses rules).
async function seedAddCoinUser(email, { tier = "free", planChosen = true, coinCount = 0, portfolioId = "p1" } = {}) {
  const uid = await makeUser(email, null);
  await db.collection("users").doc(uid).set(
    { email, name: "AddCoin", tier, portfolioCount: 1, ...(planChosen ? { planChosen: true } : {}) },
    { merge: true },
  );
  await db.collection("users").doc(uid).collection("portfolios").doc(portfolioId).set({ name: "Main", coinCount });
  return uid;
}
// Clear the per-uid add-coin rate-limit docs (2s cooldown + daily budget) so a follow-up call
// in the SAME test reaches the transaction/cap gate instead of the cooldown. Keyed off the
// documented rateLimits/${uid}__* convention (guards.rateDocPath), so it is independent of the
// exact limiter key the callable chooses.
async function clearAddLimiter(uid) {
  const snap = await db.collection("rateLimits").get();
  await Promise.all(snap.docs.filter((d) => d.id.startsWith(`${uid}__`)).map((d) => d.ref.delete()));
}
const addCoinData = (portfolioId, id, symbol, name, journal) => ({
  portfolioId, coin: { id, symbol, name }, ...(journal ? { journal } : {}),
});

// AC2 — RED ANCHOR (written first). checkCooldown + consumeDailyBudget sit BEFORE the write,
// so a rapid second add is refused with resource-exhausted (429).
test("CRYP-108: two addCoinGuarded calls back-to-back trip the add-limiter (resource-exhausted)", async () => {
  const email = `addcoin_rl_${stamp}@example.com`;
  const uid = await seedAddCoinUser(email, { coinCount: 0 });
  const token = await idTokenFor(email);

  const first = await callAsSafe("addCoinGuarded", token, addCoinData("p1", "bitcoin", "btc", "Bitcoin"));
  assert.strictEqual(first.status, 200, `the first add should succeed: ${JSON.stringify(first.body)}`);
  assert.strictEqual(first.body && first.body.result && first.body.result.success, true, "the first add reports success");

  // A second add IMMEDIATELY after (within the 2s cooldown / under the daily cap) is refused.
  const second = await callAsSafe("addCoinGuarded", token, addCoinData("p1", "ethereum", "eth", "Ethereum"));
  assert.strictEqual(second.status, 429, `a rapid second add must be rate-limited (429), got ${second.status}: ${JSON.stringify(second.body)}`);
  assert.strictEqual(second.body && second.body.error && second.body.error.status, "RESOURCE_EXHAUSTED");
  // CRYP-109 (B3 PR-2): the throw must carry details.reason so the client maps it to reason:'rate-limited'.
  assert.strictEqual(
    second.body && second.body.error && second.body.error.details && second.body.error.details.reason,
    "rate-limited",
    `the rate-limit HttpsError must carry details.reason:'rate-limited': ${JSON.stringify(second.body)}`,
  );
  void uid;
});

// AC1 — no auth → unauthenticated (401).
test("CRYP-108: addCoinGuarded rejects an unauthenticated caller (unauthenticated)", async () => {
  const noAuth = await fetch(callableUrl("addCoinGuarded"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: addCoinData("p1", "bitcoin", "btc", "Bitcoin") }),
  });
  assert.strictEqual(noAuth.status, 401, "an unauthenticated add must be rejected");
});

// AC3 — an extra top-level data key → invalid-argument (400), and the message must NOT echo it.
test("CRYP-108: addCoinGuarded rejects an unknown top-level data key without echoing it (invalid-argument)", async () => {
  const email = `addcoin_key_${stamp}@example.com`;
  const uid = await seedAddCoinUser(email, { coinCount: 0 });
  const token = await idTokenFor(email);
  // The allow-list is exactly ["portfolioId","coin","journal"] — a stray key is a 400.
  const bad = await callAsSafe("addCoinGuarded", token,
    { portfolioId: "p1", coin: { id: "bitcoin", symbol: "btc", name: "Bitcoin" }, sneaky: 1 });
  assert.strictEqual(bad.status, 400, `unknown key should be rejected: ${JSON.stringify(bad.body)}`);
  assert.strictEqual(bad.body && bad.body.error && bad.body.error.status, "INVALID_ARGUMENT");
  // The message stays generic — it must NOT reflect the caller's field name back.
  assert.ok(!String((bad.body.error && bad.body.error.message) || "").includes("sneaky"),
    "the error must not echo the offending key name");
  void uid;
});

// AC4 — one call creates exactly one coin (coinCount -> 1); an identical re-add is
// already-exists and never clobbers the journal/addedAt or inflates the counter.
test("CRYP-108: addCoinGuarded creates exactly one coin (coinCount->1); a repeat is already-exists and never clobbers journal/addedAt", async () => {
  const email = `addcoin_dup_${stamp}@example.com`;
  const uid = await seedAddCoinUser(email, { coinCount: 0 });
  const token = await idTokenFor(email);
  const journal = { thesis: "digital gold", changeMyMind: "a better base layer", status: "intact", priceAtAdd: 30000, createdAt: "2026-01-01" };

  const first = await callAsSafe("addCoinGuarded", token, addCoinData("p1", "bitcoin", "btc", "Bitcoin", journal));
  assert.strictEqual(first.status, 200, `the first add should succeed: ${JSON.stringify(first.body)}`);
  assert.strictEqual(first.body && first.body.result && first.body.result.coinCount, 1, "coinCount must be 1 after the first add");

  const portRef = db.collection("users").doc(uid).collection("portfolios").doc("p1");
  assert.strictEqual((await portRef.collection("coins").get()).size, 1, "exactly one coin doc under the caller's portfolio");
  assert.strictEqual((await portRef.get()).data().coinCount, 1, "the portfolio coinCount is exactly 1");
  const firstCoin = (await portRef.collection("coins").doc("bitcoin").get()).data();
  assert.strictEqual(firstCoin.journal.thesis, "digital gold", "the journal is persisted on the coin");
  assert.ok(firstCoin.addedAt, "addedAt is stamped on the coin");

  // A second IDENTICAL add (past the cooldown) is refused as already-exists — no second doc,
  // counter unchanged, and the original journal + addedAt are NOT overwritten.
  await clearAddLimiter(uid);
  const second = await callAsSafe("addCoinGuarded", token,
    addCoinData("p1", "bitcoin", "btc", "Bitcoin", { ...journal, thesis: "CLOBBERED" }));
  assert.strictEqual(second.status, 409, `a re-add must be already-exists (409), got ${second.status}: ${JSON.stringify(second.body)}`);
  assert.strictEqual(second.body && second.body.error && second.body.error.status, "ALREADY_EXISTS");
  assert.strictEqual((await portRef.get()).data().coinCount, 1, "coinCount must be unchanged after a rejected re-add");
  assert.strictEqual((await portRef.collection("coins").get()).size, 1, "no duplicate coin doc");
  const afterCoin = (await portRef.collection("coins").doc("bitcoin").get()).data();
  assert.strictEqual(afterCoin.journal.thesis, "digital gold", "the original journal must NOT be clobbered by a re-add");
  // Impl-agnostic: equal whether addedAt is a Firestore Timestamp or a numeric Date.now().
  assert.deepStrictEqual(afterCoin.addedAt, firstCoin.addedAt, "addedAt must NOT be rewritten by a re-add");
});

// AC5 — the callable RE-DERIVES the cap server-side. A premium user whose config plan says
// coins:5000 is still clamped to min(config,1000): at coinCount 1000 a further add is refused.
// And the free boundary: coinCount 29 -> the 30th add allowed; coinCount 30 -> refused.
test("CRYP-108: addCoinGuarded re-derives the cap — premium clamps to 1,000; free at 29 adds the 30th, at 30 is refused", async () => {
  // A tampered/over-generous config tries to lift the premium ceiling above 1,000.
  await db.doc("config/app").set({ plans: { premium: { coins: 5000 } } }, { merge: true });
  try {
    const premEmail = `addcoin_prem_${stamp}@example.com`;
    const premUid = await seedAddCoinUser(premEmail, { tier: "premium", coinCount: 1000 });
    const premRes = await callAsSafe("addCoinGuarded", await idTokenFor(premEmail), addCoinData("p1", "bitcoin", "btc", "Bitcoin"));
    assert.strictEqual(premRes.status, 400, `config says 5,000 but the callable clamps to 1,000 — at 1000 a further add must be refused: ${JSON.stringify(premRes.body)}`);
    assert.strictEqual(premRes.body && premRes.body.error && premRes.body.error.status, "FAILED_PRECONDITION");
    // CRYP-109 (B3 PR-2): the cap refusal must carry details.reason:'limit' so the client maps it to
    // reason:'limit' (the ONLY upgrade case) — never a blind guess.
    assert.strictEqual(premRes.body.error.details && premRes.body.error.details.reason, "limit",
      `the cap refusal must carry details.reason:'limit': ${JSON.stringify(premRes.body)}`);
    assert.strictEqual((await db.collection("users").doc(premUid).collection("portfolios").doc("p1").get()).data().coinCount, 1000, "no coin written past the clamp");

    // Free user one BELOW the 30-coin Starter cap: the 30th add is allowed.
    const okEmail = `addcoin_free_ok_${stamp}@example.com`;
    const okUid = await seedAddCoinUser(okEmail, { tier: "free", coinCount: 29 });
    const okRes = await callAsSafe("addCoinGuarded", await idTokenFor(okEmail), addCoinData("p1", "bitcoin", "btc", "Bitcoin"));
    assert.strictEqual(okRes.status, 200, `the 30th coin (free cap 30) must be allowed: ${JSON.stringify(okRes.body)}`);
    assert.strictEqual(okRes.body && okRes.body.result && okRes.body.result.coinCount, 30, "coinCount reaches exactly 30");
    void okUid;

    // Free user AT the cap: the 31st add is refused (failed-precondition).
    const fullEmail = `addcoin_free_full_${stamp}@example.com`;
    const fullUid = await seedAddCoinUser(fullEmail, { tier: "free", coinCount: 30 });
    const fullRes = await callAsSafe("addCoinGuarded", await idTokenFor(fullEmail), addCoinData("p1", "bitcoin", "btc", "Bitcoin"));
    assert.strictEqual(fullRes.status, 400, `at the 30-coin cap a further add must be refused: ${JSON.stringify(fullRes.body)}`);
    assert.strictEqual(fullRes.body && fullRes.body.error && fullRes.body.error.status, "FAILED_PRECONDITION");
    // CRYP-109 (B3 PR-2): the at-cap refusal must ALSO carry details.reason:'limit'.
    assert.strictEqual(fullRes.body.error.details && fullRes.body.error.details.reason, "limit",
      `the at-cap refusal must carry details.reason:'limit': ${JSON.stringify(fullRes.body)}`);
    assert.strictEqual((await db.collection("users").doc(fullUid).collection("portfolios").doc("p1").get()).data().coinCount, 30, "no coin written at the cap");
  } finally {
    await db.doc("config/app").set({ plans: FieldValue.delete() }, { merge: true });
  }
});

// AC7 — the onboarding gate + no IDOR path. A not-chosen free user is refused
// (failed-precondition, nothing written); once planChosen is recorded the add succeeds and the
// coin lands under the CALLER's own uid. There is no body-uid to target another user with — a
// stray `uid` key is rejected by the deny-by-default input shape (same mechanism as AC3).
test("CRYP-108: addCoinGuarded gates on planChosen and acts on the caller's own uid (no body-uid IDOR)", async () => {
  const email = `addcoin_gate_${stamp}@example.com`;
  // planChosen ABSENT + free tier → not chosen.
  const uid = await seedAddCoinUser(email, { tier: "free", planChosen: false, coinCount: 0 });
  const token = await idTokenFor(email);

  // Not chosen → failed-precondition, and no coin is written.
  const gated = await callAsSafe("addCoinGuarded", token, addCoinData("p1", "bitcoin", "btc", "Bitcoin"));
  assert.strictEqual(gated.status, 400, `a not-chosen user must be refused: ${JSON.stringify(gated.body)}`);
  assert.strictEqual(gated.body && gated.body.error && gated.body.error.status, "FAILED_PRECONDITION");
  assert.strictEqual(
    (await db.collection("users").doc(uid).collection("portfolios").doc("p1").collection("coins").get()).size, 0,
    "no coin may be written while the plan gate is closed",
  );

  // Record the choice server-side; clear the add-limiter so the retry isn't cooldown-blocked
  // (isChosen is checked AFTER the cooldown/budget gates, so the refused call already stamped them).
  await db.collection("users").doc(uid).set({ planChosen: true }, { merge: true });
  await clearAddLimiter(uid);

  const ok = await callAsSafe("addCoinGuarded", token, addCoinData("p1", "bitcoin", "btc", "Bitcoin"));
  assert.strictEqual(ok.status, 200, `a chosen user's add must succeed: ${JSON.stringify(ok.body)}`);
  const mine = await db.collection("users").doc(uid).collection("portfolios").doc("p1").collection("coins").doc("bitcoin").get();
  assert.ok(mine.exists, "the coin must be created under the caller's OWN uid/portfolio");

  // A stray `uid` key (the would-be IDOR vector) is rejected by assertNoUnknownKeys, not honoured.
  await clearAddLimiter(uid);
  const idor = await callAsSafe("addCoinGuarded", token,
    { portfolioId: "p1", coin: { id: "ethereum", symbol: "eth", name: "Ethereum" }, uid: "victim" });
  assert.strictEqual(idor.status, 400, `a stray uid key must be rejected: ${JSON.stringify(idor.body)}`);
  assert.strictEqual(idor.body && idor.body.error && idor.body.error.status, "INVALID_ARGUMENT");
});

// AC8 — RED ANCHOR (written first). The journal free-text fields are VALIDATED, not silently
// clamped: an over-2000-char thesis (and likewise changeMyMind, or a funnel.dilution finding) is
// REJECTED as invalid-argument, never truncated-then-saved. This is the callable-tier home for the
// old data-layer "DI-1: an over-2000 thesis is rejected as reason:'invalid-or-denied'" contract —
// the founder's actual false-"limit" bug, at its new server-owned enforcement point.
//
// RED today: the callable currently CLAMPS each field with `.slice(0, 2000)` (functions/index.js
// addCoinGuarded), so an over-length thesis is truncated and the add SUCCEEDS (200) — the 400
// assertion fails for the RIGHT reason. The functions-builder swaps clamp→reject; then it goes
// green. Each over-length field uses a FRESH seeded user (coinCount 0, under cap) so the 2s
// add-cooldown never couples the three probes.
test("CRYP-108: addCoinGuarded rejects an over-2000-char thesis (invalid-argument), never silently truncating", async () => {
  // (a) over-2000 thesis → invalid-argument, and NOTHING is written (not truncated-then-saved).
  const thEmail = `addcoin_thesis_${stamp}@example.com`;
  const thUid = await seedAddCoinUser(thEmail, { coinCount: 0 });
  const overThesis = { thesis: "x".repeat(2001), changeMyMind: "y", status: "intact", priceAtAdd: 1, createdAt: "2026-01-01T00:00:00.000Z" };
  const thRes = await callAsSafe("addCoinGuarded", await idTokenFor(thEmail), addCoinData("p1", "bitcoin", "btc", "Bitcoin", overThesis));
  assert.strictEqual(thRes.status, 400, `an over-2000 thesis must be REJECTED, not clamped-then-saved: ${JSON.stringify(thRes.body)}`);
  assert.strictEqual(thRes.body && thRes.body.error && thRes.body.error.status, "INVALID_ARGUMENT");
  // CRYP-109 (B3 PR-2): bad data carries details.reason:'invalid-or-denied' so the client maps it there
  // (NEVER a fake 'limit' — the founder's actual false coin-limit bug).
  assert.strictEqual(thRes.body.error.details && thRes.body.error.details.reason, "invalid-or-denied",
    `an over-length thesis must carry details.reason:'invalid-or-denied': ${JSON.stringify(thRes.body)}`);
  assert.strictEqual(
    (await db.collection("users").doc(thUid).collection("portfolios").doc("p1").collection("coins").get()).size, 0,
    "no coin may be written for an invalid over-length thesis (proves it was not truncated then saved)",
  );

  // (b) over-2000 changeMyMind → invalid-argument (fresh user — no cooldown coupling).
  const cmmEmail = `addcoin_cmm_${stamp}@example.com`;
  await seedAddCoinUser(cmmEmail, { coinCount: 0 });
  const overCmm = { thesis: "y", changeMyMind: "x".repeat(2001), status: "intact", priceAtAdd: 1, createdAt: "2026-01-01T00:00:00.000Z" };
  const cmmRes = await callAsSafe("addCoinGuarded", await idTokenFor(cmmEmail), addCoinData("p1", "bitcoin", "btc", "Bitcoin", overCmm));
  assert.strictEqual(cmmRes.status, 400, `an over-2000 changeMyMind must be rejected: ${JSON.stringify(cmmRes.body)}`);
  assert.strictEqual(cmmRes.body && cmmRes.body.error && cmmRes.body.error.status, "INVALID_ARGUMENT");
  assert.strictEqual(cmmRes.body.error.details && cmmRes.body.error.details.reason, "invalid-or-denied",
    `an over-length changeMyMind must carry details.reason:'invalid-or-denied' (CRYP-109): ${JSON.stringify(cmmRes.body)}`);

  // (c) over-2000 funnel.dilution finding → invalid-argument (fresh user).
  const funEmail = `addcoin_funnel_${stamp}@example.com`;
  await seedAddCoinUser(funEmail, { coinCount: 0 });
  const overFunnel = { thesis: "y", changeMyMind: "z", status: "intact", priceAtAdd: 1, createdAt: "2026-01-01T00:00:00.000Z", funnel: { dilution: "x".repeat(2001) } };
  const funRes = await callAsSafe("addCoinGuarded", await idTokenFor(funEmail), addCoinData("p1", "bitcoin", "btc", "Bitcoin", overFunnel));
  assert.strictEqual(funRes.status, 400, `an over-2000 funnel.dilution must be rejected: ${JSON.stringify(funRes.body)}`);
  assert.strictEqual(funRes.body && funRes.body.error && funRes.body.error.status, "INVALID_ARGUMENT");
  assert.strictEqual(funRes.body.error.details && funRes.body.error.details.reason, "invalid-or-denied",
    `an over-length funnel.dilution must carry details.reason:'invalid-or-denied' (CRYP-109): ${JSON.stringify(funRes.body)}`);
});

// AC9 — the callable-tier home for the old data-layer 'missing-target' coverage. A write to a
// portfolio that doesn't exist is failed-precondition (the transaction's existence check), NEVER a
// fake cap/limit — the whole point of the DI-1 fix. GREEN once the callable ships (the existence
// check already lives in the transaction body); it 404s only in the authoring sandbox where the
// functions emulator can't boot, so it's verified on CI.
test("CRYP-108: addCoinGuarded on a non-existent portfolio → failed-precondition", async () => {
  const email = `addcoin_noport_${stamp}@example.com`;
  const uid = await seedAddCoinUser(email, { coinCount: 0 });
  const token = await idTokenFor(email);
  // The caller is chosen + under cap, so this reaches the transaction's portfolio-existence check.
  const res = await callAsSafe("addCoinGuarded", token, addCoinData("no-such-portfolio", "bitcoin", "btc", "Bitcoin"));
  assert.strictEqual(res.status, 400, `a missing portfolio must be failed-precondition, not a fake limit: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body && res.body.error && res.body.error.status, "FAILED_PRECONDITION");
  // CRYP-109 (B3 PR-2): a missing parent carries details.reason:'missing-target' so the client kicks the
  // self-heal, NEVER a fake 'limit'.
  assert.strictEqual(res.body.error.details && res.body.error.details.reason, "missing-target",
    `a missing portfolio must carry details.reason:'missing-target': ${JSON.stringify(res.body)}`);
  void uid;
});

// ── CRYP-110 · addTransactionGuarded — the server-owned transaction write (B3, PR-tx-1) ──
// A new `exports.addTransactionGuarded` onCall OWNS the transaction write (Admin SDK txn: set the
// tx doc + increment(txCount) on the coin) so client transaction create can be flipped to
// `if false` in firestore.rules (server-only). It is the ONLY tier that runs the callable BODY.
// Gate order MIRRORS addCoinGuarded (each maps to an HttpsError code):
//   auth (unauthenticated) → assertNoUnknownKeys(["portfolioId","coinId","tx"])
//   (invalid-argument) → App-Check gate (flag-gated, default OFF) → 500ms cooldown
//   guards.checkCooldown + 500/day guards.consumeDailyBudget (resource-exhausted) →
//   isChosen / tier / cap re-derivation (failed-precondition) → transaction
//   (coin exists → txCount < cap → set tx (auto-id) + increment txCount).
//   Returns { success:true, txId, txCount }; acts on context.auth.uid only (no body-uid IDOR).
//   No `already-exists` case — the tx doc uses an auto-id.
//
// CI-ONLY: the functions emulator can't boot in the authoring sandbox (egress policy), so these
// are RED-by-404 today (the callable does not exist yet — the emulator 404s every call, so none
// of the 200/400/401/429 status assertions land) and are verified on CI once the functions-builder
// adds the body. Uses callAsSafe (a 404 body is plain text that callAs's r.json() would throw on).
// The `tx` payload mirrors the app's transaction doc (type/amount/priceAtBuy/date — see
// src/api/firebase-database.js addTransaction).

// A chosen user + one portfolio + one coin seeded at a given txCount (Admin SDK, bypasses rules).
async function seedAddTxUser(email, { tier = "free", planChosen = true, txCount = 0, portfolioId = "p1", coinId = "bitcoin" } = {}) {
  const uid = await makeUser(email, null);
  await db.collection("users").doc(uid).set(
    { email, name: "AddTx", tier, portfolioCount: 1, ...(planChosen ? { planChosen: true } : {}) },
    { merge: true },
  );
  const portRef = db.collection("users").doc(uid).collection("portfolios").doc(portfolioId);
  await portRef.set({ name: "Main", coinCount: 1 });
  await portRef.collection("coins").doc(coinId).set({ symbol: "BTC", name: "Bitcoin", txCount });
  return uid;
}
// Clear the per-uid add-tx rate-limit docs (500ms cooldown + daily budget) so a follow-up call
// in the SAME test reaches the transaction/cap gate instead of the cooldown. Keyed off the
// documented rateLimits/${uid}__* convention (guards.rateDocPath), so it is independent of the
// exact limiter key the callable chooses (same idiom as the coin suite's clearAddLimiter).
async function clearTxLimiter(uid) {
  const snap = await db.collection("rateLimits").get();
  await Promise.all(snap.docs.filter((d) => d.id.startsWith(`${uid}__`)).map((d) => d.ref.delete()));
}
const addTxData = (portfolioId, coinId, tx) => ({
  portfolioId, coinId, tx: { type: "buy", amount: 1, priceAtBuy: 100, date: "2026-01-01T00:00", ...(tx || {}) },
});

// AC-tx1 — RED ANCHOR (written first). checkCooldown + consumeDailyBudget sit BEFORE the write,
// so a rapid second add is refused with resource-exhausted (429) carrying details.reason.
test("CRYP-110: two addTransactionGuarded calls back-to-back trip the tx-limiter (resource-exhausted)", async () => {
  const email = `addtx_rl_${stamp}@example.com`;
  const uid = await seedAddTxUser(email, { txCount: 0 });
  const token = await idTokenFor(email);

  const first = await callAsSafe("addTransactionGuarded", token, addTxData("p1", "bitcoin"));
  assert.strictEqual(first.status, 200, `the first tx should succeed: ${JSON.stringify(first.body)}`);
  assert.strictEqual(first.body && first.body.result && first.body.result.success, true, "the first tx reports success");

  // A second add IMMEDIATELY after (within the 500ms cooldown / under the daily cap) is refused.
  const second = await callAsSafe("addTransactionGuarded", token, addTxData("p1", "bitcoin"));
  assert.strictEqual(second.status, 429, `a rapid second tx must be rate-limited (429), got ${second.status}: ${JSON.stringify(second.body)}`);
  assert.strictEqual(second.body && second.body.error && second.body.error.status, "RESOURCE_EXHAUSTED");
  // The throw must carry details.reason so the client maps it to reason:'rate-limited' (distinct
  // from the plan-cap upgrade toast — the addCoinGuarded/CRYP-109 mapping contract).
  assert.strictEqual(
    second.body && second.body.error && second.body.error.details && second.body.error.details.reason,
    "rate-limited",
    `the rate-limit HttpsError must carry details.reason:'rate-limited': ${JSON.stringify(second.body)}`,
  );
  void uid;
});

// AC-tx2 — no auth → unauthenticated (401).
test("CRYP-110: addTransactionGuarded rejects an unauthenticated caller (unauthenticated)", async () => {
  const noAuth = await fetch(callableUrl("addTransactionGuarded"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: addTxData("p1", "bitcoin") }),
  });
  assert.strictEqual(noAuth.status, 401, "an unauthenticated tx must be rejected");
});

// AC-tx3 — an extra top-level data key → invalid-argument (400), and the message must NOT echo it.
test("CRYP-110: addTransactionGuarded rejects an unknown top-level data key without echoing it (invalid-argument)", async () => {
  const email = `addtx_key_${stamp}@example.com`;
  const uid = await seedAddTxUser(email, { txCount: 0 });
  const token = await idTokenFor(email);
  // The allow-list is exactly ["portfolioId","coinId","tx"] — a stray key is a 400.
  const bad = await callAsSafe("addTransactionGuarded", token,
    { portfolioId: "p1", coinId: "bitcoin", tx: { type: "buy", amount: 1, priceAtBuy: 100, date: "2026-01-01T00:00" }, sneaky: 1 });
  assert.strictEqual(bad.status, 400, `unknown key should be rejected: ${JSON.stringify(bad.body)}`);
  assert.strictEqual(bad.body && bad.body.error && bad.body.error.status, "INVALID_ARGUMENT");
  // The message stays generic — it must NOT reflect the caller's field name back.
  assert.ok(!String((bad.body.error && bad.body.error.message) || "").includes("sneaky"),
    "the error must not echo the offending key name");
  void uid;
});

// AC-tx4 — one call creates exactly one transaction (txCount -> 1) and returns { success, txId,
// txCount }. The tx doc uses an auto-id, so there is no already-exists case.
test("CRYP-110: addTransactionGuarded creates exactly one transaction (txCount->1) and returns {success, txId, txCount}", async () => {
  const email = `addtx_ok_${stamp}@example.com`;
  const uid = await seedAddTxUser(email, { txCount: 0 });
  const token = await idTokenFor(email);

  const res = await callAsSafe("addTransactionGuarded", token, addTxData("p1", "bitcoin", { type: "buy", amount: 1.5, priceAtBuy: 40000, date: "2026-02-01T00:00" }));
  assert.strictEqual(res.status, 200, `the tx add should succeed: ${JSON.stringify(res.body)}`);
  const result = res.body && res.body.result;
  assert.strictEqual(result && result.success, true, "the add reports success");
  assert.strictEqual(result && result.txCount, 1, "txCount must be 1 after the first tx");
  assert.ok(result && typeof result.txId === "string" && result.txId.length > 0, "an auto-id txId is returned");

  const coinRef = db.collection("users").doc(uid).collection("portfolios").doc("p1").collection("coins").doc("bitcoin");
  assert.strictEqual((await coinRef.collection("transactions").get()).size, 1, "exactly one transaction doc under the caller's coin");
  assert.strictEqual((await coinRef.get()).data().txCount, 1, "the coin txCount is exactly 1");
  const txDoc = (await coinRef.collection("transactions").doc(result.txId).get()).data();
  assert.strictEqual(txDoc.type, "buy", "the tx type is persisted");
  assert.strictEqual(txDoc.amount, 1.5, "the tx amount is persisted");
  assert.strictEqual(txDoc.priceAtBuy, 40000, "the tx price is persisted");
});

// AC-tx5 — the callable RE-DERIVES the cap server-side. Free boundary: txCount 299 -> the 300th
// add allowed; txCount 300 -> refused (failed-precondition + details.reason:'limit').
test("CRYP-110: addTransactionGuarded enforces the tx cap — free at 299 adds the 300th, at 300 is refused (limit)", async () => {
  // Free user one BELOW the 300-tx Starter cap: the 300th tx is allowed.
  const okEmail = `addtx_free_ok_${stamp}@example.com`;
  const okUid = await seedAddTxUser(okEmail, { tier: "free", txCount: 299 });
  const okRes = await callAsSafe("addTransactionGuarded", await idTokenFor(okEmail), addTxData("p1", "bitcoin"));
  assert.strictEqual(okRes.status, 200, `the 300th tx (free cap 300) must be allowed: ${JSON.stringify(okRes.body)}`);
  assert.strictEqual(okRes.body && okRes.body.result && okRes.body.result.txCount, 300, "txCount reaches exactly 300");
  void okUid;

  // Free user AT the cap: the 301st tx is refused (failed-precondition + reason:'limit').
  const fullEmail = `addtx_free_full_${stamp}@example.com`;
  const fullUid = await seedAddTxUser(fullEmail, { tier: "free", txCount: 300 });
  const fullRes = await callAsSafe("addTransactionGuarded", await idTokenFor(fullEmail), addTxData("p1", "bitcoin"));
  assert.strictEqual(fullRes.status, 400, `at the 300-tx cap a further tx must be refused: ${JSON.stringify(fullRes.body)}`);
  assert.strictEqual(fullRes.body && fullRes.body.error && fullRes.body.error.status, "FAILED_PRECONDITION");
  // The cap refusal must carry details.reason:'limit' (the ONLY upgrade case) — never a fake guess.
  assert.strictEqual(fullRes.body.error.details && fullRes.body.error.details.reason, "limit",
    `the at-cap refusal must carry details.reason:'limit': ${JSON.stringify(fullRes.body)}`);
  assert.strictEqual(
    (await db.collection("users").doc(fullUid).collection("portfolios").doc("p1").collection("coins").doc("bitcoin").get()).data().txCount, 300,
    "no tx written at the cap",
  );
});

// AC-tx6 — a write to a coin that doesn't exist is failed-precondition (the transaction's
// existence check), NEVER a fake cap/limit. GREEN once the callable ships (the existence check
// lives in the transaction body); it 404s only in the authoring sandbox, so it's verified on CI.
test("CRYP-110: addTransactionGuarded on a non-existent coin → failed-precondition (missing-target)", async () => {
  const email = `addtx_nocoin_${stamp}@example.com`;
  const uid = await seedAddTxUser(email, { txCount: 0 });
  const token = await idTokenFor(email);
  // The caller is chosen + under cap, so this reaches the transaction's coin-existence check.
  const res = await callAsSafe("addTransactionGuarded", token, addTxData("p1", "no-such-coin"));
  assert.strictEqual(res.status, 400, `a missing coin must be failed-precondition, not a fake limit: ${JSON.stringify(res.body)}`);
  assert.strictEqual(res.body && res.body.error && res.body.error.status, "FAILED_PRECONDITION");
  // A missing parent carries details.reason:'missing-target' so the client kicks the self-heal.
  assert.strictEqual(res.body.error.details && res.body.error.details.reason, "missing-target",
    `a missing coin must carry details.reason:'missing-target': ${JSON.stringify(res.body)}`);
  void uid;
});

// AC-tx7 — the onboarding gate + no IDOR path. A not-chosen free user is refused
// (failed-precondition, nothing written); once planChosen is recorded the add succeeds and the tx
// lands under the CALLER's own uid. There is no body-uid to target another user with — a stray
// `uid` key is rejected by the deny-by-default input shape (same mechanism as AC-tx3).
test("CRYP-110: addTransactionGuarded gates on planChosen and acts on the caller's own uid (no body-uid IDOR)", async () => {
  const email = `addtx_gate_${stamp}@example.com`;
  // planChosen ABSENT + free tier → not chosen.
  const uid = await seedAddTxUser(email, { tier: "free", planChosen: false, txCount: 0 });
  const token = await idTokenFor(email);

  // Not chosen → failed-precondition, and no tx is written.
  const gated = await callAsSafe("addTransactionGuarded", token, addTxData("p1", "bitcoin"));
  assert.strictEqual(gated.status, 400, `a not-chosen user must be refused: ${JSON.stringify(gated.body)}`);
  assert.strictEqual(gated.body && gated.body.error && gated.body.error.status, "FAILED_PRECONDITION");
  assert.strictEqual(
    (await db.collection("users").doc(uid).collection("portfolios").doc("p1").collection("coins").doc("bitcoin").collection("transactions").get()).size, 0,
    "no tx may be written while the plan gate is closed",
  );

  // Record the choice server-side; clear the tx-limiter so the retry isn't cooldown-blocked
  // (isChosen is checked AFTER the cooldown/budget gates, so the refused call already stamped them).
  await db.collection("users").doc(uid).set({ planChosen: true }, { merge: true });
  await clearTxLimiter(uid);

  const ok = await callAsSafe("addTransactionGuarded", token, addTxData("p1", "bitcoin"));
  assert.strictEqual(ok.status, 200, `a chosen user's tx must succeed: ${JSON.stringify(ok.body)}`);
  assert.strictEqual(
    (await db.collection("users").doc(uid).collection("portfolios").doc("p1").collection("coins").doc("bitcoin").collection("transactions").get()).size, 1,
    "exactly one tx under the caller's OWN uid/coin",
  );

  // A stray `uid` key (the would-be IDOR vector) is rejected by assertNoUnknownKeys, not honoured.
  await clearTxLimiter(uid);
  const idor = await callAsSafe("addTransactionGuarded", token,
    { portfolioId: "p1", coinId: "bitcoin", tx: { type: "buy", amount: 1, priceAtBuy: 100, date: "2026-01-01T00:00" }, uid: "victim" });
  assert.strictEqual(idor.status, 400, `a stray uid key must be rejected: ${JSON.stringify(idor.body)}`);
  assert.strictEqual(idor.body && idor.body.error && idor.body.error.status, "INVALID_ARGUMENT");
});
