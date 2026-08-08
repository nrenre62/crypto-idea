# Factory state — durable resume memory (per in-flight item)

**Purpose.** The Agent Factory (`/build-feature`) runs in an ephemeral container and its context can
auto-compact on a long run. The **ledger** (`BUILD-LOOP.md`) and the backlog (`NEXT-STEPS.md`) already
survive that — but the per-item **gate decisions** (G1 confirmed, the G2-approved plan) and the
**fix-loop round count** used to live only in chat, so a restart re-interviewed the founder for a plan
they already approved and reset the fix bound. This file is where the orchestrator writes that state so
a fresh context resumes **exactly where it left off**.

**Committed on the feature branch** (not git-ignored) — that is what lets a new container read it.

## How the orchestrator uses it

- **On Preflight:** read this file first. If an item is mid-flight, resume from its `Phase`:
  `G2-approved` → skip G1/G2, jump straight to the inner loop; `built` (not `merged`) → re-present at
  G3; a recorded `Fix-round` → continue the bound from there, don't reset it.
- **Writes it** after G1 is confirmed, after G2 is approved (with the plan's file list), on each
  fix-loop round, at commit (`built` + hash), and at G3 (`merged`). When an item is fully merged, its
  block is removed (history lives in `factory-runs.md`).

## Format — one block per in-flight item

```
## <ITEM-KEY> — <short title>
- Phase: G1 | G2-approved | inner-loop | finalize | built | merged
- G1 confirmed: yes/no        (acceptance criteria locked)
- G2 approved: yes/no         (no code before this is yes)
- Plan (files): <the architect's approved file list, one line>
- Fix-round: N / 3            (durable — survives a restart)
- Open findings: <list, or none>
- Branch: claude/<name>
- Built: no | yes <commit>
- Merged: no | yes
- Agents this item: <count>   (see the cost tripwire in build-feature.md)
- Updated: <date>
```

---

## In-flight items

*(4a + 4b merged — PR #46 `bfdbdf0` (CRYP-93) + PR #50 `9e2bbb3` (CRYP-95); run rows in `factory-runs.md`.)*

## RESEARCH-NO-AI-4c — RESEARCH-METRICS (P-1…P-4), final slice of #13
- Phase: built  (awaiting G3 merge decision)
- G1 confirmed: yes        (🟡 item in NEXT-STEPS §RESEARCH-NO-AI; 4c metric decisions locked 2026-08-03; founder chose Option A = 3 PRs)
- G2 approved: yes         (founder yes 2026-08-08; Q1=drop number >100% → "the main driver"; Q2=keep R-E as thin-data fallback — both = architect recs)
- Plan (files): src/features/research/utils/pulse.js ONLY production change (+~60 lines): new facts contrib[]/topContributor/topContributorShare, neff (1/Σwᵢ², clamp[1,N]), drawdown7d + vol7d (from Vₜ=Σ amount×spark reconstructed off holdings — spark+amount already ride on portfolio.holdings, NO threading), weekly gate; reshape pulseLines → R-A·R-B·P-1·(R-C+P-2)·"This week"(P-3+P-4, SUPERSEDES R-E; R-E is thin-data fallback). usePulse/OverviewView/Pulse/useSharePulse UNCHANGED. Tests: extend research-pulse.test.js. Docs: NEXT-STEPS §RESEARCH-NO-AI + CLAUDE.md (drop "4c pending"). Client-only; no rules/callable/api/dep.
- Key decisions: (a) P-1 uses PAST-VALUE weights (contribᵢ=pᵢ·rᵢ/then) so Σcontrib===perf[tf] exactly (spec's literal current-weight wᵢ breaks the locked "sum exactly" identity); (b) "This week" all-or-nothing — omits if any holding lacks a usable daily spark.
- Fix-round: 1 / 3
- Reviews (round 1): verify GREEN (1015/1015) · design CHANGES (1 must-fix) · adversarial-metric CONFIRMED HIGH F1/F2 · secure SKIPPED (no security surface).
  **F1/F2 ship-blocker:** on a ≥3-coin book where the biggest position OPPOSES the net move (e.g. BTC −50% while alts rally, net +5%), topContributor=max|contrib| picks the DRAG (BTC), share=round(−25/5·100)=−500 → "Bitcoin drove about −500% of that move" (nonsensical + sign-inverted). Guard `share<=100` is one-sided. Tests missed it (all P-1 fixtures 2-coin, where top mover always shares net sign). Identity/P-2/P-3/P-4/weekly-gate proven ROBUST.
  **Founder decision A (2026-08-08):** attribute P-1 to the top contributor IN THE DIRECTION OF the net move (the real driver), not max|contrib|. FOLD-IN fixes: gate P-1 on count≥2 (no vacuous 1-coin line); "at a 7-day high" when drawdown rounds to 0%; show the share number only when 1≤share≤100 else "was the main driver". ACCEPT+document (not fixed in 4c): F5 tail-align ~1-day skew (Wave-B persisted-series roadmap), F6 "7-day" label on ~3 pts (thin new-coin history), vol ±0.0% on flat weeks.
- Fix-round 1 verify: GREEN — targeted 27/27, full test:unit 1019/1019, build clean (dist-name-guard clean). Must-fix F1/F2 resolved + test-locked (red f973753 → green 8d51b25). Orchestrator tidy-up 4fe910f: bold the P-1 share figure to match the bold-figures convention (impl + test regex aligned; not weakening).
- Open findings: none (F3/F5/F6 + minors accepted+documented in NEXT-STEPS)
- Simplifier: SKIPPED — pulse.js flat/clean, no dead code; the fix-round + tidy-up already left it minimal.
- Branch: claude/research-metrics  (cut off master 9e2bbb3 = React 19 + 4a + 4b)
- Built: yes  4fe910f  (feat 4845923 → red f973753 → fix 8d51b25 → bold tidy 4fe910f; pushed)
- Merged: no
- Agents this item: 9   (architect · test-author · client-builder · test-tier-verifier · design-consistency · adversarial-metric[general] · test-author[fix] · client-builder[fix] · docs-scribe; + orchestrator bold tidy-up)
- Jira: CRYP-97 (In Progress)
- Slice note: BUILD-LOOP #13 PR **4c of 3 (final)**. Extends 4b's pulseFacts with four deterministic
  insight metrics under S1–S4. NOT purely additive — it RESHAPES the 4b Pulse line set per the locked
  "Integrated line set": adds a P-1 "what drove it" line, merges P-2 effective-N into R-C, and adds a
  "This week" (P-4 vol + P-3 drawdown) line that SUPERSEDES R-E's one-clause risk pointer in the Pulse
  (the RiskMeter card's structural rank-risk is untouched). Needs the per-coin 7d sparkline for P-3/P-4.
  No rules/callable/api/dep → no test:rules. Completes item 4.
- Updated: 2026-08-08
