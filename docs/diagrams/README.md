# Architecture Diagrams

Saved, version-controlled drawings of how Crypto Idea is built. Open the `.svg`
files in any browser or VS Code. Authored per the **`drawing-diagram`** skill;
**when a component is built or changes, its diagram is added/updated here.**

## Finished diagrams
| Diagram | What it shows |
|---------|---------------|
| [system-overview.svg](system-overview.svg) | The big picture — every component (3 front-ends, Hosting/CDN, Cloud Functions, Firestore collections, CoinGecko + PayPal) and how they connect. |
| [coin-data-flow.svg](coin-data-flow.svg) | How coin metadata, prices and history flow to the DCA calculator vs the app — the shared `cache/universe`, the hot/tail split, the refresh jobs, and the single CoinGecko upstream. |
| [api-key-flow.svg](api-key-flow.svg) | How the CoinGecko/PayPal keys move from the admin panel to the locked `config/app` doc to upstream calls — and why no browser can ever read them. |
| [multi-agent-workflow.svg](multi-agent-workflow.svg) | Running several agents on one project safely — worktrees + lanes, one shared `.git`/`master`, the single shared dev stack. |
| [auth-and-session.svg](auth-and-session.svg) | Register / login / logout / reset via Firebase Auth (password never on device); `onAuthChange` → `useAuthSession` loads the server-authoritative tier + portfolios; admin = a verified custom claim. |
| [firestore-data-model.svg](firestore-data-model.svg) | The nested owner-only tree (users → portfolios → coins → transactions) with per-parent counters, plus the server-only top-level docs (config/app, cache/universe, historyCache, audit) and how counters enforce tier limits. |
| [authorization-and-tier-limits.svg](authorization-and-tier-limits.svg) | The rule gates every write passes (signed-in → owner/admin → field guards → counter+limit), the per-tier limits sourced from `config/app.plans`, and the invariants (no self-upgrade, no counter smuggling, locked config/audit). |
| [paypal-subscription-flow.svg](paypal-subscription-flow.svg) | Subscribe (createSubscription → PayPal approve → /pro-success), the signature-verified webhook, and cancel. **Historical — the tier-setting/cancel semantics changed in BL-1/R29; see [subscription-lifecycle.svg](subscription-lifecycle.svg).** |
| [emulator-dev-stack.svg](emulator-dev-stack.svg) | The local dev stack — `start:all` runs the Vite dev server as a child of `firebase emulators:exec` (one lifecycle); browser :3000 proxies `/api` to the Functions emulator :5001 → Firestore/Auth emulators with on-demand cache fill; in-memory so re-seed each start; ports + the Windows orphan-port note. |
| [deploy-hosting-cdn.svg](deploy-hosting-cdn.svg) | How a deploy ships — `npm run deploy` builds only `dist/` then `firebase deploy` pushes Hosting (CDN) + Functions + rules; Hosting rewrites route by first match (`/api/**`→function, `/admin`/app routes→HTML, `**`→landing); HTML is no-cache while hashed assets are immutable, SW stays no-cache; HSTS + tight CSP on every response. |
| [frontend-layered-architecture.svg](frontend-layered-architecture.svg) | The `src/` layering — components (UI) → hooks (logic/state) → api/ (fetch only), everything → utils/ (pure); `AppContext`/`useApp()` instead of prop-drilling; `features/research/` as a self-contained vertical slice; plus the honest migration audit (what still lives in the shell). |
| [config-and-feature-flags.svg](config-and-feature-flags.svg) | One locked `config/app` doc as the single source — admins write it via `saveConfig`; secrets stay server-side (`getConfig`, 5-min cache), a non-secret subset (maintenance, signups, plans, analytics, legal) is published fresh via public `/api/config` (60s CDN); the client uses it for the maintenance screen, signups gate, and pricing. |
| [rate-limiting-and-abuse.svg](rate-limiting-and-abuse.svg) | Bot/abuse protection on the public API — per-IP in-memory sliding window with separate read (60/min) and write (subscribe, 5/min) budgets → 429; the subscribe endpoint layers a honeypot, email validation, and a server-side provider key, with App Check + reCAPTCHA as the deploy-time wall. |
| [service-worker-update-flow.svg](service-worker-update-flow.svg) | How deploys reach users — `stamp-sw.js` gives the SW a unique build id so it changes every deploy, the browser detects the new worker and auto-reloads open tabs (skipping first install), pages are served network-first (cache = offline fallback), old caches are purged on activate, and localhost never caches. |
| [multi-page-build-code-splitting.svg](multi-page-build-code-splitting.svg) | The Vite build — 5 HTML entries (landing, privacy, terms, app, separate admin) → 5 page bundles; `main.jsx` lazy-loads each route behind a `Suspense` shell; `manualChunks` isolates Firebase + vendor for cache reuse across deploys; admin code never enters the user bundle. |
| [app-buy-date-history.svg](app-buy-date-history.svg) | How the app auto-fills an accurate buy-date price for ANY coin — `useCoinHistory` (module + shared `/api/history` + CDN cache) feeds `priceAtDate` (binary search), falling back to the built-in `getHistoricalPrice` estimate; dates clamped to launch, never NaN. |
| [live-prices-polling.svg](live-prices-polling.svg) | How the app keeps prices live — `useLivePrices` seeds mock prices instantly (demo), polls `/api/prices` every 60s for held coins, flips to live on first response; the proxy serves from the shared `cache/universe` (5-min hot set + on-demand tail), errors keep the last good prices (no NaN), and upstream cost stays flat regardless of user count. |
| [data-export.svg](data-export.svg) | The two download paths from "Privacy & your data" — both call `exportMyData` (caller uid only), then JSON saves the raw payload and CSV runs the pure `buildPortfolioCsv` into a HOLDINGS summary + chronological TRANSACTIONS ledger (BOM-prefixed for Excel, cost-basis only). |
| [gdpr-self-service.svg](gdpr-self-service.svg) | User-driven data rights from the "Privacy & your data" card — exportMyData (JSON + holdings CSV), deleteMyAccount as a SOFT delete (deleted/deletedAt, data kept, Auth not disabled), restoreMyAccount within 30 days, the re-login Restore screen, and the daily purgeExpiredTrash that erases accounts past the window. No IDOR; soft-delete fields are server-only. |
| [admin-operations.svg](admin-operations.svg) | Admin callables behind the ADMIN-SEC role gates — read/insight for any admin (getStats, listUsers, lookupUser, listAudit) vs audited mutations by role: manager-or-owner (setUserTier, suspendUser, adminTrashUser…), owner-only (deleteUser), owner + step-up re-auth (getAdminConfig, saveConfig, setManagerRole); owners protected by identity, self-target blocked, no holdings exposed. |
| [admin-trash-tab.svg](admin-trash-tab.svg) | The 30-day soft-delete trash — a user's `deleteMyAccount` sets server-only `deleted`/`deletedAt`; the admin Trash tab (`partitionUsers` split, `trashDaysLeft` countdown) offers Restore (`restoreUser`, reversible) vs Delete now (`deleteUser`, permanent, self-block + MIN_ADMINS guard), and `purgeExpiredTrash` auto-erases past the window. |
| [research-tab-module.svg](research-tab-module.svg) | The `src/features/research/` vertical slice — one bridge file (`Research.jsx` via AppContext) feeds the container + hooks (`useHoldings`/`usePrices`/`usePortfolio`/`usePulse`/`useAsk`), which read app-native data only (portfolio entries + `useLivePrices` + cached `/api/history`) and render Overview / Coins / Ask; conviction (rubric reducer, mock-fed) + AI (`ai-client` offline) are clean Wave-B seams. Never calls CoinGecko/Anthropic from the browser. |
| [analytics-and-legal-injection.svg](analytics-and-legal-injection.svg) | How admin-set, non-secret analytics/legal IDs reach the page — `saveConfig` → locked `config/app.analytics`+`legal` → public `/api/config` (fresh, 60s CDN) → `site-meta.js` conditionally injects the Termly cookie banner (consent first, auto-block) + GA4 + Plausible, and `privacy.html`/`terms.html` embed the Termly docs by id; every external script is gated by the `firebase.json` CSP allow-list. No redeploy, off by default. |
| [conviction-engine.svg](conviction-engine.svg) | Evidence → the pure rubric reducer (≥2-source gate, 4-state pills + reason chips, catalyst expiry) → CoinCard pills + the funnel bridge note; the dashed Wave-B lane (fetchers → Claude + fail-closed validator → shared `convictionCache` → `getConviction`) is labeled TARGET — only the evidence source swaps. |
| [learn-surface.svg](learn-surface.svg) | The Learn tab — static 9-module/50-lesson content × the live `users/{uid}/learn/progress` doc (C-A3 `watchLearnProgress` listener) meeting in `useLearn`; XP moves only through a passed quiz, saves are awaited with revert+toast (C-R2e), and level/badges/module states are always derived, never stored. |
| [subscription-lifecycle.svg](subscription-lifecycle.svg) | The BL-1+R29 billing machine — guarded `createSubscription`, the idempotent plan-aware webhook (no instant tier drops; markers + endDate), the daily `enforceSubscriptionPeriods` flip, the R29 re-checkout fork (deferred trim), and the owner-immutable billing fields. **Supersedes the tier-setting shown in paypal-subscription-flow.svg.** |

