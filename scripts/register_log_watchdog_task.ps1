#Requires -Version 5.1
# Register Danjeong log-watchdog every 30 min (Gemini multiplier / burst)
param([switch]$Unregister)

$ErrorActionPreference = 'Stop'
$root = 'D:\Memento\projects\danjeongshot'
$runner = Join-Path $root 'scripts\run_log_watchdog.ps1'
$taskName = 'Memento_DanjeongLogWatchdog'

$ps1 = @'
#Requires -Version 5.1
$ErrorActionPreference = "Continue"
Set-Location "D:\Memento\projects\danjeongshot"
npm run watchdog:logs:notify 2>&1 | Tee-Object -FilePath "docs\evidence\watchdog\log-watchdog-last.txt"
'@
Set-Content -Path $runner -Value $ps1 -Encoding UTF8

if ($Unregister) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "[unregister] $taskName"
  exit 0
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runner`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date.AddMinutes(5) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration ([TimeSpan]::MaxValue)
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "[register] $taskName — every 30m · npm run watchdog:logs:notify"
