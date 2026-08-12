/**
 * ADMIN-6 — Settings-password crypto core (pure CommonJS, node:crypto only).
 *
 * A SECOND lock on the owner-only Settings/API-keys screen, layered on top of the
 * unchanged owner claim (the password is a 2nd factor, never identity). All hashing,
 * strength and token logic lives here so it is fully unit-testable with no emulator —
 * the same dependency-free pattern as guards.js / billing.js. The caller (index.js)
 * owns the Firestore reads/writes and maps decisions to HttpsError.
 *
 * Security rules baked in:
 *  - scrypt via node:crypto — a memory-hard KDF; NEVER roll our own hashing.
 *  - the plaintext is never stored and never returned to a client; only {algo,salt,hash}.
 *  - verifyPassword compares with crypto.timingSafeEqual (constant-time), and is
 *    null/shape-safe so a malformed stored record can never throw its way to an allow.
 *  - reset tokens are single-use and stored HASHED (sha256) — the raw token only ever
 *    exists in the email; the ledger holds its hash, so a DB read can't replay a reset.
 */
const crypto = require("node:crypto");

const ALGO = "scrypt";
const KEYLEN = 64;        // scrypt output length (bytes) → 128 hex chars
const SALT_BYTES = 16;    // 128-bit random salt, fresh per password
const TOKEN_BYTES = 32;   // 256-bit reset token

// Server-enforced windows. The unlock lives in a server-only doc and the client timer
// is UX only — these are the real bounds. Kept modest so a walked-away Settings session
// re-locks quickly; the reset link is short-lived to bound a leaked-email window.
const UNLOCK_MS = 10 * 60 * 1000;   // 10 min Settings unlock
const RESET_MS = 45 * 60 * 1000;    // 45 min reset-link validity

// Strength floor — SERVER-authoritative (the client hint mirrors it, but a crafted
// request must still pass here). Min 12 incl. upper+lower+number. Returns the first
// failing reason, or { ok:true }. Junk input (null/undefined/non-string) → not ok,
// never a throw.
function checkStrength(pw) {
  const s = typeof pw === "string" ? pw : "";
  if (s.length < 12) return { ok: false, reason: "Settings password must be at least 12 characters." };
  if (s.length > 200) return { ok: false, reason: "Settings password is too long (max 200)." };
  if (!/[A-Z]/.test(s)) return { ok: false, reason: "Settings password needs an uppercase letter (A-Z)." };
  if (!/[a-z]/.test(s)) return { ok: false, reason: "Settings password needs a lowercase letter (a-z)." };
  if (!/[0-9]/.test(s)) return { ok: false, reason: "Settings password needs a number (0-9)." };
  return { ok: true };
}

// Hash a password with a fresh random salt. Returns the storable record — never the
// plaintext. scryptSync with default cost params (N=16384,r=8,p=1) fits the default
// maxmem, so it needs no tuning here.
function hashPassword(pw) {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const hash = crypto.scryptSync(String(pw), salt, KEYLEN).toString("hex");
  return { algo: ALGO, salt, hash };
}

// Constant-time verify. Fails closed on any shape mismatch: wrong/missing algo, missing
// salt/hash, non-hex or wrong-length stored hash (timingSafeEqual throws on unequal
// lengths, so we length-check first). Never throws — a malformed record returns false.
function verifyPassword(pw, record) {
  if (!record || record.algo !== ALGO || !record.salt || !record.hash) return false;
  let computed;
  try { computed = crypto.scryptSync(String(pw), record.salt, KEYLEN); }
  catch (e) { return false; }
  let stored;
  try { stored = Buffer.from(String(record.hash), "hex"); }
  catch (e) { return false; }
  if (stored.length !== computed.length) return false;
  return crypto.timingSafeEqual(computed, stored);
}

// sha256 of a reset token — deterministic, so a lookup by hash works, but not reversible.
function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

// A new reset token: the RAW value goes in the email only; the HASH is what gets stored.
function generateToken() {
  const token = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  return { token, tokenHash: hashToken(token) };
}

module.exports = {
  ALGO, KEYLEN, UNLOCK_MS, RESET_MS,
  checkStrength, hashPassword, verifyPassword, hashToken, generateToken,
};
