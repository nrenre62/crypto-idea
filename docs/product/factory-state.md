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

## RESEARCH-NO-AI-4a — Research tab honesty gate (AI-CHAT-SWITCH + framing)
- Phase: built  (awaiting G3 merge decision)
- G1 confirmed: yes        (🟩 GREEN in NEXT-STEPS §AI-CHAT-SWITCH + §RESEARCH-NO-AI; decisions locked; founder chose Option A = 3 sequenced PRs)
- G2 approved: yes         (founder yes 2026-08-08)
- Plan (files): functions/features.js (desc string) · research/api/ai-status.js NEW (AI_PROXY_LIVE=false — moved off ai-client.js so the test's factory-mock can't swallow it) · ai-client.js (xref comment) · Research.jsx (chatEnabled) · ResearchTab.jsx (tab filter + aiChrome + usePulse gate + onAsk + disclaimer) · OverviewView.jsx · Pulse.jsx (AI-status pill) · CoinCard.jsx (onAsk gate) · AskView.jsx + useAsk.js (drop offline apology) · EmptyState.jsx · research-tab.css (.ai-status) · admin-dashboard.jsx (MOVE aiResearch toggle to AI screen) · tests: NEW ResearchTab.test.jsx + admin-dashboard.test.jsx ext. Verify-only: CoinsView.jsx, usePulse.js.
- Fix-round: 0 / 3   (green first build pass — no fix-loop)
- Reviews: verify GREEN (unit 964/964) · secure SAFE (0 findings) · design CONSISTENT (0 must-fix; 1 advisory) · api-contract SKIPPED (no callable/openapi/api change)
- Simplifier: SKIPPED — the 1 advisory (orphaned `usePulse.offline` dead state) is deferred to PR 4b, which reworks usePulse wholesale; touching it now would double-churn that file.
- Open findings: none blocking (1 advisory deferred to 4b)
- Branch: claude/research-no-ai
- Built: yes  b6d32d1  (red checkpoint 81732f0 → green impl b6d32d1; pushed)
- Merged: no
- Agents this item: 7   (architect · test-author · client-builder · test-tier-verifier · secure-by-design · design-consistency · docs-scribe)
- Jira: CRYP-93 (In Progress)
- Slice note: BUILD-LOOP #13 split into 3 PRs (founder Option A, 2026-08-07).
  **4a (this)** = the honesty gate: `aiResearch` flag → `chatEnabled`/`aiChrome`, `AI_PROXY_LIVE=false`,
  AI-status pill replacing the "AI is offline" apology, gate gradient/Regenerate/disclaimer, hide the Ask
  chat tab + per-coin Ask button when off, neutral empty-state copy, MOVE the admin toggle to the AI
  settings screen, `functions/features.js` description string. Keeps today's single-line deterministic
  Pulse text (the richer multi-signal Pulse + Daily Brief = 4b; RESEARCH-METRICS P-1…P-4 = 4c).
- Updated: 2026-08-07
