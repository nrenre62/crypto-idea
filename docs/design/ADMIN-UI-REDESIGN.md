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
