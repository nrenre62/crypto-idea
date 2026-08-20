# Launch checklist — deploy CryptoIdea to Firebase

The condensed, do-it-in-order runbook for taking CryptoIdea live on a real Firebase project. For the
rationale behind each step (why PITR must precede the first signup, why App Check enforces last, the
scheduler set, the cache headers), see the canonical [GO-LIVE-AUDIT](GO-LIVE-AUDIT.md).

**Tailored to the current launch shape:** the app ships **free** (`paidPlansEnabled` + `checkout`
default-OFF) and **AI-off** (`aiResearch` default-OFF), so **PayPal and admin MFA are deferred** —
nothing to configure for them at launch. All three are reversible later by setting the flags to
exactly `true`.

Run every command in your own terminal. Steps marked *(console)* are Firebase Console / Google Cloud
actions that cannot be scripted from the repo.

## Two one-way gates — get these right

- **PITR before the first signup** (Phase 1). Point-in-time recovery's window starts at enablement, so
  a late enable cannot protect data written earlier. Register no account until it is on.
- **App Check enforce LAST** (Phase 6). Enforcing before the reCAPTCHA key is live and verified locks
  out every user.

Everything else is recoverable.

## Prerequisites (once)

- [ ] A Google account and a credit card (Blaze requires one; expected usage ~$0–$25/mo).
- [ ] Node 22, the repo cloned, `npm install` done.
- [ ] `npm i -g firebase-tools` (or use `npx firebase`).

## Phase 1 — Create the project *(console + browser)*

- [ ] `firebase login`
- [ ] Console → Add project; note the project ID; skip Google Analytics (GA4 is wired via admin config).
- [ ] Upgrade to Blaze and create a billing budget (~$25/mo, alerts at 50/90/100%).
- [ ] Firestore → Create database → **production mode**; pick a **permanent** location (e.g. `nam5`).
- [ ] **Point-in-time recovery → ON**, and create a **daily backup schedule (7-day retention)**.
- [ ] Authentication → Get started → Email/Password → Enable.
- [ ] `firebase use --add` → select the project → alias it exactly **`prod`**.
- [ ] Register no accounts yet — not even a throwaway — until PITR is on.

## Phase 2 — Secrets & build *(local)*

- [ ] `cp .env.example .env`; fill the six `VITE_FIREBASE_*` values from Console → Project Settings →
      your Web App's SDK config. Leave `VITE_RECAPTCHA_SITE_KEY` blank for now (Phase 6).
- [ ] `cp functions/.env.example functions/.env`; set `APP_URL=https://<project>.web.app` and
      `COINGECKO_DEMO_KEY=<free demo key from coingecko.com/en/api>`. Leave all PayPal + AI vars blank.
- [ ] `npm run build` → must end with `dist-name-guard: clean`.

## Phase 3 — Deploy *(local)*

- [ ] `firebase deploy --only firestore:rules,storage --project prod`; eyeball the rules in the Console.
- [ ] `firebase deploy --only functions:api,functions:paypalWebhook --project prod` (confirms wiring).
- [ ] `npm run deploy` (runs `check-env` → `build` → `firebase deploy --project prod`).
- [ ] Confirm **6 Cloud Scheduler jobs** exist (`refreshPrices`, `refreshUniverseDaily`, `purgeOldAudit`,
      `captureDailyStats`, `purgeExpiredTrash`, `enforceSubscriptionPeriods`), then **force-run
      `refreshUniverseDaily`** once so `cache/universe` is warm before the first user request.

## Phase 4 — Admin bootstrap *(local + console)*

The panel can never mint an owner — only the script can.

- [ ] Register **two** owner accounts through the **live app UI** (this also creates their profiles +
      default portfolios).
- [ ] Console → Project Settings → Service accounts → Generate new private key. Store it **outside the
      repo** and in your password manager — it is the only recovery path if both owner passwords are lost.
- [ ] Point `GOOGLE_APPLICATION_CREDENTIALS` at the key, then from `functions/`:
      ```
      node scripts/set-admin.js you@example.com --role=owner
      node scripts/set-admin.js backup@example.com --role=owner
      node scripts/set-admin.js you@example.com --show
      ```
- [ ] Sign in again (tokens were revoked) → open `/admin` → fill Settings → **re-save Plans & Pricing**
      once so `config/app.plans` exists (rules read it first, defaults only as fallback).

## Phase 5 — Legal *(admin panel)*

- [ ] Set the **Termly** Privacy + Terms doc IDs in Admin → Settings → Analytics & Legal, **or** fill the
      `[OPERATOR NAME]` / `[CONTACT EMAIL]` / `[JURISDICTION]` placeholders in `privacy.html` + `terms.html`
      and redeploy.
- [ ] Load `/privacy.html` + `/terms.html` and confirm they render.

## Phase 6 — App Check *(strict order — reversed locks out every user)*

- [ ] Console → App Check → register the web app and create a **reCAPTCHA v3** key.
- [ ] Set `VITE_RECAPTCHA_SITE_KEY` in `.env` → `npm run deploy` → confirm the key is in the built
      firebase chunk.
- [ ] Watch unverified requests fall toward zero.
- [ ] Enable enforcement **one service at a time**: Functions, then Firestore, then Auth.
- [ ] Optional: flip `config/app.appCheckEnforce` on to mirror it on the two guarded writes.

## Phase 7 — Identity Platform + verify

- [ ] Enable **Identity Platform** on the project — required to deploy `beforeCreateUser` (the server
      signups gate). Redeploy functions if it was not enabled at Phase 3.
- [ ] Register **one throwaway account end-to-end**: verify email, reset password, save a portfolio, run
      the DCA calculator (>365 days of history proves the CoinGecko key works). Delete it afterward.
- [ ] Create one Cloud Logging alert on `severity>=ERROR` for the 6 schedulers + the webhook (the exact
      query is in [GO-LIVE-AUDIT](GO-LIVE-AUDIT.md)).
- [ ] `curl -sI https://<domain>/api/coinlist | grep -i cache-control` → must **not** be `no-cache`.

## Deferred at the free launch — do nothing

- **PayPal** — `paidPlansEnabled` + `checkout` ship OFF; new subscriptions are blocked server-side. Do
  the PayPal phase only when you re-enable paid plans.
- **Live AI** — `aiResearch` ships OFF; the Research tab is Overview-only. No AI key needed.
- **Admin MFA** — `requireAdminMfa` is off; enable Identity Platform MFA and enroll both owners before
  flipping it (post-launch).

---

Rationale and detail for every step: [GO-LIVE-AUDIT](GO-LIVE-AUDIT.md). Security model:
[SECURITY](../security/SECURITY.md).
