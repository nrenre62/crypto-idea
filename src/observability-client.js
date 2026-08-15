// Client-side error reporting + measurement (Sentry, browser).
//
// This complements the server-side reporter in functions/observability.js. The
// server catches backend failures (webhook, schedulers, /api); this catches what
// only the browser sees — a render throw that would otherwise show a blank page,
// an unhandled rejection, plus performance traces and session replay.
//
// WHY FULL INSTRUMENTATION (founder, 2026-08-15): this repo is a public,
// MIT-licensed research/portfolio project. Keeping the deployed product live and
// MEASURING EVERYTHING is the goal, and there are only minimal test users — so the
// bundle cost and the replay/trace volume are an accepted, deliberate trade-off,
// not the "functions-only" posture the pre-launch app defaulted to.
//
// PRIVACY: Session Replay records user sessions and ships them to Sentry (EU/DE
// region — see the DSN host). Replay's defaults MASK all text and BLOCK all media;
// we additionally set sendDefaultPii:false and scrub the user + request off every
// error event before it leaves the browser. This is still a third-party data
// transfer that MUST be disclosed in the privacy policy before it runs for real
// users (see the placeholder policy PR).
//
// SOURCE PRIVACY: no source maps are generated (vite sourcemap:false) and none are
// uploaded, so your original source is never sent to Sentry — the trade-off is that
// stack traces in Sentry are minified.
//
// The DSN is public by design for a browser SDK: it only authorizes SENDING events,
// it grants no read access. Safe to ship in the bundle and to commit to a public repo.
const DSN = "https://e649679ac12daeeb1b1a13fa051a88aa@o4511914659086336.ingest.de.sentry.io/4511914692313168";

let _inited = false;
let _sentry = null;

// Strip anything that could carry personal data off an ERROR event before it leaves
// the browser. (Replay masking is handled by the integration's own defaults.)
function scrub(event) {
  if (!event) return event;
  delete event.user;                     // no id / email / ip-derived identity
  if (event.request) event.request = {}; // drop URL (can carry ids) + headers
  return event;
}

// Load + initialize the SDK. Dynamic import so Sentry streams as its own cached
// chunk (see vite.config.js manualChunks) and never blocks first paint. Never
// throws: an observability failure must not become an app outage.
async function initClientSentry() {
  if (_inited) return _sentry;
  _inited = true;
  try {
    const Sentry = await import("@sentry/browser");
    Sentry.init({
      dsn: DSN,
      sendDefaultPii: false,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(), // masks all text + blocks all media by default
      ],
      // Tracing — capture 100% of transactions (research project; dial down at scale).
      tracesSampleRate: 1.0,
      // Domain-agnostic on purpose: no real domain is committed to this public repo.
      // Same-origin /api/** calls match regardless of the eventual Firebase domain.
      tracePropagationTargets: ["localhost", /\/api\//],
      // Session Replay — 100% of sessions while in development ("measure everything");
      // 100% of sessions that hit an error. Lower replaysSessionSampleRate for scale.
      replaysSessionSampleRate: 1.0,
      replaysOnErrorSampleRate: 1.0,
      environment: (import.meta && import.meta.env && import.meta.env.MODE) || "production",
      beforeSend: scrub,
    });
    _sentry = Sentry;
    return Sentry;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("client sentry init failed:", e && e.message);
    return null;
  }
}

// Explicitly report a React render error — window.onerror (installed by Sentry's
// default global handlers) does NOT catch errors caught by a React error boundary.
function captureClientError(err, where) {
  if (!_sentry) return false;
  try {
    _sentry.captureException(err, { tags: { where: String(where || "client") } });
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("client sentry capture failed:", e && e.message);
    return false;
  }
}

export { initClientSentry, captureClientError, scrub };
