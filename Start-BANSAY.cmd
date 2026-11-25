@echo off
setlocal
cd /d "%~dp0.."
where python >nul 2>&1
if errorlevel 1 (
  echo Install Python 3.11 or newer and enable its PATH option, then reopen this file.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:8765 in your browser. Press Ctrl+C here to stop.
python -m bansay.server
if errorlevel 1 pause
