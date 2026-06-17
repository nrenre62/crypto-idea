# Automatic recurring backup of the WHOLE Crypto Idea project to the WD drive.
# Runs on a 3-hour loop via a Windows Scheduled Task (see register-auto-backup-task.ps1).
# Also runnable by hand:  powershell -File scripts\auto-backup-to-wd.ps1
#
# Behaviour:
#   - Copies the whole project (EXCLUDING node_modules, dist, .git) + the 3 skills.
#   - WD drive not connected -> logs "skipped" and exits 0. The next scheduled run retries,
#     so it simply waits until the drive is plugged back in (never errors, never blocks).
#   - Only creates a new snapshot when something actually CHANGED since the last one, so the
#     20-snapshot history holds 20 real working states instead of idle duplicates.
#   - Keeps the newest 20 snapshots; older ones are deleted. Lives in its own folder, so it
#     never touches the manual "finish" backups in D:\apps\crypto-idea-backup.

param(
  [string]$Dest = "D:\apps\crypto-idea-auto-backup",
  [int]   $Keep = 20
)

$ErrorActionPreference = "Stop"

$repo      = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$skillsSrc = Join-Path $env:USERPROFILE ".claude\skills"
$skills    = @("firebase-saas-starter", "landing-page-design", "secure-by-design")
$exclDirs  = @("node_modules", "dist", ".git")
$exclFiles = @("*-debug.log")   # transient emulator logs - noise, not project content
$snapRegex = '^\d{4}-\d{2}-\d{2}_\d{4}$'

function Write-Log($msg) {
  $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  Write-Output $line
  try { Add-Content -Path (Join-Path $Dest "auto-backup.log") -Value $line -Encoding utf8 } catch {}
}

# 1) Is the WD drive connected? If not, skip quietly and let the next run retry.
$driveRoot = Split-Path -Qualifier $Dest   # e.g. "D:"
if (-not (Test-Path "$driveRoot\")) {
  Write-Output "[auto-backup] WD drive $driveRoot not connected - skipped (will retry next run)."
  exit 0
}
New-Item -ItemType Directory -Force -Path $Dest | Out-Null

# 2) Did anything change since the most recent snapshot? (robocopy /L = list only, no copy)
$existing = Get-ChildItem $Dest -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match $snapRegex } | Sort-Object Name
$last = $existing | Select-Object -Last 1

$changed = $true
if ($last) {
  $lastRepo = Join-Path $last.FullName "repo"
  & robocopy $repo $lastRepo /MIR /L /NJH /NJS /NFL /NDL /XD $exclDirs /XF $exclFiles *> $null
  if ($LASTEXITCODE -eq 0) { $changed = $false }   # 0 = identical; 1-7 = differences
}
if (-not $changed) {
  Write-Log "[auto-backup] no changes since $($last.Name) - snapshot skipped."
  exit 0
}

# 3) Create a new timestamped snapshot.
$stamp    = Get-Date -Format "yyyy-MM-dd_HHmm"
$snapshot = Join-Path $Dest $stamp
$repoDest = Join-Path $snapshot "repo"
New-Item -ItemType Directory -Force -Path $repoDest | Out-Null

& robocopy $repo $repoDest /E /NFL /NDL /NJH /NJS /R:1 /W:1 /XD $exclDirs /XF $exclFiles *> $null
$repoCode = $LASTEXITCODE
if ($repoCode -ge 8) {
  Write-Log "[auto-backup] ERROR: robocopy failed (code $repoCode) copying the project. Removing partial snapshot."
  Remove-Item $snapshot -Recurse -Force -ErrorAction SilentlyContinue
  exit 0
}

# Skills (each is a folder under ~/.claude/skills).
$skillsDest = Join-Path $snapshot "skills"
New-Item -ItemType Directory -Force -Path $skillsDest | Out-Null
$skillsCopied = @()
foreach ($s in $skills) {
  $src = Join-Path $skillsSrc $s
  if (Test-Path $src) {
    & robocopy $src (Join-Path $skillsDest $s) /E /NFL /NDL /NJH /NJS /R:1 /W:1 *> $null
    if ($LASTEXITCODE -lt 8) { $skillsCopied += $s }
  }
}

# Self-describing manifest.
$fileCount = (Get-ChildItem $repoDest -Recurse -File | Measure-Object).Count
$info = @(
  "Crypto Idea AUTO backup (whole project)",
  "Created : $stamp",
  "Source  : $repo",
  "Excluded: $($exclDirs -join ', ')",
  "Files   : $fileCount",
  "Skills  : $($skillsCopied -join ', ')"
) -join "`r`n"
Set-Content -Path (Join-Path $snapshot "backup-info.txt") -Value $info -Encoding utf8

Write-Log "[auto-backup] snapshot $stamp created ($fileCount files, $($skillsCopied.Count) skills)."

# 4) Prune: keep only the newest $Keep snapshots.
$all = Get-ChildItem $Dest -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match $snapRegex } | Sort-Object Name
if ($all.Count -gt $Keep) {
  $all | Select-Object -First ($all.Count - $Keep) | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    Write-Log "[auto-backup] pruned old snapshot $($_.Name)."
  }
}
exit 0
