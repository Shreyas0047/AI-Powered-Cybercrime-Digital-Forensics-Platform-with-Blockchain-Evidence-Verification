# start-all.ps1 — Orchestrated startup with health-check polling
# Starts services in dependency order: backend -> AI -> sandbox-agent -> frontend

$ErrorActionPreference = "Continue"

$configJson = Get-Content "$PSScriptRoot\shared\config\services.json" -Raw | ConvertFrom-Json
$backendUrl = $configJson.services.backend.url
$backendHealth = $backendUrl + $configJson.services.backend.healthEndpoint
$aiUrl = $configJson.services.aiService.url
$aiHealth = $aiUrl + $configJson.services.aiService.healthEndpoint
$sandboxUrl = $configJson.services.sandboxAgent.url
$sandboxHealth = $sandboxUrl + $configJson.services.sandboxAgent.healthEndpoint
$frontendUrl = $configJson.services.frontend.url

function Wait-ForHealth {
    param([string]$Name, [string]$Url, [int]$Retries = 30, [int]$IntervalMs = 2000, [int]$WarmupSec = 0)
    if ($WarmupSec -gt 0) {
        Write-Host "  [..] Giving $Name $WarmupSec s to warm up..." -ForegroundColor DarkGray
        Start-Sleep -Seconds $WarmupSec
    }
    for ($i = 1; $i -le $Retries; $i++) {
        try {
            $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            Write-Host "  [OK] $Name is responding (HTTP $($resp.StatusCode))" -ForegroundColor Green
            return $true
        } catch {
            # 503 / 4xx still means the server is listening — just unhealthy
            $sc = $_.Exception.Response.StatusCode.value__
            if ($sc -ge 400 -and $sc -lt 600) {
                Write-Host "  [OK] $Name is responding (HTTP $sc - degraded but up)" -ForegroundColor DarkYellow
                return $true
            }
        }
        Write-Host "  [..] Waiting for $Name ($i/$Retries)..." -ForegroundColor Yellow
        Start-Sleep -Milliseconds $IntervalMs
    }
    Write-Host "  [!!] $Name did not respond" -ForegroundColor Red
    return $false
}

Write-Host ""
Write-Host "=== ForensicsAI Platform Startup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Backend
Write-Host "[1/4] Starting Backend..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev" -WorkingDirectory $PSScriptRoot
Wait-ForHealth -Name "Backend" -Url $backendHealth -WarmupSec 8 -Retries 30 | Out-Null

# 2. AI Service
Write-Host ""
Write-Host "[2/4] Starting AI Service..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd ai-service; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 127.0.0.1 --port 8000" -WorkingDirectory $PSScriptRoot
Wait-ForHealth -Name "AI Service" -Url $aiHealth | Out-Null

# 3. Sandbox Agent
Write-Host ""
Write-Host "[3/4] Starting Sandbox Agent..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd sandbox-agent-v2; python main.py" -WorkingDirectory $PSScriptRoot
Wait-ForHealth -Name "Sandbox Agent" -Url $sandboxHealth | Out-Null

# 4. Frontend
Write-Host ""
Write-Host "[4/4] Starting Frontend..." -ForegroundColor White
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -WorkingDirectory $PSScriptRoot

Write-Host ""
Write-Host "=== All Services Launched ===" -ForegroundColor Cyan
Write-Host "  Backend:  $backendUrl" -ForegroundColor Green
Write-Host "  Frontend: $frontendUrl" -ForegroundColor Green
Write-Host "  AI:       $aiUrl" -ForegroundColor Green
Write-Host "  Sandbox:  $sandboxUrl" -ForegroundColor Green
Write-Host ""
