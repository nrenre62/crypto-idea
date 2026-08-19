import { describe, it, expect } from "vitest";
import { paidPlansOn } from "../../functions/flags.js";

/**
 * CRYP-101 — LAUNCH-FREE Part B. CRYP-113 — payments OFF by default.
 *
 * `paidPlansEnabled` is a TOP-LEVEL config/app flag (a peer of maintenance /
 * signupsEnabled, NOT a flags.features switch). It gates NEW paid subscriptions and
 * drives the launch-free UI. `paidPlansOn(cfg)` is the single pure predicate both the
 * server (createSubscription gate, /api/config) and the client read.
 *
 * CRYP-113 INVERTS the default: payments ship OFF. Paid plans are AVAILABLE only when
 * the config says EXACTLY `true`. A missing key, a config that predates the flag, or an
 * unreadable config must all read as "off" — so a fresh / unconfigured deploy launches
 * free with no admin action, and a garbage/truthy value is never mistaken for a
 * deliberate "on". Paid mode only ever engages because a human set the flag to true.
 */
describe("paidPlansOn — default OFF (CRYP-113), only an explicit true enables paid plans", () => {
  it("CRYP-101: is OFF for an empty / absent / partial config (fail-closed to launch-free)", () => {
    expect(paidPlansOn({})).toBe(false);
    expect(paidPlansOn(undefined)).toBe(false);
    expect(paidPlansOn(null)).toBe(false);
    expect(paidPlansOn({ flags: {} })).toBe(false);
  });

  it("CRYP-101: reflects an explicit flag value", () => {
    expect(paidPlansOn({ flags: { paidPlansEnabled: true } })).toBe(true);
    expect(paidPlansOn({ flags: { paidPlansEnabled: false } })).toBe(false);
  });

  it("CRYP-101: is ON only for an exact boolean true, never for a junk/truthy value", () => {
    // A garbage / truthy-non-true value is not a deliberate flip — it must not silently
    // switch paid plans ON.
    for (const junk of [0, "", "true", 1, "false", null, undefined, NaN, {}, "yes"]) {
      expect(paidPlansOn({ flags: { paidPlansEnabled: junk } }), String(junk)).toBe(false);
    }
  });
});
