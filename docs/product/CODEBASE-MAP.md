# Crypto Idea — Codebase Map

> Generated 2026-06-16. Scope: all 98 git-tracked files. `node_modules/` excluded.
> The two `package-lock.json` files and the 8 PNG icons are generated/binary, so their
> "line counts" aren't meaningful code (noted as such).
>
> **Addendum (later, same day) — files added after this map was generated** (architecture/refactor
> sweep; ask me to regenerate for a fully-current map):
> | File | LOC | What |
> |---|---|---|
> | `src/utils/pnl.js` | 45 | Pure P&L math (holdings/coinPnl/portfolioPnl) — extracted from components |
> | `src/utils/usage.js` | 14 | Pure plan-usage % math — extracted from `CryptoIdea.jsx` |
> | `src/hooks/useAdminDashboard.js` | 164 | All admin-panel state/effects/handlers (extracted from the component) |
> | `tests/unit/pnl.test.js` | 70 | P&L math tests |
> | `tests/unit/usage.test.js` | 27 | Usage-% tests |
> | `tests/unit/admin-dashboard.test.jsx` | 64 | Admin panel interaction tests (4 tabs + user detail) |
> | `tests/unit/education-page.test.jsx` | 42 | Education-page subscribe regression tests |
> | `tests/unit/format.test.js` | 19 | `fmtPriceInput` tests |
>
> Also: `useUpgrade.js` gained `dueDowngrade`; `format.js` gained `fmtPriceInput`; dead exports
> (`getUserProfile`/`updateUserTier`/`renamePortfolio`) + duplicate `TIER_LIMITS` removed from the
> api layer. **Unit tests are now 88** (was 65); rules tests 10.

## 1. Folder structure (tree)

```
crypto-idea/
├── .claude/
│   ├── commands/        # project slash commands (/finish, /scan, /security-audit, /start, /update-deps)
│   └── launch.json
├── functions/           # backend — Cloud Functions (Node 22, CommonJS)
│   └── scripts/         # one-off ops scripts (seed emulator, bootstrap admin)
├── public/
│   └── icons/           # PWA icons (8 PNGs, binary)
├── scripts/             # build helpers (icon gen, service-worker stamp)
├── src/                 # frontend (Vite + React 19)
│   ├── api/             # backend-access layer (Firebase + /api proxy wrappers)
│   ├── components/      # screens & UI primitives
│   ├── hooks/           # state containers & business logic
│   └── utils/           # pure helpers + reference data
├── tests/
│   └── unit/            # Vitest (jsdom) component/hook/api tests
├── *.html               # multi-page entries: index (landing), app, admin, privacy, terms
└── *.md / config        # docs + build/deploy/firebase config
```

## 2 & 3. Every file — description + line count

### Root: docs & config
| File | LOC | What it does |
|---|---|---|
| `README.md` | 384 | Primary project docs — architecture, backend/proxy, build/test/deploy, security model |
| `CLAUDE.md` | 65 | Project guide for Claude — how to run, conventions, security model, admin/privacy notes |
| `NEXT-STEPS.md` | 143 | Prioritized Agile backlog (refactor status, known bugs, go-live checklist) |
| `AGILE.md` | 45 | Lightweight solo-Agile workflow + Definition of Done |
| `TEST-REPORT.md` | 66 | Snapshot of test coverage/results |
| `package.json` | 35 | Root manifest — scripts (`start:all`, `test:unit`, `build`, `deploy`) + dev deps |
| `package-lock.json` | 13,130 | *Generated* dependency lockfile |
| `.env.example` | 34 | Template for public `VITE_FIREBASE_*` / reCAPTCHA web config |
| `.gitignore` | 39 | Ignore rules (node_modules, dist, debug logs, env) |
| `.firebaserc` | 5 | Firebase CLI project alias → `demo-crypto-idea` |
| `firebase.json` | 50 | Hosting rewrites, security headers (CSP/HSTS), emulator ports, rules location |
| `firestore.rules` | 186 | Security boundary — owner-only access, immutable tier, counter-based tier limits, server-only config/audit |
| `vite.config.js` | 85 | Multi-page build config, Firebase chunk isolation, `/api` dev proxy, Vitest setup |
| `deploy.sh` | 85 | Bash deploy — checks prereqs, validates `.env`, builds, runs `firebase deploy` |

### `.claude/`
| File | LOC | What it does |
|---|---|---|
| `commands/start.md` | 13 | `/start` — boot the full local stack and verify it |
| `commands/finish.md` | 15 | `/finish` — end-of-session: commit, update docs, shut down stack |
| `commands/scan.md` | 15 | `/scan` — full health scan (build + unit tests + dep audit) |
| `commands/security-audit.md` | 23 | `/security-audit` — audit against the secure-by-design checklist |
| `commands/update-deps.md` | 17 | `/update-deps` — safely check/update/verify deps (root + functions) |
| `launch.json` | 11 | Debug launch config for the Vite dev server |

