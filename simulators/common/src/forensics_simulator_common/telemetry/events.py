"""Shared telemetry event envelope for simulator-side trace emission."""

from __future__ import annotations

import logging
import json
import uuid
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, List


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
    NETWORK_DNS = "network_dNS"
    SUSPICIOUS_BEHAVIOR = "suspicious_behavior"
    EXECUTION_STAGE = "execution_stage"
    CLEANUP = "cleanup"
    EVASION_CHECK = "evasion_check"
    PERSISTENCE_ATTEMPT = "persistence_attempt"
    ANTI_VM_CHECK = "anti_vm_check"
    ANTI_DEBUG_CHECK = "anti_debug_check"
    ENCODED_COMMAND = "encoded_command"
    SERVICE_INSTALL = "service_install"
    SCHEDULED_TASK = "scheduled_task"
    BEACON = "beacon"
    EXFILTRATION = "exfiltration"
    ENCRYPTION_SIM = "encryption_sim"


EXECUTION_STAGES = [
    "initialization",
    "environment_check",
    "persistence_attempt",
    "reconnaissance",
    "payload_execution",
    "lateral_activity",
    "cleanup_or_exit"
]

THREAT_ACTORS = [
    "ransomware_operator",
    "spyware_operator",
    "stealth_intruder",
    "credential_thief",
    "worm_operator"
]


@dataclass
class SimulatorTelemetryEvent:
    """Structured telemetry event for forensic monitoring."""
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    simulator_id: str = ""
    session_id: str = ""
    campaign_id: str = field(default_factory=lambda: f"campaign_{int(time.time())}")
    execution_chain_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    simulator_family: str = ""
    attack_stage: str = ""
    details: dict = field(default_factory=dict)
    severity: str = "info"
    tactic: str = ""
    technique: str = ""
    subtechnique: str = ""
    confidence: int = 50
    risk_score: int = 0
    artifact_references: List[str] = field(default_factory=list)
    mitre_techniques: List[str] = field(default_factory=list)
    evasion_indicators: List[str] = field(default_factory=list)
    metadata: Dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat(),
            "simulator_id": self.simulator_id,
            "session_id": self.session_id,
            "campaign_id": self.campaign_id,
            "execution_chain_id": self.execution_chain_id,
            "simulator_family": self.simulator_family,
            "attack_stage": self.attack_stage,
            "details": self.details,
            "severity": self.severity,
            "tactic": self.tactic,
            "technique": self.technique,
            "subtechnique": self.subtechnique,
            "confidence": self.confidence,
            "risk_score": self.risk_score,
            "artifact_references": self.artifact_references,
            "mitre_techniques": self.mitre_techniques,
            "evasion_indicators": self.evasion_indicators,
            "metadata": self.metadata,
        }


