# Competitor Pricing Research

**Purpose.** The raw competitor research behind [PRICING.md](../decisions/PRICING.md) §2 (price
anchors) and §6 (what competitors gate behind premium). PRICING.md's Section 6 promised this doc
"once authored" — this is it. It backs *why* Premium sits at **$49.99/mo** and where our
feature-gating lines up with the market.

**Scope.** The 7 competitors PRICING.md already cites — CoinStats, Token Metrics, Rotki, Glassnode,
Santiment, Nansen, Messari — plus three close portfolio-tracker peers (DeBank, Zerion, Delta).

**Method.** Live web research (mid-2026), one researcher per competitor reading the **official
pricing page** first, then an independent adversarial verifier re-checking the headline prices
against the official source. Secondary reviews were used only for corroboration and disregarded when
they conflicted with the official page (most stale reviews still cite retired tier structures).

> **Read this before quoting a number.** Crypto-SaaS pricing moves fast and is messy:
> - Several vendors **restructured tiers** in late 2025 / 2026 (Token Metrics, Nansen, Messari,
>   Rotki, Delta) — old reviews (and old versions of PRICING.md) cite tiers that no longer exist.
> - Many official pages render prices **client-side (JS)**, so exact annual dollar totals were
>   sometimes derived from the stated "save X%" label rather than read verbatim (flagged per row).
> - **Promo vs list**: some annual prices shown are limited-time sales; the list price is noted.
> - **Region/platform variance**: web vs App Store vs regional/VAT pricing differ (esp. CoinStats,
>   Rotki in EUR).
> - Confidence is recorded per competitor. Verify the live page before putting any figure in
>   customer-facing copy.

