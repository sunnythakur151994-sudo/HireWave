$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 20+ is required." }
$major = [int]((node -p "process.versions.node.split('.')[0]").Trim())
if ($major -lt 20) { throw "Node.js 20+ is required. Current major: $major" }
if (-not (Test-Path .env)) { Copy-Item .env.example .env; Write-Host "Created .env from .env.example. Edit its secrets before production use." }
npm install
npm run build
npm test
Write-Host "Setup complete. Run: npm run dev"
