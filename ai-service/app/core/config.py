"""
AI Service Configuration
"""

import os
from typing import Optional

class AIServiceConfig:
    """AI Service Configuration"""

    # Service settings
    SERVICE_NAME: str = "Forensic AI Analysis Engine"
    SERVICE_VERSION: str = "1.0.0"
    HOST: str = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("AI_SERVICE_PORT", "8001"))

    # Analysis settings
    MAX_TELEMETRY_EVENTS: int = 10000
    MAX_PROCESSING_TIME: int = 300  # seconds

    # Severity thresholds
    CRITICAL_THRESHOLD: float = 80.0
    HIGH_THRESHOLD: float = 60.0
    MEDIUM_THRESHOLD: float = 40.0

    # Feature extraction settings
    MIN_PROCESS_COUNT: int = 5
    SUSPICIOUS_COMMAND_PATTERNS_ENABLED: bool = True

    # Anomaly detection
    ANOMALY_ZSCORE_THRESHOLD: float = 2.5

    # Summarization settings
    MAX_SUMMARY_LENGTH: int = 500
    EXECUTIVE_SUMMARY_LENGTH: int = 200

    # Classification confidence threshold
    MIN_CONFIDENCE: float = 0.5

    # Backend API connection
    BACKEND_API_URL: str = os.getenv("BACKEND_API_URL", "http://localhost:3000")
    BACKEND_API_TIMEOUT: int = 30

config = AIServiceConfig()