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

## PORTFOLIO-TEXT-SIZE — Coin Detail card readability (font-size bumps + retire kv-sm)
- Phase: G1  (awaiting G2 plan approval)
- CRYP: CRYP-91  (Story; To Do)
- G1 confirmed: yes         (size map locked in NEXT-STEPS §PORTFOLIO-TEXT-SIZE; scope decision Option A)
- G2 approved: no           (no code before this is yes)
- Plan (files): pending architect — expected: src/styles/app.css (9 font-size bumps + delete .kv-row.kv-sm block) · src/components/Detail.jsx (drop kv-sm on 2 rows) | tests: kv-sm retirement is unit-testable; font-size bumps browser-verify + build | docs: DESIGN-PASS.md (next DP round) · CLAUDE.md (design-follow-on note)
- Fix-round: 0 / 3
- Open findings: none
- Branch: claude/portfolio-text-size
- Built: no
- Merged: no
- Agents this item: 1 (architect)  — G1 gap-grounding done inline (source-verified the CoinInfo shared-selector leak)
- Updated: 2026-08-07
- Decisions (G1): Q1 = **Option A** — bump the 4 shared base rules directly; the CoinInfo overlay's ticker/hero-pill/kv rows grow too (accepted, consistent readability win; browser-verify no overflow at the 560 narrow track). No Detail-scoping wrapper. Size map + kv-sm retirement locked in NEXT-STEPS.
