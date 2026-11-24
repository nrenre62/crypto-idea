# Admin session 04 — Owner #2 (backup owner) · 75-min test · 2026-11-24
Status: Complete | Admin account: admin2@test.com | Start: 20:10 local (epoch 1795543856) | End: 21:21 local | Minutes tested: 70

## Scope
Support tools (view-as, admin notes, saved views, bulk tier/suspend/un-suspend, audit diffs, captureStatsSnapshot + Growth, system status, webhook ledger) and a user-side DATA-LEAK sweep (bundle strings, Firestore/callable probes with a persona token, /api/config secrets, BUG-005 admin+user tabs).

**Method notes.** Everything ran on the local emulator (localhost:3000 / :5001 / :8080 / :9099) in my own Chrome tabs. Callable and Firestore probes used the ID tokens the page itself holds (IndexedDB `firebase:authUser:…`) over the emulator's HTTP endpoints — equivalent to calling through the page SDK. The browser tool only delivered real clicks/keys to the foreground tab, so several UI steps in the second tab were driven by in-page `element.click()` / native value setters; keyboard-only checks were done in the foreground tab. Throwaways: qa-adm-41, qa-adm-42 (both erased). Global switches were never changed.

## Accounts and state touched
| Account | Original state | Change made | Restored? |
|---|---|---|---|
| p04.dca | Starter, 1 portfolio / 0 coins, no admin note | Private note with markup strings + S04-01 overwrite tests; `devSetMyTier` probe (emulator-only dev callable) flipped it to Premium for ~1 min → set back to free; bulk Pro→Suspend→Un-suspend→Starter | Y (tier free, enabled; note emptied — an empty `adminNotes` doc remains, no UI to delete it) |
| p09.edge | Starter, no note | note "SECRETNOTE" for the export test | Y (emptied; empty note doc remains) |
| p03.speculator | Starter | single tier change Pro → Starter (live check) | Y |
| p05.defi | Starter | + triple-click bulk Pro test (20:51); concurrent tier/suspend calls for S04-14 (21:08–21:09); simulated-failure bulk row (21:14, no change) | Y (Starter, enabled) |
| p06.conservative | Starter, no note | two-tab note overwrite (S04-01 run 3); boundary + failed-load note tests | Y (note emptied; empty doc remains) |
| qa-adm-05@test.com (another session's throwaway) | Starter, 5 portfolios, active "QA Four" | logged in to compare with view-as; switched active portfolio to QA Two and back | Y (active QA Four) |
| p08.organizer | Starter, 2 portfolios | logged in user-side to confirm portfolio order (My Portfolio, Trading); repeat leak sweep from its session; temporary note for the S04-05 export re-run (cleared); single tier cycle Pro → Starter → Premium → Starter with its /app open | Y (Starter) |
| pro@test.com | Pro (comped), enabled | bulk Suspend (Tier=Pro filter) → Auth sign-in `USER_DISABLED`, `suspendedAt` written → bulk Un-suspend → sign-in 200, `suspendedAt` removed, tier still pro | Y |
| Global switches | maintenance off, signups on, marketData on, checkout off, aiResearch off, paidPlans off | none changed | n/a |
| p07.altcoin | Premium (comped), 1 portfolio / 2 coins, `portfolioCount` counter = 2 (drifted) | View-as ×4; temp portfolio "QA S04 temp" created + deleted (the delete ran the user's counter self-repair → counter now 1 = truth) | Y (portfolio removed; counter now correct) |
| p01–p06, p08, p09 | Starter, enabled | Bulk Pro → bulk Suspend → bulk Un-suspend → bulk Starter; later two interrupted bulk runs (S04-08) left p05/p06/p08 Pro and p05/p06/p08/p09 suspended → fixed by hand via `setUserTier`/`suspendUser` | Y (all `free`, `disabled:false`, verified via listUsers at 20:34; a final bulk Pro → Starter pass at 21:01–21:02 also restored) |
| p10.privacy | Starter, name "Pat Privacy" | name set to a CSV-formula string for the export test | Y ("Pat Privacy") |
| p02.longterm | Starter | `restoreUser` called on a non-trashed account (no-op; audit "deleted: false→false") | Y functionally — but the call left `deleted:false, deletedAt:null` on the doc (harmless; no client path removes it) |
| p09.edge | Starter | View-as ×2; logged in user-side | Y |
| statsDaily/2026-11-24 | did not exist | "Capture now" wrote today's snapshot (owner action, idempotent per day; the nightly job would write it anyway) | N (intended; no personal data) |
| qa-adm-41@test.com (throwaway, registered 20:24, QaAdmin#2026) | new | Coin + journal + portfolio name with hostile HTML (render test), note, Suspend, Move to trash, **Delete now** (permanent) | n/a — erased by design; its `adminNotes` doc survives (S07-08) |
| qa-adm-42@test.com (throwaway, registered ~20:36, QaAdmin#2026) | new | 1 coin + 51 buys (S04-09), slash-uid pollution (S04-10), long thesis (S04-11), Sign out all devices, trash, **Delete now** (permanent) | n/a — erased (user doc, subtree, Auth all 404); an uppercase re-registration attempt was refused "Email already registered" |
| admin2@test.com (owner, my admin account) | owner; apparently never onboarded in the user app (the Welcome-to-Starter modal appeared) | Signed in to **/app** as admin2 (BUG-005 variant): the onboarding gate auto-ran `chooseFreePlan` → `planChosen:true`, a default portfolio (portfolioCount 1), audit "User chose the free plan" by admin2 | N — `planChosen` is server-only and cannot be unset from the panel; harmless (admins are excluded from all user counts) |
| localStorage `ci-admin-user-views` | absent | saved views created for S04-07 | Y (deleted via ×; key now `[]`) |

## Coverage
| Admin function | Result | User-app effect verified | Mobile 375 / keyboard |
|---|---|---|---|
| View as — read-only (reason required, audited) | Pass on data (p01, p02, p03, p04, p05, p07, p08, p09, p10, free@, pro@, qa-adm-05 reconciled with the app and/or Firestore); **S04-04** formatting + funnel + order, **S04-09** tx order/truncation, **S04-11** long text, **S04-12** admin targets, **S04-15** stale Learn streak (app + view-as); S01-05 close/Escape repeat | Y — p02 Journal ("visible only to you and the CryptoIdea team"), p04 Learn, p09/p03 holdings match; view-as writes nothing | 375 Y (fits, scrolls); keyboard: reason autofocus ✓, Enter in reason does nothing, Escape ignored, background reachable by Tab (S01-05) |
| Private admin notes (save / edit / markup / clear) | Pass on escaping; **S04-01** silent overwrite between admins | Y — not in user export, not readable by user (403) | 375 Y; keyboard reachable |
| Saved views (save / apply / delete) | Pass; **S04-07** same-name overwrite; shared per-browser (S07-05) | n/a | keyboard: all chips reachable; no `aria-pressed` (S01-16) |
| Bulk set-tier / suspend / un-suspend over a filtered page | Pass (8 personas + pro@, all restored); **S04-08** interrupted run half-applies; **S04-14** concurrent diffs; no confirm (S01 obs.) | Y — p09 live tier badge + caps; suspended login refused with a clear message; open session unaffected until reload (S06-04) | bulk bar fits at 375; it has no role/label/`aria-live`, so "N selected" is not announced (S01-16 family) |
| Single tier change (p03 Pro→Starter) | Pass; Billing card stale (Repeat S06-06) | Y — live "Your plan is now Pro." + 1/100 → 1/30 | — |
| Audit before/after diffs | Pass — `tier: free→pro`, `disabled: false→true`, `deleted: false→true`, reason text; filter + search + CSV export | n/a | 375 Y |
| captureStatsSnapshot + Growth card | Pass (idempotent per day, series length 1); **S04-03** labels | n/a | 375 Y |
| System status heartbeats | Pass (data matches `getSystemStatus`; cron never fires in emulator, as documented); **S04-03** header wording | n/a | 375 Y |
| Webhook ledger card | Pass (empty; unsigned webhook → 401, not audited = BUG-006) | n/a | — |
| Suspend → Trash → Delete now (throwaways qa-adm-41, qa-adm-42) | Pass; **S04-06** stale-token re-create; note survives (S07-08) | Y — erased tab signed out on reload | typed-DELETE confirm |
| Admin access roster (read) | Pass — admin@ owner, manager@ manager, admin2 owner; **p01 is not a manager** (already revoked by an earlier session) | n/a | — |
| Owner step-up prompt | **S04-02** appears on every page load once the ~11–12-min window lapses (6 repros) | n/a | Enter submits ✓ |
| Data-leak sweep (bundle, Firestore, callables, /api/config, BUG-005) | Pass — see table below; **S04-10** is an admin-side input-validation gap, not a user-side leak | — | — |

## Findings
> 15 new findings (3 Medium, 12 Low), **no High** — the user-side data-leak sweep came back clean. Highest impact: **S04-10** (slash-path uids bypass the admin-target guards and write into user sub-documents), **S04-09** (view-as transaction history scrambled/truncated), **S04-01** (admin notes silently overwritten).

### S04-01 · Medium · Two admins (or two tabs) editing the same private note silently overwrite each other — the earlier note is lost with no trace
- **Steps (reproduced 2x on p04.dca):** (1) Admin tab: Users → p04 → the PRIVATE ADMIN NOTE loads. (2) Meanwhile another admin saves a different note for p04 (simulated with `saveUserNote({uid, note:"IMPORTANT (other admin): user disputes charge, do not change tier"})`; `getUserNote` confirms it is stored). (3) Back in the first tab (still showing the old text), append a few words → **Save note**.
- **Expected:** a conflict warning ("this note was changed by X at HH:MM — reload?"), or at least the first tab refreshing the note before editing.
- **Actual:** toast "Note saved ✓"; the stored note is the first tab's stale text + the appended words — the other admin's "IMPORTANT…" note is gone. The audit log only says "note updated" (content is deliberately never audited), so the lost text cannot be recovered. Run 2 with "IMPORTANT #2 …" — same result. Run 3 (20:55) with two real admin tabs: tab B saved "TAB-B: user called support, refund promised by Dana" on p06; tab A, still showing an empty note, saved "TAB-A: prefers email contact" → stored note is tab A's only; tab B's text is gone. (p06 note cleared afterwards.)
- **Also (code reading, `src/hooks/useAdminDashboard.js` L383–393):** `loadNote` turns ANY `getUserNote` failure (network blip, token refresh) into an empty, `loaded:true` note, so an admin who then types and saves wipes the real note the same way. **Live-checked 2x (21:12–21:13, p06 and p09):** with a real note stored ("REAL NOTE: VIP, handle with care") and the `getUserNote` request failing (simulated network drop in the page), the detail shows an empty note box with no error and no "Last edited by" — indistinguishable from "no note" (I did not save; notes cleared afterwards). Also `saveNote` keeps the previous `updatedByEmail`, so "Last edited by" can name the wrong admin after a save (code only).
- **Effect on user accounts / user app:** none directly (notes are admin-only), but support context such as "user disputes charge, do not change tier" can vanish and a later admin then acts against it.
- **New.** (Same class as S02-10 for Settings switches.)
- **Suggested fix:** `functions/index.js` `saveUserNote` (~L1639): accept the `updatedAt` the client loaded and refuse (`failed-precondition`) in a transaction if the stored `updatedAt` differs; `src/hooks/useAdminDashboard.js` `saveNote`/`loadNote` (~L383–388): send it, and on refusal reload and show "changed by {updatedByEmail} — your text kept below".

### S04-02 · Low · An owner opening /admin gets an unexplained "Confirm your password" prompt on page load, before doing anything
- **Steps (6x: 20:12, 20:13, 20:14, 20:36, 20:46, 21:06:51 — and NOT shown on reloads up to ~11 min after a fresh sign-in, e.g. 21:06:09 at 11.2 min; it appeared at ~11.8 min):** be signed in to /admin as an owner (admin2) for more than ~10 minutes (or with no live unlock) → open or reload http://localhost:3000/admin.
- **Expected:** the Overview loads; a password is asked only when the owner opens Settings / Admin access or performs a sensitive action.
- **Actual:** a modal "Confirm your password — Settings, API keys, plans and admin access need a recent password confirmation…" appears over the Overview immediately on load. Cancel dismisses it and everything else works. Cause: `src/hooks/useAdminDashboard.js` ~L440–447 calls `loadConfig()` for every owner as soon as the role resolves, and `withUnlock` turns the server's `reauth-required` into the prompt.
- **Effect:** admin-only; trains owners to type their password into a prompt they did not trigger (bad habit for a step-up control) and interrupts every page load.
- **New.**
- **Suggested fix:** load config lazily when the Settings tab (or a drill-in that needs it) opens; on load, call it in a mode that does not prompt (swallow `reauth-required`/`settings-locked` and show the padlock state instead).

### S04-03 · Low · Growth / status wording: "Signups yesterday" is really "last 24 h at capture time"; "Scheduled jobs: never run" while one job ran 2 h ago; manually captured snapshot leaves "Daily stats: never"
- **Steps (2x — after "Capture now" at 20:20, and after reload):** Overview → Growth → **Capture now** → toast "Snapshot captured for 2026-11-24"; card shows "Signups yesterday: 3 · 1 day of history". Status strip header reads "Scheduled jobs: never run" while its own pill says "Trash cleanup 2h ago"; "Daily stats" pill still says "never" after the capture.
- **Expected:** label matching the data (`signups24h` = rolling 24 h ending at the capture time, `functions/index.js` ~L1170); a header that says e.g. "5 of 6 jobs never run"; and either the manual capture counting for the Daily stats pill or a hint that only the nightly job does.
- **Actual:** as above. A manual capture at 20:20 counts signups since 20:20 the previous day, not "yesterday".
- **Effect:** admin-only, misleading numbers on the growth card.
- **New** as a finding (the "never run" headline was noted in the S09 timeline at 17:53 but not filed). Related: PAID SUBS = 2 and MRR count the two comped accounts (Repeat of S01-08).
- **Suggested fix:** `src/components/admin-dashboard.jsx` ~L686: "Signups in the 24 h before capture"; ~L532: summarise counts per health state instead of only the worst state.

### S04-04 · Low · "View as" prints raw data ("1e-8", raw ISO dates, no money formatting) and omits the journal's research findings
- **Steps (2x — p09 via the UI at 20:19 and the 375 px iframe):** Users → p09.edge → View as — read-only → reason → Open.
- **Expected:** amounts/prices/dates formatted like the user app (the user sees "100,000 SOL", local dates).
- **Actual:** "BUY 1e-8 @ $70 · 2026-11-21T17:15", "BUY 100000 @ $100 · 2026-11-21T17:14". The data itself matches what p09 sees (1 portfolio, SOL, 2 tx, thesis, change-my-mind, status intact); p04 and p07 snapshots matched their apps too (coins, tiers, Learn 50 XP / 1 lesson / 1-day streak).
- **Also (2x, qa-adm-41 and payload read):** the snapshot payload carries `journal.funnel` (the three manual-research findings the user sees in the Journal detail) and `journal.createdAt`, but the viewer never renders them — so "what the user sees" is incomplete for any coin with findings.
- **Also (2x: p08.organizer, qa-adm-05):** portfolios are listed in Firestore doc-id order, not the user's `order` — p08 sees "My Portfolio" then "Trading" in the app; View as shows "Trading" first. Counts themselves reconciled exactly with Firestore for pro@ (6c+4c), p05 (1c/1tx), p08 (2 empty), qa-adm-05 (5 portfolios). For qa-adm-05 (21:01) the app lists QA Four, QA Five, My Portfolio, QA Three, QA Two and Account shows **"Portfolios 5 / 3"** (over the Starter limit); View as lists them in a different order and shows neither the over-limit state nor which portfolio is active.
- **Effect:** admin-only; a support agent can misread 1e-8 or the time (UTC vs local, see BUG-024), and can't see the user's research findings.
- **New** (cosmetic + support completeness).
- **Suggested fix:** reuse `src/utils/money.js` and the app's amount/date formatters in the view-as renderer in `src/components/admin-dashboard.jsx`.

### S04-05 · Low · The user's "Download all my data" export leaves out the admin notes and audit entries held about them
- **Steps (2x — p09 at 20:23 and p08 at 20:59, checked by reading the payload):** save a note on p09 ("QA-S04 SECRETNOTE-XYZ") → as p09 call `exportMyData` → search the JSON.
- **Expected (policy question):** under GDPR Art. 15 a subject-access export normally includes personal data held about the person, including staff notes and access logs, unless an exemption applies.
- **Actual:** the export has `account/profile/portfolios` only; no note, no "Viewed a user's data" entries. From a **leak** point of view this is a PASS (nothing admin-only reaches the user); from a **compliance** point of view it is a gap to decide on. Note cleared afterwards.
- **Also (static check, 21:05):** the default `privacy.html` says user content "is stored privately per account and is not visible to other users" but never mentions that staff can open it (owner View as incl. theses, manager Firestore reads S05-09) or that private staff notes are kept — while the Journal tab itself says "visible only to you and the CryptoIdea team". The policy and the in-app line should agree.
- **Effect:** no user-app effect; legal/compliance.
- **New** (founder decision; related to S07-08, where the note also survives erasure).
- **Suggested fix:** decide in `docs/product/LEGAL.md`; add a staff-access sentence to `privacy.html`; if included, add `adminNotes/{uid}.note` (and optionally audit entries targeting the uid) to `exportMyData` in `functions/index.js`.

### S04-06 · Low · After "Permanently deleted ✓", the erased user's still-open session can re-create `users/{uid}` with their email and name
- **Steps (reproduced 2x on my throwaway qa-adm-41, 20:26):** register qa-adm-41 in the user app and leave the tab open. Admin: user → Delete account (type DELETE) → Trash → Delete now → "Permanently deleted ✓" (Auth user, `users/{uid}`, portfolios all gone; `viewUserAsAdmin` → 404). From the still-open user tab (its cached ID token is valid until `exp`, ~55 min later) send a Firestore create: `PATCH users/{uid}?currentDocument.exists=false` with `{email, name, tier:"free"}`.
- **Expected:** after a GDPR erasure no personal data for that uid can reappear.
- **Actual:** 200 — the profile doc with email + name is back. (Server paths are safe: `chooseFreePlan` → "Finish creating your account first.", `addCoinGuarded` → "Choose a plan before adding coins.", portfolio writes → 403, so no portfolio/coin data comes back.) Deleted it as owner, re-created it again with the same token → 200 again; final state cleaned (404).
- **Effect on user accounts:** an orphan profile with PII that no purge sweep will ever find (it has no `deleted` flag and no Auth user, so it is invisible in Users/Trash) — contradicts the "erased" promise. Needs a deliberate client write within the token lifetime; the app itself did not re-create it while idle, and on reload the tab was signed out.
- **New.** Related: **S08-01** (the erased tab's "Restore my account" — that session found nothing resurrected through the app's own paths; this is the direct-write path the rules still allow) and S07-08 (the admin note also survives erasure; reconfirmed here, the note on qa-adm-41 is still readable via `getUserNote`).
- **Suggested fix:** in `firestore.rules` `match /users/{userId}` `allow create`, also require `request.resource.data.email == request.auth.token.email` and block a re-create for an erased uid — e.g. have `deleteUser` (functions/index.js) write a server-only tombstone `erased/{uid}` and check `!exists(/databases/$(database)/documents/erased/$(userId))`; and call `admin.auth().revokeRefreshTokens(uid)` before deleting the Auth user.

### S04-07 · Low (nit) · "+ Save view" with an existing name silently replaces that view's filters
- **Steps (2x):** Users → set search "p0" + Tier Starter → + Save view "QA S04 <b>starter p0</b>" (prompt stubbed, S01-15). Clear the filters → + Save view with the same name → stored filters become `{q:"", tier:"all"}`. Again with a 300-char name (stored truncated to 40) under Tier All, then Tier Pro + same name → filters replaced by `tier:"pro"`.
- **Expected:** "A view with this name exists — replace it?" (views are shared by every admin using the browser, S07-05, so the replaced view may be someone else's).
- **Actual:** silent replace; no toast. Whitespace-only name is ignored (good); HTML in the name renders as text (good).
- **Effect:** admin-only.
- **New.**
- **Suggested fix:** `src/utils/admin-views.js` save helper: return a "duplicate" flag and confirm in the panel (non-blocking inline confirm, not `window.confirm`).

### S04-08 · Low · A bulk action interrupted by a reload / tab close / navigation is left half-applied with no warning and no record of which rows were done
- **Steps (2x, 20:32–20:34):** Users → search "p0" + Tier Starter → Select page ("8 selected") → bulk **Pro** → reload the page ~0.25 s later. Run 2: same with bulk **Suspend**, reload after ~0.4 s.
- **Expected:** either the bulk runs server-side as one job, or the page warns before unload ("3 of 8 done — leave anyway?") and the result is visible afterwards.
- **Actual:** run 1 → 3 of 8 users became Pro, 5 stayed Starter; run 2 → 4 of 8 suspended (p05, p06, p08, p09), 4 not. No `beforeunload` guard; after reload the selection, progress and toast are gone, and the audit shows only the individual per-user entries (nothing marks a bulk run or that it stopped). Restored all of them by hand afterwards.
- **Effect on user accounts:** a random subset of users gets the change (here: 4 personas locked out of the app until un-suspended), and the admin has to diff the list to find which.
- **Control (21:01):** switching to another panel tab (Overview) 0.15 s into a bulk Pro run does NOT interrupt it — all 8 changed — so only a reload / tab close / browser navigation half-applies it. (Reverted with bulk Starter.)
- **Also (code reading, `src/hooks/useAdminDashboard.js` L698–717):** any per-row failure is reported as "N skipped (owners are protected)" — but owners and managers are no longer in the Users list (ADMIN-SEP), so a real failure (network, deleted account, App Check) is mislabelled. **Live-checked (21:14):** p05 + p06 selected, the `setUserTier` request for p05 dropped (simulated network failure) → toast "Set 1 to pro — 1 skipped (owners are protected)" although p05 is a normal Starter user (p06 reverted to Starter).
- **New.** (Related: S01-19 hidden-row selection, S01-10 tier ids in toasts.)
- **Suggested fix:** register a `beforeunload` handler while `busy` in the bulk loop; show live progress "3/8…"; report failures with the server's message; longer term a single server-side `bulkSetTier`/`bulkSuspend` callable that writes one audit "bulk" entry listing the uids.

### S04-09 · Medium · "View as" shows transactions in random order, drops a random one past 50 while saying "Showing the first 50", and says that even when nothing was dropped
- **Steps (2x via the UI + 2x via the callable, on my throwaway qa-adm-42 — 1 coin, 51 buys dated 2025-01-02 … 2025-02-21, amounts 1…51):** Users → qa-adm-42 → View as → reason → Open.
- **Expected:** transactions newest-first like the user's Detail screen (`src/utils/tx.js` order), and a truncation note only when something was left out, naming what is missing ("showing the newest 50 of 51").
- **Actual:** rows come out in Firestore doc-id order (17, 45, 28, 47, 30, 12, … 1, 27, 9, 51, 10) — not by date; the 51st buy left out is an arbitrary one (#49, 2025-02-19, from the middle of the history), and the footer says "Showing the first 50 transactions." After deleting one tx so exactly 50 remain, the payload still has `txTruncated:true` and the UI still says "Showing the first 50…" although all 50 are shown (off-by-one: `txSnap.size >= VIEW_MAX_TX_PER_COIN`). The same `>=` applies to portfolios (20) and coins (150).
- **Effect on user accounts:** none written; but support reads a scrambled and silently incomplete history when answering "where did my buy go?" — the exact question view-as exists for.
- **New.**
- **Suggested fix:** `functions/index.js` ~L1580: `.orderBy("date","desc").limit(VIEW_MAX_TX_PER_COIN + 1)` and set `txTruncated = size > MAX` (slice to MAX); same "+1" pattern for portfolios/coins (~L1570–1576); in the viewer say "Showing the newest 50 of {txCount}".

### S04-10 · Medium · Admin callables accept a `uid` containing "/" — they then write admin fields (`tier`, `deleted`, `deletedAt`, `premiumLimits`) into a user's portfolio/coin docs or create phantom docs anywhere under `users/`, and the "target is an admin/owner" guards are skipped
- **Steps (20:41–20:42 per the audit log; 7 calls across 5 callables, 2 targets):** as an admin call, with the normal SDK/HTTP callable request:
  1. `restoreUser({uid:"null/portfolios/default"})` → 200; Firestore now has a phantom `users/null/portfolios/default` = `{deleted:false, deletedAt:<delete>}`; `viewUserAsAdmin` on the same path → 200 with a fake "user" (email "", tier free).
  2. On my throwaway qa-adm-42: `restoreUser({uid:"<uid>/portfolios/default/coins/bitcoin"})` → the coin doc gains `deleted, deletedAt`; `setUserTier({uid:"<uid>/portfolios/default", tier:"pro"})` → the portfolio doc gains `tier:"pro"`; `adminTrashUser` → `deleted:true, deletedAt`; `setPremiumLimits` → `premiumLimits:{coins:5}`. All "success"; each audit row names the path as its target ("tier: free→pro", "deleted: false→true").
  3. `saveUserNote({uid:"qa-s04/x/y"})` → note stored at `adminNotes/qa-s04/x/y`.
- **Expected:** `invalid-argument` for any uid that is not a plain Auth uid (no "/", bounded length) — the same path-segment check `addCoinGuarded`/`addTransactionGuarded` already do (`unsafePathSeg`).
- **Actual:** accepted. `assertTargetNotAdmin` / `assertTargetAllowed` call `auth.getUser(uid)`, which throws for a path, and the catch treats that as "no auth record → not an admin" (functions/index.js ~L307–312), so a **manager** can write these fields into an **owner's** subtree (e.g. `<ownerUid>/portfolios/x`) — the "a manager may not act on an owner at all" rule is bypassed for sub-documents (code reading; I ran the calls as an owner).
- **Effect on user accounts:** the user's app kept working (qa-adm-42 could still rename the portfolio, edit the journal and add a buy — rules don't use `hasOnly` on these updates), but the docs now carry foreign admin fields forever, the audit log names non-existent "users", and `restoreUser`/`saveUserNote` create orphan docs. Admin-only actors; no user-side path.
- **New.** (Broader than S05-08, which covers unknown-but-well-formed uids.)
- **Suggested fix:** one `assertUid(uid)` helper in `functions/guards.js` (`typeof uid === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(uid)`) called first in every callable that takes a target uid (setUserTier, setPremiumLimits, suspendUser, restoreUser, adminTrashUser, adminSignOutUser, deleteUser, viewUserAsAdmin, get/saveUserNote, lookupUser); make `assertTargetNotAdmin` fail closed on unexpected `getUser` errors (only `auth/user-not-found` means "not an admin"); and use `update()` (not `set(merge)`) in `restoreUser`.
- **Bounds checked (read-only probes):** `..` segments are rejected by Firestore (`viewUserAsAdmin({uid:".."})` and `"zz/portfolios/../../<uid>"` → INTERNAL 500), so the reach is confined to sub-paths of `users/` and `adminNotes/` — it cannot touch `config/app`. `deleteUser` refuses slash paths (404); `suspendUser` / `adminSignOutUser` with a slash path fail with a bare INTERNAL 500 (Auth is called first; no audit row). A numeric uid (`12345`) is also accepted by `getUserNote`.
- **Cleanup:** phantom `users/null/portfolios/default` deleted (owner REST delete); `adminNotes/qa-s04/x/y` emptied (doc remains — server-only collection); qa-adm-42's polluted docs go with its erasure below.

### S04-11 · Low (nit) · A long unbroken word or URL in a user's thesis makes the View-as body scroll sideways ~17,000 px
- **Steps (2 fields, 375 px iframe, 20:44):** on throwaway qa-adm-42 the user saves a thesis of 1,500 "W"s and a "what would change my mind" with a 320-char URL (both within the 2,000-char limit) → admin View as.
- **Expected:** text wraps inside the card (`overflow-wrap:anywhere`), as the rest of the viewer does.
- **Actual:** the thesis/URL rows are clipped and `.adm-viewas-body` gets `scrollWidth 17,860` vs `clientWidth 303` — a horizontal scrollbar for the whole snapshot, so the transaction list has to be dragged back into view. (Hostile markup in the same fields is escaped — see the leak table.)
- **Effect:** admin-only; a user can make their own snapshot awkward to read.
- **New** (same class as S02-11 in the user app).
- **Suggested fix:** `src/styles/admin-settings.css`: `.adm-viewas-body { overflow-wrap:anywhere; }` (or on the thesis/finding rows).

### S04-12 · Low · `viewUserAsAdmin` lets an owner open another admin's private data (the other owner, a manager, or themselves), although "no admin is a moderation subject" everywhere else
- **Steps (2x + self):** as admin2 (owner): `lookupUser("admin@test.com")` → `viewUserAsAdmin({uid, reason})` → 200, role "owner", 1 portfolio with coins/transactions; same for `manager@test.com` → 200, role "manager"; and for admin2's own uid → 200.
- **Expected:** consistent with ADMIN-SEP (CRYP-103b): suspend/tier/limits/trash/delete all refuse admin targets with `failed-precondition`; admins are hidden from the Users list so the UI never offers it — the callable should refuse too (or the policy should say owners may inspect each other).
- **Actual:** allowed via the API (audited as "Viewed a user's data" with the reason).
- **Effect:** admin-only; owners can read the other owner's / managers' personal portfolios and theses outside the UI.
- **New** (policy decision).
- **Suggested fix:** add `await assertTargetNotAdmin(uid, "view")` to `exports.viewUserAsAdmin` in `functions/index.js` (after S04-10's uid validation).

### S04-13 · Low (nit) · View-as reason and private-note fields have no accessible label; the reason has no length limit, Enter doesn't submit it, and a long reason is cut in the audit
- **Steps (2x — p04 and p06 detail):** inspect the "Reason (e.g. user reported a missing portfolio)" input and the note textarea; type a reason and press Enter; call `viewUserAsAdmin` with a 5,000-char reason.
- **Expected:** a real `<label>`/`aria-label` (placeholder text disappears once typing starts and is not a reliable name); `maxLength` matching what the audit keeps; Enter submits the one-field form.
- **Actual:** neither field has `id`/`label`/`aria-label`/`aria-labelledby` (only placeholders); the reason input has no `maxLength` (the note has 4,000); Enter does nothing (focus must Tab past Cancel to Open); the server accepts 5,000 chars and the audit row shows ~350 chars with an ellipsis (`DETAILS_MAX` 500). **The server also accepts non-string reasons** (20:56, 3 calls on p08): `reason:{x:1}` → audited as "reason: [object Object]", `reason:["a"]` → "reason: a", `reason:42` → "reason: 42" — the "reason required" control is satisfied by a value that isn't a reason.
- **Effect:** admin-only, accessibility + audit completeness.
- **New** for these two fields and the server-side type check (same family as **S08-03**, which covers the typed-DELETE confirms, and S01-16 / BUG-113).
- **Suggested fix:** in `src/components/admin-dashboard.jsx` wrap both in `<label>` (or `aria-label`), give the reason `maxLength={300}` (server: `typeof reason === "string"`, trimmed length 5–300, in `viewUserAsAdmin`), and put the reason field + Open button in a `<form onSubmit>`.

### S04-14 · Low · Audit before/after diffs are read-then-write, so two concurrent tier changes are both logged as "free→…" and the trail can't explain the final state
- **Steps (2x on p05, 21:08–21:09; restored to Starter/enabled after each):** two admins (simulated with two parallel `setUserTier` calls) set p05 to Pro and to Premium at the same moment.
- **Expected:** the audit tells the true sequence — e.g. `free→pro` then `pro→premium` (or the losing write is refused).
- **Actual:** both rows read `tier: free→pro` and `tier: free→premium`; the final tier is premium. Run 2 (with two parallel suspends as well): `free→premium`, `free→pro`, `disabled: false→true`, `disabled: true→true`. Someone reconstructing "who changed this account and from what" gets two contradictory "from free" rows; reverting "by hand" from the diff (the ADMIN-5 promise) would restore the wrong value.
- **Effect on user accounts:** none directly (the final state is consistent); audit accuracy only. Realistic with two owners/managers or two stale tabs (S02-10 / S05-12 class).
- **New.**
- **Suggested fix:** in `functions/index.js` `setUserTier` (~L1322–1326) and the other diffed mutations, read + write inside one `db.runTransaction` and log the transaction's `before`; optionally accept an `expectedTier` from the client and refuse on mismatch.

### S04-15 · Low · Learn shows a live "🔥 1-day streak" days after the streak ended — in the user app and in View as
- **Steps (2x — p04 user app at 20:13, p04 View as UI at 20:14 and payload at 21:14):** p04's stored progress is `{streak:1, lastActivity:"2026-11-21"}`; today is 2026-11-24. Open Learn as p04; open View as for p04.
- **Expected:** a streak counts as broken after a missed day (it resets to 1 only on the next activity, `streakOn` in `src/utils/learn.js` L63–69), so the chip should be hidden or read "0-day streak" until the user is active again; View as should say "last active Nov 21".
- **Actual:** the app shows "🔥 1-day streak" and View as shows "50 XP · 1 lesson · 1-day streak". `src/components/Learn.jsx` L142 renders `progress.streak` straight from storage with no check of `lastActivity`, so any past streak (e.g. 30 days) would keep showing indefinitely.
- **Effect on user accounts / user app:** misleading gamification for every user who stops for a day or more; support sees the same stale number.
- **New** (BUG-117 is only the "keep your streak going" copy).
- **Suggested fix:** derive the displayed streak with a pure helper (`displayStreak(progress, today)` = 0 when `today - lastActivity > 1` day) in `src/utils/learn.js`, use it in `Learn.jsx`, and show `lastActivity` in the View-as Learn row (`src/components/admin-dashboard.jsx`).

## Data-leak and backend checks
| Check | Result |
|---|---|
| (a) User-app module scan (104 of 118 loaded /src modules fetched) for 20 admin callable names, `adminNotes`, `settingsUnlock`, `statsDaily`, `adm-`, `admin-dashboard` | PASS — only CSS/JSX **comments** in app.css / Account.jsx / ui.jsx mention `.adm-*`/admin-dashboard (stripped in prod) |
| (a') Built `dist/` (stale build, 2026-11-21): every non-admin chunk grepped for admin callables | PASS — only hit is `listUsers` inside Sentry's bundled Supabase integration (third-party string) |
| (b) p04 token → Firestore REST: own user doc / `users` list / another user's doc + portfolios / `config/app` / `audit` / `adminNotes` (own + list) / `statsDaily` / `health/jobs` / `webhookEvents` / `rateLimits` / `aiBudget` / `settingsUnlock` / `settingsPwReset` / `cache/universe` / collection-group `coins` | PASS — own doc 200, everything else 403 |
| (b) p04 token → 20 admin callables (listUsers, getStats, lookupUser, viewUserAsAdmin, get/saveUserNote, listAudit, listWebhookEvents, listDailyStats, getSystemStatus, findDuplicateEmails, captureStatsSnapshot, listAdmins, setUserTier, setPremiumLimits, restoreUser, getAdminConfig, setManagerRole, adminSignOutUser) | PASS — all `403 PERMISSION_DENIED "Admins only."` |
| (b) p04 token → `devSetMyTier` | 200 — self-upgrade to Premium works, but only because the callable is hard-gated to `FUNCTIONS_EMULATOR==="true"` (functions/index.js ~L1342). Not a prod leak. Restored to free. |
| (c) `/api/config` | PASS — only public flags/plans/analytics ids/legal ids/announcement; no keys, secrets, SMTP, AI, PayPal, Sentry, `requireAdminMfa` or `stepUpReauth`. POST returns the same public JSON; `/api/admin`, `/api/stats` → "unknown action" |
| Users CSV export with a hostile display name `=HYPERLINK("http://x","c"),"<newline>@x` on p10 (set via the user's own Firestore write, reverted) | PASS — cell exported as `'=HYPERLINK(…)` inside quotes; list renders it as text |
| User self-write of admin/billing fields on own `users/{uid}` (`premiumLimits`, `limits`, `subscription`, `role`, `isAdmin`, `admin`, `suspendedAt`, `disabled`, `portfolioCount`, `billingCycle`, `paypalSubscriptionId`, `scheduledNext`, `email`) | PASS — all 403; only `name` writable |
| Hostile coin name/symbol, journal thesis/changeMyMind/createdAt/funnel and portfolio name (written by the user, qa-adm-41) rendered in admin **View as** | PASS — all shown as literal text, no element injected, coin `thumb` URL not loaded by the viewer |
| `exportMyData` for a user with an admin note | PASS (no leak) — note not included; see S04-05 for the compliance angle |
| Unsigned PayPal webhook POST to `paypalWebhook` | 401 "Invalid webhook signature", ledger card stays empty; the rejection is not audited (Repeat of BUG-006) |
| User-app network on load (p10) | only `/api/config`, `/api/trending`, Auth lookup, Firestore Listen, Sentry envelope — no admin endpoints |
| Throwaway user token → collection-group queries on `transactions`, `portfolios`, `learn`, `coins`, `users`, `audit`, `adminNotes`; `batchGet` of `config/app` + another user; another user's `learn/progress`; `listCollectionIds` (own doc + root) | PASS — all 403 |
| `deleteUser` with a slash path (`<uid>/portfolios/default`) | PASS — 404 "No such user.", nothing deleted (it checks Auth first) |
| Admin "Sign out all devices" on qa-adm-42 with its tab open | the open session still writes via callable (200) and Firestore (200) — Repeat of S01-06 |
| View-as writes nothing | PASS — `users/{uid}` and coin doc `updateTime` unchanged across a `viewUserAsAdmin` call (p09); the viewer has a single control (close); only callable hit is `viewUserAsAdmin` |
| Audit tab: action filter + search + CSV export of the filtered rows | PASS — "2 entries of 100 loaded", CSV has exactly those 2 rows; Source IP empty (emulator, as documented) |
| `listUsers` / `lookupUser` / `getStats` payload shape | operational fields only (no holdings, no consent/settings) |
| Same-origin storage seen from the user app | `ci-admin-user-views` (admin saved views) and 16 `ci-profile-<uid>` caches incl. erased qa-adm-41's email+name (Repeat of BUG-073) are readable by any page on the origin |
| Repeat sweep from a 2nd persona (p08, 20:58): 22 admin/owner callables + 7 server-only Firestore paths | PASS — all 403 |
| Final repeat from a 3rd persona (p10, 21:11): 25 admin/owner callables (incl. setSettingsPassword, unlockSettings, deleteUser) + 10 server-only Firestore paths | PASS — 25/25 and 10/10 denied (403) |
| Admin "Sign out all devices" on p08 from the UI | one click, no confirm, toast "Signed out of all devices ✓"; p08's open /app kept working until reload, then landed on the login screen with no explanation (Repeat of S01-06) |
| Admin Log out in one admin tab while another admin tab has an unsaved note draft | the other tab is signed out at once (shared auth) and the draft is discarded without a warning (security-wise correct; noted, not filed) |
| Live tier sync to an open /app (p08, 4 changes 6 s apart) | PASS — badge + "Your plan is now X." toast within ~1 s for every up- and downgrade |
| Counter integrity sweep (all users: `portfolioCount` vs portfolio docs, `coinCount` vs coin docs) | 1 drift found: p07 `portfolioCount` 2 vs 1 real portfolio (cause not reproduced — earlier session's maintenance-mode create/delete is the likely origin); Users list + Overview "PORTFOLIOS 23" showed the drifted value; healed when p07 deleted a portfolio (`reconcileMyCounters fixed=1`) → Overview 22. Observation only (seen once). |
| User self-service callables with another user's uid (p01 token): `reconcileMyCounters({uid})`, `exportMyData({uid})`; `addCoinGuarded` with a `../../<other>/portfolios/default` portfolioId | PASS — "Unexpected field" / "A portfolio is required." (unsafe path segment rejected) |
| Service worker / app HTML | PASS — `public/service-worker.js` never caches `/api/**`; the only "admin" in app.html is an HTML comment; Cache Storage empty in dev |
| Users search robustness (`[`, `(`, `*`, `\`, `.*`, emoji, mixed case) | PASS — literal, case-insensitive, no crash; internal double spaces are not normalised ("Zo  OBrienSmith" → 0 matches although the row renders as "Zo OBrienSmith") — nit, not filed |
| (d) Admin tab (admin2) + user tab (p04 → p07 → p09 → p10 → p03 → p08 → p01, plus throwaways) open together all session | PASS — no cross sign-out (BUG-005 holds), including admin Log out/in, admin2 itself signing in/out of /app, and cross-tab admin logout. Note: both sessions sit in the same origin's IndexedDB (`firebase:authUser:…:[DEFAULT]` and `…:admin`), so script in the user app can read the admin's ID token — same-origin by design, but any future XSS in the user app would reach the admin session. |
| Private admin note with `<img onerror>`, `<script>`, `</textarea>`, `{{7*7}}`, `${1+1}`, RTL override | PASS — stored verbatim, rendered as text after reload, no element injected, no script ran |
| View-as reason with HTML | PASS — rendered as text in the Audit tab |
| Saved-view name with HTML (via stubbed `prompt`) | PASS — rendered as text |
| `viewUserAsAdmin` server checks | PASS — missing / whitespace-only reason → 400; unknown uid → 404 "No such user."; 5,000-char reason accepted (audit details capped). Owner can view-as another owner/manager/self (S04-12); non-string reasons accepted (S04-13) |
| Note at the 4,000-unit boundary (API: 3,999 × "a" + 😀) | saved "✓", stored 4,000 units ending in U+FFFD — the emoji is cut in half and replaced (silent truncation, same as the S05-08 addendum); the UI `maxLength` prevents it in normal typing. p06 note cleared. |
| Audit completeness for this session (admin2, since 20:10) | 170 rows: setUserTier 57, viewUserAsAdmin 43, saveUserNote 22, suspendUser 16, unsuspendUser 14, captureStatsSnapshot 6, adminTrashUser 3, restoreUser 3, deleteUser 2, adminSignOutUser 2, setPremiumLimits 1, chooseFreePlan 1 — every mutation I made is present; refused/failed calls leave no row (S05-05); `ip` empty on all (emulator, documented) |
| `listDailyStats` limit 1e9 / −5, `listWebhookEvents` limit "abc" | PASS — clamped, no error |

## Known bugs re-checked
- **BUG-005** (admin tab signs out user sessions) — holds: admin tab + user tab open all session, admin Log out / re-login, persona logins; also signing the SAME owner (admin2) into /app and logging out there left the /admin session signed in. Side effect seen: the owner's first /app sign-in silently ran the onboarding (`chooseFreePlan`, audited as "User chose the free plan") — same audit-wording issue as S06-03.
- **BUG-006** (webhook rejections not audited) — still: unsigned POST → 401, no audit row.
- **BUG-020** ("Live sync was interrupted" during account setup) — reproduced on both throwaway registrations (qa-adm-41, qa-adm-42).
- **BUG-034 / BUG-080** (credentials stay in the form) — after logging qa-adm-42 out in the same SPA session, the Register form still held its email and 12-char password (typing appended to them); after admin2 logged out of /app the Log-in password field still held a value.
- **BUG-073** (previous users' cached profiles in localStorage) — 16 `ci-profile-<uid>` entries incl. the erased qa-adm-41's email+name.
- **BUG-092 / S01-14** ("Joined" = last login) — cached profiles show joined 2026-11-24 for personas created 11-21.
- **BUG-121** (two-tap confirm auto-disarms) — the user-side delete-portfolio pill disarmed before the second tap; the shifted layout then made my second tap hit "Rename".
- **S01-03** ("Your plan is now X." on login after another account) — seen on p07 and p09 logins.
- **S01-05** (view-as close 1.6 px, Escape ignored, not a dialog) — still; keyboard focus also reaches background "Delete account" while it is open.
- **S01-06 / S06-04** (suspended / signed-out session keeps working) — reconfirmed: after bulk suspend the p09 tab kept working until reload; after "Sign out all devices" qa-adm-42's tab still wrote via callable and Firestore.
- **S01-08** (revenue / paid subs count comped accounts) — Growth "PAID SUBS 2", MRR $58 with zero PayPal subscriptions.
- **S01-18** (repeated clicks while in flight) — also in the **bulk bar**: a triple-click on bulk "Pro" with p05 selected ran the loop 3× → audit `free→pro`, `pro→pro`, `pro→pro` (p05 reverted). The view-as "Open" button is not guarded either: a triple-click on p06 produced 3 `viewUserAsAdmin` calls and 3 "Viewed a user's data" audit rows (20:51:38, 20:51:41 ×2); and "Capture now" triple-clicked → 3 `captureStatsSnapshot` calls/audit rows (21:04:19, 21:04:22 ×2) — harmless (same-day doc replaced) but noisy. Same family: `restoreUser` on an active account audits "deleted: false→false".
- **S05-08** (phantom docs for unknown uids) — extended by S04-10 (slash paths).
- **S06-06** (Billing card stale after a tier change) — p03 at PRO still read "No active subscription (free tier)".
- **S01-13** (comped account shown as a paying subscriber) — View as and the Users CSV (Tier filter Premium, 21:07) report p07 as Billing "active" with no PayPal subscription id.
- **S01-04** (audit target stored as raw uid) — every tier/note/suspend row in my run shows the target as a uid (e.g. `→ VH32qkjd…`), only view-as/trash rows show the email.
- **S06-12** (Users tab click doesn't return to the list) — clicking Users from Audit reopened the last user detail.
- **S05-10** (backend unreachable → toast "internal [0]") — a simulated network drop on `viewUserAsAdmin` shows "internal [0]" and no viewer (21:13).
- **S07-05** (saved views shared per browser) — the `ci-admin-user-views` key is per-origin; also readable from the user app.
- **S07-08** (admin note survives GDPR erasure) — reconfirmed on qa-adm-41.
- Not reproduced: **S09-11** (step-up prompt stuck on a disabled "Checking…") — the load-time prompt (S04-02) unlocked normally with the password + Enter at 20:13 and 20:46.
- Not reproduced: S06-03 (downgrade re-triggers onboarding) — bulk Pro→Starter on personas that already had `planChosen:true` did not re-gate them.

## What worked well
- Every user-side probe failed closed: 20 admin callables → "Admins only.", every server-only collection and collection-group query → 403, no self-write of any admin/billing field, no admin module in the user bundle, `/api/config` carries no secrets.
- Output encoding is solid across the admin surfaces I attacked with user- and admin-controlled markup (notes, view-as reason, saved-view names, coin/portfolio/journal fields, CSV formula cells).
- View-as is genuinely read-only (no doc `updateTime` changes), refuses blank/whitespace reasons on the server, and its data matched the app for every persona compared; the app honestly tells users the journal is visible to "the CryptoIdea team".
- Audit diffs are precise and immediate; Audit filter/search/CSV export only the visible rows.
- Bulk tier/suspend reached the user app live (badge, caps) and suspended logins get a clear message.
- Erasure removes the whole `users/{uid}` tree and the Auth user; `deleteUser` refuses a slash path. The typed-DELETE confirm is exact-case ("delete" keeps Move to trash disabled) and Cancel leaves no audit row.

## Timeline
- 20:10 — Start (epoch 1795543856). Health check OK (`/api/config` starts with {"maintenance", /admin 200). Report created. Two pre-existing /admin + /app tabs (not mine) left alone; I worked in my own tabs.
- 20:12 — Leak sweep (b)(c) from a p04 session: all denied. `devSetMyTier` emulator-only self-upgrade noted + reverted.
- 20:13–20:15 — Bundle scan clean. Admin note + view-as escaping OK. Load-time password prompt (S04-02).
- 20:15–20:17 — View-as p07 vs app: match. p07 `portfolioCount` drift found and healed by the user's own delete flow.
- 20:19–20:21 — View-as p09 (journal + tx) vs app (S04-04). Capture now + Growth (S04-03). Bulk Pro / Suspend / Un-suspend / Starter on 8 personas, p09 verified user-side, audit diffs, all restored.
- 20:22–20:24 — Note overwrite (S04-01 ×2). Export excludes the note (S04-05). Admin Log out/in with the user tab open (BUG-005 holds).
- 20:24–20:28 — qa-adm-41: hostile-content view-as render (pass), suspend → trash → Delete now; stale-token re-create of `users/{uid}` (S04-06 ×2).
- 20:29–20:31 — Saved views (S04-07), self-write probes, Users CSV formula test, `listDailyStats`/`captureStatsSnapshot` idempotency.
- 20:32–20:34 — Keyboard-only view-as (S01-05 repeat); interrupted bulk runs (S04-08 ×2), personas fixed by hand.
- 20:35–20:38 — S04-02 reconfirmed; qa-adm-42 with 51 buys → view-as order/truncation (S04-09).
- 20:40–20:44 — p03 live tier change; slash-uid probes (S04-10, 20:41); `..` bounds; Sign out all devices (S01-06 repeat); long-text view-as at 375 px (S04-11).
- 20:45–20:47 — Owner view-as of other admins (S04-12); qa-adm-42 trashed + erased; p04 note cleared; saved views removed; all personas verified.
- 20:49 — admin2 signed into /app: auto-onboarding ran (BUG-005 variant passes).
- 20:51–20:57 — Bulk triple-click (S01-18 repeat), reason/label checks (S04-13), two-tab note overwrite run 3, cross-tab logout, pro@ bulk suspend/un-suspend, second-persona leak sweep, p08 live tier cycle, 375 px Trash/Settings/Overview, Admin-access lookup (no grant), Audit "Load more".
- 20:58–21:09 — Final bulk Pro→Starter pass (in-panel navigation control for S04-08), Settings → Admin access roster (p01 not a manager), privacy-policy check (S04-05), S04-02 6th repro, edge-account view-as sweep, note boundary test, concurrent tier/suspend audit diffs (S04-14 ×2), p04/p07/free@ user-side spot checks, final state verification (all personas restored, switches unchanged).
- 21:18–21:21 — Final health check (`/api/config` OK, /admin 200), my two tabs closed. The two pre-existing tabs were not touched, but they share the origin's auth storage, so they now reflect the end state (admin2 signed in on /admin, no user signed in on /app — the same as at my start).
