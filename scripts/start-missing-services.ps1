$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$logsDir  = Join-Path $repoRoot '.dev-logs'
$pidsFile = Join-Path $repoRoot '.dev-pids.json'

function Import-EnvironmentFile ([string]$path, [switch]$Override) {
    if (-not (Test-Path $path)) { return }
    Get-Content $path | ForEach-Object {
        $line = $_.Trim()
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) { return }
        $eq = $line.IndexOf('=')
        if ($eq -le 0) { return }
        $key = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
        if ($Override -or [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key, 'Process'))) {
            [Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }
    }
}

Import-EnvironmentFile (Join-Path $repoRoot '.env')
Import-EnvironmentFile (Join-Path $repoRoot '.env.local') -Override

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

function Wait-PortListening ([int]$port, [int]$timeoutSec = 35) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortListening 'localhost' $port) { return $true }
        Start-Sleep -Milliseconds 600
    }
    return $false
}

function Start-BackendService ([string]$serviceName, [int]$port) {
    if (Test-PortListening 'localhost' $port) {
        Write-Host "Service $serviceName is already listening on port $port." -ForegroundColor Cyan
        return
    }
    $svcDir  = Join-Path $repoRoot "backend\$serviceName"
    $jarPath = Join-Path $svcDir "target\$serviceName-0.0.1-SNAPSHOT.jar"
    $logPath = Join-Path $logsDir "$serviceName.log"

    $profileArg = if ($serviceName -eq 'config-service') { '-Dspring.profiles.active=native ' } else { '' }
    $cmdArg = "/c `"java $profileArg-jar `"$jarPath`" > `"$logPath`" 2>&1`""
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList $cmdArg -WorkingDirectory $svcDir -WindowStyle Hidden -PassThru
    Write-Host "Started $serviceName PID: $($proc.Id) on port $port" -ForegroundColor Green
    return $proc
}

Write-Host "Starting config-service..."
Start-BackendService 'config-service' 9091
Wait-PortListening 9091 30

Write-Host "Starting discovery-service..."
Start-BackendService 'discovery-service' 8761
Wait-PortListening 8761 30

Write-Host "Starting identity-service..."
Start-BackendService 'identity-service' 8081

Write-Host "Starting notification-service..."
Start-BackendService 'notification-service' 8085

Write-Host "Starting travel-service..."
Start-BackendService 'travel-service' 8082

Write-Host "Starting commentaire-service..."
Start-BackendService 'commentaire-service' 8090

Write-Host "Starting ai-service..."
Start-BackendService 'ai-service' 8072

Write-Host "Waiting for services to initialize..."
Wait-PortListening 8081 40
Wait-PortListening 8082 40

Write-Host "Starting gateway-service..."
Start-BackendService 'gateway-service' 8888
Wait-PortListening 8888 40

Write-Host "Done starting services."
