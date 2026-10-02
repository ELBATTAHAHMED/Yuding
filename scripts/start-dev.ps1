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
         - notification-service (8085)
         - travel-service (8082, with local .env.local secrets)
         - reservation-service (8084)
         - commentaire-service (8090)
         - ai-service (8072)
      5. API Gateway (gateway-service:8888)
      6. Next.js Web Frontend (frontend/web:3000)

    Process PIDs are recorded in .dev-pids.json for clean termination via scripts/stop-dev.ps1.
    Service logs are streamed into .dev-logs/<service>.log.

.PARAMETER Build
    Rebuild all backend JARs and the frontend bundle when port 3000 is free.
    By default, rebuilds only stale backend JARs and runs Next.js in dev mode.

.EXAMPLE
    .\scripts\start-dev.ps1
    .\scripts\start-dev.ps1 -Build
#>

[CmdletBinding()]
param (
    [switch]$Build,
    [switch]$Wait
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$logsDir  = Join-Path $repoRoot '.dev-logs'
$pidsFile = Join-Path $repoRoot '.dev-pids.json'

# A previous launch can leave live Java processes behind after its shell
# exits. Restart only backend processes whose command line points into this checkout.
# A foreign process on a Yuding port is reported below instead of being killed.
$runningProjectProcesses = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq 'java.exe' -and $_.CommandLine -and
    $_.CommandLine.Contains((Join-Path $repoRoot 'backend\')) -and
    $_.CommandLine -match '-jar\s'
}
foreach ($runningProcess in $runningProjectProcesses) {
    Write-Host "  Restarting existing Yuding process PID $($runningProcess.ProcessId)..." -ForegroundColor DarkYellow
    Stop-Process -Id $runningProcess.ProcessId -Force -ErrorAction Stop
}
if ($runningProjectProcesses) { Start-Sleep -Seconds 2 }
foreach ($servicePort in @(9091, 8761, 8081, 8085, 8082, 8084, 8090, 8072, 8888)) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $servicePort -ErrorAction SilentlyContinue
    if ($listener) {
        throw "Port $servicePort is already in use by another process. Free it before starting Yuding."
    }
}
if (Test-Path $pidsFile) { Remove-Item $pidsFile -Force }

if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

function Import-EnvironmentFile ([string]$path, [switch]$Override) {
    if (-not (Test-Path $path)) {
        return
    }

    Get-Content $path | ForEach-Object {
        $line = $_.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) {
            return
        }

        $eq = $line.IndexOf('=')
        if ($eq -le 0) {
            return
        }

        $key = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
        if ($Override -or [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key, 'Process'))) {
            [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }
    }
}

Import-EnvironmentFile (Join-Path $repoRoot '.env')
# Local overrides win over the shared .env file so Gmail SMTP credentials
# in .env.local are actually passed to notification-service.
Import-EnvironmentFile (Join-Path $repoRoot '.env.local') -Override

# `next build` uses NODE_ENV=production even for the local stack. The browser
# must use Next's same-origin /api rewrite; a root .env localhost URL is rejected
# by the frontend's production security guard.
[Environment]::SetEnvironmentVariable('NEXT_PUBLIC_API_BASE_URL', '/api', 'Process')

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
        'notification-service',
        'travel-service', 'reservation-service', 'commentaire-service',
        'ai-service', 'gateway-service'
    )
    foreach ($svc in $backendDirs) {
        Write-Host "  Building $svc ..." -ForegroundColor DarkCyan
        $svcDir = Join-Path $repoRoot "backend\$svc"
        Push-Location $svcDir
        try {
            & .\mvnw.cmd package -DskipTests | Out-Null
            if ($LASTEXITCODE -ne 0) { throw "Build failed for $svc" }
        } finally {
            Pop-Location
        }
    }

    if (-not (Test-PortListening 'localhost' 3000)) {
        Write-Host "  Building frontend/web ..." -ForegroundColor DarkCyan
        Push-Location (Join-Path $repoRoot 'frontend\web')
        try {
            & cmd.exe /c "npm run build" | Out-Null
            if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
        } finally {
            Pop-Location
        }
    } else {
        Write-Host '  Skipping frontend build while an existing web server uses port 3000.' -ForegroundColor DarkYellow
    }
}

