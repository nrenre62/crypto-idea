# AI status and roadmap

Part of [Product decisions](../decisions/PRODUCT-DECISIONS.md) — the AI clause. Canonical record of the AI feature's state: AI is off today, the Research tab is fully useful without it, and this doc explains the deterministic behavior that ships now plus what turning live AI on would require.

## Current state: AI is off

CryptoIdea ships and runs with no live AI. The Research tab renders a deterministic, data-driven summary on every surface, and that summary is presented as the real feature — not a broken or degraded one.

- No live model is wired. There is no active server proxy holding a provider key, and the client never calls the AI API. The go-live seam `AI_PROXY_LIVE` (in `src/features/research/api/ai-status.js`) is `false`, so every AI-only ornament — a generating label, a Regenerate button, an "AI-generated" disclaimer — stays hidden.
- The Research → Ask chat and the per-coin "Ask AI" button are gated by the `aiResearch` admin kill-switch, evaluated client-side. When it is off, both the chat tab and the button are hidden and a stale chat selection falls back to Overview.

## What the Research tab does without AI

Everything the tab shows is computed deterministically from your own portfolio numbers — honest arithmetic over your active portfolio, reusing the app's existing `/api` proxy for prices. No key ever reaches the browser and nothing calls CoinGecko directly.

- Portfolio Pulse — a multi-signal summary built by `usePulse` over the pure `utils/pulse.js` layer: value and performance, unrealized P&L against cost basis, return attribution naming the net-direction top contributor, top-two concentration with effective-N, a "This week" 7-day volatility and drawdown line, and a diversification nudge.
- Daily Brief — an honest 24h digest from `briefFacts` (biggest gainer and biggest decliner, with a near-zero rule so a flat day is not mislabeled as movement).
- Ask — when the kill-switch permits it, `useAsk` renders the same built-in, data-driven answers rather than a live model response.
- Coins — per-holding cards with a 7-day sparkline, cost / now / P&L, and the conviction-signal pills.

## The hard product rule: research, never advice

The AI feature is a research aid, not a financial advisor. This rule holds whether AI is off or on:

- No buy, sell, or hold recommendations.
- No price targets.
- No single aggregate "score" for a coin or a portfolio.

This constraint is enforced in code, not merely in a prompt. A system prompt is not a control.

## The server-side foundation (client-inert)

The proxy foundation exists in the backend but nothing calls it yet — the client seam stays inert until `AI_PROXY_LIVE` is flipped.

- A signed-in-user `researchAsk` callable that acts only on the caller's own uid, behind a fail-closed gate order: auth, question validation, the `aiResearch` kill-switch read fresh from config, provider-key presence, a per-uid daily budget, and an app-wide monthly spend cap.
- A fail-closed output validator (`functions/validate-output.js`, pure and unit-tested and red-teamed) that blocks names, price targets, financial advice, allocation instructions, and aggregate scores, and caps regeneration attempts so violating text is never returned.
- A server-only monthly AI-spend ledger (`aiBudget/{YYYY-MM}`, denied to all clients by the Firestore rules) that meters real per-model token cost against an admin-set monthly cap.

## Turning live AI on

Enabling live AI requires all of the following in one change, and until every one is built and tested, AI stays off:

- A secure Cloud Function proxy that holds the provider API key server-side and is the only path to the AI API — the client never calls it directly.
- A generation model to produce answers and a judge model to screen them, both selected server-side.
- Running the output validator on every response before any text reaches the client — the regex prefilter followed by the stricter model judge, fail-closed.
- The per-uid daily budget and the app-wide monthly spend cap active so cost cannot run away.
- Flipping `AI_PROXY_LIVE` and swapping the `ai-client.js` seam body in the same increment that ships the callable.

Live AI also needs the paid Firebase Blaze backend to host the proxy.

## See also

- [Security model](../security/SECURITY.md) — the secrets-server-side and deny-by-default boundary this feature must respect.
- [Product decisions](../decisions/PRODUCT-DECISIONS.md) — the canonical product/AI/pricing record.
- [Documentation index](../INDEX.md) — the docs hub.
