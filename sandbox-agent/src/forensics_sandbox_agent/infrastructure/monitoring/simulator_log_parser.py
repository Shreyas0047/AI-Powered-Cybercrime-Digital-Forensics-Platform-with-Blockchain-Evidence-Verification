"""Simulator Log Parser - parses structured telemetry from simulator log files.

Extracts forensic events from the structured text log produced by simulator
runtimes and emits them into the ForensicEventPipeline.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from typing import Optional

from forensics_sandbox_agent.infrastructure.monitoring.event_pipeline import ForensicEventPipeline
from forensics_sandbox_agent.infrastructure.monitoring.event_models import (
    EventCategory,
    EventSeverity,
    EventOperation,
)


class SimulatorLogParser:
    """Parses structured simulator telemetry logs into forensic events."""

    LOG_LINE_PATTERN = re.compile(
        r"^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d{3} \| (\w+) \| ([^|]+) \| (\w+): (.+)$"
    )

    EVENT_TYPE_MAP = {
        "file_create": (EventCategory.FILE_SYSTEM, EventOperation.FILE_CREATE),
        "file_modify": (EventCategory.FILE_SYSTEM, EventOperation.FILE_MODIFY),
        "file_delete": (EventCategory.FILE_SYSTEM, EventOperation.FILE_DELETE),
        "file_access": (EventCategory.FILE_SYSTEM, EventOperation.FILE_READ),
        "file_scan": (EventCategory.FILE_SYSTEM, EventOperation.FILE_READ),
        "file_write": (EventCategory.FILE_SYSTEM, EventOperation.FILE_WRITE),
        "process_start": (EventCategory.PROCESS, EventOperation.PROCESS_START),
        "process_terminate": (EventCategory.PROCESS, EventOperation.PROCESS_TERMINATE),
        "network_connect": (EventCategory.NETWORK, EventOperation.NETWORK_CONNECT),
        "network_dns": (EventCategory.NETWORK, EventOperation.NETWORK_DNS_QUERY),
        "registry_access": (EventCategory.REGISTRY, EventOperation.REGISTRY_MODIFY_VALUE),
        "registry_modify": (EventCategory.REGISTRY, EventOperation.REGISTRY_MODIFY_VALUE),
        "suspicious_behavior": (EventCategory.BEHAVIOR, EventOperation.PROCESS_CREATE),
        "execution_stage": (EventCategory.SYSTEM, EventOperation.PROCESS_CREATE),
        "cleanup": (EventCategory.SYSTEM, EventOperation.PROCESS_TERMINATE),
    }

    SEVERITY_MAP = {
        "critical": EventSeverity.CRITICAL,
        "high": EventSeverity.HIGH,
        "medium": EventSeverity.MEDIUM,
        "low": EventSeverity.LOW,
        "info": EventSeverity.INFO,
    }

    def __init__(
        self,
        pipeline: ForensicEventPipeline,
        logger: logging.Logger,
    ) -> None:
        self._pipeline = pipeline
        self._logger = logger
        self._events_parsed = 0
        self._events_emitted = 0

    def parse_log(
        self,
        log_content: str,
        simulator_id: str,
        session_id: str,
    ) -> int:
        """Parse simulator log content and emit events into the pipeline.

        Args:
            log_content: Raw text content of the simulator telemetry log
            simulator_id: ID of the simulator that produced the log
            session_id: Current forensic session ID

        Returns:
            Number of events successfully parsed and emitted
        """
        if not log_content or not log_content.strip():
            self._logger.debug(f"Empty log content for {simulator_id}")
            return 0

        self._events_parsed = 0
        self._events_emitted = 0

        self._logger.info(f"Parsing simulator log for {simulator_id}: {len(log_content)} chars")

        for line in log_content.split("\n"):
            line = line.strip()
            if not line:
                continue

            self._parse_line(line, simulator_id, session_id)

        self._logger.info(
            f"Simulator log parsed: {self._events_parsed} events found, "
            f"{self._events_emitted} emitted for {simulator_id}"
        )

        return self._events_emitted

    def _parse_line(self, line: str, simulator_id: str, session_id: str) -> None:
        """Parse a single log line and emit a forensic event."""
        match = self.LOG_LINE_PATTERN.match(line)
        if not match:
            self._logger.debug(f"Skipping non-matching log line: {line[:80]}")
            return

        timestamp_str, level, _logger_name, event_type, payload_str = match.groups()
        self._events_parsed += 1

        try:
            import ast
            payload = ast.literal_eval(payload_str.strip())
            if not isinstance(payload, dict):
                payload = {"raw": str(payload)}
        except (json.JSONDecodeError, (ValueError, SyntaxError)):
            clean = payload_str.strip()
            try:
                payload = json.loads(clean)
            except json.JSONDecodeError:
                try:
                    clean_escaped = clean.replace("\\", "\\\\")
                    payload = json.loads(clean_escaped)
                except json.JSONDecodeError:
                    self._logger.debug(f"Failed to parse payload: {payload_str[:100]}")
                    payload = {}

        if event_type not in self.EVENT_TYPE_MAP:
            self._logger.debug(f"Unknown event type: {event_type}")
            return

        category, operation = self.EVENT_TYPE_MAP[event_type]
        severity = self.SEVERITY_MAP.get(level.lower(), EventSeverity.INFO)

        if category == EventCategory.FILE_SYSTEM:
            self._emit_file_event(
                operation=operation,
                file_path=payload.get("path", ""),
                file_extension=payload.get("extension", ""),
                file_size=payload.get("size"),
                severity=severity,
                source=f"simulator:{simulator_id}",
            )

        elif category == EventCategory.NETWORK:
            self._emit_network_event(
                operation=operation,
                destination_ip=payload.get("host", payload.get("ip", "")),
                destination_port=payload.get("port"),
                protocol=payload.get("protocol", "TCP"),
                severity=severity,
                source=f"simulator:{simulator_id}",
            )

        elif category == EventCategory.REGISTRY:
            self._emit_registry_event(
                operation=operation,
                key_path=payload.get("key_path", ""),
                value_name=None,
                value_data=payload.get("value", ""),
                severity=severity,
                source=f"simulator:{simulator_id}",
            )

        elif category == EventCategory.PROCESS:
            self._emit_process_event(
                operation=operation,
                pid=payload.get("pid", 0),
                executable_path=payload.get("path", ""),
                parent_pid=payload.get("parent_pid"),
                command_line=payload.get("command", ""),
                severity=severity,
                source=f"simulator:{simulator_id}",
            )

        elif category == EventCategory.BEHAVIOR:
            self._emit_behavior_alert(
                description=payload.get("description", event_type),
                details=payload,
                severity=severity,
                source=f"simulator:{simulator_id}",
            )

        elif category == EventCategory.SYSTEM:
            self._emit_system_event(
                operation=operation,
                message=payload.get("stage", payload.get("description", event_type)),
                details=payload,
                severity=severity,
                source=f"simulator:{simulator_id}",
            )

        self._events_emitted += 1

    def _emit_file_event(
        self,
        operation: EventOperation,
        file_path: str,
        file_extension: str,
        file_size: Optional[int],
        severity: EventSeverity,
        source: str,
    ) -> None:
        """Emit a file system event."""
        if not file_path:
            return

        if not file_extension:
            try:
                from pathlib import Path
                file_extension = Path(file_path).suffix.lower()
            except Exception:
                file_extension = ""

        event = self._pipeline.emit_event(
            category=EventCategory.FILE_SYSTEM,
            operation=operation,
            severity=severity,
            source=source,
            details={
                "file_path": file_path,
                "file_extension": file_extension,
                "file_size": file_size,
                "operation": operation.value,
            },
        )
        self._logger.debug(f"Emitted file event: {operation.value} {file_path}")

    def _emit_network_event(
        self,
        operation: EventOperation,
        destination_ip: str,
        destination_port: Optional[int],
        protocol: str,
        severity: EventSeverity,
        source: str,
    ) -> None:
        """Emit a network event."""
        event = self._pipeline.emit_event(
            category=EventCategory.NETWORK,
            operation=operation,
            severity=severity,
            source=source,
            details={
                "destination_ip": destination_ip,
                "destination_port": destination_port,
                "protocol": protocol,
                "operation": operation.value,
            },
        )
        self._logger.debug(f"Emitted network event: {operation.value} {destination_ip}:{destination_port}")

    def _emit_registry_event(
        self,
        operation: EventOperation,
        key_path: str,
        value_name: Optional[str],
        value_data: Optional[str],
        severity: EventSeverity,
        source: str,
    ) -> None:
        """Emit a registry event."""
        if not key_path:
            return

        event = self._pipeline.emit_event(
            category=EventCategory.REGISTRY,
            operation=operation,
            severity=severity,
            source=source,
            details={
                "key_path": key_path,
                "value_name": value_name,
                "value_data": value_data,
                "operation": operation.value,
            },
        )
        self._logger.debug(f"Emitted registry event: {operation.value} {key_path}")

    def _emit_process_event(
        self,
        operation: EventOperation,
        pid: int,
        executable_path: str,
        parent_pid: Optional[int],
        command_line: str,
        severity: EventSeverity,
        source: str,
    ) -> None:
        """Emit a process event."""
        event = self._pipeline.emit_event(
            category=EventCategory.PROCESS,
            operation=operation,
            severity=severity,
            source=source,
            details={
                "pid": pid,
                "executable_path": executable_path,
                "parent_pid": parent_pid,
                "command_line": command_line,
                "operation": operation.value,
            },
        )
        self._logger.debug(f"Emitted process event: {operation.value} {executable_path} (PID={pid})")

    def _emit_behavior_alert(
        self,
        description: str,
        details: dict,
        severity: EventSeverity,
        source: str,
    ) -> None:
        """Emit a suspicious behavior alert."""
        event = self._pipeline.emit_event(
            category=EventCategory.BEHAVIOR,
            operation=EventOperation.PROCESS_CREATE,
            severity=severity,
            source=source,
            details={
                "description": description,
                "details": details,
            },
        )
        self._logger.debug(f"Emitted behavior alert: {description}")

    def _emit_system_event(
        self,
        operation: EventOperation,
        message: str,
        details: dict,
        severity: EventSeverity,
        source: str,
    ) -> None:
        """Emit a system event."""
        event = self._pipeline.emit_event(
            category=EventCategory.SYSTEM,
            operation=operation,
            severity=severity,
            source=source,
            details={
                "message": message,
                "stage_info": details,
            },
        )
        self._logger.debug(f"Emitted system event: {message}")