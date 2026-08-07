# JIRA PLAYBOOK — how CryptoIdea plans, tracks & ships work in Jira

> **Canonical guide for running the whole project in Jira** — the hierarchy, how to write each
> work-item type, the Kanban board, Components & Releases, and how the process shows up as portfolio
> evidence. Distilled from the founder's research note *"Jira workflow"* (Aug 2026) and adapted to this
> repo's real setup (project **CRYP** on `cryptoidea.atlassian.net`, team-managed, Rovo MCP, `claude/…`
> branches, the `test:unit` / `test:rules` / `test:integration` tiers).
>
> Sibling docs: [`JIRA-WORKFLOW.md`](JIRA-WORKFLOW.md) is the narrow **bug → failing-test → fix** loop
> and the test↔ticket marker convention; this playbook is the **planning / hierarchy / release** side.
> [`AGILE.md`](../product/AGILE.md) is the delivery process; [`PR-WORKFLOW.md`](../product/PR-WORKFLOW.md)
> is how a change becomes a pull request.

**Status legend:** ✅ Live on the board today · 🟡 Recommended, not yet applied · ⚠️ Trap — read first.

---

## North star

Jira is CryptoIdea's **process record**; GitHub is the **code record**; they are linked by the CRYP
issue key and nothing is mirrored between them (one source of truth each). Keep Jira **minimal and
professional**: a clean Epic→Story→Done breakdown with testable acceptance criteria and grouped
releases — enough to read as real product engineering, never so much that updating Jira costs more than
doing the work.

Two goals ride on this: (1) an honest, always-current backlog that the [Agent Factory](../product/AGENT-FACTORY.md)
and future-you can execute; (2) **portfolio evidence** — the structured backlog, the release history,
and the CRYP-keyed commits are hireable signal (§7).

---

## 1 · Setup as it actually is (verified live)

- Site `cryptoidea.atlassian.net` · `cloudId` `b7ec4223-6688-45aa-8872-d34ff7713570` · project key **CRYP**
  (project name "CryptoIdea"), a **team-managed** ("next-gen") software project.
- **Work-item types enabled:** Epic · Story · Task · Bug · Feature · Subtask. **Use Epic / Story / Task /
  Bug**; ignore Feature and Subtask unless something genuinely needs breaking down (see §2).
- **The board is already an Epic→Story roadmap** — 9 Epics (feature-area workstreams), the Stories/Tasks
  under them, and a live go-live column. This playbook formalizes what the board already does; it does
  not start from zero.
- A separate **`SUP`** (Support) service-desk project also exists. It is **not** the product backlog —
  never file product bugs or stories there. Everything in this playbook means **CRYP**.

### ⚠️ Rovo MCP is OAuth — never add a Jira API token

