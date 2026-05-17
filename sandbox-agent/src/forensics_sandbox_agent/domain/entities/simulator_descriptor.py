"""Domain entity describing a simulator registered with the agent."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass(slots=True)
class SimulatorDescriptor:
    """Stable simulator metadata surfaced to the UI and orchestrator."""

    id: str
    display_name: str
    version: str
    description: str
    category: str
    executable_path: str = ""
    entry_point: str = ""
    is_safe: bool = True
    requires_isolation: bool = True
    timeout_seconds: int = 300
    metadata: dict = field(default_factory=dict)

    @property
    def simulator_id(self) -> str:
        """Alias for id for backward compatibility."""
        return self.id

    @property
    def executable_exists(self) -> bool:
        """Check if executable file exists."""
        if not self.executable_path:
            return False
        return Path(self.executable_path).exists()

    @classmethod
    def from_manifest(cls, manifest_data: dict, base_path: Optional[Path] = None) -> "SimulatorDescriptor":
        """Create descriptor from manifest data."""
        exe_path = manifest_data.get("executable_path", "")
        if base_path and exe_path and not Path(exe_path).is_absolute():
            exe_path = str(base_path / exe_path)

        return cls(
            id=manifest_data.get("id", ""),
            display_name=manifest_data.get("display_name", ""),
            version=manifest_data.get("version", "0.0.0"),
            description=manifest_data.get("description", ""),
            category=manifest_data.get("category", "unknown"),
            executable_path=exe_path,
            entry_point=manifest_data.get("entry_point", ""),
            is_safe=manifest_data.get("is_safe", True),
            requires_isolation=manifest_data.get("requires_isolation", True),
            timeout_seconds=manifest_data.get("timeout_seconds", 300),
        )
