/**
 * Shared security guards (BL-1a · D4/D5/C16) — CommonJS, dependency-injected.
 *
 * ONE mechanism, reused everywhere it's mandated instead of built three times:
 *  - the Wave-B AI proxy's per-uid daily budget (C-B2: Starter 0 / Pro 50 / Premium 300)
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

// Count-based daily budget (D5; the same counter shape C-B2's AI budget uses).
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

// App Check gate (D4, v1 manual `context.app`). Enforcement is a prod flag the
// caller resolves from config, so local/emulator keeps working without tokens —
// build the gate once here, flip the flag at go-live.
function appCheckOk(context, { enforce }) {
  if (!enforce) return { ok: true };
  return context && context.app ? { ok: true } : { ok: false, reason: "app-check-required" };
}

module.exports = { utcDayKey, rateDocPath, consumeDailyBudget, checkCooldown, appCheckOk };
