# Backups → WD drive (`D:\apps`)

The project is backed up to the external **WD drive** by two independent mechanisms.
Both fail soft: if the WD drive isn't connected they skip quietly and never block or error.

| | **Backup 1 — on "finish"** | **Backup 2 — auto-loop** ("agent 2") |
|---|---|---|
| Trigger | A chat message containing `finish` (`UserPromptSubmit` hook) | **Windows Scheduled Task, every 3 hours** |
| Copies | `*.md` docs + `docs/diagrams` drawings + the 3 skills | **Whole project** (code + docs) + the 3 skills |
| Destination | `D:\apps\crypto-idea-backup\<timestamp>\` | `D:\apps\crypto-idea-auto-backup\<timestamp>\` |
| History | keeps everything (never pruned) | **newest 20 snapshots**, older auto-pruned |
| Script | `scripts/backup-to-wd.ps1` | `scripts/auto-backup-to-wd.ps1` |

They use **separate folders**, so the auto-loop's pruning never touches the on-"finish" snapshots.

---

## Backup 2 — the auto-backup loop (this is "agent 2")

A reusable pattern; see the **`auto-backup-loop`** skill for the general version.

**What it does, each run**
1. Checks the WD drive (`D:`). Not connected → logs `skipped`, exits 0, retries next run.
   *(This is the "wait until it's plugged back in" behaviour — no errors, nothing to restart.)*
2. Compares the project to the most recent snapshot (`robocopy /L`). Nothing changed → skip,
   so the 20-snapshot history holds 20 *real* working states, not idle duplicates.
3. Otherwise copies the whole project into a new `D:\apps\crypto-idea-auto-backup\<yyyy-MM-dd_HHmm>\`
   snapshot (`repo\` + `skills\` + a `backup-info.txt` manifest), **excluding**
   `node_modules`, `dist`, `.git`, and `*-debug.log`.
4. Prunes to the newest 20 snapshots.

A running log is kept at `D:\apps\crypto-idea-auto-backup\auto-backup.log`.

**The Scheduled Task** — `CryptoIdea WD Auto-Backup`, registered by
`scripts/register-auto-backup-task.ps1`:
- Runs **every 3 hours**, as the current user, **only while logged on** (so no Windows password
  is stored and no admin rights are needed).
- **Runs on battery** and **catches up after sleep**; 15-min time limit; never overlaps itself.

### Manage it

```powershell
# Run a backup right now
Start-ScheduledTask -TaskName "CryptoIdea WD Auto-Backup"

# (Re-)register or change the interval/retention — edit the script, then:
powershell -File scripts\register-auto-backup-task.ps1

# Inspect last/next run + result (0 = success)
Get-ScheduledTaskInfo -TaskName "CryptoIdea WD Auto-Backup"

# Remove the loop entirely
Unregister-ScheduledTask -TaskName "CryptoIdea WD Auto-Backup" -Confirm:$false
```

Change **frequency** by editing `-RepetitionInterval` in the register script; change **how many
snapshots to keep** with the `-Keep` param in `scripts/auto-backup-to-wd.ps1` (default 20).

> ⚠️ The task runs only while you're logged in — the trade-off that avoids storing your Windows
> password. Fine for a personal laptop. To run while logged out you'd switch the principal to a
> stored-credential / service account (needs your password and, usually, admin).

---

## Backup 1 — on "finish"

Typing a message containing **`finish`** fires the `UserPromptSubmit` hook in
`.claude/settings.json`, which runs `scripts/finish-backup-hook.ps1` →
`scripts/backup-to-wd.ps1`: a timestamped snapshot of all `*.md`, the `docs/diagrams` drawings,
and the 3 skills into `D:\apps\crypto-idea-backup\`. Run it by hand any time with
`powershell -File scripts\backup-to-wd.ps1`.

---

## New machine / moved repo

Both scripts resolve paths relative to themselves, so they keep working if the repo moves.
After cloning/moving:
- **Auto-loop:** re-run `powershell -File scripts\register-auto-backup-task.ps1` to recreate the
  task on the new machine.
- **On-"finish":** update the absolute script path in `.claude/settings.json` to the new location.
- If the backup drive isn't `D:`, pass `-Dest` to the scripts (and update the register script).
