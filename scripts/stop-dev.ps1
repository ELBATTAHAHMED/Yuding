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

function Stop-TrackedTree ([int]$processId) {
    Get-CimInstance Win32_Process -Filter "ParentProcessId = $processId" | ForEach-Object {
        Stop-TrackedTree $_.ProcessId
    }
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

if (Test-Path $pidsFile) {
    try {
        $pidsData = Get-Content $pidsFile -Raw | ConvertFrom-Json
        foreach ($procInfo in $pidsData) {
            $pidToStop = $procInfo.Pid
            $name      = $procInfo.Name
            $port      = $procInfo.Port

            $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $pidToStop" -ErrorAction SilentlyContinue
            if ($proc -and $proc.CommandLine -and $proc.CommandLine.Contains($repoRoot)) {
                Write-Host "  Stopping $name (PID: $pidToStop, Port: $port)..." -ForegroundColor DarkGray
                
                # The launcher uses cmd -> npm -> Next on Windows. Stop only
                # descendants of its tracked wrapper, including grandchildren.
                try { Stop-TrackedTree $pidToStop } catch {}
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

# Clean up orphaned backend JARs from this checkout only. Port 3000 may be a
# separately started Next dev server that start-dev deliberately reuses.
$yudingPorts = @(9091, 8761, 8081, 8085, 8082, 8084, 8090, 8072, 8888)
foreach ($p in $yudingPorts) {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            $owningPid = $conn.OwningProcess
            if ($owningPid -gt 4) {
                $process = Get-CimInstance Win32_Process -Filter "ProcessId = $owningPid" -ErrorAction SilentlyContinue
                if ($process -and $process.Name -eq 'java.exe' -and $process.CommandLine -and $process.CommandLine.Contains((Join-Path $repoRoot 'backend\'))) {
                    Write-Host "  Cleaning up Yuding backend on port $p (PID: $owningPid)..." -ForegroundColor DarkYellow
                    Stop-Process -Id $owningPid -Force -ErrorAction SilentlyContinue
                    $stoppedCount++
                }
            }
        }
    }
}

Write-Host "`nAll Yuding local services have been stopped. ($stoppedCount process(es) terminated)`n" -ForegroundColor Green
