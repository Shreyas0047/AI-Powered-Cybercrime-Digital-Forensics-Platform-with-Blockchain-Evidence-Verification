"""Ransomware simulator - SAFE behavioral simulation for forensic observation.

This simulator generates realistic ransomware-like behavioral patterns
without performing any actual encryption or file destruction.
"""

from __future__ import annotations

import os
import sys
import time
import random
import string
import logging
from pathlib import Path
from typing import Optional

from forensics_simulator_common.contracts.manifest import SimulatorManifest, SimulatorCategory
from forensics_simulator_common.runtime.base import BaseSimulatorRuntime
from forensics_simulator_common.telemetry.events import SimulatorLogger


class RansomwareSimulatorRuntime(BaseSimulatorRuntime):
    """Safe ransomware-style behavior simulator for forensic training."""

    SUSPICIOUS_EXTENSIONS = [".txt", ".doc", ".docx", ".jpg", ".png", ".pdf", ".xls", ".xlsx"]
    ENCRYPTED_LOOKALike_EXTENSIONS = [".encrypted", ".locked", ".ransom", ".crypto"]

    def __init__(self, manifest: SimulatorManifest) -> None:
        super().__init__(manifest)
        self._files_processed = 0
        self._max_files = 100
        self._simulation_duration = 30

    def run(self) -> None:
        """Execute ransomware-like behavioral simulation."""
        logging.info("Starting ransomware simulator - SAFE MODE")

        if self._logger:
            self._logger.emit_execution_stage("initialization")
            self._logger.emit_execution_stage("scanning_files")
            self._logger.emit_suspicious_behavior("ransomware_simulation_start", {
                "description": "Simulating ransomware behavior for forensic training"
            })

        safe_dir = self.get_safe_directory()
        test_files_dir = os.path.join(safe_dir, "test_documents")
        os.makedirs(test_files_dir, exist_ok=True)

        self._simulate_file_scanning(test_files_dir)

        self._simulate_mass_file_operations(test_files_dir)

        self._simulate_extension_modification(test_files_dir)

        self._simulate_suspicious_registry_activity()

        self._simulate_network_beacon()

        if self._logger:
            self._logger.emit_execution_stage("completed")
            self._logger.emit_suspicious_behavior("simulation_complete", {
                "files_processed": self._files_processed
            })

        logging.info(f"Ransomware simulator completed - processed {self._files_processed} files")

    def _simulate_file_scanning(self, directory: str) -> None:
        """Simulate suspicious file scanning behavior."""
        logging.info("Simulating file scanning...")

        for i in range(20):
            fake_path = os.path.join(directory, f"document_{i:03d}.txt")
            self.emit_file_operation("scan", fake_path)
            time.sleep(0.05)

    def _simulate_mass_file_operations(self, directory: str) -> None:
        """Simulate mass file modification behavior."""
        logging.info("Simulating mass file operations...")

        for i in range(min(self._max_files, 50)):
            filename = f"file_{random.randint(1000, 9999)}"
            ext = random.choice(self.SUSPICIOUS_EXTENSIONS)
            fake_path = os.path.join(directory, f"{filename}{ext}")

            synthetic_content = self._generate_synthetic_content()

            try:
                with open(fake_path, "w") as f:
                    f.write(synthetic_content)

                self.emit_file_operation("create", fake_path)
                self._files_processed += 1

            except Exception:
                pass

            if i % 10 == 0:
                self.emit_suspicious_activity("mass_file_activity", {
                    "count": i,
                    "pattern": "high_volume_file_operations"
                })

            time.sleep(0.02)

    def _simulate_extension_modification(self, directory: str) -> None:
        """Simulate suspicious file extension changes."""
        logging.info("Simulating extension modification...")

        files = list(Path(directory).glob("*"))
        sample_size = min(10, len(files))

        for i, file_path in enumerate(files[:sample_size]):
            original_ext = file_path.suffix
            new_ext = random.choice(self.ENCRYPTED_LOOKALike_EXTENSIONS)

            new_name = f"{file_path.stem}{new_ext}"
            new_path = file_path.parent / new_name

            try:
                os.rename(str(file_path), str(new_path))
                self.emit_file_operation("modify", str(new_path))
                self.emit_suspicious_activity("file_extension_modified", {
                    "original": str(file_path),
                    "modified": str(new_path),
                    "extension_change": f"{original_ext} -> {new_ext}"
                })

            except Exception:
                pass

            time.sleep(0.1)

    def _simulate_suspicious_registry_activity(self) -> None:
        """Simulate suspicious registry modifications."""
        logging.info("Simulating registry activity...")

        registry_paths = [
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce",
            "HKCU\\Software\\Classes\\*\\shell\\open\\command",
        ]

        for path in registry_paths:
            self.emit_registry_operation(path, modify=True)
            self.emit_suspicious_activity("registry_modification", {
                "key": path,
                "purpose": "persistence_simulation"
            })

            time.sleep(0.2)

    def _simulate_network_beacon(self) -> None:
        """Simulate network beaconing behavior (localhost only)."""
        logging.info("Simulating network beaconing...")

        for i in range(5):
            self.emit_network_activity("127.0.0.1", 8080)
            self.emit_suspicious_activity("network_beacon", {
                "target": "127.0.0.1",
                "port": 8080,
                "purpose": "c2_simulation"
            })

            time.sleep(0.5)

    def _generate_synthetic_content(self) -> str:
        """Generate synthetic file content (not real data)."""
        lines = [
            "SYNTHETIC TEST DATA - FORENSIC SIMULATION",
            "This file contains placeholder content for educational purposes.",
            f"Timestamp: {time.time()}",
            f"Session: {random.randint(1000, 9999)}",
            "",
            "".join(random.choices(string.ascii_letters + string.digits, k=100)),
        ]
        return "\n".join(lines)


def main():
    """Entry point for ransomware simulator."""
    manifest = SimulatorManifest(
        simulator_id="ransomware-simulator",
        display_name="Ransomware Simulator",
        version="1.0.0",
        description="Simulates ransomware-like behavior for forensic training",
        category=SimulatorCategory.RANSOMWARE,
        entry_point="ransomware_simulator.runtime",
        allowed_directories=["C:/Windows/Temp", "C:/sandbox", "C:/temp"],
        allowed_network_targets=["127.0.0.1"],
        max_runtime_seconds=60,
        behavior_intensity="medium",
        requires_isolation=True,
    )

    runtime = RansomwareSimulatorRuntime(manifest)
    sys.exit(runtime.validate_and_run())


if __name__ == "__main__":
    main()