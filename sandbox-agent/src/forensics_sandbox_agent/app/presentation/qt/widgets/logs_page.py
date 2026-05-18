"""Application logs page widget with terminal-style display."""

from __future__ import annotations

import re
from typing import Optional

from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QFont, QColor, QTextCharFormat, QTextCursor
from PyQt6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)


class LogsPage(QWidget):
    """Terminal-style log viewer page."""

    def __init__(
        self,
        view_model: Optional[object] = None,
        parent: Optional[QWidget] = None,
    ) -> None:
        super().__init__(parent)
        self._view_model = view_model
        self._auto_refresh = False
        self._setup_ui()
        self.update_from_view_model()

    def _setup_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(16)

        self._setup_stats(layout)
        self._setup_filters(layout)
        self._setup_terminal(layout)
        self._setup_stats_detail(layout)

    def _setup_stats(self, parent: QVBoxLayout) -> None:
        stats_box = QHBoxLayout()
        stats_box.setSpacing(12)
        self._stat_total = QLabel("Total: 0")
        self._stat_total.setStyleSheet("font-weight: bold; color: #3b82f6;")
        self._stat_debug = QLabel("Debug: 0")
        self._stat_info = QLabel("Info: 0")
        self._stat_warning = QLabel("Warning: 0")
        self._stat_error = QLabel("Error: 0")
        self._stat_critical = QLabel("Critical: 0")
        for s in (self._stat_total, self._stat_debug, self._stat_info,
                  self._stat_warning, self._stat_error, self._stat_critical):
            stats_box.addWidget(s)
        stats_box.addStretch()
        parent.addLayout(stats_box)

    def _setup_filters(self, parent: QVBoxLayout) -> None:
        filter_group = QGroupBox("Filters")
        filter_layout = QHBoxLayout(filter_group)

        filter_layout.addWidget(QLabel("Level:"))
        self._level_combo = QComboBox()
        self._level_combo.addItems(["All", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"])
        self._level_combo.currentTextChanged.connect(self._on_level_changed)
        filter_layout.addWidget(self._level_combo)

        filter_layout.addWidget(QLabel("Category:"))
        self._category_combo = QComboBox()
        self._category_combo.addItems(["All"])
        self._category_combo.currentTextChanged.connect(self._on_category_changed)
        filter_layout.addWidget(self._category_combo)

        filter_layout.addWidget(QLabel("Search:"))
        self._search_input = QLineEdit()
        self._search_input.setPlaceholderText("Search logs...")
        self._search_input.textChanged.connect(self._on_search_changed)
        filter_layout.addWidget(self._search_input)

        self._auto_refresh_cb = QCheckBox("Auto-refresh")
        self._auto_refresh_cb.toggled.connect(self._on_auto_refresh_toggled)
        filter_layout.addWidget(self._auto_refresh_cb)

        self._refresh_btn = QPushButton("Refresh")
        self._refresh_btn.clicked.connect(self._on_refresh)
        filter_layout.addWidget(self._refresh_btn)

        self._export_btn = QPushButton("Export")
        self._export_btn.clicked.connect(self._on_export)
        filter_layout.addWidget(self._export_btn)

        parent.addWidget(filter_group)

    def _setup_terminal(self, parent: QVBoxLayout) -> None:
        terminal_group = QGroupBox("Log Stream")
        terminal_layout = QVBoxLayout(terminal_group)

        self._terminal = QTextEdit()
        self._terminal.setReadOnly(True)
        font = QFont("Consolas", 9)
        self._terminal.setFont(font)
        self._terminal.setStyleSheet("""
            QTextEdit {
                background-color: #1e293b;
                color: #e2e8f0;
                border: 1px solid #334155;
                border-radius: 8px;
            }
        """)
        terminal_layout.addWidget(self._terminal)

        parent.addWidget(terminal_group)

    def _setup_stats_detail(self, parent: QVBoxLayout) -> None:
        self._level_distribution = QLabel("")
        self._level_distribution.setStyleSheet("font-size: 11px; color: #64748b;")
        parent.addWidget(self._level_distribution)

    def set_view_model(self, view_model: object) -> None:
        self._view_model = view_model

    def update_from_view_model(self) -> None:
        if not self._view_model:
            return

        vm = self._view_model
        vm.refresh()
        lines = vm.lines
        stats = vm.stats

        self._stat_total.setText(f"Total: {len(lines)}")
        by_level = stats.get("by_level", {})
        self._stat_debug.setText(f"Debug: {by_level.get('DEBUG', 0)}")
        self._stat_info.setText(f"Info: {by_level.get('INFO', 0)}")
        self._stat_warning.setText(f"Warning: {by_level.get('WARNING', 0)}")
        self._stat_error.setText(f"Error: {by_level.get('ERROR', 0)}")
        self._stat_critical.setText(f"Critical: {by_level.get('CRITICAL', 0)}")

        categories = list(stats.get("by_category", {}).keys())
        current = self._category_combo.currentText()
        self._category_combo.blockSignals(True)
        self._category_combo.clear()
        self._category_combo.addItems(["All"] + categories)
        if current in categories:
            self._category_combo.setCurrentText(current)
        self._category_combo.blockSignals(False)

        level_parts = []
        for level, count in sorted(by_level.items()):
            level_parts.append(f"{level}: {count}")
        self._level_distribution.setText(" | ".join(level_parts))

        self._render_terminal(lines)

    def _render_terminal(self, lines: list) -> None:
        self._terminal.clear()
        for line in lines:
            color = line.color
            fmt = QTextCharFormat()
            fmt.setForeground(QColor(color))
            self._terminal.moveCursor(QTextCursor.MoveOperation.End)
            self._terminal.setTextColor(QColor(color))
            self._terminal.insertPlainText(f"[{line.level:<8}] {line.timestamp} [{line.category:<12}] {line.message}\n")

    def _on_level_changed(self, text: str) -> None:
        if self._view_model:
            self._view_model.set_level_filter(text if text != "All" else "")
            self.update_from_view_model()

    def _on_category_changed(self, text: str) -> None:
        if self._view_model:
            self._view_model.set_category_filter(text if text != "All" else "")
            self.update_from_view_model()

    def _on_search_changed(self, text: str) -> None:
        if self._view_model:
            self._view_model.set_search_filter(text)
            self.update_from_view_model()

    def _on_auto_refresh_toggled(self, checked: bool) -> None:
        self._auto_refresh = checked
        if checked:
            self._timer = QTimer(self)
            self._timer.timeout.connect(self.update_from_view_model)
            self._timer.start(5000)
        else:
            if hasattr(self, "_timer"):
                self._timer.stop()

    def _on_refresh(self) -> None:
        self.update_from_view_model()

    def _on_export(self) -> None:
        if not self._view_model:
            return
        content = self._view_model.export_logs()
        if content:
            from PyQt6.QtWidgets import QFileDialog
            path, _ = QFileDialog.getSaveFileName(
                self, "Export Logs", "logs_export.log", "Log Files (*.log)"
            )
            if path:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)