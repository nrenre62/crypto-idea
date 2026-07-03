import { describe, it, expect } from "vitest";
import { utcDayKey, rateDocPath, consumeDailyBudget, checkCooldown, appCheckOk } from "../../functions/guards.js";

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
