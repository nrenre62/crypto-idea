# Design Pass 2 — founder mockup alignment (2026-06-27)

> Canonical record of the **four design changes** decided with the founder on 2026-06-27, consolidated
> into one build. All are **design-only** (no business logic changes) **except** the new cached
> `/api/trending` endpoint (Search). Same design **mobile + desktop** throughout (the app's one
> responsive shell — no separate desktop layout, per [`RESPONSIVE-DESIGN.md`](RESPONSIVE-DESIGN.md)).
> Build order + checkboxes live in [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP. Where a mockup and an older
> doc disagree, the **newest founder mockup wins**. Holds in dark mode (the D-6 standard).

Guardrails (carried from §D): keep all wording, settings, and functions unless a decision says
otherwise; reuse existing `.ci-app` classes + tokens; KISS, no new dependencies; tests green; verify
mobile + desktop, light + dark, before commit.

---

## 1. Account → drill-in settings list
Replace the one-long-scroll Account with the mockup's clean **settings list**; rich content moves into
**drill-in detail views** via a tiny internal `view` state in `Account.jsx` (no router/context changes).
**Every handler is preserved — only relocated.**

**Home (matches the mockup):** solid-token avatar + name + email + STARTER/PRO/PREMIUM badge → a
**PLAN USAGE** white card with **Coins** (green) + **Portfolios** (gold) bars → rows: 👤 Profile,
💳 Plan & billing, 🗂 Portfolios, 🔒 Security (chevron), 🔔 **Email digest** (toggle, inline),
🎨 **Appearance** (Light/Dark/System segmented, inline), 🛡 Privacy & data (chevron) → **Logout** at bottom.

**Detail views:** Profile (name + change-email), Plan & billing (tx/AI/joined usage + subscription
states + upgrade/downgrade/payment), Portfolios (the manager), Security (password + sign-out-everywhere),
Privacy & data (analytics consent **+ the "Product updates & offers" toggle moved here** + CSV/JSON
downloads + delete-account flow + legal links).

Decisions: drill-in list (exact match) · add rows for Profile/Plan & billing/Portfolios + Logout at
bottom · same design centered on the app shell for desktop.

## 2. Learn → match the mockup
**Reconciliation note:** two Learn mockups exist; the **newest (2026-06-27)** is canonical — a
white-card hero with streak/lessons **chips** (supersedes the earlier "two header icon-buttons" idea).

- **Hero → white card:** `LEVEL n · <title>`, `<xp> XP` + `<n> to L<next>`, green progress bar, and two
  chips inside — `🔥 N-day streak` and `N lessons`. (Restyles the current `.learn-hero`.)
- **Module icons (the main gap):** modules render an **empty soft-green circle** today (`m.icon` is
  undefined). Add a per-module SVG icon map by id: markets→line-chart, fundamentals→magnifier,
  tokenomics→dollar, demand→bar-chart, yield→percent/sprout, risk→shield, psychology→brain,
  security→lock, thesis→target. Locked → SVG lock.
- **Module footer → one row** under the bar: `X/Y lessons` (left) · `NN%` or `Start →` (right). Whole
  card tappable; drop the separate CTA button (keep "Review →"/"Complete" affordance).
- **Footer line:** `9 modules · 50 lessons. … for educational purposes only — not financial advice.`
- **Dark-mode:** tokenize the today-card + active-module gradients (currently hardcoded light hex).
- **Keep** the existing **sequential module unlock** (mockup shows all unlocked = illustrative only).

## 3. Portfolio → switcher pills
- **Move `<PortfolioBar/>` above the value card** (between `.apphead` and `.value-card`).
- **Restyle to the design system:** `.port-pill` (active = soft-green bg/text/border; inactive = paper +
  border) + `.port-pill-add` (bordered `+`), replacing the hardcoded inline colors (which break in dark
  mode). Visibility logic unchanged (show when >1 portfolio or Pro; `+` when under the cap).

## 4. Persistent Account avatar on every tab
- **One shared avatar** rendered by the app-shell in `CryptoIdea.jsx`, pinned **top-right**, on the five
  tab screens (Portfolio/Research/Journal/Learn/Search) → taps to `setScreen("account")`. **Remove
  Portfolio's duplicate.** Not shown on drill-in screens (Detail/AddEntry/CoinInfo/Account — they have a
  back-header). Shell-level avoids editing the separately-scoped Research module and keeps it DRY.

