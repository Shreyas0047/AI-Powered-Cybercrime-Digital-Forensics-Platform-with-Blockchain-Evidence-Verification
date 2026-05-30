"""Context-aware tracing for the AI service.

Uses ContextVar to store and propagate correlation IDs across async tasks.
"""

from __future__ import annotations

import logging
from contextvars import ContextVar
from typing import Optional

# Global context for the current request's correlation ID
correlation_id: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)


class TracingFilter(logging.Filter):
    """Logging filter that injects the current correlation_id into LogRecords."""

    def filter(self, record: logging.LogRecord) -> bool:
        cid = correlation_id.get()
        if cid:
            record.correlation_id = cid
        return True
