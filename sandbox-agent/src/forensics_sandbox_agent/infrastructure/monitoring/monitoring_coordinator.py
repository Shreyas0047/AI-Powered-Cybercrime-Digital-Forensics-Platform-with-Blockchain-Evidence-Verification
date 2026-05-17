"""Monitoring Coordinator - orchestrates all forensic monitoring services."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from forensics_sandbox_agent.app.config.monitoring_models import MonitoringConfig
from forensics_sandbox_agent.app.config.models import AppSettings

from forensics_sandbox_agent.infrastructure.monitoring.event_pipeline import ForensicEventPipeline
from forensics_sandbox_agent.infrastructure.monitoring.process_monitor import ProcessMonitor
from forensics_sandbox_agent.infrastructure.monitoring.file_monitor import FileSystemMonitor
from forensics_sandbox_agent.infrastructure.monitoring.registry_monitor import RegistryMonitor
from forensics_sandbox_agent.infrastructure.monitoring.network_monitor import NetworkObserver
from forensics_sandbox_agent.infrastructure.monitoring.forensic_timeline import ForensicTimelineEngine
from forensics_sandbox_agent.infrastructure.monitoring.behavior_detector import BehaviorDetector
from forensics_sandbox_agent.infrastructure.monitoring.event_models import ForensicSessionSummary


class ForensicMonitoringCoordinator:
    """Coordinates all forensic monitoring services."""

    def __init__(
        self,
        settings: AppSettings,
        logger: logging.Logger,
    ) -> None:
        self._settings = settings
        self._logger = logger
        self._config = settings.monitoring if hasattr(settings, 'monitoring') else self._create_default_config()

        self._pipeline = ForensicEventPipeline(
            config=self._config.storage,
            logger=logger,
        )

        self._process_monitor = ProcessMonitor(
            config=self._config.process,
            pipeline=self._pipeline,
            logger=logger,
        )

        self._file_monitor = FileSystemMonitor(
            config=self._config.file_system,
            pipeline=self._pipeline,
            logger=logger,
        )

        self._registry_monitor = RegistryMonitor(
            config=self._config.registry,
            pipeline=self._pipeline,
            logger=logger,
        )

        self._network_observer = NetworkObserver(
            config=self._config.network,
            pipeline=self._pipeline,
            logger=logger,
        )

        self._timeline_engine = ForensicTimelineEngine(
            pipeline=self._pipeline,
            logger=logger,
        )

        self._behavior_detector = BehaviorDetector(
            config=self._config.behavior_detection,
            pipeline=self._pipeline,
            logger=logger,
        )

        self._current_session_id: Optional[str] = None
        self._current_simulator_id: Optional[str] = None
        self._is_active = False

    def _create_default_config(self) -> MonitoringConfig:
        """Create default monitoring configuration."""
        return MonitoringConfig()

    def start_monitoring(self, session_id: str, simulator_id: str) -> None:
        """Start monitoring for a forensic session."""
        if self._is_active:
            self._logger.warning("Monitoring already active")
            return

        self._current_session_id = session_id
        self._current_simulator_id = simulator_id
        self._is_active = True

        self._logger.info(f"Starting forensic monitoring: session={session_id}, simulator={simulator_id}")

        self._pipeline.start_session(session_id, simulator_id)
        self._timeline_engine.start_session()

        if self._config.process.enabled:
            self._process_monitor.start()

        if self._config.file_system.enabled:
            self._file_monitor.start()

        if self._config.registry.enabled:
            self._registry_monitor.start()

        if self._config.network.enabled:
            self._network_observer.start()

        if self._config.behavior_detection.enabled:
            self._behavior_detector.start()

        self._timeline_engine.start_phase("monitoring_active")

        self._pipeline.emit_system_event(
            operation=EventOperation.PROCESS_CREATE,
            message="Forensic monitoring started",
        )

    def stop_monitoring(self) -> dict:
        """Stop monitoring and return summary."""
        if not self._is_active:
            self._logger.warning("Monitoring not active")
            return {}

        self._logger.info("Stopping forensic monitoring")

        self._timeline_engine.end_phase()

        self._pipeline.emit_system_event(
            operation=EventOperation.PROCESS_TERMINATE,
            message="Forensic monitoring stopped",
        )

        if self._config.process.enabled:
            self._process_monitor.stop()

        if self._config.file_system.enabled:
            self._file_monitor.stop()

        if self._config.registry.enabled:
            self._registry_monitor.stop()

        if self._config.network.enabled:
            self._network_observer.stop()

        if self._config.behavior_detection.enabled:
            self._behavior_detector.stop()

        self._timeline_engine.generate_from_pipeline()

        summary = self._pipeline.get_session_summary()
        self._pipeline.save_session_events()

        self._is_active = False

        self._logger.info(f"Forensic monitoring complete: {summary.total_events} events")

        return summary.to_dict()

    def record_process_start(
        self,
        pid: int,
        executable_path: str,
        parent_pid: Optional[int] = None,
        command_line: str = "",
    ) -> None:
        """Record process start event."""
        if not self._is_active:
            return

        self._process_monitor.record_process_start(
            pid=pid,
            executable_path=executable_path,
            parent_pid=parent_pid,
            command_line=command_line,
        )

        if self._config.behavior_detection.enabled:
            self._behavior_detector.on_process_spawn(executable_path)

    def record_process_terminate(self, pid: int, exit_code: int = 0) -> None:
        """Record process termination event."""
        if not self._is_active:
            return

        self._process_monitor.record_process_terminate(pid=pid, exit_code=exit_code)

    def record_file_create(self, file_path: str, file_size: Optional[int] = None) -> None:
        """Record file creation event."""
        if not self._is_active:
            return

        self._file_monitor.record_file_create(file_path=file_path, file_size=file_size)

        if self._config.behavior_detection.enabled:
            self._behavior_detector.on_file_operation(file_path, "create")

    def record_file_delete(self, file_path: str) -> None:
        """Record file deletion event."""
        if not self._is_active:
            return

        self._file_monitor.record_file_delete(file_path=file_path)

        if self._config.behavior_detection.enabled:
            self._behavior_detector.on_file_operation(file_path, "delete")

    def record_file_modify(self, file_path: str, file_size: Optional[int] = None) -> None:
        """Record file modification event."""
        if not self._is_active:
            return

        self._file_monitor.record_file_modify(file_path=file_path, file_size=file_size)

        if self._config.behavior_detection.enabled:
            self._behavior_detector.on_file_operation(file_path, "modify")

    def record_registry_key_created(self, key_path: str) -> None:
        """Record registry key creation event."""
        if not self._is_active:
            return

        self._registry_monitor.record_key_created(key_path=key_path)

        if self._config.behavior_detection.enabled:
            self._behavior_detector.on_registry_operation(key_path, "create")

    def record_registry_key_modified(
        self,
        key_path: str,
        value_name: str,
        value_data: str,
    ) -> None:
        """Record registry value modification event."""
        if not self._is_active:
            return

        self._registry_monitor.record_key_modified(
            key_path=key_path,
            value_name=value_name,
            value_data=value_data,
        )

        if self._config.behavior_detection.enabled:
            self._behavior_detector.on_registry_operation(key_path, "modify")

    def record_registry_key_deleted(
        self,
        key_path: str,
        value_name: Optional[str] = None,
    ) -> None:
        """Record registry deletion event."""
        if not self._is_active:
            return

        self._registry_monitor.record_key_deleted(key_path=key_path, value_name=value_name)

    def record_network_connection(
        self,
        destination_ip: str,
        destination_port: Optional[int],
        protocol: str = "TCP",
        source_pid: Optional[int] = None,
    ) -> None:
        """Record network connection event."""
        if not self._is_active:
            return

        self._network_observer.record_connection(
            destination_ip=destination_ip,
            destination_port=destination_port,
            protocol=protocol,
            source_pid=source_pid,
        )

        if self._config.behavior_detection.enabled:
            self._behavior_detector.on_network_connection(
                destination_ip=destination_ip,
                port=destination_port,
                protocol=protocol,
            )

    def record_dns_query(self, query: str, source_pid: Optional[int] = None) -> None:
        """Record DNS query event."""
        if not self._is_active:
            return

        self._network_observer.record_dns_query(query=query, source_pid=source_pid)

    def record_listen(self, port: int, protocol: str = "TCP", source_pid: Optional[int] = None) -> None:
        """Record listening port event."""
        if not self._is_active:
            return

        self._network_observer.record_listen(port=port, protocol=protocol, source_pid=source_pid)

    def get_monitor_status(self) -> dict:
        """Get status of all monitors."""
        return {
            "is_active": self._is_active,
            "session_id": self._current_session_id,
            "simulator_id": self._current_simulator_id,
            "process_monitor": {
                "enabled": self._config.process.enabled,
                "active": self._process_monitor.get_process_summary() if self._is_active else {},
            },
            "file_monitor": {
                "enabled": self._config.file_system.enabled,
                "active": self._file_monitor.get_file_summary() if self._is_active else {},
            },
            "registry_monitor": {
                "enabled": self._config.registry.enabled,
                "active": self._registry_monitor.get_registry_summary() if self._is_active else {},
            },
            "network_observer": {
                "enabled": self._config.network.enabled,
                "active": self._network_observer.get_network_summary() if self._is_active else {},
            },
            "behavior_detector": {
                "enabled": self._config.behavior_detection.enabled,
                "alerts": self._behavior_detector.get_alert_summary() if self._is_active else {},
            },
            "timeline": {
                "entries": self._timeline_engine.get_timeline_summary() if self._is_active else {},
            },
        }

    def get_events(self) -> list:
        """Get all forensic events."""
        return self._pipeline.get_session_events()

    def get_suspicious_activities(self) -> list:
        """Get suspicious activities."""
        return self._pipeline.get_suspicious_activities()

    def get_timeline(self) -> list:
        """Get forensic timeline."""
        return self._timeline_engine.get_timeline_for_export()


from forensics_sandbox_agent.infrastructure.monitoring.event_models import EventOperation