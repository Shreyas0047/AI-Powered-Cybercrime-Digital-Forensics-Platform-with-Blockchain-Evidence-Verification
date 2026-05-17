"""Execution contracts for orchestration ports."""

from __future__ import annotations

from typing import Protocol, Optional

from forensics_sandbox_agent.domain.entities.simulator_descriptor import SimulatorDescriptor
from forensics_sandbox_agent.domain.entities.forensic_session import ForensicSession


class VmServicePort(Protocol):
    """Abstraction for VM operations used by the session orchestrator."""

    def validate_environment(self) -> None:
        """Validate VM environment is properly configured."""
        ...

    def get_vm_info(self) -> dict:
        """Get comprehensive VM information."""
        ...

    def start_vm(self) -> None:
        """Start the VM."""
        ...

    def stop_vm(self, force: bool = False) -> None:
        """Stop the VM."""
        ...


class ReportServicePort(Protocol):
    """Abstraction for report assembly and export."""

    def initialize_report_context(self) -> None:
        """Initialize report generation context."""
        ...


class SandboxExecutionPort(Protocol):
    """Abstraction for sandbox execution operations."""

    def execute_simulator(
        self,
        simulator: SimulatorDescriptor,
        auto_rollback: bool = True,
    ) -> ForensicSession:
        """Execute a simulator in the sandbox."""
        ...

    def get_current_session(self) -> Optional[ForensicSession]:
        """Get the current active session."""
        ...

    def get_vm_status(self) -> dict:
        """Get VM status information."""
        ...
