"""View model for forensic monitoring page."""

from __future__ import annotations

import logging
from typing import Optional
from datetime import datetime

from forensics_sandbox_agent.app.bootstrap.runtime import ApplicationRuntime
from forensics_sandbox_agent.infrastructure.monitoring.event_models import ForensicEvent, SuspiciousActivity


class MonitoringViewModel:
    """View model for forensic monitoring operations."""

    def __init__(self, runtime: ApplicationRuntime) -> None:
        self._runtime = runtime
        self._logger = logging.getLogger("forensics_sandbox_agent.presentation.monitoring")

        self._is_monitoring = False
        self._events: list[ForensicEvent] = []
        self._suspicious_activities: list[SuspiciousActivity] = []
        self._monitoring_status: dict = {}

    @property
    def is_monitoring(self) -> bool:
        """Check if monitoring is active."""
        return self._is_monitoring

    @property
    def events(self) -> list[ForensicEvent]:
        """Get all events."""
        return self._events

    @property
    def suspicious_activities(self) -> list[SuspiciousActivity]:
        """Get suspicious activities."""
        return self._suspicious_activities

    @property
    def monitoring_status(self) -> dict:
        """Get monitoring status."""
        return self._monitoring_status

    def refresh_status(self) -> None:
        """Refresh monitoring status."""
        try:
            if self._runtime.services and self._runtime.services.monitoring_coordinator:
                self._monitoring_coordinator = self._runtime.services.monitoring_coordinator
                self._monitoring_status = self._monitoring_coordinator.get_monitor_status()
                self._is_monitoring = self._monitoring_status.get("is_active", False)
                self._events = self._monitoring_coordinator.get_events()
                self._suspicious_activities = self._monitoring_coordinator.get_suspicious_activities()
        except Exception as e:
            self._logger.warning(f"Could not refresh monitoring status: {e}")

    def get_events_by_category(self, category: str) -> list[ForensicEvent]:
        """Get events filtered by category."""
        return [e for e in self._events if e.category.value == category]

    def get_events_by_severity(self, severity: str) -> list[ForensicEvent]:
        """Get events filtered by severity."""
        return [e for e in self._events if e.severity.value == severity]

    def get_summary(self) -> dict:
        """Get monitoring summary."""
        return {
            "total_events": len(self._events),
            "process_events": len(self.get_events_by_category("process")),
            "file_events": len(self.get_events_by_category("file_system")),
            "registry_events": len(self.get_events_by_category("registry")),
            "network_events": len(self.get_events_by_category("network")),
            "behavior_alerts": len(self._suspicious_activities),
            "high_severity_count": len(self.get_events_by_severity("high")),
            "critical_severity_count": len(self.get_events_by_severity("critical")),
        }

    def get_timeline_data(self) -> list[dict]:
        """Get timeline data for visualization."""
        if hasattr(self, '_monitoring_coordinator') and self._monitoring_coordinator:
            return self._monitoring_coordinator.get_timeline()
        return []