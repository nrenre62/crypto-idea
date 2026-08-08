// src/utils/tx.js
// Pure helpers for the coin transaction list. No React, no I/O — unit-tested directly.

// R19-5: normalize a transaction's `createdAt` to epoch millis, tolerating every shape it
// takes across the app: a Firestore Timestamp (.toMillis()), a serialized {seconds}/
// {_seconds} (from a JSON export), a plain number (the optimistic Date.now() stamp), an
// ISO string, or missing → 0 (sorts last within its date group).
export function txCreatedMillis(e) {
  const v = e && e.createdAt;
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") { const t = Date.parse(v); return Number.isNaN(t) ? 0 : t; }
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  if (typeof v._seconds === "number") return v._seconds * 1000;
  return 0;
}

// R19-5: newest-first ordered COPY of a coin's transactions. Primary key = the transaction
// `date` (descending); tie-break = `createdAt` (descending), so two tx added in the SAME
// minute show the most-recently-added on top (`date` is only minute-precision). A backdated
// tx sorts down to its real date, not to the top.
export function sortTx(entries) {
  return [...(entries || [])].sort((a, b) => {
    const d = (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0);
    if (d !== 0) return d;
    return txCreatedMillis(b) - txCreatedMillis(a);
  });
}

// TX-SAFE (Part B): append a row only if its id isn't already present. The live watcher
// (dbWatchCoins) has often already delivered the same Firestore doc id that the optimistic
// path is about to add, so an unconditional append would land it TWICE — a duplicate React
// key, which let a single delete arm/remove both rows. Mirrors addCoin's existing guard
// (CryptoIdea.jsx). Pure; returns the SAME array reference when it's a no-op.
export function appendUnique(entries, row) {
  const arr = entries || [];
  return arr.some(x => x.id === row.id) ? arr : [...arr, row];
}

// TX-SAFE (Part B): drop any duplicate-id rows, keeping the first occurrence — a
// belt-and-suspenders render guard so a duplicate id can never produce two rows / a
// duplicate key even if one slips into local state. Pure.
export function dedupeById(entries) {
  const seen = new Set();
  return (entries || []).filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

// CRYP-94 (Group B, findings 9+10): the single source of truth for the "you can't sell more
// than you hold" invariant. Replays a coin's transactions in DATE order (createdAt tie-break,
// same order remEntry/sortTx use) and returns the FIRST sell whose running balance drops below
// zero (epsilon -1e-8 to tolerate float dust), else null. Date-aware, so a buy dated AFTER a
// sell does not cover it. The add-sell guard, the edit guard, and remEntry all route through
// this one function, so the invariant is enforced identically on add, edit, and delete.
// Pure — no React, no I/O.
export function firstOverSoldSell(entries) {
  const arr = [...(entries || [])].sort((a, b) => {
    const d = (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0);
    if (d !== 0) return d;
    return txCreatedMillis(a) - txCreatedMillis(b);
  });
  let bal = 0;
  for (const e of arr) {
    bal = e.type === "sell" ? bal - e.amount : bal + e.amount;
    if (e.type === "sell" && bal < -1e-8) return e;
  }
  return null;
}

// CRYP-94 (Group B, finding 12): a transaction may not be dated in the future. Compared at
// DAY granularity (holdings/P&L are date-driven, and the app's eDate carries a mixed UTC/local
// basis, so a day comparison avoids timezone false-rejects while still blocking any future
// date). `today` defaults to the current UTC day; callers pass it explicitly for deterministic
// tests. Pure.
export function isFutureTx(dateStr, today) {
  const t = today || new Date().toISOString().slice(0, 10);
  return String(dateStr || "").slice(0, 10) > t;
}

// R19-4: windowed page numbers for the transaction pager — always the first + last page
// plus a small window around the current one, with "…" for the gaps.
// e.g. pageWindow(6, 20) → [1, "…", 5, 6, 7, "…", 20].
export function pageWindow(pg, pages) {
  const out = [];
  const keep = new Set([1, pages, pg - 1, pg, pg + 1]);
  for (let i = 1; i <= pages; i++) {
    if (keep.has(i)) out.push(i);
    else if (out[out.length - 1] !== "…") out.push("…");
  }
  return out;
}
