# Operational Runbook

This runbook covers local operations for the NyxTrace platform. Docker commands have been removed because container deployment is not part of the supported project workflow.

## Service Startup

Start MongoDB locally before the backend:

```powershell
mongosh "mongodb://localhost:27017/forensics_platform" --eval "db.adminCommand('ping')"
```

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

The agent listens on `http://127.0.0.1:8765` and exposes the runtime REST + WebSocket API.

## Health Checks

```powershell
Invoke-WebRequest http://localhost:3000/api/v1/operations/health
Invoke-WebRequest http://localhost:3000/api/v1/operations/ready
Invoke-WebRequest http://localhost:3000/api/v1/operations/live
Invoke-WebRequest http://localhost:3000/api/v1/operations/metrics
Invoke-WebRequest http://localhost:3000/api/v1/operations/workers
```

## Log Locations

- Backend logs: `backend\logs\`
- Sandbox agent + monitoring logs: `logs\`
- AI service logs: terminal output unless redirected by the local operator

Routine logs are disposable operational output. Preserve only logs that are intentionally part of an evidence package or investigation record.

## Common Operations

Restart backend:

```powershell
cd backend
Ctrl+C
npm run dev
```

Rebuild backend:

```powershell
cd backend
npm run build
npm start
```

Rebuild frontend:

```powershell
cd frontend
npm run build
npm run preview
```

Restart the sandbox agent:

```powershell
# In the sandbox-agent-v2 terminal
Ctrl+C
py -3.11 main.py
```

## Database Checks

Ping MongoDB:

```powershell
mongosh "mongodb://localhost:27017/forensics_platform" --eval "db.adminCommand('ping')"
```

Inspect collection counts:

```powershell
mongosh "mongodb://localhost:27017/forensics_platform" --eval "db.getCollectionNames().forEach(c => print(c + ': ' + db[c].countDocuments()))"
```

Backup:

```powershell
New-Item -ItemType Directory -Force backups
mongodump --uri "mongodb://localhost:27017/forensics_platform" --archive=backups\nyxtrace.gz --gzip
```

Restore:

```powershell
mongorestore --uri "mongodb://localhost:27017/forensics_platform" --archive=backups\nyxtrace.gz --gzip
```

## Worker Control

Worker state is exposed through the operations API:

```powershell
Invoke-WebRequest http://localhost:3000/api/v1/operations/workers
```

Use the authenticated operations endpoints for start, stop, and restart actions when enabled in the backend.

## Troubleshooting

Backend cannot connect to MongoDB:

- Confirm MongoDB is running locally.
- Confirm `MONGODB_URI` in `backend\.env`.
- Run the MongoDB ping command above.

Frontend cannot reach API:

- Confirm backend is running on the configured port.
- Confirm `frontend\.env` points `VITE_API_URL` to the backend.
- Check browser network errors and backend `api.log`.

AI analysis unavailable:

- Confirm `AI_SERVICE_ENABLED=true` only when the FastAPI service is running.
- Confirm `AI_SERVICE_URL=http://localhost:8000`.
- Check `http://localhost:8000/docs` or the AI service terminal.

Blockchain verification unavailable:

- Keep `BLOCKCHAIN_ENABLED=false` for local offline operation.
- When enabling blockchain, verify RPC URL, contract address, and wallet configuration before starting the backend.
