/**
 * Crypto Idea - Database Module
 * ==============================
 * Firestore CRUD for portfolios, coins, and transactions
 * 
 * SCHEMA:
 * users/{uid}
 *   ├── email, name, tier, joined, lastLogin, settings
 *   ├── learn/progress { xp, streak, lastActivity, completedLessons[], updatedAt }
 *   └── portfolios/{portfolioId}
 *         ├── name, created, order
 *         └── coins/{coinId}
 *               ├── id, symbol, name, thumb, addedAt
 *               ├── journal? { thesis, changeMyMind, status, priceAtAdd, createdAt, funnel?{dilution,volume,yield} }
 *               └── transactions/{txId}
 *                     ├── type, amount, priceAtBuy, date, createdAt
 */

import {
  collection, doc, setDoc, getDoc, getDocFromServer, getDocs,
  deleteDoc, updateDoc, deleteField, query, orderBy,
  serverTimestamp, writeBatch, increment, onSnapshot
} from "firebase/firestore";
import { db } from "./firebase.config.js";


// ════════════════════════════════════════
// DI-1 · Honest write-failure classification
// ════════════════════════════════════════
// A rejected write (permission-denied) is NOT necessarily a plan limit — it can be a
// MISSING parent (a portfolio/coin deleted on another device), or INVALID data (e.g. an
// over-long thesis — the founder's actual bug). Re-read the parent's counter from the
// SERVER and return the REAL reason, so the UI shows the truth and the limit/upgrade
// toast fires ONLY when the cap is genuinely reached. `limit` is the caller's current
// tier cap for that resource. Never throws — degrades to 'invalid-or-denied'.
//   'limit'            → the server count is truly >= the cap (the ONLY upgrade case)
//   'missing-target'   → the parent doc no longer exists (kick the self-heal)
//   'invalid-or-denied'→ the write was rejected for some other reason (bad data)
async function classifyLimitDenied(parentRef, countField, limit) {
  try {
    const snap = await getDocFromServer(parentRef);
    if (!snap.exists()) return "missing-target";
    const count = snap.data()[countField] || 0;
    if (typeof limit === "number" && count >= limit) return "limit";
    return "invalid-or-denied";
  } catch (_e) {
    return "invalid-or-denied";
  }
}


// ════════════════════════════════════════
// USER PROFILE
// ════════════════════════════════════════

// Read the server-authoritative user profile (users/{uid}). Tier and subscription
// live here — written by the admin panel, the PayPal webhook, and the seed — so the
// client must read them from Firestore (not local cache) to stay correct across
// devices and after admin changes. Returns { success:false } when the doc is missing.
export async function getUserProfile(uid, _retriesLeft = 2) {
  try {
    const snap = await getDocFromServer(doc(db, "users", uid));
    if (!snap.exists()) return { success: false };
    const data = snap.data();
    // On sign-in, loginUser() writes `lastLogin`; that concurrent pending write can briefly
    // surface a partial (latency-compensated) view of the doc that has only `lastLogin` and is
    // missing `tier`. If so, wait for the write to flush and re-read — otherwise we'd wrongly
    // fall back to the free tier on login. A real profile always has `tier`.
    if (data.tier === undefined && _retriesLeft > 0) {
      await new Promise(r => setTimeout(r, 400));
      return getUserProfile(uid, _retriesLeft - 1);
    }
    return { success: true, ...data };
  } catch (error) {
    // Right after sign-in the Firestore client's auth state can briefly lag, so the first
    // read may throw permission-denied. Retry after a short pause before giving up.
    if (_retriesLeft > 0) {
      await new Promise(r => setTimeout(r, 400));
      return getUserProfile(uid, _retriesLeft - 1);
    }
    return { success: false, error: error.message, code: error.code };
  }
}

// ════════════════════════════════════════
// PORTFOLIOS
// ════════════════════════════════════════

// Get all portfolios for a user. DI-2: retry a transient failure (mirrors
// getUserProfile) — right after sign-in the Firestore client's auth state can briefly
// lag and the first read throws permission-denied. A silent failure here used to strand
// the session on the phantom local "default" portfolio (G13/G30); the caller now shows a
// retry state instead, but the retry catches most transient cases first.
export async function getPortfolios(uid, _retriesLeft = 2) {
  try {
    const ref = collection(db, "users", uid, "portfolios");
    const q = query(ref, orderBy("order"));
    const snap = await getDocs(q);
    const portfolios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, portfolios };
  } catch (error) {
    if (_retriesLeft > 0) {
      await new Promise(r => setTimeout(r, 400));
      return getPortfolios(uid, _retriesLeft - 1);
    }
    return { success: false, error: error.message, code: error.code };
  }
}

