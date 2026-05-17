"""View model for the simulator catalog management page."""

from __future__ import annotations

import logging
from datetime import datetime

from forensics_sandbox_agent.app.bootstrap.runtime import ApplicationRuntime
from forensics_sandbox_agent.domain.entities.simulator_descriptor import SimulatorDescriptor


class SimulatorManagerViewModel:
    """Loads simulator catalog data and exposes validation helpers."""

    def __init__(self, runtime: ApplicationRuntime) -> None:
        self._runtime = runtime
        self._logger = logging.getLogger("forensics_sandbox_agent.presentation.simulator_manager")
        self._simulators: list[SimulatorDescriptor] = []
        self._output = ""
        self.refresh_catalog()

    @property
    def simulators(self) -> list[SimulatorDescriptor]:
        """Return the current simulator list."""
        return self._simulators.copy()

    @property
    def output(self) -> str:
        """Return status output for the page."""
        return self._output

    def refresh_catalog(self) -> None:
        """Refresh the simulator catalog from configured sources."""
        try:
            catalog = self._runtime.services.simulator_catalog
            catalog.refresh_catalog()
            self._simulators = catalog.get_available_simulators()
            self.append_output(f"Loaded {len(self._simulators)} simulator definitions")
        except Exception as exc:
            self._logger.warning("Could not refresh simulator catalog: %s", exc)
            self.append_output(f"ERROR: {exc}")

    def validate_simulator(self, simulator: SimulatorDescriptor) -> dict:
        """Validate that a simulator has an executable ready for VM transfer."""
        result = {
            "id": simulator.id,
            "display_name": simulator.display_name,
            "executable_path": simulator.executable_path,
            "executable_exists": simulator.executable_exists,
            "is_safe": simulator.is_safe,
            "requires_isolation": simulator.requires_isolation,
        }

        if simulator.executable_exists:
            self.append_output(f"{simulator.display_name}: executable ready at {simulator.executable_path}")
        else:
            self.append_output(f"{simulator.display_name}: executable missing; rebuild simulators into dist/simulators")

        return result

    def clear_output(self) -> None:
        """Clear status output."""
        self._output = ""

    def append_output(self, text: str) -> None:
        """Append timestamped output text."""
        self._output += f"[{datetime.now().strftime('%H:%M:%S')}] {text}\n"
