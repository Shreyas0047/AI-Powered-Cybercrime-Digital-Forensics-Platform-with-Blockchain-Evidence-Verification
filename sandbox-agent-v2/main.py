"""Entry point - NyxTrace Sandbox Agent v2."""

import io
import sys
from pathlib import Path


def _force_utf8_streams() -> None:
    """Force stdout/stderr to UTF-8 so log messages with em-dashes and arrows
    render correctly on Windows consoles (default cp1252 produces mojibake)."""
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        if stream is None:
            continue
        # Python 3.7+: TextIOWrapper has reconfigure
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            try:
                reconfigure(encoding="utf-8", errors="replace")
                continue
            except Exception:
                pass
        # Fallback: wrap underlying buffer
        buffer = getattr(stream, "buffer", None)
        if buffer is not None:
            try:
                setattr(sys, stream_name, io.TextIOWrapper(buffer, encoding="utf-8", errors="replace", line_buffering=True))
            except Exception:
                pass


_force_utf8_streams()

# Ensure agent package is importable
sys.path.insert(0, str(Path(__file__).parent))

import uvicorn
from agent.app import create_app

app = create_app()

if __name__ == "__main__":
    print("Starting Sandbox Agent v2.0.0 on 127.0.0.1:8765")
    uvicorn.run("main:app", host="127.0.0.1", port=8765, reload=False, log_level="info")
