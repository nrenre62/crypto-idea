# Backups → WD drive (`D:\apps`)

**One** backup system saves the project to the external **WD drive**, with **two triggers**.
It fails soft: if the WD drive isn't connected it skips quietly and never blocks or errors — the
next run just retries once the drive is reconnected. (Reusable pattern: the `auto-backup-loop` skill.)

| | **3-hour auto-loop** | **"finish" command** |
|---|---|---|
| Trigger | Windows Scheduled Task, every 3 hours | A chat message containing `finish` (UserPromptSubmit hook) |
| When it saves | only if something changed since the last snapshot | **always** — forces a save right now |
| Retention | **rolling**: newest 20 kept, older pruned | **kept forever** as a milestone (`..._finish`) |
| Purpose | continuous safety net | your "I'm done for today" end-of-day save |

Both triggers run the **same script** (`scripts/auto-backup-to-wd.ps1`) into the **same folder**
(`D:\apps\crypto-idea-auto-backup\`), and both copy the same thing:

- the **whole project** (excluding `node_modules`, `dist`, `.git`, `*-debug.log`),
- **all skills** (auto-discovered from `~/.claude/skills`),
- your **Claude config**: global `~/.claude/CLAUDE.md` + every project's `memory\` folder
  (auto-discovered), under a `claude-config\` folder.

Each snapshot is `…\<yyyy-MM-dd_HHmm>[_finish]\` containing `repo\` + `skills\` + `claude-config\`
+ a `backup-info.txt` manifest. A running log is at `…\auto-backup.log`.

## How "finish" works
Typing a message containing **`finish`** fires the `UserPromptSubmit` hook
(`scripts/finish-backup-hook.ps1`), which runs `auto-backup-to-wd.ps1 -Force`:

- **`-Force`** = snapshot now even if nothing changed (so "finish" *always* saves), and
- name it `<stamp>_finish` and **never prune it** — your end-of-day milestones pile up safely
  while the 3-hour runs keep rotating through their newest 20.

If the WD drive is unplugged when you type "finish", the hook just notes `[WD backup] … skipped`
and the save happens on the next run once you reconnect.

## The 3-hour loop
A Windows Scheduled Task `CryptoIdea WD Auto-Backup` (registered by
`scripts/register-auto-backup-task.ps1`) runs the script every 3 hours — as you, only while
logged on (no stored password / admin), on battery, catching up after sleep. It snapshots only
when the project, skills, or Claude config actually changed since the last snapshot.

### Manage it
```powershell
Start-ScheduledTask -TaskName "CryptoIdea WD Auto-Backup"                       # run a backup now
powershell -File scripts\register-auto-backup-task.ps1                          # (re-)register / change interval
Get-ScheduledTaskInfo -TaskName "CryptoIdea WD Auto-Backup"                     # last/next run + result (0 = ok)
Unregister-ScheduledTask -TaskName "CryptoIdea WD Auto-Backup" -Confirm:$false  # remove the loop
```
Change **frequency** via `-RepetitionInterval` in the register script; change how many **rolling**
snapshots to keep via the `-Keep` param of `auto-backup-to-wd.ps1` (default 20 — finish milestones
are kept regardless).

## New machine / moved repo
The scripts resolve paths relative to themselves, so they keep working if the repo moves.
- Re-run `powershell -File scripts\register-auto-backup-task.ps1` to recreate the scheduled task.
- The "finish" hook is wired in `.claude/settings.json` (`UserPromptSubmit`) → update that absolute
  path if the repo moves.
- If the backup drive isn't `D:`, pass `-Dest` to the script (and update the register script).

> Note: the older separate `D:\apps\crypto-idea-backup\` folder (from the previous two-backup
> setup) is **no longer written to**. Its existing snapshots are left untouched — delete them by
> hand if you don't want them.
