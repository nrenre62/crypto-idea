// ADMIN-4 · Growth metrics — pure presentation maths for the Overview card.
//
// The server stores RAW daily snapshots (see functions/stats-daily.js); every
// derived figure — deltas, churn, sparkline geometry — is computed here so the
// stored history stays a plain record of what was true, not of what we happened
// to want to show. Pure + unit-tested; no React, no Firebase.
//
// The series is always OLDEST-FIRST, one entry per UTC day, as listDailyStats
// returns it.

const DAY_MS = 86400000;

const num = (v) => (typeof v === "number" && isFinite(v) ? v : 0);

const dateMs = (d) => {
  const ms = Date.parse(String(d || "") + "T00:00:00Z");
  return isNaN(ms) ? null : ms;
};

/** Values for one key, oldest-first — the input to a sparkline. */
export function seriesOf(series, key) {
  return (series || []).map((e) => num(e && e[key]));
}

/**
 * The newest entry that is at LEAST `days` old, or null when the history
 * doesn't reach back that far.
 *
 * Returning null (rather than falling back to the oldest entry) is the whole
 * point: a "30-day change" computed from three days of data is a lie, and the
 * card must say "collecting" instead of showing a confident wrong number —
 * the same rule as BL-1e, where a failed getStats renders as an error and never
 * as a plausible all-zero dashboard.
 *
 * Matching by DATE rather than by array index also survives a missed scheduled
 * run: with a gap, this picks the newest entry that is genuinely old enough, and
 * callers surface its real date so "vs 30 days ago" can't quietly mean 34.
 */
export function entryDaysAgo(series, days) {
  const list = series || [];
  if (list.length < 2) return null;
  const last = list[list.length - 1];
  const lastMs = dateMs(last && last.date);
  if (lastMs == null) return null;
  const target = lastMs - Math.max(0, num(days)) * DAY_MS;
  let found = null;
  for (const e of list) {
    const ms = dateMs(e && e.date);
    if (ms == null) continue;
    if (ms <= target) found = e; else break;   // oldest-first, so we can stop
  }
  return found;
}

/** Latest entry, or null for an empty series. */
export const latest = (series) => (series && series.length ? series[series.length - 1] : null);

/**
 * Change in one key over `days`. `pct` is null when the baseline is 0 — a jump
 * from 0 to 5 is not "+500%", it's "new", and the UI renders it as such.
 */
export function deltaOver(series, key, days) {
  const from = entryDaysAgo(series, days);
  const to = latest(series);
  if (!from || !to) return null;
  const a = num(from[key]);
  const b = num(to[key]);
  return {
    from: a, to: b, diff: b - a,
    pct: a > 0 ? ((b - a) / a) * 100 : null,
    fromDate: from.date, toDate: to.date,
  };
}

/**
 * NET paid churn over `days` — deliberately named "net", because that is what
 * a count-based measure can honestly claim (founder decision, 2026-07-24).
 *
 * `lost` is the NET fall in paying subscribers, so a month that lost 3 and won 3
 * reads as 0% churn. Gross churn (how many individuals actually left, regardless
 * of new arrivals) cannot be recovered from counts alone — it needs per-event
 * tracking, which was explicitly not chosen. `pendingCancels` is the forward-
 * looking half: subscriptions already cancelled or failing that have not yet
 * dropped a tier.
 */
export function netChurn(series, days) {
  const from = entryDaysAgo(series, days);
  const to = latest(series);
  if (!from || !to) return null;
  const start = num(from.paidUsers);
  const end = num(to.paidUsers);
  const lost = Math.max(0, start - end);
  return {
    start, end, lost,
    pct: start > 0 ? (lost / start) * 100 : null,
    fromDate: from.date, toDate: to.date,
  };
}

/** Cancelled + past-due subscriptions in the newest snapshot (0 when empty). */
export function pendingCancels(series) {
  const l = latest(series);
  return l ? num(l.canceledSubs) + num(l.pastDueSubs) : 0;
}

/**
 * How many whole days the series spans — what the card shows while it is still
 * too short to answer a 7- or 30-day question.
 */
export function historyDays(series) {
  const list = series || [];
  if (list.length < 2) return list.length ? 1 : 0;
  const a = dateMs(list[0].date);
  const b = dateMs(list[list.length - 1].date);
  if (a == null || b == null) return list.length;
  return Math.round((b - a) / DAY_MS) + 1;
}

/**
 * An SVG path for a sparkline, scaled to its own min/max so the SHAPE is
 * readable even when the absolute numbers barely move. Hand-rolled because a
 * charting dependency for three 120x28 lines fails the KISS rule.
 *
 * Returns null for an empty series (the caller renders "collecting" instead of
 * an empty box). A flat series draws a centred horizontal line rather than
 * dividing by a zero span.
 */
export function sparkPath(values, w = 120, h = 28, pad = 3) {
  const v = (values || []).map(num);
  if (v.length === 0) return null;
  if (v.length === 1) v.push(v[0]);           // one reading still draws a line
  let min = v[0], max = v[0];
  for (const n of v) { if (n < min) min = n; if (n > max) max = n; }
  const span = max - min;
  const innerH = Math.max(1, h - pad * 2);
  const step = w / (v.length - 1);
  let d = "";
  for (let i = 0; i < v.length; i++) {
    const y = span === 0 ? h / 2 : pad + innerH - ((v[i] - min) / span) * innerH;
    d += (i === 0 ? "M" : " L") + (i * step).toFixed(1) + "," + y.toFixed(1);
  }
  return d;
}
