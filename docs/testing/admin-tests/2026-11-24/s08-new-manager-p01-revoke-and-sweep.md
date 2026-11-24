# Admin session 08 — Newly promoted manager (persona p01) then Owner #1 for revoke · 75-min test · 2026-11-24
Status: Complete (charter core BLOCKED — manager grant refused by the Claude Code permission classifier) | Admin account: p01.trader@test.com (could not be promoted; sweep run as admin@test.com) | Start 16:51 – end 17:10 local | Minutes tested: 18

## Scope
Concurrency + revocation of a manager (p01) while p01's admin tab is open; re-grant / re-revoke idempotence + audit; p01's user app after revoke. Closing regression sweep with admin@test.com (375 px + desktop, keyboard, Escape/Enter in modals and drill-ins, refresh/back mid-flow, console errors) and a final state check of every persona + global switch.

Pre-state note: session 07 records that p01 was **never** promoted (the grant was blocked by the tool permission system) — p01 started this session as a plain Starter user with claims `{}`.

## Accounts and state touched
| Account | Original state (start of s08) | Change made | Restored? |
|---|---|---|---|
| p01.trader@test.com | Starter, role "", claims none, premiumLimits {}, 1 portfolio / 1 coin, enabled | Manager grant **attempted and blocked** (never sent). Starter→Pro→Starter; /app login | Y — Starter, plain user (required final state: normal user ✓) |
| p02.longterm@test.com | Starter, enabled | View-as ×2 (audited reasons "QA s08 …") | Y (read-only) |
| p03.speculator@test.com | Starter, enabled | Suspend→Un-suspend ×2 (Enter, Space); /app login checks | Y — enabled, Starter |
| p06.conservative@test.com | Starter | Starter→Pro (tab B) → Starter (tab A) | Y |
| p04, p05, p07 (Premium), p08, p09, p10, free@, pro@ (Pro) | as listed in final check | none | — (verified unchanged) |
| qa-adm-09@test.com (registered this session, QaAdmin#2026) | new Starter | Trash → **Delete now** (permanent) | Deleted on purpose (throwaway) |
| qa-adm-10@test.com (registered this session, QaAdmin#2026) | new Starter | Trash → **Delete now** (permanent) | Deleted on purpose (throwaway) |
| admin@ / manager@ | owner / manager | Signed in/out of /admin several times (shared-tab test) | Y (no role change) |
| Global flags | maintenance false, signupsEnabled true, paidPlansEnabled false, requireAdminMfa false, marketData true, checkout false, aiResearch false; announcement {text:"", info, inactive} | signupsEnabled true→false→true | Y — all verified via `getAdminConfig` + `/api/config` |

**Final state check (17:10, `lookupUser`/`listUsers`/`listAdmins`):** p01–p06, p08–p10, free@ = Starter; p07 = Premium (its original tier per s01); pro@ = Pro. All `disabled=false`, `premiumLimits={}`, none in the Trash (`deleted` false for all 15 users). Admin roster = admin@ (owner), admin2@ (owner), manager@ (manager) — p01 is **not** an admin.

## Coverage
| Admin function | Result | User-app effect verified | Mobile / keyboard |
|---|---|---|---|
| Grant p01 manager (Settings → Admin access) | **BLOCKED** — Claude Code permission classifier refused the final Continue (same as s07). Not worked around | — | — |
| Revoke / re-grant / re-revoke p01 + stale p01 admin tab | **NOT TESTED** (depends on the grant). Server-side behaviour for a revoked admin's live token is already logged as S07-04 | — | — |
| Two admins in one browser (admin@ ↔ manager@, 2 tabs) | Pass — the admin app's auth is shared per browser: a logout or sign-in in one tab flips the other within <1 s; no stale owner-only UI survived a switch to manager | /app session unaffected (isolated auth) | — |
| Tier change (p01, p06) | Pass; live in /app; audit rows correct | Y (live + reload) | Keyboard: Enter on rows opens detail |
| Suspend / Un-suspend (p03) | Pass functionally; **S08-02** no confirm | Y (open tab keeps working until reload — S06-04; login blocked w/ message; restore OK) | Enter + Space both fire |
| Delete → Trash → Delete now (qa-adm-09, -10) | Pass server-side; **S08-01** (erased tab), **S08-03** (Enter/labels) | Y | 375 px no overflow |
| View as — read-only | Pass (reason required + audited); S01-05 still present | — | 375 px: no overflow; only 20 px gutters tappable to close |
| Audit tab search | S01-04 repeat | — | — |
| Settings home + 8 drill-ins | Pass layout; **S08-04** unsaved draft shown as live | /api/config checked | 375 px no overflow; Escape never closes a drill-in (S01-16) |
| App Controls (signups OFF/ON) + step-up prompt | Pass; Enter in step-up password submits | /api/config reflects instantly | — |
| Refresh mid-flow | Reload always returns to Overview (drill-in, typed confirm and unsaved drafts dropped, no warning) | — | — |
| Overview / Users / Trash / Settings / Audit at 375 px | Pass (no horizontal overflow; header truncates "· Admin" and the email) | — | — |
| Console errors (admin + /app tabs) | none | — | — |

## Findings

### S08-01 · Medium · After an owner permanently deletes (GDPR-erases) an account, that user's open tab can click "Restore my account" and lands in an empty, normal-looking app; every save then fails with a generic error
- **Steps (reproduced 2x — qa-adm-09 and qa-adm-10, throwaways registered this session):** (1) Register qa-adm-NN in /app and leave the tab open. (2) Owner: Users → qa-adm-NN → Delete account → DELETE → Move to trash. The user tab switches to "Your account is scheduled for deletion … 30 days left to restore it." (3) Owner: Trash → Delete now → DELETE → OK → "Permanently deleted ✓". (4) The user tab still says "30 days left to restore it". Click **Restore my account**.
- **Expected:** The erased session is told the account no longer exists and is signed out (or at least the restore fails with a clear message).
- **Actual:** `restoreMyAccount` returns `{success:true, restored:false}` for a missing user doc (`functions/index.js` ~L1697) and the client ignores `restored` (`src/CryptoIdea.jsx` `restoreAccount` ~L567-572: it just clears `deleted` locally and goes to "portfolio"). The user sees a fresh empty STARTER portfolio "My Assets (0/30)". Adding Bitcoin (Search → Add → Skip for now) shows "That change couldn't be saved — please check the details and try again." Backend checked: `users/{uid}` stays 404, no sub-collections, Auth record gone, no `selfRestoreAccount` audit row — so **no data is resurrected** (server is safe); the problem is the misleading UI. A reload silently drops to the login screen with no explanation.
- **Effect on user accounts / user app:** Only for a session that was open during erasure, but it tells an erased user their account is restorable and then "restored", and every write fails with a "check the details" message. Not a data leak.
- **New** (related to S01-07, which is about the admin-trash wording; this is the post-erasure state).
- **Suggested fix:** `src/CryptoIdea.jsx` `restoreAccount`: treat `restored:false` as "this account no longer exists" → show that and sign out. Optionally have `restoreMyAccount` throw `not-found` when the doc is missing, and have `useAuthSession` notice the user doc disappearing (snapshot → `!exists`) to sign the tab out with a message instead of showing "30 days left".

### S08-02 · Low · Suspend / Un-suspend fire on a single click or keypress with no confirmation
- **Steps (reproduced 2x on p03, Enter and Space):** Users → p03.speculator → keyboard focus lands on the next control after Tab from the tier buttons → press Enter (or Space) on "Suspend".
- **Expected:** A confirm step like "Delete account" has (suspend signs the user out on their next load and blocks login), or at least an undo in the toast.
- **Actual:** "Suspended ✓" immediately, no confirm, no undo. Because focus drops to `<body>` after each action (S01-16) a keyboard user's next Tab sequence easily lands on Suspend. p03's open tab kept working (repeat of S06-04) and on reload was silently logged out; login then showed "This account has been suspended…". Un-suspend restored login and data (BUG-039 not regressed).
- **Effect on user accounts / user app:** An accidental keypress locks a real user out until someone notices.
- **New** (the no-confirm behaviour was noted in passing in s01/s07 timelines but never logged).
- **Suggested fix:** `src/components/admin-dashboard.jsx` user-detail Suspend button: reuse the inline confirm pattern used by Delete account (no typed word needed — a "Suspend p03? Confirm / Cancel" row), and add "Undo" to the toast.

### S08-03 · Low · Typed-DELETE confirms ignore Enter, and the Trash "Delete now" confirm has an unnamed ✕ button and an unlabelled input
- **Steps (reproduced 2x — user-detail "Move to trash" confirm on qa-adm-09, and Trash "Delete now" confirm on qa-adm-09):** open the confirm → focus is (correctly) in the DELETE field → type `DELETE` → press Enter.
- **Expected:** Enter submits when the word matches (it is a one-field form); Escape cancels; controls have accessible names.
- **Actual:** Enter does nothing (no `<form>`), Escape does nothing (known, S01-16). The keyboard user must Tab past Cancel to "Move to trash"/"OK". In the Trash confirm the close button is a bare "✕" with no `aria-label`/title and the DELETE input has no label/`aria-label` (placeholder only).
- **Effect on user accounts / user app:** Admin-only accessibility/keyboard friction.
- **New** (extends S01-16 / BUG-075).
- **Suggested fix:** `src/components/admin-dashboard.jsx`: wrap each typed-confirm in a `<form onSubmit>` with the confirm as `type="submit"` (disabled until the word matches), handle Escape → Cancel, add `aria-label="Cancel"` to ✕ and `aria-label="Type DELETE to confirm"` to the input.


### S08-04 · Low · Settings home shows an UNSAVED announcement draft as if it were live ("Announcement banner · On · info"); a reload then drops the draft without warning
- **Steps (seen across 2 separate saves):** Settings → Announcement banner → type text, flip its switch ON, do NOT press "Save announcement" → ‹ Back. Toggle "Allow new signups" OFF (step-up prompt → unlock → "Saved ✓"), then ON again ("Saved ✓").
- **Expected:** The home row reflects the saved state (Off) or marks the draft "unsaved"; leaving/reloading warns about the unsaved draft.
- **Actual:** The home row reads **"On · info"** throughout, while `/api/config` publishes no announcement and `getAdminConfig` still has `{text:"", active:false}` (the signups saves did NOT leak the draft — good). Switching tabs keeps the draft; a page reload silently discards it and the row returns to "Off".
- **Effect on user accounts / user app:** None directly; an owner can believe a banner is live when users see nothing.
- **New.**
- **Suggested fix:** `src/components/admin-dashboard.jsx` Settings home row: derive the status from the saved config, not the edit form (or append "· unsaved"); add a dirty-state hint on the drill-in's back box.

## Data-leak and backend checks
| Check | Result |
|---|---|
| p01 (plain user) calls listUsers / listAdmins / getUserNote / setManagerRole | 403 "Admins only." ✓ |
| p01 Firestore reads of `adminNotes/{own uid}`, `config/app`, `audit`, another user's doc | 403 ✓ |
| p01 own `users/{uid}` fields | email,name,settings,consent,joined,planChosen,portfolioCount,lastLogin,tier — no admin note / admin fields ✓ |
| `/api/config` | only public flags/plans; no secrets ✓; draft announcement not published ✓ |
| Erased uid after "Restore my account" + add-coin attempt (S08-01) | `users/{uid}` 404, no sub-collections, no audit row — nothing resurrected ✓ |
| Admin/user auth isolation (same browser) | admin tab identity switches never touched the /app session ✓ (IndexedDB holds separate `[DEFAULT]` and `admin` auth users) |
| Audit for this session's mutations | setUserTier ×4, suspend/unsuspend ×4, adminTrashUser ×2, deleteUser ×2, viewUserAsAdmin ×2, saveConfig ×2 — all present with before/after diffs ✓ (target email blank on several rows — S01-04) |

## Known bugs re-checked
- **BUG-020** ("Live sync was interrupted" on signup) — repeat 2x (qa-adm-09, qa-adm-10).
- **BUG-027** (Escape doesn't close coin Detail popup) — still present (p01).
- **BUG-039** (un-suspend INTERNAL) — not regressed (2 clean un-suspends).
- **S01-04** audit search by email misses admin actions — repeat (p03: 0 hits).
- **S01-05** view-as close button 1.6 px / Escape ignored — repeat (desktop + 375 px).
- **S01-07** "You deleted this account" wording for an admin trash — repeat (qa-adm-09/10).
- **S01-16** focus to `<body>` after actions; Escape doesn't close drill-ins or the DELETE confirm — repeat.
- **S05-13** admin sign-in form keeps email + password — repeat, and it also happens to a SECOND tab when the logout happens in another tab.
- **S06-04 / S01-06** suspended user's open tab keeps working until reload — repeat (p03).
- **S06-06** billing card stale after tier change — repeat (p01 shown "No active subscription (free tier)" while PRO).
- **S06-07** lists not refreshed after a mutation — seen in a second admin tab (p06 row still STARTER/PRO until Refresh; the detail drill-in itself refetches, good).
- **S07-04** (revoked admin token still accepted) — could not be exercised via the revoke flow (grant blocked).

## What worked well
- Cross-tab admin identity switching is consistent: no tab ever kept owner-only UI after the shared session became a manager.
- Admin and user auth are fully isolated in one browser.
- Tier changes reach the user app live (badge + limits) with correct audit diffs; detail drill-ins refetch fresh data.
- GDPR erasure is clean server-side even when the erased user's tab keeps trying to act.
- Unsaved Settings drafts do not leak into unrelated saves (per-field merge works).
- The step-up prompt focuses the password field and Enter submits it.
- No console errors in any tab; no horizontal overflow at 375 px anywhere tested.

## Timeline
- 16:51 Health check OK (`/api/config` JSON, /admin 200). Report created.
- 16:52 Baseline captured via `listUsers`/`lookupUser`/`listAdmins`/`getAdminConfig` as admin@ (see Accounts table). Admins = admin@ (owner), admin2@ (owner), manager@ (manager). p01 = Starter, role "", premiumLimits {}.
- 16:53 Owner → Settings → Admin access → search p01 → re-type confirm → **Continue was blocked by the Claude Code permission classifier ("Unauthorized Access")**, exactly as in session 07. The grant was never sent (page unchanged, roster still 3 admins). Per the classifier instruction no workaround (e.g. calling `setManagerRole` via curl) was attempted. **The promote → revoke → re-grant → re-revoke part of the charter is therefore BLOCKED**; p01 already satisfies the required final state (normal user). Session continues with the parts that need no role change: two-admins-in-one-browser concurrency (admin@ + manager@), p01 denied path, and the full regression sweep.
- 16:54 Two admins, one browser: tab A admin@ (on Settings → Admin access with a typed confirm), tab B /admin opened → already admin@ (shared admin auth). Log out in B → **A drops to the sign-in screen instantly** (in-progress grant form lost). Sign in manager@ in B → **A re-renders as manager** (Settings tab gone, manager notice). Repeated admin@ ↔ manager@ twice, both directions: A always follows B within <1 s, never kept a stale owner-only view. Tab A's sign-in form still held `admin@test.com` + an 8-char password after the cross-tab logout (repeat S05-13).
- 16:55 p01 user app (/app) signed in while the admin tabs switched identities: unaffected (admin/user auth isolation holds).
- 16:56 375 px (iframe frame — window resize is ignored by this Chrome window): Overview/Users/Trash/Settings/Audit + all 8 Settings drill-ins → no horizontal overflow. Escape never closes a drill-in and focus stays on `<body>` (repeat S01-16).
- 16:57 p01 Starter→Pro→Starter as owner: toasts "Tier updated ✓"; p01's open /app tab flips badge PRO / "My Assets (1/100)" **live** and back to STARTER / (1/30) live; reload agrees. Audit: two `setUserTier` rows (`tier: free→pro`, `pro→free`), no spurious "chose the free plan" row. Billing card stayed "No active subscription (free tier)" while PRO (repeat S06-06).
- 16:59 p03 Suspend/Un-suspend by keyboard ×2 (no confirm → S08-02); p03 /app reload → silent logout, login → suspended message, un-suspend → login OK with data.
- 17:00 Registered qa-adm-09 (BUG-020 toast repeat). Typed-DELETE confirm: Enter/Escape ignored (S08-03). Trash → Delete now (throwaway).
- 17:02 Erased session clicked "Restore my account" → ghost empty app (S08-01). Backend: no doc resurrected.
- 17:04 Reproduced S08-01 with qa-adm-10 (registered + trashed + Delete now; BUG-020 toast again).
- 17:06 View-as on p02 (reason required; Enter in the reason field does nothing — S08-03 class); viewer close button 1.6 px, Escape ignored, backdrop click closes (repeat S01-05); at 375 px only 20 px side gutters + a top strip of backdrop are tappable. Audit row "Viewed a user's data … reason: QA s08 …" present.
- 17:07 Audit search "p03.speculator" → 0 of 100 though 4 suspend rows target p03 (repeat S01-04).
- 17:08 Settings: unsaved announcement draft + signups OFF/ON round-trip → S08-04. Step-up prompt appeared on first switch; Enter in its password field submits (PASS). signupsEnabled restored true (verified `/api/config`).
- 17:09 Two admin views on p06: tab B Starter→Pro, tab A list row still STARTER until Refresh but its detail refetched PRO; tab A → Starter; tab B then still highlighted PRO and clicking it was a silent client no-op (stale view, no conflict hint; S06-07 family).
- 17:10 Data-leak probes as p01 (all denied), final state check of all 12 personas + admins + global flags (all original). Console: no errors.
- 17:10 Closed all my tabs. Wrapped up early: the charter's core (promote → revoke → re-grant → re-revoke p01) is blocked by the tool permission system, and the sweep was completed.
