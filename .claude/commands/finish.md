---
description: Wrap up the session — commit everything, update docs/skills, shut down the stack
---

End-of-session routine for Crypto Idea:

1. **Commit everything** to git with clear messages (don't leave anything uncommitted).
2. **Update `README.md`** if today's work changed how the app is built, run, or structured.
3. **Update the user skills** (`firebase-saas-starter`, `landing-page-design`, `secure-by-design`)
   and project memory if any reusable pattern or standing preference emerged.
4. **Shut down everything** — stop all emulators + the Vite dev server; confirm every port
   (3000, 5001, 8080, 8085, 5000, 4000, 9099) is free.
5. **Confirm a clean git working tree** and list the commits made this session.

Report what was saved and confirm nothing is left running.

> **WD backup is automatic.** A `UserPromptSubmit` hook (`.claude/settings.json`)
> runs `scripts/finish-backup-hook.ps1` on any message containing "finish", which
> snapshots all MD docs, the `docs/diagrams` drawings, and the 3 project skills to
> `D:\apps\crypto-idea-backup\<timestamp>\`. It fails soft (skips silently if the WD
> drive isn't connected) and never blocks your message. Run it by hand anytime with
> `powershell -File scripts\backup-to-wd.ps1`.
