# Crypto Idea — Pricing Plan

**Canonical pricing decisions for Crypto Idea.** Last updated 2026-08-10.
This doc is the source of truth for *what we charge and why* — our tiers, prices,
rationale, per-tier benefits, and margins. **Competitor pricing research lives separately
in [PRICING-RESEARCH.md](../planning/PRICING-RESEARCH.md)** so this doc stays focused on our
own numbers. The user-facing benefits page is [USER-BENEFITS.md](../product/USER-BENEFITS.md);
the product-direction record is [PRODUCT-DECISIONS.md](PRODUCT-DECISIONS.md) (#19/#21).

Two readers: (1) **future me** — to remember *why* a number is what it is; (2)
**Claude / a teammate** — so they don't silently undo a margin-critical choice.

---

## 1. The plan at a glance

| Tier | Monthly | Annual (2 months free) | Annual ≈ /mo | Portfolios | Coins/portfolio | Tx/coin | Live AI |
|---|---|---|---|---|---|---|---|
| **Starter** | $0 | $0 | — | 3 | 30 | 300 | offline only |
| **Pro** | **$9.99** | **$99.99** (−17%) | $8.33 | 6 | 100 | 1,000 | ~$4/mo budget (~13/day) |
| **Premium** | **$49.99** | **$499.99** (−17%) | $41.67 | 15 | 200 | 2,000 | ~$25/mo budget (~80/day) |

The "Live AI" column is shown to users as **"~N analyses/day"**. Internally we
enforce a **monthly dollar-cost ceiling** (`aiMonthlyCents` in `config/app.plans`)
because tokens — not call count — drive AI cost. See §4.

Resource limits (portfolios / coins / tx) are enforced server-side by
[`firestore.rules`](../../firestore.rules) reading `config/app.plans` via `get()`,
with built-in defaults as a fallback. **Limits stay editable from the admin
panel** ([Plans & Pricing](../../src/components/admin-dashboard.jsx)) — they are not
hard-coded into the app.

---

## 2. Why these numbers (decisions log)

### 2.1 Premium stays at $49.99/mo

Decision: **$49.99/mo is the right anchor for a research/conviction tool that
ships AI on top of a portfolio tracker.** It sits squarely in the ~$49/mo band
that serious crypto-research tools charge, so a user paying $49 expects more than
alerts — that's exactly what conviction signals + Pulse + Ask deliver. There's
clear headroom above us in the market, so $49.99 is an anchor, not a ceiling.

The competitor pricing this is anchored against — and the confirmation that the
~$49 band still holds — is in
[PRICING-RESEARCH.md](../planning/PRICING-RESEARCH.md).

### 2.2 Pro at $9.99/mo

Sits between $0 free and $49.99 premium. Captures the user who can't justify
$50 yet but wants the AI layer. The 5× gap to Premium is wide on purpose — we
accept the conversion leak because adding a mid-tier (e.g. $24.99) triples the
config/rules/landing/admin maintenance burden for marginal lift. KISS wins.

Re-evaluate this only if Pro becomes our top-paid tier (a sign Premium isn't
landing). Add a mid-tier then, not before.

### 2.3 Annual at "2 months free" (−17%)

Industry standard for SaaS where retention is the lever, not aggressive
discounting (how competitors discount their annual plans — several use the same
"2 months free" framing — is in
[PRICING-RESEARCH.md](../planning/PRICING-RESEARCH.md)).

Aggressive options we considered and rejected:
- −20% (gives up another $10–20 per Premium signup for no obvious lift)
- −33% (matches old landing copy but burns margin — deep annual discounts suit a
  much lower base price, a different game than ours)
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

### 2.5 Premium coins: 200 enforced default, 1,000 hard clamp

Per **decision #20**, `firestore.rules` clamps any configured coin limit to
`min(config, 1000)` — 1,000 is the absolute ceiling no admin edit can raise.
As of **PLAN-LIMITS-MAX (#12, 2026-08)** the *enforced* Premium default is
**200 coins/portfolio** (well below that clamp), which still gives a Premium
user **3,000 coins across 15 portfolios** — far more than any real human
portfolio needs. Premium is no longer marketed as "unlimited" coins; it now
advertises the honest 200/portfolio figure. The 1,000 hard clamp stays as the
anti-abuse backstop even though the shipped default now sits under it:
- Real human portfolios don't exceed 1,000 distinct coins (95th-percentile
  Premium user has <100).
- Each *novel* coin = a fresh conviction-cache miss → fresh AI spend.
- A 1,000-coin clamp also caps the worst-case write-amplification on the
  Firestore counter and protects the AI budget from being trivially drained.

The clamp is invisible in normal use and **never** appears in marketing copy.

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
the CoinGecko proxy is shared-cached; see [README.md "CoinGecko proxy"](../../README.md)).

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

- `aiMonthlyCents` is a **first-class per-tier field** on `config/app.plans`
  and the admin can edit it.
- **Enforcement is not yet wired** — the AI proxy (`ai-client.js`) is still in
  offline-fallback mode. When NEXT-STEPS B2/PR-E2 (`researchAsk` callable) ships,
  the metering hook reads the budget and decrements on actual token cost.
- Until then, all users get offline summaries. The field is set so it's ready.

