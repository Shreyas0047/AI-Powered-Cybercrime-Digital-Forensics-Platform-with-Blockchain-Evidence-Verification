"""Internal mapping layer for simulator obfuscation.

This module provides internal mappings between generic threat sample names
and their behavioral profiles. The actual threat type is determined by the AI
through behavioral analysis, not by filename.

SINGLE SOURCE OF TRUTH: SIMULATOR_REGISTRY below. All other mappings in this
module are derived from it. If you add, remove, or rename a simulator, only
edit SIMULATOR_REGISTRY — the rest updates automatically.
"""

from __future__ import annotations

from typing import Dict, Optional

SIMULATOR_REGISTRY: list[dict[str, str | int]] = [
    {
        "id": "system_service_1",
        "generic_name": "ransomware-simulator",
        "display_name": "Sample Alpha",
        "executable_name": "system_service_1.exe",
        "behavioral_profile": "ransomware",
        "description": "Unknown threat sample - awaiting behavioral analysis",
        "timeout_seconds": 300,
    },
    {
        "id": "system_service_2",
        "generic_name": "spyware-simulator",
        "display_name": "Sample Beta",
        "executable_name": "system_monitor.exe",
        "behavioral_profile": "spyware",
        "description": "Unknown threat sample - awaiting behavioral analysis",
        "timeout_seconds": 300,
    },
    {
        "id": "system_service_3",
        "generic_name": "trojan-simulator",
        "display_name": "Sample Gamma",
        "executable_name": "update_service.exe",
        "behavioral_profile": "trojan",
        "description": "Unknown threat sample - awaiting behavioral analysis",
        "timeout_seconds": 300,
    },
    {
        "id": "system_service_4",
        "generic_name": "botnet-simulator",
        "display_name": "Sample Delta",
        "executable_name": "runtime_helper.exe",
        "behavioral_profile": "botnet",
        "description": "Unknown threat sample - awaiting behavioral analysis",
        "timeout_seconds": 300,
    },
    {
        "id": "system_service_5",
        "generic_name": "credential-stealer",
        "display_name": "Sample Epsilon",
        "executable_name": "windows_patch.exe",
        "behavioral_profile": "credential-stealer",
        "description": "Unknown threat sample - awaiting behavioral analysis",
        "timeout_seconds": 300,
    },
]

# ── Derived mappings (read-only; generated from the registry above) ──────────

SIMULATOR_ID_TO_GENERIC: Dict[str, str] = {
    e["id"]: e["generic_name"]  # type: ignore[typeddict-item]
    for e in SIMULATOR_REGISTRY
}

GENERIC_TO_SIMULATOR_ID: Dict[str, str] = {v: k for k, v in SIMULATOR_ID_TO_GENERIC.items()}

GENERIC_TO_BEHAVIORAL_PROFILE: Dict[str, str] = {
    e["generic_name"]: e["behavioral_profile"]  # type: ignore[typeddict-item]
    for e in SIMULATOR_REGISTRY
}

BEHAVIORAL_PROFILE_TO_GENERIC: Dict[str, str] = {v: k for k, v in GENERIC_TO_BEHAVIORAL_PROFILE.items()}

GENERIC_DISPLAY_NAMES: Dict[str, str] = {
    e["generic_name"]: e["display_name"]  # type: ignore[typeddict-item]
    for e in SIMULATOR_REGISTRY
}

GENERIC_EXECUTABLE_NAMES: Dict[str, str] = {
    e["generic_name"]: e["executable_name"]  # type: ignore[typeddict-item]
    for e in SIMULATOR_REGISTRY
}

KNOWN_SIMULATOR_IDS: set[str] = {e["id"] for e in SIMULATOR_REGISTRY}
KNOWN_GENERIC_NAMES: set[str] = {e["generic_name"] for e in SIMULATOR_REGISTRY}

# Map every known id → its generic name (including system_service_X → ransomeware-simulator, etc.)
VALID_SIMULATOR_IDS: set[str] = KNOWN_SIMULATOR_IDS | KNOWN_GENERIC_NAMES


def get_generic_name(simulator_id: str) -> Optional[str]:
    """Get generic name from simulator ID."""
    return SIMULATOR_ID_TO_GENERIC.get(simulator_id)


def get_simulator_id(generic_name: str) -> Optional[str]:
    """Get simulator ID from generic name."""
    return GENERIC_TO_SIMULATOR_ID.get(generic_name)


def get_behavioral_profile(generic_name: str) -> Optional[str]:
    """Get behavioral profile from generic name."""
    return GENERIC_TO_BEHAVIORAL_PROFILE.get(generic_name)


def get_display_name(generic_name: str) -> Optional[str]:
    """Get display name for UI from generic name."""
    return GENERIC_DISPLAY_NAMES.get(generic_name)


def get_executable_name(generic_name: str) -> Optional[str]:
    """Get executable filename from generic name."""
    return GENERIC_EXECUTABLE_NAMES.get(generic_name)


def get_description(generic_name: str) -> Optional[str]:
    """Get description from generic name."""
    for e in SIMULATOR_REGISTRY:
        if e["generic_name"] == generic_name:
            return e["description"]
    return None


def get_timeout_seconds(generic_name: str) -> int:
    """Get default timeout from generic name."""
    for e in SIMULATOR_REGISTRY:
        if e["generic_name"] == generic_name:
            return e["timeout_seconds"]
    return 300


def get_simulator_by_behavioral_profile(profile: str) -> Optional[str]:
    """Get simulator ID from behavioral profile."""
    return BEHAVIORAL_PROFILE_TO_GENERIC.get(profile)