# Admin session 05 — Manager (accounts-only admin) · 75-min test · 2026-11-24
Status: Complete | Admin account: manager@test.com | Start 13:20 / end 14:30 (local) | Minutes tested: 70

## Scope
The **manager** role's boundaries in the admin panel, and how a manager's actions show up in the user app:
- What the panel shows and hides for a manager: Settings, Admin access, View-as, Capture-now, Trash Delete-now / Empty trash.
- Every owner-only callable called **directly** from the /admin page (the SDK is reachable by importing `/src/api/admin.js` from the Vite dev server). These calls ran with the signed-in manager's token: `getAdminConfig`, `saveConfig`, `deleteUser`, `viewUserAsAdmin`, `setManagerRole`, `listAdmins`, `captureStatsSnapshot`, `setSettingsPassword`, `unlockSettings`, `requestSettingsPwReset`, `completeSettingsPwReset`, plus the removed `setAdminClaim`.
- Audit tab as a manager: config-save rows must be redacted.
- Manager acting on owners (admin@, admin2@) and on itself. **p01 is NOT a manager**, because S01's grant was blocked, so "manager on another manager" could only be tested on manager@ itself.
- Manager actions on normal personas (tier, custom limits, suspend, sign-out, trash/restore, bulk), each checked in a second tab logged in to /app as that persona, then restored.
- Free exploration: direct Firestore reads/writes with the manager token, unknown-uid and input-type probes, billing interplay (simulated subscriptions on a throwaway account), 375 px layout, keyboard use, reload mid-flow, network failure, CSV export (captured in-page, nothing downloaded).

