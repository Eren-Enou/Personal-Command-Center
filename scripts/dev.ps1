param([ValidateSet('backend', 'frontend')][string]$Service = 'backend')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if ($Service -eq 'backend') {
    Push-Location (Join-Path $projectRoot 'backend')
    try {
        & .\.venv\Scripts\python.exe -m alembic upgrade head
        if ($LASTEXITCODE -ne 0) { throw 'Migration failed' }
        & .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
    } finally { Pop-Location }
} else {
    Push-Location (Join-Path $projectRoot 'frontend')
    try { & npm.cmd run dev -- --strictPort } finally { Pop-Location }
}
