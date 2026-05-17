# Cleanup Report

Date: 2026-05-14

Scope: safe architectural cleanup, dead-code review, Docker removal, generated artifact cleanup, and storage optimization.

## Removed Docker Integration

Deleted Docker-only infrastructure:

- `docker-compose.yml`
- `mongo-init.js`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `ai-service/Dockerfile`

Updated Docker-specific documentation to local runtime workflows:

- `README.md`
- `backend/README.md`
- `frontend/README.md`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/runbooks/deployment-runbook.md`
- `docs/runbooks/operational-runbook.md`

## Removed Generated Artifacts And Caches

Deleted:

- Root PyInstaller `build/`
- Backend compiled `backend/dist/`
- Frontend compiled `frontend/dist/`
- Routine logs under `logs/`, `backend/logs/`, and `dist/logs/`
- Python `__pycache__/` directories
- `sandbox-agent/src/forensics_sandbox_agent.egg-info/`
- Startup error logs
- Installed dependency trees `backend/node_modules/` and `frontend/node_modules/`

Preserved:

- `dist/sandbox-agent/ForensicsSandboxAgent.exe`
- `dist/simulators/*.exe`
- Source code for backend, frontend, AI service, sandbox agent, simulators, blockchain, analytics, custody, and IOC systems
- Shared schemas/contracts
- Operational and architecture documentation

## Removed Unused Files

Deleted unreferenced frontend starter assets:

- `frontend/src/assets/react.svg`
- `frontend/src/assets/vite.svg`
- `frontend/src/assets/hero.png`

Deleted unrelated local skill bundle with no project references:

- `ui-ux-pro-max-skill/`

## Dependency Cleanup

Removed unused direct backend dependency:

- `express-validator`

Removed unused direct frontend dependency declarations:

- `autoprefixer`
- `postcss`

Notes:

- `postcss` remains present in the lockfile as a transitive dependency used by frontend tooling.
- Backend blockchain code references `ethers`, but `ethers` is not declared in `backend/package.json`. This was not guessed during cleanup because adding a missing active dependency needs an intentional version decision.

## Storage Result

Approximate project size before cleanup: 488 MB.

Approximate project size after cleanup: 72.78 MB.

Approximate reduction: 415 MB.

Current largest retained folder:

- `dist/` at about 70.69 MB, intentionally preserved because it contains packaged executable deliverables.

## Validation Results

Passed:

```powershell
python build.py validate
```

Result:

- Agent: OK
- RansomwareSimulator.exe: OK
- SpywareSimulator.exe: OK
- TrojanSimulator.exe: OK
- BotnetSimulator.exe: OK
- CredentialStealerSimulator.exe: OK

Blocked or already failing before cleanup:

- `backend npm run build` fails with existing TypeScript/module errors, including missing `ethers`, incorrect relative imports in some Phase 3/4 modules, type mismatches, and duplicate exports.
- `frontend npm run build` failed while `node_modules` existed because Vite/Tailwind native bindings were locked or unloadable on Windows (`spawn EPERM` and native binding load errors).
- Dependency installs were removed after validation, so backend/frontend startup now requires `npm install` first.

## How To Run From Start To Finish

1. Start MongoDB locally.

```powershell
mongosh "mongodb://localhost:27017/forensics_platform" --eval "db.adminCommand('ping')"
```

2. Configure backend environment.

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

3. Install and start backend.

```powershell
cd backend
npm install
npm run dev
```

Backend URL: `http://localhost:3000/api/v1`

4. Configure and start frontend in a second terminal.

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

Optional frontend `.env`:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
```

5. Start AI service when needed in a third terminal.

```powershell
cd ai-service
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

6. Run the desktop agent when sandbox workflows are needed.

```powershell
cd sandbox-agent
py -3.11 -m pip install -e .
py -3.11 -m forensics_sandbox_agent.main
```

Or run the packaged executable:

```powershell
dist\sandbox-agent\ForensicsSandboxAgent.exe
```

7. Validate packaged deliverables.

```powershell
python build.py validate
```

8. Build packaged deliverables when needed.

```powershell
python build.py all
```
