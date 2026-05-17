"""Spyware simulator - SAFE behavioral simulation for forensic observation.

This simulator generates realistic spyware-like behavioral patterns
without collecting or exfiltrating any real data.
"""

from __future__ import annotations

import os
import sys
import time
import random
import logging
from typing import Optional

from forensics_simulator_common.contracts.manifest import SimulatorManifest, SimulatorCategory
from forensics_simulator_common.runtime.base import BaseSimulatorRuntime
from forensics_simulator_common.telemetry.events import SimulatorLogger


class SpywareSimulatorRuntime(BaseSimulatorRuntime):
    """Safe spyware-style behavior simulator for forensic training."""

    SYSTEM_INFO_KEYS = [
        "ComputerName",
        "UserName",
        "OSVersion",
        "Architecture",
        "ProcessorCount",
    ]

    def __init__(self, manifest: SimulatorManifest) -> None:
        super().__init__(manifest)
        self._collection_cycles = 10

    def run(self) -> None:
        """Execute spyware-like behavioral simulation."""
        logging.info("Starting spyware simulator - SAFE MODE")

        if self._logger:
            self._logger.emit_execution_stage("initialization")
            self._logger.emit_suspicious_behavior("spyware_simulation_start", {
                "description": "Simulating spyware behavior for forensic training"
            })

        self._simulate_system_information_collection()

        self._simulate_keyboard_state_monitoring()

        self._simulate_browser_history_enumeration()

        self._simulate_clipboard_monitoring()

        self._simulate_screen_monitoring()

        self._simulate_network_exfiltration_simulation()

        if self._logger:
            self._logger.emit_execution_stage("completed")
            self._logger.emit_suspicious_behavior("simulation_complete", {
                "collection_cycles": self._collection_cycles
            })

        logging.info("Spyware simulator completed")

    def _simulate_system_information_collection(self) -> None:
        """Simulate system information collection."""
        logging.info("Simulating system information collection...")

        for i in range(self._collection_cycles):
            for key in self.SYSTEM_INFO_KEYS:
                synthetic_value = self._generate_synthetic_system_info(key)

                if self._logger:
                    self._logger.emit_registry_operation(
                        f"HKLM\\SYSTEM\\CurrentControlSet\\Services\\{key}",
                        modify=False
                    )
                    self._logger.emit_suspicious_behavior("system_info_collection", {
                        "key": key,
                        "value": "synthetic"
                    })

            time.sleep(0.3)

    def _simulate_keyboard_state_monitoring(self) -> None:
        """Simulate keyboard state monitoring behavior."""
        logging.info("Simulating keyboard monitoring...")

        for i in range(15):
            synthetic_keys = ["synthetic_key_stroke_" + str(random.randint(1, 100))]

            if self._logger:
                self._logger.emit_suspicious_behavior("keyboard_monitoring", {
                    "key_count": i + 1,
                    "captured_keys": "synthetic",
                    "purpose": "input_capture_simulation"
                })

            time.sleep(0.2)

    def _simulate_browser_history_enumeration(self) -> None:
        """Simulate browser history enumeration."""
        logging.info("Simulating browser history enumeration...")

        browser_paths = [
            "C:\\Users\\Default\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\History",
            "C:\\Users\\Default\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\History",
        ]

        for path in browser_paths:
            if self._logger:
                self._logger.emit_file_operation("access", path)
                self._logger.emit_suspicious_behavior("browser_history_access", {
                    "browser": "synthetic",
                    "url_count": random.randint(10, 100),
                    "purpose": "history_enumeration_simulation"
                })

            time.sleep(0.3)

    def _simulate_clipboard_monitoring(self) -> None:
        """Simulate clipboard monitoring."""
        logging.info("Simulating clipboard monitoring...")

        for i in range(10):
            synthetic_clipboard = f"clipboard_content_{random.randint(1000, 9999)}"

            if self._logger:
                self._logger.emit_suspicious_behavior("clipboard_monitoring", {
                    "clipboard_data": "synthetic",
                    "monitoring_interval": "500ms",
                    "purpose": "clipboard_access_simulation"
                })

            time.sleep(0.4)

    def _simulate_screen_monitoring(self) -> None:
        """Simulate screen monitoring behavior."""
        logging.info("Simulating screen monitoring...")

        for i in range(8):
            screenshot_id = f"screenshot_{int(time.time())}_{i}"

            if self._logger:
                self._logger.emit_suspicious_behavior("screen_capture", {
                    "screenshot_id": screenshot_id,
                    "resolution": "1920x1080",
                    "purpose": "screen_monitoring_simulation"
                })

            time.sleep(0.5)

    def _simulate_network_exfiltration_simulation(self) -> None:
        """Simulate data exfiltration behavior (localhost only)."""
        logging.info("Simulating data exfiltration...")

        exfil_data_sizes = [1024, 2048, 4096, 8192]

        for size in exfil_data_sizes:
            if self._logger:
                self._logger.emit_network_activity("127.0.0.1", 8443)
                self._logger.emit_suspicious_behavior("data_exfiltration", {
                    "data_size": size,
                    "destination": "127.0.0.1:8443",
                    "protocol": "HTTPS",
                    "purpose": "exfiltration_simulation"
                })

            time.sleep(0.4)

    def _generate_synthetic_system_info(self, key: str) -> str:
        """Generate synthetic system information."""
        return f"SYNTHETIC_{key}_{random.randint(1000, 9999)}"


def main():
    """Entry point for spyware simulator."""
    manifest = SimulatorManifest(
        simulator_id="spyware-simulator",
        display_name="Spyware Simulator",
        version="1.0.0",
        description="Simulates spyware-like behavior for forensic training",
        category=SimulatorCategory.SPYWARE,
        entry_point="spyware_simulator.runtime",
        allowed_directories=["C:/Windows/Temp", "C:/sandbox", "C:/temp"],
        allowed_network_targets=["127.0.0.1"],
        max_runtime_seconds=60,
        behavior_intensity="medium",
        requires_isolation=True,
    )

    runtime = SpywareSimulatorRuntime(manifest)
    sys.exit(runtime.validate_and_run())


if __name__ == "__main__":
    main()