## 5. Search → real TRENDING section
- When the search box is empty, show a **TRENDING** list (reuses the existing `trend-item` row + `+ Add`
  pill) instead of the empty state.
- **Data: a new cached `/api/trending`** in `functions/index.js` proxying CoinGecko `/search/trending`,
  stored in a shared `cache/trending` doc + CDN-cached (~15 min) → flat-cost (~0 calls per visitor).
  `src/api/coingecko.js` `fetchTrending()` + a `useTrending()` hook (load once, hide if unavailable).
  Add still opens the existing Buy-Journal prompt.

## 6. Add transaction → coin-name header
- Add a coin-head row (`CI` token circle + `Bitcoin · BTC`) **above the Buy/Sell** segmented in
  `AddEntry.jsx`, reusing the `bj-coin-head` style. Title → "Add transaction". **Keep** the dynamic
  button label (`Add Buy` / `Add Sell`). Same on mobile + desktop (already on the 560 track).

---

## 7. Login → match the mockup
Already on the paper design (serif "Crypto Idea", tagline, Log in/Register segmented, **black**
`btn-primary`, Forgot password). Gaps: add a **password show/hide eye toggle** (the 👁 in the mockup;
toggles input `type`); wording "Login" → **"Log in"** (tab + button); email placeholder → `you@email.com`.
**Preserve the inline `#FF3B30` auth-error** (Login.test asserts it).

## 8. Coin info → match the mockup (same mobile + desktop)
Reconcile to the emphasized mobile mockup: **MARKET DATA** = Rank · Market cap · 24h volume ·
Circulating supply; **YOUR POSITION** (held) = Held · Avg cost · Unrealised P&L (reuse `coinPnl`);
chg pill → "+X% today"; keep the header **Transactions** pill + the existing Price-history card.
**Data caveat:** confirm `prices[id]` carries 24h volume + circulating supply; if not, add
`include_24hr_vol` to the cached `/api/prices` fetch + circulating from coin metadata, else show `—`
(never NaN).

## 9. Transactions (Detail) → match the mockup (same mobile + desktop)
The summary card (Holding/Current value/Bought/Avg buy price + green **TOTAL P/L** box, already a tinted
`pnl-row`) matches. Change: **wrap the tx list in a white card** + **two-column rows** (left: BUY/SELL
badge + amount, date·time; right: price + Cost/Recv stacked, right-aligned). Keep price-hero + header.

## Shared work (do once, used across screens)
- **Icon set:** add `lock, bell, palette, shield, chevron, user, card, folder` (Account) + the 9
  Learn module icons + a check/target. Inline SVGs in `ui.jsx` (or a co-located `learn-icons` map),
  token-stroked so dark mode flips.
