# Admin session 02 — Owner #1 · 75-min test · 2026-11-24
Status: Complete | Admin account: admin@test.com | Start: 18:23 local (epoch 1795537406) | End: 19:33 local | Minutes tested: 70

## Scope
Settings tab end to end (Settings password set/unlock/lock + ~10-min expiry, Configuration status card, every drill-in: API keys incl. blank-keeps-saved secrets, Plans & Pricing + paidPlansEnabled, Analytics, Legal/Termly, Email/SMTP, Sentry, AI incl. monthly cap + aiResearch, announcement banner) and every global switch (maintenance, signups, announcement x3 levels, marketData, checkout, aiResearch, paidPlansEnabled) verified on the user app + landing/register, then restored. Audit diffs for config saves.

## Original global state (from /api/config at 18:23)
maintenance=false · signupsEnabled=true · paidPlansEnabled=false · features {marketData:true, checkout:false, aiResearch:false} · announcement=null · analytics ga4/plausible "" · legal termly ids "" cookieBanner=false · plans free 0/0/3/30/300, pro 9.99/99.99/6/100/1000, premium 49.99/499.99/15/200/2000.

## Accounts and state touched
| Account | Original state | Change made | Restored? |
|---|---|---|---|
| config/app flags (maintenance, signupsEnabled, paidPlansEnabled, features.*) | false / true / false / {marketData:true, checkout:false, aiResearch:false} | each toggled and restored | Y (verified via /api/config) |
| config/app.announcement | null (inactive) | Info/Warning/Critical text; then text cleared, inactive, level info | Y |
| config/app.plans | as in /api/config at start | Pro coins 101, Premium coins 201, Pro price 9.98 (tests) | Y |
| config/app secrets + AI/Email/PayPal fields | all "" (smtpPort 587) | dummy values (test-dummy-*) — UI cannot clear secrets (S02-05) | Y — reset to "" by an emulator REST field write (19:12), verified |
| config/app.settingsAuth (Settings password) | not set | set, reset by email, changed twice | Y — script crashed (S02-12); field deleted via emulator REST + `settingsUnlock/{uid}` doc removed; Settings falls back to login re-auth ✓ |
| p03.speculator | Starter, 1 coin (PEPE), signed in | used for maintenance test; harmless rename-to-same-name write probe | Y (no change) |
| p05.defi | Starter, 1 coin (UNI) | used for announcement / aiResearch / plans views; dismissed an announcement (localStorage only) | Y |
| pro@test.com | Pro, 2 portfolios, 6 coins | read-only look at Plan & billing | Y (no change) |
| p07.altcoin | Premium, 2 coins (Hyperliquid, WASTED), 1 portfolio | aiResearch ON→OFF test; createSubscription probes (refused); portfolio "QA s02 maint" created during maintenance then deleted | Y (back to 1 portfolio) |
| qa-adm-sw@test.com (throwaway) | did not exist | registered 18:44, chose Starter, trashed + permanently deleted 18:51 | Y (gone: no Auth record, no user doc) |

