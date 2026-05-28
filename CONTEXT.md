# ForensicsAI Platform - Project Context

## Project Overview

**Name:** AI-Powered Cybercrime Digital Forensics Platform with Blockchain Evidence Verification

**Purpose:** Educational cybersecurity platform for malware behavior simulation and forensic analysis in controlled VirtualBox sandbox environments. NOT offensive security tooling.

**Current Phase:** Production - Enterprise Hardening Complete

**Platform:** Windows 11 / VirtualBox 7.1.6 with ICH9 chipset

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend (React + TypeScript + Vite)          │
│  src/                                                                 │
│  ├── pages/        Dashboard, Sandbox, Investigations, Evidence    │
│  ├── stores/       Zustand state (auth, sandbox, realtime)           │
│  ├── services/     API client, WebSocket client                       │
│  ├── components/   UI components, enterprise, blockchain             │
│  └── router/       React Router configuration                        │
└────────────────────────────────────────────────────────────────────────┘
            ↓↑ REST/WebSocket
┌────────────────────────────────────────────────────────────────────────┐
│                        Backend API (Express.js + TypeScript)         │
│  src/                                                                 │
│  ├── controllers/    Sandbox, Investigation, Evidence, Alert, AI    │
│  ├── services/       SandboxRuntimeService, SandboxSyncService       │
│  ├── routes/        API v1 endpoints                                 │
│  ├── models/        MongoDB schemas                                  │
│  └── middleware/    Auth, Security, Validation                        │
└────────────────────────────────────────────────────────────────────────┘
            ↓↑ HTTP
┌────────────────────────────────────────────────────────────────────────┐
│              Sandbox Runtime API (FastAPI - Python)                  │
│  sandbox-agent/src/forensics_sandbox_agent/infrastructure/          │
│  ├── runtime_api.py         - Headless REST API service             │
│  ├── vm/                    - VirtualBox VM control                  │
│  ├── execution/             - Simulator execution                    │
│  ├── monitoring/           - Forensic monitoring                     │
│  └── reporting/             - Report generation                       │
└────────────────────────────────────────────────────────────────────────┘
            ↓
┌────────────────────────────────────────────────────────────────────────┐
│                     VirtualBox VM (Windows 11)                        │
│  - Snapshot: CleanBaseline                                           │
│  - Execution: Headless mode                                           │
│  - Guest Additions: Required                                          │
└────────────────────────────────────────────────────────────────────────┘

ai-service/              # FastAPI AI microservice (Python)
├── app/
│   ├── main.py         API endpoints
│   └── analysis/       AI analysis modules
└── requirements.txt

