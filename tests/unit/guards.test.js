import { describe, it, expect } from "vitest";
import {
  utcDayKey, rateDocPath, consumeDailyBudget, checkCooldown, appCheckOk, unknownKeys,
  roleOf, requireAdmin, requireManager, requireOwner, requireFreshAuth, requireMfa,
} from "../../functions/guards.js";

// BL-1a (D4/D5/C16): the shared per-uid limiter + App Check gate are pure and
// dependency-injected, so they're tested here with an in-memory Firestore fake —
// no emulator needed. The SAME mechanism backs the Wave-B AI budget (C-B2),
// addCoinGuarded (B3) and the createSubscription cooldown (BL-1c).
const makeFakeDb = () => {
  const store = new Map();
  return {
    _store: store,
    doc: (path) => ({ path }),
    runTransaction: async (fn) => fn({
      get: async (r) => ({ exists: store.has(r.path), data: () => store.get(r.path) }),
      set: (r, data) => { store.set(r.path, data); },
    }),
  };
};

describe("guards.utcDayKey (C16: budgets reset at UTC midnight)", () => {
  it("keys by the UTC calendar day", () => {
    expect(utcDayKey(new Date("2026-07-03T23:59:00Z"))).toBe("2026-07-03");
    expect(utcDayKey(new Date("2026-07-04T00:01:00Z"))).toBe("2026-07-04");
  });
});

describe("guards.consumeDailyBudget (per-uid daily count)", () => {
  it("allows up to the limit, then denies without incrementing past it", async () => {
    const db = makeFakeDb();
    const args = { uid: "u1", key: "ai", limit: 2, now: new Date("2026-07-03T10:00:00Z") };
    expect((await consumeDailyBudget(db, args)).allowed).toBe(true);
    expect((await consumeDailyBudget(db, args)).allowed).toBe(true);
    const third = await consumeDailyBudget(db, args);
    expect(third.allowed).toBe(false);
    expect(third.count).toBe(2); // denied call does NOT consume
    expect(db._store.get(rateDocPath("u1", "ai", "2026-07-03")).count).toBe(2);
  });

  it("isolates budgets per uid and per key", async () => {
    const db = makeFakeDb();
    const now = new Date("2026-07-03T10:00:00Z");
    await consumeDailyBudget(db, { uid: "u1", key: "ai", limit: 1, now });
    expect((await consumeDailyBudget(db, { uid: "u2", key: "ai", limit: 1, now })).allowed).toBe(true);
    expect((await consumeDailyBudget(db, { uid: "u1", key: "addCoin", limit: 1, now })).allowed).toBe(true);
    expect((await consumeDailyBudget(db, { uid: "u1", key: "ai", limit: 1, now })).allowed).toBe(false);
  });

  it("resets on the next UTC day (a fresh doc per dayKey)", async () => {
    const db = makeFakeDb();
    const d1 = new Date("2026-07-03T23:50:00Z");
    const d2 = new Date("2026-07-04T00:10:00Z");
    await consumeDailyBudget(db, { uid: "u1", key: "ai", limit: 1, now: d1 });
    expect((await consumeDailyBudget(db, { uid: "u1", key: "ai", limit: 1, now: d1 })).allowed).toBe(false);
    expect((await consumeDailyBudget(db, { uid: "u1", key: "ai", limit: 1, now: d2 })).allowed).toBe(true);
  });
});