**As of:** 2026-07-17. **Not** a canonical decisions doc — PRICING.md remains the source of truth
for our own numbers. This is the evidence file; when these figures and PRICING.md's anchors diverge,
see [§13 Reconciliation](#13-reconciliation--deltas-vs-pricingmd).

---

## 1. TL;DR

- **The $49/mo research-tool band is real and current.** Nansen Pro ($49/mo annual-effective),
  Glassnode Advanced ($49/mo), and Santiment Sanbase Pro ($49/mo) all sit at ~$49. Our **$49.99
  Premium anchor holds** against the segment we compete in.
- **Above the band:** Santiment Max $249/mo, Token Metrics Alpha $199 / Roundtable $499,
  Glassnode Professional (quote, ~$999+), Messari Enterprise **$5,000/yr**. Plenty of headroom
  above us — $49.99 is not the ceiling of what this audience pays.
- **Below the band (retail trackers):** CoinStats Premium $13.99/mo, Delta PRO/PRO+ $6.99/$13.99,
  DeBank $15/mo, Zerion Premium $99/yr. These compete on capacity + convenience, **not** on an
  AI-research layer — which is exactly the wedge PRICING.md §6 identifies.
- **Gating pattern across the market:** AI/research, tax/CSV export, advanced analytics, API access,
  higher capacity, and faster support are the near-universal paywall levers (see [§12 matrix](#12-cross-market-premium-gating-matrix)).
- **PRICING.md has drifted in three spots** since 2026-06-23 — CoinStats *Degen*, *Token Metrics*,
  and *Messari* figures are now stale (details in [§12](#12-reconciliation--deltas-vs-pricingmd)).
  Per this pass's scope, those figures are flagged here, **not** edited in PRICING.md.

---

## 2. CoinStats — retail crypto portfolio tracker

**Confidence: medium** (official page fetched live; exact annual $ are JS-rendered, triangulated).

Retail portfolio tracker (web + iOS/Android) aggregating exchange/wallet/DeFi holdings with live
prices, analytics, alerts, tax reports and AI research.

| Tier | Monthly | Annual | Notes |
|---|---|---|---|
| Free (Basic) | $0 | $0 | 10 portfolios, 20,000 tx, 10 daily syncs |
| **Premium** | **$13.99/mo** | ~$146/yr (~$12.17/mo) | Annual = "13% off" label (JS-rendered; derived). 7-day trial, 14-day money-back |
| Degen | ~$88–89/mo month-to-month | **$62.91/mo billed annually (~$755/yr)** | "29% off" power-user/"bull-market" tier |
| Team | quote | quote | communities: VIP channel, multi-seat |

**Premium gates:** 100 portfolios, ~100,000 tx, 200 daily syncs, Multimodal AI Agent + AI Deep
Research (2× AI credits), AI price predictions, Portfolio Heatmap / Asset Allocation / P&L reporting,
custom alerts, ad-free, priority support (<24h). **Degen** adds 500 portfolios, ~1M tx, unlimited
syncs, AI backtesting, VIP support (<1h).

**Caveats:** Web pricing differs from Apple App Store (Premium $15.99–$19.99/mo there, + a legacy
"Pro" $4.99/mo) and from frequent promos (annual Premium seen ~$8.33/mo ≈ $100/yr in Feb 2026;
CoinGecko 20%-off coupon). Verifier correction: the old "Degen ≈ $9.90/mo" framing is wrong — Degen
is a *high-end* tier (~$62.91/mo annual, ~$89/mo monthly).

**Sources:** [coinstats.app/pricing](https://coinstats.app/pricing/) ·
[help center — Premium & Degen](https://help.coinstats.app/en/articles/1537091-coinstats-premium-and-degen-plans-overview) ·
[cryptoadventure review 2026](https://cryptoadventure.com/coinstats-review-2026-features-pricing-pros-and-cons/) ·
[App Store listing](https://apps.apple.com/us/app/coinstats-crypto-portfolio/id1247849330)

---

## 3. Token Metrics (now "Daily Pulse") — AI crypto research / signals

**Confidence: high** (tiers read live off the official upgrade page; product restructured).

⚠️ **Restructured.** The old Basic/Advanced/Premium/VIP ratings-platform tiers are gone;
`tokenmetrics.com/pricing` now 404s. The current public product is **Token Metrics Daily Pulse**.

| Tier | Monthly | Annual (list) | Notes |
|---|---|---|---|
| Free (Daily Pulse) | $0 | $0 | daily crypto brief: newsletter + podcast + blog |
| **Signal** | **$49/mo** | $499/yr ("save 15%") | token + prediction-market signals, #signal Discord, 7-day trial |
| Alpha | $199/mo | $1,999/yr (promo $1,599.20) | Weekly Alpha Report, Hidden Gems, Monthly Playbook, #alpha Discord |
| The Roundtable | $499/mo | $4,999/yr (promo $3,999.20) | AI Portfolio Defense, live investor roundtable, priority support |

**Gates:** all market/prediction signals + community are paywalled; research depth and networking
scale up each tier. Annual "20% off Summer Sale" on Alpha/Roundtable is a limited-time promo (list
prices shown above).

**Caveats:** All `tokenmetrics.com` WebFetches were Cloudflare-403'd; figures were read by driving a
real browser to `pulse.tokenmetrics.com/upgrade`. Stale reviews still cite the retired
Basic $19 / Advanced $99 / Premium $299 / VIP $749 model. Whether a separate legacy ratings/API
subscription still runs in parallel could not be confirmed (that surface was unreachable).

**Sources:** [pulse.tokenmetrics.com/upgrade](https://pulse.tokenmetrics.com/upgrade) ·
[tokenmetrics.com](https://tokenmetrics.com/) ·
[help center — plans](https://help.tokenmetrics.com/en/collections/3153005-token-metrics-plans-and-pricing)

---

## 4. Rotki — open-source, local-first tracker + tax/accounting

**Confidence: high** (official page JS-rendered in-browser 2026-07-17). **Bills in EUR, not USD.**

Privacy-first, self-hosted tracker where data stays on your machine; premium unlocks higher limits,
multi-device sync, and advanced analytics. Restructured 2025-10-13 from a single "Premium" tier to
five tiers.

| Tier | Monthly (EUR list) | Annual (EUR) | ≈ USD/mo | Notes |
|---|---|---|---|---|
| Starter (Free) | €0 | €0 | $0 | 1,000 recent events, 1 device, 10 notes |
| Supporter | €9.00 | €90 | ~$9.90 | 3K events |
| **Basic** ("suggested") | €25.00 | €250 | ~$27.50 | 30K events, 2 devices, ETH staking ≤128 |
| Advanced | €45.00 | €450 | ~$49.50 | 100K events, 4 devices, ETH staking ≤384 |
| Custom | quote | quote | — | businesses / family offices |

Annual = "save 2 months" (~17%, standing discount). EUR figures are authoritative; USD ≈ at
1.10 EUR/USD and drift with FX. Page prices are VAT-inclusive for the displayed region (a US buyer
may pay less net).

**Premium gates:** higher historical-event caps, multi-device + encrypted cloud sync/backup,
ETH-staking tracking (free can't track it at all), detailed graphs / staking insights / event
analysis, GnosisPay + Monerium integrations, unlimited notes, bespoke support (Advanced/Custom).

**Caveats:** aggregators (TrustRadius/SoftwareSuggest ~$10) are stale pre-2025 single-Premium pricing.

**Sources:** [rotki.com/pricing](https://rotki.com/pricing) ·
[blog — new tiers (2025-10-13)](https://blog.rotki.com/2025/10/13/rotki-tiers/) ·
[docs — plans & pricing](https://docs.rotki.com/premium/plans-and-pricing.html)

---

## 5. Glassnode — on-chain / market analytics (Studio)

**Confidence: high** (official Studio page fetched live twice; some gating conflicts noted).

| Tier | Monthly | Annual | Notes |
|---|---|---|---|
| Standard (Free) | $0 | $0 | Basic metrics only, **24h** resolution |
| **Advanced** | **$49/mo (billed annually)** | ~$588/yr (12×$49) | ~4y history; "API Light" add-on; 10 alerts |
| Professional | quote ("Configure") | quote | up to 10-min resolution, 15y+ history, full API, 500 alerts, commercial licensing |

*(Verifier also spotted a "Glassnode Vector" product at $749/mo on the live page.)*

**Premium gates:** Essential + Advanced metric sets, sub-daily resolution, deep history, API access,
alert quotas, Market Compass / Research Dashboards / Point-in-Time & Per-Exchange metrics
(Professional), data credits / bulk downloads, commercial data licensing.

**Caveats:** Advanced annual ($588) is inferred (12×$49; page shows only "$49/mo, billed annually").
The live pricing card shows Advanced at **24h** resolution while Glassnode's own docs FAQ says "up to
1h" — two official sources conflict; treat resolution as unsettled. Professional's widely-cited
"$999/mo starting" is **not** on the official page (secondary only). Coupon sites advertising 35–87%
off are marketing, not list.

**Sources:** [studio.glassnode.com/pricing](https://studio.glassnode.com/pricing) ·
[docs FAQ (free/Standard = 24h)](https://docs.glassnode.com/further-information/faq)

---

## 6. Santiment — on-chain + social + dev-activity analytics

**Confidence: high** (official consumer page fetched live twice; Business tier unverified).

| Tier | Monthly | Annual (~10% off) | Notes |
|---|---|---|---|
| Free | $0 | $0 | 30-day data lag, 3 alerts, 1K API calls/mo |
| **Sanbase Pro** | **$49/mo** | ~$529/yr | 20 alerts, 5K API calls, full history; SAN holders −20% |
| Sanbase Max | $249/mo | ~$2,700/yr | 50 alerts, 80K API calls, real-time, dedicated support |
| Business / Enterprise | quote (unverified ~$999/mo) | — | 600K–1.2M API calls/mo, multi-seat |

**Premium gates:** present-day + full historical data (free is stuck 30 days behind), real-time API,
full Trending list + screener filters, more alerts, higher API quotas, Google Sheets plugin (Pro+),
multi-seat (Business). Annual −10% + SAN-token −20% are standing (not promo); annual payable in crypto.

**Caveats:** the "Business ~$999/mo" figure could not be confirmed on the official page (only
Free/Pro/Max are shown there); the Academy SanAPI page lists Business Pro/Max/Enterprise as real
plans but publishes **no** USD prices. Treat Business as quote-based.

**Sources:** [app.santiment.net/pricing](https://app.santiment.net/pricing) ·
[Academy — Sanbase plans](https://academy.santiment.net/products-and-plans/sanbase-plans/) ·
[Academy — SanAPI plans](https://academy.santiment.net/products-and-plans/sanapi-plans/)

---

## 7. Nansen — on-chain wallet-label analytics

**Confidence: high** (read live off Nansen-owned help center; primary pricing URL 404'd).

⚠️ **Simplified to two plans** (Sept 2025). The old Pilot/Pioneer ($99/mo) and Professional
($999+/mo) tiers are **retired**.

| Tier | Monthly | Annual | Notes |
|---|---|---|---|
| Free | $0 | $0 | Smart Search, basic Signals/analytics, portfolio across 45+ chains |
| **Pro** | **$69/mo** | **$588/yr = $49/mo effective** | full PnL + all Labels (500M+ addresses), unlimited alerts, CSV, 2,000 AI-agent prompts/mo |

**Premium gates:** full PnL & all Nansen Labels incl. Smart Money, advanced filtering + deeper
history, unlimited portfolios/alerts, CSV downloads, AI-agent prompts, 10 bps trading fees, early
access, dedicated CSM. API/MCP is separate usage-based credits ($10 per 1,000). No Enterprise
subscription currently.

**Caveats:** `nansen.ai/pricing` 404'd; the live comparison table is login-gated at
`app.nansen.ai/account/switch-plans`. Numbers came from the Nansen-owned help center + an independent
review that agree exactly.

**Sources:** [academy.nansen.ai — Pro plan](https://academy.nansen.ai/articles/9412804-pro-plan-explained) ·
[academy.nansen.ai — plans & pricing](https://academy.nansen.ai/articles/1287744-plans-and-pricing) ·
[nftevening review](https://nftevening.com/nansen-review/)

---

## 8. Messari — institutional research / data / intelligence

**Confidence: high** (official page read live in-browser; Lite/Pro retirement confirmed via docs).

⚠️ **Restructured** after the Blockworks acquisition. The former self-serve Pro (~$29.99/mo) is
**retired**; docs state "Lite and Pro have been permanently retired. Enterprise is now the only
Messari plan available."

| Tier | Monthly | Annual | Notes |
|---|---|---|---|
| Basic (Free) | $0 | $0 | basic data, quarterly reports, 1 watchlist, view-only screener |
| **Enterprise — Individual ("All Access")** | — (no monthly) | **$5,000/yr** | "One plan. One price." full research + AI Copilot |
| Enterprise — multi-seat / custom | quote | quote (~$6K–$34K/yr secondary) | per-seat + add-on APIs |

**Premium gates:** exclusive/enterprise research, Messari AI Copilot, full screeners (free is
view-only), Diligence Reports, fundraising data + CSV, Signals (sentiment/mindshare), Token Unlocks +
on-chain tracking, TradingView charts, AI newsfeed/digests, unlimited watchlists, included data APIs
(others as add-ons), Telegram community.

**Caveats:** stale reviews still cite the retired Pro ~$29.99/mo. PricingSaaS's "$416.67/mo" is just
$5,000 ÷ 12, not an offered monthly plan. Multi-seat ranges are secondary/quote-based.

**Sources:** [messari.io/pricing](https://messari.io/pricing) ·
[docs — plan deprecation FAQ](https://docs.messari.io/user-guides/welcome/plan-deprecation-faq)

---

## 9. DeBank — multi-chain DeFi tracker + Web3 social

**Confidence: high on the paywall; medium on exact figures** (official page JS-rendered; corroborated).

On-chain-only DeFi tracker (from the Rabby team) across 30+ chains; no CEX account sync, no price
alerts on any tier.

| Item | Price | Notes |
|---|---|---|
| Free | $0 | portfolio tracking; social "Stream" trial-capped (~100 uses) without a Web3 ID |
| **Bulk Subscription** ("Paid Features") | **$15/mo**; ~$150/yr (promo, reg. $180) | bundles all paid features + VIP label; 3-mo $40, 6-mo $75 |
| À la carte features | $3–$5/mo each | Time Machine ($5), Tx History Analysis ($5), follow ≤3,000 ($5), various $3 items |
| Web3 ID | one-time ~$25 (was $96) | not a subscription; unlocks unlimited social |
| DeBank Cloud (API) | usage-based / quote | developer product, not consumer |

**Premium gates:** Time Machine (date-to-date comparison), Transaction History Analysis Mode,
follow up to 3,000 users, portfolio Change/Summary views, non-NFT avatar, profile cover, VIP label.

**Caveats:** `debank.com/paid` renders prices in JS; figures come from corroborated secondary reviews
+ official-page search snippets (all agree $15/mo, $150/yr). Web3 ID price disputed ($25 vs stale $96).

**Sources:** [debank.com/paid](https://debank.com/paid) ·
[ComparEdge 2026](https://comparedge.com/tools/debank) ·
[BitDegree review](https://www.bitdegree.org/crypto/debank-review)

---

## 10. Zerion — self-custodial DeFi wallet + tracker (Premium)

**Confidence: high** (official page fetched live; bundle price secondary).

| Tier | Price | Notes |
|---|---|---|
| Free | $0 | wallet + tracking across EVM + Solana; standard swap/bridge fee |
| **Premium (Individual)** | **$99/yr** (annual-only, 1 wallet, no auto-renew; ~$8.25/mo) | ~50% lower fees; P&L for any address; CSV export |
| Premium Bundle (≤7 wallets) | ~$299/yr (secondary; not on official page) | one FAQ snippet claims bundle discontinued — unconfirmed |

**Premium gates:** ~50% lower trading/bridging fees, P&L for *any* wallet address (incl. non-Zerion),
full CSV transaction export (back to 2018) for taxes, airdrop/allowlist notifications, early access,
priority support. Holders of a Zerion DNA NFT with the "Premium" attribute get lifetime Premium free.

**Caveats:** Premium is **annual-only** (no monthly). Fee-discount basis points vary by source
(0.67%→0.25% per one help page; ~50% is the consistent framing). Premium features are EVM-focused
today (Solana "coming soon").

**Sources:** [zerion.io/premium](https://zerion.io/premium) ·
[help — what is Premium](https://help.zerion.io/en/articles/9760851-what-is-zerion-premium) ·
[help — Premium FAQs](https://help.zerion.io/en/articles/9767229-zerion-premium-faqs)

---

## 11. Delta Investment Tracker (by eToro) — multi-asset retail tracker

**Confidence: high** (official page read live in-browser; restructured to two paid tiers).

Tracks crypto + stocks/ETFs/funds/metals; owned by eToro; not a brokerage.

| Tier | Monthly | Annual ("Save 40%") | Lifetime | Notes |
|---|---|---|---|---|
| Basic (Free) | $0 | $0 | — | track up to 10 assets, single portfolio |
| **PRO** | $6.99/mo | $53.88/yr (~$4.49/mo) | — | 40 assets, 4 Insights modules |
| **PRO+** | $13.99/mo | $107.88/yr (~$8.99/mo) | $299 | unlimited assets, multiple portfolios, all 11 modules, Delta AI |

**Premium gates:** >10 assets, multiple portfolios (PRO+ only), unlimited connections, Portfolio
Insights modules (4 vs 11), Asset Analytics ("Why Is It Moving?", insider transactions),
auto-refreshing/real-time quotes, Gains Reporting + tax exports, **Delta AI (PRO+ only)**, eToro Club
Platinum perks (PRO+).

**Caveats:** stale reviews still describe the old single-tier "Delta PRO" at $99.99/yr. "Save 40%" is
standing annual pricing (Delta separately runs limited-time promos, e.g. "50% off PRO+ yearly", not
reflected here). Prices vary by region.

**Sources:** [delta.app/en/pro](https://delta.app/en/pro) ·
[euinvestinghub review](https://www.euinvestinghub.com/articles/delta-portfolio-tracker-review/)

---

## 12. Cross-market premium-gating matrix

What the market puts behind a paywall (✅ = gated behind a paid tier; — = not offered / free):

| Gated capability | CoinStats | Token Metrics | Rotki | Glassnode | Santiment | Nansen | Messari | DeBank | Zerion | Delta |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| AI research / copilot | ✅ | ✅ (whole product) | — | — | — | ✅ (AI agent) | ✅ | — | — | ✅ (PRO+) |
| Advanced analytics / dashboards | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Tax / CSV / accounting export | ✅ | — | ✅ | — | — | ✅ | ✅ (CSV) | — | ✅ | ✅ |
| API access | — | — | — | ✅ | ✅ | credits | ✅ | ✅ (Cloud) | — | — |
| Higher capacity (portfolios/assets/tx) | ✅ | — | ✅ (events) | — | — | ✅ | ✅ (watchlists) | ✅ | ✅ (wallets) | ✅ |
| Real-time / faster data | — | ✅ (signals) | — | ✅ (resolution) | ✅ (no lag) | — | ✅ | — | — | ✅ (quotes) |
| Lower trading/swap fees | ✅ (0% swap) | — | — | — | — | ✅ (10 bps) | — | — | ✅ (~50%) | — |
| Priority / VIP support | ✅ | ✅ | ✅ | — | ✅ | ✅ (CSM) | ✅ | — | ✅ | ✅ (PRO+) |
| Ad-free | ✅ | — | — | — | — | — | — | — | — | — |

**Read-out.** Capacity, analytics, exports, API, and support are *table stakes* — every serious
competitor gates them. **AI research/copilot** is gated by only a handful (CoinStats, Token Metrics,
Nansen, Messari, Delta) and none of them fuse it with a *conviction journal*. That's the moat
PRICING.md §6 claims, and the market confirms it's defensible: nobody in this set sells
"journal + AI conviction + research" as an integrated gate.

---

## 13. Reconciliation — deltas vs PRICING.md

PRICING.md's anchor table (§2.1) and notes were written **2026-06-23**. Comparing to this live pass:

| PRICING.md says | Live finding (2026-07) | Status |
|---|---|---|
| Nansen Pro **$49/mo** (annual) | Pro is **$69/mo monthly, $49/mo annual-effective** ($588/yr) | ✅ Accurate (annual). Add "monthly $69" nuance |
| Glassnode Advanced **$49/mo** (annual) | Advanced **$49/mo billed annually** | ✅ Accurate |
| Santiment Pro **$49/mo** | Sanbase Pro **$49/mo** ($529/yr) | ✅ Accurate |
| CoinStats Premium **$13.99/mo** | Premium **$13.99/mo** list | ✅ Accurate |
| CoinStats Degen **~$9.90/mo equiv** | Degen is a **high-end** tier: ~$62.91/mo annual (~$755/yr), ~$89/mo monthly | ❌ **Stale** — Degen is now a premium power-user tier, not a cheap one |
| Messari Enterprise **quote-based** | Now a **published $5,000/yr** Individual list price; Lite/Pro **retired** | ⚠️ **Update** — no longer purely quote; Individual list exists |
| Token Metrics Premium **$199.99/mo** | Old Basic/Advanced/Premium/VIP **retired**; now Signal $49 / Alpha $199 / Roundtable $499 (product = "Daily Pulse") | ❌ **Stale** — "Premium $199.99" tier no longer exists |
| §2.3: "competitor **Delta** does **41%**" annual | Delta markets **"Save 40%"** on yearly; restructured to PRO/PRO+ | ⚠️ Minor — 40% not 41% |

**Bottom line for our pricing:** the **$49 band that anchors Premium is intact** (Nansen/Glassnode/
Santiment all ~$49), so the $49.99 decision still stands on current evidence. The stale rows above
are competitor-side drift that don't move our anchor, but PRICING.md §2.1's *examples* should be
refreshed on the next pricing review. **Per the scope of this pass, PRICING.md's numbers were left
unchanged — this table is the flag.**

---

## 14. Source index

Official pricing pages used (verify these before quoting):
CoinStats [/pricing](https://coinstats.app/pricing/) ·
Token Metrics [pulse/upgrade](https://pulse.tokenmetrics.com/upgrade) ·
Rotki [/pricing](https://rotki.com/pricing) ·
Glassnode [studio/pricing](https://studio.glassnode.com/pricing) ·
Santiment [/pricing](https://app.santiment.net/pricing) ·
Nansen [academy plans](https://academy.nansen.ai/articles/1287744-plans-and-pricing) ·
Messari [/pricing](https://messari.io/pricing) ·
DeBank [/paid](https://debank.com/paid) ·
Zerion [/premium](https://zerion.io/premium) ·
Delta [/en/pro](https://delta.app/en/pro)

*Research method: multi-agent live web pass (10 competitors × research → adversarial verify),
2026-07-17. Full per-competitor verifier notes and secondary sources are in the commit that added
this file.*
