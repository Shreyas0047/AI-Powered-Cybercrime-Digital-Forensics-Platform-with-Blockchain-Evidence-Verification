"""Trojan simulator - SAFE multi-stage adversarial simulation.

This simulator generates realistic trojan-like behavioral patterns
with full multi-stage execution chain and telemetry enrichment.
"""

from __future__ import annotations

import os
import sys
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


class TrojanSimulatorRuntime(BaseSimulatorRuntime):
    """Multi-stage trojan behavior simulator with full telemetry."""

    DECEPTIVE_NAMES = ["svchost.exe", "explorer.exe", "winlogon.exe", "services.exe", "lsass.exe", "rundll32.exe", "dllhost.exe"]
    SUSPICIOUS_CHILD_PROCESSES = ["cmd.exe", "powershell.exe", "wscript.exe", "cscript.exe", "regsvr32.exe", "mshta.exe", "certutil.exe"]

    def __init__(self, manifest: SimulatorManifest) -> None:
        super().__init__(manifest)
        self._execution_stages = 7
        self._staging_dir = ""
        self._random_delays = [0.1, 0.2, 0.3, 0.15, 0.25]
        self._payload_count = 0
        self._campaign_id = f"trojan_{int(time.time())}"

    def run(self) -> None:
        """Execute trojan-like behavioral simulation with 7 stages."""
        logging.info("Starting trojan simulator - MULTI-STAGE ADVANCED MODE")
        
        self._setup_staging()
        
        for stage_idx, stage in enumerate(EXECUTION_STAGES):
            if self._logger:
                self._logger.set_stage(stage)
                self._logger.emit_execution_stage(stage)
            self._execute_stage(stage)
            self._evasion_delay()
        
        self._finalize()
        
        logging.info(f"Trojan simulator completed - staged {self._payload_count} payloads")

    def _setup_staging(self) -> None:
        """Setup staging directory."""
        safe_dir = self.get_safe_directory()
        staging = os.path.join(safe_dir, "trojan_staging")
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
        self._perform_anti_debug_checks()
        self._generate_trojan_config()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "trojan_initialized",
                {"campaign_id": self._campaign_id},
                technique="T1036",
                tactic="DefenseEvasion",
                risk_score=40
            )

    def _stage_environment_check(self) -> None:
        """Stage 2: Check environment."""
        self._simulate_system_discovery()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "environment_check_complete",
                {"checks_performed": 3},
                technique="T1082",
                tactic="Discovery",
                risk_score=30
            )

    def _stage_persistence_attempt(self) -> None:
        """Stage 3: Establish persistence."""
        self._registry_persistence()
        self._scheduled_task_persistence()
        self._service_persistence()
        
        if self._logger:
            self._logger.emit_persistence_attempt(
                "registry_scheduled_task_service",
                "Multiple persistence methods",
                technique="T1547.001",
                tactic="Persistence"
            )

    def _stage_reconnaissance(self) -> None:
        """Stage 4: Reconnaissance."""
        self._simulate_deceptive_initialization()
        self._simulate_dll_hijacking()
        self._simulate_process_spoofing()

    def _stage_payload_execution(self) -> None:
        """Stage 5: Payload execution."""
        self._simulate_process_injection()
        self._drop_payload_files()
        self._spawn_suspicious_child_processes()
        self._simulate_command_execution()
        self._c2_check_in()

    def _stage_lateral_activity(self) -> None:
        """Stage 6: Lateral movement."""
        self._simulate_lateral_movement()
        self._credential_gathering()

    def _stage_cleanup_or_exit(self) -> None:
        """Stage 7: Cleanup."""
        self._simulate_trace_removal()
        
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "execution_complete",
                {"payloads_staged": self._payload_count},
                technique="T1070",
                tactic="DefenseEvasion",
                risk_score=20
            )

    def _perform_anti_vm_checks(self) -> None:
        """Simulate anti-VM checks."""
        vm_checks = [("hypervisor_detection", "not_detected"), ("sandbox_detection", "not_detected")]
        for check_type, result in vm_checks:
            if self._logger:
                self._logger.emit_anti_vm_check(check_type, result)

    def _perform_anti_debug_checks(self) -> None:
        """Simulate anti-debugging checks."""
        debug_checks = [("debugger_present", "not_detected"), ("process_debug_flags", "not_detected")]
        for check_type, result in debug_checks:
            if self._logger:
                self._logger.emit_anti_debug_check(check_type, result)

    def _generate_trojan_config(self) -> None:
        """Generate trojan configuration."""
        config_data = f"update_id={random.randint(100000,999999)}\nversion=1.0.0\ninterval=300\ncampaign={self._campaign_id}\n"
        config_path = os.path.join(self._staging_dir, "update.cfg")
        try:
            with open(config_path, "w") as f:
                f.write(config_data)
            self.emit_file_operation("create", config_path, technique="T1105")
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
            "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
            "HKLM\\SYSTEM\\CurrentControlSet\\Services\\WinDefend",
            "HKCU\\Software\\Classes\\*\\shell\\open\\command",
        ]
        
        for path in registry_routes:
            self.emit_registry_operation(path, modify=True, technique="T1547.001")
            time.sleep(0.1)

    def _scheduled_task_persistence(self) -> None:
        """Simulate scheduled task persistence."""
        task_names = ["WindowsUpdate", "SecurityManager", "SystemService"]
        
        for task in task_names:
            if self._logger:
                self._logger.emit_scheduled_task(task, "AtLogon", technique="T1053")
            time.sleep(0.12)

    def _service_persistence(self) -> None:
        """Simulate service persistence."""
        service_names = ["WindowsUpdate", "SecurityService"]
        
        for service in service_names:
            if self._logger:
                self._logger.emit_service_install(service, technique="T1543")
            time.sleep(0.15)

    def _simulate_deceptive_initialization(self) -> None:
        """Simulate deceptive initialization."""
        deceptive_name = random.choice(self.DECEPTIVE_NAMES)
        
        if self._logger:
            self._logger.emit_process_spawn(deceptive_name)
            self._logger.emit_suspicious_behavior(
                "deceptive_process",
                {"deceptive_name": deceptive_name},
                technique="T1036",
                tactic="DefenseEvasion",
                risk_score=55
            )
        
        time.sleep(0.3)

    def _simulate_dll_hijacking(self) -> None:
        """Simulate DLL hijacking."""
        dll_paths = [
            "C:\\Windows\\System32\\crypt32.dll",
            "C:\\Windows\\System32\\ws2_32.dll",
            "C:\\Windows\\System32\\user32.dll",
            "C:\\Windows\\System32\\advapi32.dll",
        ]
        
        for dll_path in dll_paths:
            self.emit_file_operation("load", dll_path, technique="T1574")
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "dll_hijacking",
                    {"dll_path": dll_path},
                    technique="T1574",
                    tactic="Persistence",
                    risk_score=60
                )
            time.sleep(0.1)

    def _simulate_process_spoofing(self) -> None:
        """Simulate process spoofing."""
        spoof_targets = ["svchost", "rundll32", "dllhost"]
        
        for target in spoof_targets:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "process_spoofing",
                    {"spoofed_as": target},
                    technique="T1036",
                    tactic="DefenseEvasion"
                )
            time.sleep(0.15)

    def _simulate_process_injection(self) -> None:
        """Simulate process injection."""
        injection_methods = ["APC_Injection", "Process_Hollowing", "CreateRemoteThread", "SetThreadContext"]
        
        for method in injection_methods:
            if self._logger:
                self._logger.emit_suspicious_behavior(
                    "process_injection",
                    {"method": method},
                    technique="T1055",
                    tactic="DefenseEvasion",
                    risk_score=70
                )
            time.sleep(0.15)

    def _drop_payload_files(self) -> None:
        """Drop payload files."""
        payload_names = ["update.exe", "install.dll", "helper.exe", "runtime.exe", "service.dll"]
        
        for payload in payload_names:
            payload_path = os.path.join(self._staging_dir, payload)
            try:
                with open(payload_path, "wb") as f:
                    f.write(os.urandom(2048))
                self.emit_file_operation("create", payload_path, technique="T1105")
                self._payload_count += 1
                
                if self._logger:
                    self._logger.emit_suspicious_behavior(
                        "payload_drop",
                        {"file": payload, "size": 2048},
                        technique="T1105",
                        tactic="Persistence",
                        risk_score=65
                    )
            except Exception:
                pass
            time.sleep(0.1)

    def _spawn_suspicious_child_processes(self) -> None:
        """Spawn suspicious child processes."""
        for i in range(8):
            child_process = random.choice(self.SUSPICIOUS_CHILD_PROCESSES)
            
            if self._logger:
                self._logger.emit_process_spawn(child_process)
                self._logger.emit_suspicious_behavior(
                    "suspicious_child_process",
                    {"child_process": child_process},
                    technique="T1059",
                    tactic="Execution",
                    risk_score=55
                )
            time.sleep(0.2)

    def _simulate_command_execution(self) -> None:
        """Simulate command execution."""
        commands = [
            "reg add HKCU\\Software\\Microsoft\\Windows",
            "powershell -enc <encoded>",
            "cmd /c whoami",
            "net user",
            "schtasks /create",
        ]
        
        for cmd in commands:
            if self._logger:
                self._logger.emit_encoded_command(cmd, technique="T1059.001")
            time.sleep(0.15)

    def _c2_check_in(self) -> None:
        """Simulate C2 check-in."""
        c2_endpoints = [("127.0.0.1", 4444), ("127.0.0.1", 5555), ("127.0.0.1", 6666)]
        
        for i, (host, port) in enumerate(c2_endpoints):
            self.emit_network_activity(host, port, technique="T1071")
            if self._logger:
                self._logger.emit_beacon(host, port, i + 1, interval_seconds=60, technique="T1071")
            time.sleep(0.3)

    def _simulate_lateral_movement(self) -> None:
        """Simulate lateral movement."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "lateral_movement_attempt",
                {"targets": 3},
                technique="T1021",
                tactic="LateralMovement",
                risk_score=75
            )
        
        for i in range(3):
            self.emit_network_activity("127.0.0.1", random.choice([445, 3389, 22]), technique="T1021")
            time.sleep(0.2)

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
                    risk_score=70
                )
            time.sleep(0.1)

    def _simulate_trace_removal(self) -> None:
        """Remove traces."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "trace_removal",
                {"actions": ["clear_logs", "remove_temp"]},
                technique="T1070",
                tactic="DefenseEvasion",
                risk_score=40
            )
        
        for file in os.listdir(self._staging_dir)[:3]:
            file_path = os.path.join(self._staging_dir, file)
            try:
                self.emit_file_operation("delete", file_path, technique="T1070")
            except Exception:
                pass

    def _finalize(self) -> None:
        """Finalize."""
        if self._logger:
            self._logger.emit_suspicious_behavior(
                "simulation_complete",
                {"payloads_staged": self._payload_count, "campaign_id": self._campaign_id},
                technique="T1071",
                tactic="CommandAndControl",
                risk_score=50
            )


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
        max_runtime_seconds=120,
        behavior_intensity="high",
        requires_isolation=True,
    )

    runtime = TrojanSimulatorRuntime(manifest)
    sys.exit(runtime.validate_and_run())


if __name__ == "__main__":
    main()