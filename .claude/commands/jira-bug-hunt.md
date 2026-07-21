---
description: Autonomous bug hunt — suites + scale/isolation/privacy probes against the EMULATOR, verified findings, a dated report, proposed Jira bugs. Never fixes anything.
argument-hint: "[full | suites | scale | isolation | tabs] (optional — default full)"
---

Hunt for bugs. Scope: $ARGUMENTS (default: `full` — every phase below, in order).

## 0 · Hard rules (read before anything runs)

- **This command never fixes.** No source edits, no test edits, no doc edits — its only COMMITTED
  write is the report (phase 6); the gitignored `.tmp/` probe scripts + test artifacts are the one
  exception. If you catch yourself writing a fix, stop: fixing starts only after the user approves
  a finding, and it goes through `/jira-fix`, not here.
- **Emulator only.** Every live probe runs under `firebase emulators:exec --project demo-crypto-idea
  --config firebase.solo.json …` (alternate ports, so a running `start:all` stack is untouched).
  Never point a probe at a real Firebase project — if the environment carries live credentials
  (`GOOGLE_APPLICATION_CREDENTIALS`, a non-demo project id), stop and say so.
- **A finding must reproduce twice before it is reported as a bug.** The suites have a documented
  flake — a *different* test failing on unchanged code (`GO-LIVE-AUDIT.md` §3b · `NEXT-STEPS.md`
  §FLAKE). One red run proves nothing.
- **A probe that didn't run is INCONCLUSIVE, not clean.** Report it as a gap, never as a pass.
- Preconditions: repo root (`package.json` + `vite.config.js` present) and a clean tree — stop otherwise.

## 1 · Phase SUITES — baseline

Run the three tiers, judging each in three states (GREEN / RED / INCONCLUSIVE —
[`JIRA-WORKFLOW.md`](../../docs/testing/JIRA-WORKFLOW.md) §7). Bash timeout ≥ 300000 ms each.

```bash
npx vitest run --reporter=default --reporter=json --outputFile.json=.tmp/jira-report.json
node scripts/jira-test-map.js .tmp/jira-report.json     # never read the ~190 KB artifact by hand
npm run test:rules:solo
npm run test:integration:solo
```

An existing red here is a FINDING to record (after the phase-5 flake filter), not something to fix.

## 2 · Phase SCALE — accounts & plan limits (the 50-user probe)

Write a **throwaway probe script into the repo's gitignored `.tmp/`** — e.g. `.tmp/probe-scale.mjs`
(`.mjs`: the repo's `package.json` is `"type": "module"`). It must live INSIDE the repo tree, not the
session scratchpad: Node resolves `@firebase/rules-unit-testing` (a root devDependency) by walking up
from the script file's own directory, so a probe outside the repo dies with `MODULE_NOT_FOUND`. Never
commit it — this spec is the canonical source, so a run always probes the *current* rules. Load the
real `firestore.rules` and run under
`firebase emulators:exec --only firestore --project demo-crypto-idea --config firebase.solo.json "node .tmp/probe-scale.mjs"`:

- **50 simulated users** split across tiers: ~17 Starter (tier `free` — "Starter" is the public name
  of the free tier), ~17 `pro`, ~16 `premium`. Seed each `users/{uid}` doc + `tier` with
  `withSecurityRulesDisabled` (users can't write their own tier — that's by design and is itself
  probed in phase 3).
- **Fill 20 / 40 / 60 / 80 / 100% of each plan's limits.** Defaults (from `firestore.rules`
  `maxPortfolios`/`maxCoins`/`maxTx`; `config/app.plans` may override, clamped to hard ceilings):
  Starter **1 portfolio · 10 coins/portfolio · 50 tx/coin** · Pro **3 · 50 · 2,000** · Premium
  **15 · 1,000 · 5,000**.
- **Seed counters, don't create thousands of docs** (tdd-testing): the rules read maintained
  counters, so set the counter to the target with rules disabled, then make REAL writes at the
  boundary — the at-limit write ALLOWED, the +1 write DENIED. Also assert a client counter
  **decrease** is denied (the cap-bypass class).
- **Denial honesty:** for each boundary denial, note whether the client could tell it apart from
  other `permission-denied` causes — the mislabeled-limit-toast class (`ERRORS.md` §A1 ·
  `NEXT-STEPS.md` §DI).
