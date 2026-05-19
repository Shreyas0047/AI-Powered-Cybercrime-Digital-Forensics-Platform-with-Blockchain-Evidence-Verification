# ForensicsAI Platform - Project Context

## Project Overview

**Name:** AI-Powered Cybercrime Digital Forensics Platform with Blockchain Evidence Verification

**Purpose:** Educational cybersecurity platform for malware behavior simulation and forensic analysis in controlled VirtualBox sandbox environments. NOT offensive security tooling.

**Current Phase:** Phase 5 - Enterprise SOC UI/UX Transformation

**Platform:** Windows 11 / VirtualBox 7.1.6 with ICH9 chipset

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend (React + TypeScript + Vite)    │
│  src/                                                              │
│  ├── pages/        Dashboard, Investigations, Evidence, Alerts, Logs │
│  ├── stores/       Zustand state (auth, investigation, realtime)    │
│  ├── services/     API client, WebSocket client                       │
│  ├── components/   UI components, layout, visualizations, blockchain  │
│  ├── providers/    Theme provider (dark/light mode)                  │
│  └── router/       React Router configuration                        │
└────────────────────────────────────────────────────────────────────────┘

backend/                 # Express.js API (TypeScript)
├── src/
│   ├── controllers/     Investigation, Evidence, Alert, AI, Ops, Reports, Logs
│   ├── services/         Business logic, WebSocket, queue, health
│   ├── models/          MongoDB schemas
│   ├── middleware/      Auth, Security, Validation, Tracing
│   ├── routes/          API endpoints
│   ├── blockchain/      Web3 integration
│   └── threat_intelligence/  Behavioral analysis, classification, correlation
└── dist/                # Compiled output

ai-service/              # FastAPI AI microservice (Python)
├── app/
│   ├── main.py         API endpoints
│   └── analysis/       AI analysis modules
└── requirements.txt

sandbox-agent/           # Desktop PyQt6 application (EXE ready)
├── app/                 Bootstrap, config, logging, services
├── domain/              Entities, contracts, value objects
├── infrastructure/      VM, execution, monitoring, reporting
├── presentation/        PyQt6 UI (enterprise dark theme)
└── packaging/          PyInstaller configs

