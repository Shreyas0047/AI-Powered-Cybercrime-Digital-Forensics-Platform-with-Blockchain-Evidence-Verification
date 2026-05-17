"""File System Monitoring Service - tracks file activity."""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
from dataclasses import dataclass
from collections import defaultdict

from forensics_sandbox_agent.app.config.monitoring_models import FileMonitoringConfig
from forensics_sandbox_agent.infrastructure.monitoring.event_pipeline import ForensicEventPipeline
from forensics_sandbox_agent.infrastructure.monitoring.event_models import (
    EventOperation,
    SuspiciousIndicator,
)


@dataclass
class FileOperation:
    """Record of a file operation."""
    file_path: str
    operation_type: str
    timestamp: datetime
    file_size: Optional[int] = None
    extension: str = ""


class FileSystemMonitor:
    """Monitors file system activity in the sandbox."""

    def __init__(
        self,
        config: FileMonitoringConfig,
        pipeline: ForensicEventPipeline,
        logger: logging.Logger,
    ) -> None:
        self._config = config
        self._pipeline = pipeline
        self._logger = logger
        self._operations: list[FileOperation] = []
        self._file_count_by_extension: dict[str, int] = defaultdict(int)
        self._is_active = False

    def start(self) -> None:
        """Start file system monitoring."""
        self._is_active = True
        self._operations.clear()
        self._file_count_by_extension.clear()
        self._logger.info("File system monitoring started")

    def stop(self) -> None:
        """Stop file system monitoring."""
        self._is_active = False
        self._logger.info(f"File system monitoring stopped - tracked {len(self._operations)} operations")

    def record_file_create(
        self,
        file_path: str,
        file_size: Optional[int] = None,
    ) -> None:
        """Record a file creation event."""
        if not self._is_active:
            return

        ext = self._get_extension(file_path)
        self._file_count_by_extension[ext] += 1

        suspicious = self._check_suspicious_file_activity(ext)

        operation = FileOperation(
            file_path=file_path,
            operation_type="create",
            timestamp=datetime.now(),
            file_size=file_size,
            extension=ext,
        )
        self._operations.append(operation)

        self._pipeline.emit_file_event(
            operation=EventOperation.FILE_CREATE,
            file_path=file_path,
            file_extension=ext,
            file_size=file_size,
            suspicious_indicators=suspicious,
        )

        self._logger.debug(f"File created: {file_path}")

    def record_file_delete(
        self,
        file_path: str,
    ) -> None:
        """Record a file deletion event."""
        if not self._is_active:
            return

        ext = self._get_extension(file_path)

        operation = FileOperation(
            file_path=file_path,
            operation_type="delete",
            timestamp=datetime.now(),
            extension=ext,
        )
        self._operations.append(operation)

        self._pipeline.emit_file_event(
            operation=EventOperation.FILE_DELETE,
            file_path=file_path,
            file_extension=ext,
        )

        self._logger.debug(f"File deleted: {file_path}")

    def record_file_modify(
        self,
        file_path: str,
        file_size: Optional[int] = None,
    ) -> None:
        """Record a file modification event."""
        if not self._is_active:
            return

        ext = self._get_extension(file_path)

        operation = FileOperation(
            file_path=file_path,
            operation_type="modify",
            timestamp=datetime.now(),
            file_size=file_size,
            extension=ext,
        )
        self._operations.append(operation)

        self._pipeline.emit_file_event(
            operation=EventOperation.FILE_MODIFY,
            file_path=file_path,
            file_extension=ext,
            file_size=file_size,
        )

        self._logger.debug(f"File modified: {file_path}")

    def _get_extension(self, file_path: str) -> str:
        """Extract file extension."""
        try:
            return Path(file_path).suffix.lower()
        except Exception:
            return ""

    def _check_suspicious_file_activity(self, extension: str) -> list[SuspiciousIndicator]:
        """Check for suspicious file activity patterns."""
        if not self._config.suspicious_file_count:
            return []

        recent_ops = [
            op for op in self._operations
            if (datetime.now() - op.timestamp).total_seconds() < 60
        ]

        if len(recent_ops) > self._config.suspicious_file_count:
            return [SuspiciousIndicator.MASS_FILE_ACTIVITY]

        suspicious_extensions = [".exe", ".dll", ".bat", ".ps1", ".vbs"]
        if extension in suspicious_extensions:
            count = self._file_count_by_extension.get(extension, 0)
            if count > 10:
                return [SuspiciousIndicator.MASS_FILE_ACTIVITY]

        return []

    def get_recent_operations(self, count: int = 50) -> list[FileOperation]:
        """Get recent file operations."""
        sorted_ops = sorted(self._operations, key=lambda x: x.timestamp, reverse=True)
        return sorted_ops[:count]

    def get_operations_by_type(self) -> dict[str, int]:
        """Get operation counts by type."""
        counts = defaultdict(int)
        for op in self._operations:
            counts[op.operation_type] += 1
        return dict(counts)

    def get_file_summary(self) -> dict:
        """Get file monitoring summary."""
        return {
            "total_operations": len(self._operations),
            "operations_by_type": self.get_operations_by_type(),
            "extensions": dict(self._file_count_by_extension),
        }