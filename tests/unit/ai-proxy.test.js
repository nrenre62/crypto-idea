import { describe, it, expect } from "vitest";
import { runResearchAsk } from "../../functions/ai-proxy.js";
// The REAL validator — this IS the control being exercised, so it is NEVER mocked. The
// proxy must run functions/validate-output.js internally; here it is imported only to
// PROVE the fixtures below are genuinely clean/dirty by the same regex the proxy uses.
import { validateOutput } from "../../functions/validate-output.js";

// Plan B PR-E1 — the pure, security-critical fail-closed orchestrator for the Wave-B AI
// research proxy. callModel + judge are INJECTED (no network); the regex validator is the
// real one. Flow per candidate: generate → validateOutput(text,{allowedNames}) →
// judge(text) → clean+safe returns; any failure regenerates up to the cap; after the cap
// the returned text is the SAFE fallback, NEVER the violating candidate. PR-E1 ships
// INERT — PR-E2 wires the callable + the real model/judge calls.

// ── Fixtures (verified against the real validateOutput: clean pass, dirty fail) ──
const CLEAN_A = "Your holdings are concentrated in one position. That raises risk if it moves against you.";
const CLEAN_B = "Diversification tends to reduce the impact of any single position on your overall result.";
const CLEAN_C = "A longer track record can help you judge how a position behaves across different conditions.";
const DIRTY_ADVICE_PRICE_NAME = "You should buy more ADA — it could hit $5 soon.";
const DIRTY_NAME = "Sell XRP now; it is a strong sell.";
const DIRTY_PRICE_NAME = "DOGE is a 10-bagger at these levels.";

// A model stub that hands back queued candidates in order and counts how often it ran.
// Ignores its args, so it does not couple to the proxy's exact callModel signature.
function queueModel(items) {
  let i = 0;
  const fn = async () => {
    const it = items[i] !== undefined ? items[i] : { text: "", usage: { input_tokens: 0, output_tokens: 0 }, stopReason: "end_turn" };
    i += 1;
    fn.callCount = i;
    return it;
  };
  fn.callCount = 0;
  return fn;
}
const cand = (text, usage, stopReason = "end_turn") => ({ text, usage, stopReason });
// Judge verdict object: { safe }. By default everything is safe; a set of flagged strings
// is marked unsafe so the judge-only rejection path (regex-clean but judged unsafe) is testable.
const judgeExcept = (unsafeSet) => async (text) => ({ safe: !unsafeSet.has(text) });
const safeJudge = async () => ({ safe: true });
const OPTS = { question: "How is my book?", context: {}, allowedNames: [] };

it("PR-E1 fixtures: the clean candidates pass and the dirty ones fail the real validator", () => {
  for (const t of [CLEAN_A, CLEAN_B, CLEAN_C]) expect(validateOutput(t, { allowedNames: [] }).ok).toBe(true);
  for (const t of [DIRTY_ADVICE_PRICE_NAME, DIRTY_NAME, DIRTY_PRICE_NAME]) expect(validateOutput(t, { allowedNames: [] }).ok).toBe(false);
});

