# CryptoIdea — Product Decisions

The hub for CryptoIdea's product and strategy decisions: what the product is, the rules that hold across every surface, and where the full detail for each area lives. State each decision once here and follow the spoke link for the rest.

## What CryptoIdea is

CryptoIdea is a conviction tool for retail crypto investors who have been burned by hype and FOMO — not a trading platform, a signal service, or another price tracker. The core gesture is: *write why you bought a coin, then see whether your thesis still holds.*

It is one integrated product with five tabs — Portfolio, Research, Journal, Learn, and Search. The Journal holds your thesis; the Research tab is meant to test it against conviction signals; and Learn teaches the framework behind those signals. The integration across the five tabs is the product's moat, not any single tab.

- Platform: a web PWA, fully responsive across mobile and desktop, built on Vite, React, and Firebase.
- Acquisition: research-led — public research under the @CryptoIdea handle feeds signups. This is a marketing motion, kept strictly separate from the app by the naming wall below.
- Payments: PayPal is the sole processor, via a signature-verified webhook and callables. See [Billing](./BILLING.md).

## The rules that hold everywhere

These are the invariants every feature is built against.

- Research, never advice. Nowhere in the app does CryptoIdea give buy/sell/hold calls, price targets, probability weights, model portfolios, or an aggregate score. The app shows separate signals and your own thesis; it never resolves them into a verdict.
- The naming wall. In-app AI output is fully anonymized — it never surfaces a project name the AI introduced itself, and Learn teaches principles with no attribution to named investors. Any named, published research is a separate, founder-reviewed pipeline; nothing named flows into the app. A build-time no-names guard fails the shipped bundle if a real investor name leaks in.
- Fail-closed AI. Every LLM response passes a regex prefilter and then a stricter judge before any text reaches a user; a judge error or timeout falls back to safe text rather than raw model output. See [AI — status and roadmap](../product/AI.md).
- Prices are never a tier lever. Market data reads live and identical for every tier. Tier value comes from AI access and capacity, never from price freshness. See [Cache policy](./CACHE-POLICY.md).
- Anti-abuse by design. A hard per-portfolio coin clamp, a rate-limited add-coin callable, and App Check keep capacity limits from being bot-inflated — this protects both stored data and AI cost, since each novel coin is a fresh engine run.

## Plans and monetization

Three tiers, priced and limited to keep a flat-cost model. Free renames to "Starter" as a label only; the internal tier key stays `free`.

- Starter, Pro, and Premium each raise the ceilings on portfolios, coins per portfolio, and transactions.
- The live-AI ceiling is a per-user monthly dollar cap metered on actual token cost — Starter runs offline, Pro and Premium get live AI within their monthly budget.

Exact prices, resource limits, and the margin logic behind the numbers live in [Pricing](./PRICING.md); the payment and subscription flow lives in [Billing](./BILLING.md).

## The conviction engine

The marketed differentiator. It is architected so the backend fetches from approved sources and the AI reasons only over that data — it is not an LLM turned loose with a web tool.

- A signal shows only after a multi-source cross-check corroborates it, and each signal is stamped with its fetch date; dated catalysts auto-expire so a past event never reads as upcoming.
- The rubric is four states: healthy, mixed, problem, and insufficient-data. "Insufficient-data" is shown with a per-axis reason chip and framed as a caution finding, never a silent blank.
- Conviction data lives in a shared per-coin cache, generated once per coin (never per-user), refreshed on demand with a read-time TTL that varies by tier.

The engine's live path depends on a secure AI proxy that holds the provider key server-side. Today the app ships with AI off and the Research tab renders honest, data-driven summaries in its place. What is built, what is inert, and what "turning it on" requires are all documented in [AI — status and roadmap](../product/AI.md).

## AI safety, legal, and privacy

- The output validator is the control, not the system prompt: a cheap regex prefilter handles clean text and escalates suspect spans to an AI judge, and the whole path fails closed with a bounded regeneration cap before showing safe fallback text.
- User data sent to the AI provider goes only under no-training API terms, disclosed in the privacy policy, because the chat can send a raw journal thesis.
- Generation and judging use two separate models from the AI provider — a generation model for prose and a judge model for output review — pinned in the server code and verified against the provider's live model list before any go-live deploy.

## Learn, Journal, and the funnel

- The Journal stores each thesis on the coin document in Firestore (validated by rules), which is what lets the AI read it and keeps it in cross-device sync.
- Learn ships as a full library with gamification (levels, XP, streaks, badges) and quiz-gated lesson completion; quizzes are hand-authored to guarantee the no-names voice and correct answers.
- The taxonomy keeps both the research funnel and the conviction signals, with an explicit in-app bridge explaining which steps the signals cover and which you apply yourself. Three funnel steps — dilution and unlocks, real volume versus wash-trading, and real yield — stay permanently manual; the Journal captures those findings and Learn teaches them.
- The DCA calculator lives on the marketing landing page only and is intentionally absent from the app.

## See also

- [Documentation index](../INDEX.md) — the map of all docs.
- [Pricing](./PRICING.md) — tiers, prices, limits, and the AI budget model.
- [Billing](./BILLING.md) — the PayPal subscription flow, webhooks, and go-live checklist.
- [Cache policy](./CACHE-POLICY.md) — cache tiers, TTLs, and the "everything reads live" north star.
- [Backend and admin decisions](./BACKEND-ADMIN-DECISIONS.md) — admin roles, moderation, and operational safety.
- [Architecture](./ARCHITECTURE.md) — system layering and the code-reality record.
- [AI — status and roadmap](../product/AI.md) — what AI is off, what it does without a live model, and what Wave B adds.
- [How to research crypto](../planning/how-to-research-crypto.md) — the research method behind the funnel and signals.
