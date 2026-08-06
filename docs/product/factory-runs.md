# Factory runs — one row per completed item (observability)

**Purpose.** Turn Kaizen retros from vibes into data. Without this, nobody can tell whether the factory
is getting better or worse — which stage is the bottleneck, which reviewer earns its cost, whether the
defect-escape rate is falling. `integrator` appends **one row per finished item** at commit time; the
orchestrator supplies the counts it already knows.

**No personal data; retained indefinitely** (like `statsDaily`, not the 365-day audit log).

## What each field means

- **Fix-rounds** — how many `fix-controller` cycles it took to go green (0 = green first pass).
- **Escalations** — times the run stopped and asked the founder (a decision, a stuck loop, or the cost
  tripwire).
- **Reviewers (verdict)** — which stage-3 reviewers fired and their verdict (`sec:SAFE`,
  `design:OK`, `api:OK`, or `CHANGES` when one bounced back through the fix-loop).
- **Agents** — total subagent invocations for the item (the spend the cost tripwire meters — see
  `build-feature.md`).
- **Commit range** — `first..last` on the feature branch.

| Item | Date | Fix-rounds | Escalations | Reviewers (verdict) | Agents | Commit range |
|------|------|-----------:|------------:|---------------------|-------:|--------------|
| PORTFOLIO-NUM-FIX | 2026-08-06 | 1 | 0 | sec:SAFE · design:CHANGES→OK · verify:GREEN (unit 951/951) | 11 | 082945d..c9b3d05 |
