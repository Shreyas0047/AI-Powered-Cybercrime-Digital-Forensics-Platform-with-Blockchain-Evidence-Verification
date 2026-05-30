# Developer Environment

Recommended local setup for working on the platform:

1. Install Node.js 18+ and Python 3.11+.
2. For Python work, create a virtual environment: `py -3.11 -m venv .venv` and activate it.
3. Install runtime dependencies for the component you are working on:
   - Sandbox agent: `pip install -r sandbox-agent-v2\requirements.txt`
   - AI service: `pip install -r ai-service\requirements.txt`
   - Repo-wide tooling: `pip install -r requirements.txt`
4. Install development tooling: `pip install -r requirements-dev.txt`.
5. Run the sandbox agent from source: `cd sandbox-agent-v2 && py -3.11 main.py`.
6. Run the backend: `cd backend && npm install && npm run dev`.
7. Run the frontend: `cd frontend && npm install && npm run dev`.

Notes:

- The sandbox agent (`sandbox-agent-v2`) is a FastAPI service on `127.0.0.1:8765`. There is no PyInstaller packaging — it runs directly from source.
- Simulators are bundled inside `sandbox-agent-v2/simulators/` as plain Python modules and are staged into the guest VM by the pipeline.
- Use `start-all.ps1` at the repo root to launch backend, AI service, sandbox agent, and frontend together with health-check polling.
