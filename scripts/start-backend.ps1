param([switch]$Restart)

$ErrorActionPreference = 'Stop'
$workspacePath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$envPath = Join-Path $workspacePath '.env'
$publicConfig = @{}
Get-Content -LiteralPath $envPath | ForEach-Object {
  if ($_ -match '^([^#=]+)=(.*)$') {
    $publicConfig[$matches[1].Trim()] = $matches[2].Trim().Trim('"')
  }
}
$projectUrl = $publicConfig['EXPO_PUBLIC_SUPABASE_URL']
if (-not $projectUrl) { throw 'Missing EXPO_PUBLIC_SUPABASE_URL in .env.' }

$keyOutput = & npx.cmd supabase projects api-keys --project-ref ghfobpidbyfyiqgqtoqd --output json 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Supabase CLI could not retrieve backend credentials.' }
$apiKeys = ($keyOutput -join "`n") | ConvertFrom-Json
$serviceKey = ($apiKeys | Where-Object { $_.id -eq 'service_role' }).api_key
if (-not $serviceKey) { throw 'Supabase service role credential is unavailable.' }

$listener = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  $existing = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
  if (-not $existing -or $existing.CommandLine -notmatch 'backend/server\.mjs') {
    throw 'Port 8787 belongs to a different process.'
  }
  if (-not $Restart) {
    Write-Output "LinuxFIX backend is already running (PID $($existing.ProcessId))."
    return
  }
}

$previousUrl = [Environment]::GetEnvironmentVariable('SUPABASE_URL', 'Process')
$previousKey = [Environment]::GetEnvironmentVariable('SUPABASE_SECRET_KEY', 'Process')
try {
  [Environment]::SetEnvironmentVariable('SUPABASE_URL', $projectUrl, 'Process')
  [Environment]::SetEnvironmentVariable('SUPABASE_SECRET_KEY', $serviceKey, 'Process')
  if ($listener) {
    Stop-Process -Id $listener.OwningProcess -ErrorAction Stop
    Start-Sleep -Milliseconds 500
  }
  $runStamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $stdoutPath = Join-Path $workspacePath ".backend-runtime-$runStamp.log"
  $stderrPath = Join-Path $workspacePath ".backend-runtime-$runStamp-error.log"
  $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
  $backend = Start-Process -FilePath $nodePath -ArgumentList 'backend/server.mjs' -WorkingDirectory $workspacePath -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath -PassThru
  Write-Output "Started LinuxFIX backend (PID $($backend.Id))."
} finally {
  [Environment]::SetEnvironmentVariable('SUPABASE_URL', $previousUrl, 'Process')
  [Environment]::SetEnvironmentVariable('SUPABASE_SECRET_KEY', $previousKey, 'Process')
  $serviceKey = $null
}