### `functions/` — backend
| File | LOC | What it does |
|---|---|---|
| `index.js` | 908 | All Cloud Functions: PayPal billing, cached CoinGecko proxy, admin (user mgmt/tier/audit), GDPR export+delete, public `/api/*` endpoints |
| `scripts/seed-emulator.js` | 66 | Seeds the emulator with 2 admins + test users + sample portfolios/coins |
| `scripts/set-admin.js` | 47 | Grants/revokes the `{admin:true}` claim via a service-account key (bootstrap first admin) |
| `package.json` | 14 | Functions manifest (Node 22; firebase-admin, firebase-functions) |
| `package-lock.json` | 2,755 | *Generated* functions lockfile |

### `src/` — frontend entry & top-level
| File | LOC | What it does |
|---|---|---|
| `CryptoIdea.jsx` | 495 | Main app shell — auth/data effects, handlers, the `ctx` object, router for all user screens |
| `main.jsx` | 44 | Vite entry — code-splits & lazy-loads the 3 routes (app/education/pro-success) |
| `admin-main.jsx` | 88 | Separate `/admin` entry — admin login that verifies the `{admin:true}` claim |
| `ARCHITECTURE.md` | 73 | Layer rules (api/hooks/components/utils) + migration detail |

### `src/api/` — backend-access layer
| File | LOC | What it does |
|---|---|---|
| `firebase-database.js` | 274 | Portfolio/coin/transaction CRUD with atomic counters (`writeBatch`+`increment`) |
| `firebase-auth.js` | 153 | Auth wrappers (register/login/logout/reset/watch) + first-login profile & default portfolio |
| `firebase.config.js` | 83 | Firebase SDK init (real/demo), emulator wiring in dev, App Check (reCAPTCHA v3) |
| `admin.js` | 59 | Wrappers for 9 admin-only callables |
| `coingecko.js` | 29 | Live prices + coin search via the same-origin `/api` proxy |
| `account.js` | 17 | GDPR self-service wrappers (`exportMyData`, `deleteMyAccount`) |
| `config.js` | 13 | Fetches public app config (flags, tier limits) from `/api/config` |

### `src/components/` — screens & UI
| File | LOC | What it does |
|---|---|---|
| `admin-dashboard.jsx` | 565 | Admin UI — stats, user management, settings/config, audit log |
| `Account.jsx` | 159 | Profile, plan usage bars, subscription status, portfolio manager, GDPR/logout |
| `education-page.jsx` | 151 | Educational page — six investing principles + email capture |
| `Login.jsx` | 121 | Login/register + post-register plan picker + upgrade/billing overlay |
| `CoinInfo.jsx` | 106 | Read-only coin overview (price, market data, position, history milestones) |
| `Portfolio.jsx` | 72 | Main logged-in screen — total value, switcher, swipeable asset list |
| `pro-success.jsx` | 56 | Post-upgrade success page |
| `AddEntry.jsx` | 54 | Buy/sell form — date clamped to launch, auto-filled historical price |
| `Detail.jsx` | 49 | Coin detail — live price, holdings/P&L, transaction list w/ edit/delete |
| `ForgotPass.jsx` | 35 | Password-reset screen (Firebase reset link) |
| `Contact.jsx` | 25 | Premium-inquiry message form |
| `ui.jsx` | 21 | Shared UI primitives — icon set, coin icon, screen header |
| `StatusDot.jsx` | 19 | Live/offline API-connection indicator pill |
| `PortfolioBar.jsx` | 17 | Horizontal portfolio switcher (multi-portfolio / Pro) |
| `Search.jsx` | 15 | Add-coin search screen |
| `Loading.jsx` | 12 | Full-screen startup loading state |

### `src/hooks/` — state & logic
| File | LOC | What it does |
|---|---|---|
| `useAuthSession.js` | 78 | Auth lifecycle — watch state, load portfolios, auto-save profile, nav |
| `useUpgrade.js` | 76 | Tier-limit logic — billing-cycle dates, downgrade impact preview, trim-to-tier |
| `useCoinSearch.js` | 36 | Add-coin search — instant local matches + debounced live results, deduped |
| `useLivePrices.js` | 31 | Mock prices on mount, then poll `/api/prices` every 60s; tracks demo/live |
| `usePortfolios.js` | 21 | Portfolio collection state + active-portfolio derivation |
| `app-context.js` | 8 | Creates `AppContext` + `useApp()` to avoid prop drilling |

