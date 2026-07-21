---
description: Run the test suite and report each CRYP-keyed test's result back onto its Jira ticket (proposes first, never writes unattended)
argument-hint: "[unit | integration | a specific CRYP key] (optional)"
---

Run the tests and sync results to Jira. Scope: $ARGUMENTS (default: the unit tier).

## 0 · Preconditions

Confirm the working directory is the repo root (`package.json` + `vite.config.js`). Stop if not.

## 1 · Run the suite and write a machine-readable artifact

```bash
npx vitest run --reporter=default --reporter=json --outputFile.json=.tmp/jira-report.json
```

Bash **timeout 300000** — the suite takes ~170 s and the 120 s default would kill it. `.tmp/` is
gitignored. Keep `--reporter=default` so the human output still streams.

For the emulator tiers use `npm run test:integration:solo` / `npm run test:rules:solo` (alternate ports,
so they run alongside a live `start:all` stack). Those tiers are `node:test`, not vitest — no JSON
artifact. Extract per-ticket results from their TAP output by line-anchored matching:
`^(not )?ok \d+ - .*CRYP-\d+` (`firebase emulators:exec` interleaves its own log lines into stdout, so
match whole TAP lines — never assume clean TAP). **A run whose output has zero `ok`/`not ok` lines is
INCONCLUSIVE**, same as the mapper's exit 2. When quoting a TAP failure, take only the `error:` line —
never the `location:`/`stack:` fields, which carry absolute local paths.

## 2 · Map results to tickets

```bash
node scripts/jira-test-map.js .tmp/jira-report.json
```

**Never read `.tmp/jira-report.json` directly** — a full run is ~190 KB on a single line. The mapper
exists so you don't have to. It prints one line per `CRYP-` key and exits `0` GREEN / `1` RED /
`2` INCONCLUSIVE. It also exits `2` when a CRYP key's only evidence is **skipped** tests, and reports
that key as `SKIPPED` — a skipped regression test proves nothing about its ticket.

## 3 · Stop here if the run was INCONCLUSIVE

Exit code `2` means **zero tests executed** — a port clash, a missing emulator, a bad script name. You
learned nothing about any ticket.

> **Report the problem to the user and write NOTHING to Jira.** An inconclusive run that closes a ticket
> is the single worst failure mode of this command.

## 4 · Re-run anything red before believing it

`test:integration:solo` and `tests/unit/CryptoIdea.walkthrough.test.jsx` are documented as flaky, with a
*different* test failing each recorded run. Run-by-run table: `GO-LIVE-AUDIT.md` **§3b** (measured
2026-07-20). Standing item: `NEXT-STEPS.md` **§FLAKE**.

**Require two consecutive failures of the same test** before reporting it as a real failure. Re-run just
that test **in its own tier** (trailing colon — these are substring matches, and a bare `CRYP-1` also
selects CRYP-10…):

```bash
npx vitest run -t "<KEY>:"      # unit tier
# integration tier (the name filter must go INSIDE the quoted child command):
firebase emulators:exec --only auth,firestore,functions --project demo-crypto-idea --config firebase.solo.json "node --test --test-force-exit --test-name-pattern '<KEY>:' tests/data-layer.test.js tests/functions-callable.test.js"
```

The re-run must show **at least one executed test** before its green is believed — a filter that matched
nothing is INCONCLUSIVE, not a pass. If the re-run passes, report it to the user as a flake and leave
Jira alone.

## 5 · Propose — then wait for an explicit yes

Print a table of exactly what you intend to do:

| ticket | test result | proposed comment | proposed transition |
|---|---|---|---|

Then **stop and ask for confirmation.** Do not comment on, transition, or create anything until the
user says yes. This command is read-only by default; the user is the trigger for every write.

Rules that hold even after a yes:

- **Never create a Jira issue from a red test.** A failing test is not automatically a new bug — it's
  usually a regression in work-in-progress. If it deserves a ticket, the user runs `/jira-bug`.
- **Only transition to Done on GREEN**, and only for a ticket whose tests all passed.
- **Never transition a ticket the run didn't actually exercise.** No CRYP-keyed test for a ticket means
  no evidence about that ticket — say so rather than inferring anything.

## 6 · Write, with a bounded payload

For each approved ticket: `addCommentToJiraIssue` with the test name, its file (basename), and the
verdict. On failure, the **first line** of the failure message only.

> **Never paste raw test output.** Integration stdout contains seeded user emails and live
> email-verification links; stack traces contain absolute local paths.

Then `getTransitionsForJiraIssue` → `transitionJiraIssue`, matching the transition **by name from that
live response**. Never hardcode a transition id.

## 7 · Summarize

Report what was written, what was skipped and why, and any test that failed without a CRYP key (those
are invisible to this command — mention them so they don't get silently lost).
