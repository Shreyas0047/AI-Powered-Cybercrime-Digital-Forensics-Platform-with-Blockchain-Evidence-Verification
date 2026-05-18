"""VM Telemetry Poller - background thread for real-time VM telemetry collection.

Polls the VirtualBox guest VM every N seconds via VBoxManage guestcontrol commands,
extracting process, network, and file system activity, then feeding events into
the ForensicMonitoringCoordinator.
"""

from __future__ import annotations

import csv
import io
import logging
import re
import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional, Callable

from forensics_sandbox_agent.app.config.monitoring_models import VmPollingConfig
from forensics_sandbox_agent.infrastructure.monitoring.monitoring_coordinator import (
    ForensicMonitoringCoordinator,
)
from forensics_sandbox_agent.infrastructure.vm.vbox_communication import VBoxManage


@dataclass
class ProcessSnapshot:
    """Snapshot of a process at a point in time."""
    pid: int
    name: str
    session: str
    username: str
    cpu_time: str
    window_title: str


@dataclass
class NetworkSnapshot:
    """Snapshot of a network connection at a point in time."""
    protocol: str
    local_address: str
    foreign_address: str
    state: str
    pid: int


@dataclass
class FileSnapshot:
    """Snapshot of a file at a point in time."""
    path: str
    size: int
    modified_time: str


