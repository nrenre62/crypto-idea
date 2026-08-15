# CryptoIdea — Codebase Map

Part of [System Architecture](../decisions/ARCHITECTURE.md) — the "where does the code live" clause. A present-tense reference map of the current code tree: the HTML entries, `functions/` backend, `src/` frontend (including the `features/research/` module), `scripts/`, `tests/`, and the root config files.

See also: [Docs index](../INDEX.md) and [System Architecture](../decisions/ARCHITECTURE.md).

## Folder structure

The repo is a multi-page Vite + React 19 + Firebase app. Only `dist/` ships to the browser; everything under `functions/`, `firestore.rules`, `scripts/`, and `tests/` is backend/build-only.

```text
crypto-idea/
├── *.html               # page entries: index (landing), app, admin, privacy, terms
├── functions/           # backend — Cloud Functions (Node 22, CommonJS)
│   └── scripts/         # one-off ops scripts (seed, bootstrap admin, reset settings pw)
├── public/              # static assets + external page scripts + PWA icons/manifest/SW
│   ├── brand/           # brand marks (logo/favicon sources)
│   └── icons/           # PWA icons (8 PNGs)
├── scripts/             # build + guard helpers (icon gen, SW stamp, brand/dist/env guards)
├── src/                 # frontend (Vite + React 19)
│   ├── api/             # backend-access layer (Firebase + /api proxy wrappers)
│   ├── components/      # screens & UI primitives
│   ├── data/            # static content data (Learn library, plan benefits, journal funnel)
│   ├── features/
│   │   └── research/    # self-contained Research tab module
│   ├── hooks/           # state containers & business logic
│   ├── styles/          # app.css (user) + admin-settings.css (admin-only)
│   └── utils/           # pure helpers + reference data
├── tests/
│   ├── unit/            # Vitest (jsdom) — components, hooks, pure server modules
│   ├── firestore-rules.test.js
│   ├── data-layer.test.js
│   └── functions-callable.test.js  # live callables over HTTP (functions emulator)
└── docs/ + root config  # docs + build/deploy/firebase config
```

## HTML entries & PWA

- `index.html` — static marketing landing (hero, benefits, `#dca` free DCA calculator, pricing).
- `app.html` — PWA React app entry (loads the app bundle, service worker, Fraunces + Hanken fonts).
- `admin.html` — separate `/admin` entry (`noindex`, no service worker, claim-gated).
- `privacy.html` / `terms.html` — static legal pages that auto-embed the Termly documents by ID.
- `public/service-worker.js` — offline caching (network-first pages, cache-first assets).
- `public/manifest.json` — PWA manifest (name, icons, theme colors, standalone mode).
- `public/site-meta.js` — injects GA4 / Plausible / Termly-consent from admin config (landing + app).
- `public/landing.js`, `public/sw-register.js`, `public/termly-embed.js` — the external page scripts (CSP `script-src` has no `unsafe-inline`, so no inline scripts ship).
- `public/icons/*.png` — 8 PWA icons (72–512px); `public/brand/` — logo/favicon source marks.

## `functions/` — backend

`index.js` is the single Cloud Functions entry (Node 22, CommonJS): the `api` HTTP function (cached CoinGecko proxy + public `/api/*`), PayPal billing + webhook, and the admin/user/GDPR callables. The rest are pure, unit-tested helper modules it composes.

