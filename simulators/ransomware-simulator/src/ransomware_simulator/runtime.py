"""Ransomware simulator - SAFE multi-stage adversarial simulation.

This simulator generates realistic ransomware-like behavioral patterns
with full multi-stage execution chain and telemetry enrichment.
"""

from __future__ import annotations

import os
import sys
import time
import random
import string
import logging
import hashlib
import threading
import uuid
from pathlib import Path
from typing import Optional, List

from forensics_simulator_common.contracts.manifest import SimulatorManifest, SimulatorCategory
from forensics_simulator_common.runtime.base import BaseSimulatorRuntime
from forensics_simulator_common.telemetry.events import (
    SimulatorLogger,
    EXECUTION_STAGES,
    TelemetryEventType
)


class RansomwareSimulatorRuntime(BaseSimulatorRuntime):
    """Multi-stage ransomware behavior simulator with full telemetry."""

    SUSPICIOUS_EXTENSIONS = [".txt", ".doc", ".docx", ".jpg", ".png", ".pdf", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".json", ".xml"]
    ENCRYPTED_LOOKALIKE_EXTENSIONS = [".encrypted", ".locked", ".ransom", ".crypto", ".vault", ".secure"]
    RANSOM_NOTE_NAMES = ["READ_ME.txt", "HOW_TO_DECRYPT.txt", "recovery_instructions.txt", "DECRYPT_INSTRUCTIONS.html", "FILES_ENCRYPTED.txt"]
    BACKUP_SERVICES = ["VSS", "Backup", "WindowsBackup", "Spooler", "WinDefend", "MSSQLSERVER", "W32Time"]
    
    MITRE_TECHNIQUE_MAP = {
        "initialization": ["T1059", "T1564"],
        "environment_check": ["T1497", "T1082"],
        "persistence_attempt": ["T1547.001", "T1053", "T1543"],
        "reconnaissance": ["T1083", "T1082", "T1005"],
        "payload_execution": ["T1486", "T1485", "T1490"],
        "lateral_activity": ["T1041", "T1071"],
        "cleanup_or_exit": ["T1070", "T1070.004"],
    }

    def __init__(self, manifest: SimulatorManifest) -> None:
        super().__init__(manifest)
        self._files_processed = 0
        self._max_files = 100
        self._staging_dir = ""
        self._encrypted_marker = "SYNTHETIC_ENCRYPTED_MARKER_V1"
        self._random_delays = [0.1, 0.2, 0.3, 0.15, 0.25]
        self._campaign_id = f"ransomware_{int(time.time())}"
        
    def run(self) -> None:
        """Execute ransomware-like behavioral simulation with 7 stages."""
        logging.info("Starting ransomware simulator - MULTI-STAGE ADVANCED MODE")
        
        self._setup_staging_directory()
        
        for stage_idx, stage in enumerate(EXECUTION_STAGES):
            if self._logger:
                self._logger.set_stage(stage)
                self._logger.emit_execution_stage(stage)
            
            self._execute_stage(stage)
            
            self._evasion_delay()
        
        self._finalize()
        
        logging.info(f"Ransomware simulator completed - processed {self._files_processed} files")

    def _setup_staging_directory(self) -> None:
        """Create staging directory for artifacts."""
        safe_dir = self.get_safe_directory()
        staging = os.path.join(safe_dir, "ransomware_staging")
        os.makedirs(staging, exist_ok=True)
        self._staging_dir = staging
        
        if self._logger:
            self._logger.emit_file_create(staging)
            self._logger.emit_suspicious_behavior(
                "staging_directory_created",
                {"path": staging, "purpose": "artifact_staging"},
                technique="T1074",
                tactic="Persistence"
            )

    def _execute_stage(self, stage: str) -> None:
        """Execute a specific stage of the attack chain."""
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
        """Add randomized delay for evasion simulation."""
        delay = random.choice(self._random_delays)
        time.sleep(delay)

    def _stage_initialization(self) -> None:
        """Stage 1: Initialize ransomware with anti-VM/anti-debug checks."""
        logging.info("Stage 1: Initialization")
        
        self._perform_anti_vm_checks()
        self._perform_anti_debug_checks()
        self._simulate_mutex_creation()
        self._simulate_process_hardening()
        self._generate_forensic_artifacts()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "ransomware_initialized",
                {"campaign_id": self._campaign_id, "stages": len(EXECUTION_STAGES)},
                technique="T1059",
                tactic="Execution",
                risk_score=40
            )

    def _stage_environment_check(self) -> None:
        """Stage 2: Environment validation and system discovery."""
        logging.info("Stage 2: Environment Check")
        
        self._simulate_system_discovery()
        self._check_available_space()
        self._discover_security_tools()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "environment_check_complete",
                {"checks_performed": 5, "environment_score": random.randint(60, 95)},
                technique="T1082",
                tactic="Discovery",
                risk_score=30
            )

    def _stage_persistence_attempt(self) -> None:
        """Stage 3: Establish persistence through registry and scheduled tasks."""
        logging.info("Stage 3: Persistence Attempt")
        
        self._registry_persistence()
        self._scheduled_task_persistence()
        self._service_persistence()
        self._startup_folder_persistence()
        
        if self._logger:
            self._logger.emit_persistence_attempt(
                "registry_and_scheduled_task",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                technique="T1547.001",
                tactic="Persistence"
            )

    def _stage_reconnaissance(self) -> None:
        """Stage 4: Discover target files and volumes."""
        logging.info("Stage 4: Reconnaissance")
        
        self._recursive_file_traversal()
        self._simulate_volume_shadow_copy_discovery()
        self._discover_backup_locations()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "reconnaissance_complete",
                {"files_discovered": self._files_processed, "volumes_found": 3},
                technique="T1083",
                tactic="Discovery",
                risk_score=40
            )

    def _stage_payload_execution(self) -> None:
        """Stage 5: Execute encryption simulation and file modification."""
        logging.info("Stage 5: Payload Execution")
        
        self._spawn_worker_processes()
        self._create_staging_files()
        self._mass_file_modification_burst()
        self._extension_mutation()
        self._create_ransom_notes()
        self._simulate_shadow_copy_deletion()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "encryption_complete",
                {"files_encrypted": self._files_processed, "notes_created": 3},
                technique="T1486",
                tactic="Impact",
                risk_score=95
            )

    def _stage_lateral_activity(self) -> None:
        """Stage 6: Simulate beaconing and data exfiltration."""
        logging.info("Stage 6: Lateral Activity")
        
        self._network_beaconing()
        self._simulate_key_exfiltration()
        
        if self._logger:
            self._logger.emit_exfiltration(
                data_size=self._files_processed * 1024,
                destination="127.0.0.1:8080",
                technique="T1041",
                tactic="Exfiltration"
            )

    def _stage_cleanup_or_exit(self) -> None:
        """Stage 7: Clean up staging files and simulate log tampering."""
        logging.info("Stage 7: Cleanup or Exit")
        
        self._clean_staging_files()
        self._log_tampering_simulation()
        self._self_destruct_simulation()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "execution_complete",
                {"total_files": self._files_processed, "campaign_id": self._campaign_id},
                technique="T1070",
                tactic="Defense Evasion",
                risk_score=20
            )

    def _perform_anti_vm_checks(self) -> None:
        """Simulate anti-VM detection checks."""
        vm_checks = [
            ("hypervisor_detection", "not_detected"),
            ("sandbox_timeout", "not_detected"),
            ("vm_files_present", "not_detected"),
            ("vm_registry_keys", "not_detected"),
        ]
        
        for check_type, result in vm_checks:
            if self._logger:
                self._logger.emit_anti_vm_check(check_type, result)

    def _perform_anti_debug_checks(self) -> None:
        """Simulate anti-debugging checks."""
        debug_checks = [
            ("debugger_present", "not_detected"),
            ("process_debug_flags", "not_detected"),
            ("remote_debugger", "not_detected"),
        ]
        
        for check_type, result in debug_checks:
            if self._logger:
                self._logger.emit_anti_debug_check(check_type, result)

    def _simulate_mutex_creation(self) -> None:
        """Simulate mutex creation for single instance enforcement."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "mutex_creation",
                {"name": "Global\\RansomwareMutex_Safe", "purpose": "single_instance"},
                technique="T1068",
                tactic="PrivilegeEscalation",
                risk_score=30
            )
        
        mutex_file = os.path.join(self._staging_dir, "mutex.lock")
        try:
            with open(mutex_file, "w") as f:
                f.write(f"{self._encrypted_marker}\n{self._campaign_id}\n")
            self.emit_file_operation("create", mutex_file)
        except Exception:
            pass
        
        time.sleep(random.uniform(0.1, 0.3))

    def _simulate_process_hardening(self) -> None:
        """Simulate process priority elevation."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "process_hardening",
                {"actions": ["priority_boost", "token_adjustment"]},
                technique="T1068",
                tactic="PrivilegeEscalation",
                risk_score=35
            )

    def _generate_forensic_artifacts(self) -> None:
        """Generate forensic artifacts."""
        artifacts = [
            ("config.dat", "SYNTHETIC_CONFIG_V1"),
            ("key.dat", hashlib.md5(str(time.time()).encode()).hexdigest()),
            ("settings.ini", f"id={random.randint(10000,99999)}"),
        ]
        
        for filename, content in artifacts:
            path = os.path.join(self._staging_dir, filename)
            try:
                with open(path, "w") as f:
                    f.write(content)
                self.emit_file_operation("create", path, technique="T1105")
            except Exception:
                pass

    def _simulate_system_discovery(self) -> None:
        """Simulate system information discovery."""
        system_info_keys = [
            "HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion",
            "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager",
            "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        ]
        
        for key in system_info_keys:
            self.emit_registry_operation(key, modify=False, technique="T1082")
            time.sleep(0.05)

    def _check_available_space(self) -> None:
        """Simulate disk space checking."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "disk_space_check",
                {"available_gb": random.randint(50, 500), "drive": "C:"},
                technique="T1082",
                tactic="Discovery"
            )

    def _discover_security_tools(self) -> None:
        """Simulate security tool discovery."""
        security_tools = ["Windows Defender", "Windows Firewall", "Windows Update"]
        
        for tool in security_tools:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "security_tool_discovery",
                    {"tool": tool, "status": "detected"},
                    technique="T1518",
                    tactic="Discovery"
                )
            time.sleep(0.1)

    def _registry_persistence(self) -> None:
        """Simulate registry persistence."""
        registry_routes = [
            ("HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "WindowsUpdate"),
            ("HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce", "SystemRepair"),
            ("HKCU\\Software\\Classes\\*\\shell\\open\\command", None),
        ]
        
        for key_path, value_name in registry_routes:
            self.emit_registry_operation(key_path, modify=True, technique="T1547.001")
            self._logger.emit_persistence_attempt(
                "registry_run_key",
                key_path,
                technique="T1547.001",
                tactic="Persistence"
            )
            time.sleep(0.1)

    def _scheduled_task_persistence(self) -> None:
        """Simulate scheduled task persistence."""
        task_names = ["SystemUpdate", "SecurityScan", "DiskCleanup"]
        
        for task in task_names:
            if self._logger:
                self._logger.emit_scheduled_task(task, "AtLogon", technique="T1053")
            time.sleep(0.15)

    def _service_persistence(self) -> None:
        """Simulate service installation."""
        service_names = ["WindowsUpdate", "SecurityService"]
        
        for service in service_names:
            if self._logger:
                self._logger.emit_service_install(service, technique="T1543")
            time.sleep(0.1)

    def _startup_folder_persistence(self) -> None:
        """Simulate startup folder persistence."""
        startup_paths = [
            "C:\\Users\\Default\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup",
        ]
        
        for path in startup_paths:
            if self._logger:
                self._logger.emit_persistence_attempt(
                    "startup_folder",
                    path,
                    technique="T1547",
                    tactic="Persistence"
                )

    def _recursive_file_traversal(self) -> None:
        """Simulate recursive file traversal."""
        safe_dir = self.get_safe_directory()
        
        test_dirs = [
            os.path.join(safe_dir, "documents"),
            os.path.join(safe_dir, "images"),
            os.path.join(safe_dir, "data"),
        ]
        
        for dir_path in test_dirs:
            os.makedirs(dir_path, exist_ok=True)
            
            for i in range(20):
                filename = f"doc_{i:03d}{random.choice(self.SUSPICIOUS_EXTENSIONS)}"
                filepath = os.path.join(dir_path, filename)
                
                synthetic_content = self._generate_synthetic_content()
                try:
                    with open(filepath, "w") as f:
                        f.write(synthetic_content)
                    self.emit_file_operation("scan", filepath, technique="T1083")
                except Exception:
                    pass
                
                if i % 5 == 0:
                    self._files_processed += 1

    def _simulate_volume_shadow_copy_discovery(self) -> None:
        """Simulate VSS discovery."""
        vss_paths = [
            "HKLM\\SYSTEM\\CurrentControlSet\\Services\\VSS",
            "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore",
        ]
        
        for path in vss_paths:
            self.emit_registry_operation(path, modify=False, technique="T1490")
            time.sleep(0.1)

    def _discover_backup_locations(self) -> None:
        """Simulate backup location discovery."""
        backup_paths = [
            "C:\\Windows\\System32\\config\\backup",
            "C:\\System Volume Information",
            "C:\\Backup",
        ]
        
        for path in backup_paths:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "backup_discovery",
                    {"path": path},
                    technique="T1005",
                    tactic="Collection"
                )
            time.sleep(0.1)

    def _create_staging_files(self) -> None:
        """Create staging files."""
        for i in range(15):
            filename = f"staged_{i:03d}.tmp"
            filepath = os.path.join(self._staging_dir, filename)
            
            try:
                with open(filepath, "w") as f:
                    f.write(self._encrypted_marker * 100)
                self.emit_file_operation("create", filepath, technique="T1074")
            except Exception:
                pass
            
            if i % 5 == 0:
                time.sleep(0.05)

    def _spawn_worker_processes(self) -> None:
        """Spawn worker threads."""
        worker_names = ["worker.exe", "crypt.exe", "helper.exe", "service.exe", "encryptor.exe"]
        
        for i, worker in enumerate(worker_names):
            if self._logger:
                self._logger.emit_process_start(
                    pid=4000 + i,
                    path=f"C:\\Windows\\Temp\\{worker}",
                    parent_pid=os.getpid(),
                    technique="T1059"
                )
            time.sleep(0.15)

    def _mass_file_modification_burst(self) -> None:
        """Simulate mass file modification."""
        safe_dir = self.get_safe_directory()
        
        for i in range(min(self._max_files, 60)):
            filename = f"file_{random.randint(1000, 9999)}"
            ext = random.choice(self.SUSPICIOUS_EXTENSIONS)
            fake_path = os.path.join(safe_dir, "documents", f"{filename}{ext}")
            
            if not os.path.exists(fake_path):
                synthetic_content = self._generate_synthetic_content(encrypted=True)
                try:
                    with open(fake_path, "w") as f:
                        f.write(synthetic_content)
                    self.emit_file_operation("modify", fake_path)
                    self._files_processed += 1
                except Exception:
                    pass
            
            if i % 15 == 0:
                self.emit_encryption_sim(fake_path, technique="T1486")
            
            time.sleep(0.01)

    def _extension_mutation(self) -> None:
        """Simulate extension renaming."""
        safe_dir = self.get_safe_directory()
        
        for subdir in ["documents", "images", "data"]:
            dir_path = os.path.join(safe_dir, subdir)
            if not os.path.exists(dir_path):
                continue
                
            files = list(Path(dir_path).glob("*"))
            sample_size = min(10, len(files))
            
            for file_path in files[:sample_size]:
                if file_path.suffix in self.SUSPICIOUS_EXTENSIONS:
                    new_ext = random.choice(self.ENCRYPTED_LOOKALIKE_EXTENSIONS)
                    new_name = f"{file_path.stem}{new_ext}"
                    new_path = file_path.parent / new_name
                    
                    try:
                        os.rename(str(file_path), str(new_path))
                        self.emit_file_operation("modify", str(new_path))
                        self.emit_encryption_sim(str(new_path), method="extension_rename")
                    except Exception:
                        pass
                    
                    time.sleep(0.02)

    def _create_ransom_notes(self) -> None:
        """Create ransom notes."""
        safe_dir = self.get_safe_directory()
        
        ransom_note_content = f"""=================================================================
YOUR FILES HAVE BEEN ENCRYPTED
=================================================================

Campaign ID: {self._campaign_id}

*** SIMULATED RANSOMWARE FOR EDUCATIONAL PURPOSES ***
*** NO ACTUAL ENCRYPTION HAS OCCURRED ***

For learning purposes only.
=================================================================
"""
        
        for note_name in self.RANSOM_NOTE_NAMES:
            note_path = os.path.join(safe_dir, note_name)
            try:
                with open(note_path, "w") as f:
                    f.write(ransom_note_content)
                self.emit_file_operation("create", note_path, technique="T1486")
                break
            except Exception:
                pass

    def _simulate_shadow_copy_deletion(self) -> None:
        """Simulate shadow copy deletion."""
        vss_commands = ["vssadmin delete shadows", "wmic shadowcopy delete", "powershell shadowcopy"]
        
        for cmd in vss_commands:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "shadow_copy_deletion",
                    {"command": cmd},
                    technique="T1490",
                    tactic="Impact",
                    risk_score=75
                )
            time.sleep(0.1)

    def _network_beaconing(self) -> None:
        """Simulate network beaconing."""
        beacon_targets = [
            ("127.0.0.1", 8080),
            ("127.0.0.1", 4444),
            ("127.0.0.1", 6666),
        ]
        
        for i, (host, port) in enumerate(beacon_targets):
            if self._logger:
                self._logger.emit_beacon(
                    host, port, i + 1,
                    interval_seconds=random.randint(30, 120),
                    technique="T1071"
                )
            time.sleep(0.3)

    def _simulate_key_exfiltration(self) -> None:
        """Simulate key exfiltration."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "key_exfiltration",
                {"keys_exfiltrated": random.randint(3, 8)},
                technique="T1041",
                tactic="Exfiltration",
                risk_score=70
            )

    def _clean_staging_files(self) -> None:
        """Clean up staging files."""
        if os.path.exists(self._staging_dir):
            try:
                for file in os.listdir(self._staging_dir):
                    file_path = os.path.join(self._staging_dir, file)
                    if os.path.isfile(file_path):
                        self.emit_file_operation("delete", file_path, technique="T1070")
            except Exception:
                pass

    def _log_tampering_simulation(self) -> None:
        """Simulate event log tampering."""
        log_types = ["Application", "Security", "System"]
        
        for log in log_types:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "log_tampering",
                    {"log_type": log},
                    technique="T1070",
                    tactic="DefenseEvasion",
                    risk_score=40
                )
            time.sleep(0.05)

    def _self_destruct_simulation(self) -> None:
        """Simulate self-destruct behavior."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "self_destruct",
                {"method": "process_termination"},
                technique="T1202",
                tactic="DefenseEvasion",
                risk_score=10
            )

    def _finalize(self) -> None:
        """Finalize the simulation."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "simulation_complete",
                {
                    "total_files": self._files_processed,
                    "campaign_id": self._campaign_id,
                    "stages_completed": len(EXECUTION_STAGES)
                },
                technique="T1486",
                tactic="Impact",
                risk_score=95
            )

    def _generate_synthetic_content(self, encrypted: bool = False) -> str:
        """Generate synthetic file content."""
        marker = self._encrypted_marker if encrypted else "SYNTHETIC"
        lines = [
            f"{marker} TEST DATA - FORENSIC SIMULATION",
            f"Campaign: {self._campaign_id}",
            f"Timestamp: {time.time()}",
            f"Session: {random.randint(1000, 9999)}",
            "",
            "".join(random.choices(string.ascii_letters + string.digits, k=150)),
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
        max_runtime_seconds=120,
        behavior_intensity="high",
        requires_isolation=True,
    )

    runtime = RansomwareSimulatorRuntime(manifest)
    sys.exit(runtime.validate_and_run())


if __name__ == "__main__":
    main()