"""Tests for VBoxManage guest-control command construction."""

from __future__ import annotations

import logging
import subprocess

from forensics_sandbox_agent.infrastructure.vm.vbox_communication import VBoxManage


def _make_vbox(monkeypatch):
    vbox = object.__new__(VBoxManage)
    vbox._logger = logging.getLogger("test.vbox")
    vbox._timeout = 30
    vbox._available = True
    vbox._vboxmanage_path = "VBoxManage"
    vbox._guest_username = "guestuser"
    vbox._guest_password = "guest"

    calls = []

    def fake_execute(args, timeout=None, capture_output=True):
        calls.append((args, timeout, capture_output))
        return subprocess.CompletedProcess(args=args, returncode=0, stdout="ok", stderr="")

    monkeypatch.setattr(vbox, "_execute_command", fake_execute)
    return vbox, calls


def test_guest_control_exec_uses_exe_timeout_cwd_and_environment(monkeypatch):
    vbox, calls = _make_vbox(monkeypatch)

    exit_code, stdout, stderr = vbox.guest_control_exec(
        "ForensicsSandbox",
        r"C:\Windows\System32\cmd.exe",
        ["/c", "echo ready"],
        timeout=5,
        cwd=r"C:\sandbox",
        environment={"TEMP": r"C:\sandbox\tmp"},
    )

    args, timeout, _ = calls[0]
    assert exit_code == 0
    assert stdout == "ok"
    assert stderr == ""
    assert args[:3] == ["guestcontrol", "ForensicsSandbox", "run"]
    assert "--exe" in args
    assert r"C:\Windows\System32\cmd.exe" in args
    assert "--wait-stdout" in args
    assert "--wait-stderr" in args
    assert "--timeout=5000" in args
    assert r"--cwd=C:\sandbox" in args
    assert r"--putenv=TEMP=C:\sandbox\tmp" in args
    assert args[-3:] == ["--", "/c", "echo ready"]
    assert timeout == 15.0


def test_guest_control_start_is_detached(monkeypatch):
    vbox, calls = _make_vbox(monkeypatch)

    vbox.guest_control_start(
        "ForensicsSandbox",
        r"C:\sandbox\simulators\ransomware-simulator.exe",
        timeout=30,
        cwd=r"C:\sandbox\simulators",
    )

    args, timeout, _ = calls[0]
    assert args[:3] == ["guestcontrol", "ForensicsSandbox", "start"]
    assert "--exe" in args
    assert "--wait-stdout" not in args
    assert "--wait-stderr" not in args
    assert r"--cwd=C:\sandbox\simulators" in args
    assert timeout == 40.0


def test_copy_to_guest_uses_direct_destination_without_separator(monkeypatch):
    vbox, calls = _make_vbox(monkeypatch)

    vbox.file_copy_to_guest(
        "ForensicsSandbox",
        r"C:\host\threat_file_1.exe",
        "C:/sandbox/simulators/threat_file_1.exe",
    )

    args, _, _ = calls[0]
    assert args[:3] == ["guestcontrol", "ForensicsSandbox", "copyto"]
    assert "--" not in args
    assert "--target-directory=C:/sandbox/simulators" not in args
    assert args[-2:] == [
        r"C:\host\threat_file_1.exe",
        "C:/sandbox/simulators/threat_file_1.exe",
    ]


def test_guest_remove_file_uses_windows_guest_path(monkeypatch):
    vbox, calls = _make_vbox(monkeypatch)

    vbox.guest_remove_file("ForensicsSandbox", "C:/sandbox/simulators/ransomware-simulator.exe")

    args, _, _ = calls[0]
    assert args[:3] == ["guestcontrol", "ForensicsSandbox", "rm"]
    assert "--force" in args
    assert args[-1] == r"C:\sandbox\simulators\ransomware-simulator.exe"
