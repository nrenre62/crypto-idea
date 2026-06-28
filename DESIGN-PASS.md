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
- **R2-5 — Add transaction: restyle (tabs · fonts · AUTO · Total cost).** Per screenshots — **ONLY**
  styling, no functional/handler changes: (a) **Buy/Sell segmented tab style** — white rounded container,
  active = white pill with subtle shadow, inactive = muted; (b) **text/font** treatment of the field labels
  + inputs; (c) move the **"AUTO"** indicator inline to the **right side of the "Price per coin" input**
  (green); (d) **"Total cost" row** restyle — muted label left, amount right in the **large display/serif
  font** (e.g. `$31,115`), sitting just above the green "Add to portfolio" button. Keep the coin-head row
  (DP-2), Amount/Price/Date fields, the total computation, and the dynamic submit button. (img: add-tx 1 + 2)
- **R2-6 — Journal → new design.** Per screenshot: a big **serif "Journal"** title + the account avatar
  top-right + **"Write before you buy."** subtitle; entry **cards** = coin brand-color circle (`CI`) + coin
  name + muted "Added <date>" + a **status pill** on the right (Intact = green · Review = amber · Challenged
  = red) + a 2-line thesis excerpt. Restyle the Journal header + entry cards + status pills + fonts to match.
  **Keep all journal logic/handlers** (thesis add/edit, review-status). `.ci-app`. (img: Journal)
- **R2-7 — Research › Allocation: original coin colors.** The allocation bar + legend currently **repeat
  colors** (e.g. SOL & BNB both render green). Color each bar segment + legend dot by the coin's **original
  brand color** (the `coinColor(symbol)` brand palette — SOL purple, BNB gold, RNDR red, …) so every coin is
  distinct. Research feature module (`src/features/research/`). (img: ALLOCATION)