class SimulatorLogger:
    """Structured logging for simulators with forensic-friendly output."""

    def __init__(
        self,
        simulator_id: str,
        log_file: Optional[str] = None,
        simulator_family: str = "",
        campaign_id: Optional[str] = None
    ):
        self._simulator_id = simulator_id
        self._simulator_family = simulator_family
        self._campaign_id = campaign_id or f"campaign_{int(time.time())}"
        self._execution_chain_id = str(uuid.uuid4())
        self._current_stage = "initialization"
        self._logger = logging.getLogger(f"simulator.{simulator_id}")
        self._events: list[SimulatorTelemetryEvent] = []
        self._start_time = time.time()

        if log_file:
            handler = logging.FileHandler(log_file)
            handler.setFormatter(logging.Formatter(
                "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
            ))
            self._logger.addHandler(handler)

    def set_stage(self, stage: str) -> None:
        """Set current execution stage."""
        self._current_stage = stage

    def get_stage(self) -> str:
        """Get current execution stage."""
        return self._current_stage

    def emit_event(
        self,
        event_type: TelemetryEventType,
        details: dict,
        severity: str = "info",
        tactic: str = "",
        technique: str = "",
        subtechnique: str = "",
        risk_score: int = 0,
        mitre_techniques: Optional[List[str]] = None,
        evasion_indicators: Optional[List[str]] = None,
        metadata: Optional[Dict] = None,
    ) -> SimulatorTelemetryEvent:
        """Emit a telemetry event with full metadata."""
        event = SimulatorTelemetryEvent(
            event_type=event_type.value,
            simulator_id=self._simulator_id,
            campaign_id=self._campaign_id,
            execution_chain_id=self._execution_chain_id,
            simulator_family=self._simulator_family,
            attack_stage=self._current_stage,
            details=details,
            severity=severity,
            tactic=tactic,
            technique=technique,
            subtechnique=subtechnique,
            risk_score=risk_score,
            mitre_techniques=mitre_techniques or [],
            evasion_indicators=evasion_indicators or [],
            metadata=metadata or {},
        )
        self._events.append(event)
        self._logger.info(f"[{self._current_stage}] {event_type.value}: {json.dumps(details)}")
        return event

    def emit_process_start(
        self,
        pid: int,
        path: str,
        parent_pid: Optional[int] = None,
        technique: str = "T1059",
        tactic: str = "Execution"
    ) -> None:
        """Emit process start event."""
        self.emit_event(
            TelemetryEventType.PROCESS_START,
            {"pid": pid, "path": path, "parent_pid": parent_pid},
            "low",
            tactic=tactic,
            technique=technique,
            risk_score=30,
            mitre_techniques=[technique],
        )

    def emit_file_create(
        self,
        path: str,
        size: Optional[int] = None,
        technique: str = "T1105",
        tactic: str = "Persistence"
    ) -> None:
        """Emit file creation event."""
        self.emit_event(
            TelemetryEventType.FILE_CREATE,
            {"path": path, "size": size},
            "low",
            tactic=tactic,
            technique=technique,
            risk_score=40,
            mitre_techniques=[technique],
        )

    def emit_file_modify(
        self,
        path: str,
        technique: str = "T1486",
        tactic: str = "Impact"
    ) -> None:
        """Emit file modification event."""
        self.emit_event(
            TelemetryEventType.FILE_MODIFY,
            {"path": path},
            "medium",
            tactic=tactic,
            technique=technique,
            risk_score=70,
            mitre_techniques=[technique],
        )

    def emit_file_operation(
        self,
        operation: str,
        path: str,
        technique: str = "",
        tactic: str = ""
    ) -> None:
        """Emit a generic file operation event."""
        op_map = {
            "create": (TelemetryEventType.FILE_CREATE, "low", "T1105", "Persistence"),
            "modify": (TelemetryEventType.FILE_MODIFY, "medium", "T1486", "Impact"),
            "delete": (TelemetryEventType.FILE_DELETE, "medium", "T1070", "Defense Evasion"),
            "access": (TelemetryEventType.FILE_ACCESS, "low", "T1083", "Discovery"),
            "scan": (TelemetryEventType.FILE_SCAN, "low", "T1083", "Discovery"),
            "load": (TelemetryEventType.FILE_ACCESS, "low", "T1574", "Persistence"),
        }
        
        evt_type, severity, default_tech, default_tactic = op_map.get(
            operation, (TelemetryEventType.FILE_ACCESS, "low", "T1083", "Discovery")
        )
        
        self.emit_event(
            evt_type,
            {"path": path, "operation": operation},
            severity,
            tactic=tactic or default_tactic,
            technique=technique or default_tech,
            risk_score=40 if severity == "medium" else 20,
        )

    def emit_registry_access(
        self,
        key_path: str,
        technique: str = "T1012",
        tactic: str = "Discovery"
    ) -> None:
        """Emit registry access event."""
        self.emit_event(
            TelemetryEventType.REGISTRY_ACCESS,
            {"key_path": key_path},
            "low",
            tactic=tactic,
            technique=technique,
            risk_score=20,
            mitre_techniques=[technique],
        )

    def emit_registry_modify(
        self,
        key_path: str,
        value: str = "synthetic",
        technique: str = "T1547.001",
        tactic: str = "Persistence"
    ) -> None:
        """Emit registry modification event."""
        self.emit_event(
            TelemetryEventType.REGISTRY_MODIFY,
            {"key_path": key_path, "value": value},
            "medium",
            tactic=tactic,
            technique=technique,
            risk_score=60,
            mitre_techniques=[technique],
        )

    def emit_registry_operation(
        self,
        key_path: str,
        modify: bool = False,
        value: str = "synthetic",
        technique: str = "",
        tactic: str = ""
    ) -> None:
        """Emit a generic registry operation event."""
        if modify:
            self.emit_registry_modify(key_path, value, technique or "T1547.001", tactic or "Persistence")
        else:
            self.emit_registry_access(key_path, technique or "T1012", tactic or "Discovery")

    def emit_network_connect(
        self,
        host: str,
        port: int,
        protocol: str = "TCP",
        technique: str = "T1071",
        tactic: str = "CommandAndControl"
    ) -> None:
        """Emit network connection event."""
        self.emit_event(
            TelemetryEventType.NETWORK_CONNECT,
            {"host": host, "port": port, "protocol": protocol},
            "medium",
            tactic=tactic,
            technique=technique,
            risk_score=50,
            mitre_techniques=[technique],
            metadata={"connection_id": str(uuid.uuid4())},
        )

    def emit_network_activity(
        self,
        host: str,
        port: int,
        protocol: str = "TCP",
        technique: str = "T1071",
        tactic: str = "CommandAndControl"
    ) -> None:
        """Emit a generic network activity event."""
        self.emit_network_connect(host, port, protocol, technique, tactic)

    def emit_beacon(
        self,
        host: str,
        port: int,
        beacon_id: int,
        interval_seconds: int = 0,
        technique: str = "T1071",
        tactic: str = "CommandAndControl"
    ) -> None:
        """Emit beacon event."""
        self.emit_event(
            TelemetryEventType.BEACON,
            {
                "host": host,
                "port": port,
                "beacon_id": beacon_id,
                "interval_seconds": interval_seconds,
            },
            "medium",
            tactic=tactic,
            technique=technique,
            risk_score=60,
            mitre_techniques=[technique],
            metadata={"session_id": str(uuid.uuid4())},
        )

    def emit_exfiltration(
        self,
        data_size: int,
        destination: str,
        technique: str = "T1041",
        tactic: str = "Exfiltration"
    ) -> None:
        """Emit exfiltration event."""
        self.emit_event(
            TelemetryEventType.EXFILTRATION,
            {"data_size": data_size, "destination": destination},
            "high",
            tactic=tactic,
            technique=technique,
            risk_score=80,
            mitre_techniques=[technique],
        )

    def emit_persistence_attempt(
        self,
        method: str,
        target: str,
        technique: str = "T1547.001",
        tactic: str = "Persistence"
    ) -> None:
        """Emit persistence attempt event."""
        self.emit_event(
            TelemetryEventType.PERSISTENCE_ATTEMPT,
            {"method": method, "target": target},
            "medium",
            tactic=tactic,
            technique=technique,
            risk_score=70,
            mitre_techniques=[technique],
        )

    def emit_scheduled_task(
        self,
        task_name: str,
        trigger: str,
        technique: str = "T1053",
        tactic: str = "Persistence"
    ) -> None:
        """Emit scheduled task creation event."""
        self.emit_event(
            TelemetryEventType.SCHEDULED_TASK,
            {"task_name": task_name, "trigger": trigger},
            "medium",
            tactic=tactic,
            technique=technique,
            risk_score=60,
            mitre_techniques=[technique],
        )

    def emit_service_install(
        self,
        service_name: str,
        technique: str = "T1543",
        tactic: str = "Persistence"
    ) -> None:
        """Emit service installation event."""
        self.emit_event(
            TelemetryEventType.SERVICE_INSTALL,
            {"service_name": service_name},
            "medium",
            tactic=tactic,
            technique=technique,
            risk_score=65,
            mitre_techniques=[technique],
        )

    def emit_encryption_sim(
        self,
        file_path: str,
        method: str = "extension_rename",
        technique: str = "T1486",
        tactic: str = "Impact"
    ) -> None:
        """Emit encryption simulation event."""
        self.emit_event(
            TelemetryEventType.ENCRYPTION_SIM,
            {"file_path": file_path, "method": method},
            "high",
            tactic=tactic,
            technique=technique,
            risk_score=85,
            mitre_techniques=[technique],
            metadata={"entropy_simulated": True},
        )

    def emit_anti_vm_check(
        self,
        check_type: str,
        result: str,
        technique: str = "T1497",
        tactic: str = "DefenseEvasion"
    ) -> None:
        """Emit anti-VM check event."""
        self.emit_event(
            TelemetryEventType.ANTI_VM_CHECK,
            {"check_type": check_type, "result": result},
            "low",
            tactic=tactic,
            technique=technique,
            risk_score=30,
            mitre_techniques=[technique],
            evasion_indicators=["anti_vm"],
        )

    def emit_anti_debug_check(
        self,
        check_type: str,
        result: str,
        technique: str = "T1622",
        tactic: str = "DefenseEvasion"
    ) -> None:
        """Emit anti-debugging check event."""
        self.emit_event(
            TelemetryEventType.ANTI_DEBUG_CHECK,
            {"check_type": check_type, "result": result},
            "low",
            tactic=tactic,
            technique=technique,
            risk_score=30,
            mitre_techniques=[technique],
            evasion_indicators=["anti_debug"],
        )

    def emit_encoded_command(
        self,
        command: str,
        technique: str = "T1059.001",
        tactic: str = "Execution"
    ) -> None:
        """Emit encoded command execution event."""
        self.emit_event(
            TelemetryEventType.ENCODED_COMMAND,
            {"command_length": len(command)},
            "medium",
            tactic=tactic,
            technique=technique,
            risk_score=55,
            mitre_techniques=[technique],
            evasion_indicators=["encoded_command"],
        )

    def emit_suspicious_behavior(
        self,
        description: str,
        details: dict,
        technique: str = "",
        tactic: str = "",
        risk_score: int = 50
    ) -> None:
        """Emit suspicious behavior event."""
        self.emit_event(
            TelemetryEventType.SUSPICIOUS_BEHAVIOR,
            {"description": description, **details},
            "high",
            tactic=tactic or "DefenseEvasion",
            technique=technique or "T1564",
            risk_score=risk_score,
            mitre_techniques=[technique] if technique else ["T1564"],
        )

    def emit_execution_stage(self, stage: str) -> None:
        """Emit execution stage change."""
        self._current_stage = stage
        self.emit_event(
            TelemetryEventType.EXECUTION_STAGE,
            {"stage": stage, "elapsed_seconds": time.time() - self._start_time},
            "info",
            metadata={"stage_start_time": time.time()},
        )

    def get_events(self) -> list[SimulatorTelemetryEvent]:
        """Get all emitted events."""
        return self._events.copy()

    def get_events_json(self) -> str:
        """Get all events as JSON string."""
        return json.dumps([e.to_dict() for e in self._events], indent=2)

    def get_campaign_id(self) -> str:
        """Get campaign ID."""
        return self._campaign_id

    def get_execution_chain_id(self) -> str:
        """Get execution chain ID."""
        return self._execution_chain_id