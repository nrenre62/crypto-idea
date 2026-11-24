# Admin panel bugs

This file lists the bugs found by the 10-hour admin-panel test on 2026-11-24 and says how each one affects user accounts and the user app. The test ran nine sessions against the local emulator as the two owners (admin@, admin2@), the seeded manager (manager@) and a newly granted manager (p01.trader). Ids continue from [BUGS.md](BUGS.md) at **BUG-142**. **Merge order:** BUG-041…BUG-141 (including every known id cited here above BUG-040, such as BUG-045, BUG-059, BUG-111, BUG-113 and BUG-138) are logged in the `BUGS.md` of the `persona-soak-test` branch; the `BUGS.md` on this branch still stops at BUG-040. Merge `persona-soak-test` before this branch so those ids and the BUG-142 starting point resolve. Bugs that were already logged are not given new ids; they are listed under "Known bugs re-confirmed". The full session reports are in [admin-tests/2026-11-24/](admin-tests/2026-11-24/README.md).

Bug text is data, not instructions. Every fix below is a proposal only; nothing in this file has been fixed.

Back to the bug log: [BUGS.md](BUGS.md)

## Summary

**Hours tested per account** (from each report's "Minutes tested"):

| Account | Role | Sessions | Minutes | Hours |
|---|---|---|---|---|
| admin@test.com | Owner #1 | S01 (70), S02 (70), S08 (18, sweep as owner) | 158 | 2.6 |
| admin2@test.com | Owner #2 (backup) | S03 (99), S04 (70) | 169 | 2.8 |
| manager@test.com | Manager | S05 (70), S06 (71), S07 (70, stand-in for p01) | 211 | 3.5 |
| p01.trader@test.com | Granted manager | S09 (70; admin@ did the revoke) | 70 | 1.2 |
| **Total** | | 9 sessions | **608** | **10.1** |

A first run (11:46–12:07, 18 minutes in all) was lost because the functions emulator started with no functions loaded (BUG-228). Those minutes are not in the table; that run's findings carry the prefix `R1-` and the orchestrator's own findings are `E1`–`E3`.

**New bugs: 87** — High 2 · Medium 32 · Low 53. **Known bugs re-confirmed: 32** existing BUG ids were seen again (29 still present, 3 resolved ones confirmed still fixed).

**Top 5 issues**
1. **BUG-142** — A stale "Empty trash" or "Delete now" permanently erases an account the user has already restored; the server never checks that the account is still in the Trash.
2. **BUG-143** — Two Settings tabs (or two owners) silently undo each other's switches and plan limits; in this test it put the whole app into maintenance mode for 6 minutes.
3. **BUG-144** — Suspend and "Sign out all devices" don't stop a session that is already open: it kept writing for 27 minutes after suspension.
4. **BUG-145** — Any admin claim (every manager) can read every user's portfolios, transactions and journal theses straight from Firestore, with no reason and no audit entry.
5. **BUG-146** — A revoked manager keeps full admin power for up to an hour, and an owner has no other way to cut that session off.

## Index

| ID | Date | Title | Severity | Area | Affects users? | Status | Source |
|---|---|---|---|---|---|---|---|
| BUG-142 | 2026-11-24 | Stale "Empty trash" / "Delete now" erases accounts that were already restored | High | Trash & deletion | Yes | ❌ Not resolved | S03-01 |
| BUG-143 | 2026-11-24 | Two Settings tabs or owners silently undo each other's switches and plans | High | Settings & switches | Yes | ❌ Not resolved | S02-10 |
| BUG-144 | 2026-11-24 | Suspend and "Sign out all devices" don't stop an open session | Medium | Users | Yes | ❌ Not resolved | S01-06, S06-04 |
| BUG-145 | 2026-11-24 | Any manager can read all users' holdings and theses from Firestore, unaudited | Medium | Data leak | Yes | ❌ Not resolved | S05-09, R1-S05-01 |
| BUG-146 | 2026-11-24 | A revoked manager keeps full admin power until its ID token expires | Medium | Roles & grants | Yes | ❌ Not resolved | S07-04, S09 repeat |
| BUG-147 | 2026-11-24 | An admin trash says "You deleted this account" and the user can undo it | Medium | Trash & deletion | Yes | ❌ Not resolved | S01-07, S06-08 |
| BUG-148 | 2026-11-24 | One shared "DELETE" text arms the bulk "Empty trash" | Medium | Trash & deletion | Yes | ❌ Not resolved | S03-05 |
| BUG-149 | 2026-11-24 | Settings stays editable when its config never loaded, and a save writes defaults | Medium | Settings & switches | Yes | ❌ Not resolved | S03-06, R1-S01-04 |
| BUG-150 | 2026-11-24 | Trash silently cancels a paid subscription and Restore doesn't undo it | Medium | Trash & deletion | Yes | ❌ Not resolved | S03-11, S05-07 |
| BUG-151 | 2026-11-24 | Downgrading a paying subscriber gives no warning and PayPal keeps charging | Medium | Users | Yes | ❌ Not resolved | S05-11 |
| BUG-152 | 2026-11-24 | Hidden custom Premium limits survive a downgrade and re-apply on upgrade | Medium | Users | Yes | ❌ Not resolved | S05-03 |
| BUG-153 | 2026-11-24 | Custom-limits editor keeps old values, shows stale numbers and accepts 0 | Medium | Users | Yes | ❌ Not resolved | S01-02, S05-06, S06-05 |
| BUG-154 | 2026-11-24 | A "locked" over-limit portfolio still accepts new coins and buys | Medium | User app | Yes | ❌ Not resolved | S06-01 |
| BUG-155 | 2026-11-24 | Admin downgrade re-runs onboarding and audits a plan choice the user never made | Medium | Users | Yes | ❌ Not resolved | S06-03 |
| BUG-156 | 2026-11-24 | Global switches apply only on page load; maintenance freezes nothing | Medium | Settings & switches | Yes | ❌ Not resolved | S02-01, S02-02 |
| BUG-157 | 2026-11-24 | AI switch ON shows a "Live" chat that answers every question with one fixed sentence | Medium | Settings & switches | Yes | ❌ Not resolved | S02-04 |
| BUG-158 | 2026-11-24 | Hand-upgraded (comped) users see invented billing and PayPal links | Medium | User app | Yes | ❌ Not resolved | S01-13 |
| BUG-159 | 2026-11-24 | Bulk actions hit rows hidden by the search or filter | Medium | Users | Yes | ❌ Not resolved | S01-19 |
| BUG-160 | 2026-11-24 | An erased user's open tab can "Restore" into an empty app | Medium | Trash & deletion | Yes | ❌ Not resolved | S08-01 |
| BUG-161 | 2026-11-24 | Permanent deletion leaves the admin note and rate-limit docs behind | Medium | Trash & deletion | Yes | ❌ Not resolved | S07-08 |
| BUG-162 | 2026-11-24 | An owner's `deleteUser` erases a manager outright | Medium | Roles & grants | Yes | ❌ Not resolved | S03-02 |
| BUG-163 | 2026-11-24 | An admin account can sit in the Trash unseen and the purge hard-deletes it | Medium | Roles & grants | Yes | ❌ Not resolved | S03-10, S05-04, S09-04 |
| BUG-164 | 2026-11-24 | Account callables don't validate the uid: phantom docs, slash paths, raw 500s | Medium | Users | Yes | ❌ Not resolved | S04-10, S05-08 |
| BUG-165 | 2026-11-24 | Admin "Log out" leaves the email and password in the sign-in form | Medium | Roles & grants | Yes | ❌ Not resolved | S03-09, S05-13 |
| BUG-166 | 2026-11-24 | Manager access can be granted to an unverified email | Medium | Roles & grants | Yes | ❌ Not resolved | S09-08 |
| BUG-167 | 2026-11-24 | Admin dashboard isn't tied to the live session; actions run as a different admin | Medium | Roles & grants | No | ❌ Not resolved | S09-09 |
| BUG-168 | 2026-11-24 | Step-up prompt stuck on "Checking…": owner can't grant or revoke after 10 min | Medium | Roles & grants | No | ❌ Not resolved | S09-11 |
| BUG-169 | 2026-11-24 | Two admins editing a private note silently overwrite each other | Medium | Support tools | No | ❌ Not resolved | S04-01 |
| BUG-170 | 2026-11-24 | "View as" shows transactions in random order and drops one past 50 | Medium | Support tools | No | ❌ Not resolved | S04-09 |
| BUG-171 | 2026-11-24 | A saved secret can never be removed from the panel | Medium | Settings & switches | No | ❌ Not resolved | S02-05 |
| BUG-172 | 2026-11-24 | "Change password" accepts a wrong current Settings password while unlocked | Medium | Settings & switches | No | ❌ Not resolved | S02-08 |
| BUG-173 | 2026-11-24 | `clear-settings-password.js --clear` crashes | Medium | Settings & switches | No | ❌ Not resolved | S02-12 |
| BUG-174 | 2026-11-24 | "View as" viewer has a 1.6 px close button and ignores Escape | Medium | Support tools | No | ❌ Not resolved | S01-05 |
| BUG-175 | 2026-11-24 | Overview, Users and Trash show 0 / empty instead of loading or error | Medium | Users | No | ❌ Not resolved | S07-02, R1-S01-02, R1-S01-03 |
| BUG-176 | 2026-11-24 | A trashed account can still write its data | Low | Trash & deletion | Yes | ❌ Not resolved | S06-11 |
| BUG-177 | 2026-11-24 | Moderation writes work on a trashed account; Trash hides tier and suspension | Low | Trash & deletion | Yes | ❌ Not resolved | S01-17, S03-07, S07-06 |
| BUG-178 | 2026-11-24 | Re-trashing an account restarts its 30-day clock | Low | Trash & deletion | Yes | ❌ Not resolved | S03-08 |
| BUG-179 | 2026-11-24 | An erased user's open session can re-create its profile doc | Low | Trash & deletion | Yes | ❌ Not resolved | S04-06 |
| BUG-180 | 2026-11-24 | Expired-trash screen says "create a new account" while the email is still taken | Low | Trash & deletion | Yes | ❌ Not resolved | S03-12 |
| BUG-181 | 2026-11-24 | Announcement dismissal is per browser and per text, so later users and escalations miss it | Low | User app | Yes | ❌ Not resolved | S01-20, S02-03 |
| BUG-182 | 2026-11-24 | A long unbroken word in an announcement makes the user app scroll sideways | Low | User app | Yes | ❌ Not resolved | S02-11 |
| BUG-183 | 2026-11-24 | Settings forms save invalid values with "Saved ✓" | Low | Settings & switches | Yes | ❌ Not resolved | S01-12, S02-06 |
| BUG-184 | 2026-11-24 | Landing "Usage" numbers don't follow the plan limits | Low | Settings & switches | Yes | ❌ Not resolved | S02-14 |
| BUG-185 | 2026-11-24 | Lock explainer gives the wrong reason and remedy for an over-limit portfolio | Low | User app | Yes | ❌ Not resolved | S06-02 |
| BUG-186 | 2026-11-24 | After a downgrade the alphabetically-last coins lock, not the newest | Low | User app | Yes | ❌ Not resolved | S06-09 |
| BUG-187 | 2026-11-24 | An open "Downgrade to which plan?" picker ignores a live tier change | Low | User app | Yes | ❌ Not resolved | S06-13 |
| BUG-188 | 2026-11-24 | Learn shows a "1-day streak" days after the streak ended | Low | User app | Yes | ❌ Not resolved | S04-15 |
| BUG-189 | 2026-11-24 | A repeated "Suspend" loses paid time from the frozen period | Low | Users | Yes | ❌ Not resolved | S05-12 |
| BUG-190 | 2026-11-24 | Admin "Forgot password?" mails any account a reset link to /admin | Low | Roles & grants | Yes | ❌ Not resolved | S01-01, R1-S01-01 |
| BUG-191 | 2026-11-24 | Admin sign-in reveals whether an email exists and whether a password is right | Low | Roles & grants | Yes | ❌ Not resolved | S01-09 |
| BUG-192 | 2026-11-24 | "Download all my data" omits admin notes; privacy policy doesn't mention staff access | Low | Audit & export | No | ❌ Not resolved | S04-05 |
| BUG-193 | 2026-11-24 | Suspend / Un-suspend fire on one click or keypress, no confirm | Low | Users | Yes | ❌ Not resolved | S08-02 |
| BUG-194 | 2026-11-24 | An interrupted bulk action is left half-applied with no record | Low | Users | Yes | ❌ Not resolved | S04-08 |
| BUG-195 | 2026-11-24 | A suspended account can be granted manager, then can't be un-suspended | Low | Roles & grants | No | ❌ Not resolved | S09-06 |
| BUG-196 | 2026-11-24 | Audit names targets by uid, and Users search can't find a uid | Low | Audit & export | No | ❌ Not resolved | S01-04, S06-10 |
| BUG-197 | 2026-11-24 | Refused admin calls leave no audit trail | Low | Audit & export | No | ❌ Not resolved | S05-05 |
| BUG-198 | 2026-11-24 | Concurrent changes are both audited as "from" the same old value | Low | Audit & export | No | ❌ Not resolved | S04-14 |
| BUG-199 | 2026-11-24 | Repeated clicks send and audit no-op changes ("pro→pro") | Low | Audit & export | Yes | ❌ Not resolved | S01-18 |
| BUG-200 | 2026-11-24 | Overview revenue and coin figures count the wrong accounts | Low | Users | No | ❌ Not resolved | S01-08, S07-01, S09-05 |
| BUG-201 | 2026-11-24 | Growth and job-status labels don't match their data | Low | Users | No | ❌ Not resolved | S04-03 |
| BUG-202 | 2026-11-24 | Overview counts and revenue never refresh after a change | Low | Users | No | ❌ Not resolved | S06-07 |
| BUG-203 | 2026-11-24 | User-detail Billing card and counters go stale after a tier change | Low | Users | No | ❌ Not resolved | S06-06 |
| BUG-204 | 2026-11-24 | Toasts and the CSV use internal tier ids ("free", "pro") | Low | Users | No | ❌ Not resolved | S01-10 |
| BUG-205 | 2026-11-24 | Announcement level buttons don't show the selected level | Low | Settings & switches | No | ❌ Not resolved | S01-11 |
| BUG-206 | 2026-11-24 | Saved views: native prompt freezes the tab, silent overwrite, shared by all admins | Low | Users | No | ❌ Not resolved | S01-15, S04-07, S07-05 |
| BUG-207 | 2026-11-24 | Admin panel keyboard and screen-reader gaps | Low | Users | No | ❌ Not resolved | S01-16, S02-09, S08-03, R1-S01-05 |
| BUG-208 | 2026-11-24 | On a phone the "Delete now" confirm hides which account is being erased | Low | Trash & deletion | Yes | ❌ Not resolved | S03-04 |
| BUG-209 | 2026-11-24 | View-as reason and note fields: no label, no length limit, non-string reasons accepted | Low | Support tools | No | ❌ Not resolved | S04-13 |
| BUG-210 | 2026-11-24 | "View as" prints raw numbers and dates and leaves out research findings | Low | Support tools | No | ❌ Not resolved | S04-04 |
| BUG-211 | 2026-11-24 | Long unbroken text makes the admin panel scroll sideways | Low | Support tools | No | ❌ Not resolved | S04-11, S07-09 |
| BUG-212 | 2026-11-24 | `viewUserAsAdmin` lets an owner open other admins' data | Low | Support tools | No | ❌ Not resolved | S04-12 |
| BUG-213 | 2026-11-24 | Owners get an unasked "Confirm your password" prompt on every page load | Low | Settings & switches | No | ❌ Not resolved | S04-02 |
| BUG-214 | 2026-11-24 | Configuration card says "PayPal connected" for any saved keys | Low | Settings & switches | No | ❌ Not resolved | S02-07 |
| BUG-215 | 2026-11-24 | "Forgot it?" copy points at a reset button that isn't there | Low | Settings & switches | No | ❌ Not resolved | S02-13 |
| BUG-216 | 2026-11-24 | Settings home shows an unsaved announcement draft as "On" | Low | Settings & switches | No | ❌ Not resolved | S08-04 |
| BUG-217 | 2026-11-24 | `restoreUser` and `saveUserNote` let a manager write to owner accounts | Low | Roles & grants | No | ❌ Not resolved | S05-01 |
| BUG-218 | 2026-11-24 | Managers see "Delete now" and "Empty trash", which always fail | Low | Roles & grants | No | ❌ Not resolved | S05-02, R1-S05-02 |
| BUG-219 | 2026-11-24 | User-detail hint says admins "can never be demoted" | Low | Roles & grants | No | ❌ Not resolved | S07-03 |
| BUG-220 | 2026-11-24 | Owner targets are told to "remove their admin role first" | Low | Roles & grants | No | ❌ Not resolved | S03-03 |
| BUG-221 | 2026-11-24 | A network failure shows the toast "internal [0]" | Low | Users | No | ❌ Not resolved | S05-10 |
| BUG-222 | 2026-11-24 | Clicking "Users" while a user detail is open does nothing | Low | Users | Yes | ❌ Not resolved | S06-12 |
| BUG-223 | 2026-11-24 | A real admin whose token refresh fails is told "This account isn't an admin" | Low | Roles & grants | No | ❌ Not resolved | S07-07 |
| BUG-224 | 2026-11-24 | Admin access roster doesn't refresh after a grant or revoke | Low | Roles & grants | No | ❌ Not resolved | S09-01, E2 |
| BUG-225 | 2026-11-24 | "Remove manager access" fires on one click, then shows the grant form | Low | Roles & grants | No | ❌ Not resolved | S09-02 |
| BUG-226 | 2026-11-24 | A revoked admin's open panel keeps its manager header instead of the denied screen | Low | Roles & grants | No | ❌ Not resolved | S09-07 |
| BUG-227 | 2026-11-24 | Detail of an admin account still offers tier and sign-out buttons | Low | Roles & grants | No | ❌ Not resolved | S09-10 |
| BUG-228 | 2026-11-24 | `npm run start:all` reports success with zero functions loaded | Low | Dev tooling | No | ❌ Not resolved | E1 |

---

## BUG-142 · Stale "Empty trash" / "Delete now" erases accounts that were already restored
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** High
- **Found by:** S03 (admin2@, owner) — S03-01, reproduced 4 times (mouse, keyboard, single row, server-only).
- **Steps to reproduce:** 1) Move two throwaway accounts to the Trash and open the Trash tab. 2) In the user app, one of them clicks "Restore my account" (`deleted:false`). 3) In the still-open Trash tab, click **Empty trash**, type DELETE and click "Delete 2" (or "Delete now" on the restored row).
- **Expected:** Only accounts that are still in the Trash are erased; a restored account is skipped with "no longer in the trash — refresh".
- **Actual:** Both accounts are erased: Auth record, `users/{uid}` and all data. `deleteUser` also erases an account that was never trashed at all (S03-01 run 2). The restored user's open tab silently shows an empty portfolio.
- **Effect on user accounts / the user app:** Irreversible loss of an active user's whole account (portfolios, coins, transactions, theses) — the exact thing the 30-day Trash exists to prevent. The user is never told.
- **Suggested fix (proposal only):** In `functions/index.js` `exports.deleteUser` (~L1444) read `users/{uid}` first and refuse with `failed-precondition` unless `deleted === true` (allow an explicit `force` for a deliberate GDPR erasure). In `src/hooks/useAdminDashboard.js` `emptyTrash`, re-fetch the list before purging and report "purged N, skipped M". Add a case to `tests/functions-callable.test.js`.

