"""Modern forensic timeline widget with interactive visualization."""

from __future__ import annotations

from PyQt6.QtCore import QPropertyAnimation, QEasingCurve, Qt, QTimer
from PyQt6.QtWidgets import (
    QFrame,
    QGraphicsOpacityEffect,
    QHBoxLayout,
    QLabel,
    QScrollArea,
    QVBoxLayout,
    QWidget,
)

from forensics_sandbox_agent.app.presentation.qt.theme.design_tokens import (
    DesignTokens,
)


class ForensicTimeline(QFrame):
    """Interactive forensic event timeline with smooth animations."""

    def __init__(self, events: list[dict] | None = None) -> None:
        super().__init__()
        self.setObjectName("glassPanel")
        self._events = events or []

        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        self._build_header(layout)
        self._build_timeline_content(layout)
        self._animate_entrance()

    def _build_header(self, layout: QVBoxLayout) -> None:
        """Build the timeline header."""
        header = QWidget()
        header_layout = QVBoxLayout(header)
        header_layout.setContentsMargins(0, 0, 0, 0)
        header_layout.setSpacing(8)

        eyebrow = QLabel("FORENSIC TIMELINE")
        eyebrow.setStyleSheet(f"""
            QLabel {{
                font-size: 10px;
                font-weight: 700;
                color: {DesignTokens.COLOR_PRIMARY};
                letter-spacing: 1.5px;
            }}
        """)

        title = QLabel("Event Sequence Analysis")
        title.setStyleSheet(f"""
            QLabel {{
                font-size: {DesignTokens.SUBHEADING_SIZE}px;
                font-weight: 600;
                color: {DesignTokens.COLOR_TEXT_PRIMARY};
            }}
        """)

        header_layout.addWidget(eyebrow)
        header_layout.addWidget(title)
        layout.addWidget(header)

    def _build_timeline_content(self, layout: QVBoxLayout) -> None:
        """Build the scrollable timeline content."""
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll.setStyleSheet("""
            QScrollArea {
                background: transparent;
                border: none;
            }
        """)

        content_widget = QWidget()
        content_layout = QVBoxLayout(content_widget)
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.setSpacing(16)

        # Demo events
        demo_events = [
            {"phase": "Initial", "title": "Session Started", "desc": "VM snapshot restored", "severity": "info"},
            {"phase": "Detection", "title": "Process Created", "desc": "Suspicious process detected", "severity": "warning"},
            {"phase": "Analysis", "title": "File Modification", "desc": "Target files identified", "severity": "warning"},
            {"phase": "Collection", "title": "Registry Activity", "desc": "Persistence mechanism observed", "severity": "warning"},
            {"phase": "Complete", "title": "Session Ended", "desc": "Rollback initiated", "severity": "success"},
        ]

        for i, event in enumerate(demo_events):
            item = TimelineEventItem(
                phase=event["phase"],
                title=event["title"],
                description=event["desc"],
                severity=event["severity"],
                is_last=(i == len(demo_events) - 1)
            )
            content_layout.addWidget(item)

        content_layout.addStretch(1)
        scroll.setWidget(content_widget)
        layout.addWidget(scroll, 1)

    def _animate_entrance(self) -> None:
        """Run entrance animation."""
        effect = QGraphicsOpacityEffect(self)
        self.setGraphicsEffect(effect)
        anim = QPropertyAnimation(effect, b"opacity")
        anim.setDuration(DesignTokens.ANIMATION_SLOW)
        anim.setStartValue(0.0)
        anim.setEndValue(1.0)
        anim.setEasingCurve(QEasingCurve.Type.OutCubic)
        anim.start()


