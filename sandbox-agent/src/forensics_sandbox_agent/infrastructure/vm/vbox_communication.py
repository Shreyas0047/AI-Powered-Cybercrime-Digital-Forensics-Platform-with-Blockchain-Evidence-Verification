"""VirtualBox communication layer using VBoxManage.

This module provides a clean abstraction around VBoxManage command-line interface,
centralizing all VirtualBox interactions behind structured service methods.
"""

from __future__ import annotations

import re
import logging
import os
import shutil
import subprocess
from dataclasses import dataclass
from typing import Optional
from datetime import datetime


class VBoxNotFoundError(Exception):
    """Raised when VBoxManage is not found or not accessible."""

    def __init__(self, message: str = "VBoxManage not found") -> None:
        self.message = message
        super().__init__(message)


class VBoxCommandError(Exception):
    """Raised when a VBoxManage command fails."""

    def __init__(self, command: str, return_code: int, stderr: str) -> None:
        self.command = command
        self.return_code = return_code
        self.stderr = stderr
        super().__init__(f"VBoxManage command failed: {command} (exit {return_code}): {stderr}")


class VBoxTimeoutError(Exception):
    """Raised when a VBoxManage command times out."""

    def __init__(self, command: str, timeout: float) -> None:
        self.command = command
        self.timeout = timeout
        super().__init__(f"VBoxManage command timed out after {timeout}s: {command}")


@dataclass(frozen=True)
class VmState:
    """Represents the current state of a VirtualBox VM."""
    name: str
    state: str  # e.g., "running", "powered off", "paused", "saved"
    session_state: str  # e.g., "None", "Shared"
    uuid: Optional[str] = None


@dataclass(frozen=True)
class SnapshotInfo:
    """Represents a VirtualBox snapshot."""
    name: str
    uuid: str
    creation_time: datetime
    description: Optional[str] = None


@dataclass(frozen=True)
class VBoxVersion:
    """VirtualBox version information."""
    major: int
    minor: int
    build: int
    version_string: str


