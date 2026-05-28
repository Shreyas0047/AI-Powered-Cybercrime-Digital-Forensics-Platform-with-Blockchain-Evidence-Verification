"""Botnet/Worm simulator - SAFE multi-stage adversarial simulation.

This simulator generates realistic botnet/worm-like behavioral patterns
with full multi-stage execution chain and telemetry enrichment.
"""

from __future__ import annotations

import os
import sys
import shutil
import time
import random
import logging
import uuid
from pathlib import Path

from forensics_simulator_common.contracts.manifest import SimulatorManifest, SimulatorCategory
from forensics_simulator_common.runtime.base import BaseSimulatorRuntime
from forensics_simulator_common.telemetry.events import (
    SimulatorLogger,
    EXECUTION_STAGES,
    TelemetryEventType
)


class BotnetSimulatorRuntime(BaseSimulatorRuntime):
    """Multi-stage botnet/worm behavior simulator with full telemetry."""

    BEACON_INTERVALS = [30, 60, 120, 180]

    def __init__(self, manifest: SimulatorManifest) -> None:
        super().__init__(manifest)
        self._beacon_count = 12
        self._bot_id = f"bot_{random.randint(100000, 999999)}"
        self._staging_dir = ""
        self._random_delays = [0.1, 0.2, 0.3, 0.15, 0.25]
        self._infected_hosts = 0
        self._campaign_id = f"worm_{int(time.time())}"

    def run(self) -> None:
        """Execute botnet/worm-like behavioral simulation with 7 stages."""
        logging.info("Starting botnet/worm simulator - MULTI-STAGE ADVANCED MODE")
        
        self._setup_staging()
        
        for stage_idx, stage in enumerate(EXECUTION_STAGES):
            if self._logger:
                self._logger.set_stage(stage)
                self._logger.emit_execution_stage(stage)
            self._execute_stage(stage)
            self._evasion_delay()
        
        self._finalize()
        
        logging.info(f"Botnet/Worm simulator completed - {self._beacon_count} beacons, {self._infected_hosts} simulated infections")

    def _setup_staging(self) -> None:
        """Setup staging directory."""
        safe_dir = self.get_safe_directory()
        staging = os.path.join(safe_dir, "worm_staging")
        os.makedirs(staging, exist_ok=True)
        self._staging_dir = staging
        
        if self._logger:
            self._logger.emit_file_create(staging)
            self._logger.emit_suspicious_behavior(
                "staging_created",
                {"path": staging},
                technique="T1105",
                tactic="Persistence"
            )

    def _execute_stage(self, stage: str) -> None:
        """Execute a specific stage."""
        stage_methods = {
            "initialization": self._stage_initialization,
            "environment_check": self._stage_environment_check,
            "persistence_attempt": self._stage_persistence_attempt,
            "reconnaissance": self._stage_reconnaissance,
            "payload_execution": self._stage_payload_execution,
            "lateral_activity": self._stage_lateral_activity,
            "cleanup_or_exit": self._stage_cleanup_or_exit,
        }
        
        if stage in stage_methods:
            stage_methods[stage]()

    def _evasion_delay(self) -> None:
        """Add randomized delay."""
        time.sleep(random.choice(self._random_delays))

    def _stage_initialization(self) -> None:
        """Stage 1: Initialize with botnet configuration."""
        self._perform_anti_vm_checks()
        self._generate_worm_config()
        self._generate_replication_payload()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "botnet_initialized",
                {"bot_id": self._bot_id, "campaign_id": self._campaign_id},
                technique="T1059",
                tactic="Execution",
                risk_score=40
            )

    def _stage_environment_check(self) -> None:
        """Stage 2: Check environment."""
        self._simulate_network_discovery()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "environment_check_complete",
                {"checks_performed": 4},
                technique="T1018",
                tactic="Discovery",
                risk_score=30
            )

    def _stage_persistence_attempt(self) -> None:
        """Stage 3: Establish persistence."""
        self._registry_persistence()
        
        if self._logger:
            self._logger.emit_persistence_attempt(
                "registry_persistence",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                technique="T1547.001",
                tactic="Persistence"
            )

    def _stage_reconnaissance(self) -> None:
        """Stage 4: Network reconnaissance."""
        self._simulate_network_scanning()
        self._simulate_subnet_discovery()
        self._identify_vulnerable_targets()

    def _stage_payload_execution(self) -> None:
        """Stage 5: Propagation simulation."""
        self._simulate_smb_propagation()
        self._simulate_removable_media_propagation()
        self._simulate_network_sharing_propagation()
        self._self_replication()

    def _stage_lateral_activity(self) -> None:
        """Stage 6: Lateral movement and command control."""
        self._simulate_psexec_style_movement()
        self._simulate_wmi_movement()
        self._simulate_smb_enum()
        self._credential_gathering()
        self._periodic_beaconing()
        self._command_polling()
        self._ddos_capability()

    def _stage_cleanup_or_exit(self) -> None:
        """Stage 7: Cleanup."""
        self._remove_propagation_artifacts()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "execution_complete",
                {"total_beacons": self._beacon_count, "simulated_infections": self._infected_hosts},
                technique="T1070",
                tactic="DefenseEvasion",
                risk_score=20
            )

    def _perform_anti_vm_checks(self) -> None:
        """Simulate anti-VM checks."""
        vm_checks = [("hypervisor_detection", "not_detected"), ("vm_detection", "not_detected")]
        for check_type, result in vm_checks:
            if self._logger:
                self._logger.emit_anti_vm_check(check_type, result)

    def _generate_worm_config(self) -> None:
        """Generate worm configuration."""
        config_data = f"bot_id={self._bot_id}\npropagation=true\npersistence=true\ncampaign={self._campaign_id}\n"
        config_path = os.path.join(self._staging_dir, "worm.cfg")
        try:
            with open(config_path, "w") as f:
                f.write(config_data)
            self.emit_file_operation("create", config_path, technique="T1105")
        except Exception as e:
            logging.error(f"Failed to create worm config: {e}")

    def _generate_replication_payload(self) -> None:
        """Generate replication payload."""
        payload_data = f"SYNTHETIC_WORM_PAYLOAD_{random.randint(1000,9999)}"
        
        for i in range(3):
            payload_path = os.path.join(self._staging_dir, f"replicate_{i}.exe")
            try:
                with open(payload_path, "w") as f:
                    f.write(payload_data)
                self.emit_file_operation("create", payload_path, technique="T1105")
            except Exception as e:
                logging.error(f"Failed to create replication payload: {e}")

    def _simulate_network_discovery(self) -> None:
        """Simulate network discovery."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "network_discovery",
                {"network_interfaces": 2},
                technique="T1018",
                tactic="Discovery"
            )

    def _simulate_network_scanning(self) -> None:
        """Simulate network scanning."""
        scan_ports = [445, 3389, 22, 23, 135, 139, 80, 443]
        
        for port in scan_ports:
            self.emit_network_activity("127.0.0.1", port, technique="T1046")
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "network_scan",
                    {"target": "127.0.0.1", "port": port},
                    technique="T1046",
                    tactic="Discovery",
                    risk_score=45
                )
            time.sleep(0.1)

    def _simulate_subnet_discovery(self) -> None:
        """Simulate subnet discovery."""
        subnets = ["192.168.1.0/24", "10.0.0.0/24"]
        
        for subnet in subnets:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "subnet_discovery",
                    {"subnet": subnet},
                    technique="T1018",
                    tactic="Discovery"
                )
            
            for i in range(4):
                self.emit_network_activity("127.0.0.1", random.choice([445, 3389, 22]), technique="T1018")
                time.sleep(0.05)

    def _identify_vulnerable_targets(self) -> None:
        """Identify vulnerable targets."""
        target_services = ["SMB", "RDP", "SSH", "Telnet", "WMI"]
        
        for service in target_services:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "vulnerability_identify",
                    {"service": service, "status": "simulated"},
                    technique="T1190",
                    tactic="InitialAccess"
                )
            time.sleep(0.1)

    def _registry_persistence(self) -> None:
        """Simulate registry persistence."""
        registry_routes = [
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
        ]
        
        for path in registry_routes:
            self.emit_registry_operation(path, modify=True, technique="T1547.001")
            time.sleep(0.1)

    def _simulate_smb_propagation(self) -> None:
        """Simulate SMB propagation."""
        share_paths = ["\\\\127.0.0.1\\C$", "\\\\127.0.0.1\\ADMIN$", "\\\\127.0.0.1\\IPC$"]
        
        for share in share_paths:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "smb_share_access",
                    {"share": share},
                    technique="T1021",
                    tactic="LateralMovement",
                    risk_score=65
                )
            time.sleep(0.15)

    def _simulate_removable_media_propagation(self) -> None:
        """Simulate removable media propagation."""
        drive_letters = ["D:", "E:", "F:"]
        
        for drive in drive_letters:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "removable_media_propagation",
                    {"drive": drive},
                    technique="T1091",
                    tactic="InitialAccess",
                    risk_score=60
                )
            
            autorun_path = f"{drive}\\autorun.inf"
            try:
                with open(autorun_path, "w") as f:
                    f.write("[autorun]\nopen=setup.exe")
                self.emit_file_operation("create", autorun_path, technique="T1091")
            except Exception as e:
                logging.error(f"Failed to create autorun: {e}")
            
            time.sleep(0.2)

    def _simulate_network_sharing_propagation(self) -> None:
        """Simulate network sharing propagation."""
        share_names = ["Public", "Shared", "Documents", "Software"]
        
        for share in share_names:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "network_share_propagation",
                    {"share": share},
                    technique="T1021",
                    tactic="LateralMovement"
                )
            time.sleep(0.1)

    def _self_replication(self) -> None:
        """Simulate self-replication."""
        for i in range(6):
            replica_path = os.path.join(self._staging_dir, f"replica_{i}.exe")
            try:
                with open(replica_path, "w") as f:
                    f.write(f"SYNTHETIC_WORM_REPLICA_{i}")
                self.emit_file_operation("create", replica_path, technique="T1200")
                self._infected_hosts += 1
                
                if self._logger:
                    self._logger.emit_suspicious_behavior(
                        "self_replication",
                        {"replica_id": i},
                        technique="T1200",
                        tactic="LateralMovement",
                        risk_score=70
                    )
            except Exception as e:
                logging.error(f"Failed to self-replicate: {e}")
            time.sleep(0.1)

    def _simulate_psexec_style_movement(self) -> None:
        """Simulate PsExec-style movement."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "psexec_movement",
                {"target": "127.0.0.1", "method": "service_installation"},
                technique="T1021",
                tactic="LateralMovement",
                risk_score=75
            )
        
        for i in range(3):
            if self._logger:
                self._logger.emit_process_start(
                    pid=5000 + i,
                    path="C:\\Windows\\System32\\psexec.exe",
                    parent_pid=os.getpid(),
                    technique="T1021"
                )
            time.sleep(0.15)

    def _simulate_wmi_movement(self) -> None:
        """Simulate WMI movement."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "wmi_movement",
                {"method": "Win32_Process"},
                technique="T1021",
                tactic="LateralMovement",
                risk_score=70
            )
        
        for i in range(3):
            self.emit_network_activity("127.0.0.1", 135, technique="T1021")
            time.sleep(0.1)

    def _simulate_smb_enum(self) -> None:
        """Simulate SMB enumeration."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "smb_enumeration",
                {"targets": 4},
                technique="T1021",
                tactic="Discovery"
            )
        
        for i in range(4):
            self.emit_network_activity("127.0.0.1", 445, technique="T1021")
            time.sleep(0.08)

    def _credential_gathering(self) -> None:
        """Gather credentials."""
        cred_locations = [
            "HKLM\\SYSTEM\\CurrentControlSet\\Services\\LanmanServer\\Shares",
            "HKLM\\SECURITY\\SAM",
        ]
        
        for loc in cred_locations:
            self.emit_registry_operation(loc, modify=False, technique="T1003")
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "credential_gathering",
                    {"location": loc},
                    technique="T1003",
                    tactic="CredentialAccess",
                    risk_score=65
                )
            time.sleep(0.1)

    def _periodic_beaconing(self) -> None:
        """Simulate periodic beaconing."""
        for i in range(self._beacon_count):
            beacon_interval = random.choice(self.BEACON_INTERVALS)
            
            if self._logger:
                self._logger.emit_beacon(
                    "127.0.0.1", 8080, i + 1,
                    interval_seconds=beacon_interval,
                    technique="T1071"
                )
            time.sleep(0.3)

    def _command_polling(self) -> None:
        """Simulate command polling."""
        commands = ["STATUS_CHECK", "SYSTEM_INFO", "SCAN_NETWORK", "DOWNLOAD_PAYLOAD", "EXECUTE_COMMAND", "SPREAD"]
        
        for command in commands:
            self.emit_network_activity("127.0.0.1", 8080, technique="T1071")
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "command_poll",
                    {"command": command},
                    technique="T1071",
                    tactic="CommandAndControl"
                )
            time.sleep(0.2)

    def _ddos_capability(self) -> None:
        """Simulate DDoS capability."""
        target_ips = ["127.0.0.1"]
        
        for ip in target_ips:
            for i in range(6):
                if self._logger:
                    self._logger.emit_suspicious_behavior(
                        "ddos_capability",
                        {"target": ip, "packet_size": "synthetic"},
                        technique="T1498",
                        tactic="Impact",
                        risk_score=60
                    )
                self.emit_network_activity(ip, 80, technique="T1498")
                time.sleep(0.15)

    def _remove_propagation_artifacts(self) -> None:
        """Remove propagation artifacts."""
        removed_count = 0
        if os.path.isdir(self._staging_dir):
            try:
                for file in os.listdir(self._staging_dir):
                    file_path = os.path.join(self._staging_dir, file)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                    self.emit_file_operation("delete", file_path, technique="T1070")
                    removed_count += 1
            except Exception as e:
                logging.error(f"Propagation artifact removal error: {e}")
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "propagation_cleanup",
                {"files_removed": removed_count},
                technique="T1070",
                tactic="DefenseEvasion",
                risk_score=30
            )

    def _finalize(self) -> None:
        """Finalize."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "simulation_complete",
                {"total_beacons": self._beacon_count, "bot_id": self._bot_id, "simulated_infections": self._infected_hosts},
                technique="T1071",
                tactic="CommandAndControl",
                risk_score=55
            )


def main():
    """Entry point for botnet simulator."""
    manifest = SimulatorManifest(
        simulator_id="botnet-simulator",
        display_name="Sample Delta",
        version="1.0.0",
        description="Unknown threat sample - awaiting behavioral analysis",
        category=SimulatorCategory.BOTNET,
        entry_point="botnet_simulator.runtime",
        allowed_directories=["C:/Windows/Temp", "C:/sandbox", "C:/temp"],
        allowed_network_targets=["127.0.0.1"],
        max_runtime_seconds=120,
        behavior_intensity="high",
        requires_isolation=True,
    )

    runtime = BotnetSimulatorRuntime(manifest)
    sys.exit(runtime.validate_and_run())


if __name__ == "__main__":
    main()