## BUG-143 · Two Settings tabs or owners silently undo each other's switches and plans
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** High
- **Found by:** S02 (admin@, owner) — S02-10, reproduced on switches (2x), Plans & pricing and the announcement save.
- **Steps to reproduce:** 1) Open Settings in tab A and tab B. 2) In B, turn **Allow new signups** OFF. 3) In A (still showing signups ON), turn **Maintenance mode** ON. 4) Check `/api/config` and the Audit tab.
- **Expected:** Each click changes only the switch that was clicked.
- **Actual:** Step 3 also turns signups back ON ("flags.maintenance: false → true, flags.signupsEnabled: false → true"). Every Settings save (switches, "Save plans", "Save announcement") re-posts the tab's whole stale `flags` object, and "Save plans" re-posts all plans. A stale "Save plans" put the whole app into maintenance mode from 18:54 to 19:00 with only "Saved ✓" on screen.
- **Effect on user accounts / the user app:** An incident switch (signups paused, maintenance on, a raised plan limit) can be reverted for every user by a second owner or a forgotten tab, with no warning. Users can be locked out by maintenance or get a different coin cap.
- **Suggested fix (proposal only):** Send only the changed key from the toggle handlers in `src/hooks/useAdminDashboard.js`, and have `saveConfig` in `functions/index.js` (~L2611–2626) merge `flags` and `plans` per key as it already does for `features` (`mergeFeatures`). Or send the loaded `updatedAt` and refuse a stale save ("Settings changed in another tab — reload").

## BUG-144 · Suspend and "Sign out all devices" don't stop an open session
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S01 (admin@) — S01-06; S06 (manager@) — S06-04. Re-seen in S03, S04, S05 (27/27 writes over 27 minutes), S07 and S08. (S09 re-tested only the revoke path, which is BUG-146.)
- **Steps to reproduce:** 1) Log in to /app as a persona. 2) In /admin, **Suspend** that user (or click **Sign out all devices**). 3) Without reloading the user tab, add a coin, add a buy or delete something.
- **Expected:** The open session ends within seconds, or at least every write is refused, as the `suspendUser` code comment promises ("a live session dies NOW").
- **Actual:** The open tab keeps reading and writing — through `addCoinGuarded`, `addTransactionGuarded`, `exportMyData` and direct Firestore writes — until the ID token expires (up to ~1 hour). On reload the user lands on a blank login form with no reason; "This account has been suspended" appears only on the next login attempt.
- **Effect on user accounts / the user app:** Suspension doesn't stop an abuser who is already logged in. The user is never told in the open session that they were suspended or signed out.
- **Suggested fix (proposal only):** Client: in the user-doc watcher in `src/CryptoIdea.jsx` (~L980) sign out and show the suspended notice when `suspendedAt` appears (or a `sessionsRevokedAt` stamp written by `adminSignOutUser`). Server: in the write callables compare `context.auth.token.auth_time` with `tokensValidAfterTime` or check `suspendedAt`. Rules: extend the `isChosen` helper in `firestore.rules` (~L159) to deny owner writes while `suspendedAt` is set. Related: BUG-138 (user-side copy).
- **Shared root cause with BUG-146:** Callables and rules accept an ID token until it expires and never check revocation. One server check covers both: in the guarded write callables and in `assertRole`, verify the token with `admin.auth().verifyIdToken(token, true)` (checkRevoked), or compare `auth_time` with the user's `tokensValidAfterTime`.

## BUG-145 · Any manager can read all users' holdings and theses from Firestore, unaudited
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S05 (manager@) — S05-09; lost first run — R1-S05-01. Re-seen in S07 and S09 (from the plain user-app login of a manager); cited in S04's privacy-policy check (not re-tested there).
- **Steps to reproduce:** Signed in as a manager, create a Firestore client (`getFirestore(adminAuth.app)`, or use the manager's user-app token over REST) and read `users/{uid}/portfolios/*/coins/*/transactions/*` and `users/{uid}/learn/progress` for any user. List the `users` collection.
- **Expected:** "View as" is owner-only, needs a reason and is audited. Holdings and theses should not be readable by a manager any other way.
- **Actual:** Every read succeeds, including a 2,000-character journal thesis and Learn progress. The manager can also list all 17 `users` docs, including the admins' own docs with `consent`, `settings` and `lastLogin`. Nothing is audited.
- **Effect on user accounts / the user app:** Every user's holdings and private theses are exposed to every manager without a trace. This contradicts the panel's own model ("no holdings anywhere", owner-only View as).
- **Suggested fix (proposal only):** In `firestore.rules` (~L220/304/329/344/363) narrow the `|| isAdmin()` read branches on `portfolios`/`coins`/`transactions`/`learn` to `isAdminOwner()`, or drop them (`viewUserAsAdmin` reads through the Admin SDK). Add rules tests: "a manager can't read another user's coins, transactions or journal".

## BUG-146 · A revoked manager keeps full admin power until its ID token expires
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S07 (manager@ as stand-in) — S07-04; S09 (p01, then admin@ for the revoke) — repeat on the real revoke path, 3x.
- **Steps to reproduce:** 1) A manager is signed in to /admin. 2) An owner opens Settings → Admin access → **Remove manager access** (or the manager uses "Sign out everywhere" in /app). 3) In the manager's still-open panel, change a user's tier; or call `listUsers` / `setUserTier` with the pre-revoke token.
- **Expected:** After a revoke, admin callables and the rules' `isAdmin()` branch refuse the old token.
- **Actual:** `listUsers`, `setUserTier`, `getUserNote` and Firestore reads of other users' coins return 200 for up to ~1 hour; the changes are audited under the revoked manager's name. An owner can't cut the session another way: `adminSignOutUser` on any admin is refused ("remove their admin role first").
- **Effect on user accounts / the user app:** A removed or compromised manager can keep changing tiers, suspending, trashing and reading every user's data after "revocation".
- **Suggested fix (proposal only):** In `functions/index.js` `assertRole`, verify the raw token with `admin.auth().verifyIdToken(token, true)` (checkRevoked), or re-read the caller's current `customClaims` with `auth.getUser(uid)`. Narrow the rules' admin reads (BUG-145). Until then, say in the revoke confirm that an open session can keep working for up to an hour. Add a `tests/functions-callable.test.js` case: revoke → old token gets `permission-denied`.
- **Shared root cause with BUG-144:** The same token-lifetime gap lets a suspended or signed-out user's open session keep writing; the checkRevoked / `auth_time` vs `tokensValidAfterTime` check fixes both.

## BUG-147 · An admin trash says "You deleted this account" and the user can undo it
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S01 (admin@) — S01-07; S06 (manager@) — S06-08. Re-seen in S02, S03, S05, S07, S08 and S09.
- **Steps to reproduce:** 1) A user is logged in to /app. 2) In /admin: Users → that user → Delete account → type DELETE → Move to trash (optionally Suspend first). 3) In the user tab, click **Restore my account**.
- **Expected:** An admin-initiated trash (moderation or a support request) can't be undone by the user, and the copy doesn't say the user did it.
- **Actual:** The user tab switches live to "Your account is scheduled for deletion — **You deleted this account**". One click on Restore brings the account back — even while it is also suspended (Auth `disabled:true`), because `restoreMyAccount` checks only `deleted`/`deletedAt`. The manager is not told.
- **Effect on user accounts / the user app:** Admin moderation through the Trash doesn't hold, and the user is told they did something they didn't do.
- **Suggested fix (proposal only):** In `functions/index.js` `adminTrashUser` (~L1505) stamp a server-only `deletedBy:"admin"`; make `restoreMyAccount` (~L1689) refuse when `deletedBy === "admin"`, when the Auth user is disabled, or when `suspendedAt` is set. In `src/components/RestoreAccount.jsx` show "This account was removed by support" without a Restore button.

## BUG-148 · One shared "DELETE" text arms the bulk "Empty trash"
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S03 (admin2@) — S03-05, 5 runs (desktop and 375 px).
- **Steps to reproduce:** 1) Trash → click **Empty trash** (its box appears, "Delete 2" disabled). 2) On one row click **Delete now** and type DELETE in that row's box. Variant: leave Empty trash open, go to Users → a user → Delete account → type DELETE (don't submit) → back to Trash.
- **Expected:** Each irreversible confirm has its own text; arming one account's delete never arms the purge of the whole Trash.
- **Actual:** Both boxes show DELETE and both the row "OK" and the bulk "Delete N" are enabled at once, side by side in the same red style.
- **Effect on user accounts / the user app:** One mis-click permanently erases every account in the Trash, including ones still restorable for 30 days (and, with BUG-142, already-restored ones).
- **Suggested fix (proposal only):** In `src/components/admin-dashboard.jsx` (~L931, ~L1093, ~L1124) give each confirm its own local state instead of the shared `delText` from `useAdminDashboard`, reset `confirmEmpty`/`purgeUid` when leaving the Trash tab, and close other confirms when one opens.

## BUG-149 · Settings stays editable when its config never loaded, and a save writes defaults
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S03 (admin2@) — S03-06, 2 runs; lost first run (admin@) — R1-S01-04 (load failure, code read).
- **Steps to reproduce:** 1) Save an inactive announcement draft. 2) Wait until the login is more than ~11 minutes old and reload /admin; the on-load "Confirm your password" prompt appears → **Cancel** (or let `getAdminConfig` fail). 3) Settings → the announcement box is empty with no notice → Plans & pricing → **Save plans** with no edits → unlock.
- **Expected:** Settings refuses to edit or save until the config has loaded, or a save writes only what the operator changed.
- **Actual:** The save posts the un-hydrated defaults: the stored announcement text becomes empty (audited). By code, the same save resets analytics and Termly ids, the announcement and `flags` (including `requireAdminMfa`, `paidPlansEnabled`, `checkout`) to defaults. On a load failure every category reads "Not set" with no error.
- **Effect on user accounts / the user app:** In a configured project one unrelated click can switch off an active announcement, blank the privacy/terms Termly ids (users see the default text) and reset global switches for every user.
- **Suggested fix (proposal only):** In `src/hooks/useAdminDashboard.js` `loadConfig` (~L217) track `configLoaded` / `cfgError`; until loaded, show "Locked — unlock to load settings" with an Unlock button and disable every Save and toggle (`saveConfig` ~L296, toggles ~L310, ~L555). Optionally have the server merge only keys present in the payload.

