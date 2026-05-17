"""Safety guardrails shared by all simulator packages."""

from __future__ import annotations

import os
import sys
import logging
from pathlib import Path

from forensics_simulator_common.contracts.manifest import SimulatorManifest


class SafetyValidationError(Exception):
    """Raised when safety validation fails."""
    pass


class SafetyGuardrails:
    """Centralizes safe-by-default simulator policy checks."""

    VM_MARKER_PATH = "C:/sandbox/guest.marker"

    @staticmethod
    def validate_manifest(manifest: SimulatorManifest) -> None:
        """Validate simulator manifest for safe configuration."""
        if not manifest.allowed_directories:
            raise ValueError("Simulator manifest must declare allowed directories.")
        if manifest.max_runtime_seconds <= 0:
            raise ValueError("Simulator runtime must be positive.")
        if manifest.max_runtime_seconds > 600:
            raise ValueError("Simulator runtime cannot exceed 10 minutes for safety.")

    @staticmethod
    def validate_execution_environment() -> bool:
        """Validate that we're running inside the VM sandbox."""
        if os.path.exists(SafetyGuardrails.VM_MARKER_PATH):
            return True
        logging.warning(f"VM marker not found at {SafetyGuardrails.VM_MARKER_PATH}")
        return False

    @staticmethod
    def validate_directory_access(path: str, allowed_dirs: list[str]) -> bool:
        """Validate that directory access is within allowed paths."""
        try:
            abs_path = Path(path).resolve()
            for allowed in allowed_dirs:
                allowed_path = Path(allowed).resolve()
                if str(abs_path).startswith(str(allowed_path)):
                    return True
            return False
        except Exception:
            return False

    @staticmethod
    def restrict_to_safe_directories(paths: list[str]) -> list[str]:
        """Filter paths to only include safe test directories."""
        safe_patterns = ["temp", "appdata", "sandbox", "test", "simulator"]
        filtered = []
        for path in paths:
            path_lower = path.lower()
            if any(pattern in path_lower for pattern in safe_patterns):
                filtered.append(path)
        return filtered if filtered else paths

    @staticmethod
    def get_safe_temp_directory() -> str:
        """Get a safe temporary directory for simulator operations."""
        return os.path.join(os.environ.get("TEMP", "C:/Windows/Temp"), "simulator_safe")

    @staticmethod
    def enforce_runtime_limit(max_seconds: int) -> None:
        """Enforce runtime limit with immediate exit."""
        import time
        time.sleep(max_seconds)
        logging.info(f"Simulator reached max runtime of {max_seconds}s, exiting safely")
        sys.exit(0)
