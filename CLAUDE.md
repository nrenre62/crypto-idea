# Crypto Idea — project guide for Claude

Crypto portfolio tracker + DCA calculator PWA. **Vite + React 18 + Firebase.**

## How to run (always start the whole stack together)
- **`npm run start:all`** — emulators + dev server in one lifecycle (start one → start all; Ctrl-C stops all).
  - Vite dev: http://localhost:3000  · Hosting (built `dist/`): http://localhost:5000  · Emulator UI: http://localhost:4000
  - Emulators: auth 9099, firestore 8080, functions 5001 (`/api`), pubsub 8085.
- `npm run dev` alone runs ONLY Vite → `/api/*` fails with `ECONNREFUSED :5001`. Don't use it alone.
- Realtime Database & Storage emulators are intentionally off — the app doesn't use them.

## Build, test, deploy
- `npm run build` — Vite build + stamps the service worker. Must be clean before deploy.
- `npm run test:rules` (7 tests) and `npm run test:integration` (4 tests) — Firestore rules + data layer, via emulators.
- `npm run deploy` — build + `firebase deploy` (needs the Blaze plan for functions).

## Architecture
- **Multi-page Vite:** `index.html` = static marketing landing (`#dca` = free DCA calculator); `app.html` = React user app (`main.jsx` routes `/app`, `/edge`, `/pro-success`); `admin.html` = SEPARATE admin app (`admin-main.jsx`) served at `/admin` — its code is NOT in the user bundle.
- **Code-split for fast first loads:** `main.jsx` lazy-loads routes; `vite.config.js` `manualChunks` isolates Firebase into its own cached chunk. Keep the entry chunk small.
- **Backend = `functions/index.js`** (Node 22, CommonJS). `api` HTTP function proxies CoinGecko with shared, cached Firestore docs so upstream cost is FLAT regardless of user count. PayPal + admin callables also live here.
- **Data layer:** Firestore via `firebase-database.js` / `firebase-auth.js`; counters maintained with `writeBatch` + `increment`.

## Security model (don't break these)
- **Only `dist/` ships to the browser.** `functions/`, `firestore.rules`, configs, scripts, tests are backend/build-only. No secret ever ships — API keys live in `functions/` + the locked `config/app` Firestore doc. The in-bundle `VITE_FIREBASE_*` web config is public by design.
- **Admin = Firebase custom claim `{admin:true}`**, never an email list.
- Firestore rules are the security boundary; users can't change their own `tier`; `/config` is server-only. Verify rule changes with `npm run test:rules`.
- Output encoding: React auto-escapes; the static landing uses `textContent`, never `innerHTML`, for API data.

## Conventions
- **Agile workflow ([`AGILE.md`](AGILE.md)):** work the prioritized backlog (`NEXT-STEPS.md`) one
  small, shippable increment at a time; every increment meets the **Definition of Done** (KISS +
  secure, tests green, verified, committed, docs updated). Retrospective = Kaizen (leave it better,
  log new opportunities).
- **KISS by design:** build the simplest thing that works — plain readable code, fewer moving
  parts, no new dependency when a few lines do, no premature optimization. Simple = fewer bugs,
  faster loads, easier fixes, smaller attack surface. Pairs with security-first below.
- **Security by design:** keep secrets server-side, deny-by-default rules, validate input, encode
  output (see the "Security model" section above + the `secure-by-design` skill).
- **Commit every change** to git with a clear message — don't wait to be asked.
- **On finishing a session:** commit everything, update README + skills if relevant, shut down emulators + dev server, confirm a clean tree.
- **Every change must be production-ready.**
- Reusable patterns live in user skills: `firebase-saas-starter`, `landing-page-design`, `secure-by-design`.

