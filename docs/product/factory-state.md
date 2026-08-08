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

*(Recently merged: item 4 — 4a PR #46 `bfdbdf0` (CRYP-93) · 4b PR #50 `9e2bbb3` (CRYP-95) · 4c PR #53 `907085c` (CRYP-97); **#14 ARCHITECTURE-DOC** PR #56 `0fbe36b` (CRYP-100) + ledger PR #57 `17f9865`. Run rows in `factory-runs.md`.)*

## LAUNCH-FREE — "Starter-only launch mode" switch, Part B ONLY (BUILD-LOOP #10)
- Phase: G1
- Provenance: PLANNED (locked plan 2026-08-02; 🔶 CHECKPOINT — founder gave the go "Do the #10" 2026-08-08)
- Scope decision (founder 2026-08-08): **Part B ONLY.** Part A (Starter-limit bump) REMOVED from this item — the single Starter at 3/30/300 is owned by #12 PLAN-LIMITS-MAX. So #10 does NOT touch `firestore.rules` limit defaults / DEFAULT_PLANS limits / index exemptions.
- G1 confirmed: yes (locked plan + founder confirmed Part-B-only scope)
- G2 approved: n/a (PLANNED → non-blocking plan-of-record; architect drafts + present, then build)
- Scope (Part B): new server flag `config/app.flags.paidPlansEnabled` (default true). When false: new registrations auto-Starter (onboarding chooser suppressed, server-side); `createSubscription` REFUSES server-side (THE control); billing/pricing UI hidden (app + landing via /api/config); existing paid users untouched; reversible; audited; per-key-KEEP merge in saveConfig.
- Security surface: createSubscription callable gate (proven at integration/callable tier, the only one that runs the body). Likely NO firestore.rules change (flag is server-only config). → rules-builder likely skipped; functions-builder + client-builder + integration tier essential.
- Fix-round: 0 / 3
- Open findings: (awaiting spec-drafter + consistency-sweep)
- Branch: claude/launch-free-mode  (off master 17f9865)
- Built: no
- Merged: no
- Agents this item: 2 (spec-drafter + consistency-sweep, running)
- Jira: (Story to be filed at G1 close)
- Updated: 2026-08-08
