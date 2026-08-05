---
description: Read-only gap-hunt for the Interview & Consistency process — find where code/rules/docs drift on a topic
argument-hint: <topic or proposed change, e.g. "pricing" or "raise Pro to $12/mo">
---

Run a consistency sweep for: $ARGUMENTS

Spawn the **`consistency-sweep`** subagent (via the Agent tool, `subagent_type:
"consistency-sweep"`) and pass it the topic or proposed change above. That agent
is **read-only** — it reads `docs/interview.md`'s consistency map, opens every
file in the affected topic row(s), and reports where the code, `firestore.rules`,
`README.md`, `openapi.json`, and the MD docs **DISAGREE / are STALE / are
MISSING**, with `file:line` evidence — plus, for a proposed change, the exact
**sweep list** of every file the change must touch so nothing drifts.

## What to do with the result

- **Relay the agent's report** — the ranked gap list, the sweep list, and the
  verdict (CONSISTENT / DRIFT FOUND / INCONCLUSIVE). The agent's report is not
  shown to the user automatically, so surface what matters.
- **Do NOT edit anything from this command.** This is the *interview.md step 2*
  gap-hunt (and the step-5 verification). Any actual fix follows the full
  process: interview → plan → get a "yes" → sweep → verify → commit.
- If the agent returns **INCONCLUSIVE** (couldn't read a mapped file), say so and
  name the file — never present a partial read as "consistent".
- If the agent flags the **map itself** as stale/incomplete (a value found in a
  file the row doesn't list), note it: `docs/interview.md` is subject to the same
  consistency rule and its row should be corrected in the same change.

## If the subagent isn't registered yet

A freshly added `.claude/agents/*.md` only registers on the **next** session, so
in the session where it was just created `subagent_type: "consistency-sweep"`
errors with "agent type not found". If that happens, run the same read-only
method inline (or via a `general-purpose`/`Explore` agent): read
`docs/interview.md`, open every file in the topic's row, diff each against the
**bold canonical** file, and report gaps with `file:line` evidence. Never fix —
report.
