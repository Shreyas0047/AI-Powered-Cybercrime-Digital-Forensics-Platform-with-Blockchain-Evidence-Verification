"""View model for the forensic reports page."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from forensics_sandbox_agent.app.bootstrap.runtime import ApplicationRuntime
from forensics_sandbox_agent.app.config.models import AppSettings


class ReportSummary:
    """Summary of a forensic report file."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self._data: dict[str, Any] = {}
        self._load()

    def _load(self) -> None:
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                self._data = json.load(f)
        except Exception:
            pass

    @property
    def id(self) -> str:
        return self._data.get("reportId", self.path.stem)

    @property
    def simulator_name(self) -> str:
        return self._data.get("simulatorName", self._data.get("simulatorId", "Unknown"))

    @property
    def session_id(self) -> str:
        return self._data.get("sessionId", "")

    @property
    def generated_at(self) -> str:
        return self._data.get("generatedAt", self._data.get("timestamp", ""))

    @property
    def total_events(self) -> int:
        events = self._data.get("processActivity", []) + self._data.get(
            "fileActivity", []
        ) + self._data.get("registryActivity", []) + self._data.get("networkActivity", [])
        return len(events)

    @property
    def severity_counts(self) -> dict[str, int]:
        return self._data.get(
            "severityCounts",
            {
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
                "info": 0,
            },
        )

    @property
    def category_counts(self) -> dict[str, int]:
        return {
            "process": len(self._data.get("processActivity", [])),
            "file": len(self._data.get("fileActivity", [])),
            "registry": len(self._data.get("registryActivity", [])),
            "network": len(self._data.get("networkActivity", [])),
            "behavior": len(self._data.get("behaviorSummary", {}).get("detectedPatterns", [])),
            "system": 0,
        }

    @property
    def file_size(self) -> int:
        try:
            return self.path.stat().st_size
        except Exception:
            return 0

    @property
    def hash_sha256(self) -> str:
        return self._data.get("hash", {}).get("sha256", "")

    @property
    def completion_status(self) -> str:
        return self._data.get("executionSummary", {}).get(
            "completionStatus", "unknown"
        )

    @property
    def data(self) -> dict[str, Any]:
        return self._data


class ReportsViewModel:
    """Loads and exposes forensic report summaries."""

    def __init__(self, runtime: ApplicationRuntime) -> None:
        self._runtime = runtime
        self._logger = logging.getLogger(
            "forensics_sandbox_agent.presentation.reports"
        )
        self._reports: list[ReportSummary] = []
        self._selected: Optional[ReportSummary] = None
        self._simulator_filter = ""
        self._severity_filter = ""
        self._search_filter = ""
        self._detail_data: dict[str, Any] = {}
        self._output = ""
        self._load_reports()

    @property
    def reports(self) -> list[ReportSummary]:
        filtered = self._reports
        if self._simulator_filter:
            filtered = [
                r for r in filtered if r.simulator_name.lower() == self._simulator_filter.lower()
            ]
        if self._search_filter:
            term = self._search_filter.lower()
            filtered = [
                r
                for r in filtered
                if term in r.simulator_name.lower()
                or term in r.session_id.lower()
                or term in r.id.lower()
            ]
        return filtered

    @property
    def selected_report(self) -> Optional[ReportSummary]:
        return self._selected

    @property
    def detail_data(self) -> dict[str, Any]:
        return self._detail_data

    @property
    def output(self) -> str:
        return self._output

    @property
    def total_reports(self) -> int:
        return len(self._reports)

    @property
    def total_events(self) -> int:
        return sum(r.total_events for r in self._reports)

    @property
    def critical_count(self) -> int:
        return sum(r.severity_counts.get("critical", 0) for r in self._reports)

    def refresh_reports(self) -> None:
        self._load_reports()
        self.append_output(f"Loaded {len(self._reports)} reports")

    def _load_reports(self) -> None:
        try:
            settings = self._runtime.settings
            exports_dir = settings.paths.exports_dir
            if not exports_dir.exists():
                self._reports = []
                return

            reports = []
            for path in sorted(exports_dir.glob("*.json"), reverse=True):
                reports.append(ReportSummary(path))
            self._reports = reports
        except Exception as exc:
            self._logger.warning("Could not load reports: %s", exc)
            self.append_output(f"ERROR: {exc}")

    def select_report(self, report: ReportSummary) -> None:
        self._selected = report
        self._detail_data = report.data

    def set_simulator_filter(self, value: str) -> None:
        self._simulator_filter = value

    def set_severity_filter(self, value: str) -> None:
        self._severity_filter = value

    def set_search_filter(self, value: str) -> None:
        self._search_filter = value

    def export_report(self, report: ReportSummary, format: str = "json") -> None:
        try:
            if format == "json":
                out_path = report.path.parent / f"{report.path.stem}_export.json"
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(report.data, f, indent=2)
                self.append_output(f"Exported to {out_path}")
            else:
                out_path = report.path.parent / f"{report.path.stem}_report.txt"
                with open(out_path, "w", encoding="utf-8") as f:
                    self._write_text_summary(f, report)
                self.append_output(f"Exported to {out_path}")
        except Exception as exc:
            self.append_output(f"Export failed: {exc}")

    def _write_text_summary(self, f, report: ReportSummary) -> None:
        f.write(f"Forensic Report: {report.simulator_name}\n")
        f.write(f"Session: {report.session_id}\n")
        f.write(f"Generated: {report.generated_at}\n")
        f.write(f"Status: {report.completion_status}\n")
        f.write(f"Total Events: {report.total_events}\n")
        f.write("\nSeverity Counts:\n")
        for sev, count in report.severity_counts.items():
            f.write(f"  {sev}: {count}\n")
        f.write("\nCategory Counts:\n")
        for cat, count in report.category_counts.items():
            f.write(f"  {cat}: {count}\n")
        f.write("\nSuspicious Activities:\n")
        for act in report.data.get("suspiciousActivities", []):
            f.write(f"  [{act.get('severity', '?')}] {act.get('description', '')}\n")

    def clear_selection(self) -> None:
        self._selected = None
        self._detail_data = {}

    def append_output(self, text: str) -> None:
        self._output += f"[{datetime.now().strftime('%H:%M:%S')}] {text}\n"

    def clear_output(self) -> None:
        self._output = ""