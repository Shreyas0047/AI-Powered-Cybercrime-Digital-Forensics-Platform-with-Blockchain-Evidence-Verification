# ForensicsAI Platform - Project Context

## Project Overview

**Name:** AI-Powered Cybercrime Digital Forensics Platform with Blockchain Evidence Verification

**Current Phase:** Phase 4 - ENTERPRISE HARDENING ✅

This is an educational cybersecurity platform for malware behavior simulation and forensic analysis in controlled VirtualBox sandbox environments. NOT offensive security tooling.

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend (React + TypeScript)            │
│  src/                                                              │
│  ├── pages/        # Dashboard, Investigations, Evidence, Alerts │
│  ├── stores/       # Zustand state (auth, investigation, realtime)│
│  ├── services/     # API client, WebSocket client                  │
│  ├── components/   # UI components, layout, blockchain             │
│  ├── providers/    # Theme provider (dark/light mode)              │
│  └── router/       # React Router configuration                    │
└────────────────────────────────────────────────────────────────┘

backend/                 # Express.js API (TypeScript)
├── src/
│   ├── controllers/     # Investigation, Evidence, Alert, AI, Ops │
│   ├── services/        # Business logic, WebSocket, queue, health  │
│   ├── models/         # MongoDB schemas                            │
│   ├── middleware/     # Auth, Security, Validation, Tracing         │
│   ├── routes/         # API endpoints                              │
│   ├── blockchain/     # Web3 integration                           │
│   └── validation/     # Joi validation schemas                     │
└── dist/                # Compiled output

ai-service/              # FastAPI AI microservice (Python)
├── app/
│   ├── main.py         # API endpoints                              │
│   └── analysis/       # AI analysis modules                        │
└── requirements.txt

sandbox-agent/           # Desktop PyQt6 application (EXE ready)
├── app/                 # Bootstrap, config, logging, services
├── domain/              # Entities, contracts, value objects
├── infrastructure/      # VM, execution, monitoring, reporting
├── presentation/        # PyQt6 UI
└── packaging/          # PyInstaller configs

simulators/             # 5 SAFE educational malware simulators
├── common/              # Shared framework
├── ransomware-simulator/
├── spyware-simulator/
├── trojan-simulator/
├── botnet-simulator/
└── credential-stealer-simulator/
```

## Phase 1-3 Summary (Complete)

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Desktop sandbox infrastructure |
| Phase 2 | ✅ Complete | Web platform, AI, real-time |
| Phase 3 | ✅ Complete | Blockchain evidence verification |
| Phase 3.5 | ✅ Complete | Blockchain synchronization & workers |
| Phase 3.6 | ✅ Complete | Chain of custody & threat intelligence |
| Phase 3.7 | ✅ Complete | Forensic analytics & investigation correlation |

## Phase 4 - Enterprise Hardening (Current)

| Component | Status |
|-----------|--------|
| Enterprise Security Hardening | ✅ Complete |
| Platform Resilience & Fault Tolerance | ✅ Complete |
| Advanced Logging & Observability | ✅ Complete |
| Database Optimization & Indexing | ✅ Complete |
| Queue/Worker Infrastructure | ✅ Complete |
| Frontend Enterprise Polish | ✅ Complete |
| Deployment Configuration | ✅ Complete |
| Health Monitoring & Operations | ✅ Complete |
| Testing & Validation | ✅ Complete |
| Documentation & Runbooks | ✅ Complete |

### Enterprise Hardening Services
| Service | Purpose |
|---------|---------|
| **ResilienceService** | Circuit breakers, retry logic, graceful degradation |
| **QueueService** | Background job processing, worker orchestration |
| **DatabaseOptimizationService** | MongoDB indexing, query optimization |
| **HealthService** | Platform health monitoring, metrics |

### Enterprise Hardening Middleware
| Middleware | Purpose |
|-----------|---------|
| **SecurityMiddleware** | Injection detection, rate limiting, brute force protection |
| **ValidationMiddleware** | Joi-based input validation |
| **TracingMiddleware** | Correlation IDs, performance metrics, service health |

### Operations API Endpoints
- `GET /operations/health` - Full platform health status
- `GET /operations/ready` - Kubernetes readiness probe
- `GET /operations/live` - Kubernetes liveness probe
- `GET /operations/metrics` - Prometheus metrics
- `GET /operations/workers` - Queue worker status
- `POST /operations/workers/:action` - Worker control (start/stop/restart)
- `GET /operations/performance` - Performance metrics
- `GET /operations/services/:service` - Service health details
- `POST /operations/metrics/reset` - Reset metrics

## Key Services

### Backend
| Service | Purpose |
|---------|---------|
| **AuthService** | JWT token management |
| **InvestigationService** | Case CRUD, status workflows |
| **EvidenceService** | File management, verification |
| **SandboxSyncService** | Sandbox synchronization |
| **TelemetryIngestionService** | Event processing |
| **AIAnalysisService** | Threat classification |
| **WebSocketService** | Real-time streaming |
| **ResilienceService** | Circuit breakers, retry logic |
| **QueueService** | Background job processing |
| **HealthService** | Platform health monitoring |

### Frontend Stores
| Store | Purpose |
|-------|---------|
| **authStore** | Authentication state |
| **investigationStore** | Investigation data |
| **alertStore** | Alert management |
| **evidenceStore** | Evidence management |
| **sandboxStore** | Sandbox sessions |
| **timelineStore** | Telemetry events & notes |
| **realtimeStore** | Live connection state |
| **themeStore** | Dark/light theme management |

## Recent Fixes (2026-05-22)

### Root Cause: PyInstaller silently failing to bundle forensics_simulator_common
- `simulators/common/src/forensics_simulator_common/runtime/base.py` line 75 had `emit_network_activity` defined at module level (unindented) instead of as a class method, causing IndentationError
- PyInstaller silently skips modules with syntax errors during `hiddenimports` collection, so `forensics_simulator_common` was never bundled
- At runtime inside VM: `ModuleNotFoundError: No module named 'forensics_simulator_common.runtime.base'`
- Session returned `exit_code=None` with only ~2 events because the simulator crashed immediately

### Fixes Applied
1. **Fixed IndentationError** in `base.py` — `emit_network_activity` now properly indented as class method
2. **Added missing `emit_encryption_sim`** method to `BaseSimulatorRuntime` (ransomware was calling `self.emit_encryption_sim()` but it only existed on `SimulatorLogger`)
3. **Fixed trojan runtime** — changed `self._logger.emit_process_spawn()` → `self.emit_process_spawn()` (method exists on base class, not logger)
4. **Added `technique` parameter** to `emit_file_operation` signature — simulators pass `technique=` but parameter was missing
5. **Fixed log triplication** in `runtime_api.py:stream_session_update` — removed redundant `self._system_log_queue.put_nowait()` since `_add_log()` already enqueues
6. **Fixed doubled path** in `session_orchestrator.py:_fetch_simulator_log` — `C:\\sandbox\\tmp\\tmp\\` → `C:\\sandbox\\tmp\\`
7. **Rebuilt all 5 simulators** with `--clean` — all executables work locally (no ModuleNotFoundError, no AttributeError)

### Current Status
- All 5 simulators compile and run locally (verified on host)
- Session flow should now return proper exit_code=0 with full event collection
- Log duplication in frontend resolved

## Safety Features

All components enforce:
- ✅ VM-only execution (marker validation)
- ✅ Runtime limits (max 300s)
- ✅ Safe directory restrictions
- ✅ Synthetic data only
- ✅ Localhost-only networking
- ✅ Rollback enforcement
- ✅ RBAC access control
- ✅ Input validation
- ✅ Enterprise security hardening

## Build System

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

## Running the Project

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Local Runtime
```bash
# Terminal 1
cd backend
npm install
npm run dev

