# Start travel-service with ONCF GTFS provider
# Run from: backend/travel-service/

$ErrorActionPreference = "Stop"

# Load env vars
$envFile = Join-Path $PSScriptRoot ".env.local"
$envVars = @{}

foreach ($line in Get-Content $envFile) {
    $line = $line.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { continue }
    $eqIdx = $line.IndexOf("=")
    if ($eqIdx -gt 0) {
        $key = $line.Substring(0, $eqIdx).Trim()
        $val = $line.Substring($eqIdx + 1).Trim()
        $envVars[$key] = $val
        [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
}

Write-Host "Environment loaded:"
Write-Host "  TRAVEL_TRAINS_PROVIDER=$env:TRAVEL_TRAINS_PROVIDER"
Write-Host "  ONCF_GTFS_ENABLED=$env:ONCF_GTFS_ENABLED"
Write-Host "  ONCF_GTFS_DATA_PATH=$env:ONCF_GTFS_DATA_PATH"
Write-Host ""

$jar = Join-Path $PSScriptRoot "target\travel-service-0.0.1-SNAPSHOT.jar"
Write-Host "Starting: $jar"

& java -jar $jar
