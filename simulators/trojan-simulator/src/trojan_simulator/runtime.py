"""Trojan simulator - SAFE behavioral simulation for forensic observation.

This simulator generates realistic trojan-like behavioral patterns
without executing any harmful payloads or installing real persistence.
"""

from __future__ import annotations

import os
import sys
import time
import random
import logging
import subprocess
from typing import Optional

from forensics_simulator_common.contracts.manifest import SimulatorManifest, SimulatorCategory
from forensics_simulator_common.runtime.base import BaseSimulatorRuntime
from forensics_simulator_common.telemetry.events import SimulatorLogger


class TrojanSimulatorRuntime(BaseSimulatorRuntime):
    """Safe trojan-style behavior simulator for forensic training."""

    DECEPTIVE_NAMES = [
        "svchost.exe",
        "explorer.exe",
        "winlogon.exe",
        "services.exe",
        "lsass.exe",
    ]

    SUSPICIOUS_CHILD_PROCESSES = [
        "cmd.exe",
        "powershell.exe",
        "wscript.exe",
        "cscript.exe",
        "regsvr32.exe",
    ]

    def __init__(self, manifest: SimulatorManifest) -> None:
        super().__init__(manifest)
        self._execution_stages = 5

    def run(self) -> None:
        """Execute trojan-like behavioral simulation."""
        logging.info("Starting trojan simulator - SAFE MODE")

        if self._logger:
            self._logger.emit_execution_stage("initialization")
            self._logger.emit_suspicious_behavior("trojan_simulation_start", {
                "description": "Simulating trojan behavior for forensic training"
            })

        self._simulate_deceptive_initialization()

        self._simulate_dll_hijacking_simulation()

        self._simulate_suspicious_child_process_spawning()

        self._simulate_dll_loading()

        self._simulate_command_and_control_check_in()

        self._simulate_privilege_escalation_attempt()

        if self._logger:
            self._logger.emit_execution_stage("completed")
            self._logger.emit_suspicious_behavior("simulation_complete", {
                "stages_executed": self._execution_stages
            })

        logging.info("Trojan simulator completed")

    def _simulate_deceptive_initialization(self) -> None:
        """Simulate deceptive initialization with misleading process name."""
        logging.info("Simulating deceptive initialization...")

        deceptive_name = random.choice(self.DECEPTIVE_NAMES)

        if self._logger:
            self._logger.emit_process_spawn(deceptive_name)
            self._logger.emit_suspicious_behavior("deceptive_process", {
                "original_name": "trojan_simulator",
                "deceptive_name": deceptive_name,
                "purpose": "process_spoofing_simulation"
            })

        time.sleep(0.5)

    def _simulate_dll_hijacking_simulation(self) -> None:
        """Simulate DLL search order hijacking."""
        logging.info("Simulating DLL hijacking behavior...")

        dll_paths = [
            "C:\\Windows\\System32\\crypt32.dll",
            "C:\\Windows\\System32\\ws2_32.dll",
            "C:\\Windows\\System32\\user32.dll",
        ]

        for dll_path in dll_paths:
            if self._logger:
                self._logger.emit_file_operation("load", dll_path)
                self._logger.emit_suspicious_behavior("dll_hijacking", {
                    "dll_path": dll_path,
                    "purpose": "dll_loading_simulation"
                })

            time.sleep(0.2)

    def _simulate_suspicious_child_process_spawning(self) -> None:
        """Simulate suspicious child process spawning."""
        logging.info("Simulating suspicious child process spawning...")

        for i in range(8):
            child_process = random.choice(self.SUSPICIOUS_CHILD_PROCESSES)

            if self._logger:
                self._logger.emit_process_spawn(child_process)
                self._logger.emit_suspicious_behavior("suspicious_child_process", {
                    "child_process": child_process,
                    "parent": "svchost.exe",
                    "purpose": "process_spawning_simulation"
                })

            time.sleep(0.3)

    def _simulate_dll_loading(self) -> None:
        """Simulate suspicious DLL loading."""
        logging.info("Simulating DLL loading...")

        suspicious_dlls = [
            "advapi32.dll",
            "kernel32.dll",
            "ntdll.dll",
            "user32.dll",
        ]

        for dll in suspicious_dlls:
            if self._logger:
                self._logger.emit_registry_operation(
                    f"HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion\\{dll}",
                    modify=False
                )
                self._logger.emit_suspicious_behavior("dll_loading", {
                    "dll": dll,
                    "purpose": "library_loading_simulation"
                })

            time.sleep(0.2)

    def _simulate_command_and_control_check_in(self) -> None:
        """Simulate C2 check-in behavior (localhost only)."""
        logging.info("Simulating C2 check-in...")

        for i in range(3):
            if self._logger:
                self._logger.emit_network_activity("127.0.0.1", 4444)
                self._logger.emit_suspicious_behavior("c2_checkin", {
                    "beacon_id": f"synthetic_beacon_{i}",
                    "target": "127.0.0.1:4444",
                    "purpose": "command_and_control_simulation"
                })

            time.sleep(0.5)

    def _simulate_privilege_escalation_attempt(self) -> None:
        """Simulate privilege escalation attempt."""
        logging.info("Simulating privilege escalation...")

        registry_paths = [
            "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
            "HKLM\\SYSTEM\\CurrentControlSet\\Services\\WinDefend",
            "HKLM\\SECURITY\\SAM",
        ]

        for path in registry_paths:
            if self._logger:
                self._logger.emit_registry_operation(path, modify=True)
                self._logger.emit_suspicious_behavior("privilege_escalation", {
                    "target": path,
                    "purpose": "escalation_simulation"
                })

            time.sleep(0.2)


def main():
    """Entry point for trojan simulator."""
    manifest = SimulatorManifest(
        simulator_id="trojan-simulator",
        display_name="Trojan Simulator",
        version="1.0.0",
        description="Simulates trojan-like behavior for forensic training",
        category=SimulatorCategory.TROJAN,
        entry_point="trojan_simulator.runtime",
        allowed_directories=["C:/Windows/Temp", "C:/sandbox", "C:/temp", "C:/Windows/System32"],
        allowed_network_targets=["127.0.0.1"],
        max_runtime_seconds=60,
        behavior_intensity="medium",
        requires_isolation=True,
    )

    runtime = TrojanSimulatorRuntime(manifest)
    sys.exit(runtime.validate_and_run())


if __name__ == "__main__":
    main()