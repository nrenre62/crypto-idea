# Go-live audit — emulators → real Firebase

**Audited 2026-07-20.** Multi-agent audit across 11 dimensions (secrets/config, rules & indexes,
App Check & abuse/cost, PayPal billing, hosting headers, functions runtime, backups/DR, Auth
production setup, observability, legal/privacy, deploy runbook). **74 agents · 60 findings
confirmed · 2 refuted** — every finding was independently attacked by a second agent that tried to
refute it against the real files, so what is recorded here survived that.

> **Verdict at audit time: NOT production ready — 6 blockers.**
> The honest shape of it: **the backend is in good condition and the frontend is not connected to
> it.** The blockers are mostly *things that do not exist yet* (a project, a backup, a spend cap, a
> legal document, a checkout call) rather than *things built wrong*. That is the good kind of
> not-ready.

**Status 2026-07-20:** Phase 0 (everything fixable in code without a Firebase project) is **DONE**.
The remaining blockers all require decisions or console access — see §2.

---

## Phase 0 shipped (2026-07-20)

| Fix | What changed |
|---|---|
| **B1** spend ceiling | `runWith({maxInstances})` on `api` (20/120s), `paypalWebhook` (10/60s), the four **daily** sweeps (5/540s via a shared `SCHEDULED` const) and `refreshPrices` (**1/120s — its own**). Verified against the real `__endpoint` config, not just the source. |
| **B6** rules hole | Subcollection `update`/`delete` narrowed from `isAdmin()` to `isAdminOwner()` (portfolios, coins, transactions, learn). **+2 rules tests**, proven red against the old rule. |
| **H2/H5** cache headers | `immutable` scoped to `/assets/**`; `/icons/**` at 30d; per-endpoint `/api/**` TTLs mirroring what the function sets. ⚠️ **Not verifiable locally — see the gotcha below.** |
| **H9** service worker | Non-GET and cross-origin requests are no longer cached — authenticated Firestore/Auth responses stop landing in on-disk Cache Storage. Google Fonts keep an explicit cache-first allowlist branch (public + immutable, so no sign-out-leak risk) or the offline PWA would silently drop to system fonts. |
| **H3** silent schedulers | All five log **then rethrow**; the two that walk every user isolate per-user failures and rethrow after the loop. |
| **B2** demo-config deploy | New `scripts/check-env.js` (+9 unit tests) blocks `npm run deploy` on a missing or placeholder `.env`; deploy now targets the `prod` alias explicitly. |

**Phase 0 was itself adversarially reviewed** (27 agents, 7 dimensions): 2 regressions confirmed and
fixed before commit — `refreshPrices` had inherited the 540s daily-sweep timeout (longer than its own
300s schedule, which would have permitted overlapping runs that the gen-1 60s default had structurally
prevented), and the new cross-origin skip had silently stopped caching Google Fonts. 17 other
candidate findings were refuted.

### ⚠️ Gotcha: the Hosting emulator ignores `firebase.json` headers
Measured 2026-07-20 — a probe against `firebase emulators:exec --only hosting` returned
`Cache-Control: (none)` for **every** path, including `/service-worker.js`, which has had an explicit
`no-cache` block for a long time. The emulator serves the files but does **not** apply the `headers`
config.

**Consequence:** the H2/H5 cache-header change cannot be proven locally. It is verified only by
(a) the config parsing cleanly and (b) the values mirroring what the function already sets on each
response — which makes it correct regardless of which layer wins. **It must be confirmed after the
first deploy** with the `curl -sI` checks in §5 Phase 7. Do not treat "the emulator looks fine" as
evidence about caching, in either direction.

---

## 1. What is already good (do not touch)

- **Firestore rules are the strongest part of the codebase.** Closed-shape user doc on create *and*
  update, `tier` not user-writable, counter-forge closed, configured tier limits that can only
  *lower* the ceiling, null-safe claim reads so legacy role-less admins fail **closed**, explicit
  denies on `config`/`audit`/`rateLimits`/`webhookEvents`/`cache`, and `storage.rules` deny-by-default
  despite Storage being unused. All backed by real tests.
- **PayPal webhook security is done properly** — signature verification that fails closed,
  transactional idempotency on `webhookEvents/{event.id}`, and the part most implementations miss:
  a rollback that deletes the marker if processing later throws, so a transient failure cannot
  permanently suppress a paid-tier change.
