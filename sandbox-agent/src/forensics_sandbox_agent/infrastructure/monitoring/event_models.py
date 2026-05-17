"""Forensic event models - standardized event structures for monitoring."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Any


class EventCategory(Enum):
    """Category of forensic event."""
    PROCESS = "process"
    FILE_SYSTEM = "file_system"
    REGISTRY = "registry"
    NETWORK = "network"
    BEHAVIOR = "behavior"
    SYSTEM = "system"


class EventSeverity(Enum):
    """Severity level of forensic event."""
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EventOperation(Enum):
    """Type of operation captured."""
    # Process operations
    PROCESS_START = "process_start"
    PROCESS_TERMINATE = "process_terminate"
    PROCESS_CREATE = "process_create"

    # File operations
    FILE_CREATE = "file_create"
    FILE_DELETE = "file_delete"
    FILE_MODIFY = "file_modify"
    FILE_READ = "file_read"
    FILE_WRITE = "file_write"

    # Registry operations
    REGISTRY_CREATE_KEY = "registry_create_key"
    REGISTRY_MODIFY_VALUE = "registry_modify_value"
    REGISTRY_DELETE_KEY = "registry_delete_key"
    REGISTRY_DELETE_VALUE = "registry_delete_value"

    # Network operations
    NETWORK_CONNECT = "network_connect"
    NETWORK_DNS_QUERY = "network_dns_query"
    NETWORK_LISTEN = "network_listen"
    NETWORK_SEND = "network_send"


class SuspiciousIndicator(Enum):
    """Types of suspicious indicators."""
    MASS_FILE_ACTIVITY = "mass_file_activity"
    RAPID_PROCESS_SPAWN = "rapid_process_spawn"
    SUSPICIOUS_REGISTRY = "suspicious_registry"
    SUSPICIOUS_NETWORK = "suspicious_network"
    SUSPICIOUS_PATH = "suspicious_path"
    UNUSUAL_EXECUTION = "unusual_execution"
    PERSISTENCE_ATTEMPT = "persistence_attempt"


@dataclass
class ForensicEvent:
    """Standardized forensic event structure."""
    event_id: str
    session_id: str
    simulator_id: str
    timestamp: datetime
    category: EventCategory
    operation: EventOperation
    severity: EventSeverity
    source: str
    details: dict = field(default_factory=dict)
    suspicious_indicators: list[SuspiciousIndicator] = field(default_factory=list)
    raw_data: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert event to dictionary for serialization."""
        return {
            "event_id": self.event_id,
            "session_id": self.session_id,
            "simulator_id": self.simulator_id,
            "timestamp": self.timestamp.isoformat(),
            "category": self.category.value,
            "operation": self.operation.value,
            "severity": self.severity.value,
            "source": self.source,
            "details": self.details,
            "suspicious_indicators": [s.value for s in self.suspicious_indicators],
            "raw_data": self.raw_data,
        }


@dataclass
class ProcessEvent:
    """Process-related forensic event."""
    pid: int
    parent_pid: Optional[int] = None
    executable_path: str = ""
    command_line: str = ""
    user: str = ""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    exit_code: Optional[int] = None


@dataclass
class FileEvent:
    """File system forensic event."""
    file_path: str
    operation_type: str
    file_size: Optional[int] = None
    file_extension: str = ""
    is_directory: bool = False


@dataclass
class RegistryEvent:
    """Registry forensic event."""
    key_path: str
    operation_type: str
    value_name: Optional[str] = None
    value_data: Optional[str] = None


@dataclass
class NetworkEvent:
    """Network forensic event."""
    source_pid: Optional[int] = None
    destination_ip: str = ""
    destination_port: Optional[int] = None
    protocol: str = ""
    direction: str = ""
    dns_query: Optional[str] = None


@dataclass
class SuspiciousActivity:
    """Suspicious behavior detection."""
    indicator_type: SuspiciousIndicator
    severity: EventSeverity
    description: str
    evidence: list[str] = field(default_factory=list)
    recommended_action: str = "investigate"


@dataclass
class ForensicSessionSummary:
    """Summary of forensic monitoring for a session."""
    session_id: str
    simulator_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    total_events: int = 0
    events_by_category: dict[str, int] = field(default_factory=dict)
    events_by_severity: dict[str, int] = field(default_factory=dict)
    suspicious_activities: list[SuspiciousActivity] = field(default_factory=list)
    process_count: int = 0
    file_operations_count: int = 0
    registry_operations_count: int = 0
    network_operations_count: int = 0

    def to_dict(self) -> dict:
        """Convert summary to dictionary."""
        return {
            "session_id": self.session_id,
            "simulator_id": self.simulator_id,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "total_events": self.total_events,
            "events_by_category": self.events_by_category,
            "events_by_severity": self.events_by_severity,
            "suspicious_activities": [
                {
                    "indicator": s.indicator_type.value,
                    "severity": s.severity.value,
                    "description": s.description,
                    "evidence": s.evidence,
                }
                for s in self.suspicious_activities
            ],
            "process_count": self.process_count,
            "file_operations_count": self.file_operations_count,
            "registry_operations_count": self.registry_operations_count,
            "network_operations_count": self.network_operations_count,
        }