- **CSS:** a pill `.switch` (for `role="switch"` toggles — today they're square checkboxes), `.set-row`
  set, `.port-pill*`, `.tx-coin-head`, Learn hero-card + module-footer + module-icon sizing, the
  `.app-avatar`, trending section label, and the dark-mode tokenizations above. All under `.ci-app`,
  token-based.

## Build order (one coherent batch — see NEXT-STEPS §DP)
1. **DP-1 Foundations** — icons + shared CSS (enables the rest).
2. **DP-2 Quick wins** — Portfolio switcher (move + restyle) + Add-transaction coin head.
3. **DP-3 Persistent avatar** — shell-level, remove Portfolio's dup.
4. **DP-4 Learn** — hero card, module icons, footer row, dark fixes. — ✅ BUILT 2026-06-27. Per-module SVG icons in `src/components/learn-icons.jsx` (currentColor, lock for locked); hero white card + streak/lessons chips; one-row footer; tokenized today-lesson/module.active/m-icon.done for dark.
5. **DP-5 Account** — drill-in list + detail views (the biggest). — ✅ BUILT 2026-06-27. Local `view` sub-state (no router change); home = identity + plan-usage summary + settings-list (NavRows + Email-digest `.switch` + Appearance `.theme-seg`); detail views relocate each card verbatim; marketing toggle → Privacy & data. New: 8 `Ic` row icons + `.switch` + `.settings-row*` (all token-based).
6. **DP-6 Search trending** — `/api/trending` + hook + UI.
7. **DP-8 Login** — password eye toggle + "Log in" wording.
8. **DP-9 Coin info** — Market data (Rank/Market cap/24h vol/Circulating) + Your position (Held/Avg cost/Unrealised P&L). — ✅ BUILT 2026-06-27. Label shipped as "Unrealised P/L" (matches Detail's "Total P/L", excludes realised sells); also enriched `/api/prices` with `usd_24h_vol`+`circulating` (DP-9b) so vol/circulating are real, em-dash fallback for the long tail.
9. **DP-10 Transactions** — tx list in a card + two-column rows.
10. **DP-7 Polish** — full dark-mode + mobile/desktop verify, docs, final commit.

**DoD per phase:** TDD-light (adjust/extend the screen's tests first) · `npm run test:unit` green ·
`npm run build` clean · browser-verify mobile (~390) + desktop (~1040), light + dark · commit · docs.

---

## Round 2 — founder follow-up changes (2026-06-27, IN PROGRESS — more coming)

> A second batch of founder design tweaks captured from screenshots, to build **before DP-6**. Same
> guardrails: design-only (no logic/handler changes) unless noted; reuse `.ci-app` tokens; dark-safe;
> verify mobile + desktop. **Founder is still adding items — do not start building until they say go.**
> Items below numbered R2-n; they'll be slotted into NEXT-STEPS §DP build order once the list is final.

- **R2-1 — Account avatar consistency (Learn + ALL tabs).** The persistent account avatar
  (`.app-avatar`, the black "A" circle, top-right) must be placed/styled **consistently and integrate
  cleanly with each tab's design**. On Learn it currently overlaps the new white hero card's top-right
  corner. Make the placement uniform across all five tab screens so it reads as intentional on every page.
  **⚠ CONFIRM exact placement with founder** (e.g. aligned inside the card/header's top-right vs. a
  consistent header band above content) — screenshots show it overlapping the Learn hero card. (img 1/2)
- **R2-2 — Learn: remove the badge "graph icon".** Remove the `.badges-row` from `Learn.jsx` (the earned-
  badge chip that renders the module 📈 emoji in a white square below the hero) — founder says it's not
  needed. Trivial + unambiguous (can be done immediately on request). (img 1/2)
- **R2-3 — Research › Portfolio Pulse: new design.** Per screenshot: **keep** the `24H / 7D / 30D`
  period toggle exactly where it is (left side — DO NOT move it) and **keep** the amber "AI is offline …"
  note. New: add **"Share"** + **"Regenerate"** outlined pill buttons top-right of the card; a **headline**
  = selected period label + its change as a tinted pill (e.g. `30D  +12.4%`, green up / red down); the
  data-driven summary paragraph below. Design-only — keep the offline-fallback logic + `usePulse` wiring.
  Lives in the Research feature module (`src/features/research/`, scoped under `.research-root`). (img 3)
- **R2-4 — Research › Portfolio Risk: new design.** Per screenshot: a **segmented gradient risk meter**
  (~20 cells, green→amber→red, filled up to the computed risk level, rest grey) with **Low / Moderate /
  High** labels beneath; a **status badge** top-right (e.g. amber "Elevated"); the holdings-concentration
  explanation text; a **lock-icon footer** "Calculated from your holdings — updates automatically and
  isn't adjustable." Keep the existing risk computation. Research module, `.research-root` scoped. (img 4)
- **R2-5 — Add transaction: restyle (tabs · fonts · AUTO).** Per screenshot — **ONLY** these three, no
  functional/handler changes: (a) **Buy/Sell segmented tab style** — white rounded container, active =
  white pill with subtle shadow, inactive = muted; (b) **text/font** treatment of the field labels +
  inputs; (c) move the **"AUTO"** indicator inline to the **right side of the "Price per coin" input**
  (green). Keep the coin-head row (DP-2), Amount/Price fields, and the dynamic submit button. (img 6)

**Status:** captured 2026-06-27; awaiting the rest of the founder's round-2 list, then confirm R2-1
placement + finalize build order before building.
