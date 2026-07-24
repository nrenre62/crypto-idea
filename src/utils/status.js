// ADMIN-2 — pure derivations for the Overview status strip.
//
// Kept out of the component (like utils/growth.js) so the judgements that actually
// matter — "is this cron dead?", "how stale is this cache?" — are unit-testable
// without rendering anything.
//
// Guiding rule, same as the growth card: NEVER invent reassurance. A job we have no
// record of reads "never", not "ok"; a timestamp we can't parse reads "unknown", not
// "just now". Green must mean we checked and it was fine.

const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

// How far past its schedule a job may drift before it counts as late. Cloud Scheduler
// jitter plus a cold start can easily push a 5-minute job past 6 minutes, so a 1×
// threshold would cry wolf every day and train the operator to ignore the strip.
const LATE_FACTOR = 2;

const finite = (v) => (typeof v === "number" && isFinite(v) ? v : null);

// "3m ago" / "2h ago" / "5d ago" — or null when there is genuinely nothing to show,
// which the caller renders as "never" rather than as a blank that looks like zero.
export function agoLabel(at, now) {
  const t = finite(at); const n = finite(now);
  if (t == null || n == null || t <= 0) return null;
  const d = n - t;
  if (d < 0) return "just now";       // small clock skew between server and browser
  if (d < MIN) return "just now";
  if (d < HOUR) return Math.floor(d / MIN) + "m ago";
  if (d < DAY) return Math.floor(d / HOUR) + "h ago";
  return Math.floor(d / DAY) + "d ago";
}

/**
 * The health of one scheduled job.
 *   "never"   — no completed run on record. NOT the same as healthy, and the single
 *               most important state to show: a schedule that was never wired up
 *               throws no errors and produces no alerts, it just silently does nothing.
 *   "failing" — the most recent outcome was an error (errorAt newer than at).
 *   "late"    — it last completed more than LATE_FACTOR × its interval ago, i.e. the
 *               schedule has stopped firing. Also silent; also invisible without this.
 *   "ok"      — completed within its expected window.
 */
export function jobHealth(job, now) {
  const j = job || {};
  const at = finite(j.at);
  const errorAt = finite(j.errorAt);
  if (errorAt != null && (at == null || errorAt > at)) return "failing";
  if (at == null) return "never";
  const every = finite(j.everyMs);
  const n = finite(now);
  if (every == null || every <= 0 || n == null) return "ok";
  return n - at > every * LATE_FACTOR ? "late" : "ok";
}

// The single worst state across all jobs, for the strip's summary dot. Ordered by how
// much it should worry you — a failing job outranks a merely late one.
const RANK = { failing: 3, never: 2, late: 1, ok: 0 };
export function worstHealth(jobs, now) {
  let worst = "ok";
  for (const j of jobs || []) {
    const h = jobHealth(j, now);
    if (RANK[h] > RANK[worst]) worst = h;
  }
  return worst;
}

// A cache's age, or null when it has never been written. Used for the market-data
// freshness line — which is the number that tells you whether "prices paused" is
// costing your users anything real yet.
export function cacheAge(at, now) {
  const t = finite(at); const n = finite(now);
  if (t == null || n == null || t <= 0) return null;
  return Math.max(0, n - t);
}

// Human summary of the switch states: "All features on" or "marketData, checkout OFF".
// Naming the off ones explicitly beats a count — during an incident you want to read
// WHICH switch is down without opening Settings.
export function featureSummary(features) {
  const f = features || {};
  const off = Object.keys(f).filter((k) => f[k] === false);
  return { off, label: off.length === 0 ? "All features on" : off.join(", ") + " OFF" };
}
