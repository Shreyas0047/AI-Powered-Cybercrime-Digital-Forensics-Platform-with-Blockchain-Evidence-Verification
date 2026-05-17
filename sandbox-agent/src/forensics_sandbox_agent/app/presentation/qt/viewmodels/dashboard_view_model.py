"""View model for the dashboard page."""

from __future__ import annotations

import logging
from typing import Optional

from forensics_sandbox_agent.app.bootstrap.runtime import ApplicationRuntime


class DashboardViewModel:
    """View model for dashboard metrics and system status."""

    def __init__(self, runtime: ApplicationRuntime) -> None:
        self._runtime = runtime
        self._logger = logging.getLogger("forensics_sandbox_agent.presentation.dashboard")
        
        self._vm_active = False
        self._monitoring_active = False
        self._evidence_count = 0
        self._session_count = 0
        self._alert_count = 0
        self._system_health = "98%"

    def refresh_data(self) -> None:
        """Refresh dashboard data from services."""
        try:
            services = self._runtime.services
            if not services:
                return

            # VM Status
            vm_info = services.vm_service.get_vm_info()
            self._vm_active = vm_info.get("vm_status") == "running"

            # Monitoring Status
            mon_status = services.monitoring_coordinator.get_monitor_status()
            self._monitoring_active = mon_status.get("is_active", False)

            # Session and Event counts (placeholders for real repo lookups)
            self._session_count = len(services.vm_service.get_execution_history())
            self._evidence_count = len(services.report_repository.get_all_reports())
            
            # Alerts
            alerts = services.monitoring_coordinator.get_suspicious_activities()
            self._alert_count = len(alerts)

        except Exception as e:
            self._logger.warning(f"Could not refresh dashboard data: {e}")

    @property
    def vm_active(self) -> bool:
        return self._vm_active

    @property
    def monitoring_active(self) -> bool:
        return self._monitoring_active

    @property
    def evidence_count(self) -> str:
        return str(self._evidence_count)

    @property
    def session_count(self) -> str:
        return str(self._session_count)

    @property
    def alert_count(self) -> str:
        return str(self._alert_count)

    @property
    def system_health(self) -> str:
        return self._system_health
