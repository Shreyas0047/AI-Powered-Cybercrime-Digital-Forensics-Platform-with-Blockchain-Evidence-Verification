"""PyQt application shell.

This module wires the runtime into the main window and keeps the event loop
startup isolated from business services.
"""

from __future__ import annotations

import sys

from PyQt6.QtWidgets import QApplication

from forensics_sandbox_agent.app.bootstrap.runtime import ApplicationRuntime
from forensics_sandbox_agent.app.presentation.qt.theme.style_sheet import (
    build_style_sheet,
)
from forensics_sandbox_agent.app.presentation.qt.viewmodels.main_window_view_model import (
    MainWindowViewModel,
)
from forensics_sandbox_agent.app.presentation.qt.windows.main_window import MainWindow


class DesktopApplication:
    """Thin wrapper around the Qt event loop."""

    def __init__(self, runtime: ApplicationRuntime) -> None:
        self._runtime = runtime
        self._qt_app = QApplication(sys.argv)
        self._qt_app.setApplicationName(runtime.settings.application.name)
        self._qt_app.setApplicationVersion(runtime.settings.application.version)
        self._qt_app.setStyleSheet(build_style_sheet())

        self._view_model = MainWindowViewModel(runtime=runtime)
        self._main_window = MainWindow(view_model=self._view_model)

    def run(self) -> int:
        """Show the main window and start the event loop."""
        self._main_window.show()
        return self._qt_app.exec()
