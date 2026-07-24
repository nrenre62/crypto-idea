# Admin Panel UI Redesign — unified chrome

> **Status: 📋 PLAN (2026-07-25). Nothing built.** This is the mockup→code spec for reskinning the
> `/admin` panel *chrome* (header, page title, back-navigation, sign-in screens) to match the founder
> mockup. It is **design-only** — no callable, handler, rule or data change. Building it runs the full
> [interview & consistency SOP](../interview.md): interview (done, below) → sweep every file in the map
> → verify in the browser (owner + manager, mobile + desktop) → commit.
>
> Backlog: [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) §ADMIN-UI. Reference mockup:
> [`docs/mockups/admin-panel/index.html`](../mockups/admin-panel/index.html) (self-unpacking bundle —
> open it in a browser to render the target). Sibling: [`ADMIN-PANEL-AUDIT.md`](../decisions/ADMIN-PANEL-AUDIT.md)
> is the *capability* plan (ADMIN-0…5, all built); this doc is the *visual chrome* plan and does not
> overlap it. Precedent for the paper design system: [`DESIGN-REVAMP.md`](DESIGN-REVAMP.md) /
> [`DESIGN-PASS.md`](DESIGN-PASS.md) (the user app) and the ADMIN-D/D2/D3 reskin already shipped.

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
