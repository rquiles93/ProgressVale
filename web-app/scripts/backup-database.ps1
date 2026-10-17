[CmdletBinding()]
param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\backups")
)

$ErrorActionPreference = "Stop"
$containerName = "postgres-ablls"
$databaseName = "ablls_db"
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$filename = "ablls_db_$timestamp.backup"
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
$outputFile = Join-Path $resolvedOutput $filename
$containerFile = "/tmp/$filename"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is not available. No backup was created."
}

$running = docker inspect --format '{{.State.Running}}' $containerName 2>$null
if ($LASTEXITCODE -ne 0 -or $running -ne "true") {
  throw "The dedicated postgres-ablls container is not running. No backup was created."
}

[System.IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null
if ([System.IO.File]::Exists($outputFile)) {
  throw "Backup already exists: $outputFile. Existing backups are never overwritten."
}

try {
  docker exec $containerName sh -lc "PGPASSWORD=`"`$POSTGRES_PASSWORD`" pg_dump --username=`"`$POSTGRES_USER`" --dbname=$databaseName --format=custom --file=$containerFile"
  if ($LASTEXITCODE -ne 0) { throw "pg_dump failed." }

  docker exec $containerName pg_restore --list $containerFile *> $null
  if ($LASTEXITCODE -ne 0) { throw "Backup integrity verification failed." }

  docker cp "${containerName}:${containerFile}" $outputFile
  if ($LASTEXITCODE -ne 0 -or -not [System.IO.File]::Exists($outputFile)) { throw "Copying the verified backup failed." }

  Write-Host "Verified backup created: $outputFile"
}
finally {
  docker exec $containerName rm -f -- $containerFile *> $null
}
