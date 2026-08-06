# Admin Panel UI Redesign — unified chrome

> **Status: ✅ BUILT (2026-07-25).** ADMIN-UI-1 (chrome) **and** ADMIN-UI-2 (card/tab/sizing fidelity)
> shipped together in one CSS pass. The `/admin` panel now renders **one** sticky bar (green logo tile +
> `CryptoIdea · Admin` left, email + Log out right), a persistent `Admin dashboard` H1 (34px desktop) with
> the Live-Data pill beside it, the segmented tab bar with the **active tab in the house green `--accent`**
> (was near-black), 22px white pill-cards from one shared `--adm-card-*` token set, a **1140px** shell, and
> the sign-in / denied / loading screens on paper + the green logo tile (no purple). Design-only — no
> callable, handler, rule or data change; light-paper only; no new dependency; the green is the existing
> `--accent`, no new hex. **Verified:** `npm run test:unit` (845 green, +3 new ADMIN-UI cases) · `npm run
> build` clean (no-names guard) · browser-verified **owner + manager**, **desktop 1280 + mobile 375** (one
> sticky element, H1 34/25px via `clamp()`, active tab `rgb(10,107,77)`, no horizontal overflow, no console
> errors). Files below (§5 + §8.5).
>
> Backlog: [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) §ADMIN-UI. Reference mockup:
> [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html) (self-unpacking bundle —
> open it in a browser to render the target). Sibling: [`ADMIN-PANEL-AUDIT.md`](../decisions/ADMIN-PANEL-AUDIT.md)
> is the *capability* plan (ADMIN-0…5, all built); this doc is the *visual chrome* plan and does not
> overlap it. Precedent for the paper design system: [`DESIGN-REVAMP.md`](DESIGN-REVAMP.md) /
> [`DESIGN-PASS.md`](DESIGN-PASS.md) (the user app) and the ADMIN-D/D2/D3 reskin already shipped.
>
> **§1–§7 = the *chrome* (header/H1/back-nav/login); §8 = the *card/tab/sizing* fidelity.** Both halves
> shipped in the same build (they touch the same two files + the same mockup). The plan text below is kept
> as the as-built spec.
>
> **§9 = ADMIN-UI-3 — a second founder pass, ✅ BUILT (2026-07-25):** full-bleed header (logo/Log-out
> pinned to the bar edges over 1140-centered body), equal-height Overview cards, tier bar/legend colours
> connected (Pro realigned to `--accent-ink`), and a verified border+`‹` sweep of every settings sub-screen
> + the user detail / modals. Same two files, design-only, no new hex, no new dependency.
>
> **§10 = ADMIN-UI-4 + §11 = ADMIN-UI-5 — a third founder pass, ✅ BUILT (2026-07-25):** a new `DScreen`
> primitive gives every drill-in a **visible bordered `‹` box + a divided header** carrying the title once
> (retiring the bare `DHead`); the **Overview grows to the mockup scale** (38/30/26px text, 30px card pad, via
> a `.adm-ov-screen` scope) while **Settings shrinks** (18px `DScreen` body). Same two files + the test, all
> design-only, no new hex/dependency.
>
> **§12 = ADMIN-UI-6 — a fourth founder pass, 📋 PLAN ONLY (2026-07-26, NOT built):** header **typography**
> fidelity. The `CryptoIdea` wordmark is smaller than the mockup **and in the wrong font** — it was built in
> Fraunces *serif* (`--display`), but the mockup renders it in Hanken Grotesk *sans* (`--body`); the `· Admin`
> sub is too small; the **Log out** button is too small and **too round** (a 999px pill vs the mockup's 12px
> radius); and the email is too small. Every target was **measured from the mockup** and maps to an existing
> token — **no new hex, no new dependency, one CSS file**. Founder asked to **add to the plan only** (no build
> yet). Spec: §12.
>
> **§13 = ADMIN-UI-7 — a fifth founder pass, 📋 PLAN ONLY (2026-07-26, NOT built):** Overview **card fidelity**.
> The stat/usage cards carry **too much padding** — ADMIN-UI-5 shipped `30px`, but the mockup is **`20px`** (Plan
> limits `20px 24px`), so the content sits too far from the card edge (the founder's "use more of the card
> space / no extra space between the text and the borders"). And the **Tier-breakdown bar** is drawn as an `8px`
> rounded-rectangle where the mockup is a **`999px` pill** — its segment **colours already match the mockup
> exactly**, so making the bar a full pill is the whole fix for making the tiers read as one **connected** colour
> band. Design-only, **one file** (`admin-settings.css`), **no new hex, no new dependency**. Spec: §13.

## 1. Problem — why (the overlap the founder reported)

The signed-in panel renders **two** brand headers, and **both are `position:sticky; top:0`**, so they
stack and collide:

| # | Where | What it shows | Style | Sticky |
|---|---|---|---|---|
| A | **Outer shell** — [`src/admin-main.jsx`](../../src/admin-main.jsx) `phase==="ok"` `<header>` (≈L66–73) | `Crypto Idea · Admin` (small, top-left) · email · **Log out** | Off-brand **grey/purple inline styles** (`#E8E8ED`, `#6C5CE7`), **no logo tile** | `z-index:10` |
| B | **Inner dashboard** — [`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) `.adm-head` (≈L336–341) | `Crypto **Idea** · Admin` (centered, 24px serif) · **Live Data** badge | Paper design | `z-index:20` (`admin-settings.css` L68) |

Two sticky bars pinned to the same `top:0` → the large inner brand (B, z-index 20) renders **on top of**
the outer bar (A) → the reported overlap. Compounding issues: there is **no page `<h1>`** (drill-in
titles like "API keys" read as the page title), and when scrolled, the sticky brand can **obscure the
drill-in back chevron**.

## 2. Target — the mockup

Rendered from `docs/mockups/admin-panel/index.html`:

- **One sticky bar** across the top, paper-styled, bottom border + subtle blur:
  - **Left:** a **green rounded-square logo tile** with a serif **`C`** + the `CryptoIdea · Admin` lockup.
  - **Right:** the signed-in **email** + a white, rounded, bordered **Log out** button.
  - It is the **only** pinned element; all content (including the H1 + tabs) scrolls **under** it.
- **A persistent page title row** immediately below the bar (scrolls normally):
  - **`Admin dashboard`** as a large left-aligned Fraunces `<h1>` — the **same on every tab and every
    drill-in** (it does *not* change to the section name).
  - The **`Live Data` pill** (green dot + "Live Data") moved **here**, right-aligned beside the H1 —
    this is where the old `.adm-head` badge goes.
- **Segmented tab bar** (`Overview · Users · Trash · Settings · Audit`) under the H1 — unchanged.
- **Drill-in sub-pages** (e.g. Settings → API keys): render as content with their **own header row** =
  a **white rounded `‹` back button** on the left + the **sub-page title centered**. The bar + H1 + tabs
  stay above it.

## 3. Locked decisions — founder interview (2026-07-25)

1. **Scope:** **PLAN / DOC ONLY** now. Build later on an explicit "go". *(This doc.)*
2. **Back buttons:** on **every drill-in sub-page AND every popup/modal**. The 5 main tabs keep
   switching via the tab bar (no back control needed there).
3. **Sign-in screens:** **reskin** the `/admin` sign-in, "access denied", and loading screens onto the
   paper design + logo tile too, so the whole `/admin` experience is consistent end-to-end.

## 4. Design spec — surface by surface

### 4.1 One sticky header bar (kills the overlap)
- **Collapse A + B into a single bar.** Recommended structure (KISS, one owner of the chrome): move the
  bar **into `AdminDashboard`**, passing `email` + `onSignOut` as props from `admin-main.jsx`; delete the
  inline `<header>` in `admin-main`. That puts the whole persistent chrome (bar → H1 → tabs) in one
  component under one `.ci-app` paper wrapper, matching the mockup as a single layout. *(Fallback: keep
  the bar in `admin-main` but wrap the `ok` branch in `.ci-app` and restyle it with classes — avoid, it
  leaves the chrome split across two files.)*
- **Contents:** logo tile + `CryptoIdea · Admin` lockup (left); `email` + `Log out` (right).
- **Style:** paper tokens only (`--paper`/`--ink`/`--line-2`/`--display`), bottom border, `backdrop-filter`
  blur, opaque enough that content passing under is fully covered. New CSS class (e.g. `.adm-bar`) — this
  **replaces** `.adm-head`. **Exactly one** `position:sticky; top:0` element remains → no z-index race.
- **Logo tile:** green rounded square (`--accent`), serif `C`, matching the mockup's mark.

### 4.2 Persistent `Admin dashboard` H1 + relocated Live Data pill
- New title row at the top of the dashboard body, below the bar: `<h1 class="adm-h1">Admin dashboard</h1>`
  (left) + the **Live Data pill** (right). Reuse the existing `.adm-live` markup/state (`statsErr ? Error
  : stats ? Live Data : Loading…`), just moved out of the deleted `.adm-head`.
- The H1 is **constant** across all tabs and all drill-ins (confirmed against the mockup: it still reads
  "Admin dashboard" while inside Settings → API keys).

### 4.3 Sticky behavior / guaranteed no-overlap
- Only the bar is sticky; the H1 row and the tab bar are **normal flow** and scroll under the bar.
- Because the H1 is normal-flow content *below* a bar with an opaque/blurred background, it can **never**
  render on top of the bar — the founder's "never allow the H1 on top of the header bar" is satisfied
  structurally, not by z-index juggling.
- Remove the second sticky context (`.adm-head`'s `position:sticky`) entirely.

### 4.4 Back / return controls — every drill-in and every popup
Standardize on the mockup's **white rounded `‹` button** (extend the existing `.detail-head` / `.icon-btn`
+ `SI.back`). Audit of current state → required change:

| Surface | Type | Today | Change |
|---|---|---|---|
| Users → user detail | drill-in | `<DHead>` back ‹ + centered title (L631) ✅ | restyle button to mockup; ensure not obscured by the single bar |
| Settings → apiKeys / email / plans / ai / analytics / announcement / access | drill-in | `<DHead>` back ‹ + centered title (L970) ✅ | same restyle |
| Step-up **unlock** modal | popup | text **Cancel** only (L1414) | add a consistent back/close control (‹ or ×) to the header of the modal |
| **View-as** read-only viewer | popup | ‹ close, but on the **right** of the bar (L1430) | move ‹ to the **left** to match the drill-in pattern |
| **Empty-trash** confirm (L910) · per-row **purge** confirm (L940) · **delete-account** confirm (L747) · **view-as reason** form (L713) · **grant-manager** lookup | inline confirms | Cancel buttons | keep Cancel; make the affordance visually consistent (same button treatment) |

> Note: most drill-ins **already** have a back chevron — the founder's report is driven mainly by the
> header overlap (§4.1) hiding/《confusing》 it. The work here is **consistency + styling to the mockup**,
> not building back-nav from scratch. The two *modals* are the only genuine gaps.

### 4.5 Sign-in / denied / loading reskin (decision 3)
[`src/admin-main.jsx`](../../src/admin-main.jsx) `wrap`/`card`/`input`/`btn`/`logo` are raw inline styles
using purple `#6C5CE7` + grey borders — off-brand.
- Wrap each non-`ok` phase in `.ci-app`; replace inline styles with paper classes (mirror the user app's
  already-paper Login — `auth-wrap` / `field-input` / green accent button).
- Add the **green logo tile** to the sign-in `logo` lockup.
- Loading phase + [`admin.html`](../../admin.html)'s `.app-loading` placeholder: use the paper background
  (`#faf9f5`) for a consistent first paint.

## 5. File map (the consistency sweep — when built)

| File | Change |
|---|---|
| [`src/admin-main.jsx`](../../src/admin-main.jsx) | Delete inline `<header>` from `ok`; render `<AdminDashboard email={…} onSignOut={signOut} />`. Reskin `login` / `denied` / `loading` to paper + logo tile (drop `#6C5CE7`). |
| [`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) | Accept `email`/`onSignOut` props; render the unified `.adm-bar` (logo+brand left, email+Log out right); **remove** `.adm-head`; add the `Admin dashboard` H1 row + relocate `.adm-live` pill; restyle `DHead`/`icon-btn` back button; standardize the unlock + view-as modal close controls. |
| [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) | New `.adm-bar` (single sticky, paper, blur, border) + `.adm-logo` tile + `.adm-h1`/`.adm-title-row`; relocate `.adm-live`; retire `.adm-head`; mockup back-button styling on `.detail-head .icon-btn`; modal-close consistency; any paper classes the sign-in screens need. |
| [`admin.html`](../../admin.html) | (Minor) paper background on the `.app-loading` placeholder. |
| [`tests/unit/admin-dashboard.test.jsx`](../../tests/unit/admin-dashboard.test.jsx) | Update assertions tied to the old `.adm-head`/Live-Data placement; add: single header, `Admin dashboard` H1 present on tabs + drill-ins, back button present on each drill-in. |
| Docs on BUILD | Update [`CLAUDE.md`](../../CLAUDE.md) "Admin & privacy" note + memory `admin-d-settings-reskin`; flip this doc's status + the §ADMIN-UI backlog entry to BUILT with the commit hash. |

## 6. Acceptance criteria (Definition of Done, when built)
- [ ] Exactly **one** `position:sticky` element at the top of `/admin`; no overlapping brands.
- [ ] Bar = green logo tile + `CryptoIdea · Admin` (left) + email + `Log out` (right).
- [ ] `Admin dashboard` `<h1>` visible on **every** tab **and** every drill-in; never covered by the bar
      on scroll.
- [ ] `Live Data` pill sits beside the H1 (not in the bar); still reflects live/error/loading state.
- [ ] Every drill-in shows the white rounded `‹` back button + its own centered title.
- [ ] Every popup/modal (unlock, view-as, empty-trash, purge, delete-account, view-as reason, grant) has
      a clear, consistently-styled back/close.
- [ ] Sign-in / denied / loading on paper + logo tile; **no** purple anywhere.
- [ ] **Design-only:** no callable/handler/rule/data change; no new dependency.
- [ ] Admin stays **light paper only** (the admin app never sets `html[data-theme]` — no dark mode).
- [ ] `npm run test:unit` green · `npm run build` clean (no-names guard) · browser-verified as **owner**
      and **manager**, **mobile + desktop**.

## 7. Non-goals / out of scope
- No dark mode for admin (unchanged — light paper only).
- No functional/logic/security change — the callables, rules, role gates, audit and step-up re-auth all
  stay exactly as they are.
- No new charting/UI dependency (the header is plain CSS; the logo tile is a styled `<div>`/inline SVG).

## 8. Visual fidelity — cards · category bar · sizing (✅ BUILT 2026-07-25)

> **Second founder request (2026-07-25):** make the panel's **cards ("pill cards"), the category (tab)
> bar, and the overall sizing** match [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html)
> precisely, while **keeping the current responsive behaviour** (the mockup is desktop-only — it has no
> phone/tablet layout). **✅ BUILT** in the same pass as §1–§7. Values below were **measured from the
> mockup** (rendered in-browser + read from its embedded CSS) on 2026-07-25 and are the as-built targets —
> all verified live (active tab `rgb(10,107,77)`, shell 1140px, cards/stat 22px, tab bar white + gap 3,
> H1 34px desktop / 25px mobile via `clamp()`).

### 8.1 Interview — locked decisions (2026-07-25)
1. **"Size match" = all three axes:** **spacing/density** (padding, radius, gaps) **+** **typography scale**
   (H1 34px, tab text, card numbers/titles/labels) **+** **content width** (desktop shell).
2. **Pill-card look on ALL card surfaces** — Overview stat tiles + content panels, Users/Audit list rows,
   Settings panels, **and** modals — extrapolated to the surfaces the mockup doesn't itself show.
3. **Whole panel** — every tab, drill-in and modal, not just the Overview the mockup depicts.
4. **Mobile/tablet:** **keep the existing responsive breakpoints and stacking exactly**; restyle only. The
   mockup's desktop-only layout is never forced onto small screens.

### 8.2 Measured mockup targets vs. current (the deltas to close)
Line refs are into [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) as it stands today.

| Surface | Mockup target (measured 2026-07-25) | Current | Change |
|---|---|---|---|
| **Shell width** (`.adm-shell`) | `max-width: 1140px` (two ~680px inner columns) | `1040px` (L65) | widen **1040 → 1140** |
| **Category bar** (`.adm-tabs`) | white bg · 1px `--line-2` · radius 999px · **gap 3px** · pad 4px · soft 2-layer shadow | `--paper-2` bg · gap 4px · pad 4px · radius 999 (L81) | bg → white · gap 4→3 · add the soft shadow |
| **Active tab** (`.adm-tab.active`) | **green `--accent` (#0a6b4d)** bg · white text · **14px**/600 · pad **11px 0** | **`--ink`** (near-black) bg · 13px · pad 9px 6px (L82,84) | **near-black → green** · 13→14px · taller pad |
| **Cards** (`.adm-stat`, `.adm-card`, list rows, Settings panels, modal) | white · radius **22px** · **0.8px** border `rgba(21,20,15,.06)` · shadow `0 1px 1px rgba(21,20,15,.03), 0 4px 12px -6px rgba(21,20,15,.07)` · pad **20–24px** | `--paper-2` · `--radius-sm` · 1px `--line-2` · `--sh-sm` · pad 16×12 (L94) | radius → 22 · softer border+shadow · roomier pad |
| **Card title** | 13px Hanken **700**, sentence case, tight tracking | stat label `.l` = 9.5px **UPPERCASE** (L96) | title style: sentence-case 13/700 (labels stay as-is) |
| **Stat number** (`.adm-stat .n`) | Fraunces display, large | 30px display (L95) | keep; scale to the mockup at build |
| **H1 "Admin dashboard"** | 34px Fraunces 600, `--ink` | no H1 today (drill-in titles read as the title) | add — see §4.2 |

**The green is already a token.** `#0a6b4d` = the app's existing `--accent` (`app.css` L16 / `research-tab.css`
L10). "Match the mockup colours" for the category bar therefore means **reuse `--accent`, do NOT introduce a
new hex** — the active tab simply moves from near-black to the house green (which also makes the admin selected
state consistent with the user app's accent).

### 8.3 How to build it (KISS · tokens · admin-scoped)
- **One file does most of the work:** [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css)
  (admin-only — already verified out of the user bundle). **No change to `app.css` tokens.**
- Introduce a **small admin-scoped token set** for the mockup's card values so every card surface points at
  one source of truth (retire per-element ad-hoc radii/shadows):
  `--adm-card-radius: 22px` · `--adm-card-border: .8px solid rgba(21,20,15,.06)` ·
  `--adm-card-shadow: 0 1px 1px rgba(21,20,15,.03), 0 4px 12px -6px rgba(21,20,15,.07)` · `--adm-card-pad`.
- **Category bar:** flip `.adm-tab.active` background `--ink → --accent`; bump font 13→14px and padding to
  ~11px; `.adm-tabs` gap 4→3 + white bg + the soft shadow.
- **Cards:** apply the shared card tokens to `.adm-stat`, `.adm-card`, the Users/Audit row cards, the Settings
  drill-in panels, and the shared modal card. Card titles → sentence-case 13/700 (the small UPPERCASE stat
  *labels* stay — they read as labels, not titles).
- **Width:** `.adm-shell` max-width `1040 → 1140`; desktop two-column content targets ~680px columns.
- **Responsive (unchanged):** everything above lives **inside** the existing media queries. Do **not** touch the
  breakpoints or the auto-fit stacking — on phone/tablet the cards keep stacking, just with the new
  radius/shadow. Verify no horizontal overflow at 375px and 768px.

### 8.4 Acceptance criteria (fidelity — on BUILD)
- [ ] Active tab renders **green** (`--accent`) with white text at the mockup's size; inactive tabs unchanged.
- [ ] Every card surface (stat tiles, content panels, Users/Audit rows, Settings panels, modals) uses the **22px
      rounded white-card** treatment from **one** shared admin token set — no ad-hoc per-card radii left.
- [ ] Desktop shell width = **1140px**; two-column content ≈ 680px columns.
- [ ] Typography matches the mockup: 34px H1, 14px tabs, 13/700 sentence-case card titles, mockup-scaled numbers.
- [ ] **Responsive unchanged:** same breakpoints + stacking; **no horizontal overflow at 375px & 768px**; admin
      stays **light-paper only** (no dark mode).
- [ ] **No new hex colours** (green = existing `--accent`); **no new dependency**; **design-only** (no
      callable / rule / handler / logic change).
- [ ] `npm run test:unit` green · `npm run build` clean · browser-verified **owner + manager**, **mobile +
      desktop**.

### 8.5 Files (adds to the §5 map — same build as §1–§7 where they overlap)
| File | Change |
|---|---|
| [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) | The bulk: shell width 1040→1140; `.adm-tabs`/`.adm-tab.active` (green + sizes + gap + shadow); the shared `--adm-card-*` token set applied to every card class; card-title style. |
| [`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) | Only if card markup/class names need normalising so every card shares the token set — **no logic change**. |
| [`tests/unit/admin-dashboard.test.jsx`](../../tests/unit/admin-dashboard.test.jsx) | Assert the active tab uses the accent/green active state; card structure unchanged; no overflow assumptions broken. |

> **Overlap with §1–§7:** the chrome plan (§1–§7) and this fidelity plan (§8) touch the **same two files**
> (`admin-settings.css`, `admin-dashboard.jsx`) and target the **same mockup**, so they are naturally **one
> build** when the founder says go — §8 is the "make the cards/tabs/sizes match" half, §1–§7 the "fix the
> header/H1/back-nav/login" half. Either can ship first; doing them together avoids re-touching the CSS twice.

## 9. ADMIN-UI-3 — mockup-match refinements (✅ BUILT — 2026-07-25)

A second founder pass over the **shipped** panel (§1–§8) against the same mockup
(`docs/mockups/admin-panel/index.html`). Five items, all **design-only** (no
callable/rule/handler/logic change), **light-paper only**, **no new dependency**, and **no new hex** —
every colour is an existing token. Backlog row: [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) §ADMIN-UI ·
ADMIN-UI-3.

**As built:** items 1–3 were real gaps (fixed below); items 4–5 were already structurally satisfied and
were confirmed by a live browser sweep — **all 7 settings sub-screens** (API keys · Email · Plans · AI ·
Analytics · Announcement · Admin access) and the **user detail + view-as modal** each render the `‹` back
control (accessible name "Back") inside a `.8px`-bordered card. **Verified:** `test:unit` (66 in the admin
suite, +2 new ADMIN-UI-3 cases) · `npm run build` clean (no-names guard; admin CSS still its own chunk) ·
browser-verified **owner + manager**, **desktop 1280 + mobile**: logo 30px from the left edge / Log out
45px from the right with the body still 1140-centered, the three Overview cards equal at 160px side-by-side
(and stacking on mobile), and the Tier Breakdown bar segment + legend colour resolving identically per tier
(Pro `rgb(7,80,58)` = `--accent-ink`; free amber; premium purple).

### 9.1 As-found deltas (measured against the running build + the mockup)

| # | Item | As-found (current build) | Mockup / founder target | Change |
|---|---|---|---|---|
| 1 | **Full-bleed header** | `.adm-bar-inner` is `max-width:1140px; margin:0 auto` → on desktop the logo + Log-out sit **inset** at the 1140-band edges. | Mockup header is full-bleed (`padding:13px 28px`, **no** max-width): logo hugs the **left edge**, Log out the **right edge**; body stays 1140-centered. | Drop the inner max-width/centering; keep the side padding (`clamp(14px,4vw,30px)`). `.adm-shell` (H1 · tabs · cards) unchanged at 1140. Mobile already full-width → unchanged. |
| 2 | **Overview cards equal size** | The 3 cards use the shared `.grid-auto` (`repeat(auto-fit,minmax(280px,1fr)); align-items:start`) → equal **width**, **unequal height** (revenue card has 2 note lines). | All three the **same size**. (Note: the mockup itself uses `1.15fr 1fr 1fr`; founder wants them **equal**, not that.) | Add an **admin-only class** on that one row (`admin-dashboard.jsx` L462) + `.ci-app.adm-root .<cls> { align-items:stretch }`. **Leave shared `.grid-auto` untouched** — the user app's Research grid uses it. Keep the mobile 1-col collapse. |
| 3 | **Tier-breakdown colours connect** | Bar fills come from `TIERS[key].bar`; the legend spans use **separate literals**. **Pro** drifts: bar `#0a6b4d` (`--accent`) vs legend `#07503a` (`--accent-ink`). Starter `#b8841f` + Premium `#7d4bbf` already match. | Each tier's **bar segment and legend label = one colour** (as the mockup: Starter `#b8841f`, Pro `#07503a`, Premium `#7d4bbf`). | Drive the legend from the **same per-tier colour** as the bar (single source), and set Pro to `--accent-ink #07503a`. White "N" on the Pro segment stays legible on the darker green. Premium(0) draws no segment (the `n>0` guard) — legend still shows it. |
| 4 | **Border + `‹` on every settings sub-screen** | Every settings drill-in already renders `<DHead>` (the `‹`) inside a `.card` (bordered since ADMIN-UI-2). API-keys is the reference. | Same bordered-card + `‹` on **all 7** (apiKeys · email · plans · ai · analytics · announcement · access). | **Verification sweep** — structurally already satisfied; browser-check each and fix any screen that renders content outside a bordered card or is missing the `‹`. |
| 5 | **Border + `‹` on the user detail + all second screens** | User detail uses `<DHead>` + `.card`; the two modals got their close controls in ADMIN-UI-1. | Same on the Users drill-in and every other "second" screen. | **Verification sweep** — browser-check the user detail · Trash confirmations · unlock & view-as modals; fix any outlier. |

### 9.2 How to build it (KISS · admin-scoped · zero new hex)

- **Item 1** — one CSS edit to `.adm-bar-inner`: remove `max-width:1140px; margin:0 auto`. The full-width
  `.adm-bar` background/border already exist. **Trade-off to accept** (it is the mockup's intent): on
  ultra-wide screens the logo/Log-out sit well outside the 1140 content band — a deliberate full-bleed bar
  over centered content, not a bug.
- **Item 2** — add class `adm-ov` to the overview `grid-auto` row; `.ci-app.adm-root .adm-ov {
  align-items:stretch }`. Equal widths already hold; this only equalises height. No breakpoint change.
- **Item 3** — in `admin-dashboard.jsx`: point the three legend `<span>`s at the same colour used for the
  bar (e.g. `TIERS[key].bar`) instead of the separate `var(--amber)`/`var(--accent-ink)`/`#7d4bbf`
  literals, and change `TIERS.pro.bar` from `#0a6b4d` to `var(--accent-ink)` (`#07503a`). One colour per
  tier, guaranteed no drift.
- **Items 4 & 5** — no new structure expected; a browser sweep of every drill-in/second screen as
  owner + manager, correcting any surface that lacks the bordered card or the `‹`.

### 9.3 Acceptance criteria (✅ all met on BUILD)

- [x] Desktop: the logo is at the **left edge** and Log out at the **right edge** of the header; body still
      1140-centered; mobile unchanged. *(1280: logo 30px in, Log out 45px in, `logoOutsideShell:true`, shell 1140.)*
- [x] The three Overview cards render **equal height** side-by-side; collapse to one column on mobile.
      *(1280: 160/160/160, same row; 408: stacked, natural heights.)*
- [x] In Tier Breakdown, **each tier's bar segment and legend label are the same colour** (Pro included).
      *(Pro `rgb(7,80,58)`=`--accent-ink`; free amber; premium purple — seg==legend per tier in-browser + unit test.)*
- [x] **Every** settings sub-screen **and** the user detail / second screens show a **bordered card + `‹`
      back** (reference: API keys). *(All 7 sub-screens + user detail + view-as modal swept live.)*
- [x] `test:unit` green · `build` clean (no-names guard) · browser-verified **owner + manager**, **mobile +
      desktop**; light-paper only; **no new hex, no new dependency**.

### 9.4 Files (same two + tests — as §5/§8.5)

| File | Change |
|---|---|
| [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) | `.adm-bar-inner` full-bleed (drop max-width); new `.ci-app.adm-root .adm-ov { align-items:stretch }`. |
| [`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) | `adm-ov` class on the overview grid row; tier legend colours driven from the per-tier bar colour; `TIERS.pro.bar → --accent-ink`. **No logic change.** |
| [`tests/unit/admin-dashboard.test.jsx`](../../tests/unit/admin-dashboard.test.jsx) | Assert the Pro legend + Pro bar segment resolve to the same colour; overview row carries the equal-height class. |

---

## 10) ADMIN-UI-4 — visible back button + bordered header on every second-screen (✅ BUILT — 2026-07-25)

> **✅ BUILT (2026-07-25), same pass as [[ADMIN-UI-5]] below.** A new `DScreen({title,onBack,children})`
> primitive replaced the bare `DHead`: every drill-in now renders **one** card whose top is a divided
> header (`.adm-scr-head`) carrying a **34×34 bordered `‹` box** (accessible name "Back") + the centered
> title **once**, over the body (`.adm-scr-body`). Converted: the **7 Settings sub-screens** (dropping each
> screen's duplicate `.card-title`; the AI screen's "reserved — live AI ships at go-live" qualifier moved
> into its body copy), **Admin access** (its inner cards demoted to `.adm-scr-section` dividers — no
> card-in-card), and the **Users → user-detail** drill-in (dropping the redundant bold name, kept as the
> header title). `DHead` is retired. The view-as modal already carried a bordered `‹` (kept). CSS is one
> block in `admin-settings.css`, scoped under `.ci-app.adm-root` (`.card.adm-scr` compound beats the shared
> `.card` padding), so the user app's `.icon-btn`/`.detail-head` are untouched — no new hex/dependency.
> **Verified:** build clean · 67 admin unit tests green (+2 new UI-4 cases) · browser (owner) desktop 1280 +
> mobile 375: bordered header + 34×34 back box, title shown once, **zero** `.detail-head` left, no overflow,
> no console errors.

Founder pass over the shipped panel (ADMIN-UI-1/2/3). On every admin **second-screen** (drill-in / popup)
the `‹` back control is technically present (accessible name "Back") but renders as a **bare, borderless
chevron** floating above the card — `app.css` styles the shared `.icon-btn` as `background:none; border:0;
padding:0`, so in the admin panel it reads as **no visible back button**. And the screen **title has no
bordered header**: it sits as a lone centered line above a separate card whose first line **repeats** the
same title (the API-keys screen shows "API keys" twice, no border, no visible back).

This is the real fix behind **ADMIN-UI-3 items 4/5**, which only verified the `‹` **existed in the DOM** —
not that it was **visible** or matched the mockup's bordered header.

**Target (founder chose, 2026-07-25 — "attached to the card, like the screenshot"):** the `‹` back button
(a **34×34 bordered rounded box**) + the **centered title** sit in a **white header row at the top of the
screen's card, with a divider line under it**, then the body — exactly the
[`docs/mockups/admin-panel`](../mockups/admin-panel/index.html) look. The redundant in-card title is
dropped so the title shows **once**. Main tabs (Overview / Users / Trash / Settings / Audit) are untouched —
**second screens only**.

**Scope — every second-screen:** the **7 Settings sub-screens** (API keys · Email · Plans · AI · Analytics ·
Announcement · Admin access) + the **Users → user-detail** drill-in + the read-only **view-as** popup. (The
step-up unlock modal + Trash confirmations already carry their own close/cancel controls — sweep to confirm.)

### 10.1 How to build it (KISS · admin-scoped · design-only · no new hex)

- New tiny **`DScreen({title, onBack, children})`** primitive in `admin-dashboard.jsx` (beside `DHead`):
  one `.card` (`.adm-scr`) whose top is `.adm-scr-head` (the bordered `‹` box + centered `.dh-title` +
  a 34px spacer, with a `border-bottom` divider) over an `.adm-scr-body`.
- CSS in `admin-settings.css`, **scoped under `.ci-app.adm-root`** (so the shared `.icon-btn`/`.detail-head`
  the *user app* uses are left byte-for-byte unchanged): `.adm-scr { padding:0; overflow:hidden }` ·
  `.adm-scr-head { display:flex; align-items:center; gap:10px; padding:13px 16px; border-bottom:1px solid
  var(--line-strong) }` · `.adm-scr-head .dh-title { … flex:1; text-align:center }` · `.adm-scr .icon-btn {
  width:34px; height:34px; border-radius:11px; background:var(--paper-2); border:1px solid var(--line-strong);
  color:var(--ink-soft) }` · `.adm-scr-body { padding:16px 18px }`. Existing tokens only — **no new hex**.
- Convert the **6 single-card settings screens** + the **user-detail** card to `DScreen` (drop the duplicate
  `.card-title`, keep `.card-sub`); remove the shared `<DHead>` at the settings switch and the user-detail
  `<DHead>`.
- **Admin access** (multi-card) → wrap in `DScreen` and demote its inner `.card`s to divider-separated
  **sections** so there's no card-in-card.
- Give the **view-as** modal header the same bordered `‹`.

### 10.2 Acceptance criteria (✅ all met on BUILD)

- [x] Every second-screen shows a **bordered `‹` box** + a **bordered/divided header** carrying the title
      **once**; **no bare chevron** anywhere in the admin. *(computed: back box 34×34 `.8px` border; title
      count = 1; `.detail-head` count = 0.)*
- [x] Main tabs (Overview / Users / Trash / Settings / Audit) unchanged; the **user app's** back chevrons
      unchanged (shared `.icon-btn` untouched — every override scoped under `.ci-app.adm-root`).
- [x] `test:unit` green — the existing "Back" / "Save keys" / "CHANGE TIER" assertions still pass, plus **2 new
      cases** asserting the bordered header on the Settings + user-detail drill-ins.
- [x] `build` clean (no-names guard) · browser-verified **owner**, **desktop 1280 + mobile 375** (the drill-in
      chrome is role-independent; Settings is owner-only regardless); light-paper only; **no new hex, no new
      dependency**.

### 10.3 Files

| File | Change |
|---|---|
| [`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) | New `DScreen` primitive; wrap the 8 second-screens; drop the duplicate titles + the shared `<DHead>`; view-as `‹`. **No logic change.** |
| [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) | New `.adm-scr / .adm-scr-head / .adm-scr-body / .adm-scr .icon-btn` block, scoped under `.ci-app.adm-root`. |
| [`tests/unit/admin-dashboard.test.jsx`](../../tests/unit/admin-dashboard.test.jsx) | Assert a drill-in renders the bordered header (`.adm-scr-head`) with the visible `‹` box. |

## 11) ADMIN-UI-5 — match the mockup's card + text SIZE (Overview bigger, Settings smaller) (✅ BUILT — 2026-07-25)

> **✅ BUILT (2026-07-25), same pass as [[ADMIN-UI-4]] above.** Overview grew to the mockup scale and
> Settings shrank. The Overview content is wrapped in an **`.adm-ov-screen`** scoping div so the size bumps
> land on Overview ONLY — **a build-time correction to the plan below: `.adm-mini` is ALSO used in the
> user-detail drill-in**, so a global bump (as §11.2 assumed) would have enlarged that too. Under
> `.adm-ov-screen`: `.adm-stat .n` **38px**, `.adm-stat .l` **11px**, `.adm-kv .v` **30px**, `.adm-mini .n`
> **26px**, `.card` padding **30px** (all measured live). Settings shrank for free: the `DScreen`
> `.adm-scr-body` is **18px** (the founder's "settings smaller"). Users/Trash/Audit + the user-detail minis
> stayed put (verified `.adm-mini .n` = 22px there). All overrides scoped under `.ci-app.adm-root` — the user
> app is untouched, no new hex/dependency. **Verified:** build clean · unit test asserts the `.adm-ov-screen`
> wrapper · browser (owner) desktop 1280 + mobile 375: exact computed sizes above, user-detail minis 22px, no
> overflow.

**Founder report:** the mockup's cards and text are *bigger* than the live panel; apply the mockup's sizing —
**except Settings, where the cards should be smaller.** Verified true: ADMIN-UI-2 (§8) matched the card
*chrome* (22px radius, .8px border, 2-layer shadow) but kept the pre-mockup **padding (22px)** and the smaller
**type scale**. Values below are measured from the bundled mockup files (inline styles).

### 11.1 Locked decisions (founder interview, 2026-07-25)
1. **Scope = Overview only.** The big numbers exist only on Overview (stat tiles + revenue/usage/tier cards).
   **Users / Trash / Audit keep today's dense list sizing** — they're row lists (`.adm-list`/`.adm-row`), not
   stat cards, so there is nothing there to "enlarge."
2. **Match the mockup exactly** (no toning down).
3. **Settings cards shrink to the settings mockup's ~18px padding** (text already ~13/11.5px).

### 11.2 Target values — Overview (grow to [`admin-panel`](../mockups/admin-panel/index.html))

| Element (CSS in `admin-settings.css`) | Live now | Target | Overview-only? |
|---|---|---|---|
| `.adm-stat .n` (TOTAL/STARTER/PRO/PREMIUM number) | 30px | **38px** | ✅ `.adm-stat` is Overview-only → bump the class directly |
| `.adm-stat .l` (stat label) | 9.5px | **11px** | ✅ same |
| `.adm-kv .v` (revenue "$9" value) | 22px | **30px** | ✅ `.adm-kv` is Overview-only |
| `.adm-mini .n` (usage minis 4 / 15) | 22px | **26px** | ✅ `.adm-mini` is Overview-only |
| Overview card padding | 22px | **30px** | ⚠️ `.card` is SHARED (see 11.4) |
| Card radius | 22px | 22px | already match — no change |

### 11.3 Target values — Settings (shrink to [`admin-settings`](../mockups/admin-settings/index.html))

| Element | Live now | Target |
|---|---|---|
| Settings drill-in card padding | 22px (shared `.card`) | **~18px** |
| Settings card text (`.card-title` / `.card-sub`) | 13px / 11.5px | unchanged (already matches) |

### 11.4 How to build it (KISS · admin-scoped · design-only · no new hex/dep)
- **The three Overview *text* bumps are safe to apply on their own classes** — `.adm-stat`, `.adm-kv`, and
  `.adm-mini` render **only** on Overview, so raising their font-sizes touches nothing else.
- **Card *padding* is the one shared lever** — `.ci-app.adm-root .card { padding:var(--adm-card-pad) }`
  (`--adm-card-pad:22px`) is used by Overview cards **and** the user-detail drill-in **and** the Settings
  screens. So **do NOT move the shared token**; instead give each surface its own pad:
  - **Overview** cards → **30px** (via an Overview-screen scope, e.g. a wrapper class on the Overview view).
  - **Settings** drill-in cards → **~18px**. Because [[ADMIN-UI-4]] already restructures every Settings
    second-screen into a `DScreen` card, **fold the 18px Settings padding into `DScreen`'s `.adm-scr-body`**
    (`.adm-stat`/`.adm-kv`/`.adm-mini` don't exist in Settings, so only padding differs there).
  - Leave the **user-detail** drill-in and the **data-tab list containers** at today's sizing.
- **Sequence: build ADMIN-UI-4 first, then UI-5** (UI-4 owns the Settings-card restructure; UI-5 just sets its
  padding + the Overview text sizes). They can also ship together.

### 11.5 Acceptance criteria (DoD — ✅ all met)
- [x] Overview stat tiles read **38/11px**, revenue **30px**, usage minis **26px**, Overview cards **30px** pad —
  pixel-matching the admin-panel mockup *(all confirmed via `getComputedStyle`)*.
- [x] Settings drill-in cards visibly smaller (**18px** `.adm-scr-body` pad); Users / Trash / Audit **unchanged**;
  the user-detail minis stayed **22px** (the `.adm-mini`-is-shared trap — scoped under `.adm-ov-screen`); the
  user app is untouched (all overrides scoped under `.ci-app.adm-root`).
- [x] `test:unit` green *(67 admin cases, +1 new `.adm-ov-screen` assertion)* · `build` clean · browser-verified
  owner, desktop 1280 + mobile 375 · light-paper only · **no new hex, no new dependency.**

### 11.6 Files
| File | Change |
|---|---|
| [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) | Bump `.adm-stat .n/.l`, `.adm-kv .v`, `.adm-mini .n`; Overview-scoped 30px card pad; Settings/`DScreen` 18px pad. |
| [`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) | Only if an Overview-screen wrapper class is needed to scope the 30px pad. No logic change. |
| [`tests/unit/admin-dashboard.test.jsx`](../../tests/unit/admin-dashboard.test.jsx) | Assert a stat number carries the enlarged size (or the Overview wrapper class), so the scale can't silently regress. |

## 12) ADMIN-UI-6 — header typography fidelity (wordmark font/size · `· Admin` · Log out · email) (📋 PLAN ONLY — 2026-07-26)

> **📋 PLAN ONLY (2026-07-26) — NOT built.** Founder asked to **"add to plan only."** Fourth founder pass over
> the shipped header bar (ADMIN-UI-1/2/3). **Design-only**, **light-paper only**, **no new hex** (every target
> maps to an existing token), **no new dependency**. Touches **one file** —
> [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) — plus its test. No JSX/markup change:
> the header elements already exist from ADMIN-UI-1; this only restyles them.

**Founder report (2026-07-26):** in the top bar, the **`CryptoIdea` wordmark** is smaller than the mockup
**and in a different font**; the **`· Admin`** label is too small; the **`Log out`** button is too small, its
text too small, and it's **too round**; and the **`admin@test.com`** email is too small. *"Make it the same as
the mockup for the size, font and style."*

**Verified against the mockup** ([`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html) —
values read straight from the decoded header block's inline styles, no browser estimate) — founder is right on
every point. **Key finding:** the wordmark was built in **Fraunces `--display` (serif)** at 17px, but the
**mockup renders it in Hanken Grotesk `--body` (sans)** at 18px/600. That serif↔sans mismatch is the "different
font." The green tile's `C` stays serif in both.

### 12.1 Measured deltas — mockup vs. current build
Line refs are into [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) as it stands today.
Mockup source: the sticky header `<div>` at the top of the decoded template (`padding:13px 28px`, brand lockup
`font-size:18px; font-weight:600` on the container, no `font-family` override → inherits the sans body font).

| # | Element (selector) | Current build | Mockup target (measured) | Change |
|---|---|---|---|---|
| **1** | **Wordmark `CryptoIdea`** (`.adm-brand-txt`, L104) | `--display` **serif** · 17px · wt 500 · tracking −.02em | **`--body` sans** · **18px** · **wt 600** · tracking −.01em | **serif → sans** · 17→18 · 500→600 · −.02→−.01em |
| **2** | **`· Admin` sub** (`.adm-sub`, L106) | `--body` · **12px** · wt 600 · tracking .02em · `--ink-faint` | inherits **18px** · **wt 500** · `--ink-faint` · no extra tracking | 12→18px · 600→500 · drop .02em (colour already right) |
| **3** | **`Log out` button** (`.adm-logout`, L109) | pad 7×14 · radius **999px** (pill) · 12.5px/600 · border `--line-strong` | pad **9×16** · radius **12px** · **13px/700** · border `--line-strong` · bg white | bigger pad · **less round (pill→12px)** · 12.5/600→13/700 |
| **4** | **Email** (`.adm-email`, L108) | 12.5px · `--ink-faint` | **13px** · **`--ink-soft`** | 12.5→13px · faint→soft (bigger + a touch darker) |
| 5 | **Right-group gap** (`.adm-bar-right`, L107) | gap 12px | gap 14px | 12→14 *(minor)* |
| — | **Bar padding** (`.adm-bar-inner`, L98) | 11px clamp(14,4vw,30) | 13px 28px | vertical 11→13; **keep the responsive clamp** (28 = its max) |
| — | **Logo tile `C`** (`.adm-logo`, L102) | 28×28 · radius 8 · serif 16/600 (**LOGO-2**, 2026-08-04) | 28×28 · radius 8 · serif 16/600 | ✅ **matches** — LOGO-2 aligned the tile to the landing geometry (sign-in `.adm-logo.lg` → ~44/r13) |
| — | **Bar border** (`.adm-bar`, L92) | 1px `--line-2` | 1px `--line` | *(optional)* a hair more visible |

**All targets are existing tokens — no new hex:** `#15140f`=`--ink` · `#55534b`=`--ink-soft` ·
`#928f85`=`--ink-faint` · `#0a6b4d`=`--accent` · `#ece9e1`=`--line` · `#ddd9cf`=`--line-strong` · Fraunces =
`--display` · Hanken Grotesk = `--body`. **The founder's four reported items are #1–#4;** #5 and the two "—"
rows are small fidelity touch-ups measured alongside — apply or skip.

> ⚠️ **Note the direction on the tile:** the founder asked for the *text* to be **bigger**, but the mockup's
> green **tile** is actually a hair **smaller** (28 vs 30). The tile wasn't part of the report — recommend
> **leaving it at 30/9/18**, or align it to 28/8/16 for strict fidelity. Bumping the text to 18px already
> restores the mockup's text-to-tile proportion without shrinking the tile.
> **✅ Settled by LOGO-2 (2026-08-04):** `.adm-logo` is now the landing geometry **28/8/16** (sign-in
> `.adm-logo.lg` → ~44/r13), so the admin tile matches the app + landing marks; the "no purple" rule is unchanged.
> **✅ LOGO-parity (2026-08-05):** `.adm-logo` is now pinned to the index brand green **`#0b6b4f`** (not the
> `--accent` token, which stays `#0a6b4d` for the tabs/pills) and gained the shared hover **`rotate(-6deg)
> scale(1.06)`**, fired from the `.adm-brand` bar lockup + the `.adm-auth-logo` sign-in lockup — a true match
> to the landing mark on every admin surface.

### 12.2 One open decision (founder confirm before build)
**The wordmark font — serif → sans.** ADMIN-UI-1 deliberately set the wordmark in the Fraunces serif
(`--display`) to echo the app's display type; the mockup uses the Hanken sans (`--body`). "Match the mockup" =
**switch the wordmark to sans** — the single most visible change (it changes the brand lockup's character), so
it's flagged explicitly rather than buried. **This plan recommends: sans, per the mockup.** If you'd rather
keep the serif wordmark and only bump its size/weight, say so and item #1 drops the font swap (keep
`--display`, just 17→18px / 500→600).

### 12.3 How to build it (KISS · admin-scoped · design-only · no new hex/dep)
- **One file:** every edit is in [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) — the
  admin-only sheet (already verified out of the user bundle). **No JSX/markup change** — the header structure
  (`.adm-brand` / `.adm-brand-txt` / `.adm-sub` / `.adm-email` / `.adm-logout`) already exists from ADMIN-UI-1.
- **Wordmark (#1):** on `.adm-brand-txt` swap `font-family:var(--display)` → `var(--body)`, 17→18px, wt
  500→600, tracking −.02→−.01em. `.adm-brand-txt b` may stay 600 (now equal to the base) or be collapsed.
- **`· Admin` sub (#2):** on `.adm-sub` **remove** `font-size:12px` and `letter-spacing:.02em` (so it inherits
  the 18px lockup), set `font-weight:500`; keep `color:var(--ink-faint)`.
- **Log out (#3):** on `.adm-logout` radius 999px→**12px**, pad 7×14→**9×16**, font 12.5→**13px**, wt
  600→**700**. Border / bg / hover unchanged (already `--line-strong` / white / `--paper-3`).
- **Email (#4):** on `.adm-email` 12.5→13px, colour `--ink-faint`→`--ink-soft`; keep the ellipsis + max-width.
- **Touch-ups (optional):** `.adm-bar-right` gap 12→14; `.adm-bar-inner` vertical 11→13 (**leave the horizontal
  `clamp`** — do NOT hard-code 28px or you lose the phone padding); `.adm-logo` 30/9/18→28/8/16 (**done by
  LOGO-2, 2026-08-04** — now landing geometry; the sign-in `.adm-logo.lg` scaled to ~44/r13); `.adm-bar` border
  `--line-2`→`--line`.
- **Responsive:** the wordmark already `white-space:nowrap; text-overflow:ellipsis`; at 18px re-check 375px so
  `CryptoIdea · Admin` + email + `Log out` don't overflow — the email truncates first (`max-width:min(40vw,240px)`).
  No breakpoint change expected.

### 12.4 Acceptance criteria (DoD — when built)
- [ ] Wordmark renders in **Hanken sans 18px/600** (or the founder-confirmed choice), not Fraunces serif.
- [ ] `· Admin` renders at the lockup size (**18px/500**, grey), not 12px.
- [ ] `Log out` is a **12px-radius** button (not a pill), pad 9×16, text **13px/700**.
- [ ] Email is **13px** in `--ink-soft`.
- [ ] **No new hex, no new dependency;** admin stays **light-paper only**; **one file**
      (`admin-settings.css`) + its test changed (no JSX / logic / rule / callable change).
- [ ] `npm run test:unit` green · `npm run build` clean (no-names guard) · browser-verified **owner**,
      **desktop 1280 + mobile 375** (no header overflow at 375; computed sizes match the table via
      `getComputedStyle` — the real guard for CSS-file values).

### 12.5 Files
| File | Change |
|---|---|
| [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) | Restyle `.adm-brand-txt` (sans/18/600), `.adm-sub` (18/500, drop 12px+tracking), `.adm-logout` (radius 12 + pad 9×16 + 13/700), `.adm-email` (13 + `--ink-soft`); optional `.adm-bar-right` / `.adm-bar-inner` / `.adm-logo` / `.adm-bar` touch-ups. **No new hex.** |
| [`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) | **No change expected** (header structure already present). Only touched if `.adm-brand-txt b` is collapsed into the base span. |
| [`tests/unit/admin-dashboard.test.jsx`](../../tests/unit/admin-dashboard.test.jsx) | Keep the existing header-render assertions (wordmark text present, `Log out` button present). **Note:** jsdom won't resolve a CSS-file font stack or px, so the font/size targets are verified **in-browser** (`getComputedStyle`), not by unit test — mirror the ADMIN-UI-5 approach of asserting structure, not computed CSS. |

## 13) ADMIN-UI-7 — Overview card fidelity (card padding + Tier-breakdown pill) (📋 PLAN ONLY — 2026-07-26)

> **📋 PLAN ONLY (2026-07-26) — NOT built.** Founder asked to **"add to plan for the design of admin panel."**
> Fifth founder pass, this one over the **Overview** cards (not the header). **Design-only**, **light-paper
> only**, **no new hex** (every target maps to an existing token), **no new dependency**. Touches **one file** —
> [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) — plus its test. **No JSX/markup change:**
> the Overview cards, mini-tiles, tier bar and legend all already exist; this only restyles them.

**Founder report (2026-07-26):** two things on the Overview screen (Est. monthly revenue / Combined usage / Tier
breakdown / Plan limits):
1. *"each card pill [is] using more of the card space and there's no extra space between the text and the borders
   of the card pill. make the design match this card pills of the mockup."*
2. *"the tier breakdown card pill … the colours of each connect to each other. Starter, Pro, Premium have colour
   connection, I want it to be same design for the admin panel."*

**Verified against the mockup** ([`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html) —
values read straight from the decoded Overview block's inline styles, no browser estimate) — founder is right on
both. **Two key findings:**
- **(#1 padding.)** The current Overview cards are padded **`30px`** (`.adm-ov-screen .card`, set by ADMIN-UI-5),
  but the **mockup cards are `20px`** (Plan limits `20px 24px`). ADMIN-UI-5 shipped a *roomier-than-mockup* pad;
  this pass tightens it back to the true mockup value, so the content "uses more of the card." (The big Overview
  text — 38/30/26px — is set independently and does **not** shrink; only the inset does.)
- **(#2 tier bar.)** The bar's segment **colours already match the mockup exactly** (`TIERS[key].bar`: Starter
  `#b8841f` = `--amber`, Pro `--accent-ink` = `#07503a`, Premium `#7d4bbf` — identical to the mockup legend). The
  *only* reason the tiers don't "connect" is the **bar shape**: current `border-radius:8px` (a rounded rectangle)
  vs the mockup's **`999px` full pill**. Making the bar a pill is the entire fix — **no colour change at all.**

### 13.1 Ask #1 — card padding + usage mini-tiles (measured deltas)
Line refs into [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) as it stands today.

| # | Element (selector) | Current build | Mockup target (measured) | Change |
|---|---|---|---|---|
| **A1** | **Overview card padding** (`.adm-ov-screen .card`, L194) | **30px** (all Overview cards) | **20px** (revenue / usage / tier / growth); **Plan limits `20px 24px`** | **30 → 20** — the main "extra space" fix |
| **A2** | Usage mini-tiles row (`.adm-minis`, L213) | `flex; gap:8px` | `grid 1fr 1fr; gap:10px` | gap **8 → 10** (flex vs grid is cosmetic — both = two equal tiles) |
| **A3** | Mini-tile (`.adm-mini`, L214) — ⚠️ **shared** | radius `--radius-xs` (**11px**) · pad **12×10** | radius **14px** (`--radius-sm`) · pad **14×10** | rounder + a hair taller |
| **A4** | Mini-tile label (`.adm-mini .l`, L216) | **9px** · tracking .05em | **10px** · tracking .08em | slightly bigger |
| — | Mini-tile number (`.adm-mini .n`, L198) | **26px** (already bumped by `.adm-ov-screen`) | 26px | ✓ already matches |

> ⚠️ **`.adm-mini` / `.adm-minis` are SHARED** — they also render the **user-detail drill-in** tiles
> (admin-dashboard.jsx L685–687), which must stay at today's size. So A2–A4 must be scoped under
> **`.adm-ov-screen`**, NOT the bare class (exactly the trap ADMIN-UI-5 already flagged at L190/408 — grep a
> class's usages before bumping it globally). A1 is already Overview-scoped (`.adm-ov-screen .card`).

### 13.2 Ask #2 — Tier-breakdown bar → full pill (measured deltas)

| # | Element (selector) | Current build | Mockup target (measured) | Change |
|---|---|---|---|---|
| **B1** | **Tier bar** (`.adm-tierbar`, L224) — Overview-only | radius **8px** · h26 · bg `--paper-3` · no top gap | radius **999px** · h26 · bg `#fcfbf8` (=`--paper-3`) · **margin-top 16px** | **8px → 999px pill** — the "connected" look |
| **B2** | Bar segment (`.adm-tierbar .seg`, L225) | min-width **22px** · **10px**/700 · `#fff` | min-width **26px** · **11.5px**/700 · `#fff` | bigger label + min-width |
| **B3** | Legend (`.adm-legend`, L226) — Overview-only | margin-top 8px · **10px**/700 | margin-top **12px** · **11.5px**/700 | bigger + more gap |
| — | **Segment & legend colours** | `TIERS[key].bar` → Starter `#b8841f` · Pro `--accent-ink` · Prem `#7d4bbf` | Starter `#b8841f` · Pro `#07503a` · Prem `#7d4bbf` | ✓ **already identical — NO colour change** |

> `.adm-tierbar` / `.adm-legend` are **Overview-only** (single use each — verified), so B1–B3 are safe to edit on
> the **bare class** (unlike the shared `.adm-mini`).

### 13.3 Related fidelity, measured alongside (optional — NOT reported)
| Element | Current | Mockup | Note |
|---|---|---|---|
| Revenue value (`.adm-kv .v`, L222) | 22→**30px** (adm-ov) · `--accent-ink` | 30px · `--accent` (`#0a6b4d`) | value hue `--accent-ink` → `--accent` |
| Revenue title (`.adm-kv .k`, L221) | 14px/600 | 13px/700 | minor |
| Revenue notes (`.adm-note-sm`, L223) | 11px · `--ink-faint` | line1 12.5px `--ink-soft` · line2 12px `--ink-faint` | first line a touch bigger/darker |
| Card titles (`.card-title`) | shared user-app size | 13px/700 | **DO NOT touch the shared class — scope under `.adm-ov-screen` if matching** |

**All targets are existing tokens — no new hex:** `#fcfbf8`=`--paper-3` · `#b8841f`=`--amber` ·
`#07503a`=`--accent-ink` · `#0a6b4d`=`--accent` · `#55534b`=`--ink-soft` · `#928f85`=`--ink-faint` · radius
**14px**=`--radius-sm` · card radius 22px=`--radius`/`--adm-card-radius`. `999px` is the literal pill value already
used across this sheet. **The founder's two reported items are A1 and B1;** everything else is small fidelity
measured alongside — apply or skip.

### 13.4 One judgement call (founder confirm before build)
**The card-padding value — 20px (exact mockup) vs ADMIN-UI-5's roomier 30px.** "Match the mockup" = **20px**, and
that is what delivers the founder's "use more of the card space." **This plan recommends: 20px** (Plan limits
`20px 24px`). If 20 reads too tight once on screen, **24px** is a sensible middle ground. Either way the big
Overview numbers are unaffected (padding is independent of font-size) — only the inset changes.

### 13.5 How to build it (KISS · admin-scoped · design-only · no new hex/dep)
- **One file:** every edit is in [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) (admin-only
  sheet, already verified out of the user bundle). **No JSX/markup change** — the cards, `.adm-minis`/`.adm-mini`,
  `.adm-tierbar`, `.adm-legend` all already exist.
- **A1 padding:** `.adm-ov-screen .card { padding:30px }` → **`20px`**. For the Plan-limits `20px 24px`, give that
  card a hook class (e.g. `adm-plan-limits`) and add `.adm-ov-screen .card.adm-plan-limits { padding:20px 24px }`
  — the *one* allowed JSX touch (a className), or keep it uniform at 20px for strict KISS.
- **A2–A4 mini-tiles (SCOPED):** add `.ci-app.adm-root .adm-ov-screen .adm-minis { gap:10px }` and
  `.ci-app.adm-root .adm-ov-screen .adm-mini { border-radius:var(--radius-sm); padding:14px 10px }` +
  `.ci-app.adm-root .adm-ov-screen .adm-mini .l { font-size:10px; letter-spacing:.08em }`. **Scoped under
  `.adm-ov-screen`** so the user-detail drill-in tiles stay put.
- **B1–B3 tier bar (bare class OK):** `.adm-tierbar` radius `8px`→**`999px`**, add `margin-top:16px`; `.seg`
  min-width `22px`→**`26px`**, font `10px`→**`11.5px`**; `.adm-legend` margin-top `8px`→**`12px`**, font
  `10px`→**`11.5px`**. **No colour edits** (segments/legend already read `TIERS[key].bar`, which already matches).
- **Optional (§13.3):** revenue value hue `--accent-ink`→`--accent`; note-line sizing; card-title 13/700 **scoped**
  under `.adm-ov-screen` (never the bare shared `.card-title`).
- **Responsive:** unchanged — the Overview grid already collapses to one column on mobile; a 20px pad + 999px pill
  bar carry down fine. Re-check 375px only to confirm the tighter pad didn't crowd the two mini-tiles.

### 13.6 Acceptance criteria (DoD — when built)
- [ ] Overview cards render at **20px** padding (Plan limits `20px 24px` if chosen), not 30px — content visibly
      closer to the card edge.
- [ ] The big Overview text is **unchanged** (38 / 30 / 26px) — only the inset shrank.
- [ ] Tier-breakdown bar is a **full 999px pill** (the tiers read as one connected colour band with rounded ends),
      not an 8px rounded rectangle; segment labels 11.5px, legend 11.5px; **colours unchanged**.
- [ ] Usage mini-tiles: radius 14px, gap 10px, label 10px — **and the user-detail drill-in tiles are UNCHANGED**
      (edits scoped under `.adm-ov-screen`).
- [ ] **No new hex, no new dependency;** admin stays **light-paper only**; **one file** (`admin-settings.css`) + its
      test changed (JSX touched only if a Plan-limits hook class is added).
- [ ] `npm run test:unit` green · `npm run build` clean (no-names guard) · browser-verified **owner**, **desktop
      1280 + mobile 375** (computed padding/radius via `getComputedStyle` — the real guard for CSS-file values; the
      pill-vs-rectangle bar is the visual check).

### 13.7 Files
| File | Change |
|---|---|
| [`src/styles/admin-settings.css`](../../src/styles/admin-settings.css) | `.adm-ov-screen .card` pad 30→20 (+ optional Plan-limits `20px 24px`); **scoped** `.adm-ov-screen .adm-minis` gap 8→10 + `.adm-ov-screen .adm-mini` radius→`--radius-sm` / pad 14×10 / label 9→10; `.adm-tierbar` radius 8→999 + margin-top 16; `.seg` 22/10→26/11.5; `.adm-legend` mt8/10→mt12/11.5. **No new hex, no colour change on the bar.** |
| [`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) | **No change expected.** Only touched if a Plan-limits hook class (`adm-plan-limits`) is added for the `20px 24px` variant. |
| [`tests/unit/admin-dashboard.test.jsx`](../../tests/unit/admin-dashboard.test.jsx) | Keep the existing Overview-render assertions (cards / mini-tiles / tier segments present). **Note:** jsdom won't compute CSS-file px/radius, so padding + the 999px pill are verified **in-browser** (`getComputedStyle`), not by unit test — the ADMIN-UI-5 approach (assert structure, not computed CSS). |
