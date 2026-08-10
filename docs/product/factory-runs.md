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
| PORTFOLIO-TEXT-SIZE | 2026-08-07 | 0 | 0 | sec:SAFE · design:CONSISTENT · verify:GREEN (unit 952/952) | 8 | fd3e444..786c85e (+docs finalize tip) |
| DARK-MODE-FIXES | 2026-08-07 | 1 | 0 | sec:SAFE · design:CONSISTENT (2 advisory — cascade FIXED, dead-guard KEPT) · verify:GREEN (unit 957/957) | 9 | ca291bb..376e771 (+docs finalize tip) |
| RESEARCH-NO-AI-4a (honesty gate) | 2026-08-08 | 0 | 0 | sec:SAFE · design:CONSISTENT (1 advisory — dead usePulse.offline DEFERRED to 4b) · verify:GREEN (unit 964/964) · api:SKIP · simplifier:SKIP | 7 | 81732f0..b6d32d1 (+docs finalize tip) |
| RESEARCH-NO-AI-4b (multi-signal Pulse + Brief) | 2026-08-08 | 0 | 0 | verify:GREEN (unit 982/982) · design:CONSISTENT (2 advisory copy → G3) · sec:SKIP (no security surface) · api:SKIP · simplifier:SKIP | 6 | 471babc..e6e79db (+docs finalize tip) |
| RESEARCH-NO-AI-4c (RESEARCH-METRICS P-1..P-4) | 2026-08-08 | 1 | 1 | verify:GREEN (unit 1019/1019) · design:CHANGES→OK (F1/F2 must-fix) · adversarial-metric:CONFIRMED HIGH F1/F2→FIXED (identity/P2/P3/P4/gate proven robust) · sec:SKIP · api:SKIP · simplifier:SKIP | 9 | 93b0764..4fe910f (+docs finalize tip) |
| ARCHITECTURE-DOC (canonical rulebook + 3-anchor wiring) | 2026-08-08 | 0 | 1 | docs-only: build GREEN (dist-name-guard clean) · 171 links resolve · grep-check clean (no restated numbers) · D3 found ALREADY-FIXED (PR #44) → ARCH-DOC-FIX-1 superseded; ARCH-DOC-FIX-2 remains | 1 | single docs commit (finalize) |
| LAUNCH-FREE-PartB (CRYP-101) | 2026-08-09 | 0 | 1 | verify:GREEN (unit 1043/1043; integration CI-only — functions emulator un-bootable in sandbox) · sec:SAFE (1 LOW comment→FIXED) · api:IN-SYNC · design:CONSISTENT · simplifier:no-changes | 13 | 06b5c98..96e94a3 |
| FLOATING-HEADER (CRYP-102) | 2026-08-09 | 2 | 1 | sec:SAFE · test:GREEN (unit 97/97) · design:CHANGES→CONSISTENT (round 2) · simplifier:1-cleanup | 12 | c8158df..9d6974a |
| ADMIN-SEP-PR1 (CRYP-103a) | 2026-08-09 | 0 | 0 | verify:GREEN (unit 1047/1047, build clean; integration CI-only) · sec:SAFE (0 HIGH; 1 MED pre-existing → deferred to PR2) · api:IN-SYNC · design:CONSISTENT (1 LOW copy nit → fixed) · simplifier:1 edit (dead ADMIN pill removed) | 13 | 3079804..380d50b (merged e10a92c, PR #61) |
| ADMIN-SEP-PR2 (CRYP-103b, Part C) | 2026-08-10 | 0 | 0 | verify:GREEN (unit 1064/1064, build clean; integration CI GREEN) · sec:SAFE (0 HIGH/0 MED; LOW #1 sign-out guard + #2 await-pin → FIXED, #3 fail-open → ACCEPTED house pattern) · api:IN-SYNC (no openapi change) · design:N/A (no client/CSS) · rules:N/A (untouched) · simplifier:SKIP (minimal, reuses existing patterns) | 5 | 7cf7d4c(RED)→ac8d163→e1d4275→f047509 (merged 9528f59, PR #62 — CRYP-103 Story Done) |
