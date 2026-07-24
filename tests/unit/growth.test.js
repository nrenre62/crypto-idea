import { describe, it, expect } from "vitest";
import {
  seriesOf, entryDaysAgo, latest, deltaOver, netChurn,
  pendingCancels, historyDays, sparkPath,
} from "../../src/utils/growth.js";

// ADMIN-4 (2026-07-24): derived growth maths for the admin Overview.
// THE RULE these tests exist to enforce: when the history is too short to answer
// a question, every helper returns null so the card says "collecting" — it must
// never render a confident 0% that reads as "no churn".

// Build an oldest-first series of consecutive UTC days ending on 2026-07-24.
const day = (n) => new Date(Date.UTC(2026, 6, 24) - n * 86400000).toISOString().slice(0, 10);
const mk = (rows) => rows.map((r, i) => ({ date: day(rows.length - 1 - i), ...r }));

describe("growth.entryDaysAgo", () => {
  const series = mk([{ paidUsers: 1 }, { paidUsers: 2 }, { paidUsers: 3 }]); // 3 days

  it("returns the entry from exactly N days back", () => {
    expect(entryDaysAgo(series, 2).paidUsers).toBe(1);
    expect(entryDaysAgo(series, 1).paidUsers).toBe(2);
  });

  it("returns null when the history does not reach back that far", () => {
    // 3 days of data cannot answer a 7-day question — the caller shows "collecting".
    expect(entryDaysAgo(series, 7)).toBe(null);
    expect(entryDaysAgo(series, 30)).toBe(null);
  });

  it("returns null for an empty or single-entry series", () => {
    expect(entryDaysAgo([], 7)).toBe(null);
    expect(entryDaysAgo(mk([{ paidUsers: 1 }]), 7)).toBe(null);
    expect(entryDaysAgo(null, 7)).toBe(null);
  });

  it("survives a GAP from a missed scheduled run by matching on date, not index", () => {
    // Only two entries, 7 days apart. Index-counting would walk back one slot and
    // call it "1 day ago"; matching on date correctly answers the 7-day question.
    const gappy = [{ date: day(10), paidUsers: 5 }, { date: day(3), paidUsers: 8 }];
    const hit = entryDaysAgo(gappy, 7);
    expect(hit.date).toBe(day(10));
    expect(hit.paidUsers).toBe(5);
    expect(entryDaysAgo(gappy, 1).date).toBe(day(10));   // not "the previous row"
  });

  it("refuses a baseline that is not QUITE old enough", () => {
    // day(9) is only 6 days before day(3) — it cannot answer a 7-day question,
    // so the card says "collecting" rather than mislabelling a 6-day change.
    const gappy = [{ date: day(9), paidUsers: 5 }, { date: day(3), paidUsers: 8 }];
    expect(entryDaysAgo(gappy, 7)).toBe(null);
    expect(entryDaysAgo(gappy, 6).date).toBe(day(9));
  });

  it("does not invent a baseline when only NEWER entries exist", () => {
    const recent = [{ date: day(2), paidUsers: 5 }, { date: day(1), paidUsers: 8 }];
    expect(entryDaysAgo(recent, 30)).toBe(null);
  });
});

describe("growth.deltaOver", () => {
  const series = mk([{ netRevenue: 100 }, { netRevenue: 110 }, { netRevenue: 150 }]);

  it("reports the change and the percentage", () => {
    const d = deltaOver(series, "netRevenue", 2);
    expect(d.from).toBe(100);
    expect(d.to).toBe(150);
    expect(d.diff).toBe(50);
    expect(d.pct).toBe(50);
  });

  it("surfaces the REAL baseline date so 'vs 30 days' can't quietly mean 34", () => {
    const d = deltaOver(series, "netRevenue", 2);
    expect(d.fromDate).toBe(day(2));
    expect(d.toDate).toBe(day(0));
  });

  it("reports a fall as a negative diff", () => {
    const falling = mk([{ paidUsers: 10 }, { paidUsers: 7 }]);
    const d = deltaOver(falling, "paidUsers", 1);
    expect(d.diff).toBe(-3);
    expect(d.pct).toBe(-30);
  });

  it("returns pct null (not +500%) when growing from a zero baseline", () => {
    const fromZero = mk([{ paidUsers: 0 }, { paidUsers: 5 }]);
    const d = deltaOver(fromZero, "paidUsers", 1);
    expect(d.diff).toBe(5);
    expect(d.pct).toBe(null);
  });

  it("returns null when the window is longer than the history", () => {
    expect(deltaOver(series, "netRevenue", 30)).toBe(null);
  });
});

