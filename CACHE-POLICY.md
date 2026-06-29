# Caching policy — tiers, TTLs, freshness UX & cost control

> **Canonical record of the 2026-06-29 cache deep-dive + founder interview.**
> Built from a 6-agent cache audit (server cache, client cache, data-source cost, doc decisions,
> staleness UX) of `functions/index.js`, the `/api` proxy, `src/hooks/*`, the Research feature, and
> the decision docs. It explains **how caching works today**, maps the founder's **4-tier mental
> model** to the code, and records the **12 locked decisions (C1–C12)**. The sequenced build order
> lands in [`NEXT-STEPS.md`](NEXT-STEPS.md) §C.
> Where this doc and a stale planning note disagree, **this doc wins** for caching (as
> [`PRODUCT-DECISIONS.md`](PRODUCT-DECISIONS.md) does for product and
> [`BACKEND-ADMIN-DECISIONS.md`](BACKEND-ADMIN-DECISIONS.md) for backend/admin). It does not
> override those for their domains — it composes with §0 Wave B and §BL.

**The one-line summary:** the market-data layer is already built and genuinely cost-effective — it
*is* the 4-tier model in code, just unlabeled. **The entire open work is the AI tier** (conviction /
Pulse / Ask), which is planned but unbuilt, plus a small set of UX/correctness cleanups. The
founder's north star: **caching is an internal cost lever, invisible to users — everything reads
"live."**

---

## 1. The model — founder's 4 tiers mapped to reality

| Tier | Intended TTL | Data | Reality in code | Verdict |
|---|---|---|---|---|
| **STATIC-ISH** | 24h+ | coin metadata, news, dev/GitHub activity | metadata 24h (`refreshUniverseDaily`), history 30d; news + dev activity = part of the **planned** conviction cache | ✅ matches |
| **SLOW-MOVING** | 1–4h | on-chain metrics, market cap | market cap/volume **ride the price doc** (5min hot / 24h full); conviction is 24–48h | ⚠️ no separate 1–4h tier — **not worth splitting** (KISS) |
| **FAST-MOVING** | 60s | prices, volume | shared `cache/universe` at **`HOT_TTL` = 5 min** (top ~1,250); client polls 60s but only re-reads the 5-min doc | ⚠️ true age is **5 min, not 60s** — accepted (C1) |
| **NEVER** | — | journal, portfolio saves, Learn | per-user Firestore, owner-only, written per op, no caching | ✅ matches |

**Two adjustments the founder accepted:** (1) prices are 5-min, not 60s — fine for a long-term
conviction tool, not a trading terminal; (2) the SLOW-MOVING "1–4h" tier isn't a separate thing —
market cap rides the price doc and conviction is 24–48h. Neither is worth added complexity.

---

## 2. How caching works today (built vs. planned)

### ✅ Built & cost-effective — the market-data layer
Everything market-facing flows through **one shared Firestore doc `cache/universe`** (~3,000 coins:
metadata + price + 24h change + volume + market cap + circulating) plus per-coin
`historyCache/{coinId}` (30-day TTL), all served behind CDN-cached `/api` endpoints
(`functions/index.js`). Refreshers: `refreshPrices` (5 min, top ~1,250 = `HOT_PAGES` 5),
`refreshUniverseDaily` (24h, full + prune). Upstream cost scales by **distinct coins held across all
users, not by user count** — the flat-cost property. Verified ~44k CoinGecko calls/mo, inside the
locked CoinGecko Lite plan (~100k/mo, D16). CDN max-age (prices 120s, search 300s, coinlist/history
86400s, config 60s) makes thousands of landing-page visitors ≈0 function calls **on deployed
Hosting** (invisible in local dev — the function runs every request).

### ✅ Built — the NEVER tier
Portfolios, coins, transactions, journal (thesis + funnel), Learn progress: per-user, owner-only by
rules, written per op, no caching. **Trade-off:** fetched once on auth into React state with **no
real-time listener** (`useAuthSession.js`) → a second device's edits aren't seen until refresh.
Addressed by C12.

### ⏳ Planned, not built — the entire AI tier (the real gap)
`convictionCache`, `getConviction`, `researchAsk`, and the per-uid AI budget counter **do not exist**
in `functions/index.js`. `ai-client.js` `askClaude()` throws by design; every AI surface (per-coin
Conviction, portfolio Pulse, Ask) renders a data-driven offline fallback. Conviction is fed by
`src/features/research/data/mock-conviction.js` stamped with a fixed `2026-06-22` date (now reads as
stale). The fail-closed output validator `functions/validate-output.js` exists and is unit-tested but
is **wired nowhere**. This is why the AI cache policy can only be locked as decisions now and built in
Wave B.