## Coverage
| Admin function | Result | User-app effect verified | Mobile 375 / keyboard |
|---|---|---|---|
| Settings password: set (strength + mismatch validation) | Pass | n/a | 375 OK; Enter submits |
| Settings unlock prompt (wrong pw, right pw, Cancel, ~10-min expiry) | Pass; Escape ignored, not a dialog (S02-09) | n/a | keyboard partial |
| Settings password: change | **Fail** — wrong current accepted while unlocked (S02-08) | n/a | — |
| Settings password: emailed reset (single-use, owner's own address) | Pass (link logged in emulator; points at prod host) | n/a | — |
| Configuration status card | Pass with caveats — "PayPal connected"/"SMTP configured" from dummy values (S02-07); junk Sentry DSN reads "not set" (S02-06) | n/a | 375 OK |
| Maintenance mode | **Fail** — page-load only, writes still allowed (S02-01); landing/admin unaffected (by design) | Y (open tab, reload, write probe) | 375 OK; switch has no accessible name (S01-16) |
| Allow new signups OFF | Pass — Register disabled + "New signups are paused right now."; client and raw Auth signUp refused server-side | Y | — |
| Announcement Info/Warning/Critical + dismiss | Pass with issues — escaped text ✓, dismiss per text; open tabs miss it (S02-02); level escalation stays dismissed (S02-03); level buttons show no selection (S01-11 repeat) | Y | — |
| aiResearch switch (AI drill-in) | Pass for hide/show; ON exposes a fake "Live" chat (S02-04) | Y (sub-nav Overview/Coins/Ask appears after reload; gone after OFF) | — |
| AI key / models / base URL / monthly cap | Secret masked + "(changed)" in audit ✓; no validation (S02-06); key can't be removed (S02-05) | n/a | 375 OK |
| API keys (CoinGecko not touched — would break live prices; PayPal + Sentry dummy) | blank keeps saved ✓; can't clear (S02-05); DSN not validated (S02-06) | /api/config leaks nothing ✓ | 375 OK |
| Email / SMTP | Saves invalid from-address, clamps port silently (S02-06) | n/a | 375 OK |
| Plans & pricing + paidPlansEnabled | Pass — ON: Account shows "Upgrade to Pro", new signup gets forced plan chooser; OFF restores Starter-only | Y (p05 Account, qa-adm-sw onboarding) | 375 OK (3-up inputs 92 px) |
| checkout kill-switch | Pass — OFF: CTA toasts "Checkout is temporarily unavailable", chooser cards "Temporarily unavailable"; ON: PayPal cycle step opens (no payment made) | Y | — |
| marketData kill-switch | Pass for zero upstream (cached prices/search/trending still served); history answers `[]` cached 24 h (BUG-041 repeat) | Y (Search/CoinInfo) | — |
| Analytics & legal (GA4/Plausible/Termly/cookie banner) | Opened read-only; NOT saved — any value makes user pages load third-party scripts (external-site rule). Code check: ids are `encodeURIComponent`/`setAttribute`-inserted (`public/site-metadata.js`) | — | 375 OK |
| Require two-factor sign-in (Admin access) | Not toggled — documented lockout risk with no enrolled admins | — | — |
| Plan limit lowered live (Starter coins 30 → 1, then back) | Pass — p05 reads "My Assets (1/1)", server `addCoinGuarded` refuses ("This portfolio is at its 1-coin limit for your plan. [400]"); upsell shown (BUG-032 repeat) | Y | — |
| Two-tab / two-owner concurrency | **Fail** — stale tab silently reverts flags and plans (S02-10) | Y (/api/config) | — |
| Audit diff for config saves | Pass — per-field old → new; secrets "(changed)"; failed/successful unlocks logged | — | — |
| Trash → Delete now (qa-adm-sw) | Pass; open user tab still offers "Restore my account" after erase (S08-01 repeat) | Y | — |

## Findings

### S02-01 · Medium · Maintenance mode is a page-load screen only: open sessions keep working, and every read/write still succeeds while "down for maintenance"
**Steps:** 1) Log in to /app as p03.speculator@test.com. 2) In /admin → Settings turn **Maintenance mode** on ("Saved ✓", audit "flags.maintenance: false → true", `/api/config` returns `maintenance:true` at once). 3) Do not reload the p03 tab; wait 80 s and keep using it.
**Expected:** within ~60 s every user sees "We'll be right back", and the app/back end stop accepting writes (the usual reason for maintenance is a migration or incident).
**Actual:** the open p03 tab stays fully usable indefinitely (still on the Portfolio, tabs navigable at +80 s). Only a full reload shows the maintenance screen. Even ON the maintenance screen the signed-in session can still write: from that tab `updatePortfolioName(uid,'default',…)` → `{success:true}` and `getCoins` returns the data. Nothing on the server reads `flags.maintenance` except `/api/config` (functions/index.js:3433). Reproduced three times (18:25 and 18:27 toggles; 19:10 with p07: 70 s after maintenance ON, p07's open tab created a portfolio "QA s02 maint" through the normal New-portfolio dialog — success, then deleted again).
**Also:** after turning maintenance OFF, a user who reloads inside 60 s still sees the maintenance screen (browser caches `/api/config` with `Cache-Control: public, max-age=60`) — recovery is up to 60 s, as documented; noted, not a bug.
**Effect on users:** an admin who turns maintenance on to freeze data (e.g. during a migration or a bad-data incident) gets no freeze; users with an open tab keep editing.
**New** (design gap; CLAUDE.md says flags "apply within ~60s", true only for new page loads).
**Suggested fix:** in `src/CryptoIdea.jsx` (the `fetchSiteConfig` effect near line 210) re-poll `/api/config` every 60 s and on `visibilitychange`; if a write freeze is wanted, add a `maintenance` check to `addCoinGuarded`/`addTransactionGuarded` and a `!get(/config/app).flags.maintenance` predicate in `firestore.rules` owner writes (or document maintenance as "UI notice only").


### S02-02 · Low · Announcements (and every other public flag) never reach a session that is already open — only a full reload shows them
**Steps:** 1) p05.defi signed in to /app at 18:30. 2) Admin → Settings → Announcement banner: text + Info + Show the banner → Save ("Saved ✓", `/api/config` returns it immediately). 3) Leave the p05 tab alone for 70 s.
**Expected:** "Applies within ~1 min" (the drill-in copy).
**Actual:** at +70 s the open tab has no banner; it appears only after a reload. Same root cause as S02-01: `src/CryptoIdea.jsx` calls `fetchSiteConfig()` once on mount. Reproduced for announcement (18:30), maintenance (18:25, 18:27) and the aiResearch kill-switch (19:07: p07's open Research tab kept Overview/Coins/Ask 60 s after the switch went OFF; gone only after reload) — the AI drill-in promises it hides them "for every user".
**Effect on users:** a "Critical" notice (e.g. "don't trade, data is wrong") is not seen by the people already in the app — the ones who most need it.
**New.** **Suggested fix:** poll `/api/config` (60 s, matching its CDN max-age) + on `visibilitychange` in `src/CryptoIdea.jsx`; or change the copy to "shown on the user's next page load".

### S02-03 · Low · Escalating an announcement's level (Info → Warning → Critical) stays hidden for everyone who dismissed it; Critical is announced as a polite `role="status"`
**Steps:** 1) Active Info announcement; p05 dismisses it (×). 2) Admin changes only the Level to Warning, then Critical, Save ("Saved ✓"; `/api/config` → `level:"critical"`). 3) Wait 60 s, reload p05.
**Expected:** a level escalation is a new notice and re-appears (at minimum Critical should).
**Actual:** no banner — the dismiss key is a hash of the text only (`src/utils/announcement.js` `dismissKey(text)`). Reproduced Info→Warning and Warning→Critical. The banner element is `role="status"` for every level (`src/components/AnnouncementBanner.jsx:21`), so screen readers never interrupt even for Critical.
**Effect on users:** an admin who escalates an existing notice to Critical silently reaches nobody who saw the Info version. Admin copy only says "reappears only if you change the wording" — the level is not mentioned.
**New** (related to S01-20, which is about the key being per-browser). **Suggested fix:** `dismissKey(level + "|" + text)` and `role="alert"` for `lvl-critical`.

