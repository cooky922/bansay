$ErrorActionPreference = 'Stop'
python (Join-Path $PSScriptRoot 'start_gemini.py') @args
exit $LASTEXITCODE