# Helper to start Java service
function Start-BackendService ([string]$serviceName, [int]$port) {
    $svcDir  = Join-Path $repoRoot "backend\$serviceName"
    $jarPath = Join-Path $svcDir "target\$serviceName-0.0.1-SNAPSHOT.jar"

    $latestSource = Get-ChildItem (Join-Path $svcDir 'src\main') -Recurse -File |
        Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
    $pom = Get-Item (Join-Path $svcDir 'pom.xml')
    $jar = Get-Item $jarPath -ErrorAction SilentlyContinue
    if (-not $jar -or $latestSource.LastWriteTimeUtc -gt $jar.LastWriteTimeUtc -or $pom.LastWriteTimeUtc -gt $jar.LastWriteTimeUtc) {
        Write-Host "  Building current $serviceName JAR..." -ForegroundColor DarkYellow
        Push-Location $svcDir
        try {
            & .\mvnw.cmd package -DskipTests
            if ($LASTEXITCODE -ne 0) { throw "Build failed for $serviceName" }
        } finally {
            Pop-Location
        }
    }

    $logPath = Join-Path $logsDir "$serviceName.log"
    if (Test-Path $logPath) {
        Clear-Content $logPath -ErrorAction SilentlyContinue
    }

    # The shared development profile is for downstream services. Config Server
    # must use its native repository even when SPRING_PROFILES_ACTIVE=dev is set.
    $profileArg = if ($serviceName -eq 'config-service') { '-Dspring.profiles.active=native ' } else { '' }

    # Launch java process via cmd /c with stdout and stderr captured into single log file
    $cmdArg = "/c `"java $profileArg-jar `"$jarPath`" > `"$logPath`" 2>&1`""
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
    throw "Config Server did not start. Check .dev-logs\config-service.log"
}

# ── 3. Start Discovery Server (Eureka:8761) ───────────────────────────────────
Write-Host "`n[3/6] Starting Service Discovery (discovery-service:8761)..." -ForegroundColor Yellow
Start-BackendService 'discovery-service' 8761 | Out-Null
Write-Host "  Waiting for Eureka on port 8761..." -ForegroundColor DarkGray
$eurekaOk = Wait-PortListening 8761 35
if ($eurekaOk) {
    Write-Host "  [OK] Eureka Service Discovery is listening on port 8761." -ForegroundColor Green
} else {
    throw "Eureka did not start. Check .dev-logs\discovery-service.log"
}

# ── 4. Start Core Downstream Microservices ────────────────────────────────────
Write-Host "`n[4/6] Starting Downstream Microservices..." -ForegroundColor Yellow

# Identity Service (8081)
Start-BackendService 'identity-service' 8081 | Out-Null

# Notification Service (8085) — durable email queue and SMTP worker
Start-BackendService 'notification-service' 8085 | Out-Null

# Travel Service (8082, load .env.local secrets into process environment)
# Ensure ONCF GTFS dataset is present for train search
$gtfsCalendar = Join-Path $repoRoot 'backend\travel-service\data\oncf-gtfs\calendar.txt'
if (-not (Test-Path $gtfsCalendar)) {
    Write-Host "  ONCF GTFS dataset missing. Running scripts/update-oncf-gtfs.ps1..." -ForegroundColor DarkYellow
    $updateScript = Join-Path $repoRoot 'scripts\update-oncf-gtfs.ps1'
    if (Test-Path $updateScript) {
        & powershell -ExecutionPolicy Bypass -File $updateScript
    }
}
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

