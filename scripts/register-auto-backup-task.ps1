# Registers (or re-registers) the Windows Scheduled Task that runs the WD auto-backup
# every 3 hours. No admin rights needed - it runs as you, only while you're logged on.
#
# Run once:   powershell -File scripts\register-auto-backup-task.ps1
# Remove it:  Unregister-ScheduledTask -TaskName "CryptoIdea WD Auto-Backup" -Confirm:$false
# Run it now: Start-ScheduledTask -TaskName "CryptoIdea WD Auto-Backup"

$ErrorActionPreference = "Stop"

$taskName = "CryptoIdea WD Auto-Backup"
$script   = Join-Path $PSScriptRoot "auto-backup-to-wd.ps1"

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $script)

# Fire every 3 hours, indefinitely.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) `
  -RepetitionInterval (New-TimeSpan -Hours 3) `
  -RepetitionDuration  (New-TimeSpan -Days 3650)

# Laptop-friendly: run on battery, catch up after sleep, never overlap, short time limit.
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 15) `
  -MultipleInstances IgnoreNew

# Run as the current user, only when logged on (so no stored password is needed).
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" `
  -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
  -Settings $settings -Principal $principal -Force `
  -Description ("Backs up the whole Crypto Idea project to D:\apps\crypto-idea-auto-backup " +
                "every 3 hours, keeping the newest 20 snapshots. Skips silently when the WD " +
                "drive is unplugged.") | Out-Null

Write-Output "Registered scheduled task: $taskName (runs every 3 hours)."
