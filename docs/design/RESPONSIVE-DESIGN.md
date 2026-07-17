# Crypto Idea — Responsive App Design (one layout, mobile → desktop)

> **⚠ Partly SUPERSEDED by the design revamp (BUILT 2026-06-26 — [`DESIGN-REVAMP.md`](DESIGN-REVAMP.md)).**
> The responsive *shell + width tracks + `.grid-auto`* below are still the foundation, but the open
> **"rows vs tiles"** decision is **resolved**: **Portfolio assets are now a 3-up card grid on the wide
> (1040) track** (swipe retired; whole-card tap → CoinInfo). The nav is a solid-white floating pill on
> desktop, and the design *was* restyled (value card, tinted pills, dark-safe token circles). Treat any
> "rows kept / decision pending" notes below as historical; DESIGN-REVAMP.md is the current source.

> **Status: BUILT (R-0…R-4) — 2026-06-25.** Shipped as one responsive layout with the design
> unchanged (no colors, fonts, or components altered — width/flow only). Commits: `9fed965` (shell),
> `28a74f6` (Learn grid), `0653d6b` (Journal grid), `bd14965` (Research grid), `da32f03` (forms/detail
> + Contact). See "Status — as built" below for what shipped vs. the original plan.
>
> **Goal:** the user app (`app.html`) currently renders as a fixed ~430px **mobile column even on
> desktop**. Make it a single **responsive** layout that works on phone AND desktop — the *same
> markup*, **no separate desktop build** — modeled on the admin panel, which is already desktop-width.
>
> See also: [`CLAUDE.md`](../../CLAUDE.md) (design system), [`NEXT-STEPS.md`](../product/NEXT-STEPS.md) (backlog),
> [`AGILE.md`](../product/AGILE.md) (Definition of Done). Reusable, stack-agnostic methodology lives in the
> **`responsive-app`** user skill.

---

## 1. The problem (grounded in a full audit)

- The app is **mobile-only by construction**: the main wrapper is `maxWidth:430; margin:0 auto`
  ([`src/CryptoIdea.jsx`](../../src/CryptoIdea.jsx) ~line 472). Every screen lives inside that column.
- The entire app `src/` has **only 2 `@media` queries** (one `prefers-reduced-motion` in
  [`app.css`](../../src/styles/app.css), one in `research-tab.css`) — it was never built to flex.
- On a wide monitor it shows that 430px column centered with empty gutters. It is **not broken** —
  it just looks like a phone app floating in the middle of the screen.
- The marketing **landing** (`index.html`) is already responsive, but it's a **separate** static
  codebase — none of that work carries into the React app.
- The **admin panel** (`admin.html`) is already a proper desktop-width page — **it is the model we copy.**

---

## 2. Locked decisions (two founder interviews, 2026-06-24)

| Decision | Choice | Why |
|---|---|---|
| **Layout model** | Admin-style: centered container + **auto-fit card grids** (same markup reflows) | One fluid layout, not two. Closest to "mobile and desktop the same". |
| **Content width** | **~1040px**, centered (`margin:0 auto`) + fluid `clamp()` padding | Matches the admin panel exactly; consistent feel across both apps. |
| **Navigation** | **Keep the bottom tab bar** on both | Simplest; bottom bar stays a centered floating pill on desktop. No nav rewrite. |
| **Side gutters** | **Plain background** | Cleanest; no device frame / no secondary content. |
| **Scope discipline** | Plan first, build per-phase on approval | Each phase shippable + committed to the Definition of Done. |
| **OPEN — holdings** | Rows vs **tiles** (leaning tiles) | Tiles fill desktop width and reflow beautifully; rows are denser on mobile + keep swipe. **Mockups produced (§8); decision pending.** |

These supersede the earlier exploratory "Path A / Path B" framing: the admin model is **less work**
than a bespoke per-screen desktop rebuild, because an auto-fit grid is one layout, not two.

---

## Status — as built (2026-06-25)

