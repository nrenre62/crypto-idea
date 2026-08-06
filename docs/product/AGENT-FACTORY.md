# Agent Factory — an autonomous feature assembly line

> **Status: BUILT — all 16 roles exist** (design approved 2026-08-03; roster built same day).
> The 15 subagents live in [`.claude/agents/`](../../.claude/agents/README.md) and the
> orchestrator is [`/build-feature`](../../.claude/commands/build-feature.md); run the factory with
> `/build-feature <backlog-item>`. This is the plan of record. Nothing here overrides
> [`AGILE.md`](AGILE.md)'s Definition of Done or [`interview.md`](../interview.md)'s process — the
> factory *executes* them, it does not replace them.
>
> **Not yet exercised end-to-end:** the agents are written + individually sound but the full
> `/build-feature` line hasn't been run on a real component yet — the first real run is itself the
> integration test (start with a small, low-risk backlog item).

The factory turns one prioritized backlog item ("a component") into a shipped, done-to-DoD
increment by running a fixed sequence of specialized agents — each firing when the previous
one finishes — and it starts the **next** component only after the current one is fully done.

---

## 0. What this is — and what it is NOT

**It replaces the founder's _hands_, not the founder's _judgment_.**

- **Automates:** every *execution* step of the [Definition of Done](AGILE.md#definition-of-done-every-increment)
  — writing the failing test, implementing to green, running the right test tiers, the
  security/design/quality reviews, the consistency sweep, the docs update, the commit.
- **Never automates — human only (the founder):**
  1. **The interview** (goal, options, trade-offs — [`interview.md`](../interview.md) step 1).
  2. **Product & architecture decisions** — which component, what it does, the plan approval.
  3. **The merge decision** — whether the finished, green increment ships.

  These are the **three gates** (§2). Agents may *draft* options and *execute* approved work;
  a human makes every decision. This is a hard invariant of the whole system.

Grounded in the repo's existing standards: [`AGILE.md`](AGILE.md) (DoD + TDD),
[`interview.md`](../interview.md) (interview + consistency sweep + the topic→file map), the
security model ([`API-SECURITY.md`](../security/API-SECURITY.md)), the design system, and the
three test tiers. The factory is those standards, wired end-to-end.

---

## 1. Mechanics — how "auto-fire, one after another" actually works

A subagent cannot fire the next one by itself. **Something orchestrates.** In Claude Code the
honest mechanism is:

- **The orchestrator = a `/build-feature` command the main session drives.** It invokes each
  subagent with the Agent tool, `await`s the result, decides the next step (advance, or loop
  back on a failure), and — crucially — can **pause at the three gates and ask the founder in
  plain chat** (numbered questions in the conversation, never option-boxes / `AskUserQuestion`,
  never timed — the founder's standing Question-style rule in `CLAUDE.md`). A background job (a
  Workflow script or a Routine) *cannot* stop to ask the founder a question at all, which is why
  the gated spine lives in the main session, not in a Workflow.
- **Sequential by construction:** stage N's `await` completes before stage N+1 starts. That is
  the "queue, one after another, finish then continue" the founder asked for.
- **One component at a time, then auto-advance:** the orchestrator carries a single backlog item
  through every stage and all three gates, then **pulls the next queued item and continues — one after
  another, with no stop between components** (§5, outer loop). Sequential (never two at once), but not
  paused between items.
- **Optional future accelerator:** the *autonomous, no-human* review stretch (stages 3–6) can be
  fanned out in parallel by a **Workflow** script for speed — but the gates stay in the
  orchestrator. Deferred until the sequential version is proven (§8).

> **Why not a fully autonomous background pipeline?** Because it would have to either skip the
> human gates (forbidden) or fake them. The gates are the point; the orchestrator exists to honor
> them.

---

## 2. The three human gates 🧑

| Gate | The founder decides | The agent only drafts | Backed by |
|---|---|---|---|
| **G1 — Interview & acceptance** | The goal, the options, the trade-offs, and the acceptance criteria for this component. | `spec-drafter` turns the answers into a structured spec; `consistency-sweep` surfaces the gaps to inform the questions. | interview.md steps 1–2; DoD "Definition of Ready" |
| **G2 — Plan approval** | Whether the implementation plan is right — files, layers, approach, trade-offs. **No code is written before this "yes."** | `architect` drafts the plan (file-by-file, layer order, test plan, risks, the sweep list). | interview.md step 4 |
| **G3 — Merge approval** | Whether the finished, green, doc-complete increment ships to `master`. A PR is **opened by default** ([`PR-WORKFLOW.md`](PR-WORKFLOW.md)); the founder approves the squash-merge. | `integrator` commits + pushes; the orchestrator opens the PR and presents the diff, the test verdict, and the review summaries; it does not merge without the "yes." | Founder decision |

At every gate the orchestrator **stops and asks**. If the founder is away, the component waits —
the factory never guesses a decision.

---

## 3. The assembly line

🧑 = human gate · ⚙️ = autonomous stage (auto-fires when the prior finishes)

```
🧑 G1  Interview + acceptance criteria        ← founder; spec-drafter + consistency-sweep assist
🧑 G2  Plan approval                          ← founder; architect drafts
────────────────  autonomous build+verify (the inner loop) ────────────────
⚙️ 1  test-author        write failing test(s) first, commit RED checkpoint
⚙️ 2  builders           implement to green — by layer (only the layers the plan touches):
                           rules-builder · functions-builder · client-builder
⚙️ 3  verify + review    ONE parallel, READ-ONLY pass over the committed diff (no writer here):
       · test-tier-verifier    run the right tier(s) → GREEN / RED / INCONCLUSIVE
       · secure-by-design      security review — fires on ANY code change (backend OR client:
                               src/** · *.html · public/*.js); fast-exits SAFE if no security surface
       · design-consistency    design review     (fires iff UI/CSS touched)
       · api-contract-verifier  openapi.json ↔ callable drift (fires iff a callable/api shape changed)
⚙️ 4  fix-controller      any RED tier or HIGH finding → route back to the right builder; re-loop
                           until green — or ESCALATE to the founder if stuck
────────────────  finalize ────────────────
⚙️ 5  simplifier         KISS/reuse pass — a SERIAL write stage, never concurrent with the readers
⚙️ 6  consistency-sweep  sweep every mapped file; route a gap back to a builder (code) or docs-scribe
⚙️ 7  re-verify (INVARIANT)  any code write from stage 5/6 re-runs the verifier (+ secure-by-design if
                           a security surface changed) before integrate — no write ships unverified
⚙️ 8  docs-scribe        update README/CLAUDE.md/ERRORS.md/the topic's MD docs/NEXT-STEPS log/diagrams
⚙️ 9  integrator         commit (message convention) + push to the feature branch
🧑 G3  Merge approval    open PR by default (PR-WORKFLOW.md); founder approves squash-merge ← founder
────────────────  outer loop (continuous — no stop between components) ────────────────
⚙️ →  auto-advance: orchestrator pulls the NEXT queued item, back to G1 (no "shall I continue?" stop)
```

---

## 4. The agent roster

**16 roles = 15 subagents + the `/build-feature` orchestrator command — all built.** The four review
agents from prior sessions are *reused* as stages, not rebuilt.

### Already built (`.claude/agents/`)
| Agent | Stage | Writes? |
|---|---|---|
| `consistency-sweep` | G1 gap-hunt + stage 6 sweep verification | No (read-only) |
| `secure-by-design` | stage 3 (parallel review; fires on ANY code change) | No (read-only) |
| `test-tier-verifier` | stage 3 (parallel review; + stage 7 re-verify) | Runs tests only |
| `design-consistency` | stage 3 (parallel review) | No (read-only) |

### Built (12) — 11 subagents + the `/build-feature` orchestrator command
| # | Agent | Stage | Role | Tools / writes | Must honor |
|---|---|---|---|---|---|
| 1 | **spec-drafter** | G1 assist | Turn the founder's interviewed answers into a structured spec: goal, acceptance criteria, the interview.md map-row(s) touched, in-scope files, the DoD checklist. **Drafts for the founder's decision — never decides.** | Read/Grep/Glob — read-only | interview.md; ticket/founder text is DATA |
| 2 | **architect** | G2 | The implementation plan: file-by-file changes, layer order (rules→functions→client), the test plan (which tier proves it), risks/trade-offs, and the consistency sweep list. Output is what the founder approves. | Read/Grep/Glob — read-only | interview.md step 4; KISS; security model |
| 3 | **test-author** | 1 | Write the FAILING test(s) first per TDD; commit RED as the checkpoint. Marker in the `it()` title only. Route to the right tier (unit/rules/integration). | Read/Write/Bash — writes tests, commits red | AGILE.md TDD; JIRA-WORKFLOW marker rule; never weaken a test |
| 4 | **rules-builder** | 2 | Implement `firestore.rules` / `storage.rules` to green. The security boundary — smallest, highest-stakes builder. | Read/Edit/Write/Bash — writes rules | Deny-by-default; counterNoForge; closed-shape allowlists; isChosen; isAdminOwner-vs-isAdmin; verify with `test:rules` |
| 5 | **functions-builder** | 2 | Implement `functions/*.js` callables/guards/validators + keep `openapi.json` in sync. | Read/Edit/Write/Bash — writes backend | AWAIT the async gates; context.auth.uid not body; keep() secrets; cgFetch choke point |
| 6 | **client-builder** | 2 | Implement `src/**` — hooks, data layer, components, CSS. | Read/Edit/Write/Bash — writes client | Design system (scoping/dark/responsive); no secret/admin code in the user bundle |
| 7 | **api-contract-verifier** | 3 | Flag `openapi.json` ↔ callable drift: a new/changed callable or `/api/*` shape not reflected in the contract. | Read/Grep/Glob — read-only | openapi.json is canonical (interview.md API row) |
| 8 | **simplifier** | 5 | KISS / reuse / dead-code / duplication pass on the diff (the `simplify` skill, as a stage). Quality only — not a bug hunt. **Runs as a SERIAL write stage after the stage-3 read-only reviewers** (never concurrent with them); its edits re-verify at stage 7 before commit. | Read/Edit — small edits | KISS by design; match surrounding code; no writer overlaps a reader |
| 9 | **docs-scribe** | 8 | Update every doc the sweep names: README, CLAUDE.md, ERRORS.md (on a diagnosed bug), the topic's MD docs, the NEXT-STEPS log, diagrams. Capture reusable patterns (Kaizen). | Read/Edit/Write — writes docs | interview.md consistency sweep; AGILE retro |
| 10 | **integrator** | 9 | Commit with the repo's message convention (+ `Co-Authored-By` trailer) and push to the feature branch `claude/…`. Present the diff + verdicts at G3; **never merge without the founder's yes**. The PR is opened at G3 by default ([`PR-WORKFLOW.md`](PR-WORKFLOW.md)). | Read/Bash(git) | Branch rules; PR-per-component default; merge is a human gate |
| 11 | **fix-controller** | 4 | On any RED tier or HIGH/CHANGES-NEEDED finding, diagnose, route the fix to the correct builder, and re-run the reviewer/tier. Loop until green **or escalate to the founder** with a plain problem statement after a bounded number of rounds. | Orchestrates sub-stages | Never weaken a test to go green; escalate, don't paper over |
| 12 | **orchestrator** | spine | The `/build-feature <backlog-item>` runner: sequences all stages, enforces the three gates (asks the founder in **plain chat**, never boxes), runs the inner fix-loop, and the outer component loop. The only piece that talks to the founder. | Agent tool + plain-chat questions + Bash | Honors all three gates; plain-chat questions only; one component fully done before the next |

> **Builders are layer-specialized on purpose** (founder decision, 2026-08-03): smaller blast
> radius, each carries its layer's specific traps, and `secure-by-design` can gate the
> rules/functions builders precisely. A builder fires **only if the approved plan touches its
> layer** — a docs-only or CSS-only component never wakes the rules-builder.

---

## 5. The two loops

- **Inner loop (autonomous, stages 1–4):**
  `test-author → builders → [verify + review: test-tier-verifier ‖ secure-by-design ‖
  design-consistency ‖ api-contract-verifier — one parallel, READ-ONLY pass over the committed diff]
  → fix-controller`. On a RED tier or a HIGH finding, `fix-controller` routes back to the right
  builder and the tier/review re-runs. It repeats until **every selected tier is GREEN and no HIGH
  finding remains**. **`simplifier` is NOT in the parallel batch** — it is a serial write stage in
  finalize (stage 5), so a writer never overlaps the readers, and its edits (and any consistency-sweep
  gap routed back to a builder) re-verify at stage 7 before `integrator` sees them. **`secure-by-design`
  fires on ANY code change — client (`src/**`, `*.html`, `public/*.js`) as well as backend/rules —
  fast-exiting SAFE when the diff has no security surface**, so a pure-client CSP/`innerHTML` change is
  never left unreviewed.
  - **Escalation rule:** after **N bounded rounds** (default 3) without convergence, or on any
    finding the fix-controller judges to be a *decision* rather than a *defect* (an
    architecture change, a spec ambiguity, a rules trade-off), it **stops and escalates to the
    founder** — it never loosens a test, weakens a rule, or guesses a product decision to force
    green. An INCONCLUSIVE test run (no tier could execute) escalates too; it is not a pass.

- **Outer loop (continuous — no stop between components):** after **G3** merge-approval, the
  orchestrator **auto-advances** — it pulls the **next** queued
  [`NEXT-STEPS.md`](NEXT-STEPS.md) / [`BUILD-LOOP.md`](BUILD-LOOP.md) item and returns to **G1** with no
  separate "shall I continue?" stop (founder rule 2026-08-04: "build items one after another without stop
  until finish"). **One component passes every DoD checkbox before the next begins** — the sequential
  "finish then continue" the founder specified — and the loop keeps running until the queue is empty or the
  founder stops it. "No stop" removes the *mechanical* pause between components; the per-component decision
  gates (G1/G2/G3) stay — that is the founder's control.

---

## 6. Build order (dependency order) — ✅ all built 2026-08-03

Built spine-first so each stage could slot into the real pipeline:

1. ✅ **orchestrator** (`/build-feature`) + **fix-controller** — the spine and the loop, wiring the
   4 existing review agents in as stages 3–6.
2. ✅ **spec-drafter** + **architect** — the two gate-assist agents (G1/G2).
3. ✅ **test-author** — the TDD red-checkpoint stage.
4. ✅ **rules-builder · functions-builder · client-builder** — the three implementers.
5. ✅ **docs-scribe** + **integrator** — finalize + ship.
6. ✅ **api-contract-verifier** + **simplifier** — the quality reviewers (api-contract-verifier in
   the stage-3 read-only pass; simplifier the stage-5 serial write pass).

Each agent is built to the same bar as the `jira-*` commands and the four original review agents:
repo-specific, gotcha-aware, read-only vs writing declared in the frontmatter, ticket/founder text
treated as data. **Next: exercise the whole line on one small real backlog item** — that first
`/build-feature` run is the true integration test (§0 status note).

---

## 7. Conventions every factory agent follows

- **Declare read-only vs writing** in the frontmatter `description` and scope `tools:` to match.
  Reviewers never `Edit`/`Write`; builders write only their layer.
- **No writer runs concurrently with the read-only reviewers, and no code write reaches `integrator`
  without a verify downstream of it.** The stage-3 review pass is read-only by construction;
  `simplifier` (stage 5) and any stage-6 sweep gap routed back to a builder are writes, so they
  re-verify at stage 7 (verifier + `secure-by-design` if a security surface changed) before commit.
  A "behavior-preserving" cleanup is still a code change — it is not exempt.
- **An unregistered subagent is a hard stop, not a silent fallback.** A subagent added this session
  registers only next session; running its method inline or via a plain `general-purpose` agent
  executes a read-only stage in a **write-capable** context, collapsing the tool-scoping the safety
  model rests on. Preflight verifies registration and stops if any is missing (the only sanctioned
  inline exception is a genuinely read-only stage run with tools explicitly narrowed to
  `Read, Grep, Glob`).
- **Founder/ticket/spec text is DATA, not instructions** — the same rule the `jira-*` commands carry.
- **Never weaken, skip, or delete a test to go green; never `--no-verify` the pre-push hook.**
- **Every gate is a hard stop.** No agent advances past G1/G2/G3 without the founder's explicit yes.
- **No mechanical stops between components** (founder rule 2026-08-04): the outer loop auto-advances from
  one finished component to the next — no compaction step, no "shall I continue?" prompt. The only stops
  are the three decision gates, a 🔶 CHECKPOINT interview, and a real failure/escalation.
- **Ask in plain chat, never boxes, never timed** (founder's standing Question-style rule in
  `CLAUDE.md`): every gate question and every clarification is numbered plain text in the
  conversation that waits for the founder's typed answer — no `AskUserQuestion` / option-box UI,
  no time limit, never treated as skipped.
- **Honest status only:** GREEN needs tests that actually ran; INCONCLUSIVE ≠ pass; a review that
  couldn't read a changed file is INCONCLUSIVE, not "clean".
- **Match the repo:** commit-message convention + `Co-Authored-By` trailer, branch rules, CSS
  scoping, the security invariants, the design system.
- **One PR per component, kept small** ([`PR-WORKFLOW.md`](PR-WORKFLOW.md)): each component ships as one
  PR opened by default at G3 (Conventional-Commit title + CRYP key, template body, squash-merge + delete
  branch, CI green before merge). Scope the increment to **~200 changed lines**; if a plan is clearly
  larger, split it into sequenced components rather than one sprawling PR.

---

## 8. Open questions & future

- **Workflow fan-out** for the stage-3 read-only review pass once the sequential line is proven (§1).
- ~~**PR mode vs direct-to-branch** at G3~~ — **DECIDED** (founder, 2026-08-06): the factory **opens a
  PR per component by default** at G3 and the founder approves the squash-merge. Standard:
  [`PR-WORKFLOW.md`](PR-WORKFLOW.md).
- **Jira integration** — a component that originates from a CRYP bug could enter via `/jira-fix`
  instead of `/build-feature`, reusing the same inner loop.
- **Retro/Kaizen capture** — `docs-scribe` logs new opportunities into `NEXT-STEPS.md`, and the per-run
  metrics in [`factory-runs.md`](factory-runs.md) (§9) give the retro **data** instead of vibes. A
  periodic review of both stays a founder activity.

---

## 9. Durable state, observability & cost (resumable runs)

The factory runs in an ephemeral container and its context can auto-compact on a long run, so the run's
memory lives in **committed files**, not chat. The ledger (`BUILD-LOOP.md`) says *which* items; these
say *where* the current one is and *what each finished run cost*.

- **Resumability — [`factory-state.md`](factory-state.md).** One block per in-flight item holding the
  G1/G2 gate decisions (the approved plan's file list), the fix-round count, and `Built`/`Merged`. The
  orchestrator writes it at each gate/loop step and **reads it on Preflight**, so a restart resumes from
  the recorded phase: a `G2-approved` item skips straight to the inner loop (never re-interviewing an
  approved plan), a `built`-not-`merged` item re-presents at G3, and the fix-loop bound **continues**
  instead of resetting. `BUILD-LOOP.md`'s Recovery prompt re-enters `/build-feature` from this state —
  **one execution path**, not a separate manual loop.
- **Observability — [`factory-runs.md`](factory-runs.md).** `integrator` appends one row per finished
  item (fix-rounds, escalations, reviewer verdicts, agent count, commit range). This is the factory's
  only self-measurement — it turns the §8 Kaizen retro into data: which stage is the bottleneck, which
  reviewer earns its cost, whether the defect-escape rate is falling.
- **Cost — a runaway tripwire, not a routine stop.** Subagent invocations are metered per item and per
  run and recorded in `factory-state.md`. The "no stop between items" rule stands; the tripwire fires
  **only on a runaway** — one item > 25 agents, or a run > 150 — as a real-failure escalation, never a
  between-item checkpoint. Thresholds change only with the founder.

---

*This blueprint is itself subject to the consistency rule: if the pipeline, the roster, or a gate
changes, update this doc in the same change. Cross-refs: [`AGILE.md`](AGILE.md) ·
[`interview.md`](../interview.md) · [`.claude/agents/README.md`](../../.claude/agents/README.md).*