class VBoxManage:
    """Abstraction layer for VBoxManage command-line interactions."""

    def __init__(
        self,
        logger: logging.Logger,
        timeout: int = 30,
        vboxmanage_path: Optional[str] = None,
        guest_username: str = "guestuser",
        guest_password: str = "guest",
    ) -> None:
        self._logger = logger
        self._timeout = timeout
        self._guest_username = guest_username
        self._guest_password = guest_password

        if vboxmanage_path:
            self._vboxmanage_path = vboxmanage_path
        else:
            self._vboxmanage_path = self._find_vboxmanage()

        self._available = self._check_vboxmanage_available()
        if not self._available:
            self._logger.warning(
                "VBoxManage not available at %s. VM actions will report setup errors until VirtualBox is installed.",
                self._vboxmanage_path,
            )

    @property
    def is_available(self) -> bool:
        """Return whether VBoxManage can be executed."""
        return self._available

    @property
    def executable_path(self) -> str:
        """Return the resolved VBoxManage path or command name."""
        return self._vboxmanage_path

    @staticmethod
    def _find_vboxmanage() -> str:
        """Find VBoxManage executable in system PATH."""
        vbox_path = shutil.which("VBoxManage")
        if vbox_path:
            return vbox_path

        env_path = os.environ.get("VBOX_MSI_INSTALL_PATH") or os.environ.get("VBOX_INSTALL_PATH")
        if env_path:
            candidate = os.path.join(env_path, "VBoxManage.exe")
            if os.path.exists(candidate):
                return candidate

        program_files = os.environ.get("ProgramFiles", "C:/Program Files")
        program_files_x86 = os.environ.get("ProgramFiles(x86)", "C:/Program Files (x86)")
        for root in (program_files, program_files_x86):
            vbox_install_path = os.path.join(root, "Oracle", "VirtualBox", "VBoxManage.exe")
            if os.path.exists(vbox_install_path):
                return vbox_install_path

        return "VBoxManage"

    def _check_vboxmanage_available(self) -> bool:
        """Check if VBoxManage is available."""
        try:
            result = subprocess.run(
                [self._vboxmanage_path, "--version"],
                capture_output=True,
                timeout=5,
            )
            return result.returncode == 0
        except Exception:
            return False

    def _execute_command(
        self,
        args: list[str],
        timeout: Optional[float] = None,
        capture_output: bool = True,
    ) -> subprocess.CompletedProcess:
        """Execute a VBoxManage command with proper error handling and retries for transient locks."""
        if not self._available:
            raise VBoxNotFoundError(
                f"VBoxManage not found at: {self._vboxmanage_path}. "
                "Install VirtualBox or add VBoxManage to PATH."
            )

        cmd = [self._vboxmanage_path] + args

        if timeout is None:
            timeout = float(self._timeout)

        self._logger.debug(f"Executing VBoxManage: {' '.join(args)}")

        stdout_pipe = subprocess.PIPE if capture_output else None
        stderr_pipe = subprocess.PIPE if capture_output else None
        creationflags = 0
        if os.name == "nt" and hasattr(subprocess, "CREATE_NO_WINDOW"):
            creationflags |= subprocess.CREATE_NO_WINDOW

        import time
        max_retries = 3
        retry_delay = 2.0

        for attempt in range(max_retries):
            try:
                self._logger.debug(f"Process starting: {' '.join(cmd)} (attempt {attempt + 1})")
                process = subprocess.Popen(
                    cmd,
                    stdout=stdout_pipe,
                    stderr=stderr_pipe,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    creationflags=creationflags,
                )
                self._logger.debug(f"Process PID: {process.pid}, waiting with timeout: {timeout}s")
                stdout, stderr = process.communicate(timeout=timeout)
                self._logger.debug(f"Process finished with return code: {process.returncode}")

                result = subprocess.CompletedProcess(
                    args=cmd,
                    returncode=process.returncode,
                    stdout=stdout,
                    stderr=stderr,
                )

                if result.returncode != 0:
                    # Check for transient errors that warrant a retry
                    # Note: 3221226356 (0xC0000374) and 3221225477 (0xC0000005) are common VBoxManage crashes during boot
                    is_transient = (
                        "E_ACCESSDENIED" in result.stderr or 
                        "not ready" in result.stderr.lower() or 
                        "locked by a session" in result.stderr.lower() or
                        "lock request pending" in result.stderr.lower() or
                        "guest execution service is not ready" in result.stderr.lower() or
                        result.returncode in (3221226356, 3221225477, -1073741819, -1073740940)
                    )
                    
                    if is_transient and attempt < max_retries - 1:
                        self._logger.debug(f"Transient VBoxManage error detected, retrying in {retry_delay}s...")
                        time.sleep(retry_delay)
                        continue
                        
                    raise VBoxCommandError(" ".join(args), result.returncode, result.stderr)

                return result

            except subprocess.TimeoutExpired:
                self._terminate_process_tree(process)
                if attempt < max_retries - 1:
                    self._logger.debug(f"VBoxManage command timed out, retrying in {retry_delay}s...")
                    time.sleep(retry_delay)
                    continue
                raise VBoxTimeoutError(" ".join(args), timeout)
            except Exception as e:
                if isinstance(e, (VBoxCommandError, VBoxTimeoutError)):
                    raise
                self._logger.error(f"Unexpected error executing VBoxManage: {e}")
                raise

        # Should not be reachable
        raise VBoxCommandError(" ".join(args), -1, "Retry loop exhausted without result")

    def _terminate_process_tree(self, process: subprocess.Popen) -> None:
        """Terminate a stuck VBoxManage process and any child process."""
        if process.poll() is not None:
            return
        try:
            if os.name == "nt":
                subprocess.run(
                    ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                    capture_output=True,
                    timeout=10,
                )
            else:
                process.kill()
        except Exception as exc:
            self._logger.warning("Failed to terminate timed-out VBoxManage process %s: %s", process.pid, exc)
            try:
                process.kill()
            except Exception:
                pass
        finally:
            try:
                process.wait(timeout=5)
            except Exception:
                pass

    def get_version(self) -> VBoxVersion:
        """Get the VirtualBox version information."""
        result = self._execute_command(["--version"])
        version_string = result.stdout.strip()

        match = re.match(r"(\d+)\.(\d+)\.(\d+)", version_string)
        if not match:
            raise VBoxCommandError("--version", 1, f"Could not parse version: {version_string}")

        return VBoxVersion(
            major=int(match.group(1)),
            minor=int(match.group(2)),
            build=int(match.group(3)),
            version_string=version_string,
        )

    def list_vms(self) -> list[VmState]:
        """List all registered VirtualBox VMs with retries for lock contention."""
        import time
        max_retries = 5
        retry_delay = 2.0

        for attempt in range(max_retries):
            try:
                result = self._execute_command(["list", "vms"])

                vms = []
                for line in result.stdout.strip().split("\n"):
                    if not line.strip():
                        continue

                    match = re.match(r'"([^"]+)"\s+\{([a-f0-9-]+)\}', line)
                    if match:
                        vms.append(VmState(
                            name=match.group(1),
                            state="unknown",
                            session_state="None",
                            uuid=match.group(2),
                        ))

                return vms
            except VBoxCommandError as e:
                is_transient = "E_ACCESSDENIED" in e.stderr or "not ready" in e.stderr.lower()
                if is_transient and attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                raise
        return []

    def list_running_vms(self) -> list[VmState]:
        """List all running VirtualBox VMs."""
        # This command rarely hits lock issues as it doesn't query machine-specific info
        result = self._execute_command(["list", "runningvms"])

        vms = []
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue

            match = re.match(r'"([^"]+)"\s+\{([a-f0-9-]+)\}', line)
            if match:
                vms.append(VmState(
                    name=match.group(1),
                    state="running",
                    session_state="None",
                    uuid=match.group(2),
                ))

        return vms

    def get_vm_state(self, vm_name: str) -> VmState:
        """Get the current state of a specific VM with retries for transient errors."""
        import time
        max_retries = 5
        retry_delay = 2.0

        for attempt in range(max_retries):
            try:
                result = self._execute_command(["showvminfo", vm_name, "--machinereadable"])

                state = "unknown"
                session_state = "None"
                uuid = None

                for line in result.stdout.strip().split("\n"):
                    if line.startswith("VMState="):
                        state = line.split("=")[1].strip('"')
                    elif line.startswith("SessionState="):
                        session_state = line.split("=")[1].strip('"')
                    elif line.startswith("UUID="):
                        uuid = line.split("=")[1].strip('"')

                return VmState(name=vm_name, state=state, session_state=session_state, uuid=uuid)
            except VBoxCommandError as e:
                # VirtualBox 7.x transient errors: "The object is not ready" or lock contention
                is_transient = "not ready" in e.stderr.lower() or "E_ACCESSDENIED" in e.stderr
                if is_transient and attempt < max_retries - 1:
                    self._logger.debug(f"VM state query failed (attempt {attempt + 1}/{max_retries}): {e.stderr}. Retrying...")
                    time.sleep(retry_delay)
                    continue
                raise

        # Should not reach here if max_retries > 0
        return VmState(name=vm_name, state="unknown", session_state="None")

    def get_machine_readable_info(self, vm_name: str) -> dict[str, str]:
        """Return showvminfo --machinereadable as a dictionary."""
        result = self._execute_command(["showvminfo", vm_name, "--machinereadable"])
        info: dict[str, str] = {}
        for line in result.stdout.splitlines():
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            info[key.strip()] = value.strip().strip('"')
        return info

    def start_vm(
        self,
        vm_name: str,
        background: bool = True,
    ) -> None:
        """Start a VirtualBox VM.

        Args:
            vm_name: Name of the VM to start
            background: If True, start in background (headless) mode
        """
        if background:
            self._logger.info(f"Starting VM {vm_name} in HEADLESS mode")
            args = ["startvm", vm_name, "--type", "headless"]
        else:
            self._logger.info(f"Starting VM {vm_name} in GUI mode (interactive)")
            args = ["startvm", vm_name]

        self._execute_command(args)
        self._logger.info(f"VM start command executed: {vm_name}")

    def stop_vm(
        self,
        vm_name: str,
        force: bool = False,
    ) -> None:
        """Stop a VirtualBox VM.

        Args:
            vm_name: Name of the VM to stop
            force: If True, force power off instead of graceful shutdown
        """
        if force:
            args = ["controlvm", vm_name, "poweroff"]
        else:
            args = ["controlvm", vm_name, "acpipowerbutton"]

        self._execute_command(args)
        self._logger.info(f"Stopped VM: {vm_name}")

    def pause_vm(self, vm_name: str) -> None:
        """Pause a running VM."""
        self._execute_command(["controlvm", vm_name, "pause"])
        self._logger.info(f"Paused VM: {vm_name}")

    def resume_vm(self, vm_name: str) -> None:
        """Resume a paused VM."""
        self._execute_command(["controlvm", vm_name, "resume"])
        self._logger.info(f"Resumed VM: {vm_name}")

    def list_snapshots(self, vm_name: str) -> list[SnapshotInfo]:
        """List all snapshots for a specific VM with retries for lock contention."""
        import time
        max_retries = 5
        retry_delay = 2.0

        for attempt in range(max_retries):
            try:
                result = self._execute_command(["snapshot", vm_name, "list", "--machinereadable"])

                snapshots = []
                # Support both standard and machine-readable patterns
                snapshot_pattern = re.compile(r'SnapshotName(?:-\d+)?=(.+)')
                uuid_pattern = re.compile(r'SnapshotUUID(?:-\d+)?=(.+)')

                snapshot_map = {}
                for line in result.stdout.strip().split("\n"):
                    line = line.strip()
                    if not line:
                        continue
                        
                    snap_match = snapshot_pattern.match(line)
                    uuid_match = uuid_pattern.match(line)

                    if snap_match:
                        name = snap_match.group(1).strip('"')
                        idx = line.split('=')[0].split('-')[-1] if '-' in line.split('=')[0] else "0"
                        if idx not in snapshot_map: snapshot_map[idx] = {}
                        snapshot_map[idx]["name"] = name
                    elif uuid_match:
                        uuid = uuid_match.group(1).strip('"')
                        idx = line.split('=')[0].split('-')[-1] if '-' in line.split('=')[0] else "0"
                        if idx not in snapshot_map: snapshot_map[idx] = {}
                        snapshot_map[idx]["uuid"] = uuid

                for idx, data in sorted(snapshot_map.items()):
                    if "name" in data and "uuid" in data:
                        self._logger.debug(f"Found snapshot: '{data['name']}' ({data['uuid']})")
                        snapshots.append(SnapshotInfo(
                            name=data["name"],
                            uuid=data["uuid"],
                            creation_time=datetime.now(),
                        ))

                return snapshots
            except VBoxCommandError as e:
                is_transient = "E_ACCESSDENIED" in e.stderr or "not ready" in e.stderr.lower()
                if is_transient and attempt < max_retries - 1:
                    time.sleep(retry_delay)
                    continue
                raise
        return []

    def restore_snapshot(
        self,
        vm_name: str,
        snapshot_name: str,
        force: bool = True,
    ) -> None:
        """Restore a VM to a specific snapshot.

        Args:
            vm_name: Name of the VM
            snapshot_name: Name of the snapshot to restore
            force: Ignored in VB 7.x (kept for API compatibility)
        """
        # VirtualBox 7.x expects exactly: snapshot <vm> restore <name>
        # We ensure VM is stopped at a higher level to avoid needing force
        args = ["snapshot", vm_name, "restore", snapshot_name]

        self._execute_command(args, timeout=120.0)
        self._logger.info(f"Restored VM {vm_name} to snapshot: {snapshot_name}")

    def create_snapshot(
        self,
        vm_name: str,
        snapshot_name: str,
        description: Optional[str] = None,
    ) -> None:
        """Create a new snapshot of a VM.

        Args:
            vm_name: Name of the VM
            snapshot_name: Name for the new snapshot
            description: Optional description for the snapshot
        """
        args = ["snapshot", vm_name, "take", snapshot_name]
        if description:
            args.extend(["--description", description])

        self._execute_command(args, timeout=60.0)
        self._logger.info(f"Created snapshot: {snapshot_name} for VM: {vm_name}")

    def delete_snapshot(self, vm_name: str, snapshot_name: str) -> None:
        """Delete a snapshot from a VM."""
        args = ["snapshot", vm_name, "delete", snapshot_name]
        self._execute_command(args, timeout=60.0)
        self._logger.info(f"Deleted snapshot: {snapshot_name} from VM: {vm_name}")

    def guest_control_exec(
        self,
        vm_name: str,
        executable_path: str,
        args: Optional[list[str]] = None,
        timeout: int = 30,
        cwd: Optional[str] = None,
        environment: Optional[dict[str, str]] = None,
    ) -> tuple[int, str, str]:
        """Execute a command inside the guest VM.

        Args:
            vm_name: Name of the VM
            executable_path: Path to executable inside the guest
            args: Arguments to pass to the executable
            timeout: Timeout for command execution in seconds

        Returns:
            Tuple of (exit_code, stdout, stderr)
        """
        cmd = [
            "guestcontrol", vm_name, "run",
            "--username", self._guest_username,
            "--password", self._guest_password,
            "--exe", executable_path,
            "--wait-stdout",
            "--wait-stderr",
            f"--timeout={int(timeout * 1000)}",
        ]
        if cwd:
            cmd.append(f"--cwd={cwd}")
        for name, value in (environment or {}).items():
            cmd.append(f"--putenv={name}={value}")
        if args:
            cmd.append("--")
            cmd.extend(args)

        result = self._execute_command(cmd, timeout=float(timeout + 10))

        return (result.returncode, result.stdout, result.stderr)

    def guest_control_start(
        self,
        vm_name: str,
        executable_path: str,
        args: Optional[list[str]] = None,
        timeout: int = 30,
        cwd: Optional[str] = None,
        environment: Optional[dict[str, str]] = None,
    ) -> None:
        """Start a command inside the guest without waiting for process completion."""
        cmd = [
            "guestcontrol", vm_name, "start",
            "--username", self._guest_username,
            "--password", self._guest_password,
            "--exe", executable_path,
            f"--timeout={int(timeout * 1000)}",
        ]
        if cwd:
            cmd.append(f"--cwd={cwd}")
        for name, value in (environment or {}).items():
            cmd.append(f"--putenv={name}={value}")
        if args:
            cmd.append("--")
            cmd.extend(args)

        self._execute_command(cmd, timeout=float(timeout + 10))
        self._logger.info("Started guest process: %s", executable_path)

    def file_copy_to_guest(
        self,
        vm_name: str,
        host_source: str,
        guest_destination: str,
    ) -> None:
        """Copy a file from host to guest.

        Args:
            vm_name: Name of the VM
            host_source: Path to file on host
            guest_destination: Destination path in guest
        """
        args = [
            "guestcontrol", vm_name, "copyto",
            "--username", self._guest_username, "--password", self._guest_password,
            host_source,
            guest_destination,
        ]

        self._execute_command(args, timeout=60.0)
        self._logger.info(f"Copied {host_source} to {guest_destination} in VM: {vm_name}")

    def file_copy_from_guest(
        self,
        vm_name: str,
        guest_source: str,
        host_destination: str,
    ) -> None:
        """Copy a file from guest to host.

        Args:
            vm_name: Name of the VM
            guest_source: Path to file in guest
            host_destination: Destination path on host
        """
        args = [
            "guestcontrol", vm_name, "copyfrom",
            "--username", self._guest_username, "--password", self._guest_password,
            guest_source,
            host_destination,
        ]

        self._execute_command(args, timeout=60.0)
        self._logger.info(f"Copied {guest_source} to {host_destination} from VM: {vm_name}")

    def guest_directory_exists(self, vm_name: str, directory: str) -> bool:
        """Check if a directory exists inside the guest VM."""
        try:
            result = self._execute_command(
                [
                    "guestcontrol", vm_name, "stat",
                    "--username", self._guest_username, "--password", self._guest_password,
                    directory,
                ],
                timeout=10.0,
            )
            return result.returncode == 0
        except VBoxCommandError:
            return False

    def guest_file_exists(self, vm_name: str, file_path: str) -> bool:
        """Check if a file exists inside the guest VM."""
        try:
            result = self._execute_command(
                [
                    "guestcontrol", vm_name, "stat",
                    "--username", self._guest_username, "--password", self._guest_password,
                    file_path,
                ],
                timeout=10.0,
            )
            return result.returncode == 0
        except VBoxCommandError:
            return False

    def guest_remove_file(self, vm_name: str, file_path: str, force: bool = True) -> None:
        """Remove a file inside the guest VM."""
        guest_path = file_path.replace("/", "\\")
        args = [
            "guestcontrol", vm_name, "rm",
            "--username", self._guest_username,
            "--password", self._guest_password,
        ]
        if force:
            args.append("--force")
        args.append(guest_path)

        try:
            self._execute_command(args, timeout=20.0)
        except VBoxCommandError:
            exit_code, _, stderr = self.guest_control_exec(
                vm_name,
                r"C:\Windows\System32\cmd.exe",
                ["/c", "del", "/F", "/Q", guest_path],
                timeout=20,
            )
            if exit_code != 0:
                raise VBoxCommandError(f"delete guest file {guest_path}", exit_code, stderr)
        self._logger.info("Removed guest file: %s", guest_path)

    def ensure_guest_directory(self, vm_name: str, directory: str) -> None:
        """Create a directory inside the guest if it is missing."""
        if self.guest_directory_exists(vm_name, directory):
            return

        args = [
            "guestcontrol", vm_name, "mkdir",
            "--username", self._guest_username,
            "--password", self._guest_password,
            "--parents",
            directory,
        ]
        self._execute_command(args, timeout=20.0)
        self._logger.info("Ensured guest directory exists: %s", directory)

    @staticmethod
    def _split_guest_path(path: str) -> tuple[str, str]:
        """Split a Windows-style guest path into directory and file name."""
        normalized = path.replace("\\", "/")
        if "/" not in normalized:
            return ".", normalized
        directory, name = normalized.rsplit("/", 1)
        return directory, name

    @staticmethod
    def _join_guest_path(directory: str, name: str) -> str:
        """Join guest path components without depending on host path rules."""
        cleaned = directory.rstrip("/\\")
        return f"{cleaned}/{name}"

    def wait_for_guest_additions(self, vm_name: str, timeout: int = 180) -> bool:
        """Wait for Guest Additions to become responsive."""
        import time
        start_time = time.time()
        last_error = None
        self._logger.info(f"Waiting for guest additions on VM: {vm_name} (timeout {timeout}s)")

        while time.time() - start_time < timeout:
            # 1. Low-level check: Is the property even there?
            # This is the fastest and least invasive check.
            try:
                result = self._execute_command(["guestproperty", "get", vm_name, "/VirtualBox/GuestAdd/Version"])
                if "Value:" in result.stdout:
                    version_info = result.stdout.strip()
                    self._logger.debug(f"Guest Additions property detected: {version_info}")
                    
                    # 2. Functional check: Try a quick, harmless guest command execution
                    # This verifies that the Guest Control session service is actually listening.
                    try:
                        self._logger.debug("Attempting functional guest command check...")
                        exit_code, _, stderr = self.guest_control_exec(
                            vm_name,
                            r"C:\Windows\System32\cmd.exe",
                            ["/c", "echo ready"],
                            timeout=5,
                        )
                        if exit_code == 0:
                            self._logger.info("Guest command execution verified.")
                            # Stabilization delay: allow the session manager to "settle"
                            time.sleep(2)
                            return True
                        
                        self._logger.debug(f"Guest command failed (code {exit_code}): {stderr}")
                    except Exception as exec_exc:
                        # VBOX_E_GSTCTL_GUEST_ERROR (0x80bb000f) or crashes are common during boot
                        self._logger.debug(f"Guest command execution not yet ready: {exec_exc}")
                        last_error = exec_exc
                else:
                    self._logger.debug("Guest Additions property not yet available.")
            except Exception as exc:
                self._logger.debug(f"Guest property check failed: {exc}")
                last_error = exc

            elapsed = int(time.time() - start_time)
            if elapsed and elapsed % 15 == 0:
                self._logger.info(f"Still waiting for Guest OS to stabilize... ({elapsed}s elapsed)")

            time.sleep(5)

        if last_error:
            self._logger.warning("Guest additions not ready after %ss; last error: %s", timeout, last_error)
        else:
            self._logger.warning(f"Guest additions not ready after {timeout}s")
        return False
