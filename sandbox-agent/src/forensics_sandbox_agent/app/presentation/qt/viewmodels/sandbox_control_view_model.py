"""View model for sandbox control panel."""

from __future__ import annotations

import logging
from typing import Optional
from datetime import datetime

from forensics_sandbox_agent.app.bootstrap.runtime import ApplicationRuntime
from forensics_sandbox_agent.domain.entities.simulator_descriptor import SimulatorDescriptor
from forensics_sandbox_agent.domain.entities.forensic_session import (
    ForensicSession,
    SessionStatus,
)


class SandboxControlViewModel:
    """View model for sandbox control operations."""

    def __init__(self, runtime: ApplicationRuntime) -> None:
        self._runtime = runtime
        self._logger = logging.getLogger("forensics_sandbox_agent.presentation.sandbox_control")

        self._vm_status = "unknown"
        self._vm_ready = False
        self._current_session: Optional[ForensicSession] = None
        self._is_executing = False
        self._execution_output = ""
        self._available_simulators: list[SimulatorDescriptor] = []
        self._vm_exists = False
        self._snapshot_exists = False
        self._vbox_available = False
        self._vm_ready_errors: list[str] = []

        self._load_simulators()
        self._refresh_vm_status()

    def _load_simulators(self) -> None:
        """Load available simulators from catalog."""
        try:
            if self._runtime.services:
                self._available_simulators = self._runtime.services.simulator_catalog.get_available_simulators()
                self._logger.info(f"Loaded {len(self._available_simulators)} simulators")
        except Exception as e:
            self._logger.warning(f"Could not load simulators: {e}")

    def _refresh_vm_status(self) -> None:
        """Refresh VM status from service."""
        try:
            services = self._runtime.services
            if services:
                vm_info = services.vm_service.get_vm_info()
                self._vm_status = vm_info.get("vm_status", "unknown")
                self._vm_ready = vm_info.get("is_ready", False)
                self._vm_exists = vm_info.get("vm_exists", False)
                self._snapshot_exists = vm_info.get("snapshot_exists", False)
                self._vbox_available = vm_info.get("vbox_available", False)
                self._vm_ready_errors = vm_info.get("ready_errors", [])
        except Exception as e:
            self._logger.warning(f"Could not refresh VM status: {e}")
            self._vm_status = "error"
            self._vm_ready = False
            self._vm_ready_errors = [str(e)]

    @property
    def vm_status(self) -> str:
        """Get current VM status (cached)."""
        return self._vm_status

    @property
    def vm_status_display(self) -> str:
        """Get display-friendly VM status."""
        status_map = {
            "running": "Running",
            "powered_off": "Powered Off",
            "paused": "Paused",
            "saved": "Saved",
            "starting": "Starting",
            "stopping": "Stopping",
            "error": "Error",
            "unknown": "Unknown",
        }
        return status_map.get(self._vm_status, self._vm_status)

    @property
    def vm_ready(self) -> bool:
        """Check if VM is ready for execution (cached)."""
        return self._vm_ready

    @property
    def vm_exists(self) -> bool:
        """Check if configured VM exists."""
        return self._vm_exists

    @property
    def snapshot_exists(self) -> bool:
        """Check if the clean snapshot exists."""
        return self._snapshot_exists

    @property
    def vbox_available(self) -> bool:
        """Check if VBoxManage is available."""
        return self._vbox_available

    @property
    def vm_ready_errors(self) -> list[str]:
        """Get readiness diagnostics."""
        return self._vm_ready_errors.copy()

    @property
    def is_executing(self) -> bool:
        """Check if execution is in progress."""
        return self._is_executing

    @property
    def current_session(self) -> Optional[ForensicSession]:
        """Get current execution session."""
        return self._current_session

    @property
    def execution_output(self) -> str:
        """Get execution output log."""
        return self._execution_output

    @property
    def available_simulators(self) -> list[SimulatorDescriptor]:
        """Get list of available simulators."""
        return self._available_simulators

    def refresh_simulators(self) -> None:
        """Refresh simulators from catalog."""
        try:
            if self._runtime.services:
                self._runtime.services.simulator_catalog.refresh_catalog()
                self._load_simulators()
        except Exception as e:
            self._logger.warning(f"Could not refresh simulators: {e}")

    @property
    def can_start_vm(self) -> bool:
        """Check if VM can be started."""
        return (
            not self._is_executing
            and self._vbox_available
            and self._vm_exists
            and self._vm_status in {"powered_off", "saved", "paused", "unknown", "error"}
        )

    @property
    def can_stop_vm(self) -> bool:
        """Check if VM can be stopped."""
        return (
            not self._is_executing
            and self._vbox_available
            and self._vm_exists
            and self._vm_status in {"running", "paused", "saved", "starting", "stopping"}
        )

    @property
    def can_restore_snapshot(self) -> bool:
        """Check if the clean snapshot can be restored."""
        return not self._is_executing and self._vbox_available and self._vm_exists

    @property
    def can_execute(self) -> bool:
        """Check if execution can be started."""
        return (
            not self._is_executing
            and self._vbox_available
            and self._vm_exists
            and self._snapshot_exists
        )

    def _require_services(self):
        """Return services or raise a UI-visible setup error."""
        services = self._runtime.services
        if not services:
            raise RuntimeError("Application services are not initialized")
        return services

    def start_vm_sync(self) -> None:
        """Synchronous version of start_vm for worker threads."""
        self._require_services().session_orchestrator.start_vm()

    def start_vm(self) -> bool:
        """Start the sandbox VM."""
        if not self.can_start_vm:
            return False

        try:
            self.start_vm_sync()
            self._refresh_vm_status()
            self.append_output("VM started successfully")
            return True
        except Exception as e:
            self._logger.error(f"Failed to start VM: {e}")
            self.append_output(f"ERROR: {e}")
            return False

    def stop_vm_sync(self, force: bool = False) -> None:
        """Synchronous version of stop_vm for worker threads."""
        self._require_services().session_orchestrator.stop_vm(force=force)

    def stop_vm(self, force: bool = False) -> bool:
        """Stop the sandbox VM."""
        if not self.can_stop_vm:
            return False

        try:
            self.stop_vm_sync(force=force)
            self._refresh_vm_status()
            self.append_output("VM stopped successfully")
            return True
        except Exception as e:
            self._logger.error(f"Failed to stop VM: {e}")
            self.append_output(f"ERROR: {e}")
            return False

    def restore_snapshot_sync(self) -> None:
        """Synchronous version of restore_snapshot for worker threads."""
        self._require_services().session_orchestrator.restore_snapshot()

    def restore_snapshot(self) -> bool:
        """Restore VM to clean snapshot."""
        try:
            self.restore_snapshot_sync()
            self.append_output("Snapshot restored to CleanBaseline")
            return True
        except Exception as e:
            self._logger.error(f"Failed to restore snapshot: {e}")
            self.append_output(f"ERROR: {e}")
            return False

    def execute_simulator_sync(self, simulator: SimulatorDescriptor) -> None:
        """Synchronous version of execute_simulator for worker threads."""
        self._is_executing = True
        try:
            session = self._require_services().session_orchestrator.execute_simulator(simulator)
            self._current_session = session
            status_text = session.status.value
            message = f"Execution finished with status: {status_text}"
            if session.exit_code is not None:
                message += f" (exit code: {session.exit_code})"
            self.append_output(message)
            if session.error_message:
                self.append_output(f"Error: {session.error_message}")
        finally:
            self._is_executing = False

    def execute_simulator(self, simulator: SimulatorDescriptor) -> bool:
        """Execute a simulator."""
        if not self.can_execute:
            return False

        self._is_executing = True
        self.append_output(f"Starting execution: {simulator.display_name}")

        try:
            services = self._require_services()
            session = services.session_orchestrator.execute_simulator(simulator)

            self._current_session = session

            status_text = f"Completed" if session.status == SessionStatus.COMPLETED else str(session.status.value)
            out_msg = f"Execution {status_text}"
            if session.exit_code is not None:
                out_msg += f" (exit code: {session.exit_code})"
            self.append_output(out_msg)

            # Display simulation logs if available
            if session.metadata.get("stdout"):
                self.append_output("--- Simulation Output ---")
                stdout = session.metadata.get("stdout", "")
                stderr = session.metadata.get("stderr", "")
                if stdout:
                    for line in stdout.split("\n")[:50]:  # Limit to first 50 lines
                        if line.strip():
                            self.append_output(line)
                if stderr:
                    self.append_output("--- Errors ---")
                    for line in stderr.split("\n")[:20]:
                        if line.strip():
                            self.append_output(f"ERR: {line}")

            if session.error_message:
                self.append_output(f"Error: {session.error_message}")

            return session.status == SessionStatus.COMPLETED

        except Exception as e:
            self._logger.error(f"Execution failed: {e}")
            self.append_output(f"EXECUTION FAILED: {e}")
            return False

        finally:
            self._is_executing = False

    def refresh_status(self) -> None:
        """Refresh all status information."""
        # Skip refresh if we are currently executing a VM operation
        # to avoid lock contention with VBoxManage
        if self._is_executing:
            return
            
        self._refresh_vm_status()

    def clear_output(self) -> None:
        """Clear execution output."""
        self._execution_output = ""

    def append_output(self, text: str) -> None:
        """Append text to output with timestamp."""
        self._execution_output += f"[{self._timestamp()}] {text}\n"

    def _timestamp(self) -> str:
        """Get current timestamp string."""
        return datetime.now().strftime("%H:%M:%S")