class VmTelemetryPoller:
    """Background-thread VM telemetry poller."""

    def __init__(
        self,
        vbox: VBoxManage,
        vm_name: str,
        coordinator: ForensicMonitoringCoordinator,
        config: VmPollingConfig,
        simulator_id: str,
        logger: logging.Logger,
    ) -> None:
        self._vbox = vbox
        self._vm_name = vm_name
        self._coordinator = coordinator
        self._config = config
        self._simulator_id = simulator_id
        self._logger = logger

        self._stop_event = threading.Event()
        self._polling_thread: Optional[threading.Thread] = None

        self._prev_processes: dict[int, ProcessSnapshot] = {}
        self._prev_network: dict[str, NetworkSnapshot] = {}
        self._prev_files: dict[str, FileSnapshot] = {}

        self._process_ppid_cache: dict[int, Optional[int]] = {}

        self._polls_completed = 0
        self._start_time: Optional[float] = None

    def start(self) -> None:
        """Start the background polling thread."""
        if self._polling_thread is not None and self._polling_thread.is_alive():
            self._logger.warning("Poller already running")
            return

        self._stop_event.clear()
        self._polls_completed = 0
        self._start_time = time.time()

        self._logger.info(
            f"Starting VM telemetry poller: vm={self._vm_name}, "
            f"interval={self._config.poll_interval_seconds}s, "
            f"max_duration={self._config.max_poll_duration_seconds}s"
        )

        self._polling_thread = threading.Thread(
            target=self._poll_loop,
            name=f"VmTelemetryPoller-{self._simulator_id}",
            daemon=True,
        )
        self._polling_thread.start()

    def stop(self) -> None:
        """Stop the polling thread gracefully."""
        self._logger.info("Stopping VM telemetry poller")
        self._stop_event.set()

        if self._polling_thread is not None and self._polling_thread.is_alive():
            self._polling_thread.join(timeout=10.0)
            self._polling_thread = None

        self._logger.info(
            f"VM telemetry poller stopped: {self._polls_completed} polls in "
            f"{time.time() - (self._start_time or 0):.1f}s"
        )

    def _poll_loop(self) -> None:
        """Main polling loop running in background thread."""
        self._logger.info("VM telemetry polling loop started")

        while not self._stop_event.is_set():
            if self._config.max_poll_duration_seconds > 0:
                elapsed = time.time() - (self._start_time or time.time())
                if elapsed >= self._config.max_poll_duration_seconds:
                    self._logger.info(f"Max poll duration reached ({elapsed:.1f}s), stopping")
                    break

            poll_start = time.time()
            poll_issues = []

            try:
                if self._config.track_processes:
                    try:
                        self._poll_processes()
                    except Exception as e:
                        poll_issues.append(f"process poll: {e}")
                        self._logger.debug(f"Process poll failed: {e}")

                if self._config.track_network:
                    try:
                        self._poll_network()
                    except Exception as e:
                        poll_issues.append(f"network poll: {e}")
                        self._logger.debug(f"Network poll failed: {e}")

                if self._config.track_files:
                    try:
                        self._poll_files()
                    except Exception as e:
                        poll_issues.append(f"file poll: {e}")
                        self._logger.debug(f"File poll failed: {e}")

                self._polls_completed += 1

                if self._polls_completed % 10 == 0:
                    self._logger.debug(
                        f"Poller status: poll #{self._polls_completed}, "
                        f"elapsed={time.time() - (self._start_time or 0):.1f}s"
                    )

            except Exception as e:
                self._logger.warning(f"Poll cycle error: {e}")

            elapsed = time.time() - poll_start
            interval = self._config.poll_interval_seconds
            sleep_time = max(0.1, interval - elapsed)

            self._stop_event.wait(timeout=sleep_time)

        self._logger.info("VM telemetry polling loop ended")

    def _vm_exec(
        self,
        command: str,
        timeout: float = 15.0,
    ) -> Optional[str]:
        """Execute a command inside the VM guest via VBoxManage.

        Returns stdout on success, None on failure.
        """
        try:
            exit_code, stdout, stderr = self._vbox.guest_control_exec(
                self._vm_name,
                r"C:\Windows\System32\cmd.exe",
                ["/c", command],
                timeout=int(timeout),
            )
            if exit_code == 0:
                return stdout
            self._logger.debug(f"VM command failed (exit {exit_code}): {stderr[:200]}")
            return None
        except Exception as e:
            self._logger.debug(f"VM exec error: {e}")
            return None

    def _poll_processes(self) -> None:
        """Poll running processes from the VM guest."""
        output = self._vm_exec('tasklist /FO CSV /V', timeout=20.0)
        if not output:
            return

        current: dict[int, ProcessSnapshot] = {}

        try:
            reader = csv.reader(io.StringIO(output))
            header = next(reader, None)
            if header is None:
                return

            for row in reader:
                if len(row) < 8:
                    continue
                name = row[0].strip().strip('"')
                pid_str = row[1].strip().strip('"')
                try:
                    pid = int(pid_str)
                except ValueError:
                    continue

                snapshot = ProcessSnapshot(
                    pid=pid,
                    name=name,
                    session=row[2].strip().strip('"') if len(row) > 2 else "",
                    username=row[5].strip().strip('"') if len(row) > 5 else "",
                    cpu_time=row[7].strip().strip('"') if len(row) > 7 else "",
                    window_title=row[8].strip().strip('"') if len(row) > 8 else "",
                )
                current[pid] = snapshot

        except Exception as e:
            self._logger.debug(f"Process list parse error: {e}")
            return

        new_pids = set(current.keys()) - set(self._prev_processes.keys())
        gone_pids = set(self._prev_processes.keys()) - set(current.keys())

        for pid in new_pids:
            snap = current[pid]
            ppid = self._get_parent_pid(snap.pid, snap.name)
            self._coordinator.record_process_start(
                pid=snap.pid,
                executable_path=snap.name,
                parent_pid=ppid,
                command_line="",
            )
            self._logger.debug(f"Process started: {snap.name} (PID={snap.pid}, PPID={ppid})")

        for pid in gone_pids:
            snap = self._prev_processes[pid]
            self._coordinator.record_process_terminate(pid=snap.pid, exit_code=0)
            self._logger.debug(f"Process terminated: {snap.name} (PID={snap.pid})")

        self._prev_processes = current

    def _get_parent_pid(self, pid: int, name: str) -> Optional[int]:
        """Get parent PID for a process via WMIC."""
        if pid in self._process_ppid_cache:
            return self._process_ppid_cache[pid]

        output = self._vm_exec(
            f'wmic path win32_process where processid={pid} get parentprocessid,commandline',
            timeout=10.0,
        )
        ppid = None
        if output:
            lines = [l.strip() for l in output.strip().split("\n") if l.strip()]
            for line in lines:
                parts = re.split(r"\s+", line)
                if len(parts) >= 2 and parts[0].isdigit():
                    try:
                        ppid = int(parts[1])
                        break
                    except (ValueError, IndexError):
                        pass

        self._process_ppid_cache[pid] = ppid
        return ppid

    def _poll_network(self) -> None:
        """Poll network connections from the VM guest."""
        output = self._vm_exec("netstat -ano", timeout=15.0)
        if not output:
            return

        current: dict[str, NetworkSnapshot] = {}

        for line in output.split("\n"):
            line = line.strip()
            if not line or line.startswith("Active Connections") or line.startswith("Proto"):
                continue

            parts = line.split()
            if len(parts) < 4:
                continue

            protocol = parts[0].upper()
            if protocol not in ("TCP", "UDP"):
                continue

            local_addr = parts[1]
            foreign_addr = parts[2]
            state_or_pid = parts[3]

            if protocol == "TCP":
                if len(parts) >= 5:
                    pid = int(parts[4])
                else:
                    try:
                        pid = int(state_or_pid)
                        state_or_pid = ""
                    except ValueError:
                        pid = 0
            else:
                pid = int(state_or_pid) if state_or_pid.isdigit() else 0

            state = state_or_pid if protocol == "TCP" else ""

            key = f"{protocol}:{local_addr}:{foreign_addr}:{state}:{pid}"
            snapshot = NetworkSnapshot(
                protocol=protocol,
                local_address=local_addr,
                foreign_address=foreign_addr,
                state=state,
                pid=pid,
            )
            current[key] = snapshot

        new_conns = set(current.keys()) - set(self._prev_network.keys())

        for key in new_conns:
            snap = current[key]
            if snap.protocol == "TCP":
                if snap.state.upper() == "LISTENING":
                    self._coordinator.record_listen(
                        port=self._extract_port(snap.local_address),
                        protocol="TCP",
                        source_pid=snap.pid or None,
                    )
                    self._logger.debug(
                        f"Port listening: {snap.local_address} (PID={snap.pid})"
                    )
                elif snap.state.upper() == "ESTABLISHED":
                    dest_ip, dest_port = self._parse_foreign_address(snap.foreign_address)
                    if dest_ip:
                        self._coordinator.record_network_connection(
                            destination_ip=dest_ip,
                            destination_port=dest_port,
                            protocol="TCP",
                            source_pid=snap.pid or None,
                        )
                        self._logger.debug(
                            f"Network connect: {dest_ip}:{dest_port} (PID={snap.pid})"
                        )
            elif snap.protocol == "UDP":
                dest_ip, dest_port = self._parse_foreign_address(snap.foreign_address)
                if dest_ip and dest_port:
                    self._coordinator.record_network_connection(
                        destination_ip=dest_ip,
                        destination_port=dest_port,
                        protocol="UDP",
                        source_pid=snap.pid or None,
                    )

        self._prev_network = current

    def _poll_files(self) -> None:
        """Poll file system for changes in monitored directories."""
        for directory in self._config.poll_directories:
            output = self._vm_exec(
                f'dir /s /b "{directory}" 2>nul',
                timeout=20.0,
            )
            if not output:
                continue

            current_files: dict[str, FileSnapshot] = {}

            for line in output.split("\n"):
                line = line.strip()
                if not line or line.startswith(" Volume ") or line.startswith(" Directory of"):
                    continue

                if re.match(r"^\s*Directory of", line):
                    continue

                file_match = re.match(
                    r"(.+)\\([^\\]+)$",
                    line.replace("/", "\\"),
                )
                if not file_match:
                    continue

                dir_path = file_match.group(1)
                filename = file_match.group(2)

                full_path = f"{dir_path}\\{filename}"

                stat_output = self._vm_exec(
                    f'cmd /c "for %A in ("{full_path}") do @echo %~zA"',
                    timeout=5.0,
                )
                size = 0
                if stat_output:
                    try:
                        size = int(stat_output.strip())
                    except ValueError:
                        pass

                current_files[full_path.lower()] = FileSnapshot(
                    path=full_path,
                    size=size,
                    modified_time="",
                )

            prev_files = {
                k: v for k, v in self._prev_files.items()
                if not any(k.startswith(d.lower().replace("\\", "_")) for d in self._config.poll_directories)
            }
            prev_files.update(self._prev_files)

            new_files = set(current_files.keys()) - set(prev_files.keys())
            gone_files = set(prev_files.keys()) - set(current_files.keys())

            for fp in new_files:
                snap = current_files[fp]
                self._coordinator.record_file_create(
                    file_path=snap.path,
                    file_size=snap.size,
                )
                self._logger.debug(f"File created: {snap.path} ({snap.size} bytes)")

            for fp in gone_files:
                snap = prev_files[fp]
                self._coordinator.record_file_delete(file_path=snap.path)
                self._logger.debug(f"File deleted: {snap.path}")

            for fp in set(current_files.keys()) & set(prev_files.keys()):
                curr = current_files[fp]
                prev = prev_files[fp]
                if curr.size != prev.size:
                    self._coordinator.record_file_modify(
                        file_path=curr.path,
                        file_size=curr.size,
                    )
                    self._logger.debug(f"File modified: {curr.path} ({prev.size} -> {curr.size} bytes)")

            for fp in new_files:
                self._prev_files[fp] = current_files[fp]

            for fp in gone_files:
                if fp in self._prev_files:
                    del self._prev_files[fp]

    def _extract_port(self, address: str) -> Optional[int]:
        """Extract port from address string like '0.0.0.0:8080' or '[::]:443'."""
        if ":" in address:
            parts = address.rsplit(":", 1)
            try:
                return int(parts[-1])
            except ValueError:
                pass
        return None

    def _parse_foreign_address(self, foreign: str) -> tuple[Optional[str], Optional[int]]:
        """Parse foreign address into (IP, port)."""
        if foreign == "*:*":
            return None, None
        if ":" in foreign:
            ip_part, port_part = foreign.rsplit(":", 1)
            try:
                return ip_part, int(port_part)
            except ValueError:
                return ip_part, None
        return foreign, None

    @property
    def polls_completed(self) -> int:
        """Number of poll cycles completed."""
        return self._polls_completed