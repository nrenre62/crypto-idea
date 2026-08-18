/**
 * CRYP-111 · client addTransaction → addTransactionGuarded callable mapping (B3 PR-tx-2).
 *
 * PR-tx-2 rewires src/api/firebase-database.js addTransaction from a direct (now rules-denied)
 * writeBatch tx write (set the tx doc + increment(txCount)) to
 *     await httpsCallable(functions, "addTransactionGuarded")({ portfolioId, coinId, tx })
 * catching the client HttpsError and mapping (stripped code + details.reason) back to the EXISTING
 * data-layer contract { success, code, reason, id } (res.data.txId → id). This unit suite is the
 * PRIMARY home for that mapping — the callable BODY is proven in tests/functions-callable.test.js
 * (CI-only). Mirrors add-coin-mapping.test.js (CRYP-109).
 *
 * Mapping table (client `error.code` → stripped code + `error.details.reason`):
 *   success                                             → { success:true, id }   (id = data.txId)
 *   failed-precondition + details.reason:'limit'        → reason:'limit'
 *   failed-precondition + details.reason:'missing-target' → reason:'missing-target'
 *   failed-precondition/invalid-argument + 'invalid-or-denied' → reason:'invalid-or-denied'
 *   resource-exhausted + details.reason:'rate-limited'  → reason:'rate-limited'
 *   fallback (NO details): map on the stripped code; failed-precondition/invalid-argument
 *     default to 'invalid-or-denied', NEVER a guessed 'limit' (the DI-1 invariant).
 * There is NO 'already-exists' case — the tx doc uses an auto-id (server never throws it).
 *
 * RED today: addTransaction still does the direct writeBatch write — it NEVER calls httpsCallable,
 * so the invocation/payload assertions fail and every error variant returns {success:true} (the
 * stubbed batch commit resolves) instead of the mapped reason. Red for the right reason.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// The callable seam the rewire introduces. hoisted so the vi.mock factory can close over it.
const { callable } = vi.hoisted(() => ({ callable: vi.fn() }));
vi.mock("firebase/functions", () => ({ httpsCallable: vi.fn(() => callable) }));

// firebase-database.js imports the whole firestore surface + db/functions from the config.
// The CURRENT addTransaction still uses writeBatch/doc/serverTimestamp/increment; the rewired
// one won't. Stub them so the module import loads either way AND the current writeBatch path
// RESOLVES to success (batch.commit resolves, doc has an id) — proving the mapping is absent,
// not crashing (mirrors how add-coin-mapping stubs runTransaction → "ok").
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(), doc: vi.fn(() => ({ id: "current-batch-id" })), setDoc: vi.fn(),
  getDoc: vi.fn(), getDocFromServer: vi.fn(), getDocs: vi.fn(), deleteDoc: vi.fn(),
  updateDoc: vi.fn(), deleteField: vi.fn(), query: vi.fn(), orderBy: vi.fn(),
  serverTimestamp: vi.fn(), increment: vi.fn(), onSnapshot: vi.fn(),
  runTransaction: vi.fn().mockResolvedValue("ok"),
  writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), commit: vi.fn().mockResolvedValue() })),
}));
vi.mock("../../src/api/firebase.config.js", () => ({ db: {}, functions: {} }));

import { httpsCallable } from "firebase/functions";
import { addTransaction } from "../../src/api/firebase-database.js";

// A client-side Cloud Functions error: `code` is prefixed `functions/…`, and `details`
// carries the server's { reason } payload the mapping keys off (absent when omitted).
const httpsError = (code, reason) => {
  const e = new Error("the server refused this transaction");
  e.code = `functions/${code}`;
  if (reason !== undefined) e.details = { reason };
  return e;
};

const TX = { type: "buy", amount: 1.5, priceAtBuy: 100, date: "2026-01-01T00:00" };

describe("addTransaction → addTransactionGuarded mapping (CRYP-111)", () => {
  beforeEach(() => { vi.clearAllMocks(); callable.mockReset(); });

  it("CRYP-111: on success returns {success:true,id} and calls addTransactionGuarded with {portfolioId,coinId,tx} — no uid, no limit", async () => {
    callable.mockResolvedValue({ data: { success: true, txId: "tx_abc", txCount: 3 } });
    const res = await addTransaction("u1", "p1", "bitcoin", TX, 300);
    expect(res.success).toBe(true);
    expect(res.id).toBe("tx_abc");   // res.data.txId → id (the existing contract)
    // the rewired seam: httpsCallable(functions, "addTransactionGuarded")({...})
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), "addTransactionGuarded");
    expect(callable).toHaveBeenCalledTimes(1);
    const payload = callable.mock.calls[0][0];
    // exactly the server-owned payload — the uid + tier limit are NOT sent (the server re-derives them).
    expect(payload.portfolioId).toBe("p1");
    expect(payload.coinId).toBe("bitcoin");
    expect(payload.tx).toEqual(expect.objectContaining({ type: "buy", amount: 1.5, priceAtBuy: 100, date: "2026-01-01T00:00" }));
    expect(payload).not.toHaveProperty("uid");
    expect(payload).not.toHaveProperty("limit");
    // createdAt is server-set — the client never sends it.
    expect(payload.tx).not.toHaveProperty("createdAt");
  });

  it("CRYP-111: defaults a missing tx type to 'buy' in the payload", async () => {
    callable.mockResolvedValue({ data: { success: true, txId: "tx_def", txCount: 1 } });
    await addTransaction("u1", "p1", "bitcoin", { amount: 2, priceAtBuy: 5, date: "2026-02-02T00:00" }, 300);
    expect(callable).toHaveBeenCalledTimes(1);
    expect(callable.mock.calls[0][0].tx.type).toBe("buy");
  });

  it("CRYP-111: resource-exhausted + details.reason:'rate-limited' → reason:'rate-limited' (the throttle reason, distinct from the cap)", async () => {
    callable.mockRejectedValue(httpsError("resource-exhausted", "rate-limited"));
    const res = await addTransaction("u1", "p1", "bitcoin", TX, 300);
    expect(res.reason).toBe("rate-limited");
    expect(res.success).toBe(false);
  });

  it("CRYP-111: failed-precondition + details.reason:'limit' → reason:'limit'", async () => {
    callable.mockRejectedValue(httpsError("failed-precondition", "limit"));
    const res = await addTransaction("u1", "p1", "bitcoin", TX, 300);
    expect(res.reason).toBe("limit");
    expect(res.success).toBe(false);
  });

  it("CRYP-111: failed-precondition + details.reason:'missing-target' → reason:'missing-target'", async () => {
    callable.mockRejectedValue(httpsError("failed-precondition", "missing-target"));
    const res = await addTransaction("u1", "p1", "bitcoin", TX, 300);
    expect(res.reason).toBe("missing-target");
    expect(res.success).toBe(false);
  });

  it("CRYP-111: invalid-argument + details.reason:'invalid-or-denied' → reason:'invalid-or-denied'", async () => {
    callable.mockRejectedValue(httpsError("invalid-argument", "invalid-or-denied"));
    const res = await addTransaction("u1", "p1", "bitcoin", TX, 300);
    expect(res.reason).toBe("invalid-or-denied");
    expect(res.success).toBe(false);
  });

  // DI-1 invariant: a failed-precondition with NO details must NEVER be guessed as 'limit'
  // (the founder's false-limit bug) — it defaults to 'invalid-or-denied'.
  it("CRYP-111: fallback — failed-precondition with NO details maps to 'invalid-or-denied', NEVER 'limit'", async () => {
    callable.mockRejectedValue(httpsError("failed-precondition"));   // no details
    const res = await addTransaction("u1", "p1", "bitcoin", TX, 300);
    expect(res.reason).not.toBe("limit");
    expect(res.reason).toBe("invalid-or-denied");
    expect(res.success).toBe(false);
  });

  it("CRYP-111: fallback — invalid-argument with NO details maps to 'invalid-or-denied'", async () => {
    callable.mockRejectedValue(httpsError("invalid-argument"));      // no details
    const res = await addTransaction("u1", "p1", "bitcoin", TX, 300);
    expect(res.reason).toBe("invalid-or-denied");
    expect(res.success).toBe(false);
  });

  it("CRYP-111: strips the functions/ code prefix back to the bare code", async () => {
    callable.mockRejectedValue(httpsError("resource-exhausted", "rate-limited"));
    const res = await addTransaction("u1", "p1", "bitcoin", TX, 300);
    expect(res.code).toBe("resource-exhausted");   // not "functions/resource-exhausted"
  });
});
