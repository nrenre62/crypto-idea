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
