"""Simulator catalog - manages available simulators."""

from __future__ import annotations

import logging
import os
import json
from copy import deepcopy
from pathlib import Path
from typing import Optional

import yaml

from forensics_sandbox_agent.domain.entities.simulator_descriptor import SimulatorDescriptor
from forensics_sandbox_agent.domain.simulator_mapping import (
    SIMULATOR_REGISTRY,
    get_generic_name,
    get_display_name,
    get_executable_name,
)


class SimulatorCatalog:
    """Manages the collection of available simulators."""

    DEFAULT_SIMULATORS: list[SimulatorDescriptor] = [
        SimulatorDescriptor(
            id=entry["id"],
            display_name=entry["display_name"],
            version="1.0.0",
            description=entry["description"],
            category=entry["behavioral_profile"],
            executable_path="",
            is_safe=True,
            requires_isolation=True,
            timeout_seconds=entry["timeout_seconds"],
        )
        for entry in SIMULATOR_REGISTRY
    ]

    def __init__(
        self,
        logger: logging.Logger,
        catalog_path: Optional[Path] = None,
        demo_mode: bool = False,
    ) -> None:
        self._logger = logger
        self._catalog_path = catalog_path
        self._demo_mode = demo_mode
        self._simulators: list[SimulatorDescriptor] = []
        self._load_catalog()

    @property
    def is_demo_mode(self) -> bool:
        """Check if running in demo mode."""
        return self._demo_mode

    def enable_demo_mode(self) -> None:
        """Enable demo mode for presentations."""
        self._demo_mode = True
        self._logger.info("Demo mode enabled")

    def disable_demo_mode(self) -> None:
        """Disable demo mode."""
        self._demo_mode = False
        self._logger.info("Demo mode disabled")

    def _load_catalog(self) -> None:
        """Load simulator catalog."""
        if self._catalog_path and self._catalog_path.exists():
            self._logger.info(f"Loading simulator catalog from: {self._catalog_path}")
            self._simulators = self._load_catalog_path(self._catalog_path)
            if not self._simulators:
                self._logger.warning("Simulator catalog path had no manifests; using built-in defaults")
                self._simulators = deepcopy(self.DEFAULT_SIMULATORS)
        else:
            self._logger.info("Using default simulator catalog")
            self._simulators = deepcopy(self.DEFAULT_SIMULATORS)

        self._resolve_executable_paths()

    def _load_catalog_path(self, catalog_path: Path) -> list[SimulatorDescriptor]:
        """Load simulator descriptors from a manifest file or directory."""
        manifest_paths: list[Path]
        if catalog_path.is_file():
            manifest_paths = [catalog_path]
        else:
            manifest_paths = [
                *catalog_path.glob("*.json"),
                *catalog_path.glob("*.yaml"),
                *catalog_path.glob("*.yml"),
                *catalog_path.glob("*/manifest.json"),
                *catalog_path.glob("*/manifest.yaml"),
                *catalog_path.glob("*/manifest.yml"),
            ]

        descriptors: list[SimulatorDescriptor] = []
        for manifest_path in manifest_paths:
            try:
                payload = self._read_manifest(manifest_path)
                if isinstance(payload, dict) and "simulators" in payload:
                    rows = payload["simulators"]
                else:
                    rows = [payload]

                for row in rows:
                    if isinstance(row, dict):
                        descriptors.append(
                            SimulatorDescriptor.from_manifest(row, base_path=manifest_path.parent)
                        )
            except Exception as exc:
                self._logger.warning("Failed to load simulator manifest %s: %s", manifest_path, exc)

        return descriptors

    def _read_manifest(self, manifest_path: Path) -> dict:
        """Read a JSON or YAML simulator manifest."""
        text = manifest_path.read_text(encoding="utf-8")
        if manifest_path.suffix.lower() == ".json":
            return json.loads(text)
        return yaml.safe_load(text)

    def _resolve_executable_paths(self) -> None:
        """Resolve executable paths for simulators using generic names."""
        dist_path = self._project_root() / "dist" / "simulators"

        def _try_resolve(sim: SimulatorDescriptor, base: Path) -> Optional[str]:
            generic_name = get_generic_name(sim.id)
            if generic_name:
                exe_name = get_executable_name(generic_name)
                if exe_name:
                    candidate = base / exe_name
                    if candidate.exists():
                        return str(candidate)
            return None

        if dist_path.exists():
            for sim in self._simulators:
                result = _try_resolve(sim, dist_path)
                if result:
                    sim.executable_path = result
                    sim.metadata["packaged_executable"] = result
                    sim.metadata["generic_name"] = get_generic_name(sim.id)
                    self._logger.debug(f"Found simulator executable: {Path(result).name}")

        # Also check environment variable for custom path
        custom_path = os.environ.get("SIMULATOR_PATH")
        if custom_path and Path(custom_path).exists():
            for sim in self._simulators:
                custom = Path(custom_path)
                if custom.is_dir():
                    result = _try_resolve(sim, custom)
                    if result:
                        sim.executable_path = result
                elif custom.is_file():
                    sim.executable_path = str(custom)

    def _project_root(self) -> Path:
        """Resolve the workspace root regardless of editable-install state."""
        import sys
        if getattr(sys, 'frozen', False):
            exe_dir = Path(sys.executable).parent
            for parent in [exe_dir] + list(exe_dir.parents):
                if (parent / "dist").exists() and (parent / "simulators").exists():
                    return parent
            return exe_dir
        current = Path(__file__).resolve()
        for parent in current.parents:
            if (parent / "dist").exists() and (parent / "simulators").exists():
                return parent
        return current.parents[4]

    def get_all_simulators(self) -> list[SimulatorDescriptor]:
        """Get all available simulators."""
        return self._simulators.copy()

    def list_simulators(self) -> list[SimulatorDescriptor]:
        """List all configured simulators (backward-compatible API)."""
        return self.get_all_simulators()

    def get_available_simulators(self, require_executable: bool = False) -> list[SimulatorDescriptor]:
        """Get simulators available to the UI.

        By default this returns the visible catalog. Pass require_executable=True
        when an execution path must already be resolved.
        """
        if not require_executable:
            return self.get_all_simulators()
        return [s for s in self._simulators if s.executable_exists]

    def get_simulator(self, simulator_id: str) -> Optional[SimulatorDescriptor]:
        """Get a specific simulator by ID."""
        return next((s for s in self._simulators if s.id == simulator_id), None)

    def get_simulators_by_category(self, category: str) -> list[SimulatorDescriptor]:
        """Get all simulators in a category."""
        return [s for s in self._simulators if s.category == category]

    def get_demo_simulators(self) -> list[SimulatorDescriptor]:
        """Get simulators suitable for demo mode (with resolved paths)."""
        return [s for s in self._simulators if s.executable_path]

    def refresh_catalog(self) -> None:
        """Refresh the simulator catalog."""
        self._load_catalog()
