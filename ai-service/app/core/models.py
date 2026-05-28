"""
Core Data Models for AI Analysis
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum


class SeverityLevel(str, Enum):
    """Severity classification levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "informational"


class ThreatCategory(str, Enum):
    """Educational threat classification categories"""
    RANSOMWARE_LIKE = "ransomware_like"
    SPYWARE_LIKE = "spyware_like"
    TROJAN_LIKE = "trojan_like"
    BOTNET_LIKE = "botnet_like"
    CREDENTIAL_ACCESS = "credential_access"
    PERSISTENCE = "persistence"
    PROCESS_INJECTION = "process_injection"
    DATA_EXFILTRATION = "data_exfiltration"
    DESTRUCTIVE = "destructive"
    SUSPICIOUS_BEHAVIOR = "suspicious_behavior"
    NORMAL = "normal"


class TelemetryEvent(BaseModel):
    """Telemetry event from sandbox"""
    timestamp: str
    type: str  # process, file, registry, network
    source: str
    details: Dict[str, Any] = Field(default_factory=dict)
    suspicious_score: Optional[float] = None


class TelemetryAnalysisRequest(BaseModel):
    """Request for telemetry analysis"""
    session_id: str
    investigation_id: Optional[str] = None
    events: List[TelemetryEvent]
    metadata: Optional[Dict[str, Any]] = None


class TelemetryAnalysisResult(BaseModel):
    """Result of telemetry analysis"""
    session_id: str
    analysis_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_events: int
    suspicious_events: int
    threat_classification: Dict[str, float]
    severity_score: float
    severity_level: SeverityLevel
    anomalies: List[Dict[str, Any]]
    behavioral_summary: str
    recommendations: List[str]
    confidence: float


class ForensicFeatureSet(BaseModel):
    """Extracted forensic features"""
    # Process features
    total_processes: int = 0
    suspicious_processes: int = 0
    process_tree_depth: int = 0
    suspicious_commands: List[str] = Field(default_factory=list)

    # File features
    file_operations: int = 0
    file_creates: int = 0
    file_modifications: int = 0
    file_deletes: int = 0
    suspicious_extensions: List[str] = Field(default_factory=list)

    # Registry features
    registry_operations: int = 0
    registry_writes: int = 0
    persistence_keys: List[str] = Field(default_factory=list)

    # Network features
    network_connections: int = 0
    external_ips: List[str] = Field(default_factory=list)
    suspicious_ports: List[int] = Field(default_factory=list)

    # Behavioral features
    encryption_indicators: int = 0
    credential_access_indicators: int = 0
    download_indicators: int = 0


class ThreatClassificationResult(BaseModel):
    """Threat classification result"""
    category: ThreatCategory
    confidence: float
    indicators: List[str]
    reasoning: str


class SeverityScoreResult(BaseModel):
    """Severity scoring result"""
    score: float
    level: SeverityLevel
    factors: Dict[str, float]
    reasoning: str


class AnomalyResult(BaseModel):
    """Anomaly detection result"""
    type: str
    description: str
    severity: SeverityLevel
    events_involved: List[str]
    deviation_score: float


class InvestigationSummary(BaseModel):
    """AI-generated investigation summary"""
    executive_summary: str
    analyst_summary: str
    key_findings: List[str]
    timeline_summary: str
    recommendations: List[str]
    confidence: float


class AnalysisResponse(BaseModel):
    """Standard API response"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None