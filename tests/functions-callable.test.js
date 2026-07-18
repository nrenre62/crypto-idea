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
const auth = admin.auth();
const db = admin.firestore();

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
