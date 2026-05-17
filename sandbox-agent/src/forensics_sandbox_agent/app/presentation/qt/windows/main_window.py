"""Modern enterprise main window shell with premium cybersecurity aesthetics."""

from __future__ import annotations

from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QMainWindow,
    QScrollArea,
    QSizePolicy,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from forensics_sandbox_agent.app.presentation.qt.navigation import NavigationItem
from forensics_sandbox_agent.app.presentation.qt.theme.design_tokens import (
    DesignTokens,
)
from forensics_sandbox_agent.app.presentation.qt.viewmodels.main_window_view_model import (
    MainWindowViewModel,
)
from forensics_sandbox_agent.app.presentation.qt.viewmodels.dashboard_view_model import (
    DashboardViewModel,
)
from forensics_sandbox_agent.app.presentation.qt.viewmodels.sandbox_control_view_model import (
    SandboxControlViewModel,
)
from forensics_sandbox_agent.app.presentation.qt.viewmodels.monitoring_view_model import (
    MonitoringViewModel,
)
from forensics_sandbox_agent.app.presentation.qt.viewmodels.simulator_manager_view_model import (
    SimulatorManagerViewModel,
)
from forensics_sandbox_agent.app.presentation.qt.widgets.dashboard_page import (
    DashboardPage,
)
from forensics_sandbox_agent.app.presentation.qt.widgets.sandbox_control_page import (
    SandboxControlPage,
)
from forensics_sandbox_agent.app.presentation.qt.widgets.monitoring_page import (
    MonitoringPage,
)
from forensics_sandbox_agent.app.presentation.qt.widgets.simulator_manager_page import (
    SimulatorManagerPage,
)
from forensics_sandbox_agent.app.presentation.qt.widgets.placeholder_page import (
    PlaceholderPage,
)
from forensics_sandbox_agent.app.presentation.qt.widgets.sidebar_navigation import (
    SidebarNavigation,
)
from forensics_sandbox_agent.app.presentation.qt.widgets.top_bar import TopBar


class MainWindow(QMainWindow):
    """Premium enterprise window shell with modern cybersecurity aesthetics."""

    def __init__(self, view_model: MainWindowViewModel) -> None:
        super().__init__()
        self._view_model = view_model
        self._pages: dict[str, QWidget] = {}

        self.setWindowTitle(view_model.window_title)
        self.setMinimumSize(DesignTokens.WINDOW_MIN_WIDTH, DesignTokens.WINDOW_MIN_HEIGHT)
        self.resize(1600, 1000)
        self.setStyleSheet(f"""
            QMainWindow {{
                background: {DesignTokens.COLOR_BG};
            }}
        """)

        self._build_ui()
        self._switch_route(self._view_model.current_route)

    def _build_ui(self) -> None:
        """Build the modern enterprise UI layout."""
        # Main container
        root = QWidget(self)
        root_layout = QHBoxLayout(root)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        # Sidebar
        self._sidebar = SidebarNavigation(
            items=self._view_model.navigation_items,
            on_selected=self._switch_route,
        )
        self._sidebar.setFixedWidth(DesignTokens.SIDEBAR_WIDTH)

        # Main content area
        content_widget = QWidget()
        content_widget.setStyleSheet(f"background: {DesignTokens.COLOR_BG};")
        content_layout = QVBoxLayout(content_widget)
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.setSpacing(0)

        # Top bar
        current_page = self._view_model.current_item
        self._top_bar = TopBar(
            page_title=current_page.title,
            page_subtitle=current_page.subtitle,
        )
        self._top_bar.new_session_requested.connect(lambda: self._switch_route("sandbox-control"))

        # Page stack
        self._stack = QStackedWidget()
        self._stack.setSizePolicy(
            QSizePolicy.Policy.Expanding,
            QSizePolicy.Policy.Expanding
        )

        for item in self._view_model.navigation_items:
            page = self._build_page(item)
            self._pages[item.route] = page

            # Wrap in scroll area
            scroll = QScrollArea()
            scroll.setWidgetResizable(True)
            scroll.setFrameShape(QFrame.Shape.NoFrame)
            scroll.setStyleSheet("QScrollArea { background: transparent; border: none; }")
            scroll.setWidget(page)
            self._stack.addWidget(scroll)

        content_layout.addWidget(self._top_bar)
        content_layout.addWidget(self._stack, 1)

        root_layout.addWidget(self._sidebar)
        root_layout.addWidget(content_widget, 1)

        self.setCentralWidget(root)

    def _build_page(self, item: NavigationItem) -> QWidget:
        """Build a page widget based on route."""
        runtime = self._view_model._runtime

        if item.route == "dashboard":
            vm = DashboardViewModel(runtime)
            page = DashboardPage(vm, on_navigate=self._switch_route)
            return page
        elif item.route == "sandbox-control":
            vm = SandboxControlViewModel(runtime)
            page = SandboxControlPage(vm)
            page.update_from_view_model()
            return page
        elif item.route == "monitoring":
            vm = MonitoringViewModel(runtime)
            page = MonitoringPage(vm)
            page.update_from_view_model()
            return page
        elif item.route == "simulator-manager":
            vm = SimulatorManagerViewModel(runtime)
            return SimulatorManagerPage(vm, on_navigate=self._switch_route)

        return PlaceholderPage(
            title=item.title,
            subtitle=item.subtitle,
            focus_label=item.title,
        )

    def _switch_route(self, route: str) -> None:
        """Handle navigation route changes."""
        self._view_model.set_current_route(route)
        self._sidebar.select_route(route, self._view_model.navigation_items)

        item = self._view_model.current_item
        self._top_bar.update_context(page_title=item.title, page_subtitle=item.subtitle)

        index = self._view_model.index_for_route(route)
        self._stack.setCurrentIndex(index)

        # Refresh the page if it has an update method
        page = self._pages.get(route)
        if page and hasattr(page, "update_from_view_model"):
            page.update_from_view_model()

    def keyPressEvent(self, event) -> None:
        """Handle keyboard shortcuts."""
        if event.key() == Qt.Key.Key_Escape:
            event.accept()
            return
        super().keyPressEvent(event)
