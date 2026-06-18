# Reports whether code changed since the architecture diagrams were last updated, so stale
# diagrams get redrawn on "finish". Read-only (only git read commands) and ALWAYS exits 0, so it
# can never block a message. Two modes:
#   - as a UserPromptSubmit hook (default): reads the hook JSON from stdin, only reports when the
#     message contains "finish".
#   - manually: run with  -Manual  to print the report unconditionally (no stdin).
param([switch]$Manual)

if (-not $Manual) {
  try {
    $raw    = [Console]::In.ReadToEnd()
    $data   = $raw | ConvertFrom-Json
    $prompt = [string]$data.prompt
  } catch {
    exit 0   # malformed/empty input - do nothing
  }
  if ($prompt -notmatch "(?i)finish") { exit 0 }
}

$repo = Split-Path $PSScriptRoot -Parent
Push-Location $repo
try {
  # Baseline = the last commit that touched the diagrams. Anything in the code paths changed
  # after that point (committed or still in the working tree) may need a diagram refresh.
  $diagRef = (git log -1 --format=%H -- docs/diagrams 2>$null | Out-String).Trim()
  if (-not $diagRef) {
    Write-Output "[diagram drift] no diagram history yet - nothing to compare."
    return
  }

  $paths = @('functions', 'src', 'firestore.rules', 'firestore.indexes.json', 'vite.config.js', 'firebase.json', 'public')

  $committed   = @(git diff --name-only "$diagRef" HEAD -- $paths 2>$null) | Where-Object { $_ }
  $uncommitted = @(git status --porcelain -- $paths 2>$null) |
                   ForEach-Object { ($_ -replace '^...', '').Trim() } | Where-Object { $_ }
  $changed = @($committed) + @($uncommitted) | Sort-Object -Unique

  if (-not $changed) {
    Write-Output "[diagram drift] diagrams are in sync with the code - no code changes since the last diagram update."
    return
  }

  Write-Output "[diagram drift] code changed since the diagrams were last updated ($($diagRef.Substring(0,7))). Decide which of these need a redraw, then update docs/diagrams/ before finishing:"
  $changed | ForEach-Object { Write-Output "  - $_" }
} finally {
  Pop-Location
}
exit 0
