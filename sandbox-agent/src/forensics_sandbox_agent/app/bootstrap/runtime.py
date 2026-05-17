"""Runtime container shared across the application shell."""

from __future__ import annotations

from dataclasses import dataclass
from logging import Logger

from forensics_sandbox_agent.app.config.models import AppSettings
from forensics_sandbox_agent.app.services.service_registry import ServiceRegistry


@dataclass(slots=True)
class ApplicationRuntime:
    """Aggregates stable application-wide dependencies.

    This avoids global state while still keeping startup ergonomics simple.
    """

    settings: AppSettings
    logger: Logger
    services: ServiceRegistry
