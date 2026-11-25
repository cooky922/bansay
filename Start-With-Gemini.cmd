@echo off
python "%~dp0start_gemini.py" %*
if errorlevel 1 pause