### S02-04 · Medium · Turning the "AI research chat" switch on exposes an Ask chat labelled "Live · Real answers about anything you hold" that returns one fixed sentence to every question
**Steps:** 1) Admin → Settings → AI → "AI research chat" ON (Settings-password unlock; toast "aiResearch enabled"). 2) After 60 s reload /app as p05.defi (100% Uniswap) → Research → Ask. 3) Tap "How concentrated am I?", then type "What is my exact percentage in Uniswap?".
**Expected:** with `AI_PROXY_LIVE=false` either the Ask chat stays hidden, or it gives the deterministic data-driven answers CLAUDE.md describes, without a "Live / Real answers" claim.
**Actual:** both questions get the identical canned text "Your results are driven mostly by your largest holding. Ask about a specific coin or your concentration for a more detailed breakdown." — even when the user did exactly that. Header: "● Live  Real answers about anything you hold." (`src/features/research/components/AskView.jsx:20`; `askAI` throws while `AI_PROXY_LIVE` is false so `useAsk.js` always falls back to `DEFAULT_A`). Reproduced with 2 different questions.
**Effect on users:** the admin switch is described as "live TODAY", and flipping it shows every user a chat that pretends to be live AI and never answers — a trust/honesty problem (same family as BUG-058/BUG-059, different screen).
**New.** **Suggested fix:** gate the Ask sub-view on `aiEnabled && AI_PROXY_LIVE` (`src/features/research/...` where the sub-nav is built), or drop the "Live / Real answers" line and route Ask to the deterministic `pulseFacts` answers; also say in the admin AI drill-in that turning it on before go-live shows a placeholder chat.

### S02-05 · Medium · A saved secret (AI key, PayPal secret, SMTP password, CoinGecko key, Sentry DSN) can never be removed from the panel — only overwritten
**Steps:** 1) Settings → AI → paste `test-dummy-key` → Save AI settings ("Saved ✓"; audit "ai.providerKey: (changed)"; Configuration card now "AI · Key saved · starts at go-live"). 2) Re-open AI, clear every field, Save. 3) Repeat with only the key field cleared.
**Expected:** a way to delete a secret (e.g. a "Remove" link next to "saved ✓"), so a leaked/compromised key or a Sentry DSN can be taken out of service.
**Actual:** the key field shows "•••••••• (saved — type to replace)"; any blank submit keeps it (`keep()` in `functions/index.js:2606` — "blank keeps the saved value" is applied with no clear path). The non-secret fields (model id, base URL) clear correctly. The only way out is the Firestore console. Reproduced twice (18:37 and 18:39); code shows the same `keep()` for `coingecko`, `paypal.secret`, `email.smtpPass`, `ai.providerKey`, `sentry.dsn`.
**Effect on users:** none directly; operationally, an owner who must revoke a leaked provider key, or turn off server Sentry by removing its DSN, cannot do it from the admin app (the incident runbook in API-SECURITY.md assumes rotation, never removal).
**New.** **Suggested fix:** add an explicit `clear: ["ai.providerKey", ...]` list to the `saveConfig` payload (allow-listed against `SECRET_PATHS`, audited as "(cleared)") and a "Remove saved key" button per secret in `src/components/admin-dashboard.jsx` settings drill-ins.

