# Crypto Idea — Pricing Plan

**Canonical pricing decisions for Crypto Idea.** Last updated 2026-06-23.
This doc is the source of truth for *what we charge and why*. The user-facing
benefits page is [USER-BENEFITS.md](USER-BENEFITS.md). The product-direction
record is [PRODUCT-DECISIONS.md](PRODUCT-DECISIONS.md) (#19/#21).

Two readers: (1) **future me** — to remember *why* a number is what it is; (2)
**Claude / a teammate** — so they don't silently undo a margin-critical choice.

---

## 1. The plan at a glance

| Tier | Monthly | Annual (2 months free) | Annual ≈ /mo | Portfolios | Coins/portfolio | Tx/coin | Live AI |
|---|---|---|---|---|---|---|---|
| **Starter** | $0 | $0 | — | 1 | 10 | 50 | offline only |
| **Pro** | **$9.99** | **$99.99** (−17%) | $8.33 | 3 | 50 | 2,000 | ~$4/mo budget (~13/day) |
| **Premium** | **$49.99** | **$499.99** (−17%) | $41.67 | 15 | 1,000 (hard clamp) | 5,000 | ~$25/mo budget (~80/day) |

The "Live AI" column is shown to users as **"~N analyses/day"**. Internally we
enforce a **monthly dollar-cost ceiling** (`aiMonthlyCents` in `config/app.plans`)
because tokens — not call count — drive AI cost. See §4.

Resource limits (portfolios / coins / tx) are enforced server-side by
[`firestore.rules`](firestore.rules) reading `config/app.plans` via `get()`,
with built-in defaults as a fallback. **Limits stay editable from the admin
panel** ([Plans & Pricing](src/components/admin-dashboard.jsx)) — they are not
hard-coded into the app.

---

## 2. Why these numbers (decisions log)

### 2.1 Premium stays at $49.99/mo

Anchored against the segment we compete in:

| Comparable | Top tier | Notes |
|---|---|---|
| Nansen Pro | **$49/mo** (annual) | On-chain analytics — same price band |
| Glassnode Advanced | **$49/mo** (annual) | Premium metrics — same price band |
| Santiment Pro | **$49/mo** | Trader-grade research — same price band |
| CoinStats Premium | $13.99/mo | Casual tracker — below our band |
| CoinStats Degen | ~$9.90/mo equiv | Power-user upsell |
| Messari Enterprise | quote-based | Above us (institutional) |
| Token Metrics Premium | $199.99/mo | Premium pricing exists above us |

Decision: **$49.99/mo is the right anchor for a research/conviction tool that
ships AI on top of a portfolio tracker.** Users at $49 expect more than alerts;
that's exactly what conviction signals + Pulse + Ask deliver.

### 2.2 Pro at $9.99/mo

Sits between $0 free and $49.99 premium. Captures the user who can't justify
$50 yet but wants the AI layer. The 5× gap to Premium is wide on purpose — we
accept the conversion leak because adding a mid-tier (e.g. $24.99) triples the
config/rules/landing/admin maintenance burden for marginal lift. KISS wins.

Re-evaluate this only if Pro becomes our top-paid tier (a sign Premium isn't
landing). Add a mid-tier then, not before.

### 2.3 Annual at "2 months free" (−17%)

Industry standard for SaaS where retention is the lever, not aggressive
discounting. Examples: **Token Metrics literally markets "2 months free"**;
TradingView annual saves up to 17%; CoinMarketCap API ~17%.

Aggressive options we considered and rejected:
- −20% (gives up another $10–20 per Premium signup for no obvious lift)
- −33% (matches old landing copy but burns margin; competitor Delta does 41%
  with a much lower base price — different game)
- No annual at all (leaves recurring-revenue / churn-reduction on the table)

The annual price is **stored**, not computed (`config/app.plans.<tier>.priceYear`).
We never want a landing-side `price × 8/12` formula to become the source of
truth again — it's a foot-gun the moment we ever change the discount.

### 2.4 Free tier stays offline-only

Decision: **Starter stays fully offline.** No live AI. Reasons:
- Variable AI cost on a free tier scales linearly with abuse, not value.
- The data-driven offline summaries already give Starter users a real "aha"
  (Portfolio Pulse renders without the proxy via `ai-client.js`'s fallback).
- App Check + per-uid rate limiter aren't built yet (NEXT-STEPS B-wave). Until
  they are, even "10 free analyses/month" is an open abuse surface.

Reconsider once the rate-limiter ships. Then a small monthly taste (e.g. 5–10
analyses) might be a sensible conversion lever — but it stays optional and
data-driven, not the default.

### 2.5 Premium "unlimited" coins is hard-clamped at 1,000

Per **decision #20**: "unlimited" in copy = `min(config, 1000)` in
`firestore.rules`. The plan can say "unlimited" because:
- Real human portfolios don't exceed 1,000 distinct coins (95th-percentile
  Premium user has <100).
- Each *novel* coin = a fresh conviction-cache miss → fresh AI spend.
- A 1,000-coin clamp also caps the worst-case write-amplification on the
  Firestore counter and protects the AI budget from being trivially drained.

This is invisible in normal use. The clamp **never** appears in marketing copy.

---

## 3. Margin math (the actual reason these numbers are safe)

### 3.1 Cost stack

| Cost | Type | Driver | Estimate |
|---|---|---|---|
| **CoinGecko Lite** | fixed | upstream cap on hot universe | ~$129/mo |
| **Firebase Blaze** | mostly fixed | Functions invocations, Firestore reads, CDN egress | ~$30/mo at modest scale |
| **Anthropic Claude API** | variable | live AI (conviction, Pulse, Ask) | per call (see §3.2) |
| **PayPal fees** | variable | 2.9% + $0.30 per charge | ~$0.59 on Pro, ~$1.75 on Premium |

Total **fixed monthly infra** ≈ **$160/mo** (flat regardless of user count —
the CoinGecko proxy is shared-cached; see [README.md "CoinGecko proxy"](README.md)).

### 3.2 AI model mix (the "mixed" strategy)

Decision: **Haiku for per-user surfaces, Sonnet for the shared cache.**

| Surface | Model | Why | ≈ Cost/call |
|---|---|---|---|
| **Pulse / Ask** (per-user, high volume) | Claude **Haiku 4.5** | Cheap; user-perceived quality is fine for a portfolio-shaped chat | ~$0.01 |
| **Conviction cache** (per-coin, shared) | Claude **Sonnet 4.6** | Generated ONCE per coin, amortized across ALL users — quality matters here | ~$0.09 once per coin |

Critical insight: the conviction cache is the *only* place we spend on the more
expensive model, and it's **amortized to a near-fixed cost** because it's
shared. ~3,000 coins × $0.09 = ~$270 over the lifetime of the cache (refreshed
on a TTL, not per request). Per-user cost is bounded by Haiku.

### 3.3 Margins at the proposed plan

Net = price − payment fee − per-user AI. Assume each analysis ≈ $0.01.

| Scenario | Pro $9.99 (net $9.40) | Premium $49.99 (net $48.24) |
|---|---|---|
| Light (~20% of cap) | ~$0.80 AI → **+$8.60 (86%)** | ~$5 AI → **+$43 (86%)** |
| Moderate (~50% of cap) | ~$2 AI → **+$7.40 (74%)** | ~$12.50 AI → **+$35.74 (71%)** |
| **Worst case (at cap)** | **~$4 AI → +$5.40 (54%)** | **~$25 AI → +$23.24 (46%)** |

The **monthly $-cost ceiling** is what guarantees this. A call-count cap can't:
a single user with bigger prompts blows the budget. A $-cost ceiling can't be
gamed — once it's spent, the user gets graceful degradation to the offline
summaries until the next month.

### 3.4 Break-even on fixed infra

At worst-case (at-ceiling) per-user contribution: **~30 Pro subscribers** or
**~7 Premium subscribers** covers all fixed infra. A realistic mix of
**15–20 paying users** clears break-even with margin to spare.

---

## 4. Budget unit: monthly dollar-cost ceiling

### 4.1 The problem

The previous spec (PRODUCT-DECISIONS #21, NEXT-STEPS B2) defined the live-AI
budget as a **daily call count**: Starter 0, Pro 50, Premium 300. This was
fine as a placeholder but is **not margin-safe**:

- A "call" varies in cost depending on prompt size, output size, and which
  model handles it. The same user can spend $0.01 or $0.50 on a single call.
- Users adapt: if calls are capped, they pack more into each call.
- At 300 calls/day on Sonnet ($0.04/call), a Premium user costs ~$360/mo on a
  $49.99 plan → margin **−630%**. The cap didn't protect anything.

### 4.2 The fix

Each plan now carries an `aiMonthlyCents` field (cents/month). The enforcement
hook (when `researchAsk` ships in B2) reads it and decrements the per-uid
counter by the *actual* token cost of each call, computed from the response
`usage` block.

**Defaults:**
| Tier | `aiMonthlyCents` | ≈ Analyses/month | Shown to user as |
|---|---|---|---|
| free | 0 | 0 | "Offline only" |
| pro | **400** ($4.00) | ~400 (on Haiku) | "~13/day" |
| premium | **2500** ($25.00) | ~2,500 (on Haiku) | "~80/day" |

### 4.3 What users see vs. what we enforce

We **never** show users "$4.00 of AI budget per month" — it's a tax-receipt
framing that punishes engagement. Users see **"~80 analyses/day on Premium"**.
This is honest (it's the budget at the average call cost) and motivating.

When a user hits the ceiling, we degrade gracefully:
- Live AI surfaces switch to offline data-driven summaries (the same fallback
  the free tier sees today via `ai-client.js`).
- A banner says: *"You've used this month's live AI. It resets on the 1st.
  Want more headroom? Upgrade →"*

### 4.4 Implementation status

- `aiMonthlyCents` is now a **first-class field** on `config/app.plans` (this
  PR) and the admin can edit it.
- **Enforcement is not yet wired** — the AI proxy (`ai-client.js`) is still in
  offline-fallback mode. When NEXT-STEPS B2 (`researchAsk` callable) ships,
  the rate limiter must read `aiMonthlyCents` and meter on actual token cost.
- Until B2, all users get offline summaries. The field is set so it's ready.

---

## 5. Payment fees in `getStats`

The admin Overview now shows **net revenue** (gross − fees), not gross.
PayPal's pricing is `2.9% + $0.30 per charge`. The `getStats` function:

```
gross = proUsers × proPrice + premiumUsers × premiumPrice
fees  = gross × 0.029 + (proUsers + premiumUsers) × 0.30
net   = max(0, gross − fees)
```

**Caveat — monthly approximation.** `getStats` does not yet read per-user
billing cycle (`subscription.billing` exists on `users/{uid}` but the PayPal
webhook doesn't persist it). So annual subscribers are counted as one charge
per month, which overstates their fee count by 11/12. The net number errs
**conservative** (slightly understates real net). When the PayPal webhook is
upgraded to persist `subscription.billing`, switch `getStats` to per-cycle fee
math. Tracked under "Open items" below.

---

## 6. What competitors gate behind premium (for roadmap)

From the competitor research (see [PRICING-RESEARCH.md](docs/planning/PRICING-RESEARCH.md)
once authored — currently in commit history of this change):

| Feature gate | Who does it | Our position |
|---|---|---|
| **AI research / copilot** | CoinStats Premium, Token Metrics Premium | ✅ Premium gets Pulse + Ask at full budget |
| **Custom dashboards / historical analytics** | Rotki Premium, Glassnode Pro | Future — backlog |
| **Tax / compliance exports** | CoinStats Premium, Rotki Premium | Backlog (P0 post-launch) |
| **VIP / faster support** | CoinStats Degen | ✅ Premium includes priority support |
| **API access** | Santiment Max | Not on roadmap (we are not a data API) |
| **Higher capacity** | every competitor | ✅ 15 portfolios / 1,000 coins / 5,000 tx |

The wedge for our Premium isn't capacity (everyone offers more capacity).
It's the **integration of journal + AI conviction + research**, gated by AI
budget. That's the moat.

---

## 7. Open items (do these next)

1. **Wire `researchAsk` (NEXT-STEPS B2)** with `aiMonthlyCents` enforcement.
   Per-uid Firestore counter doc, owner-only read for the badge, server-only
   write. Decrements by actual token cost, not call count.
2. **Persist `subscription.billing` in the PayPal webhook** so `getStats` can
   compute per-cycle fees accurately (and so the user's Account page can show
   "Renews 2026-08-15 · annual" instead of guessing).
3. **App Check (#20)** before launching any free-tier live-AI taste.
4. **Stripe as an alternate processor** — PayPal fees (2.9% + $0.30) are
   competitive but Stripe's per-charge fee is the same and conversion is
   higher in many markets. Track as a post-launch experiment.

---

## 8. Reference

- Code: [`functions/index.js`](functions/index.js) `DEFAULT_PLANS`, `mergePlans`, `getStats`
- Admin UI: [`src/components/admin-dashboard.jsx`](src/components/admin-dashboard.jsx) (Plans & Pricing card + Revenue card)
- Hook state: [`src/hooks/useAdminDashboard.js`](src/hooks/useAdminDashboard.js) `DEFAULT_PLANS`
- Rules enforcement: [`firestore.rules`](firestore.rules) `configuredLimit`
- Landing: [`index.html`](index.html) `.plan-price` cards + `setBilling()` + `/api/config` fetch
- In-app billing screen: [`src/components/Login.jsx`](src/components/Login.jsx) — reads `site.plans` via context
- Decisions log: [`PRODUCT-DECISIONS.md`](PRODUCT-DECISIONS.md) #19 (tiers), #20 (anti-abuse), #21 (AI cost control)
- User-facing benefits: [`USER-BENEFITS.md`](USER-BENEFITS.md)
- Billing mechanism (PayPal lifecycle, webhook, secrets, go-live): [`BILLING.md`](BILLING.md)
