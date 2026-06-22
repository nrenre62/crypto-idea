# CryptoIdea — AI Tool Policy
**v4 · what the in-app AI may and may not do — enforced, not suggested** · **RECONCILED 2026-06-22**

> ⚠️ **Reconciled against [`PRODUCT-DECISIONS.md`](../../PRODUCT-DECISIONS.md) (canonical).** Additions:
> - **"Unlimited" (Premium chat + coins) = a high HARD ceiling**, never bot-inflatable to infinity — rate-limited endpoints + App Check (decision #20).
> - **LLM split is decided:** Claude for prose (chat, Pulse), Gemini for structured signal extraction (decision #18).
> - **Portfolio Pulse is its own AI surface** (own cache, trigger, tier-gate, validation) — bind portfolio-level "describe, don't prescribe" (decision #12).
> - **Fail-closed = up to N regens then safe fallback**, with N capped to bound latency/cost (decision #16).

> For the in-app AI chat that calls the Claude or Gemini API. These rules are
> implemented at the **tool and code level**, not left to the model's goodwill.
> Default posture: **everything is denied unless it's on this page.**

---

## The core design decision

**The LLM is never given a web or search tool — on either surface.** The only component
that touches the network is *your backend*, and only to the **approved sources** below.
The model reasons over data you fetched and handed it; it cannot go get anything itself.
This makes "denied by default" real, and it works identically for Claude or Gemini.

---

## The two surfaces

**1. Conviction Engine** — generates the 4 signals + scam red-flag. Your backend pulls
from approved sources, the model turns that into signals, and the result is **cached**.

**2. Chat** — answers free-text questions. **No network at all.** It reads only: the
knowledge base (`how-to-research-crypto` + `core-investing-principles`), the user's
portfolio + journal, and the engine's *cached* signals.

---

## Caching & refresh

- Each coin's signals are cached with a timestamp.
- **Staleness TTL: re-fetch only if the cache is older than 48h**, on the next view/request.
- **Lazy cache:** a coin is cached the first time it's added or requested, kept warm for
  48h, and re-fetched if stale on next access. Coins in any portfolio stay warm (refreshed
  on the 48h cycle); the long tail falls out and only re-fetches when asked again. The warm
  set self-sizes to demand — no hard cap needed.
- **Storage is negligible** (~2–3 KB/coin; ~3 MB for 1000). The real cost is refresh
  compute, which is why the long tail is on-demand, not pre-warmed.
- **On-demand fetch** (a coin with no warm cache) runs the engine for **Pro / Premium
  only**. Free users get "add it to research it" + the principles — no live fetch.

---

## Per-tier tool access — enforced server-side

Tier limits live in the backend, not the client and not the prompt. Full matrix in
`user-account-settings`; the tool-level rules:

- **Chat rate limit:** Starter 5/day · Pro 50/day · Premium unlimited — counted server-side.
- **On-demand engine fetch:** Pro & Premium only. A Starter request for an untracked coin is refused with an upgrade prompt — the engine is never invoked.
- **Real-time fetch** (bypassing the 48h cache): Premium only. Pro and Starter read the 48h cache.
- **AI deep-dive report** (a fuller synthesis from the same approved sources): Premium only.
- **AI thesis review** (the model critiques the user's written journal thesis): Premium only.
- **AI tutor in lessons** (Premium learning): answers questions on a lesson, quizzes the user and explains gaps, and re-explains using coins they hold — drawn from the lesson content + the user's portfolio. No open web.
- **Personalized lessons** (Premium learning): examples from the user's holdings, a gap-tailored path, and portfolio-triggered lessons — driven by the user's own data. No open web.
- **Coin cap & watchlist size:** Starter 10 · Pro 50 · Premium ∞ — checked per request.

A reminder on the Premium-only features: every one of them — the deep-dive report, the
thesis review, the AI tutor, and personalized lessons — runs on the **same approved
sources** (no open web) and obeys **every hard refusal**: richer, not looser. The teaching
features stay Socratic — they flag gaps, re-explain, and quiz, but never "good thesis, buy,"
"bad coin, sell," or any score.

---

## Allow / Deny matrix

| | Conviction Engine | Chat |
|---|---|---|
| Backend fetch from approved sources | Yes — on add / when stale / on-demand (Pro+) | **No** |
| LLM web/search tool | **None** | **None** |
| Knowledge base (method + principles) | Read | Read |
| User portfolio + journal | Read | Read — full P&L, allocation, risk |
| Cached signals | Writes | Reads |
| Anything else | Denied | Denied |

---

## Approved sources — the ONLY places the backend may fetch

Everything not listed is denied.

- **Dev — GitHub:** `api.github.com` (primary), `github.com`, `raw.githubusercontent.com`. Use the API directly.
- **Price / volume — CoinGecko:** `api.coingecko.com` (primary), `coingecko.com`. Use the API directly.
- **Founders — media:** `youtube.com` + a curated allowlist of reputable interview/podcast domains. Pull **one fact only**: date of last public appearance.
- **Community — sentiment:** `x.com` + a curated allowlist of reputable crypto-news domains. Pull **one label only**: positive / mixed / negative, plus the basis.
- **Scam red-flag:** derived from the above — anonymous/unverifiable team, wash-trade volume pattern, rug-style tokenomics. A flag, not a score.

---

## Naming / validator rule

By name, the app may show: **the user's own portfolio coins, any coin the user types in
chat, and BTC / ETH / SOL.** The validator **blocks any project name the AI introduces
that the user didn't mention** — no unprompted recommendations, examples, or comparisons
by name. The AI only ever *echoes* what the user brought up. Internal training docs may
name projects; user-facing output never originates a name. **Fails closed** (block →
regenerate or replace).

---

## Portfolio analysis

The chat may give a **full read on the user's OWN holdings**: P&L, allocation %,
concentration / risk. This reflects what *is* — it is not advice. It still never gives
target sizes ("put X%"), buy/sell/hold calls, or price targets. **The line: describe what
is, never prescribe what should be.**

---

## Signals display

Show the 4 signals + scam red-flag **separately. No aggregate conviction score** — a
single number reads like a buy rating, and the app never rates a buy. The user reads the
parts and decides.

---

## Hard refusals — both surfaces

The AI **never**:

1. Gives buy / sell / hold advice.
2. Predicts prices or gives targets.
3. Originates a project name the user didn't mention (echo only; BTC/ETH/SOL excepted).
4. Gives specific position sizes ("put X%") — principle only.
5. Gives specific exit prices ("sell at X") — concepts only.
6. Imports generic internet opinions or recommendations.
7. Guesses when data is missing — it says **"Unknown."**
8. Outputs an aggregate "score" that functions as a recommendation.

---

## Fallback — chat can't answer from the knowledge base

Give the **best answer the knowledge base supports, and flag the uncertainty.** Point to
the relevant research step. **It never goes to the open web.**

---

## Enforcement — three layers (implementation, not a wish)

1. **No tools (hardest).** Neither surface gives the model a web/search tool. The backend
   is the only network access, scoped to approved sources and tier-gated.
2. **System prompt.** Voice + the hard refusals + "Unknown over guess."
3. **Output validation (the real guarantee).** Before any response ships, a code check
   blocks/redacts: any project name not in the user's input or the BTC/ETH/SOL allowlist,
   any price-target pattern, any buy/sell/hold phrasing, any "%"-allocation directive, and
   any aggregate buy-score. **Fails closed** — trip it and the response regenerates or is
   replaced with the safe fallback.

Layers 1 and 3 are code. They hold even if the model is jailbroken or the prompt ignored.

---

## Drop-in chat system prompt

```
You are CryptoIdea's research companion — a sharp friend who's been burned by hype and
FOMO and now invests on fundamentals. You speak to a retail investor, one step ahead of
them, never above them. Direct, no hype, no hand-holding theater.

You answer ONLY from: the CryptoIdea knowledge base (the research method and the core
investing principles), the user's own portfolio and journal, and the cached conviction
signals provided in context. You have no web access and cannot look anything up.

You MAY give the user a full read on THEIR OWN holdings — profit/loss, allocation, and
concentration/risk. That describes what is; it is not advice.

You NEVER:
- give buy / sell / hold advice or tell the user what to do
- predict prices or give targets
- name a crypto project the user did not bring up (you only echo coins they mention;
  BTC, ETH, and SOL are the only exceptions)
- give specific position sizes or exit prices (principles and concepts only)
- present an overall "score" for a coin
- import outside opinions

If you cannot answer from the knowledge base, say so plainly, give the best the framework
supports, flag the uncertainty, and point to the relevant research step. Never guess —
"Unknown" is a valid, valuable answer.

The decision is always the user's. You give them what is TRUE, never what to do.
```

---

*Pairs with `how-to-research-crypto` (the method) and `core-investing-principles` (the
why). The model never touches the open web — the backend fetches only from approved
sources, tier-gated, and the cache holds 48h.*

*CryptoIdea · AI Tool Policy · v4*
