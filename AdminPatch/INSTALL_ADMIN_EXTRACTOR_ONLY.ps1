param(
  [string]$ProjectPath = 'D:\HireWave_v2'
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceDir = Join-Path $here 'files'
$root = (Resolve-Path -LiteralPath $ProjectPath -ErrorAction Stop).Path
if (!(Test-Path -LiteralPath (Join-Path $root 'package.json'))) { throw 'Target is not a HireWave repository: package.json is missing.' }
if (!(Test-Path -LiteralPath (Join-Path $root 'apps\web\src\pages\Dashboard.tsx'))) { throw 'Target is not a HireWave v0.6 project: Dashboard.tsx is missing.' }
if (!(Test-Path -LiteralPath (Join-Path $root 'apps\web\src\components\GuidedTour.tsx'))) { throw 'The v0.6 guided tour is missing. Install the v0.6 project before this patch.' }
$pkg = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
if ($pkg.version -notlike '0.6*') { throw "Only v0.6 source is supported. Found version: $($pkg.version). Use the v0.6 project, not the redesigned v0.7 folder." }
$items = @(Get-ChildItem -LiteralPath $sourceDir -Recurse -File)
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $root ("_backups\admin-extractor-" + $timestamp)
$staged = Join-Path $root ("_backups\admin-extractor-stage-" + $timestamp)
New-Item -ItemType Directory -Path $backup -Force | Out-Null
New-Item -ItemType Directory -Path $staged -Force | Out-Null
$completed = New-Object System.Collections.Generic.List[string]
try {
  foreach ($item in $items) {
    $rel = $item.FullName.Substring($sourceDir.Length + 1)
    $dest = Join-Path $root $rel
    $target = Join-Path $staged $rel
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath $item.FullName -Destination $target -Force
    if (Test-Path -LiteralPath $dest) {
      $before = Join-Path $backup $rel
      New-Item -ItemType Directory -Path (Split-Path -Parent $before) -Force | Out-Null
      Copy-Item -LiteralPath $dest -Destination $before -Force
    }
  }
  foreach ($item in $items) {
    $rel = $item.FullName.Substring($sourceDir.Length + 1)
    $dest = Join-Path $root $rel
    New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $staged $rel) -Destination $dest -Force
    $completed.Add($dest)
  }
} catch {
  foreach ($dest in $completed) {
    $rel = $dest.Substring($root.Length + 1)
    $before = Join-Path $backup $rel
    if (Test-Path -LiteralPath $before) { Copy-Item -LiteralPath $before -Destination $dest -Force }
    elseif (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Force }
  }
  throw
} finally {
  if (Test-Path -LiteralPath $staged) { Remove-Item -LiteralPath $staged -Recurse -Force }
}
Write-Host ''
Write-Host 'Admin + Extractor features installed in HireWave v0.6.' -ForegroundColor Green
Write-Host 'Original dashboard, theme, navigation and 3D tour were not replaced.'
Write-Host "Backup: $backup"
Write-Host 'Next steps:'
Write-Host "  cd `"$root`""
Write-Host '  node scripts/setup-admin.mjs'
Write-Host '  npm.cmd run build'
Write-Host '  npm.cmd run dev'
