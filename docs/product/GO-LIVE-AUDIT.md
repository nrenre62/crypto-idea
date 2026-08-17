# Go-live checklist

The present-tense runbook for taking CryptoIdea from local emulators to a real Firebase project. It lists only the launch work that still requires a project, a console, or a paid plan — the code-side hardening is already in the repo.

Part of [security model](../security/SECURITY.md) — the deploy-time controls this runbook enables.

For the billing flow and PayPal go-live steps referenced below, see [billing](../decisions/BILLING.md).

## What still has to happen outside the repo

Everything here needs console access, a Google account, a card, or a decision — none of it can be committed to the repo.

- Enable Firestore point-in-time recovery (PITR) and a daily backup schedule.
- Set the Termly Privacy and Terms document IDs in admin Settings.
- Provision a real Firebase project on the Blaze plan, with a billing budget, a `prod` alias, and two bootstrapped owner admins.
- Enable App Check enforcement (after the reCAPTCHA site key is live).
- Enable Identity Platform (required by the signup gate and admin MFA).

## Firestore PITR and backups

Nothing in the repo configures backups, and nothing can — PITR and backup schedules are gcloud/Console project settings, not `firebase.json`. Without them, a bad `recursiveDelete`, a bad rules deploy, or a mistyped console action destroys real portfolios with no recovery.

Enabling PITR late means the recovery window starts from enablement, so it must be on before the first real signup.

```bash
gcloud firestore databases update --database='(default)' --enable-pitr --project=PROJECT_ID
gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=7d --project=PROJECT_ID
```

The Firebase Console exposes a Point-in-time recovery toggle under Firestore → settings, so `gcloud` is not required for PITR. The backup schedule may still need `gcloud` if the Console does not offer Firestore → Backups → Create schedule.

After enabling, document the production-recovery steps, do one practice restore (a restore always lands in a new database), and disclose the backup window in `privacy.html` alongside the audit-retention block. Match the disclosed window to the real `--retention` value.

## Legal documents

The Privacy Policy and Terms pages now carry a **basic hand-authored default** policy/terms (honest about the real processors — Firebase, PayPal, Sentry incl. session replay, CoinGecko, optional analytics) with bracketed placeholders for the operator's name, contact, and jurisdiction. Setting a Termly document ID replaces the default with the embedded Termly document. So signup's forced acceptance is no longer worthless — a real notice exists — but the placeholders must still be filled in (or Termly documents provided) before a serious launch.

Fill in the `[OPERATOR NAME]` / `[CONTACT EMAIL]` / `[JURISDICTION]` placeholders in `privacy.html` and `terms.html`, or create both documents in Termly and set the IDs in admin Settings → Analytics & Legal (they persist to `config/app`; do not paste snippets into the HTML). Keep the session-replay disclosure consistent with whatever the client Sentry config actually does. Bump `CONSENT_VERSION` and delete pre-launch test accounts so the re-acceptance mechanism starts clean.

## Blaze, budget, project, and admins

- Upgrade to the Blaze plan and create a billing budget with alerts at 50/90/100%. The `maxInstances` caps in the functions runtime bound spend; the budget only reports it. Both are needed.
- Create a real Firebase project and add a `prod` alias with `firebase use --add` — `npm run deploy` targets `--project prod`, so a missing alias fails the deploy with a clear message.
- Bootstrap the admin owners in Phase 4 below. Miss it and production has no owner, because the panel can never mint one — only `functions/scripts/set-admin.js` can.

## App Check and error visibility

