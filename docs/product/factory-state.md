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

## B3-tx-PR2 — Client addTransaction rewired through addTransactionGuarded (CRYP-111)
- Phase: G2-approved (inner build loop — client rewire; RED checkpoint next)
- Provenance: PLANNED (the client half of the founder-approved B3 2-PR split; CRYP-110 PR-tx-1 merged #101 `1a567da`). The CRYP-109 analogue for transactions; G1 interview skipped (founder pre-approved the split), Story CRYP-111 filed + In Progress.
- G1 confirmed: yes (folded into CRYP-110's founder G1/G2 2026-08-17 — "4. Yes 2 PR"; client add-tx briefly denied between PR-tx-1 and PR-tx-2, pre-launch, accepted)
- G2 approved: yes (same founder decision; scope = client-only mirror of CRYP-109, no rules/functions/openapi change)
- Plan (files): src/api/firebase-database.js (addTransaction → httpsCallable addTransactionGuarded; map code+details.reason → {success,code,reason,id}; res.data.txId→id; no already-exists branch) · src/CryptoIdea.jsx (addEntry rate-limited toast branch before the limit cap-reconcile) · tests/unit/add-tx-mapping.test.js (NEW, clone of add-coin-mapping) · docs (interview.md client-seam note lands, DATA-FLOW client seam wired, NEXT-STEPS, factory-state/runs)
- Fix-round: 0 / 3
- Open findings: none
- Branch: claude/b3d-add-tx-client-rewire (off master 1a567da)
- Built: no
- Merged: no
- Agents this item: 0 (orchestrator building directly — precise mirror of merged CRYP-109; reviewers spawned at stage 3)
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

*(Recently merged: item 4 — 4a PR #46 `bfdbdf0` (CRYP-93) · 4b PR #50 `9e2bbb3` (CRYP-95) · 4c PR #53 `907085c` (CRYP-97); **#14 ARCHITECTURE-DOC** PR #56 `0fbe36b` (CRYP-100) + ledger PR #57 `17f9865`; **#10 LAUNCH-FREE Part B** PR #58 `92b68d4` (CRYP-101); **FLOATING-HEADER** PR #60 `1edbef2` (CRYP-102); **#11 ADMIN-SEP** PR1 #61 `e10a92c` (CRYP-103a) + PR2 #62 `9528f59` (CRYP-103b) — Story CRYP-103 Done; **#12 PLAN-LIMITS-MAX** PR1 #64 `061e5a4` (Part A) + PR2 #65 `d5dc32d` (Part B) — Story CRYP-104 Done; **PR-E (Wave-B live-AI foundation)** — PR-E3 #87 `04cd129` (CRYP-106) + PR-E2.5 #88 `e38103d` (CRYP-107); **B3 coins** — PR-1 #99 `e3a16e6` (CRYP-108 — addCoinGuarded server + rules lockdown; resolved a merge with master's #90–#98 overhaul) + PR-2 #100 `afd476b` (CRYP-109 — client rewired through the callable); Story CRYP-108 + CRYP-109 Done. **B3 transactions** — PR-tx-1 #101 `1a567da` (CRYP-110 — addTransactionGuarded server + rules lockdown); Story CRYP-110 Done. **B3-tx-PR2** (CRYP-111 — client addTransaction rewire) now in flight. Run rows in `factory-runs.md`.)*
