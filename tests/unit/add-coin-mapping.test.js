/**
 * CRYP-109 · client addCoin → addCoinGuarded callable mapping (B3 PR-2).
 *
 * PR-2 rewires src/api/firebase-database.js addCoin from a direct (now rules-denied)
 * runTransaction coin write to
 *     await httpsCallable(functions, "addCoinGuarded")({ portfolioId, coin, journal? })
 * catching the client HttpsError and mapping (code + details.reason) back to the EXISTING
 * data-layer contract { success, code, reason }. This unit suite is the PRIMARY home for
 * that mapping — the callable BODY is proven in tests/functions-callable.test.js (CI-only).
 *
 * Mapping table (client `error.code` → stripped code + `error.details.reason`):
 *   success                                             → { success:true }
 *   already-exists                                      → reason:'already-exists'
 *   failed-precondition + details.reason:'limit'        → reason:'limit'
 *   failed-precondition + details.reason:'missing-target' → reason:'missing-target'
 *   failed-precondition/invalid-argument + 'invalid-or-denied' → reason:'invalid-or-denied'
 *   resource-exhausted + details.reason:'rate-limited'  → reason:'rate-limited'   (NEW)
 *   fallback (NO details): map on the stripped code; failed-precondition/invalid-argument
 *     default to 'invalid-or-denied', NEVER a guessed 'limit' (the DI-1 invariant).
 *
 * RED today: addCoin still does the direct transaction write — it NEVER calls httpsCallable,
 * so the invocation/payload assertions fail and every error variant returns {success:true}
 * (the stubbed transaction resolves "ok") instead of the mapped reason. Red for the right reason.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// The callable seam the rewire introduces. hoisted so the vi.mock factory can close over it.
const { callable } = vi.hoisted(() => ({ callable: vi.fn() }));
vi.mock("firebase/functions", () => ({ httpsCallable: vi.fn(() => callable) }));

// firebase-database.js imports the whole firestore surface + db/functions from the config.
// The CURRENT addCoin still uses doc/serverTimestamp/runTransaction; the rewired one won't.
// Stub them so the module import loads either way (runTransaction RESOLVES so the current
// transaction path returns {success:true} — proving the mapping is absent, not crashing).
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), doc: vi.fn(), setDoc: vi.fn(), getDoc: vi.fn(),
  getDocFromServer: vi.fn(), getDocs: vi.fn(), deleteDoc: vi.fn(), updateDoc: vi.fn(),
  deleteField: vi.fn(), query: vi.fn(), orderBy: vi.fn(), serverTimestamp: vi.fn(),
  writeBatch: vi.fn(), increment: vi.fn(), onSnapshot: vi.fn(),
  runTransaction: vi.fn().mockResolvedValue("ok"),
}));
vi.mock("../../src/api/firebase.config.js", () => ({ db: {}, functions: {} }));

import { httpsCallable } from "firebase/functions";
import { addCoin } from "../../src/api/firebase-database.js";

// A client-side Cloud Functions error: `code` is prefixed `functions/…`, and `details`
// carries the server's { reason } payload the mapping keys off (absent when omitted).
const httpsError = (code, reason) => {
  const e = new Error("the server refused this add");
  e.code = `functions/${code}`;
  if (reason !== undefined) e.details = { reason };
  return e;
};

const COIN = { id: "bitcoin", symbol: "btc", name: "Bitcoin", thumb: "t.png" };

describe("addCoin → addCoinGuarded mapping (CRYP-109)", () => {
  beforeEach(() => { vi.clearAllMocks(); callable.mockReset(); });

  it("CRYP-109: on success returns {success:true} and calls addCoinGuarded with {portfolioId, coin} — no uid, no limit", async () => {
    callable.mockResolvedValue({ data: { success: true, coinCount: 1 } });
    const res = await addCoin("u1", "p1", COIN, null, 30);
    expect(res.success).toBe(true);
    // the rewired seam: httpsCallable(functions, "addCoinGuarded")({...})
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), "addCoinGuarded");
    expect(callable).toHaveBeenCalledTimes(1);
    const payload = callable.mock.calls[0][0];
    // exactly the server-owned payload — the uid + tier limit are NOT sent (the server re-derives them).
    expect(payload.portfolioId).toBe("p1");
    expect(payload.coin).toEqual(expect.objectContaining({ id: "bitcoin" }));
    expect(payload).not.toHaveProperty("uid");
    expect(payload).not.toHaveProperty("limit");
    expect(payload.journal).toBeUndefined();   // journal is omitted when none is written
  });

  it("CRYP-109: forwards the journal in the payload when a thesis is provided", async () => {
    callable.mockResolvedValue({ data: { success: true, coinCount: 2 } });
    const journal = { thesis: "x", changeMyMind: "y", status: "intact", priceAtAdd: 1, createdAt: "2026-01-01" };
    await addCoin("u1", "p1", COIN, journal, 30);
    expect(callable).toHaveBeenCalledTimes(1);
    const payload = callable.mock.calls[0][0];
    expect(payload.journal).toEqual(journal);
    expect(payload).not.toHaveProperty("uid");
    expect(payload).not.toHaveProperty("limit");
  });

  it("CRYP-109: already-exists code → reason:'already-exists'", async () => {
    callable.mockRejectedValue(httpsError("already-exists"));
    const res = await addCoin("u1", "p1", COIN, null, 30);
    expect(res.reason).toBe("already-exists");
    expect(res.success).toBe(false);
  });

  it("CRYP-109: failed-precondition + details.reason:'limit' → reason:'limit'", async () => {
    callable.mockRejectedValue(httpsError("failed-precondition", "limit"));
    const res = await addCoin("u1", "p1", COIN, null, 30);
    expect(res.reason).toBe("limit");
    expect(res.success).toBe(false);
  });

  it("CRYP-109: failed-precondition + details.reason:'missing-target' → reason:'missing-target'", async () => {
    callable.mockRejectedValue(httpsError("failed-precondition", "missing-target"));
    const res = await addCoin("u1", "p1", COIN, null, 30);
    expect(res.reason).toBe("missing-target");
    expect(res.success).toBe(false);
  });

  it("CRYP-109: invalid-argument + details.reason:'invalid-or-denied' → reason:'invalid-or-denied'", async () => {
    callable.mockRejectedValue(httpsError("invalid-argument", "invalid-or-denied"));
    const res = await addCoin("u1", "p1", COIN, null, 30);
    expect(res.reason).toBe("invalid-or-denied");
    expect(res.success).toBe(false);
  });

  it("CRYP-109: resource-exhausted + details.reason:'rate-limited' → reason:'rate-limited' (the NEW throttle reason)", async () => {
    callable.mockRejectedValue(httpsError("resource-exhausted", "rate-limited"));
    const res = await addCoin("u1", "p1", COIN, null, 30);
    expect(res.reason).toBe("rate-limited");
    expect(res.success).toBe(false);
  });

  // DI-1 invariant: a failed-precondition with NO details must NEVER be guessed as 'limit'
  // (the founder's false coin-limit bug) — it defaults to 'invalid-or-denied'.
  it("CRYP-109: fallback — failed-precondition with NO details maps to 'invalid-or-denied', NEVER 'limit'", async () => {
    callable.mockRejectedValue(httpsError("failed-precondition"));   // no details
    const res = await addCoin("u1", "p1", COIN, null, 30);
    expect(res.reason).not.toBe("limit");
    expect(res.reason).toBe("invalid-or-denied");
    expect(res.success).toBe(false);
  });

  it("CRYP-109: fallback — invalid-argument with NO details maps to 'invalid-or-denied'", async () => {
    callable.mockRejectedValue(httpsError("invalid-argument"));      // no details
    const res = await addCoin("u1", "p1", COIN, null, 30);
    expect(res.reason).toBe("invalid-or-denied");
    expect(res.success).toBe(false);
  });
});
