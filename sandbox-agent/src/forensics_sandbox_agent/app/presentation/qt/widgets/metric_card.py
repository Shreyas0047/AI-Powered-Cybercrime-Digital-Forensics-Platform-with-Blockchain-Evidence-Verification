"""Dashboard metric card widget with enterprise styling."""

from __future__ import annotations

from PyQt6.QtCore import QPropertyAnimation, QEasingCurve, Qt
from PyQt6.QtGui import QFont
from PyQt6.QtWidgets import QLabel, QVBoxLayout, QHBoxLayout

from forensics_sandbox_agent.app.presentation.qt.theme.design_tokens import (
    DesignTokens,
)
from forensics_sandbox_agent.app.presentation.qt.widgets.panel import Panel


class MetricCard(Panel):
    """Premium metric display card with trend indicators and animations."""

    def __init__(
        self,
        label: str,
        value: str,
        delta: str = "",
        delta_tone: str = "neutral",
        trend: str = "up",
        accent: bool = False,
    ) -> None:
        super().__init__(accent=accent)
        self._trend = trend
        self._delta_tone = delta_tone
        self._setup_ui(label, value, delta)

    def _setup_ui(self, label: str, value: str, delta: str) -> None:
        """Build the metric card UI."""
        layout = self.layout()

        # Header row with label and trend indicator
        header = QHBoxLayout()
        header.setContentsMargins(0, 0, 0, 8)

        label_widget = QLabel(label)
        label_widget.setObjectName("caption")
        label_widget.setFont(QFont(DesignTokens.FONT_FAMILY, DesignTokens.SMALL_SIZE, QFont.Weight.Medium))

        header.addWidget(label_widget)
        header.addStretch(1)

        # Trend arrow indicator
        if self._trend == "up":
            trend_label = QLabel("UP")
            trend_label.setStyleSheet("color: #10b981; font-weight: 700;")
        elif self._trend == "down":
            trend_label = QLabel("DOWN")
            trend_label.setStyleSheet("color: #ef4444; font-weight: 700;")
        else:
            trend_label = QLabel("SIDE")
            trend_label.setStyleSheet("color: #64748b; font-weight: 700;")

        trend_label.setObjectName("small")
        header.addWidget(trend_label)

        layout.addLayout(header)

        # Main value
        value_widget = QLabel(value)
        value_widget.setObjectName("title")
        value_widget.setFont(QFont(DesignTokens.FONT_FAMILY, 32, QFont.Weight.Bold))
        value_widget.setStyleSheet(f"""
            QLabel {{
                color: {DesignTokens.COLOR_TEXT_PRIMARY};
                letter-spacing: -1px;
            }}
        """)
        layout.addWidget(value_widget)

        # Delta/subtitle
        if delta:
            delta_widget = QLabel(delta)
            delta_widget.setObjectName("caption")
            color_map = {
                "positive": "#10b981",
                "negative": "#ef4444",
                "warning": "#f59e0b",
                "neutral": DesignTokens.COLOR_TEXT_MUTED,
            }
            color = color_map.get(self._delta_tone, DesignTokens.COLOR_TEXT_MUTED)
            delta_widget.setStyleSheet(f"""
                QLabel {{
                    color: {color};
                    font-size: {DesignTokens.SMALL_SIZE}px;
                }}
            """)
            layout.addWidget(delta_widget)

        layout.addStretch(1)

    def update_values(self, label: str, value: str, delta: str = "") -> None:
        """Update the metric card values."""
        layout = self.layout()
        if layout is None:
            return
        label_widget = layout.itemAt(0).layout().itemAt(0).widget()
        if label_widget:
            label_widget.setText(label)
        value_widget = layout.itemAt(1).widget()
        if value_widget:
            value_widget.setText(value)
        if delta:
            delta_widget = layout.itemAt(2).widget()
            if delta_widget:
                delta_widget.setText(delta)

    def update_value(self, new_value: str) -> None:
        """Update the displayed value with animation."""
        value_widget = self.layout().itemAt(1).widget()
        if value_widget:
            # Fade out old value
            anim = QPropertyAnimation(value_widget, b"windowOpacity")
            anim.setDuration(150)
            anim.setStartValue(1.0)
            anim.setEndValue(0.0)
            anim.setEasingCurve(QEasingCurve.Type.OutCubic)
            anim.start()
            self._update_pending = (new_value, value_widget)


class AnimatedMetricCard(MetricCard):
    """Metric card with entrance animation."""

    def __init__(self, label: str, value: str, delta: str = "", delta_tone: str = "neutral", delay: int = 0, **kwargs):
        super().__init__(label, value, delta, delta_tone, **kwargs)
        self._delay = delay
        self._animate_entrance()

    def _animate_entrance(self) -> None:
        """Run staggered entrance animation."""
        self.setGraphicsEffect(None)  # Reset any existing effect
