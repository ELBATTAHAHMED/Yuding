<#
.SYNOPSIS
    Yuding V2 — Stop Local Development Stack

.DESCRIPTION
    Stops all Yuding V2 microservices and frontend instances launched by start-dev.ps1.
    Uses .dev-pids.json to target ONLY Yuding development processes.
    Does NOT terminate unrelated Java, Node, or system processes.

.EXAMPLE
    .\scripts\stop-dev.ps1
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'SilentlyContinue'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pidsFile = Join-Path $repoRoot '.dev-pids.json'

Write-Host @"
==================================================================
  Yuding V2 - Stopping Local Development Stack
==================================================================
"@ -ForegroundColor Yellow

$stoppedCount = 0

if (Test-Path $pidsFile) {
    try {
        $pidsData = Get-Content $pidsFile -Raw | ConvertFrom-Json
        foreach ($procInfo in $pidsData) {
            $pidToStop = $procInfo.Pid
            $name      = $procInfo.Name
            $port      = $procInfo.Port

            $proc = Get-Process -Id $pidToStop -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Stopping $name (PID: $pidToStop, Port: $port)..." -ForegroundColor DarkGray
                
                # Stop child processes first (e.g. cmd.exe -> node.exe)
                try {
                    Get-CimInstance Win32_Process -Filter "ParentProcessId = $pidToStop" | ForEach-Object {
                        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
                    }
                } catch {}

                Stop-Process -Id $pidToStop -Force -ErrorAction SilentlyContinue
                $stoppedCount++
                Write-Host "  [STOPPED] $name (PID: $pidToStop)" -ForegroundColor Green
            } else {
                Write-Host "  [ALREADY STOPPED] $name (PID: $pidToStop)" -ForegroundColor DarkGray
            }
        }
    } catch {
        Write-Warning "Could not parse $pidsFile : $($_.Exception.Message)"
    }

    Remove-Item $pidsFile -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "No active .dev-pids.json found." -ForegroundColor DarkGray
}

# Also verify standard Yuding service ports are freed (in case parent process was killed but child retained port)
$yudingPorts = @(9091, 8761, 8081, 8082, 8084, 8090, 8072, 8888, 3000)
foreach ($p in $yudingPorts) {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            $owningPid = $conn.OwningProcess
            if ($owningPid -gt 4) {
                $process = Get-Process -Id $owningPid -ErrorAction SilentlyContinue
                if ($process -and ($process.ProcessName -match 'java|node')) {
                    Write-Host "  Cleaning up process on port $p (PID: $owningPid, Name: $($process.ProcessName))..." -ForegroundColor DarkYellow
                    Stop-Process -Id $owningPid -Force -ErrorAction SilentlyContinue
                    $stoppedCount++
                }
            }
        }
    }
}

Write-Host "`nAll Yuding local services have been stopped. ($stoppedCount process(es) terminated)`n" -ForegroundColor Green