simulators/             # 5 SAFE educational malware simulators
├── common/              Shared framework
├── ransomware-simulator/     → threat_file_1.exe
├── spyware-simulator/        → threat_file_2.exe
├── trojan-simulator/         → updater_service.exe
├── botnet-simulator/         → runtime_helper.exe
└── credential-stealer-simulator/  → windows_patch.exe
```

---

## Current Phase (Phase 5)

### Completed Work

1. **Enterprise Design System** (`frontend/src/index.css`)
   - Professional typography, spacing, color palette
   - Dark theme with deep charcoal (#0a0e17)
   - Severity color system
   - Animation keyframes

2. **Global Layout Redesign**
   - Collapsible sidebar (72px/260px)
   - Header with command palette (Ctrl+K)
   - Breadcrumb navigation

3. **Dashboard Transformation**
   - SOC command center with live widgets
   - Threat distribution, MITRE tactics
   - Activity stream with animations

4. **Visualization Components** (new)
   - ForensicTimeline - Interactive event timeline
   - MITREHeatmap - ATT&CK technique heatmap
   - AttackChain - Attack progression visualization
   - RiskScoreGauge - Animated risk scoring
   - EvidenceGraph - Node-based relationship graph
   - LiveActivityStream - Real-time activity feed
   - ThreatRadar - Radar chart for profiles

5. **UI Component Polish**
   - DataTable with sorting/filtering/pagination
   - Skeleton loaders with shimmer
   - Premium empty states

---

## Key Services

### Backend Services
| Service | Purpose |
|---------|---------|
| **AuthService** | JWT token management |
| **InvestigationService** | Case CRUD, status workflows |
| **EvidenceService** | File management, verification |
| **SandboxSyncService** | Sandbox synchronization |
| **TelemetryIngestionService** | Event processing |
| **AIAnalysisService** | Threat classification |
| **WebSocketService** | Real-time streaming |
| **BlockchainService** | Web3 provider, RPC communication |
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

---

## VM Configuration

| Setting | Value |
|---------|-------|
| **VM Name** | ForensicsSandbox |
| **Chipset** | ICH9 |
| **OS** | Windows 11 EFI |
| **Username** | guestuser |
| **Password** | guest |
| **Snapshot** | CleanBaseline (UUID: 6a954b97-a1db-477a-8054-2d76de85a063) |
| **Guest Additions** | Required, detected via `/VirtualBox/GuestAdd/Version` |
| **Headless Mode** | false (GUI visible) |

### Critical Context

- **The Snapshot Trap:** Automated execution restores `CleanBaseline` snapshot. If hardware/folders are changed, that snapshot must be refreshed manually.
- **Command Syntax:** VirtualBox 7.x uses `run` instead of `exec`, requires `--` separator before positional arguments.
- **VC++ DLLs:** Bundled in simulators (msvcp140.dll, vcruntime140.dll, vcruntime140_1.dll)

---

## API Endpoints

### Core API
| Prefix | Description |
|--------|-------------|
| `/api/v1/auth` | Authentication |
| `/api/v1/users` | User management |
| `/api/v1/investigations` | Investigation CRUD |
| `/api/v1/evidence` | Evidence management |
| `/api/v1/sandbox` | Sandbox sync |
| `/api/v1/ai` | AI analysis |
| `/api/v1/alerts` | Alert management |
| `/api/v1/telemetry` | Event ingestion |

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
| `/api/v1/threat-analysis` | Threat classification |
| `/api/v1/reports` | Forensic reports |
| `/api/v1/logs` | System logs |
| `/api/v1/settings` | Platform settings |

---

## Running the Project

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm run dev
```

### Build All
```bash
python build.py all
```

### Build Agent Only
```bash
python build.py agent
```

### Build Simulators
```bash
python build.py simulator
```

---

## Simulator Mapping (Obfuscated)

| Internal Profile | Executable | UI Display |
|-----------------|------------|------------|
| ransomware | threat_file_1.exe | Threat Sample 1 |
| spyware | threat_file_2.exe | Threat Sample 2 |
| credential-stealer | windows_patch.exe | Threat Sample 3 |
| trojan | updater_service.exe | Threat Sample 4 |
| botnet | runtime_helper.exe | Threat Sample 5 |

---

## Safety Features (Enforced)

- ✅ VM-only execution (marker validation)
- ✅ Runtime limits (max 300s)
- ✅ Safe directory restrictions
- ✅ Synthetic data only
- ✅ Localhost-only networking
- ✅ Rollback enforcement
- ✅ RBAC access control
- ✅ Input validation
- ✅ Enterprise security hardening

---

## Recent Changes (2026-05-19)

- Phase 5: Enterprise SOC UI/UX Transformation
- Advanced forensic visualizations
- Live activity streaming
- Command palette (Ctrl+K)
- Premium skeleton loaders
- Dark theme refinement

---

## Documentation Files

- `docs/runbooks/execution-runbook.md` - Operational procedures
- `docs/runbooks/blockchain-operations-runbook.md` - Blockchain operations
- `docs/runbooks/threat-intelligence-runbook.md` - Threat intelligence
- `docs/runbooks/forensic-analytics-runbook.md` - Forensic analytics
- `docs/runbooks/deployment-runbook.md` - Enterprise deployment
- `docs/runbooks/operational-runbook.md` - Day-to-day operations
- `SESSION.md` - Session sync for Claude
- `CONTEXT.md` - This file (project overview for new sessions)

---

## Environment Variables

```env
JWT_SECRET=<32-char-minimum>
JWT_REFRESH_SECRET=<32-char-minimum>
MONGODB_URI=mongodb://...
BLOCKCHAIN_ENABLED=false
```

---

## Current Date

2026-05-19

(Last updated: Phase 5 completion)