## Backlog — diagram everything (the auto-loop worklist)
The drawing loop draws **one per iteration**, ticks it, commits, and stops when all are done.
- [x] system overview
- [x] coin data flow (prices/history, hybrid)
- [x] API-key flow
- [x] multi-agent workflow
- [x] auth & session (register / login / `onAuthChange` / custom-claim admin)
- [x] Firestore data model (users → portfolios → coins → transactions + counters)
- [x] authorization & tier limits (owner/admin rules + counter-enforced plan ceilings)
- [x] PayPal subscription + webhook flow (create → approve → verified webhook → tier)
- [x] conviction engine (rubric + mock seam + Wave-B target lane)
- [x] Learn surface (content × live progress × quiz gate)
- [x] subscription lifecycle v2 (BL-1 idempotent webhook + period-end sweep + R29 re-checkout)
- [x] admin dashboard operations (getStats / listUsers / lookup / setTier / suspend / delete / audit)
- [x] GDPR self-service (deleteMyAccount / exportMyData) — covered by [gdpr-self-service.svg](gdpr-self-service.svg)
- [x] live-prices polling (app `useLivePrices`, 60s, demo→live)
- [x] app buy-date history (`useCoinHistory` + `priceAtDate`, fallback)
- [x] multi-page build + code-splitting (Vite `manualChunks`, lazy routes, dist)
- [x] service-worker update flow (network-first, build stamp, auto-reload on deploy)
- [x] rate-limiting & abuse (per-IP read/write budgets, honeypot, App Check)
- [x] config & feature flags (`config/app` → public `/api/config`, maintenance/signups)
- [x] frontend layered architecture (`src/` api / hooks / components / utils)
- [x] deploy: Hosting / CDN / rewrites / cache headers
- [x] emulator dev stack (`start:all` one-lifecycle, ports, on-demand cache fill)
- [x] GDPR self-service & soft-delete (`deleteMyAccount` → 30-day trash → `restoreMyAccount` / `purgeExpiredTrash`)
- [x] data export (`exportMyData` → JSON + holdings/transactions CSV via `buildPortfolioCsv`)
- [x] admin Trash tab (restore / purge-now, days-left countdown, server-only `deleted` flag)
- [x] Research tab module (`src/features/research/` — Overview / Coins / Ask; app-native data, no new API calls)
- [x] App Controls & feature flags (`config/app.flags` → public `/api/config`, maintenance / signups-off) — covered by [config-and-feature-flags.svg](config-and-feature-flags.svg)
- [x] analytics & legal injection (`config/app.analytics`+`legal` → `/api/config` → `site-meta.js`, Termly/GA4/Plausible + CSP)

