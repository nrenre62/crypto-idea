# Persona test — 10 users in Chrome

**Date:** 2026-11-21 · **Run:** 19:03 – 19:24 local (~21 min of live testing) · **Tester:** Claude (Claude in Chrome, driving the real UI)
**Build:** `master` @ `9f9f2d2` · **Stack:** `npm run start:all` — local Firebase emulators (auth / firestore / functions / pubsub) + Vite dev server on `http://localhost:3000`, live CoinGecko data via the `/api` proxy, launch defaults (`paidPlansEnabled` OFF, `aiResearch` OFF).
**Scope:** user app only (`/app`). The admin panel was deliberately not opened, as a precaution from BUGS.md BUG-005 (`/admin` used to sign out user sessions in the same browser; resolved).

Back to the testing hub: [TESTING.md](../TESTING.md) · bug log: [BUGS.md](../BUGS.md)

---

## 1. Summary

10 persona accounts were registered through the real Register form and driven through Portfolio, Search, Journal, Learn, Research and Account. **Core money maths was correct in every case checked** (cost basis, average price, realised + unrealised P/L, tiny and huge amounts). Validation for the hard edge cases held (over-sell, negative, zero, portfolio cap, thesis length, typed-DELETE).

**19 findings** — 4 High, 6 Medium, 9 Low. The most important:

| # | Severity | One-line |
|---|---|---|
| F2 | **High** | Search, the "Before you add" card and the saved thesis use **hard-coded mock prices** (BTC $84,000 vs live $60,117; PEPE 3.5× too high) — and the thesis stores the wrong `priceAtAdd` permanently. |
| F4 | **High** | The Buy form's **AUTO price can pre-fill the mock price** (BTC 84,000 vs live 60,117) — one click records a cost basis ~40% too high. |
| F5 | **High** | **Transaction time is recorded in UTC as if it were local** — every trade is off by the time-zone offset (2 h here). |
| F15 | **High** | After **Delete my account**, the login form keeps the user's **email and password** — anyone at the device can sign straight back in. |

Root causes for F2, F4, F5, F12, F13 and F19 were confirmed in source (file:line in §4).

---

## 2. Test accounts (local emulator only)

All accounts use the test password `Persona#2026` and exist only in the local emulator (exported to the git-ignored `./emulator-data` when the stack stops).

