import { describe, it, expect } from "vitest";
import { signupsEnabled, signupDecision, BLOCKED_MESSAGE } from "../../functions/signup-gate.js";

/**
 * ADMIN-0 — the Auth `beforeCreate` signups gate.
 *
 * Two failure modes, both bad, both tested:
 *   • it fails to block  → the "Allow new signups" toggle stays decorative and a
 *     scripted client registers anyway (the gap this whole item exists to close), and
 *   • it blocks on its own → a Firestore blip silently kills the signup funnel with
 *     no error anyone sees.
 * The second is why an unreadable config is ALLOW, decided by the founder 2026-07-24.
 */
describe("signupsEnabled — allowed unless config says exactly false", () => {
  it("allows when there is no config, no flags, or no key", () => {
    for (const cfg of [{}, { flags: {} }, { flags: { maintenance: true } }]) {
      expect(signupsEnabled(cfg), JSON.stringify(cfg)).toBe(true);
    }
  });

  it("blocks only for an exact `false`, never for a merely falsy value", () => {
    expect(signupsEnabled({ flags: { signupsEnabled: false } })).toBe(false);
    // Anything else is garbage or an unset value, not a deliberate pause. A coerced
    // check (`!flags.signupsEnabled`) would treat 0/""/null as "paused" and take
    // signups down for a config typo.
    for (const junk of [0, "", null, undefined, "false", NaN]) {
      expect(signupsEnabled({ flags: { signupsEnabled: junk } }), String(junk)).toBe(true);
    }
  });
});

describe("signupDecision — the verdict the blocking function acts on", () => {
  it("allows a healthy config and says why", () => {
    expect(signupDecision({ flags: { signupsEnabled: true } })).toEqual({ allow: true, reason: "enabled" });
    expect(signupDecision({})).toEqual({ allow: true, reason: "enabled" });
  });

  it("blocks a deliberate pause", () => {
    expect(signupDecision({ flags: { signupsEnabled: false } })).toEqual({ allow: false, reason: "signups-paused" });
  });

  it("ALLOWS when the config could not be read — an outage must not stop signups", () => {
    // THE rule of this module. If this ever flips to `allow: false`, a Firestore
    // hiccup becomes a total registration outage with no error and no alert.
    expect(signupDecision(null)).toEqual({ allow: true, reason: "config-unavailable" });
    expect(signupDecision(undefined)).toEqual({ allow: true, reason: "config-unavailable" });
  });

  it("distinguishes an EMPTY config from an UNREADABLE one", () => {
    // Same verdict, different reason — the reason is what gets logged, so a degraded
    // read stays visible instead of blending into normal traffic.
    expect(signupDecision({}).reason).toBe("enabled");
    expect(signupDecision(null).reason).toBe("config-unavailable");
  });

  it("never returns a decision without an explicit boolean allow", () => {
    for (const cfg of [null, {}, { flags: { signupsEnabled: false } }]) {
      expect(typeof signupDecision(cfg).allow).toBe("boolean");
    }
  });
});

describe("BLOCKED_MESSAGE", () => {
  it("matches what the client says when IT knows signups are paused", () => {
    // A user who slipped through the ~60s /api/config cache must not get a different,
    // scarier story than one whose client already knew. Keep these two in step:
    // src/CryptoIdea.jsx "New signups are currently paused. Please check back soon."
    expect(BLOCKED_MESSAGE).toBe("New signups are currently paused. Please check back soon.");
  });
});
