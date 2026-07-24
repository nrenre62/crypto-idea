import { describe, it, expect } from "vitest";
import { agoLabel, jobHealth, worstHealth, cacheAge, featureSummary } from "../../src/utils/status.js";

// ADMIN-2 (2026-07-24): the Overview status strip. The strip exists to make SILENT
// failure visible — a cron that stopped firing throws nothing and alerts nobody — so
// these tests are mostly about refusing to render reassurance we haven't earned.

const NOW = Date.UTC(2026, 6, 24, 12, 0, 0);
const ago = (ms) => NOW - ms;
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;

describe("agoLabel", () => {
  it("returns null when there is no timestamp — the caller renders 'never'", () => {
    // Crucially NOT "just now": a job with no record must not read as fresh.
    for (const bad of [null, undefined, 0, -1, NaN, "yesterday", {}]) {
      expect(agoLabel(bad, NOW), String(bad)).toBe(null);
    }
    expect(agoLabel(NOW, null)).toBe(null);
  });

  it("scales the unit to the age", () => {
    expect(agoLabel(ago(30 * 1000), NOW)).toBe("just now");
    expect(agoLabel(ago(3 * MIN), NOW)).toBe("3m ago");
    expect(agoLabel(ago(2 * HOUR), NOW)).toBe("2h ago");
    expect(agoLabel(ago(5 * DAY), NOW)).toBe("5d ago");
  });

  it("treats a slightly-future timestamp as 'just now', not a negative age", () => {
    // The server stamps `at` and the browser supplies `now`; a second of clock skew
    // must not render as "-1m ago".
    expect(agoLabel(NOW + 2000, NOW)).toBe("just now");
  });
});

describe("jobHealth — the four states a cron can be in", () => {
  it("'never' when nothing has ever completed — the silent-death case", () => {
    // A schedule that was never deployed produces no errors and no data. If this
    // rendered "ok", the strip would be actively lying about the most dangerous state.
    expect(jobHealth({ name: "x", everyMs: DAY, at: null }, NOW)).toBe("never");
    expect(jobHealth({}, NOW)).toBe("never");
    expect(jobHealth(null, NOW)).toBe("never");
  });

  it("'failing' when the latest outcome was an error", () => {
    expect(jobHealth({ everyMs: DAY, at: ago(2 * HOUR), errorAt: ago(1 * HOUR) }, NOW)).toBe("failing");
    // …and an error with no successful run at all is still failing, not "never".
    expect(jobHealth({ everyMs: DAY, at: null, errorAt: ago(HOUR) }, NOW)).toBe("failing");
  });

  it("an OLD error followed by a good run is back to ok", () => {
    expect(jobHealth({ everyMs: DAY, at: ago(HOUR), errorAt: ago(5 * HOUR) }, NOW)).toBe("ok");
  });

  it("'late' only past twice the interval, so normal jitter doesn't cry wolf", () => {
    const five = 5 * MIN;
    expect(jobHealth({ everyMs: five, at: ago(6 * MIN) }, NOW)).toBe("ok");    // jitter
    expect(jobHealth({ everyMs: five, at: ago(9 * MIN) }, NOW)).toBe("ok");    // still inside
    expect(jobHealth({ everyMs: five, at: ago(11 * MIN) }, NOW)).toBe("late"); // stopped firing
    expect(jobHealth({ everyMs: DAY, at: ago(30 * HOUR) }, NOW)).toBe("ok");
    expect(jobHealth({ everyMs: DAY, at: ago(3 * DAY) }, NOW)).toBe("late");
  });

  it("falls back to ok rather than a false alarm when the interval is unknown", () => {
    expect(jobHealth({ at: ago(10 * DAY) }, NOW)).toBe("ok");
    expect(jobHealth({ everyMs: 0, at: ago(10 * DAY) }, NOW)).toBe("ok");
  });
});

describe("worstHealth — the strip's summary dot", () => {
  it("is ok only when every job is ok", () => {
    expect(worstHealth([{ everyMs: DAY, at: ago(HOUR) }, { everyMs: DAY, at: ago(2 * HOUR) }], NOW)).toBe("ok");
  });

  it("surfaces the most serious problem, not the first one", () => {
    const jobs = [
      { everyMs: DAY, at: ago(HOUR) },        // ok
      { everyMs: DAY, at: ago(3 * DAY) },     // late
      { everyMs: DAY, at: null },             // never
      { everyMs: DAY, at: ago(HOUR), errorAt: ago(MIN) },  // failing
    ];
    expect(worstHealth(jobs, NOW)).toBe("failing");
    expect(worstHealth(jobs.slice(0, 3), NOW)).toBe("never");
    expect(worstHealth(jobs.slice(0, 2), NOW)).toBe("late");
  });

  it("an EMPTY job list is ok — there is nothing to be wrong", () => {
    // The registry is server-declared and non-empty, so [] means the strip has no
    // data at all; the caller distinguishes that via statusMsg, not via a fake alarm.
    expect(worstHealth([], NOW)).toBe("ok");
    expect(worstHealth(null, NOW)).toBe("ok");
  });
});

describe("cacheAge", () => {
  it("is null for a cache that was never written", () => {
    expect(cacheAge(null, NOW)).toBe(null);
    expect(cacheAge(0, NOW)).toBe(null);
  });
  it("is the elapsed milliseconds, never negative", () => {
    expect(cacheAge(ago(3 * MIN), NOW)).toBe(3 * MIN);
    expect(cacheAge(NOW + 5000, NOW)).toBe(0);
  });
});

describe("featureSummary", () => {
  it("says everything is on when nothing is off", () => {
    expect(featureSummary({ marketData: true, checkout: true, aiResearch: true }))
      .toEqual({ off: [], label: "All features on" });
  });

  it("NAMES the switched-off features rather than counting them", () => {
    // Mid-incident you need to know WHICH switch is down without opening Settings.
    expect(featureSummary({ marketData: false, checkout: true, aiResearch: false }))
      .toEqual({ off: ["marketData", "aiResearch"], label: "marketData, aiResearch OFF" });
  });

  it("treats a missing map as nothing-off (matches the default-ON server rule)", () => {
    expect(featureSummary(null).off).toEqual([]);
    expect(featureSummary({}).label).toBe("All features on");
  });
});
