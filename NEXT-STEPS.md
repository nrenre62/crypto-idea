# Crypto Idea — Product Backlog (Next Steps)

> This is the **prioritized product backlog** for our [Agile workflow](AGILE.md): top = next.
> Each item is a small, shippable increment finished to the **Definition of Done** in AGILE.md.
> The app is feature-complete and runs locally; the work below is (1) finishing an in-progress
> architecture refactor, (2) a known bug, and (3) go-live tasks.

See also: [`AGILE.md`](AGILE.md) (how we work + Definition of Done),
[`src/ARCHITECTURE.md`](src/ARCHITECTURE.md) (layer rules + migration detail),
[`README.md`](README.md) (backend/proxy/deploy), [`CLAUDE.md`](CLAUDE.md) (conventions).

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
- [ ] `firebase functions:config:set coingecko.demo_key=… paypal.*=… app.url=…`.
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
- [ ] **N-1 (LOW): harden the landing DCA fetch.** `getHistory` in `index.html` has no timeout, so a
  hung `/api/history` leaves the button stuck on "Calculating…" with no feedback. Add a fetch
  timeout (AbortController) + a clear error message. Low priority (prod is warm + CDN-cached).
- [ ] **N-2 (LOW): admin trash niceties.** Optional "Empty trash" bulk-purge action, and/or a live
  (onSnapshot) admin list so a user self-restore reflects without clicking Refresh.
- [ ] **N-3 (MED): live AI for the Research tab.** The Research tab ships with AI in graceful
  offline-fallback mode (`src/features/research/api/ai-client.js` throws → built-in data-driven
  summaries). To make "Pulse"/"Ask" use real Claude: add a secure callable Cloud Function
  (e.g. `researchAsk`) that holds the Anthropic key server-side, forwards to Claude (Anthropic SDK,
  model per `claude-api` skill), and add per-user rate limiting + App Check. Then replace the one
  `ai-client.js` body with a call to that function. Needs an Anthropic API key + the Blaze plan
  (outbound network). NEVER call Anthropic directly from the browser.

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
