# Crypto Idea — Product Backlog (Next Steps)

> This is the **prioritized product backlog** for our [Agile workflow](AGILE.md): top = next.
> Each item is a small, shippable increment finished to the **Definition of Done** in AGILE.md.
> The architecture refactor (§1) is complete. The current priority is the **2026-06-22 product
> direction** (§0, canonical: [`PRODUCT-DECISIONS.md`](../decisions/PRODUCT-DECISIONS.md)) — finish the conviction
> engine, Learn, and the tier reconfig behind a secure AI proxy. Go-live tasks (§4) follow.

See also: [`AGILE.md`](AGILE.md) (how we work + Definition of Done),
[`src/ARCHITECTURE.md`](../../src/ARCHITECTURE.md) (layer rules + migration detail),
[`README.md`](../../README.md) (backend/proxy/deploy), [`CLAUDE.md`](../../CLAUDE.md) (conventions).

---

## AUTH-DUP. Prevent duplicate-signup double-submit + admin dedupe detector  (📋 PLAN — 2026-08-01; NOT built)

Founder report (2026-08-01, with a screenshot showing **two `mark@test.com` rows** in the admin
Users list): pressing **Create Account / Log in** twice within 1–2 seconds — because the button
didn't respond fast enough — created **duplicate accounts for the same email**. Fix the double-submit
and give the owner a way to see any duplicates that already exist.

**Root cause (verified in code):** `handleAuth` ([`src/CryptoIdea.jsx`](../../src/CryptoIdea.jsx) ~L282)
is `async` and `await`s `registerUser` / `loginUser`, but the submit button
([`src/components/Login.jsx`](../../src/components/Login.jsx) ~L214) is a plain `type="submit"` that
is **never disabled while the request is in flight**, and there's **no re-entry lock**. A second
click (or Enter) before the first `await` resolves fires a **second `registerUser` concurrently**.
The seed script creates admin/admin2/manager/legacy/free/pro only — never `mark` — so the two `mark`
rows came from the real flow firing twice.

**Prod vs development — important, and the reason this is lower-blast-radius than it looks:**
- **Production** (real Firebase Auth / Identity Platform) enforces email uniqueness **transactionally**
  — the second concurrent `createUserWithEmailAndPassword` is rejected with `auth/email-already-in-use`,
  so **two accounts with the same email cannot both be created**. The double-click just produces an
  ugly error.
- **Development** (the Auth **emulator**) is a lightweight single-process check with no concurrency
  constraint, so two near-simultaneous creates can **both** slip past the "email exists?" test → two
  accounts. **This is what produced the duplicate `mark` rows** — an emulator artifact, not a
  production outcome.
- The double-submit itself is a real bug in **both** environments; production merely hides the worst
  symptom.

**Firestore-rules clarification (answers "check rules / I need enforcement rules"):** Firestore
security rules **cannot** enforce email uniqueness — a rule only sees the one document being written
and can't query "does any *other* user doc already use this email?" ([`firestore.rules`](../../firestore.rules)
validates each user doc's *shape* only). The email-uniqueness "rule" already exists — it lives in
**Firebase Auth**, not in firestore.rules. So the real defenses are the client in-flight lock (below)
plus Auth's native constraint; a Firestore rule is the wrong tool here.

### Part A — Client in-flight lock (the fix; founder chose "client lock only", KISS)

The single always-correct fix — stop the button from firing twice at the source. No new backend
(founder declined the server-callable pre-check; Auth's native uniqueness is the server guarantee in
prod).

- **Hard re-entry lock:** a `useRef` `authBusyRef` in `handleAuth`. At the top: `if (authBusyRef.current) return;`.
  Keep the existing **synchronous** validation early-returns *before* taking the lock (so a validation
  bail-out never leaves it stuck), then set `authBusyRef.current = true` immediately before the async
  auth call and reset it in a **`finally`**. A ref (not state) is the reliable lock because a state
  update is async and wouldn't block a same-tick second call.
- **Visual disable:** a companion `authBusy` **state** (set/cleared alongside the ref) exposed via
  context, driving the button in Login.jsx: `disabled={authBusy}` with a busy label
  (`"Creating account…"` / `"Logging in…"`). This also disables the Enter-key resubmit, since the form's
  `onSubmit` runs the same guarded `handleAuth`.
- **Both flows:** applies to **login and register** (founder said "login or register button"). Login
  double-submit can't duplicate an account, but the same lock removes the double request + error flash.

### Part B — Admin duplicate-email detector (founder chose "also add a detector")

A **read-only** owner-facing check that flags any two accounts sharing an email — also catches the one
*production* path that can still surface a same-email pair: someone soft-deletes (trash) then
re-registers the same email before the 30-day purge.

- **New read-only callable** `findDuplicateEmails` in [`functions/index.js`](../../functions/index.js),
  modeled on the existing `listUsers` (L1311) — **admin-claim-gated**, iterates `admin.auth().listUsers`
  pages up to the same 5000 cap, groups by **lowercased** email, and returns only emails with **≥2
  accounts**, each with minimal fields (`uid`, `email`, `tier`/`disabled`/`creationTime`). Auth is the
  source of truth for "how many accounts exist" (hard-deleted users are already gone; a soft-deleted one
  is still an Auth user, shown with `disabled: true` so the owner can tell which to remove). Read-only —
  no new write path.
- **Pure grouping helper** (unit-testable, e.g. `src/utils/…` or a functions helper): given a list of
  `{uid,email,…}`, return a map of `lowercased-email → [accounts]` filtered to `length ≥ 2`. This is the
  bit the test pins.
- **Admin UI:** a small read-only section/card (Overview or Users tab) — **"Duplicate emails: N"**,
  expandable to list each email and its accounts (uid, tier, created, disabled). The owner resolves via
  the **existing** delete/trash flow; the detector only *reads*. Admin is **light-paper only** — no
  dark-mode work. Scope any new CSS class under the admin root (grep before reusing a class name — the
  `.adm-note` / `.grid-auto` collision trap).

### Existing `mark` dupes (cleanup)

They're a local-emulator artifact. Clear them by resetting the emulator data — delete `./emulator-data`
(start empty) or delete it then `npm run seed` (reset to the 6-account baseline). No production concern;
no code needed for cleanup.

**Acceptance:**
- **A:** invoking `handleAuth` twice in the same tick calls `registerUser` **exactly once** (unit test
  with a mocked, slow-resolving `registerUser`); the button is `disabled` with a busy label during the
  await; same guard proven for login. Manual: rapid double-click Create Account in the emulator produces
  **one** account, not two.
- **B:** the pure grouping helper returns only emails with ≥2 accounts, **case-insensitively**, and
  excludes single-account emails (unit test); the `findDuplicateEmails` callable re-checks the admin
  claim and returns minimal read-only fields; the UI shows the count and the offending accounts.

**Security note (secure-by-design):** no new write surface — Part A is client-only UX + the existing
Auth constraint; Part B is one admin-gated read-only callable returning minimal fields. Both fit KISS.

**Status: PLAN ONLY — not built.** Approach + both founder decisions (client-lock-only, add detector)
are locked; awaiting the go-ahead to build.

---

## ADMIN-JOBS. Human-readable scheduled-job labels  (📋 PLAN — 2026-08-01; display-only, NOT built)

Founder ask (2026-08-01): the admin **Overview → System status strip** lists each scheduled job by
its raw JavaScript name (`refreshPrices`, `purgeOldAudit`, …). Show clear 1–2-word English labels
instead. Display-only; the jobs themselves don't change.

**Key constraint (why this is add-a-label, not rename):** a job's `name` is *also* its heartbeat
storage key — `runJob("refreshPrices", …)` stamps `health/jobs`, and `SCHEDULED_JOBS`
([`functions/index.js`](../../functions/index.js) ~L1409) is keyed by it. Renaming the key would
orphan the existing heartbeat docs, break the `getSystemStatus` mapping, and touch every `runJob()`
call site. So we **add a friendly display label and keep `name` as the stable internal key.**

**Approach (KISS, recommended):** a single client-side source map in
[`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) —
`JOB_META[name] = { label, description }` — rendered at the `j-name` span (~L454) as
`JOB_META[j.name]?.label || j.name`, with `description` driving the hover tooltip (below). Purely
presentational, lives only in the admin bundle, **zero backend change, no data migration.** (Alt
considered: add `label`/`description` to the server `SCHEDULED_JOBS` and return via `getSystemStatus`
— one server source of truth, but it changes the callable's response shape. Deferred — presentation
belongs client-side.)

**Confirmed labels + hover descriptions** (founder-approved 2026-08-01 — the "Suggested" set):

| Internal name (heartbeat key — unchanged) | Label | Hover description ("what it actually does") |
|---|---|---|
| `refreshPrices` | **Prices** | Refreshes market prices for the top ~1,300 coins. Runs every 5 minutes. |
| `refreshUniverseDaily` | **Coin list** | Refreshes the full ~3,000-coin catalog and removes delisted coins. Runs once a day. |
| `purgeOldAudit` | **Audit cleanup** | Deletes admin audit-log entries older than 365 days. Runs once a day. |
| `captureDailyStats` | **Daily stats** | Saves a daily snapshot of user and growth numbers. Runs once a day. |
| `purgeExpiredTrash` | **Trash cleanup** | Permanently deletes accounts left in trash past the 30-day window. Runs once a day. |
| `enforceSubscriptionPeriods` | **Billing sync** | Downgrades a user's tier when their paid subscription period ends. Runs once a day. |

**Hover tooltip behavior (founder spec 2026-08-01):**
- **Trigger:** hovering a job **name**. A `mouseenter` starts a **2-second** timer; the description
  box appears only after the pointer rests on the name for 2s.
- **Cancel:** if the pointer leaves before 2s, the timer is cleared and nothing shows.
- **Dismiss:** on `mouseleave` the box hides immediately. Only the hovered name's box shows (one at a time).
- **Why custom, not the native `title`:** the browser controls the native `title` delay (not reliably
  2s) and it can't be styled, so this needs a small **custom tooltip** (a JS timer + a positioned box).
  This increment therefore also **removes the existing native `title` on the job row** (~L452) so the two
  don't both pop; any failing/late/error detail folds into the same custom box, so no status info is lost.
- **Positioning:** the box sits just above/below the name and must not clip at the strip's edges.
- **Accessibility (production-ready):** also reveal on **keyboard focus** of the name (hide on blur /
  `Esc`); under `prefers-reduced-motion` show it without a fade. Admin is light-paper only — no dark-mode work.

**Acceptance:** both `label` and `description` are **enumerated from `SCHEDULED_JOBS`** in a unit test
(not a hand-kept list), so adding a 7th job with no label/description fails the build — the same
"enumerate from source" guard used elsewhere; the tooltip appears ~2s after hover and hides on leave;
keyboard-focus reveal works; no double-tooltip.

**Status: PLAN ONLY — not built.** Labels + tooltip spec are locked; awaiting the founder's go-ahead to build.

---

## DEVEX. Persistent emulator seed accounts  (✅ BUILT 2026-07-25)

Dev-only quality-of-life: the seeded emulator accounts used to die on every restart (in-memory
emulator → `re-seed each start`). Now they **persist across restarts** via Firebase's emulator
import/export, scoped to a **git-ignored `./emulator-data`** (never committed, never deployed —
founder chose machine-local over a committed baseline).

- New **`npm run seed`** (stack stopped) brings up auth+firestore, runs `functions/scripts/seed-emulator.js`,
  and **exports** the snapshot to `./emulator-data`.
- **`start:all`** now runs **`scripts/dev-stack.js`** — a tiny cross-platform launcher that **imports**
  `./emulator-data` when it exists and **always `--export-on-exit`**. `--import` is added *only* when the
  folder exists, because `firebase --import=<missing dir>` hard-fails (first run / fresh clone starts
  empty and says so). The pure arg-builder is unit-tested (`tests/unit/dev-stack.test.js`).
- `.gitignore` excludes `emulator-data/`. Reset-to-baseline = re-run `npm run seed`; start-empty = delete
  the folder. The direct `node functions/scripts/seed-emulator.js` still seeds a *running* stack.
- Verified live: `npm run seed` exported all 6 accounts + firestore; a fresh `npm run start:all` logged
  `Importing accounts from …/emulator-data/auth_export/accounts.json` and came up with them present —
  persistence across restarts proven. 842/842 unit green (incl. the new test); docs swept (README,
  CLAUDE.md, `emulator-dev-stack.svg` + diagrams index). Commit `071b290`.

---

## ADMIN-UI. Admin panel mockup match — unified chrome (UI-1) + card/tab/sizing fidelity (UI-2)  (✅ BUILT — 2026-07-25)

Canonical: [`docs/design/ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) (mockup→code spec + file
map + acceptance criteria). Reference mockup: [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html).
**✅ BUILT 2026-07-25** (design-only) — founder interview 2026-07-25 locked: back button on **every
drill-in AND every popup/modal**; **reskin** the sign-in / denied / loading screens too; card/tab/sizing
fidelity across the **whole panel** while **keeping the current responsive breakpoints**. Shipped as one
CSS pass (UI-1 + UI-2 together). Distinct from §ADMIN (that is *capabilities* ADMIN-0…5, all built) —
this is the *visual chrome*.

**Root cause of the reported overlap:** two brand headers both `position:sticky; top:0` collide — the
outer grey/purple shell bar (`admin-main.jsx` `ok` `<header>`, z-index 10) and the inner paper
`.adm-head` (`admin-dashboard.jsx`, z-index 20). Fix = collapse to **one** sticky bar.

- [x] **ADMIN-UI-1 · Unified chrome** (🟡 design · founder 2026-07-25 · **✅ BUILT 2026-07-25**) — Merge the two
      headers into **one** sticky bar (green logo tile + `CryptoIdea · Admin` left; email + Log out
      right), styled paper with an opaque/blur bg so it's the **only** pinned element. Add a **persistent
      `Admin dashboard` `<h1>`** below the bar (same on every tab + drill-in) with the **Live Data pill
      moved beside it** (out of the deleted `.adm-head`). Because the H1 is normal-flow content under an
      opaque bar, it can never overlap the bar on scroll. Standardize the mockup's **white rounded `‹`
      back button** on every drill-in (already present via `<DHead>` — restyle) and add/relocate a
      consistent close on the two modals (unlock = Cancel-only today; view-as ‹ is on the wrong side).
      **Reskin** sign-in/denied/loading to paper + logo tile (drop the `#6C5CE7` purple). Files:
      `src/admin-main.jsx` · `src/components/admin-dashboard.jsx` · `src/styles/admin-settings.css` ·
      `admin.html` · `tests/unit/admin-dashboard.test.jsx`. **Design-only** (no callable/rule/logic
      change); admin stays light-paper-only (no dark mode). DoD: one sticky bar, no overlap, H1 on every
      view, back-nav everywhere, no purple; `test:unit` green + `build` clean + browser-verified owner &
      manager, mobile & desktop.

