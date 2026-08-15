# Caching policy

Part of [Product decisions](PRODUCT-DECISIONS.md) — the caching, freshness, and cost-control clause.

CryptoIdea caches market data behind one shared, CDN-fronted proxy so upstream cost stays flat regardless of how many users sign up, keeps per-user data uncached, and treats cache freshness as an internal cost lever that never surfaces to users.

## North star

Caching is an internal cost lever, invisible to users — everything reads "live". Every cache doc still stamps hidden freshness metadata (`at` / `updatedAt`), so an "as of" timestamp can be surfaced later behind a flag without re-architecting.

The architectural statement of the flat-cost proxy is [ARCHITECTURE.md](ARCHITECTURE.md) rule ARCH-11; the AI budget model is [AI.md](../product/AI.md).

## The tier model

The cache falls into four bands, mapped to what the code actually does:

- **Static-ish (24h+)** — coin metadata and price history. Metadata refreshes daily (`refreshUniverseDaily`); per-coin history lives in `historyCache/{coinId}` with a 30-day TTL (`HISTORY_TTL`), since past price data never changes.
- **Slow-moving** — market cap, 24h volume, circulating supply. These ride the price doc rather than getting their own tier (KISS); there is no separate 1–4h band.
- **Fast-moving** — prices and 24h change. Served from the shared `cache/universe` doc at a 5-minute freshness window (`HOT_TTL`). Clients poll more frequently but only ever re-read the 5-minute doc. This is presented to users as "live"; the true age is 5 minutes, which suits a long-term conviction tool rather than a trading terminal.
- **Never** — journals, portfolios, transactions, Learn progress. Per-user Firestore, owner-only by rules, written per operation, never cached.

## The market-data layer (flat cost)

Everything market-facing flows through one shared Firestore doc, `cache/universe`, holding roughly 3,000 coins (`UNIVERSE_PAGES` = 12 pages of 250): metadata plus price, 24h change, 24h volume, market cap, market-cap rank, and circulating supply. Two scheduled refreshers keep it fresh:

- `refreshPrices` runs every 5 minutes and refreshes only the hot set — the top ~1,250 coins (`HOT_PAGES` = 5), always merged back.
- `refreshUniverseDaily` runs every 24h, refreshes the full ~3,000 coins, prunes delisted coins, and also sweeps `historyCache` docs older than `HISTORY_TTL`.

A stale long-tail or off-list held coin is refetched on demand and folded back into the doc (metadata preserved). A separate `cache/trending` doc backs the Search tab's trending list on a ~30-minute lazy TTL.

Every CoinGecko request goes through a single choke point, `cgFetch`, which is where the `marketData` kill-switch is enforced — turning it off stops all upstream calls while the caches keep serving. A build-time test fails if any code path calls CoinGecko outside `cgFetch`.

The proxy is fronted by CDN cache headers so a deployed page serves thousands of visitors at near-zero function invocations (this is a deployed-Hosting behavior; the local dev server runs the function on every request):

- `/api/prices` — `max-age=120`
- `/api/search` and `/api/trending` — `max-age=300`
- `/api/coinlist` and `/api/history` — `max-age=86400`
- `/api/config` — `max-age=60`

A failed history fetch is negative-cached for 1h (`HISTORY_NEG_TTL`) so a real-but-unavailable coin is not re-fetched on every request (a denial-of-wallet guard).

**Flat-cost property:** upstream cost scales by the number of distinct coins held across all users, not by user count. Measured at roughly 44k CoinGecko calls per month, comfortably inside the CoinGecko Lite plan's ~100k/month. Raising `HOT_PAGES` widens the hot set at higher call cost; lowering it saves calls.

**Single-doc guard:** `cache/universe` is one Firestore doc approaching the 1 MiB document limit at ~3,000 coins. The write is guarded so growth past a safe threshold trims the lowest-rank tail and alerts rather than throwing — a throw would break prices for both the app and the DCA calculator at once. Sharding is deferred until a real need for a much larger universe appears.

## The AI budget tier

Live AI is off by default; the Research tab renders deterministic, data-driven summaries with no LLM call (see [AI.md](../product/AI.md)). The cost machinery for when it is enabled is built but dormant.

- **App-wide monthly cap.** A single global spend ceiling lives at `config/app.ai.monthlyCapCents` (default 5000 = $50/month), editable from the admin Settings AI card and clamped server-side. It is metered on a server-only `aiBudget/{YYYY-MM}` ledger doc (rules deny all client access), where the month key is the doc id so entries sort chronologically with no index. Pure helpers in `functions/ai-cost.js` round token usage to cents, accrue the month's spend transactionally, and refuse once the cap is reached. This app-wide pool is distinct from the per-user monthly ceilings described in [PRICING.md](PRICING.md).
- **Provider-agnostic proxy.** The AI research callable generates with a generation model and screens each candidate with a smaller judge model, both reached through the AI provider behind a server-side key that never ships to the client. Every candidate response passes `validate-output.js` — a fail-closed regex prefilter plus a stricter model judge that blocks names, price targets, advice, and aggregate scores before any text reaches the client. The system prompt is not treated as a control; the validator is.
- **Fail-closed gating.** A budget read that fails is treated as "over budget", never as free spend; generation is additionally gated behind the `aiResearch` kill-switch, a present API key, a per-user daily budget, and the app-wide monthly cap — all checked before the provider is called.

### AI cache design (locked, mostly unbuilt)

When the AI tier is turned on it follows these locked decisions:

- **Per-coin conviction is shared, Pulse and Ask are per-user.** A coin's conviction signal is generated once and reused by every viewer (a server-write-only per-coin cache), so AI spend scales by distinct coins, not signups — the flat-cost property for the AI tier. Portfolio Pulse is keyed per user (uid + portfolio hash + timeframe); Ask is per-user and uncached.
- **Tiered read-time TTL.** A cached per-coin signal is valid for the caller's tier window before a paid regeneration may fire — the higher tier gets the fresher window, and the free tier never triggers a cold run (it reads the shared cache or shows the empty state).
- **Admin-editable, hard-capped TTLs.** Freshness windows are admin knobs on `config/app`, tunable without a redeploy but clamped to safe server-side minimums so a typo cannot cause a cost spike.
- **Lazy invalidation.** Editing the news-source allowlist marks conviction stale, and each coin regenerates only when next viewed — no eager burst of paid cold runs.
- **Abuse guards ship with the proxy.** A per-user rate limiter and App Check gate land in the same push as the proxy, since each novel coin add can trigger one paid cold run.
- **Budget resets at UTC midnight**, keyed by a stored UTC day key.
- **Internal, not user-facing.** There is no user-facing freshness date and no user-facing budget meter; usage and cost live in the admin dashboard.

## Multi-device sync

The Never tier uses real-time listeners (`watchPortfolios` / `watchCoins` / `watchLearnProgress`) on owner-only data, so a second device's edits appear live without a reload — bounded to per-user docs with no fan-out.

## See also

- [Documentation index](../INDEX.md)
- [Product decisions](PRODUCT-DECISIONS.md)
- [Architecture](ARCHITECTURE.md) — ARCH-11, the flat-cost proxy
- [AI status and roadmap](../product/AI.md) — the AI budget tier
- [Pricing](PRICING.md) — per-user AI ceilings
- [DCA calculator](../product/CALCULATOR.md) — the other consumer of the shared universe
