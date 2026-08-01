"use strict";

// AUTH-DUP (Part B): pure grouping helper for the admin duplicate-email detector.
// Given a list of Auth accounts, group them by LOWERCASED + trimmed email and keep only
// the emails shared by 2+ accounts. Read-only reporting — the owner resolves duplicates
// via the existing delete/trash flow; this only surfaces them. Kept pure + separate from
// functions/index.js so it's unit-testable without spinning up the emulator (mirrors
// billing.js / features.js). Firestore rules can't enforce email uniqueness (a rule sees
// one doc, not the whole collection) — Firebase Auth is the real uniqueness constraint, so
// this reports on Auth records, the source of truth for "how many accounts exist".
function groupDuplicateEmails(users) {
  const byEmail = new Map();
  for (const u of users || []) {
    const raw = u && u.email;
    if (!raw || typeof raw !== "string") continue;   // no email → can't be a duplicate
    const key = raw.trim().toLowerCase();
    if (!key) continue;                               // blank/whitespace-only → skip
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key).push(u);
  }
  const dups = [];
  for (const [email, accounts] of byEmail) {
    if (accounts.length >= 2) dups.push({ email, count: accounts.length, accounts });
  }
  // Most-duplicated first, then alphabetical — a stable, useful order for the admin card.
  dups.sort((a, b) => (b.count - a.count) || a.email.localeCompare(b.email));
  return dups;
}

module.exports = { groupDuplicateEmails };
