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

## PAYMENTS-OFF — paidPlansEnabled + checkout default-OFF (free-only launch) (CRYP-113)
- Phase: G2-approved (inner build loop — RED checkpoint next)
- Provenance: AD-HOC (founder 2026-08-18 — "I want also the payment gate OFF even as default"). G1 interview DONE (locked), G2 architect plan approved ("G").
- G1 confirmed: yes (founder 2026-08-18 — paidPlansEnabled default-OFF · checkout default-OFF · reversible flag-gated (keep payment code + admin toggles, admin-only) · one plan Starter · no payment access by any route · gate both stragglers)
- G2 approved: yes (architect plan + gate the two stragglers /pro-success + R29 prompt when off)
- Plan (files): functions/flags.js (paidPlansOn → ===true + comment) · functions/features.js (DEFAULTS.checkout=false + comment) · functions/index.js (:2506/:2547/:3433 reads + :2622 saveConfig merge → ===true; fail-direction comments :572/:650/:703/:2919) · src/CryptoIdea.jsx (init paidPlansEnabled:false + checkout:false; parsers :211/:216 ===true; /pro-success gate) · src/hooks/useAdminDashboard.js (:189 init + :230/:240 parsers ===true) · src/components/admin-dashboard.jsx (:1190/:1290 toggle displays ===true) · R29 recheckoutDue && paidPlansOn · tests (flags.test.js, features.test.js, admin-dashboard.test.jsx new+flip, 4 walkthrough re-seed, functions-callable.test.js integration re-seed CI-only) · docs sweep (flags.js/features.js comments, CLAUDE CRYP-101/ADMIN-2, BILLING §3.7, API-SECURITY, BACKEND-ADMIN-DECISIONS, ARCHITECTURE, openapi 5 descs, README, NEXT-STEPS, interview.md, secure-by-design.md + functions-builder.md checkout exception)
- Fix-round: 0 / 3
- Open findings: none
- Branch: claude/payments-off-by-default (off origin/master 428624b)
- Built: no
- Merged: no
- Agents this item: 1 so far (architect G2; builders/reviewers spawned at stages 1–3)
- Updated: 2026-08-18

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

*(Recently merged: item 4 — 4a PR #46 `bfdbdf0` (CRYP-93) · 4b PR #50 `9e2bbb3` (CRYP-95) · 4c PR #53 `907085c` (CRYP-97); **#14 ARCHITECTURE-DOC** PR #56 `0fbe36b` (CRYP-100) + ledger PR #57 `17f9865`; **#10 LAUNCH-FREE Part B** PR #58 `92b68d4` (CRYP-101); **FLOATING-HEADER** PR #60 `1edbef2` (CRYP-102); **#11 ADMIN-SEP** PR1 #61 `e10a92c` (CRYP-103a) + PR2 #62 `9528f59` (CRYP-103b) — Story CRYP-103 Done; **#12 PLAN-LIMITS-MAX** PR1 #64 `061e5a4` (Part A) + PR2 #65 `d5dc32d` (Part B) — Story CRYP-104 Done; **PR-E (Wave-B live-AI foundation)** — PR-E3 #87 `04cd129` (CRYP-106) + PR-E2.5 #88 `e38103d` (CRYP-107); **B3 coins** — PR-1 #99 `e3a16e6` (CRYP-108 — addCoinGuarded server + rules lockdown; resolved a merge with master's #90–#98 overhaul) + PR-2 #100 `afd476b` (CRYP-109 — client rewired through the callable); Story CRYP-108 + CRYP-109 Done. **B3 transactions** — PR-tx-1 #101 `1a567da` (CRYP-110 — addTransactionGuarded server + rules lockdown); Story CRYP-110 Done. PR-tx-2 #102 `71ec041` (CRYP-111 — client addTransaction rewire); Story CRYP-111 Done — **B3 fully complete (CRYP-108/109/110/111).** PR #103 `428624b` (CRYP-112 — Research Overview-only + aiResearch default-OFF); Story CRYP-112 Done. **PAYMENTS-OFF** (CRYP-113 — paidPlansEnabled + checkout default-OFF, free-only launch) now in flight. Run rows in `factory-runs.md`.)*
