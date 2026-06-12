---
description: Scan the whole project for errors — build, unit tests, and dependency audit
---

Full health scan of Crypto Idea. Run and report results for each:

1. **Build** — `npm run build` (catches import/JSX/syntax errors across all source). Report any
   errors or warnings (e.g. duplicate keys, oversized chunks).
2. **Rules tests** — `npm run test:rules` (expect 7/7; PERMISSION_DENIED lines are expected — the
   tests assert denials).
3. **Integration tests** — `npm run test:integration` (expect 4/4).
4. **Dependency audit** — `npm audit --omit=dev` at the root (expect 0) and in `functions/`
   (transitive `firebase-admin` advisories are server-only and acceptable).

Summarize as a pass/fail table. If you find a real bug, fix it, rebuild to confirm, and commit.