### S02-06 · Low · AI, API-key and Email drill-ins save invalid values with "Saved ✓" (javascript: base URL, negative cap silently ignored, non-DSN Sentry value, non-email sender, port clamped)
**Steps:** Settings → AI → API base URL `javascript:alert(1)`, Monthly AI budget cap `-500` → Save AI settings.
**Expected:** inline validation ("must be an https:// URL", "cap must be ≥ 0").
**Actual:** "Saved ✓". The base URL is stored verbatim (audit: "ai.baseUrl: (empty) → javascript:alert(1)"; the server would later `fetch()` it, `functions/index.js:1795`). The cap is quietly kept at 5000 by `clampMonthlyCapCents` (functions/index.js:2581) and the field just snaps back to 5000 — the admin is never told their value was rejected. Reproduced on two saves (cap −500; base URL also accepted on first save, cleared on the second).
**Effect on users:** none until go-live; then a typo in the base URL breaks every AI answer, and a rejected cap looks accepted.
**Second instance (API keys drill-in, 18:41):** Sentry DSN `test-dummy-key` (not a DSN) → "Saved ✓" and stored verbatim (`config/app.sentry.dsn`), but `dsnOf()` (functions/observability.js:40) treats it as unset, so the field re-renders with the empty "https://…@…ingest.sentry.io/…" placeholder (no "saved" hint) and the Overview keeps "Error reporting: not configured". The admin sees nothing saved while a junk value is stored — and per S02-05 it can't be blanked out ("Leave blank for none" in the hint is untrue: blank keeps it).

**Third instance (Email drill-in, 18:52):** From email `not-an-email`, SMTP port `99999` → "Saved ✓"; the from address is stored as typed and the port silently becomes `65535` (no message). The SMTP password is again un-removable (S02-05).

**Related to S01-12** (same "no validation message" pattern on Plans & pricing) — **New** for the AI drill-in. **Suggested fix:** validate `aiBaseUrl` as `https://` in `saveConfig` (reject with `invalid-argument`) and show the server's message; return the effective cap so the UI can say "cap must be 0 or more — kept $50".

### S02-07 · Low · Configuration card says "Payments · PayPal connected" (green) for any non-empty client id + secret — nothing was connected or checked
**Steps:** Settings → API keys → PayPal Client ID `test-dummy-client`, Secret `test-dummy-key` → Save keys → back to Settings home.
**Expected:** "Saved (not verified)" or a real credential check before saying "connected".
**Actual:** Configuration → Payments turns green "PayPal connected"; the API keys row says "2 set". The same card treats an invalid Sentry DSN as "not set" (S02-06), so the card is inconsistent about what it validates. Seen twice (18:41 and on every return to Settings home).
**Effect on users:** none now; at go-live an owner could believe payments work when the credentials are wrong (checkout then fails for users).
**Related to BUG-010** (config shows only set/unset flags) — the new part is the "connected" wording. **Suggested fix:** say "PayPal keys saved" unless an OAuth token request to PayPal has succeeded (`functions/index.js` getAdminConfig could expose a `lastVerifiedAt`).

### Repeat of BUG-041 · High (new trigger) · The "Live market data" kill-switch makes `/api/history` answer `{"prices":[]}` with `Cache-Control: public, max-age=86400`
**Steps:** Settings → Live market data OFF (toast "marketData DISABLED"). `curl /api/history?id=chainlink&days=30` and `?id=some-unknown-coin-qa&days=7`.
**Actual:** both `200 {"prices":[]}` with `cache-control: public, max-age=86400` (prices keep `max-age=120`). Any browser/CDN that loads a chart while the switch is off is pinned to "no history" — i.e. the built-in estimates BUG-041 describes — for 24 h after the admin turns market data back on. Reproduced on 2 ids.
**Effect on users:** an incident switch that should be harmless corrupts AUTO prices / charts for a day after recovery.
**Suggested fix:** when `marketData` is off (or the answer is empty) send `no-store`/`max-age=60` in the `/api/history` handler in `functions/index.js`.

