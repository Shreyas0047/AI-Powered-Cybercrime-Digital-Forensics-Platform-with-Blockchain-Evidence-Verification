"""Local repository placeholder for exported reports and metadata."""

from __future__ import annotations

from logging import Logger

from forensics_sandbox_agent.app.config.models import AppSettings


class LocalReportRepository:
    """Encapsulates future on-disk report persistence."""

    def __init__(self, settings: AppSettings, logger: Logger) -> None:
        self._settings = settings
        self._logger = logger

    def ensure_export_directory(self) -> None:
        exports_dir = self._settings.paths.exports_dir
        exports_dir.mkdir(parents=True, exist_ok=True)
        self._logger.info("Ensured export directory exists at %s", exports_dir)

    def get_all_reports(self) -> list:
        """Get all exported reports from the filesystem."""
        exports_dir = self._settings.paths.exports_dir
        if not exports_dir.exists():
            return []
        
        # Look for JSON report files
        return list(exports_dir.glob("*.json"))