## Admin & privacy (functions/index.js)
- **Admin is a SEPARATE app at `/admin`** (`admin.html` / `src/admin-main.jsx`), not part of the user app. It has its own login that verifies the `{admin:true}` claim and signs out non-admins. The user bundle contains no admin code. A different URL is NOT the security boundary — the claim check (server-side in every admin function, re-checked in the admin app) is. **2FA for admins is deferred to go-live** (needs Blaze + Identity Platform MFA).
- **Min 2 admins (can't be wiped out):** `MIN_ADMINS=2` + `countAdmins()` block `deleteUser`/`setAdminClaim` demotion/`deleteMyAccount` when they'd leave fewer than 2 admins. Keep ≥2 admins.
- Admin-only callables: `getStats` (combined usage, no personal data), `listUsers` (full list — Auth+profile merge, operational data only, capped 5000), `lookupUser`, `setUserTier`, `suspendUser`, `deleteUser` (GDPR erasure; blocks self-target), `getAdminConfig` (reads saved config; secrets returned as set-flags only). Admin = `{admin:true}` claim.
- Users tab = full list, searched + paginated 50/page client-side; row click opens per-user actions. (Earlier this was on-demand-lookup-only; now it's a full list.)
- Settings: `saveConfig` writes the locked `config/app` doc; the form pre-fills from `getAdminConfig` and a blank secret field keeps the saved value (never wiped on re-save).
- **App Controls (public flags):** `config/app.flags` = `{maintenance, signupsEnabled}`, set via the Settings "App Controls" toggles. The app reads them from the PUBLIC **`/api/config`** endpoint (non-secret only, CDN-cached ~60s) on load → maintenance shows a "we'll be right back" screen; signups-off disables the Register tab. Flags apply within ~60s (cache). Note: signups-off is a client gate; hard server enforcement needs an Auth `beforeCreate` blocking function at go-live.
- **Analytics & legal:** `config/app.analytics{ga4,plausible}` + `config/app.legal{termlyUuid,termlyPrivacyId,termlyTermsId,cookieBanner}`, exposed via `/api/config`. `public/site-meta.js` (on landing+app) injects GA4/Plausible/Termly-consent when set; `privacy.html`/`terms.html` auto-embed Termly docs by id. CSP (firebase.json) allows those domains.
- **Audit log:** every admin action (tier/suspend/delete/admin-grant/config-save) is appended to a server-only `audit` collection (rules deny client access) by `writeAudit()`; viewable in the dashboard "Audit" tab via `listAudit`. Uses `Date.now()` (admin.firestore.FieldValue is undefined in the emulator).
- **Editable plans:** `config/app.plans.{free,pro,premium}.{price,portfolios,coins,transactions}` (admin "Plans & Pricing" card; `DEFAULT_PLANS`/`mergePlans` fallback). Prices drive `getStats` revenue + the landing/app price display; **limits are enforced by `firestore.rules`, which read `config/app.plans` via `get()` with a fallback to the built-in defaults** — so the configured limit is the real ceiling. Covered by `npm run test:rules` (the "configured limits override defaults" test).
- Self-service GDPR callables (act on caller's own uid, no IDOR): `deleteMyAccount`, `exportMyData` — wired into the app's Account → "Privacy & your data" card. Two download buttons: **Download CSV (spreadsheet)** — `src/utils/export-csv.js` `buildPortfolioCsv()` turns the export into a HOLDINGS summary (net held per coin) + TRANSACTIONS detail, BOM-prefixed for Excel; and **Download all my data (JSON)** — the full raw export.
- Admin Users tab = full users list (search + 50/page) with per-user actions; Overview shows aggregate only (no holdings anywhere).
- `privacy.html` / `terms.html` are static pages (vite inputs) with a Termly placeholder to paste the embed snippet into later.
- **Two admins, no single point of failure:** admin is the `{admin:true}` claim, so have ≥2. Dev: the seed makes `admin@test.com` + `admin2@test.com` (backup). Prod: register the backup as a normal account, then promote it — an existing admin calls `setAdminClaim({email, admin:true})` from the panel, or run `functions/scripts/set-admin.js <email>` with a service-account key. Store both admins' creds in a password manager.
- **Seed test data:** `node functions/scripts/seed-emulator.js` → admins `admin@test.com` + `admin2@test.com` / `test1234` + test users (emulator is in-memory; re-run after a restart). New function exports need a stack restart to register (emulator hot-reloads edits, not new triggers).

## Known notes
- **One shared coin universe (HYBRID):** `cache/universe` (one Firestore doc, ~3,000 coins = metadata + price) backs BOTH front-ends. `refreshPrices` (5 min) refreshes only the HOT set (`HOT_PAGES`=5, top ~1,250, always merges); `refreshUniverseDaily` (24h) refreshes all ~3,000 + prunes delisted. `/api/prices` serves a coin from cache only if fresh (`HOT_TTL`); stale long-tail / off-list held coins are refetched on demand and folded back (metadata preserved; price-only entries skipped by search/coinlist). Endpoints: `/api/coinlist` (DCA, +price, CDN 24h), `/api/search` + `/api/prices` (app). Replaced the old `cache/markets`+`cache/coinlist`+`cache/longtail` trio. Diagrams: `docs/diagrams/`.
- **Cost (hybrid):** hot ~1,250 @ 5 min ≈ **~44k CoinGecko calls/month → needs a PAID plan** (Lite ~100k/mo fits; flat regardless of user count). Free Demo tier degrades gracefully (only top coins 5-min-fresh; 429'd pages skipped). Raise `HOT_PAGES` to 12 for all-3,000-hot (~105k/mo, Analyst plan); lower it to save calls.
- **Landing DCA calculator** (`index.html` `#dca`) is the ONLY DCA calc (removed from the app). ~0 backend calls per visitor: loads the list ONCE from `/api/coinlist` (now with price, CDN-cached 24h) and searches client-side; a calc fetches only `/api/history` (CDN-cached). The APP auto-fills buy-date prices from real history too (`useCoinHistory` → cached `/api/history`, fallback to the built-in estimate). CDN caching is a deployed-Hosting behavior — the local dev server invokes the function each time, so test the "no per-visitor calls" effect after deploy.
- **Config:** `functions.config()` was removed in firebase-functions v7 (now on v7 + firebase-tools v15). Secrets come from the locked `config/app` doc (primary) or env / `functions/.env` (fallback; PayPal plan IDs + `APP_URL` are env-only). See `functions/.env.example`.
- Pub/Sub scheduled functions register in the emulator but don't auto-fire on cron (trigger from the UI); Cloud Scheduler fires them in prod.
- Repo is local-only (no GitHub remote yet).
- Deploy-time config (no code): set `VITE_RECAPTCHA_SITE_KEY` + enable App Check enforcement in console; paste Termly snippets into privacy/terms pages; add a CoinGecko Demo key; create + promote a real backup admin (see "Two admins" above) and store both admins' creds in a password manager; enable Identity Platform MFA (2FA) for admin accounts and add the enrollment/challenge flow to the admin app.
