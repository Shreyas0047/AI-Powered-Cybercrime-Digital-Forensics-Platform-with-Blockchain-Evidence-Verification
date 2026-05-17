"""Reporting service placeholder."""

from __future__ import annotations

from logging import Logger

from forensics_sandbox_agent.app.config.models import AppSettings


class ReportService:
    """Future entry point for report construction and export.

    The class exists now so orchestration and UI layers can be built against a
    stable dependency boundary.
    """

    def __init__(self, settings: AppSettings, logger: Logger) -> None:
        self._settings = settings
        self._logger = logger

    def initialize_report_context(self) -> None:
        self._logger.info(
            "Report service initialized with schema version %s",
            self._settings.reporting.schema_version,
        )