describe("growth.netChurn", () => {
  it("reports the NET fall in paying subscribers as a percentage", () => {
    const s = mk([{ paidUsers: 10 }, { paidUsers: 9 }, { paidUsers: 8 }]);
    const c = netChurn(s, 2);
    expect(c.start).toBe(10);
    expect(c.end).toBe(8);
    expect(c.lost).toBe(2);
    expect(c.pct).toBe(20);
  });

  it("is NET: a month that lost 3 and won 3 reads as 0% — by design, not a bug", () => {
    // Gross churn is unrecoverable from counts alone; the label says "net" and this
    // test is the reminder of exactly what the number can and cannot claim.
    const s = mk([{ paidUsers: 10 }, { paidUsers: 10 }]);
    expect(netChurn(s, 1).pct).toBe(0);
  });

  it("never reports negative churn when the paid count GREW", () => {
    const s = mk([{ paidUsers: 5 }, { paidUsers: 9 }]);
    const c = netChurn(s, 1);
    expect(c.lost).toBe(0);
    expect(c.pct).toBe(0);
  });

  it("returns pct null when there were no subscribers to lose", () => {
    const s = mk([{ paidUsers: 0 }, { paidUsers: 0 }]);
    expect(netChurn(s, 1).pct).toBe(null);
  });

  it("returns null — never 0% — when the history is too short", () => {
    // This is the whole point: "0% churn" and "we don't know yet" must not look alike.
    expect(netChurn(mk([{ paidUsers: 10 }]), 30)).toBe(null);
    expect(netChurn([], 30)).toBe(null);
  });
});

describe("growth.pendingCancels", () => {
  it("adds cancelled + past-due from the NEWEST snapshot only", () => {
    const s = mk([{ canceledSubs: 9, pastDueSubs: 9 }, { canceledSubs: 2, pastDueSubs: 1 }]);
    expect(pendingCancels(s)).toBe(3);
  });

  it("is 0 for an empty series", () => {
    expect(pendingCancels([])).toBe(0);
    expect(pendingCancels(null)).toBe(0);
  });
});

describe("growth.historyDays", () => {
  it("counts the span in days, inclusive", () => {
    expect(historyDays(mk([{}, {}, {}]))).toBe(3);
    expect(historyDays(mk([{}]))).toBe(1);
    expect(historyDays([])).toBe(0);
  });

  it("counts the SPAN, not the entry count, when a run was missed", () => {
    expect(historyDays([{ date: day(6) }, { date: day(0) }])).toBe(7);
  });
});

describe("growth.seriesOf", () => {
  it("extracts one key oldest-first, coercing missing values to 0", () => {
    const s = mk([{ paidUsers: 1 }, {}, { paidUsers: 3 }]);
    expect(seriesOf(s, "paidUsers")).toEqual([1, 0, 3]);
  });
});

describe("growth.latest", () => {
  it("returns the newest entry, or null when empty", () => {
    expect(latest(mk([{ paidUsers: 1 }, { paidUsers: 2 }])).paidUsers).toBe(2);
    expect(latest([])).toBe(null);
  });
});

describe("growth.sparkPath", () => {
  it("returns null for an empty series so the caller can say 'collecting'", () => {
    expect(sparkPath([])).toBe(null);
    expect(sparkPath(null)).toBe(null);
  });

  it("draws a line for a single reading instead of nothing", () => {
    const d = sparkPath([5], 100, 20);
    expect(d).toMatch(/^M0\.0,/);
    expect(d).toContain("L100.0,");
  });

  it("scales to its own min/max so a small move is still readable", () => {
    const d = sparkPath([0, 10], 100, 20, 2);
    // min pins to the bottom (h - pad), max to the top (pad).
    expect(d).toBe("M0.0,18.0 L100.0,2.0");
  });

  it("draws a flat series as a centred line, not a divide-by-zero", () => {
    const d = sparkPath([7, 7, 7], 100, 20);
    expect(d).toBe("M0.0,10.0 L50.0,10.0 L100.0,10.0");
    expect(d).not.toContain("NaN");
  });

  it("never emits NaN for junk values", () => {
    expect(sparkPath([1, null, undefined, NaN, 4])).not.toContain("NaN");
  });
});