## Accounts and state touched
| Account | Original state | Change made | Restored? |
|---|---|---|---|
| manager@test.com (session admin) | manager claim; user doc without `planChosen`/`deleted` fields | Logged in to /app once → free-plan onboarding ran (`planChosen:true` + default portfolio). Self-deleted 2x (callable + UI) and restored 2x. `restoreUser` wrote `deleted:false, deletedAt:null` | **Y** (`deleted:false`). Leftover: `planChosen` + one empty default portfolio, harmless |
| admin@test.com / admin2@test.com (owners) | owner claims | All moderation calls refused. `restoreUser` succeeded and wrote `deleted:false, deletedAt:null` (S05-01). `saveUserNote` on admin2@ created a note doc | **Y**: note doc deleted via emulator REST. Leftover: harmless `deleted:false, deletedAt:null` fields on both owner docs |
| p01.trader | Starter, not a manager (S01 grant blocked) | none (read only) | n/a |
| p02.longterm | Starter, limits {}, active | → Premium → custom coins 1 → Clear → Sign out all devices → Suspend → Un-suspend → Starter | **Y** (Starter, {}, active; verified in /app "1/30") |
| p03.speculator | Starter, limits {} | `setPremiumLimits {coins:1}` while Starter; → Premium → Starter (S05-03); bulk → Pro → Starter | **Y** (Starter, {}) |
| p04.dca | Starter, limits {}, 1 portfolio / 0 coins | Suspend (open-session probe) → Un-suspend | **Y** |
| p05.defi | Starter, limits {}, 1/1 | Suspend + stale-tab re-suspend → Un-suspend; trashed 2x by manager → restored by the user 2x | **Y** (Starter, active, not deleted) |
| p06.conservative | Starter, limits {} | Keyboard tier change → Pro → Starter | **Y** |
| p07.altcoin | Premium (comp, no subscription), limits {} | limits probes (−5, "abc", 1e9, 0, 1.5, 1e6, 1e12), UI limits 0/0, {coins:1} ×2 → cleared; Pro ↔ Premium (375 px UI and callable) | **Y** (Premium, {}, active; "2/200" live) |
| p08 / p09 / pro@ | — | Read only (S05-09 Firestore reads; pro@ detail viewed) | n/a |
| p10 / free@ | — | not touched | n/a |
| qa-adm-05@test.com (throwaway, registered this session, QaAdmin#2026) | new Starter | Trash/restore ×6, Delete-now/Empty-trash attempts (refused), Pro/Premium/Starter, simulated subscription fields (emulator REST) for S05-07/11/12, 4 extra portfolios (5 total), suspend probes, 1 Bitcoin coin added by the suspended-session probe, 50k note → cleared, Auth displayName probe → reset, suspended for the open-session timing probe → un-suspended | Left as a throwaway: Starter, active, not deleted, 5 portfolios, 1 coin, billing fields removed, an empty `adminNotes` doc. **Not permanently deleted**: a manager can't delete, which is the point of this session |
| Phantom docs `users/qa-s05-phantom-uid`, `users/qa-s05-ghost-uid`, `users/qa-s05-ghost-uid-2` | did not exist | created by `restoreUser` / `adminTrashUser` / `setPremiumLimits` / `setUserTier` probes | **Y**, deleted via emulator REST (404 verified) |
| Global switches / config | maintenance off, signups on, paid plans off, checkout/aiResearch off | none (a manager can't change them) | n/a |
| Browser tabs | — | 3 tabs created in my own group (admin, user app, 375 px iframe host) | closed at the end |

## Coverage
| Admin function (as manager) | Result | User-app effect verified | Mobile 375 / keyboard |
|---|---|---|---|
| Login / logout / role banner / footer "signed in as manager" | Pass; **S05-13** (credentials stay in the form after Log out) | Y (BUG-005 holds: p07 session unaffected) | — |
| Panel visibility: Settings, Admin access, View-as, Capture-now hidden | Pass | n/a | Mobile Y |
| Owner-only callables called directly (12) | Pass, all refused server-side | n/a | — |
| Manager → owners / self (tier, limits, suspend, sign-out, trash) | Pass, refused | n/a | — |
| Manager → owners: restore, note | **Fail S05-01** | n/a | — |
| Overview (counts, jobs, revenue, plan limits, webhooks, duplicates) | Pass (14 users, admins excluded) | Y (counts move with trash/restore) | Mobile Y |
| Users list: search, tier/billing filters, refresh, CSV (captured in-page) | Pass; S01-19 repeat | — | Mobile Y, keyboard Y (Enter opens a row; focus drops to body, S01-16) |
| Tier change (single, bulk, keyboard, 375 px) | Pass; **S05-11** for paying subscribers | Y, live ("Your plan is now Premium.", caps, Plan & billing screen) | Mobile Y, keyboard Y |
| Custom Premium limits | **Fail S05-03, S05-06** | Y, live ("1/1", "2/0 · Over plan limit", lock explainer) | Mobile Y (inputs fit; no `<label for>`) |
| Suspend / Un-suspend | Pass at login; S01-06 repeat for open sessions; **S05-12** (double suspend) | Y ("This account has been suspended…") | — |
| Sign out all devices | Open tab keeps working until reload (S01-06 class) | Y (reload → login screen, no reason shown) | — |
| Move to trash / Restore | Pass; **S05-07** (billing) | Y, live restore screen / back to portfolio | Mobile Y |
| Trash: Delete now / Empty trash | **S05-02** (shown, refused) | n/a | Mobile Y (inline confirm fits) |
| Private note | Works; **S05-01** (owner target), S05-08 addendum (silent truncation) | User can't read `adminNotes` (permission-denied) | — |
| Audit tab: list, action filter, raw API | Pass (config diff redacted); **S05-05** (refusals not logged) | n/a | Mobile Y |
| Self-delete of the manager via /app | **Fail S05-04** | Y (restore screen; restored) | — |
| Direct Firestore with manager token | **Fail S05-09** (reads); writes denied | n/a | — |
| Unknown uid / input types | **S05-08** | n/a | — |
| Network failure during a mutation | **S05-10** ("internal [0]") | n/a | — |
| Reload mid-flow (detail open, inline confirm) | Pass: returns to Overview signed in, nothing half-applied | — | — |

## Findings
> Most important: **S05-09** (managers can read all user holdings and theses), **S05-11** / **S05-07** (billing side effects of manager actions), **S05-04** (manager self-delete → hidden admin purge), **S05-03** (hidden custom limits re-apply), **S05-13** (admin credentials left in the form after Log out).

### S05-01 · Low · `restoreUser` and `saveUserNote` have no target guard: a manager can write to OWNER accounts (and `restoreUser` creates phantom `users/{uid}` docs for any uid)
- **Steps (reproduced 2x each, from the /admin page context as manager@test.com, importing `/src/api/admin.js`):**
  1. `restoreUser(<admin@ uid>)`, `restoreUser(<admin2@ uid>)`, `restoreUser(<manager@ uid>)` → all resolve `{success:true}`. Firestore emulator then shows `deleted:false, deletedAt:null` written onto each owner's `users/{uid}` doc (the seed never sets these fields), plus a `restoreUser` audit entry by the manager.
  2. `restoreUser('qa-s05-phantom-uid')` (no such user): doc was 404 before, 200 after with fields `{deleted, deletedAt}` — a phantom user doc is created. (I deleted it via the emulator REST API afterwards.)
  3. `saveUserNote(<admin2@ uid>, '…')` resolves; `getUserNote` reads it back → a manager can attach private notes to an owner account. (adminNotes doc did not exist before; deleted afterwards.)
- **Expected:** "a manager may not act on an owner at all" (CLAUDE.md, Admin & privacy). Every other manager mutation (`setUserTier`, `setPremiumLimits`, `suspendUser`, `adminSignOutUser`, `adminTrashUser`) refuses an owner with `permission-denied "Owner accounts can only be managed by another owner."` — restore and note should too, and restore should refuse a uid with no Auth record / no user doc.
- **Actual:** both succeed silently. Impact is limited (restore on a non-trashed account only rewrites `deleted:false`; owners can't be trashed in the first place), but it's an inconsistent role boundary and a write path that creates junk docs which then count for collection scans.
- **Effect on user accounts / user app:** none visible; admin-only data hygiene / boundary consistency.
- **New.**
- **Suggested fix:** `functions/index.js` `exports.restoreUser` (~L1471) and `exports.saveUserNote` (~L1639): call `await assertTargetAllowed(uid, callerRole, "protected")` like `adminTrashUser`; in `restoreUser`, `if (!rSnap.exists) throw HttpsError("not-found", …)` and skip the write when `wasDeleted` is already false. Add an integration case to `tests/functions-callable.test.js`.

### S05-02 · Low · Trash tab shows "Delete now" and "Empty trash" to a manager — both are dead ends ("Owners only… [403]" / "Emptied 0 — 1 failed")
- **Steps (3x: Delete now twice, Empty trash once; target = throwaway qa-adm-05@test.com that I registered and the manager moved to Trash):** sign in to /admin as manager@test.com → Trash → "Delete now" → type DELETE → OK. Then "Empty trash" → type DELETE → "Delete 1".
- **Expected:** the manager banner on the same screen says "permanent deletion is owner-only", so neither button should render for a manager (the panel already hides Settings, View-as and Capture-now by role). At minimum the intro copy shouldn't promise "Delete now erases it permanently" to someone who can't.
- **Actual:** both buttons render and accept the typed DELETE confirmation; the server correctly refuses (`deleteUser` → `permission-denied "Owners only. Your admin account doesn't have owner access. [403]"`). Delete now shows that toast; **Empty trash shows only "Emptied 0 — 1 failed"** with no reason. The account stays in Trash (good).
- **Same copy issue in Users → detail:** the help text under "Delete account" tells a manager "Permanent erasure (GDPR/CCPA) happens only from the Trash tab", which is an action they can't take.
- **Effect on user accounts / user app:** none — the server boundary holds; admin-only UX.
- **New.**
- **Suggested fix:** `src/components/admin-dashboard.jsx` ~L1084–1128: wrap the "Empty trash" block and the per-row "Delete now" in `{isOwner && …}` and swap the intro sentence for managers; in the `emptyTrash` handler (`src/hooks/useAdminDashboard*`) surface the first failure reason in the toast.

### S05-03 · Medium · Custom Premium limits survive a downgrade invisibly and silently re-apply on the next upgrade (a "Premium" user ends up capped at 1 coin, below Starter's 30)
- **Steps (2 independent repros on p03.speculator, original: Starter, `premiumLimits {}`; user tab logged in as p03):**
  - Repro A (UI only): admin → p03 → PREMIUM → Custom limits Coins = 1 → Save (user app live: "My Assets (1/1)") → STARTER. `lookupUser` still returns `premiumLimits {"coins":1}`, but the Custom limits panel is hidden for Starter so nobody can see or clear it. → PREMIUM again: the coins field pre-fills "1" and the user app immediately shows **"My Assets (1/1)"**.
  - Repro B (callable): `setPremiumLimits(<p03 uid>, {coins:1})` on the Starter user → `{success:true}` (no tier check). The UI never shows it; upgrading p03 to Premium → user app **"My Assets (1/1)"**.
- **Expected:** either `setUserTier` clears (or at least warns about) `premiumLimits` when leaving Premium, or `setPremiumLimits` refuses a non-Premium target; and an override stored on the account should always be visible in the detail card.
- **Actual:** the override is stored on any tier, hidden for non-Premium, and silently re-activated by the next upgrade. With a cap of 1 the upgraded "Premium" user can't add a second coin — worse than the free tier — with nothing in the admin UI explaining why.
- **Effect on user accounts / user app:** a paying (or comped) Premium user can be capped far below the plan they're shown ("PREMIUM" badge + "1/1"), until an admin happens to clear limits. Live, no reload needed.
- **New** (related but different from S01-02, which is about blanking a field not clearing).
- **Suggested fix:** `functions/index.js` `exports.setUserTier`: when the new tier ≠ premium, write `premiumLimits: {}` (and include it in the audit diff); `exports.setPremiumLimits` (~L1370): refuse unless target `tier === "premium"`. In `src/components/admin-dashboard.jsx` show a "custom limits stored (inactive on this tier)" line whenever `found.premiumLimits` is non-empty.
- **State:** p03 restored to Starter, `premiumLimits {}` (verified via lookupUser).

### S05-04 · Medium · A manager can self-delete via the user app; the trashed admin is invisible in the Trash tab, keeps full panel access, and the daily purge would hard-delete the admin account after 30 days
- **Steps (reproduced 2x, restored both times):**
  1. As manager@test.com (admin page context) call `deleteMyAccount({})` → `{success:true, graceDays:30}`; Firestore `users/{manager}.deleted = true`.
  2. Via the real UI: log in to /app as manager@test.com → Account → Privacy & data → Delete my account → password + DELETE → "Account deleted…" → same result.
  - Both times, in the /admin tab (still signed in as the manager): Trash → Refresh → **"Trash is empty."** `listUsers` doesn't return the account (admins are excluded), `getStats` total unchanged, and every manager callable (`getSystemStatus`, `listUsers`, …) keeps working — a "deleted" account still administers the app.
  3. Restored: (1) via `restoreMyAccount`, (2) by logging back in to /app → "Restore my account". Both verified `deleted:false`.
- **Expected:** an admin account can't be soft-deleted (owners are already refused: "Owner accounts can't be deleted…"; `adminTrashUser` refuses any admin with "remove their admin role first"). Self-delete should apply the same rule to managers. Failing that, the trashed admin must be visible in the Trash tab and lose panel access.
- **Actual:** `deleteMyAccount` only refuses owners, plus a `countAdmins() <= MIN_ADMINS` floor (3 admins today, so it passes). `purgeExpiredTrash` (`functions/index.js` ~L3230) has no admin skip, so after 30 days it would `recursiveDelete` + `auth.deleteUser` an account that still holds the `{admin:true, role:"manager"}` claim, and no owner could have seen it coming because the Trash tab hides admins.
- **Effect on user accounts / user app:** the user app works as for any user (restore screen, "You deleted this account"). The risk is to the admin team: a manager account can silently disappear. Also an inconsistency: a moderation-exempt admin enters the user trash lifecycle.
- **New.**
- **Suggested fix:** `functions/index.js` `exports.deleteMyAccount` (~L1657): refuse when `context.auth.token.admin === true` ("Remove your admin role first"), matching `adminTrashUser`. Make `purgeExpiredTrash` skip any uid whose Auth record has `customClaims.admin === true` (log it). Optionally list trashed admins in the Trash tab for owners.
- **Side effect of this test:** logging manager@ into /app the first time ran the free-plan onboarding (`planChosen:true` + a default portfolio now exist on the manager's user doc). This is harmless and I left it as is.

### S05-05 · Low · Refused admin calls leave no audit trail (a manager probing owner-only callables is invisible to owners)
- **Steps (2 runs):** as manager@test.com call owner-only / owner-targeted callables from the /admin page (`getAdminConfig`, `saveConfig`, `listAdmins`, `captureStatsSnapshot`, `setManagerRole`, `setSettingsPassword`, `unlockSettings`, `deleteUser`, `viewUserAsAdmin`, `setUserTier(<owner>)`, …) — ~25 refusals in run 1, 3 in run 2. Then `listAudit` / the Audit tab.
- **Expected:** the audit log is described as recording "every admin action". A refused privileged action (`permission-denied` from `assertOwner`/`assertTargetAllowed`) is the security-relevant event an owner most needs to see.
- **Actual:** zero entries for any refusal; only the successful calls were logged (the S05-01 `restoreUser`/`saveUserNote` writes did appear).
- **Effect on user accounts / user app:** none directly; reduces owners' ability to spot a compromised or curious manager account.
- **New** (same class as BUG-006 "PayPal webhook rejections aren't audited").
- **Suggested fix:** in `functions/index.js` `assertRole` / `assertTargetAllowed`, on a refusal for an **authenticated admin** caller write a rate-limited `writeAudit(context, "deniedAdminCall", {details: "<callable>: <reason>"})` (cap per uid per day to avoid log flooding).

### S05-06 · Low · Custom Premium limits accept 0 (and values below current usage) with "updated ✓" — the Premium user's portfolio turns "2/0 · Over plan limit" and loses the Add-portfolio button
- **Steps (2x):** (1) UI: manager → p07.altcoin (Premium, 1 portfolio / 2 coins) → Custom limits Portfolios = 0, Coins = 0 → Save → toast "Custom limits updated ✓". (2) Callable: `setPremiumLimits(<p07>, {portfolios:0})` → stored `{portfolios:0}`; also `{transactions:1.5}` is stored as 2 and `{portfolios:1e6}` as 100000 (coins are clamped to 1,000, portfolios/transactions are not given a product ceiling in the UI copy).
- **Expected:** limits < 1 refused (or at least a warning "below this user's current usage: 1 portfolio / 2 coins"); fractional input refused rather than silently rounded up.
- **Actual:** saved silently. User app (live, no reload): header loses the "+" add-portfolio control, "My Assets (2/0)", both coins tagged **"Over plan limit"** — a Premium user is shown as over the limit of the plan they pay for.
- **Effect on user accounts / user app:** user can't add portfolios/coins and sees "Over plan limit" until an admin clears it. Restored with Clear → "My Assets (2/200)" live; `premiumLimits {}` verified.
- **New** (same family as S01-02 / S01-12: limit inputs without validation).
- **Suggested fix:** `functions/index.js` `exports.setPremiumLimits` (~L1370): reject non-integers and values < 1 (`invalid-argument`), and add a portfolio/transaction ceiling like coins; `src/components/admin-dashboard.jsx` custom-limits inputs: `min=1 step=1` + show current usage next to each field.
- **Addendum to S05-06 / S05-03 (user-side wording, 2x on p07 with `{coins:1}`):** tapping the locked coin shows "Over your plan limit — WASTED is beyond your **Premium** plan's limit of **1 coins** per portfolio… **Upgrade** to use it again". The Premium user is told to upgrade from the top plan, there's a plural glitch ("1 coins"), and nothing says an admin set a custom limit. Suggested: when `premiumLimits` drives the cap, the explainer should say "a custom limit on your account" and offer "Contact support" instead of "Upgrade" (`src/CryptoIdea.jsx` lock explainer ~L700 + `lockInfo` modal). p07 restored to `premiumLimits {}`, live "2/200".

### S05-07 · Medium · "Move to trash" silently cancels the user's paid subscription, and "Restore" brings the account back with the subscription still cancelled — the confirm copy only says "recoverable for 30 days"
- **Setup:** throwaway qa-adm-05@test.com set to Pro and given a simulated `subscription {id, tier:"pro", status:"ACTIVE", endDate:+20d}` written straight to the Firestore emulator (PayPal can't run locally). billingStatus = active.
- **Steps (2x — once via callables, once via the UI as manager):** Users → qa-adm-05 → Delete account → type DELETE → Move to trash → Trash → Restore ("Account restored ✓").
- **Expected:** the confirm text warns that trashing cancels billing (and in production calls PayPal cancel), or Restore puts the subscription back / tells the admin it can't.
- **Actual:** the confirm says only "Type DELETE to move this account to the trash (recoverable for 30 days)". `adminTrashUser` writes `subscription.cancelled = true, cancelledAt` (R31-6). `restoreUser` only resets `deleted`/`deletedAt`, so after restore billingStatus stays **canceled** (tier still Pro until `endDate`, then `enforceSubscriptionPeriods` drops the user to Starter). The restore toast is just "Account restored ✓".
- **Effect on user accounts / user app:** a manager who trashes a paying user by mistake and restores them a minute later has still ended their subscription: the user is downgraded at the period end and has to subscribe again. In production the PayPal subscription is cancelled for real and can't be undone from the panel.
- **New.**
- **Suggested fix:** `src/components/admin-dashboard.jsx` delete-confirm (~L921–945): when `found.billingStatus === "active"`, add "This also cancels their PayPal subscription — restoring the account will NOT restart it." `functions/index.js` `exports.restoreUser`: return `{billingCancelledByTrash:true}` when `subscription.cancelledAt >= deletedAt` so the toast can say so. (Same applies to the user's own self-delete/restore flow.)
- **State:** qa-adm-05 subscription field removed and tier back to Starter (billing none).

### S05-08 · Low · Manager callables on an unknown uid either create phantom `users/{uid}` docs or fail with a bare `INTERNAL [500]`
- **Steps (2 runs, uids `qa-s05-ghost-uid`, `qa-s05-ghost-uid-2`; docs deleted via emulator REST afterwards):** as manager call each account callable with a uid that has no Auth record and no user doc.
  - `adminTrashUser` → **resolves**, creates `users/{uid}` `{deleted:true, deletedAt}` (+ audit "Moved to trash"). It never appears in the Trash tab (`listUsers` is Auth-driven), so nobody can see or clear it; `purgeExpiredTrash` will "purge" it in 30 days.
  - `setPremiumLimits` → **resolves**, creates `users/{uid}.premiumLimits`.
  - `restoreUser` → resolves and creates a doc (S05-01).
  - `setUserTier` → `INTERNAL [500]` when no doc exists (resolves and writes `tier` once some other call created the doc); `suspendUser`, `adminSignOutUser` → `INTERNAL [500]`.
- **Expected:** a uniform `not-found` ("No such user") from every account callable, and no writes.
- **Actual:** inconsistent mix of silent phantom writes and unhandled 500s (the Auth "user-not-found" error is not mapped).
- **Effect on user accounts / user app:** none for real users; admin data hygiene + confusing errors if a stale row (user deleted elsewhere) is acted on — the client shows "INTERNAL [500]" instead of "this user no longer exists".
- **New.**
- **Suggested fix:** in `functions/index.js`, one helper `assertUserExists(uid)` (Auth `getUser` → map `auth/user-not-found` to `HttpsError("not-found")`) called first in `setUserTier`, `setPremiumLimits`, `suspendUser`, `restoreUser`, `adminTrashUser`, `adminSignOutUser`, `saveUserNote`.
- **Addendum to S05-08 (input types, on throwaway qa-adm-05):** `suspendUser({uid, disabled:"yes"})` **suspends** (truthy coercion, so `"false"` would suspend too) and `disabled:0` un-suspends; `setUserTier({uid:[uid], tier:"pro"})` → `INTERNAL [500]` (uid type not validated); `saveUserNote` with a 50,000-char note is silently truncated to 4,000 with "success". Suggested: `typeof disabled === "boolean"` / `typeof uid === "string"` checks → `invalid-argument`; return `truncated:true` for notes.

### S05-09 · Medium · A manager (any admin claim) can read every user's portfolios, coins, transactions and journal theses straight from Firestore — bypassing the owner-only, reason-required, audited "View as"
- **Steps (2 runs):** on /admin signed in as manager@test.com, create a Firestore client on the admin app (`getFirestore(adminAuth.app)`, emulator) and read `users/{uid}/portfolios/*/coins/*/transactions/*` for p05, p07, pro@, p08, p09.
- **Expected:** "View as" (`viewUserAsAdmin`) is owner-only, requires a reason and is audited — the manager's own call is refused ("Owners only… [403]"). Holdings/journal content should not be readable by a manager by any other route, or at least not unaudited.
- **Actual:** every read succeeds: p05 1 portfolio / 1 coin / 1 tx; p07 2 coins; **p09's 2,000-character journal thesis** is readable. The `users/{uid}` profile docs are readable too. Nothing is written to the audit log (0 entries after the run). Writes are correctly denied (tier update on p05, edit on an owner doc, `config/app`, `audit`, `adminNotes`, `statsDaily`, and collection-group `coins` all → permission-denied).
- **Also:** the manager can LIST the whole `users` collection: 17 docs (14 users plus the 3 admin accounts), including `consent`, `settings` and `lastLogin`. This side-steps the "admins are excluded from the Users section" design (CRYP-103a). The other server-only collections (`config`, `audit`, `adminNotes`, `health`, `rateLimits`, `webhookEvents`, `statsDaily`, `aiBudget`, `settingsUnlock`, `settingsPwReset`, `cache`) are correctly denied, and manager writes to a user's portfolios/coins/learn are denied.
- **Cause:** `firestore.rules` L220/304/329/344/363 — `allow read: if … || isAdmin()` on users, portfolios, coins, transactions and learn, where `isAdmin()` is any `admin:true` claim (manager or legacy role-less admin).
- **Effect on user accounts / user app:** user holdings and private theses are exposed to every manager without a trace. This contradicts the panel's own model (Overview "no personal data", "no holdings anywhere", view-as owner-only + reason + audit). Nothing changes in the user app.
- **New.**
- **Suggested fix:** in `firestore.rules`, narrow the admin read branches on `portfolios`/`coins`/`transactions`/`learn` to `isAdminOwner()` — or drop them entirely, since `viewUserAsAdmin` reads through the Admin SDK and the panel's other surfaces use callables. Add rules tests for "manager can't read another user's coins/transactions/journal". Keep `users/{uid}` admin-readable only if a panel feature really needs it (`listUsers`/`lookupUser` are callables).

### S05-10 · Low · When the functions backend can't be reached, every admin mutation shows the toast "internal [0]"
- **Steps (2x, throwaway qa-adm-05):** in the /admin page, make requests to the functions port fail (`fetch` → `TypeError: Failed to fetch`, the same thing a dropped connection or a stopped functions emulator produces) → click PRO (run 1) / Suspend (run 2).
- **Expected:** a readable message, e.g. "Couldn't reach the server — nothing was changed. Check your connection and retry."
- **Actual:** the toast reads **"internal [0]"**. Nothing was changed (verified: tier still Starter, `disabled:false`), but an operator can't tell a network blip from a server bug.
- **Effect on user accounts / user app:** none; admin-only UX.
- **New** (BUG-002 is about the opposite case in the user app: a generic "check your connection" hiding a real cause).
- **Suggested fix:** in the admin toast path (`src/hooks/useAdminDashboard.js` catch blocks → shared formatter, or `src/api/admin.js`), map `code === "functions/internal"` with HTTP status 0 / `Failed to fetch` to a network message, the way `src/utils/errors.js` `apiErrorMessage` does for the user app.

### S05-11 · Medium · A manager can downgrade a paying PayPal subscriber with one click, no warning — the subscription keeps billing and the account then reads "Billing: none"
- **Setup:** throwaway qa-adm-05 set to Premium with a simulated live subscription written to the emulator (`paypalSubscriptionId:"I-QA-S05-SIM"`, `billingCycle:"month"`, `subscription{tier:"premium", status:"ACTIVE"}`). The detail card shows "BILLING · ACTIVE · PayPal subscription I-QA-S05-SIM · Monthly".
- **Steps (2x — desktop UI, then the 375 px UI):** as manager, Users → qa-adm-05 → STARTER.
- **Expected:** a confirm such as "This user pays for Premium via PayPal (I-QA-S05-SIM). Changing the tier here does NOT cancel or refund the subscription — they'll keep being charged." Or refuse a downgrade below the paid tier while the subscription is active and not cancelled.
- **Actual:** no confirm. "Tier updated ✓", tier → free. `billingStatusOf` then returns **"none"** (tier free + an un-cancelled sub), so the user drops out of the Billing "Past due/Canceled" filters and the revenue count, and nothing flags that a live subscription is still attached. A later `PAYMENT.SALE.COMPLETED` only records `lastPayment` (`billing.salePatch` restores a tier only after a payment failure), so the user keeps paying for Premium while on Starter. The open detail card keeps showing "ACTIVE" until a refresh.
- **Effect on user accounts / user app:** the user loses Premium caps live, but PayPal keeps charging them, with no in-app trace for support to find.
- **New.**
- **Suggested fix:** `src/components/admin-dashboard.jsx` tier buttons: when `found.paypalSubscriptionId && found.billingStatus === "active"` and the new tier is lower, show a confirm with the above copy. `functions/billing.js` `billingStatusOf`: return `"active"` (or a new `"mismatch"`) when an un-cancelled subscription exists, whatever the tier. Optionally `functions/index.js` `setUserTier` could refuse `failed-precondition` unless `force:true`.
- **Related (code reading only — not executed, because triggering the sweep would stamp the global job heartbeat):** the reverse case also slips by. A manager comping a user who still has a cancelled subscription whose `endDate` has passed (for example, after S05-07 trash → restore) gets no warning, and the next `enforceSubscriptionPeriods` run (`billing.subscriptionSweepPatch` L140) silently resets that user to Starter.
- **State:** the simulated billing fields were removed from qa-adm-05; tier Starter, billing none.

### S05-12 · Low · A repeated "Suspend" (e.g. from a stale second admin tab) restarts the freeze-the-clock timer, so the user loses the paid time from the first suspension
- **Setup:** throwaway qa-adm-05 with a simulated `subscription {tier:"pro", endDate: 1798000000000}`.
- **Steps (2x):** as manager `suspendUser(true)` at T0 → wait → `suspendUser(true)` again at T1 (exactly what S01-18 / the stale-tab case in this session produce, audited `disabled: true→true`) → wait → `suspendUser(false)` at T2.
- **Expected:** on un-suspend the subscription `endDate` is pushed back by the whole frozen period T2−T0 (R31-6 "the user loses none of their paid time").
- **Actual:** run 1: suspended 20 s, endDate extended **10 s**. Run 2: suspended 12 s, extended **4 s**. The second suspend overwrites `suspendedAt` with T1, so T1−T0 is lost. Also, `endDate` changes type from a number (ms) to an ISO string after the extension.
- **Effect on user accounts / user app:** a paying user suspended twice (double-click, two admins, stale tab) loses that stretch of paid access when the sweep later compares `endDate`. It's invisible in the user app until their access ends early.
- **New** (related to S01-18: the server accepts no-op suspends).
- **Suggested fix:** `functions/index.js` `exports.suspendUser` (~L1420): when `beforeDisabled === true`, skip the `suspendedAt` write (or treat the call as a no-op and return early with `{unchanged:true}`); keep `endDate` in one type (`functions/billing.js` `extendForSuspension` should return ms if the input was ms).
- **State:** simulated subscription removed; qa-adm-05 Starter, not suspended.

### S05-13 · Medium · After "Log out" the admin sign-in form still holds the admin's email AND password — one click signs them back in
- **Steps (2x):** sign in to /admin as manager@test.com → header "Log out" → the sign-in screen appears with the email field = "manager@test.com" and the password field **filled**. Run 1: my next typing was appended to the leftover email ("manager@test.commanager@test.com"). Run 2: logged in again, logged out, read the inputs → `["manager@test.com", password FILLED]`.
- **Expected:** logging out of an admin console clears both fields (or at least the password), so the next person at a shared or unattended machine can't sign straight back in.
- **Actual:** the React state of the login form survives logout, so pressing "Sign in" (or Enter) re-authenticates as the admin with no typing. (A full page reload clears the fields; the in-app Log out does not.)
- **Effect on user accounts / user app:** anyone with access to that browser tab after an admin "logged out" can regain manager/owner powers over every user account. The user app is not affected directly.
- **New** for /admin (same class as BUG-034 / BUG-080 in the user app).
- **Suggested fix:** `src/admin-main.jsx` login screen: reset the email/password state on sign-out (or key the form on the auth uid so it remounts), and use `autocomplete="off"` / clear on unmount for the password field.

> Repeat checks done as manager (not new findings): **S01-06**, measured. qa-adm-05 was suspended at 13:57:23 while signed in. A probe in its open /app tab did a Firestore write + the `chooseFreePlan` callable every 60 s: **27/27 succeeded from 13:58 to 14:24** (27 min after suspension), and at 14:02 it even **added a coin through the server-owned `addCoinGuarded` callable**. Only a reload ended the session. The ID token is valid until 14:57, so the window is up to ~60 min. Also seen on p04 (Firestore write + callable allowed); p02 "Sign out all devices" left the open tab working until reload), S01-07 (qa-adm-05 trashed by manager → user sees "You deleted this account"), S01-10 ("Set 1 user to pro ✓"), S01-16 (Escape doesn't cancel the inline DELETE confirm), S01-18 (stale second tab: "Suspend" on an already-suspended p05 → audited `disabled: true→true`), S01-19 (Select page + Tier=Premium filter → "14 selected" with 1 row visible; not executed), S01-04 (restoreUser/setUserTier audit rows show raw uid, no target email).

## Data-leak and backend checks
| Check | Result |
|---|---|
| Owner-only callables as manager: `getAdminConfig`, `saveConfig`, `listAdmins`, `captureStatsSnapshot`, `setManagerRole`, `setSettingsPassword`, `unlockSettings`, `requestSettingsPwReset`, `completeSettingsPwReset` (bogus token), `deleteUser` (fake uid, a real persona, and the throwaway via the UI), `viewUserAsAdmin` (fake + p02) | PASS: all `permission-denied "Owners only… [403]"`. `setAdminClaim` → "Removed… [403]" |
| Manager → owners (admin@, admin2@): `setUserTier`, `setPremiumLimits`, `suspendUser`, `adminSignOutUser`, `adminTrashUser` | PASS: refused, "Owner accounts can only be managed by another owner. [403]" / trash "Owner accounts are protected… [400]" |
| Manager → owners: `restoreUser`, `saveUserNote` | **FAIL**, both succeed (S05-01) |
| Manager → self: tier / limits / sign-out / suspend / trash | PASS: refused (`failed-precondition`, "remove their admin role first" / "cannot suspend your own admin account") |
| Manager → self via the user app `deleteMyAccount` | **FAIL**, allowed (S05-04) |
| Audit tab as manager: `saveConfig` rows (11 in the UI filter, 19 in the 500-row API read) | PASS: every row reads "settings changed — details are visible to owners only", also in the raw `listAudit` response (no diff, no secrets) |
| Refused manager calls audited? | **No** (S05-05) |
| Panel for manager: Settings tab, Admin access, View-as button, Capture-now | PASS: hidden; role banner "Signed in as a manager — accounts only…" |
| Panel for manager: Trash Delete-now / Empty trash | **Shown** but server-refused (S05-02) |
| Users list / CSV as manager | PASS: 14 users, 0 admin rows (CSV captured in-page, header `Email,Name,Tier,Billing status,Role,Status,Portfolios,Joined (UTC),UID`) |
| Manager Firestore direct: read users' portfolios/coins/transactions/journal, list `users` (incl. admins) | **FAIL**, readable without audit (S05-09) |
| Manager Firestore direct: `config`, `audit`, `adminNotes`, `health`, `rateLimits`, `webhookEvents`, `statsDaily`, `aiBudget`, `settingsUnlock`, `settingsPwReset`, `cache`, collection-group `coins`; writes to users/portfolios/coins/learn/owner doc/own tier | PASS: all `permission-denied` |
| User (p02) → admin callables `listUsers`, `getStats`, `listAudit`, `restoreUser`, `saveUserNote`, `getUserNote`, `setUserTier` | PASS: "Admins only. [403]" |
| User (p02) Firestore: own `adminNotes`, `config/app`, `health/jobs`, `settingsUnlock`, `audit`; self-write `tier` / `deleted` | PASS: all denied; own user doc has no admin-only fields |
| User bundle contains admin modules? (resource list of /app) | PASS: none loaded |
| `getSystemStatus` / `listWebhookEvents` / `listDailyStats` / `findDuplicateEmails` as manager | PASS: no secrets (keys: features, flags, jobs, caches, sentryConfigured) |
| Input clamps: `listAudit` 1e9/−5/"abc"/2.5, `listWebhookEvents` 1e9/−1, `lookupUser` case/whitespace/huge/object, `setUserTier` "admin"/"owner"/"PRO", unknown key `role` | PASS: clamped / `invalid-argument` / "Unexpected field" |
| Unknown uid / wrong types on account callables | **FAIL**: phantom docs / `INTERNAL [500]` / truthy coercion (S05-08) |
| BUG-005 (admin auth isolation): admin Log out → p07 /app session intact; manager@ logged into /app, self-deleted, restored while /admin was open → panel unaffected | PASS |
| Console errors (admin tab and user tab after flows) | None |

## Known bugs re-checked
- **BUG-005** (admin tab signs out non-admin sessions): holds as fixed. Separate auth instances, checked 2x.
- **BUG-020** ("Live sync was interrupted" during account setup): seen once when registering qa-adm-05 (not reproduced a second time, so it doesn't count as a confirmed repeat).
- **BUG-034** (deleted account's credentials stay in the login form): **repeat**. After manager@ self-deleted in /app, the login form still held the email and a filled password.
- **BUG-073** (previous users' cached profile in localStorage): **repeat**. the localhost origin held `ci-profile-<uid>` keys for 7 accounts mid-session and **10 accounts at the end while signed out** (fields: email, name, tier, premiumLimits, subscription, deleted…), including manager@.
- **BUG-027** (Escape doesn't close the coin Detail popup): not re-tested on purpose; I closed popups with the X.
- Session-01 findings re-seen as manager (not BUG ids yet): S01-04, S01-06, S01-07, S01-10, S01-16 (focus drops to `<body>` after opening a row and after a tier change; Escape doesn't cancel the inline DELETE confirm), S01-18, S01-19. Details in the note at the end of Findings.

## What worked well
- The owner/manager split holds server-side on every owner-only callable: uniform, readable "Owners only" errors, and the guards run before any argument checks (fake uids got 403, not 404).
- Owners can't be acted on through the main moderation callables, and admin targets get clear "remove their admin role first" messages.
- Config-diff redaction for managers works in both the UI and the raw API.
- User-app effects are **live** (no reload): tier badge + caps, custom limits ("1/1", "2/0 · Over plan limit"), trash → restore screen, restore → portfolio, "Your plan is now Premium." toast. Suspended login shows a clear message. Keep-data downgrade (5 portfolios → Starter) kept every portfolio and showed "Portfolios 5/3".
- Layout at 375 px: no horizontal overflow on Overview/Users/Trash/Audit/detail/inline-confirm. Toast fits inside the 16 px gutters. Keyboard: Enter opens rows and moves focus into the DELETE field.
- The in-page CSV export carries no admin rows, and formula-looking names are neutralised (a hostile Auth displayName never reaches the panel, which uses the validated Firestore name).

## Timeline
- 13:20 start; health OK; report created; S01 report read (p01 is not a manager).
- 13:21–13:23 manager login; panel visibility; owner-only callable sweep (all refused); manager→owner probes → **S05-01**.
- 13:23–13:25 Audit redaction PASS; registered qa-adm-05; Trash Delete-now/Empty-trash as manager → **S05-02**.
- 13:25–13:30 p02 tier/limits/sign-out/suspend with user-app checks + restore; user→admin and user Firestore leak checks; p03 hidden-override → **S05-03**.
- 13:30–13:33 bulk tier on p03; manager self-delete (callable + UI), invisible in Trash → **S05-04**.
- 13:33–13:37 refused calls unaudited → **S05-05**; 375 px sweep; p04 suspend-while-open (S01-06 repeat); p07 zero limits → **S05-06**.
- 13:37–13:41 simulated subscription trash/restore → **S05-07**; unknown-uid probes → **S05-08**; stale second tab, S01-19 repeat, BUG-005 recheck.
- 13:41–13:46 manager Firestore reads of holdings/theses → **S05-09**; p05 trash/restore live; keyboard tier change on p06.
- 13:46–13:52 CSV capture, displayName XSS probe (safe), input-type probes, network-failure toast → **S05-10**, over-limit explainer wording.
- 13:52–13:57 paying-subscriber downgrade → **S05-11**; double-suspend clock reset → **S05-12**; triple-click trash (3 audited calls, S01-18 class).
- 13:57–14:24 suspended-session timing probe on qa-adm-05 (27/27 writes OK, see the repeat note); meanwhile assembled the report and re-ran the owner-only callable sweep at ~50 min (still all refused).
- 14:24–14:30 un-suspended qa-adm-05; reload ended its session; final state check of all 16 accounts (all original; Trash empty; 14 users); keyboard-only re-login at the end exposed **S05-13** (form keeps credentials after Log out, 2x); logged out; closed my tabs.
