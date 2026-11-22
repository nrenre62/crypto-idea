# Persona soak test — 2026-11-22

Back to the bug log: [BUGS.md](../../BUGS.md)

## What was run

- **10 personas × ~55 min each**, run one after another in Chrome against the **local emulator stack** (`npm run start:all`, seeded accounts `p01…p10@test.com`).
- Window: **11:00–20:15 local (UTC+2)**.
- Each persona exercised its own slice of the app (trading, back-dated buys, micro-caps, DCA + Learn, DeFi books, stablecoins, Search, portfolio organisation, adversarial input, account/privacy) and wrote one report below.
- Reports only. Nothing in the app code was changed. Findings were then de-duplicated into BUGS.md entries.

**Outcome:** **101 new bugs logged (BUG-041 … BUG-141): 6 High · 34 Medium · 61 Low.** 18 open known bugs were confirmed still present. 4 findings (P03-27, P04-19, P05-32, P06-27) were filed as "by design" (BUGS.md C10–C12). No XSS, no crash and no `$NaN` were found, and the write guards (oversell replay, caps, cooldown, coin cap under concurrency) held.

## Reports

Counts are the finding headings in each report, including repeats of known bugs and of earlier personas.

| Report | Persona | Minutes | High | Med | Low |
|---|---|---|---|---|---|
| [p01-trader.md](p01-trader.md) | P01 Active trader | 55 | 5 | 8 | 5 |
| [p02-long-term-investor.md](p02-long-term-investor.md) | P02 Long-term investor | 55 | 3 | 10 | 8 |
| [p03-speculator.md](p03-speculator.md) | P03 Speculator (memes, micro-caps) | 55 | 4 | 9 | 17 |
| [p04-dca-beginner.md](p04-dca-beginner.md) | P04 DCA beginner / learner | 55 | 1 | 12 | 26 |
| [p05-defi-enthusiast.md](p05-defi-enthusiast.md) | P05 DeFi enthusiast | 55 | 13 | 14 | 28 |
| [p06-conservative-holder.md](p06-conservative-holder.md) | P06 Conservative holder (stablecoins) | 55 | 7 | 14 | 19 |
| [p07-altcoin-hunter.md](p07-altcoin-hunter.md) | P07 Altcoin hunter | 56 | 2 | 6 | 8 |
| [p08-organizer.md](p08-organizer.md) | P08 Organizer (portfolios, export, multi-tab) | 55 | 0 | 2 | 15 |
| [p09-edge-case-tester.md](p09-edge-case-tester.md) | P09 Edge-case / adversarial tester | 55 | 1 | 9 | 15 |
| [p10-account-privacy.md](p10-account-privacy.md) | P10 Account & privacy user | 55 | 4 | 14 | 15 |

## Top recommended fixes (priority order, grouped by root cause)

Every fix below goes through the CLAUDE.md flow: **founder interview and a yes on the plan first, then a failing test committed red (`it("BUG-NNN: …")`), then the fix** (`/fix-bug BUG-NNN`).

1. **Stop presenting invented prices as market data.** One root cause family across 6+ personas.
   - Never seed `TOP_COINS` mock values into the live price map; show "—" until live; prefer the live price in `startAddTx` — **BUG-023**, **BUG-021**.
   - Don't cache empty/miss `/api/history` answers for 24h; flag estimates — **BUG-041** (extends BUG-009).
   - Use real history (or say "estimate") for CoinInfo past rows, old buys and "now" — **BUG-042**, **BUG-025**, **BUG-048**.
   - Treat missing history as unknown in the Pulse, not 0% — **BUG-047**.
2. **Silent data changes on input and edit.**
   - Decimal sanitiser rescales commas/exponents/minus — **BUG-045** (also BUG-050, BUG-052, BUG-081).
   - A date change overwrites a recorded price — **BUG-044**.
   - Edited transactions revert and don't sync (bump the parent coin doc in the same batch) — **BUG-043**.
