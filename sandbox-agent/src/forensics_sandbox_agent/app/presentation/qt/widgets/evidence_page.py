"""Evidence artifacts page widget."""

from __future__ import annotations

import json
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

from forensics_sandbox_agent.app.presentation.qt.viewmodels.evidence_view_model import (
    EvidenceViewModel,
)
from forensics_sandbox_agent.app.presentation.qt.viewmodels.evidence_view_model import (
    EvidenceArtifact,
)
from forensics_sandbox_agent.app.presentation.qt.widgets.metric_card import (
    MetricCard,
)


class EvidencePage(QWidget):
    """Page for browsing forensic events as evidence artifacts."""

    def __init__(
        self,
        view_model: Optional[EvidenceViewModel] = None,
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
        self._metric_total = MetricCard("Total Artifacts", "0", delta="Forensic events loaded", accent=False)
        self._metric_verified = MetricCard("High/Critical", "0", delta="Requires investigation", accent=False)
        self._metric_suspicious = MetricCard("Suspicious Activities", "0", delta="Behavioral alerts", accent=False)
        for m in (self._metric_total, self._metric_verified, self._metric_suspicious):
            m.setMinimumHeight(90)
        metrics_box.addWidget(self._metric_total)
        metrics_box.addWidget(self._metric_verified)
        metrics_box.addWidget(self._metric_suspicious)
        parent.addLayout(metrics_box)

    def _setup_filters(self, parent: QVBoxLayout) -> None:
        filter_group = QGroupBox("Filters")
        filter_layout = QHBoxLayout(filter_group)

        filter_layout.addWidget(QLabel("Category:"))
        self._category_combo = QComboBox()
        self._category_combo.addItems([
            "All", "process", "file_system", "registry", "network", "behavior", "system",
        ])
        self._category_combo.currentTextChanged.connect(self._on_category_changed)
        filter_layout.addWidget(self._category_combo)

        filter_layout.addWidget(QLabel("Severity:"))
        self._severity_combo = QComboBox()
        self._severity_combo.addItems(["All", "critical", "high", "medium", "low", "info"])
        self._severity_combo.currentTextChanged.connect(self._on_severity_changed)
        filter_layout.addWidget(self._severity_combo)

        filter_layout.addWidget(QLabel("Search:"))
        self._search_input = QLineEdit()
        self._search_input.setPlaceholderText("Search artifacts...")
        self._search_input.textChanged.connect(self._on_search_changed)
        filter_layout.addWidget(self._search_input)

        self._refresh_btn = QPushButton("Refresh")
        self._refresh_btn.clicked.connect(self._on_refresh)
        filter_layout.addWidget(self._refresh_btn)
        filter_layout.addStretch()

        parent.addWidget(filter_group)

    def _setup_table(self, parent: QVBoxLayout) -> None:
        table_group = QGroupBox("Evidence Artifacts")
        table_layout = QVBoxLayout(table_group)

        self._table = QTableWidget()
        self._table.setColumnCount(5)
        self._table.setHorizontalHeaderLabels(["Timestamp", "Category", "Operation", "Severity", "Source"])
        self._table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self._table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self._table.setAlternatingRowColors(True)
        self._table.setFont(QFont("", 9))
        self._table.itemSelectionChanged.connect(self._on_table_selection)
        table_layout.addWidget(self._table)

        parent.addWidget(table_group)

    def _setup_detail(self, parent: QVBoxLayout) -> None:
        detail_group = QGroupBox("Artifact Detail")
        detail_layout = QVBoxLayout(detail_group)

        self._detail_output = QTextEdit()
        self._detail_output.setReadOnly(True)
        self._detail_output.setFont(QFont("Consolas", 9))
        self._detail_output.setMaximumHeight(250)
        detail_layout.addWidget(self._detail_output)

        parent.addWidget(detail_group)

    def set_view_model(self, view_model: EvidenceViewModel) -> None:
        self._view_model = view_model

    def update_from_view_model(self) -> None:
        if not self._view_model:
            return

        self._view_model.refresh()
        artifacts = self._view_model.artifacts
        suspicious = self._view_model.suspicious_activities

        self._metric_total.update_values("Total Artifacts", str(len(artifacts)), "Forensic events loaded")
        self._metric_verified.update_values("High/Critical", str(len([a for a in artifacts if a.severity in ("critical", "high")])), "Requires investigation")
        self._metric_suspicious.update_values("Suspicious Activities", str(len(suspicious)), "Behavioral alerts")

        self._table.setRowCount(0)
        for artifact in artifacts:
            row = self._table.rowCount()
            self._table.insertRow(row)
            self._table.setItem(row, 0, QTableWidgetItem(artifact.timestamp))
            self._table.setItem(row, 1, QTableWidgetItem(artifact.category))
            self._table.setItem(row, 2, QTableWidgetItem(artifact.operation))
            self._table.setItem(row, 3, QTableWidgetItem(artifact.severity))
            self._table.setItem(row, 4, QTableWidgetItem(artifact.source))
            self._table.item(row, 0).setData(Qt.ItemDataRole.UserRole, artifact)

    def _on_category_changed(self, text: str) -> None:
        if self._view_model:
            self._view_model.set_category_filter(text if text != "All" else "")
            self.update_from_view_model()

    def _on_severity_changed(self, text: str) -> None:
        if self._view_model:
            self._view_model.set_severity_filter(text if text != "All" else "")
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
        artifact = item.data(Qt.ItemDataRole.UserRole)
        if artifact:
            self._view_model.select_artifact(artifact)
            event = artifact.raw_event
            detail = {
                "event_id": event.event_id,
                "timestamp": str(event.timestamp),
                "category": event.category.value,
                "operation": event.operation.value,
                "severity": event.severity.value,
                "source": event.source,
                "details": dict(event.details),
                "suspicious_indicators": [
                    {"type": si.indicator_type, "description": si.description, "score": si.score}
                    for si in (event.suspicious_indicators or [])
                ],
            }
            self._detail_output.setPlainText(json.dumps(detail, indent=2))