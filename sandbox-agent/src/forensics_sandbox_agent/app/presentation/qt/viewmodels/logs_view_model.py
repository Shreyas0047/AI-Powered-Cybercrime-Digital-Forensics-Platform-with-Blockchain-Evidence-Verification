"""View model for application logs page."""

from __future__ import annotations

import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from forensics_sandbox_agent.app.bootstrap.runtime import ApplicationRuntime


class LogLine:
    """A parsed log line entry."""

    LEVEL_COLORS: dict[str, str] = {
        "DEBUG": "#94a3b8",
        "INFO": "#3b82f6",
        "WARNING": "#f59e0b",
        "WARN": "#f59e0b",
        "ERROR": "#ef4444",
        "CRITICAL": "#dc2626",
        "CRIT": "#dc2626",
    }

    def __init__(self, timestamp: str, level: str, category: str, message: str) -> None:
        self.timestamp = timestamp
        self.level = level.upper()
        self.category = category
        self.message = message

    @property
    def color(self) -> str:
        return self.LEVEL_COLORS.get(self.level, "#94a3b8")

    @property
    def raw(self) -> str:
        return f"[{self.level}] {self.timestamp} [{self.category}] {self.message}"


class LogsViewModel:
    """Loads and filters application log files."""

    LOG_PATTERN = re.compile(
        r"\[?(?P<level>DEBUG|INFO|WARNING|WARN|ERROR|CRITICAL|CRIT)\]?\s*"
        r"(?P<timestamp>\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[^\s]*)\s*"
        r"(?P<category>\w+)\s*"
        r"(?P<message>.*)"
    )

    def __init__(self, runtime: ApplicationRuntime) -> None:
        self._runtime = runtime
        self._logger = logging.getLogger(
            "forensics_sandbox_agent.presentation.logs"
        )
        self._all_lines: list[LogLine] = []
        self._level_filter = ""
        self._category_filter = ""
        self._search_filter = ""
        self._stats: dict[str, Any] = {}
        self._load_logs()

    @property
    def lines(self) -> list[LogLine]:
        filtered = self._all_lines
        if self._level_filter:
            filtered = [
                l for l in filtered if l.level == self._level_filter.upper()
            ]
        if self._category_filter:
            filtered = [
                l for l in filtered if l.category == self._category_filter
            ]
        if self._search_filter:
            term = self._search_filter.lower()
            filtered = [
                l for l in filtered if term in l.message.lower() or term in l.timestamp.lower()
            ]
        return filtered

    @property
    def stats(self) -> dict[str, Any]:
        return self._stats

    @property
    def total_lines(self) -> int:
        return len(self._all_lines)

    def refresh(self) -> None:
        self._load_logs()

    def set_level_filter(self, value: str) -> None:
        self._level_filter = value

    def set_category_filter(self, value: str) -> None:
        self._category_filter = value

    def set_search_filter(self, value: str) -> None:
        self._search_filter = value

    def _load_logs(self) -> None:
        try:
            settings = self._runtime.settings
            logs_dir = settings.paths.logs_dir
            if not logs_dir.exists():
                logs_dir.mkdir(parents=True, exist_ok=True)

            log_files = sorted(
                logs_dir.glob("*.log"),
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            )

            lines: list[LogLine] = []
            by_level: dict[str, int] = {}
            by_category: dict[str, int] = {}

            for log_file in log_files[:10]:
                try:
                    with open(log_file, "r", encoding="utf-8", errors="replace") as f:
                        for raw_line in f:
                            line = raw_line.strip()
                            if not line:
                                continue
                            parsed = self._parse_line(line)
                            if parsed:
                                lines.append(parsed)
                                by_level[parsed.level] = by_level.get(parsed.level, 0) + 1
                                by_category[parsed.category] = by_category.get(parsed.category, 0) + 1
                except Exception as exc:
                    self._logger.warning("Could not read log file %s: %s", log_file, exc)

            self._all_lines = lines
            self._stats = {
                "total": len(lines),
                "by_level": by_level,
                "by_category": by_category,
                "files": [f.name for f in log_files[:10]],
            }
        except Exception as exc:
            self._logger.warning("Could not load logs: %s", exc)

    def _parse_line(self, line: str) -> Optional[LogLine]:
        match = self.LOG_PATTERN.search(line)
        if match:
            return LogLine(
                timestamp=match.group("timestamp"),
                level=match.group("level"),
                category=match.group("category"),
                message=match.group("message"),
            )
        parts = line.split(" ", 4)
        if len(parts) >= 4:
            return LogLine(
                timestamp=parts[0] + " " + parts[1],
                level=parts[2],
                category=parts[3],
                message=parts[4] if len(parts) > 4 else "",
            )
        return LogLine(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            level="INFO",
            category="app",
            message=line[:200],
        )

    def export_logs(self) -> str:
        lines = self.lines
        if not lines:
            return ""
        content = "\n".join(l.raw for l in lines)
        return content