## BUG-150 · Trash silently cancels a paid subscription and Restore doesn't undo it
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S03 (admin2@) — S03-11; S05 (manager@) — S05-07. Simulated subscriptions on throwaways (no PayPal locally).
- **Steps to reproduce:** 1) Give a throwaway an active Pro subscription marker. 2) Users → Delete account → Move to trash (or the user self-deletes). 3) Trash → Restore (or the user restores). 4) Open the user's Account → Plan & billing.
- **Expected:** The confirm says trashing cancels the paid subscription and Restore won't restart it; the user copy names the real landing tier.
- **Actual:** The confirm only says "recoverable for 30 days". `adminTrashUser` / `deleteMyAccount` set `subscription.cancelled`; Restore leaves it cancelled. The restored user reads "Then your account will become **Pro**" although the sweep drops them to Starter, because the patch never sets `downgradeTo` and `Account.jsx` L303 shows "Pro" for anything not `"free"`.
- **Effect on user accounts / the user app:** A paying user trashed by mistake (or who changes their mind) loses their subscription at period end while the app promises they stay Pro. Latent until paid plans go live.
- **Suggested fix (proposal only):** Set `downgradeTo:"free"` in both trash patches in `functions/index.js` (~L1505, ~L1680; reuse `billing.cancelRequestPatch`); make `src/components/Account.jsx` L303 fail closed (`downgradeTo === "pro" ? "Pro" : "Starter"`); add the billing warning to both confirms (`src/components/admin-dashboard.jsx` ~L921–945) and a "subscription stays cancelled" note on Restore.

## BUG-151 · Downgrading a paying subscriber gives no warning and PayPal keeps charging
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S05 (manager@) — S05-11, 2x (desktop and 375 px), simulated subscription.
- **Steps to reproduce:** A throwaway on Premium with an active PayPal subscription id (Billing card "ACTIVE") → Users → that user → **STARTER**.
- **Expected:** A confirm such as "This user pays via PayPal. Changing the tier does not cancel or refund the subscription", or a refusal unless forced.
- **Actual:** No confirm; tier → free. `billingStatusOf` then returns "none", so the user drops out of the billing filters and revenue, and nothing flags the live subscription. Later sale webhooks don't restore the tier. The reverse case (comping a user whose cancelled sub has expired) is silently reset by the next sweep (code read).
- **Effect on user accounts / the user app:** The user loses Premium live but keeps being charged, with no trace for support.
- **Suggested fix (proposal only):** In `src/components/admin-dashboard.jsx` tier buttons confirm when `found.paypalSubscriptionId && billingStatus === "active"` and the tier goes down; make `functions/billing.js` `billingStatusOf` return "active" (or "mismatch") whenever an un-cancelled subscription exists; optionally `setUserTier` refuses without `force:true`.

## BUG-152 · Hidden custom Premium limits survive a downgrade and re-apply on upgrade
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S05 (manager@) — S05-03, 2 repros. Re-seen in S06 (qa-adm-06 capped at 31/3 with 28 coins locked).
- **Steps to reproduce:** Premium user → Custom limits Coins = 1 → Save → STARTER → PREMIUM. Or call `setPremiumLimits({coins:1})` on a Starter user, then upgrade them.
- **Expected:** Leaving Premium clears the override (or warns), `setPremiumLimits` refuses a non-Premium target, and a stored override is always visible.
- **Actual:** The override is stored on any tier, hidden for non-Premium, and silently re-applied on the next upgrade: a "PREMIUM" user is capped at 1 coin, below Starter's 30.
- **Effect on user accounts / the user app:** A paying or comped Premium user is capped far below their plan, live, with no explanation in the panel.
- **Suggested fix (proposal only):** In `functions/index.js` `exports.setUserTier` write `premiumLimits: {}` when the new tier isn't premium (and include it in the audit diff); make `setPremiumLimits` (~L1370) refuse unless the target is Premium; in `src/components/admin-dashboard.jsx` show "custom limits stored (inactive on this tier)" when `found.premiumLimits` isn't empty.

## BUG-153 · Custom-limits editor keeps old values, shows stale numbers and accepts 0
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S01 (admin@) — S01-02; S05 (manager@) — S05-06; S06 (manager@) — S06-05. Re-seen in S07.
- **Steps to reproduce:** Premium user → Custom limits 1/2/5 → Save. Then (a) blank Portfolios ("Blank = tier default") or type `-1` → Save; (b) click **Clear**, then "Save custom limits"; (c) set Portfolios 0 / Coins 0 → Save.
- **Expected:** A blank field returns to the tier default; negatives, 0 and fractions are refused; after Clear the fields are blank.
- **Actual:** (a) "Custom limits updated ✓" but the old `portfolios:1` stays (merge write), and the audit claims it was removed. (b) The server stores `{}` but the inputs keep 1/1, so the next Save re-applies them. (c) 0 is accepted: the user shows "My Assets (2/0)", every coin "Over plan limit", and the add-portfolio button disappears; 1.5 is stored as 2.
- **Effect on user accounts / the user app:** An admin who thinks a restriction was lifted leaves the user capped, or accidentally re-caps or zero-caps a paying Premium user. The user's lock explainer then tells a top-tier user to "Upgrade".
- **Suggested fix (proposal only):** In `functions/index.js` `setPremiumLimits` (~L1370) write the whole map (`update({premiumLimits: out})`), reject non-integers and values below 1 with `invalid-argument`, audit what was stored. In `src/components/admin-dashboard.jsx` `PremiumLimitsEditor` (~L310–315) re-seed inputs from the returned `premiumLimits`, use `min=1 step=1`, and show current usage next to each field.

## BUG-154 · A "locked" over-limit portfolio still accepts new coins and buys
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S06 (manager@) — S06-01, 3x (two downgrades and a custom limit).
- **Steps to reproduce:** A Pro user with 4 portfolios → manager sets STARTER (cap 3). In the user tab switch to the 4th portfolio → Add → Bitcoin → open it → + Buy.
- **Expected:** The over-limit portfolio is read-only ("kept but locked"); adding a coin or buy is refused.
- **Actual:** `addCoinGuarded` and `addTransactionGuarded` both succeed; the coin shows an "Over plan limit" tag, the portfolio pill has no lock marker and "+ Add" is enabled. A journal thesis can also be saved on the locked coin.
- **Effect on user accounts / the user app:** The portfolio cap isn't enforced after a downgrade, while the UI tells the user the data is locked.
- **Suggested fix (proposal only):** In `functions/index.js` `addCoinGuarded` (~L1915) and `addTransactionGuarded`, re-derive the portfolio cap and refuse (reason `locked`) when the target portfolio is beyond it. In `src/CryptoIdea.jsx` pass the existing `lockedPortIds` (~L702) to `Portfolio.jsx` to dim the pill and hide "+ Add"/"+ Buy".

## BUG-155 · Admin downgrade re-runs onboarding and audits a plan choice the user never made
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S06 (manager@) — S06-03, 2 UI repros (pro@, free@) + a control.
- **Steps to reproduce:** A paid user without `planChosen` (seed/paid path) is logged in → manager sets **STARTER**.
- **Expected:** A plain "Your plan is now Starter" notice and one audit entry.
- **Actual:** The open tab shows the celebratory "✓ Welcome to Starter" onboarding modal, all data reads are denied until the client auto-calls `chooseFreePlan`, and the audit gets a second entry "User chose the free plan — by pro@test.com" in the same second.
- **Effect on user accounts / the user app:** The user is briefly walled off from all their data (locked out if `chooseFreePlan` fails or is rate-limited); with paid plans on they'd get the forced plan picker; the audit falsely attributes a choice to the user.
- **Suggested fix (proposal only):** In `functions/index.js` `setUserTier` (~L1325) and the sweep/webhook downgrade paths, write `planChosen: true` whenever the tier changes. Optionally suppress the welcome modal when the tier change arrived via the live watcher in `src/CryptoIdea.jsx` (~L466, ~L978).

## BUG-156 · Global switches apply only on page load; maintenance freezes nothing
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S02 (admin@) — S02-01 (3x), S02-02 (announcement, maintenance, aiResearch).
- **Steps to reproduce:** 1) p03 is logged in to /app. 2) Settings → **Maintenance mode** ON (or save an announcement, or turn AI research chat OFF). 3) Keep using the p03 tab for 80 s without reloading; then reload and try a write from the maintenance screen.
- **Expected:** Within ~60 s ("applies within ~1 min") every open session shows the maintenance screen / banner / hidden AI, and maintenance stops writes.
- **Actual:** Open tabs never pick up any switch; only a reload does. Even on the maintenance screen the session can still write (`updatePortfolioName` succeeds; a portfolio was created 70 s after maintenance went on). Nothing on the server reads `flags.maintenance` except `/api/config`.
- **Effect on user accounts / the user app:** A "Critical" notice doesn't reach the people already in the app, and maintenance used to freeze data during an incident doesn't freeze anything.
- **Suggested fix (proposal only):** In `src/CryptoIdea.jsx` (the `fetchSiteConfig` effect, ~L210) re-poll `/api/config` every 60 s and on `visibilitychange`. If a write freeze is wanted, check `maintenance` in `addCoinGuarded`/`addTransactionGuarded` and add a `flags.maintenance` predicate to owner writes in `firestore.rules`; otherwise relabel it "notice on next page load".

## BUG-157 · AI switch ON shows a "Live" chat that answers every question with one fixed sentence
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S02 (admin@) — S02-04, 2 questions.
- **Steps to reproduce:** Settings → AI → "AI research chat" ON → reload /app as a user → Research → Ask → ask two different questions.
- **Expected:** With `AI_PROXY_LIVE=false` the Ask chat stays hidden, or it gives deterministic answers without a "Live / Real answers" claim.
- **Actual:** The header reads "● Live — Real answers about anything you hold", and every question gets the same canned sentence (`useAsk.js` falls back to `DEFAULT_A` because `askAI` throws).
- **Effect on user accounts / the user app:** Every user is shown a chat that pretends to be live AI and never answers — the same honesty problem as BUG-058/BUG-059.
- **Suggested fix (proposal only):** Gate the Ask sub-view on `aiEnabled && AI_PROXY_LIVE` in `src/features/research/`, or drop the "Live / Real answers" line in `src/features/research/components/AskView.jsx:20`; say in the admin AI drill-in that turning it on before go-live shows a placeholder.

## BUG-158 · Hand-upgraded (comped) users see invented billing and PayPal links
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S01 (admin@) — S01-13, on p07 and pro@. Re-seen in S02, S04, S06 and S07.
- **Steps to reproduce:** Admin sets a user to Premium (Billing card: "Manual upgrade — no PayPal subscription on file") → that user → Account → Plan & billing → Downgrade.
- **Expected:** "Complimentary plan — managed by support", with no PayPal links, no paid period and no end date.
- **Actual:** "Access continues until your paid period ends", an **Update payment method ↗** link to paypal.com, and "Your Premium access continues until **December 24, 2026**" — a date made up as today + 1 month (`src/CryptoIdea.jsx` ~L1175 `calcEndDate("monthly")`).
- **Effect on user accounts / the user app:** Every comped user (support comps, testers) gets false billing information and an external payment link for a payment that doesn't exist.
- **Suggested fix (proposal only):** In `src/components/Account.jsx` (~L332) and the downgrade dialog in `src/CryptoIdea.jsx` (~L1175–1240) branch on `!user.subscription` and show "Complimentary plan — managed by support"; never synthesise `chEnd`. Related: BUG-058.

## BUG-159 · Bulk actions hit rows hidden by the search or filter
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S01 (admin@) — S01-19, 2x. Re-seen in S05 and S06 (not executed against hidden personas).
- **Steps to reproduce:** Users → **Select page** ("13 selected") → type `p01` in the search (or choose a tier filter) → the list shows 1 user but the bar still says "13 selected" with Set tier / Suspend.
- **Expected:** Changing the search or filter clears the selection (or limits it to visible rows), and bulk Suspend/tier confirm how many accounts are affected.
- **Actual:** The bulk buttons act on the full hidden selection (`src/components/admin-dashboard.jsx` ~L1036–1044), with no confirmation.
- **Effect on user accounts / the user app:** An admin who means to suspend or re-tier one user can lock out or re-tier everyone selected earlier.
- **Suggested fix (proposal only):** Clear `selected` when the search or filters change (or intersect with visible rows), show "N selected (M hidden)", and confirm bulk Suspend and tier changes with the count.

## BUG-160 · An erased user's open tab can "Restore" into an empty app
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S08 (admin@) — S08-01, 2x. Re-seen in S02, S03 (incl. a "Welcome to Starter" variant) and S09.
- **Steps to reproduce:** 1) A throwaway is logged in to /app. 2) Owner: Move to trash, then Trash → **Delete now**. 3) The user tab still says "30 days left to restore it" → **Restore my account**.
- **Expected:** The tab says the account no longer exists and signs out.
- **Actual:** `restoreMyAccount` returns `{restored:false}`, the client ignores it and shows a fresh empty Starter portfolio; every save fails with "check the details and try again". Nothing is resurrected server-side.
- **Effect on user accounts / the user app:** An erased user is told their account is restorable and then "restored", and every action fails with a misleading message.
- **Suggested fix (proposal only):** In `src/CryptoIdea.jsx` `restoreAccount` (~L567–572) treat `restored:false` as "account no longer exists" and sign out; optionally make `restoreMyAccount` (`functions/index.js` ~L1697) throw `not-found`, and have `useAuthSession` sign out when the user doc disappears.

## BUG-161 · Permanent deletion leaves the admin note and rate-limit docs behind
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S07 (admin@ / manager@) — S07-08, 2x. Re-seen in S03 (81 `rateLimits` docs for 31 erased uids, 3 orphaned notes) and S04.
- **Steps to reproduce:** Write a private note on a throwaway → trash → owner Trash → **Delete now** → "Permanently deleted ✓" → read Firestore.
- **Expected:** Erasure removes every server-side record about the person that isn't an audited legal record.
- **Actual:** `adminNotes/{uid}` survives with the full note text (e.g. "phone 555-0100, VIP"), as do the uid's `rateLimits` docs. Any admin can still read the note with `getUserNote(uid)` (the uid is in the audit payload), while it is unreachable from every screen.
- **Effect on user accounts / the user app:** A deleted user's personal data is kept indefinitely after the panel says "permanently deleted" — a GDPR/CCPA erasure gap.
- **Suggested fix (proposal only):** One shared `eraseUserData(uid)` helper in `functions/index.js` used by `deleteUser` (~L1464) and `purgeExpiredTrash` (~L3240) that also deletes `adminNotes/{uid}`, `rateLimits` docs prefixed `{uid}__` and `settingsUnlock/{uid}`; add a `tests/functions-callable.test.js` case asserting no doc with the uid survives.

## BUG-162 · An owner's `deleteUser` erases a manager outright
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S03 (admin2@) — S03-02, 2x on throwaway managers.
- **Steps to reproduce:** Grant manager to a throwaway → call the `deleteUser` callable (the one behind "Delete now") with its uid. Compare `adminTrashUser` on the same uid.
- **Expected:** Admins are never moderation subjects: `deleteUser` refuses until the role is removed, like `adminTrashUser` ("remove their admin role first").
- **Actual:** `adminTrashUser` is refused, but `deleteUser` erases the manager's Auth account and data at once. Only the `MIN_ADMINS` floor guards it, so the real manager@ could be erased by one owner call today.
- **Effect on user accounts / the user app:** An admin account and its personal data can be destroyed without the Trash or a demotion step. No UI button today (admins are hidden), so reachable through the API.
- **Suggested fix (proposal only):** In `functions/index.js` `exports.deleteUser` (~L1444) call `assertTargetNotAdmin(uid, "permanently delete")` before any side effect, combined with BUG-142's `deleted === true` check.

