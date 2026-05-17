"""Application entry point for the desktop sandbox agent."""

import sys
import traceback

from forensics_sandbox_agent.app.bootstrap.app_factory import create_application


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
