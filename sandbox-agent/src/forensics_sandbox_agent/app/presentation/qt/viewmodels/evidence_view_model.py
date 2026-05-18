"""View model for evidence artifacts and suspicious activities."""

from __future__ import annotations

import logging
from typing import Any, Optional

from forensics_sandbox_agent.app.bootstrap.runtime import ApplicationRuntime
from forensics_sandbox_agent.infrastructure.monitoring.event_models import ForensicEvent, SuspiciousActivity


class EvidenceArtifact:
    """A forensic event presented as an evidence artifact."""

    def __init__(self, event: ForensicEvent) -> None:
        self._event = event
        self._id = event.event_id
        self._timestamp = event.timestamp
        self._category = event.category.value
        self._operation = event.operation.value
        self._severity = event.severity.value
        self._source = event.source
        self._details = dict(event.details)

    @property
    def id(self) -> str:
        return self._id

    @property
    def timestamp(self) -> str:
        return self._timestamp.strftime("%Y-%m-%d %H:%M:%S")

    @property
    def category(self) -> str:
        return self._category

    @property
    def operation(self) -> str:
        return self._operation

    @property
    def severity(self) -> str:
        return self._severity

    @property
    def source(self) -> str:
        return self._source

    @property
    def details(self) -> dict[str, Any]:
        return self._details

    @property
    def raw_event(self) -> ForensicEvent:
        return self._event

    def __repr__(self) -> str:
        return f"EvidenceArtifact({self._id}, {self._category}, {self._severity})"


class EvidenceViewModel:
    """Loads forensic events and suspicious activities as evidence artifacts."""

    def __init__(self, runtime: ApplicationRuntime) -> None:
        self._runtime = runtime
        self._logger = logging.getLogger(
            "forensics_sandbox_agent.presentation.evidence"
        )
        self._all_artifacts: list[EvidenceArtifact] = []
        self._suspicious_activities: list[SuspiciousActivity] = []
        self._selected: Optional[EvidenceArtifact] = None
        self._category_filter = ""
        self._severity_filter = ""
        self._search_filter = ""
        self._output = ""
        self._refresh()

    @property
    def artifacts(self) -> list[EvidenceArtifact]:
        filtered = self._all_artifacts
        if self._category_filter:
            filtered = [
                a for a in filtered if a.category == self._category_filter
            ]
        if self._severity_filter:
            filtered = [
                a for a in filtered if a.severity == self._severity_filter
            ]
        if self._search_filter:
            term = self._search_filter.lower()
            filtered = [
                a
                for a in filtered
                if term in a.operation.lower()
                or term in a.category.lower()
                or term in str(a.details).lower()
            ]
        return filtered

    @property
    def suspicious_activities(self) -> list[SuspiciousActivity]:
        return self._suspicious_activities

    @property
    def selected_artifact(self) -> Optional[EvidenceArtifact]:
        return self._selected

    @property
    def output(self) -> str:
        return self._output

    @property
    def total_artifacts(self) -> int:
        return len(self._all_artifacts)

    @property
    def verified_count(self) -> int:
        return len(
            [
                a
                for a in self._all_artifacts
                if a.severity in ("critical", "high")
            ]
        )

    def refresh(self) -> None:
        self._refresh()
        self.append_output(
            f"Loaded {len(self._all_artifacts)} artifacts, {len(self._suspicious_activities)} suspicious activities"
        )

    def _refresh(self) -> None:
        try:
            coordinator = self._runtime.services.monitoring_coordinator
            if coordinator:
                events = coordinator.get_events()
                self._all_artifacts = [
                    EvidenceArtifact(e) for e in events
                ]
                self._suspicious_activities = (
                    coordinator.get_suspicious_activities()
                )
        except Exception as exc:
            self._logger.warning("Could not refresh evidence: %s", exc)

    def select_artifact(self, artifact: EvidenceArtifact) -> None:
        self._selected = artifact

    def clear_selection(self) -> None:
        self._selected = None

    def set_category_filter(self, value: str) -> None:
        self._category_filter = value

    def set_severity_filter(self, value: str) -> None:
        self._severity_filter = value

    def set_search_filter(self, value: str) -> None:
        self._search_filter = value

    def append_output(self, text: str) -> None:
        from datetime import datetime

        self._output += f"[{datetime.now().strftime('%H:%M:%S')}] {text}\n"

    def clear_output(self) -> None:
        self._output = ""