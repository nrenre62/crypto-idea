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

*(4a merged — PR #46 → master `bfdbdf0`; CRYP-93 Done; run row in `factory-runs.md`.)*

## RESEARCH-NO-AI-4b — multi-signal deterministic Pulse (pulseFacts) + Daily Brief
- Phase: built  (awaiting G3 merge decision)
- G1 confirmed: yes        (🟡 PARTLY-BUILT item in NEXT-STEPS §RESEARCH-NO-AI; 4b content decisions locked 2026-08-03; founder "go for PR 4b" 2026-08-08)
- G2 approved: yes         (founder yes 2026-08-08)
- Plan (files): NEW src/features/research/utils/pulse.js (pulseFacts + pulseLines R-A→R-B→R-C→R-E→R-F + briefFacts B-1/B-2/B-3) · usePulse.js (render multi-line via pulseFacts; DROPPED orphaned offline field) · OverviewView.jsx (Brief from briefFacts; deleted "volatility" line; diversification card unchanged) · Pulse.jsx verify-only (Rich already multi-line) · tests: NEW research-pulse.test.js (15) + 3 render assertions in ResearchTab.test.jsx. Client-only; no rules/callable/dep. Scope guard held: R-C base (no P-2 merge), R-E stands, NO P-1…P-4 metrics (=4c).
- Fix-round: 0 / 3   (green first build pass — no fix-loop)
- Reviews: verify GREEN (unit 982/982) · design CONSISTENT (0 must-fix; 2 advisory copy notes → G3 founder call) · secure SKIPPED (pure client utils + copy — no functions/rules/auth/billing/secret/api surface) · api-contract SKIPPED (no api change)
- Simplifier: SKIPPED — pulse.js already flat/clean, no dead code (orphaned offline field already dropped in the build); the 2 advisories are copy choices, not simplifications.
- Advisories (both copy, non-blocking): (1) R-A renders "+3.2%" vs spec "up/down 3.2%" (test-driven, honest); (2) R-F >60% nudge echoes the always-on diversification card (spec-sanctioned overlap, hard-rule #5). Surface at G3.
- Open findings: none blocking
- Branch: claude/research-pulse-facts  (cut off master bfdbdf0 = React 19 + 4a; baseline unit 964/964 green)
- Built: yes  e6e79db  (red checkpoint 471babc → green impl e6e79db; pushed)
- Merged: no
- Agents this item: 6   (architect · test-author · client-builder · test-tier-verifier · design-consistency · docs-scribe)
- Jira: CRYP-95 (In Progress)
- Slice note: BUILD-LOOP #13 PR **4b of 3**. Base multi-signal Pulse via a NEW pure `pulseFacts`(+`briefFacts`)
  layer: R-A value/perf (always) · R-B unrealized P&L vs cost (invested>0, honest sign) · R-C concentration
  (≥2 holdings) · R-E one-clause risk pointer · R-F diversification nudge (only top-2>60%) · empty-state copy.
  Daily Brief rewrite: B-1 portfolio 24h ($ + %, "≈0%" near-zero rule) · B-2 biggest gainer · B-3 biggest
  decliner (B-2≠B-3, drop the "volatility" mislabel). Under S1–S4 compliance (no verb on named coin, no
  advice/target, held-only, no roll-up score, neutral labels, never NaN). Also drops the orphaned
  `usePulse.offline` field (4a follow-up). **NOT in 4b:** P-1 attribution / P-2 effective-N / P-3 drawdown /
  P-4 volatility → PR 4c. No rules/callable/api/dep change → no test:rules.
- Updated: 2026-08-08
