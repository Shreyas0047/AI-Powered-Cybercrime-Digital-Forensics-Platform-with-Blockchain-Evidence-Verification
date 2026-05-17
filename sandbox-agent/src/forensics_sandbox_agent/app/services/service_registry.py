"""Simple application service registry.

This is intentionally lightweight. It provides a composition point today and
can later be replaced by a richer dependency injection mechanism without
touching the UI layer.
"""

from __future__ import annotations

from dataclasses import dataclass
from logging import Logger

from forensics_sandbox_agent.app.config.models import AppSettings
from forensics_sandbox_agent.infrastructure.execution.session_orchestrator import (
    SessionOrchestrator,
)
from forensics_sandbox_agent.infrastructure.reporting.base import ReportService
from forensics_sandbox_agent.infrastructure.storage.report_repository import (
    LocalReportRepository,
)
from forensics_sandbox_agent.infrastructure.vm.virtualbox_service import (
    VirtualBoxVmService,
)
from forensics_sandbox_agent.infrastructure.simulator_catalog import SimulatorCatalog
from forensics_sandbox_agent.infrastructure.monitoring.monitoring_coordinator import (
    ForensicMonitoringCoordinator,
)


@dataclass(slots=True)
class ServiceRegistry:
    """Container for top-level services used by the UI and application layer."""

    session_orchestrator: SessionOrchestrator
    vm_service: VirtualBoxVmService
    report_service: ReportService
    report_repository: LocalReportRepository
    simulator_catalog: SimulatorCatalog
    monitoring_coordinator: ForensicMonitoringCoordinator

    @classmethod
    def bootstrap(cls, settings: AppSettings, logger: Logger) -> "ServiceRegistry":
        vm_service = VirtualBoxVmService(settings=settings, logger=logger)
        report_repository = LocalReportRepository(settings=settings, logger=logger)
        report_service = ReportService(settings=settings, logger=logger)
        simulator_catalog = SimulatorCatalog(
            logger=logger,
            catalog_path=settings.paths.simulator_catalog_dir,
        )
        monitoring_coordinator = ForensicMonitoringCoordinator(settings=settings, logger=logger)
        session_orchestrator = SessionOrchestrator(
            settings=settings,
            logger=logger,
            vm_service=vm_service,
            report_service=report_service,
            monitoring_coordinator=monitoring_coordinator,
        )
        return cls(
            session_orchestrator=session_orchestrator,
            vm_service=vm_service,
            report_service=report_service,
            report_repository=report_repository,
            simulator_catalog=simulator_catalog,
            monitoring_coordinator=monitoring_coordinator,
        )
