---
description: Run the CORRECT test tier(s) for the current change and report GREEN / RED / INCONCLUSIVE honestly (knows :solo, timeouts, the flake)
argument-hint: "[optional: a tier (unit|rules|integration), a CRYP key, or a target — defaults to auto-routing the working change]"
---

Verify tests for: ${ARGUMENTS:-the current working change}

Spawn the **`test-tier-verifier`** subagent (Agent tool, `subagent_type:
"test-tier-verifier"`) and pass the target above. It picks the right tier(s) from
what changed, runs them correctly, and reports each as **GREEN / RED /
INCONCLUSIVE**.

## What it knows (so you don't have to remember)

- **Three tiers:** `test:unit` (~552 vitest, ~170 s, node-only) · `test:rules`
  (Firestore emulator) · `test:integration` (auth+firestore+functions emulators —
  the only tier that runs a callable *body*).
- **`:solo` variants** (`test:rules:solo` / `test:integration:solo`) on alternate
  ports — used automatically when a `start:all` stack might hold the defaults.
- **≥300000 ms** Bash timeout (the full unit suite outlives the 120 s default).
- **ZERO tests run = INCONCLUSIVE, never a pass** (port clash / emulator down /
  wrong script). There is no `npm test` script.
- **The documented machine-load flake** — re-runs a red suite once before
  believing it; a *different* test failing each run (or a known-flaky
  `walkthrough`/`watchCoins`/`suspendUser`) is FLAKE, not your change.

## What to do with the result

- **Relay the per-tier verdict** and the overall verdict. Anything but
  every-selected-tier-GREEN is **not** "safe to commit" — say which tier blocks it
  and whether it's a real failure or an unrun/inconclusive tier.
- The agent **never edits, weakens, or skips a test**, and never `--no-verify`s
  the pre-push hook. If it reports a test looks wrong, that's a decision for you +
  the user, not a silent edit.
- **INCONCLUSIVE ≠ green.** If a tier's emulator couldn't start in this
  environment, that tier is unproven — don't report coverage you didn't run.

## If the subagent isn't registered yet

A freshly added `.claude/agents/*.md` registers on the **next** session. Until
then, run the tiers inline per the routing in `.claude/agents/test-tier-verifier.md`
(and `.claude/commands/jira-fix.md` step 6): route by what changed, prefer `:solo`
if a stack is up, timeout ≥300000 ms, and classify GREEN/RED/INCONCLUSIVE
honestly.
