import { describe, it, expect } from "vitest";
import { clientIp, isValidIp, auditIp, normalizeIp } from "../../functions/net-utils.js";

// API-SECURITY (2026-07-08): the per-IP rate limiter must key on a client IP that an attacker
// can't forge by rotating X-Forwarded-For. Behind Firebase Hosting → Cloud Functions the platform
// APPENDS the real client IP on the RIGHT, so the LEFT-most token is attacker-controlled. clientIp
// reads a fixed number of trusted hops from the right and validates the token is a real IP.

describe("net-utils.isValidIp", () => {
  it("accepts well-formed IPv4", () => {
    expect(isValidIp("203.0.113.7")).toBe(true);
    expect(isValidIp("8.8.8.8")).toBe(true);
  });
  it("rejects octet overflow and non-IP junk", () => {
    expect(isValidIp("999.1.1.1")).toBe(false);
    expect(isValidIp("not-an-ip")).toBe(false);
    expect(isValidIp("")).toBe(false);
    expect(isValidIp(undefined)).toBe(false);
  });
  it("accepts an IPv6 literal", () => {
    expect(isValidIp("2001:db8::1")).toBe(true);
    expect(isValidIp("::1")).toBe(true);
  });

  // ADMIN-3 regression (2026-07-24): the old IPv6 regex had no place for dots, so an
  // IPv4-MAPPED address — what a dual-stack Node/Express server puts in req.ip — was
  // rejected, and clientIp fell through to "unknown". Every such caller then shared ONE
  // rate-limit bucket.
  it("accepts an IPv4-mapped IPv6 address (::ffff:x.x.x.x)", () => {
    expect(isValidIp("::ffff:203.0.113.9")).toBe(true);
    expect(isValidIp("::ffff:127.0.0.1")).toBe(true);
    expect(isValidIp("::FFFF:8.8.8.8")).toBe(true);
  });

  it("still rejects a mapped form with an invalid IPv4 tail, or a host:port", () => {
    expect(isValidIp("::ffff:999.1.1.1")).toBe(false);
    expect(isValidIp("1.2.3.4:8080")).toBe(false);
    expect(isValidIp("::ffff:not.an.ip.x")).toBe(false);
  });

  // The value reaches the audit log as "the origin of this action", so colon-junk must not
  // pass the shape gate and be recorded as if it were an address.
  it("rejects colon-junk that is not an address", () => {
    expect(isValidIp(":::::")).toBe(false);
    expect(isValidIp(":")).toBe(false);
    expect(isValidIp("::::1")).toBe(false);          // 3+ colon run
    expect(isValidIp("1::2::3")).toBe(false);         // two compression runs
    expect(isValidIp("12345::1")).toBe(false);        // group longer than 4 hex digits
  });

  it("still accepts the real IPv6 forms after that tightening", () => {
    expect(isValidIp("::")).toBe(true);
    expect(isValidIp("::1")).toBe(true);
    expect(isValidIp("2001:db8::1")).toBe(true);
    expect(isValidIp("fe80::1ff:fe23:4567:890a")).toBe(true);
    expect(isValidIp("2001:0db8:0000:0000:0000:8a2e:0370:7334")).toBe(true);
  });
});

describe("net-utils.normalizeIp", () => {
  it("collapses the IPv4-mapped form so one client is ONE bucket", () => {
    // req.ip may report ::ffff:203.0.113.9 while an XFF hop reports 203.0.113.9 — the
    // same client must not get two rate-limit buckets or two audit-log origins.
    expect(normalizeIp("::ffff:203.0.113.9")).toBe("203.0.113.9");
    expect(clientIp("", "::ffff:203.0.113.9", 2)).toBe("203.0.113.9");
    expect(clientIp("1.2.3.4, ::ffff:203.0.113.9, 10.0.0.1", "x", 2)).toBe("203.0.113.9");
  });

  it("leaves a plain IPv4 and a real IPv6 untouched", () => {
    expect(normalizeIp("203.0.113.9")).toBe("203.0.113.9");
    expect(normalizeIp("2001:db8::1")).toBe("2001:db8::1");
  });
});

