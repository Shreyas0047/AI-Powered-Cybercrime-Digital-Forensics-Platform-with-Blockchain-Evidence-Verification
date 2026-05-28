"""High-level session orchestration.

The orchestrator coordinates sandbox execution sessions, VM lifecycle,
simulator execution, forensic monitoring, and session management.
"""

from __future__ import annotations

import logging
import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from forensics_sandbox_agent.app.config.models import AppSettings
from forensics_sandbox_agent.domain.entities.forensic_session import ForensicSession, SessionStatus
from forensics_sandbox_agent.domain.entities.simulator_descriptor import SimulatorDescriptor
from forensics_sandbox_agent.domain.contracts.execution import (
    ReportServicePort,
    VmServicePort,
)
from forensics_sandbox_agent.infrastructure.vm.virtualbox_service import VirtualBoxVmService
from forensics_sandbox_agent.infrastructure.monitoring.monitoring_coordinator import (
    ForensicMonitoringCoordinator,
)
from forensics_sandbox_agent.infrastructure.monitoring.vm_telemetry_poller import VmTelemetryPoller
from forensics_sandbox_agent.infrastructure.monitoring.simulator_log_parser import SimulatorLogParser
from forensics_sandbox_agent.infrastructure.monitoring.event_pipeline import ForensicEventPipeline


@dataclass
class DemoScenario:
    """Pre-configured demo scenario for presentations."""
    name: str
    description: str
    simulator_id: str
    expected_duration_seconds: int
    step_sequence: list[str]


