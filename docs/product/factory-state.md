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

## PLAN-LIMITS-MAX (#12) — maximize plan limits + lazy-load reads
- Provenance: PLANNED (🔶 CHECKPOINT, decisions locked 2026-08-03 rev.2) — G1 interview skipped; founder gave GO for **full scope** 2026-08-10 ("go on #12 full scope")
- Phase: G2 (architect plan-of-record + consistency-sweep running)
- G1 confirmed: yes (written/locked plan; limits + Part-B-gate locked)
- G2 approved: founder GO received (full scope); architect = non-blocking plan-of-record
- Scope: **Part A** limit bumps (Starter 3/30/300 · Pro 6/100/1000 · Premium 15/200/2000; prices unchanged) across DEFAULT_PLANS (index.js) + firestore.rules fallbacks + stored config/app.plans + useAdminDashboard mirror + Login PLAN_BENEFITS + index.html/landing.js copy + firestore.indexes.json exemptions + PRICING/USER-BENEFITS/PRODUCT-DECISIONS docs + LAUNCH-FREE §A sync. **Part B** lazy-load reads (useAuthSession loadPortfolios — tx for active portfolio only; never wrong/zero P&L on an unopened portfolio — KISS design TBD at build).
- Open design detail: Part B P&L summary for unopened portfolios — pick KISS (load-on-switch+cached summary vs persisted per-portfolio summary); constraint = never show wrong/zero P&L. Architect to recommend.
- Touches `firestore.rules` → **test:rules:solo REQUIRED** (CHECKPOINT). Prices UNCHANGED. No new dep.
- Deploy-gate (locked): raised Pro/Premium limits ship to prod ONLY with Part B + Wave-B abuse controls (App Check + rate limiter + addCoinGuarded). Starter raise deployable independently. Record in PRICING.md + go-live.
- Overlaps LAUNCH-FREE §A (Starter) — this supersedes it (3/30/300 > 2/30/100).
- Jira: CRYP-1?? (Story — file at G1/build start)
- PR plan: TBD (likely 2 PRs — Part A limits + Part B lazy-load — pending architect recommendation; each <200 lines, one concern)
- Fix-round: 0 / 3
- Branch: claude/plan-limits-max off master `03050b3`
- Built: no
- Merged: no
- Agents this item: 0 (launching architect + consistency-sweep)
- Updated: 2026-08-10

*(Recently merged: item 4 — 4a PR #46 `bfdbdf0` (CRYP-93) · 4b PR #50 `9e2bbb3` (CRYP-95) · 4c PR #53 `907085c` (CRYP-97); **#14 ARCHITECTURE-DOC** PR #56 `0fbe36b` (CRYP-100) + ledger PR #57 `17f9865`; **#10 LAUNCH-FREE Part B** PR #58 `92b68d4` (CRYP-101); **FLOATING-HEADER** PR #60 `1edbef2` (CRYP-102); **#11 ADMIN-SEP** PR1 #61 `e10a92c` (CRYP-103a) + PR2 #62 `9528f59` (CRYP-103b) — Story CRYP-103 Done. Run rows in `factory-runs.md`.)*
