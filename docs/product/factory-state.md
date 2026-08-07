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
- Phase: built  (awaiting G3 — merge + PR)
- CRYP: CRYP-92  (Story; To Do)
- G1 confirmed: yes  (🟩 GREEN, decisions locked in NEXT-STEPS §DARK-MODE-FIXES; no re-interview — spec fully detailed w/ loci + gaps G1–G7)
- G2 approved: yes   (plan approved 2026-08-07. Q1=a bright --sr/--sg submit FILL + DARK ink label [AA-safe, ~6.4:1/8.5:1]; Q2=yes fold .tx-badge.sell/.buy tags + .kv-v.kv-sell "Sold" value onto the Sell red. NaN fix = OverviewView-local top2 [Option A]. Structure: ONE PR, TWO commits.)
- Plan (files): pending architect — expected: src/styles/app.css (dark-only .tx-btn.sell red · .seg-btn toggle buy-green/sell-red · .submit-buy/.submit-sell · new --edge-bright:#fff in dark :root) · src/features/research/styles/research-tab.css (dark-only card/coin-card/diversify/stress + neutral .cc-* → --edge-bright; brighten stress + diversify) · src/features/research/components/OverviewView.jsx (NaN guard = DARK-FIX-NaN, own commit) · tests/unit (NaN guard test) · DESIGN-PASS R34 · ERRORS.md (NaN entry) · CLAUDE.md
- Fix-round: 1 / 3  (design-consistency advisory: fragile equal-specificity cross-file cascade for research .card border → fixed 376e771 by consolidating into app.css; re-verified GREEN)
- Open findings: none — verify GREEN (unit 957/957 + build clean) · security SAFE · design CONSISTENT (2 advisory: #1 cascade→FIXED fix-round 1; #2 "dead" Number.isFinite guard→KEPT intentionally as never-NaN defense). Both G2 questions answered (Q1=a, Q2=yes). Plan LOCKED. Commit 1 (DARK-FIX-NaN): OverviewView-local top2 guard + red-first OverviewView.test.jsx + ERRORS.md entry (NaN always-on both themes — deriveRisk has no top2). Commit 2 (dark CSS round, dark-block-only): app.css .tx-btn.sell/.tx-badge.sell/.kv-v.kv-sell→--sr, .seg-btn buy-green/sell-red + active contrast, .submit-* bright fill + DARK ink label; research-tab.css .card/.coin-card/.pos-stat/.diversify/stress→--edge-bright (colored chips keep tint G4) + vivid stress gradient + shining diversify; new --edge-bright:#fff in dark :root. Loci: Detail buttons L106-107; stat-boxes=.pos-stat; DP Round 34. Light byte-for-byte identical (structural + build-diff proof).
- Branch: claude/dark-mode-fixes
- Built: yes  (code ac08cb5 + fix-round 376e771; docs finalize commit follows)
- Merged: no
- Agents this item: 9 (architect, test-author, client-builder, test-tier-verifier, secure-by-design, design-consistency, client-builder[fix-round-1], test-tier-verifier[re-verify], docs-scribe) — simplifier SKIPPED (increment minimal; fix-round removed the sole duplication; NaN guard intentionally retained); dedicated sweep skipped (NEXT-STEPS spec enumerates the file set); integrate by orchestrator (integrator tool-gap)
- Updated: 2026-08-07
- Decisions (G1, all founder-locked 2026-08-05): G1 = NaN diversification note is a FIX, spun out as own required commit DARK-FIX-NaN · G3 = one shared --edge-bright:#fff (opaque white 1px) in dark :root · G4 = white border on NEUTRAL surfaces only (cards + .cc-* stat-boxes); colored chips keep semantic tint. HARD CONSTRAINT: dark-block-only (html[data-theme="dark"]); light mode byte-for-byte identical (prove by diff). Planned PR shape: ONE PR (component #15) with 2 commits (DARK-FIX-NaN functional + dark CSS round) — confirm at G2 per architect.
