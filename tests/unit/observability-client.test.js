import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { scrub, captureClientError } from "../../src/observability-client.js";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Client-side Sentry wiring (browser). What can be proven without a live SDK or a
 * real DSN is the part that matters: error events carry no personal data, capture
 * is a safe no-op before init, and the SDK is loaded LAZILY (its own chunk) so it
 * never blocks first paint.
 */
describe("scrub — nothing personal leaves the browser on an error event", () => {
  it("drops the user and everything about the request", () => {
    const event = {
      message: "boom",
      user: { id: "uid-123", email: "someone@example.com", ip_address: "1.2.3.4" },
      request: {
        url: "https://app/api/prices?ids=bitcoin&uid=uid-123",
        headers: { authorization: "Bearer secret-token", cookie: "session=abc" },
        data: { thesis: "private note" },
      },
    };
    const out = scrub(event);
    expect(out.user).toBeUndefined();
    expect(out.request).toEqual({});
    expect(out.message).toBe("boom");
    const json = JSON.stringify(out);
    for (const secret of ["uid-123", "someone@example.com", "secret-token", "private note", "1.2.3.4"]) {
      expect(json, secret).not.toContain(secret);
    }
  });

  it("handles an event with no request/user, and null", () => {
    expect(scrub({ message: "boom" })).toEqual({ message: "boom" });
    expect(scrub(null)).toBe(null);
  });
});

describe("captureClientError — a safe no-op before the SDK is initialized", () => {
  it("returns false and never throws when Sentry has not loaded", () => {
    // The reporter must never turn a handled error into an app outage.
    expect(captureClientError(new Error("render boom"), "react:render")).toBe(false);
    expect(captureClientError(new Error("x"))).toBe(false);
  });
});

describe("the SDK is loaded lazily so it never blocks first paint", () => {
  it("imports @sentry/browser only inside initClientSentry, not at module load", () => {
    const src = readFileSync(resolve(here, "../../src/observability-client.js"), "utf8");
    const top = src.slice(0, src.indexOf("async function initClientSentry("));
    expect(top, "@sentry/browser must be imported lazily inside initClientSentry")
      .not.toContain('import("@sentry/browser")');
    const body = src.slice(src.indexOf("async function initClientSentry("));
    expect(body).toContain('import("@sentry/browser")');
  });

  it("keeps Session Replay privacy-safe: no PII, EU region, and masking left on", () => {
    const src = readFileSync(resolve(here, "../../src/observability-client.js"), "utf8");
    expect(src).toContain("sendDefaultPii: false");
    expect(src).toContain("ingest.de.sentry.io"); // EU/DE data residency
    // We must NOT disable Replay's default text-masking / media-blocking.
    expect(src).not.toContain("maskAllText: false");
    expect(src).not.toContain("blockAllMedia: false");
  });
});
