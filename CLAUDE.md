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
- **Multi-page Vite:** `index.html` = static marketing landing (`#dca` = free DCA calculator); `app.html` = React app (`main.jsx` routes `/app`, `/edge`, `/pro-success` by pathname).
- **Code-split for fast first loads:** `main.jsx` lazy-loads routes; `vite.config.js` `manualChunks` isolates Firebase into its own cached chunk. Keep the entry chunk small.
- **Backend = `functions/index.js`** (Node 20, CommonJS). `api` HTTP function proxies CoinGecko with shared, cached Firestore docs so upstream cost is FLAT regardless of user count. PayPal + admin callables also live here.
- **Data layer:** Firestore via `firebase-database.js` / `firebase-auth.js`; counters maintained with `writeBatch` + `increment`.

## Security model (don't break these)
- **Only `dist/` ships to the browser.** `functions/`, `firestore.rules`, configs, scripts, tests are backend/build-only. No secret ever ships — API keys live in `functions/` + the locked `config/app` Firestore doc. The in-bundle `VITE_FIREBASE_*` web config is public by design.
- **Admin = Firebase custom claim `{admin:true}`**, never an email list.
- Firestore rules are the security boundary; users can't change their own `tier`; `/config` is server-only. Verify rule changes with `npm run test:rules`.
- Output encoding: React auto-escapes; the static landing uses `textContent`, never `innerHTML`, for API data.

## Conventions
- **KISS by design:** build the simplest thing that works — plain readable code, fewer moving
  parts, no new dependency when a few lines do, no premature optimization. Simple = fewer bugs,
  faster loads, easier fixes, smaller attack surface. Pairs with security-first below.
- **Security by design:** keep secrets server-side, deny-by-default rules, validate input, encode
  output (see the "Security model" section above + the `secure-by-design` skill).
- **Commit every change** to git with a clear message — don't wait to be asked.
- **On finishing a session:** commit everything, update README + skills if relevant, shut down emulators + dev server, confirm a clean tree.
- **Every change must be production-ready.**
- Reusable patterns live in user skills: `firebase-saas-starter`, `landing-page-design`, `secure-by-design`.

## Known notes
- `/api/prices` (top-250 markets) gets CoinGecko free-tier `429`s without a Demo key — upstream rate-limiting, not a bug. Add a free CoinGecko Demo key to fix.
- Pub/Sub scheduled functions register in the emulator but don't auto-fire on cron (trigger from the UI); Cloud Scheduler fires them in prod.
- Repo is local-only (no GitHub remote yet).
