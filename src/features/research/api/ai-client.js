// api/ai-client.js — app-side AI client for the research tab.
//
// SECURITY: the Anthropic key must NEVER ship to the browser, so we do not call
// the Anthropic API (or any relay) directly from here. Live "Pulse" / "Ask"
// answers require a server-side proxy — a Cloud Function that holds the key and
// forwards to Claude — which is the planned next increment.
//
// Until that proxy exists, askClaude throws so the callers (usePulse / useAsk)
// fall back to their built-in, data-driven offline summaries. This keeps the tab
// fully usable and secure today, with a clean seam to plug live AI in later:
// replace the body below with a callable to the `researchAsk` Cloud Function.
export async function askClaude(/* system, userMsg */) {
  throw new Error('research-ai-proxy-not-configured');
}