### `src/utils/` — helpers & data
| File | LOC | What it does |
|---|---|---|
| `coins.js` | 524 | Reference data — 80 built-in coins, sparse price-history milestones, DCA interpolation |
| `format.js` | 20 | Pure formatters (price, market cap, percent, id, date/time) |
| `storage.js` | 18 | JSON-encoded local key/value wrapper for non-sensitive data |
| `theme.js` | 15 | Shared visual tokens (colors, input/label styles, pill-button factory) |

### HTML entries & PWA
| File | LOC | What it does |
|---|---|---|
| `index.html` | 803 | Static marketing landing — hero, benefits, **free DCA calculator**, pricing, education |
| `app.html` | 91 | PWA app entry — React bundle, service-worker registration, deploy auto-refresh |
| `admin.html` | 27 | Admin entry — `noindex`, no service worker, claim-gated |
| `privacy.html` | 53 | Static privacy page (Termly embed) |
| `terms.html` | 53 | Static terms page (Termly embed) |
| `public/service-worker.js` | 104 | Offline caching — network-first pages, cache-first assets, API cache |
| `public/manifest.json` | 57 | PWA manifest — name, icons, theme colors, standalone mode |
| `public/site-meta.js` | 37 | Injects GA4/Plausible/Termly-consent from admin config |
| `public/icons/*.png` | (binary) | 8 PWA icons, 72–512px |
| `scripts/generate-icons.js` | 33 | Generates PNG icons from an inline SVG via sharp |
| `scripts/stamp-sw.js` | 20 | Stamps a build id into the service worker to bust caches on deploy |

### `tests/`
| File | LOC | What it tests |
|---|---|---|
| `firestore-rules.test.js` | 143 | Security rules — ownership isolation, tier immutability, admin access, counter limits (7) |
| `data-layer.test.js` | 65 | Emulator integration — registration, tier limits, transactions (4) |
| `unit/useUpgrade.test.jsx` | 96 | Upgrade hook — billing dates, downgrade impact, trimming (7) |
| `unit/CryptoIdea.smoke.test.jsx` | 89 | Full-app smoke — login → portfolio load → search → account (4) |
| `unit/admin-api.test.jsx` | 73 | Admin API wrappers (7) |
| `unit/Portfolio.test.jsx` | 67 | Portfolio + PortfolioBar — empty state, display, nudge, switching (5) |
| `unit/Account.test.jsx` | 63 | Account — subscription, usage, upgrade CTA, cancel, delete (5) |
| `unit/useAuthSession.test.jsx` | 61 | Auth hook — login, load, sub-check, logout, auto-save (4) |
| `unit/Contact.test.jsx` | 60 | Contact — form, submit, confirmation (4) |
| `unit/AddEntry.test.jsx` | 55 | AddEntry — buy/sell, validation, edit, submit (4) |
| `unit/Login.test.jsx` | 53 | Login — form, signups-disabled, error styling, billing, plan picker (5) |
| `unit/Detail.test.jsx` | 51 | Detail — tx list, P&L, holdings (3) |
| `unit/usePortfolios.test.jsx` | 50 | Portfolio state hook — derivation, updates, switching (4) |
| `unit/CoinInfo.test.jsx` | 48 | CoinInfo — market data, position, market cap (4) |
| `unit/useCoinSearch.test.jsx` | 37 | Search hook — local matches, live merge, dedup, empty (3) |
| `unit/useLivePrices.test.jsx` | 30 | Price hook — demo mocks, live polling, mode switch (3) |
| `unit/account-api.test.jsx` | 27 | Account API wrappers (2) |
| `unit/setup.js` | 9 | Vitest setup — jest-dom matchers + cleanup |

## Summary totals (excluding generated lockfiles & binary icons)

| Area | Lines |
|---|---|
| Frontend `src/` (JS/JSX) | ~3,559 |
| Backend `functions/` (JS) | ~1,021 |
| HTML entries | ~1,027 |
| Tests | ~1,077 |
| Firestore rules | 186 |
| Build/config (vite, firebase, deploy, scripts, SW, site-meta) | ~414 |
| Docs (README, CLAUDE, NEXT-STEPS, AGILE, ARCHITECTURE, TEST-REPORT) | ~776 |

Roughly **7,300 lines of hand-written code** (≈4,580 frontend+backend JS/JSX) plus ~776 lines of docs.
The two biggest files are `index.html` (803, the landing page) and `functions/index.js` (908, the entire
backend) — both single-purpose by design.

### Notes / candidates for future cleanup
- `admin-dashboard.jsx` (565) is the largest front-end file — a candidate for the same screen-extraction
  treatment NEXT-STEPS §1a applied to the user app.
- `utils/coins.js` (524) is mostly static reference data that could be split from its logic.
