"""View model and navigation state for the main window."""

from __future__ import annotations

from forensics_sandbox_agent.app.bootstrap.runtime import ApplicationRuntime
from forensics_sandbox_agent.app.presentation.qt.navigation import NavigationItem


class MainWindowViewModel:
    """Owns shell-level view state independent of the widgets."""

    def __init__(self, runtime: ApplicationRuntime) -> None:
        self._runtime = runtime
        self._navigation_items = [
            NavigationItem("dashboard", "Dashboard", "SOC-style overview for forensic operations.", "[D]"),
            NavigationItem("sandbox-control", "Sandbox Control", "Controlled simulator execution workspace.", "[S]"),
            NavigationItem("monitoring", "Monitoring", "Collector health, session feeds, and trace lanes.", "[M]"),
            NavigationItem("reports", "Reports", "Structured export packages and report summaries.", "[R]"),
            NavigationItem("evidence", "Evidence", "Digital artifacts, chain-of-custody, and attachments.", "[E]"),
            NavigationItem("simulator-manager", "Simulator Manager", "Manifest-driven simulator catalog and policy views.", "[C]"),
            NavigationItem("settings", "Settings", "Environment, VM, export, and operator preferences.", "[O]"),
            NavigationItem("logs", "Logs", "Operational runtime logs and diagnostic traces.", "[L]"),
        ]
        self._current_route = "dashboard"

    @property
    def window_title(self) -> str:
        app = self._runtime.settings.application
        return f"{app.name} {app.version}"

    @property
    def navigation_items(self) -> list[NavigationItem]:
        return self._navigation_items

    @property
    def current_route(self) -> str:
        return self._current_route

    @property
    def current_item(self) -> NavigationItem:
        return next(item for item in self._navigation_items if item.route == self._current_route)

    def set_current_route(self, route: str) -> None:
        if route not in {item.route for item in self._navigation_items}:
            raise ValueError(f"Unknown route: {route}")
        self._current_route = route

    def index_for_route(self, route: str) -> int:
        for index, item in enumerate(self._navigation_items):
            if item.route == route:
                return index
        raise ValueError(f"Unknown route: {route}")
