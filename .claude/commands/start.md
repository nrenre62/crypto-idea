---
description: Start the full local stack (emulators + dev server) and verify it works
---

Start the whole Crypto Idea stack together by running `npm run start:all` in the background
(this launches the Firestore/Auth/Functions/Pub-Sub emulators AND the Vite dev server in one
lifecycle). Then verify:

1. The dev server is up at http://localhost:3000 (app shell returns HTTP 200).
2. `/api/search?q=bitcoin` returns coin data through the proxy → functions emulator.

Report the URLs (app at :3000, Emulator UI at :4000) and flag anything that failed.
Do NOT run `npm run dev` alone — `/api/*` needs the functions emulator on :5001.

Then **ensure the WD backup loop is running** (it backs up independently of the chat — see
`BACKUP.md`):

- Check the scheduled task: `Get-ScheduledTask -TaskName "CryptoIdea WD Auto-Backup"`.
- If it's **missing** (e.g. a fresh machine), register it:
  `powershell -File scripts\register-auto-backup-task.ps1`.
- If it exists but is **Disabled**, enable it: `Enable-ScheduledTask -TaskName "CryptoIdea WD Auto-Backup"`.
- Report its **State** and **next run** (`(Get-ScheduledTaskInfo -TaskName "CryptoIdea WD Auto-Backup").NextRunTime`).

Don't force a snapshot on start — the 3-hourly loop and the "finish" milestone already cover saves;
this step just guarantees the loop is alive whenever you sit down to work.