### ⚠️ Cross-cutting weakness — staleness UX
Research Overview shows an honest "Updated Xm ago"; Portfolio shows only a generic "live" with no
per-coin age. The founder's resolution (C6): don't surface ages to users at all — present everything
as "live" — but **store the freshness metadata** so it can be exposed later if the market demands it.

---

## 3. The locked decisions (C1–C12)

**C1 — Price freshness: keep 5-min, present as "live."**
The shared `cache/universe` stays at `HOT_TTL` = 5 min; the UI keeps reading "live" with no timestamp.
*Rationale:* tightening to a true 60s roughly doubles CoinGecko calls and risks the ~100k/mo Lite
budget for a freshness conviction users don't need. The mismatch was a labeling concern, not a cost
one — and the founder chose to leave the label alone. *Impact:* $0 change; no code change.

**C2 — AI cache scope: per-coin conviction is SHARED; Pulse & Ask are per-user.**
Conviction is generated **once per coin** and reused by every user (`convictionCache/{coinId}`,
server-write-only) → cost scales by **distinct coins, not users**. Pulse is per-user (uid +
portfolio-hash + timeframe); Ask is per-user and uncached. *Rationale:* this single choice is the
keystone of viable margins — it keeps AI spend bounded by the coin universe (~thousands) instead of
unbounded by signups. *Impact:* the flat-cost property for the AI tier.

**C3 — AI budget unit: a daily cold-run COUNT with a hidden token-cost circuit-breaker.**
The enforced ceiling is a **per-uid daily count of cold runs** (Starter 0 / Pro 50 / Premium 300),
with a hidden server-side token-cost breaker behind it for safety against a few giant prompts. This
resolves the three conflicting specs (daily count vs. token-cost decrement vs. monthly `aiMonthlyCents`
$-cap) in favour of the count. *Impact:* simple to reason about; the breaker prevents a runaway bill.

**C4 — Conviction TTL: Premium 24h / Pro 48h / Starter read-only.**
A cached per-coin signal is valid for the caller's tier window before a paid regeneration may fire.
Premium gets the freshest (24h), Pro 48h; **Starter never triggers a cold run** — it reads the shared
cache or ⬛. *Rationale:* concentrates AI cost on paying users while everyone benefits from the shared
cache; clean upgrade hook. *Impact:* free users are never an AI cost centre.

