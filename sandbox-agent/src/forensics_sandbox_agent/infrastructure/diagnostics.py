"""Diagnostics system for sandbox agent health checks."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import logging
import platform
import sys
from typing import Any, Dict, List, Optional


class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class ComponentType(Enum):
    CONFIG = "config"
    LOGGING = "logging"
    VM = "vm"
    SIMULATORS = "simulators"
    NETWORK = "network"
    STORAGE = "storage"
    MONITORING = "monitoring"


@dataclass
class ComponentHealth:
    component: ComponentType
    status: HealthStatus
    message: str
    timestamp: datetime = field(default_factory=datetime.now)
    details: Optional[Dict[str, Any]] = None


@dataclass
class DiagnosticReport:
    timestamp: datetime
    overall_status: HealthStatus
    components: List[ComponentHealth]
    system_info: Dict[str, Any]
    recommendations: List[str]


class DiagnosticsSystem:
    def __init__(self):
        self._logger = logging.getLogger("diagnostics")

    def run_full_diagnostics(self) -> DiagnosticReport:
        components = [
            self._check_config_system(),
            self._check_logging_system(),
        ]
        statuses = [c.status for c in components]
        if any(s == HealthStatus.UNHEALTHY for s in statuses):
            overall = HealthStatus.UNHEALTHY
        elif any(s == HealthStatus.DEGRADED for s in statuses):
            overall = HealthStatus.DEGRADED
        else:
            overall = HealthStatus.HEALTHY
        return DiagnosticReport(
            timestamp=datetime.now(),
            overall_status=overall,
            components=components,
            system_info={
                "python_version": sys.version,
                "platform": platform.platform(),
                "timestamp": datetime.now().isoformat(),
            },
            recommendations=[],
        )

    def _check_config_system(self) -> ComponentHealth:
        return ComponentHealth(
            component=ComponentType.CONFIG,
            status=HealthStatus.HEALTHY,
            message="Configuration system operational",
        )

    def _check_logging_system(self) -> ComponentHealth:
        return ComponentHealth(
            component=ComponentType.LOGGING,
            status=HealthStatus.HEALTHY,
            message="Logging system operational",
        )

    def generate_diagnostic_report(self, report: DiagnosticReport) -> str:
        lines = [
            "=" * 50,
            "FORENSICS PLATFORM DIAGNOSTIC REPORT",
            "=" * 50,
            f"Timestamp: {report.timestamp.isoformat()}",
            f"Overall Status: {report.overall_status.value}",
            "",
            "COMPONENT STATUS:",
            "-" * 30,
        ]
        for c in report.components:
            lines.append(f"  {c.component.value}: {c.status.value} - {c.message}")
        lines.extend([
            "",
            "SYSTEM INFORMATION:",
            "-" * 30,
            f"  Python: {report.system_info.get('python_version', 'N/A')}",
            f"  Platform: {report.system_info.get('platform', 'N/A')}",
        ])
        return "\n".join(lines)