## BUG-163 · An admin account can sit in the Trash unseen and the purge hard-deletes it
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S05 (manager@) — S05-04; S03 (admin2@) — S03-10; S09 (admin@) — S09-04 (purge proven 1x).
- **Steps to reproduce:** Either (a) a manager deletes their own account in /app → Account → Privacy & data → Delete my account; or (b) an owner trashes a user, then grants it manager in Settings → Admin access. Then open Trash → Refresh, and (for b) back-date `deletedAt` 31 days and run `purgeExpiredTrash`.
- **Expected:** An admin can't enter the user Trash (self-delete refused, grant to a trashed account refused), or a trashed admin is visible to owners; the purge never erases an admin.
- **Actual:** Both paths succeed. The account keeps full manager access while `deleted:true`, is missing from Users and Trash ("Trash is empty"), and the roster shows a plain "MANAGER". The purge erased a throwaway still holding `{admin:true, role:"manager"}` within 6 s, with no audit row.
- **Effect on user accounts / the user app:** The team can lose a manager account (and its data) with no warning or trace; a compromised manager can start its own erasure clock quietly.
- **Suggested fix (proposal only):** In `functions/index.js`: `deleteMyAccount` (~L1657) refuses when `context.auth.token.admin === true`; `setManagerRole` (~L1221) refuses when `users/{uid}.deleted === true`; `purgeExpiredTrash` (~L3230) skips any uid with `customClaims.admin === true` and writes an audit row per purge. Show "In trash" in the Admin access card (`src/components/admin-dashboard.jsx` ~L1540).

## BUG-164 · Account callables don't validate the uid: phantom docs, slash paths, raw 500s
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S04 (admin2@) — S04-10 (7 calls, 5 callables); S05 (manager@) — S05-08. Re-seen in S03 (stale-tab trash and `setPremiumLimits` on erased uids).
- **Steps to reproduce:** As an admin call `restoreUser`, `setUserTier`, `adminTrashUser`, `setPremiumLimits` or `saveUserNote` with (a) a uid that doesn't exist, or (b) a path such as `<uid>/portfolios/default`.
- **Expected:** `invalid-argument` for anything that isn't a plain uid, and `not-found` for an unknown one, with no writes.
- **Actual:** (a) `adminTrashUser`, `setPremiumLimits` and `restoreUser` create phantom `users/{uid}` docs (invisible in Trash, audited as real); `setUserTier`, `suspendUser` and `adminSignOutUser` fail with a bare `INTERNAL [500]`. (b) Admin fields (`tier`, `deleted`, `premiumLimits`) are written into a user's portfolio and coin docs, and the "target is an admin/owner" guards are skipped, so a manager could write into an owner's sub-docs. Also: `suspendUser({disabled:"yes"})` suspends (truthy coercion), a missing `disabled` un-suspends, and an array uid gives 500.
- **Effect on user accounts / the user app:** Users' portfolio and coin docs can carry foreign admin fields forever; the audit names users that don't exist; a stale row shows "INTERNAL" instead of "this user no longer exists".
- **Suggested fix (proposal only):** One `assertUid(uid)` in `functions/guards.js` (`/^[A-Za-z0-9_-]{1,128}$/`) and an `assertUserExists(uid)` (map `auth/user-not-found` to `not-found`) called first in every callable that takes a target uid; make `assertTargetNotAdmin` (`functions/index.js` ~L307–312) fail closed on unexpected errors; check `typeof disabled === "boolean"`. **`restoreUser` write fix (this entry is its single home):** use `update()` instead of `set(merge)` so an unknown uid creates no phantom doc, and return early without writing when the account isn't trashed, so it never writes `deleted:false, deletedAt:null` onto an active account (S05-01, BUG-199).

## BUG-165 · Admin "Log out" leaves the email and password in the sign-in form
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S05 (manager@) — S05-13; S03 (admin2@) — S03-09. Re-seen in S07 (3x), S08 (also in a second tab) and S09. Not reproduced once in S06 after reloads.
- **Steps to reproduce:** Sign in to /admin → header **Log out** (or sign in as a non-admin → Sign out) → read the sign-in fields.
- **Expected:** Signing out clears both fields.
- **Actual:** The email and the password stay filled (React state survives), so pressing Sign in or Enter logs the admin straight back in. A full page reload clears them.
- **Effect on user accounts / the user app:** On a shared or unattended computer the next person can re-enter the owner panel — every user's account, permanent deletion — with one click.
- **Suggested fix (proposal only):** In `src/admin-main.jsx` `signOut` (~L71) call `setPass(""); setEmail("")` (or clear `pass` right after a successful sign-in, or key the form on the auth uid). Same family as BUG-034/BUG-080 in the user app.

## BUG-166 · Manager access can be granted to an unverified email
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S09 (admin@) — S09-08, 4x (including a 2-minute-old account).
- **Steps to reproduce:** Register a new account in /app without verifying the email → owner → Settings → Admin access → search it → re-type → Continue → Confirm.
- **Expected:** Admin roles require a verified email, or the card and warning say "Email not verified".
- **Actual:** Every grant is accepted for `emailVerified:false` accounts; the card shows only name and email.
- **Effect on user accounts / the user app:** Anyone can register `someone@company.com` without owning it; if an owner later grants "the new manager's email", the impostor gets read-everything / suspend / trash powers over all users.
- **Suggested fix (proposal only):** In `functions/index.js` `setManagerRole` refuse when `!userRecord.emailVerified` (with an emulator override); return `emailVerified` and `creationTime` from `lookupUser` and show "Verified / Not verified · joined N min ago" in the Admin access card.

## BUG-167 · Admin dashboard isn't tied to the live session; actions run as a different admin
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S09 (p01 / admin@) — S09-09, 4x (2 natural, 2 deterministic).
- **Steps to reproduce:** Two /admin tabs in one browser. In tab 1 Log out of a manager and sign in as an owner within ~1.5 s (or switch the shared admin session without a sign-out in between). Use tab 2.
- **Expected:** Every tab re-renders or signs out when the signed-in uid changes.
- **Actual:** Tab 2 keeps the previous admin's email, role notice and tabs. A tier change from an owner-looking screen is audited "by manager@test.com", and from a manager-looking screen "by admin@test.com"; Settings opens with blank "Not set" values.
- **Effect on user accounts / the user app:** No direct user-app effect, but actions on user accounts are done and logged under a different admin than the screen shows.
- **Suggested fix (proposal only):** In `src/admin-main.jsx` (~L49–103) keep the signed-in user in state and render `<AdminDashboard key={user.uid} …>` so a uid change remounts it (the role is resolved once at mount in `src/hooks/useAdminDashboard.js` ~L435); go back to "loading" on every auth change.

## BUG-168 · Step-up prompt stuck on "Checking…": owner can't grant or revoke after 10 min
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S09 (admin@) — S09-11, 3x. Re-seen in S03 (2x, Enter dead too); not reproduced in S04 (the load-time prompt unlocked normally).
- **Steps to reproduce:** Sign in as an owner → wait more than 10 minutes → Settings → Admin access → search a manager → "Remove manager access" (or grant).
- **Expected:** The password prompt accepts the owner password and the action runs.
- **Actual:** The prompt opens with its submit button already disabled and labelled "Checking…"; Enter does nothing. Reloading doesn't help (config loads without prompting); only Log out → Sign in and retrying within 10 minutes works.
- **Effect on user accounts / the user app:** In an incident (revoking a compromised manager) the owner hits a dead control, which delays cutting the manager off further (with BUG-146).
- **Suggested fix (proposal only):** In `src/hooks/useAdminDashboard.js` `setManager` (~L593–604) set `busy` only after `withUnlock` resolves, or give the unlock modal its own `unlockBusy` (`src/components/admin-dashboard.jsx` ~L1712 `disabled={busy || !unlockPass}`). `saveSettingsPassword` (~L266) has the same pattern.

## BUG-169 · Two admins editing a private note silently overwrite each other
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S04 (admin2@) — S04-01, 3 runs (two simulated, one with two real tabs).
- **Steps to reproduce:** Tab A opens a user's note. Another admin (tab B) saves a different note. Tab A, still showing the old text, edits and saves.
- **Expected:** A conflict warning ("changed by X at HH:MM — reload?").
- **Actual:** "Note saved ✓"; the other admin's note is gone with no trace (note content is never audited). A failed `getUserNote` load also shows an empty note box with no error, so saving wipes the real note; "Last edited by" can name the wrong admin.
- **Effect on user accounts / the user app:** None directly, but support context such as "user disputes charge, do not change tier" can vanish and a later admin acts against it.
- **Suggested fix (proposal only):** `functions/index.js` `saveUserNote` (~L1639) takes the loaded `updatedAt` and refuses in a transaction if it changed; `src/hooks/useAdminDashboard.js` `saveNote`/`loadNote` (~L383–393) send it, show a load error instead of an empty note, and on refusal reload and keep the typed text.

## BUG-170 · "View as" shows transactions in random order and drops one past 50
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S04 (admin2@) — S04-09, 2x UI + 2x callable.
- **Steps to reproduce:** A coin with 51 buys → Users → that user → View as → reason → Open. Then delete one so exactly 50 remain.
- **Expected:** Newest-first like the user's Detail screen, and a truncation note only when something is missing ("newest 50 of 51").
- **Actual:** Rows come in doc-id order; the dropped buy is an arbitrary one from the middle; "Showing the first 50" appears even when all 50 are shown (`>=` off-by-one, same for portfolios and coins).
- **Effect on user accounts / the user app:** Nothing is written, but support reads a scrambled, silently incomplete history when answering "where did my buy go?".
- **Suggested fix (proposal only):** In `functions/index.js` (~L1570–1580) `.orderBy("date","desc").limit(MAX + 1)`, set `txTruncated = size > MAX`, same for portfolios/coins; the viewer says "Showing the newest 50 of {txCount}".

## BUG-171 · A saved secret can never be removed from the panel
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S02 (admin@) — S02-05, 2x.
- **Steps to reproduce:** Settings → AI → paste a key → Save. Re-open, clear every field → Save.
- **Expected:** A "Remove saved key" control so a leaked key or a Sentry DSN can be taken out of service.
- **Actual:** Any blank submit keeps the saved value (`keep()` in `functions/index.js` ~L2606) for the AI key, PayPal secret, SMTP password, CoinGecko key and Sentry DSN. Only the Firestore console can remove one.
- **Effect on user accounts / the user app:** None directly; an owner can't revoke a leaked provider key or turn off server Sentry from the panel.
- **Suggested fix (proposal only):** Add an allow-listed `clear: [...]` field to the `saveConfig` payload (checked against `SECRET_PATHS`, audited as "(cleared)") and a "Remove saved key" button per secret in `src/components/admin-dashboard.jsx`.

## BUG-172 · "Change password" accepts a wrong current Settings password while unlocked
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S02 (admin@) — S02-08, 2x.
- **Steps to reproduce:** With Settings unlocked (any unlock in the last 10 minutes): Settings password → Current = `totally-wrong` → new password twice → Change password.
- **Expected:** The current password is checked, since the screen asks for it.
- **Actual:** "Settings password changed ✓". `setSettingsPassword` (~L2713–2733) skips the check while a session unlock is live.
- **Effect on user accounts / the user app:** None on users. Anyone at an unlocked owner session can lock the real owner out of Settings (recovery is the email reset or the script, which is broken — BUG-173).
- **Suggested fix (proposal only):** Always verify `data.current` when a password is set (keep the 30/day budget), or hide the field while unlocked and say so.

