# CryptoIdea — User Account & Tiers
**v2 · what each user gets, can do, and can't do — limits enforced at the tool level** · **RECONCILED 2026-06-22**

> ⚠️ **Reconciled against [`PRODUCT-DECISIONS.md`](../../PRODUCT-DECISIONS.md) (canonical).** Tier structure corrected:
> **Starter** 1 portfolio / 10 coins · **Pro** 3 portfolios / 50 coins each · **Premium** 15 portfolios / unlimited coins.
> "Unlimited" is a **high hard ceiling** (anti-abuse: rate-limited add-coin + App Check, decision #20), never bot-inflatable. The matrix below adds the portfolios row and marks the coin cap accordingly.

> Single source of truth for the three tiers (Starter / Pro / Premium) and account
> settings. Every limit here is enforced **server-side / at the tool level** — not in the
> client, not as a prompt the model could ignore. Pairs with `ai-tool-policy` (how the
> gating is enforced) and `how-to-research-crypto` (the research outputs being gated).

---

## The three tiers at a glance

**Starter — free.** Track and learn. The conviction signals on the coins you hold, the
journal, the Learn basics, and thesis-break nudges. The free way in.

**Pro — $9.99/mo (yearly −33%).** The real research tool. Research any coin on demand,
full signals + scam flag, full alerts, the complete Learn tab, more of everything.

**Premium — $49.99/mo (yearly −33%).** Everything, maxed. Real-time research, AI
deep-dive reports, AI review of your written thesis, priority support, no limits.

*(Yearly billing ≈ $80/yr Pro, ≈ $402/yr Premium — 33% off twelve months.)*

---

## Tier matrix

| | Starter (free) | Pro ($9.99/mo) | Premium ($49.99/mo) |
|---|---|---|---|
| **Portfolios** | 1 | 3 | 15 |
| **Coins per portfolio** | 10 | 50 | Unlimited* (*hard anti-abuse ceiling) |
| **Watchlist** | ✓ (within coin cap) | ✓ | ✓ |
| **AI research chat** | 5 / day | 50 / day | Unlimited |
| **Conviction signals** (4 + scam flag) | Tracked coins only | Any coin | Any coin |
| **On-demand research** (new coins) | — | ✓ (48h cache) | ✓ real-time |
| **Data freshness** | 48h cache | 48h cache | Real-time on demand |
| **AI deep-dive reports** | — | — | ✓ |
| **AI thesis review** | — | — | ✓ |
| **Journal** (2 questions + thesis) | ✓ | ✓ | ✓ |
| **Learn — Foundations + Protect tracks** | ✓ | ✓ | ✓ |
| **Learn — Research + Mindset tracks** | — | ✓ | ✓ |
| **Learn — masterclasses, AI tutor, personalized lessons** | — | — | ✓ |
| **Alerts** | Thesis-break only | + signal flips | + signal flips |
| **CSV export** (portfolio + journal) | ✓ | ✓ | ✓ |
| **Priority support** | — | — | ✓ |

---

## What each tier can and can't do — in plain terms

**Starter (free)**
- **Can:** track up to 10 coins, see their 4 signals + scam flag, keep a watchlist and a journal, read the free Learn tracks (Foundations + Protect), get thesis-break nudges, export their data, ask the chat 5 questions a day.
- **Can't:** research a coin it doesn't track (no on-demand), get signal-flip alerts, open advanced Learn modules, or get deep-dive reports / AI thesis review.
- **The walls a Starter hits:** "research any coin" and "full alerts." Those are the upgrade nudge.

**Pro ($9.99/mo)**
- **Can:** everything Starter can — plus track 50 coins, research *any* coin on demand (48h-fresh), full signals on any coin, full alerts (signal flips + thesis breaks), all four Learn tracks, 50 chats a day.
- **Can't:** get real-time data, AI deep-dive reports, AI thesis review, or the Premium learning layer (masterclasses, AI tutor, personalized lessons) — those are the reasons to climb to Premium.

**Premium ($49.99/mo)**
- **Can:** everything, no caps — unlimited coins and chat, real-time research on demand, AI deep-dive reports per coin, AI review of the thesis they write in the journal, the full Premium learning layer (deep-dive masterclasses, an in-lesson AI tutor, and lessons personalized to their portfolio), and priority support.
- This is the best the product offers.

---

## The lines that never move (every tier)

No tier ever gets buy/sell advice, price targets, an aggregate "buy score," or a coin the
AI introduced on its own. The deep-dive reports and thesis review are **richer, not
looser** — they obey every rule in `ai-tool-policy`. Paying more buys more *research*,
never a *recommendation*.

---

## Learn tab — by tier

Nine modules in four tracks, 5–6 lessons each (full design in `learn-tab`):

- **Free — Starter and up:** the **Foundations** track (How Markets Really Work · The Conviction Framework · Great Investor Principles) and the **Protect** track (Custody & Security · Spotting Scams & Rugs). Safety is free on purpose.
- **Pro & Premium:** add the **Research** track (Reading the Fundamentals · Portfolio Construction) and the **Mindset** track (The Psychology of Holding · Exit Discipline).
- **Premium only:** deep-dive masterclasses, an in-lesson AI tutor (answers, quizzes, re-explains with your coins), and lessons personalized to your portfolio — on the same approved sources and the same hard refusals as every other AI surface.

Every tier gets the gamified path: progress, streaks, badges, and apply-to-your-portfolio steps.

---

## Account settings

- **Profile** — name, email, password.
- **Subscription** — current tier, upgrade / downgrade, cancel; billing monthly or yearly (−33%); pay via PayPal.
- **Notifications** — per-type toggles: signals, thesis, alerts.
- **Data & privacy** — export portfolio + journal to CSV (all tiers); delete account.
- **Display** — light / dark theme.

---

## Lifecycle & edge cases

- **No free trial.** Starter is the free entry; users try the product by using it.
- **Upgrade** — effective immediately.
- **Downgrade** — if over the new coin cap (e.g. 50 → 10), the user **picks which coins to keep**; the rest are **archived** and restored on re-upgrade. Nothing is deleted.
- **Payment failure** — a **7-day grace period**, then the account drops to Starter (data preserved; coins over the Starter cap archived).
- **Account deletion** — a **30-day grace period**, then all data is wiped. Reactivating within 30 days restores everything.

---

## Tool-level enforcement (summary)

Every limit above lives in the **backend / tool layer** — never the client, never a prompt:

- Coin caps, chat rate limits, and watchlist size — checked server-side per request.
- **On-demand engine fetch** — gated to Pro/Premium; a Starter request for an untracked coin is refused with an upgrade prompt (the engine is never invoked).
- **Real-time fetch** (bypassing the 48h cache), **deep-dive reports**, and **AI thesis review** — gated to Premium.
- The hard refusals and the naming validator (`ai-tool-policy`) apply on **every** surface and tier, including the Premium-only features.

*CryptoIdea · User Account & Tiers · v2*