- **Billing decision logic is extracted pure and unit-tested** — `functions/billing.js` has no
  Firebase imports by design; unknown plan id → *tier untouched* (fail-safe, never fail-wrong).
- **No secret reaches the client.** Config getters return booleans only; the `keep()`-on-blank idiom
  stops a re-save wiping a secret; `.gitignore` covers every `.env` variant plus service-account
  JSON; a `.githooks/pre-commit` independently blocks staged secret content. A live grep of `dist/`
  for key patterns returned zero hits.
- **Security headers and CSP are genuinely tight** — no `unsafe-inline` in `script-src` (real work:
  every page script is an external file), `frame-ancestors 'none'`.
- **GDPR posture is unusually complete** — soft-delete with a 30-day trash and self-restore, real
  hard purge including the Auth record, self-service export, unbundled versioned consent, and a
  12-month audit retention that is actually *disclosed*. Most solo founders miss that last one.
- **Emulator connection is correctly gated to dev only** — `import.meta.env.DEV` is false for
  `vite build`, so a production bundle will not connect to `127.0.0.1`.
- **Callables are IDOR-free** — the uid comes from `context.auth`, never the request body.
- **v1 Functions is the right call** — coherent across all exports. **Do not migrate to v2 before launch.**

---

## 2. Remaining blockers

### B3 · No Firestore PITR or backup schedule ⚠️ *cannot be fixed retroactively*
Nothing in the repo configures backups, and nothing can — PITR and backup schedules are gcloud/Console
project settings, not `firebase.json`. The existing `BACKUP.md` covers the **repo** on a WD drive,
never Firestore. A bad `recursiveDelete`, a bad rules deploy or a mistyped console action destroys
real users' portfolios with no recovery.

**Enabling PITR late means the recovery window starts from enablement** — so this must happen
*before* the first real signup.

```bash
gcloud firestore databases update --database='(default)' --enable-pitr --project=PROJECT_ID
gcloud firestore backups schedules create --database='(default)' --recurrence=daily --retention=7d --project=PROJECT_ID
```

**`gcloud` is NOT installed on the dev machine** (verified 2026-07-22), and you do not need it for
PITR: the Firebase Console exposes a *Point-in-time recovery* toggle under Firestore → ⚙️/⋮. Use the
Console for step 5 of Phase 1. Only the **backup schedule** may still require gcloud if your
project's Console does not offer Firestore → *Backups* → *Create schedule* — install it then, not
pre-emptively.

Then add a "Production data recovery" section to `BACKUP.md`, **do one practice restore** (a restore
always lands in a *new* database — not something to learn at 2am), and disclose the backup window in
`privacy.html` alongside the existing audit-retention block. Match the number to the real `--retention`.

