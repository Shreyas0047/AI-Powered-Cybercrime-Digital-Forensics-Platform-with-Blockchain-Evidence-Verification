"""Tests for diagnostics system."""

import pytest
from forensics_sandbox_agent.infrastructure.diagnostics import (
    DiagnosticsSystem,
    HealthStatus,
    ComponentType,
    ComponentHealth,
)


class TestDiagnosticsSystem:
    """Test cases for DiagnosticsSystem."""

    def test_system_initialization(self):
        """Test diagnostics system initializes."""
        ds = DiagnosticsSystem()
        assert ds._logger is not None

    def test_full_diagnostics_runs(self):
        """Test full diagnostics can run."""
        ds = DiagnosticsSystem()
        report = ds.run_full_diagnostics()

        assert report.timestamp is not None
        assert report.overall_status in [s for s in HealthStatus]
        assert len(report.components) > 0

    def test_component_checks(self):
        """Test individual component checks."""
        ds = DiagnosticsSystem()

        # Config check should work now that paths are fixed
        config_health = ds._check_config_system()
        assert config_health.component == ComponentType.CONFIG
        assert config_health.status in [s for s in HealthStatus]

        # Logging check
        logging_health = ds._check_logging_system()
        assert logging_health.component == ComponentType.LOGGING

    def test_diagnostic_report_generation(self):
        """Test human-readable report generation."""
        ds = DiagnosticsSystem()
        report = ds.run_full_diagnostics()

        report_text = ds.generate_diagnostic_report(report)
        assert "FORENSICS PLATFORM DIAGNOSTIC REPORT" in report_text
        assert "Overall Status:" in report_text
        assert "COMPONENT STATUS:" in report_text

    def test_system_info(self):
        """Test system info collection."""
        ds = DiagnosticsSystem()
        report = ds.run_full_diagnostics()

        assert "python_version" in report.system_info
        assert "platform" in report.system_info
        assert "timestamp" in report.system_info


class TestComponentHealth:
    """Test cases for ComponentHealth dataclass."""

    def test_component_health_creation(self):
        """Test ComponentHealth can be created."""
        health = ComponentHealth(
            component=ComponentType.VM,
            status=HealthStatus.HEALTHY,
            message="Test message",
        )

        assert health.component == ComponentType.VM
        assert health.status == HealthStatus.HEALTHY
        assert health.message == "Test message"
        assert health.timestamp is not None

    def test_component_health_with_details(self):
        """Test ComponentHealth with additional details."""
        health = ComponentHealth(
            component=ComponentType.SIMULATORS,
            status=HealthStatus.DEGRADED,
            message="Some warnings",
            details={"key": "value"},
        )

        assert health.details == {"key": "value"}