- App Check enforcement is enabled in the Console; for callables it applies platform-side before the handler runs. Order matters: set `VITE_RECAPTCHA_SITE_KEY`, build, deploy, watch unverified requests fall toward zero, and only then enforce. Reversed, it locks out every user. **Scoped code exception (CRYP-108, founder 2026-08-17):** `addCoinGuarded` is the ONE callable that also calls `guards.appCheckOk` in code, flag-gated by `config/app.appCheckEnforce` (**default OFF → no-op**) so the code flag can mirror the console switch on the high-frequency coin write; leave it off until the console step above is done, then optionally flip it on. Every other callable stays console-only.
- After deploy, use the payment provider's "Send test event" and confirm a document lands in `webhookEvents` — a wrong webhook ID makes every event 401 silently, and the ID differs between sandbox and live.
- One Cloud Logging alert covers the schedulers and webhook. Filter on platform labels so it cannot rot:

  ```text
  resource.labels.function_name=("refreshPrices" OR "refreshUniverseDaily" OR "purgeOldAudit" OR "captureDailyStats" OR "purgeExpiredTrash" OR "enforceSubscriptionPeriods" OR "paypalWebhook") AND severity>=ERROR
  ```

## Scheduled functions

The backend exports six scheduled functions, all wrapped in `runJob`, which logs the error and rethrows so a failed invocation is marked FAILED and surfaces to the alert above:

- `refreshPrices` — every 5 minutes; refreshes the hot set of the shared coin universe.
- `refreshUniverseDaily` — daily; refreshes the full universe and prunes delisted coins.
- `purgeOldAudit` — daily; erases audit entries past the retention window.
- `captureDailyStats` — daily; writes the aggregate growth snapshot.
- `purgeExpiredTrash` — daily; permanently erases soft-deleted accounts past the trash window.
- `enforceSubscriptionPeriods` — daily; flips tiers when a subscription period ends.

A deploy of the full function set must show six Cloud Scheduler jobs.

## Deploy runbook

### Phase 1 — create the project

This phase needs a browser login, a Google account, and a card. The Firestore location and the project ID are both permanent once chosen.

1. `npx firebase login` — browser OAuth against the Google account, in your own terminal.
2. Firebase Console → Add project. Note the generated project ID. Skip Google Analytics; GA4 is wired through `config/app`.
3. Upgrade to Blaze, then create the billing budget in the same sitting (~$25/mo, alerts at 50/90/100%). Blaze has no hard spend cap.
4. Firestore Database → Create database, in production mode (not test mode — test mode ships allow-all rules and the real rules do not deploy until Phase 3). The location is permanent; the only remedy is a new project plus a full data migration.
5. Point-in-time recovery → ON. The recovery window starts at enablement, so this must precede both the first deploy and the first account.
6. Create the daily backup schedule with 7-day retention.
7. Authentication → Get started → Email/Password → Enable.
8. `npx firebase use --add` → select the project → alias it exactly `prod`.

Register no accounts — not even a throwaway — until PITR is on. The two owner accounts are created deliberately in Phase 4.

### Phase 2 — secrets and build

1. `.env` ← the six `VITE_FIREBASE_*` values from Console → Project Settings → SDK config. The deploy guard enforces this; verify with `grep -c '_here' .env` → 0.
2. `functions/.env` ← `APP_URL=https://<real-project>.web.app`, `COINGECKO_DEMO_KEY`, and the PayPal plan IDs.
3. `npm run build`. Do not verify by grepping for the absence of the emulator project id — the minified bundle preserves the whole ternary, so that string appears in `dist/` even after a correct production build. Grep for your real project id instead, and do not delete `demoConfig` from `firebase.config.js` (that breaks `npm run dev` and the emulator/test workflow).

### Phase 3 — deploy

1. `firebase deploy --only firestore:rules,storage --project prod`, then eyeball the deployed rules in the Console.
2. `firebase deploy --only functions:api,functions:paypalWebhook --project prod` first — confirms wiring without dragging the schedulers in.
3. `firebase deploy --project prod`. Verify six Cloud Scheduler jobs exist, then force-run `refreshUniverseDaily` so `cache/universe` is warm — otherwise the first user request pays for a burst of sequential CoinGecko round-trips inside a tight budget.

### Phase 4 — admin bootstrap

`saveConfig` requires a fresh owner session, and the panel can never mint an owner — only the script can.

