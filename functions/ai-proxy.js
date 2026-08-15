"use strict";
// functions/ai-proxy.js
// Plan B PR-E1 — the pure, security-critical, FAIL-CLOSED orchestrator for the Wave-B AI
// research proxy. `callModel` + `judge` are INJECTED (no network); the regex validator is
// the REAL functions/validate-output.js (the control being exercised — never reimplemented
// or mocked). PR-E1 ships INERT: PR-E2 wires the callable, the real generation model,
// the real judge model, and the app-wide $-budget metering around this.
//
// Flow per candidate: generate → treat refusal/empty text as invalid → validateOutput(
// text, {allowedNames}) regex prefilter → injected judge(text) → a candidate that is
// regex-CLEAN and judge-SAFE is returned. Any failure regenerates, up to the cap
// (1 initial + maxRegens, matching validate-output's MAX_REGENS). After the cap the
// returned text is the SAFE fallback ("") — the violating candidate is NEVER returned to
// the client. Every attempt's usage (generation + judge) is accumulated so the caller can
// meter cost, even for rejected/refused generations that still burned tokens.

const { validateOutput, MAX_REGENS } = require("./validate-output.js");

async function runResearchAsk({ question, context, allowedNames, callModel, judge, maxRegens }) {
  const opts = { allowedNames: allowedNames || [] };
  const regens = Number.isFinite(maxRegens) ? maxRegens : MAX_REGENS;
  const attempts = regens + 1; // 1 initial generation + N regens
  const usageList = [];

  for (let i = 0; i < attempts; i++) {
    const candidate = (await callModel({ question, context, allowedNames: opts.allowedNames, attempt: i })) || {};
    // Meter EVERY generation — a rejected or refused candidate still consumed tokens.
    if (candidate.usage !== undefined) usageList.push(candidate.usage);

    // A refusal or empty text is invalid → regenerate (never surfaces an empty answer).
    if (candidate.stopReason === "refusal") continue;
    const text = typeof candidate.text === "string" ? candidate.text : "";
    if (text.trim() === "") continue;

    // The regex prefilter is the hard control — a ticker/price/advice/allocation/score
    // candidate is rejected here before any judge or client ever sees it.
    if (!validateOutput(text, opts).ok) continue;

    // Stricter second pass: the injected LLM judge. Its own usage is metered too.
    const verdict = (await judge(text)) || {};
    if (verdict.usage !== undefined) usageList.push(verdict.usage);
    if (verdict.safe === true) {
      return { text, usageList, fellBack: false };
    }
    // regex-clean but judged unsafe → regenerate
  }

  // Fail closed: after the cap, return the SAFE fallback — NEVER the violating text.
  return { text: "", usageList, fellBack: true };
}

module.exports = { runResearchAsk };
