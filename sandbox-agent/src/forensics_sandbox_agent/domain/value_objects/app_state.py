"""Simple application state markers for the desktop shell."""

from __future__ import annotations

from enum import Enum


class SessionState(str, Enum):
    IDLE = "idle"
    PREFLIGHT = "preflight"
    RUNNING = "running"
    REPORTING = "reporting"
    FAILED = "failed"
