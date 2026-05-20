"""Internal mapping layer for simulator obfuscation.

This module provides internal mappings between generic threat sample names
and their behavioral profiles. The actual threat type is determined by the AI
through behavioral analysis, not by filename.
"""

from __future__ import annotations

from typing import Dict, Optional

SIMULATOR_ID_TO_GENERIC: Dict[str, str] = {
    "system_service_1": "ransomware-simulator",
    "system_service_2": "spyware-simulator",
    "system_service_3": "trojan-simulator",
    "system_service_4": "botnet-simulator",
    "system_service_5": "credential-stealer",
}

GENERIC_TO_SIMULATOR_ID: Dict[str, str] = {v: k for k, v in SIMULATOR_ID_TO_GENERIC.items()}

GENERIC_TO_BEHAVIORAL_PROFILE: Dict[str, str] = {
    "ransomware-simulator": "ransomware",
    "spyware-simulator": "spyware",
    "credential-stealer": "credential-stealer",
    "trojan-simulator": "trojan",
    "botnet-simulator": "botnet",
}

BEHAVIORAL_PROFILE_TO_GENERIC: Dict[str, str] = {v: k for k, v in GENERIC_TO_BEHAVIORAL_PROFILE.items()}

GENERIC_DISPLAY_NAMES: Dict[str, str] = {
    "ransomware-simulator": "Ransomware Simulator",
    "spyware-simulator": "Spyware Simulator",
    "credential-stealer": "Credential Stealer Simulator",
    "trojan-simulator": "Trojan Simulator",
    "botnet-simulator": "Botnet Simulator",
}

GENERIC_EXECUTABLE_NAMES: Dict[str, str] = {
    "ransomware-simulator": "ransomware_simulator.exe",
    "spyware-simulator": "spyware_simulator.exe",
    "credential-stealer": "credential_stealer_simulator.exe",
    "trojan-simulator": "trojan_simulator.exe",
    "botnet-simulator": "botnet_simulator.exe",
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