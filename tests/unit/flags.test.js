import { describe, it, expect } from "vitest";
import { paidPlansOn } from "../../functions/flags.js";

/**
 * CRYP-101 — LAUNCH-FREE Part B.
 *
 * `paidPlansEnabled` is a TOP-LEVEL config/app flag (a peer of maintenance /
 * signupsEnabled, NOT a flags.features switch). It gates NEW paid subscriptions and
 * drives the launch-free UI. `paidPlansOn(cfg)` is the single pure predicate both the
 * server (createSubscription gate, /api/config) and the client read.
 *
 * Same default-ON contract signupsEnabled uses: paid plans are AVAILABLE unless the
 * config says EXACTLY false. A missing key, a config that predates the flag, or an
 * unreadable config must all read as "on" — launch-free mode only ever engages
 * because a human deliberately flipped it, never because a read blipped.
 */
describe("paidPlansOn — default ON, only an explicit false engages launch-free mode", () => {
  it("CRYP-101: is ON for an empty / absent / partial config (fail-open to normal)", () => {
    expect(paidPlansOn({})).toBe(true);
    expect(paidPlansOn(undefined)).toBe(true);
    expect(paidPlansOn(null)).toBe(true);
    expect(paidPlansOn({ flags: {} })).toBe(true);
  });

  it("CRYP-101: reflects an explicit flag value", () => {
    expect(paidPlansOn({ flags: { paidPlansEnabled: true } })).toBe(true);
    expect(paidPlansOn({ flags: { paidPlansEnabled: false } })).toBe(false);
  });

  it("CRYP-101: is OFF only for an exact boolean false, never for a junk/truthy value", () => {
    // A garbage value is not a deliberate flip — it must not silently kill paid plans.
    for (const junk of [0, "", "false", null, undefined, NaN]) {
      expect(paidPlansOn({ flags: { paidPlansEnabled: junk } }), String(junk)).toBe(true);
    }
  });
});
