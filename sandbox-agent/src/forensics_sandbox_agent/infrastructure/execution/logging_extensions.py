"""Logging extensions for sandbox execution operations.

This module provides specialized logging for VM lifecycle, snapshot operations,
sandbox sessions, and execution workflows.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from forensics_sandbox_agent.domain.entities.forensic_session import ForensicSession
from forensics_sandbox_agent.domain.entities.simulator_descriptor import SimulatorDescriptor
from forensics_sandbox_agent.infrastructure.execution.sandbox_execution_manager import ExecutionStatus


class SandboxExecutionLogger:
    """Specialized logger for sandbox execution operations."""

    def __init__(self, logger: logging.Logger) -> None:
        self._logger = logger
        self._vm_logger = logging.getLogger("forensics_sandbox_agent.vm")
        self._sandbox_logger = logging.getLogger("forensics_sandbox_agent.sandbox")

    def log_vm_lifecycle(self, operation: str, vm_name: str, status: str, details: Optional[str] = None) -> None:
        """Log VM lifecycle operations."""
        msg = f"VM_LIFECYCLE | operation={operation} | vm={vm_name} | status={status}"
        if details:
            msg += f" | details={details}"
        self._vm_logger.info(msg)

    def log_snapshot_operation(self, operation: str, snapshot_name: str, vm_name: str, success: bool, error: Optional[str] = None) -> None:
        """Log snapshot operations."""
        status = "success" if success else "failed"
        msg = f"SNAPSHOT | operation={operation} | snapshot={snapshot_name} | vm={vm_name} | status={status}"
        if error:
            msg += f" | error={error}"
        self._vm_logger.info(msg)

    def log_sandbox_session(self, session: ForensicSession, event: str, details: Optional[str] = None) -> None:
        """Log sandbox session events."""
        msg = f"SANDBOX_SESSION | session_id={session.session_id} | simulator={session.simulator_id} | event={event} | status={session.status.value}"
        if details:
            msg += f" | details={details}"
        self._sandbox_logger.info(msg)

    def log_execution_start(self, simulator: SimulatorDescriptor, session_id: str) -> None:
        """Log execution start."""
        self._sandbox_logger.info(
            f"EXECUTION_START | session_id={session_id} | simulator={simulator.id} | "
            f"executable={simulator.executable_path}"
        )

    def log_execution_complete(self, session_id: str, simulator_id: str, exit_code: int, duration_seconds: float) -> None:
        """Log execution completion."""
        self._sandbox_logger.info(
            f"EXECUTION_COMPLETE | session_id={session_id} | simulator={simulator_id} | "
            f"exit_code={exit_code} | duration={duration_seconds:.2f}s"
        )

    def log_execution_error(self, session_id: str, simulator_id: str, error: str) -> None:
        """Log execution errors."""
        self._sandbox_logger.error(
            f"EXECUTION_ERROR | session_id={session_id} | simulator={simulator_id} | error={error}"
        )

    def log_timeout(self, session_id: str, simulator_id: str, timeout_seconds: int) -> None:
        """Log execution timeout."""
        self._sandbox_logger.warning(
            f"EXECUTION_TIMEOUT | session_id={session_id} | simulator={simulator_id} | "
            f"timeout={timeout_seconds}s"
        )

    def log_rollback(self, session_id: str, success: bool, attempts: int, error: Optional[str] = None) -> None:
        """Log rollback operations."""
        status = "success" if success else "failed"
        msg = f"ROLLBACK | session_id={session_id} | status={status} | attempts={attempts}"
        if error:
            msg += f" | error={error}"
        self._sandbox_logger.info(msg)

    def log_isolation_validation(self, vm_name: str, passed: bool, violations: list[str]) -> None:
        """Log isolation validation results."""
        status = "passed" if passed else "failed"
        msg = f"ISOLATION_VALIDATION | vm={vm_name} | status={status}"
        if violations:
            msg += f" | violations={'; '.join(violations)}"
        self._vm_logger.info(msg)

    def log_transfer_operation(self, operation: str, source: str, destination: str, success: bool) -> None:
        """Log simulator transfer operations."""
        status = "success" if success else "failed"
        self._sandbox_logger.info(
            f"TRANSFER | operation={operation} | source={source} | destination={destination} | status={status}"
        )


def create_execution_logger(component_name: str) -> SandboxExecutionLogger:
    """Create a sandbox execution logger for a component."""
    base_logger = logging.getLogger(f"forensics_sandbox_agent.{component_name}")
    return SandboxExecutionLogger(base_logger)