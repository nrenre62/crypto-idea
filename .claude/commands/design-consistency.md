---
description: Review a UI/CSS change against THIS repo's design-system rules (scoping, dark-mode safety, responsive standard, admin-bundle isolation, no-names guard)
argument-hint: "[optional target — a component, a stylesheet, or a screen; defaults to the working diff]"
---

Run a design-consistency review of: ${ARGUMENTS:-the current working change}

Spawn the **`design-consistency`** subagent (Agent tool, `subagent_type:
"design-consistency"`) and pass the target above. It is **read-only** and reviews
the UI/CSS diff against Crypto Idea's specific design rules, returning ranked
findings (`file:line` · why · fix).

## What it checks (repo-specific, nuance-aware)

- **CSS scoping** — generic names (`.card`/`.note`/`.grid-auto`) must sit under
  `.ci-app` (user) / `.research-root` (Research) / `.ci-app.adm-root` (admin); the
  `.adm-note`/`.grid-auto` collision trap.
- **Admin ↔ user bundle isolation** — `.adm-*` and `admin-settings.css` never
  enter the user bundle; no admin component imported by `main.jsx`.
- **Dark-mode safety** — token-based colors + **dark-block-only**
  `html[data-theme="dark"]` overrides so light is byte-for-byte unchanged; no raw
  hex where a token exists. (Admin is **light-paper only** — not flagged for
  "missing dark mode".)
- **Responsive standard (nuanced)** — layout reflow via `.app-shell` + `.grid-auto`,
  NOT a NEW layout `@media` or `useIsDesktop` branch — while
  `prefers-reduced-motion` / the modal phone-sheet / `prefers-color-scheme`
  `@media` and the desktop-popup `useIsDesktop` are **sanctioned** and not flagged.
- **Compound-selector gotcha** — `.ci-app.app-shell` / `.ci-app.cm-scrim` need a
  compound, not descendant, selector.
- **Shared primitives** — reuse `<Modal>`/`<Logo>`/`<CoinIcon>`/`SettingsScreen`/
  `Ic.*` instead of re-rolling.
- **No-names dist guard (#24)** — Buffett/Munger/Marks/Graham must never reach
  shipped copy (the build fails on a match).
- **Design-only discipline** — a "design" diff that changes handlers/state/routing
  is called out.

## What to do with the result

- **Relay the ranked findings and the verdict** (CONSISTENT / CHANGES NEEDED /
  INCONCLUSIVE). Fix follows the normal process — report first, don't edit from
  this command unless asked.
- **Verify after a CSS/dist-copy change with `npm run build`** (the no-names guard
  + SW stamp run there). If the agent couldn't read a changed style file, it's
  INCONCLUSIVE — name the file, don't imply "consistent".

## If the subagent isn't registered yet

A freshly added `.claude/agents/*.md` registers on the **next** session. Until
then, run the review inline per the checklist in
`.claude/agents/design-consistency.md`. Never fix — report.
