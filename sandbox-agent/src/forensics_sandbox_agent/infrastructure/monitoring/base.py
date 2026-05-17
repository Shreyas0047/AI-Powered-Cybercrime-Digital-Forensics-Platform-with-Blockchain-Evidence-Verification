"""Monitoring contracts and placeholders.

No evidence collection logic is implemented here yet. The module exists so the
agent architecture can depend on stable interfaces before collectors are added.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class MonitorDescriptor:
    """Describes one monitor type that can participate in a session."""

    name: str
    enabled: bool
    category: str


class MonitoringCoordinator:
    """Placeholder coordination surface for future monitor lifecycle control."""

    def start(self) -> None:
        raise NotImplementedError("Monitoring implementation is deferred in this phase.")

    def stop(self) -> None:
        raise NotImplementedError("Monitoring implementation is deferred in this phase.")
