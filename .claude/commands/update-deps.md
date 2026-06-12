---
description: Safely check, update, and verify dependencies (root + functions)
---

Update Crypto Idea's dependencies safely. Work in BOTH the root and `functions/`.

1. **Report first** — run `npm outdated` and `npm audit` in the root and in `functions/`; show
   what's outdated and what's vulnerable before changing anything.
2. **Update conservatively** — apply minor/patch updates (`npm update`) first. For any major
   version bump or `npm audit fix --force`, call it out and explain the breaking-change risk;
   do major bumps one at a time, not all at once.
3. **Verify after each meaningful change** — `npm run build`, `npm run test:rules`,
   `npm run test:integration`. Everything must stay green (expect 7/7 + 4/4).
4. **Functions caveat** — the `firebase-admin` transitive advisories (google-gax/uuid/etc.) are
   server-only; don't force-break the functions build chasing them. Note them, don't risk the build.
5. **Commit** the working result with a message listing what was bumped. If an update breaks the
   build or tests and can't be fixed quickly, revert it and report rather than leaving it broken.
