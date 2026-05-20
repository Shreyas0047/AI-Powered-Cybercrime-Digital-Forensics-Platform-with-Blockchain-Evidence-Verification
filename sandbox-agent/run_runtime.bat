@echo off
REM Sandbox Runtime Startup Script
REM Starts the headless sandbox runtime service in background

cd /d "%~dp0"

echo Starting Sandbox Runtime Service...
start /b python -m forensics_sandbox_agent.infrastructure.runtime_api --host 127.0.0.1 --port 8765 > runtime.log 2>&1

timeout /t 2 /nobreak >nul

echo Sandbox Runtime started on http://127.0.0.1:8765
echo To stop: taskkill /F /IM python.exe /FI "WINDOWTITLE eq *runtime*"
echo.
echo Press any key to exit...
pause >nul