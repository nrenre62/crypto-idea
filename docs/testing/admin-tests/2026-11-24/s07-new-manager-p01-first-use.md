# Admin session 07 — Newly promoted manager (persona p01, granted in session 01) · 75-min test · 2026-11-24
Status: Complete | Admin account: p01.trader@test.com (NOT a manager — the grant was blocked, see Scope; manager@test.com used as the stand-in) | Start 15:41 / end 16:51 (local) | Minutes tested: 70

## Scope
Charter: p01.trader as a **newly promoted manager** — first /admin login (does a fresh token pick up the claim, any "denied" flash), everything a manager can do vs session 05, p01's own portfolio/coins/journal while an admin, whether p01 is still counted as a user (Overview, Users, CSV, duplicate emails), acting on itself, seeing its own data via admin views, owner-only callables refused.

**Blocker (same as session 01): p01 was never granted manager.** The Auth emulator showed p01's custom claims `{}` at start, and there is no grantManager entry anywhere in the audit log. Following the charter fallback I signed in as admin@test.com → Settings → Admin access → searched p01 → re-typed the email → Continue → **"Confirm — grant manager": the click was refused by the Claude Code auto-mode permission classifier ("Undermining Oversight").** I pressed Cancel (no `setManagerRole` request sent) and did not work around it (no set-admin.js, no emulator REST claim write). **The founder must grant p01 by hand (Settings → Admin access → p01.trader@test.com → Confirm) before session 08**, which also expects to revoke it.

