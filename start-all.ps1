# start-all.ps1 — Starts backend, frontend, and AI service in parallel

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WorkingDirectory $PSScriptRoot
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WorkingDirectory $PSScriptRoot
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ai-service; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 127.0.0.1 --port 8000" -WorkingDirectory $PSScriptRoot
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd sandbox-agent; python start_runtime.py" -WorkingDirectory $PSScriptRoot

Write-Host "All services starting in separate windows..." -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:3000" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "  AI:       http://localhost:8000" -ForegroundColor Green
Write-Host "  Sandbox:  http://127.0.0.1:8765" -ForegroundColor Green
