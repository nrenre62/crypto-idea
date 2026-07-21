# The ONE backup for the Crypto Idea project, to the WD drive. Two triggers, one script, one folder:
#   - Every 3 hours (Windows Scheduled Task, see register-auto-backup-task.ps1): snapshots ONLY
#     when something changed, and keeps the newest $Keep (20) ROLLING snapshots (older pruned).
#   - When you type "finish" (UserPromptSubmit hook runs this with -Force): forces a snapshot NOW
#     even if nothing changed, names it "<stamp>_finish", and KEEPS it forever (never pruned) as
#     your end-of-day milestone.
# Also runnable by hand:  powershell -File scripts\auto-backup-to-wd.ps1 [-Force]
#
# Either trigger copies the whole project (EXCLUDING only node_modules + dist, which npm rebuilds;
# the .git history IS included since this repo has no remote) + ALL personal skills + your Claude
# config (global ~/.claude/CLAUDE.md, slash commands, settings.json, hooks, + every project's
# memory folder).
# WD drive not connected -> logs "skipped" and exits 0; the next run retries, so it simply waits
# until the drive is plugged back in (never errors, never blocks).

param(
  [string]$Dest  = "D:\apps\crypto-idea-auto-backup",
  [int]   $Keep  = 20,
  [switch]$Force          # "finish" command: force a kept milestone snapshot now, even if nothing
                          # changed. Without it, the scheduled 3-hourly run behaves as usual.
)

$ErrorActionPreference = "Stop"

$repo       = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$claudeRoot = Join-Path $env:USERPROFILE ".claude"
$skillsSrc  = Join-Path $claudeRoot "skills"
$globalMd   = Join-Path $claudeRoot "CLAUDE.md"   # global instructions for all projects
$commandsSrc = Join-Path $claudeRoot "commands"      # slash commands (finish, start, ...)
$hooksSrc    = Join-Path $claudeRoot "hooks"         # guard.ps1 + other hook scripts
$settingsSrc = Join-Path $claudeRoot "settings.json" # hook wiring (backup + guard) + config
# All personal skills under ~/.claude/skills, auto-discovered so new skills are always included.
$skills    = if (Test-Path $skillsSrc) { @(Get-ChildItem $skillsSrc -Directory | Select-Object -ExpandProperty Name) } else { @() }
# Exclude ONLY rebuildable dirs. .git is intentionally KEPT: this repo is local-only (no remote),
# so the backup is the sole offsite copy of the commit history.
$exclDirs  = @("node_modules", "dist")
$exclFiles = @("*-debug.log")   # transient emulator logs - noise, not project content
$snapAll   = '^\d{4}-\d{2}-\d{2}_\d{4}(_finish)?$'   # any snapshot (rolling OR kept finish)
$snapRoll  = '^\d{4}-\d{2}-\d{2}_\d{4}$'             # rolling only - the prunable ones

function Write-Log($msg) {
  $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  Write-Output $line
  try { Add-Content -Path (Join-Path $Dest "auto-backup.log") -Value $line -Encoding utf8 } catch {}
}

# Every project's memory folder under ~/.claude/projects/<id>/memory (auto-discovered).
function Get-MemoryDirs {
  $proj = Join-Path $claudeRoot "projects"
  if (-not (Test-Path $proj)) { return @() }
  Get-ChildItem $proj -Directory | ForEach-Object {
    $m = Join-Path $_.FullName "memory"
    if (Test-Path $m) { [pscustomobject]@{ Name = $_.Name; Path = $m } }
  }
}

# 1) Is the WD drive connected? If not, skip quietly and let the next run retry.
$driveRoot = Split-Path -Qualifier $Dest   # e.g. "D:"
if (-not (Test-Path "$driveRoot\")) {
  Write-Output "[auto-backup] WD drive $driveRoot not connected - skipped (will retry next run)."
  exit 0
}
New-Item -ItemType Directory -Force -Path $Dest | Out-Null

# 2) Did anything change since the most recent snapshot? (robocopy /L = list only, no copy)
#    Skipped entirely on a forced "finish" run - that always snapshots.
$existing = Get-ChildItem $Dest -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match $snapAll } | Sort-Object Name
$last = $existing | Select-Object -Last 1