describe("net-utils.clientIp (spoof-resistant rate-limit key)", () => {
  it("IGNORES a spoofed left-most XFF token and picks the trusted right-anchored hop", () => {
    // Attacker sends a fake left entry; platform appended `realClient, gclb`. hops=2 → realClient.
    const xff = "1.2.3.4, 203.0.113.9, 10.0.0.1";
    expect(clientIp(xff, "10.0.0.1", 2)).toBe("203.0.113.9");
  });

  it("rotating the spoofed left-most value does NOT change the derived key", () => {
    const a = clientIp("9.9.9.9, 203.0.113.9, 10.0.0.1", "10.0.0.1", 2);
    const b = clientIp("7.7.7.7, 203.0.113.9, 10.0.0.1", "10.0.0.1", 2);
    const c = clientIp("evil-value, 203.0.113.9, 10.0.0.1", "10.0.0.1", 2);
    expect(a).toBe("203.0.113.9");
    expect(b).toBe("203.0.113.9");
    expect(c).toBe("203.0.113.9"); // <-- the whole point: same real client → same bucket
  });

  it("hops=1 picks the right-most entry", () => {
    expect(clientIp("1.2.3.4, 203.0.113.9", "x", 1)).toBe("203.0.113.9");
  });

  it("falls back to req.ip when there's no XFF (local/emulator)", () => {
    expect(clientIp("", "127.0.0.1", 2)).toBe("127.0.0.1");
    expect(clientIp(undefined, "203.0.113.5", 2)).toBe("203.0.113.5");
  });

  it("falls back to the right-most VALID ip when the targeted hop isn't a real IP", () => {
    // hops=2 targets 'garbage'; invalid → fall back (reqIp invalid too) → right-most valid ip.
    expect(clientIp("garbage, 203.0.113.9", "not-ip", 2)).toBe("203.0.113.9");
  });

  it("returns 'unknown' when nothing resolves to a valid IP", () => {
    expect(clientIp("nope, junk", "also-not-ip", 2)).toBe("unknown");
    expect(clientIp("", "", 2)).toBe("unknown");
  });

  it("defaults to 2 hops when hops is missing/invalid", () => {
    expect(clientIp("1.1.1.1, 203.0.113.9, 10.0.0.1", "x")).toBe("203.0.113.9");
  });
});

// ADMIN-3 (2026-07-24): audit entries record a source IP. A FORGEABLE origin is worse
// than none — it would put an innocent address next to someone else's action — so it
// reuses the same right-anchored derivation as the rate-limit key.
describe("net-utils.auditIp (audit-log source IP)", () => {
  it("ignores a spoofed left-most XFF token, like the rate-limit key", () => {
    const req = { headers: { "x-forwarded-for": "1.2.3.4, 203.0.113.9, 10.0.0.1" }, ip: "10.0.0.1" };
    expect(auditIp(req, 2)).toBe("203.0.113.9");
  });

  it("falls back to req.ip with no XFF (emulator / direct call)", () => {
    expect(auditIp({ headers: {}, ip: "127.0.0.1" }, 2)).toBe("127.0.0.1");
  });

  it("returns '' — not 'unknown' — when there is no request at all", () => {
    // A callable invoked outside an HTTP context must write NO ip rather than a
    // placeholder string that later reads like a real value.
    expect(auditIp(undefined, 2)).toBe("");
    expect(auditIp(null, 2)).toBe("");
  });

  it("returns '' when nothing in the request resolves to a valid IP", () => {
    expect(auditIp({ headers: { "x-forwarded-for": "junk, nope" }, ip: "not-an-ip" }, 2)).toBe("");
  });

  it("tolerates a request with no headers object", () => {
    expect(auditIp({ ip: "203.0.113.5" }, 2)).toBe("203.0.113.5");
  });

  it("falls back to the socket address when Express's .ip is absent", () => {
    // A bare Node request has no `.ip` (that property is added by Express).
    expect(auditIp({ headers: {}, socket: { remoteAddress: "::ffff:203.0.113.7" } }, 2)).toBe("203.0.113.7");
    expect(auditIp({ headers: {}, connection: { remoteAddress: "203.0.113.8" } }, 2)).toBe("203.0.113.8");
  });

  it("records NOTHING for the functions emulator's synthetic request (headers only)", () => {
    // Verified live 2026-07-24: the emulator passes headers with no ip/socket/XFF at all,
    // so audit entries written locally carry an empty ip. That is correct — there is no
    // origin to record — and must not become a placeholder that reads like a real value.
    const emulatorRequest = { headers: { host: "127.0.0.1:5001", "content-type": "application/json" } };
    expect(auditIp(emulatorRequest, 2)).toBe("");
  });
});