### B4 · Checkout is a 2-second fake — no user can pay
> **✅ BUY PATH FIXED 2026-08-12 (Plan B PR-B, branch `claude/plan-b-pr-b-checkout`):** the fake
> `setTimeout` in `src/components/Login.jsx` is gone. PROD now calls the new
> `createSubscription({plan, billing})` callable (via the new `src/api/billing.js` wrapper — the
> billing gap below) and redirects the browser to the PayPal **`approvalUrl`**; the tier is set
> **server-side by the PayPal webhook** and live-synced into the app by the existing `watchUserDoc`.
> There is **no client tier write in prod** (`setUser({tier})` / `saveProfile` / `calcEndDate` were
> dropped from the buy component). DEV keeps the emulator path (`persistTierDev` → `devSetMyTier`),
> which is also server-authoritative. `/pro-success` was rebuilt to render the **actual purchased
> tier** and only claim success once the webhook confirms (new read-only `src/hooks/useProSuccess.js`
> watching the caller's own user doc: waiting / confirmed / timeout / signed-out). **Downgrade/cancel
> path now server-authoritative too (Plan B PR-C1, 2026-08-12, branch
> `claude/plan-b-pr-c1-cancel-downgrade`):** `confirmDowngrade` / `finalizeDowngrade` now `await` the
> real `cancelSubscription({downgradeTo})` callable (via `src/api/billing.js`) and let `watchUserDoc`
> sync the **server-written** marker back — the optimistic `setUser`+`saveProfile` forge of
> `{cancelled, downgradeTo}` is gone, toasts are date-free, and the fake up-front "Approve your Pro
> payment now" step was deleted (Premium→Pro schedules the downgrade; the period-end R29 re-checkout
> takes the real Pro payment). **No client-forged billing write remains.**
>
> **✅ FUTURE-START PRO PRE-AUTH SHIPPED (Plan B PR-C2, 2026-08-13, branch `claude/plan-b-pr-c2-pro-preauth`,
> `1dee0b4`):** the Premium→Pro downgrade now creates a **REAL future-start PayPal Pro subscription** (via
> the new `scheduleProDowngrade` callable) that first-charges when Premium ends → the account lands directly
> on Pro. It **eagerly cancels** the Premium sub at schedule time (checked; void-and-throw on failure),
> writes the server-only `subscription.scheduledPro` marker (tier stays premium; the daily sweep flips it at
> `endDate` — approved→Pro, unapproved→**fail-closed free**), and reinstates the real "Approve your Pro
> payment" client step; **"Keep my plan" is fail-closed** (never `cancelled:false`) → an honest
> "Re-subscribe to Premium" CTA. The security review's four findings are closed (ERRORS.md §C9). **Ships
> with paid plans OFF** (`paidPlansEnabled=false`), so the whole flow is dormant until paid plans are on.
>
> **⚠️ Two PR-C2 residuals are pre-paid-plans BLOCKERS (must land before `paidPlansEnabled` is turned on;
> also tracked as PR-C3 in [`NEXT-STEPS.md`](NEXT-STEPS.md) §Plan B and [`BILLING.md`](../decisions/BILLING.md)
> §3.3 / §8):**
> 1. **[MED] fail-open ordering in `scheduleProDowngrade`** — the eager Premium-cancel happens *before* the
>    Firestore marker write, so a rare, non-adversarial marker-write failure after a successful cancel leaves
>    premium-with-no-billing. Fix = **marker-first ordering** (persist the scheduled intent before the
>    irreversible PayPal cancel) or a reconciliation sweep.
> 2. **Seamless re-subscribe (PR-C3)** — the "Re-subscribe to Premium" CTA routes via
>    `startUpgrade("premium")`, which **no-ops while `tier==="premium"`** (same-tier guard), so it is inert
>    during the cancelled-but-not-lapsed window. Fix = a **future-start Premium re-subscribe** (mirror the
>    Pro machinery, generalized to carry the tier).
>
> **Remaining verification:** the full cancel/downgrade round-trip — incl. the PR-C2 **eager-cancel access
> timing** (Premium access continues to the period end) and the **future-start Pro `ACTIVATED` timing** (fires
> at `start_time`, deferred to `scheduledPro.approved`, sweep flips to Pro at `endDate`) — verifies at the
> go-live PayPal **sandbox e2e**. The historical finding below is kept for context.

`src/components/Login.jsx` fakes payment with `setTimeout(…, 2000)`, writes the tier to
**localStorage**, and calls a function that is a hard no-op in production. `src/api/` has no billing
wrapper at all: `createSubscription` and `cancelSubscription` are called from nowhere.

In production a real customer clicks Pay, waits 2s, sees "Welcome to Pro", is charged **$0**, and
gets a tier that exists only in that browser. New device or cleared cache → free again. Their first
Pro action hits `permission-denied` from the rules. The entire hardened billing backend is dead code.

**Two paths — this choice drives the launch timeline:**

- **Path A — free-only (~1 day):** disable the upgrade CTAs, ship the tracker + calculator. The tier
  system, limits and rules all work correctly for free users. Also fix the landing copy, which sells
  "Portfolio Pulse AI & Ask AI" while `ai-client.js` throws `research-ai-proxy-not-configured`.
  (Those AI bullets sit on the **free** tier too, so it is honesty-of-copy, not deceptive charging.)
- **Path B — paid tiers (~3–5 days):** add `src/api/billing.js` mirroring `src/api/account.js`,
  replace the `setTimeout` with `createSubscription` → redirect to `approvalUrl` → let the ACTIVATED
  webhook set the tier **server-side**. Never `setUser({tier})` locally again. Same for
  `confirmDowngrade` / `finalizeDowngrade`, which also only touch localStorage. Then H6 below.
  **↳ BUY-path done (Plan B PR-B, 2026-08-12):** `src/api/billing.js` + the `createSubscription` →
  `approvalUrl` redirect are shipped and the local tier write is gone. **↳ Downgrade/cancel path done
  (Plan B PR-C1, 2026-08-12):** `confirmDowngrade` / `finalizeDowngrade` route through the
  `cancelSubscription` callable (server writes the marker; `watchUserDoc` syncs it) — no client forge
  remains. The real future-start Pro pre-auth is **PR-C2**; the sandbox e2e still verifies at go-live.

