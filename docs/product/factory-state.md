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

## ADMIN-SEP (#11) — admin/user separation (CRYP-103) — PR2 in flight
- Provenance: PLANNED (🔶 CHECKPOINT, decisions locked 2026-08-03) — G1 interview skipped, G2 = non-blocking plan-of-record
- Phase: G3 (PR2 = Part C, built + pushed; awaiting founder squash-merge)
- G1 confirmed: yes (written/locked plan; Story CRYP-103 filed)
- G2 approved: yes (plan-of-record; founder confirmed 2-PR split + drop legacy@ + added Part A1)
- Split: **2 sequenced PRs** — PR1 = Parts A + A1 + B (CRYP-103a) ✅ MERGED · PR2 = Part C (CRYP-103b) ← in flight
- **PR1 (CRYP-103a) ✅ MERGED** 2026-08-10 — squash `e10a92c` (PR #61). Parts A (server admin-exclusion) + A1 (user-detail backstop) + B (owner-only listAdmins roster).
- **PR2 (CRYP-103b) — Part C** — C-1 harden `guards.requireManager` (no-role/unknown admin refused the WRITE surface via `manager-required`; READ surface unchanged) + drop `legacy@` seed · C-2 hard-cap owners at 2 (`set-admin.js` + pure `functions/owner-cap.js`) · deferred MED = `assertTargetNotAdmin` refuses suspend/tier/limits/**sign-out** on any admin target (server-backs A1).
- Plan (PR2 files, as built): functions/guards.js · functions/owner-cap.js (new) · functions/index.js (assertTargetNotAdmin + 4 call sites + denied() manager-required) · functions/scripts/set-admin.js · functions/scripts/seed-emulator.js · tests/unit/guards.test.js · tests/unit/owner-cap.test.js (new) · tests/unit/admin-0-guards.test.js (await-pin widened) · tests/functions-callable.test.js · Gap-7 prose (CLAUDE.md, README, API-SECURITY.md, BACKEND-ADMIN-DECISIONS.md, ADMIN-PANEL-AUDIT.md, NEXT-STEPS.md)
- Jira: CRYP-103 (Story) — closes only when PR2 merges
- Fix-round: 0 / 3 (no red rounds; secure-by-design LOW #1/#2 folded in as `e1d4275`)
- Open findings: none. secure-by-design SAFE (0 HIGH / 0 MED; LOW #1 adminSignOutUser admin-target guard → FIXED, LOW #2 await-pin widened to assertTarget* → FIXED, LOW #3 fail-open on getUser error → consciously ACCEPTED as the house pattern). api-contract IN SYNC (no openapi change). No firestore.rules change (no test:rules). No client/CSS change (design-consistency N/A). simplifier SKIPPED — minimal diff, reuses existing patterns (assertTargetNotAdmin↔adminTrashUser, ownerCapDecision↔guards/billing pure-helper).
- Branch: claude/admin-sep-partc (PR2) off master `e10a92c`
- Built: yes 7cf7d4c (RED) → ac8d163 (impl) → e1d4275 (sec fixes) → f047509 (docs). Local: unit 1064/1064, build clean, node --check valid. Integration = CI. Awaiting push + PR open + founder G3.
- Merged: PR1 yes; PR2 no
- Agents this item: 23 (PR1 18 + PR2 5: secure-by-design, api-contract, docs-scribe + 2 CI/merge helpers)
- Updated: 2026-08-10

*(Recently merged: item 4 — 4a PR #46 `bfdbdf0` (CRYP-93) · 4b PR #50 `9e2bbb3` (CRYP-95) · 4c PR #53 `907085c` (CRYP-97); **#14 ARCHITECTURE-DOC** PR #56 `0fbe36b` (CRYP-100) + ledger PR #57 `17f9865`; **#10 LAUNCH-FREE Part B** PR #58 `92b68d4` (CRYP-101); **FLOATING-HEADER** PR #60 `1edbef2` (CRYP-102). Run rows in `factory-runs.md`.)*
