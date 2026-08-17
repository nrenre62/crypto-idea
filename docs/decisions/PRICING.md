# CryptoIdea Pricing

The canonical record of what CryptoIdea charges and why — tiers, prices, resource limits, the live-AI budget model, and the margin logic behind the numbers.

Part of [Product decisions](PRODUCT-DECISIONS.md) — this spoke covers pricing; the billing mechanism (subscription lifecycle, webhook, secrets, go-live) lives in [BILLING.md](BILLING.md).

Prices and limits come from the admin-editable `config/app.plans` document with a built-in `DEFAULT_PLANS` fallback; resource limits are enforced server-side — portfolios + tx by [`firestore.rules`](../../firestore.rules), the coin cap by the `addCoinGuarded` callable. Paid plans ship OFF behind the `paidPlansEnabled` master switch until launch.

## 1. The plan at a glance

| Tier | Monthly | Annual (2 months free) | Annual ≈ /mo | Portfolios | Coins/portfolio | Tx/coin | Live AI |
|---|---|---|---|---|---|---|---|
| Starter (`free`) | $0 | $0 | — | 3 | 30 | 300 | offline only |
| Pro | $9.99 | $99.99 (−17%) | $8.33 | 6 | 100 | 1,000 | ~$4/mo budget |
| Premium | $49.99 | $499.99 (−17%) | $41.67 | 15 | 200 | 2,000 | ~$25/mo budget |