class TimelineEventItem(QFrame):
    """Single timeline event with phase indicator."""

    def __init__(self, phase: str, title: str, description: str, severity: str, is_last: bool = False) -> None:
        super().__init__()
        self.setStyleSheet(f"""
            QFrame {{
                background: {DesignTokens.COLOR_SURFACE};
                border: 1px solid {DesignTokens.COLOR_GLASS_BORDER};
                border-radius: 12px;
                padding: 16px;
            }}
        """)
        self._setup_ui(phase, title, description, severity, is_last)

    def _setup_ui(self, phase: str, title: str, description: str, severity: str, is_last: bool) -> None:
        """Build the event item UI."""
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(16)

        # Timeline connector
        connector = QWidget()
        connector_layout = QVBoxLayout(connector)
        connector_layout.setContentsMargins(0, 0, 0, 0)
        connector_layout.setSpacing(4)
        connector_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        # Phase indicator dot
        dot = QFrame()
        dot.setFixedSize(12, 12)
        dot_style = {
            "info": DesignTokens.COLOR_INFO,
            "warning": DesignTokens.COLOR_WARNING,
            "success": DesignTokens.COLOR_SUCCESS,
            "danger": DesignTokens.COLOR_DANGER,
        }.get(severity, DesignTokens.COLOR_PRIMARY)

        dot.setStyleSheet(f"""
            QFrame {{
                background: {dot_style};
                border-radius: 6px;
            }}
        """)

        # Connector line (if not last)
        if not is_last:
            line = QFrame()
            line.setMinimumHeight(40)
            line.setStyleSheet(f"""
                QFrame {{
                    background: {DesignTokens.COLOR_GLASS_BORDER};
                    width: 2px;
                }}
            """)
            connector_layout.addWidget(dot)
            connector_layout.addWidget(line)
        else:
            connector_layout.addWidget(dot)

        layout.addWidget(connector)

        # Content
        content = QVBoxLayout()
        content.setSpacing(6)

        # Phase badge
        phase_label = QLabel(phase.upper())
        phase_color = {
            "info": DesignTokens.COLOR_INFO,
            "warning": DesignTokens.COLOR_WARNING,
            "success": DesignTokens.COLOR_SUCCESS,
            "danger": DesignTokens.COLOR_DANGER,
        }.get(severity, DesignTokens.COLOR_PRIMARY)

        phase_label.setStyleSheet(f"""
            QLabel {{
                font-size: 9px;
                font-weight: 700;
                color: {phase_color};
                letter-spacing: 1px;
                background: {DesignTokens.COLOR_PRIMARY_SOFT};
                border-radius: 4px;
                padding: 2px 8px;
            }}
        """)

        title_label = QLabel(title)
        title_label.setStyleSheet(f"""
            QLabel {{
                font-size: {DesignTokens.BODY_SIZE}px;
                font-weight: 600;
                color: {DesignTokens.COLOR_TEXT_PRIMARY};
            }}
        """)

        desc_label = QLabel(description)
        desc_label.setStyleSheet(f"""
            QLabel {{
                font-size: {DesignTokens.SMALL_SIZE}px;
                color: {DesignTokens.COLOR_TEXT_MUTED};
            }}
        """)

        content.addWidget(phase_label)
        content.addWidget(title_label)
        content.addWidget(desc_label)

        layout.addLayout(content, 1)
        layout.addStretch(1)


class ThreatSeverityIndicator(QFrame):
    """Visual threat severity meter."""

    def __init__(self, severity: int, label: str) -> None:
        super().__init__()
        self._severity = severity
        self._setup_ui(label)

    def _setup_ui(self, label: str) -> None:
        """Build the severity indicator UI."""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(8)

        # Severity color
        if self._severity >= 80:
            color = DesignTokens.COLOR_CRITICAL
            text = "CRITICAL"
        elif self._severity >= 60:
            color = DesignTokens.COLOR_HIGH
            text = "HIGH"
        elif self._severity >= 40:
            color = DesignTokens.COLOR_MEDIUM
            text = "MEDIUM"
        elif self._severity >= 20:
            color = DesignTokens.COLOR_LOW
            text = "LOW"
        else:
            color = DesignTokens.COLOR_INFO_LEVEL
            text = "INFO"

        # Value display
        value_label = QLabel(f"{self._severity}")
        value_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        value_label.setStyleSheet(f"""
            QLabel {{
                font-size: 32px;
                font-weight: 700;
                color: {color};
            }}
        """)

        # Label
        label_widget = QLabel(label)
        label_widget.setAlignment(Qt.AlignmentFlag.AlignCenter)
        label_widget.setStyleSheet(f"""
            QLabel {{
                font-size: {DesignTokens.SMALL_SIZE}px;
                color: {DesignTokens.COLOR_TEXT_MUTED};
            }}
        """)

        # Severity badge
        badge = QLabel(text)
        badge.setAlignment(Qt.AlignmentFlag.AlignCenter)
        badge.setStyleSheet(f"""
            QLabel {{
                font-size: 10px;
                font-weight: 700;
                color: white;
                background: {color};
                border-radius: 4px;
                padding: 4px 12px;
                letter-spacing: 1px;
            }}
        """)

        layout.addWidget(value_label)
        layout.addWidget(label_widget)
        layout.addWidget(badge)
