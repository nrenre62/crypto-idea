# CryptoIdea — Product Decisions (canonical)

> **Single source of truth** for the product/strategy decisions made in the
> 2026-06-22 founder interview. Where any planning doc disagrees with this file,
> **this file wins** — the affected docs have been reconciled (see
> [§7 Corrections](#7-corrections-applied-to-planning-docs)).
>
> Scope: this records *what we decided and why*. The **how-we-build** rules stay in
> [`AGILE.md`](AGILE.md); the **current code reality** stays in [`CLAUDE.md`](CLAUDE.md)
> and [`CODEBASE-MAP.md`](CODEBASE-MAP.md); the **backlog** stays in
> [`NEXT-STEPS.md`](NEXT-STEPS.md). Planning docs live in [`docs/planning/`](docs/planning/).
>
> *Date: 2026-06-22 · 28 decisions across 7 interview rounds.*

---

## 1. The product (post-pivot, in one paragraph)

CryptoIdea is a **conviction tool for retail crypto investors burned by hype/FOMO** —
not a trading platform, signal service, or another price tracker. The **gotcha**:
*"Write why you bought it. See if your thesis still holds."* It is **one integrated
5-tab product** — Portfolio · Research · Journal · Learn · Search — where the Journal
(your thesis) is tested against AI **conviction signals** (Dev · Founders · Team ·
Community), and Learn teaches the framework behind them. Hard rule across every
surface: **research, never advice** — no buy/sell/hold, no price targets, no aggregate
score, no project name the AI introduced itself.

**Value prop:** *"CryptoIdea gives retail crypto investors the research edge to invest
in fundamentals — not FOMO."*

---

## 2. How to read the status column

| Tag | Meaning |
|---|---|
| ✅ **Done** | Already true in the codebase today — decision just confirms it |
| 🔧 **Change** | Modifies something already built (config, rules, copy) |
| 🆕 **New** | Net-new build |

---

## 3. Strategy & go-to-market

| # | Decision | Choice | Status | Build implication |
|---|---|---|---|---|
| 1 | Product scope / wedge | **Ship all 5 tabs as one integrated product** — the integration is the moat | ✅/🆕 | Tabs exist; Research + Learn need wiring (see §6) |
| 2 | Platform | **Web PWA now, native later** · fully responsive **mobile + desktop** | ✅/🆕 | Stay on Vite/React/Firebase; responsive is a hard UI requirement |
| 3 | Acquisition funnel | **Research-led** — @CryptoIdea reports on Substack/X feed signups | — | Marketing motion, not app code; see naming wall (#14) |
| 4 | Acquisition hook | **Anti-FOMO / regret** ("still holding a coin that quietly died?") | 🔧 | Landing/onboarding copy leads anti-hype, not FOMO |
| 5 | Payments | **PayPal** (already partly wired: signature-verified webhook + callables) | ✅ | No Stripe/RevenueCat unless a native pivot later |

---

## 4. The conviction engine (the marketed differentiator — today offline)

> Today: `src/features/research/api/ai-client.js` `askClaude()` **throws** → the tab
> renders built-in data-driven fallbacks; conviction pills are design-only "coming
> soon". The keystone is the **secure AI proxy** (backlog N-3).

| # | Decision | Choice | Status | Build implication |
|---|---|---|---|---|
| 6 | Engine architecture | **Backend fetches from approved sources; the LLM reasons only** (AI policy v4) — *not* an LLM with a web tool | 🆕 | Proxy fetches GitHub/CoinGecko + allowlisted media; hands data to the model |
| 7 | Founders/Community signals | **Derive from the news-domain allowlist** (no direct X/YouTube scraping) | 🆕 | Cheaper/legal; less fresh — acceptable |
| 8 | Accuracy gate | **Multi-source cross-check** before a signal shows | 🆕 | Each axis must corroborate across ≥2 sources (prevents the CryptoMiso-was-wrong failure) |
| 9 | Signal rubric | **4 states — 🟢 healthy / 🟡 mixed / 🔴 problem / ⬛ insufficient-data** | 🔧 | Reframes PRODUCT-SPEC (where ⬛ = "dead"): "dead/abandoned" now grades 🔴; ⬛ means *no data* |
| 10 | Coverage | **On-demand + shared 48h cache**, any held coin; thin coverage honestly shows ⬛ | 🆕 | Reuses the existing flat-cost `cache/universe` pattern; first viewer warms it |
| 11 | Freshness | **Stamp every signal "as of DATE" + auto-expire dated catalysts** | 🆕 | Cheap honesty layer; never show a past unlock as "upcoming" |
| 12 | Portfolio Pulse | **Its own AI surface** (own cache, trigger, tier-gate, validation) | 🆕 | Document it in `ai-tool-policy`; bind portfolio-level "describe, don't prescribe" |

---

## 5. AI safety, legal & privacy

| # | Decision | Choice | Status | Build implication |
|---|---|---|---|---|
| 13 | No advice (in-app) | **Zero** price targets / probability weights / model portfolio in-app; **no aggregate score** | ✅ | Targets/V7 live only in the external reports; app shows separate signals + your thesis |
| 14 | Naming wall | **Hard wall** — in-app AI fully anonymized; published named reports are a **separate, founder-reviewed** pipeline | 🆕 | Two content pipelines; nothing named flows into the app |
| 15 | Output validator | **Regex prefilter → LLM judge**, fail-closed | 🆕 | Cheap path for clean text, escalate suspect spans; blocks names/targets/advice |
| 16 | Fail-closed UX | **Up to N regens, then safe fallback** | 🆕 | **Cap N** (e.g. 2–3) to bound chat latency/cost |
| 17 | Privacy | **Send raw to the LLM under no-train terms** + clear user disclosure | 🆕 | **Hard requirement:** use no-training API tiers (Anthropic default; Gemini *paid* only) + privacy-policy line |
| 18 | LLM split | **Claude for prose** (chat, Pulse) · **Gemini for structured extraction** (signals) | 🆕 | Two integrations behind the proxy; best cost/quality split |

---

## 6. Monetization, data & content

| # | Decision | Choice | Status | Build implication |
|---|---|---|---|---|
| 19 | Tiers | **Starter** 1 portfolio/10 coins · **Pro** 3 portfolios/50 coins each · **Premium** 15 portfolios/unlimited coins · rename Free→**Starter** | 🔧 | `config/app.plans` + `firestore.rules` + admin defaults + plan labels |
| 20 | Anti-abuse | "Unlimited" = **a high hard ceiling + rate-limited add-coin endpoint + App Check** — never bot-inflatable to infinity | 🆕 | Protects data *and* AI cost (each novel coin = a fresh engine run) |
| 21 | AI cost control | **Cache/template the tutor** — pre-generate lesson explanations, personalize only the coin | 🆕 | Keeps the flat-cost model; "unlimited" Premium needs finite ceilings |
| 22 | Journal storage | **Firestore** (already on the coin doc: `journal{thesis,changeMyMind,status,priceAtAdd,createdAt}`, `validJournal` rule) | ✅ | Required for AI read + cross-device sync — **already done** |
| 23 | Learn at launch | **Full library + gamification + AI tutor** (tutor templated per #21) | 🆕 | Largest content lift: ~9 modules / ~50 lessons + XP/badges/streaks + quiz + wiring |
| 24 | Learn voice | **No names** — principles taught without attribution | ✅/🔧 | `learn-tab` already no-names; **fix the landing/spec copy that names Buffett/Munger/Marks** |
| 25 | Lesson completion | **Quiz-gated** | 🆕 | Real assessment per lesson; shapes the Learn data model |
| 26 | Taxonomy | **Keep both** the 5-step funnel and the 4 signals, with an **explicit in-app bridge** | 🆕 | "These signals cover steps 1–2; you apply 3–5" wherever signals appear |
| 27 | Manual funnel steps | dilution/unlocks · volume/wash-trading · real-yield stay **permanently manual** | 🆕 | Journal must add fields to capture findings; Learn must teach them rigorously |
| 28 | DCA calculator | **Landing-page only** (intentional; removed from the app) | ✅ | Confirmed — no app DCA feature |

---

## Captured hard requirements (carry into every relevant story)

- **Responsive mobile + desktop** for the whole app (PWA path).
- **Anti-abuse on "unlimited"**: hard coin ceiling + rate-limited add-coin endpoint + App Check.
- **No-training LLM tiers** + privacy-policy disclosure (because chat sends the journal raw).
- **Regen cap N** with a safe fallback (bound chat latency/cost).
- **Every signal carries its fetch date**; dated catalysts auto-expire.
- **Hard naming wall** between the anonymized app and the named published reports.
- **No advice anywhere in-app**: no targets, no model portfolio, no aggregate score.

---

## 7. Corrections applied to planning docs

These were edited in [`docs/planning/`](docs/planning/) to match the decisions above
(the original zipped versions in `Design app/` / `system design.zip` are the
pre-reconciliation archive):

| Doc | Was | Now |
|---|---|---|
| `PRODUCT-SPEC.md` | Tiers: Free 1/10, Pro 10/200, Premium 50/500 | Starter 1/10 · Pro 3/50-each · Premium 15/unlimited(-capped) |
| `PRODUCT-SPEC.md` | Landing copy names "Buffett, Munger, Marks" | Names removed (no-names voice, #24) |
| `PRODUCT-SPEC.md` | "Research tab: AI web-search per coin" | Backend-fetch / AI-reason (#6) |
| `PRODUCT-SPEC.md` | Signal ⬛ = "Dead/Departed/Gone" | ⬛ = insufficient-data; dead → 🔴 (#9) |
| `PRODUCT-SPEC.md` | Journal in localStorage (Phase 2) | Firestore on the coin doc (#22, already shipped) |
| `ai-tool-policy.md` | Premium "unlimited" coins/chat | + anti-abuse ceiling language (#20); Pulse as its own surface (#12); LLM split (#18) |
| `user-account-settings.md` | 10/50/Unlimited coins, no portfolios concept | New tier portfolios/coins (#19) + ceiling (#20) |

---

## 8. Still open (small decisions, settle when building)

- Learn-progress storage — **recommend Firestore** (mirror the journal: AI tutor + cross-device + cheat-resistant).
- The exact **anti-abuse ceiling number** + add-coin rate-limit budget.
- The **regen cap N**.
- Which **news domains** are on the Founders/Community allowlist (curation work).
- **CoinGecko plan tier** under on-demand engine load (cost modeling; today ~44k calls/mo on the price proxy alone).
- Whether the ~50 lesson **quizzes are hand-authored or AI-generated**.
- Exact **Claude/Gemini model ids + budgets** (see the `claude-api` skill for current model ids).

---

## 9. Build sequence (recommended)

You chose to ship the full 5-tab product. WIP=1 still means an order. The lowest-risk
path that protects AI spend until it's proven:

1. **Tier reconfig** (#19/#20) — `config/app.plans` + `firestore.rules` + labels + anti-abuse, test-guarded. *Small, unblocks pricing copy.*
2. **Secure AI proxy** (backlog N-3) — callable Cloud Function holding the Anthropic/Gemini keys, per-user rate limit + App Check, no-train tiers. *The keystone everything AI depends on.*
3. **Conviction engine** (#6–#11) behind the proxy — backend fetch → cross-check → 4-state cached signals with as-of dates. Light the "coming soon" pills.
4. **Output validator + fail-closed** (#15/#16) — must land *with* the engine/chat, not after.
5. **Pulse + Ask** (#12) wired to live AI.
6. **Learn** (#23–#27) — content + gamification + quiz + templated tutor. *Largest, most parallelizable; can run alongside.*
7. **Copy + funnel** (#3/#4/#24) — anti-FOMO landing, drop named investors, research-led @CryptoIdea.

> **Cofounder note (recorded once):** shipping all of the above at once is a large
> first release for a solo builder and consciously overrides KISS/Agile/PMF. Consider
> sequencing the **private beta** by the order above even if the public v1 is the whole
> thing — it de-risks AI cost/accuracy before you spend on it. Decision stands; noted, not re-litigated.

---

*Generated from the 2026-06-22 founder interview. Update this file when a decision changes — don't overwrite history silently (Kaizen).*