The "Live AI" column is presented to users as an approximate analyses-per-day figure. Internally each tier enforces a monthly dollar-cost ceiling (`aiMonthlyCents` in `config/app.plans`), because token usage — not call count — drives AI cost. See [section 4](#4-budget-unit-monthly-dollar-cost-ceiling).

Portfolio + transaction limits are enforced server-side by [`firestore.rules`](../../firestore.rules), which reads `config/app.plans` via `get()` and falls back to the built-in defaults; the coin cap moved to the `addCoinGuarded` callable (coin `create` is `if false` in the rules — see §2.5). Limits stay editable from the admin panel's Plans & Pricing card — they are not hard-coded into the app.

## 2. Why these numbers

### 2.1 Premium at $49.99/mo

$49.99/mo is the anchor for a research/conviction tool that ships AI on top of a portfolio tracker. A user paying at this level expects more than alerts — that is what the conviction signals, Portfolio Pulse, and Ask surfaces deliver. The price is an anchor, not a ceiling.

### 2.2 Pro at $9.99/mo

Pro sits between the free tier and Premium and captures the user who wants the AI layer but cannot justify $50 yet. The gap to Premium is wide on purpose: a mid-tier would multiply the config/rules/landing/admin maintenance burden for marginal lift. Revisit only if Pro becomes the top-paid tier — a signal that Premium is not landing.

### 2.3 Annual at "2 months free" (−17%)

The annual discount is the standard "2 months free" framing, chosen where retention is the lever rather than aggressive discounting. Deeper discounts (−20%, −33%) burn margin without obvious lift at this base price; no annual at all would leave recurring-revenue and churn reduction on the table.

The annual price is stored, not computed (`config/app.plans.<tier>.priceYear`). A landing-side `price × 8/12` formula is deliberately avoided so the discount can change in one place without a foot-gun.

### 2.4 Free tier stays offline-only

The Starter tier ships no live AI. Variable AI cost on a free tier scales with abuse rather than value, and the data-driven offline summaries already give Starter users a real result (Portfolio Pulse renders without the proxy via the AI client's fallback). A small free monthly taste can be reconsidered once per-uid rate limiting and App Check enforcement are live.

### 2.5 Premium coins: 200 enforced default, 1,000 hard clamp

The `addCoinGuarded` callable clamps any configured coin limit to `min(config, 1000)` — 1,000 is the absolute ceiling no admin edit can raise (the pure `coinCapFor` in `functions/coin-limits.js`, re-derived server-side in the callable since coin `create` is `if false` in `firestore.rules`; mirrored by the `mergePlans` clamp in `functions/index.js`). The enforced Premium default is 200 coins/portfolio, which gives a Premium user 3,000 coins across 15 portfolios. The 1,000 clamp stays as an anti-abuse backstop:

- Real human portfolios do not exceed 1,000 distinct coins.
- Each novel coin is a fresh conviction-cache miss and therefore fresh AI spend.
- The clamp also caps worst-case write-amplification on the Firestore counter.

The clamp never appears in marketing copy.

## 3. Margin math

### 3.1 Cost stack

| Cost | Type | Driver | Estimate |
|---|---|---|---|
| CoinGecko (paid tier) | fixed | upstream cap on the hot universe | ~$129/mo |
| Firebase Blaze | mostly fixed | Functions invocations, Firestore reads, CDN egress | ~$30/mo at modest scale |
| AI API | variable | live AI (conviction, Pulse, Ask) | per call — see below |
| PayPal fees | variable | 2.9% + $0.30 per charge | ~$0.59 on Pro, ~$1.75 on Premium |

Total fixed monthly infra is roughly $160/mo, flat regardless of user count — the CoinGecko proxy is shared-cached (see the [README CoinGecko proxy notes](../../README.md)).

### 3.2 AI model mix

The AI layer uses two model roles from the AI provider, split by economics:

- A cheaper model handles the per-user, high-volume surfaces (Pulse and Ask), where a portfolio-shaped chat is fine.
- A stronger generation model handles the shared, per-coin conviction cache, which is generated once per coin and amortized across all users, so quality matters and the cost is effectively fixed.

Because the expensive generation happens only in the shared cache and is amortized, per-user cost is bounded by the cheaper model.

### 3.3 Break-even on fixed infra

At the worst-case at-ceiling per-user contribution, roughly 30 Pro subscribers or 7 Premium subscribers cover all fixed infra. A realistic mix of 15–20 paying users clears break-even with margin to spare.

## 4. Budget unit: monthly dollar-cost ceiling

### 4.1 Why a dollar ceiling, not a call count

A call count is not margin-safe: a single call varies in cost with prompt size, output size, and model, and users adapt by packing more into each call. A monthly dollar ceiling cannot be gamed — once the budget is spent, the user degrades gracefully to the offline summaries until the next month.

### 4.2 Per-tier budgets

Each plan carries an `aiMonthlyCents` field (cents/month) on `config/app.plans`, editable from the admin panel:

| Tier | `aiMonthlyCents` | Shown to user as |
|---|---|---|
| free | 0 | "Offline only" |
| pro | 400 ($4.00) | approximate analyses/day |
| premium | 2500 ($25.00) | approximate analyses/day |

Users never see a dollar-budget figure — that framing punishes engagement. They see an approximate analyses-per-day figure, which is honest at the average call cost. When a user reaches the ceiling, live AI surfaces switch to the same offline data-driven summaries the free tier sees, with a banner explaining the monthly reset and offering an upgrade.

### 4.3 App-wide monthly cap (distinct from the per-tier fields)

There are two different budgets — do not conflate them:

- The per-tier per-uid ceiling `plans.*.aiMonthlyCents` described above.
- A single app-wide monthly spend pool at `config/app.ai.monthlyCapCents` (default 5000 = $50/mo), admin-editable from the Settings AI card and metered by the pure `functions/ai-cost.js` ledger on a server-only `aiBudget/{YYYY-MM}` doc (round-up cents, UTC month key). This is the app-wide launch cost ceiling.

The AI-cost helpers (`costCents`, `readMonthSpendCents`, `reserveMonthCents`, `chargeMonthCents`, `budgetExceeded`) are pure and dependency-injected, and the `aiBudget` doc is server-only in `firestore.rules` — a client-writable meter could be zeroed to defeat the cap. The app-wide cap is enforced atomically: `reserveMonthCents` transactionally holds a derived worst-case cost up front (or denies the request at the cap, consuming nothing), then `chargeMonthCents` settles the reservation down to the actual metered token cost. The per-tier `plans.*.aiMonthlyCents` fields are not yet enforced — the single app-wide cap ships first. Both meter real spend only once live AI is switched on; today `AI_PROXY_LIVE` is false, so no tokens are spent and the ledger stays at zero. Model economics — a generation model and a cheaper judge model — are set in `functions/ai-cost.js`.

---

## 5. Payment fees in `getStats`

The admin Overview shows net revenue (gross minus fees), not gross. PayPal's pricing is `2.9% + $0.30 per charge`. Revenue is computed by `computeRevenue` in [`functions/billing.js`](../../functions/billing.js), which reads each payer's real billing cycle: an annual payer contributes `priceYear / 12` per month with its single yearly charge's fee amortized over twelve months, rather than being mispriced as a monthly payer. A missing `priceYear` degrades to the monthly math.

The billing cycle is persisted as a top-level `billingCycle` field on `users/{uid}`. `createSubscription` writes it directly; the future-start flows (`scheduleProDowngrade` / `resubscribePremium`) record the cycle in their `subscription.scheduledNext.billing` marker, which the daily sweep promotes to the top-level field when the scheduled plan activates. `gatherStats` builds its payer list from that field and prices each payer by cycle, so the net revenue number reflects annual and monthly payers correctly.

## 6. What Premium gates (positioning)

Premium's wedge is not capacity — every tracker offers more portfolios and coins. It is the integration of journal, AI conviction, and research, gated by the AI budget. What each paid tier unlocks:

| Capability | Position |
|---|---|
| AI research / copilot (conviction + Pulse + Ask) | Premium at full budget; Pro at a smaller budget; Starter offline-only |
| Higher capacity | 15 portfolios / 200 coins / 2,000 tx on Premium (see section 1) |
| Priority / faster support | Premium includes priority support |
| Custom dashboards / historical analytics | Backlog |
| Tax / compliance exports | Backlog |
| API access | Not on the roadmap — this is a conviction tool, not a data API |

## 7. Reference

- Plan defaults and merge: [`functions/index.js`](../../functions/index.js) — `DEFAULT_PLANS`, `mergePlans`, `getStats`/`gatherStats`
- Revenue math: [`functions/billing.js`](../../functions/billing.js) — `computeRevenue`
- AI budget ledger: [`functions/ai-cost.js`](../../functions/ai-cost.js)
- Admin UI: [`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) — Plans & Pricing card, Revenue card
- Hook state: [`src/hooks/useAdminDashboard.js`](../../src/hooks/useAdminDashboard.js) — `DEFAULT_PLANS`
- Rules enforcement (portfolios + tx): [`firestore.rules`](../../firestore.rules) — `configuredLimit`, `maxPortfolios`, `maxTx`
- Coin cap: [`functions/coin-limits.js`](../../functions/coin-limits.js) — `coinCapFor` (`min(config, 1000)`), enforced in `addCoinGuarded`
- Landing: [`index.html`](../../index.html) — plan-price cards and `/api/config` fetch
- In-app billing screen: [`src/components/Login.jsx`](../../src/components/Login.jsx)
- Product-direction record: [PRODUCT-DECISIONS.md](PRODUCT-DECISIONS.md)
- Billing mechanism (PayPal lifecycle, webhook, secrets, go-live): [BILLING.md](BILLING.md)
