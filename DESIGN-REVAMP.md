# Crypto Idea — Design Revamp Plan (match the canonical mockup)

**Status: BUILT (2026-06-26).** Phases D-1…D-8 shipped — the whole app (desktop **and** mobile) now
matches the approved Portfolio mockup and all founder-review items in §7. Commits: D-1 `455f17c` ·
D-2 `335a1b9` · D-3 `cba5b2b` · D-4 `c4b36f0` · D-5 `72bc52c`/`4b4b1d1` · D-6 `7842975` ·
D-7 `8cc0223` · D-8 `bd034b5`. Each was TDD-guarded, browser-verified (light + dark), and committed;
248/248 unit green. This doc remains the spec/record.

> **Source of truth:** the two mockup screens (desktop + mobile **Portfolio**). The rounded
> browser-window frame (desktop) and phone frame (mobile) in the mockups are *presentation only* —
> the app itself is the cream content inside; we do **not** build those frames.

> **Visual targets (signed-off, build the code to match these):** mockups now exist for **every**
> screen — mobile (2026-06-25) and **desktop (2026-06-26)**. The desktop set is a durable, self-contained
> gallery with a light/dark toggle: [`docs/mockups/desktop/index.html`](docs/mockups/desktop/index.html)
> (Portfolio on the 1040 wide track with the 3-up asset grid; Research/Journal/Learn 2-up; drill-ins/forms
> on 560/720). Implement phases D-1…D-6 to reproduce them.

**Guardrails (unchanged):** preserve all logic / handlers / data; keep **dark mode** working (U8
light/dark/system) by styling through the existing CSS vars; **KISS + no new dependency** (no chart
lib, no CSS framework); tests stay green; verify desktop **and** mobile before "done." This plan
**supersedes** the responsive-era decision to keep Portfolio as rows — turning an asset *row* into an
asset *card* is an intentional redesign the founder asked for (see [`RESPONSIVE-DESIGN.md`](RESPONSIVE-DESIGN.md)).

---

## 0. The design language (extracted from the mockup)

The app already ships this language ([`src/styles/app.css`](src/styles/app.css), scoped `.ci-app`);
the revamp mostly *applies it more fully*. Canonical anatomy:

- **Surfaces:** cream paper `--paper #f8f7f3`; white rounded cards `--paper-2 #fff`, radius `--radius
  22px`, soft `--sh-sm` shadow.
- **Type:** display = **Fraunces** (`--display`) for the wordmark + all big dollar values; body =
  **Hanken Grotesk** (`--body`). Eyebrow labels = uppercase, `.1em` letter-spacing, `--ink-faint`.
- **Accent:** deep green `--accent #0a6b4d` (active nav, active portfolio pill, gains).
- **Up/down:** gains green, losses `--warn #cf3a2c-ish`, shown as **tinted % pills** (green/red bg),
  not plain colored text.
- **Token circles:** brand-colored circle with the symbol (BTC orange, ETH indigo, SOL teal, LNK
  blue, ADA blue, RND red) — the `CI` component ([`src/components/ui.jsx`](src/components/ui.jsx)).
- **Badges:** `BETA` (blue), `● LIVE` (green), `STARTER`/plan (amber) — `.beta`/`.badge-live`/`.badge-plan`.
- **Bottom nav:** floating rounded **pill**, centered, 5 tabs (Portfolio·Research·Journal·Learn·Search),
  active = green.

---

## 1. Already matches the mockup — DO NOT rework

- **Design tokens / fonts / cards / badges / shadows / radii** — `app.css:12–95`.
- **App header** — `.apphead` + `.title` + `.beta`/`.badge-live`/`.badge-plan` + `.avatar`
  ([`Portfolio.jsx:26–35`](src/components/Portfolio.jsx)). Matches (title, BETA, ● LIVE, STARTER, avatar).
- **Card grids already built:** Research/Coins `.coins-grid`, Journal `.j-grid`, Learn `.module-grid`
  (auto-fit `minmax(280px,1fr)`) — these already reflow 1→2→3 columns and match the language.
- **Footer disclaimer** — `.disclaimer` "Prices via CoinGecko · Updated live · Not financial advice".
- **The width tracks + `.grid-auto` utility** already exist (`app.css:58–61`) — we just need to *use*
  the wide track for Portfolio.

---

## 2. The deltas (current → target)