## BUG-173 · `clear-settings-password.js --clear` crashes
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S02 (admin@) — S02-12, 2x.
- **Steps to reproduce:** With a Settings password set: `cd functions && FIRESTORE_EMULATOR_HOST=localhost:8080 GCLOUD_PROJECT=demo-crypto-idea node scripts/clear-settings-password.js --clear`.
- **Expected:** "Settings password cleared."
- **Actual:** `Failed: Cannot read properties of undefined (reading 'FieldValue')`; the password stays set. firebase-admin 14 no longer exposes `admin.firestore` (the other scripts were migrated; this one wasn't).
- **Effect on user accounts / the user app:** None directly; the only documented lockout escape hatch doesn't work, so API keys, plans and switches can become unreachable from the panel.
- **Suggested fix (proposal only):** In `functions/scripts/clear-settings-password.js:64` use `const { getFirestore, FieldValue } = require("firebase-admin/firestore")` and `FieldValue.delete()`; add a test that runs the script against the emulator.

## BUG-174 · "View as" viewer has a 1.6 px close button and ignores Escape
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S01 (admin@) — S01-05, 2x. Re-seen in S04 and S08 (desktop and 375 px).
- **Steps to reproduce:** Users → a user → View as — read-only → reason → Open. Look for the close control; press Escape; switch admin tabs.
- **Expected:** A visible close button, Escape closes, focus moves into a `role="dialog"`.
- **Actual:** The "Close read-only view" button is 1.6×1.6 px (its icon 0×0); Escape does nothing; it isn't a dialog and background controls stay in the tab order. Only clicking the backdrop closes it. It also stays open across tab switches, stacking over the step-up prompt. The reason field has no `maxlength`.
- **Effect on user accounts / the user app:** None (read-only and audited). Keyboard and screen-reader admins can't close it at all.
- **Suggested fix (proposal only):** In `src/styles/admin-settings.css` (~L176) size `.adm-viewas-bar .icon-btn` like `.adm-scr-head .icon-btn` (34 px, 18 px svg); in `src/components/admin-dashboard.jsx` (~L1722) add `role="dialog" aria-modal="true"`, Escape and focus-on-open (or reuse the shared Modal).

## BUG-175 · Overview, Users and Trash show 0 / empty instead of loading or error
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Medium
- **Found by:** S07 (manager@) — S07-02, 3x; lost first run (admin@, manager@) — R1-S01-02, R1-S01-03, and the R1 S06 report's repeat of R1-S01-02 (`listUsers` failure shows "0 users"). The same render path shows on a revoked token in S09-07 (BUG-226).
- **Steps to reproduce:** (a) Sign in to /admin or reload, sampling the Overview every 30 ms. (b) With `listUsers` failing, open Users, then Trash.
- **Expected:** "—" or a skeleton while loading, and an error state ("couldn't load — not zero") on failure, as the Overview's failure state already does.
- **Actual:** (a) For ~225 ms the cards read "0 TOTAL / $0 revenue". (b) Users shows a small "internal [0]" plus "0 users / No users found."; Trash shows "Trash is empty." with no error at all.
- **Effect on user accounts / the user app:** None directly. An operator can believe all users are gone, or miss accounts about to be auto-purged.
- **Suggested fix (proposal only):** In `src/hooks/useAdminDashboard.js` (~L450) keep `stats` null until loaded (drop `EMPTY_STATS`, ~L39) and render "—"; expose the list-load error and render it instead of the count/empty state in `src/components/admin-dashboard.jsx` (~L1049, ~L1104–1107).

## BUG-176 · A trashed account can still write its data
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S06 (manager@) — S06-11, 2x.
- **Steps to reproduce:** Move a throwaway to the Trash (`deleted:true`; the Auth account stays enabled by design). With a fresh ID token for it, call `addTransactionGuarded`, `addCoinGuarded`, and PATCH a portfolio name in Firestore.
- **Expected:** While in the Trash, only restore, sign-out and export work; data writes are refused.
- **Actual:** All three succeed.
- **Effect on user accounts / the user app:** Data of an account scheduled for erasure keeps changing, and an admin-trashed user can keep using the backend without restoring. The shipped UI only shows the restore screen, so this needs a direct API call.
- **Suggested fix (proposal only):** Refuse in `addCoinGuarded`/`addTransactionGuarded` (`functions/index.js`) when the caller's user doc has `deleted === true`; in `firestore.rules` have the `isChosen` helper (~L159), or a sibling `isActive`, also require `deleted != true` (and, for BUG-144, no `suspendedAt`).

## BUG-177 · Moderation writes work on a trashed account; Trash hides tier and suspension
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S01 (admin@) — S01-17; S07 (manager@) — S07-06 (API + two-tab UI, 2x each); S03 (admin2@) — S03-07 (2 runs).
- **Steps to reproduce:** (a) Trash an account, then (from a stale detail or the API) set its tier to Premium and custom coins 5 → Restore. (b) Suspend an account → Move to trash → Trash tab → Restore.
- **Expected:** Tier, limits and suspend are refused on a trashed account ("restore it first"); the Trash row shows tier and a SUSPENDED badge; the restore toast says "restored — still suspended".
- **Actual:** (a) "Tier updated ✓" / "Custom limits updated ✓" with no warning; Restore brings the account back as Premium with a 5-coin cap. (b) The row shows only the days left; "Account restored ✓" while the user still can't sign in, and the Trash header promises "Restore brings the account fully back".
- **Effect on user accounts / the user app:** A restored user can come back on a tier or cap nobody meant to give, or locked out while support believes they are fully back.
- **Shared root cause:** The admin mutation callables never check `users/{uid}.deleted === true`; BUG-178 is the `adminTrashUser` side of the same gap (kept separate — see BUG-178).
- **Suggested fix (proposal only):** In `functions/index.js` `setUserTier`/`setPremiumLimits`/`suspendUser`/`adminSignOutUser` refuse when `users/{uid}.deleted === true`; `restoreUser` (~L1477–1480) returns the Auth `disabled` flag. In `src/components/admin-dashboard.jsx` Trash rows (~L1112) show tier and the `adm-pill susp` badge, and reword the intro to "Restore brings the account and its data back".

## BUG-178 · Re-trashing an account restarts its 30-day clock
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S03 (admin2@) — S03-08, 2 runs.
- **Steps to reproduce:** Trash an account from one admin instance, then "Move to trash" again from a stale second tab (or call `adminTrashUser` again).
- **Expected:** Trashing an already-trashed account is a no-op, so the purge date can't be pushed back.
- **Actual:** Each repeat rewrites `deletedAt` (the audit even shows `deleted: true→true`), and the user's restore screen keeps saying "30 days left". (The same run also saw `setUserTier` accepted on the trashed account; that symptom is BUG-177.)
- **Why separate from BUG-177:** Both come from the admin mutation callables never checking `users/{uid}.deleted === true`. They stay apart because the expected behaviour and the effect differ: here a repeat trash should be an idempotent no-op that keeps the original `deletedAt` (not an error), and the harm is a postponed GDPR erasure; BUG-177 is a refusal ("restore it first") on tier/limits/suspend, and the harm is a restored user on the wrong tier or still locked out.
- **Effect on user accounts / the user app:** Erasure of a deleted account (GDPR storage limitation) can be postponed indefinitely without anyone noticing.
- **Suggested fix (proposal only):** In `functions/index.js` `adminTrashUser` (~L1489), if already trashed return `{success:true, alreadyTrashed:true}` without touching `deletedAt`.

## BUG-179 · An erased user's open session can re-create its profile doc
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S04 (admin2@) — S04-06, 2x.
- **Steps to reproduce:** A throwaway's tab is open → owner Delete now ("Permanently deleted ✓") → from that tab, within the ID token's lifetime, `PATCH users/{uid}?currentDocument.exists=false` with `{email, name, tier:"free"}`.
- **Expected:** After a GDPR erasure no personal data for that uid can reappear.
- **Actual:** 200 — the profile doc with email and name is back; it has no `deleted` flag and no Auth user, so no screen or purge will ever find it. Server paths (`chooseFreePlan`, `addCoinGuarded`, portfolio writes) correctly refuse.
- **Effect on user accounts / the user app:** An orphan record with personal data contradicts the "erased" promise. It needs a deliberate client write within ~1 hour.
- **Suggested fix (proposal only):** In `firestore.rules` `match /users/{userId}` `allow create`, require `request.resource.data.email == request.auth.token.email` and check a server-only tombstone `erased/{uid}` written by `deleteUser`; call `revokeRefreshTokens(uid)` before deleting the Auth user.

## BUG-180 · Expired-trash screen says "create a new account" while the email is still taken
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S03 (admin2@) — S03-12, 2 runs.
- **Steps to reproduce:** Trash an account, back-date `deletedAt` 31 days (day 31, before the nightly purge) → the user reloads /app → Log out → Register with the same email.
- **Expected:** The copy matches reality: the email stays registered until the purge runs, and support can still recover the account.
- **Actual:** "…can no longer be recovered. Log out and create a new account" → Register says "Email already registered"; meanwhile an admin Restore still works and brings the data back.
- **Effect on user accounts / the user app:** A confusing dead end for a user returning on day 31, who is told recovery is impossible when it isn't.
- **Suggested fix (proposal only):** Reword the expired branch of `src/components/RestoreAccount.jsx` (~L17–21) ("…can no longer be restored by you. Contact support, or wait up to 24 h before registering again"); optionally enforce the window in `restoreUser`.

## BUG-181 · Announcement dismissal is per browser and per text, so later users and escalations miss it
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S01 (admin@) — S01-20, 2x; S02 (admin@) — S02-03, 2x.
- **Steps to reproduce:** (a) Publish a Critical announcement; p04 dismisses it → Logout → log in as p05, then p06. (b) p05 dismisses an Info announcement; the admin changes only the level to Warning, then Critical.
- **Expected:** Dismissal is per user, and a level escalation (at least to Critical) shows again; Critical is announced to screen readers.
- **Actual:** (a) p05 and p06 never see it: one device-wide key `ci-announcement-dismissed` survives logout. (b) No banner: the key is a hash of the text only. The banner is `role="status"` for every level.
- **Effect on user accounts / the user app:** On a shared device only the first user sees a critical notice, and an escalated notice reaches nobody who saw the earlier version.
- **Suggested fix (proposal only):** In `src/utils/announcement.js` key the dismissal by uid and by `level + "|" + text` (or clear it on logout); in `src/components/AnnouncementBanner.jsx:21` use `role="alert"` for critical; consider making critical non-dismissible.

## BUG-182 · A long unbroken word in an announcement makes the user app scroll sideways
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S02 (admin@) — S02-11, 2x.
- **Steps to reproduce:** Save an active announcement with a 260-character unbroken token → open /app at 375 px.
- **Expected:** The banner breaks the word.
- **Actual:** `.ann-banner` is 1,774 px wide in a 358 px viewport; the whole page scrolls sideways (the × stays reachable). Normal URLs wrap at their slashes.
- **Effect on user accounts / the user app:** Layout only, triggered by admin-typed text.
- **Suggested fix (proposal only):** `overflow-wrap:anywhere` on the `.ann-banner` text in `src/styles/app.css` (the same gap as BUG-111).

## BUG-183 · Settings forms save invalid values with "Saved ✓"
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S01 (admin@) — S01-12; S02 (admin@) — S02-06 (AI, API keys and Email drill-ins).
- **Steps to reproduce:** (a) Plans & pricing → Starter Portfolios: type `-2` → Save plans. (b) AI → base URL `javascript:alert(1)`, monthly cap `-500` → Save. (c) API keys → Sentry DSN `test-dummy-key`. (d) Email → from `not-an-email`, port `99999`.
- **Expected:** Inline validation; nothing invalid is saved.
- **Actual:** (a) "Saved ✓" and Starter portfolios became 2 for every user (by code, a cleared field becomes 0). (b) The URL is stored verbatim; the cap silently snaps back to 5000. (c) The DSN is stored, but the form shows it as empty and Overview says "not configured". (d) The from-address is stored as typed; the port silently becomes 65535. Plans inputs have unassociated labels.
- **Effect on user accounts / the user app:** One slip in Plans & pricing changes caps or prices for every user on that tier at once. The AI and Email values matter at go-live.
- **Suggested fix (proposal only):** Keep raw strings in state and validate on Save in `src/components/admin-dashboard.jsx` (~L1300: integers ≥ 1 for limits, ≥ 0 for prices); show a confirm diff ("Starter portfolios 3 → 2 affects 11 users"); in `saveConfig` (`functions/index.js`) reject a non-`https://` AI base URL and return the effective cap. Related: BUG-045.

## BUG-184 · Landing "Usage" numbers don't follow the plan limits
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S02 (admin@) — S02-14 (code + one live change).
- **Steps to reproduce:** Settings → Plans & pricing → Starter Coins 30 → 1 → Save. The app enforces 1; open the landing page.
- **Expected:** The landing follows `config/app.plans`, or the admin card warns that the landing copy is separate.
- **Actual:** The static landing still promises "3 portfolios · 30 coins per portfolio · 300 transactions per coin", while the card says limits drive "what users see".
- **Effect on user accounts / the user app:** After any limit change, new visitors are promised limits the app doesn't give.
- **Suggested fix (proposal only):** Add "Landing page copy is static — update index.html 'Usage' too" under the Plans card in `src/components/admin-dashboard.jsx`, or render the Usage numbers from `/api/config`.

## BUG-185 · Lock explainer gives the wrong reason and remedy for an over-limit portfolio
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S06 (manager@) — S06-02, 3 variants. A similar "Upgrade … 1 coins" wording for a custom limit was seen in S05.
- **Steps to reproduce:** After a downgrade, tap a coin in the locked 4th portfolio (1 coin in it).
- **Expected:** "This portfolio is beyond your Starter plan's limit of 3 portfolios — delete a portfolio to unlock it."
- **Actual:** "Bitcoin is beyond your Starter plan's limit of 30 coins per portfolio … Upgrade to use it again, or remove other coins". Removing coins can't help, and the upgrade can't be bought (BUG-032). A Premium user is told to upgrade from the top plan. An open dialog re-renders with the new caps after a live upgrade instead of closing.
- **Effect on user accounts / the user app:** A misleading message to a downgraded user (deleting a portfolio does unlock it).
- **Suggested fix (proposal only):** In the lock-info modal in `src/CryptoIdea.jsx` (~L1299–1305) branch on `activePortLocked` with portfolio copy and "delete a portfolio"; say "a custom limit on your account" when `premiumLimits` drives the cap; hide "Upgrade" when `paidPlansEnabled` is false; close the dialog when the tier changes.

## BUG-186 · After a downgrade the alphabetically-last coins lock, not the newest
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S06 (manager@) — S06-09, 2x.
- **Steps to reproduce:** A Premium throwaway with 31 coins added in order coin-1 … coin-31 → STARTER (cap 30); then Premium with custom Coins = 29.
- **Expected:** The newest coins lock (coin-31, then coin-30 + coin-31), as `useUpgrade.js` describes.
- **Actual:** "QA S06 Coin 9" locks, then Coin 8 + Coin 9: coins are read without `orderBy`, so "array order" is doc-id order.
- **Effect on user accounts / the user app:** Which holding a user loses access to depends on how its id is spelled (an oldest `zcash` locks before a newest `bitcoin`).
- **Suggested fix (proposal only):** Sort by `addedAt` before `lockedCoinIds(...)` in `src/CryptoIdea.jsx` (~L704), or add `orderBy("addedAt")` to the coin queries in `src/api/firebase-database.js` (~L145/L204/L237/L490).

## BUG-187 · An open "Downgrade to which plan?" picker ignores a live tier change
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S06 (manager@) — S06-13, 2x.
- **Steps to reproduce:** p07 (Premium) opens Account → Plan & billing → Downgrade. A manager sets p07 to Pro, then Starter, while the picker is open.
- **Expected:** The picker closes or re-derives from the new tier.
- **Actual:** The page behind updates live, but the picker keeps offering "Pro · $9.99/mo" and "Starter" and "Your Premium access continues…" to a user who is now Pro, then Starter.
- **Effect on user accounts / the user app:** A user could pick a "downgrade" to the tier they already have, or to a paid tier above their new one, from a stale dialog.
- **Suggested fix (proposal only):** In the user-doc watcher in `src/CryptoIdea.jsx` (~L978) close `showDowngradeChooser` and reset `dgStep` when `server.tier` changes; `scheduleProDowngrade`/`cancelSubscription` refuse when the caller isn't above the target tier.

## BUG-188 · Learn shows a "1-day streak" days after the streak ended
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S04 (admin2@) — S04-15, 2x (user app and View as).
- **Steps to reproduce:** A user whose progress is `{streak:1, lastActivity:"2026-11-21"}` opens Learn on 2026-11-24; an owner opens View as for them.
- **Expected:** A missed day breaks the streak, so the chip is hidden or reads 0 until the next activity; View as shows the last active date.
- **Actual:** The app shows "🔥 1-day streak" and View as shows "1-day streak". `src/components/Learn.jsx` L142 renders the stored value with no date check, so any old streak shows forever.
- **Effect on user accounts / the user app:** Misleading gamification for every user who stops for a day or more.
- **Suggested fix (proposal only):** A pure `displayStreak(progress, today)` in `src/utils/learn.js`, used in `Learn.jsx`; show `lastActivity` in the View-as Learn row.

## BUG-189 · A repeated "Suspend" loses paid time from the frozen period
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S05 (manager@) — S05-12, 2x (simulated subscription).
- **Steps to reproduce:** `suspendUser(true)` at T0 → again at T1 (double-click, stale tab, two admins) → `suspendUser(false)` at T2.
- **Expected:** The subscription `endDate` moves by the whole frozen period T2−T0.
- **Actual:** Suspended 20 s → extended 10 s; suspended 12 s → extended 4 s. The second suspend overwrites `suspendedAt`. `endDate` also changes type from ms to an ISO string.
- **Effect on user accounts / the user app:** A paying user suspended twice loses that stretch of paid access when the sweep compares `endDate`.
- **Suggested fix (proposal only):** In `functions/index.js` `suspendUser` (~L1420) skip the `suspendedAt` write when the user is already disabled; keep `endDate` in one type in `functions/billing.js` `extendForSuspension`.

## BUG-190 · Admin "Forgot password?" mails any account a reset link to /admin
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S01 (admin@) — S01-01, 3x; lost first run — R1-S01-01, 2x.
- **Steps to reproduce:** /admin → Forgot password? → enter `free@test.com` → Send reset link; check the Auth emulator `oobCodes`.
- **Expected:** As the copy says ("If that email has an admin account…"), only admin accounts get a link.
- **Actual:** Non-admins get a PASSWORD_RESET code with `continueUrl=/admin`. An unknown email correctly gets nothing and the same message.
- **Effect on user accounts / the user app:** Anyone who knows a user's email can send them an unexpected "reset your password" mail that lands on /admin — confusing and phishing-adjacent. No account takeover.
- **Suggested fix (proposal only):** Route `src/api/admin-auth.js` `adminResetPassword` through a server callable that checks the admin claim before `generatePasswordResetLink` (keeping the generic reply), or reword the copy and drop the `/admin` continueUrl.

## BUG-191 · Admin sign-in reveals whether an email exists and whether a password is right
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S01 (admin@) — S01-09, 2x on /admin.
- **Steps to reproduce:** /admin sign-in with (1) an unknown email, (2) admin@ + a wrong password, (3) a normal user's real email and password.
- **Expected:** One generic "Email or password is incorrect" for (1) and (2); for (3) a generic "not authorized" that doesn't confirm the password.
- **Actual:** "No account with this email", "Incorrect password", and "This account isn't an admin" (which confirms a valid user login).
- **Effect on user accounts / the user app:** /admin becomes an email-enumeration and credential-check oracle for ordinary user accounts. (The user-app login part is BUG-093.)
- **Suggested fix (proposal only):** Map `user-not-found`, `wrong-password` and `invalid-credential` to one message in `src/api/admin-auth.js` `adminErrorMessage`; keep email-enumeration protection on in production Identity Platform.

## BUG-192 · "Download all my data" omits admin notes; privacy policy doesn't mention staff access
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S04 (admin2@) — S04-05, 2x (also observed in S06 and S07).
- **Steps to reproduce:** Save a private note on a user → as that user call `exportMyData` → search the JSON. Read `privacy.html`.
- **Expected:** A decision on whether a subject-access export includes staff notes and access logs (GDPR Art. 15), and a policy that says staff can open account data.
- **Actual:** The export has `account/profile/portfolios` only (no leak). `privacy.html` says content "is not visible to other users" and never mentions owner View as, manager reads (BUG-145) or staff notes, while the Journal says it is "visible only to you and the CryptoIdea team".
- **Effect on user accounts / the user app:** No app effect; a legal/compliance gap to decide.
- **Suggested fix (proposal only):** Decide in `docs/product/LEGAL.md`; add a staff-access sentence to `privacy.html`; if included, add `adminNotes/{uid}.note` (and optionally audit entries about the uid) to `exportMyData` in `functions/index.js`.

## BUG-193 · Suspend / Un-suspend fire on one click or keypress, no confirm
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S08 (admin@) — S08-02, 2x (Enter and Space). Noted in passing in S01, S03 and S07.
- **Steps to reproduce:** Users → a user → keyboard focus on **Suspend** → Enter.
- **Expected:** A confirm step like "Delete account" has, or an Undo in the toast.
- **Actual:** "Suspended ✓" at once. Focus then drops to `<body>`, so a keyboard user's next Tab sequence easily lands on Suspend again.
- **Effect on user accounts / the user app:** One accidental keypress locks a real user out until someone notices.
- **Suggested fix (proposal only):** In `src/components/admin-dashboard.jsx` add an inline "Suspend {email}? Confirm / Cancel" row and "Undo" in the toast.

## BUG-194 · An interrupted bulk action is left half-applied with no record
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S04 (admin2@) — S04-08, 2x + a control.
- **Steps to reproduce:** Users → Select page (8 users) → bulk **Pro** (or Suspend) → reload the page ~0.3 s later.
- **Expected:** The bulk runs server-side as one job, or the page warns before leaving and shows the result afterwards.
- **Actual:** 3 of 8 became Pro; in run 2, 4 of 8 were suspended. There is no `beforeunload` guard and no bulk record. Any per-row failure is reported as "skipped (owners are protected)", even for a normal user.
- **Effect on user accounts / the user app:** A random subset of users gets the change (here 4 personas were locked out), and the admin must diff the list to find which.
- **Suggested fix (proposal only):** In `src/hooks/useAdminDashboard.js` (~L698–717) register `beforeunload` while the loop runs, show "3/8…", report real failure messages; longer term, a server-side bulk callable with one "bulk" audit entry.

## BUG-195 · A suspended account can be granted manager, then can't be un-suspended
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S09 (admin@) — S09-06, 2x.
- **Steps to reproduce:** Suspend a user → grant manager → Un-suspend.
- **Expected:** The grant is refused for a disabled account, or un-suspending an admin is allowed.
- **Actual:** The grant succeeds (roster "SUSPENDED · MANAGER"); Un-suspend fails with "Can't **suspend** an admin account — remove their admin role first". The only way back is revoke → un-suspend → re-grant.
- **Effect on user accounts / the user app:** Admin-only — no user impact.
- **Suggested fix (proposal only):** In `functions/index.js` `setManagerRole` refuse when `userRecord.disabled`; in `suspendUser` (~L1398) apply the admin-target guard only when `disabled === true` and fix the verb.

## BUG-196 · Audit names targets by uid, and Users search can't find a uid
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S01 (admin@) — S01-04; S06 (manager@) — S06-10. Re-seen in S03, S04, S05, S07, S08 and S09.
- **Steps to reproduce:** Audit → search `p07.altcoin` (2 entries) vs p07's uid prefix (9 entries). Copy a target uid from an audit row → Users search.
- **Expected:** Searching a user's email finds every entry about them, and a uid from the audit leads to the account.
- **Actual:** Tier, limits, note and suspend rows store only the target uid, so an email search misses them; Users search returns "0 users" for a uid. Only the Users CSV `UID` column links the two.
- **Effect on user accounts / the user app:** Admin-only — an investigation of "who changed this user's plan?" misses entries.
- **Suggested fix (proposal only):** Store `targetEmail` in `writeAudit` (`functions/index.js`) or resolve it in `listAudit`, and add it to the Audit search; include `uid` in the Users search predicate (`src/components/admin-dashboard.jsx` ~L1007).

## BUG-197 · Refused admin calls leave no audit trail
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S05 (manager@) — S05-05, 2 runs (~28 refusals). Re-seen in S07 (11 refusals, 0 entries) and S09.
- **Steps to reproduce:** As a manager call owner-only callables (`getAdminConfig`, `saveConfig`, `setManagerRole`, `deleteUser`, …) → open the Audit tab.
- **Expected:** A refused privileged action is recorded, since it is what an owner most needs to see.
- **Actual:** Zero entries for any refusal.
- **Effect on user accounts / the user app:** Admin-only — owners can't spot a curious or compromised manager. Same class as BUG-006.
- **Suggested fix (proposal only):** In `assertRole` / `assertTargetAllowed` (`functions/index.js`) write a rate-limited `deniedAdminCall` audit entry for an authenticated admin caller.

## BUG-198 · Concurrent changes are both audited as "from" the same old value
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S04 (admin2@) — S04-14, 2x.
- **Steps to reproduce:** Two parallel `setUserTier` calls set the same Starter user to Pro and to Premium.
- **Expected:** The audit shows the real sequence (`free→pro`, then `pro→premium`).
- **Actual:** Both rows read "from free" (`free→pro`, `free→premium`); parallel suspends log `disabled: true→true`.
- **Effect on user accounts / the user app:** Admin-only — the final state is consistent, but reverting "by hand" from the diff would restore the wrong value.
- **Suggested fix (proposal only):** Read and write inside one `db.runTransaction` in `setUserTier` (~L1322–1326) and the other diffed mutations; optionally accept an `expectedTier`.

## BUG-199 · Repeated clicks send and audit no-op changes ("pro→pro")
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S01 (admin@) — S01-18, 2x. Re-seen in S04 (bulk bar, View as "Open", "Capture now"), S05, S07 and S09 (no-op grant/revoke rows).
- **Steps to reproduce:** Users → a user → click PRO three times quickly, or click the current tier in a stale tab.
- **Expected:** Buttons are disabled from the first click, and the server returns early when nothing changes.
- **Actual:** Three `setUserTier` calls and audit rows `free→pro`, `pro→pro`, `pro→pro`. The same happens for bulk, View as (3 audited views) and `restoreUser` on an active account (`deleted: false→false`).
- **Effect on user accounts / the user app:** Mostly admin-side audit noise, but each repeat also fires an extra live "Your plan is now…" event in the user's open app; risky if the pattern is copied to a billing action.
- **Suggested fix (proposal only):** Set `busy` before the call in `src/components/admin-dashboard.jsx` (~L864) and on the bulk and View-as buttons; in `functions/index.js` return early without writing or auditing when the value doesn't change.

## BUG-200 · Overview revenue and coin figures count the wrong accounts
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S01 (admin@) — S01-08; S07 (manager@) — S07-01, 2x + a trash variant; S09 (admin@) — S09-05, 3x.
- **Steps to reproduce:** Overview → Est. Monthly Revenue and COINS TRACKED; compare with the users' Billing cards and Firestore. Set a user to Pro, then grant them manager.
- **Expected:** Revenue counts only live paid subscriptions (or is labelled "including comps"), and every user figure uses the same population.
- **Actual:** Revenue counts admin-comped tiers with no subscription ("$58" when real revenue is $0) and drops a paying user once they are made a manager. COINS TRACKED counts admins' and trashed accounts' coins while users and portfolios exclude them, so "avg/user" mixes populations.
- **Effect on user accounts / the user app:** Admin-only — the founder's revenue and growth figures (and the daily `statsDaily` snapshot) are off.
- **Suggested fix (proposal only):** In `functions/index.js` `gatherStats` (~L1064–1099) count a payer only with an active subscription (list comps separately), add admins' paid tiers to revenue or label the card, and sum per-portfolio `coinCount` for the non-admin, non-deleted users already iterated.

## BUG-201 · Growth and job-status labels don't match their data
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S04 (admin2@) — S04-03, 2x. Also seen in the S09 timeline.
- **Steps to reproduce:** Overview → Growth → **Capture now**; read the Growth card and the status strip.
- **Expected:** Labels that match the data.
- **Actual:** "Signups yesterday" is really the 24 h before the capture; the strip header says "Scheduled jobs: never run" while its own pill says "Trash cleanup 2h ago"; the "Daily stats" pill stays "never" after a manual capture.
- **Effect on user accounts / the user app:** Admin-only — misleading numbers.
- **Suggested fix (proposal only):** In `src/components/admin-dashboard.jsx` relabel (~L686: "Signups in the 24 h before capture") and summarise job states by count (~L532).

## BUG-202 · Overview counts and revenue never refresh after a change
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S06 (manager@) — S06-07, 3x. Re-seen in S03, S07, S08 and S09.
- **Steps to reproduce:** Overview → Users → change a tier → Overview → click "Refresh".
- **Expected:** The tier cards, breakdown and revenue update (the pill says "Live Data").
- **Actual:** The numbers stay at their page-load values; the Refresh button only re-fetches job status. Only a full reload updates them.
- **Effect on user accounts / the user app:** Admin-only — stale numbers labelled "Live Data".
- **Suggested fix (proposal only):** Expose `loadStats()` from `src/hooks/useAdminDashboard.js` (~L427) and call it from the Refresh button and after successful mutations, or relabel the button "Refresh jobs".

## BUG-203 · User-detail Billing card and counters go stale after a tier change
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S06 (manager@) — S06-06, 3 cases. Re-seen in S04, S07, S08 and S09.
- **Steps to reproduce:** Users → pro@ (Billing "ACTIVE · Manual upgrade") → STARTER → PRO, without reopening the detail.
- **Expected:** The Billing card, counters and custom-limit fields re-derive with the tier.
- **Actual:** A Starter user reads "ACTIVE · Manual upgrade"; a Pro user reads "No active subscription (free tier)"; counters don't move; after an upgrade the custom-limit inputs show "default" while the user is capped by a hidden override (BUG-152).
- **Effect on user accounts / the user app:** Admin-only display, but it can hide an active restriction on the user.
- **Suggested fix (proposal only):** Re-run `lookupUser` after `setUserTier` in `src/hooks/useAdminDashboard.js` so `found` (billing, counters, `premiumLimits`) is fresh.

## BUG-204 · Toasts and the CSV use internal tier ids ("free", "pro")
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S01 (admin@) — S01-10, 2x. Re-seen in S05, S06, S07 and S09.
- **Steps to reproduce:** Users → tick two users → bulk Pro, then Starter.
- **Expected:** "Starter / Pro / Premium", as everywhere else.
- **Actual:** "Set 2 users to pro ✓", "Set 2 users to free ✓"; the Users CSV Tier column and the kill-switch toasts ("marketData DISABLED") use raw ids too.
- **Effect on user accounts / the user app:** Admin-only, cosmetic.
- **Suggested fix (proposal only):** Use the `{free:"Starter",pro:"Pro",premium:"Premium"}` label map in the bulk handler and toasts in `src/components/admin-dashboard.jsx` / `useAdminDashboard`.

## BUG-205 · Announcement level buttons don't show the selected level
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S01 (admin@) — S01-11, 2x. Re-seen in S02.
- **Steps to reproduce:** Settings → Announcement banner → click INFO / WARNING / CRITICAL; clear the message.
- **Expected:** The selected level is visible and exposed (`aria-pressed`); the switch turns off with an empty message.
- **Actual:** The three buttons look identical (no `.adm-seg .opt.on` style); with the message cleared the "Show the banner" switch stays visually ON and can't be turned off (the save still stores `active:false`).
- **Effect on user accounts / the user app:** Admin-only.
- **Suggested fix (proposal only):** Add an `.on` style and `aria-pressed` in `src/styles/admin-settings.css` (~L317) and `src/components/admin-dashboard.jsx` (~L1396); show the switch off when the text is empty (~L1408).

## BUG-206 · Saved views: native prompt freezes the tab, silent overwrite, shared by all admins
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S01 (admin@) — S01-15; S04 (admin2@) — S04-07, 2x; S07 (manager@ / admin@) — S07-05, 2x. The prompt freeze was re-seen in S07.
- **Steps to reproduce:** Users → choose a filter → **+ Save view**. Save twice with the same name. Log out and sign in as another admin in the same browser.
- **Expected:** An in-page name field; "replace it?" for a duplicate name; views per operator, as ADMIN-5 describes.
- **Actual:** A native `window.prompt()` freezes the page (the automation tab hung); a duplicate name silently replaces the view; one browser-wide key `ci-admin-user-views` is shared by every admin, who can see and delete each other's views (which can hold user emails as search terms).
- **Effect on user accounts / the user app:** Admin-only; a minor privacy leak between staff on a shared device.
- **Suggested fix (proposal only):** Replace the prompt (`src/components/admin-dashboard.jsx` L984) with an inline field; return a "duplicate" flag from `src/utils/admin-views.js` and confirm inline; key the storage by operator uid (`ci-admin-user-views:${uid}`).

## BUG-207 · Admin panel keyboard and screen-reader gaps
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S01 (admin@) — S01-16; S02 (admin@) — S02-09; S08 (admin@) — S08-03; lost first run — R1-S01-05. Re-seen in every session.
- **Steps to reproduce:** Use the panel by keyboard and screen reader: the tab bar, Settings switches, a Users row, the step-up and Settings unlock prompts, typed-DELETE confirms.
- **Expected:** Tab semantics, named switches with state, focus moved into drill-ins, Escape cancels prompts and confirms, Enter submits one-field forms, every control named.
- **Actual:** No `tablist`/`aria-selected` on the tab bar; every Settings switch is named "on"; focus drops to `<body>` after opening a row, a tier change or an action; Escape doesn't close the unlock prompts, drill-ins or DELETE confirms (none are dialogs); Enter doesn't submit typed-DELETE confirms; the Trash confirm's ✕ and input have no names; the bulk bar isn't announced.
- **Effect on user accounts / the user app:** Admin-only — keyboard and screen-reader admins struggle (the admin counterpart of BUG-075 / BUG-113).
- **Suggested fix (proposal only):** In `src/components/admin-dashboard.jsx`: tab semantics and `aria-current`; `role="switch"`, `aria-checked` and `aria-labelledby` on `Switch`; focus the DScreen title on open; render the unlock prompts through the shared `Modal`; wrap typed confirms in `<form onSubmit>` with Escape → Cancel and `aria-label`s.

## BUG-208 · On a phone the "Delete now" confirm hides which account is being erased
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S03 (admin2@) — S03-04, 2x (375 px).
- **Steps to reproduce:** Admin panel at 375 px → Trash → **Delete now**.
- **Expected:** The irreversible confirm names the account in full.
- **Actual:** The input, OK and ✕ squeeze the row so the name and email shrink to "qa-adm-…"; the confirm text has no account name; the row buttons have no account-specific `aria-label`.
- **Effect on user accounts / the user app:** It raises the chance of permanently erasing the wrong account from a phone.
- **Suggested fix (proposal only):** In the Trash row in `src/components/admin-dashboard.jsx`, wrap the confirm onto its own line, say "Type DELETE to erase {email} forever", and add an account-specific `aria-label` to each row button (e.g. "Delete {email} now").

## BUG-209 · View-as reason and note fields: no label, no length limit, non-string reasons accepted
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S04 (admin2@) — S04-13, 2x + 3 server calls.
- **Steps to reproduce:** Inspect the View-as reason input and the note textarea; press Enter in the reason; call `viewUserAsAdmin` with a 5,000-char reason or `reason:{x:1}`.
- **Expected:** Real labels; a `maxLength` matching what the audit keeps; Enter submits; a reason must be a string.
- **Actual:** Placeholder-only fields; no `maxLength` on the reason; Enter does nothing; the audit keeps ~350 chars; `{x:1}` is audited as "[object Object]" and `42` as "42".
- **Effect on user accounts / the user app:** Admin-only — accessibility and audit quality.
- **Suggested fix (proposal only):** Labels and `maxLength={300}` in `src/components/admin-dashboard.jsx`, with the reason and Open in a `<form>`; on the server, `typeof reason === "string"` with a trimmed length of 5–300 in `viewUserAsAdmin`.

## BUG-210 · "View as" prints raw numbers and dates and leaves out research findings
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S04 (admin2@) — S04-04, 2x per part.
- **Steps to reproduce:** Users → p09 (or p08, qa-adm-05) → View as → Open.
- **Expected:** Amounts, prices and dates formatted like the user app; the journal's research findings shown; portfolios in the user's order with the active one and any over-limit state.
- **Actual:** "BUY 1e-8 @ $70 · 2026-11-21T17:15"; `journal.funnel` is in the payload but not rendered; portfolios come in doc-id order with no active or over-limit marker.
- **Effect on user accounts / the user app:** Admin-only — support can misread amounts or times and can't see what the user sees.
- **Suggested fix (proposal only):** Reuse `src/utils/money.js` and the app's date formatters in the View-as renderer in `src/components/admin-dashboard.jsx`; render `funnel`; sort by `order`.

## BUG-211 · Long unbroken text makes the admin panel scroll sideways
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S04 (admin2@) — S04-11; S07 (manager@) — S07-09, 2x + 375 px.
- **Steps to reproduce:** (a) A user saves a 1,500-character unbroken thesis → admin View as. (b) Paste a 300-character unbroken string into the Users search.
- **Expected:** Text wraps; controls stay inside the shell.
- **Actual:** (a) `.adm-viewas-body` scrollWidth is 17,860 vs 303. (b) The "0 users matching …" label pushes "Select page" and "Export CSV" off-screen (1,478 px wide at 375 px).
- **Effect on user accounts / the user app:** Admin-only layout.
- **Suggested fix (proposal only):** In `src/styles/admin-settings.css` add `overflow-wrap:anywhere` to `.adm-viewas-body`, and `min-width:0; overflow-wrap:anywhere` to `.adm-count-row .adm-count` (~L282–286), or cap the echoed query.

## BUG-212 · `viewUserAsAdmin` lets an owner open other admins' data
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S04 (admin2@) — S04-12, 2x + self. Also seen in S09.
- **Steps to reproduce:** As an owner, `lookupUser("admin@test.com")` → `viewUserAsAdmin({uid, reason})`; the same for manager@ and for yourself.
- **Expected:** Refused like every other admin-target action, or a written policy that owners may inspect each other.
- **Actual:** 200 with the other admin's portfolios and theses (audited).
- **Effect on user accounts / the user app:** Admin-only (policy decision).
- **Suggested fix (proposal only):** Add `await assertTargetNotAdmin(uid, "view")` to `exports.viewUserAsAdmin` in `functions/index.js`.

## BUG-213 · Owners get an unasked "Confirm your password" prompt on every page load
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S04 (admin2@) — S04-02, 6x. Re-seen in S03, where it is how BUG-149 is triggered.
- **Steps to reproduce:** Be signed in as an owner for more than ~10 minutes → reload /admin.
- **Expected:** The Overview loads; a password is asked only for Settings or a sensitive action.
- **Actual:** "Confirm your password — Settings, API keys, plans and admin access…" appears over the Overview on load, because `loadConfig()` runs for every owner (`src/hooks/useAdminDashboard.js` ~L440–447).
- **Effect on user accounts / the user app:** Admin-only; it trains owners to type their password into prompts they didn't trigger.
- **Suggested fix (proposal only):** Load the config lazily when Settings opens, in a mode that shows a padlock instead of prompting.

## BUG-214 · Configuration card says "PayPal connected" for any saved keys
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S02 (admin@) — S02-07, 2x.
- **Steps to reproduce:** Settings → API keys → PayPal Client ID and Secret `test-dummy-*` → Save → Settings home.
- **Expected:** "PayPal keys saved (not verified)" unless a credential check succeeded.
- **Actual:** A green "PayPal connected"; the same card treats a junk Sentry DSN as "not set".
- **Effect on user accounts / the user app:** None now; at go-live an owner could believe checkout works when it would fail for users. Related: BUG-010.
- **Suggested fix (proposal only):** Say "keys saved" in `src/components/admin-dashboard.jsx` unless `getAdminConfig` exposes a `lastVerifiedAt` from a successful PayPal OAuth call.

## BUG-215 · "Forgot it?" copy points at a reset button that isn't there
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S02 (admin@) — S02-13, 2x.
- **Steps to reproduce:** Settings → Settings password while it is "Not set".
- **Expected:** No "Forgot it?" paragraph until a password exists.
- **Actual:** The footer says "Use “Email me a reset link” above", but that button isn't shown.
- **Effect on user accounts / the user app:** Admin-only copy.
- **Suggested fix (proposal only):** Render that paragraph only when `settingsAuth.set` in the Settings-password drill-in (`src/components/admin-dashboard.jsx`).

## BUG-216 · Settings home shows an unsaved announcement draft as "On"
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S08 (admin@) — S08-04, across 2 saves.
- **Steps to reproduce:** Announcement banner → type text, switch it ON, don't Save → ‹ Back → toggle another switch.
- **Expected:** The home row shows the saved state, or marks the draft "unsaved"; leaving warns.
- **Actual:** The row reads "On · info" while nothing is published; a reload drops the draft silently. (Other saves correctly don't leak the draft.)
- **Effect on user accounts / the user app:** None directly; an owner can believe a banner is live when users see nothing.
- **Suggested fix (proposal only):** Derive the home-row status from the saved config in `src/components/admin-dashboard.jsx`, or append "· unsaved".

## BUG-217 · `restoreUser` and `saveUserNote` let a manager write to owner accounts
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S05 (manager@) — S05-01, 2x each. The self-note variant was re-seen in S07.
- **Steps to reproduce:** As a manager call `restoreUser(<owner uid>)` and `saveUserNote(<owner uid>, "…")`; call `getUserNote` on your own uid.
- **Expected:** "A manager may not act on an owner at all", as every other manager mutation enforces.
- **Actual:** Both succeed: `deleted:false, deletedAt:null` are written onto the owners' docs, and a manager can attach (and read, and erase) notes on owners and on themselves.
- **Effect on user accounts / the user app:** Admin-only boundary inconsistency; no user-app effect.
- **Suggested fix (proposal only):** In `functions/index.js` `restoreUser` (~L1471) and `saveUserNote` (~L1639) call `assertTargetAllowed(uid, callerRole, "protected")`. The `restoreUser` write itself (no phantom doc, no write when not trashed) is fixed under BUG-164.

## BUG-218 · Managers see "Delete now" and "Empty trash", which always fail
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S05 (manager@) — S05-02, 3x; lost first run — R1-S05-02 (code read). Re-seen in S06 and S07.
- **Steps to reproduce:** As a manager: Trash → Delete now → DELETE → OK; Empty trash → DELETE → Delete 1.
- **Expected:** Neither control renders for a manager (the panel says permanent deletion is owner-only).
- **Actual:** Both render; the server refuses ("Owners only… [403]"); Empty trash shows only "Emptied 0 — 1 failed". The user-detail hint also tells a manager to erase "from the Trash tab".
- **Effect on user accounts / the user app:** None — the server boundary holds.
- **Suggested fix (proposal only):** Wrap both in `{isOwner && …}` in `src/components/admin-dashboard.jsx` (~L1084–1128), change the copy for managers, and show the first failure reason in the `emptyTrash` toast.

## BUG-219 · User-detail hint says admins "can never be demoted"
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S07 (manager@) — S07-03, 2x.
- **Steps to reproduce:** Users → any user → read the hint under Delete account.
- **Expected:** Copy that matches the role model: owners are permanent; managers can be revoked.
- **Actual:** "Admin accounts can never be deleted or demoted."
- **Effect on user accounts / the user app:** None (admin copy).
- **Suggested fix (proposal only):** `src/components/admin-dashboard.jsx` L943 → "Owner accounts can never be deleted or demoted; admin accounts can't be suspended, re-tiered or trashed."

## BUG-220 · Owner targets are told to "remove their admin role first"
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S03 (admin2@) — S03-03, 2x.
- **Steps to reproduce:** As an owner call `suspendUser` / `setUserTier` / `setPremiumLimits` / `adminSignOutUser` on another owner or on yourself.
- **Expected:** "Owner accounts are protected", as trash and delete already say.
- **Actual:** "Can't suspend an admin account — remove their admin role first. [400]" — advice an owner can't follow from the panel.
- **Effect on user accounts / the user app:** None (correctly refused).
- **Suggested fix (proposal only):** In `functions/index.js` `assertTargetNotAdmin` (~L307) branch on `customClaims.role === "owner"`.

## BUG-221 · A network failure shows the toast "internal [0]"
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S05 (manager@) — S05-10, 2x. Re-seen in S04 and S07.
- **Steps to reproduce:** Make requests to the functions port fail (a dropped connection) → click a tier or Suspend.
- **Expected:** "Couldn't reach the server — nothing was changed."
- **Actual:** "internal [0]" (nothing was changed).
- **Effect on user accounts / the user app:** Admin-only.
- **Suggested fix (proposal only):** Map `functions/internal` with status 0 / "Failed to fetch" to a network message in the admin toast path (`src/hooks/useAdminDashboard.js` or `src/api/admin.js`), as `src/utils/errors.js` does for the user app.

## BUG-222 · Clicking "Users" while a user detail is open does nothing
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S06 (manager@) — S06-12, 2x. Re-seen in S02, S03, S04, S07 and S09 — in S09 it caused a real wrong-target "Move to trash" on p01.
- **Steps to reproduce:** Users → open a user → click the "Users" tab.
- **Expected:** Back to the list; browser Back closes the drill-in.
- **Actual:** Nothing happens; the drill-in adds no history entry, so browser Back leaves the admin app.
- **Effect on user accounts / the user app:** Navigation friction, and a wrong-target hazard: the next action lands on the user who is still open.
- **Suggested fix (proposal only):** In `src/components/admin-dashboard.jsx` the tab-bar `onClick` (L474) also calls `closeUser()` (L433) when `tb === "users"`.

## BUG-223 · A real admin whose token refresh fails is told "This account isn't an admin"
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S07 (manager@) — S07-07, 2x.
- **Steps to reproduce:** A manager is signed in; make the token-refresh request fail once (a network blip) on /admin load.
- **Expected:** "Couldn't verify your admin access — check your connection" with a Retry button.
- **Actual:** "This account isn't an admin. … sign out and sign back in"; a plain reload shows the full panel.
- **Effect on user accounts / the user app:** Admin-only.
- **Suggested fix (proposal only):** In `src/admin-main.jsx` (L50–59) add an "error" phase for the catch branch with Retry; keep "denied" for a missing claim; give the denied card `role="alert"`.

## BUG-224 · Admin access roster doesn't refresh after a grant or revoke
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S09 (admin@) — S09-01, 4x; orchestrator — E2 (the grant to p01 at 17:11).
- **Steps to reproduce:** Settings → Admin access → search → grant ("Confirm — grant manager"), or "Remove manager access".
- **Expected:** The ADMINS roster on the same screen updates.
- **Actual:** After the p01 grant the roster didn't show p01; after revoking p01 it still listed "MANAGER"; granted throwaways were missing. Re-opening the drill-in fixes it.
- **Effect on user accounts / the user app:** Admin-only; the owner can't confirm the change and may repeat it.
- **Suggested fix (proposal only):** Call `loadAdmins()` after a successful `setManagerRole` in `src/hooks/useAdminDashboard.js` `setManager` (~L593).

## BUG-225 · "Remove manager access" fires on one click, then shows the grant form
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S09 (admin@) — S09-02, 5x (incl. keyboard-only). Also seen in S03.
- **Steps to reproduce:** Admin access → search a manager → click (or Tab + Enter on) "Remove manager access".
- **Expected:** A confirm step like the grant has; afterwards a clear "Not an admin" state.
- **Actual:** The revoke fires at once; the card then shows "Re-type … to confirm / Continue" (the grant flow) above "Manager access removed ✓"; focus drops to `<body>`; the status isn't in a live region. A stale card's revoke on an already-revoked account audits `role: (none)→(none)`.
- **Effect on user accounts / the user app:** Admin-only — a one-keystroke revoke of a colleague and a confusing follow-up.
- **Suggested fix (proposal only):** Add an inline confirm in `src/components/admin-dashboard.jsx` (~L1556), a neutral card afterwards and `grantMsg` in `role="status"`; `setManagerRole` returns early when nothing changes.

## BUG-226 · A revoked admin's open panel keeps its manager header instead of the denied screen
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S09 (admin@, throwaway manager qa-adm-06) — S09-07, 2x.
- **Steps to reproduce:** A manager's /admin is open → an owner revokes → once the token refreshes, use the panel.
- **Expected:** The panel switches to "This account isn't an admin" on the first permission-denied.
- **Actual:** The header still says manager and the panel never switches to the denied screen; a row click does nothing. The lists show "Admins only. [403]", "0 users", "No users found." and "0 entries" — that half is the same list-error-shown-as-empty render path as BUG-175 (b) and is fixed there.
- **Effect on user accounts / the user app:** Admin-only; the revoked admin isn't told they lost access (and, via BUG-175, "0 users" reads like data loss).
- **Suggested fix (proposal only):** On any `permission-denied` in `src/hooks/useAdminDashboard.js` re-run `getAdminRole({force:true})` and route to the denied phase in `src/admin-main.jsx`.

## BUG-227 · Detail of an admin account still offers tier and sign-out buttons
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** S09 (admin@) — S09-10, 2x.
- **Steps to reproduce:** An owner has Users open → another owner grants a listed user manager → open that user from the stale list → click PRO or "Sign out all devices".
- **Expected:** Tier, limits and sign-out are hidden like Suspend/Delete, or the admin is dropped from the list.
- **Actual:** The 🔒 notice shows and Suspend/Delete are hidden, but tier and sign-out are live and fail with raw "[400]" errors.
- **Effect on user accounts / the user app:** Admin-only.
- **Suggested fix (proposal only):** Gate the tier buttons, custom limits and "Sign out all devices" on `!found.isAdmin` in `src/components/admin-dashboard.jsx`; drop the row when `lookupUser` returns `isAdmin`.

## BUG-228 · `npm run start:all` reports success with zero functions loaded
- **Date:** 2026-11-24 · **Status:** ❌ Not resolved · **Severity:** Low
- **Found by:** Orchestrator — E1 (the lost first run, 11:46–12:07).
- **Steps to reproduce:** Cold-start `npm run start:all` on a Node 24 host (the functions request Node 22).
- **Expected:** All functions load, or the script fails loudly.
- **Actual:** The functions emulator logs "Failed to load function definition from source … Timeout after 10000"; every callable answers "function does not exist" and `/api/*` returns 404, yet the dev-stack script reports success. Restarting with `FUNCTIONS_DISCOVERY_TIMEOUT=120` works.
- **Effect on user accounts / the user app:** Dev tooling only — no user impact. (During the outage the user app showed mock prices as live: BUG-023.)
- **Suggested fix (proposal only):** In `scripts/dev-stack.js` set `FUNCTIONS_DISCOVERY_TIMEOUT` and fail loudly if "Loaded functions definitions" isn't seen.

---

## Known bugs re-confirmed

These existing BUG ids were seen again during this test. They keep their ids; no new id was created for them.

| ID | Title | Still present? | Sessions / finding |
|---|---|---|---|
| BUG-005 | Admin tab signs out every non-admin session | No — stays fixed | All sessions, incl. the lost first run |
| BUG-006 | PayPal webhook rejections aren't audited | Yes | S04 (S05-05 is a new finding of the same class) |
| BUG-010 | Admin config shows only set/unset flags | Yes (see BUG-214) | S02 |
| BUG-014 | Blocked signup shows "Something went wrong" | No — stays fixed | S02, S07 |
| BUG-020 | "Live sync was interrupted" toast during account setup | Yes — on almost every registration | S01, S02, S03, S04, S05, S06, S07, S08, S09 |
| BUG-021 | Search shows mock prices and the thesis saves them | Yes | S02 |
| BUG-023 | AUTO buy price can pre-fill the mock price | Yes — with `/api/prices` down, the Portfolio value card, asset card and Detail also show mock prices as live | R1-S07 (BUG-023 repeat), S06 |
| BUG-026 | Mixed minus signs in P/L | Yes | S07 |
| BUG-027 | Escape doesn't close the coin Detail popup | Yes | S08 (S05 mentions it but did not re-test) |
| BUG-031 | Name field strips accents, apostrophes and hyphens | Yes (digits too) | S01, S03 |
| BUG-032 | Upsell to a plan that can't be bought | Yes | S01, S02, S06 |
| BUG-034 | Deleted account's credentials stay in the login form | Yes — also after an admin erasure and a suspension | S01, S03, S04, S05, S09 |
| BUG-038 | Daily Brief always shows ▲ even when down | Yes | S02, S07 |
| BUG-039 | Un-suspend returned INTERNAL | No — stays fixed | S03, S06, S08, S09 |
| BUG-041 | Empty `/api/history` answer is cached for 24h | Yes — new trigger: the "Live market data" kill-switch; S02 rates it High (new trigger), matching BUGS.md's High | S02 (BUG-041 repeat) |
| BUG-051 | Dollar amounts render with three decimals | Yes | S06 |
| BUG-055 | Portfolio "INVESTED" uses lifetime gross buys | Yes | S01, S07 |
| BUG-058 | Plan & billing claims "AI research · Live" while AI is off | Yes | S01, S02, S06, S07 |
| BUG-060 | Portfolio value card overflows on phones | Yes (p09; not on p01) | S07 |
| BUG-062 | Search prompt loses a written thesis when the add fails | Yes — reachable through an admin downgrade | S06 |
| BUG-063 | "Download all my data" omits Learn progress | Yes | S07 |
| BUG-073 | A previous user's cached profile stays in localStorage | Yes | S01, S03, S04, S05, S07 |
| BUG-074 | Mouse-only click targets on cards | Yes — it hides the lock explainer from keyboard users | S06 |
| BUG-075 | Missing accessible names and ARIA states | Yes | S01 (S08-03 extends it in the admin app; see BUG-207) |
| BUG-080 | Passwords stay filled after errors and navigation | Yes | S04 (S03 and S05 cite it as the user-app counterpart of BUG-165) |
| BUG-087 | Header badges don't fit on 360–390px phones | Yes | S06 |
| BUG-092 | Account "Joined" shows the latest login date | Yes | S01-14, S04, S07 |
| BUG-093 | Login errors reveal whether an email is registered | Yes (user-app login; the admin side is BUG-191) | S01 (seen once on /app in S01-09; not cited by id) |
| BUG-095 | Stale plan-change toast after another account used the same tab | Yes | S01-03, S03, S04, S06, S07 |
| BUG-121 | Two-tap confirm pills auto-disarm and shrink | Yes | S03, S04, S07 |
| BUG-135 | Privacy card says "permanently delete" for a 30-day trash | Yes | S07 |
| BUG-138 | "Signed out of all devices" overstates it | Yes (the admin side is BUG-144 / BUG-146) | S03, S07 |

## Not bugs (by design)

Documented so they aren't "fixed" by mistake, or because the reports concluded the behaviour is expected.
- **S09-03** · Granting or revoking a manager calls `revokeRefreshTokens`, which would probably sign that person out of the user app at the next token refresh in production. The Auth emulator can't reproduce it, so it is unverified; check it on a real project.
- **E3** · Process note: the Claude-in-Chrome permission classifier refused the automated "Confirm — grant manager" click in S01, S07 and S08. Nobody worked around it; the founder-requested grant of p01 was done by the orchestrator at 17:11, and S09 covered the real manager flow.
- Turning maintenance OFF takes up to 60 s to clear for a reloading user (`/api/config` is cached with `max-age=60`), as documented.
- The signups switch lags ~60 s in an open Register tab (cached config), but the server refuses signups at once (`beforeCreateUser`).
- After `adminSignOutUser` the Auth emulator still refreshes revoked tokens, so the exact kick time can't be measured locally.
- Pub/Sub schedules don't fire on their own in the emulator; S09 triggered `purgeExpiredTrash` by hand.
- `devSetMyTier` lets a user self-upgrade, but only under `FUNCTIONS_EMULATOR==="true"`.
- Source IP is empty on every audit entry under the emulator (documented).
- Each user portfolio delete adds a "User repaired their counters · fixed=1" audit entry (`reconcileMyCounters`).
- The Users list is fetch-on-demand; a new portfolio shows after Refresh.
- Logging an admin or manager into /app for the first time runs the free-plan onboarding (`planChosen:true` + a default portfolio); harmless, since admins are excluded from the counts.
- A non-admin session stays on the /admin denied screen until Sign out (R31-1 "no auto-kill"); CLAUDE.md still says the admin login "signs out non-admins" (doc drift, not a bug).
- A Log out in one admin tab signs the other admin tab out and drops its unsaved draft (shared admin auth; correct).
- The admin and user ID tokens live in the same origin's IndexedDB (same-origin by design; worth remembering for any future XSS).
- Client Sentry also reports from localhost test sessions (by design per CLAUDE.md; consider turning it off in dev).
- A manager can confirm owner emails through `lookupUser`, and a newly promoted manager can read the audit rows about themselves (observations for the founder).
- A suspended user can still trigger a password-reset mail; login stays blocked.
- Three synchronous scripted `.click()`s send three calls, but a real double-click sends one (not reachable by a user).
- The CSV export prefixes `-1e5`, `-.5` and `-1,000` with `'` (a minor type nit; the formula guard works as designed).
- Users search doesn't normalise internal double spaces (nit, not filed).
- A self-write of `planChosen:true` that is already true returns 200 (a no-op).

## Data-leak and backend checks

| Check | Result | Linked bug |
|---|---|---|
| User-app bundle and loaded modules contain no admin code (S01, S04, S05, S07, S09; the built `dist/` in S04) | Pass | — |
| User token → 20–25 admin and owner callables (S01, S02, S04, S05, S07, S08) | Pass — all "Admins only. [403]" | — |
| Anonymous → `listUsers` | Pass — 401 | — |
| User token → server-only collections (`config`, `audit`, `adminNotes`, `statsDaily`, `health`, `rateLimits`, `aiBudget`, `settingsUnlock`, `webhookEvents`), other users' docs and collection-group queries | Pass — all 403 | — |
| User self-write of admin/billing fields on its own `users/{uid}` | Pass — all 403; only `name` is writable | — |
| User self-service callables with another user's uid | Pass — refused | — |
| `/api/config` after saving dummy secrets | Pass — public flags only, no secrets | — |
| Admin tab + user tab open together (sign-in, sign-out, denied screen, identity switches) | Pass — BUG-005 stays fixed | — |
| Admin notes readable by the user | Pass — 403; not in the user export | BUG-192 (compliance) |
| Manager → owner-only callables | Pass — all "Owners only" | — |
| Manager → owners via tier, limits, suspend, sign-out, trash | Pass — refused | — |
| Manager → owners via `restoreUser` / `saveUserNote` | Fail | BUG-217 |
| Manager Firestore read of all users' holdings, theses and Learn progress | Fail | BUG-145 |
| Revoked admin token on callables and rules | Fail | BUG-146 |
| Suspended / signed-out open session writes | Fail | BUG-144 |
| Maintenance mode blocks writes | Fail | BUG-156 |
| Trashed account writes | Fail | BUG-176 |
| GDPR erasure removes every record | Fail — the admin note and rate-limit docs survive | BUG-161 |
| Erased session can re-create its profile | Fail | BUG-179 |
| Admin callables with unknown or slash-path uids | Fail — phantom docs, writes into sub-docs | BUG-164 |
| Owner `viewUserAsAdmin` on other admins | Allowed (policy question) | BUG-212 |
| Config-diff redaction for managers (UI and raw `listAudit`) | Pass | — |
| Output encoding (announcement, notes, View-as fields, saved-view names, hostile user names) | Pass — rendered as text | — |
| CSV formula injection (Users and Audit exports) | Pass — `'=` prefix | — |
| Signups OFF enforced server-side (raw Auth signUp refused) | Pass | — |
| Unsigned PayPal webhook | 401, not audited | BUG-006 (known) |
| `devSetMyTier` | Emulator-only (gated) | — |
| Service worker caches `/api/**` | Pass — never | — |
| Same-origin storage | Cached profiles of past users and admin saved views are readable from the user app | BUG-073 (known), BUG-206 |

## Test runs

| Session | Account | Minutes | Start–end (local) | Report | Finding ids |
|---|---|---|---|---|---|
| S01 | admin@test.com (owner) | 70 | 12:08–13:18 | [s01](admin-tests/2026-11-24/s01-admin-owner-users-and-grant.md) | 20 |
| S02 | admin@test.com (owner) | 70 | 18:23–19:33 | [s02](admin-tests/2026-11-24/s02-admin-owner-settings-and-switches.md) | 14 (+1 known repeat) |
| S03 | admin2@test.com (owner) | 99 | 19:33–20:01, 21:21–22:32 | [s03](admin-tests/2026-11-24/s03-admin2-owner-moderation-and-trash.md) | 12 |
| S04 | admin2@test.com (owner) | 70 | 20:10–21:21 | [s04](admin-tests/2026-11-24/s04-admin2-owner-support-tools-and-leaks.md) | 15 |
| S05 | manager@test.com | 70 | 13:20–14:30 | [s05](admin-tests/2026-11-24/s05-manager-role-boundaries.md) | 13 |
| S06 | manager@test.com | 71 | 14:30–15:41 | [s06](admin-tests/2026-11-24/s06-manager-live-user-impact.md) | 13 |
| S07 | manager@test.com (stand-in; p01 not yet granted) | 70 | 15:41–16:51 | [s07](admin-tests/2026-11-24/s07-new-manager-p01-first-use.md) | 9 |
| S08 | admin@test.com (p01 grant blocked) | 18 | 16:51–17:10 | [s08](admin-tests/2026-11-24/s08-new-manager-p01-revoke-and-sweep.md) | 4 |
| S09 | p01.trader@test.com (manager), admin@ for the revoke | 70 | 17:12–18:23 | [s09](admin-tests/2026-11-24/s09-p01-real-manager-first-use-and-revoke.md) | 11 (incl. the S09-03 observation; +1 repeat of S07-04) |
| **Total** | | **608** | | | **113** session ids + 8 lost-run ids + 3 orchestrator ids → **87 new bugs** |

**Incidents**
- **Lost first run (11:46–12:07):** the functions emulator came up with no functions (BUG-228), so every session was blocked; 18 minutes of function-independent checks were done. Those reports are not kept in the repo; their findings appear here as R1-S01-01…05, R1-S05-01/02 and R1-S07. The stack was restarted with `FUNCTIONS_DISCOVERY_TIMEOUT=120`.
- **Network cut in S03:** the first attempt stopped at 20:01; the session resumed at 21:21 and repeated the lifecycle on other personas. A throwaway it trashed (qa-adm-36) was left in the Trash, expired.
- **Classifier refusal (S01, S07, S08):** the automated "Confirm — grant manager" click was refused; the orchestrator granted p01 at 17:11, and S09 ran the real manager flow (E3).
- **S02 side effect:** BUG-143 put the whole app into maintenance mode from 18:54 to 19:00 before it was noticed and reverted.
- **S06 tester incident:** a cleanup script deleted pro@'s seed "Portfolio 1"; it was recreated with the seed shape (only the `created`/`addedAt` timestamps differ).
- **S09 tester incident:** p01 was moved to the Trash by mistake at 17:24 (through BUG-222) and restored 40 s later.

**State the reports say was left changed**
- `planChosen:true` (and, for admins, a default portfolio) on admin@, admin2@, manager@, free@ and pro@.
- Empty `adminNotes` docs for p01, p04, p06, p09, manager@, qa-adm-05 and qa-adm-06; orphaned notes and ~81 `rateLimits` docs for erased throwaways (BUG-161 evidence).
- `deleted:false, deletedAt:null` fields on the owner docs, p01 and p02; p07 has `premiumLimits {}` instead of no field.
- Throwaways qa-adm-05 and qa-adm-06 remain (Starter, active); qa-adm-36 stays in the Trash.
- `statsDaily/2026-11-24` was written by "Capture now" (S04); the `health/jobs` Trash-cleanup heartbeat now shows a run (S09).
- Per-device leftovers: `ci-announcement-dismissed` in the test Chrome profile; two stray tabs from S01 had to be closed by hand.
- All global switches, plans, secrets and the Settings password were restored to their starting values, and p01 ended as a normal user.
