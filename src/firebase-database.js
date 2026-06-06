/**
 * Crypto Idea - Database Module
 * ==============================
 * Firestore CRUD for portfolios, coins, and transactions
 * 
 * SCHEMA:
 * users/{uid}
 *   ├── email, name, tier, joined, lastLogin, settings
 *   └── portfolios/{portfolioId}
 *         ├── name, created, order
 *         └── coins/{coinId}
 *               ├── id, symbol, name, thumb, addedAt
 *               └── transactions/{txId}
 *                     ├── type, amount, priceAtBuy, date, createdAt
 */

import {
  collection, doc, setDoc, getDoc, getDocs,
  deleteDoc, updateDoc, query, orderBy,
  serverTimestamp, writeBatch
} from "firebase/firestore";
import { db } from "./firebase.config.js";


// ════════════════════════════════════════
// PORTFOLIOS
// ════════════════════════════════════════

// Get all portfolios for a user
export async function getPortfolios(uid) {
  try {
    const ref = collection(db, "users", uid, "portfolios");
    const q = query(ref, orderBy("order"));
    const snap = await getDocs(q);
    const portfolios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { success: true, portfolios };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Create a new portfolio
export async function createPortfolio(uid, name, order = 0) {
  try {
    const ref = doc(collection(db, "users", uid, "portfolios"));
    await setDoc(ref, {
      name,
      created: serverTimestamp(),
      order
    });
    return { success: true, id: ref.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Rename a portfolio
export async function renamePortfolio(uid, portfolioId, name) {
  try {
    await updateDoc(doc(db, "users", uid, "portfolios", portfolioId), { name });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
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

    // Delete the portfolio itself
    batch.delete(doc(db, "users", uid, "portfolios", portfolioId));
    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
}

// Add a coin to a portfolio
export async function addCoin(uid, portfolioId, coinData) {
  try {
    const ref = doc(db, "users", uid, "portfolios", portfolioId, "coins", coinData.id);
    await setDoc(ref, {
      symbol: coinData.symbol,
      name: coinData.name,
      thumb: coinData.thumb || "",
      addedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
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

    // Delete the coin
    batch.delete(doc(db, "users", uid, "portfolios", portfolioId, "coins", coinId));
    await batch.commit();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// ════════════════════════════════════════
// TRANSACTIONS (within a coin)
// ════════════════════════════════════════

// Add a transaction (buy or sell)
export async function addTransaction(uid, portfolioId, coinId, txData) {
  try {
    const ref = doc(
      collection(db, "users", uid, "portfolios", portfolioId, "coins", coinId, "transactions")
    );
    await setDoc(ref, {
      type: txData.type || "buy",     // "buy" or "sell"
      amount: txData.amount,           // number of coins
      priceAtBuy: txData.priceAtBuy,   // price per coin at time of tx
      date: txData.date,               // ISO datetime string
      createdAt: serverTimestamp()
    });
    return { success: true, id: ref.id };
  } catch (error) {
    return { success: false, error: error.message };
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
    return { success: false, error: error.message };
  }
}

// Delete a transaction
export async function deleteTransaction(uid, portfolioId, coinId, txId) {
  try {
    await deleteDoc(
      doc(db, "users", uid, "portfolios", portfolioId, "coins", coinId, "transactions", txId)
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// ════════════════════════════════════════
// TIER LIMITS (enforced client + server side)
// ════════════════════════════════════════
export const TIER_LIMITS = {
  free: {
    maxPortfolios: 1,
    maxCoinsPerPortfolio: 10,
    maxTransactionsPerCoin: 50,
    maxDCAPerDay: 20,
    maxStorageGB: 0.005,
    price: "$0",
  },
  pro: {
    maxPortfolios: 10,
    maxCoinsPerPortfolio: 200,
    maxTransactionsPerCoin: 2000,
    maxDCAPerDay: Infinity,
    maxStorageGB: 0.5,
    price: "$9.99/month · $79.99/year",
  },
  premium: {
    maxPortfolios: 50,
    maxCoinsPerPortfolio: 500,
    maxTransactionsPerCoin: 5000,
    maxDCAPerDay: Infinity,
    maxStorageGB: 15,
    price: "$49.99/month · $399.99/year",
    customizable: true,
  }
};

// Check if user can add a portfolio
export function canAddPortfolio(tier, currentCount) {
  const limit = TIER_LIMITS[tier]?.maxPortfolios || 1;
  return currentCount < limit;
}

// Check if user can add a coin
export function canAddCoin(tier, currentCount) {
  const limit = TIER_LIMITS[tier]?.maxCoinsPerPortfolio || 20;
  return currentCount < limit;
}
