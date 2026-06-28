# Crypto Idea — Product Backlog (Next Steps)

> This is the **prioritized product backlog** for our [Agile workflow](AGILE.md): top = next.
> Each item is a small, shippable increment finished to the **Definition of Done** in AGILE.md.
> The architecture refactor (§1) is complete. The current priority is the **2026-06-22 product
> direction** (§0, canonical: [`PRODUCT-DECISIONS.md`](PRODUCT-DECISIONS.md)) — finish the conviction
> engine, Learn, and the tier reconfig behind a secure AI proxy. Go-live tasks (§4) follow.

See also: [`AGILE.md`](AGILE.md) (how we work + Definition of Done),
[`src/ARCHITECTURE.md`](src/ARCHITECTURE.md) (layer rules + migration detail),
[`README.md`](README.md) (backend/proxy/deploy), [`CLAUDE.md`](CLAUDE.md) (conventions).

---

## 0. Product direction — 2026-06-22 build roadmap  (NEXT — top priority)

Canonical decisions: [`PRODUCT-DECISIONS.md`](PRODUCT-DECISIONS.md) (28 decisions; §8 settled
2026-06-22). Planning docs reconciled in [`docs/planning/`](docs/planning/). **This section is the
authoritative build order**, grounded in a full codebase audit (the audit notes are inline so the
order can't silently drift back to the stale spec).

§0 splits along ONE hard external boundary — the **Blaze plan + live API keys**:
- **Wave A — local-first:** fully buildable AND verifiable on the existing emulator stack now.
- **Wave B — Blaze + keys:** build the code + the offline-degrade path now; the live LLM path is
  only verifiable at go-live. Each Wave-B increment's DoD includes *"verified the offline fallback
  still works with keys unset"* so a green local suite is never mistaken for a verified live path.

**Locked numbers (2026-06-22 interview follow-up):** Premium ceiling **1,000 coins/portfolio** (the
*identical literal* in `DEFAULT_PLANS` + the `firestore.rules` hard clamp) · keep tx caps (Pro 2,000 /
Premium 5,000) · add-coin anti-abuse = **`addCoinGuarded` callable** · live-AI budget **Starter
offline · Pro 50 · Premium 300 per day** (durable per-uid Firestore counter) · news allowlist
**deferred** (Founders/Community show ⬛ until domains are supplied) · regen cap **N = 2** · App Check
**v1 manual `context.app`**, prod-flag gated · Claude/Gemini model ids resolved via the `claude-api`
skill at code time (never hardcoded from memory).

**Two separate caches (do NOT conflate):**
- **Prices — untiered, live for all.** The existing shared CoinGecko proxy (`cache/universe`: top
  ~1,250 @ 5 min, ~3,000 daily, history CDN-cached) serves the SAME fresh prices to every tier,
  Starter included. Prices are **never a tier lever** (flat-cost shared cache + this is a long-term
  conviction tool, not a trading app). Tier value = AI layer + capacity (coins/portfolios), not price speed.
- **AI conviction — shared per-coin, on-demand only, read-time TTL by tier.** One shared
  `convictionCache/{coinId}` doc, generated ONCE per coin and amortized across all users (**never
  per-user generation**). **On-demand only — no scheduled refresh job.** Pro/Premium can trigger a
  (re)generation for **any coin (held or searched), at any rank** when the cached entry exceeds their
  tier TTL — **Premium 24h · Pro 48h**; **Starter is read-only** (never triggers → reads the shared
  cache or ⬛). **No rank gate** — the daily budget (50 / 300 cold runs) + TTL are the only limiters,
  and a held coin always gets a lookup. Cache hits are free. Every user's PWA keeps a **local offline
  copy** of viewed coins (stamped "as of DATE"). **⬛ = insufficient-data is a *finding*, not a gap** —
  shown with a per-axis reason chip (`no public repo` / `no coverage` / `anonymous team`) and taught in
  Learn as a caution flag; **rank does not cause ⬛, thin sources do** (CoinGecko dev/community data +
  GitHub reach most of the ~3,000-coin universe; the realistic ⬛ frontier is the universe edge, not
  rank 500/1,250). **Accepted consequence:** Starter sees ⬛ for any coin no paid user has warmed (→
  "upgrade to check this coin" hook). NB: with the news allowlist deferred, Founders + Community are ⬛
  for *all* coins (incl. BTC) until domains are supplied — that's the allowlist, not rank.
- **Pulse / tutor** are per-user (not per-coin): cached per (uid + portfolio-hash + tf) with a TTL,
  live only for Pro/Premium within the daily budget; Starter gets the data-driven offline summary.

### The one critical re-sequence
`0d` (the output validator) is **NOT** a later epic. [`ai-client.js`](src/features/research/api/ai-client.js)
is a single throwing stub — the instant the `0b` proxy swaps its body, raw LLM prose reaches the UI
with no filter. So: **build `validateOutput()` first (A9), wire it INSIDE the `0b` proxy (B2), and it
must be green BEFORE the client body-swap (B4).** No un-validated LLM output may ever reach the screen.

### Four "looks-done-but-isn't" traps (audited — must be honored)
1. **#20 hard ceiling is unenforced today.** `firestore.rules` `configuredLimit()` returns the
   configured number with **no clamp**, and the existing "configured limits override defaults" test
   *proves* config beats defaults. Add a literal `min(config, 1000)` clamp in the rule (mirrored in
   `mergePlans`); the new test must set config *above* 1,000 and still reject. A finite *default* is
   not a ceiling. ✅ **Resolved in A1** — `configuredLimit` clamps to a per-key `hardMax` (coins 1,000),
   mirrored by `mergePlans`; the rules test sets premium coins config to 5,000 and is still rejected at
   the 1,001st coin.
2. **App Check is decoration.** Zero server-side `context.app` checks exist (uniformly v1 `onCall`).
   Build the gate ONCE (B2) and reuse it for the add-coin callable (B3) — don't build it twice.
3. **#17 + a free Gemini key = a privacy violation that compiles.** Gemini's free tier trains on
   inputs; #17 sends journal text raw. The no-train **paid** key + the privacy disclosure must ship
   in the SAME commit as any journal-raw code; assert the no-train requirement at the call site.
4. **Stale `dist/` still ships the named investors.** `0g`'s DoD = `npm run build` then grep `dist/`
   for the names → expect zero hits (a build-time guard test). ✅ **Resolved in A2** —
   `scripts/check-dist-names.js` (case-sensitive whole-word) runs inside `build` and fails it on any hit.

Plus the highest-consequence line in the build: the validator must **fail CLOSED** (judge
error/timeout or regen-cap-reached → safe fallback, never the violating text) — the opposite of the
usual "degrade to showing something" instinct, and easy to get subtly wrong.

### Wave A — local-first (ship + fully test on the emulator now)
- [x] **A1 · 0a-core (#19/#20):** ✅ DONE 2026-06-23 — `DEFAULT_PLANS`+`mergePlans` (functions) → Pro
  3/50 · Premium 15/**1000** (Starter 1/10 unchanged); `firestore.rules` defaults updated **+ the hard
  clamp** (`configuredLimit` per-key `hardMax`; coins clamped to 1,000, mirrored by `mergePlans`
  `Math.min(coins,1000)`); Free→**Starter** LABEL only (internal key stays `free`) across
  admin-dashboard / Login / CryptoIdea / index.html + all limit mirrors (useUpgrade, useAdminDashboard);
  removed a dead stale `MAX_COINS=200` const. New `test:rules` cases prove pro-50 and the clamp (config
  5,000 → still rejected at the 1,001st coin); diagram updated. An adversarial audit confirmed the clamp
  airtight server-side (per-user `premiumLimits` is client-display-only — no rule reads it).
  **Verified:** rules 14 · unit 134 · integration 6 · build clean.
- [x] **A2 · 0g-copy (#4/#24):** ✅ DONE 2026-06-23 — de-named `Learn.jsx` (module sub + disclaimer),
  replaced the Graham landing pull-quote with a first-party anti-FOMO line ("The coins that hurt most
  are the ones you couldn't explain."), and polished the Login tagline → "Know why you own every coin."
  Build-time `dist/` name-guard (`scripts/check-dist-names.js`, case-sensitive whole-word, pure matcher
  unit-tested) wired into `npm run build` so a leaked name FAILS the build (trap 4).
- [x] **A3 · enabler:** ✅ DONE 2026-06-23 — verified the forwarded coins carry `journal` end-to-end
  (`getCoins` returns it; `Research.jsx` passes the full `portfolio` to `ResearchTab`). The only loss
  was `holdingsFromCoins` (research `utils/coins.js`) dropping it in the holdings transform — now
  preserved (present-only); `computePortfolio`'s `...h` already carries it through to
  `portfolio.holdings`, so it reaches `ResearchTab`'s consumers (the future #17 AI context + 0d
  allowlist). Tests: `research-adapters` adds journal-preservation + a `computePortfolio`
  pass-through guard. **Verified:** unit 136 · build clean.
- [x] **A4 · 0f-persist (#23):** ✅ DONE 2026-06-23 — `users/{uid}/learn/progress` doc +
  `validLearnProgress()` rule (owner-only; bounded+typed `{xp, streak, lastActivity, completedLessons[],
  updatedAt}`, `hasOnly` blocks junk keys) + `getLearnProgress`/`saveLearnProgress` (mirror the journal;
  zeroed default for a fresh learner). Persistence only — UI wiring is A5; level/badges/module-state are
  *derived*, not stored. Tests: `test:rules` (owner write/read; stranger + malformed rejected) +
  `test:integration` (default → save → read-back). **Verified:** rules 15 · integration 7 · unit 136 ·
  build clean.
- [x] **A5 · 0f-logic (#25):** ✅ DONE 2026-06-23 — pure `utils/learn.js` (levelFromXp / streakOn /
  completeLesson / moduleStates / nextLesson, all unit-tested) + `useLearn` hook (loads A4 progress,
  persists **quiz-gated** completions, degrades gracefully when signed out) + `Learn.jsx` fully wired
  (real level/XP/streak/badges/module-state, sequential module unlock, quiz-gated lesson overlay). Seed
  content in `src/data/learn-content.js` (2 modules / 4 real lessons, no-names voice) — **A7 expands** to
  ~9 modules / ~50 lessons. Tests: unit pure (16) + hook (4) + component (3); walkthrough/smoke updated.
  **Verified:** unit 159 · build clean.
- [x] **A6 · 0f-journal-widen (#27):** ✅ DONE 2026-06-24 — `validJournal` now allows an OPTIONAL
  bounded `funnel{dilution,volume,yield}` (new `validFunnel`: each field optional string ≤2000,
  `hasOnly` blocks junk keys, whole funnel optional → backward-compatible). The three manual-research
  findings are captured as inputs on BOTH surfaces (Search Buy-Journal + Journal detail overlay,
  editable since the checks happen over time); single source of truth for the fields/copy in
  `src/data/journal-funnel.js`, pure `cleanFunnel` (`utils/journal.js`) drops empties so an all-empty
  funnel persists no key. New `saveFunnel` handler mirrors `reviewThesis`. Tests: rules (valid/partial
  accepted, **no-funnel still valid**, oversized/unknown-key/non-string rejected), integration
  (write→read→clear round-trip + no-funnel back-compat), unit (cleanFunnel + Search capture + Journal
  edit). **Verified:** unit 168 · rules 16 · integration 8 · build clean.
- [x] **A7 · 0f-content (#23/#24):** ✅ DONE 2026-06-24 — authored the full **9-module / 50-lesson**
  Learn library, **no-names** voice, hand-authored quizzes. Split one file per module under
  `src/data/learn/` (markets · fundamentals · tokenomics · demand · yield · risk · psychology ·
  security · thesis); `learn-content.js` is now the composing index. The A5 seed lessons
  (markets-1/2, fundamentals-1/2) are preserved verbatim (test-locked). Curriculum maps to the app:
  the #27 manual checks (dilution/volume/yield) + the #26 funnel↔signals bridge are taught explicitly
  (`thesis-1`). Test `tests/unit/learn-content.test.js`: 9 modules/50 lessons, every lesson has 4
  options + an in-range `correctIdx`, unique ids, **no author names** (reuses the build's
  `findForbiddenNames` guard so the list can't drift), and varied answer positions. **Verified:**
  unit 176 · build clean (name-guard passing).
- [x] **A8 · 0c-pure (#8/#9/#11):** ✅ DONE 2026-06-24 — pure rubric reducer
  `src/features/research/utils/conviction.js` (`reduceAxis` / `activeCatalysts` / `computeConviction`):
  the **≥2-source accuracy gate** (#8 — fewer corroborating sources → ⬛, never a single-source guess),
  the **4-state rubric** (#9 — all-good→🟢, conflict/any-mixed→🟡, corroborated-bad/dead→🔴, thin→⬛
  with a per-axis **reason chip**, never a silent blank), and **catalyst auto-expiry + as-of date**
  (#11). The 4-state pills in `CoinCard.jsx` are lit from it, driven by a deterministic **mock seam**
  (`data/mock-conviction.js`) that swaps for the live per-coin cache in one place at Wave B; the #26
  funnel↔signals bridge note renders with the pills. Tests: `tests/unit/conviction.test.js`
  (single-source→⬛, thin→⬛, conflict→🟡, any-mixed→🟡, corroborated-bad→🔴, catalyst expiry, all-⬛
  degrade, mock determinism) + `CoinCard.test.jsx` (pills + ⬛ reason chip + catalyst). **Verified:**
  unit 194 · build clean.
- [x] **A9 · 0d-pure (#14/#15/#16):** ✅ DONE 2026-06-24 — `functions/validate-output.js` (server-side,
  CommonJS, **not** in the client bundle): `validateOutput(text, {allowedNames})` blocks unmentioned
  project names/tickers/cashtags (BTC/ETH/SOL excepted), price targets/valuations/multiples,
  buy/sell/hold advice + rating labels, %-/word-fraction allocation, and any aggregate score/grade —
  with a **de-obfuscation pass** (`b*u*y`, `B U Y`, `` `buy` ``). **Fails closed** (empty/garbage →
  invalid); `selectValidated()` encodes the **N=2** regen cap → safe fallback, never the violating
  text. Tests `tests/unit/validate-output.test.js` (23): per-category block/allow + fail-closed + the
  N=2 cap (incl. a clean candidate *beyond* the cap is NOT reached) + a **red-team regression set**
  (a 6-agent / 63-probe adversarial sweep; the prefilter blocks 58/63 with **zero false positives**,
  the 5 it defers — English-word names like Avalanche/Near/Maker, a bare "solid 8", a slang adverb —
  are by design the B2 LLM judge's job, per #15). **Verified:** unit 217 · build clean. Consumed in B2.

**✅ Wave A (local-first) COMPLETE — A1–A9 all done.** Everything buildable + verifiable on the
emulator stack is shipped: the tier reconfig + hard clamp, the no-names voice + dist guard, the
journal/funnel + Learn library, the conviction rubric, and the fail-closed output validator. What
remains (Wave B below) needs the **Blaze plan + live API keys** — the secure AI proxy that wires the
validator (A9) in and body-swaps `ai-client.js`. Build order for Wave B is unchanged: B1 → B2 (keystone,
validator wired + App Check + rate limit) → B3 → B4 (the gated body-swap) → B5/B6/B7/B8.

### Wave B — Blaze + keys (code + offline-degrade now; verify live at go-live)
- [ ] **B1 · 0b-secret-store:** Anthropic + Gemini keys in the locked `config/app` doc + admin
  Settings fields (set-flags only, `keep()` idiom). The Gemini key **must be a paid no-train key**
  (trap 3) — document it in `functions/.env.example` + README.
- [ ] **B2 · 0b-proxy (KEYSTONE, extends N-3):** `researchAsk` callable — Claude (prose) / Gemini
  (structured) **+ `validateOutput` (A9) wired in, fail-closed** + per-uid **Firestore** rate limiter
  (Pro 50 / Premium 300 per day) + **`context.app` App Check gate** (v1, prod-flag) + server-side
  tier-gate. Extract guard/budget/validator logic as pure helpers and unit-test them.
- [ ] **B3 · 0a-antiabuse (#20):** `addCoinGuarded` callable — **reuses B2's per-uid limiter + App
  Check gate**; the client write path routes through it. Closes #20's rate-limit + the write-path App
  Check. Integration throttle test (rapid adds → `resource-exhausted`).
- [ ] **B4 · 0b-swap:** swap the `ai-client.js` body to call `researchAsk` (keep the *resolve-string /
  reject* contract so the hooks' offline fallback survives). **LAST step, gated on A9 + B2 green.**
  Lights up Pulse AND Ask at once. Decide the validator's return contract first (throw → offline note,
  vs a distinct "we held this back" payload — currently undefined).
- [ ] **B5 · 0c-live (#6/#7/#10/#17):** GitHub / news-allowlist / CoinGecko-fundamentals fetchers (the
  LLM never web-searches) + `getConviction(coinId)` callable backed by the shared per-coin
  `convictionCache/{cgId}` (server-write-only). **On-demand only — no scheduler;** the callable
  (re)generates only when a Pro/Premium caller's tier TTL is exceeded (**Premium 24h · Pro 48h**),
  else serves the cached doc; **Starter is read-only** (never triggers → cached doc or ⬛). **No rank
  gate** — any coin (held or searched), any rank; budget + TTL are the only limiters. Cold runs charge
  the daily budget; cache hits are free. Emit **per-axis ⬛ with a reason** (`no public repo` / `no
  coverage` / `anonymous team`) — ⬛ is a finding, not a blank. **#17 privacy disclosure in the same
  commit.** Extend `safeProviderOrigin()` to the allowlist (empty → Founders/Community stay ⬛). Rules
  test: clients can't read the cache doc.
- [ ] **B6 · 0e-live (#11/#12):** Pulse as its OWN AI surface — **per-user cache** (uid +
  portfolio-hash + tf) with a TTL, tier-gate (live for Pro/Premium; Starter = data-driven offline
  summary), validator + "as of DATE". (Pulse & Ask share the seam but keep separate caches/gates.)
- [ ] **B8 · offline copy (PWA):** persist each user's *viewed* conviction + Pulse results to the PWA
  local store, shown stamped "as of DATE" when offline or during a backend outage. Mirrors the
  existing price offline-fallback; per-user local mirror only (no extra generation).
- [ ] **B7 · 0f-tutor (#21):** Premium templated tutor — **template-first** ({coin}-substitution, zero
  LLM cost); any live elaboration is optional, gated to Premium, and routed through the validator.

### Gaps to track (not yet owned by an increment)
- **#1 (the moat):** no end-to-end test that *Journal thesis → conviction signals → Learn framework*
  connect for a user. Add a walkthrough seam test once A4–A8 land.
- **#2 responsive:** add *"verify mobile + desktop layout"* to the DoD of every UI increment (A8 pills,
  A5 Learn, B6 Pulse) — manual narrow-viewport check, no automated visual test exists.
- **#26 bridge copy** ("these signals cover steps 1–2; you apply 3–5") — make it a tested deliverable
  wherever signals/funnel fields render (easy to omit on one surface).
- **Diagrams:** A1 updates `authorization-and-tier-limits.svg`; the AI proxy / conviction engine /
  Learn surfaces are **undiagrammed** — each needs a new `docs/diagrams/` SVG (use `drawing-diagram`).

### Still genuinely open (does NOT block Wave A)
- ~~CoinGecko plan tier under on-demand engine load~~ **DECIDED 2026-06-27: CoinGecko Lite (~100k/mo), keep `HOT_PAGES=5`** (see [`BACKEND-ADMIN-DECISIONS.md`](BACKEND-ADMIN-DECISIONS.md) D16).
- ~~Which model runs the `0d` judge~~ **DECIDED 2026-06-27: Claude only (Opus 4.8)** for both prose and structured — there is no Gemini, which **voids trap #3** (the Gemini no-train key requirement). See D17.

---

## BL. Backend & admin go-live — 2026-06-27 deep-dive + decisions

Canonical: [`BACKEND-ADMIN-DECISIONS.md`](BACKEND-ADMIN-DECISIONS.md) (full workflow map, 27-gap inventory,
18 locked decisions D1–D18, founder provisioning checklist). A 14-agent codebase audit found the gaps; the
founder interview locked scope. **Founder chose the full secure path:** live AI in v1, server-enforced
signups, admin 2FA. This section is the **build order** for those decisions; it composes with §0 Wave B and
§U Wave B (shared App Check / Identity Platform). Each item = a small increment to the AGILE.md Definition of Done.

### BL-1 · Security foundation (local-buildable; build once, reuse everywhere)
- [ ] **Shared per-uid rate limiter (Firestore) + `context.app` App Check gate** as pure, unit-tested helpers
  (D4/D5). This is the **same per-uid budget mechanism** the AI proxy needs (50/300 daily) and the addCoin
  guard reuses — build it here, not three times.
- [ ] **PayPal webhook idempotency** — store each processed `event.id`, skip duplicates (D6). Same commit:
  fix `serverTimestamp()`→`Date.now()` (it's `undefined` in the emulator and types the field as a Timestamp
  while everything else is ms), and **persist the billing cycle** so annual revenue in `getStats` is correct.
- [ ] **`createSubscription` already-paid guard + per-uid cooldown** (D5) — block spam/duplicate subs.
- [ ] **Audit expansion** — `writeAudit` on `deleteMyAccount`/`restoreMyAccount`/`signOutEverywhere`/
  `exportMyData`/`createSubscription`/`cancelSubscription` (D11).
- [ ] **Quick admin fixes** (no decision needed): `lookupUser` returns `tierBeforeFailure` + `premiumLimits`
  (+ `emailVerified`) so the "last paid tier" note + limits-editor pre-fill actually populate; fix the
  premium custom-limit-`0` falsy bug (`||` → `!=null`, mirror the rules); give `getStats` a distinct error
  state (don't render a failure as a real all-zero/$0 dashboard).

### BL-2 · Admin panel capabilities
- [ ] **Grant/revoke admin UI** — wrapper for the existing `setAdminClaim`, gated behind a confirm step + the
  new admin MFA (D7). Closes the "lose a co-admin → need a terminal + service-account key" trap.
- [ ] **Admin soft-delete + Empty-trash bulk action** (D8) — admin parity with the self-service 30-day trash.
- [ ] **Admin "sign out of all devices"** for a target user (admin-target `revokeRefreshTokens`) (D9).
- [ ] **Reserve the AI Settings section** — Anthropic key field (`keep()` idiom) + manual conviction-cache
  controls (invalidate / force-refresh a coin) (D10).

### BL-3 · AI proxy (Claude-only) — extends §0 Wave B; validator-first
- [ ] **B1** Anthropic (Claude) key in `config/app` + AI Settings (set-flag). **No Gemini** (D17 voids trap #3).
- [ ] **B2 (keystone)** `researchAsk` callable — Claude prose + structured + **`validateOutput` (A9) wired in,
  fail-closed** + per-uid daily budget (BL-1 limiter) + **`context.app` gate** (D4) + server tier-gate.
- [ ] **B3** `addCoinGuarded` — reuses the BL-1 limiter + App Check gate.
- [ ] **B4** swap `ai-client.js` body → `researchAsk` (gated on A9 + B2 green); lights up Pulse + Ask and
  **flips the AI "coming soon" label → the real metered number** (D13).
- [ ] **B5–B7/B8** per-coin `convictionCache` + `getConviction` (on-demand, TTL by tier), Pulse per-user
  cache, PWA offline copy, templated tutor (as §0 Wave B, Claude-only).

### BL-4 · Identity Platform hardening (needs Blaze + console)
- [ ] **U14** `beforeCreate` blocking function enforcing `signupsEnabled` server-side + IP rate-limit; enable
  App Check enforcement in console (D2/D4).
- [ ] **U13** server password policy (Identity Platform require-mode).
- [ ] **U15** admin MFA (TOTP enrollment + challenge in the admin app) (D3) — **gates BL-2's grant UI**.

### BL-5 · Transactional email + legal/analytics + CSP
- [ ] **GetResponse transactional path** (welcome / verification / receipts) — makes `email.fromEmail` real
  (D14/D15/D18). Confirm the GetResponse plan supports transactional/SMTP.
- [ ] **Termly (3 IDs) + cookie banner + Plausible** into Settings; verify privacy/terms pages (D18).
- [ ] **Drop `unsafe-inline`** — move inline landing/site-meta scripts to external/hashed files (D12).

### BL-6 · Display honesty + docs cleanup (quick; can run early)
- [ ] AI allowance line "coming soon" until metered + fix the raw-`aiMonthlyCents` print (D13).
- [ ] Keep `email.fromEmail` labeled "reserved / not yet used" until BL-5 (D14).
- [ ] Fix stale `functions:config:set` docs (done in §4 above); confirm `.env` + service-account JSON are
  git-ignored before any remote is added.

### BL — minor/optional hardening (low, undecided)
- Lock `/api/subscribe` CORS to own-origin (read proxy can stay open).
- Optional periodic `/api/config` re-poll so maintenance mode evacuates already-open sessions.
- In-app "estimated price" signal when CoinGecko degrades (moot once Lite is bought; keeps resilience honest).

---

## U. User accounts & settings — 2026-06-24 build roadmap  (parallel track)

Canonical specs: [`USER-CREATION.md`](USER-CREATION.md) + [`USER-SETTINGS.md`](USER-SETTINGS.md)
(26-gap audit, 12 founder-locked decisions, 2026-06-24 interview). Reusable frameworks: the
`user-creation` + `user-settings` skills. **Runs parallel to §0** — it touches the auth /
account / settings surface, not the conviction engine; the only overlap is the go-live App
Check / MFA items (shared with §4). Same split as §0: **Wave A** = buildable + emulator-verifiable
now; **Wave B** = Blaze / Identity Platform (code now, verify at go-live).

> Build the foundation first: **U1 rules → U2 registration → the rest.** TDD per the AGILE.md
> DoD — write the `test:rules` / `test:unit` case first, never finish red. Two decisions went
> *beyond* the KISS default: **U6** builds the sign-out-everywhere revoke callable now, and
> **U11** implements `premiumLimits` end-to-end (not a stub).

> **Progress (2026-06-25): ALL of Wave A (U1–U12) is DONE** — committed; unit 238 /
> integration 10 / rules 20 all green. Includes full light/dark/system theming (U8,
> verified in-app) and `premiumLimits` end-to-end (U11, rules-enforced + clamped).
> **Remaining: only Wave B (U13–U15)** — go-live items needing Blaze + Identity Platform
> / App Check console config (not locally buildable; code sketches in USER-CREATION §6) —
> plus the deferred `currency` Intl.NumberFormat wiring. Two server callables added this
> pass — **U6 `signOutEverywhere`** and **U11 `setPremiumLimits`** — are wired +
> rules/UI/wrapper-tested; exercising the Admin-SDK writes needs a functions-emulator
> restart (new triggers register on restart), and the **U12 `tierBeforeFailure`** webhook
> path is syntax-checked but verifies live with the PayPal webhook (all go-live).

### Wave A — local-first (build + verify on the emulator now)

- [x] **U1 · rules + data model (FOUNDATION — do first):** add `validUserData()` (name 2–50),
  `validConsent()`, `validSettings()` (closed / typed / size-capped) to `firestore.rules`; add
  `premiumLimits` to the owner-update blocklist; shape-check `name` / `settings` / `consent` when
  present on create AND update. `test:rules` FIRST: happy path + every reject branch (oversized
  name, junk settings key, owner writing `premiumLimits` / `tier` / `deleted`). No data migration.
  Refs: USER-SETTINGS §4–5, USER-CREATION §4.
- [x] **U2 · atomic registration + server validation + consent:** `registerUser(email,pw,name,consent)`
  → ONE `writeBatch` (user doc + default portfolio + `portfolioCount:1`); server-side trim/bounds the
  name + email; write the `consent` record + `settings` defaults; fix the pw error `6`→`8`; add a
  `verifyEmail()` resend. Integration test: register → doc shape + consent + atomicity. USER-CREATION §2–5.
- [x] **U3 · register form (consent + skip):** Terms-required + Privacy-required checkboxes (links) +
  marketing opt-in (default off); submit gated until both required are checked; pass `consent` through.
  Add a "Skip for now / Explore Starter" button to the plan picker. Component tests (gating, default-off,
  skip nav).
- [x] **U4 · email-verify nudge:** `useAuthSession` reads `fbUser.emailVerified` → a non-blocking,
  dismissible banner + Resend on Portfolio. Hook/component tests (verified → none; unverified → banner).
- [x] **U5 · re-auth core + delete hardening (S5/S6):** one shared `confirmPassword()` helper
  (`reauthenticateWithCredential`, catch `auth/requires-recent-login`) + a reusable modal; gate
  account-delete behind **type `DELETE` + confirmPassword** in an isolated red Danger Zone. Tests:
  modal flow, wrong-pw error, delete needs both gates.
- [x] **U6 · Security tab (S7):** change-password form behind re-auth → `updatePassword` (same
  8+/Aa1+special rule); **`signOutEverywhere` callable** (`admin.auth().revokeRefreshTokens(uid)`) +
  button. Tests: unit (form) + integration (callable auth-gated + revokes).
- [x] **U7 · Profile tab (S10):** editable display name (`updateProfile` + `saveProfile`, 2–30,
  explicit Save + inline "Saved"); change-email behind re-auth via `verifyBeforeUpdateEmail` (mirror to
  Firestore only after the link is clicked, on next login — never optimistically). Component tests.
- [x] **U8 · Notifications + Appearance + Privacy tabs (S3/S4):** a `settings` save handler; **auto-save**
  toggles with inline confirm — `emailDigest` / `emailMarketing` (notifications) + marketing /
  `consentAnalytics` (privacy, withdrawable); wire `settings.theme` light/dark/system via a root class +
  CSS vars + localStorage; store `currency` (formatting deferred). Tests: toggle persists, theme applies,
  shape valid.
- [x] **U9 · tier display:** surface `aiMonthlyCents` **server-authoritatively** (add it to
  `getUserProfile`) → an AI-allowance meter in Account; usage bars read the **configured** caps
  (`site.plans`), not hardcoded numbers. Tests: meter from the server value, bars from config.
  (The enforcement counter itself is §0 B2.)
- [x] **U10 · downgrade-trim fix:** pass `site.plans` into `useUpgrade` / `trimToTier` so a downgrade
  trims to the **configured** ceiling, not the hardcoded `TIER_LIMITS` (silent data-loss bug if an admin
  raised a cap). Unit + a rules-backed test with an overridden cap.
- [x] **U11 · premiumLimits end-to-end (S8):** `setPremiumLimits` admin callable + admin UI →
  `users/{uid}.premiumLimits`; `configuredLimit()` reads per-user `premiumLimits` first for premium
  (clamped to `hardMax`, coins ≤ 1,000 — #20); Account shows "custom vs default". Replaces the dead
  `CryptoIdea.jsx:277` override. Tests: rules (override enforced + clamped; owner can't write it).
- [x] **U12 · billing resilience (S9):** an "Update payment method" link (Pro+) → the PayPal-hosted
  flow; record `tierBeforeFailure` on a PayPal failure event so the paid tier survives an auto-downgrade;
  admin "last paid tier". Tests: link visibility, webhook handler.

### Wave B — Blaze / Identity Platform (code now, verify at go-live; shared with §4)

- [ ] **U13 · server password policy:** Identity Platform require-mode (`minLength ≥ 8` + char classes,
  `forceUpgradeOnSignin`); mirror client with `validatePassword()` for inline feedback.
- [ ] **U14 · abuse prevention:** App Check enforcement (set `VITE_RECAPTCHA_SITE_KEY`, enable in the
  console) + a `beforeCreate` blocking function that enforces `signupsEnabled` **server-side** + an IP
  rate-limit. (The App Check gate is shared with §0 B2/B3 — build it once.)
- [ ] **U15 · MFA/2FA:** Identity Platform TOTP enrollment in Account; required for admins (already on
  §4). Document as roadmap until then.

### Deferred (no increment yet)
- `defaultPortfolioId` server-side default-portfolio preference (Pro+).
- Restore cooldown (`restoreLockedUntil`, 24h) against delete/restore harassment.
- In-app PayPal vault card display (last-4 / expiry) — needs the vault API + an SSRF-safe proxy.
- Full channel × category notification matrix (push / in-app + frequency + quiet hours).
- `currency` formatting wired across all price/P&L displays (`Intl.NumberFormat`).

**DoD (every U-increment):** KISS + secure; `test:unit` / `test:rules` / `test:integration` green;
re-auth on every sensitive op; verify mobile + desktop layout; no secret shipped; rules verified in
the emulator; committed with a clear message; USER-CREATION / USER-SETTINGS updated if behavior changed.

---

## 1. Frontend refactor — finish extracting `CryptoIdea.jsx`  (IN PROGRESS)

We are moving the monolithic `CryptoIdea.jsx` (~1,000 lines, was 1,559) into the
layered structure `api / hooks / components / utils`. The mechanism is proven and
test-guarded; the rest is repeatable application.

**Done:** `api/` (firebase + coingecko + config), `utils/` (format, coins, theme),
`hooks/` (useCoinSearch, useLivePrices, app-context), shared UI primitives
(`ui.jsx`, `StatusDot`), screens `Loading` + `ForgotPass`, and a Vitest test net
(`npm run test:unit`, 8 tests).

### 1a. Extract the remaining screens (one commit each, via AppContext)
Pattern per screen: add its deps to the `ctx` object in `CryptoIdea.jsx` → move its
JSX to `src/components/<Screen>.jsx` reading them via `useApp()` → render `<Screen/>`
(not `Screen()`) → add/extend a navigation test → `npm run test:unit`.

Remaining (rough size order):
- [x] `Contact` (~17 lines) — extracted to `components/Contact.jsx` (reads context); 4 isolated tests
- [x] `Search` (~35) — extracted to `components/Search.jsx`; real nav test (login → Search tab → Add-Coin)
- [x] `AddEntry` (~42) — extracted to `components/AddEntry.jsx`; 4 isolated tests (new/edit/disabled/submit)
- [x] `CoinInfo` (~95) — extracted to `components/CoinInfo.jsx`; 4 isolated tests (held/not-held branches). Dropped dead `milestones` var.
- [x] `Detail` — extracted to `components/Detail.jsx`; 3 isolated tests (P/L summary, tx list, empty). Dropped dead `inv`/`pnl`/`pp` + orphaned format/coins imports.
- [x] `Account` (~148) — extracted to `components/Account.jsx`; 5 isolated tests (sub states, delete-confirm, logout) + a real nav smoke test (badge → Account). Dropped dead `totalCoinsAllPorts`.
- [x] `PortfolioBar` (~10, helper) + `Portfolio` (~55) — extracted to `components/`; 6 isolated tests (asset list, upgrade nudge, switcher branches) + smoke test. Cleaned 6 now-orphaned shell imports (fmtP/fmtPct/sb/CI/hdr/StatusDot).
- [x] `Login` (~110, incl. the upgrade/plan overlay reused as a shell overlay) — extracted to `components/Login.jsx`; 5 isolated tests (form, signups-paused, billing, plan picker) + smoke. **Fixed a real bug:** auth error used `c.rd` (undefined) → now `c.red`, so errors actually render red.

**✅ Section 1a complete — all user-app screens are now extracted components.** `CryptoIdea.jsx`
is now just the auth/data effects, handlers, the `ctx` object, and the router shell. Next: §1b (hooks).

### 1b. Extract business logic into hooks (closes audit rules 1 & 2)
Most state + logic still lives in the `CryptoIdea.jsx` component. Pull into hooks:
- [x] `useAuthSession` — extracted to `hooks/useAuthSession.js`: owns `user`/`dataLoaded` + the
  `onAuthChange` watch (incl. `loadPortfolios`) and profile auto-save effects; collaborators
  (`setScreen`/portfolio setters/`checkSubscriptionStatus`/`saveProfile`) injected via a ref so the
  listener subscribes once. Also moved the `db` storage helper to `utils/storage.js`. 4 hook tests
  (`renderHook`) + the existing login/logout smoke tests guard it.
- [~] `usePortfolios` — **state container extracted** to `hooks/usePortfolios.js` (owns `portfolios`/
  `activePortId`, derives `portfolio`/`setPortfolio`; 4 hook tests). The **CRUD handlers stay in
  `CryptoIdea.jsx` by design** — they're coupled to `user`/tier-limits (derived after `user`, which
  comes from `useAuthSession`) and UI/form state; hook-ifying them would need ~15 injected deps or a
  risky reorder of the auth↔load sequence (anti-KISS). Revisit only if a redesign makes it cleaner.
- [x] `useUpgrade` — **tier-limit business logic extracted** to `hooks/useUpgrade.js`
  (`calcEndDate`, `getTrimImpact`, `trimToTier`, bound to `portfolios`/`setPortfolios`). Also
  consolidated the **duplicated limits table** into one `TIER_LIMITS` constant. 6 hook tests
  (`renderHook`). The **UI-flow orchestrators stay in `CryptoIdea.jsx` by design** (`startUpgrade`/
  `startDowngrade`/`confirmDowngrade`): they drive overlay state shared with the auth/Login flow
  (`showPlan`/`upgradeStep`/`upgradeFlow`…), so hook-ifying them would only relocate ~7 setters
  without cutting coupling (anti-KISS) — same call as `usePortfolios`' CRUD.

**✅ Section 1b complete** — auth session, portfolios state, and tier-limit logic are now in
hooks. What stays in `CryptoIdea.jsx` (portfolio CRUD + upgrade-overlay orchestrators) is coupled
to UI/form/auth state by design; pulling it into hooks would relocate dependencies, not reduce
them. Next: §1c (move remaining backend calls / shared theme out of components).

### 1c. Move backend calls out of components (closes audit rule 1)
- [x] `CryptoIdea.jsx` calls `httpsCallable(functions, "exportMyData"/"deleteMyAccount")` directly. → Moved into `src/api/account.js` (`exportMyData()`, `deleteMyAccount()`); component imports them, no longer touches `httpsCallable`/`functions`. 2 tests.
- [x] `components/admin-dashboard.jsx` called Cloud Functions via `httpsCallable` directly. → Moved all 9 callables into `src/api/admin.js` (`getStats`/`listUsers`/`listAudit`/`lookupUser`/`setUserTier`/`suspendUser`/`deleteUser`/`getAdminConfig`/`saveConfig`); each wrapper unwraps the payload the dashboard needs. Component no longer imports `httpsCallable`/`functions`. 7 tests. **Kept as plain `api/` functions, not a hook** (KISS, same call as `account.js`): the dashboard already owns all its own state, so a hook would add a layer without cutting coupling.
- [x] `components/pro-success.jsx` defined a local `c` theme — now imports the shared `utils/theme.js` (`c.bg`/`c.txt`/`c.dim`/`c.ac`), dropped the unused `border` token.

**✅ Section 1c complete** — no user/admin component calls a Cloud Function or
defines its own theme anymore; all backend access lives in `src/api/*`.
**✅ Section 1 (frontend refactor) complete** — all of 1a/1b/1c are done.

---

## 2. Backend layering — OPTIONAL (audit rules 4–6: controllers/services/models)

`functions/index.js` (~870 lines) currently colocates HTTP routing (controller),
external CoinGecko/PayPal/email calls (services), and Firestore access (models).
This is a defensible choice for a single serverless function. **Only do this if you
want explicit MVC separation:**
- [ ] `functions/controllers/` — the `api` HTTP handler routing `/api/*`
- [ ] `functions/services/` — `coingecko.js`, `paypal.js`, `email.js` (external calls only)
- [ ] `functions/models/` — Firestore read/write helpers (cache, config, audit, users)

---

## 3. Known bug — FIXED (seed/schema mismatch, not an app bug)

- [x] **Seeded portfolios don't load / adding a coin silently fails.** Root cause: a
  **seed/schema mismatch**, confirmed not an app bug. `getPortfolios()` queries
  `orderBy("order")`, and Firestore **excludes any document missing the ordered field**.
  Real registration (`firebase-auth.js`) creates portfolios *with* `order` + `created`, but
  `seed-emulator.js` wrote `{ name, coinCount, createdAt }` with **no `order`** — so the
  seeded portfolios were dropped from the query, the app fell back to its in-memory
  `"default"` portfolio (which has no Firestore doc for that uid), and adding a coin then
  `update()`d a non-existent doc → "Couldn't add coin." Fix: `seed-emulator.js` now writes
  `order` + `created` (matching the app schema) and seeds real coins (BTC/ETH/SOL/…) so
  `pro@test.com` loads 2 portfolios with 6 + 4 coins. Verified by running the identical
  `orderBy("order")` query against the emulator (returned 2 portfolios, was 0).
  - Latent (out of scope, pre-existing): if `getPortfolios` ever returns empty for a
    logged-in user, the phantom local `"default"` would still fail on coin-add. Real users
    never hit this (registration always creates the default with `order`).

---

## 4. Go-live checklist (from CLAUDE.md / README)

- [ ] Create real Firebase project; enable Email/Password Auth + Firestore.
- [ ] Put web config in `.env` (`VITE_FIREBASE_*`); `firebase deploy` (Blaze plan needed for functions).
- [ ] ~~`firebase functions:config:set …`~~ **(removed in firebase-functions v7 — a no-op).** Set secrets via the **admin Settings** form (writes the locked `config/app` doc); PayPal **plan IDs + `APP_URL`** are the only env-only secrets → `functions/.env`. See [`BACKEND-ADMIN-DECISIONS.md`](BACKEND-ADMIN-DECISIONS.md) §1.5.
- [ ] Deploy `firestore.rules`; bootstrap the first admin via `functions/scripts/set-admin.js`.
- [ ] Register + promote a **second** admin; store both admins' creds in a password manager (`MIN_ADMINS=2`).
- [ ] Add a free **CoinGecko Demo key** (unlocks DCA history beyond 365 days + higher rate limit).
- [ ] **App Check:** create reCAPTCHA v3 key, set `VITE_RECAPTCHA_SITE_KEY`, enable enforcement in console.
- [ ] Test the **CSP** on the deployed site; loosen a directive only if it blocks something legit.
- [ ] Paste **Termly** snippets into `privacy.html` / `terms.html`.
- [ ] Enable **Identity Platform MFA (2FA)** for admins + add the enrollment/challenge flow to the admin app.
- [ ] Wire the admin **Settings** forms fully and confirm the email provider (ActiveCampaign/GetResponse) end-to-end.

---

## 4b. Follow-ups from the QA test pass (see `docs/TEST-REPORT.md`)

- [x] **F-1 (HIGH):** user tier was read from local cache, never Firestore → paid users showed as
  free on a fresh device / after an admin change. Fixed: `getUserProfile` reader + `useAuthSession`
  adopts server tier; retries past the login-time `lastLogin` pending-write view. (commit `8ecd222`)
- [x] **F-2 (MED):** Account screen crashed rendering a Firestore Timestamp `joined`. Fixed — session
  takes only authoritative fields from the server; regression test added. (commit `b9bf9b6`)
- [x] **F-3 (UX):** limit/error messages rendered off-screen → now a fixed floating toast. (`b9bf9b6`)
- [x] **F-4 (FEATURE):** portfolio CSV export (holdings + transactions). (commits `262e562`, `3b4db27`)
- [x] **F-5 (HIGH):** "Delete my account" reworked into a soft-delete with a 30-day trash, user
  self-restore, admin Trash tab (restore / delete-now), and a daily `purgeExpiredTrash`. Server-only
  `deleted`/`deletedAt` (rules-enforced). Self-restore auto-syncs to the admin Users/Trash split
  (`partitionUsers`). (commits `9661cbe`, this one)
- [x] **N-1 (DONE 2026-06-25, `a3693c9`): hardened the landing DCA fetch.** The history fetch
  (`getHist` in `index.html`) had no timeout, so a hung `/api/history` left the calculator stuck
  mid-calculation with no feedback. Added a **12s `AbortController` timeout**; on timeout or network
  error it falls back to the built-in offline estimate (`fbHist`) and shows a clear "showing an
  offline estimate" note. The fallback is no longer cached, so a later attempt can still reach a
  recovered API. (NB: the minimal-API rewrite had already dropped the literal "Calculate" button —
  the calc auto-runs — so the real symptom was a never-completing calc, not a stuck button.)
  **Verified in-browser:** real-data path unchanged; an immediate failure and a true 12s hang both
  degrade to the estimate + note instead of hanging.
- [ ] **N-2 (LOW): admin trash niceties.** Optional "Empty trash" bulk-purge action, and/or a live
  (onSnapshot) admin list so a user self-restore reflects without clicking Refresh.
- [ ] **N-3 (MED): live AI for the Research tab.** The Research tab ships with AI in graceful
  offline-fallback mode (`src/features/research/api/ai-client.js` throws → built-in data-driven
  summaries). To make "Pulse"/"Ask" use real Claude: add a secure callable Cloud Function
  (e.g. `researchAsk`) that holds the Anthropic key server-side, forwards to Claude (Anthropic SDK,
  model per `claude-api` skill), and add per-user rate limiting + App Check. Then replace the one
  `ai-client.js` body with a call to that function. Needs an Anthropic API key + the Blaze plan
  (outbound network). NEVER call Anthropic directly from the browser.

## R. Responsive app — desktop layout  (DONE 2026-06-25 — R-0…R-4 shipped)

The user app is now ONE responsive layout (centered shell + auto-fit card grids, same markup
mobile↔desktop, no `@media`, no new deps), **design unchanged**. As-built detail:
[`RESPONSIVE-DESIGN.md`](RESPONSIVE-DESIGN.md); reusable method: the `responsive-app` skill.

- [x] **R-0 Shell** — `.app-shell` centered column (720 default / 560 narrow / 1040 wide track) +
  `.grid-auto` utility; bottom bar kept (centers as a pill). (`9fed965`)
- [x] **R-1 Learn** — modules reflow to a 2-up grid on desktop, 1-up mobile. (`28a74f6`)
- [x] **R-2 Journal** — thesis entries reflow to a 2-up grid. (`0653d6b`)
- [x] **R-3 Research** — coin cards reflow to a 2-up grid (scoped `research-tab.css`). (`bd14965`)
- [x] **R-4 Forms/detail** — Detail/AddEntry/CoinInfo on the 560 narrow track; Contact capped 560. (`da32f03`)
- Honored "keep the design the same": no colors/fonts/components changed; Portfolio & Search **rows kept**
  (not tiled); only homogeneous card lists gridded. Each phase: build + 217/217 unit green + browser-probed
  (grids reflow 1→2→3 cols by width, collapse to 1 on mobile).

## D. Design revamp — match the canonical Portfolio mockup  (BUILT 2026-06-26)

Founder-approved mockup (desktop + mobile) is the canonical visual target. Full plan, current→target
deltas, and phases live in [`DESIGN-REVAMP.md`](DESIGN-REVAMP.md). Headline change: Portfolio value →
white summary card, and Portfolio assets **ROW → CARD GRID on the 1040 wide track** (this supersedes
§R's "Portfolio rows kept"); plus a floating bottom-nav pill and a token/pill/card consistency pass.
Dark mode preserved; KISS, no new deps.

- [x] **Mobile mockups for all screens** — produced 2026-06-25 in the approved language
  (Portfolio/Research/Journal/Learn/Search + CoinInfo/Detail/AddEntry/Account/Login) to validate before building.
- [x] **Desktop mockups for all screens** — produced 2026-06-26: every screen at its desktop width
  (Portfolio on the **1040 wide track with the 3-up asset grid**, Research/Journal/Learn 2-up,
  drill-ins/forms on 560/720) in the approved cream-paper language. Saved as a durable, self-contained
  gallery with a light/dark toggle: [`docs/mockups/desktop/index.html`](docs/mockups/desktop/index.html)
  (open in a real browser for true widths). Verified: 12 frames, Fraunces+Hanken load, 3-up/2-up grids,
  Login `#FF3B30` error preserved, dark mode flips, clean console.
**Founder review locked 2026-06-26** (full per-screen decisions in [`DESIGN-REVAMP.md`](DESIGN-REVAMP.md) §7).
Locked wording: drop "held" → just the amount (`0.52 BTC`); Journal labels **Intact/Review/Challenged**;
Journal note → "Only you can see your journal. Your thesis helps the AI give you better Research & Ask
answers."; **remove the "Prices updating live" line** (both widths). Guardrail: design-only — keep all
settings/words/functions unless §7 says otherwise.

- [x] **D-1** Portfolio value summary card (gain line + INVESTED/24H/ASSETS cluster) **+ removed live line**
  (commit `455f17c`). New `portfolio24hPct` helper; `.value-card` flex (desktop-right / mobile-row); 240/240
  unit green, build clean, browser-verified (incl. dark mode).
- [x] **D-2** assets → 3-up card grid + wide (1040) track + tinted % pills + dropped "held" word
  (commit `335a1b9`). Card tap → CoinInfo; Edit/Delete on Detail; swipe machinery removed. Reflow
  3/2/1 @1040/720/375 verified; 242/242 unit green.
- [x] **D-3** desktop bottom-nav → **solid-white floating pill** (commit `cba5b2b`); mobile bar unchanged;
  min-width:760px override, token-driven (dark OK). Verified @1280/@375.
- [x] **D-4** token-circle consistency (commit `c4b36f0`): pure `coinColor()`, 6-digit guard (TAO bug fixed),
  case-insensitive, deterministic curated fallback + more coins. 245/245 unit green; browser-verified.
- [x] **D-5** consistency pass (design-only; settings/words/functions kept). **Search** — tinted % pill +
  muted "Added" (`72bc52c`). **Detail + CoinInfo** — consolidated tinted `chg-pill`, price-history
  `kv-chg` now a tinted pill, dedup CSS (`4b4b1d1`). **AddEntry / Account / Login** — already matched the
  new design (no change): AddEntry keeps datetime-local (date+time); Account keeps every function; Login
  keeps the inline `#FF3B30` error (browser-verified). 245/245 unit green; build clean.
- [x] **D-6** dark-mode sweep (commit `7842975`): fixed token-circle contrast (color-mix via `--ci`),
  the mobile nav bar (now `--bar-bg` theme var), and `pnl-row.dn`/`limit-banner.warn` hardcoded light
  tints → tokens. Verified in browser.
- [x] **D-7** Journal new design (commit `8cc0223`): short labels Intact/Review/Challenged; corrected note
  (thesis feeds the AI); **"Needs a thesis" section + add-thesis-later** via a new `addThesis` handler →
  `updateCoinJournal` (no schema change). 248/248 unit green; browser-verified (write a thesis → coin moves
  needs→theses).
- [x] **D-8** Research/Coins **desktop-only richer card** (commit `bd034b5`): cost·now·P&L·**30d** + full
  conviction always visible + bigger sparkline, shown by default on desktop (no tap); mobile stays
  compact. Verified Portfolio→Research auto-sync (a new holding surfaced the coin) and view-only (no
  delete). 248/248 unit green.

**§D Design revamp — COMPLETE (2026-06-26).** D-1…D-8 shipped; all founder-review items (§7) addressed.

(See [`DESIGN-REVAMP.md`](DESIGN-REVAMP.md) §3 for per-phase scope + DoD, §4 for the interaction decision, §7 for the founder review.)

## DP. Design Pass 2 — founder mockup alignment  (2026-06-27, PLANNED)

Canonical: [`DESIGN-PASS.md`](DESIGN-PASS.md) (4 design changes + decisions). Design-only except the new
cached `/api/trending`. Same design mobile + desktop; holds in dark mode. Built as ONE batch in order:

- [ ] **DP-1 Foundations** — add the icon set (Account: lock/bell/palette/shield/chevron/user/card/folder;
  Learn: 9 module icons + check/target) + shared CSS (pill `.switch`, `.set-row*`, `.port-pill*`,
  `.tx-coin-head`, `.app-avatar`, Learn hero-card/module-footer/icon sizing, trending label, dark-mode
  tokenizations). Enables the rest.
- [x] **DP-2 Quick wins** — ✅ DONE 2026-06-27. Portfolio switcher moved **above** the value card +
  restyled to design-system pills (`.port-pill*`, dark-safe, active = soft-green); Add-transaction
  **coin-name header** (`.tx-coin-head`, `Bitcoin · BTC` + token circle) above Buy/Sell, title
  "Add transaction". Verified: unit 251 green, build clean, browser-verified mobile + desktop.
- [x] **DP-3 Persistent avatar** — ✅ DONE 2026-06-27. One shell-level avatar (`.app-avatar` in a
  relative `.screen-wrap`, below the verify banner) on all 5 tab screens → opens Account; Portfolio's
  duplicate removed; hidden on drill-in screens. Browser-verified on every tab.
- [x] **DP-4 Learn** — ✅ DONE 2026-06-27. Hero band → white card (`.learn-hero`) with XP bar + chips
  (`🔥 N-day streak` hidden at 0 · `N of M lessons`); per-module SVG line icons (new
  `src/components/learn-icons.jsx`, `stroke=currentColor`, lock for locked) replacing the near-invisible
  emoji; icon color `--accent-ink` (adapts light/dark, ~8:1 / ~7.5:1). Module footer collapsed to ONE row
  (`.m-foot`: `X/Y lessons · Z%` + Start/Continue/Review), progress bar kept above. Dark-mode fix: tokenized
  the 3 hardcoded values (today-lesson + module.active gradients → accent-soft/paper-2; m-icon.done →
  `--sg-s`/`--sg`). Sequential unlock untouched. 257 unit green (+3), build clean, browser light+dark +
  mobile/desktop. NB: badges-row left as-is (out of scope).
- [x] **DP-5 Account** — ✅ DONE 2026-06-27. Drill-in settings list via a local `view` sub-state (no router
  change; Account had no local state — all from `useApp` — so nothing was lifted). HOME = identity avatar +
  "Plan usage" summary (Portfolios + Coins bars) + a settings-list card: NavRows (Profile / Plan & billing /
  Portfolios / Security / Privacy & data → chevron) + inline Email-digest pill `.switch` + Appearance
  segmented (reused `.theme-seg`) + Logout. DETAIL views relocate each existing card verbatim (Plan & billing
  = full usage + subscription + upgrade/PayPal). "Product updates & offers" marketing toggle moved into
  Privacy & data; Notifications card dissolved. New token-based/dark-safe primitives: 8 `Ic` row icons
  (chevR/user/card/folder/shield/bell/palette/lock, `currentColor`), `.switch`, `.settings-row*`. Tests
  rewritten for the drill-in (21 cases) + 2 e2e nav tests updated. 259 unit green, build clean, verified
  light+dark + mobile/desktop.
- [ ] **Round 2 — founder follow-ups (2026-06-27, capturing; build BEFORE DP-6)** — full spec in
  [DESIGN-PASS.md](DESIGN-PASS.md) "Round 2". Founder still adding items; don't build until they say go.
  - [ ] **R2-1** Account avatar consistent on Learn + all tabs (currently overlaps the Learn hero card) — ⚠ confirm placement.
  - [ ] **R2-2** Learn: remove the `.badges-row` "graph icon" (not needed) — trivial.
  - [ ] **R2-3** Research › Portfolio Pulse: new design (Share/Regenerate pills + period headline pill); KEEP 24H/7D/30D where they are + KEEP the offline note.
  - [ ] **R2-4** Research › Portfolio Risk: new design (segmented gradient meter Low/Moderate/High + status badge + lock footer); keep the computation.
  - [ ] **R2-5** Add transaction: restyle ONLY the Buy/Sell tab style + fonts + "AUTO" on the right side of the price input + the "Total cost" row (large display amount).
  - [ ] **R2-6** Journal: new design — serif "Journal" header + avatar + "Write before you buy." + entry cards with coin circle + status pill (Intact/Review/Challenged) + thesis excerpt. Keep logic.
  - [ ] **R2-7** Research › Allocation: color each bar segment + legend dot by the coin's original brand color (`coinColor`) so none repeat.
  - [ ] **R2-8** Research dark-mode bug: "A note on diversification" card is light-on-light (unreadable) — tokenize + audit sibling cards.
  - [ ] **R2-9** Learn dark-mode bug: lesson overlay "THE KEY INSIGHT" box (`.lesson-insight`) light gradient unreadable in dark — tokenize.
- [ ] **Round 3 — dark-mode visibility bugs (2026-06-28, PLAN ONLY; more coming)** — full spec in
  [DESIGN-PASS.md](DESIGN-PASS.md) "Round 3". **Founder rule: every fix is DARK-MODE-ONLY (`html[data-theme="dark"]`); light mode byte-for-byte unchanged.** Don't build until founder says go.
  - [ ] **R3-1** Add-portfolio "+ Add" button invisible in dark — `.add-name` (`app.css:463`) `background:var(--ink)` (flips light) + hardcoded `color:#fff` → dark-block override text `var(--paper)`.
  - [ ] **R3-2** Back chevron `<` invisible on every drill-in (CoinInfo/Detail/AddEntry/Account) — `Ic.back` (`ui.jsx:9`) `stroke={c.txt}` (#1A1A1A) + `.icon-btn` has no color → set `stroke="currentColor"` + add `color:var(--ink)` to `.ci-app .icon-btn` (flips correctly both modes).
  - [ ] **R3-3** Accent green dull on black — `--accent` doesn't flip; in the dark block, override **foreground** accent rules (`.nt-btn` + ~11 others + Portfolio.jsx:84 inline) to `var(--accent-ink)` (bright #5cd6a6). Keep `--accent` on solid-bg+white-text buttons & borders.
  - [ ] **R3-4** Account avatar black-on-black — `.avatar`/`.acct-avatar` hardcode a near-black gradient; dark-only override (`--accent-soft` bg + `--accent-ink` initial + accent ring). Build with R2-1.
  - [ ] **R3-5** Header tags + colored numbers/pills not shiny (systematic) — `--sg/--sr/--sa/--ai-2/--amber` + `.badge-live` (#1a7a3c) don't flip → dull on black. Dark-block: brighten the semantic tokens (e.g. `--sg:#2ecc71; --sr:#ff6b6b; --sa:#f4c54a; --ai-2:#5b9bff;`) + override `.badge-live`. Makes all tags/%-pills/numbers bright app-wide.
  - [ ] **R3-6** Account fields + buttons white/dull in dark — `.priv-btn.solid` (`app.css:466`, `var(--ink)` bg + `#fff` = invisible), `.priv-btn.danger`/`.logout-btn` hardcoded `#fdecea`. Dark-block overrides (solid→accent; danger/logout→`--sr-s`/`--warn`).
  - [ ] **R3-7** Upgrade/Downgrade modal white + invisible title in dark — inline-styled in `CryptoIdea.jsx:597-634`, outside `.ci-app`, `background:"#fff"` + title has no color. Add classNames (no logic) + dark-block CSS (`!important`): sheet→`--paper-2`, title→`--ink`, boxes→tinted, "Keep My Plan"→dark.
  - [ ] **R3-8** Research "Ask" panel black-on-black — `.ask` (`research-tab.css:180`) dark hero blends into dark page + `h3` inherits `var(--paper)` (flips dark). Dark-block in `.research-root`: add border + `color:var(--ink)`. Cross-ref R2-8.
- [x] **B-PORT — diagnosed (backend, not design). "Couldn't create portfolio. Check your connection."**
  **CONFIRMED via live emulator repro (2026-06-28):** NOT a connection/rules bug — the create is correctly
  denied because the user is **at their plan's portfolio cap** (free 1/pro 3/premium 15), and the app
  **mislabels** the `permission-denied` as a connection error. Surfaces when the **client tier > DB tier** (a
  local/demo upgrade the server never persists; users can't write their own `tier`). Earlier "getAfter can't
  see increment" guess **disproven** (pro@test.com succeeded with the exact batch). **Full diagnosis + fix in
  [ERRORS.md](ERRORS.md) §A1 + §A2** (surface `error.code` → plan-limit message vs connection; sync client
  tier to DB tier). Fix ready, not yet applied — **apply on request.**
- [ ] **DP-6 Search trending** — cached `/api/trending` (CoinGecko `/search/trending`, shared doc + CDN)
  + `fetchTrending()` + `useTrending()`; show TRENDING when the search box is empty.
- [x] **DP-8 Login** — ✅ DONE 2026-06-27. Password show/hide eye toggle (`.pw-eye`, `Ic.eye/eyeOff`);
  "Login" → "Log in" (tab + button); email placeholder `you@email.com`. `#FF3B30` auth-error preserved.
  Browser-verified (toggle password↔text).
- [x] **DP-9 Coin info** — ✅ DONE 2026-06-27 (two commits). **DP-9a (client, design-only):** MARKET DATA =
  Rank/Market cap/24h volume/Circulating; YOUR POSITION = Held/Avg cost/**Unrealised P/L** (reuses `coinPnl`,
  excludes realised sells; colored `pnl-row`, dark-safe); chg pill "(24h)" → "today"; dropped "First tracked" +
  the redundant Value/Transactions rows & in-card button (header Transactions pill kept); Price-history card
  kept. 24h vol + circulating read `prices[id].usd_24h_vol`/`.circulating` with an em-dash fallback (never
  NaN). No new CSS. **DP-9b (backend):** `refreshUniverse` now persists `v` (total_volume) + `cs`
  (circulating_supply) — already returned by `coins/markets`, so **zero extra upstream cost** — and the
  `/api/prices` handler emits `usd_24h_vol` + `circulating`. Verified: 254 unit green, build clean, live API
  probe + browser (light+dark) → "$25.81B" / "20,048,900 BTC".
- [x] **DP-10 Transactions (Detail)** — ✅ DONE 2026-06-27. Tx list wrapped in a card (`.tx-list`) +
  two-column rows (`.tx-left` badge+amount+date · `.tx-right` price + Cost/Recv, right-aligned). Summary
  card + green TOTAL P/L already matched. Browser-verified (added a tx → renders in the card).
- [x] **DP-11 White mobile nav** — ✅ DONE 2026-06-27. Hoisted the desktop white floating pill to ALL
  sizes (`.tabbar` → `--paper-2` white bg, `border-radius:999px`, shadow, floating `bottom:14px`,
  `max-width:calc(100% - 24px)`); active tab gets the soft-green highlight on mobile too; dark-safe
  (token-driven). Added `app-shell` `padding-bottom:96px` to clear the floating pill. Browser-verified
  mobile (white pill + active highlight) + desktop.
- [x] **DP-12 Consistent tab widths** — ✅ DONE 2026-06-27. All 5 tab screens now use the 1040 wide track
  (added research/journal/learn/search to `WIDE_SCREENS`) so they're the same size as Portfolio on
  desktop (also aligns the persistent avatar's right edge across tabs). Verified all tabs = 1040 @1280.
  NB: Research Overview's single-column cards stretch wide at 1040 — cap inner width later if desired.
- [ ] **DP-7 Polish** — full dark-mode + mobile/desktop browser verify, docs, final commit.

**DoD per phase:** adjust the screen's tests first · `npm run test:unit` green · `npm run build` clean ·
browser-verify mobile (~390) + desktop (~1040), light + dark · commit · update docs.

---

## 5. Housekeeping

- [x] Ran `npm audit fix` (no `--force`): patched the `protobufjs` prod advisory → **production
  audit (`--omit=dev`) is now 0**. ~11 dev-only advisories remain (Vitest/jsdom tooling) and would
  need `--force`/breaking bumps — left per policy. Build + 72 unit tests green after the fix.
- [x] Debug logs (`firebase-debug.log`, etc.) are already gitignored.

---

## Commands

| Command | What |
|---|---|
| `npm run start:all` | Full local stack (emulators + Vite) in one lifecycle |
| `npm run test:unit` | Vitest component/hook tests (jsdom) |
| `npm run test:rules` | Firestore security-rules tests (emulator) |
| `npm run test:integration` | Data-layer integration tests (emulator) |
| `npm run build` | Production build + service-worker stamp |
| `npm run deploy` | Build + `firebase deploy` (Blaze for functions) |
