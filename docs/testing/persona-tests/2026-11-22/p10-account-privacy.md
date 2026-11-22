# Persona 10 — Account & privacy user · 1-hour test · 2026-11-22
Status: Complete | Account: p10.privacy@test.com | Start 19:21 / End 20:16 (local, UTC+2) | Minutes tested: 55

**Summary:** 33 findings (4 High, 14 Medium, 15 Low; 26 new, 7 repeat/extend an open BUG — P10-01, 05, 10, 11, 19, 24, 32) + 16 known bugs re-checked (14 still present, 2 not reached, none appear fixed). The account basics work — password change, forgot password, delete → restore (4 cycles, no data loss), export — but the *privacy promises around them leak*: credentials stay in the login form after Sign out everywhere and delete (P10-04, P10-10/BUG-034), passwords stay filled in Profile/Security after errors (P10-33), a past user's email/name stay in `localStorage` (P10-25), session replay ignores the analytics switch (P10-15), the Pulse share image prints dollar holdings (P10-12), and the JSON export omits Learn progress (P10-07). Keyboard-only use breaks at every popup (P10-05, root cause of BUG-027) and in Journal/Learn (P10-06, BUG-029). Mock prices still leak into money (P10-24 fake $84,000 sale, P10-19, P10-32).

## Persona
A privacy-conscious user who cares more about control over their data than about charts: they check the Account screen first, want to rename themselves correctly, switch light/dark, sign out of every device, export everything they stored, and be sure "delete my account" really works (and can be undone within the window). They navigate mostly by keyboard and notice upsells that lead nowhere.

## Data created
The account already existed (created 2026-11-21 per the export: display name "Pat Privacy", one empty "My Portfolio", theme Dark). Login worked with the given password — no registration needed. The shared Chrome profile was still signed in as `p09.edge@test.com` at the start; I logged that session out first and never acted on it.

| What | Detail |
|---|---|
| Display name | "Zoë O'Brien-Smith Jr." typed → saved as "Zo OBrienSmith Jr" (BUG-031); 47-char name refused; finally set back to **"Pat Privacy"** |
| Password | changed Persona#2026 → Persona#2027 → back to **Persona#2026** (wrong-current and weak-new attempts rejected) |
| Email change | confirmation link requested for `p10.privacy.new@test.com` — **not confirmed** (account email unchanged) |
| Coin + thesis | **Bitcoin** (from Trending) — thesis "Scarce, neutral money; I keep my own records — café note éàü." / change-my-mind "A protocol change that breaks the supply cap." (export: `priceAtAdd: 0`) |
| Transactions | BTC **Buy 0.05 @ $60,000** ($3,000), date field auto-filled 2026-11-22 17:28 at 19:28 local (BUG-024); BTC Sell 0.01 typed @ 61,000 but saved @ $84,000.01 (P10-24) — **deleted** afterwards via the 2-step tx delete |
| Coin + thesis | **Ethereum** (via Search, keyboard only) — thesis "Settlement layer with real fee revenue; I track it privately." / "Fees collapse for two quarters straight." (export: `priceAtAdd: 1900` = mock, BUG-021); thesis later **deleted** (coin kept, now under "Needs a thesis") |
| Portfolios | added "Cold storage" (later **deleted** via keyboard two-step) and "Hot wallet" → renamed **"Café — épargne"**; 4th add refused (3/3); later added **"Pension — 2040"** via the Portfolio-tab "+" dialog (keyboard, Enter submits) → 3/3 again, "+" pill hidden; then **deleted** "Pension — 2040" while it was active (fell back to My Portfolio cleanly) |
| Thesis edit | BTC thesis: X-close saved an appended draft (R24 auto-save), then restored to the original text via Save changes |
| Coin + tx | **Solana** added via Search (Skip for now — no thesis; Search showed mock $125), **Buy 1 @ $70.20** via AUTO |
| Learn | Module 1 lessons 1–2 passed (100 XP, 1-day streak); lesson 2 answered wrong once first (BUG-030 check) |
| Privacy toggles | Analytics ON → reload (persisted) → OFF again; Product updates left OFF |
| Theme | Dark → Light → System → Dark → Light → Dark → Light → Dark (left on **Dark**) |
| Account deletion | soft-deleted **4×** (wrong password attempt first; once with a 2nd tab open; once in light mode), restored every time; data intact |
| Verification email | "Resend" clicked 2× (two VERIFY_EMAIL codes in the emulator); password-reset email requested for my address + an unknown address |

