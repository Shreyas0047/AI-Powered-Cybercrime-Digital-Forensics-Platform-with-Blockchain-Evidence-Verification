"""Centralized logging setup.

The agent keeps application logging separate from future forensic evidence
records. This module is only for runtime diagnostics and operator support.
"""

from __future__ import annotations

import logging
import os
import tempfile
from logging import Logger
from pathlib import Path

from forensics_sandbox_agent.app.config.models import AppSettings


def configure_logging(settings: AppSettings) -> Logger:
    """Configure and return the root application logger."""
    logs_dir = settings.paths.logs_dir
    logs_dir.mkdir(parents=True, exist_ok=True)

    root_logger = logging.getLogger("forensics_sandbox_agent")
    root_logger.setLevel(settings.logging.level.upper())

    _reset_handlers(root_logger)

    formatter = logging.Formatter(settings.logging.format)
    log_path = logs_dir / settings.logging.file_name
    file_handler = _create_file_handler(log_path)
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)

    for category in settings.logging.categories:
        category_logger = logging.getLogger(f"forensics_sandbox_agent.{category}")
        category_logger.setLevel(settings.logging.level.upper())
        _reset_handlers(category_logger)
        category_path = logs_dir / f"{category}.log"
        category_handler = _create_file_handler(category_path)
        category_handler.setFormatter(formatter)
        category_logger.addHandler(category_handler)
        category_logger.propagate = True

    root_logger.debug("Logging configured under %s", Path(logs_dir).resolve())
    return root_logger


def _reset_handlers(logger: Logger) -> None:
    """Close existing handlers so stale editable installs cannot pin old paths."""
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
        handler.close()


def _create_file_handler(path: Path) -> logging.Handler:
    """Create a file handler, falling back when Windows has a stale file lock."""
    candidates = [
        path,
        path.with_name(f"{path.stem}.{os.getpid()}{path.suffix}"),
        Path(tempfile.gettempdir()) / "forensics_sandbox_agent" / f"{path.stem}.{os.getpid()}{path.suffix}",
    ]

    for candidate in candidates:
        try:
            candidate.parent.mkdir(parents=True, exist_ok=True)
            return logging.FileHandler(candidate, mode="w", encoding="utf-8")
        except PermissionError:
            continue

    return logging.NullHandler()


def get_component_logger(component_name: str) -> Logger:
    """Return a namespaced logger for a platform subsystem."""
    return logging.getLogger(f"forensics_sandbox_agent.{component_name}")
