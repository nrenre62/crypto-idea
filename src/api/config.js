// Data fetching for the app's PUBLIC runtime config (non-secret flags + plans),
// served by the /api/config endpoint (CDN-cached ~60s). Admin sets these via the
// dashboard. UI logic lives elsewhere; this module ONLY fetches.

// -> the raw public config object ({maintenance, signupsEnabled, plans, ...}) or null.
export async function fetchSiteConfig() {
  try {
    const r = await fetch("/api/config");
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
