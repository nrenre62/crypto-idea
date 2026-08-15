import { describe, it, expect } from "vitest";
import {
  buildMessagesRequest, parseMessage, callProvider, AI_API_VERSION_HEADER,
} from "../../functions/ai-provider.js";

// Pure request/response shaping for the AI provider's Messages API, plus a seamed raw-fetch
// (fetchImpl injected so no network is touched). The path stays INERT until the go-live flag.
//
// Provider-agnostic by design: no provider name, endpoint, or model id is hardcoded. Model ids
// come from admin config and the endpoint from config/env — so the provider is swappable from
// the panel. Cost-control request knobs (thinking disabled, low effort) are FOUNDER-LOCKED.

describe("ai-provider.buildMessagesRequest (locked cost-control request body)", () => {
  it("carries the caller-supplied model (from admin config) and pins the cost-control config", () => {
    const body = buildMessagesRequest({ system: "You are a research helper.", userMsg: "How risky is my book?", maxTokens: 256, model: "gen-model-x" });
    expect(body.model).toBe("gen-model-x");
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.output_config).toEqual({ effort: "low" });
    expect(body.max_tokens).toBe(256);
    expect(body.system).toBe("You are a research helper.");
  });

  it("bakes in NO model default — an omitted model is empty (the caller supplies it from config)", () => {
    const body = buildMessagesRequest({ system: "S", userMsg: "U", maxTokens: 64 });
    expect(body.model).toBe("");
  });

  it("carries exactly ONE user message and no assistant/other roles", () => {
    const body = buildMessagesRequest({ system: "S", userMsg: "just this", maxTokens: 100 });
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
    expect(JSON.stringify(body.messages[0].content)).toContain("just this");
  });

  it("honours an explicit judge model (the judge reuses this builder)", () => {
    const body = buildMessagesRequest({ system: "S", userMsg: "U", maxTokens: 64, model: "judge-model-y" });
    expect(body.model).toBe("judge-model-y");
    // The cost-control knobs stay on regardless of model.
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.output_config).toEqual({ effort: "low" });
  });
});

describe("ai-provider.parseMessage (extract text + usage + stop reason)", () => {
  it("extracts the text block, usage and stop_reason from a normal reply", () => {
    const json = {
      content: [{ type: "text", text: "Your book leans into one position." }],
      usage: { input_tokens: 120, output_tokens: 40 },
      stop_reason: "end_turn",
    };
    expect(parseMessage(json)).toEqual({
      text: "Your book leans into one position.",
      usage: { input_tokens: 120, output_tokens: 40 },
      stopReason: "end_turn",
    });
  });

  it("a stop_reason 'refusal' maps to empty text (fail closed downstream)", () => {
    const parsed = parseMessage({ content: [], usage: { input_tokens: 30, output_tokens: 0 }, stop_reason: "refusal" });
    expect(parsed.text).toBe("");
    expect(parsed.stopReason).toBe("refusal");
  });

  it("never throws on a malformed reply — text defaults to empty", () => {
    expect(parseMessage({}).text).toBe("");
    expect(parseMessage(null).text).toBe("");
    expect(parseMessage({ content: [] }).text).toBe("");
  });
});

describe("ai-provider.callProvider (raw POST to the Messages API, seamed fetch)", () => {
  it("posts to <base>/v1/messages with the header-only api key and version header", async () => {
    let seen = null;
    const fetchImpl = async (url, options) => {
      seen = { url, options };
      return { ok: true, status: 200, json: async () => ({ ok: 1 }) };
    };
    const body = buildMessagesRequest({ system: "S", userMsg: "U", maxTokens: 64, model: "gen-model-x" });
    await callProvider({ apiKey: "PROVIDER-TESTKEY", body, fetchImpl, base: "https://api.example-ai.com" });

    expect(seen).not.toBeNull();
    expect(seen.url).toBe("https://api.example-ai.com/v1/messages");
    expect(seen.options.method).toBe("POST");
    expect(seen.options.headers["x-api-key"]).toBe("PROVIDER-TESTKEY");
    expect(seen.options.headers[AI_API_VERSION_HEADER]).toBeTruthy();
    // The request body is the shaped Messages request, serialized.
    expect(JSON.parse(seen.options.body).model).toBe("gen-model-x");
  });

  it("never puts the API key in the URL (header-only auth)", async () => {
    let seenUrl = null;
    const fetchImpl = async (url) => { seenUrl = url; return { ok: true, status: 200, json: async () => ({}) }; };
    await callProvider({ apiKey: "SECRET-KEY", body: { model: "gen-model-x" }, fetchImpl, base: "https://api.example-ai.com" });
    expect(seenUrl).not.toContain("SECRET-KEY");
  });
});
