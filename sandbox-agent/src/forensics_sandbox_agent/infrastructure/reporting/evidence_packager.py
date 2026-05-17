"""Forensic Evidence Packaging - structures evidence for investigation."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

from forensics_sandbox_agent.app.config.reporting_models import EvidencePackagingConfig
from forensics_sandbox_agent.infrastructure.monitoring.event_models import (
    ForensicEvent,
    ForensicSessionSummary,
    SuspiciousActivity,
)


@dataclass
class EvidenceItem:
    """Individual evidence item."""
    evidence_id: str
    evidence_type: str
    category: str
    description: str
    timestamp: datetime
    data: dict = field(default_factory=dict)


@dataclass
class EvidenceManifest:
    """Manifest of all evidence items."""
    manifest_id: str
    session_id: str
    created_at: datetime
    evidence_items: list[EvidenceItem] = field(default_factory=list)
    total_items: int = 0

    def to_dict(self) -> dict:
        """Convert to dictionary for serialization."""
        return {
            "manifest_id": self.manifest_id,
            "session_id": self.session_id,
            "created_at": self.created_at.isoformat(),
            "total_items": self.total_items,
            "evidence_items": [
                {
                    "evidence_id": e.evidence_id,
                    "evidence_type": e.evidence_type,
                    "category": e.category,
                    "description": e.description,
                    "timestamp": e.timestamp.isoformat(),
                    "data": e.data,
                }
                for e in self.evidence_items
            ],
        }


class ForensicEvidencePackager:
    """Packages forensic evidence into structured objects."""

    def __init__(
        self,
        config: EvidencePackagingConfig,
        logger: logging.Logger,
    ) -> None:
        self._config = config
        self._logger = logger

    def package_evidence(
        self,
        session_id: str,
        events: list[ForensicEvent],
        session_summary: ForensicSessionSummary,
        suspicious_activities: list[SuspiciousActivity],
    ) -> EvidenceManifest:
        """Package all evidence into a manifest."""
        manifest = EvidenceManifest(
            manifest_id=str(uuid.uuid4()),
            session_id=session_id,
            created_at=datetime.now(),
        )

        if self._config.generate_manifests:
            manifest.evidence_items.extend(self._generate_event_evidence(events))
            manifest.evidence_items.extend(self._generate_suspicious_evidence(suspicious_activities))
            manifest.evidence_items.extend(self._generate_summary_evidence(session_summary))

        manifest.total_items = len(manifest.evidence_items)

        self._logger.info(f"Packaged {manifest.total_items} evidence items for session {session_id}")
        return manifest

    def _generate_event_evidence(self, events: list[ForensicEvent]) -> list[EvidenceItem]:
        """Generate evidence items from forensic events."""
        items = []

        for event in events[:500]:
            item = EvidenceItem(
                evidence_id=event.event_id,
                evidence_type="forensic_event",
                category=event.category.value,
                description=f"{event.operation.value} - {event.source}",
                timestamp=event.timestamp,
                data=event.to_dict(),
            )
            items.append(item)

        return items

    def _generate_suspicious_evidence(
        self,
        suspicious_activities: list[SuspiciousActivity],
    ) -> list[EvidenceItem]:
        """Generate evidence items from suspicious activities."""
        items = []

        for activity in suspicious_activities:
            item = EvidenceItem(
                evidence_id=str(uuid.uuid4()),
                evidence_type="suspicious_activity",
                category="behavior",
                description=activity.description,
                timestamp=datetime.now(),
                data={
                    "indicator": activity.indicator_type.value,
                    "severity": activity.severity.value,
                    "evidence": activity.evidence,
                    "recommended_action": activity.recommended_action,
                },
            )
            items.append(item)

        return items

    def _generate_summary_evidence(
        self,
        session_summary: ForensicSessionSummary,
    ) -> list[EvidenceItem]:
        """Generate evidence from session summary."""
        items = []

        item = EvidenceItem(
            evidence_id=str(uuid.uuid4()),
            evidence_type="session_summary",
            category="metadata",
            description=f"Session summary with {session_summary.total_events} events",
            timestamp=session_summary.start_time,
            data=session_summary.to_dict(),
        )
        items.append(item)

        return items

    def save_manifest(self, manifest: EvidenceManifest, output_dir: Path) -> Path:
        """Save evidence manifest to disk."""
        output_dir.mkdir(parents=True, exist_ok=True)

        filename = f"evidence_manifest_{manifest.session_id}_{manifest.created_at.strftime('%Y%m%d_%H%M%S')}.json"
        filepath = output_dir / filename

        import json
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(manifest.to_dict(), f, indent=2)

        self._logger.info(f"Saved evidence manifest to {filepath}")
        return filepath