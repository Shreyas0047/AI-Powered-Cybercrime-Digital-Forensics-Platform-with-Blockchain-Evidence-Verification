"""Modern enterprise dashboard page with premium cybersecurity aesthetics."""

from __future__ import annotations

from typing import Optional
from PyQt6.QtCore import Qt
from PyQt6.QtWidgets import (
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from forensics_sandbox_agent.app.presentation.qt.navigation import NavigationItem
from forensics_sandbox_agent.app.presentation.qt.theme.design_tokens import (
    DesignTokens,
)
from forensics_sandbox_agent.app.presentation.qt.viewmodels.dashboard_view_model import (
    DashboardViewModel,
)
from forensics_sandbox_agent.app.presentation.qt.widgets.panel import Panel
from forensics_sandbox_agent.app.presentation.qt.widgets.section_header import (
    SectionHeader,
)


class DashboardPage(QWidget):
    """Premium SOC-style dashboard with modern cybersecurity aesthetics."""

    def __init__(self, view_model: Optional[DashboardViewModel] = None, on_navigate=None) -> None:
        super().__init__()
        self._view_model = view_model
        self._on_navigate = on_navigate
        self.setStyleSheet(f"background: {DesignTokens.COLOR_BG};")
        self._setup_ui()

    def _setup_ui(self) -> None:
        """Build the complete dashboard layout."""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(20)

        # Metrics row container
        self._metrics_row = QWidget()
        self._metrics_layout = QHBoxLayout(self._metrics_row)
        self._metrics_layout.setContentsMargins(0, 0, 0, 0)
        self._metrics_layout.setSpacing(20)
        layout.addWidget(self._metrics_row)

        # Main content row container
        self._content_row = QHBoxLayout()
        self._content_row.setSpacing(20)
        layout.addLayout(self._content_row, 1)

        self.update_from_view_model()

    def update_from_view_model(self) -> None:
        """Update the dashboard UI from the view model."""
        if not self._view_model:
            return

        self._view_model.refresh_data()

        # Clear existing layout items
        while self._metrics_layout.count():
            item = self._metrics_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        while self._content_row.count():
            item = self._content_row.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
            elif item.layout():
                # Recursively clear layouts
                self._clear_layout(item.layout())

        # Rebuild metrics row
        self._metrics_layout.addWidget(self._create_metric_card("Active Sessions", self._view_model.session_count, "UP", "Go to Sandbox ->", "#10b981", "sandbox-control"))
        self._metrics_layout.addWidget(self._create_metric_card("Evidence Items", self._view_model.evidence_count, "UP", "View Evidence ->", "#10b981", "evidence"))
        self._metrics_layout.addWidget(self._create_metric_card("Detection Signals", self._view_model.alert_count, "SIDE", "Monitor Events ->", "#f59e0b", "monitoring"))
        self._metrics_layout.addWidget(self._create_metric_card("System Health", self._view_model.system_health, "UP", "Check Logs ->", "#10b981", "logs"))

        # Rebuild main content
        self._build_main_content(self._content_row)

    def _clear_layout(self, layout):
        while layout.count():
            item = layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
            elif item.layout():
                self._clear_layout(item.layout())

    def _create_metric_card(self, title: str, value: str, trend: str, delta: str, color: str, route: str = None) -> QFrame:
        """Create a styled metric card."""
        card = QFrame()
        card.setCursor(Qt.CursorShape.PointingHandCursor)
        card.setStyleSheet(f"""
            QFrame {{
                background: {DesignTokens.COLOR_SURFACE};
                border: 1px solid {DesignTokens.COLOR_GLASS_BORDER};
                border-radius: {DesignTokens.CARD_RADIUS}px;
            }}
            QFrame:hover {{
                border: 1px solid {DesignTokens.COLOR_PRIMARY};
                background: {DesignTokens.COLOR_BG_SECONDARY};
            }}
        """)

        layout = QVBoxLayout(card)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(8)

        # Title with trend
        title_layout = QHBoxLayout()
        title_layout.setContentsMargins(0, 0, 0, 0)
        title_label = QLabel(title)
        title_label.setStyleSheet(f"font-size: {DesignTokens.SMALL_SIZE}px; font-weight: 600; color: {DesignTokens.COLOR_TEXT_MUTED};")
        trend_label = QLabel(trend)
        trend_label.setStyleSheet(f"color: {color}; font-weight: 700; font-size: 14px;")
        title_layout.addWidget(title_label)
        title_layout.addStretch()
        title_layout.addWidget(trend_label)

        # Value
        value_label = QLabel(value)
        value_label.setStyleSheet(f"font-size: 36px; font-weight: 700; color: {DesignTokens.COLOR_TEXT_PRIMARY}; letter-spacing: -1px;")

        # Delta
        delta_label = QLabel(delta)
        delta_label.setStyleSheet(f"font-size: {DesignTokens.SMALL_SIZE}px; color: {color}; font-weight: bold;")

        layout.addLayout(title_layout)
        layout.addWidget(value_label)
        layout.addWidget(delta_label)

        if route and self._on_navigate:
            card.mousePressEvent = lambda e: self._on_navigate(route)

        return card

    def _build_main_content(self, parent_layout: QHBoxLayout) -> None:
        """Build the main dashboard content area."""
        # Left column
        left_col = QVBoxLayout()
        left_col.setSpacing(20)

        # Overview panel
        overview = self._build_overview_panel()
        left_col.addWidget(overview, 1)

        parent_layout.addLayout(left_col, 3)

        # Right column
        right_col = QVBoxLayout()
        right_col.setSpacing(20)

        # Threat panel
        threat = self._build_threat_panel()
        right_col.addWidget(threat)

        # Status panel
        status = self._build_status_panel()
        right_col.addWidget(status)

        parent_layout.addLayout(right_col, 2)

    def _build_overview_panel(self) -> QFrame:
        """Build the overview panel."""
        panel = QFrame()
        panel.setStyleSheet(f"""
            QFrame {{
                background: {DesignTokens.COLOR_SURFACE};
                border: 1px solid {DesignTokens.COLOR_GLASS_BORDER};
                border-radius: {DesignTokens.CARD_RADIUS}px;
                padding: 20px;
            }}
        """)

        layout = QVBoxLayout(panel)
        layout.setSpacing(16)

        title = QLabel("Investigation Overview")
        title.setStyleSheet(f"font-size: {DesignTokens.SUBHEADING_SIZE}px; font-weight: 600; color: {DesignTokens.COLOR_TEXT_PRIMARY};")

        subtitle = QLabel("Live telemetry and forensic collection workspace")
        subtitle.setStyleSheet(f"font-size: {DesignTokens.SMALL_SIZE}px; color: {DesignTokens.COLOR_TEXT_MUTED};")

        layout.addWidget(title)
        layout.addWidget(subtitle)
        
        vm_active = self._view_model.vm_active if self._view_model else False
        mon_active = self._view_model.monitoring_active if self._view_model else False
        
        layout.addWidget(self._build_status_row("VM Boundary", vm_active))
        layout.addWidget(self._build_status_row("Monitoring Engine", mon_active))
        layout.addWidget(self._build_status_row("Evidence Pipeline", True))
        layout.addWidget(self._build_status_row("Rollback System", True))
        layout.addStretch()

        return panel

    def _build_status_row(self, name: str, online: bool) -> QWidget:
        """Create a status row."""
        row = QWidget()
        layout = QHBoxLayout(row)
        layout.setContentsMargins(0, 8, 0, 8)
        layout.setSpacing(12)

        dot = QFrame()
        dot.setFixedSize(8, 8)
        dot.setStyleSheet(f"background: {'#10b981' if online else '#ef4444'}; border-radius: 4px;")

        label = QLabel(name)
        label.setStyleSheet(f"font-size: {DesignTokens.BODY_SIZE}px; color: {DesignTokens.COLOR_TEXT_SECONDARY};")

        status = QLabel("Active" if online else "Offline")
        status.setStyleSheet(f"font-size: {DesignTokens.SMALL_SIZE}px; font-weight: 600; color: {'#10b981' if online else '#ef4444'};")

        layout.addWidget(dot)
        layout.addWidget(label, 1)
        layout.addWidget(status)

        return row

    def _build_threat_panel(self) -> QFrame:
        """Build the threat overview panel."""
        panel = QFrame()
        panel.setStyleSheet(f"""
            QFrame {{
                background: {DesignTokens.COLOR_SURFACE};
                border: 1px solid {DesignTokens.COLOR_GLASS_BORDER};
                border-radius: {DesignTokens.CARD_RADIUS}px;
                padding: 20px;
            }}
        """)

        layout = QVBoxLayout(panel)
        layout.setSpacing(16)

        title = QLabel("Threat Overview")
        title.setStyleSheet(f"font-size: {DesignTokens.SUBHEADING_SIZE}px; font-weight: 600; color: {DesignTokens.COLOR_TEXT_PRIMARY};")

        layout.addWidget(title)
        
        risk_score = "0"
        if self._view_model and int(self._view_model.alert_count) > 0:
            risk_score = str(min(100, int(self._view_model.alert_count) * 15))
            
        layout.addWidget(self._build_severity_indicator("Alert Count", self._view_model.alert_count if self._view_model else "0", "#ef4444"))
        layout.addWidget(self._build_severity_indicator("Risk Score", risk_score, "#f59e0b"))

        return panel

    def _build_severity_indicator(self, label: str, value: str, color: str) -> QFrame:
        """Build a severity indicator."""
        indicator = QFrame()
        indicator.setStyleSheet(f"""
            QFrame {{
                background: {DesignTokens.COLOR_BG_SECONDARY};
                border-radius: 10px;
                padding: 12px;
            }}
        """)

        layout = QHBoxLayout(indicator)
        layout.setContentsMargins(12, 12, 12, 12)

        value_label = QLabel(value)
        value_label.setStyleSheet(f"font-size: 24px; font-weight: 700; color: {color};")

        label_label = QLabel(label)
        label_label.setStyleSheet(f"font-size: {DesignTokens.SMALL_SIZE}px; color: {DesignTokens.COLOR_TEXT_MUTED};")

        layout.addWidget(value_label)
        layout.addWidget(label_label, 1)
        layout.addStretch()

        return indicator

    def _build_status_panel(self) -> QFrame:
        """Build the system status panel."""
        panel = QFrame()
        panel.setStyleSheet(f"""
            QFrame {{
                background: {DesignTokens.COLOR_SURFACE};
                border: 1px solid {DesignTokens.COLOR_GLASS_BORDER};
                border-radius: {DesignTokens.CARD_RADIUS}px;
                padding: 20px;
            }}
        """)

        layout = QVBoxLayout(panel)
        layout.setSpacing(16)

        title = QLabel("System Status")
        title.setStyleSheet(f"font-size: {DesignTokens.SUBHEADING_SIZE}px; font-weight: 600; color: {DesignTokens.COLOR_TEXT_PRIMARY};")

        layout.addWidget(title)
        
        vm_active = self._view_model.vm_active if self._view_model else False
        mon_active = self._view_model.monitoring_active if self._view_model else False
        
        layout.addWidget(self._build_status_row("VM Boundary", vm_active))
        layout.addWidget(self._build_status_row("Monitoring Engine", mon_active))
        layout.addWidget(self._build_status_row("Evidence Pipeline", True))
        layout.addWidget(self._build_status_row("Rollback System", True))

        return panel
