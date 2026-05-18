"""Sandbox Execution Manager - core orchestration for simulator execution.

This module manages the complete lifecycle of sandbox execution including:
- Simulator validation and transfer
- Execution lifecycle management
- Timeout handling
- Rollback orchestration
"""

from __future__ import annotations

import logging
import time
import uuid
import json
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional

from forensics_sandbox_agent.app.config.execution_models import (
    SandboxExecutionConfig,
    RollbackPolicyConfig,
    IsolationConfig,
)
from forensics_sandbox_agent.domain.entities.simulator_descriptor import SimulatorDescriptor
from forensics_sandbox_agent.infrastructure.vm.vm_controller import (
    VmController,
    VmStatus,
)
from forensics_sandbox_agent.infrastructure.vm.snapshot_manager import SnapshotManager
from forensics_sandbox_agent.infrastructure.vm.vbox_communication import (
    VBoxManage,
    VBoxCommandError,
    VBoxNotFoundError,
)
from forensics_sandbox_agent.infrastructure.monitoring.event_models import EventCategory, ForensicEvent


class ExecutionStatus(Enum):
    """Status of a sandbox execution session."""
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    RUNNING = "running"
    COMPLETED = "completed"
    TIMEOUT = "timeout"
    ERROR = "error"
    ROLLING_BACK = "rolling_back"
    ROLLED_BACK = "rolled_back"


class SimulatorValidationError(Exception):
    """Raised when simulator validation fails."""
    pass


class ExecutionError(Exception):
    """Raised when execution encounters an error."""
    pass


class ExecutionTimeoutError(Exception):
    """Raised when execution exceeds timeout."""
    pass


@dataclass
class ExecutionMetadata:
    """Metadata for a sandbox execution session."""
    simulator_name: str
    simulator_path: str
    transfer_path: str
    execution_start: Optional[datetime] = None
    execution_end: Optional[datetime] = None
    exit_code: Optional[int] = None
    stdout: str = ""
    stderr: str = ""
    error_message: Optional[str] = None
    extracted_artifacts: list[str] = field(default_factory=list)
    telemetry_log: str = ""


@dataclass
class ExecutionSession:
    """Complete sandbox execution session state."""
    session_id: str
    status: ExecutionStatus
    created_at: datetime
    simulator_descriptor: Optional[SimulatorDescriptor] = None
    metadata: Optional[ExecutionMetadata] = None
    checkpoint_name: Optional[str] = None
    error_count: int = 0
    rollback_attempts: int = 0