**C5 — TTLs are admin-editable but hard-capped.**
The TTLs (price, conviction-per-tier, Ask) are knobs in the admin panel / `config/app` doc — tune
without a redeploy — but **clamped to safe server-side min/max** (e.g. price never below 5 min,
conviction never below 12h) so a typo can't trigger a cost spike. *Rationale:* "I choose the settings"
+ a guard rail. *Impact:* operational control without a foot-gun. Mirrors the `min(config, hardMax)`
clamp pattern already used for plan limits (#20).

**C6 — Freshness is internal: present "live," store the metadata.**
No user-facing freshness dates and no user-facing budget meter — TTLs and budget are the founder's
internal cost levers. **But** every cache doc stamps a hidden `cachedAt` / `asOf`, so freshness *can*
be surfaced later behind a flag without re-architecting ("in case it changes tomorrow and I need to
show it to users"). *Impact:* clean UI now, future-proof.

**C7 — The user-facing AI meter is hidden → admin-only.**
The existing user AI-allowance meter (built in U9) is removed from the user UI; usage and cost live in
an **admin dashboard**. Users see "AI: live" and just use the product; the budget is a business lever
the founder manages. *Impact:* changes U9 + supersedes the BL-6/D13 "coming soon until metered" line
(now: never user-facing).

**C8 — News allowlist: an admin-managed CRUD list, seeded, wired to the conviction axes.**
The news-domain allowlist becomes an **admin panel CRUD surface** (add/delete domains), seeded with a
founder-approved default set, and **wired to the Founders & Community conviction axes** (and Ask's
sources, C10). *Rationale:* turns the previously deferred/un-owned allowlist into an owned, operable
control — otherwise two of four conviction axes ship permanently ⬛. *Impact:* lights up half the
rubric; the founder controls which sources count.

**C9 — Editing the allowlist invalidates conviction LAZILY.**
Changing the allowlist marks conviction stale; each coin **regenerates only when next viewed** — no
eager burst of paid cold runs across all held coins. *Rationale:* spreads cost over time; popular
coins refresh fast, coins nobody views never cost anything. *Impact:* an admin edit can't produce a
surprise Claude bill.

**C10 — Ask reuses the shared caches + a sources allowlist.**
The Ask chatbot reads the same cached conviction / price / news data and **cites only allowlisted
domains** — no fresh fetch per question. *Rationale:* cheap, consistent, and answers stay within what
has already been paid to cache. *Impact:* Ask cost ≈ one Claude turn, no extra data fetches.

**C11 — Abuse guards are built ALONGSIDE the AI proxy.**
The per-uid rate limiter + `context.app` App Check gate (BL-1 / B2) ship in the same Wave B push as
the proxy, before any real exposure. *Rationale:* every **novel** coin added triggers one paid cold
run, so without a per-uid add-limiter + App Check a bot could spam coin-adds (up to the 1,000 clamp)
and drain the AI budget. *Impact:* closes a launch-day cost-drain vector. (Already mandated by
#20 / D4 / D5; this confirms the sequencing.)

**C12 — Multi-device sync: real-time listeners on user-owned data.**
Replace fetch-once-on-auth with `onSnapshot` listeners on the user's portfolios / coins / journal /
Learn so a second device's edits appear live. *Rationale:* the founder chose full live sync over the
KISS fetch-once default. *Impact:* better correctness; modest extra Firestore reads, **bounded** to
owner-only docs (no fan-out risk).

---

## 4. Gaps & fixes — prioritized build order

Detail + checkboxes in [`NEXT-STEPS.md`](NEXT-STEPS.md) §C. Ranked by leverage.

### 🟢 Now — local-buildable + emulator-verifiable (no keys needed)
- **Remove the stale `2026-06-22` mock conviction date** (`mock-conviction.js`) — it actively
  misleads today. Quick. (C6 hygiene.)
- **Add eviction to the client history cache** (`useCoinHistory.js` `_cache` Map — currently
  unbounded session growth; LRU-cap ~50 coins). (Memory hygiene.)
- **Multi-device listeners** — convert fetch-once → `onSnapshot` on owner-only data. (C12.)
- **Hide the user-facing AI meter** (U9) — remove from the user UI now; the admin usage view lands
  with the B2 counter. (C7.)

### 🔴 Wave B P0 — must land *with* the AI proxy (cost-safety / no raw AI leak)
- **Wire `validate-output.js` fail-closed inside the proxy** (B2) before any client body-swap (B4).
  Define its error contract: throw → offline fallback, **never** show held-back text. (Re-sequence
  already in §0; restated here because it's the highest-consequence line.)
- **Per-uid daily AI budget** (count + hidden token-cost breaker), server-enforced. (C3 / BL-1.)
- **App Check + `addCoinGuarded`** per-uid limiter. (C11 / B3.)

### 🟠 Wave B P1 — the AI cache layer itself
- **`convictionCache/{coinId}` + `getConviction`** with tiered read-time TTL (C4), TTLs
  **admin-editable + hard-capped** (C5), and **lazy invalidation** on allowlist edit (C9). Stamp
  hidden `cachedAt`/`asOf` (C6). (Extends B5.)
- **News allowlist admin CRUD + seed + frontend wiring** to Founders & Community (C8). (Extends B5 +
  BL-2 D10.)
- **Per-user Pulse cache** (uid + portfolio-hash + tf); **Ask** wired to shared caches + sources
  allowlist (C10). (Extends B6.)
- **Admin AI usage/cost dashboard** — where the hidden meter lives (C7). (With the B2 counter.)

### ⚪ Deferred / low-leverage
- **PWA offline AI store** (B8) — pick IndexedDB, reuse the existing offline-price storage pattern.
- **Surfacing "as of" to users** — capability built (metadata stored, C6), display deferred until the
  founder decides to show it.
- **Splitting market-cap onto its own SLOW-MOVING TTL** — skipped (KISS) unless a real need appears.

---

## 5. Design principle (the through-line)

> **Cache freshness is an internal cost lever, not a user concern — but store the metadata anyway so
> you're prepared for tomorrow.**

Everything reads "live" to the user. The TTLs, the budget, the cache ages — those are the founder's
dials, set in admin, clamped so they can't be set dangerously. The timestamps are recorded in every
cache doc behind a hidden flag, so the day the market demands visible freshness, it's a flag flip, not
a re-architecture.

---

## Cross-references
- Build order + increments: [`NEXT-STEPS.md`](NEXT-STEPS.md) §C (and the refined §0 Wave B / §BL items).
- Product/AI/pricing decisions: [`PRODUCT-DECISIONS.md`](PRODUCT-DECISIONS.md).
- Backend/admin workflow + go-live: [`BACKEND-ADMIN-DECISIONS.md`](BACKEND-ADMIN-DECISIONS.md).
- How the shared universe + `/api` proxy work today: [`CLAUDE.md`](CLAUDE.md) "Known notes" + §1.1 of
  BACKEND-ADMIN-DECISIONS.
- Reusable patterns: the `firebase-saas-starter` skill (cached proxy / flat-cost) + `secure-by-design`.
