// ADMIN-2 — server-side error reporting (Sentry), functions only.
//
// Why functions-only (founder, 2026-07-24): the failures that matter before there
// are users are server-side — a webhook that stops entitling paid accounts, a
// scheduler that quietly dies, an upstream that starts 500ing. Adding @sentry/react
// would tax every visitor's bundle (~30 KB gz) and need a CSP connect-src entry for
// a signal worth far less. Client errors stay a go-live decision.
//
// The DSN lives in config/app.sentry.dsn (admin Settings), NOT in the bundle and
// NOT in git — same treatment as every other key. With no DSN configured this
// module is a complete no-op AND never even require()s @sentry/node, so functions
// that aren't reporting pay zero cold-start cost for a dependency they don't use.
//
// PRIVACY: error reports go to a third party, so they carry the MINIMUM — no uid,
// no email, no request bodies, no headers, no cookies, no query strings. Only the
// error itself plus a coarse "where" tag. See scrubEvent below.

// ── Pure helpers (unit-tested; no network, no SDK) ───────────────────────────

// A Sentry DSN looks like https://<publicKey>@<host>/<projectId>. Validating the
// shape means a typo'd or half-pasted value fails LOUDLY at save/health time
// instead of silently reporting nothing — "configured but broken" and "not
// configured" must not look the same in the status strip.
function isLikelyDsn(dsn) {
  const s = String(dsn || "").trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (!u.username) return false;                       // the public key
    return /^\/+\d+$/.test(u.pathname);                  // /<projectId>
  } catch (e) {
    return false;
  }
}

function dsnOf(cfg) {
  const dsn = String(((cfg || {}).sentry || {}).dsn || "").trim();
  return isLikelyDsn(dsn) ? dsn : "";
}

// Strip anything that could carry personal data before an event leaves the server.
// Sentry's own scrubbing is server-side and opt-in; doing it here means the data
// never leaves the process in the first place.
function scrubEvent(event) {
  if (!event) return event;
  delete event.user;
  delete event.breadcrumbs;
  if (event.request) {
    // Keep nothing but the coarse shape — a URL can carry ids, a header can carry
    // a session token, a body can carry anything at all.
    event.request = { method: event.request.method };
  }
  return event;
}

// ── The reporter (impure) ───────────────────────────────────────────────────

let _sentry = null;      // the lazily-required SDK, once a DSN exists
let _initedDsn = null;   // which DSN the SDK was initialized with

// Initialize (or re-initialize after the DSN changes in Settings). Returns true if
// reporting is live. Never throws: an observability failure must not become an
// outage — if Sentry can't start, we log and carry on serving.
function initSentry(cfg) {
  const dsn = dsnOf(cfg);
  if (!dsn) return false;
  if (_sentry && _initedDsn === dsn) return true;
  try {
    // Required lazily and ONLY here — see the header note on cold start.
    const Sentry = require("@sentry/node");
    Sentry.init({
      dsn,
      // No auto-instrumentation: this is error reporting, not tracing. Keeps cold
      // start small and behaviour predictable inside gen-1 functions.
      defaultIntegrations: false,
      integrations: [],
      tracesSampleRate: 0,
      sendDefaultPii: false,
      environment: process.env.GCLOUD_PROJECT || "unknown",
      beforeSend: scrubEvent,
    });
    _sentry = Sentry;
    _initedDsn = dsn;
    return true;
  } catch (e) {
    console.error("sentry init failed:", e && e.message);
    return false;
  }
}

// Report an error. `where` is a coarse label ("api:prices", "scheduler:refreshPrices",
// "paypalWebhook") — deliberately not the user, the uid, or the request.
function captureError(cfg, where, err) {
  try {
    if (!initSentry(cfg)) return false;
    _sentry.captureException(err, { tags: { where: String(where || "unknown") } });
    return true;
  } catch (e) {
    console.error("sentry capture failed:", e && e.message);
    return false;
  }
}

// Test seam — lets the unit tests assert the no-DSN no-op without a real SDK.
function _reset() { _sentry = null; _initedDsn = null; }

module.exports = { isLikelyDsn, dsnOf, scrubEvent, initSentry, captureError, _reset };
