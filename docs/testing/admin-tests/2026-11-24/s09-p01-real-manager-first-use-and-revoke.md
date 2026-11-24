# Admin session 09 — Real newly promoted manager (persona p01) then Owner #1 for revoke · 75-min test · 2026-11-24
Status: Complete | Admin account: p01.trader@test.com (manager, granted by the founder at 17:11:52), then admin@test.com (owner) for the revoke | Start 17:12 local – end 18:23 local | Minutes tested: 70

## Scope
First real use of a freshly promoted manager (p01 — the founder granted it by hand via Settings > Admin access; sessions 07–08 could not). Covered: first login with the fresh claim (any "denied" flash?), what the manager can and cannot do (owner-only UI hidden, owner-only callables refused from the page), p01 excluded from Users / Overview / CSV / duplicate emails, p01 acting on its own account, p01's user app while it is an admin (reads, writes, leaks), two admins in one browser, the owner revoking p01 while p01's admin tab is open (stale tab behaviour, Users list and counts, audit rows), and the founder's lead about the Admin access roster not refreshing. Then free exploration around role changes: grant/revoke on throwaways (trashed, suspended, paying, brand-new unverified), races between two owners, keyboard-only revoke, 375 px, the trash purge of an admin, and the shared admin session switching identity under an open tab.

Pre-state (17:13, Auth emulator `accounts:query`): p01 claims `{"admin":true,"role":"manager"}`; admins = admin@ (owner), admin2@ (owner), manager@ (manager), p01 (manager). Leftover throwaways from earlier sessions: qa-adm-05, qa-adm-06, test@test.com. Global flags: maintenance false, signups true, paidPlans false, features {marketData:true, checkout:false, aiResearch:false}.

