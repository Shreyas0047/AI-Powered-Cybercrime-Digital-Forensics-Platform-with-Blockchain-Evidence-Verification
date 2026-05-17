"""
Severity Scoring Module

Calculates threat severity scores based on forensic analysis.
"""

from typing import Dict, Any

from app.core.models import (
    ForensicFeatureSet,
    SeverityLevel,
    SeverityScoreResult,
    ThreatCategory
)
from app.core.config import config


class SeverityScorer:
    """Calculates severity scores for forensic events"""

    # Base severity weights for different factors
    FACTOR_WEIGHTS = {
        # Critical factors (weight: 20)
        "encryption_operations": 20.0,
        "credential_access": 20.0,
        "data_exfiltration": 20.0,

        # High factors (weight: 15)
        "suspicious_processes": 15.0,
        "persistence_mechanisms": 15.0,
        "process_injection": 15.0,
        "mass_file_modification": 15.0,

        # Medium factors (weight: 10)
        "suspicious_commands": 10.0,
        "external_connections": 10.0,
        "registry_modifications": 10.0,
        "suspicious_ports": 10.0,

        # Low factors (weight: 5)
        "file_operations": 5.0,
        "network_connections": 5.0,
        "process_count": 3.0,
    }

    # Maximum values for normalization
    MAX_VALUES = {
        "suspicious_processes": 20,
        "suspicious_commands": 10,
        "persistence_mechanisms": 10,
        "file_operations": 100,
        "network_connections": 50,
        "external_connections": 10,
        "registry_modifications": 50,
    }

    def calculate_severity(
        self,
        features: ForensicFeatureSet,
        classifications: Dict[ThreatCategory, Any],
        anomaly_count: int = 0
    ) -> SeverityScoreResult:
        """Calculate overall severity score"""

        factors = {}
        total_score = 0.0

        # Process-related factors
        if features.suspicious_processes > 0:
            max_val = self.MAX_VALUES.get("suspicious_processes", 20)
            normalized = min(features.suspicious_processes / max_val, 1.0)
            factor_score = normalized * self.FACTOR_WEIGHTS["suspicious_processes"]
            factors["suspicious_processes"] = normalized * 100
            total_score += factor_score

        if features.suspicious_commands:
            count = len(features.suspicious_commands)
            max_val = self.MAX_VALUES.get("suspicious_commands", 10)
            normalized = min(count / max_val, 1.0)
            factor_score = normalized * self.FACTOR_WEIGHTS["suspicious_commands"]
            factors["suspicious_commands"] = normalized * 100
            total_score += factor_score

        # File operation factors
        if features.file_modifications > 10:
            max_val = self.MAX_VALUES.get("file_operations", 100)
            normalized = min(features.file_modifications / max_val, 1.0)
            factor_score = normalized * self.FACTOR_WEIGHTS["mass_file_modification"]
            factors["file_modifications"] = normalized * 100
            total_score += factor_score

        if features.file_deletes > 5:
            factor_score = min(features.file_deletes * 2, 15)
            factors["file_deletes"] = min(features.file_deletes * 10, 100)
            total_score += factor_score

        # Encryption indicators (critical)
        if features.encryption_indicators > 0:
            normalized = min(features.encryption_indicators / 5, 1.0)
            factor_score = normalized * self.FACTOR_WEIGHTS["encryption_operations"]
            factors["encryption_indicators"] = normalized * 100
            total_score += factor_score

        # Credential access (critical)
        if features.credential_access_indicators > 0:
            normalized = min(features.credential_access_indicators / 3, 1.0)
            factor_score = normalized * self.FACTOR_WEIGHTS["credential_access"]
            factors["credential_access"] = normalized * 100
            total_score += factor_score

        # Persistence mechanisms
        if features.persistence_keys:
            count = len(features.persistence_keys)
            max_val = self.MAX_VALUES.get("persistence_mechanisms", 10)
            normalized = min(count / max_val, 1.0)
            factor_score = normalized * self.FACTOR_WEIGHTS["persistence_mechanisms"]
            factors["persistence_keys"] = normalized * 100
            total_score += factor_score

        # Network factors
        if features.network_connections > 0:
            max_val = self.MAX_VALUES.get("network_connections", 50)
            normalized = min(features.network_connections / max_val, 1.0)
            factor_score = normalized * self.FACTOR_WEIGHTS["network_connections"]
            factors["network_activity"] = normalized * 100
            total_score += factor_score

        if features.external_ips:
            count = len(features.external_ips)
            max_val = self.MAX_VALUES.get("external_connections", 10)
            normalized = min(count / max_val, 1.0)
            factor_score = normalized * self.FACTOR_WEIGHTS["external_connections"]
            factors["external_connections"] = normalized * 100
            total_score += factor_score

        if features.suspicious_ports:
            count = len(features.suspicious_ports)
            factor_score = count * 5
            factors["suspicious_ports"] = min(count * 20, 100)
            total_score += factor_score

        # Registry modifications
        if features.registry_writes > 0:
            max_val = self.MAX_VALUES.get("registry_modifications", 50)
            normalized = min(features.registry_writes / max_val, 1.0)
            factor_score = normalized * self.FACTOR_WEIGHTS["registry_modifications"]
            factors["registry_modifications"] = normalized * 100
            total_score += factor_score

        # Download indicators
        if features.download_indicators > 0:
            normalized = min(features.download_indicators / 5, 1.0)
            factor_score = normalized * self.FACTOR_WEIGHTS["credential_access"]
            factors["download_indicators"] = normalized * 100
            total_score += factor_score

        # Threat classification boost
        threat_scores = {
            ThreatCategory.RANSOMWARE_LIKE: 25.0,
            ThreatCategory.DESTRUCTIVE: 25.0,
            ThreatCategory.DATA_EXFILTRATION: 20.0,
            ThreatCategory.CREDENTIAL_ACCESS: 20.0,
            ThreatCategory.PROCESS_INJECTION: 15.0,
            ThreatCategory.PERSISTENCE: 10.0,
            ThreatCategory.BOTNET_LIKE: 15.0,
            ThreatCategory.SPYWARE_LIKE: 15.0,
            ThreatCategory.TROJAN_LIKE: 10.0,
        }

        for category, result in classifications.items():
            if category != ThreatCategory.NORMAL and result.confidence > 0.5:
                boost = threat_scores.get(category, 0) * result.confidence
                total_score += boost

        # Anomaly boost
        if anomaly_count > 0:
            anomaly_boost = min(anomaly_count * 5, 20)
            total_score += anomaly_boost
            factors["anomalies"] = min(anomaly_count * 20, 100)

        # Normalize to 0-100 scale
        final_score = min(total_score, 100.0)

        # Determine severity level
        if final_score >= config.CRITICAL_THRESHOLD:
            level = SeverityLevel.CRITICAL
        elif final_score >= config.HIGH_THRESHOLD:
            level = SeverityLevel.HIGH
        elif final_score >= config.MEDIUM_THRESHOLD:
            level = SeverityLevel.MEDIUM
        else:
            level = SeverityLevel.LOW

        reasoning = self._generate_reasoning(final_score, level, factors, classifications)

        return SeverityScoreResult(
            score=round(final_score, 1),
            level=level,
            factors={k: round(v, 1) for k, v in factors.items()},
            reasoning=reasoning
        )

    def _generate_reasoning(
        self,
        score: float,
        level: SeverityLevel,
        factors: Dict[str, float],
        classifications: Dict[ThreatCategory, Any]
    ) -> str:
        """Generate human-readable reasoning for severity"""

        # Identify top factors
        top_factors = sorted(factors.items(), key=lambda x: x[1], reverse=True)[:3]
        factor_names = {
            "suspicious_processes": "suspicious processes",
            "suspicious_commands": "suspicious commands",
            "file_modifications": "file modifications",
            "file_deletes": "file deletions",
            "encryption_indicators": "encryption activity",
            "credential_access": "credential access attempts",
            "persistence_keys": "persistence mechanisms",
            "network_activity": "network activity",
            "external_connections": "external connections",
            "suspicious_ports": "suspicious network ports",
            "registry_modifications": "registry modifications",
            "download_indicators": "download activity",
            "anomalies": "anomalies detected"
        }

        reason = f"Severity level: {level.value.upper()} (score: {score:.1f}/100). "
        reason += "Primary factors: "

        if top_factors:
            factor_list = [factor_names.get(k, k) for k, v in top_factors]
            reason += ", ".join(factor_list[:2])
            if len(factor_list) > 2:
                reason += f" and {len(factor_list) - 2} others"

        # Add threat classification context
        threats = [c.value for c in classifications.keys() if c != ThreatCategory.NORMAL]
        if threats:
            reason += f". Detected threat types: {', '.join(threats[:2])}"

        return reason


severity_scorer = SeverityScorer()