"""Tests for service registry and initialization."""

import pytest
from forensics_sandbox_agent.app.services.service_registry import ServiceRegistry


class TestServiceRegistry:
    """Test cases for ServiceRegistry."""

    def test_bootstrap_creates_all_services(self):
        """Test that bootstrap creates all required services."""
        from forensics_sandbox_agent.app.config.loader import load_settings
        from forensics_sandbox_agent.app.logging.logger import configure_logging

        settings = load_settings()
        logger = configure_logging(settings)

        registry = ServiceRegistry.bootstrap(settings=settings, logger=logger)

        assert registry.vm_service is not None
        assert registry.report_service is not None
        assert registry.report_repository is not None
        assert registry.simulator_catalog is not None
        assert registry.monitoring_coordinator is not None
        assert registry.session_orchestrator is not None

    def test_service_registry_has_all_services(self):
        """Test all expected services are present."""
        from forensics_sandbox_agent.app.config.loader import load_settings
        from forensics_sandbox_agent.app.logging.logger import configure_logging

        settings = load_settings()
        logger = configure_logging(settings)

        registry = ServiceRegistry.bootstrap(settings=settings, logger=logger)

        # Check all expected attributes exist
        assert hasattr(registry, 'vm_service')
        assert hasattr(registry, 'session_orchestrator')
        assert hasattr(registry, 'report_service')
        assert hasattr(registry, 'report_repository')
        assert hasattr(registry, 'simulator_catalog')
        assert hasattr(registry, 'monitoring_coordinator')


class TestSimulatorCatalog:
    """Test cases for SimulatorCatalog."""

    def test_catalog_initialization(self):
        """Test simulator catalog initializes."""
        from forensics_sandbox_agent.infrastructure.simulator_catalog import SimulatorCatalog
        import logging

        catalog = SimulatorCatalog(logger=logging.getLogger())
        assert catalog is not None

    def test_catalog_has_expected_simulators(self):
        """Test catalog has expected simulators."""
        from forensics_sandbox_agent.infrastructure.simulator_catalog import SimulatorCatalog
        import logging

        catalog = SimulatorCatalog(logger=logging.getLogger())
        # The catalog should have methods to list simulators
        assert hasattr(catalog, 'get_available_simulators') or hasattr(catalog, 'list_simulators')