### Δ A — Portfolio Value → a white summary CARD with a 3-stat cluster
**Current** ([`Portfolio.jsx:37–52`](src/components/Portfolio.jsx)): `.port-total-label` ("Portfolio")
+ `.port-total` (value) + `.port-meta` with **two** stats (Invested, Return-as-pill), rendered
directly on the paper (no card).
**Target (mockup):** a white rounded **card** containing:
- eyebrow `PORTFOLIO VALUE`;
- big Fraunces value with faint cents (`.port-total .cents` already exists);
- a **gain line under the value**: `▲ +$18,313.22 (+20.5%)` in green;
- a **3-stat cluster: INVESTED · 24H · ASSETS** — laid out **horizontally on the right** at desktop,
  and as a **divided 3-column row** on mobile.
**Work:** wrap in `.card` (or a new `.value-card`); add the **24H** stat (portfolio-weighted 24h %)
and the **ASSETS** count (`portfolio.length`); move the gain to its own line; add the desktop-right /
mobile-row responsive split (a flexbox that wraps — no `@media` needed if done with flex-wrap +
`.app-shell` width). Files: `Portfolio.jsx`, `app.css` (`.value-card`, restyle `.port-*`).
**Note:** confirm a portfolio-level **24h %** exists; if not, derive it weighted from each holding's
24h change × its value share (pure helper in `utils/`).

### Δ B — Assets: ROWS → CARD GRID (the headline change)
**Current** ([`Portfolio.jsx:82–123`](src/components/Portfolio.jsx)): `.coin-swipe` + `.coin-row` —
a swipe-to-reveal **row** (left=Edit blue, right=Delete red), tap row → CoinInfo, tap values → Detail.
**Target (mockup):** an **asset CARD grid** — **3-up @1040 · 2-up @720 · 1-up mobile** (auto-fit
`minmax(280px,1fr)`). Card anatomy:
- top row: **token circle** (`CI`) + **name** (bold) + `0.62 held` (faint) beneath the name;
- big Fraunces **value** (`$38,583.22`);
- bottom row: **price** (`$62,231`, faint) left + **tinted 24h % pill** (green/red bg) right.
**Work:**
1. Put Portfolio on the **wide (1040)** track: add `"portfolio"` to `WIDE_SCREENS`
   ([`CryptoIdea.jsx:587`](src/CryptoIdea.jsx)) — this yields exactly 3-up at 1040 (verified reflow:
   1@375 → 2@720 → 3@1040).
2. Replace the row markup with `.grid-auto`/`.assets-grid` of `.asset-card`s; reuse the tinted-pill
   style (`.port-return`/`.chg-pill`) for the 24h % (today `.coin-chg` is plain colored text).
3. **Interaction migration (DECISION — see §4):** card grids don't swipe and swipe is meaningless on
   desktop. Recommended: **whole card taps → CoinInfo**; **Edit/Delete live on the Detail screen**
   (already there), reachable from CoinInfo; optionally a small `⋯` menu on each card for quick
   Edit/Delete. The swipe row UX is retired.
Files: `Portfolio.jsx`, `app.css` (`.asset-card` + grid), `CryptoIdea.jsx` (`WIDE_SCREENS`).

### Δ C — Bottom nav → floating pill
**Current** (`.ci-app.tabbar`, `app.css:90`): a flat fixed bar, `max-width:430`, `border-top`, blur.
**Target (mockup):** a **floating rounded pill** — all-corner radius, soft shadow, centered, sitting
above the bottom edge (a gap below it), `max-width ~480` on desktop / near-full-width with side
margins on mobile. Keep the 5 tabs, icons, and active-green. Work: restyle `.tabbar` (radius, margin,
shadow, remove the flush border-top look). File: `app.css` only.

### Δ D — Token-circle consistency
Ensure `CI` ([`ui.jsx`](src/components/ui.jsx)) renders brand-colored circles with symbol initials
matching the mockup palette (BTC orange, ETH indigo, SOL teal, LNK blue, ADA blue, RND red) and a
deterministic fallback color for long-tail coins. Audit/extend the color map. File: `ui.jsx` (+ maybe
`app.css`).

### Δ E — Consistency pass on the remaining screens (apply the language, don't over-grid)
Principle (from the `responsive-app` skill): **grid only homogeneous card lists**; restyle — don't
re-grid — rows and forms.
- **Search** ([`Search.jsx:37`](src/components/Search.jsx)): `.trend-item` rows → restyle to the
  token-circle + name/symbol + price + tinted-▵ + green Add-pill language. Keep it a **list** (search
  results are a list, not a card grid).
