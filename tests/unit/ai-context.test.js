import { describe, it, expect } from "vitest";
import { holdingsContext } from "../../functions/ai-context.js";

// Plan B PR-E2 — the pure holdings→prompt helper for the Wave-B AI research proxy
// (researchAsk). holdingsContext(coins, opts) turns the caller's OWN coin docs into
//   { allowedNames, contextText }
// where allowedNames is the SERVER-AUTHORITATIVE safety allowlist fed to
// functions/validate-output.js (both the coin NAMES and their SYMBOLS, so the naming
// wall never rejects a user's own holding) and contextText is a short deterministic
// system-prompt summary. Pure (no I/O), so it is exhaustively unit-tested here with no
// emulator. PR-E2 wires it into the researchAsk callable body (functions-callable tier).
//
// RED today: functions/ai-context.js does not exist yet, so the import fails and every
// case below reports missing-module — red for the right reason (the module is absent,
// not a broken assertion). The functions-builder adds the pure module; then this goes green.

describe("ai-context.holdingsContext (PR-E2: holdings → { allowedNames, contextText })", () => {
  it("PR-E2: allowedNames carries BOTH each coin's name and its symbol (the safety allowlist)", () => {
    const { allowedNames } = holdingsContext([
      { name: "Bitcoin", symbol: "btc" },
      { name: "Ethereum", symbol: "eth" },
    ]);
    expect(Array.isArray(allowedNames)).toBe(true);
    // Both the display name and the ticker of every holding must be allow-listed, or the
    // validator's naming wall would reject the user's own coin.
    expect(allowedNames).toContain("Bitcoin");
    expect(allowedNames).toContain("btc");
    expect(allowedNames).toContain("Ethereum");
    expect(allowedNames).toContain("eth");
  });

  it("PR-E2: allowedNames is de-duplicated and trimmed", () => {
    const dup = holdingsContext([
      { name: "Solana", symbol: "SOL" },
      { name: "Solana", symbol: "SOL" },   // exact repeat
    ]).allowedNames;
    // A repeated holding contributes each distinct token exactly once.
    expect(dup.filter((n) => n === "Solana").length).toBe(1);
    expect(dup.filter((n) => n === "SOL").length).toBe(1);

    const trimmed = holdingsContext([{ name: "  Cardano  ", symbol: " ada " }]).allowedNames;
    expect(trimmed).toContain("Cardano");
    expect(trimmed).toContain("ada");
    expect(trimmed).not.toContain("  Cardano  ");
    expect(trimmed).not.toContain(" ada ");
  });

  it("PR-E2: drops empty / whitespace-only / non-string name & symbol tokens", () => {
    const { allowedNames } = holdingsContext([
      { name: "Solana", symbol: null },     // name kept, null symbol dropped
      { name: "   ", symbol: "" },          // both blank → nothing
      { name: 42, symbol: "eth" },          // non-string name dropped, symbol kept
    ]);
    expect(allowedNames).toContain("Solana");
    expect(allowedNames).toContain("eth");
    // Nothing empty, whitespace-only, or non-string may leak into the allowlist.
    for (const n of allowedNames) {
      expect(typeof n).toBe("string");
      expect(n.trim()).not.toBe("");
    }
    expect(allowedNames).not.toContain(42);
    expect(allowedNames).not.toContain("   ");
  });

  it("PR-E2: skips a malformed doc (no name AND no symbol) and null/undefined entries without throwing", () => {
    expect(() => holdingsContext([
      { foo: "bar" },   // neither name nor symbol
      null,
      undefined,
      { name: "Bitcoin", symbol: "btc" },
    ])).not.toThrow();
    const { allowedNames } = holdingsContext([{ foo: "bar" }, null, { name: "Bitcoin", symbol: "btc" }]);
    // The one valid coin still comes through.
    expect(allowedNames).toContain("Bitcoin");
    expect(allowedNames).toContain("btc");
  });

  it("PR-E2: contextText is a deterministic plain-English summary naming each holding", () => {
    const { contextText } = holdingsContext([
      { name: "Bitcoin", symbol: "btc" },
      { name: "Ethereum", symbol: "eth" },
    ]);
    expect(typeof contextText).toBe("string");
    // Pinned shape: the summary opens with "The user holds:" and names every coin
    // (its ticker travels with it — case-insensitive, since docs store it lowercased).
    expect(contextText).toMatch(/^The user holds:/);
    expect(contextText).toContain("Bitcoin");
    expect(contextText).toContain("Ethereum");
    expect(contextText).toMatch(/btc/i);
    expect(contextText).toMatch(/eth/i);
  });

  it("PR-E2: empty or absent input yields an empty allowlist and a stable empty-portfolio sentence", () => {
    for (const input of [[], null, undefined]) {
      const r = holdingsContext(input);
      expect(r.allowedNames).toEqual([]);
      expect(r.contextText).toBe("The user holds no coins yet.");
    }
  });

  it("PR-E2: opts.maxCoins caps BOTH allowedNames and contextText; a default cap bounds the prompt", () => {
    const many = Array.from({ length: 100 }, (_, i) => ({
      name: `Coin${String(i).padStart(3, "0")}`,
      symbol: `c${i}`,
    }));

    // An explicit cap is exact: only the first two coins are represented, in BOTH outputs.
    const capped = holdingsContext(many, { maxCoins: 2 });
    expect(capped.allowedNames).toContain("Coin000");
    expect(capped.allowedNames).toContain("Coin001");
    expect(capped.allowedNames).not.toContain("Coin002");
    expect(capped.contextText).toContain("Coin000");
    expect(capped.contextText).not.toContain("Coin002");

    // A DEFAULT cap bounds the prompt — the 100th coin is dropped with no explicit opt.
    const dflt = holdingsContext(many);
    expect(dflt.allowedNames).toContain("Coin000");
    expect(dflt.allowedNames).not.toContain("Coin099");
  });
});