### S02-08 · Medium · "Change password" accepts a WRONG "Current Settings password" whenever Settings happens to be unlocked
**Steps:** 1) Settings is unlocked (any unlock / set / reset in the last 10 min). 2) Settings → Settings password → Current = `totally-wrong` (or the previous, already-replaced password), New + Confirm = a valid new password → Change password.
**Expected:** "Enter your current Settings password to change it." — the screen asks for it, so it should check it.
**Actual:** "Settings password changed ✓". Reproduced twice (18:49 with the superseded password, 18:50 with `totally-wrong`). `setSettingsPassword` (functions/index.js ~2713-2733) skips the current-password check entirely when a session-bound unlock is live; the field is silently ignored.
**Effect on users:** none on user accounts. Security: anyone at an unlocked owner session (walk-up, or a hijacked session within the 10-min window) can replace the second password without knowing it and lock the real owner out of Settings (recovery = emailed reset or the service-account script). The field gives the owner false assurance.
**New.** **Suggested fix:** always verify `data.current` when a password is already set (keep the shared 30/day budget), or hide the "Current" field while unlocked and say "You're unlocked — no current password needed".

### S02-09 · Low · Settings unlock prompts (Settings password AND the login "Confirm your password" step-up) are not dialogs and ignore Escape
**Steps:** with Settings locked, flip any Settings switch (e.g. Live market data) → "Enter your Settings password" prompt; press Escape.
**Expected:** Escape cancels (like the ✕ / Cancel), and the prompt is announced as a modal dialog.
**Actual:** Escape does nothing (focus is in the password field); no element has `role="dialog"`/`aria-modal`. Cancel and ✕ work (Cancel reverts the toggle + "Cancelled — not saved"). Reproduced at 18:45 and 18:46; the same on the login step-up prompt shown once no Settings password exists (19:24: Escape with focus in "Owner password" leaves the prompt open; Cancel → "Cancelled — not saved", toggle reverted, server unchanged ✓).
**Effect:** admin-only, keyboard/screen-reader users.
**Same family as S01-05 / S08-03 / S01-16** (other admin modals) — new instance. **Suggested fix:** render the unlock prompt through the shared `Modal` pattern (role="dialog", aria-modal, Esc → cancel) in `src/components/admin-dashboard.jsx`.

