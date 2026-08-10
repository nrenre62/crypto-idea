/**
 * Shared security guards (BL-1a · D4/D5/C16) — CommonJS, dependency-injected.
 *
 * ONE mechanism, reused everywhere a per-uid Firestore counter is mandated:
 *  - the Wave-B AI proxy's per-uid budget (C-B2) — note: the AI ceiling is a MONTHLY
 *    $-cost cap (`aiMonthlyCents`), metered on token cost, not a daily call count (PRICING.md §4)
 *  - addCoinGuarded's add-limiter (B3/C11)
 *  - createSubscription's spam cooldown (BL-1c, D5)
 *
 * No firebase imports here: `db` (Admin Firestore) is injected, results are plain
 * decision objects, and the CALLER maps them to HttpsError — so the logic is fully
 * unit-testable without emulators (tests/unit/guards.test.js) and can't drift from
 * what the callables enforce. Docs live in a server-only `rateLimits` collection
 * (no firestore.rules match → clients are denied by default deny; only the Admin
 * SDK writes them).
 */

// C16: budgets reset at UTC midnight — one doc per uid+key+UTC-day.
function utcDayKey(now = new Date()) {
  return new Date(now).toISOString().slice(0, 10);
}

function rateDocPath(uid, key, day) {
  return `rateLimits/${uid}__${key}__${day}`;
}

// Count-based daily budget (D5) — used by the createSubscription cooldown + reconcile budget.
// Transactional read+increment so concurrent calls can't both pass at the limit.
// A denied call consumes nothing. Returns the decision — the caller throws.
async function consumeDailyBudget(db, { uid, key, limit, now = new Date() }) {
  const day = utcDayKey(now);
  const ref = db.doc(rateDocPath(uid, key, day));
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const count = snap.exists ? (snap.data().count || 0) : 0;
    if (count >= limit) return { allowed: false, count, limit, day };
    t.set(ref, { count: count + 1, day, updatedAt: Date.now() });
    return { allowed: true, count: count + 1, limit, day };
  });
}

// Sliding cooldown (D5: block duplicate/spam createSubscription calls). A blocked
// attempt does NOT extend the window (lastAt only moves on an ALLOWED call).
async function checkCooldown(db, { uid, key, cooldownMs, now = Date.now() }) {
  const ref = db.doc(`rateLimits/${uid}__${key}__cooldown`);
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const last = snap.exists ? (snap.data().lastAt || 0) : 0;
    const elapsed = now - last;
    if (last && elapsed < cooldownMs) return { allowed: false, retryInMs: cooldownMs - elapsed };
    t.set(ref, { lastAt: now });
    return { allowed: true, retryInMs: 0 };
  });
}

// Deny-by-default input shape: the TOP-LEVEL keys of a callable's `data` that are
// NOT in the allow-list. Each callable reads a fixed set of fields, so anything
// else is an unexpected/typo'd/injected key that should be a 400 — not silently
// ignored (openapi.json documents these request schemas as
// additionalProperties:false; this is that contract, enforced). Pure: returns the
// offending keys, the caller throws. A no-arg call (data null/undefined/non-object)
// has no keys → []. Top level only — nested shapes stay each handler's own concern
// (e.g. saveConfig's merge + keep() sanitiser).
function unknownKeys(data, allowed) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const ok = new Set(allowed || []);
  return Object.keys(data).filter((k) => !ok.has(k));
}

// App Check gate (D4, v1 manual `context.app`). Enforcement is a prod flag the
// caller resolves from config, so local/emulator keeps working without tokens —
// build the gate once here, flip the flag at go-live.
function appCheckOk(context, { enforce }) {
  if (!enforce) return { ok: true };
  return context && context.app ? { ok: true } : { ok: false, reason: "app-check-required" };
}

/* ===========================================================================
 * ADMIN-SEC — admin roles, owner protection & step-up re-auth
 * ===========================================================================
 * Two roles, both carried as verified custom claims on the ID token:
 *   owner   = { admin: true, role: "owner" }    set ONLY by scripts/set-admin.js
 *   manager = { admin: true, role: "manager" }  granted by an owner from the panel
 *
 * These are PURE — they read the already-decoded `context.auth.token` and return a
 * decision object; the caller maps it to an HttpsError. Same contract as the rest of
 * this file, so the whole role matrix is unit-testable with no emulator.
 *
 * FAIL CLOSED, ALWAYS. A legacy admin whose token predates ADMIN-SEC has no `role`
 * claim: after CRYP-103b they keep only the shared READ surface (`requireAdmin`) and are
 * REFUSED both the account-management WRITE surface (`requireManager`) and owner areas
 * (`requireOwner`) until `set-admin.js --role=manager|owner` gives them an explicit role
 * and they re-login. Never widen `roleOf` to guess — an unknown role is neither a manager
 * nor an owner.
 */
const ROLE_OWNER = "owner";
const ROLE_MANAGER = "manager";

// Strict, null-safe role read. No trimming, no case-folding, no defaulting to a role:
// anything that isn't exactly "owner"/"manager" is "" and is treated as unprivileged.
function roleOf(token) {
  if (!token || token.admin !== true) return "";
  return token.role === ROLE_OWNER || token.role === ROLE_MANAGER ? token.role : "";
}

