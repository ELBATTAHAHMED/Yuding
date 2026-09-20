<#
.SYNOPSIS
    Yuding V2 — One-Command Local Development Stack Launcher

.DESCRIPTION
    Starts the full Yuding V2 development ecosystem on Windows PowerShell.
    Dependency order:
      1. Infrastructure verification (PostgreSQL:5433, Redis:6379)
      2. Config Server (config-service:9091)
      3. Service Discovery (discovery-service / Eureka:8761)
      4. Downstream Microservices:
         - identity-service (8081)
         - travel-service (8082, with local .env.local secrets)
         - reservation-service (8084)
         - commentaire-service (8090)
         - ai-service (8072)
      5. API Gateway (gateway-service:8888)
      6. Next.js Web Frontend (frontend/web:3000)

    Process PIDs are recorded in .dev-pids.json for clean termination via scripts/stop-dev.ps1.
    Service logs are streamed into .dev-logs/<service>.log.

.PARAMETER Build
    Rebuild all backend JARs and frontend bundle before launching.
    Defaults to $false (uses pre-built artifacts for fast startup).

.EXAMPLE
    .\scripts\start-dev.ps1
    .\scripts\start-dev.ps1 -Build
#>

[CmdletBinding()]
param (
    [switch]$Build
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$logsDir  = Join-Path $repoRoot '.dev-logs'
$pidsFile = Join-Path $repoRoot '.dev-pids.json'

if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

Write-Host @"
==================================================================
  Yuding V2 - Local Development Stack Launcher
  Repository: $repoRoot
==================================================================
"@ -ForegroundColor Cyan

# ── 1. Check Infrastructure (PostgreSQL & Redis) ─────────────────────────────
Write-Host "`n[1/6] Verifying Infrastructure dependencies..." -ForegroundColor Yellow

$pgPort    = 5433
$redisPort = 6379

function Test-PortListening ([string]$hostName, [int]$port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect($hostName, $port, $null, $null)
        $wait = $iar.AsyncWaitHandle.WaitOne(1000, $false)
        if ($wait -and $tcp.Connected) {
            $tcp.EndConnect($iar)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
        return $false
    } catch {
        return $false
    }
}

$pgOk    = Test-PortListening 'localhost' $pgPort
$redisOk = Test-PortListening 'localhost' $redisPort

if (-not $pgOk -or -not $redisOk) {
    Write-Host "  Infra missing (PostgreSQL:$pgPort=$pgOk, Redis:$redisPort=$redisOk). Attempting docker compose..." -ForegroundColor DarkYellow
    $dockerComposeFile = Join-Path $repoRoot 'infra\docker-compose.yml'
    if (Test-Path $dockerComposeFile) {
        & docker compose -f $dockerComposeFile up -d postgres redis
        Start-Sleep -Seconds 3
        $pgOk    = Test-PortListening 'localhost' $pgPort
        $redisOk = Test-PortListening 'localhost' $redisPort
    }
}

if (-not $pgOk) {
    Write-Error "PostgreSQL is not reachable on port $pgPort. Please start it using: docker compose -f infra/docker-compose.yml up -d postgres"
    exit 1
}
if (-not $redisOk) {
    Write-Error "Redis is not reachable on port $redisPort. Please start it using: docker compose -f infra/docker-compose.yml up -d redis"
    exit 1
}
Write-Host "  [OK] PostgreSQL (port $pgPort) and Redis (port $redisPort) are active." -ForegroundColor Green

# ── Process Tracker ───────────────────────────────────────────────────────────
$trackedProcesses = [System.Collections.Generic.List[PSCustomObject]]::new()

function Register-TrackedProcess ([string]$name, [int]$processId, [int]$port, [string]$logFile) {
    $trackedProcesses.Add([PSCustomObject]@{
        Name    = $name
        Pid     = $processId
        Port    = $port
        LogFile = $logFile
    })
    $trackedProcesses | ConvertTo-Json -Depth 3 | Set-Content -Path $pidsFile -Encoding utf8
}

function Wait-PortListening ([int]$port, [int]$timeoutSec = 35) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortListening 'localhost' $port) {
            return $true
        }
        Start-Sleep -Milliseconds 600
    }
    return $false
}

