"""Threat Severity Engine - configurable severity scoring for forensic events."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict

from forensics_sandbox_agent.app.config.reporting_models import SeverityScoringConfig
from forensics_sandbox_agent.infrastructure.monitoring.event_models import (
    ForensicEvent,
    EventCategory,
    EventSeverity,
    SuspiciousIndicator,
    ForensicSessionSummary,
)


class SeverityLevel(Enum):
    """Overall severity level."""
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SeverityScore:
    """Detailed severity scoring result."""
    total_score: float
    level: SeverityLevel
    category_scores: dict[str, float] = field(default_factory=dict)
    indicator_scores: dict[str, float] = field(default_factory=dict)
    contributing_factors: list[str] = field(default_factory=list)


@dataclass
class SeverityBreakdown:
    """Breakdown of severity components."""
    process_score: float = 0.0
    file_score: float = 0.0
    registry_score: float = 0.0
    network_score: float = 0.0
    persistence_score: float = 0.0
    behavior_score: float = 0.0
    suspicious_indicator_bonus: float = 0.0


class ThreatSeverityEngine:
    """Calculates configurable severity scores for forensic events."""

    def __init__(
        self,
        config: SeverityScoringConfig,
        logger: logging.Logger,
    ) -> None:
        self._config = config
        self._logger = logger

    def calculate_severity(
        self,
        events: list[ForensicEvent],
        session_summary: ForensicSessionSummary,
    ) -> SeverityScore:
        """Calculate overall severity score."""
        if not self._config.enabled:
            return SeverityScore(
                total_score=0.0,
                level=SeverityLevel.INFO,
            )

        breakdown = self._calculate_breakdown(events, session_summary)
        total_score = self._compute_total_score(breakdown)
        level = self._score_to_level(total_score)

        return SeverityScore(
            total_score=total_score,
            level=level,
            category_scores={
                "process": breakdown.process_score,
                "file": breakdown.file_score,
                "registry": breakdown.registry_score,
                "network": breakdown.network_score,
                "persistence": breakdown.persistence_score,
                "behavior": breakdown.behavior_score,
            },
            indicator_scores=self._calculate_indicator_scores(events),
            contributing_factors=self._get_contributing_factors(breakdown),
        )

    def _calculate_breakdown(
        self,
        events: list[ForensicEvent],
        session_summary: ForensicSessionSummary,
    ) -> SeverityBreakdown:
        """Calculate severity breakdown by category."""
        breakdown = SeverityBreakdown()

        event_counts = defaultdict(int)
        for event in events:
            event_counts[event.category] += 1

        breakdown.process_score = event_counts.get(EventCategory.PROCESS, 0) * self._config.weight_process_activity
        breakdown.file_score = event_counts.get(EventCategory.FILE_SYSTEM, 0) * self._config.weight_file_operations
        breakdown.registry_score = event_counts.get(EventCategory.REGISTRY, 0) * self._config.weight_registry_operations
        breakdown.network_score = event_counts.get(EventCategory.NETWORK, 0) * self._config.weight_network_activity

        if session_summary.suspicious_activities:
            for activity in session_summary.suspicious_activities:
                if activity.indicator_type == SuspiciousIndicator.PERSISTENCE_ATTEMPT:
                    breakdown.persistence_score += self._config.weight_persistence_indicators
                elif activity.indicator_type == SuspiciousIndicator.MASS_FILE_ACTIVITY:
                    breakdown.persistence_score += self._config.weight_mass_file_mods
                elif activity.indicator_type == SuspiciousIndicator.RAPID_PROCESS_SPAWN:
                    breakdown.persistence_score += self._config.weight_rapid_process_spawn

        breakdown.suspicious_indicator_bonus = self._calculate_indicator_bonus(events)

        return breakdown

    def _calculate_indicator_bonus(self, events: list[ForensicEvent]) -> float:
        """Calculate bonus score from suspicious indicators."""
        indicator_counts = defaultdict(int)
        for event in events:
            for indicator in event.suspicious_indicators:
                indicator_counts[indicator] += 1

        bonus = 0.0
        if indicator_counts.get(SuspiciousIndicator.PERSISTENCE_ATTEMPT, 0) > 0:
            bonus += 20
        if indicator_counts.get(SuspiciousIndicator.MASS_FILE_ACTIVITY, 0) > 0:
            bonus += 15
        if indicator_counts.get(SuspiciousIndicator.RAPID_PROCESS_SPAWN, 0) > 0:
            bonus += 10
        if indicator_counts.get(SuspiciousIndicator.SUSPICIOUS_NETWORK, 0) > 0:
            bonus += 15
        if indicator_counts.get(SuspiciousIndicator.SUSPICIOUS_PATH, 0) > 0:
            bonus += 10

        return bonus

    def _calculate_indicator_scores(self, events: list[ForensicEvent]) -> dict[str, float]:
        """Calculate scores by suspicious indicator type."""
        scores = defaultdict(float)
        for event in events:
            for indicator in event.suspicious_indicators:
                scores[indicator.value] += 10
        return dict(scores)

    def _compute_total_score(self, breakdown: SeverityBreakdown) -> float:
        """Compute total severity score."""
        return (
            breakdown.process_score +
            breakdown.file_score +
            breakdown.registry_score +
            breakdown.network_score +
            breakdown.persistence_score +
            breakdown.behavior_score +
            breakdown.suspicious_indicator_bonus
        )

    def _score_to_level(self, score: float) -> SeverityLevel:
        """Convert numeric score to severity level."""
        if score >= self._config.high_threshold:
            return SeverityLevel.CRITICAL
        elif score >= self._config.medium_threshold:
            return SeverityLevel.HIGH
        elif score >= self._config.low_threshold:
            return SeverityLevel.MEDIUM
        else:
            return SeverityLevel.LOW

    def _get_contributing_factors(self, breakdown: SeverityBreakdown) -> list[str]:
        """Get human-readable contributing factors."""
        factors = []

        if breakdown.file_score > 30:
            factors.append("High file system activity")
        if breakdown.registry_score > 20:
            factors.append("Registry modifications detected")
        if breakdown.persistence_score > 15:
            factors.append("Persistence indicators present")
        if breakdown.suspicious_indicator_bonus > 20:
            factors.append("Multiple suspicious behavior patterns")
        if breakdown.network_score > 10:
            factors.append("Network activity observed")

        return factors

    def get_severity_label(self, level: SeverityLevel) -> str:
        """Get display label for severity level."""
        labels = {
            SeverityLevel.INFO: "Informational",
            SeverityLevel.LOW: "Low",
            SeverityLevel.MEDIUM: "Medium",
            SeverityLevel.HIGH: "High",
            SeverityLevel.CRITICAL: "Critical",
        }
        return labels.get(level, "Unknown")

    def get_severity_color(self, level: SeverityLevel) -> str:
        """Get color code for severity level."""
        colors = {
            SeverityLevel.INFO: "#666666",
            SeverityLevel.LOW: "#4caf50",
            SeverityLevel.MEDIUM: "#ff9800",
            SeverityLevel.HIGH: "#f44336",
            SeverityLevel.CRITICAL: "#9c27b0",
        }
        return colors.get(level, "#666666")