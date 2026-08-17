# Responsive App Design (one layout, mobile → desktop)

Part of [Design](DESIGN.md) — the responsive-layout clause.

The user app (`app.html`) is one responsive layout that works on phone and desktop from the same markup — no separate desktop build. It uses a centered `.app-shell` with width tracks plus `.grid-auto` auto-fit card grids, modeled on the admin panel. The "rows vs tiles" question is resolved: Portfolio assets are a 3-up card grid on the wide track.

See also → [`../INDEX.md`](../INDEX.md) · [`CLAUDE.md`](../../CLAUDE.md) (design system) · [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) (backlog) · [`AGILE.md`](../product/AGILE.md) (Definition of Done) · the design revamp is folded into the [`Design`](DESIGN.md) hub. Reusable, stack-agnostic methodology lives in the `responsive-app` user skill.

## 1. The problem this solved

- The app was mobile-only by construction: the main wrapper was `maxWidth:430; margin:0 auto` ([`src/CryptoIdea.jsx`](../../src/CryptoIdea.jsx)). Every screen lived inside that column.
- The app `src/` has only 2 `@media` queries (one `prefers-reduced-motion` in [`app.css`](../../src/styles/app.css), one in `research-tab.css`) — it was never built to flex.
- On a wide monitor it showed that 430px column centered with empty gutters. Not broken — it just looked like a phone app floating in the middle of the screen.
- The marketing landing (`index.html`) is already responsive, but it's a separate static codebase — none of that work carries into the React app.
- The admin panel (`admin.html`) is already a proper desktop-width page — it is the model this copies.

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Layout model | Admin-style: centered container + auto-fit card grids (same markup reflows) | One fluid layout, not two. Closest to "mobile and desktop the same". |
| Content width | ~1040px, centered (`margin:0 auto`) + fluid `clamp()` padding | Matches the admin panel; consistent feel across both apps. |
| Navigation | Keep the bottom tab bar on both | Simplest; the bottom bar stays a centered floating pill on desktop. No nav rewrite. |
| Side gutters | Plain background | Cleanest; no device frame / no secondary content. |
| Scope discipline | Plan first, build per-phase on approval | Each phase shippable + committed to the Definition of Done. |
| Holdings | Portfolio assets are a 3-up card tile grid on the wide (1040) track | Tiles fill desktop width and reflow to 1 column on mobile; whole-card tap → CoinInfo (swipe retired). |

The admin model is less work than a bespoke per-screen desktop rebuild, because an auto-fit grid is one layout, not two.

## 3. As built

Shipped honoring "keep the design the same" — nothing restyled, no colors/fonts/components changed. One reusable mechanism (`.app-shell` + `.grid-auto`), zero `@media` queries, no new dependencies.

- Shell: tab screens render in a centered `.app-shell` with width tracks chosen by screen — 720px default (Portfolio, Search, Account), 560px narrow (Detail, AddEntry, CoinInfo — forms read better tighter; Contact also capped 560), and a 1040px wide track.
- Card grids (homogeneous lists only): Learn modules, Journal thesis entries, and Research coin cards reflow 1 col (mobile) → 2 (desktop) → 3 (wide) via auto-fit, gaps matched to the original stack spacing so mobile is visually identical.
- Deliberately kept single-column (design preserved): Search result rows, Account sections, Research Overview/Ask. Rows and forms are not card collections, so gridding them would change their design.
- The app's content is header/row/form-heavy, so a 1040 single-column would stretch thin elements. A centered 720 column + selective 2-up card grids gives the desktop benefit without changing any component's look; the 1040 `app-shell-wide` track carries the Portfolio asset tiles.

Verified each phase: `npm run build` clean + unit tests green + browser computed-style probes (every shell track resolves; grids reflow 1→2→3 cols by width and collapse to 1 on mobile).

## 4. The core technique

One reusable utility does the heavy lifting — copied from the admin panel ([`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx)):

```css
/* in app.css, under the .ci-app scope */
.ci-app .grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
```

A card collection wrapped in `.grid-auto` flows into 2–3 columns on desktop and collapses to 1 on a phone — automatically. No media queries, no viewport hooks, no JS. That is what "the same on mobile and desktop" means here: identical markup, the grid reflows itself.

The container matches admin:

```jsx
// CryptoIdea.jsx main wrapper
<div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 clamp(16px,4vw,32px)", paddingBottom: 78 }}>
```

The non-negotiable pairing — widen + grid + cap. Widening the container without gridding a screen makes stacked rows/prose look stretched. So every screen gets ONE of:

- Card collections → wrapped in `.grid-auto` (reflow into columns).
- Forms / prose / a single detail body (AddEntry, Login, Detail) → capped at a readable ~600px, centered, so they don't stretch awkwardly inside 1040.

Result: near-zero new `@media` queries, no JS, no new dependencies.

## 5. Per-screen treatment

| Screen | Treatment |
|---|---|
| Shell + bottom nav + overlays | container 1040 + `.grid-auto` util; bar kept as pill |
| Account | cards → `.grid-auto` |
| Learn | modules + badges → grid |
| Journal | thesis entries → grid |
| Search | results → grid |
| Research (Overview/Coins) | overview 2-col + coins grid (scoped CSS) |
| CoinInfo / Detail | card grids + body cap ~600 |
| AddEntry / Login / Forgot / Contact | cap forms ~600 centered |
| Portfolio | asset tile grid on the wide track |

## 6. Testing & verification (Definition of Done)

- Existing unit tests are content-based (text + handlers, not layout/inline styles), so CSS/wrapper changes don't break them. One exception: Login's `#FF3B30` inline error color (a test locks it) — preserve it.
- Per phase: `npm run build` + `npm run test:unit` green.
- Browser check at 1040px AND 375px using the computed-style + screenshot method (read computed `grid-template-columns` / `align-items` / element rects — don't trust a screenshot alone).
- Commit per phase with a clear message.

## 7. Pitfalls that bite (learned on this codebase)

- Widen without gridding = stretched content. Always pair §4.
- Descendant vs compound selector. Classes that all sit on the same element need a compound selector (`.ci-app.foo`), not a descendant one (`.ci-app .foo`) — the latter silently matches nothing. (This was the root cause of the login-centering bug.)
- jsdom reads inline styles only. A test asserting an exact color requires that color to stay an inline style, not a class (see Login `#FF3B30`).
- Modals shouldn't stretch. Keep overlays at a comfortable centered width; don't widen to 1040.
- Grid overflow: `1fr` has `min-width:auto`; use `minmax(0,1fr)` if children overflow.
- `.ci-app` vs `.research-root` are sibling scopes that reuse generic class names — keep new rules inside the right scope so they don't collide.

## 8. Mockups

Two faithful design mockups were created (deep-green accent, Fraunces + Hanken, 1040 container):

- Desktop Portfolio — summary band (big total left, stats right) + holdings as a 3-column auto-fit tile grid + bottom-bar pill.
- Mobile Portfolio — the same tile grid collapsed to 1 column in a phone frame + full-width bottom bar; summary stacks vertically.

They illustrate the tiles option and confirm the grid reflows with no separate mobile code. (Mockups are design previews, not generated from live data.)

## 9. Why this is the right call (KISS + security)

- Fewest moving parts: one layout, one grid utility, ~0 breakpoints, no new dependency.
- Low attack surface / low regression risk: mostly CSS + thin JSX wrappers; logic/handlers and the data layer are untouched; deny-by-default rules and the proxy model are unaffected.
- Reversible & incremental: phased, each commit shippable, each verified before "done".
