"""Shared telemetry event envelope for simulator-side trace emission."""

from __future__ import annotations

import logging
import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional


class TelemetryEventType(Enum):
    """Types of telemetry events."""
    PROCESS_START = "process_start"
    PROCESS_TERMINATE = "process_terminate"
    FILE_CREATE = "file_create"
    FILE_DELETE = "file_delete"
    FILE_MODIFY = "file_modify"
    FILE_ACCESS = "file_access"
    FILE_SCAN = "file_scan"
    REGISTRY_ACCESS = "registry_access"
    REGISTRY_MODIFY = "registry_modify"
    NETWORK_CONNECT = "network_connect"
    NETWORK_DNS = "network_dns"
    SUSPICIOUS_BEHAVIOR = "suspicious_behavior"
    EXECUTION_STAGE = "execution_stage"
    CLEANUP = "cleanup"


@dataclass
class SimulatorTelemetryEvent:
    """Structured telemetry event for forensic monitoring."""
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    simulator_id: str = ""
    session_id: str = ""
    details: dict = field(default_factory=dict)
    severity: str = "info"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat(),
            "simulator_id": self.simulator_id,
            "session_id": self.session_id,
            "details": self.details,
            "severity": self.severity,
        }


class SimulatorLogger:
    """Structured logging for simulators with forensic-friendly output."""

    def __init__(self, simulator_id: str, log_file: Optional[str] = None):
        self._simulator_id = simulator_id
        self._logger = logging.getLogger(f"simulator.{simulator_id}")
        self._events: list[SimulatorTelemetryEvent] = []

        if log_file:
            handler = logging.FileHandler(log_file)
            handler.setFormatter(logging.Formatter(
                "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
            ))
            self._logger.addHandler(handler)

    def emit_event(
        self,
        event_type: TelemetryEventType,
        details: dict,
        severity: str = "info",
    ) -> SimulatorTelemetryEvent:
        """Emit a telemetry event."""
        event = SimulatorTelemetryEvent(
            event_type=event_type.value,
            simulator_id=self._simulator_id,
            details=details,
            severity=severity,
        )
        self._events.append(event)
        self._logger.info(f"{event_type.value}: {json.dumps(details)}")
        return event

    def emit_process_start(self, pid: int, path: str, parent_pid: Optional[int] = None) -> None:
        """Emit process start event."""
        self.emit_event(
            TelemetryEventType.PROCESS_START,
            {"pid": pid, "path": path, "parent_pid": parent_pid},
            "low",
        )

    def emit_file_create(self, path: str, size: Optional[int] = None) -> None:
        """Emit file creation event."""
        self.emit_event(
            TelemetryEventType.FILE_CREATE,
            {"path": path, "size": size},
            "low",
        )

    def emit_file_modify(self, path: str) -> None:
        """Emit file modification event."""
        self.emit_event(
            TelemetryEventType.FILE_MODIFY,
            {"path": path},
            "medium",
        )

    def emit_file_operation(self, operation: str, path: str) -> None:
        """Emit a generic file operation event."""
        op_map = {
            "create": (TelemetryEventType.FILE_CREATE, "low"),
            "modify": (TelemetryEventType.FILE_MODIFY, "medium"),
            "delete": (TelemetryEventType.FILE_DELETE, "medium"),
            "access": (TelemetryEventType.FILE_ACCESS, "low"),
            "scan": (TelemetryEventType.FILE_SCAN, "low"),
            "load": (TelemetryEventType.FILE_ACCESS, "low"),
        }
        
        evt_type, severity = op_map.get(operation, (TelemetryEventType.FILE_ACCESS, "low"))
        self.emit_event(evt_type, {"path": path, "operation": operation}, severity)

    def emit_registry_access(self, key_path: str) -> None:
        """Emit registry access event."""
        self.emit_event(
            TelemetryEventType.REGISTRY_ACCESS,
            {"key_path": key_path},
            "low",
        )

    def emit_registry_modify(self, key_path: str, value: str) -> None:
        """Emit registry modification event."""
        self.emit_event(
            TelemetryEventType.REGISTRY_MODIFY,
            {"key_path": key_path, "value": value},
            "medium",
        )

    def emit_registry_operation(self, key_path: str, modify: bool = False, value: str = "synthetic") -> None:
        """Emit a generic registry operation event."""
        if modify:
            self.emit_registry_modify(key_path, value)
        else:
            self.emit_registry_access(key_path)

    def emit_network_connect(self, host: str, port: int, protocol: str) -> None:
        """Emit network connection event."""
        self.emit_event(
            TelemetryEventType.NETWORK_CONNECT,
            {"host": host, "port": port, "protocol": protocol},
            "medium",
        )

    def emit_network_activity(self, host: str, port: int, protocol: str = "TCP") -> None:
        """Emit a generic network activity event."""
        self.emit_network_connect(host, port, protocol)

    def emit_suspicious_behavior(self, description: str, details: dict) -> None:
        """Emit suspicious behavior event."""
        self.emit_event(
            TelemetryEventType.SUSPICIOUS_BEHAVIOR,
            {"description": description, **details},
            "high",
        )

    def emit_execution_stage(self, stage: str) -> None:
        """Emit execution stage change."""
        self.emit_event(
            TelemetryEventType.EXECUTION_STAGE,
            {"stage": stage},
            "info",
        )

    def get_events(self) -> list[SimulatorTelemetryEvent]:
        """Get all emitted events."""
        return self._events.copy()

    def get_events_json(self) -> str:
        """Get all events as JSON string."""
        return json.dumps([e.to_dict() for e in self._events], indent=2)