- **Detail / CoinInfo** ([`Detail.jsx`](src/components/Detail.jsx) / [`CoinInfo.jsx`](src/components/CoinInfo.jsx)):
  keep section `.card`s + `.price-hero`/`.chg-pill`/`kv-row`; confirm they match; tx list stays rows,
  restyled. Stay on the **narrow (560)** track.
- **AddEntry** ([`AddEntry.jsx`](src/components/AddEntry.jsx)): form — keep; ensure `field-input`/`seg`/
  `submit-buy` match the language. Narrow track.
- **Account** ([`Account.jsx`](src/components/Account.jsx)): card-per-section stack — already close
  (tier badge, usage bars, toggles). Light polish for parity. **Coordinate with the parallel session's
  recent U7/U11 changes here.**
- **Login** ([`Login.jsx`](src/components/Login.jsx)): auth form + `.plan-card`/`.cycle-card` — ensure
  parity. **Keep Login's inline `#FF3B30` error color** (a unit test asserts it).
- **Research/Overview + Ask**: already on `.research-root` paper; Overview rows + Ask chat are correct
  as-is — just confirm token/pill parity.

### Δ F — Dark mode
Every new/edited rule must use the CSS vars (`--paper-2`, `--ink`, `--accent`, `--warn`, the tinted
`--*-s` backgrounds), never hardcoded light hex, so the U8 light/dark/system theme keeps working.
Verify each redesigned surface in dark.

---

## 3. Implementation phases (one shippable, TDD-guarded increment each)

| Phase | Scope | Primary files |
|---|---|---|
| **D-1** | Portfolio **value card** (white card, gain line, INVESTED/24H/ASSETS cluster; desktop-right / mobile-row) **+ remove the "Prices updating live" line** (both widths) | `Portfolio.jsx`, `app.css`, a 24h-weighted helper in `utils/` |
| **D-2** | Portfolio **assets → card grid** + **wide (1040) track** + tinted % pills + interaction migration (§4.1) **+ drop the "held" word → show just the amount** | `Portfolio.jsx`, `CryptoIdea.jsx`, `app.css` |
| **D-3** | Bottom-nav **floating pill** → **solid-white** on desktop (per the founder screenshot) | `app.css` |
| **D-4** | **Token-circle** color/consistency pass | `ui.jsx`, `app.css` |
| **D-5** | **Consistency pass** (new design, **keep settings/words/functions**): Search list (drop "held"), Detail/CoinInfo/AddEntry (**keep date+time**)/Account (**port every function**)/Login | per screen |
| **D-6** | **Dark-mode** verification across every redesigned screen | (verification only) |
| **D-7** | **Journal** new design: short labels (Intact/Review/Challenged), corrected privacy note, **"Needs a thesis" section + Add-thesis-later** entry (reuses the Buy-Journal prompt → `updateCoinJournal`) | `Journal.jsx`, `app.css`, Search prompt component |
| **D-8** | **Research/Coins desktop-only richer card** (cost·now·P&L·30d + full 4-axis conviction + catalysts + bigger sparkline; mobile stays compact) **+ verify Portfolio→Research auto-sync & view-only** | `features/research/components/*` |

**Per-phase DoD:** KISS + no new dep; `npm run test:unit` green (watch the **Login `#FF3B30`** inline-color
test, the **walkthrough/smoke** tests, and **Portfolio/Account** tests — assertions that key on the old
`.coin-row` row markup will need updating); **build clean** (dist-name guard); verify **desktop (1040,
3-up) AND mobile (1-up)** in-browser via computed-style/DOM probes (screenshots are unreliable in the
nested preview — see the preview-verification memory); commit with a clear message.

---

## 4. Decisions to confirm before building

1. **Asset card interaction (replaces swipe edit/delete). — DECIDED 2026-06-26 (founder):** whole
   asset card **taps → CoinInfo**; **Edit/Delete live on the Detail screen** (reachable from CoinInfo,
   already there). **The swipe-to-edit/delete row UX is retired** (no `⋯` menu, no mobile-only swipe —
   one interaction model on every width). Build D-2 to this.
2. **Portfolio-level 24h %** — confirm it exists; if not, compute it weighted (cheap pure helper).
3. **"+ New" portfolio pill** currently routes to Account; mockup shows it inline in the switcher —
   keep routing to Account, or add an inline create? (KISS: keep current behavior.)

---

## 5. Out of scope (consistent with prior interviews)

No new design system / CSS framework / chart library; no new palette beyond the existing tokens; **no
logic/data/security changes** (presentation only); the **calculator** scope is unchanged (see
[`CALCULATOR.md`](CALCULATOR.md)); no new dependencies.

---

## 6. Follow-ups when this ships

