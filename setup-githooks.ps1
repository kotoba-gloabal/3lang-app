# One-time setup: enable auto-push after commit
$hooksPath = Join-Path $PSScriptRoot ".githooks"
git config core.hooksPath $hooksPath
Write-Host "Git hooks enabled: $hooksPath"
Write-Host "post-commit hook will auto-push main/master to origin after each commit."