- `index.js` — all deployed functions: `/api/*` proxy, billing, admin callables, GDPR, scheduled jobs.
- `guards.js` — role/auth guards (`requireAdmin`/`requireManager`/`requireOwner`/`requireMfa`, per-uid budget, cooldown).
- `billing.js` — pure PayPal decisions (plan_id→tier, idempotency, cancellation/sweep patches, revenue).
- `signup-gate.js` — pure `beforeCreateUser` verdict (fail-open signups gate).
- `features.js` — the per-feature kill-switch registry (`marketData`, `checkout`, `aiResearch`).
- `flags.js` — public-flag predicates (e.g. `paidPlansOn`).
- `owner-cap.js` — owner-count cap decision for `set-admin.js`.
- `settings-auth.js` — scrypt Settings-password hashing/verification (`node:crypto`).
- `sendMail.js` — SMTP seam (`smtpConfigOf`/`sendMail`; dev logs, prod lazy-requires nodemailer).
- `announcement.js` — site-announcement shaping helper.
- `audit-diff.js` — before/after diffs for user mutations.
- `config-diff.js` — field-level `saveConfig` diff (secrets recorded as `(changed)`, owner-only detail).
- `duplicates.js` — duplicate-email grouping for the admin detector.
- `net-utils.js` — spoof-resistant IP derivation for audit + rate limiting.
- `observability.js` — Sentry seam (functions-only, `scrubEvent`, DSN-gated).
- `stats-daily.js` — daily growth-snapshot shaping + churn/delta helpers.
- `universe-utils.js` — coin-universe cache shaping helpers.
- `validate-output.js` — fail-closed AI output validator (regex prefilter, N=2 regen cap).
- `ai-cost.js` — token→cents cost + the app-wide monthly `$` budget ledger.
- `ai-anthropic.js` — raw seamed request builder + call to the AI provider (`x-api-key` header-only).
- `ai-proxy.js` — fail-closed generate→validate→judge→N=2 orchestrator (`runResearchAsk`).
- `ai-context.js` — server-authoritative holdings allowlist from the caller's own coin docs.
- `scripts/seed-emulator.js` — seeds 2 owners + a manager + test users, exportable for reuse.
- `scripts/set-admin.js` — mints/revokes owner/manager claims via a service-account key.
- `scripts/clear-settings-password.js` — lockout escape hatch that clears the Settings password.
- `package.json` — functions manifest (Node 22; firebase-admin, firebase-functions).

## `src/` — frontend entry & top-level

- `main.jsx` — Vite app entry; lazy-loads three routes (`/app` → `CryptoIdea.jsx`, `/edge` → `education-page.jsx`, `/pro-success` → `pro-success.jsx`) wrapped in an error boundary + Suspense.
- `CryptoIdea.jsx` — main user app shell: auth/data effects, handlers, the shared `ctx` object, and the router across all user screens + the 5 bottom-nav tabs.
- `admin-main.jsx` — the separate `/admin` app entry (admin login verifying the `{admin:true}` claim; signs out non-admins).
- `ARCHITECTURE.md` — the `src/`-layer rules (component → hook → api → util) + migration status.

## `src/api/` — backend-access layer

- `firebase.config.js` / `firebase.admin.config.js` — SDK init for the user app and the isolated admin app.
- `firebase-database.js` — portfolio/coin/transaction CRUD with atomic counters (`writeBatch` + `increment`) and the live-sync watchers.
- `firebase-auth.js` — auth wrappers (register/login/logout/reset/watch).
- `admin.js` / `admin-auth.js` — admin-callable wrappers and admin login/re-auth/role reads.
- `billing.js` — subscription callable wrappers (create/cancel/schedule/resubscribe).
- `account.js` — GDPR self-service wrappers (`exportMyData`, `deleteMyAccount`, `restoreMyAccount`).
- `coingecko.js` — live prices + coin search via the same-origin `/api` proxy.
- `config.js` — fetches the public app config (flags, plan limits, announcement) from `/api/config`.

## `src/components/` — screens & UI

Screens: `Portfolio.jsx`, `Detail.jsx`, `CoinInfo.jsx`, `AddEntry.jsx`, `Search.jsx`, `Account.jsx`, `Journal.jsx`, `Learn.jsx`, `Login.jsx`, `ForgotPass.jsx`, `Contact.jsx`, `RestoreAccount.jsx`, `pro-success.jsx`, `education-page.jsx`, `SettingsPwReset.jsx`, and the separate `admin-dashboard.jsx`.

Primitives & chrome: `ui.jsx` (icon set, `<Logo>`, header), `Modal.jsx`, `CoinIcon.jsx`, `StatusDot.jsx`, `PortfolioBar.jsx`, `HeaderTags.jsx`, `AnnouncementBanner.jsx`, `Loading.jsx`, `ErrorBoundary.jsx`, `learn-icons.jsx`.

## `src/hooks/` — state & logic

`app-context.js` (context + `useApp()`), `useAuthSession.js`, `usePortfolios.js`, `useUpgrade.js`, `useLivePrices.js`, `useCoinSearch.js`, `useCoinHistory.js`, `useTrending.js`, `useLearn.js`, `useProSuccess.js`, `useIsDesktop.js`, and `useAdminDashboard.js` (all admin-panel state/handlers).

## `src/utils/` — pure helpers & data