// Create a new portfolio (atomically bumps the user's portfolioCount so the
// tier-limit rule can enforce the cap).
export async function createPortfolio(uid, name, order = 0, limit = null) {
  try {
    const ref = doc(collection(db, "users", uid, "portfolios"));
    const batch = writeBatch(db);
    batch.set(ref, {
      name: String(name || "").slice(0, 50),   // DI-1 defense clamp (mirror the rule's 1–50)
      created: serverTimestamp(),
      order,
      coinCount: 0
    });
    batch.update(doc(db, "users", uid), { portfolioCount: increment(1) });
    await batch.commit();
    return { success: true, id: ref.id };
  } catch (error) {
    const res = { success: false, error: error.message, code: error.code };
    if (error.code === "permission-denied")
      res.reason = await classifyLimitDenied(doc(db, "users", uid), "portfolioCount", limit);
    return res;
  }
}

// Delete a portfolio and all its coins/transactions
export async function deletePortfolio(uid, portfolioId) {
  try {
    const batch = writeBatch(db);

    // Delete all transactions in all coins
    const coinsSnap = await getDocs(
      collection(db, "users", uid, "portfolios", portfolioId, "coins")
    );
    for (const coinDoc of coinsSnap.docs) {
      const txSnap = await getDocs(
        collection(db, "users", uid, "portfolios", portfolioId, "coins", coinDoc.id, "transactions")
      );
      txSnap.docs.forEach(tx => batch.delete(tx.ref));
      batch.delete(coinDoc.ref);
    }

    // Delete the portfolio itself and decrement the user's portfolio counter
    batch.delete(doc(db, "users", uid, "portfolios", portfolioId));
    batch.update(doc(db, "users", uid), { portfolioCount: increment(-1) });
    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}

// Rename a portfolio (name only). coinCount is left untouched, so the rules'
// counterDeltaOk('coinCount') passes on a 0 delta and validPortfolioData bounds the
// name (1–50) — no rules change needed. The client also validates before the write.
export async function updatePortfolioName(uid, portfolioId, name) {
  try {
    await updateDoc(doc(db, "users", uid, "portfolios", portfolioId), { name });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}


// ════════════════════════════════════════
// COINS (within a portfolio)
// ════════════════════════════════════════

// Get all coins in a portfolio (with their transactions)
export async function getCoins(uid, portfolioId) {
  try {
    const coinsRef = collection(db, "users", uid, "portfolios", portfolioId, "coins");
    const coinsSnap = await getDocs(coinsRef);

    const coins = [];
    for (const coinDoc of coinsSnap.docs) {
      const coin = { id: coinDoc.id, ...coinDoc.data() };

      // Get transactions for this coin
      const txRef = collection(
        db, "users", uid, "portfolios", portfolioId, "coins", coinDoc.id, "transactions"
      );
      const txQuery = query(txRef, orderBy("date", "desc"));
      const txSnap = await getDocs(txQuery);
      coin.entries = txSnap.docs.map(t => ({ id: t.id, ...t.data() }));

      coins.push(coin);
    }

    return { success: true, coins };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}

// Add a coin to a portfolio (atomically bumps the portfolio's coinCount). An
// optional `journal` ({ thesis, changeMyMind, status, priceAtAdd, createdAt }) is
// stored on the coin when the user writes a thesis in the Buy-Journal prompt.
export async function addCoin(uid, portfolioId, coinData, journal = null, limit = null) {
  try {
    const ref = doc(db, "users", uid, "portfolios", portfolioId, "coins", coinData.id);
    const batch = writeBatch(db);
    const coinDoc = {
      // DI-1 defense clamps — mirror validCoinData bounds so a stray long field from an
      // upstream feed can never itself trip a permission-denied (symbol 20 / name 64 / thumb 512).
      symbol: String(coinData.symbol || "").slice(0, 20),
      name: String(coinData.name || "").slice(0, 64),
      thumb: String(coinData.thumb || "").slice(0, 512),
      addedAt: serverTimestamp(),
      txCount: 0
    };
    if (journal) coinDoc.journal = journal;
    batch.set(ref, coinDoc);
    batch.update(doc(db, "users", uid, "portfolios", portfolioId), { coinCount: increment(1) });
    await batch.commit();
    return { success: true };
  } catch (error) {
    const res = { success: false, error: error.message, code: error.code };
    if (error.code === "permission-denied")
      res.reason = await classifyLimitDenied(doc(db, "users", uid, "portfolios", portfolioId), "coinCount", limit);
    return res;
  }
}

// Set/replace the investment-thesis journal on a coin — used both to write a thesis
// for an existing holding and to record the "is your thesis still intact?" decision
// (the caller passes the full journal object with the updated `status`).
export async function updateCoinJournal(uid, portfolioId, coinId, journal) {
  try {
    const ref = doc(db, "users", uid, "portfolios", portfolioId, "coins", coinId);
    await updateDoc(ref, { journal });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}

// Delete a coin's thesis journal (§J2) — removes the `journal` field so the coin
// returns to "Needs a thesis". The coin/holding itself is untouched; firestore.rules
// allows a coin with no journal (validCoinData: journal is optional).
export async function clearCoinJournal(uid, portfolioId, coinId) {
  try {
    const ref = doc(db, "users", uid, "portfolios", portfolioId, "coins", coinId);
    await updateDoc(ref, { journal: deleteField() });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}

// ════════════════════════════════════════
// LEARN PROGRESS
// ════════════════════════════════════════

// Read the user's Learn gamification state (users/{uid}/learn/progress). Returns a
// zeroed default when the doc doesn't exist yet (a fresh learner), so callers always
// get a usable shape. These persisted fields are the source of truth; level / badges /
// module-state are DERIVED from them client-side (see utils/learn.js).
export async function getLearnProgress(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid, "learn", "progress"));
    if (!snap.exists()) {
      return { success: true, xp: 0, streak: 0, lastActivity: "", completedLessons: [], updatedAt: "" };
    }
    return { success: true, ...snap.data() };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}

// Persist the user's Learn progress to the single progress doc. Writes exactly the
// fields validLearnProgress (firestore.rules) allows and stamps updatedAt, so the
// write always satisfies the rule regardless of any extra keys the caller passes.
export async function saveLearnProgress(uid, progress) {
  try {
    const p = progress || {};
    const record = {
      xp: Number(p.xp) || 0,
      streak: Number(p.streak) || 0,
      lastActivity: typeof p.lastActivity === "string" ? p.lastActivity : "",
      completedLessons: Array.isArray(p.completedLessons) ? p.completedLessons : [],
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", uid, "learn", "progress"), record);
    return { success: true, ...record };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}

// Remove a coin and all its transactions
export async function removeCoin(uid, portfolioId, coinId) {
  try {
    const batch = writeBatch(db);

    // Delete all transactions
    const txSnap = await getDocs(
      collection(db, "users", uid, "portfolios", portfolioId, "coins", coinId, "transactions")
    );
    txSnap.docs.forEach(tx => batch.delete(tx.ref));

    // Delete the coin and decrement the portfolio's coin counter
    batch.delete(doc(db, "users", uid, "portfolios", portfolioId, "coins", coinId));
    batch.update(doc(db, "users", uid, "portfolios", portfolioId), { coinCount: increment(-1) });
    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}


// ════════════════════════════════════════
// TRANSACTIONS (within a coin)
// ════════════════════════════════════════

// Add a transaction (buy or sell) — atomically bumps the coin's txCount.
export async function addTransaction(uid, portfolioId, coinId, txData, limit = null) {
  try {
    const ref = doc(
      collection(db, "users", uid, "portfolios", portfolioId, "coins", coinId, "transactions")
    );
    const batch = writeBatch(db);
    batch.set(ref, {
      type: txData.type || "buy",     // "buy" or "sell"
      amount: txData.amount,           // number of coins
      priceAtBuy: txData.priceAtBuy,   // price per coin at time of tx
      date: txData.date,               // ISO datetime string
      createdAt: serverTimestamp()
    });
    batch.update(doc(db, "users", uid, "portfolios", portfolioId, "coins", coinId), { txCount: increment(1) });
    await batch.commit();
    return { success: true, id: ref.id };
  } catch (error) {
    const res = { success: false, error: error.message, code: error.code };
    if (error.code === "permission-denied")
      res.reason = await classifyLimitDenied(doc(db, "users", uid, "portfolios", portfolioId, "coins", coinId), "txCount", limit);
    return res;
  }
}

// Update a transaction
export async function updateTransaction(uid, portfolioId, coinId, txId, txData) {
  try {
    const ref = doc(
      db, "users", uid, "portfolios", portfolioId, "coins", coinId, "transactions", txId
    );
    await updateDoc(ref, {
      type: txData.type,
      amount: txData.amount,
      priceAtBuy: txData.priceAtBuy,
      date: txData.date
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}

// Delete a transaction — atomically decrements the coin's txCount.
export async function deleteTransaction(uid, portfolioId, coinId, txId) {
  try {
    const batch = writeBatch(db);
    batch.delete(
      doc(db, "users", uid, "portfolios", portfolioId, "coins", coinId, "transactions", txId)
    );
    batch.update(doc(db, "users", uid, "portfolios", portfolioId, "coins", coinId), { txCount: increment(-1) });
    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message, code: error.code };
  }
}


// Tier limits live in src/hooks/useUpgrade.js (single source of truth). They are
// ENFORCED server-side by firestore.rules (reading config/app.plans); the client
// only reads them for display, so they don't belong in this data-access layer.

// ═══ C-A3 (C12): live owner-doc listeners — multi-device sync ═══
// A second device's edits appear WITHOUT a reload. Bounded, no fan-out: the
// portfolios LIST + the ACTIVE portfolio's coins only, plus the single Learn
// progress doc. All watchers degrade silently on error (last-good state stays,
// matching the one-shot readers) and return their unsubscribe function.

// Portfolio metas (name/order) for the signed-in user.
export function watchPortfolios(uid, onChange) {
  const q = query(collection(db, "users", uid, "portfolios"), orderBy("order"));
  return onSnapshot(q,
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => { /* keep last-good */ });
}

// The ACTIVE portfolio's coins, entries included. Every transaction write bumps
// the parent coin's txCount (writeBatch in addTransaction), so tx changes surface
// here too — and only the CHANGED coins re-read their transactions (docChanges),
// keeping reads minimal on the hot path.
// Review fix: onSnapshot does NOT await async callbacks, so rapid snapshots can
// finish out of order — a GENERATION counter makes a superseded (older) snapshot
// stop mutating the cache and never call onChange, so fresh data is never
// overwritten by a late-finishing stale read.
// `onError` (optional): a PERMANENT stream failure (disconnect/permission) would
// otherwise silently freeze the UI on last-good data — the caller can surface it.
export function watchCoins(uid, portfolioId, onChange, onError) {
  const cache = new Map();   // coinId -> coin with entries (last known)
  let gen = 0;               // newest snapshot generation
  const ref = collection(db, "users", uid, "portfolios", portfolioId, "coins");
  return onSnapshot(ref, async (snap) => {
    const myGen = ++gen;
    try {
      for (const ch of snap.docChanges()) {
        if (myGen !== gen) return;                     // superseded mid-await — stop
        const id = ch.doc.id;
        if (ch.type === "removed") { cache.delete(id); continue; }
        const coin = { id, ...ch.doc.data() };
        const txSnap = await getDocs(query(
          collection(db, "users", uid, "portfolios", portfolioId, "coins", id, "transactions"),
          orderBy("date", "desc")));
        if (myGen !== gen) return;                     // don't write stale data
        coin.entries = txSnap.docs.map((t) => ({ id: t.id, ...t.data() }));
        cache.set(id, coin);
      }
      if (myGen !== gen) return;
      onChange(snap.docs.map((d) => cache.get(d.id)).filter(Boolean));
    } catch (e) { /* keep last-good */ }
  }, (e) => { if (onError) onError(e); });
}

// The user's Learn progress doc (same result shape as getLearnProgress).
export function watchLearnProgress(uid, onChange) {
  return onSnapshot(doc(db, "users", uid, "learn", "progress"),
    (snap) => onChange(snap.exists() ? { success: true, ...snap.data() } : { success: false }),
    () => onChange({ success: false }));
}
