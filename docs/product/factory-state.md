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

## DARK-MODE-FIXES — dark-only Sell/Buy + Research borders + NaN guard (DP round 34)
- Phase: G1  (awaiting architect G2 plan)
- CRYP: CRYP-92  (Story; To Do)
- G1 confirmed: yes  (🟩 GREEN, decisions locked in NEXT-STEPS §DARK-MODE-FIXES; no re-interview — spec fully detailed w/ loci + gaps G1–G7)
- G2 approved: no    (no code before this is yes)
- Plan (files): pending architect — expected: src/styles/app.css (dark-only .tx-btn.sell red · .seg-btn toggle buy-green/sell-red · .submit-buy/.submit-sell · new --edge-bright:#fff in dark :root) · src/features/research/styles/research-tab.css (dark-only card/coin-card/diversify/stress + neutral .cc-* → --edge-bright; brighten stress + diversify) · src/features/research/components/OverviewView.jsx (NaN guard = DARK-FIX-NaN, own commit) · tests/unit (NaN guard test) · DESIGN-PASS R34 · ERRORS.md (NaN entry) · CLAUDE.md
- Fix-round: 0 / 3
- Open findings: none
- Branch: claude/dark-mode-fixes
- Built: no
- Merged: no
- Agents this item: 1 (architect)
- Updated: 2026-08-07
- Decisions (G1, all founder-locked 2026-08-05): G1 = NaN diversification note is a FIX, spun out as own required commit DARK-FIX-NaN · G3 = one shared --edge-bright:#fff (opaque white 1px) in dark :root · G4 = white border on NEUTRAL surfaces only (cards + .cc-* stat-boxes); colored chips keep semantic tint. HARD CONSTRAINT: dark-block-only (html[data-theme="dark"]); light mode byte-for-byte identical (prove by diff). Planned PR shape: ONE PR (component #15) with 2 commits (DARK-FIX-NaN functional + dark CSS round) — confirm at G2 per architect.