- [x] **ADMIN-UI-2 · Card / tab / sizing fidelity** (🟡 design · founder 2026-07-25 · **✅ BUILT 2026-07-25**) — Make
      the panel's **cards, category (tab) bar and sizing** match the mockup pixel-for-pixel. Interview
      (2026-07-25) locked **all** of it: match spacing/density **+** typography **+** content width;
      **pill-card look on ALL card surfaces** (stat tiles, content panels, Users/Audit rows, Settings
      panels, modals); **whole panel** (every tab/drill-in/modal); **keep the current responsive
      breakpoints** and stacking (mockup is desktop-only — restyle only). Measured targets: active tab
      **near-black `--ink` → green `--accent` (#0a6b4d, already a token — no new hex)**, 13→14px; cards →
      **22px** radius + faint 0.8px border + soft 2-layer shadow + 20–24px pad, from **one** shared
      `--adm-card-*` token set; card titles sentence-case 13/700; shell **1040 → 1140px** (≈680px columns);
      H1 34px. Files: `src/styles/admin-settings.css` (the bulk) · `src/components/admin-dashboard.jsx`
      (class normalising only, no logic) · `tests/unit/admin-dashboard.test.jsx`. **Design-only** (no
      callable/rule/logic change); light-paper only; **no new dependency**. Naturally the **same build as
      ADMIN-UI-1** (same two files, same mockup). Spec: [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md)
      §8. DoD: green active tab, one card-token set on every surface, 1140px shell, no overflow at 375/768,
      light-paper only; `test:unit` green + `build` clean + browser-verified owner & manager, mobile &
      desktop.

- [x] **ADMIN-UI-3 · Mockup-match refinements** (🟡 design · founder 2026-07-25 · **✅ BUILT 2026-07-25**) —
      A second founder pass over the shipped panel against [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html),
      five items. Spec + as-built notes: [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §9.
      Items 1–3 were real gaps (fixed); 4–5 already structural (confirmed by a live owner+manager sweep).
      Verified: admin `test:unit` 66 (+2) green · `build` clean (no-names guard) · browser owner+manager,
      desktop 1280 + mobile — logo/Log-out at the bar edges over a 1140-centered body, Overview cards
      160/160/160 equal (stack on mobile), tier seg==legend per tier, bordered card + `‹` on every
      drill-in/second screen.
      **Design-only** (no callable/rule/handler/logic change); light-paper only; **no new dependency**;
      **no new hex** (reuses `--amber #b8841f`, `--accent-ink #07503a`, existing premium `#7d4bbf`); keep
      the current responsive breakpoints (mockup is desktop-only — restyle only). Files:
      `src/styles/admin-settings.css` (bulk) · `src/components/admin-dashboard.jsx` (one grid class + the
      tier legend colours) · `tests/unit/admin-dashboard.test.jsx`.
    - **1 · Full-bleed header bar.** The bar is capped at `max-width:1140px` centered (`admin-settings.css`
      `.adm-bar-inner`), so on desktop the logo + Log-out sit *inset*. Match the mockup's full-bleed header
      (`padding:13px 28px`, no max-width): drop the inner cap so the **logo hugs the left edge and Log out
      the right edge**, while the `.adm-shell` body (H1 · tabs · cards) stays 1140-centered. Mobile
      unchanged.
    - **2 · Overview cards equal size.** "Est. Monthly Revenue" / "Combined Usage" / "Tier Breakdown" are
      equal *width* (auto-fit `1fr`) but unequal *height* — the shared `.grid-auto` uses `align-items:start`
      and the revenue card is taller. Give this one row an **admin-only class** (leave shared `.grid-auto`
      untouched — the user app's Research grid uses it) with `align-items:stretch` so all three match the
      tallest. Founder wants them **equal** (not the mockup's `1.15fr 1fr 1fr`). Keep the mobile 1-column
      collapse.
    - **3 · Tier-breakdown colours connect.** Each tier's **bar segment fill and its legend label must be
      one colour**. Today the legend spans use separate literals from `TIERS[key].bar`, and **Pro** drifts:
      bar `#0a6b4d` (`--accent`) vs legend `#07503a` (`--accent-ink`). Drive the legend from the same
      per-tier colour as the bar and set Pro to `--accent-ink #07503a` (the mockup's legend green). Starter
      `#b8841f` + Premium `#7d4bbf` already match. Zero new hex.
    - **4 · Border + `‹` back on every settings sub-screen.** The API-keys screen's bordered card + `‹`
      back is the reference. **Verification sweep** — code review shows every settings drill-in already
      renders `<DHead>` (the `‹`) inside a `.card` (bordered since ADMIN-UI-2); the build browser-checks all
      7 sub-screens (apiKeys · email · plans · ai · analytics · announcement · access) and fixes any that
      render content outside a bordered card or lack the `‹`.
    - **5 · Border + `‹` back on the user detail + all second screens.** Same reference on the Users
      drill-in and every other "second" screen. Also already structural (`<DHead>` + `.card` on the user
      detail; the two modals got their close controls in ADMIN-UI-1). Build sweeps the user detail · Trash
      confirmations · unlock & view-as modals and corrects any outlier.
    - **DoD:** logo/Log-out at the desktop edges; the three Overview cards equal height; each tier's bar +
      legend one colour; a bordered card + `‹` on **every** drill-in/second screen; `test:unit` green +
      `build` clean + browser-verified owner & manager, mobile & desktop; light-paper only.
- [x] **ADMIN-UI-4 · Visible back button + bordered header on every second-screen** (🟡 design · founder
      2026-07-25 · **✅ BUILT 2026-07-25** — new `DScreen` primitive; retired `DHead`; verified owner desktop
      1280 + mobile 375, 67 admin tests green, build clean; as-built [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §10) — The real fix behind ADMIN-UI-3 items 4/5, which only
      confirmed the `‹` **existed in the DOM**, not that it was **visible**. On every admin second-screen the
      shared `.icon-btn` renders `background:none; border:0; padding:0` (`app.css`), so the back `‹` is a bare
      borderless chevron floating above the card — reads as *no back button* — and the title has **no bordered
      header** (it sits as a lone line above a card whose first line repeats it; API-keys shows "API keys"
      twice, no border, no visible back). **Founder chose (2026-07-25): header attached to the card** like
      [`docs/mockups/admin-panel`](../mockups/admin-panel/index.html) — the `‹` in a **34×34 bordered box** +
      the **centered title** in a **white header row at the top of the screen's card with a divider under
      it**, then the body; the duplicate in-card title dropped so the title shows once. Main tabs
      (Overview/Users/Trash/Settings/Audit) untouched — **second screens only**. Scope: the **7 Settings
      sub-screens** (apiKeys · email · plans · ai · analytics · announcement · access) + the **Users →
      user-detail** drill-in + the **view-as** popup. **How (KISS · admin-scoped · design-only · no new
      hex):** a tiny `DScreen({title,onBack,children})` primitive (beside `DHead`) = one `.card` with a
      bordered `.adm-scr-head` (the `‹` box + centered `.dh-title` + `border-bottom` divider) over an
      `.adm-scr-body`; admin-only CSS under `.ci-app.adm-root` (leave the shared `.icon-btn`/`.detail-head`
      untouched so the **user app's** chevrons don't change); convert the 6 single-card settings screens + the
      user-detail card to `DScreen` (drop the duplicate `.card-title`, keep `.card-sub`), remove the shared
      `<DHead>`; wrap multi-card **Admin access** in `DScreen` with its inner cards demoted to
      divider-separated sections (no card-in-card); give the view-as modal the same bordered `‹`. Spec:
      [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §10.
    - **DoD:** every second-screen shows a bordered `‹` box + a bordered/divided header with the title once;
      no bare chevron anywhere in the admin; main tabs unchanged; `test:unit` green (existing "Back" /
      "Save keys" / "CHANGE TIER" assertions still pass) + a new bordered-header case · `build` clean ·
      browser-verified owner & manager, desktop + mobile; light-paper only, no new hex, no new dependency.

- [x] **ADMIN-UI-5 · Match the mockup's card + text SIZE (Overview bigger, Settings smaller)** (🟡 design ·
      founder 2026-07-25 · **✅ BUILT 2026-07-25** — Overview 38/30/26px + 30px pad via a `.adm-ov-screen`
      scope, Settings 18px `DScreen` body; build-time fix: `.adm-mini` is shared with the user-detail so the
      bumps are Overview-scoped; as-built [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §11) — Founder: the mockup's cards
      and text are **bigger** than the live panel; apply the mockup's sizing to the admin panel, **except
      Settings, where the cards should be SMALLER**. **Verified — founder is right.** ADMIN-UI-2 matched the
      card *chrome* (22px radius, .8px border, shadow) but kept the pre-mockup **padding (22px)** and the
      smaller **type scale**. Measured from the mockups (values are inline styles in the bundled files):
      **Overview — grow to match [`admin-panel`](../mockups/admin-panel/index.html):**
      | Element (CSS) | Live now | Mockup | Δ |
      |---|---|---|---|
      | Card padding (`--adm-card-pad` / `.adm-root .card`) | 22px | **30px** | +8 |
      | Stat-tile number (`.adm-stat .n`) | 30px | **38px** | +8 |
      | Stat-tile label (`.adm-stat .l`) | 9.5px | **11px** | +1.5 |
      | Revenue value (`.adm-kv .v`) | 22px | **30px** | +8 |
      | Usage-mini number (`.adm-mini .n`) | 22px | **26px** | +4 |
      | Card radius | 22px | 22px | already match |
      **Settings — shrink to match [`admin-settings`](../mockups/admin-settings/index.html):** setting cards
      **padding ~18px** (vs Overview's new 30px), text already ~13/11.5px. The blocker: **all admin cards
      currently share one `.ci-app.adm-root .card { padding:var(--adm-card-pad) }`** — so the fix must *split*
      the sizing (Overview/data cards big, Settings drill-in cards small), not bump the one shared token. Also
      **overlaps [[ADMIN-UI-4]]** (both restyle the Settings drill-in cards) — sequence UI-4 → UI-5, or fold
      Settings sizing into UI-4's `DScreen`. **How (KISS · admin-scoped · design-only · no new hex/dep):** bump
      the Overview values above in `admin-settings.css` (or a per-surface pad token); give Settings cards a
      smaller pad variant. **Founder decided (2026-07-25):** (1) **Overview only** — Users/Trash/Audit list
      rows keep today's dense sizing (no stat cards there to enlarge); (2) **match the mockup exactly** —
      `.adm-stat .n` 30→**38px**, `.adm-stat .l` 9.5→**11px**, `.adm-kv .v` 22→**30px**, `.adm-mini .n`
      22→**26px**, Overview card padding 22→**30px**; (3) **Settings cards shrink to the settings mockup's
      ~18px padding** (text already ~13/11.5px). Because the pad token is shared, introduce a **per-surface pad**
      (Overview 30px / Settings 18px) rather than moving the one `--adm-card-pad`. Spec:
      [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §11.
    - **DoD:** Overview stat/value cards render at the mockup scale (38/30/26px, 30px pad); Settings drill-in
      cards visibly smaller (~18px pad); Users/Trash/Audit unchanged; `test:unit` green · `build` clean ·
      browser-verified owner & manager, desktop + mobile; light-paper only, no new hex, no new dependency.

- [ ] **ADMIN-UI-6 · Header typography fidelity** (🟡 design · founder 2026-07-26 · **📋 PLAN ONLY — not built**;
      spec [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §12) — Founder: in the top bar the
      **`CryptoIdea` wordmark** is smaller than the mockup **and in the wrong font**, the **`· Admin`** sub is
      too small, the **`Log out`** button is too small + too round, and the **email** is too small. Measured
      vs. [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html) (founder is right on all):
      **key finding — the wordmark was built in Fraunces *serif* (`--display`) but the mockup uses Hanken
      *sans* (`--body`).** Targets (mockup, measured): wordmark **sans 18px/600** (was serif 17/500); `· Admin`
      **18px/500** (was 12/600); `Log out` **radius 12px, pad 9×16, 13px/700** (was pill 999px, 7×14, 12.5/600);
      email **13px `--ink-soft`** (was 12.5 `--ink-faint`). **One open decision:** the serif→sans wordmark swap
      is the most visible change — plan recommends sans (mockup); founder can keep serif + only resize. **How
      (KISS · one file · no new hex/dep):** restyle `.adm-brand-txt` / `.adm-sub` / `.adm-logout` / `.adm-email`
      in `src/styles/admin-settings.css` (every target maps to an existing token); no JSX/logic change; keep the
      responsive `clamp` on the bar padding. **DoD:** wordmark sans 18/600 (or confirmed choice), `· Admin`
      18/500, `Log out` 12px-radius 13/700, email 13px `--ink-soft`; `test:unit` green · `build` clean ·
      browser-verified owner, desktop 1280 + mobile 375 (no overflow); light-paper only, no new hex, no new
      dependency.
- [ ] **ADMIN-UI-7 · Overview card fidelity (padding + Tier-breakdown pill)** (🟡 design · founder 2026-07-26 ·
      **📋 PLAN ONLY — not built**; spec [`ADMIN-UI-REDESIGN.md`](../design/ADMIN-UI-REDESIGN.md) §13) — Founder,
      on the Overview screen: (1) the **cards have too much empty space** — content should "use more of the card,"
      and (2) the **Tier-breakdown bar** colours should **connect** like the mockup. Measured vs.
      [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html) (founder is right on both).
      **Two key findings:** (a) the Overview cards are padded **`30px`** (ADMIN-UI-5) but the **mockup is `20px`**
      (Plan limits `20px 24px`) — tighten to 20px so content fills the card (the big 38/30/26px text is
      unaffected); (b) the tier bar's segment **colours already match the mockup exactly** — the only difference
      is the **shape**: current `border-radius:8px` (rectangle) vs the mockup's **`999px` pill**, so making the bar
      a full pill is the entire "connect" fix (**no colour change**). Also: usage mini-tiles → radius `14px`
      (`--radius-sm`), gap 10, label 10px — **scoped under `.adm-ov-screen`** because `.adm-mini` is **shared with
      the user-detail drill-in** (grep-before-bump, the ADMIN-UI-5 trap). **How (KISS · one file · no new hex/dep):**
      edit `.adm-ov-screen .card` / `.adm-tierbar` / `.seg` / `.adm-legend` + scoped `.adm-mini` in
      `src/styles/admin-settings.css`; no JSX change (unless a Plan-limits hook class is added). **One judgement
      call:** card padding 20px (exact mockup, recommended) vs a 24px middle ground. **DoD:** cards 20px (content
      closer to edge, big text unchanged), tier bar a 999px pill (tiers read as one connected band), drill-in tiles
      unchanged; `test:unit` green · `build` clean · browser-verified owner desktop 1280 + mobile 375
      (`getComputedStyle` padding/radius); light-paper only, no new hex, no new dependency.
- [ ] **ADMIN-UI-8 · Settings screens match the mockup (width + header size + cream headline)** (🟡 design ·
      founder 2026-08-01 · **📋 PLAN ONLY — not built**) — Founder, comparing the live Settings drill-ins to the
      mockup: Settings should be the **mockup's size**, and each drill-in **headline** (e.g. "API keys") should
      sit on the **mockup's cream/paper background**, not white. *(Note: the founder referenced
      [`docs/mockups/admin-panel`](../mockups/admin-panel/index.html), but the Settings **detail** screens with
      "API keys" live in [`docs/mockups/admin-settings/index.html`](../mockups/admin-settings/index.html) — the
      documented 1:1 source these were built from — so that is the fidelity target.)*
      **Founder decisions (AskUserQuestion 2026-08-01):** (1) **size = BOTH** — contain the width AND bump the
      header title; (2) **headline background = cream/paper** (`--paper` #f8f7f3); (3) **keep the current
      single-card `DScreen` structure** ([[ADMIN-UI-4]]) — restyle only, no revert to the mockup's
      floating-header layout.
      **Measured gaps (live vs mockup):** drill-in header title **16px → 19px/500** (mockup `.dh-title`); header
      band **white → cream `--paper`** (the mockup floats the headline on the paper frame); the drill-in
      **stretches to the 1140 shell** on desktop → **contain it** (the mockup is a tidy column). Body card padding
      already matches (both 18px).
      **How (KISS · admin-only · design-only · no new hex/dep):** in
      [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) — (a) add a **Settings-tab wrapper**
      `.adm-settings-screen { max-width:560px; margin:0 auto }` (560px = the app's existing form/detail shell
      width, so it's a mockup-tidy column, not a new magic number), applied to the Settings tab container in
      [`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx); (b)
      `.adm-settings-screen .adm-scr-head { background:var(--paper) }` (keep the `border-bottom` divider);
      (c) `.adm-settings-screen .adm-scr-head .dh-title { font-size:19px; font-weight:500 }`.
      **⚠️ Scope every rule under `.adm-settings-screen`, NOT the bare `.adm-scr-head` / `.dh-title`** — those are
      **shared with the user-detail drill-in** in the Users tab (the same grep-before-bump trap as
      [[ADMIN-UI-5]]'s `.adm-mini`); Overview/Users/Trash/Audit and the user-detail header must stay
      byte-for-byte.
      **One judgment call:** contained width **560px** (app form width, recommended) vs a roomier 600–640px.
      **DoD:** Settings drill-ins render contained (~560px, centered) with a **19px cream headline band**, body
      stays white; **other tabs + the user-detail drill-in unchanged** (`getComputedStyle` on `.dh-title` size +
      `.adm-scr-head` background in BOTH a Settings screen and the user-detail); `test:unit` green · `build` clean ·
      browser-verified owner desktop 1280 + mobile 375; light-paper only, no new hex, no new dependency.

## ADMIN. Admin-panel research audit + build plan  (📋 PLAN — 2026-07-18; not scheduled)

Canonical: [`ADMIN-PANEL-AUDIT.md`](../decisions/ADMIN-PANEL-AUDIT.md) (scored gap-audit vs. external
best practice + cited sources + phased plan). A limited-but-grounded pass (4 read-only research agents
over React-Admin / Refine / AdminJS / Stripe / PayPal / PostHog / OWASP / Auth0 / WorkOS / LaunchDarkly
/ Unleash / Sentry docs + OSS repos, then a synthesis cross-referenced against the code). **Nothing
built** — this is the plan; each item runs the full §PROCESS interview+sweep when scheduled. Composes
with §BL (admin capabilities), §4 go-live (MFA/App Check), §C (config/kill-switches), §U (settings) —
does not duplicate them. Score of the gaps: **2 critical · 7 high · ~13 medium · ~12 low**. The panel
is already strong (isolated `/admin`, soft-delete/trash, real audit log, editable server config,
aggregate-only privacy views); gaps cluster in **billing-ops visibility, observability, audit depth,
growth metrics**. Recurring win: most valuable gaps are cheap because they extend existing patterns
(`config/app.flags` → kill-switches + announcement; `webhookEvents` → webhook health; `getStats` →
trend snapshots). Phases (KISS-first, most valuable first):

- [x] **ADMIN-SEC · Admin roles, owner protection & sensitive-area re-auth** (🟠 high · security ·
      founder 2026-07-18 · **✅ BUILT 2026-07-18** — `8c7ea66` server · `9e1b1d4` rules · `3aa3de0`
      client · `485bb5b` fix. Verified: 527 unit · 36 rules · **35/35 live role probes** on the
      emulator · build clean · browser-checked as owner and as manager. Two extra holes found and
      closed during the build, beyond the original spec: a manager could bypass every callable wall
      by writing Firestore straight from devtools (rules were role-blind), and could lock both owners
      out by **suspending** them while the admin count still read ≥2. Owner-target protection now
      covers tier/limits/suspend/sign-out/trash/delete. 📋 Follow-ups: **run
      `set-admin.js <email> --role=owner` for both real owner accounts before any deploy** — until
      then they are legacy role-less admins and Settings will refuse them; back up the
      service-account key (it is the only way to mint an owner); true MFA stays §ADMIN-0.) —
      closed the **owner-deletion bypass** (promote
      sock-puppets → delete the real owners while count stays ≥`MIN_ADMINS`). Split admin into two
      claim roles: **owner** (`role:"owner"`, set **only** by `set-admin.js`, un-deletable/un-demotable,
      2 accounts) and **manager** (`role:"manager"`, granted by an owner, **accounts-only, no
      settings**). **Remove grant-admin from the Users tab**; add an **owner-only "Admin access"** area
      to add a manager via **email search → type email twice → warning → owner password**. Password gate
      = a **~10-min unlock** (`reauthenticateWithCredential`); the real control is server-side
      (sensitive callables require `role:"owner"` **+ fresh `auth_time`**) on **Settings / API keys /
      Plans & pricing / grant-manager**. Managers can't see Settings, Admin access, permanent purge, or
      any grant control (UI-hidden **and** callable-denied). Absorbs the old RBAC + step-up-reauth audit
      rows; MFA stays §ADMIN-0/§4. Spec + role matrix + file map:
      [`ADMIN-PANEL-AUDIT.md`](../decisions/ADMIN-PANEL-AUDIT.md) § Admin roles. **Build before the
      design items** — it overrides three areas of the ADMIN-D2 mockup and adds the unlock gate to
      Settings, so reskinning first means drawing those screens twice. Local-first / emulator-
      verifiable; runs the §PROCESS interview+sweep (Admin map row) when built.
- [x] **ADMIN-0 · Launch gate** (🔴 critical · **✅ BUILT 2026-07-24** — everything that can be built
      before a real Firebase project exists) — admin **MFA/2FA** + **App Check** enforcement +
      `beforeCreate` **hard signups-off** + make the `audit` collection **append-only** in rules.
      **✅ BUILT 2026-07-24 (this session), item by item — two of the four turned out to be different
      jobs than the backlog line described:**
      1. **`beforeCreate` hard signups-off — BUILT and emulator-verified.** `exports.beforeCreateUser`
         (v1 `functions.auth.user().beforeCreate`) runs inside account creation, the only place the
         answer is authoritative: the toggle was a client gate, and
         `createUserWithEmailAndPassword` talks straight to Firebase Auth. The verdict is a pure,
         unit-tested `signupDecision()` (`functions/signup-gate.js`), reading `config/app` **FRESH**
         (not `getConfig()`'s 5-min cache — an enforcement point must not lag its own switch).
         **FAIL OPEN by founder decision:** an unreadable config ⇒ ALLOW, mirroring ADMIN-2's
         default-ON rule; a Firestore blip must never silently kill the signup funnel. ⚠️ **Deploying
         it needs Identity Platform on the project** — see §4 go-live.
      2. **`audit` append-only in rules — ALREADY SATISFIED; the backlog line was wrong.**
         `firestore.rules` already has `allow read, write: if false`, which is *strictly stronger*
         than append-only. Rules can never make it append-only against the only writer that matters
         (**the Admin SDK bypasses rules entirely**), and loosening to `allow create` would be a pure
         downgrade. Real tamper-evidence is the **single-writer choke point**: `audit` is touched in
         exactly three places (add/read/expire), now pinned by a source-scan test. A rules test was
         added for client WRITES (previously only reads were covered).
      3. **Admin MFA — the server-side gate is BUILT (default OFF); enrolment stays infra.**
         `guards.requireMfa` reads `firebase.sign_in_second_factor` off the verified token and hangs
         off the shared `assertRole`, so it covers **every** admin callable rather than being
         sprinkled per-endpoint. Flag `config/app.flags.requireAdminMfa`, surfaced as an **armed**
         (two-step) switch in Settings → Admin access. Go-live becomes a flag flip, not new auth code
         written under launch pressure. ⚠️ Turning it on with nobody enrolled locks every admin out of
         the panel *including this switch* — recovery is editing the flag in the Firebase console,
         stated in the UI warning itself.
      4. **App Check — NO CODE, by the standing GO-LIVE-AUDIT H1 decision** (console-only; wiring
         `appCheckOk` into callables duplicates a platform control and adds a second lockout surface).
         Re-confirmed with the founder this session rather than quietly re-litigated.
      **Structural change:** `assertAdmin`/`assertManager`/`assertOwner` are now **async** (the MFA
      flag is a Firestore read) and all 15 call sites `await` them. A missing `await` returns a truthy
      Promise and never throws — an open endpoint that still *looks* gated — so
      `tests/unit/admin-0-guards.test.js` fails the build on any un-awaited gate (negative-tested).
      Verified: **796/796 unit** (70 files, +36) · **42/42 rules** (+1) · **19/19 integration** · build clean ·
      admin-only code out of the user bundle. Probed live on the emulator: with signups paused a
      registration returned 400 and **no Auth account was created**, the Admin SDK (seed script) was
      **not** blocked, and signup still worked with `config/app` deleted entirely. Admin 2FA enforced
      live → every admin callable refused a password-only owner with an honest reason, and the console
      escape hatch restored the panel.
- [x] **ADMIN-1 · Billing-ops visibility** ⭐ (🟠 high · **✅ BUILT 2026-07-24**) — persist (if not already)
      + show the PayPal **subscription id + status** (`active`/`past_due`/`paused`/`canceled`) on the user
      card; a **past_due / canceled** filter; a **webhook-health** list (recent `webhookEvents` +
      last-processed + gaps). **Read-only** — cancels/refunds stay in the PayPal dashboard for now. Biggest
      new value.
      **✅ BUILT 2026-07-24 (this session):** **no new storage** — the sub id (`paypalSubscriptionId`) +
      the `subscription` marker were already server-persisted, so status is **derived** by a pure
      `billing.billingStatusOf(userData)` → `active` / `past_due` / `canceled` / `none` (precedence:
      paymentFailed > cancelled > paid-tier > free; **PayPal SUSPENDED folds into `past_due`** — there is
      no separate persisted "paused" state, noted so it isn't re-litigated). `lookupUser` + `listUsers`
      now return the derived `billingStatus` (lookupUser also returns `paypalSubscriptionId` / `subEndDate`
      / `subDowngradeTo` / `lastPayment`); a **new read-only callable `listWebhookEvents`** (`assertAdmin`,
      clamp 1–200) surfaces the `webhookEvents` ledger. UI: the user-detail card gained a **Billing**
      section (status pill + sub id + cycle + renews/ends date), the Users list gained a **past-due/canceled
      filter + a per-row status dot**, and the **Overview** gained a **"Billing & webhooks"** card (last
      processed + freshness dot + events by type + recent list; an empty list is the expected pre-launch
      state, never an error). **Read-only — no write/mutation path added; `webhookEvents` stays server-only
      (the callable reads via the Admin SDK).** Files: `functions/billing.js` (+ the pure
      `billingStatusOf`, unit-tested), `functions/index.js` (fields + the new callable), `src/api/admin.js`,
      `src/hooks/useAdminDashboard.js`, `src/components/admin-dashboard.jsx`, `src/styles/admin-settings.css`
      (admin-only `adm-billing`/`adm-wh-*` classes, verified out of the user bundle). Verified: **563/563
      unit** (11 new) · build clean · admin CSS out of the user bundle · **browser-checked live as owner**
      (patched a canceled-premium + past-due-pro user + 3 webhook events → the Overview card, list dots,
      Past-due filter, and detail Billing section all render correctly, 0 console errors).
- [x] **ADMIN-2 · Operational safety net** (🟠 high · **✅ BUILT 2026-07-24**) — **per-feature kill-switches**
      (extend `config/app.flags` with a `features:{}` map, read via the existing `/api/config` path) + wire
      **Sentry** + a cron monitor + a tiny status strip in Overview. Failure visibility via external tools,
      not a hand-built dashboard.
      **✅ BUILT 2026-07-24 (this session).** Founder decisions: switch set = **money/upstream only**
      (`marketData` · `checkout` · `aiResearch`, not per-tab); "off" for market data = **serve cache, stop
      upstream** (not a hard 503 — a switch you're afraid of is a switch you won't flip); Sentry
      **functions-side only** behind a DSN in Settings; the cron monitor = **heartbeat doc + derived signals**.
      - **Kill-switches** (`functions/features.js`, pure + unit-tested). **A switch is ON unless config says
        exactly `false`** — a missing key, a legacy config, or a failed Firestore read must degrade to a
        WORKING app; a kill-switch may only ever fire because a human flipped it. Declared in ONE map that the
        admin UI, `/api/config` and the sanitiser all enumerate from, so a switch can't be half-wired.
      - **Enforced at ONE choke point.** All five direct `` fetch(`${CG_BASE}…`) `` sites now route through
        `cgFetch()`; a test fails the build if a direct call reappears — sprinkling the check would let a
        sixth site added later bypass it silently. **Off = zero upstream calls**, caches still serving.
        `getUniverse`/`getTrending` also skip their lazy refresh, because `refreshUniverse` treats a failed
        first page as *partial* and would still write `updatedAt: now`, stamping the cache fresh having
        fetched nothing. `createSubscription` refuses server-side; the UI additionally disables the CTAs.
      - **The omitted-`features` trap, found while building:** the instant maintenance/signups toggles post
        `flags` WITHOUT `features`, which under a plain sanitise reads as "everything ON" — so flipping
        maintenance mid-incident would have silently restarted the spend you had just killed. Fixed with a
        per-key `mergeFeatures` (an unmentioned switch is KEPT), pinned by unit tests and proven live.
      - **Cron heartbeats** (`health/jobs`, server-only in rules — **integrity**, not confidentiality: a
        client that could stamp a heartbeat could keep a dead cron looking alive). Every scheduler runs
        through `runJob()`, which records the heartbeat **and still rethrows** so H3 (fail loudly) holds. A
        deliberate kill-switch skip stays GREEN with a stated reason — a switch you flipped must not page you.
      - **Overview status strip** (`src/utils/status.js`, pure + unit-tested): never / overdue / failing /
        ok per job + the named switched-off features + cache age + `sentryConfigured`. **A job with no record
        reads "never", never a reassuring blank**, and a failed status load shows the error instead of a false
        all-clear (the BL-1e error-vs-empty rule).
      - **Sentry: functions-only**, DSN in Settings (`keep()`-guarded, added to `SECRET_PATHS`). Zero user-bundle
        weight, no CSP change, and with no DSN it never even `require()`s the SDK. Events carry no uid, email,
        URL, headers, cookies or body. ⚠️ **Delivery is UNVERIFIED** — no Sentry account or deployed project
        exists; only the no-op path, DSN validation and scrubbing are proven locally.
      - **`getSystemStatus` reads config FRESH**, not through the 5-min `getConfig()` cache — caught live:
        the strip reported "All features on" while market data was actually off. A status view must not lag
        the thing it reports on.
      - **NOT built (deliberate):** the external half — a Sentry account/DSN, an uptime monitor, and the 2–3
        alert rules. All three need a deployed project and a paid-plan decision; they stay **go-live infra**.
      - Verified: **760/760 unit** (68 files, +76) · **41/41 rules** (+1) · **19/19 integration** · build clean ·
        admin-only code + CSS confirmed out of the user bundle and **no Sentry SDK in any client chunk** ·
        **server enforcement probed live** (marketData off → cache served with `cache/universe.updatedAt`
        UNCHANGED, i.e. no upstream refresh; `createSubscription` → 400 "Checkout is temporarily unavailable"
        for an authenticated caller) · browser-checked as owner (all four job states rendered at once,
        including a real `universe 429` failure and a `skipped — marketData off` note; flipping a switch in
        the UI preserved the other switches) and as a Pro user (`● PAUSED` on all five tab headers, upgrade
        CTA refused with an honest toast).
      - 📋 Follow-ups: **disclose the Sentry third-party transfer in the privacy policy before setting a DSN**;
        create the Sentry project + uptime monitor + alert rules at go-live.
- [x] **ADMIN-3 · Audit & data hygiene** (🟠 high / 🟡 med · **✅ BUILT 2026-07-24**) — audit tab **filter + pagination + CSV
      export** + a source-IP field; a **retention TTL** (ties to §C C15); **user-list CSV/JSON export**
      (quick win); **config change versioning / diff** (store prior values in the audit entry).
      **✅ BUILT 2026-07-24 (this session).** Founder decisions: filtering **client-side** over the existing
      fetch (no composite indexes / cursor API — the Users-tab pattern); source IP on **every** audited
      event, self-service included; config diff with **before→after values, secrets redacted**.
      **Scope correction:** the **retention TTL already shipped** — `purgeOldAudit` has swept a 365-day
      `AUDIT_RETENTION_MS` daily since BATCH-3 (C-R2c); this round only documents it in the UI.
      **JSON export was NOT built** — CSV only for both tabs; nothing in the panel needed the raw shape,
      and the users list is already available as JSON to a developer via the callable.
      - **Source IP** (`functions/net-utils.js` `auditIp`): reuses the rate limiter's **spoof-resistant**
        right-anchored X-Forwarded-For rule, because a *forgeable* origin in an audit log is worse than
        none — it would put an innocent address next to someone else's action. ⚠️ **Empty in the
        emulator** (verified live): the functions emulator passes a **synthetic `rawRequest` with headers
        only** — no `ip`, no `socket`, no XFF — so there is genuinely no origin to record locally. The
        render path was proven live by seeding an entry with an IP. **The real value can only be
        confirmed after deploy.**
      - **Pre-existing bug found + fixed while building:** `isValidIp` rejected **IPv4-mapped IPv6**
        (`::ffff:x.x.x.x`, what a dual-stack Node/Express server puts in `req.ip`), so `clientIp` fell
        through to `"unknown"` and **every such caller shared ONE rate-limit bucket**. Fixed, plus a new
        `normalizeIp` folding the mapped form to its IPv4 so one client is one bucket whichever form the
        platform reports. Regression-tested.
      - **Config diff** (new pure `functions/config-diff.js`, unit-tested): `saveConfig` now logs
        `flags.maintenance: false → true`-style changes instead of "updated app config". Secrets never
        leak — a `keep()`-guarded field records only `(changed)`, asserted for **every** entry in
        `SECRET_PATHS`. Walks the keys of the **written** doc only (`{merge:true}` means an omitted key is
        kept, so walking the union would log phantom removals). `DETAILS_MAX` = **500** = the
        `AuditEntry.details.maxLength` the API contract declares — a mismatch found and closed during
        the sweep.
      - **Audit tab**: search (actor/target/details/IP) · action filter listing only the actions actually
        present · 50/page pager · **Load more** deepening the fetch to `listAudit`'s 500 clamp.
      - **CSV export** on the Audit **and** Users tabs — exactly the filtered rows on screen, with a
        disclosure that a downloaded copy leaves the 365-day retention + erasure controls. New pure
        `src/utils/export-admin-csv.js`; CSV escaping extracted to a shared `src/utils/csv.js` (the user
        export now imports it, so there is one implementation).
      Files: `functions/net-utils.js` · new `functions/config-diff.js` · `functions/index.js` ·
      `src/hooks/useAdminDashboard.js` · `src/components/admin-dashboard.jsx` ·
      `src/styles/admin-settings.css` (`adm-count-row`/`adm-select`) · new `src/utils/csv.js` +
      `src/utils/export-admin-csv.js` · `src/CryptoIdea.jsx` (uses the shared BOM) · `openapi.json`
      (`AuditEntry.ip` + a `details` description) · `CLAUDE.md` · `API-SECURITY.md`.
      Verified: **unit suite green · build clean (name-guard) · admin CSS out of the user bundle ·
      browser-checked live as owner** (real tier-change + config-save entries; the diff rendered with
      `coingecko: (changed)` / `paypal.secret: (changed)` and truncation, the action filter and IP
      search each narrowed to 1 of 6, both Export buttons enable/disable correctly, 0 console errors).
      **Adversarial review (4 dimensions) folded in — 8 fixes, all with regression tests:**
      1. 🔴 **CSV injection (CWE-1236)** — a user naming themselves `=HYPERLINK("http://evil","x")`
         would execute a formula inside the admin's spreadsheet. `csv.esc` now prefixes a
         `= + - @ TAB CR` lead with `'`, **exempting plain numbers** so `-12.5` stays numeric. Fixes
         the **user portfolio export too** (shared escaper).
      2. 🔴 **Privilege leak the diff itself created** — `listAudit` is `assertAdmin`, but Settings is
         owner-only + step-up re-auth, so the new diff would have shown plan prices / legal IDs /
         PayPal client id to any **manager**. New pure `auditDetailsFor()` withholds a `saveConfig`
         entry's details from a non-owner (the trail stays, the content doesn't).
      3. **Secret rotations now sort FIRST** in the diff — on a first save the 500-char cap would
         otherwise truncate away exactly the "an API key was set" lines.
      4. **Silent 500 cap** → the tab now says older entries may exist and aren't in the export.
      5. **Stale pager index** — Prev/Next now step from the *clamped* page (a shrunken reload left
         Prev enabled but dead). Same one-line fix applied to the Users pager.
      6. **Failed load no longer also claims "No admin actions logged yet"** (same error+reassurance
         contradiction fixed for the ADMIN-1 webhook card).
      7. **Action filter keeps its selection** when a reload drops that action (was: blank `<select>`).
      8. `isValidIp` **shape-gate tightened** (`:::::`, `1::2::3`, `12345::1` rejected) so colon-junk
         can't be recorded as an origin; blob URL revoked on the next tick, not synchronously.
      ⚠️ **One finding NOT fixed — it cannot be settled locally.** `RL_TRUSTED_HOPS` (how many hops the
      platform appends to X-Forwarded-For) is **per ingress path**, and one constant is applied to both
      `/api/*` (via Hosting) and callables (direct on `cloudfunctions.net`). If the callable chain is
      shorter than the configured count, the recorded IP is the caller-supplied token — **forgeable**.
      The emulator sends no XFF at all, so this needs a prod log. **`audit.ip` is therefore advisory,
      not evidence, until go-live item 26** (sharpened to cover both paths). Not an authorization
      fail-open — nothing is authorized on the IP.
      **Accepted with reason (not fixed):** `diffConfig` logs nothing for an object→scalar change —
      `saveConfig` builds a fixed shape, so that transition cannot occur; fixing it would add branching
      for an unreachable case.
- [x] **ADMIN-4 · Growth metrics** (🟡 med · **✅ BUILT 2026-07-24**) — a daily scheduled snapshot
      (counts + per-tier revenue, reusing `getStats` math) → Overview renders **MRR/subs/signup trend +
      churn**. GA4/Plausible already cover engagement; this fills the revenue/churn gap they can't see.
      **Founder decisions (2026-07-24):** churn = **count drop + pending cancels**; snapshots kept
      **forever** (aggregate-only, no PII, so no erasure path); Overview shows **sparklines + deltas**
      (hand-rolled inline SVG — a charting dependency for three 120×28 lines fails KISS); an
      **owner-only "Capture now"** button for a missed run (and the only way to exercise it under the
      emulator, which never fires pubsub on a cron).
      **Spec correction:** the backlog said `stats/daily/{date}`, which is a 3-segment path = a
      *collection*, not a document. Shipped as **`statsDaily/{YYYY-MM-DD}`** — the date IS the doc id,
      so ids sort lexicographically in true chronological order (no index, no sort field).
      **What shipped:**
      - New pure `functions/stats-daily.js` (`snapshotId`/`buildSnapshot`) + pure `src/utils/growth.js`
        (`entryDaysAgo`/`deltaOver`/`netChurn`/`sparkPath`/`historyDays`). Split deliberately: the SERVER
        stores raw readings, the CLIENT derives every presented figure — so history stays a record of
        what was true, not of what we wanted to show.
      - `getStats`'s body extracted to a shared **`gatherStats()`**, used by both the live Overview and
        the snapshot. One implementation, because the series is permanent and drift would be baked in.
        It also now counts `canceledSubs`/`pastDueSubs` via the ADMIN-1 `billingStatusOf` derivation
        (no new storage, no extra read).
      - Nightly **`captureDailyStats`** (fails LOUDLY per H3 — a skipped run loses a day that cannot be
        reconstructed) + **`listDailyStats`** (`assertAdmin`, clamp 1–400/default 90, returns
        oldest-first) + **`captureStatsSnapshot`** (`assertOwner`, audited, idempotent per UTC day —
        `set()` replaces, so a re-run corrects the day instead of appending).
      - Signups counted from the **Auth record's `creationTime`**, not `users/{uid}.joined` — see the
        security fix below.
      **🔴 Pre-existing security gap found and fixed:** `users/{uid}.joined` — the signup date shown in
      the admin Users list and the users CSV — was in the create allowlist but its **value was never
      validated** (`validUserData` only checks `name`), and it is immutable after create. So a
      registering client had a one-shot chance to claim **any** signup date, permanently. Now pinned to
      `request.time` when present (exactly what `registerUser`'s `serverTimestamp()` resolves to).
      Checked only when present, so an unrelated future create path can't fail on a field it doesn't
      set — an omitted `joined` renders blank (honest-unknown) rather than forged.
      **🟡 Test-guard gap found and fixed:** `admin-gate-coverage.test.js` promises that "adding a new
      admin callable without a gate fails the suite instead of shipping", but its MATRIX was
      hand-maintained — ADMIN-1's `listWebhookEvents` was correctly gated yet never listed. Added a
      **completeness check**: every callable must appear in MATRIX (gated) or `UNGATED_BY_DESIGN`
      (justified), and the gated set must equal MATRIX exactly, so drift fails in either direction.
      **Honesty rules encoded (the point of the card):** every helper returns **null**, not 0, when the
      history is too short — so "collecting" and "0% churn" can never look alike; the churn figure is
      labelled **net** because a month that lost 3 and won 3 reads as 0% and gross churn is
      unrecoverable from counts alone; deltas match on **date not array index**, so a missed run can't
      silently make "30d" mean 34, and each delta's tooltip names its real baseline date; the foot
      reports "N snapshots — a scheduled run was missed" when the count and the span disagree; a failed
      load shows the error and **suppresses** the "no snapshots yet" reassurance.
      Files: new `functions/stats-daily.js` · `functions/index.js` · `firestore.rules` (server-only
      `statsDaily` + the `joined` pin) · new `src/utils/growth.js` · `src/api/admin.js` ·
      `src/hooks/useAdminDashboard.js` · `src/components/admin-dashboard.jsx` (`Spark`/`Delta` +
      the Growth card) · `src/styles/admin-settings.css` (`adm-growth*`/`adm-spark`) · `openapi.json`
      (35 paths) · new `tests/unit/{stats-daily,growth}.test.js` + `admin-dashboard.test.jsx` +
      `admin-gate-coverage.test.js` + `tests/firestore-rules.test.js`.
      **Verified:** 693/693 unit (65 files, +51 tests) · **40/40 rules** (+2) · build clean (name-guard) · growth code
      **and** CSS confirmed out of the user bundle · **browser-checked live as owner** (empty state →
      "Capture now" wrote a real snapshot: $9 MRR / 1 paid / 6 users / 6 signups, everything else
      "collecting"; then 35 seeded backdated days rendered 3 sparklines with tooltips proving the
      baselines are exactly 7 and 30 days back, churn `80.0% — 4 lost from 5`; deleting 3 days produced
      "36 days of history (33 snapshots — a scheduled run was missed)"; 3 labelled audit entries; 0
      console errors) · **server gates probed with real ID tokens**: manager→`captureStatsSnapshot`
      **403 "Owners only"**, plain user→`listDailyStats` **403 "Admins only"**, owner→200, manager→
      `listDailyStats` 200 (intended — `getStats` already returns revenue to any admin, so restricting
      the trend would be theatre).
- [x] **ADMIN-5 · Team-scale & support** (🟡 med / ⚪ low · **✅ BUILT 2026-07-25** — founder chose
      "everything now", KISS concern noted) — *(RBAC owner/manager roles were split out to **ADMIN-SEC**)*
      **Six pieces:**
      1. **Impersonation = READ-ONLY "view as"** (founder pick over token-based): the owner-only
         `viewUserAsAdmin({uid, reason})` returns a bounded snapshot (profile/billing + portfolios →
         coins → **journal theses** → capped transactions + learn counts) into a read-only viewer with a
         prominent **READ-ONLY** banner. It **never mints a token** and can't act as the user — no
         purchase/mutation/lockout surface. A **reason is REQUIRED** and stored in the audit entry (the
         founder chose accountability over time-boxing — there is no session to expire on a read). Reads
         are capped (20 portfolios / 150 coins / 50 tx-per-coin) and the response flags truncation.
      2. **Announcement banner** (`config/app.announcement = {text, level, active}`): app-only,
         dismissible (localStorage keyed to the message text → re-shows when the wording changes), three
         levels (info/warning/critical). `/api/config` publishes `{text, level}` **only when active** (a
         draft is never broadcast). Editor is a new Settings drill-in row; `<AnnouncementBanner/>` renders
         at the top of the logged-in app.
      3. **Bulk user actions** — non-destructive only (bulk set-tier + suspend/un-suspend); each selected
         uid runs through the SAME individually-gated + individually-audited callable in a client loop
         (no new bulk endpoint, no new surface), and an owner target is refused per-row.
      4. **Per-field tier filter + saved views** — a tier chip row alongside the ADMIN-1 billing filter;
         saved views store the `{search, tier, billing}` combo **per-operator in localStorage** (no new
         Firestore collection).
      5. **Private admin notes** — server-only `adminNotes/{uid}` (rules deny every client, incl. the
         subject), read by any admin / written by a manager+owner via `getUserNote`/`saveUserNote`; the
         note **content never enters the audit log** (only that it changed).
      6. **Before/after diff in audit** — extended the ADMIN-3 config diff to every user mutation
         (setUserTier/setPremiumLimits/suspend/restore/setManagerRole/adminTrashUser now log
         `field: old→new`, e.g. `tier: free→premium`), via the pure `functions/audit-diff.js`.
      **Gate matrix:** view-as = **`assertOwner`** (reads private data); getUserNote = `assertAdmin`;
      saveUserNote = `assertManager`. All three added to `admin-gate-coverage.test.js` MATRIX + the
      ACTION_LABELS/audit-labels coverage.
      Files: new `functions/announcement.js` · new `functions/audit-diff.js` · `functions/index.js`
      (3 callables + diffs + config wiring) · `firestore.rules` (`adminNotes` deny) · `src/api/admin.js` ·
      `src/hooks/useAdminDashboard.js` · `src/components/admin-dashboard.jsx` · `src/styles/admin-settings.css`
      (`adm-viewas*`/`adm-bulk*`/`adm-ann*`/`adm-usernote*`) · new `src/utils/admin-views.js` ·
      new `src/utils/announcement.js` · new `src/components/AnnouncementBanner.jsx` · `src/CryptoIdea.jsx` ·
      `src/styles/app.css` (`ann-banner` + dark) · `openapi.json` (39 paths) · new
      `tests/unit/{announcement,audit-diff,admin-views,announcement-dismiss,AnnouncementBanner}.test.js(x)`
      + `admin-dashboard.test.jsx` (+7) + `admin-gate-coverage.test.js` + `tests/firestore-rules.test.js`
      + `tests/functions-callable.test.js`.
      **Verified:** 839/839 unit (75 files, +43) · **43/43 rules** (+1 adminNotes deny) · **21/21
      integration** (+2 — the real view-as + notes callable bodies) · build clean (name-guard) · the
      admin-only `adm-*`/view-as/notes code confirmed **out of the user bundle** (only the user-facing
      `ann-banner` + `AnnouncementBanner` ship in it). **Browser-checked live as owner:** the tier
      filter + saved views + multi-select bulk bar render; **view-as opened a real read-only snapshot**
      of a user's two portfolios/10 coins (reason required); a private note saved; and end-to-end the
      **announcement banner** rendered at the top of the logged-in user app off `/api/config` and
      **dismissed** cleanly — 0 console errors on either app.
- [x] **ADMIN-D · Settings redesign — paper design system** (🎨 design-only; founder 2026-07-18 ·
      **✅ BUILT 2026-07-23** — with **ADMIN-D3** folded in) —
      reskin the admin **Settings** tab to match the app's user-settings (**Account**) screen: adopt
      the `.ci-app` paper design + the **drill-in list** pattern (home with the two global toggles
      inline + a category row per detail card), `saveConfig` logic untouched. Nothing dropped; adds an
      optional **Configuration** summary card — **confirmed in**, with a live amber/green Email dot.
      Mockups: [`admin-settings/index.html`](../mockups/admin-settings/index.html) (4 screens,
      light+dark) + the interactive [`admin-panel/index.html`](../mockups/admin-panel/index.html)
      (same drill-in, all 5 tabs). Spec: [`ADMIN-PANEL-AUDIT.md`](../decisions/ADMIN-PANEL-AUDIT.md)
      § Settings redesign. **Keep maintenance in its warning colour** (the mockup renders it green).
      **Sequence after ADMIN-SEC** — Settings gains the owner-only unlock gate, so building it first
      means drawing the screen twice. Local-first / emulator-verifiable; run the §PROCESS
      interview+sweep + a dark-mode pass when built.
      **✅ BUILT 2026-07-23 (this session):** Settings tab reskinned to the `.ci-app` paper drill-in —
      home = a **Configuration** status card + the Maintenance/Signups **switches inline** + a category
      **row per detail card** (API keys · Email · Plans · AI · Analytics & legal · **Admin access**); each
      row → a paper detail card with the app's `field-input`/`acct-btn`/`switch`. `saveConfig` /
      `saveControls` and every handler are unchanged (design-only). Files: `src/components/admin-dashboard.jsx`
      (new `settingsView` local state + `NavRow`/`CtrlRow`/`Switch`/`DHead` helpers, mirrors `Account.jsx`;
      Save buttons moved into the detail views; AI detail gained a "Save AI settings" button) ·
      `admin.html` (Fraunces/Hanken font links) · `src/admin-main.jsx` (imports `app.css` +
      `src/styles/admin-settings.css`) · new **`src/styles/admin-settings.css`** (the few Settings-only
      classes — status rows, plans grid, cookie ctrl-line, foot-note, maintenance-warn switch — imported
      ONLY by the admin bundle, verified out of the user bundle). **Maintenance stays its warning colour**
      (`.switch.warn` → amber). **Configuration card = IN** (status dots derived from saved config).
      **ADMIN-D3 folded in:** the owner-only Admin access grant/revoke flow is now the last Settings row
      (its own detail view) and the separate "Admin access" top-level tab is **gone** (owner tabs 6→5).
      **Dark mode is N/A** — the admin app never sets `html[data-theme]`, so Settings renders **light
      paper** (consistent with the still-grey rest of the panel until ADMIN-D2). Verified: **552/552 unit
      · build clean (name-guard) · browser-checked as owner** (paper renders, drill-in nav works, Admin
      access search wired, 0 console errors). Reskin covers the Settings tab **only**; the header, tab bar
      and other four tabs stay grey until **ADMIN-D2**.
- [x] **ADMIN-D2 · Paper reskin — the other four tabs** (🎨 design-only · 🟡 med · founder 2026-07-18 ·
      **✅ BUILT 2026-07-24**)
      — extend the ADMIN-D paper design to **Overview · Users · Trash · Audit** so the panel isn't
      half-paper/half-grey. Visual spec = the interactive
      [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html) (tabs switch, Overview
      maths compute live). **It is a reskin: 35 of its capabilities already ship** — the only additions
      are **one shared toast** replacing the two inconsistent inline status fields (`savedMsg` /
      `actionMsg`) and **pre-empting a blocked delete** with a toast instead of opening the confirm.
      **Three areas are SUPERSEDED by ADMIN-SEC and must NOT be built as drawn** (the Users-tab ADMIN
      ROLE card, the flat single-admin model, ungated Settings/API-keys/Plans) — see
      [`ADMIN-PANEL-AUDIT.md`](../decisions/ADMIN-PANEL-AUDIT.md) § Full-panel mockup. Carry the build
      constraints from that section: strip the prototype artefacts (uncontrolled Settings inputs,
      `showSampleData`, unbound Refresh, hard-coded audit actor), port the fixed 1140px grids to the
      app's `auto-fit` responsive standard (§R), add the dark pass, and fix the a11y gaps (unlabelled
      tier bar, non-keyboard user rows, non-heading card titles). Leave room for ADMIN-1's billing
      block and ADMIN-3's audit controls so those screens aren't redesigned twice. **Sequence after
      ADMIN-SEC + ADMIN-D.** Local-first / emulator-verifiable; runs the §PROCESS interview+sweep.
      **✅ BUILT 2026-07-24 (this session):** the whole panel now renders inside ONE `.ci-app` wrapper —
      **Overview · Users · Trash · Audit** plus the header, tab bar, role notice, step-up unlock modal
      and footer are on the paper design (Overview = paper stat tiles + revenue/usage/tier cards +
      plan-limits grid; Users = paper list with the search/filter/pager, and a per-user **drill-in**
      via `DHead` back-chevron; Trash + Audit = paper `adm-list` rows). Added **one shared toast**
      (`adm-toast`, ok/err/warn/info) that mirrors the hook's `savedMsg`+`actionMsg` — the two inline
      status fields are gone — and **pre-empting an owner delete** with a warn toast instead of opening
      the dead-end typed-DELETE confirm (server gate unchanged). **a11y fixes:** user rows are now
      `<button>`s (keyboard-reachable), card titles use headings/`card-title`, the tier bar keeps a
      text legend (not colour-only), trash urgency is colour **+ a word**. **Responsive:** ported to the
      app's `auto-fit` grids (`grid-auto` / `adm-stats` / `adm-plans`) — desktop-first, collapses narrow.
      Files: `src/components/admin-dashboard.jsx` (rewritten presentation-only — every hook handler
      unchanged; the old `c` inline-style object + `Bdg` are gone, replaced by paper classes + a
      `TierPill`) · new **`adm-*` classes appended to `src/styles/admin-settings.css`** (admin-only,
      **verified out of the user bundle** — `dist/app.html` links only `app.css`; `.adm-*` appear only
      in the admin CSS chunk). **Dark mode is N/A** (admin renders light paper only — the admin app never
      sets `html[data-theme]`; the "add the dark pass" build-constraint line is moot here, noted so it
      isn't re-litigated). The three ADMIN-SEC-superseded areas were already handled in ADMIN-SEC/ADMIN-D
      and are **not** in the panel. Verified: **552/552 unit · build clean (name-guard) · admin CSS out
      of the user bundle · browser-checked as owner** (all four tabs paper, drill-in nav, shared toast
      ok+warn kinds, owner-delete pre-empt fires + confirm stays closed, 0 console errors). The whole
      admin panel is now **fully paper** — no grey left.
- [x] **ADMIN-D3 · Fold "Admin access" into Settings** (🎨 IA / design-only · founder 2026-07-23 ·
      **✅ BUILT 2026-07-23 with ADMIN-D** — Admin access is now the last Settings drill-in row; the
      separate top-level tab is gone (owner tabs 6→5); the grant flow + `setManagerRole` gate unchanged) —
      move the owner-only **Admin access** tab (grant/revoke a manager) *into* the **Settings** tab and
      drop the separate top-level tab. **No security change:** both areas are already owner-only AND
      both sit behind the same step-up re-auth gate — `setManagerRole`, `saveConfig` and `getAdminConfig`
      all use `assertFreshOwner`, so the callable walls + `firestore.rules` are untouched; this is purely
      UI / information-architecture. **Best built as part of ADMIN-D** — in the Settings drill-in list,
      "Admin access · grant a manager" becomes one more category row / detail card alongside App Controls
      / Plans & Pricing / Analytics & Legal / AI, which is exactly the drill-in pattern; if done
      standalone before ADMIN-D it is a small in-place merge. Consistency sweep when built:
      `src/components/admin-dashboard.jsx` — remove `"access"` from the tabs array (~L109) and the
      `tb === "access" ? "Admin access"` label special-case (~L112); move the whole
      `{tab === "access" && isOwner && …}` block (~L624) into the `{tab === "settings"}` block (~L464) as
      a card/section; reword the manager & no-role notice ("Settings, admin access and permanent deletion
      are owner-only", ~L124–125) now that Admin access lives *inside* Settings. `useAdminDashboard` grant
      state (`grantEmail`/`grantEmail2`/`grantFound`/`grantMsg`/`grantWarn`/`setManager`/`grantLookup`) is
      unchanged — it just renders under `settings`. Update tests (`tests/unit/admin-dashboard.test.jsx` —
      anything selecting the Admin-access tab or asserting the tab list) + every doc that names the
      "Admin access tab" (CLAUDE.md § Admin & privacy, [`ADMIN-PANEL-AUDIT.md`](../decisions/ADMIN-PANEL-AUDIT.md),
      the ADMIN-D / ADMIN-D2 mockups → Settings gains an Admin-access row, owner tab count drops 5→4).
      Interpretation to confirm at the build interview: "admin access" = the manager grant/revoke tab
      (the reading here); keep the manager-grant flow as one Settings detail card (recommended). Local-
      first / emulator-verifiable; runs the §PROCESS interview+sweep (Admin map row) when scheduled.
- **Deliberately deferred (⚪ low / out-of-scope):** content-moderation queue (theses are private →
      revisit only if shareable), in-panel refund/cancel actions (use PayPal), IP allowlisting, formal
      break-glass (min-2-admins covers it), cohort/NRR/LTV (external tools), status page, i18n,
      staged/percentage rollout. KYC/AML/custody = N/A (non-custodial).

## API. API spec + security review — 2026-07-08 founder interview  (✅ BUILT 2026-07-08)

Canonical: [`API-SECURITY.md`](../security/API-SECURITY.md) (surface map, key model, findings, rotation runbook)
+ [`openapi.json`](../../openapi.json) (OpenAPI 3.0.3, 32 operations). A local multi-agent adversarial
gap-hunt (44 agents, every finding double-verified) found **11 confirmed gaps → 8 fixes** (7 refuted).
Commits `76a3711` (spec+doc) · `5bf9f1a` (fixes) · `d82786f` (secrets hygiene).

- [x] **API-1 OpenAPI spec** — `openapi.json` from the codebase: public REST `/api/*`, user+billing
      callables, all 14 admin callables, the PayPal webhook; validated (refs resolve, unique opIds,
      no GET bodies); secrets modeled as set-flags; emulator + prod-placeholder servers.
- [x] **API-2 Counter-forge (HIGH)** — `firestore.rules` `counterNoForge` forbids any client counter
      DECREASE; client deletes no longer decrement (fail-safe-high, reconciled after delete); rules
      test proves the decrement is denied.
- [x] **API-3 Rate-limiter XFF spoof (HIGH)** — pure `functions/net-utils.js` `clientIp` right-anchored
      + IP-validated (unit-tested); overflow wipe prunes only expired buckets.
- [x] **API-4 Denial-of-wallet gates** — `/api/history` + `/api/prices` gate on shared-universe
      membership before any CoinGecko fetch; fold-back never creates off-list entries; 1h negative cache.
- [x] **API-5 Read-amplification budgets** — `exportMyData` cooldown + `reconcileMyCounters` daily budget
      (wires the built-but-unused `guards.consumeDailyBudget`).
- [x] **API-6 Webhook idempotency ordering** — roll back the event marker on a processing failure so a
      retry reprocesses (was permanently dropping a failed paid event).
- [x] **API-7 Secrets hygiene** — `.gitignore` `.env*` + `*.p12`/`*.p8`/`credentials*.json`/`.npmrc`;
      pre-commit content scan adds the app's real key formats (`sk-ant-`/`CG-`/PayPal). Bundle + full
      git history scanned clean.
- **Refuted (verified NOT exploitable, not fixed):** SSRF non-dotted IP (Node URL normalises),
  `getAdminConfig` webhookId echo (admin-gated), config cache stale-secret window, subscribe abuse
  (email unconfigured), tierBeforeFailure resurrection (signature-gated), full-collection scans
  (scale-only). See API-SECURITY.md §4.

**Log — 42Crunch audit remediation (2026-07-18):** ran the 42Crunch `42c-ast` static audit (v3.57.0,
Token/freemium mode) on `openapi.json`. Baseline **9.24/100** (Security 1.88 · Data 7.36). Applied the
"honest blocking fixes" (target 70, block HIGH+): (1) dropped the `http://localhost` emulator entry from
`servers` so the documented contract is HTTPS-only — killed the CRITICAL "bearer-over-cleartext" (24 ops)
+ the MEDIUM global-http-clear; (2) added `maxItems` to the 5 response arrays (bounds match real caps —
users 5000, audit 500, portfolios 100, coins 10000, history 20000); (3) documented the PayPal webhook's
signature auth as a `PayPalWebhookSignature` apiKey scheme (reconciled the "unauthenticated" wording in
`openapi.json` info + `API-SECURITY.md` §D to match). Re-audit **32.56/100** (Security **24.61**, +22.7).
- **Accepted-by-design:** 7 HIGH `security:[]` findings on the genuinely public `/api/*` endpoints —
  flipping them to bearer would misrepresent the API; left as-is.
- **Data-validation push → 65.06/100 (2026-07-18, commit `8d118c0` formatting-normalize + the constraints
  commit):** on founder "push toward 70", added server-GROUNDED honest constraints — a 4-agent analysis
  workflow (each agent read `functions/index.js` + `firestore.rules`) fed one reviewable transform, then a
  3-agent adversarial honesty pass returned **0 issues**. Added: `default` response on all 32 ops + honest
  `429`/`401` only where the server truly returns them; generous `maxLength` on every string; honest
  `minimum`/`maximum` on every number; `pattern` ONLY where every real value provably matches (id-family,
  status, action, ISO `exportedAt`); `additionalProperties:false` on every fixed response schema AND request
  wrapper. Score **9.24 → 32.56 → 48.35** (responses-only) **→ 65.06** (also closing request bodies).
  Security **24.61/30**, Data **40.45/70**.
- **70 is NOT honestly reachable** — the wall is ~55 `pattern` findings on genuinely free-form /
  provider-controlled strings (coin names, admin-entered analytics/Termly IDs, opaque secrets, nullable
  emails/URLs): any pattern there could reject a REAL value, so we don't fake them. Also accepted by design:
  the 7 public `security:[]`, the webhook's honest `apiKey`-in-header scheme, and the free-form export /
  CoinGecko / PayPal passthrough objects (`PricesResponse` map, export `profile`/`portfolios`, `PayPalEvent`).
- **📋 Follow-up (server hardening — security-forward, not yet built):** the request-body
  `additionalProperties:false` now documents a STRICTER input contract than the callables enforce (they
  currently ignore unknown fields). Harden the callables to **reject unknown request keys** (deny-by-default
  input) so the contract is backed by real validation — until then a live `42crunch-scan` will (correctly)
  flag it as a conformance gap.
- Next 42Crunch step available: `42crunch-scan` (live conformance / BOLA / BFLA) against the running stack.

## SKILL. `tdd-testing` audit — top-up + research conformance  (✅ APPLIED 2026-07-20)

Two phases, both landed. **(1) Content audit 2026-07-18:** multi-agent audit, 19 verified gaps /
26 refuted — healthy in principle, stale in specifics. **(2) Research conformance 2026-07-20:** the
"Build Agent Skills" research doc compared against skill + plan (13 confirmed gaps / 1 refuted + 3
completeness-critic finds), reconciled in an 11-decision founder interview, then **applied the same
session**. Full record incl. what changed vs the written plan:
[`TDD-SKILL-UPDATE.md`](../planning/TDD-SKILL-UPDATE.md) **§10**.

**Applied to `tdd-testing` (185→254 lines):** four tiers (+**Callables** — the
[`ERRORS.md`](../testing/ERRORS.md) C6 class) + the mocks-never-run-the-server-body gotcha ·
deny-checklist rules bullet · claim-truthiness near-misses · counter-decrease deny · error
classification · idempotency redelivery+rollback tests · injected-`db` fake · source-matrix
**merged** into the parallel-session bullet (not duplicated) · retrying-assertion replaces the
fixed-sleep advice · matchMedia/CSS-selector bullet split · flat+pruned maintenance note **with the
emulator-mechanics routing clause** · **directive description rewrite** (ALWAYS-invoke +
BEFORE-marking-done + Do-NOT clause, 1002/1024 chars) · all new content **repo-filename-free**
(citation rule: file+symbol in repo docs, pattern-only in reusable skills).
**Fleet:** `firebase-saas-starter` got the fleet's first `references/` split (emulator run mechanics
→ `references/emulator-testing.md`, 585→566 lines, two duplicate gotchas retired) + emulator-test
triggers in its description; `api-security` got its **missing frontmatter** (it had none — it could
never auto-trigger); `~/.claude/skills` is now a **git repo** (baseline `6d6ec99`, apply `39044bc`);
`.githooks/pre-push` now runs `test:unit` (measured 168s — founder chose push over per-commit).

**Update 2026-07-21 — skills-playbook monorepo session (✅ APPLIED):** the whole fleet was
reorganized per the founder's "skills playbook" research + a 7-decision interview. `~/.claude/skills`
stays THE repo in place (the playbook's symlink migration is a Windows trap — MSYS `ln -s` silently
copies) and is now the **private GitHub monorepo `nrenre62/claude-skills`** (catalog README, MIT
LICENSE © nrenre62, CONTRIBUTING, .gitignore; `license`+`metadata{author,version:"1.0"}` frontmatter
on all 12; CHANGELOG deferred to the first tagged release). **Full readability pass on all 12 skills**
(12 editors + adversarial verifiers + a fleet-consistency pass): every description is now directive
(third-person verb + ALWAYS-invoke + quoted triggers + Do-NOT routing, all ≤1024 chars — this
RETIRES the queued fleet-description pass), every body ≤500 lines (`firebase-saas-starter` 639→~495
via three new `references/` splits: frontend-refactor, design-integration, admin-roles-gdpr), and all
repo-specific citations scrubbed to pattern-only. Side fixes: stale `.claude/commands` project dupes
deleted (global canonical), `/XD .git` added to the WD backup change-detector, the bundled backup
script re-synced with the live one, orphaned worktree purged.

**Still queued:**
- **Eval pass (1 session):** skill-creator evals for `tdd-testing` — 3 scenarios (loop compliance ·
  gotcha retrieval · fourth-tier placement, which doubles as live H1 verification) + the description
  optimizer (held-out scoring decides any further description changes). Run after real use.
- **Pruning pass (quality/token-only):** `tdd-testing` (~270 lines after the readability pass) is
  still above the ~5k-token soft guidance. Method = plan §7 (keep-biased); **no line target** — the
  ~200 budget is superseded by the official 500-line ceiling.
- **You-run check:** `/doctor` + `/context` in a fresh session to verify the skill LISTING isn't
  overflowing (12 personal + ~33 plugin skills compete; overflow silently drops descriptions).
- **At §OSS time:** run the playbook's gated go-public checklist on `claude-skills` (see §OSS).

**Also queued — one-time coverage sweep (deliberately NOT a standing DoD line):** find exported logic
with no test, matching on the **export name**, not the filename (tests are flat and grouped by topic —
`research-adapters.test.js` covers `priceAdapter` + `sparkline` — so a filename diff false-positives
~30%). Known misses: `nextBackoff` (`src/features/research/utils/backoff.js`); `riskColor.js`
(`riskSpectrum`/`levelColor`/`levelTint`); hooks `useAsk`, `usePulse`, `useSharePulse`, `useHoldings`,
`usePrices`, `useRelativeTime`. Test or consciously waive each. Don't add a coverage tool for this.

## OSS. Open-source skills to build the GitHub account  (📋 PLAN — pick & scrub in a session)

The product code stays **private** (this repo). The skills now live in ONE private monorepo —
**github.com/nrenre62/claude-skills** (= `~/.claude/skills` in place; MIT, catalog README, all 12
readability-passed and citation-scrubbed 2026-07-21) — so going public is a **flip, not a build**:
run the playbook's gated go-public checklist in a focused session — `gitleaks git .` over full
history · generalize `auto-backup-loop`'s personal defaults (D:\ paths, task name — the only skill
carrying machine-specific content) · decide fresh-start history vs keep · re-scan · flip visibility ·
add topics (`claude`, `claude-code`, `agent-skills`) · tag `v0.1.0` · pin on the profile. If a
subset-only release is preferred instead, the least product-revealing candidates remain:
`secure-by-design`, `api-security`, `tdd-testing`, `responsive-app`, `drawing-diagram`. Do NOT
publish product docs (PRODUCT-DECISIONS, DESIGN-PASS, etc.).

## DOCS. Reorganize root .md files into categorized docs/ subfolders  (✅ BUILT 2026-07-17)

**Done 2026-07-17** — this doc now lives at `docs/product/NEXT-STEPS.md`. All ~25 root `.md` files
moved into `docs/{decisions,design,security,testing,product}/` via `git mv` (history preserved);
only `README.md` + `CLAUDE.md` remain in root. 333 relative cross-links rewritten across 25 files
(a script mapped every old→new path; anchors/URLs untouched) and verified to resolve. The two
diverged duplicates were resolved: the fuller `docs/` **TEST-REPORT** was kept and the stale root
copy deleted; **SECURITY-AUDIT** turned out to be *two distinct audits* (root = 2026-06-16
`secure-by-design`; docs = 2026-06-27 `vibe-security`), so the earlier one was **preserved** as
`docs/security/SECURITY-AUDIT-2026-06-16.md` rather than deleted. One pre-existing broken link
(`docs/planning/PRICING-RESEARCH.md`, referenced by PRICING.md — the target never existed) was
rebased but left flagged. Original plan below.

**Decided** (founder interview 2026-07-17): move the ~25 root-level `.md` files into
**categorized subfolders** under `docs/`. Keep only `README.md` + `CLAUDE.md` in root (tool/GitHub
convention). Proposed buckets: `docs/decisions/` (PRODUCT-DECISIONS, BACKEND-ADMIN-DECISIONS,
PRICING, BILLING, CACHE-POLICY), `docs/design/` (DESIGN-PASS, DESIGN-REVAMP, RESPONSIVE-DESIGN),
`docs/security/` (API-SECURITY, SECURITY-AUDIT, ISOLATION), `docs/testing/` (TEST-REPORT, ERRORS,
REVIEW-FINDINGS, ARCHITECTURE-AUDIT), `docs/product/` (USER-BENEFITS, USER-CREATION, USER-SETTINGS,
USER-SETTINGS-README, CALCULATOR, DATA-FLOW, DATA-INTEGRITY, CODEBASE-MAP, AGILE, BACKUP, NEXT-STEPS)
— refine when doing it. Keep the existing `docs/planning/` + `docs/diagrams/`.
**Must-do carefully:** (1) `git mv` to preserve history; (2) **rewrite every relative cross-link**
(docs reference each other AND code paths like `firestore.rules`, `functions/index.js` — these gain
a `../` or lose a `docs/` depending on direction); (3) **resolve the 2 diverged duplicates** —
`SECURITY-AUDIT.md` (root 126L vs `docs/` 315L) and `TEST-REPORT.md` (root 66L vs `docs/` 158L):
keep the fuller `docs/` copies, delete the stale root ones (confirm no unique content first); (4)
verify no broken links after (grep for `](` targets). Do as its own commit so a link break is isolated.

## PROCESS. Interview & consistency SOP  (✅ BUILT 2026-07-17)

Standing operating procedure so **code + rules + README + every MD doc stay in agreement** — one
topic change (pricing, tier limits, settings, admin, API, security…) is reflected *everywhere* it
lives, no silent drift. Canonical: [`docs/interview.md`](../interview.md); bound via a MANDATORY rule
in [`CLAUDE.md`](../../CLAUDE.md) → Conventions (loaded every session). Flow for substantive work:
**AskUserQuestion → find gaps across all related files → plan + get a yes → consistency sweep (every
file in the topic's map row) → verify → log here → commit.** Trivial single-file fixes skip it with a
one-line heads-up. On an error: surface it, then AskUserQuestion for the fix. The `interview.md`
**topic→files consistency map** is the concrete checklist (Pricing / Tier limits / AI budget /
Billing / User settings / Admin / API / Security / Caching). Keep the map current when files move.

**Log — README ↔ code/docs reconciliation (2026-07-17):** ran a read-only 16-section multi-agent
audit of `README.md` against the code + canonical docs; **19 drift points found, all adversarially
re-verified (0 false positives).** Fixed all 19 in README (README-only — the canonical docs already
agreed): stale Setup Guide (no `firebase.config.js` paste / no `window.storage`), the Database Schema
block rewritten as an exact field-by-field mirror of `firestore.rules` (3-tier `tier`, 7-key
`settings`, `consent`, counters, `journal`/`funnel`, `learn/progress`, server-managed billing/soft-
delete fields), Round 11 "planned"→BUILT (+12–32), responsive track table, ships-list, admin
dashboard path + Audit tab, `NEXT-STEPS.md` root path, `$25 Blaze`→pay-as-you-go, `cache/universe`
~330 KB→~700 KB, Storage-emulator + `--project` notes. Clean on prior-fixed sections (Tier Limits,
Cloud Functions table, CoinGecko constants, links).

## JIRA. Jira-backed bug tracking + regression-test loop  (✅ BUILT 2026-07-21 — CRYP-1)

Bugs are tracked in Jira project **CRYP** (`cryptoidea.atlassian.net`) through the user-level Rovo MCP
connection — **no Jira API token exists in this repo**, and none should be added. Canonical:
[`JIRA-WORKFLOW.md`](../testing/JIRA-WORKFLOW.md); bound from [`CLAUDE.md`](../../CLAUDE.md) → Conventions
and [`AGILE.md`](AGILE.md) → Testing conventions; consistency-map row added to
[`interview.md`](../interview.md). The point of the whole thing: **every fixed bug leaves a permanent
regression test behind**, and the red test is committed *before* the fix so the diff proves the code
changed rather than the test being weakened.

**Shipped:** four project-local commands — `/jira-bug` (file a well-formed ticket), `/jira-fix <KEY>`
(read → branch `fix/CRYP-nn-slug` → **failing test first** → commit red → fix → green → push → comment →
transition), `/jira-test-sync` (run the suite, map results onto tickets, **propose before writing**),
and `/jira-bug-hunt` (2026-07-21, CRYP-2 — autonomous **emulator-only** hunt: suites baseline → 50-user
scale/plan-limit probe (20–100% fill per tier, counter-seeded boundaries) → cross-user isolation probe →
per-tab data-flow & privacy audit → flake-filtered verification → a dated report under
`docs/testing/bug-hunts/`. **Reports only, never fixes**: confirmed findings are proposed as Jira Bugs
and filed after an explicit yes; each fix the user approves then runs per-ticket through `/jira-fix` and
lands in `ERRORS.md` + the consistency-map docs).
Plus `scripts/jira-test-map.js` — a pure vitest-JSON → `CRYP-key → pass/fail` mapper (TDD'd via
`tests/unit/jira-test-map.test.js`), which exists because a full run's artifact is ~190 KB on one line.

**Traceability marker:** the ticket key goes in the **`it()` title** (`it("CRYP-42: …")`), extending the
repo's existing `it("R26: …")` style. Verified collision-free before adoption (no unrelated token used
the `CRYP-` prefix). `describe()` titles and filenames are explicitly rejected as markers — a `-t`
pattern matching a suite runs its siblings, so an unrelated failure would be attributed to the wrong
ticket. Selection needs the trailing colon (`-t "CRYP-42:"`) — `-t` is a substring match.

**Verified live against CRYP-1:** create → labels → read → `getTransitions` → transition all round-trip;
mapper GREEN/RED/INCONCLUSIVE paths each confirmed at the CLI with real artifacts.

**Traps recorded (each cost a design change):** CRYP is *team-managed* so there is **no `priority`
field** (use labels); transition ids are per-project and were undiscoverable until an issue existed —
resolve at runtime, never hardcode; `searchJiraIssuesUsingJql` returns **empty for invalid JQL** instead
of erroring (proven with a control query), so an empty board is not a clean board; a run that executed
**zero tests is INCONCLUSIVE, never a pass** (a port clash exits non-zero having run nothing, and there
is no `npm test` script); the red checkpoint must be **commit-only** because `.githooks/pre-push` runs
the full suite; raw test stdout carries seeded emails + verification links so Jira comments are bounded
to the first failure line; and the documented suite flake (**§FLAKE** below, run log in
[`GO-LIVE-AUDIT.md`](GO-LIVE-AUDIT.md) §3b) means a red must repeat twice before it is reported onto a ticket.

- [ ] **JIRA-1 · Exercise the loop on a real bug.** `/jira-fix` is built and its Jira calls are proven,
      but it hasn't yet driven a genuine bug red→green end-to-end. Next real bug goes through it.
- [ ] **JIRA-2 · Decide whether `In Review` earns its column.** The board has four states; a solo dev
      likely wants three. Leave unused or remove.
- [ ] **JIRA-3 · Run the first `/jira-bug-hunt` end-to-end.** The command is built (CRYP-2) but no hunt
      has produced a report yet — first run proves the probe specs against the live emulator and seeds
      `docs/testing/bug-hunts/`.

## DI. Data integrity & honest errors — 2026-07-07 founder bug + audit  (✅ BUILT 2026-07-07)

Canonical spec + locked decisions D1–D7: [`DATA-INTEGRITY.md`](DATA-INTEGRITY.md) · diagnosis:
[`ERRORS.md`](../testing/ERRORS.md) §A4 · full inventory:
[`docs/planning/data-integrity-findings.json`](../planning/data-integrity-findings.json).
Trigger: the false **"You've reached this portfolio's coin limit"** toast on a 2-coin Starter
account (a >2000-char Buy-Journal thesis denied by `validJournal`, mislabeled as a limit).
A 27-agent adversarial audit confirmed **36 gaps + 5 critic adds** (2 refuted) in the class.
Everything below is local-first (emulator-verifiable now; no Blaze needed).

- [x] **DI-1 Honest errors (verify-then-toast + input caps)** — data-layer failure classification
      (`reason: limit | missing-target | invalid-or-denied`); the limit/upgrade toast ONLY on a
      server-confirmed real limit; strip `limitMsg` from the tx-EDIT site; honest defaults on the
      7 generic sites; client caps mirroring rules bounds (thesis/changeMyMind/funnel ≤2000 +
      live counter on ALL writers incl. both R24 X-save paths; portfolio name ≤50 on create;
      tx amount/price upper bounds; defense clamps for coin name/symbol/thumb);
      `console.error` raw errors everywhere.
- [x] **DI-2 Active-portfolio self-heal** — reconciliation effect (`activePortId` ∉ portfolios →
      first real id); zero-portfolio auto-recreate ("My Portfolio", registration parity);
      `getPortfolios` retry + visible error state (never the silent phantom "default");
      write guards on a dangling id; forced-sign-out resets state + actually clears
      `ci-active-port` (fix the persistence-effect resurrection).
- [x] **DI-3 Counter integrity** — `runTransaction` guards: add returns `already-exists` (no
      journal/addedAt clobber, no counter inflation), deletes return `not-found` without
      decrementing; new `reconcileMyCounters` callable (Admin SDK, own tree) invoked when
      classification detects drift; rules tests pin the behaviors (rules themselves unchanged).
- [x] **DI-4 Keep-data downgrade + grey-lock** — retire `trimToTier` everywhere (nothing deleted,
      locally or server-side); pure lock-derivation util (portfolios beyond cap by order; newest
      coins beyond the coin cap); dimmed + "Over plan limit" tag + tap-explainer Modal
      (Upgrade / OK; deletes always allowed); re-worded downgrade dialogs (`overLimitImpact`);
      **`resolveRecheckout` + `reactivateSubscription` callables** so the R29 decisions persist
      (moved UP from §BL-4, emulator-testable now).
- [x] **DI-5 Watcher robustness** — watchCoins failed-pass full re-sync (no permanent snapshot
      drop); watchPortfolios onError → toast; de-dup optimistic appends by id; re-fetch coins on
      switch when the meta came in empty.
- [x] **DI-6 Session & config hardening** — live `users/{uid}` watcher (tier/premiumLimits/trash
      reach open sessions — completes C-A3); offline detection banner + write blocking;
      `suspendUser` revokes tokens; admin Plans blank-field = default (0 rejected);
      App Check failure handling noted in §4 go-live checklist.

## R31. Onboarding choice · downgrade select-flow · admin trash-delete · suspension freeze  (✅ BUILT 2026-07-07 — live PayPal calls verify at go-live)

Canonical spec + decisions R31-D1…D4: [`DESIGN-PASS.md`](../design/DESIGN-PASS.md) "Round 31" · bug diagnosis:
[`ERRORS.md`](../testing/ERRORS.md) §A5 (admin tab kills non-admin sessions — explains the empty "Welcome,", the
popup→full-screen flip, and the post-un-suspend logout loop; **local-testing gotcha: keep the admin tab
closed while testing user logins until R31-1 lands**). Pairs with §DI; build R31-1 first.

- [x] **R31-1 Isolate admin auth** — own Firebase app instance/persistence for `admin-main.jsx`; "not an
      admin" denied screen instead of auto-signout; user app clears the plan-flow overlay on session death
      + `showPlan && user` render guard. **Also fixes R31-7** (logout ~1 min after upgrade = the same §A5
      admin-tab kill; DoD adds: upgrade to Pro AND Premium, wait 2+ min with /admin CLOSED, session
      persists — escalate to a dedicated diagnosis only if it survives with the admin tab closed).
- [x] **R31-2 Forced new-user plan choice (R31-D1)** — no pre-chosen plan / no CURRENT badge until an
      explicit choice; three actionable cards (Choose Starter/Pro/Premium), no X or skip link for the
      fresh registration; `settings.planChosen` persisted (validSettings + rules test); Starter card+CTA
      border **gray in light (`--line-strong`), white in dark (`--ink` #ece9e1)** across every plan-picker
      surface (R31-D5); drop the duplicated "Select a plan" subtitle from the upgrade popup (keep it on the
      welcome picker).
- [x] **R31-3 Downgrade select-then-confirm + approve-now (R31-D2)** — chooser cards become a selection
      (highlight + Continue); "what you'll lose" warning for BOTH targets before any billing step;
      Premium→Pro: cycle picker (defaults monthly) → approve PayPal NOW with a future start at Premium's
      end (retires the R29-3 `recheckoutDue` popup); pending notice shows "payment approved ✓";
      keep-my-plan/change-choice also cancel the scheduled subscription.
- [x] **R31-4 No-refund line on every billing surface** — add to the buy/cycle step, the chooser footer,
      and the new warning step (confirm modal + Account already have it).
- [x] **R31-5 Admin delete-via-trash** — remove Move-to-trash; Delete → type-DELETE popup (reuse the BL-2a
      typed-confirm pattern) → `adminTrashUser`; hard delete ONLY from the Trash tab, also behind typed
      DELETE.
- [x] **R31-6 Suspension freeze + honest message + trash billing (R31-D3/D4)** — `auth/user-disabled` →
      honest "account suspended" login message; suspend = revoke tokens + `suspendedAt` + PayPal
      subscription suspend (go-live) + sweep skips suspended; un-suspend reactivates + extends `endDate`
      by the suspension duration (pure billing.js helper + tests); trash (admin AND self-delete) cancels
      the PayPal subscription immediately — also fixes hard-delete never cancelling a payer's billing.

## ISO. User-data & admin isolation — audit + harden + prove  (✅ ISO-1/2/3/5 BUILT 2026-07-07 · ISO-4 = go-live infra)

Canonical: [`ISOLATION.md`](../security/ISOLATION.md) (guarantee + threat model + decisions ISO-D1…D4) ·
findings: [`docs/planning/isolation-audit-findings.json`](../planning/isolation-audit-findings.json).
**Audit result: core isolation VERIFIED SOUND live** (23 cross-tenant probes all denied; guard-first
callables; admin data walled off; no admin code in the user bundle). Below = defense-in-depth
hardening (no current breach) + the regression tests that PROVE it. Decision ISO-D1: keep logical
per-uid isolation (physical per-user DB is an anti-pattern here), harden + prove.

- [x] **ISO-1 Harden the rules** — closed-shape `users/{uid}` (`hasOnly` allowlist on create+update so
      `admin`/`isAdmin`/`role`/unknown keys are rejected — pre-empts the "server starts trusting a
      field" trap; add `joined` to the create blocklist); explicit `if false` for `rateLimits/**`,
      `webhookEvents/**`, `cache/**`; null-safe `isAdmin()` (`token.get('admin',false)`); rules tests
      per change.
- [x] **ISO-2 Prove isolation (regression suite)** — extend `tests/firestore-rules.test.js`: user A
      can't get/list/write B's subtree; no client reads config/audit/cache/rateLimits/webhookEvents;
      no user doc self-grants admin; every admin callable rejects a non-admin; `exportMyData` returns
      only the caller's data. The living proof of the §1 guarantee.
- [x] **ISO-3 Shared-device erasure hygiene** — self-delete + sign-out-everywhere clear
      `ci-profile-<uid>`/`ci-active-port` before signout (**fold into DI-2**).
- [ ] **ISO-4 Infra least-privilege + revocation + backup policy (go-live)** — least-privilege
      functions SA; token revocation on suspend/admin-revoke + `checkRevoked` on sensitive callables
      (**extends R31-6**); document PITR/backup retention + privacy-policy disclosure (ISO-D3).
- [x] **ISO-5 Deny-by-default `storage.rules`** — commit `users/{uid}/…` scoped storage rules (Storage
      unused today) so the tenancy boundary exists before any upload feature.

## R32. Research → Coins: custom drag-and-drop order  (✅ BUILT 2026-07-07)

Canonical spec + decisions R32-D1…D4: [`DESIGN-PASS.md`](../design/DESIGN-PASS.md) "Round 32". The Coins
view's Sort link is a dead anchor today; cards render value-desc.

- [x] **R32-1 Sort mode + pointer drag** — Sort toggles sorting mode; drag handle (≡) per card,
      pointer-based drag (mouse + touch, no deps), ArrowUp/Down keyboard moves; Done + Reset-to-auto.
- [x] **R32-2 Order model** — pure `applyCoinOrder(holdings, coinOrder)` (listed ids first, rest
      value-desc → default + new-coins-at-end for free); applied ONLY in the Coins view.
- [x] **R32-3 Persist + sync** — `coinOrder` array on the portfolio doc, saved per drop
      (`updateCoinOrder`, revert+toast on failure); `validPortfolioData` optional list ≤1000 + rules
      tests; carry `coinOrder` through the useAuthSession load AND the C-A3 metas merge (it rebuilds
      `{id,name,coins}` today and would drop the field).

## 0. Product direction — 2026-06-22 build roadmap  (NEXT — top priority)

Canonical decisions: [`PRODUCT-DECISIONS.md`](../decisions/PRODUCT-DECISIONS.md) (28 decisions; §8 settled
2026-06-22). Planning docs reconciled in [`docs/planning/`](../planning/). **This section is the
authoritative build order**, grounded in a full codebase audit (the audit notes are inline so the
order can't silently drift back to the stale spec).

§0 splits along ONE hard external boundary — the **Blaze plan + live API keys**:
- **Wave A — local-first:** fully buildable AND verifiable on the existing emulator stack now.
- **Wave B — Blaze + keys:** build the code + the offline-degrade path now; the live LLM path is
  only verifiable at go-live. Each Wave-B increment's DoD includes *"verified the offline fallback
  still works with keys unset"* so a green local suite is never mistaken for a verified live path.

**Locked numbers (2026-06-22 interview follow-up):** Premium ceiling **1,000 coins/portfolio** (the
*identical literal* in `DEFAULT_PLANS` + the `firestore.rules` hard clamp) · keep tx caps (Pro 2,000 /
Premium 5,000) · add-coin anti-abuse = **`addCoinGuarded` callable** · live-AI budget **per-uid
monthly $-ceiling** (`aiMonthlyCents`: Starter offline · Pro $4/mo ≈ ~13/day · Premium $25/mo ≈ ~80/day,
token-cost-metered — see PRICING.md §4) · news allowlist
**deferred** (Founders/Community show ⬛ until domains are supplied) · regen cap **N = 2** · App Check
**v1 manual `context.app`**, prod-flag gated · Claude/Gemini model ids resolved via the `claude-api`
skill at code time (never hardcoded from memory).

**Two separate caches (do NOT conflate):**
- **Prices — untiered, live for all.** The existing shared CoinGecko proxy (`cache/universe`: top
  ~1,250 @ 5 min, ~3,000 daily, history CDN-cached) serves the SAME fresh prices to every tier,
  Starter included. Prices are **never a tier lever** (flat-cost shared cache + this is a long-term
  conviction tool, not a trading app). Tier value = AI layer + capacity (coins/portfolios), not price speed.
- **AI conviction — shared per-coin, on-demand only, read-time TTL by tier.** One shared
  `convictionCache/{coinId}` doc, generated ONCE per coin and amortized across all users (**never
  per-user generation**). **On-demand only — no scheduled refresh job.** Pro/Premium can trigger a
  (re)generation for **any coin (held or searched), at any rank** when the cached entry exceeds their
  tier TTL — **Premium 24h · Pro 48h**; **Starter is read-only** (never triggers → reads the shared
  cache or ⬛). **No rank gate** — the monthly $-budget (`aiMonthlyCents`) + TTL are the only limiters,
  and a held coin always gets a lookup. Cache hits are free. Every user's PWA keeps a **local offline
  copy** of viewed coins (stamped "as of DATE"). **⬛ = insufficient-data is a *finding*, not a gap** —
  shown with a per-axis reason chip (`no public repo` / `no coverage` / `anonymous team`) and taught in
  Learn as a caution flag; **rank does not cause ⬛, thin sources do** (CoinGecko dev/community data +
  GitHub reach most of the ~3,000-coin universe; the realistic ⬛ frontier is the universe edge, not
  rank 500/1,250). **Accepted consequence:** Starter sees ⬛ for any coin no paid user has warmed (→
  "upgrade to check this coin" hook). NB: with the news allowlist deferred, Founders + Community are ⬛
  for *all* coins (incl. BTC) until domains are supplied — that's the allowlist, not rank.
- **Pulse / tutor** are per-user (not per-coin): cached per (uid + portfolio-hash + tf) with a TTL,
  live only for Pro/Premium within the monthly $-budget; Starter gets the data-driven offline summary.

### The one critical re-sequence
`0d` (the output validator) is **NOT** a later epic. [`ai-client.js`](../../src/features/research/api/ai-client.js)
is a single throwing stub — the instant the `0b` proxy swaps its body, raw LLM prose reaches the UI
with no filter. So: **build `validateOutput()` first (A9), wire it INSIDE the `0b` proxy (B2), and it
must be green BEFORE the client body-swap (B4).** No un-validated LLM output may ever reach the screen.

### Four "looks-done-but-isn't" traps (audited — must be honored)
1. **#20 hard ceiling is unenforced today.** `firestore.rules` `configuredLimit()` returns the
   configured number with **no clamp**, and the existing "configured limits override defaults" test
   *proves* config beats defaults. Add a literal `min(config, 1000)` clamp in the rule (mirrored in
   `mergePlans`); the new test must set config *above* 1,000 and still reject. A finite *default* is
   not a ceiling. ✅ **Resolved in A1** — `configuredLimit` clamps to a per-key `hardMax` (coins 1,000),
   mirrored by `mergePlans`; the rules test sets premium coins config to 5,000 and is still rejected at
   the 1,001st coin.
2. **App Check is decoration.** Zero server-side `context.app` checks exist (uniformly v1 `onCall`).
   Build the gate ONCE (B2) and reuse it for the add-coin callable (B3) — don't build it twice.
3. **#17 + a free Gemini key = a privacy violation that compiles.** Gemini's free tier trains on
   inputs; #17 sends journal text raw. The no-train **paid** key + the privacy disclosure must ship
   in the SAME commit as any journal-raw code; assert the no-train requirement at the call site.
4. **Stale `dist/` still ships the named investors.** `0g`'s DoD = `npm run build` then grep `dist/`
   for the names → expect zero hits (a build-time guard test). ✅ **Resolved in A2** —
   `scripts/check-dist-names.js` (case-sensitive whole-word) runs inside `build` and fails it on any hit.

Plus the highest-consequence line in the build: the validator must **fail CLOSED** (judge
error/timeout or regen-cap-reached → safe fallback, never the violating text) — the opposite of the
usual "degrade to showing something" instinct, and easy to get subtly wrong.

### Wave A — local-first (ship + fully test on the emulator now)
- [x] **A1 · 0a-core (#19/#20):** ✅ DONE 2026-06-23 — `DEFAULT_PLANS`+`mergePlans` (functions) → Pro
  3/50 · Premium 15/**1000** (Starter 1/10 unchanged); `firestore.rules` defaults updated **+ the hard
  clamp** (`configuredLimit` per-key `hardMax`; coins clamped to 1,000, mirrored by `mergePlans`
  `Math.min(coins,1000)`); Free→**Starter** LABEL only (internal key stays `free`) across
  admin-dashboard / Login / CryptoIdea / index.html + all limit mirrors (useUpgrade, useAdminDashboard);
  removed a dead stale `MAX_COINS=200` const. New `test:rules` cases prove pro-50 and the clamp (config
  5,000 → still rejected at the 1,001st coin); diagram updated. An adversarial audit confirmed the clamp
  airtight server-side (per-user `premiumLimits` is client-display-only — no rule reads it).
  **Verified:** rules 14 · unit 134 · integration 6 · build clean.
- [x] **A2 · 0g-copy (#4/#24):** ✅ DONE 2026-06-23 — de-named `Learn.jsx` (module sub + disclaimer),
  replaced the Graham landing pull-quote with a first-party anti-FOMO line ("The coins that hurt most
  are the ones you couldn't explain."), and polished the Login tagline → "Know why you own every coin."
  Build-time `dist/` name-guard (`scripts/check-dist-names.js`, case-sensitive whole-word, pure matcher
  unit-tested) wired into `npm run build` so a leaked name FAILS the build (trap 4).
- [x] **A3 · enabler:** ✅ DONE 2026-06-23 — verified the forwarded coins carry `journal` end-to-end
  (`getCoins` returns it; `Research.jsx` passes the full `portfolio` to `ResearchTab`). The only loss
  was `holdingsFromCoins` (research `utils/coins.js`) dropping it in the holdings transform — now
  preserved (present-only); `computePortfolio`'s `...h` already carries it through to
  `portfolio.holdings`, so it reaches `ResearchTab`'s consumers (the future #17 AI context + 0d
  allowlist). Tests: `research-adapters` adds journal-preservation + a `computePortfolio`
  pass-through guard. **Verified:** unit 136 · build clean.
- [x] **A4 · 0f-persist (#23):** ✅ DONE 2026-06-23 — `users/{uid}/learn/progress` doc +
  `validLearnProgress()` rule (owner-only; bounded+typed `{xp, streak, lastActivity, completedLessons[],
  updatedAt}`, `hasOnly` blocks junk keys) + `getLearnProgress`/`saveLearnProgress` (mirror the journal;
  zeroed default for a fresh learner). Persistence only — UI wiring is A5; level/badges/module-state are
  *derived*, not stored. Tests: `test:rules` (owner write/read; stranger + malformed rejected) +
  `test:integration` (default → save → read-back). **Verified:** rules 15 · integration 7 · unit 136 ·
  build clean.
- [x] **A5 · 0f-logic (#25):** ✅ DONE 2026-06-23 — pure `utils/learn.js` (levelFromXp / streakOn /
  completeLesson / moduleStates / nextLesson, all unit-tested) + `useLearn` hook (loads A4 progress,
  persists **quiz-gated** completions, degrades gracefully when signed out) + `Learn.jsx` fully wired
  (real level/XP/streak/badges/module-state, sequential module unlock, quiz-gated lesson overlay). Seed
  content in `src/data/learn-content.js` (2 modules / 4 real lessons, no-names voice) — **A7 expands** to
  ~9 modules / ~50 lessons. Tests: unit pure (16) + hook (4) + component (3); walkthrough/smoke updated.
  **Verified:** unit 159 · build clean.
- [x] **A6 · 0f-journal-widen (#27):** ✅ DONE 2026-06-24 — `validJournal` now allows an OPTIONAL
  bounded `funnel{dilution,volume,yield}` (new `validFunnel`: each field optional string ≤2000,
  `hasOnly` blocks junk keys, whole funnel optional → backward-compatible). The three manual-research
  findings are captured as inputs on BOTH surfaces (Search Buy-Journal + Journal detail overlay,
  editable since the checks happen over time); single source of truth for the fields/copy in
  `src/data/journal-funnel.js`, pure `cleanFunnel` (`utils/journal.js`) drops empties so an all-empty
  funnel persists no key. New `saveFunnel` handler mirrors `reviewThesis`. Tests: rules (valid/partial
  accepted, **no-funnel still valid**, oversized/unknown-key/non-string rejected), integration
  (write→read→clear round-trip + no-funnel back-compat), unit (cleanFunnel + Search capture + Journal
  edit). **Verified:** unit 168 · rules 16 · integration 8 · build clean.
- [x] **A7 · 0f-content (#23/#24):** ✅ DONE 2026-06-24 — authored the full **9-module / 50-lesson**
  Learn library, **no-names** voice, hand-authored quizzes. Split one file per module under
  `src/data/learn/` (markets · fundamentals · tokenomics · demand · yield · risk · psychology ·
  security · thesis); `learn-content.js` is now the composing index. The A5 seed lessons
  (markets-1/2, fundamentals-1/2) are preserved verbatim (test-locked). Curriculum maps to the app:
  the #27 manual checks (dilution/volume/yield) + the #26 funnel↔signals bridge are taught explicitly
  (`thesis-1`). Test `tests/unit/learn-content.test.js`: 9 modules/50 lessons, every lesson has 4
  options + an in-range `correctIdx`, unique ids, **no author names** (reuses the build's
  `findForbiddenNames` guard so the list can't drift), and varied answer positions. **Verified:**
  unit 176 · build clean (name-guard passing).
- [x] **A8 · 0c-pure (#8/#9/#11):** ✅ DONE 2026-06-24 — pure rubric reducer
  `src/features/research/utils/conviction.js` (`reduceAxis` / `activeCatalysts` / `computeConviction`):
  the **≥2-source accuracy gate** (#8 — fewer corroborating sources → ⬛, never a single-source guess),
  the **4-state rubric** (#9 — all-good→🟢, conflict/any-mixed→🟡, corroborated-bad/dead→🔴, thin→⬛
  with a per-axis **reason chip**, never a silent blank), and **catalyst auto-expiry + as-of date**
  (#11). The 4-state pills in `CoinCard.jsx` are lit from it, driven by a deterministic **mock seam**
  (`data/mock-conviction.js`) that swaps for the live per-coin cache in one place at Wave B; the #26
  funnel↔signals bridge note renders with the pills. Tests: `tests/unit/conviction.test.js`
  (single-source→⬛, thin→⬛, conflict→🟡, any-mixed→🟡, corroborated-bad→🔴, catalyst expiry, all-⬛
  degrade, mock determinism) + `CoinCard.test.jsx` (pills + ⬛ reason chip + catalyst). **Verified:**
  unit 194 · build clean.
- [x] **A9 · 0d-pure (#14/#15/#16):** ✅ DONE 2026-06-24 — `functions/validate-output.js` (server-side,
  CommonJS, **not** in the client bundle): `validateOutput(text, {allowedNames})` blocks unmentioned
  project names/tickers/cashtags (BTC/ETH/SOL excepted), price targets/valuations/multiples,
  buy/sell/hold advice + rating labels, %-/word-fraction allocation, and any aggregate score/grade —
  with a **de-obfuscation pass** (`b*u*y`, `B U Y`, `` `buy` ``). **Fails closed** (empty/garbage →
  invalid); `selectValidated()` encodes the **N=2** regen cap → safe fallback, never the violating
  text. Tests `tests/unit/validate-output.test.js` (23): per-category block/allow + fail-closed + the
  N=2 cap (incl. a clean candidate *beyond* the cap is NOT reached) + a **red-team regression set**
  (a 6-agent / 63-probe adversarial sweep; the prefilter blocks 58/63 with **zero false positives**,
  the 5 it defers — English-word names like Avalanche/Near/Maker, a bare "solid 8", a slang adverb —
  are by design the B2 LLM judge's job, per #15). **Verified:** unit 217 · build clean. Consumed in B2.

**✅ Wave A (local-first) COMPLETE — A1–A9 all done.** Everything buildable + verifiable on the
emulator stack is shipped: the tier reconfig + hard clamp, the no-names voice + dist guard, the
journal/funnel + Learn library, the conviction rubric, and the fail-closed output validator. What
remains (Wave B below) needs the **Blaze plan + live API keys** — the secure AI proxy that wires the
validator (A9) in and body-swaps `ai-client.js`. Build order for Wave B is unchanged: B1 → B2 (keystone,
validator wired + App Check + rate limit) → B3 → B4 (the gated body-swap) → B5/B6/B7/B8.

### Wave B — Blaze + keys (code + offline-degrade now; verify live at go-live)
- [ ] **B1 · 0b-secret-store:** Anthropic + Gemini keys in the locked `config/app` doc + admin
  Settings fields (set-flags only, `keep()` idiom). The Gemini key **must be a paid no-train key**
  (trap 3) — document it in `functions/.env.example` + README.
- [ ] **B2 · 0b-proxy (KEYSTONE, extends N-3):** `researchAsk` callable — Claude (prose) / Gemini
  (structured) **+ `validateOutput` (A9) wired in, fail-closed** + per-uid **Firestore** monthly
  $-budget (`aiMonthlyCents`, token-cost-metered — see PRICING.md §4) + **`context.app` App Check gate**
  (v1, prod-flag) + server-side tier-gate. Extract guard/budget/validator logic as pure helpers and unit-test them.
- [ ] **B3 · 0a-antiabuse (#20):** `addCoinGuarded` callable — **reuses B2's per-uid limiter + App
  Check gate**; the client write path routes through it. Closes #20's rate-limit + the write-path App
  Check. Integration throttle test (rapid adds → `resource-exhausted`).
- [ ] **B4 · 0b-swap:** swap the `ai-client.js` body to call `researchAsk` (keep the *resolve-string /
  reject* contract so the hooks' offline fallback survives). **LAST step, gated on A9 + B2 green.**
  Lights up Pulse AND Ask at once. Decide the validator's return contract first (throw → offline note,
  vs a distinct "we held this back" payload — currently undefined).
- [ ] **B5 · 0c-live (#6/#7/#10/#17):** GitHub / news-allowlist / CoinGecko-fundamentals fetchers (the
  LLM never web-searches) + `getConviction(coinId)` callable backed by the shared per-coin
  `convictionCache/{cgId}` (server-write-only). **On-demand only — no scheduler;** the callable
  (re)generates only when a Pro/Premium caller's tier TTL is exceeded (**Premium 24h · Pro 48h**),
  else serves the cached doc; **Starter is read-only** (never triggers → cached doc or ⬛). **No rank
  gate** — any coin (held or searched), any rank; budget + TTL are the only limiters. Cold runs charge
  the daily budget; cache hits are free. Emit **per-axis ⬛ with a reason** (`no public repo` / `no
  coverage` / `anonymous team`) — ⬛ is a finding, not a blank. **#17 privacy disclosure in the same
  commit.** Extend `safeProviderOrigin()` to the allowlist (empty → Founders/Community stay ⬛). Rules
  test: clients can't read the cache doc.
- [ ] **B6 · 0e-live (#11/#12):** Pulse as its OWN AI surface — **per-user cache** (uid +
  portfolio-hash + tf) with a TTL, tier-gate (live for Pro/Premium; Starter = data-driven offline
  summary), validator + "as of DATE". (Pulse & Ask share the seam but keep separate caches/gates.)
- [ ] **B8 · offline copy (PWA):** persist each user's *viewed* conviction + Pulse results to the PWA
  local store, shown stamped "as of DATE" when offline or during a backend outage. Mirrors the
  existing price offline-fallback; per-user local mirror only (no extra generation).
- [ ] **B7 · 0f-tutor (#21):** Premium templated tutor — **template-first** ({coin}-substitution, zero
  LLM cost); any live elaboration is optional, gated to Premium, and routed through the validator.

### Gaps to track (not yet owned by an increment)
- ~~**#1 (the moat)**~~ ✅ DONE 2026-07-03 (`c02e4db`): the MOAT walkthrough test — buy-time thesis → Journal →
  a real holding → Research conviction pills + the #26 bridge note → Learn's "Building Your Thesis" module.
- **#2 responsive:** add *"verify mobile + desktop layout"* to the DoD of every UI increment (A8 pills,
  A5 Learn, B6 Pulse) — manual narrow-viewport check, no automated visual test exists.
- **#26 bridge copy** ("these signals cover steps 1–2; you apply 3–5") — make it a tested deliverable
  wherever signals/funnel fields render (easy to omit on one surface).
- ~~**Diagrams**~~ ✅ DONE 2026-07-03 (`ecedf4a`): `conviction-engine.svg` (Wave-B lane labeled TARGET),
  `learn-surface.svg`, `subscription-lifecycle.svg` (supersedes the old paypal-flow tier semantics).

### Still genuinely open (does NOT block Wave A)
- ~~CoinGecko plan tier under on-demand engine load~~ **DECIDED 2026-06-27: CoinGecko Lite (~100k/mo), keep `HOT_PAGES=5`** (see [`BACKEND-ADMIN-DECISIONS.md`](../decisions/BACKEND-ADMIN-DECISIONS.md) D16).
- ~~Which model runs the `0d` judge~~ **DECIDED 2026-06-27: Claude only (Opus 4.8)** for both prose and structured — there is no Gemini, which **voids trap #3** (the Gemini no-train key requirement). See D17.

---

## BL. Backend & admin go-live — 2026-06-27 deep-dive + decisions

Canonical: [`BACKEND-ADMIN-DECISIONS.md`](../decisions/BACKEND-ADMIN-DECISIONS.md) (full workflow map, 27-gap inventory,
18 locked decisions D1–D18, founder provisioning checklist). A 14-agent codebase audit found the gaps; the
founder interview locked scope. **Founder chose the full secure path:** live AI in v1, server-enforced
signups, admin 2FA. This section is the **build order** for those decisions; it composes with §0 Wave B and
§U Wave B (shared App Check / Identity Platform). Each item = a small increment to the AGILE.md Definition of Done.

### BL-1 · Security foundation (✅ BUILT 2026-07-03 — commits `5f0ad13` guards + `e497f82` billing)
- [x] **Shared per-uid rate limiter (Firestore) + `context.app` App Check gate** — ✅ `functions/guards.js`
  (`consumeDailyBudget` w/ UTC `dayKey` per **C16** · `checkCooldown` · `appCheckOk` prod-flag gated),
  pure + dependency-injected, 8 unit tests (in-memory Firestore fake); `rateLimits` pinned server-only by a
  rules test. Wave B's B2/B3 + C-B2 **reuse these** — don't rebuild.
- [x] **PayPal webhook idempotency** — ✅ transactional `webhookEvents/{event.id}` create-if-absent (dupes
  ack'd + skipped); `serverTimestamp()`→`Date.now()`; `billingCycle` persisted at `createSubscription`
  and `getStats` now prices annual payers at `priceYear/12` w/ amortized fees (`billing.computeRevenue`).
- [x] **`createSubscription` already-paid guard + per-uid 60s cooldown** — ✅ (guard skips a *cancelled*
  sub so the R29 re-checkout can re-buy); live-verified: rapid 2nd call → `resource-exhausted`.
- [x] **Audit expansion** — ✅ `selfDeleteAccount`/`selfRestoreAccount`/`signOutEverywhere`/`exportMyData`/
  `createSubscription`/`cancelSubscription` all `writeAudit` (D11).
- [x] **Quick admin fixes** — ✅ `lookupUser` returns `tierBeforeFailure`+`premiumLimits`+`emailVerified`
  (+`billingCycle`); premium custom-limit-`0` respected (`!=null`, mirrors the rules' `.get(key, default)`);
  admin Overview shows an explicit "Couldn't load stats" error instead of a $0 dashboard.
- [x] **R29 billing follow-ups (ERRORS.md B8)** — ✅ `functions/billing.js` (pure, 22 tests):
  `plan_id`→tier on ACTIVATED (Premium lands as premium); SALE.COMPLETED never sets tier blindly (only
  restores `tierBeforeFailure` on recovery); CANCELLED/SUSPENDED mark the sub (endDate =
  `next_billing_time`) with **no immediate tier drop**; `cancelSubscription` marks
  `{cancelled, downgradeTo, endDate}` honoring access-until-period-end; NEW daily
  **`enforceSubscriptionPeriods`** sweep does the server-side flip (a "pro" target keeps its marker for the
  R29 re-checkout; payment failures drop after the 7-day grace). *Live PayPal e2e stays a go-live check.*

### BL-2 · Admin panel capabilities (✅ BUILT 2026-07-03 — commit `561d22d`)
- [x] **Grant/revoke admin UI** — ✅ type-the-email-to-confirm wrapper over `setAdminClaim` in the user detail
  panel (MIN_ADMINS enforced server-side). *The admin-MFA gate (D7) layers on at go-live with U15.*
- [x] **Admin soft-delete + Empty-trash bulk action** (D8) — ✅ `adminTrashUser` callable (refuses admins —
  demote first) + "Move to trash" two-tap; "Empty trash" bulk purge w/ confirm (also closes §4b N-2).
- [x] **Admin "sign out of all devices"** for a target user — ✅ `adminSignOutUser` (audited) + button (D9).
- [x] **Reserve the AI Settings section** — ✅ "AI (reserved)" card: Anthropic key set-flag via `keep()`
  (never echoed) + visibly disabled conviction-cache controls that activate with B5 (D10).

### BL-3 · AI proxy (Claude-only) — extends §0 Wave B; validator-first
- [ ] **B1** Anthropic (Claude) key in `config/app` + AI Settings (set-flag). **No Gemini** (D17 voids trap #3).
- [ ] **B2 (keystone)** `researchAsk` callable — Claude prose + structured + **`validateOutput` (A9) wired in,
  fail-closed** + per-uid daily budget (BL-1 limiter) + **`context.app` gate** (D4) + server tier-gate.
- [ ] **B3** `addCoinGuarded` — reuses the BL-1 limiter + App Check gate.
- [ ] **B4** swap `ai-client.js` body → `researchAsk` (gated on A9 + B2 green); lights up Pulse + Ask and
  **flips the AI "coming soon" label → the real metered number** (D13).
- [ ] **B5–B7/B8** per-coin `convictionCache` + `getConviction` (on-demand, TTL by tier), Pulse per-user
  cache, PWA offline copy, templated tutor (as §0 Wave B, Claude-only).

### BL-4 · Identity Platform hardening (needs Blaze + console)
- [ ] **U14** `beforeCreate` blocking function enforcing `signupsEnabled` server-side + IP rate-limit; enable
  App Check enforcement in console (D2/D4).
- [ ] **U13** server password policy (Identity Platform require-mode).
- [ ] **U15** admin MFA (TOTP enrollment + challenge in the admin app) (D3) — **gates BL-2's grant UI**.
- [ ] **Subscription-decision callables (from the BL-1 adversarial review, 2026-07-03):** the server-side
  `subscription` marker is now **owner-immutable** (rules) and the sweep trusts it — so at go-live the
  client's pending-downgrade decisions need server counterparts: **`reactivateSubscription`** ("Keep my
  plan" → PayPal reactivate + clear the marker) and **`resolveRecheckout`** (decline → clear the marker
  server-side; approve is just the normal Pro checkout). Locally the client model (localStorage) covers
  both, so nothing is blocked — but WITHOUT these, a server-written marker outlives the client's decision
  and the R29 re-checkout popup would re-appear on every load after a real PayPal cancellation lapses.

### BL-5 · Transactional email + legal/analytics + CSP
- [ ] **GetResponse transactional path** (welcome / verification / receipts) — makes `email.fromEmail` real
  (D14/D15/D18). Confirm the GetResponse plan supports transactional/SMTP.
- [ ] **Termly (3 IDs) + cookie banner + Plausible** into Settings; verify privacy/terms pages (D18).
- [x] **Drop `unsafe-inline`** — ✅ BUILT 2026-07-03 (`c483d60`): script-src no longer allows inline; landing/SW/Termly
  scripts externalized to `public/` (dist ships ZERO inline scripts; style-src keeps 'unsafe-inline' for style attrs).

### BL-6 · Display honesty + docs cleanup (quick; can run early)
- [x] AI allowance line — ✅ superseded by **C-A4** (meter removed entirely; users read "Live").
- [x] `email.fromEmail` labeled **"reserved — not sent from yet"** in admin Settings (D14). ✅
- [x] Stale `functions:config:set` docs fixed (§4); `.env*` + `*service-account*.json`/`*serviceAccount*.json`
  confirmed git-ignored. ✅

### BL — minor/optional hardening (low, undecided)
- Lock `/api/subscribe` CORS to own-origin (read proxy can stay open).
- Optional periodic `/api/config` re-poll so maintenance mode evacuates already-open sessions.
- In-app "estimated price" signal when CoinGecko degrades (moot once Lite is bought; keeps resilience honest).

---

## C. Caching policy — 2026-06-29 cache deep-dive + decisions

Canonical: [`CACHE-POLICY.md`](../decisions/CACHE-POLICY.md) (6-agent cache audit, the 4-tier model mapped to code,
12 locked decisions C1–C12). **The market-data layer is already built and cost-effective — it *is* the
4-tier model in code.** The open work is the **AI tier** (planned, unbuilt) plus small UX/correctness
cleanups. North star (C6): **caching is an internal cost lever, invisible to users — everything reads
"live"; store the freshness metadata so it *can* be surfaced later.** This section is the build order;
it **refines** (does not duplicate) §0 Wave B + §BL — the convictionCache/TTL/allowlist items below
extend B5/B6/BL-2, they don't replace them.

### C-A · Now — ✅ ALL BUILT 2026-07-03 (`55f5ad0` + `14f1516`)
- [x] **C-A1 · kill the stale mock date** — ✅ derived (yesterday) — — `mock-conviction.js` is stamped a fixed `2026-06-22` (reads
  stale today). Drive the mock "as-of" off a relative/today value (or drop the visible date) so the
  demo seam never shows a misleading date pre-live. (C6 hygiene.) *Tiny.*
- [x] **C-A2 · history-cache eviction** — ✅ LRU 50 + unit tests — — `src/hooks/useCoinHistory.js` `_cache` Map has no eviction
  (unbounded session growth). Add a small LRU cap (~50 coins). Unit-test the eviction. *Tiny.*
- [x] **C-A3 · multi-device listeners (C12)** — ✅ watchPortfolios + active-portfolio watchCoins (changed-coins-only tx re-reads) + watchLearnProgress; integration + live browser-verified (a bypass write moved the UI with no reload) — — replace fetch-once-on-auth with `onSnapshot` on
  owner-only data (portfolios / coins / journal / Learn) so a second device's edits appear live. Bounded
  to owner docs (no fan-out). DoD: emulator integration test (write on ctx A → ctx B sees it); confirm
  no extra reads on the hot path beyond the active portfolio.
- [x] **C-A4 · hide the user-facing AI meter (C7)** — ✅ row reads "AI research · Live", no numbers — — remove the U9 AI-allowance meter from the user
  Account UI (usage/cost becomes admin-only, see C-B7). Users see "AI: live". **Supersedes BL-6/D13**
  ("coming soon until metered" → never user-facing). Update U9's note + USER-SETTINGS. *Small.*

### C-B · Wave B — needs Blaze + keys (refines §0 Wave B / §BL)
- [ ] **C-B1 · validator wired fail-closed (P0)** — restated keystone: `validateOutput` (A9) runs INSIDE
  the B2 proxy, fail-closed, **before** the B4 body-swap. Error contract: throw → offline fallback,
  never the held-back text. (Same as §0 "the one critical re-sequence" — listed here as a P0 gate.)
- [ ] **C-B2 · per-uid AI budget = monthly $-ceiling (`aiMonthlyCents`) (C3)** — build BL-1's
  limiter to decrement a per-uid **monthly** counter by the **actual token cost** of each call, capped
  at the plan's `aiMonthlyCents` (Starter $0 / Pro $4 / Premium $25). **Reconciles the 3 conflicting
  specs** (daily count vs. token-decrement vs. `aiMonthlyCents`) → the **$-ceiling** is the ceiling
  (a call-count isn't margin-safe). Server-enforced, never user-visible (C6/C7); shown as
  "~N analyses/day". Canonical: PRICING.md §4.
- [ ] **C-B3 · App Check + `addCoinGuarded` alongside the proxy (C11)** — every *novel* coin = one paid
  cold run, so the per-uid add-limiter + `context.app` gate ship in the **same** Wave B push (B2/B3),
  before exposure. (Already mandated #20/D4/D5 — C11 confirms the sequencing.)
- [ ] **C-B4 · convictionCache TTL: admin-editable + hard-capped (C4/C5) + lazy invalidation (C9)** —
  extends **B5**. Read-time TTL Premium 24h / Pro 48h / Starter read-only; the TTLs are `config/app`
  knobs **clamped to safe min/max** (price ≥5min, conviction ≥12h — mirror the #20 `min(config,hardMax)`
  clamp). Editing the news allowlist marks conviction **stale → regenerate on next view** (no eager
  burst). Stamp hidden `cachedAt`/`asOf` on every cache doc (C6).
- [ ] **C-B5 · news allowlist = admin CRUD + seed + frontend wiring (C8)** — extends **B5 + BL-2 (D10)**.
  Admin panel add/delete domains, seeded with founder-approved defaults, wired to the **Founders &
  Community** axes (and Ask sources, C10). Replaces the "deferred / no owner" status — without it those
  two axes ship permanently ⬛. `safeProviderOrigin()` reads the live allowlist.
- [ ] **C-B6 · Ask reuses shared caches + sources allowlist (C10)** — extends **B6**. Ask reads cached
  conviction/price/news data and cites only allowlisted domains; no fresh per-question fetch.
- [ ] **C-B7 · admin AI usage/cost dashboard (C7)** — the hidden meter's home: per-uid + aggregate AI
  usage and $-cost in the admin app (with the C-B2 counter). Reserve under BL-2's AI Settings section.

### C-R2 · Second-pass gaps (2026-06-29 — C13–C16 + fixes; mostly local)
A deeper adversarial sweep found gaps outside C1–C12 (full detail + evidence in `CACHE-POLICY.md` §3
round-2 + §4 🔵). Decisions locked; build order:
- [x] **C-R2a · own local persistence (C13) — ✅ BUILT 2026-06-30 (`48ed974`)** — `window.storage` was
  referenced but defined nowhere, so "remember active portfolio" + the profile cache silently no-op'd AND
  `logout()` couldn't clear them (latent shared-device leak). Fixed: `src/utils/storage.js` now backs `db` with
  real `localStorage` (same async interface + error-swallowing degrade — no call sites changed); `logout()`
  clears `ci-active-port` + `ci-profile-<uid>`. Tests: new `storage.test.js` (round-trip/del/missing/corrupt/
  quota-degrade) + smoke asserts logout clears the keys. Verified end-to-end in-browser. 319 unit green.
- [x] **C-R2b · `cache/universe` size guard (C14)** — ✅ `universe-utils.trimUniverse` (worst-rank-first, never throws, unit-tested) — — one doc is ~67% of the 1 MiB hard limit at ~3,000
  coins; a >1 MiB write throws and breaks BOTH front-ends. Wrap the write (`functions/index.js:827`): log/
  alert above ~850 KiB, **trim the lowest-rank tail instead of throwing**; hold `UNIVERSE_PAGES` ≤ 12. No
  sharding yet (KISS). Test: a synthetic oversized universe trims + logs, never throws.
- [x] **C-R2c · audit retention (C15)** — ✅ daily `purgeOldAudit` (12 months) + privacy.html disclosure — — keep audit logs (legitimate-interest); add a scheduled
  **audit-TTL purge** (fixed N months) so entries age out regardless of account deletion, + a retention
  line in `privacy.html`. No per-account scrub. *Purge job local; disclosure copy now.*
- [x] **C-R2d · budget reset = UTC midnight (C16)** — ✅ already baked into `guards.js` `utcDayKey` (BL-1a); C-B2 reuses it — — bake a UTC `dayKey` (`YYYY-MM-DD`) into the C-B2
  per-uid counter schema. **Lock before building the counter.** *(Wave B, with C-B2.)*
- [x] **C-R2e · fix fire-and-forget writes** — ✅ toggleSetting + saveLearnProgress await + revert + toast — — `toggleSetting` (`CryptoIdea.jsx:280`) + `saveLearnProgress`
  (`useLearn.js:52`) don't await/catch → a flake silently drops a settings toggle / earned XP. Await +
  revert + toast on failure (match `addCoin`/`addEntry`). *Local. Obvious fix, no fork.*
- [x] **C-R2f · universe write-contention + stampede + history prune** — ✅ transactional freshness-guarded fold-back + `coalescedSimplePrice` + daily historyCache prune — — guard the on-demand fold-back
  (`:951`) with a per-coin `at` freshness check; coalesce duplicate in-flight long-tail fetches (`:937`)
  via a module-level `{coinId→Promise}` map; prune `historyCache` docs older than `HISTORY_TTL` on the
  daily job. *Local; obvious fixes, batch when convenient.*

### Refinements applied to existing items (so they don't drift)
- **§0 Wave B price bullets:** unchanged — C1 confirms 5-min shared prices stay, presented as "live."
- **B5 (conviction):** now carries C4/C5/C9 (admin-capped TTL knobs + lazy allowlist invalidation) and
  the C8 admin-CRUD allowlist; B5's "news allowlist deferred" note is now **owned** by C-B5.
- **B6 (Pulse/Ask):** Ask gains the C10 sources-allowlist contract.
- **U9 (AI meter):** flipped from user-facing to admin-only by C-A4/C7.

### DoD (every C-increment)
KISS + secure; `test:unit` / `test:rules` / `test:integration` green; **no user-facing freshness date or
budget number** (C6); TTL knobs proven clamped by a rules/unit test (a config below the floor is rejected
or clamped); verify mobile + desktop; committed; [`CACHE-POLICY.md`](../decisions/CACHE-POLICY.md) updated if a
decision changed.

---

## U. User accounts & settings — 2026-06-24 build roadmap  (parallel track)

Canonical specs: [`USER-CREATION.md`](USER-CREATION.md) + [`USER-SETTINGS.md`](USER-SETTINGS.md)
(26-gap audit, 12 founder-locked decisions, 2026-06-24 interview). Reusable frameworks: the
`user-creation` + `user-settings` skills. **Runs parallel to §0** — it touches the auth /
account / settings surface, not the conviction engine; the only overlap is the go-live App
Check / MFA items (shared with §4). Same split as §0: **Wave A** = buildable + emulator-verifiable
now; **Wave B** = Blaze / Identity Platform (code now, verify at go-live).

> Build the foundation first: **U1 rules → U2 registration → the rest.** TDD per the AGILE.md
> DoD — write the `test:rules` / `test:unit` case first, never finish red. Two decisions went
> *beyond* the KISS default: **U6** builds the sign-out-everywhere revoke callable now, and
> **U11** implements `premiumLimits` end-to-end (not a stub).

> **Progress (2026-06-25): ALL of Wave A (U1–U12) is DONE** — committed; unit 238 /
> integration 10 / rules 20 all green. Includes full light/dark/system theming (U8,
> verified in-app) and `premiumLimits` end-to-end (U11, rules-enforced + clamped).
> **Remaining: only Wave B (U13–U15)** — go-live items needing Blaze + Identity Platform
> / App Check console config (not locally buildable; code sketches in USER-CREATION §6) —
> plus the deferred `currency` Intl.NumberFormat wiring. Two server callables added this
> pass — **U6 `signOutEverywhere`** and **U11 `setPremiumLimits`** — are wired +
> rules/UI/wrapper-tested; exercising the Admin-SDK writes needs a functions-emulator
> restart (new triggers register on restart), and the **U12 `tierBeforeFailure`** webhook
> path is syntax-checked but verifies live with the PayPal webhook (all go-live).

### Wave A — local-first (build + verify on the emulator now)

- [x] **U1 · rules + data model (FOUNDATION — do first):** add `validUserData()` (name 2–50),
  `validConsent()`, `validSettings()` (closed / typed / size-capped) to `firestore.rules`; add
  `premiumLimits` to the owner-update blocklist; shape-check `name` / `settings` / `consent` when
  present on create AND update. `test:rules` FIRST: happy path + every reject branch (oversized
  name, junk settings key, owner writing `premiumLimits` / `tier` / `deleted`). No data migration.
  Refs: USER-SETTINGS §4–5, USER-CREATION §4.
- [x] **U2 · atomic registration + server validation + consent:** `registerUser(email,pw,name,consent)`
  → ONE `writeBatch` (user doc + default portfolio + `portfolioCount:1`); server-side trim/bounds the
  name + email; write the `consent` record + `settings` defaults; fix the pw error `6`→`8`; add a
  `verifyEmail()` resend. Integration test: register → doc shape + consent + atomicity. USER-CREATION §2–5.
- [x] **U3 · register form (consent + skip):** Terms-required + Privacy-required checkboxes (links) +
  marketing opt-in (default off); submit gated until both required are checked; pass `consent` through.
  Add a "Skip for now / Explore Starter" button to the plan picker. Component tests (gating, default-off,
  skip nav).
- [x] **U4 · email-verify nudge:** `useAuthSession` reads `fbUser.emailVerified` → a non-blocking,
  dismissible banner + Resend on Portfolio. Hook/component tests (verified → none; unverified → banner).
- [x] **U5 · re-auth core + delete hardening (S5/S6):** one shared `confirmPassword()` helper
  (`reauthenticateWithCredential`, catch `auth/requires-recent-login`) + a reusable modal; gate
  account-delete behind **type `DELETE` + confirmPassword** in an isolated red Danger Zone. Tests:
  modal flow, wrong-pw error, delete needs both gates.
- [x] **U6 · Security tab (S7):** change-password form behind re-auth → `updatePassword` (same
  8+/Aa1+special rule); **`signOutEverywhere` callable** (`admin.auth().revokeRefreshTokens(uid)`) +
  button. Tests: unit (form) + integration (callable auth-gated + revokes).
- [x] **U7 · Profile tab (S10):** editable display name (`updateProfile` + `saveProfile`, 2–30,
  explicit Save + inline "Saved"); change-email behind re-auth via `verifyBeforeUpdateEmail` (mirror to
  Firestore only after the link is clicked, on next login — never optimistically). Component tests.
- [x] **U8 · Notifications + Appearance + Privacy tabs (S3/S4):** a `settings` save handler; **auto-save**
  toggles with inline confirm — `emailDigest` / `emailMarketing` (notifications) + marketing /
  `consentAnalytics` (privacy, withdrawable); wire `settings.theme` light/dark/system via a root class +
  CSS vars + localStorage; store `currency` (formatting deferred). Tests: toggle persists, theme applies,
  shape valid.
- [x] **U9 · tier display:** surface `aiMonthlyCents` **server-authoritatively** (add it to
  `getUserProfile`) → an AI-allowance meter in Account; usage bars read the **configured** caps
  (`site.plans`), not hardcoded numbers. Tests: meter from the server value, bars from config.
  (The enforcement counter itself is §0 B2.)
- [x] **U10 · downgrade-trim fix:** pass `site.plans` into `useUpgrade` / `trimToTier` so a downgrade
  trims to the **configured** ceiling, not the hardcoded `TIER_LIMITS` (silent data-loss bug if an admin
  raised a cap). Unit + a rules-backed test with an overridden cap.
- [x] **U11 · premiumLimits end-to-end (S8):** `setPremiumLimits` admin callable + admin UI →
  `users/{uid}.premiumLimits`; `configuredLimit()` reads per-user `premiumLimits` first for premium
  (clamped to `hardMax`, coins ≤ 1,000 — #20); Account shows "custom vs default". Replaces the dead
  `CryptoIdea.jsx:277` override. Tests: rules (override enforced + clamped; owner can't write it).
- [x] **U12 · billing resilience (S9):** an "Update payment method" link (Pro+) → the PayPal-hosted
  flow; record `tierBeforeFailure` on a PayPal failure event so the paid tier survives an auto-downgrade;
  admin "last paid tier". Tests: link visibility, webhook handler.

### Wave B — Blaze / Identity Platform (code now, verify at go-live; shared with §4)

- [ ] **U13 · server password policy:** Identity Platform require-mode (`minLength ≥ 8` + char classes,
  `forceUpgradeOnSignin`); mirror client with `validatePassword()` for inline feedback.
- [ ] **U14 · abuse prevention:** App Check enforcement (set `VITE_RECAPTCHA_SITE_KEY`, enable in the
  console) + a `beforeCreate` blocking function that enforces `signupsEnabled` **server-side** + an IP
  rate-limit. (The App Check gate is shared with §0 B2/B3 — build it once.)
- [ ] **U15 · MFA/2FA:** Identity Platform TOTP enrollment in Account; required for admins (already on
  §4). Document as roadmap until then.

### Deferred (no increment yet)
- `defaultPortfolioId` server-side default-portfolio preference (Pro+).
- Restore cooldown (`restoreLockedUntil`, 24h) against delete/restore harassment.
- In-app PayPal vault card display (last-4 / expiry) — needs the vault API + an SSRF-safe proxy.
- Full channel × category notification matrix (push / in-app + frequency + quiet hours).
- `currency` formatting wired across all price/P&L displays (`Intl.NumberFormat`).

**DoD (every U-increment):** KISS + secure; `test:unit` / `test:rules` / `test:integration` green;
re-auth on every sensitive op; verify mobile + desktop layout; no secret shipped; rules verified in
the emulator; committed with a clear message; USER-CREATION / USER-SETTINGS updated if behavior changed.

---

## 1. Frontend refactor — finish extracting `CryptoIdea.jsx`  (IN PROGRESS)

We are moving the monolithic `CryptoIdea.jsx` (~1,000 lines, was 1,559) into the
layered structure `api / hooks / components / utils`. The mechanism is proven and
test-guarded; the rest is repeatable application.

**Done:** `api/` (firebase + coingecko + config), `utils/` (format, coins, theme),
`hooks/` (useCoinSearch, useLivePrices, app-context), shared UI primitives
(`ui.jsx`, `StatusDot`), screens `Loading` + `ForgotPass`, and a Vitest test net
(`npm run test:unit`, 8 tests).

### 1a. Extract the remaining screens (one commit each, via AppContext)
Pattern per screen: add its deps to the `ctx` object in `CryptoIdea.jsx` → move its
JSX to `src/components/<Screen>.jsx` reading them via `useApp()` → render `<Screen/>`
(not `Screen()`) → add/extend a navigation test → `npm run test:unit`.

Remaining (rough size order):
- [x] `Contact` (~17 lines) — extracted to `components/Contact.jsx` (reads context); 4 isolated tests
- [x] `Search` (~35) — extracted to `components/Search.jsx`; real nav test (login → Search tab → Add-Coin)
- [x] `AddEntry` (~42) — extracted to `components/AddEntry.jsx`; 4 isolated tests (new/edit/disabled/submit)
- [x] `CoinInfo` (~95) — extracted to `components/CoinInfo.jsx`; 4 isolated tests (held/not-held branches). Dropped dead `milestones` var.
- [x] `Detail` — extracted to `components/Detail.jsx`; 3 isolated tests (P/L summary, tx list, empty). Dropped dead `inv`/`pnl`/`pp` + orphaned format/coins imports.
- [x] `Account` (~148) — extracted to `components/Account.jsx`; 5 isolated tests (sub states, delete-confirm, logout) + a real nav smoke test (badge → Account). Dropped dead `totalCoinsAllPorts`.
- [x] `PortfolioBar` (~10, helper) + `Portfolio` (~55) — extracted to `components/`; 6 isolated tests (asset list, upgrade nudge, switcher branches) + smoke test. Cleaned 6 now-orphaned shell imports (fmtP/fmtPct/sb/CI/hdr/StatusDot).
- [x] `Login` (~110, incl. the upgrade/plan overlay reused as a shell overlay) — extracted to `components/Login.jsx`; 5 isolated tests (form, signups-paused, billing, plan picker) + smoke. **Fixed a real bug:** auth error used `c.rd` (undefined) → now `c.red`, so errors actually render red.

**✅ Section 1a complete — all user-app screens are now extracted components.** `CryptoIdea.jsx`
is now just the auth/data effects, handlers, the `ctx` object, and the router shell. Next: §1b (hooks).

### 1b. Extract business logic into hooks (closes audit rules 1 & 2)
Most state + logic still lives in the `CryptoIdea.jsx` component. Pull into hooks:
- [x] `useAuthSession` — extracted to `hooks/useAuthSession.js`: owns `user`/`dataLoaded` + the
  `onAuthChange` watch (incl. `loadPortfolios`) and profile auto-save effects; collaborators
  (`setScreen`/portfolio setters/`checkSubscriptionStatus`/`saveProfile`) injected via a ref so the
  listener subscribes once. Also moved the `db` storage helper to `utils/storage.js`. 4 hook tests
  (`renderHook`) + the existing login/logout smoke tests guard it.
- [~] `usePortfolios` — **state container extracted** to `hooks/usePortfolios.js` (owns `portfolios`/
  `activePortId`, derives `portfolio`/`setPortfolio`; 4 hook tests). The **CRUD handlers stay in
  `CryptoIdea.jsx` by design** — they're coupled to `user`/tier-limits (derived after `user`, which
  comes from `useAuthSession`) and UI/form state; hook-ifying them would need ~15 injected deps or a
  risky reorder of the auth↔load sequence (anti-KISS). Revisit only if a redesign makes it cleaner.
- [x] `useUpgrade` — **tier-limit business logic extracted** to `hooks/useUpgrade.js`
  (`calcEndDate`, `getTrimImpact`, `trimToTier`, bound to `portfolios`/`setPortfolios`). Also
  consolidated the **duplicated limits table** into one `TIER_LIMITS` constant. 6 hook tests
  (`renderHook`). The **UI-flow orchestrators stay in `CryptoIdea.jsx` by design** (`startUpgrade`/
  `startDowngrade`/`confirmDowngrade`): they drive overlay state shared with the auth/Login flow
  (`showPlan`/`upgradeStep`/`upgradeFlow`…), so hook-ifying them would only relocate ~7 setters
  without cutting coupling (anti-KISS) — same call as `usePortfolios`' CRUD.

**✅ Section 1b complete** — auth session, portfolios state, and tier-limit logic are now in
hooks. What stays in `CryptoIdea.jsx` (portfolio CRUD + upgrade-overlay orchestrators) is coupled
to UI/form/auth state by design; pulling it into hooks would relocate dependencies, not reduce
them. Next: §1c (move remaining backend calls / shared theme out of components).

### 1c. Move backend calls out of components (closes audit rule 1)
- [x] `CryptoIdea.jsx` calls `httpsCallable(functions, "exportMyData"/"deleteMyAccount")` directly. → Moved into `src/api/account.js` (`exportMyData()`, `deleteMyAccount()`); component imports them, no longer touches `httpsCallable`/`functions`. 2 tests.
- [x] `components/admin-dashboard.jsx` called Cloud Functions via `httpsCallable` directly. → Moved all 9 callables into `src/api/admin.js` (`getStats`/`listUsers`/`listAudit`/`lookupUser`/`setUserTier`/`suspendUser`/`deleteUser`/`getAdminConfig`/`saveConfig`); each wrapper unwraps the payload the dashboard needs. Component no longer imports `httpsCallable`/`functions`. 7 tests. **Kept as plain `api/` functions, not a hook** (KISS, same call as `account.js`): the dashboard already owns all its own state, so a hook would add a layer without cutting coupling.
- [x] `components/pro-success.jsx` defined a local `c` theme — now imports the shared `utils/theme.js` (`c.bg`/`c.txt`/`c.dim`/`c.ac`), dropped the unused `border` token.

**✅ Section 1c complete** — no user/admin component calls a Cloud Function or
defines its own theme anymore; all backend access lives in `src/api/*`.
**✅ Section 1 (frontend refactor) complete** — all of 1a/1b/1c are done.

---

## 2. Backend layering — OPTIONAL (audit rules 4–6: controllers/services/models)

`functions/index.js` (~870 lines) currently colocates HTTP routing (controller),
external CoinGecko/PayPal/email calls (services), and Firestore access (models).
This is a defensible choice for a single serverless function. **Only do this if you
want explicit MVC separation:**
- [ ] `functions/controllers/` — the `api` HTTP handler routing `/api/*`
- [ ] `functions/services/` — `coingecko.js`, `paypal.js`, `email.js` (external calls only)
- [ ] `functions/models/` — Firestore read/write helpers (cache, config, audit, users)

---

## 3. Known bug — FIXED (seed/schema mismatch, not an app bug)

- [x] **Seeded portfolios don't load / adding a coin silently fails.** Root cause: a
  **seed/schema mismatch**, confirmed not an app bug. `getPortfolios()` queries
  `orderBy("order")`, and Firestore **excludes any document missing the ordered field**.
  Real registration (`firebase-auth.js`) creates portfolios *with* `order` + `created`, but
  `seed-emulator.js` wrote `{ name, coinCount, createdAt }` with **no `order`** — so the
  seeded portfolios were dropped from the query, the app fell back to its in-memory
  `"default"` portfolio (which has no Firestore doc for that uid), and adding a coin then
  `update()`d a non-existent doc → "Couldn't add coin." Fix: `seed-emulator.js` now writes
  `order` + `created` (matching the app schema) and seeds real coins (BTC/ETH/SOL/…) so
  `pro@test.com` loads 2 portfolios with 6 + 4 coins. Verified by running the identical
  `orderBy("order")` query against the emulator (returned 2 portfolios, was 0).
  - Latent (out of scope, pre-existing): if `getPortfolios` ever returns empty for a
    logged-in user, the phantom local `"default"` would still fail on coin-add. Real users
    never hit this (registration always creates the default with `order`).

---

## GOLIVE. Production-readiness audit  (✅ Phase 0 BUILT 2026-07-20 · blockers remain)

Canonical: **[`GO-LIVE-AUDIT.md`](GO-LIVE-AUDIT.md)** — 74-agent audit, 60 adversarially-verified
findings, ordered runbook. Verdict at audit time: **not production ready, 6 blockers.**

- [x] **Phase 0 (code)** — commit `2cedafb`: spend caps (`maxInstances` on every public + scheduled
      export), the subcollection admin-write hole closed (`isAdminOwner()` + 2 regression tests),
      hosting cache headers scoped correctly, service-worker no longer caches authenticated
      cross-origin traffic, schedulers rethrow so failures are visible, and a deploy guard that
      blocks shipping the demo Firebase config. Itself adversarially reviewed (2 regressions caught
      and fixed pre-commit).
- [ ] **Remaining blockers** (all need a Firebase project or a founder decision): PITR + backups
      *before* first signup · real checkout (Path A free-only vs Path B paid) · published Privacy
      Policy + Terms · Blaze + billing budget · real project + `prod` alias · admin bootstrap.
- [ ] **First week:** App Check enforcement (in the right order), the Cloud Logging error alert,
      React error boundary, PayPal webhook test event.

### FLAKE. The test suites are flaky — "green" is not currently trustworthy  (📋 OPEN, found 2026-07-20)

**Integration (`test:integration:solo`): proven pre-existing.** Six runs gave 19/19, 18/19, 19/19,
17/19, and — with `functions/index.js` + `firestore.rules` reverted to HEAD — 18/19, 19/19. The
baseline flakes on the same test, so it is not caused by the Phase 0 diff. A *different* test fails
each run (`watchCoins` listener, the `suspendUser` pair), which is the signature of test pollution,
not a defect. Full table in `GO-LIVE-AUDIT.md` §3b.

**Unit (`test:unit`): also observed flaky 2026-07-20** — `tests/unit/CryptoIdea.walkthrough.test.jsx`
failed 2 of 26 on one run (~31s for that file alone) after passing 539/539 twice on **identical**
code with no source change in between. This matters more than the integration flakiness because the
new `.githooks/pre-push` gate runs the unit suite: a flaky gate either blocks good pushes or trains
you to bypass it.

**Suspected cause (both tiers):** shared state + timing. The integration suite runs two files in one
process against one emulator with a known shared-SDK ordering hazard; the walkthrough test is a long
multi-step render that clears uid-keyed `localStorage` per test. **Fix direction:** isolate state per
test file (separate emulator run / `clearFirestore` between files), and replace fixed-tick waits with
condition-based waits (`findBy*` / `waitFor`) in the walkthrough. Until then: **re-run before
believing a single red run**, and never bypass the hook — fix the flake instead.

**UNIT TIER RE-DIAGNOSED 2026-07-22 — it is machine load, not test pollution.** While verifying the
PR #5 dependency merge, an A/B on one machine under one load isolated the variable:

| Tree | vitest | Run shape | Result |
|---|---|---|---|
| PR branch (new deps) | 4.1.10 | `admin-dashboard.test.jsx` alone | **14/14 pass** |
| master (old deps) | 4.1.8 | `admin-dashboard.test.jsx` alone | **14/14 pass** |
| PR branch (new deps) | 4.1.10 | full suite (59 files) | 2 failed / 550 |
| master (old deps) | 4.1.8 | full suite (59 files) | **4 failed / 548** |

The same file passes **14/14 in isolation on both dependency trees**, and the *older* tree fails
*more* in the full run — so neither the code nor the dependency bump is the cause. Every failure is
a `waitFor` hitting the **5000ms default `testTimeout`**, and `environment` setup time was **417–461s
across 59 parallel files** while `start:all` held six emulator ports on the same machine. The tests
are starved of CPU, not racing on shared state.

**Revised fix direction (unit tier):** raise `testTimeout` in `vite.config.js` (5000ms is too tight
for a 59-file parallel jsdom run on this box) and/or cap `poolOptions.threads.maxThreads`; and
**do not run `test:unit` while `start:all` is up** — that alone roughly doubles the failure count.
The integration-tier diagnosis above (shared emulator state) is unchanged and still stands.
Practical rule: a red unit run on a loaded machine is **inconclusive, not a failure** — re-run it
idle before believing it.

---

## 4. Go-live checklist

> **⚠️ Rewritten 2026-07-20** after the multi-agent go-live audit. The previous version had
> **four defects**: it set secrets via the admin panel *before* creating the admin who can open it
> (impossible), told you to paste Termly snippets into the HTML (wrong mechanism — the pages read
> doc IDs from `config/app`), and had no Firestore-region or backup step at all.
> **The ordered runbook with commands, verification steps and gotchas lives in
> [`GO-LIVE-AUDIT.md`](GO-LIVE-AUDIT.md) §5. This is the summary.**

**Phase 0 — code (✅ DONE 2026-07-20, see GO-LIVE-AUDIT.md §"Phase 0 shipped")**
- [x] `maxInstances` + `timeoutSeconds` on `api`, `paypalWebhook` and all five schedulers.
- [x] Subcollection write/delete narrowed to `isAdminOwner()` (+ rules regression tests).
- [x] Hosting cache headers: `immutable` scoped to `/assets/**`; per-endpoint `/api/**` TTLs.
- [x] Service worker no longer caches non-GET or cross-origin (auth/Firestore) traffic.
- [x] Schedulers rethrow so a failed run reports FAILED instead of silent success.
- [x] `npm run deploy` blocks on a missing/placeholder `.env` and targets the `prod` alias.

**Phase 1 — create the project**
- [ ] Create the real Firebase project; enable Email/Password Auth + Firestore.
      **Location DECIDED 2026-07-22: `nam5` (US multi-region)** — matches the default `us-central1`
      functions region; permanent, so it is settled, not a console-time choice. Create the database
      in **production mode, not test mode** (test mode = allow-all rules until Phase 3 deploys the
      real ones). Click-by-click: GO-LIVE-AUDIT.md §5 Phase 1.
- [ ] Upgrade to **Blaze**, then immediately set a **billing budget + alerts** (~$25/mo, 50/90/100%).
      A budget only *alerts*; the `maxInstances` caps from Phase 0 are what actually bound spend.
- [ ] **Enable PITR + a daily backup schedule BEFORE any real signup** — PITR cannot be enabled
      retroactively. Commands in GO-LIVE-AUDIT.md §5 Phase 1.
- [ ] `firebase use --add` → select the real project → alias it **`prod`** (`npm run deploy` needs it).

**Phase 2 — secrets & build**
- [ ] Fill `.env` with the six `VITE_FIREBASE_*` values (the deploy guard now enforces this).
- [ ] Fill `functions/.env`: `APP_URL`, `COINGECKO_DEMO_KEY` (**env var, not admin Settings** — only
      the env var unlocks `days=max` history), and PayPal plan IDs if launching paid tiers.

**Phase 3 — deploy**
- [ ] Rules + storage first, then `functions:api,paypalWebhook`, then everything.
- [ ] Confirm 5 Cloud Scheduler jobs exist; force-run `refreshUniverseDaily` to warm `cache/universe`.

**Phase 4 — admin bootstrap (⚠️ MUST precede any admin-Settings step)**
- [ ] Register both owner accounts **through the live app UI** (creates their profile + default portfolio).
- [ ] Generate a service-account key, store it **outside the repo** + in a password manager.
- [ ] `node functions/scripts/set-admin.js <email> --role=owner` for **both** owners (script-only; the
      panel can never mint an owner). Sign in again afterwards — tokens are revoked.
- [ ] *Then* fill admin Settings (Termly IDs, PayPal creds) — it needs a fresh owner session.

**Phase 5 — legal (blocker for a public launch)**
- [ ] Create the Privacy Policy + Terms in Termly; set the **doc IDs in admin Settings**
      (do **not** paste snippets into `privacy.html` / `terms.html`). Load both pages and confirm
      the embed renders (`/api/config` is CDN-cached ~60s).
- [ ] Bump `CONSENT_VERSION` to the publication date; delete pre-launch test accounts whose consent
      records point at documents that never existed.

**Phase 6 — App Check (strict order, or you lock out every user)**
- [ ] Register the app + create the reCAPTCHA v3 key → set `VITE_RECAPTCHA_SITE_KEY` → build → deploy
      → watch "unverified requests" fall to ~0 → **only then** enable enforcement, one service at a time.

**Phase 7 — verify + observe**
- [ ] `curl -sI` the cache headers (`/api/coinlist` must not be `no-cache`; `/landing.js` must be).
- [ ] Create the Cloud Logging error alert for the schedulers + webhook (GO-LIVE-AUDIT.md §3 H3).
- [ ] Test the **CSP** on the deployed site; loosen a directive only if it blocks something legit.
- [ ] Register a throwaway account end-to-end: verification email, password reset, portfolio save.

**Later (not launch blockers)**
- [ ] Enable **Identity Platform MFA (2FA)** for admins + the enrollment/challenge flow in the admin app.
- [ ] Confirm the email provider (ActiveCampaign/GetResponse) end-to-end.

---

## 4b. Follow-ups from the QA test pass (see `docs/TEST-REPORT.md`)

- [x] **F-1 (HIGH):** user tier was read from local cache, never Firestore → paid users showed as
  free on a fresh device / after an admin change. Fixed: `getUserProfile` reader + `useAuthSession`
  adopts server tier; retries past the login-time `lastLogin` pending-write view. (commit `8ecd222`)
- [x] **F-2 (MED):** Account screen crashed rendering a Firestore Timestamp `joined`. Fixed — session
  takes only authoritative fields from the server; regression test added. (commit `b9bf9b6`)
- [x] **F-3 (UX):** limit/error messages rendered off-screen → now a fixed floating toast. (`b9bf9b6`)
- [x] **F-4 (FEATURE):** portfolio CSV export (holdings + transactions). (commits `262e562`, `3b4db27`)
- [x] **F-5 (HIGH):** "Delete my account" reworked into a soft-delete with a 30-day trash, user
  self-restore, admin Trash tab (restore / delete-now), and a daily `purgeExpiredTrash`. Server-only
  `deleted`/`deletedAt` (rules-enforced). Self-restore auto-syncs to the admin Users/Trash split
  (`partitionUsers`). (commits `9661cbe`, this one)
- [x] **N-1 (DONE 2026-06-25, `a3693c9`): hardened the landing DCA fetch.** The history fetch
  (`getHist` in `index.html`) had no timeout, so a hung `/api/history` left the calculator stuck
  mid-calculation with no feedback. Added a **12s `AbortController` timeout**; on timeout or network
  error it falls back to the built-in offline estimate (`fbHist`) and shows a clear "showing an
  offline estimate" note. The fallback is no longer cached, so a later attempt can still reach a
  recovered API. (NB: the minimal-API rewrite had already dropped the literal "Calculate" button —
  the calc auto-runs — so the real symptom was a never-completing calc, not a stuck button.)
  **Verified in-browser:** real-data path unchanged; an immediate failure and a true 12s hang both
  degrade to the estimate + note instead of hanging.
- [x] **N-2 (LOW): admin trash niceties.** ✅ "Empty trash" bulk purge built with BL-2 (the "and/or" satisfied;
  a live admin list stays optional).
- [ ] **N-3 (MED): live AI for the Research tab.** The Research tab ships with AI in graceful
  offline-fallback mode (`src/features/research/api/ai-client.js` throws → built-in data-driven
  summaries). To make "Pulse"/"Ask" use real Claude: add a secure callable Cloud Function
  (e.g. `researchAsk`) that holds the Anthropic key server-side, forwards to Claude (Anthropic SDK,
  model per `claude-api` skill), and add per-user rate limiting + App Check. Then replace the one
  `ai-client.js` body with a call to that function. Needs an Anthropic API key + the Blaze plan
  (outbound network). NEVER call Anthropic directly from the browser.

## R. Responsive app — desktop layout  (DONE 2026-06-25 — R-0…R-4 shipped)

The user app is now ONE responsive layout (centered shell + auto-fit card grids, same markup
mobile↔desktop, no `@media`, no new deps), **design unchanged**. As-built detail:
[`RESPONSIVE-DESIGN.md`](../design/RESPONSIVE-DESIGN.md); reusable method: the `responsive-app` skill.

- [x] **R-0 Shell** — `.app-shell` centered column (720 default / 560 narrow / 1040 wide track) +
  `.grid-auto` utility; bottom bar kept (centers as a pill). (`9fed965`)
- [x] **R-1 Learn** — modules reflow to a 2-up grid on desktop, 1-up mobile. (`28a74f6`)
- [x] **R-2 Journal** — thesis entries reflow to a 2-up grid. (`0653d6b`)
- [x] **R-3 Research** — coin cards reflow to a 2-up grid (scoped `research-tab.css`). (`bd14965`)
- [x] **R-4 Forms/detail** — Detail/AddEntry/CoinInfo on the 560 narrow track; Contact capped 560. (`da32f03`)
- Honored "keep the design the same": no colors/fonts/components changed; Portfolio & Search **rows kept**
  (not tiled); only homogeneous card lists gridded. Each phase: build + 217/217 unit green + browser-probed
  (grids reflow 1→2→3 cols by width, collapse to 1 on mobile).

## D. Design revamp — match the canonical Portfolio mockup  (BUILT 2026-06-26)

Founder-approved mockup (desktop + mobile) is the canonical visual target. Full plan, current→target
deltas, and phases live in [`DESIGN-REVAMP.md`](../design/DESIGN-REVAMP.md). Headline change: Portfolio value →
white summary card, and Portfolio assets **ROW → CARD GRID on the 1040 wide track** (this supersedes
§R's "Portfolio rows kept"); plus a floating bottom-nav pill and a token/pill/card consistency pass.
Dark mode preserved; KISS, no new deps.

- [x] **Mobile mockups for all screens** — produced 2026-06-25 in the approved language
  (Portfolio/Research/Journal/Learn/Search + CoinInfo/Detail/AddEntry/Account/Login) to validate before building.
- [x] **Desktop mockups for all screens** — produced 2026-06-26: every screen at its desktop width
  (Portfolio on the **1040 wide track with the 3-up asset grid**, Research/Journal/Learn 2-up,
  drill-ins/forms on 560/720) in the approved cream-paper language. Saved as a durable, self-contained
  gallery with a light/dark toggle: [`docs/mockups/desktop/index.html`](../mockups/desktop/index.html)
  (open in a real browser for true widths). Verified: 12 frames, Fraunces+Hanken load, 3-up/2-up grids,
  Login `#FF3B30` error preserved, dark mode flips, clean console.
**Founder review locked 2026-06-26** (full per-screen decisions in [`DESIGN-REVAMP.md`](../design/DESIGN-REVAMP.md) §7).
Locked wording: drop "held" → just the amount (`0.52 BTC`); Journal labels **Intact/Review/Challenged**;
Journal note → "Only you can see your journal. Your thesis helps the AI give you better Research & Ask
answers."; **remove the "Prices updating live" line** (both widths). Guardrail: design-only — keep all
settings/words/functions unless §7 says otherwise.

- [x] **D-1** Portfolio value summary card (gain line + INVESTED/24H/ASSETS cluster) **+ removed live line**
  (commit `455f17c`). New `portfolio24hPct` helper; `.value-card` flex (desktop-right / mobile-row); 240/240
  unit green, build clean, browser-verified (incl. dark mode).
- [x] **D-2** assets → 3-up card grid + wide (1040) track + tinted % pills + dropped "held" word
  (commit `335a1b9`). Card tap → CoinInfo; Edit/Delete on Detail; swipe machinery removed. Reflow
  3/2/1 @1040/720/375 verified; 242/242 unit green.
- [x] **D-3** desktop bottom-nav → **solid-white floating pill** (commit `cba5b2b`); mobile bar unchanged;
  min-width:760px override, token-driven (dark OK). Verified @1280/@375.
- [x] **D-4** token-circle consistency (commit `c4b36f0`): pure `coinColor()`, 6-digit guard (TAO bug fixed),
  case-insensitive, deterministic curated fallback + more coins. 245/245 unit green; browser-verified.
- [x] **D-5** consistency pass (design-only; settings/words/functions kept). **Search** — tinted % pill +
  muted "Added" (`72bc52c`). **Detail + CoinInfo** — consolidated tinted `chg-pill`, price-history
  `kv-chg` now a tinted pill, dedup CSS (`4b4b1d1`). **AddEntry / Account / Login** — already matched the
  new design (no change): AddEntry keeps datetime-local (date+time); Account keeps every function; Login
  keeps the inline `#FF3B30` error (browser-verified). 245/245 unit green; build clean.
- [x] **D-6** dark-mode sweep (commit `7842975`): fixed token-circle contrast (color-mix via `--ci`),
  the mobile nav bar (now `--bar-bg` theme var), and `pnl-row.dn`/`limit-banner.warn` hardcoded light
  tints → tokens. Verified in browser.
- [x] **D-7** Journal new design (commit `8cc0223`): short labels Intact/Review/Challenged; corrected note
  (thesis feeds the AI); **"Needs a thesis" section + add-thesis-later** via a new `addThesis` handler →
  `updateCoinJournal` (no schema change). 248/248 unit green; browser-verified (write a thesis → coin moves
  needs→theses).
- [x] **D-8** Research/Coins **desktop-only richer card** (commit `bd034b5`): cost·now·P&L·**30d** + full
  conviction always visible + bigger sparkline, shown by default on desktop (no tap); mobile stays
  compact. Verified Portfolio→Research auto-sync (a new holding surfaced the coin) and view-only (no
  delete). 248/248 unit green.

**§D Design revamp — COMPLETE (2026-06-26).** D-1…D-8 shipped; all founder-review items (§7) addressed.

(See [`DESIGN-REVAMP.md`](../design/DESIGN-REVAMP.md) §3 for per-phase scope + DoD, §4 for the interaction decision, §7 for the founder review.)

## DP. Design Pass 2 — founder mockup alignment  (2026-06-27, PLANNED)

Canonical: [`DESIGN-PASS.md`](../design/DESIGN-PASS.md) (4 design changes + decisions). Design-only except the new
cached `/api/trending`. Same design mobile + desktop; holds in dark mode. Built as ONE batch in order:

- [ ] **DP-1 Foundations** — add the icon set (Account: lock/bell/palette/shield/chevron/user/card/folder;
  Learn: 9 module icons + check/target) + shared CSS (pill `.switch`, `.set-row*`, `.port-pill*`,
  `.tx-coin-head`, `.app-avatar`, Learn hero-card/module-footer/icon sizing, trending label, dark-mode
  tokenizations). Enables the rest.
- [x] **DP-2 Quick wins** — ✅ DONE 2026-06-27. Portfolio switcher moved **above** the value card +
  restyled to design-system pills (`.port-pill*`, dark-safe, active = soft-green); Add-transaction
  **coin-name header** (`.tx-coin-head`, `Bitcoin · BTC` + token circle) above Buy/Sell, title
  "Add transaction". Verified: unit 251 green, build clean, browser-verified mobile + desktop.
- [x] **DP-3 Persistent avatar** — ✅ DONE 2026-06-27. One shell-level avatar (`.app-avatar` in a
  relative `.screen-wrap`, below the verify banner) on all 5 tab screens → opens Account; Portfolio's
  duplicate removed; hidden on drill-in screens. Browser-verified on every tab.
- [x] **DP-4 Learn** — ✅ DONE 2026-06-27. Hero band → white card (`.learn-hero`) with XP bar + chips
  (`🔥 N-day streak` hidden at 0 · `N of M lessons`); per-module SVG line icons (new
  `src/components/learn-icons.jsx`, `stroke=currentColor`, lock for locked) replacing the near-invisible
  emoji; icon color `--accent-ink` (adapts light/dark, ~8:1 / ~7.5:1). Module footer collapsed to ONE row
  (`.m-foot`: `X/Y lessons · Z%` + Start/Continue/Review), progress bar kept above. Dark-mode fix: tokenized
  the 3 hardcoded values (today-lesson + module.active gradients → accent-soft/paper-2; m-icon.done →
  `--sg-s`/`--sg`). Sequential unlock untouched. 257 unit green (+3), build clean, browser light+dark +
  mobile/desktop. NB: badges-row left as-is (out of scope).
- [x] **DP-5 Account** — ✅ DONE 2026-06-27. Drill-in settings list via a local `view` sub-state (no router
  change; Account had no local state — all from `useApp` — so nothing was lifted). HOME = identity avatar +
  "Plan usage" summary (Portfolios + Coins bars) + a settings-list card: NavRows (Profile / Plan & billing /
  Portfolios / Security / Privacy & data → chevron) + inline Email-digest pill `.switch` + Appearance
  segmented (reused `.theme-seg`) + Logout. DETAIL views relocate each existing card verbatim (Plan & billing
  = full usage + subscription + upgrade/PayPal). "Product updates & offers" marketing toggle moved into
  Privacy & data; Notifications card dissolved. New token-based/dark-safe primitives: 8 `Ic` row icons
  (chevR/user/card/folder/shield/bell/palette/lock, `currentColor`), `.switch`, `.settings-row*`. Tests
  rewritten for the drill-in (21 cases) + 2 e2e nav tests updated. 259 unit green, build clean, verified
  light+dark + mobile/desktop.
- [x] **Round 2 — founder follow-ups — ✅ ALL BUILT 2026-06-28** — full spec in
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 2". R2-3 (Pulse) + R2-4 (Risk) were already implemented; R2-1/2/5/6/7/8 built + verified (TDD, 272 unit green, light+dark, mobile+desktop).
  - [ ] **R2-1** Account avatar consistent on Learn + all tabs (currently overlaps the Learn hero card) — ⚠ confirm placement.
  - [ ] **R2-2** Learn: remove the `.badges-row` "graph icon" (not needed) — trivial.
  - [ ] **R2-3** Research › Portfolio Pulse: new design (Share/Regenerate pills + period headline pill); KEEP 24H/7D/30D where they are + KEEP the offline note.
  - [ ] **R2-4** Research › Portfolio Risk: new design (segmented gradient meter Low/Moderate/High + status badge + lock footer); keep the computation.
  - [ ] **R2-5** Add transaction: restyle ONLY the Buy/Sell tab style + fonts + "AUTO" on the right side of the price input + the "Total cost" row (large display amount).
  - [ ] **R2-6** Journal: new design — serif "Journal" header + avatar + "Write before you buy." + entry cards with coin circle + status pill (Intact/Review/Challenged) + thesis excerpt. Keep logic.
  - [ ] **R2-7** Research › Allocation: color each bar segment + legend dot by the coin's original brand color (`coinColor`) so none repeat.
  - [ ] **R2-8** Research dark-mode bug: "A note on diversification" card is light-on-light (unreadable) — tokenize + audit sibling cards.
  - [ ] **R2-9** Learn dark-mode bug: lesson overlay "THE KEY INSIGHT" box (`.lesson-insight`) light gradient unreadable in dark — tokenize.
- [x] **Round 3 — dark-mode visibility bugs — ✅ ALL BUILT 2026-06-28** — full spec in
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 3". All dark-block-only (light byte-for-byte unchanged); R3-1…R3-8 built + browser-verified dark + light.
  - [ ] **R3-1** Add-portfolio "+ Add" button invisible in dark — `.add-name` (`app.css:463`) `background:var(--ink)` (flips light) + hardcoded `color:#fff` → dark-block override text `var(--paper)`.
  - [ ] **R3-2** Back chevron `<` invisible on every drill-in (CoinInfo/Detail/AddEntry/Account) — `Ic.back` (`ui.jsx:9`) `stroke={c.txt}` (#1A1A1A) + `.icon-btn` has no color → set `stroke="currentColor"` + add `color:var(--ink)` to `.ci-app .icon-btn` (flips correctly both modes).
  - [ ] **R3-3** Accent green dull on black — `--accent` doesn't flip; in the dark block, override **foreground** accent rules (`.nt-btn` + ~11 others + Portfolio.jsx:84 inline) to `var(--accent-ink)` (bright #5cd6a6). Keep `--accent` on solid-bg+white-text buttons & borders.
  - [ ] **R3-4** Account avatar black-on-black — `.avatar`/`.acct-avatar` hardcode a near-black gradient; dark-only override (`--accent-soft` bg + `--accent-ink` initial + accent ring). Build with R2-1.
  - [ ] **R3-5** Header tags + colored numbers/pills not shiny (systematic) — `--sg/--sr/--sa/--ai-2/--amber` + `.badge-live` (#1a7a3c) don't flip → dull on black. Dark-block: brighten the semantic tokens (e.g. `--sg:#2ecc71; --sr:#ff6b6b; --sa:#f4c54a; --ai-2:#5b9bff;`) + override `.badge-live`. Makes all tags/%-pills/numbers bright app-wide.
  - [ ] **R3-6** Account fields + buttons white/dull in dark — `.priv-btn.solid` (`app.css:466`, `var(--ink)` bg + `#fff` = invisible), `.priv-btn.danger`/`.logout-btn` hardcoded `#fdecea`. Dark-block overrides (solid→accent; danger/logout→`--sr-s`/`--warn`).
  - [ ] **R3-7** Upgrade/Downgrade modal white + invisible title in dark — inline-styled in `CryptoIdea.jsx:597-634`, outside `.ci-app`, `background:"#fff"` + title has no color. Add classNames (no logic) + dark-block CSS (`!important`): sheet→`--paper-2`, title→`--ink`, boxes→tinted, "Keep My Plan"→dark.
  - [ ] **R3-8** Research "Ask" panel black-on-black — `.ask` (`research-tab.css:180`) dark hero blends into dark page + `h3` inherits `var(--paper)` (flips dark). Dark-block in `.research-root`: add border + `color:var(--ink)`. Cross-ref R2-8.
- [x] **B-PORT — ✅ FIXED 2026-06-29 (backend, not design). "Couldn't create portfolio. Check your connection."**
  Was: the create is correctly denied because the user is **at their plan's portfolio cap** (free 1/pro 3/
  premium 15), and the app **mislabelled** the `permission-denied` as a connection error (surfaces when the
  **client tier > DB tier** — a local/demo upgrade the server never persists; users can't write their own
  `tier`). **Fix (part 1 — the message):** new pure mapper `src/utils/errors.js` `apiErrorMessage`; data layer
  returns `code: error.code`; the ~10 CRUD toasts now show an honest plan-limit/auth/connection message
  (§A1+§A2 fixed together). Verified end-to-end on the emulator (free@ at cap → plan-limit message); 277 unit
  green, build clean. **Part 2** (client tier ↔ DB tier sync) stays operational (admin/seed locally; PayPal
  webhook at go-live). Full write-up in [ERRORS.md](../testing/ERRORS.md) §A1 + §A2.
- [x] **Round 4 — founder follow-up — ✅ ALL BUILT 2026-06-29** — full spec + as-built notes in
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 4". Decisions honored (header tags = all 5 tabs · delete warning =
  only when the coin has transactions · simple Cancel/Delete-anyway popup · warn about transactions + thesis,
  hard delete). TDD'd + browser-verified (light+dark, mobile+desktop); 293 unit green; build clean.
  - [x] **R4-1** Research › Coins stat-row consistent (commit `8323fc7`) — `.ps-l` nowrap + smaller
    font/letter-spacing + ellipsis; `.pos-stat` `min-width:0`/center. Layout-only (both modes). Structural
    test added; verified equal-width single-line labels @375 (light+dark) + @1280.
  - [x] **R4-2** Portfolio card split click-zones (commit `373b66d`) — image→CoinInfo (`.ac-img` + hover
    ring + stopPropagation); card background→Add-transaction (Buy). New ctx `startAddTx(coin,type,from)`
    (reused by Detail Buy/Sell, replacing local `openNewTx`) + `txReturn` so back **and** post-save return
    to origin. Tests updated.
  - [x] **R4-3** Delete-coin warning when it has transactions (commit `f420e5e`) — `coin.entries.length>0`
    → Cancel/"Delete anyway" modal (reuses dark-safe `.dg-*`), names tx + thesis lost, hard delete; no-tx
    coins keep the quick 2-tap. No change to `remCoin`. Verified dark-safe + the quick path.
  - [x] **R4-4** LIVE + plan tags on all 5 main-tab headers (commit `b9dc369`) — shared `<HeaderTags/>` for
    Journal/Learn/Search; Portfolio kept inline; Research scoped copy + dark `--sg` `● LIVE` override.
    Per-tab wiring tests + HeaderTags logic tests. Verified all 5 tabs, light+dark.
  - [x] **R4-2-fix** (founder correction 2026-06-29) — Portfolio card **background → Detail** (the position +
    transactions screen), not Add-transaction; image still → CoinInfo. Removed the now-vestigial `txReturn`
    machinery (AddEntry is only ever reached from Detail). Tests updated.
  - [x] **R4-5** (2026-06-29) — AddEntry **AUTO** is now an always-visible, clickable button: shown whenever a
    market price exists, taps to apply it, `.on` when the price matches. Fixes AUTO vanishing after a manual
    edit / after switching coins. Dark-safe. 294 unit green; build clean; browser-verified.
- [x] **DP-6 Search trending + tab redesign — ✅ BUILT 2026-06-29** (founder mockup) — align the Search tab to the
  approved mockup: header title **"Search"** (keep BETA + R4-4 HeaderTags so the add affordance stays clear) +
  "Search any coin…" box; when the box is **empty**, show a **TRENDING** section — a list of trending coins,
  each row = token circle (`CI`/`coinColor`) + name + "SYMBOL · #rank" + a green **Add** button (reuses
  `.trend-item`/`.trend-info`/`.add-pill`; Add → existing `setJournalFor(coin)` Buy-Journal flow). The tab must
  read clearly as "this is where you add coins". Data: **cached `/api/trending`** (CoinGecko `/search/trending`
  → new `cache/trending` Firestore doc, lazy refresh + `Cache-Control` max-age+s-maxage; mirror
  `refreshUniverse`/`getUniverse`/`/api/search` in `functions/index.js`; extract `coins[].item`; add to the 404
  list) + client `fetchTrending()` (mirror `searchCoins`) + `useTrending()` hook (load-once module cache →
  `{trending,loading,error}`). **Offline-degrade:** when trending is empty/loading, fall back to a curated
  `TOP_COINS` slice so the section is never blank (same offline philosophy as prices). TDD: fetchTrending +
  useTrending + Search (empty→TRENDING renders w/ rank + Add; Add opens Buy-Journal). Verify mobile+desktop,
  light+dark.
- [x] **DP-8 Login** — ✅ DONE 2026-06-27. Password show/hide eye toggle (`.pw-eye`, `Ic.eye/eyeOff`);
  "Login" → "Log in" (tab + button); email placeholder `you@email.com`. `#FF3B30` auth-error preserved.
  Browser-verified (toggle password↔text).
- [x] **DP-9 Coin info** — ✅ DONE 2026-06-27 (two commits). **DP-9a (client, design-only):** MARKET DATA =
  Rank/Market cap/24h volume/Circulating; YOUR POSITION = Held/Avg cost/**Unrealised P/L** (reuses `coinPnl`,
  excludes realised sells; colored `pnl-row`, dark-safe); chg pill "(24h)" → "today"; dropped "First tracked" +
  the redundant Value/Transactions rows & in-card button (header Transactions pill kept); Price-history card
  kept. 24h vol + circulating read `prices[id].usd_24h_vol`/`.circulating` with an em-dash fallback (never
  NaN). No new CSS. **DP-9b (backend):** `refreshUniverse` now persists `v` (total_volume) + `cs`
  (circulating_supply) — already returned by `coins/markets`, so **zero extra upstream cost** — and the
  `/api/prices` handler emits `usd_24h_vol` + `circulating`. Verified: 254 unit green, build clean, live API
  probe + browser (light+dark) → "$25.81B" / "20,048,900 BTC".
- [x] **DP-10 Transactions (Detail)** — ✅ DONE 2026-06-27. Tx list wrapped in a card (`.tx-list`) +
  two-column rows (`.tx-left` badge+amount+date · `.tx-right` price + Cost/Recv, right-aligned). Summary
  card + green TOTAL P/L already matched. Browser-verified (added a tx → renders in the card).
- [x] **DP-11 White mobile nav** — ✅ DONE 2026-06-27. Hoisted the desktop white floating pill to ALL
  sizes (`.tabbar` → `--paper-2` white bg, `border-radius:999px`, shadow, floating `bottom:14px`,
  `max-width:calc(100% - 24px)`); active tab gets the soft-green highlight on mobile too; dark-safe
  (token-driven). Added `app-shell` `padding-bottom:96px` to clear the floating pill. Browser-verified
  mobile (white pill + active highlight) + desktop.
- [x] **DP-12 Consistent tab widths** — ✅ DONE 2026-06-27. All 5 tab screens now use the 1040 wide track
  (added research/journal/learn/search to `WIDE_SCREENS`) so they're the same size as Portfolio on
  desktop (also aligns the persistent avatar's right edge across tabs). Verified all tabs = 1040 @1280.
  NB: Research Overview's single-column cards stretch wide at 1040 — cap inner width later if desired.
- [x] **DP-7 Polish — ✅ BUILT 2026-06-29.** Systematic dark-mode contrast sweep (computed-style probes) across
  all 5 tabs + every drill-in → clean except two Research daily-brief icons (`.ic-up` non-flipping `--accent`;
  `.ic-watch` hardcoded light-pink bg), fixed dark-block-only in `research-tab.css`. Re-swept clean; 304 unit
  green; build clean; light + dark, mobile + desktop verified.

**✅ §DP DESIGN PASS 2 — COMPLETE (2026-06-29).** Every phase shipped (DP-1…DP-12 · Round 2 · Round 3 ·
§J · Round 4 + follow-up · DP-6 · DP-7). Whole app aligned to the founder mockups, verified light + dark,
mobile + desktop. (Backend B-PORT also fixed — ERRORS.md §A1/§A2.)

- [x] **Round 7 — card consistency aligned to the Research _Portfolio Pulse_ card — ✅ BUILT 2026-06-30 (`3e9d1f1`)**
  (founder follow-up; full spec in [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 7"; **supersedes Round 5**). Grounded
  via a 6-agent read-only mapping. Decisions locked (AskUserQuestion): frame scope = **match base chrome
  everywhere, gradient frame on hero cards only**; Pulse buttons = **soft green pill**; diversification icon =
  **accent-tinted glyph**. **R7-1** Journal `.j-entry`/`.nt-row` radius `--radius-sm`→`--radius` (= old R5-2);
  **R7-2** card-ify Search **trending only** (`.trend-card` base chrome + `.grid-auto`, typed results stay
  `.trend-item`; = old R5-1); **R7-3** Portfolio `.value-card` → Pulse green→blue gradient frame via the
  single-element `padding-box/border-box` technique (no wrapper, no handler change) + lift shadow to `--sh`;
  **R7-4** Pulse `.regen` Share/Regenerate → `.tx-btn.buy` soft-green pill (also fixes its dark invisibility);
  **R7-5** populate the empty `.dic` "diversification" icon (`OverviewView.jsx:74` is `<div className="dic" />`)
  with a glyph tinted `--accent` (visible light + dark); **R7-6** add the Portfolio `.asset-card:hover`
  shadow-lift (`transition` + `:hover{box-shadow:var(--sh)}`) to `.j-entry` + `.trend-card` so selectable cards
  share the affordance. **Zero new dark rules** (frame is theme-invariant; pill/icon tokens already flip); light
  mode unchanged. Build R7-1 → R7-6 → R7-4 → R7-5 → R7-3 → R7-2 on "go".
- [x] **Round 8 — Journal thesis readability (previews · white-card popups · Read/Breakdown · X-close) — ✅ BUILT
  2026-06-30 (`c2e2079`)** (founder Journal screenshots; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 8").
  Grounded via a 3-agent read-only mapping. **Gap checked:** thesis text already capped 2000 chars/field server-
  side (`firestore.rules` validJournal/validFunnel) → display bug only, no rule change. Decisions locked
  (AskUserQuestion): Read popup = **full breakdown** (Why + change-my-mind + dilution/volume/yield); **Read shown
  always** next to Edit; **X replaces the back-arrow** on the Journal thesis popups; list cards = **2-line preview,
  equal height**. **R8-1** `.j-excerpt` add `overflow-wrap:anywhere` + 2-line `min-height` (consistent cards);
  **R8-2** detail popup → wrap `.j-read` (`overflow-wrap`), wrap read blocks in white `.card` chrome, replace
  back-arrow with an **X** top-right (new `Ic.close`, scoped `.ov-close` — don't mutate shared `.overlay-head`),
  add an always-on **Read** pill next to Edit; **R8-3** new read-only **Breakdown** overlay (reuse `.ci-app.overlay`,
  X-close, white cards, all fields `pre-wrap`+`overflow-wrap`). No data/handler change; zero new dark rules. Build
  R8-1 → R8-2 → R8-3 on "go".
- [x] **Round 9 — login polish · Research card heights · in-tab portfolio popup — ✅ BUILT 2026-06-30 (`1389418`)**
  (founder follow-ups; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 9"). Grounded via a 3-agent read-only
  mapping. Decisions locked (AskUserQuestion): login = all three (white toggle pill + align Forgot-password +
  dark-safe error); portfolio popup = **centered card dialog** with X. **R9-1** login: (a) `.auth-toggle button.on`
  near-black → **white pill** like `.seg` (`app.css:407`; matches screenshot, both modes, dark-safe); (b) restyle
  `ForgotPass.jsx` (one-off inline) onto the auth design; (c) dark-block `html[data-theme="dark"] .auth-err
  {background:var(--sr-s)}` (keep test-locked `#FF3B30`). **R9-2** Research Coins equal-height: `.coins-grid`
  `align-items:start`→`stretch` + `.coin-card{height:100%;display:flex;flex-direction:column}` (root cause: cards
  size to content; `.research-root`, dark-safe). **R9-3** Portfolio "+" (`PortfolioBar.jsx:15`, today
  `setScreen("account")`) → opens a centered white dialog (`.cm-scrim`/`.cm-card`, X via new shared `Ic.close`)
  with a name field → existing `addPortfolio` (plan-limit toast already wired); only shows when below the cap
  (free1/pro3/premium15); Account Portfolios mgmt unchanged. One new dark rule (R9-1c); light otherwise unchanged.
  Build R9-2 → R9-1a → R9-1c → R9-1b → R9-3 on "go".
- [ ] **Round 5 — card design consistency — ⤴️ SUPERSEDED by Round 7 (2026-06-29).** Earlier, plainer version
  (unify on `.asset-card`); Round 7 keeps its two moves but upgrades the canonical chrome to the Pulse card and
  adds the button + icon fixes. See [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 5" (marked superseded). Build Round 7.
- [x] **Round 6 — dark-mode visibility follow-up — ✅ BUILT 2026-06-30 (`9cb0759`)** (founder screenshots; full spec
  in [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 6"). Three **dark-block-only** fixes (light untouched): **R6-1**
  tab footer `.disclaimer` (+ `.research-root .disclaimer`) `--ink-faint`→`--ink-soft` (readable on dark);
  **R6-2** `.field-input` dark border (`--line-strong`→`--ink-soft`) + placeholder (`--ink-faint`→`--ink-soft`)
  so Account/form fields are visible (typed text already light); **R6-3** the R4-3 delete-coin modal title
  (`Detail.jsx`, hardcoded `c.txt` #1A1A1A → dark-on-dark) → `var(--ink)` so the "Delete {coin}?" header shows
  in dark. Build R6-3 → R6-1 → R6-2 on "go".
- [x] **Round 10 — full-window paper background · positive-only Buy/Sell amounts — ✅ BUILT 2026-06-30 (`9246fda` R10-2 · `cd1922b` R10-1)**
  (founder Add-transaction screenshot; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 10"). Decisions locked
  (AskUserQuestion): (A) extend the **paper** bg to the whole window, both modes; (B) **both** block-typing +
  clear submit error, for Amount & Price. **R10-1** redefine the `--app-bg` token to the paper tone (`app.css`
  `:root` `#ffffff`→`#f8f7f3`; dark `#0f0e0c`→`#14130f`) so the body + the 1040 wrapper (`CryptoIdea.jsx:623`,
  outside `.ci-app` so `var(--paper)` can't be used directly) + maintenance screen are seamless paper edge-to-edge
  (intentionally changes light too). **R10-2** positive-only Buy/Sell (functional): `AddEntry` Amount/Price are
  `type=number` with no `min`/validation → `-1` passes → rules reject (`amount>0`) → `permission-denied` →
  `apiErrorMessage` mislabels it "transaction limit — upgrade" (B-PORT class). Fix: R10-2a strip `-` on input +
  `min=0`/`inputMode=decimal`; R10-2b validate `amt>0`/`prc>0` in `addEntry` **before** the tx-limit check with a
  clear "… must be a positive number" message. TDD `AddEntry.test.jsx`. Build R10-2 → R10-1 on "go".
- [x] **Round 11 — dark-mode account/transaction text visibility · Learn quiz Submit rework — 📋 PLAN ONLY
  (2026-06-30)** (founder screenshots; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 11"). Decisions locked
  (AskUserQuestion): (1) lift dim text, keep hierarchy; (2) quiz = pick → Submit → correct=green+complete,
  wrong=red+hint+retry (gated). **R11-1** `.sr-value` (tier + `1/1`) `--ink-faint`→`--ink` (white dark / black
  light, both modes). **R11-2** dark-block: `.tx-rprice`→`--ink` (white $), `.tx-rcost`→`--ink-soft`. **R11-3**
  dark-block lift `--ink-faint`→`--ink-soft` for `.usage-note`/`.acct-label`/`.acct-current`/`.priv-text`/
  `.priv-confirm`/`.priv-msg`/`.toggle-hint`/`.pr-sub` + inactive `.seg-btn`. **R11-Q (functional)** rework
  `LessonOverlay` (`Learn.jsx:47`): select-only `.quiz-opt.selected` (no auto-reveal), always-on **Submit**
  (disabled until picked) → correct=green banner+`onComplete`, wrong=red banner+constructive hint+retry (gated);
  **X-close** (reuse Round 8 `Ic.close`/`.ov-close`); new `.quiz-result.ok/.bad` token banners. TDD Learn.test.jsx.
  Build R11-1 → R11-2 → R11-3 → R11-Q on "go".
- [x] **Round 12 — delete-coin confirm leaks across navigation · auto-disarm the "Remove" pill — 📋 PLAN ONLY
  (2026-07-01)** (founder screenshot + repro; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 12"; bug in
  [ERRORS.md](../testing/ERRORS.md) §A3). **Behavioural/error fix.** Repro: arm delete on a **no-transaction** coin (shows
  the "Remove" pill) → leave it → tap **+ Buy** and add a transaction → return to the coin → the "Delete {coin}?
  This coin has 1 buy/sell transaction…" **warning modal pops unbidden**. Root cause: `confirmDel` is **app-level**
  state (`CryptoIdea.jsx:129`, via ctx `:616`) so the armed flag survives navigation — `startAddTx` (`:497`), the
  tx-row edit tap (`Detail.jsx:69`), and tab switches never reset it; on return with `entries.length>0` the modal
  guard (`Detail.jsx:88`) fires on the stale flag. **R12-1** move `confirmDel` into **Detail-local `useState`** so
  it clears on unmount (closes every leak path; drop from ctx + `:129`). **R12-2** auto-disarm the inline "Remove"
  pill after **~3s** (`useEffect` timer keyed on the flag + `entries.length`, `clearTimeout` on cleanup) → reverts
  to the idle trash ("first step"); modal (entries>0) does NOT auto-dismiss. Assumed defaults (veto on "go"): 3s ·
  inline-pill-only · local-state fix. TDD: rework `Detail.test.jsx` (currently injects `confirmDel` via provider →
  drive via the trash button) + add leak/auto-disarm/modal-still-works cases. Build R12-1 → R12-2 on "go".
- [x] **Round 13 — header uniformity · sub-title cleanup · disclaimer visibility · Research Risk simplification ·
  Learn header frame — 📋 PLAN ONLY (2026-07-01)** (founder screenshots + notes; full spec
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 13"). Decisions locked (AskUserQuestion): disclaimer → **readable muted**
  (`--ink-soft`) light mode; remove **3** sub-lines (Research/Journal/Search), keep Learn eyebrow; unify headings to
  **28px**; **Learn header only** (not Account). **R13-1** `.disclaimer` `--ink-faint`→`--ink-soft` (both `app.css`
  + `research-tab.css`; drop now-redundant dark rules). **R13-2** delete Research `.sub`, Journal "Write before you
  buy.", Search "Find any coin…". **R13-3** remove the Research Risk `.sources` block (chips + "Updated just now") +
  prune dead `freshness`/`failed`/`asOf`/`status`. **R13-4** trending pill "Add"→"+ Add" (`Search.jsx:99`). **R13-5**
  Research 29→28px; Journal/Search drop inline `fontSize:24`; Learn via R13-6. **R13-6** restructure Learn to the
  `apphead → card` pattern (title "Your Investing Edge" 28px + BETA + HeaderTags → avatar floats over a plain header
  like other tabs) + give the XP card (`.learn-hero`) the value-card gradient frame (theme-invariant, zero new dark
  rules). **R13-7** Journal "No theses yet"→"No thesis yet". TDD: fix walkthrough:89 ("Write before you buy." removed),
  keep "Your Investing Edge"; Search trending tests → `getAllByText("+ Add")`; add sub-title-absent / risk-chips-absent
  / "No thesis yet" / 28px-probe cases. Build R13-1→…→R13-7 on "go".
- [x] **Round 14 — Portfolio Risk = market-cap tiers (allocation-weighted) — FUNCTIONAL, 📋 PLAN ONLY
  (2026-07-01)** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 14"). The Research Risk meter switches
  from concentration to **market cap**: High `<$100M` · Medium `$100M–$1B` · Low `$1B–$100B` · Super-low `≥$100B`
  (BTC/ETH). Decisions locked (AskUserQuestion): **allocation-weighted** aggregate · market-cap **replaces**
  concentration on the meter (concentration stays as the Allocation "High concentration" tag) · unknown mcap →
  **High** · **keep 3-band** meter (Low/Moderate/High). **R14-1** thread `usd_market_cap` through
  `buildResearchPrices` (`priceAdapter.js:55`) + `computePortfolio` (`portfolio.js:15`) + demo caps in
  `FALLBACK_PRICES`. **R14-2** pure `marketCapTier()` + score (`.95/.65/.30/.05`). **R14-3** rewrite `deriveRisk`
  → `score = Σ(alloc%×tierScore)/Σalloc%`, return `{level, score, breakdown}`, drop `top`/`top2`. **R14-4**
  `RiskMeter` fill = `round(score×20)` + market-cap `riskNote(breakdown,level)`; scale stays Low/Moderate/High.
  **R14-5** `riskColor.js` level pill Low→green/Moderate→amber/High→red. Scores + band cuts are tunable knobs. TDD:
  new `research-risk.test.js` (tier boundaries, weighted aggregate, unknown→High, note copy) + update
  `research-adapters.test.js` for the `marketCap` field; AllocationBar concentration tag unchanged. Independent of
  Round 13 (both touch the Research Overview card). Build R14-1→…→R14-5 on "go".
- [x] **Round 15 — one popup design: white rounded card for EVERY popup — 📋 PLAN ONLY (2026-07-01)** (founder
  Journal-Breakdown screenshot; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 15"). Unify all popups to the
  Round 9 `.cm-card` look (centered white rounded card on a dimmed scrim, X-close). **3 patterns today → 1:**
  `.ci-app.overlay` (5 popups: Journal AddThesis/Detail/Breakdown, Learn lesson, Search Buy-Journal) + `.dg-sheet`
  bottom-sheets (Detail delete, upgrade/downgrade) + `.cm-card` (PortfolioBar, the target). Assumed defaults (veto on
  "go"): "white"=`--paper-2` (theme-aware); centered card + `max-height:90vh` + internal scroll (mobile+desktop);
  sheets→centered cards; X-close everywhere; excludes the error toast + loading/maintenance. **R15-1** shared
  `<Modal>` component + `.cm-*` size variants (sm confirm / md form) + scrollable `.cm-body` + sticky `.cm-head`
  (drop `ci-slide-up`). **R15-2** migrate the 5 overlays (reconcile white-on-white inner cards in Breakdown/Detail;
  back-arrow→X in Learn/Search). **R15-3** migrate the 2 bottom-sheets (delete inline styles + `.dg-sheet`).
  **R15-4** PortfolioBar adopts `<Modal>`. Cleanup retired `.overlay`/`.dg-sheet`/`.back-btn`/`ci-slide-up`. TDD:
  content/behaviour tests stay green (keep text + close semantics + `role="dialog"`); add a Modal test; probe card =
  `--paper-2`/`--radius`/`--sh-lg` centered, light+dark. Coordinates with Round 12 (state) — either order. Build
  R15-1→…→R15-4 on "go". **Decisions LOCKED (AskUserQuestion 2026-07-01):** full-screen sheet on phones / centered
  card on desktop (one `@media`) · scrim tap closes read/confirm popups but NOT text-entry forms (`dismissOnScrim`
  prop) · confirms → centered cards · X-close everywhere · white=`--paper-2`.
- [x] **Round 16 — Research "Coins" cards: align numbers + buttons to the bottom — 📋 PLAN ONLY (2026-07-01)**
  (founder screenshot; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 16"). Cards are already equal-height
  (`.coins-grid align-items:stretch` + `.coin-card` flex-col, `research-tab.css:154-156`) and desktop shows the
  detail always-expanded (`:181`), but `.cc-detail` (stats + "Ask AI" button) isn't bottom-pinned → the number row +
  button float at different heights across a row (Synapse's extra "no coverage" chips push it down). **R16-1** add
  `margin-top:auto` to `.research-root .cc-detail` → slack collapses above it, pinning `.pos-stats` + `.cc-ask` to
  the bottom (fixed-height → numbers align, buttons align). CSS-only, one line. Probe: `.cc-ask` share `bottom`,
  `.pos-stats` share `top` across the row. *(The same message's Account "Starter/Pro/Premium" + "1/1" darker-in-light
  ask is already **Round 11 R11-1** — not duplicated.)*
- [x] **Round 17 — FIX Pro/Premium can't add a portfolio (tier never reaches the DB) — FUNCTIONAL, ✅ BUILT
  2026-07-01** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 17"; bug [ERRORS.md](../testing/ERRORS.md) §A1
  part 2). Root cause: demo upgrade sets `user.tier` + `saveProfile`→**localStorage** (`CryptoIdea.jsx:183`), never
  Firestore; the rule reads the DB `users/{uid}.tier` (still `free`, cap 1) → `permission-denied` → plan-limit
  message, even though Pro 3 / Premium 15 caps already exist. Decision locked (AskUserQuestion): **dev-only
  tier-persist path**. **R17-1** emulator/dev-gated write of the caller's Firestore `tier` (wire into the demo
  upgrade-success `checkSubscriptionStatus`, `:572`) so the in-app upgrade works end-to-end locally; **never**
  client-writable `tier` in prod (keep the rules block). **R17-2** prod stays PayPal/admin (doc it). **R17-3**
  (optional) "+ Add" reads the enforced DB cap so it doesn't invite a denied action. TDD: rules/integration — a
  DB-`pro` user creates 2nd+3rd, blocked at 4th; dev path inert without the flag; the client-`tier`-write rejection
  test stays green. Build R17-1→R17-3 on "go".
- [x] **Round 18 — dark-mode border visibility: soft-white edges on cards · pills · popups + Search separator — 📋
  PLAN ONLY (2026-07-01)** (founder dark-mode screenshots; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 18").
  Dark-block-only (light untouched). Decisions locked (AskUserQuestion): **soft ~16% off-white** border
  `rgba(236,233,225,.16)` · **outer card/popup borders + Search line only** (internal row-dividers stay subtle) ·
  **neutral pills only** (colored status pills untouched). Constraint: cards + dividers + the search line all share
  `--line-2`, so a token bump would over-brighten dividers → use **targeted dark overrides**. **R18-1** add dark
  `--edge:rgba(236,233,225,.16)` + `border-color:var(--edge)` on card surfaces (`.card`/`.j-entry`/`.nt-row`/
  `.module`/`.asset-card`/`.trend-card`/`.tx-list`/`.learn-hero`/`.today-lesson` + research `.card`/`.coin-card`/
  `.trend-card`; `.value-card` keeps its gradient frame). **R18-2** border on popups (`.cm-card` + the Round-15
  `<Modal>` — composes). **R18-3** neutral pills (`.learn-chip`/`.port-pill`/`.pill-ghost`/`.btn-ghost`/`.src-chip`/
  `.tf-pills`/`.seg`…); colored pills left alone. **R18-4** `.trend-item` border-bottom → `--edge`. Internal dividers
  (`.kv-row`/`.tx-row`/journal-Q) stay `--line-2`. Probe: dark card border ≈16% white, `.cm-card` has a border,
  `.trend-item` brighter, `.chg-pill`/`.kv-row` unchanged, light byte-for-byte unchanged. Build R18-1→R18-4 on "go".
- [x] **Round 19 — portfolio delete-confirm · portfolio rename · 2-step transaction delete · transaction
  pagination · transaction ordering · mobile small-dialog centering · Learn header · Learn XP bar · desktop coin
  popups — ✅ BUILT 2026-07-01** (commits c2b7b29/53649f6/d8e6095/9ff3865 + modal-scrim fix b1d1a5e; 359 unit + 22
  rules green; browser-verified desktop+mobile)** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 19"). Nine
  Portfolio/Learn safety+polish gaps. Decisions locked (AskUserQuestion): portfolio delete **mirrors the coin**
  (empty → two-tap trash w/ ~3s auto-disarm; has-coins → blocking warning `<Modal>`) · rename from **Settings +
  the switcher bar** (edit ✎ on the active pill) · transaction delete = **inline two-tap on the row** (arm →
  confirm, ~3s auto-disarm; no per-row modal) · pager = **windowed numbers** (Prev · 1 … 4 5 6 … 100 · Next).
  **R19-1** portfolio delete confirm — `<PortRow>` w/ component-local armed/warn state (R12 lesson; the delete is
  currently unguarded at `Account.jsx:234` → cascades all coins+tx); keep the last-portfolio guard. **R19-2**
  rename — new **wired** `updatePortfolioName(uid,pid,name)` data fn + `renamePortfolio`/`startRename` handler +
  one shared `<Modal title="Rename portfolio">` reached from the Settings row AND the switcher pill; **no rules
  change** (portfolio `update` already bounds `name` 1–50 + leaves `coinCount` — add a rules *test*). **R19-3**
  tx two-tap — row-local `confirmTxId` in Detail.jsx (currently one-click `remEntry` at `Detail.jsx:98`); keep the
  sell-dependency guard + `stopPropagation`. **R19-4** pagination — local `txPage`, `PAGE_SIZE=50`, `slice` + a
  windowed `.tx-pager` (tokenized: `--paper-2`/`--line`/`--accent-soft` active/`--edge` in dark); pure client
  slicing (caps: free 50 / pro 2,000 / premium 5,000). **R19-5** tx ordering — newest on top: sort by `date` desc
  then `createdAt` desc (a *backdated* tx sorts to its real date). The `createdAt` field is **already written**
  (`serverTimestamp()`, firebase-database.js:284) & **already read** (line 145) → **no rules/schema/index change**;
  fix = a pure `sortTx` helper + a tolerant `createdAt` normalizer (Timestamp/`{seconds}`/number/ISO/0), Detail
  uses it, optimistic add stamps `en.createdAt=Date.now()`, and the **CSV export flips to newest-first**
  (export-csv.js:76 — decision: match the app). All confirm/page state **component-local**; no new dep, no new
  attack surface. **R19-6** small dialogs centered on mobile — `@media(max-width:560px)` (app.css:666) currently
  full-screens `.cm-sm` too (the white-screen add-portfolio popup); split so `size="sm"` stays a centered card
  (gutters + radius) and only `size="md"` keeps the full-screen sheet (`<Modal>` adds a `cm-scrim-{size}` class).
  **R19-7** rename the Learn header string "Your Investing Edge" → **"Learn"** (Learn.jsx:106; BETA/tags stay; matches
  every other tab + the nav label; fixes too-long-on-mobile) + update the 2 tests asserting the old copy. Both
  design-only. **R19-8** Learn XP bar — the fill = `level.pct` resets to 0% each level-up (empty/grey right after a
  module); make ONE cumulative bar: pure `overallPct(xp)=min(100,round(xp/MAX_XP*100))` (`MAX_XP=50×totalLessons=2,500`)
  + `LEVEL_MARKERS` (L2 12%/L3 28%/L4 48%/L5 80%), `.xp-fill` width=overallPct + tick-markers along `.xp-bar`, green→blue
  frame gradient; keep the per-level "X/Y XP to Level N" label; 100% = all 50 lessons. No data/rules change. Build order
  R19-2 → R19-1 → R19-5 → R19-3 → R19-4 → R19-6 → R19-7 → R19-8 on "go". **R19-9** desktop-only popups —
  CoinInfo/Detail/AddEntry are full-screen `screen`-machine entries (CryptoIdea.jsx:719-721; launch: Portfolio
  image→CoinInfo, card-bg→Detail, Detail Buy/Sell→AddEntry). On desktop wrap them in `<Modal size="lg" ~560>` over
  the Portfolio base (new `useIsDesktop()` matchMedia hook @561px; screens render body-only + hide their back-arrow
  when `isDesktop`; **X-close + title**; **AddEntry stacks over Detail**; X targets = current back targets; AddEntry
  `dismissOnScrim=false`); **mobile unchanged** (full-screen). Presentation/routing only — no data/rules/handler
  change; a deliberate desktop affordance divergence (responsive-app skill). Build LAST:
  …→ R19-8 → R19-9 on "go".
- [x] **Round 20 — Learn lesson player: remove the L1–L5 markers · module-scoped Next/Previous nav · compact
  2-button row · Review-from-start — 📋 PLAN ONLY (2026-07-01)** (founder Learn screenshot; full spec
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 20"). Reworks the lesson flow. Decisions locked (AskUserQuestion):
  progress bar — remove **only** the L1–L5 tick-marks/labels, **keep** the gradient fill + level title + the
  "300 / 700 XP to Level N" line · "Next →" advances **within the module**, the module's **last** lesson → "Done →"
  (closes) then pick the next module from the grid (**module-scoped**, not seamless-across-50) · the oversized
  primary becomes a **compact 2-button row in the same place** — **"Previous" + "Submit"** (Submit → "Next →" after
  a correct answer, → "Done →" on the last lesson), **identical on mobile & desktop**; "Previous" steps back a
  lesson (disabled on the first); a card's **"Review →"** opens the module from **lesson 1** · review = **start
  fresh** (re-pick + Submit, no pre-reveal). **R20-1** trim Learn.jsx:116-124 (drop the `.xp-tick` + `.xp-marks`
  render) + dead CSS app.css:276-280; fill stays `overallPct`. **R20-2** `LessonOverlay` holds a **module + index**
  (`{module,startIdx}`); a useEffect on idx resets picked/result; right button = Submit → "Next →" (`idx<last`) /
  "Done →" (last); `openModule` startIdx = first-incomplete, or **0** for a done module (Review-from-start). **R20-3**
  `.lesson-nav` flex row: "Previous" (`.btn-ghost`, `disabled={idx===0}`, `setIdx(idx-1)`) + the right button —
  compact, one row, **no media divergence** (CSS-only responsive). **R20-4** re-opened/Previous'd lessons start
  fresh (re-pick + Submit); `complete` stays idempotent (no double XP). **Presentation only** — no data/rules/schema
  change; all overlay state component-local; net removes the R19-8 marker CSS. Build R20-1 → (R20-2+R20-3+R20-4) on "go".
- [x] **Round 21 — error toast visible above every popup (raise above the scrim) + ~6s auto-dismiss — 📋 PLAN ONLY
  (2026-07-02)** (founder Sell-BTC screenshot: on desktop the validation error renders behind/outside the popup,
  invisible; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 21"). Root cause: the global `showErr` toast
  (CryptoIdea.jsx:676) is `z-index:9500` — the **same** as the `.cm-scrim` (app.css:671) — and the scrim paints
  later → its 50%-black dims/hides the toast under every popup. Every popup error funnels through this one toast
  (AddEntry Buy/Sell, add/rename/delete portfolio, add/remove coin, tx delete), so one fix covers all; the Journal
  thesis popups already use an inline `.j-err` inside the card (left as-is). Decisions (AskUserQuestion): **one
  raised top banner** (render above every scrim, fully bright — no per-popup docking) · **~6s auto-dismiss** (double
  the 3s). **R21-1** bump the toast to `z-index:10000` (> scrim 9500 + the stacked AddEntry modal) + move its inline
  styles into a `.ci-toast` class (same look, both themes, `role="alert"`). **R21-2** `showErr` timeout 3000→6000
  (CryptoIdea.jsx:183). Presentation only — one z-index + one timeout; no data/rules/handler change; verify
  in-browser (a z-index bug jsdom can't see). Build R21-1 → R21-2 on "go".
- [x] **Round 22 — coin-holding tx rows: total as the bold number, coin price below ("/ SYMBOL"), drop "Recv/Cost" —
  📋 PLAN ONLY (2026-07-02)** (founder coin-holding tx list; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 22").
  Today the right column (Detail.jsx:116-119) shows the **coin price** bold on top (`.tx-rprice`) and **"Recv"/"Cost"
  + total** muted below (`.tx-rcost`) — "Recv" is unclear + redundant with the SELL/BUY tag. Decisions
  (AskUserQuestion): per-coin line = **"$84,000.00 / BTC"** (price + " / {symbol}") · total = **plain bold** (no
  sign/color). **R22-1** swap the two lines + drop the `{isSell?"Recv":"Cost"}` word: top (bold) = total
  `${(amount×priceAtBuy).toLocaleString(2dp)}`, below (muted) = `fmtP(priceAtBuy)+" / "+coin.symbol` (keeps adaptive
  precision for cheap coins). **R22-2** app.css — rename `.tx-rprice`→`.tx-rtotal` (bold ~14px `--ink`) + reuse
  `.tx-rprice` for the muted price line (11.5px `--ink-faint`; dark brightens to `--ink-soft`); update the 2 base +
  2 dark rules. Same Detail component → lands in both the mobile full-screen view and the desktop R19-9 popup;
  "Recv"/"Cost" is the only occurrence (Detail.jsx:118). Display-only — no data/rules/handler change (total still
  `amount×priceAtBuy`). Build R22-1 + R22-2 (one commit) on "go".
- [x] **Round 23 — Portfolio Risk uses real coin RANK: graduated (log-scale) risk + mega-cap ($100B+) safety floor —
  📋 PLAN ONLY (FUNCTIONAL) (2026-07-02)** (founder Research→Portfolio Risk; full spec
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 23"). Refines the R14 market-cap-tier model. Decisions (AskUserQuestion):
  **real live CoinGecko rank** per coin · **mega-cap safety floor** (≥40% in $100B+ caps → meter can't read High) ·
  **graduated by size** (smooth log-scale, no tier cliffs). **Key find:** rank is **already fetched + cached** in
  the universe doc (functions/index.js:846, `market_cap_rank`, hot 5-min / daily) but `/api/prices` omits it → **no
  new endpoint**, just surface it. **R23-1** add `usd_market_cap_rank: m.rank` to `/api/prices` (index.js:952/954;
  on-demand refresh already merges-preserves rank). **R23-2** plumb through — `buildResearchPrices` reads
  `usd_market_cap_rank`, `computePortfolio` carries `rank` onto holdings (+ demo rank in FALLBACK_PRICES/TOP_COINS);
  `useLivePrices` passes the field through untouched. **R23-3** rewrite `deriveRisk`: continuous `coinRisk` on
  `log10(rank)` (rank 1 → ~0.02 … no rank → 0.95; cap-log fallback), allocation-weighted mean, + **mega floor**
  (megaAlloc ≥ 40% caps the score below the High cut). **R23-4** `riskNote` → rank/size wording + names the anchor
  when the floor applies. Pure functions, heavily unit-tested; backend field verified in the emulator. No new
  endpoint/upstream/dep, no rules change (rank is read-only server data). Build R23-1+R23-2 → R23-3+R23-4 on "go".
- [x] **Round 24 — Journal: auto-save the thesis on close (X) + keep the Save button + flag incomplete theses —
  📋 PLAN ONLY (FUNCTIONAL) (2026-07-02)** (founder "Add your thesis" popup; full spec
  [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 24"). Today the X **discards** everything typed and a thesis needs BOTH
  questions to save. Decisions (AskUserQuestion): partial on close → **save + flag incomplete** (never lose work) ·
  buttons → **keep "Save thesis" + X (both save), remove Cancel** · scope → **whole journal** (Add + Edit + findings).
  **No rules change** — `validJournal` already allows partial (empty strings pass); `addThesis` already saves partial
  (no-op only if fully empty); `editThesis` requires both (partial edit = safe no-op). **R24-1** AddThesis: `persist()`
  with no `thesisError` gate; wire both the Modal X and "Save thesis" to `closeWithSave` (fire-and-close, optimistic);
  drop Cancel + `.j-err`. **R24-2** derived `isThesisIncomplete(j)` → a yellow "Incomplete" pill (reuse `j-review`)
  in the list + detail, auto-clears when both filled; **stored `status` unchanged** (derived, not "review" — avoids a
  rules/enum change + status conflation; deviation from the literal preview, noted). **R24-3** detail X = `closeDetail`
  that persists the in-progress thesis edit (editThesis no-ops on partial) + funnel (saveFunnel if changed) before
  closing; keep the edit-form Cancel + "Save findings" as explicit affordances. Component-level; no new dep/attack
  surface. Build R24-1+R24-2 → R24-3 on "go".
- [x] **Round 25 — coin icon clickable + hover/press shadow everywhere (opens Coin info) + Transactions button
  restyle — 📋 PLAN ONLY (FUNCTIONAL) (2026-07-02)** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md)
  "Round 25"). Today only the Portfolio icon is clickable (`.ac-img` + accent-ring hover → CoinInfo); elsewhere `<CI>`
  is plain. Decisions (AskUserQuestion): Transactions button = **accent-filled** (thesis `.j-edit-btn` look) · scope
  = **browse/list icons** (Portfolio · Search · trending · thesis cards · holdings header; decorative in-popup
  headers stay plain). Surfaces 2 gaps: **return-to-origin** (CoinInfo close is hardcoded `setScreen("portfolio")`)
  + **empty data** for non-held Search/trending coins (prices only polled for held). **R25-1** shared `<CoinIcon coin
  size>` wrapper + `.coin-ic` class (accent ring `:hover` **+ press `:active`**, keyboard-accessible), folds in
  `.ac-img`. **R25-2** swap plain `<CI>`→`<CoinIcon>` at Search:67/94, Journal:311/331, Detail:72 (stopPropagation
  keeps row actions). **R25-3** CoinInfo → an **`infoCoin`-driven overlay** (`{infoCoin && <Modal
  size=lg/md><CoinInfo/></Modal>}` over the current screen; close = `setInfoCoin(null)`, tab untouched) — remove
  coinInfo from the screen machine (+ NARROW_SCREENS / `at` / R19-9 over-Portfolio special case); body-only always.
  **R25-4** on-demand `fetchPrices([id])` for a non-held coin so Market Data isn't "—" (cached proxy, flat cost).
  **R25-5** Transactions → accent pill, shown **only for held coins** (portCoin). Overlay refactor NET removes
  concepts + a latent close-to-Portfolio bug; no new endpoint/dep, no rules change (read-only). Update R19-9 tests.
  Build R25-1+R25-2 → R25-3+R25-4 → R25-5 on "go".
- [x] **Round 26 — copy fix: delete-portfolio warning "theses" → count-aware "its transactions and thesis" —
  📋 PLAN ONLY (2026-07-02)** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 26"). The has-coins
  delete warning (Account.jsx:84) pluralizes coin/coins but leaves "their … theses" for 1 coin (each coin has one
  thesis). Decision (AskUserQuestion): **count-aware, delete message only** — `const many = p.coins.length>1` →
  "1 coin and all its transactions and thesis" vs "N coins and all their transactions and theses"; **leave** the
  Journal "Your theses (N)" header (a correct plural). Copy-only, no logic change. Update the R19-1 Account
  warning test. Build R26-1 on "go".
- [x] **Round 27 — Billing: dark-mode readability + selected-card fix + desktop popups (X) + refund policy —
  📋 PLAN ONLY, part FUNCTIONAL/copy (2026-07-02)** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 27").
  The `showPlan` billing flow (Login.jsx pick-plan/billing-cycle/welcome/processing) mounts as a hand-rolled
  full-screen overlay (CryptoIdea.jsx:677-683), has **zero** dark overrides for `.plan-*`/`.cycle-*` (faint
  `--ink-faint` sub-text), and the **selected** Premium cycle card uses a hardcoded light `#f3ecfb` (app.css:552)
  → light-on-light **invisible in dark**. Cancel/refund is already the standard "keep access to period end, no
  refund" model (dueDowngrade + downgrade-Modal copy), with no refund code. Decisions (AskUserQuestion):
  **(1) no prorated refund — keep access till period end** (SaaS standard) + one clear policy line;
  **(2) BOTH plan-picker + billing-cycle become desktop `<Modal>` popups with X** (mobile stays full-screen);
  **(3) dark mode keeps hierarchy but brightens** (sub-text `--ink-faint`→`--ink-soft`). **R27-1** dark billing
  sub-text (dark-block-only) · **R27-2** fix selected `.cycle-card.on.prem`/`.on` in dark (dark-tinted purple bg +
  `--accent-ink` ring) · **R27-3** wrap the flow in shared `<Modal>` when `isDesktop` (body-only Login, `closePlanFlow`
  return-to-origin, X suppressed during `processing`) · **R27-4** no-refund policy line in the downgrade Modal +
  Account cancel caption. Update Login/upgrade tests for the desktop-Modal branch. Build R27-1+R27-2 → R27-3 → R27-4
  on "go".
- [x] **Round 28 — Billing: current-plan awareness + re-buy guard + honest benefit copy + light-mode readability —
  📋 PLAN ONLY, part FUNCTIONAL/copy (2026-07-02)** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md) "Round 28";
  grounded via a 3-agent read-only map). **Real bug found:** the plan-picker (Login.jsx:91-113) never reads
  `user?.tier`, so a Pro user can click "Choose Pro" again and be **charged twice** (no guard/badge/disabled state);
  `user.tier` is available but unchecked. **Copy issues:** Premium claims "Priority support · Custom limits" —
  **neither is built** (no support system; premiumLimits is admin-only); all tiers get the same features (tiers
  differ only by capacity). Decisions (AskUserQuestion): **(1) current tier LOCKED** (CURRENT badge + disabled
  "Your current plan"; only upgrades clickable; lower tiers "Included", downgrades stay in Account); **(2) honest
  "all features included + more capacity"** copy, single `PLAN_BENEFITS` source feeding cards + success screen
  (no drift); **(3) Premium = "Priority email support"** (drop "Custom limits"). **R28-1** current-plan guard +
  `startUpgrade` same-tier no-op + free-user "Continue with Starter" link · **R28-2** shared honest benefit copy
  (cards ↔ success) · **R28-3** darken light-mode `.plan-feats`/`.plan-price-sm`/`.cycle-sub`/`.proc-sub`
  `--ink-faint`→`--ink-soft` in the BASE rule (**supersedes R27-1**; drop that dark-only override when building).
  Update Login/upgrade/welcome tests. Build R28-1 → R28-2 → R28-3 on "go".
- [x] **Round 29 — Billing: Premium downgrade chooser (Pro OR Starter) + pending flexibility + Premium→Pro
  re-checkout — ✅ BUILT 2026-07-03 (commit 8c4a01e), FUNCTIONAL** (founder; full spec [DESIGN-PASS.md](../design/DESIGN-PASS.md)
  "Round 29"; grounded via a 5-agent read-only billing map). Today Premium can ONLY downgrade to Pro
  (Account.jsx:262 hard-wired) and the at-endDate flip (CryptoIdea.jsx:610-615) grants the target tier with
  `subscription:null` — **a Premium→Pro downgrade lands as Pro with NO monthly payment attached (free Pro
  forever — real revenue bug)**. Decisions (AskUserQuestion): **(1)** Premium gets ONE "Downgrade" button →
  a Pro/Starter **chooser popup** (PLAN_BENEFITS + configured prices) → the existing confirm; **(2)
  Premium→Pro = re-checkout at period end** — approve a NEW Pro payment or land on Starter; trim is
  **deferred until that decision** (never Starter-trim data a Pro re-checkout would keep); **(3) full
  pending flexibility** — "Keep my plan" (un-cancel) + Premium can switch the pending target; **(4)** the
  R28 picker stays locked (downgrades only in Plan & billing). **R29-1** chooser · **R29-2** pending
  actions · **R29-3** re-checkout flip (dueDowngrade stays pure) · **R29-4** drop dead `downgradeFree`.
  Adjacent go-live gaps logged (ERRORS.md B8 + §BL-1): webhook hardcodes `tier:"pro"` for the PREMIUM plan
  id; `cancelSubscription` sets free immediately. Build R29-1 → R29-2 → R29-3 → R29-4 on "go".

**DoD per phase:** adjust the screen's tests first · `npm run test:unit` green · `npm run build` clean ·
browser-verify mobile (~390) + desktop (~1040), light + dark · commit · update docs.

---

## J. Journal thesis — edit / delete / required-two-questions  (✅ BUILT 2026-06-28)

Founder request from the Journal thesis detail. **Functional** (not design-pass). **All built + TDD'd
2026-06-28** (`thesisError` helper + Journal add/edit/delete/validation + Search updated; new `editThesis`/
`deleteThesis` handlers + `clearCoinJournal` deleteField path; 272 unit green; add→edit→delete round-trip
verified live on the emulator). Original spec below.

- [ ] **J1 — Edit an existing thesis (per coin).** JournalDetail currently shows "Why you bought it" +
  "What would change your mind" **read-only** (`Journal.jsx:68-75`, `.j-read`); only the funnel findings +
  the review decision are editable. Add an edit mode (toggle the two `.j-read` blocks → textareas + Save),
  reusing the AddThesis pattern. Persist via `updateCoinJournal` preserving `status`/`createdAt`/`priceAtAdd`
  and updating `thesis`/`changeMyMind` (funnel already editable). No rule change.
- [ ] **J2 — Delete a thesis (per coin).** No delete exists. Add a "Delete thesis" action in JournalDetail
  **with a confirm**; clears `coin.journal` so the coin returns to "Needs a thesis" (the holding itself
  stays). Data layer: `updateCoinJournal` only SETS (`updateDoc(ref,{journal})`, `firebase-database.js:183`)
  — add a clear path via `deleteField()` (`updateDoc(ref,{journal:deleteField()})`) or a `clearCoinJournal`.
  Rules already allow a coin with no journal (`validCoinData` → journal optional), so **no rule change**;
  client drops `journal` from the coin in `setPortfolio`.
- [ ] **J3 — Require BOTH questions to save + friendly errors.** Minimum to save = **"Why you bought it"**
  (`thesis`) AND **"What would change your mind"** (`changeMyMind`); the manual-research funnel stays
  **optional**. Today the AddThesis Save button is only *disabled* when BOTH are empty (`Journal.jsx:155`) —
  it silently allows saving with only ONE and shows no message; the Search Buy-Journal "Save" (`Search.jsx:119`)
  has NO validation. Change to a click-through + **inline error** so the user learns *why*:
  - **both empty** → "You haven't written your thesis yet. Fill in 'Why you bought it' and 'What would change
    your mind' to save."
  - **exactly one filled** → name the missing one: "You still need '&lt;missing question&gt;'. Both questions
    are required to save." (missing = "Why you bought it" if `thesis` empty, else "What would change your mind").
  - **both filled** → save.
  Apply in: Journal AddThesis, the J1 edit form, AND the Search Buy-Journal prompt (the **Save** path only;
  "Skip for now" still adds the coin with no journal). Update `addThesis` (`CryptoIdea.jsx:442`,
  `if(!t&&!m&&!f)` → require `t && m`, returning a typed result so the form shows the right message) +
  Search `confirmAdd`. This is a **client UX rule** — `firestore.rules validJournal` already allows empty
  strings, so no rule change. Error styling: reuse the app's error treatment, dark-safe.

**DoD:** TDD (add the 3 validation cases + edit/delete tests first) · `npm run test:unit` green · build clean
· browser-verify add/edit/delete + each error message, light + dark, mobile + desktop · commit. PLAN ONLY.

---

## 5. Housekeeping

- [x] Ran `npm audit fix` (no `--force`): patched the `protobufjs` prod advisory → **production
  audit (`--omit=dev`) is now 0**. ~11 dev-only advisories remain (Vitest/jsdom tooling) and would
  need `--force`/breaking bumps — left per policy. Build + 72 unit tests green after the fix.
- [x] Debug logs (`firebase-debug.log`, etc.) are already gitignored.
- [x] **Dependabot sweep — PR #5 merged 2026-07-22** (`2deb348`, squashed). Cleared the bulk of the
  alert backlog *without* a breaking major: the key move was an `overrides: { uuid: "^11.1.1" }` in
  **both** `package.json` and `functions/package.json`, which resolves the whole
  `firebase-admin → gaxios / google-gax / teeny-request / @google-cloud/*` chain **without** the
  firebase-admin 12→14 major. Also bumped tar, js-yaml, undici, body-parser, protobufjs, form-data,
  firebase 12.16.0, vite 5.4.21, firebase-tools 15.24.0, vitest 4.1.10.
  Verified on the *merge result* (not the PR branch): `npm ci` clean in root + functions, build clean
  incl. the no-names `dist/` guard, and **runtime audit 0 vulnerabilities in BOTH trees**
  (`npm audit --omit=dev` → root 0, functions 0).

- [x] **DEPS-1. Vite 5→6 major — DONE 2026-07-22.** Bumped the app's `vite` `^5.4.0 → ^6.4.3`.
  The floor is pinned to `6.4.3`, **not** `^6.0.0`, deliberately: the advisory range is `<= 6.4.2`,
  so a bare `^6` could resolve a still-vulnerable 6.0–6.4.2 on a fresh install. Cleared **four**
  dev-scope alerts in one move — `esbuild` #4 (the app path now bundles `esbuild@0.25.12` via vite),
  `vite` #5 (fix 6.4.2), `vite` #7/#8 (fix 6.4.3). `@vitejs/plugin-react@4.7.0` already supports
  vite 6 (peer `^4.2 || ^5 || ^6 || ^7`) → no plugin bump needed. Verified: `npm run build` clean
  under **vite 6.4.3** (all 5 multi-page entries, `manualChunks` firebase/vendor split intact,
  no-names `dist/` guard clean); **552/552** unit tests, 59/59 files; runtime audit `--omit=dev`
  still **0 in both trees**; browser sweep of the vite-6 dev server → React app mounts + renders the
  login screen with **zero console errors** (the `/api` proxy ECONNREFUSED is the expected
  no-emulator case, handled by the app's offline fallbacks). Note: vitest bundled its
  **own** `vite@8.1.5` (Rolldown/oxc), which used to flag plugin-react 4.7's esbuild options with a
  harmless *deprecated-`esbuild`-option* warning — **now RESOLVED (2026-07-23)**, see DEPS-1b.

- [x] **DEPS-1b. Vitest oxc/esbuild warning — RESOLVED 2026-07-23 (pinned vitest to vite 6).** Root
  cause was **two vite majors in the tree**: the app on vite 6 and vitest bundling its own
  `vite@8.1.5` (Rolldown/oxc), whose oxc pipeline flagged plugin-react 4.7's esbuild options. Fix =
  one line — `overrides: { "vite": "$vite" }` in `package.json` — which pins every nested vite (incl.
  vitest's) to the app's `^6.4.3`. Result: a single `vite@6.4.3` + single `esbuild@0.25.12` across the
  app **and** the test runner, and vite 8's whole Rolldown/Oxc/lightningcss native-binary toolchain
  drops out (**65** lockfile entries removed → leaner install). The earlier "the clean fix is
  plugin-react v5" note is **retracted as wrong**: v5's peer caps at `vite ^7` (doesn't cover vitest's
  vite 8) and the oxc-native plugin is v6, which needs vite 8 — no single plugin-react supports both
  vite 6 and 8, which is why pinning vite (not the plugin) is the fix. **npm gotcha worth
  remembering:** the override will **not** apply on an incremental `npm install` — npm skips
  `overrides` for a peer-resolved/nested dep and leaves the old version marked "invalid"; you must
  delete `package-lock.json` (not just `node_modules`) and reinstall so the tree re-resolves from
  scratch. Verify with `npm ls vite` → one version. Verified: warning gone, **552/552** unit tests,
  build clean, runtime audit `--omit=dev` still 0 in both trees, and no runtime-dep changes
  (firebase/react/react-dom byte-identical in the lockfile).

- [ ] **DEPS-2. Three dev-scope alerts remain — none reach a user** (runtime audit `--omit=dev` = 0
  in both trees). Do NOT chase the count to zero with more dependency PRs — PR #5's own
  `firebase-tools` bump *introduced* two of these, so the backlog partly regenerates itself. Honest
  status per alert: `sharp` #21 (high; fix = `sharp@0.35.3`, a **breaking major**; build-time image
  tooling only, never shipped) · `@hono/node-server` #20 (moderate; non-breaking `npm audit fix`
  available; a `firebase-tools` transitive) · `@opentelemetry/core` #9 (moderate; **no honest fix** —
  npm's only suggestion is a *downgrade* to firebase-tools v14, which this project can't use).

---

## Commands

| Command | What |
|---|---|
| `npm run start:all` | Full local stack (emulators + Vite) in one lifecycle |
| `npm run test:unit` | Vitest component/hook tests (jsdom) |
| `npm run test:rules` | Firestore security-rules tests (emulator) |
| `npm run test:integration` | Data-layer integration tests (emulator) |
| `npm run build` | Production build + service-worker stamp |
| `npm run deploy` | Build + `firebase deploy` (Blaze for functions) |
