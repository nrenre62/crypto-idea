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
- Phase: G1
- G1 confirmed: yes        (🟡 item in NEXT-STEPS §RESEARCH-NO-AI; 4c metric decisions locked 2026-08-03; founder chose Option A = 3 PRs)
- G2 approved: no          (no code before this is yes)
- Plan (files): TBD — architect to plan extending the pure pulse.js layer with P-1 attribution / P-2 effective-N / P-3 7d drawdown / P-4 7d volatility + the "Integrated line set" reshape (P-1 line, P-2 merged into R-C, "This week" P-3+P-4 line SUPERSEDES R-E in the Pulse). Key open q: how each coin's 7d sparkline reaches pulseFacts (priceAdapter/usePrices) for the daily portfolio-value reconstruction.
- Fix-round: 0 / 3
- Open findings: none
- Branch: claude/research-metrics  (cut off master 9e2bbb3 = React 19 + 4a + 4b)
- Built: no
- Merged: no
- Agents this item: 0
- Jira: CRYP-97 (In Progress)
- Slice note: BUILD-LOOP #13 PR **4c of 3 (final)**. Extends 4b's pulseFacts with four deterministic
  insight metrics under S1–S4. NOT purely additive — it RESHAPES the 4b Pulse line set per the locked
  "Integrated line set": adds a P-1 "what drove it" line, merges P-2 effective-N into R-C, and adds a
  "This week" (P-4 vol + P-3 drawdown) line that SUPERSEDES R-E's one-clause risk pointer in the Pulse
  (the RiskMeter card's structural rank-risk is untouched). Needs the per-coin 7d sparkline for P-3/P-4.
  No rules/callable/api/dep → no test:rules. Completes item 4.
- Updated: 2026-08-08
