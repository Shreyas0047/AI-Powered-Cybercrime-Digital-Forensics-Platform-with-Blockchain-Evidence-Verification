"""Safety enforcement and execution validation module.

This module provides enterprise-grade safety enforcement for the sandbox platform,
ensuring all operations remain VM-contained and non-offensive.
"""

from __future__ import annotations

import logging
import os
import re
import shutil
import sys
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional


class SafetyLevel(Enum):
    """Safety enforcement levels."""
    DISABLED = "disabled"
    STANDARD = "standard"
    STRICT = "strict"


class ExecutionState(Enum):
    """Execution state enumeration."""
    UNKNOWN = "unknown"
    SAFE = "safe"
    UNSAFE = "unsafe"
    BLOCKED = "blocked"


@dataclass
class SafetyValidationResult:
    """Result of safety validation."""
    is_safe: bool
    state: ExecutionState
    timestamp: datetime = field(default_factory=datetime.now)
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    validation_details: dict = field(default_factory=dict)


@dataclass
class SafetyConfig:
    """Safety configuration."""
    vm_marker_path: str = "C:/sandbox/guest.marker"
    check_vm_marker: bool = True
    check_vbox_installed: bool = True
    check_host_execution: bool = True
    enforce_runtime_limit: bool = True
    max_runtime_seconds: int = 300
    enforce_localhost_only: bool = True
    allowed_network_targets: list[str] = field(default_factory=lambda: ["127.0.0.1", "localhost"])
    enforce_safe_directories: bool = True
    safe_directory_patterns: list[str] = field(default_factory=lambda: ["temp", "sandbox", "test", "simulator"])


