"""Forensic reports page widget."""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Optional

from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont
from PyQt6.QtWidgets import (
    QComboBox,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QTextEdit,
    QVBoxLayout,
    QWidget,
    QHeaderView,
)

from forensics_sandbox_agent.app.presentation.qt.theme.design_tokens import (
    DesignTokens,
)
from forensics_sandbox_agent.app.presentation.qt.viewmodels.reports_view_model import (
    ReportsViewModel,
    ReportSummary,
)
from forensics_sandbox_agent.app.presentation.qt.widgets.metric_card import (
    MetricCard,
)


class ReportsPage(QWidget):
    """Page for browsing and exporting forensic reports."""

    def __init__(
        self,
        view_model: Optional[ReportsViewModel] = None,
        parent: Optional[QWidget] = None,
    ) -> None:
        super().__init__(parent)
        self._view_model = view_model
        self._setup_ui()
        self.update_from_view_model()

    def _setup_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(16)

        self._setup_metrics(layout)
        self._setup_filters(layout)
        self._setup_table(layout)
        self._setup_detail(layout)

    def _setup_metrics(self, parent: QVBoxLayout) -> None:
        metrics_box = QHBoxLayout()
        metrics_box.setSpacing(12)
        self._metric_reports = MetricCard("Total Reports", "0", delta="Loaded from exports", accent=False)
        self._metric_events = MetricCard("Total Events", "0", delta="Across all reports", accent=False)
        self._metric_critical = MetricCard("Critical Alerts", "0", delta="Requires attention", accent=False)
        self._metric_reports.setMinimumHeight(90)
        self._metric_events.setMinimumHeight(90)
        self._metric_critical.setMinimumHeight(90)
        metrics_box.addWidget(self._metric_reports)
        metrics_box.addWidget(self._metric_events)
        metrics_box.addWidget(self._metric_critical)
        parent.addLayout(metrics_box)

    def _setup_filters(self, parent: QVBoxLayout) -> None:
        filter_group = QGroupBox("Filters")
        filter_layout = QHBoxLayout(filter_group)

        filter_layout.addWidget(QLabel("Simulator:"))
        self._simulator_combo = QComboBox()
        self._simulator_combo.addItems(["All", "ransomware", "spyware", "trojan", "botnet", "credential-stealer"])
        self._simulator_combo.currentTextChanged.connect(self._on_simulator_changed)
        filter_layout.addWidget(self._simulator_combo)

        filter_layout.addWidget(QLabel("Search:"))
        self._search_input = QLineEdit()
        self._search_input.setPlaceholderText("Search reports...")
        self._search_input.textChanged.connect(self._on_search_changed)
        filter_layout.addWidget(self._search_input)

        self._refresh_btn = QPushButton("Refresh")
        self._refresh_btn.clicked.connect(self._on_refresh)
        filter_layout.addWidget(self._refresh_btn)
        filter_layout.addStretch()

        parent.addWidget(filter_group)

    def _setup_table(self, parent: QVBoxLayout) -> None:
        table_group = QGroupBox("Reports")
        table_layout = QVBoxLayout(table_group)

        self._table = QTableWidget()
        self._table.setColumnCount(7)
        self._table.setHorizontalHeaderLabels([
            "Simulator", "Session ID", "Generated", "Status",
            "Events", "Critical", "High",
        ])
        self._table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self._table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self._table.setAlternatingRowColors(True)
        self._table.setFont(QFont("", 9))
        self._table.itemSelectionChanged.connect(self._on_table_selection)
        table_layout.addWidget(self._table)

        actions = QHBoxLayout()
        self._export_json_btn = QPushButton("Export JSON")
        self._export_json_btn.clicked.connect(self._on_export_json)
        self._export_txt_btn = QPushButton("Export TXT")
        self._export_txt_btn.clicked.connect(self._on_export_txt)
        actions.addWidget(self._export_json_btn)
        actions.addWidget(self._export_txt_btn)
        actions.addStretch()
        table_layout.addLayout(actions)

        parent.addWidget(table_group)

    def _setup_detail(self, parent: QVBoxLayout) -> None:
        detail_group = QGroupBox("Report Detail")
        detail_layout = QVBoxLayout(detail_group)

        self._detail_output = QTextEdit()
        self._detail_output.setReadOnly(True)
        self._detail_output.setFont(QFont("Consolas", 9))
        self._detail_output.setMaximumHeight(200)
        detail_layout.addWidget(self._detail_output)

        parent.addWidget(detail_group)

    def set_view_model(self, view_model: ReportsViewModel) -> None:
        self._view_model = view_model

    def update_from_view_model(self) -> None:
        if not self._view_model:
            return

        self._view_model.refresh_reports()
        reports = self._view_model.reports

        self._metric_reports.update_values("Total Reports", str(len(reports)), "Loaded from exports")
        self._metric_events.update_values("Total Events", str(sum(r.total_events for r in reports)), "Across all reports")
        self._metric_critical.update_values("Critical Alerts", str(sum(r.severity_counts.get("critical", 0) for r in reports)), "Requires attention")

        self._table.setRowCount(0)
        for report in reports:
            row = self._table.rowCount()
            self._table.insertRow(row)
            self._table.setItem(row, 0, QTableWidgetItem(report.simulator_name))
            self._table.setItem(row, 1, QTableWidgetItem(report.session_id))
            self._table.setItem(row, 2, QTableWidgetItem(report.generated_at))
            self._table.setItem(row, 3, QTableWidgetItem(report.completion_status))
            self._table.setItem(row, 4, QTableWidgetItem(str(report.total_events)))
            self._table.setItem(row, 5, QTableWidgetItem(str(report.severity_counts.get("critical", 0))))
            self._table.setItem(row, 6, QTableWidgetItem(str(report.severity_counts.get("high", 0))))
            self._table.item(row, 0).setData(Qt.ItemDataRole.UserRole, report)

    def _on_simulator_changed(self, text: str) -> None:
        if self._view_model:
            self._view_model.set_simulator_filter(text if text != "All" else "")
            self.update_from_view_model()

    def _on_search_changed(self, text: str) -> None:
        if self._view_model:
            self._view_model.set_search_filter(text)
            self.update_from_view_model()

    def _on_refresh(self) -> None:
        self.update_from_view_model()

    def _on_table_selection(self) -> None:
        if not self._view_model:
            return
        row = self._table.currentRow()
        if row < 0:
            return
        item = self._table.item(row, 0)
        if not item:
            return
        report = item.data(Qt.ItemDataRole.UserRole)
        if report:
            self._view_model.select_report(report)
            self._detail_output.setPlainText(json.dumps(report.data, indent=2))

    def _on_export_json(self) -> None:
        row = self._table.currentRow()
        if row < 0:
            return
        item = self._table.item(row, 0)
        if item:
            report = item.data(Qt.ItemDataRole.UserRole)
            if report and self._view_model:
                self._view_model.export_report(report, "json")

    def _on_export_txt(self) -> None:
        row = self._table.currentRow()
        if row < 0:
            return
        item = self._table.item(row, 0)
        if item:
            report = item.data(Qt.ItemDataRole.UserRole)
            if report and self._view_model:
                self._view_model.export_report(report, "text")