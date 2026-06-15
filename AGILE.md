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
- [ ] Tests added/updated and green (`test:unit` / `test:rules` / `test:integration`, as relevant).
- [ ] Verified for real — ran the app or the tests; actual result reported (failures included).
- [ ] Build clean when it could be affected (`npm run build`).
- [ ] Committed to git with a clear message.
- [ ] Docs updated if structure/behavior changed (`README.md` / `src/ARCHITECTURE.md` / this backlog).
- [ ] Reusable patterns captured in skills/memory.

## Retrospective = Kaizen
After each increment, leave the code a little better than found and log any new improvement
opportunities (incl. better patterns/tools discovered, weighed against KISS) into the backlog.