✅ **PayPal sandbox is now available (Plan B PR-A).** `PAYPAL_ENV=sandbox` switches the API base to
`https://api-m.sandbox.paypal.com` (default `live`) via pure `billing.paypalBaseFor(env)`, so the
mandatory end-to-end test can run against sandbox instead of a **real charge on your own card**.
⚠️ One caveat before trusting it — see the §4 backlog note: `getPayPalToken`/`verifyPayPalWebhook`
prefer the `config/app` doc's PayPal creds over env, so live creds in the config doc could still
override a sandbox env. Verify creds source before the sandbox e2e.

### B5 · Privacy Policy and Terms are unpublished placeholders
Both pages say the document "is being finalized" and the Termly embed bails silently when the doc ID
is unset. Meanwhile signup **forces** users to tick "I agree to the Terms" and "I have read the
Privacy Policy" — links to pages saying the documents do not exist — and writes a versioned consent
record pointing at nothing. That consent is worthless, and there is no limitation of liability while
processing personal data and payments.

**Fix:** create both in Termly, set the IDs in **admin Settings → Analytics & Legal** (they persist
to `config/app`; do **not** paste snippets into the HTML). Name PayPal, Google Firebase and CoinGecko
as processors. Then bump `CONSENT_VERSION` and delete pre-launch test accounts — nothing compares
versions on login, so the re-acceptance mechanism is inert.

### Also required before first launch
- **Blaze upgrade + billing budget** (~$25/mo, alerts at 50/90/100%). The Phase-0 `maxInstances` caps
  bound spend; the budget only *tells* you. Both are needed.
- **A real Firebase project + the `prod` alias.** `.firebaserc` still points at `demo-crypto-idea`
  (a reserved emulator name). `npm run deploy` now targets `--project prod`, so `firebase use --add`
  must create that alias or deploy fails with a clear message.
- **Admin bootstrap** — see §5 Phase 4. Miss it and production has **no owner**.

---

## 3. First week (high, not launch blockers)

| # | Finding | Fix |
|---|---|---|
| **H1** | **App Check is decoration.** `appCheckOk` exists, is unit-tested, and has **zero call sites**. | Enable enforcement in the **Console only** — for v1 callables it applies platform-side before your handler runs. **Do NOT wire `appCheckOk` into the callables**; it is redundant and adds a second lockout surface. **Order matters:** set `VITE_RECAPTCHA_SITE_KEY` → build → deploy → watch "unverified" fall to ~0 → *then* enforce. Reversed, you lock out 100% of users. |
| **H4** | **PayPal webhook failures are invisible** — a wrong `PAYPAL_WEBHOOK_ID` makes 100% of events 401 silently, and the ID differs between sandbox and live. | Covered by the H3 alert below. Plus: after deploy use "Send test event" and confirm a doc lands in `webhookEvents`. |
| **H3-alert** | The Phase-0 rethrow makes failures *visible*; nothing yet *tells you*. | One Cloud Logging alert: `resource.labels.function_name=("refreshPrices" OR "refreshUniverseDaily" OR "purgeOldAudit" OR "purgeExpiredTrash" OR "enforceSubscriptionPeriods" OR "paypalWebhook") AND severity>=ERROR`. Uses platform labels, not log text, so it cannot rot. |
| **H6** | **Yearly and monthly checkout send the same PayPal plan ID**, while the UI sells two prices and revenue is booked as `priceYear/12`. Annual buyers get billed monthly. | **✅ CODE FIXED — both halves in.** **Server (Plan B PR-A):** four plan IDs (`PAYPAL_{PRO,PREMIUM}_{MONTHLY,YEARLY}_PLAN_ID`) + pure `billing.planIdFor(tier, cycle, ids)` selecting by tier **and** cycle + the yearly-plan-id unit case. **Client (Plan B PR-B):** the buy button calls `createSubscription({plan, billing})` and **passes the chosen cycle**. So an annual buyer is now charged the yearly plan. **Remaining:** the live PayPal **sandbox e2e** (`PAYPAL_ENV=sandbox`, go-live verify). |
| **H8** | **No React error boundary** — a render throw gives users a white page and you are never told. | ~30-line class component wrapping the tree in `main.jsx` and `admin-main.jsx`. **Skip the chunk-404 auto-reload** the naive version suggests — `sw-register.js` already reloads on SW update. |
| **Auth polish** | Verification/reset emails have no `actionCodeSettings`, so users land on the bare Firebase handler with no way back. Default templates come from `noreply@<project>.firebaseapp.com` — the most phishing-looking thing a new user sees. | Two-line fix mirroring the correct pattern already used elsewhere; set sender name/subject/reply-to in Console → Authentication → Templates. |