- **R2-8 — Research dark-mode contrast fix.** In dark mode the **"A note on diversification"** card renders
  **light background + light text → unreadable** (its bg/text don't flip). Tokenize it and audit sibling
  Research cards (stress-test note, daily brief, etc.) so they're dark-safe + consistent with the other dark
  cards. Research module (`styles/research-tab.css`, `.research-root` dark overrides). **Readability bug.**
- **R2-9 — Learn lesson dark-mode contrast fix.** In the lesson overlay the **"THE KEY INSIGHT"** box
  (`.lesson-insight`) uses a light gradient that stays light in dark mode → unclear text/background; check
  the quiz card too. Tokenize so it's readable in dark. `.ci-app`. **Readability bug.**

**Status:** captured 2026-06-27 (founder adding more — "do the plan now, build later"). Before building:
get the rest of the list, confirm R2-1 avatar placement, finalize build order. R2-8/R2-9 are dark-mode
readability bugs (bump priority within the round).

---

## Round 3 — dark-mode visibility bugs (2026-06-28, PLAN ONLY — founder adding more)

> A batch of **dark-mode ("black mode") visibility** bugs from founder screenshots: controls that are
> invisible because a color was **hardcoded** or used a **non-flipping token** instead of the dark-safe
> one. All **design-only**, all small, all fixable by swapping to an existing token (no new tokens, no new
> deps, light mode untouched). Each item below is grounded in the actual file:line + token (verified
> first-hand, not guessed). **Founder said "do the plan now… I will share more of black mode later" — do
> NOT build until they say go.** The token rule throughout: **flip-aware tokens** (`--ink`, `--ink-soft`,
> `--paper`, `--paper-2`, `--line-strong`, `--accent-soft`, `--accent-ink`) are contrast-safe in both
> modes; **`--accent` (#0a6b4d), `--warn`, `--sg/--sa/--sr` do NOT flip** (use them only where they already
> read on both — e.g. a solid accent background with white text).

- **R3-1 — Add-portfolio "+ Add" button: white-on-white, invisible in dark.** (img: "Portfolios (1/15)")
  - **Where:** `.add-name` — `src/styles/app.css:463` (`.port-add .add-name { … background:var(--ink); color:#fff }`), rendered in the **Account → Portfolios** view at `src/components/Account.jsx:239`.
  - **Root cause:** `background:var(--ink)` **flips** to near-white `#ece9e1` in dark, but the text is **hardcoded `color:#fff`** (doesn't flip) → cream button + white text = illegible. (This is a *different* button from the green add-**coin** `.add-btn`.)
  - **Fix (1 token):** `color:#fff` → `color:var(--paper)` (paper flips: white in light, `#14130f` in dark) → always paper-on-ink, dark-safe both modes. No logic change.

- **R3-2 — Back chevron (`<`): dark-on-dark, invisible on every drill-in.** (img: BNB Coin info — no visible back arrow)
  - **Where:** all four screen back buttons are `<button className="icon-btn">{Ic.back}</button>` — `CoinInfo.jsx:28`, `Detail.jsx:23`, `AddEntry.jsx:48`, `Account.jsx:75`. `Ic.back` is defined in `src/components/ui.jsx:9`; `.icon-btn` in `app.css:245`.
  - **Root cause:** `Ic.back`'s SVG uses `stroke={c.txt}` where `c.txt = "#1A1A1A"` (hardcoded near-black in `src/utils/theme.js`, not a token), and `.icon-btn` sets **no color** → the chevron is fixed dark-gray, invisible on the dark paper. (The Journal overlay's `.back-btn` is already correct — `stroke="currentColor"` + `color:var(--ink-soft)`; copy that pattern.)
  - **Fix (covers all four at once):** (a) `ui.jsx:9` `stroke={c.txt}` → `stroke="currentColor"`; (b) add `color:var(--ink)` to `.ci-app .icon-btn`. Light = `#15140f` (visible on paper), dark = `#ece9e1` (visible on dark). **Blast radius is safe:** only `Ic.back` uses `c.txt`; `Ic.plus` already uses `currentColor` (now inherits `--ink`, fine); `Ic.trash` keeps its own red.

- **R3-3 — Accent green not "shiny" on black (low-contrast foreground).** (img: Journal "Add thesis" green button) — founder wants accent green clearly visible/"shiny" on black **on any screen or tab**.
  - **Where (reported):** `.nt-btn` "Add thesis" — `Journal.jsx:222`, `app.css:134` (`color:var(--accent); background:var(--accent-soft)`).
  - **Root cause:** `--accent` (#0a6b4d) is defined once and **NOT in the dark override block**, so every rule using accent as **text/icon** stays dim dark-green on the black paper. The token system already ships the fix — `--accent-ink` flips to bright **`#5cd6a6`** in dark — but these rules used `--accent` instead. (The buttons that *already* look right in dark — `.m-btn`, `.m-icon`, `.tl-cta`, `.pnl-val`, `.tier-badge.pro` — are exactly the ones that use `--accent-ink`.)
  - **Fix (the token rule, applied consistently):** **accent as foreground → `--accent-ink`**; **accent as solid background with white text → keep `--accent`** (white-on-dark-green is fine; do **not** brighten `--accent`, that would *worsen* white-text contrast). Convert these **foreground** rules `var(--accent)` → `var(--accent-ink)`: `.sec-link` (84), `.empty-ic` icon (92), `.tb.active` (105), `.nt-btn` (134), `.learn-level` (138), `.up` gain-% (223), `.field-label .lbl-accent` (307), `.auth-link span` (343), `.consent-row a` (348), `.welcome-check` icon (383), `.port-row .pr-name.active` (459), `.priv-links a` (473) — plus the inline `<strong style={{color:"var(--accent)"}}>` in `Portfolio.jsx:84`. **Leave as `--accent`** (correct): every `background:var(--accent); color:#fff` button (`.add-btn`, `.add-pill`, `.seg-btn.on-buy`, `.submit-buy`, `.vb-resend`, `.plan-cta.accent`, `.plan-badge`, `.acct-btn.accent`, `.switch:checked`) and all accent **borders**. Light mode barely changes (`#07503a` ≈ `#0a6b4d`). **Cross-ref R2-8** for the Research module's own `--accent` foreground uses (separate `.research-root` CSS).

- **R3-4 — Account avatar: black-on-black, can't find it to open Account.** (img: header — "A" circle invisible)
  - **Where:** `.avatar` (`app.css:73`, used by the persistent header avatar `className="avatar app-avatar"`, `CryptoIdea.jsx:649`) **and** `.acct-avatar` (`app.css:392`, the Account screen's big avatar). Both: `background:linear-gradient(155deg,#26241d,#15140f)` (near-black, **never** flips) + `color:var(--paper)` (flips to dark `#14130f` in dark).
  - **Root cause:** dark circle on dark paper, with a dark initial → fully invisible in dark (fine in light: dark circle on light page).
  - **Fix (dark-only override; light untouched):** add to the dark block —
    `html[data-theme="dark"] .ci-app .avatar, html[data-theme="dark"] .ci-app .acct-avatar { background:var(--accent-soft); color:var(--accent-ink); border:1px solid color-mix(in srgb, var(--accent) 45%, transparent); }`
    → a clearly-visible tinted-green circle + bright initial + subtle ring, on-brand. **Alternative** (neutral, if founder prefers no green): `background:var(--paper-2); color:var(--ink); border:1px solid var(--line-strong)`. **Build together with R2-1** (avatar placement) since both touch the same element.

**Also flagged by founder (NOT design — backend bug):**
- **B-PORT — "Couldn't create portfolio. Check your connection." fails for every account.** `addPortfolio()`
  (`CryptoIdea.jsx:391-398`) → `createPortfolio()` batch (`firebase-database.js:79-95`) → the create rule
  `firestore.rules:140-144` (reads `portfolioCount` via `get(userRef())`, checks the `getAfter` increment +
  `≤ maxPortfolios`). The toast is a generic catch-all that hides the real error. **Hypothesis:** the user
  doc's `portfolioCount` is missing/uninitialized, or a doc-shape/increment mismatch trips the rule → the
  batch is rejected atomically. **Next diagnostic (not a fix):** temporarily surface `error.code/message`
  from the catch and/or read the emulator's Firestore rule-rejection log on a real create attempt; confirm
  `portfolioCount` is initialized at signup. Tracked in NEXT-STEPS (not part of the dark-mode design work).

**Status:** captured 2026-06-28 from founder screenshots; investigated read-only (all file:line + tokens
verified first-hand). **Plan only — founder said more black-mode items are coming; do not build until they
say go.** When building: bundle R3 as a "dark-mode visibility" sweep (R3-1…R3-4 are independent one-token
fixes; R3-4 + R2-1 share the avatar; R3-3 also relates to R2-8/R2-9). Keep a running dark-mode audit since
more are expected. DoD per item: extend the screen's test where it asserts a color/role, `npm run test:unit`
green, `npm run build` clean, **browser-verify in DARK** (computed-style probe per
[[preview-verification-gotchas]] — transitions fool getComputedStyle) + light, mobile + desktop, commit.
