"""Registry Monitoring Service - tracks registry activity."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional
from dataclasses import dataclass
from collections import defaultdict

from forensics_sandbox_agent.app.config.monitoring_models import RegistryMonitoringConfig
from forensics_sandbox_agent.infrastructure.monitoring.event_pipeline import ForensicEventPipeline
from forensics_sandbox_agent.infrastructure.monitoring.event_models import (
    EventOperation,
    SuspiciousIndicator,
)


@dataclass
class RegistryOperation:
    """Record of a registry operation."""
    key_path: str
    value_name: Optional[str]
    operation_type: str
    value_data: Optional[str]
    timestamp: datetime


class RegistryMonitor:
    """Monitors registry activity in the sandbox."""

    def __init__(
        self,
        config: RegistryMonitoringConfig,
        pipeline: ForensicEventPipeline,
        logger: logging.Logger,
    ) -> None:
        self._config = config
        self._pipeline = pipeline
        self._logger = logger
        self._operations: list[RegistryOperation] = []
        self._is_active = False

    def start(self) -> None:
        """Start registry monitoring."""
        self._is_active = True
        self._operations.clear()
        self._logger.info("Registry monitoring started")

    def stop(self) -> None:
        """Stop registry monitoring."""
        self._is_active = False
        self._logger.info(f"Registry monitoring stopped - tracked {len(self._operations)} operations")

    def record_key_created(
        self,
        key_path: str,
    ) -> None:
        """Record a registry key creation."""
        if not self._is_active:
            return

        suspicious = self._check_suspicious_path(key_path)

        operation = RegistryOperation(
            key_path=key_path,
            value_name=None,
            operation_type="create_key",
            value_data=None,
            timestamp=datetime.now(),
        )
        self._operations.append(operation)

        self._pipeline.emit_registry_event(
            operation=EventOperation.REGISTRY_CREATE_KEY,
            key_path=key_path,
            suspicious_indicators=suspicious,
        )

        self._logger.debug(f"Registry key created: {key_path}")

    def record_key_modified(
        self,
        key_path: str,
        value_name: str,
        value_data: str,
    ) -> None:
        """Record a registry value modification."""
        if not self._is_active:
            return

        suspicious = self._check_suspicious_path(key_path)

        operation = RegistryOperation(
            key_path=key_path,
            value_name=value_name,
            operation_type="modify_value",
            value_data=value_data,
            timestamp=datetime.now(),
        )
        self._operations.append(operation)

        self._pipeline.emit_registry_event(
            operation=EventOperation.REGISTRY_MODIFY_VALUE,
            key_path=key_path,
            value_name=value_name,
            value_data=value_data,
            suspicious_indicators=suspicious,
        )

        self._logger.debug(f"Registry value modified: {key_path}\\{value_name}")

    def record_key_deleted(
        self,
        key_path: str,
        value_name: Optional[str] = None,
    ) -> None:
        """Record a registry key or value deletion."""
        if not self._is_active:
            return

        operation = RegistryOperation(
            key_path=key_path,
            value_name=value_name,
            operation_type="delete",
            value_data=None,
            timestamp=datetime.now(),
        )
        self._operations.append(operation)

        if value_name:
            self._pipeline.emit_registry_event(
                operation=EventOperation.REGISTRY_DELETE_VALUE,
                key_path=key_path,
                value_name=value_name,
            )
        else:
            self._pipeline.emit_registry_event(
                operation=EventOperation.REGISTRY_DELETE_KEY,
                key_path=key_path,
            )

        self._logger.debug(f"Registry deleted: {key_path}")

    def _check_suspicious_path(self, key_path: str) -> list[SuspiciousIndicator]:
        """Check if registry path is suspicious."""
        if not self._config.track_autorun:
            return []

        for suspicious_path in self._config.suspicious_paths:
            if suspicious_path.lower() in key_path.lower():
                return [SuspiciousIndicator.PERSISTENCE_ATTEMPT]

        return []

    def get_recent_operations(self, count: int = 50) -> list[RegistryOperation]:
        """Get recent registry operations."""
        sorted_ops = sorted(self._operations, key=lambda x: x.timestamp, reverse=True)
        return sorted_ops[:count]

    def get_operations_by_type(self) -> dict[str, int]:
        """Get operation counts by type."""
        counts = defaultdict(int)
        for op in self._operations:
            counts[op.operation_type] += 1
        return dict(counts)

    def get_autorun_modifications(self) -> list[RegistryOperation]:
        """Get modifications to autorun registry keys."""
        autorun_paths = [p.lower() for p in self._config.suspicious_paths]
        return [
            op for op in self._operations
            if any(path in op.key_path.lower() for path in autorun_paths)
        ]

    def get_registry_summary(self) -> dict:
        """Get registry monitoring summary."""
        return {
            "total_operations": len(self._operations),
            "operations_by_type": self.get_operations_by_type(),
            "autorun_modifications": len(self.get_autorun_modifications()),
        }