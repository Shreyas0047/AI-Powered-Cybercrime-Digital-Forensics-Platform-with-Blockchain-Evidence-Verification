"""VM Controller Service - high-level VM lifecycle management.

This service provides a professional abstraction for VirtualBox VM operations,
managing VM lifecycle, state verification, and readiness checks.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from forensics_sandbox_agent.app.config.execution_models import (
    SandboxExecutionConfig,
    IsolationConfig,
)
from forensics_sandbox_agent.infrastructure.vm.vbox_communication import (
    VBoxManage,
    VmState,
    VBoxCommandError,
    VBoxNotFoundError,
    VBoxTimeoutError,
)


class VmStatus(Enum):
    """VM operational status."""
    UNKNOWN = "unknown"
    POWERED_OFF = "powered_off"
    RUNNING = "running"
    PAUSED = "paused"
    SAVED = "saved"
    STARTING = "starting"
    STOPPING = "stopping"
    ERROR = "error"


class VmNotFoundError(Exception):
    """Raised when the configured VM cannot be found."""
    pass


class VmNotReadyError(Exception):
    """Raised when VM is not in a state ready for execution."""
    pass


class VmOperationError(Exception):
    """Raised when a VM operation fails."""
    pass


@dataclass
class VmReadinessResult:
    """Result of VM readiness verification."""
    is_ready: bool
    vm_state: Optional[VmStatus] = None
    marker_present: Optional[bool] = None
    errors: list[str] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []


class VmController:
    """High-level VM lifecycle controller."""

    def __init__(
        self,
        vbox: VBoxManage,
        config: SandboxExecutionConfig,
        isolation: IsolationConfig,
        logger: logging.Logger,
    ) -> None:
        self._vbox = vbox
        self._config = config
        self._isolation = isolation
        self._logger = logger

    @property
    def vm_name(self) -> str:
        """Get the configured VM name."""
        return self._config.vm_name

    def _parse_vm_state(self, state: str) -> VmStatus:
        """Parse VBoxManage state string to VmStatus enum."""
        state_lower = state.lower().replace("_", " ").strip()
        self._logger.debug(f"Parsing VM state: '{state}' -> '{state_lower}'")

        if state_lower in ("running", "restoring"):
            return VmStatus.RUNNING
        elif state_lower in ("starting", "teleporting", "live migrating"):
            return VmStatus.STARTING
        elif state_lower in ("powered off", "poweroff", "aborted", "off"):
            return VmStatus.POWERED_OFF
        elif state_lower in ("paused",):
            return VmStatus.PAUSED
        elif state_lower in ("saved",):
            return VmStatus.SAVED
        elif state_lower in ("stopping", "saving"):
            return VmStatus.STOPPING
        else:
            self._logger.warning(f"Unknown VM state from VBoxManage: {state}")
            return VmStatus.UNKNOWN

    def vm_exists(self) -> bool:
        """Check if the configured VM exists."""
        try:
            vms = self._vbox.list_vms()
            return any(vm.name == self._config.vm_name for vm in vms)
        except (VBoxCommandError, VBoxNotFoundError) as e:
            self._logger.error(f"Failed to list VMs: {e}")
            return False

    def get_vm_state(self) -> VmStatus:
        """Get current VM status."""
        try:
            vbox_state = self._vbox.get_vm_state(self._config.vm_name)
            return self._parse_vm_state(vbox_state.state)
        except (VBoxCommandError, VBoxNotFoundError) as e:
            self._logger.error(f"Failed to get VM state: {e}")
            return VmStatus.ERROR

    def verify_vm_ready(self) -> VmReadinessResult:
        """Verify VM is ready for sandbox execution."""
        errors = []

        if not self.vm_exists():
            errors.append(f"VM '{self._config.vm_name}' does not exist")
            return VmReadinessResult(is_ready=False, errors=errors)

        current_state = self.get_vm_state()

        if current_state != VmStatus.POWERED_OFF and current_state != VmStatus.RUNNING:
            errors.append(f"VM is in unexpected state: {current_state.value}")

        marker_present = None
        if self._isolation.require_vm_marker and current_state == VmStatus.RUNNING:
            try:
                marker_present = self._vbox.guest_file_exists(
                    self._config.vm_name,
                    self._isolation.vm_marker_file,
                )
                if not marker_present:
                    errors.append(f"VM marker file not found: {self._isolation.vm_marker_file}")
            except (VBoxCommandError, VBoxNotFoundError) as e:
                errors.append(f"Failed to check VM marker: {e}")
        elif self._isolation.require_vm_marker:
            self._logger.debug("Skipping guest marker check while VM is not running")

        return VmReadinessResult(
            is_ready=len(errors) == 0,
            vm_state=current_state,
            marker_present=marker_present,
            errors=errors,
        )

    def start_vm(self, headless: bool = True) -> None:
        """Start the VM.

        Args:
            headless: If True, start in headless mode. Defaults to True for sandbox runtime.
        """
        self._logger.info(f"Starting VM: {self._config.vm_name} (headless={headless})")

        try:
            current_state = self.get_vm_state()

            if current_state == VmStatus.RUNNING:
                self._logger.info("VM is already running")
                return

            if current_state == VmStatus.PAUSED:
                self._vbox.resume_vm(self._config.vm_name)
                if not self._wait_for_state(VmStatus.RUNNING, timeout=self._config.vm_startup_timeout_seconds):
                    raise VmOperationError("Timed out waiting for VM to resume")
                return

            # Default to GUI mode (background=False) so user sees the VM
            self._vbox.start_vm(self._config.vm_name, background=headless)
            
            if not self._wait_for_state(VmStatus.RUNNING, timeout=self._config.vm_startup_timeout_seconds):
                raise VmOperationError("Timed out waiting for VM to reach RUNNING state")
                
            self._logger.info(f"VM started successfully: {self._config.vm_name}")

        except (VBoxCommandError, VBoxNotFoundError, VBoxTimeoutError, VmOperationError) as e:
            raise VmOperationError(f"Failed to start VM: {e}")

    def stop_vm(self, force: bool = False) -> None:
        """Stop the VM."""
        self._logger.info(f"Stopping VM: {self._config.vm_name}")

        try:
            current_state = self.get_vm_state()

            if current_state == VmStatus.POWERED_OFF:
                self._logger.info("VM is already powered off")
                return

            self._vbox.stop_vm(self._config.vm_name, force=force)

            if not force:
                self._wait_for_state(VmStatus.POWERED_OFF, timeout=self._config.vm_shutdown_timeout_seconds)
            else:
                time.sleep(2)

            self._logger.info(f"VM stopped successfully: {self._config.vm_name}")

        except (VBoxCommandError, VBoxNotFoundError, VBoxTimeoutError) as e:
            raise VmOperationError(f"Failed to stop VM: {e}")

    def ensure_running(self, headless: bool = True) -> None:
        """Ensure VM is running, starting if necessary."""
        current_state = self.get_vm_state()

        if current_state == VmStatus.POWERED_OFF:
            self.start_vm(headless=headless)
        elif current_state != VmStatus.RUNNING:
            raise VmNotReadyError(f"VM is not in a runnable state: {current_state.value}")

    def ensure_powered_off(self) -> None:
        """Ensure VM is powered off, stopping if necessary."""
        current_state = self.get_vm_state()

        if current_state == VmStatus.RUNNING:
            self.stop_vm(force=True)
        elif current_state == VmStatus.PAUSED:
            self.stop_vm(force=True)

    def _wait_for_state(
        self,
        target_state: VmStatus,
        timeout: int,
        poll_interval: float = 2.0,
    ) -> bool:
        """Wait for VM to reach a specific state."""
        start_time = time.time()

        while time.time() - start_time < timeout:
            current_state = self.get_vm_state()
            if current_state == target_state:
                return True
            time.sleep(poll_interval)

        return False

    def is_running(self) -> bool:
        """Check if VM is currently running."""
        return self.get_vm_state() == VmStatus.RUNNING

    def is_available(self) -> bool:
        """Check if VM is available for execution."""
        try:
            return self.verify_vm_ready().is_ready
        except Exception:
            return False
