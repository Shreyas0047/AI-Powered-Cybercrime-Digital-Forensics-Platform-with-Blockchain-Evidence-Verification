"""Process Monitoring Service - tracks process activity."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field
from collections import defaultdict

from forensics_sandbox_agent.app.config.monitoring_models import ProcessMonitoringConfig
from forensics_sandbox_agent.infrastructure.monitoring.event_pipeline import ForensicEventPipeline
from forensics_sandbox_agent.infrastructure.monitoring.event_models import (
    EventOperation,
    SuspiciousIndicator,
)


@dataclass
class ProcessRecord:
    """Record of a monitored process."""
    pid: int
    parent_pid: Optional[int]
    executable_path: str
    command_line: str
    start_time: datetime
    end_time: Optional[datetime] = None
    exit_code: Optional[int] = None


class ProcessMonitor:
    """Monitors process activity in the sandbox."""

    def __init__(
        self,
        config: ProcessMonitoringConfig,
        pipeline: ForensicEventPipeline,
        logger: logging.Logger,
    ) -> None:
        self._config = config
        self._pipeline = pipeline
        self._logger = logger
        self._processes: dict[int, ProcessRecord] = {}
        self._process_start_times: list[datetime] = []
        self._is_active = False

    def start(self) -> None:
        """Start process monitoring."""
        self._is_active = True
        self._processes.clear()
        self._process_start_times.clear()
        self._logger.info("Process monitoring started")

    def stop(self) -> None:
        """Stop process monitoring."""
        self._is_active = False
        self._logger.info(f"Process monitoring stopped - tracked {len(self._processes)} processes")

    def record_process_start(
        self,
        pid: int,
        executable_path: str,
        parent_pid: Optional[int] = None,
        command_line: str = "",
    ) -> None:
        """Record a process start event."""
        if not self._is_active:
            return

        self._process_start_times.append(datetime.now())

        record = ProcessRecord(
            pid=pid,
            parent_pid=parent_pid,
            executable_path=executable_path,
            command_line=command_line,
            start_time=datetime.now(),
        )
        self._processes[pid] = record

        suspicious = self._check_suspicious_process_spawn()

        self._pipeline.emit_process_event(
            operation=EventOperation.PROCESS_START,
            pid=pid,
            executable_path=executable_path,
            parent_pid=parent_pid,
            command_line=command_line,
            suspicious_indicators=suspicious,
        )

        self._logger.debug(f"Process started: pid={pid}, path={executable_path}")

    def record_process_terminate(
        self,
        pid: int,
        exit_code: int = 0,
    ) -> None:
        """Record a process termination event."""
        if not self._is_active:
            return

        if pid in self._processes:
            record = self._processes[pid]
            record.end_time = datetime.now()
            record.exit_code = exit_code

            self._pipeline.emit_process_event(
                operation=EventOperation.PROCESS_TERMINATE,
                pid=pid,
                executable_path=record.executable_path,
                command_line=record.command_line,
            )

            self._logger.debug(f"Process terminated: pid={pid}, exit_code={exit_code}")

    def _check_suspicious_process_spawn(self) -> list[SuspiciousIndicator]:
        """Check for suspicious rapid process spawning."""
        if not self._config.suspicious_threshold:
            return []

        now = datetime.now()
        recent_starts = [
            t for t in self._process_start_times
            if (now - t).total_seconds() < 60
        ]

        if len(recent_starts) > self._config.suspicious_threshold:
            return [SuspiciousIndicator.RAPID_PROCESS_SPAWN]

        return []

    def get_active_processes(self) -> list[ProcessRecord]:
        """Get all active processes."""
        return [
            r for r in self._processes.values()
            if r.end_time is None
        ]

    def get_process_tree(self) -> dict[int, list[int]]:
        """Get process parent-child relationships."""
        tree = defaultdict(list)
        for pid, record in self._processes.items():
            if record.parent_pid is not None:
                tree[record.parent_pid].append(pid)
        return dict(tree)

    def get_process_summary(self) -> dict:
        """Get process monitoring summary."""
        return {
            "total_processes": len(self._processes),
            "active_processes": len(self.get_active_processes()),
            "recent_spawn_count": len([
                t for t in self._process_start_times
                if (datetime.now() - t).total_seconds() < 60
            ]),
        }