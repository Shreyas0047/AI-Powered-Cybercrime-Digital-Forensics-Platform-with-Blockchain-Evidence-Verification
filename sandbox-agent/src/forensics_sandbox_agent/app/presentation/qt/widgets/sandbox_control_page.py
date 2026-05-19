"""Sandbox control page widget."""

from __future__ import annotations

from typing import Optional
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QPushButton, QTextEdit, QGroupBox,
    QFrame, QListWidget, QListWidgetItem,
)
from PyQt6.QtCore import Qt, pyqtSignal, QTimer
from PyQt6.QtGui import QFont

from forensics_sandbox_agent.app.presentation.qt.viewmodels.sandbox_control_view_model import (
    SandboxControlViewModel,
)
from forensics_sandbox_agent.app.presentation.qt.widgets.vm_worker import VmWorker


class SandboxControlPage(QWidget):
    """Sandbox control and execution workspace."""

    execute_requested = pyqtSignal(object)

    def __init__(self, view_model: Optional[SandboxControlViewModel] = None, parent: Optional[QWidget] = None) -> None:
        super().__init__(parent)
        self._view_model = view_model
        self._vm_worker: Optional[VmWorker] = None
        
        # Setup periodic refresh timer
        self._refresh_timer = QTimer(self)
        self._refresh_timer.setInterval(2000)  # 2 seconds
        self._refresh_timer.timeout.connect(self.update_from_view_model)
        self._refresh_timer.start()
        
        self._setup_ui()

    def _setup_ui(self) -> None:
        """Setup the UI components."""
        main_layout = QVBoxLayout(self)
        main_layout.setSpacing(16)

        self._setup_vm_control_section(main_layout)
        self._setup_simulator_section(main_layout)
        self._setup_execution_log_section(main_layout)

        main_layout.addStretch()

    def _setup_vm_control_section(self, parent: QVBoxLayout) -> None:
        """Setup VM control section."""
        vm_group = QGroupBox("Virtual Machine Control")
        vm_layout = QGridLayout(vm_group)

        status_label = QLabel("VM Status:")
        status_label.setFont(QFont("", weight=QFont.Weight.Bold))
        self._vm_status_label = QLabel("Unknown")
        self._vm_status_label.setStyleSheet("color: #666666; font-weight: bold;")

        ready_label = QLabel("Ready:")
        self._vm_ready_label = QLabel("No")

        self._start_vm_button = QPushButton("Start VM")
        self._start_vm_button.clicked.connect(self._on_start_vm)
        self._start_vm_button.setMinimumWidth(100)

        self._stop_vm_button = QPushButton("Stop VM")
        self._stop_vm_button.clicked.connect(self._on_stop_vm)
        self._stop_vm_button.setMinimumWidth(100)

        self._restore_snapshot_button = QPushButton("Restore Snapshot")
        self._restore_snapshot_button.clicked.connect(self._on_restore_snapshot)
        self._restore_snapshot_button.setMinimumWidth(120)

        vm_layout.addWidget(status_label, 0, 0)
        vm_layout.addWidget(self._vm_status_label, 0, 1)
        vm_layout.addWidget(ready_label, 0, 2)
        vm_layout.addWidget(self._vm_ready_label, 0, 3)
        vm_layout.addWidget(self._start_vm_button, 1, 0)
        vm_layout.addWidget(self._stop_vm_button, 1, 1)
        vm_layout.addWidget(self._restore_snapshot_button, 1, 2)

        parent.addWidget(vm_group)

    def _setup_simulator_section(self, parent: QVBoxLayout) -> None:
        """Setup simulator selection section."""
        sim_group = QGroupBox("Simulator Selection")
        sim_layout = QHBoxLayout(sim_group)

        self._simulator_list = QListWidget()
        self._simulator_list.setMaximumHeight(120)
        self._simulator_list.itemDoubleClicked.connect(self._on_execute_simulator)
        self._simulator_list.itemSelectionChanged.connect(self.update_from_view_model)

        sim_layout.addWidget(self._simulator_list)

        button_layout = QVBoxLayout()

        self._execute_button = QPushButton("Execute Selected")
        self._execute_button.clicked.connect(self._on_execute_simulator)
        self._execute_button.setEnabled(False)

        self._refresh_button = QPushButton("Refresh")
        self._refresh_button.clicked.connect(self._on_refresh)

        button_layout.addWidget(self._execute_button)
        button_layout.addWidget(self._refresh_button)
        button_layout.addStretch()

        sim_layout.addLayout(button_layout)

        parent.addWidget(sim_group)

    def _setup_execution_log_section(self, parent: QVBoxLayout) -> None:
        """Setup execution log section."""
        log_group = QGroupBox("Execution Log")
        log_layout = QVBoxLayout(log_group)

        self._execution_log = QTextEdit()
        self._execution_log.setReadOnly(True)
        self._execution_log.setMaximumHeight(200)
        self._execution_log.setFont(QFont("Consolas", 9))

        log_layout.addWidget(self._execution_log)

        log_buttons = QHBoxLayout()
        log_buttons.addStretch()

        clear_button = QPushButton("Clear Log")
        clear_button.clicked.connect(self._on_clear_log)

        log_buttons.addWidget(clear_button)

        log_layout.addLayout(log_buttons)

        parent.addWidget(log_group)

    def set_view_model(self, view_model: SandboxControlViewModel) -> None:
        """Set the view model."""
        self._view_model = view_model

    def update_from_view_model(self) -> None:
        """Update UI from view model."""
        if not self._view_model:
            return

        self._view_model.refresh_status()
        self._vm_status_label.setText(self._view_model.vm_status_display)

        ready = self._view_model.vm_ready
        self._vm_ready_label.setText("Yes" if ready else "No")
        self._vm_ready_label.setStyleSheet(
            "color: #4caf50; font-weight: bold;" if ready else "color: #f44336; font-weight: bold;"
        )

        # Only enable buttons if no worker is running
        if not self._vm_worker:
            self._start_vm_button.setEnabled(self._view_model.can_start_vm)
            self._stop_vm_button.setEnabled(self._view_model.can_stop_vm)
            self._restore_snapshot_button.setEnabled(self._view_model.can_restore_snapshot)
            
            # Execute can run the full restore/start/transfer workflow once a simulator is selected.
            has_selection = self._simulator_list.currentItem() is not None
            self._execute_button.setEnabled(self._view_model.can_execute and has_selection)

        diagnostics = []
        if not self._view_model.vbox_available:
            diagnostics.append("VBoxManage is not available")
        if not self._view_model.vm_exists:
            diagnostics.append("Configured VM was not found")
        if not self._view_model.snapshot_exists:
            diagnostics.append("Clean snapshot was not found")
        diagnostics.extend(self._view_model.vm_ready_errors)
        diagnostic_text = "\n".join(diagnostics) if diagnostics else "VM configuration is available"
        self._vm_status_label.setToolTip(diagnostic_text)
        self._vm_ready_label.setToolTip(diagnostic_text)

        self._execution_log.setPlainText(self._view_model.execution_output)

        self._update_simulator_list()

    def _update_simulator_list(self) -> None:
        """Update simulator list from view model."""
        if not self._view_model:
            return

        if self._simulator_list.count() == len(self._view_model.available_simulators):
            return

        self._simulator_list.clear()

        for sim in self._view_model.available_simulators:
            item = QListWidgetItem(sim.display_name)
            item.setData(Qt.ItemDataRole.UserRole, sim)
            self._simulator_list.addItem(item)

    def _on_start_vm(self) -> None:
        """Handle start VM button click."""
        if not self._view_model or self._vm_worker:
            return
        if not self._view_model.can_start_vm:
            self._view_model.append_output("Start VM is not available: check VM configuration and VirtualBox status.")
            self.update_from_view_model()
            return

        self._start_vm_button.setEnabled(False)
        self._view_model._is_executing = True
        self._view_model.append_output("Initiating Start VM sequence...")
        self.update_from_view_model()
        
        self._vm_worker = VmWorker(
            self._view_model.start_vm_sync,
            "Start VM",
            self._view_model._logger
        )
        self._vm_worker.progress.connect(self._on_worker_progress)
        self._vm_worker.finished.connect(self._on_worker_finished)
        self._vm_worker.start()

    def _on_stop_vm(self) -> None:
        """Handle stop VM button click."""
        if not self._view_model or self._vm_worker:
            return
        if not self._view_model.can_stop_vm:
            self._view_model.append_output("Stop VM is not available because the VM is not running.")
            self.update_from_view_model()
            return

        self._stop_vm_button.setEnabled(False)
        self._view_model._is_executing = True
        self._view_model.append_output("Initiating Stop VM sequence...")
        self.update_from_view_model()
        
        self._vm_worker = VmWorker(
            self._view_model.stop_vm_sync,
            "Stop VM",
            self._view_model._logger
        )
        self._vm_worker.progress.connect(self._on_worker_progress)
        self._vm_worker.finished.connect(self._on_worker_finished)
        self._vm_worker.start()

    def _on_restore_snapshot(self) -> None:
        """Handle restore snapshot button click."""
        if not self._view_model or self._vm_worker:
            return
        if not self._view_model.can_restore_snapshot:
            self._view_model.append_output("Restore Snapshot is not available: check VM and VirtualBox configuration.")
            self.update_from_view_model()
            return

        self._restore_snapshot_button.setEnabled(False)
        self._view_model._is_executing = True
        self._view_model.append_output("Initiating Restore Snapshot sequence...")
        self.update_from_view_model()
        
        self._vm_worker = VmWorker(
            self._view_model.restore_snapshot_sync,
            "Restore Snapshot",
            self._view_model._logger
        )
        self._vm_worker.progress.connect(self._on_worker_progress)
        self._vm_worker.finished.connect(self._on_worker_finished)
        self._vm_worker.start()

    def _on_worker_progress(self, message: str) -> None:
        """Handle worker progress updates."""
        if self._view_model:
            self._view_model.append_output(message)
            self.update_from_view_model()

    def _on_worker_finished(self, success: bool, message: str) -> None:
        """Handle worker completion."""
        if self._vm_worker:
            self._vm_worker.quit()
            self._vm_worker.wait()
            self._vm_worker = None
        if self._view_model:
            status = "SUCCESS" if success else "FAILED"
            self._view_model.append_output(f"{status}: {message}")
            self._view_model._is_executing = False
            self.update_from_view_model()

        self.update_from_view_model()

    def _on_refresh(self) -> None:
        """Handle refresh button click."""
        if self._view_model:
            self._view_model.refresh_simulators()
            self.update_from_view_model()

    def _on_execute_simulator(self, _item=None) -> None:
        """Handle execute simulator button click."""
        selected = self._simulator_list.currentItem()
        if not selected or not self._view_model or self._vm_worker:
            return
            
        simulator = selected.data(Qt.ItemDataRole.UserRole)
        if not simulator:
            return
        if not simulator.executable_exists:
            self._view_model.append_output(
                f"Simulator executable missing for {simulator.display_name}. Run the simulator build or check dist/simulators."
            )
            self.update_from_view_model()
            return
        if not self._view_model.can_execute:
            self._view_model.append_output(
                "Execution is not available: VM, snapshot, and VirtualBox must be configured first."
            )
            self.update_from_view_model()
            return

        # Start execution in background thread
        self._execute_button.setEnabled(False)
        self._view_model._is_executing = True
        self._view_model.append_output(f"Preparing execution: {simulator.display_name}...")
        self.update_from_view_model()
        
        self._vm_worker = VmWorker(
            self._view_model.execute_full_workflow_sync,
            "Full Execution",
            self._view_model._logger,
            simulator
        )
        self._vm_worker.progress.connect(self._on_worker_progress)
        self._vm_worker.finished.connect(self._on_worker_finished)
        self._vm_worker.start()

    def _on_clear_log(self) -> None:
        """Handle clear log button click."""
        if self._view_model:
            self._view_model.clear_output()
            self.update_from_view_model()
