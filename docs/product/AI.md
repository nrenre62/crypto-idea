# AI — status & roadmap

**Canonical record of the AI feature's state.** Short version: **AI is OFF.** The app ships and
runs with no live LLM. This doc explains what that means, what the Research tab does *without* AI,
and what "Wave B" would add if it is ever turned on.

---

## Current state: AI is off

- **No live LLM is wired.** There is no server proxy holding an Anthropic key, and the client never
  calls any model. The go-live seam (`AI_PROXY_LIVE` in `src/features/research/api/ai-status.js`) is
  `false`, so every AI-only ornament (a "generating" label, a Regenerate button, an "AI-generated"
  disclaimer) stays hidden.
- **The Research → Ask chat and the per-coin "Ask AI" button are gated off** by the `aiResearch`
  admin kill-switch and are not part of the launched product.
- This is deliberate for launch: a live LLM needs a paid backend (Firebase Blaze + an Anthropic key),
  a spend cap, and an output-safety layer — none of which are being enabled or tested right now.

## What the Research tab does without AI

The Research tab is fully useful with no model. Everything it shows is **computed deterministically
from your own portfolio numbers** — honest arithmetic, not a guess:

- **Portfolio Pulse** — a multi-signal summary: value + performance, unrealized P&L vs cost basis,
  which holding drove the move (return attribution), top-two concentration and how many "effective"
  equal-weight positions you really hold, your typical daily swing and how far you sit below the
  7-day high, and a diversification nudge.
- **Daily Brief** — an honest 24h digest (biggest gainer + biggest decliner, near-zero handled).
- **Coins** — per-holding cards with a 7-day sparkline, cost / now / P&L, and conviction-signal pills.

All of it reads your real active portfolio and reuses the app's existing `/api` proxy — no direct
CoinGecko calls, no key in the browser.

## Wave B (only if AI is ever turned on)

If live AI were enabled later, it would require **all** of the following in one change:

1. A secure Cloud Function proxy that holds the Anthropic key server-side (never the client).
2. A per-user **monthly spend cap** so cost can't run away.
3. A **fail-closed output validator** (`functions/validate-output.js` already exists, unit-tested and
   red-teamed) that blocks names / price targets / financial advice before any text reaches a user.
4. Flipping `AI_PROXY_LIVE` and the `aiResearch` switch in the same increment.

Until every one of those is built and tested, AI stays off.

## Related docs

- Research tab architecture — [`../../src/features/research/`](../../src/features/research/)
- Output-safety validator — `functions/validate-output.js`
- AI tool policy (how AI is used to *build* the project) — [`../planning/ai-tool-policy.md`](../planning/ai-tool-policy.md)
