"""Monitoring page widget for forensic monitoring display."""

from __future__ import annotations

from typing import Optional
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QPushButton, QTextEdit, QGroupBox,
    QTableWidget, QTableWidgetItem, QHeaderView,
    QTabWidget, QProgressBar,
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont

from forensics_sandbox_agent.app.presentation.qt.viewmodels.monitoring_view_model import (
    MonitoringViewModel,
)


class MonitoringPage(QWidget):
    """Forensic monitoring page with live activity display."""

    def __init__(self, view_model: Optional[MonitoringViewModel] = None, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self._view_model = view_model
        self._setup_ui()

    def _setup_ui(self) -> None:
        """Setup the UI components."""
        main_layout = QVBoxLayout(self)
        main_layout.setSpacing(16)

        self._setup_status_section(main_layout)
        self._setup_tabs_section(main_layout)

        main_layout.addStretch()

    def _setup_status_section(self, parent: QVBoxLayout) -> None:
        """Setup monitoring status section."""
        status_group = QGroupBox("Monitoring Status")
        status_layout = QGridLayout(status_group)

        self._status_label = QLabel("Inactive")
        self._status_label.setStyleSheet("color: #666666; font-weight: bold;")

        self._event_count_label = QLabel("Events: 0")
        self._process_count_label = QLabel("Process: 0")
        self._file_count_label = QLabel("Files: 0")
        self._registry_count_label = QLabel("Registry: 0")
        self._network_count_label = QLabel("Network: 0")
        self._alert_count_label = QLabel("Alerts: 0")

        self._refresh_button = QPushButton("Refresh")
        self._refresh_button.clicked.connect(self._on_refresh)

        status_layout.addWidget(QLabel("Status:"), 0, 0)
        status_layout.addWidget(self._status_label, 0, 1)
        status_layout.addWidget(QLabel("Total Events:"), 0, 2)
        status_layout.addWidget(self._event_count_label, 0, 3)
        status_layout.addWidget(self._refresh_button, 0, 4)

        status_layout.addWidget(QLabel("Process Events:"), 1, 0)
        status_layout.addWidget(self._process_count_label, 1, 1)
        status_layout.addWidget(QLabel("File Events:"), 1, 2)
        status_layout.addWidget(self._file_count_label, 1, 3)

        status_layout.addWidget(QLabel("Registry Events:"), 2, 0)
        status_layout.addWidget(self._registry_count_label, 2, 1)
        status_layout.addWidget(QLabel("Network Events:"), 2, 2)
        status_layout.addWidget(self._network_count_label, 2, 3)
        status_layout.addWidget(QLabel("Behavior Alerts:"), 2, 4)
        status_layout.addWidget(self._alert_count_label, 2, 5)

        parent.addWidget(status_group)

    def _setup_tabs_section(self, parent: QVBoxLayout) -> None:
        """Setup tabbed event display."""
        self._tabs = QTabWidget()

        self._events_table = QTableWidget()
        self._setup_events_table()

        self._process_tab = QWidget()
        self._process_layout = QVBoxLayout(self._process_tab)
        self._process_log = QTextEdit()
        self._process_log.setReadOnly(True)
        self._process_log.setFont(QFont("Consolas", 9))
        self._process_layout.addWidget(self._process_log)

        self._file_tab = QWidget()
        self._file_layout = QVBoxLayout(self._file_tab)
        self._file_log = QTextEdit()
        self._file_log.setReadOnly(True)
        self._file_log.setFont(QFont("Consolas", 9))
        self._file_layout.addWidget(self._file_log)

        self._network_tab = QWidget()
        self._network_layout = QVBoxLayout(self._network_tab)
        self._network_log = QTextEdit()
        self._network_log.setReadOnly(True)
        self._network_log.setFont(QFont("Consolas", 9))
        self._network_layout.addWidget(self._network_log)

        self._alerts_tab = QWidget()
        self._alerts_layout = QVBoxLayout(self._alerts_tab)
        self._alerts_log = QTextEdit()
        self._alerts_log.setReadOnly(True)
        self._alerts_log.setFont(QFont("Consolas", 9))
        self._alerts_layout.addWidget(self._alerts_log)

        self._tabs.addTab(self._events_table, "All Events")
        self._tabs.addTab(self._process_tab, "Process")
        self._tabs.addTab(self._file_tab, "File System")
        self._tabs.addTab(self._network_tab, "Network")
        self._tabs.addTab(self._alerts_tab, "Alerts")

        parent.addWidget(self._tabs)

    def _setup_events_table(self) -> None:
        """Setup events table widget."""
        headers = ["Timestamp", "Category", "Operation", "Severity", "Source", "Details"]

        self._events_table.setColumnCount(len(headers))
        self._events_table.setHorizontalHeaderLabels(headers)
        self._events_table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self._events_table.setAlternatingRowColors(True)
        self._events_table.setFont(QFont("", 9))

    def set_view_model(self, view_model: MonitoringViewModel) -> None:
        """Set the view model."""
        self._view_model = view_model

    def update_from_view_model(self) -> None:
        """Update UI from view model."""
        if not self._view_model:
            return

        self._view_model.refresh_status()
        summary = self._view_model.get_summary()

        is_active = self._view_model.is_monitoring
        self._status_label.setText("Active" if is_active else "Inactive")
        self._status_label.setStyleSheet(
            "color: #4caf50; font-weight: bold;" if is_active else "color: #666666;"
        )

        self._event_count_label.setText(f"Events: {summary.get('total_events', 0)}")
        self._process_count_label.setText(f"Process: {summary.get('process_events', 0)}")
        self._file_count_label.setText(f"Files: {summary.get('file_events', 0)}")
        self._registry_count_label.setText(f"Registry: {summary.get('registry_events', 0)}")
        self._network_count_label.setText(f"Network: {summary.get('network_events', 0)}")
        self._alert_count_label.setText(f"Alerts: {summary.get('behavior_alerts', 0)}")

        self._update_events_table()
        self._update_process_log()
        self._update_file_log()
        self._update_network_log()
        self._update_alerts_log()

    def _update_events_table(self) -> None:
        """Update events table with current events."""
        if not self._view_model:
            return

        self._events_table.setRowCount(0)

        for event in self._view_model.events[:100]:
            row = self._events_table.rowCount()
            self._events_table.insertRow(row)

            self._events_table.setItem(row, 0, QTableWidgetItem(event.timestamp.strftime("%H:%M:%S")))
            self._events_table.setItem(row, 1, QTableWidgetItem(event.category.value))
            self._events_table.setItem(row, 2, QTableWidgetItem(event.operation.value))
            self._events_table.setItem(row, 3, QTableWidgetItem(event.severity.value))
            self._events_table.setItem(row, 4, QTableWidgetItem(event.source))

            details_str = ", ".join(f"{k}: {v}" for k, v in list(event.details.items())[:2])
            self._events_table.setItem(row, 5, QTableWidgetItem(details_str[:50]))

    def _update_process_log(self) -> None:
        """Update process log display."""
        if not self._view_model:
            return

        process_events = self._view_model.get_events_by_category("process")
        log_text = "\n".join([
            f"[{e.timestamp.strftime('%H:%M:%S')}] {e.operation.value} - PID: {e.details.get('pid', 'N/A')}, Path: {e.details.get('executable_path', 'N/A')[:40]}"
            for e in process_events[:50]
        ])

        self._process_log.setPlainText(log_text or "No process events")

    def _update_file_log(self) -> None:
        """Update file system log display."""
        if not self._view_model:
            return

        file_events = self._view_model.get_events_by_category("file_system")
        log_text = "\n".join([
            f"[{e.timestamp.strftime('%H:%M:%S')}] {e.operation.value} - {e.details.get('file_path', 'N/A')[:50]}"
            for e in file_events[:50]
        ])

        self._file_log.setPlainText(log_text or "No file system events")

    def _update_network_log(self) -> None:
        """Update network log display."""
        if not self._view_model:
            return

        network_events = self._view_model.get_events_by_category("network")
        log_text = "\n".join([
            f"[{e.timestamp.strftime('%H:%M:%S')}] {e.operation.value} - {e.details.get('destination_ip', 'N/A')}:{e.details.get('destination_port', 'N/A')}"
            for e in network_events[:50]
        ])

        self._network_log.setPlainText(log_text or "No network events")

    def _update_alerts_log(self) -> None:
        """Update alerts log display."""
        if not self._view_model:
            return

        alerts = self._view_model.suspicious_activities
        log_text = "\n".join([
            f"[{a.indicator.value}] {a.description}\n    Evidence: {'; '.join(a.evidence[:2])}"
            for a in alerts
        ])

        self._alerts_log.setPlainText(log_text or "No suspicious activities detected")

    def _on_refresh(self) -> None:
        """Handle refresh button click."""
        self.update_from_view_model()