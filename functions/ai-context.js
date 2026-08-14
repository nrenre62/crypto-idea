"use strict";
// functions/ai-context.js
// Plan B PR-E2 — the pure holdings→prompt helper for the Wave-B AI research proxy
// (researchAsk). holdingsContext(coins, opts) turns the caller's OWN coin docs into
//   { allowedNames, contextText }
// where allowedNames is the SERVER-AUTHORITATIVE safety allowlist handed to
// functions/validate-output.js (BOTH each coin's display NAME and its SYMBOL, so the
// naming wall never rejects the user's own holding) and contextText is a short,
// deterministic system-prompt summary of the book. Pure (no I/O) so it is exhaustively
// unit-tested with no emulator.
//
// SECURITY: the allowlist is derived ONLY from the caller's own coin docs — it is NEVER
// trusted from the client. Building it here keeps the naming wall authoritative: the
// model may name a coin only because the user actually holds it.

// Default cap on how many coins are represented in BOTH outputs — bounds the prompt so a
// pathological book can't blow up the system message (and the token cost with it).
const DEFAULT_MAX_COINS = 40;

// A usable trimmed token, or null. Rejects non-strings, empty and whitespace-only values,
// so nothing empty/garbage can ever leak into the allowlist or the prompt.
function cleanToken(v) {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

// One kept coin's label for contextText: "Name (symbol)" when both are present,
// otherwise whichever single token exists.
function coinLabel(c) {
  if (c.name && c.symbol) return `${c.name} (${c.symbol})`;
  return c.name || c.symbol;
}

const EMPTY_SENTENCE = "The user holds no coins yet.";

// coins: an array of coin docs (each may carry .name and/or .symbol). opts.maxCoins caps
// the number of coins represented in BOTH outputs (default DEFAULT_MAX_COINS). The cap is
// on COINS, not tokens: the array is sliced first, then tokens are extracted.
function holdingsContext(coins, opts) {
  const options = opts || {};
  const maxCoins = Number.isFinite(options.maxCoins) ? options.maxCoins : DEFAULT_MAX_COINS;

  if (!Array.isArray(coins) || coins.length === 0) {
    return { allowedNames: [], contextText: EMPTY_SENTENCE };
  }

  // Cap on coins FIRST, then extract tokens from the slice.
  const kept = [];
  for (const doc of coins.slice(0, maxCoins)) {
    if (!doc || typeof doc !== "object") continue;   // skip null/undefined/malformed
    const name = cleanToken(doc.name);
    const symbol = cleanToken(doc.symbol);
    if (!name && !symbol) continue;                  // neither usable → skip, never throw
    kept.push({ name, symbol });
  }

  if (kept.length === 0) {
    return { allowedNames: [], contextText: EMPTY_SENTENCE };
  }

  // De-duplicate while preserving first-seen order.
  const seen = new Set();
  const allowedNames = [];
  for (const c of kept) {
    for (const tok of [c.name, c.symbol]) {
      if (tok && !seen.has(tok)) { seen.add(tok); allowedNames.push(tok); }
    }
  }

  const contextText = `The user holds: ${kept.map(coinLabel).join(", ")}.`;
  return { allowedNames, contextText };
}

module.exports = { holdingsContext, DEFAULT_MAX_COINS };
