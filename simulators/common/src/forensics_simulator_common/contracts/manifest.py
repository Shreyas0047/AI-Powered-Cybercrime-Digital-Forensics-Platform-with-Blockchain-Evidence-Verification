"""Shared simulator manifest model.

Simulators will use this contract to declare safe execution boundaries that the
desktop agent can validate before launch.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class SimulatorCategory(Enum):
    """Category of simulator."""
    RANSOMWARE = "ransomware"
    SPYWARE = "spyware"
    TROJAN = "trojan"
    BOTNET = "botnet"
    CREDENTIAL_STEALER = "credential_stealer"


@dataclass(slots=True)
class SimulatorManifest:
    simulator_id: str
    display_name: str
    version: str
    description: str
    category: SimulatorCategory
    entry_point: str
    allowed_directories: list[str] = field(default_factory=list)
    allowed_registry_paths: list[str] = field(default_factory=list)
    allowed_network_targets: list[str] = field(default_factory=list)
    max_runtime_seconds: int = 60
    behavior_intensity: str = "medium"  # low, medium, high
    requires_isolation: bool = True
