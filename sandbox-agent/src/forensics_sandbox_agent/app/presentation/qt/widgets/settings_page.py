"""Platform settings page widget."""

from __future__ import annotations

from typing import Optional

from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont
from PyQt6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QFormLayout,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QScrollArea,
    QTabWidget,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)


class SettingsPage(QWidget):
    """Page for managing platform settings."""

    def __init__(
        self,
        view_model: Optional[object] = None,
        parent: Optional[QWidget] = None,
    ) -> None:
        super().__init__(parent)
        self._view_model = view_model
        self._setup_ui()
        self.update_from_view_model()

    def _setup_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(16)

        self._setup_tabs(layout)
        self._setup_actions(layout)
        self._setup_output(layout)

    def _setup_tabs(self, parent: QVBoxLayout) -> None:
        self._tabs = QTabWidget()

        self._tab_vm = QWidget()
        self._setup_vm_tab()
        self._tabs.addTab(self._tab_vm, "VM Configuration")

        self._tab_monitoring = QWidget()
        self._setup_monitoring_tab()
        self._tabs.addTab(self._tab_monitoring, "Monitoring")

        self._tab_execution = QWidget()
        self._setup_execution_tab()
        self._tabs.addTab(self._tab_execution, "Execution")

        self._tab_logging = QWidget()
        self._setup_logging_tab()
        self._tabs.addTab(self._tab_logging, "Logging")

        self._tab_notifications = QWidget()
        self._setup_notifications_tab()
        self._tabs.addTab(self._tab_notifications, "Notifications")

        parent.addWidget(self._tabs)

    def _setup_vm_tab(self) -> None:
        layout = QFormLayout(self._tab_vm)
        layout.setLabelAlignment(Qt.AlignmentFlag.AlignRight)

        self._vm_name_input = QLineEdit()
        self._vm_name_input.setPlaceholderText("ForensicsSandbox")
        layout.addRow("VM Name:", self._vm_name_input)

        self._snapshot_name_input = QLineEdit()
        self._snapshot_name_input.setPlaceholderText("CleanBaseline")
        layout.addRow("Snapshot Name:", self._snapshot_name_input)

        self._startup_timeout_input = QLineEdit()
        self._startup_timeout_input.setPlaceholderText("60")
        layout.addRow("Startup Timeout (s):", self._startup_timeout_input)

        self._shutdown_timeout_input = QLineEdit()
        self._shutdown_timeout_input.setPlaceholderText("30")
        layout.addRow("Shutdown Timeout (s):", self._shutdown_timeout_input)

    def _setup_monitoring_tab(self) -> None:
        layout = QFormLayout(self._tab_monitoring)
        layout.setLabelAlignment(Qt.AlignmentFlag.AlignRight)

        self._monitoring_enabled_cb = QCheckBox()
        layout.addRow("Enable Monitoring:", self._monitoring_enabled_cb)

        self._polling_interval_input = QLineEdit()
        self._polling_interval_input.setPlaceholderText("5000")
        layout.addRow("Polling Interval (ms):", self._polling_interval_input)

        self._log_retention_input = QLineEdit()
        self._log_retention_input.setPlaceholderText("30")
        layout.addRow("Log Retention (days):", self._log_retention_input)

    def _setup_execution_tab(self) -> None:
        layout = QFormLayout(self._tab_execution)
        layout.setLabelAlignment(Qt.AlignmentFlag.AlignRight)

        self._execution_timeout_input = QLineEdit()
        self._execution_timeout_input.setPlaceholderText("300")
        layout.addRow("Timeout (seconds):", self._execution_timeout_input)

        self._auto_rollback_cb = QCheckBox()
        layout.addRow("Auto Rollback:", self._auto_rollback_cb)

        self._max_concurrent_input = QLineEdit()
        self._max_concurrent_input.setPlaceholderText("1")
        layout.addRow("Max Concurrent Sessions:", self._max_concurrent_input)

    def _setup_logging_tab(self) -> None:
        layout = QFormLayout(self._tab_logging)
        layout.setLabelAlignment(Qt.AlignmentFlag.AlignRight)

        self._log_level_combo = QComboBox()
        self._log_level_combo.addItems(["debug", "info", "warning", "error", "critical"])
        layout.addRow("Log Level:", self._log_level_combo)

    def _setup_notifications_tab(self) -> None:
        layout = QFormLayout(self._tab_notifications)
        layout.setLabelAlignment(Qt.AlignmentFlag.AlignRight)

        self._alerts_enabled_cb = QCheckBox()
        layout.addRow("Enable Alerts:", self._alerts_enabled_cb)

        self._webhook_url_input = QLineEdit()
        self._webhook_url_input.setPlaceholderText("https://example.com/webhook")
        layout.addRow("Webhook URL:", self._webhook_url_input)

    def _setup_actions(self, parent: QVBoxLayout) -> None:
        actions_group = QGroupBox("Actions")
        actions_layout = QHBoxLayout(actions_group)

        self._save_btn = QPushButton("Save Settings")
        self._save_btn.clicked.connect(self._on_save)
        actions_layout.addWidget(self._save_btn)

        self._reset_btn = QPushButton("Reset to Saved")
        self._reset_btn.clicked.connect(self._on_reset)
        actions_layout.addWidget(self._reset_btn)

        self._validation_label = QLabel("")
        self._validation_label.setStyleSheet("color: #ef4444; font-weight: bold;")
        actions_layout.addWidget(self._validation_label)
        actions_layout.addStretch()

        parent.addWidget(actions_group)

    def _setup_output(self, parent: QVBoxLayout) -> None:
        output_group = QGroupBox("Status Log")
        output_layout = QVBoxLayout(output_group)
        self._output = QTextEdit()
        self._output.setReadOnly(True)
        self._output.setFont(QFont("Consolas", 9))
        self._output.setMaximumHeight(150)
        output_layout.addWidget(self._output)
        parent.addWidget(output_group)

    def set_view_model(self, view_model: object) -> None:
        self._view_model = view_model

    def update_from_view_model(self) -> None:
        if not self._view_model:
            return

        vm = self._view_model
        self._vm_name_input.setText(vm.vm_name)
        self._snapshot_name_input.setText(vm.snapshot_name)
        self._startup_timeout_input.setText(str(vm.startup_timeout))
        self._shutdown_timeout_input.setText(str(vm.shutdown_timeout))
        self._monitoring_enabled_cb.setChecked(vm.monitoring_enabled)
        self._polling_interval_input.setText(str(vm.polling_interval))
        self._log_retention_input.setText(str(vm.log_retention_days))
        self._log_level_combo.setCurrentText(vm.log_level)
        self._execution_timeout_input.setText(str(vm.execution_timeout))
        self._auto_rollback_cb.setChecked(vm.auto_rollback)
        self._max_concurrent_input.setText(str(vm.max_concurrent_sessions))
        self._alerts_enabled_cb.setChecked(vm.alerts_enabled)
        self._webhook_url_input.setText(vm.webhook_url)

    def _on_save(self) -> None:
        if not self._view_model:
            return
        vm = self._view_model
        vm.set_vm_name(self._vm_name_input.text())
        vm.set_snapshot_name(self._snapshot_name_input.text())
        vm.set_startup_timeout(int(self._startup_timeout_input.text() or "0"))
        vm.set_shutdown_timeout(int(self._shutdown_timeout_input.text() or "0"))
        vm.set_monitoring_enabled(self._monitoring_enabled_cb.isChecked())
        vm.set_polling_interval(int(self._polling_interval_input.text() or "5000"))
        vm.set_log_retention_days(int(self._log_retention_input.text() or "30"))
        vm.set_log_level(self._log_level_combo.currentText())
        vm.set_execution_timeout(int(self._execution_timeout_input.text() or "0"))
        vm.set_auto_rollback(self._auto_rollback_cb.isChecked())
        vm.set_max_concurrent_sessions(int(self._max_concurrent_input.text() or "1"))
        vm.set_alerts_enabled(self._alerts_enabled_cb.isChecked())
        vm.set_webhook_url(self._webhook_url_input.text())

        if vm.save_settings():
            self._validation_label.setText("")
        else:
            errors = vm.validation_errors
            self._validation_label.setText("; ".join(errors))

        self._output.setPlainText(vm.output)

    def _on_reset(self) -> None:
        if self._view_model:
            self._view_model.reset_settings()
            self.update_from_view_model()
            self._output.setPlainText(self._view_model.output)