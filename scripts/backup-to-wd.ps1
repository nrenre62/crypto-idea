# Backup Crypto Idea docs, drawings + skills to the WD drive as a timestamped snapshot.
# Triggered automatically by the UserPromptSubmit hook when a message contains "finish",
# and runnable by hand:  powershell -File scripts\backup-to-wd.ps1
#
# What it copies (read-only source; never deletes anything on D:):
#   - every *.md in the repo (CLAUDE.md, README.md, AGILE.md, docs, etc.) - keeps folder layout
#   - the drawings in docs\diagrams (*.svg / *.png)
#   - all personal skills from ~/.claude/skills (auto-discovered)
# Into:  D:\apps\crypto-idea-backup\<yyyy-MM-dd_HHmm>\  (repo\ + skills\)

param(
  [string]$Dest = "D:\apps\crypto-idea-backup"
)

$ErrorActionPreference = "Stop"

# Resolve key locations
$repo      = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$skillsSrc = Join-Path $env:USERPROFILE ".claude\skills"
# All personal skills under ~/.claude/skills, auto-discovered so new skills are always included.
$skills    = if (Test-Path $skillsSrc) { @(Get-ChildItem $skillsSrc -Directory | Select-Object -ExpandProperty Name) } else { @() }

# Fail clearly (but softly via the hook wrapper) if the WD drive isn't mounted
$driveRoot = Split-Path -Qualifier $Dest
if (-not (Test-Path "$driveRoot\")) {
  throw "Backup drive $driveRoot is not available - skipped."
}

# Timestamped snapshot folder
$stamp    = Get-Date -Format "yyyy-MM-dd_HHmm"
$snapshot = Join-Path $Dest $stamp
$repoDest = Join-Path $snapshot "repo"
New-Item -ItemType Directory -Force -Path $repoDest | Out-Null

# 1) All Markdown files, preserving the repo's folder layout
$mdFiles = Get-ChildItem -Path $repo -Recurse -Filter *.md -File |
  Where-Object { $_.FullName -notmatch "\\node_modules\\" }
foreach ($f in $mdFiles) {
  $rel    = $f.FullName.Substring($repo.Length).TrimStart("\")
  $target = Join-Path $repoDest $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
  Copy-Item -LiteralPath $f.FullName -Destination $target -Force
}

# 2) Drawings (non-md files under docs\diagrams)
$diagrams = Join-Path $repo "docs\diagrams"
$drawings = @()
if (Test-Path $diagrams) {
  $drawings = Get-ChildItem -Path $diagrams -File |
    Where-Object { $_.Extension -in ".svg", ".png", ".drawio", ".excalidraw" }
  $drawDest = Join-Path $repoDest "docs\diagrams"
  New-Item -ItemType Directory -Force -Path $drawDest | Out-Null
  foreach ($d in $drawings) {
    Copy-Item -LiteralPath $d.FullName -Destination (Join-Path $drawDest $d.Name) -Force
  }
}

# 3) Skills
$skillsDest = Join-Path $snapshot "skills"
New-Item -ItemType Directory -Force -Path $skillsDest | Out-Null
$skillsCopied = @()
foreach ($s in $skills) {
  $src = Join-Path $skillsSrc $s
  if (Test-Path $src) {
    Copy-Item -LiteralPath $src -Destination $skillsDest -Recurse -Force
    $skillsCopied += $s
  }
}

# Small manifest so each snapshot is self-describing
$info = @(
  "Crypto Idea backup",
  "Created : $stamp",
  "Source  : $repo",
  "MD files: $($mdFiles.Count)",
  "Drawings: $($drawings.Count)",
  "Skills  : $($skillsCopied -join ', ')"
) -join "`r`n"
Set-Content -Path (Join-Path $snapshot "backup-info.txt") -Value $info -Encoding utf8

Write-Output "Backed up to $snapshot ($($mdFiles.Count) MD, $($drawings.Count) drawings, $($skillsCopied.Count) skills)"
