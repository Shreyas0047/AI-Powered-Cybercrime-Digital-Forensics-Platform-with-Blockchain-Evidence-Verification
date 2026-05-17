"""Application assembly for the desktop shell.

The factory centralizes composition so UI code does not directly construct
infrastructure objects. That keeps future dependency injection changes local.
"""

from forensics_sandbox_agent.app.bootstrap.runtime import ApplicationRuntime
from forensics_sandbox_agent.app.config.loader import load_settings
from forensics_sandbox_agent.app.logging.logger import configure_logging
from forensics_sandbox_agent.app.presentation.qt.application import DesktopApplication
from forensics_sandbox_agent.app.services.service_registry import ServiceRegistry


def create_application() -> DesktopApplication:
    """Compose the Phase 1 application runtime."""
    settings = load_settings()
    logger = configure_logging(settings)
    services = ServiceRegistry.bootstrap(settings=settings, logger=logger)
    runtime = ApplicationRuntime(settings=settings, logger=logger, services=services)
    return DesktopApplication(runtime=runtime)
