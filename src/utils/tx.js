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
