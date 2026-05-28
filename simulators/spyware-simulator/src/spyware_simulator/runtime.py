"""Spyware simulator - SAFE multi-stage adversarial simulation.

This simulator generates realistic spyware-like behavioral patterns
with full multi-stage execution chain and telemetry enrichment.
"""

from __future__ import annotations

import os
import sys
import shutil
import time
import random
import logging
import hashlib
import uuid
from pathlib import Path
from typing import Optional

from forensics_simulator_common.contracts.manifest import SimulatorManifest, SimulatorCategory
from forensics_simulator_common.runtime.base import BaseSimulatorRuntime
from forensics_simulator_common.telemetry.events import (
    SimulatorLogger,
    EXECUTION_STAGES,
    TelemetryEventType
)


class SpywareSimulatorRuntime(BaseSimulatorRuntime):
    """Multi-stage spyware behavior simulator with full telemetry."""

    SYSTEM_INFO_KEYS = ["ComputerName", "UserName", "OSVersion", "Architecture", "ProcessorCount"]
    TARGET_PROCESSES = ["explorer.exe", "chrome.exe", "firefox.exe", "msedge.exe", "outlook.exe"]
    BROWSER_PATHS = ["Chrome", "Edge", "Firefox", "Opera", "Brave"]

    def __init__(self, manifest: SimulatorManifest) -> None:
        super().__init__(manifest)
        self._collection_cycles = 8
        self._staging_dir = ""
        self._random_delays = [0.05, 0.1, 0.15, 0.2, 0.08]
        self._collected_data_size = 0
        self._campaign_id = f"spyware_{int(time.time())}"

    def run(self) -> None:
        """Execute spyware-like behavioral simulation with 7 stages."""
        logging.info("Starting spyware simulator - MULTI-STAGE ADVANCED MODE")
        
        self._setup_staging()
        
        for stage_idx, stage in enumerate(EXECUTION_STAGES):
            if self._logger:
                self._logger.set_stage(stage)
                self._logger.emit_execution_stage(stage)
            self._execute_stage(stage)
            self._evasion_delay()
        
        self._finalize()
        
        logging.info(f"Spyware simulator completed - collected {self._collected_data_size} bytes")

    def _setup_staging(self) -> None:
        """Setup staging directory."""
        safe_dir = self.get_safe_directory()
        staging = os.path.join(safe_dir, "spyware_staging")
        os.makedirs(staging, exist_ok=True)
        self._staging_dir = staging
        
        if self._logger:
            self._logger.emit_file_create(staging)
            self._logger.emit_suspicious_behavior(
                "staging_created",
                {"path": staging},
                technique="T1074",
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
        """Stage 1: Initialize with stealth measures."""
        self._perform_anti_vm_checks()
        self._simulate_stealth_init()
        self._generate_config_artifact()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "spyware_initialized",
                {"campaign_id": self._campaign_id},
                technique="T1564",
                tactic="DefenseEvasion",
                risk_score=40
            )

    def _stage_environment_check(self) -> None:
        """Stage 2: Check environment."""
        self._simulate_system_discovery()
        self._detect_security_tools()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "environment_check_complete",
                {"checks_performed": 5},
                technique="T1082",
                tactic="Discovery",
                risk_score=30
            )

    def _stage_persistence_attempt(self) -> None:
        """Stage 3: Establish persistence."""
        self._registry_persistence()
        self._service_persistence()
        
        if self._logger:
            self._logger.emit_persistence_attempt(
                "registry_and_service",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                technique="T1547.001",
                tactic="Persistence"
            )

    def _stage_reconnaissance(self) -> None:
        """Stage 4: Reconnaissance and discovery."""
        self._simulate_process_enumeration()
        self._simulate_network_discovery()
        self._collect_system_info()

    def _stage_payload_execution(self) -> None:
        """Stage 5: Data collection."""
        self._collect_browser_data()
        self._collect_clipboard_data()
        self._collect_screen_captures()
        self._collect_keyboard_state()
        self._collect_application_data()

    def _stage_lateral_activity(self) -> None:
        """Stage 6: Exfiltration."""
        self._create_data_archives()
        self._encrypt_staged_data()
        self._beaconing_pattern()
        self._simulate_data_transfer()

    def _stage_cleanup_or_exit(self) -> None:
        """Stage 7: Cleanup."""
        self._remove_evidence()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "execution_complete",
                {"data_collected": self._collected_data_size},
                technique="T1070",
                tactic="DefenseEvasion",
                risk_score=20
            )

    def _perform_anti_vm_checks(self) -> None:
        """Simulate anti-VM checks."""
        vm_checks = [("hypervisor_detection", "not_detected"), ("sandbox_timeout", "not_detected")]
        for check_type, result in vm_checks:
            if self._logger:
                self._logger.emit_anti_vm_check(check_type, result)

    def _simulate_stealth_init(self) -> None:
        """Simulate stealth initialization."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "stealth_initialization",
                {"actions": ["process_hide", "service_hide"]},
                technique="T1564",
                tactic="DefenseEvasion",
                risk_score=50
            )

    def _generate_config_artifact(self) -> None:
        """Generate configuration artifact."""
        config_data = f"collector_id={random.randint(100000,999999)}\ninterval=30\nmode=passive\ncampaign={self._campaign_id}\n"
        config_path = os.path.join(self._staging_dir, "config.dat")
        try:
            with open(config_path, "w") as f:
                f.write(config_data)
            self.emit_file_operation("create", config_path, technique="T1105")
        except Exception as e:
            logging.error(f"Failed to write config: {e}")

    def _simulate_system_discovery(self) -> None:
        """Simulate system discovery."""
        system_keys = [
            "HKLM\\SYSTEM\\CurrentControlSet\\Control\\ComputerName",
            "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion",
        ]
        
        for key in system_keys:
            self.emit_registry_operation(key, modify=False, technique="T1082")
            time.sleep(0.05)

    def _detect_security_tools(self) -> None:
        """Simulate security tool detection."""
        tools = ["Windows Defender", "Firewall", "Security Center"]
        for tool in tools:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "security_tool_detection",
                    {"tool": tool, "status": "active"},
                    technique="T1518",
                    tactic="Discovery"
                )
            time.sleep(0.1)

    def _registry_persistence(self) -> None:
        """Simulate registry persistence."""
        registry_routes = [
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce",
        ]
        
        for key in registry_routes:
            self.emit_registry_operation(key, modify=True, technique="T1547.001")
            time.sleep(0.08)

    def _service_persistence(self) -> None:
        """Simulate service persistence."""
        if self._logger:
            self._logger.emit_service_install("WindowsUpdate", technique="T1543")

    def _simulate_process_enumeration(self) -> None:
        """Simulate process enumeration."""
        for i, proc in enumerate(self.TARGET_PROCESSES):
            if self._logger:
                self._logger.emit_process_start(
                    pid=2000 + i,
                    path=f"C:\\Windows\\System32\\{proc}",
                    parent_pid=None,
                    technique="T1056"
                )
            time.sleep(0.1)

    def _simulate_network_discovery(self) -> None:
        """Simulate network discovery."""
        targets = [("127.0.0.1", 8080), ("127.0.0.1", 443)]
        for host, port in targets:
            self.emit_network_activity(host, port, technique="T1018")
            time.sleep(0.05)

    def _collect_system_info(self) -> None:
        """Collect system information."""
        for i in range(self._collection_cycles):
            for key in self.SYSTEM_INFO_KEYS:
                synthetic_value = f"SYNTHETIC_{key}_{random.randint(1000,9999)}"
                if self._logger:
                    self._logger.emit_suspicious_behavior(
                        "system_info_collection",
                        {"key": key},
                        technique="T1082",
                        tactic="Discovery"
                    )
                self._collected_data_size += len(synthetic_value)
            time.sleep(0.15)

    def _collect_browser_data(self) -> None:
        """Collect browser data."""
        for browser in self.BROWSER_PATHS:
            paths = [
                f"C:\\Users\\Default\\AppData\\Local\\{browser}\\User Data\\Default\\History",
                f"C:\\Users\\Default\\AppData\\Local\\{browser}\\User Data\\Default\\Login Data",
            ]
            
            for path in paths:
                self.emit_file_operation("access", path, technique="T1555")
                if self._logger:
                    self._logger.emit_suspicious_behavior(
                        "browser_data_collection",
                        {"browser": browser},
                        technique="T1555",
                        tactic="Collection",
                        risk_score=70
                    )
                self._collected_data_size += random.randint(100, 1000)
                time.sleep(0.08)

    def _collect_clipboard_data(self) -> None:
        """Collect clipboard data."""
        for i in range(8):
            synthetic_clipboard = f"clipboard_data_{random.randint(1000,9999)}_{i}"
            
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "clipboard_monitoring",
                    {"data_size": len(synthetic_clipboard)},
                    technique="T1115",
                    tactic="Collection",
                    risk_score=50
                )
            
            self._collected_data_size += len(synthetic_clipboard)
            time.sleep(0.2)

    def _collect_screen_captures(self) -> None:
        """Collect screen captures."""
        for i in range(6):
            screenshot_data = f"SYNTHETIC_SCREENSHOT_{i}_{random.randint(1000,9999)}"
            
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "screen_capture",
                    {"screenshot_id": i, "resolution": "1920x1080"},
                    technique="T1113",
                    tactic="Collection",
                    risk_score=60
                )
            
            capture_file = os.path.join(self._staging_dir, f"capture_{i}.dat")
            try:
                with open(capture_file, "w") as f:
                    f.write(screenshot_data)
                self.emit_file_operation("create", capture_file, technique="T1113")
            except Exception as e:
                logging.error(f"Failed to write capture: {e}")
            
            self._collected_data_size += len(screenshot_data)
            time.sleep(0.3)

    def _collect_keyboard_state(self) -> None:
        """Collect keyboard state."""
        for i in range(10):
            synthetic_keys = [f"key_{random.randint(1,100)}" for _ in range(5)]
            
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "keyboard_monitoring",
                    {"key_count": len(synthetic_keys)},
                    technique="T1056.001",
                    tactic="Collection",
                    risk_score=65
                )
            
            self._collected_data_size += sum(len(k) for k in synthetic_keys)
            time.sleep(0.15)

    def _collect_application_data(self) -> None:
        """Collect application data."""
        os.makedirs(self._staging_dir, exist_ok=True)
        for i in range(18):
            file_path = os.path.join(self._staging_dir, f"app_data_{i}.txt")
            try:
                with open(file_path, "w") as f:
                    f.write(f"SYNTHETIC_APP_DATA_{i}")
                self.emit_file_operation("scan", file_path, technique="T1083")
                self._collected_data_size += 100
            except Exception as e:
                logging.error(f"Failed to write app data: {e}")
            time.sleep(0.1)

    def _create_data_archives(self) -> None:
        """Create data archives."""
        archive_names = ["collection_1.dat", "collection_2.dat", "credentials.dat"]
        
        for archive in archive_names:
            archive_path = os.path.join(self._staging_dir, archive)
            try:
                with open(archive_path, "w") as f:
                    f.write(f"SYNTHETIC_ARCHIVE_{random.randint(1000,9999)}\n" * 30)
                self.emit_file_operation("create", archive_path, technique="T1560")
                self._collected_data_size += 2000
            except Exception as e:
                logging.error(f"Failed to create archive: {e}")
            
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "archive_creation",
                    {"archive": archive},
                    technique="T1560",
                    tactic="Collection"
                )
            
            time.sleep(0.1)

    def _encrypt_staged_data(self) -> None:
        """Encrypt staged data."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "data_encryption",
                {"method": "AES256_Simulation"},
                technique="T1029",
                tactic="Exfiltration"
            )
        
        for i in range(3):
            enc_file = os.path.join(self._staging_dir, f"encrypted_{i}.enc")
            try:
                with open(enc_file, "wb") as f:
                    f.write(os.urandom(256))
            except Exception as e:
                logging.error(f"Failed to encrypt: {e}")
            time.sleep(0.05)

    def _beaconing_pattern(self) -> None:
        """Simulate beaconing."""
        beacon_intervals = [5, 10, 15, 20]
        
        for i, interval in enumerate(beacon_intervals):
            if self._logger:
                self._logger.emit_beacon(
                    "127.0.0.1", 8443, i + 1,
                    interval_seconds=interval,
                    technique="T1071"
                )
            time.sleep(0.3)

    def _simulate_data_transfer(self) -> None:
        """Simulate data transfer."""
        transfer_sizes = [1024, 2048, 4096]
        
        for size in transfer_sizes:
            if self._logger:
                self._logger.emit_exfiltration(
                    data_size=size,
                    destination="127.0.0.1:8443",
                    technique="T1041",
                    tactic="Exfiltration"
                )
            self.emit_network_activity("127.0.0.1", 8443, technique="T1041")
            self._collected_data_size += size
            time.sleep(0.25)

    def _remove_evidence(self) -> None:
        """Remove evidence."""
        if os.path.isdir(self._staging_dir):
            try:
                for file in os.listdir(self._staging_dir):
                    file_path = os.path.join(self._staging_dir, file)
                    if os.path.isfile(file_path):
                        os.remove(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                    self.emit_file_operation("delete", file_path, technique="T1070")
            except Exception as e:
                logging.error(f"Evidence removal error: {e}")

    def _finalize(self) -> None:
        """Finalize."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "simulation_complete",
                {"data_collected": self._collected_data_size, "campaign_id": self._campaign_id},
                technique="T1071",
                tactic="CommandAndControl",
                risk_score=60
            )


def main():
    """Entry point for spyware simulator."""
    manifest = SimulatorManifest(
        simulator_id="spyware-simulator",
        display_name="Sample Beta",
        version="1.0.0",
        description="Unknown threat sample - awaiting behavioral analysis",
        category=SimulatorCategory.SPYWARE,
        entry_point="spyware_simulator.runtime",
        allowed_directories=["C:/Windows/Temp", "C:/sandbox", "C:/temp"],
        allowed_network_targets=["127.0.0.1"],
        max_runtime_seconds=120,
        behavior_intensity="high",
        requires_isolation=True,
    )

    runtime = SpywareSimulatorRuntime(manifest)
    sys.exit(runtime.validate_and_run())


if __name__ == "__main__":
    main()