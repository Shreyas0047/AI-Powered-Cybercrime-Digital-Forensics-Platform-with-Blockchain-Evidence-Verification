"""Structured JSON log formatter shared across the sandbox agent.

Output schema mirrors what the Node backend emits with Winston so all three
services can be grep'd / shipped to the same log collector with one parser.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    """Render a LogRecord as a single-line JSON object."""

    def __init__(self, service: str) -> None:
        super().__init__()
        self.service = service

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "service": self.service,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Optional fields that are useful for cross-service tracing.
        for attr in ("correlation_id", "session_id"):
            value = getattr(record, attr, None)
            if value is not None:
                payload[attr] = value

        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str, ensure_ascii=False)


def configure_json_logging(service: str, level: str | None = None) -> None:
    """Replace any existing handlers on the root logger with a single
    JSON-formatted stream handler. Idempotent."""
    from agent.tracing import TracingFilter

    log_level = (level or os.environ.get("LOG_LEVEL") or "INFO").upper()

    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(JsonFormatter(service=service))
    handler.addFilter(TracingFilter())

    root = logging.getLogger()
    root.setLevel(log_level)
    # Clear pre-existing handlers (e.g. ones set by uvicorn or basicConfig)
    for existing in list(root.handlers):
        root.removeHandler(existing)
    root.addHandler(handler)

    # Prevent uvicorn-style duplicate emission via its access logger.
    for noisy in ("uvicorn.access",):
        lg = logging.getLogger(noisy)
        lg.handlers.clear()
        lg.propagate = True
