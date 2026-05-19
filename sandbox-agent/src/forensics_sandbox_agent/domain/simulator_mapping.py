"""Internal mapping layer for simulator obfuscation.

This module provides internal mappings between generic threat sample names
and their behavioral profiles. The actual threat type is determined by the AI
through behavioral analysis, not by filename.
"""

from __future__ import annotations

from typing import Dict, Optional

SIMULATOR_ID_TO_GENERIC: Dict[str, str] = {
    "system_service_1": "system_service_1",
    "system_monitor": "system_monitor",
    "update_service": "update_service",
    "runtime_helper": "runtime_helper",
    "windows_patch": "windows_patch",
}

GENERIC_TO_SIMULATOR_ID: Dict[str, str] = {v: k for k, v in SIMULATOR_ID_TO_GENERIC.items()}

GENERIC_TO_BEHAVIORAL_PROFILE: Dict[str, str] = {
    "system_service_1": "ransomware",
    "system_monitor": "spyware",
    "windows_patch": "credential-stealer",
    "update_service": "trojan",
    "runtime_helper": "botnet",
}

BEHAVIORAL_PROFILE_TO_GENERIC: Dict[str, str] = {v: k for k, v in GENERIC_TO_BEHAVIORAL_PROFILE.items()}

GENERIC_DISPLAY_NAMES: Dict[str, str] = {
    "system_service_1": "System Service 1",
    "system_monitor": "System Monitor",
    "windows_patch": "Windows Patch",
    "update_service": "Update Service",
    "runtime_helper": "Runtime Helper",
}

GENERIC_EXECUTABLE_NAMES: Dict[str, str] = {
    "system_service_1": "system_service_1.exe",
    "system_monitor": "system_monitor.exe",
    "windows_patch": "windows_patch.exe",
    "update_service": "update_service.exe",
    "runtime_helper": "runtime_helper.exe",
}


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


def get_simulator_by_behavioral_profile(profile: str) -> Optional[str]:
    """Get simulator ID from behavioral profile."""
    return BEHAVIORAL_PROFILE_TO_GENERIC.get(profile)