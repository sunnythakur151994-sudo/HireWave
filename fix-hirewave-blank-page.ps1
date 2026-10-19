# HireWave v0.3 blank-page fix: safely adjust the browser import only.
# Run: powershell -NoProfile -ExecutionPolicy Bypass -File "D:\HireWave\fix-hirewave-blank-page.ps1"
param([string]$ProjectPath = "D:\HireWave")
$ErrorActionPreference = "Stop"
$pkgPath = Join-Path $ProjectPath 'packages\shared\package.json'
$profilePath = Join-Path $ProjectPath 'apps\web\src\pages\CandidateProfile.tsx'
if (-not (Test-Path $pkgPath) -or -not (Test-Path $profilePath)) {
    throw "Cannot find HireWave v0.3 at $ProjectPath. Please check the folder path."
}
$oldImport = 'import { PROFILE_GROUPS, PROFILE_LABELS, ensureProfileFields } from "@hirewave/shared";'
$newImport = 'import { PROFILE_GROUPS, PROFILE_LABELS, ensureProfileFields } from "@hirewave/shared/profile";'
$oldExport = '"exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },'
$newExport = '"exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" }, "./profile": { "types": "./dist/profile.d.ts", "import": "./dist/profile.js" } },'
$profText = [System.IO.File]::ReadAllText($profilePath)
$pkgText = [System.IO.File]::ReadAllText($pkgPath)
if ($profText.Contains($newImport) -and $pkgText.Contains('"./profile"')) {
    Write-Host 'Fix is already installed.' -ForegroundColor Green
    exit 0
}
if (-not $profText.Contains($oldImport)) { throw 'Unexpected CandidateProfile.tsx import. No files changed.' }
if (-not $pkgText.Contains($oldExport)) { throw 'Unexpected shared/package.json exports. No files changed.' }
$backup = Join-Path $ProjectPath ('hirewave-fix-backup-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
Copy-Item $pkgPath (Join-Path $backup 'package.json')
Copy-Item $profilePath (Join-Path $backup 'CandidateProfile.tsx')
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($pkgPath, $pkgText.Replace($oldExport, $newExport), $utf8)
[System.IO.File]::WriteAllText($profilePath, $profText.Replace($oldImport, $newImport), $utf8)
Write-Host 'Fixed the browser-only profile import.' -ForegroundColor Green
Write-Host "Backup created: $backup"
Write-Host "Restart HireWave: cd `"$ProjectPath`" ; npm.cmd run dev" -ForegroundColor Cyan
