"""Diagnostics and health check system for the forensics platform.

Provides comprehensive system health validation, diagnostic reporting,
and operational readiness checks.
"""

from __future__ import annotations

import logging
import os
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional


class HealthStatus(Enum):
    """Health status levels."""
    UNKNOWN = "unknown"
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    CRITICAL = "critical"
    CHECKING = "checking"


class ComponentType(Enum):
    """System components."""
    VM = "vm"
    SNAPSHOT = "snapshot"
    MONITORING = "monitoring"
    REPORTING = "reporting"
    SIMULATORS = "simulators"
    EXECUTION = "execution"
    LOGGING = "logging"
    CONFIG = "config"


@dataclass
class ComponentHealth:
    """Health status of a system component."""
    component: ComponentType
    status: HealthStatus
    message: str
    timestamp: datetime = field(default_factory=datetime.now)
    details: dict = field(default_factory=dict)


@dataclass
class DiagnosticReport:
    """Complete diagnostic report."""
    timestamp: datetime
    overall_status: HealthStatus
    components: list[ComponentHealth]
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    system_info: dict = field(default_factory=dict)


class DiagnosticsSystem:
    """Comprehensive diagnostics for the forensics platform."""

    def __init__(self, logger: Optional[logging.Logger] = None):
        self._logger = logger or logging.getLogger("forensics_sandbox_agent.diagnostics")

    def run_full_diagnostics(self) -> DiagnosticReport:
        """Run complete system diagnostics."""
        self._logger.info("Running full system diagnostics...")

        components = []

        components.append(self._check_vm_system())
        components.append(self._check_snapshot_system())
        components.append(self._check_monitoring_system())
        components.append(self._check_reporting_system())
        components.append(self._check_simulator_catalog())
        components.append(self._check_execution_system())
        components.append(self._check_logging_system())
        components.append(self._check_config_system())

        healthy_count = sum(1 for c in components if c.status == HealthStatus.HEALTHY)
        critical_count = sum(1 for c in components if c.status == HealthStatus.CRITICAL)
        degraded_count = sum(1 for c in components if c.status == HealthStatus.DEGRADED)

        if critical_count > 0:
            overall = HealthStatus.CRITICAL
        elif degraded_count > 0:
            overall = HealthStatus.DEGRADED
        elif healthy_count == len(components):
            overall = HealthStatus.HEALTHY
        else:
            overall = HealthStatus.UNKNOWN

        report = DiagnosticReport(
            timestamp=datetime.now(),
            overall_status=overall,
            components=components,
            system_info=self._get_system_info(),
        )

        self._logger.info(f"Diagnostics complete: {overall.value}")
        return report

    def _check_vm_system(self) -> ComponentHealth:
        """Check VirtualBox VM system."""
        try:
            result = subprocess.run(
                ["VBoxManage", "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )

            if result.returncode == 0:
                return ComponentHealth(
                    component=ComponentType.VM,
                    status=HealthStatus.HEALTHY,
                    message=f"VirtualBox installed: {result.stdout.strip()}",
                    details={"version": result.stdout.strip()},
                )
            else:
                return ComponentHealth(
                    component=ComponentType.VM,
                    status=HealthStatus.CRITICAL,
                    message="VBoxManage not accessible",
                    details={"error": result.stderr},
                )

        except FileNotFoundError:
            return ComponentHealth(
                component=ComponentType.VM,
                status=HealthStatus.CRITICAL,
                message="VirtualBox not installed",
            )
        except Exception as e:
            return ComponentHealth(
                component=ComponentType.VM,
                status=HealthStatus.DEGRADED,
                message=f"VM check failed: {e}",
            )

    def _check_snapshot_system(self) -> ComponentHealth:
        """Check snapshot system."""
        try:
            from forensics_sandbox_agent.app.config.loader import load_settings

            settings = load_settings()
            vm_name = settings.execution_policy.sandbox_execution.vm_name
            snapshot_name = settings.execution_policy.sandbox_execution.snapshot_name
            result = subprocess.run(
                ["VBoxManage", "showvminfo", vm_name, "--machinereadable"],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if result.returncode == 0 and f'SnapshotName="{snapshot_name}"' in result.stdout:
                return ComponentHealth(
                    component=ComponentType.SNAPSHOT,
                    status=HealthStatus.HEALTHY,
                    message=f"Snapshot available: {snapshot_name}",
                    details={"vm_name": vm_name, "snapshot_name": snapshot_name},
                )

            return ComponentHealth(
                component=ComponentType.SNAPSHOT,
                status=HealthStatus.DEGRADED,
                message=f"Snapshot not found or inaccessible: {snapshot_name}",
                details={"vm_name": vm_name, "stderr": result.stderr},
            )

        except Exception as e:
            return ComponentHealth(
                component=ComponentType.SNAPSHOT,
                status=HealthStatus.DEGRADED,
                message=f"Snapshot check failed: {e}",
            )

    def _check_monitoring_system(self) -> ComponentHealth:
        """Check monitoring system."""
        try:
            from forensics_sandbox_agent.infrastructure.monitoring.monitoring_coordinator import ForensicMonitoringCoordinator
            return ComponentHealth(
                component=ComponentType.MONITORING,
                status=HealthStatus.HEALTHY,
                message="Monitoring coordinator available",
                details={"module": "monitoring_coordinator"},
            )
        except ImportError as e:
            return ComponentHealth(
                component=ComponentType.MONITORING,
                status=HealthStatus.CRITICAL,
                message=f"Monitoring module not available: {e}",
            )
        except Exception as e:
            return ComponentHealth(
                component=ComponentType.MONITORING,
                status=HealthStatus.DEGRADED,
                message=f"Monitoring check failed: {e}",
            )

    def _check_reporting_system(self) -> ComponentHealth:
        """Check reporting system."""
        try:
            from forensics_sandbox_agent.infrastructure.reporting.threat_classifier import ThreatClassificationEngine
            from forensics_sandbox_agent.infrastructure.reporting.severity_engine import ThreatSeverityEngine
            return ComponentHealth(
                component=ComponentType.REPORTING,
                status=HealthStatus.HEALTHY,
                message="Reporting modules available",
                details={"modules": ["threat_classifier", "severity_engine"]},
            )
        except ImportError as e:
            return ComponentHealth(
                component=ComponentType.REPORTING,
                status=HealthStatus.CRITICAL,
                message=f"Reporting module not available: {e}",
            )
        except Exception as e:
            return ComponentHealth(
                component=ComponentType.REPORTING,
                status=HealthStatus.DEGRADED,
                message=f"Reporting check failed: {e}",
            )

    def _check_simulator_catalog(self) -> ComponentHealth:
        """Check simulator catalog."""
        try:
            from forensics_sandbox_agent.app.config.loader import load_settings
            from forensics_sandbox_agent.infrastructure.simulator_catalog import SimulatorCatalog

            settings = load_settings()
            catalog = SimulatorCatalog(
                logger=self._logger,
                catalog_path=settings.paths.simulator_catalog_dir,
            )
            simulators = catalog.get_available_simulators()
            missing = [sim.id for sim in simulators if not sim.executable_exists]
            status = HealthStatus.HEALTHY if simulators and not missing else HealthStatus.DEGRADED

            return ComponentHealth(
                component=ComponentType.SIMULATORS,
                status=status,
                message=f"{len(simulators)} simulators registered, {len(missing)} missing executables",
                details={
                    "simulators": [sim.id for sim in simulators],
                    "missing_executables": missing,
                },
            )
        except ImportError:
            return ComponentHealth(
                component=ComponentType.SIMULATORS,
                status=HealthStatus.CRITICAL,
                message="Simulator catalog not available",
            )
        except Exception as e:
            return ComponentHealth(
                component=ComponentType.SIMULATORS,
                status=HealthStatus.DEGRADED,
                message=f"Simulator check failed: {e}",
            )

    def _check_execution_system(self) -> ComponentHealth:
        """Check execution system."""
        try:
            from forensics_sandbox_agent.infrastructure.execution.session_orchestrator import SessionOrchestrator
            return ComponentHealth(
                component=ComponentType.EXECUTION,
                status=HealthStatus.HEALTHY,
                message="Execution orchestrator available",
                details={"module": "session_orchestrator"},
            )
        except ImportError:
            return ComponentHealth(
                component=ComponentType.EXECUTION,
                status=HealthStatus.CRITICAL,
                message="Execution system not available",
            )
        except Exception as e:
            return ComponentHealth(
                component=ComponentType.EXECUTION,
                status=HealthStatus.DEGRADED,
                message=f"Execution check failed: {e}",
            )

    def _check_logging_system(self) -> ComponentHealth:
        """Check logging system."""
        try:
            from forensics_sandbox_agent.app.config.loader import load_settings

            logs_dir = load_settings().paths.logs_dir

            if logs_dir.exists():
                log_files = list(logs_dir.glob("*.log"))
                return ComponentHealth(
                    component=ComponentType.LOGGING,
                    status=HealthStatus.HEALTHY,
                    message=f"Logging system operational ({len(log_files)} log files)",
                    details={"log_files": len(log_files)},
                )
            else:
                return ComponentHealth(
                    component=ComponentType.LOGGING,
                    status=HealthStatus.DEGRADED,
                    message="Logs directory not found (will be created on demand)",
                )
        except Exception as e:
            return ComponentHealth(
                component=ComponentType.LOGGING,
                status=HealthStatus.DEGRADED,
                message=f"Logging check failed: {e}",
            )

    def _check_config_system(self) -> ComponentHealth:
        """Check configuration system."""
        try:
            from forensics_sandbox_agent.app.config.loader import _default_config_path, load_settings

            settings = load_settings()
            config_path = _default_config_path()

            return ComponentHealth(
                component=ComponentType.CONFIG,
                status=HealthStatus.HEALTHY,
                message="Configuration loaded",
                details={
                    "config_path": str(config_path),
                    "environment": settings.application.environment,
                },
            )
        except Exception as e:
            return ComponentHealth(
                component=ComponentType.CONFIG,
                status=HealthStatus.DEGRADED,
                message=f"Config check failed: {e}",
            )

    def _get_system_info(self) -> dict:
        """Get system information."""
        return {
            "python_version": sys.version,
            "platform": os.name,
            "timestamp": datetime.now().isoformat(),
        }

    def generate_diagnostic_report(self, report: DiagnosticReport) -> str:
        """Generate human-readable diagnostic report."""
        lines = [
            "=" * 60,
            "FORENSICS PLATFORM DIAGNOSTIC REPORT",
            "=" * 60,
            f"Timestamp: {report.timestamp.isoformat()}",
            f"Overall Status: {report.overall_status.value.upper()}",
            "",
            "COMPONENT STATUS:",
        ]

        for comp in report.components:
            status_icon = {
                HealthStatus.HEALTHY: "[OK]",
                HealthStatus.DEGRADED: "[WARN]",
                HealthStatus.CRITICAL: "[FAIL]",
                HealthStatus.UNKNOWN: "[?]",
            }.get(comp.status, "[?]")

            lines.append(f"  {status_icon} {comp.component.value}: {comp.status.value}")
            lines.append(f"      {comp.message}")

        if report.errors:
            lines.append("")
            lines.append("ERRORS:")
            for error in report.errors:
                lines.append(f"  - {error}")

        if report.warnings:
            lines.append("")
            lines.append("WARNINGS:")
            for warning in report.warnings:
                lines.append(f"  - {warning}")

        lines.append("")
        lines.append("=" * 60)

        return "\n".join(lines)


def run_diagnostics() -> DiagnosticReport:
    """Run diagnostics and return report."""
    diagnostics = DiagnosticsSystem()
    return diagnostics.run_full_diagnostics()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    report = run_diagnostics()

    diagnostics = DiagnosticsSystem()
    print(diagnostics.generate_diagnostic_report(report))
