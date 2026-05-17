"""Snapshot Management System - handles VM snapshot operations.

Provides clean abstraction for snapshot validation, restoration, and rollback
workflows required for sandbox execution.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

from forensics_sandbox_agent.app.config.execution_models import SandboxExecutionConfig
from forensics_sandbox_agent.infrastructure.vm.vbox_communication import (
    VBoxManage,
    SnapshotInfo,
    VBoxCommandError,
    VBoxNotFoundError,
    VBoxTimeoutError,
)


class SnapshotNotFoundError(Exception):
    """Raised when a required snapshot does not exist."""
    pass


class SnapshotRestoreError(Exception):
    """Raised when snapshot restoration fails."""
    pass


class SnapshotVerificationError(Exception):
    """Raised when snapshot state verification fails."""
    pass


@dataclass
class SnapshotState:
    """Represents the state of a snapshot operation."""
    name: str
    exists: bool
    is_current: bool
    last_verified: Optional[datetime] = None


class SnapshotManager:
    """Manages VirtualBox snapshots for sandbox rollback."""

    def __init__(
        self,
        vbox: VBoxManage,
        config: SandboxExecutionConfig,
        logger: logging.Logger,
    ) -> None:
        self._vbox = vbox
        self._config = config
        self._logger = logger

    @staticmethod
    def _is_transient_lock_error(error: VBoxCommandError) -> bool:
        """Return True for VirtualBox lock/object-ready errors worth retrying."""
        stderr = error.stderr.lower()
        return (
            "e_accessdenied" in stderr
            or "not ready" in stderr
            or "lockmachine" in stderr
            or "lock" in stderr
        )

    @property
    def snapshot_name(self) -> str:
        """Get the configured snapshot name."""
        return self._config.snapshot_name

    def snapshot_exists(self, snapshot_name: Optional[str] = None) -> bool:
        """Check if a snapshot exists."""
        name = snapshot_name or self.snapshot_name

        try:
            snapshots = self._vbox.list_snapshots(self._config.vm_name)
            return any(s.name == name for s in snapshots)
        except VBoxCommandError as e:
            # If it's a lock contention, we log as debug/warning instead of error
            if self._is_transient_lock_error(e):
                self._logger.debug(f"Snapshot check suppressed due to lock contention: {e.stderr}")
                return self._snapshot_exists_in_vm_info(name)
            else:
                self._logger.error(f"Failed to list snapshots: {e}")
            return False
        except VBoxNotFoundError as e:
            self._logger.error("VirtualBox unavailable during snapshot check: %s", e)
            return False

    def get_snapshot_info(self, snapshot_name: Optional[str] = None, retry_count: int = 3) -> Optional[SnapshotInfo]:
        """Get information about a specific snapshot."""
        name = snapshot_name or self.snapshot_name

        for attempt in range(retry_count):
            try:
                snapshots = self._vbox.list_snapshots(self._config.vm_name)
                return next((s for s in snapshots if s.name == name), None)
            except VBoxCommandError as e:
                # If it's a lock contention, retry with delay
                if self._is_transient_lock_error(e):
                    if attempt < retry_count - 1:
                        import time
                        self._logger.debug(f"Lock contention, retrying in 2s (attempt {attempt + 1}/{retry_count})")
                        time.sleep(2)
                        continue
                # Log other errors as debug/warning instead of error
                if "not ready" in e.stderr.lower():
                    self._logger.debug(f"Snapshot info retrieval suppressed due to lock contention: {e.stderr}")
                else:
                    self._logger.error(f"Failed to get snapshot info: {e}")
                return None
            except VBoxNotFoundError as e:
                self._logger.error("VirtualBox unavailable during snapshot lookup: %s", e)
                return None
        return None

    def verify_clean_snapshot(self, retry_count: int = 3) -> bool:
        """Verify the clean baseline snapshot exists and is accessible."""
        self._logger.info(f"Verifying clean snapshot: {self.snapshot_name}")

        for attempt in range(retry_count):
            if self.snapshot_exists():
                snapshot_info = self.get_snapshot_info()
                if snapshot_info is not None:
                    self._logger.info(f"Clean snapshot verified: {snapshot_info.name} (UUID: {snapshot_info.uuid})")
                    return True
                self._logger.info("Clean snapshot verified from VM metadata: %s", self.snapshot_name)
                return True

            if attempt < retry_count - 1:
                import time
                self._logger.debug(f"Snapshot verification failed, retrying in 2s (attempt {attempt + 1}/{retry_count})")
                time.sleep(2)

        self._logger.error(f"Clean snapshot does not exist or not accessible: {self.snapshot_name}")
        return False

    def _snapshot_exists_in_vm_info(self, snapshot_name: str) -> bool:
        """Fallback snapshot check using showvminfo metadata."""
        try:
            info = self._vbox.get_machine_readable_info(self._config.vm_name)
        except Exception as exc:
            self._logger.debug("Snapshot metadata fallback failed: %s", exc)
            return False

        names = {
            value
            for key, value in info.items()
            if key.startswith("SnapshotName") or key == "CurrentSnapshotName"
        }
        return snapshot_name in names

    def restore_clean_snapshot(self) -> None:
        """Restore VM to the clean baseline snapshot."""
        self._logger.info(f"Restoring VM to clean snapshot: {self.snapshot_name}")

        if not self.verify_clean_snapshot():
            raise SnapshotNotFoundError(f"Clean snapshot not found: {self.snapshot_name}")

        try:
            # Ensure VM is powered off before restoring snapshot
            self._logger.info("Stopping VM before snapshot restoration")
            try:
                current_state = self._vbox.get_vm_state(self._config.vm_name).state.lower()
                if current_state in ("powered off", "poweroff"):
                    self._logger.info("VM already stopped, proceeding with snapshot restore")
                else:
                    self._vbox.stop_vm(self._config.vm_name, force=True)
            except VBoxCommandError as e:
                # VM might already be stopped - that's fine, continue with restore
                stderr = e.stderr.lower()
                if "not currently running" in stderr or "powered off" in stderr:
                    self._logger.info("VM already stopped, proceeding with snapshot restore")
                elif self._is_transient_lock_error(e):
                    import time
                    self._logger.debug("Transient lock while stopping VM; waiting for lock release")
                    time.sleep(3)
                    state = self._vbox.get_vm_state(self._config.vm_name).state.lower()
                    if state not in ("powered off", "poweroff"):
                        raise
                else:
                    raise

            # Allow VirtualBox to release the lock after stopping
            import time
            time.sleep(3)

            last_error = None
            for attempt in range(3):
                try:
                    self._vbox.restore_snapshot(
                        self._config.vm_name,
                        self.snapshot_name,
                        force=True,
                    )
                    last_error = None
                    break
                except VBoxCommandError as e:
                    last_error = e
                    if self._is_transient_lock_error(e) and attempt < 2:
                        self._logger.debug("Snapshot restore lock contention, retrying in 3s")
                        time.sleep(3)
                        continue
                    raise
            if last_error is not None:
                raise last_error
            self._logger.info(f"Successfully restored snapshot: {self.snapshot_name}")
        except (VBoxCommandError, VBoxNotFoundError, VBoxTimeoutError) as e:
            raise SnapshotRestoreError(f"Failed to restore snapshot: {e}")

    def create_checkpoint(
        self,
        checkpoint_name: str,
        description: Optional[str] = None,
    ) -> None:
        """Create a checkpoint snapshot before execution."""
        self._logger.info(f"Creating checkpoint: {checkpoint_name}")

        try:
            self._vbox.create_snapshot(
                self._config.vm_name,
                checkpoint_name,
                description or f"Checkpoint for sandbox execution - {datetime.now().isoformat()}",
            )
            self._logger.info(f"Checkpoint created: {checkpoint_name}")
        except (VBoxCommandError, VBoxNotFoundError, VBoxTimeoutError) as e:
            raise SnapshotRestoreError(f"Failed to create checkpoint: {e}")

    def delete_checkpoint(self, checkpoint_name: str) -> None:
        """Delete a checkpoint snapshot."""
        self._logger.info(f"Deleting checkpoint: {checkpoint_name}")

        try:
            self._vbox.delete_snapshot(self._config.vm_name, checkpoint_name)
            self._logger.info(f"Checkpoint deleted: {checkpoint_name}")
        except (VBoxCommandError, VBoxNotFoundError) as e:
            self._logger.warning(f"Failed to delete checkpoint (may not exist): {e}")

    def verify_restoration(self) -> bool:
        """Verify that snapshot restoration was successful."""
        self._logger.info("Verifying snapshot restoration")

        try:
            current_state = self._vbox.get_vm_state(self._config.vm_name)

            if current_state.state.lower() not in ("powered off", "poweroff", "running", "saved"):
                self._logger.error(f"Unexpected VM state after restoration: {current_state.state}")
                return False

            self._logger.info(f"VM state verified: {current_state.state}")
            return True

        except (VBoxCommandError, VBoxNotFoundError) as e:
            raise SnapshotVerificationError(f"Failed to verify restoration: {e}")

    def perform_rollback(self) -> None:
        """Execute full rollback workflow: restore clean snapshot."""
        self._logger.info("Executing snapshot rollback")

        try:
            self.restore_clean_snapshot()

            if not self.verify_restoration():
                raise SnapshotVerificationError("Rollback verification failed")

            self._logger.info("Rollback completed successfully")

        except (SnapshotNotFoundError, SnapshotRestoreError, SnapshotVerificationError) as e:
            self._logger.error(f"Rollback failed: {e}")
            raise
