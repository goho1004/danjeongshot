#Requires -Version 5.1
$ErrorActionPreference = "Continue"
Set-Location "D:\Memento\projects\danjeongshot"
npm run watchdog:logs:notify 2>&1 | Tee-Object -FilePath "docs\evidence\watchdog\log-watchdog-last.txt"