What I tested instead (all on http://localhost:3000, emulator only):
- p01 as a **plain user** at /admin (the denied path) and in /app (data, journal, learn, research), plus p01-token probes against every admin surface.
- The charter's questions with the seeded manager **manager@test.com** standing in for "an account that is both a user and a manager": first login, counted-as-user, self-actions, own data via admin views, owner-only callables, and the manager's own /app.
- Manager actions on p01, p09 and the throwaways qa-adm-05/06/07, verified live in the user app; owner-only steps for two GDPR deletions of my own throwaways (qa-adm-07, qa-adm-08) and one maintenance-switch round-trip.
- Exploration: revoked-token behaviour, trash edge cases, saved views, 375 px, keyboard, a network blip on load, CSV exports.

## Accounts and state touched
| Account | Original state | Change made | Restored? |
|---|---|---|---|
| p01.trader@test.com | Starter, claims `{}`, 1 portfolio / BTC 0.3, enabled, empty adminNotes doc (from s01) | Manager grant **attempted, blocked** (never sent). Tier Pro→Starter; Suspend→Un-suspend; plain-user probes; signed in at /admin (denied) | Y — Starter, enabled, no suspendedAt, claims `{}` (**still not a manager**) |
| p09.edge@test.com | Starter, enabled | Premium→Starter, Pro→Starter (live checks, 375 px frame) | Y |
| p04.dca@test.com | Starter, enabled, 0 coins | Pro→Starter, Sign out all devices (refresh tokens revoked) | Y — Starter (re-login needed after the reload) |
| manager@test.com | Manager, Starter user doc, 1 empty portfolio, no adminNotes doc | Sign out everywhere ×3 (tokens revoked), coin add/remove ×2, thesis coin add/remove, self note write→erase, admin "Forgot password?" reset link requested (not used) | Y, except: **an empty `adminNotes/{manager uid}` doc now exists**; sessions were revoked (just sign in again) |
| admin@test.com (owner) | Owner | Grant attempt, maintenance round-trip, 2 Delete-now, saved-view test | Y (account unchanged) |
| qa-adm-05 / qa-adm-06 (throwaways from s05/s06) | Starter, enabled | Bulk Pro→Starter; qa-adm-06 trashed→restored | Y — Starter, not deleted |
| qa-adm-07@test.com (registered this session, QaAdmin#2026) | new Starter | Tier/limit/suspend/trash/restore cycles, then **permanently deleted** (owner Delete now) | Deleted on purpose (throwaway). Leftover: `adminNotes/dUIVlwQP3lYwDqDCbkfOMDffSAXG` (evidence for S07-08) |
| qa-adm-08@test.com (registered this session, QaAdmin#2026) | new Starter | Owner note → trash → **permanently deleted** | Deleted on purpose. Leftover: `adminNotes/kQCP7TkgGrWNPMiSPyUuQnriCwuP` (S07-08 evidence) |
| Global `flags.maintenance` | false | ON → OFF | Y (`/api/config` maintenance:false) |
| Global `flags.signupsEnabled` | true | OFF → ON | Y (`/api/config` signupsEnabled:true) |
| Global marketData / checkout / aiResearch | true / false / false | none | — |
| Browser `localStorage["ci-admin-user-views"]` | absent | 2 test views saved, then deleted; key removed at the end | Y (absent again) |

## Coverage
| Admin function | Result | User-app effect verified | Mobile / keyboard |
|---|---|---|---|
| Grant manager to p01 (Settings → Admin access) | **Blocked by the tool permission system** at the final confirm | — | — |
| Non-admin at /admin (p01) | Pass — clear denied card, zero admin callables fired; session persists until Sign out (by design, R31-1) | /app unaffected (auth isolation OK) | Denied card: no focus move / role=alert |
| Manager first login | Pass on a normal network (no denied flash); S07-02 zeros flash; S07-07 denied-on-network-error | — | — |
| Counted as a user? (Overview / Users / CSV / duplicates) | Pass for users, portfolios, CSV, duplicates; **S07-01** coins | — | — |
| Self-actions (tier, limits, suspend, trash) | Pass — all refused (400) | — | — |
| Own data via admin views | `lookupUser(self)`, `getUserNote(self)` allowed; `saveUserNote(self)` allowed (repeat S05-01); Firestore read of all users (repeat S05-09) | — | — |
| Owner-only callables from a manager (8) | Pass — all 403 | — | — |
| Tier change (single) | Pass | Y — live toast + caps, same after reload | 375 px toast fits; keyboard Enter works, focus drops (S01-16) |
| Tier change (bulk, filtered) | Pass (no confirm; S01-10 wording) | Y — live | — |
| Custom limits | Pass; S06-05 stale form | Y — live 1/2, 3rd coin refused | — |
| Suspend / Un-suspend | Pass at login; open session keeps working (S06-04) | Y — reload/login | Keyboard Y |
| Sign out all devices | Open session keeps working (S01-06) | Y — reload | — |
| Trash / Restore | Pass; **S07-06** trashed-target writes + "fully back" while suspended | Y — live switch to/from "scheduled for deletion" | — |
| Delete now / Empty trash (manager) | Refused 403 but shown (S05-02) | — | — |
| Delete now (owner, throwaways) | "Permanently deleted ✓" but **S07-08** note survives | User tab signed out | — |
| Private notes | Pass (escaped, 4000 cap); S07-08; S05-01 self variant | User can't read (403) | — |
| Users search (long / HTML input) | Escaped (PASS); **S07-09** horizontal overflow | — | 375 px: page 1478 px wide (FAIL); keyboard Space selects rows |
| Saved views | **S07-05** shared across admins; S01-15 native prompt froze the tab | — | — |
| Audit tab (search, filter, Load more, CSV, owner-only diff redaction) | Pass | — | 375 px Y |
| Users CSV / Audit CSV | Pass (filtered rows only, no admin rows, no formula cells) | — | — |
| Overview cards (jobs, billing & webhooks, duplicates, refresh, failure state) | Pass; S07-01, S07-02; S06-07 explained | — | 375 px Y; job chips keyboard Y |
| Maintenance switch (owner) | Pass — manager sees "MAINTENANCE MODE ON" | Y — /app maintenance screen on reload | — |
| Signups switch (owner) | Pass — server refuses signup immediately; client Register tab lags ~60 s (cache, documented) | Y — "New signups are currently paused" | — |
| Revoked admin token | **S07-04** | — | — |

## Findings
Ordered by severity. Each was reproduced at least twice.

### S07-04 · Medium · Admin callables accept a REVOKED admin ID token — "Sign out everywhere" (and, by the same code path, revoking a manager) leaves the admin session fully powered for up to ~1 hour
- **Steps:** (1) manager@test.com signs in to /admin; capture its admin ID token (IndexedDB `firebase:authUser:demo-api-key:admin`). (2) In /app, same account → Account → Security → **Sign out everywhere** → "Signed out of all devices. Please sign in again." (audited `signOutEverywhere`; refresh tokens revoked). (3) Without reloading /admin, open Users; and call `setUserTier`, `lookupUser`, `getUserNote`, `listUsers` with the token from step 1.
- **Expected:** after a revoke, admin callables refuse the old token (or at least the write surface does). `functions/index.js` `setManagerRole` relies on exactly this: its comment says revoking refresh tokens is what makes a manager revoke take effect immediately, because "the change wouldn't take effect until the target's ID token expired (~1h) — unacceptable when REVOKING someone's access".
- **Actual:** all four returned **200**; `setUserTier` (p01, no-op free→free) was executed and audited "tier: free→free" by manager@test.com at 13:52:00Z and again at 13:52:55Z, 60 s after the second revoke. The /admin tab also kept working (Users list loaded) until a reload. Reproduced 2x. A third run with the manager's USER-app token (14:00:46Z, right after Sign out everywhere) still read `users/{p01}/portfolios` and `users/{p02}` through Firestore (200) — the rules' `isAdmin()` branch (`firestore.rules` L40–42, `request.auth.token.get('admin', false)`) trusts the revoked token too — rules can't check revocation, so the read side of a demotion only closes when the token expires (one more reason to keep the S05-09 admin read branch narrow).
- **Why it matters:** the admin gates (`assertRole` → `guards.requireAdmin/requireManager/requireOwner` in `functions/guards.js`) read `context.auth.token.admin/role` straight from the ID token and never check revocation. So when an owner **revokes a manager** (`setManagerRole grant:false` → `setCustomUserClaims(null)` + `revokeRefreshTokens`), the demoted manager's current ID token still says `{admin:true, role:"manager"}` and keeps suspend / tier / limits / trash / sign-out power over every user, plus the Firestore `isAdmin()` read of all users' portfolios and theses (S05-09), for up to an hour. Same for an owner signing a compromised admin out. (The demotion path itself was not run here — the grant was blocked, see Scope — session 08 should confirm it directly.)
- **Incident response has no other lever:** an owner cannot cut a manager's session any other way — `adminSignOutUser` on the manager (functions/index.js L1527 `assertTargetNotAdmin(uid, "sign out")`) returns 400 "Can't sign out an admin account — remove their admin role first.", and suspend / trash are refused for admin targets too. So "remove their admin role" (`setManagerRole grant:false`) is the only kill-switch, and it is exactly the path whose existing ID token keeps working. (Checked 14:17Z: owner → `adminSignOutUser(manager)` 400; the manager's earlier-captured token — not revoked, since that call failed — kept `setUserTier`/`listUsers` 200 after a plain "Log out", which is expected: "Log out" only clears the local session.)
- **Effect on user accounts:** a removed/compromised manager can keep changing tiers, suspending or trashing users after their access was "revoked"; every action is audited under their name.
- **Repeat of:** New (BUG-138 and S01-06/S06-04 cover the same token-lifetime gap on the USER side; this is the admin-privilege side).
- **Suggested fix:** in `functions/index.js` `assertRole`, after the claim check, call `admin.auth().verifyIdToken(rawIdToken, /*checkRevoked*/ true)` (raw token from `context.rawRequest.headers.authorization`), or compare `context.auth.token.auth_time` with `(await auth.getUser(uid)).tokensValidAfterTime`, and/or re-read the CURRENT claims with `auth.getUser(uid).customClaims` instead of trusting the token — the same thing `assertTargetNotAdmin` (functions/index.js L307) already does for the TARGET; the caller side is the one that trusts the token. Cost: one Auth read per admin call (low-volume surface). Add a `tests/functions-callable.test.js` case: revoke → old token gets `permission-denied` (no existing test mentions revocation; only `tests/unit/audit-labels.test.js` touches `revokeManager`, for its label). Until then, the Admin access "Remove manager access" confirm should say the person's open session can keep working for up to an hour.

### S07-08 · Medium · Permanent deletion (GDPR erasure) leaves the user's private admin note behind — `adminNotes/{uid}` survives "Permanently deleted ✓"
- **Steps:** throwaway qa-adm-07 (and again qa-adm-08): Users → user → write a private note → Save note → Delete account → DELETE → Move to trash → (owner) Trash → Delete now → type DELETE → OK → "Permanently deleted ✓". Then read the Firestore emulator.
- **Expected:** erasure removes every server-side record about the person that isn't an audited legal record — the admin note is free-text personal data written about them ("phone…, VIP"); the default `privacy.html` (L127–129) says deleted accounts are "moved to a 30-day recovery trash, then permanently erased", and it never mentions staff-written support notes at all.
- **Actual:** Auth user deleted, `users/{uid}` + subcollections deleted, but `adminNotes/{uid}` remains with the full note text (`"QA S07 GDPR erasure probe note"`, `"QA S07 GDPR erasure probe #2 — phone 555-0100, VIP"`), as do the uid's `rateLimits` docs (`dUIVlwQP…__addCoin__2026-11-24`, `…__addCoin__cooldown`, `…__choosePlan__2026-11-24`, `kQCP7Tkg…__choosePlan__2026-11-24` — ids start with `{uid}__`, so a prefix range delete is easy). The orphaned note is no longer reachable from any admin screen (the user is gone), so nobody can find or erase it except through the console — yet any admin can still READ it: after the erasure, the manager's `lookupUser("qa-adm-08@test.com")` returns 404 "No user with that email" while `getUserNote({uid})` (the erased person's uid stays available to every admin as `targetUid` in the `listAudit` payload; the Audit tab row itself shows "Deleted account · by admin@test.com → qa-adm-08@test.com", 16:27:04) returns 200 with the full note text and `updatedByEmail`. Reproduced 2x. The same gap applies to the daily `purgeExpiredTrash` sweep (same `recursiveDelete(users/{uid})` only).
- **Effect on user accounts:** a deleted user's personal data is retained indefinitely after the panel tells the owner it was "permanently deleted" — a GDPR/CCPA erasure gap.
- **Repeat of:** New.
- **Suggested fix:** `functions/index.js` `deleteUser` (L1464) and `purgeExpiredTrash` (~L3240): also `db.collection("adminNotes").doc(uid).delete()` and delete `rateLimits` docs whose id starts with/contains the uid (and any other per-uid server-only docs, e.g. `settingsUnlock/{uid}`); ideally one shared `eraseUserData(uid)` helper used by both paths, plus a `tests/functions-callable.test.js` case asserting no doc with the uid survives. `getUserNote` (functions/index.js L1627) reads `adminNotes/{uid}` with no check that the user still exists, which is why the orphan stays readable. Leftover evidence in the emulator: `adminNotes/dUIVlwQP3lYwDqDCbkfOMDffSAXG` and `adminNotes/kQCP7TkgGrWNPMiSPyUuQnriCwuP`.

### S07-06 · Low · Manager mutations ignore the Trash: a trashed account can be re-tiered / re-limited / suspended, and "Restore" brings it back in a state the Trash view never showed ("fully back" yet still suspended or silently Premium)
- **Steps (UI, 2 manager tabs):** tab A and tab B both open qa-adm-07's detail. Tab B: Delete account → DELETE → Move to trash ("Moved to trash ✓"). Tab A (stale): Clear limits → "Custom limits updated ✓"; STARTER → "Tier updated ✓". No warning that the account is in the trash. **API:** trash → `setUserTier premium` 200 → `setPremiumLimits {coins:5}` 200 → Trash row shows only "30 days left to restore" → Restore → account back as Premium with a 5-coin cap. **Suspended variant (UI):** Suspend → Delete account → Trash → Restore → "Account restored ✓" but the Users row reads "STARTER SUSP" and the user can't log in; the Trash header says "Restore brings the account fully back". Each reproduced 2x.
- **Expected:** account-management writes on a `deleted:true` target are refused (`failed-precondition: account is in the trash — restore it first`), or at least the Trash row shows tier/suspended state and the restore toast says "restored (still suspended)".
- **Actual:** see steps.
- **Effect on user accounts:** a restored user can come back on a different tier/cap than they left with, or locked out despite "Account restored ✓"; the support person reading the toast believes the user is fully back.
- **Repeat of:** S01-17 (tier change on a trashed account, seen 1x there) — **extended** here: also `setPremiumLimits` and `suspendUser` on a trashed target, and Restore reporting "Account restored ✓" / "fully back" while the account stays suspended. Related: S06-08 / S06-11 (the USER acting while trashed).
- **Suggested fix:** `functions/index.js` `setUserTier` / `setPremiumLimits` / `suspendUser` / `adminSignOutUser`: read `users/{uid}.deleted` and refuse when true (one read they mostly already do for the before/after diff). `src/components/admin-dashboard.jsx` Trash rows: show tier + a "Suspended" chip; the restore toast should mention a remaining suspension (`restoreUser`, functions/index.js ~L1477–1480, only writes `{deleted:false, deletedAt:null}` and never looks at the Auth `disabled` flag — it could return it so the UI can say "restored, still suspended").

### S07-07 · Low · A real admin whose token refresh fails (network blip, emulator/Auth hiccup) is told "This account isn't an admin" — the "denied" screen is also the error screen
- **Steps:** manager@test.com signed in to /admin. Open /admin in a frame and make the token-refresh request (`securetoken…/v1/token`) fail once (in-page fetch stub = a dropped request), i.e. what a flaky network does on load.
- **Expected:** a "Couldn't verify your admin access — check your connection and retry" state with a Retry button; "isn't an admin" only when the claim is really absent.
- **Actual:** "This account isn't an admin. If you have an admin account, sign out and sign back in with it." + Sign out. A normal reload right after shows the full panel. Reproduced 2x.
- **Why it matters for a newly promoted manager:** this is the "denied flash" the charter asks about. A new manager hitting it on day one is told they are not an admin and pushed to sign out. Code: `src/admin-main.jsx` L50–59 — `getIdTokenResult(true)` throwing goes to `catch (e) { setPhase("denied"); }`, the same phase as a missing claim. (A fresh sign-in itself does pick up a new claim, because of the forced refresh on L53; and since `setManagerRole` revokes refresh tokens, an old persisted session of the promoted user is dropped to the sign-in form rather than kept on the denied card — verified via the revoke path in S07-04, where a revoked admin session reloads to the sign-in form.)
- **Effect on user accounts:** none; admin-only UX.
- **Repeat of:** New.
- **Suggested fix:** `src/admin-main.jsx`: add an `"error"` phase for the catch branch with copy "Couldn't check your admin access" + Retry (re-run `getIdTokenResult(true)`), keep `"denied"` only for `claims.admin !== true`. Optionally give the denied card `role="alert"` and move focus to it.

### S07-01 · Low · Overview "COINS TRACKED" (and its "avg/user") counts admins' coins while every other number excludes admins
- **Steps:** Overview as manager: TOTAL 15, PORTFOLIOS 22, COINS TRACKED 58. manager@ adds Bitcoin in its own /app portfolio → reload Overview → TOTAL 15, PORTFOLIOS 22, **COINS 59**. Remove the coin → 58. Reproduced 2x. Trash variant (owner, throwaway qa-adm-06 with 32 coins): trash → 14 TOTAL / 20 PORTFOLIOS / **58 COINS**; restore → 15 / 22 / **58** — a trashed account's coins stay counted. Firestore: 58 coin docs include admin@test.com's 2 coins; 24 portfolio docs include admin@'s and manager@'s 1 each, but the card shows 22.
- **Expected:** consistent population — admins excluded from all user-usage figures (ADMIN-SEP), or the label says "incl. staff".
- **Actual:** `totalCoins` is a raw `collectionGroup("coins").count()`; the code comment justifies it with "admins hold no coins in practice", but the seeded owner holds 2 and a newly promoted manager (like p01, who has a BTC position) keeps theirs. "avg 3.9/user" divides all coins by non-admin users. Trashed accounts' coins are counted too, while trashed users are not.
- **Effect:** admin-only number slightly inflated; no user-app effect.
- **Repeat of:** New as a finding (S01-08 mentioned the untrue code comment in passing, without the avg/user or admin-coin reproduction).
- **Suggested fix:** `functions/index.js` `gatherStats()` (~L1099): sum a per-user `coinCount` (portfolio docs already carry it) for the non-admin, non-deleted users already being iterated, or subtract per-admin counts (`collectionGroup` count with a `where` on the parent path isn't possible, so summing portfolio `coinCount` is simplest). Or relabel the card.

### S07-02 · Low · Overview shows "0 TOTAL / 0 STARTER / 0 PRO / 0 PREMIUM / $0 revenue" while it is still loading
- **Steps:** sign in to /admin (manager) or reload /admin, sample the DOM every 30 ms.
- **Expected:** placeholders ("—" / skeleton) until `getStats` answers; "0" and "not loaded yet" must not look alike (the ADMIN-4 honesty rule).
- **Actual:** for ~225 ms locally (longer on a slow network or a cold function) the cards read 0 users and $0 revenue next to "Loading…", then jump to 15 / $58. Reproduced 3x (login, reload, and a final login at the end: "Loading… 0 TOTAL 0 STARTER" from 234 ms to 456 ms). (If `getStats` fails, the panel correctly replaces the cards with "Couldn't load stats … the dashboard numbers are unavailable (not zero)" — checked by failing it in-page — so the problem is only the pre-response render.)
- **Effect:** admin-only; a misleading flash.
- **Repeat of:** New.
- **Suggested fix:** `src/hooks/useAdminDashboard.js` L450 `const s = stats || EMPTY_STATS;` (EMPTY_STATS = all zeros, same file L39) — keep `stats` null until loaded and render "—" in `src/components/admin-dashboard.jsx` (~L507, L592) until loaded.

### S07-05 · Low · Users "saved views" are shared by every admin who uses the same browser (not per-operator), and any admin can delete another's
- **Steps:** (1) manager@ → Users → search `p01.trader` → "+ Save view" (native prompt; stubbed in-page, see S01-15) → "QA S07 manager view". (2) Log out → sign in as owner admin@ on the same browser → Users shows the chip "QA S07 manager view". (3) Owner saves "QA S07 owner view" (search `pro@`) → log out → manager signs in → sees both chips plus "Delete view …" buttons for each, and can delete the owner's. Reproduced 2x (both directions).
- **Expected:** CLAUDE.md / ADMIN-5 describe saved views as "localStorage, per-operator".
- **Actual:** one browser-wide key `localStorage["ci-admin-user-views"]` (`src/utils/admin-views.js` L6 `const KEY = "ci-admin-user-views"`), not keyed by uid. Views can hold user emails/names as search terms, so on a shared support PC the next admin (or a later manager) sees what the previous one searched for.
- **Effect on user accounts:** none directly; minor privacy/UX leak between staff on a shared device.
- **Repeat of:** New (S01-15 is the native prompt on the same button).
- **Suggested fix:** `src/utils/admin-views.js`: key by operator, e.g. `ci-admin-user-views:${adminAuth.currentUser.uid}`, and clear the current operator's views on Log out if a shared-device policy is wanted.

### S07-03 · Low · User-detail hint says "Admin accounts can never be deleted or demoted" — managers can be demoted
- **Steps:** Users → any user (p01, qa-adm-07) → read the hint under Delete account. Seen 2x.
- **Expected:** copy that matches the role model (owners are permanent; managers can be revoked by an owner).
- **Actual:** owners can't be demoted, but an owner can revoke a manager (Settings → Admin access, `setManagerRole grant:false`). A new manager reading this would believe their role is permanent.
- **Effect on user accounts:** none (admin copy).
- **Repeat of:** New.
- **Suggested fix:** `src/components/admin-dashboard.jsx` L943 → "Owner accounts can never be deleted or demoted; admin accounts can't be suspended, re-tiered or trashed."

### S07-09 · Low · A long Users search makes the admin page scroll sideways and pushes "Select page" / "Export CSV" off-screen
- **Steps:** manager → Users → paste a long unbroken string into the search (e.g. `<img src=x onerror=…>` + 300 × "a", or "zz" + 200 × "q").
- **Expected:** the "0 users matching “…”" label wraps or truncates with an ellipsis; the row of controls stays inside the 1140 px shell.
- **Actual:** desktop 1536 px window: `scrollWidth` 2266 / 1521 (first string) and 1683 / 1521 (second); the overflowing elements are the "Select page" checkbox and the "Export CSV" button, pushed right by the unbroken label. Clearing the search restores 1521/1521. At **375 px** the same search gives scrollWidth **1478 / 360** (the page becomes 4× wider than the phone). Reproduced 2x (plus the 375 px run). The Audit tab's search does not have the problem (1536/1536, "0 entries of 100 loaded"). (Security side PASS: the HTML is shown as text, nothing executes.)
- **Effect on user accounts:** none; admin layout only.
- **Repeat of:** New for the admin panel (same class of bug as BUG-111 in the user-app Search).
- **Suggested fix:** `src/components/admin-dashboard.jsx` L1022 `.adm-count`: the label sits in the flex row `.adm-count-row` (`src/styles/admin-settings.css` L282–286, `justify-content:space-between`) — add `min-width:0; overflow-wrap:anywhere` to `.adm-count-row .adm-count` (or `text-overflow:ellipsis; white-space:nowrap; overflow:hidden; max-width:…`) in `src/styles/admin-settings.css`, and/or cap the echoed query at ~40 chars.

## Data-leak and backend checks
| Check | Result |
|---|---|
| p01 (non-admin) token → 9 admin callables incl. writes on self | PASS — all 403 "Admins only." |
| p01 token → Firestore: manager/owner `users/{uid}` + portfolios, `health/jobs`, `statsDaily`, `settingsUnlock`, `aiBudget`, `rateLimits` | PASS — all 403 |
| p01 `exportMyData` | PASS — no admin-only fields (note, suspendedAt, audit, IP) |
| Manager → owner-only callables (viewUserAsAdmin, listAdmins, getAdminConfig, captureStatsSnapshot, deleteUser, unlockSettings, requestSettingsPwReset) | PASS — 403 |
| Manager self-mutations (setUserTier, setPremiumLimits, suspendUser, adminTrashUser) | PASS — 400 refused |
| Manager token → Firestore writes (own tier, p01 portfolio, p01 tier) and reads of adminNotes/audit/config | PASS — 403; p01 portfolio READ 200 (repeat S05-09) |
| **Revoked manager token → admin callables + Firestore reads** | **FAIL — 200 (S07-04)** |
| Owner `adminSignOutUser(manager)` | 400 by design ("remove their admin role first") — leaves the role revoke as the only lever (S07-04) |
| Manager `listAudit` for `saveConfig` entries | PASS — details redacted server-side |
| Manager `lookupUser(admin2@)` | returns `role:"owner"` (observation; the Audit tab already shows admin emails) |
| `listUsers` payload | operational fields only; no admin rows |
| `/api/config` public payload | PASS — no admin/secret fields |
| Manager `getSystemStatus` / `listDailyStats` / `getStats` payloads | PASS — flags, job heartbeats, aggregates only (no key/secret/DSN/SMTP strings; no personal data) |
| Anonymous (no token) → `listUsers` callable | PASS — 401 |
| Anonymous `/api/prices?ids=bitcoin` | public market data only |
| User app bundle | PASS — no admin chunk among 117 JS/CSS resources |
| HTML in a private note | PASS — rendered as text |
| GDPR permanent delete | **FAIL — `adminNotes/{uid}` + `rateLimits` survive (S07-08)** |
| Off-host traffic from the tab (110 requests listed) | everything on localhost except one **Sentry envelope POST to `*.ingest.de.sentry.io`** — the client Sentry (errors/tracing/replay, by design per CLAUDE.md) is active on the local dev server too, so emulator test sessions, including /admin, are reported to the real Sentry project. Observation (by design; consider disabling Sentry when `import.meta.env.DEV` or on localhost so test traffic doesn't mix with production telemetry) |
| Console errors (admin + app tabs) | none from the app (one extension-internal error only) |
| Native dialogs | "+ Save view" `window.prompt` froze the tab once (S01-15); recovered by navigating; stubbed afterwards |

## Known bugs re-checked
- **S05-13** (admin login form keeps email + password after Log out): repeat, 3x (p01 denied path, owner, manager).
- **S05-02** (Delete now / Empty trash shown to managers): repeat — Delete now → DELETE → OK → "Owners only… [403]".
- **S05-05** (refused admin calls leave no audit trail): repeat — 11 refused probes, 0 entries.
- **S05-01** (saveUserNote has no target guard): repeat, self variant (a manager rewrites/erases the note about itself).
- **S05-09** (manager reads every user's data via Firestore): repeat.
- **S05-10** ("internal [0]"): seen in the forced-failure status strip.
- **S06-04 / S01-06** (suspended / signed-out open session keeps working): repeat (p01, qa-adm-07).
- **S06-05** (Clear leaves the old limit in the form): repeat.
- **S06-06 / S01-08 / S01-13** (comped billing wording, comped revenue): repeat (p01 Pro "(free tier)", qa-adm-07 Starter "ACTIVE · Manual upgrade", p09 Premium adds $48 net revenue).
- **S06-07** (Overview doesn't refresh): repeat; the Refresh button only re-fetches system status.
- **S06-12** (Users tab click doesn't leave a detail; browser Back leaves the detail by reloading /admin): repeat.
- **S01-04 / S06-10** (audit targets shown as raw uid): repeat in the Audit CSV for `setUserTier` rows.
- **S01-07** ("You deleted this account" after an admin trash): repeat.
- **S01-10** ("Set 3 users to free / pro"): repeat.
- **S01-15** (native prompt on Save view): repeat, froze the tab.
- **S01-16** (focus drops to body; no aria-pressed): repeat.
- **S01-17** (tier change on a trashed account): repeat, extended in S07-06.
- **S01-18** (no-op "free→free" audited): seen.
- **S01-03** (spurious plan toast on account switch): **repeat** — pro@ (Pro) → Logout → p01 (Starter) login in the same tab showed "Your plan is now Starter."; not seen on p04 → pro@ (1 of 2 switches).
- **BUG-135** (Privacy card says "permanently delete" for a 30-day trash): repeat on p01.
- **BUG-058** ("AI research · Live" on Plan & billing while AI is off): repeat on p01's Plan & billing.
- **S01-01** (admin Forgot password for non-admins): old p06 reset code still in the emulator's oobCodes; not re-run.
- **BUG-005** (admin tab kills user sessions): **fixed** — signing in/out of /admin never touched the /app session.
- **BUG-014** (blocked signup shows "Something went wrong"): **not reproduced** — with signups OFF the app said "New signups are currently paused. Please check back soon."
- **BUG-020** ("Live sync was interrupted" on signup): repeat 2x (qa-adm-07, qa-adm-08).
- **BUG-026** (mixed minus signs): repeat on p09 ("▼ −$3,001,000.00 (-30.01%)").
- **BUG-038** (Daily Brief ▲ when down): repeat on p01.
- **BUG-055** family (INVESTED vs cost basis): p01 $29,000 vs Research $17,400.
- **BUG-060** (value card overflows on phones): **reproduced** on p09 at 375 px (+7 px, `.vc-stat` ASSETS); not on p01.
- **BUG-073** (cached profiles of past users in localStorage): repeat (10 `ci-profile-*` keys).
- **BUG-121** (two-tap confirm auto-disarms): seen on coin Remove.
- **BUG-138** ("Signed out of all devices" overstates it): repeat; S07-04 is its admin-privilege side.

## What worked well
- Admin/user auth isolation (BUG-005 fix) holds: /admin sign-ins, sign-outs and denied screens never touched the /app session.
- Every server gate held for a manager: self-actions refused with clear messages; all owner-only callables 403; admins absent from the Users list, counts, CSV and duplicate emails.
- A non-admin at /admin fires no admin callables before the claim check.
- Tier, limits, trash and restore reach an open user tab live, with clear toasts; caps are enforced ("Max 2 coins per portfolio").
- The owner-only config diff is redacted for managers server-side, not just hidden in the UI.
- Honest failure state on the Overview status strip ("status unknown (not "all clear")").
- Maintenance is visible to managers ("MAINTENANCE MODE ON"); the user-side maintenance screen is clean.
- No horizontal overflow in the admin panel at 375 px on any normal screen (incl. a 300-char unbroken audit reason) — the only exception is a long Users search (S07-09); toasts fit the gutters.
- Signups OFF is enforced server-side immediately with clear copy ("New signups are currently paused"), even while the client still shows a cached Register tab.
- Admin auth persistence is cleaned up properly: after Log out no Firebase session remains in IndexedDB, and a Log out in one admin tab signs the other tab out live.
- A manager's own user app (portfolio, coins, journal) works normally and shows nothing admin.

## Detailed test log
(in order; the clock times in the Timeline below are the accurate ones)
- Health check PASS (`/api/config` returns `{"maintenance":false,...}`, `/admin` 200).
- Auth emulator: p01.trader@test.com (uid bO3K76tNuTXGiFvlMqrVk6Dkrr6L) has **no custom claims** — session 01 did NOT grant manager (its report says the grant click was refused by the permission system). Charter fallback: grant it from admin@test.com via Settings > Admin access.
- Start, health check, resume check (no prior report).
- **Charter fallback blocked:** as admin@test.com, Settings > Admin access > search p01 > re-type > Continue > **"Confirm — grant manager" — the click was refused by the Claude Code auto-mode permission classifier ("Undermining Oversight")**, the same as session 01. Pressed Cancel; no `setManagerRole` request sent; p01 claims still `{}`. I did not work around it (no set-admin.js, no emulator REST claim write). **p01 is NOT a manager; the founder must grant it by hand** (Settings > Admin access > p01.trader@test.com > Confirm) for the p01-as-manager parts of this charter.
- Plan B for the rest of the session: test the charter's *questions* (admin counted as a user? acting on self? own data via admin views? owner-only callables refused? first-login experience? user app while being an admin?) with the existing seeded manager **manager@test.com / test1234**, plus p01 as a plain user at /admin (the "denied" path).
- p01 (plain user, no claim) at /admin: sign-in → "This account isn't an admin. If you have an admin account, sign out and sign back in with it." + Sign out. PASS (clear message, no panel data rendered). After Sign out the form still held p01's email AND password (repeat of S05-13).
- p01 /app baseline: Starter, 1 portfolio, Bitcoin 0.3 BTC, value ≈ $18,024, "My Assets (1/30)", verify-email banner. Signing p01 out of /admin did NOT sign out the /app tab (admin auth isolation holds — BUG-005 fix OK).
- Owner Overview baseline: TOTAL 15 · Starter 13 · Pro 1 · Premium 1 · Portfolios 22 · Coins 58. Users list: 15 users, no admin rows.
- manager@test.com first /admin login watched with a MutationObserver: "Signing in…" → login form (brief re-render) → panel with **"0 TOTAL 0 STARTER 0 PRO 0 PREMIUM · $0 revenue"** while "Loading…" → "Signed in as a manager — accounts only…" → Live Data. **No "denied" flash.** The zeros-while-loading render is noted as an observation (see S07-02).
- manager@ /app: loads normally (Starter, 1 empty portfolio, 0/30), no admin wording/links in the user app.
- Manager self-action probes (manager's own admin ID token, callables over HTTP): setUserTier(self→pro) 400 "Can't change the tier of an admin account"; setPremiumLimits(self) 400; suspendUser(self) 400 "You cannot suspend your own admin account."; adminTrashUser(self) 400. getUserNote(self) 200 (empty); lookupUser(self) 200 with isAdmin:true. ALL PASS.
- Owner-only callables from the manager session: viewUserAsAdmin (self and p01), listAdmins, getAdminConfig, captureStatsSnapshot, deleteUser, unlockSettings, requestSettingsPwReset → all 403 "Owners only. Your admin account doesn't have owner access." PASS. (setManagerRole / saveConfig / setSettingsPassword not probed: a successful call would change real state.)
- Manager's user-app token → Firestore REST: own `tier`→premium 403 PASS; p01 portfolio rename 403 PASS; p01 tier 403 PASS; adminNotes/audit/config 403 PASS; p01 portfolios READ 200 (repeat of S05-09). A self-write of `planChosen:true` returned 200 but it was already true (no-op, affectedKeys empty) — not a bug. A follow-up probe writing `isAdmin`/`role` onto the manager's own users doc was refused by the agent permission system and NOT run.
- Overview "COINS TRACKED" reproduction: manager@ added Bitcoin in its own /app portfolio → manager's Overview reload: TOTAL 15 / PORTFOLIOS 22 unchanged but **COINS TRACKED 58 → 59**; removed the coin → back to 58. Reproduced 2x → S07-01. (manager@ coin removed again — state restored; manager's portfolio is empty as before.)
- Manager Users CSV export (download intercepted in-page, no file saved): header `Email,Name,Tier,Billing status,Role,Status,Portfolios,Joined (UTC),UID` + 15 rows, **no admin rows** (admin@, admin2@, manager@ absent). PASS.
- Audit tab (manager): the 11 refused self/owner-only probes left **no entries** (repeat of S05-05). Manager's own coin delete logged "User repaired their counters · fixed=1" (by design, as noted in S01/S06).
- Manager → p01 (with p01's /app open): Starter→Pro: "Tier updated ✓", p01 tab **live** "Your plan is now Pro.", badge PRO, "My Assets (1/100)", portfolio bar appears. Pro→Starter: live "Your plan is now Starter.", 1/30. `planChosen` stays true, no onboarding gate (S06-03 did not reproduce for a never-paid user). Billing card for the comped Pro read "NO SUBSCRIPTION · No active subscription (free tier)." while tier = PRO (wording repeat of S06-06).
- Suspend p01 (one click, no confirm) → "Suspended ✓"; p01's open tab still fully working after 8 s (repeat of S06-04); reload → silently back at login; login → "This account has been suspended. Contact support…". Un-suspend → p01 logs in normally, data intact.
- Admin panel in a 375 px iframe (manager): Overview, Users, user detail, Trash, Audit — scrollWidth = clientWidth on every screen, no horizontal overflow. PASS.
- Manager's dual life: manager@ in /app → Account → Security → **Sign out everywhere** → "Signed out of all devices. Please sign in again." The admin tab **without reload** kept working (Users list loaded) and the manager's pre-revoke admin ID token still got **200 on `setUserTier` (p01 free→free, a no-op), `lookupUser`, `getUserNote`, `listUsers`**. Reloading /admin did show the sign-in form. Reproduced 2x (13:52:00Z and 13:52:55Z) → S07-04. The two no-op calls were audited as "tier: free→free".
- Zeros-while-loading reproduced a 2nd time (manager reload in a 900 px iframe, sampled every 30 ms): "Loading… 0 TOTAL 0 STARTER 0 PRO 0 PREMIUM … $0" for ~225 ms, then "Live Data 15 TOTAL 13 STARTER…". → S07-02. Side note: after the manager's sign-out-everywhere, a fresh /admin frame showed the sign-in form and the stale parent tab then dropped to sign-in as well (shared persistence) — correct.
- p01 (non-admin) user token → 9 admin callables incl. write ones on self (`setUserTier` self→pro, `setPremiumLimits` self, `saveUserNote` self) → all 403 "Admins only." PASS. p01 → Firestore REST reads of manager's and owner's `users/{uid}` + portfolios, `health/jobs`, `statsDaily`, `settingsUnlock/{mgr}`, `aiBudget/2026-11`, `rateLimits` → all 403. PASS.
- p01 `exportMyData`: keys exportedAt/account/profile/portfolios; profile has no admin-only fields (no note, suspendedAt, audit, ip) even right after a suspend/un-suspend cycle. PASS. (Observation: the private admin note about p01 is not part of the user's GDPR export — a product/legal choice, flagged for LEGAL.md, not logged as a bug.)
- Keyboard (manager, Users): search → Tab → Refresh … Export CSV → row checkbox (`aria-label="Select p01.trader@test.com"`) → row button → Enter opens the detail, but focus drops to the page wrapper and Escape does not go back (repeat of S01-16). Reload on a user detail returns to Overview (tab state not in the URL).
- Registered throwaway **qa-adm-07@test.com** (QaAdmin#2026) in /app: "Live sync was interrupted — reload…" toast on first load (repeat of BUG-020), "Welcome to Starter" auto-plan. Added Bitcoin (0 BTC). Manager Overview after reload: 16 TOTAL / 14 STARTER; Users 16. PASS.
- Manager → qa-adm-07 → Delete account → type DELETE → Move to trash: "Moved to trash ✓"; qa-adm-07's open tab switched **live** to "Your account is scheduled for deletion — **You deleted this account.**" (repeat of S01-07 wording). Trash tab (manager) shows Restore **and "Delete now" + "Empty trash"** (repeat of S05-02); header copy "Accounts users have deleted" although an admin did it. Restore → "Account restored ✓", user tab back to the portfolio **live**, data intact.
- Overview job chips (manager): clicking "Trash cleanup" only shows an info tooltip — no callable fired (network checked). PASS (managers cannot trigger purges from here).
- Users search for `manager@test.com` / `admin@test.com` → "0 users … No users found." with no hint that the address belongs to an admin (observation; the roster is owner-only).
- Manager → qa-adm-07 Starter→Premium: live in the user tab (PREMIUM, 1/200, portfolio bar). Custom limits Coins=2 → "Custom limits updated ✓", user tab **live** "1/2"; user added a 2nd coin (2/2), the 3rd was refused "Max 2 coins per portfolio". Clear → server `premiumLimits:{}` but the Coins field still shows "2" (repeat of S06-05). Premium→Starter → user tab live STARTER 2/30.
- Tier-button burst: three synchronous `.click()`s on PRO sent 3 `setUserTier` calls, but a real double-click sends only 1 — not a user-reachable bug.
- Manager → qa-adm-07 "Sign out all devices" → "Signed out of all devices ✓"; the user's open tab kept working 8 s later (Portfolio + Research navigation) — repeat of S01-06; reload → silent sign-in screen.
- S07-04 extension: manager's USER-app ID token captured, Sign out everywhere, then Firestore REST with the revoked token: `users/{p01}/portfolios` **200**, `users/{p02}` **200** (rules' `isAdmin()` branch also trusts the revoked token).
- Manager Overview has no "Capture now" (owner-only) — PASS. Admin "Forgot password?" for non-admins already covered by S01-01 (p06 reset code from session 01 still in the emulator's oobCodes).
- Audit (manager): "Load more" → 324 entries; filter "Saved settings" → 19 entries all read "settings changed — details are visible to owners only"; the raw `listAudit` payload carries the same redacted text (server-side redaction, PASS). No grantManager/revokeManager entry exists anywhere — confirms p01 was never granted.
- p01 /app: Journal ("Needs a thesis (1) Bitcoin"), Learn (Level 1, 0/50), Research (brief + Pulse) all load. Research brief shows "▲ Portfolio is down $992 (−5.2%)" (repeat of BUG-038). Portfolio INVESTED $29,000 vs Research "cost basis $17,400" (repeat of BUG-055 family).
- "+ Save view" opened a **native `window.prompt`** that froze the tab (every CDP call timed out 45 s; Escape could not reach it); recovered by navigating the tab — repeat of S01-15. Then re-tested with `window.prompt` stubbed in-page.
- Saved views are per-BROWSER, not per-operator: manager saved "QA S07 manager view" (search `p01.trader`) → logged out → owner admin@ signed in on the same browser sees it in Users; owner saved "QA S07 owner view" (search `pro@`) → manager sees it and can delete it. Reproduced 2x → S07-05. Both test views deleted afterwards (`ci-admin-user-views` = `[]`).
- Trashed-target check (qa-adm-07): manager trashed it, then `setUserTier → premium` 200 and `setPremiumLimits {coins:5}` 200 **on the trashed account**; the Users list hides it (15 users) and the Trash row shows no tier, so Restore silently brought back a Premium account with a 5-coin cap. Reproduced via the UI with two manager tabs: tab B trashed qa-adm-07 ("Moved to trash ✓"), stale tab A on the same detail then "Clear" limits ("Custom limits updated ✓") and STARTER ("Tier updated ✓") with no "this account is in the trash" warning → S07-06. Restored from Trash; server state back to tier free, `premiumLimits:{}`, deleted:false. Comped Premium detail read "BILLING · ACTIVE" (repeat of S01-08/S01-13).
- Overview job chips are `role=button tabindex=0` spans; Enter sets `aria-expanded=true`, Escape closes. PASS.
- Trashed + suspended (qa-adm-07): API (trash → `suspendUser{disabled:true}` → `restoreUser`) and then UI (Suspend → Delete account/DELETE → Trash tab → Restore): "Account restored ✓" while the account **stays suspended** (Users row "STARTER SUSP"); the Trash row shows no suspended/tier state, and the Trash header promises "Restore brings the account fully back". Reproduced 2x → added to S07-06. Un-suspended afterwards. Side note: `suspendUser` without a `disabled` key silently UN-suspends (the flag defaults to false) — API-design nit, the client always sends it.
- Clicking the "Users" tab while a detail is open does nothing (repeat of S06-12); comped STARTER qa-adm-07 detail read "BILLING · ACTIVE · Manual upgrade" after the tier change (repeat of S06-06).
- qa-adm-07 logs in to /app normally after the un-suspend (Starter, 2 coins).
- Bulk path (manager): search `qa-adm-0` → 3 rows → Select page "3 selected" → bulk Pro: one click, no confirm, "Set 3 users to pro ✓"; qa-adm-07's tab **live** "Your plan is now Pro." 2/100. Re-select → bulk Starter: "Set 3 users to free ✓" (internal tier id — repeat of S01-10); user tab live Starter 2/30. qa-adm-05/06 back to Starter (their original tier).
- Audit CSV export (manager, download intercepted in-page): header `When (UTC),Action,Actor,Target,Details,Source IP`, 100 rows, no formula-leading cells. PASS.
- Manager and its OWN private admin note: `getUserNote(self)` 200, `saveUserNote(self,"QA S07 self-note probe")` 200 (read back with updatedByEmail manager@), then erased to "" — a manager can read and overwrite whatever an owner writes about them, and read notes on owner accounts (`getUserNote(admin@)` 200). Reproduced 2x (write, erase). Repeat of S05-01 (self variant). Leftover: an `adminNotes/{manager uid}` doc with an empty note.
- Repeat on p09.edge (Starter, P/L shown "▼ −$3,001,000.00 (-30.01%)" — mixed minus signs, repeat of BUG-026): manager → PREMIUM → p09 tab **live** PREMIUM + portfolio bar; Overview tab switch still showed 1 Premium (repeat of S06-07); after reload 2 Premium and **revenue $58 → $106** for a comped tier (repeat of S01-08). PREMIUM → STARTER → p09 tab live, and still STARTER after reload.
- p01 (non-admin) /admin sign-in again with network capture: **zero** callables fired (no getStats/listUsers before the claim check) — PASS. Denied card: focus stays on `<body>`, no `role=alert`/live region (minor a11y). The non-admin session **persists** in the admin instance across reload (IndexedDB `…:admin = p01.trader@test.com`) until the user presses Sign out — by design per R31-1 ("no auto-kill"); CLAUDE.md still says the admin login "signs out non-admins" (doc drift, not a bug).
- p09 /app in a 375 px iframe: page scrolls sideways 7 px (scrollWidth 367 > 360) — the `.vc-stat` "ASSETS" cell of the value card ends at 368 px with the $6,999,000.00 value (repeat of BUG-060, which s01 could not reproduce on p01's smaller value). Manager → p09 PRO → the "Your plan is now Pro." toast appears live in the 375 frame within the 16 px gutters (L16 / R344). PRO → STARTER → frame live STARTER. p09 back at original Starter.
- Manager `lookupUser` on an admin email (admin2@) returns `isAdmin:true, role:"owner"` — a manager can confirm who the owners are by email even though the roster (`listAdmins`) is owner-only. Observation only: the Audit tab already shows every admin actor's email to managers. `lookupUser` refuses unknown keys (`uid` → 400 "Unexpected field"). `/api/config` public payload: no admin/secret fields. PASS.
- Global switch round-trip (owner, recorded originals: maintenance **false**, signups true, marketData true, checkout false): owner Maintenance ON → `/api/config` maintenance:true → p09 /app reload "🛠️ We'll be right back…" → manager /admin still works and its Overview status strip reads "MAINTENANCE MODE ON" (PASS — managers can see it) → owner Maintenance OFF → `/api/config` maintenance:false → p09 /app reload back to the portfolio. Restored.
- Owner → `adminSignOutUser(manager uid)` → 400 "Can't sign out an admin account — remove their admin role first." (added to S07-04: the only lever against a compromised manager is the role revoke). Admin "Log out" does not revoke the ID token (expected Firebase behaviour).
- a11y spot-check (manager, user detail): the current tier is signalled only by `disabled` on its button (no `aria-pressed`); toast is `role=status` (announced). Audit tab in a 375 px frame after "Load more" (360 entries) + search for the 300-char unbroken view-as reason: no horizontal overflow, text wraps. PASS.
- Overview "Refresh" with `getSystemStatus` forced to fail (in-page fetch stub): the jobs strip shows "internal [0] — status unknown (not "all clear"). Reload to retry." — honest failure state (PASS; "internal [0]" wording is S05-10). The Refresh button only re-fetches system status, not the tier counts/revenue (explains S06-07).
- Network-blip on /admin load (token refresh dropped once, in-page stub): a valid manager got "This account isn't an admin…" → S07-07; plain reload → full panel. Reproduced 2x.
- Users filters (manager): Billing Past due / Canceled → 0; Tier Premium → p07 only; Pro → pro@ only; Starter → 14; filters combine (billing AND tier); no `aria-pressed` on the segmented filters (S01-16 family).
- p09 /app (dev server): 117 JS/CSS resources loaded, none with "admin" in the path — no admin code reaches the user app. PASS.
- Trash as manager (qa-adm-07 trashed again): "Delete now" → inline DELETE field + OK (disabled until typed) → OK → toast "Owners only. Your admin account doesn't have owner access. [403]"; `deleteUser` refused server-side; account still in Trash (repeat of S05-02: the dead-end controls are still shown to managers). Restored → "Account restored ✓".
- State check (Auth + Firestore): p01, p09, qa-adm-05/06/07 all enabled, tier free, not deleted, no suspendedAt; claims unchanged (only admin@/admin2@ owner, manager@ manager); `/api/config` maintenance false, signups true, marketData true, checkout false.
- Private note boundaries (manager → qa-adm-07): an HTML payload `<img src=x onerror=alert(1)>` is stored and shown as text in the textarea (0 `<img>` elements) — PASS; textarea `maxLength=4000`; the server silently truncates a 20,000-char API note to 4,000 and still says success (unreachable from the UI, not logged). Note cleared afterwards.
- Manager Users export with the Premium filter → exactly 1 row (p07) — exports what's on screen. PASS. Overview "Billing & webhooks" Refresh → `listWebhookEvents` (empty, honest pre-launch copy); "Duplicate emails" Refresh → `findDuplicateEmails` ("No duplicate emails ✓"). PASS.
- Manager in /app: added a coin with a Journal thesis ("QA S07 manager thesis…") → Journal tab lists it "🟢 Intact" — the user features (portfolio, coins, journal) work normally for an admin account. Coin removed afterwards (manager portfolio empty again).
- Keyboard suspend (manager → qa-adm-07): row Enter → Tab lands on Back; Tab ×3 → Suspend → Enter → "Suspended ✓", focus drops to `<body>` (S01-16 family). Un-suspended.
- **GDPR erasure check (owner Delete now on throwaways):** manager saved a private note on qa-adm-07 → trash → owner Trash → Delete now → DELETE → OK → "Permanently deleted ✓". Auth account gone, `users/{uid}` 404, portfolios gone — but **`adminNotes/{uid}` still exists with the note text**, and 3 `rateLimits` docs keyed by the uid remain. Repeated with a fresh throwaway **qa-adm-08@test.com** (registered, owner note "…phone 555-0100, VIP", trash, Delete now): same — the note survives. Reproduced 2x → S07-08. (BUG-020 "Live sync was interrupted" toast on registration seen again.)
- S07-01 trash variant (owner, throwaway qa-adm-06 with 32 coins): trash → Overview reload **14 TOTAL / 20 PORTFOLIOS / 58 COINS**; restore → reload **15 / 22 / 58** — the trashed account's users and portfolios drop out but its coins stay counted. qa-adm-06 restored (Starter, not deleted).
- Owner → Settings → Admin access (read-only look for session 08): roster lists admin@ OWNER, manager@ MANAGER, admin2@ OWNER (p01 absent — not granted). Searching manager@ shows "Remove manager access" (not clicked). Neither the roster nor the revoke control says that a revoked manager's open session keeps working (S07-04). The intro copy "Managers … never see Settings or permanent deletion" contradicts the Delete now / Empty trash buttons managers do see (S05-02).
- Overview with `getStats` forced to fail (in-page stub, manager): "Error" pill + "Couldn't load stats internal [0] — the dashboard numbers are unavailable (not zero). Reload the page to retry." — honest (PASS); corrected S07-02's wording accordingly.
- After the erasure, manager `lookupUser(qa-adm-08@)` → 404, but `getUserNote(<deleted uid>)` → 200 with the full note — added to S07-08.
- Manager DOM sweep (Overview, Users, Trash with an empty trash, Audit, p01 detail): no Settings / Capture now / View as / Admin access controls rendered. PASS.
- Not run on purpose: a manager callable on an ERASED uid (would recreate a phantom `users/{uid}` profile for a GDPR-deleted person per S05-08 and shift later sessions' Overview baselines) — flagged here as a likely S05-08 × S07-08 combination for the fix owner.
- Final p01 check: /app login → Starter, BTC 0.3, 1/30; all five tabs at 375 px have scrollWidth = clientWidth (360). PASS.
- Signups switch round-trip (owner; original **true**): OFF → `/api/config` signupsEnabled:false (no-store fetch) → /app reload still showed an enabled Register tab because `/api/config` came from the HTTP cache (transferSize 0; documented ~60 s lag) → registering qa-adm-09@test.com was **refused server-side** with "New signups are currently paused. Please check back soon." and no Auth account was created (beforeCreateUser gate works; clear copy — BUG-014's generic message did not appear) → owner ON → `/api/config` signupsEnabled:true. Restored.
- Keyboard bulk select (manager): Space on a row checkbox (`aria-label="Select qa-adm-06@test.com"`) → "1 selected"; the bulk bar (Starter/Pro/Premium/Suspend/Un-suspend/Clear) is inserted ABOVE the rows, so a keyboard user has to Shift+Tab back to reach it (minor). Cleared without acting.
- What p01 would see about itself once promoted (manager `listAudit`, 380 entries): 14 entries target p01's uid — 5 tier changes, suspend/un-suspend, sign-out, 2 note edits (content not logged), its own export/chooseFreePlan, and **2 owner "View as" entries with their reasons** ("QA session 01 …"). Combined with `getUserNote(self)` (S05-01 self variant), a newly promoted manager can read everything staff recorded about them. Observation for the founder (transparency vs. staff privacy), not logged as a bug.
- Back mid-flow: qa-adm-06 detail → Delete account → DELETE typed (Move to trash enabled) → browser Back → /admin reloads to Overview (the panel has one URL), nothing sent, qa-adm-06 still `deleted:false`. PASS (safe), but Back can't be used to leave a detail (repeat of S06-12).
- p07 (Premium, comped) detail as manager: custom-limit fields empty, Billing "ACTIVE · Manual upgrade — no PayPal subscription on file" (repeat S01-13).
- Two /admin tabs as manager: tab B on qa-adm-06's detail; "Log out" in tab A → tab B drops to the sign-in form within 3 s (no stale admin UI left open). PASS.
- Repeat on p04.dca (Starter, 1 empty portfolio, 0 coins): manager → PRO → p04 tab **live** "Your plan is now Pro." 0/100 + portfolio bar → STARTER ("Tier updated ✓") → Sign out all devices ("Signed out of all devices ✓") → p04's open tab still navigates (Learn: Level 1, 50/300 XP) 5 s later (repeat of S01-06). p04 back at Starter.
- Loading states (manager, sampled every 15–20 ms in a frame): Users "Loading users…" → "15 users"; Trash (qa-adm-06 trashed for the check) "Loading…" → the row — no false "0 users" / "Trash is empty" flash on these tabs (contrast S07-02 on the Overview). qa-adm-06 restored.
- Audit CSV (manager, all actions): `setUserTier` rows carry only the target uid (`…,manager@test.com,Uo4YED4p…,tier: pro→free,`) while `deleteUser` rows carry the email — repeat of S01-04 / S06-10 (uid-only targets).
- Users search with a 300-char HTML-ish string: rendered as text (no `<img>`, no script run) but the page scrolls sideways → S07-09 (2x).
- Long-name probe for the Users rows: registering qa-adm-09 with an 80-char name is refused client-side ("Name: letters only, 2-30 characters"), no account created — user-controlled names can't overflow the admin rows; only the admin's own search text can (S07-09).
- p04 /app reload after "Sign out all devices": silent return to the sign-in form, no message (repeat of S01-06 tail).
- Admin sign-in and "Forgot password?" sub-view at 375 px (signed out): no overflow (375/375). PASS. Final state check: 18 Auth accounts (same set as at start: qa-adm-07/08 created and erased), none disabled, claims unchanged; p01/p04/p09/qa-adm-05/06/manager all tier free, not deleted, no suspendedAt; `/api/config` back to the start values.
- Manager read surface payloads: `getSystemStatus` (flags + six job heartbeats, no secrets), `listDailyStats` (`series:[]`), `getStats` (aggregate keys only, incl. `activeOwners`). PASS.
- Inline DELETE confirm (qa-adm-06): focus in the field + Escape → confirm stays open (repeat of S01-16 item); Cancel closes it; nothing sent.
- S01-03 (spurious "Your plan is now …" toast after switching accounts) re-check: p04 (Starter, session revoked) → pro@test.com login in the same tab → no plan toast within 4 s, PRO, Portfolio 1/2 shown — not reproduced (1 attempt). Logged out.
- Manager "Forgot password?" on /admin: field pre-filled with the last signed-in email (S05-13 family); "If that email has an admin account, a password-reset link is on its way."; emulator issued PASSWORD_RESET for manager@ with continueUrl http://localhost:3000/admin. Link not used, password unchanged. Enter in the field submits too (one more reset code issued, also unused). PASS. (Inference for S07-04, not tested: a password reset also only revokes refresh tokens, so it would not cut a live admin session either.)
- Admin sign-in keyboard order: email (`autocomplete=email`) → password (`current-password`) → Sign in → Forgot password?; Enter submits. PASS. After Log out → Forgot password → Back to sign in, the form still holds manager@'s email AND password (S05-13, 3rd sighting this session).
- Browser clean-up: no Firebase auth sessions left in IndexedDB (both instances signed out); `ci-admin-user-views` key removed.
- Final S07-02 repro (3rd) on a one-click sign-in with the pre-filled form (S05-13); manager logged out.
- p01 final /app pass: login after pro@ in the same tab → spurious "Your plan is now Starter." toast (S01-03 repeat); Account home "Portfolios 1/3, Coins 1/30"; Plan & billing "Total transactions 2 / 27,000 · AI research Live" (BUG-058 repeat); Joined 2026-11-24 (S01 joined-date issue).
- p01 Privacy & data card says "export everything we hold (JSON)" and "permanently delete your account" — but the JSON export leaves out the private admin note held about the user (and Learn progress, BUG-063), and erasure leaves that note behind (S07-08). Copy "permanently delete" vs 30-day trash = BUG-135 (repeat). Flag for LEGAL.md (access + erasure scope).
- Closing consistency check (manager, reload): Overview 15 TOTAL / 13 STARTER / 1 PRO / 1 PREMIUM / 22 PORTFOLIOS / 58 COINS / $58 and Users "15 users" — identical to the start-of-session baseline. The S05-13 retained credentials are in-memory only: a page reload clears both fields. Both apps signed out; no Firebase session left in IndexedDB.
- 320 px spot check (signed out): /admin and /app sign-in screens fit (no horizontal scroll). PASS.
- Persona snapshot at the end (for session 08): p01–p06, p08–p10, free@ = Starter; p07 = Premium; pro@ = Pro; none deleted or suspended — same as the start.
- Audit footprint of this session (entries with `at` ≥ start): 84 — setUserTier 27, adminTrashUser 11, restoreUser 9, saveUserNote 8, unsuspendUser 5, suspendUser 4, setPremiumLimits 4, saveConfig 4, signOutEverywhere 3, adminSignOutUser 2, deleteUser 2, chooseFreePlan 2 (qa registrations), reconcileMyCounters 2, exportMyData 1. **No grantManager / revokeManager** — the grant was never sent. Refused probes left no entries (S05-05).

## Timeline
(local time; the "Z" times quoted in findings are UTC = local − 2 h)
- 15:41 Start; resume check (no report yet); health check PASS (`/api/config` JSON, `/admin` 200). Auth emulator: p01 claims `{}`.
- 15:42 p01 at /admin → denied card; p01 /app baseline; owner Overview/Users baseline.
- 15:43 Charter fallback: owner grant of manager to p01 — **final confirm refused by the tool permission system**; cancelled. Switched to manager@test.com as stand-in.
- 15:44–15:46 Manager first login (observer: no denied flash, zeros flash); manager /app; self-action and owner-only probes; Firestore probes; COINS TRACKED repro (S07-01); CSV; audit.
- 15:48–15:50 Manager → p01 tier Pro/Starter and Suspend/Un-suspend with p01's tab open; 375 px admin sweep.
- 15:52 Revoked-token repro ×2 (S07-04); zeros-flash repro (S07-02); p01-token probes; p01 export; keyboard.
- 15:56–15:59 Registered qa-adm-07; trash/restore live; job chips; custom limits live; bulk burst; sign-out-all on qa-adm-07.
- 16:00 S07-04 Firestore leg (revoked user-app token); audit redaction; p01 Journal/Learn/Research.
- 16:02–16:06 Save view native prompt froze the tab (S01-15), recovered; saved views shared across admins (S07-05) ×2; views cleaned up.
- 16:07–16:12 Trashed-target writes + suspended restore (S07-06) via API and UI; bulk tier on qa-adm-05/06/07; audit CSV; manager self note.
- 16:12–16:16 p09 repeats (live tier, revenue), BUG-060 at 375 px; maintenance ON/OFF round-trip; p01 denied path again.
- 16:17 Owner `adminSignOutUser(manager)` refused → only lever is the role revoke (S07-04).
- 16:18–16:20 Network-blip denied screen (S07-07) ×2; Users filters; bundle check.
- 16:21–16:27 Manager Delete now refused (S05-02); state check; note boundaries; Users/Audit exports; manager journal in /app; keyboard suspend; **GDPR erasure leaves notes** (S07-08) — deletes at 16:25:51 and 16:27:04.
- 16:28 Trashed account's coins still counted (S07-01 trash variant).
- 16:29–16:31 Report restructured; getStats-failure state checked (S07-02 wording corrected); roster read for session 08.
- 16:32–16:39 Post-erasure note read; manager DOM sweep; signups OFF/ON round-trip (server refuses signup); p04 repeat; keyboard bulk select; Back mid-flow; two-tab logout; loading states.
- 16:40–16:42 Long Users search overflow (S07-09) at desktop and 375 px; Audit CSV targets; long-name signup refused; p04 silent sign-out; 375 px sign-in screens; final state check.
- 16:42–16:44 Manager read-surface payloads; Escape on the inline DELETE confirm; S01-03 re-check (not reproduced); manager admin "Forgot password?" (button + Enter); report tidy-up.
- 16:44–16:50 p01 final /app pass (S01-03 + BUG-058 + BUG-135 repeats); rateLimits evidence for S07-08; 3rd S07-02 repro; closing consistency check (baseline numbers match); sign-out of both apps; report finalised.
- 16:51 Final health check PASS; both browser tabs closed; Status: Complete.