class SafetyEnforcer:
    """Enterprise-grade safety enforcement system."""

    def __init__(
        self,
        config: Optional[SafetyConfig] = None,
        logger: Optional[logging.Logger] = None,
    ):
        self._config = config or SafetyConfig()
        self._logger = logger or logging.getLogger("forensics_sandbox_agent.safety")
        self._validation_history: list[SafetyValidationResult] = []

    def validate_execution_environment(self) -> SafetyValidationResult:
        """Validate the execution environment is safe for sandbox operations."""
        result = SafetyValidationResult(
            is_safe=False,
            state=ExecutionState.UNKNOWN,
        )

        self._logger.info("Validating execution environment...")

        if self._config.check_vm_marker:
            marker_check = self._check_vm_marker()
            result.validation_details["vm_marker"] = marker_check
            if not marker_check["present"]:
                result.errors.append("VM marker not found - execution outside sandbox")
                result.warnings.append("VM execution validation failed")

        if self._config.check_vbox_installed:
            vbox_check = self._check_virtualbox_installed()
            result.validation_details["virtualbox"] = vbox_check
            if not vbox_check["installed"]:
                result.warnings.append("VirtualBox not detected")

        if self._config.check_host_execution:
            host_check = self._check_not_host_execution()
            result.validation_details["host_execution"] = host_check
            if host_check["is_host"]:
                result.errors.append("Execution appears to be on host machine")

        result.is_safe = len(result.errors) == 0
        result.state = ExecutionState.SAFE if result.is_safe else ExecutionState.UNSAFE

        self._validation_history.append(result)

        self._logger.info(f"Environment validation: {result.state.value}")
        return result

    def _check_vm_marker(self) -> dict:
        """Check for VM marker file."""
        marker_path = self._config.vm_marker_path
        present = os.path.exists(marker_path)

        return {
            "path": marker_path,
            "present": present,
            "timestamp": datetime.now().isoformat(),
        }

    def _check_virtualbox_installed(self) -> dict:
        """Check if VirtualBox is installed."""
        vbox_paths = [
            "C:/Program Files/Oracle/VirtualBox/VBoxManage.exe",
            "C:/Program Files (x86)/Oracle/VirtualBox/VBoxManage.exe",
        ]

        path_hit = shutil.which("VBoxManage")
        installed = bool(path_hit) or any(os.path.exists(p) for p in vbox_paths)

        return {
            "installed": installed,
            "path": path_hit,
            "checked_paths": vbox_paths,
        }

    def _check_not_host_execution(self) -> dict:
        """Check if we're not executing on the host."""
        is_host = not os.path.exists(self._config.vm_marker_path)

        return {
            "is_host": is_host,
            "checked_marker": self._config.vm_marker_path,
        }

    def validate_simulator_execution(
        self,
        simulator_id: str,
        simulator_path: str,
    ) -> SafetyValidationResult:
        """Validate a simulator can be executed safely."""
        result = SafetyValidationResult(
            is_safe=False,
            state=ExecutionState.UNKNOWN,
        )

        env_result = self.validate_execution_environment()
        result.validation_details["environment"] = env_result.validation_details

        if not env_result.is_safe:
            result.state = ExecutionState.BLOCKED
            result.errors.append("Environment validation failed - execution blocked")
            return result

        path_validation = self._validate_simulator_path(simulator_path)
        result.validation_details["path_validation"] = path_validation
        if not path_validation["valid"]:
            result.errors.append(f"Invalid simulator path: {path_validation['reason']}")

        result.is_safe = len(result.errors) == 0
        result.state = ExecutionState.SAFE if result.is_safe else ExecutionState.BLOCKED

        return result

    def _validate_simulator_path(self, path: str) -> dict:
        """Validate simulator path is safe."""
        try:
            abs_path = Path(path).resolve()

            if not abs_path.exists():
                return {"valid": False, "reason": "File does not exist"}

            if not abs_path.suffix in [".exe", ".py"]:
                return {"valid": False, "reason": "Invalid file type"}

            return {"valid": True, "path": str(abs_path)}

        except Exception as e:
            return {"valid": False, "reason": f"Path validation error: {e}"}

    def validate_network_target(self, target: str, port: int) -> SafetyValidationResult:
        """Validate network target is allowed."""
        result = SafetyValidationResult(
            is_safe=False,
            state=ExecutionState.UNKNOWN,
        )

        if not self._config.enforce_localhost_only:
            result.is_safe = True
            result.state = ExecutionState.SAFE
            return result

        allowed = target in self._config.allowed_network_targets or target == "127.0.0.1"

        if not allowed:
            result.errors.append(f"Network target not allowed: {target}:{port}")
            result.state = ExecutionState.BLOCKED
        else:
            result.is_safe = True
            result.state = ExecutionState.SAFE

        return result

    def validate_file_operation(self, file_path: str, operation: str) -> SafetyValidationResult:
        """Validate file operation is safe."""
        result = SafetyValidationResult(
            is_safe=False,
            state=ExecutionState.UNKNOWN,
        )

        if not self._config.enforce_safe_directories:
            result.is_safe = True
            result.state = ExecutionState.SAFE
            return result

        normalized = file_path.replace("\\", "/").lower()
        normalized = re.sub(r"/+", "/", normalized).rstrip("/")
        parent_path = normalized.rsplit("/", 1)[0] if "/" in normalized else ""
        parent_parts = [part for part in parent_path.split("/") if part]

        protected_prefixes = (
            "c:/windows",
            "c:/program files",
            "c:/program files (x86)",
            "c:/programdata/microsoft",
            "c:/system volume information",
        )
        protected_parts = {
            "windows",
            "system32",
            "syswow64",
            "program files",
            "program files (x86)",
            "system volume information",
        }

        result.validation_details["normalized_path"] = normalized
        result.validation_details["operation"] = operation

        if normalized.startswith(protected_prefixes) or any(part in protected_parts for part in parent_parts):
            result.errors.append(f"File operation targets protected host path: {file_path}")
            result.state = ExecutionState.BLOCKED
            return result

        allowed = any(
            pattern.lower() in part
            for pattern in self._config.safe_directory_patterns
            for part in parent_parts
        )

        if not allowed:
            result.errors.append(f"File operation not in safe directory: {file_path}")
            result.state = ExecutionState.BLOCKED
        else:
            result.is_safe = True
            result.state = ExecutionState.SAFE

        return result

    def get_validation_summary(self) -> dict:
        """Get summary of all validation results."""
        total = len(self._validation_history)
        safe = sum(1 for r in self._validation_history if r.is_safe)
        blocked = sum(1 for r in self._validation_history if r.state == ExecutionState.BLOCKED)

        return {
            "total_validations": total,
            "safe_executions": safe,
            "blocked_executions": blocked,
            "success_rate": f"{(safe/total*100):.1f}%" if total > 0 else "N/A",
        }


class RuntimeEnforcer:
    """Runtime safety enforcement for active executions."""

    def __init__(
        self,
        config: SafetyConfig,
        logger: Optional[logging.Logger] = None,
    ):
        self._config = config
        self._logger = logger or logging.getLogger("forensics_sandbox_agent.runtime")
        self._active_execution = False
        self._execution_start_time: Optional[datetime] = None

    def start_execution(self, session_id: str) -> bool:
        """Start tracking an execution."""
        if self._active_execution:
            self._logger.warning("Execution already in progress")
            return False

        self._active_execution = True
        self._execution_start_time = datetime.now()
        self._logger.info(f"Started execution tracking: {session_id}")
        return True

    def check_runtime_limit(self) -> bool:
        """Check if runtime limit has been exceeded."""
        if not self._config.enforce_runtime_limit:
            return True

        if not self._active_execution or not self._execution_start_time:
            return True

        elapsed = (datetime.now() - self._execution_start_time).total_seconds()

        if elapsed > self._config.max_runtime_seconds:
            self._logger.warning(f"Runtime limit exceeded: {elapsed:.1f}s > {self._config.max_runtime_seconds}s")
            return False

        return True

    def end_execution(self) -> None:
        """End execution tracking."""
        if self._active_execution:
            elapsed = (datetime.now() - self._execution_start_time).total_seconds()
            self._logger.info(f"Execution ended after {elapsed:.1f}s")
            self._active_execution = False
            self._execution_start_time = None

    def is_execution_active(self) -> bool:
        """Check if execution is active."""
        return self._active_execution
