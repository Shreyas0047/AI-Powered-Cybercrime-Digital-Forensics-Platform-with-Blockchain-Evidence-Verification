"""Application entry point for the desktop sandbox agent."""

import sys
import traceback
import atexit
import signal
import json
import urllib.request
import urllib.error

from forensics_sandbox_agent.app.bootstrap.app_factory import create_application


def _notify_backend_shutdown() -> None:
    """Notify the backend that the agent is shutting down.

    Marks all active sandbox sessions as failed on the backend by
    sending a heartbeat with status='failed' for each running session.
    """
    try:
        # Fetch active sessions from the local runtime API
        req = urllib.request.Request("http://127.0.0.1:8765/sessions")
        resp = urllib.request.urlopen(req, timeout=5)
        sessions = json.loads(resp.read().decode())

        for session in sessions:
            state = session.get("state", "")
            if state in ("completed", "failed"):
                continue
            session_id = session.get("session_id")
            if not session_id:
                continue
            payload = json.dumps({
                "status": "failed",
            }).encode("utf-8")
            hb_req = urllib.request.Request(
                f"http://127.0.0.1:3000/api/v1/sync/sessions/{session_id}/heartbeat",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            urllib.request.urlopen(hb_req, timeout=5)
    except Exception:
        pass


# Register graceful-shutdown handler
atexit.register(_notify_backend_shutdown)


def _signal_handler(signum: int, frame: object) -> None:
    """Handle OS termination signals by notifying backend and exiting."""
    _notify_backend_shutdown()
    sys.exit(0)


signal.signal(signal.SIGTERM, _signal_handler)
signal.signal(signal.SIGINT, _signal_handler)


def main() -> int:
    """Create and run the desktop application shell."""
    try:
        application = create_application()
        return application.run()
    except Exception as e:
        with open("startup_error.log", "a") as f:
            f.write(f"Exception: {e}\n")
            traceback.print_exc(file=f)
        raise


if __name__ == "__main__":
    raise SystemExit(main())
