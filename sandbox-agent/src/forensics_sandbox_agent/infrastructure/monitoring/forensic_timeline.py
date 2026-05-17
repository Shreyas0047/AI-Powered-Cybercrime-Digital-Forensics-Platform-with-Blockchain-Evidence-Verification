"""Forensic Timeline Engine - generates chronological timelines."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field
from collections import defaultdict

from forensics_sandbox_agent.infrastructure.monitoring.event_pipeline import ForensicEventPipeline
from forensics_sandbox_agent.infrastructure.monitoring.event_models import (
    ForensicEvent,
    EventCategory,
)


@dataclass
class TimelineEntry:
    """Single entry in the forensic timeline."""
    timestamp: datetime
    category: EventCategory
    event_type: str
    description: str
    details: dict = field(default_factory=dict)
    severity: str = "info"
    is_suspicious: bool = False


@dataclass
class TimelinePhase:
    """Represents a phase in the execution timeline."""
    name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    events: list[TimelineEntry] = field(default_factory=list)


class ForensicTimelineEngine:
    """Generates and manages forensic timelines."""

    def __init__(
        self,
        pipeline: ForensicEventPipeline,
        logger: logging.Logger,
    ) -> None:
        self._pipeline = pipeline
        self._logger = logger
        self._entries: list[TimelineEntry] = []
        self._phases: list[TimelinePhase] = []
        self._current_phase: Optional[TimelinePhase] = None
        self._session_start: Optional[datetime] = None

    def start_session(self) -> None:
        """Start timeline tracking for a session."""
        self._session_start = datetime.now()
        self._entries.clear()
        self._phases.clear()
        self._current_phase = None
        self._logger.info("Forensic timeline tracking started")

    def add_entry(
        self,
        category: EventCategory,
        event_type: str,
        description: str,
        details: dict = None,
        severity: str = "info",
        is_suspicious: bool = False,
    ) -> None:
        """Add an entry to the timeline."""
        entry = TimelineEntry(
            timestamp=datetime.now(),
            category=category,
            event_type=event_type,
            description=description,
            details=details or {},
            severity=severity,
            is_suspicious=is_suspicious,
        )
        self._entries.append(entry)

        if self._current_phase:
            self._current_phase.events.append(entry)

    def start_phase(self, phase_name: str) -> None:
        """Start a new execution phase."""
        self._current_phase = TimelinePhase(
            name=phase_name,
            start_time=datetime.now(),
        )
        self._phases.append(self._current_phase)
        self._logger.debug(f"Timeline phase started: {phase_name}")

    def end_phase(self) -> None:
        """End the current execution phase."""
        if self._current_phase:
            self._current_phase.end_time = datetime.now()
            duration = (self._current_phase.end_time - self._current_phase.start_time).total_seconds()
            self._logger.debug(
                f"Timeline phase ended: {self._current_phase.name} (duration: {duration:.2f}s)"
            )
            self._current_phase = None

    def generate_from_pipeline(self) -> None:
        """Generate timeline from pipeline events."""
        events = self._pipeline.get_session_events()

        for event in events:
            is_suspicious = len(event.suspicious_indicators) > 0

            self.add_entry(
                category=event.category,
                event_type=event.operation.value,
                description=f"{event.category.value}: {event.operation.value}",
                details=event.details,
                severity=event.severity.value,
                is_suspicious=is_suspicious,
            )

    def get_sorted_entries(self) -> list[TimelineEntry]:
        """Get timeline entries sorted by timestamp."""
        return sorted(self._entries, key=lambda x: x.timestamp)

    def get_entries_by_category(self, category: EventCategory) -> list[TimelineEntry]:
        """Get timeline entries filtered by category."""
        return [e for e in self._entries if e.category == category]

    def get_suspicious_entries(self) -> list[TimelineEntry]:
        """Get all suspicious timeline entries."""
        return [e for e in self._entries if e.is_suspicious]

    def get_phase_summary(self) -> list[dict]:
        """Get summary of execution phases."""
        return [
            {
                "name": phase.name,
                "start_time": phase.start_time.isoformat(),
                "end_time": phase.end_time.isoformat() if phase.end_time else None,
                "duration_seconds": (
                    (phase.end_time - phase.start_time).total_seconds()
                    if phase.end_time else None
                ),
                "event_count": len(phase.events),
            }
            for phase in self._phases
        ]

    def get_timeline_summary(self) -> dict:
        """Get overall timeline summary."""
        sorted_entries = self.get_sorted_entries()

        category_counts = defaultdict(int)
        severity_counts = defaultdict(int)
        suspicious_count = 0

        for entry in sorted_entries:
            category_counts[entry.category.value] += 1
            severity_counts[entry.severity] += 1
            if entry.is_suspicious:
                suspicious_count += 1

        return {
            "total_entries": len(sorted_entries),
            "entries_by_category": dict(category_counts),
            "entries_by_severity": dict(severity_counts),
            "suspicious_entries": suspicious_count,
            "phases": len(self._phases),
            "session_duration_seconds": (
                (datetime.now() - self._session_start).total_seconds()
                if self._session_start else None
            ),
        }

    def get_timeline_for_export(self) -> list[dict]:
        """Get timeline data formatted for export."""
        sorted_entries = self.get_sorted_entries()
        return [
            {
                "timestamp": entry.timestamp.isoformat(),
                "category": entry.category.value,
                "event_type": entry.event_type,
                "description": entry.description,
                "details": entry.details,
                "severity": entry.severity,
                "is_suspicious": entry.is_suspicious,
            }
            for entry in sorted_entries
        ]