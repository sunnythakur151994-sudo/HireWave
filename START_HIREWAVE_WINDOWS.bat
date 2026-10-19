@echo off
cd /d "%~dp0"
if not exist package.json (
  echo ERROR: Could not find package.json. Extract full ZIP first.
  pause
  exit /b 1
)
if not exist .env (
  copy .env.example .env >nul
  echo Created .env from example. Outbound sending is disabled by default.
)
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js 20 or higher must be installed first.
  pause
  exit /b 1
)
call npm.cmd install
if errorlevel 1 (
  echo ERROR: npm install failed. Please copy the error from this window.
  pause
  exit /b 1
)
call npm.cmd run dev
if errorlevel 1 (
  echo ERROR: Development server stopped with an error.
)
pause
