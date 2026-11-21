---
description: Bug hunt against the EMULATOR only — test tiers, plan-limit, cross-user isolation and per-tab privacy probes, verified findings, a dated report. Reports only; never fixes.
argument-hint: "[full | suites | scale | isolation | tabs] (optional — default full)"
---

Hunt for bugs. Scope: $ARGUMENTS (default `full` — every phase below, in order).

## What it does

Probes the app on the local emulator, checks each finding twice, and writes a dated report to
`docs/testing/bug-hunts/YYYY-MM-DD.md`. It **reports**; it never fixes.

## Steps

1. **Preconditions.** Repo root (`package.json` + `vite.config.js`) and a clean tree — stop otherwise.
   If the environment carries live credentials (`GOOGLE_APPLICATION_CREDENTIALS`, a non-demo project
   id), stop and say so.
2. **Baseline the test tiers.** Delegate to the `test-tier-verifier` agent
   ([`/test-tier-verifier`](test-tier-verifier.md)) for `test:unit`, `test:rules:solo` and
   `test:integration:solo`. Record each as GREEN / RED / INCONCLUSIVE.
3. **Scale / limit probe.** Throwaway scripts in the repo's gitignored `.tmp/` (`.mjs`; they must live
   inside the repo so Node can resolve the dev dependencies), run under
   `firebase emulators:exec --only auth,firestore,functions --project demo-crypto-idea --config firebase.solo.json "node .tmp/<probe>.mjs"`.
   Test the **current Starter limits — 3 portfolios / 30 coins per portfolio / 300 transactions per
   coin**: the at-limit write is allowed, the next one is refused. Portfolios are capped by
   `firestore.rules`; **coin and transaction creates are server callables** (`addCoinGuarded`,
   `addTransactionGuarded`), so probe those through the callables, not direct writes. Seed counters
   instead of creating thousands of docs, and check a client can't lower a counter. Note whether each
   refusal is told apart from other errors in the UI (the mislabeled-limit-toast class).
4. **Cross-user isolation probe.** As user A against user B: **get and list** B's profile,
   portfolios, coins, transactions, journal and `learn/progress` are denied; writes to any of them are
   denied; any client access to `audit`, `rateLimits`, `webhookEvents`, `config` and `cache/**` is
   denied; A can't write admin / role / tier / deleted fields on A's own profile. Re-prove it against
   today's rules — never assume [`ISOLATION.md`](../../docs/security/ISOLATION.md) still holds.
5. **Per-tab privacy check** (read-only code review). For each of the 5 tabs — Portfolio, Research,
   Journal, Learn, Search — list what it reads, writes, where it's stored, and what is personal. Flag
   a new write path, personal data in a shared doc, or user text leaving the app.
6. **Verify every finding twice.** Reproduce it a second time in isolation. Check it isn't already in
   [`BUGS.md`](../../docs/testing/BUGS.md) or its "Not bugs (by design)" list. Survivors are
   **CONFIRMED**; the rest are **OBSERVATIONS**.
7. **Write the report** `docs/testing/bug-hunts/YYYY-MM-DD.md`: a one-line verdict per phase
   (INCONCLUSIVE + why where a probe didn't run), the CONFIRMED findings (severity · evidence · repro
   · the tier that proves it), the OBSERVATIONS, the per-tab privacy map, **what was not covered**,
   and the line "No fixes were applied."
8. **Propose, then wait.** Show the CONFIRMED findings in a short table and ask the founder in plain
   chat (numbered questions, no AskUserQuestion) which to log, then wait for a typed answer. After a yes, add each to `BUGS.md` in the [`/log-bug`](log-bug.md) format and note the new
   `BUG-NNN` ids in the report. Fixes go through [`/fix-bug`](fix-bug.md), one bug at a time.

## Hard rules

- **Emulator only — never production.**
- **Never fixes.** No source, test or doc edits except the report (and, after a yes, the `BUGS.md`
  entries). Probe scripts stay in `.tmp/` and are never committed.
- **A finding counts only when it reproduces twice** (the suites have a known flake — `NEXT-STEPS.md` §FLAKE).
- **A probe that didn't run is INCONCLUSIVE, not clean** — report it as a gap.
- Never paste raw test output, seeded emails, or absolute local paths into the report.
