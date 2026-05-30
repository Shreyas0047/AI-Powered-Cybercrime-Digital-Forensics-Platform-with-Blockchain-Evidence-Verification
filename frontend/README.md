# NyxTrace - Frontend

Enterprise React frontend for investigations, evidence, alerts, sandbox sessions, telemetry, blockchain operations, threat intelligence, and forensic analytics.

## Prerequisites

- Node.js 18+
- npm
- Backend API running locally, normally at `http://localhost:3000/api/v1`

## Local Development

```powershell
npm install
npm run dev
```

The Vite dev server normally runs at `http://localhost:5173`.

## Environment

Create `frontend\.env` when you need to override defaults:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite development server |
| `npm run build` | Build production assets into `dist/` |
| `npm run build:check` | Type-check and build |
| `npm run preview` | Preview built assets locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run frontend tests |

## Pages

| Page | Path |
| --- | --- |
| Login | `/login` |
| Dashboard | `/dashboard` |
| Investigations | `/investigations` |
| Investigation Detail | `/investigations/:id` |
| Evidence | `/evidence` |
| Alerts | `/alerts` |
| Sandbox | `/sandbox` |
| AI Analysis | `/ai-analysis` |
| Telemetry | `/telemetry` |
| System Health | `/health` |
| Blockchain Operations | `/blockchain-operations` |
| Threat Intelligence | `/threat-intelligence` |
| Forensic Analytics | `/forensic-analytics` |

## Docker Status

Docker and nginx deployment assets have been removed. Use Vite dev/preview locally or serve the `dist/` build with a standard static host of your choice.
