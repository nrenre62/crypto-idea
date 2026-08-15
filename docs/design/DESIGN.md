# Design

The design system for CryptoIdea and the map to the design docs. One editorial "paper" look, one
responsive layout, scoped so the three apps never collide. Start here, then open a spoke for detail.

## Editorial paper design

- **Type + color.** Fraunces (display) + Hanken Grotesk (text) on a warm paper background with a
  deep-green accent. The full token set lives in `src/styles/app.css`.
- **One responsive layout.** The user app is a single layout — a centered `.app-shell` that widens on
  desktop, and homogeneous card lists that reflow with `.grid-auto`. Same markup from phone to
  desktop; no layout `@media`, no per-device component branches. See
  [RESPONSIVE-DESIGN.md](RESPONSIVE-DESIGN.md).
- **Scoping keeps the three apps apart.** The user app's system is scoped under a `.ci-app` wrapper;
  the Research tab under `.research-root`; the admin app under its own `.adm-*` classes. Generic class
  names (`.card`, `.note`, `.grid-auto`) are always scoped to one of these so they can't leak. Same-
  element compound classes need a compound selector (`.ci-app.app-shell`), not a descendant one.
- **Admin CSS never ships in the user bundle.** The `.adm-*` styles and `admin-settings.css` load only
  in the admin app. Never import them from the user app.
- **Dark mode is a token flip.** Colors come from CSS tokens; dark mode redefines the tokens in a
  `html[data-theme="dark"]` block, so light mode stays byte-for-byte unchanged. Never hard-code a hex
  where a token exists.
- **Shared primitives.** Reuse the shared building blocks — `<Modal>`, `<Logo>`, `<CoinIcon>`, the
  `SettingsScreen` primitive, and the `Ic.*` icon set — instead of re-implementing them.
- **Brand.** One brand: **CryptoIdea** — a CSS-drawn green tile + one-word wordmark, rendered by the
  shared `<Logo>` primitive from the app's own tokens (no image, no admin classes).

## When to open what

- [RESPONSIVE-DESIGN.md](RESPONSIVE-DESIGN.md) — how one layout serves phone and desktop with no
  media queries; open before changing how a screen reflows.

## See also

- [docs/INDEX.md](../INDEX.md) — the documentation map.
- [ARCHITECTURE.md](../decisions/ARCHITECTURE.md) — where the design system sits in the layered app
  (the `.ci-app` / `.research-root` / `.adm-*` scoping rule).
- [CONTRIBUTING.md](../../CONTRIBUTING.md) — the invariants a UI change must keep.
