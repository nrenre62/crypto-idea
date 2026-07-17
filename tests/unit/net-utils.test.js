import { describe, it, expect } from "vitest";
import { clientIp, isValidIp } from "../../functions/net-utils.js";

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
