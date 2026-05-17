"""Domain entity representing one controlled sandbox execution session."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
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
    metadata: dict = field(default_factory=dict)

    def start_execution(self) -> None:
        """Mark session as started."""
        self.started_at = datetime.now()
        self.status = SessionStatus.EXECUTING
        self.execution_phase = ExecutionPhase.EXECUTING

    def complete(self, exit_code: int) -> None:
        """Mark session as completed."""
        self.finished_at = datetime.now()
        self.exit_code = exit_code
        self.status = SessionStatus.COMPLETED
        self.execution_phase = ExecutionPhase.COMPLETED
        if self.started_at:
            self.execution_duration_seconds = (self.finished_at - self.started_at).total_seconds()

    def fail(self, error: str) -> None:
        """Mark session as failed."""
        self.finished_at = datetime.now()
        self.error_message = error
        self.status = SessionStatus.FAILED

    def timeout(self) -> None:
        """Mark session as timed out."""
        self.finished_at = datetime.now()
        self.status = SessionStatus.TIMEOUT

    def mark_rollback(self) -> None:
        """Mark session as rolled back."""
        self.rollback_count += 1
        self.status = SessionStatus.ROLLED_BACK
        self.execution_phase = ExecutionPhase.ROLLING_BACK
