"""Core data models — the single source of truth for the entire system.

This module defines:
  - ForensicEvent: The telemetry schema consumed by the frontend dashboard
  - SessionState: State machine enum for session lifecycle
  - RuntimeSession: The session object returned by all API endpoints
  - API request/response models matching the Node.js backend contract
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# =============================================================================
# FORENSIC EVENT SCHEMA — matches frontend dashboard expectations
# =============================================================================

class EventCategory(str, Enum):
    PROCESS = "PROCESS"
    FILE = "FILE"
    REGISTRY = "REGISTRY"
    NETWORK = "NETWORK"


class EventSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    INFO = "INFO"


class ForensicEvent(BaseModel):
    """Universal forensic telemetry event — the schema the frontend renders."""
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    category: EventCategory
    operation: str  # CREATE_THREAD, WRITE_FILE, SET_VALUE, CONNECT, etc.
    source_process: str = "unknown"
    target: str = ""
    severity: EventSeverity = EventSeverity.INFO
    metadata: dict[str, Any] = Field(default_factory=dict)

    # Compatibility fields for the frontend telemetry store
    @property
    def event_type(self) -> str:
        return self.category.value.lower()


# =============================================================================
# SESSION STATE MACHINE
# =============================================================================

class SessionState(str, Enum):
    """Session lifecycle states — visible to the frontend."""
    PENDING = "pending"
    REVERTING = "reverting"
    STAGING = "staging"
    EXECUTING = "executing"
    OBSERVING = "observing"
    COMPLETED = "completed"
    FAILED = "failed"


# =============================================================================
# RUNTIME SESSION — the object returned by all session endpoints
# =============================================================================

class RuntimeSession(BaseModel):
    """Matches the RuntimeSession interface in sandbox-runtime.service.ts."""
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    state: SessionState = SessionState.PENDING
    simulator_id: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    error: Optional[str] = None

    def transition(self, new_state: SessionState, error: Optional[str] = None) -> None:
        self.state = new_state
        self.updated_at = datetime.now(timezone.utc).isoformat()
        if error:
            self.error = error


# =============================================================================
# API CONTRACTS — matching what the Node.js backend sends/expects
# =============================================================================

class StartSessionRequest(BaseModel):
    simulator_id: str
    auto_rollback: bool = True
    timeout_seconds: int = 300


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str = "2.0.0"
    uptime_seconds: float = 0
    vm_status: dict[str, Any] = Field(default_factory=dict)
    active_sessions: int = 0
    telemetry_connections: int = 0


class SimulatorInfo(BaseModel):
    id: str
    display_name: str
    description: str
    category: str


class MonitoringStatus(BaseModel):
    """Flat monitoring status — matches what the frontend sandboxStore expects."""
    total_events: int = 0
    process_count: int = 0
    file_operations_count: int = 0
    registry_operations_count: int = 0
    network_operations_count: int = 0
    behavior_alerts: int = 0
    is_active: bool = False
    session_id: Optional[str] = None


class ExecutionStatus(BaseModel):
    history_count: int = 0
    current_session: Optional[dict[str, Any]] = None
    recent_sessions: list[dict[str, Any]] = Field(default_factory=list)