---

## 3b. ⚠️ Discovered during Phase 0: the integration suite is FLAKY (pre-existing)

Not a go-live blocker, but it undermines the Definition of Done — "green" is currently not a
trustworthy signal from this tier.

**Measured 2026-07-20**, `npm run test:integration:solo`, six consecutive runs:

| Run | Result | Failing test |
|---|---|---|
| 1 | 19/19 | — |
| 2 | 18/19 | `C-A3: watchCoins surfaces a transaction added after subscribing` |
| 3 | 19/19 | — |
| 4 | 17/19 | `suspendUser: un-suspend restores access…` + `…clears suspendedAt` |
| 5 *(baseline)* | 18/19 | `suspendUser: un-suspend restores access…` |
| 6 *(baseline)* | 19/19 | — |

**Proven pre-existing, not caused by the Phase 0 diff.** Runs 5–6 were executed with
`functions/index.js` and `firestore.rules` reverted to HEAD — the baseline flakes too, on the same
`suspendUser` test. A regression fails *deterministically*; this fails a *different* test each run,
which is the signature of test pollution or a listener/timing race.

**Where to look:** both suspects are order/timing dependent — `watchCoins` is an `onSnapshot`
listener assertion, and the `suspendUser` pair runs last in `tests/functions-callable.test.js`. The
suite runs `data-layer.test.js` and `functions-callable.test.js` **in one process against one
emulator** with `--test-force-exit`, and there is a known ordering hazard already recorded (a second
`registerUser` re-auths the shared SDK, so it must run last). Most likely causes: shared-SDK auth
state leaking across files, and assertions that read before a listener/write has settled.

**Suggested fix:** give the callable suite its own emulator run (or clear Firestore between files),
and make the listener assertions wait on a condition rather than a fixed tick. Until then, treat a
single red integration run as inconclusive — **re-run before believing it**, and do not let it gate
a release. The `test:unit` suite (539, deterministic) is the trustworthy gate, which is also what
the new `.githooks/pre-push` hook uses.

---

## 4. Backlog

- **26 callables are still uncapped.** Phase 0 capped the *public* surface (`api`, `paypalWebhook`,
  schedulers). The callables require an authenticated account, so they are second-order — but a
  shared `CALLABLE = functions.runWith({maxInstances: 30})` is worth adding, with longer timeouts for
  `exportMyData` / `deleteUser` (which do `recursiveDelete`).
- The two all-users sweeps scan the whole `users` collection unbounded. **Do not add a bare
  `.limit(500)`** — with no `orderBy` it would re-process the same first 500 uids forever. Use cursor
  pagination; the 540s timeout from Phase 0 buys time meanwhile.
- `getStats` swallows the collection-group count error with no log — admin Overview could read
  "0 coins" forever with zero signal.
- No `firestore.indexes.json` and no `"indexes"` key in `firebase.json` — index state is unmanaged
  and console-only. A missing composite index fails at runtime in prod and never in the emulator.
- `historyCache` is server-written but is the one such collection missing from the explicit-deny
  block (safe today via default-deny; adding it preserves the invariant).
- `days=max` is gated on the **env var** `CG_KEY` while `cgHeaders()` prefers the admin-Settings
  value — so pasting the CoinGecko key into Settings lifts rate limits but leaves DCA history
  silently clamped to 365 days. **Put the key in `functions/.env`.** (`.env.example` now says so.)