| # | Persona | Email | Name entered | Coins / data created |
|---|---|---|---|---|
| 1 | Trader | p01.trader@test.com | Tara Trader | BTC — buy 0.5 @ $58,000, sell 0.2 @ $62,000 |
| 2 | Long-term investor | p02.longterm@test.com | Leo Longterm | ETH + full thesis — buy 4 @ $1,550 (2023-01-15), buy 2 @ $3,500 (2024-03-10) |
| 3 | Speculator | p03.speculator@test.com | Sam Speculator | PEPE — buy 250,000,000 @ $0.0000030 |
| 4 | DCA beginner | p04.dca@test.com | Dana DCA | Learn: lesson 1 of module 1 (wrong → right quiz answer) |
| 5 | DeFi enthusiast | p05.defi@test.com | Dev DeFi | UNI — buy 400 @ $6.25; Research stress test |
| 6 | Conservative holder | p06.conservative@test.com | Connie Conservative | USDT — buy 20,000 @ $1.00; Research |
| 7 | Altcoin hunter | p07.altcoin@test.com | Alex Altcoin | WASTED (#777) + Hyperliquid added from Trending |
| 8 | Organizer | p08.organizer@test.com | Zoë O'Brien-Smith | 3 portfolios (cap), 4th refused, one deleted |
| 9 | Edge-case tester | p09.edge@test.com | `=SUM(1+1) <b>Eve</b> Edge` | SOL + 2,000-char thesis; oversell, −3, 0, $10M buy, 0.00000001 buy |
| 10 | Account & privacy | p10.privacy@test.com | Pat Privacy | Dark mode, Privacy & data, delete → restore |

---

## 3. Coverage

| Area | Covered | Result |
|---|---|---|
| Register (consent required, weak password, duplicate email) | P1, P3, P4 | ✅ all validations show clear inline errors |
| Onboarding (Starter auto-resolve, "Welcome to Starter") | all 10 | ✅ (F1 once) |
| Search + Trending (live CoinGecko) | P1–P3, P5–P7, P9 | ⚠️ F2 |
| Add coin with / without thesis | P1–P3, P5–P7, P9 | ✅ |
| Buy / Sell, P/L maths | P1, P2, P3, P5, P6, P9 | ✅ maths correct · ⚠️ F4, F5, F6 |
| Transaction validation (oversell, negative, zero, huge, tiny) | P9 | ✅ |
| Journal list | P2 | ✅ |
| Learn lesson + quiz | P4 | ✅ · ⚠️ F9, F10, F11 |
| Research (Brief, Pulse, allocation, risk, stress test, note) | P2, P5, P6 | ✅ · ⚠️ F17, F18, F19 |
| Portfolios (create to cap, refuse 4th, 2-step delete) | P8 | ✅ · ⚠️ F13 |
| Account: dark mode, Privacy & data, delete → restore | P10 | ✅ · ⚠️ F14, F15, F16 |
| Logout / re-login between users, theme isolation | all | ✅ (theme does not leak to the next user) |

**Not covered (time or by design):** CSV/JSON export (would download files to the host — skipped), sign-out-everywhere, Journal edit/review flow, Learn beyond lesson 1, Coins/Ask sub-views (hidden: `aiResearch` OFF), mobile viewport, admin panel, paid plans (OFF), the transaction pager (needs >50 tx), 30-coin cap.

Persona depth was uneven by plan: P1, P2, P3, P9, P10 ran end-to-end; P4–P8 ran their core flow only.

---

## 4. Findings

Severity: **High** = wrong data saved or a privacy/security exposure · **Medium** = a real bug a user will hit, no data loss · **Low** = cosmetic, copy, or edge UX.
Status: **Confirmed** = reproduced and/or root cause seen in source · **Observed** = seen once in the UI, not root-caused.

**Logged in [BUGS.md](../BUGS.md):** F1 → BUG-020, F2 → BUG-021, … F19 → BUG-038 (add 19 to the F number).

### High

**F2 — Search shows hard-coded mock prices, and the thesis saves them** · Confirmed · P1, P2, P3, P9
- Search result / "Before you add" card vs. the live price a few seconds later:
  BTC **$84,000 +2.40%** vs **$60,117 +1.54%** · ETH **$1,900 +1.80%** vs **$1,684.74 +3.40%** · SOL **$125 +3.20%** vs **$70.65 +2.11%** · PEPE **$0.0000118 +9.20%** vs **$0.0000034 +0.53%**.
- Root cause: `src/components/Search.jsx:75` and `:125` render `coin.mockPrice` from the static `TOP_COINS` table (`src/utils/coins.js`). Coins outside that table show **no price at all** in Search (e.g. Bitcoin SV, Ethereum Name Service).
- Data impact: `src/components/Search.jsx:46` stores `priceAtAdd: coin.mockPrice` on the journal — the Long-term investor's ETH thesis permanently records $1,900 instead of ~$1,685.
- Suggested fix: use `useLivePrices` (already used by Portfolio) in Search and for `priceAtAdd`; show "—" until the live price arrives.

**F4 — AUTO buy price can pre-fill the mock price** · Confirmed · P1
- Opening Buy on a just-added BTC pre-filled **84,000** with the AUTO tag; live was $60,117. Submitting as-is records a cost basis ~40% too high. (ETH the same session suggested $1,619.51 — near live — so it depends on whether the live price has loaded.)
- Root cause: `src/hooks/useLivePrices.js:16` seeds the price map with `TOP_COINS` `mockPrice` before the live fetch returns.
- Fix: never seed with mock values; leave the price empty / disabled until a real quote exists.

**F5 — Transaction time recorded in UTC, shown as local** · Confirmed · P1, P3, P9
- Machine local time 19:05; the Date & Time field showed **17:05** and the saved trades read "05:10 PM" etc.
- Root cause: `src/CryptoIdea.jsx:183` and `:857` set the `datetime-local` value from `new Date().toISOString().slice(0,16)` (UTC). Every "now" trade is shifted by the UTC offset; near midnight it lands on the **wrong day**, which also changes the AUTO historical price looked up for that date.
- Fix: build the local `YYYY-MM-DDTHH:mm` string from local getters (or subtract `getTimezoneOffset()`).

**F15 — Deleted account's credentials stay in the login form** · Confirmed · P10
- After **Delete my account** → "Account deleted…" the app returns to the auth screen with the **name, email and password still filled in** (verified: password field 12 chars). Switching to Log in, one click signed the deleted user back in.
- The normal **Logout** path clears the form correctly — only the delete path doesn't.
- Fix: reset the auth form state (or remount `Login`) on the delete-account sign-out path, same as Logout.

### Medium

**F6 — AUTO historical price is a wrong estimate, labelled as market price** · Observed · P2
- ETH on 2023-01-15 → AUTO filled **$2,763.90**; ETH traded ~$1,550 that day. CLAUDE.md notes history beyond 365 days needs the CoinGecko Demo key, else a built-in estimate is used — but the UI still says "Using the market price for this date". Fix: label estimates as estimates, or don't AUTO-fill without real history.

**F12 — Name field silently mangles real names** · Confirmed · P8, P9
- "Zoë O'Brien-Smith" was saved as **"Zo OBrienSmith"**; `=SUM(1+1) <b>Eve</b> Edge` became "SUM bEveb Edge" (injection neutralised — good — but silently).
- Root cause: `src/components/Login.jsx:203` and `src/components/Account.jsx:218` strip everything matching `/[^a-zA-Z\s]/` on every keystroke — accented letters, apostrophes, hyphens all removed.
- Fix: allow Unicode letters + `'` `-` `.` (e.g. `/[^\p{L}\s'.-]/gu`); React already escapes output and `csv.js` already neutralises formulas.

**F13 — Upsell to a plan that can't be bought** · Confirmed · P8
- At 3/3 portfolios the toast reads **"Starter: 3 portfolios — upgrade to Pro for 6"**. Paid plans are OFF at launch and the landing promises a free single-tier product.
- Root cause: hard-coded strings in `src/CryptoIdea.jsx:713` (portfolios) and `:768` (coins: "upgrade to Pro for 100"), not gated on `paidPlansEnabled`.

**F16 — Restore-account screen unreadable in dark mode** · Observed · P10
- The heading "Your account is scheduled for deletion" is near-invisible (pale text on a white card); the screen uses a bright off-brand green button and isn't on the `.ci-app` paper design.

**F10 — Quiz answers not exposed as controls** · Observed · P4
- The four answer options are plain `generic` elements in the accessibility tree (not buttons / radios), so keyboard and screen-reader users likely can't answer. "Forgot password?" is also a non-button `generic`.

**F8 — Escape doesn't close the coin Detail popup** · Observed (2×) · P2
- Escape left the Detail overlay open; a later nav click then landed on a transaction row underneath and opened "Edit ETH". (May depend on focus position — check `Modal` keydown handling.)

### Low

| # | Finding | Where |
|---|---|---|
| F1 | "Live sync was interrupted — reload…" red toast while "Setting up your account…" was still showing (1 of 10 sign-ups; likely a watcher starting before `planChosen` is set) | P1 |
| F3 | Empty holding shows a **green "+$0.00 (+0.00%)"** Total P/L; PORTFOLIO-NUM-FIX intended a neutral empty-book value. Header 24H also shows green "+0.00%" / red "-0.00%" on empty books | P1, P3 |
| F7 | Mixed minus signs: "−$3,091.56 (-23.42%)" — real minus on the amount, hyphen on the % | P2 |
| F9 | Learn modules 2–9 show a padlock for a new user; landing "Usage" says "all 9 Learn modules open" | P4 |
| F11 | After a wrong quiz answer, the wrong option stays highlighted **green** next to the red "Not quite" message | P4 |
| F14 | "Security & payment emails are always sent…" renders much larger than the rest of the Privacy card (unstyled) | P10 |
| F17 | A 100% single-token book of UNI (~$2.9B cap) is rated **Low** risk — same as 100% ETH; concentration doesn't move the meter | P5 |
| F18 | Stress test at −50% market shows exactly −50.0% yet says "Your higher-beta holdings amplify the swing" | P5 |
| F19 | Daily Brief always shows ▲ (up, green) — "▲ Portfolio is **down** $10". `src/features/research/components/OverviewView.jsx:33` hard-codes `ic-up ▲` | P6 |

---

## 5. What worked well

- **Maths:** every P/L checked by hand matched — e.g. Trader realised $800 + unrealised $635.10 = $1,435.10 (4.95%); Long-term avg $2,200, P/L −$3,091.56 (−23.42%); PEPE 250M × $0.0000034 = $850; $10M SOL buy; 0.00000001 SOL kept full precision (100,000.00000001).
- **Validation:** consent required, weak password ("needs 1 uppercase"), duplicate email ("Email already registered"), oversell ("would exceed your holdings"), negative sign stripped, zero disables submit, thesis capped at exactly 2,000 chars (the §DI false "coin limit" toast is no longer reachable from the UI), portfolio cap enforced, 2-step portfolio delete, typed-`DELETE` (lowercase rejected) + password for account delete.
- **Soft delete → restore** works and keeps the user's theme choice. Theme does not leak between users. Logout clears the form.
- **Live data:** trending, small caps (#777 WASTED) and stablecoins price correctly on Portfolio / Detail. Research Brief, Pulse, allocation and notes are coherent and update per book.

---

## 6. Recommended next steps

1. **Fix the four Highs first** (F2/F4 share one root cause — the `mockPrice` seed; F5 is a two-line change; F15 is a form reset). Each should start with a failing test (see [TESTING.md](../TESTING.md) §Bugs).
2. Then F12 (name regex) and F13 (paid-plan-aware copy) — both tiny, both user-visible at launch.
3. Fix the Lows together as one polish pass.

All 19 findings are logged in [BUGS.md](../BUGS.md) as BUG-020 … BUG-038 (F1 → BUG-020 … F19 → BUG-038).
