"""Credential stealer simulator - SAFE multi-stage adversarial simulation.

This simulator generates realistic credential-access behavioral patterns
with full multi-stage execution chain and telemetry enrichment.
"""

from __future__ import annotations

import os
import sys
import time
import random
import logging
import hashlib
import uuid
from pathlib import Path

from forensics_simulator_common.contracts.manifest import SimulatorManifest, SimulatorCategory
from forensics_simulator_common.runtime.base import BaseSimulatorRuntime
from forensics_simulator_common.telemetry.events import (
    SimulatorLogger,
    EXECUTION_STAGES,
    TelemetryEventType
)


class CredentialStealerSimulatorRuntime(BaseSimulatorRuntime):
    """Multi-stage credential stealer behavior simulator with full telemetry."""

    CREDENTIAL_LOCATIONS = [
        "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer",
        "HKCU\\Software\\Google\\Chrome\\Preferences",
        "HKCU\\Software\\Microsoft\\Edge\\Browser",
        "HKCU\\Software\\Mozilla\\Firefox\\Profiles",
    ]
    
    BROWSER_PATHS = [
        "C:\\Users\\Default\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Login Data",
        "C:\\Users\\Default\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Login Data",
    ]

    def __init__(self, manifest: SimulatorManifest) -> None:
        super().__init__(manifest)
        self._enumeration_count = 15
        self._staging_dir = ""
        self._random_delays = [0.1, 0.2, 0.3, 0.15, 0.25]
        self._credentials_collected = 0
        self._campaign_id = f"credential_thief_{int(time.time())}"

    def run(self) -> None:
        """Execute credential-access-like behavioral simulation with 7 stages."""
        logging.info("Starting credential stealer simulator - MULTI-STAGE ADVANCED MODE")
        
        self._setup_staging()
        
        for stage_idx, stage in enumerate(EXECUTION_STAGES):
            if self._logger:
                self._logger.set_stage(stage)
                self._logger.emit_execution_stage(stage)
            self._execute_stage(stage)
            self._evasion_delay()
        
        self._finalize()
        
        logging.info(f"Credential stealer simulator completed - collected {self._credentials_collected} credentials")

    def _setup_staging(self) -> None:
        """Setup staging directory."""
        safe_dir = self.get_safe_directory()
        staging = os.path.join(safe_dir, "credential_staging")
        os.makedirs(staging, exist_ok=True)
        self._staging_dir = staging
        
        if self._logger:
            self._logger.emit_file_create(staging)
            self._logger.emit_suspicious_behavior(
                "staging_created",
                {"path": staging},
                technique="T1074",
                tactic="Collection"
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
        self._perform_anti_debug_checks()
        self._generate_config_artifact()
        self._initialize_collection_buffers()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "credential_thief_initialized",
                {"campaign_id": self._campaign_id},
                technique="T1059",
                tactic="Execution",
                risk_score=40
            )

    def _stage_environment_check(self) -> None:
        """Stage 2: Check environment."""
        self._simulate_system_discovery()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "environment_check_complete",
                {"checks_performed": 4},
                technique="T1082",
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
        """Stage 4: Credential discovery."""
        self._discover_registry_credentials()
        self._discover_browser_credentials()
        self._discover_system_credentials()

    def _stage_payload_execution(self) -> None:
        """Stage 5: Credential harvesting."""
        self._simulate_lsass_access()
        self._simulate_credential_manager()
        self._harvest_browser_credentials()
        self._harvest_windows_credentials()
        self._simulate_keylogging()
        self._create_credential_archives()
        self._encrypt_credential_data()
        self._generate_credential_hashes()

    def _stage_lateral_activity(self) -> None:
        """Stage 6: Exfiltration."""
        self._beaconing()
        self._simulate_exfiltration()

    def _stage_cleanup_or_exit(self) -> None:
        """Stage 7: Cleanup."""
        self._remove_credentials_from_disk()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "execution_complete",
                {"credentials_collected": self._credentials_collected},
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

    def _perform_anti_debug_checks(self) -> None:
        """Simulate anti-debugging checks."""
        debug_checks = [("debugger_present", "not_detected"), ("process_debug_flags", "not_detected")]
        for check_type, result in debug_checks:
            if self._logger:
                self._logger.emit_anti_debug_check(check_type, result)

    def _generate_config_artifact(self) -> None:
        """Generate configuration artifact."""
        config_data = f"collection_mode=comprehensive\ntarget_browsers=chrome,edge,firefox\ntarget_system=true\ncampaign={self._campaign_id}\n"
        config_path = os.path.join(self._staging_dir, "patch.cfg")
        try:
            with open(config_path, "w") as f:
                f.write(config_data)
            self.emit_file_operation("create", config_path, technique="T1105")
        except Exception:
            pass

    def _initialize_collection_buffers(self) -> None:
        """Initialize collection buffers."""
        for i in range(4):
            buf_path = os.path.join(self._staging_dir, f"cred_buffer_{i}.bin")
            try:
                with open(buf_path, "wb") as f:
                    f.write(os.urandom(1024))
            except Exception:
                pass

    def _simulate_system_discovery(self) -> None:
        """Simulate system discovery."""
        system_keys = [
            "HKLM\\SYSTEM\\CurrentControlSet\\Control\\ComputerName",
            "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion",
        ]
        
        for key in system_keys:
            self.emit_registry_operation(key, modify=False, technique="T1082")
            time.sleep(0.05)

    def _registry_persistence(self) -> None:
        """Simulate registry persistence."""
        registry_routes = [
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
            "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
        ]
        
        for path in registry_routes:
            self.emit_registry_operation(path, modify=True, technique="T1547.001")
            time.sleep(0.1)

    def _discover_registry_credentials(self) -> None:
        """Discover credentials in registry."""
        for i in range(self._enumeration_count):
            location = random.choice(self.CREDENTIAL_LOCATIONS)
            
            self.emit_registry_operation(location, modify=False, technique="T1555")
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "registry_credential_discovery",
                    {"location": location},
                    technique="T1555",
                    tactic="Discovery",
                    risk_score=50
                )
            
            self._credentials_collected += random.randint(1, 5)
            time.sleep(0.1)

    def _discover_browser_credentials(self) -> None:
        """Discover browser credential storage."""
        browser_areas = ["Login Data", "Cookies", "Web Data"]
        
        for browser in ["Chrome", "Edge", "Firefox"]:
            for area in browser_areas:
                if self._logger:
                    self._logger.emit_suspicious_behavior(
                        "browser_credential_discovery",
                        {"browser": browser, "area": area},
                        technique="T1555",
                        tactic="Discovery"
                    )
                time.sleep(0.08)

    def _discover_system_credentials(self) -> None:
        """Discover system credentials."""
        system_cred_paths = [
            "C:\\Windows\\System32\\config\\SAM",
            "C:\\Windows\\System32\\config\\SYSTEM",
            "C:\\Windows\\System32\\config\\SECURITY",
        ]
        
        for path in system_cred_paths:
            self.emit_file_operation("access", path, technique="T1003")
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "system_credential_discovery",
                    {"store": path},
                    technique="T1003",
                    tactic="Discovery",
                    risk_score=55
                )
            time.sleep(0.12)

    def _simulate_lsass_access(self) -> None:
        """Simulate LSASS access."""
        if self._logger:
            self._logger.emit_process_start(
                pid=1234,
                path="C:\\Windows\\System32\\lsass.exe",
                parent_pid=os.getpid(),
                technique="T1003.001"
            )
            self._logger.emit_suspicious_behavior(
                "lsass_access",
                {"target": "LSASS.exe"},
                technique="T1003.001",
                tactic="CredentialAccess",
                risk_score=85
            )
        
        memory_regions = ["LSASS Process Memory", "Credential Manager", "SSPI Credentials"]
        
        for region in memory_regions:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "memory_credential_dump",
                    {"memory_region": region},
                    technique="T1003.001",
                    tactic="CredentialAccess",
                    risk_score=80
                )
            self._credentials_collected += random.randint(5, 15)
            time.sleep(0.2)

    def _simulate_credential_manager(self) -> None:
        """Simulate credential manager access."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "credential_manager_access",
                {"target": "Windows Credentials"},
                technique="T1555",
                tactic="CredentialAccess",
                risk_score=75
            )
        
        cred_types = ["Generic", "Domain Password", "PIN", "Smartcard"]
        for cred_type in cred_types:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "credential_type_access",
                    {"type": cred_type},
                    technique="T1555",
                    tactic="CredentialAccess"
                )
            self._credentials_collected += random.randint(1, 3)
            time.sleep(0.15)

    def _harvest_browser_credentials(self) -> None:
        """Harvest browser credentials."""
        for path in self.BROWSER_PATHS:
            self.emit_file_operation("access", path, technique="T1555.003")
            
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "browser_credential_harvest",
                    {"path": path, "credentials_found": random.randint(5, 25)},
                    technique="T1555.003",
                    tactic="CredentialAccess",
                    risk_score=80
                )
            
            self._credentials_collected += random.randint(10, 30)
            
            cred_file = os.path.join(self._staging_dir, f"browser_creds_{random.randint(1000,9999)}.dat")
            try:
                with open(cred_file, "w") as f:
                    f.write(f"SYNTHETIC_BROWSER_CREDS_{random.randint(1000,9999)}")
                self.emit_file_operation("create", cred_file, technique="T1555.003")
            except Exception:
                pass
            
            time.sleep(0.15)

    def _harvest_windows_credentials(self) -> None:
        """Harvest Windows credentials."""
        windows_credential_paths = [
            "C:\\Windows\\System32\\config\\SAM",
            "C:\\Windows\\System32\\config\\SYSTEM",
        ]
        
        for path in windows_credential_paths:
            self.emit_file_operation("access", path, technique="T1003")
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "windows_credential_harvest",
                    {"store": path},
                    technique="T1003",
                    tactic="CredentialAccess",
                    risk_score=85
                )
            self._credentials_collected += random.randint(10, 20)
            time.sleep(0.2)

    def _simulate_keylogging(self) -> None:
        """Simulate keylogging."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "keylogger_initialization",
                {},
                technique="T1056.001",
                tactic="Collection",
                risk_score=70
            )
        
        keylog_data = ["synthetic_pass", "synthetic_credential", "synthetic_token", "synthetic_pin"]
        
        for data in keylog_data:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "keylogging",
                    {"captured": data},
                    technique="T1056.001",
                    tactic="Collection",
                    risk_score=75
                )
            self._credentials_collected += 1
            time.sleep(0.2)

    def _create_credential_archives(self) -> None:
        """Create credential archives."""
        archive_names = ["credentials_1.dat", "credentials_2.dat", "browser_creds.dat"]
        
        for archive in archive_names:
            archive_path = os.path.join(self._staging_dir, archive)
            try:
                with open(archive_path, "w") as f:
                    f.write(f"SYNTHETIC_CREDS_{random.randint(1000,9999)}\n" * 30)
                self.emit_file_operation("create", archive_path, technique="T1560")
                
                if self._logger:
                    self._logger.emit_suspicious_behavior(
                        "credential_archive",
                        {"archive": archive},
                        technique="T1560",
                        tactic="Collection"
                    )
            except Exception:
                pass
            time.sleep(0.1)

    def _encrypt_credential_data(self) -> None:
        """Encrypt credential data."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "credential_encryption",
                {"method": "AES256"},
                technique="T1029",
                tactic="Exfiltration"
            )
        
        for i in range(4):
            enc_file = os.path.join(self._staging_dir, f"creds_enc_{i}.enc")
            try:
                with open(enc_file, "wb") as f:
                    f.write(os.urandom(512))
            except Exception:
                pass
            time.sleep(0.08)

    def _generate_credential_hashes(self) -> None:
        """Generate credential hashes."""
        for i in range(8):
            hash_value = hashlib.sha256(f"synthetic_cred_{i}".encode()).hexdigest()
            
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "credential_hash_generation",
                    {"hash_type": "SHA256"},
                    technique="T1006"
                )
            
            hash_file = os.path.join(self._staging_dir, f"cred_hash_{i}.txt")
            try:
                with open(hash_file, "w") as f:
                    f.write(hash_value)
            except Exception:
                pass

    def _beaconing(self) -> None:
        """Simulate beaconing."""
        for i in range(4):
            if self._logger:
                self._logger.emit_beacon(
                    "127.0.0.1", 9001, i + 1,
                    interval_seconds=random.randint(30, 90),
                    technique="T1071"
                )
            time.sleep(0.25)

    def _simulate_exfiltration(self) -> None:
        """Simulate exfiltration."""
        exfil_targets = [("127.0.0.1", 9001), ("127.0.0.1", 9002), ("127.0.0.1", 9443)]
        
        for target in exfil_targets:
            if self._logger:
                self._logger.emit_exfiltration(
                    data_size=self._credentials_collected * 100,
                    destination=f"{target[0]}:{target[1]}",
                    technique="T1041",
                    tactic="Exfiltration"
                )
            self.emit_network_activity(target[0], target[1], technique="T1041")
            time.sleep(0.3)

    def _remove_credentials_from_disk(self) -> None:
        """Remove credentials from disk."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "credential_cleanup",
                {"files_removed": len(os.listdir(self._staging_dir)) if os.path.exists(self._staging_dir) else 0},
                technique="T1070",
                tactic="DefenseEvasion",
                risk_score=40
            )

    def _finalize(self) -> None:
        """Finalize."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "simulation_complete",
                {"credentials_collected": self._credentials_collected, "campaign_id": self._campaign_id},
                technique="T1041",
                tactic="Exfiltration",
                risk_score=80
            )


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
        max_runtime_seconds=120,
        behavior_intensity="high",
        requires_isolation=True,
    )

    runtime = CredentialStealerSimulatorRuntime(manifest)
    sys.exit(runtime.validate_and_run())


if __name__ == "__main__":
    main()