- PayPal sandbox base URL: **DONE (Plan B PR-A)** — `PAYPAL_ENV=sandbox` selects
  `https://api-m.sandbox.paypal.com` via pure `billing.paypalBaseFor(env)` (default `live`). Residual
  caveat: `getPayPalToken`/`verifyPayPalWebhook` still **prefer the `config/app` doc's PayPal creds
  over env**, so live client/secret in the config doc would override a sandbox env and you'd hit live
  with a sandbox base URL. Before a sandbox e2e, verify the creds source (clear the config-doc PayPal
  creds or use a separate staging project) so both base URL **and** creds are sandbox.
- "No refunds" is unenforceable against EU/UK consumers — soften to "…except where required by law"
  at **four** sites (one is a hardcoded literal outside the shared `REFUND` const — easy to miss).
- Do not set the GA4 ID unless `termlyUuid` is set **and** the cookie banner is on — the auto-blocker
  only exists if the banner loaded. Better: Plausible (cookieless, already supported, already
  decision D18).
- ~~`signupsEnabled` is a client gate only; no `beforeCreate` blocking function exists.~~ **FIXED
  2026-07-24 (ADMIN-0):** `exports.beforeCreateUser` enforces it inside account creation — verified on
  the emulator that a paused signup creates **no Auth account**, and that the Admin SDK (seed/admin
  user creation) is deliberately unaffected. It fails **OPEN** on an unreadable config, so a Firestore
  blip cannot take the signup funnel down. ⚠️ **Deploy blocker:** blocking functions **require Identity
  Platform** on the project — `firebase deploy` fails without it. Enable Identity Platform (it is the
  same prerequisite as admin MFA) **before the first `--only functions` deploy**, or temporarily drop
  this export. Uids remain free until then, and every abuse budget is per-uid.
- Secrets sit as plaintext Firestore fields (fine today — rules deny all client access), but before
  enabling scheduled exports, lock the export bucket down.
- `deploy.sh` is a second, divergent deploy path that hardcodes a `crypto-idea.web.app` URL. Delete
  it or mark it legacy — `npm run deploy` is the real path and now carries the env guard.
- No staging project. With zero users, deploying prod and self-testing privately before announcing
  gets most of the benefit — and it is how you learn the real `RL_TRUSTED_HOPS` value, which the
  code itself admits is a guess.

---

## 5. Deploy runbook

### Phase 0 — code ✅ DONE
Committed 2026-07-20. Verify with `npm run test:unit && npm run test:rules && npm run test:integration`.

### Phase 1 — create the project ⚠️ *holds the only two irreversible steps in this runbook*

**You drive this phase.** It needs a browser login, your Google account and your card. Claude can
navigate and verify afterwards, but cannot log in as you, create the project, or attach a billing
account — entering payment details is a hard line, not a preference.

> **DECIDED 2026-07-22 (founder): the Firestore location is `nam5` (US multi-region).**
> Same continent as the default `us-central1` functions region, so no cross-region latency or
> egress; multi-region replication for durability (99.999% vs 99.99%); the cost delta over
> single-region is cents per month at this data size. **This is settled — do not re-open it in the
> console with a form already on screen.**

1. `npx firebase login` — browser OAuth against your Google account, run in your own terminal.
2. https://console.firebase.google.com → **Add project**. Note the generated **project ID** — also
   permanent. Skip Google Analytics; GA4 is already wired through `config/app`.
3. **Upgrade to Blaze, then create the billing budget in the same sitting** —
   https://console.cloud.google.com/billing → *Budgets & alerts* → ~$25/mo, alerts at 50/90/100%.
   Blaze has **no hard spend cap**. The `maxInstances` caps shipped in `2cedafb` are what actually
   *bound* spend; a budget only *tells you* it is happening. You need both.
4. Firestore Database → **Create database**.
   - ⚠️ **Production mode, NOT test mode.** Test mode ships allow-all rules for 30 days. The real
     rules do not deploy until Phase 3, so test mode leaves a window in which any client can read
     every user's portfolio.
   - ⚠️ **Location `nam5 (us-central)` — PERMANENT.** The only remedy is a new project plus a full
     data migration.
5. **PITR → ON** (B3). Firestore → ⚙️/⋮ → *Point-in-time recovery*. The recovery window starts at
   enablement, so this must precede both the first deploy and the first account.
