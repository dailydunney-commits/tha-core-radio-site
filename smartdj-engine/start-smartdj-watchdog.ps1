Set-Location "C:\Projects\tha-core-radio-site\smartdj-engine"

Write-Host "Starting Tha Core SmartDJ watchdog on port 5050..." -ForegroundColor Cyan

while ($true) {
  $listener = Get-NetTCPConnection -LocalPort 5050 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

  if ($listener) {
    Write-Host "SmartDJ is already running on port 5050. PID: $($listener.OwningProcess)" -ForegroundColor Green
    Start-Sleep -Seconds 5
    continue
  }

  Write-Host "SmartDJ not running. Starting engine..." -ForegroundColor Yellow
  npm run dev

  Write-Host "SmartDJ stopped or crashed. Restarting in 3 seconds..." -ForegroundColor Red
  Start-Sleep -Seconds 3
}
