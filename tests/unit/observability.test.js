import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { isLikelyDsn, dsnOf, scrubEvent, initSentry, captureError, _reset } from "../../functions/observability.js";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * ADMIN-2 — Sentry wiring (functions only).
 *
 * There is no Sentry account and no deployed project yet, so what CAN be proven
 * locally is the part that matters most anyway: with no DSN configured this is a
 * total no-op, and when it does report it carries no personal data. Actual
 * delivery to Sentry can only be confirmed after a DSN exists — see the log.
 */
beforeEach(() => _reset());

describe("isLikelyDsn — 'configured but broken' must not look like 'not configured'", () => {
  it("accepts a real DSN shape", () => {
    expect(isLikelyDsn("https://abc123@o42.ingest.sentry.io/1234567")).toBe(true);
  });

  it("rejects the ways a paste actually goes wrong", () => {
    for (const bad of [
      "",                                       // empty
      "   ",                                    // whitespace only
      "not a url",
      "https://o42.ingest.sentry.io/1234567",   // public key missing
      "https://abc123@o42.ingest.sentry.io",    // project id missing
      "https://abc123@o42.ingest.sentry.io/",   // project id missing
      "https://abc123@o42.ingest.sentry.io/abc", // project id not numeric
      "ftp://abc123@o42.ingest.sentry.io/1",    // wrong scheme
      null, undefined, 123, {},
    ]) {
      expect(isLikelyDsn(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it("tolerates surrounding whitespace from a copy-paste", () => {
    expect(isLikelyDsn("  https://abc123@o42.ingest.sentry.io/1234567\n")).toBe(true);
  });
});

describe("dsnOf — reads config, and refuses a malformed one", () => {
  it("returns '' for every not-configured shape", () => {
    for (const cfg of [null, undefined, {}, { sentry: {} }, { sentry: { dsn: "" } }]) {
      expect(dsnOf(cfg), JSON.stringify(cfg)).toBe("");
    }
  });

  it("returns '' for a malformed DSN rather than handing it to the SDK", () => {
    expect(dsnOf({ sentry: { dsn: "https://oops.sentry.io" } })).toBe("");
  });

  it("returns the trimmed DSN when it is well-formed", () => {
    expect(dsnOf({ sentry: { dsn: " https://k@o1.ingest.sentry.io/9 " } }))
      .toBe("https://k@o1.ingest.sentry.io/9");
  });
});

describe("scrubEvent — nothing personal leaves the server", () => {
  it("drops the user, the breadcrumbs, and everything about the request but its method", () => {
    const event = {
      message: "boom",
      user: { id: "uid-123", email: "someone@example.com", ip_address: "1.2.3.4" },
      breadcrumbs: [{ message: "user typed thesis…" }],
      request: {
        method: "POST",
        url: "https://app/api/prices?ids=bitcoin&uid=uid-123",
        headers: { authorization: "Bearer secret-token", cookie: "session=abc" },
        cookies: { session: "abc" },
        data: { thesis: "private note" },
      },
    };
    const out = scrubEvent(event);
    expect(out.user).toBeUndefined();
    expect(out.breadcrumbs).toBeUndefined();
    expect(out.request).toEqual({ method: "POST" });
    // The error itself is exactly what we DO want to keep.
    expect(out.message).toBe("boom");
    // Belt and braces: nothing personal survives anywhere in the serialized event.
    const json = JSON.stringify(out);
    for (const secret of ["uid-123", "someone@example.com", "secret-token", "private note", "1.2.3.4"]) {
      expect(json, secret).not.toContain(secret);
    }
  });

  it("handles an event with no request/user at all", () => {
    expect(scrubEvent({ message: "boom" })).toEqual({ message: "boom" });
    expect(scrubEvent(null)).toBe(null);
  });
});

describe("no DSN configured = a complete no-op", () => {
  it("initSentry returns false and does not throw", () => {
    for (const cfg of [null, {}, { sentry: { dsn: "" } }, { sentry: { dsn: "garbage" } }]) {
      expect(initSentry(cfg), JSON.stringify(cfg)).toBe(false);
    }
  });

  it("captureError returns false and swallows nothing of the caller's flow", () => {
    // The reporter must never be able to turn a handled error into an outage.
    expect(captureError({}, "api:prices", new Error("upstream 500"))).toBe(false);
    expect(captureError(null, "scheduler:refreshPrices", new Error("boom"))).toBe(false);
  });

  it("never loads the Sentry SDK when there is nothing to report to", () => {
    // The lazy require is what keeps cold start free for a project with no DSN: if
    // @sentry/node were required at module top level, EVERY function invocation
    // would pay to load 34 packages it will never use. Asserted against the source
    // because "was it loaded" is not observable from inside the module under test.
    const src = readFileSync(resolve(here, "../../functions/observability.js"), "utf8");
    const top = src.slice(0, src.indexOf("function initSentry("));
    expect(top, "@sentry/node must be required lazily inside initSentry, not at module load")
      .not.toContain('require("@sentry/node")');
    const body = src.slice(src.indexOf("function initSentry("));
    expect(body).toContain('require("@sentry/node")');
    // …and only AFTER the DSN check, so a project with no DSN never reaches it.
    expect(body.indexOf("if (!dsn) return false;")).toBeLessThan(body.indexOf('require("@sentry/node")'));
  });
});
