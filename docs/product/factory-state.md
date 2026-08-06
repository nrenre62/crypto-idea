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

## PORTFOLIO-NUM-FIX — Portfolio number-display correctness (Gap Group A)
- Phase: inner-loop
- G1 confirmed: yes         (6 fixes A1–A6 locked; NARROW scope — Portfolio/Detail/CoinInfo/AddEntry + new pure money.js)
- G2 approved: yes          (plan approved 2026-08-06 — standalone pure splitMoney; 5 display-honesty edits; 2 dark-safe CSS rules)
- Plan (files): src/utils/money.js (new) · src/components/{Portfolio,Detail,CoinInfo,AddEntry}.jsx · src/styles/app.css | tests: tests/unit/money.test.js (new) + {Portfolio,Detail,CoinInfo,AddEntry}.test.jsx | docs@finalize: interview.md (new map row) · ERRORS.md · CLAUDE.md · NEXT-STEPS.md
- Fix-round: 1 / 3
- Open findings: none  (design dark-contrast on .chg-pill.muted resolved fix-round 1; verify GREEN 951/951, security SAFE)
- Branch: claude/portfolio-num-fix
- Built: no
- Merged: no
- Agents this item: 8 (spec-drafter, consistency-sweep, architect, test-author, client-builder, test-tier-verifier, secure-by-design, design-consistency)
- Updated: 2026-08-06
- Decisions (G1): 1a narrow scope (Research formatter-drift logged as a NEW backlog item, not this PR) · 2a add interview.md "Number / money display" map row · 3a neutral pill uses --sd/--sd-s
