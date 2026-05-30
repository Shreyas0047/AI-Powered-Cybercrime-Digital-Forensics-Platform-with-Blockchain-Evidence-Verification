# ForensicsAI Platform

AI-powered cybercrime digital forensics platform with blockchain evidence verification.

This is an educational cybersecurity platform for malware behavior simulation and forensic analysis in controlled VirtualBox sandbox environments. It is not offensive security tooling.

## What It Includes

- React + TypeScript frontend for dashboards, investigations, evidence, alerts, telemetry, blockchain operations, threat intelligence, and forensic analytics.
- Express + TypeScript backend API with JWT/RBAC, MongoDB, WebSocket telemetry, enterprise security middleware, health checks, queue services, and analytics.
- FastAPI AI service for threat classification, severity scoring, anomaly detection, and summaries.
- FastAPI sandbox agent (`sandbox-agent-v2`) that orchestrates the VirtualBox sandbox VM, runs the simulator pipeline, and streams telemetry/log events over WebSocket.
- Six safe educational malware simulators (alpha, beta, gamma, delta, epsilon, lateral) bundled inside the sandbox agent.
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
SANDBOX_RUNTIME_URL=http://127.0.0.1:8765
AI_SERVICE_ENABLED=false
AI_SERVICE_URL=http://localhost:8000
AI_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
BLOCKCHAIN_ENABLED=false
```

2. Start the backend:

```powershell
cd backend
npm install
npm run dev
```

The backend runs at `http://localhost:3000/api/v1`.

3. Start the frontend in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

4. Start the AI service in a third terminal when AI features are needed:

```powershell
cd ai-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

5. Start the sandbox agent when sandbox workflows are needed:

```powershell
cd sandbox-agent-v2
py -3.11 -m pip install -r requirements.txt
py -3.11 main.py
```

The agent listens on `http://127.0.0.1:8765` and exposes the runtime REST + WebSocket API consumed by the backend.

### One-shot orchestrated startup

`start-all.ps1` launches backend, AI service, sandbox agent, and frontend in dependency order with health-check polling:

```powershell
.\start-all.ps1
```

## Useful URLs

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000/api/v1`
- Backend health: `http://localhost:3000/api/v1/operations/health`
- Backend readiness: `http://localhost:3000/api/v1/operations/ready`
- Backend liveness: `http://localhost:3000/api/v1/operations/live`
- Backend metrics: `http://localhost:3000/api/v1/operations/metrics`
- AI service: `http://localhost:8000`
- Sandbox agent: `http://127.0.0.1:8765`

## Project Structure

```text
backend/             Express.js API server (TypeScript)
frontend/            React + TypeScript frontend (Vite)
ai-service/          FastAPI AI microservice (Python)
sandbox-agent-v2/    FastAPI sandbox runtime + simulators (Python)
  main.py            Uvicorn entrypoint, listens on :8765
  agent/             FastAPI app, session pipeline, VM manager, models
  simulators/        Six safe educational simulators (run inside the VM)
shared/              Shared schemas, contracts, and service config
docs/                Architecture notes and operational runbooks
logs/                Local agent + monitoring logs
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
