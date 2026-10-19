@echo off
cd /d "%~dp0"
call npm.cmd install
if errorlevel 1 (
  echo ERROR: npm install failed.
  pause
  exit /b 1
)
call npm.cmd run build
if errorlevel 1 (
  echo ERROR: Build failed.
  pause
  exit /b 1
)
call npm.cmd test
if errorlevel 1 (
  echo ERROR: Tests failed.
  pause
  exit /b 1
)
echo Build and tests complete.
pause