## Coverage
| Area | What was tried | Result |
|---|---|---|
| Profile – name | accents/apostrophe/hyphen, CJK/umlaut, CJK-only, 47 chars, back to "Pat Privacy" | **Fail** — P10-01 (BUG-031) |
| Profile – change email | wrong password, another account's email, fresh email (link not confirmed) | Pass (enumeration note P10-18) |
| Security – password | wrong current, weak new, real change, change back; fields cleared after success | Pass |
| Sign out everywhere | 3× from Security (incl. a double-click) | **Fail** — P10-04 (credentials left in form, error-style toast, no confirm) |
| Logout | 4×; form cleared, own profile cache removed; logout propagates to a 2nd tab | Pass (stray cache of another user: P10-25) |
| Session end without logout | simulated expiry by clearing the Firebase auth store | **Fail** — P10-25 |
| Forgot password | own email, unknown email (same message — good), invalid format (native validation) | Pass; reset link not opened (emulator action page is off :3000) |
| Export | CSV + JSON captured in-page (no files written to disk) ×4 | Partial — P10-07, P10-09, P10-21, P10-26 |
| Privacy toggles | analytics on/off + reload, marketing on/off, email digest on/off + reload | Persist OK; P10-15, P10-23, P10-26 |
| Delete → restore | 4 soft-deletes (wrong pw, lower-case "delete", 2nd tab open, light mode), restore by mouse and keyboard | Restore works, data intact; **Fail** BUG-034 (P10-10), BUG-035 (P10-11), P10-16 |
| Login form after delete | typed-login session vs restored session | BUG-034 still present (typed-login case) |
| Plan / upsell | Plan & billing, 4th portfolio, landing Usage, Portfolio limit banner (code + p09's screen) | **Fail** — BUG-032, P10-03, P10-20 |
| Announcement banner | `/api/config` → `announcement: null` | Not reached (needs admin; /admin off-limits) |
| Maintenance | `/api/config` → `maintenance: false` | Not reached |
| Theme | Light / Dark / System on all 5 tabs, Account + every drill-in, Journal detail, restore screen, login | Pass except restore screen (BUG-035) and BUG-033 |
| Keyboard-only | Account home, drill-ins, theme radios, nav, login, Search → thesis → save, CoinInfo/Detail/confirm dialogs, Journal, Learn quiz, Portfolios delete | **Fail** — P10-02, P10-05, P10-06, P10-14, P10-17, P10-22, BUG-029 |
| Mobile 375 px | Account, Privacy (delete open), Security, Detail — via same-origin iframe (window resize is blocked: maximized Chrome) | Layout OK, no horizontal scroll; unnamed header buttons (P10-06) |
| Data honesty spill-overs | value flash on load, Sell/Buy prefill, Journal "$1,900", CoinInfo for a non-held coin | **Fail** — P10-19, P10-24, P10-32 (BUG-021/023) |
| Share | Pulse Share (navigator.share stubbed in-page) | **Fail** — P10-12 |
| Console | `read_console_messages` errors after major flows | Only Grammarly-extension noise; no app errors |

## Findings

### P10-01 · Medium · Name field also wipes non-Latin names entirely (BUG-031 still present, wider than logged)
- **Steps:** Account → Profile → Display name: type `Zoë O'Brien-Smith Jr.` → field shows `Zo OBrienSmith Jr` → Save name → "Name updated ✓". Then type `李雷 Müller` → field shows ` Mller`; type `李雷` alone → field becomes empty and Save is disabled, while the old green "Name updated ✓" stays on screen.
- **Expected:** Real names (accents, apostrophes, hyphens, dots, any script) are kept as typed.
- **Actual:** Every non-ASCII letter is removed on each keystroke; a CJK/Cyrillic/Hebrew/Arabic-script user cannot set a name at all, and the stale success message suggests something was saved. Reproduced 2× (and Zoë name also saved mangled to the account header "Zo OBrienSmith Jr").
- **Also:** the input has no `maxLength`; a 47-character real name is accepted while typing and only rejected after Save with "Name: letters only, 2-30 characters". The Register form strips the same way (`Zoë O'Brien` → `Zo OBrien`).
- **Status:** Repeat of **BUG-031** (still open) — adds the non-Latin case, the Register form, the 30-char limit, and the stale "Name updated ✓" message.
- **Suggested fix:** as BUG-031 proposes, `src/components/Account.jsx:218` (and `src/components/Login.jsx` register field) → allow `/[^\p{L}\p{M}\s'.-]/gu`; clear `profMsg` on input change (`setProfMsg("")` in the onChange) so a stale "Name updated ✓" can't sit next to an unsaved value.

### P10-02 · Medium · "Email digest" switch has no accessible name and no visible keyboard focus
- **Steps:** Account home → press Tab until focus reaches the Email digest switch (between "Security" and "Light"). Inspect it with a screen reader / the accessibility tree.
- **Expected:** A labelled switch ("Email digest, on") with a visible focus ring like the other rows.
- **Actual:** The accessibility tree exposes it as `switch "on"` with no name (the visible "Email digest" text is in a sibling `CtrlRow`, not in the `<label>`). The real `<input>` is `opacity:0; width:0; height:0` and there is no `:focus-visible` rule on `.slider`, so a keyboard user sees nothing move when focus lands on it (confirmed: `:focus-visible` true, slider outline `none`, box-shadow `none`; a screenshot at 20:07 with focus on it shows no indicator at all). Reproduced 2×.
- **Status:** New.
- **Suggested fix:** `src/components/Account.jsx` `Switch` — accept a `label` prop and pass `aria-label="Email digest"` (or wrap the row text in the label); `src/styles/app.css` near line 790 add `.ci-app .switch input:focus-visible + .slider { outline:2px solid var(--accent); outline-offset:2px; }`.


### P10-03 · Medium · Plan & billing says "AI research: Live — included in every plan" while AI is off
- **Steps:** Account → Plan & billing (Starter account). `/api/config` at the same moment returns `features.aiResearch:false`.
- **Expected:** No AI claim while there is no live AI (the landing was deliberately scrubbed of AI claims; Research shows only the deterministic Overview). Either hide the row or say what is actually included.
- **Actual:** A row "AI research · **Live** · Research summaries & analysis — included in every plan". Reproduced 2× (before and after a re-login). This is the only remaining in-app AI claim I found and it contradicts the Research tab (no Ask, no Coins view).
- **Status:** New.
- **Suggested fix:** `src/components/Account.jsx:262-264` — render the row only when `site.features.aiResearch === true && AI_PROXY_LIVE` (same gate as `aiChrome` in the Research tab), or reword to "Research overview — included" without "AI"/"Live".

### P10-04 · High · "Sign out everywhere" leaves the email + password in the login form (one click signs back in)
- **Steps:** Log in → Account → Security → **Sign out everywhere**. The app returns to the login screen.
- **Expected:** Same as normal Logout: an empty login form (email + password cleared), like `logout()` does.
- **Actual:** The login form is pre-filled with the email and the 12-character password (values live in React state — `:autofill` is false, so this is not the browser's password manager). Clicking **Log in** immediately signs the user back in — on a shared/lost device, the action the user took to secure the account leaves the credentials one click away. Reproduced 2×; normal Logout correctly shows `email:0, password:0`. As with P10-10, the leak needs a session that started with a *typed* login in this page load — a 3rd run on a session restored by reload left the form empty (double-click on the button produced a single sign-out, no duplicate toast). The confirmation is also shown with the red error-toast style (`showErr`) although it is a success, and there is no "are you sure?" step.
- **Status:** New — same root cause family as **BUG-034** (delete path), but a different path that BUG-034 doesn't cover.
- **Suggested fix:** `src/CryptoIdea.jsx:555-565` `signOutEverywhere` (and the delete path at ~:531) — call one shared `resetSessionState()` that does everything `logout()` does at `:378-380` (`setAuthEmail("")`, `setAuthPass("")`, `setAuthName("")`, consent flags, `setPortfolios(DEFAULT_PORTFOLIOS)`, `setActivePortId("default")`, `resetPlanOverlay()`, the `pw*/em*/prof*` fields). Use a neutral/success toast style for the confirmation.

### P10-05 · High · Keyboard users cannot close popups: no Escape, X not focusable, focus never enters the dialog (root cause of BUG-027)
- **Steps:** Portfolio → Tab to the Bitcoin coin icon → Enter (CoinInfo opens) → Tab → Tab; then Enter on "Transactions" (Detail opens) → press Escape; click inside the popup and press Escape again.
- **Expected:** Focus moves into the dialog on open; Escape closes it; the X is a focusable button; Tab stays inside while the scrim is up.
- **Actual:** (1) On open, focus stays on the icon *behind* the scrim; the first Tab goes to the page's "CoinGecko" link behind the dialog, only then into the dialog. (2) When Detail opens, focus drops to `<body>`. (3) Escape does nothing (tested 2× on Detail, plus once on CoinInfo). (4) The X is `<div class="cm-close" role="button" aria-label="Close">` with `tabIndex=-1` and no key handler, so Tab skips it — a keyboard-only user has **no way** to close CoinInfo/Detail/Buy-Sell and other shared-Modal popups.
- **Tab order inside Detail (from `<body>`, 12 Tabs):** unnamed trash → coin icon → + Buy → - Sell → CoinGecko → then out to the bottom nav *behind* the scrim (Portfolio, Research, …) — the X is never reached and nothing keeps focus in the dialog.
- **Also seen on a destructive dialog:** Account → Portfolios → Enter on the trash of a portfolio with coins opens "Delete My Portfolio? … this can't be undone" with focus left on the trash button behind the scrim; Escape does not dismiss it (repro 1× here, same `Modal`).
- **Status:** Repeat of **BUG-027** (still open) — root cause now identified, and broader than "Escape on Detail".
- **Suggested fix:** `src/components/Modal.jsx` — (a) render the X as `<button type="button" className="cm-close" aria-label="Close">`; (b) add a document-level `keydown` listener for `Escape` → `onClose()` when `!hideClose`; (c) on mount always move focus to the first focusable element in the card (keep the full Tab trap opt-in if desired) and restore focus to the opener on unmount.

### P10-06 · Medium · Asset cards and Journal entries are click-only; Detail's delete-coin icon has no accessible name
- **Steps:** Portfolio with a coin → Tab through the page; then open Detail and inspect the trash icon.
- **Expected:** The card that opens Detail (Buy/Sell/Edit/Delete) is reachable by keyboard and announced as a button; the delete icon is announced "Delete Bitcoin".
- **Actual:** `.asset-card` is a plain `<div onClick>` (no `role`, `tabIndex`, or key handler) — only the small coin icon is focusable, which opens CoinInfo, so a keyboard user must go icon → CoinInfo → "Transactions" to reach Detail. In Detail, the red trash button (`<button class="icon-btn"><svg…>`) has no text or `aria-label` (accessibility tree: `button` with no name). At 375 px (full-screen Detail) **both** header buttons — the `‹` back and the trash — are unnamed. The Buy/Sell amount and price inputs are also named only by their placeholder "0.00". **Journal tab:** each thesis card (`div.j-entry`, `tabIndex -1`, no role) is also click-only, and it is the only way into the thesis detail — so a keyboard-only user cannot review ("Is your thesis still intact?"), edit, save findings for, or delete a thesis at all. Reproduced 2× (BTC and ETH entries). Same for **transaction rows** in Detail (`div.tx-row`, `tabIndex -1`) — the only way to open "Edit BTC", so a keyboard user can't correct a transaction either. The Learn "Today's lesson" card ("Start lesson") is likewise a plain element (the module's "Continue →" button is the keyboard route).
- **Status:** New.
- **Suggested fix:** `src/components/Portfolio.jsx:117` — add `role="button" tabIndex={0}` + Enter/Space handler (the CoinIcon already shows the pattern) or wrap the body in a `<button>`; Journal: same treatment for `.j-entry` in `src/components/Journal.jsx`; Detail trash button: `aria-label={`Delete ${coin.name}`}`; AddEntry inputs: `aria-label="Amount"` / `"Price per coin (USD)"`.

### P10-07 · Medium · "Download all my data (JSON)" leaves out Learn progress (export is not "everything we hold")
- **Steps:** Complete Learn lesson 1 (reload confirms "50 / 300 XP · 1-day streak · 1 of 50 lessons" is saved server-side) → Account → Privacy & data → **Download all my data (JSON)** (blob captured in-page, not saved to disk).
- **Expected:** The copy says "export everything we hold (JSON)" — the file should include `users/{uid}/learn/progress` (XP, streak, completed lessons, last activity).
- **Actual:** Top-level keys are only `exportedAt, account, profile, portfolios`; no learn data. Checked 3× (before, after lesson 1, and after lesson 2 at "100 / 300 XP · 2 of 50 lessons"). Also: `profile.joined` / `lastLogin` are raw Firestore `{_seconds,_nanoseconds}` objects instead of ISO dates, and `journal.priceAtAdd` for my Bitcoin thesis is `0` (see BUG-021 note below).
- **Status:** New.
- **Suggested fix:** `functions/index.js` `exportMyData` (~line 1723) — also read `users/{uid}/learn/progress` (the admin `viewUserAsAdmin` snapshot at ~line 1595 already does) and convert Timestamps with `.toDate().toISOString()`; update `openapi.json` for the new field.

### P10-08 · Low · Plan & billing shows the wrong "Joined" date after any logout
- **Steps:** Account created 2026-11-21 (export: `joined` = 2026-11-21T17:17:45Z, consent accepted the same minute). Log out, log in → Account → Plan & billing.
- **Expected:** Joined 2026-11-21.
- **Actual:** "Joined **2026-11-22**" (today). Reproduced 2× (after Sign out everywhere + log in, and after normal Logout + log in). `useAuthSession.js:92` defaults `joined` to *today* and only the local `ci-profile-<uid>` cache can override it — but every logout path deletes that cache, so after any sign-out the date shown is the day of the last login.
- **Status:** New.
- **Suggested fix:** `src/hooks/useAuthSession.js:90-95` — take `joined` from the server profile, converting the Timestamp (`server.joined?.toDate?.().toISOString().slice(0,10)`) instead of the cache/"today" fallback; show "—" if unknown.

### P10-09 · Low · Export buttons share one cooldown and show a raw "[429]" to the user
- **Steps:** Privacy & data → Download CSV → immediately Download all my data (JSON).
- **Expected:** Either both downloads work, or a friendly "please wait a few seconds" without a status code.
- **Actual:** "Please wait a few seconds before exporting again. **[429]**". Reproduced 2×. A privacy user who wants both files hits an error on the second click, and the HTTP code leaks into the copy.
- **Status:** New.
- **Suggested fix:** drop the `[code]` suffix in the export error path (`src/CryptoIdea.jsx` ~:490-510 / `apiErrorMessage` in `src/utils/errors.js`); optionally build the CSV from the same fetched payload so one cooldown covers both buttons.

### P10-10 · High · Deleted account is one click from being signed back in (BUG-034 still present — only when the session began with a typed login)
- **Steps:** Log in by typing email + password → Account → Privacy & data → Delete my account → password + `DELETE` → confirm.
- **Expected:** Empty login form (as after Logout).
- **Actual:** Login form still holds the email (20 chars) and password (12 chars); one click on **Log in** shows the restore screen for the "deleted" account. Reproduced 3× in this run (including once in light mode). Nuance for the fixer: when the session was restored from persistence (page reload, no typed login) the form was correctly empty — the leak is the React `authEmail`/`authPass` state from the typed login surviving `deleteMyAccount`, exactly as P10-04 for Sign out everywhere.
- **Status:** Repeat of **BUG-034** (still open). Same fix as P10-04 (one shared reset used by logout, delete, and sign-out-everywhere).

### P10-11 · Medium · Restore-account screen unreadable in dark mode (BUG-035 still present) — measured
- **Steps:** Theme Dark → delete account → log in → restore screen.
- **Actual:** Heading "Your account is scheduled for deletion" is `rgb(236,233,225)` on a `rgb(248,249,250)` card (≈1.1:1 contrast — invisible). The "Restore my account" button is iOS green `#34C759` with white text (≈2.2:1, fails WCAG AA) — off-brand vs `--accent`. The screen sits outside `.ci-app` (`closest('.ci-app')` = null), so none of the paper tokens apply. Keyboard: Tab reaches both buttons; restore via Enter works. Reproduced 2× in dark. In **light** mode (4th delete) the heading is `rgb(26,26,26)` and readable — the problem is dark-only, but the `#34C759` button is off-brand in both themes. No "Account restored" confirmation is shown after a successful restore (the app just lands on Portfolio).
- **Status:** Repeat of **BUG-035** (still open).
- **Suggested fix:** `src/components/RestoreAccount.jsx` — wrap in `.ci-app` and reuse the `auth-wrap`/`plan-card` classes + `--accent` button so dark mode flips via tokens.

### P10-12 · Medium · Pulse "Share" sends exact dollar holdings to the share sheet with no preview or opt-out
- **Steps:** Research → Portfolio Pulse → **Share** (I stubbed `navigator.share` in-page to capture the file instead of opening the OS sheet, then rendered it).
- **Expected:** A privacy-safe share by default (percentages/allocation only), or a preview step with a "hide amounts" option — sharing should not reveal how much money someone holds.
- **Actual:** One tap hands the OS share sheet a 1080×1350 PNG (`crypto-idea-pulse.png`, ~895 KB) that prints "**Total $3,040**" and the Pulse paragraph "Your portfolio is **$3,040** … Against a **$3,000** cost basis you're up **$40**", plus the full allocation (BTC 100%). No preview, no confirmation. Captured 3× (last at 20:13 with BTC+SOL: same image built from "Your portfolio is $3,109 …"). The footer date uses the browser locale (here a Hebrew month name inside an English card), and it prints a `cryptoidea.com` domain the product may not own.
- **Status:** New.
- **Suggested fix:** `src/features/research/hooks/useSharePulse.js` (~lines 64-80) — drop `Total …` and the $-bearing sentences by default (keep %, timeframe, allocation), or show the image in the shared `<Modal>` with an "Include amounts" toggle (default off) before calling `navigator.share`; format the date with an explicit `'en-US'` locale; confirm the footer domain.

### P10-13 · Low · Switching tabs keeps the previous tab's scroll position — Journal can look empty
- **Steps:** Research → scroll to the bottom → tap **Journal**.
- **Expected:** Each tab opens at the top (Account drill-ins already do `scrollTo(0,0)`).
- **Actual:** Journal opens at `scrollY=231` (its max) with the only thesis card hidden behind the sticky header — the screen shows the header, a blank page and the nav, as if the journal were empty. Reproduced 2× (dark and light). The Journal page is also ~900 px tall for one entry, so there is room to scroll it away.
- **Status:** New.
- **Suggested fix:** in the tab switcher in `src/CryptoIdea.jsx` (where `tab`/`screen` changes) add `useEffect(() => window.scrollTo(0,0), [tab])`, mirroring `Account.jsx:157`.

### P10-14 · Low · Account → Portfolios: Enter doesn't add, "1 coins", and every row's buttons share one name
- **Steps:** Account → Portfolios → type "Cold storage" in "New portfolio name" → press Enter; then inspect the list with a screen reader.
- **Expected:** Enter adds the portfolio (it does in the Rename dialog); "1 coin"; buttons named per row ("Rename Cold storage", "Delete Cold storage").
- **Actual:** Enter does nothing — the name stays in the box until "+ Add" is clicked (reproduced 2×). Row subtitle reads "1 coins". Each row has identical `Rename portfolio` / `Delete portfolio` buttons, so a screen-reader user hears six identical buttons with no way to tell which portfolio they act on. The row name itself (tap = make active) is a click-only `div.pr-name-wrap` (`tabIndex -1`); keyboard users can still switch via the Portfolio-tab pills, which are real buttons. The empty-portfolio delete is a 3-second "Remove" pill that auto-disarms (fine with a mouse; tight for switch/screen-reader users — WCAG 2.2.1).
- **Status:** New.
- **Suggested fix:** wrap the add input + button in a `<form onSubmit>` in `src/components/Account.jsx` (Portfolios view); pluralise with `n === 1 ? "coin" : "coins"`; `aria-label={`Rename ${p.name}`}` / `aria-label={`Delete ${p.name}`}`.

### P10-15 · Medium · Session replay + tracing run even with "Allow product analytics" OFF (and from local dev)
- **Steps:** Account → Privacy & data → make sure **Allow product analytics** is OFF (it is, default) → reload `/app` → wait ~8 s → in DevTools Performance/Network (I used `performance.getEntriesByType('resource')`).
- **Expected:** A privacy user who left analytics off expects no behavioural recording; at minimum Sentry *replay/tracing* (not error reporting) should follow the same consent switch, and a local emulator session should not ship to the production Sentry project.
- **Actual:** `sessionStorage.sentryReplaySession` is set and `fetch` envelopes are POSTed to `o4511914659086336.ingest.de.sentry.io/…/envelope/` within seconds of load (3 envelopes after one reload; reproduced 3×, the last time on the **signed-out login page** at 20:14 — 2 envelopes before anyone could even reach a consent switch). `src/observability-client.js` initialises `replayIntegration()` with `replaysSessionSampleRate: 1.0` unconditionally from `main.jsx:18`; nothing reads `settings.consentAnalytics`. The privacy policy does disclose Sentry/replay, but the in-app toggle "Allow product analytics — withdraw anytime" reads as the control for exactly this, and it has no effect on it.
- **Status:** New (founder decision C-"measure everything" is noted in the file header; this is about the consent switch not covering it).
- **Suggested fix:** `src/observability-client.js` — keep error capture always-on if desired, but add replay/tracing only when `settings.consentAnalytics === true` (Sentry supports `addIntegration(replayIntegration())` after init), and skip `Sentry.init` entirely when `location.hostname` is `localhost`/`127.0.0.1` (or behind `import.meta.env.PROD`). Mention replay next to the toggle.

### P10-16 · Low · Disabled "Yes, delete my account" button looks fully active
- **Steps:** Privacy & data → Delete my account → leave the password empty (or type `delete` in lower case) → look at / click the red button.
- **Expected:** A visibly disabled button (dimmed, default cursor) or an inline hint ("type DELETE in capitals").
- **Actual:** `disabled=true` but `opacity:1`, solid red `rgb(191,71,48)`, `cursor:pointer` — clicking does nothing and nothing explains why. Seen at desktop width and at 375 px (iframe), dark mode; reproduced 2×. `app.css:803-807` has no `.priv-btn:disabled` rule (other buttons such as `.submit-buy:disabled` do).
- **Status:** New.
- **Suggested fix:** `src/styles/app.css` — `.ci-app .priv-btn:disabled { opacity:.45; cursor:default; }`; optionally accept `delete` case-insensitively or say "type DELETE (capitals)". Copy nit on the same card: the intro says "…or **permanently** delete your account" while the flow is a 30-day restorable soft delete.

### P10-17 · Low · Theme radiogroup and bottom nav don't follow ARIA patterns
- **Steps:** Account → Tab to the Theme control → press →; inspect the bottom nav while on each tab and on Account.
- **Expected:** A `radiogroup` is one Tab stop with arrow keys moving/selecting (WAI-ARIA radio pattern); the current tab carries `aria-current="page"`.
- **Actual:** Light/Dark/System are three separate Tab stops (`tabIndex 0` each) and ArrowRight does nothing (focus and selection stay on Dark; reproduced 2×). None of the five nav buttons expose `aria-current`/`aria-selected` (only the `.active` class), and on the Account screen "Portfolio" stays highlighted as if it were the current page. Same for the Pulse 24H/7D/30D switch (selected state only via `.active`, no `aria-pressed`). Account drill-ins: Enter on "Security" drops focus to `<body>` (not the drill-in heading); Back returns to Account home with focus left on the shared `‹` Back button rather than the "Security" row, so a second Enter leaves Account altogether (checked 2×). While tabbing down Account home, the focused row (Security at 19:23; Logout at 20:07) can sit underneath the floating bottom-nav pill, partly hidden (WCAG 2.4.11 Focus Not Obscured) — add `scroll-padding-bottom` ≈ nav height to the scroller.
- **Status:** New.
- **Suggested fix:** Theme control in `src/components/Account.jsx` — roving `tabIndex` (0 on the checked radio, −1 on others) + ArrowLeft/Right handler; bottom nav (`src/CryptoIdea.jsx` / nav component) — `aria-current={active ? "page" : undefined}` and no active tab while `screen === "account"`; in `Account.jsx` move focus to the `.set-scr-head` title on drill-in (it already has the `scrollTo` effect at :157) and back to the originating row on Back.

### P10-18 · Low · Login and change-email tell an attacker which emails have accounts (Forgot password deliberately doesn't)
- **Steps:** Log in with a wrong password for `p10.privacy@test.com` → "Incorrect password"; log in with `nobody.p10@test.com` / `ghost.p10.privacy@test.com` → "**No account with this email**" (each message seen 2×, with different addresses). Profile → Change email to another persona's address + my correct password → "**Email already registered**".
- **Expected:** One generic message ("Email or password is incorrect"), consistent with Forgot password, which correctly says "We've sent password reset instructions" for both a real and an unknown email.
- **Actual:** Distinct messages reveal whether an address is registered. In production, Firebase's Email Enumeration Protection collapses most of these into `auth/invalid-credential` (which the app maps to "Incorrect password"), so this is mostly visible on the emulator — but the mapping still promises the distinction and the change-email path stays enumerable for any signed-in user.
- **Status:** New.
- **Suggested fix:** `src/api/firebase-auth.js:283-291` — map `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-credential` to one string "Email or password is incorrect"; for change-email, show "We sent a confirmation link if that address can be used" for `email-already-in-use` too. Confirm Email Enumeration Protection is ON at go-live (GO-LIVE-AUDIT).

### P10-19 · Medium · Portfolio value flashes a fake +40% gain on every app load (mock price seed — BUG-023 root cause, new surface)
- **Steps:** Hold 0.05 BTC bought @ $60,000 → reload `/app` (or log in after a fresh load) and watch the Portfolio value card (I sampled `innerText` every 100 ms).
- **Expected:** "—"/skeleton until the live quote arrives, then ~$3,043 (+1.4%).
- **Actual:** First paint shows **$4,200.00 ▲ +$1,200.00 (+40.00%)** and the BTC card at **$84,000.00** (the `TOP_COINS` mock), replaced ~100 ms later by $3,043.30 (+1.44%) on the local emulator — on a slow network the fake gain stays up for as long as `/api/prices` takes. The "● LIVE" tag is absent during the flash. Reproduced 2× (after login at 19:44 and after reload); a 3rd reload at 20:09 rendered straight to the live value (the first sample landed at ~1.4 s, after the swap), so it is timing-dependent — the slower `/api/prices` is, the longer the fake gain shows.
- **Status:** Repeat of **BUG-023** (still open) — same seed in `src/hooks/useLivePrices.js:16`; this adds the Portfolio value/P&L surface, not just the Buy form.
- **Suggested fix:** as BUG-023 — don't seed with `mockPrice`; render "—"/the existing `txLoaded`-style "Loading…" placeholder on the value card until a real quote exists.

### P10-20 · Medium · Landing "Usage" promises things the app doesn't deliver today (conviction signals, no upsell, all modules open)
- **Steps:** Landing `/` → Usage section; then sign in and open Research and Learn; hit a plan limit.
- **Expected:** The Starter card lists only what a Starter user actually gets.
- **Actual:** The card says "**Conviction signals on your holdings**", "**No payment, no card, no upsell**" and "**All 9 Learn modules, fully open**". In the app (with the shipped default `aiResearch:false`) Research has no Coins sub-view, so no conviction pills appear anywhere (checked 2×: no "Coins"/"Ask" controls, no 🟢/🟡 pills); a portfolio-limit tap says "upgrade to Pro for 6" (BUG-032) and the Portfolio limit banner links "Upgrade to Pro" (dead-ends in "New subscriptions are paused right now."); Learn modules 2–9 are padlocked (BUG-028). The hero also says "Your data stays yours" while session replay ships to a third party regardless of the analytics switch (P10-15), and both "Source on GitHub" links point at a repo the project guide describes as private (not opened — external site).
- **Status:** New (conviction + "data stays yours" parts); the upsell and Learn parts are Repeat of **BUG-032** / **BUG-028** (still open).
- **Suggested fix:** `index.html` Usage list — drop "Conviction signals" until the Coins view is shown with `aiResearch` off (or show the deterministic pills on the Overview, which are not AI); fix BUG-032/BUG-028 or soften the copy; make the GitHub repo public before launch or remove the links.

### P10-21 · Low · Recorded consent version is older than the published Terms/Privacy, and no re-acceptance is asked
- **Steps:** Privacy & data → Download all my data (JSON) → `profile.consent`; open `/privacy.html` and `/terms.html`.
- **Expected:** The stored `termsVersion`/`privacyVersion` match the documents' "Last updated" date, or the app asks for re-acceptance / shows the "notice in the app" the policy promises for changes.
- **Actual:** My consent record says `termsVersion: "2026-06-24"`, `privacyVersion: "2026-06-24"` (accepted 2026-11-21), but both documents say "Last updated: 15 August 2026" (the August edit added Sentry **session replay**). `CONSENT_VERSION` in `src/api/firebase-auth.js:27` was not bumped, so new sign-ups today are also stamped with the June version, and existing users got no notice. Checked 2× (two exports).
- **Status:** New.
- **Suggested fix:** bump `CONSENT_VERSION` to `2026-08-15` together with the HTML dates (add a guard test that the constant equals the "Last updated" date), and decide (founder) whether a material change needs a re-accept prompt. Copy nit: the policy points to "Account → Privacy & your data", the screen is titled "Privacy & data". Navigation nit: the in-app "Privacy Policy · Terms" links open in the same tab and the page's only way out is "← Back to site" → the landing `/`, not back to the app (browser Back does restore the Privacy & data screen).

### P10-22 · Low · Form fields and repeated buttons are named only by placeholder / generic text
- **Steps:** Keyboard-only: Search tab (focus lands in the search box — good) → type "ethereum" → Tab to "+ Add" → Enter → thesis prompt → Tab through fields with a screen reader / accessibility tree.
- **Expected:** "Add Ethereum"; textareas announced as "Why are you buying this?", "What would change your mind?", "Dilution & token unlocks", etc.
- **Actual:** Every result button is "+ Add" (15 identical names in Trending); the five thesis textareas are named by their example placeholders ("e.g. active GitHub, founder talks publicly…") because the visible question text isn't a `<label for>`; the Display name / Buy-Sell amount + price inputs are the same (placeholder-only). The whole flow *is* completable by keyboard (saved the ETH thesis with Tab/Enter only), apart from P10-05's focus issue (9 background Tab stops before the dialog). Reproduced 2× (BTC with mouse, ETH with keyboard).
- **Status:** New (related to BUG-029, which covers quiz options).
- **Suggested fix:** `src/components/Search.jsx` — `aria-label={`Add ${coin.name}`}`; thesis prompt + Journal detail — give each question an `id` and the textarea `aria-labelledby`; `Account.jsx:217-218` — `<label htmlFor="acct-name">` + `id`.

### P10-23 · Low · "Email digest" switch saves a preference nothing uses
- **Steps:** Account home → toggle **Email digest** on → reload (stays on) → toggle off (tested on→off→on→off across 2 reloads).
- **Expected:** Either a digest actually exists (with a word about what/when it sends), or the control isn't shown yet.
- **Actual:** The setting persists to `users/{uid}.settings.emailDigest`, but no server code reads it (`grep emailDigest functions/` → no hits; only `src/api/firebase-auth.js` + `Account.jsx`). A privacy user who turns it **on** expects mail that will never come; one who leaves it **on** by default would reasonably assume they're being emailed a summary of their holdings. (`emailMarketing` is likewise only stored — fine as a consent record, but nothing sends.)
- **Status:** New.
- **Suggested fix:** hide the Email digest row (`src/components/Account.jsx:197`) until a digest job exists, or add a one-line hint ("Weekly summary — coming soon"); founder decision.

### P10-24 · High · Sell form pre-fills the $84,000 mock price even after live prices loaded; typing appends to it and records a fake sale
- **Steps:** Hold 0.05 BTC (bought @ $60,000). Open Bitcoin Detail — header shows the live **$60,854.00**. Tap **- Sell**. Click in the price field and type `61000`; amount `0.01`; Add Sell.
- **Expected:** Price empty or the live/AUTO price (the form itself says "Suggested price: $60,121.30 · tap AUTO to use"); my typed 61000 is what gets saved.
- **Actual:** The price field is pre-filled **84000.00** (stays so for 3 s+ while the live header price is on screen). A click puts the caret at the end, so typing gives `84000.0061000`; it is saved as **$84,000.01 / BTC**. Detail then shows "Sold 0.01 BTC · $840.00 · Avg Sell Price $84,000.01" and **Total P/L +$274.16 (+9.14%)** — an invented realised gain, which also lands in the CSV/JSON export. Reproduced 3× (the saved sell; a second form open: `before=84000.00`, `after=84000.0061000`; and a **Buy** on newly added Solana at 20:06 — header live $70.26, field pre-filled **125.00**, while the hint says "Suggested price: $70.20"). Tapping **AUTO** does fill the right 70.20, so the correct value is available — it just isn't the default.
- **Status:** Repeat of **BUG-023** (still open) — but the root cause is wider than the `useLivePrices` seed: `startAddTx` in `src/CryptoIdea.jsx:856-857` prefers `getHistoricalPrice(coin.id, now)` (the built-in estimate anchored on `TOP_COINS.mockPrice`, `src/utils/coins.js:460`) over the live `prices[coin.id].usd`, so the mock wins *even after* live data arrives.
- **Suggested fix:** in `startAddTx` use the live price first (`pr ?? ""`), never the estimate for "now"; select-all on focus for the prefilled price (`onFocus={e=>e.target.select()}`) so typing replaces it; label any estimate as an estimate (BUG-025).

### P10-25 · Medium · Another user's cached profile (email, name, settings) survives on the device after their session ended
- **Steps:** On the login screen (nobody signed in), inspect `localStorage` (DevTools → Application).
- **Expected:** No personal data of any previous account on a signed-out device (the code comments call this "shared-device hygiene", ISO-3/G4).
- **Actual:** `ci-profile-gGsbd2jXMH1SJf2lUq6he75KNJmo` = `{"email":"test123@test.com","name":"mark","tier":"free","joined":"2026-11-21","settings":{…},"planChosen":true,…}` — a different account, last updated 2026-11-21 — was present every time I checked while signed out (3× between 19:24 and 19:29, also after my own Logout/Sign-out-everywhere/delete, which correctly removed only *my* key). Root cause: the three explicit paths (`logout`, `deleteMyAccount`, `signOutEverywhere` in `src/CryptoIdea.jsx`) delete `ci-profile-<uid>`, but the generic signed-out branch in `src/hooks/useAuthSession.js:159-171` (session ended by token revocation, a password change on another device, the BUG-005 admin-tab sign-out, or expiry) only drops `ci-active-port`, so the profile cache stays behind.
- **Reproduced with my own account:** while signed in, I cleared the Firebase auth store (`firebaseLocalStorageDb`) to simulate an expired/revoked session and reloaded — the app showed the login screen (session-ended branch), and `ci-profile-wTh82IpMpRuD2jE9WMzbY4fdOxMq` (my email + name) was still in `localStorage` next to the stray test123 entry. Only `ci-active-port` had been removed.
- **Status:** New.
- **Suggested fix:** in the `else` branch of `useAuthSession.js`, capture the previous `uidRef.current` before nulling it and `db.del("ci-profile-" + prevUid)`; on startup, delete any `ci-profile-*` key that doesn't match the signed-in uid. (Not cleaning up the stray key myself — it isn't my persona's data.)

### P10-26 · Low · Marketing / analytics consent is stored as a bare boolean — no record of when it was given or withdrawn
- **Steps:** Privacy & data → turn **Product updates & offers** ON → Download all my data (JSON) → read `profile.settings` / `profile.consent` → turn it OFF again. (Did the same with Allow product analytics earlier.)
- **Expected:** Like the Terms/Privacy acceptance (which has `termsAcceptedAt` + version), an opt-in to marketing or analytics keeps its own timestamp (and ideally the copy version) so the operator can show when consent was given/withdrawn.
- **Actual:** Only `settings.emailMarketing: true` / `consentAnalytics: false` plus one shared `settings.updatedAt`, which is overwritten by *any* settings change (theme switch, digest toggle) — after I switched theme, the moment of the marketing opt-in was no longer recoverable. Checked 2× (analytics at 19:30, marketing at 19:55). `firestore.rules:402` only allows those five keys, so a timestamp can't be added client-side today.
- **Status:** New.
- **Suggested fix:** founder decision — e.g. add `consent.marketingAt` / `consent.analyticsAt` (server-written or rules-validated `== request.time`), extend `firestore.rules` `validSettings`/consent shape and the export.

### P10-27 · Medium · "/edge" newsletter box promises "Unsubscribe anytime" but there is no list, no unsubscribe and no policy coverage
- **Steps:** Landing footer → The Edge (`/edge`) → bottom card "Get the weekly edge … Subscribe · No spam. Unsubscribe anytime." (read 2×; I did **not** submit an address). Then read `functions/index.js` `/api/subscribe` (~line 3490) and `privacy.html`.
- **Expected:** A consented sign-up that is recorded (with time + source), can be unsubscribed, and is described in the privacy policy.
- **Actual:** The endpoint just emails the typed address to the site owner ("New signup … ${email}") — nothing is stored, so there is no list to unsubscribe from and no consent record; there's no link to the privacy policy next to the box; `privacy.html` never mentions a newsletter/subscription; and the handler also accepts the address from the **query string** (`req.query.email`), which would put emails into URLs and access logs if any client used it.
- **Status:** New.
- **Suggested fix:** founder decision — either remove the box until a real list exists, or store sign-ups server-side (`subscribers/{hash}` with `consentAt`, source, unsubscribe token), add the policy section + a "Privacy" link under the box, and drop `req.query.email` (POST body only).

### P10-28 · Low · "Signed out of all devices" overstates it — other devices keep access for up to ~1 hour (code observation)
- **Steps:** Security → Sign out everywhere (message: "Signed out of all devices. Please sign in again."). Only one browser profile was available, so the second-device effect could not be exercised; read `functions/index.js:1717` and `firestore.rules`.
- **Expected:** A user who suspects a lost phone is told the truth, or the other device loses access immediately.
- **Actual:** The callable only calls `revokeRefreshTokens`; Firestore rules and the callables don't check token revocation (`checkRevoked` / `auth_time` vs `tokensValidAfterTime`), so another device's current ID token keeps reading/writing the portfolio and journal until it expires (≤1 h). The copy says it happened instantly.
- **Status:** New as a user-facing copy issue; the underlying gap is already planned as **ISOLATION.md G7 / ISO-4** (go-live). Not reproduced in-browser (single device).
- **Suggested fix:** until ISO-4 ships, reword to "Other devices will be signed out within an hour"; with ISO-4, enforce revocation on sensitive reads/writes.

### P10-29 · Low · Policy says nothing goes to CoinGecko about you, but your coin logos load straight from CoinGecko's CDN (and fonts from Google)
- **Steps:** Signed in with BTC + ETH, open Portfolio; list resource hosts (`performance.getEntriesByType('resource')`, checked 2× — after reload and after login).
- **Expected:** Matches `privacy.html` ("Market data … comes from CoinGecko through our own server proxy; no personal data about you is sent to CoinGecko").
- **Actual:** The browser fetches each held coin's thumbnail directly from `assets.coingecko.com` / `coin-images.coingecko.com`, so CoinGecko receives the user's IP + Referer together with exactly which coins they hold/search for. Fonts are fetched from `fonts.googleapis.com`/`fonts.gstatic.com` (Google gets the IP) — also not named in the policy. Third-party hosts seen in one session: Google Fonts, CoinGecko image CDN, Sentry ingest (10 requests). The landing page (`/#dca`, checked 20:15) only adds Google Fonts — no Sentry, no CoinGecko images there.
- **Status:** New.
- **Suggested fix:** either self-host/proxy coin thumbnails through `/api` (cacheable, keeps the flat-cost model) and self-host the two fonts, or list both processors in `privacy.html` and soften the CoinGecko sentence.

### P10-30 · Low · Dark-mode users get a light "flash" on every load, and every logged-out screen is light
- **Steps:** Theme = Dark → reload `/app` and sample `<html data-theme>` + body background every 50–80 ms (2 runs). Also: Logout / Sign out everywhere / delete while in Dark.
- **Expected:** The chosen theme from the first paint (it's a per-device visual preference, not personal data).
- **Actual:** `data-theme` is `null` → `light` (≈0.8 s) → `dark` only at ≈1.2 s, so the page shows the light paper `rgb(248,247,243)` for about a second before turning dark (run 1: null→light→dark; run 2: light at 822 ms, dark at 1179 ms). After any sign-out the login/restore screens are light because the theme lives only in the signed-in profile.
- **Status:** New.
- **Suggested fix:** keep the last theme in a non-personal `localStorage` key (e.g. `ci-theme`) and apply it before React mounts from an external boot script in `public/` (CSP forbids inline scripts — same pattern as `sw-register.js`); keep it after logout.

### P10-31 · Low · "Delete Solana?" warns I'll lose "your saved thesis" for a coin that has no thesis
- **Steps:** Add Solana via Search → **Skip for now** (no thesis) → Buy 1 → Detail → trash.
- **Expected:** The warning lists only what will actually be lost ("1 transaction").
- **Actual:** "This coin has 1 buy/sell transaction **and your saved thesis**. If you delete it … this can't be undone." Reproduced 2× (keyboard Enter and mouse). For a privacy user deciding what to erase, the dialog misstates what data exists. (Same dialog: focus stays on the trash button behind the scrim — P10-05.)
- **Status:** New.
- **Suggested fix:** `src/components/Detail.jsx:157` — append "and your saved thesis" only when `coin.journal?.thesis`; also pluralise via the same `entries.length` check already there.

### P10-32 · Medium · Coin info for a top coin you don't hold shows mock price, 24h and market cap — permanently, under the "● LIVE" tag
- **Steps:** Search → type `dogecoin` → tap the Dogecoin icon (CoinInfo). Wait 4 s (polled every 0.5 s), close, reopen.
- **Expected:** Live quote via the one-shot `/api/prices` fetch (the earlier p09 portfolio at session start showed live DOGE **$0.0552**).
- **Actual:** "**$0.1650 · +4.10% today · Market cap $23.70B**" — exactly the `TOP_COINS` mock values — and they never change (8 samples over 4 s, reproduced on two opens); "1 Year Ago $0.1650 +0.00% / 6 Months Ago $0.1650" history is flat mock too, while 24h volume/circulating show "—". Same for **Cardano**: "$0.7200 · −1.20% today · $25.60B" (mock; live ADA was $0.1446 on the p09 screen at 19:21) — a 5× overstatement. BTC and ETH CoinInfo showed live prices only because I hold them.
- **Status:** Repeat-family of **BUG-021/BUG-023** (mock price seed) — new surface. Root cause: `src/components/CoinInfo.jsx:25` only fetches when `!prices[coin.id]`, but `useLivePrices.js:16` pre-seeds `prices` with every `TOP_COINS` mock, so for a non-held top-50 coin the fetch is skipped and `rawPrice = p?.usd ?? cd?.mockPrice` (`:38`) shows the mock forever.
- **Suggested fix:** remove the mock seed (BUG-023) or make the CoinInfo condition "no *live* price" (track a `live` flag per entry) so the one-shot fetch always runs; never fall back to `mockPrice`/`mockChange`/`mockMcap` in CoinInfo — show "—".

### P10-33 · Medium · Passwords typed in Profile / Security stay filled in after an error and after leaving Account
- **Steps:** Account → Profile → Change email: enter an address + my current password → Send (it errors, e.g. "Email already registered" when I typed my own current address, or "Enter a valid email address"). Leave Account (Portfolio / Research tab), come back to Profile.
- **Expected:** The password field is cleared on error and whenever the screen is left (as Security does after a successful change).
- **Actual:** The password (12 chars) and the email are still filled in after navigating away and back — checked 2× (via Portfolio and via Research). Because the value lives in app-level state until logout, anyone who picks up the unlocked device can type their own address and press **Send confirmation link** — the re-auth step is already satisfied — which starts an email change (account takeover path once confirmed). **Same in Security:** after a failed change ("Password must be at least 8 characters") the *Current password* (12 chars) and the attempted new one stay filled after leaving to Journal and back — whoever holds the device next only has to type a new password and press Save (reproduced 2× at 20:12–20:13: "at least 8 characters" then "needs at least 1 uppercase letter", leaving via Journal and via Research). The old error line also stays on screen after the fields are emptied. Also, entering the account's *current* email returns "Email already registered", which reads like an error about someone else.
- **Status:** New.
- **Suggested fix:** clear `emPass` (and `pwCur`/`pwNew`, `delPass`) on any error and in an effect when the Account `view` changes / the Account screen unmounts (`src/components/Account.jsx`, state owned in `src/CryptoIdea.jsx`); special-case "same as current email" with a clear message.

## Known bugs re-checked
| Bug | Result in this run |
|---|---|
| BUG-005 Admin tab signs out sessions | Not reached (/admin off-limits) |
| BUG-020 Sync toast during setup | Not reached (no sign-up) |
| BUG-021 Search mock prices / thesis saves them | **Still present** — ETH $1,900 in Search, journal `priceAtAdd: 1900`, Journal detail "· $1,900.00"; a coin added from **Trending** saves `priceAtAdd: 0`; but a thesis added later from the Journal ("Add thesis" on ETH) recorded the live **$1,713.61** — so the two entry points disagree |
| BUG-022 Empty holding green +$0.00 | **Still present** — header 24H "+0.00%" green on an empty book; CoinInfo "Unrealised P/L +$0.00 (+0.00%)" and "Avg cost $0.0000000000" for a 0-holding coin |
| BUG-023 AUTO buy price uses mock | **Still present**, wider — P10-19 (value flash) and P10-24 (Sell prefill even after live load) |
| BUG-024 Tx time in UTC | **Still present** — 19:28 local prefilled as 17:28; saved row "05:28:00 PM"; CSV date `2026-11-22T17:28` |
| BUG-027 Escape doesn't close Detail | **Still present** — root cause found (P10-05) |
| BUG-028 Learn modules 2–9 locked | **Still present** (padlocks; landing says "fully open"); clicking a locked card (e.g. Tokenomics & Supply) does nothing — no message or tooltip explaining how to unlock it (2 clicks) |
| BUG-029 Quiz answers not controls | **Still present** — `.quiz-opt` `tabIndex -1`, no role; the only focusable controls in a lesson are "Previous" and a disabled "Submit", so a keyboard-only user cannot complete **any** lesson (Learn is unusable without a mouse); "Forgot password?" / "Back to log in" are `<span>`s not reachable by Tab |
| BUG-030 Wrong answer stays green | **Still present** — wrong pick `quiz-opt selected` green bg next to "Not quite" |
| BUG-031 Name strips accents etc. | **Still present** (Account + Register) — P10-01 |
| BUG-032 Upsell to unbuyable plan | **Still present** — "Starter: 3 portfolios — upgrade to Pro for 6" (2×); Portfolio limit banner "Upgrade to Pro" (seen on p09's 30/30 screen at session start; code `Portfolio.jsx:89/92`, not gated on `paidPlansEnabled`, dead-ends in "New subscriptions are paused right now.") |
| BUG-033 Oversized Privacy-card line | **Still present** (light + dark) — root cause: `.usage-note` is only sized inside `.usage-row` (`app.css:740`); in Privacy it sits outside one (`Account.jsx:392`) |
| BUG-034 Deleted account creds in form | **Still present** (3×) — P10-10; same leak on Sign out everywhere (P10-04) |
| BUG-035 Restore screen dark mode | **Still present** — P10-11 (light mode readable) |
| BUG-036 Single-token book Low risk | Seen (100% BTC = Low); not investigated (outside charter) |

## What worked well
- Forgot password never reveals whether an email exists; it also pre-fills the email from the login form.
- Password change: wrong current password, weak new password and success all give clear, specific messages; both fields clear after success.
- Delete flow is well guarded (password re-auth + typed `DELETE`, honest 30-day copy) and restore is one click, with every coin/tx/thesis intact — 4 delete/restore cycles, no data loss. A second open tab is signed out too.
- Logout clears the form and this user's cache, and propagates to other tabs.
- Export is genuinely useful: the CSV has a holdings summary + transactions; the JSON includes theses, settings and consent versions; formula-looking cells are neutralised (per `csv.js`).
- Analytics and marketing default to OFF and persist correctly across reloads.
- Theme switch is instant, persists per account, and every main tab is readable in both themes.
- Search box auto-focuses; adding a coin with a thesis is possible end to end with the keyboard; the empty-portfolio delete moves focus to the "Remove" confirm.
- Email in the login form is trimmed and case-insensitive.
- The Journal tells users plainly that the team can see their journal.
- Observation (by design, R24 — not logged as a bug): in the thesis **Edit** form, which shows explicit "Save changes" / "Cancel" buttons, clicking the **X** silently saved my appended "DRAFT-NOT-MEANT-TO-SAVE" text; I restored the original with Save changes. A privacy-minded user may read X as "discard" — worth a founder look at whether X should mirror Cancel while the edit form is open.
- No app console errors in ~50 min of flows (only Grammarly-extension noise and one `MessageNotSentError` from extension messaging when I removed a test iframe).

## Timeline
- 19:21 — start; health check: app :3000/app 200, functions :5001 responds (404 at root = up). Shared Chrome profile was still signed in as `p09.edge@test.com`; logged that session out first.
- 19:22 — logged in as p10 (account already existed: "Pat Privacy", empty default portfolio, theme Dark). Profile name tests (BUG-031), keyboard pass over Account home (P10-02).
- 19:24 — Plan & billing (P10-03), Security: wrong/weak/real password change and back, Sign out everywhere ×2 (P10-04).
- 19:26 — Forgot password: real + unknown + invalid email (no enumeration). Added BTC + thesis + 1 buy; keyboard pass over CoinInfo/Detail popups (P10-05, P10-06).
- 19:29 — Privacy & data: CSV + JSON export captured in-page (P10-07, P10-09), analytics toggle persistence, Learn lesson 1.
- 19:31 — Delete account ×2 (wrong password first), restore screen (BUG-034/035), restore via keyboard; data intact.
- 19:33 — Theme Dark/Light/System across all 5 tabs + Account; tab scroll bug (P10-13); Pulse share privacy (P10-12).
- 19:35 — Portfolios to 3/3, upsell toast (BUG-032), rename with accents, verify-email banner, Sentry replay vs consent (P10-15).
- 19:38 — 375 px checks via a same-origin iframe (window resize is blocked: maximized window); disabled delete button (P10-16); change-email flow; ARIA checks (P10-17); register form (BUG-031 also on Register); login error copy (P10-18).
- 19:42 — Mock-price flash on load (P10-19); Portfolios delete via keyboard two-step; delete-with-coins dialog (P10-05 evidence); landing Usage vs app (P10-20); privacy.html (P10-21).
- 19:46 — Keyboard-only Search → thesis → save (P10-22); Journal entries click-only (P10-06); thesis delete; email digest (P10-23); multi-tab logout propagation (OK).
- 19:48 — Sell form mock prefill → fake $84,000.01 sale (P10-24), deleted that sell; Learn quiz re-check (BUG-029/030); 3rd delete with a second tab open (other tab signed out too), restore.
- 19:51 — 4th delete in light mode (BUG-035 light vs dark); session-expiry simulation → profile cache left behind (P10-25); 47-char name; marketing-consent export (P10-26).
- 19:57 — /edge newsletter (P10-27); sign-out-everywhere revocation (P10-28); third-party hosts (P10-29); 768 px iframe; Learn lesson 2.
- 20:03 — Dark-mode load flash (P10-30); keyboard re-checks (switch focus screenshot, drill-in focus); added Solana (prefill 125 vs live 70 → P10-24 3rd repro); delete-coin copy (P10-31); unknown-email login 2nd repro.
- 20:10 — CoinInfo mock data for non-held top coins (P10-32, DOGE + ADA); passwords left in Profile/Security fields (P10-33); cleared them by hand.
- 20:14 — Final checks: Logout (form + own cache cleared, stray test123 cache still there), terms.html, signed-out Sentry envelopes, console clean. Left the account logged out, theme Dark, data as in the table above.
