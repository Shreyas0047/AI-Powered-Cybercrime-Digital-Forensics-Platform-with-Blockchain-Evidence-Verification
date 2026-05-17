"""Configuration models for forensic reporting and threat classification."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(slots=True)
class ThreatClassificationConfig:
    enabled: bool = True
    use_heuristic_rules: bool = True
    classify_by_activity: bool = True
    confidence_threshold: float = 0.7


@dataclass(slots=True)
class SeverityScoringConfig:
    enabled: bool = True
    weight_process_activity: float = 1.0
    weight_file_operations: float = 1.5
    weight_registry_operations: float = 2.0
    weight_network_activity: float = 1.0
    weight_persistence_indicators: float = 3.0
    weight_mass_file_mods: float = 2.0
    weight_rapid_process_spawn: float = 1.5
    low_threshold: float = 10.0
    medium_threshold: float = 30.0
    high_threshold: float = 60.0


@dataclass(slots=True)
class EventCorrelationConfig:
    enabled: bool = True
    correlate_process_chains: bool = True
    correlate_file_registry: bool = True
    correlate_timing: bool = True
    correlation_window_seconds: int = 30


@dataclass(slots=True)
class EvidencePackagingConfig:
    enabled: bool = True
    generate_manifests: bool = True
    attach_timeline: bool = True
    attach_classification: bool = True
    attach_severity: bool = True
    include_raw_events: bool = False


@dataclass(slots=True)
class ReportGenerationConfig:
    enabled: bool = True
    reports_dir: Path = field(default_factory=lambda: Path("../../exports/reports"))
    include_summary: bool = True
    include_timeline: bool = True
    include_evidence: bool = True
    include_classification: bool = True
    include_severity: bool = True
    json_format: bool = True
    include_metadata: bool = True


@dataclass(slots=True)
class InvestigationSummaryConfig:
    enabled: bool = True
    generate_narrative: bool = True
    include_recommendations: bool = True
    analyst_friendly: bool = True
    format_style: str = "soc_report"


@dataclass(slots=True)
class ReportingConfig:
    threat_classification: ThreatClassificationConfig = field(default_factory=ThreatClassificationConfig)
    severity_scoring: SeverityScoringConfig = field(default_factory=SeverityScoringConfig)
    event_correlation: EventCorrelationConfig = field(default_factory=EventCorrelationConfig)
    evidence_packaging: EvidencePackagingConfig = field(default_factory=EvidencePackagingConfig)
    report_generation: ReportGenerationConfig = field(default_factory=ReportGenerationConfig)
    investigation_summary: InvestigationSummaryConfig = field(default_factory=InvestigationSummaryConfig)