$changed = $true
if ($last -and -not $Force) {
  $lastRepo   = Join-Path $last.FullName "repo"
  $lastSkills = Join-Path $last.FullName "skills"
  $lastCfg    = Join-Path $last.FullName "claude-config"
  & robocopy $repo $lastRepo /MIR /L /NJH /NJS /NFL /NDL /XD $exclDirs /XF $exclFiles *> $null
  $repoSame = ($LASTEXITCODE -eq 0)                 # 0 = identical; 1-7 = differences
  & robocopy $skillsSrc $lastSkills /MIR /L /NJH /NJS /NFL /NDL /XD .git *> $null
  $skillsSame = ($LASTEXITCODE -eq 0)
  # Claude config: global CLAUDE.md + each project's memory folder.
  $cfgSame = $true
  if (Test-Path $globalMd) {
    & robocopy $claudeRoot $lastCfg "CLAUDE.md" /L /NJH /NJS /NFL /NDL *> $null
    if ($LASTEXITCODE -ne 0) { $cfgSame = $false }
  }
  foreach ($m in Get-MemoryDirs) {
    & robocopy $m.Path (Join-Path $lastCfg ("memory\" + $m.Name)) /MIR /L /NJH /NJS /NFL /NDL *> $null
    if ($LASTEXITCODE -ne 0) { $cfgSame = $false }
  }
  # Irreplaceable tool state: slash commands, hook wiring (settings.json), and the security guard.
  if (Test-Path $settingsSrc) {
    & robocopy $claudeRoot $lastCfg "settings.json" /L /NJH /NJS /NFL /NDL *> $null
    if ($LASTEXITCODE -ne 0) { $cfgSame = $false }
  }
  if (Test-Path $commandsSrc) {
    & robocopy $commandsSrc (Join-Path $lastCfg "commands") /MIR /L /NJH /NJS /NFL /NDL *> $null
    if ($LASTEXITCODE -ne 0) { $cfgSame = $false }
  }
  if (Test-Path $hooksSrc) {
    & robocopy $hooksSrc (Join-Path $lastCfg "hooks") /MIR /L /NJH /NJS /NFL /NDL *> $null
    if ($LASTEXITCODE -ne 0) { $cfgSame = $false }
  }
  if ($repoSame -and $skillsSame -and $cfgSame) { $changed = $false }
}
if (-not $changed) {
  Write-Log "[auto-backup] no changes since $($last.Name) - snapshot skipped."
  exit 0
}

# 3) Create a new timestamped snapshot. A "finish" run gets a "_finish" suffix and is kept forever.
$stamp    = Get-Date -Format "yyyy-MM-dd_HHmm"
if ($Force) { $stamp = "${stamp}_finish" }
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

# Claude config: global CLAUDE.md + every project's memory folder.
$cfgDest = Join-Path $snapshot "claude-config"
New-Item -ItemType Directory -Force -Path $cfgDest | Out-Null
$cfgCopied = @()
if (Test-Path $globalMd) {
  Copy-Item -LiteralPath $globalMd -Destination $cfgDest -Force
  $cfgCopied += "CLAUDE.md"
}
foreach ($m in Get-MemoryDirs) {
  & robocopy $m.Path (Join-Path $cfgDest ("memory\" + $m.Name)) /E /NFL /NDL /NJH /NJS /R:1 /W:1 *> $null
  if ($LASTEXITCODE -lt 8) { $cfgCopied += ("memory\" + $m.Name) }
}
# Irreplaceable tool state: slash commands (finish/start), hook wiring, and the security guard.
if (Test-Path $settingsSrc) {
  Copy-Item -LiteralPath $settingsSrc -Destination $cfgDest -Force
  $cfgCopied += "settings.json"
}
if (Test-Path $commandsSrc) {
  & robocopy $commandsSrc (Join-Path $cfgDest "commands") /E /NFL /NDL /NJH /NJS /R:1 /W:1 *> $null
  if ($LASTEXITCODE -lt 8) { $cfgCopied += "commands" }
}
if (Test-Path $hooksSrc) {
  & robocopy $hooksSrc (Join-Path $cfgDest "hooks") /E /NFL /NDL /NJH /NJS /R:1 /W:1 *> $null
  if ($LASTEXITCODE -lt 8) { $cfgCopied += "hooks" }
}

# Self-describing manifest.
$fileCount = (Get-ChildItem $repoDest -Recurse -File | Measure-Object).Count
$info = @(
  "Crypto Idea AUTO backup (whole project)",
  "Created : $stamp",
  "Source  : $repo",
  "Excluded: $($exclDirs -join ', ')",
  "Files   : $fileCount",
  "Skills  : $($skillsCopied -join ', ')",
  "Config  : $($cfgCopied -join ', ')",
  "Trigger : $(if ($Force) { 'finish (kept milestone)' } else { 'scheduled 3-hourly (rolling)' })"
) -join "`r`n"
Set-Content -Path (Join-Path $snapshot "backup-info.txt") -Value $info -Encoding utf8

Write-Log "[auto-backup] $(if ($Force) { 'FINISH' } else { 'scheduled' }) snapshot $stamp created ($fileCount files, $($skillsCopied.Count) skills, $($cfgCopied.Count) config items)."

# 4) Prune ONLY the rolling (non-finish) snapshots; keep the newest $Keep. Finish milestones stay.
$all = Get-ChildItem $Dest -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match $snapRoll } | Sort-Object Name
if ($all.Count -gt $Keep) {
  $all | Select-Object -First ($all.Count - $Keep) | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    Write-Log "[auto-backup] pruned old snapshot $($_.Name)."
  }
}
exit 0
