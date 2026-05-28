"""VirtualBox VM Service - comprehensive VM lifecycle management.

This service provides the primary interface for VM operations in the sandbox,
integrating controller, snapshot management, and execution management.
"""

from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime
from typing import Optional

from forensics_sandbox_agent.app.config.models import AppSettings
from forensics_sandbox_agent.app.config.execution_models import (
    SandboxExecutionConfig,
    RollbackPolicyConfig,
    IsolationConfig,
)
from forensics_sandbox_agent.domain.entities.forensic_session import (
    ForensicSession,
    SessionStatus,
    ExecutionPhase,
)
from forensics_sandbox_agent.domain.entities.simulator_descriptor import SimulatorDescriptor

from forensics_sandbox_agent.infrastructure.vm.vbox_communication import VBoxManage
from forensics_sandbox_agent.infrastructure.vm.vm_controller import (
    VmController,
    VmStatus,
    VmReadinessResult,
)
from forensics_sandbox_agent.infrastructure.vm.snapshot_manager import SnapshotManager
from forensics_sandbox_agent.infrastructure.execution.sandbox_execution_manager import (
    SandboxExecutionManager,
    ExecutionSession,
    ExecutionStatus,
    ExecutionError,
)


class VmLifecycleState:
    """State machine for VM lifecycle."""
    UNINITIALIZED = "uninitialized"
    STOPPED = "stopped"
    STARTING = "starting"
    RUNNING = "running"
    RESTORING_SNAPSHOT = "restoring_snapshot"
    ERROR = "error"


