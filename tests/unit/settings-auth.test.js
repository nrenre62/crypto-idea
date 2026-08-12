import { describe, it, expect } from "vitest";
import {
  ALGO, KEYLEN, UNLOCK_MS, RESET_MS,
  checkStrength, hashPassword, verifyPassword, hashToken, generateToken,
} from "../../functions/settings-auth.js";

/**
 * ADMIN-6 — the Settings-password crypto core (pure, node:crypto only).
 *
 * The whole point of ADMIN-6 is a SECOND lock on the owner-only Settings screen, so
 * the hashing/strength/token logic has to be right or the lock is theatre. It's a
 * pure CommonJS module (no firebase, no emulator) exactly so it's unit-testable here,
 * the same pattern as guards.js / billing.js. Rules: scrypt via node:crypto (never
 * roll our own), never store/echo plaintext, timingSafeEqual on verify, single-use
 * hashed reset tokens.
 */

describe("settings-auth.checkStrength (server-authoritative floor)", () => {
  it("accepts a password that meets every rule (>=12, upper+lower+number)", () => {
    expect(checkStrength("Abcdefgh1234").ok).toBe(true);
  });
  it("rejects anything shorter than 12 characters", () => {
    expect(checkStrength("Abc12345").ok).toBe(false);   // 8 chars
    expect(checkStrength("Abcdefgh123").ok).toBe(false); // 11 chars
  });
  it("requires an uppercase letter", () => {
    expect(checkStrength("abcdefgh1234").ok).toBe(false);
  });
  it("requires a lowercase letter", () => {
    expect(checkStrength("ABCDEFGH1234").ok).toBe(false);
  });
  it("requires a number", () => {
    expect(checkStrength("Abcdefghijkl").ok).toBe(false);
  });
  it("returns a human reason on failure and none is thrown on junk input", () => {
    const r = checkStrength("");
    expect(r.ok).toBe(false);
    expect(typeof r.reason).toBe("string");
    expect(checkStrength(null).ok).toBe(false);
    expect(checkStrength(undefined).ok).toBe(false);
  });
});

describe("settings-auth.hashPassword / verifyPassword (scrypt round-trip)", () => {
  it("verifies the correct password and rejects the wrong one", () => {
    const rec = hashPassword("Abcdefgh1234");
    expect(verifyPassword("Abcdefgh1234", rec)).toBe(true);
    expect(verifyPassword("Abcdefgh1235", rec)).toBe(false);
  });
  it("stores scrypt, never the plaintext", () => {
    const pw = "Abcdefgh1234";
    const rec = hashPassword(pw);
    expect(rec.algo).toBe(ALGO);
    expect(rec.algo).toBe("scrypt");
    expect(rec.hash).not.toContain(pw);
    expect(rec.salt).toBeTruthy();
    expect(rec.hash).toBeTruthy();
    // hash is the full keylen in hex (2 hex chars per byte).
    expect(rec.hash).toHaveLength(KEYLEN * 2);
  });
  it("uses a fresh random salt per call (same password -> different salt+hash)", () => {
    const a = hashPassword("Abcdefgh1234");
    const b = hashPassword("Abcdefgh1234");
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    // …but each still verifies its own.
    expect(verifyPassword("Abcdefgh1234", a)).toBe(true);
    expect(verifyPassword("Abcdefgh1234", b)).toBe(true);
  });
  it("is null-safe / shape-safe on a malformed record (returns false, never throws)", () => {
    expect(verifyPassword("x", null)).toBe(false);
    expect(verifyPassword("x", {})).toBe(false);
    expect(verifyPassword("x", { algo: "scrypt", salt: "aa" })).toBe(false);        // no hash
    expect(verifyPassword("x", { algo: "md5", salt: "aa", hash: "bb" })).toBe(false); // wrong algo
    expect(verifyPassword("x", { algo: "scrypt", salt: "aa", hash: "zz" })).toBe(false); // non-hex/short hash
  });
});

describe("settings-auth token helpers (emailed reset)", () => {
  it("hashToken is deterministic and never equals the raw token", () => {
    const t = "deadbeef";
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
  });
  it("generateToken returns a raw token + its hash, and the hash matches hashToken", () => {
    const { token, tokenHash } = generateToken();
    expect(token).toBeTruthy();
    expect(tokenHash).toBeTruthy();
    expect(token).not.toBe(tokenHash);
    expect(hashToken(token)).toBe(tokenHash);
  });
  it("distinct tokens produce distinct hashes", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });
});

describe("settings-auth TTL constants (safe, bounded windows)", () => {
  it("exposes a ~10-minute unlock and a ~45-minute reset window", () => {
    expect(UNLOCK_MS).toBe(10 * 60 * 1000);
    expect(RESET_MS).toBe(45 * 60 * 1000);
  });
});
