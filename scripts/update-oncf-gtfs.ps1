# ==============================================================================
# Yuding V2 - ONCF GTFS Dataset Synchronization Script
# Downloads and verifies the latest community ONCF GTFS dataset for local indexing
# ==============================================================================
[CmdletBinding()]
param (
    [string]$SourceUrl = "https://raw.githubusercontent.com/orhazal/oncf-gtfs-unofficial/master/oncf-gtfs.zip",
    [string]$TargetDir = "",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

if ([string]::IsNullOrWhiteSpace($TargetDir)) {
    $TargetDir = Join-Path $repoRoot "backend\travel-service\data\oncf-gtfs"
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " Yuding V2 - ONCF GTFS Dataset Synchronization" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

Write-Host "Target directory : $TargetDir" -ForegroundColor Gray
Write-Host "Source archive   : $SourceUrl" -ForegroundColor Gray

if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

$tempZip = Join-Path ([System.IO.Path]::GetTempPath()) ("oncf-gtfs-" + [System.Guid]::NewGuid().ToString("N") + ".zip")
$tempExtract = Join-Path ([System.IO.Path]::GetTempPath()) ("oncf-gtfs-extract-" + [System.Guid]::NewGuid().ToString("N"))

try {
    Write-Host "`n[1/4] Downloading latest ONCF GTFS dataset..." -ForegroundColor Yellow
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13
    Invoke-WebRequest -Uri $SourceUrl -OutFile $tempZip -UseBasicParsing
    $zipSize = (Get-Item $tempZip).Length
    Write-Host "  [OK] Downloaded archive ($([math]::Round($zipSize / 1KB, 1)) KB)" -ForegroundColor Green

    Write-Host "`n[2/4] Extracting GTFS files..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $tempExtract -Force | Out-Null
    Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force

    $requiredFiles = @("agency.txt", "stops.txt", "routes.txt", "trips.txt", "stop_times.txt", "calendar.txt")
    $optionalFiles = @("feed_info.txt", "attributions.txt", "translations.txt", "calendar_dates.txt")

    foreach ($file in $requiredFiles) {
        $sourceFile = Join-Path $tempExtract $file
        if (-not (Test-Path $sourceFile)) {
            throw "GTFS verification failed: Required file '$file' is missing in downloaded archive."
        }
    }
    Write-Host "  [OK] All required GTFS files verified" -ForegroundColor Green

    Write-Host "`n[3/4] Parsing and verifying GTFS service calendar & integrity..." -ForegroundColor Yellow

    # Parse calendar
    $calendarPath = Join-Path $tempExtract "calendar.txt"
    $calendarRows = Import-Csv -Path $calendarPath
    if ($calendarRows.Count -eq 0) {
        throw "GTFS verification failed: calendar.txt has 0 service records."
    }

    $validityStarts = $calendarRows | ForEach-Object { $_.start_date } | Sort-Object
    $validityEnds = $calendarRows | ForEach-Object { $_.end_date } | Sort-Object

    $earliestStartRaw = $validityStarts[0]
    $latestEndRaw = $validityEnds[-1]

    # Convert YYYYMMDD to YYYY-MM-DD
    $earliestStart = [datetime]::ParseExact($earliestStartRaw, "yyyyMMdd", [System.Globalization.CultureInfo]::InvariantCulture).ToString("yyyy-MM-dd")
    $latestEnd = [datetime]::ParseExact($latestEndRaw, "yyyyMMdd", [System.Globalization.CultureInfo]::InvariantCulture).ToString("yyyy-MM-dd")

    # Counts
    $stationRows = Import-Csv -Path (Join-Path $tempExtract "stops.txt")
    $parentStations = ($stationRows | Where-Object { $_.location_type -eq "1" }).Count
    if ($parentStations -eq 0) {
        $parentStations = $stationRows.Count
    }

    $routeRows = Import-Csv -Path (Join-Path $tempExtract "routes.txt")
    $tripRows = Import-Csv -Path (Join-Path $tempExtract "trips.txt")
    $stopTimeRows = Import-Csv -Path (Join-Path $tempExtract "stop_times.txt")

    $feedVersion = "community"
    if (Test-Path (Join-Path $tempExtract "feed_info.txt")) {
        $feedInfo = Import-Csv -Path (Join-Path $tempExtract "feed_info.txt")
        if ($feedInfo.feed_version) {
            $feedVersion = $feedInfo.feed_version
        }
    }

    Write-Host "  [OK] Calendar validity: $earliestStart to $latestEnd" -ForegroundColor Green
    Write-Host "  [OK] Stations: $($stationRows.Count) total ($parentStations parent stations)" -ForegroundColor Green
    Write-Host "  [OK] Routes: $($routeRows.Count), Trips: $($tripRows.Count), Stop times: $($stopTimeRows.Count)" -ForegroundColor Green

    Write-Host "`n[4/4] Synchronizing files to target directory..." -ForegroundColor Yellow
    foreach ($file in ($requiredFiles + $optionalFiles)) {
        $src = Join-Path $tempExtract $file
        if (Test-Path $src) {
            $dst = Join-Path $TargetDir $file
            Copy-Item -Path $src -Destination $dst -Force
        }
    }

    Write-Host "  [OK] Successfully synchronized GTFS dataset to: $TargetDir" -ForegroundColor Green

    Write-Host "`n========================================================" -ForegroundColor Cyan
    Write-Host " ONCF GTFS Dataset Metadata Summary" -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan
    [PSCustomObject]@{
        Source          = "orhazal/oncf-gtfs-unofficial (GitHub)"
        Status          = "Unofficial / Community-Maintained (ODbL-1.0)"
        FeedVersion     = $feedVersion
        ValidityStart   = $earliestStart
        ValidityEnd     = $latestEnd
        TotalStations   = $stationRows.Count
        ParentStations  = $parentStations
        Routes          = $routeRows.Count
        Trips           = $tripRows.Count
        StopTimes       = $stopTimeRows.Count
        CalendarEntries = $calendarRows.Count
    } | Format-List
    Write-Host "========================================================`n" -ForegroundColor Cyan

} finally {
    if (Test-Path $tempZip) {
        Remove-Item -Force $tempZip -ErrorAction SilentlyContinue
    }
    if (Test-Path $tempExtract) {
        Remove-Item -Recurse -Force $tempExtract -ErrorAction SilentlyContinue
    }
}
