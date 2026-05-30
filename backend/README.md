# NyxTrace - Backend

Enterprise backend API for the AI-powered cybercrime digital NyxTrace with blockchain evidence verification.

## Features

- JWT authentication with RBAC
- MongoDB-backed investigation, evidence, alert, sandbox, audit, IOC, and analytics models
- Blockchain evidence verification and chain of custody services
- Real-time WebSocket telemetry streaming
- AI service integration
- Threat intelligence and IOC management
- Behavioral analytics and investigation correlation
- Enterprise security, validation, tracing, health, resilience, and queue services

## Prerequisites

- Node.js 18+
- MongoDB Atlas account (or cloud instance)

## Local Development

```powershell
npm install
Copy-Item .env.example .env -ErrorAction SilentlyContinue
notepad .env
npm run dev
```

Required environment values:

```env
JWT_SECRET=<32-character-minimum-secret>
JWT_REFRESH_SECRET=<32-character-minimum-secret>
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/forensics_platform
```

Common optional values:

```env
PORT=3000
NODE_ENV=development
API_VERSION=v1
BASE_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:5173
BLOCKCHAIN_ENABLED=false
AI_SERVICE_ENABLED=false
AI_SERVICE_URL=http://localhost:8000
UPLOAD_MAX_SIZE=104857600
UPLOAD_DEST=./uploads
EVIDENCE_PATH=./uploads/evidence
LOG_LEVEL=info
LOG_FILE_PATH=./logs
LOG_MAX_SIZE=10m
LOG_MAX_FILES=30
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start TypeScript development server |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start compiled backend from `dist/index.js` |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest tests |
| `npm run db:init` | Initialize database indexes |
| `npm run db:seed` | Seed development data |

## API

- Base URL: `http://localhost:3000/api/v1`
- Operations health: `GET /operations/health`
- Readiness: `GET /operations/ready`
- Liveness: `GET /operations/live`
- Metrics: `GET /operations/metrics`

## Modules

| Prefix | Purpose |
| --- | --- |
| `/auth` | Authentication |
| `/users` | User management |
| `/investigations` | Investigation CRUD |
| `/evidence` | Evidence management |
| `/sandbox` | Sandbox synchronization |
| `/ai` | AI analysis |
| `/blockchain` | Blockchain verification |
| `/custody` | Chain of custody |
| `/threat` | Threat intelligence |
| `/analytics` | Behavioral analytics |
| `/operations` | Health, workers, and metrics |

## Logs

Runtime logs are written under `logs/`. The logger is configured through environment variables and should be rotated by the application/runtime configuration rather than retained in source control.

## Docker Status

Docker deployment has been removed from this project. Run the backend directly with Node.js and a MongoDB Atlas instance.