1. Register both owner accounts through the live app UI (this also creates their profile and default portfolio; Console → Add user would skip that).
2. Console → Project Settings → Service accounts → Generate new private key. Store it outside the repo and back it up to your password manager — it is the only recovery path if both owner passwords are lost.
3. Point `GOOGLE_APPLICATION_CREDENTIALS` at the key in your shell, then from `functions/`:

   ```text
   node scripts/set-admin.js you@example.com --role=owner
   node scripts/set-admin.js backup@example.com --role=owner
   node scripts/set-admin.js you@example.com --show
   ```

4. Sign in again (tokens were revoked), open `/admin`, fill Settings.
5. Set both Termly doc IDs; load `/privacy.html` and `/terms.html` and confirm the embed renders (allow ~60s for the CDN).
6. Re-save Plans & Pricing so the configured limits take effect — rules read `config/app.plans` first and the built-in defaults only as a fallback, so a pre-existing stored plans doc silently overrides new code defaults.

### Phase 5 — App Check (strict order)

1. Console → App Check → register the web app, create the reCAPTCHA v3 key.
2. `VITE_RECAPTCHA_SITE_KEY` → build → confirm the key is in the built firebase chunk → deploy.
3. Watch unverified requests until near zero.
4. Only then enable enforcement for Functions, Firestore, and Auth, one service at a time.

### Phase 6 — PayPal (paid tiers only)

1. Create four subscription plans in the live dashboard → IDs into `functions/.env` → redeploy.
2. Register the webhook at the exact region-prefixed URL the CLI printed.
3. Send a test event → confirm 200 and a document in `webhookEvents`.
4. Buy one real subscription, confirm the tier flips server-side, then cancel and refund manually.

### Phase 7 — post-deploy verification

1. `curl -sI https://<domain>/api/coinlist | grep -i cache-control` → must not be `no-cache`.
2. `curl -sI https://<domain>/landing.js` → must be `no-cache`; a hashed `/assets/*.js` → `immutable`. The Hosting emulator does not apply `firebase.json` headers, so caching is only verifiable after the first deploy.
3. Read a real `x-forwarded-for` in a Functions log to confirm `RL_TRUSTED_HOPS` for both ingress paths separately — `/api/*` (Hosting → Cloud Functions) and a callable (invoked directly). The chains can differ in length; one constant is applied to both. This also decides whether an audit entry's `ip` is trustworthy. Treat `audit.ip` as advisory until confirmed against a real entry.
4. Create the Cloud Logging alert.
5. Register a throwaway account end-to-end: verification email, password reset, portfolio save, DCA calculator returning more than 365 days of history.
6. Confirm the signup-paused refusal string. Turn off new signups, attempt a registration, and read the message shown — it must name the paused state, not a generic error. Firebase gives a blocking-function refusal no dedicated error code, so `src/utils/errors.js` matches marker strings; update `BLOCKED_MARKERS` if production words it differently. Turn signups back on afterward.
7. Enable Identity Platform MFA, enrol both owners, and only then flip `flags.requireAdminMfa` on (the switch is deliberately two-step). Flipping it before anyone is enrolled locks every admin out of the panel including that switch; recovery is editing `config/app → flags.requireAdminMfa` in the console.

## Notes on backups and the emulator

The emulator writes to local disk under a fake project id, separate from production Firestore. Adding `--import` / `--export-on-exit` keeps local test data between runs but does not back up production, provide PITR, or protect any real record — `functions/scripts/seed-emulator.js` already rebuilds local data in seconds. The rules and integration suites depend on a clean slate, so any such flags must change only the dev scripts, never the test variants.

## Deploy-time settings that require Identity Platform

Two controls only work once Identity Platform is enabled on the project:

- `beforeCreateUser` — the server-side signups gate. It reads config fresh and fails open (an unreadable config allows the signup so a Firestore blip cannot kill the funnel); only a deliberate paused verdict blocks. Deploying it requires Identity Platform, so enable that before the first `--only functions` deploy.
- Admin MFA — the `requireAdminMfa` flag is default-off and nothing can satisfy it until Identity Platform MFA is enabled and owners are enrolled.