function Wait-HttpEndpoint ([string]$url, [int]$timeoutSec = 35) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $res = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 400) {
                return $true
            }
        } catch {
            # continue polling
        }
        Start-Sleep -Milliseconds 600
    }
    return $false
}

# ── Optional Rebuild ──────────────────────────────────────────────────────────
if ($Build) {
    Write-Host "`n[Build] Rebuilding backend services and frontend bundle..." -ForegroundColor Yellow
    $backendDirs = @(
        'config-service', 'discovery-service', 'identity-service',
        'travel-service', 'reservation-service', 'commentaire-service',
        'ai-service', 'gateway-service'
    )
    foreach ($svc in $backendDirs) {
        Write-Host "  Building $svc ..." -ForegroundColor DarkCyan
        $svcDir = Join-Path $repoRoot "backend\$svc"
        Push-Location $svcDir
        try {
            & .\mvnw.cmd package -DskipTests | Out-Null
        } finally {
            Pop-Location
        }
    }

    Write-Host "  Building frontend/web ..." -ForegroundColor DarkCyan
    Push-Location (Join-Path $repoRoot 'frontend\web')
    try {
        & cmd.exe /c "npm run build" | Out-Null
    } finally {
        Pop-Location
    }
}

# Helper to start Java service
function Start-BackendService ([string]$serviceName, [int]$port) {
    $svcDir  = Join-Path $repoRoot "backend\$serviceName"
    $jarPath = Join-Path $svcDir "target\$serviceName-0.0.1-SNAPSHOT.jar"

    if (-not (Test-Path $jarPath)) {
        Write-Host "  JAR not found for $serviceName, compiling once..." -ForegroundColor DarkYellow
        Push-Location $svcDir
        try {
            & .\mvnw.cmd package -DskipTests
        } finally {
            Pop-Location
        }
    }

    $logPath = Join-Path $logsDir "$serviceName.log"
    if (Test-Path $logPath) {
        Clear-Content $logPath -ErrorAction SilentlyContinue
    }

    # Launch java process via cmd /c with stdout and stderr captured into single log file
    $cmdArg = "/c `"java -jar `"$jarPath`" > `"$logPath`" 2>&1`""
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArg -WorkingDirectory $svcDir -WindowStyle Hidden -PassThru

    Register-TrackedProcess $serviceName $proc.Id $port $logPath
    Write-Host "  [STARTED] $serviceName (PID: $($proc.Id), Port: $port) -> logs: .dev-logs\$serviceName.log" -ForegroundColor Green
    return $proc
}

# ── 2. Start Config Server (9091) ─────────────────────────────────────────────
Write-Host "`n[2/6] Starting Config Server (config-service:9091)..." -ForegroundColor Yellow
Start-BackendService 'config-service' 9091 | Out-Null
Write-Host "  Waiting for Config Server on port 9091..." -ForegroundColor DarkGray
$configOk = Wait-PortListening 9091 35
if ($configOk) {
    Write-Host "  [OK] Config Server is listening on port 9091." -ForegroundColor Green
} else {
    Write-Warning "Config Server did not start listening within 35s. Check .dev-logs\config-service.log"
}

# ── 3. Start Discovery Server (Eureka:8761) ───────────────────────────────────
Write-Host "`n[3/6] Starting Service Discovery (discovery-service:8761)..." -ForegroundColor Yellow
Start-BackendService 'discovery-service' 8761 | Out-Null
Write-Host "  Waiting for Eureka on port 8761..." -ForegroundColor DarkGray
$eurekaOk = Wait-PortListening 8761 35
if ($eurekaOk) {
    Write-Host "  [OK] Eureka Service Discovery is listening on port 8761." -ForegroundColor Green
} else {
    Write-Warning "Eureka did not start listening within 35s. Check .dev-logs\discovery-service.log"
}

# ── 4. Start Core Downstream Microservices ────────────────────────────────────
Write-Host "`n[4/6] Starting Downstream Microservices..." -ForegroundColor Yellow

# Identity Service (8081)
Start-BackendService 'identity-service' 8081 | Out-Null