6. **Daily backup schedule, 7-day retention** (B3).
7. Authentication → *Get started* → **Email/Password** → Enable.
8. `npx firebase use --add` → select the project → alias it exactly **`prod`**
   (`package.json:10` runs `firebase deploy --project prod`; that alias does not exist yet —
   `.firebaserc` currently holds only `demo-crypto-idea`).

**Register no accounts — not even a throwaway test one — until step 5 is done.** Your two owner
accounts are created deliberately in Phase 4, under PITR's protection.

### Phase 2 — secrets and build
5. `.env` ← the six `VITE_FIREBASE_*` from Console → Project Settings → SDK config.
   The deploy guard enforces this; verify with `grep -c '_here' .env` → 0.
6. `functions/.env` ← `APP_URL=https://<real-project>.web.app` (the built-in default points at a
   domain you may not own — customers would land on a stranger's site after paying),
   `COINGECKO_DEMO_KEY`, and Path B's PayPal plan IDs.
7. `npm run build`.
   ⚠️ **Do not verify by grepping for the absence of `demo-crypto-idea`.** The minified bundle
   preserves the whole ternary, so that string appears in `dist/` **even after a correct production
   build**. Grep for your real project id instead. And do **not** "fix" it by deleting `demoConfig`
   from `firebase.config.js` — that breaks `npm run dev` and the entire emulator/test workflow.

### Phase 3 — deploy
8. `firebase deploy --only firestore:rules,storage --project prod`, then eyeball the deployed rules
   in the Console.
9. `firebase deploy --only functions:api,functions:paypalWebhook --project prod` first — confirms
   wiring without dragging the schedulers in.
10. `firebase deploy --project prod`. Verify **5** Cloud Scheduler jobs exist, then **force-run**
    `refreshUniverseDaily` so `cache/universe` is warm — otherwise the first user request pays for
    12 sequential CoinGecko round-trips inside a 60s budget.

### Phase 4 — admin bootstrap (⚠️ must precede any admin-Settings step)
`saveConfig` requires a **fresh owner** session, and the panel can never mint an owner — only the
script can. So:

11. Register both owner accounts **through the live app UI** (this also creates their profile +
    default portfolio; Console → Add user would skip that).
12. Console → Project Settings → Service accounts → Generate new private key. Store it **outside the
    repo** and back it up to your password manager — it is the only recovery path if both owner
    passwords are lost.
13. ```powershell
    $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\key.json"
    cd functions
    node scripts/set-admin.js you@example.com --role=owner
    node scripts/set-admin.js backup@example.com --role=owner
    node scripts/set-admin.js you@example.com --show
    ```
14. Sign in again (tokens were revoked), open `/admin`, fill Settings.
15. Set both Termly doc IDs (B5); load `/privacy.html` and `/terms.html` and confirm the embed
    renders — wait ~60s for the CDN.
15b. **⚠️ Re-save Plans & Pricing so the raised limits take effect (PLAN-LIMITS-MAX #12).** A
    pre-existing stored `config/app.plans` doc **silently overrides the new rule defaults** — rules read
    config first, the built-in defaults only as a fallback. In admin → Settings → **Plans & Pricing**,
    re-save the plan limits (or run a one-time migration) so Starter 3/30/300 · Pro 6/100/1,000 ·
    Premium 15/200/2,000 actually apply; bumping the code defaults alone is not enough. **Deploy gate on
    the raised Pro/Premium limits:** do NOT deploy them until BOTH (1) Part B active-portfolio-only
    lazy-load reads and (2) the Wave-B abuse controls (App Check enforcement + per-uid rate limiter +
    `addCoinGuarded`) are live — without Part B a Pro-max account's daily-open read cost is a margin loss.
    **(1) Part B is now ✅ BUILT (2026-08-10 · `claude/plan-limits-partb` · CRYP-104), so the remaining code
    prerequisite is (2) the Wave-B abuse controls. Starter's raise is deploy-safe on its own.** Prices are
    unchanged. See PRICING.md §7 + NEXT-STEPS §PLAN-LIMITS-MAX.

### Phase 5 — App Check (strict order, H1)
16. Console → App Check → register the web app, create the reCAPTCHA v3 key.
17. `VITE_RECAPTCHA_SITE_KEY` → build → confirm the key is in `dist/assets/firebase-*.js` → deploy.
18. Watch "unverified requests" until ~0.
19. **Only then** enable enforcement for Functions, Firestore and Auth, one service at a time.

### Phase 6 — Path B only: PayPal
20. Four subscription plans in the **live** dashboard → IDs into `functions/.env` → redeploy.
21. Register the webhook at the **exact URL the CLI printed** (region-prefixed).
22. "Send test event" → confirm 200 and a doc in `webhookEvents`.
23. **Buy one real subscription on your own card**, confirm the tier flips server-side, then cancel
    and refund manually.

### Phase 7 — post-deploy verification
24. `curl -sI https://<domain>/api/coinlist | grep -i cache-control` → must **not** be `no-cache`.
25. `curl -sI https://<domain>/landing.js` → must be `no-cache`; `/assets/<hashed>.js` → `immutable`.
26. Read a real `x-forwarded-for` in a Functions log to confirm `RL_TRUSTED_HOPS` — **for BOTH
    ingress paths separately**: `/api/*` (Firebase Hosting → Cloud Functions) *and* a **callable**
    (invoked directly on `cloudfunctions.net`). The chains can differ in length, and one constant is
    currently applied to both. Since **ADMIN-3** this also decides whether an audit entry's `ip` is
    trustworthy: if the configured hop count exceeds the real chain, the value recorded is the
    caller-supplied XFF token — forgeable. If the two paths differ, split the constant. Until this is
    done, treat `audit.ip` as advisory, not evidence. Confirm by checking a real entry's `ip` matches
    the address you actually called from.
27. Create the Cloud Logging alert (§3).
28. Register a throwaway account end-to-end: verification email, password reset, portfolio save,
    DCA calculator returning >365 days of history.
29. **ADMIN-0 — confirm the real `beforeCreate` refusal string.** Turn "Allow new signups" **off**,
    attempt a registration, and read what the browser shows. It must say *"New signups are currently
    paused"*, not *"Something went wrong. Try again."* Firebase gives a blocking-function refusal **no
    dedicated error code**, so `src/utils/errors.js` matches marker strings inside the message — and
    those were measured against the **emulator**, whose wording the JS SDK already rewrites once (it
    strips the `BLOCKING_FUNCTION_ERROR_RESPONSE` prefix the REST layer sends). If production words it
    differently again the detection silently stops firing: degraded, not dangerous, but a user is then
    told to retry something deliberately switched off. Update `BLOCKED_MARKERS` with the real string.
    **Turn signups back on afterwards.**
30. **ADMIN-0 — enable Identity Platform MFA, enrol BOTH owners, and only then flip
    `flags.requireAdminMfa` on** (Settings → Admin access; the switch is deliberately two-step).
    Order matters exactly as it does for App Check: flipping it before anyone is enrolled locks every
    admin out of the panel *including out of that switch*, and the only way back is editing
    `config/app → flags.requireAdminMfa` in the Firebase console. Verify by signing out and back in
    with a second factor, then confirm the Users tab still loads.

---

## 6. The emulator import/export question

**It has zero bearing on production readiness.** Easy to conflate with B3, so being explicit: the
emulator writes to local disk under the fake project `demo-crypto-idea`. Production Firestore is a
different service. Adding `--import` / `--export-on-exit` would **not** back up production, **not**
give you PITR, and **not** protect a single real user's record.

All it does is keep local test data between runs — which `functions/scripts/seed-emulator.js`
already rebuilds in seconds. There is also a real downside: a persisted export is a stale fixture
that silently drifts from `firestore.rules` and the doc schema, and the rules/integration suites
depend on a clean slate.

**Decision: skip it.** The seed script is the KISS answer. If it is ever added, note the flags are
CLI-only (no `firebase.json` equivalent), change **only** the two dev scripts — never the
`test:rules` / `test:integration` variants, which must start empty — and add `.emulator-data/` to
`.gitignore`, since the export contains seeded accounts and password hashes.

---

## 7. Refuted

Two findings did not survive verification and are recorded so they are not re-raised:

- A claim that the production bundle could connect to the emulators — **false.** `import.meta.env.DEV`
  is false for `vite build`, and the gating is correct in both the user and admin config modules.
- A claim that `demo-crypto-idea` appearing in `dist/` proves a bad build — **false.** The minified
  bundle preserves the whole ternary including the unused branch. See Phase 2 step 7.