- **Account lifecycle** — needs its OWN runner with the Auth emulator (the phase's main line starts
  only Firestore; without auth started, the client SDK falls back to the default `:9099` auth — a
  running `start:all` stack's, which must stay untouched):
  `firebase emulators:exec --only auth,firestore --project demo-crypto-idea --config firebase.solo.json "node .tmp/probe-lifecycle.mjs"`.
  Assert: a fresh signup (integration-tier patterns — the real `registerUser`) produces the expected
  profile shape; self-writes of `tier`, `deleted`, `deletedAt`, and any admin/role field are ALL
  denied.

## 3 · Phase ISOLATION — data leaks between users

With user A's context against user B's data, assert DENY on every one of:

- **get AND list** (list is a separate op — enumeration) of `users/{B}`, B's `portfolios`, `coins`,
  `transactions`, the coin doc carrying B's `journal`, and `users/{B}/learn/progress`;
- **writes** to any of the above;
- client access (any role) to the server-only collections: `audit`, `rateLimits`, `webhookEvents`,
  `config`, and `cache/**` — the shared market data is **proxy-only**; `firestore.rules` closes it
  to clients entirely;
- **self-escalation**: A writing admin/role/tier fields into A's own profile.

Data that IS shared (`cache/universe`, `cache/trending`, the public `/api/config` flags) must contain
**no user data** — but never read it via Firestore (that's correctly denied, see above). Fetch it
through the `/api` endpoints under the solo functions emulator
(`firebase emulators:exec --only firestore,functions --project demo-crypto-idea --config firebase.solo.json …`
— the endpoints lazily populate the cache docs on demand, no cron needed) and check the shapes there.

[`ISOLATION.md`](../../docs/security/ISOLATION.md) records the live audit (23 cross-tenant probes
denied). This phase **re-proves** it against today's rules; it never assumes it.

## 4 · Phase TABS — data-flow & privacy audit (where does personal information live?)

Static code audit — fan out read-only agents; no live stack needed. Produce the per-tab map for the
report: for each of the 5 tabs, what it reads, what it writes, **where it's stored**, and which of it
is **personal**. Expected baseline (verify against the current code — flag drift, don't copy):

| tab | reads / writes | stored at | personal? |
|---|---|---|---|
| Portfolio | holdings + transactions | `users/{uid}/portfolios/…/coins/…/transactions` | YES — financial data |
| Research | holdings derived in memory; shared universe data via `/api`; coin `journal` (conviction allowlist); WRITES `coinOrder` on drag-reorder (R32) | `coinOrder` on `users/{uid}/portfolios/{pid}` | derived-personal; the SHARED cache must hold no user data |
| Journal | thesis free text (`journal` on the coin doc, ≤2,000 chars) | `users/{uid}/…/coins/{id}.journal` | YES — user-authored text |
| Learn | level / XP / streak / module state | `users/{uid}/learn/progress` | YES — behavioral; lesson content is a static bundle, not personal |
| Search | queries → the `/api/search` proxy | server cache only | query strings — check they are not logged linked to a uid |

Specifically hunt for: a NEW write path a tab gained, personal data entering any SHARED doc, and user
text leaving the app — the Research "Ask" AI is offline by design today (`askClaude` throws); if that
ever changes, user text may only travel through the server-side proxy, never from the client to a
third party.

## 5 · Phase VERIFY — kill the false positives

For every candidate finding: reproduce it a second time in isolation; check `ERRORS.md`,
`DESIGN-PASS.md`, and `GO-LIVE-AUDIT.md` for "known / by design"; classify severity as labels
(`prio-high` / `prio-med` / `prio-low` — CRYP has no priority field). Survivors are **CONFIRMED**;
everything else is an **OBSERVATION**.

## 6 · Phase REPORT — write it down, fix nothing

Write `docs/testing/bug-hunts/BUG-HUNT-<YYYY-MM-DD>.md` (the hunt's only COMMITTED write):

- one-line verdict per phase — GREEN / findings / **INCONCLUSIVE + why**;
- CONFIRMED findings (severity · evidence · repro · the tier that proves it) separated from
  OBSERVATIONS;
- the per-tab privacy map from phase 4;
- **what was NOT covered** — a silent gap reads as "covered everything";
- the line "No fixes were applied."

Commit the report on the current branch. This is the document the user reviews.

## 7 · Phase JIRA — propose, then file Bugs (only after a yes)

Print a table — one proposed ticket per CONFIRMED finding (summary · severity label · one evidence
line) — then **stop and wait for an explicit yes**. On yes, file each via the
[`/jira-bug`](jira-bug.md) template with the extra label `bug-hunt` (tickets are permanent — there is
no delete tool — so nothing unverified is ever filed), and note the new keys back into the report.

> Never paste raw test output, seeded emails, or absolute local paths into a ticket.

## 8 · What happens next (NOT this command)

Fixing is a separate, approved pipeline. For each ticket the user approves:
`/jira-fix CRYP-nn` (failing test first, committed red) → an `ERRORS.md` entry for the diagnosis →
update whichever docs/skills the consistency map ([`docs/interview.md`](../../docs/interview.md))
lists for the touched topic. The hunt itself never edits any of those.