### S02-10 · High · Two Settings tabs (or two owners) silently undo each other's switches: every instant toggle re-posts ALL flags from that tab's stale copy
**Steps:** 1) Open /admin → Settings in tab A. 2) Open /admin → Settings in tab B; turn **Allow new signups OFF** ("Saved ✓", audit `flags.signupsEnabled: true → false`). 3) In tab A (still showing signups ON) turn **Maintenance mode ON**. 4) In tab B (still showing maintenance OFF) turn **Live market data OFF**.
**Expected:** each click changes only the switch that was clicked.
**Actual:** step 3 also turned signups back ON — audit 18:52:36 "flags.maintenance: false → true, flags.signupsEnabled: false → true"; `/api/config` → `maintenance:true, signupsEnabled:true`. Step 4 then turned maintenance back OFF and signups OFF again — audit 18:52:46 "flags.maintenance: true → false, flags.signupsEnabled: true → false, flags.features.marketData: true → false". Neither tab shows the other's change, and the toast says only "Saved ✓" / "marketData DISABLED". Reproduced twice (steps 3 and 4). The same happens with one tab open across a long session if another owner (admin2) changes a switch.
**Effect on users:** an incident switch can be silently reverted: e.g. owner 1 pauses signups or turns on maintenance during an incident, owner 2 (or a forgotten tab) flips any other switch and the pause is lifted for every user, with no warning. The audit shows it, but nobody is told.
**Same lost-update on Plans & pricing (18:55):** tab B changed Pro coins 100 → 101 → "Saved ✓"; tab A (opened earlier, still showing 100) changed only Premium coins 200 → 201 → "Saved ✓" → `/api/config` Pro coins back to **100**. Plans are re-posted whole; a plan limit raised by one owner is silently reverted by the other (users' real coin cap changes under them). Restored to 100/200.

**Worst case, caught by accident (18:54 → 19:00):** "Save plans" also re-posts the tab's whole `flags` object. Tab A's local state still had Maintenance ON from step 3; its later "Save plans" (premium coins only) was audited as "flags.maintenance: false → true, plans.pro.coins: 101 → 100, plans.premium.coins: 200 → 201" — **the whole app went into maintenance mode for ~6 minutes** from a plans edit, with only "Saved ✓" on screen. Found when p05's fresh load showed "We'll be right back" at 18:59; maintenance turned off again at 19:00:05 (audited). Anyone loading /app on this emulator 18:54-19:00 saw the maintenance screen.

**Third surface — announcement (19:26):** tab B turned signups OFF (19:25:59); tab A, still showing signups ON, pressed "Save announcement" without changing anything → "Saved ✓", audit 19:26:10 "flags.signupsEnabled: false → true". So every Settings save button (switches, Plans, Announcement) re-posts the tab's stale `flags`.

**New.** **Suggested fix:** post only the changed key from the toggle handlers in `src/hooks/useAdminDashboard.js` (and make `saveConfig` merge `flags` per-key like it already does for `features` via `mergeFeatures`, `functions/index.js` ~2611-2626), or send the loaded `updatedAt` and refuse a save whose base is stale ("Settings changed in another tab — reload").

### S02-11 · Low (nit) · A long unbroken word in an announcement makes the whole user app scroll sideways on phones
**Steps:** announcement text with a 260-character unbroken token (max length 300) → Save, active. Open /app at 375 px width (p05).
**Expected:** the banner wraps/breaks the word.
**Actual:** `.ann-banner` scrollWidth 1774 px vs 358 px viewport — the page scrolls horizontally (dismiss × stays reachable). A realistic long URL (`https://localhost/status/incidents/2026-11-24-…`) wraps fine at its slashes, so this needs a pathological token. Reproduced twice (initial load + forced reload).
**Effect on users:** layout only; admin-typed text.
**New** (cf. BUG-111 / S07-09, same `overflow-wrap` gap elsewhere). **Suggested fix:** `overflow-wrap:anywhere` on `.ann-banner` text in `src/styles/app.css`.

### S02-12 · Medium · The Settings-password lockout escape hatch `clear-settings-password.js --clear` crashes — it can show the password but never clear it
**Steps:** with a Settings password set: `cd functions && FIRESTORE_EMULATOR_HOST=localhost:8080 GCLOUD_PROJECT=demo-crypto-idea node scripts/clear-settings-password.js` → "Settings password: SET"; then the same with `--clear`.
**Expected:** "Settings password cleared."
**Actual:** `Failed: Cannot read properties of undefined (reading 'FieldValue')` and the password stays set (re-check prints SET). Reproduced twice (19:14, 19:15). Cause: `functions/scripts/clear-settings-password.js:64` uses `admin.firestore.FieldValue.delete()`, but firebase-admin ^14 (functions/package.json) no longer exposes the namespaced `admin.firestore` (`typeof require('firebase-admin').firestore === 'undefined'` in plain node — not an emulator quirk). `seed-emulator.js`/`set-admin.js` were already migrated to the modular imports; this script was missed.
**Effect on users:** none directly; operationally the ONLY documented recovery when every owner forgets the Settings password and the emailed reset can't be delivered (SMTP is unset at launch → the reset mail is "NOT sent") does not work, so API keys/plans/switches become unreachable from the panel. Combined with S02-08 a walk-up attacker at an unlocked session can create exactly that lockout.
**New.** **Suggested fix:** `const { getFirestore, FieldValue } = require("firebase-admin/firestore")` and `FieldValue.delete()` in `functions/scripts/clear-settings-password.js`; add a unit/integration test that runs the script against the emulator.

### S02-13 · Low (nit) · Before a Settings password exists, the screen tells the owner to use an "Email me a reset link" button "above" that isn't there
**Steps:** Settings → Settings password while it is "Not set".
**Actual:** only the two new-password fields + "Set password"; the footer still says "Forgot it? Use “Email me a reset link” above…". Seen at 18:24 and again at 19:16 after the password was cleared.
**Expected:** hide the "Forgot it?" paragraph until a password is set.
**Effect:** admin-only copy confusion. **New.** **Suggested fix:** render that paragraph only when `settingsAuth.set` in the Settings-password drill-in (`src/components/admin-dashboard.jsx`).

### S02-14 · Low · Plans & pricing says limits/prices drive "what users see", but the landing's "Usage" section is hard-coded
**Steps:** Settings → Plans & pricing → Starter Coins 30 → 1 → Save (19:00). In the app p05 immediately reads "My Assets (1/1)" and the server refuses a 2nd coin. The public landing (`index.html` "Usage") still promises "3 portfolios · 30 coins per portfolio · 300 transactions per coin" — it is static HTML and `public/landing.js` no longer reads `/api/config` plans.
**Expected:** either the landing follows `config/app.plans`, or the admin card warns that the landing copy must be edited separately.
**Effect on users:** after any limit change new visitors are promised limits the app doesn't give. Seen by code + the 19:00 live change (restored to 30 at 19:01).
**New** (by-design static landing per CLAUDE.md, but the admin copy "Prices drive the revenue estimate + what users see" overstates it). **Suggested fix:** add "Landing page copy is static — update index.html 'Usage' too" under the Plans card in `src/components/admin-dashboard.jsx`, or render the Usage numbers from `/api/config`.

## Data-leak and backend checks
| Check | Result |
|---|---|
| `/api/config` (public) after saving dummy PayPal/AI/Sentry secrets | Only non-secret keys (609 bytes, no key/secret/smtp/dsn/dummy strings) ✓ |
| Non-admin (qa-adm-sw) Firestore reads of `config/app`, `settingsUnlock/{uid}`, `aiBudget`, `health/jobs`, `statsDaily`, `adminNotes`, `audit`, `webhookEvents` | all `permission-denied` ✓ |
| Non-admin writes to `settingsUnlock/{uid}` (self-unlock) and `config/app.flags.maintenance` | both `permission-denied` ✓ |
| Non-admin callables `getAdminConfig`, `saveConfig`, `unlockSettings`, `setSettingsPassword`, `requestSettingsPwReset`, `listAudit` | all `permission-denied "Admins only. [403]"` ✓ |
| Signups OFF: raw Auth-emulator `accounts:signUp` (bypasses the client) | refused by `beforeCreateUser` (403 "New signups are currently paused") ✓; client `registerUser` shows the same message (BUG-014 stays fixed) ✓ |
| Maintenance ON: signed-in user writes | still succeed (S02-01) ✗ |
| Settings password: wrong password | "Incorrect Settings password. [403]", audited "Failed Settings-password unlock" ✓; server rate limit 30/day per uid (code) |
| Settings unlock expiry | prompt re-appears ~10 min after unlock (18:35 and 18:45) ✓; Cancel reverts the optimistic toggle + "Cancelled — not saved" ✓ |
| Settings password cleared at the end | `clear-settings-password.js --clear` crashed (S02-12); cleared with an emulator REST field delete instead; Settings then correctly fell back to the login re-auth prompt ("Confirm your password" → test1234 → Settings opens, all cards "Not set") ✓ |
| Audit of Settings-password events | set / changed ×2 / reset requested / reset completed / unlocked / failed unlock all present ✓; the second (rejected) use of a reset link is not audited |
| Settings reset link | emailed (logged in emulator) to the owner's own address; single-use ("already been used. [403]") ✓; link points at the production host `https://crypto-idea.web.app/admin?reset=…` even in the emulator (dev-only note) |
| `createSubscription` (p07) with paidPlans OFF + checkout OFF, then paidPlans OFF + checkout ON | both refused `failed-precondition "New subscriptions are paused right now."` — paidPlans takes precedence, no PayPal call ✓ |
| Plan limit change reaches the server | Starter coins → 1: `addCoinGuarded` refuses p05's 2nd coin ✓ |
| Audit tab filters | action filter "Failed Settings-password unlock" → 1 entry; search "(changed)" → 3, "providerKey" → 1, "maintenance" → 10 ✓ |
| Console (admin + user tabs) | only browser-extension "message channel closed" noise; no app errors. Note: the localhost admin build posts to the real Sentry ingest (`ingest.de.sentry.io`, one 429) — client Sentry is on by design (CLAUDE.md) |
| Audit diff for secrets | `ai.providerKey: (changed)` — value never shown ✓; non-secrets show old → new ✓ |
| Announcement text with `<img onerror>` | rendered as text, no element, no console output ✓ |

## Known bugs re-checked
- **BUG-014** (blocked signup shows generic error) — still fixed: client shows "New signups are currently paused. Please check back soon."
- **BUG-020** ("Live sync was interrupted" during account setup) — **repeat**: shown on qa-adm-sw's first screen right after Create Account (18:44).
- **BUG-021** (Search shows mock prices) — **repeat**, independent of the marketData switch: Chainlink in Search/CoinInfo reads $18.20 / +1.50% / #13 / $10.70B both with marketData OFF and ON, while `/api/prices` serves $8.79 / −4.93% / #15.
- **BUG-038** (Daily Brief ▲ when down) — **repeat**: p05 Research "▲ Portfolio is down $148 (−7.3%)".
- **BUG-041** (empty history cached 24 h) — **repeat with a new admin trigger** (marketData kill-switch), see Findings.
- **BUG-058** (Plan & billing "AI research · Live" while AI is off) — **repeat**: p05 and qa-adm-sw with aiResearch OFF.
- **BUG-032** (upsell to a plan that can't be bought) — **repeat**: with paid plans OFF and the Starter coin limit lowered to 1 by the admin, p05 sees "You've reached your account limit. Upgrade to Pro" → tap → "New subscriptions are paused right now."
- **BUG-010** (config shows only set/unset flags) — related to S02-07.
- **S01-07** (admin trash reads "You deleted this account") — **repeat** on qa-adm-sw.
- **S08-01** (erased account's open tab can "Restore") — **repeat**: after Delete now, qa-adm-sw's tab still said "30 days left", Restore landed in an empty normal-looking app (no Auth record / user doc was recreated).
- **S01-13** (hand-upgraded user shown PayPal billing) — **repeat**: pro@test.com (seed Pro, no PayPal sub) sees "Cancel Pro · Switch to Starter" + "Update payment method ↗" (paypal.com) with paid plans OFF.
- **S01-11** (announcement level buttons don't show selection) — **repeat**.
- **S01-16** (switches have no accessible name) — **repeat**: all Settings switches are `input[role=switch]` whose label has no text (name read as "on").
- **S01-12** (plans inputs save without validation) — same pattern found in AI / API keys / Email drill-ins (S02-06).
- **S06-12** (clicking the active tab doesn't return to the list) — same on Settings: clicking "Settings" while in a drill-in stays in the drill-in; browser Back from a Settings drill-in (19:27) leaves the admin app entirely (lands on the previous page, here /app); a reload returns to Overview and drops the drill-in. Keyboard: Enter on a drill-in row opens it but focus drops to `<body>`; Escape doesn't go back.
- **S09-11** (step-up "Checking…" stuck) — not re-tested (manager grant out of scope).

## What worked well
- Signups-off is enforced server-side (blocking function refuses even a raw Auth REST signUp) and the client message is specific (BUG-014 stays fixed).
- paidPlansEnabled correctly takes precedence over checkout server-side; checkout OFF shows clear "Temporarily unavailable"/"Checkout is temporarily unavailable" copy; the forced onboarding plan chooser appears for a new user only when paid plans are on.
- Plan-limit edits reach the server immediately (`addCoinGuarded` re-reads them).
- Secrets never leave the server: `/api/config` and every admin read show set-flags only; the audit shows "(changed)" for secrets and an exact old → new diff for everything else, including "no changes" saves.
- Settings password: strength + mismatch validation, wrong-password audit, 10-min expiry that re-prompts and keeps the pending edit (a plans edit typed before expiry was saved after unlocking), Cancel reverts the optimistic toggle, emailed reset is single-use and bound to the owner's own address, bogus tokens refused.
- All non-admin Firestore/callable probes against the Settings surface were denied.
- Announcement text is rendered as plain text (an `<img onerror>` payload stayed inert); dismiss works per message.
- Every Settings drill-in and the maintenance screen fit a 375-px viewport with no horizontal scroll.

## Timeline
- 18:23 start; health check OK (/api/config JSON, /admin 200). Original config recorded.
- 18:24 Settings password set (validation: <12 chars, mismatch OK). 18:25-18:29 maintenance on/off x3 (S02-01), signups off/on + server refusal.
- 18:30-18:34 announcement Info/Warning/Critical, dismiss, restore (S02-02, S02-03).
- 18:35-18:40 AI drill-in: unlock expiry prompt, aiResearch on/off (S02-04), dummy key / bad base URL / negative cap (S02-05, S02-06).
- 18:41-18:48 API keys (dummy PayPal + Sentry), paidPlans ON + checkout ON + marketData OFF, register qa-adm-sw (forced plan chooser), restore all three (S02-07, BUG-041 repeat).
- 18:52-19:00 two-tab concurrency (S02-10) — my stale-tab plans save left maintenance ON 18:54-19:00 until noticed and reverted.
- 19:00-19:12 plan limit lowered live (Starter coins 1), 375-px announcement overflow (S02-11), aiResearch on p07, paidPlans/checkout precedence, maintenance write repro #3.
- 19:12-19:25 restored secrets (emulator REST) + Settings password (script crashed, S02-12), verified login step-up fallback; bogus reset token refused; 375-px maintenance screen; step-up expiry + Escape (S02-09), signups off/on.
- 18:48-18:51 Settings-password emailed reset + single-use check; non-admin data-leak probes.
- 19:26-19:33 stale-tab announcement save (S02-10 third surface), console check, browser-Back from drill-in, admin tabs at 375 px; final /api/config identical to the 18:23 baseline; both tabs closed.

## State left at the end
All global switches, plans, announcement, secrets, AI/Email fields and the Settings password match the 18:23 baseline (verified on `/api/config` and the raw `config/app` doc). Not restored / side effects: (a) qa-adm-sw@test.com was created and permanently deleted (Auth + user doc gone); (b) audit entries + today's per-uid `settingsUnlock` rate-limit counter for admin@test.com (a few attempts of the 30/day budget); (c) p05's browser keeps an announcement-dismiss key in localStorage; (d) S02-10 side effect — maintenance was ON for every user 18:54-19:00 before I caught it.
