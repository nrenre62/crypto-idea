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

## PR-E2.5 — Atomic app-wide AI budget-cap reservation (reserve-then-settle) (CRYP-107)
- Phase: built (awaiting G3 merge)
- Provenance: PLANNED (founder-directed "the new PR for the server for the AI, done completely"; scope locked by PR-E decision 4-A — separate pre-flip server PR closing the [MED] non-atomic read-then-charge overshoot). G1 interview skipped (security hardening, no product question); architect found no open founder questions.
- G1 confirmed: yes (Story CRYP-107 filed)
- G2 approved: yes (architect plan-of-record; reserve-then-settle mirroring consumeDailyBudget, EST_MAX_CENTS=12¢ derived)
- Plan (files): functions/ai-cost.js (reservationMaxCents + reserveMonthCents; settle via chargeMonthCents negative delta) · functions/index.js (researchAsk gate 6 reserve + finally settle) · tests/unit/ai-cost.test.js + tests/functions-callable.test.js (CI-only) · docs (NEXT-STEPS, PRICING §4, CLAUDE.md, BILLING.md, interview.md AI-budget row) — NO client/rules/openapi change
- Fix-round: 1 / 3
- Open findings: none (1 go-live follow-up: real emulator concurrency test + settle-throw-in-finally note)
- Branch: claude/plan-b-pr-e25-atomic-ai-cap (off master 728a8ec)
- Built: yes 57ffc60 (range 78ee7f4..57ffc60)
- Merged: no
- Agents this item: 13
- Updated: 2026-08-14
- Sibling: PR-E3 (#87, CRYP-106) built + CI-green, awaiting founder merge (block lives on the PR-E3 branch)

## JOURNAL-POLISH — Journal/thesis type-scale + floating coin header + honest disclaimers (CRYP-105)
- Phase: built (awaiting G3 merge)
- Provenance: PLANNED (🟩 GREEN locked plan in NEXT-STEPS §JOURNAL-POLISH; G1 interview skipped, Story CRYP-105 filed + In Progress)
- G1 confirmed: yes (founder interview 2026-08-09, 9 locked decisions)
- G2 approved: yes (written NEXT-STEPS plan carried the founder yes; architect = non-blocking plan-of-record)
- Plan (files): src/components/Journal.jsx · src/components/Portfolio.jsx · src/components/Search.jsx · src/styles/app.css · src/features/research/styles/research-tab.css · tests/unit/Journal.test.jsx · docs (DESIGN-PASS.md, DESIGN-REVAMP.md, NEXT-STEPS.md)
- Fix-round: 0 / 3
- Open findings: none
- Branch: master-6mrr02-journal-polish (restarted fresh off origin/master 4d2ae6d after PR #60 merged; new PR to open at G3)
- Built: yes (this commit — master-6mrr02-journal-polish tip)
- Merged: no
- Agents this item: 11 (architect, test-author, client-builder, test-tier×2, secure-by-design, design-consistency, simplifier, consistency-sweep, docs-scribe, integrator)
- Updated: 2026-08-12

*(Recently merged: item 4 — 4a PR #46 `bfdbdf0` (CRYP-93) · 4b PR #50 `9e2bbb3` (CRYP-95) · 4c PR #53 `907085c` (CRYP-97); **#14 ARCHITECTURE-DOC** PR #56 `0fbe36b` (CRYP-100) + ledger PR #57 `17f9865`; **#10 LAUNCH-FREE Part B** PR #58 `92b68d4` (CRYP-101); **FLOATING-HEADER** PR #60 `1edbef2` (CRYP-102); **#11 ADMIN-SEP** PR1 #61 `e10a92c` (CRYP-103a) + PR2 #62 `9528f59` (CRYP-103b) — Story CRYP-103 Done; **#12 PLAN-LIMITS-MAX** PR1 #64 `061e5a4` (Part A) + PR2 #65 `d5dc32d` (Part B) — Story CRYP-104 Done. Run rows in `factory-runs.md`.)*