## Conventions (see the `drawing-diagram` skill for the full guide)
- **Blue** = public / DCA flow.  **Grey** = app flow.  **Dark** = upstream / refresh / external.
- Colors use `var(--token, #fallback)` so they theme in chat **and** render standalone.
- Cadence ("every 5 min"), cost, and "why" notes go on the diagram itself.
- Each `<svg>` is `role="img"` with a `<title>` + `<desc>` for accessibility.

## Keeping diagrams in sync
**The rule: a diagram is wrong the moment the code it describes changes.** Treat a diagram
like a test — part of the change, not an afterthought.

- **New feature/component built** → add a backlog line below, then draw it (new `.svg` + index row).
- **Existing behavior changed** (cadence, limits, flow, endpoints, a renamed callable) → **edit the
  affected `.svg`** and any note that quotes a number, so the drawing never drifts from the code.
- **Feature removed** → delete its `.svg`, its index row, and its backlog line.

How to trigger it (either works):
- **On demand** — tell the agent "I changed X, redraw it" / "draw the new Y"; it does that one diagram.
- **Via the loop** — add the item to the backlog; the drawing loop picks it up on its next firing.
  (The loop stops itself when the backlog is empty, so re-adding an item — and re-arming the loop —
  is what restarts it.)

Same workflow every time (see the `drawing-diagram` skill): render inline + save the `.svg` +
update this index/backlog with **targeted edits** + commit **only** `docs/diagrams/` paths.

> **Backlog drained (2026-06-28):** every item above is checked — the once-undiagrammed features
> (Research tab, soft-delete/30-day trash + restore, CSV/JSON data export, GDPR self-service,
> analytics/legal injection, App Controls flags) are now all covered. The loop stops when the backlog
> is empty; to restart it, add a new backlog line for the next built/changed component and re-arm `/loop`.

## Status note
`coin-data-flow.svg` matches the **implemented** hybrid: `refreshPrices` refreshes
the hot top ~1,250 (`HOT_PAGES`=5) every 5 min; the tail (1,250–3,000) is priced
on demand by `/api/prices`; `refreshUniverseDaily` refreshes all ~3,000 daily.
The diagram says "~1,300" — the code default is the nearest page boundary (~1,250),
tunable via `HOT_PAGES`.
