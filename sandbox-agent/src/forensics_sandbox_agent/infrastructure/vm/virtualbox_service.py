"""VirtualBox VM Service - comprehensive VM lifecycle management.

This service provides the primary interface for VM operations in the sandbox,
integrating controller, snapshot management, and execution management.
"""

from __future__ import annotations

import logging
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
)


class VirtualBoxVmService:
    """Comprehensive VM service for the forensics sandbox."""

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
        """Start the VM."""
        self._logger.info("Starting VM")
        self._vm_controller.start_vm(
            headless=self._execution_config.start_headless if headless is None else headless
        )

    def stop_vm(self, force: bool = False) -> None:
        """Stop the VM."""
        self._logger.info("Stopping VM")
        self._vm_controller.stop_vm(force=force)

    def restore_clean_snapshot(self) -> None:
        """Restore VM to clean baseline snapshot."""
        self._logger.info("Restoring clean snapshot")
        self._vm_controller.ensure_powered_off()
        self._snapshot_manager.restore_clean_snapshot()

    def execute_simulator(
        self,
        simulator: SimulatorDescriptor,
        auto_rollback: bool = True,
    ) -> ForensicSession:
        """Execute a simulator in the sandbox.

        Args:
            simulator: The simulator to execute
            auto_rollback: Whether to automatically rollback after execution

        Returns:
            ForensicSession with execution results
        """
        self._logger.info(f"Executing simulator: {simulator.id}")
        self._execution_manager.validate_simulator(simulator)

        session = ForensicSession(
            session_id=self._generate_session_id(),
            simulator_id=simulator.id,
            status=SessionStatus.PREPARING,
            vm_name=self._vm_controller.vm_name,
            snapshot_name=self._execution_config.snapshot_name,
        )
        self._current_forensic_session = session

        try:
            # 1. Ensure VM is powered off for clean restoration
            session.execution_phase = ExecutionPhase.VM_READY
            self._vm_controller.ensure_powered_off()

            # 2. Restore the clean snapshot
            session.execution_phase = ExecutionPhase.SNAPSHOT_RESTORED
            self._snapshot_manager.restore_clean_snapshot()

            # Stabilization delay: allow VirtualBox to settle after restoration.
            import time
            time.sleep(3)

            # 3. Start VM for execution
            self._vm_controller.ensure_running(headless=self._execution_config.start_headless)

            # Stabilization delay: allow VM process to initialize hardware.
            time.sleep(2)

            # 4. Wait for Guest OS to boot and Guest Additions to be ready
            session.execution_phase = ExecutionPhase.VM_READY
            if not self._vbox.wait_for_guest_additions(
                self.vm_name,
                timeout=self._execution_config.guest_additions_timeout_seconds,
            ):
                raise ValueError("Guest Additions not ready. Please ensure they are installed and the VM is booted.")

            session.execution_phase = ExecutionPhase.TRANSFERRING_SIMULATOR
            self._execution_manager.transfer_simulator(simulator)

            session.execution_phase = ExecutionPhase.EXECUTING
            session.start_execution()

            exec_session = self._execution_manager.execute_with_timeout(simulator)
            session.exit_code = exec_session.exit_code
            session.metadata["stdout"] = exec_session.stdout
            session.metadata["stderr"] = exec_session.stderr
            session.metadata["telemetry_log"] = exec_session.telemetry_log

            if session.exit_code == 0:
                session.complete(session.exit_code)
            else:
                session.fail(f"Exit code: {session.exit_code}")

            self._execution_manager.cleanup_simulator(simulator.id)

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
            raise

    def _generate_session_id(self) -> str:
        """Generate unique session identifier."""
        import uuid
        return f"fs_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"

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
