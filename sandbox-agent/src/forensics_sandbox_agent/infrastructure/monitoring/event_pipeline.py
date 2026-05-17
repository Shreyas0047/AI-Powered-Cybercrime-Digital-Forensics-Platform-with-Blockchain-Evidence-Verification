"""Forensic Event Pipeline - centralized event collection and processing."""

from __future__ import annotations

import logging
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional
from collections import defaultdict

from forensics_sandbox_agent.app.config.monitoring_models import ForensicStorageConfig
from forensics_sandbox_agent.infrastructure.monitoring.event_models import (
    ForensicEvent,
    EventCategory,
    EventSeverity,
    EventOperation,
    SuspiciousIndicator,
    ForensicSessionSummary,
    SuspiciousActivity,
)


class ForensicEventPipeline:
    """Centralized pipeline for forensic event collection and processing."""

    def __init__(
        self,
        config: ForensicStorageConfig,
        logger: logging.Logger,
    ) -> None:
        self._config = config
        self._logger = logger
        self._events: list[ForensicEvent] = []
        self._suspicious_activities: list[SuspiciousActivity] = []
        self._current_session_id: Optional[str] = None
        self._current_simulator_id: Optional[str] = None
        self._session_start_time: Optional[datetime] = None

        self._event_counts_by_category: dict[EventCategory, int] = defaultdict(int)
        self._event_counts_by_severity: dict[EventSeverity, int] = defaultdict(int)

        self._ensure_storage_dir()

    def _ensure_storage_dir(self) -> None:
        """Ensure the forensic storage directory exists."""
        events_dir = self._config.events_dir
        if not events_dir.exists():
            events_dir.mkdir(parents=True, exist_ok=True)
            self._logger.info(f"Created forensic events directory: {events_dir}")

    def start_session(self, session_id: str, simulator_id: str) -> None:
        """Start a new forensic monitoring session."""
        self._current_session_id = session_id
        self._current_simulator_id = simulator_id
        self._session_start_time = datetime.now()
        self._events.clear()
        self._suspicious_activities.clear()
        self._event_counts_by_category.clear()
        self._event_counts_by_severity.clear()

        self._logger.info(
            f"Started forensic session: session_id={session_id}, simulator={simulator_id}"
        )

    def emit_event(
        self,
        category: EventCategory,
        operation: EventOperation,
        severity: EventSeverity,
        source: str,
        details: dict,
        suspicious_indicators: list[SuspiciousIndicator] = None,
        raw_data: Optional[str] = None,
    ) -> ForensicEvent:
        """Emit a standardized forensic event to the pipeline."""
        if not self._current_session_id:
            self._logger.warning("No active session - event not recorded")
            raise RuntimeError("No active forensic session")

        event = ForensicEvent(
            event_id=str(uuid.uuid4()),
            session_id=self._current_session_id,
            simulator_id=self._current_simulator_id or "",
            timestamp=datetime.now(),
            category=category,
            operation=operation,
            severity=severity,
            source=source,
            details=details,
            suspicious_indicators=suspicious_indicators or [],
            raw_data=raw_data,
        )

        self._events.append(event)
        self._event_counts_by_category[category] += 1
        self._event_counts_by_severity[severity] += 1

        if suspicious_indicators:
            self._log_suspicious_activity(event)

        self._logger.debug(
            f"Forensic event: {category.value}/{operation.value} from {source}"
        )

        return event

    def _log_suspicious_activity(self, event: ForensicEvent) -> None:
        """Log suspicious activity from event."""
        for indicator in event.suspicious_indicators:
            activity = SuspiciousActivity(
                indicator_type=indicator,
                severity=event.severity,
                description=f"Detected {indicator.value} from {event.source}",
                evidence=[
                    f"Operation: {event.operation.value}",
                    f"Details: {json.dumps(event.details)[:200]}",
                ],
            )
            self._suspicious_activities.append(activity)

    def emit_process_event(
        self,
        operation: EventOperation,
        pid: int,
        executable_path: str = "",
        parent_pid: Optional[int] = None,
        command_line: str = "",
        suspicious_indicators: list[SuspiciousIndicator] = None,
    ) -> ForensicEvent:
        """Emit a process-related forensic event."""
        severity = EventSeverity.LOW
        if suspicious_indicators:
            severity = EventSeverity.MEDIUM

        return self.emit_event(
            category=EventCategory.PROCESS,
            operation=operation,
            severity=severity,
            source=f"process:{pid}",
            details={
                "pid": pid,
                "parent_pid": parent_pid,
                "executable_path": executable_path,
                "command_line": command_line,
            },
            suspicious_indicators=suspicious_indicators,
        )

    def emit_file_event(
        self,
        operation: EventOperation,
        file_path: str,
        file_extension: str = "",
        file_size: Optional[int] = None,
        suspicious_indicators: list[SuspiciousIndicator] = None,
    ) -> ForensicEvent:
        """Emit a file system forensic event."""
        severity = EventSeverity.LOW
        if suspicious_indicators:
            severity = EventSeverity.MEDIUM

        return self.emit_event(
            category=EventCategory.FILE_SYSTEM,
            operation=operation,
            severity=severity,
            source=f"file:{file_path}",
            details={
                "file_path": file_path,
                "file_extension": file_extension,
                "file_size": file_size,
            },
            suspicious_indicators=suspicious_indicators,
        )

    def emit_registry_event(
        self,
        operation: EventOperation,
        key_path: str,
        value_name: Optional[str] = None,
        value_data: Optional[str] = None,
        suspicious_indicators: list[SuspiciousIndicator] = None,
    ) -> ForensicEvent:
        """Emit a registry forensic event."""
        severity = EventSeverity.LOW
        if suspicious_indicators:
            severity = EventSeverity.MEDIUM

        return self.emit_event(
            category=EventCategory.REGISTRY,
            operation=operation,
            severity=severity,
            source=f"registry:{key_path}",
            details={
                "key_path": key_path,
                "value_name": value_name,
                "value_data": value_data,
            },
            suspicious_indicators=suspicious_indicators,
        )

    def emit_network_event(
        self,
        operation: EventOperation,
        destination_ip: str = "",
        destination_port: Optional[int] = None,
        protocol: str = "",
        dns_query: Optional[str] = None,
        source_pid: Optional[int] = None,
        suspicious_indicators: list[SuspiciousIndicator] = None,
    ) -> ForensicEvent:
        """Emit a network forensic event."""
        severity = EventSeverity.LOW
        if suspicious_indicators:
            severity = EventSeverity.MEDIUM

        return self.emit_event(
            category=EventCategory.NETWORK,
            operation=operation,
            severity=severity,
            source=f"network:{destination_ip}",
            details={
                "destination_ip": destination_ip,
                "destination_port": destination_port,
                "protocol": protocol,
                "dns_query": dns_query,
                "source_pid": source_pid,
            },
            suspicious_indicators=suspicious_indicators,
        )

    def emit_system_event(
        self,
        operation: EventOperation,
        message: str,
        details: dict = None,
    ) -> ForensicEvent:
        """Emit a system-level forensic event."""
        return self.emit_event(
            category=EventCategory.SYSTEM,
            operation=operation,
            severity=EventSeverity.INFO,
            source="system",
            details=details or {"message": message},
        )

    def get_session_events(self) -> list[ForensicEvent]:
        """Get all events for the current session."""
        return self._events.copy()

    def get_events_by_category(self, category: EventCategory) -> list[ForensicEvent]:
        """Get events filtered by category."""
        return [e for e in self._events if e.category == category]

    def get_events_by_severity(self, severity: EventSeverity) -> list[ForensicEvent]:
        """Get events filtered by severity."""
        return [e for e in self._events if e.severity == severity]

    def get_suspicious_activities(self) -> list[SuspiciousActivity]:
        """Get all suspicious activities detected."""
        return self._suspicious_activities.copy()

    def get_session_summary(self) -> ForensicSessionSummary:
        """Generate a session summary."""
        return ForensicSessionSummary(
            session_id=self._current_session_id or "",
            simulator_id=self._current_simulator_id or "",
            start_time=self._session_start_time or datetime.now(),
            end_time=datetime.now(),
            total_events=len(self._events),
            events_by_category={
                cat.value: count
                for cat, count in self._event_counts_by_category.items()
            },
            events_by_severity={
                sev.value: count
                for sev, count in self._event_counts_by_severity.items()
            },
            suspicious_activities=self._suspicious_activities.copy(),
            process_count=self._event_counts_by_category.get(EventCategory.PROCESS, 0),
            file_operations_count=self._event_counts_by_category.get(EventCategory.FILE_SYSTEM, 0),
            registry_operations_count=self._event_counts_by_category.get(EventCategory.REGISTRY, 0),
            network_operations_count=self._event_counts_by_category.get(EventCategory.NETWORK, 0),
        )

    def save_session_events(self) -> Path:
        """Save session events to disk."""
        if not self._current_session_id:
            raise RuntimeError("No active session")

        summary = self.get_session_summary()
        summary.end_time = datetime.now()

        filename = f"forensic_events_{self._current_session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = self._config.events_dir / filename

        output = {
            "session_summary": summary.to_dict(),
            "events": [e.to_dict() for e in self._events],
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2)

        self._logger.info(f"Saved {len(self._events)} forensic events to {filepath}")
        return filepath

    def clear_session(self) -> None:
        """Clear current session data."""
        self._logger.info(f"Cleared forensic session: {self._current_session_id}")
        self._events.clear()
        self._suspicious_activities.clear()
        self._current_session_id = None
        self._current_simulator_id = None
        self._session_start_time = None
        self._event_counts_by_category.clear()
        self._event_counts_by_severity.clear()