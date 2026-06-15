# Crypto Idea — Next Steps / What's Left

> Status snapshot. Last updated end of the architecture-refactor session.
> The app is feature-complete and runs locally; the work below is (1) finishing
> an in-progress architecture refactor, (2) a known bug, and (3) go-live tasks.

See also: [`src/ARCHITECTURE.md`](src/ARCHITECTURE.md) (layer rules + migration detail),
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
- [ ] `AddEntry` (~42)
- [ ] `CoinInfo` (~35), `Detail` — need a coin in the test portfolio to render
- [ ] `Account` (~148) — reachable via the tier badge on portfolio (testable)
- [ ] `PortfolioBar` (~10, helper) + `Portfolio` (~55) — Portfolio is covered by the logged-in smoke test
- [ ] `Login` (~110, biggest — includes the upgrade/plan overlay) — covered logged-out

### 1b. Extract business logic into hooks (closes audit rules 1 & 2)
Most state + logic still lives in the `CryptoIdea.jsx` component. Pull into hooks:
- [ ] `useAuthSession` — the `onAuthChange` effect, `loadPortfolios`, profile auto-save, `checkSubscriptionStatus`
- [ ] `usePortfolios` — CRUD: `addPortfolio`, `deletePortfolio`, `addCoin`, `remCoin`, `addEntry`, edit/delete tx, `setActivePortId`
- [ ] `useUpgrade` — `startUpgrade`, downgrade flow, `trimToTier`, `getTrimImpact`, `calcEndDate`

### 1c. Move backend calls out of components (closes audit rule 1)
- [ ] `CryptoIdea.jsx` calls `httpsCallable(functions, "exportMyData"/"deleteMyAccount")` directly. Move into `src/api/account.js` (e.g. `exportMyData()`, `deleteMyAccount()`), call from a hook.
- [ ] `components/admin-dashboard.jsx` calls Cloud Functions via `httpsCallable` directly. Move those into an `api/admin.js` and have the dashboard consume a hook.
- [ ] `components/pro-success.jsx` defines a local `c` theme — import `utils/theme.js` instead.

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

## 5. Housekeeping

- [ ] Dev-only `npm audit` advisories (~10, from the Vitest/jsdom test tooling). Production
  audit is **0** (only `dist/` ships). Run `npm audit fix` when convenient; don't `--force`.
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
