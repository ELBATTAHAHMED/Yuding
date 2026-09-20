<#
.SYNOPSIS
    Start travel-service with secrets loaded from backend/travel-service/.env.local

.DESCRIPTION
    Reads key=value pairs from backend/travel-service/.env.local,
    sets them as process-scoped environment variables (never user/machine scope),
    then launches travel-service via Maven in the same process context.

    Run from the Yuding repository root:
        .\scripts\start-travel-service.ps1

.NOTES
    .env.local is Git-ignored and must never be committed.
    Keys are loaded only for the duration of this PowerShell process.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot  = $PSScriptRoot | Split-Path -Parent
$envFile   = Join-Path $repoRoot 'backend\travel-service\.env.local'
$serviceDir = Join-Path $repoRoot 'backend\travel-service'

# ── Validate env file exists ─────────────────────────────────────────────────
if (-not (Test-Path $envFile)) {
    Write-Error @"
ERROR: $envFile not found.
Copy backend/travel-service/.env.example to backend/travel-service/.env.local
and fill in your real SCRAPPA_API_KEY.
"@
    exit 1
}

# ── Load variables from .env.local into the current process ──────────────────
Write-Host "[start-travel-service] Loading secrets from $envFile ..." -ForegroundColor Cyan

Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()

    # Skip blank lines and comments
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) {
        return
    }

    $eqIdx = $line.IndexOf('=')
    if ($eqIdx -lt 1) {
        Write-Warning "Skipping malformed line: $_"
        return
    }

    $key   = $line.Substring(0, $eqIdx).Trim()
    $value = $line.Substring($eqIdx + 1).Trim()

    [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
    Write-Host "  SET $key=***" -ForegroundColor DarkGray
}

# ── Validate critical variable ────────────────────────────────────────────────
$apiKey = [System.Environment]::GetEnvironmentVariable('SCRAPPA_API_KEY', 'Process')
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Error @"
ERROR: SCRAPPA_API_KEY is empty in $envFile.
Open $envFile and paste your real Scrappa API key after 'SCRAPPA_API_KEY='.
"@
    exit 1
}

Write-Host "[start-travel-service] Secrets loaded. Starting travel-service on port 8082 ..." -ForegroundColor Green

# ── Launch travel-service via Maven (blocks until stopped) ────────────────────
Push-Location $serviceDir
try {
    & mvn spring-boot:run
} finally {
    Pop-Location
}
