# Agile workflow (lightweight, solo)

How we build Crypto Idea: small, vertical, **test-guarded increments** off a **prioritized
backlog**, each meeting a clear **Definition of Done**. Tuned for a solo builder — value over
ceremony (KISS). Pairs with Kaizen (continuous improvement) and the conventions in `CLAUDE.md`.

> Why no Scrum ceremony? One person doesn't need sprints, standups, or story points — that's
> overhead with no payoff. We keep the parts of Agile that actually add value solo: a clear
> backlog, working software every increment, and disciplined "done".

## Roles
Solo builder = Product Owner (decides priority) + Developer. Claude = pairing developer:
executes increments, **surfaces improvement opportunities proactively**, keeps the backlog honest.

## Backlog
[`NEXT-STEPS.md`](NEXT-STEPS.md) is the **product backlog** — prioritized, top = next. Items are
small, independently shippable slices (e.g. "extract one screen", "fix one bug"). Go-live and
optional work sit lower. New ideas/opportunities get added as they're found.

## Iteration — one slice at a time
Work in the smallest increment that delivers working software:
1. Pull the top backlog item.
2. Build the simplest thing that satisfies it (KISS, secure by design).
3. Meet the Definition of Done.
4. Check in / re-prioritize, then pull the next.

Every commit is a **potentially shippable increment**: the app builds and runs after each one.

## Definition of Ready (before starting an item)
- Small enough to finish in one increment; if not, split it first.
- The expected outcome **and how to verify it** are clear.

## Definition of Done (every increment)
- [ ] Simplest solution that works (KISS); secure by design (no client secrets, validate input,
      encode output).
- [ ] **Tests written first (TDD):** add/extend the test before the implementation, watch it fail,
      then make it pass. Run tests after every change and fix failures before continuing — never
      mark an item done with a red test.
- [ ] Tests added/updated and green (`test:unit` / `test:rules` / `test:integration`, as relevant).
- [ ] Verified for real — ran the app or the tests; actual result reported (failures included).
- [ ] Build clean when it could be affected (`npm run build`).
- [ ] Committed to git with a clear message.
- [ ] Shipped as one PR per [`PR-WORKFLOW.md`](PR-WORKFLOW.md) — Conventional-Commit title + linked
      ticket, template body, ~200-line scope, CI green, squash-merge + delete branch.
- [ ] **New/moved code sits in the correct layer per [`ARCHITECTURE.md`](../decisions/ARCHITECTURE.md)** —
      component → hook → api → util; `utils/` pure; no `firebase/*`/`fetch` in components. No new layer
      violation introduced (and any deliberate deviation is recorded as a by-design exception).
- [ ] Docs updated if structure/behavior changed (`README.md` / [`ARCHITECTURE.md`](../decisions/ARCHITECTURE.md) /
      `src/ARCHITECTURE.md` / this backlog).
- [ ] Reusable patterns captured in skills/memory.

## Testing conventions
- **Frameworks:** unit/component/hook tests use **Vitest** + Testing-Library + jsdom
  (`npm run test:unit`); Firestore-rules and data-layer tests use Node's built-in `node:test` against
  the Firebase emulators (`npm run test:rules`, `npm run test:integration`).
- **Location:** all test files live under **`/tests`** — `tests/unit/*.test.jsx` (flat, by feature name,
  e.g. `Login.test.jsx`), plus `tests/firestore-rules.test.js` and `tests/data-layer.test.js`. Flat by
  choice (KISS) — they are not mirrored into `src/` subfolders.
- **TDD:** new behavior gets a failing test first (see Definition of Done).
- **Jira-tracked bugs:** a bug worked from a Jira ticket carries its key in the **`it()` title** —
  `it("CRYP-42: …")`, extending the existing `it("R26: …")` marker style — so the test is traceable back
  to the ticket and `vitest -t "CRYP-42"` selects it. Never mark a `describe()` or a filename instead.
  Full workflow + traps: [`JIRA-WORKFLOW.md`](../testing/JIRA-WORKFLOW.md).

## Retrospective = Kaizen
After each increment, leave the code a little better than found and log any new improvement
opportunities (incl. better patterns/tools discovered, weighed against KISS) into the backlog.