class SandboxExecutionManager:
    """Manages the complete sandbox execution lifecycle."""

    def __init__(
        self,
        vm_controller: VmController,
        snapshot_manager: SnapshotManager,
        vbox: VBoxManage,
        execution_config: SandboxExecutionConfig,
        rollback_config: RollbackPolicyConfig,
        isolation_config: IsolationConfig,
        logger: logging.Logger,
    ) -> None:
        self._vm_controller = vm_controller
        self._snapshot_manager = snapshot_manager
        self._vbox = vbox
        self._execution_config = execution_config
        self._rollback_config = rollback_config
        self._isolation_config = isolation_config
        self._logger = logger
        self._current_session: Optional[ExecutionSession] = None

    @property
    def current_session(self) -> Optional[ExecutionSession]:
        """Get the current execution session."""
        return self._current_session

    def validate_simulator(self, simulator: SimulatorDescriptor) -> None:
        """Validate simulator is safe for execution."""
        self._logger.info(f"Validating simulator: {simulator.id}")

        if simulator.id not in ("ransomware-simulator", "spyware-simulator",
                                 "trojan-simulator", "botnet-simulator",
                                 "credential-stealer-simulator"):
            raise SimulatorValidationError(f"Unknown simulator: {simulator.id}")

        if not simulator.executable_path or not Path(simulator.executable_path).exists():
            raise SimulatorValidationError(f"Simulator executable not found: {simulator.executable_path}")

        self._logger.info(f"Simulator validated: {simulator.id}")

    def prepare_vm_for_execution(self) -> None:
        """Prepare VM for sandbox execution (start if needed, ensure ready)."""
        self._logger.info("Preparing VM for execution")

        self._vm_controller.ensure_running()

        readiness = self._vm_controller.verify_vm_ready()
        if not readiness.is_ready:
            raise ExecutionError(f"VM not ready: {readiness.errors}")

        self._logger.info("VM prepared for execution")

    def create_execution_checkpoint(self, session_id: str) -> None:
        """Create checkpoint before execution for potential rollback."""
        checkpoint_name = f"checkpoint_{session_id[:8]}"

        self._snapshot_manager.create_checkpoint(
            checkpoint_name,
            f"Pre-execution checkpoint for session {session_id}",
        )

        self._current_session.checkpoint_name = checkpoint_name
        self._logger.info(f"Execution checkpoint created: {checkpoint_name}")

    def transfer_simulator(self, simulator: SimulatorDescriptor) -> str:
        """Transfer simulator executable to VM."""
        self._logger.info(f"Transferring simulator: {simulator.id}")

        guest_path = f"{self._execution_config.simulator_transfer_path}/{simulator.id}.exe"

        try:
            self._vbox.ensure_guest_directory(
                self._vm_controller.vm_name,
                self._execution_config.simulator_transfer_path,
            )
            self._vbox.file_copy_to_guest(
                self._vm_controller.vm_name,
                simulator.executable_path,
                guest_path,
            )
            self._logger.info(f"Simulator transferred to: {guest_path}")

            if self._execution_config.transfer_runtime_dlls:
                self._transfer_vc_runtime_dlls(simulator.executable_path)

            return guest_path

        except (VBoxCommandError, VBoxNotFoundError) as e:
            raise ExecutionError(f"Failed to transfer simulator: {e}")

    def _transfer_vc_runtime_dlls(self, executable_path: str) -> None:
        """Transfer VC++ runtime DLLs to VM if they exist alongside the executable."""
        import os
        exe_dir = os.path.dirname(executable_path)
        dll_files = ['msvcp140.dll', 'vcruntime140.dll', 'vcruntime140_1.dll']

        for dll in dll_files:
            dll_path = os.path.join(exe_dir, dll)
            if os.path.exists(dll_path):
                guest_dll_path = f"{self._execution_config.simulator_transfer_path}/{dll}"
                try:
                    self._vbox.file_copy_to_guest(
                        self._vm_controller.vm_name,
                        dll_path,
                        guest_dll_path,
                    )
                    self._logger.info(f"VC++ runtime DLL transferred: {dll}")
                except (VBoxCommandError, VBoxNotFoundError) as e:
                    self._logger.warning(f"Failed to transfer VC++ DLL {dll}: {e}")

    def execute_simulator(self, simulator: SimulatorDescriptor) -> ExecutionMetadata:
        """Execute simulator inside the VM."""
        self._logger.info(f"Executing simulator: {simulator.id}")

        metadata = ExecutionMetadata(
            simulator_name=simulator.id,
            simulator_path=simulator.executable_path,
            transfer_path=self._execution_config.simulator_transfer_path,
        )

        guest_executable = f"{self._execution_config.simulator_transfer_path}/{simulator.id}.exe"
        guest_executable_win = guest_executable.replace("/", "\\")
        guest_cwd = self._execution_config.simulator_transfer_path.replace("/", "\\")
        guest_temp_dir = f"{guest_cwd}\\tmp"
        guest_environment = {
            "TEMP": guest_temp_dir,
            "TMP": guest_temp_dir,
            "PYTHONUNBUFFERED": "1",
        }

        metadata.execution_start = datetime.now()

        try:
            self._vbox.ensure_guest_directory(self._vm_controller.vm_name, guest_temp_dir)
            exit_code, stdout, stderr = self._vbox.guest_control_exec(
                self._vm_controller.vm_name,
                guest_executable_win,
                timeout=self._execution_config.execution_timeout_seconds,
                cwd=guest_cwd,
                environment=guest_environment,
            )

            metadata.exit_code = exit_code
            metadata.stdout = stdout
            metadata.stderr = stderr
            metadata.execution_end = datetime.now()

            self._logger.info(f"Simulator execution completed with exit code: {exit_code}")
            return metadata

        except Exception as e:
            if "exit 322122" in str(e):
                fallback_ok, fallback_output = self._try_detached_simulator_run(
                    simulator=simulator,
                    guest_executable=guest_executable_win,
                    guest_cwd=guest_cwd,
                    guest_environment=guest_environment,
                )
                if fallback_ok:
                    metadata.exit_code = 0
                    metadata.stdout = fallback_output
                    metadata.stderr = f"Synchronous guestcontrol run failed; detached fallback succeeded: {e}"
                    metadata.execution_end = datetime.now()
                    self._logger.info("Simulator completed through detached guest start fallback")
                    return metadata

            metadata.execution_end = datetime.now()
            metadata.error_message = str(e)
            raise ExecutionTimeoutError(f"Simulator execution failed: {e}")

    def _try_detached_simulator_run(
        self,
        simulator: SimulatorDescriptor,
        guest_executable: str,
        guest_cwd: str,
        guest_environment: dict[str, str],
    ) -> tuple[bool, str]:
        """Fallback for PyInstaller executables that crash under stdout capture."""
        self._logger.warning("Trying detached guest start fallback for %s", simulator.id)
        try:
            self._vbox.guest_control_start(
                self._vm_controller.vm_name,
                guest_executable,
                timeout=30,
                cwd=guest_cwd,
                environment=guest_environment,
            )
        except Exception as exc:
            self._logger.warning("Detached simulator start failed: %s", exc)
            return False, ""

        log_path = f"{guest_environment['TEMP']}\\simulator_safe\\{simulator.id}.log"
        deadline = time.time() + min(max(simulator.timeout_seconds, 30), 120)
        last_output = ""

        while time.time() < deadline:
            time.sleep(3)
            try:
                exit_code, stdout, stderr = self._vbox.guest_control_exec(
                    self._vm_controller.vm_name,
                    r"C:\Windows\System32\cmd.exe",
                    ["/c", "type", log_path],
                    timeout=10,
                )
            except Exception as exc:
                self._logger.debug("Waiting for simulator telemetry log: %s", exc)
                continue

            if exit_code == 0:
                last_output = stdout
                if "simulation_complete" in stdout or '"stage": "completed"' in stdout:
                    return True, stdout

        return False, last_output

    def execute_with_timeout(
        self,
        simulator: SimulatorDescriptor,
        timeout_seconds: Optional[int] = None,
    ) -> ExecutionMetadata:
        """Execute simulator with timeout enforcement."""
        timeout = timeout_seconds or self._execution_config.execution_timeout_seconds

        start_time = time.time()
        metadata = self.execute_simulator(simulator)

        elapsed = time.time() - start_time
        if elapsed > timeout:
            raise ExecutionTimeoutError(
                f"Execution exceeded timeout ({timeout}s), elapsed: {elapsed:.1f}s"
            )

        return metadata

    def generate_forensic_report(
        self,
        session_id: str,
        simulator_id: str,
        monitoring_summary: dict,
        events: list[ForensicEvent],
        execution_metadata: ExecutionMetadata,
    ) -> dict:
        """Generate structured forensic report matching backend /sync/reports/ingest schema."""
        process_events = [e.to_dict() for e in events if e.category == EventCategory.PROCESS]
        file_events = [e.to_dict() for e in events if e.category == EventCategory.FILE_SYSTEM]
        registry_events = [e.to_dict() for e in events if e.category == EventCategory.REGISTRY]
        network_events = [e.to_dict() for e in events if e.category == EventCategory.NETWORK]
        behavior_events = [e.to_dict() for e in events if e.category == EventCategory.BEHAVIOR]

        suspicious_activities = []
        for sa_data in monitoring_summary.get("suspicious_activities", []):
            if isinstance(sa_data, dict):
                suspicious_activities.append(sa_data)
            elif hasattr(sa_data, "indicator_type"):
                suspicious_activities.append({
                    "indicator": sa_data.indicator_type.value if hasattr(sa_data.indicator_type, "value") else str(sa_data.indicator_type),
                    "severity": sa_data.severity.value if hasattr(sa_data.severity, "value") else str(sa_data.severity),
                    "description": getattr(sa_data, "description", ""),
                    "evidence": getattr(sa_data, "evidence", []),
                })

        return {
            "sessionId": session_id,
            "simulatorId": simulator_id,
            "timestamp": datetime.now().isoformat(),
            "execution": {
                "exitCode": execution_metadata.exit_code,
                "stdout": execution_metadata.stdout[:5000] if execution_metadata.stdout else "",
                "stderr": execution_metadata.stderr[:2000] if execution_metadata.stderr else "",
                "startTime": execution_metadata.execution_start.isoformat() if execution_metadata.execution_start else None,
                "endTime": execution_metadata.execution_end.isoformat() if execution_metadata.execution_end else None,
                "errorMessage": execution_metadata.error_message,
                "extractedArtifacts": execution_metadata.extracted_artifacts,
            },
            "telemetry": {
                "processEvents": process_events,
                "fileEvents": file_events,
                "registryEvents": registry_events,
                "networkEvents": network_events,
                "behaviorAlerts": behavior_events,
                "totalEvents": len(events),
            },
            "summary": {
                "totalEvents": monitoring_summary.get("total_events", 0),
                "processCount": monitoring_summary.get("process_count", 0),
                "fileOperationsCount": monitoring_summary.get("file_operations_count", 0),
                "registryOperationsCount": monitoring_summary.get("registry_operations_count", 0),
                "networkOperationsCount": monitoring_summary.get("network_operations_count", 0),
                "eventsBySeverity": monitoring_summary.get("events_by_severity", {}),
                "eventsByCategory": monitoring_summary.get("events_by_category", {}),
                "suspiciousActivities": suspicious_activities,
            },
        }

    def extract_artifacts(
        self,
        simulator: SimulatorDescriptor,
        output_dir: Path,
    ) -> list[str]:
        """Extract forensic artifacts from the VM after simulator execution.

        This method scans the VM for files created by the simulator (e.g., .locked,
        .encrypted files from ransomware simulation) and copies them to the host.

        Args:
            simulator: The simulator that was executed
            output_dir: Local directory to store extracted artifacts

        Returns:
            List of local file paths for extracted artifacts
        """
        self._logger.info(f"Extracting forensic artifacts from VM for {simulator.id}")

        extracted_paths: list[str] = []
        guest_dir = self._execution_config.simulator_transfer_path.replace("/", "\\")

        # Known artifact patterns for different simulator types
        artifact_extensions = [
            ".locked", ".encrypted", ".ransom", ".crypto",  # Ransomware
            ".exfiltrated", ".stolen",                         # Credential stealer
            ".bot",                                            # Botnet
            ".keylog",                                         # Spyware
            ".payload",                                        # Trojan
        ]

        for ext in artifact_extensions:
            # Search for files with this extension in the guest
            try:
                exit_code, stdout, stderr = self._vbox.guest_control_exec(
                    self._vm_controller.vm_name,
                    r"C:\Windows\System32\cmd.exe",
                    ["/c", "dir", f"{guest_dir}*{ext}", "/s", "/b"],
                    timeout=15,
                )

                if exit_code == 0 and stdout.strip():
                    for guest_path in stdout.strip().split("\n"):
                        guest_path = guest_path.strip()
                        if not guest_path:
                            continue

                        try:
                            # Generate local filename
                            filename = Path(guest_path).name
                            local_path = output_dir / filename

                            # Copy from guest to host
                            self._vbox.file_copy_from_guest(
                                self._vm_controller.vm_name,
                                guest_path,
                                str(local_path),
                            )

                            extracted_paths.append(str(local_path))
                            self._logger.info(f"Extracted artifact: {filename}")

                        except Exception as copy_err:
                            self._logger.warning(f"Failed to copy artifact {guest_path}: {copy_err}")

            except VBoxCommandError as e:
                # No files found with this extension is normal
                self._logger.debug(f"No artifacts with {ext} extension found: {e}")

        # Also capture telemetry log if it exists
        telemetry_log_path = f"{guest_dir}\\tmp\\simulator_safe\\{simulator.id}.log"
        try:
            exit_code, stdout, stderr = self._vbox.guest_control_exec(
                self._vm_controller.vm_name,
                r"C:\Windows\System32\cmd.exe",
                ["/c", "type", telemetry_log_path],
                timeout=10,
            )
            if exit_code == 0 and stdout.strip():
                # Save telemetry log
                telemetry_file = output_dir / f"{simulator.id}_telemetry.log"
                with open(telemetry_file, "w", encoding="utf-8") as f:
                    f.write(stdout)
                self._logger.info(f"Captured telemetry log: {telemetry_file}")
        except VBoxCommandError:
            self._logger.debug("No telemetry log found in guest")

        self._logger.info(f"Artifact extraction complete: {len(extracted_paths)} files extracted")
        return extracted_paths

    def save_forensic_report(
        self,
        session_id: str,
        simulator_id: str,
        monitoring_summary: dict,
        events: list[ForensicEvent],
        execution_metadata: ExecutionMetadata,
        output_dir: Path,
    ) -> Optional[Path]:
        """Generate and save a structured forensic report JSON to disk."""
        try:
            report = self.generate_forensic_report(
                session_id=session_id,
                simulator_id=simulator_id,
                monitoring_summary=monitoring_summary,
                events=events,
                execution_metadata=execution_metadata,
            )

            report_path = output_dir / f"forensic_report_{session_id}.json"
            with open(report_path, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)

            self._logger.info(f"Saved forensic report: {report_path} ({len(events)} events)")
            return report_path

        except Exception as e:
            self._logger.warning(f"Failed to generate forensic report: {e}")
            return None

    def perform_rollback(self) -> None:
        """Execute rollback to clean snapshot."""
        self._logger.info("Initiating rollback to clean snapshot")

        if self._current_session:
            self._current_session.status = ExecutionStatus.ROLLING_BACK

        max_attempts = self._rollback_config.max_rollback_attempts

        for attempt in range(max_attempts):
            try:
                if self._current_session:
                    self._current_session.rollback_attempts += 1

                self._snapshot_manager.perform_rollback()

                if self._current_session:
                    self._current_session.status = ExecutionStatus.ROLLED_BACK

                self._logger.info("Rollback completed successfully")
                return

            except Exception as e:
                self._logger.warning(f"Rollback attempt {attempt + 1} failed: {e}")

                if attempt == max_attempts - 1:
                    self._logger.error("All rollback attempts failed")
                    if self._current_session:
                        self._current_session.status = ExecutionStatus.ERROR
                    raise ExecutionError(f"Rollback failed after {max_attempts} attempts: {e}")

        if self._current_session:
            self._current_session.status = ExecutionStatus.ERROR

    def cleanup_simulator(self, simulator_id: str) -> None:
        """Clean up simulator files from VM after execution."""
        self._logger.info(f"Cleaning up simulator: {simulator_id}")

        guest_executable = f"{self._execution_config.simulator_transfer_path}/{simulator_id}.exe"
        guest_files = [
            guest_executable,
            f"{self._execution_config.simulator_transfer_path}/msvcp140.dll",
            f"{self._execution_config.simulator_transfer_path}/vcruntime140.dll",
            f"{self._execution_config.simulator_transfer_path}/vcruntime140_1.dll",
        ]

        for index, guest_file in enumerate(guest_files):
            try:
                self._vbox.guest_remove_file(self._vm_controller.vm_name, guest_file, force=True)
                self._logger.info(f"Simulator cleanup completed: {guest_file}")
            except Exception as e:
                if index == 0:
                    self._logger.warning(f"Failed to cleanup simulator executable {guest_file}: {e}")
                else:
                    self._logger.debug(f"Guest cleanup skipped for {guest_file}: {e}")

    def execute(
        self,
        simulator: SimulatorDescriptor,
        enable_rollback: bool = True,
    ) -> ExecutionSession:
        """Execute complete sandbox workflow."""
        session_id = str(uuid.uuid4())
        self._logger.info(f"Starting sandbox execution session: {session_id}")

        session = ExecutionSession(
            session_id=session_id,
            status=ExecutionStatus.PENDING,
            created_at=datetime.now(),
            simulator_descriptor=simulator,
            metadata=None,
        )
        self._current_session = session

        try:
            session.status = ExecutionStatus.PREPARING

            self.validate_simulator(simulator)
            self.prepare_vm_for_execution()

            if enable_rollback:
                self.create_execution_checkpoint(session_id)

            session.status = ExecutionStatus.READY
            session.status = ExecutionStatus.RUNNING

            metadata = self.execute_with_timeout(simulator)
            session.metadata = metadata

            if metadata.exit_code == 0:
                session.status = ExecutionStatus.COMPLETED
                self._logger.info(f"Execution completed successfully: {session_id}")
            else:
                session.status = ExecutionStatus.ERROR
                self._logger.warning(f"Execution completed with non-zero exit code: {metadata.exit_code}")

        except ExecutionTimeoutError as e:
            session.status = ExecutionStatus.TIMEOUT
            session.metadata = ExecutionMetadata(
                simulator_name=simulator.id,
                simulator_path=simulator.executable_path,
                transfer_path=self._execution_config.simulator_transfer_path,
                error_message=str(e),
            )
            self._logger.error(f"Execution timeout: {e}")

        except Exception as e:
            session.status = ExecutionStatus.ERROR
            session.error_count += 1
            self._logger.error(f"Execution failed: {e}")

        if self._rollback_config.always_rollback_on_completion and enable_rollback:
            try:
                self.perform_rollback()
            except Exception as e:
                self._logger.error(f"Post-execution rollback failed: {e}")

        return session