describe("ai-proxy.runResearchAsk (PR-E1: fail-closed generate → validate → judge)", () => {
  it("PR-E1 (a): a first candidate that is clean AND judge-safe is returned, fellBack=false", async () => {
    const u = { input_tokens: 100, output_tokens: 10 };
    const callModel = queueModel([cand(CLEAN_A, u)]);
    const res = await runResearchAsk({ ...OPTS, callModel, judge: safeJudge, maxRegens: 2 });
    expect(res.text).toBe(CLEAN_A);
    expect(res.fellBack).toBe(false);
    expect(callModel.callCount).toBe(1);
    // Generation usage is accumulated so the caller can meter cost.
    expect(res.usageList).toContainEqual(u);
  });

  it("PR-E1 (b): a candidate carrying a ticker/price/advice is rejected by the regex → regenerates", async () => {
    const u1 = { input_tokens: 100, output_tokens: 10 };
    const u2 = { input_tokens: 200, output_tokens: 20 };
    const callModel = queueModel([cand(DIRTY_ADVICE_PRICE_NAME, u1), cand(CLEAN_A, u2)]);
    const res = await runResearchAsk({ ...OPTS, callModel, judge: safeJudge, maxRegens: 2 });
    expect(res.text).toBe(CLEAN_A);
    expect(res.fellBack).toBe(false);
    expect(callModel.callCount).toBe(2);
    // Both attempts are metered — even the rejected generation cost tokens.
    expect(res.usageList).toContainEqual(u1);
    expect(res.usageList).toContainEqual(u2);
  });

  it("PR-E1 (c): a regex-clean candidate the injected judge flags unsafe → regenerates", async () => {
    const u1 = { input_tokens: 100, output_tokens: 10 };
    const u2 = { input_tokens: 200, output_tokens: 20 };
    const callModel = queueModel([cand(CLEAN_B, u1), cand(CLEAN_C, u2)]);
    const judge = judgeExcept(new Set([CLEAN_B])); // CLEAN_B passes regex but the judge rejects it
    const res = await runResearchAsk({ ...OPTS, callModel, judge, maxRegens: 2 });
    expect(res.text).toBe(CLEAN_C);
    expect(res.fellBack).toBe(false);
    expect(callModel.callCount).toBe(2);
  });

  it("PR-E1 (d): 1 initial + 2 regens all dirty → fellBack=true and NEVER the violating text", async () => {
    const callModel = queueModel([
      cand(DIRTY_ADVICE_PRICE_NAME, { input_tokens: 100, output_tokens: 10 }),
      cand(DIRTY_NAME, { input_tokens: 110, output_tokens: 11 }),
      cand(DIRTY_PRICE_NAME, { input_tokens: 120, output_tokens: 12 }),
    ]);
    const res = await runResearchAsk({ ...OPTS, callModel, judge: safeJudge, maxRegens: 2 });
    expect(res.fellBack).toBe(true);
    // The security invariant: violating text must NEVER be returned to the client.
    for (const dirty of [DIRTY_ADVICE_PRICE_NAME, DIRTY_NAME, DIRTY_PRICE_NAME]) {
      expect(res.text).not.toBe(dirty);
    }
    expect(res.text).not.toMatch(/ADA|XRP|DOGE|\$5|bagger/);
    // The cap holds: 1 initial + 2 regens = 3 generations, no more.
    expect(callModel.callCount).toBe(3);
  });

  it("PR-E1 (e): a stop_reason 'refusal' (or empty text) candidate is treated as invalid → regenerates", async () => {
    const uRefusal = { input_tokens: 30, output_tokens: 0 };
    const uClean = { input_tokens: 200, output_tokens: 20 };
    const callModel = queueModel([cand("", uRefusal, "refusal"), cand(CLEAN_A, uClean)]);
    const res = await runResearchAsk({ ...OPTS, callModel, judge: safeJudge, maxRegens: 2 });
    expect(res.text).toBe(CLEAN_A);
    expect(res.fellBack).toBe(false);
    expect(callModel.callCount).toBe(2);
    // Even a refused generation consumed tokens and must be metered.
    expect(res.usageList).toContainEqual(uRefusal);
  });

  it("PR-E1: an empty-text candidate with a normal stop_reason is still invalid", async () => {
    const callModel = queueModel([cand("", { input_tokens: 5, output_tokens: 0 }, "end_turn"), cand(CLEAN_A, { input_tokens: 200, output_tokens: 20 })]);
    const res = await runResearchAsk({ ...OPTS, callModel, judge: safeJudge, maxRegens: 2 });
    expect(res.text).toBe(CLEAN_A);
    expect(res.fellBack).toBe(false);
  });
});
