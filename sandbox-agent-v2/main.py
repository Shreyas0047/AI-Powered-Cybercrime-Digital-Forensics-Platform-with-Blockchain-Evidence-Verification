"""Entry point — Forensics Sandbox Agent v2."""

import sys
from pathlib import Path

# Ensure agent package is importable
sys.path.insert(0, str(Path(__file__).parent))

import uvicorn
from agent.app import create_app

app = create_app()

if __name__ == "__main__":
    print("Starting Sandbox Agent v2.0.0 on 127.0.0.1:8765")
    uvicorn.run("main:app", host="127.0.0.1", port=8765, reload=False, log_level="info")
