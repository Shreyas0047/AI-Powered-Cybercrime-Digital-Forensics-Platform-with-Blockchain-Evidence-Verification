# ForensicsAI Platform

AI-powered cybercrime digital forensics platform with blockchain evidence verification.

This is an educational cybersecurity platform for malware behavior simulation and forensic analysis in controlled VirtualBox sandbox environments. It is not offensive security tooling.

## What It Includes

- React + TypeScript frontend for dashboards, investigations, evidence, alerts, telemetry, blockchain operations, threat intelligence, and forensic analytics.
- Express + TypeScript backend API with JWT/RBAC, MongoDB, WebSocket telemetry, enterprise security middleware, health checks, queue services, and analytics.
- FastAPI AI service for threat classification, severity scoring, anomaly detection, and summaries.
- PyQt6 desktop sandbox agent and five safe educational malware simulators.
- Blockchain evidence verification, chain of custody, IOC, and correlation services.

## Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB Atlas account (or cloud MongoDB instance)
- Optional: VirtualBox for sandbox execution

## Local Quick Start

1. Configure backend environment:

```powershell
Copy-Item .env.example backend\.env -ErrorAction SilentlyContinue
notepad backend\.env
```

Required backend values:

```env
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/forensics_platform
JWT_SECRET=<32-character-minimum-secret>
JWT_REFRESH_SECRET=<32-character-minimum-secret>
SANDBOX_AGENT_SECRET=<shared-secret-for-agent-auth>
AI_SERVICE_ENABLED=false
AI_SERVICE_URL=http://localhost:8000
AI_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
BLOCKCHAIN_ENABLED=false
```

2. (Removed: Start MongoDB locally).

3. Start the backend:

```powershell
cd backend
npm install
npm run dev
```

The backend runs at `http://localhost:3000/api/v1`.

4. Start the frontend in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

5. Start the AI service in a third terminal when AI features are needed:

```powershell
cd ai-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

6. Run the desktop sandbox agent when sandbox workflows are needed:

```powershell
cd sandbox-agent
py -3.11 -m pip install -e .
py -3.11 -m forensics_sandbox_agent.main
```

Packaged executables are also kept under `dist\`.

## Build Commands

```powershell
python build.py all
python build.py agent
python build.py simulator
python build.py validate
python build.py clean
```

## Useful URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api/v1`
- Backend health: `http://localhost:3000/api/v1/operations/health`
- Backend readiness: `http://localhost:3000/api/v1/operations/ready`
- Backend liveness: `http://localhost:3000/api/v1/operations/live`
- Backend metrics: `http://localhost:3000/api/v1/operations/metrics`
- AI service: `http://localhost:8000`

## Project Structure

```text
backend/         Express.js API server
frontend/        React frontend application
ai-service/      FastAPI AI microservice
sandbox-agent/   PyQt6 desktop sandbox application
simulators/      Safe educational malware simulators
shared/          Shared schemas and contracts
docs/            Architecture notes and operational runbooks
dist/            Packaged desktop and simulator executables
```

## Documentation

- `docs/runbooks/developer-environment.md`
- `docs/runbooks/execution-runbook.md`
- `docs/runbooks/operational-runbook.md`
- `docs/runbooks/deployment-runbook.md`
- `docs/runbooks/blockchain-operations-runbook.md`
- `docs/runbooks/threat-intelligence-runbook.md`
- `docs/runbooks/forensic-analytics-runbook.md`

## Docker Status

Docker deployment has been intentionally removed. Use the local runtime workflow above for development, validation, and demonstrations.
