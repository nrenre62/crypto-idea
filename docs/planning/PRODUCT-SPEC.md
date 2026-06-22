# CryptoIdea — Product Specification
**Planning document · June 2026** · **RECONCILED 2026-06-22**

> ⚠️ **Reconciled against [`PRODUCT-DECISIONS.md`](../../PRODUCT-DECISIONS.md) (canonical).**
> Where this spec and the decisions doc differ, the decisions doc wins. Corrections applied below:
> 1. **Tiers** → Starter 1 portfolio/10 coins · Pro 3/50-each · Premium 15/unlimited(-capped); "Free" renamed **Starter**.
> 2. **Learn voice = no names** — the "Buffett / Munger / Marks" lines are genericized (names removed).
> 3. **Conviction engine** = the *backend* fetches approved sources; the **LLM never web-searches** (AI policy v4). The "using web search" wording in the AI-prompt section is superseded — backend fetches, model reasons.
> 4. **Signal ⬛ = insufficient-data** (not "dead"); a dead/abandoned project grades **🔴**.
> 5. **Journal storage = Firestore** on the coin doc (already shipped) — *not* localStorage (Build-Order Phase 2 #5 is superseded).

---

## Product Vision

**Value proposition:**
> "CryptoIdea gives retail crypto investors who've been burned by HYPE and FOMO the research edge to start investing in fundamentals."

**The gotcha feature (3-second pitch):**
> "Write why you bought it. See if your thesis still holds."

**The user:**
Retail crypto investor, 25–38 years old. Already in crypto. Has lost real money to hype and FOMO. Still believes in the market. Wants to do better. Hasn't found a real framework yet. Doesn't want to read Real Vision PDFs. Needs something that meets them where they are.

**The job:**
Help me hold the right coins with conviction — not panic-sell on noise, not buy on hype — by understanding the fundamentals of what I own.

**What this is NOT:**
- Not a trading platform (no buy/sell)
- Not a signal service (no price predictions)
- Not a copy-trading app (no following others)
- Not another CoinStats (price tracker with pretty charts)

---

## Principles (from the founder)

- **Kaizen** — always improving, small genuine changes, never overwrite history
- **Agile** — WIP limit 1, pull stories, ship increments
- **KISS** — keep it simple, one job done extraordinarily well
- **TDD** — always test before shipping
- **Security first** — user data protected, no financial advice given

---

## App Architecture — 5 Tabs

```
Portfolio | Research | Journal | Learn | Search
```

### Tab 1: Portfolio
**Job:** Track what you hold. Know your P&L. Add positions.
**Key screens:**
- Portfolio overview (total value, invested, return, live prices)
- Coin detail (holding, transactions, your journal entry for this coin)
- Add coin flow → triggers Buy Journal prompt

### Tab 2: Research
**Job:** AI-powered fundamental analysis of YOUR specific holdings.
**Sub-tabs:** Overview | Coins | Ask
**Key screens:**
- Overview: Portfolio Pulse (AI summary), allocation bar, risk gauge, stress test
- Coins: per-coin conviction signals (Dev · Founders · Team · Community)
- Ask: chat interface for portfolio questions

### Tab 3: Journal
**Job:** Your investment decisions, written before you acted. Review them when you doubt yourself.
**Key screens:**
- Entry list (all coins you've journaled, newest first)
- Entry detail: your thesis + conviction signals side by side
- "Is your thesis still intact?" moment

### Tab 4: Learn
**Job:** Gamified investing education. The great value investors' principles — in your generation's format.
**Key screens:**
- Level overview (progress map)
- Today's lesson card
- Lesson detail + quiz
- Achievement badges

### Tab 5: Search
**Job:** Find any coin. Research before you add.
**Key screens:**
- Search box
- Trending coins (what the community is researching)
- Coin research preview

---

## Screen-by-Screen Copy

### Landing Page (index.html v15)

**Eyebrow:** Stop investing in hype.

**H1:** Build a portfolio you can *hold with conviction.*

**Lead:**
CryptoIdea gives retail crypto investors the research edge to invest in fundamentals — not FOMO. Track your portfolio, research every coin before you buy, write your thesis, and check if it still holds. The investing journal nobody else has built.

**CTA primary:** Start for free
**CTA secondary:** See how it works

**Hero note:** No card required · Your data stays yours · Works on iPhone & web

**Feature 1 — Journal:**
Title: Write before you buy.
Copy: Before every new position, CryptoIdea asks you two questions: why are you buying this, and what would change your mind. Your answer lives with the coin forever. When the market drops 20%, you'll know exactly why you bought — and whether that reason still holds.

**Feature 2 — Conviction Signals:**
Title: Know what you actually own.
Copy: For every coin in your portfolio, CryptoIdea checks what matters: Is the team still building? Has the founder shown up publicly in the last 3 months? Is the revenue real or just emissions? What is the community actually saying? Four signals. Green, amber, or red. No guesswork.

**Feature 3 — Learn:**
Title: Learn from the best investors in the world.
Copy: The principles of the world's best value investors, applied to crypto. Not PDFs. Not 2-hour YouTube videos. Short lessons, applied immediately to your real portfolio. Level up as an investor, not just as a trader.

**Feature 4 — Portfolio Tracker:**
Title: Your portfolio, without the noise.
Copy: Live prices via CoinGecko. Real P&L including all your buy/sell transactions. Clean, private, fast. No ads, no data selling, no cluttered dashboards.

**Pricing:**
Starter: $0 — 1 portfolio, 10 coins, conviction analysis for your holdings
Pro: $9.99/mo — 3 portfolios, 50 coins each, research any coin on demand
Premium: $49.99/mo — 15 portfolios, unlimited coins (anti-abuse capped), real-time research + AI deep-dives

**Footer tagline:** Research before you regret it.

---

### Onboarding Flow (new user, first launch)

**Screen 1 — The Problem (Educate):**
Headline: Most crypto investors buy on hype.
Subtext: FOMO. YouTube influencers. "This is going 10x." Sound familiar? You're not alone. 90% of retail crypto investors make emotional decisions. The best investors do one thing differently.

CTA: See what's different →

**Screen 2 — The Solution:**
Headline: They write before they act.
Subtext: Warren Buffett writes his thesis before every investment. Charlie Munger argues against himself first. The best investors build conviction with words — before they commit money. CryptoIdea brings this habit to crypto.

CTA: I want to invest like this →

**Screen 3 — Personalize:**
Question: How long have you been investing in crypto?
Options: Less than 1 year / 1–3 years / 3+ years / I haven't started yet

Question: What's your biggest challenge?
Options: Buying on hype / Panic-selling / Not knowing when to hold / Finding good projects

CTA: Build my edge →

**Screen 4 — FOMO moment:**
Headline: Here's what conviction analysis looks like.
Show: Mock conviction signals for a well-known coin (Bitcoin)
— Dev 🟢 Active (500+ contributors, committed this week)
— Founders 🟢 Visible (Satoshi narrative; developer community active)
— Team 🟢 Focused (Core devs fully committed, Lightning Network active)
— Community 🟢 Strong (positive sentiment, institutional narrative)
Verdict: "Your thesis holds. Keep holding."

Subtext: This is what knowing what you own feels like.
CTA: Start my portfolio →

**Screen 5 — Plan selection (existing flow)**

---

### Portfolio Tab

**Header:** Crypto Idea | ● LIVE | [PLAN BADGE]

**Portfolio summary:**
Portfolio: $[total]
Invested: $[cost basis]  Return: +$[gain] (+[%])
● LIVE · Prices updating live

**My Assets ([n]/[limit]):** [+ Add]

**Coin row (existing format):**
[coin icon] [Name] · [sym] · [n held]    $[value] [price] [%24h]

**Empty state:**
No coins yet
Tap + Add to search and add your first crypto.
[+ Add your first coin]

---

### Buy Journal Prompt (overlay — appears when adding a coin)

**Header:** Before you add [Coin Name]...
**Subtext:** Great investors write their thesis before they act. Takes 30 seconds.

**[Coin icon] [Coin Name]** — $[current price]

**Question 1:**
Label: Why are you buying this?
Placeholder: What makes you believe in this project? What's the fundamental case?
Example hint: "Active GitHub, founder talks publicly, real revenue, upcoming catalyst..."

**Question 2:**
Label: What would change your mind?
Placeholder: What signal would tell you your thesis is wrong?
Example hint: "GitHub goes quiet, founder departs, unlock event overwhelms demand..."

**Disclaimer:** This is for your own reflection — not financial advice. CryptoIdea never tells you what to buy or sell.

**CTA primary:** Save to Journal [then continue adding coin]
**CTA secondary:** Skip for now

---

### Research Tab — Coins View (conviction signals)

**Section header:** Your coins · Conviction analysis

**Coin card (new format):**
[icon] [Name] · [sym]    [sparkline]    $[value] · [%24h] · [alloc%]

Conviction signals row:
[Dev 🟢] [Founders 🟢] [Team 🟡] [Community 🟢]

Signal labels:
- Dev: Active / Slowing / Stale / Dead
- Founders: Visible / Limited / Unknown / Departed
- Team: Focused / Divided / At risk / Gone
- Community: Strong / Mixed / Quiet / Frustrated

Verdict (one line, italic):
"[Research verdict from your framework]"

Expanded detail (when tapped):
Section "Your thesis · [Date added]"
[Journal entry text — first 120 chars]
"Is your thesis still intact? →"

Section "Signal detail"
🟢 Dev — Last GitHub commit: 3 days ago. 500+ contributors. 63 active repos.
🟢 Founders — [Founder] appeared on Bankless podcast Apr 2026. Active on X.
🟡 Team — Core team focused. Migration to Cosmos under consideration.
🟢 Community — Positive X sentiment. No panic in CMC comments.

[Ask AI about [Coin] →]

**Researching state (for coins just added, AI search in progress):**
[shimmer placeholder on 4 signals]
Researching fundamentals...
Usually takes 1–2 minutes. We're checking GitHub, founder activity, and community.

---

### Research Tab — Overview

**(Same as RT-22 with updated copy strings)**

**Brief card:**
Title: Good [morning/afternoon/evening]
Subtitle: Here's what moved while you were away.

Row 1 [▲ icon]: Your portfolio is [up/down] [X%] today, led by [top mover].
Row 2 [◆ icon]: [Top mover] moved [+/-X%] — biggest move in your portfolio.
Row 3 [! icon]: [Watch coin] — worth reviewing your conviction signals.

**Portfolio Pulse:**
Label: Portfolio Pulse [AI gradient]
[Regenerate] [Share]
[24H | 7D | 30D pills]
[AI text: neutral, educational, no buy/sell advice]

"Your holdings" · "Live prices" · "Market trends" chips
Updated [X min ago]

---

### Journal Tab (new)

**Header:** Investment Journal
**Subtitle:** Every great investor writes before they act. Here are your decisions.

**Entry count:** [n] entries · [n] theses to review

**Entry list (newest first):**
[Coin icon] [Name] · [Date]
"[First 100 chars of thesis...]"
[Conviction status pill: "Thesis intact 🟢" / "Review signals 🟡" / "Thesis challenged 🔴"]

**Empty state (no entries):**
Your journal is empty
The next time you add a coin, you'll be asked to write your thesis. Your decisions live here.
[Add your first coin →]

---

### Journal Entry Detail (overlay)

**Header:** [← Back] [Coin Name] Journal Entry

**Section: Your thesis — [Date added] · $[price at time]**
[Full thesis text]

**Section: What would change my mind**
[Full changeMyMind text]

**Section: Conviction signals today**
[Same 4-signal display as Research tab Coins view]
Last checked: [date]

**The question:**
Is your original thesis still intact?

[Yes, still holding] [No, reconsidering] [I need to research more]

**Note:** This is a personal reflection tool. CryptoIdea never tells you what to do. The decision is always yours.

---

### Learn Tab (new)

**Header:** Your Investing Edge
**Subtitle:** Level [n] · [Level Title]

**XP Progress bar:**
[████████░░] 847 / 1,200 XP to Level 3

**Badges earned:**
🎯 First Buy · 📊 Fundamentals · 💎 30-Day Hold · 🔍 Researcher · 📝 First Journal

**Today's lesson:**
Label: TODAY
Card title: "Lesson [n]: [Lesson Title]"
Card excerpt: [First sentence of lesson]
Time: 2 min read · [coin icon] Applied to your portfolio
[Start lesson →]

**Your modules:**

Module 1 — How Markets Really Work ✅
[Progress: 5/5 lessons] [Complete]
Unlocked: The Market Psychology badge

Module 2 — Reading the Fundamentals [ACTIVE]
[Progress: 3/7 lessons] [Continue →]
Next: Lesson 4 — Why GitHub commits matter more than price action

Module 3 — Portfolio Construction 🔒
[Locked — Complete Module 2 to unlock]
6 lessons · One winner per category

Module 4 — The Conviction Framework 🔒
[Locked]
8 lessons · Holding through volatility with data, not hope

Module 5 — Great Investor Principles 🔒
[Locked]
10 lessons · The great value investors' principles — applied to crypto

---

### Lesson Detail (overlay)

**Header:** [← Back] Module 2 · Lesson 4

**Title:** Why GitHub commits matter more than price action

**[Progress bar: Lesson 4 of 7]**

**Content:**
When a project's price goes up, it's easy to feel good about it. But price action tells you nothing about whether the project is actually being built. It tells you about demand for a token — not about whether the team is working.

GitHub commits are different. Every commit is a real action: a developer pushed code. You can see when the last commit happened. You can see how many people are contributing. You can see if the main repository has been updated in the last week, or the last year.

**The Myria case:**
Myria was a gaming blockchain project. The token pumped in 2024. Community was excited. Marketing was strong. But if you checked the GitHub in early 2026, you'd find zero commits all year. The founder had quietly taken another job. The project was effectively dead — but the community didn't know yet.

**The key insight:**
A project that stops committing code usually stops shipping product. A team that goes quiet on GitHub has either pivoted or departed. Price follows building. Not the other way around.

**Apply it to your portfolio:**
[Inline: your portfolio coins with Dev signal status]

---

**Quiz:**
Which of these is the strongest signal that a crypto project is still being actively built?

○ Token price increased 30% last month
○ Community Discord is active
● Last GitHub commit was 2 days ago ← correct
○ Founder tweeted about the project

[Check answer]

**[← Previous] [Next lesson →]**

---

### Search Tab (updated)

**Header:** Search
**Subtitle:** Find any coin. Research before you add.

**Search box:** Search coins... (Bitcoin, ETH, SOL...)

**Trending in the community:**
Label: Trending research · Updated hourly

[#1] [icon] Solana SOL — Being researched by the community
[Research →]

[#2] [icon] Bitcoin BTC
[Research →]

[#3] [icon] Chainlink LINK
[Research →]

[#4] [icon] Immutable IMX
[Research →]

[#5] [icon] Hyperliquid HYPE
[Research →]

---

## Conviction Signals — Signal Definitions

### Dev (Development Activity)
Source: GitHub API + web search
Check: Last commit date, commit frequency, active repos, contributor count

🟢 Active: Committed in last 7 days. Multiple active repos. 10+ contributors.
🟡 Slowing: Last commit 1–3 months ago. Core repo still active.
🔴 Stale: No commits in 3+ months. Repos archived or abandoned.
⬛ Dead: Zero commits in 2026. Project effectively abandoned.

### Founders (Media Visibility)
Source: YouTube search, podcast search, X activity
Check: Last public appearance, interview recency, engagement quality

🟢 Visible: Appeared in interview or podcast in last 90 days. Active on X.
🟡 Limited: Last interview 3–6 months ago. X activity present but limited.
🔴 Unknown: No interviews found in 12+ months. Anonymous team.
⬛ Departed: Founder confirmed departed. Working on different project.

### Team (Focus & Stability)
Source: LinkedIn, X, news search
Check: Are founders still working on this? Any silent pivots? Competing commitments?

🟢 Focused: Core team fully committed to this project. No competing roles.
🟡 Divided: Team has other projects or roles that compete for attention.
🔴 At risk: Key person known to be considering departure. Warning signals.
⬛ Gone: Founder or key team departed. Project under new or unclear leadership.

### Community (Sentiment)
Source: X reply sentiment, CoinMarketCap community comments
Check: What are holders actually saying? Frustration? Excitement? Silence?

🟢 Strong: Positive replies. Active discussion. Holders expressing conviction.
🟡 Mixed: Divided opinions. Some frustration but also support.
🔴 Quiet: Community gone quiet. Project posting but nobody engaging.
⬛ Frustrated: Holders openly expressing concern, anger, or disillusionment.

---

## AI Prompts (research tab)

### Conviction Research System Prompt

> ⚠️ Superseded by AI policy v4: the **backend** fetches from approved sources; the model does **not** web-search. Read the "Search …" / "using web search" lines below as *what the backend fetches and hands to the model*, then the model grades + writes. Multi-source cross-check required before a signal shows; ⬛ = insufficient data.

```
You are CryptoIdea's conviction research engine. Your job is to assess the 
fundamental health of a crypto project for a retail investor who has been 
burned by hype and FOMO and wants to invest based on fundamentals.

For the coin requested, assess these 4 signals using web search:

1. DEV: Search "[coin] github [current year]" and "[coin] github commits". 
   Check: last commit date, active repos, contributor count.
   
2. FOUNDERS: Search "[founder name] youtube [current year]" and "[founder name] podcast [current year]".
   Check: most recent public appearance date.
   
3. TEAM: Search "[founder name] linkedin" and "[coin] team [current year]".
   Check: are founders still working on this project full-time?
   
4. COMMUNITY: Search "[coin] twitter sentiment" and "[coin] community comments".
   Check: what are holders saying in replies, not the project's own posts.

Return a JSON object with this exact structure:
{
  "dev": { "status": "green|amber|red|black", "label": "Active|Slowing|Stale|Dead", "detail": "one sentence of evidence" },
  "founders": { "status": "green|amber|red|black", "label": "Visible|Limited|Unknown|Departed", "detail": "one sentence of evidence" },
  "team": { "status": "green|amber|red|black", "label": "Focused|Divided|At risk|Gone", "detail": "one sentence of evidence" },
  "community": { "status": "green|amber|red|black", "label": "Strong|Mixed|Quiet|Frustrated", "detail": "one sentence of evidence" },
  "verdict": "one sentence: the research summary for this coin"
}

IMPORTANT: 
- Never give buy/sell/hold advice
- Only report what you actually found, not what you expect
- If you can't find data, report "Unknown" not an assumption
- Be honest about negative signals — they are valuable to the user
```

### Portfolio Pulse System Prompt (updated)
```
You are CryptoIdea's portfolio analyst. Give a neutral, educational summary 
of how this portfolio performed in the selected timeframe.

Portfolio context: [PORTFOLIO_CTX]

Focus on:
- Which positions drove performance (positive or negative)
- Portfolio concentration observations
- Anything worth the user's attention

NEVER give buy/sell/hold advice. NEVER predict prices. 
Keep tone calm, informative, not alarming.
Max 3 sentences.
```

---

## Build Order (Kaizen sequence)

### Phase 1 — Core conviction (now)
1. ✅ RT-22: Risk gauge spectrum (shipped)
2. 🔧 RT-23: Conviction signals on coin cards (web search AI research per coin)
3. 🔧 Landing page v15: New hero copy + Journal/Learn features highlighted

### Phase 2 — Journal (after RT-23)
4. Buy Journal prompt in Portfolio tab (when adding a coin)
5. ✅ Journal entries stored in **Firestore** on the coin doc (`journal{thesis,changeMyMind,status,priceAtAdd,createdAt}`, `validJournal` rule) — DONE (not localStorage)
6. Journal tab: entry list + entry detail with conviction check
7. Research tab Coins view: show user's journal entry in expanded coin card

### Phase 3 — Learn (after Journal)
8. Learn tab: module structure + progress tracking
9. Content: 5 modules, first 2 fully written
10. Quiz mechanics
11. Badge system (cosmetic only — no feature gates)

### Phase 4 — Integration (EPIC-APP)
12. Wire Research tab into real app as React component
13. Wire Journal into real app storage (ci-port-{id} coin objects)
14. Wire Learn into real app (progress stored in ci-user)

### Phase 5 — Growth
15. Onboarding flow redesign (George's framework: educate → personalize → FOMO → paywall)
16. Search tab → Discover tab (trending, community research)
17. Social: share your conviction score (not portfolio values)

---

## Design System (from RT-22 — do not change)

```css
--ink: #15140f
--ink-soft: #55534b
--ink-faint: #928f85
--paper: #f8f7f3
--paper-2: #ffffff
--paper-3: #fcfbf8
--line: #ece9e1
--accent: #0a6b4d        /* deep green */
--accent-soft: #e9f2ed
--accent-ink: #07503a
--ai-1: #0a6b4d
--ai-2: #3f7df0
--warn: #bf4730
--amber: #b8841f

/* Conviction signal colors */
--signal-green: #1f9d55
--signal-amber: #e0a423
--signal-red: #cf3a2c
--signal-black: #3d3d3d

Fonts: Fraunces (display) + Hanken Grotesk (body)
Border-radius: 22px / 14px / 11px
Shadows: layered soft (not hard borders)
```

---

## Financial Disclaimer (required on all screens)
"CryptoIdea is a portfolio tracking and research tool for informational purposes only. Nothing here is financial, investment, or tax advice. Cryptocurrency is highly volatile and you can lose money. Always do your own research before making any investment decision."

---

*Last updated: June 2026 · Version 1.0 · CryptoIdea*