class VirtualBoxVmService:
    """Comprehensive VM service for the forensics sandbox."""

    MAX_VM_START_RETRIES = 3
    VM_START_RETRY_DELAY_SECONDS = 5

    def __init__(self, settings: AppSettings, logger: logging.Logger) -> None:
        self._settings = settings
        self._logger = logger
        self._execution_config = settings.execution_policy.sandbox_execution
        self._rollback_config = settings.execution_policy.rollback_policy
        self._isolation_config = settings.execution_policy.isolation

        self._vbox = VBoxManage(
            logger=logger,
            guest_username=self._execution_config.guest_username,
            guest_password=self._execution_config.guest_password,
        )
        self._vm_controller = VmController(
            vbox=self._vbox,
            config=self._execution_config,
            isolation=self._isolation_config,
            logger=logger,
        )
        self._snapshot_manager = SnapshotManager(
            vbox=self._vbox,
            config=self._execution_config,
            logger=logger,
        )
        self._execution_manager = SandboxExecutionManager(
            vm_controller=self._vm_controller,
            snapshot_manager=self._snapshot_manager,
            vbox=self._vbox,
            execution_config=self._execution_config,
            rollback_config=self._rollback_config,
            isolation_config=self._isolation_config,
            logger=logger,
        )

        self._current_forensic_session: Optional[ForensicSession] = None
        self._lifecycle_state: str = VmLifecycleState.UNINITIALIZED

    @property
    def vm_name(self) -> str:
        """Get configured VM name."""
        return self._vm_controller.vm_name

    @property
    def vm_status(self) -> VmStatus:
        """Get current VM status."""
        return self._vm_controller.get_vm_state()

    @property
    def current_session(self) -> Optional[ForensicSession]:
        """Get current forensic session."""
        return self._current_forensic_session

    def validate_environment(self) -> None:
        """Validate VM environment is properly configured."""
        self._logger.info("Validating VM environment")

        if not self._vm_controller.vm_exists():
            raise ValueError(f"VM does not exist: {self._vm_controller.vm_name}")

        if not self._snapshot_manager.verify_clean_snapshot():
            raise ValueError(f"Clean snapshot not available: {self._execution_config.snapshot_name}")

        readiness = self._vm_controller.verify_vm_ready()
        if not readiness.is_ready:
            self._logger.warning(f"VM readiness warnings: {readiness.errors}")

        self._logger.info("VM environment validation completed")

    def prepare_snapshot_workflow(self) -> None:
        """Prepare the snapshot workflow for execution."""
        self._logger.info("Preparing snapshot workflow")

        current_state = self._vm_controller.get_vm_state()

        if current_state == VmStatus.RUNNING:
            self._logger.info("VM is already running")
        elif current_state == VmStatus.POWERED_OFF:
            self._vm_controller.start_vm(headless=self._execution_config.start_headless)
        else:
            self._logger.warning(f"VM in unexpected state: {current_state.value}")

        if not self._snapshot_manager.verify_clean_snapshot():
            raise ValueError("Clean snapshot verification failed")

        self._logger.info("Snapshot workflow prepared")

    def check_vm_ready(self) -> VmReadinessResult:
        """Check if VM is ready for sandbox execution."""
        return self._vm_controller.verify_vm_ready()

    def get_vm_info(self) -> dict:
        """Get comprehensive VM information."""
        vm_exists = self._vm_controller.vm_exists()
        state = self._vm_controller.get_vm_state()
        readiness = self._vm_controller.verify_vm_ready()

        return {
            "vm_name": self._vm_controller.vm_name,
            "vm_exists": vm_exists,
            "vm_status": state.value,
            "is_ready": readiness.is_ready,
            "ready_errors": readiness.errors,
            "marker_present": readiness.marker_present,
            "vbox_available": self._vbox.is_available,
            "vbox_path": self._vbox.executable_path,
            "snapshot_name": self._execution_config.snapshot_name,
            "snapshot_exists": self._snapshot_manager.snapshot_exists(),
            "current_session": self._current_forensic_session.session_id if self._current_forensic_session else None,
        }

    def start_vm(self, headless: Optional[bool] = None) -> None:
        """Start the VM with retry logic."""
        headless_mode = self._execution_config.start_headless if headless is None else headless
        self._lifecycle_state = VmLifecycleState.STARTING
        self._logger.info(f"Starting VM (headless={headless_mode})")

        last_error = None
        for attempt in range(self.MAX_VM_START_RETRIES):
            try:
                self._vm_controller.start_vm(headless=headless_mode)
                self._lifecycle_state = VmLifecycleState.RUNNING
                self._logger.info(f"VM started successfully on attempt {attempt + 1}")
                return
            except Exception as e:
                last_error = e
                self._logger.warning(f"VM start attempt {attempt + 1}/{self.MAX_VM_START_RETRIES} failed: {e}")
                if attempt < self.MAX_VM_START_RETRIES - 1:
                    time.sleep(self.VM_START_RETRY_DELAY_SECONDS)

        self._lifecycle_state = VmLifecycleState.ERROR
        raise RuntimeError(f"Failed to start VM after {self.MAX_VM_START_RETRIES} attempts: {last_error}")

    def stop_vm(self, force: bool = False) -> None:
        """Stop the VM."""
        self._logger.info("Stopping VM")
        self._vm_controller.stop_vm(force=force)
        self._lifecycle_state = VmLifecycleState.STOPPED

    def cleanup_orphaned_vbox_processes(self, kill_all: bool = False) -> None:
        """Clean up orphaned VirtualBox processes via the VM controller."""
        self._vm_controller.cleanup_orphaned_vbox_processes(kill_all=kill_all)

    def restore_clean_snapshot(self) -> None:
        """Restore VM to clean baseline snapshot."""
        self._logger.info("Restoring clean snapshot")
        self._lifecycle_state = VmLifecycleState.RESTORING_SNAPSHOT
        self._vm_controller.ensure_powered_off()
        self._snapshot_manager.restore_clean_snapshot()
        self._lifecycle_state = VmLifecycleState.STOPPED

    def execute_simulator(
        self,
        simulator: SimulatorDescriptor,
        auto_rollback: bool = True,
        session_id: Optional[str] = None,
    ) -> ForensicSession:
        """Execute a simulator in the sandbox.

        Args:
            simulator: The simulator to execute
            auto_rollback: Whether to automatically rollback after execution

        Returns:
            ForensicSession with execution results
        """
        self._logger.info(f"Executing simulator: {simulator.id}")
        self._logger.info(f"Simulator executable path: {simulator.executable_path}")

        session = ForensicSession(
            session_id=session_id or self._generate_session_id(),
            simulator_id=simulator.id,
            status=SessionStatus.PREPARING,
            vm_name=self._vm_controller.vm_name,
            snapshot_name=self._execution_config.snapshot_name,
        )
        self._current_forensic_session = session

        try:
            self._execution_manager.validate_simulator(simulator)
            self._logger.info("Phase 1/6: Powering off VM")
            session.execution_phase = ExecutionPhase.VM_READY
            self._vm_controller.ensure_powered_off()

            self._logger.info("Phase 2/6: Restoring clean snapshot")
            session.execution_phase = ExecutionPhase.SNAPSHOT_RESTORED
            self._snapshot_manager.restore_clean_snapshot()

            self._logger.info("Phase 3/6: Starting VM for execution")
            self._vm_controller.ensure_running(headless=self._execution_config.start_headless)

            self._logger.info("Phase 4/6: Waiting for Guest Additions...")
            if not self._vbox.wait_for_guest_additions(self._vm_controller.vm_name, timeout=300):
                raise ExecutionError("Guest Additions not ready - cannot transfer simulator to VM")

            self._logger.info("Phase 5/6: Transferring simulator to VM")
            session.execution_phase = ExecutionPhase.TRANSFERRING_SIMULATOR
            self._execution_manager.transfer_simulator(simulator)

            self._logger.info("Phase 6/6: Executing simulator")
            session.execution_phase = ExecutionPhase.EXECUTING
            session.start_execution()

            exec_session = self._execution_manager.execute_with_timeout(simulator)
            session.exit_code = exec_session.exit_code
            session.metadata["stdout"] = exec_session.stdout
            session.metadata["stderr"] = exec_session.stderr
            session.metadata["telemetry_log"] = exec_session.telemetry_log

            self._logger.info(f"Simulator execution completed with exit code: {session.exit_code}")

            if session.exit_code == 0:
                session.complete(session.exit_code)
            else:
                session.fail(f"Exit code: {session.exit_code}")

            self._execution_manager.cleanup_simulator(simulator.id, simulator.executable_path)

            if auto_rollback and self._rollback_config.enabled:
                session.mark_rollback()
                self._snapshot_manager.perform_rollback()

            self._logger.info(f"Simulator execution completed: {simulator.id}")
            return session
        except Exception as exc:
            session.fail(str(exc))
            self._logger.error("Simulator execution failed: %s", exc)
            if auto_rollback and self._rollback_config.enabled and self._rollback_config.rollback_on_error:
                try:
                    session.mark_rollback()
                    self._snapshot_manager.perform_rollback()
                except Exception as rollback_exc:
                    self._logger.error("Rollback after execution failure also failed: %s", rollback_exc)
            # Clean up orphaned VBox processes on failure (something went wrong)
            self.cleanup_orphaned_vbox_processes(kill_all=True)
            raise
        finally:
            # Always clean up tracked PIDs when the session completes or fails
            self.cleanup_orphaned_vbox_processes(kill_all=False)

    @staticmethod
    def _generate_session_id() -> str:
        """Generate unique session identifier."""
        return f"fs_{uuid.uuid4().hex[:12]}"

    def get_execution_history(self) -> list[dict]:
        """Get execution history (placeholder for future persistence)."""
        return []

    def get_current_execution_status(self) -> Optional[dict]:
        """Get current execution status."""
        if not self._current_forensic_session:
            return None

        session = self._current_forensic_session
        return {
            "session_id": session.session_id,
            "simulator_id": session.simulator_id,
            "status": session.status.value,
            "phase": session.execution_phase.value,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "exit_code": session.exit_code,
            "error": session.error_message,
        }
