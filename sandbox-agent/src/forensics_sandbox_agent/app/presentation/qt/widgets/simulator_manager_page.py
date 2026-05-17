"""Simulator catalog management page."""

from __future__ import annotations

from collections.abc import Callable
from typing import Optional

from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont
from PyQt6.QtWidgets import (
    QGroupBox,
    QHBoxLayout,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QTextEdit,
    QVBoxLayout,
    QWidget,
    QHeaderView,
)

from forensics_sandbox_agent.app.presentation.qt.viewmodels.simulator_manager_view_model import (
    SimulatorManagerViewModel,
)
from forensics_sandbox_agent.domain.entities.simulator_descriptor import SimulatorDescriptor


class SimulatorManagerPage(QWidget):
    """Working simulator catalog page with validation actions."""

    def __init__(
        self,
        view_model: SimulatorManagerViewModel,
        on_navigate: Optional[Callable[[str], None]] = None,
        parent: Optional[QWidget] = None,
    ) -> None:
        super().__init__(parent)
        self._view_model = view_model
        self._on_navigate = on_navigate
        self._setup_ui()
        self.update_from_view_model()

    def _setup_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(16)

        catalog_group = QGroupBox("Simulator Catalog")
        catalog_layout = QVBoxLayout(catalog_group)

        self._table = QTableWidget()
        self._table.setColumnCount(5)
        self._table.setHorizontalHeaderLabels(["Simulator", "Category", "Version", "Executable", "Status"])
        self._table.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self._table.setSelectionBehavior(QTableWidget.SelectionBehavior.SelectRows)
        self._table.setSelectionMode(QTableWidget.SelectionMode.SingleSelection)
        self._table.setAlternatingRowColors(True)
        catalog_layout.addWidget(self._table)

        actions = QHBoxLayout()
        self._refresh_button = QPushButton("Refresh Catalog")
        self._refresh_button.clicked.connect(self._on_refresh)
        self._validate_button = QPushButton("Validate Selected")
        self._validate_button.clicked.connect(self._on_validate_selected)
        self._sandbox_button = QPushButton("Open Sandbox Control")
        self._sandbox_button.clicked.connect(self._on_open_sandbox)

        actions.addWidget(self._refresh_button)
        actions.addWidget(self._validate_button)
        actions.addStretch()
        actions.addWidget(self._sandbox_button)
        catalog_layout.addLayout(actions)

        layout.addWidget(catalog_group)

        output_group = QGroupBox("Catalog Log")
        output_layout = QVBoxLayout(output_group)
        self._output = QTextEdit()
        self._output.setReadOnly(True)
        self._output.setMaximumHeight(180)
        self._output.setFont(QFont("Consolas", 9))
        output_layout.addWidget(self._output)
        layout.addWidget(output_group)

    def update_from_view_model(self) -> None:
        """Refresh table and output from the view model."""
        simulators = self._view_model.simulators
        self._table.setRowCount(0)

        for simulator in simulators:
            row = self._table.rowCount()
            self._table.insertRow(row)
            self._set_item(row, 0, simulator.display_name, simulator)
            self._set_item(row, 1, simulator.category, simulator)
            self._set_item(row, 2, simulator.version, simulator)
            self._set_item(row, 3, simulator.executable_path or "Not resolved", simulator)
            self._set_item(row, 4, "Ready" if simulator.executable_exists else "Missing executable", simulator)

        self._output.setPlainText(self._view_model.output)

    def _set_item(self, row: int, column: int, text: str, simulator: SimulatorDescriptor) -> None:
        item = QTableWidgetItem(text)
        item.setData(Qt.ItemDataRole.UserRole, simulator)
        self._table.setItem(row, column, item)

    def _selected_simulator(self) -> Optional[SimulatorDescriptor]:
        row = self._table.currentRow()
        if row < 0:
            return None
        item = self._table.item(row, 0)
        if item is None:
            return None
        return item.data(Qt.ItemDataRole.UserRole)

    def _on_refresh(self) -> None:
        self._view_model.refresh_catalog()
        self.update_from_view_model()

    def _on_validate_selected(self) -> None:
        simulator = self._selected_simulator()
        if simulator is None:
            self._view_model.append_output("Select a simulator before validating")
        else:
            self._view_model.validate_simulator(simulator)
        self.update_from_view_model()

    def _on_open_sandbox(self) -> None:
        if self._on_navigate:
            self._on_navigate("sandbox-control")
