param(
  [string]$ProjectPath = 'D:\HireWave_v2'
)
$ErrorActionPreference = 'Stop'
$sourceFile = Join-Path $ProjectPath 'apps\api\src\storage.ts'
if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
  throw "HireWave source file not found: $sourceFile"
}
$source = [System.IO.File]::ReadAllText($sourceFile)
$old = 'const sc = (list: Array<{orgId:string}>) => list.filter(x => tenants.has(x.orgId));'
$new = 'const sc = <T extends { orgId: string }>(list: T[]): T[] => list.filter(x => tenants.has(x.orgId));'
if ($source.Contains($new)) {
  Write-Host 'This TypeScript fix is already installed. No files were changed.' -ForegroundColor Green
  exit 0
}
if (-not $source.Contains($old)) {
  throw "Expected line not found. No change made. Please share lines 110-125 of $sourceFile"
}
$backup = "$sourceFile.bak-before-type-fix-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $sourceFile -Destination $backup -ErrorAction Stop
$updated = $source.Replace($old, $new)
[System.IO.File]::WriteAllText($sourceFile, $updated, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Fixed admin TypeScript helper: $sourceFile" -ForegroundColor Green
Write-Host "Backup saved: $backup"
Write-Host 'Now run these commands:'
Write-Host "  cd `"$ProjectPath`""
Write-Host '  npm.cmd run build'
Write-Host '  npm.cmd run dev'
