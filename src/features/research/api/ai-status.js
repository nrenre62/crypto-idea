// api/ai-status.js — the single "is the live AI proxy wired?" flag for the Research tab.
//
// Deliberately split out from ai-client.js: ai-client is the askAI seam that tests
// FACTORY-MOCK (to prove askAI is never called today), and a factory mock that omits
// a constant makes any read of that constant throw. Keeping the flag in its own tiny
// module lets the UI read it honestly under those tests, while ai-client stays the place
// the proxy body gets swapped in. When the `researchAsk` Cloud Function ships, flip this
// to true in the same increment that replaces ai-client's askAI body.
export const AI_PROXY_LIVE = false;
