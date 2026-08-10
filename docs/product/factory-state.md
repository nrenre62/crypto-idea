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
- Phase: G3 (PR1 = Part A ✅ MERGED; PR2 = Part B built + verified, pushing + opening PR, awaiting founder squash-merge)
- G1 confirmed: yes (written/locked plan; limits + Part-B-gate locked)
- G2 approved: founder GO received (full scope); architect + consistency-sweep done (plan-of-record). Consistency-sweep found the staged 12-item list MISSED ~8 files → true surface ~24 (6+1 hardcoded mirrors, data-layer.test.js, README/CLAUDE/DESIGN-PASS/ai-tool-policy + the diagram).
- PR split: **2 PRs** — **PR1 = Part A** (limit bumps + full sweep) ✅ MERGED (squash `061e5a4`, PR #64) · **PR2 = Part B** (lazy-load) ← built, off master `061e5a4`.
- Part B design (RESOLVED by architect, KISS Option C — spec authorized the pick): NO per-portfolio P&L display exists; the only cross-portfolio tx reads are 3 COUNT surfaces (usage.js/Account totalTxAllPorts/useUpgrade overLimitImpact) → point them at the persisted per-coin `txCount` (no tx reads) + a `txLoaded` flag → placeholder on the active value card (never wrong/zero P&L). NOT a founder decision.
- Part A files (as built): firestore.rules · functions/index.js DEFAULT_PLANS · 7 client mirrors (useAdminDashboard, useUpgrade TIER_LIMITS, CryptoIdea `_planLim`+3 upsell copy, Login PLAN_BENEFITS, admin-dashboard TIERS, pro-success copy) · index.html #pricing · firestore.indexes.json (new)+firebase.json · tests (firestore-rules + Login + useUpgrade + data-layer + walkthrough) · docs (PRICING/USER-BENEFITS/PRODUCT-DECISIONS/README/CLAUDE/DESIGN-PASS/ai-tool-policy/GO-LIVE-AUDIT/interview + NEXT-STEPS/LAUNCH-FREE §A + the diagram).
- Touches `firestore.rules` → **test:rules verified LOCALLY** (firestore emulator boots here; functions emulator does not). Prices UNCHANGED. No new dep.
- Deploy-gate (locked, RECORDED in PRICING §7 + GO-LIVE-AUDIT): raised Pro/Premium ship to prod ONLY with Part B + Wave-B abuse controls (App Check + rate limiter + addCoinGuarded). Starter raise deployable independently. Stored config/app.plans overrides rule defaults → re-save at deploy.
- Overlaps LAUNCH-FREE §A (Starter) — this supersedes it (3/30/300 > 2/30/100).
- Jira: CRYP-104 (Story, In Progress)
- Part B files (as built): src/api/firebase-database.js (new getCoinsMeta) · src/hooks/useAuthSession.js (loadPortfolios active-only tx + txLoaded through metas-merge) · src/CryptoIdea.jsx (watchCoins txLoaded + activeTxLoaded ctx) · src/components/Portfolio.jsx (txLoaded placeholder) · src/utils/usage.js + src/components/Account.jsx + src/hooks/useUpgrade.js (txCount ?? entries.length) · tests (useAuthSession lazy-load, usage txCount, walkthrough getCoinsMeta mock, data-layer getCoinsMeta round-trip).
- Reviews (PR1 Part A): secure-by-design **SAFE** (0 HIGH/0 MED; 1 LOW = free-tier storage amplification = the pre-recorded Part B/Wave-B deploy gate). design/api/simplifier SKIP (values-only). **PR2 Part B**: client-only (no rules/backend/secret/auth) → secure-by-design SKIP; design-consistency SKIP (tiny value-card placeholder reusing `.muted`/`.port-total`, dark-safe); test-tier: unit 1066/1066 + build clean, getCoinsMeta round-trip = CI.
- Fix-round: 0 / 3 (Part B: 4 walkthrough tests went red on the getCoinsMeta mock gap → mock now delegates to getCoins; not a code defect)
- Branch: PR1 claude/plan-limits-max (merged); PR2 claude/plan-limits-partb off master `061e5a4`
- Built: PR1 yes (merged 061e5a4, PR #64) · PR2 yes 72e81fe (RED) → b6b1aaf (impl). Local: test:unit 1066/1066, build clean. data-layer getCoinsMeta = CI. Awaiting push + PR open + founder G3.
- Merged: PR1 yes; PR2 no
- Agents this item: 5 (architect, consistency-sweep, secure-by-design, docs-scribe ×2)
- Updated: 2026-08-10

*(Recently merged: item 4 — 4a PR #46 `bfdbdf0` (CRYP-93) · 4b PR #50 `9e2bbb3` (CRYP-95) · 4c PR #53 `907085c` (CRYP-97); **#14 ARCHITECTURE-DOC** PR #56 `0fbe36b` (CRYP-100) + ledger PR #57 `17f9865`; **#10 LAUNCH-FREE Part B** PR #58 `92b68d4` (CRYP-101); **FLOATING-HEADER** PR #60 `1edbef2` (CRYP-102); **#11 ADMIN-SEP** PR1 #61 `e10a92c` (CRYP-103a) + PR2 #62 `9528f59` (CRYP-103b) — Story CRYP-103 Done. Run rows in `factory-runs.md`.)*
