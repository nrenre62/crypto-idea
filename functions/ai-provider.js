"use strict";
// functions/ai-provider.js
// Pure request/response shaping for the AI provider's Messages API, plus a seamed
// raw-fetch (no SDK dependency; `fetchImpl` injected so tests touch no network). The
// live proxy that calls this stays INERT until the go-live flag flips.
//
// PROVIDER-AGNOSTIC BY DESIGN: no provider name, endpoint, or model id is hardcoded here.
// The model ids come from admin config (config/app.ai.generationModel / judgeModel) and the
// endpoint from config/env (config/app.ai.baseUrl / AI_PROVIDER_BASE), so the provider or
// model can be changed by pasting a new value in the admin panel — no code edit, no redeploy.
// Cost-control request knobs are FOUNDER-LOCKED (thinking disabled, low reasoning effort) —
// they keep each analysis cheap, so they are pinned here. The API key is HEADER-ONLY and must
// NEVER appear in the URL.

// Endpoint + wire-protocol strings come from env (set at deploy), with only the neutral
// version VALUE as a fallback. `AI_API_VERSION_HEADER` is the default provider's required
// request header name; override it (and the base URL) via env to target another provider.
const AI_PROVIDER_BASE = process.env.AI_PROVIDER_BASE || "";
const AI_API_VERSION = process.env.AI_API_VERSION || "2023-06-01";
const AI_API_VERSION_HEADER = process.env.AI_API_VERSION_HEADER || "anthropic-version";

// Build the locked Messages request body. One user message, no assistant/other roles. The
// model id is supplied by the caller from config — there is no baked-in default.
function buildMessagesRequest({ system, userMsg, maxTokens, model }) {
  return {
    model: model || "",
    max_tokens: maxTokens,
    thinking: { type: "disabled" },
    output_config: { effort: "low" },
    system,
    messages: [{ role: "user", content: userMsg }],
  };
}

// Extract text + usage + stop reason from a Messages reply. Never throws on a malformed
// reply — text defaults to empty (fail closed downstream). A stop_reason of "refusal"
// maps to empty text regardless of any content blocks.
function parseMessage(json) {
  const j = json && typeof json === "object" ? json : {};
  const stopReason = j.stop_reason;
  if (stopReason === "refusal") {
    return { text: "", usage: j.usage, stopReason };
  }
  const blocks = Array.isArray(j.content) ? j.content : [];
  const text = blocks
    .filter((b) => b && b.type === "text")
    .map((b) => (typeof b.text === "string" ? b.text : ""))
    .join("");
  return { text, usage: j.usage, stopReason };
}

// Raw POST to /v1/messages via the seamed fetch. Header-only auth; the key is never in the
// URL. `base`/`version` default to the env values but the caller may pass config-sourced ones
// so the endpoint is swappable from the admin panel. Returns the parsed JSON (caller runs it
// through parseMessage).
async function callProvider({ apiKey, body, fetchImpl, base, version }) {
  const doFetch = fetchImpl || fetch;
  const origin = base || AI_PROVIDER_BASE;
  const res = await doFetch(`${origin}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      [AI_API_VERSION_HEADER]: version || AI_API_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

module.exports = {
  AI_PROVIDER_BASE,
  AI_API_VERSION,
  AI_API_VERSION_HEADER,
  buildMessagesRequest,
  parseMessage,
  callProvider,
};