Claude reaches Jira through the **Atlassian Rovo MCP server**, connected at the user level over **OAuth**.
Writes already work (this board's 90 issues were all created that way). General guides that say *"use
Basic auth with an email + API token for write access"* describe a **different** setup and **do not apply
here** — and adding a Jira API token would break this repo's hard rule that **no secret ever lives in
git** (`.githooks/pre-commit` scans for them). **Never add a Jira API token to fix a write that appears
blocked** — re-authorize the OAuth connection instead. There is also **no delete-issue tool** over the
connection: issues can be created, edited, commented and transitioned only. Delete is a Jira-UI action a
human takes; so don't file throwaway tickets.

---

## 2 · The hierarchy — Epic → Story / Task / Bug → Sub-task

Jira's default hierarchy is exactly three levels, and getting it right is the single most common
misconception:

1. **Epic** — a large body of work / a feature area. Our 9 Epics are the workstreams (Accounts, Design
   system, Billing, Admin, Security, …).
2. **Story · Task · Bug** — **peers**, all one level *below* Epic. A Story cannot parent a Task; they sit
   side by side under an Epic.
   - **Story** — user-facing value: *"As a user, I want … so that …"*.
   - **Task** — enabling/technical work with no direct user story (*"Configure App Check"*, *"Upgrade
     React"*, *"Set up CI"*).
   - **Bug** — a defect. Bugs run through [`JIRA-WORKFLOW.md`](JIRA-WORKFLOW.md) (failing test first).
3. **Sub-task** — a granular step under one Story/Task/Bug. Use **rarely**; if a Story needs 20
   sub-tasks it's too big — split the Story.

**Rule of thumb:** user value → **Story**; technical/enabling work → **Task**; something broken → **Bug**;
a whole feature area spanning many stories → **Epic**.

**Above-Epic levels** (Initiative/Feature hierarchies) are Premium-only and irrelevant here — the single
Epic level is the top.

⚠️ **Close Epics when their area ships.** An epic that stays open forever is a red flag. Give each a
short epic-level Definition of Done and mark it Done when the area is delivered (its child stories need
not all be complete). Our Epics are legitimately long-lived while the product is pre-launch — but the
go-live Epic should close at launch, not linger.

---

## 3 · How to write each type well (copy-paste templates)

Every ticket is written so **an AI agent and future-you can execute and verify it**: one ticket = one
outcome, acceptance criteria that map to tests, a Definition of Done that is checkable ("tests pass",
"builds", "deployed") not vibes ("looks nice").

⚠️ **Jira's markdown dialect is not GitHub's** — in Jira, `*single asterisks*` render as *italic*, so use
`**double**` for bold and plain lists. When creating via the MCP, pass `contentFormat: "markdown"`.

### 3.1 Epic

```
EPIC: <feature area, e.g. "Billing & subscriptions">

Goal / Objective
> One sentence: the user outcome this area delivers and why it matters.

Scope
In:  - <what's included>
Out: - <explicitly excluded>

Success criteria
- <observable outcome, e.g. "A user can subscribe, downgrade, and cancel with no double-charge">

Definition of Done (Epic)
- [ ] All must-have child stories Done
- [ ] Shipped and reachable in the live app
- [ ] Grouped under a Fix Version / Release

Risks / Dependencies
- <e.g. PayPal webhook idempotency, Firestore rules>
```

### 3.2 Story

Use `As a … / I want … / so that …` + 2–5 **Given/When/Then** acceptance criteria written behaviorally
(*"Given an unauthenticated user"*, not *"Given I'm at /login"*). INVEST: Independent, Negotiable,
Valuable, Estimable, Small, Testable. The AC become the failing tests first (TDD).

```
STORY: <short title, e.g. "Add crypto holding to portfolio">

As a CryptoIdea user,
I want to add a coin and quantity to my portfolio,
so that I can track its current value.

Acceptance criteria (Given/When/Then)
- Given I am on the Portfolio tab
  When I add "BTC" with quantity 0.5 and save
  Then the holding appears with a live USD value          [proven by: unit]
- Given I enter a non-existent ticker
  When I save
  Then I see an inline validation error and nothing is saved   [proven by: unit]
- Given I am at my plan's coin limit
  When I try to add another
  Then the write is denied by the rules, not just the UI   [proven by: rules]

Definition of Done (applies to every story — from AGILE.md)
- [ ] Tests written first (TDD) and green (test:unit / test:rules / test:integration as relevant)
- [ ] Secure by design; no client secrets; input validated; output encoded
- [ ] Shipped as one PR (PR-WORKFLOW.md), CI green, squash-merged
- [ ] Docs updated; commit + PR reference the CRYP key
Epic: <CRYP-key>   Component: <area>   Fix Version: <v0.x>
```

**Tag each AC with the tier that proves it** (`unit` / `rules` / `integration`) — that routing is the
same one [`JIRA-WORKFLOW.md`](JIRA-WORKFLOW.md) §6 uses, and it tells `test-author` where the red test
goes.

### 3.3 Task

```
TASK: <verb-first, e.g. "Enable App Check enforcement in production">

Objective
> The technical outcome and why.

Steps / approach
- <bullet plan>

Done when
- [ ] <verifiable technical condition>
- [ ] Commit / PR references the CRYP key
Epic: <CRYP-key>   Component: <area>   Fix Version: <v0.x>
```

### 3.4 Bug

The full bug loop lives in [`JIRA-WORKFLOW.md`](JIRA-WORKFLOW.md); this is the ticket shape it files:

```
BUG: [Area] short, specific — what is broken

Symptom:   what the user sees
Where:     file.js:LINE (or "unknown — needs diagnosis")
Steps to reproduce:
1.
Expected:  …
Actual:    …
Proven by: which test tier carries the regression test (unit / rules / integration)
Environment: desktop / iPhone · installed PWA or browser tab · emulator or prod
Affects: <Story/Epic key>   Fix Version: <v0.x>
```

**Severity vs urgency** are independent (a cosmetic landing-page typo can be low-severity but
high-urgency). CRYP has **no priority field** — express urgency with the `prio-high` / `prio-med` /
`prio-low` labels (§5), not a priority field.

---

## 4 · Planning workflow — solo Kanban, WIP = 1

- **Board:** one team-managed **Kanban** board (continuous flow, no sprints, no story points). Sprints
  buy team coordination we don't need solo.
- **Columns:** `Backlog → To Do → In Progress (WIP = 1) → In Review → Done` — matching the CRYP workflow
  states (`To Do` · `In Progress` · `In Review` · `Done`). `In Review` is where TDD tests + a manual
  check pass before Done.
- **WIP = 1** — finish one item before starting the next. This is the same "one shippable slice at a
  time" rule as [`AGILE.md`](../product/AGILE.md); the board just makes it visible.
- **Prioritization = rank order.** Drag the backlog into priority order; top = next. No points. If you
  want a signal, count items Done per week (Kanban's native throughput). Apply MoSCoW
  (Must/Should/Could/Won't) as labels only when a big call looms.
- **Refine before you build:** a ~20-minute weekly pass (§7.3) so planning is never the first time you
  see the work.

### 4.1 Components 🟡 — the feature-area axis

Components are the admin-controlled, structured grouping for reporting. Adopt a component per **product
surface** so every ticket says which part of the app it touches:

| Component | Covers |
|---|---|
| `auth` | accounts, authentication, settings, GDPR |
| `portfolio` | holdings, transactions, market data, the PWA shell |
| `journal` | thesis capture + review |
| `research` | Research tab, conviction signals, the AI surface |
| `learn` | lessons, quizzes, XP |
| `billing` | plans, PayPal subscriptions |
| `admin` | admin panel & operations |
| `security` | rules, isolation, hardening |
| `landing` | marketing page + the free DCA calculator |

> **Why components *and* Epics?** The 9 Epics are **workstreams** (phases of delivery); Components are
> **surfaces** (parts of the app). They're different axes — a `billing` story lives under the Billing
> Epic *and* carries the `billing` component. Don't create a component that just restates an Epic 1:1;
> the value is the second, cross-cutting axis for reporting.

### 4.2 Versions / Releases 🟡 — the strongest portfolio artifact

A **Version = a release**; a ticket attaches via its **Fix Version** ("which release ships this?").
Versions move unreleased → released, producing a clean release history and a Releases-page screenshot
that is strong, always-honest evidence.

Suggested versions, grouped by shipped area (backfill the Done work into these; date each Released
version from its real ship date in git):

```
v0.1 Foundations   v0.2 Accounts     v0.3 Design system
v0.4 Core features v0.5 AI research  v0.6 Billing
v0.7 Admin         v0.8 Security     v1.0 Public launch
```

> Team-managed projects have a Releases page but **no built-in Release-Notes generator** and fewer
> automation triggers than company-managed — fine for our purpose (grouping + evidence). Only switch to
> company-managed if you specifically want Jira-generated release notes.

### 4.3 The basic **Timeline** (roadmap) is free — a single-project view of the Epics as a roadmap. Cross-project
Plans / Advanced Roadmaps are Premium-only and unneeded.

---

## 5 · Labels — light and deliberate

CRYP has no priority/components-were-off history, so labels have carried some weight. Keep them few and
consistent (labels are case-sensitive free text — easy to mistype):

- **Urgency** (stands in for the missing priority field): `prio-high` · `prio-med` · `prio-low`.
- **Cross-cutting tags already in use:** `roadmap`, `tooling`, `testing`, `launch-blocker`, `bug-hunt`.
- Add a new label only when it will be reused; prefer a **Component** for anything that's really a
  feature area.

---

## 6 · Git linking — the CRYP key is the thread

- **Branch:** `claude/…` feature branches (the CI trigger + the repo standard, [`PR-WORKFLOW.md`](../product/PR-WORKFLOW.md)
  §1). Keep the key greppable in the name, e.g. `claude/cryp-42-add-holding`.
- **Commit / PR:** put the CRYP key in the commit body and the PR title
  (`feat(portfolio): add holding form (CRYP-42)`). After a squash-merge the key survives in `master`'s
  history — so the process is visible **directly in the public GitHub repo**, no Jira access needed.
- **Transitions are done in Jira via the MCP**, not by GitHub keywords. ⚠️ **Smart Commits are NOT wired**
  (they need the GitHub-for-Jira app + admin enablement); the CRYP key in a commit does **not** transition
  or close a ticket by itself. Move a ticket with `getTransitionsForJiraIssue` → `transitionJiraIssue`
  (match by name, never a hardcoded id).

### 6.1 How the Agent Factory files its card

The [Agent Factory](../product/AGENT-FACTORY.md) opens **one PR per component** and **one CRYP Story per
component**. At **G1**, once the founder confirms the goal + acceptance criteria, the orchestrator files
a Story (this §3.2 shape, Given/When/Then AC) and threads its key downstream: `test-author` marks the
red tests `it("CRYP-nn: …")`, `integrator` puts the key in the commit + PR title, and at merge the
orchestrator transitions the Story to **Done**. A component that instead originates from a **bug** enters
via [`/jira-fix`](../../.claude/commands/jira-fix.md) and its existing Bug ticket — not a new Story.

---

## 7 · Showing the process (portfolio / employer evidence)

The Free plan **cannot** make the board public — so the realistic route is screenshots + the CRYP-keyed
public commit history.

### 7.1 The evidence toolkit
- **Screenshots** for the README / portfolio: the Kanban board (shows WIP=1), the epic Timeline
  (roadmap), the Releases page (shipped versions), one exemplary Story with Given/When/Then AC, one
  exemplary Bug with full repro.
- **CRYP keys in public commits** — the always-public artifact: anyone can see structured, ticket-linked
  commits in the GitHub repo without any Jira access.
- **`CHANGELOG.md`** + linked commits/PRs round out the story.

### 7.2 The interview arc (narrate it)
*"I run CryptoIdea like a product. Each feature area is an **Epic** — Accounts, Billing, Admin, Security.
I break epics into **user stories** with **Given/When/Then acceptance criteria**. Because I work **TDD**,
those criteria become my failing tests first; I use **Claude Code via the Atlassian MCP** to draft
tickets and implement against them, and I review every line. I work **Kanban, WIP = 1**, so I finish
before I start. Every commit carries its **CRYP key**, and shipped work is grouped into **Versions** —
you can see the release history and the ticket-linked commits in the public repo."*

### 7.3 Weekly ritual (~20 min)
1. **Review Done** — mark any completed Versions Released.
2. **Refine** the next 3–5 items — each gets a one-line story + 2–5 testable AC + the right Epic /
   Component. Delete stale items.
3. **Re-rank** the backlog; top = next.
4. **Pick the one** you'll pull into In Progress (WIP=1).
5. **Roadmap glance** — open the Timeline; is any Epic ready to close?

---

## 8 · Backfill (already largely done)

The board's Done Stories were reconstructed retrospectively from git history — a legitimate, honest
practice ("backlog documented retrospectively from git history"), never a faked day-by-day sprint
timeline. If you ever want the Timeline/Release **dates** to reflect real ship dates, set Created/Resolved
via **External System Import (CSV)** using the *actual* dates from `git log` — legitimate because the
dates are true. Never invent a date you can't back with a commit. Keep granularity at **epics + key
stories**, not every commit — 500 micro-tickets read as noise, not process.

---

## Recommended setup (at a glance)

| Decision | Choice |
|---|---|
| Work-item types | Epic · Story · Task · Bug (Sub-task rarely) |
| Board | Team-managed **Kanban**, WIP = 1, no sprints, no points |
| Columns | Backlog → To Do → In Progress (WIP 1) → In Review → Done |
| Grouping | **Components** = surfaces (§4.1) · **Epics** = workstreams · Labels sparingly |
| Releases | **Versions + Fix Version** per shipped area (§4.2) |
| Roadmap | Basic **Timeline** (free) |
| Priority | No field — `prio-*` labels + backlog rank |
| Branch / commit | `claude/cryp-<n>-slug` + CRYP key in the PR title |
| AI integration | Rovo MCP over **OAuth** — never a Jira API token |
| Public sharing | Not on Free → screenshots + CRYP-keyed commits |

---

*Append to this doc when a planning/hierarchy/release convention changes. The **bug → failing-test → fix**
loop and the `it("CRYP-nn: …")` marker live in [`JIRA-WORKFLOW.md`](JIRA-WORKFLOW.md); the Definition of
Done lives in [`AGILE.md`](../product/AGILE.md); how a change becomes a PR lives in
[`PR-WORKFLOW.md`](../product/PR-WORKFLOW.md).*