3. **Dates and time zones:** local "now" in the form and a real future-time guard — **BUG-024** + **BUG-049** (fix together).
4. **Honest P&L math:** one "invested" definition — **BUG-055**; moving-average cost basis that resets at zero — **BUG-056** (gives realised P/L, BUG-082); epsilon/dust handling — **BUG-076**; shared money formatter for Detail/CoinInfo — **BUG-051**; neutral zero and consistent minus — **BUG-022**, **BUG-026**.
5. **Research risk reads wrong for stablecoin and small books:** per-coin beta in the stress test — **BUG-046** (+ BUG-037 copy); one concentration predicate and honest anchor copy — **BUG-100**, **BUG-099**, **BUG-101**.
6. **Keyboard and screen-reader access:** shared Modal Escape/focus/close button — **BUG-027**; Back closes popups — **BUG-054**; div click targets — **BUG-074**; names/ARIA — **BUG-075**; quiz controls — **BUG-029**/**BUG-030**.
7. **Privacy and session hygiene:** one `resetSessionState()` on every sign-out path — **BUG-034**, **BUG-073**, **BUG-080**, **BUG-112**; replay only with consent — **BUG-078**; share image hides amounts — **BUG-064**; complete export — **BUG-063**.
8. **Copy that over-promises:** AI "Live" row, landing promises, upsells and locked modules on a free launch — **BUG-058**, **BUG-059**, **BUG-032**, **BUG-028**.
9. **Thesis drafts lost:** keep the Search prompt open on a failed add and save/confirm on X — **BUG-062**, **BUG-089**; correct delete warnings — **BUG-057**.
10. **Landing DCA calculator correctness:** stale results, future dates, month-end drift — **BUG-067**, **BUG-068**, **BUG-069** (after BUG-041).

## Open known bugs re-confirmed

Still present on 2026-11-22 (a "still present" line was added to each in BUGS.md):

| Bug | Title | Re-confirmed by |
|---|---|---|
| BUG-021 | Search shows mock prices and the thesis saves them | P01, P02, P03, P04, P05, P06, P07, P09, P10 |
| BUG-022 | Empty holding shows green "+$0.00" P/L | P01, P02, P03, P04, P05, P06, P07, P09, P10 |
| BUG-023 | AUTO buy price can pre-fill the mock price | P01, P02, P03, P04, P05, P06, P07, P09, P10 |
| BUG-024 | Transaction time recorded in UTC, shown as local | P01, P02, P03, P04, P05, P06, P07, P09, P10 |
| BUG-025 | AUTO historical price is an estimate labelled as market price | P01, P02, P03, P04, P05, P06, P09 |
| BUG-026 | Mixed minus signs in P/L | P01, P02, P03, P04, P05, P06, P07, P09 |
| BUG-027 | Escape doesn't close the coin Detail popup (root cause: shared Modal) | P01, P02, P03, P04, P05, P06, P07, P08, P09, P10 |
| BUG-028 | Learn modules 2–9 locked though "all 9 open" is promised | P01, P02, P03, P04, P05, P06, P07, P09, P10 |
| BUG-029 / BUG-030 | Quiz answers not controls; wrong answer stays green | P02, P03, P04, P05, P06, P07, P09, P10 |
| BUG-031 | Name field strips accents, apostrophes and hyphens | P02, P03, P04, P05, P06, P09, P10 |
| BUG-032 | Upsell to a plan that can't be bought | P01, P02, P03, P04, P05, P06, P08, P09, P10 |
| BUG-033 | Oversized "Security & payment emails" text | P02, P03, P04, P05, P06, P07, P09, P10 |
| BUG-034 | Deleted account's credentials stay in the login form (also after Sign out everywhere) | P10 (P05 saw the plain log-in path clear the form) |
| BUG-035 | Restore-account screen unreadable in dark mode | P05, P10 |
| BUG-036 | 100% single-token book rated Low risk (related copy issue: BUG-101) | P02, P03, P04, P08, P09 (also seen by P01, P10) |
| BUG-037 | Stress test claims "higher-beta amplify" at exactly −50% | P01, P02, P03, P04, P05, P06, P09 |
| BUG-038 | Daily Brief always shows ▲ even when down | P03, P04, P05, P09 |

Also re-confirmed, as a related issue: BUG-009 by P03 (the empty-answer caching it causes is now BUG-041). By design, not logged as bugs: C10 (active portfolio resets after logout), C11 (verify-email banner returns on reload), C12 (no $0 sell).

## Unique bugs found (new in BUGS.md)

| BUG | Severity | Title | Personas |
|---|---|---|---|
| BUG-041 | High | Empty `/api/history` answer is cached for 24h, so prices fall back to invented estimates | P01, P02, P03, P04, P05, P06, P09 |
| BUG-042 | High | CoinInfo "Price History" rows come from the static estimate table | P01, P02, P05, P06 |
| BUG-043 | High | Edited transaction reverts on screen and never live-syncs | P01, P05, P06, P08 |
| BUG-044 | High | Changing only a transaction's date overwrites its price with the AUTO price | P02, P06, P09 |
| BUG-045 | High | Decimal input re-interprets commas, exponents and minus signs as a different number | P03, P04, P05, P09 |
| BUG-046 | High | Stress test assigns beta by position order, not by coin | P03, P05, P06 |
| BUG-047 | Medium | Research Pulse treats a coin with no history as 0% and credits the move to other coins | P02, P03, P04, P05 |
| BUG-048 | Medium | AUTO price for "now" uses the last history point, not the live price | P03 |
| BUG-049 | Medium | "No future dates" guard is day-granular and uses the UTC day | P01, P04, P09 |
| BUG-050 | Medium | A full 15-digit Amount/Price field can't be overwritten by select-and-type | P09 |
| BUG-051 | Medium | Dollar amounts on Detail and CoinInfo render with three decimals | P01, P02, P03, P04, P05, P06, P09 |
| BUG-052 | Medium | Prices below ~$1e-9 shown with one significant digit or as zero | P03 |
| BUG-053 | Medium | CSV export loses micro-cap prices and writes scientific notation | P03 |
| BUG-054 | Medium | Browser/phone Back with a popup open leaves the app | P04, P09 |
| BUG-055 | Medium | Portfolio "INVESTED" and P/L % use lifetime gross buys | P01, P02, P03, P04, P05, P06 |
| BUG-056 | Medium | Average cost never resets after a full exit | P01, P09 |
| BUG-057 | Medium | Delete-coin warning is keyed on transactions, not the thesis | P01, P02, P03, P04, P05, P06, P07, P08, P10 |
| BUG-058 | Medium | Plan & billing claims "AI research · Live" while AI is off | P01, P02, P03, P04, P05, P06, P09, P10 |
| BUG-059 | Medium | Landing copy promises features the app doesn't deliver | P02, P04, P10 |
| BUG-060 | Medium | Portfolio value card overflows horizontally on phones | P03, P06, P08 |
| BUG-061 | Medium | Journal detail never shows the current review decision | P02, P04, P05, P06 |
| BUG-062 | Medium | Search prompt loses a written thesis when the add fails | P03, P06, P07, P09 |
| BUG-063 | Medium | "Download all my data (JSON)" omits Learn progress | P02, P10 |
| BUG-064 | Medium | Pulse "Share" image prints exact dollar holdings | P06, P10 |
| BUG-065 | Medium | Two devices pruning at once can delete every portfolio | P08 |
| BUG-066 | Medium | Two devices editing the same thesis silently lose edits | P02 |
| BUG-067 | Medium | Landing DCA calculator shows stale results | P04, P09 |
| BUG-068 | Medium | Landing DCA counts future-dated buys as invested | P04, P09 |
| BUG-069 | Medium | Landing DCA "Monthly" schedule drifts after a month-end start | P04 |
| BUG-070 | Medium | Searching "aave" lists Aave several times | P04, P05 |
| BUG-071 | Medium | Searching an exact ticker can miss the coin | P07 |
| BUG-072 | Medium | A failed or rate-limited search shows "No results" | P07 |
| BUG-073 | Medium | A previous user's cached profile stays in localStorage | P10 |
| BUG-074 | Medium | Mouse-only click targets on cards, rows, Journal entries and Learn | P02, P04, P09, P10 |
| BUG-075 | Medium | Missing accessible names and ARIA states | P03, P07, P08, P10 |
| BUG-076 | Medium | Dust/epsilon handling creates ghost rows and phantom holdings | P03, P06, P09 |
| BUG-077 | Medium | Daily 100-adds cap says "too fast" instead of "come back tomorrow" | P07 |
| BUG-078 | Medium | Sentry replay and tracing run with analytics consent OFF | P10 |
| BUG-079 | Medium | `/edge` newsletter promises "Unsubscribe anytime" with no backing | P10 |
| BUG-080 | Medium | Passwords stay filled in Profile/Security after errors and navigation | P10 |
| BUG-081 | Low | Absurd amounts/prices get no inline limit or plausibility check | P06, P09 |
| BUG-082 | Low | No realised vs unrealised P/L split | P01 |
| BUG-083 | Low | New-sell oversell message is replay wording with no maximum | P01, P03, P05, P09 |
| BUG-084 | Low | "You already profited more than your total investment" on small gains | P01, P03, P05, P09 |
| BUG-085 | Low | Delete-portfolio dialog always mentions theses | P06, P08 |
| BUG-086 | Low | Switching tabs keeps the previous tab's scroll position | P02, P03, P04, P10 |
| BUG-087 | Low | Header badges don't fit on 360–390px phones | P03, P04, P09 |
| BUG-088 | Low | Journal empty state ignores that the journal is per-portfolio | P02, P05 |
| BUG-089 | Low | Search "Before you add" X / Skip silently discards typed thesis | P02, P05 |
| BUG-090 | Low | "Delete thesis" also wipes research findings and review status | P05, P06 |
| BUG-091 | Low | Duplicate portfolio names accepted | P04, P05, P06, P09 |
| BUG-092 | Low | Account "Joined" shows the latest login date | P04, P05, P10 |
| BUG-093 | Low | Login and change-email errors reveal whether an email is registered | P02, P09, P10 |
| BUG-094 | Low | Both export buttons share one cooldown and show a raw "[429]" | P08, P10 |
| BUG-095 | Low | Stale plan-change toast after another account used the same tab | P07, P08 |
| BUG-096 | Low | Coin deleted elsewhere leaves a ghost Detail + Buy form | P08, P09 |
| BUG-097 | Low | Coin being added lands in another portfolio if its target is deleted | P08 |
| BUG-098 | Low | Rename dialog ignores remote changes | P08 |
| BUG-099 | Low | Risk card calls USDC/Solana a "$100B+ anchor" | P04, P05, P06 |
| BUG-100 | Low | Any 2–4 coin or stablecoin-heavy book is called "concentrated" | P05, P06 |
| BUG-101 | Low | Risk-meter advice copy contradicts the book | P03, P05 |
| BUG-102 | Low | Landing DCA money formatting for micro-caps and zero | P03, P04 |
| BUG-103 | Low | Landing DCA drops the last buy across a daylight-saving change | P04 |
| BUG-104 | Low | Landing DCA coin picker can't be used from the keyboard | P04 |
| BUG-105 | Low | Landing DCA "Price today" is yesterday's history close | P04 |
| BUG-106 | Low | Landing DCA has no upper bound on the amount | P04 |
| BUG-107 | Low | Calculator invites a Daily plan the 300-tx/coin limit can't hold | P04 |
| BUG-108 | Low | Same coin shows different ranks on Search/Trending vs CoinInfo | P03 |
| BUG-109 | Low | Whitespace-only and one-character queries claim "No results" | P07 |
| BUG-110 | Low | Search ignores cashtags and typos | P07 |
| BUG-111 | Low | A long unbroken Search query makes the page scroll sideways | P05, P07 |
| BUG-112 | Low | Search query survives logout | P03 |
| BUG-113 | Low | Enter doesn't submit most single-purpose forms | P09, P10 |
| BUG-114 | Low | "1 coins" pluralisation in Account → Portfolios | P04 |
| BUG-115 | Low | Disabled buttons look identical to enabled ones | P04, P10 |
| BUG-116 | Low | Learn XP card says "Max level" while the bar shows 10% left | P04 |
| BUG-117 | Low | Learn says "keep your streak going" after every lesson is done | P04 |
| BUG-118 | Low | "Next →" opens the next lesson scrolled to the quiz | P04 |
| BUG-119 | Low | Learn library has no dollar-cost-averaging lesson | P04 |
| BUG-120 | Low | Dark-mode users get a light flash on load | P10 |
| BUG-121 | Low | Two-tap confirm pills auto-disarm and shrink under a late tap | P02, P06 |
| BUG-122 | Low | Coins outside the built-in table accept buys before they existed | P02, P07 |
| BUG-123 | Low | Closed positions handled inconsistently across screens | P03, P05, P06 |
| BUG-124 | Low | Transaction pager keeps a page that no longer exists | P01 |
| BUG-125 | Low | Research Pulse rounds small books to whole dollars | P03 |
| BUG-126 | Low | Research never says which portfolio it describes | P05, P06 |
| BUG-127 | Low | Rename pencil scrolls out of view with long portfolio names | P05, P08 |
| BUG-128 | Low | Starter user with one portfolio has no add/rename bar | P08 |
| BUG-129 | Low | New portfolio can jump ahead of older ones after a delete | P08 |
| BUG-130 | Low | CSV export silently leaves out empty portfolios | P08 |
| BUG-131 | Low | Double-clicking Save in "New portfolio" also shows a limit toast | P08 |
| BUG-132 | Low | Invisible Unicode accepted in names | P09 |
| BUG-133 | Low | Research figures ≥ $1 trillion render as "$1720800000.0B" | P09 |
| BUG-134 | Low | Funnel-only journal entry shows a finding as if it were the thesis | P05 |
| BUG-135 | Low | Privacy card says "permanently delete" for a 30-day restorable trash | P05 |
| BUG-136 | Low | Consent records lack version and timestamps | P10 |
| BUG-137 | Low | "Email digest" switch saves a preference nothing uses | P10 |
| BUG-138 | Low | "Signed out of all devices" overstates it | P10 |
| BUG-139 | Low | Privacy policy omits CoinGecko image CDN and Google Fonts | P10 |
| BUG-140 | Low | "The Edge" guide gives allocation percentages and names a company | P04 |
| BUG-141 | Low | No "amount in USD" option when recording a buy | P04 |