Shipped honoring "keep the design the same" — **nothing restyled, no colors/fonts/components changed,
no rows converted to tiles.** One reusable mechanism (`.app-shell` + `.grid-auto`), zero `@media`
queries, no new dependencies.

- **Shell:** tab screens render in a centered `.app-shell` with three width tracks chosen by screen:
  **720px** default (Portfolio, Search, Account), **560px** narrow (Detail, AddEntry, CoinInfo — forms
  read better tighter; Contact also capped 560), **1040px** wide track exists but is currently unused.
- **Card grids (homogeneous lists only):** Learn modules, Journal thesis entries, and Research coin
  cards reflow **1 col (mobile) → 2 (desktop) → 3 (wide)** via auto-fit, gaps matched to the original
  stack spacing so mobile is visually identical.
- **Deliberately kept single-column (design preserved):** Portfolio coin **rows** (not tiled), Search
  result rows, Account sections, Research Overview/Ask. Rows and forms are not card collections, so
  gridding them would change their design — so we didn't.
- **Deviation from the original 1040 plan:** the app's content is header/row/form-heavy, so forcing a
  1040 single-column would stretch thin elements. A centered 720 column + selective 2-up card grids
  gives the desktop benefit without changing any component's look. The 1040 `app-shell-wide` track is
  ready if a future screen becomes a true multi-column grid.

Verified each phase: `npm run build` clean + 217/217 unit tests green + browser computed-style probes
(every shell track resolves; grids reflow 1→2→3 cols by width and collapse to 1 on mobile).

## 3. The core technique

One reusable utility does the heavy lifting — copied verbatim from the admin panel
([`src/components/admin-dashboard.jsx`](../../src/components/admin-dashboard.jsx) line 36 container, line 73 grid):

```css
/* in app.css, under the .ci-app scope */
.ci-app .grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
```

A card collection wrapped in `.grid-auto` flows into **2–3 columns on desktop and collapses to 1 on a
phone — automatically.** No media queries, no viewport hooks, no JS. That is what "the same on mobile
and desktop" means here: identical markup, the grid reflows itself.

**The container** matches admin:

```jsx
// CryptoIdea.jsx main wrapper
<div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 clamp(16px,4vw,32px)", paddingBottom: 78 }}>
```

**The non-negotiable pairing — widen + grid + cap.** Widening the container *without* gridding a
screen makes stacked rows/prose look stretched. So every screen gets ONE of:

- **Card collections** → wrapped in `.grid-auto` (reflow into columns).
- **Forms / prose / a single detail body** (AddEntry, Login, Detail) → capped at a **readable ~600px**,
  centered, so they don't stretch awkwardly inside 1040.

Result: **near-zero new `@media` queries, no JS, no new dependencies.**

---

## 4. Phased plan (each phase independently shippable + committed)

**Phase 0 — Shell foundation** *(S, ~½ day, low risk)*
- `CryptoIdea.jsx` ~472: `maxWidth:430` → `maxWidth:1040`; add `padding:"0 clamp(16px,4vw,32px)"`.
- Bottom bar ([`app.css`](../../src/styles/app.css) ~62): **keep** — it already centers as a floating pill.
- Add the `.grid-auto` utility to `app.css`.
- *After Phase 0, un-gridded screens look stretched — expected; fixed in 1–3.*

**Phase 1 — Easy, high-value grids** *(S each, ~1 day, low risk)*
- **Account** (4 cards), **Learn** (modules + badges), **Journal** (thesis entries), **Search**
  (results) → wrap their card/list stacks in `.grid-auto`.

**Phase 2 — Research module** *(S–M, low risk; own scoped CSS)*
- `OverviewView` cards → 2-col; `CoinsView` coin cards → grid. Done in `research-tab.css`
  (already `.research-root`-scoped — zero collision risk).

