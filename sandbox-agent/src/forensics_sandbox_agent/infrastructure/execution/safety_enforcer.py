"""Safety enforcer for sandbox execution validation."""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class ExecutionState(Enum):
    SAFE = "safe"
    UNSAFE = "unsafe"
    BLOCKED = "blocked"


@dataclass
class ValidationResult:
    is_safe: bool
    state: ExecutionState
    errors: List[str] = field(default_factory=list)


@dataclass
class SafetyConfig:
    vm_marker_path: str = "C:/sandbox/guest.marker"
    enforce_runtime_limit: bool = True
    max_runtime_seconds: int = 300
    allowed_directories: Optional[List[str]] = None
    blocked_directories: Optional[List[str]] = None

    def __post_init__(self):
        if self.allowed_directories is None:
            self.allowed_directories = ["C:/sandbox", "C:/Windows/Temp", "C:/temp"]
        if self.blocked_directories is None:
            self.blocked_directories = ["C:/Windows/System32", "C:/Windows/SysWOW64"]


class SafetyEnforcer:
    def __init__(self, config: Optional[SafetyConfig] = None):
        self._config = config or SafetyConfig()
        self._validation_history: List[Dict[str, Any]] = []

    def validate_execution_environment(self) -> ValidationResult:
        import os
        errors = []
        if not os.path.exists(self._config.vm_marker_path):
            errors.append(f"VM marker not found: {self._config.vm_marker_path}")
        self._validation_history.append({"type": "environment_check", "timestamp": datetime.now()})
        return ValidationResult(
            is_safe=len(errors) == 0,
            state=ExecutionState.UNSAFE if errors else ExecutionState.SAFE,
            errors=errors,
        )

    def validate_simulator_execution(self, simulator_id: str, simulator_path: str) -> ValidationResult:
        import os
        errors = []
        if not os.path.exists(self._config.vm_marker_path):
            errors.append("VM environment not validated")
        if not os.path.exists(simulator_path):
            errors.append(f"Simulator not found: {simulator_path}")
        self._validation_history.append({"type": "simulator_validation", "simulator_id": simulator_id})
        if errors:
            return ValidationResult(is_safe=False, state=ExecutionState.BLOCKED, errors=errors)
        return ValidationResult(is_safe=True, state=ExecutionState.SAFE)

    def validate_network_target(self, target: str, port: int) -> ValidationResult:
        import ipaddress
        try:
            ip = ipaddress.ip_address(target)
            if ip.is_loopback:
                return ValidationResult(is_safe=True, state=ExecutionState.SAFE)
            return ValidationResult(is_safe=False, state=ExecutionState.BLOCKED, errors=[f"External target blocked: {target}:{port}"])
        except ValueError:
            return ValidationResult(is_safe=False, state=ExecutionState.BLOCKED, errors=[f"Invalid target: {target}"])

    def validate_file_operation(self, file_path: str, operation: str) -> ValidationResult:
        import os
        path_lower = file_path.lower()
        for blocked in self._config.blocked_directories:
            if blocked.lower() in path_lower:
                return ValidationResult(is_safe=False, state=ExecutionState.BLOCKED, errors=[f"Blocked directory: {blocked}"])
        for allowed in self._config.allowed_directories:
            if allowed.lower() in path_lower:
                return ValidationResult(is_safe=True, state=ExecutionState.SAFE)
        return ValidationResult(is_safe=True, state=ExecutionState.SAFE)

    def get_validation_summary(self) -> Dict[str, Any]:
        return {
            "total_validations": len(self._validation_history),
            "config": {
                "vm_marker_path": self._config.vm_marker_path,
                "enforce_runtime_limit": self._config.enforce_runtime_limit,
                "max_runtime_seconds": self._config.max_runtime_seconds,
            },
        }


class RuntimeEnforcer:
    def __init__(self, config: SafetyConfig, logger: Any = None):
        self._config = config
        self._start_time: Optional[datetime] = None
        self._active_session_id: Optional[str] = None
        self._logger = logger

    def start_execution(self, session_id: str) -> bool:
        if self._active_session_id is not None:
            return False
        self._start_time = datetime.now()
        self._active_session_id = session_id
        return True

    def end_execution(self) -> None:
        self._start_time = None
        self._active_session_id = None

    def is_execution_active(self) -> bool:
        return self._active_session_id is not None

    def check_runtime_limit(self) -> bool:
        if self._start_time is None:
            return True
        elapsed = (datetime.now() - self._start_time).total_seconds()
        return elapsed <= self._config.max_runtime_seconds
