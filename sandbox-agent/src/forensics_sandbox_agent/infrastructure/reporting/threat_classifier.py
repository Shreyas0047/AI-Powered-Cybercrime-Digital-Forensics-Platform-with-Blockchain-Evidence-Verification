"""Threat Classification Engine - deterministic heuristic-based threat categorization."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from collections import defaultdict

from forensics_sandbox_agent.app.config.reporting_models import ThreatClassificationConfig
from forensics_sandbox_agent.infrastructure.monitoring.event_models import (
    ForensicEvent,
    EventCategory,
    SuspiciousIndicator,
)


class ThreatCategory(Enum):
    """Threat categories for classification."""
    RANSOMWARE_LIKE = "ransomware_like"
    SPYWARE_LIKE = "spyware_like"
    TROJAN_LIKE = "trojan_like"
    BOTNET_LIKE = "botnet_like"
    CREDENTIAL_ACCESS = "credential_access"
    PERSISTENCE_INDICATOR = "persistence_indicator"
    SUSPICIOUS_BEHAVIOR = "suspicious_behavior"
    BENIGN = "benign"


class ThreatFamily(Enum):
    """Major threat families."""
    RANSOMWARE = "ransomware"
    SPYWARE = "spyware"
    TROJAN = "trojan"
    BOTNET = "botnet"
    CREDENTIAL_STEALER = "credential_stealer"
    BACKDOOR = "backdoor"
    UNKNOWN = "unknown"


@dataclass
class ThreatClassification:
    """Result of threat classification."""
    category: ThreatCategory
    family: ThreatFamily
    confidence: float
    indicators: list[str] = field(default_factory=list)
    reasoning: str = ""


@dataclass
class ClassificationResult:
    """Complete classification result with multiple categories."""
    primary_classification: ThreatClassification
    secondary_classifications: list[ThreatClassification] = field(default_factory=list)
    all_categories_detected: list[ThreatCategory] = field(default_factory=list)
    confidence_score: float = 0.0


class ThreatClassificationEngine:
    """Deterministic threat classification based on behavioral heuristics."""

    def __init__(
        self,
        config: ThreatClassificationConfig,
        logger: logging.Logger,
    ) -> None:
        self._config = config
        self._logger = logger

    def classify(self, events: list[ForensicEvent], simulator_id: str) -> ClassificationResult:
        """Classify threat based on forensic events."""
        if not self._config.enabled:
            return self._default_classification()

        category_scores = self._calculate_category_scores(events)
        primary_category = max(category_scores.items(), key=lambda x: x[1])

        classification = self._build_classification(
            primary_category[0],
            primary_category[1],
            events,
            simulator_id,
        )

        secondary = self._get_secondary_classifications(category_scores, events)

        return ClassificationResult(
            primary_classification=classification,
            secondary_classifications=secondary,
            all_categories_detected=[cat for cat, score in category_scores.items() if score > 0],
            confidence_score=min(primary_category[1] / 100.0, 1.0),
        )

    def _calculate_category_scores(self, events: list[ForensicEvent]) -> dict[ThreatCategory, float]:
        """Calculate scores for each threat category."""
        scores = defaultdict(float)

        for event in events:
            self._score_event(event, scores)

        return dict(scores)

    def _score_event(self, event: ForensicEvent, scores: dict[ThreatCategory, float]) -> None:
        """Score an individual event for threat categories."""
        category = event.category
        operation = event.operation.value
        indicators = event.suspicious_indicators

        if category == EventCategory.FILE_SYSTEM:
            if "create" in operation or "modify" in operation:
                scores[ThreatCategory.RANSOMWARE_LIKE] += 15
                scores[ThreatCategory.SUSPICIOUS_BEHAVIOR] += 5
            if SuspiciousIndicator.MASS_FILE_ACTIVITY in indicators:
                scores[ThreatCategory.RANSOMWARE_LIKE] += 30

        if category == EventCategory.PROCESS:
            if "start" in operation:
                scores[ThreatCategory.TROJAN_LIKE] += 10
                scores[ThreatCategory.SUSPICIOUS_BEHAVIOR] += 5
            if SuspiciousIndicator.RAPID_PROCESS_SPAWN in indicators:
                scores[ThreatCategory.BOTNET_LIKE] += 20

        if category == EventCategory.REGISTRY:
            if "create" in operation or "modify" in operation:
                scores[ThreatCategory.PERSISTENCE_INDICATOR] += 25
                scores[ThreatCategory.TROJAN_LIKE] += 10
            if SuspiciousIndicator.PERSISTENCE_ATTEMPT in indicators:
                scores[ThreatCategory.PERSISTENCE_INDICATOR] += 35

        if category == EventCategory.NETWORK:
            if "connect" in operation:
                scores[ThreatCategory.BOTNET_LIKE] += 15
                scores[ThreatCategory.SPYWARE_LIKE] += 10
            if "dns" in operation:
                scores[ThreatCategory.SPYWARE_LIKE] += 5
                scores[ThreatCategory.BOTNET_LIKE] += 5
            if SuspiciousIndicator.SUSPICIOUS_NETWORK in indicators:
                scores[ThreatCategory.BOTNET_LIKE] += 25
                scores[ThreatCategory.SUSPICIOUS_BEHAVIOR] += 15

        if category == EventCategory.BEHAVIOR:
            scores[ThreatCategory.SUSPICIOUS_BEHAVIOR] += 20

    def _build_classification(
        self,
        category: ThreatCategory,
        score: float,
        events: list[ForensicEvent],
        simulator_id: str,
    ) -> ThreatClassification:
        """Build a complete classification."""
        family = self._category_to_family(category)
        reasoning = self._generate_reasoning(category, events, simulator_id)

        return ThreatClassification(
            category=category,
            family=family,
            confidence=min(score / 100.0, 1.0),
            indicators=self._extract_indicators(events),
            reasoning=reasoning,
        )

    def _category_to_family(self, category: ThreatCategory) -> ThreatFamily:
        """Map category to threat family."""
        mapping = {
            ThreatCategory.RANSOMWARE_LIKE: ThreatFamily.RANSOMWARE,
            ThreatCategory.SPYWARE_LIKE: ThreatFamily.SPYWARE,
            ThreatCategory.TROJAN_LIKE: ThreatFamily.TROJAN,
            ThreatCategory.BOTNET_LIKE: ThreatFamily.BOTNET,
            ThreatCategory.CREDENTIAL_ACCESS: ThreatFamily.CREDENTIAL_STEALER,
            ThreatCategory.PERSISTENCE_INDICATOR: ThreatFamily.BACKDOOR,
            ThreatCategory.SUSPICIOUS_BEHAVIOR: ThreatFamily.UNKNOWN,
            ThreatCategory.BENIGN: ThreatFamily.UNKNOWN,
        }
        return mapping.get(category, ThreatFamily.UNKNOWN)

    def _generate_reasoning(self, category: ThreatCategory, events: list[ForensicEvent], simulator_id: str) -> str:
        """Generate explainable reasoning for classification."""
        event_counts = defaultdict(int)
        for event in events:
            event_counts[event.category] += 1

        reasoning_parts = [
            f"Classified as {category.value.replace('_', ' ').title()} behavior",
            f" based on analysis of {len(events)} events",
        ]

        if event_counts.get(EventCategory.FILE_SYSTEM, 0) > 10:
            reasoning_parts.append(f", {event_counts[EventCategory.FILE_SYSTEM]} file operations")
        if event_counts.get(EventCategory.PROCESS, 0) > 5:
            reasoning_parts.append(f", {event_counts[EventCategory.PROCESS]} process events")
        if event_counts.get(EventCategory.REGISTRY, 0) > 0:
            reasoning_parts.append(f", {event_counts[EventCategory.REGISTRY]} registry modifications")
        if event_counts.get(EventCategory.NETWORK, 0) > 0:
            reasoning_parts.append(f", {event_counts[EventCategory.NETWORK]} network connections")

        return "".join(reasoning_parts) + "."

    def _extract_indicators(self, events: list[ForensicEvent]) -> list[str]:
        """Extract unique indicators from events."""
        indicators = set()
        for event in events:
            for indicator in event.suspicious_indicators:
                indicators.add(indicator.value)
        return list(indicators)

    def _get_secondary_classifications(
        self,
        category_scores: dict[ThreatCategory, float],
        events: list[ForensicEvent],
    ) -> list[ThreatClassification]:
        """Get secondary threat classifications."""
        sorted_categories = sorted(
            category_scores.items(),
            key=lambda x: x[1],
            reverse=True,
        )

        secondary = []
        for category, score in sorted_categories[1:4]:
            if score > 5:
                classification = self._build_classification(category, score, events, "")
                secondary.append(classification)

        return secondary

    def _default_classification(self) -> ClassificationResult:
        """Return default benign classification."""
        return ClassificationResult(
            primary_classification=ThreatClassification(
                category=ThreatCategory.BENIGN,
                family=ThreatFamily.UNKNOWN,
                confidence=0.0,
                reasoning="Classification disabled",
            ),
            confidence_score=0.0,
        )


def classify_simulator_type(simulator_id: str) -> ThreatFamily:
    """Map simulator ID to expected threat family."""
    mapping = {
        "ransomware-simulator": ThreatFamily.RANSOMWARE,
        "spyware-simulator": ThreatFamily.SPYWARE,
        "trojan-simulator": ThreatFamily.TROJAN,
        "botnet-simulator": ThreatFamily.BOTNET,
        "credential-stealer-simulator": ThreatFamily.CREDENTIAL_STEALER,
    }
    return mapping.get(simulator_id, ThreatFamily.UNKNOWN)