simulators/             # 5 SAFE educational malware simulators
├── common/              Shared framework
├── ransomware-simulator/
├── spyware-simulator/
├── trojan-simulator/
├── botnet-simulator/
└── credential-stealer-simulator/
```

---

## Current Phase (Production)

### Platform Status: Enterprise Ready

All phases complete:
- Phase 1-3: Core platform with blockchain verification
- Phase 3.5-3.7: Chain of custody, threat intelligence, forensic analytics
- Phase 4: Enterprise hardening, resilience, health monitoring
- Phase 5-6: Headless sandbox runtime, web dashboard

---

## Sandbox Runtime Service

### Starting the Runtime

```bash
cd sandbox-agent
python start_runtime.py
# Or: python -m forensics_sandbox_agent.infrastructure.runtime_api
# Default port: 8765
```

### Runtime API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Runtime health status |
| `/simulators` | GET | List available simulators |
| `/sessions` | GET | List all sessions |
| `/sessions/start` | POST | Start new session |
| `/sessions/{id}` | GET | Get session status |
| `/sessions/{id}/stop` | POST | Stop session gracefully |
| `/sessions/{id}/terminate` | POST | Force terminate with rollback |
| `/vm/status` | GET | VM status |
| `/vm/reset` | POST | Reset VM to snapshot |
| `/monitoring/status` | GET | Monitoring statistics |
| `/execution/status` | GET | Execution history |
| `/logs` | GET | Runtime logs |
| `/telemetry/live` | WS | WebSocket telemetry stream |

---

## Backend Sandbox Endpoints

| Endpoint | Method | RBAC | Description |
|----------|--------|------|-------------|
| `/sandbox/health` | GET | All | Get runtime health |
| `/sandbox/simulators` | GET | Analyst+ | List simulators |
| `/sandbox/sessions` | GET | Analyst+ | List sessions |
| `/sandbox/sessions` | POST | Operator+ | Start session |
| `/sandbox/sessions/{id}` | GET | Analyst+ | Get session |
| `/sandbox/sessions/{id}/stop` | POST | Operator+ | Stop session |
| `/sandbox/sessions/{id}/terminate` | POST | Operator+ | Force terminate |
| `/sandbox/stats` | GET | Analyst+ | Session statistics |
| `/sandbox/telemetry-url` | GET | Analyst+ | WebSocket URL |
| `/sandbox/vm/reset` | POST | Operator+ | Reset VM |
| `/sandbox/vm/status` | GET | Analyst+ | VM status |
| `/sandbox/monitoring/status` | GET | Analyst+ | Monitoring status |
| `/sandbox/logs` | GET | Analyst+ | Runtime logs |
| `/sandbox/runtime/start` | POST | Admin | Start runtime service |

---

## Simulator IDs (Internal)

| Internal ID | Display Name | Category | Description |
|-------------|--------------|----------|-------------|
| `system_service_1` | Ransomware Simulator | ransomware | File encryption simulation |
| `system_service_2` | Spyware Simulator | spyware | Data exfiltration simulation |
| `system_service_3` | Trojan Simulator | trojan | Backdoor persistence simulation |
| `system_service_4` | Botnet Simulator | botnet | C2 communication simulation |
| `system_service_5` | Credential Stealer | credential-stealer | Credential harvesting simulation |

**Note:** These are the internal obfuscated IDs used for privacy. The UI displays friendly names.

---

## Key Services

### Backend Services

| Service | Purpose |
|---------|---------|
| **SandboxRuntimeService** | Communicates with headless runtime API |
| **SandboxSyncService** | MongoDB session persistence |
| **AuthService** | JWT token management |
| **InvestigationService** | Case CRUD, status workflows |
| **EvidenceService** | File management, verification |
| **AIAnalysisService** | Threat classification |
| **BlockchainService** | Evidence verification |
| **HealthService** | Platform health monitoring |
| **QueueService** | Background job processing |
| **ResilienceService** | Circuit breakers, retry logic |

### Frontend Stores

| Store | Purpose |
|-------|---------|
| **sandboxStore** | Sandbox sessions, telemetry, logs, VM status |
| **authStore** | Authentication state |
| **investigationStore** | Investigation data |
| **alertStore** | Alert management |
| **evidenceStore** | Evidence management |
| **realtimeStore** | Live connection state |
| **themeStore** | Dark/light theme management |
| **blockchainStore** | Blockchain operations |
| **custodyStore** | Chain of custody |
| **threatStore** | Threat intelligence |

---

## VM Configuration

| Setting | Value |
|---------|-------|
| **VM Name** | ForensicsSandbox |
| **Chipset** | ICH9 |
| **OS** | Windows 11 EFI |
| **Username** | guestuser |
| **Password** | guest |
| **Snapshot** | CleanBaseline |
| **Guest Additions** | Required |
| **Headless Mode** | true (default for runtime) |

---

## Running the Project

### 1. Start Sandbox Runtime
```bash
cd sandbox-agent
python start_runtime.py
```

### 2. Start Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Use Sandbox Dashboard
- Navigate to Dashboard → Sandbox
- Click "Start Runtime" (if offline)
- Select a simulator from dropdown
- Click "New Session" to begin analysis

---

## Session States

| State | Description |
|-------|-------------|
| `pending` | Session created, not started |
| `initializing` | Preparing environment |
| `restoring_snapshot` | Restoring clean snapshot |
| `booting_vm` | Starting VM |
| `executing` | Running simulator |
| `monitoring` | Collecting telemetry |
| `analyzing` | Processing results |
| `rolling_back` | Restoring snapshot |
| `completed` | Session finished successfully |
| `failed` | Session failed or terminated |

---

## Safety Features (Enforced)

- ✅ VM-only execution (marker validation)
- ✅ Runtime limits (max 300s)
- ✅ Safe directory restrictions
- ✅ Synthetic data only
- ✅ Localhost-only networking
- ✅ Automatic rollback on completion
- ✅ RBAC access control
- ✅ Input validation
- ✅ Enterprise security hardening

---

## API Endpoints Summary

### Core API
| Prefix | Description |
|--------|-------------|
| `/api/v1/auth` | Authentication |
| `/api/v1/users` | User management |
| `/api/v1/investigations` | Investigation CRUD |
| `/api/v1/evidence` | Evidence management |
| `/api/v1/sandbox` | Sandbox sync |
| `/api/v1/ai` | AI analysis |

### Blockchain API
| Prefix | Description |
|--------|-------------|
| `/api/v1/blockchain` | Blockchain operations |
| `/api/v1/custody` | Chain of custody |
| `/api/v1/threat` | Threat intelligence |

### Analytics & Operations
| Prefix | Description |
|--------|-------------|
| `/api/v1/analytics` | Behavioral analytics |
| `/api/v1/operations` | Operations & health |

---

## Environment Variables

```env
JWT_SECRET=<32-char-minimum>
JWT_REFRESH_SECRET=<32-char-minimum>
MONGODB_URI=mongodb://...
BLOCKCHAIN_ENABLED=false
SANDBOX_RUNTIME_URL=http://127.0.0.1:8765
```

---

## Build Commands

```bash
# Build everything
python build.py all

