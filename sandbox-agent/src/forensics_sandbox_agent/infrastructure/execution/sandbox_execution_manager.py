"""Sandbox Execution Manager - core orchestration for simulator execution.

This module manages the complete lifecycle of sandbox execution including:
- Simulator validation and transfer
- Execution lifecycle management
- Timeout handling
- Rollback orchestration
"""

from __future__ import annotations

import hashlib
import json
import logging
import ntpath
import os
import shutil
import threading
import time
import uuid
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
from forensics_sandbox_agent.domain.simulator_mapping import VALID_SIMULATOR_IDS, get_executable_name, get_generic_name
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

    MAX_DETACHED_RETRIES = 2

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
        self._session_lock = threading.Lock()
        self._current_session: Optional[ExecutionSession] = None
        self._detached_attempts: int = 0

    @property
    def current_session(self) -> Optional[ExecutionSession]:
        """Get the current execution session."""
        with self._session_lock:
            return self._current_session

    def validate_simulator(self, simulator: SimulatorDescriptor) -> None:
        """Validate simulator is safe for execution."""
        self._logger.info(f"Validating simulator: {simulator.id}")
        self._logger.info(f"  - display_name: {simulator.display_name}")
        self._logger.info(f"  - executable_path: '{simulator.executable_path}'")
        self._logger.info(f"  - executable_path exists: {Path(simulator.executable_path).exists() if simulator.executable_path else 'N/A'}")

        if str(simulator.id) not in VALID_SIMULATOR_IDS:
            self._logger.error(f"REJECTED: Unknown simulator id: '{simulator.id}' (type: {type(simulator.id)})")
            self._logger.error(f"Valid IDs are: {VALID_SIMULATOR_IDS}")
            raise SimulatorValidationError(f"Unknown simulator: {simulator.id}")

        if not simulator.executable_path:
            self._logger.warning(f"No executable path for {simulator.id} — build simulators with 'python build.py simulator'")
            raise SimulatorValidationError(f"Simulator executable not found — run 'python build.py simulator' or set SIMULATOR_PATH")

        if not Path(simulator.executable_path).exists():
            self._logger.error(f"REJECTED: File not found: {simulator.executable_path}")
            raise SimulatorValidationError(f"Simulator executable not found: {simulator.executable_path}")

        generic_name = get_generic_name(simulator.id)
        if generic_name:
            expected_exe = get_executable_name(generic_name)
            if expected_exe:
                actual_name = os.path.basename(simulator.executable_path)
                if actual_name.lower() != expected_exe.lower():
                    self._logger.error(
                        f"REJECTED: Executable name mismatch for {simulator.id}: "
                        f"expected '{expected_exe}', got '{actual_name}'"
                    )
                    raise SimulatorValidationError(
                        f"Executable name mismatch for {simulator.id}: "
                        f"expected '{expected_exe}', got '{actual_name}'"
                    )

        self._logger.info(f"APPROVED: Simulator {simulator.id} is valid")
        return

    def prepare_vm_for_execution(self) -> None:
        """Prepare VM for sandbox execution (start if needed, ensure ready)."""
        self._logger.info("Preparing VM for execution")

        self._vm_controller.ensure_running(headless=self._execution_config.start_headless)

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
        self._logger.info(f"  - Source path: {simulator.executable_path}")

        import os
        exe_name = os.path.basename(simulator.executable_path)
        guest_path = f"{self._execution_config.simulator_transfer_path}/{exe_name}"
        self._logger.info(f"  - Guest path: {guest_path}")

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

        guest_executable = f"{self._execution_config.simulator_transfer_path}/{ntpath.basename(simulator.executable_path)}"
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

            if exit_code == 0:
                metadata.exit_code = 0
            else:
                metadata.exit_code = exit_code
            metadata.stdout = stdout
            metadata.stderr = stderr
            metadata.execution_end = datetime.now()

            self._logger.info(f"Simulator execution completed with exit code: {metadata.exit_code}")
            return metadata

        except Exception as e:
            if "exit 322122" in str(e) and self._detached_attempts < self.MAX_DETACHED_RETRIES:
                self._detached_attempts += 1
                self._logger.warning(
                    "Detached fallback attempt %d/%d for %s",
                    self._detached_attempts, self.MAX_DETACHED_RETRIES, simulator.id
                )
                # Only allow detached fallback for known simulator executables
                allowed_prefixes = (r"C:\sandbox\simulators\\", guest_environment.get("TEMP", r"C:\sandbox\tmp"))
                if not any(guest_executable_win.startswith(p) for p in allowed_prefixes):
                    self._logger.error("Detached fallback rejected: executable path %s not in allowed locations", guest_executable_win)
                else:
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
            metadata.exit_code = metadata.exit_code if metadata.exit_code is not None else 1
            metadata.error_message = str(e)
            raise ExecutionTimeoutError(f"Simulator execution failed: {e}")

    def _is_process_running_in_guest(self, process_name: str) -> bool:
        """Check if a process is still running inside the guest VM via tasklist."""
        try:
            exit_code, stdout, stderr = self._vbox.guest_control_exec(
                self._vm_controller.vm_name,
                r"C:\Windows\System32\cmd.exe",
                ["/c", "tasklist", "/fi", f"imagename eq {process_name}", "/fo", "csv", "/nh"],
                timeout=10,
            )
            return exit_code == 0 and process_name.lower() in stdout.lower()
        except Exception as exc:
            self._logger.debug("Process liveness check failed: %s", exc)
            return False

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

        # ---- Fix A: Verify process actually started in the guest ----
        process_name = ntpath.basename(guest_executable)
        start_verified = False
        for attempt in range(5):
            if self._is_process_running_in_guest(process_name):
                start_verified = True
                break
            time.sleep(1)
        if not start_verified:
            self._logger.warning(
                "Detached process %s never appeared in guest process list within 5s",
                process_name,
            )
            return False, ""

        generic_name = simulator.metadata.get("generic_name", simulator.id)
        log_path = f"{guest_environment['TEMP']}\\simulator_safe\\{generic_name}.log"
        max_wait = min(max(simulator.timeout_seconds, 30), 300)
        start_time = time.time()
        deadline = start_time + max_wait
        poll_interval = 3
        last_output = ""
        poll_count = 0
        had_any_output = False

        while time.time() < deadline:
            remaining = deadline - time.time()
            if remaining < 0:
                break
            actual_sleep = min(poll_interval, remaining)
            if actual_sleep > 0:
                time.sleep(actual_sleep)
            try:
                exit_code, stdout, stderr = self._vbox.guest_control_exec(
                    self._vm_controller.vm_name,
                    r"C:\Windows\System32\cmd.exe",
                    ["/c", "type", log_path],
                    timeout=10,
                )
            except Exception as exc:
                self._logger.debug("Waiting for simulator telemetry log: %s", exc)
                # ---- Fix C: Check if process died between polls ----
                poll_count += 1
                if poll_count % 3 == 0:
                    if not self._is_process_running_in_guest(process_name):
                        if had_any_output:
                            self._logger.warning(
                                "Process %s died after partial output (~%ds), reporting partial result",
                                process_name, int(time.time() - start_time),
                            )
                            return False, last_output
                        # ---- Fix B: Short-circuit if never had output and process is gone ----
                        elapsed = time.time() - start_time
                        if elapsed >= 30:
                            self._logger.warning(
                                "Simulator %s: no output after %ds and process gone, short-circuiting",
                                simulator.id, int(elapsed),
                            )
                            return False, last_output
                continue

            if exit_code == 0:
                if stdout:
                    had_any_output = True
                last_output = stdout
                
                # Try to parse exit code from simulator log if present
                if '"exit_code":' in stdout:
                    try:
                        import re
                        match = re.search(r'"exit_code":\s*(\d+)', stdout)
                        if match:
                            extracted_exit_code = int(match.group(1))
                            if "simulation_complete" in stdout or '"stage": "completed"' in stdout:
                                self._logger.info(f"Extracted exit code {extracted_exit_code} from simulator log")
                                # We'll return True and let the caller handle the exit code if they want,
                                # but usually True here means 'success' in the sense of 'it finished'.
                                # Actually, _try_detached_simulator_run returns (bool, str).
                                # The caller execute_simulator sets metadata.exit_code = 0 if this returns True.
                                return True, stdout
                    except Exception:
                        pass

                if "simulation_complete" in stdout or '"stage": "completed"' in stdout:
                    return True, stdout

            # ---- Fix C: Periodic process death detection during active polling ----
            poll_count += 1
            if poll_count % 3 == 0:
                if not self._is_process_running_in_guest(process_name):
                    if had_any_output:
                        self._logger.warning(
                            "Process %s died at ~%ds with partial output before completion marker",
                            process_name, int(time.time() - start_time),
                        )
                        return False, last_output
                    elapsed = time.time() - start_time
                    if elapsed >= 30:
                        self._logger.warning(
                            "Simulator %s: no output after %ds and process not running, short-circuiting",
                            simulator.id, int(elapsed),
                        )
                        return False, last_output

        return False, last_output

    def execute_with_timeout(
        self,
        simulator: SimulatorDescriptor,
        timeout_seconds: Optional[int] = None,
    ) -> ExecutionMetadata:
        """Execute simulator with timeout enforcement."""
        timeout = timeout_seconds or self._execution_config.execution_timeout_seconds

        if timeout <= 0:
            raise ExecutionTimeoutError(f"Invalid timeout value: {timeout}s")

        self._logger.info(f"Executing simulator with {timeout}s timeout")
        metadata = self.execute_simulator(simulator)

        if metadata.execution_start and metadata.execution_end:
            elapsed = (metadata.execution_end - metadata.execution_start).total_seconds()
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
        """Generate structured forensic report with SHA-256 fingerprint."""
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

        report = {
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

        serialized = json.dumps(report, sort_keys=True, default=str)
        report["hash"] = {"sha256": hashlib.sha256(serialized.encode("utf-8")).hexdigest()}

        return report

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
        generic_name = simulator.metadata.get("generic_name", simulator.id)

        # Catch-all pass: grab any remaining files with non-standard extensions
        try:
            exit_code, stdout, stderr = self._vbox.guest_control_exec(
                self._vm_controller.vm_name,
                r"C:\Windows\System32\cmd.exe",
                ["/c", "dir", f"{guest_dir}*.*", "/s", "/b"],
                timeout=15,
            )
            if exit_code == 0 and stdout.strip():
                telemetry_log_name = f"{generic_name}.log"
                guest_basenames_to_skip = {
                    get_executable_name(get_generic_name(simulator.id)) if get_generic_name(simulator.id) else None,
                    "msvcp140.dll", "vcruntime140.dll", "vcruntime140_1.dll",
                }
                already_extracted = set(extracted_paths)
                for guest_path in stdout.strip().split("\n"):
                    guest_path = guest_path.strip()
                    if not guest_path:
                        continue
                    # Skip the telemetry log — captured separately above
                    if guest_path.rstrip("\r").endswith(telemetry_log_name):
                        continue
                    # Skip the simulator executable and known DLLs
                    guest_basename = Path(guest_path).name.lower()
                    if guest_basename in guest_basenames_to_skip:
                        continue
                    local_path = str(output_dir / Path(guest_path).name)
                    if local_path in already_extracted:
                        continue
                    try:
                        self._vbox.file_copy_from_guest(
                            self._vm_controller.vm_name,
                            guest_path,
                            local_path,
                        )
                        extracted_paths.append(local_path)
                        already_extracted.add(local_path)
                        self._logger.info(f"Extracted catch-all artifact: {Path(guest_path).name}")
                    except Exception as copy_err:
                        self._logger.debug(f"Catch-all copy skipped for {guest_path}: {copy_err}")
        except VBoxCommandError:
            self._logger.debug("Catch-all artifact scan found no additional files")

        telemetry_log_path = f"{guest_dir}\\tmp\\simulator_safe\\{generic_name}.log"
        try:
            exit_code, stdout, stderr = self._vbox.guest_control_exec(
                self._vm_controller.vm_name,
                r"C:\Windows\System32\cmd.exe",
                ["/c", "type", telemetry_log_path],
                timeout=10,
            )
            if exit_code == 0 and stdout.strip():
                # Save telemetry log
                telemetry_file = output_dir / f"{generic_name}_telemetry.log"
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

        with self._session_lock:
            if self._current_session:
                self._current_session.status = ExecutionStatus.ROLLING_BACK

        last_error = None
        for attempt in range(self._rollback_config.max_rollback_attempts):
            try:
                self._snapshot_manager.perform_rollback()

                with self._session_lock:
                    if self._current_session:
                        self._current_session.rollback_attempts += 1
                        self._current_session.status = ExecutionStatus.ROLLED_BACK

                self._logger.info("Rollback completed successfully")
                return

            except Exception as e:
                self._current_session.rollback_attempts += 1
                last_error = e
                self._logger.error(f"Rollback attempt {attempt + 1} failed: {e}")
                if attempt < self._rollback_config.max_rollback_attempts - 1:
                    continue
        raise ExecutionError(f"Rollback failed after {self._rollback_config.max_rollback_attempts} attempts: {last_error}")

    def cleanup_simulator(self, simulator_id: str, executable_path: str = "") -> None:
        """Clean up simulator files from VM after execution."""
        self._logger.info(f"Cleaning up simulator: {simulator_id}")

        import os as _os
        exe_name = _os.path.basename(executable_path) if executable_path else f"{simulator_id}.exe"
        guest_executable = f"{self._execution_config.simulator_transfer_path}/{exe_name}"
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
        with self._session_lock:
            self._current_session = session

        try:
            session.status = ExecutionStatus.PREPARING

            self.validate_simulator(simulator)
            self.prepare_vm_for_execution()

            if enable_rollback:
                self.create_execution_checkpoint(session_id)

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