# Travel Service (8082, load .env.local secrets into process environment)
$travelEnvFile = Join-Path $repoRoot 'backend\travel-service\.env.local'
if (Test-Path $travelEnvFile) {
    Get-Content $travelEnvFile | ForEach-Object {
        $line = $_.Trim()
        if (-not [string]::IsNullOrWhiteSpace($line) -and -not $line.StartsWith('#')) {
            $eq = $line.IndexOf('=')
            if ($eq -gt 0) {
                $k = $line.Substring(0, $eq).Trim()
                $v = $line.Substring($eq + 1).Trim()
                [System.Environment]::SetEnvironmentVariable($k, $v, 'Process')
            }
        }
    }
}
Start-BackendService 'travel-service' 8082 | Out-Null

# Reservation Service (8084)
Start-BackendService 'reservation-service' 8084 | Out-Null

# Commentaire Service (8090)
Start-BackendService 'commentaire-service' 8090 | Out-Null

# AI Service (8072)
Start-BackendService 'ai-service' 8072 | Out-Null

# ── 5. Start API Gateway (8888) ───────────────────────────────────────────────
Write-Host "`n[5/6] Starting API Gateway (gateway-service:8888)..." -ForegroundColor Yellow
Start-BackendService 'gateway-service' 8888 | Out-Null
Write-Host "  Waiting for API Gateway on port 8888..." -ForegroundColor DarkGray
$gatewayOk = Wait-PortListening 8888 30
if ($gatewayOk) {
    Write-Host "  [OK] API Gateway is active on port 8888." -ForegroundColor Green
} else {
    Write-Warning "API Gateway did not start listening within 30s. Check .dev-logs\gateway-service.log"
}

# ── 6. Start Next.js Frontend (3000) ──────────────────────────────────────────
Write-Host "`n[6/6] Starting Web Frontend (frontend/web:3000)..." -ForegroundColor Yellow
$webDir = Join-Path $repoRoot 'frontend\web'

# Check if build exists, otherwise build it
$buildManifest = Join-Path $webDir '.next\build-manifest.json'
if (-not (Test-Path $buildManifest)) {
    Write-Host "  Production build missing in frontend/web, building..." -ForegroundColor DarkCyan
    Push-Location $webDir
    try {
        & cmd.exe /c "npm run build"
    } finally {
        Pop-Location
    }
}

$webLogPath = Join-Path $logsDir 'frontend-web.log'
if (Test-Path $webLogPath) {
    Clear-Content $webLogPath -ErrorAction SilentlyContinue
}

$webCmdArg = "/c `"npm run start > `"$webLogPath`" 2>&1`""
$webProc = Start-Process -FilePath "cmd.exe" -ArgumentList $webCmdArg -WorkingDirectory $webDir -WindowStyle Hidden -PassThru

Register-TrackedProcess 'frontend-web' $webProc.Id 3000 $webLogPath
Write-Host "  [STARTED] frontend-web (PID: $($webProc.Id), Port: 3000) -> logs: .dev-logs\frontend-web.log" -ForegroundColor Green

Write-Host "  Waiting for Next.js on port 3000..." -ForegroundColor DarkGray
$webOk = Wait-PortListening 3000 25
if ($webOk) {
    Write-Host "  [OK] Next.js frontend is active on port 3000." -ForegroundColor Green
}

# ── Summary Report ────────────────────────────────────────────────────────────
Write-Host @"

==================================================================
  Yuding V2 - Local Development Stack is RUNNING!
==================================================================

  Service Endpoints:
  --------------------------------------------------------------
  Frontend (Web):        http://localhost:3000
  Flight Search UI:      http://localhost:3000/flights
  API Gateway:           http://localhost:8888
  Eureka Dashboard:      http://localhost:8761
  Config Server:         http://localhost:9091
  Identity Service:      http://localhost:8081
  Travel Service:        http://localhost:8082
  Reservation Service:   http://localhost:8084
  Commentaire Service:   http://localhost:8090
  AI Service:            http://localhost:8072

  Log files located in:  $logsDir\
  Tracked processes:     $pidsFile

  To stop all services cleanly:
    .\scripts\stop-dev.ps1

==================================================================
"@ -ForegroundColor Green
