param([string]$ProjectPath = 'D:\HireWave_v2')
$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'apps\api\src\storage.ts'
$destination = Join-Path $ProjectPath 'apps\api\src\storage.ts'
if (-not (Test-Path -LiteralPath $source)) { throw 'Replacement file not found.' }
if (-not (Test-Path -LiteralPath $destination)) { throw "No storage.ts at $destination" }
$backup = "$destination.backup-$(Get-Date -Format yyyyMMdd-HHmmss)"
Copy-Item -LiteralPath $destination -Destination $backup -ErrorAction Stop
Copy-Item -LiteralPath $source -Destination $destination -Force -ErrorAction Stop
Write-Host "Replaced: $destination" -ForegroundColor Green
Write-Host "Backup: $backup" -ForegroundColor Yellow
Write-Host "Next: cd `"$ProjectPath`"; npm.cmd run build" -ForegroundColor Cyan