class SessionOrchestrator:
    """Coordinates sandbox execution sessions."""

    # Pre-defined demo scenarios
    DEMO_SCENARIOS = [
        DemoScenario(
            name="Ransomware Detection",
            description="Demonstrate file encryption monitoring and detection",
            simulator_id="ransomware-simulator",
            expected_duration_seconds=60,
            step_sequence=[
                "prepare_environment",
                "start_monitoring",
                "execute_simulator",
                "analyze_events",
                "generate_report",
            ],
        ),
        DemoScenario(
            name="Spyware Behavior Analysis",
            description="Monitor registry and file system surveillance",
            simulator_id="spyware-simulator",
            expected_duration_seconds=45,
            step_sequence=[
                "prepare_environment",
                "start_monitoring",
                "execute_simulator",
                "analyze_events",
                "generate_report",
            ],
        ),
        DemoScenario(
            name="Trojan Execution Flow",
            description="Track process creation and DLL loading patterns",
            simulator_id="trojan-simulator",
            expected_duration_seconds=50,
            step_sequence=[
                "prepare_environment",
                "start_monitoring",
                "execute_simulator",
                "analyze_events",
                "generate_report",
            ],
        ),
    ]

    def __init__(
        self,
        settings: AppSettings,
        logger: logging.Logger,
        vm_service: VirtualBoxVmService,
        report_service: ReportServicePort,
        monitoring_coordinator: Optional[ForensicMonitoringCoordinator] = None,
    ) -> None:
        self._settings = settings
        self._logger = logger
        self._vm_service = vm_service
        self._report_service = report_service
        self._monitoring_coordinator = monitoring_coordinator
        self._execution_history: list[ForensicSession] = []
        self._session_registry: dict[str, ForensicSession] = {}
        self._lock = threading.Lock()
        self._demo_mode: bool = False
        self._active_demo: Optional[DemoScenario] = None

    @staticmethod
    def _generate_session_id() -> str:
        return f"so_{uuid.uuid4().hex[:12]}"

    def initialize_session_context(self) -> None:
        """Run non-destructive startup preparation for sessions."""
        self._logger.info(
            "Initializing session context for environment=%s",
            self._settings.application.environment,
        )
        self._vm_service.validate_environment()
        self._report_service.initialize_report_context()
        self._logger.info("Session context initialized successfully")

    def prepare_vm_environment(self) -> dict:
        """Prepare VM environment for execution."""
        self._logger.info("Preparing VM environment")

        self._vm_service.prepare_snapshot_workflow()

        vm_info = self._vm_service.get_vm_info()
        self._logger.info(f"VM environment prepared: {vm_info}")

        return vm_info

    def execute_simulator(
        self,
        simulator: SimulatorDescriptor,
        auto_rollback: bool = True,
        session_id: Optional[str] = None,
    ) -> ForensicSession:
        """Execute a simulator in the sandbox environment."""
        self._logger.info(f"Orchestrating simulator execution: {simulator.id}")

        session_id = session_id or self._generate_session_id()
        monitoring_started = False
        monitoring_summary: dict = {}
        session: Optional[ForensicSession] = None
        poller: Optional[VmTelemetryPoller] = None

        try:
            if self._monitoring_coordinator:
                polling_config = getattr(getattr(self._settings, "monitoring", None), "vm_polling", None)

                if polling_config and polling_config.enabled:
                    vbox = getattr(self._vm_service, "_vbox", None)
                    vm_name = getattr(self._vm_service, "vm_name", None)
                    if vbox and vm_name:
                        pipeline = getattr(self._monitoring_coordinator, "_pipeline", None)
                        if pipeline:
                            poller = VmTelemetryPoller(
                                vbox=vbox,
                                vm_name=vm_name,
                                coordinator=self._monitoring_coordinator,
                                config=polling_config,
                                simulator_id=simulator.id,
                                logger=self._logger,
                            )
                            poller.start()
                            self._logger.info(f"VM telemetry poller started for session {session_id}")

                self._monitoring_coordinator.start_monitoring(session_id, simulator.id)
                monitoring_started = True

            session = self._vm_service.execute_simulator(
                simulator,
                auto_rollback=auto_rollback,
                session_id=session_id,
            )

            if session is not None:
                with self._lock:
                    self._session_registry[session.session_id] = session

        finally:
            if poller:
                poller.stop()
                self._logger.info(f"VM telemetry poller stopped ({poller.polls_completed} polls)")

                if self._monitoring_coordinator:
                    log_content = self._fetch_simulator_log(simulator.id)
                    if log_content:
                        pipeline = getattr(self._monitoring_coordinator, "_pipeline", None)
                        if pipeline:
                            parser = SimulatorLogParser(pipeline=pipeline, logger=self._logger)
                            current_session = getattr(self._monitoring_coordinator, "_current_session_id", "unknown")
                            parser.parse_log(log_content, simulator.id, current_session)
                            self._logger.info(f"Simulator log parsed for {simulator.id}")

            if self._monitoring_coordinator and monitoring_started:
                monitoring_summary = self._monitoring_coordinator.stop_monitoring()
                self._logger.info(f"Monitoring summary: {monitoring_summary.get('total_events', 0)} events")
                if session is not None:
                    session.metadata["monitoring_summary"] = monitoring_summary
                    session.events = [e.to_dict() for e in self._monitoring_coordinator.get_events()]

            if session is not None:
                with self._lock:
                    self._execution_history.append(session)
                self._logger.info(
                    f"Simulator execution completed: {simulator.id} | status={session.status.value} | "
                    f"exit_code={session.exit_code}"
                )
            else:
                session = ForensicSession(
                    session_id=session_id,
                    simulator_id=simulator.id,
                    status=SessionStatus.FAILED,
                )
                if self._monitoring_coordinator and monitoring_started:
                    session.metadata["monitoring_summary"] = monitoring_summary
                with self._lock:
                    self._session_registry[session_id] = session

            return session

    def get_session(self, session_id: str) -> Optional[ForensicSession]:
        """Get a session by ID from the registry."""
        with self._lock:
            return self._session_registry.get(session_id)

    def get_all_registered_sessions(self) -> list[ForensicSession]:
        """Get all registered sessions."""
        with self._lock:
            return list(self._session_registry.values())

    def get_current_session(self) -> Optional[ForensicSession]:
        """Get the current active session."""
        return self._vm_service.current_session

    def get_execution_history(self) -> list[ForensicSession]:
        """Get all execution history."""
        with self._lock:
            return self._execution_history.copy()

    def cleanup_orphaned_sessions(self) -> int:
        """Remove stale/orphaned sessions from registry. Returns count removed."""
        terminal_statuses = {SessionStatus.COMPLETED, SessionStatus.FAILED, SessionStatus.TIMEOUT}
        with self._lock:
            orphaned = [
                sid for sid, s in self._session_registry.items()
                if s.status in terminal_statuses
            ]
            for sid in orphaned:
                del self._session_registry[sid]
        if orphaned:
            self._logger.info(f"Cleaned up {len(orphaned)} orphaned sessions from registry")
        return len(orphaned)

    def _fetch_simulator_log(self, simulator_id: str) -> Optional[str]:
        """Fetch simulator telemetry log from VM guest."""
        vbox = getattr(self._vm_service, "_vbox", None)
        vm_name = getattr(self._vm_service, "vm_name", None)
        if not vbox or not vm_name:
            return None

        # Resolve generic name for log file path
        from forensics_sandbox_agent.domain.simulator_mapping import get_generic_name
        generic_name = get_generic_name(simulator_id) or simulator_id

        transfer_path = self._settings.execution_policy.sandbox_execution.simulator_transfer_path.replace("/", "\\")
        guest_log_path = f"{transfer_path}\\tmp\\simulator_safe\\{generic_name}.log"
        try:
            exit_code, stdout, stderr = vbox.guest_control_exec(
                vm_name,
                r"C:\Windows\System32\cmd.exe",
                ["/c", "type", guest_log_path],
                timeout=15,
            )
            if exit_code == 0 and stdout.strip():
                self._logger.info(f"Fetched simulator log for {simulator_id}: {len(stdout)} chars")
                return stdout
            else:
                self._logger.debug(f"No simulator log found (exit {exit_code}): {stderr[:100]}")
        except Exception as e:
            self._logger.debug(f"Failed to fetch simulator log: {e}")

        return None

    def get_vm_status(self) -> dict:
        """Get VM status information."""
        return self._vm_service.get_vm_info()

    def get_monitoring_status(self) -> dict:
        """Get monitoring coordinator status."""
        if self._monitoring_coordinator:
            return self._monitoring_coordinator.get_monitor_status()
        return {"enabled": False}

    def start_vm(self, headless: Optional[bool] = None) -> None:
        """Start the sandbox VM."""
        self._vm_service.start_vm(headless=headless)

    def stop_vm(self, force: bool = False) -> None:
        """Stop the sandbox VM."""
        self._vm_service.stop_vm(force=force)

    def restore_snapshot(self) -> None:
        """Restore VM to clean snapshot."""
        self._vm_service.restore_clean_snapshot()

    def validate_environment(self) -> bool:
        """Validate the sandbox environment is ready."""
        try:
            self._vm_service.validate_environment()
            return True
        except Exception as e:
            self._logger.error(f"Environment validation failed: {e}")
            return False

    # Demo Mode Methods

    @property
    def is_demo_mode(self) -> bool:
        """Check if running in demo mode."""
        return self._demo_mode

    def enable_demo_mode(self) -> None:
        """Enable demo mode for presentations."""
        self._demo_mode = True
        self._logger.info("Demo mode enabled - presentation mode active")

    def disable_demo_mode(self) -> None:
        """Disable demo mode."""
        self._demo_mode = False
        self._active_demo = None
        self._logger.info("Demo mode disabled")

    def get_demo_scenarios(self) -> list[DemoScenario]:
        """Get available demo scenarios."""
        return self.DEMO_SCENARIOS.copy()

    def start_demo_scenario(self, scenario_name: str) -> Optional[DemoScenario]:
        """Start a specific demo scenario."""
        if not self._demo_mode:
            self._logger.warning("Enable demo mode first before starting scenario")
            return None

        scenario = next((s for s in self.DEMO_SCENARIOS if s.name == scenario_name), None)
        if scenario:
            self._active_demo = scenario
            self._logger.info(f"Started demo scenario: {scenario.name}")
            self._logger.info(f"Steps: {' -> '.join(scenario.step_sequence)}")
        return scenario

    def get_active_demo(self) -> Optional[DemoScenario]:
        """Get the currently active demo scenario."""
        return self._active_demo

    def quick_reset(self) -> bool:
        """Quick reset for demo - restore snapshot and reset state."""
        try:
            self._logger.info("Performing quick reset for demo")
            self.restore_snapshot()
            self._execution_history.clear()
            self._logger.info("Quick reset complete")
            return True
        except Exception as e:
            self._logger.error(f"Quick reset failed: {e}")
            return False
