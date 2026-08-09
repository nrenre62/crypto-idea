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

## FLOATING-HEADER — pinned brand-bar header + 30px gap + sticky settings (CRYP-102)
- Phase: built
- G1 confirmed: yes (founder interview 2026-08-09, 8 locked decisions)
- G2 approved: yes (written NEXT-STEPS plan carried the founder yes; architect = non-blocking plan-of-record)
- Plan (files): src/styles/app.css · src/features/research/styles/research-tab.css · src/features/research/components/ResearchTab.jsx · src/CryptoIdea.jsx · src/components/Account.jsx · docs
- Fix-round: 2 / 3
- Founder decisions (2026-08-09): F3 → Option B (settings header = separate --paper/#F6F5F0 sticky bar, card body below as the white --paper-2 frame — pure-CSS reallocation, DOM unchanged so USER-SET-UI tests stay green); Q2 → scroll-to-top on Account open confirmed OK (F4 accepted).
- Open findings being fixed: F1 avatar z-index → 20 (above research header z16); F2 → wrap research .apphead+.segwrap in ONE sticky container, drop the top:76px magic number; F3 → Option B CSS reallocation.
- Reviews: secure=SAFE, test-tier=GREEN 97/97, design-consistency=CONSISTENT (F1/F2/F3 resolved round 2), build+dist-no-names clean, simplifier ran (1 cleanup).
- Branch: master-6mrr02
- Built: yes 9d6974a
- Merged: no
- Agents this item: 0
- Updated: 2026-08-09

*(none other in flight.)*

*(Recently merged: item 4 — 4a PR #46 `bfdbdf0` (CRYP-93) · 4b PR #50 `9e2bbb3` (CRYP-95) · 4c PR #53 `907085c` (CRYP-97); **#14 ARCHITECTURE-DOC** PR #56 `0fbe36b` (CRYP-100). Run rows in `factory-runs.md`.)*
