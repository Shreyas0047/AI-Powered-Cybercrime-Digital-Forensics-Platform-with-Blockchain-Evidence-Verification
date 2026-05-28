#!/usr/bin/env python3
"""
Build script for Forensics Sandbox Agent and Simulators.
Provides command-line build, validation, and packaging operations.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Optional


class BuildSystem:
    """Enterprise-grade build system for forensics platform."""

    def __init__(self, root_dir: Path):
        self.root_dir = root_dir
        self.build_dir = root_dir / "build"
        self.dist_dir = root_dir / "dist"
        self.sandbox_agent_dir = root_dir / "sandbox-agent"
        self.simulators_dir = root_dir / "simulators"

    def clean(self) -> None:
        """Clean build artifacts."""
        print("Cleaning build artifacts...")

        dirs_to_clean = [
            self.build_dir,
            self.dist_dir,
            self.sandbox_agent_dir / "build",
            self.sandbox_agent_dir / "dist",
        ]

        for sim_dir in self.simulators_dir.iterdir():
            if sim_dir.is_dir():
                dirs_to_clean.extend([
                    sim_dir / "build",
                    sim_dir / "dist",
                ])

        for dir_path in dirs_to_clean:
            if dir_path.exists():
                shutil.rmtree(dir_path)
                print(f"  Removed: {dir_path}")

        print("Clean complete.")

    def build_agent(
        self,
        one_file: bool = True,
        windowed: bool = True,
    ) -> bool:
        """Build the main sandbox agent executable."""
        print("Building ForensicsSandboxAgent...")

        spec_file = self.sandbox_agent_dir / "packaging" / "pyinstaller" / "agent.spec"

        if not spec_file.exists():
            print(f"Error: Spec file not found: {spec_file}")
            return False

        try:
            cmd = [
                sys.executable, "-m", "PyInstaller",
                str(spec_file),
                "--distpath", str(self.dist_dir / "sandbox-agent"),
                "--workpath", str(self.build_dir / "sandbox-agent"),
            ]

            print(f"Running: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode == 0:
                print("Agent build successful!")

                config_src = self.sandbox_agent_dir / "config"
                config_dst = self.dist_dir / "sandbox-agent" / "config"
                if config_src.exists():
                    shutil.copytree(config_src, config_dst, dirs_exist_ok=True)
                    print(f"  Copied config to: {config_dst}")

                return True
            else:
                print(f"Build failed: {result.stderr}")
                return False

        except Exception as e:
            print(f"Build error: {e}")
            return False

    def build_simulator(self, simulator_name: str) -> bool:
        """Build a single simulator executable."""
        print(f"Building {simulator_name}...")

        simulator_dir = self.simulators_dir / simulator_name

        if not simulator_dir.exists():
            print(f"Error: Simulator directory not found: {simulator_dir}")
            return False

        spec_file = simulator_dir / "packaging" / "pyinstaller" / "simulator.spec"

        if not spec_file.exists():
            print(f"Warning: Spec file not found: {spec_file}")
            return False

        try:
            cmd = [
                sys.executable, "-m", "PyInstaller",
                str(spec_file),
                "--distpath", str(self.dist_dir / "simulators"),
                "--workpath", str(self.build_dir / "simulators" / simulator_name),
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)

            if result.returncode == 0:
                print(f"{simulator_name} build successful!")
                return True
            else:
                print(f"Build failed: {result.stderr}")
                return False

        except Exception as e:
            print(f"Build error: {e}")
            return False

    def build_all_simulators(self) -> bool:
        """Build all simulator executables."""
        simulators = [
            "ransomware-simulator",
            "spyware-simulator",
            "trojan-simulator",
            "botnet-simulator",
            "credential-stealer-simulator",
        ]

        success = True
        for sim in simulators:
            if not self.build_simulator(sim):
                success = False

        return success

    def build_all(self) -> bool:
        """Build everything."""
        print("=" * 60)
        print("Building Complete Forensics Platform")
        print("=" * 60)

        self.clean()

        print("\n[1/2] Building sandbox agent...")
        if not self.build_agent():
            print("Agent build failed!")
            return False

        print("\n[2/2] Building simulators...")
        if not self.build_all_simulators():
            print("Simulator build failed!")
            return False

        print("\n" + "=" * 60)
        print("BUILD COMPLETE")
        print("=" * 60)
        print(f"\nOutput directory: {self.dist_dir}")
        return True

    def validate_build(self) -> dict:
        """Validate built executables exist and are executable."""
        validation = {
            "agent": False,
            "simulators": {},
            "all_valid": False,
        }

        agent_exe = self.dist_dir / "sandbox-agent" / "ForensicsSandboxAgent.exe"
        validation["agent"] = agent_exe.exists()

        simulators_dir = self.dist_dir / "simulators"
        if simulators_dir.exists():
            # Must match SIMULATOR_REGISTRY in domain/simulator_mapping.py
            for sim in ["system_service_1.exe", "system_monitor.exe",
                        "update_service.exe", "runtime_helper.exe",
                        "windows_patch.exe"]:
                exe_path = simulators_dir / sim
                validation["simulators"][sim] = exe_path.exists()

        validation["all_valid"] = all(validation["simulators"].values()) and validation["agent"]
        return validation


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Forensics Platform Build System"
    )
    parser.add_argument(
        "command",
        choices=["all", "agent", "simulator", "clean", "validate"],
        help="Build command to execute"
    )
    parser.add_argument(
        "--simulator",
        help="Specific simulator to build (for 'simulator' command)"
    )

    args = parser.parse_args()

    root = Path(__file__).parent
    builder = BuildSystem(root)

    if args.command == "all":
        success = builder.build_all()
    elif args.command == "agent":
        success = builder.build_agent()
    elif args.command == "simulator":
        if args.simulator:
            success = builder.build_simulator(args.simulator)
        else:
            success = builder.build_all_simulators()
    elif args.command == "clean":
        builder.clean()
        success = True
    elif args.command == "validate":
        validation = builder.validate_build()
        print("Build Validation Results:")
        print(f"  Agent: {'OK' if validation['agent'] else 'FAIL'}")
        for name, exists in validation["simulators"].items():
            print(f"  {name}: {'OK' if exists else 'FAIL'}")
        print(f"\nAll Valid: {'Yes' if validation['all_valid'] else 'No'}")
        success = True
    else:
        success = False

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()