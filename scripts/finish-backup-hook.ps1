# UserPromptSubmit hook: when your message contains "finish", force a full end-of-day snapshot
# to the WD drive. Reads the hook JSON from stdin, checks the prompt, and runs the unified
# auto-backup script with -Force (same backup as the 3-hourly run, but kept as a milestone).
# Always exits 0 so it can NEVER block your message - if the drive is missing it just notes it.

try {
  $raw  = [Console]::In.ReadToEnd()
  $data = $raw | ConvertFrom-Json
  $prompt = [string]$data.prompt
} catch {
  exit 0   # malformed/empty input - do nothing
}

if ($prompt -notmatch "(?i)finish") { exit 0 }

try {
  $out = & (Join-Path $PSScriptRoot "auto-backup-to-wd.ps1") -Force 2>&1 | Out-String
  Write-Output "[WD backup] $($out.Trim())"
} catch {
  Write-Output "[WD backup] skipped: $($_.Exception.Message)"
}
exit 0