# Build agent only
python build.py agent

# Build simulators
python build.py simulator

# Validate builds
python build.py validate

# Clean
python build.py clean
```

---

## Project Structure

```
/
├── backend/                  # Express.js API (TypeScript)
├── frontend/                 # React + TypeScript (Vite)
├── sandbox-agent/            # Desktop PyQt6 + Headless Runtime
├── ai-service/              # FastAPI AI microservice
├── simulators/              # 5 educational simulators
├── build/                   # Build artifacts (84 files)
├── dist/                    # Distribution (8 files)
├── docs/                    # Runbooks and documentation
└── logs/                    # Application logs
```

---

## Agency Agents (OpenCode)

The following specialized AI agents are available in `.opencode/agents/` to accelerate development:

| Agent | Purpose |
|-------|---------|
| **Codebase Onboarding Engineer** | Understand project structure fast - trace code paths, explain architecture |
| **Frontend Developer** | React/TypeScript + Vite UI development, component design, performance |
| **Backend Architect** | Express.js API design, MongoDB architecture, scalability |
| **Security Engineer** | Threat modeling, security review, vulnerability assessment |
| **API Tester** | Endpoint testing, integration QA, validation |

**Usage**: When working on tasks, reference these agents for:
- Explaining how code works → Codebase Onboarding Engineer
- Building UI components → Frontend Developer
- Designing API endpoints → Backend Architect
- Security review → Security Engineer
- Testing endpoints → API Tester

---

## Current Date

2026-05-21

(Last updated: Frontend blank page debug & fix + AI Analysis page implementation)

---

## Session History & Known Issues

### Session: 2026-05-21 - Frontend Blank Page Fix

**Problem:** Entire frontend UI showed a blank white page at `http://localhost:5173/`.

**Root Causes Found:**
1. **Axios had NO timeout** (`frontend/src/services/api.ts`) — When the backend wasn't running, `checkAuth()` hung indefinitely, causing a permanent blank page.
2. **ProtectedRoute returned `null` during auth check** (`frontend/src/router/AppRoutes.tsx`) — During auth initialization, it rendered nothing instead of a loading state.
3. **Duplicate route definitions** — `settings`, `audit`, `blockchain-operations`, `threat-intelligence`, `forensic-analytics`, and `users` were each defined 2–3 times in the route tree with conflicting wrappers.

**Fixes Applied:**
| File | Change |
|------|--------|
| `frontend/src/services/api.ts` | Added `timeout: 10000` to axios instance |
| `frontend/src/router/AppRoutes.tsx` | Removed duplicate routes; added `AuthLoadingScreen` spinner during auth check; `ProtectedRoute` now calls `checkAuth()` on mount |
| `frontend/src/main.tsx` | Removed unused `AuthInitializer` import; simplified `App` wrapper |

**Files Changed:**
- `frontend/src/router/AppRoutes.tsx` — Clean route tree, no duplicates, auth loading screen
- `frontend/src/services/api.ts` — 10s timeout on all API calls
- `frontend/src/main.tsx` — Clean entry point
- `frontend/src/pages/AIAnalysisPage.tsx` — New comprehensive AI analysis page (7 tabs: Overview, Threat Classification, MITRE ATT&CK, Attack Chain, Heuristics, Anomalies, Comparison)
- `frontend/src/components/ErrorBoundary.tsx` — New error boundary to catch React errors
- `frontend/src/App.tsx` — Dead code (AuthInitializer, LoadingScreen) — NOT imported anywhere, kept for reference

**Verification:**
- Frontend build: ✅ Passes (2282 modules, 900kB JS)
- Backend build: ✅ Passes
- Backend starts: ✅ Port 3000, MongoDB connected
- Frontend serves HTML: ✅ 200 OK at localhost:5173

**Still Needs Verification:**
- Browser console errors (F12) — not captured yet
- Full end-to-end flow in browser with both servers running
- Login → Dashboard → AI Analysis page navigation

### Session: AI Analysis Page Implementation

**Created:** `frontend/src/pages/AIAnalysisPage.tsx` (1362 lines)

**Features:**
- 7 tabs: Overview, Threat Classification, MITRE ATT&CK, Attack Chain, Heuristics, Anomalies, Comparison
- Live session intelligence (connects to sandbox sessions)
- Real-time threat scoring, attack chain visualization, MITRE ATT&CK heatmap
- Anomaly detection display, behavioral pattern comparison
- Connected to backend APIs with proper loading/error states
- Uses `analysisStore` for state management with mock data fallbacks

**Dependencies:**
- `frontend/src/stores/analysisStore.ts` — Analysis state management
- `frontend/src/components/visualizations/AttackChain.tsx`
- `frontend/src/components/visualizations/EvidenceGraph.tsx`
- `frontend/src/components/visualizations/MITREHeatmap.tsx`
- `frontend/src/components/visualizations/RiskScoreGauge.tsx`