import { describe, it, expect } from "vitest";
import {
  buildMessagesRequest, parseMessage, callAnthropic,
} from "../../functions/ai-anthropic.js";

// Plan B PR-E1 — pure request/response shaping for the Anthropic Messages API, plus a
// seamed raw-fetch (fetchImpl injected so no network is touched). PR-E1 ships INERT; the
// live proxy that calls this is PR-E2.
//
// Cost-control request config is FOUNDER-LOCKED: default model claude-sonnet-5,
// thinking disabled, low reasoning effort. These are the knobs that keep each analysis
// ~1¢, so they are asserted, not incidental.

describe("ai-anthropic.buildMessagesRequest (PR-E1: locked cost-control request body)", () => {
  it("PR-E1: defaults to claude-sonnet-5 and pins the cost-control config", () => {
    const body = buildMessagesRequest({ system: "You are a research helper.", userMsg: "How risky is my book?", maxTokens: 256 });
    expect(body.model).toBe("claude-sonnet-5");
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.output_config).toEqual({ effort: "low" });
    expect(body.max_tokens).toBe(256);
    expect(body.system).toBe("You are a research helper.");
  });

  it("PR-E1: carries exactly ONE user message and no assistant/other roles", () => {
    const body = buildMessagesRequest({ system: "S", userMsg: "just this", maxTokens: 100 });
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
    expect(JSON.stringify(body.messages[0].content)).toContain("just this");
  });

  it("PR-E1: honours an explicit model (the Haiku 4.5 judge reuses this builder)", () => {
    const body = buildMessagesRequest({ system: "S", userMsg: "U", maxTokens: 64, model: "claude-haiku-4-5" });
    expect(body.model).toBe("claude-haiku-4-5");
    // The cost-control knobs stay on regardless of model.
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.output_config).toEqual({ effort: "low" });
  });
});

describe("ai-anthropic.parseMessage (PR-E1: extract text + usage + stop reason)", () => {
  it("PR-E1: extracts the text block, usage and stop_reason from a normal reply", () => {
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

  it("PR-E1: a stop_reason 'refusal' maps to empty text (fail closed downstream)", () => {
    const parsed = parseMessage({ content: [], usage: { input_tokens: 30, output_tokens: 0 }, stop_reason: "refusal" });
    expect(parsed.text).toBe("");
    expect(parsed.stopReason).toBe("refusal");
  });

  it("PR-E1: never throws on a malformed reply — text defaults to empty", () => {
    expect(parseMessage({}).text).toBe("");
    expect(parseMessage(null).text).toBe("");
    expect(parseMessage({ content: [] }).text).toBe("");
  });
});

describe("ai-anthropic.callAnthropic (PR-E1: raw POST to the Messages API, seamed fetch)", () => {
  it("PR-E1: posts to /v1/messages with the x-api-key and anthropic-version headers", async () => {
    let seen = null;
    const fetchImpl = async (url, options) => {
      seen = { url, options };
      return { ok: true, status: 200, json: async () => ({ ok: 1 }) };
    };
    const body = buildMessagesRequest({ system: "S", userMsg: "U", maxTokens: 64 });
    await callAnthropic({ apiKey: "sk-ant-TESTKEY", body, fetchImpl });

    expect(seen).not.toBeNull();
    expect(seen.url).toBe("https://api.anthropic.com/v1/messages");
    expect(seen.options.method).toBe("POST");
    expect(seen.options.headers["x-api-key"]).toBe("sk-ant-TESTKEY");
    expect(seen.options.headers["anthropic-version"]).toBeTruthy();
    // The request body is the shaped Messages request, serialized.
    expect(JSON.parse(seen.options.body).model).toBe("claude-sonnet-5");
  });

  it("PR-E1: never puts the API key in the URL (header-only auth)", async () => {
    let seenUrl = null;
    const fetchImpl = async (url) => { seenUrl = url; return { ok: true, status: 200, json: async () => ({}) }; };
    await callAnthropic({ apiKey: "sk-ant-SECRET", body: { model: "claude-sonnet-5" }, fetchImpl });
    expect(seenUrl).not.toContain("sk-ant-SECRET");
  });
});
