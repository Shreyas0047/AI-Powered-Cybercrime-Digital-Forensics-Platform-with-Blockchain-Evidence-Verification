$ErrorActionPreference = 'Continue'
$errFile = "$env:TEMP\sb_err_$$.txt"
$outFile = "$env:TEMP\sb_out_$$.txt"

Start-Process -FilePath "C:\Users\shreyas\Desktop\cybersec projects\minmax virus project\dist\sandbox-agent\ForensicsSandboxAgent.exe" -Wait -NoNewWindow -RedirectStandardError $errFile -RedirectStandardOutput $outFile

Write-Host "=== STDERR ==="
if (Test-Path $errFile) { Get-Content $errFile }
Write-Host "=== STDOUT ==="
if (Test-Path $outFile) { Get-Content $outFile }