- Update [`RESPONSIVE-DESIGN.md`](RESPONSIVE-DESIGN.md) — the "Portfolio rows kept" note is superseded
  (Portfolio now uses the wide track + an asset card grid); record the floating-nav change.
- Update the `responsive-app` skill note: a row→card change is a *redesign* (fine when asked), distinct
  from "don't grid rows" (still the default for non-homogeneous content).
- Update [`CLAUDE.md`](CLAUDE.md) design pointer + this file's status PLANNED → BUILT.
- **Coordinate with the parallel U-track session** before touching `Account.jsx` / theme / `CryptoIdea.jsx`
  (it recently shipped U7/U8/U11 there).

## 7. Founder design review — 2026-06-26 (LOCKED)

Reviewed the full desktop + mobile mockup gallery ([`docs/mockups/desktop/index.html`](docs/mockups/desktop/index.html)).
Decisions below are locked and **override anything above them**. **Guardrail reaffirmed:** every design
change keeps existing **settings, words (where noted), and backend behavior** intact — presentation-only
unless a new entry point is explicitly listed here. *"Add every setting in all tabs"* = carry **all**
existing functionality into each redesigned screen; **drop nothing**.

### Locked wording
- **Holdings line:** drop the word — show just the amount, e.g. **`0.52 BTC`** (was "… held"). Applies on
  **Portfolio** asset cards, **Research** coin cards, **Search** rows.
- **Journal status pills:** short labels **Intact / Review / Challenged** (🟢/🟡/🔴).
- **Journal note** (replaces the false "private to your account"):
  **"Only you can see your journal. Your thesis helps the AI give you better Research & Ask answers."**
  (The thesis **is** shared with the AI for Research/Ask — copy must be honest about it.)
- **Remove the "Prices updating live" line** on **both** mobile & desktop — the ● LIVE badge already says it.

### Mobile — per screen
- **Portfolio** — good. Apply held-word drop + remove live line.
- **Research/Coins** — good. Auto-mirrors Portfolio holdings; **view-only (no delete here)**; tab order
  **Overview · Coins · Ask**. (Verify the Portfolio→Research sync; no backend change.)
- **Journal** — adopt the new simpler design + words. Add a **"Needs a thesis"** section listing portfolio
  coins with no `journal.thesis`, each with an **Add thesis** button → opens the existing Buy-Journal prompt
  for that coin (writes via `updateCoinJournal`; **no new collection/schema**). New labels + corrected note.
- **Learn** — keep as-is (approved).
- **CoinInfo** — keep words + settings; **restyle only** (new design/colors).
- **Detail (holding/transactions)** — keep all words + settings; **restyle only**.
- **Add transaction** — new design; **keep date AND time** (datetime-local, not date-only).
- **Account** — new design; **keep every function** — port them all in, delete nothing.
- **Login** — new design.

### Desktop — per screen
- **Portfolio** — new design as-is; remove the live line.
- **Bottom nav / tabs** — make it a **solid-white floating pill** (per the screenshot): cleaner/more
  prominent than the mobile translucent pill. Bottom nav only; Research's in-page segmented control unchanged.
- **Research/Coins** — desktop-only **richer card**: **avg cost · current price · P&L · 30d change**, the
  **full 4-axis conviction breakdown + reason chips**, **catalysts**, and a **bigger 7-day sparkline**, all
  visible without expanding. **Mobile keeps the compact card** (intentional mobile↔desktop content divergence).
- **Research/Overview, Journal, Learn, Search, Detail, CoinInfo, Account, Login, Payment, New transaction**
  — approved; build the new design. Detail/CoinInfo stay settings+words-identical (design-only).
- **Journal (desktop)** — new design good; same short labels + corrected note as mobile.

### Backend / consistency
- **No backend setting changes.** Only new wiring: the **Add-thesis-later** entry (reuses `updateCoinJournal`)
  and the **"Needs a thesis"** list (derived from portfolio coins lacking `journal.thesis`).
- **Research Coins** stays a read-only mirror of the active portfolio (add in Portfolio → shows in Research;
  no delete in Research). Verify end-to-end (D-8).
- Journal thesis is **shared with the AI** (Research/Ask) by design — reflect in copy, not just the note line.

---

See also: [`RESPONSIVE-DESIGN.md`](RESPONSIVE-DESIGN.md) (the width tracks this builds on),
[`CALCULATOR.md`](CALCULATOR.md), [`CLAUDE.md`](CLAUDE.md). Method: the `responsive-app` +
`landing-page-design` skills.