**⚠️ Two different budgets — don't conflate them.** Plan B **PR-E1**
(2026-08-14) built an **app-wide single monthly $-cap** —
`config/app.ai.monthlyCapCents` (default **5000** = **$50/mo**), admin-editable
from the Settings AI card and metered by the pure `functions/ai-cost.js` ledger
on a server-only `aiBudget/{YYYY-MM}` doc (round-up cents, UTC month key,
`>=` wall). It is a **global spend pool for the whole app**, founder-locked as
the launch cost ceiling, distinct from the **per-tier per-uid** `plans.*.aiMonthlyCents`
described above. The per-tier fields **remain unenforced** (founder decision:
ship the single global cap first); PR-E2 meters live spend against
`monthlyCapCents`. Both are INERT until PR-E2 wires the `researchAsk` callable.
The proxy's model economics are founder-locked in `functions/ai-cost.js`:
**generation = Sonnet 5** ($3/$15 per Mtok), **judge = Haiku 4.5** ($1/$5),
rounded up to whole cents. *(This post-dates the §3.2 margin sketch's ~$0.01
Haiku-per-call figure — reconcile §3.2 against the locked models when PR-E2
lands its real usage numbers.)*

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

## 6. What our Premium gates (positioning)

Our Premium's wedge **isn't capacity** — every tracker offers more portfolios and
coins. It's the **integration of journal + AI conviction + research**, gated by the
AI budget. That's the moat. What each paid tier actually unlocks:

| Capability | Our position |
|---|---|
| **AI research / copilot** (conviction + Pulse + Ask) | ✅ Premium at full budget; Pro at a smaller budget; Starter offline-only |
| **Higher capacity** | ✅ 15 portfolios / 200 coins / 2,000 tx on Premium (see §1) |
| **Priority / faster support** | ✅ Premium includes priority support |
| **Custom dashboards / historical analytics** | Backlog |
| **Tax / compliance exports** | Backlog (P0 post-launch) |
| **API access** | Not on roadmap — we're a conviction tool, not a data API |

For how competitors gate *their* premium features (AI, analytics, tax exports, API,
capacity, support), see the cross-market matrix in
[PRICING-RESEARCH.md §12](../planning/PRICING-RESEARCH.md#12-cross-market-premium-gating-matrix).

---

## 7. Open items (do these next)

1. **Wire `researchAsk` (NEXT-STEPS B2)** with `aiMonthlyCents` enforcement.
   Per-uid Firestore counter doc, owner-only read for the badge, server-only
   write. Decrements by actual token cost, not call count.
2. **Persist `subscription.billing` in the PayPal webhook** so `getStats` can
   compute per-cycle fees accurately (and so the user's Account page can show
   "Renews 2026-08-15 · annual" instead of guessing).
3. **App Check (#20)** before launching any free-tier live-AI taste.
4. **⚠️ Deploy gate on the raised Pro/Premium limits (PLAN-LIMITS-MAX #12).**
   The raised Pro/Premium capacity limits must **not** ship to prod until BOTH
   (1) the Part B lazy-load read optimization (transactions loaded for the
   active portfolio only) and (2) the Wave-B abuse controls (App Check
   enforcement + per-uid rate limiter + `addCoinGuarded`) are live. **(1) Part B
   is now ✅ BUILT (2026-08-10 · branch `claude/plan-limits-partb` · CRYP-104 —
   `getCoinsMeta` loads non-active portfolios' coins + `txCount` only, no tx
   reads), so the remaining code prerequisite is (2) the Wave-B abuse controls.**
   Without Part B, a Pro-max account's daily-open **read** cost is a margin loss (a
   maxed portfolio re-reads every transaction on open). **Starter's raise is
   independently deploy-safe** (a free maxed account is ~$0.16/mo). Also: a
   pre-existing stored `config/app.plans` doc **silently overrides the new rule
   defaults**, so at deploy an owner must **re-save Plans & Pricing** (or run a
   one-time migration) — bumping the code defaults alone is not enough.
5. **Storage / read cost model (why the raised limits are safe).** CoinGecko
   cost is FLAT (one shared `cache/universe` doc), so a user's coins/tx add
   **zero** upstream API cost. The only per-user cost is Firestore, where
   storage + writes are pennies and **reads on app-open are the sole real
   driver** — which is why the Part B lazy-load (active-portfolio tx only) is
   the load-bearing gate above. Single-field index **exemptions** on the
   `transactions` collection group (`firestore.indexes.json`; `type`/`amount`/
   `priceAtBuy` exempted, `date` kept for newest-first ordering) hold per-tx
   storage at ~0.7 KB. With Part B, realistic-use margins are >99% at every
   tier and even the theoretical maximum stays in-band (~80% Pro, ~83%
   Premium). Full cost table in [`NEXT-STEPS.md`](../product/NEXT-STEPS.md)
   §PLAN-LIMITS-MAX.

---

## 8. Reference

- Code: [`functions/index.js`](../../functions/index.js) `DEFAULT_PLANS`, `mergePlans`, `getStats`
- Admin UI: [`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) (Plans & Pricing card + Revenue card)
- Hook state: [`src/hooks/useAdminDashboard.js`](../../src/hooks/useAdminDashboard.js) `DEFAULT_PLANS`
- Rules enforcement: [`firestore.rules`](../../firestore.rules) `configuredLimit`
- Landing: [`index.html`](../../index.html) `.plan-price` cards + `setBilling()` + `/api/config` fetch
- In-app billing screen: [`src/components/Login.jsx`](../../src/components/Login.jsx) — reads `site.plans` via context
- Decisions log: [`PRODUCT-DECISIONS.md`](PRODUCT-DECISIONS.md) #19 (tiers), #20 (anti-abuse), #21 (AI cost control)
- User-facing benefits: [`USER-BENEFITS.md`](../product/USER-BENEFITS.md)
- Billing mechanism (PayPal lifecycle, webhook, secrets, go-live): [`BILLING.md`](BILLING.md)