**Phase 3 — Coin drill-in + Portfolio** *(M — the nuanced part)*
- **CoinInfo/Detail:** market-data + position cards → grid; **cap form/detail body ~600px**.
- **AddEntry / Login / ForgotPass / Contact:** cap ~600px centered (forms must not stretch).
  *(Login: preserve the inline `#FF3B30` error color — a unit test asserts it.)*
- **Portfolio:** resolve the **rows vs tiles** decision (§2). Tiles → `.grid-auto` of coin cards;
  rows → keep full-width rows + swipe (lower risk).

**Phase 4 — Polish + verify** *(S)*
- Modals/overlays (upgrade, downgrade, lesson, buy-journal, toast) stay **comfortable centered
  modals (~430–560)** — modals shouldn't stretch to 1040.
- Full cross-width verification (§6).

**Total: ~2.5–3 days solo, low-to-moderate risk.** No new dependencies, no nav rewrite.

---

## 5. Per-screen treatment (from the audit)

| Screen | Treatment | Effort |
|---|---|---|
| Shell + bottom nav + overlays | container 1040 + `.grid-auto` util; bar kept as pill | S |
| Account | 4 cards → `.grid-auto` | S |
| Learn | modules + badges → grid | S |
| Journal | thesis entries → grid | S |
| Search | results → grid | S |
| Research (Overview/Coins) | overview 2-col + coins grid (scoped CSS) | S–M |
| CoinInfo / Detail | card grids + body cap ~600 | M |
| AddEntry / Login / Forgot / Contact | cap forms ~600 centered | S |
| Portfolio | rows **or** tile grid (open decision) | M |

---

## 6. Testing & verification (Definition of Done)

- Existing unit tests are **content-based** (text + handlers, not layout/inline styles) — the audit
  confirmed this for every screen — so CSS/wrapper changes won't break them. **One exception:** Login's
  `#FF3B30` inline error color (a test locks it) — preserve it.
- Per phase: `npm run build` + `npm run test:unit` green.
- **Browser check at 1040px AND 375px** using the computed-style + screenshot method (read computed
  `grid-template-columns` / `align-items` / element rects — don't trust a screenshot alone).
- Commit per phase with a clear message.

---

## 7. Pitfalls that bite (learned on this codebase)

- **Widen without gridding = stretched content.** Always pair §3.
- **Descendant vs compound selector.** Classes that all sit on the *same* element need a **compound**
  selector (`.ci-app.foo`), not a descendant one (`.ci-app .foo`) — the latter silently matches
  nothing. (This was the root cause of the 2026-06-24 login-centering bug.)
- **jsdom reads inline styles only.** A test asserting an exact color requires that color to stay an
  inline style, not a class (see Login `#FF3B30`).
- **Modals shouldn't stretch.** Keep overlays at a comfortable centered width; don't widen to 1040.
- **Grid overflow:** `1fr` has `min-width:auto`; use `minmax(0,1fr)` if children overflow.
- **`.ci-app` vs `.research-root`** are sibling scopes that reuse generic class names — keep new
  rules inside the right scope so they don't collide.

---

## 8. Mockups (produced 2026-06-24, this session)

Two faithful design mockups were created (deep-green accent, Fraunces + Hanken, 1040 container):

- **Desktop Portfolio** — summary band (big total left, stats right) + holdings as a 3-column
  auto-fit **tile** grid + bottom-bar pill.
- **Mobile Portfolio** — the *same* tile grid collapsed to 1 column in a phone frame + full-width
  bottom bar; summary stacks vertically.

They illustrate the **tiles** option and confirm the grid reflows with no separate mobile code.
(Mockups are design previews, not generated from live data.)

---

## 9. Why this is the right call (KISS + security)

- **Fewest moving parts:** one layout, one grid utility, ~0 breakpoints, **no new dependency.**
- **Low attack surface / low regression risk:** mostly CSS + thin JSX wrappers; logic/handlers and
  the data layer are untouched; deny-by-default rules and the proxy model are unaffected.
- **Reversible & incremental:** phased, each commit shippable, each verified before "done".