`coins.js` (built-in coin reference data + history milestones), `format.js`, `money.js` (`splitMoney`), `pnl.js`, `usage.js`, `tx.js`, `trash.js`, `journal.js`, `learn.js`, `growth.js`, `status.js`, `errors.js`, `announcement.js`, `admin-views.js`, `csv.js`, `export-csv.js`, `export-admin-csv.js`, `storage.js`, `theme.js`.

## `src/data/` — static content

- `learn-content.js` — index composing the 9 Learn modules under `learn/` (`fundamentals`, `markets`, `tokenomics`, `demand`, `risk`, `psychology`, `thesis`, `security`, `yield` — 50 lessons total).
- `journal-funnel.js` — the three manual-research findings (dilution/volume/yield) source of truth.
- `plan-benefits.js` — the exported `PLAN_BENEFITS` single source for plan copy.

## `src/features/research/` — Research tab module

A self-contained feature module (its own `components/hooks/utils/api/styles`) rendered as a bottom-nav tab via `Research.jsx` → `components/ResearchTab.jsx`. Three sub-views — Overview (`OverviewView.jsx`, `Pulse.jsx`, `AllocationBar.jsx`, `RiskMeter.jsx`, `StressTest.jsx`), Coins (`CoinsView.jsx`, `CoinCard.jsx`, `Sparkline.jsx`, `CountUp.jsx`), and Ask (`AskView.jsx`), plus `EmptyState.jsx`.

- `hooks/` — `usePortfolio`, `useHoldings`, `usePrices`, `usePulse`, `useAsk`, `useSharePulse`, `useRelativeTime`.
- `utils/` — pure logic: `pulse.js`, `notes.js` (the rotating-notes rule engine), `conviction.js` (the conviction-signal rubric reducer), `priceAdapter.js`, `portfolio.js`, `coins.js`, `sparkline.js`, `riskColor.js`, `format.js`, `time.js`, `backoff.js`.
- `api/` — `ai-client.js` (the client seam; throws until the proxy is wired) and `ai-status.js` (`AI_PROXY_LIVE` go-live flag).
- `data/mock-conviction.js` — deterministic mock evidence feeding the conviction pills until live AI ships.
- `styles/research-tab.css` — scoped under `.research-root`.

## `scripts/` — build & guard helpers

- `stamp-sw.js` — stamps a build id into the service worker to bust caches on deploy.
- `generate-icons.js` — generates PNG icons from an inline SVG.
- `check-dist-names.js` — the no-names `dist/` guard (build fails if a real investor name leaks into the bundle).
- `check-brand.js` — brand guard (enforces the one-word `CryptoIdea` spelling; logo/font presence).
- `check-env.js` — env sanity check.
- `dev-stack.js` — `start:all` lifecycle (emulators + Vite; auto-imports/re-exports `./emulator-data`).
- `jira-test-map.js` — maps CRYP-keyed tests back to their tickets.
- Ops/backup PowerShell scripts (`*.ps1`) and `brand/` assets round out the folder.

## `tests/`

- `unit/` — the Vitest (jsdom) suite: React components, hooks, and the pure server modules imported directly (`validate-output`, `guards`, `billing`, `ai-*`, `features`, `flags`, `signup-gate`, `universe-utils`, and the guard/observability modules).
- `firestore-rules.test.js` — the Firestore security-rules suite (emulator).
- `data-layer.test.js` — data-layer integration against the emulator.
- `functions-callable.test.js` — the only tier that invokes real callable bodies over HTTP (functions emulator).

## Root config

- `package.json` — root manifest (`start:all`, `dev`, `build`, `deploy`, `test:unit`, `test:rules`, `test:integration`).
- `vite.config.js` — multi-page build, Firebase chunk isolation, `/api` dev proxy, Vitest setup.
- `firebase.json` / `firebase.solo.json` — hosting rewrites, CSP/security headers, emulator ports (solo = alternate ports).
- `firestore.rules` — the security boundary (owner-only access, immutable tier, plan-limit enforcement via `config/app.plans`, server-only config/audit, onboard gate).
- `firestore.indexes.json` / `storage.rules` — Firestore indexes and the (unused) Storage rules.
- `openapi.json` — the machine-readable HTTP contract for the `/api/*` and callable surface.
- `deploy.sh` — deploy wrapper (checks prereqs, builds, runs `firebase deploy`).
- `.firebaserc`, `.env.example`, `.gitignore` — CLI alias, public web-config template, ignore rules.