describe("guards.checkCooldown (D5: createSubscription spam guard)", () => {
  it("allows the first call, blocks within the window, allows after it", async () => {
    const db = makeFakeDb();
    const t0 = 1_000_000;
    expect((await checkCooldown(db, { uid: "u1", key: "sub", cooldownMs: 60_000, now: t0 })).allowed).toBe(true);
    const blocked = await checkCooldown(db, { uid: "u1", key: "sub", cooldownMs: 60_000, now: t0 + 10_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryInMs).toBe(50_000);
    expect((await checkCooldown(db, { uid: "u1", key: "sub", cooldownMs: 60_000, now: t0 + 61_000 })).allowed).toBe(true);
  });

  it("a blocked attempt does not extend the window", async () => {
    const db = makeFakeDb();
    const t0 = 1_000_000;
    await checkCooldown(db, { uid: "u1", key: "sub", cooldownMs: 60_000, now: t0 });
    await checkCooldown(db, { uid: "u1", key: "sub", cooldownMs: 60_000, now: t0 + 30_000 }); // blocked
    // 61s after the ORIGINAL allowed call → allowed (the block at +30s didn't reset lastAt)
    expect((await checkCooldown(db, { uid: "u1", key: "sub", cooldownMs: 60_000, now: t0 + 61_000 })).allowed).toBe(true);
  });
});

describe("guards.appCheckOk (D4: v1 manual context.app, prod-flag gated)", () => {
  it("passes everything when enforcement is off (local/emulator default)", () => {
    expect(appCheckOk({}, { enforce: false }).ok).toBe(true);
    expect(appCheckOk(undefined, { enforce: false }).ok).toBe(true);
  });
  it("requires context.app when enforcement is on", () => {
    expect(appCheckOk({ app: { appId: "x" } }, { enforce: true }).ok).toBe(true);
    const denied = appCheckOk({}, { enforce: true });
    expect(denied.ok).toBe(false);
    expect(denied.reason).toBe("app-check-required");
  });
});

describe("guards.unknownKeys (deny-by-default callable input shape)", () => {
  it("returns [] for a no-arg call (null / undefined / empty / non-object)", () => {
    expect(unknownKeys(null, ["uid"])).toEqual([]);
    expect(unknownKeys(undefined, ["uid"])).toEqual([]);
    expect(unknownKeys({}, ["uid"])).toEqual([]);
    expect(unknownKeys("nope", ["uid"])).toEqual([]);
    expect(unknownKeys([1, 2], ["uid"])).toEqual([]);
  });
  it("returns [] when every key is allowed (order/subset irrelevant)", () => {
    expect(unknownKeys({ uid: "x", tier: "pro" }, ["uid", "tier"])).toEqual([]);
    expect(unknownKeys({ uid: "x" }, ["uid", "tier"])).toEqual([]); // missing is fine
  });
  it("returns exactly the offending top-level keys", () => {
    expect(unknownKeys({ uid: "x", admin: true }, ["uid"])).toEqual(["admin"]);
    expect(unknownKeys({ a: 1, b: 2, c: 3 }, ["b"])).toEqual(["a", "c"]);
  });
  it("treats an empty allow-list as 'no keys permitted' (no-arg callables)", () => {
    expect(unknownKeys({ x: 1 }, [])).toEqual(["x"]);
    expect(unknownKeys({}, [])).toEqual([]);
    expect(unknownKeys(undefined, [])).toEqual([]);
  });
  it("is TOP-LEVEL only — a nested unknown key does not leak up", () => {
    // saveConfig-style: nested shapes are the handler's own concern.
    expect(unknownKeys({ keys: { evil: 1 } }, ["keys", "email"])).toEqual([]);
  });
});

/* ===========================================================================
 * ADMIN-SEC — admin roles, owner protection & step-up re-auth
 * ===========================================================================
 * These pure guards ARE the access matrix, so this block is the executable copy
 * of it. Every case defaults to DENY: the recurring failure mode for claim-based
 * roles is a truthiness check letting `undefined` / "OWNER" / "owner " through.
 */
const ctx = (token, uid = "a1") => (token === null ? {} : { auth: { uid, token } });
const OWNER = { admin: true, role: "owner", email: "owner@test.com" };
const MANAGER = { admin: true, role: "manager", email: "mgr@test.com" };
const LEGACY = { admin: true, email: "legacy@test.com" };          // pre-ADMIN-SEC claim
const USER = { email: "user@test.com" };

describe("guards.roleOf (ADMIN-SEC: strict, null-safe role read)", () => {
  it("reads the two real roles", () => {
    expect(roleOf(OWNER)).toBe("owner");
    expect(roleOf(MANAGER)).toBe("manager");
  });

  it("is empty for a legacy admin with no role claim", () => {
    expect(roleOf(LEGACY)).toBe("");
  });

  it("never infers a role from a non-admin token", () => {
    expect(roleOf({ role: "owner" })).toBe("");            // role without admin:true
    expect(roleOf({ admin: false, role: "owner" })).toBe("");
    expect(roleOf(USER)).toBe("");
    expect(roleOf(null)).toBe("");
    expect(roleOf(undefined)).toBe("");
  });

  it("rejects near-miss role values instead of normalising them", () => {
    for (const role of ["OWNER", "Owner", "owner ", " owner", "ownerr", "", null, undefined, 1, true]) {
      expect(roleOf({ admin: true, role })).toBe("");
    }
  });
});

describe("guards.requireAdmin (shared READ surface — any admin)", () => {
  it("admits owners, managers AND legacy role-less admins", () => {
    expect(requireAdmin(ctx(OWNER)).ok).toBe(true);
    expect(requireAdmin(ctx(MANAGER)).ok).toBe(true);
    expect(requireAdmin(ctx(LEGACY)).ok).toBe(true);       // migration window: read stays usable
  });

  it("reports the caller's role so callers can branch on it", () => {
    expect(requireAdmin(ctx(OWNER)).role).toBe("owner");
    expect(requireAdmin(ctx(MANAGER)).role).toBe("manager");
    expect(requireAdmin(ctx(LEGACY)).role).toBe("");
  });

  it("refuses non-admins and the unauthenticated", () => {
    expect(requireAdmin(ctx(USER))).toMatchObject({ ok: false, reason: "not-admin" });
    expect(requireAdmin(ctx({ admin: "true" }))).toMatchObject({ ok: false, reason: "not-admin" });
    expect(requireAdmin(ctx({ admin: 1 }))).toMatchObject({ ok: false, reason: "not-admin" });
    expect(requireAdmin(ctx(null))).toMatchObject({ ok: false, reason: "unauthenticated" });
    expect(requireAdmin(undefined)).toMatchObject({ ok: false, reason: "unauthenticated" });
  });
});

// ADMIN-SEP (CRYP-103b · Part C-1): the account-management (WRITE) surface is no
// longer a straight alias of requireAdmin. Exactly two admin types may act here —
// owner and manager. A legacy { admin:true } claim with no/unknown role is REFUSED
// (fails closed), eliminating the silent third "no-role admin gets full manager
// power" state. requireAdmin (the READ surface above) is deliberately UNCHANGED so a
// role-less admin can still read the panel during the migration window.
describe("guards.requireManager (account-management WRITE surface — owner or manager only)", () => {
  it("admits an explicit manager", () => {
    expect(requireManager(ctx(MANAGER))).toMatchObject({ ok: true, role: "manager" });
  });

  it("admits an owner (an owner outranks the manager surface)", () => {
    expect(requireManager(ctx(OWNER))).toMatchObject({ ok: true, role: "owner" });
  });

  it("CRYP-103: REFUSES a legacy role-less admin — the no-role manager grant is gone", () => {
    expect(requireManager(ctx(LEGACY))).toMatchObject({ ok: false, reason: "manager-required" });
  });

  it("CRYP-103: refuses an admin claim with an unknown/near-miss role", () => {
    for (const role of ["superadmin", "OWNER", "manager ", "admin", "", null, undefined]) {
      expect(requireManager(ctx({ admin: true, role })).ok).toBe(false);
    }
  });

  it("refuses non-admins and the unauthenticated (before it ever looks at the role)", () => {
    expect(requireManager(ctx(USER))).toMatchObject({ ok: false, reason: "not-admin" });
    expect(requireManager(ctx({ admin: 1 }))).toMatchObject({ ok: false, reason: "not-admin" });
    expect(requireManager(ctx(null))).toMatchObject({ ok: false, reason: "unauthenticated" });
    expect(requireManager(undefined)).toMatchObject({ ok: false, reason: "unauthenticated" });
  });
});

describe("guards.requireOwner (ADMIN-SEC: Settings + grant/revoke + purge)", () => {
  it("admits only an owner", () => {
    expect(requireOwner(ctx(OWNER))).toMatchObject({ ok: true, role: "owner" });
  });

  it("refuses a manager — this is the wall the whole build rests on", () => {
    expect(requireOwner(ctx(MANAGER))).toMatchObject({ ok: false, reason: "owner-required" });
  });

  it("refuses a legacy role-less admin (fails CLOSED until backfilled)", () => {
    expect(requireOwner(ctx(LEGACY))).toMatchObject({ ok: false, reason: "owner-required" });
  });

  it("refuses non-admins before it ever looks at the role", () => {
    expect(requireOwner(ctx(USER))).toMatchObject({ ok: false, reason: "not-admin" });
    expect(requireOwner(ctx({ role: "owner" }))).toMatchObject({ ok: false, reason: "not-admin" });
    expect(requireOwner(ctx(null))).toMatchObject({ ok: false, reason: "unauthenticated" });
  });
});

describe("guards.requireFreshAuth (ADMIN-SEC: step-up re-auth on sensitive calls)", () => {
  const now = Date.UTC(2026, 6, 18, 12, 0, 0);       // fixed clock
  const at = (secondsAgo) => ({ auth: { uid: "a1", token: { ...OWNER, auth_time: Math.floor(now / 1000) - secondsAgo } } });

  it("allows a token minted inside the window", () => {
    expect(requireFreshAuth(at(0), { now })).toMatchObject({ ok: true });
    expect(requireFreshAuth(at(599), { now })).toMatchObject({ ok: true });
  });

  it("tolerates clock skew at the edge rather than locking the owner out", () => {
    expect(requireFreshAuth(at(640), { now }).ok).toBe(true);      // 600 + 60 skew
  });

  it("denies a stale token", () => {
    expect(requireFreshAuth(at(3600), { now })).toMatchObject({ ok: false, reason: "reauth-required" });
  });

  it("denies when auth_time is missing or unusable — never assumes fresh", () => {
    for (const auth_time of [undefined, null, "", "abc", NaN, Infinity]) {
      expect(requireFreshAuth(ctx({ ...OWNER, auth_time }), { now })).toMatchObject({ ok: false, reason: "reauth-required" });
    }
    expect(requireFreshAuth(ctx(null), { now })).toMatchObject({ ok: false, reason: "reauth-required" });
  });

  it("honours the server kill-flag (console-flippable escape hatch)", () => {
    expect(requireFreshAuth(at(99999), { enforce: false, now })).toMatchObject({ ok: true, enforced: false });
  });

  it("respects a custom window", () => {
    expect(requireFreshAuth(at(120), { maxAgeSec: 30, skewSec: 0, now }).ok).toBe(false);
    expect(requireFreshAuth(at(20), { maxAgeSec: 30, skewSec: 0, now }).ok).toBe(true);
  });
});

/* ADMIN-0 — admin MFA/2FA gate.
 *
 * The mirror image of requireFreshAuth: that one defaults ON because a password
 * re-prompt can always be satisfied. This one defaults OFF, because until Identity
 * Platform MFA is enabled NOBODY can satisfy it — an on-by-default second factor
 * would wall every admin out of the panel the moment this code deploys.
 */
describe("guards.requireMfa (ADMIN-0: default OFF, factor read from the token)", () => {
  const mfaToken = (factor) => ctx({ ...OWNER, firebase: { sign_in_second_factor: factor } });

  it("is a no-op unless enforcement is on — including with no options at all", () => {
    expect(requireMfa(ctx(OWNER))).toMatchObject({ ok: true, enforced: false });
    expect(requireMfa(ctx(OWNER), {})).toMatchObject({ ok: true, enforced: false });
    expect(requireMfa(ctx(null), { enforce: false })).toMatchObject({ ok: true, enforced: false });
    expect(requireMfa(undefined)).toMatchObject({ ok: true, enforced: false });
  });

  it("admits a token carrying ANY second factor", () => {
    // Deliberately not an allowlist of factor types — enumerating them would silently
    // deny a type Identity Platform adds later, locking admins out over an upgrade
    // they never made.
    for (const factor of ["phone", "totp", "something-new"]) {
      expect(requireMfa(mfaToken(factor), { enforce: true }), factor).toMatchObject({ ok: true, enforced: true, factor });
    }
  });

  it("denies a password-only admin when enforcing — the whole point of the gate", () => {
    expect(requireMfa(ctx(OWNER), { enforce: true })).toMatchObject({ ok: false, reason: "mfa-required" });
    expect(requireMfa(ctx(MANAGER), { enforce: true })).toMatchObject({ ok: false, reason: "mfa-required" });
    expect(requireMfa(ctx(LEGACY), { enforce: true })).toMatchObject({ ok: false, reason: "mfa-required" });
  });

  it("fails CLOSED on a malformed or absent token rather than throwing", () => {
    for (const bad of [ctx(null), {}, { auth: {} }, { auth: { token: {} } }, { auth: { token: { firebase: {} } } }]) {
      expect(requireMfa(bad, { enforce: true })).toMatchObject({ ok: false, reason: "mfa-required" });
    }
    expect(requireMfa(undefined, { enforce: true })).toMatchObject({ ok: false, reason: "mfa-required" });
  });

  it("treats an empty / falsy factor as NO factor", () => {
    for (const empty of ["", null, undefined, false, 0]) {
      expect(requireMfa(mfaToken(empty), { enforce: true }), String(empty)).toMatchObject({ ok: false, reason: "mfa-required" });
    }
  });
});
