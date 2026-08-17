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

## B3-PR1 — Server-side guarded add-coin write (addCoinGuarded, Option A) (CRYP-108)
- Phase: built (fix-round 1 resolved; PR #99 open — re-pushing for CI re-run, merge on green)
- Provenance: AD-HOC (§0 Wave B B3 stub, no locked plan → G1 interviewed 2026-08-17). Part of founder-sequenced campaign B3 → B5 → B7/B8 → B6-cleanup; each PR ≤~200 lines (PR-1 approved to exceed ~300, cohesive security boundary can't split further), merged before the next.
- G1 confirmed: yes — founder locked: Option A (callable owns write, rules DENY direct client coin-create) split into 2 PRs (this = PR-1 server+rules); App-Check code gate WIRED flag-gated (top-level config/app.appCheckEnforce, enforce off default, overrides GO-LIVE-AUDIT H1 → reconcile H1 docs); throttle = 2s checkCooldown + 100 adds/uid/day; transactions = separate addTransactionGuarded PR later; rate-limiter+App-Check folded into PR-1 (no un-throttled live window).
- G2 approved: yes (founder 2026-08-17 — plan-of-record: size ~300 OK, openapi in PR-1, top-level flag, coordinated deploy w/ PR-2)
- Plan (files): firestore.rules (coin create → if false) · functions/coin-limits.js (NEW pure: coinCapFor + consts) · functions/index.js (addCoinGuarded callable) · openapi.json (/addCoinGuarded) · tests/functions-callable.test.js (CI-only integration) · tests/firestore-rules.test.js (AC8 deny + rework ~9 coin-create cap tests) · tests/unit/coin-limits.test.js (NEW) · docs: API-SECURITY, DATA-FLOW, NEXT-STEPS, H1 reconciliation (CLAUDE.md/GO-LIVE-AUDIT/chooseFreePlan comment + PRODUCT-DECISIONS/CACHE-POLICY/PRICING/BACKEND-ADMIN), guards.js docstring
- Fix-round: 1 / 3 (round 1 = CI integration RED: data-layer.test.js creates coins via the now-denied client addCoin. Fix: seed downstream coins via the addCoinGuarded callable + migrate the 4 client-addCoin-contract tests to PR-2; callable rejects over-2000 journal prose (invalid-argument) instead of clamping, matching validJournal + the DI-1 DATA-INTEGRITY guarantee. Plus 2 earlier secure-by-design LOW advisories folded in.)
- Open findings: none. Round-1 fix committed: test-author db86db1 (data-layer seeds coins via callable + 4 client-contract tests migrated to PR-2 + new functions-callable over-thesis-reject & missing-portfolio cases) + functions-builder 0e97afc (journal prose clamp→reject = invalid-argument). Clamp→reject is an input-validation TIGHTENING (matches openapi maxLength + validJournal) → no fresh secure re-review warranted; api-contract stays IN-SYNC (openapi unchanged). Resolved earlier: LOW#1 path-seg guard (dc4df71) + LOW#2 dead rules helpers (5ac75da). Deferred (tracked): authorization-and-tier-limits.svg redraw → after PR-2 (diagrams/README backlog).
- Reviews: verify GREEN (unit 1229/1229, rules 49/49; integration CI-only — functions emulator un-bootable in sandbox) · sec SAFE (0 High/Med, 2 LOW folded in; rules-simplify re-check SAFE) · api IN-SYNC · design N/A (no UI) · simplifier cleaned (2 dead rules helpers) · sweep: all code+doc files hit
- Branch: claude/b3a-add-coin-guarded-server (off master 244ca55)
- Built: yes (range 252002e RED .. docs+bookkeeping tip; code 6703ba1/bdbef57/dc4df71/5ac75da/c82d885)
- Merged: no
- Agents this item: 14 (spec-drafter, consistency-sweep, architect, test-author, rules-builder, functions-builder, test-tier-verifier, secure-by-design, api-contract-verifier, functions-builder[fix], simplifier, secure-by-design[re-check], docs-scribe, +integrate inline)
- Updated: 2026-08-17

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

*(Recently merged: item 4 — 4a PR #46 `bfdbdf0` (CRYP-93) · 4b PR #50 `9e2bbb3` (CRYP-95) · 4c PR #53 `907085c` (CRYP-97); **#14 ARCHITECTURE-DOC** PR #56 `0fbe36b` (CRYP-100) + ledger PR #57 `17f9865`; **#10 LAUNCH-FREE Part B** PR #58 `92b68d4` (CRYP-101); **FLOATING-HEADER** PR #60 `1edbef2` (CRYP-102); **#11 ADMIN-SEP** PR1 #61 `e10a92c` (CRYP-103a) + PR2 #62 `9528f59` (CRYP-103b) — Story CRYP-103 Done; **#12 PLAN-LIMITS-MAX** PR1 #64 `061e5a4` (Part A) + PR2 #65 `d5dc32d` (Part B) — Story CRYP-104 Done; **PR-E (Wave-B live-AI foundation)** — PR-E3 #87 `04cd129` (CRYP-106) + PR-E2.5 #88 `e38103d` (CRYP-107). Run rows in `factory-runs.md`.)*
