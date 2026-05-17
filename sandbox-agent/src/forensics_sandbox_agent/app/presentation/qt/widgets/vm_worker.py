"""VM worker thread for non-blocking VM operations."""

from __future__ import annotations

import logging
from typing import Callable, Optional
from PyQt6.QtCore import QThread, pyqtSignal


class VmWorker(QThread):
    """Worker thread for VirtualBox VM operations to keep UI responsive."""

    finished = pyqtSignal(bool, str)  # success, message
    progress = pyqtSignal(str)

    def __init__(
        self,
        operation: Callable,
        op_name: str,
        logger: logging.Logger,
        *args,
        **kwargs
    ) -> None:
        super().__init__()
        self._operation = operation
        self._op_name = op_name
        self._logger = logger
        self._args = args
        self._kwargs = kwargs

    def run(self) -> None:
        """Execute the VM operation."""
        try:
            self.progress.emit(f"Executing {self._op_name}...")
            self._operation(*self._args, **self._kwargs)
            self.finished.emit(True, f"{self._op_name} completed successfully")
        except Exception as e:
            self._logger.error(f"VM operation {self._op_name} failed: {e}")
            self.finished.emit(False, str(e))
