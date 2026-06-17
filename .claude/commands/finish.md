---
description: Wrap up the session — commit everything, update docs, SAVE LEARNINGS TO SKILLS, shut down
---

End-of-session routine for Crypto Idea. Work top to bottom; **never skip a step silently.**

1. **Commit everything** to git with clear messages (don't leave anything uncommitted).
2. **Update docs** — `README.md` / `CLAUDE.md` / `NEXT-STEPS.md` if today's work changed how the
   app is built, run, or structured, or left a follow-up to track.
3. **Capture what you learned into skills + memory — DO NOT SKIP THIS.** It's the step most easily
   forgotten (it has been). It is required, not optional. Actually review what you built/fixed this
   session, then for **each** reusable pattern, gotcha, or standing preference add a concise note to
   the matching skill (`firebase-saas-starter`, `landing-page-design`, `secure-by-design`,
   `auto-backup-loop`, …) and/or project memory. Edit an existing section rather than duplicating.
   If — after genuinely reviewing — nothing reusable emerged, **say so explicitly** ("no new
   skill-worthy patterns this session") so it's a conscious decision, never an omission.
   Skills live in `~/.claude/skills/` (outside the repo), so they're saved to the WD backup, not
   git — re-run the backup (step 4 note) after editing them.
4. **Shut down everything** — stop all emulators + the Vite dev server + any preview server you
   started; confirm every port (3000, 5001, 8080, 8085, 5000, 4000, 9099) is free.
5. **Confirm a clean git working tree** and list the commits made this session.

Report what was saved — **including which skills / memory you updated (or that none applied)** — and
confirm nothing is left running.

> **WD backup is automatic + unified.** A `UserPromptSubmit` hook (`.claude/settings.json`) runs
> `scripts/finish-backup-hook.ps1` on any message containing "finish", which calls
> `scripts/auto-backup-to-wd.ps1 -Force` — the SAME script the 3-hourly Scheduled Task runs, but
> forced and **kept as a milestone** (`<stamp>_finish`, exempt from snapshot pruning). It snapshots
> the whole project + all skills + Claude config to the WD drive (`D:\apps\…`), fails soft if the
> drive is unplugged, and never blocks your message. **After editing skills in step 3, re-run
> `powershell -File scripts\auto-backup-to-wd.ps1 -Force`** so the updated skills land on the drive.
