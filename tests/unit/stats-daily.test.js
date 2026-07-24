import { describe, it, expect } from "vitest";
import { snapshotId, buildSnapshot } from "../../functions/stats-daily.js";

// ADMIN-4 (2026-07-24): the daily growth snapshot. A snapshot is written once and
// kept forever, so a bad value is PERMANENT history — these tests pin the
// normalisation that stops one bad read poisoning the series.

describe("stats-daily.snapshotId", () => {
  it("is the UTC calendar day, so ids sort chronologically as strings", () => {
    expect(snapshotId(Date.UTC(2026, 6, 24, 13, 45))).toBe("2026-07-24");
    expect(snapshotId(Date.UTC(2026, 6, 24, 0, 0))).toBe("2026-07-24");
    expect(snapshotId(Date.UTC(2026, 6, 24, 23, 59, 59))).toBe("2026-07-24");
  });

  it("uses UTC, not local time — a late-evening capture must not skip a day", () => {
    // 23:30 UTC on the 24th is already the 25th in UTC+2 (the founder's zone).
    expect(snapshotId(Date.UTC(2026, 6, 24, 23, 30))).toBe("2026-07-24");
  });

  it("returns null for an unusable clock rather than an 'Invalid Date' id", () => {
    expect(snapshotId(NaN)).toBe(null);
    expect(snapshotId(undefined)).toBe(null);
  });

  it("sorts lexicographically in true chronological order", () => {
    const ids = [
      snapshotId(Date.UTC(2026, 11, 1)),
      snapshotId(Date.UTC(2026, 0, 9)),
      snapshotId(Date.UTC(2026, 0, 10)),
    ];
    expect([...ids].sort()).toEqual(["2026-01-09", "2026-01-10", "2026-12-01"]);
  });
});

describe("stats-daily.buildSnapshot", () => {
  const stats = {
    totalUsers: 10, freeUsers: 7, proUsers: 2, premiumUsers: 1,
    canceledSubs: 1, pastDueSubs: 0,
    grossRevenue: 29.97, paymentFees: 1.7, netRevenue: 28.27,
    totalPortfolios: 14, totalCoins: 63,
  };
  const at = Date.UTC(2026, 6, 24, 3, 0);

  it("stamps the UTC day and carries the counts through", () => {
    const s = buildSnapshot(stats, { atMs: at, signups24h: 3 });
    expect(s.date).toBe("2026-07-24");
    expect(s.at).toBe(at);
    expect(s.totalUsers).toBe(10);
    expect(s.signups24h).toBe(3);
    expect(s.totalCoins).toBe(63);
  });

  it("stores paidUsers EXPLICITLY as pro + premium (the churn denominator)", () => {
    // Derived at read time it would silently change meaning if the tier set ever
    // changes; a historical snapshot must keep meaning what it meant that day.
    expect(buildSnapshot(stats, { atMs: at }).paidUsers).toBe(3);
  });

  it("keeps the forward-looking cancel signals", () => {
    const s = buildSnapshot({ ...stats, canceledSubs: 2, pastDueSubs: 1 }, { atMs: at });
    expect(s.canceledSubs).toBe(2);
    expect(s.pastDueSubs).toBe(1);
  });

  it("rounds money to whole cents so stored history carries no float noise", () => {
    const s = buildSnapshot({ ...stats, grossRevenue: 0.1 + 0.2, netRevenue: 29.999 }, { atMs: at });
    expect(s.grossRevenue).toBe(0.3);
    expect(s.netRevenue).toBe(30);
  });

  it("normalises junk counts to 0 rather than writing NaN into permanent history", () => {
    const s = buildSnapshot(
      { totalUsers: NaN, freeUsers: null, proUsers: "2", premiumUsers: -5, totalCoins: undefined },
      { atMs: at, signups24h: -1 },
    );
    expect(s.totalUsers).toBe(0);
    expect(s.freeUsers).toBe(0);
    expect(s.proUsers).toBe(2);      // a numeric string still counts
    expect(s.premiumUsers).toBe(0);  // negative clamps, never a negative user count
    expect(s.totalCoins).toBe(0);
    expect(s.signups24h).toBe(0);
  });

  it("returns null when the clock is unusable — better no snapshot than a wrong-day one", () => {
    expect(buildSnapshot(stats, { atMs: NaN })).toBe(null);
    expect(buildSnapshot(stats, {})).toBe(null);
  });

  it("survives a completely missing stats object", () => {
    const s = buildSnapshot(null, { atMs: at });
    expect(s.date).toBe("2026-07-24");
    expect(s.totalUsers).toBe(0);
    expect(s.paidUsers).toBe(0);
    expect(s.netRevenue).toBe(0);
  });
});
