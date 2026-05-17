"""Extended configuration models for sandbox execution."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(slots=True)
class SandboxExecutionConfig:
    vm_name: str = "ForensicsSandbox"
    snapshot_name: str = "CleanBaseline"
    execution_timeout_seconds: int = 300
    simulator_transfer_path: str = "C:/sandbox/simulators"
    guest_username: str = "guestuser"
    guest_password: str = "guest"
    guest_additions_timeout_seconds: int = 300
    start_headless: bool = True
    transfer_runtime_dlls: bool = False
    enable_auto_rollback: bool = True
    max_concurrent_sessions: int = 1
    vm_startup_timeout_seconds: int = 60
    vm_shutdown_timeout_seconds: int = 30
    snapshot_restore_timeout_seconds: int = 120


@dataclass(slots=True)
class RollbackPolicyConfig:
    enabled: bool = True
    always_rollback_on_completion: bool = True
    rollback_on_error: bool = True
    max_rollback_attempts: int = 3
    preserve_logs_before_rollback: bool = True


@dataclass(slots=True)
class IsolationConfig:
    require_vm_marker: bool = True
    vm_marker_file: str = "C:/sandbox/guest.marker"
    disable_network: bool = True
    disable_shared_folders: bool = False
    enforce_single_vm: bool = True


@dataclass(slots=True)
class ExecutionPolicyConfig:
    sandbox_execution: SandboxExecutionConfig = field(default_factory=SandboxExecutionConfig)
    rollback_policy: RollbackPolicyConfig = field(default_factory=RollbackPolicyConfig)
    isolation: IsolationConfig = field(default_factory=IsolationConfig)
