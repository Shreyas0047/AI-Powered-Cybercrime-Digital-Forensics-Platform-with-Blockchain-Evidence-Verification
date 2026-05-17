"""Event Correlation Engine - correlates related forensic events."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Optional
from collections import defaultdict

from forensics_sandbox_agent.app.config.reporting_models import EventCorrelationConfig
from forensics_sandbox_agent.infrastructure.monitoring.event_models import (
    ForensicEvent,
    EventCategory,
)


class CorrelationType(Enum):
    """Types of event correlations."""
    PROCESS_CHAIN = "process_chain"
    FILE_REGISTRY_LINK = "file_registry_link"
    TIMING_SEQUENCE = "timing_sequence"
    NETWORK_PROCESS_LINK = "network_process_link"
    SUSPICIOUS_SEQUENCE = "suspicious_sequence"


@dataclass
class EventCorrelation:
    """A correlated group of events."""
    correlation_id: str
    correlation_type: CorrelationType
    events: list[ForensicEvent]
    description: str
    confidence: float = 1.0


@dataclass
class CorrelatedIncident:
    """A complete correlated incident."""
    incident_id: str
    title: str
    description: str
    severity_score: float
    correlations: list[EventCorrelation] = field(default_factory=list)
    timeline: list[ForensicEvent] = field(default_factory=list)
    indicators: list[str] = field(default_factory=list)


class EventCorrelationEngine:
    """Correlates related forensic events into incidents."""

    def __init__(
        self,
        config: EventCorrelationConfig,
        logger: logging.Logger,
    ) -> None:
        self._config = config
        self._logger = logger

    def correlate_events(self, events: list[ForensicEvent]) -> list[CorrelatedIncident]:
        """Correlate events into incidents."""
        if not self._config.enabled or not events:
            return []

        incidents = []

        if self._config.correlate_process_chains:
            process_correlations = self._correlate_process_chains(events)
            incidents.extend(process_correlations)

        if self._config.correlate_file_registry:
            file_registry_correlations = self._correlate_file_registry(events)
            incidents.extend(file_registry_correlations)

        if self._config.correlate_timing:
            timing_correlations = self._correlate_timing_sequences(events)
            incidents.extend(timing_correlations)

        network_process = self._correlate_network_process(events)
        incidents.extend(network_process)

        suspicious_seq = self._correlate_suspicious_sequences(events)
        incidents.extend(suspicious_seq)

        self._logger.info(f"Correlated {len(events)} events into {len(incidents)} incidents")
        return incidents

    def _correlate_process_chains(self, events: list[ForensicEvent]) -> list[CorrelatedIncident]:
        """Correlate parent-child process relationships."""
        correlations = []
        process_starts = [e for e in events if "process_start" in e.operation.value]

        for event in process_starts:
            if event.details.get("parent_pid"):
                correlation = EventCorrelation(
                    correlation_id=f"proc_chain_{event.event_id[:8]}",
                    correlation_type=CorrelationType.PROCESS_CHAIN,
                    events=[event],
                    description=f"Process chain detected: PID {event.details.get('pid')}",
                )
                correlations.append(correlation)

        if correlations:
            return [CorrelatedIncident(
                incident_id="process_chains",
                title="Process Chain Activity",
                description=f"Detected {len(correlations)} process spawn events with parent relationships",
                severity_score=len(correlations) * 5,
                correlations=correlations,
            )]

        return []

    def _correlate_file_registry(self, events: list[ForensicEvent]) -> list[CorrelatedIncident]:
        """Correlate file operations with registry modifications."""
        file_events = [e for e in events if e.category == EventCategory.FILE_SYSTEM]
        registry_events = [e for e in events if e.category == EventCategory.REGISTRY]

        if not file_events or not registry_events:
            return []

        combined = file_events + registry_events[:5]

        correlation = EventCorrelation(
            correlation_id="file_registry_link",
            correlation_type=CorrelationType.FILE_REGISTRY_LINK,
            events=combined,
            description="File operations linked with registry modifications",
        )

        return [CorrelatedIncident(
            incident_id="file_registry_activity",
            title="File and Registry Activity",
            description=f"Correlated {len(file_events)} file operations with {len(registry_events)} registry modifications",
            severity_score=min((len(file_events) + len(registry_events)) * 2, 50),
            correlations=[correlation],
        )]

    def _correlate_timing_sequences(self, events: list[ForensicEvent]) -> list[CorrelatedIncident]:
        """Correlate events by timing sequence."""
        if len(events) < 3:
            return []

        sorted_events = sorted(events, key=lambda x: x.timestamp)
        window = timedelta(seconds=self._config.correlation_window_seconds)

        sequences = []
        current_sequence = [sorted_events[0]]

        for event in sorted_events[1:]:
            time_diff = event.timestamp - current_sequence[-1].timestamp
            if time_diff <= window:
                current_sequence.append(event)
            else:
                if len(current_sequence) >= 3:
                    sequences.append(current_sequence)
                current_sequence = [event]

        if len(current_sequence) >= 3:
            sequences.append(current_sequence)

        if sequences:
            return [CorrelatedIncident(
                incident_id="timing_sequences",
                title="Timing-Based Event Sequences",
                description=f"Identified {len(sequences)} event sequences within {self._config.correlation_window_seconds}s window",
                severity_score=len(sequences) * 10,
                timeline=sorted_events[:20],
            )]

        return []

    def _correlate_network_process(self, events: list[ForensicEvent]) -> list[CorrelatedIncident]:
        """Correlate network events with process information."""
        network_events = [e for e in events if e.category == EventCategory.NETWORK]
        process_events = [e for e in events if e.category == EventCategory.PROCESS]

        if not network_events:
            return []

        combined = []
        for net_event in network_events[:5]:
            if net_event.details.get("source_pid"):
                combined.append(net_event)

        if combined:
            return [CorrelatedIncident(
                incident_id="network_process",
                title="Network Activity by Process",
                description=f"Network activity with identified source processes: {len(combined)} events",
                severity_score=len(combined) * 5,
                timeline=combined,
                indicators=["network_connection", "process_association"],
            )]

        return []

    def _correlate_suspicious_sequences(self, events: list[ForensicEvent]) -> list[CorrelatedIncident]:
        """Correlate sequences of suspicious activity."""
        suspicious_events = [
            e for e in events
            if e.suspicious_indicators
        ]

        if len(suspicious_events) < 2:
            return []

        correlation = EventCorrelation(
            correlation_id="suspicious_sequence",
            correlation_type=CorrelationType.SUSPICIOUS_SEQUENCE,
            events=suspicious_events,
            description=f"Sequence of {len(suspicious_events)} suspicious events detected",
            confidence=0.8,
        )

        indicators = set()
        for event in suspicious_events:
            for ind in event.suspicious_indicators:
                indicators.add(ind.value)

        return [CorrelatedIncident(
            incident_id="suspicious_activity",
            title="Suspicious Activity Pattern",
            description=f"Detected {len(suspicious_events)} suspicious events forming a pattern",
            severity_score=len(suspicious_events) * 15,
            correlations=[correlation],
            indicators=list(indicators),
            timeline=suspicious_events,
        )]

    def get_correlation_summary(self, incidents: list[CorrelatedIncident]) -> dict:
        """Get summary of correlations."""
        return {
            "total_incidents": len(incidents),
            "total_correlations": sum(len(i.correlations) for i in incidents),
            "high_severity_count": len([i for i in incidents if i.severity_score > 30]),
            "indicators": list(set(
                ind for inc in incidents for ind in inc.indicators
            )),
        }


from enum import Enum