"""Domain entity representing one controlled sandbox execution session."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from threading import Lock
from typing import Optional


class SessionStatus(Enum):
    """Status of a forensic session."""
    PENDING = "pending"
    PREPARING = "preparing"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"
    TIMEOUT = "timeout"


class ExecutionPhase(Enum):
    """Phase of the execution workflow."""
    INIT = "init"
    VM_READY = "vm_ready"
    SNAPSHOT_RESTORED = "snapshot_restored"
    TRANSFERRING_SIMULATOR = "transferring_simulator"
    EXECUTING = "executing"
    COMPLETED = "completed"
    ROLLING_BACK = "rolling_back"


_TERMINAL_STATUSES = {SessionStatus.COMPLETED, SessionStatus.FAILED, SessionStatus.TIMEOUT}


@dataclass(slots=True)
class ForensicSession:
    """Captures identity and lifecycle metadata for a forensic run."""

    session_id: str
    simulator_id: str
    status: SessionStatus
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    execution_phase: ExecutionPhase = ExecutionPhase.INIT
    vm_name: Optional[str] = None
    snapshot_name: Optional[str] = None
    checkpoint_name: Optional[str] = None
    exit_code: Optional[int] = None
    error_message: Optional[str] = None
    execution_duration_seconds: Optional[float] = None
    rollback_count: int = 0
    events: list[dict] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    _lock: Lock = field(default_factory=Lock, repr=False, compare=False)

    def _transition(self, new_status: SessionStatus) -> bool:
        """Transition state; returns False if already terminal."""
        with self._lock:
            if self.status in _TERMINAL_STATUSES:
                return False
            self.status = new_status
            return True

    def start_execution(self) -> None:
        """Mark session as started."""
        with self._lock:
            self.started_at = datetime.now()
            self.status = SessionStatus.EXECUTING
            self.execution_phase = ExecutionPhase.EXECUTING

    def complete(self, exit_code: int) -> None:
        """Mark session as completed."""
        with self._lock:
            self.finished_at = datetime.now()
            self.exit_code = exit_code
            self.status = SessionStatus.COMPLETED
            self.execution_phase = ExecutionPhase.COMPLETED
            if self.started_at:
                self.execution_duration_seconds = (self.finished_at - self.started_at).total_seconds()

    def fail(self, error: str) -> None:
        """Mark session as failed."""
        with self._lock:
            self.finished_at = datetime.now()
            self.error_message = error
            self.status = SessionStatus.FAILED

    def mark_timeout(self) -> None:
        """Mark session as timed out."""
        with self._lock:
            self.finished_at = datetime.now()
            self.status = SessionStatus.TIMEOUT

    def mark_rollback(self) -> None:
        """Mark session as rolled back."""
        with self._lock:
            self.rollback_count += 1
            self.status = SessionStatus.ROLLED_BACK
            self.execution_phase = ExecutionPhase.ROLLING_BACK

    def to_dict(self) -> dict:
        """Serialize session to dictionary for API responses."""
        return {
            "session_id": self.session_id,
            "simulator_id": self.simulator_id,
            "status": self.status.value,
            "phase": self.execution_phase.value,
            "exit_code": self.exit_code,
            "error_message": self.error_message,
            "execution_duration_seconds": self.execution_duration_seconds,
            "vm_name": self.vm_name,
            "snapshot_name": self.snapshot_name,
            "checkpoint_name": self.checkpoint_name,
            "rollback_count": self.rollback_count,
            "events": self.events,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "created_at": self.created_at.isoformat(),
        }