# Terminal 2
cd frontend
npm install
npm run dev
```

## Phase 3-4 Architecture

### Blockchain Services (Phase 3)
- **BlockchainService** - Web3 provider, RPC communication
- **EvidenceHashingService** - SHA-256 fingerprinting, merkle roots
- **VerificationService** - Integrity validation, tamper detection
- **SmartContractService** - Smart contract interaction
- **TransactionService** - Transaction management
- **BlockchainSyncService** - Evidence synchronization
- **DistributedVerificationService** - Parallel verification
- **BlockchainReconciliationService** - Inconsistency detection
- **BlockchainStateTrackingService** - Health monitoring
- **ChainOfCustodyService** - Immutable evidence tracking
- **ThreatIntelligenceService** - IOC management

### Analytics Services (Phase 3.7)
- **BehavioralAnalyticsService** - Pattern analysis, anomaly detection
- **InvestigationCorrelationService** - Investigation clustering, relationship scoring

### Enterprise Services (Phase 4)
- **ResilienceService** - Circuit breakers, exponential backoff retry
- **QueueService** - Priority-based job processing
- **DatabaseOptimizationService** - MongoDB indexing strategy
- **HealthService** - Multi-service health monitoring

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

### Analytics API
| Prefix | Description |
|--------|-------------|
| `/api/v1/analytics` | Behavioral analytics |
| `/api/v1/operations` | Operations & health |

## Documentation

- `docs/runbooks/execution-runbook.md` - Operational procedures
- `docs/runbooks/blockchain-operations-runbook.md` - Blockchain operations
- `docs/runbooks/threat-intelligence-runbook.md` - Threat intelligence
- `docs/runbooks/forensic-analytics-runbook.md` - Forensic analytics
- `docs/runbooks/deployment-runbook.md` - Enterprise deployment
- `docs/runbooks/operational-runbook.md` - Day-to-day operations

## Deployment

Docker deployment has been removed. Use local MongoDB, the backend dev/production scripts, the Vite frontend scripts, and the packaged desktop executables under `dist/`.

### Environment Variables
```env
JWT_SECRET=<32-char-minimum>
JWT_REFRESH_SECRET=<32-char-minimum>
MONGODB_URI=mongodb://...
BLOCKCHAIN_ENABLED=false
```

## Current Date
2026-05-22
