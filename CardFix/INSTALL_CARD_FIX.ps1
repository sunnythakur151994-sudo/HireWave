# HireWave v0.6 UI Card TypeScript fix (preserves original design)
param([string]$ProjectPath = 'D:\HireWave_v2')
$ErrorActionPreference = 'Stop'
$target = Join-Path $ProjectPath 'apps\web\src\components\ui.tsx'
if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
  throw "Cannot find ui.tsx at $target. Check -ProjectPath."
}
$source = [System.IO.File]::ReadAllText($target)
$oldImport = 'import type { ButtonHTMLAttributes, ReactNode } from "react";'
$newImport = 'import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";'
$oldSignature = 'export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {'
$newSignature = 'export function Card({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {'
$oldMarkup = '  return <div className={`rounded-xl border border-teal-900/60 bg-ink-900/70 backdrop-blur p-5 ${className}`}>{children}</div>;'
$newMarkup = '  return <div className={`rounded-xl border border-teal-900/60 bg-ink-900/70 backdrop-blur p-5 ${className}`} {...rest}>{children}</div>;'
if ($source.Contains($newSignature) -and $source.Contains($newMarkup)) {
  Write-Host 'Card already accepts standard HTML props. No changes needed.' -ForegroundColor Green
  exit 0
}
if (-not ($source.Contains($oldImport) -and $source.Contains($oldSignature) -and $source.Contains($oldMarkup))) {
  throw 'ui.tsx differs from the expected HireWave v0.6 component. No changes made; please share this file for a tailored fix.'
}
$backup = "$target.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -LiteralPath $target -Destination $backup -ErrorAction Stop
$patched = $source.Replace($oldImport,$newImport).Replace($oldSignature,$newSignature).Replace($oldMarkup,$newMarkup)
[System.IO.File]::WriteAllText($target, $patched, [System.Text.UTF8Encoding]::new($false))
Write-Host "Patched: $target" -ForegroundColor Green
Write-Host "Backup: $backup"
Write-Host 'Next: cd "D:\HireWave_v2"; npm.cmd run build'
