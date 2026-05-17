"""Credential stealer simulator - SAFE behavioral simulation for forensic observation.

This simulator generates realistic credential-access behavioral patterns
without accessing or exfiltrating any real credentials.
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


class CredentialStealerSimulatorRuntime(BaseSimulatorRuntime):
    """Safe credential-access behavior simulator for forensic training."""

    CREDENTIAL_LOCATIONS = [
        "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer",
        "HKCU\\Software\\Google\\Chrome\\ Preferences",
        "HKCU\\Software\\Microsoft\\Edge\\Browser",
    ]

    BROWSER_PATHS = [
        "C:\\Users\\Default\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Login Data",
        "C:\\Users\\Default\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Login Data",
    ]

    def __init__(self, manifest: SimulatorManifest) -> None:
        super().__init__(manifest)
        self._enumeration_count = 15

    def run(self) -> None:
        """Execute credential-access-like behavioral simulation."""
        logging.info("Starting credential stealer simulator - SAFE MODE")

        if self._logger:
            self._logger.emit_execution_stage("initialization")
            self._logger.emit_suspicious_behavior("credential_simulation_start", {
                "description": "Simulating credential access behavior for forensic training"
            })

        self._simulate_credential_enumeration()

        self._simulate_browser_credential_access()

        self._simulate_windows_credential_access()

        self._simulate_memory_credential_access()

        self._simulate_network_credential_interception()

        self._simulate_credential_exfiltration()

        if self._logger:
            self._logger.emit_execution_stage("completed")
            self._logger.emit_suspicious_behavior("simulation_complete", {
                "enumeration_count": self._enumeration_count
            })

        logging.info("Credential stealer simulator completed")

    def _simulate_credential_enumeration(self) -> None:
        """Simulate credential location enumeration."""
        logging.info("Simulating credential enumeration...")

        for i in range(self._enumeration_count):
            location = random.choice(self.CREDENTIAL_LOCATIONS)

            if self._logger:
                self._logger.emit_registry_operation(location, modify=False)
                self._logger.emit_suspicious_behavior("credential_enumeration", {
                    "location": location,
                    "purpose": "credential_location_discovery"
                })

            time.sleep(0.3)

    def _simulate_browser_credential_access(self) -> None:
        """Simulate browser credential access."""
        logging.info("Simulating browser credential access...")

        for path in self.BROWSER_PATHS:
            if self._logger:
                self._logger.emit_file_operation("access", path)
                self._logger.emit_suspicious_behavior("browser_credential_access", {
                    "browser_path": path,
                    "credential_count": random.randint(5, 20),
                    "purpose": "browser_credential_theft_simulation"
                })

            time.sleep(0.4)

    def _simulate_windows_credential_access(self) -> None:
        """Simulate Windows credential access patterns."""
        logging.info("Simulating Windows credential access...")

        windows_credential_paths = [
            "C:\\Windows\\System32\\config\\SAM",
            "C:\\Windows\\System32\\config\\SYSTEM",
            "C:\\Windows\\System32\\config\\SECURITY",
        ]

        for path in windows_credential_paths:
            if self._logger:
                self._logger.emit_file_operation("access", path)
                self._logger.emit_suspicious_behavior("windows_credential_access", {
                    "credential_store": path,
                    "purpose": "sam_database_access_simulation"
                })

            time.sleep(0.3)

    def _simulate_memory_credential_access(self) -> None:
        """Simulate memory credential harvesting."""
        logging.info("Simulating memory credential access...")

        memory_regions = [
            "LSASS Process Memory",
            "Credential Manager",
            "SSPI Credentials",
        ]

        for region in memory_regions:
            if self._logger:
                self._logger.emit_suspicious_behavior("memory_credential_harvest", {
                    "memory_region": region,
                    "purpose": "memory_credential_dumping_simulation"
                })

            time.sleep(0.4)

    def _simulate_network_credential_interception(self) -> None:
        """Simulate network credential interception."""
        logging.info("Simulating network credential interception...")

        protocols = ["HTTP", "FTP", "SMTP", "POP3"]

        for protocol in protocols:
            if self._logger:
                self._logger.emit_network_activity("127.0.0.1", random.choice([80, 21, 25, 110]))
                self._logger.emit_suspicious_behavior("network_credential_intercept", {
                    "protocol": protocol,
                    "purpose": "network_sniffing_simulation"
                })

            time.sleep(0.3)

    def _simulate_credential_exfiltration(self) -> None:
        """Simulate credential exfiltration (localhost only)."""
        logging.info("Simulating credential exfiltration...")

        exfil_targets = [
            ("127.0.0.1", 9001),
            ("127.0.0.1", 9002),
        ]

        for target in exfil_targets:
            if self._logger:
                self._logger.emit_network_activity(target[0], target[1])
                self._logger.emit_suspicious_behavior("credential_exfiltration", {
                    "target": f"{target[0]}:{target[1]}",
                    "credential_count": random.randint(10, 50),
                    "purpose": "credential_exfil_simulation"
                })

            time.sleep(0.5)


def main():
    """Entry point for credential stealer simulator."""
    manifest = SimulatorManifest(
        simulator_id="credential-stealer-simulator",
        display_name="Credential Stealer Simulator",
        version="1.0.0",
        description="Simulates credential access behavior for forensic training",
        category=SimulatorCategory.CREDENTIAL_STEALER,
        entry_point="credential_stealer_simulator.runtime",
        allowed_directories=["C:/Windows/Temp", "C:/sandbox", "C:/temp"],
        allowed_network_targets=["127.0.0.1"],
        max_runtime_seconds=60,
        behavior_intensity="medium",
        requires_isolation=True,
    )

    runtime = CredentialStealerSimulatorRuntime(manifest)
    sys.exit(runtime.validate_and_run())


if __name__ == "__main__":
    main()