## Accounts and state touched
| Account | Original state | Change made | Restored? |
|---|---|---|---|
| p01.trader@test.com | Starter, **manager** claim (founder grant), premiumLimits {}, 1 portfolio / 1 coin (BTC), active | Used as manager 17:13–17:19; a QA thesis added + deleted twice in /app; **revoked** by admin@ at 17:20:04 (required final state); accidentally moved to Trash at 17:24:23 by a tester script (see timeline) and restored 40 s later | **Y — final: normal user (claims `{}`), Starter, active, not deleted, no thesis.** Only residue: `deleted:false, deletedAt:null` fields on its user doc from the restore |
| p03.speculator | Starter | Starter→Pro→Starter (manager p01, UI) | Y |
| p04.dca | Starter | Starter→Pro (rapid-click test)→Starter | Y |
| p02.longterm | Starter, no claims | Grant flow opened twice up to the warning, never confirmed; "View as"-free | Y (no claims verified) |
| qa-adm-05 (throwaway) | Starter, no claims | Pro/Starter ×5 (incl. by revoked managers), granted/revoked ×3, trashed + granted (S09-04) | Y — Starter, no claims, not deleted |
| qa-adm-06 (throwaway) | Starter, no claims | Pro/Starter, granted/revoked ~12× (by admin@ in the UI and via callable, and by admin2@ via callable), trashed + granted, suspended + granted, used as a manager in /admin and revoked mid-session | Y — Starter, no claims, active, not deleted |
| qa-adm-11 (registered this session, QaAdmin#2026) | new | granted → revoked → trashed → **Delete now** (owner) | Permanently deleted (throwaway, by design) |
| qa-adm-12 (registered this session, QaAdmin#2026) | new | trashed → granted manager → `deletedAt` back-dated 31 days → **purged** by the `purgeExpiredTrash` job I triggered | Permanently deleted (throwaway, by design) |
| manager@test.com | manager | One callable re-grant (no-op `manager→manager`), which also revoked its refresh tokens; used to sign into /admin twice for S09-09 | Y — still manager (its other sessions must sign in again) |
| admin@ / admin2@ | owners | Used to grant/revoke; "View as" probes on manager@ and admin2 (audited) | Y — unchanged |
| Global flags | see pre-state | none changed | Y |
| `health/jobs` heartbeat | Trash cleanup "never" | my Pub/Sub trigger stamped a purgeExpiredTrash run | **N** — Overview now shows a Trash-cleanup run time instead of "never" |

## Coverage
| Admin function | Result | User-app effect verified | Mobile / keyboard |
|---|---|---|---|
| Manager first login with a fresh grant | Pass — no "denied" flash (DOM recorded frame by frame), manager notice, no Settings / Capture now | /app unaffected | — |
| Owner-only callables from p01's page (listAdmins, getAdminConfig, viewUserAsAdmin, deleteUser, setManagerRole, unlockSettings, captureStatsSnapshot) + manager@ (saveConfig, setSettingsPassword, requestSettingsPwReset) | Pass — all 403 "Owners only" | n/a | — |
| p01 on itself (tier, limits, trash, suspend, sign-out) / on owner / on peer manager | Pass — all refused with clear messages | — | — |
| Exclusion of p01 (Users list, Overview totals, getStats, CSV, duplicate emails, portfolios) | Pass; COINS TRACKED still counts admins (repeat S07-01) | — | — |
| p01 user app while manager (Portfolio, Journal write, Learn, Account) | Pass — works, no admin UI or admin resources in the user bundle | Y | — |
| Manager tier change (single, rapid double, bulk) | Pass; S06-06 / S01-10 / S06-10 repeats | Y (p03 own token) | — |
| Two admins in one browser | Sign-out / sign-in in one tab follows in the other within <1 s in normal timing; **S09-09** when the session switches without a sign-out in between | /app untouched (isolated auth) ✓ | — |
| Revoke p01 (Settings → Admin access) | Works, **S09-02** (one click, grant form shown after), **S09-01** (roster stale) | Y — p01 /app keeps working; claims gone after refresh | Keyboard: Enter revokes; focus lost, no live region |
| Stale p01 / qa-adm-06 admin tab after revoke | **Fail — repeat S07-04** (writes succeed after revoke, in the real UI and with the raw token); **S09-07** once the token refreshes | Y | — |
| p01 back in Users list / counts | Users list Pass (live); Overview needs reload (repeat S06-07) | — | — |
| Audit rows for grant/revoke | Pass ("Granted/Revoked manager role", diffs); no-op `(none)→(none)` on races | — | — |
| Grant edge cases: trashed (**S09-04**), suspended (**S09-06**), paying Pro (**S09-05**), unverified/brand-new (**S09-08**), owner/self/unknown/invalid email (Pass) | see findings | Y (qa-adm-11 /app ran as a manager) | 375 px Admin access: no overflow |
| Trash purge of an admin account (scheduled job) | **S09-04** — erased a manager | Y (restore screen → "window has passed") | — |
| Delete now (GDPR) of an ex-manager throwaway | Pass server-side; S08-01 repeat in the user tab | Y | — |
| Reload / Escape mid grant-warning | Reload: nothing granted ✓; Escape ignored (inline) | — | — |
| exportMyData as a current manager | Pass — no admin fields | — | — |
| Owner step-up (10-min window) on grant / revoke | Prompt appears ✓, but **S09-11** — its button is stuck on "Checking…"; only re-login recovers | — | — |
| User detail of an account that became admin (stale list) | Suspend/Delete hidden + 🔒 notice ✓; **S09-10** tier + sign-out still offered | — | — |
| manager@ and p01 in /app as admins | No admin wording or resources | Y | — |

Mobile note: the extension can't resize the window; 375 px was approximated by setting `body` width to 375 px (the app has no `@media`, so container layout is what matters). No horizontal overflow on Users detail or Admin access.

## Findings
### S09-04 · Medium · An owner can grant manager to an account that is in the Trash; it becomes a working admin that is invisible in Users AND Trash, and the daily purge then hard-deletes it without an audit entry
- **Steps to reproduce:** (1) Owner → Users → a user → Delete account → type DELETE → Move to trash. (2) Settings → Admin access → search that email → re-type → Continue → Confirm — grant manager. (3) Sign in as that account at /admin. (4) Trash tab → Refresh. (5) Let the 30-day window pass (I back-dated `deletedAt` on a throwaway and fired `purgeExpiredTrash` via the Pub/Sub emulator).
- **Expected:** the grant is refused ("restore the account first"), or at least the card says the account is in the Trash; an admin is never silently purged.
- **Actual:** the grant succeeds (qa-adm-06 via callable, qa-adm-05 via the UI, qa-adm-12). The account works as a manager (`listUsers` / `getStats` 200) while `users/{uid}.deleted == true`. It is missing from the Users list (admins are excluded) AND from the Trash tab ("Trash is empty"); the roster shows a plain "MANAGER". The purge erased qa-adm-12's Auth record, still holding `{admin:true, role:"manager"}`, and its data within 6 s. No audit row records the purge. Reproduced 3x (grant), 1x (purge).
- **Effect on user accounts / user app:** the team can lose a manager account with no warning or trace. The user app shows that account its "scheduled for deletion" screen, then "the 30-day window … has passed".
- **Repeat / new:** New (new path into the same end state as S05-04, a manager self-delete).
- **Suggested fix:** `functions/index.js` `setManagerRole` (~l.1221): read `users/{uid}` and refuse when `deleted === true` (also `userRecord.disabled`, see S09-06). `purgeExpiredTrash` (~l.3230): skip any uid whose Auth `customClaims.admin === true` and write an audit row per purge. Show "In trash" / "Suspended" in the Admin access card (`src/components/admin-dashboard.jsx` ~l.1540).

### S09-08 · Medium · Manager access can be granted to an account whose email was never verified, and the grant card shows no verification state
- **Steps to reproduce:** register a new account in /app (don't verify the email) → owner → Settings → Admin access → search it → re-type → Continue → Confirm.
- **Expected:** admin roles require a verified email, so someone who registered an address they don't own can't receive an admin role meant for the real owner of that address. At minimum, the card and the warning say "Email not verified".
- **Actual:** accepted for every account tried, all `emailVerified:false`: p01 (founder grant), qa-adm-05, qa-adm-06 and qa-adm-11 (2 minutes old). The card shows only name and email. The same p01 sees "Verify your email to secure your account" in /app. Reproduced 4x.
- **Effect on user accounts / user app:** anyone can register `someone@company.com` without owning it (signups are open, and verification is optional). If an owner later grants "the new manager's email", the impostor's account gets the read-everything / suspend / trash powers.
- **Repeat / new:** New.
- **Suggested fix:** `functions/index.js` `setManagerRole`: refuse when `!userRecord.emailVerified` (with an emulator/dev override). Return `emailVerified` + `creationTime` from `lookupUser` and render "Verified / Not verified · joined N min ago" in the Admin access card.

### S09-09 · Medium · The admin dashboard is not tied to the live session: when the shared admin session switches to another admin without a sign-out in between, open tabs keep the previous admin's email, role and tabs, while actions run (and are audited) as the new admin
- **Steps to reproduce:** (a) Natural: two /admin tabs in one browser. In tab 1, Log out of manager qa-adm-06 and sign in as owner admin@ about 1.5 s later. Tab 2 kept "qa-adm-06@test.com · Signed in as a manager" (no Settings tab), but its `adminAuth.currentUser` was admin@ with role owner. (b) Deterministic: with both tabs open, sign the shared admin auth into another admin without signing out first (`adminLogin()` from the page, which is what a tab sees when cross-tab sync merges a logout+login). Then use either tab.
- **Expected:** every tab re-renders (or reloads) for the new identity, or signs out, whenever the uid changes.
- **Actual:** both tabs kept the old header, footer, role notice and tab set. (1) Owner UI over a manager session: tier change PRO→STARTER on qa-adm-05 → "Tier updated ✓", audited as `setUserTier by manager@test.com`; Settings opened with blank "Not set" values and no error. (2) Manager UI over an owner session: the same change was audited as `by admin@test.com`. Reproduced 4x (2 natural, one of them with real keystrokes through the sign-in form at 17:50, and 2 deterministic). The same Log out → Sign in sequence was followed correctly in 4 other attempts, so the natural trigger is intermittent (most likely a background tab missing the brief signed-out state).
- **Effect on user accounts / user app:** on a shared computer, actions get done and logged under a different admin than the screen shows. An owner's power can sit behind a manager-looking screen. No user-app effect.
- **Repeat / new:** New (s08 saw only the normal cross-tab following).
- **Suggested fix:** `src/admin-main.jsx` (~l.49–103): keep the signed-in user in state and render `<AdminDashboard key={user.uid} email={user.email} ...>`, so a uid change remounts the dashboard (its role is resolved once at mount in `src/hooks/useAdminDashboard.js` ~l.435). Set phase to "loading" before re-checking claims on every auth change.

### S09-11 · Medium · After 10 minutes signed in, an owner can't grant OR revoke a manager: the "Confirm your password" prompt's button is stuck on a disabled "Checking…"
- **Steps to reproduce:** sign in as an owner → wait more than 10 minutes (the step-up window) → Settings → Admin access → search a manager → "Remove manager access" (or, for a non-admin: re-type → Continue → Confirm — grant manager).
- **Expected:** the password prompt accepts the owner password, then the grant/revoke runs.
- **Actual:** the prompt opens with its submit button already disabled and labelled "Checking…". Typing the password and pressing Enter does nothing; only Cancel/× work. Reloading and opening Settings doesn't help, because the config loads without prompting, so there is no other way to refresh the step-up. Only Log out → Sign in, then retrying within 10 minutes, works. Reproduced 3x (grant 18:02, revoke 18:03, revoke 18:19 with the password filled in: still disabled).
- **Effect on user accounts / user app:** in an incident (revoking a compromised manager), the owner hits a dead control and has to work out that a full re-login is needed. Combined with S07-04, this delays cutting a manager off even further.
- **Repeat / new:** New.
- **Suggested fix:** `src/hooks/useAdminDashboard.js` `setManager` (~l.593–604): call `setBusy(true)` only after `withUnlock` resolves, or give the unlock modal its own `unlockBusy` state instead of the shared `busy` (`src/components/admin-dashboard.jsx` ~l.1712 `disabled={busy || !unlockPass}`). By code reading, `saveSettingsPassword` (~l.266) has the same pattern, so changing the Settings password would hit the same dead prompt (not exercised in the UI).

### Repeat of S07-04 · Medium · A revoked manager keeps full admin power until its ID token expires, now proven on the revoke path and in the real UI
- **Steps to reproduce:** manager signed into /admin → owner → Admin access → Remove manager access → manager keeps using the open panel.
- **Actual:** with p01's pre-revoke token, `listUsers` returned 200 and `setUserTier(qa-adm-05)` pro/free returned 200 at +30–36 s; both are audited "by p01.trader@test.com" after "revokeManager". In qa-adm-06's own real /admin tab, I opened a user and changed PRO→STARTER at +16–19 s ("Tier updated ✓"). p01's /app token (claims cached) still read p02's coins over Firestore REST (200) until a refresh, then got 403. Owners can't cut the session short: `adminSignOutUser` on any admin is refused ("remove their admin role first"). The grant warning says "You can remove this at any time", which overstates it. The `setManagerRole` code comment says `revokeRefreshTokens` makes the change take effect without waiting about an hour; that is not true for callables or Firestore rules. Reproduced 3x.
- **Effect on user accounts / user app:** a just-removed manager can still change tiers, suspend, trash and read every user's portfolios for up to about an hour.
- **Suggested fix:** as S07-04: `verifyIdToken(token, true)` (checkRevoked) in `assertRole`, an `auth_time` vs revocation check in the rules' `isAdmin()`, and allow owners to sign out a manager.

### S09-01 · Low · Admin access roster does not refresh after a grant or a revoke (founder's lead confirmed)
- **Steps to reproduce:** Owner → Settings → Admin access → search → grant, or "Remove manager access".
- **Expected:** the ADMINS roster at the top updates.
- **Actual:** after revoking p01 the roster still listed "p01.trader@test.com · MANAGER". After granting qa-adm-05 / qa-adm-06 they were missing from it. Leaving and re-opening the drill-in (or reloading) fixes it. Reproduced 4x (p01 revoke, qa-adm-05 grant + revoke, qa-adm-06 grant).
- **Effect on user accounts / user app:** admin-only. The owner can't confirm the change on the same screen and may repeat it (a repeat writes a no-op audit row, see S09-02).
- **Repeat / new:** New (confirms the founder's lead).
- **Suggested fix:** `src/hooks/useAdminDashboard.js` `setManager` (~l.593): call `loadAdmins()` after a successful `setManagerRole`.

### S09-02 · Low · "Remove manager access" revokes on a single click or keypress with no confirmation, then shows the GRANT form for the same person
- **Steps to reproduce:** Admin access → search a manager → click (or Tab + Enter on) "Remove manager access".
- **Expected:** a confirm step like the grant has (or at least an undo). Afterwards, a clear "Not an admin" state.
- **Actual:** within the owner's 10-minute step-up window, the revoke fires immediately (Auth `validSince` = click time). Outside it, a password prompt appears (but see S09-11). The card then renders "Re-type ... to confirm / Continue" (the grant flow) above "Manager access removed ✓", which reads as if the removal still needs confirming; typing + Continue + Confirm would re-grant. Focus drops to `<body>`. The status text is not in a live region, and the re-type input has no associated label. Reproduced 5x (p01, qa-adm-05, qa-adm-06 x2 incl. keyboard-only, qa-adm-11). With two owners racing, a stale card's "Remove" on an already-revoked account says "removed ✓" and audits `role: (none)→(none)`.
- **Effect on user accounts / user app:** admin-only. A one-keystroke revoke of a colleague mid-task, plus a confusing follow-up screen.
- **Repeat / new:** New (the no-op audit row is the same class as S01-18).
- **Suggested fix:** `src/components/admin-dashboard.jsx` ~l.1556: add an inline "Remove manager access from X? [Cancel] [Remove]" step. After success, show a neutral "Not an admin" card with the grant flow collapsed. Put `grantMsg` in `role="status"`. `functions/index.js` `setManagerRole`: return early (no audit, no token revoke) when the role is already in the requested state.

### S09-05 · Low · Promoting a paying user to manager removes them from the PRO/PREMIUM counts and from Est. Monthly Revenue
- **Steps to reproduce:** set a user to Pro → note the Overview → grant manager → reload Overview.
- **Expected:** revenue reflects paying accounts whatever their admin role (or the card says admins are excluded).
- **Actual:** qa-adm-06 Pro: "15 TOTAL · $67 · 2 Pro x $9.99" → after the grant "14 TOTAL · $58 · 1 Pro" (and back after the revoke). While admin, its tier can't be changed ("remove their admin role first") and it is in no Users list, so its billing is visible nowhere. The daily `statsDaily` snapshot would record the lower figure. Reproduced 2x via `getStats` + 1x in the UI.
- **Effect on user accounts / user app:** admin-only (understated revenue; a paying admin's subscription is invisible).
- **Repeat / new:** New.
- **Suggested fix:** `functions/index.js` `gatherStats` (~l.1064): keep admins out of the user counts but add their paid tiers to the revenue figures, or label the card "excludes admin accounts".

### S09-06 · Low · A suspended account can be granted manager, and then can't be un-suspended ("Can't suspend an admin account")
- **Steps to reproduce:** suspend a user → grant manager → try Un-suspend.
- **Expected:** the grant is refused for a disabled account, or un-suspending an admin is allowed (it only restores access).
- **Actual:** the grant succeeds (roster "SUSPENDED · MANAGER"). `suspendUser(uid, false)` → "Can't suspend an admin account — remove their admin role first. [400]". The verb is wrong, and the only way back is revoke → un-suspend → re-grant. Reproduced 2x on qa-adm-06.
- **Effect on user accounts / user app:** admin-only.
- **Repeat / new:** New.
- **Suggested fix:** `functions/index.js` `setManagerRole`: refuse when `userRecord.disabled`. `suspendUser` (~l.1398): apply the admin-target guard only when `disabled === true`, and fix the message.

### S09-07 · Low · A revoked admin's open panel doesn't notice it lost access: it keeps "Signed in as a manager" and shows "0 users" with a raw "Admins only. [403]"
- **Steps to reproduce:** manager's /admin open → owner revokes → once the manager's token refreshes, use the open panel (Users → Refresh, Audit, click a row).
- **Expected:** the panel switches to the "This account isn't an admin" screen (or signs out) on the first permission-denied.
- **Actual:** header and footer still say manager. Users shows "Admins only. [403]" (twice in one run), "0 users", "No users found.". Audit shows "Admins only. [403]" and "0 entries". A row click silently does nothing. Only a reload shows the denied screen. Reproduced 2x (qa-adm-06).
- **Effect on user accounts / user app:** admin-only. "0 users" reads like data loss.
- **Repeat / new:** New (the window before the token refresh is S07-04).
- **Suggested fix:** `src/hooks/useAdminDashboard.js`: on any `permission-denied` from an admin callable, re-run `getAdminRole({force:true})` and route to the denied phase in `src/admin-main.jsx` when it returns "".

### S09-10 · Low · The user detail of an account that is now an admin still offers tier buttons and "Sign out all devices", which always fail with raw "[400]" errors
- **Steps to reproduce:** owner has Users open → another owner grants one listed user manager → open that user from the (stale) list → click PRO / PREMIUM or "Sign out all devices".
- **Expected:** the detail treats the admin as read-only, as its own notice says ("can't be suspended, trashed, deleted or demoted"): tier and sign-out controls hidden or disabled. Or the list refreshes and the admin disappears.
- **Actual:** Suspend/Delete are hidden and the 🔒 notice is shown, but CHANGE TIER and "Sign out all devices" are live and fail with "Can't change the tier of an admin account — remove their admin role first. [400]" and "Can't sign out an admin account — remove their admin role first. [400]". Reproduced 2x on qa-adm-06.
- **Effect on user accounts / user app:** admin-only (dead-end controls, raw error codes).
- **Repeat / new:** New (follows the ADMIN-SEP Part A1 backstop, which hid only Suspend/Delete).
- **Suggested fix:** `src/components/admin-dashboard.jsx` user-detail: gate the tier buttons, custom limits and "Sign out all devices" on `!found.isAdmin`, like Suspend/Delete. Drop the row from the stale list when `lookupUser` returns `isAdmin`.

### Observation (not counted, emulator can't reproduce) · granting or revoking a manager also signs that person out of the USER app
`setManagerRole` calls `auth.revokeRefreshTokens(uid)` on **both** grant and revoke (`functions/index.js` ~l.1249). The user app shares that Auth user, so in production p01 would most likely be signed out of /app on every device at the next token refresh (~1 h), with no explanation. The Auth emulator let p01's /app refresh succeed after the revoke (claims gone, session kept), so I could not reproduce this. Please verify on a real project. If confirmed: tell the user, or skip the revoke on grant.

## Data-leak and backend checks
| Check | Result |
|---|---|
| User bundle loads any `admin` resource while p01 is a manager | None (0 `admin` resources in /app) ✓ |
| /app Account / Journal / Learn show role or admin data | No ✓ |
| exportMyData of a current manager | exportedAt/account/profile/portfolios only, no role/claims/note ✓ |
| p01 manager user-app token → another user's coins (Firestore REST) | **200** — repeat S05-09, reachable from the plain user-app login |
| Same token after revoke, before refresh | **200** (repeat S07-04); after refresh **403** ✓, own data 200 ✓ |
| Owner-only callables from a manager (10 tried) | 403 "Owners only" ✓ |
| Manager on self / owner / peer manager | refused (400/403) ✓ |
| listUsers / getStats / findDuplicateEmails / CSV exclude admins | ✓ (14 users while p01 manager, 15 after revoke) |
| COINS TRACKED excludes admins | No — repeat S07-01 |
| Revoked token on callables | Accepted — repeat S07-04 (3x) |
| p01 at /admin after revoke | "This account isn't an admin" with no dashboard flash ✓ |
| Audit rows for grant / revoke | Present with correct actor, target email and diff ✓; refusals not logged (S05-05); no row for the purge of an admin (S09-04) |
| Purge sweep vs admin claim | Erases admin accounts (S09-04) |
| Console (admin + app tabs) | No app errors; only browser-extension noise |

## Known bugs re-checked
- **S07-04** (revoked admin token still works): repeat, now on the revoke path, in the real UI, 3x. The most important carry-over.
- **S05-09** (any admin claim reads all users' data over Firestore): repeat, from the plain user-app session.
- **S05-13** (admin sign-in form keeps the previous admin's email + password after logout): repeat 3x (p01 after the cross-tab logout and after the denied screen).
- **S06-06** (billing card stale after a tier change), **S06-07** (Overview counts stale until reload), **S06-10** (audit/Users can't link uid-only rows), **S06-12** (Users tab does nothing while a detail is open): all repeats. S06-12 caused a real wrong-target trash in this session (see the 17:24 timeline entry), so it is more than a nit.
- **S01-10** (bulk toasts use "pro"/"free"), **S01-16** (Escape ignored on inline confirms), **S01-18** (no-op mutations audited): repeats.
- **S07-01** (COINS TRACKED counts admins): repeat.
- **S08-01** (erased account's open tab still offers "30 days left to restore"): repeat (qa-adm-11).
- **S01-07** ("You deleted this account" shown for an admin trash): repeat (p01, accidental).
- **BUG-020** ("Live sync was interrupted" on signup): repeat 2x (qa-adm-11, qa-adm-12).
- **BUG-034** (deleted account's credentials stay in the form): repeat (qa-adm-11, auto sign-out path kept name, email, password and all three consents incl. marketing; an explicit Log out clears them).
- **BUG-005** (admin tab signs out user sessions): still fixed. Every admin identity switch left /app untouched.
- **BUG-039** (un-suspend INTERNAL): still fixed (un-suspend works for non-admins).

## What worked well
- The fresh manager claim works on first sign-in, with no "denied" flash. Manager UI hides everything owner-only, and every owner-only callable is refused server-side with a clear message.
- Self-protection is solid: a manager can't change, limit, suspend, sign out or trash itself, an owner, or a peer manager. Owners can't be revoked or re-granted by anyone.
- Grant flow: exact-email search with normalisation, re-type + warning + confirm, a busy guard (double-click = one grant), reload mid-flow grants nothing, and clean 400/404 messages.
- Admin exclusion from Users, counts, CSV and duplicates is consistent and updates live in an open Users list on grant/revoke.
- Admin and user auth are fully isolated: no admin identity switch ever touched /app, and the user app never loads admin code.
- Audit rows for grant/revoke carry the right actor, target and before→after role.

## Timeline
- 17:12 Health check OK (`/api/config` JSON, /admin 200). Report created.
- 17:13–15 Admin tab was already signed in as admin@ (owner) from an earlier run; baseline Overview: 14 users (12 Starter / 1 Pro / 1 Premium), 21 portfolios, 58 coins. Logged out.
- 17:13–15 p01 first admin login with a MutationObserver recording every DOM state: `Signing in…` → `Sign in` (one ~80 ms frame) → dashboard `Loading… 0 TOTAL` → `Live Data`. **No "denied" flash**; the fresh claim works on first login (no re-login needed). Manager notice shown; no Settings tab, no "Capture now". Footer "signed in as manager".
- 17:13–15 Owner-only callables from p01's page context (imported `/src/api/admin.js`): listAdmins, getAdminConfig, viewUserAsAdmin, deleteUser(qa-adm-05), setManagerRole, unlockSettings, captureStatsSnapshot → all `permission-denied "Owners only…" [403]`. Allowed reads (getSystemStatus, listDailyStats, lookupUser, getUserNote) OK.
- 17:13–15 p01 acting on ITSELF: setUserTier / setPremiumLimits / adminTrashUser → `failed-precondition "…admin account — remove their admin role first"`; suspendUser(self) → "You cannot suspend your own admin account". On owner admin@: setUserTier / adminSignOutUser → 403 "Owner accounts can only be managed by another owner". On peer manager@: setUserTier → failed-precondition. All correct.
- 17:13–15 Exclusion: listUsers = 14 (no p01/admin/manager), getStats.totalUsers 14, findDuplicateEmails 0 groups, totalPortfolios 21 = Σ listUsers portfolioCount (consistent). COINS TRACKED 58 still includes admins (repeat S07-01).
- 17:13–15 p01 user app (/app, separate tab): Portfolio, Journal, Learn, Account load normally; Account shows no admin anything; zero `admin` resources fetched by the user app. Journal write as an admin: added a thesis → saved (🟢 Intact) → deleted it again (restored). No console errors.
- 17:15 From the **user app** session (not the admin panel), p01's user-auth ID token carries `{admin:true, role:"manager"}` and a plain REST read of p02's `portfolios/default/coins` returns 200 with full coin docs — repeat of S05-09, now confirmed reachable from the ordinary user-app login (no admin panel needed).
- 17:15 Manager UI tier change p03 Starter→Pro→Starter: "Tier updated ✓", p03's own token reads `tier:"pro"` then `"free"`; billing card stayed "No active subscription (free tier)" (repeat S06-06). Rapid PRO→PREMIUM double click on p04: all tier buttons disable while the call is in flight → only one call, no race (pass); restored Starter.
- 17:16 Bulk set-tier as manager on qa-adm-05/06 → Pro → Starter: works, toast uses internal ids (repeat S01-10). Audit rows name target by uid only (repeat S06-10).
- 17:17 p01 logs out of /app → /admin tab stays signed in as p01 (isolation OK); /app login form is empty after logout (unlike admin, S05-13). p01 logs back into /app.
- 17:18 Captured p01's admin ID token (in-page variable only) to simulate a stale p01 admin tab, since the admin auth is shared per browser.
- 17:19 Two admins in one browser: opened a 2nd /admin tab → already p01 (shared admin auth). Logged out there → p01's first tab dropped to the sign-in screen instantly with p01's email + password still in the fields (repeat S05-13). Signed in admin@ in tab 2 → tab 1 re-rendered as admin@ (owner) within <1 s. So a "stale p01 admin tab" cannot exist in the same browser profile — it silently becomes the other admin's session.
- 17:20:04 Owner → Settings → Admin access → search p01 → **"Remove manager access" revoked p01 on the FIRST click** (no confirmation; Auth `customAttributes` `{}` and `validSince` 17:20:04). The panel then immediately rendered the GRANT flow ("Re-type p01.trader@test.com to confirm" + Continue) above the toast "Manager access removed ✓" → S09-02. The ADMINS roster still listed p01 as MANAGER → S09-01 (confirms the founder's lead, same cause for grant and revoke).
- 17:20:34–40 Stale p01 admin token (issued 17:13, before the revoke) → `listUsers` 200 (full user list), `setUserTier(qa-adm-05, pro)` 200, `setUserTier(qa-adm-05, free)` 200, `getUserNote(p02)` 200. Audit shows `setUserTier by p01.trader@test.com` 30 s AFTER `revokeManager` → repeat of S07-04, now proven on the revoke path.
- 17:20:45 p01's /app tab with its cached (pre-revoke) token: REST read of p02's coins → 200 (repeat S05-09 + S07-04). After a forced token refresh (`getIdToken(true)`) the claims are gone and the same read → 403; own coins 200; app keeps working, no sign-out. Note: the Auth emulator let the refresh succeed even though `setManagerRole` calls `revokeRefreshTokens` — in production p01 would most likely be signed out of the USER app on every device at the next token refresh (~1 h) — see S09-03.
- 17:21 Owner Users tab: 15 users incl. p01 (back in the list) ✓. Overview TOTAL still 14 until reload (repeat S06-07). Audit: `revokeManager · admin@test.com → p01.trader@test.com · role: manager→(none)` ✓; earlier founder grant row `grantManager … role: (none)→manager` at 17:11:52 ✓.
- 17:22 Repro #2 of S09-01/S09-02 on throwaway qa-adm-05: grant via UI (re-type + ⚠ warning + Confirm) → "Manager access granted ✓", roster NOT updated; "Remove manager access" → revoked on first click, grant form re-appears. Re-opening the Admin access drill-in refreshes the roster.
- 17:23 Tab 1 reloaded → Overview TOTAL 15 (p01 counted again) ✓. p01 tries /admin sign-in → "This account isn't an admin…" (no dashboard flash) ✓; its form keeps p01's credentials after "Sign out" (repeat S05-13).
- 17:23 Owner → p01 user detail: normal user (tier buttons, Suspend, View as, Delete) ✓.
- 17:23–17:26 **S09-04**: owner granted manager to a TRASHED throwaway (qa-adm-06 via callable, qa-adm-05 via the UI grant flow). Accepted both times; the account then works as a manager (`listUsers` / `getStats` 200 with its own token) while `users/{uid}.deleted == true`; it vanishes from Users and from the Trash tab ("Trash is empty"), and the roster shows a plain MANAGER. Cleaned up: both revoked + restored (deleted:false, Starter, no claims).
- 17:24 **Tester incident (restored):** while scripting repro #2, clicking the "Users" tab with p01's detail open did nothing (repeat S06-12), so my next "Delete account → DELETE → Move to trash" landed on **p01** instead of qa-adm-05. p01's /app tab flipped live to "Your account is scheduled for deletion — You deleted this account" (repeat S01-07). Restored with `restoreUser` 40 s later; p01's /app flipped back to the portfolio live; listUsers shows deleted:false, Starter, no role. Audit records `adminTrashUser → p01` + `restoreUser`. This shows S06-12 is a real wrong-target hazard, not just a nit.
- 17:26 **S09-05**: promoting a paying (Pro) account to manager removes it from PRO count and Est. Monthly Revenue (qa-adm-06 set Pro: gross $69.97 / 2 Pro → grant: $59.98 / 1 Pro → revoke: $69.97 → grant: $59.98). While admin its tier can't be changed ("remove their admin role first") and it is in no Users list, so its billing is visible nowhere. Reproduced 2x; qa-adm-06 restored to Starter, no role.
- 17:27 **S09-06**: granting manager to a SUSPENDED account is accepted (roster shows "SUSPENDED · MANAGER"), but then "Un-suspend" is refused with "Can't **suspend** an admin account — remove their admin role first" — the account can only be un-suspended by revoking first. Reproduced 2x on qa-adm-06; restored (active, no role).
- 17:27 Grant while the target sits on the /admin "This account isn't an admin" screen (qa-adm-06): the screen does not pick up the new claim (stays denied ≥8 s; its copy tells the user to sign out and back in — acceptable). Reload → sign-in screen; sign in → manager dashboard ✓ (no denied flash).
- 17:27:34 / 17:29:24 **Real stale manager tab (qa-adm-06, own /admin tab, not a hand-crafted token):** owner revokes (callable). Run 2: 10–20 s later the still-open panel opens a user detail and clicks PRO → "Tier updated ✓", STARTER → "Tier updated ✓" (token iat unchanged, role still "manager" in the cached token) — the revoked manager kept full write power in the real UI → repeat of S07-04 (2nd + 3rd repro incl. raw-token run). Run 1: the panel's calls started failing ~20 s after revoke (likely a token refresh in the shared admin auth).
- 17:28 / 17:30 **S09-07**: once the token refreshes, the open panel does NOT notice it is no longer an admin: header still "Signed in as a manager … signed in as manager", Users shows "Admins only. [403]" (twice in run 1) + "0 users" + "No users found.", Audit "Admins only. [403]" + "0 entries", and a row click silently does nothing (run 1). Only a reload shows the "This account isn't an admin" screen. Reproduced 2x.
- 17:30 Admin access search edge cases (owner): `"  P01.TRADER@TEST.COM "` → normalised, found ✓; admin@ → "🔒 Owner accounts are protected" ✓; unknown → "No user with that email. [404]" ✓; `not-an-email` → "Enter a valid email. [400]" ✓. Enter in the search box searches ✓; Enter in the "Re-type … to confirm" box does nothing (same pattern as S08-03). 375 px (body-width emulation): Admin access drill-in + roster have no horizontal overflow.
- 17:31 p01 /app after revoke: Journal thesis add → save → delete works (left as before). Console: only browser-extension noise.
- 17:31 Audit filter lists "Revoked manager role" ✓; rows "Revoked manager role by admin@ → qa-adm-06 · role: manager→(none)" ✓. Owner self-revoke / revoke admin2 / re-grant admin2 via callable → all "Owner accounts are protected" ✓. A callable re-grant of an existing manager (`MANAGER@TEST.COM`, upper case) is accepted as a no-op but still audited (`role: manager→manager`) and revokes manager@'s refresh tokens (forces re-login) — the UI never offers this (it shows "Remove" for managers), so noted only.
- 17:32 Grant/revoke vs an open owner Users list: granting qa-adm-06 drops it from the list (15→14) live, revoking brings it back (14→15) live ✓. Third repro of S09-02 (one-click revoke, grant form shown after). Re-entering the Admin access drill-in keeps the previous search result + old toast ("Manager access granted ✓") — nit.
- 17:33 Manager@ token → saveConfig / setSettingsPassword / requestSettingsPwReset / captureStatsSnapshot / listAdmins → all 403 "Owners only" ✓.
- 17:33 **S09-08**: every account granted manager in this run had `emailVerified:false` (p01 by the founder, qa-adm-05 ×2, qa-adm-06 ×4 by me) and the grant was accepted each time; the Admin access card never shows verification state, while the same p01 sees "📧 Verify your email to secure your account" in /app.
- 17:35 Escape on the inline "⚠ Grant manager access?" warning does nothing (inline, not a dialog; same pattern as S01-16). Reload while the warning is open → back to Overview, nothing granted (p02 has no claims) ✓.
- 17:36 Two owners racing (admin@ in the UI, admin2@ via callable): admin@ grants qa-adm-06 → admin2@ revokes → admin@'s still-open card says MANAGER; clicking "Remove manager access" succeeds with "Manager access removed ✓" and writes a no-op audit row `revokeManager · role: (none)→(none)` (same class as S01-18's `pro→pro` stale-tab rows). qa-adm-06 ends with no role.
- 17:35 exportMyData as a CURRENT manager (qa-adm-06 granted, own token): keys exportedAt/account/profile/portfolios — no role, claims or admin note in the export ✓ (revoked afterwards).
- 17:36 Lifecycle on a fresh throwaway: registered **qa-adm-11@test.com** in /app (BUG-020 "Live sync was interrupted" banner on signup — repeat). 2 minutes later the owner granted it manager through the UI — the card/warning show no account age or "email not verified" signal (S09-08, repro on a brand-new account). Its /app kept working as a manager. Then UI revoke (one click, S09-02) → trash → Trash "Delete now" (typed DELETE) → "Permanently deleted ✓"; Auth record gone (18 accounts). Its still-open /app tab kept showing "30 days left to restore it" after the permanent erase (repeat S08-01).
- 17:38 Audit/Users CSV builders (run in-page, no download): Users CSV = header + 15 rows, no admin; Audit CSV has the grant/revoke rows (raw action ids `grantManager`/`revokeManager`).
- 17:39 **S09-09 (natural occurrence):** the 2nd admin tab (opened 17:19) was found showing **"qa-adm-06@test.com · Signed in as a manager"** (manager tabs, no Settings) while its live admin session (`adminAuth.currentUser`) was **admin@test.com with role owner** — tab 1 had gone qa-adm-06 → Log out → admin@ sign-in ~1.5 s apart at ~17:30, and tab 2 never re-rendered.
- 17:40 S09-09 deterministic repro: with both tabs on admin@ (owner UI), a sign-in to manager@ on the shared admin auth without an intervening sign-out (`adminLogin` from page context — the same thing tab 2 sees when cross-tab sync collapses logout+login) leaves BOTH tabs showing "admin@test.com … signed in as owner" with the Settings tab. In tab 2 I changed qa-adm-05 PRO → STARTER from that owner-looking UI: "Tier updated ✓" and the audit says **`setUserTier by manager@test.com`**. Settings opened showing blank/"Not set" values with no error. Restored both tabs to a real admin@ session by sign-out → sign-in → reload. (A normal "Log out → type → Sign in" with a ≥1.5 s gap was followed correctly 2/2 times.)
- 17:41 S09-09 repro #2 (opposite direction): both tabs on manager@ (manager UI) → shared session switched to admin@ without a sign-out in between → both tabs still read "manager@test.com … signed in as manager", and a PRO → STARTER change on qa-adm-05 from that UI is audited as **`setUserTier by admin@test.com`** (owner). A fast (0.3 s) Log out → Sign in in tab 1 was followed correctly by tab 2 in this attempt, so the natural trigger is timing-dependent. Both tabs reloaded → admin@ owner, consistent. qa-adm-05 back to Starter.
- 17:42 Audit search: "p01.trader" → 13 rows but misses the 6 uid-only rows targeting p01 (repeat S06-10).
- 17:42 /app tab of the erased qa-adm-11 signed itself out to the Register form, which still holds the name, email, password and all three consents (incl. the optional marketing opt-in) — repeat of BUG-034 (one click re-creates the erased account).
- 17:42 p01's `users/{uid}` (read as p01): no admin fields; `deleted:false, deletedAt:null` were added by the accidental trash+restore (harmless).
- 17:42 Keyboard-only revoke (qa-adm-06 granted via callable first): type email → Enter → Tab ×2 → focus on "Remove manager access" → **Enter revokes immediately** (4th repro of S09-02); focus then drops to `<body>`, and the "Manager access removed ✓" text is not in a live region (no role/aria-live), so a screen-reader user hears nothing. The re-type input and search input have no associated label. qa-adm-06 ends with no claims.
- 17:42 Manager@ token: `adminSignOutUser(self)` → "Can't sign out an admin account — remove their admin role first"; on owner admin2 → 403. Combined with S07-04 this means an owner has **no way to cut a compromised manager's live session short**: revoking leaves the ID token valid (~1 h) and sign-out is refused for admins.
- 17:43 Overview: the three "Refresh" buttons run without error; TOTAL 15, revenue $58 (consistent). Owner "View as" p01 (reason given): role "" ✓. Owner "View as" also works on manager@ and on owner admin2 (audited) — noted only.
- 17:43 Double-click on "Confirm — grant manager" (qa-adm-06): exactly one `grantManager` call/audit row ✓ (busy guard). Revoked again via callable.
- 17:45 S09-05 seen in the Overview UI after reloads: qa-adm-06 Pro → "15 TOTAL · Est. Monthly Revenue $67 · 2 Pro × $9.99"; grant manager → "14 TOTAL · $58 · 1 Pro". Revoked + back to Starter.
- 17:45 **S09-04 consequence proven:** registered throwaway **qa-adm-12@test.com** (BUG-020 banner again), owner trashed it and then granted it manager (both accepted). Confirmed it was the ONLY `deleted==true` user, back-dated its `deletedAt` 31 days via the Firestore emulator REST, and fired the `purgeExpiredTrash` schedule through the Pub/Sub emulator (17:45:31). By 17:45:37 the Auth record **holding `{admin:true, role:"manager"}`** and its `users/{uid}` tree were erased. No audit entry records that an admin account was purged (last rows: adminTrashUser, grantManager). Side effect: the Overview "Trash cleanup" heartbeat now shows a run instead of "never" (health/jobs written by my manual trigger).
- 17:50 **S09-09 natural repro #2 with real UI input:** tab 1 (admin@ owner) → click "Log out" → type manager@ / password with real keystrokes → Enter (~3 s). Tab 2 stayed "admin@test.com … signed in as owner" with the Settings tab, while its live session was manager@ (`claims.admin=true, role=manager`). In tab 2, Settings → Admin access then showed "Owners only. Your admin account doesn't have owner access. [403]" inside the owner UI. Tab 2 reloaded afterwards.
- 17:51 Reverse natural attempt (manager → owner with real keystrokes): tab 2 followed correctly this time (intermittent, as noted in S09-09).
- 17:52 **S09-10**: owner admin@'s Users list loaded; admin2@ (via callable) grants qa-adm-06 manager; admin@ opens qa-adm-06 from the still-listed row. The detail correctly shows "MANAGER" and "🔒 This is an admin account — protected … can't be suspended, trashed, deleted or demoted" and hides Suspend/Delete, but still offers CHANGE TIER (STARTER/PRO/PREMIUM) and "Sign out all devices", which fail with raw "[400]" errors ("Can't change the tier of an admin account…", "Can't sign out an admin account…"). Reproduced 2x (PRO; Sign out + PREMIUM). qa-adm-06 revoked again.
- 17:53 Overview jobs strip after my purge trigger: headline still "Scheduled jobs: never run" while the Trash cleanup row says "6m ago" (the headline reflects the other 5 jobs; noted only).
- 17:54 Control check for S09-09 on the USER app: two /app tabs, p01 → Log out → p02 signed in with real keystrokes in tab 2; tab 1 switched to p02's data (avatar, value) within ~3 s. The user app follows identity changes, the admin app doesn't (S09-09 is admin-specific).
- 18:02 Step-up check: owner signed in at 17:51; at 18:02 a UI grant (qa-adm-06) → "Confirm — grant manager" raised "Confirm your password — Settings, API keys, plans and admin access need a recent password confirmation" (an inline panel, not a dialog). Cancel → nothing granted (qa-adm-06 has no claims) ✓. The step-up gate works as designed.
- 18:03 **S09-11**: revoke qa-adm-06 (granted via callable) from the same >10-min-old owner session → "Confirm your password" appears, but its submit button is **disabled and reads "Checking…" before anything is typed**; typing the password and pressing Enter does nothing. The 18:02 grant prompt was in the same state (I had only cancelled it). Root cause: `setManager` sets the shared `busy` flag before `withUnlock`, and the modal's Unlock button is `disabled={busy || !unlockPass}`. Reloading and opening Settings doesn't help, because `getAdminConfig` loads without prompting, so there is no other way to refresh the step-up. Only **Log out → Sign in** unblocked it; the revoke then went through in one click. Reproduced 2x (grant, revoke). Final: only admin@/admin2@ (owner) and manager@ (manager) hold claims.
- 18:05 manager@ in /app (user app): normal Starter portfolio, no admin wording, 0 admin resources loaded ✓. Logged out.
- 18:14 Re-check of S09-11 at ~10.5 min after the 18:03 re-login: the revoke went through with no prompt (borderline timing, so not counted either way). qa-adm-06 re-granted via callable for a clean repro at >15 min.
- 18:19 S09-11 repro #3: 15 min after the re-login, "Remove manager access" on qa-adm-06 → prompt with the Owner password filled in, button still "Checking…" and disabled. Cancelled; qa-adm-06 revoked via the owner callable instead.
- 18:19 Final state check (Auth `accounts:query` + `listUsers` + `/api/config`): 18 accounts; claims only on admin@ / admin2@ (owner) and manager@ (manager). **p01 = normal user (no claims), Starter, active, not deleted.** p07 Premium, pro@ Pro, every other user Starter, none suspended or trashed. Flags unchanged (maintenance false, signups true, paidPlans false, marketData on, checkout off, aiResearch off).
- 18:19 Fresh p01 token (REST sign-in): listUsers / getStats / lookupUser → 403 "Admins only."; p02 coins 403; own coins 200 ✓. Health: /admin 200, /api/config JSON.
- 18:21 Closed all my tabs (2 × /admin, 1 × /app); the /app session was already logged out. Report finalised.
