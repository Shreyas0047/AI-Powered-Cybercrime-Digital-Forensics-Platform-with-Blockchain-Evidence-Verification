"""Botnet simulator - SAFE behavioral simulation for forensic observation.

This simulator generates realistic botnet-like behavioral patterns
without creating any actual botnet or performing distributed attacks.
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


class BotnetSimulatorRuntime(BaseSimulatorRuntime):
    """Safe botnet-style behavior simulator for forensic training."""

    BEACON_INTERVALS = [30, 60, 120, 180]

    def __init__(self, manifest: SimulatorManifest) -> None:
        super().__init__(manifest)
        self._beacon_count = 10
        self._bot_id = f"bot_{random.randint(100000, 999999)}"

    def run(self) -> None:
        """Execute botnet-like behavioral simulation."""
        logging.info("Starting botnet simulator - SAFE MODE")

        if self._logger:
            self._logger.emit_execution_stage("initialization")
            self._logger.emit_suspicious_behavior("botnet_simulation_start", {
                "description": "Simulating botnet behavior for forensic training",
                "bot_id": self._bot_id
            })

        self._simulate_initial_check_in()

        self._simulate_periodic_beaconing()

        self._simulate_command_polling()

        self._simulate_ddos_capability_demonstration()

        self._simulate_lateral_movement_simulation()

        self._simulate_brute_force_simulation()

        if self._logger:
            self._logger.emit_execution_stage("completed")
            self._logger.emit_suspicious_behavior("simulation_complete", {
                "total_beacons": self._beacon_count,
                "bot_id": self._bot_id
            })

        logging.info(f"Botnet simulator completed - sent {self._beacon_count} beacons")

    def _simulate_initial_check_in(self) -> None:
        """Simulate initial check-in to C2 server."""
        logging.info("Simulating initial C2 check-in...")

        if self._logger:
            self._logger.emit_network_activity("127.0.0.1", 8080)
            self._logger.emit_suspicious_behavior("c2_checkin", {
                "bot_id": self._bot_id,
                "target": "127.0.0.1:8080",
                "purpose": "initial_registration_simulation"
            })

        time.sleep(0.5)

    def _simulate_periodic_beaconing(self) -> None:
        """Simulate periodic beaconing behavior."""
        logging.info("Simulating periodic beaconing...")

        for i in range(self._beacon_count):
            if self._logger:
                self._logger.emit_network_activity("127.0.0.1", 8080)
                self._logger.emit_suspicious_behavior("periodic_beacon", {
                    "beacon_number": i + 1,
                    "bot_id": self._bot_id,
                    "target": "127.0.0.1:8080",
                    "interval": f"{random.choice(self.BEACON_INTERVALS)}s",
                    "purpose": "beaconing_simulation"
                })

            time.sleep(1)

    def _simulate_command_polling(self) -> None:
        """Simulate command polling from C2."""
        logging.info("Simulating command polling...")

        commands = [
            "STATUS_CHECK",
            "SYSTEM_INFO",
            "SCAN_NETWORK",
            "DOWNLOAD_PAYLOAD",
            "EXECUTE_COMMAND",
        ]

        for command in commands:
            if self._logger:
                self._logger.emit_network_activity("127.0.0.1", 8080)
                self._logger.emit_suspicious_behavior("command_poll", {
                    "command": command,
                    "bot_id": self._bot_id,
                    "purpose": "command_polling_simulation"
                })

            time.sleep(0.4)

    def _simulate_ddos_capability_demonstration(self) -> None:
        """Simulate DDoS capability demonstration."""
        logging.info("Simulating DDoS capability...")

        target_ips = ["127.0.0.1"]

        for ip in target_ips:
            for i in range(5):
                if self._logger:
                    self._logger.emit_network_activity(ip, 80)
                    self._logger.emit_suspicious_behavior("ddos_simulation", {
                        "target": ip,
                        "packet_size": "synthetic",
                        "purpose": "ddos_capability_simulation"
                    })

                time.sleep(0.2)

    def _simulate_lateral_movement_simulation(self) -> None:
        """Simulate lateral movement attempts."""
        logging.info("Simulating lateral movement...")

        network_ranges = [
            "192.168.1.0/24",
            "10.0.0.0/24",
        ]

        for network in network_ranges:
            for i in range(5):
                if self._logger:
                    self._logger.emit_network_activity("127.0.0.1", 445)
                    self._logger.emit_suspicious_behavior("lateral_movement", {
                        "target_network": network,
                        "target_ip": "127.0.0.1",
                        "purpose": "network_discovery_simulation"
                    })

                time.sleep(0.3)

    def _simulate_brute_force_simulation(self) -> None:
        """Simulate brute force attempts."""
        logging.info("Simulating brute force...")

        for i in range(10):
            if self._logger:
                self._logger.emit_network_activity("127.0.0.1", 22)
                self._logger.emit_suspicious_behavior("brute_force", {
                    "target_port": 22,
                    "attempt_number": i + 1,
                    "purpose": "credential_guessing_simulation"
                })

            time.sleep(0.2)


def main():
    """Entry point for botnet simulator."""
    manifest = SimulatorManifest(
        simulator_id="botnet-simulator",
        display_name="Botnet Simulator",
        version="1.0.0",
        description="Simulates botnet-like behavior for forensic training",
        category=SimulatorCategory.BOTNET,
        entry_point="botnet_simulator.runtime",
        allowed_directories=["C:/Windows/Temp", "C:/sandbox", "C:/temp"],
        allowed_network_targets=["127.0.0.1"],
        max_runtime_seconds=60,
        behavior_intensity="medium",
        requires_isolation=True,
    )

    runtime = BotnetSimulatorRuntime(manifest)
    sys.exit(runtime.validate_and_run())


if __name__ == "__main__":
    main()