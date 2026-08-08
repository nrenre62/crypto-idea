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

*(item 4 fully merged — 4a PR #46 `bfdbdf0` (CRYP-93) · 4b PR #50 `9e2bbb3` (CRYP-95) · 4c PR #53 `907085c` (CRYP-97); run rows in `factory-runs.md`.)*

## ARCHITECTURE-DOC — canonical docs/decisions/ARCHITECTURE.md + 3-anchor wiring (BUILD-LOOP #14)
- Phase: inner-loop  (PLANNED GREEN docs item; provenance rule CRYP-98 → G1 interview skipped, G2 non-blocking plan-of-record; flows to G3 merge)
- G1 confirmed: yes        (spec decisions were "offered, not answered" — founder confirmed 2026-08-08: accept 1/2/3; D4 reframed)
- G2 approved: n/a (non-blocking per provenance rule — docs-only, 🟩 GREEN)
- Decisions (founder 2026-08-08): 1 file home `docs/decisions/ARCHITECTURE.md` (src/ARCHITECTURE.md stays sub-doc; audit gets historical banner) · 2 system-wide ~17 ARCH-* rules cross-linking (not copying) the deep docs · 3 wire all 3 anchors (interview.md map row + CLAUDE.md Conventions bullet + AGILE DoD gate, SAME commit) · 4 D3→ARCH-DOC-FIX-1 (inline onclick→landing.js), **D4 REFRAMED → education-page becomes only a link in index.html (removes the component fetch), NOT an api/ wrapper → ARCH-DOC-FIX-2**.
- Plan (files): NEW docs/decisions/ARCHITECTURE.md · src/ARCHITECTURE.md (pointer + D2 fixes) · docs/testing/ARCHITECTURE-AUDIT.md (historical banner + D1 numbers) · docs/interview.md (new map row) · CLAUDE.md (Conventions bullet) · docs/product/AGILE.md (DoD gate) · README.md · docs/product/CODEBASE-MAP.md. Docs-only; no code/rules/dep → no test:rules. Verify: npm run build clean + links resolve + grep-check (no restated tier limits/TTLs/HTTP contract).
- Follow-ups queued (separate REQUIRED items, own interviews when built): ARCH-DOC-FIX-1 (index.html inline onclick → landing.js listeners; browser-verify) · ARCH-DOC-FIX-2 (education-page.jsx → link in index.html, removing the /api/subscribe fetch).
- Fix-round: 0 / 3
- Open findings: none
- Branch: claude/architecture-doc  (off master 907085c)
- Built: no
- Merged: no
- Agents this item: 0
- Jira: CRYP-100 (In Progress)
- Updated: 2026-08-08
