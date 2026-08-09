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

## ADMIN-SEP (#11) — admin/user separation (CRYP-103)
- Provenance: PLANNED (🔶 CHECKPOINT, decisions locked 2026-08-03) — G1 interview skipped, G2 = non-blocking plan-of-record
- Phase: inner-loop (PR1 of 2)
- G1 confirmed: yes (written/locked plan; Story CRYP-103 filed)
- G2 approved: yes (plan-of-record 2026-08-09; founder confirmed 2-PR split + drop legacy@ + added Part A1)
- Split: **2 sequenced PRs** — PR1 = Parts A + A1 + B (CRYP-103a) · PR2 = Part C (CRYP-103b)
- Part A1 (founder addition 2026-08-09): user-detail panel hides Suspend + Delete→Trash for ANY admin (`found.isAdmin`, not just owner) — generalize the L913/L926 owner guard; client backstop.
- Plan (PR1 files): functions/index.js (listUsers/findDuplicateEmails/gatherStats/countSignupsSince exclude admins via adminUidSet(); new exports.listAdmins owner-only read) · src/api/admin.js (listAdmins wrapper) · src/hooks/useAdminDashboard.js (admins state + lazy loadAdmins) · src/components/admin-dashboard.jsx (roster at top of Admin-access drill-in; A1 user-detail backstop; Users render filters !u.isAdmin) · openapi.json (/listAdmins + ListAdminsResultEnvelope/AdminEntry; /listUsers desc) · tests/unit/admin-gate-coverage.test.js (MATRIX += listAdmins:assertOwner) · docs/decisions/ADMIN-PANEL-AUDIT.md (roles matrix row)
- Plan (PR2 files): functions/guards.js (requireManager harden) · tests/unit/guards.test.js · functions/scripts/seed-emulator.js (drop legacy@) · functions/scripts/set-admin.js (owner hard-cap) + Gap-7 prose (guards.js comment, API-SECURITY.md, BACKEND-ADMIN-DECISIONS.md, ADMIN-PANEL-AUDIT.md)
- Jira: CRYP-103 (Story)
- Fix-round: 0 / 3
- Open findings: none
- Branch: claude/admin-sep (PR1); PR2 branch claude/admin-sep-partc off master after PR1 merges
- Built: no
- Merged: no
- Agents this item: 2 (consistency-sweep, architect)
- Updated: 2026-08-09

*(Recently merged: item 4 — 4a PR #46 `bfdbdf0` (CRYP-93) · 4b PR #50 `9e2bbb3` (CRYP-95) · 4c PR #53 `907085c` (CRYP-97); **#14 ARCHITECTURE-DOC** PR #56 `0fbe36b` (CRYP-100) + ledger PR #57 `17f9865`; **#10 LAUNCH-FREE Part B** PR #58 `92b68d4` (CRYP-101). Run rows in `factory-runs.md`.)*
