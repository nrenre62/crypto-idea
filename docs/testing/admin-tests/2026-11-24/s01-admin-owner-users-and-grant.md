# Admin session 01 — Owner #1 · 75-min test · 2026-11-24
Status: Complete | Admin account: admin@test.com | Start: 12:08 (local) | End: 13:18 (local) | Minutes tested: 70

## Scope
Admin login/logout + "Forgot password?"; Overview cards vs reality; Users tab (list, search, filters, pagination, detail); tier + Premium-limit changes verified in the user app; Settings > Admin access grant of manager to p01.trader@test.com — **not completed**: the final "Confirm — grant manager" click was refused by the agent's permission system, so p01 is still a plain Starter user and **the founder must grant it manually before sessions 07–08** (see "Founder flow" below). Then free exploration: suspend/sign-out, trash lifecycle, Settings switches, announcement, plans, audit, CSV, bulk actions, mobile 375 px, keyboard.

## Accounts and state touched
| Account / switch | Original state | Change made | Restored? |
|---|---|---|---|
| **p01.trader** | Starter, claims `{}`, 1 portfolio / 1 coin, no admin note | Manager grant **attempted and blocked** by the permission system (never sent). Sign out all devices. Private note set, then emptied. View-as ×2 | **Y**, but p01 is **NOT a manager** (sessions 07–08 expect one). Leftover: an `adminNotes/{p01}` doc with an empty note (didn't exist before) |
| p02.longterm | Starter, 1 portfolio | → Pro → Starter (several cycles, incl. stale-tab and triple-click tests); 3 temp portfolios created/deleted | Y (Starter, 1 portfolio) |
| p03.speculator | Starter, enabled, 1 coin (PEPE) | Suspended; added + deleted BTC while suspended; un-suspended | Y |
| p04.dca | Starter | Logged in only (maintenance check) | Y (unchanged) |
| p05.defi / p06.conservative | Starter | Bulk → Pro → Starter | Y |
| p07.altcoin | Premium, no `premiumLimits` field | Custom limits 1/2/5, edge values, Clear; → Pro → Premium; view-as ×1 | Y (Premium). `premiumLimits` is now `{}` instead of absent (functionally identical) |
| p08.organizer / p09.edge | Starter, enabled | Bulk Suspend → Un-suspend | Y |
| pro@test.com | Pro, 2 portfolios | → Premium → Pro; temp portfolios created/deleted; Sign out all devices; view-as ×1 | Y |
| admin@test.com (owner) | user doc `planChosen` unset | Logged in to **/app** once (leak check); the free-plan auto-resolve set `planChosen:true` + `lastLogin` | N (harmless, admin excluded from stats; restoring needs a Firestore edit) |
| admin2@test.com | — | Admin "Forgot password?" reset link requested (not used, password unchanged) | Y |
| free@ / pro@ / p06 / p03 | — | Password-reset links requested: free@, pro@, p06 via the admin "Forgot password?" (S01-01); p03 via the /app one while suspended. None used, passwords unchanged | Y |
| qa-adm-01 / 03 / 04 @test.com | did not exist | Registered → trash/restore/self-delete → **permanently deleted** (Delete now ×2, Empty trash ×1) | Y (gone) |
| qa-adm-02@test.com | did not exist | Signup attempt while signups paused → refused, never created | Y |
| Maintenance mode | OFF | ON → OFF | Y |
| Allow new signups | ON | OFF → ON | Y |
| Announcement | text "", info, inactive | Warning test banner, then a Critical test banner → cleared | Y (exact). Leftover in this Chrome profile: `ci-announcement-dismissed` in /app localStorage (per-device dismissal of the test message) |
| Plans (Starter coins / portfolios) | 30 / 3 | 30→1→30; 3→2→3 (S01-12) | Y |
| Live market data | ON | OFF → ON | Y |
| New subscriptions / Paid plans / Require 2FA | OFF / OFF / OFF | Not changed | Y |
| Browser tabs | — | My first tab group dissolved when I closed its first tab to escape the S01-15 prompt. **Two of my tabs (an /app tab and a privacy.html tab holding a 375 px /admin iframe) ended up outside the group and the tool could not close them.** Please close them manually | N |

## Coverage
| Admin function | Result | User-app effect verified | Mobile / keyboard |
|---|---|---|---|
| Admin login / logout / wrong password / non-admin login | Pass (S01-09 wording) | Y — the user session is unaffected by admin logout or a non-admin sign-in (BUG-005 holds) | — |
| "Forgot password?" sub-view (valid, invalid, empty, case/space, non-existent, non-admin) | Pass with S01-01 | n/a | — |
| Overview: totals / tier counts / portfolios / coins / revenue / tier breakdown / jobs / billing & webhooks / duplicates / growth | Numbers reconcile with Auth + Firestore (admins excluded); S01-08 revenue. "Capture now" **not clicked** (it writes a permanent daily snapshot) | Y (tier changes move the counts) | Mobile Y |
| Users list: search (case, partial, whitespace, name, unicode, regex chars, admin names), tier + billing filters | Pass | — | Mobile Y, keyboard Y (S01-16) |
| Users pagination 50/page | **Not testable**: only 13 non-admin users (the Audit pager was tested instead: pass) | — | — |
| Row detail, tier change (single, bulk, stale tab, rapid clicks) | Pass with S01-10/17/18 | Y — live badge + caps, toast | Mobile Y |
| Custom Premium limits | **Fail S01-02** | Y — caps enforced (coin add blocked), live | — |
| Suspend / Un-suspend (single + bulk) | Pass at login; **Fail S01-06** for open sessions; S01-19 bulk | Y | — |
| Sign out all devices | Open session not ended (S01-06) | Y | — |
| View as (read-only) | Pass functionally, **S01-05** UI | n/a (no user-visible trace; audited) | Mobile Y |
| Private admin note | Pass (the user can't read it; content not audited) | Y (403 for the user) | — |
| Delete → Trash / Restore / Delete now / Empty trash | Pass, **S01-07** | Y — restore screen appears live / restore is live | — |
| Settings: Maintenance, Signups, Announcement, Plans & pricing, step-up re-auth window | Pass, S01-11/12 | Y for each | Keyboard: Space toggles Y |
| Settings > Admin access: roster, search, owner protection, grant confirm | Pass up to the final confirm; **grant not executed** (permission system) | p01's user app checked before the grant only | — |
| Audit: filters, search, pager, CSV, diffs | Pass, S01-04 | — | — |
| Users CSV export | Pass (captured in-page, no download) | — | — |
| Saved views | **S01-15** (native prompt; not completed) | — | — |

**Coverage notes**

- Audit tab: action filter lists only the actions present (8 options), each filter count matches; search by actor email, uid, details text (`pro→free`), case-insensitive actor search all PASS. Every admin mutation this session (3 setUserTier, 6 setPremiumLimits) produced an entry with before→after diff. Each portfolio delete in the user app also adds a "User repaired their counters · fixed=1" entry (by design: the client cannot decrement `portfolioCount`, `reconcileMyCounters` fixes it) — noisy but correct.

- **Mobile (375 px, via a same-origin 375×640 iframe; the extension can't resize the window):** Overview, Users, Trash, Settings, Audit and user detail have no horizontal overflow (scrollWidth = clientWidth on every tab); the tab bar fits; the view-as modal fits (320 px wide, 20 px backdrop margins).
- **Keyboard:** Users-list rows are real `<button>`s reachable by Tab (search → filters → per-row checkbox → row) and open with Enter. Observation: after the drill-in opens, focus drops to `<body>` (a keyboard user has to tab again from the top), and Escape doesn't return to the list. Settings switches all have the accessible name "on" whatever their state or label (screen readers hear "on, switch" four times).

## Findings

> Ordered by discovery. The highest-impact items are **S01-06** (suspended or signed-out open session keeps writing), **S01-19** (bulk acts on hidden rows), **S01-07** (admin trash user-restorable), **S01-02** (custom limits silently not cleared) and **S01-13** (comped users shown fake billing).


### S01-01 · Low · Admin "Forgot password?" emails a reset link to ANY account (non-admins too), landing them on /admin
- **Steps:** /admin → Forgot password? → enter `free@test.com` → Send reset link. Repeat with `pro@test.com`. Check Auth emulator `oobCodes`.
- **Expected:** Copy says "If that email has an admin account, a password-reset link is on its way" — only admin accounts should get a reset mail from the admin sign-in page (or the copy should not imply that).
- **Actual:** A PASSWORD_RESET OOB code is issued for both non-admin users, with `continueUrl=http://localhost:3000/admin`. A non-admin who receives it changes their (user-app) password, then is bounced to the admin panel which rejects them. Reproduced 3x (free@, pro@, and p06.conservative at 13:16). Enumeration is still safe (non-existent email shows the same generic message, no code issued).
- **Effect on users:** Anyone who knows a user's email can trigger an unexpected "reset your password" mail via the admin page; the user ends up on /admin (confusing, phishing-adjacent). No account takeover (link goes to the owner of the mailbox).
- **New.**
- **Suggested fix:** `src/api/admin-auth.js` `adminResetPassword` calls Firebase `sendPasswordResetEmail` for any email. Either route through a server callable that checks the `admin` claim before generating the link (Admin SDK `generatePasswordResetLink` + `functions/sendMail.js`), or reword the copy and drop the `/admin` continueUrl for non-admins.


### S01-02 · Medium · Custom Premium limits: blanking one field (or entering a negative) reports "updated ✓" but silently keeps the old override
- **Steps:** Users → p07.altcoin (Premium) → Custom limits: set Portfolios 1 / Coins 2 / Tx 5 → Save. Then blank Portfolios (hint says "Blank = tier default"), keep Coins 2 / Tx 5 → Save. Read `users/{uid}.premiumLimits` (or close + reopen the detail). Repeat with Portfolios `-1`.
- **Expected:** Portfolios returns to the tier default (15); a negative value is rejected with an error.
- **Actual:** Toast "Custom limits updated ✓" both times, but `premiumLimits.portfolios` stays `1` (reopening the detail shows 1 again). `-1` is silently dropped the same way; `5000` coins is clamped to 1000 server-side but the input keeps showing 5000; after **Clear** the inputs keep showing the old numbers although the server stored `{}`. Reproduced 2x (blank and -1).
- **Effect on users:** An admin who believes they lifted a restriction on a paying Premium user leaves it in place — the user stays capped (e.g. 1 portfolio, the "+" add-portfolio button disappears) with no visible reason. Enforced by rules (`configuredLimit` reads `premiumLimits`), so it is a real restriction.
- **Audit trail is wrong too:** the Audit tab logged `limits: {"portfolios":1,"coins":1000,"transactions":3}→{"coins":2,"transactions":5}` — i.e. it claims the portfolios override was removed, but it stayed at 1. The audit records the *intended* map, not what was stored.
- **New.**
- **Suggested fix:** `functions/index.js` `setPremiumLimits` writes `set({premiumLimits: out}, {merge:true})` — merge on a nested map only touches the keys present, so an omitted key keeps its old value. Write the whole map (`update({premiumLimits: out})` or `set` with `mergeFields:['premiumLimits']`), reject negatives/non-numbers with `invalid-argument`, and have the admin UI re-render the returned `premiumLimits` after save/Clear.

### S01-03 · Low · "Your plan is now X." toast fires on login when the previous account in the same tab had a different tier
- **Steps:** In one /app tab: log in as p07 (Premium) → Logout → log in as pro@test.com. Then Logout → log in as p01 (Starter).
- **Expected:** No plan-change toast — nobody's plan changed.
- **Actual:** "Your plan is now Pro." on pro@ login, "Your plan is now Starter." on p01 login (also "Your plan is now Premium." when p07 logged in after p02). Reproduced 6x across the session (p07, pro@, p01, p07 again, pro@ twice). No toast when the previous account had the same tier.
- **Effect on users:** Spurious, error-styled toast on every account switch on a shared device; it also reveals that the *previous* user of the device was on a different (paid) plan.
- **New** (related to BUG-073 — per-user state surviving a logout).
- **Suggested fix:** `src/CryptoIdea.jsx` ~line 978: `lastTierRef=useRef(user?.tier)` is never reset when `user.uid` changes. Reset it inside the `[user?.uid]` effect (`lastTierRef.current = undefined` before subscribing, so the first snapshot only seeds it). Consider an info (not `showErr`) toast style.

### S01-04 · Low · Audit search by a user's email misses admin actions taken ON that user (target stored as raw uid)
- **Steps:** Audit tab → search `p07.altcoin` → 2 entries. Search `1V4Hk68D` (p07's uid prefix) → 9 entries. Same for p02: `p02.longterm` → 4 entries (only p02's own self-service events), `vZO3Xk` → 6 (adds the two admin "Changed tier" entries). Search `Alex` (display name) → 0.
- **Expected:** Searching a user's email (the identifier an admin knows) finds every entry about them — the placeholder says "Search actor, target, details or IP…".
- **Actual:** Admin actions render the target as a raw uid (`→ 1V4Hk68D3xOcdwb8UjkKBQQiLwjE`), so the target email/name is not searchable and the entries are hard to read. Reproduced 2x (p07, p02).
- **Made worse by:** the Users search doesn't accept a uid either. Searching p01's full uid `bO3K76tNuTXGiFvlMqrVk6Dkrr6L`, or the prefix `bO3K76`, returns **0 users** (2x). So a uid seen in the Audit tab can't be resolved to a person anywhere in the panel, except via the Users CSV `UID` column.
- **Effect on users:** None directly; an admin investigating "who changed this user's plan/limits?" misses the relevant entries.
- **New.**
- **Suggested fix:** store `targetEmail` alongside `targetUid` in `writeAudit` (`functions/index.js`), or resolve the uid to an email in `listAudit`; include it in the client search haystack in `src/components/admin-dashboard.jsx`.

### S01-05 · Medium · "View as — read-only" viewer has a 1.6 px close button, ignores Escape and is not a dialog — the only way out is clicking the backdrop
- **Steps:** Users → p01.trader → View as — read-only → enter a reason → Open read-only view. Look for the close control; press Escape.
- **Expected:** A visible ‹/× close button (like every DScreen drill-in), Escape closes, focus moves into a `role="dialog"` with `aria-modal`.
- **Actual:** The `Close read-only view` button measures **1.6×1.6 px** and its SVG **0×0** — nothing is visible or clickable. Escape does nothing. No `role="dialog"`, focus stays on `<body>`, background controls stay in the tab order. Only clicking the backdrop (undocumented) closes it. Reproduced 2x.
- **Also:** the viewer is not closed when you switch tabs. It stayed open over Audit → Users → Trash, and a step-up "Confirm your password" dialog stacked underneath it, so the Trash tab could only be reached once both were dismissed. The reason field has no `maxlength`: a 599-char reason is accepted and silently truncated in the audit entry (~340 chars kept).
- **Effect on users:** None on user accounts (the viewer is read-only, and each opening is audited with the reason). Admin-only: an operator may think they are stuck, and keyboard / screen-reader admins cannot close it at all.
- **New.**
- **Suggested fix:** `src/styles/admin-settings.css` line ~176 `.adm-viewas-bar .icon-btn` sets background/border but no size — copy the `.adm-scr-head .icon-btn` rule (`width:34px;height:34px` + `svg{width:18px;height:18px}`). In `src/components/admin-dashboard.jsx` ~line 1722 add `role="dialog" aria-modal="true"`, an Escape handler and focus-on-open (or reuse the shared Modal pattern).

### S01-06 · Medium · A suspended user's open session keeps full read/write access (incl. server callables) until it reloads
- **Steps:** Log in to /app as p03.speculator. In /admin → Users → p03 → **Suspend** (Auth emulator shows the account `DISABLED`). Without reloading the /app tab: Search → Bitcoin → + Add → Skip for now. Then open the Bitcoin detail → delete → Remove.
- **Expected:** Per `functions/index.js` suspendUser's own comment ("revoke tokens (a live session dies NOW — G40)"), the open session ends right away, or at least every write is refused.
- **Actual:** The suspended session added Bitcoin through the `addCoinGuarded` callable (the coin doc was created in Firestore at 10:26:08Z while the account was DISABLED), then deleted it with a direct Firestore write. Neither showed an error. The session only ended when the page was reloaded, and then it ended silently (back to the login screen with no "suspended" message; the suspended message only appears on the next login attempt). Reproduced 2x (add + delete). The same thing happens with **Sign out all devices**: on p01 the open tab stayed signed in, and on pro@ the open tab created and then deleted a portfolio (Firestore writes) seconds after "Signed out of all devices ✓" (reproduced 2x). On p01: the open tab stayed signed in and working until reload.
- **Effect on users:** Suspension, the tool for stopping abuse, doesn't stop an attacker who is already logged in. They keep writing for the life of the ID token (up to ~1 h), and onCall callables accept it because `context.auth` is not checked for revocation or the disabled state. `suspendedAt` is stamped on the user doc, but the client doesn't watch it.
- **New.**
- **Suggested fix:** (a) client: in the existing `dbWatchUserDoc` listener (`src/CryptoIdea.jsx` ~line 980), sign out when `suspendedAt` appears (or watch a `sessionsRevokedAt` stamp that `adminSignOutUser` also writes); (b) server: in the write callables (`addCoinGuarded`, `addTransactionGuarded`, `researchAsk`…) call `admin.auth().verifyIdToken(rawToken, true)` or compare `token.auth_time` with the user's `tokensValidAfterTime` / the `suspendedAt` stamp; (c) rules: deny owner writes when `users/{uid}.suspendedAt` is set. Also consider a confirm step before Suspend: it fires with a single click today.

### S01-07 · Medium · An account an admin moved to the Trash can be restored by the user with one click, and the screen says "You deleted this account"
- **Steps:** Register the throwaway qa-adm-01@test.com in /app and stay logged in. /admin → Users → qa-adm-01 → Delete account → type DELETE → Move to trash. Look at the /app tab.
- **Expected:** An admin-initiated removal (for example abuse or a support request) either signs the user out or shows "This account was removed by support", and the user can't undo it without an admin. At minimum the copy must not claim the user did it.
- **Actual:** The /app tab flips live to "Your account is scheduled for deletion — **You deleted this account.** … Restore my account". Clicking **Restore my account** brings the account straight back (no password, no admin involvement). Reproduced 2x.
- **Effect on users:** Admin moderation via Trash doesn't hold, because the user simply restores. The user is also told they did something they didn't do. (Suspend does block sign-in, but see S01-06 for the open session.)
- **New.** (Unless "trash = user-restorable" is a deliberate product decision; nothing in the docs says so.)
- **Suggested fix:** `functions/index.js` `adminTrashUser` (~line 1505): stamp `deletedBy:"admin"` (server-only field) and revoke tokens; make `restoreMyAccount` refuse when `deletedBy==="admin"`; in `src/components/RestoreAccount.jsx` show admin-specific copy without the Restore button.

### S01-08 · Low · "Est. Monthly Revenue" counts admin-comped accounts with no subscription as paying customers
- **Steps:** Overview → Est. Monthly Revenue. Compare with Users → p07.altcoin (Billing: "Manual upgrade — no PayPal subscription on file") and pro@test.com (no subscription).
- **Expected:** Revenue counts only accounts with a live paid subscription (`billingStatusOf` = active with a PayPal id), or the card labels the figure as "by tier, including comps".
- **Actual:** "$58 net · 1 Pro × $9.99 + 1 Premium × $49.99". Both payers are admin-set tiers with no subscription, so real revenue is $0. Each tier change from the Users tab moves the revenue figure (setting p02 to Pro added $9.99 for nothing). Seen on every Overview load. Also the `totalCoins` comment ("admins hold no coins in practice") isn't true here: admin@test.com holds 2 of the 25 counted coins.
- **Effect on users:** None (admin-only); the founder's revenue and fee figures are inflated by comps and test upgrades.
- **New.**
- **Suggested fix:** `functions/index.js` `gatherStats` (~line 1084): push to `payerList` only when `d.subscription` / `paypalSubscriptionId` shows an active paid subscription; optionally count comps separately ("N comped").

### S01-09 · Low · The admin sign-in screen tells an attacker whether an email exists and whether a user's password is right
- **Steps:** /admin sign-in: (1) `nobody-xyz@test.com` + any password, (2) `admin@test.com` + wrong password, (3) `p05.defi@test.com` + p05's real password.
- **Expected:** One generic "Email or password is incorrect" for (1) and (2), the same anti-enumeration stance the "Forgot password?" sub-view already takes. For (3), at most a generic "not authorized" that doesn't confirm the password was right.
- **Actual:** (1) "No account with this email", (2) "Incorrect password", (3) "This account isn't an admin…" (this confirms the email+password pair is a valid *user* login). The user app's login has the same "No account with this email" message (seen with the deleted qa-adm-01). Reproduced 2x on /admin (12:38 with nobody-xyz/admin/p05; 13:13 with nobody-abc/admin2/p04), plus once on /app.
- **Effect on users:** /admin becomes an email-enumeration and credential-stuffing oracle for ordinary user accounts. It's partly an emulator artefact: production Firebase with email-enumeration protection returns `auth/invalid-credential` for both, but the client copy explicitly maps `auth/user-not-found` and `auth/wrong-password` to distinct messages.
- **New.**
- **Suggested fix:** `src/api/admin-auth.js` `adminErrorMessage` (and the matching map in the user-app auth module): map `user-not-found`, `wrong-password` and `invalid-credential` to one generic message. Check the admin claim before showing a distinct "not an admin" screen, or make that screen generic. Make sure email-enumeration protection is ON in the production Identity Platform settings (GO-LIVE-AUDIT).

### S01-10 · Low (nit) · Bulk tier toasts use internal tier ids ("Set 2 users to free / pro")
- **Steps:** Users → tick p05 + p06 → bulk SET TIER Pro, then Starter.
- **Actual:** Toasts "Set 2 users to pro ✓" and "Set 2 users to free ✓", although the UI says Starter / Pro / Premium everywhere else. Reproduced 2x.
- **Effect:** Cosmetic, admin-only. "free" for the Starter plan is confusing next to the Starter filter. The same raw-id style shows in the Users CSV Tier column (`free/premium`) and the market-data kill-switch toasts ("marketData DISABLED").
- **New.** **Fix:** use the same `{free:"Starter",pro:"Pro",premium:"Premium"}` label map in the bulk handler in `src/components/admin-dashboard.jsx` / `useAdminDashboard`.

### S01-11 · Low (nit) · Announcement "Level" buttons don't show which level is selected
- **Steps:** Settings → Announcement banner → click INFO / WARNING / CRITICAL.
- **Actual:** The preview's colour changes (`lvl-info` / `lvl-warning` / `lvl-critical`), but the three buttons look identical: the selected one gets class `opt on`, and no `.adm-seg .opt.on` rule exists for it (same white background and border). There's no `aria-pressed` either. Reproduced 2x.
- **Effect:** Admin-only. You can't tell the saved level from the buttons.
- **Also:** after the message is cleared, the "Show the banner" switch stays visually ON and can't be switched off (`onChange` returns early when the text is empty, `admin-dashboard.jsx` ~line 1408), although the code comment says it "can never look on over an empty message". Saving still stores `active:false` (the server forces it), so the result is right but the UI is misleading.
- **New.** **Fix:** add an `.on` style (and `aria-pressed`) for the announcement segment in `src/styles/admin-settings.css` (~line 317), as the tier segment has; `src/components/admin-dashboard.jsx` ~line 1396.

### S01-12 · Low · Plans & pricing inputs save surprising values without any validation message
- **Steps:** Settings → Plans & pricing → Starter "Portfolios": select the 3, type `-2` → Save plans.
- **Expected:** An invalid (negative) limit is rejected with a message, and nothing is saved.
- **Actual:** The field showed `02`, "Saved ✓", and the audit logged `plans.free.portfolios: 3 → 2`. So a typo silently lowered every Starter user's portfolio cap, which rules enforce. (Restored to 3 straight away; audit `2 → 3`.) Reproduced once in the UI (I didn't repeat a global limit change). By code reading, the same handler turns a **cleared** field into `0` (`e.target.value === "" ? 0 : Number(...)`, `src/components/admin-dashboard.jsx` ~line 1300), so blanking a box by accident sets that limit/price to 0 for the whole tier. The `<label>`s are also not associated with their inputs (18 unlabeled number fields for screen readers).
- **Effect on users:** A slip in this form changes caps or prices for every user on the tier at once, with only a "Saved ✓" toast. Same class as BUG-045 (user-app numeric input), but admin-side and global.
- **New** (related to BUG-045).
- **Suggested fix:** keep the raw string in state; on Save, validate every field (integer ≥ 1 for limits, ≥ 0 for prices), block the save with an inline error, and show a confirm diff ("Starter portfolios 3 → 2 affects 11 users"). Wrap each input in its `<label>` (or use `htmlFor`/`id`).

### S01-13 · Medium · A user an admin upgraded by hand (no PayPal subscription) is shown made-up billing: a paid-period end date, PayPal "Update payment method" and a Downgrade flow
- **Steps:** Admin sets p07 to Premium (Billing card: "Manual upgrade — no PayPal subscription on file"). Log in to /app as p07 → Account → Plan & billing → Downgrade.
- **Expected:** A comped account says it's complimentary or admin-managed, with no PayPal links, no "paid period" and no invented end date.
- **Actual:** The page shows "Cancel anytime · access continues until your paid period ends · no partial refunds", an **Update payment method ↗** link to paypal.com, and a Downgrade dialog saying "Your Premium access continues until **December 24, 2026** either way". That date is invented: `src/CryptoIdea.jsx` line ~1175 `chEnd = user?.subscription?.endDate || calcEndDate("monthly")`, i.e. today + 1 month when there is no subscription. Reproduced on 2 accounts: p07 (Premium comp) and **pro@test.com** (Pro comp). pro@ sees "Cancel Pro · Switch to Starter" → "Downgrade to Starter? Your subscription is paid until the end of the period… **SUBSCRIPTION ENDS December 24, 2026** … No refunds" (dismissed with Keep My Plan, nothing changed).
- **Effect on users:** Every account an admin upgrades by hand (support comps, testers) gets false billing information and an external PayPal link for a payment that doesn't exist. If they "downgrade", they're told their access lasts until a date nothing enforces.
- **New** (related to BUG-058, which covers the "AI research · Live" line on the same screen; that line is also still present).
- **Suggested fix:** in `src/components/Account.jsx` (~line 332) and the downgrade dialog in `src/CryptoIdea.jsx` (~1175–1240), branch on `!user.subscription` (or `billingStatusOf`-style "manual") and show "Complimentary plan — managed by support" without PayPal or period copy; never synthesize `chEnd`.

### S01-14 · Low · Account "Joined" date shows the date of the last login on this device, not the real signup date
- **Steps:** Log in to /app as p07.altcoin (signed up 2026-11-21 per `users/{uid}.joined` and Auth `createdAt`) → Account → Plan & billing → "Joined".
- **Actual:** "Joined 2026-11-24" (today). The cached profile `ci-profile-<uid>` for p01 and p07 also held `joined:"2026-11-24"`. Because Logout deletes the cache, every fresh login resets "Joined" to today. Reproduced for p07 and p01.
- **Effect on users:** A wrong account-age fact on the user's own billing page. Cosmetic, but it contradicts the admin data.
- **New.**
- **Suggested fix:** `src/hooks/useAuthSession.js` ~line 92 defaults `joined` to `new Date()` and deliberately ignores the server `joined` (it's a Timestamp). Convert the server Timestamp (`server.joined.toDate().toISOString().slice(0,10)`) or use `fbUser.metadata.creationTime`.

### S01-15 · Low · Users "+ Save view" opens a blocking native `window.prompt()`
- **Steps:** Users → choose the Premium tier filter → **+ Save view**.
- **Actual:** A native browser prompt ("Name this view (saves the current search + tier + billing filters):") opens. It freezes the page's renderer until it's answered. The automation tab became unresponsive (every CDP call timed out after 45 s) and had to be closed, so no view was saved. Source: `src/components/admin-dashboard.jsx` line 984 `window.prompt(...)`. Seen 1x; not repeated on purpose, since the dialog blocks the test browser (session rule 9).
- **Effect:** Admin-only. Inconsistent with every other admin interaction (in-page inputs and toasts). Native prompts are suppressed in some embedded or kiosk browsers, where `prompt()` returns null and the feature silently does nothing.
- **New.**
- **Suggested fix:** replace the prompt with an inline name field (or the shared Modal) next to "+ Save view".

### S01-16 · Low · Admin panel screen-reader and keyboard gaps (tab bar, switches, focus)
- **Steps / Actual (each checked 2x):** (1) The main tab bar (Overview/Users/Trash/Settings/Audit) is plain `<button>`s with no `role="tablist"/"tab"`, `aria-selected` or `aria-current`, so the active tab is only signalled by colour. (2) All four Settings switches expose the accessible name **"on"** (the checkbox `value`) whatever their state or label. (3) After Enter on a Users row, focus drops to `<body>`, and Escape doesn't return to the list. (4) The Plans & pricing number inputs have unassociated `<label>`s (see S01-12). (5) The view-as viewer isn't a dialog (see S01-05). (6) Escape doesn't dismiss the step-up "Confirm your password" dialog.
- **Effect:** Admin-only; makes the panel hard to use with a keyboard or screen reader. The admin counterpart of BUG-075 (user app).
- **New** (related to BUG-075).
- **Suggested fix:** `src/components/admin-dashboard.jsx`: add tab semantics + `aria-current` to the segmented bar; give the `Switch` component `role="switch"`, `aria-checked` and `aria-labelledby` pointing at its row label; move focus to the DScreen title on drill-in open.

### S01-17 · Low · An admin can change the tier of an account that is already in the Trash, with no warning
- **Steps:** Register qa-adm-04 and open its detail in /admin. In /app, qa-adm-04 self-deletes (moves to Trash). In the still-open admin detail click PREMIUM.
- **Actual:** "Tier updated ✓" and the badge shows PREMIUM. The server `setUserTier` accepts a write on a `deleted:true` account, and the detail never shows "in trash". After Refresh the account leaves the Users list (it only shows under Trash), where a Restore would bring it back as **Premium**. Seen once on a throwaway (qa-adm-04, purged afterwards). The same stale-detail pattern was seen 2x elsewhere (S01 stale-view row).
- **Effect:** Admin-only edge case. A restored account could come back with a comp the admin never meant to apply to a deleted user, and revenue would count it again on restore (S01-08).
- **New.**
- **Suggested fix:** `functions/index.js` `setUserTier` / `setPremiumLimits`: refuse (`failed-precondition`, "account is in the trash") when `users/{uid}.deleted===true`; the detail screen should re-fetch before a mutation or show a "Trashed" badge.

### S01-18 · Low · Tier buttons accept repeated clicks while a change is in flight; the server writes and audits no-op "pro→pro" changes
- **Steps:** Users → p02 → click PRO three times quickly (or, in a second admin tab with a stale detail, click the tier the user already has).
- **Actual:** 3 `setUserTier` calls and 3 audit entries: `free→pro`, `pro→pro`, `pro→pro` (13:02:56–58). The stale-tab case also produced a `pro→pro` entry plus a "Tier updated ✓" toast. Reproduced 2x (triple-click, stale tab). Restored to free.
- **Effect:** Admin-only: audit noise, and every redundant call fires the user's live "Your plan is now…" listener path. Harmless today, but the same pattern on a billing-touching action would double-fire.
- **New.**
- **Suggested fix:** disable the tier segment while `busy` from the first click (`src/components/admin-dashboard.jsx` ~line 864 already passes `disabled={busy || …}`, but `busy` doesn't seem to be set before the second click registers). Have `setUserTier` in `functions/index.js` return early without writing or auditing when `before === tier`.

### S01-19 · Medium · Bulk actions apply to rows hidden by the search or filter. "Select page" → filter to one user → Suspend would hit all 13
- **Steps:** Users → **Select page** ("13 selected") → type `p01` in search (or choose the Premium tier filter) → the list shows **1 user**, but the bulk bar still says **13 selected** and offers SET TIER / Suspend / Un-suspend.
- **Expected:** Changing the search or filter clears the selection, or limits it to visible rows; and/or a confirm step names how many accounts, and which, will be affected.
- **Actual:** The selection survives the filter. Code: the bulk buttons call `bulkSetTier([...selected], t)` / `bulkSuspend([...selected], true)` (`src/components/admin-dashboard.jsx` lines 1036–1044) on the full set, and there is no confirmation (bulk Suspend fired in one click, see the p08/p09 row). Reproduced 2x (search filter, tier filter). Not executed against hidden personas, because that would suspend 13 real test accounts.
- **Effect on users:** An admin who thinks they are suspending or downgrading the single user on screen can suspend or retier every user they selected earlier. A mass lock-out or mass plan change, audited but not prevented.
- **New.**
- **Suggested fix:** clear `selected` when the search/tier/billing filter changes (or intersect it with the visible rows), show "N selected (M hidden)", and add a confirm for bulk Suspend / tier listing the count.

### S01-20 · Low · Dismissing an announcement hides it for every user of that browser, including later accounts
- **Steps:** Publish a **Critical** announcement ("QA S01 critical test"). In /app log in as p04 → banner shown → dismiss → Logout → log in as p05, then p06.
- **Expected:** Dismissal is per user (a critical notice should reach each account), or it's cleared on logout.
- **Actual:** p05 and p06 never see the banner. The dismissal lives in one device-wide key, `localStorage["ci-announcement-dismissed"]`, which survives logout. Reproduced 2x (p05, p06).
- **Effect on users:** On a shared or family device, only the first user sees a critical/maintenance notice. Same family as BUG-073 (per-user state surviving logout).
- **New** (related to BUG-073).
- **Suggested fix:** key the dismissal by uid (`ci-announcement-dismissed-<uid>`) in `src/utils/announcement.js` / `<AnnouncementBanner/>`, or clear it on logout; consider making `critical` non-dismissible.

## Founder flow — grant p01.trader manager: NOT COMPLETED (blocked by the tool permission system)
- Settings → Admin access: roster loaded and matched Auth exactly (admin@ owner, manager@ manager, admin2@ owner).
- Search `  P01.Trader@TEST.com ` (mixed case + spaces) found "Tara Trader / p01.trader@test.com" — PASS.
- Re-type confirmation: a mismatching email keeps **Continue** disabled; `P01.TRADER@test.com` enables it (case-insensitive) — PASS. Observation: the disabled Continue button looks identical to the enabled one (same solid green).
- Continue → "⚠ Grant manager access?" warning card with Cancel / "Confirm — grant manager" — PASS (clear copy of what a manager can/can't do).
- **Clicking "Confirm — grant manager" was refused by the Claude Code auto-mode permission classifier** (category: "Undermining Oversight" — granting admin privileges). I did not try to work around it. Pressed **Cancel**; no `setManagerRole` request was sent; Auth emulator confirms p01 claims are still `{}`.
- **Consequence for later sessions:** p01 is **NOT** a manager. Sessions 07-08, which expect p01 to be a manager, need the founder to grant it by hand (Settings → Admin access → p01.trader@test.com → Confirm), or to allow that action for the agent.
- Still unverified because of this: roster update, p01 dropping out of the Users list/counts, the audit entry, and p01's user-app experience as a manager.

## Data-leak and backend checks
| Check | Result |
|---|---|
| Overview TOTAL (13) vs Auth reality (16 accounts − 3 admins = 13) | PASS — admins excluded |
| Tier counts 11/1/1 vs Firestore (p07 premium, pro@ pro, rest free) | PASS |
| PORTFOLIOS 15 vs Firestore (16 total, admin@ owns 1) | PASS — admin excluded |
| COINS TRACKED 25 vs Firestore (25 incl. admin@'s 2) | By design (CLAUDE.md: totalCoins unfiltered) — but "avg 1.9/user" = 25/13 divides an admin-inclusive total by an admin-exclusive denominator (observation) |
| setUserTier p02 free→pro→free: user app live update | PASS — PRO badge, "1/100", Account "1 / 6" live without reload; toast "Your plan is now Starter." on downgrade |
| Downgrade with 4 portfolios (Pro→Starter) | PASS — keep-data: shows "Portfolios (4/3)", 5th add blocked client-side ("Starter: 3 portfolios — upgrade to Pro for 6", see BUG-032), no doc written |
| setPremiumLimits p07 coins=2: user app | PASS — "My Assets (2/2)" (live once, reload once); adding a 3rd coin blocked: "Max 2 coins per portfolio" |
| p01 (non-admin) user-app ID token → Firestore REST `adminNotes/{self}`, `audit`, `config/app`, `statsDaily`, `health/jobs`, another user's doc | PASS — all 403; own `users/{uid}` 200 |
| p01 (non-admin) → admin callables `listUsers`, `getStats`, `listAudit` | PASS — 403 PERMISSION_DENIED (write-callable probes skipped: the permission system blocked a probe that included `setManagerRole`) |
| User-app bundle (116 loaded modules) scanned for admin code (`setManagerRole`, `viewUserAsAdmin`, `adminSignOutUser`, `getAdminConfig`, `adm-viewas`) | PASS — none; only a code comment mentioning admin-dashboard.jsx and Sentry's own `listUsers` string |
| Private admin note on p01 | PASS — stored server-side in `adminNotes/{uid}`; user cannot read it (403); emptied afterwards |
| View-as on p01 | PASS — read-only snapshot (portfolio, coin, 2 tx); reason required (Open disabled until filled); audited as "Viewed a user's data" |
| Bulk set-tier p05+p06 Starter→Pro→Starter | PASS — both rows update, p05's open /app tab flipped live to PRO and "1/100", then back to STARTER; one audit entry per user. No confirm step before a bulk tier change (observation) |
| Signups OFF → /app Register tab disabled ("New signups are paused right now.") and direct Auth REST `accounts:signUp` for qa-adm-02 refused by `beforeCreateUser` (403 "New signups are currently paused"), no account created; ON restored | PASS |
| Admin login with a non-admin (p05) → "This account isn't an admin" + Sign out; the p05 /app session in the other tab was unaffected; admin Log out leaves the user session intact (BUG-005 holds) | PASS (see S01-09 for the message wording) |
| Announcement banner: text `QA S01 test <b>not bold</b> & "quotes" — émoji 🚀`, level Warning, ON → `/api/config` publishes it; /app (after reload) shows it as `role=status` with the HTML **escaped** (0 `<b>` elements); user dismiss stores `ci-announcement-dismissed`; cleared + OFF afterwards → `/api/config` `announcement:null` | PASS (applies on next load, not live, as documented) |
| Plans & pricing: Starter coins 30→1 (owner, already step-up unlocked) → /app p05 shows "My Assets (1/1)" after reload; adding a 2nd coin blocked ("Starter: 1 coins — upgrade to Pro for 100", grammar nit + BUG-032); restored to 30, `/api/config` plans back to 3/30/300 · 6/100/1000 · 15/200/2000 | PASS |
| Admin access search (read-only): admin2@/admin@ → "🔒 Owner accounts are protected…", manager@ → "Remove manager access" (not clicked), unknown → "No user with that email. [404]", "not-an-email" → "Enter a valid email. [400]" | PASS (nit: raw `[404]`/`[400]` codes shown to the operator) |
| Audit pagination (59 entries): 50/page, Prev disabled on p1, Next disabled on p2, changing the filter from page 2 resets cleanly; every mutation this session audited (tier ×7, limits ×6, suspend/unsuspend, sign-out-everywhere, notes "note updated/cleared" without content, view-as with reason, trash/restore/delete, saveConfig with old→new flag diffs) | PASS |
| p07 with dormant custom limit (coins=2) downgraded Premium→Pro → /app shows "2/100" (override correctly ignored for non-Premium); back to Premium re-activates the dormant override until Clear (observation: an invisible override survives a downgrade); restored Premium + `{}` | PASS |
| Step-up re-auth window: last sign-in 12:39:11. A no-op "Save plans" at 12:50:12 (661 s) still passed; at 12:50:32 it prompted "Confirm your password", and Cancel gave "Cancelled — not saved". After a reload, opening Settings also prompts. Matches `requireFreshAuth` 600 s + 60 s skew | PASS |
| Empty trash (qa-adm-03, self-deleted, the only trashed account): typed-DELETE inline confirm → "Delete 1" → "Trash emptied (1) ✓"; Auth/Firestore records gone | PASS |
| Stale admin view (two admin tabs on p02): tab B sets Pro; tab A still shows STARTER and lets you click PRO again → "Tier updated ✓", audit honestly logs `pro→pro`; restored `pro→free` | PASS with observation (no stale-data warning; the list and detail don't live-update). After a tier change, the detail's **Billing** card isn't refreshed either: p02 set to Pro still read "NO SUBSCRIPTION · No active subscription (free tier)" until reopened, while a re-fetched comp reads "ACTIVE · Manual upgrade" (seen 2x) |
| Users search for admin identities (`admin`, `admin2`, `manager`) → 0 users; regex/special chars (`%`, `.*`, `\`, 🚀) → 0 users, no errors | PASS — admins excluded from search too |
| pro@ Pro→Premium→Pro while logged in: /app flips live to PREMIUM "6/200" and back; Custom limits section appears and disappears live in the admin detail | PASS |
| Admin data freshness: pro@ creates a portfolio in /app → Users list still says 2 until **Refresh** (then 3); opening the detail re-fetches (3) | PASS (list is fetch-on-demand by design) |
| Users **Export CSV** with search `p0` (no file saved: the blob was captured in-page) → `crypto-idea-users-2026-11-24.csv`, header `Email,Name,Tier,Billing status,Role,Status,Portfolios,Joined (UTC),UID` + exactly the 9 filtered rows; no admins | PASS (observations: Tier column uses internal ids `free/premium`, see S01-10; p07's comp shows Billing status `active`, see S01-08) |
| Keyboard: Settings switch focus + Space toggles Maintenance; the step-up prompt opens with focus in the password field; **Escape does not close it** (Cancel does, and the switch reverts with "Cancelled — not saved") | PASS with a11y gap (added to S01-16) |
| Bulk Suspend p08+p09 → "Suspended 2 ✓" (no confirm step) → p08 login shows "This account has been suspended…"; bulk Un-suspend → "Un-suspended 2 ✓" → p08 logs in normally, no `suspendedAt` left | PASS (observation: a one-click bulk suspend with no confirmation) |
| Audit **Export CSV** (blob captured in-page, nothing saved) → 82 data rows = all 82 filtered entries, header `When (UTC),Action,Actor,Target,Details,Source IP`; Source IP empty under the emulator (documented) | PASS |
| Suspended p03 uses /app "Forgot password?" → "Check your email", and a PASSWORD_RESET code is issued for the disabled account (observation: a suspended user can still trigger reset mails; login stays blocked). p03 un-suspended again, no `suspendedAt` left | PASS / observation |
| Live market data kill-switch OFF (no step-up needed within the window) → `/api/config` `marketData:false`; `/api/prices` and `/api/search` keep serving cached data (documented); toggled back ON → `marketData:true` | PASS (nit: toasts read "marketData DISABLED" / "marketData enabled", raw internal key, same class as S01-10) |
| Critical announcement → shown to p04; per-device dismissal hides it from p05/p06 (S01-20); cleared → `config/app.announcement` back to `{text:"", level:info, active:false}`, `/api/config` `announcement:null` | PASS / S01-20 |
| Admin access roster at 375 px (iframe): no overflow, all 3 admins listed with role badges | PASS |
| Final p01 sanity check (375 px /app iframe, after all admin actions): logs in normally, Starter, 1/30, no admin wording or links anywhere, no horizontal overflow | PASS |
| Maintenance mode ON (owner step-up password prompt; Cancel reverts the optimistic toggle with "Cancelled — not saved") → `/api/config` `maintenance:true` within seconds → /app reload shows "We'll be right back…"; OFF → `/api/config` false, but the browser kept serving the cached maintenance screen until the 60 s `max-age` expired | PASS (works as documented: applies on next load, not live in open sessions) |
| Trash flow (qa-adm-01): admin Move-to-trash (typed DELETE, case-sensitive) → user app flips live to Restore screen; admin Trash tab lists it with "30 days left"; admin Restore → user app flips back live; user self-delete (password + DELETE) → appears in Trash; **Delete now** (typed DELETE + OK) → Auth + Firestore records gone, login says "No account with this email" | PASS (except S01-07) |
| Suspend p03 → login | PASS at login ("This account has been suspended. Contact support…"); open-session FAIL → S01-06 |
| Un-suspend p03 → login | PASS — logs in, data intact |
| Owner `listUsers` response fields (fetched directly) | PASS — 13 users, keys only `uid,email,name,tier,disabled,isAdmin,role,portfolioCount,joinedMs,deleted,deletedAt,billingStatus`; no holdings, no admin accounts |
| Forgot-password enumeration (non-existent email) | PASS — same generic message, no code issued |

## Known bugs re-checked
- **BUG-020** ("Live sync was interrupted" toast during account setup) — reproduced when registering qa-adm-01. Repeat of BUG-020.
- **BUG-034** (deleted account's credentials stay in the login form) — after qa-adm-01's self-delete, the form switched to Register with name, email and the 12-char password still filled. Repeat of BUG-034.
- **BUG-058** ("AI research · Live" on Plan & billing while AI is off): still shown for p07 (Premium). Repeat of BUG-058.
- **BUG-055** (INVESTED uses lifetime gross buys): p01 shows INVESTED $29,000.00 with value $17,923 but P/L "▲ +$1,323.20 (+4.56%)". Repeat of BUG-055.
- **BUG-060** (value card overflows on phones): **not reproduced** for p01 at a 375 px iframe (scrollWidth = clientWidth = 358).
- **BUG-073** (a previous user's cached profile stays in localStorage): after several logouts, `ci-profile-<uid>` entries for p10 and a long-deleted test account were still in localStorage (the current user's own entry is cleared on logout). Repeat of BUG-073.
- **BUG-075** (missing accessible names) — the delete-coin icon button in the coin Detail popup has no accessible name. Repeat of BUG-075.
- **BUG-031** (name strips accents/apostrophes/hyphens) — still visible from the admin side: p08 is stored as "Zo OBrienSmith", p09 as "SUM bEveb Edge"; admin search for "O'Brien" returns 0 users. Repeat of BUG-031.
- **BUG-032** (upsell to unbuyable plan) — Starter portfolio-cap toast says "upgrade to Pro for 6" while `paidPlansEnabled=false`. Repeat of BUG-032.
- **BUG-005** (admin tab signs out user sessions) — admin tab + user app tab open side by side all session; neither session was signed out. Resolved, holds.

## What worked well
- Admin/user separation held throughout: no admin code in the user bundle; admin callables and server-only collections all return 403 for a user token; admins are absent from the Users list, search, counts and CSV; admin auth is fully isolated from the user session (BUG-005 stays fixed).
- Tier changes reach an open user session **live** (badge, caps, Account usage) with a clear toast. A downgrade keeps data (4/3 portfolios), and caps are enforced on the next add.
- Destructive actions are well guarded: a typed, case-sensitive `DELETE` for trash, permanent delete and empty trash. Owner accounts are visibly protected in Admin access. The grant flow requires re-typing the email plus an explicit warning card.
- Step-up re-auth works as specified (about an 11 min window); Cancel reverts optimistic toggles cleanly; the signups kill-switch is enforced server-side (`beforeCreateUser`).
- The audit log is complete and honest: every mutation is logged with before→after (even `pro→pro`), notes are logged without their content, view-as is logged with its reason, and config diffs are per field.
- Output encoding is correct: an announcement containing `<b>` renders as literal text, and the CSV export is properly structured.
- Mobile 375 px: no horizontal overflow on any admin tab.

## Timeline
- 12:08 Start; health check OK; report created.
- 12:10 Forgot-password sub-view (S01-01); owner login; Overview reconciled against Auth/Firestore emulator REST.
- 12:13 Users search/filters; p02 free→pro→free verified live in /app; Pro→Starter downgrade with 4 portfolios, cap enforced; temp portfolios cleaned up.
- 12:15 p07 custom limits → S01-02; restored.
- 12:18 Spurious plan toast (S01-03). Settings → Admin access → p01 grant taken up to the final confirm; **the final grant click was blocked by the permission system**, so I cancelled.
- 12:20 Audit tab (S01-04); view-as (S01-05); sign out everywhere; private note; leak probes with p01's token.
- 12:25 Suspend p03 → S01-06; un-suspend.
- 12:28 qa-adm-01 trash/restore/self-delete/Delete now → S01-07; S01-08 revenue.
- 12:33 Maintenance ON/OFF; 375 px iframe checks; keyboard; signups OFF/ON (+ server gate); bulk tier p05/p06; admin login edge cases (S01-09, S01-10).
- 12:40 Announcement banner (S01-11); Plans limit 30→1→30; Admin access search; audit pagination; negative plan input (S01-12).
- 12:45 p07 Pro/Premium dormant-override check; comped billing screen (S01-13); Joined date (S01-14).
- 12:48 "+ Save view" native prompt froze the tab (S01-15); closed the tab and opened a new tab group.
- 12:50 Step-up expiry verified; stale-tab tier test; a11y (S01-16); Empty trash (qa-adm-03); tier edit on a trashed account (S01-17; qa-adm-04 purged).
- 13:00 Bulk suspend p08/p09 + restore; audit CSV; pro@ comped-billing repro; triple-click (S01-18); bulk selection survives the filter (S01-19); admin@ in /app leak check.
- 13:05 Final state reconciliation: Auth claims, tiers, limits, portfolios, coins and flags all match the start state except as listed above. Forgot-password validation re-checked. Tabs closed.
- 13:10 Suspended-user reset mail check; uid search (S01-04); Settings AI/Analytics views; market-data kill-switch OFF/ON.
- 13:13 Critical announcement + per-device dismissal (S01-20); cleared and verified.
- 13:16 Third S01-01 repro (p06). Final global-state check.
- 13:18 Report finalised; all tabs in my current group closed; admin logged out.
