# -*- mode: python ; coding: utf-8 -*-
"""
Trojan Simulator - PyInstaller Specification
Safe educational simulator executable packaging.
"""

import os
import sys
from pathlib import Path

block_cipher = None

root_dir = Path(SPECPATH).parents[3]
simulator_src = root_dir / 'simulators' / 'trojan-simulator' / 'src'
common_src = root_dir / 'simulators' / 'common' / 'src'

a = Analysis(
    [str(simulator_src / 'trojan_simulator' / 'runtime.py')],
    pathex=[
        str(root_dir / 'simulators' / 'trojan-simulator' / 'src'),
        str(common_src),
    ],
    binaries=[],
    datas=[],
    hiddenimports=[
        'forensics_simulator_common.contracts.manifest',
        'forensics_simulator_common.safety.guardrails',
        'forensics_simulator_common.telemetry.events',
        'forensics_simulator_common.runtime.base',
        'trojan_simulator.runtime',
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
    name='TrojanSimulator',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
    product_name='Trojan Simulator',
    product_version='1.0.0',
    company_name='Forensics Project',
    file_description='Educational Trojan Behavior Simulator',
    copyright='Safe Educational Tool',
)
