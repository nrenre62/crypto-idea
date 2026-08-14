"use strict";
// functions/ai-anthropic.js
// Plan B PR-E1 — pure request/response shaping for the Anthropic Messages API, plus a
// seamed raw-fetch (no SDK dependency; `fetchImpl` injected so tests touch no network).
// PR-E1 ships INERT — the live proxy that calls this is PR-E2.
//
// Cost-control request config is FOUNDER-LOCKED: default model claude-sonnet-5, thinking
// disabled, low reasoning effort. These knobs keep each analysis ~1¢, so they are pinned
// here, not left incidental. The Haiku 4.5 judge reuses the same builder with an explicit
// model. The API key is HEADER-ONLY (x-api-key) and must NEVER appear in the URL.

// Mirrors the CG_BASE / PAYPAL_BASE convention — overridable for tests, defaults to prod.
const ANTHROPIC_BASE = process.env.ANTHROPIC_BASE || "https://api.anthropic.com";
const ANTHROPIC_VERSION = "2023-06-01";

// Build the locked Messages request body. One user message, no assistant/other roles.
function buildMessagesRequest({ system, userMsg, maxTokens, model }) {
  return {
    model: model || "claude-sonnet-5",
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

// Raw POST to /v1/messages via the seamed fetch. Header-only auth; the key is never in
// the URL. Returns the parsed JSON (caller runs it through parseMessage).
async function callAnthropic({ apiKey, body, fetchImpl }) {
  const doFetch = fetchImpl || fetch;
  const res = await doFetch(`${ANTHROPIC_BASE}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

module.exports = {
  ANTHROPIC_BASE,
  ANTHROPIC_VERSION,
  buildMessagesRequest,
  parseMessage,
  callAnthropic,
};
