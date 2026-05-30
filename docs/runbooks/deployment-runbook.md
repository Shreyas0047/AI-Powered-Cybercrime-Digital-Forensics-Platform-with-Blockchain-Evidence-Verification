# Local Deployment Runbook

Docker deployment has been removed. This runbook describes the supported local runtime workflow.

## Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB 6.0+
- Optional: VirtualBox for sandbox execution

## One-Time Setup

1. Start MongoDB locally and confirm it is reachable:

```powershell
mongosh "mongodb://localhost:27017/forensics_platform" --eval "db.adminCommand('ping')"
```

2. Configure backend secrets:

```powershell
Copy-Item backend\.env.example backend\.env -ErrorAction SilentlyContinue
notepad backend\.env
```

Minimum required values:

```env
MONGODB_URI=mongodb://localhost:27017/forensics_platform
JWT_SECRET=<32-character-minimum-secret>
JWT_REFRESH_SECRET=<32-character-minimum-secret>
BLOCKCHAIN_ENABLED=false
AI_SERVICE_ENABLED=false
```

3. Configure frontend API URLs when defaults are not enough:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
```

## Start Services

Backend:

```powershell
cd backend
npm install
npm run dev
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

AI service:

```powershell
cd ai-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Sandbox agent (`sandbox-agent-v2`):

```powershell
cd sandbox-agent-v2
py -3.11 -m pip install -r requirements.txt
py -3.11 main.py
```

The agent serves the runtime REST + WebSocket API on `http://127.0.0.1:8765`.

## Health Checks

```powershell
Invoke-WebRequest http://localhost:3000/api/v1/operations/health
Invoke-WebRequest http://localhost:3000/api/v1/operations/ready
Invoke-WebRequest http://localhost:3000/api/v1/operations/live
Invoke-WebRequest http://localhost:3000/api/v1/operations/metrics
```

## Database Backup

```powershell
mongodump --uri "mongodb://localhost:27017/forensics_platform" --archive=backups\nyxtrace.gz --gzip
```

Restore:

```powershell
mongorestore --uri "mongodb://localhost:27017/forensics_platform" --archive=backups\nyxtrace.gz --gzip
```

## Logs

- Backend logs: `backend\logs\`
- Sandbox agent logs: `logs\`
- AI service logs: terminal output unless redirected by the local operator

Do not retain routine logs in source control. Keep only forensic evidence examples that are intentionally part of a scenario.
