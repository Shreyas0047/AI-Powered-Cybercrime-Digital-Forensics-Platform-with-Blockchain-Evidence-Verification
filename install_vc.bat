@echo off
powershell -Command "Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vc_redist.x64.exe' -OutFile 'C:\Windows\Temp\vc_redist.x64.exe'"
if exist "C:\Windows\Temp\vc_redist.x64.exe" (
    C:\Windows\Temp\vc_redist.x64.exe /install /quiet /norestart
)
echo Done