function isOwner(token) { return roleOf(token) === ROLE_OWNER; }

// Any admin claim holder — the floor for the shared read surface (Overview/Users/
// Trash/Audit). Legacy role-less admins pass here, which is what keeps the panel
// working through the migration window.
function requireAdmin(context) {
  const token = context && context.auth && context.auth.token;
  if (!context || !context.auth) return { ok: false, reason: "unauthenticated" };
  if (!token || token.admin !== true) return { ok: false, reason: "not-admin" };
  return { ok: true, role: roleOf(token), uid: context.auth.uid };
}

// Account-management (WRITE) surface: owner OR manager ONLY.
// ADMIN-SEP (CRYP-103b · Part C-1): no longer an alias of requireAdmin. Exactly two
// admin types may ACT here — an admin claim with any other role (none/unknown/near-miss)
// is REFUSED, eliminating the silent third "no-role admin gets full manager power" state.
// requireAdmin (the shared READ surface) still admits a legacy role-less admin so the
// panel stays readable through the migration window; only mutation tightens. Fails closed:
// roleOf() already collapses anything that isn't exactly "owner"/"manager" to "".
function requireManager(context) {
  const base = requireAdmin(context);
  if (!base.ok) return base;                      // unauthenticated / not-admin first
  const role = roleOf(context.auth.token);
  if (role !== ROLE_MANAGER && role !== ROLE_OWNER) {
    return { ok: false, reason: "manager-required", role };
  }
  return { ok: true, role, uid: context.auth.uid };
}

// Owner-only surface: Settings (getAdminConfig/saveConfig), grant/revoke manager,
// permanent erasure. A manager or a legacy role-less admin is refused.
function requireOwner(context) {
  const base = requireAdmin(context);
  if (!base.ok) return base;
  if (!isOwner(context.auth.token)) return { ok: false, reason: "owner-required", role: base.role };
  return { ok: true, role: ROLE_OWNER, uid: context.auth.uid };
}

// Step-up re-auth: the token must have been minted from a RECENT password
// re-authentication. `auth_time` is seconds since epoch, set by Firebase when the
// user actually authenticated — a client cannot forge it, which is why this and not
// the client's unlock timer is the real control.
//
// `enforce` mirrors appCheckOk's flag convention: the gate is the one control that
// can lock an owner out of Settings, and the flag lives in Settings — so it must be
// flippable from the Firebase console without the panel. Defaults ON at the caller.
// `skewSec` tolerates a client/server clock difference at the window edge.
function requireFreshAuth(context, { enforce = true, maxAgeSec = 600, skewSec = 60, now = Date.now() } = {}) {
  if (!enforce) return { ok: true, enforced: false };
  const token = context && context.auth && context.auth.token;
  const authTime = token && Number(token.auth_time);
  if (!authTime || !Number.isFinite(authTime)) return { ok: false, reason: "reauth-required", ageSec: null };
  const ageSec = Math.floor(now / 1000) - authTime;
  if (ageSec > maxAgeSec + skewSec) return { ok: false, reason: "reauth-required", ageSec };
  return { ok: true, enforced: true, ageSec };
}

// ADMIN-0: admin MFA/2FA. A stolen admin password alone must not unlock real user
// data — the biggest remaining admin-security gap (OWASP MFA). Identity Platform
// stamps `firebase.sign_in_second_factor` on the ID token when a second factor was
// actually used to sign in; it is set by the platform, so a client cannot forge it,
// which is why this and not an app-side "did they enrol?" lookup is the control.
//
// `enforce` DEFAULTS OFF — the opposite of requireFreshAuth's default, and
// deliberately so. Enrolment needs Identity Platform (Blaze), so until that is
// switched on NOBODY can satisfy this gate: defaulting it on would wall every admin
// out of the panel the moment this code deploys. The gate ships now so that go-live
// is a flag flip rather than new auth code written under launch pressure.
//
// ⚠️ It is also the one gate that can lock an owner out of the switch that unlocks
// them (the flag lives in owner-only Settings). Recovery is editing
// `config/app.flags.requireAdminMfa` in the Firebase console — same escape hatch as
// stepUpReauth, and the reason both flags are console-editable at all.
function requireMfa(context, { enforce = false } = {}) {
  if (!enforce) return { ok: true, enforced: false };
  const token = context && context.auth && context.auth.token;
  const factor = token && token.firebase && token.firebase.sign_in_second_factor;
  // Any non-empty factor counts ("phone", "totp", …). Enumerating accepted factor
  // types here would silently deny a type Identity Platform adds later.
  if (!factor) return { ok: false, reason: "mfa-required" };
  return { ok: true, enforced: true, factor };
}

module.exports = {
  utcDayKey, rateDocPath, consumeDailyBudget, checkCooldown, appCheckOk, unknownKeys,
  ROLE_OWNER, ROLE_MANAGER, roleOf, isOwner, requireAdmin, requireManager, requireOwner, requireFreshAuth,
  requireMfa,
};
