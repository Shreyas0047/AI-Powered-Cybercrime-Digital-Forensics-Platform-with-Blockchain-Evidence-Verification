"""Base simulator runtime contract."""

from __future__ import annotations

import os
import sys
import logging
import time
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from forensics_simulator_common.contracts.manifest import SimulatorManifest
from forensics_simulator_common.safety.guardrails import SafetyGuardrails, SafetyValidationError
from forensics_simulator_common.telemetry.events import SimulatorLogger


class BaseSimulatorRuntime(ABC):
    """Base class for simulator entrypoints with safety and telemetry."""

    def __init__(self, manifest: SimulatorManifest, session_id: str = "") -> None:
        self._manifest = manifest
        self._session_id = session_id
        self._logger: Optional[SimulatorLogger] = None
        self._safe_directory = SafetyGuardrails.get_safe_temp_directory()

        os.makedirs(self._safe_directory, exist_ok=True)

    def validate_and_run(self) -> int:
        """Validate safety and run the simulator."""
        try:
            SafetyGuardrails.validate_manifest(self._manifest)

            if not SafetyGuardrails.validate_execution_environment():
                logging.warning("Running outside VM - behavior may be restricted")

            self._logger = SimulatorLogger(
                simulator_id=self._manifest.simulator_id,
                log_file=os.path.join(self._safe_directory, f"{self._manifest.simulator_id}.log"),
                session_id=self._session_id
            )

            self.run()
            return 0

        except SafetyValidationError as e:
            logging.error(f"Safety validation failed: {e}")
            return 1
        except Exception as e:
            logging.error(f"Simulator error: {e}")
            return 1

    @abstractmethod
    def run(self) -> None:
        """Execute the simulator behavior. Must be implemented by subclasses."""
        pass

    def get_safe_directory(self) -> str:
        """Get the safe temporary directory."""
        return self._safe_directory

    def emit_process_spawn(self, command: str) -> None:
        """Emit a process spawn event."""
        if self._logger:
            self._logger.emit_process_start(os.getpid(), command)

    def emit_file_operation(self, operation: str, path: str, technique: str = "") -> None:
        """Emit a file operation event with safety validation."""
        if not SafetyGuardrails.validate_directory_access(path, self._manifest.allowed_directories):
            logging.warning(f"Path {path} not in allowed directories, skipping telemetry")
            return
        if self._logger:
            self._logger.emit_file_operation(operation, path, technique)

    def emit_registry_operation(self, key_path: str, modify: bool = False, value: str = "synthetic", technique: str = "") -> None:
        """Emit a registry operation event."""
        if self._logger:
            self._logger.emit_registry_operation(key_path, modify, value, technique)

    def emit_network_activity(self, host: str, port: int, protocol: str = "TCP", technique: str = "") -> None:
        """Emit a network activity event."""
        if self._logger:
            self._logger.emit_network_activity(host, port, protocol, technique)

    def emit_encryption_sim(self, file_path: str, method: str = "extension_rename", technique: str = "T1486") -> None:
        """Emit encryption simulation event."""
        if self._logger:
            self._logger.emit_encryption_sim(file_path, method, technique)

    def emit_suspicious_activity(self, description: str, details: dict = None) -> None:
        """Emit suspicious behavior event."""
        if self._logger:
            self._logger.emit_suspicious_behavior(description, details or {})

    def safe_sleep(self, seconds: float) -> None:
        """Sleep with early exit check."""
        time.sleep(seconds)
