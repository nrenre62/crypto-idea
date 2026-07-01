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
6. **DP-6 Search trending + tab redesign** — `/api/trending` + hook + UI. — ✅ BUILT 2026-06-29 (founder mockup). Header retitled **"Search"** (keeps BETA + R4-4 LIVE/plan pills; subtitle "Find any coin and add it to your portfolio."); placeholder "Search any coin…"; empty box → **TRENDING** list (reuses `.sec-label`/`.trend-item`/`.add-pill`; rows = `CI` + name + "SYM · #rank" + **Add** → existing Buy-Journal flow). Backend: new `cache/trending` doc + `refreshTrending()`/`getTrending()` (CoinGecko `/search/trending`, extracts `coins[].item`, 30-min lazy TTL, replace-write) + `/api/trending` route (`Cache-Control max-age=300,s-maxage=300`) + 404 list. Client `fetchTrending()` (mirrors `searchCoins`) + `useTrending()` (module-cached, returns array) wired via ctx. **Offline-degrade:** empty/loading → `TOP_COINS.slice(0,8)` so it's never blank. TDD (16 new tests across fetcher/hook/Search; smoke+walkthrough updated for the new title/placeholder). Verified live: `/api/trending` → 15 real coins; Search shows them w/ rank + Add→overlay; dark-safe; 304 unit green; build clean.
7. **DP-8 Login** — password eye toggle + "Log in" wording.
8. **DP-9 Coin info** — Market data (Rank/Market cap/24h vol/Circulating) + Your position (Held/Avg cost/Unrealised P&L). — ✅ BUILT 2026-06-27. Label shipped as "Unrealised P/L" (matches Detail's "Total P/L", excludes realised sells); also enriched `/api/prices` with `usd_24h_vol`+`circulating` (DP-9b) so vol/circulating are real, em-dash fallback for the long tail.
9. **DP-10 Transactions** — tx list in a card + two-column rows.
10. **DP-7 Polish** — full dark-mode + mobile/desktop verify, docs, final commit. — ✅ BUILT 2026-06-29.
    Systematic dark-mode contrast sweep across all 5 tabs + every drill-in (CoinInfo/Detail/AddEntry/Account)
    via computed-style probes (catch dark-on-dark / invisible text). Result: **clean** except two Research
    daily-brief icon stragglers the earlier rounds missed — `.ic-up` used the non-flipping `--accent` (dull
    green ~2.9:1 in dark) and `.ic-watch` hardcoded a light-pink `#fbede9` bg (stayed bright in dark). Fixed
    **dark-block-only** in `research-tab.css` (`.ic-up`→`--accent-ink`; `.ic-watch`→`--sr-s`/`--sr`); light
    untouched. Verified the fixes + re-swept; 304 unit green; build clean.

**✅ DESIGN PASS 2 — COMPLETE (2026-06-29).** All phases shipped: DP-1…DP-12, Round 2 (R2-1…R2-9),
Round 3 dark-mode (R3-1…R3-8), §J Journal edit/delete/validation, Round 4 (R4-1…R4-4 + R4-2-fix + R4-5),
DP-6 (Search trending + tab redesign), and this DP-7 polish. The whole app is aligned to the founder mockups
and verified light + dark, mobile + desktop. The separate backend **B-PORT** bug is also fixed (ERRORS.md
§A1/§A2). Remaining open items are tracked elsewhere (ERRORS.md B-series hardening; Wave B live-AI in
NEXT-STEPS §0/§BL) — not part of Design Pass 2.

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

**Status:** ✅ **ALL BUILT 2026-06-28** (founder: "do the design plan now until you finish it, do TDD every
change"). R2-1 avatar placement resolved by reserving top-right header clearance (`.apphead`/`.learn-title`
padding) so the avatar never overlaps a title. R2-2 done. **R2-3 (Portfolio Pulse) + R2-4 (Risk meter) were
already implemented** in the Research module (Pulse.jsx Share/Regenerate/period-headline + offline note;
RiskMeter.jsx segmented gradient + status badge + lock footer) — verified against the mockups, no change
needed. R2-5 (Add-tx restyle), R2-6 (Journal header) + §J (edit/delete/validation), R2-7 (allocation brand
colours), R2-8 (Research diversification/offline dark) all built + verified (light + dark, mobile + desktop),
272 unit green, build clean.

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

> **⭐ Guiding principle (founder requirement, 2026-06-28): every Round 3 fix is DARK-MODE-ONLY.** Add
> overrides inside the `html[data-theme="dark"] .ci-app` (or `.research-root`) block; **do not edit base
> rules** — light/normal mode must stay byte-for-byte unchanged ("black-mode and white-mode changes are
> separated"). This **refines R3-1…R3-4 above**: implement each as a dark-block override rather than a
> shared-rule change — e.g. R3-1 → `html[data-theme="dark"] .ci-app .port-add .add-name { color:var(--paper) }`;
> R3-3 → duplicate the accent *foreground* selectors in the dark block with `color:var(--accent-ink)`
> (leaving the light `var(--accent)` rules exactly as-is). The one exception is **R3-2** (the back chevron is
> a hardcoded SVG `stroke`, not a CSS rule): there the fix is `stroke="currentColor"` + a single
> `.icon-btn { color:var(--ink) }` that resolves correctly in *both* modes via the flipping token — verify
> light is unchanged.

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

- **R3-5 — Header tags + colored numbers/pills not "shiny" in dark (systematic).** (img: Portfolio header)
  Founder: tags/numbers/buttons should be uniformly bright in dark, on every screen.
  - **Where / root cause:** the **semantic** colors don't flip, so colored text/pills/badges read dull on
    black: `.badge-live` hardcoded `#1a7a3c` (`app.css:68`); `.beta`/`.badge-pro` use `--ai-2` `#3f7df0`
    (70/72); `.badge-plan` (PREMIUM) uses `--amber` (69); `.chg-pill.up/.dn` use `--sg`/`--sr` (220-222);
    `.vc-gain`/`.vc-sval.up/.dn` use `--sg`/`--warn` (190-191/197-198); `.kv-chg` (260-261), `.up` (223),
    conviction pills `.csig-*` (480-482), journal pills `.j-*` (120-122) — all `--sg/--sr`. `--sg #1f9d55`,
    `--sr #cf3a2c`, `--sa #e0a423`, `--ai-2 #3f7df0`, `--amber #b8841f` are **defined once, never in the dark
    block**.
  - **Fix (systematic, dark-block-only):** in `html[data-theme="dark"] .ci-app`, **brighten the semantic
    foreground tokens** to vivid values (e.g. `--sg:#2ecc71; --sr:#ff6b6b; --sa:#f4c54a; --ai-2:#5b9bff;`)
    and override `.badge-live { color:#4ecb78; background/border ↑ }`. One small block makes every colored
    number, %-pill, and tag bright in dark, app-wide and consistent. **Verify:** `--sg/--sr/--sa` are also
    used for small dot/fill accents (`.csig-* .sd`, `.m-prog-fill.done-fill`, quiz radio) — brightening
    those reads fine; the faint `*-s` rgba tints are separate and unchanged. Light mode untouched.
- **R3-6 — Account fields + buttons: white/dull/invisible in dark.** (img: Profile, Privacy & data)
  - **Where / root cause:** `.priv-btn.solid` (`app.css:466`) = `background:var(--ink)` (flips to near-white
    in dark) + hardcoded `color:#fff` → **white-on-white, invisible** (the "Download CSV" button).
    `.priv-btn.danger` (468) + `.logout-btn` (474) hardcode `background:#fdecea` + `#f0c4bd` border → light
    salmon stays in dark, washed-out. `.acct-btn` base (414) has no bg ("Send confirmation link" reads flat);
    `.acct-btn.accent` (415) white-on-`--accent` is OK but could be brighter; `.acct-btn.ghost` (417) +
    `.field-input` (309-311) flip fine (verify contrast). 
  - **Fix (dark-block-only):** override in dark — `.priv-btn.solid { background:var(--accent); color:#fff }`
    (visible green); `.priv-btn.danger` + `.logout-btn { background:var(--sr-s); color:var(--warn);
    border-color:color-mix(in srgb,var(--warn) 35%,transparent) }` (dark-safe red tint); optional
    `.acct-btn.accent { color:#fff }` already fine, and brighten ghost text to `--ink`. Light untouched.
- **R3-7 — Upgrade/Downgrade confirm modal: white sheet + invisible title in dark.** (img: "Downgrade to Pro?")
  - **Where / root cause:** the modal is **inline-styled** in `CryptoIdea.jsx:597-634` and rendered **outside**
    `.ci-app`, so dark tokens never reach it: sheet `background:"#fff"` (602, hardcoded), the title (604) has
    **no color** (inherits dark text → invisible on white in dark), and the ENDS/DELETE boxes + "Keep My Plan"
    button use hardcoded light pinks/yellows. Inline styles also win over plain CSS.
  - **Fix (dark-only; light inline styles untouched):** add classNames to the modal nodes (e.g.
    `.dg-sheet/.dg-title/.dg-text/.dg-ends/.dg-warn/.dg-keep/.dg-confirm`) — **no logic change** — then add a
    `html[data-theme="dark"]` CSS block (with `!important` to beat the inline styles): sheet →
    `var(--paper-2)`, title → `var(--ink)`, body → `var(--ink-soft)`, ENDS box → `--sr-s`/`--warn`, DELETE box
    → `--sa-s`/`--amber`, "Keep My Plan" → `var(--paper-2)` + `var(--line-strong)` + `var(--ink)`, "Confirm
    Downgrade" stays red. *(Alternative, cleaner long-term: convert the inline styles to `.ci-app` token
    classes so it flips automatically — but that rewrites the light styling, so only with founder OK.)*
    Note: this is the only Round 3 item needing a (style-only, no-logic) JSX edit.
- **R3-8 — Research "Ask" panel: black-on-black in dark.** (img: Research → Ask) — **`.research-root` scoped.**
  - **Where / root cause:** `.ask` (`research-tab.css:180`) is intentionally a **dark hero card**
    (`linear-gradient(#1b1a15,#100f0b)` + white-ish children) on the light page — correct in light. In dark
    the page is also near-black, so the panel **blends into the background** (no edge), and the `.ask h3`
    inherits `color:var(--paper)` which **flips to dark `#14130f`** → invisible title. (The subp/input/prompts
    use explicit `rgba(255,255,255,…)` so they stay readable on the dark panel.)
  - **Fix (minimal, dark-block-only in `.research-root`):** `html[data-theme="dark"] .research-root .ask {
    border:1px solid var(--line-strong); color:var(--ink); }` — the border separates it from the page and
    `color:var(--ink)` (light in dark) restores the title. Optional: bump `.ask-input`/`.prompt` rgba bgs for
    a touch more pop. **Cross-ref R2-8** (other Research dark cards). Light untouched.

**Also flagged by founder (NOT design — backend bug → see [`ERRORS.md`](ERRORS.md) §A1):**
- **B-PORT — "Couldn't create portfolio. Check your connection."** **CONFIRMED via live emulator repro
  (2026-06-28):** it is **not** a connection or rules bug — the create is correctly **denied** because the
  user is **at their plan's portfolio cap** (free 1 / pro 3 / premium 15), and the app **mislabels** the
  `permission-denied` as a connection error. It surfaces when the **client tier > the DB tier** (a local/demo
  "upgrade" the server never persists, since users can't write their own `tier`), so the client cap-check
  (`CryptoIdea.jsx:392`) passes and the rule then denies. Earlier "getAfter can't see increment" guess was
  **disproven** (pro@test.com succeeded with that exact batch). **Full diagnosis + fix in ERRORS.md §A1/§A2.**
  Not part of the dark-mode design work.

**Status:** ✅ **ALL BUILT 2026-06-28** — dark-block-only, light mode byte-for-byte unchanged (verified via
computed-style probes per [[preview-verification-gotchas]]). R3-1 add-portfolio button, R3-2 back chevron
(ui.jsx currentColor + `.icon-btn` color), R3-3 accent→`--accent-ink` foreground, R3-4 avatar (tinted-green
circle), R3-5 brightened semantic tokens (`--sg/--sr/--sa/--ai-2`) + `.badge-live`, R3-6 account/privacy
buttons, R3-7 Upgrade/Downgrade modal (classNames + `!important` dark CSS), R3-8 Research Ask panel. Each
browser-verified dark (bright/visible) + light (unchanged). 272 unit green, build clean.
**B-PORT** (mislabeled plan-limit) remains a separate backend fix in [`ERRORS.md`](ERRORS.md) §A1 — not part
of this design build.

---

## Round 4 — founder follow-up (2026-06-28 plan · ✅ ALL BUILT 2026-06-29)

> **✅ BUILT 2026-06-29 — R4-1…R4-4 all shipped, TDD'd, browser-verified (light + dark, mobile +
> desktop), committed.** 293 unit green; build clean. Commits: R4-1 `8323fc7` (stat-row CSS) ·
> R4-4 `b9dc369` (header tags) · R4-2 `373b66d` (Portfolio click-zones) · R4-3 `f420e5e` (delete
> guard). Build notes per item are appended to each bullet below. Original plan follows.
>
> A fourth batch from founder screenshots + a new safety rule. **Two are design-only** (R4-1 Research
> stat-row, R4-4 header tags); **two add small, production-ready logic** (R4-2 Portfolio click-zones,
> R4-3 delete-coin guard) — flagged below. Same guardrails: reuse `.ci-app`/`.research-root` tokens, KISS,
> no new deps, keep all wording/handlers unless a decision says otherwise, tests green, verify mobile +
> desktop + light + dark before commit. **Each item is grounded in the actual file:line (verified
> first-hand via the round-4 explore pass), not guessed.** Decisions captured 2026-06-28 via AskUserQuestion
> are recorded inline. **Founder said "do the plan now" — do NOT build until they say go.**

- **R4-1 — Research › Coins: stat-row labels consistent across every card (mobile + desktop).** (img: BTC vs ETH/BNB cards)
  - **Where:** the four position stats `Avg cost / Now / P / L / 30d` — `CoinCard.jsx:66-72` (`.pos-stats` → four `.pos-stat`, each `.ps-l` label + `.ps-v` value). CSS `research-tab.css:171-174` (`.pos-stat { flex:1 }`, `.ps-l` 10px uppercase, `.ps-v` 14px bold).
  - **Root cause (verified):** there is **NO** per-card / first-card / "featured" code — every card renders the identical markup (BTC == ETH == any coin already, structurally). The inconsistency the founder sees is the **two-word label "AVG COST" wrapping to two lines** at narrow box widths (1-up phone, or 2-/3-up desktop columns) while "NOW"/"30D" stay single-line → boxes look uneven, and a card at one width looks different from a card at another. It's a label-wrap/layout bug, not a logic bug.
  - **Fix (design-only, CSS in `.research-root`):** make every stat box deterministic at any width — `.ps-l { white-space:nowrap; letter-spacing/size tuned so "AVG COST" never wraps }` (and/or shrink to e.g. 9.5px), `.pos-stat { flex:1; min-width:0; text-align:center }` so all four are equal-width and identically aligned. Result: the four labels match each other and every coin card is identical on mobile **and** desktop. **Note — this is a LAYOUT normalization that intentionally applies to BOTH light and dark equally** (it changes no colors), so it is *not* a dark-block-only change; the "separate dark/light" rule covers color/dark-mode fixes, not shared layout. **Keep all label wording.**

- **R4-2 — Portfolio card: split click zones (image → coin info · background → add transaction).** (logic + design) (founder: "make it simple to open the transaction and the position")
  - **Where:** `Portfolio.jsx:95` — today the **whole** `.asset-card` has `onClick={() => { setInfoCoin(coin); setScreen("coinInfo"); }}`. The coin image is `<CI .../>` at `Portfolio.jsx:97` inside `.ac-top`.
  - **New behavior (founder-specified, exact):**
    - **Tap the coin image** → open **CoinInfo** (read-only position/market view — today's whole-card target). Wrap `<CI/>` in a clickable element with `onClick` + `e.stopPropagation()` → `setInfoCoin(coin); setScreen("coinInfo")`. Give it a tap affordance (cursor:pointer + subtle hover ring) so the small 38px target reads as interactive.
    - **Tap the card background** (anywhere else) → open **Add transaction** directly. `AddEntry.jsx:59-62` already has an in-form **Buy/Sell segmented toggle**, so open it defaulting to **Buy** (user can switch to Sell in-form) — no separate chooser needed.
  - **Implementation (KISS):** add a context helper `startAddTx(coin, type="buy")` that mirrors Detail's `openNewTx` prefill (`Detail.jsx:19`: `setEditEntry(null); setETxType(type)`; prefill price from `getHistoricalPrice`/`fmtPriceInput`, `setEAmt("")`, `setEDate(now)`; `setSel(coin)`; `setScreen("addEntry")`). Reuse it for **both** the Portfolio card-background tap **and** Detail's Buy/Sell buttons (one source of truth). Add a small `txReturn` state ('portfolio' | 'detail') so AddEntry's back button (`AddEntry.jsx:48`, currently always `setScreen("detail")`) returns the user to **where they came from** — portfolio-launched add goes back to Portfolio, Detail-launched add goes back to Detail.
  - **Discoverability note:** with the background now opening Add-transaction, the read-only CoinInfo (and via its **Transactions** pill, the Detail list / edit / delete-coin) is reachable only through the image tap — the image affordance above makes that clear. Scope is **Portfolio holdings cards only** — the Research coin cards (R4-1) keep their expand-on-tap behavior.

- **R4-3 — Delete-coin warning when the coin has transactions.** (logic + design — new safety rule) (img: founder's delete request) — **decisions locked via AskUserQuestion 2026-06-28.**
  - **Where:** `Detail.jsx:25-27` — trash icon → `setConfirmDel(true)` → a `pill-danger` "Remove" that calls `remCoin(coin.id)` **with no transaction check at all**. `remCoin` (`CryptoIdea.jsx:477-481`) → `dbRemoveCoin` (`firebase-database.js:247-265`) atomically deletes the coin **and all its transactions** (and the journal/thesis, which lives on the coin doc). `confirmDel` boolean already exists (`CryptoIdea.jsx:125`).
  - **Decision — trigger:** show the new warning popup **only when `coin.entries.length > 0`** (the coin has buy/sell history). A coin with **no transactions** keeps the current quick two-tap delete (trash → "Remove"). *(Edge note: a transaction-less coin that has only a thesis still uses the quick path — the trigger is transactions, per the founder's wording. Minor; documented.)*
  - **Decision — confirmation style:** a **simple Cancel / "Delete anyway" popup** (no type-to-confirm). One tap on "Delete anyway" removes the coin.
  - **Decision — data wording + permanence:** the popup is **honest about everything lost** — transactions **and** the saved thesis — and the delete is a **hard delete** (no 30-day trash). Copy (polished from founder's text): **title** "Delete {coin.name}?"; **body** "This coin has {n} buy/sell transaction{s} and your saved thesis. If you delete it from your portfolio you'll lose that data — this can't be undone."; **buttons** "Cancel" (ghost) · "Delete anyway" (danger red).
  - **Fix (reuse the dark-safe modal pattern):** render an overlay in `Detail.jsx` using the **existing `.dg-*` classes** from the downgrade modal (`.dg-sheet/.dg-warn/.dg-warn-text/.dg-keep` + a red confirm button — already styled **and dark-safe** via R3-7), so no new modal CSS. Trash click → `setConfirmDel(true)`; then render **the modal** when `coin.entries.length > 0`, else the current inline "Remove" pill. "Delete anyway" → `remCoin(coin.id)`; "Cancel" → `setConfirmDel(false)`. **No change to `remCoin`/`dbRemoveCoin`** (they already cascade correctly) — this is purely a confirmation gate.

- **R4-4 — LIVE + plan tags on every main-tab header.** (design + small wiring) (img: Portfolio header) — **decision: all 5 main tabs.**
  - **Where:** only **Portfolio** renders the full set today — `Portfolio.jsx:29-31`: `BETA` + conditional `● LIVE` (when `api === "live"`) + a clickable `.badge-plan` `{plan}` pill (STARTER/PRO/PREMIUM) → `setScreen("account")`. The other tabs show less: **Journal** (`Journal.jsx:241-248`) BETA only; **Search/Add** (`Search.jsx:44-50`) BETA only; **Learn** (`Learn.jsx:103-114`) BETA inline in the hero, no apphead; **Research** (`ResearchTab.jsx:48-57`, scoped `.research-root`) BETA only. Tier source: `isPro`/`isPremium` from `user.tier` (`CryptoIdea.jsx:120-121`), `api` from `useLivePrices` (`CryptoIdea.jsx:116`) — both already in the app context.
  - **Decision (AskUserQuestion):** add the **`● LIVE` + plan pills to all 5 main tab headers** (Portfolio already done → add to Journal, Learn, Search, Research). **Keep the drill-in screens minimal** (CoinInfo/Detail/AddEntry/Account use `.detail-head` back-headers — no badges).
  - **Fix:** in each tab header, render the same two pills as Portfolio — `{api === "live" && <span className="badge badge-live">● LIVE</span>}` + a clickable `<span className="badge badge-plan" onClick={()=>setScreen("account")}>{plan}</span>` — reading `api`, `isPro`, `isPremium` from `useApp()` (already exposed). Compute `plan = isPremium ? "PREMIUM" : isPro ? "PRO" : "STARTER"`. **Learn** places them next to the hero BETA (respect the R2-1 avatar top-right clearance). **Research** is the separate scoped module: thread `api` + `plan` into `ResearchTab` and use `.research-root`-scoped `.badge-live`/`.badge-plan` (add the scoped badge rules if missing; ensure their dark overrides exist — cross-ref R2-8/R3-8). **Dark-safe for free:** R3-5 already brightened `.badge-live`/`--amber` in the dark block, so `.ci-app` pills are vivid in dark; verify the Research-scoped copies match. *(Optional DRY: a tiny shared `<HeaderTags/>` for the four `.ci-app` tabs; Research keeps its own scoped copy.)* **Keep the BETA pill** everywhere.

**TDD plan (per [[testing-tdd-policy]] / tdd-testing skill):**
- **R4-1** — CSS-only → **not jsdom-testable**; browser-verify computed styles (`.ps-l` `white-space:nowrap`; all four `.pos-stat` equal width) at ~390 and ~1040, light + dark. A structural test (each card renders exactly four `.pos-stat`) is the most a unit test can add.
- **R4-2** — **behavior change → UPDATE the existing Portfolio/walkthrough test** that asserted whole-card → `coinInfo`. New unit tests: image-tap → `setInfoCoin` + `screen==="coinInfo"`; card-background tap → `screen==="addEntry"` with `sel` set + `eTxType==="buy"`; back from a portfolio-launched AddEntry returns to Portfolio.
- **R4-3** — Detail tests: trash on a coin **with** entries opens the modal (warning copy present, mentions transactions + thesis); "Cancel" keeps the coin (no `remCoin`); "Delete anyway" calls `remCoin`; trash on a coin **with no** entries → the quick "Remove" pill path (no modal). Update any existing Detail delete test.
- **R4-4** — header tests (per tab): `● LIVE` renders when `api==="live"` (and not when "mock"); the plan pill shows STARTER/PRO/PREMIUM by tier and clicking it routes to Account.
- **Gate:** `npm run test:unit` green + `npm run build` clean + browser-verify (mobile + desktop, light + dark) before each commit.

**Build order (suggested, smallest-blast-radius first):** R4-1 (CSS) → R4-4 (header tags, repetitive but isolated) → R4-2 (Portfolio click-zones + `startAddTx`/`txReturn`) → R4-3 (delete guard modal). Commit per item. Slotted into [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

### Round 4 — follow-up corrections (2026-06-29, founder · ✅ BUILT)

> ✅ **BUILT 2026-06-29** — R4-2-fix + R4-5 shipped, TDD'd, browser-verified (light + dark); 294 unit green;
> build clean. R4-5 confirmed it fixes the reported bug: on a fresh AddEntry the price is prefilled with an
> *estimate* that differs from the real market price, so the old AUTO was hidden — now it's always shown and
> one tap applies the real market price (verified: estimate 84000 → tap AUTO → 59943.11, button goes active).

- **R4-2-fix — card background opens DETAIL, not Add-transaction.** Founder clarified (screenshot of the
  Solana **Detail** screen): tapping the card's white background should open the **Detail** view (holding /
  P&L / transactions list + Buy/Sell), not jump straight into the Add-transaction form. The coin **image**
  still opens CoinInfo. Change `Portfolio.jsx` card-background `onClick` → `setSel(coin); setScreen("detail")`.
  Since the portfolio no longer launches AddEntry, the `txReturn` machinery added in R4-2 is now vestigial
  (every AddEntry launch comes from Detail) → remove it: drop `txReturn` state + ctx, `startAddTx` loses its
  `from` arg, AddEntry's back + addEntry's post-save both go to `"detail"`. Update the R4-2 tests.
- **R4-5 — AUTO price is an always-visible, clickable button.** Today the `AUTO` badge
  (`AddEntry.jsx`, `.auto-badge`) only appears when the typed price is within 15% of the date's market price,
  and it's `pointer-events:none`. Founder wants it **always visible** (whenever a suggested market price
  exists, any coin) and **clickable** to snap the price back to the market price for that date — so after
  manually editing, or switching coins, AUTO is still there. Fix: render the badge whenever `histPrice` is
  truthy as a `<button>` → `setEPrice(fmtPriceInput(histPrice))`; add an active `.on` state when the price
  already matches (`priceIsHist`), an outline "tap to use" state otherwise. Dark-safe (accent-ink/accent-soft).

**Status:** ✅ **ALL BUILT 2026-06-29.** All four decisions honored (header tags = all 5 tabs · delete
warning = only when the coin has transactions · simple Cancel/Delete-anyway popup · warn about transactions
+ thesis, hard delete). As-built deltas vs the plan:
- **R4-1** — done exactly as planned (`.ps-l` nowrap + smaller font/letter-spacing + ellipsis safety net;
  `.pos-stat` `min-width:0`/center). Added a structural test (4 boxes/card). Browser-verified equal-width
  single-line labels at 375 (light+dark) and 1280.
- **R4-4** — extracted a shared `<HeaderTags/>` for the 3 `.ci-app` tabs (Journal/Learn/Search); Portfolio
  kept its existing inline pills; Research got a `.research-root`-scoped copy + a dark `--sg` override for
  `● LIVE`. NB: the plan said R3-5 had brightened `--amber` — it hadn't, but the plan pill matches
  Portfolio's shipped amber exactly (consistent + legible ~5:1 in dark), so left as-is.
- **R4-2** — `startAddTx(coin,type,from)` in ctx (reused by Detail's Buy/Sell, replacing its local
  `openNewTx`); `txReturn` makes BOTH the back button and the post-save return to the origin (portfolio
  vs detail). Image wrapped in `.ac-img` (hover-ring affordance).
- **R4-3** — modal reuses the `.dg-*` classes (dark-safe sheet `#1c1b17` / warn-text `#e6c879` confirmed);
  no change to `remCoin`/`dbRemoveCoin`. Trigger = `coin.entries.length > 0`.

## Round 5 — card design consistency across tabs (2026-06-29, PLAN ONLY)

> Founder follow-up (Search mockup): the coin / thesis / search cards should look the **same across tabs**.
> Grounded read: Portfolio (`.asset-card`) and Journal (`.j-entry`/`.nt-row`) are **already white cards**, but
> **Search's `.trend-item` is the outlier** — a flat bottom-bordered list, not cards. Unify on the Portfolio
> card chrome. **Decisions locked via AskUserQuestion 2026-06-29:** card-ify **trending only** (typed results
> stay the compact list) · trending cards **reflow to the grid on desktop** like Portfolio/Journal · standardize
> **all** coin/thesis/search cards on **Portfolio's radius**. **Plan only — build on founder "go".**

- **Canonical card = Portfolio `.asset-card`** (`app.css:260`): `background:var(--paper-2); border:1px solid
  var(--line-2); border-radius:var(--radius); box-shadow:var(--sh-sm); padding:16px`. All token-based → already
  dark-safe (no dark-block work needed; the tokens flip).

- **R5-1 — Search TRENDING rows → white cards in a grid.** `Search.jsx` trending branch maps each coin to
  `.trend-item` (`app.css:291`: `display:flex; padding:10px 18px; border-bottom:1px solid var(--line-2)` — flat,
  no card). Change ONLY the trending list (the typed-results branch keeps `.trend-item` as-is per the decision):
  give trending rows a card class (`.trend-card` = the `.trend-item` flex row + the canonical card chrome, drop
  the bottom-border) and wrap the trending list in `<div className="grid-auto trend-grid">` so it reflows
  multi-column on the 1040 wide track (Search is already on it via DP-12). Keep the row content unchanged
  (CI + name + "SYM · #rank" + green **Add** → existing `setJournalFor`). Mobile 1-up, desktop multi-up — matches
  Portfolio/Journal. **No logic change.** *(Use a distinct class — or modifier `.trend-item.trend-card` — so the
  shared typed-results list is untouched.)*

- **R5-2 — radius unification (the "match across all tabs" alignment).** Bump Journal `.j-entry` (`app.css:166`)
  and `.nt-row` (`app.css:183`) from `--radius-sm` → `--radius` so they match the Portfolio asset card + the new
  Search cards. Pure CSS, token-based (light + dark safe). Portfolio `.asset-card` already uses `--radius` (the
  reference). *(Optional: factor the shared chrome into one `.coin-card` utility class the four card types
  compose — KISS says only if it reduces duplication cleanly; otherwise just align the values.)*

- **Out of scope / unchanged:** each card's **internal content** stays as-is (Portfolio = value/price; Journal =
  thesis excerpt + status pill; Search = SYM·#rank + Add) — only the card **container** (bg/border/radius/shadow/
  spacing + desktop grid) is unified. Typed search **results** stay the compact `.trend-item` list (decision).
  Portfolio cards unchanged (they're the reference). Research's scoped coin cards are a separate module, not in scope.

**TDD plan:** mostly CSS + a small structural change.
- **R5-1** — Search test: trending rows render as cards (assert the `.trend-card`/grid wrapper) and the Add flow
  still opens the Buy-Journal overlay (extend the DP-6 trending tests; update any class query). Browser-verify
  trending at ~375 (1-up) and ~1040 (multi-up): white cards w/ shadow + spacing, light + dark.
- **R5-2** — token value, not jsdom-meaningful → browser-verify the three tabs' cards share one radius.
- **Gate:** `npm run test:unit` green + `npm run build` clean + browser-verify (mobile + desktop, light + dark).

**Build order:** R5-2 (radius CSS, trivial) → R5-1 (Search card-ify + grid). Commit per item. Slotted into
[`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

**Status:** ⤴️ **SUPERSEDED by Round 7 (2026-06-29).** Round 7 keeps R5's two moves (R7-1 = R5-2 radius;
R7-2 = R5-1 card-ify trending + grid) but **upgrades the canonical chrome from the plain `.asset-card` to the
Research _Portfolio Pulse_ card** (founder follow-up) and adds two Pulse fixes. Build from **Round 7**, not here.

## Round 6 — dark-mode visibility follow-up (2026-06-29, PLAN ONLY)

> Three **dark-mode-only** readability fixes from founder screenshots. **All dark-block-only — light mode stays
> byte-for-byte unchanged** (the Round 3 discipline: add `html[data-theme="dark"]` overrides, never touch base
> rules). Grounded first-hand in the CSS/components below. **Plan only — build on founder "go".**

- **R6-1 — tab footer disclaimer too dim in dark.** Every tab's bottom note uses `.disclaimer`
  (`app.css:141`, `color:var(--ink-faint)` = #86837a → ~3:1 on dark paper, hard to read): **Portfolio**
  (`Portfolio.jsx:117`), **Journal** (`Journal.jsx:269,316`), **Learn** (`Learn.jsx:88,143`), and the
  **Research** AI/Stress-test note (`.research-root .disclaimer`, `research-tab.css:218`, `ResearchTab.jsx:77`).
  **Fix (dark-block-only):** override `html[data-theme="dark"] .ci-app .disclaimer` **and**
  `html[data-theme="dark"] .research-root .disclaimer` → `color:var(--ink-soft)` (#b5b1a6 — clearly readable).
  (Founder said "white"; `--ink-soft` is the readable muted-light for a footer — go `--ink` for fully white if
  preferred.) Light keeps `--ink-faint`.

- **R6-2 — account/settings input fields dim in dark.** `.field-input` (`app.css:366`) in dark has a barely-
  visible border (`border:1px solid var(--line-strong)` = #3a382f on dark paper) and a dim placeholder
  (`::placeholder color:var(--ink-faint)`); the typed text is **already** light (`color:var(--ink)` → #ece9e1,
  fine). Seen on **Account → Profile** (change-email/password fields), but it's the shared field class so the
  fix improves every form. **Fix (dark-block-only):** `html[data-theme="dark"] .ci-app .field-input {
  border-color:var(--ink-soft) }` + `html[data-theme="dark"] .ci-app .field-input::placeholder {
  color:var(--ink-soft) }` (visible "white-ish" border + readable placeholder; typed text untouched). *(Related,
  same screen: the disabled "Send confirmation link" `.acct-btn` (`Account.jsx:137`) is also low-contrast on
  dark — optional same-batch polish to lift its disabled contrast in the dark block.)* Light untouched.

- **R6-3 — delete-coin modal TITLE invisible in dark.** The R4-3 warning modal's title in `Detail.jsx`
  hardcodes `color:c.txt` (#1A1A1A from `utils/theme.js`) → **dark-on-dark** on the dark `.dg-sheet`; the rest
  of the modal is fine (`.dg-warn-text`/buttons have R3-7 dark overrides — the title doesn't, and the DP-7 sweep
  missed it because the modal wasn't open). **Fix:** change the title color `c.txt` → `var(--ink)` (the flipping
  token) → near-white in dark, near-black in light (light visually unchanged — both ≈ #1A1A1A/#15140f). One-line
  inline-style change; mirrors how the Downgrade modal title stays visible (it inherits — no hardcoded colour).

**TDD/verify:** all CSS / one inline colour — not jsdom-meaningful → **browser-verify in dark**: footer
disclaimer readable on Portfolio/Research/Journal/Learn; field borders + placeholders visible on Account (+
other forms); the delete modal title "Delete {coin}?" readable. Confirm **light mode is byte-for-byte
unchanged** (only `html[data-theme="dark"]` rules added + the R6-3 token swap, which stays near-black in light).
`npm run test:unit` green + `npm run build` clean. **Build order:** R6-3 (1 line) → R6-1 → R6-2, commit per item.

**Status:** ✅ **BUILT 2026-06-30** (commit `9cb0759`). All dark-block-only; light mode byte-for-byte
unchanged. Verified: computed-style probe confirms the disclaimer/field-input lift to `--ink-soft` in dark
and the delete-modal title resolves to `var(--ink)`; 311 unit green; build clean.

## Round 7 — card consistency aligned to the Research _Portfolio Pulse_ card (2026-06-29, PLAN ONLY)

> Founder follow-up (Research-Overview screenshots): make the cards **consistent across the whole app with the
> Research _Portfolio Pulse_ card** — use the Pulse card's **border + colors** for Portfolio / thesis / Search-
> trending cards; restyle the Pulse **Share/Regenerate** buttons to the app's button design; and the **"A note on
> diversification"** card icon is **missing** (blank in both light & dark) — give it a visible icon for both modes.
> Grounded first-hand via a 6-agent read-only mapping (Pulse chrome, Portfolio/Journal/Search cards, buttons, the
> note icon, plan reconciliation). **Supersedes Round 5.** **Plan only — build on founder "go".**

**Decisions locked via AskUserQuestion (2026-06-29):**
1. **Frame scope = "match base, frame on hero cards."** All card families share the Pulse _base_ chrome (white
   inner + rounded + soft shadow), but the green→blue **gradient frame** is reserved for the **hero/summary card**
   (Portfolio value card) so it stays a premium accent and the dense coin/thesis/trending lists stay clean. *(Not
   the gradient-on-every-card literal reading — chosen on taste to avoid a busy UI + keep Pulse special.)*
2. **Pulse Share/Regenerate = soft green pill** (the app's secondary-action style, = `.tx-btn.buy`).
3. **Diversification icon** = a visible monochrome glyph tinted with the flipping `--accent` token (light + dark).

**Why this is cheap & safe:** the Pulse frame uses **non-flipping rgba** colors → renders identically in light &
dark (the Pulse card itself has _no_ dark override — confirmed); the pills use `--accent-soft`/`--accent-ink`
(which already have dark overrides in `research-tab.css`); the icon uses `--accent` (flips). ⇒ **Round 7 adds ZERO
new `html[data-theme="dark"]` rules** and light mode stays byte-for-byte unchanged. KISS: the frame is applied with
the **single-element gradient-border technique** (`border:1px solid transparent` + double `background` with
`padding-box`/`border-box`) — **no wrapper div, no JSX/handler changes** (so R4-2 split click-zones are untouched).

**Canonical reference — the Pulse card** (`Pulse.jsx:20`, `research-tab.css:67-68`):
- Outer `.pulse`: `border-radius:24px; padding:1px; background:linear-gradient(135deg,rgba(10,107,77,.38),rgba(63,125,240,.32)); box-shadow:var(--sh)`.
- Inner `.pulse-inner`: `background:var(--paper-2); border-radius:23px; padding:21px`.
- **Base chrome** (what every card matches): `background:var(--paper-2); border:1px solid var(--line-2); border-radius:var(--radius); box-shadow:var(--sh-sm)` — i.e. Portfolio `.asset-card` (`app.css:260`) **is already the base** (the reference; unchanged).
- **Hero frame** (hero cards only): swap the flat border for the gradient frame + lift the shadow to `var(--sh)`.

- **R7-1 — unify card radius (base).** Journal `.j-entry` (`app.css:166`) and `.nt-row` (`app.css:183`):
  `border-radius:var(--radius-sm)` → `var(--radius)` so Portfolio/Journal/Search cards share one radius. Pure CSS,
  token-based, light+dark safe. *(Absorbs the old R5-2.)*

- **R7-2 — card-ify Search TRENDING + grid (base).** `Search.jsx` **trending branch only** (typed-results keep the
  compact `.trend-item` list, `Search.jsx:88` / `app.css:291`): map each trending coin to a card class `.trend-card`
  = the `.trend-item` flex layout **+ base chrome** (`background:var(--paper-2); border:1px solid var(--line-2);
  border-radius:var(--radius); box-shadow:var(--sh-sm); padding:14px 16px`), **drop the `border-bottom` divider**,
  and wrap the trending list in `<div className="grid-auto trend-grid">` so it reflows multi-column on the 1040 wide
  track (1-up mobile, 2-up+ desktop) like Portfolio/Journal. Row content unchanged (CI + name + "SYM · #rank" + green
  **Add** → existing `setJournalFor`). No logic change. *(Absorbs the old R5-1, now on the canonical base chrome.)*

- **R7-3 — Portfolio value card → Pulse gradient frame (HERO).** `.value-card` (`app.css:239`): replace
  `background:var(--paper-2)` + `border:1px solid var(--line-2)` with the **single-element gradient frame** —
  `border:1px solid transparent; background:linear-gradient(var(--paper-2),var(--paper-2)) padding-box,
  linear-gradient(135deg,rgba(10,107,77,.38),rgba(63,125,240,.32)) border-box;` and lift `box-shadow:var(--sh-sm)`
  → `var(--sh)` (Pulse's depth). Radius stays `var(--radius)` (token-consistent; the frame + colours are the match).
  **No markup change** — the `.vc-main`/`.vc-stats` children are untouched. Dark-safe (paper-2 flips, gradient rgba
  is theme-invariant — identical to Pulse). **Asset coin cards stay on base chrome (no frame)** per decision #1.

- **R7-4 — Pulse Share/Regenerate → soft green pill.** `.research-root .regen` (`research-tab.css:72`):
  `border:1px solid var(--line-strong)` → `border:0`; `background:var(--paper-3)` → `var(--accent-soft)`;
  `color:var(--ink-soft)` → `var(--accent-ink)` (= the proven `.tx-btn.buy` pattern, `app.css:337`). Hover (line 73):
  drop the border-color/colour swap, use `opacity:.85` (keep `transform:translateY(-1px)`). Disabled (line 74)
  unchanged. **Fixes the current dark-mode invisibility for free** (the old `.regen` had no dark override → the
  cream `--paper-3` bg + muddy `--ink-soft` text vanished on dark paper; the new tokens have dark overrides).

- **R7-5 — fix the empty "A note on diversification" icon (light + dark).** Root cause: `OverviewView.jsx:74` is
  `<div className="dic" />` — an **empty** 40×40 box (no glyph), so it reads as a blank white/`--paper-3` square in
  **both** themes (this is why R2-8 + DP-7 missed it — they fixed colour/contrast, but the slot had no content).
  Fix: (a) put a monochrome glyph inside — `<div className="dic" aria-hidden="true">▦</div>` (a grid/allocation
  mark = diversification; distinct from the brief-row glyphs ▲ ◆ !; **swappable**); (b) add to
  `.research-root .diversify .dic` (`research-tab.css:135`) `color:var(--accent); font-size:18px; font-weight:700;`
  (`--accent` = #0a6b4d light / #5cd6a6 dark → visible on the white box (light) and the `--paper-3` box (dark);
  the existing dark override at `research-tab.css:258` only touches the box bg/border, so the flipping glyph colour
  needs no new dark rule). Both modes covered.

- **R7-6 — hover-lift on the unified cards (founder follow-up).** Portfolio `.asset-card` lifts its shadow on
  hover (`transition:box-shadow .2s var(--ease)` + `:hover{box-shadow:var(--sh)}`, app.css:260-261) — it reads as
  "selecting" the card and is more user-friendly. `.j-entry` (`app.css:166`) has **NO** hover state and the new
  `.trend-card` (R7-2) won't either. Add the same transition + `:hover` shadow-lift to **`.j-entry`** (Journal
  thesis cards) and **`.trend-card`** (Search trending) so every selectable card shares the affordance. Design-
  only, token-based (dark-safe; no new dark rule). *(Skip `.nt-row` — it's a needs-a-thesis prompt with its own
  button, not a whole-card click target.)*

- **Out of scope / unchanged:** card **internal content** (Portfolio value/price; Journal thesis excerpt + status
  pill; Search SYM·#rank + Add) is untouched — only the **container** (chrome/radius/grid) + the two Pulse fixes.
  Portfolio `.asset-card` is the base reference (unchanged). Typed search **results** stay the compact `.trend-item`
  list. Research's other scoped cards (coin cards, risk) are a separate module — not restyled here.

**TDD / verify:** mostly CSS + one small structural change (R7-2) + one markup tweak (R7-5).
- **R7-2** — Search test: trending renders as cards (assert `.trend-card` + the grid wrapper) and Add still opens the
  Buy-Journal overlay (extend the DP-6 trending tests; update class queries). Browser-verify trending at ~375 (1-up)
  and ~1040 (multi-up): white cards + shadow + spacing, light + dark.
- **R7-5** — assert the `.dic` element now renders a glyph (non-empty text) in `OverviewView`. Browser-verify the
  diversification card shows the icon in light **and** dark.
- **R7-1 / R7-3 / R7-4** — token/CSS values (not jsdom-meaningful) → browser-verify: one shared radius across tabs;
  the value card shows the green→blue frame (light + dark) while asset cards stay flat; Share/Regenerate are soft-green
  pills, readable in dark. Confirm **light mode is unchanged** outside the intended frame/pill/icon changes.
- **Gate:** `npm run test:unit` green + `npm run build` clean + browser-verify (mobile + desktop, light + dark).

**Build order (when "go"):** R7-1 (radius) → R7-6 (hover-lift) → R7-4 (button CSS) → R7-5 (icon) → R7-3
(value-card frame) → R7-2 (Search card-ify + grid — biggest, needs test updates + reflow verify). Commit per
item. Slotted into [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

**Status:** ✅ **BUILT 2026-06-30** (commit `3e9d1f1`). Hero-only frame · soft-green pills · accent-tinted
diversification glyph. Supersedes Round 5. Zero new dark rules; light mode unchanged. Verified via computed-style
probe (light + dark): `.value-card` = transparent border + double gradient (white fill light / `#1c1b17` dark,
frame rgba identical); `.regen` = `--accent-soft`/border-0; `.dic` glyph = `--accent`; `.j-entry` radius 22px;
`.trend-card` base chrome (white→dark). New OverviewView test guards the `.dic` glyph. 311 unit green; build clean.

## Round 8 — Journal thesis readability: previews, white-card popups, a Read/Breakdown view (2026-06-29, PLAN ONLY)

> Founder follow-up (Journal screenshots): on the LIST, long thesis text isn't limited consistently (long
> unbroken strings overflow); the thesis DETAIL popup has no length handling and no clean reading view; and the
> popups should be **closable with an X**, **look like the white portfolio cards**, and offer a **"Read"** button
> (next to "Edit") that opens a separate **Breakdown** popup to read the full thesis comfortably. Grounded
> first-hand via a 3-agent read-only mapping (list excerpt, detail overlay, app popup/close patterns + length cap).
> **Plan only — build on founder "go".**

**Decisions locked via AskUserQuestion (2026-06-29):**
1. **Read/Breakdown popup = the FULL breakdown** — "Why you bought it" + "What would change your mind" + the three
   Manual research findings (dilution / real volume / real yield), read-only.
2. **"Read" button = always shown** next to "Edit" (not only-when-long).
3. **Close = replace the back-arrow with an X (top-right)** on the Journal thesis popups.
4. **List cards = 2-line preview, equal height** (+ fix long-string wrapping).

**Gap checked (no work needed):** thesis text is **already capped server-side at 2000 chars per field**
(`firestore.rules` `validJournal`/`validFunnel`, lines 259-279: `thesis`/`changeMyMind`/`funnel.{dilution,volume,
yield}` each `.size() <= 2000`). So the garbled long strings are a **display** bug only — no storage-abuse hole,
no rule change. *(Optional future nicety: a client char-counter on the textareas — out of scope unless asked.)*

**Grounded current state:** the detail is a **full-screen `.ci-app.overlay`** (slide-up, max-width 430, back-arrow
top-left, NO X — `Journal.jsx:73-77`); read display `.j-read` (`app.css:177`) is `white-space:pre-wrap` but has
**no `overflow-wrap`** → no-space strings overflow horizontally; the list `.j-excerpt` (`app.css:171`) is 2-line
clamp + `overflow:hidden` but **no `overflow-wrap`** → long strings clip oddly; there is **no reusable X glyph**
(only `Ic.back` in `ui.jsx:9`); the white-card chrome to match = `.value-card`/`.asset-card`/`.card`
(`--paper-2`/`--line-2`/`--radius`/`--sh-sm`).

- **R8-1 — list preview consistency.** `.j-excerpt` (`app.css:171`): add `overflow-wrap:anywhere; word-break:
  break-word` so long unbroken strings wrap (keep `-webkit-line-clamp:2`), and reserve a **2-line min-height**
  (`min-height:calc(2 * 1.5em)` ≈ 39px at 13px/1.5) so all `.j-entry` cards align in the grid regardless of text
  length. Design-only, token-based. *(`excerptOf()` already returns one field's text; the CSS does the limiting —
  no JS change.)*

- **R8-2 — detail popup: wrap text + white cards + X + "Read" button.**
  - **Wrap:** add `overflow-wrap:anywhere` to `.j-read` (`app.css:177`) so long strings don't overflow the popup.
  - **White cards:** wrap each read block (`.journal-q` Why / change-my-mind, and the Manual-findings section)
    in the **white-card chrome** (`--paper-2`/`--line-2`/`--radius`/`--sh-sm`) so the popup "looks like the
    portfolio cards" (the overlay page bg stays `--paper`; the content sits in white cards). Add a `.j-card` (or
    reuse `.card`) wrapper — KISS: prefer reusing `.card`.
  - **X close (replace arrow):** drop the `.back-btn` from this overlay's `.overlay-head` and add an **X button
    top-right** — new `Ic.close` glyph in `ui.jsx` (`<path d="M18 6 6 18M6 6l12 12"/>`, `stroke=currentColor`) +
    a `.ov-close` button reusing the `.back-btn` circle look, absolutely positioned top-right. **Scoped to the
    Journal thesis overlays** (detail + Read popup + the Add-thesis edit overlay) — do NOT mutate the shared
    `.overlay-head`/`.back-btn` (the Search "before you add" buy-journal overlay keeps its back-arrow; flag for
    optional later unification).
  - **"Read" button:** add an always-visible **Read** pill next to the existing **Edit** pill (`j-edit-btn`,
    `Journal.jsx:110`) → opens R8-3. New `j-read-btn` styled like `j-edit-btn` (ghost/neutral variant so Edit
    stays the accent action). *(Read is in the read view only, not edit mode.)*

- **R8-3 — new Read / "Breakdown" popup (read-only, full).** A separate `.ci-app.overlay` (reuse the slide-up
  infra) opened from the Read button, X-close top-right, that renders the FULL thesis read-only in white cards:
  **Why you bought it** · **What would change your mind** · **Manual research findings** (dilution / real volume
  / real yield — show only fields with content; "—" if a whole section is empty), each `white-space:pre-wrap;
  overflow-wrap:anywhere` so everything is readable however long. Header = coin name + "Thesis written {date} ·
  {price}" (reuse `.bj-coin-head`). New local state (e.g. `reading`) in `JournalDetail`, or a small
  `ThesisBreakdown` component. No data/handler change — pure read of `coin.journal`.

- **Out of scope / unchanged:** edit mode (textareas + Save/Cancel) is untouched; the funnel **editor** in the
  detail stays inline-editable (Read popup is the read-only mirror); Search buy-journal + Account overlays keep
  their back-arrow; server rules unchanged (cap already in place).

**TDD / verify:**
- **R8-2/R8-3** (jsdom-testable): render `JournalDetail` for a coin with a long thesis → assert the **Read**
  button shows; click Read → the Breakdown popup renders the thesis + change-my-mind + funnel text; the **X**
  closes both the Breakdown and the detail overlay. Update any existing Journal test/walkthrough that asserts the
  back-arrow on the detail (now an X). Add a coin with empty funnel → Breakdown shows the two answers + "—" findings.
- **R8-1** (CSS, not jsdom-meaningful): browser-verify the list at ~375 (1-up) and ~1040 (multi-up) — a pasted
  no-space string wraps inside the card, all cards equal height; light + dark.
- **Verify the white-card look + X** in the detail + Breakdown popups, light + dark, mobile + desktop. Zero new
  dark rules expected (all token-based) — confirm light unchanged.
- **Gate:** `npm run test:unit` green + `npm run build` clean + browser-verify.

**Build order (when "go"):** R8-1 (list CSS) → R8-2 (detail: wrap + white cards + X + Read button) → R8-3
(Breakdown popup). Commit per item. Slotted into [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

**Status:** ✅ **BUILT 2026-06-30** (commit `c2e2079`). Full breakdown · always-show Read · X replaces arrow ·
2-line equal-height. Length cap already enforced (no security work). Zero new dark rules; light unchanged. New
shared `Ic.close`; new `ThesisBreakdown` component. Tests: Read opens the Breakdown (thesis/change-my-mind/funnel),
X closes the detail. 311 unit green; build clean.

## Round 9 — login polish · Research card heights · in-tab portfolio popup (2026-06-29, PLAN ONLY)

> Three founder follow-ups (login screenshot + Research Coins screenshot + Portfolio header). Grounded first-hand
> via a 3-agent read-only mapping (login as-built, Research coins grid sizing, portfolio switcher + add flow).
> **Plan only — build on founder "go".**

**Decisions locked via AskUserQuestion (2026-06-29):**
1. **Login** — do all three: active toggle → **white pill**; **align the Forgot-password screen** to the app
   design; **dark-safe error box**.
2. **Portfolio popup** = a **centered card dialog** (not the bottom-sheet) with an X close.

- **R9-1 — login alignment to the screenshot / app design.** The login already uses the shared `.field-input` /
  `.btn-primary` / Fraunces logo; three gaps remain (mapping verdict):
  - **(a) Active toggle → white pill.** `.auth-toggle button.on` (`app.css:407`) is currently
    `background:var(--ink); color:var(--paper)` → a **near-black** active pill (light mode), which does NOT match
    the screenshot's white pill. Align `.auth-toggle` to the app's `.seg` pattern (`app.css:376-379`): track
    `background:var(--paper-3)` + small inset padding; active `.on` button → `background:var(--paper-2);
    color:var(--ink); box-shadow:var(--sh-sm)` (white pill, dark text, subtle lift); inactive stays
    `--paper-3`/`--ink-faint`. Token-based → dark-safe (active becomes a dark-panel pill in dark, the app standard;
    no new dark rule). *(This intentionally changes BOTH modes to the unified seg look — not a dark-only fix.)*
  - **(b) Forgot-password screen → app design.** `ForgotPass.jsx` is currently **one-off inline styles** (doesn't
    match the auth design). Restyle it to reuse `.auth-wrap` / `.auth-logo` / `.auth-tagline` / `.field-input` /
    `.btn-primary` / `.auth-link` like `Login.jsx` (design-only; keep its reset-email handler/logic untouched).
  - **(c) Dark-safe error box.** `.auth-err` (`app.css:410`) hardcodes `background:#fdecea` (light red) with no
    dark override → red-on-light-red in dark. Add a **dark-block-only** rule: `html[data-theme="dark"] .ci-app
    .auth-err { background:var(--sr-s) }` (red tint that flips). Keep the inline `#FF3B30` text colour
    (`Login.jsx:143`, **test-locked**) — readable on the dark tint. *(Optional same-batch: add `.consent-row a`
    to the dark accent flip → `--accent-ink`, for consistency with other links.)*

- **R9-2 — Research "Coins" cards equal height.** Root cause (mapping): `.research-root .coins-grid`
  (`research-tab.css:144`) uses `align-items:start` and `.coin-card` (`:146`) has no `height:100%` → cards size to
  their own content, so a card with more reason chips + a catalyst row + a longer narrative (e.g. card 3) is taller
  than its row-mates. Fix (scoped `.research-root`, design-only, dark-safe): `.coins-grid { align-items:stretch }`
  + `.coin-card { height:100%; display:flex; flex-direction:column }` (optionally `.cc-detail { flex:1 }`) so every
  card in a row matches the tallest. No-op on mobile 1-up; fixes the desktop multi-up row. No colour/logic change.

- **R9-3 — in-tab "name your portfolio" popup (centered dialog + X), Pro/Premium.** Today the **"+"** pill in the
  portfolio switcher (`PortfolioBar.jsx:15`, `.port-pill-add`) does `setScreen("account")` (jumps to Settings) and
  only shows when `portfolios.length < maxPortfolios` (free 1 / pro 3 / premium 15 — so free never sees it, matching
  "when I have Pro or Premium"). Change the "+" to open a **centered white card dialog** instead:
  - **Dialog:** a NEW centered modal (the founder chose centered, not the bottom-sheet) — full-screen dimmed
    backdrop (`rgba(0,0,0,.5)`, `display:grid; place-items:center`) + a white card `.cm-card`
    (`background:var(--paper-2); border-radius:var(--radius); box-shadow:var(--sh-lg); padding:22px; max-width:360px;
    position:relative`) with: title "New portfolio", a `.field-input` name field, a Save button (`.btn-primary`),
    and an **X** close top-right. New minimal CSS `.cm-scrim`/`.cm-card` (token-based → dark-safe).
  - **X glyph:** add `Ic.close` to `ui.jsx` (`<path d="M18 6 6 18M6 6l12 12"/>`, `stroke=currentColor`) + a
    circular close button — **shared with Round 8** (whichever round builds first adds `Ic.close` + the close
    button; the other reuses it).
  - **Wiring:** new state (e.g. `showPortModal`) in `CryptoIdea.jsx`, threaded to `PortfolioBar` via ctx; Save
    calls the existing **`addPortfolio`** (`CryptoIdea.jsx:398`) which already validates the name and surfaces the
    plan-limit toast via `apiErrorMessage` (B-PORT) — on success it adds + switches to the new portfolio; then
    close the dialog. **No data-layer / rules change** (the cap is already enforced server-side).
  - **Keep Settings unchanged:** Account → Portfolios still does add/rename/delete (founder: "keep the portfolio
    settings the same"). The dialog is an additive fast path on the Portfolio tab.

- **Out of scope / unchanged:** login fields/logo/button (already match); Research card CONTENT + expand behaviour
  (only the grid/card height boxing changes); Account Portfolios management; server rules.

**TDD / verify:**
- **R9-3** (jsdom-testable): with `isPro` + portfolios < max, the "+" renders → click opens the dialog (assert
  title + name field); type a name + Save → `addPortfolio` runs, dialog closes; X closes the dialog. Update any
  `PortfolioBar` test that asserted "+ → account".
- **R9-1(a/b)** (mostly CSS/structural): browser-verify the white active pill (light + dark) and the restyled
  Forgot-password screen; keep the test-locked `#FF3B30` inline. **R9-1(c)** dark-block → browser-verify the error
  box in dark. **R9-2** (CSS): browser-verify equal-height cards at ~1040 (multi-up), light + dark.
- **Gate:** `npm run test:unit` green + `npm run build` clean + browser-verify (mobile + desktop, light + dark).
  Confirm light mode unchanged except the intended toggle/forgot-pass/dialog changes; only one new dark rule (R9-1c).

**Build order (when "go"):** R9-2 (grid CSS, trivial) → R9-1a (toggle) → R9-1c (error dark) → R9-1b (forgot-pass
restyle) → R9-3 (portfolio dialog — biggest; new state + `Ic.close` + tests). Commit per item. Slotted into
[`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

**Status:** ✅ **BUILT 2026-06-30** (commit `1389418`). White toggle pill · aligned Forgot-password · dark-safe
error · equal-height Research cards · centered portfolio dialog with X. One new dark rule (R9-1c); light otherwise
unchanged. `addPortfolio` now returns a success bool (dialog closes on success); shared `Ic.close` reused from
Round 8. Verified via computed-style probe (toggle `.on` flips to the dark-panel pill in dark; `.auth-err` →
`--sr-s`; `.coins-grid` stretch + `.coin-card` flex-column). Tests: PortfolioBar dialog open/save/close; Login
toggle + ForgotPass nav still green. 311 unit green; build clean.

## Round 10 — full-window paper background · positive-only Buy/Sell amounts (2026-06-30, PLAN ONLY)

> Two founder follow-ups from the Add-transaction screenshot: (1) the page background should cover the whole
> screen (mobile + desktop); (2) entering `-1` (or `-`) in a Buy/Sell amount must be blocked with a clear
> message — today it slips through and surfaces the WRONG error. Grounded first-hand in the code below.
> **Decisions locked via AskUserQuestion (2026-06-30):** (A) extend the **paper** background to the whole
> window, both modes; (B) **both** — block typing negatives AND show a clear positive-only error on submit, for
> Amount **and** Price. **Plan only — build on founder "go".**

- **R10-1 — full-window paper background (both modes).** Root cause: the user app's outer chrome is **white**,
  not paper. The body + the centered `maxWidth:1040` provider wrapper (`CryptoIdea.jsx:623`,
  `background:"var(--app-bg)"`) use `--app-bg` (= `#ffffff` light / `#0f0e0c` dark), while each screen's
  `.ci-app.screen-bg` paints `--paper` (`#f8f7f3` / `#14130f`) only within its own box — so white frames the
  paper on wide desktop (beyond 1040) and can peek at the bottom (the wrapper's `paddingBottom` sits below the
  paper). **Note the wrapper is OUTSIDE `.ci-app`, so `var(--paper)` won't resolve on it** — the clean fix is to
  redefine the already-flipping `--app-bg` token to the paper tone: `app.css` `:root { --app-bg:#ffffff }` →
  `#f8f7f3`, and `html[data-theme="dark"] { --app-bg:#0f0e0c }` → `#14130f` (= `--paper` dark). That makes the
  body + the 1040 wrapper + the maintenance screen all paper, seamless edge-to-edge, both modes, with one
  two-line change. (This INTENTIONALLY changes light too — it's the requested visible change, not a dark-only
  fix.) The floating nav pill stays `--paper-2` (distinct from paper); screens already match → no seams. Verify
  no element relied on the white frame for separation (none expected — every screen is paper).

- **R10-2 — positive-numbers-only in Buy/Sell (functional fix + the misleading error).** Root cause
  (**confirmed, same class as B-PORT**): `AddEntry.jsx:65,70` Amount/Price are `type="number" step="any"` with
  **no `min` and no client validation**; `addEntry` (`CryptoIdea.jsx:500`) only guards `!eAmt||!ePrice`, so
  `-1` passes. `firestore.rules` rejects it (`data.amount > 0`, line 299; `priceAtBuy >= 0`, line 302) →
  `permission-denied` → `apiErrorMessage(res, …, limitMsg)` maps it to **"You've reached this coin's transaction
  limit — upgrade for more."** (the screenshot). Fix (decision = both):
  - **R10-2a (block typing):** Amount + Price inputs — strip `-` on input and add `min="0"` +
    `inputMode="decimal"`, e.g. `onChange={e=>setEAmt(e.target.value.replace(/-/g,""))}` (same idea as the
    register name-field filter). Prevents `-`/negatives ever being entered.
  - **R10-2b (submit validation, the real fix):** in `addEntry`, right after `if(!eAmt||!ePrice)return;` and
    **before** the tx-limit check (line 502, so order surfaces the right message), add
    `const amt=parseFloat(eAmt), prc=parseFloat(ePrice);` → `if(!(amt>0)){showErr("Amount must be a positive
    number.");return}` `if(!(prc>0)){showErr("Price must be a positive number.");return}`. Catches
    negative/zero/NaN with a clear message *before* the doomed write, so the misleading "transaction limit"
    error never shows for bad input. (`amt>0` matches the rule; `prc>0` is stricter than the rule's `>=0` —
    acceptable per "only positive". If a $0 price should ever be allowed, use `prc>=0`.)
  - Optional belt-and-suspenders: also disable submit when `parseFloat(eAmt)<=0 || parseFloat(ePrice)<=0`.

**TDD / verify:** AddEntry test — typing `-1` strips to `1`; submitting a negative/zero shows "… must be a
positive number" and `addEntry`/`dbAddTransaction` is NOT called; a valid positive still saves. (`AddEntry.test.jsx`
exists.) Browser-verify: the paper background covers the whole window at ~390 and ~1280, light + dark; entering
`-1` shows the positive-only message, not "transaction limit". `npm run test:unit` green + `npm run build` clean.

**Build order (when "go"):** R10-2 (the bug — higher value) → R10-1 (background). Commit per item. Slotted into
[`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

**Status:** ✅ **BUILT 2026-06-30** (R10-2 `9246fda` · R10-1 `cd1922b`). Full paper window both modes ·
block-typing + clear submit error for Amount & Price. R10-2 was functional (the misleading error was the B-PORT
permission-denied mislabel class). As-built: R10-1 redefined the `--app-bg` token to the paper tone **+ added a
base `body { background:var(--app-bg) }`** (light had no body-bg rule, so white showed beyond 1040 in light);
verified via probe (body + 1040 wrapper = paper, light `rgb(248,247,243)` / dark `rgb(20,19,15)`). R10-2 strips
`-` on input + validates `amt>0`/`prc>0` before the write. 312 unit green; build clean; no console errors.

## Round 11 — dark-mode account/transaction text visibility · Learn quiz Submit rework (2026-06-30, PLAN ONLY)

> Founder screenshots: (design) in dark mode the Account settings values (`Starter`/`Pro`/`Premium`, `1/1`),
> Plan & billing labels, transaction `$`/`Cost` text, and add-transaction text are too dim to read; (error
> fix) the Learn lesson quiz auto-reveals the correct answer the instant you tap ANY option, has no Submit
> button, and closes via a back-arrow/Close button instead of an X. Grounded first-hand below.
> **Decisions locked via AskUserQuestion (2026-06-30):** (1) **lift dim text, keep hierarchy** — named values
> go fully white-in-dark / black-in-light; other secondary text is brightened to clearly readable in dark but
> stays a touch softer than primary; (2) quiz = **pick freely → Submit → correct = green + complete, wrong =
> red + constructive hint with retry** (stays quiz-gated — only a correct answer completes). **Plan only —
> build on founder "go".**

**Grounded current state:** `.sr-value` (`app.css:514`, the tier + `1/1` values on the Account home) =
`var(--ink-faint)` → dim in BOTH modes. Settings secondary text is dim in dark: `.usage-k`(470,`--ink-soft`),
`.usage-note`(472,`--ink-faint`), `.acct-label`(488,`--ink-faint`), `.acct-current`(489), `.priv-text`(533),
`.priv-confirm`(539), `.priv-msg`(540), `.toggle-hint`(495), `.pr-sub`(529). Transactions: `.tx-rprice`
(355,`--ink-soft`, the `$` amount) + `.tx-rcost`(356,`--ink-faint`, `Cost …`). Add-transaction: `.field-label`
(363,`--ink-soft`), inactive `.seg-btn`(377,`--ink-faint`), `.tx-total-label`(390) — the input *values* are
already `--ink` (white in dark). *(NB the screenshot's `-1` + "transaction limit" error is already fixed by
Round 10 — R11 only adds the dark-text readability for that screen.)*

- **R11-1 — Account values white-in-dark / black-in-light (BOTH modes).** `.sr-value` `var(--ink-faint)` →
  `var(--ink)` so the tier (`Starter`/`Pro`/`Premium`) and the Portfolios `1/1` read clearly: near-white in
  dark, near-black in light. This is the one item the founder explicitly wanted in both modes.

- **R11-2 — transaction row text readable in dark (dark-block).** `html[data-theme="dark"] .ci-app .tx-rprice`
  → `var(--ink)` (the `$` amount = primary value, full white); `.tx-rcost` → `var(--ink-soft)` (the `Cost …`
  line = secondary, readable but a touch softer — keeps hierarchy per decision 1). Light untouched.

- **R11-3 — account + form secondary-text readability lift (dark-block).** One dark-block group brightening
  the genuinely-dim `--ink-faint` text to `--ink-soft` (clearly readable on dark paper, ~6:1, still softer than
  the white primary text → hierarchy kept): `.usage-note`, `.acct-label`, `.acct-current`, `.priv-text`,
  `.priv-confirm`, `.priv-msg`, `.toggle-hint`, `.pr-sub`, and the inactive `.seg-btn` (the dim Buy/Sell tab).
  `.usage-k` (already `--ink-soft`) stays. Light mode byte-for-byte unchanged. *(These classes are
  account/form-specific, so lifting them globally in dark effectively scopes to settings + the tx form.)*

- **R11-Q — Learn quiz: select → Submit → feedback (FUNCTIONAL fix).** Rework `LessonOverlay`
  (`Learn.jsx:47-92`). Today `choose(i)` calls `setAnswered(true)` on ANY tap → auto-reveals the correct
  answer, and the footer is a back-arrow + "Close"/"Done" button. New flow (decision 2):
  - **Select only:** clicking an option just sets `picked` (a NEUTRAL `.quiz-opt.selected` highlight — new
    class, e.g. `border-color:var(--accent)` / `--accent-soft` bg); no correct-reveal, no completion. Re-picking
    clears any previous result.
  - **Always-on Submit:** a `.btn-primary` "Submit" shown every time the card opens (disabled until `picked
    != null`). On click: `picked === correct` → green result banner + `onComplete(lesson.id)`; else → red
    banner + a constructive hint ("Not quite — re-read **The key insight** above, then pick again and submit.")
    and stay open for a retry (selection editable). Lesson completes ONLY on a correct submit (quiz-gating #25
    preserved). After a correct submit, the button becomes "Done →" (closes).
  - **Result banners:** new `.quiz-result.ok` (green: `--sg-s`/`--sg`) and `.quiz-result.bad` (red:
    `--sr-s`/`--sr`) — token-based → dark-safe, no new dark rule.
  - **X-close:** replace the overlay back-arrow with an **X** top-right — reuse the shared `Ic.close` +
    `.ov-close` from Round 8 (don't mutate the shared `.overlay-head`/`.back-btn`). Drop the old footer "Close".
  - A re-opened completed lesson starts fresh (picked=null) so Submit always works; a correct re-submit just
    re-greens it. No data/handler change beyond the existing `onComplete`.

**TDD / verify:** **R11-Q** (jsdom): tapping an option does NOT reveal the correct answer or call `onComplete`;
Submit with a wrong pick → red hint + `onComplete` NOT called + you can re-pick; Submit with the correct pick →
green + `onComplete(lessonId)`; the X closes the overlay (update Learn.test.jsx + any walkthrough/quiz assertion
that relied on tap-to-complete). **R11-1/2/3** (CSS, not jsdom-meaningful) → computed-style probe (light +
dark): `.sr-value` = `--ink` both modes; `.tx-rprice` white / `.tx-rcost` soft in dark; the lifted secondary
text reads clearly in dark; light unchanged outside R11-1. `npm run test:unit` green + `npm run build` clean +
browser-verify mobile + desktop, light + dark.

**Build order (when "go"):** R11-1 → R11-2 → R11-3 (design CSS) → R11-Q (quiz rework — biggest; new state +
`Ic.close` reuse + result banners + tests). Commit per item. Slotted into [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

**Status:** ✅ **BUILT 2026-07-01** — decisions locked (lift-dim-keep-hierarchy · quiz Submit with
retry-until-correct). R11-Q is functional. R11-2/R11-3 dark-block-only; R11-1 both modes; zero new dark rules in
R11-Q (token banners). Build on founder "go".

---

## Round 12 — delete-coin confirm no longer leaks across navigation · auto-disarm the "Remove" pill (2026-07-01, PLAN ONLY)

> Founder screenshot + first-hand repro: add a coin that has **no** transactions → open it → tap delete → the
> "Remove" confirm arms → **leave it** (don't confirm/cancel), tap **+ Buy** and add a transaction → returning
> to the coin, the full **"Delete {coin}? This coin has 1 buy/sell transaction and your saved thesis…"** warning
> modal appears *on its own*. The founder's ask, verbatim: *"I only need to see it if I press on delete"* and
> *"if I press once on delete when there's no [transactions] in the coin holdings, then after ~3 seconds it goes
> [back] to the first step of delete."*
> **This is an error fix (behavioural), not a look change — tracked as a bug in [`ERRORS.md`](ERRORS.md) §A3 and
> specced here** because it's a founder follow-on round. Plan only — build on founder "go".

**Grounded current state:** `confirmDel` is **app-level** state (`CryptoIdea.jsx:129`, exposed via context at
`:616`), consumed only by `Detail.jsx` — the trash arm (`:28`), the inline "Remove" pill for a no-transaction
coin (`:29`), and the transaction-warning modal guard `confirmDel && coin.entries.length>0` (`:88`). It resets
only on the **back button** (`:23`) and on delete/cancel. The **"+ Buy"/"- Sell"** buttons call `startAddTx`
(`CryptoIdea.jsx:497`) which navigates to Add-transaction **without** clearing it; ditto the tx-row edit tap
(`:69`) and any bottom-nav tab switch. So the armed flag survives the trip, and on return — now that a
transaction exists — the modal auto-renders. One shared app-level flag = every navigation path leaks.

- **R12-1 — scope the delete-confirm flag to the Detail screen (primary fix, structural).** Move
  `confirmDel`/`setConfirmDel` out of `CryptoIdea.jsx`'s context into a local `useState` **inside** `Detail.jsx`.
  Detail unmounts whenever you navigate away (Add-transaction, back to Portfolio, a tab switch), so the armed
  state clears automatically and the prompt can only appear when you actively press the trash on *this* visit.
  This closes **all** leak paths at once (KISS) — no per-handler `setConfirmDel(false)` sprinkled through
  `startAddTx` + every future nav path (that whack-a-mole is the rejected alternative). Remove it from the `ctx`
  object (`:616`) and the `:129` `useState`; the back-button handler (`Detail.jsx:23`) keeps its own local reset
  (harmless / explicit). `confirmDel` is used nowhere outside Detail (grep-confirmed), so this is a safe lift-down.

- **R12-2 — auto-disarm the inline "Remove" pill after ~3s (UX, the founder's second ask).** When the flag is
  armed on a coin with **no** transactions (the lightweight "Remove" pill, `Detail.jsx:29`), start a **3s** timer;
  on expiry call the local `setConfirmDel(false)` to revert to the idle trash icon = *"the first step of delete."*
  `useEffect` keyed on `[confirmDel, coin.entries.length]`, `clearTimeout` in the cleanup (so it clears on unmount,
  on a manual Remove/re-tap, or when a transaction appears). **Scope: the inline pill only** — the
  transaction-warning **modal** (entries>0) is a deliberate blocking dialog with an explicit **Cancel**; a
  destructive-data warning should not silently vanish, and with R12-1 it no longer appears unbidden anyway.

**Assumed defaults (founder can veto on "go"):** (a) timeout = **3s** (founder said "maybe 3 seconds"); (b)
auto-disarm applies to the **inline "Remove" pill only**, not the transaction warning modal; (c) fixed via
**Detail-local state** (structural), not per-handler resets. All grounded in the repro + the founder's wording.

**TDD / verify:** `tests/unit/Detail.test.jsx` currently **injects** `confirmDel` through the context provider
(lines 12/66/75/85/93/101) — rework those to drive it via the **trash button** (click trash → assert the "Remove"
pill for a no-tx coin / the warning modal for a coin with tx), since it's no longer an injectable prop. Add: (1)
a leak test — arm delete on a no-tx coin, simulate navigating away + back (unmount → remount Detail), assert the
prompt is gone; (2) an auto-disarm test — fake timers, arm on a no-tx coin, advance ~3s, assert it reverts to the
trash icon; (3) the modal still shows for a coin with transactions and Cancel/Delete-anyway still work. Also
update `CryptoIdea.smoke`/walkthrough if any assertion reads `confirmDel` from ctx. `npm run test:unit` green +
`npm run build` clean + browser-verify the exact repro (mobile + desktop, light + dark).

**Build order (when "go"):** R12-1 (scope to local state + fix the tests) → R12-2 (3s auto-disarm). Commit per
item. Slotted into [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP; bug catalogued in [`ERRORS.md`](ERRORS.md) §A3.

**Status:** ✅ **BUILT 2026-07-01** — behavioural/error fix. No design tokens or dark rules touched (pure
state-scope + a timer). Defaults assumed above; build on founder "go".

---

## Round 13 — header uniformity · sub-title cleanup · disclaimer visibility · Research Risk simplification · Learn header frame (2026-07-01, PLAN ONLY)

> Founder screenshots + notes: (1) the legal disclaimer at the foot of each tab is too faint in **light** mode;
> (2) the Research "Portfolio Risk" card's source chips (*Your holdings · Live prices · Market trends*) + the
> *● Updated just now* freshness line are clutter — remove for a cleaner UX; (3) the descriptive **sub-title**
> under each tab's main heading is "too much information" — remove it on every tab (even Search); (4) the Search
> **trending** add button should read **"+ Add"** like the search-results list; (5) the five tab **headings**
> (Portfolio / Research / Journal / Learn / Search) are different sizes — make them one size + font; (6) the
> **Learn** header's tags/avatar don't line up like the other tabs, and its XP-progress card should get the
> **Portfolio value-card gradient border**; (7) Journal's empty state reads *"No theses yet"* — founder wants
> *"No thesis yet"*.
> **Decisions locked via AskUserQuestion (2026-07-01):** (Q1) disclaimer → **readable muted** (`--ink-soft`),
> light mode, every screen; (Q2) remove the **three** descriptive sub-lines (Research/Journal/Search), **keep**
> Learn's "LEVEL · rank" eyebrow; (Q3) unify all headings to **28px**; (Q4) fix the **Learn header only** (avatar
> + tags alignment) — **not** the Account screen. Design-only + one copy fix. **Plan only — build on founder "go".**

**Grounded current state:** headings are `.ci-app .apphead .title` 28px (Portfolio, `app.css:146`) ·
`.research-root .apphead .title` **29px** (`research-tab.css:27`) · Journal + Search inline `fontSize:24`
(`Journal.jsx:298`, `Search.jsx:52`) · Learn `.learn-title` **22px** (`app.css:238`) — all already
`var(--display)` weight 500, only the size differs. Sub-lines: Research `.sub` "AI insights across your N
holdings" (`ResearchTab.jsx:56`), Journal "Write before you buy." (`Journal.jsx:299`), Search "Find any coin…"
(`Search.jsx:53`); Portfolio has none; Learn has the `.learn-level` eyebrow ABOVE the title (`Learn.jsx:107`, kept).
Disclaimer `.disclaimer` = `var(--ink-faint)` in light (`app.css:168`, `research-tab.css:228`); dark already
`--ink-soft` (Round 6, `app.css:113` / `research-tab.css:281`). Risk-card clutter = the `.sources` block
(`OverviewView.jsx:57-66`: three `.src-chip`s + the `.fresh` "Updated just now"). Search trending button label
`"Add"` (`Search.jsx:99`) vs results `"+ Add"` (`Search.jsx:74`). The account **avatar** is a shell-level float
`.ci-app .app-avatar` (`position:absolute; top:14px; right:18px`, `app.css:156`) — on other tabs it floats over a
plain `.apphead`; on Learn it floats over the bordered `.learn-hero` **card** (`app.css:236`), hence the
misalignment. Learn's XP card `.learn-hero` uses a plain `border:1px solid var(--line)`; Portfolio's `.value-card`
(`app.css:288`) uses the single-element gradient frame (`border:1px transparent` + `linear-gradient(--paper-2)
padding-box, linear-gradient(135deg, rgba(10,107,77,.38), rgba(63,125,240,.32)) border-box` + `--sh` + `--radius`).

- **R13-1 — disclaimer readable in light mode (every screen).** `.disclaimer` `var(--ink-faint)` → `var(--ink-soft)`
  in **both** `app.css:168` and `research-tab.css:228`. Because `--ink-soft` is a flipping token, this reads as the
  right muted tone in both modes, so the now-redundant dark-block overrides (`app.css:113`, `research-tab.css:281`)
  can be **removed** (base == override). Covers Portfolio, Learn ×2, Journal ×2, Research disclaimers. Visible but
  still secondary/legal (Q1). *(NB "white" would be invisible on paper — interpreted as "more visible".)*

- **R13-2 — remove the descriptive sub-titles (Research / Journal / Search).** Delete the `.sub` line in
  `ResearchTab.jsx:56-58`, the inline "Write before you buy." block in `Journal.jsx:299-301`, and the inline
  "Find any coin…" block in `Search.jsx:53`. Portfolio has none; **Learn keeps** its `.learn-level` eyebrow (Q2).
  The now-unused `.research-root .apphead .sub` rule (`research-tab.css:35`) may be left (harmless) or pruned.

- **R13-3 — Research "Portfolio Risk": drop the source chips + freshness line.** Remove the whole `.sources` block
  (`OverviewView.jsx:57-66`) — the three `.src-chip`s and the `.fresh` "● Updated just now". Then **prune the now-dead
  locals** it fed (`freshness`/`failed`/`rel`/`tail`, ~`OverviewView.jsx:36-41`) and drop the `asOf`/`status` props
  from the `OverviewView` signature + the `ResearchTab.jsx:72` call **iff** nothing else consumes them (verify first —
  no dead code left). The Allocation bar + Risk meter remain; the unused `.sources/.src-chip/.fresh` CSS may be left
  or pruned.

- **R13-4 — Search trending button "Add" → "+ Add".** `Search.jsx:99` `{ad ? "Added" : "Add"}` → `{ad ? "Added" :
  "+ Add"}`, matching the results row (`:74`). Trivial.

- **R13-5 — one heading size (28px) across all five tabs.** Research `.research-root .apphead .title` 29px → **28px**
  (`research-tab.css:27`); Journal + Search — **remove** the inline `fontSize:24` so they inherit `.ci-app .apphead
  .title` = 28px; Learn handled by R13-6 (its title moves onto the shared `.apphead .title`). Font/weight/letter-
  spacing already shared; only the size changes. Portfolio already 28px.

- **R13-6 — Learn header: standard apphead + gradient-framed XP card (Learn only).** Restructure `Learn.jsx:106-115`
  to the **same pattern as Portfolio** (`apphead → card`): a plain `.ci-app .apphead` row with the title
  **"Your Investing Edge"** (inherits 28px) + `<span className="beta">BETA</span>` + `<HeaderTags/>` — so the
  shell `.app-avatar` floats over a plain header and the tags space exactly like the other tabs. Below it, the
  **XP-progress card** (`.learn-hero`) keeps the **LEVEL · rank eyebrow** + XP bar + XP label + chips, and gets the
  **value-card gradient frame** (copy `app.css:288`'s `border:1px transparent` + double `padding-box/border-box`
  gradient + `box-shadow:var(--sh)` + `border-radius:var(--radius)`), replacing its plain `border`. The title moves
  out of the hero, so `.learn-title` (`app.css:238`) is no longer used for the heading (drop it or repoint). Frame is
  theme-invariant (padding-box uses the flipping `--paper-2`; gradient is fixed rgba) → **zero new dark rules**.
  Text "Your Investing Edge" is preserved (walkthrough/Learn tests stay green).

- **R13-7 — Journal copy fix "No theses yet" → "No thesis yet".** `Journal.jsx:366`. *(NB "theses" is the correct
  plural of thesis; changed to the singular per founder preference for readability.)*

**TDD / verify:** update `tests/unit/CryptoIdea.walkthrough.test.jsx:89` (the "Write before you buy." assertion — that
sub-title is removed); "Your Investing Edge" assertions (walkthrough:99 + `Learn.test.jsx`) **stay** (R13-6 keeps the
text). After R13-4 trending also reads "+ Add" — any Search test rendering the **trending** state must use
`getAllByText("+ Add")` (multiple pills). Add: sub-titles absent (Research/Journal/Search), risk source-chips +
"Updated just now" absent, Journal shows **"No thesis yet"**, trending pill reads "+ Add". CSS via computed-style
probe (light + dark): `.disclaimer` = `--ink-soft` in light on a sample screen; all five headings computed 28px;
`.learn-hero` has a `background-image` (the padding/border-box gradient) + shadow. `npm run test:unit` green +
`npm run build` clean + browser-verify mobile (~390) + desktop (~1040), light + dark.

**Build order (when "go"):** R13-1 (disclaimer) → R13-2 (sub-titles) → R13-3 (Risk chips + dead-code prune) →
R13-4 (+ Add) → R13-5 (heading size) → R13-6 (Learn header restructure + frame) → R13-7 (spelling). Commit per item
(or group the pure-CSS ones). Slotted into [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

**Status:** ✅ **BUILT 2026-07-01** — design + one copy fix; no logic/handlers changed. R13-1 changes light
mode (both `.ci-app` + `.research-root`); R13-6 frame is theme-invariant (zero new dark rules); all others
mode-neutral. Decisions locked (readable-muted · remove-3-keep-eyebrow · 28px · Learn-header-only). Build on
founder "go".

---

## Round 14 — Portfolio Risk = market-cap tiers (allocation-weighted) — FUNCTIONAL (2026-07-01, PLAN ONLY)

> Founder: the Research "Portfolio Risk" meter should be driven by each coin's **market cap**, not by
> concentration. Tiers: **High** = micro-cap `$0–$100M` · **Medium** = mid-cap `$100M–$1B` · **Low** = large-cap
> `$1B–$100B` · **Super-low** = mega-cap `≥ $100B` (BTC, ETH). *("Settings" here = how the meter is calculated —
> it stays a read-only, non-adjustable result, not a user control.)*
> **This is a FUNCTIONAL change to the risk model** (logic, not a look tweak) — kept in the founder-rounds log for
> continuity. **Decisions locked via AskUserQuestion (2026-07-01):** (Q1) **allocation-weighted** aggregate (weight
> each coin's tier by its % of the book); (Q2) market-cap **replaces** the concentration model on the Risk meter —
> concentration stays as its **own** "High concentration" tag on the Allocation bar (unchanged); (Q3) a coin with
> **unknown** market cap → **High**; (Q4) **keep the 3-band meter** (Low / Moderate / High) — the 4 per-coin tiers
> feed a numeric score, Super-low & Low both land in the green band. **Plan only — build on founder "go".**

**Grounded current state:** risk today is **pure concentration** — `deriveRisk(holdings)`
(`src/features/research/utils/portfolio.js:34-43`) returns `{level:'High'|'Elevated'|'Moderate', top, top2,
markerLeft}` from the top-holding %; `RiskMeter.jsx` fills the 20-seg bar from `risk.top` and writes a "top two are
~X%" note; `usePortfolio.js:9` calls it. Market cap is **not** carried into holdings: `buildResearchPrices`
(`utils/priceAdapter.js:47-58`) emits `{price,c24,c7d,c30d,spark}` and `computePortfolio` (`portfolio.js:12-31`)
never reads `usd_market_cap` — even though the upstream `/api/prices` payload **has** `usd_market_cap` (per
CLAUDE.md; used already in `Detail.jsx`). The concentration "High concentration" pill lives on the **AllocationBar**
(separate component) → untouched by this round (Q2). No existing test references the risk model (grep clean) → this
is mostly **TDD-add**, not a rewrite of test expectations.

- **R14-1 — thread market cap into holdings.** `buildResearchPrices` (`priceAdapter.js:55`): add
  `marketCap: live && live.usd_market_cap != null ? Number(live.usd_market_cap) : null`. `computePortfolio`
  (`portfolio.js:15`): carry `marketCap: p.marketCap ?? null` onto each holding. Give `FALLBACK_PRICES`
  (`portfolio.js:3-7`) demo caps so the offline seam isn't all-unknown→High: bitcoin `1.3e12` (super-low),
  ethereum `3.3e11` (super-low), solana `7e10` (low).

- **R14-2 — pure `marketCapTier(marketCap)` + numeric score.** New pure fn → `'superlow'|'low'|'medium'|'high'`:
  `≥1e11 → superlow` · `≥1e9 → low` · `≥1e8 → medium` · else / `null`/`NaN` → **high** (Q3). Companion risk score
  (0 = safest → 1 = riskiest, **tunable**): superlow `0.05` · low `0.30` · medium `0.65` · high `0.95`.

- **R14-3 — rewrite `deriveRisk` to allocation-weighted market-cap risk (Q1/Q2/Q4).** New signature reads each
  holding's `marketCap` + `alloc` (already computed in `computePortfolio`). `score = Σ(alloc_i% × tierScore_i) /
  Σ(alloc_i%)` (allocation-weighted mean; `alloc` sums ~100). Return `{ level, score, breakdown }` where
  `breakdown` = allocation-% per tier `{superlow, low, medium, high}` and the **3-band** `level` (tunable cuts):
  `score < 0.34 → 'Low'` · `< 0.67 → 'Moderate'` · else `'High'`. **Drops** the concentration fields
  (`top`/`top2`/`markerLeft`) from the risk object — concentration stays on the AllocationBar only.

- **R14-4 — RiskMeter reads the new model.** `RiskMeter.jsx`: fill = `clamp(round(risk.score × 20), 1, 20)` (was
  `risk.top/100`). New note from `breakdown` via a small pure `riskNote(breakdown, level)` (unit-testable), in
  market-cap language, e.g. *"Large-caps ($1B+) are {L}% of your book, mid-caps {M}%, micro-caps {H}%. {advice}"* —
  advice: micro > 40% → *"Micro-caps (under $100M) are the highest-risk tier; sizing them down would lower this."*
  · else low score → *"Mostly large-cap, which keeps single-coin risk lower."* · else neutral. Scale labels stay
  **Low / Moderate / High** (Q4); the "isn't adjustable" foot line stays.

- **R14-5 — fix the level-pill colours for the new labels.** `riskColor.js` `levelColor`/`levelTint` currently key
  off `'High'`/`'Elevated'` (else → green) — `'Moderate'` would fall through to green. Update to: `Low` → green ·
  `Moderate` → amber · `High` → red (+ matching tints). *(Optional: `portfolioContext` (AI string) may append the
  tier breakdown; concentration line can stay — low priority, AI is Wave-B/offline.)*

**Model summary (locked):** tiers `<100M High · 100M–1B Medium · 1B–100B Low · ≥100B Super-low` · unknown → High ·
scores `.95/.65/.30/.05` · portfolio = allocation-weighted mean · 3-band pill (`<.34 Low / <.67 Moderate / else
High`). Scores + band cuts are **tunable knobs**, called out so a later founder tweak is a one-line change.

**TDD / verify (add first):** new `tests/unit/research-risk.test.js` — `marketCapTier` boundary cases
(99.9M→high, 100M→medium, 1B→low, 100B→superlow, `null`/`NaN`→high); allocation-weighted aggregate (90% BTC + 10%
micro → 'Low'; 90% micro → 'High'; 50/50 large/mid → 'Moderate'); `riskNote` copy per breakdown. Update
`research-adapters.test.js` for the new `marketCap` field on holdings. Confirm the AllocationBar "High
concentration" tag is **unchanged**. `npm run test:unit` green + `npm run build` clean + browser-verify the meter
(a large-cap-heavy vs a micro-cap-heavy portfolio show green vs red), mobile + desktop, light + dark.

**Build order (when "go"):** R14-1 (data) → R14-2 (tier/score) → R14-3 (deriveRisk) → R14-4 (RiskMeter + note) →
R14-5 (pill colours). Independent of Round 13 (R13-3 removes the Risk card's *source chips*; R14 changes the
*meter+note*) — either order, but note both touch the Research Overview card. Slotted into
[`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

**Status:** ✅ **BUILT 2026-07-01** — **functional** (risk-model logic). Pure-function core (fully testable),
market cap already in the price payload. No new dependency, no rules change (risk is client-derived display).
Decisions locked (weighted · replaces-concentration · unknown→High · 3-band). Build on founder "go".

---

## Round 15 — one popup design: white rounded card for EVERY popup (2026-07-01, PLAN ONLY)

> Founder (Journal thesis Breakdown screenshot): every popup — the Journal "Add thesis" form, the thesis-card
> Read/Breakdown popup, and **all** other popups — should share ONE look: **white background, rounded corners**,
> the same card aesthetic as the app's cards/pills (not a full-bleed paper takeover). "Apply this design to all
> popups." The **already-approved** in-tab "new portfolio" dialog (Round 9 `.cm-card`: centered white card on a
> dimmed scrim, X-close) **is** that look — this round makes it the single popup standard.
> **Decisions locked via AskUserQuestion (2026-07-01):** (a) "white" = the theme-aware card surface
> `var(--paper-2)` (literal `#fff` would break dark mode — dark shows the dark card tone); (b) **responsive shell —
> full-screen sheet on phones, centered card on desktop:** long popups go edge-to-edge on narrow viewports (room to
> type) and become the centered rounded card at the tablet breakpoint and up (ONE deliberate `@media` — the app is
> otherwise media-query-light, justified here); (c) **scrim tap closes read/confirm popups but NOT forms with typed
> input** (prevents accidental data-loss) → a `dismissOnScrim` prop, off for the text-entry forms; (d) the two
> bottom-sheets (delete-coin, upgrade/downgrade) become **centered cards** (all corners rounded); (e) **X-close
> top-right** everywhere (reuse `Ic.close`/`.cm-close`), replacing the remaining back-arrows; (f) scope = every
> popup below; the top **error toast** + full-screen **loading/maintenance** are NOT popups → excluded. **Plan only
> — build on founder "go".**

**Grounded current state — THREE popup patterns today (this round collapses them to one):**
1. **`.ci-app.overlay`** (`app.css:622`) — full-screen **paper** slide-up (`ci-slide-up`), `.overlay-head`
   (back-btn/`.ov-close` + `.overlay-head-title`) + `.overlay-body`. Used by **5** popups: Journal **AddThesis**
   (`Journal.jsx:48`), Journal **Detail** (`:123`), Journal **ThesisBreakdown** (`:229`), **Learn LessonOverlay**
   (`Learn.jsx:62`), **Search Buy-Journal** (`Search.jsx:109`). *(Journal already uses X via `.ov-close`, Round 8;
   Learn + Search still use the `.back-btn` arrow.)*
2. **`.cm-scrim`/`.cm-card`** (`app.css:615-618`) — centered **white** rounded card on a dark scrim, `.cm-close` X,
   `.cm-title`, `box-shadow:var(--sh-lg)`, `background:var(--paper-2)`, `border-radius:var(--radius)`. Used by
   **PortfolioBar new-portfolio** (`PortfolioBar.jsx:34`, Round 9) — **this is the target**.
3. **`.dg-sheet`** — white **bottom-sheet** (rounded top only, inline `position:fixed`, `rgba(0,0,0,.5)` scrim). Used
   by **Detail delete-coin** (`Detail.jsx:89-106`) and **CryptoIdea upgrade/downgrade** (`CryptoIdea.jsx:654+`).
   *(Re-auth is inline in Account — no separate modal. Inventory confirmed complete.)*

- **R15-1 — one shared modal system (foundation).** Promote the `.cm-*` family to the app's single popup, and build a
  small **`<Modal>`** component (props `title`, `onClose`, `size`, `dismissOnScrim`, `children`) wrapping `.cm-scrim`
  > `.cm-card` > (`.cm-head` title + `.cm-close` X) > `.cm-body`. Size variants **`sm`** (~360px, confirms) and
  **`md`** (~440px, forms/lessons); `.cm-body { overflow-y:auto }` with the card capped `max-height:~90vh` so long
  content scrolls inside; sticky `.cm-head`. **Responsive (decision b):** ONE `@media (max-width:560px)` makes
  `.cm-card` a **full-screen sheet** on phones (`inset:0`, `border-radius:0`, no scrim margin, body scrolls) and the
  centered rounded card above that width. **Scrim (decision c):** a click on `.cm-scrim` calls `onClose` only when
  `dismissOnScrim` (default `true`; the text-entry forms — Buy-Journal, AddThesis, edit-thesis, new-portfolio — pass
  `false`). Entrance = `.cm` `ci-fade`/scale (drop `ci-slide-up`). Token-based → **zero new dark rules**.

- **R15-2 — migrate the 5 `.overlay` popups → `<Modal>`.** Journal AddThesis / Detail / ThesisBreakdown, Learn
  LessonOverlay, Search Buy-Journal: swap `.ci-app.overlay`+`.overlay-head`+`.overlay-body` for the shared
  `<Modal size="md">`; keep the inner content classes (`.journal-q`, `.bj-*`, `.lesson-*`, `.quiz-*`). **Reconcile
  white-on-white:** ThesisBreakdown + JournalDetail currently render white inner `.card`s (Round 8) — on a now-white
  popup those lose contrast, so give inner sections a subtle separation (`--paper-3` fill or a `--line` divider) or
  flatten them (the popup IS the card). Replace the Learn/Search **back-arrow** with the X (`.cm-close`).

- **R15-3 — migrate the 2 `.dg-sheet` bottom-sheets → centered cards.** Detail delete-coin modal (`Detail.jsx:89-106`)
  and the upgrade/downgrade modal (`CryptoIdea.jsx:654+`): replace the inline bottom-sheet with `<Modal size="sm">`;
  delete the inline `position:fixed`/`border-radius` styles + the `.dg-sheet` rule. Keep the warning copy (`.dg-warn`)
  + the two action buttons; all-corners rounded, centered. *(Coordinates with Round 12, which scopes the delete-confirm
  STATE — R15 only restyles the modal shell; build either order.)*

- **R15-4 — PortfolioBar adopts `<Modal>`.** It already uses `.cm-card` (the reference) — refactor it onto the shared
  component so there's a single source of truth (no behaviour change).

- **Cleanup:** once nothing references them, retire `.ci-app.overlay` / `.overlay-head` / `.overlay-body` /
  `.back-btn` / `ci-slide-up` / `.dg-sheet` (keep the reused inner-content classes). No dead CSS left.

**TDD / verify:** existing tests assert popup **content + behaviour** ("Delete anyway", "Remove", "write before you
buy", quiz opens, review decision) not the wrapper class → they should stay green after the swap; keep the text +
the close semantics + `role="dialog"`/`aria-modal` on the shared card. Add a `Modal` unit test (renders title,
`Ic.close` calls `onClose`, body scrolls) and update any assertion that queried the old `.overlay`/`.back-btn`
structure. Computed-style probe (light + dark): every popup's card = `--paper-2` bg, `border-radius:var(--radius)`,
`box-shadow:var(--sh-lg)`, centered on the scrim; long popups scroll internally (card height ≤ ~90vh). `npm run
test:unit` green + `npm run build` clean + browser-verify each of the 7 popups + PortfolioBar, mobile (~390) +
desktop (~1040), light + dark.

**Build order (when "go"):** R15-1 (Modal component + CSS) → R15-2 (5 overlays, incl. inner-card contrast) → R15-3
(2 sheets) → R15-4 (PortfolioBar) → cleanup. Commit per group. Slotted into [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

**Status:** ✅ **BUILT 2026-07-01** — design consistency + a shared `<Modal>` (light structural). No logic
change; token-based (zero new dark rules). **Decisions locked (2026-07-01):** theme-aware white ·
full-screen-sheet-on-phone / centered-card-on-desktop · scrim-close-except-text-forms · sheets→centered-cards ·
X-close everywhere. Build on founder "go".

---

## Round 16 — Research "Coins" cards: align the numbers + buttons to the bottom (2026-07-01, PLAN ONLY)

> Founder screenshot (Research → Coins, 3-up): the AVG COST / NOW / P/L / 30D **number row** and the **"Ask AI
> about …" button** sit at different heights across cards in a row, because the content above them varies (e.g.
> Synapse has extra conviction chips — "Founders · no coverage", "Team · anonymous team", "Community · no
> coverage"). "Align them all — especially the bottom of the cards, with the buttons and the numbers."
> **Plan only — build on founder "go".**

**Grounded current state:** the cards are **already equal-height** — `.coins-grid { align-items:stretch }` +
`.coin-card { height:100%; display:flex; flex-direction:column }` (`research-tab.css:154-156`, the R9-2 CSS), and on
desktop the detail is **always expanded** (`@media` at `:181` sets `.cc-detail{max-height:420px}`). But the stats +
button live in `.cc-detail` (`:174`) which is the LAST flex child with **no bottom pin**, so the equal-height slack
falls *below* it → in a shorter-content card the number row + button float mid-card; in a taller one (Synapse) they
sit lower. Same height, misaligned bottoms.

- **R16-1 — pin the stats+button block to the bottom.** Add `margin-top:auto` to `.research-root .cc-detail` so the
  flexible slack collapses ABOVE it, pushing `.pos-stats` (the 4 numbers) + `.cc-ask` (the button) to the bottom of
  every card. Since `.pos-stats` and `.cc-ask` are fixed-height, the number rows align across the row AND the buttons
  align across the row. One line; equal-height is already in place. (Harmless on mobile: 1-up, `.cc-detail` is the
  collapsing accordion — no cross-card row to align.)

**TDD / verify:** CSS-only → computed-style probe (desktop ~1040, a row of ≥2 coins with different conviction-chip
counts): the `.cc-ask` buttons share the same `getBoundingClientRect().bottom` (±1px) and the `.pos-stats` rows share
the same `top`. No JS/test-content change (CoinCard markup untouched). `npm run build` clean + browser-verify the
exact 3-up screenshot case, light + dark, mobile + desktop.

**Build order (when "go"):** R16-1 (one CSS line). Slotted into [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP. *(NB the
Account-settings "Starter/Pro/Premium" + "1/1" darker-in-light ask from the same message is already covered by
**Round 11 R11-1** — `.sr-value` `--ink-faint`→`--ink` — so it is NOT duplicated here.)*

**Status:** ✅ **BUILT 2026-07-01** — CSS-only (one rule), no dark rule, no markup/logic change. Build on "go".

---

## Round 17 — FIX: Pro/Premium can't add a portfolio (tier never reaches the DB) — FUNCTIONAL (2026-07-01, PLAN ONLY)

> Founder: on a Starter account there's no "add portfolio" option (correct — cap 1); on an **upgraded** (Pro/Premium)
> account you CAN try to add one but get *"You've reached your plan's portfolio limit — upgrade for more."* with only
> **1** portfolio. "Create for Pro and Premium the real maximum — maybe it's already in the plans." It **is** in the
> plans (Pro 3 / Premium 15); the bug is the **tier never reaching the database**.
> **This is the ERRORS.md §A1 tier-mismatch (part 2).** **Decision locked via AskUserQuestion (2026-07-01): add a
> dev-only path that persists the tier to the DB locally** (so the in-app upgrade works end-to-end for testing); real
> upgrades still go through PayPal at go-live. **Functional. Plan only — build on founder "go".**

**Grounded root cause (confirmed in code):** the app derives capacity from the **client** tier —
`isPro = user.tier==="pro"||"premium"` (`CryptoIdea.jsx:124`) → `maxPortfolios` (`:393`). A demo "upgrade" sets
`user.tier` and calls `saveProfile` (`:183`) which writes to **localStorage** (`db.set "ci-profile-…"`), NOT
Firestore. So the client thinks it's Pro (cap 3) and lets the add proceed, but `firestore.rules` reads the
**Firestore** `users/{uid}.tier` — still `free` (cap 1; clients are forbidden from writing their own `tier`, by
design) — so `createPortfolio` is denied → `permission-denied` → `apiErrorMessage` shows the plan-limit message.
Genuinely-DB-Pro users are fine (A1 repro: `pro@test.com` adds up to 3). The caps are correct; the **tier isn't
persisted**.

- **R17-1 — dev-only tier-persist path (chosen fix).** Add an **emulator/dev-gated** way to write the caller's
  Firestore `users/{uid}.tier` (e.g. a callable guarded by the emulator/`import.meta.env.DEV` flag, or wire it into
  the existing demo upgrade-success handler `checkSubscriptionStatus`, `CryptoIdea.jsx:572`) so completing an in-app
  upgrade sets the **DB** tier too. Must stay dev-only — **never** a client-writable `tier` in prod (keep the
  `firestore.rules` block intact). After it runs, the rule sees `tier:pro` → the 2nd/3rd portfolio is allowed; the
  UI cap already matches. Re-load reads the persisted tier from the DB (not just localStorage).
- **R17-2 — keep prod correct.** At go-live the PayPal webhook / admin `setUserTier` sets the tier server-side
  (existing path) — the dev path is a local-testing shim only, documented as such. *(Alternative the founder did
  NOT pick: no code, set the tier via the Admin panel / seeded `pro@test.com`.)*
- **R17-3 — honesty polish (optional, small).** If the client tier is ahead of the DB, the "+ Add" affordance can
  read the enforced (DB) cap so the user isn't invited into a denied action (A1's optional UX note).

**TDD / verify:** integration/rules test — a user whose DB tier is set to `pro` (via the dev path) can create a 2nd
+ 3rd portfolio and is blocked at the 4th (`test:rules`/`test:integration`, emulator); the dev path is inert
without the dev/emulator flag. Manually: upgrade in-app → add a 2nd portfolio → succeeds (no error). Confirm the
prod `firestore.rules` still **reject** a client `tier` write (existing rules test stays green). `npm run test:*`
green + build clean.

**Build order (when "go"):** R17-1 (dev tier-persist) → R17-2 (doc the prod path) → R17-3 (optional UX). Update
[`ERRORS.md`](ERRORS.md) §A1 (part 2 now has a chosen fix). Slotted into [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

**Status:** ✅ **BUILT 2026-07-01** — **functional**, unblocks portfolio-add on upgraded accounts. Shipped:
`functions/index.js` `devSetMyTier` callable (emulator-gated: refuses unless `FUNCTIONS_EMULATOR==="true"`;
auth-required; tier ∈ {free,pro,premium}; Admin-SDK writes ONLY the caller's own `users/{uid}.tier`) ·
`src/api/account.js` `devSetMyTier` client wrapper · `src/CryptoIdea.jsx` `persistTierDev(tier)` (gated on
`import.meta.env.DEV` → dead-code-eliminated in prod) wired into the upgrade completion (`Login.jsx` pay handler)
AND the expiry-downgrade (`checkSubscriptionStatus`). **Security kept:** prod refuses (double gate: server
emulator-check + client DEV-check); `firestore.rules` still block client `tier` writes (rules test green); no
IDOR (self-uid only). **Verified:** 319 unit green · `test:rules` **21/21** (new "pro caps at 3, premium beyond"
+ the existing "can't self-promote tier") · build clean (dev path tree-shaken, name-guard clean) · **e2e against
the live emulator**: `free@` → `devSetMyTier('pro')` persisted `tier=pro` to Firestore → a 2nd portfolio (blocked
at free cap 1) created successfully; an invalid tier was rejected. Prod path (PayPal webhook / admin `setUserTier`)
unchanged.

---

## Round 18 — dark-mode border visibility: soft-white edges on cards · pills · popups + the Search separator (2026-07-01, PLAN ONLY)

> Founder screenshots (dark mode): cards, popups, and the neutral pills blend into the dark paper (their borders are
> nearly invisible), and in the Search results the line between coin rows is too faint to separate them. "Create a
> white border to the cards and pills for visibility, and popups. In the Search box when I search a coin, make the
> line white in dark mode only, so I see the separation between the coins."
> **Decisions locked via AskUserQuestion (2026-07-01):** (1) **soft ~16% off-white** border — `rgba(236,233,225,.16)`
> (the palette off-white `#ece9e1` at 16%, not harsh `#fff`); (2) **outer borders of cards/popups + the Search-results
> separator only** — internal row-dividers (holdings/tx/journal-Q rows) stay subtle so cards don't look like tables;
> (3) **neutral/gray pills only** — the already-tinted colored status pills are left alone. **Dark-block-only — light
> mode byte-for-byte unchanged. Plan only — build on founder "go".**

**Grounded current state:** dark `--line-2 = rgba(236,233,225,.08)` (8% → ~invisible) and dark `--line = #2c2a24`
(barely above `--paper-2 #1c1b17`). Card surfaces all border with `--line-2` (`.card` `app.css:161`, `.j-entry`
`:195`, `.nt-row` `:227`, `.module` `:251`, `.asset-card` `:309`, `.coin-card`/`.trend-card`
`research-tab.css:156/351` + app `.trend-card :351`, `.tx-list` `:404`) or `--line` (`.learn-hero` `:236`,
`.today-lesson` `:244`); the `.value-card` (`:288`) already has the green→blue gradient frame (visible → leave it).
Popups: `.cm-card` (`:616`) has **only a shadow, no border**. Search separator: `.trend-item { border-bottom:1px
solid var(--line-2) }` (`:340`). Neutral pills use `--line`/`--line-strong` (`.learn-chip` `:243`, `.port-pill`
`:279`, `.port-pill-add` `:281`, `.pill-ghost` `:358`, `.btn-ghost` `:167`, `.src-chip`/`.tf-pills`/`.seg`
`research-tab.css:121/85/39`). Colored pills (`.badge-*`, `.beta`, `.chg-pill`, `.sentiment`, `.csig`) have tinted
backgrounds → already legible. **Key constraint:** cards, internal dividers, AND the search line all share
`--line-2`, so a token bump would brighten dividers too (violates decision 2) → the fix is **targeted dark-block
overrides**, not a token change.

- **R18-1 — one dark "edge" token + card borders.** In the dark block (`app.css:50-61`) add `--edge:
  rgba(236,233,225,.16)` (one tunable knob). Grouped dark-block rule setting `border-color:var(--edge)` on the card
  surfaces in **both** scopes: `html[data-theme="dark"] .ci-app :is(.card,.j-entry,.nt-row,.module,.asset-card,
  .trend-card,.tx-list,.learn-hero,.today-lesson)` and `html[data-theme="dark"] .research-root
  :is(.card,.coin-card,.trend-card)`. Keeps `1px solid`, only recolours. `.value-card` keeps its gradient frame
  (skip it).
- **R18-2 — popups get a border in dark.** `html[data-theme="dark"] .ci-app .cm-card { border:1px solid var(--edge) }`
  (it currently has none). **Composes with Round 15:** the shared `<Modal>` card must carry this dark border — if
  R15 ships first, add `--edge` to its `.cm-card`; if R18 ships first, R15 inherits it. Full-screen sheet on phones
  (R15) needs no side border, only the desktop centered card does — harmless either way.
- **R18-3 — neutral pills get a soft border in dark.** `border-color:var(--edge)` on `.learn-chip`, `.port-pill`,
  `.port-pill-add`, `.pill-ghost`, `.btn-ghost`, and (research) `.src-chip`, `.tf-pills`, `.seg`, plus `.add-pill:
  disabled`. Leave the colored status pills (`.badge-live/plan/pro`, `.beta`, `.chg-pill`, `.sentiment`, `.csig`)
  untouched (decision 3).
- **R18-4 — Search results separator.** `html[data-theme="dark"] .ci-app .trend-item { border-bottom-color:var(--edge) }`
  so typed-result rows are clearly separated. (Only `.trend-item`; the general `--line-2` dividers stay subtle.)
- **Explicitly unchanged (decision 2):** internal row-dividers — `.kv-row`, `.tx-row`, the journal Q&A dividers —
  keep `--line-2` (subtle). Light mode: **no rule touched.**

**TDD / verify:** CSS-only → computed-style probe in **dark**: a sample card (`.card`/`.coin-card`) `border-color` ≈
`rgba(236,233,225,.16)`; `.cm-card` now HAS a border; `.trend-item` border-bottom brighter; a neutral pill
(`.port-pill`) has the edge; a colored pill (`.chg-pill`) is UNCHANGED; a `.kv-row` divider is UNCHANGED. In
**light**: a card border still computes `--line-2` (byte-for-byte unchanged). `npm run build` clean + browser-verify
dark + light, mobile + desktop, across Portfolio/Research/Journal/Learn/Search + a popup.

**Build order (when "go"):** R18-1 (edge token + cards) → R18-2 (popups) → R18-3 (neutral pills) → R18-4 (search
line). All in the dark block. Slotted into [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

**Status:** ✅ **BUILT 2026-07-01** — dark-block-only design (one `--edge` knob + targeted `border-color`
overrides); light untouched; composes with Round 15 popups. Decisions locked (soft 16% · outer+search only ·
neutral pills only). Build on founder "go".

---

## Round 19 — portfolio delete-confirm · portfolio rename · 2-step transaction delete · transaction pagination · transaction ordering (2026-07-01, PLAN ONLY)

> Founder — four safety/scale gaps in the Portfolio flow:
> (1) **A portfolio deletes with NO stop.** One tap on the trash in Account → Portfolios wipes the portfolio and
> **every coin + transaction in it**, instantly. Want the SAME two-tier confirm the coin delete already has —
> whether the portfolio has coins/data or not.
> (2) **Can't rename a portfolio.** Want to edit the name, both in Settings and via a rename popup.
> (3) **A transaction deletes on one click.** Want a 2-step confirm for every buy/sell delete.
> (4) **The transaction list is unbounded.** A coin can hold up to 5,000 tx (Premium) in one endless scroll.
> Want **50 per page** with **numbered pages (1,2,3,4…)** at the bottom of each coin's tx list, in the app's colors.
> (5) **Transaction order is wrong.** Each new buy/sell should sit **on top**, older ones below — **even two added in
> the same minute** must show the most-recently-added on top. "This is how the list of transactions needs to be."
> **Decisions locked (AskUserQuestion, 2026-07-01):** (1) portfolio delete **mirrors the coin exactly** — empty →
> quick two-tap trash (auto-clears ~3s); has-coins → blocking warning modal; (2) rename reachable from **Settings +
> the portfolio switcher bar** (an edit ✎ on the active pill); (3) transaction delete = **inline two-tap on the
> row** (arm → confirm, auto-clears ~3s — the R12 pattern, no per-row modal); (4) pager = **windowed numbers**
> (Prev · 1 … 4 5 6 … 100 · Next); (5) ordering = **by transaction date desc**, same-minute ties → **most-recently-
> added on top** (`createdAt` tie-break; a *backdated* tx sorts down to its real date, not to the top), and the
> **CSV export matches** (newest-first too). **Plan only — build on founder "go".**

**Grounded current state:**
- **Portfolio delete** — `Account.jsx:234` renders a trash `icon-btn` (only when `portfolios.length>1`) → `deletePortfolio(p.id)` ([CryptoIdea.jsx:426](src/CryptoIdea.jsx)) → `dbDeletePortfolio` ([firebase-database.js:98](src/api/firebase-database.js)) which **cascades**: batch-deletes every coin + its transactions, the portfolio doc, and decrements `portfolioCount`. **No confirmation anywhere.** This is the ONLY delete entry point (PortfolioBar has add only). Existing guard: `portfolios.length<=1` can't delete your last portfolio (CryptoIdea.jsx:427).
- **The coin pattern to mirror** — [Detail.jsx](src/components/Detail.jsx): *empty coin* → two-tap trash → `.pill-danger` "Remove" pill (Detail.jsx:44-46) with a **local** `confirmDel` flag + a ~3s auto-disarm `useEffect` (Detail.jsx:25-32, the R12 fix — state is LOCAL, never in context, or it leaks across navigation); *coin with tx/thesis* → a blocking `<Modal size="sm" title={`Delete ${coin.name}?`}>` warning (Detail.jsx:104-116, Cancel / "Delete anyway").
- **Rename** — none. The old `renamePortfolio` data fn was **deleted as dead code** ([REVIEW-FINDINGS.md](REVIEW-FINDINGS.md):21/56/79). **Rules already allow a rename** — `validPortfolioData()` bounds `name` (string, 1–50) and the portfolio `allow update` (firestore.rules:147) permits it while `coinCount` is unchanged (`counterDeltaOk('coinCount')` passes on a 0 delta) → **NO rules change needed**, just re-add the (now-wired) data fn + UI.
- **Transaction delete** — Detail.jsx:98 `.tx-del` trash → `remEntry(coin.id,e.id)` on **one click** ([CryptoIdea.jsx:562](src/CryptoIdea.jsx); keeps a sell-dependency guard that blocks a delete a later sell depends on).
- **Transaction list** — Detail.jsx:85 renders **all** `coin.entries` (sorted newest-first) at once; no pagination. Caps: `maxTxPerCoin` free **50** / pro **2,000** / premium **5,000** (CryptoIdea.jsx:408). Reference pager: admin Users list ([admin-dashboard.jsx:299-326](src/components/admin-dashboard.jsx)) — same 50/page `slice` logic, but its UI is Prev/Next-only, so the tx pager needs its own **windowed numbers**.

- **R19-1 — portfolio delete confirm (mirror the coin).** In the Account → Portfolios view, extract each row into a small **`<PortRow>`** sub-component (or hold `armedPid`/`warnPid` keyed by id) so the confirm state is **component-local** (per the R12 lesson — never lift ephemeral confirm state to context). Behaviour:
  - *Empty portfolio* (`p.coins.length===0`): tap trash → the trash swaps to a `.pill-danger` **"Remove"** pill on that row; a ~3s `useEffect` auto-disarms it (reuse Detail's pattern); second tap → `deletePortfolio(p.id)`.
  - *Portfolio WITH coins*: tap trash → open the shared `<Modal size="sm" title={`Delete ${p.name}?`}>` warning — "This portfolio has **N coin(s)** and all their transactions and theses. Deleting it removes all of them — this can't be undone." → **Cancel** / **Delete anyway** (mirror Detail.jsx:104-116 copy + buttons; dark-safe via the Round 15 `<Modal>`).
  - The `deletePortfolio` handler is unchanged (already cascades + switches the active portfolio). Keep the last-portfolio guard.
- **R19-2 — portfolio rename (Settings + switcher bar).** *Data layer:* add `updatePortfolioName(uid, portfolioId, name)` to firebase-database.js → `updateDoc(doc(db,"users",uid,"portfolios",portfolioId), { name })` returning `{success}` / `{success:false,code}` (re-adds, and this time **wires**, the capability the dead `renamePortfolio` had). *Handler:* `renamePortfolio(pid, name)` in CryptoIdea.jsx — trim + non-empty + `≤50` client check (mirror `addPortfolio` + the rules bound), call the db fn, on success `setPortfolios(prev=>prev.map(p=>p.id===pid?{...p,name:name.trim()}:p))`, else `apiErrorMessage`; expose in ctx along with a `startRename(pid)`/`renameFor` state. *UI (one shared modal, mounted once — KISS, single source):* reuse the shared `<Modal title="Rename portfolio" dismissOnScrim={false}>` (clone the PortfolioBar "New portfolio" dialog — text input prefilled with the current name + Save). Entry points: **(a) Settings** — Account port-row (Account.jsx:228-236) gets an edit ✎ `icon-btn` next to the trash → `startRename(p.id)`; **(b) switcher bar** — PortfolioBar.jsx adds an edit ✎ affordance on the **active** pill → `startRename(activePortId)`. **No rules change** (see grounded state) — add a rules *test* instead.
- **R19-3 — 2-step transaction delete (inline two-tap).** In Detail.jsx add a **row-local** `const [confirmTxId,setConfirmTxId]=useState(null)`. Tap a row's `.tx-del` → `ev.stopPropagation(); setConfirmTxId(e.id)` (arms just that row: the trash swaps to a small `.tx-del-confirm` danger control "Delete?"). Second tap on the confirm → `remEntry(coin.id,e.id)` then reset. A ~3s `useEffect` keyed on `confirmTxId` auto-disarms (mirror R12); arming a different row or tapping the row body resets. Keep `stopPropagation` so arming/confirming never opens the edit form. The `remEntry` sell-dependency guard stays (on a blocked delete its toast fires; reset the armed state). New `.tx-del-confirm` styled with the `--sr` danger tint, sized to fit the row, dark-safe.
- **R19-4 — transaction pagination (50/page, windowed numbers).** In Detail.jsx add a **local** `const [txPage,setTxPage]=useState(1)`, `PAGE_SIZE=50`. From the sorted-desc entries: `const pages=Math.max(1,Math.ceil(sorted.length/PAGE_SIZE)); const pg=Math.min(txPage,pages); const rows=sorted.slice((pg-1)*PAGE_SIZE, pg*PAGE_SIZE)` — render `rows`, not all. Below the list, render a **windowed numbered pager** only when `pages>1`: **Prev · 1 … pg-1 pg pg+1 … last · Next** via a pure `pageWindow(pg,pages)` helper (→ `[1,'…',pg-1,pg,pg+1,'…',last]`, deduped/clamped). New `.tx-pager` + `.tx-pg` / `.tx-pg.active` / `.tx-pg-ellipsis` classes in `app.css` using design tokens (`--paper-2` bg, `--line` border, active = `--accent-soft`/`--accent-ink`, `--radius-xs`; dark-safe, incl. the R18 `--edge` border in dark). Page state is component-local → resets to page 1 when a different coin opens; after add/delete `pg=Math.min` clamps back (adding pushes newest to page 1 — acceptable). Pure client-side slicing — **no query/data-layer change**.
- **R19-5 — transaction ordering: newest on top, stable same-minute tie-break.** *Root cause:* `date` is **minute-precision** (`AddEntry` prefills `now.toISOString().slice(0,16)`; datetime-local), the read query is `orderBy("date","desc")` only ([firebase-database.js:143](src/api/firebase-database.js)), and Detail re-sorts by `date` alone (Detail.jsx:85) — so two tx in the same minute **tie**, and a stable sort keeps them in array order; the optimistically-appended new tx (`entries:[...c.entries, en]`, CryptoIdea.jsx:558) therefore lands **below** the older same-minute one. **The tie-break signal already exists and is already read:** every tx is written with `createdAt: serverTimestamp()` (firebase-database.js:284) and the read carries it via `...t.data()` (line 145); `validTransactionData` (firestore.rules:295) isn't a closed shape, so **no rules change**. Fix (mostly client sort):
  - **New pure helper** `sortTx(entries)` (in `utils/` — e.g. `src/utils/tx.js`): returns a new array sorted by `date` **desc**, tie-break `createdAt` **desc**. A tolerant `txCreatedMillis(e)` normalizer handles every shape `createdAt` takes: a Firestore `Timestamp` (`.toMillis()`), a serialized `{seconds}`/`{_seconds}` (×1000), a plain number, an ISO string (`Date.parse`), else `0`. Unit-test it (date order, same-minute tie by createdAt, missing createdAt → 0 sorts last within its date group, mixed shapes).
  - **Detail** replaces its inline sort with `sortTx(coin.entries)` — this feeds **R19-4** so page 1 is genuinely the newest 50.
  - **Optimistic add** (CryptoIdea.jsx `addEntry`): stamp `en.createdAt = Date.now()` (ms number) so a just-added same-minute tx jumps to the top immediately; it reconciles to the server Timestamp on the next read (both normalize to millis → consistent). The **edit** path leaves `createdAt` untouched (position preserved unless the `date` itself is edited — then it re-sorts to the new date, which is correct).
  - **CSV export matches (decision 5).** [export-csv.js:76-88](src/utils/export-csv.js) currently sorts the TRANSACTIONS section oldest-first — flip to **newest-first** (`date` desc, then `createdAt` desc; reuse the same normalizer) and update its "oldest first" comment. (Export tx objects are `co.transactions` with `createdAt` from the raw export; the normalizer covers the serialized Timestamp shape.)
  - *Legacy/seed tx without `createdAt`* normalize to `0` → sort last within their date group (oldest); acceptable. Build detail: add `createdAt` to the seed script's sample tx (functions/scripts/seed-emulator.js) so local same-minute ties show correctly. *Optional & skipped (KISS):* a composite index for `orderBy("date"),orderBy("createdAt")` — unnecessary because the client re-sorts.

**TDD / verify (write tests first; never finish red):**
- **Unit (Vitest):** *Portfolio delete* — empty row: click trash → "Remove" pill, `deletePortfolio` NOT called; 2nd click → called; fake-timer auto-disarm; has-coins row: click trash → warning Modal shows the coin count, "Delete anyway" → called, Cancel → not; last-portfolio → no trash (existing). *Rename* — `renamePortfolio` handler updates state; the shared Modal opens **prefilled** from both the Settings row and the PortfolioBar ✎; empty/`>50` name blocked client-side. *Tx delete 2-step* — click `.tx-del` → "Delete?" shows, `remEntry` NOT called; 2nd click → called; fake-timer auto-disarm; clicking the row body still opens the edit form (stopPropagation); sell-dependency guard still toasts. *Pagination* — seed **120** entries (via the `getCoins` mock, walkthrough pattern) → only 50 rendered, `pages===3`, windowed numbers present; click "2" → next 50; Prev/Next bounds; `≤50` entries → **no** pager. *Tx ordering* — unit the pure `sortTx` (date desc, same-minute createdAt tie-break, missing-createdAt → last, mixed shapes); Detail renders two same-minute tx with the newer-**added** on top; adding a same-minute tx puts it on top optimistically (walkthrough); CSV `buildPortfolioCsv` transactions now newest-first. Update `CryptoIdea.walkthrough.test.jsx` if any flow now deletes a portfolio/tx (extra confirm step) or asserts tx order.
- **Rules (`npm run test:rules`):** add owner-can-rename (allowed), `name.size()>50` (rejected), stranger (denied). Expect **green with no rules edit** (proves the existing `update` rule covers rename); if it goes red, that's the real gap to fix.
- **Build + browser:** `npm run build` clean; verify mobile (~390) + desktop (~1040), light + dark — portfolio delete both tiers, rename from both entry points, tx two-tap + auto-disarm, pager windowed + tokenized + the dark `--edge` border.

**Build order (when "go"), grouped by file to minimize churn:** R19-2 (data fn + rename handler/modal — smallest, self-contained) → R19-1 (portfolio delete confirm — same Account.jsx/PortfolioBar files) → R19-5 (tx ordering — the `sortTx` helper + optimistic `createdAt` + CSV; lands before R19-4 so pagination slices the correct order) → R19-3 (tx two-tap) → R19-4 (pagination — both in Detail.jsx). Each its own commit; DoD met per increment. Slotted into [`NEXT-STEPS.md`](NEXT-STEPS.md) §DP.

**Security / KISS:** rename needs **no rules change** (the portfolio `update` rule already bounds `name` 1–50 and leaves `coinCount` untouched); delete/`remEntry` reuse existing, already-authorized data-layer calls; pagination is pure client slicing (no new query, no index); ordering reuses the **already-persisted, already-read** `createdAt` (no rules/schema/index change). No new dependency, no new attack surface. All confirm/armed/page state is **component-local** (R12 lesson), and the two-tap + auto-disarm reuse a shipped pattern.

**Status:** 📋 **PLAN ONLY (2026-07-01)** — decisions locked (mirror-coin portfolio delete · Settings+switcher rename · inline two-tap tx delete · windowed 50/page pager · newest-on-top ordering w/ same-minute `createdAt` tie-break + matching CSV). Build on founder "go".
