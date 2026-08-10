<!--
  ARCHITECTURE.md — canonical record of the system architecture / layering rules.
  Created 2026-08-08 (ARCHITECTURE-DOC, CRYP-100) from a 4-agent read-only audit
  (2026-08-05): 17 rule categories, as-built verified in source.
  Sub-doc for the src/ layers: src/ARCHITECTURE.md. Historical snapshot: docs/testing/ARCHITECTURE-AUDIT.md.
-->

# System Architecture (canonical)

> **Canonical record of the system architecture** — 2026-08-05 codebase audit (a 4-agent
> read-only sweep: 17 rule categories, as-built verified in source; wired in 2026-08-08 as
> ARCHITECTURE-DOC / CRYP-100).
>
> **This doc wins.** Where this doc and a stale planning or design note disagree, **this file
> wins** for architecture — exactly as [`PRODUCT-DECISIONS.md`](PRODUCT-DECISIONS.md) wins for
> product and [`CACHE-POLICY.md`](CACHE-POLICY.md) for caching.
>
> **Scope composition (who owns what).** This doc owns the **system / layering shape**.
> [`src/ARCHITECTURE.md`](../../src/ARCHITECTURE.md) keeps the `src/` layer detail + migration status;
> [`CACHE-POLICY.md`](CACHE-POLICY.md), [`API-SECURITY.md`](../security/API-SECURITY.md) + [`openapi.json`](../../openapi.json),
> [`ISOLATION.md`](../security/ISOLATION.md) and [`PRODUCT-DECISIONS.md`](PRODUCT-DECISIONS.md) keep their
> **deep domains** (this doc cross-links them and states only the *architectural rule* — it never copies
> their decision logs or their numbers, so it can't become a new drift source);
> [`CLAUDE.md`](../../CLAUDE.md) + [`CODEBASE-MAP.md`](../product/CODEBASE-MAP.md) hold the current **code
> reality**; [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) §1/§2 holds the **build order**.
>
> **Two readers:** future-me (coming back cold) and Claude / a teammate mid-task. Both should be able
> to read one rule, know where it lives in code, and know whether it's `current` or aspirational — without
> guessing.

---

## How this maps to the code

| Layer | Directory / file | Rule |
|---|---|---|
| Page entries | `index.html` · `app.html` · `admin.html` · `privacy.html` · `terms.html` + `src/{main,admin-main}.jsx` | Multi-page Vite; each HTML is one build input (ARCH-1) |
| Components (UI) | `src/components/**` · `src/features/research/components/**` | Presentational JSX only — no `fetch`, no `firebase/*` (ARCH-2) |
| Hooks (logic) | `src/hooks/**` · `src/features/research/hooks/**` | State + business logic; call `api/`, use `utils/` (ARCH-2) |
| API (data access) | `src/api/**` · `src/features/research/api/**` | Firebase SDK + `/api/*` proxy wrappers; the frontend **model** layer (ARCH-6) |
| Utils (pure) | `src/utils/**` · `src/features/research/utils/**` | Pure helpers — same input → same output, no I/O (ARCH-2) |
| Research feature | `src/features/research/**` | Self-contained module: own components/hooks/utils/api/styles (ARCH-3) |
| Backend | `functions/index.js` + 13 helper modules (`guards`, `billing`, `validate-output`, …) | Modular pure helpers + a per-handler-mixed `index.js` (ARCH-5) |
| Security boundary | `firestore.rules` · `storage.rules` | Rules are the wall — not the client, not the URL (ARCH-7) |
| Build config | `vite.config.js` · `firebase.json` · `scripts/**` | `manualChunks` Firebase isolation; CSP/headers; SW stamp (ARCH-4, ARCH-10) |

The visual companion is [`docs/diagrams/frontend-layered-architecture.svg`](../diagrams/frontend-layered-architecture.svg)
(refresh it when a layer or a major component changes — the `drawing-diagram` skill).

---

## The rules (ARCH-1 … ARCH-17)

Each rule is **imperative**, carries its **source** (file + section) and a **status tag**:
`current` · `migration-in-progress` · `aspirational` · `by-design-exception` · `historical`.

### ARCH-1 — Multi-page Vite; three separate front-ends `[current]`
Keep three distinct front-ends behind separate Vite entries: `index.html` = the static marketing
landing (with the free DCA calculator at `#dca`); `app.html` = the React user app (`main.jsx` routes
`/app`, `/edge`, `/pro-success`); `admin.html` = the **separate** admin app (`admin-main.jsx`, served at
`/admin`). Landing page-scripts are external files in `public/` (`landing.js`, `sw-register.js`,
`site-meta.js`, `termly-embed.js`) — never inline. The admin bundle contains no user-app code and vice
versa. *Source: `CLAUDE.md` "## Architecture"; `README.md` "Project structure".*

### ARCH-2 — Frontend is layered: component → hook → api → util `[current]`
A component that needs data calls a **hook**; the hook calls **`api/`** and uses **`utils/`**. Never
`fetch` or import the Firebase SDK from a component — go through `api/`. `utils/` stays pure (no React,
no I/O). Verified as-built: **no component imports `firebase/*`** (both `src/components` and
`src/features`), so the data-access half of the rule is clean. The documented deviations are logic
placement, not data access — see **By-design exceptions** and **Known violations to fix**.
*Source: [`src/ARCHITECTURE.md`](../../src/ARCHITECTURE.md) "Rules of thumb"; [`ARCHITECTURE-AUDIT.md`](../testing/ARCHITECTURE-AUDIT.md) Rules 1–3.*

### ARCH-3 — Research is a self-contained feature module `[current]`
Keep the Research tab in `src/features/research/` with its **own** `components/hooks/utils/api/styles`,
reached only from the bottom nav via `Research.jsx` → `ResearchTab.jsx`. It reads app-native data (the
active portfolio's coins/entries) and prices through the existing `/api` proxy **only** — never CoinGecko
or Anthropic directly from the browser. Its CSS is fully scoped under `.research-root` so it can't leak
into the rest of the app. *Source: `CLAUDE.md` "Research tab"; [`docs/diagrams/research-tab-module.svg`](../diagrams/research-tab-module.svg).*

### ARCH-4 — Code-split for fast first loads `[current]`
`main.jsx` lazy-loads routes; `vite.config.js` `manualChunks` isolates Firebase into its own cached
chunk. Keep the entry chunk small. `npm run build` stamps the service worker and runs the **no-names
`dist/` guard** (`scripts/check-dist-names.js`) — the build FAILS if a real investor name leaks into the
shipped bundle. *Source: `CLAUDE.md` "## Architecture" + "Build, test, deploy"; [`docs/diagrams/multi-page-build-code-splitting.svg`](../diagrams/multi-page-build-code-splitting.svg).*

### ARCH-5 — Backend is modular pure helpers + a per-handler-mixed `index.js` `[current]`
The backend is one Cloud Functions codebase (Node 22, CommonJS): `functions/index.js` (≈2,400 lines,
**43 exported functions**) plus **13 extracted, unit-tested pure-helper modules** (`guards`, `billing`,
`validate-output`, `config-diff`, `observability`, `net-utils`, `stats-daily`, `features`, `signup-gate`,
`announcement`, `universe-utils`, `duplicates`, `audit-diff`). Extract new **pure** logic into a helper
module with tests; the per-function controller+service+model mixing inside `index.js` stays a **documented
by-design exception** (there is no `controllers/`/`services/`/`models/` split). Frame it as *"modular helpers
+ a mixed `index.js`"* — **not** "a flat monolith" (that framing is `[historical]`; see D1 below).
*Source: [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) §2; corrects [`ARCHITECTURE-AUDIT.md`](../testing/ARCHITECTURE-AUDIT.md) Rules 4–6.*

### ARCH-6 — Data layer: per-op Firestore writes with atomic counters `[current]`
Persist through the frontend data layer (`src/api/firebase-database.js` / `firebase-auth.js`), which
maintains counters with `writeBatch` + `increment`. These files **are the frontend model layer** (a
conceded, deliberate role — see exceptions), not thin fetchers. Live multi-device sync is scoped to the
watchers that need it (`watchPortfolios` / `watchCoins` on the active portfolio / `watchLearnProgress`);
everything else is fetch-once. **App-open reads are lazy (PLAN-LIMITS-MAX Part B, #12, 2026-08-10):** only
the ACTIVE portfolio eager-loads its transactions (`getCoins`); every other portfolio loads coins + the
persisted `txCount` only (`getCoinsMeta`, zero transaction reads), with its transactions loaded on first
switch via `watchCoins`. This bounds a multi-portfolio account's app-open read cost to the active
portfolio's transactions (a `txLoaded` flag keeps an unopened portfolio from rendering a wrong/zero P&L);
the cross-portfolio tx-count surfaces count via `txCount ?? entries.length` so counts stay correct for
lazy-loaded portfolios. Firestore data shapes (portfolios / coins / transactions / `journal` /
learn progress) are validated in `firestore.rules`. **Treat tier-limit / hard-clamp constants as ONE
governed set** — do not restate the numbers here; they live in [`PRICING.md`](PRICING.md) and the
`interview.md` "Tier limits" row (the highest drift-risk topic, ≈9 code+doc locations).
*Source: `CLAUDE.md` "## Architecture" (Data layer); [`docs/diagrams/firestore-data-model.svg`](../diagrams/firestore-data-model.svg).*

### ARCH-7 — Firestore rules are the security boundary `[current]`
The wall is `firestore.rules`, not the client and not a URL. Deny-by-default; owner-scoped per-uid
access; users can never write their own `tier`, `planChosen`, `admin`, `deleted`, or `joined`; `/config`,
`audit`, `statsDaily`, `cache`, `historyCache`, `rateLimits`, `webhookEvents` are server-only. Configured
tier limits are enforced by rules (they `get()` `config/app.plans` with a built-in fallback). Verify every
rule change with `npm run test:rules`. Keep the isolation model **logical** (one DB, per-uid subtrees,
rules as the wall) — physical per-user separation is an anti-pattern here (ISO-D1).
*Source: `CLAUDE.md` "Security model"; deep record [`ISOLATION.md`](../security/ISOLATION.md); [`docs/diagrams/authorization-and-tier-limits.svg`](../diagrams/authorization-and-tier-limits.svg).*

### ARCH-8 — Admin is a separate app gated by custom claims, in two roles `[current]`
Admin lives in its own Vite entry (`admin.html` / `admin-main.jsx`) with its own named Firebase app; **no
admin code or CSS ships in the user bundle**. Authority is a Firebase **custom claim**, never an email
list, in two roles: `owner` (`{admin:true, role:"owner"}`, minted only by `functions/scripts/set-admin.js`)
and `manager` (granted by an owner from the panel). Every admin callable goes through one shared gate
(`assertAdmin`/`assertManager`/`assertOwner`/`assertFreshOwner`, pure helpers in `functions/guards.js`) —
now `async`, so **every call site must `await`**. A different URL is not the boundary; the server-side
claim check is. *Source: `CLAUDE.md` "Admin & privacy"; deep record [`API-SECURITY.md`](../security/API-SECURITY.md) §1; [`docs/diagrams/admin-operations.svg`](../diagrams/admin-operations.svg).*

### ARCH-9 — Only `dist/` ships; secrets stay server-side `[current]`
Only the built `dist/` reaches the browser. `functions/`, `firestore.rules`, configs, scripts and tests
are backend/build-only. No runtime secret ships: keys live in `functions/` + the locked `config/app`
Firestore doc (or env). The in-bundle `VITE_FIREBASE_*` web config is public by design. Never read a
secret from the bundle. *Source: `CLAUDE.md` "Security model"; deep record [`API-SECURITY.md`](../security/API-SECURITY.md) §3/§6.*

### ARCH-10 — Output encoding, CSP, and no inline scripts `[current]`
React auto-escapes; the static pages use `textContent`, never `innerHTML`, for API data. The CSP
`script-src` has **no `'unsafe-inline'` / `'unsafe-eval'`** and there are **no inline `<script>` blocks
and no inline `on*` event handlers** — all page scripts are external files in `public/` wired via
`addEventListener`. **Precise state:** `script-src` is strict; **`style-src` still allows `'unsafe-inline'`**
(for the inline styles the landing + Termly embeds rely on) — that is the one remaining inline allowance,
and it is scoped to styles, not scripts. Security headers (CSP/HSTS/frame-ancestors) live in `firebase.json`.
*Source: `CLAUDE.md` "Security model" (D12); enforced in `firebase.json`.*

### ARCH-11 — One shared flat-cost market-data proxy `[current]`
All market data flows through **one** shared Firestore doc `cache/universe` (+ `cache/trending`,
+ per-coin history cache) served behind CDN-cached `/api/*` endpoints. Upstream cost scales by **distinct
coins held across all users, not by user count** (the flat-cost property; denial-of-wallet is bounded to
distinct held coins). Add market data through this proxy — never call CoinGecko from the browser, and route
every server-side CoinGecko call through the single `cgFetch()` choke point (kill-switch enforced there).
Tiers, TTLs and cost figures are **not restated here** — they are the deep record in
[`CACHE-POLICY.md`](CACHE-POLICY.md). *Source: `CLAUDE.md` "Known notes"; [`docs/diagrams/coin-data-flow.svg`](../diagrams/coin-data-flow.svg).*

### ARCH-12 — AI / Research safety: fail-closed, no live AI yet, research-never-advice `[current + aspirational]`
There is **no live AI today** (`api/ai-client.js` `askClaude` throws by design); every AI surface renders
a deterministic, data-driven summary presented as the real feature. `AI_PROXY_LIVE` (in `api/ai-status.js`,
`false` today) is the single go-live seam. When live AI ships (Wave B, `[aspirational]`): it MUST run
server-side behind a Cloud Function holding the Anthropic key, MUST run the fail-closed output validator
(`functions/validate-output.js` — regex prefilter → stricter LLM judge, N=2 regen cap) on **every** response
before any text reaches the client, and MUST honor the hard product rule **research, never advice** (no
buy/sell/hold, no price targets, no aggregate score, no project name the AI introduced). The `aiResearch`
kill-switch gates the chat client-side and will gate the proxy. *Source: `CLAUDE.md` "Research tab" + "Operational safety net"; product rule [`PRODUCT-DECISIONS.md`](PRODUCT-DECISIONS.md) §1; [`docs/diagrams/conviction-engine.svg`](../diagrams/conviction-engine.svg).*

### ARCH-13 — Billing goes through the shared, idempotent PayPal layer `[current]`
Route all subscription logic through `functions/billing.js` (pure decisions: plan_id→tier, idempotency
key, cancellation/sweep patches, cycle-true revenue) + the shared `functions/guards.js` security guards.
The webhook is idempotent (`webhookEvents/{event.id}`); a cancellation never drops the tier immediately
(access runs to `endDate`; the daily sweep flips it). Plan prices/limits are editable config, not
constants — do not restate them here. Deep record: [`BILLING.md`](BILLING.md) (+ [`PRICING.md`](PRICING.md)).
*Source: `CLAUDE.md` "Billing hardening (BL-1)"; [`docs/diagrams/subscription-lifecycle.svg`](../diagrams/subscription-lifecycle.svg).*

### ARCH-14 — The audit log is an append-only, single-writer server-only trail `[current]`
Every admin action and every sensitive self-service/billing event is appended to a server-only `audit`
collection (client access denied by rules) through exactly one choke point — `writeAudit()` (add),
`listAudit()` (read), `purgeOldAudit()` (expire) — enforced by a source-scan test. Rules never apply to the
Admin SDK, so a total client deny is stronger than "append-only." Secret values never reach the log (the
`keep()`-guarded fields record `(changed)` only). *Source: `CLAUDE.md` "Audit log" + "Audit depth (ADMIN-3)".*

### ARCH-15 — Observability: kill-switches, cron heartbeats, scrubbed Sentry `[current]`
Declare feature kill-switches in one place (`functions/features.js`) — a switch is ON unless config says
exactly `false`, and a missing/unreadable config degrades to a working app. Every scheduled job runs
through `runJob()`, which stamps `health/jobs` and still rethrows so a failure is visible; a job that stops
being *called* is caught by the heartbeat. Sentry is functions-only, behind a DSN, events scrubbed of PII
(`scrubEvent`). *Source: `CLAUDE.md` "Operational safety net (ADMIN-2)"; [`docs/diagrams/config-and-feature-flags.svg`](../diagrams/config-and-feature-flags.svg).*

### ARCH-16 — One responsive layout on a scoped design system `[current]`
The user app is ONE responsive layout (centered `.app-shell` that widens on desktop; homogeneous card
lists reflow via `.grid-auto`) — same markup mobile↔desktop, **no `@media`, no new deps**. The editorial
paper design system lives in `src/styles/app.css`, scoped under a **`.ci-app`** wrapper so it can't collide
with the Research tab's `.research-root`. Admin has its own admin-only `.adm-*` CSS — **never import
`.adm-*` into the user bundle.** New screens use the existing tokens; add no new hex outside the palette.
*Source: `CLAUDE.md` "Responsive / desktop layout" + "Conventions" (design rounds); deep record [`DESIGN-PASS.md`](../design/DESIGN-PASS.md).*

### ARCH-17 — Architecture is a governed topic: consult the canonical docs + the consistency map `[current]`
Before adding or moving a function/component/hook/api/util, read the layer rules (ARCH-2) and follow the
`docs/interview.md` **"Architecture / layering"** consistency-map row — a structural change sweeps every
file that row lists, in one commit. Canonical docs win over stale planning/design notes for their domain.
An architectural decision that changes is recorded here (and its deep doc), never overwritten silently.
*Source: [`docs/interview.md`](../interview.md) consistency map; [`AGILE.md`](../product/AGILE.md) Definition of Done; `CLAUDE.md` Conventions.*

---

## By-design exceptions (deliberate — not violations)

These are intentional deviations from a textbook layering; a reader should not mistake them for drift.

- **Backend has no controller/service/model split** — `functions/index.js` colocates HTTP routing +
  external API calls + Firestore access per handler. Documented OPTIONAL in [`NEXT-STEPS.md`](../product/NEXT-STEPS.md)
  §2; for a single serverless codebase, splitting adds files without real benefit (KISS). Pure logic is
  still extracted into the 13 helper modules (ARCH-5). `[by-design-exception]`
- **Frontend model logic lives in `api/firebase-*.js`** — the batched `writeBatch`+`increment` persistence
  is normal data-access work; `firebase-database.js` *is* the frontend model layer, so judging it as
  "fetch-only" mislabels it. `[by-design-exception]`
- **CRUD + upgrade orchestrators stay in `CryptoIdea.jsx`** — the portfolio CRUD handlers and the
  upgrade/downgrade overlay flow are coupled to UI/form/auth state shared across the app; hook-ifying would
  relocate deps, not reduce them (documented in the `usePortfolios`/`useUpgrade` headers + §1b).
  `[by-design-exception]`
- **Isolation is logical, not physical** — one database, per-uid subtrees, rules as the wall (ISO-D1). A
  database/project per account is an anti-pattern here. `[by-design-exception]`

---

## Known violations to fix

Genuine deviations from the clean rule (stated above **without** a carve-out). Listed here as
violations-to-fix, not accepted exceptions.

- **D4 — `src/components/education-page.jsx` calls `fetch("/api/subscribe")` directly** (line ~16),
  contradicting ARCH-2 ("components never fetch"). It is the **only** component in the codebase with a
  `fetch()`. **Planned resolution (founder, 2026-08-08):** reduce `education-page.jsx` to just a link in
  `index.html`, removing the component-level fetch entirely — tracked as **`ARCH-DOC-FIX-2` (REQUIRED)** in
  the backlog (its own small code commit; add/extend a guard test so a component-level `fetch` can't
  reappear). `[migration-in-progress]`

### Already resolved (do not copy stale "TODO" language)

Recorded so the clean rule reads as `current` and the fix is not re-opened:

- **D3 — inline `onclick` handlers on the landing billing toggle + Subscribe button: RESOLVED.** The
  audit spec (2026-08-05) listed 3 inline `on*` handlers in `index.html`; they were rewired to
  `addEventListener` in `public/landing.js` (buttons now carry `id="btnMonthly"` / `id="btnYearly"` / `id="subscribeBtn"`)
  by **commit `824b903` (PR #44, 2026-08-08)** — landing before this doc. ARCH-10's "no inline `on*`
  handlers" therefore holds as `current`; `ARCH-DOC-FIX-1` is **not needed** (superseded — see the
  cross-reference flag in NEXT-STEPS §ARCHITECTURE-DOC).
- **CSP `script-src` `'unsafe-inline'` removed for scripts** (D12, 2026-07-03) — done; note `style-src`
  still allows it (ARCH-10 states this precisely).
- **Signups are server-enforced** (`beforeCreateUser`, ADMIN-0) — the client `/api/config` gate is
  belt-and-braces, not the enforcement point.
- **Grant-admin UI moved into Settings** (ADMIN-D3); **`setAdminClaim` removed** (the old export always
  throws; use `setManagerRole`).

### Corrected stale facts (code moved ahead of the docs)

- **D1 — backend size/shape.** The 2026-06-16 audit said "one flat 908-line `index.js`, 18 functions, no
  helper split." Reality: ≈2,400-line `index.js`, **43 exported functions**, **13 helper modules**. Correct
  framing is *"modular helpers + a per-handler-mixed `index.js`"* — the "flat monolith" phrasing is
  `[historical]`. Applied in ARCH-5.
- **D2 — admin panel layering.** `src/ARCHITECTURE.md` "known violation #1" listed `admin-dashboard.jsx` as
  calling Cloud Functions directly with `api/admin.js` as "future." Reality: **`api/admin.js` exists** and
  the panel is **hook-driven** (`useAdminDashboard`, no `httpsCallable`/`firebase` imports — fixed in
  `df83e51`). The migration is *"layering done, with documented exceptions"*, not "in progress." Applied in
  ARCH-2/ARCH-8 and in `src/ARCHITECTURE.md`.

---

## Cross-references / interplay

- **`src/` layer detail + migration status:** [`src/ARCHITECTURE.md`](../../src/ARCHITECTURE.md) (the sub-doc this composes over).
- **Historical point-in-time audit:** [`ARCHITECTURE-AUDIT.md`](../testing/ARCHITECTURE-AUDIT.md) — 2026-06-16 snapshot, superseded by this file (kept for history).
- **Current code reality / file index:** [`CLAUDE.md`](../../CLAUDE.md) + [`CODEBASE-MAP.md`](../product/CODEBASE-MAP.md).
- **Visual companion:** [`docs/diagrams/frontend-layered-architecture.svg`](../diagrams/frontend-layered-architecture.svg) (+ the per-topic diagrams cited per rule).
- **Deep domain docs (this file states the rule; they own the numbers/decisions):**
  caching → [`CACHE-POLICY.md`](CACHE-POLICY.md); API surface + keys → [`API-SECURITY.md`](../security/API-SECURITY.md) + [`openapi.json`](../../openapi.json);
  isolation → [`ISOLATION.md`](../security/ISOLATION.md); billing/pricing → [`BILLING.md`](BILLING.md) + [`PRICING.md`](PRICING.md);
  product → [`PRODUCT-DECISIONS.md`](PRODUCT-DECISIONS.md); design → [`DESIGN-PASS.md`](../design/DESIGN-PASS.md).
- **Build order / backlog:** [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) §1/§2 + §ARCHITECTURE-DOC.
- **Process:** [`docs/interview.md`](../interview.md) consistency map · [`AGILE.md`](../product/AGILE.md) Definition of Done.

---

> **Kaizen:** update this file when an architectural decision changes — don't overwrite history
> silently. If the code moves ahead of a rule, correct the rule and mark the old framing `[historical]`
> (as D1/D2 do). If a rule is deliberately deviated from, record it under **By-design exceptions**; if it's
> a real gap, record it under **Known violations to fix** and queue the fix in the backlog.
