"""Configuration models for forensic monitoring."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(slots=True)
class ProcessMonitoringConfig:
    enabled: bool = True
    track_parent_child: bool = True
    capture_command_line: bool = True
    track_termination: bool = True
    suspicious_threshold: int = 50


@dataclass(slots=True)
class FileMonitoringConfig:
    enabled: bool = True
    track_creation: bool = True
    track_deletion: bool = True
    track_modification: bool = True
    track_extensions: list[str] = field(default_factory=lambda: [".exe", ".dll", ".bat", ".ps1", ".vbs", ".cmd"])
    suspicious_file_count: int = 100
    suspicious_directory_patterns: list[str] = field(default_factory=lambda: ["Temp", "AppData", "Startup", "System32"])


@dataclass(slots=True)
class RegistryMonitoringConfig:
    enabled: bool = True
    track_key_creation: bool = True
    track_key_modification: bool = True
    track_deletion: bool = True
    track_autorun: bool = True
    suspicious_paths: list[str] = field(default_factory=lambda: [
        "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
        "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce",
        "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
        "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\RunOnce",
    ])


@dataclass(slots=True)
class NetworkMonitoringConfig:
    enabled: bool = True
    track_outbound: bool = True
    track_dns: bool = True
    track_connections: bool = True
    max_connections_per_minute: int = 100
    suspicious_ports: list[int] = field(default_factory=lambda: [4444, 5555, 6666, 31337, 8080, 443])


@dataclass(slots=True)
class ForensicStorageConfig:
    events_dir: Path = field(default_factory=lambda: Path("../../logs/monitoring"))
    max_events_per_session: int = 10000
    retention_days: int = 30
    json_format: bool = True


@dataclass(slots=True)
class BehaviorDetectionConfig:
    enabled: bool = True
    detect_mass_file_mods: bool = True
    detect_rapid_process_spawn: bool = True
    detect_suspicious_registry: bool = True
    detect_unusual_network: bool = True
    detect_suspicious_paths: bool = True


@dataclass(slots=True)
class MonitoringConfig:
    process: ProcessMonitoringConfig = field(default_factory=ProcessMonitoringConfig)
    file_system: FileMonitoringConfig = field(default_factory=FileMonitoringConfig)
    registry: RegistryMonitoringConfig = field(default_factory=RegistryMonitoringConfig)
    network: NetworkMonitoringConfig = field(default_factory=NetworkMonitoringConfig)
    storage: ForensicStorageConfig = field(default_factory=ForensicStorageConfig)
    behavior_detection: BehaviorDetectionConfig = field(default_factory=BehaviorDetectionConfig)