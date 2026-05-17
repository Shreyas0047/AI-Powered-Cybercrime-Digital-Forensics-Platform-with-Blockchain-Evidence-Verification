# -*- mode: python ; coding: utf-8 -*-
"""
Forensics Sandbox Agent - PyInstaller Specification
Production-grade executable packaging for the desktop sandbox application.
"""

import os
import sys
from pathlib import Path

block_cipher = None

root_dir = Path(SPECPATH).parents[2]
sandbox_src = root_dir / 'sandbox-agent' / 'src'

# Collect all packages from the sandbox agent
a = Analysis(
    [str(sandbox_src / 'forensics_sandbox_agent' / 'main.py')],
    pathex=[str(root_dir / 'sandbox-agent' / 'src')],
    binaries=[],
    datas=[
        (str(root_dir / 'sandbox-agent' / 'config'), 'config'),
        (str(root_dir / 'sandbox-agent' / 'src' / 'forensics_sandbox_agent' / 'app' / 'presentation' / 'qt' / 'theme'),
         'forensics_sandbox_agent/app/presentation/qt/theme'),
    ],
    hiddenimports=[
        'forensics_sandbox_agent',
        'forensics_sandbox_agent.app.bootstrap.app_factory',
        'forensics_sandbox_agent.app.config.loader',
        'forensics_sandbox_agent.app.config.models',
        'forensics_sandbox_agent.app.logging.logger',
        'forensics_sandbox_agent.app.services.service_registry',
        'forensics_sandbox_agent.app.presentation.qt.application',
        'forensics_sandbox_agent.app.presentation.qt.widgets.dashboard_page',
        'forensics_sandbox_agent.app.presentation.qt.widgets.sandbox_control_page',
        'forensics_sandbox_agent.app.presentation.qt.widgets.monitoring_page',
        'forensics_sandbox_agent.infrastructure.vm.virtualbox_service',
        'forensics_sandbox_agent.infrastructure.vm.vm_controller',
        'forensics_sandbox_agent.infrastructure.vm.snapshot_manager',
        'forensics_sandbox_agent.infrastructure.execution.session_orchestrator',
        'forensics_sandbox_agent.infrastructure.execution.sandbox_execution_manager',
        'forensics_sandbox_agent.infrastructure.monitoring.monitoring_coordinator',
        'forensics_sandbox_agent.infrastructure.monitoring.event_pipeline',
        'forensics_sandbox_agent.infrastructure.reporting.threat_classifier',
        'forensics_sandbox_agent.infrastructure.reporting.severity_engine',
        'forensics_sandbox_agent.infrastructure.reporting.event_correlator',
        'forensics_sandbox_agent.infrastructure.reporting.evidence_packager',
        'forensics_sandbox_agent.infrastructure.simulator_catalog',
        'forensics_sandbox_agent.domain.entities.forensic_session',
        'forensics_sandbox_agent.domain.entities.simulator_descriptor',
        'forensics_sandbox_agent.domain.contracts.execution',
        'PyQt6',
        'PyQt6.QtCore',
        'PyQt6.QtGui',
        'PyQt6.QtWidgets',
        'yaml',
        'psutil',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='ForensicsSandboxAgent',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
    product_name='Forensics Sandbox Agent',
    product_version='0.1.0',
    company_name='Forensics Project',
    file_description='AI-Powered Cybercrime Digital Forensics Platform',
    copyright='Educational Cybersecurity Platform',
)