# A listening Config Server or Gateway does not prove that downstream services
# started successfully. Check every service before claiming the stack is ready.
foreach ($service in @(
    @{ Name = 'identity-service'; Port = 8081 },
    @{ Name = 'notification-service'; Port = 8085 },
    @{ Name = 'travel-service'; Port = 8082 },
    @{ Name = 'reservation-service'; Port = 8084 },
    @{ Name = 'commentaire-service'; Port = 8090 },
    @{ Name = 'ai-service'; Port = 8072 }
)) {
    $url = "http://localhost:$($service.Port)/actuator/health"
    Write-Host "  Waiting for $($service.Name) on port $($service.Port)..." -ForegroundColor DarkGray
    if (-not (Wait-HttpEndpoint $url 120)) {
        throw "$($service.Name) is not healthy on port $($service.Port). Check .dev-logs\$($service.Name).log"
    }
    Write-Host "  [OK] $($service.Name) is healthy." -ForegroundColor Green
}

# ── 5. Start API Gateway (8888) ───────────────────────────────────────────────
Write-Host "`n[5/6] Starting API Gateway (gateway-service:8888)..." -ForegroundColor Yellow
Start-BackendService 'gateway-service' 8888 | Out-Null
Write-Host "  Waiting for API Gateway on port 8888..." -ForegroundColor DarkGray
$gatewayOk = Wait-HttpEndpoint 'http://localhost:8888/actuator/health' 90
if ($gatewayOk) {
    Write-Host "  [OK] API Gateway is active on port 8888." -ForegroundColor Green
} else {
    throw "API Gateway did not become healthy. Check .dev-logs\gateway-service.log"
}

# Eureka registration can lag behind a healthy Gateway. Wait until an actual
# routed AI request reaches the downstream service (which rejects anonymous
# conversation access with 401) before reporting the stack as ready.
Write-Host '  Waiting for AI route through API Gateway...' -ForegroundColor DarkGray
$aiRouteReady = $false
$aiRouteDeadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $aiRouteDeadline) {
    $routeStatus = 0
    try {
        $routeResponse = Invoke-WebRequest -Uri 'http://localhost:8888/api/ai/conversations' -Method Get -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        $routeStatus = [int]$routeResponse.StatusCode
    } catch {
        if ($_.Exception.Response) {
            $routeStatus = [int]$_.Exception.Response.StatusCode
        }
    }
    if ($routeStatus -eq 401) {
        $aiRouteReady = $true
        break
    }
    Start-Sleep -Seconds 1
}
if (-not $aiRouteReady) {
    throw 'AI route is not ready through API Gateway. Check .dev-logs\gateway-service.log and .dev-logs\ai-service.log'
}
Write-Host '  [OK] AI route is ready through API Gateway.' -ForegroundColor Green

# ── 6. Start Next.js Frontend (3000) ──────────────────────────────────────────
Write-Host "`n[6/6] Starting Web Frontend (frontend/web:3000)..." -ForegroundColor Yellow
$webDir = Join-Path $repoRoot 'frontend\web'

if (Test-PortListening 'localhost' 3000) {
    Write-Host '  Reusing the existing frontend on port 3000.' -ForegroundColor DarkCyan
} else {
    $webLogPath = Join-Path $logsDir 'frontend-web.log'
    if (Test-Path $webLogPath) {
        Clear-Content $webLogPath -ErrorAction SilentlyContinue
    }
    $webCmdArg = "/c `"npm run dev > `"$webLogPath`" 2>&1`""
    $webProc = Start-Process -FilePath "cmd.exe" -ArgumentList $webCmdArg -WorkingDirectory $webDir -WindowStyle Hidden -PassThru
    Register-TrackedProcess 'frontend-web' $webProc.Id 3000 $webLogPath
    Write-Host "  [STARTED] frontend-web (PID: $($webProc.Id), Port: 3000) -> logs: .dev-logs\frontend-web.log" -ForegroundColor Green
}

Write-Host "  Waiting for Next.js on port 3000..." -ForegroundColor DarkGray
$webOk = Wait-HttpEndpoint 'http://localhost:3000/' 60
if ($webOk) {
    Write-Host "  [OK] Next.js frontend is active on port 3000." -ForegroundColor Green
}
else {
    throw "Next.js frontend did not become ready. Check .dev-logs\frontend-web.log"
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
  Notification Service:  http://localhost:8085
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

if ($Wait) {
    Write-Host "`nStack is running in wait mode. Press Ctrl+C to exit..." -ForegroundColor Cyan
    while ($true) {
        Start-Sleep -Seconds 5
    }
}
